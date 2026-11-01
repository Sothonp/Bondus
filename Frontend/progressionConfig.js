/* The scores the whole progression path turns on, in one place so the chapter list, the Master Quiz, the lock on full past
   papers and the grade estimate can never disagree. Plain numbers, no React: tune them here after real data.
   The server keeps its own copy (config/bondus.php in the backend, `chapters`); tests/Fixtures/chapter-path-cases.json is
   run by both repos, so a number changed on one side and not the other fails a test. */

/* A chapter is Passed at this share (percent) of its Master Quiz: the next chapter opens. The same share of a chapter's
   questions solved in Practice is what unlocks the quiz. */
export const PASS_PERCENT = 70;
/* A chapter is Mastered (Grade A) at this share (percent). Matches the "A" line of the grade estimate in App.jsx. */
export const MASTER_PERCENT = 85;
/* A Master Quiz is this many different questions of the chapter (all of them when the chapter has fewer). */
export const QUIZ_SIZE = 10;
/* "Test out" (taking the quiz before 70% is solved) is offered when the topics the student has been scored on cover at
   least this share (percent) of the chapter's topics and average the Mastered score or better. */
export const TEST_OUT_COVERAGE_PERCENT = 50;
