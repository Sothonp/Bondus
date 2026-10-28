/* Where a student was in a practice set, remembered across leaving Practice (Frontend/practiceResume.js).
   Run with:  node --test Frontend/practiceResume.test.js */
import { test } from "node:test";
import assert from "node:assert/strict";
import { practiceMemory } from "./practiceResume.js";

const fakeStorage = () => {
  const data = new Map();
  return { getItem: (k) => (data.has(k) ? data.get(k) : null), setItem: (k, v) => data.set(k, String(v)), removeItem: (k) => data.delete(k), data };
};
const ex = { id: "Chemistry-12", subject: "Chemistry", chapter: "Acids", prompt: "ignored" };

test("nothing is remembered until a question has been shown", () => {
  assert.equal(practiceMemory(fakeStorage(), "bac", 7).get(), null);
});

test("it remembers the question, its subject and its chapter", () => {
  const memory = practiceMemory(fakeStorage(), "bac", 7);
  memory.remember(ex);
  assert.deepEqual(memory.get(), { subject: "Chemistry", chapter: "Acids", exId: "Chemistry-12" });
});

test("a subject without chapters is remembered with chapter null", () => {
  const memory = practiceMemory(fakeStorage(), "bac", 7);
  memory.remember({ id: "Earth Science-2", subject: "Earth Science" });
  assert.deepEqual(memory.get(), { subject: "Earth Science", chapter: null, exId: "Earth Science-2" });
});

test("forgetting (leaving the question on purpose, or finishing the set) clears it", () => {
  const memory = practiceMemory(fakeStorage(), "bac", 7);
  memory.remember(ex);
  memory.forget();
  assert.equal(memory.get(), null);
});

test("it is kept per student and per track, never shared", () => {
  const storage = fakeStorage();
  practiceMemory(storage, "bac", 1).remember(ex);
  assert.equal(practiceMemory(storage, "bac", 2).get(), null);
  assert.equal(practiceMemory(storage, "uni", 1).get(), null);
  assert.equal(practiceMemory(storage, "bac", 1).get()?.exId, "Chemistry-12");
});

test("a browser-only session (no user id yet) still works", () => {
  const storage = fakeStorage();
  const memory = practiceMemory(storage, "bac", undefined);
  memory.remember(ex);
  assert.equal(practiceMemory(storage, "bac", undefined).get()?.exId, "Chemistry-12");
});

test("unreadable or hostile storage never breaks practice", () => {
  const broken = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("full"); }, removeItem() { throw new Error("blocked"); } };
  const memory = practiceMemory(broken, "bac", 1);
  assert.doesNotThrow(() => { memory.remember(ex); memory.forget(); });
  assert.equal(memory.get(), null);
  assert.equal(practiceMemory(null, "bac", 1).get(), null);

  const storage = fakeStorage();
  const key = [...(practiceMemory(storage, "bac", 1).remember(ex), storage.data.keys())][0];
  for (const junk of ["not json", "42", "null", '{"exId":7}', '{"subject":"x"}', "[]"]) {
    storage.data.set(key, junk);
    assert.equal(practiceMemory(storage, "bac", 1).get(), null, `ignored: ${junk}`);
  }
});
