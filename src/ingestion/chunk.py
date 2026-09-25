"""Recursive character text splitter for masked, Khmer-segmented text.

Input text is expected to have LaTeX replaced by placeholder tokens and Khmer
word boundaries marked with ZWSP (see ``khmer_segment``). The splitter:

* prefers paragraph, line and sentence boundaries (including Khmer ។ and ៕),
  then spaces, then Khmer word boundaries, and only then single clusters;
* never splits a placeholder token, whatever the chunk size;
* measures length as the *restored* text (formulas at their real length,
  ZWSP markers not counted);
* keeps separators attached to the end of the preceding piece, so sentence
  punctuation stays with its sentence.
"""
from __future__ import annotations

import bisect
import re
from collections.abc import Callable, Sequence
from dataclasses import dataclass, field, replace

from src.ingestion.khmer_segment import ZWSP, strip_word_boundaries
from src.ingestion.latex_guard import PLACEHOLDER_PATTERN, sub_vault, unmask_latex

DEFAULT_SEPARATORS: tuple[str, ...] = (
    "\n\n",
    "\n",
    "៕",   # ៕ end of section
    "។",   # ។ end of sentence
    "? ",
    "! ",
    ". ",
    "; ",
    ", ",
    " ",
    ZWSP,       # Khmer word boundary
    "",         # single clusters / characters
)

_ATOM = re.compile(
    PLACEHOLDER_PATTERN.pattern
    + r"|[ក-ឳ](?:្[ក-ឳ]|[឴-៑៓៝‌‍])*"
    + r"|.",
    re.DOTALL,
)
_TRIM_CHARS = " \t\n\r" + ZWSP
# Enough for a function definition and its domain, and small next to the spare
# room in the embedding window (the corpus sits at a median of 199 tokens of
# e5's 512), so carrying it costs retrieval nothing it did not already have.
STEM_CHARS = 200
_STEM_BREAKS = ("។", "៕", ". ", "\n")


@dataclass(frozen=True)
class Chunk:
    """A chunk of masked text plus the formulas its placeholders stand for."""

    text: str
    vault: dict[str, str] = field(default_factory=dict)
    index: int = 0
    page: int | None = None
    last_page: int | None = None
    heading: str = ""
    # The opening of the exercise this chunk continues, restored and plain. A
    # past-paper exercise runs past one chunk, and its later parts ("ខ. សិក្សា
    # អថេរភាព") only mean something next to the f(x) stated once at the top --
    # which lands in the first chunk alone. Carrying it makes every chunk
    # answerable on its own, and tells apart the many exercises that share a
    # heading as unhelpful as "VI. (២០ពិន្ទុ)". Empty on the first chunk,
    # which is the stem.
    stem: str = ""

    @property
    def restored_text(self) -> str:
        return unmask_latex(self.text, self.vault)

    @property
    def formula_count(self) -> int:
        return len(self.vault)


class RecursiveCharacterTextSplitter:
    def __init__(
        self,
        chunk_size: int = 500,
        chunk_overlap: int = 50,
        separators: Sequence[str] = DEFAULT_SEPARATORS,
        length_function: Callable[[str], int] = len,
    ) -> None:
        if chunk_size <= 0:
            raise ValueError("chunk_size must be positive")
        if chunk_overlap < 0:
            raise ValueError("chunk_overlap must be non-negative")
        if chunk_overlap >= chunk_size:
            raise ValueError("chunk_overlap must be smaller than chunk_size")
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.separators = list(separators)
        self.length_function = length_function

    def split_text(self, text: str) -> list[str]:
        return [chunk for chunk in self._split(text, self.separators) if chunk]

    # -- internals ----------------------------------------------------------

    def _split(self, text: str, separators: list[str]) -> list[str]:
        separator = ""
        remaining: list[str] = []
        for position, candidate in enumerate(separators):
            if candidate == "" or candidate in text:
                separator = candidate
                remaining = separators[position + 1:]
                break

        chunks: list[str] = []
        fitting: list[str] = []
        for piece in self._split_on(text, separator):
            if self.length_function(piece) <= self.chunk_size:
                fitting.append(piece)
                continue
            if fitting:
                chunks.extend(self._merge(fitting))
                fitting = []
            if remaining:
                chunks.extend(self._split(piece, remaining))
            else:
                # An atom larger than chunk_size (a very long formula) is kept whole.
                finished = self._finish(piece)
                if finished:
                    chunks.append(finished)
        if fitting:
            chunks.extend(self._merge(fitting))
        return chunks

    @staticmethod
    def _split_on(text: str, separator: str) -> list[str]:
        if separator == "":
            return _ATOM.findall(text)
        pieces = re.split(f"(?<={re.escape(separator)})", text)
        return [piece for piece in pieces if piece]

    def _merge(self, pieces: list[str]) -> list[str]:
        chunks: list[str] = []
        window: list[tuple[str, int]] = []
        total = 0
        for piece in pieces:
            length = self.length_function(piece)
            if window and total + length > self.chunk_size:
                finished = self._finish("".join(text for text, _ in window))
                if finished:
                    chunks.append(finished)
                # Drop pieces from the front until only the overlap remains
                # and the next piece fits.
                while window and (
                    total > self.chunk_overlap or total + length > self.chunk_size
                ):
                    total -= window.pop(0)[1]
            window.append((piece, length))
            total += length
        finished = self._finish("".join(text for text, _ in window))
        if finished:
            chunks.append(finished)
        return chunks

    @staticmethod
    def _finish(text: str) -> str:
        return text.strip(_TRIM_CHARS)


def derive_stem(opening: str, limit: int = STEM_CHARS) -> str:
    """The opening of an exercise, cut back to a sentence boundary.

    ``opening`` is the restored text of a run's first chunk. Cutting mid-formula
    or mid-Khmer-word would hand the embedder a fragment, so the text is trimmed
    at the last sentence end that fits, and only failing that at ``limit``.
    """
    text = strip_word_boundaries(opening).strip()
    if len(text) <= limit:
        return text
    window = text[:limit]
    cut = max(window.rfind(mark) + len(mark) for mark in _STEM_BREAKS)
    if cut > 0:
        return window[:cut].strip()
    # One long sentence: fall back to whole atoms, so the stem never ends in
    # half a Khmer cluster or half a placeholder.
    kept = 0
    for atom in _ATOM.finditer(text):
        if atom.end() > limit:
            break
        kept = atom.end()
    return text[:kept].strip()


def attach_stems(chunks: list[Chunk]) -> list[Chunk]:
    """Give every chunk after the first the opening of the run it belongs to.

    The first chunk is left alone: it already holds the stem, and repeating it
    would embed the same sentence twice.
    """
    if len(chunks) < 2:
        return chunks
    stem = derive_stem(chunks[0].restored_text)
    if not stem:
        return chunks
    return [chunks[0]] + [replace(chunk, stem=stem) for chunk in chunks[1:]]


def restored_length(vault: dict[str, str]) -> Callable[[str], int]:
    """Length of text as it will be displayed: formulas at full length,
    word-boundary markers not counted."""

    def _length(text: str) -> int:
        length = len(text) - text.count(ZWSP)
        for match in PLACEHOLDER_PATTERN.finditer(text):
            original = vault.get(match.group(0))
            if original is not None:
                length += len(original) - len(match.group(0))
        return length

    return _length


def chunk_text(
    masked_text: str,
    vault: dict[str, str],
    *,
    chunk_size: int = 500,
    chunk_overlap: int = 50,
    page: int | None = None,
    page_starts: Sequence[tuple[int, int | None]] | None = None,
    heading: str = "",
    start_index: int = 0,
) -> list[Chunk]:
    """Split masked text into ``Chunk`` objects, each with its own sub-vault.

    ``page_starts`` lists ``(offset, page)`` pairs, in offset order, for text
    that runs across pages; each chunk then gets the page it starts on and
    the page it ends on. Without it every chunk is on ``page``.
    """
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        length_function=restored_length(vault),
    )
    starts = list(page_starts) if page_starts else [(0, page)]
    offsets = [offset for offset, _ in starts]

    def page_at(position: int) -> int | None:
        return starts[max(0, bisect.bisect_right(offsets, position) - 1)][1]

    chunks: list[Chunk] = []
    cursor = 0
    for piece in splitter.split_text(masked_text):
        # Pieces are in order and are exact substrings of the input.
        position = masked_text.find(piece, cursor)
        if position < 0:
            position = cursor
        cursor = position + 1
        text = strip_word_boundaries(piece).strip()
        if not text:
            continue
        chunks.append(
            Chunk(
                text=text,
                vault=sub_vault(text, vault),
                index=start_index + len(chunks),
                page=page_at(position),
                last_page=page_at(position + len(piece) - 1),
                heading=heading,
            )
        )
    return attach_stems(chunks)
