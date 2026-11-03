import { test } from "node:test";
import assert from "node:assert/strict";
import { RIBBON_SUBJECTS, RIBBON_STRINGS, scrollState, scrollStep } from "./subjectRibbon.js";

test("the ribbon lists the eleven subjects in the requested order", () => {
  assert.deepEqual(RIBBON_SUBJECTS.map((s) => s.en), [
    "Math", "Khmer", "Physics", "Chemistry", "English", "Biology", "History", "Earth & Science", "Economy", "Morality", "Geography",
  ]);
});

test("every subject has a unique id, a Khmer name and a colour", () => {
  const ids = RIBBON_SUBJECTS.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const s of RIBBON_SUBJECTS) {
    assert.match(s.km, /[ក-៿]/, `${s.id} has Khmer letters`);
    assert.match(s.color, /^#[0-9A-Fa-f]{6}$/, `${s.id} has a hex colour`);
  }
});

test("both languages have every ribbon string", () => {
  assert.deepEqual(Object.keys(RIBBON_STRINGS.km).sort(), Object.keys(RIBBON_STRINGS.en).sort());
});

test("scrollState: content that fits has nothing to scroll", () => {
  assert.deepEqual(scrollState({ scrollLeft: 0, clientWidth: 900, scrollWidth: 900 }), { canLeft: false, canRight: false });
});

test("scrollState: at the start only right is possible, at the end only left, in the middle both", () => {
  assert.deepEqual(scrollState({ scrollLeft: 0, clientWidth: 400, scrollWidth: 1200 }), { canLeft: false, canRight: true });
  assert.deepEqual(scrollState({ scrollLeft: 400, clientWidth: 400, scrollWidth: 1200 }), { canLeft: true, canRight: true });
  assert.deepEqual(scrollState({ scrollLeft: 800, clientWidth: 400, scrollWidth: 1200 }), { canLeft: true, canRight: false });
});

test("scrollState: sub-pixel rounding at the edges does not leave a dead arrow", () => {
  assert.deepEqual(scrollState({ scrollLeft: 799.6, clientWidth: 400, scrollWidth: 1200 }), { canLeft: true, canRight: false });
  assert.deepEqual(scrollState({ scrollLeft: 0.4, clientWidth: 400, scrollWidth: 1200 }), { canLeft: false, canRight: true });
});

test("scrollStep moves about three quarters of the visible width, never less than 160px, in the arrow's direction", () => {
  assert.equal(scrollStep(800, 1), 600);
  assert.equal(scrollStep(800, -1), -600);
  assert.equal(scrollStep(100, 1), 160);
  assert.equal(scrollStep(100, -1), -160);
});

/* The endless loop is CSS (STYLES in App.jsx) plus the three copies in SubjectRibbon.jsx. */
import { readFileSync } from "node:fs";
const css = (() => { const app = readFileSync(new URL("./App.jsx", import.meta.url), "utf8"); const a = app.indexOf(".eai-ribbon{"); return app.slice(a, app.indexOf("/* ", a + 2000)); })();

test("the belt slides left by one list's width (a third of three lists), forever, and pauses while touched or focused", () => {
  // Breaks if: the loop stutters at its join (the shift is not exactly one list), stops after one pass, or cannot be tapped.
  assert.match(css, /\.eai-ribbon-belt\{[^}]*animation:eai-ribbon-run var\(--ribbon-seconds,50s\) linear infinite/);
  assert.match(css, /@keyframes eai-ribbon-run\{ from\{ transform:translateX\(0\); \} to\{ transform:translateX\(-33\.33333%\); \} \}/);
  assert.match(css, /\.eai-ribbon-belt:active, \.eai-ribbon-belt:focus-within\{ animation-play-state:paused; \}/);
  assert.match(css, /@media \(hover:hover\)\{ \.eai-ribbon-belt:hover\{ animation-play-state:paused; \} \}/);
});

test("with reduced motion nothing moves: copies hidden, hand scrolling and the arrows come back", () => {
  // Breaks if: people who ask their device for less motion get a strip that never stops moving.
  const reduced = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce){"));
  assert.match(reduced, /\.eai-ribbon-belt\{ animation:none;/);
  assert.match(reduced, /\.eai-ribbon-clone\{ display:none; \}/);
  assert.match(reduced, /\.eai-ribbon-track\{ overflow-x:auto;/);
  assert.match(reduced, /@media \(min-width:640px\) and \(prefers-reduced-motion: reduce\)\{ \.eai-ribbon-arrow\{ display:grid; \} \}/);
});
