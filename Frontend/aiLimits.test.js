/* How much a caller may send to the AI functions (api/_limits.js). Run with:  node --test Frontend/aiLimits.test.js */
import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanChat, tooLongField, MAX_MESSAGE_CHARS, MAX_HISTORY_TURNS, MAX_CONTEXT_CHARS } from "../api/_limits.js";

test("an ordinary chat passes through unchanged", () => {
  const history = [{ role: "user", text: "hi" }, { role: "assistant", text: "hello" }];
  const out = cleanChat({ message: "How do I choose a major?", history, context: { major: "Law" } });
  assert.equal(out.error, undefined);
  assert.equal(out.message, "How do I choose a major?");
  assert.deepEqual(out.history, [{ role: "user", text: "hi" }, { role: "model", text: "hello" }]);
  assert.deepEqual(out.context, { major: "Law" });
});

test("a missing or empty message is a 400, a message over the limit is a 413", () => {
  for (const message of [undefined, "", "   ", 5, {}]) assert.equal(cleanChat({ message }).error.status, 400);
  assert.equal(cleanChat({ message: "x".repeat(MAX_MESSAGE_CHARS) }).error, undefined);
  const long = cleanChat({ message: "x".repeat(MAX_MESSAGE_CHARS + 1) }).error;
  assert.equal(long.status, 413);
  assert.equal(long.body.code, "too_long");
});

test("the history is cut to the last 12 text turns, each to the message limit, and anything else is dropped", () => {
  const history = [null, 5, "x", { role: "user" }, { role: "user", text: 7 }, { role: "user", text: "   " },
    ...Array.from({ length: 30 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", text: `t${i}` })),
    { role: "user", text: "y".repeat(MAX_MESSAGE_CHARS * 5) }];
  const out = cleanChat({ message: "hi", history }).history;
  assert.equal(out.length, MAX_HISTORY_TURNS);
  assert.equal(out.at(-1).text.length, MAX_MESSAGE_CHARS);
  assert.ok(out.every((m) => (m.role === "user" || m.role === "model") && typeof m.text === "string"));
});

test("a history that is not a list does not crash anything", () => {
  for (const history of ["nope", 5, {}, null, undefined]) assert.deepEqual(cleanChat({ message: "hi", history }).history, []);
});

test("a context that is too big, not an object, or not serialisable is dropped, not refused", () => {
  assert.deepEqual(cleanChat({ message: "hi", context: { goals: ["g".repeat(MAX_CONTEXT_CHARS)] } }).context, {});
  for (const context of ["x", 5, [1, 2], null, undefined]) assert.deepEqual(cleanChat({ message: "hi", context }).context, {});
  const loop = {}; loop.self = loop;
  assert.deepEqual(cleanChat({ message: "hi", context: loop }).context, {});
  assert.deepEqual(cleanChat({ message: "hi", context: { name: "Sophea" } }).context, { name: "Sophea" });
});

test("cleanChat copes with being called with nothing", () => {
  assert.equal(cleanChat().error.status, 400);
  assert.equal(cleanChat(undefined).error.status, 400);
});

test("tooLongField names the first field over its limit", () => {
  assert.equal(tooLongField({ prompt: "a", response: "b" }, { prompt: 2, response: 2 }), null);
  const refused = tooLongField({ prompt: "abc", response: "b" }, { prompt: 2, response: 2 });
  assert.equal(refused.status, 413);
  assert.match(refused.body.error, /prompt/);
});

test("the mentor and the guidance functions use cleanChat, and the IELTS grader limits its text", async () => {
  const { readFileSync } = await import("node:fs");
  for (const core of ["university-mentor-core.js", "major-guidance-core.js"]) {
    const code = readFileSync(new URL(`../api/${core}`, import.meta.url), "utf8");
    assert.match(code, /cleanChat\(input \?\? \{\}\)/, core);
    assert.doesNotMatch(code, /history\.slice\(/, `${core} no longer trusts the raw history`);
  }
  const ielts = readFileSync(new URL("../api/ielts-grade.js", import.meta.url), "utf8");
  assert.match(ielts, /tooLongField\(\{ prompt, response \}, \{ prompt: 2000, response: 10000 \}\)/);
});
