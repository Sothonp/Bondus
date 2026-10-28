/* Render tests for the Profile page (Frontend/ProfileUi.jsx): the first render only (no effects run under server
   rendering), which is enough to check which fields each kind of student sees. The shared form pieces are stubs here;
   App.jsx passes the real ones in.
   Run with:  node --test Frontend/profileUi.ssr.test.js */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startSsr } from "./rewards/ssrHarness.js";

let s, ProfilePage, parts;
before(async () => {
  s = await startSsr();
  ({ ProfilePage } = await s.load("/Frontend/ProfileUi.jsx"));
  parts = {
    FormField: ({ label, error, children }) => s.h("label", null, s.h("span", null, label), children, error ? s.h("p", { role: "alert" }, error) : null),
    SelectField: ({ label, value, options }) => s.h("label", null, s.h("span", null, label),
      s.h("select", { defaultValue: value }, options.map((o) => s.h("option", { key: o.value, value: o.value }, o.label)))),
    SubjectChip: ({ label, selected }) => s.h("button", { type: "button", "data-chip": label, "aria-pressed": selected }, label),
  };
});
after(() => s.close());

const lists = {
  examYears: [2026, 2027, 2028], studyMinutes: [30, 45, 60, 90, 120], targetGrades: ["A", "B", "C", "D", "E"],
  universities: [{ abbr: "ITC", n: "Institute of Technology", nKm: "ITC km" }], foreignLanguages: ["English", "French"],
  trackLabels: { science: { label: "Science", km: "វិទ្យាសាស្រ្ត" }, social_science: { label: "Social Science", km: "សង្គម" } },
};
const science = {
  educationLevel: "highschool", field: "science", grade: "12", name: "Sokha Chan", email: "sokha@example.com", age: 17, target: "A",
  targetExamYear: 2027, dailyMinutes: 60, targetUniversity: "ITC", foreignLanguage: "English", subjectsToImprove: ["physics"], reminderEmails: true,
};
const render = (profile, extra = {}) => {
  const html = s.render(s.h(ProfilePage, {
    profile, lang: "en", tr: (key) => key, serverMode: true, parts, lists, errorText: (code) => code,
    onSaveDetails: async () => ({ ok: true }), ...extra,
  }));
  return { html, text: s.text(html) };
};

test("a science high-school student sees details, goals, the foreign language, the locked track and grade, and the reminder switch", () => {
  const { html, text } = render(science);
  for (const key of ["profileTitle", "profileDetailsHeading", "profileNameLabel", "profileEmailLabel", "profileAgeLabel", "profileGoalsHeading",
    "targetGradeLabel", "targetExamYearLabel", "dailyStudyTimeLabel", "targetUniLabel", "foreignLanguageLabel", "profileLockedNote", "profileReminderLabel"]) {
    assert.ok(text.includes(key), key);
  }
  assert.ok(text.includes("Science") && text.includes("grade12"), "track and grade shown read-only");
  assert.match(html, /autocomplete="name"/i);
  assert.match(html, /autocomplete="email"/i);
  assert.match(html, /data-chip="Physics"/);
  assert.match(html, /<input[^>]*type="checkbox"[^>]*checked/);
});

test("the name and email fields carry the stored values", () => {
  const { html } = render(science);
  assert.match(html, /value="Sokha Chan"/);
  assert.match(html, /value="sokha@example.com"/);
});

test("a social-science student has no foreign-language field", () => {
  const { text } = render({ ...science, field: "social_science", foreignLanguage: null });
  assert.ok(!text.includes("foreignLanguageLabel"));
  assert.ok(text.includes("Social Science"));
});

test("a university student sees only name, email, age and the reminder switch", () => {
  const { text } = render({ educationLevel: "university", name: "Dara", email: "d@x.co", age: 20, reminderEmails: true });
  for (const key of ["profileNameLabel", "profileEmailLabel", "profileAgeLabel", "profileReminderLabel"]) assert.ok(text.includes(key), key);
  for (const key of ["profileGoalsHeading", "targetGradeLabel", "targetExamYearLabel", "profileLockedNote"]) assert.ok(!text.includes(key), key);
});

test("a stored exam year that the list no longer offers is still an option", () => {
  const { html } = render({ ...science, targetExamYear: 2025 });
  assert.match(html, /<option value="2025"[^>]*>2025<\/option>/);
});

test("Save starts disabled, because nothing has changed", () => {
  const { html } = render(science);
  assert.match(html, /<button[^>]*type="submit"[^>]*disabled/);
});
