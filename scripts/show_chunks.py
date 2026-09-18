"""Print sample chunks for a file, to eyeball the Khmer before embedding.

Usage:
    uv run python scripts/show_chunks.py <file.pdf> [--count 3] [--skip 2]

Runs the normal extract + chunk path. OCR comes from the cache when the file
has already been ingested, so this is cheap to re-run.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.config import get_settings  # noqa: E402
from src.ingestion import KhmerSegmenter, extract_file, prepare_document  # noqa: E402
from src.ingestion.khmer_segment import looks_garbled  # noqa: E402
from src.ingestion.ocr import build_ocr  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("path", type=Path)
    parser.add_argument("--count", type=int, default=3, help="how many chunks to print")
    parser.add_argument("--skip", type=int, default=2, help="skip this many chunks first")
    parser.add_argument("--no-ocr", action="store_true")
    args = parser.parse_args()

    settings = get_settings()
    ocr = None if args.no_ocr else build_ocr(settings)
    document = extract_file(args.path, source=args.path.name, ocr=ocr)
    prepared = prepare_document(
        document,
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap,
        segmenter=KhmerSegmenter(settings.khmer_segmenter),
    )

    print(f"file    : {args.path.name}")
    print(f"pages   : {document.pages}   OCR pages: {document.ocr_pages}")
    print(f"chunks  : {len(prepared.chunks)}   formulas: {prepared.formulas}")
    for warning in prepared.warnings:
        print(f"warning : {warning}")

    for chunk in prepared.chunks[args.skip : args.skip + args.count]:
        text = chunk.restored_text
        print("\n" + "=" * 78)
        print(f"chunk {chunk.index}  page {chunk.page}..{chunk.last_page}  "
              f"formulas={chunk.formula_count}  garbled={looks_garbled(text)}")
        print("-" * 78)
        print(text)
    return 0


if __name__ == "__main__":
    sys.exit(main())
