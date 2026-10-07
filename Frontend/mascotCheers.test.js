/* Tests for the owl's encouraging lines (Frontend/mascotCheers.js).
   Run with:  node --test Frontend/mascotCheers.test.js   (no dependencies — Node's built-in runner) */
import { test } from "node:test";
import assert from "node:assert/strict";
import { CHEER_STRINGS, cheerKeys, pickCheer } from "./mascotCheers.js";

const KINDS = ["correct", "retry", "miss", "perfect", "resilient"];
const KHMER = /[ក-៿]/;
const sweep = [0, 0.1, 0.25, 0.4, 0.5, 0.6, 0.75, 0.9, 0.999]; // stand-ins for Math.random()

test("every moment has enough different lines to stay fresh", () => {
  assert.ok(cheerKeys("correct").length >= 8, "correct answers need a good variety");
  assert.ok(cheerKeys("miss").length >= 5, "wrong answers need a good variety");
  for (const kind of KINDS) assert.ok(cheerKeys(kind).length >= 3, `${kind} needs at least 3 lines`);
});

test("every line exists in English AND in real Khmer", () => {
  for (const kind of KINDS) {
    for (const key of cheerKeys(kind)) {
      const en = CHEER_STRINGS.en[key], km = CHEER_STRINGS.km[key];
      assert.ok(typeof en === "string" && en.trim(), `${key}: English line missing`);
      assert.ok(typeof km === "string" && km.trim(), `${key}: Khmer line missing`);
      assert.ok(!KHMER.test(en), `${key}: English line contains Khmer`);
      assert.ok(KHMER.test(km), `${key}: Khmer line has no Khmer text`);
    }
  }
});

test("both languages define exactly the same keys, and keys are unique across moments", () => {
  assert.deepEqual(Object.keys(CHEER_STRINGS.en).sort(), Object.keys(CHEER_STRINGS.km).sort());
  const all = KINDS.flatMap(cheerKeys);
  assert.equal(new Set(all).size, all.length, "a key is used by two different moments");
  assert.deepEqual([...all].sort(), Object.keys(CHEER_STRINGS.en).sort(), "a string exists that no moment uses");
});

test("lines are short enough for the speech bubble", () => {
  for (const kind of KINDS) {
    const limit = kind === "perfect" || kind === "resilient" ? 64 : 34; // finish-screen bubble is bigger
    for (const key of cheerKeys(kind)) {
      assert.ok([...CHEER_STRINGS.en[key]].length <= limit, `${key} (en) is too long: ${CHEER_STRINGS.en[key]}`);
      assert.ok([...CHEER_STRINGS.km[key]].length <= limit + 6, `${key} (km) is too long: ${CHEER_STRINGS.km[key]}`);
    }
  }
});

test("pickCheer returns a line of the requested kind", () => {
  for (const kind of KINDS) for (const r of sweep) assert.ok(cheerKeys(kind).includes(pickCheer(kind, null, () => r)));
});

test("pickCheer never repeats the previous line when there is a choice", () => {
  for (const kind of KINDS) {
    for (const previous of cheerKeys(kind)) {
      for (const r of sweep) assert.notEqual(pickCheer(kind, previous, () => r), previous);
    }
  }
});

test("pickCheer can reach every line (nothing is unreachable)", () => {
  for (const kind of KINDS) {
    const seen = new Set();
    for (const r of sweep) for (const previous of [null, ...cheerKeys(kind)]) seen.add(pickCheer(kind, previous, () => r));
    assert.deepEqual([...seen].sort(), [...cheerKeys(kind)].sort(), `${kind}: some line can never be picked`);
  }
});

test("pickCheer is deterministic for a given random source", () => {
  assert.equal(pickCheer("correct", null, () => 0.3), pickCheer("correct", null, () => 0.3));
});

test("a previous line from a different moment is simply ignored", () => {
  assert.ok(cheerKeys("miss").includes(pickCheer("miss", cheerKeys("correct")[0], () => 0)));
});

test("an unknown moment is rejected loudly", () => {
  assert.throws(() => pickCheer("nonsense"), /Unknown cheer kind/);
  assert.throws(() => cheerKeys("nonsense"), /Unknown cheer kind/);
});
