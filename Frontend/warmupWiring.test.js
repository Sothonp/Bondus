/* Guards on how the daily warm-up is wired into the app. App.jsx is read as text because the app has no DOM test harness;
   the rules (which questions, when the gate is needed, how progress is kept) are tested in warmup.test.js.
   Run with:  node --test Frontend/warmupWiring.test.js */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (name) => readFileSync(new URL(`./${name}`, import.meta.url), "utf8");
const app = read("App.jsx");
const gate = read("WarmUpGate.jsx");
const shell = app.slice(app.indexOf("export default function App()"));
// Everything before the first early return of the shell is where hooks may live.
const beforeReturns = shell.slice(0, shell.indexOf("if (SERVER_MODE && booting) return"));

test("the gate state and the midnight timer are hooks above the early returns", () => {
  for (const hook of ["useState(0)", "const warmupSlots = useMemo(", "const warmupSaved = useMemo(", "useDayRollover("]) {
    assert.ok(beforeReturns.includes(hook), `${hook} must be declared before the early returns`);
  }
});

test("the gate comes after the setup flow and before the dashboard, and is not shown to admins or university students", () => {
  const setup = shell.indexOf("if (justRegistered) return <SetupFlow");
  const gateAt = shell.indexOf("if (warmupGate) return (");
  const nav = shell.indexOf("const navItems = [");
  assert.ok(setup > 0 && gateAt > setup && nav > gateAt, "order: SetupFlow, then the gate, then the dashboard");
  assert.match(shell, /const warmupEligible = Boolean\(profile\) && profile\.educationLevel !== "university" && !isAdmin\(profile\);/);
});

test("the day is the server's Phnom Penh day, the device's own date only without a server", () => {
  assert.match(shell, /const warmupToday = SERVER_MODE \? \(summary\?\.today \?\? phnomPenhDay\(\)\) : dateKey\(\);/);
  assert.match(shell, /sendStudy\(warmupEvent\(warmupToday, warmupProgress\.slots\.length\)\)/);
});

test("the warm-up reviews the student's own practice record; only with nothing practised does it use easy starter questions", () => {
  const slots = shell.slice(shell.indexOf("const warmupSlots = useMemo("), shell.indexOf("const warmupBefore = useMemo("));
  assert.match(slots, /practisedPool\(practiceNow\.current, \(id\) => getExercise\(id, "en"\), new Set\(subjects\)\)/);
  assert.match(slots, /const subjects = fieldSubjects\(profile\.field, profile\.foreignLanguage\);/);
  assert.match(slots, /practice: practiceNow\.current/);
  // The whole bank is only ever read after the review came back empty, and only from the student's own subjects.
  assert.match(slots, /if \(review\.length\) return review;[\s\S]*starterQuestions\(\{ pool: subjects\.flatMap\(\(subject\) => getExercises\(subject, "en"\)\)\.filter\(isWarmupQuestion\), seed \}\)/);
  assert.equal(slots.split("getExercises(").length - 1, 1, "the bank is read in one place only: the starter fallback");
  assert.doesNotMatch(shell, /warmupPool/, "no pool built from the bank");
});

test("the questions do not change while the student answers", () => {
  const slots = shell.slice(shell.indexOf("const warmupSlots = useMemo("), shell.indexOf("const warmupBefore = useMemo("));
  const deps = slots.slice(slots.lastIndexOf("}, ["));
  assert.match(deps, /\[warmupEligible, warmupUserKey, warmupToday, profile\?\.field, profile\?\.foreignLanguage\]/);
  assert.doesNotMatch(deps, /topicMastery|practice\b/, "mastery and practice are read through refs, not dependencies");
  assert.match(shell, /const masteryNow = useRef\(topicMastery\);/);
  assert.match(shell, /const practiceNow = useRef\(practice\);/);
});

test("warm-up answers are ordinary practice answers, kept after each one, and a timed-out question sends no answer", () => {
  assert.match(shell, /handleAnswer\(ex, correct \? "correct" : "incorrect", \{ timeSec, answer: choice \?\? undefined \}\);/);
  assert.match(shell, /keepWarmup\(recordWarmupAnswer\(warmupProgress, ex\.id, correct\)\);/);
  assert.match(shell, /keepWarmup\(finishWarmup\(warmupProgress\)\);/);
});

test("midnight re-reads the server's summary, or the date without a server", () => {
  assert.match(shell, /api\.getSummary\(\)\.then\(\(sm\) => applySummary\(sm, \{ announce: false \}\)\)/);
  assert.match(shell, /setDayTick\(\(n\) => n \+ 1\)/);
});

test("the screen is a modal dialog with no way to close it, and never turns red", () => {
  assert.match(gate, /role="dialog"/);
  assert.match(gate, /aria-modal="true"/);
  assert.doesNotMatch(gate, /onClose|Escape|<X\b/, "there is no close button: the gate is the point");
  const code = gate.replace(/\/\*[\s\S]*?\*\//g, ""); // the header comment says "never red"; only the code counts
  assert.doesNotMatch(code, /--ember|#[dD]9543[fF]|\bred\b/, "a miss is neutral and the timer amber, never an alarm colour");
});

test("the gate centers itself in a tall viewport instead of pinning the card to the top", () => {
  // Breaks if: on a laptop-sized window the card sits flush against the top with empty space below it
  // (2026-11-10: reported as "the testing box is up not middle of the browser").
  assert.match(gate, /className="min-h-full flex items-center justify-center"/);
});

test("the gate carries its own EN/ខ្មែរ toggle, reachable in every phase since there is no close button", () => {
  assert.match(gate, /import \{ LangToggle \} from "\.\/LangToggle\.jsx";/);
  assert.match(gate, /setLang && \(\s*<LangToggle lang=\{lang\} setLang=\{setLang\}/);
  // pinned to the viewport, not the scrollable card, so it is never scrolled out of reach
  assert.match(gate, /position: "fixed", top: "calc\(env\(safe-area-inset-top\) \+ 14px\)", right: 14/);
  assert.match(app, /<WarmUpGate key=\{warmupProgress\.day\} state=\{warmupProgress\} lang=\{lang\} setLang=\{setLang\}/);
});

test("LangToggle lives in its own file, imported wherever it's used, rather than redefined in App.jsx", () => {
  assert.doesNotMatch(app, /function LangToggle\(/);
  assert.match(app, /import \{ LangToggle \} from "\.\/LangToggle\.jsx";/);
});

test("the flame at the start is shown until the last answer, then lit with the ignite bloom", () => {
  assert.match(gate, /<StreakFlame state=\{before\.flame\} size=\{28\} \/>/);
  assert.match(gate, /<StreakFlame state=\{lit \? "lit" : before\.flame\} size=\{72\} slow \/>/);
});

test("one answer per question, even when the timer and a tap land together", () => {
  assert.match(gate, /answeredRef\.current/);
  assert.equal((gate.match(/answeredRef\.current = true;/g) || []).length, 2, "both the tap and the timeout take the lock");
  assert.match(gate, /answeredRef\.current = false;/);
});

test("getExercise finds one question by id without building the whole bank", () => {
  assert.match(app, /function getExercise\(id, lang = "en"\)/);
  assert.match(app, /String\(id\)\.lastIndexOf\("-"\)/);
  assert.match(app, /resolve=\{getExercise\}/);
});
