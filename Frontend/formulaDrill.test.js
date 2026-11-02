/* The "Formula drill" review mode's pure logic: which questions it draws and how a miss requeues.
   Run with:  node --test Frontend/formulaDrill.test.js */
import { test } from "node:test";
import assert from "node:assert/strict";
import { DRILL_SIZE, drillPool, startDrill, afterAnswer } from "./formulaDrill.js";

const q = (id, chapter, stage) => ({ id, chapter, stage });
// Chapter "A": 15 formula-quiz questions (stage 0) and 9 practice problems (stage 1). Chapter "B": 3 formula questions
// and none at all with a stage (the original starter-style questions).
const list = [
  ...Array.from({ length: 15 }, (_, i) => q(`A-${i + 1}`, "A", 0)),
  ...Array.from({ length: 9 }, (_, i) => q(`A-${i + 16}`, "A", 1)),
  ...Array.from({ length: 3 }, (_, i) => q(`B-${i + 1}`, "B", 0)),
  { id: "C-1", chapter: "C", stage: undefined },
];

test("drillPool is a chapter's stage-0 questions only", () => {
  assert.equal(drillPool(list, "A").length, 15);
  assert.ok(drillPool(list, "A").every((ex) => ex.chapter === "A" && ex.stage === 0));
  assert.equal(drillPool(list, "B").length, 3);
  assert.equal(drillPool(list, "C").length, 0); // no stage-0 questions (stage is undefined, i.e. ?? 1)
  assert.equal(drillPool(list, "nope").length, 0);
});

test("startDrill draws up to DRILL_SIZE questions, all from that chapter's pool, no repeats", () => {
  const run = startDrill(list, "A", "seed-1");
  assert.equal(run.length, DRILL_SIZE);
  assert.ok(run.every((ex) => ex.chapter === "A" && ex.stage === 0));
  assert.equal(new Set(run.map((ex) => ex.id)).size, DRILL_SIZE); // no duplicates in the initial draw
});

test("a pool smaller than DRILL_SIZE is used whole", () => {
  const run = startDrill(list, "B", "seed-1");
  assert.equal(run.length, 3);
  assert.deepEqual(new Set(run.map((ex) => ex.id)), new Set(["B-1", "B-2", "B-3"]));
});

test("an empty pool draws nothing", () => {
  assert.deepEqual(startDrill(list, "C", "seed-1"), []);
  assert.deepEqual(startDrill(list, "nope", "seed-1"), []);
});

test("a different seed can draw a different order or subset; the same seed is stable", () => {
  const run1 = startDrill(list, "A", "seed-1").map((ex) => ex.id);
  const run1Again = startDrill(list, "A", "seed-1").map((ex) => ex.id);
  const run2 = startDrill(list, "A", "seed-2").map((ex) => ex.id);
  assert.deepEqual(run1, run1Again);
  assert.notDeepEqual(run1, run2);
});

test("a right answer leaves the queue and repeat counts untouched", () => {
  const queue = startDrill(list, "B", "seed-1"); // length 3
  const before = queue.map((ex) => ex.id);
  const { queue: after, repeats } = afterAnswer(queue, 0, true, {});
  assert.deepEqual(after.map((ex) => ex.id), before);
  assert.deepEqual(repeats, {});
});

test("a wrong answer requeues the question a few slots ahead, growing the run by one", () => {
  const queue = startDrill(list, "A", "seed-1"); // length 10
  const missed = queue[0];
  const { queue: after, repeats } = afterAnswer(queue, 0, false, {});
  assert.equal(after.length, queue.length + 1);
  assert.equal(repeats[missed.id], 1);
  // It reappears later in the run, not immediately next and not only at the very end.
  const at = after.findIndex((ex, i) => i > 0 && ex.id === missed.id);
  assert.ok(at > 1 && at < after.length - 1, `expected the repeat somewhere in the middle, got index ${at} of ${after.length}`);
});

test("a question that keeps being missed stops requeuing once it has repeated enough times", () => {
  let queue = startDrill(list, "B", "seed-1"); // length 3, so insertions land at the end
  let repeats = {};
  for (let i = 0; i < 5; i++) ({ queue, repeats } = afterAnswer(queue, 0, false, repeats));
  const missCount = queue.filter((ex) => ex.id === queue[0].id).length;
  assert.ok(missCount <= 3, `expected at most 1 original + 2 repeats, got ${missCount}`); // 1 original + at most MAX_REPEATS
  assert.ok(repeats[queue[0].id] <= 2);
});

test("afterAnswer never mutates the queue it was given", () => {
  const queue = startDrill(list, "A", "seed-1");
  const copy = queue.map((ex) => ex.id);
  afterAnswer(queue, 0, false, {});
  assert.deepEqual(queue.map((ex) => ex.id), copy);
});
