/* Tests for the loading screen's shared pieces (Frontend/loadingScreen.js).
   Run with:  node --test Frontend/loadingScreen.test.js   (no dependencies — Node's built-in runner) */
import { test } from "node:test";
import assert from "node:assert/strict";
import { LOADING_CSS, SPLASH_ID, loadingMessage, loadingMarkup, dismissSplash } from "./loadingScreen.js";

// WCAG contrast ratio between two #RRGGBB colours.
const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };

// The declarations of the first rule whose selector is exactly `selector`, as { property: value }.
function rule(selector) {
  const at = LOADING_CSS.split("\n").findIndex((l) => l.startsWith(`${selector}{`));
  assert.ok(at >= 0, `no rule for ${selector}`);
  const body = LOADING_CSS.split("\n").slice(at).join("\n").match(/\{([^}]*)\}/)[1];
  return Object.fromEntries(body.split(";").map((d) => d.trim()).filter(Boolean).map((d) => { const i = d.indexOf(":"); return [d.slice(0, i).trim(), d.slice(i + 1).trim()]; }));
}
const keyframes = (name) => LOADING_CSS.match(new RegExp(`@keyframes ${name}\\{([\\s\\S]*?)\\n\\}`))?.[1] ?? assert.fail(`no @keyframes ${name}`);

test("the text is 'Getting things ready', in Khmer when the app is in Khmer", () => {
  assert.equal(loadingMessage("en"), "Getting things ready");
  assert.match(loadingMessage("km"), /[ក-៿]/);
  assert.equal(loadingMessage("fr"), loadingMessage("en"), "anything else falls back to English");
});

test("the overlay is full screen, centred, above the page, on white (dark: #111827)", () => {
  const o = rule(".eai-ld");
  assert.equal(o.position, "fixed");
  assert.equal(o.inset, "0");
  assert.equal(o["z-index"], "50");
  assert.equal(o.display, "flex");
  assert.equal(o["flex-direction"], "column");
  assert.equal(o["align-items"], "center");
  assert.equal(o["justify-content"], "center");
  assert.equal(o.background.toUpperCase(), "#FFFFFF");
  assert.equal(rule(".eai-ld-dark").background.toUpperCase(), "#111827");
});

test("the text is medium gray, readable on both backgrounds", () => {
  assert.equal(rule(".eai-ld").color.toUpperCase(), "#6B7280");
  assert.equal(rule(".eai-ld-dark").color.toUpperCase(), "#9CA3AF");
  assert.ok(contrast("#6B7280", "#FFFFFF") >= 4.5, "light");
  assert.ok(contrast("#9CA3AF", "#111827") >= 4.5, "dark");
});

test("the owl sways from -6 to +6 degrees with a small hop each time it passes upright", () => {
  const k = keyframes("eai-ld-sway");
  assert.match(k, /rotate\(-6deg\)/);
  assert.match(k, /rotate\(6deg\)/);
  assert.match(k, /translateY\(-\d+(\.\d+)?px\)/, "hops");
  const hops = [...k.matchAll(/(\d+)%\s*\{[^}]*rotate\(0deg\)[^}]*translateY\(-/g)];
  assert.equal(hops.length, 2, "twice per sway: once each way");
  assert.match(rule(".eai-ld-body").animation, /infinite/);
});

test("the feet tap in turn: the same loop, half a loop apart", () => {
  const left = rule(".eai-ld-foot-l").animation, right = rule(".eai-ld-foot-r");
  const loop = parseFloat(left.match(/([\d.]+)s/)[1]);
  assert.ok(Math.abs(parseFloat(right["animation-delay"]) + loop / 2) < 1e-9, `delay ${right["animation-delay"]} for a ${loop}s loop`);
  assert.match(keyframes("eai-ld-tap"), /translateY\(-/);
});

test("the head and headphones bounce, and music notes float up and fade", () => {
  assert.match(rule(".eai-ld-head").animation, /eai-ld-nod/);
  const note = keyframes("eai-ld-note");
  assert.match(note, /opacity:\s*0/);
  assert.match(note, /opacity:\s*1/);
  assert.match(note, /translateY\(-\d+/);
});

test("it fades in after a short delay, so a quick load never flashes it", () => {
  assert.match(rule(".eai-ld").animation, /eai-ld-in [\d.]+s ease-out \.15s forwards/);
});

test("with reduced motion the owl stands still and the notes are gone", () => {
  const block = LOADING_CSS.match(/@media \(prefers-reduced-motion: reduce\)\{([\s\S]*?)\n\}/)?.[1] ?? "";
  assert.match(block, /animation:\s*none/);
  assert.match(block, /\.eai-ld-note\{[^}]*display:\s*none/);
});

test("the markup is a status region with the message, a decorative owl, and the message escaped", () => {
  const html = loadingMarkup({ lang: "en", message: "Hello <b>&</b>" });
  assert.match(html, /^<div class="eai-ld" role="status" aria-live="polite">/);
  assert.match(html, /Hello &lt;b&gt;&amp;&lt;\/b&gt;/);
  assert.match(html, /<svg class="eai-ld-owl"[^>]*aria-hidden="true"/);
  assert.equal((html.match(/class="eai-ld-note"/g) || []).length, 3, "three notes");
  assert.ok(!/<b>/.test(html));
});

test("dark mode and Khmer are class and attribute switches on the same markup", () => {
  const dark = loadingMarkup({ dark: true });
  assert.match(dark, /class="eai-ld eai-ld-dark"/);
  const km = loadingMarkup({ lang: "km" });
  assert.ok(km.includes(loadingMessage("km")));
  assert.match(km, /lang="km"/);
  assert.equal(loadingMarkup({ lang: "en" }), loadingMarkup({}), "English and light are the defaults");
});

test("the first-load splash is the same markup with an id", () => {
  const html = loadingMarkup({ id: SPLASH_ID });
  assert.match(html, new RegExp(`^<div id="${SPLASH_ID}" class="eai-ld"`));
  assert.equal(html.replace(` id="${SPLASH_ID}"`, ""), loadingMarkup({}));
});

test("no gradient or clip id is defined twice in one drawing", () => {
  const ids = [...loadingMarkup({}).matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(new Set(ids).size, ids.length);
  for (const used of loadingMarkup({}).matchAll(/url\(#([^)]+)\)/g)) assert.ok(ids.includes(used[1]), `${used[1]} is defined`);
});

test("dismissSplash fades the splash out and removes it afterwards; no splash is a no-op", () => {
  const classes = new Set(); let removed = false, timer = null;
  const el = { classList: { add: (c) => classes.add(c) }, remove: () => { removed = true; } };
  const doc = { getElementById: (id) => (id === SPLASH_ID ? el : null) };
  assert.equal(dismissSplash(doc, (fn, ms) => { timer = { fn, ms }; }), true);
  assert.ok(classes.has("eai-ld-leaving"));
  assert.equal(removed, false, "still there while it fades");
  assert.ok(timer.ms >= 250 && timer.ms <= 600);
  timer.fn();
  assert.equal(removed, true);
  assert.equal(dismissSplash({ getElementById: () => null }, () => assert.fail("no timer")), false);
});
