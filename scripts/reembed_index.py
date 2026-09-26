"""Re-embed the existing vector index with the configured embedding backend.

The stored chunks already hold everything the embedding text is built from
(``text`` + ``vault`` restore the formulas, and ``metadata`` keeps the title and
heading), so switching backends does not need the source PDFs or another OCR
pass -- only new vectors and a new manifest.

Use it when the index was built with one backend and the server runs another,
which the server otherwise refuses with ``EmbeddingMismatchError``:

    EMBEDDING_BACKEND=hashing uv run python scripts/reembed_index.py
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src.config import get_settings
from src.embeddings.embedder import build_embedder
from src.ingestion import context_header
from src.ingestion.chunk import derive_stem
from src.ingestion.latex_guard import unmask_latex
from src.vectorstore import ChunkRecord, InMemoryVectorStore

logger = logging.getLogger("reembed_index")


def embedding_text_for(record: ChunkRecord, stem_chars: int = 0) -> str:
    """Rebuild the text `src.ingestion` embedded for this chunk."""
    header = context_header(
        str(record.metadata.get("title", "")),
        str(record.metadata.get("heading", "")),
    )
    restored = unmask_latex(record.text, record.vault)
    stem = str(record.metadata.get("stem", ""))[:stem_chars].strip() if stem_chars else ""
    if stem and stem in header:
        stem = ""
    return "\n\n".join(part for part in (header, stem, restored) if part)


def fill_in_stems(records: list[ChunkRecord]) -> int:
    """Give chunks cut from the middle of an exercise its opening statement.

    An index built before chunks carried a stem can gain one here rather than
    through another OCR pass: the runs are still in the file, as consecutive
    records sharing a source and heading, and the first record of a run holds
    the statement the rest of it refers to.
    """
    filled = 0
    run: list[ChunkRecord] = []

    def flush() -> int:
        if len(run) < 2:
            return 0
        stem = derive_stem(unmask_latex(run[0].text, run[0].vault))
        if not stem:
            return 0
        for record in run[1:]:
            record.metadata["stem"] = stem
        return len(run) - 1

    for record in records:
        same_run = run and (record.source, record.metadata.get("heading")) == (
            run[-1].source, run[-1].metadata.get("heading")
        )
        if not same_run:
            filled += flush()
            run = []
        run.append(record)
    filled += flush()
    return filled


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--index-dir",
        type=Path,
        default=None,
        help="vector index directory (default: the configured one)",
    )
    parser.add_argument("-v", "--verbose", action="store_true")
    args = parser.parse_args(argv)

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(message)s",
    )

    settings = get_settings()
    index_dir = args.index_dir or settings.vector_store_path
    target = settings.embedding_identity

    # Read the records with whatever identity the index already carries, so the
    # mismatch this script exists to fix does not stop it.
    index_file = Path(index_dir) / "index.npz"
    if not index_file.exists():
        logger.error("No index at %s. Build one with scripts/ingest_corpus.py.", index_file)
        return 1
    with np.load(index_file, allow_pickle=False) as archive:
        manifest = json.loads(archive["manifest"].tobytes().decode("utf-8"))
        records_raw = json.loads(archive["records"].tobytes().decode("utf-8"))
    stored = manifest.get("embedding_model")

    records = [ChunkRecord.from_dict(item) for item in records_raw]
    # An index built before chunks carried a stem embeds its exercise parts
    # without the statement they refer to, so filling those in is a reason to
    # re-embed even when the model has not changed.
    filled = fill_in_stems(records)
    if filled:
        logger.info("Carried the exercise opening into %d chunk(s)", filled)

    if stored == target and not filled:
        logger.info("Index at %s is already '%s'; nothing to do.", index_file, target)
        return 0

    if stored == target:
        logger.info("Re-embedding %d chunks with '%s'", len(records), target)
    else:
        logger.info("Re-embedding %d chunks: '%s' -> '%s'", len(records), stored, target)

    embedder = build_embedder(settings)
    vectors = embedder.embed_documents(
        [embedding_text_for(record, settings.stem_embedding_chars) for record in records]
    )

    store = InMemoryVectorStore(index_dir, target)
    store.add(records, vectors)
    path = store.save()
    logger.info("Wrote %s (%d chunks, dimension %d)", path, len(store), store.dimension)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
