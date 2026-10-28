"""Who may use the AI routes: students signed in to the Laravel API.

The coach keeps no accounts. The website sends the same Bearer token it uses for the Laravel API, and the
coach asks that API ("who am I", GET /me) whether it is valid. Checks are remembered for a short while, so a
chat costs Laravel one request a minute at most, and a student who logs out is locked out of the coach when the
remembered check expires.
"""
from __future__ import annotations

import hashlib
import math
import time
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
    ) -> None:
        self.url = url
        self.cache_seconds = cache_seconds
        self.rejected_seconds = rejected_seconds
        self._client = client or httpx.AsyncClient(timeout=timeout)
        self._clock = clock
        # sha256(token) -> (student id or None, remembered until). The token itself is never kept.
        self._seen: dict[str, tuple[str | None, float]] = {}

    async def verify(self, token: str) -> str | None:
        key = hashlib.sha256(token.encode()).hexdigest()
        now = self._clock()
        remembered = self._seen.get(key)
        if remembered is not None and now < remembered[1]:
            return remembered[0]

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
