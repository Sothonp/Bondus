/* Today's exercises: which Mathematics questions the dashboard offers, and that the list holds still for the day.
   Run with:  node --test Frontend/todaysExercises.test.js */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  TODAY_COUNT, MAX_RETRIES, MAX_WEAK, WEAK_BELOW, openQuestions, pickTodaysExercises, loadToday, saveToday, todaysExercises,
} from "./todaysExercises.js";

const ex = (id, topic, chapter, chapterOrder, extra = {}) => ({ id, subject: "Mathematics", topic, chapter, chapterOrder, difficulty: "Easy", ...extra });
// Chapter A (open), B (opens when A is passed), C. Ten questions in A, so five picks do not run it dry.
const A = Array.from({ length: 10 }, (_, i) => ex(`M-${i + 1}`, ["Limits", "Series", "Sums"][i % 3], "A", 1));
const B = [ex("M-11", "Derivatives", "B", 2), ex("M-12", "Derivatives", "B", 2)];
const C = [ex("M-13", "Integrals", "C", 3)];
const bank = [...A, ...B, ...C];
const rec = (result, at = 1) => ({ status: result === "correct" ? "completed" : "in_progress", result, at, xpAwarded: result === "correct" });
const ids = (picks) => picks.map((p) => p.id);
const pick = (extra = {}) => pickTodaysExercises({ list: bank, ...extra });

test("a student with no progress is sent to the start of the first chapter", () => {
  // Breaks if: a new student gets an empty card, or a question from a locked chapter.
  const picks = pick();
  assert.equal(picks.length, TODAY_COUNT);
  assert.deepEqual(ids(picks), ["M-1", "M-2", "M-3", "M-4", "M-5"]);
  assert.ok(picks.every((p) => p.reason === "next"));
});

test("questions in a locked chapter are never offered", () => {
  // Breaks if: a tap would open a chapter the student has not unlocked (the Practice screen refuses it and shows the list).
  const everyIdOpen = ids(pickTodaysExercises({ list: bank, count: 50 }));
  assert.ok(!everyIdOpen.some((id) => ["M-11", "M-12", "M-13"].includes(id)));
});

test("a chapter opens the picks to the next one once the quiz of the one before is passed", () => {
  const progress = { A: { passed: true, attempts: 1 } };
  const all = ids(pickTodaysExercises({ list: bank, progress, count: 50 }));
  assert.ok(all.includes("M-11") && all.includes("M-1"));
  assert.ok(!all.includes("M-13"), "chapter C is still locked");
});

test("a question answered wrong comes first, the oldest miss first, at most MAX_RETRIES of them", () => {
  // Breaks if: a miss is forgotten, or misses crowd out everything else.
  const practice = { "M-4": rec("incorrect", 50), "M-2": rec("incorrect", 10), "M-7": rec("incorrect", 30) };
  const picks = pick({ practice });
  assert.deepEqual(picks.filter((p) => p.reason === "retry").map((p) => p.id), ["M-2", "M-7"]);
  assert.equal(MAX_RETRIES, 2);
  assert.equal(picks.length, TODAY_COUNT);
});

test("a question answered right is never offered again", () => {
  // Breaks if: finished work comes back.
  const practice = { "M-1": rec("correct"), "M-2": rec("correct"), "M-3": rec("correct") };
  assert.deepEqual(ids(pick({ practice })), ["M-4", "M-5", "M-6", "M-7", "M-8"]);
});

test("a topic scoring below the weak line is picked, the weakest first, one question per topic", () => {
  // Breaks if: weak topics are ignored, or one weak topic fills the whole list.
  const mastery = { Mathematics: { Sums: { score: 20 }, Series: { score: 50 }, Limits: { score: 95 } } };
  const picks = pick({ mastery });
  assert.deepEqual(picks.filter((p) => p.reason === "weak").map((p) => p.id), ["M-3", "M-2"]); // Sums then Series, their first questions
  assert.equal(picks[0].reason, "weak");
  assert.equal(picks.length, TODAY_COUNT);
  assert.equal(new Set(ids(picks)).size, picks.length);
});

test("a topic at or above the weak line is not called weak, and at most MAX_WEAK are", () => {
  const mastery = { Mathematics: { Limits: { score: WEAK_BELOW }, Series: { score: WEAK_BELOW + 1 }, Sums: { score: 5 } } };
  assert.deepEqual(pick({ mastery }).filter((p) => p.reason === "weak").map((p) => p.id), ["M-3"]);
  const many = Array.from({ length: 6 }, (_, i) => ex(`T-${i}`, `Topic ${i}`, "A", 1));
  const scored = Object.fromEntries(many.map((e, i) => [e.topic, { score: i }]));
  const picks = pickTodaysExercises({ list: many, mastery: { Mathematics: scored }, count: 6 });
  assert.equal(picks.filter((p) => p.reason === "weak").length, MAX_WEAK);
});

test("misses, weak topics and the next questions are mixed, in that order, without repeats", () => {
  const practice = { "M-1": rec("incorrect", 5), "M-2": rec("correct") };
  const mastery = { Mathematics: { Sums: { score: 10 } } };
  const picks = pick({ practice, mastery });
  assert.deepEqual(picks.map((p) => p.reason), ["retry", "weak", "next", "next", "next"]);
  assert.equal(new Set(ids(picks)).size, picks.length);
});

test("a chapter's formula quiz (stage 0) comes before its problems", () => {
  const list = [ex("S-1", "T", "A", 1), ex("S-2", "T", "A", 1, { stage: 0 }), ex("S-3", "T", "A", 1)];
  assert.deepEqual(ids(pickTodaysExercises({ list })), ["S-2", "S-1", "S-3"]);
  assert.deepEqual(ids(openQuestions(list)), ["S-2", "S-1", "S-3"]);
});

test("a subject with no chapters is one list", () => {
  const list = [{ id: "H-1", subject: "History", topic: "x" }, { id: "H-2", subject: "History", topic: "y" }];
  assert.deepEqual(ids(pickTodaysExercises({ list })), ["H-1", "H-2"]);
});

test("when everything open is finished there is nothing to pick", () => {
  // Breaks if: the card invents work, instead of saying the student is caught up.
  const practice = Object.fromEntries(A.map((e) => [e.id, rec("correct")]));
  assert.deepEqual(pickTodaysExercises({ list: A, practice }), []);
});

test("the same progress always gives the same list", () => {
  const mastery = { Mathematics: { Sums: { score: 10 } } };
  assert.deepEqual(pick({ mastery }), pick({ mastery }));
});

/* ── kept for the day ──────────────────────────────────────────────────────────────────────────────────────────── */

const memoryStorage = () => { const data = new Map(); return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, v), data }; };

test("the list is chosen once a day and then held still while the student answers", () => {
  // Breaks if: a finished question drops off the list and a new one slides in under the student's thumb.
  const storage = memoryStorage();
  const first = todaysExercises({ storage, userKey: "u1", day: "2026-11-06", list: bank });
  const afterAnswering = todaysExercises({ storage, userKey: "u1", day: "2026-11-06", list: bank, practice: Object.fromEntries(first.map((p) => [p.id, rec("correct")])) });
  assert.deepEqual(afterAnswering, first);
});

test("a new day gets a new list", () => {
  const storage = memoryStorage();
  const monday = todaysExercises({ storage, userKey: "u1", day: "2026-11-06", list: bank });
  const next = todaysExercises({ storage, userKey: "u1", day: "2026-11-07", list: bank, practice: Object.fromEntries(monday.map((p) => [p.id, rec("correct")])) });
  assert.ok(next.every((p) => !ids(monday).includes(p.id)));
});

test("two students on one device keep separate lists", () => {
  const storage = memoryStorage();
  todaysExercises({ storage, userKey: "u1", day: "d", list: bank });
  assert.equal(loadToday(storage, "u2", "d"), null);
});

test("a question the bank no longer has is dropped from the kept list, and an emptied list is chosen again", () => {
  const storage = memoryStorage();
  saveToday(storage, "u1", "d", [{ id: "GONE-1", reason: "next" }, { id: "M-1", reason: "next" }]);
  assert.deepEqual(todaysExercises({ storage, userKey: "u1", day: "d", list: bank, exists: (id) => id !== "GONE-1" }), [{ id: "M-1", reason: "next" }]);
  saveToday(storage, "u1", "d", [{ id: "GONE-1", reason: "next" }]);
  assert.equal(todaysExercises({ storage, userKey: "u1", day: "d", list: bank, exists: (id) => id !== "GONE-1" }).length, TODAY_COUNT);
});

test("nothing is kept when there was nothing to pick, so a later pick (after progress loads) still happens", () => {
  const storage = memoryStorage();
  assert.deepEqual(todaysExercises({ storage, userKey: "u1", day: "d", list: [] }), []);
  assert.equal(storage.data.size, 0);
});

test("damaged or blocked storage never stops the list from appearing", () => {
  assert.equal(loadToday({ getItem: () => "{not json" }, "u", "d"), null);
  assert.equal(loadToday({ getItem: () => JSON.stringify({ day: "d", picks: [{ id: 3 }] }) }, "u", "d"), null);
  assert.equal(loadToday({ getItem() { throw new Error("blocked"); } }, "u", "d"), null);
  saveToday({ setItem() { throw new Error("full"); } }, "u", "d", []);
  assert.equal(todaysExercises({ storage: null, userKey: "u", day: "d", list: bank }).length, TODAY_COUNT);
});
