/* The Profile page: a student's details and study goals. Pure helpers (what is editable, what changed, what is valid)
   live in profileForm.js; App.jsx owns saving.

   App.jsx passes the form pieces it already uses at sign-up (FormField, SelectField, SubjectChip) and the sign-up option
   lists in as props, so editing and signing up share them and cannot drift, and this file never imports App.jsx (that
   would be a circular import). Track and grade are shown but cannot be changed here; a university student edits only
   the account fields. */
import React, { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { fieldSubjects, subjectId, subjectLabel } from "./subjects.js";
import { editableFields, profileToForm, diffProfile, validateProfile, withCurrentOption } from "./profileForm.js";

const INPUT = "eai-input eai-focus w-full px-4 py-3 text-sm";
const BLANK = { value: "", label: "—" };
const GRID = { columnGap: 16, rowGap: 22 };
const asNumber = (e) => (e.target.value === "" ? "" : Number(e.target.value));

/* The list plus the student's stored value when the list lacks it, and a blank choice when they have none yet. */
function optionsFor(options, current) {
  const shown = withCurrentOption(options, current);
  return current === "" && !shown.some((o) => o.value === "") ? [BLANK, ...shown] : shown;
}

function DetailsCard({ profile, lang, tr, parts, lists, onSaveDetails }) {
  const { FormField, SelectField, SubjectChip } = parts;
  const km = lang === "km" ? "eai-km" : "";
  const has = (field) => editableFields(profile).includes(field);
  const [form, setForm] = useState(() => profileToForm(profile));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [failure, setFailure] = useState(null);

  // Follow the profile when its editable values change (after a save, say), not on every new profile object: XP and level
  // also replace it, and that must not wipe what the student is typing.
  const profileKey = JSON.stringify(profileToForm(profile));
  useEffect(() => { setForm(JSON.parse(profileKey)); }, [profileKey]);
  useEffect(() => {
    if (!saved) return undefined;
    const timer = setTimeout(() => setSaved(false), 3000);
    return () => clearTimeout(timer);
  }, [saved]);

  const set = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    setSaved(false); setFailure(null);
    setErrors((e) => ({ ...e, [field]: undefined }));
  };
  const toggleSubject = (id) => set("subjectsToImprove", form.subjectsToImprove.includes(id) ? form.subjectsToImprove.filter((x) => x !== id) : [...form.subjectsToImprove, id]);
  const changes = diffProfile(profile, form);
  const dirty = Object.keys(changes).length > 0;

  const submit = async (event) => {
    event.preventDefault();
    const problems = validateProfile(profile, form);
    setErrors(problems); setFailure(null);
    if (Object.keys(problems).length) return;
    setSaving(true);
    const result = await onSaveDetails(changes);
    setSaving(false);
    if (result.ok) setSaved(true);
    else { setErrors(result.errors ?? {}); setFailure(result.message ?? null); }
  };

  const track = lists.trackLabels?.[profile.field];
  const trackText = track ? (lang === "km" ? track.km : track.label) : profile.field;
  const message = (field) => (errors[field] ? tr(errors[field]) : undefined);

  return (
    <form className="eai-card p-6 space-y-6" onSubmit={submit} noValidate>
      <h3 className={`eai-display font-bold ${km}`}>{tr("profileDetailsHeading")}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2" style={GRID}>
        <FormField label={tr("profileNameLabel")} required error={message("name")}>
          <input className={INPUT} autoComplete="name" value={form.name} onChange={(e) => set("name", e.target.value)} />
        </FormField>
        <FormField label={tr("profileEmailLabel")} required={Boolean(profile.email)} error={message("email")}>
          <input type="email" className={INPUT} autoComplete="email" inputMode="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
        </FormField>
        <FormField label={tr("profileAgeLabel")} error={message("age")}>
          <input type="number" min="8" max="99" inputMode="numeric" className={INPUT} value={form.age} onChange={(e) => set("age", e.target.value)} />
        </FormField>
      </div>

      {has("target") && (
        <>
          <div className="eai-soft rounded-2xl p-4">
            <p className={`text-sm font-semibold ${km}`}>{trackText}{profile.grade ? ` · ${tr(`grade${profile.grade}`)}` : ""}</p>
            <p className={`text-xs eai-muted mt-1 ${km}`}>{tr("profileLockedNote")}</p>
          </div>

          <h3 className={`eai-display font-bold ${km}`}>{tr("profileGoalsHeading")}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2" style={GRID}>
            <SelectField label={tr("targetGradeLabel")} value={form.target} onChange={(e) => set("target", e.target.value)}
              options={optionsFor(lists.targetGrades.map((g) => ({ value: g, label: `${tr("gradeWord")} ${g}` })), form.target)} />
            <SelectField label={tr("targetExamYearLabel")} value={form.targetExamYear} onChange={(e) => set("targetExamYear", asNumber(e))}
              options={optionsFor(lists.examYears.map((y) => ({ value: y, label: String(y) })), form.targetExamYear)} />
            <SelectField label={tr("dailyStudyTimeLabel")} value={form.dailyMinutes} onChange={(e) => set("dailyMinutes", asNumber(e))}
              options={optionsFor(lists.studyMinutes.map((m) => ({ value: m, label: `${m} ${tr("minutesWord")}` })), form.dailyMinutes)} />
            <SelectField label={tr("targetUniLabel")} value={form.targetUniversity} onChange={(e) => set("targetUniversity", e.target.value)}
              options={withCurrentOption([{ value: "", label: tr("notSureYet") }, ...lists.universities.map((u) => ({ value: u.abbr, label: `${u.abbr} — ${lang === "km" ? u.nKm : u.n}` }))], form.targetUniversity)} />
            {has("foreignLanguage") && (
              <SelectField label={tr("foreignLanguageLabel")} value={form.foreignLanguage} onChange={(e) => set("foreignLanguage", e.target.value)}
                options={optionsFor(lists.foreignLanguages.map((l) => ({ value: l, label: subjectLabel(l, lang) })), form.foreignLanguage)} />
            )}
          </div>
          <div>
            <span className={`text-sm font-semibold ${km}`}>{tr("subjectsImproveQ")}</span>
            <div className="flex flex-wrap gap-2 mt-3">
              {fieldSubjects(profile.field, form.foreignLanguage).map((subject) => {
                const id = subjectId(subject);
                return <SubjectChip key={id} subject={subject} label={subjectLabel(subject, lang)} selected={form.subjectsToImprove.includes(id)} onToggle={() => toggleSubject(id)} lang={lang} />;
              })}
            </div>
          </div>
        </>
      )}

      <label className="flex items-start gap-3 cursor-pointer">
        <input type="checkbox" className="mt-1" checked={form.reminderEmails} onChange={(e) => set("reminderEmails", e.target.checked)} />
        <span>
          <span className={`text-sm font-semibold block ${km}`}>{tr("profileReminderLabel")}</span>
          <span className={`text-xs eai-muted block ${km}`}>{tr("profileReminderHint")}</span>
        </span>
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={!dirty || saving} className={`eai-btn eai-focus text-sm py-2.5 px-5 text-white ${km}`}
          style={{ background: "var(--primary)", opacity: !dirty || saving ? 0.5 : 1 }}>
          {saving ? tr("profileSaving") : tr("profileSave")}
        </button>
        {saved && <span role="status" className={`text-sm font-semibold flex items-center gap-1.5 ${km}`} style={{ color: "var(--jade)" }}><CheckCircle2 size={16} /> {tr("profileSaved")}</span>}
        {failure && <span role="alert" className={`text-sm ${km}`} style={{ color: "var(--ember)" }}>{failure}</span>}
      </div>
    </form>
  );
}

/* `onSaveDetails(changes)` resolves to { ok: true } or { ok: false, errors: { field: messageKey }, message?: text }.
   `tr(key)` is the app's translator for the current language; `lists` carries the sign-up option lists. */
export function ProfilePage({ profile, lang, tr, parts, lists, onSaveDetails }) {
  const km = lang === "km" ? "eai-km" : "";
  return (
    <div className="space-y-5 eai-rise" style={{ maxWidth: 760 }}>
      <div>
        <h2 className={`eai-display text-2xl font-extrabold ${km}`}>{tr("profileTitle")}</h2>
        <p className={`eai-muted text-sm mt-1 ${km}`}>{tr("profileDesc")}</p>
      </div>
      <DetailsCard profile={profile} lang={lang} tr={tr} parts={parts} lists={lists} onSaveDetails={onSaveDetails} />
    </div>
  );
}
