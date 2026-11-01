/* The Master Quiz of a chapter: the card on the chapter's page that offers it, the quiz itself, and its result.

   Pure presentation, like ChapterList.jsx: the rules are in chapterProgress.js, the words in chapterStrings.js, and App.jsx
   passes in the questions and every callback (nothing is imported back from it).

   The quiz is exam-like on purpose: no right-or-wrong feedback until the end, then the questions that were missed are
   reviewed with their explanations. Each answered question is also handed to `onAnswer`, so it counts as practice like any
   other answer (mastery, XP, the study record). The whole quiz is then sent to `onSubmit`, which resolves to
   { ok: true, result } or { ok: false, code, retryAfter }. The server grades it; the result is what it says. A failed save
   can be tried again and is counted once, because the same attemptId is sent each time. */
import React, { useEffect, useRef, useState } from "react";
import { ClipboardCheck, CheckCircle2, Award, RotateCcw, ChevronRight, ChevronLeft, Lightbulb } from "lucide-react";
import { PASS_PERCENT, MASTER_PERCENT } from "./progressionConfig.js";
import { quizLength, quizNeeded } from "./chapterProgress.js";
import { chapterText, fillChapter } from "./chapterStrings.js";

const words = (lang) => (key, vars) => fillChapter(chapterText(lang, key), vars);

/* The card on a chapter's page. Props
   row         this chapter's row from chapterStates()
   available   false when the quiz cannot be offered right now (the server's answer is not known): the card is not drawn
   canTestOut  the student has not solved enough, but their scores on this chapter's topics are strong enough to try
   onStart     start the quiz */
export function QuizCard({ row, available = true, canTestOut = false, lang = "en", localize = (n) => String(n), onStart }) {
  if (!available || !row || row.state === "locked") return null;
  const km = lang === "km" ? "eai-km" : "";
  const w = words(lang);
  const num = (n) => localize(n, lang);
  const done = row.state === "passed" || row.state === "mastered";
  const ready = row.state === "quizReady";
  const testOut = !ready && !done && canTestOut;

  let Icon = ClipboardCheck, color = "var(--muted)", soft = "var(--bg-soft)", title = w("quizTitle"), body, action = null;
  if (ready) {
    color = "var(--primary)"; soft = "var(--primary-soft)";
    body = w("quizReadyBody", { size: num(quizLength(row.total)), need: num(quizNeeded(row.total)) });
    action = { label: w("quizStart"), primary: true };
  } else if (done) {
    Icon = row.state === "mastered" ? Award : CheckCircle2; color = "var(--jade)"; soft = "var(--jade-soft)";
    body = row.state === "mastered"
      ? (row.best != null ? w("quizMasteredBody", { best: num(row.best) }) : w("quizMasteredNoScoreBody"))
      : (row.best != null ? w("quizPassedBody", { best: num(row.best), master: num(MASTER_PERCENT) }) : w("quizPassedNoScoreBody"));
    if (row.state !== "mastered" || row.best != null) action = { label: w("quizRetake"), primary: false };
  } else if (testOut) {
    color = "var(--primary)"; soft = "var(--primary-soft)"; title = w("quizTestOutTitle");
    body = w("quizTestOutBody");
    action = { label: w("quizTestOut"), primary: false };
  } else {
    body = w("quizLockedBody", { n: num(row.toQuiz) });
  }

  return (
    <div className="eai-card flex flex-wrap items-center gap-3" data-testid="quiz-card" data-state={ready ? "ready" : done ? "done" : testOut ? "testout" : "locked"}>
      <span className="grid place-items-center rounded-full flex-shrink-0" style={{ width: 40, height: 40, background: soft }} aria-hidden="true"><Icon size={20} style={{ color }} /></span>
      <div className="min-w-0 flex-1" style={{ minWidth: 200 }}>
        <h3 className={`eai-display font-bold ${km}`}>{title}</h3>
        <p className={`text-sm eai-muted mt-0.5 ${km}`}>{body}</p>
        {!ready && !done && !testOut && (
          <>
            <div className="relative h-1.5 rounded-full eai-soft mt-2.5 overflow-hidden" aria-hidden="true">
              <div className="h-full rounded-full" style={{ width: `${row.percent}%`, background: "var(--gold)" }} />
              <span className="absolute top-0 bottom-0" style={{ left: `${PASS_PERCENT}%`, width: 2, background: "var(--ink)", opacity: 0.35 }} />
            </div>
            <p className={`text-xs eai-muted mt-1.5 ${km}`}>{w("quizLockedHint", { solved: num(row.solved), total: num(row.total) })}</p>
          </>
        )}
      </div>
      {action && (
        <button type="button" onClick={onStart} data-testid="quiz-start"
          className={`eai-btn eai-focus text-sm py-2.5 px-4 flex items-center gap-1.5 flex-shrink-0 ${action.primary ? "text-white" : "eai-soft"} ${km}`}
          style={action.primary ? { background: "var(--primary)" } : { color: "var(--ink)" }}>
          {action.label} <ChevronRight size={15} />
        </button>
      )}
    </div>
  );
}

/* The quiz. Props
   title        the chapter's name
   questions    the quiz's questions (exercises), already in the student's language
   attemptId    a fresh id for this attempt, kept across retries of the save
   alreadyPassed  the chapter was already passed when this attempt began (a retake)
   nextName     name of the chapter this one opens, when that chapter is open now (otherwise null)
   grade        (exercise, answer) -> true when the answer is right, in either language
   onAnswer     (exercise, "correct" | "incorrect", { timeSec, answer }) each answered question, as practice
   onSubmit     ({ attemptId, answers: [{ key, answer }], timeSec }) -> Promise<{ ok, result?, code?, retryAfter? }>
   onExit       leave the quiz for the chapter list
   onNext       go to the chapter this one opened
   onRetake     start a new quiz of the same chapter
   errorText    (code, retryAfter) -> a sentence for a failed save */
export default function ChapterQuiz({
  title, questions, lang = "en", localize = (n) => String(n), attemptId, alreadyPassed = false, nextName = null,
  grade, onAnswer, onSubmit, onExit, onNext, onRetake, errorText,
}) {
  const km = lang === "km" ? "eai-km" : "";
  const w = words(lang);
  const num = (n) => localize(n, lang);
  const total = questions.length;
  const [index, setIndex] = useState(0);
  const [choice, setChoice] = useState(null);
  const [answers, setAnswers] = useState({});          // { [exerciseId]: what was chosen or typed; null when skipped }
  const [phase, setPhase] = useState("answering");     // answering | saving | failed | result
  const [outcome, setOutcome] = useState(null);        // the server's verdict
  const [failure, setFailure] = useState(null);        // { code, retryAfter } when the save failed
  const [leaving, setLeaving] = useState(false);
  const startedAt = useRef(Date.now());
  const questionStartedAt = useRef(Date.now());
  const advancing = useRef(false);                     // a double tap on Next must count once
  const saving = useRef(false);
  const heading = useRef(null);

  useEffect(() => { advancing.current = false; heading.current?.focus?.(); }, [index, phase]);

  const save = async (finalAnswers) => {
    if (saving.current) return;
    saving.current = true;
    setPhase("saving"); setFailure(null);
    const timeSec = Math.round((Date.now() - startedAt.current) / 100) / 10;
    let res;
    try {
      res = await onSubmit({ attemptId, answers: questions.map((q) => ({ key: q.id, answer: finalAnswers[q.id] ?? null })), timeSec });
    } catch { res = { ok: false, code: "network_error" }; }
    saving.current = false;
    if (res?.ok) { setOutcome(res.result); setPhase("result"); }
    else { setFailure({ code: res?.code, retryAfter: res?.retryAfter }); setPhase("failed"); }
  };

  const advance = (chosen) => {
    if (advancing.current || phase !== "answering") return;
    advancing.current = true;
    const ex = questions[index];
    const seconds = Math.round((Date.now() - questionStartedAt.current) / 100) / 10;
    const next = { ...answers, [ex.id]: chosen };
    setAnswers(next);
    // A skipped question is not an attempt, so it is not recorded as practice; it simply counts as wrong in the quiz.
    if (chosen != null) onAnswer?.(ex, grade(ex, chosen) ? "correct" : "incorrect", { timeSec: seconds, answer: chosen });
    if (index + 1 < total) { setIndex(index + 1); setChoice(null); questionStartedAt.current = Date.now(); }
    else save(next);
  };

  if (total === 0) return null;
  const ex = questions[index];
  const isMcq = Array.isArray(ex?.options);
  const hasAnswer = choice != null && String(choice).trim() !== "";
  const last = index + 1 === total;

  /* ── Result ── */
  if (phase === "result" && outcome) {
    const { passed, mastered, correct, total: of, score } = outcome;
    const missed = questions.filter((q) => !(answers[q.id] != null && grade(q, answers[q.id])));
    const Icon = mastered ? Award : passed ? CheckCircle2 : RotateCcw;
    const tone = passed ? "var(--jade)" : "var(--gold)";
    const soft = passed ? "var(--jade-soft)" : "var(--gold-soft)";
    const message = passed
      ? (outcome.newlyPassed && nextName ? w("resultOpened", { name: nextName }) : !mastered ? w("resultBetter", { master: num(MASTER_PERCENT) }) : "")
      : alreadyPassed ? w("resultKept") : `${w("resultNeed", { need: num(quizNeeded(of)), total: num(of) })} ${w("resultFailedBody")}`;
    return (
      <div className="space-y-5 eai-rise" data-testid="quiz-result" data-passed={passed ? "yes" : "no"}>
        <div className="eai-card text-center">
          <span className="grid place-items-center rounded-full mx-auto" style={{ width: 56, height: 56, background: soft }} aria-hidden="true"><Icon size={28} style={{ color: tone }} /></span>
          <p className={`text-xs eai-muted mt-3 ${km}`}>{title}</p>
          <h2 ref={heading} tabIndex={-1} className={`eai-display text-2xl font-extrabold mt-0.5 outline-none ${km}`}>{w(mastered ? "resultMasteredTitle" : passed ? "resultPassedTitle" : "resultFailedTitle")}</h2>
          <p className="eai-display text-4xl font-extrabold mt-3" style={{ color: tone }}>{num(score)}%</p>
          <p className={`text-sm eai-muted mt-1 ${km}`}>{w("resultScore", { correct: num(correct), total: num(of) })}</p>
          {message && <p className={`text-sm mt-4 ${km}`}>{message}</p>}
          <div className="flex flex-wrap justify-center gap-2 mt-5">
            {passed && nextName && (
              <button type="button" onClick={onNext} className={`eai-btn eai-focus text-white py-2.5 px-4 text-sm flex items-center gap-1.5 ${km}`} style={{ background: "var(--primary)" }}>
                {w("resultNext", { name: nextName })} <ChevronRight size={15} />
              </button>
            )}
            {!mastered && (
              <button type="button" onClick={onRetake} className={`eai-btn eai-focus eai-soft py-2.5 px-4 text-sm flex items-center gap-1.5 ${km}`} style={{ color: "var(--ink)" }}>
                <RotateCcw size={15} /> {w("quizRetake")}
              </button>
            )}
            <button type="button" onClick={onExit} className={`eai-btn eai-focus py-2.5 px-4 text-sm ${passed && nextName ? "eai-soft" : "text-white"} ${km}`}
              style={passed && nextName ? { color: "var(--ink)" } : { background: "var(--primary)" }}>{w("resultBack")}</button>
          </div>
        </div>

        {missed.length > 0 && (
          <div className="space-y-3">
            <h3 className={`eai-display font-bold ${km}`}>{w("resultMissedTitle")}</h3>
            {missed.map((q) => (
              <div key={q.id} className="eai-card">
                <p className="text-sm font-semibold">{q.prompt}</p>
                <p className={`text-xs eai-muted mt-2 ${km}`}>{w("resultYourAnswer")}: <b style={{ color: "var(--ink)" }}>{answers[q.id] != null && String(answers[q.id]).trim() !== "" ? answers[q.id] : w("resultNoAnswer")}</b></p>
                <p className={`text-xs eai-muted mt-0.5 ${km}`}>{w("resultCorrectAnswer")}: <b style={{ color: "var(--jade)" }}>{q.answer}</b></p>
                {q.explanation && (
                  <div className="flex gap-2 mt-3 p-3 rounded-2xl eai-soft">
                    <Lightbulb size={15} className="flex-shrink-0 mt-0.5" style={{ color: "var(--gold)" }} aria-hidden="true" />
                    <p className="text-sm leading-relaxed">{q.explanation}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  /* ── Saving, or the save failed ── */
  if (phase === "saving" || phase === "failed") {
    const locked = failure?.code === "chapter_locked";
    return (
      <div className="eai-card text-center eai-rise" role="status" data-testid={phase === "saving" ? "quiz-saving" : "quiz-failed"}>
        {phase === "saving" ? (
          <p className={`text-sm font-semibold ${km}`}>{w("quizSaving")}</p>
        ) : (
          <>
            <h2 ref={heading} tabIndex={-1} className={`eai-display font-bold outline-none ${km}`}>{w("quizSaveFailed")}</h2>
            <p className={`text-sm eai-muted mt-1.5 ${km}`}>{locked ? w("quizLocked") : (errorText ? errorText(failure?.code, failure?.retryAfter) : "")}</p>
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {!locked && (
                <button type="button" onClick={() => save(answers)} className={`eai-btn eai-focus text-white py-2.5 px-4 text-sm ${km}`} style={{ background: "var(--primary)" }}>{w("quizRetry")}</button>
              )}
              <button type="button" onClick={onExit} className={`eai-btn eai-focus eai-soft py-2.5 px-4 text-sm ${km}`} style={{ color: "var(--ink)" }}>{w("resultBack")}</button>
            </div>
          </>
        )}
      </div>
    );
  }

  /* ── A question ── */
  return (
    <div className="space-y-4 eai-rise">
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={() => setLeaving(true)} className={`eai-focus flex items-center gap-1 text-sm eai-muted ${km}`}><ChevronLeft size={16} /> {w("quizLeave")}</button>
        <p className={`text-xs font-semibold eai-muted min-w-0 truncate ${km}`}>{title}</p>
      </div>

      {leaving && (
        <div className="eai-card flex flex-wrap items-center justify-between gap-3" role="alertdialog" aria-label={w("quizLeave")} style={{ borderColor: "var(--gold)" }}>
          <p className={`text-sm font-semibold min-w-0 ${km}`}>{w("quizLeaveAsk")}</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setLeaving(false)} className={`eai-btn eai-focus text-white py-2 px-4 text-sm ${km}`} style={{ background: "var(--primary)" }}>{w("quizLeaveStay")}</button>
            <button type="button" onClick={onExit} className={`eai-btn eai-focus eai-soft py-2 px-4 text-sm ${km}`} style={{ color: "var(--ink)" }}>{w("quizLeaveYes")}</button>
          </div>
        </div>
      )}

      <div className="eai-ex-card" data-testid="quiz-question">
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <span className={`eai-ex-qlabel eai-display ${km}`} role="status">{w("quizQuestionOf", { n: num(index + 1), total: num(total) })}</span>
        </div>
        <div className="h-1.5 rounded-full eai-soft mb-4 overflow-hidden" aria-hidden="true">
          <div className="h-full rounded-full" style={{ width: `${(index / total) * 100}%`, background: "var(--primary)", transition: "width .3s ease" }} />
        </div>

        <h3 ref={heading} tabIndex={-1} className="eai-ex-question eai-display outline-none">{ex.prompt}</h3>

        {isMcq ? (
          <div className="eai-ex-options" role="group" aria-label={ex.prompt}>
            {ex.options.map((opt) => {
              const chosen = choice === opt;
              return (
                <button key={opt} type="button" aria-pressed={chosen} onClick={() => setChoice(opt)} className="eai-ex-option eai-focus"
                  style={{ background: chosen ? "var(--primary-soft)" : "var(--card)", border: `1.5px solid ${chosen ? "var(--primary)" : "var(--line)"}`, color: chosen ? "var(--primary)" : "var(--ink)" }}>
                  {opt}
                </button>
              );
            })}
          </div>
        ) : (
          <input className="eai-input eai-focus w-full text-sm" placeholder={w("quizTypeAnswer")} value={choice ?? ""} aria-label={ex.prompt}
            onChange={(e) => setChoice(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && hasAnswer) advance(choice); }} />
        )}

        <div className="flex flex-wrap gap-2 mt-5">
          <button type="button" disabled={!hasAnswer} onClick={() => advance(choice)} data-testid="quiz-next"
            className={`eai-btn eai-focus text-white flex-1 py-3 text-sm flex items-center justify-center gap-1.5 ${km}`} style={{ background: "var(--primary)", opacity: hasAnswer ? 1 : 0.5 }}>
            {w(last ? "quizFinish" : "quizNext")} <ChevronRight size={15} />
          </button>
          <button type="button" onClick={() => advance(null)} data-testid="quiz-skip" className={`eai-btn eai-focus eai-soft py-3 px-4 text-sm ${km}`} style={{ color: "var(--muted)" }}>{w("quizSkip")}</button>
        </div>
      </div>
    </div>
  );
}
