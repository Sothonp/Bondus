/* The student's own "today" list — pure functions, no React, tested in dailyPlan.test.js.

   A plan task is { id, s, task, min, why, done, date }: `task` is the text the student wrote, `s` the optional subject,
   `min` the optional minutes, `why` a short label ("My task", or the reason a suggestion was made), `done` the tick and
   `date` the local day it belongs to (App's dateKey(), "YYYY-MM-DD"). The dashboard only shows today's tasks, so every
   morning starts with an empty list; older days stay stored. Ticking a task earns no XP — it is a plain to-do list. */

export const MAX_TITLE_LENGTH = 120;
export const MAX_TASKS_PER_DAY = 30;
export const MAX_MINUTES = 600;

export const todaysTasks = (plan, today) => plan.filter((t) => t.date === today);

/* Add a task for `today`. Returns `plan` unchanged (same array) when the title is empty or today's list is full. */
export function addTask(plan, { title, subject = null, minutes = null, why = "My task" }, today, id = Date.now()) {
  const clean = String(title ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_TITLE_LENGTH);
  if (!clean || todaysTasks(plan, today).length >= MAX_TASKS_PER_DAY) return plan;
  const n = Math.round(Number(minutes));
  const min = Number.isFinite(n) && n >= 1 ? Math.min(MAX_MINUTES, n) : null;
  while (plan.some((t) => t.id === id)) id += 1;
  return [...plan, { id, s: subject || null, task: clean, min, why, done: false, date: today }];
}

export const toggleTask = (plan, id) => plan.map((t) => (t.id === id ? { ...t, done: !t.done } : t));

export const removeTask = (plan, id) => plan.filter((t) => t.id !== id);

/* The generator's suggestions that are not already on today's list (matched by their text). */
export function remainingSuggestions(suggestions, plan, today) {
  const have = new Set(todaysTasks(plan, today).map((t) => t.task));
  return suggestions.filter((s) => !have.has(s.task));
}
