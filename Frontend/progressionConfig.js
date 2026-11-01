/* The two scores the whole progression path turns on, in one place so the chapter list, the Master Quiz that comes next
   and the grade estimate can never disagree. Plain numbers, no React: tune them here after real data. */

/* A chapter is Passed at this share (percent): the next chapter opens. */
export const PASS_PERCENT = 70;
/* A chapter is Mastered (Grade A) at this share (percent). Matches the "A" line of the grade estimate in App.jsx. */
export const MASTER_PERCENT = 85;
