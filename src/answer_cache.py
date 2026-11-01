"""Answers already given, kept so a repeated question costs no LLM call.

An answer is stored under a hash of everything that shaped it: the normalised
question, the passages retrieved for it (by chunk id), the language, subject,
track and system prompt. Only questions asked without chat history or photos
are cached -- those answers depend on more than the question. Entries expire
after ``ttl_seconds``; SQLite keeps them across restarts on the same disk.

A reworded question ("តើលីមីតជាអ្វី?" / "លីមីតគឺជាអ្វី?") misses that exact key, so
each answer also keeps its question's embedding: a new question in the same scope
(language, subject, track, prompt) reuses it when the two are near-identical in
meaning, ask about the same numbers and formulas, and retrieved mostly the same
passages. Similarity alone is not enough -- questions about two different novels
score as high as a paraphrase -- so the passages must agree too.
"""
from __future__ import annotations

import hashlib
import json
import logging
import re
import sqlite3
import threading
import time
import unicodedata
from collections.abc import Sequence
from dataclasses import dataclass
from pathlib import Path

import numpy as np

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class CachedAnswer:
    text: str
    provider: str | None
    model: str | None
    stop_reason: str | None


def normalize_question(question: str) -> str:
    """Case, spacing and Unicode form do not make a different question."""
    return " ".join(unicodedata.normalize("NFC", question).casefold().split())


# What must match exactly for a reworded question to count as the same one:
# its numbers, LaTeX commands and operators ("x^2-5x+6" is not "x^2-5x+7").
_SIGNATURE = re.compile(r"\d+(?:[.,]\d+)?|\\[a-z]+|[=+\-*/^<>√∫∑π]")
_KHMER_DIGITS = str.maketrans("០១២៣៤៥៦៧៨៩", "0123456789")


def question_signature(question: str) -> str:
    text = normalize_question(question).translate(_KHMER_DIGITS)
    return " ".join(sorted(set(_SIGNATURE.findall(text))))


def passage_overlap(a: Sequence[str], b: Sequence[str]) -> float:
    """Shared passages over all passages (Jaccard); 1.0 when neither has any."""
    left, right = set(a), set(b)
    if not left and not right:
        return 1.0
    return len(left & right) / len(left | right)


def cache_key(question: str, chunk_ids: Sequence[str], **context: str | None) -> str:
    payload = json.dumps(
        {"q": normalize_question(question), "chunks": list(chunk_ids), **context},
        ensure_ascii=False, sort_keys=True,
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


class AnswerCache:
    def __init__(self, path: str | Path, ttl_seconds: float) -> None:
        self.ttl_seconds = ttl_seconds
        self._lock = threading.Lock()
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        self._db = sqlite3.connect(str(path), check_same_thread=False)
        self._db.execute(
            "CREATE TABLE IF NOT EXISTS answers ("
            "key TEXT PRIMARY KEY, text TEXT NOT NULL, provider TEXT, model TEXT, "
            "stop_reason TEXT, created REAL NOT NULL)"
        )
        self._db.execute(
            "CREATE TABLE IF NOT EXISTS similar ("
            "key TEXT PRIMARY KEY, scope TEXT NOT NULL, signature TEXT NOT NULL, "
            "chunks TEXT NOT NULL, vector BLOB NOT NULL, created REAL NOT NULL)"
        )
        self._db.execute("CREATE INDEX IF NOT EXISTS similar_scope ON similar (scope, signature)")
        self._db.commit()

    def get(self, key: str) -> CachedAnswer | None:
        with self._lock:
            row = self._db.execute(
                "SELECT text, provider, model, stop_reason, created FROM answers WHERE key = ?", (key,)
            ).fetchone()
            if row is None:
                return None
            if time.time() - row[4] > self.ttl_seconds:
                self._db.execute("DELETE FROM answers WHERE key = ?", (key,))
                self._db.commit()
                return None
        return CachedAnswer(*row[:4])

    def put(self, key: str, answer: CachedAnswer) -> None:
        with self._lock:
            self._db.execute(
                "INSERT OR REPLACE INTO answers VALUES (?, ?, ?, ?, ?, ?)",
                (key, answer.text, answer.provider, answer.model, answer.stop_reason, time.time()),
            )
            self._db.execute("DELETE FROM answers WHERE created < ?", (time.time() - self.ttl_seconds,))
            self._db.execute("DELETE FROM similar WHERE created < ?", (time.time() - self.ttl_seconds,))
            self._db.commit()

    def put_similar(
        self, key: str, scope: str, question: str, chunk_ids: Sequence[str], vector: np.ndarray,
    ) -> None:
        """Make the answer stored under ``key`` findable by reworded questions."""
        unit = _unit(vector)
        if unit is None:
            return
        with self._lock:
            self._db.execute(
                "INSERT OR REPLACE INTO similar VALUES (?, ?, ?, ?, ?, ?)",
                (key, scope, question_signature(question), json.dumps(list(chunk_ids)),
                 unit.tobytes(), time.time()),
            )
            self._db.commit()

    def find_similar(
        self, scope: str, question: str, chunk_ids: Sequence[str], vector: np.ndarray,
        *, min_similarity: float, min_overlap: float,
    ) -> tuple[CachedAnswer, float] | None:
        """The answer to the closest earlier question that passes every check,
        with its similarity, or None."""
        unit = _unit(vector)
        if unit is None:
            return None
        with self._lock:
            rows = self._db.execute(
                "SELECT key, chunks, vector FROM similar WHERE scope = ? AND signature = ? AND created >= ?",
                (scope, question_signature(question), time.time() - self.ttl_seconds),
            ).fetchall()
        best: tuple[float, str] | None = None
        for key, chunks, blob in rows:
            stored = np.frombuffer(blob, dtype=np.float32)
            if stored.shape != unit.shape:
                continue  # stored under another embedding model
            similarity = float(stored @ unit)
            if similarity < min_similarity or passage_overlap(json.loads(chunks), chunk_ids) < min_overlap:
                continue
            if best is None or similarity > best[0]:
                best = (similarity, key)
        if best is None:
            return None
        answer = self.get(best[1])
        return (answer, best[0]) if answer is not None else None


def _unit(vector: np.ndarray) -> np.ndarray | None:
    vector = np.asarray(vector, dtype=np.float32).reshape(-1)
    norm = float(np.linalg.norm(vector))
    return vector / norm if norm else None
