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
from src.ingestion.latex_guard import unmask_latex
from src.vectorstore import ChunkRecord, InMemoryVectorStore

logger = logging.getLogger("reembed_index")


def embedding_text_for(record: ChunkRecord) -> str:
    """Rebuild the text `src.ingestion` embedded for this chunk."""
    header = context_header(
        str(record.metadata.get("title", "")),
        str(record.metadata.get("heading", "")),
    )
    restored = unmask_latex(record.text, record.vault)
    return f"{header}\n\n{restored}" if header else restored


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

    if stored == target:
        logger.info("Index at %s is already '%s'; nothing to do.", index_file, target)
        return 0

    records = [ChunkRecord.from_dict(item) for item in records_raw]
    logger.info("Re-embedding %d chunks: '%s' -> '%s'", len(records), stored, target)

    embedder = build_embedder(settings)
    vectors = embedder.embed_documents([embedding_text_for(record) for record in records])

    store = InMemoryVectorStore(index_dir, target)
    store.add(records, vectors)
    path = store.save()
    logger.info("Wrote %s (%d chunks, dimension %d)", path, len(store), store.dimension)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
