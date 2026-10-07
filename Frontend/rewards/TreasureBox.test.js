/* The treasure box on the "Set complete!" screen (Frontend/rewards/TreasureBox.jsx), rendered to static markup. Clicking,
   the opening animation and the pop-up it leads to are checked by hand in the browser.
   Run with:  node --test Frontend/rewards/TreasureBox.test.js */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startSsr } from "./ssrHarness.js";
let s, ctx, tb;
before(async () => { s = await startSsr(); [ctx, tb] = await Promise.all(["/Frontend/rewards/RewardsContext.jsx", "/Frontend/rewards/TreasureBox.jsx"].map((p) => s.load(p))); });
after(() => s.close());

const box = (isClaimed, lang = "en") => s.render(s.h(ctx.RewardsContext.Provider, { value: { ...ctx.DEFAULT_REWARDS_API, isClaimed } },
  s.h(tb.default, { setKey: "Chemistry-1", total: 10, retried: 0, lang })));

test("an unclaimed set shows the chest: a named button, the prompt, no pop-up (Review Focus 2)", () => {
  const html = box(() => false);
  assert.match(html, /<button[^>]*aria-label="Open treasure box"/);
  assert.ok(s.text(html).includes("Tap to open your reward!")); assert.doesNotMatch(html, /role="dialog"/);
});
test("an already-claimed set shows only the muted line, no button", () => {
  const html = box(() => true);
  assert.ok(s.text(html).includes("Reward already collected for this set.")); assert.doesNotMatch(html, /<button/);
});
test("Khmer prompt and font class", () => {
  const html = box(() => false, "km");
  assert.ok(s.text(html).includes("ចុចដើម្បីបើករង្វាន់របស់អ្នក!")); assert.match(html, /eai-km/);
});
