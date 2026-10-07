/* Tests for the question order inside a practice set (Frontend/practiceFlow.js).
   Run with:  node --test Frontend/practiceFlow.test.js   (no dependencies — Node's built-in runner) */
import { test } from "node:test";
import assert from "node:assert/strict";
import { setIndexes, nextInSet, nextSetStart } from "./practiceFlow.js";

const mk = (n, stages = []) => Array.from({ length: n }, (_, i) => ({ id: `q${i}`, stage: stages[i] }));

/* Plays a whole session the way the app does: answer the current question (it is wrong the first
   `wrong[i]` times it is shown, right afterwards), then ask nextInSet where to go. `done` starts as
   the set of already-completed question indexes. Returns the order the questions were shown in. */
function play(list, { start = 0, wrong = {}, done: startDone = [] } = {}) {
  const done = new Set(startDone);
  const left = { ...wrong };
  const isDone = (ex) => done.has(list.indexOf(ex));
  let reviewing = setIndexes(list, start).every((j) => done.has(j));
  let idx = start;
  const path = [idx];
  for (let guard = 0; guard < 500; guard++) {
    if ((left[idx] ?? 0) > 0) { left[idx]--; done.delete(idx); } else done.add(idx);
    const next = nextInSet(list, isDone, idx, reviewing);
    if (next == null) return { path, finished: true, done };
    if (reviewing && next <= idx) reviewing = false;
    idx = next;
    path.push(idx);
  }
  throw new Error(`session never finished: ${path.slice(0, 30)}`);
}
const q = (path) => path.map((i) => i + 1); // human question numbers

test("a student who answers everything right is taken strictly forward, then the set is complete", () => {
  const { path, finished } = play(mk(7));
  assert.deepEqual(q(path), [1, 2, 3, 4, 5, 6, 7]);
  assert.ok(finished);
});

test("a wrong answer is NOT re-asked immediately: go forward first, then ask it again", () => {
  const { path, finished } = play(mk(7), { wrong: { 2: 1 } }); // Q3 wrong once
  assert.deepEqual(q(path), [1, 2, 3, 4, 5, 6, 7, 3]);
  assert.ok(finished);
});

test("several wrong answers come back after the forward pass, in order", () => {
  const { path } = play(mk(7), { wrong: { 1: 1, 4: 1 } }); // Q2 and Q5 wrong once
  assert.deepEqual(q(path), [1, 2, 3, 4, 5, 6, 7, 2, 5]);
});

test("a question that is wrong again keeps coming round until it is right", () => {
  const { path, finished } = play(mk(5), { wrong: { 1: 2, 3: 1 } }); // Q2 wrong twice, Q4 once
  assert.deepEqual(q(path), [1, 2, 3, 4, 5, 2, 4, 2]);
  assert.ok(finished);
});

test("when the only unfinished question is the one just missed, it is asked again", () => {
  const list = mk(3);
  assert.equal(nextInSet(list, (ex) => ex.id !== "q1", 1), 1);
});

test("the set is only finished once everything is right (nextInSet returns null)", () => {
  const list = mk(3);
  assert.equal(nextInSet(list, () => true, 2), null);
});

test("starting in the middle goes forward, then wraps round to the questions not yet answered", () => {
  const { path } = play(mk(6), { start: 3 });
  assert.deepEqual(q(path), [4, 5, 6, 1, 2, 3]);
});

test("questions that are already completed are skipped", () => {
  const { path } = play(mk(6), { start: 0, done: [1, 2] });
  assert.deepEqual(q(path), [1, 4, 5, 6]);
});

test("a formula quiz and the practice problems are two separate sets", () => {
  const list = mk(5, [0, 0, 0, 1, 1]); // 3 formula-quiz questions, then 2 problems
  assert.deepEqual(setIndexes(list, 1), [0, 1, 2]);
  assert.deepEqual(setIndexes(list, 4), [3, 4]);
  const { path, finished } = play(list, { wrong: { 1: 1 } }); // Q2 of the quiz wrong once
  assert.deepEqual(q(path), [1, 2, 3, 2]); // never leaks into the problems
  assert.ok(finished);
});

test("a list without stages is one set", () => {
  assert.deepEqual(setIndexes(mk(4), 2), [0, 1, 2, 3]);
});

test("after a finished set, 'continue' points at the first open question of the next set", () => {
  const list = mk(5, [0, 0, 0, 1, 1]);
  const done = new Set([0, 1, 2]);
  assert.equal(nextSetStart(list, (ex) => done.has(list.indexOf(ex)), 2), 3);
  done.add(3);
  assert.equal(nextSetStart(list, (ex) => done.has(list.indexOf(ex)), 2), 4);
  done.add(4);
  assert.equal(nextSetStart(list, (ex) => done.has(list.indexOf(ex)), 2), null);
  assert.equal(nextSetStart(list, () => false, 4), null); // nothing after the last set
});

test("reviewing a completed set walks forward through every question, then finishes", () => {
  const { path, finished } = play(mk(4), { start: 0, done: [0, 1, 2, 3] });
  assert.deepEqual(q(path), [1, 2, 3, 4]);
  assert.ok(finished);
});

test("a wrong answer while reviewing is postponed to the end of the pass, then retried", () => {
  const { path, finished } = play(mk(4), { start: 0, done: [0, 1, 2, 3], wrong: { 1: 1 } });
  assert.deepEqual(q(path), [1, 2, 3, 4, 2]);
  assert.ok(finished);
});

test("never goes backward for a student who gets everything right, whatever the set size or start", () => {
  for (let n = 1; n <= 20; n++) {
    const { path } = play(mk(n));
    assert.deepEqual(path, Array.from({ length: n }, (_, i) => i));
  }
});

test("a single-question set finishes after one right answer", () => {
  const { path, finished } = play(mk(1));
  assert.deepEqual(q(path), [1]);
  assert.ok(finished);
});
