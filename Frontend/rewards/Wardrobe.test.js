/* The Wardrobe (dressing-room) page, Frontend/rewards/Wardrobe.jsx, rendered to static markup: tabs, tiles and what each
   state says. Tapping tiles, Save and Reset are checked by hand in the browser.
   Run with:  node --test Frontend/rewards/Wardrobe.test.js */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startSsr } from "./ssrHarness.js";
let s, ctx, wardrobe;
before(async () => { s = await startSsr(); [ctx, wardrobe] = await Promise.all(["/Frontend/rewards/RewardsContext.jsx", "/Frontend/rewards/Wardrobe.jsx"].map((p) => s.load(p))); });
after(() => s.close());

// Built per render: `ctx` is only loaded once the before() hook has run.
const value = () => ({ ...ctx.DEFAULT_REWARDS_API, owned: ["hat-party", "face-round"], outfit: { hat: "hat-party", face: null, body: null, extra: null } });
const renderOwl = (o) => s.h("i", { "data-draft-hat": String(o.hat) });
const page = (props = {}) => s.render(s.h(ctx.RewardsContext.Provider, { value: value() }, s.h(wardrobe.default, { lang: "en", renderOwl, ...props })));

test("wardrobe: four tabs with owned counts, the hat tab selected, the owl wearing the saved outfit", () => {
  const html = page(), t = s.text(html);
  assert.equal((html.match(/role="tab"/g) || []).length, 4); assert.match(html, /aria-selected="true"/);
  for (const part of ["Hat", "Face", "Clothes", "Extras", "1/5", "1/3", "0/4"]) assert.ok(t.includes(part), part);
  assert.match(html, /data-draft-hat="hat-party"/);
});
test("wardrobe hat tab: owned item pressed, milestone items show their requirement, random items stay a mystery", () => {
  const html = page(), t = s.text(html);
  assert.match(html, /aria-pressed="true"/);
  for (const part of ["Party hat", "Graduation cap", "Crown", "Reach level 5", "Reach level 10"]) assert.ok(t.includes(part), part);
  assert.equal((t.match(/Found in treasure boxes/g) || []).length, 2);           // flower and wizard hat
  assert.doesNotMatch(html, /Flower|Wizard hat/);                                 // not even in an aria-label
  assert.equal((html.match(/aria-disabled="true"/g) || []).length, 4);            // grad cap, crown, flower, wizard
});
test("wardrobe: the other tabs list their own items and requirements", () => {
  assert.ok(s.text(page({ initialSlot: "body" })).includes("Study 7 days in a row"));
  assert.ok(s.text(page({ initialSlot: "extra" })).includes("Complete 10 sets"));
});
test("wardrobe: Save is disabled and there is no unsaved note while the draft equals the saved outfit", () => {
  const html = page();
  assert.doesNotMatch(s.text(html), /Unsaved changes/);
  assert.match(html, /<button[^>]*\bdisabled\b[^>]*>(?:(?!<\/button>).)*Save style/s);
});
test("wardrobe in Khmer: Khmer tab labels and owned item names, eai-km class", () => {
  const html = page({ lang: "km" }), t = s.text(html);
  for (const part of ["មួក", "សម្លៀកបំពាក់", "មួកជប់លៀង"]) assert.ok(t.includes(part), part);
  assert.match(html, /eai-km/);
});
