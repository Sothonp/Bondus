/* Where an exercise stands is decided by the system, never ticked by the student (tested in exerciseStatus.test.js).

     completed    the student answered it correctly
     in_progress  they opened it or answered it wrong, and have not got it right
     pending      not started

   It is worked out from the saved record of the exercise ({ status, result, at }) every time it is shown, so the answer is
   the only thing that can finish an exercise. A "Completed" tick saved before this rule has no correct answer behind it
   and so no longer counts. */
export function exerciseStatus(rec) {
  if (!rec) return "pending";
  if (rec.result === "correct") return "completed";
  if (rec.result === "incorrect" || rec.status === "in_progress") return "in_progress";
  return "pending";
}

export const isExerciseDone = (rec) => exerciseStatus(rec) === "completed";

/* The record for an exercise that has just been opened (nothing answered yet), or null when it already has one. */
export function openedRecord(existing, ex, now = Date.now()) {
  if (existing) return null;
  return { status: "in_progress", result: null, at: now, subject: ex.subject, topic: ex.topic, xpAwarded: false };
}
