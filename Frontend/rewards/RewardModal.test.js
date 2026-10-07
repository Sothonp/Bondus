/* The reward pop-up (Frontend/rewards/RewardModal.jsx), rendered to static markup. Opening, closing, focus and the
   animations are checked by hand in the browser; here: structure, text, numbers and attributes.
   Run with:  node --test Frontend/rewards/RewardModal.test.js */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startSsr } from "./ssrHarness.js";
let s, modal; before(async () => { s = await startSsr(); modal = await s.load("/Frontend/rewards/RewardModal.jsx"); }); after(() => s.close());

const P = (level, xp, xpToNext) => ({ level, xp, xpToNext });
const base = { xp: 120, flawless: true, itemId: "hat-grad", source: "milestone", before: P(2, 600, 675), after: P(3, 720, 911), leveledUp: true };
const show = (result, lang = "en", equipped = false) => s.render(s.h(modal.default, { result, lang, equipped, onEquip() {}, onOpenWardrobe() {}, onClose() {} }));

test("pop-up: dialog semantics, item card, XP, flawless chip, level-up banner and bar", () => {
  const html = show(base);
  assert.match(html, /role="dialog"/); assert.match(html, /aria-modal="true"/);
  const labelledby = html.match(/aria-labelledby="([^"]+)"/)[1]; assert.ok(html.includes(`id="${labelledby}"`));
  const t = s.text(html);
  for (const part of ["Treasure unlocked!", "Graduation cap", "NEW", "Milestone reward", "120 XP earned", "Flawless!", "Level up! You're now Level 3.", "191 XP to Level 4", "Equip now", "Open wardrobe", "Continue"]) assert.ok(t.includes(part), part);
  assert.match(html, /role="progressbar"/); assert.match(html, /aria-valuenow="79"/);   // 720 / 911
});
test("pop-up: no level-up banner when no level was crossed; once worn the item reads 'Equipped' and the button is disabled", () => {
  const r = { ...base, before: P(2, 500, 675), after: P(2, 620, 675), leveledUp: false };
  const t = s.text(show(r)); assert.ok(!t.includes("Level up!")); assert.ok(t.includes("55 XP to Level 3"));
  const worn = show(r, "en", true); assert.ok(s.text(worn).includes("Equipped")); assert.ok(!s.text(worn).includes("Equip now")); assert.match(worn, /\bdisabled\b/);
});
test("pop-up: a random drop says 'Random drop'", () => {
  const t = s.text(show({ ...base, source: "random" })); assert.ok(t.includes("Random drop")); assert.ok(!t.includes("Milestone reward"));
});
test("pop-up: nothing left to give shows the all-owned message, no item card, no Equip button (Review Focus 4)", () => {
  const t = s.text(show({ xp: 105, flawless: false, itemId: null, source: null, before: P(1, 40, 500), after: P(1, 145, 500), leveledUp: false }));
  assert.ok(t.includes("You own every item! Here's extra XP.") && t.includes("105 XP earned"));
  for (const gone of ["NEW", "Equip now"]) assert.ok(!t.includes(gone), gone);
});
test("pop-up: a multi-level jump shows the final level and bar (Review Focus 5)", () => {
  const html = show({ ...base, xp: 225, before: P(1, 499, 500), after: P(3, 724, 911) });
  assert.ok(s.text(html).includes("Level up! You're now Level 3.")); assert.match(html, /aria-valuenow="79"/);   // 724 / 911
});
test("pop-up in Khmer: Khmer item name, Khmer digits, eai-km class", () => {
  const html = show(base, "km"); const t = s.text(html);
  assert.ok(t.includes("មួកបញ្ចប់ការសិក្សា") && t.includes("១២០")); assert.match(html, /eai-km/);
});
