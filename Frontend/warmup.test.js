/* The daily warm-up's rules: which three questions, how progress is kept, and when the gate is needed.
   Run with:  node --test Frontend/warmup.test.js */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  WARMUP_COUNT, seedFrom, seededRandom, isWarmupQuestion, wasPractised, practisedPool, pickWarmupQuestions, starterQuestions, STARTER_SLOT,
  newWarmup, recordWarmupAnswer, warmupAnswered, warmupFinished, finishWarmup, warmupScore, warmupCurrentIndex,
  loadWarmup, saveWarmup, needsWarmup,
} from "./warmup.js";

const q = (id, subject, topic, difficulty = "Easy") => ({ id, subject, topic, difficulty, options: ["a", "b", "c"], answer: "a" });
const bank = [
  q("Math-1", "Math", "Limits"), q("Math-2", "Math", "Limits", "Hard"), q("Math-3", "Math", "Derivatives"),
  q("Math-4", "Math", "Integrals"), q("Phys-1", "Physics", "Kinematics"), q("Phys-2", "Physics", "Optics", "Medium"),
];
const lookup = (id) => bank.find((e) => e.id === id) ?? null;
// What the student did in Practice: { [id]: { status, result, at } }
const done = (result, at) => ({ status: result === "correct" ? "completed" : "in_progress", result, at });
const everything = Object.fromEntries(bank.map((e, i) => [e.id, done(i % 2 ? "incorrect" : "correct", 100 + i)]));
const pool = practisedPool(everything, lookup);
const topicOf = (s) => bank.find((e) => e.id === s.id).topic;

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

test("a question counts as practised when it was answered, not when merely opened or ticked", () => {
  assert.equal(wasPractised({ status: "completed", result: "correct" }), true);
  assert.equal(wasPractised({ status: "in_progress", result: "incorrect" }), true);   // answered wrong: the best thing to review
  assert.equal(wasPractised({ status: "completed", result: null }), false);           // an old manual Completed tick: no answer behind it
  assert.equal(wasPractised({ status: "in_progress", result: null }), false);         // opened, never answered
  assert.equal(wasPractised({ status: "pending" }), false);
  assert.equal(wasPractised(undefined), false);
});

test("the pool holds only what the student has practised, never new questions", () => {
  const practice = { "Math-1": done("correct", 1), "Math-3": done("incorrect", 2), "Phys-1": { status: "in_progress", result: null }, "Gone-9": done("correct", 3) };
  assert.deepEqual(practisedPool(practice, lookup).map((e) => e.id).sort(), ["Math-1", "Math-3"]);
  assert.deepEqual(practisedPool({}, lookup), []);
  assert.deepEqual(practisedPool(null, lookup), []);
});

test("only the student's own subjects are used", () => {
  const ids = (subjects) => practisedPool(everything, lookup, subjects).map((e) => e.id);
  assert.deepEqual(ids(new Set(["Physics"])).sort(), ["Phys-1", "Phys-2"]);
  assert.equal(ids(null).length, bank.length);
});

test("a question that cannot be asked as multiple choice is left out even when practised", () => {
  const typed = { id: "T-1", subject: "Math", topic: "Limits", answer: "x" };
  assert.deepEqual(practisedPool({ "T-1": done("correct", 1) }, (id) => (id === "T-1" ? typed : null)), []);
});

test("three questions from three different topics, the same three for the same seed", () => {
  const one = pickWarmupQuestions({ pool, practice: everything, seed: "ana|2026-11-01" });
  const again = pickWarmupQuestions({ pool, practice: everything, seed: "ana|2026-11-01" });
  assert.equal(one.length, WARMUP_COUNT);
  assert.deepEqual(one, again);
  assert.equal(new Set(one.map(topicOf)).size, WARMUP_COUNT);
  assert.deepEqual(one.map((s) => s.slot).slice(0, 2), ["weak", "review"]);
});

test("every picked question was practised, whatever the seed", () => {
  const practice = { "Math-1": done("correct", 1), "Math-3": done("incorrect", 2), "Phys-2": done("correct", 3) };
  const small = practisedPool(practice, lookup);
  for (let day = 1; day <= 25; day++) {
    const picked = pickWarmupQuestions({ pool: small, practice, seed: `ana|2026-11-${day}` });
    assert.ok(picked.every((s) => practice[s.id]), "a question the student never did was asked");
  }
});

test("the first question comes from the weakest topic, the second from the one practised longest ago, the third is a miss", () => {
  const practice = {
    "Math-1": done("correct", 300), "Math-3": done("correct", 200), "Math-4": done("correct", 100),
    "Phys-1": done("correct", 400), "Phys-2": done("incorrect", 250),
  };
  const mastery = {
    Math: { Limits: { score: 90, lastPracticedAt: 300 }, Derivatives: { score: 35, lastPracticedAt: 200 }, Integrals: { score: 80, lastPracticedAt: 100 } },
    Physics: { Kinematics: { score: 70, lastPracticedAt: 400 }, Optics: { score: 60, lastPracticedAt: 250 } },
  };
  const picked = pickWarmupQuestions({ pool: practisedPool(practice, lookup), mastery, practice, seed: "ana|2026-11-01" });
  assert.deepEqual(picked.map(topicOf), ["Derivatives", "Integrals", "Optics"]);   // lowest score, then oldest, then the miss
  assert.deepEqual(picked.map((s) => s.slot), ["weak", "review", "missed"]);
});

test("inside a topic, a question last answered wrong comes first, then the one done longest ago", () => {
  const two = (a, b) => ({ "Math-1": a, "Math-2": b });
  const only = (practice) => pickWarmupQuestions({ pool: practisedPool(practice, lookup), practice, seed: "s", count: 1 })[0].id;
  assert.equal(only(two(done("correct", 50), done("incorrect", 90))), "Math-2", "the miss, though it is newer");
  assert.equal(only(two(done("correct", 50), done("correct", 90))), "Math-1", "the older one");
  assert.equal(only(two(done("incorrect", 50), done("incorrect", 90))), "Math-1", "both missed: the older one");
});

test("with nothing missed, the third question is another practised one", () => {
  const practice = { "Math-1": done("correct", 1), "Math-3": done("correct", 2), "Math-4": done("correct", 3), "Phys-1": done("correct", 4) };
  const picked = pickWarmupQuestions({ pool: practisedPool(practice, lookup), practice, seed: "s" });
  assert.equal(picked.length, 3);
  assert.equal(picked[2].slot, "again");
  assert.equal(new Set(picked.map(topicOf)).size, 3, "a different topic while there is one");
});

test("a small practice history still gives as many questions as there are, and none gives none", () => {
  const one = { "Math-1": done("correct", 1) };
  assert.equal(pickWarmupQuestions({ pool: practisedPool(one, lookup), practice: one, seed: "s" }).length, 1);
  const sameTopic = { "Math-1": done("correct", 1), "Math-2": done("incorrect", 2) };
  const ids = pickWarmupQuestions({ pool: practisedPool(sameTopic, lookup), practice: sameTopic, seed: "s" }).map((x) => x.id);
  assert.deepEqual(ids.sort(), ["Math-1", "Math-2"], "one topic: both questions, never the same one twice");
  assert.equal(pickWarmupQuestions({ pool: [], practice: {}, seed: "s" }).length, 0);
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

// ── Starter questions: a student with nothing practised yet still gets a warm-up ──
const starterBank = [
  ...bank,
  q("Math-5", "Math", "Limits", "Easy"), q("Math-6", "Math", "Derivatives", "Hard"), q("Phys-3", "Physics", "Kinematics", "Easy"),
  { id: "Math-7", subject: "Math", topic: "Open", difficulty: "Easy", options: [], answer: "" }, // not multiple choice
];

test("starter questions: up to three, easy ones first, from different topics", () => {
  const picks = starterQuestions({ pool: starterBank, seed: "ana|2026-11-05" });
  assert.equal(picks.length, WARMUP_COUNT);
  assert.ok(picks.every((p) => p.slot === STARTER_SLOT));
  const found = picks.map((p) => starterBank.find((e) => e.id === p.id));
  assert.ok(found.every((e) => e.difficulty === "Easy"), "easy questions are used while there are enough");
  assert.equal(new Set(found.map((e) => `${e.subject}|${e.topic}`)).size, WARMUP_COUNT, "each from its own topic");
});

test("starter questions are the same all day and differ between days", () => {
  const a = starterQuestions({ pool: starterBank, seed: "ana|2026-11-05" });
  assert.deepEqual(a, starterQuestions({ pool: starterBank, seed: "ana|2026-11-05" }));
  const days = new Set(["2026-11-05", "2026-11-06", "2026-11-07", "2026-11-08"].map((d) => JSON.stringify(starterQuestions({ pool: starterBank, seed: `ana|${d}` }))));
  assert.ok(days.size > 1);
});

test("starter questions skip questions that are not multiple choice, and an empty bank gives none", () => {
  const picks = starterQuestions({ pool: starterBank, seed: "x", count: 20 });
  assert.ok(!picks.some((p) => p.id === "Math-7"));
  assert.deepEqual(starterQuestions({ pool: [], seed: "x" }), []);
});

test("starter questions top up with harder ones when there are not enough easy topics", () => {
  const small = [q("A-1", "Math", "Limits", "Easy"), q("A-2", "Math", "Limits", "Hard"), q("A-3", "Math", "Limits", "Medium")];
  const picks = starterQuestions({ pool: small, seed: "x" });
  assert.deepEqual(picks.map((p) => p.id), ["A-1", "A-3", "A-2"]);
});

test("with nothing practised there is no review but there are starter questions", () => {
  assert.equal(pickWarmupQuestions({ pool: practisedPool({}, lookup), seed: "x" }).length, 0);
  assert.equal(starterQuestions({ pool: bank, seed: "x" }).length, WARMUP_COUNT);
});
