/* Guards on how Formula Mastery (a separate learning system, see FormulaMastery.jsx's header) is wired into
   PracticeSubject and the app's own server-sync machinery -- the sibling of chapterWiring.test.js, split out
   on its own rather than added to that file, since it is its own system with its own screen. App.jsx is read
   as text because the app has no DOM test harness; the staging/remediation rules are tested on their own in
   formulaMasteryFlow.test.js.
   Run with:  node --test Frontend/formulaMasteryWiring.test.js */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CHAPTER_STRINGS } from "./chapterStrings.js";

const read = (name) => readFileSync(new URL(`./${name}`, import.meta.url), "utf8");
const app = read("App.jsx");
const list = read("ChapterList.jsx");
const fm = read("FormulaMastery.jsx");
const flow = read("formulaMasteryFlow.js");
const strip = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const subject = app.slice(app.indexOf("function PracticeSubject("), app.indexOf("function ExercisePlayer("));

test("PracticeSubject imports the Formula Mastery screen and its chapter pool, separately from the ordinary chapter path", () => {
  assert.match(app, /import FormulaMastery from "\.\/FormulaMastery\.jsx";/);
  assert.match(app, /import \{ pool as formulaMasteryPool \} from "\.\/formulaMasteryFlow\.js";/);
});

test("every chapter row carries its own Formula Mastery count and mastered flag, from the chapter's kind-tagged pool and the server's own state -- never from chapterProgress/chapterStates", () => {
  assert.match(subject, /formulaMasteryCount: formulaMasteryPool\(fullList, r\.key\)\.length,/);
  assert.match(subject, /formulaMasteryMastered: Boolean\(formulaMasteryFromServer\(fmSubject, r\.key\)\?\.mastered\),/);
  // It is read from its own prop, not derived from `chapterProgress`/`mastery` (the Master Quiz's own inputs).
  assert.match(subject, /const fmSubject = formulaMastery\?\.\(subject\) \?\? null;/);
});

test("PracticeSubject accepts the Formula Mastery props and forwards them from Practice, which gets them from the top-level App", () => {
  assert.match(app, /function PracticeSubject\(\{[^}]*formulaMastery, onSubmitFormulaMastery, errorText[^}]*\}\)/);
  assert.match(app, /function Practice\(\{[^}]*formulaMastery, onSubmitFormulaMastery, errorText[^}]*\}\)/);
  // Not one `[^>]*`-spanning regex across the whole JSX tag: PracticeSubject's own tag has an arrow function
  // (`onBack={() => setSubject(null)}`) earlier in it, and `[^>]*` cannot cross the `>` inside `=>`.
  assert.ok(app.includes("formulaMastery={formulaMastery} onSubmitFormulaMastery={onSubmitFormulaMastery} errorText={errorText}"));
  assert.ok(app.includes('formulaMastery={formulaMasteryFor} onSubmitFormulaMastery={submitFormulaMasteryQuiz} errorText={(code, retryAfter) => apiErrorText(lang, code, retryAfter)}'));
});

test("Formula Mastery is only ever offered to ChapterList in server mode -- there is nowhere to save its own progress without a server", () => {
  assert.match(subject, /onFormulaMastery=\{SERVER_MODE \? setFormulaMasteryChapter : undefined\}/);
  // Unlike the Master Quiz / Drill / Sheet, which all stay available (in some form) without a server.
  assert.doesNotMatch(flow, /SERVER_MODE/, "the staging engine must stay a pure function of its content, not know about the server mode");
});

test("opening Formula Mastery is plain navigation like the Drill/Sheet pair, checked in the same early position, before the locked/open chapter split", () => {
  assert.match(subject, /const \[formulaMasteryChapter, setFormulaMasteryChapter\] = useState\(null\);/);
  assert.match(subject, /if \(formulaMasteryChapter\) \{\s*return \(\s*<FormulaMastery chapterName=\{chapterLabel\(formulaMasteryChapter\)\} list=\{fullList\} chapterKey=\{formulaMasteryChapter\}/);
  assert.ok(subject.indexOf("if (sheetChapter)") < subject.indexOf("if (formulaMasteryChapter)"), "checked after the pure-review pair");
  assert.ok(subject.indexOf("if (formulaMasteryChapter)") < subject.indexOf("if (hasChapters && chapter == null)"), "checked before the locked/open chapter split");
});

test("a finished mastery check is sent through the same { subject, chapter, ...payload } wrapping onSubmitQuiz already uses for the Master Quiz", () => {
  assert.match(subject, /onSubmit=\{\(payload\) => onSubmitFormulaMastery\(\{ subject, chapter: formulaMasteryChapter, \.\.\.payload \}\)\}/);
  assert.match(subject, /mastery=\{formulaMasteryFromServer\(fmSubject, formulaMasteryChapter\)\}/);
});

test("the chapter list renders the Formula Mastery button beside Drill/Sheet, hidden with no content, and shows a mastered chapter's checkmark", () => {
  assert.match(list, /import \{ FormulaMasteryButton \} from "\.\/FormulaMastery\.jsx";/);
  assert.match(list, /onFormulaMastery && row\.formulaMasteryCount > 0/);
  assert.match(list, /<FormulaMasteryButton count=\{row\.formulaMasteryCount\} mastered=\{row\.formulaMasteryMastered\} lang=\{lang\} onStart=\{\(\) => onFormulaMastery\(row\.key\)\} \/>/);
  // FormulaMasteryButton itself (FormulaMastery.jsx, not ChapterList.jsx) hides on an empty count, like DrillButton/SheetButton.
  assert.match(fm, /export function FormulaMasteryButton\(\{ count, mastered = false[^}]*\}\) \{\s*if \(!count\) return null;/);
});

test("Formula Mastery's own chapter state is fetched after sign-in without ever blocking it, the same way the chapter path's own GET \\/chapters is", () => {
  const load = app.slice(app.indexOf("const loadAccount = async"), app.indexOf("// Restore the saved login when the page opens"));
  assert.doesNotMatch(load, /getFormulaMastery/, "a slow or older server must not stop a student from signing in");
  assert.match(load, /loadChapters\(\);\s*loadFormulaMastery\(\);/);
  assert.match(app, /api\.getFormulaMastery\(\)\.then\(\(res\) => \{ if \(run === formulaMasteryRun\.current\) setServerFormulaMastery\(res\); \}\)\.catch\(\(\) => \{\}\);/);
  assert.match(app, /formulaMasteryRun\.current \+= 1; setServerFormulaMastery\(null\);/, "signing out forgets the previous student's Formula Mastery state too");
  const refresh = app.slice(app.indexOf("const refreshLive = async"), app.indexOf("useEffect(() => {\n    if (!SERVER_MODE) return undefined;"));
  assert.match(refresh, /loadChapters\(\);\s*loadFormulaMastery\(\);/);
});

test("a finished mastery check is graded and saved on its own table, never folded into serverChapters, and has no offline fallback", () => {
  const submit = app.slice(app.indexOf("const submitFormulaMasteryQuiz = async"), app.indexOf("// Are a subject's full past papers locked"));
  assert.match(submit, /if \(!SERVER_MODE\) return \{ ok: false, code: "api_disabled" \};/, "unlike submitChapterQuiz, there is deliberately no browser-only grading path");
  assert.match(submit, /api\.submitFormulaMasteryQuiz\(formulaMasteryQuizPayload\(\{ subject, chapter, attemptId, answers, timeSec \}\)\)/);
  assert.match(submit, /setServerFormulaMastery\(\(cur\) => \(cur \? \{ \.\.\.cur, subjects: \{ \.\.\.cur\.subjects, \[subject\]: res\.subject \} \} : cur\)\);/);
  assert.match(submit, /return \{ ok: true, result: res\.result \};/);
  assert.match(submit, /if \(err\?\.code === "chapter_locked"\) loadFormulaMastery\(\);/);
  assert.match(submit, /return \{ ok: false, code: err\?\.code, retryAfter: err\?\.retryAfter \};/);
});

test("every word Formula Mastery's screen uses (including the stage-label lookup table) is defined in English and Khmer, with only known placeholders", () => {
  const en = Object.keys(CHAPTER_STRINGS.en), km = Object.keys(CHAPTER_STRINGS.km);
  const used = new Set();
  for (const m of fm.matchAll(/\bw\(\s*"(\w+)"/g)) used.add(m[1]);
  for (const m of fm.matchAll(/w\(\s*[\w.?>]+\s*\?\s*"(\w+)"\s*:\s*"(\w+)"/g)) { used.add(m[1]); used.add(m[2]); }
  // STAGE_LABEL's own values aren't literal `w("...")` calls (looked up as w(STAGE_LABEL[stage])) -- pull them
  // out of the object literal itself, the same way chapterWiring.test.js pulls LOOK's `label:` values out of
  // ChapterList.jsx's own lookup table.
  for (const m of fm.matchAll(/\b\w+: "(fmStage\w+)"/g)) used.add(m[1]);
  assert.ok(used.size >= 15, `found the keys the screen uses (${used.size})`);
  for (const key of used) assert.ok(en.includes(key), `"${key}" is used by FormulaMastery.jsx but not defined`);
  for (const key of used) assert.ok(km.includes(key), `"${key}" has no Khmer translation`);
});

test("Formula Mastery's screen draws its chapter pool and staging from formulaMasteryFlow.js, never re-filtering the exercise list itself", () => {
  // Guards against the kind of drift the regression fix-up (the frontend leak sweep earlier in this feature)
  // was written to catch: there must be exactly one place that decides "is this exercise Formula Mastery
  // content", and FormulaMastery.jsx must defer to it rather than growing its own `ex.kind` check.
  assert.match(fm, /import \{\s*pool, byKind, pickMasteryCheck, nextStage, readyForMasteryCheck,\s*nextInKind, firstOpenInKind, introFor, remediationFor, remediationKinds,\s*\} from "\.\/formulaMasteryFlow\.js";/);
  assert.doesNotMatch(strip(fm), /ex\.kind|\.kind ==|\.kind !=/, "FormulaMastery.jsx must not filter by `kind` itself -- that is formulaMasteryFlow.js's `pool`'s job alone");
  assert.match(fm, /const questions = pool\(list, chapterKey\);/);
  assert.match(fm, /const groups = byKind\(questions\);/);
});

test("the mastery check draws from the whole chapter pool (every kind), the same pool `formulaIds` validates answers against on the server, never from one kind's own practice stage", () => {
  assert.match(fm, /pickMasteryCheck\(list, chapterKey, Date\.now\(\)\)/, "drawn from `list` (the whole subject), not from one kind's `items`");
});

test("a wrong answer in a practice stage is met with remediation for that SPECIFIC kind of mistake, not a generic explanation, and never touches the ordinary practice record", () => {
  const kindStage = fm.slice(fm.indexOf('if (isKindStage(stage)) {'), fm.indexOf('/* ── The mastery check ── */'));
  assert.match(kindStage, /remediationFor\(ex, introFor\(ex, chapterIntros\)\)/);
  assert.doesNotMatch(kindStage, /onAnswer|practice\[/, "the four practice stages must stay pure review, like FormulaDrill's own quiz");
});
