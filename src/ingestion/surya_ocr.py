"""Local page OCR with Surya 2 (https://github.com/datalab-to/surya).

Surya reads a whole page in one pass and labels what it finds: section
headers, text, equations, lists, tables, figures, running headers and
footers. Formulas come back as LaTeX inside ``<math>`` tags and are clean
enough to index as they are; the section headers become Markdown headings,
so a formula sheet chunks on its topics. It runs on this machine, so it has
no quota.

It is weaker at Khmer than at mathematics. On a clean scan it gets most
words right but still swaps some for a look-alike (បន្ថយ for បន្លាយ); on a
low-resolution photo the Khmer is garbled. Kiri reads Khmer words better, so
Surya is best used where formulas matter most, or as a vision engine of
``OCR_ENGINE=hybrid`` next to one that reads Khmer well.

surya-ocr cannot be installed next to this project's dependencies, so it
lives in its own environment (``SURYA_PYTHON``) and ``scripts/surya_worker.py``
runs there as one long-lived child process, talking JSON over stdin/stdout.
"""
from __future__ import annotations

import atexit
import hashlib
import html
import json
import logging
import os
import queue
import re
import subprocess
import tempfile
import threading
from pathlib import Path
from typing import Literal

from src.ingestion.ocr import CachedPageOCR, OCREngine, OCRError, PageImage, _render_png

logger = logging.getLogger(__name__)

SURYA_CACHE_VERSION = "1"
SURYA_MODEL = "datalab-to/surya-ocr-2"
WORKER_SCRIPT = Path(__file__).resolve().parents[2] / "scripts" / "surya_worker.py"

# Page furniture and pictures carry nothing worth indexing.
_DROPPED_LABELS = {"PageHeader", "PageFooter", "Figure", "Picture", "Image", "Diagram"}
_MATH = re.compile(r"<math(?P<attrs>[^>]*)>(?P<tex>.*?)</math>", re.DOTALL)
_HEADING = re.compile(r"<h([1-6])\b", re.IGNORECASE)
_TAG = re.compile(r"<[^>]+>")
_SLOT = "{}"
_SLOT_PATTERN = re.compile("(\\d+)")
_BULLET = re.compile(r"^[•●▪◦·\-]\s*")
# Surya's h1/h2 choice for the same page differs from run to run, so heading
# levels come from what the heading says: a lesson, a numbered topic within it,
# or anything else (a lesson's title, a named box) between the two.
_LESSON_HEADING = re.compile(r"^(?:មេរៀនទី|ជំពូកទី)")
_NUMBERED_HEADING = re.compile(r"^[០-៩0-9]+\s*[.៖)]")
_SUFFIXES = {"image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp"}


def _table_to_markdown(fragment: str) -> str:
    rows = []
    for row in re.findall(r"<tr[^>]*>(.*?)</tr>", fragment, re.DOTALL | re.IGNORECASE):
        cells = re.findall(r"<t[hd][^>]*>(.*?)</t[hd]>", row, re.DOTALL | re.IGNORECASE)
        rows.append("| " + " | ".join(_inline_text(cell) for cell in cells) + " |")
    if not rows:
        return _inline_text(fragment)
    width = rows[0].count("|") - 1
    return "\n".join([rows[0], "|" + " --- |" * width, *rows[1:]])


def _inline_text(fragment: str) -> str:
    text = re.sub(r"<br\s*/?>", " ", fragment, flags=re.IGNORECASE)
    text = html.unescape(_TAG.sub("", text))
    return " ".join(text.split())


def block_to_markdown(label: str | None, fragment: str) -> str:
    """One Surya block as Markdown: headings as #, formulas as $...$.

    Formulas are lifted out before any tag is stripped, because their LaTeX
    holds ``<`` and ``>`` that would otherwise read as tags.
    """
    if label in _DROPPED_LABELS or not fragment.strip():
        return ""
    formulas: list[str] = []

    def lift(match: re.Match) -> str:
        formulas.append(html.unescape(match.group("tex")).strip())
        return _SLOT.format(len(formulas) - 1)

    body = _MATH.sub(lift, fragment)
    heading = _HEADING.search(body)
    if re.search(r"<table\b", body, re.IGNORECASE):
        text = _table_to_markdown(body)
    elif re.search(r"<li\b", body, re.IGNORECASE):
        items = re.findall(r"<li[^>]*>(.*?)</li>", body, re.DOTALL | re.IGNORECASE)
        text = "\n".join("- " + _BULLET.sub("", _inline_text(item)) for item in items)
    else:
        text = _inline_text(body)
    if not text.strip():
        return ""

    whole_formula = _SLOT_PATTERN.fullmatch(text.strip())
    if label == "SectionHeader" or heading:
        text = "#" * heading_level(text) + " " + text
    elif whole_formula and label == "Equation":
        # A displayed equation on its own; one with a number beside it stays inline.
        return "$$\n" + formulas[int(whole_formula.group(1))] + "\n$$"
    return _SLOT_PATTERN.sub(lambda m: f"${formulas[int(m.group(1))]}$", text)


def heading_level(title: str) -> int:
    if _LESSON_HEADING.match(title):
        return 1
    if _NUMBERED_HEADING.match(title):
        return 3
    return 2


def blocks_to_markdown(blocks: list[dict]) -> str:
    parts = (block_to_markdown(block.get("label"), block.get("html") or "") for block in blocks)
    return "\n\n".join(part for part in parts if part)


class SuryaPageOCR(CachedPageOCR):
    engine: OCREngine = "surya"

    def __init__(
        self,
        python: str,
        *,
        backend: Literal["llamacpp", "vllm"] | None = None,
        llama_binary: str | None = None,
        timeout: float = 600.0,
        render_scale: float = 2.0,
        mode: Literal["auto", "always"] = "auto",
        min_chars: int = 20,
        cache_dir: str | Path | None = None,
        worker_command: list[str] | None = None,
    ) -> None:
        # One page at a time: the worker holds one model server.
        super().__init__(mode=mode, min_chars=min_chars, cache_dir=cache_dir, concurrency=1)
        self.model = SURYA_MODEL
        self.python = python
        self.backend = backend
        self.llama_binary = llama_binary
        self.timeout = timeout
        self.render_scale = render_scale
        self._command = worker_command or [python, str(WORKER_SCRIPT)]
        self._process: subprocess.Popen | None = None
        self._replies: queue.Queue[str | None] = queue.Queue()
        self._lock = threading.Lock()
        atexit.register(self.close)

    def _cache_key(self, payload: PageImage) -> str:
        digest = hashlib.sha256()
        for part in ("surya", SURYA_CACHE_VERSION, self.model, payload.mime_type):
            digest.update(part.encode("utf-8") + b"\x00")
        digest.update(payload.data)
        return digest.hexdigest()

    # -- worker process -------------------------------------------------------

    def _start(self) -> subprocess.Popen:
        if self._process is not None and self._process.poll() is None:
            return self._process
        env = dict(os.environ)
        # The worker's interpreter picks its own packages; the project's venv must not leak in.
        env.pop("VIRTUAL_ENV", None)
        env.pop("PYTHONPATH", None)
        if self.backend:
            env["SURYA_INFERENCE_BACKEND"] = self.backend
        if self.llama_binary:
            env["LLAMA_CPP_BINARY"] = self.llama_binary
        logger.info("Starting Surya worker: %s", " ".join(self._command))
        try:
            process = subprocess.Popen(
                self._command,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                encoding="utf-8",
                env=env,
                bufsize=1,
            )
        except OSError as exc:
            raise OCRError(f"Could not start Surya with SURYA_PYTHON={self.python}: {exc}") from exc
        self._replies = queue.Queue()
        replies = self._replies

        def pump_stdout() -> None:
            for line in process.stdout:
                replies.put(line)
            replies.put(None)

        def pump_stderr() -> None:
            for line in process.stderr:
                logger.debug("surya: %s", line.rstrip())

        threading.Thread(target=pump_stdout, daemon=True).start()
        threading.Thread(target=pump_stderr, daemon=True).start()
        self._process = process
        return process

    def close(self) -> None:
        process, self._process = self._process, None
        if process is None or process.poll() is not None:
            return
        try:
            process.stdin.close()  # the worker stops its model server on EOF
            process.wait(timeout=30)
        except Exception:
            process.kill()

    def _ask(self, image_path: str) -> list[dict]:
        with self._lock:
            process = self._start()
            try:
                process.stdin.write(json.dumps({"image": image_path}) + "\n")
                process.stdin.flush()
            except OSError as exc:
                self.close()
                raise OCRError(f"Surya worker is not running: {exc}") from exc
            try:
                line = self._replies.get(timeout=self.timeout)
            except queue.Empty:
                self.close()
                raise OCRError(f"Surya did not answer within {self.timeout:.0f}s") from None
        if line is None:
            self.close()
            raise OCRError("Surya worker exited; run with -v to see its log")
        answer = json.loads(line)
        if "error" in answer:
            raise OCRError(f"Surya failed: {answer['error']}")
        return answer.get("blocks", [])

    # -- transcription --------------------------------------------------------

    def _page_image(self, payload: PageImage) -> tuple[bytes, str]:
        if payload.mime_type in _SUFFIXES:
            return payload.data, _SUFFIXES[payload.mime_type]
        return _render_png(payload.data, self.render_scale), ".png"

    def _transcribe_uncached(self, payload: PageImage, hint: str | None = None) -> tuple[str, bool]:
        # Surya takes no hint: it reads the page image alone.
        image, suffix = self._page_image(payload)
        descriptor, path = tempfile.mkstemp(prefix="surya-", suffix=suffix)
        try:
            with os.fdopen(descriptor, "wb") as handle:
                handle.write(image)
            blocks = self._ask(path)
        finally:
            try:
                os.unlink(path)
            except OSError:
                pass
        text = blocks_to_markdown(blocks)
        logger.debug("Surya: %d block(s) -> %d character(s)", len(blocks), len(text))
        return text, False
