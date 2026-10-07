/* Grade 12 Science-track Chemistry practice bank, one chapter-picker entry per lesson of the
   official Grade 12 chemistry textbook (1 kinetics → 6 organic chemistry). Frontend/App.jsx plugs
   this array in as RAW_EXERCISES.Chemistry.

   Exercise ids are positional (`Chemistry-${index + 1}`, see getExercises in Frontend/App.jsx) and
   students' saved progress is keyed on them, so the order below is load-bearing: everything above
   the "appended" marker is frozen, and new questions must only ever be added at the END of the
   array. Chapter order in the picker and the formula-quiz-first order inside a chapter do not
   depend on array position — they come from chapterOrder (chapters.js) and stage (drill()). */
import { CHAPTER_ORDER } from "./chemistry/chapters.js";
import { FOUNDATIONS } from "./chemistry/foundations.js";
import { RATE_1_1, RATE_1_2 } from "./chemistry/kinetics.js";
import { SOLUTIONS_2_1, FORCES_2_2 } from "./chemistry/solutions.js";
import { ACIDBASE_3_1, ACIDBASE_3_2 } from "./chemistry/acidBase.js";
import { PH_3_3, TITRATION_3_4 } from "./chemistry/acidBasePh.js";
import { EQUILIBRIUM_4_1, EQUILIBRIUM_4_2 } from "./chemistry/equilibrium.js";
import { EQUILIBRIA_4_3 } from "./chemistry/acidBaseEquilibria.js";
import { ESTERS_6_1 } from "./chemistry/esters.js";
import { NITROGEN_6_2 } from "./chemistry/nitrogen.js";
import { AROMATICS_6_3 } from "./chemistry/aromatics.js";
import { FORMULAS_FOUNDATIONS, FORMULAS_1_1, FORMULAS_1_2, FORMULAS_2_1, FORMULAS_2_2 } from "./chemistry/formulaBasics.js";
import { FORMULAS_3_1, FORMULAS_3_2, FORMULAS_3_3, FORMULAS_3_4 } from "./chemistry/formulaAcidBase.js";
import { FORMULAS_4_1, FORMULAS_4_2, FORMULAS_4_3 } from "./chemistry/formulaEquilibrium.js";
import { FORMULAS_6_1, FORMULAS_6_2, FORMULAS_6_3 } from "./chemistry/formulaOrganic.js";
import { GASES_5_1, GASES_5_2, GASES_5_3 } from "./chemistry/gases.js";
import { CARBS_6_4 } from "./chemistry/carbohydrates.js";

const BANK = [
  ...FOUNDATIONS,
  ...RATE_1_1, ...RATE_1_2,
  ...SOLUTIONS_2_1, ...FORCES_2_2,
  ...ACIDBASE_3_1, ...ACIDBASE_3_2, ...PH_3_3, ...TITRATION_3_4,
  ...EQUILIBRIUM_4_1, ...EQUILIBRIUM_4_2, ...EQUILIBRIA_4_3,
  ...ESTERS_6_1, ...NITROGEN_6_2, ...AROMATICS_6_3,
  // ── appended (positions 159 onward) ──────────────────────────────────────────────────────
  ...FORMULAS_FOUNDATIONS, ...FORMULAS_1_1, ...FORMULAS_1_2, ...FORMULAS_2_1, ...FORMULAS_2_2,
  ...FORMULAS_3_1, ...FORMULAS_3_2, ...FORMULAS_3_3, ...FORMULAS_3_4,
  ...FORMULAS_4_1, ...FORMULAS_4_2, ...FORMULAS_4_3,
  ...FORMULAS_6_1, ...FORMULAS_6_2, ...FORMULAS_6_3,
  ...GASES_5_1, ...GASES_5_2, ...GASES_5_3,
  ...CARBS_6_4,
];

export const CHEMISTRY_EXERCISES = BANK.map((e) => ({ ...e, chapterOrder: CHAPTER_ORDER[e.chapter] }));
