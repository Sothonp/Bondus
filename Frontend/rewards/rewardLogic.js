/* The treasure-box reward rules — pure functions, no React, tested in rewardLogic.test.js.

   Rewards = { claimedSets: { [setKey]: { at, xp, itemId|null } }, owned: itemId[], outfit: { hat, face, body, extra } }
   (each outfit value is an owned item id or null). `progress` = { level, xp, xpToNext } where xp is the student's TOTAL
   XP (profile.xp + bonusXp), the same quantity the dashboard ring and the level-up effect compare with xpToNext. */
import { DROP_WEIGHTS, ITEM_BY_ID, LEVEL_GROWTH, MILESTONES, RANDOM_POOL, RARITIES, SLOTS, XP_RULES } from "./catalog.js";

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

/* Claim the box for one finished set. Returns null when this set was already claimed (so nothing is ever paid twice),
   otherwise { rewards, result }: the new wardrobe plus what the pop-up shows.
   The box's own XP counts toward a level milestone, so the item is picked at the level the bonus alone reaches. The
   consolation (only when there is no item) is added after the pick: it can still carry the student over a level but
   never triggers a second pick. `after` is always fully levelled, so App's level-up effect finds nothing left to do. */
export function claimBox({ rewards, progress, longestStreak, setKey, total, retried, rng = Math.random, now = Date.now() }) {
  if (rewards.claimedSets[setKey]) return null;

  const flawless = retried === 0;
  let xp = bonusXpFor({ total, retried });
  const reached = advanceLevel(progress, progress.xp + xp);
  const setsCompleted = Object.keys(rewards.claimedSets).length + 1;
  const pick = pickReward({ owned: rewards.owned, level: reached.level, setsCompleted, longestStreak, flawless, rng });
  if (!pick) xp += XP_RULES.consolation;

  const afterXp = progress.xp + xp;
  const after = { ...advanceLevel(progress, afterXp), xp: afterXp };
  return {
    rewards: {
      ...rewards,
      claimedSets: { ...rewards.claimedSets, [setKey]: { at: now, xp, itemId: pick?.itemId ?? null } },
      owned: pick ? [...rewards.owned, pick.itemId] : rewards.owned,
    },
    result: { xp, flawless, itemId: pick?.itemId ?? null, source: pick?.source ?? null, before: progress, after, leveledUp: after.level > progress.level },
  };
}

// A catalog id. Own-property check, so "constructor" or "__proto__" in a hand-edited save is not mistaken for an item.
const isItemId = (id) => typeof id === "string" && Object.prototype.hasOwnProperty.call(ITEM_BY_ID, id);

// An empty slot always fits; otherwise the item must be owned and made for that slot.
const fitsSlot = (slot, itemId, owned) => itemId === null || (owned.includes(itemId) && ITEM_BY_ID[itemId]?.slot === slot);

/* Put an owned item on (or null to take the slot's item off). Anything that doesn't fit returns the SAME object. */
export function equipItem(rewards, slot, itemId) {
  if (!SLOTS.includes(slot) || !fitsSlot(slot, itemId, rewards.owned)) return rewards;
  return { ...rewards, outfit: { ...rewards.outfit, [slot]: itemId } };
}

/* The outfit with every item that isn't owned, or doesn't belong in its slot, taken off. */
export function sanitizeOutfit(outfit, owned) {
  const worn = outfit && typeof outfit === "object" ? outfit : {};
  return Object.fromEntries(SLOTS.map((slot) => [slot, worn[slot] != null && fitsSlot(slot, worn[slot], owned) ? worn[slot] : null]));
}

/* Turn whatever came out of storage into a valid wardrobe: unknown or duplicate items dropped, malformed claims
   dropped, the outfit limited to owned items that fit their slots. Never throws; garbage gives an empty wardrobe. */
export function sanitizeRewards(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return emptyRewards();

  const owned = [...new Set(Array.isArray(raw.owned) ? raw.owned.filter(isItemId) : [])];
  const claimedSets = {};
  const claims = raw.claimedSets;
  if (claims && typeof claims === "object" && !Array.isArray(claims)) {
    for (const [key, c] of Object.entries(claims)) {
      if (c && typeof c === "object" && Number.isFinite(c.at) && Number.isFinite(c.xp)) {
        claimedSets[key] = { at: c.at, xp: c.xp, itemId: isItemId(c.itemId) ? c.itemId : null };
      }
    }
  }
  return { claimedSets, owned, outfit: sanitizeOutfit(raw.outfit, owned) };
}

/* Do two outfits wear the same thing in every slot? (The Wardrobe uses it to tell whether the draft has unsaved changes.) */
export const sameOutfit = (a, b) => SLOTS.every((slot) => (a?.[slot] ?? null) === (b?.[slot] ?? null));
