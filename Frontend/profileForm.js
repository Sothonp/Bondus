/* Pure helpers for the Profile page (ProfileUi.jsx) — no React, no network, tested in profileForm.test.js.

   Which fields a student may edit, the form built from their profile, what changed (the PATCH /me body), what is valid,
   and how the server's errors land on fields. Message keys are returned, never text, so the page can show English or
   Khmer. Track and grade are never editable; a university student edits only the account fields because their major
   and the rest live only in the browser. */

const ACCOUNT_FIELDS = ["name", "email", "age", "reminderEmails"];
const HIGHSCHOOL_FIELDS = ["name", "email", "age", "target", "targetExamYear", "dailyMinutes", "targetUniversity", "foreignLanguage", "subjectsToImprove", "reminderEmails"];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const characters = (s) => [...String(s ?? "")].length; // the server counts characters, not UTF-16 units

export function editableFields(profile) {
  if (profile?.educationLevel === "university") return [...ACCOUNT_FIELDS];
  return HIGHSCHOOL_FIELDS.filter((f) => f !== "foreignLanguage" || profile?.field === "science");
}

export function profileToForm(profile) {
  const form = {};
  for (const f of editableFields(profile)) {
    if (f === "age") form.age = profile.age == null ? "" : String(profile.age);
    else if (f === "subjectsToImprove") form.subjectsToImprove = [...(profile.subjectsToImprove ?? [])];
    else if (f === "reminderEmails") form.reminderEmails = profile.reminderEmails ?? true;
    else form[f] = profile[f] ?? "";
  }
  return form;
}

/* One comparable shape per field, so "", null and undefined mean the same thing and the server's lowercase email matches
   what was typed. */
function normalized(field, value) {
  switch (field) {
    case "name": return String(value ?? "").trim();
    case "email": return String(value ?? "").trim().toLowerCase();
    case "age": case "targetExamYear": case "dailyMinutes": return value === "" || value == null ? null : Number(value);
    case "subjectsToImprove": return [...(value ?? [])].sort();
    case "reminderEmails": return value ?? true;
    default: return value === "" || value == null ? null : value;
  }
}

export function diffProfile(profile, form) {
  const changes = {};
  for (const f of editableFields(profile)) {
    const before = normalized(f, profile[f]);
    const after = normalized(f, form[f]);
    if (JSON.stringify(before) === JSON.stringify(after)) continue;
    changes[f] = f === "subjectsToImprove" ? [...form.subjectsToImprove] : after;
  }
  return changes;
}

export function validateProfile(profile, form) {
  const errors = {};
  const fields = editableFields(profile);
  if (fields.includes("name")) {
    const name = String(form.name ?? "").trim();
    if (!name || characters(name) > 255) errors.name = "profileErrName";
  }
  if (fields.includes("email")) {
    const email = String(form.email ?? "").trim();
    // Emptying the email is only refused when the account has one: it is the sign-in. A phone-only account may stay without.
    const bad = email ? !EMAIL_PATTERN.test(email) || characters(email) > 255 : Boolean(profile.email);
    if (bad) errors.email = "profileErrEmail";
  }
  if (fields.includes("age")) {
    const age = String(form.age ?? "").trim();
    if (age !== "" && !(/^\d+$/.test(age) && Number(age) >= 8 && Number(age) <= 99)) errors.age = "profileErrAge";
  }
  return errors;
}

/* A stored value that a list no longer offers (an old exam year, say) is added to the front so the select still shows it. */
export function withCurrentOption(options, current) {
  if (current === "" || current == null || options.some((o) => String(o.value) === String(current))) return options;
  return [{ value: current, label: String(current) }, ...options];
}

export function serverFieldErrors(err) {
  if (!err) return {};
  if (err.code === "email_taken") return { email: "errEmailTaken" };
  if (err.code === "validation_failed" && err.errors && typeof err.errors === "object") {
    const known = new Set(HIGHSCHOOL_FIELDS);
    return Object.fromEntries(Object.keys(err.errors).filter((f) => known.has(f)).map((f) => [f, "errValidation"]));
  }
  return {};
}

export function validatePasswordChange({ current, next, confirm }) {
  const errors = {};
  if (!String(current ?? "")) errors.current = "passwordErrCurrentRequired";
  const length = characters(next);
  if (length < 8) errors.next = "passwordErrTooShort";
  else if (length > 128) errors.next = "passwordErrTooLong";
  if (next !== confirm) errors.confirm = "passwordErrMismatch";
  return errors;
}

/* Every STRINGS key the Profile page uses (the new profile* / password* ones, plus the existing error messages it shows).
   The wiring test checks each one exists in both the English and the Khmer table in App.jsx. */
export const PROFILE_STRING_KEYS = [
  "profileTitle", "profileDesc", "profileOpen", "profileDetailsHeading", "profileNameLabel", "profileEmailLabel", "profileAgeLabel",
  "profileGoalsHeading", "profileLockedNote", "profileReminderLabel", "profileReminderHint", "profileSave", "profileSaving", "profileSaved",
  "profileErrName", "profileErrEmail", "profileErrAge",
  "passwordHeading", "passwordCurrentLabel", "passwordNewLabel", "passwordConfirmLabel", "passwordChange", "passwordChanging", "passwordChanged",
  "errWrongPassword", "passwordErrCurrentRequired", "passwordErrTooShort", "passwordErrTooLong", "passwordErrMismatch",
  "passwordForgotLink", "passwordCodeSent", "passwordCodeLabel", "passwordResetSubmit", "passwordCancel",
  "errEmailTaken", "errValidation", "errServer", "errNoEmail", "errEmailFailed", "errInvalidCode", "errTooMany", "errNetwork",
];
