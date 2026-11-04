"""How many questions one client may ask in a sliding window.

The AI server does not know who the student is (sign-in lives on the Laravel
backend), so the client is its IP address. Behind Render's proxy that is the
last X-Forwarded-For entry: the address the proxy itself saw, which a client
cannot forge the way it can the first one.
"""
from __future__ import annotations

import ipaddress
import math
import threading
import time
from collections import defaultdict, deque
from collections.abc import Callable
from datetime import date, datetime, timedelta, timezone

from fastapi import Request


def client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "")
    hops = [hop.strip() for hop in forwarded.split(",") if hop.strip()]
    if hops:
        return hops[-1]
    return request.client.host if request.client else "unknown"


class RateLimiter:
    def __init__(self, limit: int, window_seconds: float) -> None:
        self.limit = limit
        self.window_seconds = window_seconds
        self._asked: defaultdict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def retry_after(self, client: str) -> int | None:
        """Seconds until ``client`` may ask again, or None when this question is allowed
        (and counted)."""
        now = time.monotonic()
        with self._lock:
            asked = self._asked[client]
            while asked and asked[0] <= now - self.window_seconds:
                asked.popleft()
            if len(asked) >= self.limit:
                return max(1, math.ceil(asked[0] + self.window_seconds - now))
            asked.append(now)
            if len(self._asked) > 10_000:  # forget idle clients so memory stays bounded
                for key in [k for k, v in self._asked.items() if not v]:
                    del self._asked[key]
            return None


PHNOM_PENH = timezone(timedelta(hours=7))


def network_key(address: str) -> str:
    """The address a limit is counted against: an IPv6 address is a whole /64 (one home or phone gets a block that size, so
    a different address in it is not a different person); an IPv4 address, or anything unreadable, is used as it is."""
    try:
        parsed = ipaddress.ip_address(address)
    except ValueError:
        return address
    if parsed.version == 6:
        return str(ipaddress.ip_network(f"{address}/64", strict=False).network_address)
    return str(parsed)


class DailyBudget:
    """How many different questions one address may ask in a Phnom Penh day.

    Each Free account brings its own daily questions, so a script that makes accounts would otherwise spend the shared AI
    quota without limit. This counts per address across every account. A question is one id however many requests its answer
    takes (the rounds of a long answer carry the same id), so it is not counted twice. The count is kept in memory: it starts
    again when the server restarts, which is a leak but never a lockout.
    """

    def __init__(self, limit: int, *, today: Callable[[], date] | None = None) -> None:
        self.limit = limit
        self._today = today or (lambda: datetime.now(PHNOM_PENH).date())
        self._day: date | None = None
        self._asked: dict[str, set[str]] = {}
        self._lock = threading.Lock()

    def take(self, address: str, question: str) -> bool:
        """Count `question` for `address`; False when the address has already asked as many as it may today."""
        if self.limit <= 0:
            return True
        key = network_key(address)
        with self._lock:
            today = self._today()
            if today != self._day:
                self._day, self._asked = today, {}
            asked = self._asked.setdefault(key, set())
            if question in asked:
                return True
            if len(asked) >= self.limit:
                return False
            asked.add(question)
            return True
