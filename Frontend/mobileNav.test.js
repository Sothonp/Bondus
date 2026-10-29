/* Tests for which navigation items go in the phone's bottom bar and which in its "More" sheet (Frontend/mobileNav.js).
   Run with:  node --test Frontend/mobileNav.test.js */
import { test } from "node:test";
import assert from "node:assert/strict";
import { splitMobileNav, moreIsActive, MOBILE_PRIMARY_IDS, MOBILE_HIDDEN_IDS } from "./mobileNav.js";

const item = (id, extra = {}) => ({ id, label: id, ...extra });
const ids = (list) => list.map((n) => n.id);

// The sidebar a science student sees (App.jsx's NAV with Exercises kept), then an admin's, a social student's, a university profile's.
const STUDENT = ["dashboard", "browse", "practice", "exercises", "universities", "coach", "progress", "wardrobe", "super"].map((id) => item(id));
const ADMIN = [...STUDENT, item("adminExercises")];
const SOCIAL = STUDENT.filter((n) => n.id !== "exercises");
const UNIVERSITY = ["universityHub", "explore", "universities", "coach", "progress", "wardrobe", "super"].map((id) => item(id));

test("the bottom bar holds Dashboard, Practice, AI coach and Wardrobe, in that order", () => {
  assert.deepEqual(ids(splitMobileNav(STUDENT).primary), ["dashboard", "practice", "coach", "wardrobe"]);
});

test("everything else is in More, in the sidebar's own order, with Super Bondus and Admin there", () => {
  assert.deepEqual(ids(splitMobileNav(STUDENT).more), ["browse", "exercises", "universities", "progress", "super"]);
  assert.deepEqual(ids(splitMobileNav(ADMIN).more), ["browse", "exercises", "universities", "progress", "super", "adminExercises"]);
});

test("a social-science student has no Exercises in More", () => {
  assert.deepEqual(ids(splitMobileNav(SOCIAL).more), ["browse", "universities", "progress", "super"]);
});

test("a university profile gets its hub, the coach and the wardrobe in the bar", () => {
  const { primary, more } = splitMobileNav(UNIVERSITY);
  assert.deepEqual(ids(primary), ["universityHub", "coach", "wardrobe"]);
  assert.deepEqual(ids(more), ["explore", "universities", "progress", "super"]);
});

test("no page becomes unreachable: every item appears exactly once", () => {
  for (const nav of [STUDENT, ADMIN, SOCIAL, UNIVERSITY]) {
    const { primary, more } = splitMobileNav(nav);
    const shown = ids([...primary, ...more]).sort();
    const expected = ids(nav).filter((id) => !MOBILE_HIDDEN_IDS.includes(id)).sort();
    assert.deepEqual(shown, expected);
  }
});

test("items keep their own details (icon, premium flag, labels)", () => {
  const nav = [item("dashboard"), item("super", { premium: true, labelKm: "Super Bondus" })];
  assert.deepEqual(splitMobileNav(nav).more[0], { id: "super", label: "super", premium: true, labelKm: "Super Bondus" });
});

test("the bar never shows more than four pages, so the fifth slot is always More", () => {
  assert.ok(MOBILE_PRIMARY_IDS.length >= 4);
  for (const nav of [STUDENT, ADMIN, SOCIAL, UNIVERSITY]) assert.ok(splitMobileNav(nav).primary.length <= 4);
});

test("More lights up when the open page lives in it, and not when it is in the bar", () => {
  const { more } = splitMobileNav(STUDENT);
  assert.equal(moreIsActive("progress", more), true);
  assert.equal(moreIsActive("exercises", more), true);
  assert.equal(moreIsActive("practice", more), false);
  assert.equal(moreIsActive("dashboard", more), false);
});

test("an empty or missing nav does not crash", () => {
  assert.deepEqual(splitMobileNav([]), { primary: [], more: [] });
  assert.deepEqual(splitMobileNav(undefined), { primary: [], more: [] });
});
