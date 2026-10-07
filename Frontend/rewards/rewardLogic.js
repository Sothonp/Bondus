/* The treasure-box reward rules — pure functions, no React, tested in rewardLogic.test.js.

   Rewards = { claimedSets: { [setKey]: { at, xp, itemId|null } }, owned: itemId[], outfit: { hat, face, body, extra } }
   (each outfit value is an owned item id or null). `progress` = { level, xp, xpToNext } where xp is the student's TOTAL
   XP (profile.xp + bonusXp), the same quantity the dashboard ring and the level-up effect compare with xpToNext. */
import { DROP_WEIGHTS, LEVEL_GROWTH, MILESTONES, RANDOM_POOL, RARITIES, XP_RULES } from "./catalog.js";

export const emptyRewards = () => ({ claimedSets: {}, owned: [], outfit: { hat: null, face: null, body: null, extra: null } });

/* Bonus XP the box pays for a finished set of `total` questions, `retried` of which needed more than one try. */
export function bonusXpFor({ total, retried }) {
  const n = Number(total);
  const questions = Number.isFinite(n) && n > 0 ? n : 0;
  const base = Math.min(XP_RULES.cap, XP_RULES.base + XP_RULES.perQuestion * questions);
  const bonus = retried === 0 ? base * XP_RULES.flawlessMultiplier : base;
  return Math.round(bonus / XP_RULES.step) * XP_RULES.step;
}

/* The level-up loop of App's level effect, made pure: keep levelling while total XP has reached the threshold. */
export function advanceLevel({ level, xpToNext }, totalXp) {
  while (totalXp >= xpToNext) {
    level += 1;
    xpToNext = Math.round(xpToNext * LEVEL_GROWTH);
  }
  return { level, xpToNext };
}

/* How full the level bar is, 0..1 (xp / xpToNext — the dashboard ring's formula). */
export function levelFill({ xp, xpToNext }) {
  if (!(xpToNext > 0)) return 0;
  return Math.min(1, Math.max(0, xp / xpToNext));
}

/* Has the student reached this milestone? `stats` = { level, setsCompleted, longestStreak }. */
export function milestoneMet(milestone, { level, setsCompleted, longestStreak }) {
  switch (milestone.kind) {
    case "firstBox": return setsCompleted >= 1;
    case "level": return level >= milestone.value;
    case "sets": return setsCompleted >= milestone.value;
    case "streak": return longestStreak >= milestone.value;
    default: return false;
  }
}

/* What a box drops, or null when there is nothing left to give.
   1. The first milestone whose item is not owned and whose condition holds (at most one item per box).
   2. Otherwise a random item from the unowned part of RANDOM_POOL: pick a rarity tier by weight among the tiers that
      still have something unowned, then one item of that tier uniformly. The two rng() calls (tier, then item) are in
      that order — the tests pin it. A flawless set rolls on the shifted weights. */
export function pickReward({ owned, level, setsCompleted, longestStreak, flawless, rng = Math.random }) {
  const have = new Set(owned);
  const stats = { level, setsCompleted, longestStreak };
  for (const m of MILESTONES) {
    if (!have.has(m.itemId) && milestoneMet(m, stats)) return { itemId: m.itemId, source: "milestone" };
  }

  const tiers = RARITIES
    .map((rarity) => ({ rarity, items: RANDOM_POOL.filter((i) => i.rarity === rarity && !have.has(i.id)) }))
    .filter((t) => t.items.length > 0);
  if (tiers.length === 0) return null;

  const weights = flawless ? DROP_WEIGHTS.flawless : DROP_WEIGHTS.normal;
  const roll = rng() * tiers.reduce((sum, t) => sum + weights[t.rarity], 0);
  let upTo = 0;
  let tier = tiers[tiers.length - 1];
  for (const t of tiers) {
    upTo += weights[t.rarity];
    if (roll < upTo) { tier = t; break; }
  }
  const item = tier.items[Math.min(tier.items.length - 1, Math.floor(rng() * tier.items.length))];
  return { itemId: item.id, source: "random" };
}
