/* Pure helpers for teacher-posted exercises: a student starts a timed attempt, works on paper,
   photographs it, and submits — the same mechanic as the exam timer (examSessions.js), but the
   submission itself lives on the server (a teacher needs to see it, which a per-browser store can
   never do). This file has no store of its own; useExerciseSessions.js talks to the API directly.

   A server submission is shaped like { id, exerciseId, status, startedAt, submittedAt, photos },
   with startedAt/submittedAt as ISO strings (not the epoch milliseconds examSessions.js's sessions
   use) and the time limit living on the exercise, not the submission. toClockShape() below adapts
   that into exactly what examSessions.js's own elapsedSeconds/remainingSeconds expect, so the clock
   math itself is reused rather than re-derived. */
import { elapsedSeconds as examElapsedSeconds, remainingSeconds as examRemainingSeconds, formatClock } from "./examSessions.js";

export { formatClock };
export const MAX_PHOTOS = 10;
// A picture or PDF of the exercise itself, attached by the teacher who posted it (config/bondus.php's
// exercises.max_attachments on the backend -- keep the two in sync).
export const MAX_EXERCISE_ATTACHMENTS = 5;

function toClockShape(submission, timeLimitMinutes) {
  return {
    startedAt: new Date(submission.startedAt).getTime(),
    submittedAt: submission.submittedAt ? new Date(submission.submittedAt).getTime() : null,
    // Only submittedAt vs. still-open matters to the elapsed/remaining math below; the server
    // doesn't separately track "when an expired/cancelled attempt closed".
    closedAt: submission.status === "running" || submission.status === "submitted" ? null : Date.now(),
    limitMin: timeLimitMinutes ?? 0,
  };
}

export function elapsedSeconds(submission, timeLimitMinutes, now = Date.now()) {
  return examElapsedSeconds(toClockShape(submission, timeLimitMinutes), now);
}

/** null when the exercise has no timer — there is nothing to count down to. */
export function remainingSeconds(submission, timeLimitMinutes, now = Date.now()) {
  if (timeLimitMinutes == null) return null;
  return examRemainingSeconds(toClockShape(submission, timeLimitMinutes), now);
}
