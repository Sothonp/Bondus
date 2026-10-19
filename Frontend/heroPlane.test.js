/* Tests for the landing page's airplane geometry (Frontend/heroPlane.js).
   Run with:  node --test Frontend/heroPlane.test.js   (no dependencies — Node's built-in runner) */
import { test } from "node:test";
import assert from "node:assert/strict";
import { COCKPIT, COCKPIT_U, OWL_HEAD, OWL_K, iso3 } from "./heroFlight.js";
import { PLANE, bodyRadius } from "./heroPlane.js";

// Is the point inside the polygon (even-odd rule)?
function inside([px, py], poly) {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}
const mean = (list) => list.reduce((s, v) => s + v, 0) / list.length;
// Every string in the geometry, to check that no number went bad on the way.
const strings = (value) => (typeof value === "string" ? [value] : value && typeof value === "object" ? Object.values(value).flatMap(strings) : []);
const numbers = (value) => (typeof value === "number" ? [value] : value && typeof value === "object" ? Object.values(value).flatMap(numbers) : []);

test("the body is a fat barrel: thick for its length, round at both ends", () => {
  const { lengthPx, thicknessPx } = PLANE.fuselage;
  assert.ok(thicknessPx >= 60, `${thicknessPx.toFixed(0)} units thick (the old plane was about 18)`);
  assert.ok(lengthPx / thicknessPx < 3, `length to thickness ${(lengthPx / thicknessPx).toFixed(2)}`);
  assert.ok(bodyRadius(COCKPIT_U) > bodyRadius(-170), "fatter at the cockpit than at the tail");
  assert.ok(bodyRadius(-170) > 0, "the tail ends in a rounded tip, not a point");
});

test("the body's radius changes smoothly along its length", () => {
  for (let u = -176; u < 150; u += 2) assert.ok(Math.abs(bodyRadius(u + 2) - bodyRadius(u)) < 3, `jump at u=${u}`);
});

test("the cockpit is an oval cut into the top of the body, inside its outline", () => {
  const { ring } = PLANE.cockpit;
  assert.ok(ring.length >= 48);
  for (const p of ring) assert.ok(inside(p, PLANE.fuselage.outline), `rim point ${p.map((v) => v.toFixed(1))} is outside the body`);
});

test("the rim is split into the half nearer the viewer and the half behind", () => {
  const { nearArc, farArc, ring } = PLANE.cockpit;
  assert.ok(mean(nearArc.map((p) => p[1])) > mean(farArc.map((p) => p[1])) + 5, "the near half is lower on screen");
  assert.ok(nearArc.length + farArc.length >= ring.length, "together they cover the rim");
  for (let i = 1; i < nearArc.length; i++) assert.ok(nearArc[i][0] > nearArc[i - 1][0], "the near arc runs left to right, so it can be a clip edge");
});

test("the owl sits inside the opening: wider than its torso, with its feet below the near rim", () => {
  const xs = PLANE.cockpit.ring.map((p) => p[0]);
  const opening = Math.max(...xs) - Math.min(...xs);
  const torso = 128 * OWL_K;
  assert.ok(opening > torso + 8, `opening ${opening.toFixed(0)} wide, torso ${torso.toFixed(0)}`);
  assert.ok(COCKPIT[0] > Math.min(...xs) && COCKPIT[0] < Math.max(...xs), "centred in it");
  assert.ok(COCKPIT[1] > PLANE.cockpit.nearArcY(COCKPIT[0]), "its feet are below the near rim, hidden by the body");
});

test("only the owl's head, torso and arms show: its feet and lower belly are tucked in", () => {
  const hidden = COCKPIT[1] - PLANE.cockpit.nearArcY(COCKPIT[0]);
  const visible = 1 - hidden / OWL_HEAD;
  assert.ok(visible >= 0.75 && visible <= 0.9, `${(visible * 100).toFixed(0)}% of the owl shows above the rim`);
});

test("the front piece of the body covers the owl's lower half and leaves its head and chest alone", () => {
  const clip = PLANE.cockpit.clipPolygon;
  const [fx, fy] = COCKPIT;
  assert.ok(inside([fx, fy + 4], clip), "just under the feet is covered");
  assert.ok(inside([fx - 14, fy], clip) && inside([fx + 14, fy], clip), "either side of the feet is covered");
  assert.ok(!inside([fx, fy - OWL_HEAD * 0.5], clip), "the owl's chest is not covered");
  assert.ok(!inside([fx, fy - OWL_HEAD * 0.9], clip), "nor its head");
});

test("the wings are thick and wide, one to each side of the body", () => {
  const { near, far } = PLANE.wings;
  assert.ok(near.span > PLANE.fuselage.lengthPx * 0.9, `wingspan ${near.span.toFixed(0)}`);
  assert.ok(near.tip[0] < 0 && near.tip[1] > 0, "the near wing reaches down and to the left");
  assert.ok(far.tip[0] > 0 && far.tip[1] < 0, "the far wing reaches up and to the right");
  assert.ok(near.thickness >= 5, "with real thickness");
});

test("the tail fin stands tall above the tail", () => {
  assert.ok(PLANE.tail.finHeight >= 45, `${PLANE.tail.finHeight.toFixed(0)} units tall`);
});

test("the propeller is a disc across the nose", () => {
  const { hub, discRadius } = PLANE.nose;
  assert.ok(hub[0] > PLANE.fuselage.outline.reduce((m, p) => Math.max(m, p[0]), -Infinity) - 20, "at the front of the body");
  assert.ok(discRadius >= 30);
});

test("the whole plane fits the scene at full size without taking it over", () => {
  const { minX, maxX, minY, maxY } = PLANE.bounds;
  assert.ok(maxX - minX <= 330, `${(maxX - minX).toFixed(0)} wide`);
  assert.ok(maxY - minY <= 250, `${(maxY - minY).toFixed(0)} tall`);
});

test("no bad numbers anywhere in the geometry", () => {
  for (const s of strings(PLANE)) assert.ok(!/NaN|undefined|Infinity/.test(s), s.slice(0, 80));
  for (const n of numbers(PLANE)) assert.ok(Number.isFinite(n));
});

test("the cockpit and the owl's seat agree with the projection helper", () => {
  const [cx, cy] = PLANE.cockpit.centre;
  const [ex, ey] = iso3(COCKPIT_U, 0, 0);
  assert.ok(Math.abs(cx - ex) < 1e-6 && cy < ey, "the opening is centred over the seat's u, and above the body's middle line");
});

test("the painted band round the body stays on the body", () => {
  assert.ok(PLANE.fuselage.bandPoints.length >= 12);
  for (const p of PLANE.fuselage.bandPoints) assert.ok(inside(p, PLANE.fuselage.outline), `band point ${p.map((v) => v.toFixed(1))} is off the body`);
});

test("the wings and tail wings have painted tips, and the fin has a stripe", () => {
  for (const plank of [PLANE.wings.near, PLANE.wings.far, PLANE.tail.nearStab, PLANE.tail.farStab]) assert.match(plank.tipCap, /^M[-\d. ]+L/);
  assert.match(PLANE.tail.finStripe, /^M[-\d. ]+L/);
});
