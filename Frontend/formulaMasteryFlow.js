/* Formula Mastery's own staged-flow engine -- a separate learning system from the existing stage-0/
   stage-1 quiz/practice sets that practiceFlow.js drives (see formulaMastery.js's header for why the
   two are kept apart). Same spirit as practiceFlow.js though: pure functions, no React, so the rules
   can be tested on their own (formulaMasteryFlow.test.js).

   A chapter's Formula Mastery curriculum is six stages, always in this order:
     intro -> recognition -> application -> missingVariable -> tricky -> masteryCheck
   "intro" is lesson content (FORMULA_INTROS) -- it has no questions and no "done" notion here, the UI
   just marks it read and moves on. "masteryCheck" is graded by the backend
   (POST /formula-mastery-quizzes, see FormulaMasteryController.php) -- this module only decides when a
   student is ready to attempt it. The four stages in between are this module's main concern: each is
   every one of the chapter's questions of that `kind` (see formulaMastery.js), worked through with the
   exact same "forward, a miss comes round again, done once every question is right" rule a practiceFlow
   set already follows -- reused directly below rather than re-implemented, since a kind-filtered list
   (every item sharing stage: 0) is itself already a single practiceFlow "set". */
import { nextInSet, firstOpen } from "./practiceFlow.js";

export const STAGES = ["intro", "recognition", "application", "missingVariable", "tricky", "masteryCheck"];

const KINDS = ["recognition", "application", "missingVariable", "tricky"];

/* Every Formula Mastery question for one chapter (FORMULA_MASTERY filtered to that chapter already),
   grouped by kind, each group kept in bank order. A kind the chapter has no questions for is left out
   entirely -- same "nothing to show" rule the rest of Formula Mastery follows (see
   exerciseCatalog.js / FormulaMasteryController.php's own version of it). */
export const byKind = (chapterQuestions) => {
  const groups = {};
  for (const kind of KINDS) {
    const items = chapterQuestions.filter((e) => e.kind === kind);
    if (items.length) groups[kind] = items;
  }
  return groups;
};

/* A kind-filtered list is a single practiceFlow "set" (see this file's header), so its own nextInSet/
   firstOpen already give the right within-stage navigation. Re-exported under Formula Mastery's own
   names so callers never need to know they are the same function. */
export { nextInSet as nextInKind, firstOpen as firstOpenInKind };

/* Whether every question of one kind has been answered correctly -- a stage is complete once this is
   true for its own group. */
export const kindComplete = (items, isDone) => items.length > 0 && items.every(isDone);

/* The stage after `stage`, skipping any of the four question-kind stages the chapter has no questions
   for (and skipping "intro" itself when the chapter has no intro content at all -- a defensive case;
   shipped content always has at least one, see formulaMastery.test.js). Returns null once masteryCheck
   itself has been reached -- there is nothing after it. */
export const nextStage = (stage, groups, hasIntro = true) => {
  for (let i = STAGES.indexOf(stage) + 1; i < STAGES.length; i++) {
    const s = STAGES[i];
    if (s === "intro" && !hasIntro) continue;
    if (s === "masteryCheck" || s === "intro" || groups[s]?.length) return s;
  }
  return null;
};

/* Whether the student has cleared every question-kind stage the chapter has, i.e. is ready to attempt
   the masteryCheck. */
export const readyForMasteryCheck = (groups, isDone) => Object.values(groups).every((items) => kindComplete(items, isDone));

/* The FORMULA_INTROS entry for one question's chapter+topic, or null when this pilot's content has no
   dedicated intro for that specific topic yet (a known, accepted gap -- see formulaIntros.js's header;
   not every chapter's formula gets its own intro in this first pass, only every CHAPTER is guaranteed
   at least one). `chapterIntros` is FORMULA_INTROS[question.chapter]. */
export const introFor = (question, chapterIntros) => (chapterIntros ?? []).find((intro) => intro.topic === question.topic) ?? null;

/* Adaptive remediation: what to show right after a miss, based on which kind of question it was --
   the "specific mistake type" the student actually got wrong, not a generic "try again".
     - tricky: the question's OWN explanation is the best remediation (a tricky question is about
       spotting one specific trap, not a general gap in formula knowledge, so pointing back at the whole
       intro would not address what was actually missed).
     - missingVariable: the intro's variable breakdown (the mistake is in not knowing what a symbol is).
     - application: the intro's worked example (the mistake is in not knowing how to use the formula on
       numbers, even though the formula itself was recognised).
     - recognition: the formula statement itself, plus when to use it.
   Falls back to the question's own explanation whenever there is no matching intro at all (introFor
   returned null), so a miss is never left without any remediation content. */
export const remediationFor = (missedQuestion, intro) => {
  if (intro && missedQuestion.kind === "missingVariable") return { type: "variables", variables: intro.variables };
  if (intro && missedQuestion.kind === "application") return { type: "worked", worked: intro.worked };
  if (intro && missedQuestion.kind === "recognition") {
    return { type: "formula", formula: intro.formula, formulaKm: intro.formulaKm, whenToUse: intro.whenToUse, whenToUseKm: intro.whenToUseKm };
  }
  return { type: "explanation", explanation: missedQuestion.explanation, explanationKm: missedQuestion.explanationKm };
};

/* After a mastery-check attempt: the specific kinds that need more work, in curriculum order, given the
   questions from that attempt the student got wrong. Grading itself is not this module's concern -- the
   caller already knows how an MCQ exercise is checked (the same way it already does for every other
   exercise type in the app) and the backend's POST /formula-mastery-quizzes response is an aggregate
   score only, the same shape the Master Quiz's own result already is. An empty result means nothing
   needs remediation (every kind the attempt covered was answered correctly). */
export const remediationKinds = (missedQuestions) => {
  const missed = new Set(missedQuestions.map((q) => q.kind));
  return KINDS.filter((k) => missed.has(k));
};
