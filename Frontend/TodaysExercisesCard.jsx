/* The dashboard's "Today's exercises" card: the exercises picked for the student (todaysExercises.js), each a roomy tappable
   row. Pure presentation, like WarmUpGate.jsx and PlanUi.jsx: App.jsx chooses the exercises, works out what is done and
   what the words are, and passes it all in; nothing is imported back from it.

   rows: [{ id, title, topic, difficulty, reason, reasonLabel, done }]. `text` holds the already-translated words. */
import React from "react";
import { CheckCircle2, Circle, ChevronRight } from "lucide-react";
import { RomdoulBlossom } from "./Romdoul.jsx";

export function TodaysExercisesCard({ rows, text, loading = false, lang = "en", onOpen, onMore }) {
  const km = lang === "km" ? "eai-km" : "";
  const done = rows.filter((r) => r.done).length;
  const allDone = rows.length > 0 && done === rows.length;
  return (
    <div className="eai-card lg:col-span-2" data-testid="todays-exercises">
      <div className="flex items-start justify-between gap-3 mb-1">
        <div className="flex items-center min-w-0">
          <RomdoulBlossom size={15} className="eai-romdoul-bullet" />
          <h3 className={`eai-display font-bold text-base ${km}`}>{text.title}</h3>
        </div>
        {rows.length > 0 && <span className={`text-xs font-bold flex-shrink-0 eai-display ${km}`} style={{ color: "var(--jade)" }}>{text.done(done, rows.length)}</span>}
      </div>
      <p className={`text-xs eai-muted mb-4 ${km}`}>{text.sub}</p>

      {rows.length > 0 && (
        <div className="h-1.5 rounded-full eai-soft mb-4 overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={rows.length} aria-valuenow={done}>
          <div className="h-full rounded-full" style={{ width: `${(done / rows.length) * 100}%`, background: "var(--jade)", transition: "width .3s" }} />
        </div>
      )}

      {loading && rows.length === 0 ? (
        <div className="eai-todo-list" aria-hidden="true">
          {[0, 1, 2].map((i) => <div key={i} className="eai-todo-row eai-todo-skeleton" />)}
        </div>
      ) : rows.length === 0 ? (
        <div className="eai-todo-empty">
          <p className={`text-sm eai-muted ${km}`}>{text.caughtUp}</p>
          <button type="button" onClick={onMore} className={`eai-btn eai-focus eai-todo-more ${km}`}>{text.openPractice}</button>
        </div>
      ) : (
        <ul className="eai-todo-list">
          {rows.map((r) => (
            <li key={r.id}>
              <button type="button" onClick={() => onOpen(r.id)} aria-label={`${text.openAria}: ${r.title}`} data-done={r.done ? "true" : "false"}
                className={`eai-todo-row eai-focus ${km}`}>
                <span className="eai-todo-mark" style={{ color: r.done ? "var(--jade)" : "var(--muted)" }}>
                  {r.done ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                </span>
                <span className="eai-todo-body">
                  <span className="eai-todo-title">{r.title}</span>
                  <span className="eai-todo-meta">
                    <span className={`eai-todo-chip eai-todo-chip--${r.reason}`}>{r.reasonLabel}</span>
                    <span>{[r.topic, r.difficulty].filter(Boolean).join(" · ")}</span>
                  </span>
                </span>
                <ChevronRight size={18} className="eai-muted flex-shrink-0" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {allDone && (
        <div className="eai-todo-empty">
          <p className={`text-sm font-semibold ${km}`} style={{ color: "var(--jade)" }}>{text.allDone}</p>
          <button type="button" onClick={onMore} className={`eai-btn eai-focus eai-todo-more ${km}`}>{text.more}</button>
        </div>
      )}
    </div>
  );
}
