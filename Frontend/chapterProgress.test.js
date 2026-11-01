/* The chapter path's rules: order, which chapters are open and why a locked one is locked.
   Run with:  node --test Frontend/chapterProgress.test.js */
import { test } from "node:test";
import assert from "node:assert/strict";
import { chapterKeys, chapterStates, chaptersPassed, isSolved, isAnswered } from "./chapterProgress.js";
import { PASS_PERCENT, MASTER_PERCENT } from "./progressionConfig.js";

// A subject: chapter "A" has 10 questions, "B" 10, "C" 4. Ids are A-1 ... A-10, B-1 ... C-4.
const make = (chapter, n, extra = {}) => Array.from({ length: n }, (_, i) => ({ id: `${chapter}-${i + 1}`, chapter, ...extra }));
const list = [...make("A", 10), ...make("B", 10), ...make("C", 4)];
// The practice record: the first `n` questions of a chapter answered correctly.
const solve = (chapter, n) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`${chapter}-${i + 1}`, { status: "completed", result: "correct", xpAwarded: true }]));
const states = (practice) => chapterStates(list, practice).map((r) => r.state);

test("the thresholds are 70 and 85 and live in one config", () => {
  assert.equal(PASS_PERCENT, 70);
  assert.equal(MASTER_PERCENT, 85);
});

test("chapters keep their authored order, unless every chapter has a chapterOrder", () => {
  assert.deepEqual(chapterKeys([...make("B", 1), ...make("A", 1)]), ["B", "A"]);
  assert.deepEqual(chapterKeys([...make("B", 1, { chapterOrder: 2 }), ...make("A", 1, { chapterOrder: 1 })]), ["A", "B"]);
  // One chapter without a number: nothing is re-sorted, so a half-numbered bank cannot scramble the path.
  assert.deepEqual(chapterKeys([...make("B", 1, { chapterOrder: 2 }), ...make("A", 1)]), ["B", "A"]);
});

test("a subject with no chapters has no path", () => {
  assert.deepEqual(chapterKeys([{ id: "x-1" }, { id: "x-2" }]), []);
  assert.deepEqual(chapterStates([{ id: "x-1" }], {}), []);
});

test("a new student has the first chapter open and every other one locked", () => {
  assert.deepEqual(states({}), ["available", "locked", "locked"]);
});

test("a locked chapter says which chapter blocks it and how many more questions open it", () => {
  const rows = chapterStates(list, solve("A", 4));
  assert.deepEqual([rows[1].blockedBy, rows[1].needed], ["A", 3], "7 of 10 are needed, 4 are solved");
  assert.deepEqual([rows[2].blockedBy, rows[2].needed], ["B", 7], "chapter C waits on B, which has nothing solved");
  assert.deepEqual([rows[0].blockedBy, rows[0].needed], [null, 0]);
});

test("exactly 70% opens the next chapter, one question short does not", () => {
  assert.deepEqual(states(solve("A", 6)), ["inProgress", "locked", "locked"]);
  assert.deepEqual(states(solve("A", 7)), ["passed", "available", "locked"]);
});

test("exactly 85% is Mastered, one question short is only Passed", () => {
  const eight = chapterStates(list, solve("A", 8))[0];
  assert.equal(eight.state, "passed");       // 80%
  const small = [...make("S", 20)];
  assert.equal(chapterStates(small, solve("S", 17))[0].state, "mastered"); // 17 of 20 = 85%
  assert.equal(chapterStates(small, solve("S", 16))[0].state, "passed");   // 80%
});

test("a small chapter needs the whole number of questions that makes 70%", () => {
  // C has 4 questions: 3 of 4 is 75%, 2 of 4 is 50%.
  const withB = { ...solve("A", 10), ...solve("B", 10) };
  assert.equal(chapterStates(list, { ...withB, ...solve("C", 2) })[2].state, "inProgress");
  assert.equal(chapterStates(list, { ...withB, ...solve("C", 3) })[2].state, "passed");
});

test("passing a chapter opens only the next one, not the ones after it", () => {
  assert.deepEqual(states({ ...solve("A", 10), ...solve("B", 7) }), ["mastered", "passed", "available"]);
  assert.deepEqual(states({ ...solve("A", 10) }), ["mastered", "available", "locked"]);
});

test("a manual Completed tick unlocks nothing: only a graded correct answer counts", () => {
  const ticked = Object.fromEntries(list.filter((e) => e.chapter === "A").map((e) => [e.id, { status: "completed", result: null, xpAwarded: false }]));
  assert.deepEqual(states(ticked), ["available", "locked", "locked"]);
  assert.equal(isSolved({ status: "completed", result: null }), false);
  assert.equal(isAnswered({ status: "completed", result: null }), false);
});

test("a wrong answer later does not take a solved question back, so a passed chapter never closes the next one", () => {
  const before = solve("A", 7);
  const afterMiss = { ...before, "A-1": { status: "in_progress", result: "incorrect", xpAwarded: true } };
  assert.deepEqual(states(afterMiss), ["passed", "available", "locked"]);
  assert.equal(isSolved(afterMiss["A-1"]), true);
});

test("a question answered wrong and never right counts as answered, not solved", () => {
  const wrong = { "A-1": { status: "in_progress", result: "incorrect", xpAwarded: false } };
  assert.equal(isAnswered(wrong["A-1"]), true);
  assert.equal(isSolved(wrong["A-1"]), false);
  assert.deepEqual(states(wrong), ["inProgress", "locked", "locked"]);
});

test("a student who already answered in a later chapter keeps every chapter before it open", () => {
  // Answered 2 questions in B but never passed A: A and B are open (they were reachable before), C is still locked.
  const rows = chapterStates(list, { ...solve("A", 3), ...solve("B", 2) });
  assert.deepEqual(rows.map((r) => r.state), ["inProgress", "inProgress", "locked"]);
  // Having worked in C opens everything up to C.
  assert.deepEqual(states({ "C-1": { status: "in_progress", result: "incorrect", xpAwarded: false } }), ["available", "available", "inProgress"]);
});

test("progress outside the subject, or for unknown questions, changes nothing", () => {
  assert.deepEqual(states({ "Z-1": { xpAwarded: true, result: "correct" }, "A-99": { xpAwarded: true, result: "correct" } }), ["available", "locked", "locked"]);
  assert.deepEqual(states(null), ["available", "locked", "locked"]);
});

test("the summary counts passed and mastered chapters", () => {
  assert.equal(chaptersPassed(chapterStates(list, {})), 0);
  assert.equal(chaptersPassed(chapterStates(list, { ...solve("A", 10), ...solve("B", 7) })), 2);
});

test("each row reports its size, rounded percent and how many more questions Pass needs", () => {
  const row = chapterStates(list, solve("A", 7))[0];
  assert.deepEqual([row.total, row.solved, row.answered, row.percent, row.toPass], [10, 7, 7, 70, 0]);
  assert.equal(chapterStates(list, solve("A", 2))[0].toPass, 5);
  assert.equal(chapterStates(list, {})[2].toPass, 3, "even a locked chapter knows its own distance");
  assert.equal(chapterStates(list, solve("C", 1))[2].percent, 25);
});
