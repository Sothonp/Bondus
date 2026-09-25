"""Split two-column scans into one image per column before ingestion.

The Grade 12 formula summaries come in two shapes. The portrait sheets are a
single column and transcribe cleanly. The landscape ones hold two columns side
by side, and the vision model reads a page of that density badly: it repeats
itself until the loop is trimmed, and the whole right-hand column is lost --
on the sample page that cost the product and quotient rules, De Moivre, the
nth roots and the complex quadratic.

Cut into columns, each half is an ordinary single-column page and transcribes
with no warning at all. So this runs before ``ingest_corpus.py``:

    uv run python scripts/split_columns.py            # split ./data in place
    uv run python scripts/split_columns.py --dry-run

Each wide image is replaced by ``<name>-col1`` and ``<name>-col2``, and the
original moves to ``data/.originals/``. That folder is hidden, and
``discover_files`` skips hidden paths, so the originals stay out of the index
while remaining on disk to re-split if the cut needs adjusting.
"""
from __future__ import annotations

import argparse
import logging
import shutil
import sys
from pathlib import Path

from PIL import Image

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

logger = logging.getLogger("split_columns")

IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp"}
# Portrait and squarish pages are single-column and must be left alone; the
# two-column sheets are decidedly wider than they are tall.
WIDE_RATIO = 1.2
# The cut runs down the gutter, but a formula can sit right on it, so each half
# keeps a little of the other side rather than slicing a fraction mid-symbol.
OVERLAP = 0.02


def split_image(path: Path, originals: Path, *, dry_run: bool = False) -> int:
    """Split one wide image in two. Returns the number of columns written."""
    with Image.open(path) as image:
        width, height = image.size
        if width < height * WIDE_RATIO:
            logger.debug("%s is %dx%d: single column, left alone", path.name, width, height)
            return 0
        middle = width // 2
        pad = int(width * OVERLAP)
        boxes = ((0, 0, middle + pad, height), (middle - pad, 0, width, height))
        if dry_run:
            logger.info("%s (%dx%d) would split into 2 columns", path.name, width, height)
            return 2
        for number, box in enumerate(boxes, start=1):
            target = path.with_name(f"{path.stem}-col{number}{path.suffix}")
            image.crop(box).save(target, quality=92)
            logger.debug("wrote %s", target.name)
    originals.mkdir(parents=True, exist_ok=True)
    shutil.move(str(path), str(originals / path.name))
    logger.info("%s (%dx%d) -> 2 columns", path.name, width, height)
    return 2


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data-dir", type=Path, default=PROJECT_ROOT / "data")
    parser.add_argument("--dry-run", action="store_true", help="report what would be split")
    parser.add_argument("-v", "--verbose", action="store_true")
    args = parser.parse_args(argv)
    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO, format="%(message)s"
    )

    data_dir = args.data_dir.expanduser().resolve()
    if not data_dir.is_dir():
        logger.error("Data directory %s does not exist", data_dir)
        return 2

    originals = data_dir / ".originals"
    candidates = [
        path
        for path in sorted(data_dir.iterdir())
        if path.is_file() and path.suffix.lower() in IMAGE_SUFFIXES
    ]
    columns = sum(split_image(path, originals, dry_run=args.dry_run) for path in candidates)
    split = columns // 2
    logger.info(
        "%s %d of %d image(s) into %d column(s)",
        "Would split" if args.dry_run else "Split",
        split, len(candidates), columns,
    )
    if split and not args.dry_run:
        logger.info("Originals kept in %s (hidden, so ingestion skips them)", originals)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
