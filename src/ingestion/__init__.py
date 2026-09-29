"""Ingestion pipeline: extract -> normalise -> mask LaTeX -> segment Khmer ->
chunk -> embed -> index."""
from __future__ import annotations

import hashlib
import json
import logging
from dataclasses import dataclass, field
from typing import Any, Protocol

import numpy as np

from src.ingestion.chunk import Chunk, RecursiveCharacterTextSplitter, attach_stems, chunk_text
from src.ingestion.extract import (
    SUPPORTED_EXTENSIONS,
    ExtractedDocument,
    ExtractionError,
    Section,
    UnsupportedFileTypeError,
    extract_document,
    extract_file,
)
from src.ingestion.khmer_segment import (
    KhmerSegmenter,
    detect_language,
    get_segmenter,
    normalize_khmer_text,
    segment_khmer,
)
from src.ingestion.latex_guard import find_placeholders, mask_latex, unmask_latex
from src.ingestion.llm_chunk import RECURSIVE, LlamaChunker
from src.vectorstore import ChunkRecord, InMemoryVectorStore

logger = logging.getLogger(__name__)


class LatexIntegrityError(RuntimeError):
    """A formula was lost between masking and chunking."""


class DocumentEmbedder(Protocol):
    def embed_documents(self, texts: list[str]) -> np.ndarray: ...


@dataclass
class PreparedDocument:
    source: str
    format: str
    chunks: list[Chunk]
    formulas: int
    characters: int
    pages: int | None = None
    title: str = ""
    warnings: list[str] = field(default_factory=list)
    ocr_page_numbers: frozenset[int] = frozenset()
    # "recursive", or the Llama chunker's identity when it chunked every run
    # of the document (one fallback marks the whole document recursive, so an
    # incremental ingest tries it again).
    chunker: str = RECURSIVE


@dataclass
class IndexResult:
    source: str
    format: str
    chunks_added: int
    chunks_removed: int
    formulas: int
    characters: int
    pages: int | None
    warnings: list[str]
    ocr_pages: int = 0
    chunker: str = RECURSIVE


class DuplicateSourceError(ValueError):
    pass


class EmptyDocumentError(ValueError):
    pass


_STREAM_SEPARATOR = "\n\n"
MAX_CONTEXT_HEADER_CHARS = 160


def _heading_streams(sections: list[Section]) -> list[list[Section]]:
    """Group sections into runs of text under one heading.

    A run continues across page breaks and ends where a new heading starts,
    so a chunk can span two pages but never two headings.
    """
    streams: list[list[Section]] = []
    for section in sections:
        if streams and not section.starts_heading and section.heading == streams[-1][-1].heading:
            streams[-1].append(section)
        else:
            streams.append([section])
    return streams


def context_header(title: str, heading: str) -> str:
    """Document title and heading path, prepended to a chunk for embedding."""
    header = " › ".join(part for part in (title.strip(), heading.strip()) if part)
    if len(header) > MAX_CONTEXT_HEADER_CHARS:
        header = "…" + header[-(MAX_CONTEXT_HEADER_CHARS - 1):]
    return header


def embedding_text(title: str, chunk: Chunk, stem_chars: int = 0) -> str:
    """The text embedded for this chunk.

    ``stem_chars`` repeats that much of the exercise's opening statement, which
    trades retrieval for a student who states the problem against one who asks
    the task alone -- see ``Settings.stem_embedding_chars`` for the numbers. At
    0 (the default) the embedded text is exactly what it was before chunks
    carried a stem, so the model still gains the statement and retrieval does
    not move.
    """
    header = context_header(title, chunk.heading)
    # In the order a reader meets them: which paper, which exercise, what it
    # asks, then this part of it. Skipped when the heading already carries the
    # statement, which happens when the extractor kept it as the heading.
    stem = chunk.stem[:stem_chars].strip() if stem_chars and chunk.stem else ""
    if stem and stem in header:
        stem = ""
    return "\n\n".join(part for part in (header, stem, chunk.restored_text) if part)


def prepare_document(
    document: ExtractedDocument,
    *,
    chunk_size: int,
    chunk_overlap: int,
    segmenter: KhmerSegmenter,
    chunker: LlamaChunker | None = None,
) -> PreparedDocument:
    """Run the LaTeX-guarded text pipeline over a document, one heading run at a time.

    With ``chunker`` the chunk boundaries of each run are chosen by the Llama
    model; without it (or where it fails) by the recursive splitter.
    """
    chunks: list[Chunk] = []
    formulas = 0
    characters = 0
    used = {chunker.identity} if chunker is not None else {RECURSIVE}
    for stream in _heading_streams(document.sections):
        parts: list[str] = []
        page_starts: list[tuple[int, int | None]] = []
        vault: dict[str, str] = {}
        expected: set[str] = set()
        offset = 0
        for section in stream:
            masked, section_vault = mask_latex(section.text)
            normalized = normalize_khmer_text(masked)
            if not normalized:
                continue
            if parts:
                offset += len(_STREAM_SEPARATOR)
            page_starts.append((offset, section.page))
            segmented = segmenter.insert_word_boundaries(normalized)
            parts.append(segmented)
            offset += len(segmented)
            vault.update(section_vault)
            expected.update(find_placeholders(normalized))
            formulas += len(section_vault)
            characters += len(unmask_latex(normalized, section_vault))
        if not parts:
            continue
        stream_text = _STREAM_SEPARATOR.join(parts)
        spans = None
        if chunker is not None:
            result = chunker.spans(stream_text, vault)
            spans = result.spans
            used.add(result.chunker)
        stream_chunks = chunk_text(
            stream_text,
            vault,
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            page_starts=page_starts,
            heading=stream[0].heading,
            start_index=len(chunks),
            spans=spans,
        )
        covered = {token for chunk in stream_chunks for token in find_placeholders(chunk.text)}
        missing = expected - covered
        if missing:
            raise LatexIntegrityError(
                f"{len(missing)} formula(s) from {document.source} were not preserved in any chunk"
            )
        chunks.extend(stream_chunks)
    return PreparedDocument(
        source=document.source,
        format=document.format,
        chunks=chunks,
        formulas=formulas,
        characters=characters,
        pages=document.pages,
        title=document.title,
        warnings=list(document.warnings),
        ocr_page_numbers=frozenset(
            section.page for section in document.sections if section.ocr and section.page is not None
        ),
        chunker=RECURSIVE if RECURSIVE in used else used.pop(),
    )


def ingest_key(file_sha256: str, **settings: Any) -> str:
    """What an indexed file was built from: its bytes and every setting that
    shapes its chunks. An incremental ingest skips a file whose key is unchanged."""
    payload = json.dumps({"file": file_sha256, **settings}, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()[:32]


def chunk_id(source: str, chunk: Chunk) -> str:
    digest = hashlib.sha256(
        f"{source}\x00{chunk.index}\x00{chunk.page}\x00{chunk.text}".encode("utf-8")
    ).hexdigest()
    return digest[:32]


def index_document(
    document: ExtractedDocument,
    *,
    store: InMemoryVectorStore,
    embedder: DocumentEmbedder,
    segmenter: KhmerSegmenter,
    chunk_size: int,
    chunk_overlap: int,
    stem_embedding_chars: int = 0,
    replace: bool = True,
    persist: bool = True,
    chunker: LlamaChunker | None = None,
    file_sha256: str | None = None,
    ingest_settings: dict[str, Any] | None = None,
) -> IndexResult:
    """Prepare, embed and store a document. Existing chunks of the same source
    are replaced when ``replace`` is set, otherwise ``DuplicateSourceError``.

    ``file_sha256`` marks the chunks as coming from a corpus file, and with
    ``ingest_settings`` records the ``ingest_key`` an incremental ingest
    compares against. The key names the chunker that actually ran, so a
    document that fell back to the recursive splitter is re-chunked next time."""
    if not replace and store.has_source(document.source):
        raise DuplicateSourceError(f"'{document.source}' is already indexed")

    prepared = prepare_document(
        document,
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        segmenter=segmenter,
        chunker=chunker,
    )
    if not prepared.chunks:
        hint = " ".join(prepared.warnings)
        raise EmptyDocumentError(f"No extractable text in '{document.source}'. {hint}".strip())

    vectors = embedder.embed_documents(
        [embedding_text(prepared.title, chunk, stem_embedding_chars) for chunk in prepared.chunks]
    )
    records = [
        ChunkRecord(
            id=chunk_id(prepared.source, chunk),
            source=prepared.source,
            chunk_index=chunk.index,
            text=chunk.text,
            vault=chunk.vault,
            page=chunk.page,
            format=prepared.format,
            metadata={
                "language": detect_language(chunk.restored_text),
                "ocr": chunk.page in prepared.ocr_page_numbers,
                "title": prepared.title,
                "heading": chunk.heading,
                "stem": chunk.stem,
                "page_end": chunk.last_page,
            },
        )
        for chunk in prepared.chunks
    ]
    if file_sha256 is not None:
        key = ingest_key(file_sha256, **(ingest_settings or {}), chunker=prepared.chunker)
        for record in records:
            record.metadata.update(file_sha256=file_sha256, ingest_key=key, chunker=prepared.chunker)
    removed, added = store.replace_source(prepared.source, records, vectors)
    if persist:
        store.save()
    logger.info(
        "Indexed %s: %d chunks (%d replaced), %d formulas",
        prepared.source, added, removed, prepared.formulas,
    )
    return IndexResult(
        source=prepared.source,
        format=prepared.format,
        chunks_added=added,
        chunks_removed=removed,
        formulas=prepared.formulas,
        characters=prepared.characters,
        pages=prepared.pages,
        warnings=prepared.warnings,
        ocr_pages=len(prepared.ocr_page_numbers),
        chunker=prepared.chunker,
    )


__all__ = [
    "SUPPORTED_EXTENSIONS",
    "Chunk",
    "DuplicateSourceError",
    "EmptyDocumentError",
    "ExtractedDocument",
    "ExtractionError",
    "IndexResult",
    "KhmerSegmenter",
    "LlamaChunker",
    "LatexIntegrityError",
    "PreparedDocument",
    "RecursiveCharacterTextSplitter",
    "attach_stems",
    "Section",
    "UnsupportedFileTypeError",
    "chunk_text",
    "detect_language",
    "extract_document",
    "extract_file",
    "get_segmenter",
    "index_document",
    "ingest_key",
    "mask_latex",
    "normalize_khmer_text",
    "prepare_document",
    "segment_khmer",
    "unmask_latex",
]
