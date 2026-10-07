/* Grade 12 Mathematics lesson bank (science track), one chapter-picker entry per lesson of the two
   MoEYS Grade 12 mathematics booklets — induction and sequences, limits, derivatives and primitives,
   definite integrals, function study, exponential and logarithmic functions, complex numbers, conics,
   differential equations, probability and vectors in space. Each lesson has a short formula quiz
   (stage 0, listed first) followed by worked practice problems, every one with an English and a Khmer
   explanation plus the key formula, exactly like the Chemistry bank (src/data/chemistryExercises.js).

   Frontend/App.jsx builds RAW_EXERCISES.Mathematics as:
     [the 8 original starter questions, given the "Mathematics Foundations" chapter] ++ MATHEMATICS_EXERCISES
   Exercise ids are positional (`Mathematics-${index + 1}`, see getExercises in Frontend/App.jsx) and
   students' saved progress is keyed on them, so the 8 starters keep positions 1–8 and the order below
   is load-bearing: new questions must only ever be added at the END of BANK. Chapter order in the
   picker and the formula-quiz-first order inside a chapter do not depend on array position — they come
   from chapterOrder (chapters.js) and stage (drill()). */
import { CHAPTER_ORDER, chapterOf } from "./mathematics/chapters.js";
import { INDUCTION_1_1 } from "./mathematics/induction.js";
import { SEQUENCES_1_2 } from "./mathematics/sequences.js";
import { LIMITS_1_3 } from "./mathematics/limits.js";
import { DERIVATIVES_2_1 } from "./mathematics/derivatives.js";
import { PRIMITIVES_2_2 } from "./mathematics/primitives.js";
import { INTEGRALS_3_1 } from "./mathematics/integrals.js";
import { STUDY_4_1 } from "./mathematics/functionStudy.js";
import { EXP_4_2 } from "./mathematics/exponential.js";
import { LOG_4_3 } from "./mathematics/logarithm.js";
import { COMPLEX_5_1 } from "./mathematics/complexAlgebra.js";
import { COMPLEX_5_2 } from "./mathematics/complexTrig.js";
import { CONICS_6_1 } from "./mathematics/conics.js";
import { DIFFEQ_7_1 } from "./mathematics/diffEq.js";
import { PROB_8_1 } from "./mathematics/probability.js";
import { VECTORS_9_1 } from "./mathematics/vectors.js";

const BANK = [
  ...INDUCTION_1_1, ...SEQUENCES_1_2, ...LIMITS_1_3,
  ...DERIVATIVES_2_1, ...PRIMITIVES_2_2, ...INTEGRALS_3_1,
  ...STUDY_4_1, ...EXP_4_2, ...LOG_4_3,
  ...COMPLEX_5_1, ...COMPLEX_5_2,
  ...CONICS_6_1, ...DIFFEQ_7_1, ...PROB_8_1, ...VECTORS_9_1,
];

export const MATHEMATICS_EXERCISES = BANK.map((e) => ({ ...e, chapterOrder: CHAPTER_ORDER[e.chapter] }));

/* The 8 starter questions predate the lesson bank and carry no chapter. As soon as any question of a
   subject has a chapter, PracticeSubject groups the whole subject by chapter, so a chapter-less starter
   would show up as a broken, unnamed card — give each of them the "Mathematics Foundations" chapter
   (order 0, so it sorts first). Only adds fields; their positions and ids are untouched. */
const [FOUNDATIONS_EN, FOUNDATIONS_KM] = chapterOf("Mathematics Foundations");
export const withFoundationsChapter = (e) => ({ ...e, chapter: FOUNDATIONS_EN, chapterKm: FOUNDATIONS_KM, chapterOrder: CHAPTER_ORDER[FOUNDATIONS_EN] });
