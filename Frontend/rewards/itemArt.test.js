/* Structure tests for the cosmetic item art (Frontend/rewards/itemArt.jsx): every item has drawable, namespaced SVG on
   the mounts it declares, and OutfitLayers copes with any outfit. How the art LOOKS is checked by eye in the Wardrobe.
   Run with:  node --test Frontend/rewards/itemArt.test.js   (components are loaded through Vite's SSR loader) */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startSsr } from "./ssrHarness.js";
import { ITEMS, MOUNTS } from "./catalog.js";
let s, art; before(async () => { s = await startSsr(); art = await s.load("/Frontend/rewards/itemArt.jsx"); }); after(() => s.close());
const mount = (outfit, m, uid = "t") => s.render(s.h("svg", null, s.h(art.OutfitLayers, { outfit, mount: m, uid })));

test("every catalog item has art: a valid thumbBox and at least one layer on a known mount", () => {
  assert.deepEqual(Object.keys(art.ITEM_ART).sort(), ITEMS.map((i) => i.id).sort());
  for (const [id, a] of Object.entries(art.ITEM_ART)) {
    assert.ok(a.thumbBox.length === 4 && a.thumbBox.every(Number.isFinite) && a.thumbBox[2] > 0 && a.thumbBox[3] > 0, id);
    const mounts = Object.keys(a.layers); assert.ok(mounts.length > 0 && mounts.every((m) => MOUNTS.includes(m)), id);
  }
});
test("each layer renders drawable SVG with no NaN, and every id is namespaced and every url(#) resolves", () => {
  for (const item of ITEMS) for (const m of Object.keys(art.ITEM_ART[item.id].layers)) {
    const html = mount({ [item.slot]: item.id }, m);
    assert.match(html, new RegExp(`data-item="${item.id}"`)); assert.match(html, /<(path|ellipse|circle|rect|polygon)\b/);
    assert.doesNotMatch(html, /NaN|undefined/);
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((x) => x[1]);
    for (const id of ids) assert.ok(id.endsWith("-t"), `${item.id}: ${id}`);
    for (const x of html.matchAll(/url\(#([^)]+)\)/g)) assert.ok(ids.includes(x[1]), `${item.id}: dangling ${x[1]}`);
  }
});
test("an item draws only at the mounts it declares (crown: top yes, torso no)", () => {
  assert.match(mount({ hat: "hat-crown" }, "top"), /data-item="hat-crown"/);
  assert.doesNotMatch(mount({ hat: "hat-crown" }, "torso"), /data-item/);
});
test("inside a mount items draw in slot order: hat before extra", () => {
  const html = mount({ extra: "extra-badge", hat: "hat-crown" }, "top");
  assert.ok(html.indexOf('data-item="hat-crown"') < html.indexOf('data-item="extra-badge"'));
});
test("OutfitLayers: unknown ids, null slots and a missing outfit give an empty mount (Review Focus 3)", () => {
  for (const outfit of [undefined, null, {}, { hat: "nope", face: null }]) assert.equal(mount(outfit, "top"), '<svg><g data-outfit-mount="top"></g></svg>');
});
test("ItemThumb: cropped to thumbBox, named in the requested language, with every layer (cape = back + torso)", () => {
  const html = s.render(s.h(art.ItemThumb, { itemId: "body-cape", lang: "km" }));
  assert.ok(html.includes(`viewBox="${art.ITEM_ART["body-cape"].thumbBox.join(" ")}"`));
  assert.ok(html.includes('aria-label="អាវផាយ"'));
  assert.equal((html.match(/data-item="body-cape"/g) || []).length, 2);
});
test("ItemThumb: wide items get a wider frame so wings and glasses aren't tiny, tall ones stay square", () => {
  const widthOf = (itemId) => Number(s.render(s.h(art.ItemThumb, { itemId, size: 88 })).match(/width="(\d+)"/)[1]);
  assert.equal(widthOf("hat-party"), 88);       // taller than wide
  assert.equal(widthOf("extra-wings"), 158);    // 2.8 : 1, capped at 1.8 × size
  assert.equal(widthOf("face-round"), 158);
});
