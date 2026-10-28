/* Screens for timed exam attempts (rules and storage: examSessions.js). They take a translator `tr(key)` and the language
   from App.jsx, which owns the dictionaries, so nothing here is imported back from App. */
import React, { useRef, useState } from "react";
import { Timer, Camera, ImagePlus, X, CheckCircle2, School, Download, AlertTriangle, LoaderCircle, Users } from "lucide-react";
import { subjectLabel } from "./subjects.js";
import { formatClock, elapsedSeconds, remainingSeconds, minutesSpent, MAX_PHOTOS, reportToCsv } from "./examSessions.js";
import { shrinkImage } from "./imageUtils.js";

const KM_DIGITS = ["០", "១", "២", "៣", "៤", "៥", "៦", "៧", "៨", "៩"];
const loc = (v, lang) => (lang === "km" ? String(v).replace(/[0-9]/g, (d) => KM_DIGITS[d]) : String(v));
const kmc = (lang) => (lang === "km" ? "eai-km" : "");
const fill = (s, vars) => Object.entries(vars).reduce((acc, [k, v]) => acc.replace(`{${k}}`, v), s);
const btnPrimary = { background: "var(--primary)", color: "#fff" };
const errorText = (tr, code) => { const k = `examErr_${code}`; const s = tr(k); return s === k ? tr("examErr_generic") : s; };

/* The running clock: counts up from the server-style start time, shows the official time left (or how far over), and holds
   the Finish and Cancel buttons. Sticks under the header while the paper scrolls. */
export function ExamTimerBar({ session, now, lang, tr, onFinish, onCancel }) {
  const [asking, setAsking] = useState(false);
  const elapsed = elapsedSeconds(session, now);
  const left = remainingSeconds(session, now);
  const over = left < 0;
  const pct = Math.min(100, Math.round((elapsed / (session.limitMin * 60)) * 100));
  return (
    <div className="eai-card p-4 sticky z-[9]" style={{ top: 72, borderColor: over ? "var(--ember)" : undefined }} role="timer" data-testid="exam-timer-bar">
      <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-3">
        <div className="flex items-center gap-3">
          <span className="grid place-items-center rounded-2xl" style={{ width: 44, height: 44, background: over ? "var(--ember-soft)" : "var(--primary-soft)", color: over ? "var(--ember)" : "var(--primary)" }}><Timer size={22} /></span>
          <div>
            <p className={`text-xs eai-muted ${kmc(lang)}`}>{tr("examElapsed")}</p>
            <p className="eai-display text-2xl font-extrabold leading-none" style={{ fontVariantNumeric: "tabular-nums" }} data-testid="exam-clock">{loc(formatClock(elapsed), lang)}</p>
          </div>
        </div>
        <div className="min-w-0 flex-1" style={{ flexBasis: 200 }}>
          <p className={`text-sm font-semibold ${kmc(lang)}`} style={{ color: over ? "var(--ember)" : "var(--ink)" }}>
            {over ? `${tr("examOverBy")} ${loc(formatClock(left), lang)}` : `${loc(formatClock(left), lang)} ${tr("examLeft")}`}
          </p>
          <div className="h-1.5 rounded-full eai-soft overflow-hidden mt-1.5">
            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: over ? "var(--ember)" : "var(--primary)", transition: "width 1s linear" }} />
          </div>
          <p className={`text-xs eai-muted mt-1 ${kmc(lang)}`}>{tr("examOfficialTime")}: {loc(session.limitMin, lang)} {tr("minutesWord")}</p>
        </div>
        {asking ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-xs ${kmc(lang)}`}>{tr("examCancelAsk")}</span>
            <button onClick={onCancel} className={`eai-btn eai-focus text-sm py-2 px-3 ${kmc(lang)}`} style={{ background: "var(--ember)", color: "#fff" }}>{tr("examCancelYes")}</button>
            <button onClick={() => setAsking(false)} className={`eai-btn eai-focus text-sm py-2 px-3 eai-soft ${kmc(lang)}`}>{tr("examKeepGoing")}</button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button onClick={onFinish} data-testid="exam-finish" className={`eai-btn eai-focus text-sm py-2.5 px-4 flex items-center gap-1.5 ${kmc(lang)}`} style={btnPrimary}><Camera size={15} /> {tr("examFinishBtn")}</button>
            <button onClick={() => setAsking(true)} className={`eai-focus text-xs eai-muted px-2 py-2 hover:underline ${kmc(lang)}`}>{tr("examCancelBtn")}</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* Adding the photos of the answer sheets and sending them. The clock keeps running until Submit. */
export function SubmitSheet({ session, lang, tr, onAdd, onRemove, onSubmit, onBack }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const camRef = useRef(null);
  const galRef = useRef(null);
  const count = session.photos.length;

  const pick = async (e) => {
    const files = [...(e.target.files ?? [])];
    e.target.value = "";
    if (!files.length) return;
    setError(""); setBusy(true);
    let have = count;
    try {
      for (const file of files) {
        if (have >= MAX_PHOTOS) { setError(errorText(tr, "too_many_photos")); break; }
        let shrunk;
        try { shrunk = await shrinkImage(file); } catch (err) { setError(errorText(tr, err?.message)); continue; }
        const res = onAdd({ thumb: shrunk.thumb, w: shrunk.w, h: shrunk.h, bytes: shrunk.bytes });
        if (res.error) { setError(errorText(tr, res.error)); break; }
        have += 1;
      }
    } finally { setBusy(false); }
  };
  const submit = () => { setError(""); const res = onSubmit(); if (res?.error) setError(errorText(tr, res.error)); };

  return (
    <div className="space-y-5 eai-rise" data-testid="exam-submit-sheet">
      <div>
        <h2 className={`eai-display text-2xl font-extrabold ${kmc(lang)}`}>{tr("examSubmitTitle")}</h2>
        <p className={`eai-muted text-sm mt-1 ${kmc(lang)}`}>{tr("examSubmitDesc")}</p>
      </div>
      <div className="eai-card p-5 space-y-4">
        <div className="flex flex-wrap gap-2.5">
          <button onClick={() => camRef.current?.click()} disabled={busy || count >= MAX_PHOTOS} className={`eai-btn eai-focus text-sm py-2.5 px-4 flex items-center gap-1.5 disabled:opacity-50 ${kmc(lang)}`} style={btnPrimary}><Camera size={16} /> {tr("examTakePhoto")}</button>
          <button onClick={() => galRef.current?.click()} disabled={busy || count >= MAX_PHOTOS} className={`eai-btn eai-glass eai-focus text-sm py-2.5 px-4 flex items-center gap-1.5 disabled:opacity-50 ${kmc(lang)}`}><ImagePlus size={16} /> {tr("examChoosePhoto")}</button>
          {/* capture opens the camera on phones; on a computer it just opens the file picker */}
          <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={pick} data-testid="exam-camera-input" />
          <input ref={galRef} type="file" accept="image/*" multiple className="hidden" onChange={pick} data-testid="exam-gallery-input" />
        </div>
        <p className={`text-xs eai-muted flex items-center gap-1.5 ${kmc(lang)}`} aria-live="polite">
          {busy ? <><LoaderCircle size={13} className="animate-spin" /> {tr("examPreparing")}</> : fill(tr("examPhotosCount"), { n: loc(count, lang), max: loc(MAX_PHOTOS, lang) })}
        </p>
        {count > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5" data-testid="exam-thumbs">
            {session.photos.map((p, i) => (
              <div key={i} className="relative rounded-xl overflow-hidden border" style={{ borderColor: "var(--line)", aspectRatio: "3 / 4", background: "var(--bg-soft)" }}>
                <img src={p.thumb} alt={`${i + 1}`} className="w-full h-full object-cover" />
                <button onClick={() => onRemove(i)} aria-label={tr("examRemovePhoto")} title={tr("examRemovePhoto")} className="eai-focus absolute top-1 right-1 grid place-items-center rounded-full" style={{ width: 24, height: 24, background: "rgba(0,0,0,.6)", color: "#fff" }}><X size={14} /></button>
              </div>
            ))}
          </div>
        )}
        {error && <p className={`eai-ob-error flex items-center gap-1.5 ${kmc(lang)}`} role="alert"><AlertTriangle size={13} /> {error}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={submit} disabled={busy || count === 0} data-testid="exam-submit" className={`eai-btn eai-focus text-sm py-3 px-5 flex items-center gap-1.5 disabled:opacity-50 ${kmc(lang)}`} style={btnPrimary}><CheckCircle2 size={16} /> {tr("examSubmitBtn")}</button>
        <button onClick={onBack} className={`eai-focus text-sm eai-muted hover:underline ${kmc(lang)}`}>{tr("examBackToPaper")}</button>
      </div>
    </div>
  );
}

/* Shown right after a successful submit. */
export function ExamResultCard({ session, lang, tr, onDone }) {
  const mins = minutesSpent(session);
  return (
    <div className="max-w-md mx-auto eai-rise" data-testid="exam-result">
      <div className="eai-card p-8 text-center">
        <div className="inline-grid place-items-center rounded-2xl mb-3" style={{ width: 56, height: 56, background: "var(--jade-soft)" }}><CheckCircle2 size={28} style={{ color: "var(--jade)" }} /></div>
        <h2 className={`eai-display text-2xl font-extrabold ${kmc(lang)}`}>{tr("examDoneTitle")}</h2>
        <p className={`eai-muted text-sm mt-1 ${kmc(lang)}`}>{subjectLabel(session.subject, lang)} · {loc(session.year, lang)}</p>
        <p className={`text-sm mt-5 eai-muted ${kmc(lang)}`}>{tr("examDoneSpent")}</p>
        <p className="eai-display text-5xl font-extrabold mt-1" style={{ color: "var(--primary)" }} data-testid="exam-result-minutes">{loc(mins, lang)}</p>
        <p className={`text-sm font-semibold ${kmc(lang)}`}>{tr("minutesWord")}</p>
        <p className={`text-xs eai-muted mt-4 ${kmc(lang)}`}>{tr("examOfficialTime")}: {loc(session.limitMin, lang)} {tr("minutesWord")} · {tr("examDonePhotos")}: {loc(session.photos.length, lang)}</p>
        <button onClick={onDone} className={`eai-btn eai-focus text-sm py-3 px-5 mt-6 w-full ${kmc(lang)}`} style={btnPrimary}>{tr("examDoneBack")}</button>
      </div>
    </div>
  );
}

/* Header chip while an attempt is running; click goes back to the papers. */
export function RunningChip({ session, now, lang, onClick }) {
  return (
    <button onClick={onClick} className="eai-btn eai-focus hidden sm:flex items-center gap-1.5 px-3 text-sm font-bold" data-testid="exam-chip"
      style={{ height: 38, background: "var(--primary-soft)", color: "var(--primary)", fontVariantNumeric: "tabular-nums" }}>
      <Timer size={15} /> {loc(formatClock(elapsedSeconds(session, now)), lang)}
    </button>
  );
}

/* Joining a school with a code: look the code up, show what the school will see, then confirm. */
export function JoinSchoolCard({ school, lang, tr, lookup, onJoin, onLeave, hint }) {
  const [code, setCode] = useState("");
  const [found, setFound] = useState(null);
  const [error, setError] = useState("");
  const check = () => { const s = lookup(code); if (s) { setFound(s); setError(""); } else setError(tr("schoolBadCode")); };

  if (school) {
    return (
      <div className="eai-card p-4 flex flex-wrap items-center justify-between gap-3" data-testid="school-joined">
        <div className="flex items-center gap-3 min-w-0">
          <span className="grid place-items-center rounded-2xl" style={{ width: 40, height: 40, background: "var(--jade-soft)", color: "var(--jade)" }}><School size={20} /></span>
          <div className="min-w-0">
            <p className={`text-xs eai-muted ${kmc(lang)}`}>{tr("schoolYours")}</p>
            <p className="font-bold truncate">{school.name} <span className="eai-muted font-medium text-xs">({school.code})</span></p>
          </div>
        </div>
        <button onClick={onLeave} className={`eai-focus text-xs eai-muted hover:underline ${kmc(lang)}`}>{tr("schoolLeaveBtn")}</button>
      </div>
    );
  }
  if (found) {
    return (
      <div className="eai-card p-5 space-y-3" data-testid="school-confirm">
        <h3 className={`eai-display font-bold ${kmc(lang)}`}>{fill(tr("schoolConfirmTitle"), { name: found.name })}</h3>
        <p className={`text-sm ${kmc(lang)}`}>{tr("schoolSees")}</p>
        <p className={`text-xs eai-muted ${kmc(lang)}`}>{tr("schoolLeaveAnytime")}</p>
        <div className="flex gap-2">
          <button onClick={() => { onJoin(found.code); setFound(null); setCode(""); }} data-testid="school-confirm-yes" className={`eai-btn eai-focus text-sm py-2.5 px-4 ${kmc(lang)}`} style={btnPrimary}>{tr("schoolConfirmBtn")}</button>
          <button onClick={() => setFound(null)} className={`eai-btn eai-focus text-sm py-2.5 px-4 eai-soft ${kmc(lang)}`}>{tr("notNowWord")}</button>
        </div>
      </div>
    );
  }
  return (
    <div className="eai-card p-4" data-testid="school-join">
      <div className="flex items-center gap-2 mb-1"><School size={17} style={{ color: "var(--primary)" }} /><h3 className={`eai-display font-bold ${kmc(lang)}`}>{tr("schoolJoinTitle")}</h3></div>
      <p className={`text-xs eai-muted mb-3 ${kmc(lang)}`}>{tr("schoolJoinDesc")}</p>
      <div className="flex gap-2">
        <input className="eai-ob-input eai-focus flex-1 min-w-0" value={code} onChange={(e) => { setCode(e.target.value); setError(""); }} onKeyDown={(e) => { if (e.key === "Enter" && code.trim()) check(); }}
          placeholder={tr("schoolCodePlaceholder")} aria-label={tr("schoolCodePlaceholder")} autoCapitalize="characters" data-testid="school-code-input" />
        <button onClick={check} disabled={!code.trim()} data-testid="school-code-go" className={`eai-btn eai-focus text-sm px-4 disabled:opacity-50 ${kmc(lang)}`} style={btnPrimary}>{tr("schoolJoinBtn")}</button>
      </div>
      {error && <p className={`eai-ob-error mt-2 ${kmc(lang)}`} role="alert">{error}</p>}
      {hint && <p className="text-xs eai-muted mt-2">{hint}</p>}
    </div>
  );
}

function downloadCsv(school, rows) {
  const blob = new Blob([reportToCsv(school, rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `bondus-${school.code}-report.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/* What a school sees: totals, the average minutes on each paper, and every attempt (with the photos). */
export function SchoolReportPage({ report, lang, tr, onLoadSample, onClearSample }) {
  const [viewing, setViewing] = useState(null);
  const { school, rows } = report;

  if (!school) {
    return (
      <div className="space-y-5 eai-rise">
        <h2 className={`eai-display text-2xl font-extrabold ${kmc(lang)}`}>{tr("reportTitle")}</h2>
        <div className="eai-card p-6 flex items-center gap-3"><School size={22} className="eai-muted" /><p className={`text-sm ${kmc(lang)}`}>{tr("reportNoSchool")}</p></div>
      </div>
    );
  }

  const done = rows.filter((r) => r.minutes != null);
  const avg = done.length ? Math.round(done.reduce((a, r) => a + r.minutes, 0) / done.length) : null;
  const students = new Set(rows.map((r) => r.student)).size;
  const hasSample = rows.some((r) => r.sample);
  const perPaper = [...done.reduce((m, r) => {
    const k = `${r.subject}|${r.year}`;
    const e = m.get(k) ?? { subject: r.subject, year: r.year, limitMin: r.limitMin, total: 0, n: 0 };
    e.total += r.minutes; e.n += 1; m.set(k, e); return m;
  }, new Map()).values()].sort((a, b) => a.subject.localeCompare(b.subject) || b.year - a.year);

  return (
    <div className="space-y-5 eai-rise" data-testid="school-report">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className={`eai-display text-2xl font-extrabold ${kmc(lang)}`}>{tr("reportTitle")}</h2>
          <p className="eai-muted text-sm mt-1">{school.name} · {school.code}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {hasSample
            ? <button onClick={onClearSample} className={`eai-btn eai-focus text-sm py-2 px-3 eai-soft ${kmc(lang)}`}>{tr("reportClearSample")}</button>
            : <button onClick={onLoadSample} data-testid="report-load-sample" className={`eai-btn eai-glass eai-focus text-sm py-2 px-3 flex items-center gap-1.5 ${kmc(lang)}`}><Users size={14} /> {tr("reportLoadSample")}</button>}
          <button onClick={() => downloadCsv(school, rows)} disabled={!rows.length} data-testid="report-csv" className={`eai-btn eai-focus text-sm py-2 px-3 flex items-center gap-1.5 disabled:opacity-50 ${kmc(lang)}`} style={btnPrimary}><Download size={14} /> {tr("reportDownloadCsv")}</button>
        </div>
      </div>

      {hasSample && <p className={`text-xs px-3 py-2 rounded-xl ${kmc(lang)}`} style={{ background: "var(--gold-soft)", color: "var(--gold)" }} data-testid="report-sample-note">{tr("reportSampleNote")}</p>}

      <div className="grid grid-cols-3 gap-3">
        {[[tr("reportAttempts"), rows.length], [tr("reportStudents"), students], [tr("reportAvgMin"), avg ?? "—"]].map(([label, value]) => (
          <div key={label} className="eai-card p-4 text-center">
            <p className="eai-display text-2xl font-extrabold" data-testid={`report-stat-${label}`}>{typeof value === "number" ? loc(value, lang) : value}</p>
            <p className={`text-xs eai-muted mt-0.5 ${kmc(lang)}`}>{label}</p>
          </div>
        ))}
      </div>

      {perPaper.length > 0 && (
        <div className="eai-card p-5">
          <h3 className={`eai-display font-bold mb-3 ${kmc(lang)}`}>{tr("reportPerPaper")}</h3>
          <div className="space-y-3">
            {perPaper.map((p) => {
              const mean = Math.round(p.total / p.n);
              return (
                <div key={`${p.subject}${p.year}`}>
                  <div className="flex items-center justify-between text-sm gap-2">
                    <span className={`font-semibold truncate ${kmc(lang)}`}>{subjectLabel(p.subject, lang)} · {loc(p.year, lang)}</span>
                    <span className={`text-xs eai-muted flex-shrink-0 ${kmc(lang)}`}>{loc(mean, lang)} / {loc(p.limitMin, lang)} {tr("minutesWord")} · {loc(p.n, lang)} {tr(p.n === 1 ? "reportStudentOne" : "reportStudentsWord")}</span>
                  </div>
                  <div className="h-2 rounded-full eai-soft overflow-hidden mt-1"><div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.round((mean / p.limitMin) * 100))}%`, background: mean > p.limitMin ? "var(--ember)" : "var(--primary)" }} /></div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="eai-card overflow-x-auto">
        {rows.length === 0 ? <p className={`p-6 text-sm eai-muted ${kmc(lang)}`}>{tr("reportEmpty")}</p> : (
          <table className="w-full text-sm" data-testid="report-table">
            <thead>
              <tr className={`text-left text-xs eai-muted ${kmc(lang)}`}>
                {["reportStudentCol", "reportGradeCol", "reportPaperCol", "reportMinutesCol", "reportStatusCol", "reportPhotosCol"].map((k) => <th key={k} className="px-4 py-3 font-semibold whitespace-nowrap">{tr(k)}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t" style={{ borderColor: "var(--line)" }}>
                  <td className="px-4 py-3 whitespace-nowrap font-semibold">{r.student}{r.sample && <span className={`ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${kmc(lang)}`} style={{ background: "var(--gold-soft)", color: "var(--gold)" }}>{tr("reportSampleBadge")}</span>}</td>
                  <td className="px-4 py-3">{loc(r.grade, lang)}</td>
                  <td className={`px-4 py-3 whitespace-nowrap ${kmc(lang)}`}>{subjectLabel(r.subject, lang)} · {loc(r.year, lang)}</td>
                  <td className="px-4 py-3 font-bold" style={{ fontVariantNumeric: "tabular-nums" }}>{r.minutes != null ? loc(r.minutes, lang) : "—"}</td>
                  <td className={`px-4 py-3 ${kmc(lang)}`} style={{ color: r.status === "submitted" ? "var(--jade)" : "var(--muted)" }}>{tr(`reportStatus_${r.status}`)}</td>
                  <td className="px-4 py-3">
                    {r.thumbs.length > 0
                      ? <button onClick={() => setViewing(r)} className={`eai-focus underline text-xs ${kmc(lang)}`} style={{ color: "var(--primary)" }}>{loc(r.photos, lang)} · {tr("reportViewPhotos")}</button>
                      : loc(r.photos, lang)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {viewing && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4" style={{ background: "rgba(0,0,0,.6)" }} role="dialog" aria-modal="true" onClick={() => setViewing(null)}>
          <div className="eai-card p-5 w-full overflow-y-auto" style={{ maxWidth: 720, maxHeight: "90vh" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <p className={`font-bold ${kmc(lang)}`}>{viewing.student} · {subjectLabel(viewing.subject, lang)} {loc(viewing.year, lang)}</p>
              <button onClick={() => setViewing(null)} className="eai-focus" aria-label={tr("reportClose")}><X size={20} /></button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {viewing.thumbs.map((src, i) => <img key={i} src={src} alt={`${i + 1}`} className="w-full rounded-xl border" style={{ borderColor: "var(--line)" }} />)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
