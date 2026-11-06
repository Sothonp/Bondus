/* How today's exercises are wired into the dashboard (App.jsx, TodaysExercisesCard.jsx). App.jsx is read as text because the app has
   no DOM test harness; the rules that choose the exercises are in todaysExercises.test.js.
   Run with:  node --test Frontend/todaysExercisesWiring.test.js */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { MORE_STRINGS } from "./moreStrings.js";

const read = (f) => readFileSync(new URL(`./${f}`, import.meta.url), "utf8");
const app = read("App.jsx");
const card = read("TodaysExercisesCard.jsx");
const start = app.indexOf("function Dashboard(");
const dashboard = app.slice(start, app.indexOf("\nfunction ", start + 10)); // up to the next top-level function

test("the dashboard is given the student's practice, mastery and chapter progress, not a plan to edit", () => {
  // Breaks if: the card is fed nothing and so picks from an empty record every day.
  assert.match(app, /<Dashboard p=\{p\} go=\{go\} practice=\{practice\} mastery=\{topicMastery\} chapterProgress=\{chapterProgressFor\}/);
  assert.match(app, /function Dashboard\(\{ p, go, practice, mastery, chapterProgress,/);
});

test("the dashboard has no add-a-task form any more", () => {
  // Breaks if: the to-do form and the tight fields come back beside the recommendations.
  assert.doesNotMatch(dashboard, /submitTask|onAddPlanTask|setDraft|planAddPlaceholder/);
});

test("the list is chosen by todaysExercises with the practice record, kept per student and per day, and skips questions the bank lost", () => {
  assert.match(dashboard, /todaysExercises\(\{ storage: safeStorage\(\), userKey: p\.userId \?\? "local", day: dateKey\(\), list: exercises, practice, mastery: mastery \?\? \{\}, progress, exists: \(id\) => getExercise\(id\) != null \}\)/);
});

test("with the server, nothing is picked (or kept) until it has said which chapters are open", () => {
  // Breaks if: a list is saved from the interim rule and sends the student to a chapter that turns out to be locked.
  assert.match(dashboard, /const waiting = SERVER_MODE && subject != null && progress == null;/);
  assert.match(dashboard, /subject && !waiting\s*\?\s*todaysExercises/);
  assert.match(dashboard, /loading=\{waiting\}/);
});

test("a tap remembers the question in Practice's own place-keeper and opens Practice, which resumes there", () => {
  // Breaks if: a tap only opens the Practice menu and the student has to hunt for the question.
  assert.match(dashboard, /practiceMemory\(safeStorage\(\), "bac", p\.userId\)\.remember\(e\)/);
  assert.match(dashboard, /go\("practice"\)/);
});

test("a question counts as done only by the system's own rule (a correct answer)", () => {
  assert.match(dashboard, /done: isExerciseDone\(practice\?\.\[e\.id\]\)/);
});

test("the card is presentation only: nothing is imported back from App.jsx", () => {
  assert.doesNotMatch(card, /from\s+["']\.\/App/);
});

test("every word the card uses is in both languages", () => {
  const used = [...dashboard.matchAll(/t\(lang, "(today[A-Za-z]+)"\)/g)].map((m) => m[1]);
  for (const key of ["todayReasonRetry", "todayReasonWeak", "todayReasonNext", "todayDone"]) used.push(key);
  assert.ok(used.length >= 8);
  for (const key of new Set(used)) {
    assert.ok(MORE_STRINGS.en[key], `en.${key}`);
    assert.ok(MORE_STRINGS.km[key], `km.${key}`);
  }
});

test("rows are tappable buttons that say what they open, and a done row keeps its place", () => {
  assert.match(card, /<button type="button" onClick=\{\(\) => onOpen\(r\.id\)\} aria-label=\{`\$\{text\.openAria\}: \$\{r\.title\}`\}/);
  assert.match(card, /data-done=\{r\.done \? "true" : "false"\}/);
});

test("in Khmer the rows get taller lines, like the rest of the app's Khmer text", () => {
  assert.match(app, /\.eai-km-root \.eai-todo-title\{ line-height:1\.75; \}/);
});
