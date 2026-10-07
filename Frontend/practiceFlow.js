/* Question order inside a practice "set" — shared by the BAC II practice (PracticeSubject) and the
   university course quizzes (UniversityPracticeCourse) in App.jsx. Pure functions, no React, so the
   rules can be tested on their own (practiceFlow.test.js).

   The rule: go FORWARD through the set. A question answered wrongly is not asked again straight away
   — the student carries on to the questions after it, and the missed ones come round again once the
   end of the set is reached, until every question has been answered correctly. Only then is the set
   complete. (This replaces the old random, difficulty-filtered pick, which jumped backwards, kept
   re-serving completed questions and could never finish a set.) */

/* A set is the group of questions a student works through together: a lesson's formula quiz (stage 0)
   and its practice problems (stage 1) are two sets; a list without stages is a single set. Returns the
   indexes of the set that contains list[i], in list order. */
export const setIndexes = (list, i) => {
  const staged = list.some((e) => e.stage != null);
  const key = (e) => (staged ? e.stage ?? 1 : 0);
  return list.flatMap((e, j) => (key(e) === key(list[i]) ? [j] : []));
};

/* Where "Next" goes from list[from]: the next question of the same set that is not yet completed,
   scanning forward and wrapping round to the start of the set. Returns:
     • an index  — the next question to ask (it equals `from` when the question just missed is the
                   only one left, i.e. it simply has to be tried again);
     • null      — nothing is left: every question in the set is completed, the set is finished.
   `reviewing` is for a set that was already fully completed when the student started: Next then walks
   forward through every question in order (completed or not) before the "anything left?" scan above. */
export const nextInSet = (list, isDone, from, reviewing = false) => {
  const idxs = setIndexes(list, from);
  const at = idxs.indexOf(from);
  if (reviewing && at + 1 < idxs.length) return idxs[at + 1];
  for (let step = 1; step <= idxs.length; step++) {
    const j = idxs[(at + step) % idxs.length];
    if (!isDone(list[j])) return j;
  }
  return null;
};

/* After a set is finished: the first unfinished question of the next set that still has one (e.g. the
   practice problems after the formula quiz), or null when no later set has anything left. */
export const nextSetStart = (list, isDone, from) => {
  const here = setIndexes(list, from);
  for (let j = here[here.length - 1] + 1; j < list.length; j++) {
    const idxs = setIndexes(list, j);
    const open = idxs.find((k) => !isDone(list[k]));
    if (open != null) return open;
    j = idxs[idxs.length - 1]; // this whole set is done — skip to the one after it
  }
  return null;
};
