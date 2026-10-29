/* Pure translators between the app's own data shapes and the backend's (docs/API.md in bondus-backend).
   No React, no network — tested in serverMapping.test.js. */

const compact = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== ""));

/* The server's `user` (+ the latest XP summary) as the app's `profile` object. The server owns level / xp / xpToNext. */
export function userToProfile(user, summary) {
  const { id, createdAt, ...rest } = user;
  const profile = { ...rest, userId: id };
  if (summary) { profile.level = summary.level; profile.xp = summary.xp; profile.xpToNext = summary.xpToNext; }
  return profile;
}

/* Register form answers -> POST /register body. Empty optional fields are left out so the server's defaults apply.
   Everyone signs up as a student; there is no teacher sign-up (admins are made on the server). */
export function registrationToPayload(reg) {
  return compact({
    name: String(reg.name ?? "").trim(),
    password: reg.password,
    field: reg.field,
    email: String(reg.email ?? "").trim(),
    age: reg.age ? Number(reg.age) : null,
    educationLevel: reg.educationLevel || "highschool",
    grade: reg.grade,
    target: reg.target,
    targetExamYear: reg.targetExamYear,
    dailyMinutes: reg.dailyMinutes,
    targetUniversity: reg.targetUniversity,
    subjectsToImprove: Array.isArray(reg.subjectsToImprove) ? reg.subjectsToImprove : [],
    // A Science student sits one foreign language, English or French, chosen at sign-up (the Social Science track lists both).
    foreignLanguage: reg.field === "science" ? reg.foreignLanguage : undefined,
  });
}

/* The same answers as a PATCH /me body — used when the student goes Back and edits after the account already exists.
   The password is never re-sent. */
export function registrationToPatch(reg) {
  const { password, educationLevel, ...rest } = registrationToPayload(reg);
  return rest;
}

/* Which sign-up screen the problem is on: 1 = account details, 2 = track, null = stay where you are. */
export function registrationErrorStep(err) {
  if (!err) return null;
  if (err.code === "phone_taken" || err.code === "email_taken") return 1;
  if (err.code === "validation_failed" && err.errors) {
    const fields = Object.keys(err.errors);
    if (fields.some((f) => ["name", "phone", "password", "email", "age", "grade", "target"].includes(f))) return 1;
    if (fields.includes("field")) return 2;
  }
  return null;
}

/* A plan task from the server -> the shape the dashboard already renders ({ id, s, task, min, why, done, date }). */
export const taskFromServer = (t) => ({
  id: t.id, s: t.subject ?? null, task: t.title, min: t.minutes ?? null, why: "My task", done: Boolean(t.done), date: t.date,
});

/* What goes into PUT /me/state. XP, level, the plan and the profile live in their own server tables, so they are not
   part of it (the server would strip them anyway). */
export function stateToSave({ topicMastery, uniTopicMastery, practice, uniPractice, rewards }) {
  return {
    topicMastery: topicMastery ?? {}, uniTopicMastery: uniTopicMastery ?? {},
    practice: practice ?? {}, uniPractice: uniPractice ?? {},
    rewards: rewards ?? {},
  };
}

/* A fresh id for every attempt. The backend uses it to tell "the student did this again" from "the same request retried". */
export function newAttemptId() {
  const c = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();
  return `a-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

const seconds = (n) => (Number.isFinite(Number(n)) && n !== null ? Math.round(Math.min(3600, Math.max(0, Number(n))) * 10) / 10 : undefined);

/* An answered exercise -> a POST /study-events body. `answer` is what the student chose: the server grades it against
   its own copy of the question bank and pays XP only for that verdict — the screen's own `result` is never sent,
   so there is nothing here for a client to lie about. */
export function answerEvent(ex, result, meta = {}, attemptId = newAttemptId()) {
  return compact({
    type: "answer", key: String(ex.id), attemptId,
    subject: ex.subject, topic: ex.topic, difficulty: ex.difficulty, mistakeType: meta.mistakeType,
    answer: meta.answer == null ? undefined : String(meta.answer),
    timeSec: seconds(meta.timeSec),
  });
}

/* A manual Pending / In progress / Completed tick. "pending" tells the server nothing, so it returns null. The server
   records the tick (it counts as studying today) but pays nothing for it: only a graded answer earns XP. */
export function statusEvent(ex, status, attemptId = newAttemptId()) {
  if (status !== "completed" && status !== "in_progress") return null;
  return compact({ type: "answer", key: String(ex.id), attemptId, subject: ex.subject, topic: ex.topic, status });
}

/* A claimed treasure box. `itemId` is what dropped (or null for the consolation XP). */
export function boxEvent({ setKey, total, retried, itemId }, attemptId = newAttemptId()) {
  return compact({ type: "box_claim", key: String(setKey), attemptId, total: Number(total) || 0, retried: Number(retried) || 0, itemId });
}

/* Finishing the diagnostic counts as studying that day (it starts the streak) but earns no XP. */
export const diagnosticEvent = (attemptId = newAttemptId()) => ({ type: "diagnostic", key: "diagnostic", attemptId });

/* Backend error code -> the App's STRINGS key for the English/Khmer message. Anything unknown falls back to errServer. */
export const API_ERROR_KEYS = {
  invalid_credentials: "errInvalidCredentials",
  phone_taken: "errPhoneTaken",
  email_taken: "errEmailTaken",
  validation_failed: "errValidation",
  too_many_requests: "errTooMany",
  code_recently_sent: "errTooMany",
  network_error: "errNetwork",
  bad_response: "errNetwork",
  api_disabled: "errNetwork",
  invalid_code: "errInvalidCode",
  wrong_password: "errWrongPassword",
  no_email_on_account: "errNoEmail",
  email_failed: "errEmailFailed",
  plan_limit_reached: "errPlanLimit",
  unauthenticated: "errSession",
  payload_too_large: "errServer",
  stale_state: "errServer",
  server_error: "errServer",
  already_running: "errAlreadyRunning",
  already_submitted: "errAlreadySubmitted",
  no_photos: "errNoPhotos",
  too_many_photos: "errTooManyPhotos",
  not_running: "errNotRunning",
};
export const apiErrorKey = (code) => API_ERROR_KEYS[code] ?? "errServer";

/* Seconds -> { hours, minutes } rounded UP to whole minutes (a wait of 1 second is shown as 1 minute), or null when
   there is nothing sensible to show. Used to say "try again in 48 minutes" instead of a vague "wait a moment". */
export function waitParts(seconds) {
  const s = Number(seconds);
  if (!Number.isFinite(s) || s <= 0) return null;
  const total = Math.ceil(s / 60);
  return { hours: Math.floor(total / 60), minutes: total % 60 };
}

/* True when a 429 on "send code" only means "a code was sent a moment ago, it is on its way" (so the app should go
   straight to the code screen) — as opposed to being rate limited. The backend gives that case its own code
   (code_recently_sent); older builds used too_many_requests with the message "A code was just sent...". */
export function isCodeAlreadySent(err) {
  if (!err) return false;
  if (err.code === "code_recently_sent") return true;
  return err.code === "too_many_requests" && /just sent/i.test(String(err.message ?? ""));
}
