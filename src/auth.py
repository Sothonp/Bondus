"""Who may use the AI routes: students signed in to the Laravel API.

The coach keeps no accounts. The website sends the same Bearer token it uses for the Laravel API, and the
coach asks that API ("who am I", GET /me) whether it is valid. Checks are remembered for a short while, so a
chat costs Laravel one request a minute at most, and a student who logs out is locked out of the coach when the
remembered check expires.
"""
from __future__ import annotations

import hashlib
import math
import re
import time
import zlib
from collections import deque
from collections.abc import Callable
from typing import Protocol

import httpx


class AuthUnavailable(Exception):
    """The sign-in API could not say whether a token is valid. The caller must refuse, not let anyone in."""


class TokenVerifier(Protocol):
    async def verify(self, token: str) -> str | None:
        """The student's id if the token is valid, None if it is not. Raises AuthUnavailable when unsure."""


def bearer_token(authorization: str | None) -> str | None:
    """The token in an `Authorization: Bearer <token>` header, or None for anything else."""
    if not authorization:
        return None
    scheme, _, token = authorization.partition(" ")
    token = token.strip()
    if scheme.lower() != "bearer" or not token:
        return None
    return token


_TOKEN_BODY = re.compile(r"[A-Za-z0-9_-]{40,200}")


def looks_like_token(token: str) -> bool:
    """Whether `token` is shaped like a token the Laravel API (Laravel Sanctum) hands out: `<id>|<40 random
    characters><8 hex characters>`, the last 8 being the crc32 of the 40 before them. Anyone can make such a string,
    so this is no proof of anything, but it turns away most junk without asking Laravel. Tokens from before Sanctum
    added the checksum are 40 characters and have none."""
    ident, bar, body = token.partition("|")
    if not bar or not ident.isascii() or not ident.isdigit() or len(ident) > 18:
        return False
    if not _TOKEN_BODY.fullmatch(body):
        return False
    if len(body) == 40:
        return True
    if len(body) < 48:
        return False
    return f"{zlib.crc32(body[-48:-8].encode()) & 0xFFFFFFFF:08x}" == body[-8:]


class LookupRefused(Exception):
    """Too many tokens from one place (or in all) were not accepted lately, so a new one is not looked up."""

    def __init__(self, retry_after: int) -> None:
        super().__init__(f"too many rejected sign-ins; try again in {retry_after}s")
        self.retry_after = retry_after


class LookupReservation:
    def __init__(self, budget: LookupBudget, address: str, at: float) -> None:
        self._budget = budget
        self._address = address
        self._at = at

    def give_back(self) -> None:
        """The token turned out to be good (or Laravel could not say): do not count it against the caller."""
        self._budget._release(self._address, self._at)


class LookupBudget:
    """Caps how many tokens we have not seen before may be sent to Laravel, per caller address and in all.

    Laravel limits requests by token, and every made-up token is a fresh token, so a flood of fake ones would
    walk straight past that limit; and it only ever sees this server's address, so it cannot limit by caller.
    So the limit sits here. A lookup is counted when it starts (a burst of parallel requests is counted too) and
    given back when the token proves good, so only tokens that fail use up a caller's allowance. A student whose
    token we have already checked never reaches this: it is answered from memory.
    """

    def __init__(
        self,
        per_address: int = 20,
        overall: int = 300,
        window: float = 60,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        self.per_address = per_address
        self.overall = overall
        self.window = window
        self._clock = clock
        self._by_address: dict[str, deque[float]] = {}
        self._all: deque[float] = deque()

    def reserve(self, address: str) -> LookupReservation:
        now = self._clock()
        self._expire(self._all, now)
        mine = self._by_address.setdefault(address, deque())
        self._expire(mine, now)
        for held, limit in ((mine, self.per_address), (self._all, self.overall)):
            if len(held) >= limit:
                raise LookupRefused(max(1, math.ceil(self.window - (now - held[0]))))
        mine.append(now)
        self._all.append(now)
        if len(self._by_address) >= 4096:
            self._forget_idle(now)
        return LookupReservation(self, address, now)

    def _release(self, address: str, at: float) -> None:
        for held in (self._by_address.get(address), self._all):
            if held is not None:
                try:
                    held.remove(at)
                except ValueError:
                    pass  # already aged out

    def _expire(self, held: deque[float], now: float) -> None:
        while held and now - held[0] >= self.window:
            held.popleft()

    def _forget_idle(self, now: float) -> None:
        for address in list(self._by_address):
            held = self._by_address[address]
            self._expire(held, now)
            if not held:
                del self._by_address[address]


class LaravelTokenVerifier:
    def __init__(
        self,
        url: str,
        *,
        cache_seconds: float = 60,
        rejected_seconds: float = 15,
        timeout: float = 5.0,
        client: httpx.AsyncClient | None = None,
        clock: Callable[[], float] = time.monotonic,
        require_token_shape: bool = False,
    ) -> None:
        self.url = url
        self.cache_seconds = cache_seconds
        self.rejected_seconds = rejected_seconds
        self.require_token_shape = require_token_shape
        self._client = client or httpx.AsyncClient(timeout=timeout)
        self._clock = clock
        # sha256(token) -> (student id or None, remembered until). The token itself is never kept.
        self._seen: dict[str, tuple[str | None, float]] = {}

    def remembers(self, token: str) -> bool:
        """Whether `verify` would answer from memory, without asking Laravel."""
        remembered = self._seen.get(hashlib.sha256(token.encode()).hexdigest())
        return remembered is not None and self._clock() < remembered[1]

    async def verify(self, token: str) -> str | None:
        key = hashlib.sha256(token.encode()).hexdigest()
        now = self._clock()
        remembered = self._seen.get(key)
        if remembered is not None and now < remembered[1]:
            return remembered[0]
        if self.require_token_shape and not looks_like_token(token):
            return None  # not something Laravel ever handed out: no need to ask, or to remember it

        student = await self._ask(token)
        lifetime = self.cache_seconds if student is not None else self.rejected_seconds
        self._forget_expired(now)
        self._seen[key] = (student, now + lifetime)
        return student

    async def _ask(self, token: str) -> str | None:
        try:
            response = await self._client.get(
                self.url, headers={"Authorization": f"Bearer {token}", "Accept": "application/json"}
            )
        except httpx.HTTPError as exc:
            raise AuthUnavailable(f"sign-in API unreachable: {exc.__class__.__name__}") from exc
        if response.status_code == 401:
            return None
        if response.status_code != 200:
            raise AuthUnavailable(f"sign-in API answered {response.status_code}")
        try:
            student = response.json()["user"]["id"]
        except (ValueError, KeyError, TypeError) as exc:
            raise AuthUnavailable("sign-in API sent an unexpected body") from exc
        if student is None:
            raise AuthUnavailable("sign-in API sent no student id")
        return str(student)

    def _forget_expired(self, now: float) -> None:
        if len(self._seen) < 1024:
            return
        self._seen = {key: entry for key, entry in self._seen.items() if now < entry[1]}


class SlidingWindowLimiter:
    """At most `limit` served requests per key in any `window` seconds."""

    def __init__(self, limit: int, window: float = 60, clock: Callable[[], float] = time.monotonic) -> None:
        self.limit = limit
        self.window = window
        self._clock = clock
        self._served: dict[str, deque[float]] = {}

    def hit(self, key: str) -> int | None:
        """Count a request. None if it may go ahead, else the whole seconds to wait before asking again."""
        now = self._clock()
        served = self._served.setdefault(key, deque())
        while served and now - served[0] >= self.window:
            served.popleft()
        if len(served) >= self.limit:
            return max(1, math.ceil(self.window - (now - served[0])))
        served.append(now)
        return None
