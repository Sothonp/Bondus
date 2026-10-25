/* Tests for Frontend/exerciseSessions.js.
   Run with:  node --test Frontend/exerciseSessions.test.js */
import { test } from "node:test";
import assert from "node:assert/strict";
import { elapsedSeconds, remainingSeconds, formatClock, MAX_PHOTOS } from "./exerciseSessions.js";

const T0 = Date.UTC(2026, 9, 25, 10, 0, 0);
const iso = (ms) => new Date(ms).toISOString();

test("a running attempt's clock counts up from startedAt and counts down against the exercise's time limit", () => {
  const submission = { status: "running", startedAt: iso(T0), submittedAt: null };
  assert.equal(elapsedSeconds(submission, 90, T0 + 65000), 65);
  assert.equal(remainingSeconds(submission, 90, T0 + 60 * 60000), 30 * 60);
  assert.equal(remainingSeconds(submission, 90, T0 + 100 * 60000), -10 * 60); // 10 minutes over
});

test("an untimed exercise has no remaining time to show", () => {
  const submission = { status: "running", startedAt: iso(T0), submittedAt: null };
  assert.equal(remainingSeconds(submission, null, T0 + 65000), null);
});

test("a submitted attempt's elapsed time stops at submittedAt, not at 'now'", () => {
  const submission = { status: "submitted", startedAt: iso(T0), submittedAt: iso(T0 + 42 * 60000) };
  assert.equal(elapsedSeconds(submission, 90, T0 + 999 * 60000), 42 * 60);
});

test("formatClock is re-exported unchanged", () => {
  assert.equal(formatClock(65), "1:05");
  assert.equal(formatClock(3725), "1:02:05");
});

test("MAX_PHOTOS matches the server's own cap", () => {
  assert.equal(MAX_PHOTOS, 10);
});
