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
