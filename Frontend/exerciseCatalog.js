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

/* { exercises: { id: [accepted answers] }, sets: { setKey: [exercise ids] }, chapters: { subject: [{ key, ids }] } } for the
   BAC II bank and the university quiz bank (whose courses are keyed "{major}::{course title}").
   `chapters` is the path the server enforces: for each BAC II subject that has chapters, its chapters in curriculum order
   (chapterKeys, the same order the app shows) with the ids of their questions. Subjects without chapters are not listed. */
export function buildCatalog(bank, uniBank) {
  const exercises = {};
  const sets = {};
  const chapters = {};
  const add = (list, idOf, subject = null) => {
    const items = list.map((raw, i) => {
      const id = idOf(i);
      exercises[id] = answersOf(raw);
      return { id, chapter: raw.chapter, chapterOrder: raw.chapterOrder, stage: raw.stage };
    });
    Object.assign(sets, setsOf(items));
    const keys = subject ? chapterKeys(items) : [];
    if (keys.length) chapters[subject] = keys.map((key) => ({ key, ids: items.filter((e) => e.chapter === key).map((e) => e.id) }));
  };
  for (const [subject, list] of Object.entries(bank)) add(list, (i) => exerciseId(subject, i), subject);
  for (const [course, list] of Object.entries(uniBank)) add(list, (i) => uniExerciseId(course, i));
  return { exercises, sets, chapters };
}
