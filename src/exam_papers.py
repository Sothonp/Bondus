"""Past BAC II papers, reassembled from the index, as models for a new paper.

The index holds each paper as chunks. Generating a new paper needs whole
papers instead, in page order: their header (session, duration, total
points), how many exercises there are, how the points are split and how the
questions are worded. ``past_papers`` puts a subject's chunks back together
and splits them into one paper per exam session. A single-year file
(``Science/physics/2019.pdf``) is one paper; a compilation (the 2002-2023
mathematics book) starts every year with a ``សម័យប្រឡង`` line and becomes one
paper per year.

Worked answers are cut: they would spend the prompt on solutions to questions
the new paper must not repeat.
"""
from __future__ import annotations

import random
import re
from collections import defaultdict
from collections.abc import Sequence
from dataclasses import dataclass

from src.ingestion.khmer_segment import strip_word_boundaries
from src.ingestion.latex_guard import unmask_latex
from src.retrieval.retriever import RetrievedChunk
from src.subjects import subject_of
from src.vectorstore import InMemoryVectorStore

# "សម័យប្រឡង៖ ២២ កក្កដា ២០០២" opens every paper, in a single-year file and in a compilation.
SESSION_LINE = re.compile(r"^\s*[#*\s]*សម័យប្រឡង")

# A line that is only an answers heading: "ចម្លើយ", "## ដំណោះស្រាយ", "**Corrigé :**".
# "កំណត់ចម្លើយ g(x)" inside a question is not one, so the whole line must match.
ANSWERS_HEADING = re.compile(
    r"^\s*[#*\s]*(ចម្លើយ|ចម្លើយគំរូ|ដំណោះស្រាយ|កំណែ|កំណែប្រឡង|answers?|answer key|solutions?|corrigé|correction)"
    r"[\s*:៖.]*$",
    re.IGNORECASE,
)

# Shorter than this is a stray header or a page footer, not a paper.
MIN_PAPER_CHARS = 300

KHMER_DIGITS = str.maketrans("០១២៣៤៥៦៧៨៩", "0123456789")
YEAR = re.compile(r"(?<!\d)(19[89]\d|20\d\d)(?!\d)")


# "រយៈពេល ១៥០ នាទី", "Time: 90 minutes"; "ពិន្ទុ: ៧៥", "Score: 75 points".
DURATION = re.compile(r"(?:រយៈពេល|time|duration|durée)\s*[:៖]?\s*(\d+)\s*(?:នាទី|min)", re.IGNORECASE)
TOTAL = re.compile(r"(?:ពិន្ទុ|score|points|marks|total)\s*[:៖]?\s*(\d+)", re.IGNORECASE)
# "I. (១០ពិន្ទុ) ...", "**II.** (15 points)", "III. ..." at the start of a line.
EXERCISE = re.compile(
    r"^[\s#*>-]*([IVX]{1,4})\s*[.)]\**\s*(?:\(\s*(\d+)\s*(?:ពិន្ទុ|pts?|points?|marks?)\s*\))?",
    re.IGNORECASE | re.MULTILINE,
)
ROMAN = {"I": 1, "II": 2, "III": 3, "IV": 4, "V": 5, "VI": 6, "VII": 7, "VIII": 8, "IX": 9, "X": 10,
         "XI": 11, "XII": 12, "XIII": 13, "XIV": 14, "XV": 15}


@dataclass(frozen=True)
class PaperFormat:
    """What a paper's header and exercise numbers say, read without a model."""

    duration_minutes: int | None
    total_points: int | None
    exercises: tuple[tuple[str, int | None], ...]  # ("I", 10), ("II", 15), ...

    @property
    def points_add_up(self) -> bool:
        points = [p for _, p in self.exercises if p is not None]
        return bool(points) and len(points) == len(self.exercises) and sum(points) == self.total_points


def paper_format(text: str) -> PaperFormat:
    """The duration, total points and exercises of one past paper.

    Exercises are read in order, I. then II. and so on, so a numbered line in an
    answer or a reading passage ("V. Hugo") does not count as one.
    """
    plain = text.translate(KHMER_DIGITS)
    first = EXERCISE.search(plain)
    header = plain[: first.start()] if first else plain[:600]
    duration = DURATION.search(header) or DURATION.search(plain[:1500])
    total = TOTAL.search(header)
    exercises: list[tuple[str, int | None]] = []
    for match in EXERCISE.finditer(plain):
        numeral = match.group(1).upper()
        if ROMAN.get(numeral) != len(exercises) + 1:
            continue
        exercises.append((numeral, int(match.group(2)) if match.group(2) else None))
    return PaperFormat(
        duration_minutes=int(duration.group(1)) if duration else None,
        total_points=int(total.group(1)) if total else None,
        exercises=tuple(exercises),
    )


@dataclass(frozen=True)
class PastPaper:
    source: str
    year: int | None
    title: str
    text: str


def year_in(text: str) -> int | None:
    """The first plausible exam year in ``text``, in Khmer or Arabic digits."""
    match = YEAR.search(text.translate(KHMER_DIGITS))
    return int(match.group(1)) if match else None


def _split_sessions(text: str) -> list[str]:
    """One string per exam session. Text before the first session line (a
    title page) stays with the first paper."""
    papers: list[list[str]] = [[]]
    seen_session = False
    for line in text.splitlines():
        if SESSION_LINE.match(line):
            if seen_session:
                papers.append([])
            seen_session = True
        papers[-1].append(line)
    return ["\n".join(lines).strip() for lines in papers if "\n".join(lines).strip()]


def _without_answers(text: str) -> str:
    lines = text.splitlines()
    for number, line in enumerate(lines):
        if ANSWERS_HEADING.match(line):
            return "\n".join(lines[:number]).strip()
    return text.strip()


def past_papers(store: InMemoryVectorStore, subject: str) -> list[PastPaper]:
    """Every indexed paper of ``subject``, newest first (undated papers last)."""
    metadata = store.source_metadata()
    by_source = defaultdict(list)
    for record in store.records():
        title = metadata.get(record.source, {}).get("title") or ""
        if subject_of(record.source, title) == subject:
            by_source[record.source].append(record)

    papers: list[PastPaper] = []
    for source, records in by_source.items():
        title = metadata.get(source, {}).get("title") or ""
        records.sort(key=lambda record: record.chunk_index)
        text = "\n".join(strip_word_boundaries(unmask_latex(r.text, r.vault)) for r in records)
        sessions = _split_sessions(text)
        for session in sessions:
            questions = _without_answers(session)
            if len(questions) < MIN_PAPER_CHARS:
                continue
            # A compilation names its year in each session line; a single-year
            # file may only name it in its path or catalog title.
            year = year_in(session[:400])
            if year is None and len(sessions) == 1:
                year = year_in(source) or year_in(title)
            papers.append(PastPaper(source=source, year=year, title=title, text=questions))
    papers.sort(key=lambda paper: (paper.year is None, -(paper.year or 0), paper.source))
    return papers


def _clip(text: str, limit: int) -> str:
    """At most ``limit`` characters, cut at a line end."""
    if len(text) <= limit:
        return text
    cut = text.rfind("\n", 0, limit)
    return text[: cut if cut > limit // 2 else limit].rstrip() + "\n[…]"


def choose_reference_papers(
    papers: Sequence[PastPaper],
    *,
    budget_chars: int,
    max_papers: int,
    seed: int | None = None,
) -> list[PastPaper]:
    """The papers the model studies before writing a new one.

    The newest paper always comes first: it shows the format the student will
    actually sit. The rest are a seeded sample of the other years, so each new
    paper draws on a different mix while one paper's continuation (same seed)
    sees exactly the same models. One year is used once, whichever file it
    came from. The newest paper may fill up to half of ``budget_chars``, so the
    format the model copies is seen whole; the others share the rest.
    """
    unique: list[PastPaper] = []
    years: set[int] = set()
    for paper in papers:
        if paper.year is not None:
            if paper.year in years:
                continue
            years.add(paper.year)
        unique.append(paper)
    if not unique:
        return []
    newest, rest = unique[0], unique[1:]
    sample = random.Random(seed).sample(rest, min(len(rest), max(0, max_papers - 1)))
    sample.sort(key=lambda paper: (paper.year is None, -(paper.year or 0)))
    chosen = [newest, *sample]
    share = max(1500, budget_chars // len(chosen))
    clipped: list[PastPaper] = []
    used = 0
    for paper in chosen:
        text = _clip(paper.text, max(share, budget_chars // 2) if not clipped else share)
        if clipped and used + len(text) > budget_chars:
            break
        clipped.append(PastPaper(paper.source, paper.year, paper.title, text))
        used += len(text)
    return clipped


def as_chunks(papers: Sequence[PastPaper], subject: str) -> list[RetrievedChunk]:
    """The papers in the shape the generators trim from (the last goes first)."""
    return [
        RetrievedChunk(
            id=f"{paper.source}#{paper.year or number}",
            source=paper.source,
            chunk_index=number,
            page=None,
            score=1.0,
            text=paper.text,
            title=paper.title,
            heading=str(paper.year) if paper.year else "",
            subject=subject,
        )
        for number, paper in enumerate(papers)
    ]


def reference_format(papers: Sequence[PastPaper], *, newest: int = 6) -> PaperFormat | None:
    """The format a new paper copies: the newest paper whose exercise points add
    up to its total, else the newest with a readable duration or total."""
    formats = [paper_format(paper.text) for paper in papers[:newest]]
    for found in formats:
        if found.points_add_up:
            return found
    for found in formats:
        if found.duration_minutes or found.total_points:
            return found
    return None


def describe_format(found: PaperFormat | None) -> str:
    """``found`` in words for the model; empty when nothing could be read."""
    if found is None:
        return ""
    lines = []
    if found.duration_minutes:
        lines.append(f"Duration: {found.duration_minutes} minutes")
    if found.total_points:
        lines.append(f"Total: {found.total_points} points")
    if found.points_add_up:
        split = ", ".join(f"{numeral} ({points} points)" for numeral, points in found.exercises)
        lines.append(f"Exercises: {len(found.exercises)}: {split}; they add up to {found.total_points}")
    elif found.exercises:
        lines.append(f"Exercises: {len(found.exercises)} (I to {found.exercises[-1][0]})")
    return "\n".join(lines)
