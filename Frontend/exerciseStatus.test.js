/* Where an exercise stands is the system's call. Run with:  node --test Frontend/exerciseStatus.test.js */
import { test } from "node:test";
import assert from "node:assert/strict";
import { exerciseStatus, isExerciseDone, openedRecord } from "./exerciseStatus.js";

test("a correct answer finishes an exercise; a wrong one or just opening it leaves it in progress; nothing is pending", () => {
  assert.equal(exerciseStatus({ status: "completed", result: "correct" }), "completed");
  assert.equal(exerciseStatus({ status: "in_progress", result: "incorrect" }), "in_progress");
  assert.equal(exerciseStatus({ status: "in_progress", result: null }), "in_progress");
  assert.equal(exerciseStatus(undefined), "pending");
  assert.equal(exerciseStatus({}), "pending");
});

test("a Completed tick saved before this rule does not finish anything, whatever its status says", () => {
  assert.equal(exerciseStatus({ status: "completed", result: null }), "pending");
  assert.equal(isExerciseDone({ status: "completed", result: null }), false);
  assert.equal(isExerciseDone({ status: "completed" }), false);
  assert.equal(isExerciseDone({ status: "pending", result: "correct" }), true, "the answer decides, not the stored label");
});

test("answering wrong after a right answer follows the latest answer", () => {
  assert.equal(exerciseStatus({ status: "in_progress", result: "incorrect" }), "in_progress");
});

test("opening an exercise starts a record only when there is none, and never finishes anything", () => {
  const ex = { id: "Math-1", subject: "Math", topic: "Limits" };
  const rec = openedRecord(undefined, ex, 5);
  assert.deepEqual(rec, { status: "in_progress", result: null, at: 5, subject: "Math", topic: "Limits", xpAwarded: false });
  assert.equal(exerciseStatus(rec), "in_progress");
  assert.equal(openedRecord({ status: "completed", result: "correct" }, ex), null, "an answered exercise is left as it is");
});
