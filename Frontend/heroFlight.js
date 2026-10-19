/* The landing page's hero story, as data (no DOM). Tests: node --test Frontend/heroFlight.test.js

   The scene: a phone lies flat in an isometric view, so its runway runs away from the top of the screen and
   toward the viewer (down and to the right). The airplane is a chunky 3D prop plane (heroPlane.js models it with
   iso3 below) in the same view, so as it lines up with the runway its nose points down the runway, toward the user.

   The story, on one clock (seconds):
     0 - 1       the plane dives in from beyond the top-left corner and levels out
     1 - 3       one wide loop, a full turn, carrying it down toward the phone
     3 - 3.9     it lines up with the runway, touches down and rolls to a stop in the middle
     3.75 - 4    it fades out as it stops
     3.9 - 4.4   the owl, which has ridden in the cockpit all along, hops out and stands on the runway

   Coordinates are scene units (SCENE_W x SCENE_H); the browser scales the whole scene to fit its column. */

export const SCENE_W = 520;
export const SCENE_H = 440;

const RAD = Math.PI / 180;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, k) => a + (b - a) * k;
const smooth = (k) => k * k * (3 - 2 * k);
const n = (v, d = 2) => (+v.toFixed(d)).toString();   // trims trailing zeros: 12.50 -> 12.5
const headingOf = ([dx, dy]) => Math.atan2(dy, dx) / RAD;   // 0 = right, positive = down (clockwise on screen)
const along = ([x, y], heading, len) => [x + len * Math.cos(heading * RAD), y + len * Math.sin(heading * RAD)];

/* ---- the scene: isometric projection and layout ---- */

// Plan units (u along the runway, v across it) -> scene units. +u runs down and to the right, 30 degrees below
// horizontal, so the runway comes toward the viewer; +v runs down and to the left.
export const ISO_K = 0.5;
export const ISO_NOSE = 30;   // the screen direction of +u, in degrees: where a level plane's nose points
const COS30 = Math.cos(ISO_NOSE * RAD);
export function iso(u, v) { return [(u - v) * COS30 * ISO_K, (u + v) * 0.5 * ISO_K]; }
// The same view with height: z is straight up the screen, ISO_K per unit (the three axes are drawn equally long).
export function iso3(u, v, z) { const [x, y] = iso(u, v); return [x, y - z * ISO_K]; }
export const ISO_MATRIX = `matrix(${n(COS30 * ISO_K, 4)} ${n(0.5 * ISO_K, 4)} ${n(-COS30 * ISO_K, 4)} ${n(0.5 * ISO_K, 4)} 0 0)`;

export const PHONE_C = [300, 330];   // the phone's centre on screen
const onScreen = (u, v) => { const [x, y] = iso(u, v); return [PHONE_C[0] + x, PHONE_C[1] + y]; };
export const STOP = onScreen(0, 0);      // where the plane stops: the middle of the runway
export const STAND = onScreen(60, 0);    // where the owl stands once it is out, a little toward the viewer
// Where the owl sits, in the plane's own units (u along the nose, z up from the middle of the body): the middle of the
// cockpit opening, down on the floor of the cockpit, so the near wall of the body hides its feet and lower belly.
// heroPlane.js draws the plane around this point; its tests check how much of the owl shows above the rim.
export const COCKPIT_U = 15;
export const COCKPIT_Z = -20;
export const COCKPIT = iso3(COCKPIT_U, 0, COCKPIT_Z);   // the same point on screen, relative to the plane's centre, at full size
export const OWL_W = 185;                // the owl's artwork width in scene units, at full size
export const OWL_K = OWL_W / 520;        // the owl's viewBox (520 x 540) -> scene units
export const OWL_HEAD = 344 * OWL_K;     // how far the owl's ears rise above its feet
// Puts the owl's feet (its viewBox point 260,490) at the origin of whatever group holds it.
export const OWL_SVG = { x: -260 * OWL_K, y: -490 * OWL_K, width: 520 * OWL_K, height: 540 * OWL_K };
export const STOP_TRANSFORM = `translate(${n(STOP[0])}px,${n(STOP[1])}px) rotate(0deg) scale(1)`;
export const STAND_TRANSFORM = `translate(${n(STAND[0])}px,${n(STAND[1])}px) rotate(0deg) scale(1)`;

/* ---- the timeline ---- */

export const FLY_S = 3;                    // the dive and the loop
export const LAND_S = 0.9;                 // lining up, touchdown and the roll to a stop
export const INTRO_S = FLY_S + LAND_S;     // 3.9: the plane has stopped
export const VANISH_AT = 3.75;             // the plane starts to fade ...
export const VANISH_S = 0.25;              // ... and is gone
export const HOP_AT = INTRO_S;             // the owl leaves the cockpit as the plane stops
export const HOP_S = 0.5;                  // ... and lands on its feet
export const TOTAL_S = HOP_AT + HOP_S;     // 4.4: the owl is standing
const HOP_HEIGHT = 34;                     // how high the owl arcs on the way out

/* ---- the route, in screen units ---- */

// A cubic bezier: { point(u), tangent(u) } for u in 0..1.
function bezier(p0, p1, p2, p3) {
  return {
    point: (u) => {
      const m = 1 - u;
      return [
        m * m * m * p0[0] + 3 * m * m * u * p1[0] + 3 * m * u * u * p2[0] + u * u * u * p3[0],
        m * m * m * p0[1] + 3 * m * m * u * p1[1] + 3 * m * u * u * p2[1] + u * u * u * p3[1],
      ];
    },
    tangent: (u) => {
      const m = 1 - u;
      return [
        3 * m * m * (p1[0] - p0[0]) + 6 * m * u * (p2[0] - p1[0]) + 3 * u * u * (p3[0] - p2[0]),
        3 * m * m * (p1[1] - p0[1]) + 6 * m * u * (p2[1] - p1[1]) + 3 * u * u * (p3[1] - p2[1]),
      ];
    },
  };
}

// The loop: one full turn around a centre that drifts toward the phone, so it does not close on itself.
const LOOP = { cx: 112, cy: 126, r: 68, driftX: 62, driftY: 24 };
function loop({ cx, cy, r, driftX, driftY }) {
  const a = (u) => Math.PI / 2 - u * Math.PI * 2;   // starts at the bottom of the circle, goes round once
  return {
    point: (u) => [cx + driftX * u + r * Math.cos(a(u)), cy + driftY * u + r * Math.sin(a(u))],
    tangent: (u) => [driftX + r * Math.sin(a(u)) * Math.PI * 2, driftY - r * Math.cos(a(u)) * Math.PI * 2],
  };
}
const LOOP_PATH = loop(LOOP);
const LOOP_START = LOOP_PATH.point(0);
const LOOP_END = LOOP_PATH.point(1);
const LOOP_START_HEADING = headingOf(LOOP_PATH.tangent(0));
const LOOP_END_HEADING = headingOf(LOOP_PATH.tangent(1));

const DIVE_FROM = [-70, 36];
const DIVE_HEADING = 24;
const DIVE = bezier(DIVE_FROM, along(DIVE_FROM, DIVE_HEADING, 110), along(LOOP_START, LOOP_START_HEADING + 180, 120), LOOP_START);
// Lining up: from the loop's exit, curve down to the middle of the runway, arriving along the runway's direction.
const APPROACH = bezier(LOOP_END, along(LOOP_END, LOOP_END_HEADING, 60), along(STOP, ISO_NOSE + 180, 70), STOP);

// Each piece: its curve, how long it takes, the plane's speed where it is set by hand (the rest follow from the
// neighbours, below) and the plane's scale at its start and end (it is far away in the sky and grows as it comes in).
const PIECES = [
  { geom: DIVE, dur: 1.0, v0: 300, v1: null, scale: [0.36, 0.5] },
  { geom: LOOP_PATH, dur: 2.0, v0: null, v1: null, scale: [0.5, 0.55] },
  { geom: APPROACH, dur: LAND_S, v0: null, v1: 0, scale: [0.55, 1] },
];

/* ---- sampling ---- */

const TABLE = 400;   // samples per piece, to turn distance along a curve into the curve's parameter

function prepare(piece) {
  const lens = [0];
  let prev = piece.geom.point(0);
  for (let i = 1; i <= TABLE; i++) {
    const p = piece.geom.point(i / TABLE);
    lens.push(lens[i - 1] + Math.hypot(p[0] - prev[0], p[1] - prev[1]));
    prev = p;
  }
  // Headings, unwrapped: a full turn reads as 360 degrees, not as a jump from -180 to +180.
  const heads = [headingOf(piece.geom.tangent(0))];
  for (let i = 1; i <= TABLE; i++) {
    let h = headingOf(piece.geom.tangent(i / TABLE));
    const last = heads[i - 1];
    while (h - last > 180) h -= 360;
    while (h - last < -180) h += 360;
    heads.push(h);
  }
  return { ...piece, lens, length: lens[TABLE], heads };
}

// The loop runs at one steady speed; the dive leaves its descent at that same speed; lining up begins at it and
// brakes to a stop. Each piece's heading then carries on from the one before, so the nose turns without a jump.
const built = (() => {
  const pieces = PIECES.map(prepare);
  const [dive, around, land] = pieces;
  around.v0 = around.v1 = around.length / around.dur;
  dive.v1 = around.v0;
  land.v0 = around.v1;
  let t = 0, heading = 0;
  pieces.forEach((p, i) => {
    p.t0 = t;
    t += p.dur;
    p.headingOffset = i === 0 ? 0 : heading - p.heads[0];
    heading = p.heads[TABLE] + p.headingOffset;
  });
  return pieces;
})();

// Distance along a piece (0..length) -> the curve's parameter u.
function uAt(piece, s) {
  if (s <= 0) return 0;
  if (s >= piece.length) return 1;
  const { lens } = piece;
  let lo = 0, hi = TABLE;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (lens[mid] <= s) lo = mid; else hi = mid; }
  return (lo + (s - lens[lo]) / (lens[hi] - lens[lo])) / TABLE;
}

// The cubic that carries a piece from distance 0 to its full length in its duration, from speed v0 to v1.
function progress(piece, tau) {
  const k = (piece.v0 * piece.dur) / piece.length, m = (piece.v1 * piece.dur) / piece.length;
  return k * tau + (3 - 2 * k - m) * tau * tau + (k + m - 2) * tau * tau * tau;
}

/* The plane at time t seconds: { x, y, rot (degrees, unwrapped), scale }. rot is the sprite's rotation, so 0 means
   the plane's nose points down the runway (the level, lined-up pose). */
export function poseAt(t) {
  const time = clamp(t, 0, INTRO_S);
  const piece = built.find((p) => time <= p.t0 + p.dur) ?? built[built.length - 1];
  const tau = clamp((time - piece.t0) / piece.dur, 0, 1);
  const f = clamp(progress(piece, tau), 0, 1);
  const u = uAt(piece, f * piece.length);
  const [x, y] = piece.geom.point(u);
  const idx = u * TABLE, i = Math.min(Math.floor(idx), TABLE - 1);
  const heading = lerp(piece.heads[i], piece.heads[i + 1], idx - i) + piece.headingOffset;
  return { x, y, rot: heading - ISO_NOSE, scale: lerp(piece.scale[0], piece.scale[1], f) };
}

// The plane's pose, with the owl's feet at the cockpit (the owl turns and scales with the plane until it hops out).
function cockpitAt(t) {
  const p = poseAt(t);
  const r = p.rot * RAD, c = Math.cos(r), s = Math.sin(r);
  return {
    x: p.x + p.scale * (COCKPIT[0] * c - COCKPIT[1] * s),
    y: p.y + p.scale * (COCKPIT[0] * s + COCKPIT[1] * c),
    rot: p.rot,
    scale: p.scale,
  };
}

/* The owl at time t: in the cockpit until HOP_AT, then arcing out and standing upright on the runway. */
export function riderAt(t) {
  const time = clamp(t, 0, TOTAL_S);
  if (time <= HOP_AT) return cockpitAt(time);
  const from = cockpitAt(HOP_AT);
  const to = { x: STAND[0], y: STAND[1], rot: Math.round(from.rot / 360) * 360, scale: 1 };
  const k = smooth(clamp((time - HOP_AT) / HOP_S, 0, 1));   // eases in and out, so the arc starts and ends with no speed
  return {
    x: lerp(from.x, to.x, k),
    y: lerp(from.y, to.y, k) - HOP_HEIGHT * 4 * k * (1 - k),
    rot: lerp(from.rot, to.rot, k),
    scale: lerp(from.scale, to.scale, k),
  };
}

/* ---- CSS ---- */

const KEY_STEP = 0.04;   // seconds between keyframes (about 25 a second)
const pct = (t) => n((t / TOTAL_S) * 100, 3);

function keyframeList(fn) {
  const count = Math.ceil(TOTAL_S / KEY_STEP - 1e-9);
  const frames = [];
  for (let i = 0; i <= count; i++) {
    const t = Math.min(i * KEY_STEP, TOTAL_S);
    const p = fn(t);
    frames.push(`${pct(t)}%{transform:translate(${n(p.x)}px,${n(p.y)}px) rotate(${n(p.rot)}deg) scale(${n(p.scale, 4)})}`);
  }
  return frames.join("");
}

export function planeKeyframesCss(name = "eai-plane-go") {
  return `@keyframes ${name}{${keyframeList(poseAt)}}`;
}

export function riderKeyframesCss(name = "eai-rider-go") {
  return `@keyframes ${name}{${keyframeList(riderAt)}}`;
}

// The plane's fade-out: fully there until VANISH_AT, gone by VANISH_AT + VANISH_S, and gone for good after that.
export function vanishKeyframesCss(name = "eai-plane-vanish") {
  return `@keyframes ${name}{0%,${pct(VANISH_AT)}%{opacity:1}${pct(VANISH_AT + VANISH_S)}%,100%{opacity:0}}`;
}
