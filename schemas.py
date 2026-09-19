"""Request and response models for the HTTP API."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

SOURCE_NAME_PATTERN = r"^[^\x00-\x1f<>\"|?*]+$"


class _StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


# --- /api/query -------------------------------------------------------------

class ChatTurn(_StrictModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=20000)


class ImageAttachment(_StrictModel):
    data: str = Field(
        min_length=16, max_length=70_000_000, description="Base64 image bytes, or a data: URL"
    )
    mime_type: Literal["image/jpeg", "image/png", "image/webp"] | None = None
    name: str | None = Field(None, max_length=200)


class QueryRequest(_StrictModel):
    prompt: str = Field(
        "", max_length=4000, description="The student's question (may be empty when images are attached)"
    )
    images: list[ImageAttachment] = Field(
        default_factory=list, max_length=10, description="Photos of the problem, read with OCR"
    )
    top_k: int | None = Field(None, ge=1, le=50, description="Chunks to retrieve (default: TOP_K)")
    score_threshold: float | None = Field(
        None, ge=0.0, le=1.0, description="Minimum cosine similarity (default: SCORE_THRESHOLD)"
    )
    history: list[ChatTurn] = Field(default_factory=list, max_length=40)
    sources: list[str] | None = Field(
        None, max_length=100, description="Restrict retrieval to these document sources"
    )
    generate: bool = Field(True, description="Set false to return retrieved chunks only")
    continues_math: bool = Field(
        False,
        description="This request carries on an answer that stopped inside a $$ block, so the "
        "formatting repair must not close the block the model is about to close itself",
    )

    @model_validator(mode="after")
    def _needs_question(self) -> "QueryRequest":
        if not self.prompt and not self.images:
            raise ValueError("Provide a prompt, an image, or both")
        return self


class ImageReadingOut(BaseModel):
    index: int
    text: str = Field(description="Combined reading, suitable for chat history")
    vision_text: str | None = None
    vision_engine: str | None = None
    khmer_text: str | None = None
    khmer_engine: str | None = None
    warnings: list[str] = Field(default_factory=list)


class SourceChunk(BaseModel):
    id: str
    source: str
    chunk_index: int
    page: int | None = None
    score: float
    text: str
    title: str = ""
    heading: str = ""


class QueryResponse(BaseModel):
    answer: str
    language: Literal["km", "en"]
    grounded: bool = Field(description="True when at least one chunk passed the threshold")
    sources: list[SourceChunk]
    provider: Literal["anthropic", "gemini", "groq", "cerebras", "openrouter", "sea-lion", "none"]
    model: str | None = None
    stop_reason: str | None = None
    latency_ms: float
    images: list[ImageReadingOut] = Field(default_factory=list)


# --- /api/query/stream ------------------------------------------------------
# Newline-delimited JSON: one "meta", any number of "delta" (and "reset"), then
# "done" or "error".

class QueryStreamMeta(BaseModel):
    type: Literal["meta"] = "meta"
    language: Literal["km", "en"]
    grounded: bool
    sources: list[SourceChunk]
    provider: Literal["anthropic", "gemini", "groq", "cerebras", "openrouter", "sea-lion", "none"]


class QueryStreamStatus(BaseModel):
    type: Literal["status"] = "status"
    stage: Literal["reading_images", "searching", "generating"]


class QueryStreamImages(BaseModel):
    type: Literal["images"] = "images"
    images: list[ImageReadingOut]


class QueryStreamDelta(BaseModel):
    type: Literal["delta"] = "delta"
    text: str


class QueryStreamReset(BaseModel):
    """Discard the text received so far: the answer restarts with another model."""

    type: Literal["reset"] = "reset"
    detail: str


class QueryStreamDone(BaseModel):
    type: Literal["done"] = "done"
    first_token_ms: float | None = Field(
        None, description="Time to the first text delta: the wait the student actually sees"
    )
    provider: Literal["anthropic", "gemini", "groq", "cerebras", "openrouter", "sea-lion", "none"] | None = Field(
        None, description="The provider that actually answered (may be a fallback)"
    )
    model: str | None = None
    stop_reason: str | None = None
    latency_ms: float
    answer: str | None = Field(
        None,
        description=(
            "The whole answer with its Markdown and LaTeX repaired, sent only when "
            "repair changed something. Replace this request's deltas with it: some "
            "fixes (closing an unclosed $$, moving Khmer out of a formula) cannot be "
            "made on a delta in isolation."
        ),
    )


class QueryStreamError(BaseModel):
    type: Literal["error"] = "error"
    status: int
    detail: str


# --- /api/ingest ------------------------------------------------------------

class IngestTextRequest(_StrictModel):
    text: str = Field(min_length=1, max_length=5_000_000)
    source_name: str = Field(min_length=1, max_length=200, pattern=SOURCE_NAME_PATTERN)
    format: Literal["text", "markdown"] = "markdown"
    replace: bool = True

    @field_validator("text")
    @classmethod
    def _not_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("text must not be blank")
        return value


class IngestResponse(BaseModel):
    source: str
    format: str
    chunks_added: int
    chunks_replaced: int
    formulas_protected: int
    characters: int
    pages: int | None = None
    ocr_pages: int = Field(0, description="PDF pages or images transcribed by OCR (Gemini or Kiri)")
    warnings: list[str] = Field(default_factory=list)
    total_chunks: int


class IngestJob(BaseModel):
    """An ingestion running in the background (``POST /api/ingest`` with ``background=true``)."""

    job_id: str
    status: Literal["queued", "running", "succeeded", "failed"]
    source: str
    created_at: str
    finished_at: str | None = None
    result: IngestResponse | None = None
    error: str | None = None
    error_status: int | None = Field(None, description="HTTP status the synchronous call would have returned")


# --- /api/documents ---------------------------------------------------------

class DocumentInfo(BaseModel):
    source: str
    chunks: int
    pages: int
    format: str
    ingested_at: str


class DocumentListResponse(BaseModel):
    documents: list[DocumentInfo]
    total_chunks: int


class DeleteDocumentResponse(BaseModel):
    source: str
    chunks_removed: int
    total_chunks: int


# --- /health ------------------------------------------------------------------

class HealthResponse(BaseModel):
    status: Literal["ok"]
    active_ingest_jobs: int = 0
    version: str
    embedding_backend: str
    embedding_model: str
    embedding_loaded: bool
    khmer_segmenter: str
    ocr_enabled: bool
    ocr_engine: Literal["gemini", "kiri", "groq", "hybrid"] | None = None
    ocr_model: str | None = None
    llm_provider: Literal["anthropic", "gemini", "groq", "cerebras", "openrouter", "sea-lion", "none"]
    llm_model: str | None = None
    llm_chain: list[str] = Field(default_factory=list, description="provider:model, in fallback order")
    llm_selection: Literal["rotate", "priority"] | None = Field(
        None, description="how the next question picks among the chain"
    )
    llm_resting: dict[str, float] = Field(
        default_factory=dict,
        description="models being skipped after a failure, and the seconds left on each",
    )
    config_warnings: list[str] = Field(default_factory=list)
    image_ocr_engines: list[str] = Field(default_factory=list)
    default_top_k: int
    default_score_threshold: float
    max_upload_mb: int
    documents: int
    chunks: int


class ErrorResponse(BaseModel):
    detail: str
