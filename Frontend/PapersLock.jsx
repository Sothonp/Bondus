/* What a subject's exam-paper card shows instead of its Start / View buttons while the subject's chapters are not all
   passed: a lock, how far along the student is, and a way to the chapters. Pure presentation, like ChapterList.jsx.

   This locks the app's own links to the papers. The paper files themselves are public static files (anyone with the
   address can still open one), so this is a study order, not a security measure.

   Props
   passed, total  chapters passed so far, and how many the subject has
   onGo           take the student to Practice, where the chapters are */
import React from "react";
import { Lock, ChevronRight } from "lucide-react";
import { chapterText, fillChapter } from "./chapterStrings.js";

export default function PapersLock({ passed, total, lang = "en", localize = (n) => String(n), onGo }) {
  const km = lang === "km" ? "eai-km" : "";
  const w = (key, vars) => fillChapter(chapterText(lang, key), vars);
  return (
    <div className="mt-4 rounded-2xl p-3.5" style={{ background: "var(--bg-soft)" }} data-testid="papers-locked">
      <div className="flex items-start gap-2.5">
        <Lock size={17} className="flex-shrink-0 mt-0.5" style={{ color: "var(--muted)" }} aria-hidden="true" />
        <div className="min-w-0">
          <p className={`text-sm font-semibold ${km}`}>{w("papersLockedTitle")}</p>
          <p className={`text-xs eai-muted mt-0.5 ${km}`}>{w("papersLockedBody", { passed: localize(passed, lang), total: localize(total, lang) })}</p>
          <p className={`text-xs eai-muted mt-1 ${km}`}>{w("papersTiersNote")}</p>
        </div>
      </div>
      <button type="button" onClick={onGo} className={`eai-btn eai-focus eai-soft w-full mt-3 text-sm py-2.5 flex items-center justify-center gap-1.5 ${km}`} style={{ color: "var(--ink)" }}>
        {w("papersGo")} <ChevronRight size={15} />
      </button>
    </div>
  );
}
