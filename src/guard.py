"""Two cheap brakes in front of the whole app, so one caller cannot take the server down.

Both are plain ASGI, so they act before FastAPI reads or parses anything.

1. A request body is at most `max_body_bytes`. Without it, a signed-in student could post a body of any size and the server
   would read all of it into memory (a 2 GB instance) before the schema's own limits were looked at. A request that declares
   too large a body is refused with 413 without reading it; one that does not declare a size (chunked) is refused as soon as
   it passes the limit.

2. A caller has at most `max_in_flight` AI requests running at once. The per-minute limit counts requests as they start, but
   an answer can stream for minutes (the model timeout is 300 s), so twenty a minute is a hundred answers open at the same
   time, each holding a model call and memory. The caller is the student's token (hashed), or the network address when
   there is none. A request that goes over is refused with 429 and costs nothing; the slot is freed when the answer ends,
   however it ends.
"""
from __future__ import annotations

import hashlib
import json
from collections.abc import Awaitable, Callable, Iterable
from typing import Any

Scope = dict[str, Any]
Receive = Callable[[], Awaitable[dict[str, Any]]]
Send = Callable[[dict[str, Any]], Awaitable[None]]

AI_PATHS = ("/api/query", "/api/query/stream", "/api/exam/stream")


def _header(scope: Scope, name: bytes) -> str:
    for key, value in scope.get("headers", []):
        if key == name:
            return value.decode("latin-1")
    return ""


def caller_of(scope: Scope) -> str:
    """Who is asking: the hashed Bearer token, else the network address (the last X-Forwarded-For hop, as src/rate_limit.py)."""
    scheme, _, token = _header(scope, b"authorization").partition(" ")
    if scheme.lower() == "bearer" and token.strip():
        return "t:" + hashlib.sha256(token.strip().encode()).hexdigest()[:24]
    hops = [hop.strip() for hop in _header(scope, b"x-forwarded-for").split(",") if hop.strip()]
    if hops:
        return "a:" + hops[-1]
    client = scope.get("client")
    return "a:" + (client[0] if client else "unknown")


async def _refuse(send: Send, status: int, message: str, headers: Iterable[tuple[bytes, bytes]] = ()) -> None:
    body = json.dumps({"detail": message}).encode()
    await send({
        "type": "http.response.start", "status": status,
        "headers": [(b"content-type", b"application/json"), (b"content-length", str(len(body)).encode()), *headers],
    })
    await send({"type": "http.response.body", "body": body})


class RequestGuard:
    def __init__(self, app: Any, *, max_body_bytes: int, max_in_flight: int, ai_paths: tuple[str, ...] = AI_PATHS) -> None:
        self.app = app
        self.max_body_bytes = max_body_bytes
        self.max_in_flight = max_in_flight
        self.ai_paths = ai_paths
        self._running: dict[str, int] = {}

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        declared = _header(scope, b"content-length")
        if declared.isdigit() and int(declared) > self.max_body_bytes:
            await _refuse(send, 413, "The request is too large.")
            return

        caller = None
        if scope["method"] == "POST" and scope["path"] in self.ai_paths and self.max_in_flight > 0:
            caller = caller_of(scope)
            if self._running.get(caller, 0) >= self.max_in_flight:
                await _refuse(
                    send, 429, "You already have questions being answered. Wait for one to finish, then ask again.",
                    [(b"retry-after", b"3")],
                )
                return
            self._running[caller] = self._running.get(caller, 0) + 1

        seen = 0
        overflowed = False

        async def counted_receive() -> dict[str, Any]:
            nonlocal seen, overflowed
            message = await receive()
            if message["type"] == "http.request":
                seen += len(message.get("body", b""))
                if seen > self.max_body_bytes:
                    # Stop feeding the app: it sees the caller go away, and whatever it answers is replaced by a 413 below.
                    overflowed = True
                    return {"type": "http.disconnect"}
            return message

        started = False

        async def guarded_send(message: dict[str, Any]) -> None:
            nonlocal started
            if overflowed:
                if not started:
                    started = True
                    await _refuse(send, 413, "The request is too large.")
                return
            await send(message)

        try:
            try:
                await self.app(scope, counted_receive, guarded_send)
            except Exception:
                if not overflowed:
                    raise
            if overflowed and not started:
                started = True
                await _refuse(send, 413, "The request is too large.")
        finally:
            if caller is not None:
                left = self._running.get(caller, 1) - 1
                if left > 0:
                    self._running[caller] = left
                else:
                    self._running.pop(caller, None)
