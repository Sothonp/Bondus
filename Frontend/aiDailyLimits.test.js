/* Daily limits at the serverless AI functions (api/_auth.js): the IELTS grader's own allowance, the per-network-address cap on
   Free accounts, and the refusal to run in production with no sign-in check. Run with:  node --test Frontend/aiDailyLimits.test.js */
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  createDailyAllowance, createAddressBudget, createQuotaCheck, signInUnconfigured, refuseUnlessSignedIn, refuseIfOverGraderLimit,
} from "../api/_auth.js";

const HOUR = 3_600_000;
// 2026-11-07 00:30 in Phnom Penh (UTC+7) is 2026-11-06 17:30 UTC.
const MIDNIGHT_PLUS_30MIN = Date.UTC(2026, 10, 6, 17, 30);
const clock = (at = MIDNIGHT_PLUS_30MIN) => { const c = { at, now: () => c.at }; return c; };
const json = (status, body, headers = {}) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...headers } });

/* ── the IELTS grader's own allowance ───────────────────────────────────────────────────────────────────────── */

test("a student gets a fixed number of grader turns a day, then a 429 that says when it resets", () => {
  // Breaks if: one signed-in account can call the grader without end (it is not counted by the Laravel API).
  const c = clock();
  const take = createDailyAllowance({ perStudent: 3, perAddress: 100, overall: 100, now: c.now });
  for (let n = 0; n < 3; n++) assert.equal(take({ student: "7", address: "a" }), null);
  const refused = take({ student: "7", address: "a" });
  assert.equal(refused.status, 429);
  assert.equal(refused.body.code, "daily_limit_reached");
  assert.equal(refused.headers["Retry-After"], String(23 * 3600 + 30 * 60)); // the next Phnom Penh midnight is 23h30 away
});

test("the allowance starts again at Phnom Penh midnight, not UTC", () => {
  // Breaks if: the day follows the server's clock, so students are refused after their own midnight (or let through before it).
  const c = clock(Date.UTC(2026, 10, 6, 16, 59)); // 23:59 in Phnom Penh on the 6th
  const take = createDailyAllowance({ perStudent: 1, perAddress: 100, overall: 100, now: c.now });
  assert.equal(take({ student: "7", address: "a" }), null);
  assert.equal(take({ student: "7", address: "a" }).status, 429);
  c.at += 2 * 60_000; // 00:01 on the 7th
  assert.equal(take({ student: "7", address: "a" }), null);
});

test("one student using up their turns leaves other students theirs", () => {
  const take = createDailyAllowance({ perStudent: 1, perAddress: 100, overall: 100, now: clock().now });
  assert.equal(take({ student: "1", address: "a" }), null);
  assert.equal(take({ student: "1", address: "a" }).status, 429);
  assert.equal(take({ student: "2", address: "a" }), null);
});

test("many accounts from one network address are capped together", () => {
  // Breaks if: a script that makes accounts gets a fresh allowance for each.
  const take = createDailyAllowance({ perStudent: 5, perAddress: 3, overall: 100, now: clock().now });
  for (const student of ["1", "2", "3"]) assert.equal(take({ student, address: "school" }), null);
  const refused = take({ student: "4", address: "school" });
  assert.equal(refused.body.code, "address_limit_reached");
  assert.equal(take({ student: "5", address: "elsewhere" }), null);
});

test("there is a ceiling for all callers together, so one day's bill is bounded", () => {
  const take = createDailyAllowance({ perStudent: 5, perAddress: 5, overall: 2, now: clock().now });
  assert.equal(take({ student: "1", address: "a" }), null);
  assert.equal(take({ student: "2", address: "b" }), null);
  assert.equal(take({ student: "3", address: "c" }).body.code, "busy");
});

test("a refused turn is not counted", () => {
  const c = clock();
  const take = createDailyAllowance({ perStudent: 1, perAddress: 1, overall: 1, now: c.now });
  take({ student: "1", address: "a" });
  for (let n = 0; n < 5; n++) take({ student: "1", address: "a" });
  c.at += 24 * HOUR;
  assert.equal(take({ student: "1", address: "a" }), null);
});

/* ── Free accounts, per network address, across accounts ──────────────────────────────────────────────────── */

test("an address may ask only so many different questions a day, and the same question twice counts once", () => {
  const take = createAddressBudget({ limit: 2, now: clock().now });
  assert.equal(take("a", "q1"), true);
  assert.equal(take("a", "q1"), true); // the website, then the function, report one question
  assert.equal(take("a", "q2"), true);
  assert.equal(take("a", "q3"), false);
  assert.equal(take("a", "q1"), true); // already counted: still allowed
  assert.equal(take("b", "q3"), true);
});

test("the address budget resets each Phnom Penh day and a limit of 0 turns it off", () => {
  const c = clock();
  const take = createAddressBudget({ limit: 1, now: c.now });
  assert.equal(take("a", "q1"), true);
  assert.equal(take("a", "q2"), false);
  c.at += 24 * HOUR;
  assert.equal(take("a", "q2"), true);
  assert.equal(createAddressBudget({ limit: 0 })("a", "x"), true);
});

function laravelCounting(plan) {
  return async () => json(200, plan === undefined ? { used: 1 } : { plan, used: 1, limit: 5 });
}
const count = (opts, id, address = "1.1.1.1") => createQuotaCheck({ url: "https://api.test/api/v1/ai/consume", now: clock().now, ...opts })("Bearer tok", id, address);

test("Free accounts from one address stop at the address's daily questions, whatever account asks", async () => {
  // Breaks if: accounts made by a script each bring their own questions through the functions without an overall limit.
  const check = createQuotaCheck({ url: "https://api.test/api/v1/ai/consume", fetchImpl: laravelCounting("free"), now: clock().now, freePerAddressDaily: 3 });
  const answers = [];
  for (let n = 0; n < 5; n++) answers.push(await check("Bearer tok", `question-${n}-xxxx`, "9.9.9.9"));
  assert.deepEqual(answers.map((a) => a?.status ?? 200), [200, 200, 200, 429, 429]);
  assert.equal(answers[3].body.code, "address_limit_reached");
  assert.ok(Number(answers[3].headers["Retry-After"]) > 0);
  assert.equal(await check("Bearer tok", "question-0-xxxx", "9.9.9.9"), null); // a question already counted is let through again
  assert.equal(await check("Bearer tok", "question-9-xxxx", "8.8.8.8"), null); // another address is untouched
});

test("paid plans are not held to the Free address cap, so a school on one address is not shut out", async () => {
  const check = createQuotaCheck({ url: "https://api.test/api/v1/ai/consume", fetchImpl: laravelCounting("super"), now: clock().now, freePerAddressDaily: 1 });
  for (let n = 0; n < 5; n++) assert.equal(await check("Bearer tok", `question-${n}-xxxx`, "9.9.9.9"), null);
});

test("an answer from the API with no plan in it is not held to the address cap either", async () => {
  const check = createQuotaCheck({ url: "https://api.test/api/v1/ai/consume", fetchImpl: laravelCounting(undefined), now: clock().now, freePerAddressDaily: 1 });
  for (let n = 0; n < 3; n++) assert.equal(await check("Bearer tok", `question-${n}-xxxx`, "9.9.9.9"), null);
});

/* ── no sign-in check in production ─────────────────────────────────────────────────────────────────────────── */

test("production with no AUTH_VERIFY_URL is refused; development, previews and a set URL are not", () => {
  // Breaks if: a forgotten environment variable leaves the AI functions open to anyone, spending the shared Gemini/Groq quota.
  assert.equal(signInUnconfigured({ VERCEL_ENV: "production" }), true);
  assert.equal(signInUnconfigured({ CONTEXT: "production" }), true); // Netlify
  assert.equal(signInUnconfigured({ VERCEL_ENV: "production", AUTH_VERIFY_URL: "  " }), true);
  assert.equal(signInUnconfigured({ VERCEL_ENV: "production", AUTH_VERIFY_URL: "https://api.test/api/v1/me" }), false);
  assert.equal(signInUnconfigured({ VERCEL_ENV: "preview" }), false);
  assert.equal(signInUnconfigured({ VERCEL_ENV: "development" }), false);
  assert.equal(signInUnconfigured({}), false);
  assert.equal(signInUnconfigured({ CONTEXT: "deploy-preview" }), false);
});

test("AUTH_REQUIRED=false turns the refusal off on purpose", () => {
  for (const off of ["false", "0", "off", "no", "FALSE"]) assert.equal(signInUnconfigured({ VERCEL_ENV: "production", AUTH_REQUIRED: off }), false);
  assert.equal(signInUnconfigured({ VERCEL_ENV: "production", AUTH_REQUIRED: "true" }), true);
});

/* ── the real entry points ──────────────────────────────────────────────────────────────────────────────────── */

const names = ["AUTH_VERIFY_URL", "AUTH_CHECK_TOKEN_SHAPE", "VERCEL_ENV", "CONTEXT", "AUTH_REQUIRED", "IELTS_DAILY_PER_STUDENT", "IELTS_DAILY_PER_ADDRESS", "IELTS_DAILY_OVERALL"];
const saved = Object.fromEntries(names.map((n) => [n, process.env[n]]));
const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
  for (const n of names) { if (saved[n] === undefined) delete process.env[n]; else process.env[n] = saved[n]; }
});
const res = () => ({ headers: {}, setHeader(n, v) { this.headers[n] = v; }, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });
const req = (token, extra = {}) => ({ headers: { authorization: `Bearer ${token}`, "x-vercel-forwarded-for": "9.9.9.9", ...extra } });

test("in production with no AUTH_VERIFY_URL, the sign-in check refuses with a 503 and calls nobody", async () => {
  delete process.env.AUTH_VERIFY_URL;
  process.env.VERCEL_ENV = "production";
  let asked = 0;
  globalThis.fetch = async () => { asked += 1; return json(200, {}); };
  const answer = res();
  assert.equal(await refuseUnlessSignedIn(req("anything"), answer), true);
  assert.equal(answer.code, 503);
  assert.equal(answer.body.code, "auth_not_configured");
  assert.equal(asked, 0);
});

test("the grader's allowance follows the student, not the token: signing in again does not bring a fresh one", async () => {
  // Breaks if: logging in again (a new token each time) is a way to get more grader turns.
  process.env.AUTH_VERIFY_URL = "https://grader-student.example.test/api/v1/me";
  process.env.AUTH_CHECK_TOKEN_SHAPE = "off";
  process.env.IELTS_DAILY_PER_STUDENT = "2";
  process.env.IELTS_DAILY_PER_ADDRESS = "100";
  globalThis.fetch = async (_url, init) => json(200, { user: { id: init.headers.Authorization.includes("other") ? 8 : 7 } });
  const turn = async (token) => { await refuseUnlessSignedIn(req(token), res()); const r = res(); await refuseIfOverGraderLimit(req(token), r); return r.code ?? 200; };
  assert.deepEqual([await turn("first-login"), await turn("second-login"), await turn("third-login")], [200, 200, 429]);
  assert.equal(await turn("other-student"), 200);
});

test("the grader's 429 carries Retry-After and the code the page can show", async () => {
  process.env.AUTH_VERIFY_URL = "https://grader-429.example.test/api/v1/me";
  process.env.AUTH_CHECK_TOKEN_SHAPE = "off";
  process.env.IELTS_DAILY_PER_STUDENT = "1";
  process.env.IELTS_DAILY_PER_ADDRESS = "101";
  globalThis.fetch = async () => json(200, { user: { id: 42 } });
  await refuseUnlessSignedIn(req("tok"), res());
  assert.equal(await refuseIfOverGraderLimit(req("tok"), res()), false);
  const answer = res();
  assert.equal(await refuseIfOverGraderLimit(req("tok"), answer), true);
  assert.equal(answer.code, 429);
  assert.equal(answer.body.code, "daily_limit_reached");
  assert.ok(Number(answer.headers["Retry-After"]) >= 1);
});

/* ── wiring ─────────────────────────────────────────────────────────────────────────────────────────────── */

const source = (f) => readFileSync(new URL(`../${f}`, import.meta.url), "utf8");

test("the IELTS grader checks its allowance after sign-in and before it reads the body or calls a model", () => {
  const code = source("api/ielts-grade.js");
  const signedIn = code.indexOf("refuseUnlessSignedIn(req, res)");
  const limited = code.indexOf("refuseIfOverGraderLimit(req, res)");
  assert.ok(signedIn > 0 && limited > signedIn, "the allowance comes after the sign-in check");
  assert.ok(limited < code.indexOf("generateText("), "and before the model is called");
  assert.ok(limited < code.indexOf("req.body"), "and before the body is read");
});

test("the question counter is given the caller's address on both hosts", () => {
  const code = source("api/_auth.js");
  assert.match(code, /quota\(\)\(req\.headers\?\.authorization, req\.body\?\.request_id, callerAddress\(/);
  assert.match(code, /quota\(\)\(req\.headers\.get\("authorization"\), payload\?\.request_id, callerAddress\(/);
});
