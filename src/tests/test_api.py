"""The HTTP surface: what the browser actually receives from /api/query/stream."""
from __future__ import annotations

import json
from typing import AsyncIterator

import pytest
from fastapi.testclient import TestClient

from src.api import GeneratedAnswer, create_app
from src.config import Settings


class ScriptedGenerator:
    """Streams a fixed answer, so a test measures the endpoint and not a model."""

    provider = "gemini"

    def __init__(self, deltas: list[str], stop_reason: str | None = "end_turn") -> None:
        self.deltas = deltas
        self.stop_reason = stop_reason
        self.model = "scripted"
        self.seen: list[dict] = []

    async def generate(self, **kwargs) -> GeneratedAnswer:
        self.seen.append(kwargs)
        return GeneratedAnswer(
            text="".join(self.deltas), stop_reason=self.stop_reason, model=self.model
        )

    async def stream(self, **kwargs) -> AsyncIterator[object]:
        self.seen.append(kwargs)
        for delta in self.deltas:
            yield delta
        yield GeneratedAnswer(
            text="".join(self.deltas), stop_reason=self.stop_reason, model=self.model
        )


@pytest.fixture
def store_path(tmp_path):
    """An empty index: these tests are about the endpoint, not about retrieval."""
    return tmp_path / "vector_index"


def client(generator: ScriptedGenerator, store_path) -> TestClient:
    settings = Settings(
        _env_file=None,
        embedding_backend="hashing",
        llm_provider="none",
        vector_store_path=store_path,
    )
    return TestClient(create_app(settings, generator=generator))


def events(response) -> list[dict]:
    return [json.loads(line) for line in response.text.splitlines() if line.strip()]


def final_answer(sent: list[dict]) -> str:
    """What the client ends up showing: the repaired text, or the deltas it already has."""
    done = sent[-1]
    return done["answer"] or "".join(e["text"] for e in sent if e["type"] == "delta")


def ask(store_path, generator: ScriptedGenerator, **body) -> list[dict]:
    with client(generator, store_path) as c:
        response = c.post("/api/query/stream", json={"prompt": "រកលីមីត", **body})
        assert response.status_code == 200, response.text
        return events(response)


class TestStreaming:
    def test_the_answer_arrives_as_deltas_between_meta_and_done(self, store_path):
        sent = ask(store_path, ScriptedGenerator(["ជំហាន ១ ", "គឺ ", "$x=1$"]))
        kinds = [event["type"] for event in sent]
        assert kinds.index("meta") < kinds.index("delta") < kinds.index("done")
        assert sent[-1]["type"] == "done"
        assert "".join(e["text"] for e in sent if e["type"] == "delta") == "ជំហាន ១ គឺ $x=1$"

    def test_done_reports_time_to_first_token(self, store_path):
        done = ask(store_path, ScriptedGenerator(["a", "b"]))[-1]
        assert done["first_token_ms"] is not None
        assert 0 <= done["first_token_ms"] <= done["latency_ms"]

    def test_no_first_token_is_reported_when_nothing_streamed(self, store_path):
        done = ask(store_path, ScriptedGenerator([]))[-1]
        assert done["first_token_ms"] is None

    def test_the_stop_reason_reaches_the_client(self, store_path):
        """The client asks the model to carry on when it ran out of room."""
        done = ask(store_path, ScriptedGenerator(["half an answer"], stop_reason="max_tokens"))[-1]
        assert done["stop_reason"] == "max_tokens"

    def test_a_repaired_answer_is_sent_once_at_the_end(self, store_path):
        """Deltas cannot carry a fix that needs the whole answer."""
        done = ask(store_path, ScriptedGenerator(["The definition is\n\n", "\\lim_{x \\to a} f(x)=L"]))[-1]
        assert done["answer"] is not None
        assert "$$\n\\lim_{x \\to a} f(x)=L\n$$" in done["answer"]

    def test_an_answer_needing_no_repair_sends_no_replacement(self, store_path):
        done = ask(store_path, ScriptedGenerator(["គេបាន $x=1$ ដូច្នេះ"]))[-1]
        assert done["answer"] is None

    def test_a_continuing_round_keeps_its_block_open(self, store_path):
        """continues_math says the round carries on the block the last one stopped inside."""
        opening = ask(store_path, ScriptedGenerator(["$$\nA = \\frac{1}"], stop_reason="max_tokens"))
        assert final_answer(opening).count("$$") == 1, "the next round closes the block itself"

        rest = ask(
            store_path,
            ScriptedGenerator(["{2}\n$$\n\nដូច្នេះ $A$ តូច។"]),
            continues_math=True,
        )
        assert not final_answer(rest).lstrip().startswith("$$"), "the opening fence is the last round's"
        joined = final_answer(opening) + final_answer(rest)
        assert "A = \\frac{1}{2}" in joined, "the split formula rejoins across the rounds"


class TestRequestValidation:
    def test_a_question_is_required(self, store_path):
        with client(ScriptedGenerator(["x"]), store_path) as c:
            assert c.post("/api/query/stream", json={"prompt": ""}).status_code == 422

    def test_an_unknown_field_is_refused(self, store_path):
        with client(ScriptedGenerator(["x"]), store_path) as c:
            assert c.post(
                "/api/query/stream", json={"prompt": "hi", "continues_maths": True}
            ).status_code == 422


class TestProviderRequests:
    """Cerebras, OpenRouter and SEA-LION borrow GroqGenerator._request, so a
    parameter added for Groq must not break them."""

    @staticmethod
    def _built(cls, **extra):
        return cls("key", "some-model", max_tokens=1000, timeout=30.0,
                   temperature=0.2, **extra)._request("system", [], "hello")

    def test_groq_sends_its_reasoning_effort(self):
        from src.api import GroqGenerator
        assert self._built(GroqGenerator, reasoning_effort="low")["reasoning_effort"] == "low"

    def test_groq_sends_nothing_when_it_is_blank(self):
        from src.api import GroqGenerator
        assert "reasoning_effort" not in self._built(GroqGenerator, reasoning_effort="")

    @pytest.mark.parametrize("name", ["CerebrasGenerator", "OpenRouterGenerator", "SeaLionGenerator"])
    def test_the_openai_compatible_providers_build_a_request(self, name):
        import src.api as api
        request = self._built(getattr(api, name), base_url="https://example.invalid/v1")
        assert request["model"] == "some-model"
        assert "reasoning_effort" not in request, "that parameter is Groq's"


class TestReadOnlyServer:
    """ALLOW_WRITES=false is what a public deployment runs with: the index every
    student searches is built where the corpus is, not through the open API."""

    @staticmethod
    def _client(store_path, *, allow_writes: bool) -> TestClient:
        settings = Settings(
            _env_file=None,
            embedding_backend="hashing",
            llm_provider="none",
            vector_store_path=store_path,
            allow_writes=allow_writes,
        )
        return TestClient(create_app(settings, generator=ScriptedGenerator(["ok"])))

    def test_ingest_is_refused(self, store_path):
        client = self._client(store_path, allow_writes=False)
        response = client.post(
            "/api/ingest", files={"file": ("notes.md", b"# Notes\n\nSome text.", "text/markdown")}
        )
        assert response.status_code == 403
        assert "read-only" in response.json()["detail"]

    def test_pasted_text_is_refused_too(self, store_path):
        client = self._client(store_path, allow_writes=False)
        response = client.post(
            "/api/ingest/text", json={"text": "Some text.", "source_name": "notes.md"}
        )
        assert response.status_code == 403

    def test_deleting_a_document_is_refused(self, store_path):
        client = self._client(store_path, allow_writes=False)
        assert client.delete("/api/documents/anything.pdf").status_code == 403

    def test_reading_still_works(self, store_path):
        """The refusal is about changing the index, not about using it."""
        with self._client(store_path, allow_writes=False) as c:
            assert c.get("/api/documents").status_code == 200
            health = c.get("/health")
            assert health.status_code == 200
            assert health.json()["writes_enabled"] is False

    def test_answering_still_works(self, store_path):
        """A student asking a question must not be caught by the write lock."""
        with self._client(store_path, allow_writes=False) as c:
            assert c.post("/api/query", json={"prompt": "តើលីមីតជាអ្វី?"}).status_code == 200

    def test_writes_are_allowed_by_default(self, store_path):
        """Local development, and the machine that builds the index, keep both."""
        with self._client(store_path, allow_writes=True) as c:
            response = c.post(
                "/api/ingest", files={"file": ("notes.md", b"# Notes\n\nSome text.", "text/markdown")}
            )
            assert response.status_code == 200, response.text
            assert c.get("/health").json()["writes_enabled"] is True
