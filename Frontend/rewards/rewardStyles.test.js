/* The rewards feature's CSS (Frontend/rewards/rewardStyles.js, appended to App's STYLES): every eai-rw-* class a
   rewards component uses has a rule, and motion is switched off for reduced-motion users.
   Run with:  node --test Frontend/rewards/rewardStyles.test.js */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { REWARD_STYLES } from "./rewardStyles.js";

test("every eai-rw-* class used by a rewards component has a rule", () => {
  const dir = new URL(".", import.meta.url);
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".jsx"))) {
    const used = new Set(readFileSync(new URL(file, dir), "utf8").match(/eai-rw-[a-z0-9-]+/g) || []);
    for (const cls of used) assert.match(REWARD_STYLES, new RegExp(`\\.${cls}(?![a-z0-9-])`), `${file}: no CSS rule for .${cls}`);
  }
});
test("animations are switched off under prefers-reduced-motion", () => {
  assert.match(REWARD_STYLES, /prefers-reduced-motion: reduce/);
});
