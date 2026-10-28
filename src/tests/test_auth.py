"""Who may use the AI routes: only students signed in to the Laravel API.

The coach has no accounts of its own. It asks the Laravel API ("who am I", GET /me) whether the Bearer token
the browser sent is valid. Only that network call is faked here (httpx.MockTransport); the guard, the token
check and the per-student limit are the real code.
"""
from __future__ import annotations

import httpx
import pytest
from fastapi.testclient import TestClient

from src.api import create_app
from src.auth import LaravelTokenVerifier, SlidingWindowLimiter
from src.config import Settings
from src.tests.test_api import ScriptedGenerator, events

ME_URL = "https://api.example.test/api/v1/me"

# Every route that spends model quota, with the smallest body it accepts.
AI_ROUTES = [
    ("/api/query", {"prompt": "hi"}),
    ("/api/query/stream", {"prompt": "hi"}),
    ("/api/exam/stream", {"subject": "physics", "language": "en"}),
]
ASK = {"prompt": "hi"}


@pytest.fixture
def store_path(tmp_path):
    return tmp_path / "vector_index"


def me(user_id: int) -> dict:
    """A complete GET /me body, as the Laravel API sends it."""
    return {
        "user": {
            "id": user_id, "role": "student", "name": "Sophea", "phone": None,
            "email": f"student{user_id}@example.com", "age": 18, "educationLevel": "highschool",
            "grade": "12", "field": "science", "foreignLanguage": "English", "target": "A",
            "targetExamYear": 2027, "dailyMinutes": 60, "targetUniversity": "ITC",
            "subjectsToImprove": [], "level": 1, "xp": 40, "xpToNext": 60,
            "hasCompletedDiagnostic": False, "isPersonalized": False, "bannerDismissed": False,
            "reminderEmails": True, "createdAt": "2026-10-27T04:00:00+00:00",
        }
    }


class FakeLaravel:
    """The Laravel API, as far as the coach can see it. Records every check the coach makes."""

    def __init__(self, users: dict[str, int]) -> None:
        self.users = users  # token -> user id
        self.calls: list[str | None] = []  # the Authorization header of each check

    def __call__(self, request: httpx.Request) -> httpx.Response:
        if request.method != "GET" or str(request.url) != ME_URL:
            return httpx.Response(404, json={"message": "Not found.", "code": "not_found"})
        header = request.headers.get("authorization")
        self.calls.append(header)
        token = header.removeprefix("Bearer ") if header else None
        if token in self.users:
            return httpx.Response(200, json=me(self.users[token]))
        return httpx.Response(401, json={"message": "Unauthenticated.", "code": "unauthenticated"})


def laravel_down(request: httpx.Request) -> httpx.Response:
    raise httpx.ConnectError("connection refused", request=request)


def laravel_broken(request: httpx.Request) -> httpx.Response:
    return httpx.Response(500, text="Server Error")


def laravel_odd_body(request: httpx.Request) -> httpx.Response:
    return httpx.Response(200, json={})


def make_client(handler, store_path, *, per_minute: int = 20, cache_seconds: int = 60, clock=None):
    extra = {"clock": clock} if clock else {}
    verifier = LaravelTokenVerifier(
        ME_URL,
        cache_seconds=cache_seconds,
        client=httpx.AsyncClient(transport=httpx.MockTransport(handler)),
        **extra,
    )
    settings = Settings(
        _env_file=None,
        embedding_backend="hashing",
        llm_provider="none",
        vector_store_path=store_path,
        auth_verify_url=ME_URL,
        user_rate_limit_per_minute=per_minute,
        # These tests count the requests that reach a model; a cached answer would not.
        answer_cache_ttl_seconds=0,
    )
    generator = ScriptedGenerator(["ok"])
    return TestClient(create_app(settings, generator=generator, token_verifier=verifier)), generator


def bearer(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# --- who gets in -----------------------------------------------------------------------------------------


@pytest.mark.parametrize(("route", "body"), AI_ROUTES)
def test_a_request_with_no_token_is_refused_before_any_model_call(route, body, store_path):
    # Breaks if: an AI route is added or edited without the guard -- anyone on the internet spends the quota.
    laravel = FakeLaravel({"good": 1})
    client, generator = make_client(laravel, store_path)
    with client:
        response = client.post(route, json=body)
    assert response.status_code == 401
    assert generator.seen == []
    assert laravel.calls == []


def test_a_token_laravel_rejects_is_refused(store_path):
    # Breaks if: any Bearer string is treated as a login.
    laravel = FakeLaravel({"good": 1})
    client, generator = make_client(laravel, store_path)
    with client:
        response = client.post("/api/query/stream", json=ASK, headers=bearer("bogus"))
    assert response.status_code == 401
    assert generator.seen == []
    assert laravel.calls == ["Bearer bogus"]


def test_a_signed_in_student_gets_an_answer_and_laravel_sees_their_exact_token(store_path):
    # Breaks if: the guard blocks real students, or checks a mangled copy of the token.
    laravel = FakeLaravel({"good": 1})
    client, generator = make_client(laravel, store_path)
    with client:
        response = client.post("/api/query/stream", json=ASK, headers=bearer("good"))
    assert response.status_code == 200
    assert events(response)[-1]["type"] == "done"
    assert len(generator.seen) == 1
    assert laravel.calls == ["Bearer good"]


@pytest.mark.parametrize("header", ["Basic Z29vZDpwdw==", "Bearer", "Bearer ", "good"])
def test_anything_but_a_bearer_token_is_refused_without_asking_laravel(header, store_path):
    # Breaks if: a malformed header is passed on to Laravel (load) or, worse, accepted.
    laravel = FakeLaravel({"good": 1})
    client, generator = make_client(laravel, store_path)
    with client:
        response = client.post("/api/query/stream", json=ASK, headers={"Authorization": header})
    assert response.status_code == 401
    assert generator.seen == []
    assert laravel.calls == []


@pytest.mark.parametrize("handler", [laravel_down, laravel_broken, laravel_odd_body])
def test_when_laravel_cannot_vouch_for_a_token_nobody_gets_in(handler, store_path):
    # Breaks if: the guard fails open -- an outage or an unexpected reply from the sign-in API lets everyone in.
    client, generator = make_client(handler, store_path)
    with client:
        response = client.post("/api/query/stream", json=ASK, headers=bearer("good"))
    assert response.status_code == 503
    assert generator.seen == []


# --- how often Laravel is asked ---------------------------------------------------------------------------


def test_a_checked_token_is_remembered_instead_of_asking_laravel_every_time(store_path):
    # Breaks if: every chat message costs Laravel a request (and the student a round trip).
    laravel = FakeLaravel({"good": 1})
    client, _ = make_client(laravel, store_path)
    with client:
        first = client.post("/api/query/stream", json=ASK, headers=bearer("good"))
        second = client.post("/api/query/stream", json=ASK, headers=bearer("good"))
    assert (first.status_code, second.status_code) == (200, 200)
    assert laravel.calls == ["Bearer good"]


def test_logging_out_takes_effect_when_the_remembered_check_expires(store_path):
    # Breaks if: a revoked token keeps working forever (cache never expires), or expires too early to help.
    now = [0.0]
    laravel = FakeLaravel({"good": 1})
    client, _ = make_client(laravel, store_path, cache_seconds=60, clock=lambda: now[0])
    with client:
        assert client.post("/api/query/stream", json=ASK, headers=bearer("good")).status_code == 200
        del laravel.users["good"]  # the student logs out; Laravel revokes the token
        now[0] = 30.0
        assert client.post("/api/query/stream", json=ASK, headers=bearer("good")).status_code == 200
        now[0] = 61.0
        assert client.post("/api/query/stream", json=ASK, headers=bearer("good")).status_code == 401
    assert laravel.calls == ["Bearer good", "Bearer good"]


def test_a_rejected_token_is_not_sent_to_laravel_again_on_every_attempt(store_path):
    # Breaks if: someone hammering the coach with a bad token turns every attempt into a Laravel request.
    laravel = FakeLaravel({"good": 1})
    client, _ = make_client(laravel, store_path)
    with client:
        codes = [client.post("/api/query/stream", json=ASK, headers=bearer("bogus")).status_code for _ in range(5)]
    assert codes == [401] * 5
    assert laravel.calls == ["Bearer bogus"]


# --- how much one student may ask ---------------------------------------------------------------------------


def test_each_student_has_their_own_per_minute_allowance(store_path):
    # Breaks if: the limit is global (one busy student locks everyone out) or missing (one account drains the quota).
    laravel = FakeLaravel({"alice": 1, "bob": 2})
    client, generator = make_client(laravel, store_path, per_minute=2)
    with client:
        alice = [client.post("/api/query/stream", json=ASK, headers=bearer("alice")) for _ in range(3)]
        bob = client.post("/api/query/stream", json=ASK, headers=bearer("bob"))
    assert [r.status_code for r in alice] == [200, 200, 429]
    assert 1 <= int(alice[2].headers["retry-after"]) <= 60
    assert bob.status_code == 200
    assert len(generator.seen) == 3  # two for alice, one for bob; the refused one never reached a model


def test_the_limit_counts_only_requests_that_were_served():
    # Breaks if: hammering a blocked account keeps extending its own block forever.
    now = [0]
    limiter = SlidingWindowLimiter(3, window=60, clock=lambda: now[0])
    assert [limiter.hit("a") for _ in range(3)] == [None, None, None]
    for t in (10, 20, 30, 40, 50):
        now[0] = t
        assert limiter.hit("a") is not None
    now[0] = 60
    assert limiter.hit("a") is None


def test_the_limiter_says_how_long_until_the_oldest_request_ages_out():
    # Breaks if: the wait is wrong (a student told to wait 60 s who could ask again in 1 s, or the reverse).
    now = [0]
    limiter = SlidingWindowLimiter(3, window=60, clock=lambda: now[0])
    for _ in range(3):
        limiter.hit("a")
    now[0] = 10
    assert limiter.hit("a") == 50
    now[0] = 59
    assert limiter.hit("a") == 1


# --- what stays open, and what the browser can read ------------------------------------------------------------


def test_health_needs_no_token_and_reports_that_sign_in_is_required(store_path):
    # Breaks if: the guard covers /health (Render marks the service dead), or /health cannot show whether the
    # guard is really on -- the only way to tell from outside that AUTH_VERIFY_URL took effect.
    client, _ = make_client(FakeLaravel({}), store_path)
    with client:
        response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["auth_required"] is True


def test_with_no_verify_url_configured_the_routes_stay_open(store_path):
    # Breaks if: local development and the existing tests suddenly need a Laravel API.
    settings = Settings(_env_file=None, embedding_backend="hashing", llm_provider="none", vector_store_path=store_path)
    generator = ScriptedGenerator(["ok"])
    with TestClient(create_app(settings, generator=generator)) as client:
        health = client.get("/health").json()
        answer = client.post("/api/query/stream", json=ASK)
    assert health["auth_required"] is False
    assert answer.status_code == 200


def test_setting_auth_verify_url_alone_turns_the_guard_on(store_path):
    # Breaks if: AUTH_VERIFY_URL is read but never wired in -- the owner sets it on Render and the coach stays open.
    settings = Settings(
        _env_file=None, embedding_backend="hashing", llm_provider="none",
        vector_store_path=store_path, auth_verify_url=ME_URL,
    )
    generator = ScriptedGenerator(["ok"])
    with TestClient(create_app(settings, generator=generator)) as client:
        response = client.post("/api/query/stream", json=ASK)
    assert response.status_code == 401
    assert generator.seen == []


def test_a_refusal_is_readable_by_the_website(store_path):
    # Breaks if: the 401/429 body has no CORS header -- the browser hides it and shows "server unreachable".
    client, _ = make_client(FakeLaravel({"good": 1}), store_path)
    origin = "http://localhost:5173"
    with client:
        response = client.post("/api/query/stream", json=ASK, headers={"Origin": origin})
    assert response.status_code == 401
    assert response.headers["access-control-allow-origin"] == origin


def test_the_browser_may_send_its_authorization_header(store_path):
    # Characterises an assumption: the Fetch spec does not let "*" cover Authorization, so the preflight
    # must name it. Breaks if: a CORS change makes every signed-in request fail in the browser only.
    client, _ = make_client(FakeLaravel({"good": 1}), store_path)
    with client:
        response = client.options(
            "/api/query/stream",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "authorization,content-type",
            },
        )
    assert response.status_code == 200
    assert "authorization" in response.headers["access-control-allow-headers"].lower()
