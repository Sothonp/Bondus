/* The chapter path: which chapters are open, which are locked and why. Pure functions, no React, tested in
   chapterProgress.test.js.

   A subject with chapters is an ordered list. Chapter 1 is always open; the next one opens when the one before is
   Passed. Everything here is derived from the practice record the app already keeps and saves ({ [exerciseId]: { status,
   result, at, xpAwarded } }), so nothing new is stored and students already part-way through keep what they have.

   What counts as "solved": a question answered correctly at least once. That is the record's `xpAwarded` flag, which is
   set by the first correct answer and never taken back, so a wrong answer later cannot lock a chapter again, and a manual
   "Completed" tick (the student's own word) cannot unlock anything. The Master Quiz (next step) will replace "share of the
   chapter solved" with the quiz's best score; the thresholds stay the same (progressionConfig.js).

   States: locked, available (open, nothing answered), inProgress, passed, mastered. */
import { PASS_PERCENT, MASTER_PERCENT } from "./progressionConfig.js";

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
const reaches = (solved, total, percent) => total > 0 && solved * 100 >= percent * total;
/* How many more questions to solve to reach `percent` of the chapter. */
const solvedNeeded = (solved, total, percent) => Math.max(0, Math.ceil((percent * total) / 100) - solved);

/* Every chapter of one subject with its state.
   `list`: the subject's exercises ({ id, chapter, chapterOrder }); `practice`: the practice record.
   Returns [{ key, index, total, solved, answered, percent, toPass, state, blockedBy, needed }] in chapter order:
     percent    share of the chapter solved, 0 to 100 (rounded, for display)
     toPass     how many more questions of this chapter to solve to Pass it (0 once passed)
     blockedBy  for a locked chapter, the key of the chapter that must be Passed first (otherwise null)
     needed     for a locked chapter, how many more questions of that chapter to solve to open this one (otherwise 0) */
export function chapterStates(list, practice = {}) {
  const keys = chapterKeys(list);
  const rows = keys.map((key, index) => {
    const ids = list.filter((ex) => ex.chapter === key).map((ex) => ex.id);
    const solved = ids.filter((id) => isSolved(practice?.[id])).length;
    const answered = ids.filter((id) => isAnswered(practice?.[id])).length;
    return { key, index, total: ids.length, solved, answered, percent: ids.length ? Math.round((solved / ids.length) * 100) : 0 };
  });
  // A student who has already answered questions in a later chapter is never locked out of the ones before it: this is
  // what keeps current students' progress when the path is introduced, and it holds for good (answers are not undone).
  const furthest = rows.reduce((max, row) => (row.answered > 0 ? row.index : max), -1);
  const passed = (row) => reaches(row.solved, row.total, PASS_PERCENT);
  return rows.map((row, i) => {
    const before = rows[i - 1];
    const open = i === 0 || i <= furthest || passed(before);
    let state;
    if (!open) state = "locked";
    else if (reaches(row.solved, row.total, MASTER_PERCENT)) state = "mastered";
    else if (passed(row)) state = "passed";
    else state = row.answered > 0 ? "inProgress" : "available";
    return {
      ...row, state, toPass: solvedNeeded(row.solved, row.total, PASS_PERCENT),
      blockedBy: state === "locked" ? before.key : null,
      needed: state === "locked" ? solvedNeeded(before.solved, before.total, PASS_PERCENT) : 0,
    };
  });
}

/* How many chapters of the subject are Passed or Mastered, for a summary line. */
export const chaptersPassed = (rows) => rows.filter((r) => r.state === "passed" || r.state === "mastered").length;
