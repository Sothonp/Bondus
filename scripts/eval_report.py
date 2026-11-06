"""Turn the model-evaluation history (storage/evals/runs.jsonl, written by
scripts/eval_models.py) into storage/evals/results.json: one flat row per answer,
for the Bondus Model Scorecard dashboard.

    uv run python scripts/eval_report.py           # all runs
    uv run python scripts/eval_report.py --last 10 # the last ten runs only

Then ask Claude to update the dashboard with the new file (it uploads it as the
dashboard's data); every run so far stays in it, so the trends grow with each run.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

EVALS = Path(__file__).resolve().parents[1] / "storage" / "evals"
CHECKS = ("answered", "khmer", "correct", "figure", "scope")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--last", type=int, help="keep only the last N runs")
    args = parser.parse_args(argv)
    source = EVALS / "runs.jsonl"
    if not source.exists():
        print(f"No runs yet: {source} (run scripts/eval_models.py first)")
        return 1
    rows = [json.loads(line) for line in source.read_text(encoding="utf-8").splitlines() if line.strip()]
    runs = sorted({r["run"] for r in rows})
    if args.last:
        keep = set(runs[-args.last:])
        rows = [r for r in rows if r["run"] in keep]
    # OpenRouter is left out of the reports: its free models never answered in our runs.
    rows = [r for r in rows if not r["model"].startswith("openrouter:")]
    flat = []
    for r in rows:
        provider, _, model = r["model"].partition(":")
        flat.append({
            "run": r["run"],
            "day": f"{r['run'][0:4]}-{r['run'][4:6]}-{r['run'][6:8]}",
            "model": r["model"],
            "provider": provider,
            "model_name": model,
            "case": r["case"],
            "subject": r.get("subject") or "none picked",
            "score": r.get("score", 0),
            "seconds": r.get("seconds", 0),
            **{check: int(bool((r.get("checks") or {}).get(check))) for check in CHECKS},
            "khmer_share": r.get("khmer_share", 0),
            "foreign_script": r.get("foreign", ""),
            "figures": " ".join(r.get("figures") or []),
            "chars": r.get("chars", 0),
            "error": (r.get("error") or "")[:120],
        })
    out = EVALS / "results.json"
    out.write_text(json.dumps(flat, ensure_ascii=False, indent=0), encoding="utf-8")
    print(f"{len(flat)} answers from {len({r['run'] for r in flat})} run(s) -> {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
