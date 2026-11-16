/* Tests for Formula Mastery's staged-flow engine (Frontend/formulaMasteryFlow.js).
   Run with:  node --test Frontend/formulaMasteryFlow.test.js   (no dependencies — Node's built-in runner) */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  STAGES, byKind, nextStage, kindComplete, readyForMasteryCheck,
  nextInKind, firstOpenInKind, introFor, remediationFor, remediationKinds,
} from "./formulaMasteryFlow.js";
import { nextInSet, firstOpen } from "./practiceFlow.js";

/* A minimal Formula Mastery question, just the fields this module touches. */
const q = (kind, n, extra = {}) => ({
  id: `fm-${kind}-${n}`, stage: 0, kind, topic: extra.topic ?? "Quadratic vertex formula",
  answer: "A", explanation: `why ${kind} ${n} is right`, explanationKm: `ហេតុអ្វី ${kind} ${n}`,
  ...extra,
});

const FULL = [
  q("recognition", 1), q("recognition", 2),
  q("application", 1), q("application", 2),
  q("missingVariable", 1),
  q("tricky", 1), q("tricky", 2),
];

test("byKind groups a chapter's questions by kind, in bank order, leaving out kinds with nothing", () => {
  const groups = byKind(FULL);
  assert.deepEqual(Object.keys(groups), ["recognition", "application", "missingVariable", "tricky"]);
  assert.deepEqual(groups.recognition.map((e) => e.id), ["fm-recognition-1", "fm-recognition-2"]);
  assert.equal(groups.missingVariable.length, 1);
});

test("byKind leaves a kind out entirely when the chapter has no questions of it", () => {
  const groups = byKind(FULL.filter((e) => e.kind !== "tricky"));
  assert.deepEqual(Object.keys(groups), ["recognition", "application", "missingVariable"]);
  assert.equal(groups.tricky, undefined);
});

test("byKind of an empty list is an empty groups object", () => {
  assert.deepEqual(byKind([]), {});
});

test("nextStage walks the full curriculum in order when every kind has content", () => {
  const groups = byKind(FULL);
  let stage = null; // "before intro"
  const path = [];
  for (let guard = 0; guard < 10; guard++) {
    stage = nextStage(stage, groups);
    if (stage == null) break;
    path.push(stage);
  }
  assert.deepEqual(path, ["intro", "recognition", "application", "missingVariable", "tricky", "masteryCheck"]);
});

test("nextStage skips a kind the chapter has no questions for", () => {
  const groups = byKind(FULL.filter((e) => e.kind !== "missingVariable"));
  assert.equal(nextStage("application", groups), "tricky", "missingVariable is skipped, not left empty");
});

test("nextStage can skip several kinds in a row", () => {
  const groups = byKind(FULL.filter((e) => e.kind === "recognition"));
  assert.equal(nextStage("recognition", groups), "masteryCheck");
});

test("nextStage skips intro itself when the chapter has no intro content", () => {
  assert.equal(nextStage(null, byKind(FULL), false), "recognition");
});

test("nextStage returns null once masteryCheck has been reached — there is nothing after it", () => {
  assert.equal(nextStage("masteryCheck", byKind(FULL)), null);
});

test("STAGES lists the six stages in curriculum order", () => {
  assert.deepEqual(STAGES, ["intro", "recognition", "application", "missingVariable", "tricky", "masteryCheck"]);
});

test("kindComplete is true only once every question of that kind is answered correctly", () => {
  const items = [q("recognition", 1), q("recognition", 2)];
  const doneIds = new Set();
  const isDone = (e) => doneIds.has(e.id);
  assert.equal(kindComplete(items, isDone), false);
  doneIds.add("fm-recognition-1");
  assert.equal(kindComplete(items, isDone), false);
  doneIds.add("fm-recognition-2");
  assert.equal(kindComplete(items, isDone), true);
});

test("kindComplete is false for an empty group, not vacuously true", () => {
  assert.equal(kindComplete([], () => true), false);
});

test("readyForMasteryCheck is true only once every present kind is complete", () => {
  const groups = byKind(FULL);
  const doneIds = new Set(FULL.map((e) => e.id));
  const isDone = (e) => doneIds.has(e.id);
  assert.equal(readyForMasteryCheck(groups, isDone), true);

  doneIds.delete("fm-tricky-2");
  assert.equal(readyForMasteryCheck(groups, isDone), false, "one unfinished kind blocks the mastery check");
});

test("a kind-filtered question list is itself a single practiceFlow set (no re-implementation needed)", () => {
  const recognition = byKind(FULL).recognition;
  // every item shares stage: 0, so setIndexes (used internally by nextInSet) treats them as one set —
  // the same forward/"missed comes round again" behaviour a real practiceFlow set already has.
  const doneIds = new Set();
  const isDone = (e) => doneIds.has(e.id);
  const first = nextInKind(recognition, isDone, 0); // Q1 just answered, wrongly
  assert.equal(first, 1, "goes forward to Q2 rather than re-asking Q1 immediately");
  doneIds.add(recognition[1].id); // Q2 answered correctly
  const back = nextInKind(recognition, isDone, 1);
  assert.equal(back, 0, "Q1 comes round again once the end of the set is reached");
});

test("nextInKind and firstOpenInKind are exactly practiceFlow's nextInSet and firstOpen (reused, not duplicated)", () => {
  assert.equal(nextInKind, nextInSet);
  assert.equal(firstOpenInKind, firstOpen);
});

test("introFor finds the chapter's intro matching a question's topic", () => {
  const intros = [
    { key: "vertex", topic: "Quadratic vertex formula", formula: "x = -b/2a" },
    { key: "angleSum", topic: "Angle sum formulas", formula: "sin(a+b) = ..." },
  ];
  assert.equal(introFor(q("recognition", 1, { topic: "Angle sum formulas" }), intros).key, "angleSum");
});

test("introFor returns null when the question's topic has no matching intro, or there is no intro content at all", () => {
  const intros = [{ key: "vertex", topic: "Quadratic vertex formula" }];
  assert.equal(introFor(q("tricky", 1, { topic: "Quadratic formula" }), intros), null, "e.g. the pilot's un-introduced topic");
  assert.equal(introFor(q("recognition", 1), undefined), null);
  assert.equal(introFor(q("recognition", 1), []), null);
});

const INTRO = {
  key: "vertex", topic: "Quadratic vertex formula",
  formula: "x = -b/2a", formulaKm: "x = -b/2a",
  whenToUse: "when you need the vertex", whenToUseKm: "នៅពេលត្រូវការកំពូល",
  variables: [{ symbol: "a, b", meaning: "the coefficients", meaningKm: "មេគុណ" }],
  worked: { prompt: "worked example", promptKm: "ឧទាហរណ៍", steps: ["step 1"], stepsKm: ["ជំហានទី ១"] },
};

test("remediationFor a missingVariable miss points at the intro's variable breakdown", () => {
  const r = remediationFor(q("missingVariable", 1), INTRO);
  assert.deepEqual(r, { type: "variables", variables: INTRO.variables });
});

test("remediationFor an application miss points at the intro's worked example", () => {
  const r = remediationFor(q("application", 1), INTRO);
  assert.deepEqual(r, { type: "worked", worked: INTRO.worked });
});

test("remediationFor a recognition miss points at the formula statement and when to use it", () => {
  const r = remediationFor(q("recognition", 1), INTRO);
  assert.deepEqual(r, { type: "formula", formula: INTRO.formula, formulaKm: INTRO.formulaKm, whenToUse: INTRO.whenToUse, whenToUseKm: INTRO.whenToUseKm });
});

test("remediationFor a tricky miss always uses the question's own explanation, even with an intro available", () => {
  const miss = q("tricky", 1);
  const r = remediationFor(miss, INTRO);
  assert.deepEqual(r, { type: "explanation", explanation: miss.explanation, explanationKm: miss.explanationKm });
});

test("remediationFor falls back to the question's own explanation when there is no matching intro", () => {
  const miss = q("recognition", 1);
  const r = remediationFor(miss, null);
  assert.deepEqual(r, { type: "explanation", explanation: miss.explanation, explanationKm: miss.explanationKm });
});

test("remediationKinds lists only the kinds actually missed, in curriculum order, deduplicated", () => {
  const missed = [q("tricky", 1), q("recognition", 1), q("recognition", 2)];
  assert.deepEqual(remediationKinds(missed), ["recognition", "tricky"]);
});

test("remediationKinds is empty when nothing was missed", () => {
  assert.deepEqual(remediationKinds([]), []);
});
