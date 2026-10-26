/* Tests for the backend client (Frontend/api.js) with a fake fetch — no server needed.
   Run with:  node --test Frontend/api.test.js */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createApi, ApiError } from "./api.js";

const BASE = "https://api.example.test/api/v1";
const memoryStorage = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

/* A fetch that records every call and answers from `reply(url, init)`. A FormData body (photo
   upload) is kept as-is rather than JSON.parse'd, which would throw. */
function server(reply) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    const isForm = typeof FormData !== "undefined" && init.body instanceof FormData;
    calls.push({ url, init, body: isForm ? init.body : init.body ? JSON.parse(init.body) : undefined });
    return reply(url, init, calls.length);
  };
  return { calls, fetchImpl };
}
const make = (reply, opts = {}) => { const s = server(reply); return { ...s, api: createApi({ baseUrl: BASE, fetchImpl: s.fetchImpl, storage: memoryStorage(), ...opts }) }; };

test("with no base URL the client is disabled and every call fails with api_disabled", async () => {
  const api = createApi({ baseUrl: "" });
  assert.equal(api.enabled, false);
  await assert.rejects(() => api.getMe(), (e) => e instanceof ApiError && e.code === "api_disabled");
});

test("trailing slashes on the base URL are ignored", async () => {
  const calls = [];
  const spaced = createApi({ baseUrl: `${BASE}///`, fetchImpl: async (u, i) => { calls.push({ url: u, init: i }); return json(200, {}); }, storage: memoryStorage() });
  await spaced.getMe();
  assert.equal(calls[0].url, `${BASE}/me`);
});

test("every request asks for JSON, and a request with a body says it sends JSON", async () => {
  const { api, calls } = make(() => json(200, { user: {}, token: "t" }));
  await api.login({ login: "016556618", password: "secret123" });
  assert.equal(calls[0].init.headers.Accept, "application/json");
  assert.equal(calls[0].init.headers["Content-Type"], "application/json");
  await api.getMe();
  assert.equal(calls[1].init.headers.Accept, "application/json");
  assert.equal(calls[1].init.headers["Content-Type"], undefined);
});

test("login remembers the token and the next call carries it; login itself sends none", async () => {
  const { api, calls } = make((url) => (url.endsWith("/login") ? json(200, { user: { id: 1 }, token: "tok_123" }) : json(200, { user: { id: 1 } })));
  api.login({ login: "a@b.co", password: "secret123" });
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(calls[0].init.headers.Authorization, undefined);
  assert.deepEqual(calls[0].body, { login: "a@b.co", password: "secret123" });
  assert.equal(api.hasToken(), true);
  await api.getMe();
  assert.equal(calls[1].init.headers.Authorization, "Bearer tok_123");
});

test("register stores the token too, and a failed login stores nothing", async () => {
  const ok = make(() => json(201, { user: { id: 2 }, token: "t2" }));
  await ok.api.register({ name: "A", phone: "012345678", password: "secret123", field: "science" });
  assert.equal(ok.api.hasToken(), true);

  const bad = make(() => json(401, { message: "Wrong", code: "invalid_credentials" }));
  await assert.rejects(() => bad.api.login({ login: "x", password: "y" }), (e) => e.status === 401 && e.code === "invalid_credentials");
  assert.equal(bad.api.hasToken(), false);
});

test("an expired session (401 unauthenticated) clears the token and tells the app; a wrong password does not", async () => {
  let handled = 0;
  const { api } = make((url) => (url.endsWith("/login") ? json(401, { code: "invalid_credentials", message: "no" }) : json(401, { code: "unauthenticated", message: "Unauthenticated." })));
  api.onUnauthorized(() => { handled += 1; });
  await assert.rejects(() => api.login({ login: "x", password: "y" }));
  assert.equal(handled, 0);

  // sign in "manually" by seeding a token through a successful register
  const seeded = make((url) => (url.endsWith("/register") ? json(201, { user: {}, token: "t" }) : json(401, { code: "unauthenticated", message: "x" })));
  seeded.api.onUnauthorized(() => { handled += 1; });
  await seeded.api.register({});
  await assert.rejects(() => seeded.api.getMe(), (e) => e.code === "unauthenticated");
  assert.equal(handled, 1);
  assert.equal(seeded.api.hasToken(), false);
});

test("validation errors keep their field list and body", async () => {
  const { api } = make(() => json(422, { message: "Invalid", code: "validation_failed", errors: { phone: ["taken"] } }));
  await assert.rejects(() => api.register({}), (e) => e.status === 422 && e.code === "validation_failed" && e.errors.phone[0] === "taken" && e.body.code === "validation_failed");
});

test("stale_state keeps the server's revision on err.body", async () => {
  const { api } = make(() => json(409, { code: "stale_state", message: "old", revision: 7 }));
  await assert.rejects(() => api.putState({}, 3), (e) => e.code === "stale_state" && e.body.revision === 7);
});

test("an unreachable server becomes network_error with status 0", async () => {
  const api = createApi({ baseUrl: BASE, fetchImpl: async () => { throw new TypeError("Failed to fetch"); }, storage: memoryStorage() });
  await assert.rejects(() => api.getSummary(), (e) => e.status === 0 && e.code === "network_error");
});

test("an HTML answer (wrong URL or a static host's index.html) becomes bad_response", async () => {
  const { api } = make(() => new Response("<!doctype html><html></html>", { status: 200, headers: { "Content-Type": "text/html" } }));
  await assert.rejects(() => api.getMe(), (e) => e.code === "bad_response");
});

test("errors without a code get sensible defaults", async () => {
  await assert.rejects(() => make(() => json(429, {})).api.getMe(), (e) => e.code === "too_many_requests");
  await assert.rejects(() => make(() => json(500, { message: "boom" })).api.getMe(), (e) => e.code === "server_error");
  await assert.rejects(() => make(() => new Response("", { status: 502 })).api.getMe(), (e) => e.code === "server_error" && e.status === 502);
});

test("a rate-limit error says how long to wait: from the JSON body, or from the Retry-After header", async () => {
  const fromBody = await rejects429(() => json(429, { message: "Too Many Attempts.", code: "too_many_requests", retryAfter: 2869 }));
  assert.equal(fromBody.retryAfter, 2869);
  assert.equal(fromBody.code, "too_many_requests");
  const fromHeader = await rejects429(() => new Response(JSON.stringify({ code: "too_many_requests" }), { status: 429, headers: { "Content-Type": "application/json", "Retry-After": "42" } }));
  assert.equal(fromHeader.retryAfter, 42);
  const rounded = await rejects429(() => json(429, { code: "too_many_requests", retryAfter: 0.2 }));
  assert.equal(rounded.retryAfter, 1);                // never "0 seconds"
  const none = await rejects429(() => json(429, { code: "too_many_requests" }));
  assert.equal(none.retryAfter, null);                // the server did not say
  const junk = await rejects429(() => json(429, { code: "too_many_requests", retryAfter: "soon" }));
  assert.equal(junk.retryAfter, null);
});

test("a rate limit answered by a proxy or CDN (not JSON) is still a rate limit, with its Retry-After", async () => {
  const html = await rejects429(() => new Response("<html>Too Many Requests</html>", { status: 429, headers: { "Content-Type": "text/html", "Retry-After": "120" } }));
  assert.deepEqual([html.status, html.code, html.retryAfter], [429, "too_many_requests", 120]);
  const plain = await rejects429(() => new Response("slow down", { status: 429, headers: { "Content-Type": "text/plain" } }));
  assert.deepEqual([plain.code, plain.retryAfter], ["too_many_requests", null]);        // no header: no wait to show
  // other non-JSON answers are still "the server sent something unexpected"
  const { api } = make(() => new Response("<html>Bad gateway</html>", { status: 502, headers: { "Content-Type": "text/html" } }));
  await assert.rejects(() => api.getMe(), (e) => e.code === "bad_response" && e.status === 502);
});

test("Retry-After may also be an HTTP date", async () => {
  const inTwoMinutes = new Date(Date.now() + 120_000).toUTCString();
  const e = await rejects429(() => new Response(JSON.stringify({ code: "too_many_requests" }), { status: 429, headers: { "Content-Type": "application/json", "Retry-After": inTwoMinutes } }));
  assert.ok(e.retryAfter >= 118 && e.retryAfter <= 121, "retryAfter " + e.retryAfter);
  const past = await rejects429(() => new Response(JSON.stringify({ code: "too_many_requests" }), { status: 429, headers: { "Content-Type": "application/json", "Retry-After": new Date(Date.now() - 60_000).toUTCString() } }));
  assert.equal(past.retryAfter, null);               // a date already gone means nothing to wait for
});

test("a 'code just sent' answer keeps its code and wait so the app can show the code screen", async () => {
  const e = await rejects429(() => json(429, { message: "A code was just sent.", code: "code_recently_sent", retryAfter: 51 }));
  assert.deepEqual([e.code, e.retryAfter], ["code_recently_sent", 51]);
});

test("errors that are not rate limits have no wait", async () => {
  const { api } = make(() => json(401, { code: "invalid_credentials", message: "no" }));
  await assert.rejects(() => api.login({ login: "x", password: "y" }), (e) => e.retryAfter === null);
});

async function rejects429(reply) {
  const { api } = make(reply);
  try { await api.getMe(); } catch (e) { return e; }
  throw new Error("expected a rejection");
}

test("a 204 answer (delete) returns null", async () => {
  const { api } = make(() => new Response(null, { status: 204 }));
  assert.equal(await api.deletePlanTask(5), null);
});

test("endpoint shapes: state, study events, plan, exams, password reset", async () => {
  const { api, calls } = make(() => json(200, {}));
  await api.putState({ topicMastery: {} }, 4);
  assert.deepEqual([calls[0].init.method, calls[0].url, calls[0].body], ["PUT", `${BASE}/me/state`, { state: { topicMastery: {} }, baseRevision: 4 }]);
  await api.postStudyEvent({ type: "answer", key: "ex1" });
  assert.deepEqual([calls[1].init.method, calls[1].url], ["POST", `${BASE}/study-events`]);
  await api.getPlan("2026-10-22");
  assert.equal(calls[2].url, `${BASE}/plan?date=2026-10-22`);
  await api.getPlan();
  assert.equal(calls[3].url, `${BASE}/plan`);
  await api.addPlanTask({ title: "Read", date: "2026-10-22" });
  await api.patchPlanTask(9, { done: true });
  assert.deepEqual([calls[5].init.method, calls[5].url, calls[5].body], ["PATCH", `${BASE}/plan/tasks/9`, { done: true }]);
  await api.getExams({ track: "science", subject: "", year: 2025 });
  assert.equal(calls[6].url, `${BASE}/exams?track=science&year=2025`);
  assert.equal(calls[6].init.headers.Authorization, undefined);
  await api.forgotPassword({ login: "016556618" });
  assert.deepEqual([calls[7].url, calls[7].body], [`${BASE}/forgot-password`, { login: "016556618" }]);
});

test("reset-password signs the student in (token remembered)", async () => {
  const { api, calls } = make(() => json(200, { user: { id: 3 }, token: "fresh" }));
  await api.resetPassword({ login: "a@b.co", code: "123456", password: "newsecret1" });
  assert.deepEqual(calls[0].body, { login: "a@b.co", code: "123456", password: "newsecret1" });
  assert.equal(api.hasToken(), true);
});

test("logout clears the token even when the request fails", async () => {
  const s = server((url) => (url.endsWith("/login") ? json(200, { user: {}, token: "t" }) : Promise.reject(new TypeError("offline"))));
  const api = createApi({ baseUrl: BASE, fetchImpl: s.fetchImpl, storage: memoryStorage() });
  await api.login({ login: "x", password: "y" });
  assert.equal(api.hasToken(), true);
  await api.logout();
  assert.equal(api.hasToken(), false);
});

test("exercises: browse, attempt lifecycle, and that a photo upload sends a real FormData body", async () => {
  const { api, calls } = make(() => json(200, {}));
  await api.getExercises();
  assert.deepEqual([calls[0].init.method, calls[0].url], ["GET", `${BASE}/exercises`]);
  await api.getExercise(5);
  assert.equal(calls[1].url, `${BASE}/exercises/5`);
  await api.startExerciseAttempt(5);
  assert.deepEqual([calls[2].init.method, calls[2].url], ["POST", `${BASE}/exercises/5/attempt`]);
  await api.getExerciseAttempt(5);
  assert.equal(calls[3].url, `${BASE}/exercises/5/attempt`);

  const fakeFile = new File(["pretend-image-bytes"], "work.jpg", { type: "image/jpeg" });
  await api.uploadExercisePhoto(5, fakeFile);
  assert.equal(calls[4].init.method, "POST");
  assert.equal(calls[4].url, `${BASE}/exercises/5/attempt/photos`);
  assert.ok(calls[4].body instanceof FormData, "photo upload must send a FormData body");
  assert.equal(calls[4].body.get("photo"), fakeFile);
  // A FormData body must never be forced to JSON, and must let the browser set its own boundary.
  assert.equal(calls[4].init.headers["Content-Type"], undefined);

  await api.removeExercisePhoto(5, 9);
  assert.deepEqual([calls[5].init.method, calls[5].url], ["DELETE", `${BASE}/exercises/5/attempt/photos/9`]);
  await api.submitExerciseAttempt(5);
  assert.equal(calls[6].url, `${BASE}/exercises/5/attempt/submit`);
  await api.cancelExerciseAttempt(5);
  assert.equal(calls[7].url, `${BASE}/exercises/5/attempt/cancel`);
});

test("exercises: teacher CRUD, submissions, and comments", async () => {
  const { api, calls } = make(() => json(200, {}));
  await api.getTeacherExercises();
  assert.deepEqual([calls[0].init.method, calls[0].url], ["GET", `${BASE}/teacher/exercises`]);
  await api.createTeacherExercise({ title: "Essay", instructions: "Write 500 words." });
  assert.deepEqual([calls[1].init.method, calls[1].url, calls[1].body], [
    "POST", `${BASE}/teacher/exercises`, { title: "Essay", instructions: "Write 500 words." },
  ]);
  await api.updateTeacherExercise(3, { title: "New title" });
  assert.deepEqual([calls[2].init.method, calls[2].url], ["PATCH", `${BASE}/teacher/exercises/3`]);
  await api.deleteTeacherExercise(3);
  assert.deepEqual([calls[3].init.method, calls[3].url], ["DELETE", `${BASE}/teacher/exercises/3`]);
  await api.getTeacherExerciseSubmissions(3);
  assert.equal(calls[4].url, `${BASE}/teacher/exercises/3/submissions`);
  await api.getTeacherSubmission(3, 7);
  assert.equal(calls[5].url, `${BASE}/teacher/exercises/3/submissions/7`);
  await api.addSubmissionComment(3, 7, "Good work!");
  assert.deepEqual([calls[6].init.method, calls[6].url, calls[6].body], [
    "POST", `${BASE}/teacher/exercises/3/submissions/7/comments`, { body: "Good work!" },
  ]);
});

test("exercises: a teacher attaches a picture or PDF to their own posted exercise", async () => {
  const { api, calls } = make(() => json(200, {}));
  const fakeFile = new File(["pretend-pdf-bytes"], "worksheet.pdf", { type: "application/pdf" });
  await api.addExerciseAttachment(3, fakeFile);
  assert.equal(calls[0].init.method, "POST");
  assert.equal(calls[0].url, `${BASE}/teacher/exercises/3/attachments`);
  assert.ok(calls[0].body instanceof FormData, "attachment upload must send a FormData body");
  assert.equal(calls[0].body.get("file"), fakeFile);
  assert.equal(calls[0].init.headers["Content-Type"], undefined);

  await api.removeExerciseAttachment(3, 9);
  assert.deepEqual([calls[1].init.method, calls[1].url], ["DELETE", `${BASE}/teacher/exercises/3/attachments/9`]);
});

test("if browser storage is blocked, the session still works in memory", async () => {
  const blocked = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); }, removeItem() { throw new Error("blocked"); } };
  const s = server((url) => (url.endsWith("/login") ? json(200, { user: {}, token: "mem" }) : json(200, { user: {} })));
  const api = createApi({ baseUrl: BASE, fetchImpl: s.fetchImpl, storage: blocked });
  await api.login({ login: "x", password: "y" });
  await api.getMe();
  assert.equal(s.calls[1].init.headers.Authorization, "Bearer mem");
});
