/* The "Formula sheet" screen: a compact, read-only list of every formula taught in one chapter, for a quick
   glance before or after the Formula drill (FormulaDrill.jsx) — no questions, nothing graded, nothing saved, so
   it is open for any chapter, including one still locked on the student's path. Same review-only guarantee as
   the drill, just without the quiz: a student checking a formula is never blocked by progress, and nothing here
   can touch progress either.

   Pure presentation, like FormulaDrill.jsx: the list itself comes from formulaSheet.js, the words from
   chapterStrings.js, and the caller (PracticeSubject in App.jsx) hands in the chapter's question list. */
import React from "react";
import { ChevronLeft, BookOpen } from "lucide-react";
import { chapterFormulas } from "./formulaSheet.js";
import { chapterText, fillChapter } from "./chapterStrings.js";

const words = (lang) => (key, vars) => fillChapter(chapterText(lang, key), vars);

/* The small entry point shown next to a chapter row (beside the Formula drill button), offering this chapter's
   formula sheet — enabled even when the chapter itself is locked, since it is pure review. Hidden when the
   chapter has no formulas at all. Stops the tap from reaching the row underneath it (opening the chapter, or
   its locked sheet). Props
     count   how many distinct formulas the chapter has, so the button can hide itself when there are none
     onStart open the sheet for this chapter */
export function SheetButton({ count, lang = "en", onStart }) {
  if (!count) return null;
  const km = lang === "km" ? "eai-km" : "";
  const w = words(lang);
  return (
    <button type="button" onClick={(e) => { e.stopPropagation(); onStart(); }}
      className={`eai-focus flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-full flex-shrink-0 ${km}`}
      style={{ background: "var(--primary-soft)", color: "var(--primary)" }}>
      <BookOpen size={13} /> {w("formulaSheetButton")}
    </button>
  );
}

/* The sheet itself. Props
   chapterName  the chapter's localized name, shown as the screen's title
   list         the subject's full localized exercise list (PracticeSubject already has it) — the chapter's
                formulas are drawn from it
   chapterKey   the stable English chapter key
   onExit       leave the sheet, back to the chapter list */
export default function FormulaSheet({ chapterName, list, chapterKey, lang = "en", onExit }) {
  const km = lang === "km" ? "eai-km" : "";
  const w = words(lang);
  const formulas = chapterFormulas(list, chapterKey);
  if (formulas.length === 0) return null; // nothing to show — SheetButton already hides itself

  return (
    <div className="space-y-4 eai-rise">
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={onExit} className={`eai-focus flex items-center gap-1 text-sm eai-muted ${km}`}><ChevronLeft size={16} /> {w("resultBack")}</button>
        <p className={`text-xs font-semibold eai-muted min-w-0 truncate flex items-center gap-1 ${km}`}><BookOpen size={12} style={{ color: "var(--primary)" }} /> {w("formulaSheetButton")}</p>
      </div>

      <div className="eai-card">
        <h2 className={`eai-display text-lg font-extrabold ${km}`} style={{ overflowWrap: "anywhere" }}>{chapterName}</h2>
        <ul className="mt-3 space-y-3" style={{ listStyle: "none", padding: 0 }}>
          {formulas.map((f, i) => (
            <li key={i} className="p-3 rounded-2xl eai-soft">
              <p className={`text-xs eai-muted ${km}`}>{lang === "km" ? f.topicKm : f.topic}</p>
              <p className="text-sm font-mono leading-relaxed mt-0.5" style={{ overflowWrap: "anywhere" }}>{lang === "km" ? f.formulaKm : f.formula}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
