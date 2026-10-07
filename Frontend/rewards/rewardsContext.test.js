/* The rewards context's safe default (what an owl sees outside any provider, e.g. on the pre-account screens).
   Run with:  node --test Frontend/rewards/rewardsContext.test.js   (components are loaded through Vite's SSR loader) */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startSsr } from "./ssrHarness.js";
let s; before(async () => { s = await startSsr(); }); after(() => s.close());

test("useRewards outside a provider: empty outfit, nothing claimed, claimSet inert", async () => {
  const { useRewards } = await s.load("/Frontend/rewards/RewardsContext.jsx");
  let seen; s.render(s.h(function Probe() { seen = useRewards(); return null; }));
  assert.deepEqual(seen.outfit, { hat: null, face: null, body: null, extra: null });
  assert.equal(seen.isClaimed("x"), false);
  assert.equal(seen.claimSet({ setKey: "x", total: 1, retried: 0 }), null);
});
