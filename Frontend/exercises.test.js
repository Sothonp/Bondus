/* Tests for the pure exercise helpers (Frontend/exercises.js).
   Run with:  node --test Frontend/exercises.test.js */
import { test } from "node:test";
import assert from "node:assert/strict";
import { EXERCISE_SUBJECTS, MAX_EXERCISE_ATTACHMENTS, canBrowseExercises, isAdmin, filesOf, fileCounts } from "./exercises.js";
import { FIELD_SUBJECTS, subjectId } from "./subjects.js";

test("the four subjects are the science track's first four, in the order the app lists them", () => {
  assert.deepEqual(EXERCISE_SUBJECTS, ["Mathematics", "Physics", "Chemistry", "Biology"]);
  assert.deepEqual(EXERCISE_SUBJECTS, FIELD_SUBJECTS.science.slice(0, 4));
});

test("their ids are the ones the backend files exercises under", () => {
  assert.deepEqual(EXERCISE_SUBJECTS.map(subjectId), ["mathematics", "physics", "chemistry", "biology"]);
});

test("the attachment cap matches the backend's config/bondus.php exercises.max_attachments", () => {
  assert.equal(MAX_EXERCISE_ATTACHMENTS, 5);
});

test("only science students browse exercises for now", () => {
  assert.equal(canBrowseExercises({ field: "science", educationLevel: "highschool" }), true);
  assert.equal(canBrowseExercises({ field: "social_science", educationLevel: "highschool" }), false);
  assert.equal(canBrowseExercises({ educationLevel: "university" }), false);
  assert.equal(canBrowseExercises(null), false);
  assert.equal(canBrowseExercises(undefined), false);
});

test("an admin is whoever the server says has the admin role", () => {
  assert.equal(isAdmin({ role: "admin" }), true);
  assert.equal(isAdmin({ role: "student" }), false);
  assert.equal(isAdmin({ role: "teacher" }), false);
  assert.equal(isAdmin({}), false);
  assert.equal(isAdmin(null), false);
});

const pdf = { id: 1, name: "sheet.pdf", mimeType: "application/pdf", url: "https://files.test/1.pdf" };
const photo = (id) => ({ id, name: `p${id}.jpg`, mimeType: "image/jpeg", url: `https://files.test/${id}.jpg` });

test("filesOf tells a PDF from a photo and keeps the server's order", () => {
  assert.deepEqual(filesOf({ attachments: [photo(2), pdf, photo(3)] }).map((f) => [f.id, f.kind]), [[2, "image"], [1, "pdf"], [3, "image"]]);
  assert.deepEqual(filesOf({ attachments: [pdf] })[0], { id: 1, name: "sheet.pdf", url: "https://files.test/1.pdf", kind: "pdf" });
});

test("filesOf copes with an exercise that has no files yet", () => {
  assert.deepEqual(filesOf({ attachments: [] }), []);
  assert.deepEqual(filesOf({}), []);
  assert.deepEqual(filesOf(null), []);
});

test("fileCounts says how many PDFs and photos an exercise has", () => {
  assert.deepEqual(fileCounts({ attachments: [photo(2), pdf, photo(3)] }), { pdfs: 1, images: 2 });
  assert.deepEqual(fileCounts({ attachments: [] }), { pdfs: 0, images: 0 });
  assert.deepEqual(fileCounts(null), { pdfs: 0, images: 0 });
});
