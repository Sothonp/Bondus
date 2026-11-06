"""Evaluate every model in the answer chain on a fixed set of BAC II questions.

Each model gets exactly what the app sends -- the system prompt, the subject guide and
the passages retrieved for the question (the same passages for every model) -- through
the app's own generator classes, so Groq and Cerebras get their compact prompt as in
production. Every answer is scored with checks that need no other model, so a run is
cheap, repeatable and comparable with the last:

  answered    the model returned an answer (not an error, a quota refusal or a timeout)
  khmer       most letters are Khmer and no Thai, Chinese, Japanese or Cyrillic slipped in
  correct     the key result is in the answer (a number within tolerance, or names)
  figure      the answer ends with the figure the app expects for this question
  scope       nothing the question must not contain (beyond-textbook biology, a wrong topic)

The scores and timings go to storage/evals/runs.jsonl, one line per answer, and
storage/evals/answers/<run>.md keeps the answers themselves to read.
scripts/eval_report.py turns the history into a dashboard.

    uv run python scripts/eval_models.py                 # every model, every question
    uv run python scripts/eval_models.py --models gemini:gemini-3.1-flash-lite nvidia:meta/muse-glimmer-30b
    uv run python scripts/eval_models.py --questions carnot solenoid
"""
from __future__ import annotations

import argparse
import asyncio
import json
import logging
import re
import sys
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from prompts import SYSTEM_PROMPT, build_user_message, subject_guide  # noqa: E402
from src.api import _provider_generators, create_app  # noqa: E402
from src.config import get_settings  # noqa: E402

logger = logging.getLogger("eval_models")
OUT_DIR = Path(__file__).resolve().parents[1] / "storage" / "evals"
# OpenRouter is left out: its free models never answered in our runs (rate limits, timeouts).
PROVIDERS = ("gemini", "groq", "cerebras", "nvidia", "sea-lion", "anthropic")
TIMEOUT_SECONDS = 360


@dataclass(frozen=True)
class Case:
    key: str
    subject: str | None          # None: asked with no subject picked, as a student may
    question: str
    expect: tuple[str, ...] = ()  # regexes; each must match for "correct"
    figure: tuple[str, ...] = ()  # fence kinds; one of them must be present
    forbid: tuple[str, ...] = ()  # substrings that must not appear


NUM = r"[0-9០-៩]"
CASES = (
    Case("carnot", "physics",
         "ម៉ាស៊ីនកាណូដំណើរការរវាងប្រភពក្តៅ 600 K និងប្រភពត្រជាក់ 300 K។ ឧស្ម័នបរិសុទ្ធ 1 mol រីកមាឌអ៊ីសូទែមពី 1 L ទៅ 2 L។ គណនាទិន្នផល និងកម្មន្ត",
         expect=(r"50\s*(?:%|\\%)|0[.,]5\b", r"17[23]\d"), figure=("thermo",)),
    Case("solenoid", "physics",
         "សូលេណូអ៊ីតមួយមានប្រវែង 40 cm មានស្ពៀ 1000 កាំ 2 cm ឆ្លងកាត់ដោយចរន្ត 2 A។ គណនាដែនម៉ាញេទិចនៅខាងក្នុង",
         expect=(r"6[.,]2[78]|2\s*\\?pi\s*\\times\s*10\^\{?-3|2\\pi\s*\\times\s*10",), figure=("magnet",)),
    Case("kinetic", "physics",
         "គណនាថាមពលស៊ីនេទិចមធ្យមនៃម៉ូលេគុលឧស្ម័នមួយនៅសីតុណ្ហភាព 27°C",
         expect=(r"6[.,]21",), figure=("gas",)),
    Case("parabola", "mathematics",
         "គេឱ្យអនុគមន៍ f(x) = x² − 4x + 3។ រកកំពូល និងចំណុចប្រសព្វជាមួយអ័ក្ស ហើយសង់ក្រាប",
         expect=(r"\(\s*2\s*[,;]\s*-\s*1\s*\)", r"x\s*=\s*3|\(\s*3\s*[,;]\s*0\s*\)"), figure=("geogebra",)),
    Case("ph", "chemistry",
         "គណនា pH នៃសូលុយស្យុង HCl កំហាប់ 0.01 mol/L",
         expect=(r"pH\s*=\s*2\b|pH\s*\}?\s*=\s*2\b|=\s*2\s*(?:$|[^0-9.,])",)),
    Case("insulin", "biology",
         "ពន្យល់ពីតួនាទីរបស់អាំងស៊ុយលីន និងការគ្រប់គ្រងជាតិស្ករក្នុងឈាម",
         expect=(r"លំពែង|pancreas",), figure=("anatomy", "molecule"),
         forbid=("GLUT", "gluconeogenesis", "Gluconeogenesis", "ក្រពេញអីប៉ុតាឡាមុស (pancreas)", "រីករាយ")),
    Case("nerve", None,
         "ពន្យល់ពីការបញ្ជូនសរសៃប្រសាទ",
         expect=(r"ណឺរ៉ូន|សរសៃប្រសាទ|neuron",), figure=("phet", "anatomy"),
         forbid=("Inscription", "សិលាចារឹក", "ប្រាសាទ", "Ranvier", "មីអេលីន", "myelin")),
    Case("novel", "khmer_literature",
         "សង្ខេបរឿងផ្កាស្រពោន",
         expect=(r"ប៊ុន\s?ធឿន|វិធាវី",), forbid=("```",)),
)

FOREIGN = re.compile(r"[฀-໿぀-ヿ㐀-鿿가-힯Ѐ-ӿ]")
FENCE = re.compile(r"```([\w-]+)\n(.*?)```", re.S)


def khmer_share(text: str) -> float:
    letters = [c for c in text if c.isalpha()]
    return sum("ក" <= c <= "៿" for c in letters) / max(1, len(letters))


def score(case: Case, answer: str, ok: bool) -> dict:
    fences = [kind for kind, _ in FENCE.findall(answer)]
    foreign = sorted(set(FOREIGN.findall(answer)))
    checks = {
        "answered": ok and len(answer.strip()) > 40,
        "khmer": ok and khmer_share(answer) >= 0.5 and not foreign,
        "correct": ok and all(re.search(p, answer, re.I | re.M) for p in case.expect),
        "figure": ok and (not case.figure or any(kind in fences for kind in case.figure)),
        "scope": ok and not any(term in answer for term in case.forbid),
    }
    weights = {"answered": 20, "khmer": 20, "correct": 30, "figure": 20, "scope": 10}
    return {
        "checks": checks,
        "score": sum(weights[name] for name, passed in checks.items() if passed),
        "khmer_share": round(khmer_share(answer), 3),
        "foreign": "".join(foreign)[:20],
        "figures": fences,
        "chars": len(answer),
    }


@dataclass
class Result:
    model: str
    case: str
    subject: str | None
    ok: bool
    seconds: float
    error: str = ""
    answer: str = ""
    scored: dict = field(default_factory=dict)


async def run_model(name: str, keyed: list, contexts: dict, cases: list[Case]) -> list[Result]:
    """``keyed``: the model's generators, one per API key; as in the app, a key that is out
    of quota (429) hands the question to the next key."""
    results = []
    for case in cases:
        chunks, user = contexts[case.key]
        start = time.perf_counter()
        text, ok, error = "", False, ""
        for generator in keyed:
            try:
                answer = await asyncio.wait_for(generator.generate(
                    system=SYSTEM_PROMPT, history=[], user_message=user, chunks=chunks, language="km",
                    message_builder=lambda kept, c=case: build_user_message(c.question, kept, "km", (), subject_guide(c.subject)),
                ), TIMEOUT_SECONDS)
                text, ok, error = answer.text or "", True, ""
                break
            except asyncio.TimeoutError:
                error = f"timeout after {TIMEOUT_SECONDS} s"
                break
            except Exception as exc:  # noqa: BLE001 -- a failing model is a result, not a crash
                error = f"{type(exc).__name__}: {str(exc)[:160]}"
                if getattr(exc, "status_code", None) != 429:
                    break
        seconds = round(time.perf_counter() - start, 1)
        result = Result(name, case.key, case.subject, ok, seconds, error, text, score(case, text, ok))
        logger.info("%-45s %-9s %3d/100 %6.1fs %s", name, case.key, result.scored["score"], seconds, error[:60])
        results.append(result)
    return results


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--models", nargs="+", help="provider:model names to run (default: every model in the chain)")
    parser.add_argument("--questions", nargs="+", help="question keys to run (default: all)")
    parser.add_argument("--extra-nvidia", nargs="*", default=["meta/muse-glimmer-30b"], help="NVIDIA models to add to the chain for this run")
    args = parser.parse_args(argv)
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
    for noisy in ("httpx", "httpcore", "google_genai", "reanmath", "src"):
        logging.getLogger(noisy).setLevel(logging.WARNING)

    settings = get_settings()
    if args.extra_nvidia:
        extra = [m for m in args.extra_nvidia if m not in settings.nvidia_fallback_models]
        settings = settings.model_copy(update={"nvidia_fallback_models": ",".join([settings.nvidia_fallback_models, *extra])})
    cases = [c for c in CASES if not args.questions or c.key in args.questions]

    # One generator per model (its first key), in chain order.
    generators: dict[str, list] = {}
    for provider in PROVIDERS:
        for generator in _provider_generators(settings, provider):
            generators.setdefault(f"{generator.provider}:{generator.model}", []).append(generator)
    if args.models:
        generators = {name: g for name, g in generators.items() if name in args.models}
    if not generators:
        logger.error("No models to run")
        return 2

    # The same passages for every model.
    app = create_app()
    from fastapi.testclient import TestClient
    with TestClient(app):
        retriever = app.state.rag.retriever
        contexts = {}
        for case in cases:
            chunks = retriever.fit_context(retriever.retrieve(case.question, subject=case.subject))
            contexts[case.key] = (chunks, build_user_message(case.question, chunks, "km", (), subject_guide(case.subject)))

    run_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    logger.info("Run %s: %d models x %d questions", run_id, len(generators), len(cases))

    async def everything():
        batches = await asyncio.gather(*(run_model(n, g, contexts, cases) for n, g in generators.items()))
        return [r for batch in batches for r in batch]

    results = asyncio.run(everything())

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUT_DIR / "answers").mkdir(exist_ok=True)
    with (OUT_DIR / "runs.jsonl").open("a", encoding="utf-8") as out:
        for r in results:
            out.write(json.dumps({
                "run": run_id, "model": r.model, "case": r.case, "subject": r.subject, "ok": r.ok,
                "seconds": r.seconds, "error": r.error, **r.scored,
            }, ensure_ascii=False) + "\n")
    with (OUT_DIR / "answers" / f"{run_id}.md").open("w", encoding="utf-8") as out:
        for r in sorted(results, key=lambda r: (r.case, r.model)):
            out.write(f"## {r.case} | {r.model} | {r.scored['score']}/100 | {r.seconds} s {r.error}\n\n{r.answer}\n\n---\n\n")

    print(f"\nRun {run_id}")
    print(f"{'model':45} {'score':>6} {'answered':>9} {'avg s':>7}")
    for name in generators:
        mine = [r for r in results if r.model == name]
        print(f"{name:45} {sum(r.scored['score'] for r in mine) / len(mine):6.1f} "
              f"{sum(r.ok for r in mine):4d}/{len(mine):<4d} {sum(r.seconds for r in mine) / len(mine):7.1f}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
