/* Who may call the AI functions (api/*.js on Vercel, netlify/functions/*.mjs on Netlify): only students signed in to the
   Laravel API. The guard (api/_auth.js) asks that API "who am I" (GET /me); only that network call is faked here.
   Run with:  node --test Frontend/aiAuth.test.js */
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { createSignedInCheck } from "../api/_auth.js";

const ME = "https://api.example.test/api/v1/me";
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
/* A complete GET /me body, as the Laravel API sends it. */
const me = (id) => ({ user: { id, role: "student", name: "Sophea", phone: null, email: `student${id}@example.com`, age: 18, educationLevel: "highschool", grade: "12", field: "science", foreignLanguage: "English", target: "A", targetExamYear: 2027, dailyMinutes: 60, targetUniversity: "ITC", subjectsToImprove: [], level: 1, xp: 40, xpToNext: 60, hasCompletedDiagnostic: false, isPersonalized: false, bannerDismissed: false, reminderEmails: true, createdAt: "2026-10-27T04:00:00+00:00" } });

/* The Laravel API as the guard sees it: knows `users` (token -> id), records every check. */
function laravel(users) {
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    if (String(url) !== ME || (init.method ?? "GET") !== "GET") return json(404, { message: "Not found.", code: "not_found" });
    const authorization = init.headers?.Authorization ?? null;
    calls.push(authorization);
    const token = authorization?.replace(/^Bearer /, "");
    return token && token in users ? json(200, me(users[token])) : json(401, { message: "Unauthenticated.", code: "unauthenticated" });
  };
  return { users, calls, fetchImpl };
}
const guard = (l, opts = {}) => createSignedInCheck({ url: ME, fetchImpl: l.fetchImpl, ...opts });

/* --- who gets in ----------------------------------------------------------------------------------------------- */

test("a request with no token is refused without asking Laravel", async () => {
  // Breaks if: a function runs for anyone on the internet and spends the shared Gemini/Groq quota.
  const l = laravel({ good: 1 });
  const refused = await guard(l)(undefined);
  assert.equal(refused.status, 401);
  assert.deepEqual(l.calls, []);
});

test("anything but a Bearer token is refused without asking Laravel", async () => {
  // Breaks if: a malformed header is forwarded to Laravel (load) or accepted.
  for (const header of ["Basic Z29vZDpwdw==", "Bearer", "Bearer ", "good"]) {
    const l = laravel({ good: 1 });
    assert.equal((await guard(l)(header)).status, 401, header);
    assert.deepEqual(l.calls, [], header);
  }
});

test("a token Laravel rejects is refused", async () => {
  // Breaks if: any Bearer string counts as a login.
  const l = laravel({ good: 1 });
  assert.equal((await guard(l)("Bearer bogus")).status, 401);
  assert.deepEqual(l.calls, ["Bearer bogus"]);
});

test("a signed-in student is let through, and Laravel sees their exact token", async () => {
  // Breaks if: real students are blocked, or a mangled copy of the token is checked.
  const l = laravel({ good: 1 });
  assert.equal(await guard(l)("Bearer good"), null);
  assert.deepEqual(l.calls, ["Bearer good"]);
});

test("when Laravel cannot vouch for a token, nobody gets in", async () => {
  // Breaks if: the guard fails open -- an outage or an odd reply from the sign-in API lets everyone in.
  const down = async () => { throw new TypeError("fetch failed"); };
  const broken = async () => json(500, { message: "Server Error" });
  const oddBody = async () => json(200, {});
  for (const fetchImpl of [down, broken, oddBody]) {
    const refused = await createSignedInCheck({ url: ME, fetchImpl })("Bearer good");
    assert.equal(refused.status, 503);
  }
});

test("with no verify address configured the functions stay open (local development)", async () => {
  // Breaks if: running the site locally suddenly needs a Laravel API.
  const l = laravel({});
  assert.equal(await createSignedInCheck({ url: "", fetchImpl: l.fetchImpl })(undefined), null);
  assert.deepEqual(l.calls, []);
});

/* --- how often Laravel is asked ---------------------------------------------------------------------------------- */

test("a checked token is remembered, and checked again once that has expired (so logging out takes effect)", async () => {
  // Breaks if: every request costs Laravel a call, or a revoked token keeps working forever.
  let now = 0;
  const l = laravel({ good: 1 });
  const check = guard(l, { now: () => now, cacheMs: 60_000 });
  assert.equal(await check("Bearer good"), null);
  delete l.users.good; // the student logs out; Laravel revokes the token
  now = 30_000;
  assert.equal(await check("Bearer good"), null);
  now = 61_000;
  assert.equal((await check("Bearer good")).status, 401);
  assert.deepEqual(l.calls, ["Bearer good", "Bearer good"]);
});

test("a rejected token is not sent to Laravel again on every attempt", async () => {
  // Breaks if: hammering a function with a bad token turns every attempt into a Laravel request.
  const l = laravel({ good: 1 });
  const check = guard(l);
  for (let i = 0; i < 5; i++) assert.equal((await check("Bearer bogus")).status, 401);
  assert.deepEqual(l.calls, ["Bearer bogus"]);
});

/* --- how much one student may ask ---------------------------------------------------------------------------------- */

test("each student has their own per-minute allowance, and the refusal says how long to wait", async () => {
  // Breaks if: the limit is global (one busy student locks everyone out) or missing (one account drains the quota).
  const l = laravel({ alice: 1, bob: 2 });
  const check = guard(l, { perMinute: 2 });
  assert.equal(await check("Bearer alice"), null);
  assert.equal(await check("Bearer alice"), null);
  const third = await check("Bearer alice");
  assert.equal(third.status, 429);
  const wait = Number(third.headers["Retry-After"]);
  assert.ok(wait >= 1 && wait <= 60, `Retry-After ${wait}`);
  assert.equal(await check("Bearer bob"), null);
});

test("only requests that were served count towards the limit", async () => {
  // Breaks if: hammering a blocked account keeps extending its own block forever.
  let now = 0;
  const check = guard(laravel({ a: 1 }), { now: () => now, perMinute: 3, cacheMs: 600_000 });
  for (let i = 0; i < 3; i++) assert.equal(await check("Bearer a"), null);
  for (const t of [10_000, 20_000, 30_000, 40_000, 50_000]) { now = t; assert.equal((await check("Bearer a")).status, 429); }
  now = 60_000;
  assert.equal(await check("Bearer a"), null);
});

test("the wait is the time until the oldest served request ages out of the minute", async () => {
  // Breaks if: a student is told to wait 60 s who could ask again in 1 s, or the reverse.
  let now = 0;
  const check = guard(laravel({ a: 1 }), { now: () => now, perMinute: 3, cacheMs: 600_000 });
  for (let i = 0; i < 3; i++) await check("Bearer a");
  now = 10_000;
  assert.equal((await check("Bearer a")).headers["Retry-After"], "50");
  now = 59_000;
  assert.equal((await check("Bearer a")).headers["Retry-After"], "1");
});

/* --- every function is actually behind the guard ---------------------------------------------------------------------- */

const realFetch = globalThis.fetch;
const realEnv = { url: process.env.AUTH_VERIFY_URL, gemini: process.env.GEMINI_API_KEY, groq: process.env.GROQ_API_KEY };
afterEach(() => {
  globalThis.fetch = realFetch;
  for (const [key, value] of [["AUTH_VERIFY_URL", realEnv.url], ["GEMINI_API_KEY", realEnv.gemini], ["GROQ_API_KEY", realEnv.groq]]) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
});

/* Configures the environment like production (guard on, no AI keys) with Laravel faked at the network level. */
function production(users) {
  const l = laravel(users);
  const outbound = [];
  globalThis.fetch = async (url, init) => { outbound.push(String(url)); return l.fetchImpl(url, init); };
  process.env.AUTH_VERIFY_URL = ME;
  delete process.env.GEMINI_API_KEY;
  delete process.env.GROQ_API_KEY;
  return { l, outbound };
}
function vercelRes() {
  const res = { statusCode: null, body: null, headers: {}, status(code) { res.statusCode = code; return res; }, json(body) { res.body = body; return res; }, setHeader(k, v) { res.headers[k] = v; } };
  return res;
}
const VERCEL = [
  ["major-guidance", { message: "hi" }],
  ["university-mentor", { message: "hi" }],
  ["ielts-grade", { skill: "writing", prompt: "Describe your town.", response: "It is big." }],
];
const NETLIFY = ["major-guidance", "university-mentor"];

for (const [name, body] of VERCEL) {
  test(`api/${name}.js (Vercel) refuses a request with no token before any outbound call`, async () => {
    // Breaks if: this function is left, added or edited without the guard.
    const { outbound } = production({ good: 1 });
    const { default: handler } = await import(`../api/${name}.js`);
    const res = vercelRes();
    await handler({ method: "POST", headers: {}, body }, res);
    assert.equal(res.statusCode, 401);
    assert.deepEqual(outbound, []);
  });

  test(`api/${name}.js (Vercel) lets a signed-in student through to the function itself`, async () => {
    // Breaks if: the guard blocks valid students. With no AI key configured the function itself answers 500 about
    // the missing key, which proves the request got past the guard.
    const token = `tok-vercel-${name}`; // the guard remembers a valid token, so each test needs its own
    const { l } = production({ [token]: 7 });
    const { default: handler } = await import(`../api/${name}.js`);
    const res = vercelRes();
    await handler({ method: "POST", headers: { authorization: `Bearer ${token}` }, body }, res);
    assert.equal(res.statusCode, 500);
    assert.match(res.body.error, /GEMINI_API_KEY/);
    assert.deepEqual(l.calls, [`Bearer ${token}`]);
  });
}

for (const name of NETLIFY) {
  test(`netlify/functions/${name}.mjs refuses a request with no token before any outbound call`, async () => {
    // Breaks if: the Netlify twin of a function is left open while the Vercel one is guarded.
    const { outbound } = production({ good: 1 });
    const { default: handler } = await import(`../netlify/functions/${name}.mjs`);
    const res = await handler(new Request(`https://site.example.test/api/${name}`, { method: "POST", body: JSON.stringify({ message: "hi" }) }));
    assert.equal(res.status, 401);
    assert.deepEqual(outbound, []);
  });

  test(`netlify/functions/${name}.mjs lets a signed-in student through to the function itself`, async () => {
    const token = `tok-netlify-${name}`;
    const { l } = production({ [token]: 8 });
    const { default: handler } = await import(`../netlify/functions/${name}.mjs`);
    const res = await handler(new Request(`https://site.example.test/api/${name}`, { method: "POST", headers: { authorization: `Bearer ${token}` }, body: JSON.stringify({ message: "hi" }) }));
    assert.equal(res.status, 500);
    assert.match((await res.json()).error, /GEMINI_API_KEY/);
    assert.deepEqual(l.calls, [`Bearer ${token}`]);
  });
}
