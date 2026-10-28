/* Guards on how the Profile page is wired into App.jsx. App.jsx is read as text because the app has no DOM test
   harness; the behaviour itself is covered in profileForm.test.js and profileUi.ssr.test.js.
   Run with:  node --test Frontend/profileWiring.test.js */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PROFILE_STRING_KEYS } from "./profileForm.js";

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
