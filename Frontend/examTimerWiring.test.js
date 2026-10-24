/* Guards on how the timed-attempt screens are wired into App.jsx. App.jsx is read as text because the app has no DOM
   test harness; the behaviour itself is covered in examSessions.test.js and was run end to end in a browser.
   Run with:  node --test Frontend/examTimerWiring.test.js */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
const ui = readFileSync(new URL("./ExamSessionUi.jsx", import.meta.url), "utf8");

test("every piece of screen text the timed-attempt screens use exists once in English and once in Khmer", () => {
  const fromUi = [...ui.matchAll(/"((?:exam|school|report|notNow|minutesWord)[A-Za-z_]*)"/g)].map((m) => m[1]);
  // keys built from a code, e.g. tr(`examErr_${code}`) and tr(`reportStatus_${status}`)
  const built = ["generic", "not_image", "invalid_photo", "too_big", "too_many_photos", "no_photos", "not_running"].map((c) => `examErr_${c}`)
    .concat(["submitted", "expired"].map((c) => `reportStatus_${c}`));
  const inBrowse = [...app.slice(app.indexOf("function Browse("), app.indexOf("const TOPIC_LABEL_KM")).matchAll(/tr\("([A-Za-z_]+)"\)/g)].map((m) => m[1]);
  const keys = [...new Set([...fromUi, ...built, ...inBrowse])].filter((k) => k !== "examErr_");
  assert.ok(keys.length >= 50, `only found ${keys.length} keys; the extractor is probably broken`);
  for (const key of keys) {
    const hits = app.match(new RegExp(`[\\s,{]${key}:`, "g")) || [];
    assert.equal(hits.length, 2, `${key} should be defined once in English and once in Khmer, found ${hits.length}`);
  }
});

test("each exam paper card can start a timed attempt, and the paper page shows the clock only for the running one", () => {
  const browse = app.slice(app.indexOf("function Browse("), app.indexOf("const TOPIC_LABEL_KM"));
  assert.match(browse, /onClick=\{\(\) => startAttempt\(sub\.s, year\)\}/);
  assert.match(browse, /exam\.start\(\{ subject, field: p\.field, year: y, student: \{ name: p\.name, grade: p\.grade \} \}\)/);
  assert.match(browse, /running\.subject === viewingPaper\.subject && running\.year === viewingPaper\.year/);
  assert.match(browse, /<ExamTimerBar session=\{mine\}/);
});

test("finishing goes through the photo sheet, and submitting shows the result", () => {
  const browse = app.slice(app.indexOf("function Browse("), app.indexOf("const TOPIC_LABEL_KM"));
  assert.match(browse, /onFinish=\{\(\) => setPhase\("submit"\)\}/);
  assert.match(browse, /const res = exam\.submit\(running\.id\); if \(res\.ok\) \{ setFinished\(res\.session\); setPhase\("result"\); \}/);
  assert.match(browse, /<ExamResultCard session=\{finished\}/);
});

test("the app owns one exam store per student, shows the running chip, and offers the school report page", () => {
  assert.match(app, /const exam = useExamSessions\(\{\s*userKey: profile \? `\$\{profile\.phone \?\? ""\}\|\$\{profile\.name\}` : "anon",/);
  assert.match(app, /limitFor: \(field, subject\) => SUBJECT_DURATION_MIN\[field\]\?\.\[subject\] \?\? 180/);
  assert.match(app, /<RunningChip session=\{exam\.current\}/);
  assert.match(app, /schoolReport: <SchoolReportPage report=\{exam\.report\(\)\}/);
  assert.match(app, /isUniProfile \? UNI_NAV : showSchoolReport \? \[\.\.\.NAV, SCHOOL_NAV\] : NAV/);
});

test("the photo screen takes camera or gallery pictures and shrinks them before they are kept", () => {
  assert.match(ui, /accept="image\/\*" capture="environment"/);
  assert.match(ui, /await shrinkImage\(file\)/);
  assert.match(ui, /MAX_PHOTOS/);
});
