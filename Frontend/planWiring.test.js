/* Plans and the daily limit on AI questions are wired into the screens (App.jsx, PlanUi.jsx): every AI question is counted
   before it is asked and sent with its id, a refused one offers the plans, the plans page knows the student's plan, and an admin
   can switch a plan on. The rules themselves are in aiQuota.test.js.
   Run with:  node --test Frontend/planWiring.test.js */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { MORE_STRINGS } from "./moreStrings.js";

const read = (f) => readFileSync(new URL(`./${f}`, import.meta.url), "utf8");
const app = read("App.jsx");
const ui = read("PlanUi.jsx");
const between = (text, from, to) => { const a = text.indexOf(from); const b = text.indexOf(to, a + from.length); assert.ok(a >= 0 && b > a, `${from} .. ${to}`); return text.slice(a, b); };

test("PlanUi.jsx is presentation only: nothing is imported back from App.jsx", () => {
  assert.doesNotMatch(ui, /from\s+["']\.\/App/);
});

test("every AI reply function takes the question's id and puts it in what it sends", () => {
  assert.match(between(app, "async function ragStudyReply(", "try {"), /requestId \} = \{\}\) \{[\s\S]*request_id: requestId/);
  // the continuation round is the same question
  assert.match(between(app, "const next = (text) => {\n    // The question rides along", "try {"), /request_id: requestId/);
  assert.match(between(app, "async function examPaperReply(", "const next ="), /requestId \} = \{\}\) \{[\s\S]*request_id: requestId/);
  assert.match(between(app, "async function majorGuidanceReply(", "} catch {"), /\{ requestId \} = \{\}\) \{[\s\S]*request_id: requestId/);
  assert.match(between(app, "async function universityMentorReply(", "} catch {"), /\{ requestId \} = \{\}\) \{[\s\S]*request_id: requestId/);
});

test("the coach counts a question before asking it, once per question, and a refusal never reaches the AI", () => {
  const send = between(app, "const requestId = newAiRequestId();", "Promise.all([answer(), minDelay])");
  assert.match(send, /await askAllowance\(api, requestId\)/);
  // the refusal returns before the reply function is called
  assert.ok(send.indexOf("if (!gate.ok)") < send.indexOf("active.reply("), "refusal comes before the AI is asked");
  assert.match(send, /error: true, upgrade: true/);
  assert.match(send, /requestId \};/, "the id travels in the extras");
  assert.equal((app.match(/newAiRequestId\(\)/g) || []).length, 1, "only the coach makes ids");
});

test("the coach shows where the student stands and offers the plans", () => {
  assert.match(app, /api\.getAiUsage\(\)\.then\(\(u\) => \{ if \(live\) setUsage\(readUsage\(u\)\)/);
  assert.match(app, /<UsageStrip /);
  assert.match(app, /coach: <Coach [^>]*onUpgrade=\{\(\) => go\("super"\)\}/);
  assert.match(app, /\{m\.upgrade && onUpgrade && \(/);
  // no upgrade offered to someone already on the top plan
  assert.match(app, /usage\.plan !== "premium" \? onUpgrade : null/);
});

test("the plans page marks the student's plan, offers only a better one, and says how to pay", () => {
  const page = between(app, "function SuperBondus(", "/* ════════════════════════ Shell");
  assert.match(page, /const current = live\?\.plan \?\? p\?\.plan \?\? "free";/);
  assert.match(page, /canUpgradeTo\(current, plan\.id\)/);
  assert.match(page, /plan\.id === current/);
  assert.match(page, /PAY_INSTRUCTIONS/);
  assert.match(page, /planPayNotSet/);
  // the prototype wording is gone from this page
  assert.doesNotMatch(page, /prototypeNoPayment|prototypePaymentsNote|thanksUpgrade/);
  assert.match(app, /const PAY_INSTRUCTIONS = String\(import\.meta\.env\.VITE_PAY_INSTRUCTIONS/);
});

test("the admin Plans page is in the admin menu after Admin, and only an admin gets it", () => {
  assert.match(app, /const ADMIN_NAV = \[\s*\{ id: "adminExercises"[^\n]*\n\s*\{ id: "adminPlans"/);
  assert.match(app, /adminPlans: isAdmin\(profile\) \? <AdminPlans api=\{api\}/);
});

test("every string the plan screens use exists in English and Khmer", () => {
  const used = new Set([
    ...[...ui.matchAll(/\btrf?\("(\w+)"/g)].map((m) => m[1]),
    ...[...app.matchAll(/\b(?:T|tf)\((?:lang, )?"((?:ai|plan|coachLimit|adminPlans)\w*)"/g)].map((m) => m[1]),
  ]);
  assert.ok(used.size >= 20, `found only ${used.size} keys`);
  for (const key of used) {
    assert.ok(MORE_STRINGS.en[key], `en.${key}`);
    assert.ok(MORE_STRINGS.km[key], `km.${key}`);
  }
});
