/* Tests for how the airplane is painted (Frontend/HeroPlane.jsx) and where it sits in the landing scene.
   Run with:  node --test Frontend/heroPlane.ssr.test.js   (renders to static markup through Vite, like the other component tests) */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { startSsr } from "./rewards/ssrHarness.js";
import { PLANE } from "./heroPlane.js";

let s, mod, defs, back, front;
before(async () => {
  s = await startSsr();
  mod = await s.load("/Frontend/HeroPlane.jsx");
  const svg = (el) => s.render(s.h("svg", null, el));
  defs = svg(s.h("defs", null, s.h(mod.HeroPlaneDefs, { uid: "t" })));
  back = svg(s.h(mod.HeroPlaneBack, { uid: "t" }));
  front = svg(s.h(mod.HeroPlaneFront, { uid: "t" }));
});
after(() => s.close());

test("the back layer holds everything behind the owl: far wing, body, cockpit inside, far rim, seat back", () => {
  for (const part of [PLANE.wings.far.top, PLANE.tail.farStab.top, PLANE.fuselage.path, PLANE.tail.fin, PLANE.cockpit.interior, PLANE.cockpit.farArcPath, PLANE.cockpit.seat.front]) {
    assert.ok(back.includes(`d="${part}"`), `missing ${part.slice(0, 40)}`);
  }
});

test("the back layer leaves the near side to the front layer", () => {
  for (const part of [PLANE.wings.near.top, PLANE.tail.nearStab.top, PLANE.cockpit.nearArcPath, PLANE.nose.cowl]) {
    assert.ok(!back.includes(`d="${part}"`), `${part.slice(0, 40)} should be in the front layer`);
  }
});

test("the front layer is the near wall of the body, clipped to everything in front of the near rim, plus the near side", () => {
  assert.match(front, /clip-path="url\(#t-near\)"/);
  assert.ok(front.includes(`d="${PLANE.fuselage.path}"`), "a copy of the body, so it can hide the owl's lower half");
  for (const part of [PLANE.cockpit.nearArcPath, PLANE.wings.near.top, PLANE.tail.nearStab.top, PLANE.nose.cowl]) assert.ok(front.includes(`d="${part}"`), `missing ${part.slice(0, 40)}`);
  assert.ok(!front.includes(`d="${PLANE.cockpit.interior}"`) && !front.includes(`d="${PLANE.cockpit.seat.front}"`), "the cockpit's inside stays behind the owl");
});

test("the propeller is in the front layer and spins", () => {
  assert.match(front, /class="eai-prop-spin"/);
  assert.ok(front.includes(`transform="${PLANE.nose.matrix}"`));
});

test("the front layer's clip is the cockpit's clip polygon", () => {
  assert.ok(defs.includes(`<clipPath id="t-near"><path d="${PLANE.cockpit.clip}"`));
});

test("every gradient and clip the two layers use is defined once in the shared defs", () => {
  const used = new Set([...(back + front).matchAll(/url\(#([^)]+)\)/g)].map((m) => m[1]));
  assert.ok(used.size >= 4, `uses ${[...used].join(", ")}`);
  for (const id of used) assert.equal((defs.match(new RegExp(`id="${id}"`, "g")) || []).length, 1, `${id} is defined once`);
});

test("no bad numbers in the painted markup", () => {
  for (const html of [defs, back, front]) assert.ok(!/NaN|undefined|Infinity/.test(html));
});

test("in the landing scene the owl sits between the two plane layers, and both layers play the plane's animation", () => {
  const app = readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  const b = app.indexOf("<HeroPlaneBack"), owl = app.indexOf("<OwlMascot calm seated"), f = app.indexOf("<HeroPlaneFront");
  assert.ok(b > 0 && owl > b && f > owl, "back, then the owl, then the front");
  assert.ok(app.includes("<HeroPlaneDefs"), "the shared defs are in the scene");
  const scene = app.slice(app.indexOf("function HeroScene"), app.indexOf("function BondusLogo"));
  assert.equal((scene.match(/<g className="eai-plane">/g) || []).length, 2, "one animated group per layer");
});
