/* The BAC II subject lists by track (subjects.js).
   Run with:  node --test Frontend/subjects.test.js */
import { test } from "node:test";
import assert from "node:assert/strict";
import { FIELD_SUBJECTS, FOREIGN_LANGUAGE, fieldSubjects, subjectLabel } from "./subjects.js";

test("the Science track sits seven papers, one of them a foreign language", () => {
  assert.equal(FIELD_SUBJECTS.science.length, 7);
  assert.ok(FIELD_SUBJECTS.science.includes(FOREIGN_LANGUAGE));
});

test("fieldSubjects fills the language slot with the student's choice", () => {
  assert.deepEqual(fieldSubjects("science", "French").slice(-1), ["French"]);
  assert.ok(!fieldSubjects("science", "French").includes("English"));
  // Profiles from before the choice existed, or with a value we don't know, sit English.
  assert.deepEqual(fieldSubjects("science", undefined).slice(-1), ["English"]);
  assert.deepEqual(fieldSubjects("science", "Spanish").slice(-1), ["English"]);
});

test("the Social Science track is unchanged", () => {
  assert.deepEqual(fieldSubjects("social_science", "French"), FIELD_SUBJECTS.social_science);
});

test("every Science subject has a Khmer label", () => {
  for (const s of [...FIELD_SUBJECTS.science, "English", "French"]) assert.notEqual(subjectLabel(s, "km"), s);
});

test("Practice is in Mathematics-only mode: Mathematics is open, every other subject is locked", async () => {
  const { isPracticeLocked, FIELD_SUBJECTS: all, FOREIGN_LANGUAGES: langs } = await import("./subjects.js");
  assert.equal(isPracticeLocked("Mathematics"), false);
  for (const s of [...new Set([...all.science, ...all.social_science, ...langs])].filter((s) => s !== "Mathematics")) {
    assert.equal(isPracticeLocked(s), true, s);
  }
});
