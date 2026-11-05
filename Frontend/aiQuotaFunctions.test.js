/* The daily limit on AI questions, enforced by the serverless AI functions (Major Guidance, University Mentor). The guard in
   api/_auth.js reports each question to the Laravel API (POST /ai/consume) with the student's own token; only that network
   call is faked here. The rules are the same as the AI coach server's (src/quota.py).
   Run with:  node --test Frontend/aiQuotaFunctions.test.js */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createQuotaCheck, questionId, quotaUrl } from "../api/_auth.js";

const CONSUME = "https://api.example.test/api/v1/ai/consume";
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

/* The Laravel API as the guard sees it: `limit` questions a day, an id counted once. */
function laravel({ limit = 5, down = false, status = null } = {}) {
  const seen = new Set();
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    calls.push({ url: String(url), method: init.method, authorization: init.headers?.Authorization, body: JSON.parse(init.body ?? "{}") });
    if (down) throw new TypeError("fetch failed");
    if (status) return json(status, { message: "x" });
    const id = JSON.parse(init.body).requestId;
    if (!seen.has(id) && seen.size >= limit) return json(402, { allowed: false, plan: "free", limit, code: "ai_limit_reached" });
    seen.add(id);
    return json(200, { allowed: true, plan: "free", limit });
  };
  return { calls, fetchImpl };
}
const guard = (l) => createQuotaCheck({ url: CONSUME, fetchImpl: l.fetchImpl });
const originalError = console.error;

test("a question is counted with the student's own token and the id the website made", async () => {
  // Breaks if: the function counts under someone else's token, or ignores the id so a question is counted twice.
  const l = laravel();
  assert.equal(await guard(l)("Bearer tok-1", "question-abc123"), null);
  assert.deepEqual(l.calls, [{ url: CONSUME, method: "POST", authorization: "Bearer tok-1", body: { requestId: "question-abc123" } }]);
});

test("the same question counted twice (the website, then the function) uses one of the day's questions", async () => {
  // Breaks if: every question costs two.
  const l = laravel({ limit: 1 });
  assert.equal(await guard(l)("Bearer t", "question-abc123"), null);
  assert.equal(await guard(l)("Bearer t", "question-abc123"), null);
});

test("a student who is out of questions is refused with 402 and the plan's numbers", async () => {
  // Breaks if: a Free student can ask the mentor as often as they like by calling the function directly.
  const l = laravel({ limit: 2 });
  const g = guard(l);
  await g("Bearer t", "question-000001");
  await g("Bearer t", "question-000002");
  const refused = await g("Bearer t", "question-000003");
  assert.equal(refused.status, 402);
  assert.equal(refused.body.code, "ai_limit_reached");
  assert.equal(refused.body.limit, 2);
  assert.equal(refused.body.plan, "free");
});

test("leaving the id out, or sending a bad one, is still counted, once per request", async () => {
  // Breaks if: dropping `request_id` is a way round the limit.
  const l = laravel({ limit: 3 });
  const g = guard(l);
  for (const supplied of [undefined, "short", 12, "has spaces in it", "x".repeat(65)]) {
    const before = l.calls.length;
    await g("Bearer t", supplied).catch(() => {});
    assert.equal(l.calls.length, before + 1, String(supplied));
    assert.match(l.calls.at(-1).body.requestId, /^[A-Za-z0-9_-]{8,64}$/);
  }
  assert.equal(new Set(l.calls.map((c) => c.body.requestId)).size, l.calls.length, "every request gets its own id");
  assert.equal(l.calls.length, 5);
  // five distinct ids against a limit of 3: the fourth was refused
  assert.equal((await guard(laravel({ limit: 1 }))("Bearer t")), null);
});

test("without an id each request is counted, so the limit still bites", async () => {
  const l = laravel({ limit: 2 });
  const g = guard(l);
  assert.equal(await g("Bearer t"), null);
  assert.equal(await g("Bearer t"), null);
  assert.equal((await g("Bearer t")).status, 402);
});

test("an unreachable or confused API does not take the mentor down: a question goes ahead, within a temporary daily allowance", async () => {
  // Breaks if: an outage of the Laravel API takes the mentor down for every student.
  console.error = () => {};
  try {
    assert.equal(await guard(laravel({ down: true }))("Bearer t", "question-abc123"), null);
    for (const status of [401, 404, 500, 503]) {
      assert.equal(await guard(laravel({ status }))("Bearer t", "question-abc123"), null, String(status));
    }
  } finally { console.error = originalError; }
});

test("while the API cannot answer, a student gets only a temporary daily allowance (and a day later it starts again)", async () => {
  // Breaks if: an outage, or making the API fail, is an unlimited free pass.
  console.error = () => {};
  try {
    let at = Date.UTC(2026, 10, 5, 3, 0, 0);
    const check = createQuotaCheck({ url: CONSUME, fetchImpl: laravel({ status: 500 }).fetchImpl, now: () => at, outagePerDay: 2 });
    assert.equal(await check("Bearer t", "question-000001"), null);
    assert.equal(await check("Bearer t", "question-000002"), null);
    assert.equal(await check("Bearer t", "question-000001"), null, "the same question again is not a new one");
    const refused = await check("Bearer t", "question-000003");
    assert.equal(refused.status, 503);
    assert.equal(refused.body.code, "quota_unavailable");
    assert.equal(await check("Bearer other", "question-000003"), null, "each student has their own allowance");
    at += 24 * 3_600_000;
    assert.equal(await check("Bearer t", "question-000003"), null, "a new day starts again");
  } finally { console.error = originalError; }
});

test("a student the API is throttling is refused, not let through", async () => {
  // Breaks if: flooding the Laravel API until it answers 429 lets a student ask without being counted.
  const fetchImpl = async () => new Response("{}", { status: 429, headers: { "Retry-After": "42", "Content-Type": "application/json" } });
  const refused = await createQuotaCheck({ url: CONSUME, fetchImpl })("Bearer t", "question-abc123");
  assert.equal(refused.status, 429);
  assert.equal(refused.headers["Retry-After"], "42");
  const noHeader = await createQuotaCheck({ url: CONSUME, fetchImpl: async () => new Response("{}", { status: 429 }) })("Bearer t", "question-abc123");
  assert.equal(noHeader.headers["Retry-After"], "30");
});

test("a 402 that is not the API's ai_limit_reached does not stop a question", async () => {
  // Breaks if: any proxy or host answering 402 locks every student out.
  console.error = () => {};
  try {
    const fetchImpl = async () => json(402, { message: "Payment Required" });
    assert.equal(await createQuotaCheck({ url: CONSUME, fetchImpl })("Bearer t", "question-abc123"), null);
  } finally { console.error = originalError; }
});

test("with no limit configured, or no token, nothing is asked of Laravel", async () => {
  const l = laravel();
  assert.equal(await createQuotaCheck({ url: "", fetchImpl: l.fetchImpl })("Bearer t", "question-abc123"), null);
  assert.equal(await guard(l)(undefined, "question-abc123"), null);
  assert.deepEqual(l.calls, []);
});

test("questionId keeps a usable id and makes a fresh one otherwise", () => {
  assert.equal(questionId("abcd1234-_XY"), "abcd1234-_XY");
  assert.notEqual(questionId(undefined), questionId(undefined));
  assert.match(questionId("no"), /^[A-Za-z0-9_-]{8,64}$/);
});

test("the count goes to /ai/consume next to the sign-in address, and can be turned off or pointed elsewhere", () => {
  assert.equal(quotaUrl({ AUTH_VERIFY_URL: "https://api.example.test/api/v1/me" }), CONSUME);
  assert.equal(quotaUrl({ AUTH_VERIFY_URL: "https://api.example.test/api/v1/me/" }), CONSUME);
  assert.equal(quotaUrl({}), "", "no sign-in, no limit (local development)");
  assert.equal(quotaUrl({ AUTH_VERIFY_URL: "https://api.example.test/api/v1/me", AI_QUOTA_ENFORCE: "false" }), "");
  assert.equal(quotaUrl({ AUTH_VERIFY_URL: "https://api.example.test/api/v1/me", AI_QUOTA_ENFORCE: "FALSE" }), "");
  assert.equal(quotaUrl({ AUTH_VERIFY_URL: "https://api.example.test/api/v1/me", AUTH_QUOTA_URL: "https://elsewhere.test/count" }), "https://elsewhere.test/count");
  assert.equal(quotaUrl({ AUTH_VERIFY_URL: "https://api.example.test/something-else" }), "", "an address that does not end in /me is left alone");
});

/* The handlers: the limit is checked after sign-in and before the model is called, on both hosts. */
const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
for (const name of ["major-guidance", "university-mentor"]) {
  test(`${name}: counted after sign-in and before the AI is called, on Vercel and Netlify`, () => {
    // Breaks if: a function is added or edited without the limit, so it can be used without counting.
    const v = read(`api/${name}.js`);
    assert.ok(v.indexOf("refuseUnlessSignedIn(req, res)") < v.indexOf("refuseIfOutOfQuestions(req, res)"), "Vercel: sign-in first");
    assert.ok(v.indexOf("refuseIfOutOfQuestions(req, res)") < v.indexOf("await " + (name === "major-guidance" ? "majorGuidance" : "universityMentor") + "("), "Vercel: count before the AI");
    const n = read(`netlify/functions/${name}.mjs`);
    assert.ok(n.indexOf("refuseUnlessSignedInNetlify(req)") < n.indexOf("refuseIfOutOfQuestionsNetlify(req, payload)"), "Netlify: sign-in first");
    assert.ok(n.indexOf("refuseIfOutOfQuestionsNetlify(req, payload)") < n.indexOf("await " + (name === "major-guidance" ? "majorGuidance" : "universityMentor") + "("), "Netlify: count before the AI");
  });
}

test("IELTS grading is deliberately not counted: it needs sign-in but spends none of the day's AI questions", () => {
  // Breaks if: the grader is limited by mistake. It is an English-language skill check, not an AI coach question, so it is left out
  // on purpose (decided by the owner); change this test together with that decision.
  const v = read("api/ielts-grade.js");
  assert.match(v, /refuseUnlessSignedIn\(req, res\)/);
  assert.doesNotMatch(v, /refuseIfOutOfQuestions|createQuotaCheck/);
});

/* End to end through the real handlers, with Laravel faked at the network level (needs the site's packages, like aiAuth.test.js). */
const ME = "https://api.example.test/api/v1/me";
function production(users, { limit }) {
  const seen = new Set();
  const outbound = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    outbound.push(String(url));
    const token = (init.headers?.Authorization ?? "").replace(/^Bearer /, "");
    if (!(token in users)) return json(401, { code: "unauthenticated" });
    if (String(url) === ME) return json(200, { user: { id: users[token] } });
    if (String(url) === CONSUME) {
      const id = JSON.parse(init.body).requestId;
      if (!seen.has(id) && seen.size >= limit) return json(402, { allowed: false, plan: "free", limit, code: "ai_limit_reached" });
      seen.add(id);
      return json(200, { allowed: true, plan: "free", limit });
    }
    return json(404, {});
  };
  process.env.AUTH_VERIFY_URL = ME;
  delete process.env.AI_QUOTA_ENFORCE;
  delete process.env.GEMINI_API_KEY; // no AI key: a question that gets past the limit answers 500 about the missing key
  delete process.env.GROQ_API_KEY;
  return { outbound, restore: () => { globalThis.fetch = realFetch; delete process.env.AUTH_VERIFY_URL; } };
}

for (const name of ["major-guidance", "university-mentor"]) {
  test(`${name}: a student who has used their questions is stopped before the AI, a student with some left is not (Vercel)`, async () => {
    const token = `tok-quota-vercel-${name}`;
    const { restore } = production({ [token]: 31 }, { limit: 1 });
    try {
      const { default: handler } = await import(`../api/${name}.js`);
      const ask = async (request_id) => {
        const res = { statusCode: null, body: null, status(c) { res.statusCode = c; return res; }, json(b) { res.body = b; return res; }, setHeader() {} };
        await handler({ method: "POST", headers: { authorization: `Bearer ${token}` }, body: { message: "hi", request_id } }, res);
        return res;
      };
      const first = await ask("question-first-1");
      assert.equal(first.statusCode, 500); // got past the limit; the missing AI key is what answered
      assert.match(first.body.error, /GEMINI_API_KEY/);
      const again = await ask("question-first-1"); // the website already counted this id: still the same question
      assert.equal(again.statusCode, 500);
      const second = await ask("question-second-2");
      assert.equal(second.statusCode, 402);
      assert.equal(second.body.code, "ai_limit_reached");
    } finally { restore(); }
  });

  test(`${name}: the same on Netlify`, async () => {
    const token = `tok-quota-netlify-${name}`;
    const { restore } = production({ [token]: 32 }, { limit: 1 });
    try {
      const { default: handler } = await import(`../netlify/functions/${name}.mjs`);
      const ask = (request_id) => handler(new Request(`https://site.example.test/api/${name}`, { method: "POST", headers: { authorization: `Bearer ${token}` }, body: JSON.stringify({ message: "hi", request_id }) }));
      assert.equal((await ask("question-first-1")).status, 500);
      const second = await ask("question-second-2");
      assert.equal(second.status, 402);
      assert.equal((await second.json()).code, "ai_limit_reached");
    } finally { restore(); }
  });
}
