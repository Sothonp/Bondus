"""Answers already given, kept so a repeated question costs no LLM call.

An answer is stored under a hash of everything that shaped it: the normalised
question, the passages retrieved for it (by chunk id), the language, subject,
track and system prompt. Only questions asked without chat history or photos
are cached -- those answers depend on more than the question. Entries expire
after ``ttl_seconds``; SQLite keeps them across restarts on the same disk.
"""
from __future__ import annotations

import hashlib
import json
import logging
import sqlite3
import threading
import time
import unicodedata
from collections.abc import Sequence
from dataclasses import dataclass
from pathlib import Path

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
            self._db.commit()
