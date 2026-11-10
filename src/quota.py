"""The daily limit on AI questions, enforced where the model quota is spent.

A student's plan (Free, VIP Bondus, Super Bondus) decides how many AI questions they get a day, and the Laravel API does the
counting (docs/API.md in the backend repo, "Plans and AI questions"). The website counts a question before asking it and sends
the same id here as `request_id`; this server reports that id to the same API before it answers, using the student's own
token. The API counts one id once, so the question is not counted twice, and refuses when the student is out of questions.

Photos and documents are counted the same way: a question reports how many photos came with it, and a document added to the
library is reported on its own (not as a question). The plan decides how many a day (Free none), and the API refuses with
`upload_limit_reached` when they do not fit.

This server checks the input before it counts anything: photos are decoded and measured first (type, size, how many), a
request that is refused is never charged, and what is counted is the photos that really were images. A question is reported to
the API once however many rounds its answer takes (CountedRequests), and when the API cannot say what is left, photos are not
let through (a plain question still is).

The website's own check only keeps honest students informed. Anyone can call this server directly, so this is where the
limit is real.
"""
from __future__ import annotations

import hashlib
import re
import time
import uuid
from collections import OrderedDict
from collections.abc import Callable
from dataclasses import dataclass
from typing import Protocol

import httpx

REQUEST_ID = re.compile(r"^[A-Za-z0-9_-]{8,64}$")


class QuotaUnavailable(Exception):
    """The API could not say whether the student may ask. The caller lets the question through (see api.py)."""


class QuotaBusy(Exception):
    """The API is refusing this student's requests because they sent too many (429). That is not "unsure": a student cannot
    make the API throttle them and so get a free pass, so the caller refuses the question and says how long to wait."""

    def __init__(self, retry_after: int = 30) -> None:
        super().__init__(f"quota API throttled the student for {retry_after}s")
        self.retry_after = retry_after


class QuotaDenied(Exception):
    """The API gave an explicit "no" about the token itself, not about the student's plan: a 401 (it no longer identifies
    anyone -- revoked, or never valid) or a 403 (the account it belonged to was just suspended; the Laravel API's own
    EnsureNotSuspended middleware deletes the token and answers 403 from this same endpoint). Unlike QuotaUnavailable,
    this is not "unsure" -- the caller must refuse, never fall back to the outage allowance meant for genuine
    infrastructure trouble (api.py)."""


# Which of the plan's two allowances a "no" is about.
REASON_QUESTIONS = "questions"
REASON_UPLOADS = "uploads"


@dataclass(frozen=True)
class QuotaVerdict:
    allowed: bool
    plan: str | None = None
    limit: int | None = None
    # Only on a "no": whether the questions or the photo/document uploads are used up, and (for uploads) how many the plan
    # allows a day, where 0 means the plan has none at all (Free).
    reason: str | None = None
    upload_limit: int | None = None


class Quota(Protocol):
    async def consume(self, token: str, request_id: str, *, uploads: int = 0, question: bool = True) -> QuotaVerdict:
        """Count one question (and the photos that come with it) for the student who owns `token`.

        `question=False` counts a document added on its own: it uses an upload, not a question. Raises QuotaUnavailable when
        unsure, and QuotaBusy when the API is throttling this student."""


def question_id(supplied: object) -> str:
    """The id to count this request under: the one the website made, or a fresh one.

    A caller that leaves the id out (or sends something the API would not accept) is still counted, once per request, so
    leaving it out is not a way round the limit.
    """
    if isinstance(supplied, str) and REQUEST_ID.fullmatch(supplied):
        return supplied
    return uuid.uuid4().hex


# What `CountedRequests.check` says about a request.
NEW = "new"  # not counted by this server yet: report it to the API
REPEAT = "repeat"  # the same question again (the next round of a long answer): already counted, do not report it again
TOO_MANY = "too_many"  # one id has been used for more rounds than any answer takes: it is being reused


class CountedRequests:
    """The requests this server has already counted, so one question is reported to the API once however many rounds it takes.

    A long answer is several requests carrying the same id (the website sends the same `request_id` for every round). Each
    used to be reported to the API again just to be told "already counted". Now the first round is reported and the rest are
    recognised here, so a question is one report from this server. The API still holds the real count; this only saves it the
    repeat calls.

    It is not a way round the limit: a repeat is only recognised for the same student (by token), the same id, the same kind of
    request and no more photos than were counted, and an id used for more rounds than an answer can take is refused. A new
    process, or an entry that has expired, simply reports the request again, and the API counts one id once.
    """

    def __init__(
        self, *, ttl: float = 3600.0, max_entries: int = 5000, max_rounds: int = 9, clock: Callable[[], float] = time.monotonic
    ) -> None:
        self._ttl = ttl
        self._max_entries = max_entries
        self._max_rounds = max_rounds
        self._clock = clock
        # key -> [uploads counted, rounds seen, expires at]; oldest first
        self._seen: OrderedDict[str, list[float]] = OrderedDict()

    @staticmethod
    def _key(token: str, request_id: str, question: bool) -> str:
        # The token is hashed so it is not kept in memory longer than the request.
        return f"{hashlib.sha256(token.encode()).hexdigest()[:24]}:{request_id}:{int(question)}"

    def check(self, token: str, request_id: str, uploads: int, question: bool) -> str:
        key = self._key(token, request_id, question)
        entry = self._seen.get(key)
        now = self._clock()
        if entry is None or entry[2] <= now or uploads > entry[0]:
            return NEW
        if entry[1] >= self._max_rounds:
            return TOO_MANY
        entry[1] += 1
        return REPEAT

    def remember(self, token: str, request_id: str, uploads: int, question: bool) -> None:
        """Record that the API allowed this request, so its next round is a repeat."""
        key = self._key(token, request_id, question)
        entry = self._seen.pop(key, None)
        now = self._clock()
        if entry is not None and entry[2] > now:
            entry[0] = max(entry[0], uploads)
            entry[2] = now + self._ttl
        else:
            entry = [uploads, 1, now + self._ttl]
        self._seen[key] = entry
        while len(self._seen) > self._max_entries:
            self._seen.popitem(last=False)


class LaravelQuota:
    def __init__(self, url: str, *, timeout: float = 5.0, client: httpx.AsyncClient | None = None) -> None:
        self.url = url
        self._client = client or httpx.AsyncClient(timeout=timeout)

    async def consume(self, token: str, request_id: str, *, uploads: int = 0, question: bool = True) -> QuotaVerdict:
        """Count one question (and the photos that come with it) for the student who owns `token`."""
        payload: dict[str, object] = {"requestId": request_id}
        # Sent only when they matter, so an API that does not know them yet sees the request it always did.
        if uploads:
            payload["uploads"] = uploads
        if not question:
            payload["question"] = False
        try:
            response = await self._client.post(
                self.url,
                json=payload,
                headers={"Authorization": f"Bearer {token}", "Accept": "application/json"},
            )
        except httpx.HTTPError as exc:
            raise QuotaUnavailable(f"quota API unreachable: {exc.__class__.__name__}") from exc
        try:
            body = response.json()
        except ValueError:
            body = {}
        if not isinstance(body, dict):
            body = {}
        if response.status_code == 200 and body.get("allowed") is True:
            return QuotaVerdict(True, body.get("plan"), body.get("limit"))
        # Only the API's own "no" stops a question -- but there are two different kinds of "no". A 404 (before the API
        # has this feature) or a 500 says nothing about the student's plan, so those fall through to QuotaUnavailable
        # below, which lets the question through within the outage allowance. A 401 or 403 is different: it is the API's
        # own judgment of this exact token (revoked, or an account it just suspended), not a shrug, so it must never get
        # that allowance -- see QuotaDenied.
        if response.status_code == 402 and body.get("code") == "ai_limit_reached":
            return QuotaVerdict(False, body.get("plan"), body.get("limit"), REASON_QUESTIONS)
        if response.status_code == 402 and body.get("code") == "upload_limit_reached":
            return QuotaVerdict(False, body.get("plan"), body.get("limit"), REASON_UPLOADS, body.get("uploadLimit"))
        if response.status_code == 429:
            try:
                wait = int(response.headers.get("retry-after", "30"))
            except (TypeError, ValueError):
                wait = 30
            raise QuotaBusy(min(max(wait, 1), 300))
        if response.status_code in (401, 403):
            raise QuotaDenied(f"quota API refused the token ({response.status_code})")
        raise QuotaUnavailable(f"quota API answered {response.status_code}")
