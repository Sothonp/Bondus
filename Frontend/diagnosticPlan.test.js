/* Tests for the diagnostic test's plan (Frontend/diagnosticPlan.js): which tracks have one, which subjects it covers
   and which questions it asks, checked against the real question bank. The screens that use it are checked in
   serverWiring.test.js (App.jsx is read as text because the app has no DOM test harness).
   Run with:  node --test Frontend/diagnosticPlan.test.js   (no dependencies — Node's built-in runner) */
import { test } from "node:test";
import assert from "node:assert/strict";
import { RAW_EXERCISES } from "../src/data/bacExercises.js";
import { hasDiagnostic, diagnosticSubjects, pickSection, buildSections, locate, QUESTIONS_PER_SECTION } from "./diagnosticPlan.js";

// Same shape and ids as App.jsx's getExercises(subject): the picker only looks at id, topic, difficulty and chapter.
const listFor = (subject) => (RAW_EXERCISES[subject] || []).map((r, i) => ({ id: `${subject}-${i + 1}`, subject, topic: r.topic, difficulty: r.difficulty, chapter: r.chapter }));
const science = () => {
  const sections = buildSections("science", listFor);
  assert.equal(sections.length, 4, "Science should have four sections"); // an empty plan must not pass the checks below by having nothing to check
  return sections;
};
const RANK = { Easy: 0, Medium: 1, Hard: 2 };

test("Science has a diagnostic of four sections (Mathematics, Physics, Chemistry, Biology); Social Science has none", () => {
  assert.equal(hasDiagnostic("science"), true);
  assert.deepEqual(diagnosticSubjects("science"), ["Mathematics", "Physics", "Chemistry", "Biology"]);
  assert.deepEqual(science().map((s) => s.subject), ["Mathematics", "Physics", "Chemistry", "Biology"]);
  assert.ok(science().every((s) => s.questions.length > 0));

  assert.equal(hasDiagnostic("social_science"), false);
  assert.deepEqual(diagnosticSubjects("social_science"), []);
  assert.deepEqual(buildSections("social_science", listFor), []);
  assert.equal(hasDiagnostic(undefined), false);
});

test("every section asks 10 to 15 questions, so the whole test is a few dozen, not hundreds", () => {
  assert.ok(QUESTIONS_PER_SECTION >= 10 && QUESTIONS_PER_SECTION <= 15);
  for (const { subject, questions } of science()) {
    assert.ok(questions.length >= 10 && questions.length <= 15, `${subject} has ${questions.length} questions`);
    assert.ok(questions.every((q) => q.subject === subject), `${subject} section holds another subject's question`);
  }
  assert.ok(science().flatMap((s) => s.questions).length <= 60);
});

test("a section never repeats a question or a topic", () => {
  for (const { subject, questions } of science()) {
    assert.equal(new Set(questions.map((q) => q.id)).size, questions.length, `${subject}: repeated question`);
    assert.equal(new Set(questions.map((q) => q.topic)).size, questions.length, `${subject}: repeated topic`);
  }
});

test("a section mixes the levels, easy to hard: about a quarter easy, a quarter hard, the rest medium", () => {
  for (const { subject, questions } of science()) {
    const count = (level) => questions.filter((q) => q.difficulty === level).length;
    assert.ok(count("Easy") >= 2, `${subject}: ${count("Easy")} easy`);
    assert.ok(count("Hard") >= 2, `${subject}: ${count("Hard")} hard`);
    assert.ok(count("Medium") >= count("Easy"), `${subject}: fewer medium than easy`);
    const ranks = questions.map((q) => RANK[q.difficulty]);
    assert.deepEqual(ranks, [...ranks].sort((a, b) => a - b), `${subject}: not ordered easy to hard`);
  }
});

test("a section is spread over the syllabus, not bunched in the first chapters", () => {
  for (const { subject, questions } of science()) {
    const chapters = [...new Set(listFor(subject).map((q) => q.chapter))];
    const used = new Set(questions.map((q) => q.chapter));
    assert.ok(used.size >= Math.min(8, chapters.length), `${subject}: only ${used.size} of ${chapters.length} chapters`);
    // Some question must come from the second half of the bank, or the end of the syllabus is never tested.
    const half = listFor(subject).length / 2;
    const ids = listFor(subject).map((q) => q.id);
    assert.ok(questions.some((q) => ids.indexOf(q.id) >= half), `${subject}: nothing from the second half`);
  }
});

test("the same questions come back every time, whatever the language", () => {
  const ids = (sections) => sections.flatMap((s) => s.questions.map((q) => q.id));
  assert.deepEqual(ids(science()), ids(science()));
  // The Khmer copy of the bank has the same ids and the same topics/levels; only the text differs.
  const khmer = buildSections("science", (s) => listFor(s).map((q) => ({ ...q, prompt: "ខ្មែរ" })));
  assert.deepEqual(ids(khmer), ids(science()));
});

test("a small bank gives what it has; an empty one gives nothing", () => {
  const few = [
    { id: "a", topic: "t1", difficulty: "Easy" }, { id: "b", topic: "t2", difficulty: "Hard" }, { id: "c", topic: "t3", difficulty: "Medium" },
  ];
  assert.deepEqual(pickSection(few, 12).map((q) => q.id).sort(), ["a", "b", "c"]);
  assert.deepEqual(pickSection([], 12), []);
  assert.deepEqual(buildSections("science", () => []), []);
});

test("when topics run out it repeats one rather than asking fewer questions", () => {
  const same = Array.from({ length: 20 }, (_, i) => ({ id: `q${i}`, topic: i < 10 ? "one" : "two", difficulty: ["Easy", "Medium", "Hard", "Medium"][i % 4] }));
  const picked = pickSection(same, 12);
  assert.equal(picked.length, 12);
  assert.equal(new Set(picked.map((q) => q.id)).size, 12);
});

test("locate() says which section and which question the student is on", () => {
  const sections = [{ subject: "A", questions: [1, 2, 3] }, { subject: "B", questions: [4, 5] }, { subject: "C", questions: [6, 7, 8, 9] }];
  assert.deepEqual(locate(sections, 0), { subject: "A", section: 1, sections: 3, position: 1, size: 3 });
  assert.deepEqual(locate(sections, 2), { subject: "A", section: 1, sections: 3, position: 3, size: 3 });
  assert.deepEqual(locate(sections, 3), { subject: "B", section: 2, sections: 3, position: 1, size: 2 });
  assert.deepEqual(locate(sections, 8), { subject: "C", section: 3, sections: 3, position: 4, size: 4 });
  assert.equal(locate(sections, 9), null);
  assert.equal(locate([], 0), null);
});
