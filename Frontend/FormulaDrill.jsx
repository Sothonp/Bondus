/* The "Formula drill" screen: a short, no-paper, tap-the-answer run through one chapter's formula
   quiz, for review anywhere, anytime — including a chapter still locked on the student's path. It is
   pure review: right away feedback plus the formula, no score saved anywhere, no progress or XP
   touched, so there is nothing to lock and nothing to lose by trying.

   Pure presentation, like ChapterQuiz.jsx: the draw-and-requeue rules are in formulaDrill.js, the
   words in chapterStrings.js, and the caller (PracticeSubject in App.jsx) hands in the chapter's
   question list and every callback. */
import React, { useEffect, useRef, useState } from "react";
import { Zap, ChevronLeft, ChevronRight, RotateCcw, Lightbulb, CheckCircle2, XCircle } from "lucide-react";
import { startDrill, afterAnswer } from "./formulaDrill.js";
import { chapterText, fillChapter } from "./chapterStrings.js";

const words = (lang) => (key, vars) => fillChapter(chapterText(lang, key), vars);

/* The small entry point shown next to a chapter row, offering the drill for that chapter — enabled
   even when the chapter itself is locked. Hidden when the chapter has no formula-quiz questions at
   all (nothing to drill). Stops the tap from reaching the row underneath it (opening the chapter, or
   its locked sheet). Props
     count   how many formula questions the chapter has, for the "n formulas" line
     onStart start the drill for this chapter */
export function DrillButton({ count, lang = "en", onStart }) {
  if (!count) return null;
  const km = lang === "km" ? "eai-km" : "";
  const w = words(lang);
  return (
    <button type="button" onClick={(e) => { e.stopPropagation(); onStart(); }}
      className={`eai-focus flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-full flex-shrink-0 ${km}`}
      style={{ background: "var(--gold-soft)", color: "var(--gold)" }}>
      <Zap size={13} /> {w("drillButton")}
    </button>
  );
}

/* The drill itself. Props
   chapterName  the chapter's localized name, shown as the screen's title
   list         the subject's full localized exercise list (PracticeSubject already has it) — the
                chapter's stage-0 questions are drawn from it
   chapterKey   the stable English chapter key
   grade        (exercise, answer) -> true when the answer is right, in either language
   onExit       leave the drill, back to the chapter list */
export default function FormulaDrill({ chapterName, list, chapterKey, grade, lang = "en", onExit }) {
  const km = lang === "km" ? "eai-km" : "";
  const w = words(lang);
  const [seed, setSeed] = useState(() => Date.now());
  const [queue, setQueue] = useState(() => startDrill(list, chapterKey, seed));
  const [at, setAt] = useState(0);
  const [choice, setChoice] = useState(null);
  const [checked, setChecked] = useState(false); // this question has been answered; showing feedback
  const [repeats, setRepeats] = useState({});
  const [tally, setTally] = useState({ right: 0, seen: 0 });
  const heading = useRef(null);

  useEffect(() => { heading.current?.focus?.({ preventScroll: true }); }, [at, queue.length]);

  const restart = () => {
    const next = Date.now();
    setSeed(next); setQueue(startDrill(list, chapterKey, next)); setAt(0);
    setChoice(null); setChecked(false); setRepeats({}); setTally({ right: 0, seen: 0 });
  };

  if (queue.length === 0) return null; // nothing to drill for this chapter — DrillButton already hides itself
  const total = queue.length;
  const done = at >= total;

  if (done) {
    const pct = tally.seen ? Math.round((tally.right / tally.seen) * 100) : 0;
    return (
      <div className="eai-card text-center eai-rise" data-testid="drill-done">
        <span className="grid place-items-center rounded-full mx-auto" style={{ width: 56, height: 56, background: "var(--gold-soft)" }} aria-hidden="true">
          <Zap size={26} style={{ color: "var(--gold)" }} />
        </span>
        <p className={`text-xs eai-muted mt-3 ${km}`}>{chapterName}</p>
        <h2 className={`eai-display text-2xl font-extrabold mt-0.5 ${km}`}>{w("drillDoneTitle")}</h2>
        <p className="eai-display text-4xl font-extrabold mt-3" style={{ color: "var(--gold)" }}>{pct}%</p>
        <p className={`text-sm eai-muted mt-1 ${km}`}>{w("drillDoneScore", { correct: tally.right, total: tally.seen })}</p>
        <div className="flex flex-wrap justify-center gap-2 mt-5">
          <button type="button" onClick={restart} className={`eai-btn eai-focus text-white py-2.5 px-4 text-sm flex items-center gap-1.5 ${km}`} style={{ background: "var(--gold)" }}>
            <RotateCcw size={15} /> {w("drillAgain")}
          </button>
          <button type="button" onClick={onExit} className={`eai-btn eai-focus eai-soft py-2.5 px-4 text-sm ${km}`} style={{ color: "var(--ink)" }}>{w("resultBack")}</button>
        </div>
      </div>
    );
  }

  const ex = queue[at];
  const correct = checked ? grade(ex, choice) : null;
  const last = at + 1 === total;

  const pick = (opt) => {
    if (checked) return;
    setChoice(opt); setChecked(true);
    const right = grade(ex, opt);
    setTally((t) => ({ right: t.right + (right ? 1 : 0), seen: t.seen + 1 }));
    const { queue: nextQueue, repeats: nextRepeats } = afterAnswer(queue, at, right, repeats);
    setQueue(nextQueue); setRepeats(nextRepeats);
  };

  const next = () => { setAt(at + 1); setChoice(null); setChecked(false); };

  return (
    <div className="space-y-4 eai-rise">
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={onExit} className={`eai-focus flex items-center gap-1 text-sm eai-muted ${km}`}><ChevronLeft size={16} /> {w("resultBack")}</button>
        <p className={`text-xs font-semibold eai-muted min-w-0 truncate flex items-center gap-1 ${km}`}><Zap size={12} style={{ color: "var(--gold)" }} /> {w("drillButton")}</p>
      </div>

      <div className="eai-ex-card" data-testid="drill-question">
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <span className={`eai-ex-qlabel eai-display ${km}`} role="status">{chapterName}</span>
        </div>
        <div className="h-1.5 rounded-full eai-soft mb-4 overflow-hidden" aria-hidden="true">
          <div className="h-full rounded-full" style={{ width: `${(at / total) * 100}%`, background: "var(--gold)", transition: "width .3s ease" }} />
        </div>

        <h3 ref={heading} tabIndex={-1} className="eai-ex-question eai-display outline-none">{ex.prompt}</h3>

        <div className="eai-ex-options" role="group" aria-label={ex.prompt}>
          {ex.options.map((opt) => {
            const isChoice = choice === opt;
            const isRight = checked && opt === ex.answer;
            const isWrongPick = checked && isChoice && !isRight;
            const style = checked
              ? isRight
                ? { background: "var(--jade-soft)", border: "1.5px solid var(--jade)", color: "var(--jade)" }
                : isWrongPick
                  ? { background: "var(--ember-soft)", border: "1.5px solid var(--ember)", color: "var(--ember)" }
                  : { background: "var(--card)", border: "1.5px solid var(--line)", color: "var(--muted)", opacity: 0.7 }
              : { background: isChoice ? "var(--primary-soft)" : "var(--card)", border: `1.5px solid ${isChoice ? "var(--primary)" : "var(--line)"}`, color: isChoice ? "var(--primary)" : "var(--ink)" };
            return (
              <button key={opt} type="button" disabled={checked} aria-pressed={isChoice} onClick={() => pick(opt)} className="eai-ex-option eai-focus flex items-center justify-between gap-2" style={style}>
                <span>{opt}</span>
                {isRight && <CheckCircle2 size={16} className="flex-shrink-0" />}
                {isWrongPick && <XCircle size={16} className="flex-shrink-0" />}
              </button>
            );
          })}
        </div>

        {checked && (
          <div className="flex gap-2 mt-3 p-3 rounded-2xl eai-soft">
            <Lightbulb size={15} className="flex-shrink-0 mt-0.5" style={{ color: "var(--gold)" }} aria-hidden="true" />
            <div className="min-w-0">
              {!correct && <p className={`text-sm font-semibold ${km}`} style={{ color: "var(--jade)" }}>{w("resultCorrectAnswer")}: {ex.answer}</p>}
              {ex.formula && <p className="text-sm leading-relaxed font-mono mt-0.5" style={{ overflowWrap: "anywhere" }}>{ex.formula}</p>}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2 mt-5">
          <button type="button" disabled={!checked} onClick={next} data-testid="drill-next"
            className={`eai-btn eai-focus text-white flex-1 py-3 text-sm flex items-center justify-center gap-1.5 ${km}`}
            style={{ background: "var(--gold)", opacity: checked ? 1 : 0.5 }}>
            {w(last ? "quizFinish" : "quizNext")} <ChevronRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
