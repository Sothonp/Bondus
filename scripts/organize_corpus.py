"""Move BAC II papers into the ``<Track>/<subject>/<year>.pdf`` layout.

Usage:
    uv run python scripts/organize_corpus.py            # print the plan only
    uv run python scripts/organize_corpus.py --apply    # move the files and update catalog.json

Papers arrive as ``Science/<year>/<Science|Social>/<any name>.pdf`` (and the
older ``exams/<track>-math-<year>.pdf``). Each one moves to
``Science/physics/2019.pdf`` or ``Social/english/2012.pdf``, its subject read
from the file name by ``src.subjects.subject_of``, and gets a Khmer catalog
title like the maths papers already have. A file whose target already holds
the same bytes is a duplicate: it goes to ``.duplicates/`` (which ingestion
skips) instead of being deleted. Anything the script cannot place is left
where it is and listed.

Re-run ``ingest_corpus.py --only 'Science/*' 'Social/*' 'exams/*'`` afterwards:
the moved files are indexed under their new paths and the old paths pruned.
OCR is cached by page content, so nothing is OCR'd twice.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import sys
from dataclasses import dataclass
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.config import get_settings  # noqa: E402
from src.subjects import SUBJECT_IDS, get_subject, subject_of  # noqa: E402

TRACKS = {"science": ("Science", "ថ្នាក់វិទ្យាសាស្ត្រ"), "social": ("Social", "ថ្នាក់វិទ្យាសាស្ត្រសង្គម")}
KHMER_DIGITS = str.maketrans("0123456789", "០១២៣៤៥៦៧៨៩")
YEAR = re.compile(r"(?<!\d)(20\d\d)(?!\d)")


@dataclass
class Move:
    source: Path
    target: Path
    title: str
    duplicate: bool = False


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def track_of(relative: Path) -> str | None:
    """"science" or "social", from a Science/Social folder or a science-/social- file name."""
    for part in reversed(relative.parts[:-1]):
        if part.lower() in TRACKS:
            return part.lower()
    prefix = relative.name.lower().split("-", 1)[0]
    return prefix if prefix in TRACKS else None


def paper_title(subject: str, track: str, year: str) -> str:
    return f"វិញ្ញាសាប្រឡងបាក់ឌុប{get_subject(subject).km} {TRACKS[track][1]} ឆ្នាំ{year.translate(KHMER_DIGITS)}"


def plan(data_dir: Path, catalog: dict[str, str]) -> tuple[list[Move], list[str]]:
    # Catalogued files first, so of two identical copies the one with a title is kept.
    candidates = sorted(
        (
            path for folder in ("Science", "exams") if (data_dir / folder).is_dir()
            for path in (data_dir / folder).rglob("*.pdf")
        ),
        key=lambda path: (path.relative_to(data_dir).as_posix() not in catalog, path),
    )
    moves: list[Move] = []
    unplaced: list[str] = []
    claimed: set[Path] = set()
    kept_by_hash: dict[str, Path] = {}
    for path in candidates:
        relative = path.relative_to(data_dir)
        subject, track = subject_of(relative.as_posix()), track_of(relative)
        years = YEAR.findall(relative.as_posix())
        if subject not in SUBJECT_IDS or track is None or not years:
            unplaced.append(relative.as_posix())
            continue
        target = data_dir / TRACKS[track][0] / subject / f"{years[-1]}.pdf"
        if target == path:
            continue
        title = catalog.get(relative.as_posix()) or paper_title(subject, track, years[-1])
        # The same paper is often filed under both tracks (English is one paper for everyone):
        # index it once, so it does not take two of the retrieved chunks.
        digest = sha256(path)
        if digest in kept_by_hash:
            moves.append(Move(path, data_dir / ".duplicates" / relative, title, duplicate=True))
            continue
        if target in claimed or target.exists():
            unplaced.append(f"{relative.as_posix()} (a different file already goes to {target.relative_to(data_dir)})")
            continue
        claimed.add(target)
        kept_by_hash[digest] = target
        moves.append(Move(path, target, title))
    return moves, unplaced


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--data-dir", type=Path, default=get_settings().data_dir)
    parser.add_argument("--apply", action="store_true", help="move the files (default: print the plan)")
    args = parser.parse_args(argv)

    data_dir = args.data_dir.expanduser().resolve()
    catalog_path = data_dir / "catalog.json"
    catalog = json.loads(catalog_path.read_text(encoding="utf-8")) if catalog_path.is_file() else {}
    moves, unplaced = plan(data_dir, catalog)

    for move in moves:
        mark = "duplicate" if move.duplicate else "move"
        print(f"{mark:9} {move.source.relative_to(data_dir)} -> {move.target.relative_to(data_dir)}")
    for item in unplaced:
        print(f"left      {item}")
    print(f"{sum(not m.duplicate for m in moves)} to move, {sum(m.duplicate for m in moves)} duplicate(s), "
          f"{len(unplaced)} left in place")
    if not args.apply:
        print("Dry run; pass --apply to move the files.")
        return 0

    for move in moves:
        old = move.source.relative_to(data_dir).as_posix()
        catalog.pop(old, None)
        move.target.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(move.source, move.target)
        if not move.duplicate:
            catalog[move.target.relative_to(data_dir).as_posix()] = move.title
    for folder in sorted({m.source.parent for m in moves}, key=lambda p: len(p.parts), reverse=True):
        while folder != data_dir and folder.is_dir() and not any(folder.iterdir()):
            folder.rmdir()
            folder = folder.parent
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Moved. {catalog_path.name} now has {len(catalog)} title(s).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
