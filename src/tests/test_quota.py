"""The daily limit on AI questions, as the coach server enforces it.

A student's plan decides how many AI questions they get a day; the Laravel API counts them. The coach reports each question
to the API with the student's own token and refuses when the API says the plan is used up. Only the two network calls to
Laravel (who am I, and count this question) are faked here (httpx.MockTransport); the guard, the id handling and the
routes are the real code.
"""
from __future__ import annotations

import asyncio
import base64
import io
import json
import re

import httpx
import pytest
from fastapi.testclient import TestClient

from PIL import Image

from src.api import create_app
from src.auth import LaravelTokenVerifier
from src.embeddings.embedder import build_embedder
from src.ingestion.image_ocr import HybridImageOCR
from src.config import Settings
from src.quota import REASON_QUESTIONS, LaravelQuota, QuotaBusy, QuotaDenied, QuotaUnavailable, QuotaVerdict, question_id
from src.tests.test_api import ScriptedGenerator
from src.tests.test_auth import ME_URL, bearer, me
from src.tests.test_exam import make_store

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


@pytest.fixture
def exam_store_path(tmp_path):
    """Like store_path, but seeded with an indexed physics past paper, the way test_exam.py's exam_client fixture
    builds one. /api/exam/stream reads the store for the subject's past papers before it ever calls the model; with
    nothing indexed, it refuses in band (see test_a_subject_with_no_past_papers_is_refused_in_band in test_exam.py),
    so a quota test that wants exam-stream to actually reach the model needs a paper to copy, the same as a real
    subject with its past papers indexed would have."""
    path = tmp_path / "vector_index"
    settings = Settings(_env_file=None, embedding_backend="hashing", llm_provider="none", vector_store_path=path)
    make_store(path, build_embedder(settings).name).save()
    return path


class FakeLaravel:
    """The Laravel API as far as the coach can see it: who am I, and count this question. Records every count."""

    def __init__(self, *, refuse: bool = False, count_status: int = 200, refuse_uploads: bool = False, upload_limit: int = 0, plan: str = "free") -> None:
        self.plan = plan
        self.refuse = refuse
        self.refuse_uploads = refuse_uploads
        self.upload_limit = upload_limit
        self.count_status = count_status
        self.counted: list[dict] = []  # {"token": ..., "requestId": ...} for each question reported
        self.bodies: list[dict] = []  # the whole body of each report (uploads and question when they were sent)

    def __call__(self, request: httpx.Request) -> httpx.Response:
        header = request.headers.get("authorization") or ""
        token = header.removeprefix("Bearer ")
        if str(request.url) == ME_URL and request.method == "GET":
            return httpx.Response(200, json=me(1)) if token == "good" else httpx.Response(401, json={"code": "unauthenticated"})
        if str(request.url) == CONSUME_URL and request.method == "POST":
            body = json.loads(request.content)
            self.counted.append({"token": token, "requestId": body["requestId"]})
            self.bodies.append(body)
            if self.count_status != 200:
                return httpx.Response(self.count_status, json={"message": "nope"})
            usage = {"plan": self.plan, "limit": 5, "used": 5, "remaining": 0}
            if self.refuse_uploads and body.get("uploads"):
                return httpx.Response(402, json={"allowed": False, **usage, "uploadLimit": self.upload_limit, "code": "upload_limit_reached", "message": "no uploads"})
            if self.refuse:
                return httpx.Response(402, json={"allowed": False, **usage, "code": "ai_limit_reached", "message": "used all"})
            return httpx.Response(200, json={"allowed": True, **usage, "used": 1, "remaining": 4})
        return httpx.Response(404, json={"code": "not_found"})


class _Engine:
    engine = model = "stub"

    def transcribe_page(self, payload):
        return "x = 1", False


def StubOCR() -> HybridImageOCR:
    """A photo reader that needs no model: only what reaches it (and whether it is reached) matters here."""
    return HybridImageOCR(khmer=None, vision=[_Engine()])


def quota_down(request: httpx.Request) -> httpx.Response:
    if str(request.url) == ME_URL:
        return httpx.Response(200, json=me(1))
    raise httpx.ConnectError("connection refused", request=request)


def make_client(handler, store_path, *, quota_url: str = CONSUME_URL, **settings_extra):
    transport = httpx.MockTransport(handler)
    verifier = LaravelTokenVerifier(ME_URL, client=httpx.AsyncClient(transport=transport))
    quota = LaravelQuota(quota_url, client=httpx.AsyncClient(transport=transport))
    settings = Settings(
        _env_file=None, embedding_backend="hashing", llm_provider="none", vector_store_path=store_path,
        auth_verify_url=ME_URL, answer_cache_ttl_seconds=0, **settings_extra,
    )
    generator = ScriptedGenerator(["ok"])
    app = create_app(settings, generator=generator, token_verifier=verifier, quota=quota, image_ocr=StubOCR())
    return TestClient(app), generator


# --- who may ask ------------------------------------------------------------------------------------------


@pytest.mark.parametrize(("route", "body"), AI_ROUTES)
def test_a_student_with_questions_left_gets_an_answer_and_is_counted_under_the_websites_id(route, body, store_path, request):
    # Breaks if: the guard blocks students who still have questions, or counts under the wrong id or token.
    if route == "/api/exam/stream":
        # Unlike the other two routes, exam-stream needs a past paper indexed before it will call the model at all.
        store_path = request.getfixturevalue("exam_store_path")
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


# --- photos and documents ---------------------------------------------------------------------------------

def real_photo(size=(8, 8)) -> dict:
    """A small PNG that really decodes: the server now checks the photos before it counts them."""
    buffer = io.BytesIO()
    Image.new("RGB", size, "white").save(buffer, format="PNG")
    return {"data": "data:image/png;base64," + base64.b64encode(buffer.getvalue()).decode(), "mime_type": "image/png"}


PHOTO = real_photo()
# Looks like a photo to the body (valid base64, long enough) but is not an image.
NOT_A_PHOTO = {"data": "data:image/png;base64," + base64.b64encode(b"this is plain text, not a picture").decode(), "mime_type": "image/png"}
PHOTO_ROUTES = [
    ("/api/query", {"prompt": "what is this", "images": [PHOTO, PHOTO], "request_id": ID}),
    ("/api/query/stream", {"prompt": "what is this", "images": [PHOTO, PHOTO], "request_id": ID}),
]


@pytest.mark.parametrize(("route", "body"), PHOTO_ROUTES)
def test_the_photos_of_a_question_are_reported_with_it(route, body, store_path):
    # Breaks if: photos are not reported to the plan's daily uploads, so only the website's own check stops a Free student.
    laravel = FakeLaravel()
    client, _ = make_client(laravel, store_path)
    with client:
        client.post(route, json=body, headers=bearer("good"))
    assert laravel.bodies[0]["uploads"] == 2
    assert laravel.bodies[0]["requestId"] == ID


@pytest.mark.parametrize("body", [{"prompt": "hi", "request_id": ID}, {"prompt": "hi", "images": [], "request_id": ID}])
def test_a_question_without_photos_reports_no_uploads(body, store_path):
    # Breaks if: a plain question looks different to the API from the way it always has (an API without uploads yet).
    laravel = FakeLaravel()
    client, _ = make_client(laravel, store_path)
    with client:
        client.post("/api/query/stream", json=body, headers=bearer("good"))
    assert laravel.bodies[0] == {"requestId": ID}


@pytest.mark.parametrize(("route", "body"), PHOTO_ROUTES)
def test_a_free_student_s_photo_is_refused_before_any_model_call(route, body, store_path):
    # Breaks if: Free students can send photos by calling the AI server directly.
    laravel = FakeLaravel(refuse_uploads=True, upload_limit=0)
    client, generator = make_client(laravel, store_path)
    with client:
        response = client.post(route, json=body, headers=bearer("good"))
    assert response.status_code == 402
    assert "not part of the Free plan" in response.json()["detail"]
    assert generator.seen == []


def test_a_student_out_of_uploads_is_told_they_come_back_tomorrow(store_path):
    laravel = FakeLaravel(refuse_uploads=True, upload_limit=10)
    client, generator = make_client(laravel, store_path)
    with client:
        response = client.post("/api/query", json=PHOTO_ROUTES[0][1], headers=bearer("good"))
    assert response.status_code == 402
    assert "used all of today's photo and document uploads" in response.json()["detail"]
    assert generator.seen == []


def test_a_question_without_photos_still_works_for_a_student_with_no_uploads(store_path):
    # Breaks if: refusing uploads also shuts a Free student out of plain questions.
    client, generator = make_client(FakeLaravel(refuse_uploads=True), store_path)
    with client:
        response = client.post("/api/query/stream", json={"prompt": "hi", "request_id": ID}, headers=bearer("good"))
    assert response.status_code == 200
    assert len(generator.seen) == 1


def test_a_document_is_counted_as_an_upload_and_not_as_a_question(store_path):
    # Breaks if: adding a document burns an AI question, or is not counted at all.
    laravel = FakeLaravel()
    client, _ = make_client(laravel, store_path)
    with client:
        response = client.post(
            "/api/ingest", files={"file": ("notes.md", b"# Notes\n\nSome text.", "text/markdown")}, headers=bearer("good")
        )
    assert response.status_code == 200
    assert len(laravel.bodies) == 1
    assert laravel.bodies[0]["uploads"] == 1
    assert laravel.bodies[0]["question"] is False


def test_a_free_student_cannot_add_a_document(store_path):
    # Breaks if: documents are a way round the Free plan having no uploads, or the file is indexed before the count.
    laravel = FakeLaravel(refuse_uploads=True)
    client, _ = make_client(laravel, store_path)
    with client:
        response = client.post(
            "/api/ingest", files={"file": ("notes.md", b"# Notes\n\nSome text.", "text/markdown")}, headers=bearer("good")
        )
        assert response.status_code == 402
        assert client.get("/health").json()["documents"] == 0


def test_adding_a_document_needs_a_sign_in(store_path):
    laravel = FakeLaravel()
    client, _ = make_client(laravel, store_path)
    with client:
        response = client.post("/api/ingest", files={"file": ("notes.md", b"# Notes\n\nSome text.", "text/markdown")})
    assert response.status_code == 401
    assert laravel.bodies == []


def test_pasted_text_is_not_an_upload(store_path):
    # Breaks if: text typed into the library is counted as a file upload.
    laravel = FakeLaravel()
    client, _ = make_client(laravel, store_path)
    with client:
        response = client.post("/api/ingest", data={"text": "# Notes\n\nSome text."}, headers=bearer("good"))
    assert response.status_code == 200
    assert laravel.bodies == []


def test_the_client_reads_the_upload_verdict():
    def api(request: httpx.Request) -> httpx.Response:
        return httpx.Response(402, json={"allowed": False, "plan": "free", "limit": 5, "uploadLimit": 0, "code": "upload_limit_reached"})

    async def run() -> None:
        quota = LaravelQuota(CONSUME_URL, client=httpx.AsyncClient(transport=httpx.MockTransport(api)))
        assert await quota.consume("good", ID, uploads=1) == QuotaVerdict(False, "free", 5, "uploads", 0)

    asyncio.run(run())


# --- Free accounts, per network address ---------------------------------------------------------------------


def ask_from(client, address, request_id):
    return client.post(
        "/api/query/stream", json={"prompt": "hi", "request_id": request_id},
        headers={**bearer("good"), "x-forwarded-for": address},
    )


def test_free_questions_are_capped_per_network_address_across_accounts(store_path):
    # Breaks if: a script that makes Free accounts can spend the shared AI quota without limit from one connection.
    client, generator = make_client(FakeLaravel(), store_path, free_ai_per_address_daily=2)
    with client:
        assert ask_from(client, "198.51.100.7", "question-aaaa1111").status_code == 200
        assert ask_from(client, "198.51.100.7", "question-bbbb2222").status_code == 200
        refused = ask_from(client, "198.51.100.7", "question-cccc3333")
    assert refused.status_code == 429
    assert "Try again tomorrow" in refused.json()["detail"]
    assert len(generator.seen) == 2


def test_another_address_is_not_affected_by_the_cap(store_path):
    client, generator = make_client(FakeLaravel(), store_path, free_ai_per_address_daily=1)
    with client:
        assert ask_from(client, "198.51.100.7", "question-aaaa1111").status_code == 200
        assert ask_from(client, "198.51.100.8", "question-bbbb2222").status_code == 200
    assert len(generator.seen) == 2


def test_the_rounds_of_one_long_answer_use_one_of_the_addresses_questions(store_path):
    # Breaks if: a long answer (several requests with the same id) eats the cap several times over.
    client, generator = make_client(FakeLaravel(), store_path, free_ai_per_address_daily=1)
    with client:
        for _round in range(3):
            assert ask_from(client, "198.51.100.7", "question-aaaa1111").status_code == 200
    assert len(generator.seen) == 3


def test_paid_plans_are_not_held_to_the_address_cap(store_path):
    # Breaks if: paying students on a shared network are limited by their neighbours.
    client, generator = make_client(FakeLaravel(plan="standard"), store_path, free_ai_per_address_daily=1)
    with client:
        for i in range(3):
            assert ask_from(client, "198.51.100.7", f"question-paid000{i}").status_code == 200
    assert len(generator.seen) == 3


def test_the_address_cap_can_be_turned_off(store_path):
    client, generator = make_client(FakeLaravel(), store_path, free_ai_per_address_daily=0)
    with client:
        for i in range(5):
            assert ask_from(client, "198.51.100.7", f"question-free000{i}").status_code == 200
    assert len(generator.seen) == 5


def test_a_question_the_plan_refused_is_not_counted_against_the_address(store_path):
    # Breaks if: refused questions use up the address's allowance.
    client, generator = make_client(FakeLaravel(refuse=True), store_path, free_ai_per_address_daily=1)
    with client:
        for i in range(3):
            assert ask_from(client, "198.51.100.7", f"question-nope000{i}").status_code == 402
    assert generator.seen == []


# --- the id -----------------------------------------------------------------------------------------------


def test_the_rounds_of_one_long_answer_are_reported_once(store_path):
    # Breaks if: a long answer (several requests) is counted as several questions, or reported to the API once per round.
    laravel = FakeLaravel()
    client, _ = make_client(laravel, store_path)
    with client:
        for _round in range(3):
            client.post("/api/query/stream", json={"prompt": "hi", "request_id": ID}, headers=bearer("good"))
    assert [c["requestId"] for c in laravel.counted] == [ID]  # one question, one report, however many rounds


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


@pytest.mark.parametrize("count_status", [404, 500, 422])
def test_when_the_api_cannot_count_a_question_it_goes_ahead(count_status, store_path):
    # Breaks if: the API being down, or not having this feature yet (a 404 before it is deployed), shuts every student
    # out of the coach. Only the API's own 402 ai_limit_reached stops a question -- a 401/403 is tested separately below,
    # since those are an explicit "no" about the token, not an "unsure".
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


@pytest.mark.parametrize("count_status", [401, 403])
def test_a_revoked_or_suspended_students_question_is_denied_not_let_through(count_status, store_path):
    # Breaks if: a 401 (the token Laravel no longer recognises) or a 403 (the student's own account just suspended --
    # EnsureNotSuspended deletes the token and answers 403 from this same endpoint) is treated as "unsure" and the
    # question goes through within the outage allowance meant for genuine infrastructure trouble.
    laravel = FakeLaravel(count_status=count_status)
    client, generator = make_client(laravel, store_path)
    with client:
        response = client.post("/api/query/stream", json={"prompt": "hi", "request_id": ID}, headers=bearer("good"))
    assert response.status_code == 401
    assert "sign in again" in response.json()["detail"].lower()
    assert generator.seen == []


def test_a_token_revoked_right_after_its_sign_in_check_was_cached_is_still_denied(store_path):
    # Breaks if: require_signed_in's own cache (up to auth_cache_seconds) means a token revoked moments ago still answers,
    # because only the sign-in check (/me) is cached -- LaravelQuota.consume (/ai/consume) is never cached and asks
    # Laravel fresh every time, so it must be the one that catches a revocation the sign-in cache is still blind to.
    class Laravel:
        def __init__(self) -> None:
            self.revoked = False
            self.me_calls = 0
            self.counted: list[str] = []

        def __call__(self, request: httpx.Request) -> httpx.Response:
            if str(request.url) == ME_URL and request.method == "GET":
                self.me_calls += 1
                if self.revoked:
                    return httpx.Response(401, json={"code": "unauthenticated"})
                return httpx.Response(200, json=me(1))
            if str(request.url) == CONSUME_URL and request.method == "POST":
                self.counted.append(json.loads(request.content)["requestId"])
                if self.revoked:
                    return httpx.Response(401, json={"code": "unauthenticated"})
                return httpx.Response(200, json={"allowed": True, "plan": "free", "limit": 5})
            return httpx.Response(404, json={"code": "not_found"})

    laravel = Laravel()
    client, generator = make_client(laravel, store_path)
    with client:
        first = client.post("/api/query/stream", json={"prompt": "hi", "request_id": ID}, headers=bearer("good"))
        laravel.revoked = True  # the student's token is revoked the instant after it was checked and cached
        second = client.post(
            "/api/query/stream", json={"prompt": "hi", "request_id": "question-22222222"}, headers=bearer("good")
        )
    assert first.status_code == 200
    assert second.status_code == 401
    assert laravel.me_calls == 1  # the sign-in check never asked again: its own cache still says "good"
    assert len(generator.seen) == 1


# --- the client on its own --------------------------------------------------------------------------------


def test_the_client_reads_the_api_verdicts():
    def api(request: httpx.Request) -> httpx.Response:
        return httpx.Response(402, json={"allowed": False, "plan": "free", "limit": 5, "code": "ai_limit_reached"})

    def odd(request: httpx.Request) -> httpx.Response:
        return httpx.Response(402, json={"message": "a 402 from something else"})

    async def run() -> None:
        quota = LaravelQuota(CONSUME_URL, client=httpx.AsyncClient(transport=httpx.MockTransport(api)))
        assert await quota.consume("good", ID) == QuotaVerdict(False, "free", 5, REASON_QUESTIONS)
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


# --- the server checks the input before it counts anything -------------------------------------------------


@pytest.mark.parametrize("route", ["/api/query", "/api/query/stream"])
def test_a_photo_that_is_not_an_image_is_refused_and_not_counted(route, store_path):
    # Breaks if: a request that is going to be refused still burns a question and an upload, or "photos" that are not images
    # are counted (and sent to the model) as if they were.
    laravel = FakeLaravel()
    client, generator = make_client(laravel, store_path)
    with client:
        response = client.post(
            route, json={"prompt": "what is this", "images": [PHOTO, NOT_A_PHOTO], "request_id": ID}, headers=bearer("good")
        )
    assert response.status_code == 422
    assert laravel.counted == []
    assert generator.seen == []


@pytest.mark.parametrize("route", ["/api/query", "/api/query/stream"])
def test_too_many_photos_are_refused_and_not_counted(route, store_path):
    # Breaks if: the per-question photo limit is only checked after the photos were counted against the day's uploads.
    laravel = FakeLaravel()
    client, generator = make_client(laravel, store_path, image_max_count=2)
    with client:
        response = client.post(
            route, json={"prompt": "what is this", "images": [PHOTO, PHOTO, PHOTO], "request_id": ID}, headers=bearer("good")
        )
    assert response.status_code == 422
    assert laravel.counted == []
    assert generator.seen == []


def test_a_photo_over_the_size_limit_is_refused_and_not_counted(store_path):
    # Breaks if: the size limit is only applied after the photo was counted.
    laravel = FakeLaravel()
    client, generator = make_client(laravel, store_path, image_max_mb=0.00001)
    with client:
        response = client.post("/api/query", json={"prompt": "what is this", "images": [PHOTO], "request_id": ID}, headers=bearer("good"))
    assert response.status_code == 413
    assert laravel.counted == []
    assert generator.seen == []


def test_the_photos_counted_are_the_ones_that_were_checked(store_path):
    # Breaks if: the number reported to the plan comes from the body's own claim instead of the photos that decoded.
    laravel = FakeLaravel()
    client, _ = make_client(laravel, store_path)
    with client:
        response = client.post(
            "/api/query", json={"prompt": "what is this", "images": [PHOTO, PHOTO, PHOTO], "request_id": ID}, headers=bearer("good")
        )
    assert response.status_code not in (402, 422, 503)
    assert laravel.bodies[0]["uploads"] == 3


@pytest.mark.parametrize("count_status", [404, 500, 422])
def test_when_the_api_cannot_count_photos_they_are_not_let_through(count_status, store_path):
    # Breaks if: a broken or unreachable quota API lets photos past the plan (Free has none) while questions go ahead.
    laravel = FakeLaravel(count_status=count_status)
    client, generator = make_client(laravel, store_path)
    with client:
        response = client.post("/api/query", json={"prompt": "what is this", "images": [PHOTO], "request_id": ID}, headers=bearer("good"))
    assert response.status_code == 503
    assert generator.seen == []


@pytest.mark.parametrize("count_status", [401, 403])
def test_a_revoked_or_suspended_students_photo_request_is_denied_not_treated_as_an_outage(count_status, store_path):
    # Breaks if: the API's own "no" about this token (401 revoked, or 403 -- EnsureNotSuspended deletes the token and
    # answers 403 from this same endpoint) is treated the same as a genuine outage, so it answers 503 (try again) instead
    # of 401 (sign in again).
    laravel = FakeLaravel(count_status=count_status)
    client, generator = make_client(laravel, store_path)
    with client:
        response = client.post("/api/query", json={"prompt": "what is this", "images": [PHOTO], "request_id": ID}, headers=bearer("good"))
    assert response.status_code == 401
    assert generator.seen == []


def test_when_the_api_is_unreachable_photos_are_not_let_through(store_path):
    client, generator = make_client(quota_down, store_path)
    with client:
        response = client.post("/api/query/stream", json={"prompt": "what is this", "images": [PHOTO], "request_id": ID}, headers=bearer("good"))
    assert response.status_code == 503
    assert generator.seen == []


def test_a_later_round_with_more_photos_is_reported_again(store_path):
    # Breaks if: a question is first sent with no photos and the photos are added in a later round under the same id, which
    # would get them past the plan because the id was already known.
    laravel = FakeLaravel()
    client, _ = make_client(laravel, store_path)
    with client:
        client.post("/api/query/stream", json={"prompt": "hi", "request_id": ID}, headers=bearer("good"))
        client.post("/api/query/stream", json={"prompt": "hi", "images": [PHOTO, PHOTO], "request_id": ID}, headers=bearer("good"))
        client.post("/api/query/stream", json={"prompt": "hi", "images": [PHOTO], "request_id": ID}, headers=bearer("good"))
    assert [b.get("uploads", 0) for b in laravel.bodies] == [0, 2]


def test_one_id_cannot_be_reused_for_endless_answers(store_path):
    # Breaks if: recognising the rounds of one answer lets a single id carry any number of questions.
    laravel = FakeLaravel()
    client, generator = make_client(laravel, store_path)
    with client:
        statuses = [
            client.post("/api/query/stream", json={"prompt": "hi", "request_id": ID}, headers=bearer("good")).status_code
            for _ in range(12)
        ]
    assert statuses[:9] == [200] * 9
    assert statuses[9:] == [429] * 3
    assert len(generator.seen) == 9
    assert len(laravel.counted) == 1


def test_a_refused_question_is_not_remembered_as_counted(store_path):
    # Breaks if: a refusal is remembered, so asking again with the same id slips through without asking the API.
    laravel = FakeLaravel(refuse=True)
    client, generator = make_client(laravel, store_path)
    with client:
        first = client.post("/api/query/stream", json={"prompt": "hi", "request_id": ID}, headers=bearer("good"))
        second = client.post("/api/query/stream", json={"prompt": "hi", "request_id": ID}, headers=bearer("good"))
    assert first.status_code == second.status_code == 402
    assert len(laravel.counted) == 2
    assert generator.seen == []


# --- a student cannot get a free pass by making the quota API fail or throttle them ------------------------------------


@pytest.mark.parametrize("route", ["/api/query", "/api/query/stream"])
def test_a_student_the_quota_api_is_throttling_is_refused_not_let_through(route, store_path):
    # Breaks if: flooding the Laravel API until it answers 429 lets the student ask without being counted.
    laravel = FakeLaravel(count_status=429)
    client, generator = make_client(laravel, store_path)
    with client:
        response = client.post(route, json={"prompt": "hi", "request_id": ID}, headers=bearer("good"))
    assert response.status_code == 429
    assert "Retry-After" in response.headers
    assert generator.seen == []


def test_the_client_reports_a_throttled_student_as_busy_not_as_unsure():
    def api(request: httpx.Request) -> httpx.Response:
        return httpx.Response(429, json={"message": "Too Many Attempts."}, headers={"Retry-After": "42"})

    async def run() -> None:
        quota = LaravelQuota(CONSUME_URL, client=httpx.AsyncClient(transport=httpx.MockTransport(api)))
        with pytest.raises(QuotaBusy) as busy:
            await quota.consume("good", ID)
        assert busy.value.retry_after == 42

    asyncio.run(run())


@pytest.mark.parametrize("status_code", [401, 403])
def test_the_client_reports_a_refused_token_as_denied_not_as_unsure(status_code):
    def api(request: httpx.Request) -> httpx.Response:
        return httpx.Response(status_code, json={"message": "nope"})

    async def run() -> None:
        quota = LaravelQuota(CONSUME_URL, client=httpx.AsyncClient(transport=httpx.MockTransport(api)))
        with pytest.raises(QuotaDenied):
            await quota.consume("good", ID)

    asyncio.run(run())


def test_while_the_quota_api_is_down_a_student_gets_only_a_temporary_daily_allowance(store_path):
    # Breaks if: an outage (or an API made to fail) is an unlimited free pass for plain questions.
    client, generator = make_client(FakeLaravel(count_status=500), store_path, outage_ai_per_student_daily=2)
    with client:
        statuses = [
            client.post("/api/query/stream", json={"prompt": "hi", "request_id": f"question-0000000{n}"}, headers=bearer("good")).status_code
            for n in range(4)
        ]
        # The rounds of a question already allowed are not counted again.
        again = client.post("/api/query/stream", json={"prompt": "hi", "request_id": "question-00000000"}, headers=bearer("good"))
    assert statuses == [200, 200, 503, 503]
    assert again.status_code == 200
    assert len(generator.seen) == 3


def test_a_request_body_over_the_limit_is_refused_before_it_is_read(store_path):
    # Breaks if: a signed-in student can make the server read a body of any size.
    client, generator = make_client(FakeLaravel(), store_path, max_upload_mb=1, image_max_mb=1.0, image_max_count=1)
    with client:
        response = client.post("/api/query", content=b"x" * (5 * 1024 * 1024), headers={**bearer("good"), "content-type": "application/json"})
    assert response.status_code == 413
    assert generator.seen == []
