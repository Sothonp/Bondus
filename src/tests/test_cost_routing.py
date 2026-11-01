"""Difficulty routing (src/router.py) and the semantic answer cache."""
from __future__ import annotations

import asyncio

import numpy as np
import pytest

from src.answer_cache import AnswerCache, CachedAnswer, question_signature
from src.api import FallbackGenerator, GeneratedAnswer
from src.router import answer_tier


@pytest.mark.parametrize(
    "question",
    ["សួស្តី", "តើលីមីតជាអ្វី?", "what is an acid?", "និយមន័យនៃអាស៊ីត", "តើរឿងផ្កាស្រពោននិពន្ធដោយនរណា?"],
)
def test_simple_questions(question):
    assert answer_tier(question) == "simple"


@pytest.mark.parametrize(
    "question",
    [
        "ដោះស្រាយសមីការ x^2-5x+6=0",
        "គណនា $\\lim_{x \\to 0} \\frac{\\sin x}{x}$",
        "ពន្យល់ពីច្បាប់ទី១ទែម៉ូឌីណាមិច",
        "ហេតុអ្វីបានជាអាស៊ីតខ្លាំងបំបែកអ៊ីយ៉ុងទាំងស្រុង?",
        "Solve 2x + 3 = 7",
        "explain photosynthesis",
        "ប្រធាន៖ «អក្សរសិល្ប៍ខ្មែរ ជាកញ្ចក់ឆ្លុះបញ្ចាំងពីសង្គមខ្មែរ»",
        "ឧស្ម័ន 2 mol មានមាឌ 10 L",
        "x" * 200,
    ],
)
def test_advanced_questions(question):
    assert answer_tier(question) == "advanced"


def test_photos_continuations_and_follow_ups_are_advanced():
    assert answer_tier("តើនេះជាអ្វី?", has_images=True) == "advanced"
    assert answer_tier("បន្ត", continues=True) == "advanced"
    assert answer_tier("បន្ត", previous_question="ដោះស្រាយសមីការ x^2=4") == "advanced"
    assert answer_tier("អរគុណ", previous_question="សួស្តី") == "simple"


class FakeModel:
    def __init__(self, provider: str, model: str) -> None:
        self.provider, self.model, self.calls = provider, model, 0

    async def generate(self, **kwargs) -> GeneratedAnswer:
        assert "tier" not in kwargs, "the chain must not pass the tier on to a model"
        self.calls += 1
        return GeneratedAnswer(text=self.model, stop_reason="stop", model=self.model)


def _chain() -> tuple[FallbackGenerator, dict[str, FakeModel]]:
    models = {
        "lite": FakeModel("gemini", "gemini-3.1-flash-lite"),
        "flash": FakeModel("gemini", "gemini-3.5-flash"),
        "groq": FakeModel("groq", "gpt-oss"),
    }
    chain = FallbackGenerator(
        list(models.values()),
        routes={"km": ["gemini", "groq"]},
        tier_routes={"simple": ["gemini:gemini-3.1-flash-lite"], "advanced": ["gemini:gemini-3.5-flash"]},
    )
    return chain, models


def _ask(chain: FallbackGenerator, **extra) -> str:
    return asyncio.run(chain.generate(
        system="", history=[], user_message="q", chunks=[], language="km", **extra,
    )).text


def test_the_tier_picks_the_model_and_the_language_route_follows():
    chain, _ = _chain()
    assert _ask(chain, tier="simple") == "gemini-3.1-flash-lite"
    assert _ask(chain, tier="advanced") == "gemini-3.5-flash"
    assert _ask(chain) == "gemini-3.1-flash-lite", "no tier: the language route alone"
    order = [chain.candidates[i].model for i in chain._order("km", "advanced")]
    assert order == ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gpt-oss"]


def test_signature_keeps_numbers_and_operators():
    assert question_signature("x^2-5x+6=0") != question_signature("x^2-5x+7=0")
    assert question_signature("ដោះស្រាយ ២x=៤") == question_signature("solve 2x = 4")
    assert question_signature("តើលីមីតជាអ្វី?") == question_signature("លីមីតគឺជាអ្វី?") == ""


def _vector(*values: float) -> np.ndarray:
    return np.array(values, dtype=np.float32)


@pytest.fixture
def cache(tmp_path):
    store = AnswerCache(tmp_path / "cache.sqlite", ttl_seconds=3600)
    store.put("k1", CachedAnswer("limit answer", "gemini", "m", "stop"))
    store.put_similar("k1", "scope", "តើលីមីតជាអ្វី?", ["a", "b", "c"], _vector(1, 0, 0))
    return store


def find(cache, question="លីមីតគឺជាអ្វី?", chunks=("a", "b", "c"), vector=(0.99, 0.1, 0), scope="scope"):
    return cache.find_similar(scope, question, list(chunks), _vector(*vector), min_similarity=0.95, min_overlap=0.6)


def test_a_rewording_reuses_the_answer(cache):
    found = find(cache)
    assert found is not None and found[0].text == "limit answer" and found[1] > 0.95


def test_each_check_can_refuse_a_reuse(cache):
    assert find(cache, vector=(0.8, 0.6, 0)) is None, "not similar enough"
    assert find(cache, chunks=("a", "x", "y")) is None, "different passages"
    assert find(cache, question="លីមីត 2 ជាអ្វី?") is None, "different numbers"
    assert find(cache, scope="other") is None, "another subject, language or prompt"
    assert find(cache, vector=(1, 0)) is None, "another embedding model"
