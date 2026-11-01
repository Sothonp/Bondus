/* The warm-up's words: both languages say the same things, and every word the screen asks for exists.
   Run with:  node --test Frontend/warmupStrings.test.js */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { WARMUP_STRINGS, warmupText, fillWarmup } from "./warmupStrings.js";

test("English and Khmer have exactly the same keys, and none is empty", () => {
  assert.deepEqual(Object.keys(WARMUP_STRINGS.km).sort(), Object.keys(WARMUP_STRINGS.en).sort());
  for (const lang of ["en", "km"]) for (const [k, v] of Object.entries(WARMUP_STRINGS[lang])) assert.ok(String(v).trim(), `${lang}.${k} is empty`);
});

test("every key the screen asks for is defined", () => {
  const code = readFileSync(new URL("./WarmUpGate.jsx", import.meta.url), "utf8");
  const used = new Set([...code.matchAll(/\bw\(\s*"(\w+)"/g)].map((m) => m[1]));
  for (const key of ["subtitleCold", "subtitleDormant", "subtitleLit"]) used.add(key); // chosen by a ternary
  for (const key of ["slotWeak", "slotReview", "slotFresh"]) used.add(key);             // looked up through SLOT_KEY
  for (const key of used) assert.ok(key in WARMUP_STRINGS.en, `"${key}" is used by the screen but not defined`);
});

test("placeholders are filled in, an unknown language falls back to English, and an unknown key shows itself", () => {
  assert.equal(fillWarmup(warmupText("en", "questionOf"), { n: 2, total: 3 }), "Question 2 of 3");
  assert.equal(fillWarmup(warmupText("km", "score"), { c: "២", total: "៣" }).includes("{"), false);
  assert.equal(warmupText("fr", "title"), WARMUP_STRINGS.en.title);
  assert.equal(warmupText("en", "nope"), "nope");
  for (const lang of ["en", "km"]) for (const v of Object.values(WARMUP_STRINGS[lang])) {
    for (const [, name] of String(v).matchAll(/\{(\w+)\}/g)) assert.ok(["n", "total", "c"].includes(name), `unknown placeholder {${name}}`);
  }
});
