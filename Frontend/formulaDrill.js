/* The "Formula drill" review mode: a short, no-paper, tap-the-answer run through one chapter's
   formula-quiz questions (stage 0), for review anytime, including a chapter that is still locked on
   the student's path. It is pure review — it never touches chapter progress, saved practice state or
   the server, so there is nothing to lock. Pure functions, no React; the component is FormulaDrill.jsx.
   Tested in formulaDrill.test.js. */
import { seedFrom, seededRandom } from "./warmup.js";

export const DRILL_SIZE = 10;
// How many extra times a missed question may come back in the same run, so a hard question is seen
// a few times without the run looping forever.
const MAX_REPEATS = 2;
// How many questions ahead a missed one reappears (clamped to what is actually left in the run).
const REQUEUE_GAP = 3;

/* The chapter's formula-quiz pool: every stage-0 question of that chapter, in `list` (a subject's
   full localized exercise list, exactly as PracticeSubject already has it). */
export const drillPool = (list, chapterKey) => list.filter((ex) => ex.chapter === chapterKey && (ex.stage ?? 1) === 0);

/* A fresh run: up to `size` questions from the pool, shuffled by `seed` (a new seed, e.g. Date.now(),
   gives a new draw, so reopening the drill is not the same order or the same subset every time). A
   pool smaller than `size` is used whole. Empty pool -> []. */
export function startDrill(list, chapterKey, seed, size = DRILL_SIZE) {
  const pool = drillPool(list, chapterKey);
  if (!pool.length) return [];
  const random = seededRandom(seedFrom(`drill|${seed}|${chapterKey}`));
  const shuffled = pool.map((item) => ({ item, r: random() })).sort((a, b) => a.r - b.r).map((o) => o.item);
  return shuffled.slice(0, Math.min(size, shuffled.length));
}

/* After answering queue[at]: a wrong answer requeues that question a few slots ahead, so it comes
   back sooner rather than only at the very end, up to MAX_REPEATS times per question; a right answer
   leaves the queue as it is. Returns a new { queue, repeats } (never mutates either argument). */
export function afterAnswer(queue, at, correct, repeats = {}) {
  if (correct) return { queue, repeats };
  const id = queue[at].id;
  const used = repeats[id] || 0;
  if (used >= MAX_REPEATS) return { queue, repeats };
  const insertAt = Math.min(queue.length, at + 1 + REQUEUE_GAP);
  const next = [...queue];
  next.splice(insertAt, 0, queue[at]);
  return { queue: next, repeats: { ...repeats, [id]: used + 1 } };
}
