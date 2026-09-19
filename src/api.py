"""FastAPI application: retrieval-augmented Q&A over the ingested curriculum.

Run with:  uv run uvicorn src.api:app --reload
"""
from __future__ import annotations

import asyncio
import json
import logging
import time
import uuid
from collections import OrderedDict
from collections.abc import AsyncIterator, Awaitable, Callable, Sequence
from contextlib import asynccontextmanager
from dataclasses import dataclass, field, replace
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal, Protocol

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile, status
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

from prompts import SYSTEM_PROMPT, build_extractive_answer, build_user_message
from src.answer_format import sanitize_answer
from schemas import (
    ChatTurn,
    DeleteDocumentResponse,
    DocumentInfo,
    DocumentListResponse,
    ErrorResponse,
    HealthResponse,
    ImageReadingOut,
    IngestJob,
    IngestResponse,
    IngestTextRequest,
    QueryRequest,
    QueryResponse,
    QueryStreamDelta,
    QueryStreamImages,
    QueryStreamStatus,
    QueryStreamDone,
    QueryStreamError,
    QueryStreamMeta,
    QueryStreamReset,
    SourceChunk,
)
from src.config import Settings, get_settings
from src.embeddings.embedder import Embedder, build_embedder
from src.ingestion import (
    DuplicateSourceError,
    EmptyDocumentError,
    ExtractedDocument,
    ExtractionError,
    LatexIntegrityError,
    Section,
    UnsupportedFileTypeError,
    extract_document,
    index_document,
)
from src.ingestion.extract import clean_markdown, detect_format
from src.ingestion.khmer_segment import KhmerSegmenter, detect_language
from src.ingestion.image_ocr import HybridImageOCR, ImageInputError, ImageReading, build_image_ocr, decode_image
from src.ingestion.ocr import CachedPageOCR, PageImage, build_ocr
from src.retrieval.retriever import RetrievedChunk, Retriever
from src.vectorstore import EmbeddingMismatchError, InMemoryVectorStore

logger = logging.getLogger("reanmath")

Provider = Literal["anthropic", "gemini", "groq", "cerebras", "openrouter", "sea-lion", "none"]


# ---------------------------------------------------------------------------
# Answer generation
# ---------------------------------------------------------------------------

class LLMError(RuntimeError):
    def __init__(self, status_code: int, detail: str, retry_after: float | None = None) -> None:
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail
        # Seconds the provider itself asked us to wait, when it said so. The
        # rotation rests the model for exactly that long instead of guessing.
        self.retry_after = retry_after


@dataclass(frozen=True)
class GeneratedAnswer:
    text: str
    stop_reason: str | None = None
    model: str | None = None
    provider: Provider | None = None  # set by FallbackGenerator: who actually answered


@dataclass(frozen=True)
class StreamReset:
    """Emitted by FallbackGenerator: drop the partial answer, another model restarts it."""

    detail: str


# ``stream`` yields text deltas, then one final ``GeneratedAnswer`` (its text
# is the full answer) carrying the stop reason and model.
StreamItem = str | GeneratedAnswer | StreamReset

# The extractive answer quotes curriculum passages verbatim. Repairing its
# formatting would rewrite the corpus's own LaTeX, so it is left as it is;
# the repair pass exists for prose a model wrote.
QUOTED_STOP_REASONS = {"extractive", "llm_unavailable"}

# The model ran out of room mid-answer, under each provider's name for it. The
# client asks it to carry on, so this response is a fragment: the repair pass
# leaves the last block open for the next round to close (see answer_format).
TRUNCATED_STOP_REASONS = {"length", "max_tokens", "MAX_TOKENS"}

INVISIBLE_CHARS = "\u200b\u200c\u200d\u2060\ufeff"
MAX_INVISIBLE_RUN = 200


class OutputGuard:
    """Cleans model output as it streams.

    Some models (gpt-oss on Khmer, notably) degenerate into thousands of
    zero-width spaces. Runs of invisible characters are collapsed to one, and
    a run longer than ``MAX_INVISIBLE_RUN`` aborts the answer so another model
    can take over.
    """

    def __init__(self, model: str | None) -> None:
        self.model = model
        self.run = 0

    def feed(self, text: str) -> str:
        kept: list[str] = []
        for char in text:
            if char in INVISIBLE_CHARS:
                self.run += 1
                if self.run > MAX_INVISIBLE_RUN:
                    raise LLMError(502, f"{self.model or 'The model'} produced degenerate output (invisible characters)")
                if self.run > 1:
                    continue
            else:
                self.run = 0
            kept.append(char)
        return "".join(kept)


# Rebuilds the user message from a subset of the chunks, for providers that
# must shrink the prompt (Groq's tokens-per-minute limit).
MessageBuilder = Callable[[Sequence[RetrievedChunk]], str]


class AnswerGenerator(Protocol):
    provider: Provider
    model: str | None

    async def generate(
        self,
        *,
        system: str,
        history: Sequence[ChatTurn],
        user_message: str,
        chunks: Sequence[RetrievedChunk],
        language: Literal["km", "en"],
        message_builder: MessageBuilder | None = None,
    ) -> GeneratedAnswer: ...

    def stream(
        self,
        *,
        system: str,
        history: Sequence[ChatTurn],
        user_message: str,
        chunks: Sequence[RetrievedChunk],
        language: Literal["km", "en"],
        message_builder: MessageBuilder | None = None,
    ) -> AsyncIterator[StreamItem]: ...


async def stream_answer(generator: AnswerGenerator, **kwargs) -> AsyncIterator[StreamItem]:
    """``generator.stream`` when it has one, else the whole answer as a single
    delta; either way cleaned by ``OutputGuard``."""
    guard = OutputGuard(generator.model)
    stream = getattr(generator, "stream", None)
    if stream is None:
        answer = await generator.generate(**kwargs)
        text = guard.feed(answer.text)
        if text:
            yield text
        yield replace(answer, text=text)
        return
    source = stream(**kwargs)
    parts: list[str] = []
    try:
        async for item in source:
            if isinstance(item, GeneratedAnswer):
                yield replace(item, text="".join(parts))
            elif isinstance(item, str):
                text = guard.feed(item)
                if text:
                    parts.append(text)
                    yield text
            else:  # StreamReset: the partial answer is discarded
                parts.clear()
                guard = OutputGuard(generator.model)
                yield item
    finally:
        await source.aclose()  # stop generation upstream when abandoned


def _normalized_history(history: Sequence[ChatTurn]) -> list[ChatTurn]:
    """Drop leading assistant turns: both APIs require a user turn first."""
    turns = list(history)
    while turns and turns[0].role != "user":
        turns.pop(0)
    return turns


class AnthropicGenerator:
    provider: Provider = "anthropic"

    def __init__(
        self,
        api_key: str,
        model: str,
        *,
        max_tokens: int,
        timeout: float,
        effort: str,
        use_fallbacks: bool,
    ) -> None:
        import anthropic

        self._anthropic = anthropic
        self._client = anthropic.AsyncAnthropic(api_key=api_key, timeout=timeout)
        self.model = model
        self.max_tokens = max_tokens
        self.effort = effort
        self.use_fallbacks = use_fallbacks

    def _request(self, system: str, history: Sequence[ChatTurn], user_message: str) -> dict:
        messages = [
            {"role": turn.role, "content": turn.content} for turn in _normalized_history(history)
        ]
        messages.append({"role": "user", "content": user_message})
        request: dict = {
            "model": self.model,
            "max_tokens": self.max_tokens,
            # The system prompt never changes, so cache it across requests.
            "system": [{"type": "text", "text": system, "cache_control": {"type": "ephemeral"}}],
            "messages": messages,
            "output_config": {"effort": self.effort},
        }
        if self.use_fallbacks:
            request["betas"] = ["server-side-fallback-2026-07-01"]
            request["fallbacks"] = "default"
        return request

    def _error(self, exc: Exception) -> LLMError:
        anthropic = self._anthropic
        if isinstance(exc, anthropic.AuthenticationError):
            return LLMError(502, "Anthropic rejected the API key (check ANTHROPIC_API_KEY)")
        if isinstance(exc, anthropic.PermissionDeniedError):
            return LLMError(502, f"Anthropic permission denied: {exc.message}")
        if isinstance(exc, anthropic.NotFoundError):
            return LLMError(502, f"Unknown Anthropic model '{self.model}': {exc.message}")
        if isinstance(exc, anthropic.BadRequestError):
            return LLMError(502, f"Anthropic rejected the request: {exc.message}")
        if isinstance(exc, anthropic.RateLimitError):
            return LLMError(429, "Anthropic rate limit reached; retry shortly")
        if isinstance(exc, anthropic.InternalServerError):
            return LLMError(503, f"Anthropic is temporarily unavailable ({exc.status_code})")
        if isinstance(exc, anthropic.APIStatusError):
            return LLMError(502, f"Anthropic API error ({exc.status_code}): {exc.message}")
        if isinstance(exc, anthropic.APITimeoutError):
            return LLMError(504, "Anthropic request timed out")
        if isinstance(exc, anthropic.APIConnectionError):
            return LLMError(503, "Could not reach the Anthropic API")
        return LLMError(502, f"Anthropic API error: {exc}")

    def _finish(self, response) -> None:
        if response.stop_reason == "refusal":
            category = getattr(response.stop_details, "category", None) if response.stop_details else None
            logger.warning("Anthropic declined the request (category=%s)", category)
            raise LLMError(422, "The model declined to answer this request.")
        if response.stop_reason == "max_tokens":
            logger.warning("Anthropic response truncated at max_tokens=%d", self.max_tokens)

    async def generate(self, *, system, history, user_message, chunks, language, message_builder=None) -> GeneratedAnswer:
        try:
            response = await self._client.beta.messages.create(**self._request(system, history, user_message))
        except self._anthropic.APIError as exc:
            raise self._error(exc) from exc
        self._finish(response)
        text = "".join(block.text for block in response.content if block.type == "text").strip()
        return GeneratedAnswer(text=text, stop_reason=response.stop_reason, model=response.model)

    async def stream(self, *, system, history, user_message, chunks, language, message_builder=None) -> AsyncIterator[StreamItem]:
        parts: list[str] = []
        try:
            async with self._client.beta.messages.stream(
                **self._request(system, history, user_message)
            ) as stream:
                async for text in stream.text_stream:
                    parts.append(text)
                    yield text
                response = await stream.get_final_message()
        except self._anthropic.APIError as exc:
            raise self._error(exc) from exc
        self._finish(response)
        yield GeneratedAnswer(text="".join(parts), stop_reason=response.stop_reason, model=response.model)


class GeminiGenerator:
    provider: Provider = "gemini"

    def __init__(
        self,
        api_key: str,
        model: str,
        *,
        max_tokens: int,
        timeout: float,
        temperature: float,
        thinking_level: str = "low",
    ) -> None:
        from google import genai
        from google.genai import errors, types

        self._types = types
        self._errors = errors
        self._client = genai.Client(
            api_key=api_key,
            http_options=types.HttpOptions(
                timeout=int(timeout * 1000),
                # The SDK would otherwise retry 503/429 for ~30 s; FallbackGenerator
                # moves on to the next model instead.
                retry_options=types.HttpRetryOptions(attempts=1),
            ),
        )
        self.model = model
        self.max_tokens = max_tokens
        self.temperature = temperature
        self.thinking_level = thinking_level

    def _request(self, system: str, history: Sequence[ChatTurn], user_message: str) -> dict:
        types = self._types
        contents = [
            types.Content(
                role="user" if turn.role == "user" else "model",
                parts=[types.Part.from_text(text=turn.content)],
            )
            for turn in _normalized_history(history)
        ]
        contents.append(types.Content(role="user", parts=[types.Part.from_text(text=user_message)]))
        config = types.GenerateContentConfig(
            system_instruction=system,
            max_output_tokens=self.max_tokens,
            temperature=self.temperature,
            automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True),
            # Spent before the first token, so it is the student's whole wait.
            thinking_config=types.ThinkingConfig(thinking_level=self.thinking_level.upper()),
        )
        return {"model": self.model, "contents": contents, "config": config}

    @staticmethod
    def _message(exc) -> str:
        """Streaming errors carry the raw JSON body; keep only its message."""
        message = str(exc.message or exc)
        try:
            return json.loads(message)["error"]["message"]
        except (ValueError, KeyError, TypeError):
            return message.strip()

    def _error(self, exc: Exception) -> LLMError:
        if isinstance(exc, self._errors.APIError):
            code = exc.code or 502
            if code in (401, 403):
                return LLMError(502, "Gemini rejected the API key (check GEMINI_API_KEY)")
            if code == 404:
                return LLMError(502, f"Unknown Gemini model '{self.model}'")
            if code == 429:
                return LLMError(429, "Gemini rate limit reached; retry shortly")
            if code >= 500:
                return LLMError(503, f"Gemini is temporarily unavailable ({code}): {self._message(exc)}")
            return LLMError(502, f"Gemini API error ({code}): {self._message(exc)}")
        if isinstance(exc, (TimeoutError, asyncio.TimeoutError)):
            return LLMError(504, "Gemini request timed out")
        return LLMError(503, "Could not reach the Gemini API")

    @staticmethod
    def _finish_reason(response) -> str | None:
        if not response.candidates:
            return None
        reason = response.candidates[0].finish_reason
        return getattr(reason, "value", None) or (str(reason) if reason else None)

    def _empty_answer(self, response, finish_reason: str | None) -> LLMError:
        block_reason = getattr(response.prompt_feedback, "block_reason", None) if response else None
        if block_reason or finish_reason in ("SAFETY", "PROHIBITED_CONTENT", "BLOCKLIST"):
            return LLMError(422, "The model declined to answer this request.")
        return LLMError(502, f"Gemini returned an empty response (finish_reason={finish_reason})")

    async def generate(self, *, system, history, user_message, chunks, language, message_builder=None) -> GeneratedAnswer:
        try:
            response = await self._client.aio.models.generate_content(
                **self._request(system, history, user_message)
            )
        except (self._errors.APIError, OSError, asyncio.TimeoutError) as exc:
            raise self._error(exc) from exc
        finish_reason = self._finish_reason(response)
        text = (response.text or "").strip()
        if not text:
            raise self._empty_answer(response, finish_reason)
        return GeneratedAnswer(text=text, stop_reason=finish_reason, model=self.model)

    async def stream(self, *, system, history, user_message, chunks, language, message_builder=None) -> AsyncIterator[StreamItem]:
        parts: list[str] = []
        finish_reason = None
        last = None
        try:
            async for chunk in await self._client.aio.models.generate_content_stream(
                **self._request(system, history, user_message)
            ):
                last = chunk
                finish_reason = self._finish_reason(chunk) or finish_reason
                if chunk.text:
                    parts.append(chunk.text)
                    yield chunk.text
        except (self._errors.APIError, OSError, asyncio.TimeoutError) as exc:
            raise self._error(exc) from exc
        text = "".join(parts)
        if not text.strip():
            raise self._empty_answer(last, finish_reason)
        yield GeneratedAnswer(text=text, stop_reason=finish_reason, model=self.model)


class GroqGenerator:
    """Open models (gpt-oss, Qwen, Llama) served by Groq's OpenAI-compatible API."""

    provider: Provider = "groq"
    label = "Groq"

    def __init__(
        self,
        api_key: str,
        model: str,
        *,
        max_tokens: int,
        timeout: float,
        temperature: float,
        tokens_per_minute: int = 0,
        max_retry_wait: float = 0.0,
        min_completion_tokens: int = 256,
        reasoning_effort: str = "",
    ) -> None:
        import groq

        self.reasoning_effort = reasoning_effort
        self._groq = groq
        # Retries are handled in _create, which knows when to give up and fall back.
        self._client = groq.AsyncGroq(api_key=api_key, timeout=timeout, max_retries=0)
        self.max_retry_wait = max_retry_wait
        self.min_completion_tokens = min(min_completion_tokens, max_tokens)
        self.model = model
        self.max_tokens = max_tokens
        self.temperature = temperature
        self.tokens_per_minute = tokens_per_minute

    @staticmethod
    def estimate_tokens(messages: Sequence[dict]) -> int:
        """Conservative prompt size: Khmer is about one token per character,
        other text about one per three (measured on gpt-oss)."""
        total = 0
        for message in messages:
            content = message["content"]
            khmer = sum(1 for char in content if "\u1780" <= char <= "\u19ff")
            total += 8 + khmer + (len(content) - khmer) // 3
        return total

    def _completion_budget(self, messages: Sequence[dict]) -> int | None:
        """Tokens left for the answer, or None when fewer than the minimum remain."""
        if not self.tokens_per_minute:
            return self.max_tokens
        available = self.tokens_per_minute - int(self.estimate_tokens(messages) * 1.1) - 100
        if available < self.min_completion_tokens:
            return None
        return min(self.max_tokens, available)

    @staticmethod
    def _messages(system: str, turns: Sequence[ChatTurn], user_message: str) -> list[dict]:
        messages = [{"role": "system", "content": system}]
        messages += [{"role": turn.role, "content": turn.content} for turn in turns]
        messages.append({"role": "user", "content": user_message})
        return messages

    def _request(
        self,
        system: str,
        history: Sequence[ChatTurn],
        user_message: str,
        chunks: Sequence[RetrievedChunk] = (),
        message_builder: MessageBuilder | None = None,
    ) -> dict:
        """The request, shrunk to fit the tokens-per-minute limit: the oldest chat
        turns go first, then the lowest-ranked passages."""
        all_turns = _normalized_history(history)
        turns = list(all_turns)
        kept = list(chunks)
        while True:
            messages = self._messages(system, turns, user_message)
            budget = self._completion_budget(messages)
            if budget is not None:
                break
            if turns:
                turns = _normalized_history(turns[1:])
            elif message_builder is not None and kept:
                kept.pop()
                user_message = message_builder(kept)
            else:
                raise LLMError(
                    413,
                    f"The question leaves too little room for an answer within Groq's "
                    f"{self.tokens_per_minute} tokens-per-minute limit",
                )
        if len(turns) < len(all_turns) or len(kept) < len(chunks):
            logger.info(
                "Shrunk the Groq prompt to fit %d tokens/min: kept %d of %d history turns, %d of %d passages",
                self.tokens_per_minute, len(turns), len(all_turns), len(kept), len(chunks),
            )
        request = {
            "model": self.model,
            "messages": messages,
            "max_completion_tokens": budget,
            "temperature": self.temperature,
        }
        if self.reasoning_effort:
            # Reasoning runs before the first visible token, so it is the wait.
            request["reasoning_effort"] = self.reasoning_effort
        return request

    def _error(self, exc: Exception) -> LLMError:
        groq = self._groq
        if isinstance(exc, groq.AuthenticationError):
            return LLMError(502, "Groq rejected the API key (check GROQ_API_KEY)")
        if isinstance(exc, groq.PermissionDeniedError):
            return LLMError(502, f"Groq permission denied: {exc.message}")
        if isinstance(exc, groq.NotFoundError):
            return LLMError(502, f"Unknown Groq model '{self.model}': {exc.message}")
        if isinstance(exc, groq.BadRequestError):
            return LLMError(502, f"Groq rejected the request: {exc.message}")
        if isinstance(exc, groq.RateLimitError):
            return LLMError(429, "Groq rate limit reached; retry shortly")
        if isinstance(exc, groq.APIStatusError) and exc.status_code == 413:
            return LLMError(429, f"Groq request exceeds the tokens-per-minute limit: {exc.message}")
        if isinstance(exc, groq.InternalServerError):
            return LLMError(503, f"Groq is temporarily unavailable ({exc.status_code})")
        if isinstance(exc, groq.APIStatusError):
            return LLMError(502, f"Groq API error ({exc.status_code}): {exc.message}")
        if isinstance(exc, groq.APITimeoutError):
            return LLMError(504, "Groq request timed out")
        if isinstance(exc, groq.APIConnectionError):
            return LLMError(503, "Could not reach the Groq API")
        return LLMError(502, f"Groq API error: {exc}")

    @staticmethod
    def _retry_after(exc) -> float | None:
        try:
            return float(exc.response.headers.get("retry-after"))
        except (AttributeError, TypeError, ValueError):
            return None

    async def _create(self, request: dict, **extra):
        """One request, retried once if Groq asks for a short enough wait."""
        for attempt in (1, 2):
            try:
                return await self._client.chat.completions.create(**request, **extra)
            except self._groq.RateLimitError as exc:
                wait = self._retry_after(exc)
                if attempt == 2 or wait is None or wait > self.max_retry_wait:
                    detail = f"Groq rate limit reached; retry in {wait:.0f} s" if wait else None
                    error = self._error(exc)
                    raise (LLMError(429, detail, retry_after=wait) if detail else error) from exc
                logger.info("Groq rate limited; retrying in %.1f s", wait)
                await asyncio.sleep(wait)
            except self._groq.APIError as exc:
                raise self._error(exc) from exc

    def _check(self, text: str, finish_reason: str | None) -> None:
        # ``label`` rather than "Groq": the OpenAI-compatible providers inherit
        # this, and a backstop's empty answer blamed on Groq sends whoever is
        # debugging it to the wrong provider.
        if finish_reason == "content_filter":
            raise LLMError(422, "The model declined to answer this request.")
        if not text:
            raise LLMError(502, f"{self.label} returned an empty response (finish_reason={finish_reason})")
        if finish_reason == "length":
            logger.warning("%s response hit its completion-token budget (%s)", self.label, self.model)

    async def generate(self, *, system, history, user_message, chunks, language, message_builder=None) -> GeneratedAnswer:
        response = await self._create(self._request(system, history, user_message, chunks, message_builder))
        choice = response.choices[0] if response.choices else None
        finish_reason = choice.finish_reason if choice else None
        text = ((choice.message.content if choice else None) or "").strip()
        self._check(text, finish_reason)
        return GeneratedAnswer(text=text, stop_reason=finish_reason, model=response.model or self.model)

    async def stream(self, *, system, history, user_message, chunks, language, message_builder=None) -> AsyncIterator[StreamItem]:
        parts: list[str] = []
        finish_reason = None
        model = self.model
        stream = await self._create(
            self._request(system, history, user_message, chunks, message_builder), stream=True
        )
        try:
            async for chunk in stream:
                model = chunk.model or model
                choice = chunk.choices[0] if chunk.choices else None
                if choice is None:
                    continue
                finish_reason = choice.finish_reason or finish_reason
                if choice.delta.content:
                    parts.append(choice.delta.content)
                    yield choice.delta.content
        except self._groq.APIError as exc:
            raise self._error(exc) from exc
        finally:
            await stream.close()
        text = "".join(parts)
        self._check(text.strip(), finish_reason)
        yield GeneratedAnswer(text=text, stop_reason=finish_reason, model=model)


class OpenAICompatibleGenerator:
    """A provider that speaks the OpenAI chat-completions API.

    The request and response shapes are the ones ``GroqGenerator`` already
    speaks, so the message building, budget shrinking and stream handling are
    inherited; a subclass supplies its name, its endpoint and its key.
    """

    provider: Provider
    label = "The API"  # how this provider is named in an error shown to a student
    key_env = "API_KEY"  # the setting that holds its key, named in that error
    model_env = "MODEL"

    _messages = staticmethod(GroqGenerator._messages)
    _completion_budget = GroqGenerator._completion_budget
    estimate_tokens = staticmethod(GroqGenerator.estimate_tokens)
    _check = GroqGenerator._check
    _retry_after = staticmethod(GroqGenerator._retry_after)

    def __init__(
        self,
        api_key: str,
        model: str,
        *,
        base_url: str,
        max_tokens: int,
        timeout: float,
        temperature: float,
        tokens_per_minute: int = 0,
        max_retry_wait: float = 0.0,
        min_completion_tokens: int = 256,
        default_headers: dict[str, str] | None = None,
        extra_body: dict | None = None,
    ) -> None:
        import openai

        self._openai = openai
        # Retries are handled in _create, which knows when to give up and fall back.
        self._client = openai.AsyncOpenAI(
            api_key=api_key, base_url=base_url, timeout=timeout, max_retries=0,
            default_headers=default_headers or None,
        )
        # Request fields outside the OpenAI schema that this provider understands.
        self.extra_body = extra_body or None
        self.base_url = base_url
        self.max_retry_wait = max_retry_wait
        self.min_completion_tokens = min(min_completion_tokens, max_tokens)
        self.model = model
        self.max_tokens = max_tokens
        self.temperature = temperature
        self.tokens_per_minute = tokens_per_minute

    def _request(self, *args, **kwargs) -> dict:
        request = GroqGenerator._request(self, *args, **kwargs)
        if self.extra_body:
            request["extra_body"] = self.extra_body
        return request

    def _error(self, exc: Exception) -> LLMError:
        openai = self._openai
        name = self.label
        if isinstance(exc, openai.AuthenticationError):
            return LLMError(502, f"{name} rejected the API key (check {self.key_env})")
        if isinstance(exc, openai.PermissionDeniedError):
            return LLMError(502, f"{name} permission denied: {exc.message}")
        if isinstance(exc, openai.NotFoundError):
            return LLMError(
                502,
                f"Unknown {name} model '{self.model}': {exc.message} "
                f"(set {self.model_env} to a model the API lists)",
            )
        # The account is out of credit. Nothing about this clears on its own, so
        # it is reported as a 402 and rested for the longest cooldown rather than
        # being retried a few seconds later.
        if isinstance(exc, openai.APIStatusError) and exc.status_code == 402:
            return LLMError(402, f"{name} needs billing set up before it will answer")
        if isinstance(exc, openai.BadRequestError):
            return LLMError(502, f"{name} rejected the request: {exc.message}")
        if isinstance(exc, openai.RateLimitError):
            return LLMError(429, f"{name} rate limit reached; retry shortly")
        if isinstance(exc, openai.InternalServerError):
            return LLMError(503, f"{name} is temporarily unavailable ({exc.status_code})")
        if isinstance(exc, openai.APIStatusError):
            return LLMError(502, f"{name} API error ({exc.status_code}): {exc.message}")
        if isinstance(exc, openai.APITimeoutError):
            return LLMError(504, f"{name} request timed out")
        if isinstance(exc, openai.APIConnectionError):
            return LLMError(503, f"Could not reach the {name} API at {self.base_url}")
        return LLMError(502, f"{name} API error: {exc}")

    async def _create(self, request: dict, **extra):
        """One request, retried once if the API asks for a short enough wait."""
        for attempt in (1, 2):
            try:
                return await self._client.chat.completions.create(**request, **extra)
            except self._openai.RateLimitError as exc:
                wait = self._retry_after(exc)
                if attempt == 2 or wait is None or wait > self.max_retry_wait:
                    detail = f"{self.label} rate limit reached; retry in {wait:.0f} s" if wait else None
                    error = self._error(exc)
                    raise (LLMError(429, detail, retry_after=wait) if detail else error) from exc
                logger.info("%s rate limited; retrying in %.1f s", self.label, wait)
                await asyncio.sleep(wait)
            except self._openai.APIError as exc:
                raise self._error(exc) from exc

    async def generate(self, *, system, history, user_message, chunks, language, message_builder=None) -> GeneratedAnswer:
        response = await self._create(self._request(system, history, user_message, chunks, message_builder))
        choice = response.choices[0] if response.choices else None
        finish_reason = choice.finish_reason if choice else None
        text = ((choice.message.content if choice else None) or "").strip()
        self._check(text, finish_reason)
        return GeneratedAnswer(text=text, stop_reason=finish_reason, model=response.model or self.model)

    async def stream(self, *, system, history, user_message, chunks, language, message_builder=None) -> AsyncIterator[StreamItem]:
        parts: list[str] = []
        finish_reason = None
        model = self.model
        stream = await self._create(
            self._request(system, history, user_message, chunks, message_builder), stream=True
        )
        try:
            async for chunk in stream:
                model = chunk.model or model
                choice = chunk.choices[0] if chunk.choices else None
                if choice is None:
                    continue
                finish_reason = choice.finish_reason or finish_reason
                if choice.delta.content:
                    parts.append(choice.delta.content)
                    yield choice.delta.content
        except self._openai.APIError as exc:
            raise self._error(exc) from exc
        finally:
            await stream.close()
        text = "".join(parts)
        self._check(text.strip(), finish_reason)
        yield GeneratedAnswer(text=text, stop_reason=finish_reason, model=model)


class SeaLionGenerator(OpenAICompatibleGenerator):
    """SEA-LION (AI Singapore), an open model family built for Southeast Asian
    languages -- Khmer among them, which the other providers handle far less
    well than they handle English."""

    provider: Provider = "sea-lion"
    label = "SEA-LION"
    key_env = "SEA_LION_API_KEY"
    model_env = "SEA_LION_MODEL"


class OpenRouterGenerator(OpenAICompatibleGenerator):
    """OpenRouter, which fronts many providers behind one key and one endpoint.

    That makes it the broadest backstop available: when Groq, Gemini and
    Cerebras have all run dry, this reaches a different set of hosts entirely.
    Its free models are the ones whose id ends in ``:free``.
    """

    provider: Provider = "openrouter"
    label = "OpenRouter"
    key_env = "OPENROUTER_API_KEY"
    model_env = "OPENROUTER_MODEL"

    @staticmethod
    def attribution(site_url: str, app_name: str) -> dict[str, str]:
        """The headers OpenRouter uses to attribute traffic to an application."""
        headers = {}
        if site_url:
            headers["HTTP-Referer"] = site_url
        if app_name:
            headers["X-Title"] = app_name
        return headers

    @staticmethod
    def no_reasoning() -> dict:
        """Ask for the answer, not the thinking.

        Most of the free models here can reason before answering, and a model
        that does spends the completion budget on thought the student never
        sees -- which is how SEA-LION's Qwen returns an empty answer. Turning it
        off keeps the whole budget for the explanation. Models whose reasoning
        is mandatory reject this, and the chain moves on to the next one.
        """
        return {"reasoning": {"enabled": False, "exclude": True}}


class CerebrasGenerator(OpenAICompatibleGenerator):
    """Cerebras, which serves the same open models on its own hardware.

    Useful as a backstop precisely because it is a separate quota: its
    ``gpt-oss-120b`` is the model Groq serves, so when Groq has run out of
    tokens for the minute the answer does not have to change character.
    """

    provider: Provider = "cerebras"
    label = "Cerebras"
    key_env = "CEREBRAS_API_KEY"
    model_env = "CEREBRAS_MODEL"


class ExtractiveGenerator:
    """No LLM: answer with the retrieved passages themselves."""

    provider: Provider = "none"
    model = None

    def __init__(self, unavailable_reason: str | None = None) -> None:
        self.unavailable_reason = unavailable_reason

    async def generate(self, *, system, history, user_message, chunks, language, message_builder=None) -> GeneratedAnswer:
        return GeneratedAnswer(
            text=build_extractive_answer(chunks, language, self.unavailable_reason),
            stop_reason="extractive" if self.unavailable_reason is None else "llm_unavailable",
        )

    async def stream(self, *, system, history, user_message, chunks, language, message_builder=None) -> AsyncIterator[StreamItem]:
        answer = await self.generate(
            system=system, history=history, user_message=user_message, chunks=chunks, language=language,
            message_builder=message_builder,
        )
        yield answer.text
        yield answer


# A model that just refused the request, or was asked for more than it allows,
# is answering about this one question -- it is not out of service, so it keeps
# its turn in the rotation.
NO_COOLDOWN_STATUSES = frozenset({413, 422})

# An unpaid account or a rejected key is not a busy minute: nothing about it
# clears while the server runs, so the model is rested for the longest cooldown
# instead of costing a round-trip every fifteen seconds.
LASTING_FAILURE_STATUSES = frozenset({402})


@dataclass
class ModelHealth:
    """How a candidate has been behaving lately.

    A model that rate limited or fell over is rested until ``cooldown_until``,
    so the next student's question is not spent rediscovering that it is down.
    """

    cooldown_until: float = 0.0
    failures: int = 0
    detail: str | None = None

    def resting_for(self, now: float) -> float:
        return max(0.0, self.cooldown_until - now)


class FallbackGenerator:
    """Spreads questions over the configured models and routes around the sick ones.

    Every candidate that is not resting is tried in turn until one answers. Any
    ``LLMError`` except a refusal (422) moves on to the next, and rests the model
    that failed -- for as long as it asked for (Groq sends ``retry-after``) or an
    exponential back-off -- so later questions skip it instead of paying its
    timeout again. With ``rotate`` on, each question also starts one place
    further down the list, so no single free-tier model absorbs all the traffic
    and burns its per-minute quota while the others sit idle.

    A stream only switches before its first text arrives; after that the client
    is told to start over. If every candidate fails, the retrieved passages are
    returned with a note that the tutor is unavailable.
    """

    def __init__(
        self,
        candidates: Sequence[AnswerGenerator],
        *,
        rotate: bool = False,
        cooldown_seconds: float = 15.0,
        max_cooldown_seconds: float = 300.0,
    ) -> None:
        if not candidates:
            raise ValueError("at least one generator is required")
        self.candidates = list(candidates)
        self.provider: Provider = self.candidates[0].provider
        self.model = self.candidates[0].model
        self.rotate = rotate
        self.cooldown_seconds = cooldown_seconds
        self.max_cooldown_seconds = max_cooldown_seconds
        self._health = [ModelHealth() for _ in self.candidates]
        self._cursor = 0

    @property
    def chain(self) -> list[str]:
        return [self._name(c) for c in self.candidates]

    @staticmethod
    def _name(candidate: AnswerGenerator) -> str:
        return f"{candidate.provider}:{candidate.model}" if candidate.model else candidate.provider

    @property
    def resting(self) -> dict[str, float]:
        """Models being skipped right now, and the seconds left on each."""
        now = time.monotonic()
        return {
            self._name(candidate): round(health.resting_for(now), 1)
            for candidate, health in zip(self.candidates, self._health)
            if health.resting_for(now) > 0
        }

    def _order(self) -> list[int]:
        """Candidate indices to try, healthiest first.

        Rested models still come last rather than being dropped: a stale
        cooldown must never be the reason a student gets no answer at all.
        """
        now = time.monotonic()
        ready = [i for i, health in enumerate(self._health) if health.resting_for(now) <= 0]
        waiting = sorted(
            (i for i in range(len(self.candidates)) if self._health[i].resting_for(now) > 0),
            key=lambda i: self._health[i].cooldown_until,
        )
        if ready and self.rotate:
            start = next((n for n, i in enumerate(ready) if i >= self._cursor), 0)
            ready = ready[start:] + ready[:start]
            self._cursor = (ready[0] + 1) % len(self.candidates)
        return ready + waiting

    def _cooldown(self, exc: LLMError, failures: int) -> float:
        if exc.status_code in LASTING_FAILURE_STATUSES:
            return self.max_cooldown_seconds
        if exc.retry_after is not None:
            return min(max(exc.retry_after, 1.0), self.max_cooldown_seconds)
        return min(self.cooldown_seconds * 2 ** (failures - 1), self.max_cooldown_seconds)

    def _recovered(self, index: int) -> None:
        health = self._health[index]
        if health.failures:
            logger.info("%s is answering again", self._name(self.candidates[index]))
        self._health[index] = ModelHealth()

    def _skip(self, index: int, exc: LLMError) -> None:
        if exc.status_code == 422:  # a refusal is an answer, not an outage
            raise exc
        candidate = self.candidates[index]
        if exc.status_code in NO_COOLDOWN_STATUSES:
            logger.warning(
                "%s rejected this request (%d: %s); trying the next model",
                self._name(candidate), exc.status_code, exc.detail,
            )
            return
        health = self._health[index]
        health.failures += 1
        health.detail = exc.detail
        rest = self._cooldown(exc, health.failures)
        health.cooldown_until = time.monotonic() + rest
        logger.warning(
            "%s failed with %d: %s; resting it for %.0f s and trying the next model",
            self._name(candidate), exc.status_code, exc.detail, rest,
        )

    @staticmethod
    def _last_resort(error: LLMError | None) -> ExtractiveGenerator:
        logger.error("Every configured model failed; answering with retrieved passages")
        return ExtractiveGenerator(unavailable_reason=error.detail if error else None)

    async def generate(self, **kwargs) -> GeneratedAnswer:
        error: LLMError | None = None
        for index in self._order():
            candidate = self.candidates[index]
            try:
                answer = await candidate.generate(**kwargs)
                text = OutputGuard(candidate.model).feed(answer.text)
            except LLMError as exc:
                error = exc
                self._skip(index, exc)
                continue
            self._recovered(index)
            return replace(answer, text=text, provider=candidate.provider)
        fallback = self._last_resort(error)
        return replace(await fallback.generate(**kwargs), provider="none")

    async def stream(self, **kwargs) -> AsyncIterator[StreamItem]:
        error: LLMError | None = None
        for index in self._order():
            candidate = self.candidates[index]
            started = False
            try:
                async for item in stream_answer(candidate, **kwargs):
                    if isinstance(item, GeneratedAnswer):
                        item = replace(item, provider=candidate.provider)
                    elif isinstance(item, str):
                        started = True
                    yield item
            except LLMError as exc:
                error = exc
                self._skip(index, exc)
                if started:
                    # The client already shows part of this answer; tell it to start over.
                    yield StreamReset(detail=exc.detail)
                continue
            self._recovered(index)
            return
        fallback = self._last_resort(error)
        async for item in fallback.stream(**kwargs):
            yield replace(item, provider="none") if isinstance(item, GeneratedAnswer) else item


def _provider_generators(settings: Settings, provider: str) -> list[AnswerGenerator]:
    if provider == "anthropic" and settings.anthropic_api_key is not None:
        return [
            AnthropicGenerator(
                settings.anthropic_api_key.get_secret_value(),
                settings.anthropic_model,
                max_tokens=settings.llm_max_tokens,
                timeout=settings.llm_timeout_seconds,
                effort=settings.anthropic_effort,
                use_fallbacks=settings.anthropic_fallbacks,
            )
        ]
    if provider == "gemini" and settings.gemini_api_key is not None:
        models = [settings.gemini_model]
        if settings.llm_fallback:
            models += settings.gemini_fallback_model_list
        return [
            GeminiGenerator(
                settings.gemini_api_key.get_secret_value(),
                model,
                max_tokens=settings.llm_max_tokens,
                timeout=settings.llm_timeout_seconds,
                temperature=settings.gemini_temperature,
                thinking_level=settings.gemini_thinking_level,
            )
            for model in models
        ]
    if provider == "groq" and settings.groq_api_key is not None:
        return [
            GroqGenerator(
                settings.groq_api_key.get_secret_value(),
                settings.groq_model,
                max_tokens=settings.llm_max_tokens,
                timeout=settings.llm_timeout_seconds,
                temperature=settings.groq_temperature,
                tokens_per_minute=settings.groq_tokens_per_minute,
                max_retry_wait=settings.groq_max_retry_wait,
                min_completion_tokens=settings.groq_min_completion_tokens,
                reasoning_effort=settings.groq_reasoning_effort,
            )
        ]
    if provider == "cerebras" and settings.cerebras_api_key is not None:
        models = [settings.cerebras_model]
        if settings.llm_fallback:
            models += settings.cerebras_fallback_model_list
        return [
            CerebrasGenerator(
                settings.cerebras_api_key.get_secret_value(),
                model,
                base_url=settings.cerebras_base_url,
                max_tokens=settings.llm_max_tokens,
                timeout=settings.llm_timeout_seconds,
                temperature=settings.cerebras_temperature,
                tokens_per_minute=settings.cerebras_tokens_per_minute,
                max_retry_wait=settings.cerebras_max_retry_wait,
                min_completion_tokens=settings.cerebras_min_completion_tokens,
            )
            for model in models
        ]
    if provider == "openrouter" and settings.openrouter_api_key is not None:
        models = [settings.openrouter_model]
        if settings.llm_fallback:
            models += settings.openrouter_fallback_model_list
        return [
            OpenRouterGenerator(
                settings.openrouter_api_key.get_secret_value(),
                model,
                base_url=settings.openrouter_base_url,
                max_tokens=settings.llm_max_tokens,
                timeout=settings.llm_timeout_seconds,
                temperature=settings.openrouter_temperature,
                default_headers=OpenRouterGenerator.attribution(
                    settings.openrouter_site_url, settings.openrouter_app_name
                ),
                extra_body=(
                    OpenRouterGenerator.no_reasoning()
                    if settings.openrouter_disable_reasoning
                    else None
                ),
            )
            for model in models
        ]
    if provider == "sea-lion" and settings.sea_lion_api_key is not None:
        if not settings.sea_lion_model:
            logger.error("SEA_LION_API_KEY is set but SEA_LION_MODEL is empty; skipping SEA-LION")
            return []
        return [
            SeaLionGenerator(
                settings.sea_lion_api_key.get_secret_value(),
                settings.sea_lion_model,
                base_url=settings.sea_lion_base_url,
                max_tokens=settings.llm_max_tokens,
                timeout=settings.llm_timeout_seconds,
                temperature=settings.sea_lion_temperature,
            )
        ]
    return []


def build_generator(settings: Settings) -> AnswerGenerator:
    provider = settings.resolved_llm_provider
    if provider == "none":
        return ExtractiveGenerator()
    candidates = _provider_generators(settings, provider)
    if not candidates:
        prefix = provider.upper().replace("-", "_")
        # SEA-LION has no default model, so a key alone is not enough to use it.
        needs = f"{prefix}_API_KEY and {prefix}_MODEL" if provider == "sea-lion" else f"{prefix}_API_KEY"
        raise RuntimeError(f"LLM_PROVIDER={provider} requires {needs}")
    if not settings.llm_fallback:
        return candidates[0]
    # The backstops come after Groq and Gemini: they are for when those two have
    # nothing left to give, not the models that answer first. Among themselves,
    # the general-purpose hosts go first and SEA-LION last -- it is the slowest,
    # but it is the one trained for Khmer, so it is the right final answer rather
    # than a degraded one.
    for other in ("anthropic", "gemini", "groq", "cerebras", "openrouter", "sea-lion"):
        if other != provider:
            candidates += _provider_generators(settings, other)
    if len(candidates) > 1:
        for candidate in candidates:
            # Another model can answer now, so sitting out a rate limit would only
            # add that wait to the student's question. The rotation rests the
            # model for the same period instead and asks someone else.
            if isinstance(candidate, (GroqGenerator, OpenAICompatibleGenerator)):
                candidate.max_retry_wait = 0.0
    return FallbackGenerator(
        candidates,
        rotate=settings.llm_selection == "rotate",
        cooldown_seconds=settings.llm_cooldown_seconds,
        max_cooldown_seconds=settings.llm_max_cooldown_seconds,
    )


# ---------------------------------------------------------------------------
# Application state
# ---------------------------------------------------------------------------

@dataclass
class RAGState:
    settings: Settings
    embedder: Embedder
    store: InMemoryVectorStore
    retriever: Retriever
    segmenter: KhmerSegmenter
    generator: AnswerGenerator
    ocr: CachedPageOCR | None
    write_lock: asyncio.Lock
    image_ocr: HybridImageOCR | None = None
    jobs: OrderedDict[str, IngestJob] = field(default_factory=OrderedDict)
    tasks: set[asyncio.Task] = field(default_factory=set)

    @property
    def active_jobs(self) -> int:
        return sum(job.status in ("queued", "running") for job in self.jobs.values())


_DEFAULT = object()


def build_state(
    settings: Settings,
    *,
    embedder: Embedder | None = None,
    generator: AnswerGenerator | None = None,
    ocr: CachedPageOCR | None = None,
    image_ocr: HybridImageOCR | None | object = _DEFAULT,
) -> RAGState:
    embedder = embedder or build_embedder(settings)
    try:
        store = InMemoryVectorStore.load(settings.vector_store_path, embedder.name)
    except EmbeddingMismatchError:
        logger.error("Embedding model changed since the index was built")
        raise
    retriever = Retriever(
        embedder,
        store,
        top_k=settings.top_k,
        score_threshold=settings.score_threshold,
        max_context_chars=settings.max_context_chars,
    )
    return RAGState(
        settings=settings,
        embedder=embedder,
        store=store,
        retriever=retriever,
        segmenter=KhmerSegmenter(settings.khmer_segmenter),
        generator=generator or build_generator(settings),
        ocr=ocr if ocr is not None else build_ocr(settings),
        write_lock=asyncio.Lock(),
        image_ocr=build_image_ocr(settings) if image_ocr is _DEFAULT else image_ocr,
    )


def get_state(request: Request) -> RAGState:
    return request.app.state.rag


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _clean_source_name(name: str | None, fallback: str) -> str:
    candidate = Path((name or "").replace("\\", "/")).name.strip() or fallback
    candidate = "".join(char for char in candidate if char.isprintable() and char not in '<>"|?*')
    if not candidate:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid source name")
    return candidate[:200]


async def _read_limited(upload: UploadFile, limit: int) -> bytes:
    buffer = bytearray()
    while chunk := await upload.read(1024 * 1024):
        buffer.extend(chunk)
        if len(buffer) > limit:
            raise HTTPException(
                413,
                f"File exceeds the {limit // (1024 * 1024)} MB upload limit",
            )
    return bytes(buffer)


async def _index(state: RAGState, document: ExtractedDocument, replace: bool) -> IngestResponse:
    settings = state.settings
    async with state.write_lock:
        try:
            result = await run_in_threadpool(
                index_document,
                document,
                store=state.store,
                embedder=state.embedder,
                segmenter=state.segmenter,
                chunk_size=settings.chunk_size,
                chunk_overlap=settings.chunk_overlap,
                replace=replace,
            )
        except DuplicateSourceError as exc:
            raise HTTPException(status.HTTP_409_CONFLICT, str(exc)) from exc
        except EmptyDocumentError as exc:
            raise HTTPException(422, str(exc)) from exc
        except (LatexIntegrityError, EmbeddingMismatchError) as exc:
            raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, str(exc)) from exc
    return IngestResponse(
        source=result.source,
        format=result.format,
        chunks_added=result.chunks_added,
        chunks_replaced=result.chunks_removed,
        formulas_protected=result.formulas,
        characters=result.characters,
        pages=result.pages,
        ocr_pages=result.ocr_pages,
        warnings=result.warnings,
        total_chunks=len(state.store),
    )


async def _extract_and_index(
    state: RAGState, data: bytes, filename: str, source: str, replace: bool
) -> IngestResponse:
    ocr = state.ocr
    if state.image_ocr is not None and detect_format(filename) == "image":
        # Photos get the same parallel Khmer + math reading as chat attachments.
        ocr = state.image_ocr
    try:
        # Scanned PDFs and images are OCR'd here, which can take minutes.
        document = await run_in_threadpool(extract_document, data, filename, ocr)
    except ExtractionError as exc:
        raise HTTPException(422, str(exc)) from exc
    document.source = source
    return await _index(state, document, replace)


async def _warm_up(state: RAGState) -> None:
    started = time.perf_counter()
    try:
        await run_in_threadpool(state.embedder.warmup)
        await run_in_threadpool(state.embedder.embed_query, "warmup")
    except Exception:  # noqa: BLE001 - the first query retries and reports it
        logger.exception("Preloading the embedding model failed")
        return
    logger.info("Embedding model ready in %.1fs", time.perf_counter() - started)


async def _warm_up_image_ocr(state: RAGState) -> None:
    started = time.perf_counter()
    try:
        await run_in_threadpool(state.image_ocr.warmup)
    except Exception:  # noqa: BLE001 - the first image question retries and reports it
        logger.exception("Preloading the Khmer OCR model failed")
        return
    logger.info("Image OCR ready in %.1fs (%s)", time.perf_counter() - started, ", ".join(state.image_ocr.engines))


def _source_chunks(context: Sequence[RetrievedChunk]) -> list[SourceChunk]:
    return [
        SourceChunk(
            id=chunk.id,
            source=chunk.source,
            chunk_index=chunk.chunk_index,
            page=chunk.page,
            score=chunk.score,
            text=chunk.text,
            title=chunk.title,
            heading=chunk.heading,
        )
        for chunk in context
    ]


MAX_IMAGE_SEARCH_CHARS = 1500


def _decode_images(state: RAGState, payload: QueryRequest) -> list[PageImage]:
    """Validate attachments before any work starts (errors are plain HTTP errors)."""
    if not payload.images:
        return []
    settings = state.settings
    if state.image_ocr is None:
        raise HTTPException(
            422, "Reading images needs an OCR engine: install kiri-ocr or set GROQ_API_KEY / GEMINI_API_KEY"
        )
    if len(payload.images) > settings.image_max_count:
        raise HTTPException(422, f"Attach at most {settings.image_max_count} images")
    images = []
    for number, attachment in enumerate(payload.images, start=1):
        try:
            images.append(
                decode_image(attachment.data, int(settings.image_max_mb * 1024 * 1024), settings.image_max_side)
            )
        except ImageInputError as exc:
            status_code = 413 if "limit" in str(exc) else 422
            raise HTTPException(status_code, f"Image {number}: {exc}") from exc
    return images


async def _read_images(state: RAGState, images: list[PageImage]) -> list[ImageReading]:
    if not images:
        return []
    return await run_in_threadpool(state.image_ocr.read, images)


def _reading_out(reading: ImageReading) -> ImageReadingOut:
    return ImageReadingOut(
        index=reading.index,
        text=reading.summary,
        vision_text=reading.vision_text,
        vision_engine=reading.vision_engine,
        khmer_text=reading.khmer_text,
        khmer_engine=reading.khmer_engine,
        warnings=reading.warnings,
    )


def _question_language(prompt: str, readings: Sequence[ImageReading]) -> Literal["km", "en"]:
    if prompt.strip():
        return detect_language(prompt)
    image_text = " ".join(r.khmer_text or r.vision_text or "" for r in readings)
    return detect_language(image_text) if image_text.strip() else "km"


async def _retrieve_context(
    state: RAGState, payload: QueryRequest, readings: Sequence[ImageReading] = ()
) -> tuple[Literal["km", "en"], list[RetrievedChunk]]:
    language = _question_language(payload.prompt, readings)
    # The photo usually *is* the question, so its text drives retrieval too.
    image_text = "\n".join(r.search_text for r in readings if r.has_text)[:MAX_IMAGE_SEARCH_CHARS]
    query = "\n".join(part for part in (payload.prompt, image_text) if part.strip())
    try:
        retrieved = await run_in_threadpool(
            state.retriever.retrieve,
            query,
            payload.top_k,
            payload.score_threshold,
            payload.sources,
        )
    except EmbeddingMismatchError as exc:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, str(exc)) from exc
    return language, state.retriever.fit_context(retrieved)


def _utcnow() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _start_job(state: RAGState, source: str, work: Awaitable[IngestResponse]) -> IngestJob:
    """Run ``work`` in the background and track it as an ``IngestJob``."""
    job = IngestJob(job_id=uuid.uuid4().hex, status="queued", source=source, created_at=_utcnow())
    state.jobs[job.job_id] = job
    # Forget the oldest finished jobs once the registry is full.
    while len(state.jobs) > state.settings.max_ingest_jobs:
        oldest = next(
            (key for key, old in state.jobs.items() if old.status in ("succeeded", "failed")), None
        )
        if oldest is None:
            break
        del state.jobs[oldest]

    async def runner() -> None:
        job.status = "running"
        try:
            job.result = await work
            job.status = "succeeded"
        except HTTPException as exc:
            job.status, job.error, job.error_status = "failed", str(exc.detail), exc.status_code
        except Exception as exc:  # noqa: BLE001 - reported through the job instead of lost
            logger.exception("Background ingestion of %s failed", source)
            job.status, job.error, job.error_status = "failed", f"Internal error: {exc}", 500
        finally:
            job.finished_at = _utcnow()

    task = asyncio.create_task(runner(), name=f"ingest:{source}")
    state.tasks.add(task)
    task.add_done_callback(state.tasks.discard)
    return job


# ---------------------------------------------------------------------------
# App factory
# ---------------------------------------------------------------------------

ERROR_RESPONSES = {
    code: {"model": ErrorResponse} for code in (400, 404, 409, 413, 415, 422, 429, 502, 503, 504)
}


def create_app(
    settings: Settings | None = None,
    *,
    embedder: Embedder | None = None,
    generator: AnswerGenerator | None = None,
    ocr: CachedPageOCR | None = None,
    image_ocr: HybridImageOCR | None | object = _DEFAULT,
) -> FastAPI:
    settings = settings or get_settings()
    logging.basicConfig(
        level=settings.log_level.upper(),
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        state = build_state(settings, embedder=embedder, generator=generator, ocr=ocr, image_ocr=image_ocr)
        app.state.rag = state
        logger.info(
            "Ready: %d chunks indexed, embeddings=%s, llm=%s",
            len(state.store), state.embedder.name, state.generator.provider,
        )
        if settings.preload_embedder:
            # Load the model in the background so the server answers /health at once
            # and the first question does not pay the loading time.
            task = asyncio.create_task(_warm_up(state), name="embedder-warmup")
            state.tasks.add(task)
            task.add_done_callback(state.tasks.discard)
        if settings.preload_kiri and state.image_ocr is not None:
            task = asyncio.create_task(_warm_up_image_ocr(state), name="image-ocr-warmup")
            state.tasks.add(task)
            task.add_done_callback(state.tasks.discard)
        yield
        for task in list(state.tasks):
            task.cancel()
        if state.tasks:
            await asyncio.gather(*state.tasks, return_exceptions=True)

    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description="Retrieval-augmented math tutor for the Khmer Grade 12 curriculum.",
        lifespan=lifespan,
    )
    origins = settings.cors_origin_list
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials="*" not in origins,
        allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )

    @app.exception_handler(LLMError)
    async def _llm_error(_: Request, exc: LLMError) -> JSONResponse:
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})

    @app.get("/health", response_model=HealthResponse, tags=["system"])
    async def health(request: Request) -> HealthResponse:
        state = get_state(request)
        return HealthResponse(
            status="ok",
            active_ingest_jobs=state.active_jobs,
            version=settings.app_version,
            embedding_backend=settings.embedding_backend,
            embedding_model=state.embedder.name,
            embedding_loaded=state.embedder.is_loaded,
            khmer_segmenter=settings.khmer_segmenter,
            ocr_enabled=state.ocr is not None,
            ocr_engine=state.ocr.engine if state.ocr is not None else None,
            ocr_model=state.ocr.model if state.ocr is not None else None,
            llm_provider=state.generator.provider,
            llm_model=state.generator.model,
            llm_chain=getattr(state.generator, "chain", []),
            llm_selection=(
                ("rotate" if state.generator.rotate else "priority")
                if isinstance(state.generator, FallbackGenerator)
                else None
            ),
            llm_resting=getattr(state.generator, "resting", {}),
            config_warnings=settings.config_warnings,
            image_ocr_engines=state.image_ocr.engines if state.image_ocr is not None else [],
            default_top_k=settings.top_k,
            default_score_threshold=settings.score_threshold,
            max_upload_mb=settings.max_upload_mb,
            documents=len(state.store.sources()),
            chunks=len(state.store),
        )

    @app.post("/api/query", response_model=QueryResponse, responses=ERROR_RESPONSES, tags=["rag"])
    async def query(payload: QueryRequest, request: Request) -> QueryResponse:
        state = get_state(request)
        started = time.perf_counter()
        readings = await _read_images(state, _decode_images(state, payload))
        language, context = await _retrieve_context(state, payload, readings)

        answer = GeneratedAnswer(text="", stop_reason=None, model=state.generator.model)
        if payload.generate:
            answer = await state.generator.generate(
                system=SYSTEM_PROMPT,
                history=payload.history,
                user_message=build_user_message(payload.prompt, context, language, readings),
                chunks=context,
                language=language,
                message_builder=lambda kept: build_user_message(payload.prompt, kept, language, readings),
            )

        answer_text = answer.text
        if answer.stop_reason not in QUOTED_STOP_REASONS:
            answer_text, repairs = sanitize_answer(
                answer_text,
                opens_in_math=payload.continues_math,
                may_continue=answer.stop_reason in TRUNCATED_STOP_REASONS,
            )
            if repairs:
                logger.info("Repaired the answer's formatting: %s", "; ".join(repairs))

        return QueryResponse(
            answer=answer_text,
            language=language,
            grounded=bool(context),
            sources=_source_chunks(context),
            provider=answer.provider or state.generator.provider,
            model=answer.model,
            stop_reason=answer.stop_reason,
            latency_ms=round((time.perf_counter() - started) * 1000, 1),
            images=[_reading_out(reading) for reading in readings],
        )

    @app.post(
        "/api/query/stream",
        responses={
            **ERROR_RESPONSES,
            200: {
                "content": {"application/x-ndjson": {}},
                "description": "One JSON event per line: status/images while photos are read, "
                "meta, delta... (reset when another model takes over), then done or error "
                "(see the QueryStream* schemas)",
            },
        },
        tags=["rag"],
    )
    async def query_stream(payload: QueryRequest, request: Request) -> StreamingResponse:
        """Like /api/query, but progress and the answer arrive as NDJSON events."""
        state = get_state(request)
        started = time.perf_counter()
        # Invalid attachments are still ordinary HTTP errors.
        images = _decode_images(state, payload)
        generator = state.generator

        def line(event) -> str:
            return event.model_dump_json() + "\n"

        async def events() -> AsyncIterator[str]:
            readings: list[ImageReading] = []
            if images:
                yield line(QueryStreamStatus(stage="reading_images"))
                try:
                    readings = await _read_images(state, images)
                except Exception:  # noqa: BLE001 - the response has started; report in-band
                    logger.exception("Reading attached images failed")
                    yield line(QueryStreamError(status=500, detail="Could not read the attached images"))
                    return
                yield line(QueryStreamImages(images=[_reading_out(r) for r in readings]))
            yield line(QueryStreamStatus(stage="searching"))
            try:
                language, context = await _retrieve_context(state, payload, readings)
            except HTTPException as exc:
                yield line(QueryStreamError(status=exc.status_code, detail=str(exc.detail)))
                return
            yield line(QueryStreamMeta(
                language=language,
                grounded=bool(context),
                sources=_source_chunks(context),
                provider=generator.provider,
            ))
            final = GeneratedAnswer(text="", model=generator.model)
            # The repairs need the whole answer: an unclosed $$ is only visible
            # once the last delta has arrived, and a formula can be split across
            # deltas. The deltas still stream; the done event carries the fixed
            # text for the client to swap in.
            streamed: list[str] = []
            # Time to first token is what the student actually experiences as
            # speed: everything before it is an empty bubble. Logged per answer
            # so a change of model, thinking level or prompt can be judged.
            first_token_ms: float | None = None
            if payload.generate:
                yield line(QueryStreamStatus(stage="generating"))
                try:
                    async for item in stream_answer(
                        generator,
                        system=SYSTEM_PROMPT,
                        history=payload.history,
                        user_message=build_user_message(payload.prompt, context, language, readings),
                        chunks=context,
                        language=language,
                        message_builder=lambda kept: build_user_message(payload.prompt, kept, language, readings),
                    ):
                        if isinstance(item, GeneratedAnswer):
                            final = item
                        elif isinstance(item, StreamReset):
                            streamed.clear()  # the answer restarts with another model
                            yield line(QueryStreamReset(detail=item.detail))
                        elif item:
                            if first_token_ms is None:
                                first_token_ms = round((time.perf_counter() - started) * 1000, 1)
                                logger.info(
                                    "First token after %.0f ms (%s %s)",
                                    first_token_ms, generator.provider, final.model or generator.model,
                                )
                            streamed.append(item)
                            yield line(QueryStreamDelta(text=item))
                except LLMError as exc:
                    yield line(QueryStreamError(status=exc.status_code, detail=exc.detail))
                    return
                except Exception:  # noqa: BLE001 - the response has started; report in-band
                    logger.exception("Streaming answer failed")
                    yield line(QueryStreamError(status=500, detail="Internal error while generating the answer"))
                    return
            repairs: list[str] = []
            repaired = ""
            if final.stop_reason not in QUOTED_STOP_REASONS:
                repaired, repairs = sanitize_answer(
                    "".join(streamed),
                    opens_in_math=payload.continues_math,
                    may_continue=final.stop_reason in TRUNCATED_STOP_REASONS,
                )
                if repairs:
                    logger.info("Repaired the answer's formatting: %s", "; ".join(repairs))
            total_ms = round((time.perf_counter() - started) * 1000, 1)
            logger.info(
                "Answer streamed in %.0f ms (first token %s)",
                total_ms, f"{first_token_ms:.0f} ms" if first_token_ms else "never",
            )
            yield line(QueryStreamDone(
                provider=final.provider or generator.provider,
                model=final.model,
                stop_reason=final.stop_reason,
                latency_ms=total_ms,
                first_token_ms=first_token_ms,
                answer=repaired if repairs else None,
            ))

        return StreamingResponse(
            events(),
            media_type="application/x-ndjson",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )

    @app.post(
        "/api/ingest",
        response_model=IngestResponse | IngestJob,
        responses={**ERROR_RESPONSES, 202: {"model": IngestJob, "description": "Background job started"}},
        tags=["ingest"],
    )
    async def ingest(
        request: Request,
        file: UploadFile | None = File(None, description="A .pdf, .md, .markdown, .txt, .png, .jpg, .jpeg or .webp file"),
        text: str | None = Form(None, description="Raw text/Markdown, as an alternative to a file"),
        source_name: str | None = Form(None, max_length=200),
        replace: bool = Form(True),
        background: bool = Form(
            False, description="Return 202 with a job id at once; poll /api/ingest/jobs/{job_id}"
        ),
    ) -> IngestResponse | JSONResponse:
        state = get_state(request)
        has_text = text is not None and text.strip() != ""
        if (file is None) == (not has_text):
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST, "Provide exactly one of 'file' or 'text'"
            )

        if file is not None:
            filename = _clean_source_name(file.filename, "upload")
            source = _clean_source_name(source_name, filename) if source_name else filename
            try:
                detect_format(filename)
            except UnsupportedFileTypeError as exc:
                raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, str(exc)) from exc
            data = await _read_limited(file, settings.max_upload_bytes)
            await file.close()
            if not data:
                raise HTTPException(status.HTTP_400_BAD_REQUEST, "Uploaded file is empty")
            work = _extract_and_index(state, data, filename, source, replace)
        else:
            if len(text.encode("utf-8")) > settings.max_upload_bytes:
                raise HTTPException(413, "Text exceeds the upload limit")
            source = _clean_source_name(source_name, f"pasted-{int(time.time())}.md")
            document = ExtractedDocument(source, "markdown", [Section(clean_markdown(text))])
            work = _index(state, document, replace)

        if not background:
            return await work
        job = _start_job(state, source, work)
        return JSONResponse(status_code=status.HTTP_202_ACCEPTED, content=job.model_dump(mode="json"))

    @app.get(
        "/api/ingest/jobs/{job_id}", response_model=IngestJob, responses=ERROR_RESPONSES, tags=["ingest"]
    )
    async def ingest_job(job_id: str, request: Request) -> IngestJob:
        job = get_state(request).jobs.get(job_id)
        if job is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, f"No ingestion job '{job_id}'")
        return job

    @app.get("/api/ingest/jobs", response_model=list[IngestJob], tags=["ingest"])
    async def ingest_jobs(request: Request) -> list[IngestJob]:
        return list(reversed(get_state(request).jobs.values()))

    @app.post(
        "/api/ingest/text", response_model=IngestResponse, responses=ERROR_RESPONSES, tags=["ingest"]
    )
    async def ingest_text(payload: IngestTextRequest, request: Request) -> IngestResponse:
        state = get_state(request)
        if len(payload.text.encode("utf-8")) > settings.max_upload_bytes:
            raise HTTPException(413, "Text exceeds the upload limit")
        body = clean_markdown(payload.text) if payload.format == "markdown" else payload.text
        document = ExtractedDocument(
            _clean_source_name(payload.source_name, "pasted.md"), payload.format, [Section(body)]
        )
        return await _index(state, document, payload.replace)

    @app.get("/api/documents", response_model=DocumentListResponse, tags=["documents"])
    async def list_documents(request: Request) -> DocumentListResponse:
        state = get_state(request)
        return DocumentListResponse(
            documents=[DocumentInfo(**vars(summary)) for summary in state.store.sources()],
            total_chunks=len(state.store),
        )

    @app.delete(
        "/api/documents/{source:path}",
        response_model=DeleteDocumentResponse,
        responses=ERROR_RESPONSES,
        tags=["documents"],
    )
    async def delete_document(source: str, request: Request) -> DeleteDocumentResponse:
        state = get_state(request)
        async with state.write_lock:
            removed = state.store.delete_source(source)
            if not removed:
                raise HTTPException(status.HTTP_404_NOT_FOUND, f"No document named '{source}'")
            await run_in_threadpool(state.store.save)
        return DeleteDocumentResponse(source=source, chunks_removed=removed, total_chunks=len(state.store))

    dist = settings.frontend_dist_dir
    if (dist / "index.html").is_file():
        # Serve the built React app; html=True maps / to index.html.
        app.mount("/", StaticFiles(directory=dist, html=True), name="frontend")
    else:

        @app.get("/", include_in_schema=False)
        async def index() -> JSONResponse:
            return JSONResponse(
                {
                    "name": settings.app_name,
                    "docs": "/docs",
                    "frontend": "Not built. Run `npm run dev` (http://localhost:5173) "
                    "or `npm run build` to serve it from here.",
                }
            )

    return app


app = create_app()
