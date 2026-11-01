/* The daily warm-up screen: three quick multiple-choice questions that stand between a student and the dashboard, once a
   day. Pure presentation, like MobileNav.jsx and ExerciseUi.jsx: the rules are in warmup.js, the words in
   warmupStrings.js, and App.jsx passes in everything else (it grades, records the answers and sends the study events;
   nothing is imported back from it).

   The flame in the header stays dormant (or an outline, for a student with no streak) until the last answer, then lights
   with the ignite bloom: lighting it is the reward. There is no close button: the gate is the point. A 45 second soft
   timer runs per question; at zero it shows the answer and counts the question as missed, it never blocks. The timer
   turns amber near the end, never red, and wrong answers use a calm neutral colour instead of an alarm. */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, XCircle, Lightbulb } from "lucide-react";
import { StreakFlame } from "./StreakFlame.jsx";
import { WARMUP_SECONDS, warmupCurrentIndex, warmupFinished, warmupScore } from "./warmup.js";
import { warmupText, fillWarmup } from "./warmupStrings.js";

const SLOT_KEY = { weak: "slotWeak", review: "slotReview", missed: "slotMissed", again: "slotAgain" };

/* Props
   state        the saved progress (warmup.js): { day, slots, answers, before }
   resolve      (id, lang) -> the question in that language, or null
   grade        (question, choice) -> true when the choice is right
   topicLabel   (topic, lang) -> the topic's name in that language
   tr           App's translator, for wording that already exists there (Check answer, Explanation, ...)
   localize     (number, lang) -> the number in Khmer numerals when the language is Khmer
   onAnswer     (question, choice | null, correct, timeSec): record it (choice is null when time ran out)
   onFinish     the student pressed the last button: close the gate and send the warm-up event */
export default function WarmUpGate({ state, lang = "en", tr, streak = 0, resolve, grade, topicLabel = (x) => x, localize = (n) => String(n), onAnswer, onFinish }) {
  const km = lang === "km" ? "eai-km" : "";
  const w = (key, vars) => fillWarmup(warmupText(lang, key), vars);
  const num = (n) => localize(n, lang);
  const before = state.before ?? { flame: streak > 0 ? "dormant" : "cold", streak };

  const items = useMemo(() => state.slots.map((s) => ({ ...s, ex: resolve(s.id, lang) })).filter((x) => x.ex), [state.slots, lang, resolve]);
  const total = items.length;
  const [cursor, setCursor] = useState(() => (warmupFinished(state) ? Math.max(0, total - 1) : warmupCurrentIndex(state)));
  const [phase, setPhase] = useState(() => (warmupFinished(state) ? "done" : "answering")); // answering | feedback | done
  const [choice, setChoice] = useState(null);
  const [result, setResult] = useState(null); // { choice, correct, timedOut }
  const [left, setLeft] = useState(WARMUP_SECONDS);
  const [lit, setLit] = useState(false);
  const startRef = useRef(Date.now());
  const headingRef = useRef(null);
  const answeredRef = useRef(false); // one answer per question, even when the timer and a tap land together

  const current = items[cursor];
  const ex = current?.ex;

  const timeUp = () => {
    if (!ex || answeredRef.current) return;
    answeredRef.current = true;
    onAnswer(ex, null, false, WARMUP_SECONDS);
    setResult({ choice: null, correct: false, timedOut: true });
    setPhase("feedback");
  };

  // The soft timer counts from the clock, not from ticks, so a phone that slept does not get a free minute.
  useEffect(() => {
    if (phase !== "answering") return undefined;
    startRef.current = Date.now();
    setLeft(WARMUP_SECONDS);
    const id = setInterval(() => {
      const remaining = Math.max(0, WARMUP_SECONDS - Math.floor((Date.now() - startRef.current) / 1000));
      setLeft(remaining);
      if (remaining === 0) { clearInterval(id); timeUp(); }
    }, 500);
    return () => clearInterval(id);
  }, [phase, cursor]); // eslint-disable-line react-hooks/exhaustive-deps

  // Light the flame a moment after the last screen appears, so the bloom is seen.
  useEffect(() => {
    if (phase !== "done") return undefined;
    const id = setTimeout(() => setLit(true), 350);
    return () => clearTimeout(id);
  }, [phase]);

  useEffect(() => { if (phase === "answering") headingRef.current?.focus({ preventScroll: true }); }, [phase, cursor]);

  const check = () => {
    if (choice == null || !ex || answeredRef.current) return;
    answeredRef.current = true;
    const correct = grade(ex, choice);
    onAnswer(ex, choice, correct, Math.round((Date.now() - startRef.current) / 100) / 10);
    setResult({ choice, correct, timedOut: false });
    setPhase("feedback");
  };
  const next = () => {
    if (cursor + 1 >= total) { setPhase("done"); return; }
    answeredRef.current = false;
    setCursor(cursor + 1); setChoice(null); setResult(null); setPhase("answering");
  };

  if (!total) return null;

  const score = warmupScore(state);
  const answeredIds = new Set(state.answers.filter((a) => !a.correct).map((a) => a.id));
  const missed = items.filter((x) => answeredIds.has(x.id));
  const dayCount = before.flame === "dormant" ? before.streak + 1 : before.flame === "cold" ? 1 : before.streak;
  const chip = { background: "var(--bg-soft)", color: "var(--muted)" };
  const primary = { background: "var(--primary)", color: "#fff" };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="warmup-title" className="fixed inset-0 z-[200] overflow-y-auto"
      style={{ background: "var(--bg)", color: "var(--ink)", paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="eai-warmup mx-auto w-full max-w-md px-4 py-5 min-h-full flex flex-col">
        {phase !== "done" ? (
          <>
            <div className="flex items-center gap-3">
              <div className="grid place-items-center rounded-2xl flex-shrink-0" style={{ width: 52, height: 52, background: "var(--bg-soft)" }}>
                <StreakFlame state={before.flame} size={28} />
              </div>
              <div className="min-w-0">
                <p className={`text-xs font-bold eai-display ${km}`} style={{ color: "var(--streak-dormant)" }}>
                  {before.flame === "cold" ? w("note") : w("streakDays", { n: num(before.streak) })}
                </p>
                <h1 id="warmup-title" className={`eai-display text-lg font-extrabold leading-tight ${km}`}>{w("title")}</h1>
                <p className={`text-sm eai-muted ${km}`}>{w(before.flame === "cold" ? "subtitleCold" : before.flame === "lit" ? "subtitleLit" : "subtitleDormant")}</p>
              </div>
            </div>

            <div className="mt-5">
              <div className="flex gap-1.5" aria-hidden="true">
                {items.map((x, i) => (
                  <span key={x.id} className="h-1.5 flex-1 rounded-full"
                    style={{ background: i < state.answers.length ? "var(--jade)" : i === cursor ? "var(--primary)" : "var(--line)", transition: "background .3s ease" }} />
                ))}
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className={`eai-ex-qlabel eai-display ${km}`}>{w("questionOf", { n: num(cursor + 1), total: num(total) })}</span>
                {phase === "answering" && (
                  <span role="timer" aria-label={w("secondsLeft", { n: left })} className="text-sm font-bold eai-display tabular-nums"
                    style={{ color: left <= 10 ? "var(--gold)" : "var(--muted)" }}>{num(`0:${String(left).padStart(2, "0")}`)}</span>
                )}
              </div>
            </div>

            <div className="eai-ex-card mt-4" style={{ padding: 20, flex: "none" }}>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className={`text-xs px-2 py-0.5 rounded-full ${km}`} style={chip}>{w(SLOT_KEY[current.slot] ?? "slotAgain")}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${kmClassOf(topicLabel(ex.topic, lang))}`} style={chip}>{topicLabel(ex.topic, lang)}</span>
              </div>
              <h2 ref={headingRef} tabIndex={-1} className="eai-ex-question eai-display" style={{ outline: "none" }}>{ex.prompt}</h2>

              <div className="eai-ex-options" role="radiogroup" aria-label={ex.prompt}>
                {ex.options.map((opt) => {
                  const shown = phase === "feedback";
                  const chosen = (shown ? result?.choice : choice) === opt;
                  const isAnswer = opt === ex.answer;
                  let bg = "var(--card)", bd = "var(--line)", col = "var(--ink)";
                  if (shown) {
                    if (isAnswer) { bg = "var(--jade-soft)"; bd = "var(--jade)"; col = "var(--jade)"; }
                    else if (chosen) { bg = "var(--bg-soft)"; bd = "var(--muted)"; col = "var(--muted)"; }
                  } else if (chosen) { bg = "var(--primary-soft)"; bd = "var(--primary)"; col = "var(--primary)"; }
                  return (
                    <button key={opt} role="radio" aria-checked={chosen} disabled={shown} onClick={() => setChoice(opt)}
                      className="eai-ex-option eai-focus" style={{ background: bg, border: `1.5px solid ${bd}`, color: col, minHeight: 48, cursor: shown ? "default" : "pointer" }}>
                      {opt}
                      {shown && isAnswer && <CheckCircle2 size={17} />}
                    </button>
                  );
                })}
              </div>

              {phase === "answering" && (
                <button onClick={check} disabled={choice == null} className={`eai-btn eai-focus w-full mt-5 py-3 text-sm ${km}`} style={{ ...primary, opacity: choice == null ? 0.5 : 1 }}>
                  {tr("checkAnswer")}
                </button>
              )}

              {phase === "feedback" && result && (
                <div className="mt-5 space-y-3 eai-rise" role="status">
                  <div className="flex items-center gap-2.5 p-3 rounded-2xl" style={{ background: result.correct ? "var(--jade-soft)" : "var(--bg-soft)" }}>
                    {result.correct ? <CheckCircle2 size={22} style={{ color: "var(--jade)" }} /> : <XCircle size={22} style={{ color: "var(--muted)" }} />}
                    <div>
                      <p className={`text-sm font-bold ${km}`} style={{ color: result.correct ? "var(--jade)" : "var(--ink)" }}>
                        {result.correct ? w("correct") : result.timedOut ? w("timeUp") : tr("notQuite")}
                      </p>
                      {!result.correct && <p className={`text-xs eai-muted ${km}`}>{tr("correctAnswerIs")} <b style={{ color: "var(--ink)" }}>{ex.answer}</b></p>}
                    </div>
                  </div>
                  {ex.explanation && (
                    <div className="p-4 rounded-2xl eai-soft">
                      <div className="flex items-center gap-2 mb-1.5"><Lightbulb size={15} style={{ color: "var(--gold)" }} /><span className={`text-xs font-bold eai-display ${km}`}>{w("why")}</span></div>
                      <p className="text-sm leading-relaxed">{ex.explanation}</p>
                    </div>
                  )}
                  <button onClick={next} className={`eai-btn eai-focus w-full py-3 text-sm ${km}`} style={primary}>{cursor + 1 >= total ? w("finish") : w("next")}</button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center text-center pt-8">
            <span className="grid place-items-center rounded-3xl" style={{ width: 112, height: 112, background: lit || before.flame === "lit" ? "var(--streak-soft)" : "var(--bg-soft)", transition: "background .6s ease" }}>
              <StreakFlame state={lit ? "lit" : before.flame} size={72} slow />
            </span>
            <div role="status" aria-live="polite">
              <p id="warmup-title" className="eai-display text-4xl font-extrabold mt-5">{w("dayN", { n: num(dayCount) })}</p>
              <h2 className={`eai-display text-xl font-bold mt-1 ${km}`}>{before.flame === "cold" ? w("doneTitleFirst") : w("doneTitle")}</h2>
              <p className={`text-sm eai-muted mt-1 ${km}`}>{w("score", { c: num(score.correct), total: num(score.total) })}</p>
            </div>
            {missed.length > 0 && (
              <div className="mt-6 w-full text-left space-y-2">
                <p className={`text-xs font-bold eai-display eai-muted ${km}`}>{w("missedTitle")}</p>
                {missed.map((x) => (
                  <div key={x.id} className="p-3 rounded-2xl eai-soft">
                    <p className="text-sm font-semibold">{x.ex.prompt}</p>
                    <p className={`text-xs eai-muted mt-1 ${km}`}>{tr("correctAnswerIs")} <b style={{ color: "var(--ink)" }}>{x.ex.answer}</b></p>
                  </div>
                ))}
              </div>
            )}
            <button onClick={onFinish} className={`eai-btn eai-focus w-full mt-8 py-3 text-sm ${km}`} style={primary}>{w("go")}</button>
          </div>
        )}
      </div>
    </div>
  );
}

const kmClassOf = (s) => (typeof s === "string" && /[ក-៿]/.test(s) ? "eai-km" : "");
