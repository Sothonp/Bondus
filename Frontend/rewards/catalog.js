/* Static data for the treasure-box rewards (spec: docs/superpowers/specs/2026-10-07-treasure-box-rewards-design.md).
   Pure data, no React, so Node can test it and every other rewards module can import it.

   Item ids are PERMANENT: a student's saved wardrobe is keyed on them, so new items may only be appended
   and an id is never renamed or renumbered (the same rule as the chemistry bank's exercise ids).
   The Khmer names are drafts that still need a native speaker's review. */

export const SLOTS = ["hat", "face", "body", "extra"];        // one equipped item per slot; also the draw order inside a mount
export const MOUNTS = ["back", "torso", "face", "top"];        // where an item's art attaches to the owl (see itemArt.jsx)
export const RARITIES = ["common", "rare", "epic", "legendary"];

// Chance of each rarity tier for a random drop; a set finished without a single retry rolls on the second row.
export const DROP_WEIGHTS = {
  normal: { common: 60, rare: 28, epic: 10, legendary: 2 },
  flawless: { common: 40, rare: 35, epic: 20, legendary: 5 },
};

// Bonus XP = min(cap, base + perQuestion × questions), × flawlessMultiplier for a set with no retries, rounded to
// `step`. A box with nothing left to give pays `consolation` on top.
export const XP_RULES = { base: 40, perQuestion: 4, cap: 150, flawlessMultiplier: 1.5, step: 5, consolation: 25 };

// The app's level curve: each level asks for this much more total XP than the one before (rounded).
export const LEVEL_GROWTH = 1.35;

const item = (id, slot, rarity, name, nameKm) => ({ id, slot, rarity, name, nameKm });

export const ITEMS = [
  item("hat-party", "hat", "common", "Party hat", "មួកជប់លៀង"),
  item("hat-flower", "hat", "common", "Flower", "ផ្កាលើក្បាល"),
  item("hat-grad", "hat", "rare", "Graduation cap", "មួកបញ្ចប់ការសិក្សា"),
  item("hat-wizard", "hat", "epic", "Wizard hat", "មួកគ្រូមន្តអាគម"),
  item("hat-crown", "hat", "legendary", "Crown", "ម្កុដ"),
  item("face-round", "face", "common", "Round glasses", "វ៉ែនតាមូល"),
  item("face-shades", "face", "rare", "Sunglasses", "វ៉ែនតាខ្មៅ"),
  item("face-star", "face", "epic", "Star glasses", "វ៉ែនតាផ្កាយ"),
  item("body-bowtie", "body", "common", "Bow tie", "ក្រវ៉ាត់មេអំបៅ"),
  item("body-scarf", "body", "common", "Scarf", "កន្សែងបង់ក"),
  item("body-labcoat", "body", "rare", "Lab coat", "អាវធំមន្ទីរពិសោធន៍"),
  item("body-cape", "body", "epic", "Cape", "អាវផាយ"),
  item("extra-backpack", "extra", "common", "Study backpack", "កាបូបស្ពាយ"),
  item("extra-badge", "extra", "common", "Star badge", "ស្លាកសញ្ញាផ្កាយ"),
  item("extra-medal", "extra", "rare", "Medal", "មេដាយ"),
  item("extra-wings", "extra", "legendary", "Golden wings", "ស្លាបមាស"),
];

/* Guaranteed drops, in evaluation order: a box grants the FIRST milestone whose item is not owned yet and whose
   condition holds (at most one item per box). `kind` says what `value` counts. */
export const MILESTONES = [
  { id: "first-box", itemId: "hat-party", kind: "firstBox", value: 1 },
  { id: "level-3", itemId: "face-round", kind: "level", value: 3 },
  { id: "level-5", itemId: "hat-grad", kind: "level", value: 5 },
  { id: "streak-7", itemId: "body-scarf", kind: "streak", value: 7 },
  { id: "sets-10", itemId: "extra-medal", kind: "sets", value: 10 },
  { id: "level-8", itemId: "body-cape", kind: "level", value: 8 },
  { id: "level-10", itemId: "hat-crown", kind: "level", value: 10 },
];

export const ITEM_BY_ID = Object.fromEntries(ITEMS.map((i) => [i.id, i]));
export const MILESTONE_ITEM_IDS = new Set(MILESTONES.map((m) => m.itemId));
// Items a box can drop at random: every item that is not reserved for a milestone.
export const RANDOM_POOL = ITEMS.filter((i) => !MILESTONE_ITEM_IDS.has(i.id));
