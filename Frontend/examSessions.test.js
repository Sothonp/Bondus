/* Tests for timed exam attempts (Frontend/examSessions.js): the clock rules, the local store that stands in for the
   server until the backend part ships, the school report and its spreadsheet export.
   Run with:  node --test Frontend/examSessions.test.js   (no dependencies — Node's built-in runner) */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  GRACE_MIN, MAX_PHOTOS, paperId, elapsedSeconds, remainingSeconds, expiresAt, minutesSpent, formatClock,
  createLocalExamStore, reportToCsv,
} from "./examSessions.js";

const memory = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), raw: m }; };
const T0 = Date.UTC(2026, 9, 24, 3, 0, 0);
const THUMB = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ";
const photo = (over = {}) => ({ thumb: THUMB, w: 1200, h: 1600, bytes: 380000, ...over });
const student = { name: "Sophea Chan", grade: "12" };
const PAPER = { subject: "Mathematics", field: "science", year: 2024, student };
const limitFor = (field, subject) => (field === "science" && subject === "Mathematics" ? 150 : 90);

function setup(over = {}) {
  const clock = { t: T0 };
  const storage = over.storage ?? memory();
  let n = 0;
  const store = createLocalExamStore({ storage, key: "k", now: () => clock.t, newId: () => `id${++n}`, limitFor });
  return { store, clock, storage, minutes: (m) => { clock.t += m * 60000; } };
}

test("a paper has one id, the same one the Browse page uses for its files", () => {
  assert.equal(paperId({ subject: "Physics", field: "science", year: 2025 }), "Physics-science-2025");
});

test("the clock counts up from the start and shows how much of the official time is left, or how far over it is", () => {
  const s = { startedAt: T0, limitMin: 150, status: "running" };
  assert.equal(elapsedSeconds(s, T0 + 65000), 65);
  assert.equal(remainingSeconds(s, T0 + 60 * 60000), 90 * 60);
  assert.equal(remainingSeconds(s, T0 + 160 * 60000), -10 * 60); // 10 minutes over
  assert.equal(elapsedSeconds(s, T0 - 5000), 0); // a clock that went backwards never shows negative time
  assert.equal(formatClock(0), "0:00");
  assert.equal(formatClock(65), "1:05");
  assert.equal(formatClock(3725), "1:02:05");
  assert.equal(formatClock(-90), "1:30"); // the sign is the caller's job ("over by")
});

test("an unsubmitted attempt closes by itself the paper's official time plus 30 minutes after it started", () => {
  assert.equal(GRACE_MIN, 30);
  assert.equal(expiresAt({ startedAt: T0, limitMin: 150 }), T0 + 180 * 60000);
});

test("starting an attempt records the paper, the student and the official time; only one can run at once", () => {
  const { store } = setup();
  const a = store.start(PAPER);
  assert.equal(a.ok, true);
  assert.deepEqual({ ...a.session, id: undefined }, {
    id: undefined, subject: "Mathematics", field: "science", year: 2024, student, limitMin: 150, startedAt: T0,
    status: "running", photos: [], schoolCode: null,
  });
  const again = store.start({ ...PAPER, subject: "Physics" });
  assert.equal(again.error, "already_running");
  assert.equal(again.session.id, a.session.id);
  assert.equal(store.current().id, a.session.id);
});

test("a bad start (no subject or year) is refused", () => {
  const { store } = setup();
  assert.equal(store.start({ ...PAPER, subject: "" }).error, "invalid");
  assert.equal(store.start({ ...PAPER, year: "x" }).error, "invalid");
  assert.equal(store.current(), null);
});

test("the attempt survives closing the app: a new store over the same storage still sees the running attempt", () => {
  const { store, clock, storage } = setup();
  store.start(PAPER);
  clock.t += 20 * 60000;
  const reopened = createLocalExamStore({ storage, key: "k", now: () => clock.t, newId: () => "x", limitFor });
  assert.equal(elapsedSeconds(reopened.current(), clock.t), 20 * 60);
});

test("an attempt nobody submitted closes at official time + 30 minutes and can no longer be submitted", () => {
  const { store, minutes } = setup();
  const { session } = store.start(PAPER);
  store.addPhoto(session.id, photo());
  minutes(179);
  assert.equal(store.current().status, "running");
  minutes(2); // 181 minutes in: 150 + 30 has passed
  assert.equal(store.current(), null);
  const closed = store.history()[0];
  assert.equal(closed.status, "expired");
  assert.equal(closed.closedAt, T0 + 180 * 60000);
  assert.equal(store.submit(session.id).error, "not_running");
  // and a new attempt can start straight away
  assert.equal(store.start({ ...PAPER, subject: "Physics" }).ok, true);
});

test("photos: up to 10, each a real image, only while the attempt is running, and the student can remove one", () => {
  const { store } = setup();
  const { session } = store.start(PAPER);
  for (let i = 0; i < MAX_PHOTOS; i++) assert.equal(store.addPhoto(session.id, photo()).ok, true);
  assert.equal(store.addPhoto(session.id, photo()).error, "too_many_photos");
  assert.equal(store.current().photos.length, MAX_PHOTOS);
  assert.equal(store.removePhoto(session.id, 0).ok, true);
  assert.equal(store.current().photos.length, MAX_PHOTOS - 1);

  const other = setup();
  const s2 = other.store.start(PAPER).session;
  assert.equal(other.store.addPhoto(s2.id, photo({ thumb: "javascript:alert(1)" })).error, "invalid_photo");
  assert.equal(other.store.addPhoto(s2.id, photo({ thumb: "data:text/html;base64,PGI+" })).error, "invalid_photo");
  assert.equal(other.store.addPhoto(s2.id, { w: 1, h: 1 }).error, "invalid_photo");
  assert.equal(other.store.addPhoto("nope", photo()).error, "not_running");
});

test("submitting needs at least one photo, stamps the finish time and says how many minutes were spent", () => {
  const { store, minutes } = setup();
  const { session } = store.start(PAPER);
  minutes(142);
  assert.equal(store.submit(session.id).error, "no_photos");
  store.addPhoto(session.id, photo());
  minutes(0.4); // 142 min 24 s
  const done = store.submit(session.id);
  assert.equal(done.ok, true);
  assert.equal(done.session.status, "submitted");
  assert.equal(done.session.submittedAt, T0 + 142 * 60000 + 24000);
  assert.equal(minutesSpent(done.session), 142);
  assert.equal(store.current(), null);
  assert.equal(store.submit(session.id).error, "not_running"); // not twice
});

test("minutes spent rounds to the nearest minute and is at least 1; it is only defined for a submitted attempt", () => {
  const base = { startedAt: T0, limitMin: 90 };
  assert.equal(minutesSpent({ ...base, status: "submitted", submittedAt: T0 + 20000 }), 1);
  assert.equal(minutesSpent({ ...base, status: "submitted", submittedAt: T0 + 89 * 1000 }), 1);
  assert.equal(minutesSpent({ ...base, status: "submitted", submittedAt: T0 + 91 * 60000 + 31000 }), 92);
  assert.equal(minutesSpent({ ...base, status: "running" }), null);
  assert.equal(minutesSpent({ ...base, status: "expired", closedAt: T0 + 1000 }), null);
});

test("cancelling ends the attempt without a result", () => {
  const { store } = setup();
  const { session } = store.start(PAPER);
  assert.equal(store.cancel(session.id).ok, true);
  assert.equal(store.current(), null);
  assert.equal(store.history()[0].status, "cancelled");
  assert.equal(store.cancel(session.id).error, "not_running");
});

test("history lists finished attempts, newest first, and never the running one", () => {
  const { store, minutes } = setup();
  const a = store.start(PAPER).session; store.addPhoto(a.id, photo()); minutes(100); store.submit(a.id);
  minutes(5);
  const b = store.start({ ...PAPER, subject: "Physics" }).session; store.addPhoto(b.id, photo()); minutes(60); store.submit(b.id);
  store.start({ ...PAPER, subject: "Chemistry" });
  assert.deepEqual(store.history().map((s) => s.subject), ["Physics", "Mathematics"]);
});

test("joining a school takes a code (any spacing or case), refuses unknown codes, and can be undone", () => {
  const { store } = setup();
  assert.equal(store.joinSchool("nope").error, "unknown_code");
  assert.equal(store.joinSchool("").error, "unknown_code");
  const joined = store.joinSchool("  demo-001 ");
  assert.equal(joined.ok, true);
  assert.deepEqual({ code: joined.school.code, name: joined.school.name }, { code: "DEMO-001", name: "Demo High School" });
  assert.equal(store.school().code, "DEMO-001");
  store.leaveSchool();
  assert.equal(store.school(), null);
});

test("a code can be looked up before joining, so the student sees the school's name first", () => {
  const { store } = setup();
  assert.deepEqual(store.schoolForCode(" demo-001 "), { code: "DEMO-001", name: "Demo High School" });
  assert.equal(store.schoolForCode("HS-0000"), null);
  assert.equal(store.school(), null); // looking up joins nothing
});

test("the school report lists the finished attempts of students who joined; leaving takes them out of it", () => {
  const { store, minutes } = setup();
  assert.deepEqual(store.report(), { school: null, rows: [] });
  store.joinSchool("DEMO-001");
  const a = store.start(PAPER).session; store.addPhoto(a.id, photo()); store.addPhoto(a.id, photo()); minutes(142); store.submit(a.id);
  const b = store.start({ ...PAPER, subject: "Physics" }).session; minutes(200); store.current(); // expires: 90 + 30 < 200
  const c = store.start({ ...PAPER, subject: "Chemistry" }).session; store.cancel(c.id);
  store.start({ ...PAPER, subject: "Biology" }); // still running
  const { school, rows } = store.report();
  assert.equal(school.name, "Demo High School");
  assert.deepEqual(rows.map((r) => [r.subject, r.status, r.minutes, r.photos]).sort(), [["Mathematics", "submitted", 142, 2], ["Physics", "expired", null, 0]].sort());
  assert.equal(rows[0].student, "Sophea Chan");
  assert.equal(rows[0].grade, "12");
  assert.equal(rows.find((r) => r.subject === "Mathematics").limitMin, 150); // so the report can compare with the official time
  assert.equal(rows.every((r) => r.sample === false), true);
  store.leaveSchool();
  assert.deepEqual(store.report(), { school: null, rows: [] });
});

test("an attempt started before joining a school is never shared with it", () => {
  const { store, minutes } = setup();
  const a = store.start(PAPER).session; store.addPhoto(a.id, photo()); minutes(100); store.submit(a.id);
  store.joinSchool("DEMO-001");
  assert.equal(store.report().rows.length, 0);
});

test("sample data for demonstrations: needs a school, is labelled as sample, is the same every time and can be removed", () => {
  const { store } = setup();
  assert.equal(store.loadSample().error, "join_first");
  store.joinSchool("DEMO-001");
  assert.equal(store.loadSample().ok, true);
  const rows = store.report().rows;
  assert.ok(rows.length >= 30);
  assert.equal(rows.every((r) => r.sample === true && r.status === "submitted" && r.minutes > 0), true);
  assert.ok(new Set(rows.map((r) => r.student)).size >= 10);
  const again = setup(); again.store.joinSchool("DEMO-001"); again.store.loadSample();
  assert.deepEqual(again.store.report().rows, rows);
  assert.equal(store.clearSample().ok, true);
  assert.equal(store.report().rows.length, 0);
});

test("the spreadsheet has one line per attempt, quotes what needs quoting, keeps Khmer, and cannot run formulas", () => {
  const csv = reportToCsv({ code: "DEMO-001", name: "Demo High School" }, [
    { student: "Sophea Chan", grade: "12", track: "science", subject: "Mathematics", year: 2024, minutes: 142, status: "submitted", startedAt: T0, photos: 2, sample: false },
    { student: 'Kim "Dara", Pich', grade: "11", track: "social_science", subject: "History", year: 2023, minutes: null, status: "expired", startedAt: T0, photos: 0, sample: true },
    { student: "=HYPERLINK(\"http://x\")", grade: "12", track: "science", subject: "Physics", year: 2025, minutes: 70, status: "submitted", startedAt: T0, photos: 1, sample: false },
    { student: "សុភា", grade: "12", track: "science", subject: "Biology", year: 2025, minutes: 80, status: "submitted", startedAt: T0, photos: 1, sample: false },
  ]);
  const lines = csv.replace(/^﻿/, "").split("\r\n");
  assert.equal(csv.charCodeAt(0), 0xfeff); // a byte-order mark so Excel opens Khmer correctly
  assert.equal(lines[0], "school_code,school,student,grade,track,paper,year,started_at,minutes,status,photos,sample");
  assert.equal(lines[1], "DEMO-001,Demo High School,Sophea Chan,12,science,Mathematics,2024,2026-10-24T03:00:00.000Z,142,submitted,2,");
  assert.ok(lines[2].includes('"Kim ""Dara"", Pich"'));
  assert.ok(lines[2].endsWith(",,expired,0,sample"));
  assert.ok(lines[3].includes("\"'=HYPERLINK(\"\"http://x\"\")\""));
  assert.ok(lines[4].includes("សុភា"));
  assert.equal(lines.length, 5);
});

test("a corrupt or missing saved copy starts empty, and a full storage never throws", () => {
  const bad = memory(); bad.setItem("k", "{not json");
  const s1 = setup({ storage: bad });
  assert.equal(s1.store.current(), null);
  assert.equal(s1.store.start(PAPER).ok, true);

  const full = { getItem: () => null, setItem: () => { throw new Error("QuotaExceededError"); }, removeItem() {} };
  const s2 = setup({ storage: full });
  assert.doesNotThrow(() => s2.store.start(PAPER));
});
