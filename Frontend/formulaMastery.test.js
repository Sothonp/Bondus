/* Formula Mastery content: schema completeness and the "no paper" guardrails on the FORMULA_MASTERY
   question bank and FORMULA_INTROS lesson content (src/data/mathematics/formulaMastery.js,
   formulaIntros.js). This checks shape and basic sanity, not mathematical correctness -- every answer
   was checked by hand when authored.
   Run with:  node --test Frontend/formulaMastery.test.js */
import { test } from "node:test";
import assert from "node:assert/strict";
import { FORMULA_MASTERY } from "../src/data/mathematics/formulaMastery.js";
import { FORMULA_INTROS } from "../src/data/mathematics/formulaIntros.js";

const KNOWN_KINDS = ["recognition", "application", "missingVariable", "tricky"];
// A loose guard against a "no paper" exercise quietly growing into a written-working problem: generous
// enough not to flag genuine short math notation, tight enough to catch an essay-length question.
const MAX_PROMPT_LEN = 220;
const MAX_OPTION_LEN = 60;

test("every Formula Mastery item is stage 0, chaptered, and tagged with a known kind", () => {
  assert.ok(FORMULA_MASTERY.length > 0, "expected at least one Formula Mastery question");
  for (const ex of FORMULA_MASTERY) {
    assert.equal(ex.stage, 0, `${ex.prompt} is not stage 0`);
    assert.ok(ex.chapter, `${ex.prompt} has no chapter`);
    assert.ok(KNOWN_KINDS.includes(ex.kind), `${ex.prompt} has an unrecognised kind: ${ex.kind}`);
  }
});

test("every item has the full bilingual shape every exercise in the bank carries", () => {
  for (const ex of FORMULA_MASTERY) {
    for (const field of ["topic", "topicKm", "difficulty", "prompt", "promptKm", "explanation", "explanationKm", "formula", "formulaKm"]) {
      assert.ok(typeof ex[field] === "string" && ex[field].trim() !== "", `${ex.prompt} is missing ${field}`);
    }
    assert.ok(Array.isArray(ex.options) && ex.options.length >= 2, `${ex.prompt} needs at least 2 options`);
    assert.ok(ex.options.includes(ex.answer), `${ex.prompt}'s answer "${ex.answer}" is not one of its own options`);
    assert.equal(new Set(ex.options).size, ex.options.length, `${ex.prompt} has a duplicate option`);
  }
});

test("no-paper guardrail: prompts and options stay short enough to read and answer mentally", () => {
  for (const ex of FORMULA_MASTERY) {
    assert.ok(ex.prompt.length <= MAX_PROMPT_LEN, `${ex.prompt} is too long for a no-paper question (${ex.prompt.length} chars)`);
    for (const opt of ex.options) {
      assert.ok(opt.length <= MAX_OPTION_LEN, `an option of "${ex.prompt}" is too long for mental comparison: "${opt}"`);
    }
  }
});

test("a tricky-kind question with unneeded information says so in its own explanation", () => {
  // Spot-checks the specific authored item that leans on this pattern, rather than asserting it of
  // every tricky question (not all tricky items use extra-information distractors).
  const unneeded = FORMULA_MASTERY.find((ex) => ex.kind === "tricky" && /\(5, 10\)/.test(ex.prompt));
  assert.ok(unneeded, "expected the vertex 'unnecessary point' tricky question to still be present");
  assert.match(unneeded.explanation, /not needed/i);
});

test("FORMULA_INTROS: every formula has a when-to-use note, at least one variable explained, and a worked example in both languages", () => {
  const chapters = Object.keys(FORMULA_INTROS);
  assert.ok(chapters.length > 0, "expected at least one chapter of intro content");
  for (const chapter of chapters) {
    for (const intro of FORMULA_INTROS[chapter]) {
      for (const field of ["key", "topic", "topicKm", "formula", "formulaKm", "whenToUse", "whenToUseKm"]) {
        assert.ok(typeof intro[field] === "string" && intro[field].trim() !== "", `${chapter}/${intro.key} is missing ${field}`);
      }
      assert.ok(Array.isArray(intro.variables) && intro.variables.length > 0, `${chapter}/${intro.key} explains no variables`);
      for (const v of intro.variables) {
        assert.ok(v.symbol && v.meaning && v.meaningKm, `${chapter}/${intro.key} has an incompletely explained variable`);
      }
      assert.ok(intro.worked?.prompt && intro.worked?.promptKm, `${chapter}/${intro.key} is missing its worked example's prompt`);
      assert.ok(Array.isArray(intro.worked.steps) && intro.worked.steps.length > 0, `${chapter}/${intro.key} has no worked-example steps`);
      assert.equal(intro.worked.steps.length, intro.worked.stepsKm?.length, `${chapter}/${intro.key}'s EN/KM worked steps are out of sync`);
    }
  }
});

test("every chapter in FORMULA_MASTERY that has questions also has at least one intro formula", () => {
  // Not every chapter needs Formula Mastery content yet (the pilot is intentionally narrow), but a
  // chapter that DOES have questions should never be missing its Stage-1 introduction.
  const chaptersWithQuestions = new Set(FORMULA_MASTERY.map((ex) => ex.chapter));
  for (const chapter of chaptersWithQuestions) {
    assert.ok(FORMULA_INTROS[chapter]?.length > 0, `${chapter} has Formula Mastery questions but no intro content`);
  }
});
