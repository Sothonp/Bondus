"""Page OCR that pairs the local Khmer model with a vision model.

Neither engine reads a Khmer maths page well on its own:

* Kiri (local, free) is accurate on Khmer script but transcribes no formulas --
  ``khmer_words_only`` deletes Latin letters, digits and math symbols, because
  Kiri misreads them.
* Gemini and Groq read formulas as LaTeX and keep the page structure, but they
  garble Khmer words, especially the vowel and COENG clusters.

``HybridPageOCR`` runs Kiri first and passes its reading to the vision model as
a reference for Khmer spelling (``KHMER_HINT_TEMPLATE``), so one transcript
keeps the correct Khmer *and* the mathematics. The merge happens inside the
vision model, which sees the page image as well as the reading, rather than in
string surgery here -- aligning two transcripts that disagree about line breaks
is exactly the kind of guesswork that corrupts a corpus.

When every vision engine fails, the page falls back to Kiri's Khmer-only
reading: prose without formulas still retrieves, and a missing page does not.
That fallback is reported as incomplete so it is never cached, and a re-run
after a quota resets transcribes the page properly. Set ``require_vision`` to
fail the page instead.

``combine`` decides what happens when several vision engines are configured:

* ``first`` asks them in order and keeps the first usable reading, so a page
  costs one vision call while the first engine has quota.
* ``ensemble`` asks all of them at once, each with Kiri's reading as its hint,
  and keeps the best reading (``pick_reading``). The readings are compared,
  never spliced: a transcript is kept whole, so every formula stays in the
  sentence that introduces it and the chunker sees coherent text. Costs one
  call per engine per page.
"""
from __future__ import annotations

import hashlib
import logging
import re
import threading
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

from src.ingestion.latex_guard import LATEX_PATTERN, PLACEHOLDER_PATTERN, mask_latex
from src.ingestion.ocr import CachedPageOCR, OCRError, PageImage, has_chinese, leaked_reasoning

logger = logging.getLogger(__name__)

HYBRID_CACHE_VERSION = "1"

Combine = Literal["first", "ensemble"]

_KHMER_WORD = re.compile(r"[\u1780-\u17DD]{2,}")
_SPACES = re.compile(r"\s+")
_REPEATED_LINE = 4


def engine_name(engine: CachedPageOCR) -> str:
    return f"{engine.engine}:{engine.model}"


def reading_problems(text: str) -> list[str]:
    """Why a vision reading is unfit for the index; empty when it is fine."""
    problems = []
    if leaked_reasoning(text):
        problems.append("reasoning leak")
    if has_chinese(text):
        problems.append("Chinese text")
    masked, _ = mask_latex(text)
    if PLACEHOLDER_PATTERN.sub("", masked).replace("\\$", "").count("$"):
        problems.append("unbalanced $")
    lines = [line.strip() for line in text.splitlines() if len(line.strip()) > 3]
    if lines and max(lines.count(line) for line in set(lines)) >= _REPEATED_LINE:
        problems.append("repeated lines")
    return problems


def _formulas(text: str) -> set[str]:
    """Formulas with delimiters and spacing dropped, so equal maths compares equal."""
    return {
        _SPACES.sub("", match.group(0).strip("$")).removeprefix("\\[").removesuffix("\\]")
        for match in LATEX_PATTERN.finditer(text)
    }


@dataclass
class Reading:
    engine: str
    text: str
    truncated: bool
    problems: list[str]
    khmer_agreement: float = 0.0
    formula_support: float = 0.0
    formula_coverage: float = 0.0

    @property
    def score(self) -> float:
        return (
            0.4 * self.khmer_agreement
            + 0.35 * self.formula_support
            + 0.25 * self.formula_coverage
        )


def pick_reading(readings: list[Reading], khmer_text: str | None) -> Reading | None:
    """The best of several vision readings of one page, or None if none is usable.

    A reading with a problem (``reading_problems``) is out. The rest are scored:

    * Khmer agreement -- the share of Kiri's words the reading spells the same
      way. Kiri is the authority on Khmer, so this rewards the reading that
      took its hint.
    * Formula support -- the share of the reading's formulas that another
      engine also wrote. Two models agreeing on ``\\frac{x}{2}`` is evidence
      that it is on the page; a formula only one model saw may be invented.
    * Formula coverage -- its formula count against the most any reading has,
      so a reading that skipped half the maths loses to one that did not.

    A cut-off reading is used only when no complete one is left.
    """
    usable = [reading for reading in readings if not reading.problems]
    if not usable:
        return None
    kiri_words = set(_KHMER_WORD.findall(khmer_text or ""))
    formulas = {id(reading): _formulas(reading.text) for reading in usable}
    most = max((len(found) for found in formulas.values()), default=0)
    for reading in usable:
        mine = formulas[id(reading)]
        others = set().union(*(formulas[id(o)] for o in usable if o is not reading))
        if kiri_words:
            reading.khmer_agreement = sum(w in reading.text for w in kiri_words) / len(kiri_words)
        # Alone, or with nothing to compare, there is no evidence either way.
        reading.formula_support = len(mine & others) / len(mine) if mine and others else 0.5
        reading.formula_coverage = len(mine) / most if most else 1.0
    complete = [reading for reading in usable if not reading.truncated] or usable
    return max(complete, key=lambda reading: reading.score)


class HybridPageOCR(CachedPageOCR):
    """Kiri reads the Khmer, a vision model reads the mathematics."""

    engine = "hybrid"

    def __init__(
        self,
        *,
        khmer: CachedPageOCR | None,
        vision: list[CachedPageOCR],
        mode: Literal["auto", "always"] = "auto",
        min_chars: int = 20,
        cache_dir: str | Path | None = None,
        concurrency: int = 4,
        require_vision: bool = False,
        combine: Combine = "first",
    ) -> None:
        if khmer is None and not vision:
            raise ValueError("HybridPageOCR needs a Khmer engine, a vision engine, or both")
        super().__init__(
            mode=mode, min_chars=min_chars, cache_dir=cache_dir, concurrency=concurrency
        )
        self.khmer = khmer
        self.vision = list(vision)
        self.require_vision = require_vision
        self.combine = combine
        # Pages run on a worker pool, so the "this reading is degraded" flag
        # that ``_cacheable`` reads has to be per-thread.
        self._degraded = threading.local()
        self.model = "+".join(
            engine_name(part) for part in ([khmer] if khmer else []) + self.vision
        )

    def warmup(self) -> None:
        warm = getattr(self.khmer, "warmup", None)
        if warm is not None:
            warm()

    # -- cache ----------------------------------------------------------------

    def _cache_key(self, payload: PageImage) -> str:
        """Keyed on both engines: changing either one changes the transcript.

        The sub-engines keep their own entries as well, so re-running after a
        vision engine is swapped out still reuses Kiri's reading of the page.
        """
        digest = hashlib.sha256()
        parts = ["hybrid", HYBRID_CACHE_VERSION]
        if self.khmer is not None:
            parts.append(self.khmer._cache_key(payload))
        parts.extend(engine_name(engine) for engine in self.vision)
        if self.combine != "first":
            parts.append(f"combine={self.combine}")
        parts.append(payload.mime_type)
        for part in parts:
            digest.update(part.encode("utf-8") + b"\x00")
        digest.update(payload.data)
        return digest.hexdigest()

    # -- transcription --------------------------------------------------------

    def _read_khmer(self, payload: PageImage) -> str | None:
        if self.khmer is None:
            return None
        try:
            text, _ = self.khmer.transcribe_page(payload)
        except OCRError as exc:
            logger.warning("Khmer OCR failed, reading the page without it: %s", exc)
            return None
        return text.strip() or None

    def _read_one(self, engine: CachedPageOCR, payload: PageImage, hint: str | None) -> Reading | None:
        name = engine_name(engine)
        try:
            text, truncated = engine.transcribe_page(payload, hint)
        except OCRError as exc:
            logger.warning("Page OCR with %s failed: %s", name, exc)
            return None
        if not text.strip():
            logger.warning("Page OCR with %s returned nothing", name)
            return None
        reading = Reading(name, text.strip(), truncated, reading_problems(text))
        if reading.problems:
            logger.warning("Page OCR with %s rejected: %s", name, ", ".join(reading.problems))
        return reading

    def _read_vision(self, payload: PageImage, hint: str | None) -> tuple[str, bool] | None:
        """The reading ``combine`` picks, or None if no engine gave a usable one."""
        if self.combine == "ensemble" and len(self.vision) > 1:
            with ThreadPoolExecutor(max_workers=len(self.vision)) as pool:
                found = list(pool.map(lambda e: self._read_one(e, payload, hint), self.vision))
            readings = [reading for reading in found if reading is not None]
            best = pick_reading(readings, hint)
            if best is None:
                return None
            logger.info(
                "Page OCR ensemble kept %s (%s)", best.engine,
                "; ".join(
                    f"{r.engine} " + (",".join(r.problems) if r.problems else f"{r.score:.2f}")
                    for r in readings
                ),
            )
            return best.text, best.truncated
        for engine in self.vision:
            reading = self._read_one(engine, payload, hint)
            if reading is not None and not reading.problems:
                return reading.text, reading.truncated
        return None

    def _cacheable(self, payload: PageImage) -> bool:
        """False for a page that fell back to Kiri's formula-less reading."""
        return not getattr(self._degraded, "value", False)

    def _transcribe_uncached(self, payload: PageImage, hint: str | None = None) -> tuple[str, bool]:
        # ``hint`` is what a caller passes in; the Khmer reading taken here is
        # the hint the vision model actually gets, so an outer one is ignored.
        self._degraded.value = False
        khmer_text = self._read_khmer(payload)
        if self.vision:
            reading = self._read_vision(payload, khmer_text)
            if reading is not None:
                return reading
        if khmer_text is None:
            raise OCRError("No OCR engine could read the page")
        if self.require_vision:
            raise OCRError("Every vision engine failed and HYBRID_REQUIRE_VISION is set")
        # Not cached (see ``_cacheable``): this reading is missing the page's
        # mathematics, and a vision engine that failed on a daily quota or a
        # rate limit will succeed on a later run. Caching it here would make
        # the formula-less reading permanent.
        self._degraded.value = True
        logger.warning("Falling back to the Khmer-only reading; this page keeps no formulas")
        return khmer_text, False
