/* Guards on how the Profile page is wired into App.jsx. App.jsx is read as text because the app has no DOM test
   harness; the behaviour itself is covered in profileForm.test.js and profileUi.ssr.test.js.
   Run with:  node --test Frontend/profileWiring.test.js */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PROFILE_STRING_KEYS } from "./profileForm.js";
import { clearHistory, historyKey } from "./coachHistory.js";

const read = (name) => readFileSync(new URL(`./${name}`, import.meta.url), "utf8");
const app = read("App.jsx");
const ui = read("ProfileUi.jsx");

test("App.jsx imports the page and renders it as the profile tab", () => {
  assert.match(app, /import \{ ProfilePage \} from "\.\/ProfileUi\.jsx";/);
  assert.match(app, /profile: <ProfilePage /);
});

test("the header avatar is a button that opens the profile, with an accessible name", () => {
  assert.match(app, /<button onClick=\{\(\) => go\("profile"\)\} aria-label=\{tr\("profileOpen"\)\}/);
});

test("the sidebar has a Profile link above Log out", () => {
  assert.match(app, /go\("profile"\)[^]{0,500}t\(lang, "profileTitle"\)[^]{0,500}onClick=\{handleLogout\}/);
});

test("every message key the page uses exists in both the English and the Khmer table", () => {
  for (const key of PROFILE_STRING_KEYS) {
    const defined = app.match(new RegExp(`(?:^|[\\s,{])${key}:`, "g")) ?? [];
    assert.ok(defined.length >= 2, `${key} should be defined in both language tables (found ${defined.length})`);
  }
});

test("ProfileUi.jsx does not import App.jsx (a circular import); App passes the shared pieces in as props", () => {
  assert.doesNotMatch(ui, /from "\.\/App\.jsx"/);
  assert.match(app, /parts=\{\{ FormField, SelectField, SubjectChip \}\}/);
});

test("App.jsx defines the password handlers and passes them, with serverMode, to the page", () => {
  for (const name of ["handleChangePassword", "handleRequestResetCode", "handleConfirmResetCode"]) assert.match(app, new RegExp(`const ${name} = async`));
  assert.match(app, /onChangePassword=\{handleChangePassword\}/);
  assert.match(app, /onRequestResetCode=\{handleRequestResetCode\}/);
  assert.match(app, /onConfirmResetCode=\{handleConfirmResetCode\}/);
  assert.match(app, /serverMode=\{SERVER_MODE\}/);
});

test("App.jsx defines the delete-account handler and passes it to the page", () => {
  assert.match(app, /const handleDeleteAccount = async/);
  assert.match(app, /onDeleteAccount=\{handleDeleteAccount\}/);
});

test("ProfileUi.jsx renders a delete-account card that asks onDeleteAccount, gated on oauthLinked for the password field", () => {
  assert.match(ui, /function DeleteAccountCard\(/);
  assert.match(ui, /onDeleteAccount\(\{ currentPassword \}\)/);
  assert.match(ui, /!profile\.oauthLinked/);
  assert.match(ui, /<DeleteAccountCard /);
});

test("ProfileUi.jsx merges a refreshed profile into the form instead of replacing it, so unsent edits survive a save", () => {
  assert.match(ui, /mergeProfileForm\(/);
  assert.doesNotMatch(ui, /setForm\(JSON\.parse\(profileKey\)\)/);
});

test("on a phone the top bar's avatar opens the profile too (the desktop header and sidebar are hidden there)", () => {
  assert.match(app, /<MobileTopBar[^]{0,600}onProfile=\{\(\) => go\("profile"\)\}[^]{0,200}profileLabel=\{tr\("profileOpen"\)\}/);
  assert.match(read("MobileNav.jsx"), /<button onClick=\{onProfile\} aria-label=\{profileLabel\}/);
});

/* handleDeleteAccount: a failed deletion must return early -- before the storage key is even captured for later
   use -- and never touch storage or the session. A successful one clears this device's own copy (the offline
   snapshot and this student's AI history, captured by key up front, since resetSession() clears `profile`) and
   only then resets the session. These two regexes pin that shape; the companion test below exercises the real
   clearHistory() to prove another student's saved chats survive it. */
const deleteAccountFn = app.match(/const handleDeleteAccount = async[^]*?\n  \};/)?.[0];

test("handleDeleteAccount captures the history key up front and returns immediately on failure, without touching storage", () => {
  assert.ok(deleteAccountFn, "handleDeleteAccount should be defined in App.jsx");
  assert.match(
    deleteAccountFn,
    /const historyUserKey = userKeyOf\(profile\);\s*try \{\s*await api\.deleteAccount\(\{ currentPassword \}\);\s*\} catch \(err\) \{\s*return \{ ok: false, code: err\?\.code, retryAfter: err\?\.retryAfter \};\s*\}/,
  );
});

test("handleDeleteAccount only clears the snapshot and this student's AI history, and only after the server confirms deletion", () => {
  assert.match(
    deleteAccountFn,
    /const storage = safeStorage\(\);\s*try \{ storage\?\.removeItem\(STORAGE_KEY\); \} catch \{[^}]*\}\s*clearHistory\(storage, historyUserKey\);\s*resetSession\(\);/,
  );
});

test("a successful deletion removes this device's state snapshot and the deleting student's AI history, never another student's", () => {
  const storageKey = app.match(/const STORAGE_KEY = "([^"]+)";/)?.[1];
  assert.ok(storageKey, "STORAGE_KEY should be defined in App.jsx");
  const data = new Map([
    [storageKey, '{"profile":{}}'],
    [historyKey("student-a"), "student A's saved chats"],
    [historyKey("student-b"), "student B's saved chats"],
  ]);
  const storage = {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, v),
    removeItem: (k) => data.delete(k),
  };

  // The success path of handleDeleteAccount, for student A.
  storage.removeItem(storageKey);
  clearHistory(storage, "student-a");

  assert.equal(storage.getItem(storageKey), null);
  assert.equal(storage.getItem(historyKey("student-a")), null);
  assert.equal(storage.getItem(historyKey("student-b")), "student B's saved chats", "another student's history must survive");
});
