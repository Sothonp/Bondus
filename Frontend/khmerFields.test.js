/* Form fields in Khmer mode grow to fit their text instead of being a fixed 48px box (Khmer stacks vowels and subscripts
   above and below the line, and the text touched the border or was clipped on a phone). App.jsx is read as text because the app
   has no DOM test harness.
   Run with:  node --test Frontend/khmerFields.test.js */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
const styles = app.slice(app.indexOf("const STYLES = `"));
const rule = (selector) => {
  const at = styles.indexOf(selector);
  assert.ok(at >= 0, `${selector} is missing`);
  return styles.slice(at, styles.indexOf("}", at));
};
const num = (css, prop) => Number(new RegExp(`(?<![-a-z])${prop}:\\s*([0-9.]+)`).exec(css)?.[1]);

test("in Khmer, onboarding and filter fields grow to fit: auto height, a real minimum, room above and below", () => {
  // Breaks if: Khmer text sits against the border again, or is clipped at the bottom.
  const css = rule(".eai-km-root .eai-ob-input, .eai-km-root input.eai-input");
  assert.match(css, /height:\s*auto/);
  assert.ok(num(css, "min-height") >= 50);
  assert.ok(num(css, "padding-top") >= 10 && num(css, "padding-bottom") >= 10);
  assert.ok(num(css, "line-height") >= 1.6);
  assert.ok(css.includes(".eai-km-root select.eai-input"));
});

test("English is untouched: the field rules are all under .eai-km-root", () => {
  // Breaks if: the taller fields leak into English.
  for (const line of styles.split("\n").filter((l) => /min-height:5[0-9]px/.test(l) && /padding-top:1[01]px/.test(l))) {
    assert.ok(line.includes(".eai-km-root") || line.startsWith("  height:auto"), line);
  }
});
