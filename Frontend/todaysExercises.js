/* "Today's exercises" on the dashboard: a short list of Mathematics exercises chosen for the student from their own progress,
   in place of the to-do list they used to write themselves. Pure functions, no React; tested in todaysExercises.test.js.

   These are rules over what the app already knows, not a call to a language model: the list appears at once, costs no AI
   quota, and the same progress always gives the same list. Three kinds of pick, in this order:
     retry   a question they answered wrong and have not got right since (the oldest miss first)
     weak    from a topic whose mastery score is below WEAK_BELOW (the weakest topic first), one question per topic
     next    the next unfinished questions along the chapter path, to fill the list
   Only questions in chapters the student has opened are offered, so a tap never lands on a locked chapter. Questions already
   completed are never picked.

   The list is chosen once a day and kept (loadToday / saveToday), so it does not change under the student's feet as they
   answer: a finished question stays on the list, ticked. */
import { isExerciseDone } from "./exerciseStatus.js";
import { chapterKeys, chapterStates } from "./chapterProgress.js";

export const TODAY_COUNT = 5;
export const MAX_RETRIES = 2;
export const MAX_WEAK = 3;
export const WEAK_BELOW = 70;
export const REASONS = ["retry", "weak", "next"];

const stageOf = (ex) => ex.stage ?? 1;

/* The questions a student may be sent to, in the order they work through them: the chapters they have opened in curriculum
   order, a chapter's formula quiz (stage 0) first and then its problems, each group in the bank's order. A subject without
   chapters is one list. `list` is the subject's questions ({ id, subject, topic, chapter, chapterOrder, stage }). */
export function openQuestions(list, practice = {}, progress = null) {
  if (!chapterKeys(list).length) return [...list];
  const open = new Set(chapterStates(list, practice, progress).filter((row) => row.state !== "locked").map((row) => row.key));
  const rank = new Map([...open].map((key, i) => [key, i]));
  return list
    .map((ex, i) => ({ ex, i }))
    .filter(({ ex }) => rank.has(ex.chapter))
    .sort((a, b) => (rank.get(a.ex.chapter) - rank.get(b.ex.chapter)) || (stageOf(a.ex) - stageOf(b.ex)) || (a.i - b.i))
    .map(({ ex }) => ex);
}

/* Up to `count` of { id, reason } for today.
   `practice`: the practice store ({ [id]: { status, result, at } }). `mastery`: the topic-mastery store
   ({ [subject]: { [topic]: { score } } }). `progress`: what the server knows of the chapter quizzes, or null (chapterProgress.js). */
export function pickTodaysExercises({ list, practice = {}, mastery = {}, progress = null, count = TODAY_COUNT }) {
  const ordered = openQuestions(list, practice, progress).filter((ex) => !isExerciseDone(practice?.[ex.id]));
  const picks = [];
  const used = new Set();
  const add = (ex, reason) => { picks.push({ id: ex.id, reason }); used.add(ex.id); };
  const room = () => picks.length < count;

  const missed = ordered.filter((ex) => practice?.[ex.id]?.result === "incorrect")
    .sort((a, b) => (practice[a.id].at ?? 0) - (practice[b.id].at ?? 0));
  for (const ex of missed.slice(0, MAX_RETRIES)) if (room()) add(ex, "retry");

  const scoreOf = (ex) => mastery?.[ex.subject]?.[ex.topic]?.score;
  const topics = [];
  for (const ex of ordered) if (!topics.includes(ex.topic)) topics.push(ex.topic);
  const weak = topics
    .map((topic, order) => ({ topic, order, score: scoreOf(ordered.find((ex) => ex.topic === topic)) }))
    .filter((t) => Number.isFinite(t.score) && t.score < WEAK_BELOW)
    .sort((a, b) => (a.score - b.score) || (a.order - b.order));
  let taken = 0;
  for (const t of weak) {
    if (!room() || taken >= MAX_WEAK) break;
    const ex = ordered.find((e) => e.topic === t.topic && !used.has(e.id));
    if (ex) { add(ex, "weak"); taken += 1; }
  }

  for (const ex of ordered) {
    if (!room()) break;
    if (!used.has(ex.id)) add(ex, "next");
  }
  return picks;
}

/* ── Kept for the day ───────────────────────────────────────────────────────────────────────────────────────────── */

const storageKey = (userKey) => `bondus.todaysExercises.v1:${userKey}`;
const isSaved = (s) => s && typeof s.day === "string" && Array.isArray(s.picks)
  && s.picks.every((p) => p && typeof p.id === "string" && REASONS.includes(p.reason));

/* The list saved for `day`, or null. Anything saved for another day is ignored (and overwritten by the next save). */
export function loadToday(storage, userKey, day) {
  try {
    const raw = storage?.getItem(storageKey(userKey));
    const saved = raw ? JSON.parse(raw) : null;
    return isSaved(saved) && saved.day === day ? saved.picks : null;
  } catch { return null; }
}
export function saveToday(storage, userKey, day, picks) {
  try { storage?.setItem(storageKey(userKey), JSON.stringify({ day, picks })); } catch { /* storage full or blocked: the list is simply worked out again */ }
}

/* Today's list: the one kept for `day` when there is one (minus any question the bank no longer has), else a fresh pick, which
   is kept when it is not empty. `exists(id)` says whether the bank still has the question. */
export function todaysExercises({ storage, userKey, day, exists = () => true, ...inputs }) {
  const kept = (loadToday(storage, userKey, day) ?? []).filter((p) => exists(p.id));
  if (kept.length) return kept;
  const fresh = pickTodaysExercises(inputs);
  if (fresh.length) saveToday(storage, userKey, day, fresh);
  return fresh;
}
