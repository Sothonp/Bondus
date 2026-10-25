/* The AI coach must fall back to its built-in answers when the AI server is missing, including on a host that answers
   "404 not found" for it (Vercel does when no AI server address is set). App.jsx is read as text.
   Run with:  node --test Frontend/coachFallback.test.js */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
const ragRequest = app.slice(app.indexOf("async function ragRequest("), app.indexOf("class RagError") > app.indexOf("async function ragRequest(") ? app.indexOf("class RagError") : app.indexOf("async function ragRequest(") + 1800);

test("a 5xx from the AI server counts as unreachable (the built-in coach answers)", () => {
  assert.match(ragRequest, /res\.status >= 500/);
});

test("with no AI server address configured, a 404 also counts as 'not configured', so students never see 'Request failed (404)'", () => {
  assert.match(ragRequest, /!RAG_API && res\.status === 404/);
  assert.match(ragRequest, /throw new RagError\(RAG_API \? UNREACHABLE : UNCONFIGURED, 0\)/);
});

test("with an address configured, a 404 is a real error and is still shown", () => {
  // the 404 rule must be tied to the missing address, never a blanket 404 -> unreachable
  assert.doesNotMatch(ragRequest, /res\.status === 404\) throw/);
  assert.match(ragRequest, /throw new RagError\(message, res\.status\)/);
});
