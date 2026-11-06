/* Khmer is set with more room than Latin (see the .eai-km-root block in App.jsx): it stacks vowels and subscripts above and
   below the line and has no spaces between words, so Tailwind's tight Latin line heights and the headings' negative
   letter-spacing made it look cramped on a phone. App.jsx is read as text because the app has no DOM test harness.
   Run with:  node --test Frontend/khmerSpacing.test.js */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
const styles = app.slice(app.indexOf("const STYLES = `"));
const block = (selector) => {
  const at = styles.indexOf(`${selector}{`);
  assert.ok(at >= 0, `${selector} rule is missing`);
  return styles.slice(at, styles.indexOf("}", at));
};
const lineHeightsIn = (css) => [...css.matchAll(/--(?:text-[a-z0-9]+--line-height|leading-[a-z]+):([0-9.]+)/g)].map((m) => ({ name: m[0].split(":")[0], value: Number(m[1]) }));

test("Khmer mode raises Tailwind's line-height variables, so text-xs/text-sm/leading-* follow everywhere", () => {
  // Breaks if: the variables are removed or lowered -- Khmer lines touch again (Tailwind's text-sm is 1.43).
  const vars = lineHeightsIn(block(".eai-km-root"));
  const byName = Object.fromEntries(vars.map((v) => [v.name, v.value]));
  for (const name of ["--text-xs--line-height", "--text-sm--line-height", "--text-base--line-height", "--leading-snug", "--leading-normal", "--leading-relaxed"]) {
    assert.ok(byName[name] >= 1.6, `${name} is ${byName[name]}`);
  }
  assert.ok(byName["--leading-tight"] >= 1.5);
});

test("Khmer mode takes the negative letter-spacing off headings", () => {
  // Breaks if: Khmer headings (.eai-display, the hero, lesson and onboarding titles) are tracked tighter again.
  const rule = styles.split("\n").find((line) => line.startsWith(".eai-km-root .eai-display"));
  assert.ok(rule, "rule is missing");
  assert.match(rule, /letter-spacing:\s*0/);
  for (const name of ["eai-hero-title", "eai-lesson-title", "eai-ob-title"]) assert.ok(rule.includes(`.eai-km-root .${name}`), name);
});

test("no Khmer line-height set in the stylesheet is below 1.5", () => {
  // Breaks if: someone adds a Khmer override with a Latin-sized line height.
  const khmerRules = styles.split("\n").filter((line) => line.startsWith(".eai-km-root") && !line.startsWith(".eai-km-root,"));
  for (const line of khmerRules) for (const m of line.matchAll(/(?<!-)line-height:\s*([0-9.]+)/g)) assert.ok(Number(m[1]) >= 1.5, line);
});

test("Latin keeps its own spacing: the variables are set on .eai-km-root only, never on .eai-root", () => {
  // Breaks if: the English app gets Khmer's loose lines.
  assert.ok(!/\.eai-root\s*\{[^}]*--text-sm--line-height/.test(styles));
});
