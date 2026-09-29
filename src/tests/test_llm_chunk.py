"""Tests for the Llama chunker (Ollama faked with httpx.MockTransport) and the
incremental corpus ingest built on it."""
from __future__ import annotations

import importlib.util
import json
from pathlib import Path

import httpx
import numpy as np
import pytest

from src.config import Settings
from src.embeddings.embedder import HashingEmbedder
from src.ingestion import ExtractedDocument, KhmerSegmenter, Section, index_document, prepare_document
from src.ingestion.latex_guard import find_placeholders, mask_latex
from src.ingestion.llm_chunk import RECURSIVE, LlamaChunker
from src.vectorstore import ChunkRecord, InMemoryVectorStore

EXERCISES = [
    f"Exercise {n}. Let $f(x) = x^{n} + {n}$ on the interval $[0, {n}]$. "
    + " ".join(f"Part {part}: study the function and justify step {part} carefully." for part in "abc")
    for n in range(1, 7)
]
TEXT = "\n\n".join(EXERCISES)


class FakeOllama:
    """Answers /api/chat with chunk starts at every unit that opens an exercise."""

    def __init__(self, content: str | None = None, fail: bool = False) -> None:
        self.content = content
        self.fail = fail
        self.chats = 0

    def __call__(self, request: httpx.Request) -> httpx.Response:
        if self.fail:
            raise httpx.ConnectError("connection refused", request=request)
        if request.url.path == "/api/tags":
            return httpx.Response(200, json={"models": [{"name": "llama3:8b"}]})
        self.chats += 1
        body = json.loads(request.content)
        assert body["format"] == "json" and body["options"]["temperature"] == 0
        units = body["messages"][1]["content"].split("\n")
        starts = [n for n, line in enumerate(units) if line.split("] ", 1)[1].startswith("Exercise")]
        content = self.content if self.content is not None else json.dumps({"starts": starts})
        return httpx.Response(200, json={"message": {"content": content}})


def _chunker(fake: FakeOllama, **kwargs) -> LlamaChunker:
    options = dict(chunk_size=200, chunk_overlap=20, max_chars=400, unit_chars=80, window_chars=600)
    options.update(kwargs)
    return LlamaChunker(client=httpx.Client(transport=httpx.MockTransport(fake)), **options)


def _texts(prepared) -> list[str]:
    return [chunk.restored_text for chunk in prepared.chunks]


def _prepare(chunker: LlamaChunker | None, text: str = TEXT):
    document = ExtractedDocument("notes.md", "markdown", [Section(text)])
    return prepare_document(
        document, chunk_size=200, chunk_overlap=20, segmenter=KhmerSegmenter("regex"), chunker=chunker
    )


class TestLlamaChunker:
    def test_chunks_follow_the_models_boundaries(self):
        fake = FakeOllama()
        prepared = _prepare(_chunker(fake))
        assert fake.chats >= 2, "the text spans several windows"
        assert prepared.chunker.startswith("llama:llama3:8b")
        texts = [chunk.restored_text for chunk in prepared.chunks]
        assert len(texts) == len(EXERCISES)
        assert all(text.startswith("Exercise") for text in texts)
        assert texts == EXERCISES

    def test_every_formula_survives(self):
        prepared = _prepare(_chunker(FakeOllama()))
        _, vault = mask_latex(TEXT)
        assert prepared.formulas == len(vault)
        kept = [formula for chunk in prepared.chunks for formula in chunk.vault.values()]
        assert sorted(kept) == sorted(vault.values())
        for chunk in prepared.chunks:
            assert set(find_placeholders(chunk.text)) == set(chunk.vault)

    def test_groups_are_held_to_max_chars(self):
        # The model puts everything in one chunk; the size limit splits it again.
        prepared = _prepare(_chunker(FakeOllama(content='{"starts": [0]}'), max_chars=300))
        assert len(prepared.chunks) > 1
        assert all(len(chunk.restored_text) <= 300 for chunk in prepared.chunks)
        assert "".join(c.restored_text for c in prepared.chunks).replace(" ", "").replace("\n", "") == (
            TEXT.replace(" ", "").replace("\n", "")
        )

    def test_short_text_needs_no_model(self):
        fake = FakeOllama()
        prepared = _prepare(_chunker(fake), EXERCISES[0])
        assert fake.chats == 0 and len(prepared.chunks) == 1
        assert prepared.chunker.startswith("llama:")

    def test_unreachable_ollama_falls_back_to_recursive(self):
        fake = FakeOllama(fail=True)
        chunker = _chunker(fake)
        assert "not reachable" in chunker.check()
        prepared = _prepare(chunker)
        assert prepared.chunker == RECURSIVE
        assert _texts(prepared) == _texts(_prepare(None))

    def test_unusable_answer_falls_back_to_recursive(self):
        prepared = _prepare(_chunker(FakeOllama(content="I think the chunks are fine.")))
        assert prepared.chunker == RECURSIVE

    def test_numbers_outside_json_are_still_read(self):
        prepared = _prepare(_chunker(FakeOllama(content="starts: 0, 4, 999")))
        assert prepared.chunker.startswith("llama:")

    def test_answers_are_cached(self, tmp_path):
        fake = FakeOllama()
        first = _prepare(_chunker(fake, cache_dir=tmp_path))
        asked = fake.chats
        again = _prepare(_chunker(fake, cache_dir=tmp_path))
        assert fake.chats == asked
        assert _texts(again) == _texts(first)

    def test_index_document_records_the_ingest_key(self):
        store = InMemoryVectorStore(None, "hashing-256")
        document = ExtractedDocument("notes.md", "markdown", [Section(TEXT)])
        common = dict(
            store=store, embedder=HashingEmbedder(256), segmenter=KhmerSegmenter("regex"),
            chunk_size=200, chunk_overlap=20, persist=False, file_sha256="abc",
        )
        result = index_document(document, chunker=_chunker(FakeOllama()), **common)
        meta = store.source_metadata()["notes.md"]
        assert meta["file_sha256"] == "abc" and meta["chunker"] == result.chunker
        llama_key = meta["ingest_key"]
        index_document(document, chunker=_chunker(FakeOllama(fail=True)), **common)
        assert store.source_metadata()["notes.md"]["ingest_key"] != llama_key


# ---------------------------------------------------------------------------
# Incremental ingest (scripts/ingest_corpus.py)
# ---------------------------------------------------------------------------

@pytest.fixture
def ingest(tmp_path, monkeypatch):
    path = Path(__file__).resolve().parents[2] / "scripts" / "ingest_corpus.py"
    spec = importlib.util.spec_from_file_location("ingest_corpus_under_test", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    data = tmp_path / "data"
    data.mkdir()
    settings = Settings(
        _env_file=None,
        embedding_backend="hashing",
        hashing_dim=256,
        vector_store_path=tmp_path / "index",
        data_dir=data,
        khmer_segmenter="regex",
        ocr_mode="never",
        chunker="recursive",
    )
    monkeypatch.setattr(module, "get_settings", lambda: settings)

    def run(*args: str) -> InMemoryVectorStore:
        assert module.main(["--no-ocr", *args]) == 0
        return InMemoryVectorStore.load(settings.vector_store_path, "hashing-256")

    run.data = data
    run.settings = settings
    return run


def test_ingest_indexes_only_what_changed(ingest, caplog):
    (ingest.data / "a.md").write_text("Limits: $\\lim_{x \\to 0} x = 0$.", encoding="utf-8")
    (ingest.data / "b.md").write_text("Derivatives: $f'(x) = 2x$.", encoding="utf-8")
    store = ingest()
    assert {s.source for s in store.sources()} == {"a.md", "b.md"}

    caplog.set_level("INFO")
    caplog.clear()
    ingest()
    assert "0 of 2 file(s) new or changed" in caplog.text

    (ingest.data / "b.md").write_text("Derivatives: $f'(x) = 3x^2$.", encoding="utf-8")
    caplog.clear()
    store = ingest()
    assert "1 of 2 file(s) new or changed" in caplog.text
    assert any("3x^2" in formula for record in store.records() for formula in record.vault.values())

    caplog.clear()
    ingest("--force")
    assert "2 of 2 file(s) new or changed" in caplog.text


def test_ingest_redoes_files_when_chunking_changes(ingest, caplog):
    (ingest.data / "a.md").write_text("Limits of functions.", encoding="utf-8")
    ingest()
    ingest.settings.chunk_size = 300
    caplog.set_level("INFO")
    caplog.clear()
    ingest()
    assert "1 of 1 file(s) new or changed" in caplog.text


def test_ingest_prunes_deleted_corpus_files_but_not_uploads(ingest):
    (ingest.data / "a.md").write_text("Limits of functions.", encoding="utf-8")
    (ingest.data / "b.md").write_text("Integrals of functions.", encoding="utf-8")
    store = ingest()
    # A document uploaded through the API: no file hash.
    store.add([ChunkRecord(id="upload", source="upload.md", chunk_index=0, text="notes")], np.ones((1, 256)))
    store.save()

    (ingest.data / "b.md").unlink()
    store = ingest()
    assert {s.source for s in store.sources()} == {"a.md", "upload.md"}

    (ingest.data / "a.md").unlink()
    (ingest.data / "c.md").write_text("Sequences.", encoding="utf-8")
    store = ingest("--no-prune")
    assert {s.source for s in store.sources()} == {"a.md", "c.md", "upload.md"}
