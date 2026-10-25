/* Guards on how the admin teacher-application review screen is wired into App.jsx. App.jsx is read
   as text because the app has no DOM test harness; the API calls themselves are covered in
   api.test.js, and the flow was run end to end in a browser.
   Run with:  node --test Frontend/adminWiring.test.js */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("./App.jsx", import.meta.url), "utf8");

const KEYS = [
  "adminAppsTitle", "adminAppsDesc", "adminAppsEmpty",
  "adminAppFilter_pending", "adminAppFilter_approved", "adminAppFilter_rejected", "adminAppFilter_all",
  "adminAppApproveBtn", "adminAppRejectBtn", "adminAppConfirmApprove", "adminAppConfirmReject", "adminAppConfirmYes",
];

test("every string the admin screen uses exists once in English and once in Khmer", () => {
  for (const key of KEYS) {
    const hits = app.match(new RegExp(`[\\s,{]${key}:`, "g")) || [];
    assert.equal(hits.length, 2, `${key} should be defined once in English and once in Khmer, found ${hits.length}`);
  }
});

test("an admin profile gets its own nav, title, and is excluded from student gamification chrome", () => {
  assert.match(app, /const ADMIN_NAV = \[/);
  assert.match(app, /const isAdminProfile = profile\.role === "admin";/);
  assert.match(app, /isAdminProfile \? ADMIN_NAV : isTeacherProfile \? TEACHER_NAV : isUniProfile \? UNI_NAV/);
  assert.match(app, /isAdminProfile \? "Admin" : isTeacherProfile \? "Teacher"/);
  assert.match(app, /adminTeacherApplications: <AdminTeacherApplications api=\{api\}/);
  assert.match(app, /!isTeacherProfile && !isAdminProfile && \(/);
});

test("an admin lands on the Teacher Applications screen, not the student dashboard, at every entry point", () => {
  const hits = app.match(/role === "admin" \? "adminTeacherApplications" : .*?role === "teacher" \? "teacherExercises"/g) || [];
  assert.equal(hits.length, 3, `expected all 3 tab-initialization sites (restore, login, account-load) to route admins first, found ${hits.length}`);
});

test("approving or rejecting calls the admin API and asks for confirmation first", () => {
  const admin = app.slice(app.indexOf("function AdminTeacherApplications("), app.indexOf("function AdminApplicationRow("));
  assert.match(admin, /api\.getAdminTeacherApplications\(status\)/);
  assert.match(admin, /api\.approveTeacherApplication\(id\)/);
  assert.match(admin, /api\.rejectTeacherApplication\(id\)/);

  const row = app.slice(app.indexOf("function AdminApplicationRow("), app.indexOf("/* ════════════════════════ Practice"));
  assert.match(row, /useState\(null\); \/\/ "approve" \| "reject" \| null/);
  assert.match(row, /onClick=\{confirming === "approve" \? onApprove : onReject\}/);
});
