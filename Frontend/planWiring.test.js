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
  assert.match(send, /await askAllowance\(api, requestId, images\.length\)/, "the photos are counted with the question");
  // the refusal returns before the reply function is called
  assert.ok(send.indexOf("if (!gate.ok)") < send.indexOf("active.reply("), "refusal comes before the AI is asked");
  assert.match(send, /error: true, upgrade: true/);
  assert.match(send, /requestId \};/, "the id travels in the extras");
  assert.equal((app.match(/newAiRequestId\(\)/g) || []).length, 1, "only the coach makes ids");
});

test("the badge is re-asked after every question, so a \"no\" never leaves it showing questions that are already gone", () => {
  // Breaks if: the badge goes back to only updating from askAllowance()'s own check. That check is deliberately lenient on
  // an outage (usage: null, so the badge is left alone) and the AI server's own refusal -- the one that actually enforces
  // the limit -- carries no usage numbers at all, so without this the badge could sit on a stale "N left" right after the
  // student was just told "no" (2026-11-07: shown "2 of 5 left" immediately under a "you have used all of today's
  // questions" reply).
  const send = between(app, "const requestId = newAiRequestId();", "const stop = () =>");
  assert.match(send, /abortRef\.current = null;\s*\/\/[^\n]*\n(?:\s*\/\/[^\n]*\n)*\s*refreshUsage\(\);\s*\}\);/, "the badge is re-asked once the attempt (success or refusal) is over, right where loading is cleared");
  // not only on the gate's own success path -- that path is already covered by `setUsage(gate.usage)` above it
  assert.ok(send.indexOf("refreshUsage();") > send.indexOf(".catch((err) =>"), "covers the failure path too, not just the gate");
});

test("the coach shows where the student stands and offers the plans", () => {
  assert.match(app, /api\.getAiUsage\(\)\.then\(\(u\) => \{ if \(live\) setUsage\(readUsage\(u\)\)/);
  assert.match(app, /<UsageStrip /);
  assert.match(app, /coach: <Coach [^>]*onUpgrade=\{\(\) => go\("super"\)\}/);
  assert.match(app, /\{m\.upgrade && onUpgrade && \(/);
  // no upgrade offered to someone already on the top plan, or to an unlimited (admin) account
  assert.match(app, /usage\.plan !== "premium" && !usage\.unlimited \? onUpgrade : null/);
});

test("an unlimited account sees \"Unlimited\", never a count that is about to look alarming", () => {
  // Breaks if: an admin's real-but-huge daily number (see AiQuota::ADMIN_DAILY_LIMIT) is shown as a count again, which
  // would read as "99995 of 100000 AI questions left today" instead of what unlimited is supposed to mean.
  const strip = between(app, "{usage && (() => {", "})()}");
  assert.match(strip, /text=\{usage\.unlimited \? T\("aiUnlimited"\) : /, "unlimited is checked before the used-up/left wording");
  assert.match(strip, /unlimited=\{usage\.unlimited\}/, "PlanUi's UsageStrip decides how to show it, not a count here");
  assert.match(strip, /exhausted=\{isOut\(usage\) && !usage\.unlimited\}/, "an admin's huge number is never read as 'used up' either");
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

test("the plans page shows the payment QR the backend gives, and falls back to the owner's text", () => {
  const pay = between(app, "const [pay, setPay] = useState(undefined);", "return (");
  assert.match(pay, /api\.getPayment\(\)/);
  assert.match(pay, /\.catch\(\(\) => \{ if \(on\) setPay\(null\)/, "a failing backend means no QR, never an error screen");
  assert.match(app, /<img src=\{pay\.qrUrl\} alt=\{tf\(lang, "planPayQrAlt"\)\}/);
  assert.match(app, /tf\(lang, "planPayScan", \{ price: upgraded\.price \}\)/);
  assert.match(app, /\{PAY_INSTRUCTIONS && <pre/, "the owner's text still shows beside the QR");
  assert.match(app, /pay !== undefined && !pay\?\.qrUrl && !PAY_INSTRUCTIONS/, "'not set up' only when there is neither");
});

test("an admin can replace the payment QR, and go back to the original", () => {
  assert.match(ui, /export function PaymentQrAdmin/);
  assert.match(between(ui, "export function AdminPlans", "\n}\n"), /<PaymentQrAdmin api=\{api\}/);
  assert.match(ui, /api\.uploadPaymentQr\(file\)/);
  assert.match(ui, /api\.resetPaymentQr\(\)/);
  // refused on the phone before anything is sent
  assert.match(ui, /QR_TYPES = \/\^image\\\/\(jpeg\|png\|webp\)\$\//);
  assert.match(ui, /QR_MAX_BYTES = 2 \* 1024 \* 1024/);
  assert.ok(ui.indexOf("adminQrNotImage") < ui.indexOf("api.uploadPaymentQr(file)"), "type check comes before the upload");
  assert.match(ui, /info\?\.isCustom && \(/, "the reset button only exists while an uploaded QR is in use");
});

test("an AI server that has not been updated yet (it refuses request_id) still answers: the website sends the question again without the id", () => {
  // Breaks if: the website goes live before the AI server and every question fails with "Extra inputs are not permitted".
  const rag = between(app, "let aiServerTakesRequestId = true;", "const ragFetch =");
  assert.match(rag, /d\?\.type === "extra_forbidden" && Array\.isArray\(d\.loc\) && d\.loc\.includes\("request_id"\)/, "only that exact refusal");
  assert.match(rag, /res\.status === 422 && !retried && refusesRequestId\(detail\)\) \{ aiServerTakesRequestId = false; return ragRequest\(path, init, true\); \}/, "retried once");
  assert.match(rag, /if \(!aiServerTakesRequestId\) init = withoutRequestId\(init\);/, "and the id is left off afterwards");
});

test("the coach keeps photos and PDFs for paid plans: Free sees an upgrade prompt, never a file picker", () => {
  const coach = between(app, "const addImages = (files) =>", "const removeAttachment");
  // every way in (paste, drop, the menu, the suggestion) goes through the same check
  assert.match(app, /const uploadsBlocked = \(n = 1\) => \{\s*const why = uploadRefusal\(usage, n\);\s*if \(why\) setUploadPrompt\(why\);/);
  assert.match(coach, /uploadsBlocked\(attachments\.length \+ 1\)/);
  assert.match(app, /const pickPhotos = \(\) => \{ if \(!uploadsBlocked\(attachments\.length \+ 1\)\) photoRef\.current\?\.click\(\); \};/);
  assert.match(app, /const pickDocs = \(\) => \{ if \(!uploadsBlocked\(1\)\) docRef\.current\?\.click\(\); \};/);
  const docs = between(app, "const uploadDocs = async (files) =>", "const onKeyDown");
  assert.match(docs, /if \(uploadsBlocked\(files\.length\)\) return;/);
  assert.match(docs, /refreshUsage\(\)/, "a document used one of today's uploads");
  // nothing opens a picker directly any more
  assert.equal((app.match(/photoRef\.current\?\.click\(\)/g) || []).length, 1, "only pickPhotos opens the photo picker");
  assert.equal((app.match(/docRef\.current\?\.click\(\)/g) || []).length, 1, "only pickDocs opens the document picker");
  // the prompt offers the plans, but not to someone already on the top one
  assert.match(app, /uploadPrompt && \([\s\S]*usage\?\.plan !== "premium"[\s\S]*aiUpgrade/);
  // a photo that does not fit is refused by the backend too, and the reply says why
  const send = between(app, "const requestId = newAiRequestId();", "Promise.all([answer(), minDelay])");
  assert.match(send, /gate\.reason === "uploads"/);
  assert.match(send, /coachUploadsPaid/);
  assert.match(send, /coachUploadsUsedUp/);
});

test("an admin can also browse every signed-up student, not just the paid ones, a page at a time", () => {
  const admin = between(ui, "export function AdminPlans", "\n}\n");
  // a second view, next to the existing paid-only one, picked with tabs
  assert.match(admin, /\[view, setView\] = useState\("paid"\)/);
  assert.match(admin, /const browsingAll = view === "all" && !searching;/);
  assert.match(admin, /tr\(id === "all" \? "adminPlansViewAll" : "adminPlansViewPaid"\)/);
  // the browse view asks the backend for everyone, a page at a time, never the paid-only default
  assert.match(admin, /api\.getAdminUsers\(opts\)/);
  assert.match(admin, /browsingAll \? \{ all: true, page \} : \{\}/);
  // a search overrides either tab -- it is never limited to one view
  assert.match(admin, /searching \? \{ q: query \}/);
  // "Load more" appends rather than replacing, and only shows up once the backend says there is more
  assert.match(admin, /setRows\(\(prev\) => \(firstPage \? res\.users : \[\.\.\.prev, \.\.\.res\.users\]\)\)/);
  assert.match(admin, /browsingAll && !loading && !failed && hasMore/);
  assert.match(admin, /setPage\(\(p\) => p \+ 1\)/);
  // switching views (or starting a fresh search) always starts back on page 1, never mid-list
  assert.match(admin, /const switchView = \(next\) => \{ setView\(next\); setPage\(1\); \};/);
  assert.match(admin, /setQ\(e\.target\.value\); setPage\(1\);/);
  // the signup date travels with every row once the backend sends one
  assert.match(admin, /row\.signedUpAt && <p[^>]*>\{trf\("adminPlansSignedUp"/);
});

test("the plans page promises the uploads the plans give", () => {
  assert.match(app, /"10 photo\/PDF uploads\/day"/);
  assert.match(app, /"40 photo\/PDF uploads\/day"/);
  assert.doesNotMatch(app, /Limited photos\/PDF uploads|Advanced photos\/PDF uploads/);
});
