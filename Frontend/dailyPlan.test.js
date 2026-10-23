/* Tests for the student's own daily plan (Frontend/dailyPlan.js) and how App.jsx is wired to it.
   App.jsx is read as text because the app has no DOM test harness.
   Run with:  node --test Frontend/dailyPlan.test.js   (no dependencies — Node's built-in runner) */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { addTask, toggleTask, removeTask, todaysTasks, remainingSuggestions, MAX_TITLE_LENGTH, MAX_TASKS_PER_DAY, MAX_MINUTES } from "./dailyPlan.js";

const D1 = "2026-10-22", D2 = "2026-10-23";

test("adding a task puts it on today's list, not done, tagged with the day", () => {
  const plan = addTask([], { title: "Physics: Newton's laws", subject: "Physics", minutes: 40 }, D1, 1);
  assert.deepEqual(plan, [{ id: 1, s: "Physics", task: "Physics: Newton's laws", min: 40, why: "My task", done: false, date: D1 }]);
});

test("the title is trimmed and its spaces collapsed; an empty or blank title adds nothing", () => {
  assert.equal(addTask([], { title: "  read   chapter 3 " }, D1, 1)[0].task, "read chapter 3");
  const none = [];
  assert.equal(addTask(none, { title: "   " }, D1), none);
  assert.equal(addTask(none, { title: undefined }, D1), none);
});

test("a long title is cut to the limit", () => {
  assert.equal(addTask([], { title: "x".repeat(500) }, D1, 1)[0].task.length, MAX_TITLE_LENGTH);
});

test("minutes are optional: bad values become null, big ones are capped", () => {
  const min = (m) => addTask([], { title: "t", minutes: m }, D1, 1)[0].min;
  assert.equal(min(""), null);
  assert.equal(min(0), null);
  assert.equal(min(-5), null);
  assert.equal(min("abc"), null);
  assert.equal(min("25"), 25);
  assert.equal(min(12.6), 13);
  assert.equal(min(99999), MAX_MINUTES);
});

test("a task with no subject keeps s as null", () => {
  assert.equal(addTask([], { title: "t", subject: "" }, D1, 1)[0].s, null);
});

test("today's list is capped, but another day is not", () => {
  let plan = [];
  for (let i = 0; i < MAX_TASKS_PER_DAY; i++) plan = addTask(plan, { title: `task ${i}` }, D1, i + 1);
  assert.equal(plan.length, MAX_TASKS_PER_DAY);
  assert.equal(addTask(plan, { title: "one too many" }, D1, 999), plan);
  assert.equal(addTask(plan, { title: "tomorrow's first" }, D2, 999).length, MAX_TASKS_PER_DAY + 1);
});

test("ids never collide, even when two tasks are added in the same millisecond", () => {
  let plan = addTask([], { title: "a" }, D1, 7);
  plan = addTask(plan, { title: "b" }, D1, 7);
  assert.deepEqual(plan.map((t) => t.id), [7, 8]);
});

test("ticking flips only that task, and ticking twice undoes it", () => {
  let plan = addTask(addTask([], { title: "a" }, D1, 1), { title: "b" }, D1, 2);
  plan = toggleTask(plan, 2);
  assert.deepEqual(plan.map((t) => t.done), [false, true]);
  assert.deepEqual(toggleTask(plan, 2).map((t) => t.done), [false, false]);
});

test("removing deletes only that task", () => {
  const plan = addTask(addTask([], { title: "a" }, D1, 1), { title: "b" }, D1, 2);
  assert.deepEqual(removeTask(plan, 1).map((t) => t.task), ["b"]);
});

test("each day starts empty: only today's tasks are shown, older ones stay stored", () => {
  const plan = addTask(addTask([], { title: "yesterday" }, D1, 1), { title: "today" }, D2, 2);
  assert.deepEqual(todaysTasks(plan, D2).map((t) => t.task), ["today"]);
  assert.equal(plan.length, 2);
  assert.deepEqual(todaysTasks(plan, "2026-11-01"), []);
});

test("suggestions already added today are not offered again, but are offered again tomorrow", () => {
  const suggestions = [{ id: 1, task: "Algebra — review & practice" }, { id: 91, task: "Reading passage + 15 vocab" }];
  const plan = addTask([], { title: "Algebra — review & practice" }, D1, 1);
  assert.deepEqual(remainingSuggestions(suggestions, plan, D1).map((s) => s.id), [91]);
  assert.equal(remainingSuggestions(suggestions, plan, D2).length, 2);
});

/* ── App.jsx wiring ── */
const app = readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
const between = (from, to) => app.slice(app.indexOf(from), app.indexOf(to));

test("App uses the shared plan helpers and hands add/remove to the Dashboard", () => {
  assert.match(app, /from "\.\/dailyPlan\.js"/);
  assert.match(app, /addTask\(plan, task, date, tempId\)/);
  assert.match(app, /setPlan\(\(arr\) => toggleTask\(arr, id\)\)/);
  assert.match(app, /onAddPlanTask=\{addPlanTask\} onRemovePlanTask=\{removePlanTask\}/);
});

test("new accounts start with an empty plan instead of a generated one", () => {
  assert.equal((app.match(/setPlan\(\[\]\)/g) || []).length >= 3, true);
  assert.doesNotMatch(app, /setPlan\(insights\.plan\)/);
});

test("ticking, adding or removing a plan task pays no XP", () => {
  const planHandlers = between("const togglePlanTask = ", "const handleAnswer = ");
  assert.ok(planHandlers.includes("addPlanTask"), "found the plan handlers");
  assert.doesNotMatch(planHandlers, /setBonusXp|XP_PER_CORRECT|sendStudy/);
});
