/* The daily limit on AI questions (aiQuota.js): when a question may go ahead, and what the pricing page offers.
   Run with:  node --test Frontend/aiQuota.test.js */
import { test } from "node:test";
import assert from "node:assert/strict";
import { ApiError } from "./api.js";
import { askAllowance, newAiRequestId, readUsage, canUpgradeTo, planRank, leftOf, isOut, AI_LIMIT_CODE } from "./aiQuota.js";

const usage = (over = {}) => ({ plan: "free", limit: 5, used: 2, remaining: 3, resetsAt: "2026-11-03T00:00:00+07:00", ...over });
const fakeApi = (consumeAi, { enabled = true, token = true } = {}) => ({ enabled, hasToken: () => token, consumeAi });

test("a request id is one the backend accepts (8-64 letters, digits, - and _), and a new one each time", () => {
  const a = newAiRequestId();
  const b = newAiRequestId();
  assert.match(a, /^[A-Za-z0-9_-]{8,64}$/);
  assert.notEqual(a, b);
});

test("readUsage reads a usage body and refuses anything else", () => {
  assert.deepEqual(readUsage(usage()), usage());
  assert.equal(readUsage(null), null);
  assert.equal(readUsage({}), null);
  assert.equal(readUsage({ plan: "free", limit: "5", used: 1 }), null);
  assert.equal(readUsage({ message: "x", code: "server_error" }), null);
  // `remaining` is worked out when the backend leaves it out
  assert.equal(readUsage({ plan: "free", limit: 5, used: 7 }).remaining, 0);
});

test("a question the backend counts goes ahead, with the new usage", async () => {
  const calls = [];
  const gate = await askAllowance(fakeApi(async (id) => { calls.push(id); return { allowed: true, ...usage({ used: 3, remaining: 2 }) }; }), "req-12345678");
  assert.deepEqual(calls, ["req-12345678"]);
  assert.equal(gate.ok, true);
  assert.equal(gate.usage.remaining, 2);
});

test("a 402 ai_limit_reached stops the question and carries the usage", async () => {
  const refused = new ApiError(402, AI_LIMIT_CODE, "used all", { body: { allowed: false, ...usage({ used: 5, remaining: 0 }), code: AI_LIMIT_CODE } });
  const gate = await askAllowance(fakeApi(async () => { throw refused; }), "req-12345678");
  assert.equal(gate.ok, false);
  assert.equal(gate.usage.remaining, 0);
  assert.equal(gate.usage.limit, 5);
});

test("a backend that is down, slow or broken never blocks a question", async () => {
  for (const err of [new ApiError(0, "network_error", "no"), new ApiError(500, "server_error", "boom"), new ApiError(429, "too_many_requests", "slow"), new ApiError(402, "something_else", "other"), new Error("odd")]) {
    const gate = await askAllowance(fakeApi(async () => { throw err; }), "req-12345678");
    assert.deepEqual(gate, { ok: true, usage: null }, `${err.status ?? err.message}`);
  }
});

test("with no backend, or signed out, nothing is asked and the question goes ahead", async () => {
  let asked = 0;
  const consume = async () => { asked++; return usage(); };
  assert.deepEqual(await askAllowance(fakeApi(consume, { enabled: false }), "req-12345678"), { ok: true, usage: null });
  assert.deepEqual(await askAllowance(fakeApi(consume, { token: false }), "req-12345678"), { ok: true, usage: null });
  assert.deepEqual(await askAllowance(undefined, "req-12345678"), { ok: true, usage: null });
  assert.equal(asked, 0);
});

test("the pricing page offers only a better plan than the one the student has", () => {
  assert.equal(canUpgradeTo("free", "standard"), true);
  assert.equal(canUpgradeTo("free", "premium"), true);
  assert.equal(canUpgradeTo("standard", "premium"), true);
  assert.equal(canUpgradeTo("standard", "standard"), false);
  assert.equal(canUpgradeTo("premium", "standard"), false);
  assert.equal(canUpgradeTo("premium", "free"), false);
  assert.equal(canUpgradeTo("free", "free"), false);
  assert.equal(planRank("nonsense"), 0);
});

test("leftOf and isOut read a usage object", () => {
  assert.deepEqual(leftOf(usage()), { n: 3, limit: 5 });
  assert.equal(leftOf(null), null);
  assert.equal(isOut(usage({ remaining: 0 })), true);
  assert.equal(isOut(usage()), false);
  assert.equal(isOut(null), false);
});
