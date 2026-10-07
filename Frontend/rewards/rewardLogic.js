/* The treasure-box reward rules — pure functions, no React, tested in rewardLogic.test.js.

   Rewards = { claimedSets: { [setKey]: { at, xp, itemId|null } }, owned: itemId[], outfit: { hat, face, body, extra } }
   (each outfit value is an owned item id or null). `progress` = { level, xp, xpToNext } where xp is the student's TOTAL
   XP (profile.xp + bonusXp), the same quantity the dashboard ring and the level-up effect compare with xpToNext. */
import { LEVEL_GROWTH, XP_RULES } from "./catalog.js";

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
