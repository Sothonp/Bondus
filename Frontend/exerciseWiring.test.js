/* Guards on how the Exercises feature is wired into App.jsx. App.jsx is read as text because the
   app has no DOM test harness; the behaviour itself is covered in exercises.test.js, api.test.js and
   serverMapping.test.js.

   Exercises are posted by an admin, one subject at a time (Mathematics, Physics, Chemistry, Biology), with
   the teacher and school they came from. Students browse them like the exam papers, by subject instead of
   year. There are no teacher accounts, and no timed attempts or photo submissions.
   Run with:  node --test Frontend/exerciseWiring.test.js */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const app = readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
const ui = readFileSync(new URL("./ExerciseUi.jsx", import.meta.url), "utf8");
const defined = (key) => (app.match(new RegExp(`[\\s,{]${key}:`, "g")) || []).length;

// Every string key the feature uses, across App.jsx and ExerciseUi.jsx.
const KEYS = [
  "deleteWord",
  "exercisesTitle", "exercisesDesc", "exercisesEmpty", "exLoading", "exLoadError",
  "exTeacherLabel", "exSchoolLabel", "exUntitled", "exFilePdf", "exFilePhoto", "exFilePhotos",
  "adminExercisesTitle", "adminExercisesDesc", "adminExercisesEmpty", "exNoFilesYet", "exDeleteAsk", "exEditBtn",
  "exFormTeacherLabel", "exFormSchoolLabel", "exFormTitleLabel", "exFormRequired", "exFormSave",
  "exFormAttachmentsHint", "exAddAttachment", "exAttachmentsCount", "exFormDone", "exNewExercise",
  "exUploading", "exRemoveFile",
  "exErr_not_image", "exErr_too_big", "exErr_generic", "exErr_too_many_attachments",
];

// What the removed teacher / timed-attempt features used. None of it may linger.
const REMOVED_KEYS = [
  "accountKindTitle", "accountKindDesc", "accountKindStudentTitle", "accountKindStudentDesc",
  "accountKindTeacherTitle", "accountKindTeacherDesc", "teacherDetailsTitle", "teacherDetailsDesc",
  "schoolNameLabel", "schoolNamePlaceholder", "subjectsTaughtLabel", "subjectsTaughtPlaceholder", "subjectsTaughtHint", "teacherApplySubmit",
  "errAlreadyRunning", "errAlreadySubmitted", "errNoPhotos", "errTooManyPhotos", "errNotRunning",
  "exStartBtn", "exErr_already_running", "exErr_already_submitted", "exErr_no_photos", "exErr_too_many_photos",
  "exElapsed", "exOverBy", "exLeft", "exCancelAsk", "exCancelYes", "exKeepGoing", "exFinishBtn", "exCancelBtn",
  "exSubmitTitle", "exSubmitDesc", "exTakePhoto", "exChoosePhoto", "exPhotosCount", "exRemovePhoto",
  "exSubmitBtn", "exBackToExercise", "exDoneTitle", "exDonePhotos", "exDoneBack",
  "exTeacherComments", "exSubmissionCount", "exFormInstructionsLabel", "exFormTimeLimitLabel", "exFormNoLimit",
  "exStatus_running", "exStatus_submitted", "exStatus_expired", "exStatus_cancelled",
  "exPhotosWord", "exNoComments", "exCommentPlaceholder", "myExercisesTitle", "myExercisesDesc", "myExercisesEmpty", "exNoSubmissions",
];

test("every string the Exercises feature uses exists once in English and once in Khmer", () => {
  for (const key of KEYS) assert.equal(defined(key), 2, `${key} should be defined once in English and once in Khmer, found ${defined(key)}`);
});

test("the strings of the removed teacher and timed-attempt features are gone", () => {
  for (const key of REMOVED_KEYS) {
    assert.equal(defined(key), 0, `${key} should be removed from App.jsx`);
    assert.doesNotMatch(ui, new RegExp(`tr\\("${key}"\\)`), `${key} should not be used in ExerciseUi.jsx`);
  }
});

test("the timer and photo-submission modules are gone", () => {
  for (const file of ["exerciseSessions.js", "exerciseSessions.test.js", "useExerciseSessions.js"]) {
    assert.equal(existsSync(new URL(`./${file}`, import.meta.url)), false, `${file} should be deleted`);
  }
  assert.doesNotMatch(app, /useExerciseSessions|ExerciseAttempt|ExerciseTimerBar|ExerciseSubmitSheet|ExerciseResultCard/);
});

test("registration is student-only: it opens on the account step and has no teacher path", () => {
  const register = app.slice(app.indexOf("function Register("), app.indexOf("/* ════════════════════════ Dashboard"));
  assert.match(register, /useState\(initialStep \?\? 1\)/);
  assert.doesNotMatch(register, /accountKind|isTeacher|schoolName|subjectsTaught|step === 0/);
  assert.match(register, /onBack=\{onBack\} lang=\{lang\} setLang=\{isUni \? undefined : setLang\}/);
});

test("no part of the app knows about a teacher account any more", () => {
  assert.doesNotMatch(app, /isTeacherProfile|TEACHER_NAV|teacherExercises|TeacherExercises|role === "teacher"/);
  assert.doesNotMatch(app, /accountKind|applyTeacher|pendingTeacherReview/);
  const handler = app.slice(app.indexOf("const handleRegister = async"), app.indexOf("const handleBackToPreferences ="));
  assert.doesNotMatch(handler, /teacher/i);
  assert.match(handler, /api\.register\(registrationToPayload\(reg\)\)/);
});

test("the sidebar gives science students an Exercises tab, and admins an Admin tab", () => {
  assert.match(app, /import \{[^}]*\bEXERCISE_SUBJECTS\b[^}]*\} from "\.\/exercises\.js";/);
  assert.match(app, /import \{[^}]*\bcanBrowseExercises\b[^}]*\bisAdmin\b[^}]*\} from "\.\/exercises\.js";|import \{[^}]*\bisAdmin\b[^}]*\bcanBrowseExercises\b[^}]*\} from "\.\/exercises\.js";/);
  assert.match(app, /\{ id: "exercises", label: "Exercises"/);
  assert.match(app, /const ADMIN_NAV = \[\s*\{ id: "adminExercises"/);
  // The Exercises tab is hidden unless the student can browse them; the Admin tab only shows for an admin.
  assert.match(app, /n\.id !== "exercises" \|\| canBrowseExercises\(p\)/);
  assert.match(app, /isAdmin\(profile\) \? \[\.\.\.ADMIN_NAV\] : \[\]|isAdmin\(profile\) \? ADMIN_NAV : \[\]/);
  assert.match(app, /exercises: <Exercises api=\{api\}/);
});

test("the admin screen cannot be reached by a non-admin who knows the tab id", () => {
  assert.match(app, /adminExercises: isAdmin\(profile\) \? <AdminExercises api=\{api\}|isAdmin\(profile\) && <AdminExercises/);
});

test("a student browses exercises by subject pills, in a two-column grid of cards with teacher and school", () => {
  const student = app.slice(app.indexOf("function Exercises("), app.indexOf("function AdminExercises("));
  assert.match(student, /<SubjectPills /);
  assert.match(student, /api\.getExercises\(subjectId\(/);
  assert.match(student, /grid grid-cols-1 sm:grid-cols-2 gap-4/);
  assert.match(student, /<ExerciseCard /);
  assert.match(student, /<ExerciseViewer /);
  assert.match(ui, /exercise\.teacherName/);
  assert.match(ui, /exercise\.schoolName/);
  assert.match(ui, /tr\("exTeacherLabel"\)/);
  assert.match(ui, /tr\("exSchoolLabel"\)/);
});

test("the subject pills are the four subjects, in a scrolling row like the year pills in Browse", () => {
  const pills = app.slice(app.indexOf("function SubjectPills("), app.indexOf("function AdminExercises("));
  assert.match(pills, /EXERCISE_SUBJECTS\.map\(\(s\) =>/);
  assert.match(pills, /flex gap-2 overflow-x-auto pb-1 eai-scroll/);
  assert.match(pills, /subjectLabel\(s, lang\)/);
});

test("the viewer opens a PDF in a frame with an open-in-new-tab link, and photos inline", () => {
  const viewer = ui.slice(ui.indexOf("export function ExerciseViewer("), ui.indexOf("export function ExerciseAttachmentThumb("));
  assert.match(viewer, /<iframe src=\{`\$\{f\.url\}#view=FitH`\}/);
  assert.match(viewer, /target="_blank" rel="noopener noreferrer"/);
  assert.match(viewer, /<img src=\{f\.url\}/);
});

test("an admin picks a subject pill, then posts, edits or deletes exercises under it", () => {
  const admin = app.slice(app.indexOf("function AdminExercises("), app.indexOf("/* ════════════════════════ Practice — interactive exercises"));
  assert.match(admin, /<SubjectPills /);
  assert.match(admin, /api\.getAdminExercises\(subjectId\(/);
  assert.match(admin, /api\.createAdminExercise\(\{ subject: subjectId\(/);
  assert.match(admin, /api\.updateAdminExercise\(/);
  assert.match(admin, /api\.deleteAdminExercise\(/);
  assert.match(admin, /api\.addExerciseAttachment\(exerciseId, file\)/);
  assert.match(admin, /api\.removeExerciseAttachment\(exerciseId, attachmentId\)/);
  // Deleting removes the files too, so it asks first.
  assert.match(admin, /window\.confirm\(tr\("exDeleteAsk"\)\)/);
});

test("the admin form needs the teacher and school, takes a PDF or photos, and only photos are shrunk", () => {
  const form = ui.slice(ui.indexOf("export function AdminExerciseForm("), ui.indexOf("export const NewExerciseButton"));
  assert.match(form, /!teacherName\.trim\(\) \|\| !schoolName\.trim\(\)/);
  assert.match(form, /onSave\(\{ teacherName: teacherName\.trim\(\), schoolName: schoolName\.trim\(\), title: title\.trim\(\) \|\| null \}\)/);
  assert.match(form, /accept="image\/\*,application\/pdf" multiple/);
  assert.match(form, /if \(file\.type\.startsWith\("image\/"\)\) \{/);
  assert.match(form, /await shrinkImage\(file\)/);
  assert.match(form, /onAddAttachment\(exercise\.id, toUpload\)/);
  assert.match(form, /onRemoveAttachment\(exercise\.id, id\)/);
  assert.match(ui, /import \{ shrinkImage \} from "\.\/imageUtils\.js";/);
});

test("a card tells the admin when an exercise has no file yet, since students cannot see it", () => {
  assert.match(ui, /tr\("exNoFilesYet"\)/);
});
