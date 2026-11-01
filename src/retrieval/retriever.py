"""Query-time retrieval: embed, search, threshold, restore formulas."""
from __future__ import annotations

import math
import re
from collections.abc import Iterable, Mapping, Sequence
from dataclasses import dataclass

import numpy as np

from src.embeddings.embedder import Embedder
from src.ingestion.khmer_segment import strip_word_boundaries
from src.ingestion.latex_guard import unmask_latex
from src.subjects import subject_of
from src.vectorstore import InMemoryVectorStore


@dataclass(frozen=True)
class RetrievedChunk:
    id: str
    source: str
    chunk_index: int
    page: int | None
    score: float
    text: str  # formulas restored
    title: str = ""
    heading: str = ""
    stem: str = ""  # opening of the exercise this chunk continues, if any
    subject: str | None = None


# A literary work's name is read from its catalog title: the word after "រឿង" or
# "ប្រលោមលោក" ("ប្រលោមលោករឿងផ្កាស្រពោន (នូ ហាច) — ..." names ផ្កាស្រពោន). Only the
# part before " — " counts, and parentheses are dropped.
_WORK_NAME = re.compile(r"(?:រឿង|ប្រលោមលោក)\s*([^\s()—]+)")
_PARENTHESES = re.compile(r"\([^)]*\)")
MIN_WORK_NAME_CHARS = 4
# Of top_k chunks, the share taken from the works a question names; the rest
# come from the whole corpus (the essay method, exam papers, the textbook).
WORK_SHARE = 0.6
# A work's key-points sheet (data/<folder>/key_points/, titled "ចំណុចសំខាន់ៗ៖ រឿង…")
# is its checked summary: every chunk of it goes in front, in order, on top of
# top_k, so a character list split across chunks is never cut short.
KEY_POINTS_PREFIX = "ចំណុចសំខាន់ៗ"
MAX_SHEET_CHARS = 15000


def normalize_khmer(text: str) -> str:
    """Fold the two spellings of a subscript t (្ដ and ្ត) together."""
    return text.replace("្ដ", "្ត")


def work_name(title: str) -> str | None:
    """The literary work a catalog title names, or None when it names none."""
    head = _PARENTHESES.sub(" ", normalize_khmer(title).split("—")[0])
    names = [name for name in _WORK_NAME.findall(head) if len(name) >= MIN_WORK_NAME_CHARS]
    # "ប្រលោមលោករឿងX" matches "រឿងX" after the "ប្រលោមលោក"; the last name is X.
    return names[-1].removeprefix("រឿង") if names else None


def is_key_points(title: str) -> bool:
    return normalize_khmer(title).lstrip().startswith(KEY_POINTS_PREFIX)


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> np.ndarray:
    """Cosine similarity between rows of ``a`` and rows of ``b``.

    1-D inputs are treated as single rows; the result has shape (len(a), len(b)).
    """
    a = np.atleast_2d(np.asarray(a, dtype=np.float64))
    b = np.atleast_2d(np.asarray(b, dtype=np.float64))
    a_norm = np.linalg.norm(a, axis=1, keepdims=True)
    b_norm = np.linalg.norm(b, axis=1, keepdims=True)
    a_norm[a_norm == 0] = 1.0
    b_norm[b_norm == 0] = 1.0
    return (a / a_norm) @ (b / b_norm).T


class Retriever:
    def __init__(
        self,
        embedder: Embedder,
        store: InMemoryVectorStore,
        *,
        top_k: int = 5,
        score_threshold: float = 0.0,
        max_context_chars: int = 12000,
        subject_top_k: Mapping[str, int] | None = None,
        work_top_k: int | None = None,
    ) -> None:
        self.embedder = embedder
        self.store = store
        self.top_k = top_k
        self.score_threshold = score_threshold
        self.max_context_chars = max_context_chars
        # Subjects that need more passages than top_k by default (an essay that
        # draws on several works), and the default when a question names a work.
        self.subject_top_k = dict(subject_top_k or {})
        self.work_top_k = work_top_k

    def retrieve(
        self,
        query: str,
        top_k: int | None = None,
        score_threshold: float | None = None,
        sources: Iterable[str] | None = None,
        subject: str | None = None,
    ) -> list[RetrievedChunk]:
        """``subject`` keeps only documents of that subject (see ``src.subjects``),
        on top of any ``sources`` restriction."""
        query = query.strip()
        if not query or len(self.store) == 0:
            return []
        if subject is not None:
            of_subject = self.sources_for_subject(subject)
            sources = of_subject if sources is None else of_subject & set(sources)
        works = self.works_named_in(query, sources)
        if top_k is None:
            top_k = self.subject_top_k.get(subject or "", self.top_k)
            if works and self.work_top_k is not None:
                top_k = max(top_k, self.work_top_k)
        threshold = self.score_threshold if score_threshold is None else score_threshold
        vector = self.embedder.embed_query(query)
        sheet_sources = self._sheet_sources(works)
        sheets = self._sheet_chunks(vector, works, sheet_sources) if works else []
        hits = self._search_works(vector, works, top_k, threshold, sheet_sources) if works else []
        seen = {hit.record.id for hit in sheets + hits}
        for hit in self.store.search(
            vector, top_k=top_k + len(seen), score_threshold=threshold, sources=sources
        ):
            if len(hits) >= top_k:
                break
            if hit.record.id not in seen and hit.record.source not in sheet_sources:
                hits.append(hit)
        hits = sheets + hits
        return [
            RetrievedChunk(
                id=hit.record.id,
                source=hit.record.source,
                chunk_index=hit.record.chunk_index,
                page=hit.record.page,
                score=round(hit.score, 6),
                text=strip_word_boundaries(unmask_latex(hit.record.text, hit.record.vault)),
                title=hit.record.metadata.get("title") or "",
                heading=hit.record.metadata.get("heading") or "",
                stem=hit.record.metadata.get("stem") or "",
                subject=subject_of(hit.record.source, hit.record.metadata.get("title") or ""),
            )
            for hit in hits
        ]

    def works_named_in(self, query: str, sources: Iterable[str] | None = None) -> dict[str, set[str]]:
        """The literary works a question names, each with the sources that hold it
        (a novel and its summary), limited to ``sources`` when given."""
        text = normalize_khmer(query)
        allowed = None if sources is None else set(sources)
        works: dict[str, set[str]] = {}
        for source, metadata in self.store.source_metadata().items():
            if allowed is not None and source not in allowed:
                continue
            name = work_name(metadata.get("title") or "")
            if name and name in text:
                works.setdefault(name, set()).add(source)
        return works

    def _sheet_sources(self, works: Mapping[str, set[str]]) -> set[str]:
        """The key-points sheets among the named works' sources."""
        if not works:
            return set()
        metadata = self.store.source_metadata()
        return {
            source
            for sources in works.values()
            for source in sources
            if is_key_points(metadata.get(source, {}).get("title") or "")
        }

    def _sheet_chunks(self, vector: np.ndarray, works: Mapping[str, set[str]], sheet_sources: set[str]):
        """Every chunk of each named work's key-points sheet, in reading order,
        up to MAX_SHEET_CHARS a work."""
        hits = []
        for sources in works.values():
            sheets = sources & sheet_sources
            if not sheets:
                continue
            found = self.store.search(vector, top_k=len(self.store), sources=sheets)
            used = 0
            for hit in sorted(found, key=lambda hit: (hit.record.source, hit.record.chunk_index)):
                if used + len(hit.record.text) > MAX_SHEET_CHARS:
                    break
                hits.append(hit)
                used += len(hit.record.text)
        return hits

    def _search_works(
        self, vector: np.ndarray, works: Mapping[str, set[str]], top_k: int, threshold: float,
        sheet_sources: set[str],
    ):
        """The best chunks of each named work's own text (not its sheet), sharing
        WORK_SHARE of top_k."""
        per_work = max(2, math.ceil(top_k * WORK_SHARE / len(works)))
        hits = []
        for sources in works.values():
            text = sources - sheet_sources
            if text:
                hits.extend(self.store.search(vector, top_k=per_work, score_threshold=threshold, sources=text))
        return hits[:top_k]

    def sources_for_subject(self, subject: str) -> set[str]:
        return {
            source
            for source, metadata in self.store.source_metadata().items()
            if subject_of(source, metadata.get("title") or "") == subject
        }

    def fit_context(self, chunks: Sequence[RetrievedChunk]) -> list[RetrievedChunk]:
        """Keep the best chunks that fit within ``max_context_chars``.

        The top chunk is always kept so a single long passage is never dropped,
        and key-points sheet chunks are kept without counting against the budget.
        """
        selected: list[RetrievedChunk] = []
        used = 0
        for chunk in chunks:
            # A named work's key-points sheet is already capped (MAX_SHEET_CHARS)
            # and is the one passage the answer cannot do without.
            if is_key_points(chunk.title):
                selected.append(chunk)
                continue
            if selected and used + len(chunk.text) > self.max_context_chars:
                continue
            selected.append(chunk)
            used += len(chunk.text)
        return selected


@dataclass(frozen=True)
class RetrievalCase:
    """A query and the chunk ids (or sources) that count as relevant."""

    query: str
    relevant_ids: frozenset[str] = frozenset()
    relevant_sources: frozenset[str] = frozenset()

    def is_relevant(self, chunk: RetrievedChunk) -> bool:
        return chunk.id in self.relevant_ids or chunk.source in self.relevant_sources


@dataclass(frozen=True)
class RetrievalMetrics:
    cases: int
    k: int
    hit_rate: float
    mrr: float
    precision_at_k: float
    recall_at_k: float


def evaluate_retrieval(
    retriever: Retriever, cases: Sequence[RetrievalCase], k: int = 5
) -> RetrievalMetrics:
    """Hit rate, MRR, precision@k and recall@k over labelled queries.

    Recall uses ``relevant_ids`` when given; for source-level labels it is the
    share of relevant sources that appear in the top k.
    """
    if not cases:
        raise ValueError("at least one retrieval case is required")
    hits = reciprocal_ranks = precision = recall = 0.0
    for case in cases:
        results = retriever.retrieve(case.query, top_k=k, score_threshold=-1.0)
        flags = [case.is_relevant(chunk) for chunk in results]
        if any(flags):
            hits += 1
            reciprocal_ranks += 1.0 / (flags.index(True) + 1)
        precision += sum(flags) / k
        if case.relevant_ids:
            found = {chunk.id for chunk in results} & case.relevant_ids
            recall += len(found) / len(case.relevant_ids)
        elif case.relevant_sources:
            found = {chunk.source for chunk in results} & case.relevant_sources
            recall += len(found) / len(case.relevant_sources)
    n = len(cases)
    return RetrievalMetrics(
        cases=n,
        k=k,
        hit_rate=hits / n,
        mrr=reciprocal_ranks / n,
        precision_at_k=precision / n,
        recall_at_k=recall / n,
    )
