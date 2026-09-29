"""Semantic chunk boundaries chosen by a local Llama model (Ollama).

The recursive splitter cuts wherever the size runs out, so an exercise, a
theorem and its proof, or a definition and its worked example can land half in
one chunk and half in the next. Here the text is first cut into small units
(sentences, or less) by that same splitter, and Llama 3 is shown them numbered
and asked only *where a new chunk starts*. It never rewrites text: the chunks
are exact spans of the input, so no formula placeholder can be split, lost or
altered and every Khmer cluster stays whole.

The model's answer is a list of unit numbers, which is then held to the size
limits: a group longer than ``max_chars`` is packed back into pieces that fit,
and one shorter than ``min_chars`` joins its neighbour. Any failure -- Ollama
not running, a timeout, an answer that is not JSON -- falls back to the
recursive splitter for that stream, and the result says so, so an incremental
ingest tries the file again once the model is back.

Answers are cached on disk by model and units, so a dry run followed by a real
run, or an interrupted run resumed, asks the model nothing twice.
"""
from __future__ import annotations

import hashlib
import json
import logging
import re
from collections.abc import Sequence
from dataclasses import dataclass
from pathlib import Path

import httpx

from src.ingestion.chunk import RecursiveCharacterTextSplitter, restored_length
from src.ingestion.khmer_segment import strip_word_boundaries
from src.ingestion.latex_guard import unmask_latex

logger = logging.getLogger(__name__)

RECURSIVE = "recursive"
# Bumped when the prompt or the post-processing changes, so an incremental
# ingest re-chunks what the old version chunked.
PROMPT_VERSION = 1
# How much of one unit the model is shown. Units are cut at ``unit_chars``, so
# this only trims an oversized atom such as a very long formula.
_UNIT_PREVIEW_CHARS = 400

_SYSTEM_PROMPT = """\
You split study material (Cambodian Grade 12 mathematics, in Khmer and \
English, with LaTeX formulas) into chunks for a search index. A student's \
question will be matched against single chunks, so each chunk must make sense \
on its own.

You are given numbered units of text, in reading order. Decide where each new \
chunk STARTS. Rules:
- Keep together what belongs together: one exercise with all its parts \
(ក. ខ. គ. / a) b) c)), a definition with its example, a theorem with its \
proof, a formula with the conditions under which it holds.
- Start a new chunk at a new exercise, topic, definition, theorem or section.
- A chunk should hold about {target} characters and never more than {limit}.
- Never reorder, skip or merge units out of order.

Reply with JSON only, in this exact shape: {{"starts": [0, ...]}} -- the \
numbers of the units that begin a chunk, ascending, always including 0."""


@dataclass(frozen=True)
class SpanResult:
    """Chunk spans over the masked text, and which chunker produced them."""

    spans: list[tuple[int, int]]
    chunker: str


class LlamaChunker:
    """Choose chunk boundaries with a local Llama model served by Ollama."""

    def __init__(
        self,
        *,
        model: str = "llama3:8b",
        base_url: str = "http://localhost:11434",
        chunk_size: int = 500,
        chunk_overlap: int = 50,
        max_chars: int = 1000,
        unit_chars: int = 160,
        window_chars: int = 2500,
        timeout_seconds: float = 180.0,
        num_ctx: int = 8192,
        cache_dir: Path | None = None,
        client: httpx.Client | None = None,
    ) -> None:
        if not 0 < unit_chars < max_chars:
            raise ValueError("unit_chars must be positive and smaller than max_chars")
        if window_chars < max_chars:
            raise ValueError("window_chars must be at least max_chars")
        self.model = model
        self.base_url = base_url.rstrip("/")
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.max_chars = max_chars
        self.min_chars = max(unit_chars, chunk_size // 4)
        self.unit_chars = unit_chars
        self.window_chars = window_chars
        self.num_ctx = num_ctx
        self.cache_dir = cache_dir
        self._client = client or httpx.Client(timeout=timeout_seconds)
        # Once Ollama is unreachable, stop paying a connection timeout per stream.
        self._unreachable = False

    @property
    def identity(self) -> str:
        """What produced the chunks, recorded with them for incremental ingest."""
        return f"llama:{self.model}:v{PROMPT_VERSION}:{self.max_chars}:{self.unit_chars}"

    def check(self) -> str | None:
        """None when Ollama serves the model, else why not."""
        try:
            response = self._client.get(f"{self.base_url}/api/tags", timeout=5)
            response.raise_for_status()
            names = {item.get("name") for item in response.json().get("models", [])}
        except (httpx.HTTPError, ValueError) as exc:
            return f"Ollama is not reachable at {self.base_url} ({exc})"
        if self.model not in names and f"{self.model}:latest" not in names:
            return f"Ollama has no model '{self.model}' (run `ollama pull {self.model}`)"
        return None

    # -- splitting -------------------------------------------------------------

    def spans(self, masked_text: str, vault: dict[str, str]) -> SpanResult:
        """Chunk spans (start, end) over ``masked_text``, in order."""
        length = restored_length(vault)
        units = _locate(
            masked_text,
            RecursiveCharacterTextSplitter(
                chunk_size=self.unit_chars, chunk_overlap=0, length_function=length
            ).split_text(masked_text),
        )
        if not units:
            return SpanResult([], self.identity)
        if length(masked_text) <= self.max_chars:
            # Fits in one chunk; nothing for the model to decide.
            return SpanResult([(units[0][0], units[-1][1])], self.identity)
        if self._unreachable:
            return self._fallback(masked_text, vault)

        sizes = [length(masked_text[start:end]) for start, end in units]
        previews = [
            strip_word_boundaries(unmask_latex(masked_text[start:end], vault))[:_UNIT_PREVIEW_CHARS]
            for start, end in units
        ]
        groups: list[tuple[int, int]] = []  # unit ranges [first, last)
        cursor = 0
        while cursor < len(units):
            stop, total = cursor, 0
            while stop < len(units) and (stop == cursor or total + sizes[stop] <= self.window_chars):
                total += sizes[stop]
                stop += 1
            try:
                starts = self._ask(previews[cursor:stop])
            except (httpx.HTTPError, ValueError) as exc:
                if isinstance(exc, httpx.TransportError):
                    self._unreachable = True
                logger.warning("Llama chunking failed (%s); using the recursive splitter", exc)
                return self._fallback(masked_text, vault)
            window = [(cursor + a, cursor + b) for a, b in zip(starts, starts[1:] + [stop - cursor])]
            if stop < len(units) and len(window) > 1:
                # The last group may run on past the window: let the next
                # window, which sees how it continues, decide where it ends.
                window.pop()
            groups.extend(window)
            cursor = window[-1][1]

        groups = self._fit(groups, sizes)
        return SpanResult([(units[a][0], units[b - 1][1]) for a, b in groups], self.identity)

    def _fallback(self, masked_text: str, vault: dict[str, str]) -> SpanResult:
        pieces = RecursiveCharacterTextSplitter(
            chunk_size=self.chunk_size,
            chunk_overlap=self.chunk_overlap,
            length_function=restored_length(vault),
        ).split_text(masked_text)
        return SpanResult(_locate(masked_text, pieces), RECURSIVE)

    def _fit(self, groups: list[tuple[int, int]], sizes: Sequence[int]) -> list[tuple[int, int]]:
        """Hold the model's groups to ``min_chars``..``max_chars``."""
        fitted: list[tuple[int, int]] = []
        for first, last in groups:
            # Too long: pack its units greedily into pieces that fit.
            start, total = first, 0
            for unit in range(first, last):
                if unit > start and total + sizes[unit] > self.max_chars:
                    fitted.append((start, unit))
                    start, total = unit, 0
                total += sizes[unit]
            fitted.append((start, last))
        merged: list[tuple[int, int]] = []
        for first, last in fitted:
            size = sum(sizes[first:last])
            if merged:
                previous = sum(sizes[merged[-1][0]:merged[-1][1]])
                if (size < self.min_chars or previous < self.min_chars) and previous + size <= self.max_chars:
                    merged[-1] = (merged[-1][0], last)
                    continue
            merged.append((first, last))
        return merged

    # -- the model ---------------------------------------------------------------

    def _ask(self, previews: list[str]) -> list[int]:
        """Unit numbers (relative to ``previews``) that start a chunk."""
        if len(previews) == 1:
            return [0]
        system = _SYSTEM_PROMPT.format(target=self.chunk_size, limit=self.max_chars)
        user = "\n".join(f"[{number}] {' '.join(text.split())}" for number, text in enumerate(previews))
        cache_file = self._cache_file(system, user)
        if cache_file is not None and cache_file.is_file():
            try:
                return _clean_starts(json.loads(cache_file.read_text(encoding="utf-8")), len(previews))
            except ValueError:
                cache_file.unlink(missing_ok=True)

        response = self._client.post(
            f"{self.base_url}/api/chat",
            json={
                "model": self.model,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                "stream": False,
                "format": "json",
                "options": {"temperature": 0, "num_ctx": self.num_ctx},
            },
        )
        response.raise_for_status()
        content = response.json().get("message", {}).get("content", "")
        answer = _parse_answer(content)
        starts = _clean_starts(answer, len(previews))
        if cache_file is not None:
            cache_file.parent.mkdir(parents=True, exist_ok=True)
            cache_file.write_text(json.dumps(answer), encoding="utf-8")
        return starts

    def _cache_file(self, system: str, user: str) -> Path | None:
        if self.cache_dir is None:
            return None
        digest = hashlib.sha256(f"{self.model}\x00{system}\x00{user}".encode("utf-8")).hexdigest()
        return self.cache_dir / digest[:2] / f"{digest}.json"


def _locate(text: str, pieces: list[str]) -> list[tuple[int, int]]:
    """Spans of ``pieces``, which are in order and exact substrings of ``text``."""
    spans: list[tuple[int, int]] = []
    cursor = 0
    for piece in pieces:
        position = text.find(piece, cursor)
        if position < 0:
            position = cursor
        spans.append((position, position + len(piece)))
        cursor = position + 1
    return spans


_NUMBERS = re.compile(r"\d+")


def _parse_answer(content: str) -> object:
    """The model's JSON, or the list of numbers it wrote if it wrote no JSON."""
    try:
        return json.loads(content)
    except ValueError:
        numbers = [int(number) for number in _NUMBERS.findall(content)]
        if not numbers:
            raise ValueError(f"no chunk starts in the model's answer: {content[:200]!r}") from None
        return {"starts": numbers}


def _clean_starts(answer: object, count: int) -> list[int]:
    """Valid, ascending chunk starts in ``range(count)``, beginning at 0."""
    if isinstance(answer, dict):
        answer = answer.get("starts", next(iter(answer.values()), None) if answer else None)
    if not isinstance(answer, list):
        raise ValueError(f"expected a list of chunk starts, got {answer!r:.200}")
    starts = {0}
    for value in answer:
        try:
            number = int(value)
        except (TypeError, ValueError):
            continue
        if 0 <= number < count:
            starts.add(number)
    return sorted(starts)


def build_chunker(settings) -> LlamaChunker | None:
    """The configured semantic chunker, or None for the recursive splitter."""
    if settings.chunker != "llama":
        return None
    return LlamaChunker(
        model=settings.llama_chunk_model,
        base_url=settings.ollama_base_url,
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap,
        max_chars=settings.llama_chunk_max_chars,
        unit_chars=settings.llama_chunk_unit_chars,
        window_chars=settings.llama_chunk_window_chars,
        timeout_seconds=settings.llama_chunk_timeout_seconds,
        cache_dir=settings.llama_chunk_cache_dir,
    )


__all__ = ["RECURSIVE", "LlamaChunker", "SpanResult", "build_chunker"]
