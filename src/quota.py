"""The daily limit on AI questions, enforced where the model quota is spent.

A student's plan (Free, VIP Bondus, Super Bondus) decides how many AI questions they get a day, and the Laravel API does the
counting (docs/API.md in the backend repo, "Plans and AI questions"). The website counts a question before asking it and sends
the same id here as `request_id`; this server reports that id to the same API before it answers, using the student's own
token. The API counts one id once, so the question is not counted twice, and refuses when the student is out of questions.

Photos and documents are counted the same way: a question reports how many photos came with it, and a document added to the
library is reported on its own (not as a question). The plan decides how many a day (Free none), and the API refuses with
`upload_limit_reached` when they do not fit.

The website's own check only keeps honest students informed. Anyone can call this server directly, so this is where the
limit is real.
"""
from __future__ import annotations

import re
import uuid
from dataclasses import dataclass
from typing import Protocol

import httpx

REQUEST_ID = re.compile(r"^[A-Za-z0-9_-]{8,64}$")


class QuotaUnavailable(Exception):
    """The API could not say whether the student may ask. The caller lets the question through (see api.py)."""


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
        unsure."""


def question_id(supplied: object) -> str:
    """The id to count this request under: the one the website made, or a fresh one.

    A caller that leaves the id out (or sends something the API would not accept) is still counted, once per request, so
    leaving it out is not a way round the limit.
    """
    if isinstance(supplied, str) and REQUEST_ID.fullmatch(supplied):
        return supplied
    return uuid.uuid4().hex


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
        # Only the API's own "no" stops a question. Any other answer (a 404 before the API has this feature, a 500, a
        # 401 from a token it forgot) says nothing about the student's plan.
        if response.status_code == 402 and body.get("code") == "ai_limit_reached":
            return QuotaVerdict(False, body.get("plan"), body.get("limit"), REASON_QUESTIONS)
        if response.status_code == 402 and body.get("code") == "upload_limit_reached":
            return QuotaVerdict(False, body.get("plan"), body.get("limit"), REASON_UPLOADS, body.get("uploadLimit"))
        raise QuotaUnavailable(f"quota API answered {response.status_code}")
