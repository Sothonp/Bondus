"""Reading photos that students attach to a question.

Two kinds of engine read each image at the same time:

* Kiri OCR (local, free) is good at Khmer words but drops formulas.
* A vision model (Groq, then Gemini as a fallback) is good at formulas and
  layout but can garble Khmer words.

Both readings go to the answering model, which reconciles them, so no extra
API call is spent on merging. Readings are cached by image content, and photos
are shrunk before they are sent, to keep API usage (and cost) low.
"""
from __future__ import annotations

import base64
import hashlib
import io
import logging
import random
import re
import time
from concurrent.futures import ThreadPoolExecutor, wait
from dataclasses import dataclass, field
from pathlib import Path
from typing import TYPE_CHECKING, Any, Literal

from src.ingestion.ocr import (
    KHMER_HINT_TEMPLATE,
    RETRYABLE_STATUS,
    CachedPageOCR,
    GeminiPageOCR,
    OCREngine,
    OCRError,
    PageImage,
    clean_transcript,
    kiri_available,
)

if TYPE_CHECKING:
    from src.config import Settings

logger = logging.getLogger(__name__)

QUESTION_OCR_VERSION = "2"

QUESTION_OCR_PROMPT = """Transcribe the mathematics problem(s) in this photo from a Cambodian Grade 12 student.

- Write Khmer text in Unicode Khmer, exactly as printed or handwritten. Do not translate or solve anything.
- Write every mathematical expression in LaTeX: $...$ inline, $$...$$ for displayed equations,
  with proper commands (\\frac, \\sqrt, \\lim_{x \\to a}, \\int_a^b, \\vec{u}, \\begin{cases}...\\end{cases}).
- Keep question numbers (I. II. ១. ២. ក. ខ.) and one item per line.
- Skip page headers, footers, exam dates and watermarks.
- For a figure, write one line: [រូបភាព: short description].
- Write [?] for anything illegible.
- Transcribe each line once. Never repeat a word or phrase that is not repeated in the image.

Output only the transcription, with no preamble or code fences."""

IMAGE_MIME_TYPES = ("image/jpeg", "image/png", "image/webp")

# A phrase of 6-200 characters repeated at least 5 more times in a row: vision
# models sometimes loop like this on Khmer text. (Short repeats such as the
# "0 & " cells of a zero matrix are left alone.)
_REPEAT_LOOP = re.compile(r"(.{6,200}?)(?:\s*\1){5,}", re.DOTALL)


def trim_repetition(text: str) -> tuple[str, bool]:
    """Collapse runaway repetition to a single copy. Returns (text, trimmed)."""
    trimmed = False

    def keep_one(match: re.Match[str]) -> str:
        nonlocal trimmed
        trimmed = True
        return match.group(1)

    return _REPEAT_LOOP.sub(keep_one, text), trimmed


def _is_retryable(error: OCRError) -> bool:
    """A rate limit or a server hiccup is worth another attempt; a 400 is not."""
    return error.status is None or error.status in RETRYABLE_STATUS


class ImageInputError(ValueError):
    """The attachment is not a readable image."""


def prepare_image(data: bytes, max_side: int = 2000) -> PageImage:
    """Decode, apply the EXIF rotation of phone photos, shrink and re-encode as JPEG.

    Smaller images cost fewer vision tokens and OCR faster; 2000 px keeps
    Khmer subscripts legible.
    """
    from PIL import Image, ImageOps, UnidentifiedImageError

    try:
        with Image.open(io.BytesIO(data)) as source:
            image = ImageOps.exif_transpose(source)
            image.load()
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise ImageInputError("The attachment is not a readable image") from exc
    if image.mode in ("RGBA", "LA", "P"):
        image = image.convert("RGBA")
        background = Image.new("RGB", image.size, "white")
        background.paste(image, mask=image.getchannel("A"))
        image = background
    else:
        image = image.convert("RGB")
    if max(image.size) > max_side:
        image.thumbnail((max_side, max_side), Image.LANCZOS)
    buffer = io.BytesIO()
    image.save(buffer, format="JPEG", quality=90, optimize=True)
    return PageImage(buffer.getvalue(), "image/jpeg")


def decode_image(data_b64: str, max_bytes: int, max_side: int) -> PageImage:
    """A base64 (or data: URL) attachment, validated and prepared."""
    if data_b64.startswith("data:"):
        data_b64 = data_b64.partition(",")[2]
    if len(data_b64) * 3 // 4 > max_bytes:
        raise ImageInputError(f"Image exceeds the {max_bytes // (1024 * 1024)} MB limit")
    try:
        raw = base64.b64decode(data_b64, validate=True)
    except ValueError as exc:
        raise ImageInputError("Image data is not valid base64") from exc
    if not raw:
        raise ImageInputError("Image is empty")
    return prepare_image(raw, max_side)


class GroqVisionOCR(CachedPageOCR):
    """Transcribes an image with a Groq-hosted vision model (e.g. Qwen)."""

    engine: OCREngine = "groq"  # type: ignore[assignment]
    label = "Groq vision"
    _cache_prefix = "groq-vision"
    # Groq takes the newer name; some OpenAI-compatible hosts know only max_tokens.
    _token_param = "max_completion_tokens"
    extra_body: dict | None = None

    def __init__(
        self,
        api_key: str,
        model: str,
        *,
        mode: Literal["auto", "always"] = "always",
        min_chars: int = 20,
        cache_dir: str | Path | None = None,
        concurrency: int = 1,
        max_retries: int = 0,
        timeout: float = 60.0,
        reasoning_effort: str | None = None,
        max_output_tokens: int = 1000,
        frequency_penalty: float = 0.4,
        prompt: str = QUESTION_OCR_PROMPT,
        client: Any = None,
    ) -> None:
        super().__init__(
            mode=mode, min_chars=min_chars, cache_dir=cache_dir, concurrency=concurrency
        )
        import groq

        self._groq = groq
        # Retries are off for a student photo: on a rate limit the next engine
        # reads the image instead. A corpus ingest has no next engine and sets
        # max_retries, because a dropped page is a hole in the index.
        self._client = client or groq.Groq(api_key=api_key, timeout=timeout, max_retries=0)
        self.max_retries = max(0, max_retries)
        self.model = model
        self.reasoning_effort = reasoning_effort
        self.max_output_tokens = max_output_tokens
        # Qwen at temperature 0 sometimes loops on Khmer text; a mild frequency
        # penalty stopped it in testing without hurting the transcription.
        self.frequency_penalty = frequency_penalty
        self.prompt = prompt

    def _cache_key(self, payload: PageImage) -> str:
        digest = hashlib.sha256()
        parts = [self._cache_prefix, QUESTION_OCR_VERSION, self.model, payload.mime_type]
        if self.prompt != QUESTION_OCR_PROMPT:
            # Page OCR asks for a different transcript of the same image
            # (headings, tables, the whole page), so it gets its own entries
            # and the photo cache keeps the keys it already has.
            parts.append(hashlib.sha256(self.prompt.encode("utf-8")).hexdigest())
        for part in parts:
            digest.update(part.encode("utf-8") + b"\x00")
        digest.update(payload.data)
        return digest.hexdigest()

    def _transcribe_uncached(self, payload: PageImage, hint: str | None = None) -> tuple[str, bool]:
        for attempt in range(self.max_retries + 1):
            try:
                return self._request(payload, hint)
            except OCRError as exc:
                if attempt == self.max_retries or not _is_retryable(exc):
                    raise
                delay = min(60.0, 2.0 ** (attempt + 1)) + random.uniform(0, 1)
                logger.info("%s busy; retrying in %.0fs (attempt %d)", self.label, delay, attempt + 1)
                time.sleep(delay)
        raise AssertionError("unreachable")

    def _request(self, payload: PageImage, hint: str | None = None) -> tuple[str, bool]:
        groq = self._groq
        url = f"data:{payload.mime_type};base64,{base64.b64encode(payload.data).decode('ascii')}"
        extra = {"reasoning_effort": self.reasoning_effort} if self.reasoning_effort else {}
        if self.frequency_penalty:
            extra["frequency_penalty"] = self.frequency_penalty
        if self.extra_body:
            extra["extra_body"] = self.extra_body
        prompt = self.prompt + KHMER_HINT_TEMPLATE.format(reading=hint) if hint else self.prompt
        try:
            response = self._client.chat.completions.create(
                model=self.model,
                messages=[{
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": url}},
                    ],
                }],
                **{self._token_param: self.max_output_tokens},
                temperature=0.0,
                **extra,
            )
        except groq.APIStatusError as exc:
            raise OCRError(
                f"{self.label} failed ({exc.status_code}): {exc.message}", exc.status_code
            ) from exc
        except groq.APIError as exc:
            raise OCRError(f"{self.label} request failed: {exc}") from exc
        choice = response.choices[0] if response.choices else None
        text = clean_transcript((choice.message.content if choice else None) or "")
        text, looped = trim_repetition(text)
        if looped:
            logger.warning("%s repeated itself; the loop was trimmed", self.model)
        # A looping or cut-off reading is reported as truncated, so it is not cached.
        truncated = looped or bool(choice and choice.finish_reason == "length")
        if not text.strip():
            raise OCRError(f"{self.label} returned no text")
        return text, truncated


class OpenRouterVisionOCR(GroqVisionOCR):
    """Transcribes an image with a vision model on OpenRouter.

    OpenRouter speaks the OpenAI API, whose client has the same
    ``chat.completions.create`` call and the same error classes as Groq's, so
    only the client, the token parameter and the cache entries differ.
    """

    engine: OCREngine = "openrouter"  # type: ignore[assignment]
    label = "OpenRouter vision"
    _cache_prefix = "openrouter-vision"
    _token_param = "max_tokens"

    def __init__(
        self,
        api_key: str,
        model: str,
        *,
        base_url: str = "https://openrouter.ai/api/v1",
        timeout: float = 60.0,
        default_headers: dict[str, str] | None = None,
        disable_reasoning: bool = True,
        client: Any = None,
        **kwargs: Any,
    ) -> None:
        import openai

        client = client or openai.OpenAI(
            api_key=api_key, base_url=base_url, timeout=timeout, max_retries=0,
            default_headers=default_headers or None,
        )
        super().__init__(api_key, model, timeout=timeout, client=client, **kwargs)
        # ``_request`` names its errors through this module.
        self._groq = openai
        # A free model that thinks first spends the page's budget on the thinking.
        if disable_reasoning:
            self.extra_body = {"reasoning": {"enabled": False, "exclude": True}}


class QuestionGeminiOCR(GeminiPageOCR):
    """Gemini with the question prompt and its own cache entries."""

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        kwargs.setdefault("prompt", QUESTION_OCR_PROMPT)
        super().__init__(*args, **kwargs)
        self.max_output_tokens = 4000

    def _cache_key(self, payload: PageImage, version: str = QUESTION_OCR_VERSION) -> str:
        return super()._cache_key(payload, f"question-{version}")

    def _legacy_cache_keys(self, payload: PageImage) -> list[str]:
        return []


@dataclass
class ImageReading:
    """What the engines read from one attached image."""

    index: int
    vision_text: str | None = None
    vision_engine: str | None = None
    khmer_text: str | None = None
    khmer_engine: str | None = None
    warnings: list[str] = field(default_factory=list)

    @property
    def has_text(self) -> bool:
        return bool(self.vision_text or self.khmer_text)

    @property
    def search_text(self) -> str:
        """Text used for retrieval: the vision reading has the math."""
        return self.vision_text or self.khmer_text or ""

    @property
    def summary(self) -> str:
        """A single readable text, kept in chat history for follow-up questions."""
        parts = []
        if self.vision_text:
            parts.append(self.vision_text)
        if self.khmer_text:
            parts.append(f"(Khmer OCR: {self.khmer_text})" if self.vision_text else self.khmer_text)
        return "\n\n".join(parts)


def _engine_name(engine: CachedPageOCR) -> str:
    return f"{engine.engine}:{engine.model}"


class HybridImageOCR:
    """Runs the Khmer engine and the vision chain on every image concurrently."""

    def __init__(
        self,
        *,
        khmer: CachedPageOCR | None,
        vision: list[CachedPageOCR],
        timeout: float = 90.0,
    ) -> None:
        if khmer is None and not vision:
            raise ValueError("at least one OCR engine is required")
        self.khmer = khmer
        self.vision = list(vision)
        self.timeout = timeout

    @property
    def engines(self) -> list[str]:
        names = [_engine_name(self.khmer)] if self.khmer is not None else []
        return names + [_engine_name(engine) for engine in self.vision]

    def warmup(self) -> None:
        warm = getattr(self.khmer, "warmup", None)
        if warm is not None:
            warm()

    def _read_vision(self, payload: PageImage) -> tuple[str | None, str | None, list[str]]:
        warnings: list[str] = []
        for engine in self.vision:
            try:
                text, truncated = engine.transcribe_page(payload)
            except OCRError as exc:
                warnings.append(f"{_engine_name(engine)}: {exc}")
                logger.warning("Image OCR with %s failed: %s", _engine_name(engine), exc)
                continue
            text, looped = trim_repetition(text)
            if truncated or looped:
                warnings.append(f"{_engine_name(engine)}: the reading may be incomplete")
            if text.strip():
                return text.strip(), _engine_name(engine), warnings
        return None, None, warnings

    def _read_khmer(self, payload: PageImage) -> tuple[str | None, list[str]]:
        try:
            text, _ = self.khmer.transcribe_page(payload)
        except OCRError as exc:
            logger.warning("Khmer OCR failed: %s", exc)
            return None, [f"{_engine_name(self.khmer)}: {exc}"]
        return (text.strip() or None), []

    # -- the PageOCR interface, so image uploads to the library use this too --

    def needs_ocr(self, extracted_text: str) -> bool:
        return True

    def transcribe_pages(self, pages: dict[int, PageImage]) -> tuple[dict[int, str], list[str]]:
        numbers = list(pages)
        prepared = []
        for number in numbers:
            try:
                prepared.append(prepare_image(pages[number].data))
            except ImageInputError:
                prepared.append(pages[number])
        readings = self.read(prepared)
        texts = {number: r.search_text for number, r in zip(numbers, readings) if r.has_text}
        warnings = [f"Image {number}: {w}" for number, r in zip(numbers, readings) for w in r.warnings]
        return texts, warnings

    def read(self, images: list[PageImage]) -> list[ImageReading]:
        readings = [ImageReading(index=number) for number in range(1, len(images) + 1)]
        if not images:
            return readings
        # Kiri serialises internally; each image gets its own vision worker.
        pool = ThreadPoolExecutor(max_workers=len(images) + 1, thread_name_prefix="image-ocr")
        try:
            vision_jobs = {
                pool.submit(self._read_vision, payload): reading
                for payload, reading in zip(images, readings)
            } if self.vision else {}
            khmer_jobs = {
                pool.submit(self._read_khmer, payload): reading
                for payload, reading in zip(images, readings)
            } if self.khmer is not None else {}
            done, pending = wait([*vision_jobs, *khmer_jobs], timeout=self.timeout)
            for future in pending:
                reading = vision_jobs.get(future) or khmer_jobs[future]
                reading.warnings.append("OCR timed out")
            for future in done:
                if future in vision_jobs:
                    reading = vision_jobs[future]
                    reading.vision_text, reading.vision_engine, warnings = future.result()
                else:
                    reading = khmer_jobs[future]
                    reading.khmer_text, warnings = future.result()
                    if reading.khmer_text:
                        reading.khmer_engine = _engine_name(self.khmer)
                reading.warnings.extend(warnings)
        finally:
            # Never block the request on work that timed out; it finishes (and
            # fills the cache) in the background.
            pool.shutdown(wait=False, cancel_futures=True)
        return readings


def build_image_ocr(settings: Settings) -> HybridImageOCR | None:
    engines = settings.image_ocr_engine_list
    cache_dir = settings.ocr_cache_dir
    khmer = None
    if "kiri" in engines and kiri_available():
        from src.ingestion.khmer_ocr import KiriPageOCR

        khmer = KiriPageOCR(
            settings.kiri_model,
            mode="always",
            cache_dir=cache_dir,
            device=settings.kiri_device,
            decode_method=settings.kiri_decode_method,
            min_confidence=settings.kiri_min_confidence,
            khmer_only=True,
            render_scale=settings.kiri_render_scale,
        )
    vision: list[CachedPageOCR] = []
    for name in engines:
        if name == "groq" and settings.groq_api_key is not None:
            vision.append(
                GroqVisionOCR(
                    settings.groq_api_key.get_secret_value(),
                    settings.groq_vision_model,
                    cache_dir=cache_dir,
                    timeout=settings.image_ocr_timeout_seconds,
                    reasoning_effort=settings.groq_vision_reasoning_effort,
                    max_output_tokens=settings.groq_vision_max_tokens,
                    frequency_penalty=settings.groq_vision_frequency_penalty,
                )
            )
        elif name == "gemini" and settings.gemini_api_key is not None:
            vision.append(
                QuestionGeminiOCR(
                    settings.gemini_api_key.get_secret_value(),
                    settings.gemini_vision_model,
                    mode="always",
                    cache_dir=cache_dir,
                    max_retries=0,
                    thinking_level="minimal",
                    timeout=settings.image_ocr_timeout_seconds,
                )
            )
    if khmer is None and not vision:
        logger.info("No image OCR engine available; attached images cannot be read")
        return None
    return HybridImageOCR(khmer=khmer, vision=vision, timeout=settings.image_ocr_timeout_seconds)
