/* The chapter path for one subject: chapters in curriculum order on a vertical rail, each drawn from its state (locked,
   open, in progress, quiz ready, passed, Grade A), and a sheet that says why a locked chapter is locked. A locked chapter is never a
   dead tap: it opens the sheet, which names the chapter to finish and takes the student there.

   Pure presentation, like WarmUpGate.jsx and MobileNav.jsx: the rules are in chapterProgress.js, the words in
   chapterStrings.js, and App.jsx passes in everything else (nothing is imported back from it).

   Colours reuse the status meanings already in the app: gold for in progress, jade for done, primary for ready to start
   (and for a Master Quiz that is ready to take).
   A lock is muted grey, never the ember red, because a lock is not an error. State is always said in words as well as
   shown in colour and icon. */
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Lock, PlayCircle, CheckCircle2, Award, ClipboardCheck } from "lucide-react";
import { PASS_PERCENT, MASTER_PERCENT } from "./progressionConfig.js";
import { chaptersPassed } from "./chapterProgress.js";
import { chapterText, fillChapter } from "./chapterStrings.js";
import { RomdoulVine, RomdoulBlossom } from "./Romdoul.jsx";
import { DrillButton } from "./FormulaDrill.jsx";

const LOOK = {
  locked: { icon: Lock, color: "var(--muted)", soft: "var(--bg-soft)", label: "stateLocked" },
  available: { icon: PlayCircle, color: "var(--primary)", soft: "var(--primary-soft)", label: "stateAvailable" },
  inProgress: { icon: PlayCircle, color: "var(--gold)", soft: "var(--gold-soft)", label: "stateInProgress" },
  quizReady: { icon: ClipboardCheck, color: "var(--primary)", soft: "var(--primary-soft)", label: "stateQuizReady" },
  passed: { icon: CheckCircle2, color: "var(--jade)", soft: "var(--jade-soft)", label: "statePassed" },
  mastered: { icon: Award, color: "var(--jade)", soft: "var(--jade-soft)", label: "stateMastered" },
};

/* Props
   rows       chapterStates() for the subject (a row may also carry `canTestOut`, set by the screen that knows the topic
              scores, and `drillCount`, the chapter's formula-quiz question count, set by the same screen)
   labelOf    (chapterKey) -> the chapter's name in the student's language
   localize   (number, lang) -> the number in Khmer numerals when the language is Khmer
   onOpen     (chapterKey) open that chapter's exercises
   onDrill    optional: (chapterKey) start that chapter's quick Formula drill — offered even on a locked chapter, since it
              is pure review and touches no progress. Omitted entirely when a row carries no `drillCount`. */
export default function ChapterList({ rows, labelOf, lang = "en", localize = (n) => String(n), onOpen, onDrill }) {
  const km = lang === "km" ? "eai-km" : "";
  const w = (key, vars) => fillChapter(chapterText(lang, key), vars);
  const num = (n) => localize(n, lang);
  const [sheet, setSheet] = useState(null); // the locked row whose sheet is open
  const returnTo = useRef(null);            // the row that opened it, so focus goes back there
  const primary = useRef(null);

  const open = (row, el) => {
    if (row.state !== "locked") { onOpen(row.key); return; }
    returnTo.current = el;
    setSheet(row);
  };
  const close = () => { setSheet(null); returnTo.current?.focus?.({ preventScroll: true }); };

  useEffect(() => {
    if (!sheet) return undefined;
    primary.current?.focus({ preventScroll: true }); // the page must not jump when the sheet opens
    const onKey = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [sheet]); // eslint-disable-line react-hooks/exhaustive-deps

  const byKey = new Map(rows.map((r) => [r.key, r]));
  // Where a locked chapter's sheet sends the student: the nearest chapter before it that is open. For the first locked
  // chapter that is simply the chapter that blocks it; for one further along it is the chapter just before the first lock.
  const nextUp = (row) => { let j = row.index - 1; while (j > 0 && rows[j].state === "locked") j--; return rows[Math.max(0, j)]; };

  const lineFor = (row) => {
    const solved = w("rowSolved", { solved: num(row.solved), total: num(row.total) });
    const best = row.best != null ? w("rowBest", { best: num(row.best) }) : solved;
    const testOut = row.canTestOut ? ` · ${w("rowTestOut")}` : "";
    switch (row.state) {
      case "locked":
        return byKey.get(row.blockedBy)?.state === "locked" ? w("rowLockedDeeper") : w("rowLocked", { name: labelOf(row.blockedBy) });
      case "available": return `${w("rowExercises", { total: num(row.total) })}${testOut}`;
      case "inProgress": return `${solved} · ${w("rowToQuiz", { n: num(row.toQuiz) })}${testOut}`;
      case "quizReady": return `${solved} · ${w("rowQuizReady", { pass: num(PASS_PERCENT) })}`;
      case "passed": return `${best} · ${w("rowToMaster", { master: num(MASTER_PERCENT) })}`;
      default: return best;
    }
  };

  return (
    <>
      <div>
        <p className={`text-sm font-semibold flex items-center ${km}`} style={{ color: "var(--ink)" }}><RomdoulBlossom size={15} className="eai-romdoul-bullet" />{w("pathSummary", { n: num(chaptersPassed(rows)), total: num(rows.length) })}</p>
        <p className={`text-xs eai-muted mt-0.5 ${km}`}>{w("pathNote", { pass: num(PASS_PERCENT), master: num(MASTER_PERCENT) })}</p>
      </div>

      {/* The top margin is inline on purpose: a `margin: 0` here would cancel any margin class and glue the list to the note. */}
      <ol style={{ listStyle: "none", padding: 0, margin: "20px 0 0" }}>
        {rows.map((row, i) => {
          const look = LOOK[row.state];
          const Icon = look.icon;
          const locked = row.state === "locked";
          const last = i === rows.length - 1;
          return (
            <li key={row.key} className="flex gap-3">
              {/* The rail: a short line in from the previous chapter, the state icon, and a line down to the next one. The
                  line in is as tall as it takes to centre the icon on the card's title line (the card's padding is 16px on a
                  phone and 24px from 640px up, plus the 1px border and half of the 24px title line). */}
              <div className="flex flex-col items-center flex-shrink-0" style={{ width: 36 }} aria-hidden="true">
                <span className="h-[11px] sm:h-[19px] flex-shrink-0" style={{ width: 2, background: i === 0 ? "transparent" : "var(--line)" }} />
                <span className="grid place-items-center rounded-full flex-shrink-0" style={{ width: 36, height: 36, background: look.soft }}>
                  <Icon size={18} style={{ color: look.color }} />
                </span>
                {/* Light mode draws the connector as a Romdoul vine whose stage follows the chapter above it (a pale bud while locked, a
                    growing stem while open, a full blossom once passed); dark mode keeps the plain line. */}
                {!last && <span className="eai-rail-line flex-1" style={{ width: 2, minHeight: 14, background: "var(--line)" }} />}
                {!last && <RomdoulVine stage={row.state === "passed" || row.state === "mastered" ? "bloom" : row.state === "locked" ? "bud" : "grow"} />}
              </div>
              {/* A plain div, not a button, so the main "open chapter" button and the Formula drill button below it can
                  sit as two separate, independently focusable controls — a button cannot contain another button. */}
              {/* The hover effect belongs to the whole card (.eai-chapter): a border and shadow that fade in, nothing that moves. It used to
                  be .eai-tile on the button inside, which lifted that button 3px and gave it its own shadow *inside* the card,
                  so the title row jumped up and looked like a second card sitting on the first. */}
              <div className="eai-card eai-chapter flex-1 min-w-0" style={{ marginBottom: last ? 0 : 12, opacity: locked ? 0.85 : 1 }}>
                <button type="button" onClick={(e) => open(row, e.currentTarget)} aria-haspopup={locked ? "dialog" : undefined}
                  className="eai-chapter-open eai-focus text-left block w-full">
                  <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
                    <h3 className={`eai-display font-bold min-w-0 ${km}`} style={{ color: locked ? "var(--muted)" : "var(--ink)", overflowWrap: "anywhere" }}>{labelOf(row.key)}</h3>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${km}`}
                      style={row.state === "mastered" ? { background: "var(--jade)", color: "#fff" } : { background: look.soft, color: look.color }}>{w(look.label)}</span>
                  </div>
                  <p className={`text-xs eai-muted mt-1 ${km}`}>{lineFor(row)}</p>
                  {!locked && row.state !== "available" && (
                    <div className="relative h-1.5 rounded-full eai-soft mt-2.5 overflow-hidden" aria-hidden="true">
                      <div className="h-full rounded-full" style={{ width: `${row.percent}%`, background: row.state === "inProgress" ? "var(--gold)" : row.state === "quizReady" ? "var(--primary)" : "var(--jade)" }} />
                      <span className="absolute top-0 bottom-0" style={{ left: `${PASS_PERCENT}%`, width: 2, background: "var(--ink)", opacity: 0.35 }} />
                    </div>
                  )}
                </button>
                {onDrill && row.drillCount > 0 && (
                  <div className="mt-2.5">
                    <DrillButton count={row.drillCount} lang={lang} onStart={() => onDrill(row.key)} />
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {sheet && (() => {
        const target = nextUp(sheet);
        const direct = target.key === sheet.blockedBy;
        /* Shown in the middle of the screen the student is looking at, on every size, so it never needs a scroll to find.
           Two things make that hold. It is drawn through a portal into the app root instead of inside the page: the page
           wrapper carries the `rise` animation, and an element with a transform (even one that has finished) becomes the
           containing block of its `position: fixed` children, which sized this overlay to the whole page and left the sheet
           at the page's bottom, far below the chapter that was tapped. The app root (not document.body) is the host so the
           theme variables below still apply. And it is centred with a height cap, not stuck to the bottom edge. */
        const host = returnTo.current?.closest?.(".eai-root") ?? document.body;
        return createPortal(
          <div className="fixed inset-0 z-[150] flex items-center justify-center" onClick={close}
            style={{
              background: "rgba(10,10,30,.45)",
              padding: "max(1rem, env(safe-area-inset-top)) max(1rem, env(safe-area-inset-right)) max(1rem, env(safe-area-inset-bottom)) max(1rem, env(safe-area-inset-left))",
            }}>
            <div role="dialog" aria-modal="true" aria-labelledby="chapter-sheet-title" onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-3xl p-5 eai-rise overflow-y-auto"
              style={{ background: "var(--card)", color: "var(--ink)", maxHeight: "100%", boxShadow: "0 18px 50px rgba(10,10,30,.35)" }}>
              <div className="flex items-center gap-3">
                <span className="grid place-items-center rounded-full flex-shrink-0" style={{ width: 40, height: 40, background: "var(--bg-soft)" }}><Lock size={19} style={{ color: "var(--muted)" }} /></span>
                <div className="min-w-0">
                  <h2 id="chapter-sheet-title" className={`eai-display text-lg font-extrabold ${km}`}>{w("sheetTitle")}</h2>
                  <p className={`text-sm eai-muted ${km}`} style={{ overflowWrap: "anywhere" }}>{labelOf(sheet.key)}</p>
                </div>
              </div>
              <p className={`text-sm mt-4 leading-relaxed ${km}`}>
                {!direct
                  ? w("sheetBodyDeeper", { name: labelOf(target.key) })
                  : target.state === "quizReady"
                    ? w("sheetBodyQuiz", { pass: num(PASS_PERCENT), name: labelOf(target.key) })
                    : w("sheetBodySolve", { pass: num(PASS_PERCENT), name: labelOf(target.key), n: num(target.toQuiz) })}
              </p>
              <div className="mt-5 flex flex-col gap-2">
                <button ref={primary} type="button" onClick={() => { setSheet(null); onOpen(target.key); }}
                  className={`eai-btn eai-focus w-full py-3 text-sm ${km}`} style={{ background: "var(--primary)", color: "#fff" }}>{w("sheetGo", { name: labelOf(target.key) })}</button>
                <button type="button" onClick={close} className={`eai-btn eai-focus w-full py-3 text-sm eai-soft ${km}`} style={{ color: "var(--ink)" }}>{w("sheetClose")}</button>
              </div>
            </div>
          </div>,
          host,
        );
      })()}
    </>
  );
}
