/* Tests for the photo helper's size rule (Frontend/imageUtils.js). Shrinking itself needs a browser and is checked there.
   Run with:  node --test Frontend/imageUtils.test.js */
import { test } from "node:test";
import assert from "node:assert/strict";
import { fitWithin } from "./imageUtils.js";

test("a big photo is scaled down so its longest side fits, keeping its shape", () => {
  assert.deepEqual(fitWithin(4000, 3000, 1600), { w: 1600, h: 1200 });
  assert.deepEqual(fitWithin(3000, 4000, 1600), { w: 1200, h: 1600 });
  assert.deepEqual(fitWithin(4032, 3024, 320), { w: 320, h: 240 });
});

test("a photo that already fits is left alone, never scaled up", () => {
  assert.deepEqual(fitWithin(800, 600, 1600), { w: 800, h: 600 });
  assert.deepEqual(fitWithin(1600, 1600, 1600), { w: 1600, h: 1600 });
});

test("sizes are whole pixels of at least 1, and nonsense gives nothing", () => {
  assert.deepEqual(fitWithin(10000, 3, 1600), { w: 1600, h: 1 });
  assert.equal(fitWithin(0, 100, 1600), null);
  assert.equal(fitWithin(NaN, 100, 1600), null);
  assert.equal(fitWithin(100, -5, 1600), null);
});
