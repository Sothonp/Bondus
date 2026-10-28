"""The model chain: falling through failures, cooldowns, language routes, the
all-busy note, the answer cache, rejected keys and the per-IP limit."""
from __future__ import annotations

import asyncio
import json

import pytest
from fastapi.testclient import TestClient

import src.api as api
from prompts import ALL_MODELS_BUSY
from src.api import (
    FallbackGenerator,
    GeneratedAnswer,
    LLMError,
    build_generator,
    create_app,
)
from src.config import Settings


class FakeModel:
    """A provider that answers, or fails with the queued errors first."""

    def __init__(self, provider: str, model: str, *errors: LLMError) -> None:
        self.provider = provider
        self.model = model
        self.errors = list(errors)
        self.calls = 0

    async def generate(self, **kwargs) -> GeneratedAnswer:
        self.calls += 1
        if self.errors:
            raise self.errors.pop(0)
        return GeneratedAnswer(text=f"answer from {self.provider}", stop_reason="stop", model=self.model)


def ask(chain: FallbackGenerator, language: str = "km") -> GeneratedAnswer:
    return asyncio.run(chain.generate(
        system="", history=[], user_message="q", chunks=[], language=language,
    ))


def test_a_rate_limit_falls_through_to_the_next_provider():
    gemini = FakeModel("gemini", "g", LLMError(429, "rate limited"))
    groq = FakeModel("groq", "q")
    answer = ask(FallbackGenerator([gemini, groq]))
    assert answer.text == "answer from groq" and answer.provider == "groq"
    assert gemini.calls == 1 and groq.calls == 1


def test_a_cooling_provider_is_skipped_then_tried_again(monkeypatch):
    clock = [1000.0]
    monkeypatch.setattr(api.time, "monotonic", lambda: clock[0])
    gemini = FakeModel("gemini", "g", LLMError(429, "rate limited"))
    groq = FakeModel("groq", "q")
    chain = FallbackGenerator([gemini, groq], rate_limit_cooldown_seconds=60)

    ask(chain)
    assert chain.statuses[0]["status"] == "cooling_down"
    assert chain.statuses[0]["retry_in_seconds"] == 60

    clock[0] += 30
    assert ask(chain).provider == "groq"
    assert gemini.calls == 1, "a cooling model is not asked"

    clock[0] += 31
    assert ask(chain).provider == "gemini"
    assert chain.statuses[0]["status"] == "available"


def test_khmer_questions_go_to_the_khmer_route_first():
    groq = FakeModel("groq", "q")
    cerebras = FakeModel("cerebras", "c")
    gemini = FakeModel("gemini", "g")
    sea_lion = FakeModel("sea-lion", "s")
    openrouter = FakeModel("openrouter", "o")
    chain = FallbackGenerator(
        [groq, cerebras, gemini, sea_lion, openrouter],
        routes={"km": ["gemini", "sea-lion"], "en": ["groq", "cerebras"]},
    )
    names = lambda language: [chain.candidates[i].provider for i in chain._order(language)]
    assert names("km") == ["gemini", "sea-lion", "groq", "cerebras", "openrouter"]
    assert names("en") == ["groq", "cerebras", "gemini", "sea-lion", "openrouter"]
    assert ask(chain, "km").provider == "gemini"
    assert ask(chain, "en").provider == "groq"


def test_a_route_keeps_a_providers_other_models_for_later():
    lite = FakeModel("gemini", "lite")
    flash = FakeModel("gemini", "flash")
    groq = FakeModel("groq", "q")
    chain = FallbackGenerator([lite, flash, groq], routes={"km": ["gemini", "groq"]})
    assert [chain.candidates[i].model for i in chain._order("km")] == ["lite", "q", "flash"]


def test_when_every_provider_fails_the_student_gets_a_friendly_note():
    chain = FallbackGenerator([
        FakeModel("gemini", "g", LLMError(503, "down")),
        FakeModel("groq", "q", LLMError(429, "busy")),
    ])
    answer = ask(chain)
    assert answer.text == ALL_MODELS_BUSY
    assert "សុំទោស" in answer.text and "Sorry" in answer.text
    assert answer.provider == "none"


def test_a_rejected_key_is_disabled_for_the_session(monkeypatch):
    clock = [0.0]
    monkeypatch.setattr(api.time, "monotonic", lambda: clock[0])
    bad = FakeModel("gemini", "g", LLMError(401, "Gemini rejected the API key"))
    good = FakeModel("groq", "q")
    chain = FallbackGenerator([bad, good])
    ask(chain)
    assert chain.statuses[0]["status"] == "disabled"
    clock[0] += 10_000
    ask(chain)
    assert bad.calls == 1, "a disabled key is never tried again"


def test_several_keys_try_the_same_model_before_the_next_model():
    settings = Settings(
        _env_file=None, llm_provider="gemini", gemini_api_key="key-a", gemini_api_keys="key-b",
        gemini_model="lite", gemini_fallback_models="flash",
    )
    chain = build_generator(settings).chain
    assert chain[:4] == [
        "gemini:lite#key1", "gemini:lite#key2", "gemini:flash#key1", "gemini:flash#key2",
    ]
    assert not any("key-a" in name or "key-b" in name for name in chain), "keys never appear"


# --- through the API ------------------------------------------------------------

class CountingGenerator:
    provider = "gemini"
    model = "counted"

    def __init__(self) -> None:
        self.calls = 0

    async def generate(self, **kwargs) -> GeneratedAnswer:
        self.calls += 1
        return GeneratedAnswer(text="ចម្លើយ", stop_reason="stop", model=self.model, provider="gemini")

    async def stream(self, **kwargs):
        self.calls += 1
        yield "ចម្លើយ"
        yield GeneratedAnswer(text="ចម្លើយ", stop_reason="stop", model=self.model, provider="gemini")


@pytest.fixture
def make_client(tmp_path):
    def build(generator, **overrides) -> TestClient:
        settings = Settings(
            _env_file=None, embedding_backend="hashing", llm_provider="none",
            vector_store_path=tmp_path / "vector_index", **overrides,
        )
        return TestClient(create_app(settings, generator=generator))

    return build


def stream(client: TestClient, prompt: str, **body) -> list[dict]:
    response = client.post("/api/query/stream", json={"prompt": prompt, **body})
    assert response.status_code == 200, response.text
    return [json.loads(line) for line in response.text.splitlines() if line.strip()]


def test_a_cache_hit_makes_no_llm_call(make_client):
    generator = CountingGenerator()
    with make_client(generator) as client:
        first = stream(client, "តើ pH ជាអ្វី?")
        second = stream(client, "  តើ  pH ជាអ្វី? ")  # same question, other spacing
    assert generator.calls == 1
    assert [e["text"] for e in second if e["type"] == "delta"] == ["ចម្លើយ"]
    assert first[-1]["type"] == second[-1]["type"] == "done"


def test_a_question_with_history_is_not_cached(make_client):
    generator = CountingGenerator()
    history = [{"role": "user", "content": "សួស្តី"}, {"role": "assistant", "content": "សួស្តី"}]
    with make_client(generator) as client:
        stream(client, "តើ pH ជាអ្វី?", history=history)
        stream(client, "តើ pH ជាអ្វី?", history=history)
    assert generator.calls == 2


def test_one_ip_is_limited(make_client):
    with make_client(CountingGenerator(), rate_limit_questions=2, answer_cache_ttl_seconds=0) as client:
        for _ in range(2):
            assert client.post("/api/query/stream", json={"prompt": "x"}).status_code == 200
        refused = client.post("/api/query/stream", json={"prompt": "x"})
        other = client.post("/api/query/stream", json={"prompt": "x"}, headers={"X-Forwarded-For": "10.0.0.9"})
    assert refused.status_code == 429 and "Retry-After" in refused.headers
    assert "សុំទោស" in refused.json()["detail"]
    assert other.status_code == 200, "another student is not affected"


def test_health_lists_each_provider_status(make_client):
    chain = FallbackGenerator([FakeModel("gemini", "g"), FakeModel("groq", "q")])
    with make_client(chain) as client:
        providers = client.get("/health").json()["llm_providers"]
    assert [(p["name"], p["status"]) for p in providers] == [
        ("gemini:g", "available"), ("groq:q", "available"),
    ]
