/* Writes the exercise catalog the backend grades study events against (see Frontend/exerciseCatalog.js).
   Run after changing a question bank, then commit the result in bondus-backend:
     node scripts/export-exercise-catalog.mjs [output file]
   The output defaults to the sibling bondus-backend checkout. */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildCatalog } from "../Frontend/exerciseCatalog.js";
import { RAW_EXERCISES } from "../src/data/bacExercises.js";
import { UNI_QUIZ_BANK } from "../src/data/universityQuizBank.js";

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(process.argv[2] ?? resolve(here, "../../bondus-backend/resources/exercises/catalog.json"));

const catalog = buildCatalog(RAW_EXERCISES, UNI_QUIZ_BANK);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify(catalog)}\n`);

console.log(`${Object.keys(catalog.exercises).length} exercises, ${Object.keys(catalog.sets).length} sets -> ${out}`);
