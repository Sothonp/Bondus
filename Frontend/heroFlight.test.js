/* Tests for the landing page's hero story (Frontend/heroFlight.js).
   Run with:  node --test Frontend/heroFlight.test.js   (no dependencies — Node's built-in runner) */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FLY_S, LAND_S, INTRO_S, VANISH_AT, VANISH_S, HOP_AT, HOP_S, TOTAL_S,
  SCENE_W, SCENE_H, ISO_K, ISO_NOSE, PHONE_C, STOP, STAND,
  iso, iso3, COCKPIT, COCKPIT_U, COCKPIT_Z, poseAt, riderAt, planeKeyframesCss, riderKeyframesCss, vanishKeyframesCss,
} from "./heroFlight.js";

const DT = 1 / 120;
const sample = (fn) => { const out = []; for (let t = 0; t <= TOTAL_S + 1e-9; t += DT) out.push({ t, ...fn(t) }); return out; };
const plane = sample(poseAt);
const owl = sample(riderAt);
const at = (list, t) => list.find((f) => f.t >= t - 1e-9);
const dist = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
const speed = (a, b) => dist(a, b) / DT;
const wrap = (d) => ((((d + 180) % 360) + 360) % 360) - 180;   // -180..180
const near = (a, b, eps) => Math.abs(a - b) <= eps;
// The inverse of iso(): a point on screen -> plan units on the runway's surface.
const toPlan = ([x, y]) => {
  const dx = x - PHONE_C[0], dy = y - PHONE_C[1];
  const s = (2 * dy) / ISO_K, d = dx / (Math.cos(Math.PI / 6) * ISO_K);
  return [(s + d) / 2, (s - d) / 2];
};
const POSE = /([\d.]+)%\{transform:translate\(([-\d.]+)px,([-\d.]+)px\) rotate\(([-\d.]+)deg\) scale\(([\d.]+)\)\}/g;

test("timeline: 3s of flying, 0.9s of lining up and stopping, then the owl gets out", () => {
  assert.equal(FLY_S, 3);
  assert.equal(LAND_S, 0.9);
  assert.ok(near(INTRO_S, 3.9, 1e-9));
  assert.ok(HOP_AT >= INTRO_S - 1e-9, "the owl leaves only once the plane has stopped");
  assert.ok(near(TOTAL_S, HOP_AT + HOP_S, 1e-9));
  assert.ok(VANISH_AT < INTRO_S && VANISH_AT + VANISH_S <= HOP_AT + 0.2, "the plane is gone as the owl stands up");
});

test("the runway runs toward the user: +u goes down and to the right at 30 degrees, +v down and to the left", () => {
  const [ux, uy] = iso(1, 0), [vx, vy] = iso(0, 1);
  assert.ok(near(Math.atan2(uy, ux) / Math.PI * 180, ISO_NOSE, 1e-6));
  assert.ok(ux > 0 && uy > 0, "+u is down and to the right");
  assert.ok(vx < 0 && vy > 0, "+v is down and to the left");
});

test("the plane comes in from beyond the top-left corner", () => {
  const p = plane[0];
  assert.ok(p.x < 0 && p.y > 0 && p.y < SCENE_H / 4, `starts at ${p.x.toFixed(0)},${p.y.toFixed(0)}`);
});

test("one wide loop: a full turn between 1s and 3s", () => {
  const turned = at(plane, FLY_S).rot - at(plane, 1).rot;
  assert.ok(near(turned, -360, 1), `turned ${turned.toFixed(1)} degrees`);
});

test("the loop stays on the screen", () => {
  for (const f of plane.filter((q) => q.t >= 1 && q.t <= FLY_S)) {
    assert.ok(f.x > 0 && f.x < SCENE_W && f.y > 0 && f.y < SCENE_H, `t=${f.t.toFixed(2)} at ${f.x.toFixed(0)},${f.y.toFixed(0)}`);
  }
});

test("after the entrance it never leaves the scene", () => {
  for (const f of plane.filter((q) => q.t >= 0.5)) {
    assert.ok(f.x > -20 && f.x < SCENE_W + 20 && f.y > -40 && f.y < SCENE_H, `t=${f.t.toFixed(2)} at ${f.x.toFixed(0)},${f.y.toFixed(0)}`);
  }
});

test("it never jerks: speed changes gradually and the nose never snaps", () => {
  let worstAccel = 0, worstTurn = 0;
  for (let i = 2; i < plane.length; i++) {
    worstAccel = Math.max(worstAccel, Math.abs(speed(plane[i - 1], plane[i]) - speed(plane[i - 2], plane[i - 1])) / DT);
    worstTurn = Math.max(worstTurn, Math.abs(plane[i].rot - plane[i - 1].rot) / DT);
  }
  assert.ok(worstAccel < 900, `fastest speed change ${worstAccel.toFixed(0)} units/s^2`);
  assert.ok(worstTurn < 500, `fastest turn ${worstTurn.toFixed(0)} degrees/s`);
});

test("it keeps flying until it lines up, then slows and stops on the runway", () => {
  for (let i = 1; i < plane.length; i++) {
    if (plane[i].t > 0.05 && plane[i].t < 3.6) assert.ok(speed(plane[i - 1], plane[i]) > 40, `t=${plane[i].t.toFixed(2)} still flying`);
  }
  const i = plane.findIndex((f) => f.t >= INTRO_S - 1e-9);
  assert.ok(speed(plane[i - 1], plane[i]) < 5, "stopped by the time the owl leaves");
});

test("it lines up with the runway and its nose points down it, toward the user", () => {
  const end = at(plane, INTRO_S);
  assert.ok(near(wrap(end.rot), 0, 0.5), `nose ${wrap(end.rot).toFixed(2)} degrees from the runway`);
  assert.ok(near(end.x, STOP[0], 0.01) && near(end.y, STOP[1], 0.01), "stops in the middle of the runway");
  assert.ok(near(end.scale, 1, 1e-9));
});

test("it grows as it comes in, from far away to full size", () => {
  assert.ok(plane[0].scale < 0.4);
  for (let i = 1; i < plane.length; i++) assert.ok(plane[i].scale >= plane[i - 1].scale - 1e-9, "never shrinks");
  assert.ok(near(at(plane, INTRO_S).scale, 1, 1e-9));
});

test("the owl rides in the cockpit: it stays close to the plane until it hops out", () => {
  for (const f of owl.filter((q) => q.t <= HOP_AT)) {
    const p = at(plane, f.t);
    assert.ok(dist(p, f) < 40 * f.scale + 1, `t=${f.t.toFixed(2)} is ${dist(p, f).toFixed(1)} from the plane`);
  }
});

test("the owl hops out, arcs over and lands on its feet on the runway", () => {
  const hop = owl.filter((q) => q.t >= HOP_AT && q.t <= TOTAL_S);
  const highest = Math.min(...hop.map((q) => q.y));
  assert.ok(highest < STAND[1] - 15, `arcs up to y=${highest.toFixed(0)}`);
  const end = at(owl, TOTAL_S);
  assert.ok(near(end.x, STAND[0], 0.01) && near(end.y, STAND[1], 0.01), "ends where it should stand");
  assert.ok(near(wrap(end.rot), 0, 0.5), "upright");
  assert.ok(near(end.scale, 1, 1e-9));
  const [u, v] = toPlan([end.x, end.y]);
  assert.ok(Math.abs(u) < 200 && Math.abs(v) < 30, `stands on the runway at ${u.toFixed(0)},${v.toFixed(0)}`);
  assert.deepEqual(riderAt(TOTAL_S + 3), riderAt(TOTAL_S), "stays put once it is standing");
});

test("the owl's movement has no sudden jumps through the hop", () => {
  // A 34-unit hop in half a second, with no speed at either end, needs about 3,300 units/s^2 at its ends. A jump in
  // speed would be far larger than that: the bug this guards against was 31,000 from an arc that started at speed.
  let worst = 0;
  for (let i = 2; i < owl.length; i++) worst = Math.max(worst, Math.abs(speed(owl[i - 1], owl[i]) - speed(owl[i - 2], owl[i - 1])) / DT);
  assert.ok(worst < 4000, `fastest owl speed change ${worst.toFixed(0)} units/s^2`);
});

test("the CSS keyframes cover the whole timeline and finish on the poses above", () => {
  const plate = [...planeKeyframesCss("t-plane").matchAll(POSE)];
  assert.ok(plate.length > 90, `${plate.length} plane keyframes`);
  const pcts = plate.map((m) => +m[1]);
  assert.equal(pcts[0], 0);
  assert.equal(pcts[pcts.length - 1], 100);
  for (let i = 1; i < pcts.length; i++) assert.ok(pcts[i] > pcts[i - 1], "percentages strictly increase");
  const last = plate[plate.length - 1];
  assert.ok(near(+last[2], STOP[0], 0.06) && near(+last[3], STOP[1], 0.06), "the plane's last frame is its stop");
  assert.ok(near(wrap(+last[4]), 0, 0.1), "and it is lined up");

  const rider = [...riderKeyframesCss("t-rider").matchAll(POSE)];
  const rl = rider[rider.length - 1];
  assert.ok(near(+rl[2], STAND[0], 0.06) && near(+rl[3], STAND[1], 0.06), "the owl's last frame is where it stands");
  assert.ok(!/NaN|undefined|Infinity/.test(planeKeyframesCss() + riderKeyframesCss()));
});

test("the plane fades out as it stops, and is gone before the owl stands", () => {
  const css = vanishKeyframesCss("t-vanish");
  assert.match(css, /0%,[\d.]+%\{opacity:1\}/);
  assert.match(css, /[\d.]+%,100%\{opacity:0\}/);
});

test("iso3 lifts a point straight up the screen: z moves it up by ISO_K per unit and nothing sideways", () => {
  const [x0, y0] = iso(40, -20);
  const [x1, y1] = iso3(40, -20, 30);
  assert.ok(near(x1, x0, 1e-9));
  assert.ok(near(y1, y0 - 30 * ISO_K, 1e-9));
  assert.deepEqual(iso3(12, 7, 0), iso(12, 7), "at z = 0 it is the plain runway projection");
});

test("the owl's seat is the cockpit's floor point, in the plane's own units", () => {
  assert.deepEqual(COCKPIT, iso3(COCKPIT_U, 0, COCKPIT_Z));
});
