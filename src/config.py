"""Application settings, loaded from environment variables and `.env`."""
from __future__ import annotations

import logging
from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import AliasChoices, Field, PrivateAttr, SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)

PROJECT_ROOT = Path(__file__).resolve().parent.parent

LLMProvider = Literal["auto", "anthropic", "gemini", "groq", "none"]
EmbeddingBackend = Literal["sentence-transformers", "hashing"]
KhmerSegmenterBackend = Literal["auto", "crf", "regex"]
OCREngineSetting = Literal["auto", "gemini", "kiri"]
Effort = Literal["low", "medium", "high", "xhigh", "max"]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=PROJECT_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    _config_warnings: list[str] = PrivateAttr(default_factory=list)

    # --- Server ---
    app_name: str = "Reanmath RAG"
    app_version: str = "0.3.0"
    log_level: str = "INFO"
    # The Vite dev server (5173) and `vite preview` (4173) call the API cross-origin
    # unless requests go through the dev proxy.
    cors_origins: str = (
        "http://localhost:5173,http://127.0.0.1:5173,"
        "http://localhost:4173,http://127.0.0.1:4173,"
        "http://localhost:8000,http://127.0.0.1:8000"
    )
    max_upload_mb: int = Field(25, ge=1, le=500)

    # --- Answer generation ---
    llm_provider: LLMProvider = "auto"
    llm_max_tokens: int = Field(16000, ge=256, le=64000)
    llm_timeout_seconds: float = Field(300.0, gt=0)
    # When the chosen provider fails, try the other configured providers, then
    # answer with the retrieved passages instead of an error.
    llm_fallback: bool = True

    anthropic_api_key: SecretStr | None = None
    anthropic_model: str = Field(
        "claude-opus-5", validation_alias=AliasChoices("anthropic_model", "claude_model")
    )
    anthropic_effort: Effort = "high"
    anthropic_fallbacks: bool = True

    gemini_api_key: SecretStr | None = Field(
        None, validation_alias=AliasChoices("gemini_api_key", "google_api_key")
    )
    gemini_model: str = "gemini-3.8-flash"
    # Tried in order when the main model is overloaded, rate limited or unavailable.
    gemini_fallback_models: str = "gemini-3.5-flash,gemini-flash-latest"
    gemini_temperature: float = Field(0.2, ge=0.0, le=2.0)

    groq_api_key: SecretStr | None = None
    groq_model: str = "openai/gpt-oss-120b"
    groq_temperature: float = Field(0.2, ge=0.0, le=2.0)
    groq_max_tokens: int = Field(3000, ge=256, le=64000)
    # Below this many answer tokens Groq is skipped (the next model answers)
    # rather than producing a cut-off answer.
    groq_min_completion_tokens: int = Field(1500, ge=64, le=64000)
    # Groq counts the prompt plus max_completion_tokens against this per-minute
    # budget and rejects larger requests (free tier: 8000). 0 = no limit.
    groq_tokens_per_minute: int = Field(8000, ge=0)
    # On a rate limit, wait for Groq only if it asks for at most this long;
    # otherwise the next model in the fallback chain answers.
    groq_max_retry_wait: float = Field(12.0, ge=0.0, le=120.0)

    # --- Embeddings ---
    embedding_backend: EmbeddingBackend = "sentence-transformers"
    embedding_model: str = Field(
        "intfloat/multilingual-e5-small",
        validation_alias=AliasChoices("embedding_model", "embed_model"),
    )
    embedding_device: str = "cpu"
    embedding_batch_size: int = Field(32, ge=1, le=1024)
    hashing_dim: int = Field(1024, ge=64, le=65536)
    # Load the embedding model in the background at startup (the first question
    # otherwise waits for it).
    preload_embedder: bool = True

    # --- Storage ---
    vector_store_path: Path = PROJECT_ROOT / "storage" / "vector_index"
    data_dir: Path = PROJECT_ROOT / "data"
    # Built React app (`npm run build`), served at / when present.
    frontend_dist_dir: Path = PROJECT_ROOT / "dist"

    # --- Ingestion ---
    chunk_size: int = Field(500, ge=50, le=20000)
    chunk_overlap: int = Field(50, ge=0)
    khmer_segmenter: KhmerSegmenterBackend = "auto"

    # --- OCR for scanned PDFs and images ---
    ocr_mode: Literal["auto", "always", "never"] = "auto"
    ocr_engine: OCREngineSetting = "auto"
    ocr_model: str = "gemini-3.5-flash"
    ocr_min_chars: int = Field(20, ge=0)
    ocr_concurrency: int = Field(4, ge=1, le=32)
    ocr_max_retries: int = Field(4, ge=0, le=10)
    ocr_requests_per_minute: int = Field(0, ge=0, le=10000)
    ocr_thinking_level: Literal["minimal", "low", "medium", "high"] = "low"
    ocr_cache_dir: Path = PROJECT_ROOT / "storage" / "ocr_cache"

    # Kiri OCR (local, open source; Khmer words only by default)
    kiri_model: str = "mrrtmob/kiri-ocr"
    kiri_device: str = "cpu"
    kiri_decode_method: Literal["fast", "accurate", "beam"] = "accurate"
    kiri_min_confidence: float = Field(0.2, ge=0.0, le=1.0)
    kiri_khmer_only: bool = True
    kiri_render_scale: float = Field(2.0, ge=0.5, le=6.0)

    # --- Background ingestion ---
    max_ingest_jobs: int = Field(100, ge=1, le=10000)

    # --- Images attached to questions ---
    # Engines read each photo in parallel: Kiri (local, free) for Khmer words and a
    # vision model for math/LaTeX. Vision models are tried in the listed order.
    image_ocr_engines: str = "kiri,groq,gemini"
    groq_vision_model: str = "qwen/qwen3.8-27b"
    groq_vision_reasoning_effort: str | None = None
    # Groq's free tier allows 1000 output tokens per minute for Qwen; larger
    # requests are rejected outright. A question photo needs about 600.
    groq_vision_max_tokens: int = Field(1000, ge=128, le=32000)
    groq_vision_frequency_penalty: float = Field(0.4, ge=0.0, le=2.0)
    gemini_vision_model: str = "gemini-3.5-flash"
    image_max_count: int = Field(4, ge=1, le=10)
    image_max_mb: float = Field(10.0, gt=0, le=50)
    image_max_side: int = Field(2000, ge=512, le=8000)
    image_ocr_timeout_seconds: float = Field(90.0, gt=0)
    preload_kiri: bool = True

    # --- Retrieval ---
    top_k: int = Field(5, ge=1, le=50)
    score_threshold: float = Field(0.75, ge=0.0, le=1.0)
    max_context_chars: int = Field(12000, ge=500)

    @field_validator("vector_store_path", "data_dir", "ocr_cache_dir", "frontend_dist_dir", mode="after")
    @classmethod
    def _resolve_relative(cls, value: Path) -> Path:
        value = value.expanduser()
        return value if value.is_absolute() else (PROJECT_ROOT / value).resolve()

    @field_validator("anthropic_api_key", "gemini_api_key", "groq_api_key", mode="after")
    @classmethod
    def _blank_key_is_none(cls, value: SecretStr | None) -> SecretStr | None:
        if value is None or not value.get_secret_value().strip():
            return None
        return value

    @model_validator(mode="after")
    def _check_api_keys(self) -> "Settings":
        """Drop keys that cannot belong to their provider, so they are not used."""
        warnings: list[str] = []
        groq_key = self.groq_api_key.get_secret_value().strip() if self.groq_api_key else None
        if groq_key is not None:
            gemini_key = self.gemini_api_key.get_secret_value().strip() if self.gemini_api_key else None
            if groq_key == gemini_key:
                warnings.append(
                    "GROQ_API_KEY is a copy of GEMINI_API_KEY; ignoring it "
                    "(create a Groq key at https://console.groq.com/keys)"
                )
            elif not groq_key.startswith("gsk_"):
                warnings.append(
                    "GROQ_API_KEY does not look like a Groq key (they start with 'gsk_'); ignoring it"
                )
            if warnings:
                self.groq_api_key = None
        for warning in warnings:
            logger.warning(warning)
        self._config_warnings = warnings
        return self

    @property
    def config_warnings(self) -> list[str]:
        return list(self._config_warnings)

    @property
    def gemini_fallback_model_list(self) -> list[str]:
        models = [model.strip() for model in self.gemini_fallback_models.split(",") if model.strip()]
        return [model for model in dict.fromkeys(models) if model != self.gemini_model]

    @model_validator(mode="after")
    def _check_chunking(self) -> "Settings":
        if self.chunk_overlap >= self.chunk_size:
            raise ValueError(
                f"CHUNK_OVERLAP ({self.chunk_overlap}) must be smaller than CHUNK_SIZE ({self.chunk_size})"
            )
        return self

    @property
    def image_ocr_engine_list(self) -> list[str]:
        known = ("kiri", "groq", "gemini")
        engines = [e.strip().lower() for e in self.image_ocr_engines.split(",") if e.strip()]
        unknown = sorted(set(engines) - set(known))
        if unknown:
            raise ValueError(f"Unknown IMAGE_OCR_ENGINES: {', '.join(unknown)} (use {', '.join(known)})")
        return list(dict.fromkeys(engines))

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def max_upload_bytes(self) -> int:
        return self.max_upload_mb * 1024 * 1024

    @property
    def resolved_llm_provider(self) -> Literal["anthropic", "gemini", "groq", "none"]:
        if self.llm_provider != "auto":
            return self.llm_provider
        if self.anthropic_api_key is not None:
            return "anthropic"
        if self.gemini_api_key is not None:
            return "gemini"
        if self.groq_api_key is not None:
            return "groq"
        return "none"

    @property
    def embedding_identity(self) -> str:
        """Name recorded in the vector index so mismatched embeddings are detected."""
        if self.embedding_backend == "hashing":
            return f"hashing-{self.hashing_dim}"
        return self.embedding_model


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
