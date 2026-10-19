/* The landing page's airplane as geometry: no DOM, no colours (HeroPlane.jsx paints it). Tests: node --test Frontend/heroPlane.test.js

   The plane is modelled in 3D, in the same units as the phone and its runway (u along the nose, v across the plane, z up
   from the middle of the body), and projected with heroFlight.js's iso3 so it shares the scene's view: its nose points
   down the runway, toward the viewer, and every part has real thickness. Everything is in screen units relative to the
   plane's centre, at full size; the scene scales and turns the whole plane as one.

   The pieces and the order they are drawn in (HeroPlane.jsx), with the owl drawn between the two layers:
     back   far wing, far tail wing, body, tail fin, the cockpit's inside, its far rim, the seat back
     front  the near wall of the body (a clipped copy of it, so it hides the owl's lower half), the near rim, the near
            tail wing, the near wing, the engine cowl, the propeller
   The cockpit is an oval cut into the top of the body. Its rim is split into the half behind the owl and the half in
   front of it: the lower chain of the oval on screen. */
import { iso3, ISO_K, ISO_NOSE, COCKPIT_U } from "./heroFlight.js";

const RAD = Math.PI / 180;
const P = iso3;
const AX = [Math.cos(ISO_NOSE * RAD), Math.sin(ISO_NOSE * RAD)];   // the body's axis on screen: down and to the right
const UP = [AX[1], -AX[0]];                                         // across the body, toward the top of the screen
const SIL = ISO_K * Math.sqrt(1.5);                                 // a round body of radius r is 2 * SIL * r wide on screen
const f1 = (v) => +v.toFixed(1);
const pathOf = (points, close = true) => `M${points.map(([x, y]) => `${f1(x)} ${f1(y)}`).join("L")}${close ? "Z" : ""}`;
const mean = (list) => list.reduce((s, v) => s + v, 0) / list.length;
const along = ([x, y]) => x * AX[0] + y * AX[1];
const across = ([x, y]) => x * UP[0] + y * UP[1];

/* ---- the body: a fat barrel, round at both ends ---- */

const U_TAIL = -178;
const U_NOSE = 152;
const U_BAND = 100;   // where the painted band goes round the body
// [u, radius] along the body. A smooth curve runs through them (bodyRadius).
const SPINE = [[-178, 9], [-142, 20], [-84, 41], [-14, 62], [44, 66], [102, 62], [138, 54], [152, 46]];

export function bodyRadius(u) {
  const last = SPINE.length - 1;
  if (u <= SPINE[0][0]) return SPINE[0][1];
  if (u >= SPINE[last][0]) return SPINE[last][1];
  let i = 0;
  while (u > SPINE[i + 1][0]) i++;
  const [u0, r0] = SPINE[i], [u1, r1] = SPINE[i + 1];
  const t = (u - u0) / (u1 - u0);
  const rm = SPINE[Math.max(i - 1, 0)][1], rp = SPINE[Math.min(i + 2, last)][1];   // Catmull-Rom through the points
  return 0.5 * (2 * r0 + (-rm + r1) * t + (2 * rm - 5 * r0 + 4 * r1 - rp) * t * t + (-rm + 3 * r0 - 3 * r1 + rp) * t * t * t);
}

// How far the body's silhouette stands out from its axis at u. Each cross-section is a circle in the plane across the
// nose, which this view shows as an oval (SIL * r wide across the axis, SIL / sqrt(3) * r along it); because the body
// tapers, the bigger ovals just ahead of u reach back over it, so the silhouette is the outer edge of all of them.
function halfWidth(u) {
  let best = 0;
  for (let du = -24; du <= 24; du += 2) {
    const r = bodyRadius(u + du), a = SIL * r, b = (SIL / Math.sqrt(3)) * r, d = ISO_K * du;
    if (Math.abs(d) < b) best = Math.max(best, a * Math.sqrt(1 - (d / b) ** 2));
  }
  return best + 0.6;
}

function buildFuselage() {
  const top = [], bottom = [], ridge = [];
  for (let u = U_TAIL; u <= U_NOSE + 1e-9; u += 4) {
    const [cx, cy] = P(u, 0, 0), h = halfWidth(u);
    top.push([cx + UP[0] * h, cy + UP[1] * h]);
    bottom.push([cx - UP[0] * h, cy - UP[1] * h]);
    if (u >= -150 && u <= 132) ridge.push([cx + UP[0] * h * 0.5, cy + UP[1] * h * 0.5]);
  }
  const hn = halfWidth(U_NOSE), ht = halfWidth(U_TAIL);
  const [nx, ny] = P(U_NOSE, 0, 0), [tx, ty] = P(U_TAIL, 0, 0);
  const noseCap = [], tailCap = [];
  for (let i = 1; i < 8; i++) {
    const a = (i / 8) * Math.PI;   // from the top round the front to the underside
    noseCap.push([nx + UP[0] * hn * Math.cos(a) + AX[0] * hn * 0.5 * Math.sin(a), ny + UP[1] * hn * Math.cos(a) + AX[1] * hn * 0.5 * Math.sin(a)]);
    tailCap.push([tx - UP[0] * ht * Math.cos(a) - AX[0] * ht * 0.9 * Math.sin(a), ty - UP[1] * ht * Math.cos(a) - AX[1] * ht * 0.9 * Math.sin(a)]);
  }
  const outline = [...top, ...noseCap, ...bottom.reverse(), ...tailCap];
  const widest = Math.max(...top.map((p) => across(p) - across(P(U_TAIL, 0, 0))));   // the shading runs from belly to top across this much
  // A painted band round the body behind the cockpit: the half of a circle across the body that faces the viewer.
  const bandR = bodyRadius(U_BAND) + 0.4;
  const bandPoints = Array.from({ length: 25 }, (_, k) => { const phi = (-45 + (k / 24) * 180) * RAD; return P(U_BAND, bandR * Math.cos(phi), bandR * Math.sin(phi)); });
  return {
    outline,
    path: pathOf(outline),
    highlight: pathOf(ridge, false),
    band: pathOf(bandPoints, false),
    bandPoints,
    // The body's shading, as a gradient vector across it (belly to top), centred on the plane's centre.
    shade: [-UP[0] * widest, -UP[1] * widest, UP[0] * widest, UP[1] * widest].map(f1),
    lengthPx: Math.max(...outline.map(along)) - Math.min(...outline.map(along)),
    thicknessPx: Math.max(...outline.map(across)) - Math.min(...outline.map(across)),
  };
}

/* ---- the cockpit: an oval cut into the top of the body ---- */

const COCK = { u: COCKPIT_U, a: 62, b: 46 };   // the opening's half-length along the nose and half-width across it

function buildCockpit(fuselage) {
  const N = 72;
  const ring = [];
  for (let i = 0; i < N; i++) {
    const th = (i / N) * 2 * Math.PI;
    const u = COCK.u + COCK.a * Math.cos(th), v = COCK.b * Math.sin(th);
    ring.push(P(u, v, Math.sqrt(Math.max(bodyRadius(u) ** 2 - v * v, 0))));   // on the body's surface
  }
  let iL = 0, iR = 0;
  ring.forEach((p, i) => { if (p[0] < ring[iL][0]) iL = i; if (p[0] > ring[iR][0]) iR = i; });
  const chain = (from, to) => { const out = []; for (let i = from; ; i = (i + 1) % N) { out.push(ring[i]); if (i === to) break; } return out; };
  const a = chain(iL, iR), b = chain(iR, iL).reverse();   // two chains, each left to right
  const aIsLower = mean(a.map((p) => p[1])) > mean(b.map((p) => p[1]));
  const nearArc = aIsLower ? a : b, farArc = aIsLower ? b : a;

  // The y of the near rim at screen x (straight lines between its points; flat beyond its ends).
  const nearArcY = (x) => {
    if (x <= nearArc[0][0]) return nearArc[0][1];
    for (let i = 1; i < nearArc.length; i++) {
      if (x <= nearArc[i][0]) {
        const [x0, y0] = nearArc[i - 1], [x1, y1] = nearArc[i];
        return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
      }
    }
    return nearArc[nearArc.length - 1][1];
  };

  // Everything on the viewer's side of the near rim: the part of the body that stands in front of the owl.
  const xl = nearArc[0][0], xr = nearArc[nearArc.length - 1][0];
  const bottomY = Math.max(...fuselage.outline.map((p) => p[1])) + 40;
  const clipPolygon = [...nearArc, [xr + 60, nearArc[nearArc.length - 1][1]], [xr + 60, bottomY], [xl - 60, bottomY], [xl - 60, nearArc[0][1]]];

  const centre = P(COCK.u, 0, bodyRadius(COCK.u));
  // The seat back: a padded rest standing up at the tail end of the opening, behind the owl.
  const sU0 = COCK.u - COCK.a + 6, sU1 = sU0 + 18, sV = 37, sZ0 = bodyRadius(sU0) - 6, sZ1 = bodyRadius(sU0) + 48;
  const seatTop = [P(sU0, -sV, sZ1), P(sU1, -sV, sZ1), P(sU1, sV, sZ1), P(sU0, sV, sZ1)];
  const seatFront = [P(sU1, -sV, sZ0), P(sU1, sV, sZ0), P(sU1, sV, sZ1), P(sU1, -sV, sZ1)];
  const seatSide = [P(sU0, sV, sZ0), P(sU1, sV, sZ0), P(sU1, sV, sZ1), P(sU0, sV, sZ1)];
  return {
    ring, nearArc, farArc, nearArcY, clipPolygon, centre,
    interior: pathOf(ring),
    nearArcPath: pathOf(nearArc, false),
    farArcPath: pathOf(farArc, false),
    clip: pathOf(clipPolygon),
    seat: { top: pathOf(seatTop), front: pathOf(seatFront), side: pathOf(seatSide) },
  };
}

/* ---- wings and tail ---- */

// A flat, tapered plank with a rounded tip, as a plan-view outline. `sign` picks the side: +1 the near one, -1 the far one.
function planform(sign, { vRoot, vTip, rootLead, rootTrail, tipLead, tipTrail, capLength }) {
  const round = 24, vArc = vTip - round, uc = (tipLead + tipTrail) / 2, hc = (tipLead - tipTrail) / 2;
  const arc = Array.from({ length: 9 }, (_, i) => { const a = (i / 8) * Math.PI; return [uc + hc * Math.cos(a), (vArc + round * Math.sin(a)) * sign]; });
  // The painted wing tip: the rounded end, cut off straight across `capLength` in from where the curve starts.
  const vCut = vArc - capLength, k = (vCut - vRoot) / (vArc - vRoot);
  const cap = [[rootLead + (tipLead - rootLead) * k, vCut * sign], ...arc, [rootTrail + (tipTrail - rootTrail) * k, vCut * sign]];
  return { pts: [[rootLead, vRoot * sign], ...arc, [rootTrail, vRoot * sign]], cap, tip: [uc, vTip * sign] };
}

// A plank with thickness: its top face, and the same outline dropped by the thickness (drawn first, it shows as the edge).
function slab(shape, z, thickness) {
  const top = shape.pts.map(([u, v]) => P(u, v, z));
  const low = shape.pts.map(([u, v]) => P(u, v, z - thickness));
  return {
    top: pathOf(top), edge: pathOf(low), tipCap: pathOf(shape.cap.map(([u, v]) => P(u, v, z))),
    points: [...top, ...low], tip: P(shape.tip[0], shape.tip[1], z), thickness: thickness * ISO_K,
  };
}

const WING = { vTip: 196, rootLead: 64, rootTrail: -44, tipLead: 36, tipTrail: -20, capLength: 26 };
const WING_Z = -14, WING_T = 14;
const STAB = { vTip: 84, rootLead: -126, rootTrail: -170, tipLead: -136, tipTrail: -158, capLength: 14 };
const STAB_Z = 0, STAB_T = 9;

function buildWings() {
  // The near wing starts where it leaves the body; the far one starts at the middle, hidden behind the body.
  const near = slab(planform(1, { ...WING, vRoot: 60 }), WING_Z, WING_T);
  const far = slab(planform(-1, { ...WING, vRoot: 0 }), WING_Z, WING_T);
  near.span = Math.hypot(near.tip[0] - far.tip[0], near.tip[1] - far.tip[1]);
  far.span = near.span;
  return { near, far };
}

function buildTail() {
  const near = slab(planform(1, { ...STAB, vRoot: 16 }), STAB_Z, STAB_T);
  const far = slab(planform(-1, { ...STAB, vRoot: 0 }), STAB_Z, STAB_T);
  // The fin stands on the ridge of the body and rises from it; its far face is drawn first so a sliver of edge shows.
  const FIN_TOP = 124;
  const base = [], lead = [[-132, FIN_TOP], [-150, FIN_TOP + 4]];
  for (let u = -84; u >= -176; u -= 8) base.push([u, bodyRadius(u) - 1]);
  const finUz = [...base, [-178, FIN_TOP - 14], ...lead.reverse(), [-124, FIN_TOP - 4]];
  const fin = finUz.map(([u, z]) => P(u, 0, z));
  const thick = finUz.map(([u, z]) => P(u, -5, z));
  // A band across the fin, painted gold (HeroPlane.jsx clips it to the fin's outline).
  const stripe = [[-200, 84], [-100, 84], [-100, 98], [-200, 98]].map(([u, z]) => P(u, 0, z));
  return {
    farStab: far, nearStab: near,
    fin: pathOf(fin), finEdge: pathOf(thick), finPoints: fin, finStripe: pathOf(stripe),
    finHeight: (FIN_TOP - bodyRadius(-132)) * ISO_K,
  };
}

/* ---- the nose: engine cowl, spinner and propeller ---- */

const COS30 = Math.cos(30 * RAD);
function buildNose() {
  const circle = (u, r, n = 40) => Array.from({ length: n }, (_, i) => { const a = (i / n) * 2 * Math.PI; return P(u, r * Math.cos(a), r * Math.sin(a)); });
  const HUB_U = 170, DISC = 64;
  const hub = P(HUB_U, 0, 0);
  // The propeller turns in the plane across the nose, spanned by the v and z axes: a circle in it becomes this slanted oval.
  const matrix = [-COS30 * ISO_K, 0.5 * ISO_K, 0, -ISO_K, hub[0], hub[1]];
  const disc = Array.from({ length: 40 }, (_, i) => { const a = (i / 40) * 2 * Math.PI; return [matrix[0] * DISC * Math.cos(a) + matrix[4], matrix[1] * DISC * Math.cos(a) + matrix[3] * DISC * Math.sin(a) + matrix[5]]; });
  const cowl = circle(U_NOSE + 2, 50), cowlInner = circle(U_NOSE + 2, 34);
  return {
    cowl: pathOf(cowl), cowlInner: pathOf(cowlInner), cowlPoints: cowl,
    hub, discRadius: DISC, discPoints: disc,
    matrix: `matrix(${matrix.map((v) => +v.toFixed(4)).join(" ")})`,
    spinner: P(HUB_U - 4, 0, 0),
  };
}

/* ---- the whole plane ---- */

export const PLANE = (() => {
  const fuselage = buildFuselage();
  const cockpit = buildCockpit(fuselage);
  const wings = buildWings();
  const tail = buildTail();
  const nose = buildNose();
  const all = [...fuselage.outline, ...wings.near.points, ...wings.far.points, ...tail.nearStab.points, ...tail.farStab.points, ...tail.finPoints, ...nose.cowlPoints, ...nose.discPoints];
  const bounds = {
    minX: Math.min(...all.map((p) => p[0])), maxX: Math.max(...all.map((p) => p[0])),
    minY: Math.min(...all.map((p) => p[1])), maxY: Math.max(...all.map((p) => p[1])),
  };
  return { fuselage, cockpit, wings, tail, nose, bounds };
})();
