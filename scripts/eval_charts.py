"""Draw the model-evaluation charts as JPEG from storage/evals/results.json
(written by scripts/eval_report.py), into storage/evals/charts/:

  <run>-1-leaderboard.jpg   average score per model, latest run
  <run>-2-heatmap.jpg       score for each question, latest run ("blocked" = no answer)
  <run>-3-checks.jpg        share of questions passing each check, latest run
  <run>-4-speed.jpg         seconds per answer against score, latest run
  <run>-5-history.jpg       average score per model in every run so far

    uv run python scripts/eval_charts.py
"""
from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402

EVALS = Path(__file__).resolve().parents[1] / "storage" / "evals"
CASES = ["carnot", "solenoid", "kinetic", "parabola", "ph", "insulin", "nerve", "novel"]
CHECKS = ["answered", "khmer", "correct", "figure", "scope"]


def short(model: str) -> str:
    return model.split(":", 1)[1].split("/")[-1].replace(":free", " (OpenRouter free)")


def label(model: str) -> str:
    return f"{short(model)}  [{model.split(':')[0]}]"


def main() -> int:
    rows = json.loads((EVALS / "results.json").read_text(encoding="utf-8"))
    runs = sorted({r["run"] for r in rows})
    last = runs[-1]
    latest = [r for r in rows if r["run"] == last]
    out = EVALS / "charts"
    out.mkdir(parents=True, exist_ok=True)
    plt.rcParams.update({"font.size": 10, "axes.spines.top": False, "axes.spines.right": False})
    when = datetime.strptime(last, "%Y%m%dT%H%M%SZ").strftime("%d %b %Y %H:%M UTC")
    saved = []

    def save(fig, name):
        path = out / f"{last}-{name}.jpg"
        fig.savefig(path, dpi=150, bbox_inches="tight", pad_inches=0.25, pil_kwargs={"quality": 90})
        plt.close(fig)
        saved.append(path)

    models = list(dict.fromkeys(r["model"] for r in latest))
    mine = {m: [r for r in latest if r["model"] == m] for m in models}
    score = {m: float(np.mean([r["score"] for r in mine[m]])) for m in models}
    answered = {m: sum(r["answered"] for r in mine[m]) for m in models}
    blocked = {m: sum(1 for r in mine[m] if r["error"]) for m in models}
    secs = {m: float(np.mean([r["seconds"] for r in mine[m] if r["answered"]] or [0])) for m in models}
    order = sorted(models, key=lambda m: score[m])
    n = len(CASES)

    fig, ax = plt.subplots(figsize=(9, 5.4))
    ax.barh([label(m) for m in order], [score[m] for m in order],
            color=["#2f855a" if score[m] >= 80 else "#c27c0e" if score[m] >= 50 else "#c53030" for m in order])
    for i, m in enumerate(order):
        note = f"{score[m]:.1f}   answered {answered[m]}/{n}" + (f", blocked {blocked[m]}" if blocked[m] else "")
        ax.text(score[m] + 1, i, note, va="center", fontsize=8.5, color="#333")
    ax.set_xlim(0, 135)
    ax.set_xlabel(f"Average score out of 100 ({n} BAC II questions, same passages for every model)")
    ax.set_title(f"Bondus model evaluation: average score\nrun of {when}", loc="left", fontsize=12, fontweight="bold")
    ax.axvline(80, color="#999", lw=0.8, ls="--")
    save(fig, "1-leaderboard")

    grid = [m for m in order[::-1]]
    get = lambda m, c, k: next((r[k] for r in mine[m] if r["case"] == c), None)
    mat = np.array([[get(m, c, "score") or 0 for c in CASES] for m in grid])
    err = np.array([[bool(get(m, c, "error")) for c in CASES] for m in grid])
    fig, ax = plt.subplots(figsize=(10, 5.8))
    im = ax.imshow(mat, cmap="RdYlGn", vmin=0, vmax=100, aspect="auto")
    ax.set_xticks(range(n), CASES, rotation=25, ha="right")
    ax.set_yticks(range(len(grid)), [label(m) for m in grid])
    for i in range(mat.shape[0]):
        for j in range(mat.shape[1]):
            ax.text(j, i, "blocked" if err[i, j] else int(mat[i, j]), ha="center", va="center",
                    fontsize=7 if err[i, j] else 9, color="#222")
    ax.set_title(f"Score for each question, run of {when}\n(blocked = quota, rate or size limit, or a server timeout)",
                 loc="left", fontsize=11, fontweight="bold")
    fig.colorbar(im, ax=ax, fraction=0.025, pad=0.02)
    save(fig, "2-heatmap")

    live = [m for m in order[::-1] if answered[m] > 0]
    if live:
        fig, ax = plt.subplots(figsize=(10, 5))
        w, x = 0.15, np.arange(len(live))
        for k, (c, col) in enumerate(zip(CHECKS, ["#4a5568", "#3182ce", "#2f855a", "#805ad5", "#dd6b20"])):
            ax.bar(x + (k - 2) * w, [sum(r[c] for r in mine[m]) / n * 100 for m in live], w, label=c, color=col)
        ax.set_xticks(x, [short(m) for m in live], rotation=20, ha="right", fontsize=8.5)
        ax.set_ylim(0, 110)
        ax.set_ylabel(f"% of the {n} questions passing")
        ax.legend(ncol=5, fontsize=8.5, frameon=False, loc="upper center", bbox_to_anchor=(0.5, 1.13))
        ax.set_title("Checks passed (models that answered at least once)", loc="left", fontsize=11, fontweight="bold", pad=28)
        save(fig, "3-checks")

        fig, ax = plt.subplots(figsize=(8.5, 5))
        for m in live:
            ax.scatter(secs[m], score[m], s=70, color="#2b6cb0")
            ax.annotate(short(m), (secs[m], score[m]), textcoords="offset points", xytext=(6, 4), fontsize=8.5)
        ax.set_xlabel("Seconds per answer (answered questions)")
        ax.set_ylabel("Average score")
        ax.set_ylim(0, 105)
        ax.set_title("Speed vs quality: top left is best", loc="left", fontsize=11, fontweight="bold")
        save(fig, "4-speed")

    fig, ax = plt.subplots(figsize=(10, 5.4))
    times = {run: datetime.strptime(run, "%Y%m%dT%H%M%SZ") for run in runs}
    everyone = list(dict.fromkeys(r["model"] for r in rows))
    colors = plt.cm.tab20(np.linspace(0, 1, max(2, len(everyone))))
    ends = []
    for model, col in zip(everyone, colors):
        pts = [(times[run], np.mean([r["score"] for r in rows if r["run"] == run and r["model"] == model]))
               for run in runs if any(r["run"] == run and r["model"] == model for r in rows)]
        if not pts:
            continue
        xs, ys = zip(*pts)
        ax.plot(xs, ys, marker="o", lw=2, color=col)
        ends.append([ys[-1], xs[-1], short(model), col])
    ends.sort(key=lambda e: e[0])
    for i in range(1, len(ends)):
        if ends[i][0] - ends[i - 1][0] < 4:
            ends[i][0] = ends[i - 1][0] + 4
    for y, x, name, col in ends:
        ax.annotate(f"{name} {y:.0f}", (x, y), textcoords="offset points", xytext=(8, 0), va="center", fontsize=8, color=col)
    ax.set_ylim(0, 105)
    ax.set_ylabel("Average score")
    ax.set_title(f"Score over time: {len(runs)} run(s)", loc="left", fontsize=11, fontweight="bold")
    fig.autofmt_xdate()
    save(fig, "5-history")

    for path in saved:
        print(path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
