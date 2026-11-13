/* The exercise catalog the backend grades against (docs/API.md in bondus-backend, POST /study-events).
   Run with:  node --test Frontend/exerciseCatalog.test.js */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildCatalog, exerciseId, uniExerciseId } from "./exerciseCatalog.js";
import { RAW_EXERCISES } from "../src/data/bacExercises.js";
import { UNI_QUIZ_BANK } from "../src/data/universityQuizBank.js";

const app = readFileSync(new URL("./App.jsx", import.meta.url), "utf8");

test("ids follow the scheme the app has always used", () => {
  assert.equal(exerciseId("Earth Science", 0), "Earth Science-1");
  assert.equal(exerciseId("Physics", 11), "Physics-12");
  assert.equal(uniExerciseId("computer_science::JavaScript Fundamentals", 2), "uni:computer_science::JavaScript Fundamentals:3");
});

test("App.jsx builds its exercise ids with the same helpers", () => {
  assert.match(app, /id: exerciseId\(subject, i\)/);
  assert.match(app, /id: uniExerciseId\(subjectKey, i\)/);
});

const BANK = {
  Demo: [
    { topic: "A", options: ["x", "y"], answer: "x", answerKm: "ក" },
    { topic: "A", options: ["x", "y"], answer: "Y" },
  ],
};

test("every exercise lists the answers the app accepts, English first, then Khmer when it differs", () => {
  const { exercises } = buildCatalog(BANK, {});
  assert.deepEqual(exercises["Demo-1"], ["x", "ក"]);
  assert.deepEqual(exercises["Demo-2"], ["Y"]);
});

test("a subject without chapters is one set, keyed by its first exercise", () => {
  const { sets } = buildCatalog(BANK, {});
  assert.deepEqual(sets, { "Demo-1": ["Demo-1", "Demo-2"] });
});

test("chapters are separate sets, and a staged chapter splits into its formula quiz and its problems", () => {
  const bank = {
    Chem: [
      { chapter: "One", stage: 1, options: ["a"], answer: "a" },
      { chapter: "Two", options: ["a"], answer: "a" },
      { chapter: "One", stage: 0, options: ["a"], answer: "a" },
      { chapter: "One", stage: 1, options: ["a"], answer: "a" },
    ],
  };
  const { sets } = buildCatalog(bank, {});
  // In the app a chapter's list is sorted formula quiz (stage 0) first; the set key is the first question of the set on screen.
  assert.deepEqual(sets, { "Chem-3": ["Chem-3"], "Chem-1": ["Chem-1", "Chem-4"], "Chem-2": ["Chem-2"] });
});

test("exercises outside every chapter of a chaptered subject are not in any set (the app never shows them in one)", () => {
  const bank = { S: [{ chapter: "One", options: ["a"], answer: "a" }, { options: ["a"], answer: "a" }] };
  assert.deepEqual(buildCatalog(bank, {}).sets, { "S-1": ["S-1"] });
});

test("a university course is one set keyed uni:<course>:1", () => {
  const uni = { "cs::Intro": [{ options: ["a"], answer: "a" }, { options: ["a"], answer: "b" }] };
  const { exercises, sets } = buildCatalog({}, uni);
  assert.deepEqual(Object.keys(exercises), ["uni:cs::Intro:1", "uni:cs::Intro:2"]);
  assert.deepEqual(sets, { "uni:cs::Intro:1": ["uni:cs::Intro:1", "uni:cs::Intro:2"] });
});

test("the real bank: every exercise is graded, and no exercise is in two sets", () => {
  const { exercises, sets } = buildCatalog(RAW_EXERCISES, UNI_QUIZ_BANK);
  const total = Object.values(RAW_EXERCISES).flat().length + Object.values(UNI_QUIZ_BANK).flat().length;
  assert.equal(Object.keys(exercises).length, total);
  for (const answers of Object.values(exercises)) {
    assert.ok(Array.isArray(answers) && answers.length >= 1 && answers.every((a) => typeof a === "string" && a.trim() !== ""));
  }
  const seen = new Map();
  for (const [key, members] of Object.entries(sets)) {
    assert.equal(members[0], key, "the set key is its first question");
    for (const id of members) {
      assert.ok(exercises[id], `${id} is in a set but has no answer`);
      assert.ok(!seen.has(id), `${id} is in two sets`);
      seen.set(id, key);
    }
  }
  // The student-facing example from the security report.
  assert.deepEqual(sets["Earth Science-1"], ["Earth Science-1", "Earth Science-2"]);
  assert.ok(exercises["Earth Science-2"].includes("tectonic plate movement"));
});

test("the catalog lists each chapter path in the order the app shows, with the ids of its questions", () => {
  const bank = {
    Demo: [
      { topic: "A", options: ["x", "y"], answer: "x", chapter: "Two", chapterOrder: 2 },
      { topic: "A", options: ["x", "y"], answer: "x", chapter: "One", chapterOrder: 1 },
      { topic: "B", options: ["x", "y"], answer: "x", chapter: "Two", chapterOrder: 2 },
    ],
    Flat: [{ topic: "A", options: ["x", "y"], answer: "x" }],
  };
  const { chapters } = buildCatalog(bank, { "m::c": [{ topic: "T", options: ["x", "y"], answer: "x", chapter: "U" }] });
  assert.deepEqual(chapters, {
    Demo: [
      { key: "One", ids: ["Demo-2"], formulaIds: [] },
      { key: "Two", ids: ["Demo-1", "Demo-3"], formulaIds: [] },
    ],
  });
});

test("a kind-tagged item lands in formulaIds and NOT in ids -- adding Formula Mastery content must never change a chapter's Master-Quiz pool", () => {
  const bank = {
    Demo: [
      { topic: "A", options: ["x", "y"], answer: "x", chapter: "One", stage: 0, kind: "recognition" },
      { topic: "A", options: ["x", "y"], answer: "x", chapter: "One", stage: 0 }, // untagged formula-quiz item (e.g. formulaDrills.js)
      { topic: "A", options: ["x", "y"], answer: "x", chapter: "One", stage: 1 }, // a practice problem
      { topic: "A", options: ["x", "y"], answer: "x", chapter: "One", stage: 0, kind: "tricky" },
    ],
  };
  const { chapters } = buildCatalog(bank, {});
  assert.deepEqual(chapters.Demo, [
    { key: "One", ids: ["Demo-2", "Demo-3"], formulaIds: ["Demo-1", "Demo-4"] },
  ]);
});

test("a kind-tagged item never joins an existing stage-based set -- it cannot grow a treasure box someone has not claimed yet", () => {
  const bank = {
    Demo: [
      { topic: "A", options: ["x", "y"], answer: "x", chapter: "One", stage: 0 },
      { topic: "A", options: ["x", "y"], answer: "x", chapter: "One", stage: 0 },
      { topic: "A", options: ["x", "y"], answer: "x", chapter: "One", stage: 0, kind: "recognition" },
    ],
  };
  const { sets } = buildCatalog(bank, {});
  assert.deepEqual(sets, { "Demo-1": ["Demo-1", "Demo-2"] }); // Demo-3 (kind-tagged) is in neither this set nor any set of its own
});

test("adding a Formula Mastery question to an existing chapter leaves that chapter's Master-Quiz ids byte-identical", () => {
  const before = { Demo: [{ topic: "A", options: ["x", "y"], answer: "x", chapter: "One", stage: 1 }] };
  const after = { Demo: [...before.Demo, { topic: "A", options: ["x", "y"], answer: "x", chapter: "One", stage: 0, kind: "recognition" }] };
  const beforeIds = buildCatalog(before, {}).chapters.Demo.find((c) => c.key === "One").ids;
  const afterIds = buildCatalog(after, {}).chapters.Demo.find((c) => c.key === "One").ids;
  assert.deepEqual(afterIds, beforeIds, "the chapter's Master-Quiz pool (and its size, which the legacy pass/master check divides by) must not change");
});

test("the real Mathematics bank: every formulaIds entry is a stage-0 question with a known `kind`", () => {
  const { chapters } = buildCatalog(RAW_EXERCISES, UNI_QUIZ_BANK);
  const byId = {};
  for (const raw of RAW_EXERCISES.Mathematics) byId[raw.chapter] = byId[raw.chapter] || [];
  const list = RAW_EXERCISES.Mathematics.map((raw, i) => ({ ...raw, id: `Mathematics-${i + 1}` }));
  const known = new Set(["recognition", "application", "missingVariable", "tricky"]);
  let sawAny = false;
  for (const row of chapters.Mathematics) {
    for (const id of row.formulaIds) {
      sawAny = true;
      const ex = list.find((e) => e.id === id);
      assert.ok(ex, `${id} is in formulaIds but not in the bank`);
      assert.equal(ex.stage, 0, `${id} is in formulaIds but is not stage 0`);
      assert.ok(known.has(ex.kind), `${id} has an unrecognised kind: ${ex.kind}`);
    }
  }
  assert.ok(sawAny, "expected at least one Formula Mastery question in the real bank");
});

test("in the real bank, five subjects have a chapter path and every chapter question is a known exercise", () => {
  const { exercises, chapters } = buildCatalog(RAW_EXERCISES, UNI_QUIZ_BANK);
  assert.deepEqual(Object.keys(chapters).sort(), ["Biology", "Chemistry", "History", "Mathematics", "Physics"]);
  for (const [subject, path] of Object.entries(chapters)) {
    // ids (the Master Quiz pool) and formulaIds (Formula Mastery) are deliberately disjoint -- together
    // they must still account for every chaptered question exactly once, with nothing counted twice.
    const ids = path.flatMap((c) => c.ids);
    const formulaIds = path.flatMap((c) => c.formulaIds);
    const all = [...ids, ...formulaIds];
    assert.equal(new Set(ids).intersection(new Set(formulaIds)).size, 0, `${subject}: an id is in both ids and formulaIds`);
    assert.equal(new Set(all).size, all.length, `${subject}: a question is in two chapters`);
    assert.equal(all.length, RAW_EXERCISES[subject].length, `${subject}: every question belongs to a chapter (ids + formulaIds together)`);
    for (const id of all) assert.ok(exercises[id], `${id} is not in the catalog`);
  }
});
