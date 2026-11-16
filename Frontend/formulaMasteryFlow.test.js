/* Tests for Formula Mastery's staged-flow engine (Frontend/formulaMasteryFlow.js).
   Run with:  node --test Frontend/formulaMasteryFlow.test.js   (no dependencies — Node's built-in runner) */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  STAGES, pool, pickMasteryCheck, byKind, nextStage, kindComplete, readyForMasteryCheck,
  nextInKind, firstOpenInKind, introFor, remediationFor, remediationKinds,
} from "./formulaMasteryFlow.js";
import { nextInSet, firstOpen } from "./practiceFlow.js";
import { FORMULA_MASTERY_QUIZ_SIZE } from "./progressionConfig.js";

const ids = (list) => list.map((e) => e.id);
// A chapter's Formula Mastery pool: `n` kind-tagged questions spread round-robin across `topics`, every kind
// "recognition" (pickMasteryCheck doesn't care which kind, only that `.kind` is set and `.chapter` matches).
const fmChapterOf = (n, topics) => Array.from({ length: n }, (_, i) => ({ id: `FM-${i + 1}`, chapter: "FM", kind: "recognition", topic: topics[i % topics.length] }));

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

test("pool pulls out one chapter's kind-tagged questions and leaves everything else (other chapters, non-kind exercises) out", () => {
  const list = [
    ...FULL.map((e) => ({ ...e, chapter: "Quadratics" })),
    { id: "plain-1", chapter: "Quadratics", stage: 0 }, // a pre-existing formula-quiz item, no `kind` at all
    { id: "plain-2", chapter: "Quadratics", stage: 1 },
    { id: "other-chapter-1", chapter: "Angles", kind: "recognition" },
  ];
  const got = pool(list, "Quadratics");
  assert.deepEqual(got.map((e) => e.id), FULL.map((e) => e.id));
});

test("pool of a chapter with no Formula Mastery content is empty", () => {
  assert.deepEqual(pool([{ id: "plain-1", chapter: "Quadratics", stage: 0 }], "Quadratics"), []);
});

test("the default mastery-check draw is FORMULA_MASTERY_QUIZ_SIZE different questions, all from this chapter's pool", () => {
  const bank = fmChapterOf(30, ["t1", "t2", "t3"]);
  const picked = pickMasteryCheck(bank, "FM", "seed-1");
  assert.equal(picked.length, FORMULA_MASTERY_QUIZ_SIZE);
  assert.equal(new Set(ids(picked)).size, FORMULA_MASTERY_QUIZ_SIZE);
  assert.ok(picked.every((q) => q.chapter === "FM"));
});

test("a chapter with fewer questions than the check size gives every one of them (what the backend expects when count(formulaIds) <= quizSize), and an empty one gives none", () => {
  const picked = pickMasteryCheck(fmChapterOf(4, ["t"]), "FM", "s");
  assert.equal(picked.length, 4);
  assert.deepEqual(ids(picked).sort(), ["FM-1", "FM-2", "FM-3", "FM-4"]);
  assert.deepEqual(pickMasteryCheck(fmChapterOf(4, ["t"]), "NOPE", "s"), []);
});

test("the mastery-check draw excludes ordinary (non-kind-tagged) exercises, even from the same chapter", () => {
  // The mirror image of chapterProgress.test.js's "the quiz draw excludes Formula Mastery questions": here it
  // is the chapter's pre-existing formula-quiz/practice-problem exercises (no `kind`) that must never be drawn
  // into a mastery check, since the backend validates submitted answers strictly against chapter.formulaIds,
  // which only ever lists kind-tagged ids (ExerciseCatalog.php).
  const bank = [...fmChapterOf(8, ["t1", "t2"]), ...Array.from({ length: 20 }, (_, i) => ({ id: `FM-plain-${i + 1}`, chapter: "FM", topic: "t1" }))];
  for (let seed = 0; seed < 20; seed++) {
    const picked = pickMasteryCheck(bank, "FM", `seed-${seed}`);
    assert.ok(picked.every((q) => q.kind != null), `seed-${seed} drew an ordinary exercise into the mastery check`);
  }
  assert.equal(pickMasteryCheck(bank, "FM", "seed-0").length, 8, "only the 8 kind-tagged questions are there to draw from");
});

test("the same seed gives the same mastery check and a new seed gives a different one", () => {
  const bank = fmChapterOf(40, ["t1", "t2", "t3", "t4"]);
  assert.deepEqual(ids(pickMasteryCheck(bank, "FM", "a")), ids(pickMasteryCheck(bank, "FM", "a")));
  assert.notDeepEqual(ids(pickMasteryCheck(bank, "FM", "a")), ids(pickMasteryCheck(bank, "FM", "b")));
});

test("a mastery check is spread across the chapter's topics, not ten from one", () => {
  const bank = [...fmChapterOf(30, ["t1"]), ...fmChapterOf(30, ["t2"]).map((q) => ({ ...q, id: `${q.id}-b` })), ...fmChapterOf(30, ["t3"]).map((q) => ({ ...q, id: `${q.id}-c` }))];
  const topics = pickMasteryCheck(bank, "FM", "x").map((q) => q.topic);
  for (const t of ["t1", "t2", "t3"]) assert.ok(topics.filter((x) => x === t).length >= 3, `${t} appears at least three times in ten`);
});

test("pickMasteryCheck respects an explicit size override", () => {
  const picked = pickMasteryCheck(fmChapterOf(30, ["t1", "t2"]), "FM", "s", 5);
  assert.equal(picked.length, 5);
});

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
