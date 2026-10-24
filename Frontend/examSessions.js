/* Timed exam attempts: a student presses Start on a BAC II paper, works on real paper, then photographs the answer
   sheets and submits. The minutes between Start and Submit are what a school gets in its report.

   This file is the rules plus a local store that keeps everything in the browser (the same pattern as the rest of the
   prototype). Its methods are the ones the server API will offer, so the screens do not change when the backend part
   is added. Times are plain milliseconds since 1970; the screens turn them into clocks with the helpers below. */

export const GRACE_MIN = 30;     // an unsubmitted attempt closes this long after the paper's official time
export const MAX_PHOTOS = 10;
const MAX_THUMB_CHARS = 80000;   // a stored thumbnail (data URL) is far smaller than this
const MAX_SESSIONS = 200;

export const DEMO_SCHOOL_CODE = "DEMO-001";
const DEMO_SCHOOLS = { [DEMO_SCHOOL_CODE]: "Demo High School" };

export const paperId = ({ subject, field, year }) => `${subject}-${field}-${year}`;

/* ── clock rules ── */
const endOf = (s, now) => s.submittedAt ?? s.closedAt ?? now;
export const elapsedSeconds = (s, now) => Math.max(0, Math.floor((endOf(s, now) - s.startedAt) / 1000));
export const remainingSeconds = (s, now) => s.limitMin * 60 - elapsedSeconds(s, now); // below 0 = over the official time
export const expiresAt = (s) => s.startedAt + (s.limitMin + GRACE_MIN) * 60000;
export const minutesSpent = (s) => (s.status === "submitted" && s.submittedAt != null ? Math.max(1, Math.round((s.submittedAt - s.startedAt) / 60000)) : null);

const two = (n) => String(n).padStart(2, "0");
export function formatClock(totalSeconds) {
  const t = Math.floor(Math.abs(totalSeconds));
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  return h > 0 ? `${h}:${two(m)}:${two(s)}` : `${m}:${two(s)}`;
}

/* ── the report as a spreadsheet ── */
// A cell that starts with = + - or @ would be run as a formula by Excel/Sheets, so it gets a leading apostrophe.
function csvCell(v) {
  if (v == null) return "";
  let s = String(v);
  if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
export function reportToCsv(school, rows) {
  const header = ["school_code", "school", "student", "grade", "track", "paper", "year", "started_at", "minutes", "status", "photos", "sample"];
  const lines = rows.map((r) => [
    school?.code, school?.name, r.student, r.grade, r.track, r.subject, r.year,
    r.startedAt != null ? new Date(r.startedAt).toISOString() : "", r.minutes, r.status, r.photos, r.sample ? "sample" : "",
  ].map(csvCell).join(","));
  return "﻿" + [header.join(","), ...lines].join("\r\n"); // the byte-order mark makes Excel read Khmer correctly
}

/* ── sample class for demonstrations (clearly marked sample everywhere it is shown) ── */
const SAMPLE_STUDENTS = [
  ["Sophea Chan", "12", "science"], ["Dara Pich", "12", "science"], ["Vannak Sok", "12", "science"], ["Rithy Heng", "11", "science"],
  ["Chantha Lim", "12", "science"], ["Bopha Chea", "12", "science"], ["Sokha Ouk", "11", "science"], ["Vichea Ly", "12", "science"],
  ["Srey Mom Kim", "12", "social_science"], ["Kunthea Seng", "12", "social_science"], ["Pisey Touch", "11", "social_science"], ["Samnang Keo", "12", "social_science"],
];
const SAMPLE_PAPERS = {
  science: ["Mathematics", "Physics", "Chemistry", "Biology"],
  social_science: ["Khmer Literature", "History", "Geography", "Morality"],
};
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function makeSample(school, limitFor) {
  const rand = mulberry32(2026);
  const base = Date.UTC(2026, 9, 5, 2, 0, 0);
  const out = [];
  SAMPLE_STUDENTS.forEach(([name, grade, field], si) => {
    for (let k = 0; k < 3; k++) {
      const subject = SAMPLE_PAPERS[field][(si + k) % 4];
      const limitMin = limitFor(field, subject);
      const spentMin = Math.max(5, Math.round(limitMin * (0.7 + rand() * 0.45)));
      const startedAt = base + si * 86400000 + k * 3 * 3600000;
      out.push({
        id: `sample-${si}-${k}`, sample: true, subject, field, year: 2023 + ((si + k) % 3), student: { name, grade }, limitMin,
        startedAt, submittedAt: startedAt + spentMin * 60000 + Math.floor(rand() * 50000), status: "submitted",
        photos: [], photoCount: 2 + Math.floor(rand() * 5), schoolCode: school.code,
      });
    }
  });
  return out;
}

/* ── the local store ── */
const emptyState = () => ({ v: 1, school: null, sessions: [], sample: [] });
const defaultId = () => (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`);
const validThumb = (t) => typeof t === "string" && t.length <= MAX_THUMB_CHARS && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(t);
const cleanCode = (code) => String(code ?? "").trim().toUpperCase().replace(/\s+/g, "");
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

export function createLocalExamStore({ storage, key, now = Date.now, newId = defaultId, limitFor = () => 180 }) {
  let cache = null; // the last good copy, so a full or blocked storage still works for this visit

  function load() {
    let raw = null;
    try { raw = storage.getItem(key); } catch { raw = null; }
    if (raw == null) return cache ?? (cache = emptyState());
    try {
      const p = JSON.parse(raw);
      if (p && typeof p === "object" && Array.isArray(p.sessions)) return (cache = { ...emptyState(), ...p, sample: Array.isArray(p.sample) ? p.sample : [] });
    } catch { /* corrupt: start empty */ }
    return (cache = emptyState());
  }
  function save(state) {
    cache = state;
    const write = (s) => storage.setItem(key, JSON.stringify(s));
    try { write(state); return; } catch { /* storage full: keep only the running attempt's pictures and try once more */ }
    try {
      write({ ...state, sample: [], sessions: state.sessions.map((s) => (s.status === "running" ? s : { ...s, photos: s.photos.map((p) => ({ ...p, thumb: "" })) })) });
    } catch { /* still full: the in-memory copy carries this visit */ }
  }
  // Closes any running attempt whose official time + grace has passed. Returns the state, saved if it changed.
  function fresh() {
    const state = load();
    const t = now();
    let changed = false;
    for (const s of state.sessions) {
      if (s.status === "running" && t >= expiresAt(s)) { s.status = "expired"; s.closedAt = expiresAt(s); changed = true; }
    }
    if (changed) save(state);
    return state;
  }
  const runningIn = (state, id) => state.sessions.find((s) => s.id === id && s.status === "running");

  const api = {
    current: () => fresh().sessions.find((s) => s.status === "running") ?? null,

    start({ subject, field, year, student }) {
      const state = fresh();
      const y = Number(year);
      if (typeof subject !== "string" || !subject.trim() || !Number.isInteger(y) || y < 2000 || y > 2100) return { error: "invalid" };
      const running = state.sessions.find((s) => s.status === "running");
      if (running) return { error: "already_running", session: running };
      const session = {
        id: newId(), subject: subject.trim(), field, year: y,
        student: { name: String(student?.name ?? ""), grade: String(student?.grade ?? "") },
        limitMin: limitFor(field, subject.trim()), startedAt: now(), status: "running", photos: [], schoolCode: state.school?.code ?? null,
      };
      state.sessions.push(session);
      if (state.sessions.length > MAX_SESSIONS) {
        const drop = state.sessions.filter((s) => s.status !== "running").slice(0, state.sessions.length - MAX_SESSIONS);
        state.sessions = state.sessions.filter((s) => !drop.includes(s));
      }
      save(state);
      return { ok: true, session };
    },

    addPhoto(id, photo) {
      const state = fresh();
      const s = runningIn(state, id);
      if (!s) return { error: "not_running" };
      if (!photo || !validThumb(photo.thumb)) return { error: "invalid_photo" };
      if (s.photos.length >= MAX_PHOTOS) return { error: "too_many_photos" };
      s.photos.push({ thumb: photo.thumb, w: num(photo.w), h: num(photo.h), bytes: num(photo.bytes) });
      save(state);
      return { ok: true, session: s };
    },

    removePhoto(id, index) {
      const state = fresh();
      const s = runningIn(state, id);
      if (!s) return { error: "not_running" };
      if (!Number.isInteger(index) || index < 0 || index >= s.photos.length) return { error: "not_found" };
      s.photos.splice(index, 1);
      save(state);
      return { ok: true, session: s };
    },

    submit(id) {
      const state = fresh();
      const s = runningIn(state, id);
      if (!s) return { error: "not_running" };
      if (s.photos.length === 0) return { error: "no_photos" };
      s.status = "submitted";
      s.submittedAt = now();
      save(state);
      return { ok: true, session: s };
    },

    cancel(id) {
      const state = fresh();
      const s = runningIn(state, id);
      if (!s) return { error: "not_running" };
      s.status = "cancelled";
      s.closedAt = now();
      save(state);
      return { ok: true, session: s };
    },

    history() {
      return fresh().sessions.filter((s) => s.status !== "running")
        .sort((a, b) => (b.submittedAt ?? b.closedAt ?? b.startedAt) - (a.submittedAt ?? a.closedAt ?? a.startedAt));
    },

    school: () => load().school,
    schoolForCode(code) {
      const clean = cleanCode(code);
      return DEMO_SCHOOLS[clean] ? { code: clean, name: DEMO_SCHOOLS[clean] } : null;
    },
    joinSchool(code) {
      const found = api.schoolForCode(code);
      if (!found) return { error: "unknown_code" };
      const state = fresh();
      state.school = found;
      save(state);
      return { ok: true, school: state.school };
    },
    leaveSchool() {
      const state = fresh();
      state.school = null;
      save(state);
      return { ok: true };
    },

    report() {
      const state = fresh();
      const school = state.school;
      if (!school) return { school: null, rows: [] };
      const rows = [...state.sessions, ...state.sample]
        .filter((s) => s.schoolCode === school.code && (s.status === "submitted" || s.status === "expired"))
        .map((s) => ({
          id: s.id, student: s.student.name, grade: s.student.grade, track: s.field, subject: s.subject, year: s.year, limitMin: s.limitMin,
          minutes: minutesSpent(s), status: s.status, startedAt: s.startedAt,
          photos: s.photos.length || s.photoCount || 0, thumbs: s.photos.map((p) => p.thumb).filter(Boolean), sample: Boolean(s.sample),
        }))
        .sort((a, b) => b.startedAt - a.startedAt);
      return { school, rows };
    },

    loadSample() {
      const state = fresh();
      if (!state.school) return { error: "join_first" };
      state.sample = makeSample(state.school, limitFor);
      save(state);
      return { ok: true };
    },
    clearSample() {
      const state = fresh();
      state.sample = [];
      save(state);
      return { ok: true };
    },
  };
  return api;
}
