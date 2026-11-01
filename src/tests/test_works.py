"""Retrieval that puts a named literary work's own chunks first."""
from __future__ import annotations

import numpy as np
import pytest

from src.retrieval.retriever import Retriever, work_name
from src.vectorstore import ChunkRecord, InMemoryVectorStore


@pytest.mark.parametrize(
    ("title", "name"),
    [
        ("ប្រលោមលោករឿងផ្កាស្រពោន (នូ ហាច) — អក្សរសាស្ត្រខ្មែរ", "ផ្កាស្រពោន"),
        ("សេចក្ដីសង្ខេប និងការវិភាគរឿងរាមកេរ្ដិ៍ — អក្សរសាស្ត្រខ្មែរ", "រាមកេរ្តិ៍"),
        ("រឿងធនញ្ជ័យ (ធនញ្ជ័យកុមារ, ពិភពរឿងនិទាន) — អក្សរសាស្ត្រខ្មែរ", "ធនញ្ជ័យ"),
        ("កម្រងវិញ្ញាសាត្រៀមប្រឡង — អក្សរសាស្ត្រខ្មែរ ថ្នាក់ទី១២", None),
        ("", None),
    ],
)
def test_work_name(title, name):
    assert work_name(title) == name


class _FixedEmbedder:
    """Every query embeds to the x axis."""

    name = "test"

    def embed_query(self, text: str) -> np.ndarray:
        return np.array([1.0, 0.0], dtype=np.float32)


def _retriever() -> Retriever:
    store = InMemoryVectorStore(None, "test")
    records, vectors = [], []
    # Textbook chunks match the query better than the novel's own text does.
    for i in range(6):
        records.append(ChunkRecord(id=f"t{i}", source="textbook.pdf", chunk_index=i, text="t",
                                   metadata={"title": "សៀវភៅសិក្សា អក្សរសាស្ត្រខ្មែរ"}))
        vectors.append([1.0, 0.01 * i])
    for i in range(4):
        records.append(ChunkRecord(id=f"n{i}", source="novel.pdf", chunk_index=i, text="n",
                                   metadata={"title": "ប្រលោមលោករឿងផ្កាស្រពោន — អក្សរសាស្ត្រខ្មែរ"}))
        vectors.append([0.9, 0.3 + 0.1 * i])
    store.add(records, np.array(vectors, dtype=np.float32))
    return Retriever(_FixedEmbedder(), store, top_k=5, work_top_k=5)


def test_named_work_comes_first_and_the_rest_fill_up():
    ids = [chunk.id for chunk in _retriever().retrieve("សង្ខេបរឿងផ្កាស្រពោន")]
    assert ids == ["n0", "n1", "n2", "t0", "t1"]


def test_question_without_a_work_is_plain_dense_retrieval():
    ids = [chunk.id for chunk in _retriever().retrieve("អក្សរសាស្ត្រខ្មែរ")]
    assert ids == ["t0", "t1", "t2", "t3", "t4"]


def test_subject_top_k_applies_only_without_an_explicit_top_k():
    retriever = _retriever()
    retriever.subject_top_k = {"khmer_literature": 8}
    assert len(retriever.retrieve("អក្សរសាស្ត្រខ្មែរ", subject="khmer_literature")) == 8
    assert len(retriever.retrieve("អក្សរសាស្ត្រខ្មែរ", top_k=2, subject="khmer_literature")) == 2
