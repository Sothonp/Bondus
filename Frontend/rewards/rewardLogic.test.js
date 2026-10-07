/* Tests for the treasure-box reward rules (Frontend/rewards/catalog.js + rewardLogic.js).
   Run with:  node --test Frontend/rewards/rewardLogic.test.js   (no dependencies — Node's built-in runner) */
import { test } from "node:test";
import assert from "node:assert/strict";
import { SLOTS, RARITIES, ITEMS, MILESTONES, RANDOM_POOL, MILESTONE_ITEM_IDS } from "./catalog.js";
import { bonusXpFor, advanceLevel, levelFill, emptyRewards, pickReward } from "./rewardLogic.js";

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

const NONE = { level: 1, setsCompleted: 0, longestStreak: 0, flawless: false };
const seq = (...v) => { let i = 0; return () => v[i++ % v.length]; };

test("pickReward: the first box guarantees the party hat whatever rng says", () => {
  assert.deepEqual(pickReward({ owned: [], ...NONE, setsCompleted: 1, rng: seq(0.99) }), { itemId: "hat-party", source: "milestone" });
});
test("pickReward: milestones are granted one per call, in spec order", () => {
  const stats = { level: 10, setsCompleted: 10, longestStreak: 7, flawless: false };
  const owned = []; const got = [];
  for (let i = 0; i < 7; i++) { const r = pickReward({ owned, ...stats, rng: seq(0) }); assert.equal(r.source, "milestone"); got.push(r.itemId); owned.push(r.itemId); }
  assert.deepEqual(got, ["hat-party", "face-round", "hat-grad", "body-scarf", "extra-medal", "body-cape", "hat-crown"]);
});
test("pickReward: a milestone waits until its condition holds (level 4 → no graduation cap, no cape)", () => {
  const r = pickReward({ owned: ["hat-party", "face-round"], level: 4, setsCompleted: 2, longestStreak: 3, flawless: false, rng: seq(0, 0) });
  assert.equal(r.source, "random");
});
test("pickReward: random drops never come from milestone items", () => {
  const milestone = new Set(["hat-party", "face-round", "hat-grad", "body-scarf", "extra-medal", "body-cape", "hat-crown"]);
  for (let a = 0; a < 1; a += 0.07) for (let b = 0; b < 1; b += 0.13) {
    const r = pickReward({ owned: [], ...NONE, rng: seq(a, b) });
    assert.equal(r.source, "random"); assert.ok(!milestone.has(r.itemId));
  }
});
test("pickReward: normal tier edges at 60 / 88 / 98 (common, rare, epic, legendary)", () => {
  const at = (roll) => pickReward({ owned: [], ...NONE, rng: seq(roll, 0) }).itemId;
  assert.equal(at(0.599), "hat-flower"); assert.equal(at(0.601), "face-shades");
  assert.equal(at(0.879), "face-shades"); assert.equal(at(0.881), "hat-wizard");
  assert.equal(at(0.979), "hat-wizard"); assert.equal(at(0.981), "extra-wings");
});
test("pickReward: a flawless set shifts the weights (40 / 75 / 95)", () => {
  const at = (roll, flawless) => pickReward({ owned: [], ...NONE, flawless, rng: seq(roll, 0) }).itemId;
  assert.equal(at(0.5, false), "hat-flower"); assert.equal(at(0.5, true), "face-shades");
  assert.equal(at(0.949, true), "hat-wizard"); assert.equal(at(0.951, true), "extra-wings");
});
test("pickReward: inside a tier the second roll picks uniformly (common: 0 → flower, 0.5 → backpack, 0.99 → badge)", () => {
  const at = (second) => pickReward({ owned: [], ...NONE, rng: seq(0, second) }).itemId;
  assert.equal(at(0), "hat-flower"); assert.equal(at(0.5), "extra-backpack"); assert.equal(at(0.99), "extra-badge");
});
test("pickReward: an exhausted tier is skipped and the weights renormalise", () => {
  const owned = ["hat-flower", "body-bowtie", "extra-backpack", "extra-badge"];
  assert.equal(pickReward({ owned, ...NONE, rng: seq(0, 0) }).itemId, "face-shades");
});
test("pickReward: every random item owned and no milestone due → null (Review Focus 4)", () => {
  const owned = ["hat-flower", "hat-wizard", "face-shades", "face-star", "body-bowtie", "body-labcoat", "extra-backpack", "extra-badge", "extra-wings"];
  assert.equal(pickReward({ owned, ...NONE, rng: seq(0, 0) }), null);
});
test("pickReward: unknown ids in owned are ignored", () => {
  assert.equal(pickReward({ owned: ["nope", 7, null], ...NONE, rng: seq(0, 0) }).itemId, "hat-flower");
});
