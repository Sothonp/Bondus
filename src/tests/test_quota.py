"""The daily limit on AI questions, as the coach server enforces it.

A student's plan decides how many AI questions they get a day; the Laravel API counts them. The coach reports each question
to the API with the student's own token and refuses when the API says the plan is used up. Only the two network calls to
Laravel (who am I, and count this question) are faked here (httpx.MockTransport); the guard, the id handling and the
routes are the real code.
"""
from __future__ import annotations

import asyncio
import json
import re

import httpx
import pytest
from fastapi.testclient import TestClient

from src.api import create_app
from src.auth import LaravelTokenVerifier
from src.config import Settings
from src.quota import LaravelQuota, QuotaUnavailable, QuotaVerdict, question_id
from src.tests.test_api import ScriptedGenerator
from src.tests.test_auth import ME_URL, bearer, me

CONSUME_URL = "https://api.example.test/api/v1/ai/consume"
ID = "question-12345678"

# Every route that spends model quota, with the smallest body it accepts, plus the id the website would send.
AI_ROUTES = [
    ("/api/query", {"prompt": "hi", "request_id": ID}),
    ("/api/query/stream", {"prompt": "hi", "request_id": ID}),
    ("/api/exam/stream", {"subject": "physics", "language": "en", "request_id": ID}),
]


@pytest.fixture
def store_path(tmp_path):
    return tmp_path / "vector_index"


class FakeLaravel:
    """The Laravel API as far as the coach can see it: who am I, and count this question. Records every count."""

    def __init__(self, *, refuse: bool = False, count_status: int = 200) -> None:
        self.refuse = refuse
        self.count_status = count_status
        self.counted: list[dict] = []  # {"token": ..., "requestId": ...} for each question reported

    def __call__(self, request: httpx.Request) -> httpx.Response:
        header = request.headers.get("authorization") or ""
        token = header.removeprefix("Bearer ")
        if str(request.url) == ME_URL and request.method == "GET":
            return httpx.Response(200, json=me(1)) if token == "good" else httpx.Response(401, json={"code": "unauthenticated"})
        if str(request.url) == CONSUME_URL and request.method == "POST":
            body = json.loads(request.content)
            self.counted.append({"token": token, "requestId": body["requestId"]})
            if self.count_status != 200:
                return httpx.Response(self.count_status, json={"message": "nope"})
            usage = {"plan": "free", "limit": 5, "used": 5, "remaining": 0}
            if self.refuse:
                return httpx.Response(402, json={"allowed": False, **usage, "code": "ai_limit_reached", "message": "used all"})
            return httpx.Response(200, json={"allowed": True, **usage, "used": 1, "remaining": 4})
        return httpx.Response(404, json={"code": "not_found"})


def quota_down(request: httpx.Request) -> httpx.Response:
    if str(request.url) == ME_URL:
        return httpx.Response(200, json=me(1))
    raise httpx.ConnectError("connection refused", request=request)


def make_client(handler, store_path, *, quota_url: str = CONSUME_URL):
    transport = httpx.MockTransport(handler)
    verifier = LaravelTokenVerifier(ME_URL, client=httpx.AsyncClient(transport=transport))
    quota = LaravelQuota(quota_url, client=httpx.AsyncClient(transport=transport))
    settings = Settings(
        _env_file=None, embedding_backend="hashing", llm_provider="none", vector_store_path=store_path,
        auth_verify_url=ME_URL, answer_cache_ttl_seconds=0,
    )
    generator = ScriptedGenerator(["ok"])
    return TestClient(create_app(settings, generator=generator, token_verifier=verifier, quota=quota)), generator


# --- who may ask ------------------------------------------------------------------------------------------


@pytest.mark.parametrize(("route", "body"), AI_ROUTES)
def test_a_student_with_questions_left_gets_an_answer_and_is_counted_under_the_websites_id(route, body, store_path):
    # Breaks if: the guard blocks students who still have questions, or counts under the wrong id or token.
    laravel = FakeLaravel()
    client, generator = make_client(laravel, store_path)
    with client:
        response = client.post(route, json=body, headers=bearer("good"))
    assert response.status_code == 200
    assert len(generator.seen) == 1
    assert laravel.counted == [{"token": "good", "requestId": ID}]


@pytest.mark.parametrize(("route", "body"), AI_ROUTES)
def test_a_student_out_of_questions_is_refused_before_any_model_call(route, body, store_path):
    # Breaks if: a plan's limit is only a suggestion -- a Free student keeps spending the shared model quota.
    laravel = FakeLaravel(refuse=True)
    client, generator = make_client(laravel, store_path)
    with client:
        response = client.post(route, json=body, headers=bearer("good"))
    assert response.status_code == 402
    assert "AI questions" in response.json()["detail"]
    assert generator.seen == []


def test_a_request_with_no_token_is_refused_without_counting_anything(store_path):
    # Breaks if: someone who is not signed in is counted (or the count runs before the sign-in check).
    laravel = FakeLaravel()
    client, generator = make_client(laravel, store_path)
    with client:
        response = client.post("/api/query/stream", json={"prompt": "hi", "request_id": ID})
    assert response.status_code == 401
    assert laravel.counted == []
    assert generator.seen == []


# --- the id -----------------------------------------------------------------------------------------------


def test_the_rounds_of_one_long_answer_report_the_same_id(store_path):
    # Breaks if: a long answer (several requests) is counted as several questions.
    laravel = FakeLaravel()
    client, _ = make_client(laravel, store_path)
    with client:
        for _round in range(3):
            client.post("/api/query/stream", json={"prompt": "hi", "request_id": ID}, headers=bearer("good"))
    assert [c["requestId"] for c in laravel.counted] == [ID, ID, ID]


@pytest.mark.parametrize("body", [{"prompt": "hi"}, {"prompt": "hi", "request_id": "short"}, {"prompt": "hi", "request_id": "has spaces in it"}])
def test_a_request_with_no_usable_id_is_counted_under_a_fresh_one_each_time(body, store_path):
    # Breaks if: leaving the id out (or sending junk) is a way round the limit -- every such request must count.
    laravel = FakeLaravel()
    client, _ = make_client(laravel, store_path)
    with client:
        client.post("/api/query/stream", json=body, headers=bearer("good"))
        client.post("/api/query/stream", json=body, headers=bearer("good"))
    ids = [c["requestId"] for c in laravel.counted]
    assert len(ids) == 2 and ids[0] != ids[1]
    assert all(re.fullmatch(r"[A-Za-z0-9_-]{8,64}", i) for i in ids)


def test_question_id_keeps_a_good_id_and_replaces_anything_else():
    assert question_id("question-12345678") == "question-12345678"
    for bad in [None, "", "short", "x" * 65, "has spaces in it", 12345678, ["question-12345678"]]:
        fresh = question_id(bad)
        assert re.fullmatch(r"[A-Za-z0-9_-]{8,64}", fresh)
        assert fresh != bad


# --- when the API cannot say ------------------------------------------------------------------------------


@pytest.mark.parametrize("count_status", [404, 500, 401, 422])
def test_when_the_api_cannot_count_a_question_it_goes_ahead(count_status, store_path):
    # Breaks if: the API being down, or not having this feature yet (a 404 before it is deployed), shuts every student
    # out of the coach. Only the API's own 402 ai_limit_reached stops a question.
    client, generator = make_client(FakeLaravel(count_status=count_status), store_path)
    with client:
        response = client.post("/api/query/stream", json={"prompt": "hi", "request_id": ID}, headers=bearer("good"))
    assert response.status_code == 200
    assert len(generator.seen) == 1


def test_when_the_api_is_unreachable_the_question_goes_ahead(store_path):
    client, generator = make_client(quota_down, store_path)
    with client:
        response = client.post("/api/query/stream", json={"prompt": "hi", "request_id": ID}, headers=bearer("good"))
    assert response.status_code == 200
    assert len(generator.seen) == 1


# --- the client on its own --------------------------------------------------------------------------------


def test_the_client_reads_the_api_verdicts():
    def api(request: httpx.Request) -> httpx.Response:
        return httpx.Response(402, json={"allowed": False, "plan": "free", "limit": 5, "code": "ai_limit_reached"})

    def odd(request: httpx.Request) -> httpx.Response:
        return httpx.Response(402, json={"message": "a 402 from something else"})

    async def run() -> None:
        quota = LaravelQuota(CONSUME_URL, client=httpx.AsyncClient(transport=httpx.MockTransport(api)))
        assert await quota.consume("good", ID) == QuotaVerdict(False, "free", 5)
        other = LaravelQuota(CONSUME_URL, client=httpx.AsyncClient(transport=httpx.MockTransport(odd)))
        with pytest.raises(QuotaUnavailable):
            await other.consume("good", ID)

    asyncio.run(run())


# --- settings ---------------------------------------------------------------------------------------------


def settings(**kw) -> Settings:
    return Settings(_env_file=None, embedding_backend="hashing", llm_provider="none", **kw)


def test_the_count_address_sits_next_to_the_sign_in_address():
    assert settings(auth_verify_url=ME_URL).resolved_quota_url == CONSUME_URL
    assert settings(auth_verify_url=ME_URL + "/").resolved_quota_url == CONSUME_URL


def test_an_explicit_count_address_wins_and_the_limit_can_be_turned_off():
    assert settings(auth_verify_url=ME_URL, ai_quota_url="https://elsewhere.test/count").resolved_quota_url == "https://elsewhere.test/count"
    assert settings(auth_verify_url=ME_URL, ai_quota_enforce=False).resolved_quota_url == ""


def test_with_no_sign_in_address_there_is_no_limit():
    # Local development and the existing tests leave AUTH_VERIFY_URL empty: nothing to count against.
    assert settings().resolved_quota_url == ""
    assert settings(auth_verify_url="https://api.example.test/something/else").resolved_quota_url == ""
