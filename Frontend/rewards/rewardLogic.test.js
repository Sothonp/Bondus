/* Tests for the treasure-box reward rules (Frontend/rewards/catalog.js + rewardLogic.js).
   Run with:  node --test Frontend/rewards/rewardLogic.test.js   (no dependencies — Node's built-in runner) */
import { test } from "node:test";
import assert from "node:assert/strict";
import { SLOTS, RARITIES, ITEMS, MILESTONES, RANDOM_POOL, MILESTONE_ITEM_IDS } from "./catalog.js";
import { bonusXpFor, advanceLevel, levelFill, emptyRewards } from "./rewardLogic.js";

test("catalog: 16 unique items, 5/3/4/4 per slot, valid rarities, both names present", () => {
  assert.equal(new Set(ITEMS.map((i) => i.id)).size, 16);
  assert.deepEqual(SLOTS.map((s) => ITEMS.filter((i) => i.slot === s).length), [5, 3, 4, 4]);
  for (const i of ITEMS) { assert.ok(RARITIES.includes(i.rarity)); assert.ok(i.name && i.nameKm); }
});
test("catalog: the seven milestones in spec order, each granting a distinct existing item", () => {
  assert.deepEqual(MILESTONES.map((m) => [m.kind, m.value, m.itemId]), [
    ["firstBox", 1, "hat-party"], ["level", 3, "face-round"], ["level", 5, "hat-grad"], ["streak", 7, "body-scarf"],
    ["sets", 10, "extra-medal"], ["level", 8, "body-cape"], ["level", 10, "hat-crown"]]);
  assert.equal(MILESTONE_ITEM_IDS.size, 7);
  for (const m of MILESTONES) assert.ok(ITEMS.some((i) => i.id === m.itemId));
});
test("catalog: random pool is the 9 non-milestone items in catalog order (4 common, 2 rare, 2 epic, 1 legendary)", () => {
  assert.deepEqual(RANDOM_POOL.map((i) => i.id), ["hat-flower", "hat-wizard", "face-shades", "face-star", "body-bowtie", "body-labcoat", "extra-backpack", "extra-badge", "extra-wings"]);
  assert.deepEqual(RARITIES.map((r) => RANDOM_POOL.filter((i) => i.rarity === r).length), [4, 2, 2, 1]);
});

test("bonusXpFor: 10 questions pay 80, flawless 120", () => {
  assert.equal(bonusXpFor({ total: 10, retried: 3 }), 80);
  assert.equal(bonusXpFor({ total: 10, retried: 0 }), 120);
});
test("bonusXpFor: a 1-question set rounds to the nearest 5 (45, flawless 65)", () => {
  assert.equal(bonusXpFor({ total: 1, retried: 2 }), 45);
  assert.equal(bonusXpFor({ total: 1, retried: 0 }), 65);
});
test("bonusXpFor: the 150 cap applies before the flawless multiplier (28+ questions → 150, flawless 225)", () => {
  for (const total of [28, 40, 200]) { assert.equal(bonusXpFor({ total, retried: 1 }), 150); assert.equal(bonusXpFor({ total, retried: 0 }), 225); }
});
test("bonusXpFor: a missing or negative total counts as 0 (40, flawless 60)", () => {
  for (const total of [0, -3, NaN, undefined]) { assert.equal(bonusXpFor({ total, retried: 1 }), 40); assert.equal(bonusXpFor({ total, retried: 0 }), 60); }
});

test("advanceLevel: nothing happens below the threshold", () => {
  assert.deepEqual(advanceLevel({ level: 1, xpToNext: 500 }, 499), { level: 1, xpToNext: 500 });
});
test("advanceLevel: reaching the threshold exactly levels up and grows the next one ×1.35, rounded", () => {
  assert.deepEqual(advanceLevel({ level: 1, xpToNext: 500 }, 500), { level: 2, xpToNext: 675 });
});
test("advanceLevel: chains levels and reproduces the spec curve (level 10 at 5,516 XP)", () => {
  assert.deepEqual(advanceLevel({ level: 1, xpToNext: 500 }, 5515), { level: 9, xpToNext: 5516 });
  assert.deepEqual(advanceLevel({ level: 1, xpToNext: 500 }, 5516), { level: 10, xpToNext: 7447 });
});

test("levelFill: the xp / xpToNext ratio, clamped to 0..1, safe on bad input", () => {
  assert.equal(levelFill({ xp: 250, xpToNext: 500 }), 0.5);
  assert.equal(levelFill({ xp: 900, xpToNext: 500 }), 1);
  assert.equal(levelFill({ xp: -5, xpToNext: 500 }), 0);
  assert.equal(levelFill({ xp: 10, xpToNext: 0 }), 0);
});

test("emptyRewards: a fresh object each call with an all-null outfit", () => {
  assert.deepEqual(emptyRewards(), { claimedSets: {}, owned: [], outfit: { hat: null, face: null, body: null, extra: null } });
  assert.notEqual(emptyRewards(), emptyRewards());
});
