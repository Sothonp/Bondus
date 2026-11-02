/* Guards on how Khmer reaches the screens. App.jsx is read as text because the app has no DOM test harness (the same way
   chapterWiring.test.js does it). What these catch: the two string tables drifting apart, a screen asking for a key that no
   table has (it would show the key itself), and the English that used to be written into the Coach, the toasts and the
   phone navigation creeping back in.
   Run with:  node --test Frontend/khmerWiring.test.js */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CHEER_STRINGS } from "./mascotCheers.js";
import { MORE_STRINGS } from "./moreStrings.js";

const read = (name) => readFileSync(new URL(`./${name}`, import.meta.url), "utf8");
const app = read("App.jsx");
const nav = read("MobileNav.jsx");
const profileUi = read("ProfileUi.jsx");
const coachUi = read("CoachHistory.jsx");
const strip = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const between = (src, from, to) => src.slice(src.indexOf(from), src.indexOf(to, src.indexOf(from)));

/* The STRINGS table from App.jsx, read by finding its closing brace (skipping strings and comments) and evaluating it. */
function stringsTable() {
  const start = app.indexOf("const STRINGS = {");
  const open = app.indexOf("{", start);
  let depth = 0;
  let i = open;
  for (; i < app.length; i++) {
    const c = app[i];
    if (c === "{") depth++;
    else if (c === "}" && --depth === 0) break;
    else if (c === '"' || c === "'" || c === "`") { i++; while (app[i] !== c) { if (app[i] === "\\") i++; i++; } }
    else if (c === "/" && app[i + 1] === "/") { while (app[i] !== "\n") i++; }
  }
  return new Function("CHEER_STRINGS", `return (${app.slice(open, i + 1)});`)(CHEER_STRINGS);
}
const STRINGS = stringsTable();

test("App.jsx's English and Khmer tables have the same keys", () => {
  const en = Object.keys(STRINGS.en);
  const km = Object.keys(STRINGS.km);
  assert.ok(en.length > 400, "the table was read");
  assert.deepEqual(en.filter((k) => !(k in STRINGS.km)), [], "keys with no Khmer");
  assert.deepEqual(km.filter((k) => !(k in STRINGS.en)), [], "Khmer keys with no English");
});

test("every Khmer line in App.jsx's table has Khmer letters in it, apart from the ones that are the same word in both", () => {
  const sameInBoth = new Set(["PRO", "BONDUS", "PDF", "Super Bondus", "VIP Bondus", "AI", "XP"]); // brand and file-format words
  const bare = Object.entries(STRINGS.km).filter(([k, v]) => typeof v === "string" && !/[ក-៿]/.test(v) && !sameInBoth.has(v) && !/^[\d\s.,%:+\-–—/·]*$/.test(v));
  assert.deepEqual(bare.map(([k]) => k), []);
});

test("t() looks in the table, then in moreStrings.js, and tf() fills the {placeholders}", () => {
  assert.match(app, /import \{ moreText, fillText \} from "\.\/moreStrings\.js";/);
  assert.match(app, /const t = \(lang, key\) => STRINGS\[lang\]\?\.\[key\] \?\? STRINGS\.en\[key\] \?\? moreText\(lang, key\) \?\? key;/);
  assert.match(app, /const tf = \(lang, key, vars\) => fillText\(t\(lang, key\), vars\);/);
});

test("a key the screens ask for exists in a table (otherwise the screen would show the key itself)", () => {
  const known = new Set([...Object.keys(STRINGS.en), ...Object.keys(MORE_STRINGS.en)]);
  const code = strip(app) + strip(nav) + strip(profileUi) + strip(coachUi);
  const wanted = new Set();
  const patterns = [/\bT\("(\w+)"/g, /\btf\(lang, "(\w+)"/g, /\bt\(lang, "(\w+)"/g, /\btr\("(\w+)"/g, /\bword\(tr, "(\w+)"/g, /\bT\(\s*[a-z]+ \? "(\w+)" : "(\w+)"/g];
  for (const re of patterns) for (const m of code.matchAll(re)) m.slice(1).filter(Boolean).forEach((k) => wanted.add(k));
  // "a ? 'x' : 'y'" arguments: both arms
  for (const m of code.matchAll(/\b(?:tf|t)\(lang, [^"()]*\? "(\w+)" : "(\w+)"/g)) { wanted.add(m[1]); wanted.add(m[2]); }
  assert.ok(wanted.size > 100, "the keys were found");
  assert.deepEqual([...wanted].filter((k) => !known.has(k)).sort(), []);
});

test("the mode tabs, subtitles and suggestions of the Coach come from the table, for every mode", () => {
  for (const id of ["study", "exam", "major", "university"]) {
    for (const key of ["label", "subtitle", "placeholder", "intro"]) {
      assert.ok(MORE_STRINGS.en[`coach_${id}_${key}`], `coach_${id}_${key} (English)`);
      assert.ok(MORE_STRINGS.km[`coach_${id}_${key}`], `coach_${id}_${key} (Khmer)`);
    }
  }
  const coachCopy = between(app, "function coachCopy(", "const historyTextFor");
  assert.match(coachCopy, /subjectLabel\(s, lang\)/, "a weak or strong subject is named in the student's language");
});

test("the Coach is given the language, and passes it on to the replies, the messages and the streaming layer", () => {
  assert.match(app, /<Coach p=\{p\} lang=\{lang\} userKey=\{userKeyOf\(profile\)\} \/>/);
  assert.match(app, /function Coach\(\{ p, lang = "en", userKey = null \}\) \{/);
  assert.match(app, /const extras = \{ images, signal: controller\.signal, onImages, exam, lang \};/);
  assert.match(app, /<UserMessage key=\{m\.id\} m=\{m\} onOpenImage=\{setLightbox\} lang=\{lang\} \/>/);
  assert.match(app, /<AssistantMessage key=\{m\.id\} m=\{m\} Icon=\{active\.icon\} lang=\{lang\} \/>/);
  assert.match(app, /async function ragStudyReply\(t, p, history, onUpdate = \(\) => \{\}, \{ images = \[\], signal, onImages, lang = "en" \} = \{\}\) \{/);
  assert.match(app, /async function examPaperReply\(t, p, history, onUpdate = \(\) => \{\}, \{ signal, exam, lang = "en" \} = \{\}\) \{/);
  assert.match(app, /initialStatus, lang = "en", stageLabels = stageLabelsFor\(lang\) \}\) \{/);
});

test("the English the Coach used to have written into it is gone from the code", () => {
  const code = strip(app);
  const coach = between(code, "function Coach(", "const SUPER_PLANS");
  const messages = between(code, "function CopyButton(", "function Coach(");
  const stream = between(code, "async function ragStreamReply(", "const EXAM_FOCUS_MAX");
  const exam = between(code, "const EXAM_FOCUS_MAX", "const ANSWER_REQUEST") + between(code, "async function examPaperReply(", "/* Chat history") ;
  const gone = [
    "AI Coach</h2>", "what shall we work on?", "Add photos or files", "Add to study library", "Thinking…", "Stop generating", "Send (Enter)",
    "Double-check important steps", "Drop photos to ask", "Photo preview", "Ask about your photo", "Indexing…", "Paper options",
    "You can attach up to", "Please wait for the current upload", "Sorry, something went wrong",
  ];
  for (const text of gone) assert.ok(!coach.includes(text), `Coach still has "${text}"`);
  for (const text of ["Copy answer", "Text read from", "Khmer OCR", "Print or save", "Allow pop-ups", "Try it first"]) assert.ok(!messages.includes(text), `a message component still has "${text}"`);
  for (const text of ["Switching to another model", "(Stopped)", "Stopped.", "Sorry, I couldn't", "(Offline demo reply", "was cut off", "longer than I can"]) {
    assert.ok(!stream.includes(text) && !exam.includes(text), `the reply code still has "${text}"`);
  }
});

test("an error the app words itself comes in the student's language; a server's own error stays as the server wrote it", () => {
  assert.match(app, /const ragMessage = \(err, lang\) => \(err\.message === UNREACHABLE \? tf\(lang, "coachUnreachable"\) : err\.message === RAG_LOST \? tf\(lang, "coachLost"\) : err\.message\);/);
  assert.equal(MORE_STRINGS.en.coachUnreachable, "The AI coach server is not reachable.");
  assert.equal(MORE_STRINGS.en.coachLost, "The connection to the AI coach server was lost.");
});

test("the toasts, the sidebar streak and the Progress tiles take the language", () => {
  const code = strip(app);
  assert.match(code, /function WelcomeBackToast\(\{ name, show, lang = "en" \}\)/);
  assert.match(code, /function LevelUpToast\(\{ level, show, lang = "en" \}\)/);
  assert.match(code, /<WelcomeBackToast name=\{profile\.name\} show=\{showWelcomeBack\} lang=\{lang\} \/>/);
  assert.match(code, /<LevelUpToast level=\{levelUpToast\} show=\{levelUpToast != null\} lang=\{lang\} \/>/);
  assert.match(code, /tf\(lang, "streakDays", \{ n: localizeNum\(p\.streak, lang\) \}\)/);
  assert.match(code, /function analyticsSignals\(p, live = \{\}, lang = "en"\)/);
  assert.match(code, /analyticsSignals\(p, live, lang\)/);
  const signals = code.slice(code.indexOf("function analyticsSignals("), code.indexOf("\n}\n", code.indexOf("function analyticsSignals(")));
  for (const text of ["Login frequency", "Study consistency", "Mistake patterns", "Learning habits", "Avg accuracy", "Steady pace"]) {
    assert.ok(!signals.includes(text), `analyticsSignals still has "${text}"`);
  }
  for (const text of ["Welcome back,", "Level up! You"]) assert.ok(!code.includes(text), `App.jsx still has "${text}"`);
});

test("the phone navigation reads its labels for a screen reader from the translator", () => {
  const code = strip(nav);
  assert.match(code, /import \{ moreText, fillText \} from "\.\/moreStrings\.js";/);
  assert.match(code, /export function MobileTopBar\(\{[^}]*profileLabel, tr,/);
  for (const text of ["Switch to light mode", "Switch to dark mode", 'aria-label="Close"', 'aria-label="Main"', "-day streak"]) {
    assert.ok(!code.includes(text), `MobileNav.jsx still has ${text}`);
  }
  assert.match(app, /profileLabel=\{tr\("profileOpen"\)\} tr=\{tr\}/);
  assert.match(app, /streak=\{localizeNum\(p\.streak, lang\)\}/);
});

test("the study-abroad filters, notes and match reasons come from the table", () => {
  const code = strip(app);
  const unis = between(code, "function Universities(", "function AbroadUniversityDetail(");
  for (const text of ["Cambodia</option>", "Any country</option>", ">Khmer</option>", ">French</option>", "curated starting list", "illustrative estimates"]) {
    assert.ok(!unis.includes(text), `Universities still has "${text}"`);
  }
  const abroad = between(code, "function AbroadUniversityDetail(", "function scoreScholarshipMatch(");
  for (const text of ["Majors & fields", "Why it's on this list", '"Degrees offered"']) assert.ok(!abroad.includes(text), `the abroad detail still has ${text}`);
  const score = between(code, "function scoreUniversityMatch(", "function UniversityDetail(") + between(code, "function scoreScholarshipMatch(", "function Scholarships(");
  for (const text of ["Offers ${", "English-medium", "Has scholarships you may", "students`", "Need-based", "Merit-based"]) assert.ok(!score.includes(text), `a match reason still has "${text}"`);
  assert.match(code, /scoreScholarshipMatch\(s, up, lang\)/);
  assert.match(code, /\}, \[up\.major, up\.goals, lang\]\);/);
});

test("the university plans have Khmer for every field the plan cards show", () => {
  const plans = between(app, "const UNI_SUPER_PLANS = [", "function SuperBondus(");
  const count = (field) => (plans.match(new RegExp(`\\b${field}:`, "g")) ?? []).length;
  assert.equal(count("featuresKm"), 3);
  for (const field of ["labelKm", "taglineKm", "buttonKm"]) assert.equal(count(field), 3, field);
  // each plan's Khmer feature list is as long as its English one
  const lists = (name) => [...plans.matchAll(new RegExp(`${name}: \\[([\\s\\S]*?)\\n    \\],`, "g"))].map((m) => m[1].split("\n").filter((l) => l.trim()).length);
  assert.deepEqual(lists("featuresKm"), lists("features"));
});
