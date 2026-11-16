/* The "Formula Mastery" screen: a separate learning system from the chapter path above it (ChapterList.jsx,
   ChapterQuiz.jsx) and from the quick review pair (FormulaDrill.jsx, FormulaSheet.jsx) — its own staged
   curriculum per chapter, its own 80%-threshold mastery check, graded and saved on its own server table
   (formula_mastery), never touching chapter_progress, the Master Quiz's pass/master state, or XP.

   One chapter's curriculum is always the same six stages, in order (formulaMasteryFlow.js's STAGES):
     intro -> recognition -> application -> missingVariable -> tricky -> masteryCheck
   "intro" (FORMULA_INTROS) is lesson content: the chapter's main formula(s), what each variable means, and
   one worked example — read once, not graded. The four kind stages are each every Formula Mastery question
   of that kind (FORMULA_MASTERY, via formulaMasteryFlow.js's `pool`/`byKind`), worked through forward with a
   miss cycling back round until every one is right (the same rule practiceFlow.js sets follow) — this is
   warm-up practice, answered here only, never sent anywhere and never touching the student's ordinary
   `practice` record or XP, the same "pure review" guarantee FormulaDrill/FormulaSheet already give their own
   content. A wrong answer here is met right away with remediation keyed to the SPECIFIC kind of mistake
   (formulaMasteryFlow.js's `remediationFor`): the formula itself for a recognition miss, the worked example
   for an application miss, the variable breakdown for a missing-variable miss, the question's own explanation
   for a tricky one. Only once every kind stage is cleared does the mastery check appear: a graded, saved
   attempt (POST /formula-mastery-quizzes) that can be retaken, after which the same remediation machinery
   points at whichever kinds the attempt actually missed.

   Pure presentation, like FormulaDrill.jsx and ChapterQuiz.jsx: the staging/remediation rules are in
   formulaMasteryFlow.js, the words in chapterStrings.js, the content in formulaMastery.js/formulaIntros.js,
   and the caller (PracticeSubject in App.jsx) hands in the subject's full list and the submit/error callbacks
   — nothing is imported back from it. */
import React, { useEffect, useRef, useState } from "react";
import { Award, CheckCircle2, XCircle, ChevronLeft, ChevronRight, Lightbulb, RotateCcw } from "lucide-react";
import {
  pool, byKind, pickMasteryCheck, nextStage, readyForMasteryCheck,
  nextInKind, firstOpenInKind, introFor, remediationFor, remediationKinds,
} from "./formulaMasteryFlow.js";
import { FORMULA_MASTERY_PERCENT, FORMULA_MASTERY_QUIZ_SIZE } from "./progressionConfig.js";
import { chapterText, fillChapter } from "./chapterStrings.js";
import { newAttemptId } from "./serverMapping.js";
import { FORMULA_INTROS } from "../src/data/mathematics/formulaIntros.js";

const words = (lang) => (key, vars) => fillChapter(chapterText(lang, key), vars);
const STAGE_LABEL = {
  intro: "fmStageIntro", recognition: "fmStageRecognition", application: "fmStageApplication",
  missingVariable: "fmStageMissingVariable", tricky: "fmStageTricky", masteryCheck: "fmStageMasteryCheck",
};
const isKindStage = (s) => s in STAGE_LABEL && s !== "intro" && s !== "masteryCheck";

/* The small entry point shown next to a chapter row (beside the Formula drill / Formula sheet buttons),
   offering this chapter's Formula Mastery — unlike those two, it is still only ever shown for a chapter the
   caller has decided to offer it for (PracticeSubject gates this on SERVER_MODE, since there is nowhere to
   save its own progress without a server). Hidden when the chapter has no Formula Mastery content at all.
   Props
     count     how many Formula Mastery questions the chapter has, so the button can hide itself when there are none
     mastered  this chapter's mastery check has already been passed at least once — shown as a small checkmark,
               never hidden: a mastered chapter stays reachable to review or retake for a better score
     onStart   open Formula Mastery for this chapter */
export function FormulaMasteryButton({ count, mastered = false, lang = "en", onStart }) {
  if (!count) return null;
  const km = lang === "km" ? "eai-km" : "";
  const w = words(lang);
  return (
    <button type="button" onClick={(e) => { e.stopPropagation(); onStart(); }}
      className={`eai-focus flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-full flex-shrink-0 ${km}`}
      style={{ background: "var(--jade-soft)", color: "var(--jade)" }}>
      <Award size={13} /> {w("formulaMasteryButton")} {mastered && <CheckCircle2 size={13} />}
    </button>
  );
}

/* A miss's remediation (formulaMasteryFlow.js's `remediationFor`), rendered by its `type`. Falls back to a
   plain explanation (the "tricky" case, and anything with no matching intro) the same way FormulaDrill and
   ChapterQuiz already show a miss's explanation. */
function RemediationBlock({ remediation, lang, w, km }) {
  if (!remediation) return null;
  if (remediation.type === "variables") {
    return (
      <div className="mt-3 p-3 rounded-2xl eai-soft">
        <p className={`text-xs font-semibold eai-muted ${km}`}>{w("fmIntroVariablesHeading")}</p>
        <ul className="mt-1.5 space-y-1" style={{ listStyle: "none", padding: 0 }}>
          {remediation.variables.map((v, i) => (
            <li key={i} className="text-sm">
              <b className="font-mono">{v.symbol}</b> — {lang === "km" ? v.meaningKm : v.meaning}
            </li>
          ))}
        </ul>
      </div>
    );
  }
  if (remediation.type === "worked") {
    const wk = remediation.worked;
    return (
      <div className="mt-3 p-3 rounded-2xl eai-soft">
        <p className={`text-xs font-semibold eai-muted ${km}`}>{w("fmIntroWorkedHeading")}</p>
        <p className={`text-sm mt-1 ${km}`}>{lang === "km" ? wk.promptKm : wk.prompt}</p>
        <ol className="mt-1.5 space-y-1 ml-4" style={{ listStyle: "decimal" }}>
          {(lang === "km" ? wk.stepsKm : wk.steps).map((s, i) => (
            <li key={i} className="text-sm font-mono" style={{ overflowWrap: "anywhere" }}>{s}</li>
          ))}
        </ol>
      </div>
    );
  }
  if (remediation.type === "formula") {
    return (
      <div className="mt-3 p-3 rounded-2xl eai-soft">
        <p className="text-sm font-mono leading-relaxed" style={{ overflowWrap: "anywhere" }}>{lang === "km" ? remediation.formulaKm : remediation.formula}</p>
        <p className={`text-xs eai-muted mt-1 ${km}`}>{lang === "km" ? remediation.whenToUseKm : remediation.whenToUse}</p>
      </div>
    );
  }
  return (
    <div className="flex gap-2 mt-3 p-3 rounded-2xl eai-soft">
      <Lightbulb size={15} className="flex-shrink-0 mt-0.5" style={{ color: "var(--gold)" }} aria-hidden="true" />
      <p className={`text-sm leading-relaxed ${km}`}>{lang === "km" ? remediation.explanationKm : remediation.explanation}</p>
    </div>
  );
}

/* The screen itself. Props
   chapterName  the chapter's localized name, shown throughout as the screen's title
   list         the subject's full localized exercise list (PracticeSubject already has it) — this chapter's
                Formula Mastery pool (and the ordinary mastery check draw) are both drawn from it
   chapterKey   the stable English chapter key
   grade        (exercise, answer) -> true when the answer is right, in either language
   mastery      this chapter's known Formula Mastery state -- { total, best, mastered, attempts } from the
                server (serverMapping.js's formulaMasteryFromServer), or null while that is not known yet
   onSubmit     ({ attemptId, answers: [{ key, answer }], timeSec }) -> Promise<{ ok, result?, code?, retryAfter? }>
                -- the caller adds { subject, chapter } the same way PracticeSubject already does for onSubmitQuiz
   errorText    (code, retryAfter) -> a sentence for a failed save
   onExit       leave Formula Mastery, back to the chapter list (nothing here is lost except the current pass
                through the four practice stages -- an already-mastered or already-attempted check is unaffected,
                since that lives on the server, not in this screen's own state) */
export default function FormulaMastery({ chapterName, list, chapterKey, grade, lang = "en", mastery = null, onSubmit, errorText, onExit }) {
  const km = lang === "km" ? "eai-km" : "";
  const w = words(lang);
  const chapterIntros = FORMULA_INTROS[chapterKey] ?? [];
  const hasIntro = chapterIntros.length > 0;
  const questions = pool(list, chapterKey);
  const groups = byKind(questions);

  const [stage, setStage] = useState(() => nextStage(null, groups, hasIntro) ?? "masteryCheck");
  const [at, setAt] = useState(0);
  const [choice, setChoice] = useState(null);
  const [checked, setChecked] = useState(false);
  const [correctIds, setCorrectIds] = useState(() => new Set());
  const isDone = (ex) => correctIds.has(ex.id);

  // The mastery check's own sub-screen: intro (offer it) -> answering (exam-style, no feedback until the end,
  // same convention as ChapterQuiz) -> saving -> failed (retry) -> result (mastered or not, with remediation
  // for whichever kinds this attempt actually missed).
  const [checkPhase, setCheckPhase] = useState("intro");
  const [checkQuestions, setCheckQuestions] = useState([]);
  const [checkIndex, setCheckIndex] = useState(0);
  const [checkChoice, setCheckChoice] = useState(null);
  const [checkAnswers, setCheckAnswers] = useState({});
  const [checkOutcome, setCheckOutcome] = useState(null);
  const [checkFailure, setCheckFailure] = useState(null);
  const attemptIdRef = useRef(null);
  const startedAtRef = useRef(Date.now());
  const savingRef = useRef(false);
  const heading = useRef(null);

  useEffect(() => { heading.current?.focus?.({ preventScroll: true }); }, [stage, at, checkIndex, checkPhase]);

  if (questions.length === 0) return null; // nothing to show — FormulaMasteryButton already hides itself

  const enterStage = (s) => {
    setStage(s);
    setChoice(null); setChecked(false);
    if (isKindStage(s)) setAt(firstOpenInKind(groups[s] ?? [], isDone) ?? 0);
  };
  const goNext = () => enterStage(nextStage(stage, groups, hasIntro) ?? "masteryCheck");

  const startCheck = () => {
    attemptIdRef.current = newAttemptId();
    startedAtRef.current = Date.now();
    setCheckQuestions(pickMasteryCheck(list, chapterKey, Date.now()));
    setCheckIndex(0); setCheckChoice(null); setCheckAnswers({}); setCheckOutcome(null); setCheckFailure(null);
    setCheckPhase("answering");
  };

  const saveCheck = async (finalAnswers) => {
    if (savingRef.current) return;
    savingRef.current = true;
    setCheckPhase("saving"); setCheckFailure(null);
    const timeSec = Math.round((Date.now() - startedAtRef.current) / 100) / 10;
    let res;
    try {
      res = await onSubmit({ attemptId: attemptIdRef.current, answers: checkQuestions.map((q) => ({ key: q.id, answer: finalAnswers[q.id] ?? null })), timeSec });
    } catch { res = { ok: false, code: "network_error" }; }
    savingRef.current = false;
    if (res?.ok) { setCheckOutcome(res.result); setCheckPhase("result"); }
    else { setCheckFailure({ code: res?.code, retryAfter: res?.retryAfter }); setCheckPhase("failed"); }
  };

  const advanceCheck = (chosen) => {
    const q = checkQuestions[checkIndex];
    const nextAnswers = { ...checkAnswers, [q.id]: chosen };
    setCheckAnswers(nextAnswers); setCheckChoice(null);
    if (checkIndex + 1 < checkQuestions.length) setCheckIndex(checkIndex + 1);
    else saveCheck(nextAnswers);
  };

  /* ── Lesson content: the chapter's main formula(s), what each variable means, one worked example ── */
  if (stage === "intro") {
    return (
      <div className="space-y-4 eai-rise">
        <div className="flex items-center justify-between gap-3">
          <button type="button" onClick={onExit} className={`eai-focus flex items-center gap-1 text-sm eai-muted ${km}`}><ChevronLeft size={16} /> {w("resultBack")}</button>
          <p className={`text-xs font-semibold eai-muted min-w-0 truncate ${km}`}>{w("fmStageIntro")}</p>
        </div>
        <div className="eai-card">
          <h2 ref={heading} tabIndex={-1} className={`eai-display text-lg font-extrabold outline-none ${km}`} style={{ overflowWrap: "anywhere" }}>{chapterName}</h2>
          <div className="mt-3 space-y-5">
            {chapterIntros.map((intro) => (
              <div key={intro.key}>
                <p className={`text-xs eai-muted ${km}`}>{lang === "km" ? intro.topicKm : intro.topic}</p>
                <p className="text-sm font-mono leading-relaxed mt-0.5" style={{ overflowWrap: "anywhere" }}>{lang === "km" ? intro.formulaKm : intro.formula}</p>
                <p className={`text-sm mt-1.5 ${km}`}>{lang === "km" ? intro.whenToUseKm : intro.whenToUse}</p>
                <div className="mt-3 p-3 rounded-2xl eai-soft">
                  <p className={`text-xs font-semibold eai-muted ${km}`}>{w("fmIntroVariablesHeading")}</p>
                  <ul className="mt-1.5 space-y-1" style={{ listStyle: "none", padding: 0 }}>
                    {intro.variables.map((v, i) => (
                      <li key={i} className="text-sm"><b className="font-mono">{v.symbol}</b> — {lang === "km" ? v.meaningKm : v.meaning}</li>
                    ))}
                  </ul>
                </div>
                <div className="mt-3 p-3 rounded-2xl eai-soft">
                  <p className={`text-xs font-semibold eai-muted ${km}`}>{w("fmIntroWorkedHeading")}</p>
                  <p className={`text-sm mt-1 ${km}`}>{lang === "km" ? intro.worked.promptKm : intro.worked.prompt}</p>
                  <ol className="mt-1.5 space-y-1 ml-4" style={{ listStyle: "decimal" }}>
                    {(lang === "km" ? intro.worked.stepsKm : intro.worked.steps).map((s, i) => (
                      <li key={i} className="text-sm font-mono" style={{ overflowWrap: "anywhere" }}>{s}</li>
                    ))}
                  </ol>
                </div>
              </div>
            ))}
          </div>
          <button type="button" onClick={goNext} className={`eai-btn eai-focus text-white w-full py-3 text-sm mt-5 flex items-center justify-center gap-1.5 ${km}`} style={{ background: "var(--jade)" }}>
            {w("fmIntroContinue")} <ChevronRight size={15} />
          </button>
        </div>
      </div>
    );
  }

  /* ── One of the four practice stages: every question of one kind, forward with a miss cycling back round
     (nextInKind) until all are right, each miss met with remediation for that specific kind of mistake ── */
  if (isKindStage(stage)) {
    const items = groups[stage] ?? [];
    if (items.length === 0) { goNext(); return null; } // defensive: nextStage already skips an empty kind
    const ex = items[at] ?? items[0];
    const right = checked ? grade(ex, choice) : null;
    const remediation = checked && !right ? remediationFor(ex, introFor(ex, chapterIntros)) : null;
    const doneCount = items.filter(isDone).length;
    // `correctIds` already reflects this answer by the time `checked` is true (set in the same `pick()`
    // call, so React batches both into the one re-render) -- `isDone` alone is enough to tell whether this
    // was the very last question of the stage left to get right.
    const wouldFinish = checked && items.every(isDone);

    const pick = (opt) => {
      if (checked) return;
      setChoice(opt); setChecked(true);
      if (grade(ex, opt)) setCorrectIds((s) => new Set(s).add(ex.id));
    };
    const next = () => {
      const upNext = nextInKind(items, isDone, at);
      setChoice(null); setChecked(false);
      if (upNext == null) { goNext(); return; }
      setAt(upNext);
    };

    return (
      <div className="space-y-4 eai-rise">
        <div className="flex items-center justify-between gap-3">
          <button type="button" onClick={onExit} className={`eai-focus flex items-center gap-1 text-sm eai-muted ${km}`}><ChevronLeft size={16} /> {w("resultBack")}</button>
          <p className={`text-xs font-semibold eai-muted min-w-0 truncate ${km}`}>{w(STAGE_LABEL[stage])}</p>
        </div>

        <div className="eai-ex-card" data-testid="fm-question">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <span className={`eai-ex-qlabel eai-display ${km}`} role="status">{chapterName}</span>
          </div>
          <div className="h-1.5 rounded-full eai-soft mb-4 overflow-hidden" aria-hidden="true">
            <div className="h-full rounded-full" style={{ width: `${(doneCount / items.length) * 100}%`, background: "var(--jade)", transition: "width .3s ease" }} />
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

          {checked && !right && (
            <>
              <p className={`text-sm font-semibold mt-3 ${km}`} style={{ color: "var(--jade)" }}>{w("resultCorrectAnswer")}: {ex.answer}</p>
              <RemediationBlock remediation={remediation} lang={lang} w={w} km={km} />
            </>
          )}

          <div className="flex flex-wrap gap-2 mt-5">
            <button type="button" disabled={!checked} onClick={next} data-testid="fm-next"
              className={`eai-btn eai-focus text-white flex-1 py-3 text-sm flex items-center justify-center gap-1.5 ${km}`}
              style={{ background: "var(--jade)", opacity: checked ? 1 : 0.5 }}>
              {w(wouldFinish ? "quizFinish" : "quizNext")} <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── The mastery check ── */
  if (checkPhase === "intro") {
    const size = Math.min(FORMULA_MASTERY_QUIZ_SIZE, questions.length);
    const ready = readyForMasteryCheck(groups, isDone);
    return (
      <div className="eai-card text-center eai-rise" data-testid="fm-check-intro">
        <span className="grid place-items-center rounded-full mx-auto" style={{ width: 56, height: 56, background: "var(--jade-soft)" }} aria-hidden="true">
          <Award size={26} style={{ color: "var(--jade)" }} />
        </span>
        <p className={`text-xs eai-muted mt-3 ${km}`}>{chapterName}</p>
        <h2 ref={heading} tabIndex={-1} className={`eai-display text-xl font-extrabold mt-0.5 outline-none ${km}`}>{w("fmStageMasteryCheck")}</h2>
        {mastery?.mastered && <p className={`text-sm mt-2 ${km}`} style={{ color: "var(--jade)" }}>{w("fmMasteredBody", { best: mastery.best })}</p>}
        <p className={`text-sm mt-3 ${km}`}>{w("fmCheckIntro", { size, pass: FORMULA_MASTERY_PERCENT })}</p>
        <div className="flex flex-wrap justify-center gap-2 mt-5">
          {ready ? (
            <button type="button" onClick={startCheck} className={`eai-btn eai-focus text-white py-2.5 px-4 text-sm flex items-center gap-1.5 ${km}`} style={{ background: "var(--jade)" }}>
              {w(mastery?.attempts > 0 ? "fmRetakeCheck" : "fmCheckStart")} <ChevronRight size={15} />
            </button>
          ) : (
            <p className={`text-sm eai-muted ${km}`}>{w("fmCheckLocked")}</p>
          )}
          <button type="button" onClick={onExit} className={`eai-btn eai-focus eai-soft py-2.5 px-4 text-sm ${km}`} style={{ color: "var(--ink)" }}>{w("resultBack")}</button>
        </div>
      </div>
    );
  }

  if (checkPhase === "answering") {
    const q = checkQuestions[checkIndex];
    const total = checkQuestions.length;
    const hasAnswer = checkChoice != null;
    const last = checkIndex + 1 === total;
    return (
      <div className="space-y-4 eai-rise">
        <div className="flex items-center justify-between gap-3">
          <p className={`text-xs font-semibold eai-muted min-w-0 truncate flex items-center gap-1 ${km}`}><Award size={12} style={{ color: "var(--jade)" }} /> {w("fmStageMasteryCheck")}</p>
        </div>
        <div className="eai-ex-card" data-testid="fm-check-question">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <span className={`eai-ex-qlabel eai-display ${km}`} role="status">{chapterName}</span>
          </div>
          <div className="h-1.5 rounded-full eai-soft mb-4 overflow-hidden" aria-hidden="true">
            <div className="h-full rounded-full" style={{ width: `${(checkIndex / total) * 100}%`, background: "var(--jade)", transition: "width .3s ease" }} />
          </div>
          <h3 ref={heading} tabIndex={-1} className="eai-ex-question eai-display outline-none">{q.prompt}</h3>
          <div className="eai-ex-options" role="group" aria-label={q.prompt}>
            {q.options.map((opt) => {
              const chosen = checkChoice === opt;
              return (
                <button key={opt} type="button" aria-pressed={chosen} onClick={() => setCheckChoice(opt)} className="eai-ex-option eai-focus"
                  style={{ background: chosen ? "var(--primary-soft)" : "var(--card)", border: `1.5px solid ${chosen ? "var(--primary)" : "var(--line)"}`, color: chosen ? "var(--primary)" : "var(--ink)" }}>
                  {opt}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-2 mt-5">
            <button type="button" disabled={!hasAnswer} onClick={() => advanceCheck(checkChoice)} data-testid="fm-check-next"
              className={`eai-btn eai-focus text-white flex-1 py-3 text-sm flex items-center justify-center gap-1.5 ${km}`}
              style={{ background: "var(--jade)", opacity: hasAnswer ? 1 : 0.5 }}>
              {w(last ? "quizFinish" : "quizNext")} <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (checkPhase === "saving" || checkPhase === "failed") {
    const locked = checkFailure?.code === "chapter_locked";
    return (
      <div className="eai-card text-center eai-rise" role="status" data-testid={checkPhase === "saving" ? "fm-check-saving" : "fm-check-failed"}>
        {checkPhase === "saving" ? (
          <p className={`text-sm font-semibold ${km}`}>{w("fmCheckSaving")}</p>
        ) : (
          <>
            <h2 ref={heading} tabIndex={-1} className={`eai-display font-bold outline-none ${km}`}>{w("fmSaveFailed")}</h2>
            <p className={`text-sm eai-muted mt-1.5 ${km}`}>{locked ? w("quizLocked") : (errorText ? errorText(checkFailure?.code, checkFailure?.retryAfter) : "")}</p>
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {!locked && (
                <button type="button" onClick={() => saveCheck(checkAnswers)} className={`eai-btn eai-focus text-white py-2.5 px-4 text-sm ${km}`} style={{ background: "var(--jade)" }}>{w("quizRetry")}</button>
              )}
              <button type="button" onClick={onExit} className={`eai-btn eai-focus eai-soft py-2.5 px-4 text-sm ${km}`} style={{ color: "var(--ink)" }}>{w("resultBack")}</button>
            </div>
          </>
        )}
      </div>
    );
  }

  /* checkPhase === "result" */
  const { mastered, correct, total: of, score } = checkOutcome ?? {};
  const missed = checkQuestions.filter((q) => !(checkAnswers[q.id] != null && grade(q, checkAnswers[q.id])));
  const kinds = remediationKinds(missed);
  const Icon = mastered ? Award : RotateCcw;
  const tone = mastered ? "var(--jade)" : "var(--gold)";
  const soft = mastered ? "var(--jade-soft)" : "var(--gold-soft)";
  return (
    <div className="space-y-5 eai-rise" data-testid="fm-check-result" data-mastered={mastered ? "yes" : "no"}>
      <div className="eai-card text-center">
        <span className="grid place-items-center rounded-full mx-auto" style={{ width: 56, height: 56, background: soft }} aria-hidden="true"><Icon size={28} style={{ color: tone }} /></span>
        <p className={`text-xs eai-muted mt-3 ${km}`}>{chapterName}</p>
        <h2 ref={heading} tabIndex={-1} className={`eai-display text-2xl font-extrabold mt-0.5 outline-none ${km}`}>{w(mastered ? "fmMasteredTitle" : "fmNotMasteredTitle")}</h2>
        <p className="eai-display text-4xl font-extrabold mt-3" style={{ color: tone }}>{score}%</p>
        <p className={`text-sm eai-muted mt-1 ${km}`}>{w("resultScore", { correct, total: of })}</p>
        <p className={`text-sm mt-4 ${km}`}>{w(mastered ? "fmMasteredBody" : "fmNotMasteredBody", { best: score })}</p>
        <div className="flex flex-wrap justify-center gap-2 mt-5">
          {!mastered && (
            <button type="button" onClick={startCheck} className={`eai-btn eai-focus text-white py-2.5 px-4 text-sm flex items-center gap-1.5 ${km}`} style={{ background: "var(--jade)" }}>
              <RotateCcw size={15} /> {w("fmRetakeCheck")}
            </button>
          )}
          <button type="button" onClick={onExit} className={`eai-btn eai-focus py-2.5 px-4 text-sm ${mastered ? "text-white" : "eai-soft"} ${km}`} style={mastered ? { background: "var(--jade)" } : { color: "var(--ink)" }}>{w("resultBack")}</button>
        </div>
      </div>

      {/* `kinds` (remediationKinds, curriculum order) and `missed.length > 0` always agree (kinds is exactly
          the set of kinds among the missed questions) -- gating on it here, rather than on missed.length,
          is what actually exercises the adaptive-remediation-by-mistake-type rule at the mastery-check level,
          not just the per-question one the four practice stages above already apply. */}
      {kinds.length > 0 && (
        <div className="space-y-3">
          <h3 className={`eai-display font-bold ${km}`}>{w("fmRemediationTitle")}</h3>
          {missed.map((q) => {
            const remediation = remediationFor(q, introFor(q, chapterIntros));
            return (
              <div key={q.id} className="eai-card">
                <p className="text-sm font-semibold">{q.prompt}</p>
                <p className={`text-xs eai-muted mt-2 ${km}`}>{w("resultCorrectAnswer")}: <b style={{ color: "var(--jade)" }}>{q.answer}</b></p>
                <RemediationBlock remediation={remediation} lang={lang} w={w} km={km} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
