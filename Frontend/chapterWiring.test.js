/* Guards on how the chapter path is wired into Practice. App.jsx is read as text because the app has no DOM test harness;
   the rules are tested in chapterProgress.test.js, and the list was rendered to markup in English and Khmer by hand.
   Run with:  node --test Frontend/chapterWiring.test.js */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CHAPTER_STRINGS } from "./chapterStrings.js";

const read = (name) => readFileSync(new URL(`./${name}`, import.meta.url), "utf8");
const app = read("App.jsx");
const list = read("ChapterList.jsx");
const rules = read("chapterProgress.js");
const quizUi = read("ChapterQuiz.jsx");
const lockUi = read("PapersLock.jsx");
const drillUi = read("FormulaDrill.jsx");
const sheetUi = read("FormulaSheet.jsx");
const strip = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const subject = app.slice(app.indexOf("function PracticeSubject("), app.indexOf("function ExercisePlayer("));
const browse = app.slice(app.indexOf("function Browse("), app.indexOf("function Exercises("));

test("Practice shows the chapter path and decides the open chapter from the practice record and the quiz results", () => {
  assert.match(app, /import ChapterList from "\.\/ChapterList\.jsx";/);
  assert.match(app, /import ChapterQuiz, \{ QuizCard \} from "\.\/ChapterQuiz\.jsx";/);
  assert.match(app, /import \{ chapterStates, [^}]*\} from "\.\/chapterProgress\.js";/);
  assert.match(subject, /const progress = hasChapters \? \(chapterProgress\?\.\(subject\) \?\? null\) : null;/);
  assert.match(subject, /chapterStates\(fullList, practice, progress\)/);
  assert.match(subject, /<ChapterList rows=\{chapterRows\} labelOf=\{chapterLabel\} lang=\{lang\} localize=\{localizeNum\} onOpen=\{setChapter\} onDrill=\{setDrillChapter\} onFormulaSheet=\{setSheetChapter\} \/>/);
});

test("the chapter list also offers a read-only formula sheet per chapter, with the same no-progress-touched guarantee as the drill", () => {
  // Breaks if: the sheet starts tracking progress, or stops being offered on a locked chapter — it must stay exactly as
  // safe to open as the Formula drill it sits beside.
  assert.match(app, /import FormulaSheet from "\.\/FormulaSheet\.jsx";/);
  assert.match(app, /import \{ chapterFormulas \} from "\.\/formulaSheet\.js";/);
  assert.match(subject, /formulaCount: chapterFormulas\(fullList, r\.key\)\.length,/);
  assert.match(subject, /const \[sheetChapter, setSheetChapter\] = useState\(null\);/);
  assert.match(subject, /if \(sheetChapter\) \{\s*return \(\s*<FormulaSheet chapterName=\{chapterLabel\(sheetChapter\)\} list=\{fullList\} chapterKey=\{sheetChapter\}\s*lang=\{lang\} onExit=\{\(\) => setSheetChapter\(null\)\} \/>/);
  // offered even on a locked chapter, exactly like onDrill, and checked before the locked/open split
  assert.ok(subject.indexOf("if (sheetChapter)") < subject.indexOf("if (hasChapters && chapter == null)"));
  assert.match(list, /import \{ SheetButton \} from "\.\/FormulaSheet\.jsx";/);
  assert.match(list, /onFormulaSheet && row\.formulaCount > 0 && <SheetButton count=\{row\.formulaCount\} lang=\{lang\} onStart=\{\(\) => onFormulaSheet\(row\.key\)\} \/>/);
});

test("the chapter order rule lives in one place, not copied into the screen", () => {
  assert.doesNotMatch(subject, /chapterRank|chapterKeys/);
  assert.match(rules, /export function chapterKeys\(list\)/);
});

test("a locked chapter is never opened, even when it was remembered or tapped", () => {
  assert.match(subject, /const chapter = pickedChapter != null && chapterRows\.some\(\(r\) => r\.key === pickedChapter && r\.state !== "locked"\) \? pickedChapter : null;/);
});

test("subjects without chapters keep their flat list", () => {
  assert.match(subject, /const hasChapters = fullList\.some\(\(ex\) => ex\.chapter\);/);
  assert.match(subject, /: fullList;/);
});

test("the pass and master scores come from one config, used by the rules, the list and the grade estimate", () => {
  assert.match(rules, /from "\.\/progressionConfig\.js"/);
  assert.match(list, /from "\.\/progressionConfig\.js"/);
  assert.match(app, /if \(avg >= MASTER_PERCENT\) return "A";/);
  for (const [name, src] of [["chapterProgress.js", rules], ["ChapterList.jsx", list]]) {
    assert.doesNotMatch(strip(src), /(?<![\d.])(70|85)(?![\d.])/, `${name} must not hard-code the pass or master score`);
  }
});

test("a lock is grey, never the ember red, and the state is always said in words", () => {
  assert.doesNotMatch(strip(list), /--ember/);
  assert.match(list, /locked: \{ icon: Lock, color: "var\(--muted\)"/);
  for (const state of ["locked", "available", "inProgress", "passed", "mastered"]) assert.match(list, new RegExp(`${state}: \\{ icon:`));
  assert.match(list, /\{w\(look\.label\)\}/);
});

test("a locked chapter opens a labelled dialog that can be closed with Escape, and never a dead tap", () => {
  assert.match(list, /role="dialog"/);
  assert.match(list, /aria-modal="true"/);
  assert.match(list, /aria-labelledby="chapter-sheet-title"/);
  assert.match(list, /e\.key === "Escape"/);
  assert.match(list, /if \(row\.state !== "locked"\) \{ onOpen\(row\.key\); return; \}/);
});

test("the sheet sends the student to an open chapter, never to another locked one", () => {
  assert.match(list, /while \(j > 0 && rows\[j\]\.state === "locked"\) j--;/);
  assert.match(list, /onOpen\(target\.key\)/);
});

test("every word the list asks for exists in English and Khmer", () => {
  const en = Object.keys(CHAPTER_STRINGS.en), km = Object.keys(CHAPTER_STRINGS.km);
  assert.deepEqual([...km].sort(), [...en].sort());
  const used = new Set();
  for (const src of [list, quizUi, lockUi, drillUi, sheetUi]) for (const m of src.matchAll(/\bw\(\s*"(\w+)"/g)) used.add(m[1]);
  for (const m of quizUi.matchAll(/\bw\(\s*\w+\s*\?\s*"(\w+)"\s*:\s*"(\w+)"/g)) { used.add(m[1]); used.add(m[2]); } // w(last ? "quizFinish" : "quizNext")
  for (const m of quizUi.matchAll(/w\(\s*\w+\s*\?\s*"(\w+)"\s*:\s*\w+\s*\?\s*"(\w+)"\s*:\s*"(\w+)"/g)) { used.add(m[1]); used.add(m[2]); used.add(m[3]); } // mastered ? .. : passed ? .. : ..
  for (const label of list.matchAll(/label: "(\w+)"/g)) used.add(label[1]); // the state names, looked up through LOOK
  assert.ok(used.size >= 40, `found the keys the screens use (${used.size})`);
  for (const key of used) assert.ok(en.includes(key), `"${key}" is used by the list but not defined`);
  for (const lang of ["en", "km"]) for (const [k, v] of Object.entries(CHAPTER_STRINGS[lang])) {
    assert.ok(String(v).trim(), `${lang}.${k} is empty`);
    for (const [, name] of String(v).matchAll(/\{(\w+)\}/g)) assert.ok(["name", "pass", "master", "n", "solved", "total", "best", "need", "size", "correct", "passed"].includes(name), `unknown placeholder {${name}}`);
  }
});

test("the list keeps a gap under the note, and the rail icons line up with the card titles", () => {
  // A `margin: 0` in the same style would cancel the gap (it did once, and the first card touched the note).
  assert.match(list, /<ol style=\{\{ listStyle: "none", padding: 0, margin: "20px 0 0" \}\}>/);
  assert.doesNotMatch(list, /<ol [^>]*className="[^"]*\bmt-/);
  // 11px on a phone, 19px from 640px: card padding + 1px border + half the 24px title line, minus half the 36px icon.
  assert.match(list, /className="h-\[11px\] sm:h-\[19px\] flex-shrink-0"/);
  assert.match(list, /background: i === 0 \? "transparent" : "var\(--line\)"/);
});

test("every word the quiz, its card and the paper lock use is defined, and none of the old pass-by-practice wording is left", () => {
  const en = Object.keys(CHAPTER_STRINGS.en);
  const quoted = new Set();
  for (const src of [list, quizUi, lockUi]) for (const m of strip(src).matchAll(/"((?:state|path|row|sheet|quiz|result|papers)[A-Z]\w*)"/g)) quoted.add(m[1]);
  assert.ok(quoted.size >= 40, "found the string keys named in the screens");
  const stateNames = new Set(["quizReady"]); // a chapter state the screens compare against, not a word
  for (const key of quoted) assert.ok(stateNames.has(key) || en.includes(key), `"${key}" is named in a screen but not defined`);
  for (const old of ["rowToPass", "rowLockedMore", "sheetBody"]) assert.ok(!en.includes(old), `${old} described passing by practice and must be gone`);
});

test("a quiz is only offered where it can be taken: ready, already passed (a retake), or tested out of, and only when the results are known", () => {
  assert.match(subject, /const quizAvailable = progress != null;/);
  assert.match(subject, /if \(!row \|\| !quizAvailable\) return;/);
  assert.match(subject, /row\.state === "quizReady" \|\| row\.state === "passed" \|\| row\.state === "mastered" \|\| row\.canTestOut/);
  assert.match(subject, /canTestOut: quizAvailable && \(r\.state === "available" \|\| r\.state === "inProgress"\) && testOutEligible\(fullList, r\.key, mastery\?\.\[subject\]\)/);
  assert.match(subject, /<QuizCard row=\{chapterRow\} available=\{quizAvailable\}/);
});

test("every quiz question is also recorded as practice, and the quiz is marked in either language", () => {
  assert.match(subject, /grade=\{gradeAnswerAny\} onAnswer=\{onAnswer\} onSubmit=\{\(payload\) => onSubmitQuiz\(\{ subject, chapter: quiz\.chapter, \.\.\.payload \}\)\}/);
  assert.match(app, /const gradeAnswerAny = \(ex, val\) => \["en", "km"\]\.some\(/);
  assert.match(strip(quizUi), /if \(chosen != null\) onAnswer\?\.\(ex, grade\(ex, chosen\) \? "correct" : "incorrect"/);
});

test("the questions of a quiz are fixed when it starts, so a language switch cannot change them", () => {
  assert.match(subject, /ids: pickQuizQuestions\(fullList, key, `\$\{seedKey\}\|\$\{Date\.now\(\)\}`\)\.map\(\(q\) => q\.id\)/);
  assert.match(subject, /questions=\{quiz\.ids\.map\(\(id\) => getExercise\(id, lang\)\)\.filter\(Boolean\)\}/);
});

test("the quiz sends its answers to be graded, never a verdict, and a failed save is retried as the same attempt", () => {
  const submit = app.slice(app.indexOf("const submitChapterQuiz = async"), app.indexOf("// Are a subject's full past papers locked"));
  assert.match(submit, /api\.submitChapterQuiz\(chapterQuizPayload\(\{ subject, chapter, attemptId, answers, timeSec \}\)\)/);
  assert.match(submit, /return \{ ok: true, result: res\.result \};/);
  assert.match(submit, /if \(err\?\.code === "chapter_locked"\) loadChapters\(\);/);
  assert.match(submit, /return \{ ok: false, code: err\?\.code, retryAfter: err\?\.retryAfter \};/);
  assert.match(submit, /quizVerdict\(correct, answers\.length, wasPassed\)/, "without a server the quiz is graded here");
  assert.match(strip(quizUi), /onClick=\{\(\) => save\(answers\)\}/);
  assert.match(strip(quizUi), /if \(saving\.current\) return;/);
  assert.match(strip(quizUi), /if \(advancing\.current \|\| phase !== "answering"\) return;/);
});

test("the server's chapters are fetched after sign-in without ever blocking it", () => {
  const load = app.slice(app.indexOf("const loadAccount = async"), app.indexOf("// Restore the saved login when the page opens"));
  assert.doesNotMatch(load, /getChapters/, "a slow or older server must not stop a student from signing in");
  assert.match(load, /queueRef\.current\.flush\(\); \/\/ anything left unsent from last time\n\s+loadChapters\(\);/);
  assert.match(app, /api\.getChapters\(\)\.then\(\(res\) => \{ if \(run === chaptersRun\.current\) setServerChapters\(res\); \}\)\.catch\(\(\) => \{\}\);/);
  assert.match(app, /chaptersRun\.current \+= 1; setServerChapters\(null\); setChapterQuiz\(\{\}\);/, "signing out forgets the previous student's chapters");
});

test("full past papers are locked (when LOCK_PAPERS is on) until the subject's chapters are passed, and unknown progress never locks", () => {
  const gate = app.slice(app.indexOf("const paperGate = (subject) =>"), app.indexOf("// Fetch the account, progress"));
  assert.match(gate, /if \(progress == null \|\| !list\.some\(\(ex\) => ex\.chapter\)\) return \{ locked: false \};/);
  assert.match(gate, /locked: !papersOpen\(rows\)/);
  assert.match(app, /browse: <Browse [^>]*paperGate=\{paperGate\} onGoPractice=\{\(\) => go\("practice"\)\} \/>/);
  assert.match(browse, /if \(paperGate\(subject\)\.locked\) return;/, "a stale button must not start a locked paper");
  const cardLock = browse.indexOf("{gate.locked ? (");
  assert.ok(cardLock > 0, "the card branches on the lock");
  const locked = browse.slice(cardLock, browse.indexOf(") : (", cardLock));
  assert.match(locked, /<PapersLock /);
  assert.doesNotMatch(locked, /examStartBtn|setViewingPaper|download/, "nothing that opens a paper sits in the locked branch");
  const unlocked = browse.slice(browse.indexOf(") : (", cardLock));
  for (const open of ["startAttempt(sub.s, year)", "setViewingPaper({ subject: sub.s, year, pdf, images })", "href={pdf} download"]) assert.ok(unlocked.includes(open), `${open} stays, behind the lock`);
});

test("the paper lock says it locks the app's links, and a lock stays grey", () => {
  assert.match(lockUi, /public static files/);
  assert.doesNotMatch(strip(lockUi), /--ember/);
  assert.match(lockUi, /background: "var\(--bg-soft\)"/);
});

test("the quiz and the paper lock do not hard-code the pass or master score", () => {
  for (const [name, src] of [["ChapterQuiz.jsx", quizUi], ["PapersLock.jsx", lockUi]]) {
    assert.doesNotMatch(strip(src), /(?<![\d.])(70|85)(?![\d.])/, `${name} must not hard-code the pass or master score`);
  }
  assert.match(quizUi, /from "\.\/progressionConfig\.js"/);
});

test("the quiz gives no right-or-wrong feedback while it is being taken, and the result reviews only what was missed", () => {
  const answering = strip(quizUi).slice(strip(quizUi).indexOf("/* ── A question ── */"));
  assert.doesNotMatch(answering, /grade\(/, "the question screen never marks an answer");
  assert.match(strip(quizUi), /const missed = questions\.filter\(\(q\) => !\(answers\[q\.id\] != null && grade\(q, answers\[q\.id\]\)\)\);/);
});

test("the locked-chapter sheet is centred on the screen and drawn outside the animated page, so it never lands off-screen", () => {
  const code = strip(list);
  // The page wrapper keeps a transform from its `rise` animation, and a transform makes it the containing block of any
  // `position: fixed` child: inside it the overlay was as tall as the page and the sheet sat at the page's bottom.
  assert.match(code, /import \{ createPortal \} from "react-dom";/);
  assert.match(code, /createPortal\(/);
  assert.match(code, /closest\?\.\("\.eai-root"\) \?\? document\.body/, "hosted in the app root so the theme variables still apply");
  // Centred on every size, not a bottom sheet on phones.
  const overlay = code.slice(code.indexOf('className="fixed inset-0 z-[150]'), code.indexOf('role="dialog"'));
  assert.match(overlay, /flex items-center justify-center/);
  assert.doesNotMatch(overlay, /items-end/);
  assert.doesNotMatch(code, /rounded-t-3xl/);
  // It must fit a short phone and keep clear of the notch and home bar.
  assert.match(code, /maxHeight: "100%"/);
  assert.match(code, /overflow-y-auto/);
  assert.match(code, /env\(safe-area-inset-top\)/);
  assert.match(code, /env\(safe-area-inset-bottom\)/);
  // Opening and closing it must never scroll the page.
  assert.match(code, /primary\.current\?\.focus\(\{ preventScroll: true \}\)/);
  assert.match(code, /returnTo\.current\?\.focus\?\.\(\{ preventScroll: true \}\)/);
});

test("the past papers are open to every student while LOCK_PAPERS is false", () => {
  assert.match(app, /const LOCK_PAPERS = false;/);
  assert.match(app, /if \(!LOCK_PAPERS\) return \{ locked: false \};/);
});

test("a chapter card answers the pointer as a whole, with nothing that moves", () => {
  // Breaks if: the inner "open chapter" button gets .eai-tile back. That class lifts the element 3px and gives it its own shadow, so
  // inside a card the title row jumped up and looked like a second card sitting on the first (the Formula drill tag stayed put).
  assert.match(list, /className="eai-card eai-chapter flex-1 min-w-0"/);
  assert.match(list, /className="eai-chapter-open eai-focus text-left block w-full"/);
  assert.doesNotMatch(list, /className="[^"]*eai-tile/);
  const css = app.slice(app.indexOf(".eai-chapter{"), app.indexOf(".eai-chapter{") + 700);
  assert.match(css, /\.eai-chapter\{ transition:border-color \.2s ease, box-shadow \.2s ease; \}/);
  assert.match(css, /@media \(hover:hover\)\{ \.eai-chapter:hover\{ border-color:var\(--primary\); box-shadow:/);
  assert.doesNotMatch(css.slice(0, css.indexOf("@media (prefers-reduced-motion")), /transform/, "no transform on the card or its button");
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)\{ \.eai-chapter\{ transition:none; \} \}/);
});
