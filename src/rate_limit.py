"""How many questions one client may ask in a sliding window.

The AI server does not know who the student is (sign-in lives on the Laravel
backend), so the client is its IP address. Behind Render's proxy that is the
last X-Forwarded-For entry: the address the proxy itself saw, which a client
cannot forge the way it can the first one.
"""
from __future__ import annotations

import math
import threading
import time
from collections import defaultdict, deque

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
