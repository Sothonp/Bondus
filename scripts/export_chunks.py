"""Chunk every document in the data directory and write data/chunks.jsonl.

One JSON object per line:

    {"chunk_id": ..., "source_file": ..., "chunk_index": ..., "text": ...,
     "metadata": {...}}

It reuses the ingestion pipeline rather than re-implementing it, so the chunks
here are the same ones the vector index is built from:

* ``extract_file`` reads each PDF and sends any page whose text layer is missing
  *or garbled* to OCR. That second case is the one that matters for this corpus:
  the lesson PDFs embed legacy Khmer font encodings, so their text layer extracts
  as plausible-looking nonsense (``ល�ម�ត`` for ``លីមីត``) rather than as
  nothing. pdfplumber, pypdf and any other text-layer reader return the same
  nonsense, because the fault is in the file's fonts. Only OCR recovers it.
* ``prepare_document`` masks LaTeX behind placeholders, segments the Khmer around
  them, splits on the placeholder-aware separators, and restores the formulas, so
  no chunk ever ends mid-formula.

Usage:
    uv run python scripts/export_chunks.py
    uv run python scripts/export_chunks.py --chunk-size 800 --chunk-overlap 100
    uv run python scripts/export_chunks.py --only 'lesson*.pdf' --out /tmp/x.jsonl

A file that cannot be extracted is logged and skipped; it never stops the run.
"""
from __future__ import annotations

import argparse
import json
import logging
import sys
import time
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.config import get_settings  # noqa: E402
from src.ingestion import (  # noqa: E402
    SUPPORTED_EXTENSIONS,
    EmptyDocumentError,
    ExtractionError,
    KhmerSegmenter,
    LatexIntegrityError,
    extract_file,
    prepare_document,
)
from src.ingestion.khmer_segment import strip_word_boundaries  # noqa: E402
from src.ingestion.ocr import build_ocr  # noqa: E402
from scripts.ingest_corpus import discover_files, load_catalog  # noqa: E402

logger = logging.getLogger("export_chunks")


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    settings = get_settings()
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--data-dir", type=Path, default=settings.data_dir)
    parser.add_argument("--out", type=Path, default=settings.data_dir / "chunks.jsonl")
    parser.add_argument("--chunk-size", type=int, default=800)
    parser.add_argument("--chunk-overlap", type=int, default=100)
    parser.add_argument(
        "--catalog", type=Path, default=None, help="default: <data-dir>/catalog.json"
    )
    parser.add_argument("--only", nargs="+", metavar="PATTERN")
    parser.add_argument("--no-ocr", action="store_true", help="skip OCR (garbled pages stay garbled)")
    parser.add_argument("-v", "--verbose", action="store_true")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    settings = get_settings()
    logging.basicConfig(
        level=logging.DEBUG if args.verbose else settings.log_level.upper(),
        format="%(asctime)s %(levelname)s %(message)s",
    )
    if args.chunk_overlap >= args.chunk_size:
        logger.error("--chunk-overlap must be smaller than --chunk-size")
        return 2

    data_dir = args.data_dir.expanduser().resolve()
    if not data_dir.is_dir():
        logger.error("Data directory %s does not exist", data_dir)
        return 2

    files = discover_files(data_dir, set(SUPPORTED_EXTENSIONS), args.only)
    if not files:
        logger.warning("No supported files found in %s", data_dir)
        return 0

    try:
        catalog = load_catalog(args.catalog or data_dir / "catalog.json")
    except (OSError, ValueError) as exc:
        logger.error("Could not read the catalog: %s", exc)
        return 2

    segmenter = KhmerSegmenter(settings.khmer_segmenter)
    ocr = None if args.no_ocr else build_ocr(settings)
    if ocr is not None:
        logger.info("OCR: %s %s (mode=%s)", ocr.engine, ocr.model, ocr.mode)
    logger.info(
        "Chunking %d file(s) at size=%d overlap=%d -> %s",
        len(files), args.chunk_size, args.chunk_overlap, args.out,
    )

    args.out.parent.mkdir(parents=True, exist_ok=True)
    counts: dict[str, int] = {}
    failures: list[tuple[str, str]] = []
    total_formulas = ocr_pages = 0
    started = time.perf_counter()

    # Written as we go: a long OCR run should not lose everything to one crash.
    with args.out.open("w", encoding="utf-8") as handle:
        for number, path in enumerate(files, start=1):
            source = path.relative_to(data_dir).as_posix()
            prefix = f"[{number}/{len(files)}] {source}"
            try:
                document = extract_file(path, source=source, ocr=ocr)
                document.title = catalog.get(source, "")
                prepared = prepare_document(
                    document,
                    chunk_size=args.chunk_size,
                    chunk_overlap=args.chunk_overlap,
                    segmenter=segmenter,
                )
            except (ExtractionError, EmptyDocumentError, LatexIntegrityError, OSError) as exc:
                failures.append((source, str(exc)))
                logger.error("%s: %s", prefix, exc)
                continue

            for index, chunk in enumerate(prepared.chunks):
                record = {
                    "chunk_id": f"{source}#{index}",
                    "source_file": source,
                    "chunk_index": index,
                    # restored_text puts the formulas back; strip_word_boundaries
                    # drops the ZWSP marks segmentation added, which are an
                    # internal aid and must not reach a consumer. This is the
                    # same pair the retriever applies when serving a passage.
                    "text": strip_word_boundaries(chunk.restored_text),
                    "metadata": {
                        "title": document.title,
                        "heading": chunk.heading,
                        "page": chunk.page,
                        "last_page": chunk.last_page,
                        "format": document.format,
                        "formulas": chunk.formula_count,
                        "ocr": chunk.page in prepared.ocr_page_numbers,
                    },
                }
                handle.write(json.dumps(record, ensure_ascii=False) + "\n")

            counts[source] = len(prepared.chunks)
            total_formulas += prepared.formulas
            ocr_pages += len(prepared.ocr_page_numbers)
            logger.info(
                "%s: %d chunks, %d formulas, %d chars, %d OCR page(s)%s",
                prefix, len(prepared.chunks), prepared.formulas, prepared.characters,
                len(prepared.ocr_page_numbers),
                f" ({'; '.join(prepared.warnings)})" if prepared.warnings else "",
            )

    print(f"\n{'chunks':>8}  source")
    for source, count in sorted(counts.items(), key=lambda item: -item[1]):
        print(f"{count:>8}  {source}")
    print(f"{'-' * 8}")
    print(f"{sum(counts.values()):>8}  TOTAL from {len(counts)} file(s)")
    print(
        f"\n{total_formulas} formulas protected, {ocr_pages} page(s) OCR'd, "
        f"{time.perf_counter() - started:.1f}s -> {args.out}"
    )
    if failures:
        print(f"\n{len(failures)} file(s) failed:")
        for source, error in failures:
            print(f"  {source}: {error}")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
