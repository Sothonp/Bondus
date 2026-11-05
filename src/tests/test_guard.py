"""RequestGuard: a body-size cap and a limit on AI requests running at once. Plain ASGI, so no web framework is needed here."""
from __future__ import annotations

import asyncio
import json

from src.guard import RequestGuard, caller_of


def scope(path="/api/query", method="POST", headers=(), client=("203.0.113.9", 1234)):
    return {"type": "http", "method": method, "path": path, "headers": [(k.encode(), v.encode()) for k, v in headers], "client": client}


class Probe:
    """Drives the guard like a server would and records what was sent back."""

    def __init__(self) -> None:
        self.sent: list[dict] = []

    async def send(self, message: dict) -> None:
        self.sent.append(message)

    @property
    def status(self) -> int | None:
        return next((m["status"] for m in self.sent if m["type"] == "http.response.start"), None)

    @property
    def body(self) -> bytes:
        return b"".join(m.get("body", b"") for m in self.sent if m["type"] == "http.response.body")


def feed(*chunks: bytes):
    queue = [{"type": "http.request", "body": c, "more_body": i < len(chunks) - 1} for i, c in enumerate(chunks)] or [
        {"type": "http.request", "body": b"", "more_body": False}
    ]

    async def receive() -> dict:
        return queue.pop(0) if queue else {"type": "http.disconnect"}

    return receive


async def answer_ok(scope, receive, send):
    total = 0
    while True:
        message = await receive()
        if message["type"] != "http.request":
            break
        total += len(message["body"])
        if not message.get("more_body"):
            break
    await send({"type": "http.response.start", "status": 200, "headers": []})
    await send({"type": "http.response.body", "body": str(total).encode()})


def run(coro):
    return asyncio.run(coro)


def guard(app=answer_ok, **kw):
    return RequestGuard(app, max_body_bytes=kw.pop("max_body_bytes", 100), max_in_flight=kw.pop("max_in_flight", 2), **kw)


def test_a_body_within_the_limit_goes_through():
    probe = Probe()
    run(guard()(scope(headers=[("content-length", "50")]), feed(b"x" * 50), probe.send))
    assert probe.status == 200 and probe.body == b"50"


def test_a_declared_size_over_the_limit_is_refused_without_reading_it():
    # Breaks if: a huge body is read into memory before anything checks its size.
    probe = Probe()
    read = []

    async def receive():
        read.append(1)
        return {"type": "http.request", "body": b"", "more_body": False}

    async def never(scope, receive, send):
        raise AssertionError("the app must not run")

    run(guard(never)(scope(headers=[("content-length", "101")]), receive, probe.send))
    assert probe.status == 413 and read == []
    assert json.loads(probe.body)["detail"]


def test_a_chunked_body_is_cut_off_once_it_passes_the_limit():
    # Breaks if: leaving out Content-Length is a way round the size limit.
    probe = Probe()
    run(guard()(scope(), feed(b"x" * 60, b"x" * 60, b"x" * 60), probe.send))
    assert probe.status == 413


def test_an_app_that_dies_on_a_cut_off_body_still_gets_a_413():
    async def dies(scope, receive, send):
        while (await receive())["type"] == "http.request":
            pass
        raise RuntimeError("client went away")

    probe = Probe()
    run(guard(dies)(scope(), feed(b"x" * 200), probe.send))
    assert probe.status == 413


def test_an_error_that_has_nothing_to_do_with_the_size_is_not_hidden():
    async def broken(scope, receive, send):
        raise RuntimeError("bug")

    try:
        run(guard(broken)(scope(), feed(b"hi"), Probe().send))
    except RuntimeError:
        return
    raise AssertionError("the error must reach the server")


def test_only_ai_posts_count_towards_the_in_flight_limit():
    async def scenario():
        gate = asyncio.Event()

        async def slow(scope, receive, send):
            await gate.wait()
            await send({"type": "http.response.start", "status": 200, "headers": []})
            await send({"type": "http.response.body", "body": b"ok"})

        g = guard(slow, max_in_flight=2)
        headers = [("authorization", "Bearer abc")]
        probes = [Probe() for _ in range(5)]
        open_ones = [asyncio.create_task(g(scope(headers=headers), feed(b"{}"), probes[i].send)) for i in range(2)]
        await asyncio.sleep(0)
        third = Probe()
        await g(scope(headers=headers), feed(b"{}"), third.send)
        health = Probe()
        gate.set()
        await g(scope("/health", "GET", headers), feed(), health.send)
        await asyncio.gather(*open_ones)
        return third, health, probes[:2]

    third, health, first_two = run(scenario())
    assert third.status == 429
    assert any(k == b"retry-after" for m in third.sent for k, _ in m.get("headers", []))
    assert health.status == 200
    assert [p.status for p in first_two] == [200, 200]


def test_the_slot_is_freed_when_an_answer_ends_even_if_it_fails():
    async def boom(scope, receive, send):
        raise RuntimeError("model fell over")

    async def scenario():
        g = guard(boom, max_in_flight=1)
        for _ in range(3):
            try:
                await g(scope(headers=[("authorization", "Bearer abc")]), feed(b"{}"), Probe().send)
            except RuntimeError:
                pass
        ok = guard(answer_ok, max_in_flight=1)
        probe = Probe()
        await ok(scope(headers=[("authorization", "Bearer abc")]), feed(b"{}"), probe.send)
        return g._running, probe

    running, probe = run(scenario())
    assert running == {}, "no slot is left held"
    assert probe.status == 200


def test_each_caller_has_their_own_slots():
    async def scenario():
        gate = asyncio.Event()

        async def slow(scope, receive, send):
            await gate.wait()
            await send({"type": "http.response.start", "status": 200, "headers": []})
            await send({"type": "http.response.body", "body": b""})

        g = guard(slow, max_in_flight=1)
        a, b = Probe(), Probe()
        first = asyncio.create_task(g(scope(headers=[("authorization", "Bearer one")]), feed(b"{}"), a.send))
        await asyncio.sleep(0)
        second = asyncio.create_task(g(scope(headers=[("authorization", "Bearer two")]), feed(b"{}"), b.send))
        await asyncio.sleep(0)
        gate.set()
        await asyncio.gather(first, second)
        return a, b

    a, b = run(scenario())
    assert a.status == 200 and b.status == 200


def test_the_caller_is_the_token_or_else_the_last_forwarded_address():
    assert caller_of(scope(headers=[("authorization", "Bearer abc")])).startswith("t:")
    assert caller_of(scope(headers=[("authorization", "Bearer abc")])) == caller_of(scope(headers=[("authorization", "bearer  abc ")]))
    assert caller_of(scope(headers=[("authorization", "Bearer abc")])) != caller_of(scope(headers=[("authorization", "Bearer abd")]))
    assert caller_of(scope(headers=[("x-forwarded-for", "1.1.1.1, 2.2.2.2")])) == "a:2.2.2.2"
    assert caller_of(scope()) == "a:203.0.113.9"
    assert caller_of(scope(client=None)) == "a:unknown"


def test_non_http_traffic_passes_straight_through():
    seen = []

    async def app(scope, receive, send):
        seen.append(scope["type"])

    run(guard(app)({"type": "lifespan"}, feed(), Probe().send))
    assert seen == ["lifespan"]
