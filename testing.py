"""End-to-end API tests: schema validation, ingestion and grounded querying.

Run with:  uv run pytest
These tests use the offline hashing embedder, so no model download or API
key is needed.
"""
from __future__ import annotations

import json
import time
from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from pydantic import SecretStr

from schemas import (
    DeleteDocumentResponse,
    DocumentListResponse,
    HealthResponse,
    IngestJob,
    IngestResponse,
    QueryRequest,
    QueryResponse,
    QueryStreamDone,
    QueryStreamError,
    QueryStreamImages,
    QueryStreamMeta,
)
from src.api import GeneratedAnswer, LLMError, create_app
from src.config import Settings
from src.tests.test_pipeline import FakeGeminiClient, make_pdf
from src.vectorstore import EmbeddingMismatchError

LIMITS_NOTE = (
    "# លីមីតនៃអនុគមន៍\n\n"
    "លីមីតសំខាន់៖ $\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1$ ។\n\n"
    "ទម្រង់មិនកំណត់ $\\frac{0}{0}$ ត្រូវដោះស្រាយដោយកត្តាដាក់ជាកត្តា ឬវិធាន L'Hôpital ។"
)
DERIVATIVE_NOTE = (
    "Derivatives\n\n"
    "The product rule states $$(uv)' = u'v + uv'$$ for differentiable functions.\n"
    "The derivative of $x^n$ is $n x^{n-1}$."
)


def make_settings(store_path: Path, **overrides) -> Settings:
    values = dict(
        embedding_backend="hashing",
        hashing_dim=1024,
        llm_provider="none",
        vector_store_path=store_path,
        frontend_dist_dir=store_path.parent / "no-frontend-build",
        khmer_segmenter="regex",
        score_threshold=0.05,
        top_k=5,
        max_upload_mb=1,
        chunk_size=500,
        chunk_overlap=50,
        ocr_mode="never",
        preload_kiri=False,
        image_ocr_engines="groq",  # no key in tests, so no real image OCR
    )
    values.update(overrides)
    return Settings(_env_file=None, **values)


class RecordingGenerator:
    provider = "anthropic"
    model = "test-model"

    def __init__(self, error: LLMError | None = None) -> None:
        self.calls: list[dict] = []
        self.error = error

    async def generate(self, **kwargs) -> GeneratedAnswer:
        self.calls.append(kwargs)
        if self.error is not None:
            raise self.error
        return GeneratedAnswer(
            text="ចម្លើយ៖ $$\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1$$ [1]",
            stop_reason="end_turn",
            model=self.model,
        )


@pytest.fixture(autouse=True)
def _isolated_environment(monkeypatch):
    """Keep exported shell variables from leaking into test settings."""
    for name in (
        "LLM_PROVIDER", "ANTHROPIC_API_KEY", "GEMINI_API_KEY", "GOOGLE_API_KEY", "GROQ_API_KEY",
        "GEMINI_MODEL", "GEMINI_FALLBACK_MODELS", "LLM_FALLBACK",
        "EMBEDDING_BACKEND", "EMBEDDING_MODEL", "EMBED_MODEL", "VECTOR_STORE_PATH", "OCR_MODE",
        "OCR_ENGINE",
    ):
        monkeypatch.delenv(name, raising=False)


@pytest.fixture
def store_path(tmp_path: Path) -> Path:
    return tmp_path / "index"


@pytest.fixture
def client(store_path: Path) -> Iterator[TestClient]:
    with TestClient(create_app(make_settings(store_path))) as test_client:
        yield test_client


def ingest_text(client: TestClient, name: str, text: str, **extra) -> IngestResponse:
    response = client.post("/api/ingest/text", json={"text": text, "source_name": name, **extra})
    assert response.status_code == 200, response.text
    return IngestResponse.model_validate(response.json())


# ---------------------------------------------------------------------------
# System endpoints
# ---------------------------------------------------------------------------

def test_health_matches_schema(client):
    response = client.get("/health")
    assert response.status_code == 200
    health = HealthResponse.model_validate(response.json())
    assert health.status == "ok"
    assert health.embedding_model == "hashing-1024"
    assert health.llm_provider == "none" and health.llm_model is None
    assert (health.documents, health.chunks) == (0, 0)
    assert health.default_top_k == 5
    assert health.ocr_enabled is False and health.ocr_model is None and health.ocr_engine is None
    assert health.max_upload_mb == 1


def test_root_without_frontend_build_points_to_dev_server(client):
    page = client.get("/")
    assert page.status_code == 200
    assert page.json()["docs"] == "/docs"


def test_built_frontend_is_served_without_shadowing_api(store_path, tmp_path):
    dist = tmp_path / "dist"
    (dist / "assets").mkdir(parents=True)
    (dist / "index.html").write_text("<div id=root></div>", encoding="utf-8")
    (dist / "assets" / "app.js").write_text("console.log(1)", encoding="utf-8")
    with TestClient(create_app(make_settings(store_path, frontend_dist_dir=dist))) as client:
        assert "id=root" in client.get("/").text
        assert client.get("/assets/app.js").status_code == 200
        assert client.get("/health").json()["status"] == "ok"
        assert client.post("/api/query", json={"prompt": "x", "generate": False}).status_code == 200


def test_cors_allows_vite_dev_server(client):
    response = client.options(
        "/api/query",
        headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "POST"},
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"


def test_openapi_documents_query_contract(client):
    schema = client.get("/openapi.json").json()
    assert {"/api/query", "/api/ingest", "/api/ingest/text", "/health"} <= set(schema["paths"])
    query_schema = schema["components"]["schemas"]["QueryRequest"]
    assert "required" not in query_schema  # a prompt, an image, or both
    assert {"prompt", "images", "top_k", "score_threshold"} <= set(query_schema["properties"])


# ---------------------------------------------------------------------------
# /api/query validation
# ---------------------------------------------------------------------------

@pytest.mark.parametrize(
    "payload",
    [
        {},
        {"prompt": ""},
        {"prompt": "   "},
        {},
        {"prompt": "", "images": []},
        {"images": [{"data": "x"}]},
        {"prompt": "hi", "images": [{"data": "a" * 20, "mime_type": "image/gif"}]},
        {"prompt": "x" * 4001},
        {"prompt": "hi", "top_k": 0},
        {"prompt": "hi", "top_k": 51},
        {"prompt": "hi", "score_threshold": -0.1},
        {"prompt": "hi", "score_threshold": 1.5},
        {"prompt": "hi", "unexpected": True},
        {"prompt": "hi", "history": [{"role": "system", "content": "x"}]},
        {"prompt": "hi", "history": [{"role": "user", "content": ""}]},
    ],
)
def test_query_rejects_invalid_payloads(client, payload):
    response = client.post("/api/query", json=payload)
    assert response.status_code == 422
    assert isinstance(response.json()["detail"], list)


def test_query_request_model_defaults():
    request = QueryRequest(prompt="  hello  ")
    assert request.prompt == "hello"
    assert request.top_k is None and request.score_threshold is None
    assert request.history == [] and request.generate is True


def test_query_on_empty_index_is_ungrounded(client):
    response = client.post("/api/query", json={"prompt": "តើលីមីតជាអ្វី?"})
    assert response.status_code == 200
    result = QueryResponse.model_validate(response.json())
    assert result.grounded is False
    assert result.sources == []
    assert result.language == "km"
    assert result.provider == "none"
    assert "LLM" in result.answer


# ---------------------------------------------------------------------------
# Ingestion + retrieval
# ---------------------------------------------------------------------------

def test_ingest_text_then_query_returns_intact_latex(client):
    limits = ingest_text(client, "limits.md", LIMITS_NOTE)
    assert limits.chunks_added >= 1
    assert limits.formulas_protected == 2
    assert limits.total_chunks == limits.chunks_added
    ingest_text(client, "derivatives.txt", DERIVATIVE_NOTE, format="text")

    response = client.post("/api/query", json={"prompt": "What is the product rule for derivatives?", "top_k": 1})
    assert response.status_code == 200
    result = QueryResponse.model_validate(response.json())
    assert result.language == "en"
    assert result.grounded is True
    assert len(result.sources) == 1
    top = result.sources[0]
    assert top.source == "derivatives.txt"
    assert "$$(uv)' = u'v + uv'$$" in top.text
    assert "\u27e6" not in top.text and "\u200b" not in top.text
    assert "$$(uv)' = u'v + uv'$$" in result.answer
    assert result.latency_ms >= 0

    khmer = client.post("/api/query", json={"prompt": "គណនាលីមីត sin x លើ x"}).json()
    assert khmer["language"] == "km"
    assert khmer["sources"][0]["source"] == "limits.md"
    assert "$\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1$" in khmer["sources"][0]["text"]


def test_query_respects_threshold_generate_flag_and_source_filter(client):
    ingest_text(client, "limits.md", LIMITS_NOTE)
    ingest_text(client, "derivatives.md", DERIVATIVE_NOTE)

    strict = client.post("/api/query", json={"prompt": "product rule", "score_threshold": 1.0}).json()
    assert strict["grounded"] is False and strict["sources"] == []

    retrieval_only = client.post("/api/query", json={"prompt": "product rule", "generate": False}).json()
    assert retrieval_only["answer"] == ""
    assert retrieval_only["sources"]

    filtered = client.post(
        "/api/query", json={"prompt": "product rule", "sources": ["limits.md"], "score_threshold": 0.0}
    ).json()
    assert {source["source"] for source in filtered["sources"]} == {"limits.md"}


@pytest.mark.parametrize(
    ("filename", "content", "expected_format"),
    [
        ("notes.md", LIMITS_NOTE.encode("utf-8"), "markdown"),
        ("notes.txt", DERIVATIVE_NOTE.encode("utf-8"), "text"),
        ("calculus.pdf", make_pdf(["The derivative of sin x is cos x", "Integration by parts"]), "pdf"),
    ],
)
def test_ingest_file_upload(client, filename, content, expected_format):
    response = client.post("/api/ingest", files={"file": (filename, content, "application/octet-stream")})
    assert response.status_code == 200, response.text
    result = IngestResponse.model_validate(response.json())
    assert result.source == filename
    assert result.format == expected_format
    assert result.chunks_added >= 1
    if expected_format == "pdf":
        assert result.pages == 2
        sources = client.post("/api/query", json={"prompt": "derivative of sin", "top_k": 1}).json()["sources"]
        assert sources[0]["page"] == 1


def wait_for_job(client: TestClient, job_id: str, timeout: float = 30.0) -> IngestJob:
    deadline = time.monotonic() + timeout
    while True:
        response = client.get(f"/api/ingest/jobs/{job_id}")
        assert response.status_code == 200, response.text
        job = IngestJob.model_validate(response.json())
        if job.status in ("succeeded", "failed") or time.monotonic() > deadline:
            return job
        time.sleep(0.05)


def test_background_ingest_job_indexes_file(client):
    response = client.post(
        "/api/ingest",
        files={"file": ("limits.md", LIMITS_NOTE.encode("utf-8"), "text/markdown")},
        data={"background": "true"},
    )
    assert response.status_code == 202, response.text
    job = IngestJob.model_validate(response.json())
    assert job.source == "limits.md" and job.status in ("queued", "running")

    finished = wait_for_job(client, job.job_id)
    assert finished.status == "succeeded", finished.error
    assert finished.result.chunks_added >= 1 and finished.result.formulas_protected == 2
    assert finished.finished_at is not None
    assert [j.job_id for j in map(IngestJob.model_validate, client.get("/api/ingest/jobs").json())] == [job.job_id]

    answer = QueryResponse.model_validate(
        client.post("/api/query", json={"prompt": "លីមីត sin x", "score_threshold": 0.0}).json()
    )
    assert "$\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1$" in answer.sources[0].text


def test_background_ingest_job_reports_failure(client):
    response = client.post(
        "/api/ingest",
        files={"file": ("broken.pdf", b"%PDF-1.4 not really", "application/pdf")},
        data={"background": "true"},
    )
    assert response.status_code == 202
    finished = wait_for_job(client, response.json()["job_id"])
    assert finished.status == "failed"
    assert finished.error_status == 422 and finished.error
    assert client.get("/api/ingest/jobs/does-not-exist").status_code == 404


def test_ingest_form_text_and_custom_source_name(client):
    response = client.post(
        "/api/ingest", data={"text": DERIVATIVE_NOTE, "source_name": "../../etc/derivs.md"}
    )
    assert response.status_code == 200, response.text
    assert response.json()["source"] == "derivs.md"


def test_ingest_rejects_bad_requests(client):
    assert client.post("/api/ingest").status_code == 400
    both = client.post(
        "/api/ingest",
        data={"text": "hello"},
        files={"file": ("a.md", b"hello", "text/markdown")},
    )
    assert both.status_code == 400

    unsupported = client.post("/api/ingest", files={"file": ("slides.pptx", b"x", "application/octet-stream")})
    assert unsupported.status_code == 415

    too_large = client.post(
        "/api/ingest", files={"file": ("big.txt", b"a " * (600 * 1024), "text/plain")}
    )
    assert too_large.status_code == 413

    empty = client.post("/api/ingest", files={"file": ("empty.md", b"", "text/markdown")})
    assert empty.status_code == 400

    scanned = client.post("/api/ingest", files={"file": ("scan.pdf", make_pdf([""]), "application/pdf")})
    assert scanned.status_code == 422
    assert "text layer" in scanned.json()["detail"]

    corrupt = client.post("/api/ingest", files={"file": ("bad.pdf", b"%PDF-1.4 garbage", "application/pdf")})
    assert corrupt.status_code == 422

    blank = client.post("/api/ingest/text", json={"text": "   ", "source_name": "x.md"})
    assert blank.status_code == 422
    bad_name = client.post("/api/ingest/text", json={"text": "hello", "source_name": "a<b>.md"})
    assert bad_name.status_code == 422


def test_reingest_replaces_or_conflicts(client):
    first = ingest_text(client, "limits.md", LIMITS_NOTE)
    second = ingest_text(client, "limits.md", LIMITS_NOTE)
    assert second.chunks_replaced == first.chunks_added
    assert second.total_chunks == first.total_chunks

    conflict = client.post(
        "/api/ingest/text", json={"text": LIMITS_NOTE, "source_name": "limits.md", "replace": False}
    )
    assert conflict.status_code == 409


def test_list_and_delete_documents(client):
    ingest_text(client, "limits.md", LIMITS_NOTE)
    ingest_text(client, "sub/derivatives.md", DERIVATIVE_NOTE)

    listing = DocumentListResponse.model_validate(client.get("/api/documents").json())
    assert [doc.source for doc in listing.documents] == ["derivatives.md", "limits.md"]
    assert listing.total_chunks == sum(doc.chunks for doc in listing.documents)

    deleted = client.delete("/api/documents/limits.md")
    assert deleted.status_code == 200
    result = DeleteDocumentResponse.model_validate(deleted.json())
    assert result.chunks_removed >= 1
    assert result.total_chunks == listing.total_chunks - result.chunks_removed
    assert client.delete("/api/documents/limits.md").status_code == 404
    assert client.get("/health").json()["documents"] == 1


def test_index_persists_across_restarts(store_path):
    settings = make_settings(store_path)
    with TestClient(create_app(settings)) as first:
        ingest_text(first, "limits.md", LIMITS_NOTE)
        chunks = first.get("/health").json()["chunks"]

    with TestClient(create_app(settings)) as second:
        assert second.get("/health").json()["chunks"] == chunks
        sources = second.post("/api/query", json={"prompt": "លីមីត sin x"}).json()["sources"]
        assert sources and sources[0]["source"] == "limits.md"

    with pytest.raises(EmbeddingMismatchError):
        with TestClient(create_app(make_settings(store_path, hashing_dim=512))):
            pass


# ---------------------------------------------------------------------------
# Generation wiring
# ---------------------------------------------------------------------------

def test_generator_receives_grounded_prompt(store_path):
    generator = RecordingGenerator()
    with TestClient(create_app(make_settings(store_path), generator=generator)) as client:
        ingest_text(client, "limits.md", LIMITS_NOTE)
        history = [
            {"role": "assistant", "content": "សួស្តី"},
            {"role": "user", "content": "ជំរាបសួរ"},
            {"role": "assistant", "content": "តើខ្ញុំអាចជួយអ្វីបាន?"},
        ]
        response = client.post("/api/query", json={"prompt": "គណនាលីមីត sin x លើ x", "history": history})
        assert response.status_code == 200, response.text
        result = QueryResponse.model_validate(response.json())

    assert result.provider == "anthropic"
    assert result.model == "test-model"
    assert result.stop_reason == "end_turn"
    call = generator.calls[0]
    assert call["language"] == "km"
    assert len(call["history"]) == 3
    assert "Output rules" in call["system"]
    message = call["user_message"]
    assert message.startswith("<context>")
    assert '<passage id="1" source="limits.md"' in message
    assert "\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1" in message
    assert "<question>\nគណនាលីមីត sin x លើ x\n</question>" in message
    assert message.endswith("<response_language>km</response_language>")
    assert [chunk.source for chunk in call["chunks"]] == ["limits.md"]


def test_generator_without_context_gets_no_context_note(store_path):
    generator = RecordingGenerator()
    with TestClient(create_app(make_settings(store_path), generator=generator)) as client:
        client.post("/api/query", json={"prompt": "Explain eigenvalues"})
    message = generator.calls[0]["user_message"]
    assert "<context>\n</context>" in message
    assert "<note>" in message
    assert message.endswith("<response_language>en</response_language>")


@pytest.mark.parametrize("status_code", [429, 502, 503])
def test_llm_errors_are_mapped_to_http_errors(store_path, status_code):
    generator = RecordingGenerator(error=LLMError(status_code, "upstream problem"))
    with TestClient(create_app(make_settings(store_path), generator=generator)) as client:
        response = client.post("/api/query", json={"prompt": "hello"})
    assert response.status_code == status_code
    assert response.json() == {"detail": "upstream problem"}


class StreamingGenerator(RecordingGenerator):
    """Streams the answer in pieces, optionally failing after the first one."""

    pieces = ["ចម្លើយ៖ ", "$$\\lim_{x \\to 0} ", "\\frac{\\sin x}{x} = 1$$", " [1]"]

    async def stream(self, **kwargs):
        self.calls.append(kwargs)
        for number, piece in enumerate(self.pieces):
            if self.error is not None and number == 1:
                raise self.error
            yield piece
        yield GeneratedAnswer(text="".join(self.pieces), stop_reason="end_turn", model=self.model)


def read_stream(response, include_status: bool = False) -> list[dict]:
    assert response.status_code == 200, response.text
    assert response.headers["content-type"].startswith("application/x-ndjson")
    events = [json.loads(line) for line in response.text.splitlines() if line.strip()]
    return events if include_status else [e for e in events if e["type"] != "status"]


def test_query_stream_sends_meta_deltas_and_done(store_path):
    generator = StreamingGenerator()
    with TestClient(create_app(make_settings(store_path), generator=generator)) as client:
        ingest_text(client, "limits.md", LIMITS_NOTE)
        events = read_stream(client.post("/api/query/stream", json={"prompt": "លីមីត sin x"}))

    assert [event["type"] for event in events] == ["meta"] + ["delta"] * 4 + ["done"]
    meta = QueryStreamMeta.model_validate(events[0])
    assert meta.grounded and meta.language == "km" and meta.provider == "anthropic"
    assert "\\frac{\\sin x}{x}" in meta.sources[0].text
    assert "".join(event["text"] for event in events[1:-1]) == "".join(StreamingGenerator.pieces)
    done = QueryStreamDone.model_validate(events[-1])
    assert done.stop_reason == "end_turn" and done.model == "test-model" and done.latency_ms >= 0
    assert "<context>" in generator.calls[0]["user_message"]


def test_query_stream_falls_back_to_generate(store_path):
    generator = RecordingGenerator()  # no stream() method
    with TestClient(create_app(make_settings(store_path), generator=generator)) as client:
        events = read_stream(client.post("/api/query/stream", json={"prompt": "hello"}))
    assert [event["type"] for event in events] == ["meta", "delta", "done"]
    assert events[1]["text"].startswith("ចម្លើយ")
    assert events[0]["grounded"] is False


def test_query_stream_without_llm_and_without_generation(client):
    ingest_text(client, "derivatives.md", DERIVATIVE_NOTE)
    events = read_stream(client.post("/api/query/stream", json={"prompt": "product rule derivative"}))
    assert [event["type"] for event in events] == ["meta", "delta", "done"]
    assert "$$(uv)' = u'v + uv'$$" in events[1]["text"]
    assert events[-1]["stop_reason"] == "extractive"

    events = read_stream(client.post("/api/query/stream", json={"prompt": "product rule", "generate": False}))
    assert [event["type"] for event in events] == ["meta", "done"]


def test_query_stream_reports_llm_errors_in_band(store_path):
    generator = StreamingGenerator(error=LLMError(503, "upstream busy"))
    with TestClient(create_app(make_settings(store_path), generator=generator)) as client:
        events = read_stream(client.post("/api/query/stream", json={"prompt": "hello"}))
        assert client.post("/api/query/stream", json={"prompt": ""}).status_code == 422
    assert [event["type"] for event in events] == ["meta", "delta", "error"]
    assert QueryStreamError.model_validate(events[-1]) == QueryStreamError(status=503, detail="upstream busy")


def test_settings_validation_and_provider_resolution(tmp_path):
    with pytest.raises(ValueError):
        make_settings(tmp_path, chunk_size=100, chunk_overlap=100)
    assert make_settings(tmp_path, llm_provider="auto").resolved_llm_provider == "none"
    assert (
        make_settings(tmp_path, llm_provider="auto", gemini_api_key="g").resolved_llm_provider == "gemini"
    )
    assert (
        make_settings(tmp_path, llm_provider="auto", gemini_api_key="g", anthropic_api_key="a").resolved_llm_provider
        == "anthropic"
    )
    assert make_settings(tmp_path, anthropic_api_key="  ").anthropic_api_key is None
    relative = make_settings(tmp_path, vector_store_path="storage/x")
    assert relative.vector_store_path.is_absolute()


def test_scanned_pdf_upload_is_ocr_transcribed(store_path, tmp_path):
    from src.ingestion.ocr import GeminiPageOCR

    client = FakeGeminiClient(["ដេរីវេនៃ $\\sin x$ គឺ $\\cos x$ ។"])
    ocr = GeminiPageOCR("key", "gemini-test", client=client, cache_dir=tmp_path / "ocr")
    with TestClient(create_app(make_settings(store_path), ocr=ocr)) as client_app:
        health = client_app.get("/health").json()
        assert (health["ocr_engine"], health["ocr_model"]) == ("gemini", "gemini-test")
        response = client_app.post(
            "/api/ingest", files={"file": ("scan.pdf", make_pdf([""]), "application/pdf")}
        )
        assert response.status_code == 200, response.text
        result = IngestResponse.model_validate(response.json())
        assert result.ocr_pages == 1 and result.formulas_protected == 2 and result.warnings == []

        sources = client_app.post("/api/query", json={"prompt": "ដេរីវេនៃ sin x"}).json()["sources"]
        assert sources[0]["page"] == 1
        assert "$\\cos x$" in sources[0]["text"]


def test_image_upload_is_ocr_transcribed_by_kiri(store_path, tmp_path):
    from src.ingestion.khmer_ocr import KiriPageOCR

    class FakeKiri:
        def __init__(self, **options):
            pass

        def process_document(self, image_path, mode="lines"):
            return [
                {"box": [0, 0, 100, 20], "text": "ដេរីវេនៃអនុគមន៍ f(x)", "confidence": 0.9},
                {"box": [0, 40, 100, 20], "text": "គឺជាលីមីត ។", "confidence": 0.9},
            ]

    ocr = KiriPageOCR(engine_factory=FakeKiri, cache_dir=tmp_path / "ocr")
    with TestClient(create_app(make_settings(store_path), ocr=ocr)) as client_app:
        health = client_app.get("/health").json()
        assert (health["ocr_enabled"], health["ocr_engine"]) == (True, "kiri")

        response = client_app.post(
            "/api/ingest", files={"file": ("lesson.png", b"\x89PNG image", "image/png")}
        )
        assert response.status_code == 200, response.text
        result = IngestResponse.model_validate(response.json())
        assert (result.format, result.pages, result.ocr_pages) == ("image", 1, 1)

        sources = client_app.post("/api/query", json={"prompt": "ដេរីវេនៃអនុគមន៍"}).json()["sources"]
        assert sources[0]["source"] == "lesson.png"
        assert sources[0]["text"] == "ដេរីវេនៃអនុគមន៍\nគឺជាលីមីត ។"


def test_image_upload_without_ocr_is_rejected(client):
    response = client.post("/api/ingest", files={"file": ("photo.jpg", b"jpeg bytes", "image/jpeg")})
    assert response.status_code == 422
    assert "Image uploads need OCR" in response.json()["detail"]


def test_system_prompt_asks_for_geogebra_figures():
    from prompts import SYSTEM_PROMPT

    assert "```geogebra" in SYSTEM_PROMPT and "geogebra-3d" in SYSTEM_PROMPT
    assert "ZoomIn(<xmin>, <ymin>, <xmax>, <ymax>)" in SYSTEM_PROMPT
    assert "Execute" in SYSTEM_PROMPT  # listed among the forbidden script commands
    assert "U+200B" in SYSTEM_PROMPT and "\u200b" not in SYSTEM_PROMPT


# ---------------------------------------------------------------------------
# Provider streaming, against the real SDKs with mocked HTTP
# ---------------------------------------------------------------------------

def _sse(events: list[tuple[str | None, dict | str]]) -> bytes:
    lines = []
    for name, data in events:
        if name:
            lines.append(f"event: {name}")
        lines.append(f"data: {data if isinstance(data, str) else json.dumps(data)}")
        lines.append("")
    return ("\n".join(lines) + "\n").encode("utf-8")


def _mock_http(body: bytes, status_code: int = 200, module: str = "httpx"):
    import importlib

    httpx = importlib.import_module(module)  # the Anthropic SDK uses httpx2

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(status_code, headers={"content-type": "text/event-stream"}, content=body)

    return httpx.AsyncClient(transport=httpx.MockTransport(handler))


async def _collect(generator) -> list:
    return [
        item
        async for item in generator.stream(
            system="sys", history=[], user_message="q", chunks=[], language="en"
        )
    ]


def _run(coro):
    import asyncio

    return asyncio.run(coro)


def test_anthropic_stream_yields_text_and_final_answer():
    import anthropic

    from src.api import AnthropicGenerator

    message = {
        "id": "msg_1", "type": "message", "role": "assistant", "model": "claude-opus-5",
        "content": [], "stop_reason": None, "stop_sequence": None,
        "usage": {"input_tokens": 5, "output_tokens": 0},
    }
    body = _sse([
        ("message_start", {"type": "message_start", "message": message}),
        ("content_block_start", {"type": "content_block_start", "index": 0,
                                 "content_block": {"type": "text", "text": ""}}),
        ("content_block_delta", {"type": "content_block_delta", "index": 0,
                                 "delta": {"type": "text_delta", "text": "The limit is "}}),
        ("content_block_delta", {"type": "content_block_delta", "index": 0,
                                 "delta": {"type": "text_delta", "text": "$1$."}}),
        ("content_block_stop", {"type": "content_block_stop", "index": 0}),
        ("message_delta", {"type": "message_delta", "delta": {"stop_reason": "end_turn", "stop_sequence": None},
                           "usage": {"output_tokens": 6}}),
        ("message_stop", {"type": "message_stop"}),
    ])
    generator = AnthropicGenerator(
        "key", "claude-opus-5", max_tokens=100, timeout=5, effort="high", use_fallbacks=True
    )
    generator._client = anthropic.AsyncAnthropic(api_key="key", http_client=_mock_http(body, module="httpx2"))
    items = _run(_collect(generator))
    assert items[:-1] == ["The limit is ", "$1$."]
    assert items[-1] == GeneratedAnswer(text="The limit is $1$.", stop_reason="end_turn", model="claude-opus-5")

    generator._client = anthropic.AsyncAnthropic(
        api_key="key", max_retries=0,
        http_client=_mock_http(b'{"type":"error","error":{"type":"overloaded_error","message":"busy"}}', 529, "httpx2"),
    )
    with pytest.raises(LLMError) as error:
        _run(_collect(generator))
    assert error.value.status_code in (502, 503)


def test_groq_stream_yields_text_and_final_answer():
    import groq

    from src.api import GroqGenerator

    def chunk(content, finish=None):
        return {
            "id": "c1", "object": "chat.completion.chunk", "created": 1, "model": "openai/gpt-oss-120b",
            "choices": [{"index": 0, "delta": {"content": content}, "finish_reason": finish}],
        }

    body = _sse([(None, chunk("ចម្លើយ ")), (None, chunk("$x^2$")), (None, chunk(None, "stop")), (None, "[DONE]")])
    generator = GroqGenerator("key", "openai/gpt-oss-120b", max_tokens=100, timeout=5, temperature=0.2)
    generator._client = groq.AsyncGroq(api_key="key", http_client=_mock_http(body))
    items = _run(_collect(generator))
    assert items[:-1] == ["ចម្លើយ ", "$x^2$"]
    assert items[-1] == GeneratedAnswer(text="ចម្លើយ $x^2$", stop_reason="stop", model="openai/gpt-oss-120b")

    generator._client = groq.AsyncGroq(
        api_key="key", max_retries=0,
        http_client=_mock_http(b'{"error":{"message":"bad key"}}', 401),
    )
    with pytest.raises(LLMError) as error:
        _run(_collect(generator))
    assert error.value.status_code == 502 and "GROQ_API_KEY" in error.value.detail


def test_groq_waits_only_for_short_rate_limits():
    import groq
    import httpx

    from src.api import GroqGenerator

    ok = _sse([(None, {
        "id": "c1", "object": "chat.completion.chunk", "created": 1, "model": "m",
        "choices": [{"index": 0, "delta": {"content": "hi"}, "finish_reason": "stop"}],
    }), (None, "[DONE]")])

    def client(retry_after: str):
        calls = []

        def handler(request):
            calls.append(request)
            if len(calls) == 1:
                return httpx.Response(429, headers={"retry-after": retry_after},
                                      json={"error": {"message": "TPM"}})
            return httpx.Response(200, headers={"content-type": "text/event-stream"}, content=ok)

        http = httpx.AsyncClient(transport=httpx.MockTransport(handler))
        return groq.AsyncGroq(api_key="key", max_retries=0, http_client=http), calls

    generator = GroqGenerator("gsk_x", "m", max_tokens=100, timeout=5, temperature=0.2, max_retry_wait=1)
    generator._client, calls = client("0.01")
    assert _run(_collect(generator))[-1].text == "hi" and len(calls) == 2

    generator._client, calls = client("30")
    with pytest.raises(LLMError) as error:
        _run(_collect(generator))
    assert error.value.status_code == 429 and "retry in 30 s" in error.value.detail and len(calls) == 1


def test_sea_lion_stream_yields_text_and_maps_errors():
    import openai

    from src.api import SeaLionGenerator

    def chunk(content, finish=None):
        return {
            "id": "c1", "object": "chat.completion.chunk", "created": 1, "model": "sea-lion-test",
            "choices": [{"index": 0, "delta": {"content": content}, "finish_reason": finish}],
        }

    body = _sse([(None, chunk("លីមីតគឺ ")), (None, chunk("$1$")), (None, chunk(None, "stop")), (None, "[DONE]")])

    def generator(http):
        gen = SeaLionGenerator(
            "key", "sea-lion-test", base_url="https://api.sea-lion.ai/v1",
            max_tokens=100, timeout=5, temperature=0.2,
        )
        gen._client = openai.AsyncOpenAI(
            api_key="key", base_url="https://api.sea-lion.ai/v1", max_retries=0, http_client=http
        )
        return gen

    items = _run(_collect(generator(_mock_http(body))))
    assert items[:-1] == ["លីមីតគឺ ", "$1$"]
    assert items[-1] == GeneratedAnswer(text="លីមីតគឺ $1$", stop_reason="stop", model="sea-lion-test")

    # A bad key names the setting to fix, not the SDK's own wording.
    with pytest.raises(LLMError) as error:
        _run(_collect(generator(_mock_http(b'{"error":{"message":"bad key"}}', 401))))
    assert error.value.status_code == 502 and "SEA_LION_API_KEY" in error.value.detail

    # A wrong model id says which setting picked it.
    with pytest.raises(LLMError) as error:
        _run(_collect(generator(_mock_http(b'{"error":{"message":"no such model"}}', 404))))
    assert error.value.status_code == 502 and "SEA_LION_MODEL" in error.value.detail


def test_sea_lion_needs_a_model_id(tmp_path):
    from src.api import _provider_generators, build_generator

    settings = make_settings(tmp_path / "index.npz").model_copy(
        update={"sea_lion_api_key": SecretStr("key"), "sea_lion_model": "", "llm_provider": "sea-lion"}
    )
    assert _provider_generators(settings, "sea-lion") == []
    with pytest.raises(RuntimeError, match="SEA_LION_API_KEY and SEA_LION_MODEL"):
        build_generator(settings)

    with_model = settings.model_copy(update={"sea_lion_model": "sea-lion-test"})
    assert [g.provider for g in _provider_generators(with_model, "sea-lion")] == ["sea-lion"]


def test_gemini_stream_yields_text_and_maps_errors():
    from google.genai import errors, types

    from src.api import GeminiGenerator

    def response(text, finish=None):
        return types.GenerateContentResponse(candidates=[types.Candidate(
            content=types.Content(role="model", parts=[types.Part(text=text)]), finish_reason=finish,
        )])

    class FakeModels:
        def __init__(self, outcome):
            self.outcome = outcome

        async def generate_content_stream(self, **kwargs):
            assert kwargs["config"].system_instruction == "sys"
            if isinstance(self.outcome, Exception):
                raise self.outcome

            async def chunks():
                for item in self.outcome:
                    yield item
            return chunks()

    class FakeClient:
        def __init__(self, outcome):
            self.aio = type("Aio", (), {"models": FakeModels(outcome)})()

    generator = GeminiGenerator("key", "gemini-test", max_tokens=100, timeout=5, temperature=0.2)
    generator._client = FakeClient([response("$$a^2$$ "), response("done", "STOP")])
    items = _run(_collect(generator))
    assert items[:-1] == ["$$a^2$$ ", "done"]
    assert items[-1] == GeneratedAnswer(text="$$a^2$$ done", stop_reason="STOP", model="gemini-test")

    busy = errors.ServerError(503, {"error": {"code": 503, "message": "high demand", "status": "UNAVAILABLE"}})
    generator._client = FakeClient(busy)
    with pytest.raises(LLMError) as error:
        _run(_collect(generator))
    assert error.value.status_code == 503 and "high demand" in error.value.detail

    generator._client = FakeClient([response("", "SAFETY")])
    with pytest.raises(LLMError) as error:
        _run(_collect(generator))
    assert error.value.status_code == 422


# ---------------------------------------------------------------------------
# Fallback across models and providers
# ---------------------------------------------------------------------------

class FlakyGenerator(StreamingGenerator):
    def __init__(self, provider: str, model: str, error: LLMError | None = None, fail_after_first: bool = False):
        super().__init__(error=None)
        self.provider, self.model = provider, model
        self.failure, self.fail_after_first = error, fail_after_first

    async def generate(self, **kwargs) -> GeneratedAnswer:
        self.calls.append(kwargs)
        if self.failure is not None:
            raise self.failure
        return GeneratedAnswer(text=f"answer from {self.model}", stop_reason="stop", model=self.model)

    async def stream(self, **kwargs):
        self.calls.append(kwargs)
        if self.failure is not None and not self.fail_after_first:
            raise self.failure
        yield f"partial from {self.model}"
        if self.failure is not None:
            raise self.failure
        yield GeneratedAnswer(text=f"partial from {self.model}", stop_reason="stop", model=self.model)


def _fallback(*candidates):
    from src.api import FallbackGenerator

    return FallbackGenerator(list(candidates))


def test_fallback_generator_moves_past_failing_models(store_path):
    busy = FlakyGenerator("groq", "openai/gpt-oss-120b", LLMError(503, "busy"))
    backup = FlakyGenerator("gemini", "gemini-3.5-flash")
    generator = _fallback(busy, backup)
    assert generator.chain == ["groq:openai/gpt-oss-120b", "gemini:gemini-3.5-flash"]
    with TestClient(create_app(make_settings(store_path), generator=generator)) as client:
        answer = QueryResponse.model_validate(client.post("/api/query", json={"prompt": "hi"}).json())
        assert (answer.answer, answer.provider, answer.model) == (
            "answer from gemini-3.5-flash", "gemini", "gemini-3.5-flash"
        )
        events = read_stream(client.post("/api/query/stream", json={"prompt": "hi"}))
        assert [e["type"] for e in events] == ["meta", "delta", "done"]
        assert events[0]["provider"] == "groq"  # the first choice, announced before generating
        assert events[-1]["provider"] == "gemini" and events[-1]["model"] == "gemini-3.5-flash"
        health = client.get("/health").json()
        assert health["llm_chain"] == generator.chain
    assert len(busy.calls) == 2 and len(backup.calls) == 2


def test_fallback_generator_answers_with_passages_when_everything_fails(store_path):
    generator = _fallback(
        FlakyGenerator("groq", "m1", LLMError(502, "Groq rejected the API key")),
        FlakyGenerator("gemini", "m2", LLMError(503, "Gemini is temporarily unavailable")),
    )
    with TestClient(create_app(make_settings(store_path), generator=generator)) as client:
        ingest_text(client, "derivatives.md", DERIVATIVE_NOTE)
        answer = QueryResponse.model_validate(
            client.post("/api/query", json={"prompt": "product rule derivative"}).json()
        )
        assert answer.provider == "none" and answer.stop_reason == "llm_unavailable"
        assert "temporarily unavailable" in answer.answer and "$$(uv)' = u'v + uv'$$" in answer.answer

        events = read_stream(client.post("/api/query/stream", json={"prompt": "product rule derivative"}))
        assert [e["type"] for e in events] == ["meta", "delta", "done"]
        assert events[-1]["provider"] == "none" and events[-1]["stop_reason"] == "llm_unavailable"

        km = client.post("/api/query", json={"prompt": "សួស្តី", "score_threshold": 0.99}).json()
        assert km["sources"] == [] and "គ្រូ AI" in km["answer"]


def test_fallback_generator_does_not_retry_refusals_or_started_streams(store_path):
    refusing = FlakyGenerator("groq", "m1", LLMError(422, "declined"))
    backup = FlakyGenerator("gemini", "m2")
    with TestClient(create_app(make_settings(store_path), generator=_fallback(refusing, backup))) as client:
        assert client.post("/api/query", json={"prompt": "hi"}).status_code == 422
    assert backup.calls == []



def test_fallback_restarts_a_stream_that_fails_midway(store_path):
    dropping = FlakyGenerator("groq", "m1", LLMError(503, "dropped"), fail_after_first=True)
    backup = FlakyGenerator("gemini", "m2")
    with TestClient(create_app(make_settings(store_path), generator=_fallback(dropping, backup))) as client:
        events = read_stream(client.post("/api/query/stream", json={"prompt": "hi"}))
    assert [e["type"] for e in events] == ["meta", "delta", "reset", "delta", "done"]
    assert events[1]["text"] == "partial from m1" and events[2]["detail"] == "dropped"
    assert events[3]["text"] == "partial from m2"
    assert (events[-1]["provider"], events[-1]["model"]) == ("gemini", "m2")


class DegenerateGenerator(FlakyGenerator):
    """Mimics gpt-oss looping on zero-width spaces after a normal start."""

    async def stream(self, **kwargs):
        yield "ដេរីវេ\u200b\u200b\u200bនៃ $x^2$ "
        for _ in range(50):
            yield "\u200b" * 10
        yield GeneratedAnswer(text="unused", stop_reason="stop", model=self.model)

    async def generate(self, **kwargs):
        return GeneratedAnswer(text="ok" + "\u200b" * 500, stop_reason="stop", model=self.model)


def test_output_guard_collapses_and_rejects_invisible_runs(store_path):
    from src.api import MAX_INVISIBLE_RUN, OutputGuard

    guard = OutputGuard("m")
    assert guard.feed("ក\u200b\u200b\u200bខ") == "ក\u200bខ"
    assert guard.feed("\u200b") + guard.feed("\u200b") == "\u200b"  # runs span deltas
    with pytest.raises(LLMError):
        OutputGuard("m").feed("\u200b" * (MAX_INVISIBLE_RUN + 1))

    looping = DegenerateGenerator("groq", "gpt-oss")
    backup = FlakyGenerator("gemini", "m2")
    with TestClient(create_app(make_settings(store_path), generator=_fallback(looping, backup))) as client:
        events = read_stream(client.post("/api/query/stream", json={"prompt": "hi"}))
        # The first zero-width space of the loop is legitimate and passes through.
        assert [e["type"] for e in events] == ["meta", "delta", "delta", "reset", "delta", "done"]
        assert events[1]["text"] == "ដេរីវេ\u200bនៃ $x^2$ " and events[2]["text"] == "\u200b"
        assert "degenerate" in events[3]["detail"]
        assert events[-1]["model"] == "m2"

        answer = client.post("/api/query", json={"prompt": "hi"}).json()
        assert answer["model"] == "m2"  # the looping generate() answer was rejected too

    # Without fallback the guard still cleans the stream and reports the failure.
    with TestClient(create_app(make_settings(store_path), generator=DegenerateGenerator("groq", "gpt-oss"))) as client:
        events = read_stream(client.post("/api/query/stream", json={"prompt": "hi"}))
    assert [e["type"] for e in events][-1] == "error"
    assert all(e["text"].count("\u200b") <= 1 for e in events if e["type"] == "delta")


def test_groq_completion_budget_fits_tokens_per_minute():
    from src.api import GroqGenerator

    generator = GroqGenerator("gsk_x", "openai/gpt-oss-120b", max_tokens=3000, timeout=5,
                              temperature=0.2, tokens_per_minute=8000)
    short = [{"role": "system", "content": "a" * 3000}, {"role": "user", "content": "ក" * 100}]
    assert generator._completion_budget(short) == 3000
    long = [{"role": "system", "content": "a" * 6000}, {"role": "user", "content": "ក" * 4000}]
    budget = generator._completion_budget(long)
    assert 256 <= budget < 3000
    assert budget + GroqGenerator.estimate_tokens(long) <= 8000
    assert generator._completion_budget([{"role": "user", "content": "ក" * 8000}]) is None
    with pytest.raises(LLMError) as error:
        generator._request("s", [], "ក" * 8000)
    assert error.value.status_code == 413
    generator.tokens_per_minute = 0
    assert generator._completion_budget(long) == 3000


def test_misplaced_groq_key_is_ignored(tmp_path):
    copied = make_settings(tmp_path, gemini_api_key="AQ.same", groq_api_key="AQ.same", llm_provider="auto")
    assert copied.groq_api_key is None and "copy of GEMINI_API_KEY" in copied.config_warnings[0]
    assert copied.resolved_llm_provider == "gemini"

    wrong = make_settings(tmp_path, groq_api_key="not-a-groq-key")
    assert wrong.groq_api_key is None and "gsk_" in wrong.config_warnings[0]

    valid = make_settings(tmp_path, groq_api_key="gsk_test", llm_provider="auto")
    assert valid.groq_api_key is not None and valid.config_warnings == []
    assert valid.resolved_llm_provider == "groq"

    with TestClient(create_app(copied, generator=RecordingGenerator())) as client:
        assert client.get("/health").json()["config_warnings"] == copied.config_warnings


def test_build_generator_orders_fallback_chain(tmp_path):
    from src.api import ExtractiveGenerator, GroqGenerator, build_generator

    settings = make_settings(
        tmp_path, llm_provider="groq", groq_api_key="gsk_test", gemini_api_key="AQ.test",
        gemini_model="gemini-3.6-flash",
        gemini_fallback_models="gemini-3.8-flash, gemini-3.6-flash ,gemini-3.5-flash",
    )
    assert build_generator(settings).chain == [
        "groq:openai/gpt-oss-120b", "gemini:gemini-3.6-flash",
        "gemini:gemini-3.8-flash", "gemini:gemini-3.5-flash",
    ]
    assert isinstance(build_generator(settings.model_copy(update={"llm_fallback": False})), GroqGenerator)
    assert isinstance(build_generator(make_settings(tmp_path)), ExtractiveGenerator)
    with pytest.raises(RuntimeError):
        build_generator(make_settings(tmp_path, llm_provider="groq"))


# ---------------------------------------------------------------------------
# Questions with attached images
# ---------------------------------------------------------------------------

def _png(size=(40, 20), mode="RGB", color="white") -> bytes:
    import io as _io

    from PIL import Image

    buffer = _io.BytesIO()
    Image.new(mode, size, color).save(buffer, format="PNG")
    return buffer.getvalue()


def _b64(data: bytes) -> str:
    import base64

    return base64.b64encode(data).decode("ascii")


class FakeImageEngine:
    """A CachedPageOCR stand-in that records calls and can wait or fail."""

    def __init__(self, engine, model, text="", error=None, delay=0.0, barrier=None):
        self.engine, self.model = engine, model
        self.text, self.error, self.delay, self.barrier = text, error, delay, barrier
        self.calls = 0

    def transcribe_page(self, payload):
        self.calls += 1
        if self.barrier is not None:
            self.barrier.wait(timeout=5)  # proves the engines run at the same time
        if self.delay:
            time.sleep(self.delay)
        if self.error is not None:
            raise self.error
        return self.text, False

    def warmup(self):
        self.warmed = True


def _hybrid(khmer=None, vision=(), timeout=10.0):
    from src.ingestion.image_ocr import HybridImageOCR

    return HybridImageOCR(khmer=khmer, vision=list(vision), timeout=timeout)


def test_prepare_image_rotates_flattens_and_shrinks():
    import io as _io

    from PIL import Image

    from src.ingestion.image_ocr import ImageInputError, decode_image, prepare_image

    # A 300x100 photo tagged "rotate 90°" (EXIF orientation 6) comes out upright.
    photo = Image.new("RGB", (300, 100), "white")
    exif = photo.getexif()
    exif[0x0112] = 6
    buffer = _io.BytesIO()
    photo.save(buffer, format="JPEG", exif=exif)
    upright = prepare_image(buffer.getvalue(), max_side=2000)
    assert upright.mime_type == "image/jpeg"
    assert Image.open(_io.BytesIO(upright.data)).size == (100, 300)

    shrunk = Image.open(_io.BytesIO(prepare_image(_png((4000, 1000), "RGBA", (0, 0, 0, 0)), 1000).data))
    assert shrunk.size == (1000, 250) and shrunk.mode == "RGB"
    assert shrunk.getpixel((10, 10)) == (255, 255, 255)  # transparency becomes white paper

    assert decode_image("data:image/png;base64," + _b64(_png()), 10**6, 2000).mime_type == "image/jpeg"
    with pytest.raises(ImageInputError, match="not a readable image"):
        decode_image(_b64(b"definitely not an image"), 10**6, 2000)
    with pytest.raises(ImageInputError, match="base64"):
        decode_image("!!!!" * 8, 10**6, 2000)
    with pytest.raises(ImageInputError, match="limit"):
        decode_image("A" * 4000, 100, 2000)


def test_hybrid_ocr_runs_engines_in_parallel_and_falls_back():
    import threading

    from src.ingestion.ocr import OCRError, PageImage

    barrier = threading.Barrier(2)
    khmer = FakeImageEngine("kiri", "kiri-model", text="កំណត់ចំនួនពិត", barrier=barrier)
    busy = FakeImageEngine("groq", "qwen", error=OCRError("429 rate limited"))
    backup = FakeImageEngine("gemini", "flash", text="$x^2+ax+b=0$", barrier=barrier)
    ocr = _hybrid(khmer, [busy, backup])
    assert ocr.engines == ["kiri:kiri-model", "groq:qwen", "gemini:flash"]

    started = time.perf_counter()
    [reading] = ocr.read([PageImage(b"img", "image/jpeg")])
    assert time.perf_counter() - started < 5  # the barrier would time out if they ran in turn
    assert (reading.vision_text, reading.vision_engine) == ("$x^2+ax+b=0$", "gemini:flash")
    assert (reading.khmer_text, reading.khmer_engine) == ("កំណត់ចំនួនពិត", "kiri:kiri-model")
    assert reading.warnings == ["groq:qwen: 429 rate limited"]
    assert reading.search_text == "$x^2+ax+b=0$"
    assert "Khmer OCR: កំណត់ចំនួនពិត" in reading.summary

    # Several images are read concurrently too.
    many = _hybrid(None, [FakeImageEngine("groq", "qwen", text="t", delay=0.3)])
    started = time.perf_counter()
    readings = many.read([PageImage(b"a", "image/jpeg")] * 3)
    assert [r.index for r in readings] == [1, 2, 3] and time.perf_counter() - started < 0.8


def test_hybrid_ocr_survives_failures_and_timeouts():
    from src.ingestion.ocr import OCRError, PageImage

    failing = _hybrid(
        FakeImageEngine("kiri", "k", error=OCRError("model missing")),
        [FakeImageEngine("groq", "q", error=OCRError("down"))],
    )
    [reading] = failing.read([PageImage(b"x", "image/jpeg")])
    assert not reading.has_text and len(reading.warnings) == 2

    slow = _hybrid(FakeImageEngine("kiri", "k", text="ok"), [FakeImageEngine("groq", "q", text="late", delay=2)], timeout=0.3)
    started = time.perf_counter()
    [reading] = slow.read([PageImage(b"x", "image/jpeg")])
    assert time.perf_counter() - started < 1.5  # does not wait for the slow engine
    assert reading.khmer_text == "ok" and reading.vision_text is None
    assert reading.warnings == ["OCR timed out"]

    with pytest.raises(ValueError):
        _hybrid(None, [])


def test_groq_vision_ocr_sends_image_and_caches(tmp_path):
    import httpx

    from src.ingestion.image_ocr import GroqVisionOCR
    from src.ingestion.ocr import OCRError, PageImage

    requests = []

    def handler(request):
        requests.append(json.loads(request.content))
        return httpx.Response(200, json={
            "id": "x", "object": "chat.completion", "created": 1, "model": "qwen/qwen3.8-27b",
            "choices": [{"index": 0, "finish_reason": "stop",
                         "message": {"role": "assistant", "content": "```\n$\\lim_{x \\to 0} x$\n```"}}],
        })

    import groq

    client = groq.Groq(api_key="gsk_x", max_retries=0, http_client=httpx.Client(transport=httpx.MockTransport(handler)))
    ocr = GroqVisionOCR("gsk_x", "qwen/qwen3.8-27b", cache_dir=tmp_path, client=client)
    page = PageImage(b"jpeg-bytes", "image/jpeg")
    assert ocr.transcribe_page(page) == ("$\\lim_{x \\to 0} x$", False)
    assert ocr.transcribe_page(page)[0] == "$\\lim_{x \\to 0} x$"
    assert len(requests) == 1  # second read came from the cache
    body = requests[0]
    assert body["model"] == "qwen/qwen3.8-27b" and body["max_completion_tokens"] == 1000
    assert body["frequency_penalty"] == 0.4 and body["temperature"] == 0.0
    image_part = body["messages"][0]["content"][1]
    assert image_part["image_url"]["url"].startswith("data:image/jpeg;base64,")

    def limited(request):
        return httpx.Response(429, json={"error": {"message": "OTPM"}})

    ocr._client = groq.Groq(api_key="gsk_x", max_retries=0, http_client=httpx.Client(transport=httpx.MockTransport(limited)))
    with pytest.raises(OCRError, match="429"):
        ocr.transcribe_page(PageImage(b"other", "image/jpeg"))


def test_build_image_ocr_follows_settings(tmp_path):
    from src.ingestion.image_ocr import GroqVisionOCR, QuestionGeminiOCR, build_image_ocr

    settings = make_settings(tmp_path, image_ocr_engines="kiri, gemini ,groq",
                             groq_api_key="gsk_x", gemini_api_key="AQ.x")
    ocr = build_image_ocr(settings)
    assert ocr.engines[0].startswith("kiri:")
    assert [type(engine) for engine in ocr.vision] == [QuestionGeminiOCR, GroqVisionOCR]
    assert build_image_ocr(make_settings(tmp_path, image_ocr_engines="groq")) is None  # no key
    with pytest.raises(ValueError):
        make_settings(tmp_path, image_ocr_engines="kiri,tesseract").image_ocr_engine_list


def _image_client(store_path, generator, **engines):
    ocr = _hybrid(
        engines.get("khmer", FakeImageEngine("kiri", "kiri", text="កំណត់ចំនួនពិត a និង b")),
        engines.get("vision", [FakeImageEngine("groq", "qwen", text="Find $a$ and $b$ if $x^2+ax+b=0$")]),
    )
    return TestClient(create_app(make_settings(store_path), generator=generator, image_ocr=ocr))


def test_stream_question_with_image(store_path):
    generator = StreamingGenerator()
    with _image_client(store_path, generator) as client:
        ingest_text(client, "limits.md", LIMITS_NOTE)
        response = client.post("/api/query/stream", json={
            "prompt": "", "images": [{"data": _b64(_png()), "mime_type": "image/png", "name": "hw.png"}],
        })
        events = read_stream(response, include_status=True)

    kinds = [e["type"] for e in events]
    assert kinds[:4] == ["status", "images", "status", "meta"]
    assert [e["stage"] for e in events if e["type"] == "status"] == ["reading_images", "searching", "generating"]
    assert kinds[-1] == "done"
    image = QueryStreamImages.model_validate(events[1]).images[0]
    assert image.vision_engine == "groq:qwen" and image.khmer_engine == "kiri:kiri"
    assert "x^2+ax+b=0" in image.text and "កំណត់ចំនួនពិត" in image.text

    message = generator.calls[0]["user_message"]
    assert '<image id="1">' in message and "<vision_reading engine=\"groq:qwen\">" in message
    assert "<khmer_ocr engine=\"kiri:kiri\">" in message
    assert "សូមជួយពន្យល់" in message  # an image-only question gets a default question
    assert generator.calls[0]["language"] == "km"  # detected from the Khmer OCR text


def test_query_with_image_and_text_uses_image_for_retrieval(store_path):
    generator = RecordingGenerator()
    vision = [FakeImageEngine("groq", "qwen", text="The product rule $(uv)' = u'v + uv'$ derivative")]
    with _image_client(store_path, generator, vision=vision, khmer=None) as client:
        ingest_text(client, "derivatives.md", DERIVATIVE_NOTE)
        ingest_text(client, "limits.md", LIMITS_NOTE)
        answer = QueryResponse.model_validate(client.post("/api/query", json={
            "prompt": "Explain this", "score_threshold": 0.05,
            "images": [{"data": _b64(_png())}],
        }).json())
    assert answer.sources and answer.sources[0].source == "derivatives.md"
    assert answer.images[0].vision_engine == "groq:qwen" and answer.images[0].khmer_text is None
    assert answer.language == "en"
    assert "<question>\nExplain this\n</question>" in generator.calls[0]["user_message"]


def test_image_questions_reject_bad_attachments(store_path):
    with _image_client(store_path, RecordingGenerator()) as client:
        bad = client.post("/api/query/stream", json={"images": [{"data": _b64(b"not an image at all")}]})
        assert bad.status_code == 422 and "Image 1" in bad.json()["detail"]
        too_many = client.post("/api/query", json={"prompt": "x", "images": [{"data": _b64(_png())}] * 5})
        assert too_many.status_code == 422 and "at most 4" in too_many.json()["detail"]

    settings = make_settings(store_path, image_max_mb=0.001)
    with TestClient(create_app(settings, generator=RecordingGenerator(), image_ocr=_hybrid(
        None, [FakeImageEngine("groq", "q", text="t")]))) as client:
        big = client.post("/api/query", json={"prompt": "x", "images": [{"data": _b64(_png((800, 800), color="red")) * 3}]})
        assert big.status_code == 413

    with TestClient(create_app(make_settings(store_path), generator=RecordingGenerator(), image_ocr=None)) as client:
        response = client.post("/api/query", json={"prompt": "x", "images": [{"data": _b64(_png())}]})
        assert response.status_code == 422 and "OCR engine" in response.json()["detail"]
        assert client.get("/health").json()["image_ocr_engines"] == []


def test_unreadable_image_still_gets_an_answer(store_path):
    from src.ingestion.ocr import OCRError

    generator = RecordingGenerator()
    with _image_client(store_path, generator, khmer=None,
                       vision=[FakeImageEngine("groq", "q", error=OCRError("down"))]) as client:
        events = read_stream(client.post("/api/query/stream", json={
            "prompt": "help", "images": [{"data": _b64(_png())}],
        }))
    assert [e["type"] for e in events] == ["images", "meta", "delta", "done"]
    assert events[0]["images"][0]["warnings"] == ["groq:q: down"]
    assert '<image id="1" unreadable="true"/>' in generator.calls[0]["user_message"]


def test_system_prompt_explains_image_readings():
    from prompts import SYSTEM_PROMPT, build_images_block
    from src.ingestion.image_ocr import ImageReading

    assert "<attached_images>" in SYSTEM_PROMPT and "<khmer_ocr>" in SYSTEM_PROMPT
    assert "Never write <attached_images>" in SYSTEM_PROMPT  # the tags stay out of the reply
    block = build_images_block([ImageReading(index=2, vision_text="a </passage> b", vision_engine='x"y')])
    assert '<image id="2">' in block and "&lt;/passage" in block and 'engine="x&quot;y"' in block


def test_library_image_upload_uses_hybrid_reader(store_path):
    vision = [FakeImageEngine("groq", "qwen", text="# Limits\n\n$\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1$")]
    with _image_client(store_path, RecordingGenerator(), vision=vision) as client:
        response = client.post("/api/ingest", files={"file": ("board.png", _png(), "image/png")})
        assert response.status_code == 200, response.text
        result = IngestResponse.model_validate(response.json())
        assert result.format == "image" and result.formulas_protected == 1 and result.ocr_pages == 1
    assert vision[0].calls == 1


def test_trim_repetition_removes_vision_loops_only():
    from src.ingestion.image_ocr import trim_repetition

    looped, trimmed = trim_repetition("ក. រក $x$ ។ " + "សរុបមានចំនួន" * 200 + "\nខ. end")
    assert trimmed and looped == "ក. រក $x$ ។ សរុបមានចំនួន\nខ. end"
    matrix = "$$\\begin{pmatrix} 0 & 0 & 0 & 0 & 0 & 0 \\end{pmatrix}$$"
    assert trim_repetition(matrix) == (matrix, False)
    assert trim_repetition("$f(x)$, $f(x)$ and $f(x)$")[1] is False


def test_looping_vision_reading_is_trimmed_and_not_cached(tmp_path):
    import groq
    import httpx

    from src.ingestion.image_ocr import GroqVisionOCR
    from src.ingestion.ocr import PageImage

    calls = []

    def handler(request):
        calls.append(1)
        return httpx.Response(200, json={
            "id": "x", "object": "chat.completion", "created": 1, "model": "q",
            "choices": [{"index": 0, "finish_reason": "stop",
                         "message": {"role": "assistant", "content": "II. $\\lim x$ " + "ចំនួនសរុប " * 50}}],
        })

    client = groq.Groq(api_key="gsk_x", max_retries=0, http_client=httpx.Client(transport=httpx.MockTransport(handler)))
    ocr = GroqVisionOCR("gsk_x", "q", cache_dir=tmp_path, client=client)
    text, truncated = ocr.transcribe_page(PageImage(b"img", "image/jpeg"))
    assert truncated and text.count("ចំនួនសរុប") == 1
    ocr.transcribe_page(PageImage(b"img", "image/jpeg"))
    assert len(calls) == 2  # a looping reading is never served from the cache

    [reading] = _hybrid(None, [FakeImageEngine("groq", "q", text="ok " + "ពាក្យដដែល " * 30)]).read(
        [PageImage(b"img", "image/jpeg")]
    )
    assert reading.vision_text.count("ពាក្យដដែល") == 1
    assert reading.warnings == ["groq:q: the reading may be incomplete"]


def test_groq_skips_when_answer_budget_would_be_too_small():
    from src.api import GroqGenerator

    generator = GroqGenerator("gsk_x", "m", max_tokens=3000, timeout=5, temperature=0.2,
                              tokens_per_minute=8000, min_completion_tokens=1500)
    fits = [{"role": "user", "content": "ក" * 4500}]
    assert generator._completion_budget(fits) >= 1500
    assert generator._completion_budget([{"role": "user", "content": "ក" * 6000}]) is None
    with pytest.raises(LLMError) as error:
        generator._request("s", [], "ក" * 6000)
    assert error.value.status_code == 413 and "too little room" in error.value.detail


def test_groq_shrinks_history_then_passages_to_fit():
    from schemas import ChatTurn
    from src.api import GroqGenerator
    from src.retrieval.retriever import RetrievedChunk

    generator = GroqGenerator("gsk_x", "m", max_tokens=3000, timeout=5, temperature=0.2,
                              tokens_per_minute=8000, min_completion_tokens=1500)
    chunks = [RetrievedChunk(id=str(i), source="s", chunk_index=i, page=None, score=1 - i / 10, text="ក" * 1500)
              for i in range(4)]
    build = lambda kept: "Q " + " ".join(c.text for c in kept)  # noqa: E731
    history = [ChatTurn(role="user", content="ខ" * 1500), ChatTurn(role="assistant", content="គ" * 1500)]

    request = generator._request("s", history, build(chunks), chunks, build)
    sent = request["messages"]
    assert [m["role"] for m in sent] == ["system", "user"]  # both old turns dropped
    assert sent[-1]["content"].count("ក" * 1500) == 3  # the lowest-ranked passage dropped
    assert request["max_completion_tokens"] >= 1500

    small = generator._request("s", history, build(chunks[:1]), chunks[:1], build)
    assert len(small["messages"]) == 4  # fits without shrinking


def test_image_readings_are_clipped_in_the_prompt():
    from prompts import MAX_IMAGE_READING_CHARS, build_images_block
    from src.ingestion.image_ocr import ImageReading

    block = build_images_block([ImageReading(index=1, vision_text="x" * 10000, khmer_text="ក" * 10000)])
    assert block.count("x") < MAX_IMAGE_READING_CHARS + 50 and block.count("[…]") == 2
