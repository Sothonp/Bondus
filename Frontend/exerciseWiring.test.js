/* Guards on how the Exercises feature is wired into App.jsx. App.jsx is read as text because the
   app has no DOM test harness; the behaviour itself is covered in exerciseSessions.test.js,
   api.test.js and serverMapping.test.js, and was run end to end in a browser.
   Run with:  node --test Frontend/exerciseWiring.test.js */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
const ui = readFileSync(new URL("./ExerciseUi.jsx", import.meta.url), "utf8");

// Every string key this feature introduced, across App.jsx and ExerciseUi.jsx.
const KEYS = [
  "deleteWord",
  "accountKindTitle", "accountKindDesc", "accountKindStudentTitle", "accountKindStudentDesc",
  "accountKindTeacherTitle", "accountKindTeacherDesc",
  "teacherDetailsTitle", "teacherDetailsDesc", "schoolNameLabel", "schoolNamePlaceholder",
  "subjectsTaughtLabel", "subjectsTaughtPlaceholder", "subjectsTaughtHint", "teacherApplySubmit",
  "teacherPendingTitle", "teacherPendingDesc",
  "errAlreadyApplied", "errAlreadyStaff", "errAlreadyRunning", "errAlreadySubmitted",
  "errNoPhotos", "errTooManyPhotos", "errNotRunning",
  "exercisesTitle", "exercisesDesc", "exercisesEmpty", "exLoading", "exStartBtn",
  "exErr_already_running", "exErr_already_submitted", "exErr_no_photos", "exErr_too_many_photos",
  "exErr_not_image", "exErr_too_big", "exErr_generic",
  "exElapsed", "exOverBy", "exLeft", "exCancelAsk", "exCancelYes", "exKeepGoing", "exFinishBtn", "exCancelBtn",
  "exSubmitTitle", "exSubmitDesc", "exTakePhoto", "exChoosePhoto", "exUploading", "exPhotosCount",
  "exRemovePhoto", "exSubmitBtn", "exBackToExercise", "exDoneTitle", "exDonePhotos", "exDoneBack",
  "exTeacherComments", "exSubmissionCount", "exFormRequired", "exFormTitleLabel", "exFormInstructionsLabel",
  "exFormTimeLimitLabel", "exFormNoLimit", "exFormSave",
  "exStatus_running", "exStatus_submitted", "exStatus_expired", "exStatus_cancelled",
  "exPhotosWord", "exNoComments", "exCommentPlaceholder", "exNewExercise",
  "myExercisesTitle", "myExercisesDesc", "myExercisesEmpty", "exNoSubmissions",
];

test("every string the Exercises feature uses exists once in English and once in Khmer", () => {
  for (const key of KEYS) {
    const hits = app.match(new RegExp(`[\\s,{]${key}:`, "g")) || [];
    assert.equal(hits.length, 2, `${key} should be defined once in English and once in Khmer, found ${hits.length}`);
  }
});

test("registration offers a student/teacher choice before account details, and teachers skip the track/preferences steps", () => {
  const register = app.slice(app.indexOf("function Register("), app.indexOf("/* ════════════════════════ Dashboard"));
  assert.match(register, /const isTeacher = form\.accountKind === "teacher";/);
  assert.match(register, /if \(step === 0\) \{/);
  assert.match(register, /set\("accountKind", "student"\); setStep\(1\)/);
  assert.match(register, /set\("accountKind", "teacher"\); setStep\(1\)/);
  assert.match(register, /\{!isUni && !isTeacher && \(/); // grade/target hidden for teachers
  assert.match(register, /if \(isTeacher && step === 2\) \{/);
  assert.match(register, /finish\(\{ \.\.\.form, age: Number\(form\.age\) \|\| null \}\)/);
});

test("a teacher sign-up registers the account, applies, loads it, and is gated behind review until approved", () => {
  const handler = app.slice(app.indexOf("const handleRegister = async"), app.indexOf("const handleBackToPreferences ="));
  assert.match(handler, /if \(reg\.accountKind === "teacher"\) \{/);
  assert.match(handler, /api\.register\(registrationToPayload\(reg\)\)/);
  assert.match(handler, /api\.applyTeacher\(teacherApplicationToPayload\(reg\)\)/);
  assert.match(handler, /await loadAccount\(\);/);
  assert.match(handler, /setPendingTeacherReview\(true\);/);
  assert.match(app, /if \(pendingTeacherReview && profile\.role !== "teacher"\) return .*<TeacherApplicationPending/);
});

test("the sidebar swaps to a teacher-only nav for an approved teacher account, and students get an Exercises tab", () => {
  assert.match(app, /const TEACHER_NAV = \[/);
  assert.match(app, /\{ id: "exercises", label: "Exercises"/);
  assert.match(app, /const isTeacherProfile = profile\.role === "teacher";/);
  assert.match(app, /isTeacherProfile \? TEACHER_NAV : isUniProfile \? UNI_NAV : showSchoolReport \? \[\.\.\.NAV, SCHOOL_NAV\] : NAV/);
  assert.match(app, /exercises: <Exercises api=\{api\}/);
  assert.match(app, /teacherExercises: <TeacherExercises api=\{api\}/);
});

test("exercise submission relies on the server for status, not a local store, and reuses the exam timer's photo pipeline", () => {
  assert.match(app, /useExerciseSessions\(\{ api, exerciseId: exercise\.id \}\)/);
  assert.match(ui, /import \{ shrinkImage \} from "\.\/imageUtils\.js";/);
  assert.match(ui, /await shrinkImage\(file\)/);
  assert.match(ui, /new File\(\[shrunk\.blob\], `photo-\$\{Date\.now\(\)\}\.jpg`, \{ type: "image\/jpeg" \}\)/);
});
