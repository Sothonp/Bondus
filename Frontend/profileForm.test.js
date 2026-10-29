/* Tests for the Profile page's pure helpers (Frontend/profileForm.js): which fields a student may edit, what changed,
   what is valid, and how server errors land on fields. No React, no network.
   Run with:  node --test Frontend/profileForm.test.js */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  editableFields, profileToForm, diffProfile, validateProfile, withCurrentOption, serverFieldErrors,
  validatePasswordChange, mergeProfileForm, PROFILE_STRING_KEYS,
} from "./profileForm.js";

const hs = {
  educationLevel: "highschool", field: "science", name: "Sokha Chan", email: "sokha@example.com", age: 17, target: "A",
  targetExamYear: 2027, dailyMinutes: 60, targetUniversity: "ITC", foreignLanguage: "English", subjectsToImprove: ["physics"],
  reminderEmails: true, grade: "12",
};
const ACCOUNT_FIELDS = ["name", "email", "age", "reminderEmails"];

test("a science high-school student edits details and goals, including the foreign language, but not track or grade", () => {
  const fields = editableFields(hs);
  for (const f of ["name", "email", "age", "target", "targetExamYear", "dailyMinutes", "targetUniversity", "foreignLanguage", "subjectsToImprove", "reminderEmails"]) assert.ok(fields.includes(f), f);
  assert.ok(!fields.includes("grade") && !fields.includes("field"));
});

test("a social-science student has no foreign-language field", () => {
  assert.ok(!editableFields({ ...hs, field: "social_science" }).includes("foreignLanguage"));
});

test("a university student edits only the account fields", () => {
  assert.deepEqual(editableFields({ educationLevel: "university" }), ACCOUNT_FIELDS);
});

test("the form starts from the profile: age as text, reminders on by default, its own copy of the subjects", () => {
  const form = profileToForm(hs);
  assert.equal(form.age, "17");
  assert.equal(profileToForm({ ...hs, age: null }).age, "");
  assert.equal(profileToForm({ ...hs, reminderEmails: undefined }).reminderEmails, true);
  form.subjectsToImprove.push("chemistry");
  assert.deepEqual(hs.subjectsToImprove, ["physics"]);
});

test("a university form holds only the account fields", () => {
  const form = profileToForm({ educationLevel: "university", name: "Dara", email: "d@x.co", age: 20, target: "A" });
  assert.deepEqual(Object.keys(form).sort(), [...ACCOUNT_FIELDS].sort());
});

test("diffProfile sends only what changed", () => {
  const form = profileToForm(hs);
  assert.deepEqual(diffProfile(hs, form), {});
  assert.deepEqual(diffProfile(hs, { ...form, name: "Sokha C." }), { name: "Sokha C." });
  assert.deepEqual(diffProfile(hs, { ...form, dailyMinutes: 90 }), { dailyMinutes: 90 });
  assert.deepEqual(diffProfile(hs, { ...form, reminderEmails: false }), { reminderEmails: false });
});

test("clearing optional fields sends null: an emptied age, 'Not sure yet' for the university", () => {
  const form = profileToForm(hs);
  assert.deepEqual(diffProfile(hs, { ...form, age: "" }), { age: null });
  assert.deepEqual(diffProfile(hs, { ...form, age: "18" }), { age: 18 });
  assert.deepEqual(diffProfile(hs, { ...form, targetUniversity: "" }), { targetUniversity: null });
});

test("an email typed with spaces or capitals is not a change, and a real change is sent trimmed and lowercase", () => {
  const form = profileToForm(hs);
  assert.deepEqual(diffProfile(hs, { ...form, email: "  SOKHA@Example.com " }), {});
  assert.deepEqual(diffProfile(hs, { ...form, email: " New@Example.com " }), { email: "new@example.com" });
});

test("subjects are compared as a set and sent whole when they change", () => {
  const two = { ...hs, subjectsToImprove: ["physics", "chemistry"] };
  const form = profileToForm(two);
  assert.deepEqual(diffProfile(two, { ...form, subjectsToImprove: ["chemistry", "physics"] }), {});
  assert.deepEqual(diffProfile(two, { ...form, subjectsToImprove: ["physics", "chemistry", "biology"] }), { subjectsToImprove: ["physics", "chemistry", "biology"] });
});

test("a stored value that the sign-up lists no longer offer survives an untouched save", () => {
  const old = { ...hs, targetExamYear: 2025, targetUniversity: "OLDU" };
  assert.deepEqual(diffProfile(old, profileToForm(old)), {});
});

test("a university profile's diff ignores the goal fields it does not edit", () => {
  const uni = { educationLevel: "university", name: "Dara", email: "d@x.co", age: 20, target: "A" };
  assert.deepEqual(diffProfile(uni, { ...profileToForm(uni), name: "Dara K", target: "B" }), { name: "Dara K" });
});

test("a blank or over-long name is rejected", () => {
  const form = profileToForm(hs);
  assert.deepEqual(validateProfile(hs, { ...form, name: "   " }), { name: "profileErrName" });
  assert.deepEqual(validateProfile(hs, { ...form, name: "a".repeat(256) }), { name: "profileErrName" });
  assert.deepEqual(validateProfile(hs, { ...form, name: "a".repeat(255) }), {});
});

test("an email must look like one, and cannot be emptied once the account has one", () => {
  const form = profileToForm(hs);
  assert.deepEqual(validateProfile(hs, { ...form, email: "not-an-email" }), { email: "profileErrEmail" });
  assert.deepEqual(validateProfile(hs, { ...form, email: "" }), { email: "profileErrEmail" });
});

test("a phone-only account with no email can still save other fields", () => {
  const phoneOnly = { ...hs, email: null };
  assert.deepEqual(validateProfile(phoneOnly, { ...profileToForm(phoneOnly), email: "" }), {});
});

test("age is empty or a whole number from 8 to 99", () => {
  const form = profileToForm(hs);
  for (const bad of ["7", "100", "abc", "17.5"]) assert.deepEqual(validateProfile(hs, { ...form, age: bad }), { age: "profileErrAge" }, bad);
  for (const ok of ["", "8", "99"]) assert.deepEqual(validateProfile(hs, { ...form, age: ok }), {}, ok);
});

test("withCurrentOption adds a stored value that the list lacks, and leaves the list alone otherwise", () => {
  const years = [{ value: 2026, label: "2026" }, { value: 2027, label: "2027" }];
  assert.deepEqual(withCurrentOption(years, 2025).map((o) => o.value), [2025, 2026, 2027]);
  assert.equal(withCurrentOption(years, 2026), years);
  assert.equal(withCurrentOption(years, ""), years);
  assert.equal(withCurrentOption(years, null), years);
});

test("server errors land on the right field", () => {
  assert.deepEqual(serverFieldErrors({ code: "email_taken" }), { email: "errEmailTaken" });
  assert.deepEqual(serverFieldErrors({ code: "validation_failed", errors: { age: ["x"], bogus: ["y"] } }), { age: "errValidation" });
  assert.deepEqual(serverFieldErrors({ code: "server_error" }), {});
  assert.deepEqual(serverFieldErrors(null), {});
});

test("the new password must be 8 to 128 characters, counted as characters (Khmer and emoji passwords obey the server's rule)", () => {
  const ok = (next) => validatePasswordChange({ current: "old", next, confirm: next });
  assert.deepEqual(ok("a".repeat(8)), {});
  assert.deepEqual(ok("a".repeat(128)), {});
  assert.deepEqual(ok("a".repeat(7)), { next: "passwordErrTooShort" });
  assert.deepEqual(ok("a".repeat(129)), { next: "passwordErrTooLong" });
  assert.deepEqual(ok("😀".repeat(8)), {});
  assert.deepEqual(ok("😀".repeat(128)), {});
  assert.deepEqual(ok("😀".repeat(7)), { next: "passwordErrTooShort" });
});

test("a password change needs the current password and a matching confirmation", () => {
  assert.deepEqual(validatePasswordChange({ current: "", next: "abcdefgh", confirm: "abcdefgh" }), { current: "passwordErrCurrentRequired" });
  assert.deepEqual(validatePasswordChange({ current: "old", next: "abcdefgh", confirm: "abcdefgX" }), { confirm: "passwordErrMismatch" });
  assert.deepEqual(validatePasswordChange({ current: "old", next: "abcdefgh", confirm: "abcdefgh" }), {});
});

test("PROFILE_STRING_KEYS lists every message key the helpers can return, once each", () => {
  assert.equal(new Set(PROFILE_STRING_KEYS).size, PROFILE_STRING_KEYS.length);
  for (const key of ["profileErrName", "profileErrEmail", "profileErrAge", "passwordErrCurrentRequired", "passwordErrTooShort", "passwordErrTooLong", "passwordErrMismatch", "errEmailTaken", "errValidation", "errWrongPassword"]) {
    assert.ok(PROFILE_STRING_KEYS.includes(key), key);
  }
});

test("a refreshed profile updates the fields the student has not touched and keeps what they typed meanwhile", () => {
  const before = { name: "Sokha", age: "17", dailyMinutes: 60, subjectsToImprove: ["physics"], reminderEmails: true };
  const typedMeanwhile = { ...before, age: "18" }; // typed while a save of the name was still in flight
  const fromServer = { ...before, name: "Sokha C.", dailyMinutes: 90 };
  assert.deepEqual(mergeProfileForm(typedMeanwhile, before, fromServer), { name: "Sokha C.", age: "18", dailyMinutes: 90, subjectsToImprove: ["physics"], reminderEmails: true });
});

test("a field that was edited and saved ends at the saved value", () => {
  assert.deepEqual(mergeProfileForm({ name: "Sokha C." }, { name: "Sokha" }, { name: "Sokha C." }), { name: "Sokha C." });
});

test("an edited list is kept and an untouched one follows the server", () => {
  const before = { subjectsToImprove: ["physics"], dailyMinutes: 60 };
  assert.deepEqual(mergeProfileForm({ subjectsToImprove: ["physics", "chemistry"], dailyMinutes: 60 }, before, { subjectsToImprove: ["physics"], dailyMinutes: 90 }),
    { subjectsToImprove: ["physics", "chemistry"], dailyMinutes: 90 });
  assert.deepEqual(mergeProfileForm({ subjectsToImprove: ["physics"] }, before, { subjectsToImprove: ["biology"] }), { subjectsToImprove: ["biology"] });
});
