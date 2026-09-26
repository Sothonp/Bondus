"""Read one photo with each image OCR engine in turn, to compare them.

Usage:
    uv run python scripts/try_image_ocr.py <photo.jpg> [--engines groq,gemini,surya] [--chars 1500]

Each vision engine reads the photo on its own, with an empty cache so every
run makes real calls, and prints how long it took, whether the reading has
Chinese in it (which the tutor would reject), and the reading itself. Engines
come from .env (IMAGE_OCR_ENGINES) unless --engines is given; one without its
key or SURYA_PYTHON is left out. Kiri is not a vision engine and is skipped.
"""
from __future__ import annotations

import argparse
import sys
import tempfile
import time
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.config import get_settings  # noqa: E402
from src.ingestion.image_ocr import build_image_ocr, prepare_image, trim_repetition  # noqa: E402
from src.ingestion.ocr import OCRError, has_chinese  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("path", type=Path)
    parser.add_argument("--engines", help="comma-separated, e.g. groq,gemini,surya")
    parser.add_argument("--chars", type=int, default=1500, help="print this much of each reading (0 = all)")
    args = parser.parse_args()

    overrides = {"ocr_cache_dir": Path(tempfile.mkdtemp(prefix="try-ocr-")), "image_ocr_timeout_seconds": 900}
    if args.engines:
        overrides["image_ocr_engines"] = args.engines
    settings = get_settings().model_copy(update=overrides)
    ocr = build_image_ocr(settings)
    if ocr is None or not ocr.vision:
        print("No vision engine available: check the API keys / SURYA_PYTHON in .env")
        return 1
    print("engines:", ", ".join(ocr.engines))
    photo = prepare_image(args.path.read_bytes(), settings.image_max_side)

    for engine in ocr.vision:
        name = f"{engine.engine}:{engine.model}"
        start = time.monotonic()
        try:
            text, truncated = engine.transcribe_page(photo)
        except OCRError as exc:
            print(f"\n=== {name} FAILED after {time.monotonic() - start:.0f}s: {exc}")
            continue
        text, looped = trim_repetition(text)
        verdict = "REJECTED (Chinese)" if has_chinese(text) else "ok"
        print(
            f"\n=== {name}: {time.monotonic() - start:.0f}s, {len(text)} chars, {verdict}"
            + (", cut off" if truncated else "") + (", repetition trimmed" if looped else "")
        )
        print(text if not args.chars else text[: args.chars])
        close = getattr(engine, "close", None)
        if close is not None:
            close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
