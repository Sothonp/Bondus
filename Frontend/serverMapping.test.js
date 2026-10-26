/* Tests for the app <-> backend translators (Frontend/serverMapping.js).
   Run with:  node --test Frontend/serverMapping.test.js */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  userToProfile, registrationToPayload, registrationToPatch, registrationErrorStep, taskFromServer, stateToSave,
  newAttemptId, answerEvent, statusEvent, boxEvent, diagnosticEvent, apiErrorKey, API_ERROR_KEYS, waitParts, isCodeAlreadySent,
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
  assert.equal(body.phone, "016 556 618");        // the server strips spaces itself
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

test("a teacher sign-up's registration payload carries accountKind, school, and the split/trimmed subjects", () => {
  const body = registrationToPayload({
    ...form, field: undefined, accountKind: "teacher",
    schoolName: "  Bak Touk High School ", subjectsTaught: "Mathematics,  Physics ,,Chemistry",
  });
  assert.equal(body.accountKind, "teacher");
  assert.equal(body.school, "Bak Touk High School");
  assert.deepEqual(body.subjectsTaught, ["Mathematics", "Physics", "Chemistry"]);
  assert.equal(body.field, undefined);
});

test("a student's registration payload never carries accountKind, school, or subjectsTaught", () => {
  const body = registrationToPayload(form);
  assert.equal(body.accountKind, undefined);
  assert.equal(body.school, undefined);
  assert.equal(body.subjectsTaught, undefined);
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
  assert.deepEqual(Object.keys(saved).sort(), ["langResults", "practice", "rewards", "topicMastery", "uniPractice", "uniTopicMastery"]);
  assert.deepEqual(saved.uniPractice, {});
});

test("attempt ids are unique", () => {
  const ids = new Set(Array.from({ length: 50 }, () => newAttemptId()));
  assert.equal(ids.size, 50);
});

test("an answered exercise becomes a study event", () => {
  const ev = answerEvent({ id: "phy-3", subject: "Physics", topic: "Optics", difficulty: "Hard" }, "incorrect", { timeSec: 12.34, mistakeType: "Careless mistake" }, "att-1");
  assert.deepEqual(ev, { type: "answer", key: "phy-3", attemptId: "att-1", subject: "Physics", topic: "Optics", difficulty: "Hard", mistakeType: "Careless mistake", correct: false, timeSec: 12.3 });
  const ok = answerEvent({ id: 41, subject: "Math", topic: "Limits" }, "correct", {}, "att-2");
  assert.equal(ok.key, "41");
  assert.equal(ok.correct, true);
  assert.equal("timeSec" in ok, false);
  assert.equal("mistakeType" in ok, false);
});

test("time spent is clamped to what the server accepts", () => {
  assert.equal(answerEvent({ id: 1 }, "correct", { timeSec: 99999 }, "a").timeSec, 3600);
  assert.equal(answerEvent({ id: 1 }, "correct", { timeSec: -4 }, "a").timeSec, 0);
});

test("manual status ticks: completed and in_progress are sent, pending is not", () => {
  const ex = { id: "e1", subject: "Chemistry", topic: "Acids" };
  assert.equal(statusEvent(ex, "completed", "a").status, "completed");
  assert.equal(statusEvent(ex, "in_progress", "a").status, "in_progress");
  assert.equal(statusEvent(ex, "pending", "a"), null);
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
