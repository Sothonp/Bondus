/* The rewards feature's English/Khmer copy (Frontend/rewards/rewardStrings.js): both languages stay in step, the
   interpolation helper works, and every string key a rewards component asks for really exists.
   Run with:  node --test Frontend/rewards/rewardStrings.test.js */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { REWARD_STRINGS, rt, RARITY_LABEL_KEY, SLOT_LABEL_KEY, HINT_KEY } from "./rewardStrings.js";

test("English and Khmer carry exactly the same keys, none of them empty", () => {
  assert.deepEqual(Object.keys(REWARD_STRINGS.km).sort(), Object.keys(REWARD_STRINGS.en).sort());
  for (const lang of ["en", "km"]) for (const [key, text] of Object.entries(REWARD_STRINGS[lang])) assert.ok(typeof text === "string" && text.trim(), `${lang}.${key}`);
});
test("rt fills {placeholders}, and writes numbers with Khmer digits in Khmer", () => {
  assert.equal(rt("en", "hintLevel", { n: 5 }), "Reach level 5");
  assert.equal(rt("km", "rwLevel", { n: 3 }), "កម្រិត ៣");
  assert.equal(rt("en", "rwToNext", { n: 191, m: 4 }), "191 XP to Level 4");
});
test("rt falls back: an unknown key returns the key, a key missing from Khmer shows English", () => {
  assert.equal(rt("en", "noSuchKey"), "noSuchKey");
  const km = REWARD_STRINGS.km.rwNew;
  delete REWARD_STRINGS.km.rwNew;
  try { assert.equal(rt("km", "rwNew"), "NEW"); } finally { REWARD_STRINGS.km.rwNew = km; }
});
test("the slot, rarity and hint label tables point at real keys", () => {
  for (const table of [RARITY_LABEL_KEY, SLOT_LABEL_KEY, HINT_KEY]) for (const key of Object.values(table)) assert.ok(key in REWARD_STRINGS.en, key);
});
test("every literal key passed to rt() in a rewards component exists", () => {
  const dir = new URL(".", import.meta.url);
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".jsx"))) {
    const source = readFileSync(new URL(file, dir), "utf8");
    for (const m of source.matchAll(/\brt\(\s*[A-Za-z_]+\s*,\s*"([A-Za-z0-9_]+)"/g)) assert.ok(m[1] in REWARD_STRINGS.en, `${file}: unknown string key "${m[1]}"`);
  }
});
