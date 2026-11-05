/* Made-up tokens at the AI functions (api/_auth.js): turned away without a question to Laravel, and a caller who keeps
   trying is cut off. Laravel limits by token and every fake token is new, so the limit has to be here.
   Run with:  node --test Frontend/aiFakeTokens.test.js */
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { createSignedInCheck, looksLikeToken, refuseUnlessSignedIn, refuseUnlessSignedInNetlify } from "../api/_auth.js";
import { crc32 } from "node:zlib";

const ME = "https://api.example.test/api/v1/me";
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const ENTROPY = "aB3dE5gH7jK9mN1pQ3sT5vW7yZ9bC1dE3fG5hJ7k"; // 40 characters, like Sanctum's
const hex = (text) => (crc32(Buffer.from(text)) >>> 0).toString(16).padStart(8, "0");
const sanctum = (id = 12, entropy = ENTROPY) => `${id}|${entropy}${hex(entropy)}`;

function laravel(known = [], { down = false } = {}) {
  const calls = [];
  const fetchImpl = async (_url, init = {}) => {
    const token = init.headers?.Authorization?.replace(/^Bearer /, "");
    calls.push(token);
    if (down) return json(500, {});
    return known.includes(token) ? json(200, { user: { id: 7 } }) : json(401, { message: "Unauthenticated." });
  };
  return { calls, fetchImpl };
}
function clock() {
  const c = { at: 1_000_000, now: () => c.at };
  return c;
}
const guard = (l, opts = {}) => createSignedInCheck({ url: ME, fetchImpl: l.fetchImpl, ...opts });
const fake = (n) => sanctum(n, `Fake${String(n).padStart(36, "0")}`);

/* --- the shape of a token ----------------------------------------------------------------------------------- */

test("a token made the way Sanctum makes them passes the shape check", () => {
  // Breaks if: the check is stricter than Laravel's own tokens -- every student is locked out of the AI features.
  assert.equal(looksLikeToken(sanctum()), true);
  assert.equal(looksLikeToken(sanctum(123456789)), true);
  assert.equal(looksLikeToken(`5|${ENTROPY}`), true); // from before Sanctum added the checksum
});

test("this crc32 agrees with Node's own, so it agrees with PHP's hash('crc32b')", () => {
  // Breaks if: the table-driven crc32 is wrong -- real tokens fail the checksum.
  const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let seed = 12345;
  for (let i = 0; i < 200; i++) {
    let entropy = "";
    for (let k = 0; k < 40; k++) {
      seed = (seed * 1103515245 + 12345) % 2 ** 31;
      entropy += alphabet[seed % alphabet.length];
    }
    assert.equal(looksLikeToken(`${i + 1}|${entropy}${hex(entropy)}`), true, entropy);
  }
});

test("anything else is turned away", () => {
  // Breaks if: junk is let through to cost Laravel a question.
  for (const token of [
    "", "bogus", "good-token", `|${ENTROPY}`, `x|${ENTROPY}`, `12|${ENTROPY.slice(0, 30)}`, `12|${ENTROPY}1234567`,
    `12|${ENTROPY}00000000`, `12|${ENTROPY}${"a".repeat(300)}`, `12|${ENTROPY.slice(0, -1)} `, undefined, null, 12,
  ]) assert.equal(looksLikeToken(token), false, String(token));
});

test("a badly shaped token is refused without asking Laravel when the shape is checked", async () => {
  // Breaks if: the shape check is computed but the question is sent anyway.
  const l = laravel();
  const refused = await guard(l, { requireTokenShape: true })("Bearer bogus", "1.1.1.1");
  assert.equal(refused.status, 401);
  assert.deepEqual(l.calls, []);
});

test("a well shaped token is asked about, and let in when Laravel knows it", async () => {
  // Breaks if: the shape check turns real tokens away.
  const token = sanctum();
  const l = laravel([token]);
  assert.equal(await guard(l, { requireTokenShape: true })(`Bearer ${token}`, "1.1.1.1"), null);
  assert.deepEqual(l.calls, [token]);
});

/* --- the allowance ------------------------------------------------------------------------------------------ */

test("a flood of made-up tokens stops reaching Laravel", async () => {
  // Breaks if: every new fake token costs Laravel a question.
  const l = laravel();
  const check = guard(l, { rejectedPerAddress: 3 });
  const statuses = [];
  let last;
  for (let n = 0; n < 8; n++) {
    last = await check(`Bearer ${fake(n)}`, "9.9.9.9");
    statuses.push(last.status);
  }
  assert.deepEqual(statuses, [401, 401, 401, 429, 429, 429, 429, 429]);
  assert.equal(l.calls.length, 3);
  assert.ok(Number(last.headers["Retry-After"]) >= 1);
});

test("a burst of parallel fake tokens is counted too", async () => {
  // Breaks if: the count is taken after the answer, so a hundred at once all get through.
  const l = laravel();
  const check = guard(l, { rejectedPerAddress: 3 });
  const results = await Promise.all(Array.from({ length: 20 }, (_, n) => check(`Bearer ${fake(n)}`, "9.9.9.9")));
  assert.equal(l.calls.length, 3);
  assert.equal(results.filter((r) => r.status === 429).length, 17);
});

test("a student already checked still gets in while fake tokens are being turned away", async () => {
  // Breaks if: the flood limit locks out real students behind the same address (a school, a phone network).
  const token = sanctum();
  const l = laravel([token]);
  const check = guard(l, { rejectedPerAddress: 3 });
  assert.equal(await check(`Bearer ${token}`, "9.9.9.9"), null);
  for (let n = 0; n < 5; n++) await check(`Bearer ${fake(n)}`, "9.9.9.9");
  assert.equal(await check(`Bearer ${token}`, "9.9.9.9"), null);
  assert.equal(l.calls.length, 4);
});

test("tokens Laravel accepts do not use up the allowance", async () => {
  // Breaks if: a class of students behind one address runs out of lookups by signing in.
  const tokens = Array.from({ length: 6 }, (_, n) => fake(n));
  const check = guard(laravel(tokens), { rejectedPerAddress: 2 });
  for (const t of tokens) assert.equal(await check(`Bearer ${t}`, "9.9.9.9"), null);
});

test("when Laravel is down the allowance is not used up", async () => {
  // Breaks if: our outage makes honest students look like attackers once it is over.
  const check = guard(laravel([], { down: true }), { rejectedPerAddress: 2 });
  for (let n = 0; n < 5; n++) assert.equal((await check(`Bearer ${fake(n)}`, "9.9.9.9")).status, 503);
});

test("one address flooding does not stop another", async () => {
  // Breaks if: the per-address limit is really one limit for everybody.
  const token = sanctum();
  const check = guard(laravel([token]), { rejectedPerAddress: 2 });
  for (let n = 0; n < 4; n++) await check(`Bearer ${fake(n)}`, "9.9.9.9");
  assert.equal(await check(`Bearer ${token}`, "8.8.8.8"), null);
});

test("a flood spread over many addresses is capped in all", async () => {
  // Breaks if: using many addresses gets round the per-address limit.
  const l = laravel();
  const check = guard(l, { rejectedPerAddress: 5, rejectedOverall: 4 });
  const statuses = [];
  for (let n = 0; n < 7; n++) statuses.push((await check(`Bearer ${fake(n)}`, `10.0.0.${n}`)).status);
  assert.deepEqual(statuses, [401, 401, 401, 401, 429, 429, 429]);
  assert.equal(l.calls.length, 4);
});

test("the allowance comes back as time passes, and being refused does not extend it", async () => {
  // Breaks if: a refused caller stays refused for good.
  const c = clock();
  const l = laravel();
  const check = guard(l, { rejectedPerAddress: 1, now: c.now });
  assert.equal((await check(`Bearer ${fake(1)}`, "9.9.9.9")).status, 401);
  for (let n = 2; n < 6; n++) assert.equal((await check(`Bearer ${fake(n)}`, "9.9.9.9")).status, 429);
  c.at += 60_000;
  assert.equal((await check(`Bearer ${fake(9)}`, "9.9.9.9")).status, 401);
});

test("a fake token Laravel has already turned down is answered from memory, not counted again", async () => {
  // Breaks if: retrying the same token burns the allowance and a Laravel question each time.
  const l = laravel();
  const check = guard(l, { rejectedPerAddress: 2 });
  for (let n = 0; n < 5; n++) assert.equal((await check(`Bearer ${fake(1)}`, "9.9.9.9")).status, 401);
  assert.equal(l.calls.length, 1);
});

/* --- the real entry points: which address is counted ---------------------------------------------------------- */

const realFetch = globalThis.fetch;
const realUrl = process.env.AUTH_VERIFY_URL;
const realShape = process.env.AUTH_CHECK_TOKEN_SHAPE;
afterEach(() => {
  globalThis.fetch = realFetch;
  for (const [name, value] of [["AUTH_VERIFY_URL", realUrl], ["AUTH_CHECK_TOKEN_SHAPE", realShape]]) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});
function host(url) {
  process.env.AUTH_VERIFY_URL = url; // a new address each time starts the guard afresh
  const asked = [];
  globalThis.fetch = async (_url, init) => {
    asked.push(init.headers.Authorization);
    return json(401, {});
  };
  return asked;
}
const vercelAnswer = () => ({ headers: {}, setHeader(n, v) { this.headers[n] = v; }, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });

test("Vercel: fake tokens are counted per caller address, as Vercel reports it", async () => {
  // Breaks if: the address is not passed on, so every caller shares one allowance (or none is kept).
  const asked = host("https://flood-vercel.example.test/me");
  let blocked = 0;
  for (let n = 0; n < 30; n++) {
    const res = vercelAnswer();
    await refuseUnlessSignedIn({ headers: { authorization: `Bearer ${fake(n)}`, "x-vercel-forwarded-for": "9.9.9.9" } }, res);
    if (res.code === 429) blocked++;
  }
  assert.equal(asked.length, 20);
  assert.equal(blocked, 10);
  const other = vercelAnswer();
  await refuseUnlessSignedIn({ headers: { authorization: `Bearer ${fake(99)}`, "x-vercel-forwarded-for": "8.8.8.8" } }, other);
  assert.equal(other.code, 401); // asked about, not blocked
});

test("Netlify: fake tokens are counted per caller address, as Netlify reports it", async () => {
  const asked = host("https://flood-netlify.example.test/me");
  let blocked = 0;
  for (let n = 0; n < 30; n++) {
    const req = new Request("https://bondus.example/fn", { headers: { authorization: `Bearer ${fake(n)}`, "x-nf-client-connection-ip": "9.9.9.9" } });
    if ((await refuseUnlessSignedInNetlify(req))?.status === 429) blocked++;
  }
  assert.equal(asked.length, 20);
  assert.equal(blocked, 10);
});

test("with the real entry points, junk that is not shaped like a token never reaches Laravel", async () => {
  // Breaks if: the production wiring leaves the shape check off.
  const asked = host("https://shape.example.test/me");
  const res = vercelAnswer();
  await refuseUnlessSignedIn({ headers: { authorization: "Bearer bogus" } }, res);
  assert.equal(res.code, 401);
  assert.deepEqual(asked, []);
});

test("AUTH_CHECK_TOKEN_SHAPE=off turns the shape check off, for a Laravel that does not use Sanctum's token shape", async () => {
  const asked = host("https://shape-off.example.test/me");
  process.env.AUTH_CHECK_TOKEN_SHAPE = "off";
  await refuseUnlessSignedIn({ headers: { authorization: "Bearer bogus" } }, vercelAnswer());
  assert.deepEqual(asked, ["Bearer bogus"]);
});
