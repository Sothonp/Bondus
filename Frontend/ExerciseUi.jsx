/* Screens for exercises an admin posted (rules: exercises.js). Same split as ExamSessionUi.jsx: pure
   presentational pieces, a translator `tr(key)` and `lang` passed in from App.jsx, nothing imported back
   from App. Students browse by subject (card -> viewer); an admin posts and edits them (form). */
import React, { useEffect, useRef, useState } from "react";
import { X, AlertTriangle, LoaderCircle, Plus, Paperclip, FileText, Image as ImageIcon, Eye, Download, ChevronLeft, Pencil } from "lucide-react";
import { MAX_EXERCISE_ATTACHMENTS, filesOf, fileCounts } from "./exercises.js";
import { subjectLabel } from "./subjects.js";
import { shrinkImage } from "./imageUtils.js";
import SubjectIcon from "./SubjectIcon.jsx";

const KM_DIGITS = ["០", "១", "២", "៣", "៤", "៥", "៦", "៧", "៨", "៩"];
const loc = (v, lang) => (lang === "km" ? String(v).replace(/[0-9]/g, (d) => KM_DIGITS[d]) : String(v));
const kmc = (lang) => (lang === "km" ? "eai-km" : "");
const fill = (s, vars) => Object.entries(vars).reduce((acc, [k, v]) => acc.replace(`{${k}}`, v), s);
const btnPrimary = { background: "var(--primary)", color: "#fff" };
const errorText = (tr, code) => { const k = `exErr_${code}`; const s = tr(k); return s === k ? tr("exErr_generic") : s; };

/* One exercise as a card in a grid: who the teacher is, which school, what files it has. Students get a
   View button; an admin also gets Edit and Delete, and is told when the exercise has no file yet (a
   student cannot see it until it does). `subject` is the canonical subject name, e.g. "Physics". */
export function ExerciseCard({ exercise, subject, lang, tr, onOpen, onEdit, onDelete }) {
  const { pdfs, images } = fileCounts(exercise);
  const hasFiles = pdfs + images > 0;
  const chip = { background: "var(--bg-soft)", color: "var(--ink)" };
  return (
    <div className="eai-card eai-tile p-5 flex flex-col" data-testid="exercise-card">
      <div className="flex items-start justify-between gap-2">
        <SubjectIcon subject={subject} tile />
        {onDelete && (
          <button onClick={onDelete} aria-label={tr("deleteWord")} title={tr("deleteWord")} className="eai-focus eai-muted hover:text-[var(--ember)]"><X size={18} /></button>
        )}
      </div>
      <h3 className={`eai-display font-bold mt-3 ${kmc(lang)}`}>{exercise.title || tr("exUntitled")}</h3>
      <p className={`text-sm mt-2 ${kmc(lang)}`}><span className="eai-muted">{tr("exTeacherLabel")}:</span> <span className="font-semibold">{exercise.teacherName}</span></p>
      <p className={`text-sm mt-0.5 ${kmc(lang)}`}><span className="eai-muted">{tr("exSchoolLabel")}:</span> <span className="font-semibold">{exercise.schoolName}</span></p>
      <div className="flex flex-wrap items-center gap-2 mt-3">
        {pdfs > 0 && <span className={`text-xs font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${kmc(lang)}`} style={chip}><FileText size={12} /> {tr("exFilePdf")}</span>}
        {images > 0 && (
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${kmc(lang)}`} style={chip}>
            <ImageIcon size={12} /> {images === 1 ? tr("exFilePhoto") : fill(tr("exFilePhotos"), { n: loc(images, lang) })}
          </span>
        )}
      </div>
      {!hasFiles && onEdit && <p className={`text-xs mt-3 flex items-center gap-1.5 ${kmc(lang)}`} style={{ color: "var(--ember)" }}><AlertTriangle size={13} /> {tr("exNoFilesYet")}</p>}
      <div className="flex gap-2 mt-auto pt-4">
        {hasFiles && onOpen && (
          <button onClick={onOpen} className={`eai-btn eai-glass eai-focus flex-1 text-sm py-2 flex items-center justify-center gap-1.5 ${kmc(lang)}`}><Eye size={14} /> {tr("viewWord")}</button>
        )}
        {onEdit && (
          <button onClick={onEdit} className={`eai-btn eai-glass eai-focus flex-1 text-sm py-2 flex items-center justify-center gap-1.5 ${kmc(lang)}`}><Pencil size={14} /> {tr("exEditBtn")}</button>
        )}
      </div>
    </div>
  );
}

/* A PDF shown in a frame. The API sends X-Frame-Options: SAMEORIGIN, so a browser refuses to put the API's own
   address in a frame on the web app's page (it shows a "blocked" icon). Fetching the file first and framing the
   downloaded copy avoids that; the API allows the web app to fetch it (CORS). A failure is a message, never a blank frame. */
function PdfFrame({ url, title, lang, tr }) {
  const [src, setSrc] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    let objectUrl = null;
    setSrc(null); setFailed(false);
    fetch(url)
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.blob(); })
      .then((blob) => {
        if (!alive) return;
        objectUrl = URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
        setSrc(objectUrl);
      })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [url]);

  if (failed) return <p className={`text-sm eai-muted ${kmc(lang)}`}>{tr("exPdfFailed")}</p>;
  if (!src) return <p className={`text-sm eai-muted flex items-center gap-1.5 ${kmc(lang)}`}><LoaderCircle size={14} className="animate-spin" /> {tr("exLoading")}</p>;
  return <iframe src={`${src}#view=FitH`} title={title} className="w-full block" style={{ height: "88vh", border: "none" }} />;
}

/* Opens an exercise: a PDF in a frame (with an open-in-new-tab link, since many phone browsers cannot show a
   PDF inside a page), photos inline. Same approach as the exam paper page. */
export function ExerciseViewer({ exercise, subject, lang, tr, onBack }) {
  const files = filesOf(exercise);
  const hasPdf = files.some((f) => f.kind === "pdf");
  const title = exercise.title || subjectLabel(subject, lang);
  return (
    <div className="space-y-5 eai-rise">
      <button onClick={onBack} className={`eai-focus flex items-center gap-1 text-sm eai-muted ${kmc(lang)}`}><ChevronLeft size={16} /> {tr("exercisesTitle")}</button>
      <div>
        <h2 className={`eai-display text-2xl font-extrabold ${kmc(lang)}`}>{title}</h2>
        <p className={`eai-muted text-sm mt-1 ${kmc(lang)}`}>{subjectLabel(subject, lang)} · {tr("exTeacherLabel")}: {exercise.teacherName} · {tr("exSchoolLabel")}: {exercise.schoolName}</p>
      </div>
      {hasPdf && <p className={`text-xs eai-muted sm:hidden ${kmc(lang)}`}>{tr("openPdfMobileNote")}</p>}
      <div className="space-y-5">
        {files.map((f) => f.kind === "pdf" ? (
          <div key={f.id} className="space-y-3">
            <a href={f.url} target="_blank" rel="noopener noreferrer"
              className={`eai-btn eai-focus text-sm py-2.5 px-4 text-white inline-flex items-center gap-1.5 ${kmc(lang)}`} style={{ background: "var(--primary)" }}>
              <Download size={15} /> {tr("openPdfBtn")}
            </a>
            <PdfFrame url={f.url} title={f.name || title} lang={lang} tr={tr} />
          </div>
        ) : (
          <div key={f.id} className="eai-card p-4 sm:p-6">
            <img src={f.url} alt={f.name || title} className="w-full rounded-xl border" style={{ borderColor: "var(--line)", display: "block" }} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* One attachment while editing: a photo shown as a thumbnail, a PDF as an icon + name. */
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
        <button onClick={onRemove} aria-label={tr("exRemoveFile")} title={tr("exRemoveFile")} className="eai-focus absolute top-1 right-1 grid place-items-center rounded-full" style={{ width: 24, height: 24, background: "rgba(0,0,0,.6)", color: "#fff" }}><X size={14} /></button>
      )}
    </div>
  );
}

/* Post (or edit) an exercise for one subject. Step 1: the teacher and school it came from, and an optional
   title. Step 2, once saved: attach a PDF or photos. onSave answers the saved exercise (create or update). */
export function AdminExerciseForm({ initial, subject, lang, tr, onSave, onAddAttachment, onRemoveAttachment, onDone, onCancel }) {
  const [teacherName, setTeacherName] = useState(initial?.teacherName ?? "");
  const [schoolName, setSchoolName] = useState(initial?.schoolName ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [exercise, setExercise] = useState(null); // set once saved: switches the form to the files step
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const save = async () => {
    setError("");
    if (!teacherName.trim() || !schoolName.trim()) { setError(tr("exFormRequired")); return; }
    setBusy(true);
    try {
      const saved = await onSave({ teacherName: teacherName.trim(), schoolName: schoolName.trim(), title: title.trim() || null });
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

  const subjectChip = (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${kmc(lang)}`} style={{ background: "var(--primary-soft)", color: "var(--primary)" }}>
      <SubjectIcon subject={subject} size={14} /> {subjectLabel(subject, lang)}
    </span>
  );

  if (exercise) {
    return (
      <div className="eai-card p-5 space-y-4">
        <div className="space-y-2">
          {subjectChip}
          <h3 className={`font-bold ${kmc(lang)}`}>{exercise.title || tr("exUntitled")}</h3>
          <p className={`text-xs eai-muted ${kmc(lang)}`}>{tr("exTeacherLabel")}: {exercise.teacherName} · {tr("exSchoolLabel")}: {exercise.schoolName}</p>
          <p className={`text-xs eai-muted ${kmc(lang)}`}>{tr("exFormAttachmentsHint")}</p>
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
      {subjectChip}
      <label className="block">
        <span className={`text-xs font-semibold eai-muted ${kmc(lang)}`}>{tr("exFormTeacherLabel")}</span>
        <input className="eai-ob-input eai-focus w-full mt-1" value={teacherName} onChange={(e) => setTeacherName(e.target.value)} />
      </label>
      <label className="block">
        <span className={`text-xs font-semibold eai-muted ${kmc(lang)}`}>{tr("exFormSchoolLabel")}</span>
        <input className="eai-ob-input eai-focus w-full mt-1" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} />
      </label>
      <label className="block">
        <span className={`text-xs font-semibold eai-muted ${kmc(lang)}`}>{tr("exFormTitleLabel")}</span>
        <input className="eai-ob-input eai-focus w-full mt-1" value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      {error && <p className={`eai-ob-error flex items-center gap-1.5 ${kmc(lang)}`} role="alert"><AlertTriangle size={13} /> {error}</p>}
      <div className="flex gap-2">
        <button onClick={save} disabled={busy} className={`eai-btn eai-focus text-sm py-2.5 px-4 disabled:opacity-50 ${kmc(lang)}`} style={btnPrimary}>{tr("exFormSave")}</button>
        <button onClick={onCancel} className={`eai-btn eai-focus text-sm py-2.5 px-4 eai-soft ${kmc(lang)}`}>{tr("backWord")}</button>
      </div>
    </div>
  );
}

export const NewExerciseButton = ({ lang, tr, onClick }) => (
  <button onClick={onClick} className={`eai-btn eai-focus text-sm py-2.5 px-4 flex items-center gap-1.5 ${kmc(lang)}`} style={btnPrimary}><Plus size={16} /> {tr("exNewExercise")}</button>
);
