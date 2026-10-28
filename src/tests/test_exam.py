"""The exam generator: past papers rebuilt from the index, and /api/exam/stream."""
from __future__ import annotations

import json

import numpy as np
import pytest
from fastapi.testclient import TestClient

from prompts import EXAM_SYSTEM_PROMPT
from src.api import create_app
from src.config import Settings
from src.embeddings.embedder import build_embedder
from src.exam_papers import (
    PastPaper,
    choose_reference_papers,
    describe_format,
    paper_format,
    past_papers,
    reference_format,
    year_in,
)
from src.tests.test_api import ScriptedGenerator
from src.vectorstore import ChunkRecord, InMemoryVectorStore

FILLER = "\n".join(f"{n}. គណនាលីមីត $\\lim_{{x \\to {n}}} f(x)$ ។" for n in range(1, 15))

PHYSICS_2019 = [
    "ប្រឡងសញ្ញាបត្រមធ្យមសិក្សាទុតិយភូមិ",
    "សម័យប្រឡង ១២ សីហា ២០១៩\nវិញ្ញាសា: រូបវិទ្យា\nរយៈពេល: ១២០នាទី\nពិន្ទុ: ៧៥",
    f"I. (១០ពិន្ទុ) សំណួរទី១\n{FILLER}",
    "ចម្លើយ\nI. ចម្លើយគឺ $v = 3$",
]

# A compilation: two years in one file, each followed by its answers.
MATHS_BOOK = [
    "វិញ្ញាសាប្រឡងបាក់ឌុបគណិតវិទ្យា",
    f"សម័យប្រឡង៖ ២២ កក្កដា ២០០២\nរយៈពេល ១៥០ នាទី ពិន្ទុ ៧៥\nI. (៥ពិន្ទុ) មួយ\n{FILLER}",
    "ដំណោះស្រាយ\nI. ដំណោះស្រាយឆ្នាំ២០០២",
    f"សម័យប្រឡង៖ ០៥ ធ្នូ ២០២២\nរយៈពេល ១៥០ នាទី ពិន្ទុ ១២៥\nI. (១០ពិន្ទុ) ពីរ\n{FILLER}",
    "ដំណោះស្រាយ\nI. ដំណោះស្រាយឆ្នាំ២០២២",
    "សម័យប្រឡង ២០១០",  # a stray header with no paper behind it
]


def records(source: str, texts: list[str], title: str = "") -> list[ChunkRecord]:
    return [
        ChunkRecord(id=f"{source}:{n}", source=source, chunk_index=n, text=text, metadata={"title": title})
        for n, text in enumerate(texts)
    ]


def make_store(path, embedding_model: str) -> InMemoryVectorStore:
    store = InMemoryVectorStore(path, embedding_model)
    batch = (
        records("Science/physics/2019.pdf", PHYSICS_2019)
        + records("maths-book.pdf", MATHS_BOOK, title="វិញ្ញាសាប្រឡងបាក់ឌុបគណិតវិទ្យា ២០០២–២០២៣")
    )
    store.add(batch, np.random.default_rng(0).random((len(batch), 8), dtype=np.float32))
    return store


class TestPastPapers:
    @pytest.fixture
    def store(self, tmp_path):
        return make_store(tmp_path, "test")

    def test_a_single_year_file_is_one_paper_without_its_answers(self, store):
        [paper] = past_papers(store, "physics")
        assert paper.year == 2019
        assert "I. (១០ពិន្ទុ) សំណួរទី១" in paper.text
        assert "ចម្លើយគឺ" not in paper.text, "the worked answers are cut"
        assert paper.text.startswith("ប្រឡងសញ្ញាបត្រ"), "the title page stays with the paper"

    def test_a_compilation_splits_into_one_paper_per_year_newest_first(self, store):
        papers = past_papers(store, "mathematics")
        assert [paper.year for paper in papers] == [2022, 2002], "the stray 2010 header is no paper"
        assert "ពីរ" in papers[0].text and "មួយ" not in papers[0].text
        assert not any("ដំណោះស្រាយ" in paper.text for paper in papers)

    def test_other_subjects_are_left_out(self, store):
        assert past_papers(store, "chemistry") == []

    def test_years_are_read_in_khmer_and_arabic_digits(self):
        assert year_in("សម័យប្រឡង៖ ០៥ ធ្នូ ២០២២") == 2022
        assert year_in("Science/physics/2019.pdf") == 2019
        assert year_in("ពិន្ទុ ១២៥") is None


def paper(year: int | None, size: int = 2000) -> PastPaper:
    return PastPaper(source=f"{year}.pdf", year=year, title="", text="x" * size)


class TestChoosingReferences:
    PAPERS = [paper(year) for year in range(2025, 2010, -1)]

    def test_the_newest_paper_always_comes_first(self):
        for seed in range(5):
            chosen = choose_reference_papers(self.PAPERS, budget_chars=16000, max_papers=4, seed=seed)
            assert chosen[0].year == 2025
            assert len(chosen) == 4

    def test_the_same_seed_picks_the_same_papers(self):
        """A continuation round must see the models the first round saw."""
        pick = lambda seed: [p.year for p in choose_reference_papers(  # noqa: E731
            self.PAPERS, budget_chars=16000, max_papers=4, seed=seed)]
        assert pick(7) == pick(7)
        assert len({tuple(pick(seed)) for seed in range(10)}) > 1, "new papers draw on new mixes"

    def test_one_year_is_used_once(self):
        chosen = choose_reference_papers(
            [paper(2022), paper(2022), paper(2021)], budget_chars=16000, max_papers=4, seed=1
        )
        assert [p.year for p in chosen] == [2022, 2021]

    def test_the_budget_holds_and_the_newest_paper_may_take_half(self):
        papers = [paper(2025, 9000), *(paper(year, 9000) for year in range(2024, 2018, -1))]
        chosen = choose_reference_papers(papers, budget_chars=16000, max_papers=4, seed=3)
        assert sum(len(p.text) for p in chosen) <= 16000 + 10 * len(chosen)
        assert len(chosen[0].text) > len(chosen[1].text)

    def test_no_papers_means_no_references(self):
        assert choose_reference_papers([], budget_chars=16000, max_papers=4) == []


@pytest.fixture
def exam_client(tmp_path):
    def build(generator: ScriptedGenerator, **overrides) -> TestClient:
        settings = Settings(
            _env_file=None,
            embedding_backend="hashing",
            llm_provider="none",
            vector_store_path=tmp_path / "vector_index",
            **overrides,
        )
        make_store(settings.vector_store_path, build_embedder(settings).name).save()
        return TestClient(create_app(settings, generator=generator))

    return build


def generate(client: TestClient, **body) -> list[dict]:
    with client as c:
        response = c.post("/api/exam/stream", json=body)
        assert response.status_code == 200, response.text
        return [json.loads(line) for line in response.text.splitlines() if line.strip()]


class TestExamEndpoint:
    def test_the_paper_streams_after_the_past_papers_it_was_modelled_on(self, exam_client):
        generator = ScriptedGenerator(["វិញ្ញាសាប្រឡងសាកល្បង\n\n", "I. (១០ពិន្ទុ) ..."])
        sent = generate(exam_client(generator, expose_sources=True), subject="mathematics", seed=1, answer_key=True)
        kinds = [event["type"] for event in sent]
        assert kinds.index("meta") < kinds.index("delta") < kinds.index("done")
        meta = next(event for event in sent if event["type"] == "meta")
        assert [source["heading"] for source in meta["sources"]] == ["2022", "2002"]

        [call] = generator.seen
        assert call["system"] == EXAM_SYSTEM_PROMPT
        assert call["history"] == []
        message = call["user_message"]
        assert "<subject>គណិតវិទ្យា (Mathematics)</subject>" in message
        assert "ពិន្ទុ ១២៥" in message, "the newest paper's format reaches the model"
        assert "ដំណោះស្រាយឆ្នាំ" not in message, "past answers do not"
        assert "<answer_key>yes</answer_key>" in message

    def test_focus_and_no_answer_key_reach_the_model(self, exam_client):
        generator = ScriptedGenerator(["ok"])
        generate(exam_client(generator), subject="physics", focus="ចលនារង្វង់", answer_key=False, language="en")
        message = generator.seen[0]["user_message"]
        assert "<focus>\nចលនារង្វង់\n</focus>" in message
        assert "<answer_key>no</answer_key>" in message
        assert message.endswith("<response_language>en</response_language>")

    def test_a_continuation_carries_the_paper_so_far(self, exam_client):
        generator = ScriptedGenerator(["III. ..."])
        generate(exam_client(generator), subject="physics", seed=4, partial="I. (១០ពិន្ទុ) សំណួរ\n\nII.")
        message = generator.seen[0]["user_message"]
        assert "<paper_so_far>\nI. (១០ពិន្ទុ) សំណួរ\n\nII.\n</paper_so_far>" in message
        assert message.index("<past_papers>") < message.index("<paper_so_far>")

    def test_the_past_papers_stay_on_the_server_by_default(self, exam_client):
        sent = generate(exam_client(ScriptedGenerator(["ok"])), subject="mathematics", seed=1)
        meta = next(event for event in sent if event["type"] == "meta")
        assert meta["sources"] == []

    def test_a_paper_comes_without_answers_by_default(self, exam_client):
        generator = ScriptedGenerator(["ok"])
        generate(exam_client(generator), subject="physics")
        assert "<answer_key>no</answer_key>" in generator.seen[0]["user_message"]

    def test_answers_on_request_send_the_paper_not_a_new_one(self, exam_client):
        generator = ScriptedGenerator(["## ចម្លើយ"])
        generate(
            exam_client(generator), subject="physics", answers_for="II",
            paper="I. (១០ពិន្ទុ) សំណួរ\n\nII. (១០ពិន្ទុ) លំហាត់",
        )
        message = generator.seen[0]["user_message"]
        assert "<paper>\nI. (១០ពិន្ទុ) សំណួរ\n\nII. (១០ពិន្ទុ) លំហាត់\n</paper>" in message
        assert "<answers_for>II</answers_for>" in message
        assert "<past_papers>" not in message and "Write one complete new mock" not in message

    def test_a_subject_with_no_past_papers_is_refused_in_band(self, exam_client):
        generator = ScriptedGenerator(["never"])
        sent = generate(exam_client(generator), subject="chemistry")
        assert sent[-1]["type"] == "error" and sent[-1]["status"] == 404
        assert "Chemistry" in sent[-1]["detail"]
        assert generator.seen == [], "no model is asked to guess a format"

    def test_an_unknown_subject_is_a_validation_error(self, exam_client):
        with exam_client(ScriptedGenerator(["x"])) as c:
            assert c.post("/api/exam/stream", json={"subject": "astrology"}).status_code == 422


class TestPaperFormat:
    def test_the_header_and_exercise_points_are_read(self):
        found = paper_format(
            "សម័យប្រឡង៖ ០៥ ធ្នូ ២០២២\nរយៈពេល ១៥០ នាទី ពិន្ទុ ១២៥\n"
            "I. (១០ពិន្ទុ) ក\nII. (៤០ពិន្ទុ) ខ\n១. ...\nIII. (៧៥ពិន្ទុ) គ\nV. Hugo"
        )
        assert (found.duration_minutes, found.total_points) == (150, 125)
        assert found.exercises == (("I", 10), ("II", 40), ("III", 75))
        assert found.points_add_up
        assert "I (10 points), II (40 points), III (75 points); they add up to 125" in describe_format(found)

    def test_points_that_do_not_add_up_are_not_stated(self):
        """An OCR slip in one number would otherwise be copied into the new paper."""
        found = paper_format("រយៈពេល: ៩០នាទី\nពិន្ទុ: ៧៥\nI. (១០ពិន្ទុ) ក\nII. (១០ពិន្ទុ) ខ")
        assert not found.points_add_up
        described = describe_format(found)
        assert "Duration: 90 minutes" in described and "Exercises: 2 (I to II)" in described
        assert "10 points" not in described

    def test_the_newest_consistent_paper_sets_the_format(self):
        papers = [
            PastPaper("a", 2023, "", "ពិន្ទុ ៧៥\nI. (១០ពិន្ទុ) ក"),
            PastPaper("b", 2022, "", "រយៈពេល ១៥០ នាទី ពិន្ទុ ២០\nI. (១០ពិន្ទុ) ក\nII. (១០ពិន្ទុ) ខ"),
        ]
        assert reference_format(papers).total_points == 20

    def test_the_format_reaches_the_model_outside_the_past_papers(self, exam_client):
        generator = ScriptedGenerator(["ok"])
        generate(exam_client(generator), subject="mathematics")
        message = generator.seen[0]["user_message"]
        assert "<format>" in message
        assert message.index("</past_papers>") < message.index("<format>")


def test_the_exam_message_carries_the_subject_guide():
    from prompts import MATH_GUIDES, build_exam_message, subject_guide

    message = build_exam_message(
        "គណិតវិទ្យា (Mathematics)", [], "km", guide=subject_guide("mathematics", "social_science")
    )
    assert f"<subject_guide>\n{MATH_GUIDES['social_science']}\n</subject_guide>" in message
    assert "<subject_guide>" not in build_exam_message("គណិតវិទ្យា (Mathematics)", [], "km")
