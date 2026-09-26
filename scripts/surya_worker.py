"""Surya 2 page reader, run as a long-lived child of ``SuryaPageOCR``.

surya-ocr pins transformers, huggingface-hub and openai to versions this
project cannot share, so it lives in its own environment (SURYA_PYTHON) and
this script is the only code that runs there. It imports nothing from the
project. One request per stdin line, one reply per stdout line:

    {"image": "/tmp/page.png"}   ->   {"blocks": [{"label": ..., "html": ..., "bbox": ...}, ...]}
                                 or   {"error": "..."}

Surya's own model server (llama.cpp or vLLM) starts on the first page and
stays up until stdin closes, so a corpus pays its start-up cost once.
Anything Surya prints goes to stderr, which keeps stdout for replies.
"""
from __future__ import annotations

import contextlib
import json
import sys


def main() -> int:
    reply = sys.stdout
    sys.stdout = sys.stderr  # Surya's logging and progress bars stay off the reply channel.

    from PIL import Image
    from surya.inference import SuryaInferenceManager
    from surya.recognition import RecognitionPredictor

    manager = SuryaInferenceManager()
    predictor = RecognitionPredictor(manager)
    try:
        for line in sys.stdin:
            if not line.strip():
                continue
            try:
                request = json.loads(line)
                with Image.open(request["image"]) as opened:
                    image = opened.convert("RGB")
                page = predictor([image], full_page=True)[0].model_dump()
                blocks = [
                    {
                        "label": block.get("label"),
                        "html": block.get("html") or "",
                        "bbox": block.get("bbox"),
                        "confidence": block.get("confidence"),
                    }
                    for block in page.get("blocks", [])
                    if not block.get("skipped")
                ]
                answer = {"blocks": blocks}
            except Exception as exc:  # one bad page must not end the worker
                answer = {"error": f"{type(exc).__name__}: {exc}"}
            reply.write(json.dumps(answer, ensure_ascii=False) + "\n")
            reply.flush()
    finally:
        with contextlib.suppress(Exception):
            manager.stop()
    return 0


if __name__ == "__main__":
    sys.exit(main())
