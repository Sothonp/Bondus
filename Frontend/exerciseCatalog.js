/* What the backend needs to know about the exercise bank, so it can grade answers itself instead of believing the
   browser (POST /study-events in bondus-backend). Pure — no React, no network — tested in exerciseCatalog.test.js.

   This file also owns the exercise id scheme, and App.jsx builds its ids with the same helpers, so an id the app sends
   is always an id in the catalog. After changing a question bank, regenerate the backend's copy:
     node scripts/export-exercise-catalog.mjs                                                         */
import { setIndexes } from "./practiceFlow.js";
import { chapterKeys } from "./chapterProgress.js";

export const exerciseId = (subject, i) => `${subject}-${i + 1}`;
export const uniExerciseId = (courseKey, i) => `uni:${courseKey}:${i + 1}`;

/* Every answer the app accepts for a question: the English one, plus the Khmer one when the bank has it (the app
   grades against the Khmer text while it is in Khmer). */
function answersOf(raw) {
  const answers = [String(raw.answer)];
  if (raw.answerKm && String(raw.answerKm) !== answers[0]) answers.push(String(raw.answerKm));
  return answers;
}

/* The sets a student works through, found the way PracticeSubject / UniversityPracticeCourse find them: a chapter's
   list is sorted formula quiz (stage 0) first, then split with setIndexes; a subject with no chapters is one list.
   A set is named by its first question — that is the `key` of its treasure-box claim. */
function setsOf(items) {
  const hasChapters = items.some((e) => e.chapter);
  const chapters = hasChapters ? [...new Set(items.filter((e) => e.chapter).map((e) => e.chapter))] : [null];
  const sets = {};
  for (const chapter of chapters) {
    const list = hasChapters
      ? items.filter((e) => e.chapter === chapter).sort((a, b) => (a.stage ?? 1) - (b.stage ?? 1))
      : items;
    const placed = new Set();
    list.forEach((_, i) => {
      if (placed.has(i)) return;
      const members = setIndexes(list, i);
      members.forEach((j) => placed.add(j));
      sets[list[members[0]].id] = members.map((j) => list[j].id);
    });
  }
  return sets;
}

/* { exercises: { id: [accepted answers] }, sets: { setKey: [exercise ids] }, chapters: { subject: [{ key, ids, formulaIds }] } }
   for the BAC II bank and the university quiz bank (whose courses are keyed "{major}::{course title}").
   `chapters` is the path the server enforces: for each BAC II subject that has chapters, its chapters in curriculum order
   (chapterKeys, the same order the app shows) with the ids of their questions. Subjects without chapters are not listed.

   `formulaIds` is for the separate Formula Mastery system: the ids of this chapter's questions that carry an explicit
   `kind` tag (see src/data/mathematics/formulaMastery.js). These are DELIBERATELY EXCLUDED from `ids` -- not merely a
   subset of it -- so that adding Formula Mastery content to a chapter can never change what the Master Quiz draws from,
   how many questions count toward `$total` in ChapterPath::forUser (bondus-backend), or a student's existing
   passed/mastered state there. (An earlier version of this function put them in both lists; regenerating the catalog and
   diffing it against main showed that a chapter's Master-Quiz `ids` -- and, through `$total`, the legacy pass/master
   percentage computed from answers given before the Master Quiz existed -- shifted the moment Formula Mastery content
   was added to that chapter. Excluding them from `ids` entirely removes that risk rather than accepting it.)

   The same reasoning excludes kind-tagged items from `sets` (the treasure-box groupings StudyController::boxReward
   checks in bondus-backend): a chapter's existing formula-quiz box is a pre-existing, independently-claimable reward,
   and growing its membership the moment Formula Mastery content is added would make it demand more correct answers
   from anyone who had not already claimed it -- a real behavior change, even though it could never revoke XP already
   paid out. Formula Mastery gets its own reward path through its own endpoint instead (see ChapterController::quiz,
   whose StudyEvent carries xp_awarded = 0, for the existing precedent of a mastery check living outside this economy). */
export function buildCatalog(bank, uniBank) {
  const exercises = {};
  const sets = {};
  const chapters = {};
  const add = (list, idOf, subject = null) => {
    const items = list.map((raw, i) => {
      const id = idOf(i);
      exercises[id] = answersOf(raw);
      return { id, chapter: raw.chapter, chapterOrder: raw.chapterOrder, stage: raw.stage, kind: raw.kind };
    });
    Object.assign(sets, setsOf(items.filter((e) => e.kind == null)));
    const keys = subject ? chapterKeys(items) : [];
    if (keys.length) {
      chapters[subject] = keys.map((key) => {
        const members = items.filter((e) => e.chapter === key);
        return {
          key,
          ids: members.filter((e) => e.kind == null).map((e) => e.id),
          formulaIds: members.filter((e) => e.kind != null).map((e) => e.id),
        };
      });
    }
  };
  for (const [subject, list] of Object.entries(bank)) add(list, (i) => exerciseId(subject, i), subject);
  for (const [course, list] of Object.entries(uniBank)) add(list, (i) => uniExerciseId(course, i));
  return { exercises, sets, chapters };
}
