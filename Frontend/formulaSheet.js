/* The "Formula sheet" review panel: a compact, read-only list of every distinct formula taught in one chapter --
   not a quiz, no questions, nothing graded or saved. Built entirely from the `formula`/`formulaKm` field every
   exercise already carries (see src/data/chemistry/helpers.js's drill(), reused by Mathematics, Chemistry and
   every other chaptered subject), so no new content was authored to add this: the formulas were already there,
   one per question, waiting to be read without having to answer anything first.
   Pure functions, no React; the components are FormulaSheet.jsx. Tested in formulaSheet.test.js. */

/* Every distinct formula of one chapter, in the order each first appears in `list` (a subject's full localized
   exercise list, exactly as PracticeSubject already has it). A question with no `formula` contributes nothing; a
   formula already seen under an earlier question in the same chapter is not repeated, however many questions
   happen to share it. `topic`/`topicKm` travel with it (from whichever question introduced it) so the sheet can
   show what the formula is for, not just the formula itself. */
export function chapterFormulas(list, chapterKey) {
  const seen = new Set();
  const out = [];
  for (const ex of list) {
    if (ex.chapter !== chapterKey || !ex.formula || seen.has(ex.formula)) continue;
    seen.add(ex.formula);
    out.push({ formula: ex.formula, formulaKm: ex.formulaKm || ex.formula, topic: ex.topic, topicKm: ex.topicKm || ex.topic });
  }
  return out;
}
