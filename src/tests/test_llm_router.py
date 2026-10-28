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


def test_nvidia_joins_the_chain_as_a_backstop():
    settings = Settings(
        _env_file=None, llm_provider="gemini", gemini_api_key="g", nvidia_api_key="nvapi-test",
        openrouter_api_key="o", gemini_fallback_models="",
    )
    chain = build_generator(settings).chain
    first_nvidia = next(i for i, name in enumerate(chain) if name.startswith("nvidia:"))
    first_openrouter = next(i for i, name in enumerate(chain) if name.startswith("openrouter:"))
    assert chain[0].startswith("gemini:") and first_nvidia < first_openrouter
    assert f"nvidia:{settings.nvidia_model}" in chain


def test_stray_replacement_characters_are_dropped():
    from src.api import OutputGuard

    assert OutputGuard("m").feed("\ufffdដេរីវេ") == "ដេរីវេ"


# --- follow-ups and photos --------------------------------------------------------

class RecordingGenerator(CountingGenerator):
    def __init__(self) -> None:
        super().__init__()
        self.messages: list[str] = []

    async def stream(self, **kwargs):
        self.messages.append(kwargs["user_message"])
        async for item in super().stream(**kwargs):
            yield item


def test_a_short_follow_up_keeps_the_previous_questions_subject(make_client):
    generator = RecordingGenerator()
    history = [
        {"role": "user", "content": "ដោះស្រាយលំហាត់គណិតវិទ្យា៖ គេមានអនុគមន៍ f(x) = x^2 ... ១. ... ៦. ..."},
        {"role": "assistant", "content": "១. ... ២. ... ៣. ... ៤. ..."},
    ]
    with make_client(generator) as client:
        stream(client, "លេខ5 ដល់ លេខ៦", history=history)
    assert "<subject_guide>\nMathematics" in generator.messages[0]


def test_a_long_new_question_is_not_treated_as_a_follow_up():
    from schemas import QueryRequest
    from src.api import _previous_question

    history = [{"role": "user", "content": "គណិតវិទ្យា"}, {"role": "assistant", "content": "..."}]
    long_question = (
        "ពន្យល់ពីដំណើរការចម្លងក្រម ADN ទៅ ARNm ក្នុងកោសិកា ហើយប្រាប់ពីតួនាទីរបស់អង់ស៊ីម ARN ប៉ូលីមេរ៉ាស "
        "ព្រមទាំងប្រៀបធៀបការសំយោគប្រូតេអ៊ីននៅក្នុងកោសិកាប្រូការ្យូត និងកោសិកាអ៊ឺការ្យូត ដោយលើកឧទាហរណ៍"
        "អំពីអ័រម៉ូនអាំងស៊ុយលីន និងវិស្វកម្មសេនេទិច"
    )
    pointing_back = "ធ្វើសំណួរទី៥ និងទី៦ ឡើងវិញ ព្រោះខ្ញុំមិនទាន់យល់ពីរបៀបរកបន្ទាត់ប៉ះ " * 4
    assert len(long_question) > 200 and len(pointing_back) > 200
    assert _previous_question(QueryRequest(prompt="លេខ៥", history=history)) == "គណិតវិទ្យា"
    assert _previous_question(QueryRequest(prompt=pointing_back, history=history)) == "គណិតវិទ្យា"
    assert _previous_question(QueryRequest(prompt=long_question, history=history)) == ""
    assert _previous_question(QueryRequest(prompt="លេខ៥")) == ""


def test_an_incomplete_photo_reading_hands_over_to_the_next_engine():
    from src.ingestion.image_ocr import HybridImageOCR

    class Engine:
        def __init__(self, name: str, text: str, truncated: bool) -> None:
            self.engine, self.model, self.result = name, name, (text, truncated)

        def transcribe_page(self, payload):
            return self.result

    ocr = HybridImageOCR(khmer=None, vision=[
        Engine("groq", "១. ... ២. ... ៣. ... ៤.", truncated=True),
        Engine("gemini", "១. ... ២. ... ៣. ... ៤. ... ៥. ... ៦. ...", truncated=False),
    ])
    text, engine, warnings = ocr._read_vision(object())
    assert engine == "gemini:gemini" and "៦." in text
    assert any("incomplete" in w for w in warnings)

    alone = HybridImageOCR(khmer=None, vision=[Engine("groq", "១. ... ៤.", truncated=True)])
    assert alone._read_vision(object())[0] == "១. ... ៤.", "a partial reading beats none"
