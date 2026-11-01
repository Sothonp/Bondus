/* The chapter path: which chapters are open, which are locked and why. Pure functions, no React, tested in
   chapterProgress.test.js (and against chapter-path-cases.json, the same cases the backend runs).

   A subject with chapters is an ordered list. Chapter 1 is always open; the next one opens when the one before is Passed.

   Passed is decided by the chapter's Master Quiz (progressionConfig.js: PASS_PERCENT of its questions right), never by
   practice alone. Practice only decides when the quiz becomes available: once PASS_PERCENT of the chapter's questions are
   solved the chapter is `quizReady`. "Solved" is a question answered correctly at least once (the practice record's
   `xpAwarded` flag, set by the first correct answer and never taken back), so a wrong answer later cannot lock anything
   again and a manual "Completed" tick (the student's own word) counts for nothing.

   Where "passed" comes from: the server (GET /chapters) in server mode, which also grandfathers students who were already
   part-way through a chapter before the quiz existed; or this session's own quiz results without a server. When that is
   not known (the server has not answered), `progress` is null and the earlier interim rule applies so nobody is locked out
   by a slow connection: a chapter with PASS_PERCENT solved counts as passed and no quiz is offered.

   States: locked, available (open, nothing answered), inProgress, quizReady, passed, mastered. */
import { PASS_PERCENT, MASTER_PERCENT, QUIZ_SIZE, TEST_OUT_COVERAGE_PERCENT } from "./progressionConfig.js";
import { seedFrom, seededRandom } from "./warmup.js";

/* Chapter keys in curriculum order. They keep first-appearance order, unless EVERY chapter carries a numeric
   `chapterOrder`, in which case they sort by it (so lessons appended to the bank later still land in order). A subject
   with no chapters gives []. `list` is the subject's exercises ({ chapter, chapterOrder }). */
export function chapterKeys(list) {
  const keys = [...new Set(list.filter((ex) => ex.chapter).map((ex) => ex.chapter))];
  const rank = (key) => list.find((ex) => ex.chapter === key)?.chapterOrder;
  return keys.every((key) => rank(key) != null) ? [...keys].sort((a, b) => rank(a) - rank(b)) : keys;
}

/* Solved = answered correctly at least once. Answered = any graded answer, right or wrong (a tick is neither). */
export const isSolved = (rec) => rec?.xpAwarded === true;
export const isAnswered = (rec) => isSolved(rec) || rec?.result === "correct" || rec?.result === "incorrect";

/* Whole-number comparison, so 7 of 10 is exactly 70 and never 69.999. */
export const reaches = (count, total, percent) => total > 0 && count * 100 >= percent * total;
/* How many more of `total` must be reached to arrive at `percent`. */
export const toReach = (count, total, percent) => Math.max(0, Math.ceil((percent * total) / 100) - count);

/* Each chapter's state from plain numbers: the part the backend repeats, checked against the shared cases.
   `inputs`, in chapter order: { key, total, solved, answered, passed, mastered, attempts }.
   Returns the inputs again plus:
     index      position in the subject
     percent    share of the chapter solved, 0 to 100 (rounded, for display)
     state      locked | available | inProgress | quizReady | passed | mastered
     toQuiz     how many more questions to solve before the Master Quiz is available (0 once it is)
     blockedBy  for a locked chapter, the key of the chapter that must be passed first (otherwise null) */
export function chapterStatesFromCounts(inputs) {
  // A student who has worked in a later chapter (or taken its quiz) is never locked out of the ones before it: it keeps
  // the path from closing on someone who was already there, and it holds for good (answers are not undone).
  let furthest = -1;
  inputs.forEach((row, i) => { if (row.answered > 0 || row.attempts > 0) furthest = i; });
  return inputs.map((input, i) => {
    const mastered = Boolean(input.mastered);
    const passed = Boolean(input.passed) || mastered;
    const before = inputs[i - 1];
    const open = i === 0 || i <= furthest || Boolean(before.passed) || Boolean(before.mastered);
    let state;
    if (!open) state = "locked";
    else if (mastered) state = "mastered";
    else if (passed) state = "passed";
    else if (reaches(input.solved, input.total, PASS_PERCENT)) state = "quizReady";
    else state = input.answered > 0 ? "inProgress" : "available";
    return {
      ...input, passed, mastered, index: i, state,
      percent: input.total ? Math.round((input.solved * 100) / input.total) : 0,
      toQuiz: toReach(input.solved, input.total, PASS_PERCENT),
      blockedBy: state === "locked" ? before.key : null,
    };
  });
}

/* Every chapter of one subject with its state.
   `list`: the subject's exercises ({ id, chapter, chapterOrder }); `practice`: the practice record;
   `progress`: { [chapterKey]: { passed, mastered, attempts, best } } from the server or from this session, or null when
   it is not known (see the top of this file).
   Rows are chapterStatesFromCounts() rows plus `best` (best quiz score in percent, or null if the quiz was never taken). */
export function chapterStates(list, practice = {}, progress = null) {
  const inputs = chapterKeys(list).map((key) => {
    const ids = list.filter((ex) => ex.chapter === key).map((ex) => ex.id);
    const solved = ids.filter((id) => isSolved(practice?.[id])).length;
    const answered = ids.filter((id) => isAnswered(practice?.[id])).length;
    const known = progress?.[key];
    const total = ids.length;
    return {
      key, total, solved, answered,
      passed: progress == null ? reaches(solved, total, PASS_PERCENT) : Boolean(known?.passed),
      mastered: progress == null ? reaches(solved, total, MASTER_PERCENT) : Boolean(known?.mastered),
      attempts: known?.attempts ?? 0,
      best: known?.best ?? null,
    };
  });
  return chapterStatesFromCounts(inputs);
}

/* How many chapters of the subject are Passed or Mastered, for a summary line. */
export const chaptersPassed = (rows) => rows.filter((r) => r.state === "passed" || r.state === "mastered").length;
/* Full past papers of a subject open when every one of its chapters is Passed. */
export const papersOpen = (rows) => rows.length > 0 && chaptersPassed(rows) === rows.length;

/* How many questions the Master Quiz of a chapter of `total` questions has, and how many of them must be right. */
export const quizLength = (total) => Math.min(QUIZ_SIZE, total);
export const quizNeeded = (total) => toReach(0, quizLength(total), PASS_PERCENT);

/* Test out: the student has not solved enough to unlock the quiz, but the topics of this chapter they have been scored on
   (topicMastery[subject]) cover at least half of the chapter's topics and average the Mastered score or better.
   `mastery`: { [topic]: { score } } for the subject. A chapter with no topics, or none scored, is never eligible. */
export function testOutEligible(list, chapterKey, mastery = {}) {
  const topics = [...new Set(list.filter((ex) => ex.chapter === chapterKey).map((ex) => ex.topic).filter(Boolean))];
  const scores = topics.map((topic) => mastery?.[topic]?.score).filter((score) => Number.isFinite(score));
  if (topics.length === 0 || scores.length === 0) return false;
  const sum = scores.reduce((a, b) => a + b, 0);
  return scores.length * 100 >= TEST_OUT_COVERAGE_PERCENT * topics.length && sum >= MASTER_PERCENT * scores.length;
}

/* The questions of one Master Quiz: `quizLength` different questions of the chapter, spread across its topics (one from
   each topic in turn, topics and questions in a random order), the same for the same `seed`. A new seed gives a new draw,
   so a retake is not the same ten questions. Returns exercises from `list`. */
export function pickQuizQuestions(list, chapterKey, seed, size = QUIZ_SIZE) {
  const pool = list.filter((ex) => ex.chapter === chapterKey);
  const count = Math.min(size, pool.length);
  const random = seededRandom(seedFrom(`${seed}|${chapterKey}`));
  const shuffled = (items) => items.map((item) => ({ item, r: random() })).sort((a, b) => a.r - b.r).map((o) => o.item);
  const byTopic = new Map();
  for (const ex of shuffled(pool)) {
    const topic = ex.topic ?? "";
    if (!byTopic.has(topic)) byTopic.set(topic, []);
    byTopic.get(topic).push(ex);
  }
  const queues = shuffled([...byTopic.values()]);
  const picked = [];
  while (picked.length < count && queues.some((q) => q.length)) {
    for (const queue of queues) {
      if (picked.length >= count) break;
      const next = queue.shift();
      if (next) picked.push(next);
    }
  }
  return picked;
}

/* ── Quiz results kept in this session (no server) ───────────────────────────────────────────────────────────────
   store: { [subject]: { [chapterKey]: { passed, mastered, attempts, bestCorrect, bestTotal } } } */

/* The store as `progress` for chapterStates(): { [chapterKey]: { passed, mastered, attempts, best } }. */
export function localProgress(store, subject) {
  return Object.fromEntries(Object.entries(store?.[subject] ?? {}).map(([key, e]) => [key, {
    passed: Boolean(e.passed), mastered: Boolean(e.mastered), attempts: e.attempts ?? 0,
    best: e.bestTotal > 0 ? Math.round((e.bestCorrect * 100) / e.bestTotal) : null,
  }]));
}

/* The store after one more quiz. The best attempt is kept (compared by cross-multiplying, so no rounding decides it), a
   pass or a Grade A is never taken back, and the attempt count goes up. */
export function recordLocalQuiz(store, subject, chapterKey, correct, total) {
  const prev = store?.[subject]?.[chapterKey] ?? {};
  const better = !(prev.bestTotal > 0) || correct * prev.bestTotal > prev.bestCorrect * total;
  const entry = {
    attempts: (prev.attempts ?? 0) + 1,
    bestCorrect: better ? correct : prev.bestCorrect,
    bestTotal: better ? total : prev.bestTotal,
    passed: Boolean(prev.passed) || reaches(correct, total, PASS_PERCENT),
    mastered: Boolean(prev.mastered) || reaches(correct, total, MASTER_PERCENT),
  };
  return { ...store, [subject]: { ...store?.[subject], [chapterKey]: entry } };
}

/* What a quiz of `correct` right answers out of `total` amounts to, in the same shape the server answers with. */
export function quizVerdict(correct, total, wasPassed = false) {
  const passed = reaches(correct, total, PASS_PERCENT);
  return {
    correct, total, score: total ? Math.round((correct * 100) / total) : 0,
    passed, mastered: reaches(correct, total, MASTER_PERCENT), newlyPassed: passed && !wasPassed,
  };
}
