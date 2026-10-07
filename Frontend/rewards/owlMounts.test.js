/* Where the outfit layers attach on the two owls (OwlMascot in App.jsx, StudyOwlScene.jsx). An empty outfit still
   renders every mount's <g>, so these pin each mount's exact position in the SVG: back before the feet/body, torso
   between the body and the head group, face between the beak and the headphones, top as the head group's last child.
   Run with:  node --test Frontend/rewards/owlMounts.test.js   (App.jsx takes a few seconds to load under SSR) */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startSsr } from "./ssrHarness.js";
let s, app, hero, ctx;
before(async () => {
  s = await startSsr();
  [app, hero, ctx] = await Promise.all(["/Frontend/App.jsx", "/Frontend/StudyOwlScene.jsx", "/Frontend/rewards/RewardsContext.jsx"].map((p) => s.load(p)));
});
after(() => s.close());
const withCtx = (outfit, el) => s.render(s.h(ctx.RewardsContext.Provider, { value: { ...ctx.DEFAULT_REWARDS_API, outfit } }, el));
const renderMascot = (outfit, propOutfit) => withCtx(outfit, s.h(app.OwlMascot, propOutfit ? { outfit: propOutfit } : {}));
const renderHero = (outfit) => withCtx(outfit, s.h(hero.default));

const FULL = { hat: "hat-crown", face: "face-round", body: "body-cape", extra: "extra-wings" };
const EMPTY_MOUNTS = {
  back:  /<g data-outfit-mount="back"><\/g>(<ellipse cx="-34" cy="-12"|<ellipse cx="0" cy="-78" rx="64" ry="68" fill="url)/,
  torso: /<g data-outfit-mount="torso"><\/g><g><g><path d="M -96 -258/,
  face:  /<g data-outfit-mount="face"><\/g><path d="M -108 -190 C/,
  top:   /<g data-outfit-mount="top"><\/g><\/g>/,
};
for (const [name, render] of [["OwlMascot", renderMascot], ["StudyOwlScene", renderHero]]) {
  test(`${name}: the four mounts sit exactly where the spec puts them`, () => {
    const html = render({ hat: null, face: null, body: null, extra: null });
    for (const re of Object.values(EMPTY_MOUNTS)) assert.match(html, re);
    assert.ok(html.indexOf('d="M -17 -176') < html.indexOf('data-outfit-mount="face"'));
    assert.ok(html.indexOf('transform="translate(124 -186)"') < html.indexOf('data-outfit-mount="top"'));
  });
  test(`${name}: equipped items appear in their mounts`, () => {
    const html = render(FULL);
    for (const id of Object.values(FULL)) assert.match(html, new RegExp(`data-item="${id}"`));
    assert.ok(html.indexOf('data-item="body-cape"') < html.indexOf('data-outfit-mount="torso"')); // the cape cloth is in `back`
  });
}
test("OwlMascot: an outfit prop overrides the context outfit", () => {
  const html = renderMascot({ hat: "hat-crown", face: null, body: null, extra: null }, { hat: "hat-party", face: null, body: null, extra: null });
  assert.match(html, /data-item="hat-party"/); assert.doesNotMatch(html, /data-item="hat-crown"/);
});
