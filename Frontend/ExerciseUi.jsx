/* Screens for teacher-posted exercises (rules: exerciseSessions.js, network: useExerciseSessions.js).
   Same split as ExamSessionUi.jsx: pure presentational pieces, a translator `tr(key)` and `lang`
   passed in from App.jsx, nothing imported back from App. */
import React, { useRef, useState } from "react";
import { Timer, Camera, ImagePlus, X, CheckCircle2, AlertTriangle, LoaderCircle, MessageCircle, Send, Plus, Users, Paperclip, FileText } from "lucide-react";
import { formatClock, elapsedSeconds, remainingSeconds, MAX_PHOTOS, MAX_EXERCISE_ATTACHMENTS } from "./exerciseSessions.js";
import { shrinkImage } from "./imageUtils.js";

const KM_DIGITS = ["០", "១", "២", "៣", "៤", "៥", "៦", "៧", "៨", "៩"];
const loc = (v, lang) => (lang === "km" ? String(v).replace(/[0-9]/g, (d) => KM_DIGITS[d]) : String(v));
const kmc = (lang) => (lang === "km" ? "eai-km" : "");
const fill = (s, vars) => Object.entries(vars).reduce((acc, [k, v]) => acc.replace(`{${k}}`, v), s);
const btnPrimary = { background: "var(--primary)", color: "#fff" };
const errorText = (tr, code) => { const k = `exErr_${code}`; const s = tr(k); return s === k ? tr("exErr_generic") : s; };

/** The running clock. An untimed exercise (timeLimitMinutes null) just counts up, no progress bar. */
export function ExerciseTimerBar({ submission, timeLimitMinutes, now, lang, tr, onFinish, onCancel }) {
  const [asking, setAsking] = useState(false);
  const elapsed = elapsedSeconds(submission, timeLimitMinutes, now);
  const left = timeLimitMinutes != null ? remainingSeconds(submission, timeLimitMinutes, now) : null;
  const over = left != null && left < 0;
  const pct = timeLimitMinutes != null ? Math.min(100, Math.round((elapsed / (timeLimitMinutes * 60)) * 100)) : null;
  return (
    <div className="eai-card p-4 sticky z-[9]" style={{ top: 72, borderColor: over ? "var(--ember)" : undefined }} role="timer">
      <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-3">
        <div className="flex items-center gap-3">
          <span className="grid place-items-center rounded-2xl" style={{ width: 44, height: 44, background: over ? "var(--ember-soft)" : "var(--primary-soft)", color: over ? "var(--ember)" : "var(--primary)" }}><Timer size={22} /></span>
          <div>
            <p className={`text-xs eai-muted ${kmc(lang)}`}>{tr("exElapsed")}</p>
            <p className="eai-display text-2xl font-extrabold leading-none" style={{ fontVariantNumeric: "tabular-nums" }}>{loc(formatClock(elapsed), lang)}</p>
          </div>
        </div>
        {left != null && (
          <div className="min-w-0 flex-1" style={{ flexBasis: 200 }}>
            <p className={`text-sm font-semibold ${kmc(lang)}`} style={{ color: over ? "var(--ember)" : "var(--ink)" }}>
              {over ? `${tr("exOverBy")} ${loc(formatClock(left), lang)}` : `${loc(formatClock(left), lang)} ${tr("exLeft")}`}
            </p>
            <div className="h-1.5 rounded-full eai-soft overflow-hidden mt-1.5">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: over ? "var(--ember)" : "var(--primary)", transition: "width 1s linear" }} />
            </div>
          </div>
        )}
        {asking ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-xs ${kmc(lang)}`}>{tr("exCancelAsk")}</span>
            <button onClick={onCancel} className={`eai-btn eai-focus text-sm py-2 px-3 ${kmc(lang)}`} style={{ background: "var(--ember)", color: "#fff" }}>{tr("exCancelYes")}</button>
            <button onClick={() => setAsking(false)} className={`eai-btn eai-focus text-sm py-2 px-3 eai-soft ${kmc(lang)}`}>{tr("exKeepGoing")}</button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button onClick={onFinish} className={`eai-btn eai-focus text-sm py-2.5 px-4 flex items-center gap-1.5 ${kmc(lang)}`} style={btnPrimary}><Camera size={15} /> {tr("exFinishBtn")}</button>
            <button onClick={() => setAsking(true)} className={`eai-focus text-xs eai-muted px-2 py-2 hover:underline ${kmc(lang)}`}>{tr("exCancelBtn")}</button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Adding photos of the work and sending it. Each pick awaits a real upload (server-backed, unlike the exam timer's local store). */
export function ExerciseSubmitSheet({ submission, lang, tr, onAdd, onRemove, onSubmit, onBack }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const camRef = useRef(null);
  const galRef = useRef(null);
  const photos = submission?.photos ?? [];
  const count = photos.length;

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
        try {
          await onAdd(new File([shrunk.blob], `photo-${Date.now()}.jpg`, { type: "image/jpeg" }));
        } catch (err) { setError(errorText(tr, err?.code ?? "generic")); break; }
        have += 1;
      }
    } finally { setBusy(false); }
  };

  const submit = async () => {
    setError("");
    try { await onSubmit(); } catch (err) { setError(errorText(tr, err?.code ?? "generic")); }
  };

  return (
    <div className="space-y-5 eai-rise">
      <div>
        <h2 className={`eai-display text-2xl font-extrabold ${kmc(lang)}`}>{tr("exSubmitTitle")}</h2>
        <p className={`eai-muted text-sm mt-1 ${kmc(lang)}`}>{tr("exSubmitDesc")}</p>
      </div>
      <div className="eai-card p-5 space-y-4">
        <div className="flex flex-wrap gap-2.5">
          <button onClick={() => camRef.current?.click()} disabled={busy || count >= MAX_PHOTOS} className={`eai-btn eai-focus text-sm py-2.5 px-4 flex items-center gap-1.5 disabled:opacity-50 ${kmc(lang)}`} style={btnPrimary}><Camera size={16} /> {tr("exTakePhoto")}</button>
          <button onClick={() => galRef.current?.click()} disabled={busy || count >= MAX_PHOTOS} className={`eai-btn eai-glass eai-focus text-sm py-2.5 px-4 flex items-center gap-1.5 disabled:opacity-50 ${kmc(lang)}`}><ImagePlus size={16} /> {tr("exChoosePhoto")}</button>
          <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={pick} />
          <input ref={galRef} type="file" accept="image/*" multiple className="hidden" onChange={pick} />
        </div>
        <p className={`text-xs eai-muted flex items-center gap-1.5 ${kmc(lang)}`} aria-live="polite">
          {busy ? <><LoaderCircle size={13} className="animate-spin" /> {tr("exUploading")}</> : fill(tr("exPhotosCount"), { n: loc(count, lang), max: loc(MAX_PHOTOS, lang) })}
        </p>
        {count > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
            {photos.map((p) => (
              <div key={p.id} className="relative rounded-xl overflow-hidden border" style={{ borderColor: "var(--line)", aspectRatio: "3 / 4", background: "var(--bg-soft)" }}>
                <img src={p.url} alt="" className="w-full h-full object-cover" />
                <button onClick={() => onRemove(p.id)} aria-label={tr("exRemovePhoto")} title={tr("exRemovePhoto")} className="eai-focus absolute top-1 right-1 grid place-items-center rounded-full" style={{ width: 24, height: 24, background: "rgba(0,0,0,.6)", color: "#fff" }}><X size={14} /></button>
              </div>
            ))}
          </div>
        )}
        {error && <p className={`eai-ob-error flex items-center gap-1.5 ${kmc(lang)}`} role="alert"><AlertTriangle size={13} /> {error}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={submit} disabled={busy || count === 0} className={`eai-btn eai-focus text-sm py-3 px-5 flex items-center gap-1.5 disabled:opacity-50 ${kmc(lang)}`} style={btnPrimary}><CheckCircle2 size={16} /> {tr("exSubmitBtn")}</button>
        <button onClick={onBack} className={`eai-focus text-sm eai-muted hover:underline ${kmc(lang)}`}>{tr("exBackToExercise")}</button>
      </div>
    </div>
  );
}

/** Shown right after a successful submit, including any teacher comments once they arrive. */
export function ExerciseResultCard({ exercise, submission, lang, tr, onDone }) {
  return (
    <div className="max-w-md mx-auto eai-rise">
      <div className="eai-card p-8 text-center">
        <div className="inline-grid place-items-center rounded-2xl mb-3" style={{ width: 56, height: 56, background: "var(--jade-soft)" }}><CheckCircle2 size={28} style={{ color: "var(--jade)" }} /></div>
        <h2 className={`eai-display text-2xl font-extrabold ${kmc(lang)}`}>{tr("exDoneTitle")}</h2>
        <p className={`eai-muted text-sm mt-1 ${kmc(lang)}`}>{exercise.title}</p>
        <p className={`text-xs eai-muted mt-4 ${kmc(lang)}`}>{tr("exDonePhotos")}: {loc(submission.photos.length, lang)}</p>
        <button onClick={onDone} className={`eai-btn eai-focus text-sm py-3 px-5 mt-6 w-full ${kmc(lang)}`} style={btnPrimary}>{tr("exDoneBack")}</button>
      </div>
      {submission.comments?.length > 0 && (
        <div className="eai-card p-5 mt-4 space-y-3">
          <p className={`text-sm font-bold flex items-center gap-1.5 ${kmc(lang)}`}><MessageCircle size={15} /> {tr("exTeacherComments")}</p>
          {submission.comments.map((c) => (
            <div key={c.id} className="p-3 rounded-xl eai-soft">
              <p className="text-xs font-semibold" style={{ color: "var(--primary)" }}>{c.teacherName}</p>
              <p className="text-sm mt-0.5">{c.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** One row in a student's "browse exercises" list. */
export function ExerciseListCard({ exercise, lang, tr, onOpen }) {
  return (
    <button onClick={onOpen} className="eai-card eai-tile eai-focus p-4 w-full text-left flex items-center gap-3">
      <span className="grid place-items-center rounded-2xl flex-shrink-0" style={{ width: 44, height: 44, background: "var(--primary-soft)", color: "var(--primary)" }}><Timer size={20} /></span>
      <div className="min-w-0 flex-1">
        <p className="font-bold truncate">{exercise.title}</p>
        <p className={`text-xs eai-muted truncate ${kmc(lang)}`}>{exercise.teacherName}{exercise.timeLimitMinutes ? ` · ${loc(exercise.timeLimitMinutes, lang)} ${tr("minutesWord")}` : ""}</p>
      </div>
    </button>
  );
}

/** One attachment: an image shown inline, a PDF as a clickable icon+name. onRemove omitted means read-only. */
export function ExerciseAttachmentThumb({ attachment, tr, onRemove }) {
  const isPdf = attachment.mimeType === "application/pdf";
  return (
    <div className="relative rounded-xl overflow-hidden border" style={{ borderColor: "var(--line)", aspectRatio: "3 / 4", background: "var(--bg-soft)" }}>
      {isPdf ? (
        <a href={attachment.url} target="_blank" rel="noreferrer" className="w-full h-full flex flex-col items-center justify-center gap-1 text-center p-1.5">
          <FileText size={22} />
          <span className="text-[10px] truncate w-full px-1">{attachment.name || "PDF"}</span>
        </a>
      ) : (
        <a href={attachment.url} target="_blank" rel="noreferrer"><img src={attachment.url} alt="" className="w-full h-full object-cover" /></a>
      )}
      {onRemove && (
        <button onClick={onRemove} aria-label={tr("exRemovePhoto")} title={tr("exRemovePhoto")} className="eai-focus absolute top-1 right-1 grid place-items-center rounded-full" style={{ width: 24, height: 24, background: "rgba(0,0,0,.6)", color: "#fff" }}><X size={14} /></button>
      )}
    </div>
  );
}

/** Create a posted exercise (teacher only): title/instructions/time limit, then -- once saved -- attach a
    picture or PDF of the exercise itself for students to see. */
export function TeacherExerciseForm({ initial, lang, tr, onSave, onAddAttachment, onRemoveAttachment, onDone, onCancel }) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [instructions, setInstructions] = useState(initial?.instructions ?? "");
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(initial?.timeLimitMinutes ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [exercise, setExercise] = useState(null); // set once saved -- switches the form to the attachments step
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const save = async () => {
    setError("");
    if (!title.trim() || !instructions.trim()) { setError(tr("exFormRequired")); return; }
    setBusy(true);
    try {
      const saved = await onSave({ title: title.trim(), instructions: instructions.trim(), timeLimitMinutes: timeLimitMinutes ? Number(timeLimitMinutes) : null });
      setExercise(saved);
      setAttachments(saved.attachments ?? []);
    } catch (err) {
      setError(errorText(tr, err?.code ?? "generic"));
    } finally { setBusy(false); }
  };

  const pickFiles = async (e) => {
    const files = [...(e.target.files ?? [])];
    e.target.value = "";
    if (!files.length) return;
    setError(""); setUploading(true);
    let have = attachments.length;
    try {
      for (const file of files) {
        if (have >= MAX_EXERCISE_ATTACHMENTS) { setError(errorText(tr, "too_many_attachments")); break; }
        let toUpload = file;
        if (file.type.startsWith("image/")) {
          try {
            const shrunk = await shrinkImage(file);
            toUpload = new File([shrunk.blob], file.name || `exercise-${Date.now()}.jpg`, { type: "image/jpeg" });
          } catch (err) { setError(errorText(tr, err?.message)); continue; }
        }
        try {
          const attachment = await onAddAttachment(exercise.id, toUpload);
          setAttachments((list) => [...list, attachment]);
        } catch (err) { setError(errorText(tr, err?.code ?? "generic")); break; }
        have += 1;
      }
    } finally { setUploading(false); }
  };

  const removeAttachment = async (id) => {
    setError("");
    try { await onRemoveAttachment(exercise.id, id); setAttachments((list) => list.filter((a) => a.id !== id)); }
    catch (err) { setError(errorText(tr, err?.code ?? "generic")); }
  };

  if (exercise) {
    return (
      <div className="eai-card p-5 space-y-4">
        <div>
          <h3 className="font-bold">{exercise.title}</h3>
          <p className={`text-xs eai-muted mt-1 ${kmc(lang)}`}>{tr("exFormAttachmentsHint")}</p>
        </div>
        <div className="flex flex-wrap gap-2.5 items-center">
          <button onClick={() => fileRef.current?.click()} disabled={uploading || attachments.length >= MAX_EXERCISE_ATTACHMENTS}
            className={`eai-btn eai-glass eai-focus text-sm py-2.5 px-4 flex items-center gap-1.5 disabled:opacity-50 ${kmc(lang)}`}>
            <Paperclip size={16} /> {tr("exAddAttachment")}
          </button>
          <input ref={fileRef} type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={pickFiles} />
          <span className={`text-xs eai-muted flex items-center gap-1.5 ${kmc(lang)}`} aria-live="polite">
            {uploading ? <><LoaderCircle size={13} className="animate-spin" /> {tr("exUploading")}</> : fill(tr("exAttachmentsCount"), { n: loc(attachments.length, lang), max: loc(MAX_EXERCISE_ATTACHMENTS, lang) })}
          </span>
        </div>
        {attachments.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
            {attachments.map((a) => <ExerciseAttachmentThumb key={a.id} attachment={a} tr={tr} onRemove={() => removeAttachment(a.id)} />)}
          </div>
        )}
        {error && <p className={`eai-ob-error flex items-center gap-1.5 ${kmc(lang)}`} role="alert"><AlertTriangle size={13} /> {error}</p>}
        <button onClick={onDone} className={`eai-btn eai-focus text-sm py-2.5 px-4 ${kmc(lang)}`} style={btnPrimary}>{tr("exFormDone")}</button>
      </div>
    );
  }

  return (
    <div className="eai-card p-5 space-y-4">
      <label className="block">
        <span className={`text-xs font-semibold eai-muted ${kmc(lang)}`}>{tr("exFormTitleLabel")}</span>
        <input className="eai-ob-input eai-focus w-full mt-1" value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <label className="block">
        <span className={`text-xs font-semibold eai-muted ${kmc(lang)}`}>{tr("exFormInstructionsLabel")}</span>
        <textarea className="eai-ob-input eai-focus w-full mt-1" rows={4} value={instructions} onChange={(e) => setInstructions(e.target.value)} />
      </label>
      <label className="block" style={{ maxWidth: 220 }}>
        <span className={`text-xs font-semibold eai-muted ${kmc(lang)}`}>{tr("exFormTimeLimitLabel")}</span>
        <input type="number" min="1" max="600" className="eai-ob-input eai-focus w-full mt-1" value={timeLimitMinutes} onChange={(e) => setTimeLimitMinutes(e.target.value)} placeholder={tr("exFormNoLimit")} />
      </label>
      {error && <p className={`eai-ob-error flex items-center gap-1.5 ${kmc(lang)}`} role="alert"><AlertTriangle size={13} /> {error}</p>}
      <div className="flex gap-2">
        <button onClick={save} disabled={busy} className={`eai-btn eai-focus text-sm py-2.5 px-4 disabled:opacity-50 ${kmc(lang)}`} style={btnPrimary}>{tr("exFormSave")}</button>
        <button onClick={onCancel} className={`eai-btn eai-focus text-sm py-2.5 px-4 eai-soft ${kmc(lang)}`}>{tr("backWord")}</button>
      </div>
    </div>
  );
}

/** One row in a teacher's own "my exercises" list. */
export function TeacherExerciseListCard({ exercise, lang, tr, onOpen, onDelete }) {
  return (
    <div className="eai-card p-4 flex items-center gap-3">
      <button onClick={onOpen} className="eai-focus min-w-0 flex-1 text-left flex items-center gap-3">
        <span className="grid place-items-center rounded-2xl flex-shrink-0" style={{ width: 44, height: 44, background: "var(--primary-soft)", color: "var(--primary)" }}><Users size={20} /></span>
        <div className="min-w-0">
          <p className="font-bold truncate">{exercise.title}</p>
          <p className={`text-xs eai-muted ${kmc(lang)}`}>{fill(tr("exSubmissionCount"), { n: loc(exercise.submissionCount ?? 0, lang) })}</p>
        </div>
      </button>
      <button onClick={onDelete} aria-label={tr("deleteWord")} className="eai-focus eai-muted hover:text-[var(--ember)]"><X size={18} /></button>
    </div>
  );
}

/** One row in a teacher's "submissions for this exercise" list. */
export function TeacherSubmissionListCard({ submission, lang, tr, onOpen }) {
  return (
    <button onClick={onOpen} className="eai-card eai-tile eai-focus p-4 w-full text-left flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="font-bold truncate">{submission.studentName}</p>
        <p className={`text-xs eai-muted ${kmc(lang)}`}>{tr(`exStatus_${submission.status}`)} · {loc(submission.photoCount, lang)} {tr("exPhotosWord")}</p>
      </div>
    </button>
  );
}

/** A teacher's view of one student's submission: photos, existing comments, and a box to add another. */
export function TeacherSubmissionDetail({ submission, lang, tr, onComment, onBack }) {
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const send = async () => {
    if (!body.trim()) return;
    setError(""); setBusy(true);
    try { await onComment(body.trim()); setBody(""); }
    catch (err) { setError(errorText(tr, err?.code ?? "generic")); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-5 eai-rise">
      <button onClick={onBack} className={`eai-focus flex items-center gap-1 text-sm eai-muted ${kmc(lang)}`}>{tr("backWord")}</button>
      <div>
        <h2 className={`eai-display text-2xl font-extrabold ${kmc(lang)}`}>{submission.studentName}</h2>
        <p className={`eai-muted text-sm mt-1 ${kmc(lang)}`}>{tr(`exStatus_${submission.status}`)}</p>
      </div>
      <div className="eai-card p-5">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {submission.photos.map((p) => <img key={p.id} src={p.url} alt="" className="w-full rounded-xl border" style={{ borderColor: "var(--line)" }} />)}
        </div>
      </div>
      <div className="eai-card p-5 space-y-3">
        <p className={`text-sm font-bold flex items-center gap-1.5 ${kmc(lang)}`}><MessageCircle size={15} /> {tr("exTeacherComments")}</p>
        {submission.comments.length === 0 && <p className={`text-xs eai-muted ${kmc(lang)}`}>{tr("exNoComments")}</p>}
        {submission.comments.map((c) => (
          <div key={c.id} className="p-3 rounded-xl eai-soft">
            <p className="text-xs font-semibold" style={{ color: "var(--primary)" }}>{c.teacherName}</p>
            <p className="text-sm mt-0.5">{c.body}</p>
          </div>
        ))}
        <div className="flex gap-2">
          <input className="eai-ob-input eai-focus flex-1 min-w-0" value={body} onChange={(e) => setBody(e.target.value)} placeholder={tr("exCommentPlaceholder")}
            onKeyDown={(e) => e.key === "Enter" && send()} />
          <button onClick={send} disabled={busy || !body.trim()} className={`eai-btn eai-focus px-4 disabled:opacity-50 flex items-center gap-1.5 ${kmc(lang)}`} style={btnPrimary}><Send size={15} /></button>
        </div>
        {error && <p className={`eai-ob-error flex items-center gap-1.5 ${kmc(lang)}`} role="alert"><AlertTriangle size={13} /> {error}</p>}
      </div>
    </div>
  );
}

export const NewExerciseButton = ({ lang, tr, onClick }) => (
  <button onClick={onClick} className={`eai-btn eai-focus text-sm py-2.5 px-4 flex items-center gap-1.5 ${kmc(lang)}`} style={btnPrimary}><Plus size={16} /> {tr("exNewExercise")}</button>
);
