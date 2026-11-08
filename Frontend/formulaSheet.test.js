/* The "Formula sheet" review panel's pure logic: which formulas a chapter has, in what order. The drill mode's
   own pool and queue rules live in formulaDrill.js / formulaDrill.test.js; this is the simpler, read-only sibling.
   Run with:  node --test Frontend/formulaSheet.test.js */
import { test } from "node:test";
import assert from "node:assert/strict";
import { chapterFormulas } from "./formulaSheet.js";

const q = (chapter, formula, formulaKm, topic = "Topic", topicKm = "ប្រធានបទ") => ({ chapter, formula, formulaKm, topic, topicKm });

test("chapterFormulas keeps only that chapter's questions that carry a formula", () => {
  const list = [
    q("A", "F1", "F1km"),
    q("A", undefined, undefined), // no formula — a plain practice question, contributes nothing
    q("B", "G1", "G1km"),
  ];
  assert.deepEqual(chapterFormulas(list, "A").map((f) => f.formula), ["F1"]);
  assert.deepEqual(chapterFormulas(list, "B").map((f) => f.formula), ["G1"]);
  assert.deepEqual(chapterFormulas(list, "nope"), []);
});

test("the same formula repeated across several questions appears once, in its first order of appearance", () => {
  const list = [q("A", "F1", "F1km"), q("A", "F2", "F2km"), q("A", "F1", "F1km"), q("A", "F3", "F3km"), q("A", "F2", "F2km")];
  assert.deepEqual(chapterFormulas(list, "A").map((f) => f.formula), ["F1", "F2", "F3"]);
});

test("a question missing its Khmer twin falls back to the English formula, same as the app does for answers elsewhere", () => {
  const list = [{ chapter: "A", formula: "F1", formulaKm: undefined, topic: "T", topicKm: undefined }];
  const [f] = chapterFormulas(list, "A");
  assert.equal(f.formulaKm, "F1");
  assert.equal(f.topicKm, "T");
});

test("every entry carries the topic of the question that introduced it", () => {
  const list = [q("A", "F1", "F1km", "Induction", "វិចារអនុមានរួម")];
  const [f] = chapterFormulas(list, "A");
  assert.equal(f.topic, "Induction");
  assert.equal(f.topicKm, "វិចារអនុមានរួម");
});
