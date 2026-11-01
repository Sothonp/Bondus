/* The daily warm-up's rules: which three questions, how progress is kept, and when the gate is needed.
   Run with:  node --test Frontend/warmup.test.js */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  WARMUP_COUNT, seedFrom, seededRandom, isWarmupQuestion, pickWarmupQuestions,
  newWarmup, recordWarmupAnswer, warmupAnswered, warmupFinished, finishWarmup, warmupScore, warmupCurrentIndex,
  loadWarmup, saveWarmup, needsWarmup,
} from "./warmup.js";

const q = (id, subject, topic, difficulty = "Easy") => ({ id, subject, topic, difficulty, options: ["a", "b", "c"], answer: "a" });
const pool = [
  q("Math-1", "Math", "Limits"), q("Math-2", "Math", "Limits", "Hard"), q("Math-3", "Math", "Derivatives"),
  q("Math-4", "Math", "Integrals"), q("Phys-1", "Physics", "Kinematics"), q("Phys-2", "Physics", "Optics", "Medium"),
];

test("the same text always gives the same seed and the same random run", () => {
  assert.equal(seedFrom("ana|2026-11-01"), seedFrom("ana|2026-11-01"));
  assert.notEqual(seedFrom("ana|2026-11-01"), seedFrom("ana|2026-11-02"));
  const a = seededRandom(7), b = seededRandom(7);
  assert.deepEqual([a(), a(), a()], [b(), b(), b()]);
  assert.ok([a(), a(), a()].every((n) => n >= 0 && n < 1));
});

test("only multiple-choice questions whose answer is among the options can be asked", () => {
  assert.equal(isWarmupQuestion(q("x", "S", "T")), true);
  assert.equal(isWarmupQuestion({ id: "x", answer: "a" }), false);                              // type-in question
  assert.equal(isWarmupQuestion({ id: "x", options: ["a"], answer: "a" }), false);              // nothing to choose
  assert.equal(isWarmupQuestion({ id: "x", options: ["a", "b"], answer: "z" }), false);         // answer not offered
});

test("three questions from three different topics, the same three for the same seed", () => {
  const one = pickWarmupQuestions({ pool, seed: "ana|2026-11-01" });
  const again = pickWarmupQuestions({ pool, seed: "ana|2026-11-01" });
  assert.equal(one.length, WARMUP_COUNT);
  assert.deepEqual(one, again);
  const topics = one.map((s) => pool.find((e) => e.id === s.id).topic);
  assert.equal(new Set(topics).size, WARMUP_COUNT);
  assert.deepEqual(one.map((s) => s.slot), ["weak", "review", "fresh"]);
});

test("the first question comes from the weakest topic and the second from the one practised longest ago", () => {
  const mastery = {
    Math: { Limits: { score: 90, lastPracticedAt: 300 }, Derivatives: { score: 35, lastPracticedAt: 200 }, Integrals: { score: 80, lastPracticedAt: 100 } },
    Physics: { Kinematics: { score: 70, lastPracticedAt: 400 } },
  };
  const picked = pickWarmupQuestions({ pool, mastery, seed: "ana|2026-11-01" });
  const topicOf = (s) => pool.find((e) => e.id === s.id).topic;
  assert.equal(topicOf(picked[0]), "Derivatives");   // lowest score
  assert.equal(topicOf(picked[1]), "Integrals");     // oldest practice among the rest
  assert.equal(topicOf(picked[2]) === "Optics", true); // the one topic never assessed
});

test("a warm-up prefers easy and medium questions when the topic has them", () => {
  for (let day = 1; day <= 20; day++) {
    const picked = pickWarmupQuestions({ pool, seed: `ana|2026-11-${day}` });
    assert.ok(!picked.some((s) => s.id === "Math-2"), "the hard Limits question is skipped while an easy one exists");
  }
});

test("a small pool still gives as many questions as it can, and an empty one gives none", () => {
  assert.equal(pickWarmupQuestions({ pool: pool.slice(0, 2), seed: "s" }).length, 2);
  assert.equal(pickWarmupQuestions({ pool: [], seed: "s" }).length, 0);
  assert.equal(pickWarmupQuestions({ pool: [{ id: "t", subject: "S", topic: "T", answer: "x" }], seed: "s" }).length, 0);
  const ids = pickWarmupQuestions({ pool: pool.slice(0, 3), seed: "s" }).map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length, "never the same question twice");
});

test("progress records each answer once, resumes at the first unanswered question and scores itself", () => {
  let s = newWarmup("2026-11-01", [{ id: "a", slot: "weak" }, { id: "b", slot: "review" }, { id: "c", slot: "fresh" }]);
  assert.equal(warmupCurrentIndex(s), 0);
  s = recordWarmupAnswer(s, "a", true);
  s = recordWarmupAnswer(s, "a", false);                    // a repeat changes nothing
  assert.equal(warmupAnswered(s), 1);
  assert.equal(warmupCurrentIndex(s), 1);
  s = recordWarmupAnswer(s, "b", false);
  assert.equal(warmupFinished(s), false);
  s = recordWarmupAnswer(s, "c", true);
  assert.equal(warmupFinished(s), true);
  assert.equal(warmupCurrentIndex(s), 2);                   // stays on the last question for the summary
  assert.deepEqual(warmupScore(s), { correct: 2, total: 3 });
  const done = finishWarmup(s, 123);
  assert.equal(done.doneAt, 123);
  assert.equal(finishWarmup(done, 999).doneAt, 123);        // finishing twice keeps the first time
});

const memoryStorage = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };

test("progress is saved per student and only returned for the same day", () => {
  const storage = memoryStorage();
  const s = recordWarmupAnswer(newWarmup("2026-11-01", [{ id: "a", slot: "weak" }]), "a", true);
  saveWarmup(storage, "ana", s);
  assert.deepEqual(loadWarmup(storage, "ana", "2026-11-01"), s);
  assert.equal(loadWarmup(storage, "ana", "2026-11-02"), null, "yesterday's progress is not today's");
  assert.equal(loadWarmup(storage, "bora", "2026-11-01"), null, "another student's progress is never shown");
});

test("broken or missing storage never throws, it just means no saved progress", () => {
  assert.equal(loadWarmup(null, "ana", "2026-11-01"), null);
  const bad = memoryStorage(); bad.setItem("bondus.warmup.v1:ana", "{not json");
  assert.equal(loadWarmup(bad, "ana", "2026-11-01"), null);
  const odd = memoryStorage(); odd.setItem("bondus.warmup.v1:ana", JSON.stringify({ day: "2026-11-01", slots: [1], answers: [] }));
  assert.equal(loadWarmup(odd, "ana", "2026-11-01"), null);
  assert.doesNotThrow(() => saveWarmup({ setItem() { throw new Error("full"); } }, "ana", newWarmup("d", [])));
  assert.doesNotThrow(() => saveWarmup(null, "ana", newWarmup("d", [])));
});

const base = { eligible: true, hasQuestions: true, serverMode: true, summary: { warmupDoneToday: false }, today: "2026-11-01", state: null, studiedToday: false };

test("with the server, the gate follows the summary's warmupDoneToday", () => {
  assert.equal(needsWarmup(base), true);
  assert.equal(needsWarmup({ ...base, summary: { warmupDoneToday: true } }), false);
});

test("the gate stays open while the summary loads and with an older backend that sends no field", () => {
  assert.equal(needsWarmup({ ...base, summary: null }), false);
  assert.equal(needsWarmup({ ...base, summary: { streak: 3 } }), false);
});

test("finishing on this device counts at once, even before the server has heard", () => {
  const done = { ...newWarmup("2026-11-01", [{ id: "a", slot: "weak" }]), doneAt: 5 };
  assert.equal(needsWarmup({ ...base, state: done }), false);
  assert.equal(needsWarmup({ ...base, today: "2026-11-02", state: done }), true, "but not the next day");
});

test("nobody is gated who is not a BAC II student, or when there is nothing to ask", () => {
  assert.equal(needsWarmup({ ...base, eligible: false }), false);
  assert.equal(needsWarmup({ ...base, hasQuestions: false }), false);
});

test("without a server, a student who already studied today is not interrupted", () => {
  const local = { ...base, serverMode: false, summary: null };
  assert.equal(needsWarmup(local), true);
  assert.equal(needsWarmup({ ...local, studiedToday: true }), false);
});

test("without a server, a warm-up that was started must be finished even though its first answer counts as studying", () => {
  const started = recordWarmupAnswer(newWarmup("2026-11-01", [{ id: "a", slot: "weak" }, { id: "b", slot: "review" }]), "a", true);
  const local = { ...base, serverMode: false, summary: null, studiedToday: true };
  assert.equal(needsWarmup({ ...local, state: started }), true);
  assert.equal(needsWarmup({ ...local, state: finishWarmup(started) }), false);
  assert.equal(needsWarmup({ ...local, today: "2026-11-02", state: started }), false, "yesterday's unfinished warm-up is forgotten");
});

test("the flame and streak at the start are kept with the progress", () => {
  const storage = memoryStorage();
  const s = newWarmup("2026-11-01", [{ id: "a", slot: "weak" }], { flame: "dormant", streak: 12 });
  assert.deepEqual(s.before, { flame: "dormant", streak: 12 });
  saveWarmup(storage, "ana", s);
  assert.deepEqual(loadWarmup(storage, "ana", "2026-11-01").before, { flame: "dormant", streak: 12 });
  assert.equal(newWarmup("d", []).before, null);
});
