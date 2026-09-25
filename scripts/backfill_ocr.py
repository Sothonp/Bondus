"""Transcribe one file's pages with the configured OCR engine, paced to the quota.

Groq's free tier caps tokens per *day* on a rolling window, so budget frees up
continuously rather than all at once. A plain ingest run burns through every
page in minutes, gets rejected on almost all of them and falls back to Kiri's
formula-less reading. This driver instead walks the pages one at a time and,
when the quota rejects a page, sleeps for exactly as long as Groq asks before
retrying that same page -- so every token that frees up is spent on maths.

Pages already in the OCR cache are skipped, so this is resumable: stop it and
start it again and it picks up where it left off.

Usage:
    uv run python scripts/backfill_ocr.py data/b4f81b6f-....pdf
    uv run python scripts/backfill_ocr.py <file.pdf> --pages 1-60 --max-hours 12
"""
from __future__ import annotations

import argparse
import logging
import re
import sys
import time
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.config import get_settings  # noqa: E402
from src.ingestion.ocr import OCRError, build_ocr, page_payload  # noqa: E402

logger = logging.getLogger("backfill_ocr")

# "Please try again in 10m48.432s" / "in 46.1s"
_WAIT = re.compile(r"try again in (?:(\d+)m)?([\d.]+)s", re.IGNORECASE)
DEFAULT_WAIT = 300.0


def wait_seconds(message: str) -> float:
    match = _WAIT.search(message or "")
    if not match:
        return DEFAULT_WAIT
    minutes = float(match.group(1) or 0)
    return minutes * 60 + float(match.group(2)) + 5.0


def parse_pages(spec: str | None, total: int) -> list[int]:
    if not spec:
        return list(range(total))
    wanted: list[int] = []
    for part in spec.split(","):
        part = part.strip()
        if "-" in part:
            first, last = part.split("-", 1)
            wanted.extend(range(int(first) - 1, int(last)))
        else:
            wanted.append(int(part) - 1)
    return [page for page in wanted if 0 <= page < total]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("path", type=Path)
    parser.add_argument("--pages", help="1-based page list/ranges, e.g. 1-60,75")
    parser.add_argument("--max-hours", type=float, default=0.0, help="stop after this long (0 = no limit)")
    parser.add_argument("--max-wait", type=float, default=3600.0, help="give up if a single wait is longer than this")
    parser.add_argument(
        "--wait",
        type=float,
        default=1260.0,
        help="seconds to wait when the quota is exhausted (default 21 min, the "
             "rate at which 200k tokens/day frees up one ~2.9k-token page)",
    )
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    settings = get_settings()
    ocr = build_ocr(settings)
    if ocr is None:
        logger.error("OCR is disabled (OCR_MODE=never)")
        return 2
    logger.info("OCR: %s %s", ocr.engine, ocr.model)

    from pypdf import PdfReader

    reader = PdfReader(str(args.path))
    pages = parse_pages(args.pages, len(reader.pages))
    logger.info("%s: %d of %d page(s) to consider", args.path.name, len(pages), len(reader.pages))

    started = time.monotonic()
    done = cached = failed = 0
    for position, number in enumerate(pages, start=1):
        if args.max_hours and (time.monotonic() - started) > args.max_hours * 3600:
            logger.info("Reached --max-hours; stopping")
            break
        payload = page_payload(reader.pages[number], settings.kiri_render_scale)
        key = ocr._cache_key(payload)
        if ocr._read_cache(key) is not None:
            cached += 1
            continue
        # Retry the same page until the quota lets it through: a page that
        # falls back to Kiri is not cached, so giving up here would lose it.
        while True:
            try:
                text, truncated = ocr.transcribe_page(payload)
            except OCRError as exc:
                logger.error("page %d failed: %s", number + 1, exc)
                failed += 1
                break
            # ``_cacheable`` is False when every vision engine failed and the
            # page fell back to Kiri's formula-less reading -- which is exactly
            # what the quota does, and why that reading is not cached.
            got_maths = not truncated and ocr._cacheable(payload)
            if got_maths:
                done += 1
                logger.info(
                    "page %d transcribed (%d/%d done, %d cached, %d failed) %d chars",
                    number + 1, position, len(pages), cached, failed, len(text),
                )
                break
            if args.wait > args.max_wait:
                logger.warning("page %d: --wait exceeds --max-wait; skipping", number + 1)
                failed += 1
                break
            logger.info(
                "page %d: no maths (quota exhausted); waiting %.0fs for the rolling window",
                number + 1, args.wait,
            )
            time.sleep(args.wait)

    logger.info("Done: %d transcribed, %d already cached, %d failed", done, cached, failed)
    return 0


if __name__ == "__main__":
    sys.exit(main())
