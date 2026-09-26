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

LLMProvider = Literal[
    "auto", "anthropic", "gemini", "groq", "cerebras", "openrouter", "sea-lion", "none"
]
EmbeddingBackend = Literal["sentence-transformers", "hashing"]
KhmerSegmenterBackend = Literal["auto", "crf", "regex"]
OCREngineSetting = Literal["auto", "gemini", "kiri", "groq", "surya", "hybrid"]
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
    # Ingesting and deleting documents change the one index every student
    # searches, and the API has no accounts to tell them apart -- so on a public
    # deployment anyone who finds the URL could add passages to everyone's
    # answers, or delete the curriculum. Set ALLOW_WRITES=false there and build
    # the index locally, where this stays true.
    allow_writes: bool = True

    # --- Answer generation ---
    llm_provider: LLMProvider = "auto"
    llm_max_tokens: int = Field(16000, ge=256, le=64000)
    llm_timeout_seconds: float = Field(300.0, gt=0)
    # When the chosen provider fails, try the other configured providers, then
    # answer with the retrieved passages instead of an error.
    llm_fallback: bool = True
    # How the next question picks among those models. "priority" starts at the
    # head of the chain whenever it is healthy -- Groq answers in about 1.5 s
    # against 10-30 s for the Gemini models, so it should carry the traffic it
    # can. "rotate" instead starts each question a place further down, sharing
    # the load across several free tiers so none reaches its quota alone; it
    # costs latency, and is the better setting once the question rate is high
    # enough that the head of the chain is rate limited most of the time.
    # Either way a model that fails is rested and skipped (see below).
    llm_selection: Literal["priority", "rotate"] = "priority"
    # A model that rate limited or fell over is skipped for this long (doubling
    # while it keeps failing, up to the maximum) rather than being retried on
    # every question. A provider that sends `retry-after` sets its own wait.
    llm_cooldown_seconds: float = Field(15.0, ge=0.0)
    llm_max_cooldown_seconds: float = Field(300.0, ge=1.0)

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
    # Gemini thinks before answering unless told not to, and on a tutor reply
    # that shows its working anyway the thinking mostly buys latency: it is
    # spent before the first token, so the student watches an empty bubble.
    # "minimal" or "low" for chat; raise it only if answer quality drops.
    gemini_thinking_level: Literal["minimal", "low", "medium", "high"] = "low"
    # Tried in order when the main model is overloaded, rate limited or unavailable.
    gemini_fallback_models: str = "gemini-3.5-flash,gemini-flash-latest"
    gemini_temperature: float = Field(0.2, ge=0.0, le=2.0)

    groq_api_key: SecretStr | None = None
    groq_model: str = "openai/gpt-oss-120b"
    groq_temperature: float = Field(0.2, ge=0.0, le=2.0)
    # gpt-oss reasons before it answers, and those tokens are generated before
    # the first visible one -- so they are the student's entire wait, spent on
    # thinking that is thrown away. "low" keeps the reasoning short; blank sends
    # nothing, for a Groq model that rejects the parameter (the chain then moves
    # on to the next model, which is a slow way to discover it).
    groq_reasoning_effort: Literal["", "low", "medium", "high"] = "low"
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

    # Cerebras serves the same open models as Groq on its own hardware, so it is
    # a separate quota for an answer of the same character: when Groq has spent
    # its tokens for the minute, `gpt-oss-120b` here is the identical model.
    # OpenAI-compatible, so it is reached with the openai client.
    cerebras_api_key: SecretStr | None = None
    cerebras_model: str = "gpt-oss-120b"
    # Tried in order when the main model is overloaded, rate limited or unavailable.
    # Cerebras has no other free model to fall back on.
    cerebras_fallback_models: str = ""
    cerebras_base_url: str = "https://api.cerebras.ai/v1"
    cerebras_temperature: float = Field(0.2, ge=0.0, le=2.0)
    # The free tier caps the context at 8192 tokens, the same shape of limit Groq
    # has, so the prompt is shrunk to fit the same way. 0 = no limit (paid tier).
    cerebras_tokens_per_minute: int = Field(8000, ge=0)
    cerebras_min_completion_tokens: int = Field(1500, ge=64, le=64000)
    cerebras_max_retry_wait: float = Field(0.0, ge=0.0, le=120.0)

    # OpenRouter fronts many providers behind one key, so it is the broadest
    # backstop: when Groq, Gemini and Cerebras have all run dry it reaches a
    # different set of hosts entirely. Keys start with `sk-or-`. Models whose id
    # ends in `:free` cost nothing but are rate limited per minute and per day.
    # OPEN_ROUTER_API_KEY is accepted too: the product is written both ways, and
    # a key silently ignored over a spelling is an outage nobody thinks to look for.
    openrouter_api_key: SecretStr | None = Field(
        None, validation_alias=AliasChoices("openrouter_api_key", "open_router_api_key")
    )
    # Measured on 2026-09-19 against two Khmer calculus questions: these three
    # each answered correctly in Khmer with $$ formulas, twice. Both Gemma free
    # endpoints were rate limited upstream (shared across all OpenRouter users,
    # nothing to do with this key), and two others were rejected -- dots-3 lost
    # its LaTeX and its answer on the second question, nemotron-3.5-lightning
    # took 193 s to answer wrongly. `GET {base_url}/models` lists what is free
    # now; retest before changing these, because one good answer proves nothing.
    # Ling and DeepSeek were dropped on 2026-09-26, which leaves the Nemotron of
    # those three. Chinese models are allowed again, as long as nothing they
    # write reaches the student in Chinese.
    openrouter_model: str = "nvidia/nemotron-3-ultra-550b-a55b:free"
    # Tried in order when the main model is overloaded, rate limited or unavailable.
    # Gemma has not been retested on Khmer answers; its free endpoint is often
    # rate limited upstream.
    openrouter_fallback_models: str = "google/gemma-4-31b-it:free"
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    openrouter_temperature: float = Field(0.2, ge=0.0, le=2.0)
    # Nearly every free model here can think before answering, which spends the
    # completion budget on reasoning the student never sees. Off by default; set
    # this false only for a model that answers better with it.
    openrouter_disable_reasoning: bool = True
    # Optional: OpenRouter attributes traffic to an app through these headers.
    openrouter_site_url: str = ""
    openrouter_app_name: str = "Bondus"

    # SEA-LION (AI Singapore), an open model family trained for Southeast Asian
    # languages including Khmer. The API is OpenAI-compatible, so it is reached
    # with the openai client pointed at SEA_LION_BASE_URL.
    sea_lion_api_key: SecretStr | None = None
    # Verified against the live catalogue on 2026-09-19; `GET {base_url}/models`
    # lists what the key can actually reach, and a wrong id fails at request time
    # rather than at startup. Gemma is the default rather than the newer
    # Qwen-SEA-LION-v4.5, which reasons before answering and returns an empty
    # answer when the token budget runs out in its reasoning.
    sea_lion_model: str = "aisingapore/Gemma-SEA-LION-v4-27B-IT"
    sea_lion_base_url: str = "https://api.sea-lion.ai/v1"
    sea_lion_temperature: float = Field(0.2, ge=0.0, le=2.0)

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
    # A chunk cut from the middle of an exercise carries that exercise's
    # opening statement (see ingestion.chunk.attach_stems). The model is always
    # shown it, which costs retrieval nothing. Repeating it in the *embedded*
    # text is a trade-off, measured on this corpus at recall@5 over 130
    # continuation chunks:
    #
    #   chars |  question names the function  |  question gives only the task
    #       0 |             32.3%             |            73.8%
    #      80 |             46.9%             |            56.9%
    #     200 |             62.3%             |            47.7%
    #
    # Longer helps a student who states the problem ("for f(x)=..., study the
    # variation") and hurts one who asks the task alone -- though for that
    # second kind any exercise on the topic is a fine answer, which the measure
    # above does not credit. 0 keeps retrieval exactly as it was; raise it if
    # your students tend to paste the whole question.
    stem_embedding_chars: int = Field(0, ge=0, le=500)
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

    # Surya 2 (local, open source): whole pages with clean LaTeX and headings,
    # weaker Khmer than Kiri (see src/ingestion/surya_ocr.py). surya-ocr cannot
    # share this project's environment, so SURYA_PYTHON is the interpreter of a
    # separate one with surya-ocr installed. It serves its model with llama.cpp
    # (SURYA_LLAMA_BINARY, the llama-server binary) or vLLM (in Docker).
    surya_python: str | None = None
    surya_backend: Literal["llamacpp", "vllm"] | None = None
    surya_llama_binary: str | None = None
    surya_timeout_seconds: float = Field(600.0, gt=0)

    # OCR_ENGINE=hybrid: Kiri reads the Khmer of each page and hands its reading
    # to a vision model, which transcribes the page with the formulas in LaTeX
    # and spells the Khmer the way Kiri read it. Vision engines are tried in the
    # listed order; one without a key is skipped.
    # Chinese models such as Groq's Qwen may be listed: a reading with Chinese
    # text in it is rejected and the next engine is tried. surya is the local one (needs SURYA_PYTHON); it takes no
    # hint, so Kiri's reading does not reach it.
    hybrid_vision_engines: str = "gemini,openrouter"
    # By default a page whose vision engines all failed is still indexed from
    # Kiri's Khmer-only reading (prose, no formulas). Set this to fail the page
    # instead, so a re-run picks it up rather than indexing it without its maths.
    hybrid_require_vision: bool = False
    # With several vision engines: "first" keeps the first usable reading (one
    # call per page); "ensemble" asks them all at once and keeps the reading that
    # agrees best with Kiri's Khmer and with the other engines' formulas.
    hybrid_combine: Literal["first", "ensemble"] = "first"
    # Must accept images. Free endpoints are
    # shared by all OpenRouter users and often rate limited upstream;
    # ling-3.0-flash-vl stopped being free on 2026-09-26.
    openrouter_vision_model: str = "google/gemma-4-31b-it:free"

    # --- Background ingestion ---
    max_ingest_jobs: int = Field(100, ge=1, le=10000)

    # --- Images attached to questions ---
    # Engines read each photo in parallel: Kiri (local, free) for Khmer words and a
    # vision model for math/LaTeX. Vision models are tried in the listed order.
    # A reading in Chinese is skipped for the next vision model (see
    # hybrid_vision_engines). surya is the local vision model (needs
    # SURYA_PYTHON); it is slow on a CPU, so list it after the hosted ones.
    image_ocr_engines: str = "kiri,gemini"
    groq_vision_model: str = "qwen/qwen3.8-27b"
    groq_vision_reasoning_effort: str | None = None
    # Groq's free tier allows 1000 output tokens per minute for Qwen; larger
    # requests are rejected outright. A question photo needs about 600.
    groq_vision_max_tokens: int = Field(1000, ge=128, le=32000)
    # A whole textbook page is several times a question photo. The free tier
    # rejects a request this large outright (400), and the hybrid engine then
    # falls through to the next vision engine, so Groq page OCR needs a paid tier.
    groq_page_max_tokens: int = Field(4000, ge=256, le=32000)
    groq_vision_frequency_penalty: float = Field(0.4, ge=0.0, le=2.0)
    gemini_vision_model: str = "gemini-3.5-flash"
    image_max_count: int = Field(4, ge=1, le=10)
    image_max_mb: float = Field(10.0, gt=0, le=50)
    image_max_side: int = Field(2000, ge=512, le=8000)
    image_ocr_timeout_seconds: float = Field(90.0, gt=0)
    preload_kiri: bool = True

    # --- Retrieval ---
    top_k: int = Field(5, ge=1, le=50)
    # Tuned for sentence-transformers cosine scores, which sit high (~0.8) even for a loose
    # match. Hashing similarities are lexical overlap and peak far lower, so that cutoff would
    # reject every passage; `_scale_score_threshold` swaps in the hashing default below unless
    # SCORE_THRESHOLD is set explicitly.
    score_threshold: float = Field(0.75, ge=0.0, le=1.0)
    hashing_score_threshold: float = Field(0.15, ge=0.0, le=1.0)
    max_context_chars: int = Field(12000, ge=500)

    @field_validator("vector_store_path", "data_dir", "ocr_cache_dir", "frontend_dist_dir", mode="after")
    @classmethod
    def _resolve_relative(cls, value: Path) -> Path:
        value = value.expanduser()
        return value if value.is_absolute() else (PROJECT_ROOT / value).resolve()

    @field_validator(
        "anthropic_api_key", "gemini_api_key", "groq_api_key", "cerebras_api_key",
        "openrouter_api_key", "sea_lion_api_key", mode="after",
    )
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

    @property
    def openrouter_fallback_model_list(self) -> list[str]:
        models = [m.strip() for m in self.openrouter_fallback_models.split(",") if m.strip()]
        return [model for model in dict.fromkeys(models) if model != self.openrouter_model]

    @property
    def cerebras_fallback_model_list(self) -> list[str]:
        models = [model.strip() for model in self.cerebras_fallback_models.split(",") if model.strip()]
        return [model for model in dict.fromkeys(models) if model != self.cerebras_model]

    @model_validator(mode="after")
    def _scale_score_threshold(self) -> "Settings":
        """Use the hashing cutoff when that backend is on and no threshold was configured."""
        if self.embedding_backend == "hashing" and "score_threshold" not in self.model_fields_set:
            self.score_threshold = self.hashing_score_threshold
        return self

    @model_validator(mode="after")
    def _check_chunking(self) -> "Settings":
        if self.chunk_overlap >= self.chunk_size:
            raise ValueError(
                f"CHUNK_OVERLAP ({self.chunk_overlap}) must be smaller than CHUNK_SIZE ({self.chunk_size})"
            )
        return self

    @property
    def image_ocr_engine_list(self) -> list[str]:
        known = ("kiri", "groq", "gemini", "surya")
        engines = [e.strip().lower() for e in self.image_ocr_engines.split(",") if e.strip()]
        unknown = sorted(set(engines) - set(known))
        if unknown:
            raise ValueError(f"Unknown IMAGE_OCR_ENGINES: {', '.join(unknown)} (use {', '.join(known)})")
        return list(dict.fromkeys(engines))

    @property
    def hybrid_vision_engine_list(self) -> list[str]:
        known = ("gemini", "groq", "openrouter", "surya")
        engines = [e.strip().lower() for e in self.hybrid_vision_engines.split(",") if e.strip()]
        unknown = sorted(set(engines) - set(known))
        if unknown:
            raise ValueError(
                f"Unknown HYBRID_VISION_ENGINES: {', '.join(unknown)} (use {', '.join(known)})"
            )
        return list(dict.fromkeys(engines))

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def max_upload_bytes(self) -> int:
        return self.max_upload_mb * 1024 * 1024

    @property
    def resolved_llm_provider(
        self,
    ) -> Literal["anthropic", "gemini", "groq", "cerebras", "openrouter", "sea-lion", "none"]:
        if self.llm_provider != "auto":
            return self.llm_provider
        if self.anthropic_api_key is not None:
            return "anthropic"
        if self.gemini_api_key is not None:
            return "gemini"
        if self.groq_api_key is not None:
            return "groq"
        if self.cerebras_api_key is not None:
            return "cerebras"
        if self.openrouter_api_key is not None:
            return "openrouter"
        if self.sea_lion_api_key is not None:
            return "sea-lion"
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
