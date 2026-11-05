/* Tests for the app <-> backend translators (Frontend/serverMapping.js).
   Run with:  node --test Frontend/serverMapping.test.js */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  userToProfile, registrationToPayload, registrationToPatch, registrationErrorStep, taskFromServer, stateToSave,
  newAttemptId, answerEvent, boxEvent, diagnosticEvent, warmupEvent, chapterQuizPayload, progressFromServer, apiErrorKey, API_ERROR_KEYS, waitParts, isCodeAlreadySent,
} from "./serverMapping.js";

const form = {
  name: "  Sophea Chan ", phone: " 016 556 618 ", email: "", password: "secret123", age: 17, educationLevel: "highschool",
  grade: "12", field: "science", target: "A", targetExamYear: 2027, dailyMinutes: 60, targetUniversity: "", subjectsToImprove: ["physics"],
  universityGoals: [], universityMajor: "", universityYear: "",
};

test("the server user becomes the app profile: id -> userId, createdAt dropped, server XP applied", () => {
  const user = { id: 9, createdAt: "2026-10-22", name: "A", field: "science", level: 1, xp: 40, xpToNext: 500, hasCompletedDiagnostic: false };
  const p = userToProfile(user, { level: 2, xp: 520, xpToNext: 675 });
  assert.equal(p.userId, 9);
  assert.equal("id" in p, false);
  assert.equal("createdAt" in p, false);
  assert.deepEqual([p.level, p.xp, p.xpToNext], [2, 520, 675]);
  assert.equal(userToProfile(user).xp, 40);
});

test("registration payload is trimmed and leaves out empty optional fields", () => {
  const body = registrationToPayload(form);
  assert.equal(body.name, "Sophea Chan");
  assert.equal("phone" in body, false);        // phone is no longer collected at sign-up
  assert.equal("email" in body, false);
  assert.equal("targetUniversity" in body, false);
  assert.deepEqual([body.age, body.grade, body.field, body.target, body.targetExamYear, body.dailyMinutes], [17, "12", "science", "A", 2027, 60]);
  assert.deepEqual(body.subjectsToImprove, ["physics"]);
  assert.equal(body.password, "secret123");
  assert.equal("universityGoals" in body, false);
});

test("a Science student's foreign-language choice is sent; a Social Science student's is not", () => {
  assert.equal(registrationToPayload({ ...form, field: "science", foreignLanguage: "French" }).foreignLanguage, "French");
  assert.equal("foreignLanguage" in registrationToPayload({ ...form, field: "social_science", foreignLanguage: "French" }), false);
  assert.equal("foreignLanguage" in registrationToPayload({ ...form, field: "science" }), false); // nothing chosen: the backend default applies
  assert.equal(registrationToPatch({ ...form, field: "science", foreignLanguage: "English" }).foreignLanguage, "English");
});

test("an email, a university and an age are sent when given, and a missing age is omitted", () => {
  const body = registrationToPayload({ ...form, email: " a@b.co ", targetUniversity: "RUPP", age: null });
  assert.equal(body.email, "a@b.co");
  assert.equal(body.targetUniversity, "RUPP");
  assert.equal("age" in body, false);
});

test("the patch version never re-sends the password or education level", () => {
  const patch = registrationToPatch(form);
  assert.equal("password" in patch, false);
  assert.equal("educationLevel" in patch, false);
  assert.equal(patch.field, "science");
});

test("a sign-up payload never carries teacher fields, whatever the form holds: everyone signs up as a student", () => {
  const body = registrationToPayload({ ...form, accountKind: "teacher", schoolName: "Bak Touk High School", subjectsTaught: "Mathematics, Physics" });
  for (const key of ["accountKind", "school", "subjectsTaught"]) assert.equal(body[key], undefined, `${key} should not be sent`);
  assert.equal(body.field, "science");
});

test("which sign-up screen shows a server problem", () => {
  assert.equal(registrationErrorStep({ code: "phone_taken" }), 1);
  assert.equal(registrationErrorStep({ code: "email_taken" }), 1);
  assert.equal(registrationErrorStep({ code: "validation_failed", errors: { password: ["short"] } }), 1);
  assert.equal(registrationErrorStep({ code: "validation_failed", errors: { field: ["bad"] } }), 2);
  assert.equal(registrationErrorStep({ code: "network_error" }), null);
  assert.equal(registrationErrorStep(null), null);
});

test("a server plan task becomes the dashboard's task shape", () => {
  assert.deepEqual(taskFromServer({ id: 5, title: "Read ch 3", subject: "Physics", minutes: 30, done: true, doneAt: "x", date: "2026-10-22" }),
    { id: 5, s: "Physics", task: "Read ch 3", min: 30, why: "My task", done: true, date: "2026-10-22" });
  assert.deepEqual(taskFromServer({ id: 6, title: "Plan", subject: null, minutes: null, done: false, date: "d" }),
    { id: 6, s: null, task: "Plan", min: null, why: "My task", done: false, date: "d" });
});

test("only progress data is saved to /me/state — never XP, the plan or the profile", () => {
  const saved = stateToSave({ topicMastery: { a: 1 }, practice: { x: 1 }, rewards: { owned: [] }, bonusXp: 99, profile: { xp: 5 }, plan: [1] });
  assert.deepEqual(Object.keys(saved).sort(), ["practice", "rewards", "topicMastery", "uniPractice", "uniTopicMastery"]);
  assert.deepEqual(saved.uniPractice, {});
});

test("attempt ids are unique", () => {
  const ids = new Set(Array.from({ length: 50 }, () => newAttemptId()));
  assert.equal(ids.size, 50);
});

test("an answered exercise becomes a study event", () => {
  const ev = answerEvent({ id: "phy-3", subject: "Physics", topic: "Optics", difficulty: "Hard" }, "incorrect", { timeSec: 12.34, mistakeType: "Careless mistake", answer: "Concave" }, "att-1");
  assert.deepEqual(ev, { type: "answer", key: "phy-3", attemptId: "att-1", subject: "Physics", topic: "Optics", difficulty: "Hard", mistakeType: "Careless mistake", answer: "Concave", timeSec: 12.3 });
  const ok = answerEvent({ id: 41, subject: "Math", topic: "Limits" }, "correct", {}, "att-2");
  assert.equal(ok.key, "41");
  assert.equal("correct" in ok, false);
  assert.equal("timeSec" in ok, false);
  assert.equal("mistakeType" in ok, false);
});

test("the chosen answer travels with the event, because the server grades it", () => {
  assert.equal(answerEvent({ id: 1 }, "correct", { answer: "Crust" }, "a").answer, "Crust");
  assert.equal(answerEvent({ id: 1 }, "correct", { answer: 42 }, "a").answer, "42");
  assert.equal("answer" in answerEvent({ id: 1 }, "correct", {}, "a"), false);
  assert.equal("answer" in answerEvent({ id: 1 }, "correct", { answer: "" }, "a"), false);
});

test("time spent is clamped to what the server accepts", () => {
  assert.equal(answerEvent({ id: 1 }, "correct", { timeSec: 99999 }, "a").timeSec, 3600);
  assert.equal(answerEvent({ id: 1 }, "correct", { timeSec: -4 }, "a").timeSec, 0);
});

test("there is no way to send a manual status: finishing an exercise is decided by the graded answer alone", async () => {
  const mapping = await import("./serverMapping.js");
  assert.equal(mapping.statusEvent, undefined);
});

test("a treasure box event carries the set, counts and the dropped item", () => {
  assert.deepEqual(boxEvent({ setKey: "phy-set-1", total: 8, retried: 2, itemId: "hat-party" }, "a"),
    { type: "box_claim", key: "phy-set-1", attemptId: "a", total: 8, retried: 2, itemId: "hat-party" });
  const none = boxEvent({ setKey: "s", total: 5, retried: 0, itemId: null }, "a");
  assert.equal("itemId" in none, false);
  assert.equal(none.retried, 0);
});

test("the diagnostic event is its own type", () => {
  assert.deepEqual(diagnosticEvent("a"), { type: "diagnostic", key: "diagnostic", attemptId: "a" });
});

test("a wait in seconds becomes whole hours and minutes, rounded up", () => {
  assert.deepEqual(waitParts(2869), { hours: 0, minutes: 48 });   // the "48 minutes" a student saw locked out for
  assert.deepEqual(waitParts(3600), { hours: 1, minutes: 0 });
  assert.deepEqual(waitParts(3601), { hours: 1, minutes: 1 });
  assert.deepEqual(waitParts(5400), { hours: 1, minutes: 30 });
  assert.deepEqual(waitParts(17), { hours: 0, minutes: 1 });      // 17 seconds is shown as 1 minute, never 0
  assert.deepEqual(waitParts(60), { hours: 0, minutes: 1 });
  assert.equal(waitParts(0), null);
  assert.equal(waitParts(-5), null);
  assert.equal(waitParts(null), null);
  assert.equal(waitParts("soon"), null);
});

test("'a code was just sent' is told apart from being rate limited", () => {
  assert.equal(isCodeAlreadySent({ code: "code_recently_sent", message: "x" }), true);
  assert.equal(isCodeAlreadySent({ code: "too_many_requests", message: "A code was just sent. Please wait a moment." }), true);  // older backend
  assert.equal(isCodeAlreadySent({ code: "too_many_requests", message: "Too Many Attempts." }), false);                          // the hourly limit
  assert.equal(isCodeAlreadySent({ code: "no_email_on_account", message: "x" }), false);
  assert.equal(isCodeAlreadySent(null), false);
});

test("every backend error code has a message key, and unknown codes fall back to the generic one", () => {
  for (const code of Object.keys(API_ERROR_KEYS)) assert.match(apiErrorKey(code), /^err[A-Z]/);
  assert.equal(apiErrorKey("something_new"), "errServer");
  assert.equal(apiErrorKey("phone_taken"), "errPhoneTaken");
});

test("a wrong current password maps to its own message key", () => {
  assert.equal(apiErrorKey("wrong_password"), "errWrongPassword");
});

test("the warm-up event is keyed by the server's day and has no attemptId, so a retry cannot count twice", () => {
  assert.deepEqual(warmupEvent("2026-11-01", 3), { type: "warmup", key: "2026-11-01", total: 3 });
  assert.equal("attemptId" in warmupEvent("2026-11-01"), false);
  assert.equal(warmupEvent("2026-11-01").total, 3);
  assert.equal(warmupEvent("2026-11-01", "x").total, 0);
});

test("a Master Quiz becomes the request body the server grades: answers only, never a verdict", () => {
  const body = chapterQuizPayload({
    subject: "Mathematics", chapter: "Limits", attemptId: "att-1", timeSec: 95.46,
    answers: [{ key: "Mathematics-3", answer: "12" }, { key: "Mathematics-9", answer: null }, { key: 14, answer: 0 }],
  });
  assert.deepEqual(body, {
    subject: "Mathematics", chapter: "Limits", attemptId: "att-1", timeSec: 95.5,
    answers: [{ key: "Mathematics-3", answer: "12" }, { key: "Mathematics-9", answer: null }, { key: "14", answer: "0" }],
  });
  assert.equal(JSON.stringify(body).includes("correct"), false);
});

test("a quiz without a usable time still sends the answers", () => {
  const body = chapterQuizPayload({ subject: "S", chapter: "C", attemptId: "a", answers: [{ key: "k", answer: "x" }], timeSec: undefined });
  assert.equal("timeSec" in body, false);
  assert.equal(chapterQuizPayload({ subject: "S", chapter: "C", attemptId: "a", answers: [], timeSec: 99999 }).timeSec, 3600);
});

test("the server's chapters become the progress the chapter list is drawn from", () => {
  const progress = progressFromServer({
    passed: 1, papersOpen: false,
    chapters: [
      { key: "A", passed: true, mastered: true, attempts: 2, best: 90 },
      { key: "B", passed: true, mastered: false, attempts: 0, best: null },
      { key: "C", passed: false, mastered: false, attempts: "1", best: 60 },
    ],
  });
  assert.deepEqual(progress, {
    A: { passed: true, mastered: true, attempts: 2, best: 90 },
    B: { passed: true, mastered: false, attempts: 0, best: null },
    C: { passed: false, mastered: false, attempts: 1, best: 60 },
  });
  assert.deepEqual(progressFromServer(undefined), {});
  assert.deepEqual(progressFromServer({}), {});
});
