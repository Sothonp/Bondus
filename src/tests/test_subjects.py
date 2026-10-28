"""Tests for the subject registry and the subject filter on retrieval."""
from __future__ import annotations

from typing import get_args

import pytest

from schemas import SubjectId
from src.embeddings.embedder import HashingEmbedder
from src.ingestion import ExtractedDocument, Section, index_document
from src.ingestion.khmer_segment import KhmerSegmenter
from src.retrieval.retriever import Retriever
from src.subjects import SUBJECT_IDS, subject_of
from src.vectorstore import InMemoryVectorStore


@pytest.mark.parametrize(
    ("source", "title", "expected"),
    [
        ("Science/physics/2019.pdf", "", "physics"),
        ("Science/khmer_literature/2024.pdf", "", "khmer_literature"),
        ("Science/2019/Science/science-physics-2019.pdf", "", "physics"),
        ("Science/2011/Science/Physic_Science_2011.pdf", "", "physics"),
        ("Science/2023/Science/Literature_Science_2023.pdf", "", "khmer_literature"),
        ("Science/2018/Science/Fance_2018.pdf", "", "french"),
        ("Science/2012/Social/Earth_Social_2012.pdf", "", "earth_science"),
        ("Formula Maths 12-page-001.jpg", "", "mathematics"),
        ("IMG_8395-col1.JPG", "សង្ខេបរូបមន្តគណិតវិទ្យា ថ្នាក់ទី១២ ទំព័រ 3", "mathematics"),
        ("notes.md", "", None),
    ],
)
def test_subject_of(source, title, expected):
    assert subject_of(source, title) == expected


def test_api_subject_ids_match_the_registry():
    assert set(get_args(SubjectId)) == SUBJECT_IDS


def test_retrieve_keeps_only_the_requested_subject():
    embedder = HashingEmbedder(1024)
    store = InMemoryVectorStore(None, embedder.name)
    corpus = {
        "Science/physics/2019.pdf": "ល្បឿន និង សំទុះ របស់ចលនា",
        "Science/chemistry/2019.pdf": "ល្បឿន នៃប្រតិកម្មគីមី",
        "Science/english/2019.pdf": "speed and velocity reading passage",
    }
    for source, text in corpus.items():
        index_document(
            ExtractedDocument(source, "pdf", [Section(text)]),
            store=store, embedder=embedder, segmenter=KhmerSegmenter("regex"),
            chunk_size=500, chunk_overlap=50, persist=False,
        )
    retriever = Retriever(embedder, store, top_k=5)
    hits = retriever.retrieve("ល្បឿន", subject="chemistry")
    assert [hit.source for hit in hits] == ["Science/chemistry/2019.pdf"]
    assert hits[0].subject == "chemistry"
    assert retriever.retrieve("ល្បឿន", subject="chemistry", sources=["Science/physics/2019.pdf"]) == []
    assert retriever.retrieve("ល្បឿន", subject="biology") == []


def test_subject_guides_cover_known_subjects_and_tracks():
    from prompts import MATH_GUIDES, SUBJECT_GUIDES, subject_guide

    assert set(SUBJECT_GUIDES) <= SUBJECT_IDS
    assert subject_guide("mathematics", "science") == MATH_GUIDES["science"]
    assert subject_guide("mathematics") == SUBJECT_GUIDES["mathematics"]
    assert subject_guide("physics", "social_science") == SUBJECT_GUIDES["physics"]
    assert subject_guide("geography") is None and subject_guide(None) is None
    # Thai script once slipped into a pasted Khmer term; the guides must be Khmer/English only.
    assert not any("฀" <= ch <= "๿" for guide in [*SUBJECT_GUIDES.values(), *MATH_GUIDES.values()] for ch in guide)


def test_the_physics_guide_keeps_practice_inside_the_bac_ii_scope():
    from prompts import SUBJECT_GUIDES

    from prompts import MATH_GUIDES

    for guide in [*SUBJECT_GUIDES.values(), *MATH_GUIDES.values()]:
        assert "BAC II exam scope" in guide or "Science track paper" in guide
    assert "photoelectric effect" in SUBJECT_GUIDES["physics"].split("Never set as practice")[1]
    assert "Punnett" in SUBJECT_GUIDES["biology"].split("Never set as practice")[1]


@pytest.mark.parametrize(
    "question, expected",
    [
        ("បង្កើតវិញ្ញាសាប្រវត្តិវិទ្យា", "history"),
        ("សង្ខេបប្រវត្តិសាស្ត្រសង្គមរាស្ត្រនិយម", "history"),
        ("Give me a physics exercise", "physics"),
        ("passive voice exercise for English", "english"),
        ("ពន្យល់ដេរីវេជាភាសាអង់គ្លេស", None),
        ("explain limits in English", None),
        ("compare physics and chemistry", None),
        ("គណនាលីមីត", None),
    ],
)
def test_subject_named_in(question, expected):
    from src.subjects import subject_named_in

    assert subject_named_in(question) == expected


def test_the_compact_prompt_keeps_the_rules_and_drops_the_bulk():
    from prompts import COMPACT_SYSTEM_PROMPT, SYSTEM_PROMPT, compact_prompt

    assert compact_prompt(SYSTEM_PROMPT) == COMPACT_SYSTEM_PROMPT
    assert compact_prompt("other") == "other"
    for rule in ("How much to answer", "[Scope — strict]", "Solution style", "Attached images"):
        assert rule in COMPACT_SYSTEM_PROMPT
    assert "GeoGebra)" not in COMPACT_SYSTEM_PROMPT
    assert len(COMPACT_SYSTEM_PROMPT) < len(SYSTEM_PROMPT) * 0.9
