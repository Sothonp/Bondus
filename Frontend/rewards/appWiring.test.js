/* Guards on how Frontend/App.jsx is wired to the rewards feature. App.jsx is read as text because the app has no
   DOM test harness; these pin the few lines that, if lost, would silently break saving or the shared level-up logic.
   Run with:  node --test Frontend/rewards/appWiring.test.js */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const app = readFileSync(new URL("../App.jsx", import.meta.url), "utf8");

test("App saves, restores and clears rewards the way it does bonusXp", () => {
  assert.match(app, /localStorage\.setItem\(STORAGE_KEY, JSON\.stringify\(\{[^)]*\brewards\b/);
  assert.match(app, /langResults, rewards\]/);
  assert.match(app, /setRewards\(sanitizeRewards\(data\.rewards\)\)/);
  assert.match(app, /setRewards\(emptyRewards\(\)\)/);
});
test("App wraps the retake screen and the signed-in shell in the RewardsContext provider", () => {
  assert.equal((app.match(/<RewardsContext\.Provider value=\{rewardsApi\}>/g) || []).length, 2);
});
test("the level-up effect uses the shared advanceLevel", () => {
  assert.match(app, /advanceLevel\(\{ level: cur\.level, xpToNext: cur\.xpToNext \}/);
});
test("the reward styles are part of the app's STYLES", () => {
  assert.match(app, /\$\{REWARD_STYLES\}/);
});
