/* Who may call the AI functions: students signed in to the Laravel API. They spend the shared Gemini/Groq quota, so
   on a public site nobody else gets in.

   The functions keep no accounts. The website sends the same Bearer token it uses for the Laravel API, and this asks
   that API ("who am I", GET /me) whether it is valid -- the same rule the AI coach server applies (src/auth.py).
   Set AUTH_VERIFY_URL to that address (https://<api>/api/v1/me); left empty (local development) the functions stay open.

   Checks are remembered for a short while, so a chat costs Laravel at most one request a minute per instance, and a
   student who logs out is locked out when the remembered check expires. Serverless instances do not share memory, so
   the per-student limit below is per instance: a brake on a runaway page, not an exact quota.

   Laravel limits requests by token, and every made-up token is a new one, so a flood of fake tokens would reach Laravel
   one question each. This turns away tokens not shaped like Laravel Sanctum's without asking, and lets one caller have
   only a few tokens we have not seen turned down a minute (the AI coach server does the same in src/auth.py). */
import { createHash, randomUUID } from "node:crypto";

export function bearerToken(header) {
  if (typeof header !== "string") return null;
  const parts = header.trim().split(/\s+/);
  return parts.length === 2 && parts[0].toLowerCase() === "bearer" ? parts[1] : null;
}

class Unavailable extends Error {}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32Hex(text) {
  let c = 0xffffffff;
  for (const byte of Buffer.from(text, "utf8")) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return ((c ^ 0xffffffff) >>> 0).toString(16).padStart(8, "0");
}

/* Whether `token` is shaped like one Laravel Sanctum hands out: `<id>|<40 random characters><8 hex characters>`, the
   last 8 being the crc32 of the 40 before them (tokens from before Sanctum added that are 40 characters, with none).
   Anyone can make such a string, so this proves nothing; it only turns most junk away without a question to Laravel. */
export function looksLikeToken(token) {
  if (typeof token !== "string") return false;
  const bar = token.indexOf("|");
  if (bar < 1 || !/^[0-9]{1,18}$/.test(token.slice(0, bar))) return false;
  const body = token.slice(bar + 1);
  if (!/^[A-Za-z0-9_-]{40,200}$/.test(body)) return false;
  if (body.length === 40) return true;
  if (body.length < 48) return false;
  return crc32Hex(body.slice(-48, -8)) === body.slice(-8);
}

/* How many tokens we have not seen may be sent to Laravel: `perAddress` a minute from one caller, `overall` from all.
   A lookup is counted when it starts (so a burst of parallel requests is counted) and given back when the token proves
   good, so only tokens that fail use up an allowance. Returns { give_back } or { wait } (seconds) when refused. */
function createLookupBudget({ perAddress, overall, now, windowMs = 60_000 }) {
  const byAddress = new Map();
  let all = [];
  const fresh = (list, at) => list.filter((t) => at - t < windowMs);
  const release = (address, at) => {
    const mine = byAddress.get(address);
    if (mine && mine.includes(at)) mine.splice(mine.indexOf(at), 1);
    if (all.includes(at)) all.splice(all.indexOf(at), 1);
  };
  return function reserve(address) {
    const at = now();
    all = fresh(all, at);
    const mine = fresh(byAddress.get(address) ?? [], at);
    byAddress.set(address, mine);
    for (const [held, limit] of [[mine, perAddress], [all, overall]]) {
      if (held.length >= limit) return { wait: Math.max(1, Math.ceil((windowMs - (at - held[0])) / 1000)) };
    }
    mine.push(at);
    all.push(at);
    if (byAddress.size >= 4096) for (const [a, list] of byAddress) if (!fresh(list, at).length) byAddress.delete(a);
    return { giveBack: () => release(address, at) };
  };
}

export function createSignedInCheck({
  url,
  fetchImpl = (...args) => globalThis.fetch(...args),
  now = Date.now,
  cacheMs = 60_000,
  rejectedMs = 15_000,
  perMinute = 20,
  timeoutMs = 5_000,
  requireTokenShape = false,
  rejectedPerAddress = 20,
  rejectedOverall = 300,
} = {}) {
  const reserveLookup = createLookupBudget({ perAddress: rejectedPerAddress, overall: rejectedOverall, now });
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

  const keyOf = (token) => createHash("sha256").update(token).digest("hex");
  const remembers = (token) => {
    const remembered = seen.get(keyOf(token));
    return Boolean(remembered) && now() < remembered.until;
  };

  async function studentFor(token) {
    const key = keyOf(token);
    const at = now();
    const remembered = seen.get(key);
    if (remembered && at < remembered.until) return remembered.student;
    if (requireTokenShape && !looksLikeToken(token)) return null; // never handed out by Laravel: no need to ask, or to remember

    const student = await ask(token);
    if (seen.size >= 1024) for (const [k, v] of seen) if (at >= v.until) seen.delete(k);
    seen.set(key, { student, until: at + (student === null ? rejectedMs : cacheMs) });
    return student;
  }

  /* Resolves to null when the request may go ahead, else { status, body, headers } to answer with. `address` is the caller's. */
  async function check(authorization, address = "unknown") {
    if (!url) return null;
    const token = bearerToken(authorization);
    if (!token) return refuse(401, "Sign in to use the AI features.", { "WWW-Authenticate": "Bearer" });

    // A token we have not seen costs a question to Laravel, and made-up tokens are all new: cap how many a caller may try.
    let lookup = null;
    if (!remembers(token)) {
      lookup = reserveLookup(address);
      if (lookup.wait) {
        return refuse(429, "Too many sign-in attempts. Please wait a moment and try again.", { "Retry-After": String(lookup.wait) });
      }
    }

    let student;
    try {
      student = await studentFor(token);
    } catch (err) {
      lookup?.giveBack?.(); // Laravel's trouble, not the caller's
      if (!(err instanceof Unavailable)) throw err;
      console.error("Could not check a sign-in:", err.message);
      return refuse(503, "Could not check your sign-in just now. Please try again in a moment.");
    }
    if (student !== null) lookup?.giveBack?.();
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
  }
  /* Who a token belongs to, from the checks already remembered (null when it is not one: call `check` first). */
  check.studentOf = (authorization) => {
    const token = bearerToken(authorization);
    const remembered = token ? seen.get(keyOf(token)) : null;
    return remembered && now() < remembered.until ? remembered.student : null;
  };
  return check;
}

/* A Phnom Penh day, as the Laravel API counts a day (UTC+7, no daylight saving), and the seconds until it ends. */
const phnomPenhDay = (at) => new Date(at + 7 * 3_600_000).toISOString().slice(0, 10);
const secondsToMidnight = (at) => Math.max(1, Math.ceil((86_400_000 - ((at + 7 * 3_600_000) % 86_400_000)) / 1000));
const dayRefusal = (at, error, code) => ({ status: 429, body: { error, code }, headers: { "Retry-After": String(secondsToMidnight(at)) } });

/* Production with no AUTH_VERIFY_URL would leave every AI function open to the whole internet, spending the shared Gemini/Groq
   quota, so there the functions refuse instead (503). Local development and preview deployments stay open; AUTH_REQUIRED=false
   switches this off on purpose. */
export function signInUnconfigured(env = process.env) {
  if ((env.AUTH_VERIFY_URL || "").trim()) return false;
  if (/^(0|false|off|no)$/i.test((env.AUTH_REQUIRED || "").trim())) return false;
  return env.VERCEL_ENV === "production" || env.CONTEXT === "production";
}
const unconfigured = () => ({
  status: 503,
  body: { error: "The AI features are switched off until sign-in checking is set up on this server.", code: "auth_not_configured" },
  headers: {},
});
let warnedUnconfigured = false;
function refuseUnconfigured() {
  if (!warnedUnconfigured) { warnedUnconfigured = true; console.error("AUTH_VERIFY_URL is not set in production: the AI functions are refusing every request. Set it to the Laravel API's /me address."); }
  return unconfigured();
}

/* How many different questions one network address may ask in a day on Free accounts, across all of them. Each Free account has its
   own daily questions, so a script that makes accounts would otherwise spend the shared AI quota (the AI coach server does the same,
   src/rate_limit.py). Per instance, like the other brakes here: it starts again when an instance does, a leak and never a lockout. */
export function createAddressBudget({ limit = 300, now = Date.now } = {}) {
  let day = null;
  let asked = new Map(); // address -> Set of question ids
  return function take(address, id) {
    if (limit <= 0) return true;
    const today = phnomPenhDay(now());
    if (today !== day) { day = today; asked = new Map(); }
    const ids = asked.get(address) ?? new Set();
    if (!ids.has(id) && ids.size >= limit) return false;
    ids.add(id);
    asked.set(address, ids);
    return true;
  };
}

/* A feature the Laravel API does not count (the IELTS grader): a daily allowance per student, per network address and in all, kept
   in memory per instance. `take({ student, address })` resolves to null, or the { status, body, headers } to answer with. */
export function createDailyAllowance({ perStudent = 20, perAddress = 200, overall = 3000, now = Date.now } = {}) {
  let day = null;
  let students = new Map();
  let addresses = new Map();
  let total = 0;
  return function take({ student, address }) {
    const at = now();
    const today = phnomPenhDay(at);
    if (today !== day) { day = today; students = new Map(); addresses = new Map(); total = 0; }
    if ((students.get(student) ?? 0) >= perStudent) return dayRefusal(at, "You have used today's turns of this feature. Please try again tomorrow.", "daily_limit_reached");
    if ((addresses.get(address) ?? 0) >= perAddress) return dayRefusal(at, "Too many requests from this network today. Please try again tomorrow.", "address_limit_reached");
    if (total >= overall) return dayRefusal(at, "This feature is very busy today. Please try again tomorrow.", "busy");
    students.set(student, (students.get(student) ?? 0) + 1);
    addresses.set(address, (addresses.get(address) ?? 0) + 1);
    total += 1;
    return null;
  };
}

const intFrom = (value, fallback) => (Number.isInteger(Number(value)) && String(value ?? "").trim() !== "" && Number(value) >= 0 ? Number(value) : fallback);

/* The address is read on each call so a changed environment variable takes effect, and tests can set it. */
let current = null;
function check() {
  const url = (process.env.AUTH_VERIFY_URL || "").trim();
  const requireTokenShape = !/^(0|false|off|no)$/i.test((process.env.AUTH_CHECK_TOKEN_SHAPE || "").trim());
  if (!current || current.url !== url || current.requireTokenShape !== requireTokenShape) {
    current = { url, requireTokenShape, check: createSignedInCheck({ url, requireTokenShape }) };
  }
  return current.check;
}

/* The caller's address as the host reports it. Vercel and Netlify set these themselves, so a caller cannot choose them. */
function callerAddress(get, socket) {
  const forwarded = String(get("x-vercel-forwarded-for") || get("x-nf-client-connection-ip") || get("x-real-ip") || "");
  const hops = (forwarded || String(get("x-forwarded-for") || "")).split(",").map((h) => h.trim()).filter(Boolean);
  return hops.at(-1) || socket || "unknown";
}

/* Vercel: true when the request was refused and already answered, so the handler returns. */
export async function refuseUnlessSignedIn(req, res) {
  const refused = signInUnconfigured() ? refuseUnconfigured() : await check()(req.headers?.authorization, callerAddress((name) => req.headers?.[name], req.socket?.remoteAddress));
  if (!refused) return false;
  for (const [name, value] of Object.entries(refused.headers)) res.setHeader(name, value);
  res.status(refused.status).json(refused.body);
  return true;
}

/* Netlify: the Response to send when refused, else null. */
export async function refuseUnlessSignedInNetlify(req) {
  const refused = signInUnconfigured() ? refuseUnconfigured() : await check()(req.headers.get("authorization"), callerAddress((name) => req.headers.get(name)));
  return refused ? Response.json(refused.body, { status: refused.status, headers: refused.headers }) : null;
}

/* The daily limit on AI questions (Free 5, VIP Bondus 60, Super Bondus 150), counted by the Laravel API. The website counts a
   question before asking it and sends the same id as `request_id`; a function reports that id to the same API with the student's
   own token before it answers. The API counts one id once, so the question is not counted twice, and says no once the student's
   plan is used up. The website's own check only keeps honest students informed: anyone can call a function directly, so this is
   where the limit is real (the AI coach server does the same in src/quota.py).

   The API's own "no" (402 ai_limit_reached) stops a question, and so does its 429: a student cannot make the API throttle
   them and so get a free pass. If it cannot be reached, or does not have the feature yet, a question still goes ahead, but only
   up to a few a day per student on this instance (a brake, not an exact quota: instances do not share memory), so an outage is
   not an unlimited pass. */
const REQUEST_ID = /^[A-Za-z0-9_-]{8,64}$/;

/* The id to count a request under: the one the website made, or a fresh one, so leaving it out is not a way round the limit. */
export function questionId(supplied) {
  return typeof supplied === "string" && REQUEST_ID.test(supplied) ? supplied : randomUUID().replaceAll("-", "");
}

export function createQuotaCheck({ url, fetchImpl = (...args) => globalThis.fetch(...args), timeoutMs = 5_000, now = Date.now, outagePerDay = 30, freePerAddressDaily = 300 } = {}) {
  const freeBudget = createAddressBudget({ limit: freePerAddressDaily, now });
  const outage = new Map(); // `${Phnom Penh day}:${sha256(token)}` -> the question ids let through while the API could not answer

  /* True when this question may go ahead although the API could not count it. */
  function allowDuringOutage(token, id) {
    if (outagePerDay <= 0) return true;
    const day = new Date(now() + 7 * 3_600_000).toISOString().slice(0, 10);
    for (const key of outage.keys()) if (!key.startsWith(day)) outage.delete(key);
    const key = `${day}:${createHash("sha256").update(token).digest("hex")}`;
    const ids = outage.get(key) ?? new Set();
    if (!ids.has(id) && ids.size >= outagePerDay) return false;
    ids.add(id);
    outage.set(key, ids);
    return true;
  }
  const outageRefusal = () => ({
    status: 503,
    body: { error: "We could not check your daily questions just now, and you have reached the temporary limit. Please try again later.", code: "quota_unavailable" },
  });

  /* Resolves to null when the question may go ahead, else { status, body, headers? } to answer with. */
  return async function count(authorization, suppliedId, address = "unknown") {
    if (!url) return null;
    const token = bearerToken(authorization);
    if (!token) return null; // sign-in has already been checked; with no token there is no one to count
    const id = questionId(suppliedId);
    let res;
    try {
      res = await fetchImpl(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: id }),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      console.error("Could not count an AI question: the quota API is unreachable");
      return allowDuringOutage(token, id) ? null : outageRefusal();
    }
    const body = await res.json().catch(() => null);
    if (res.status === 402 && body?.code === "ai_limit_reached") {
      return {
        status: 402,
        body: { error: "You have used all of today's AI questions on your plan.", code: "ai_limit_reached", plan: body.plan ?? null, limit: body.limit ?? null },
      };
    }
    if (res.status === 429) {
      const wait = Math.min(300, Math.max(1, Number.parseInt(res.headers?.get?.("retry-after") ?? "", 10) || 30));
      return { status: 429, body: { error: "You are asking very fast. Please wait a moment and try again." }, headers: { "Retry-After": String(wait) } };
    }
    if (res.status !== 200) {
      console.error(`Could not count an AI question: the quota API answered ${res.status}`);
      return allowDuringOutage(token, id) ? null : outageRefusal();
    }
    // The question is counted for this account. A Free account also counts against its network address, across accounts.
    if (body?.plan === "free" && !freeBudget(address, id)) {
      return dayRefusal(now(), "Too many questions from this network today. Please try again tomorrow.", "address_limit_reached");
    }
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
  if (!counter || counter.url !== url) counter = { url, count: createQuotaCheck({ url, freePerAddressDaily: intFrom(process.env.FREE_AI_PER_ADDRESS_DAILY, 300) }) };
  return counter.count;
}

/* Vercel: true when the question was refused (the student is out of questions) and already answered, so the handler returns. */
export async function refuseIfOutOfQuestions(req, res) {
  const refused = await quota()(req.headers?.authorization, req.body?.request_id, callerAddress((name) => req.headers?.[name], req.socket?.remoteAddress));
  if (!refused) return false;
  for (const [name, value] of Object.entries(refused.headers ?? {})) res.setHeader(name, value);
  res.status(refused.status).json(refused.body);
  return true;
}

/* Netlify: the Response to send when the student is out of questions, else null. `payload` is the parsed request body. */
export async function refuseIfOutOfQuestionsNetlify(req, payload) {
  const refused = await quota()(req.headers.get("authorization"), payload?.request_id, callerAddress((name) => req.headers.get(name)));
  return refused ? Response.json(refused.body, { status: refused.status, headers: refused.headers ?? {} }) : null;
}

/* The IELTS grader is not counted by the Laravel API (it is a short placement check, not a coach question), so it has its own
   daily allowance here: per student, per network address and in all (IELTS_DAILY_PER_STUDENT 20, IELTS_DAILY_PER_ADDRESS 200,
   IELTS_DAILY_OVERALL 3000). Call after `refuseUnlessSignedIn`, which remembers who the student is. */
let allowance = null;
function graderAllowance() {
  const caps = [intFrom(process.env.IELTS_DAILY_PER_STUDENT, 20), intFrom(process.env.IELTS_DAILY_PER_ADDRESS, 200), intFrom(process.env.IELTS_DAILY_OVERALL, 3000)];
  if (!allowance || allowance.caps.join() !== caps.join()) {
    allowance = { caps, take: createDailyAllowance({ perStudent: caps[0], perAddress: caps[1], overall: caps[2] }) };
  }
  return allowance.take;
}

/* Vercel: true when the student is over today's allowance for the grader and already answered, so the handler returns. */
export async function refuseIfOverGraderLimit(req, res) {
  const token = bearerToken(req.headers?.authorization);
  const student = check().studentOf(req.headers?.authorization) ?? (token ? `t:${createHash("sha256").update(token).digest("hex").slice(0, 24)}` : "anonymous");
  const refused = graderAllowance()({ student, address: callerAddress((name) => req.headers?.[name], req.socket?.remoteAddress) });
  if (!refused) return false;
  for (const [name, value] of Object.entries(refused.headers)) res.setHeader(name, value);
  res.status(refused.status).json(refused.body);
  return true;
}
