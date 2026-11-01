/* The chapter path's rules: order, which chapters are open, when the Master Quiz is available and what passes a chapter.
   Run with:  node --test Frontend/chapterProgress.test.js */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  chapterKeys, chapterStates, chapterStatesFromCounts, chaptersPassed, papersOpen, isSolved, isAnswered, reaches, toReach,
  quizLength, quizNeeded, testOutEligible, pickQuizQuestions, localProgress, recordLocalQuiz, quizVerdict,
} from "./chapterProgress.js";
import { PASS_PERCENT, MASTER_PERCENT, QUIZ_SIZE } from "./progressionConfig.js";

// A subject: chapter "A" has 10 questions, "B" 10, "C" 4. Ids are A-1 ... A-10, B-1 ... C-4.
const make = (chapter, n, extra = {}) => Array.from({ length: n }, (_, i) => ({ id: `${chapter}-${i + 1}`, chapter, ...extra }));
const list = [...make("A", 10), ...make("B", 10), ...make("C", 4)];
// The practice record: the first `n` questions of a chapter answered correctly.
const solve = (chapter, n) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`${chapter}-${i + 1}`, { status: "completed", result: "correct", xpAwarded: true }]));
// What the server (or this session) says about the quizzes.
const quiz = (entries) => Object.fromEntries(Object.entries(entries).map(([key, e]) => [key, { passed: false, mastered: false, attempts: 1, best: null, ...e }]));
const states = (practice, progress = {}) => chapterStates(list, practice, progress).map((r) => r.state);

test("the thresholds are 70 and 85, a quiz is 10 questions, and they live in one config", () => {
  assert.equal(PASS_PERCENT, 70);
  assert.equal(MASTER_PERCENT, 85);
  assert.equal(QUIZ_SIZE, 10);
});

test("the app and the server agree on every shared case", () => {
  const file = JSON.parse(readFileSync(new URL("./chapter-path-cases.json", import.meta.url), "utf8"));
  assert.equal(file.passPercent, PASS_PERCENT);
  assert.equal(file.masterPercent, MASTER_PERCENT);
  assert.ok(file.cases.length >= 10, "the fixture has its cases");
  for (const c of file.cases) {
    const rows = chapterStatesFromCounts(c.chapters);
    assert.equal(rows.length, c.expect.length, c.name);
    c.expect.forEach((want, i) => {
      for (const field of ["state", "blockedBy", "percent", "toQuiz"]) assert.deepEqual(rows[i][field], want[field], `${c.name}: chapter ${i} ${field}`);
    });
  }
});

test("chapters keep their authored order, unless every chapter has a chapterOrder", () => {
  assert.deepEqual(chapterKeys([...make("B", 1), ...make("A", 1)]), ["B", "A"]);
  assert.deepEqual(chapterKeys([...make("B", 1, { chapterOrder: 2 }), ...make("A", 1, { chapterOrder: 1 })]), ["A", "B"]);
  // One chapter without a number: nothing is re-sorted, so a half-numbered bank cannot scramble the path.
  assert.deepEqual(chapterKeys([...make("B", 1, { chapterOrder: 2 }), ...make("A", 1)]), ["B", "A"]);
});

test("a subject with no chapters has no path", () => {
  assert.deepEqual(chapterKeys([{ id: "x-1" }, { id: "x-2" }]), []);
  assert.deepEqual(chapterStates([{ id: "x-1" }], {}, {}), []);
});

test("a new student has the first chapter open and every other one locked", () => {
  assert.deepEqual(states({}), ["available", "locked", "locked"]);
});

test("solving 70% makes the quiz available but opens nothing: only passing the quiz does", () => {
  assert.deepEqual(states(solve("A", 6)), ["inProgress", "locked", "locked"]);
  assert.deepEqual(states(solve("A", 7)), ["quizReady", "locked", "locked"]);
  assert.deepEqual(states(solve("A", 10)), ["quizReady", "locked", "locked"], "even every question solved is not a pass");
});

test("passing the quiz opens only the next chapter", () => {
  assert.deepEqual(states(solve("A", 7), quiz({ A: { passed: true, best: 70 } })), ["passed", "available", "locked"]);
  assert.deepEqual(states(solve("A", 10), quiz({ A: { passed: true, mastered: true, best: 90 } })), ["mastered", "available", "locked"]);
});

test("a quiz that was taken and failed leaves the chapter as it was, and the next one locked", () => {
  assert.deepEqual(states(solve("A", 7), quiz({ A: { best: 60 } })), ["quizReady", "locked", "locked"]);
  assert.deepEqual(states(solve("A", 3), quiz({ A: { best: 30 } })), ["inProgress", "locked", "locked"]);
});

test("a quiz taken as a test-out also passes the chapter, whatever was practised", () => {
  assert.deepEqual(states({}, quiz({ A: { passed: true, best: 80 } })), ["passed", "available", "locked"]);
});

test("a locked chapter says which chapter blocks it", () => {
  const rows = chapterStates(list, solve("A", 4), {});
  assert.deepEqual([rows[1].blockedBy, rows[2].blockedBy, rows[0].blockedBy], ["A", "B", null]);
});

test("each row says how many more questions unlock the quiz", () => {
  assert.equal(chapterStates(list, solve("A", 2), {})[0].toQuiz, 5);
  assert.equal(chapterStates(list, solve("A", 7), {})[0].toQuiz, 0);
  assert.equal(chapterStates(list, {}, {})[2].toQuiz, 3, "even a locked chapter knows its own distance (3 of 4 questions)");
});

test("a manual Completed tick unlocks nothing: only a graded correct answer counts", () => {
  const ticked = Object.fromEntries(list.filter((e) => e.chapter === "A").map((e) => [e.id, { status: "completed", result: null, xpAwarded: false }]));
  assert.deepEqual(states(ticked), ["available", "locked", "locked"]);
  assert.equal(isSolved({ status: "completed", result: null }), false);
  assert.equal(isAnswered({ status: "completed", result: null }), false);
});

test("a wrong answer later does not take a solved question back, so the quiz stays available", () => {
  const afterMiss = { ...solve("A", 7), "A-1": { status: "in_progress", result: "incorrect", xpAwarded: true } };
  assert.deepEqual(states(afterMiss), ["quizReady", "locked", "locked"]);
  assert.equal(isSolved(afterMiss["A-1"]), true);
});

test("a question answered wrong and never right counts as answered, not solved", () => {
  const wrong = { "A-1": { status: "in_progress", result: "incorrect", xpAwarded: false } };
  assert.equal(isAnswered(wrong["A-1"]), true);
  assert.equal(isSolved(wrong["A-1"]), false);
  assert.deepEqual(states(wrong), ["inProgress", "locked", "locked"]);
});

test("a student who already answered in a later chapter keeps every chapter before it open", () => {
  // Answered 2 questions in B but never passed A: A and B are open (they were reachable before), C is still locked.
  assert.deepEqual(states({ ...solve("A", 3), ...solve("B", 2) }), ["inProgress", "inProgress", "locked"]);
  assert.deepEqual(states({ "C-1": { status: "in_progress", result: "incorrect", xpAwarded: false } }), ["available", "available", "inProgress"]);
  // So does one who took a later chapter's quiz.
  assert.deepEqual(states({}, quiz({ B: { attempts: 1 } })), ["available", "available", "locked"]);
});

test("progress outside the subject, or for unknown questions, changes nothing", () => {
  assert.deepEqual(states({ "Z-1": { xpAwarded: true, result: "correct" }, "A-99": { xpAwarded: true, result: "correct" } }), ["available", "locked", "locked"]);
  assert.deepEqual(states(null), ["available", "locked", "locked"]);
});

test("when the server's answer is not known, 70% solved counts as passed, so a slow connection locks nobody out", () => {
  // progress === null: the interim rule that applied before the quiz existed.
  assert.deepEqual(chapterStates(list, solve("A", 7), null).map((r) => r.state), ["passed", "available", "locked"]);
  assert.deepEqual(chapterStates(list, solve("A", 10), null).map((r) => r.state), ["mastered", "available", "locked"]);
  assert.deepEqual(chapterStates(list, solve("A", 6), null).map((r) => r.state), ["inProgress", "locked", "locked"]);
  // ... while an empty-but-known answer from the server is a real "nothing passed yet".
  assert.deepEqual(chapterStates(list, solve("A", 7), {}).map((r) => r.state), ["quizReady", "locked", "locked"]);
});

test("the summary counts passed and mastered chapters", () => {
  assert.equal(chaptersPassed(chapterStates(list, {}, {})), 0);
  const progress = quiz({ A: { passed: true, mastered: true }, B: { passed: true } });
  assert.equal(chaptersPassed(chapterStates(list, { ...solve("A", 10), ...solve("B", 7) }, progress)), 2);
});

test("full past papers open only when every chapter is passed", () => {
  assert.equal(papersOpen([]), false, "a subject with no chapters is not a path");
  assert.equal(papersOpen(chapterStates(list, {}, {})), false);
  assert.equal(papersOpen(chapterStates(list, {}, quiz({ A: { passed: true }, B: { passed: true } }))), false, "two of three");
  assert.equal(papersOpen(chapterStates(list, {}, quiz({ A: { passed: true }, B: { passed: true }, C: { mastered: true } }))), true);
});

test("each row reports its size, rounded percent and best quiz score", () => {
  const row = chapterStates(list, solve("A", 7), quiz({ A: { passed: true, best: 80, attempts: 2 } }))[0];
  assert.deepEqual([row.total, row.solved, row.answered, row.percent, row.best, row.attempts], [10, 7, 7, 70, 80, 2]);
  assert.equal(chapterStates(list, solve("C", 1), {})[2].percent, 25);
  assert.equal(chapterStates(list, {}, {})[0].best, null);
});

test("exactly 70% is the line, one question short is not", () => {
  assert.equal(reaches(7, 10, PASS_PERCENT), true);
  assert.equal(reaches(6, 10, PASS_PERCENT), false);
  assert.equal(reaches(3, 4, PASS_PERCENT), true, "75%");
  assert.equal(reaches(2, 4, PASS_PERCENT), false, "50%");
  assert.equal(reaches(17, 20, MASTER_PERCENT), true, "exactly 85%");
  assert.equal(reaches(16, 20, MASTER_PERCENT), false);
  assert.equal(reaches(0, 0, PASS_PERCENT), false, "an empty chapter reaches nothing");
  assert.equal(toReach(4, 10, PASS_PERCENT), 3);
  assert.equal(toReach(9, 10, PASS_PERCENT), 0);
});

test("a quiz is ten questions, or the whole chapter when it has fewer, and 70% of that must be right", () => {
  assert.deepEqual([quizLength(23), quizNeeded(23)], [10, 7]);
  assert.deepEqual([quizLength(4), quizNeeded(4)], [4, 3]);
  assert.deepEqual([quizLength(10), quizNeeded(10)], [10, 7]);
  assert.deepEqual([quizLength(1), quizNeeded(1)], [1, 1]);
});

/* ── Test out ───────────────────────────────────────────────────────────────────────────────────────────────── */
const topical = [...make("A", 3, { topic: "Limits" }), ...make("A", 3, { topic: "Series" }).map((e) => ({ ...e, id: `A-s${e.id}` })), ...make("B", 2, { topic: "Other" })];
const score = (n) => ({ score: n });

test("test out needs topics scored at 85 or better that cover at least half of the chapter's topics", () => {
  assert.equal(testOutEligible(topical, "A", { Limits: score(90), Series: score(85) }), true, "both topics, average 87.5");
  assert.equal(testOutEligible(topical, "A", { Limits: score(90) }), true, "one of two topics is exactly half");
  assert.equal(testOutEligible(topical, "A", { Limits: score(84) }), false, "scored, but under 85");
  assert.equal(testOutEligible(topical, "A", { Limits: score(100), Series: score(60) }), false, "average 80");
  assert.equal(testOutEligible(topical, "A", {}), false, "nothing scored");
  assert.equal(testOutEligible(topical, "A", { Other: score(100) }), false, "a topic of another chapter says nothing about this one");
  assert.equal(testOutEligible(topical, "Z", { Limits: score(100) }), false, "no such chapter");
  assert.equal(testOutEligible(topical, "A", { Limits: { score: null }, Series: undefined }), false);
});

test("test out coverage is counted in topics, not in questions", () => {
  const three = [...make("A", 1, { topic: "T1" }), ...make("A", 1, { topic: "T2" }).map((e) => ({ ...e, id: "A-2" })), ...make("A", 1, { topic: "T3" }).map((e) => ({ ...e, id: "A-3" }))];
  assert.equal(testOutEligible(three, "A", { T1: score(95) }), false, "one of three is a third, not half");
  assert.equal(testOutEligible(three, "A", { T1: score(95), T2: score(90) }), true, "two of three");
});

/* ── The quiz draw ──────────────────────────────────────────────────────────────────────────────────────────── */
const chapterOf = (n, topics) => Array.from({ length: n }, (_, i) => ({ id: `Q-${i + 1}`, chapter: "Q", topic: topics[i % topics.length] }));
const ids = (qs) => qs.map((q) => q.id);

test("a quiz is ten different questions of the chapter, and only of that chapter", () => {
  const bank = [...chapterOf(23, ["t1", "t2", "t3"]), ...make("OTHER", 12)];
  const picked = pickQuizQuestions(bank, "Q", "seed-1");
  assert.equal(picked.length, 10);
  assert.equal(new Set(ids(picked)).size, 10);
  assert.ok(picked.every((q) => q.chapter === "Q"));
});

test("a chapter with fewer than ten questions gives all of them, and an empty one gives none", () => {
  assert.equal(pickQuizQuestions(chapterOf(4, ["t"]), "Q", "s").length, 4);
  assert.deepEqual(ids(pickQuizQuestions(chapterOf(4, ["t"]), "Q", "s")).sort(), ["Q-1", "Q-2", "Q-3", "Q-4"]);
  assert.deepEqual(pickQuizQuestions(chapterOf(4, ["t"]), "NOPE", "s"), []);
});

test("the same seed gives the same quiz and a new seed gives a different one", () => {
  const bank = chapterOf(40, ["t1", "t2", "t3", "t4"]);
  assert.deepEqual(ids(pickQuizQuestions(bank, "Q", "a")), ids(pickQuizQuestions(bank, "Q", "a")));
  assert.notDeepEqual(ids(pickQuizQuestions(bank, "Q", "a")), ids(pickQuizQuestions(bank, "Q", "b")));
});

test("a quiz is spread across the chapter's topics, not ten from one", () => {
  const bank = [...chapterOf(30, ["t1"]), ...chapterOf(30, ["t2"]).map((q) => ({ ...q, id: `${q.id}-b` })), ...chapterOf(30, ["t3"]).map((q) => ({ ...q, id: `${q.id}-c` }))];
  const topics = pickQuizQuestions(bank, "Q", "x").map((q) => q.topic);
  for (const t of ["t1", "t2", "t3"]) assert.ok(topics.filter((x) => x === t).length >= 3, `${t} appears at least three times in ten`);
});

test("the draw copes with questions that have no topic", () => {
  const bank = Array.from({ length: 12 }, (_, i) => ({ id: `N-${i + 1}`, chapter: "N" }));
  assert.equal(pickQuizQuestions(bank, "N", "s").length, 10);
});

/* ── Results kept in this session (no server) ───────────────────────────────────────────────────────────────── */
test("a first quiz is stored with its score and the chapter passes at 7 of 10", () => {
  const store = recordLocalQuiz({}, "Maths", "A", 7, 10);
  assert.deepEqual(store.Maths.A, { attempts: 1, bestCorrect: 7, bestTotal: 10, passed: true, mastered: false });
  assert.deepEqual(localProgress(store, "Maths").A, { passed: true, mastered: false, attempts: 1, best: 70 });
});

test("a retake can raise the best score and never lowers it or takes a pass away", () => {
  let store = recordLocalQuiz({}, "Maths", "A", 9, 10);
  store = recordLocalQuiz(store, "Maths", "A", 3, 10);
  assert.deepEqual(store.Maths.A, { attempts: 2, bestCorrect: 9, bestTotal: 10, passed: true, mastered: true });
  store = recordLocalQuiz(store, "Maths", "A", 10, 10);
  assert.equal(localProgress(store, "Maths").A.best, 100);
});

test("a failed quiz is stored but passes nothing", () => {
  const store = recordLocalQuiz({}, "Maths", "A", 6, 10);
  assert.deepEqual(localProgress(store, "Maths").A, { passed: false, mastered: false, attempts: 1, best: 60 });
});

test("scores of different sizes are compared exactly, not by rounding", () => {
  // 2 of 3 (66.7%) against 3 of 5 (60%): the first is better. 7 of 10 against 14 of 20 is a tie, so the earlier stays.
  let store = recordLocalQuiz({}, "S", "A", 3, 5);
  store = recordLocalQuiz(store, "S", "A", 2, 3);
  assert.deepEqual([store.S.A.bestCorrect, store.S.A.bestTotal], [2, 3]);
  store = recordLocalQuiz({}, "S", "B", 7, 10);
  store = recordLocalQuiz(store, "S", "B", 14, 20);
  assert.deepEqual([store.S.B.bestCorrect, store.S.B.bestTotal], [7, 10]);
});

test("one subject's results never touch another's", () => {
  const store = recordLocalQuiz(recordLocalQuiz({}, "Maths", "A", 9, 10), "Physics", "A", 2, 10);
  assert.equal(localProgress(store, "Maths").A.passed, true);
  assert.equal(localProgress(store, "Physics").A.passed, false);
  assert.deepEqual(localProgress(store, "Biology"), {});
  assert.deepEqual(localProgress(undefined, "Biology"), {});
});

test("the verdict says passed, mastered and whether this quiz is what passed the chapter", () => {
  assert.deepEqual(quizVerdict(7, 10), { correct: 7, total: 10, score: 70, passed: true, mastered: false, newlyPassed: true });
  assert.deepEqual(quizVerdict(9, 10, true), { correct: 9, total: 10, score: 90, passed: true, mastered: true, newlyPassed: false });
  assert.deepEqual(quizVerdict(6, 10), { correct: 6, total: 10, score: 60, passed: false, mastered: false, newlyPassed: false });
  assert.equal(quizVerdict(0, 0).score, 0, "no division by zero");
});
