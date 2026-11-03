/* Who may call the AI functions: students signed in to the Laravel API. They spend the shared Gemini/Groq quota, so
   on a public site nobody else gets in.

   The functions keep no accounts. The website sends the same Bearer token it uses for the Laravel API, and this asks
   that API ("who am I", GET /me) whether it is valid -- the same rule the AI coach server applies (src/auth.py).
   Set AUTH_VERIFY_URL to that address (https://<api>/api/v1/me); left empty (local development) the functions stay open.

   Checks are remembered for a short while, so a chat costs Laravel at most one request a minute per instance, and a
   student who logs out is locked out when the remembered check expires. Serverless instances do not share memory, so
   the per-student limit below is per instance: a brake on a runaway page, not an exact quota. */
import { createHash, randomUUID } from "node:crypto";

export function bearerToken(header) {
  if (typeof header !== "string") return null;
  const parts = header.trim().split(/\s+/);
  return parts.length === 2 && parts[0].toLowerCase() === "bearer" ? parts[1] : null;
}

class Unavailable extends Error {}

export function createSignedInCheck({
  url,
  fetchImpl = (...args) => globalThis.fetch(...args),
  now = Date.now,
  cacheMs = 60_000,
  rejectedMs = 15_000,
  perMinute = 20,
  timeoutMs = 5_000,
} = {}) {
  const seen = new Map(); // sha256(token) -> { student, until }; the token itself is never kept
  const served = new Map(); // student -> timestamps of served requests in the last minute

  const refuse = (status, error, headers = {}) => ({ status, body: { error }, headers });

  async function ask(token) {
    let res;
    try {
      res = await fetchImpl(url, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      throw new Unavailable("sign-in API unreachable");
    }
    if (res.status === 401) return null;
    if (res.status !== 200) throw new Unavailable(`sign-in API answered ${res.status}`);
    const student = (await res.json().catch(() => null))?.user?.id;
    if (student === undefined || student === null) throw new Unavailable("sign-in API sent no student id");
    return String(student);
  }

  async function studentFor(token) {
    const key = createHash("sha256").update(token).digest("hex");
    const at = now();
    const remembered = seen.get(key);
    if (remembered && at < remembered.until) return remembered.student;

    const student = await ask(token);
    if (seen.size >= 1024) for (const [k, v] of seen) if (at >= v.until) seen.delete(k);
    seen.set(key, { student, until: at + (student === null ? rejectedMs : cacheMs) });
    return student;
  }

  /* Resolves to null when the request may go ahead, else { status, body, headers } to answer with. */
  return async function check(authorization) {
    if (!url) return null;
    const token = bearerToken(authorization);
    if (!token) return refuse(401, "Sign in to use the AI features.", { "WWW-Authenticate": "Bearer" });

    let student;
    try {
      student = await studentFor(token);
    } catch (err) {
      if (!(err instanceof Unavailable)) throw err;
      console.error("Could not check a sign-in:", err.message);
      return refuse(503, "Could not check your sign-in just now. Please try again in a moment.");
    }
    if (student === null) return refuse(401, "Your sign-in has expired. Please sign in again.", { "WWW-Authenticate": "Bearer" });

    const at = now();
    const recent = (served.get(student) ?? []).filter((t) => at - t < 60_000);
    if (recent.length >= perMinute) {
      served.set(student, recent);
      const wait = Math.max(1, Math.ceil((60_000 - (at - recent[0])) / 1000));
      return refuse(429, "You are asking very fast. Please wait a moment and try again.", { "Retry-After": String(wait) });
    }
    recent.push(at);
    served.set(student, recent);
    return null;
  };
}

/* The address is read on each call so a changed environment variable takes effect, and tests can set it. */
let current = null;
function check() {
  const url = (process.env.AUTH_VERIFY_URL || "").trim();
  if (!current || current.url !== url) current = { url, check: createSignedInCheck({ url }) };
  return current.check;
}

/* Vercel: true when the request was refused and already answered, so the handler returns. */
export async function refuseUnlessSignedIn(req, res) {
  const refused = await check()(req.headers?.authorization);
  if (!refused) return false;
  for (const [name, value] of Object.entries(refused.headers)) res.setHeader(name, value);
  res.status(refused.status).json(refused.body);
  return true;
}

/* Netlify: the Response to send when refused, else null. */
export async function refuseUnlessSignedInNetlify(req) {
  const refused = await check()(req.headers.get("authorization"));
  return refused ? Response.json(refused.body, { status: refused.status, headers: refused.headers }) : null;
}

/* The daily limit on AI questions (Free 5, VIP Bondus 60, Super Bondus 150), counted by the Laravel API. The website counts a
   question before asking it and sends the same id as `request_id`; a function reports that id to the same API with the student's
   own token before it answers. The API counts one id once, so the question is not counted twice, and says no once the student's
   plan is used up. The website's own check only keeps honest students informed: anyone can call a function directly, so this is
   where the limit is real (the AI coach server does the same in src/quota.py).

   Only the API's own "no" (402 ai_limit_reached) stops a question. If it cannot be reached, or does not have the feature yet,
   the question goes ahead. */
const REQUEST_ID = /^[A-Za-z0-9_-]{8,64}$/;

/* The id to count a request under: the one the website made, or a fresh one, so leaving it out is not a way round the limit. */
export function questionId(supplied) {
  return typeof supplied === "string" && REQUEST_ID.test(supplied) ? supplied : randomUUID().replaceAll("-", "");
}

export function createQuotaCheck({ url, fetchImpl = (...args) => globalThis.fetch(...args), timeoutMs = 5_000 } = {}) {
  /* Resolves to null when the question may go ahead, else { status, body } to answer with. */
  return async function count(authorization, suppliedId) {
    if (!url) return null;
    const token = bearerToken(authorization);
    if (!token) return null; // sign-in has already been checked; with no token there is no one to count
    let res;
    try {
      res = await fetchImpl(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: questionId(suppliedId) }),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      console.error("Could not count an AI question: the quota API is unreachable");
      return null;
    }
    const body = await res.json().catch(() => null);
    if (res.status === 402 && body?.code === "ai_limit_reached") {
      return {
        status: 402,
        body: { error: "You have used all of today's AI questions on your plan.", code: "ai_limit_reached", plan: body.plan ?? null, limit: body.limit ?? null },
      };
    }
    if (res.status !== 200) console.error(`Could not count an AI question: the quota API answered ${res.status}`);
    return null;
  };
}

/* Where questions are counted: AUTH_QUOTA_URL, else /ai/consume next to AUTH_VERIFY_URL. Empty (no limit) when sign-in is off,
   or AI_QUOTA_ENFORCE is "false". Read on each call so a changed environment variable takes effect, and tests can set it. */
export function quotaUrl(env = process.env) {
  if (String(env.AI_QUOTA_ENFORCE ?? "true").trim().toLowerCase() === "false") return "";
  const verify = (env.AUTH_VERIFY_URL || "").trim().replace(/\/+$/, "");
  if (!verify) return "";
  const explicit = (env.AUTH_QUOTA_URL || "").trim();
  if (explicit) return explicit;
  return verify.endsWith("/me") ? `${verify.slice(0, -3)}/ai/consume` : "";
}

let counter = null;
function quota() {
  const url = quotaUrl();
  if (!counter || counter.url !== url) counter = { url, count: createQuotaCheck({ url }) };
  return counter.count;
}

/* Vercel: true when the question was refused (the student is out of questions) and already answered, so the handler returns. */
export async function refuseIfOutOfQuestions(req, res) {
  const refused = await quota()(req.headers?.authorization, req.body?.request_id);
  if (!refused) return false;
  res.status(refused.status).json(refused.body);
  return true;
}

/* Netlify: the Response to send when the student is out of questions, else null. `payload` is the parsed request body. */
export async function refuseIfOutOfQuestionsNetlify(req, payload) {
  const refused = await quota()(req.headers.get("authorization"), payload?.request_id);
  return refused ? Response.json(refused.body, { status: refused.status }) : null;
}
