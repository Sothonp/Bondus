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
"""
from __future__ import annotations

import hashlib
import logging
import threading
from pathlib import Path
from typing import Literal

from src.ingestion.ocr import CachedPageOCR, OCRError, PageImage

logger = logging.getLogger(__name__)

HYBRID_CACHE_VERSION = "1"


def engine_name(engine: CachedPageOCR) -> str:
    return f"{engine.engine}:{engine.model}"


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
    ) -> None:
        if khmer is None and not vision:
            raise ValueError("HybridPageOCR needs a Khmer engine, a vision engine, or both")
        super().__init__(
            mode=mode, min_chars=min_chars, cache_dir=cache_dir, concurrency=concurrency
        )
        self.khmer = khmer
        self.vision = list(vision)
        self.require_vision = require_vision
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

    def _read_vision(self, payload: PageImage, hint: str | None) -> tuple[str, bool] | None:
        """The first vision engine that returns text, or None if all failed."""
        for engine in self.vision:
            try:
                text, truncated = engine.transcribe_page(payload, hint)
            except OCRError as exc:
                logger.warning("Page OCR with %s failed: %s", engine_name(engine), exc)
                continue
            if text.strip():
                return text.strip(), truncated
            logger.warning("Page OCR with %s returned nothing", engine_name(engine))
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
