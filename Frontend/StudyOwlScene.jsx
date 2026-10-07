import { useEffect, useRef } from "react";
import { useRewards } from "./rewards/RewardsContext.jsx";
import { OutfitLayers } from "./rewards/itemArt.jsx";

/* Dashboard hero scene: the blue owl mascot sitting at a desk, copying a worked maths solution into
   his notebook while the whiteboard behind him writes that solution out step by step. When the
   answer lands he has an "aha" moment (lightbulb, happy eyes, arms up), the board is wiped, and the
   next problem starts — four problems in a loop.

   Built the same way as OwlMascot in App.jsx: a hand-rigged SVG (no animation library) driven by one
   requestAnimationFrame loop and a tiny spring solver. What's different: the owl is seated, so his
   arms are soft curved wings that reach from the shoulders to wherever the hands should be (the
   right hand follows the pencil tip along the squiggle being drawn in the notebook), and the scene
   is split into far / mid / near layers that drift against each other for a gentle 3D parallax —
   an idle sway by default, pointer-driven while the mouse moves. Clicking the scene triggers the
   "aha" reaction early.

   With prefers-reduced-motion the loop never starts: one still frame is drawn instead. The wall and
   floor colours come from CSS variables on .eai-hero-mascot (see STYLES in App.jsx), so the scene
   follows the light / dark theme. */

const OX = 452, OY = 312, OS = 0.7;          // owl origin (desk level, between his feet) and scale
const SHOULDER = { L: [-56, -88], R: [56, -88] };   // arm pivots, owl-local units
const GRIP = 46;                              // distance from the pencil tip to where the hand holds it, owl-local units
const D = 13.2;                               // seconds per problem

const PROBLEMS = [
  { rows: ["2x + 3 = 11", "2x = 8", "x = 4"], fig: null },
  { rows: ["3² + 4² = c²", "9 + 16 = c²", "c = 5"], fig: "tri" },
  { rows: ["f(x) = x³", "f'(x) = 3x²", "f'(2) = 12"], fig: null },
  { rows: ["y = x² - 4", "x² - 4 = 0", "x = ±2"], fig: "par" },
];
const ROW_X = 38, ROW_Y = [90, 138, 186];

// Timeline of one problem (seconds from its start). Board rows are written while the owl looks at
// the board; he then looks down and copies each row into the notebook.
const WRITE = [[0.2, 1.35], [3.5, 4.65], [6.8, 7.95]];
const COPY = [[1.75, 3.05], [5.05, 6.35], [8.6, 9.9]];
const GAZE = [[0, 1.6, "board"], [1.6, 3.3, "note"], [3.3, 4.9, "board"], [4.9, 6.6, "note"], [6.6, 8.6, "board"], [8.6, 10.0, "note"], [10.0, 11.9, "viewer"], [11.9, 13.2, "board"]];
const FIG = [4.0, 5.8];
const CHECK = [8.05, 8.55];
const AHA = [10.0, 11.9];
const ERASE = [11.95, 12.75];
const NOTE_FADE = [11.9, 12.5];

// Notebook squiggles (the owl's "handwriting"): wavy lines the pencil tip rides along.
const wave = (x0, y, n, seed) => {
  let d = `M ${x0} ${y}`;
  for (let i = 0; i < n; i++) {
    const amp = 1.1 + 1.5 * (0.5 + 0.5 * Math.sin(seed * 7.3 + i * 2.1));
    d += ` q 0.9 ${(i % 2 ? -amp : amp).toFixed(2)} 2.7 0`;
  }
  return d;
};
const SQUIGGLES = [wave(468, 306.4, 16, 1), wave(468, 312.4, 14, 2), wave(468, 318.4, 9, 3)];

// y = x² - 4 sketched on the board (axes centred on 258, 170; 10 units per grid square)
const PARABOLA = (() => {
  const pts = [];
  for (let x = -3; x <= 3.001; x += 0.25) pts.push(`${(258 + x * 10).toFixed(1)} ${(170 - (x * x - 4) * 10).toFixed(1)}`);
  return `M ${pts.join(" L ")}`;
})();

// Bunting along the top of the wall: flags sampled along a quadratic curve
const BUNTING = (() => {
  const P0 = [326, 6], P1 = [480, 42], P2 = [700, 4];
  const at = (t) => [0, 1].map((i) => (1 - t) ** 2 * P0[i] + 2 * (1 - t) * t * P1[i] + t * t * P2[i]);
  const colors = ["#5DBB93", "#F5C04A", "#F28C7D", "#7FAAF7", "#5DBB93", "#F5C04A", "#F28C7D", "#7FAAF7", "#5DBB93"];
  return {
    d: `M ${P0.join(" ")} Q ${P1.join(" ")} ${P2.join(" ")}`,
    flags: colors.map((c, i) => { const [x, y] = at((i + 0.7) / (colors.length + 0.4)); return { x, y, c }; }),
  };
})();

export default function StudyOwlScene() {
  const uid = useRef(Math.random().toString(36).slice(2, 8)).current;
  const { outfit } = useRewards();   // the saved outfit: cosmetic layers draw at the same four mounts as OwlMascot's
  const refs = useRef({});
  const setRef = (name) => (el) => { refs.current[name] = el; };
  const id = (name) => `${name}-${uid}`;
  const url = (name) => `url(#${name}-${uid})`;

  useEffect(() => {
    const $ = (name) => refs.current[name];
    const svgEl = $("svg");
    if (!svgEl) return undefined;
    const reduceMotion = !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const TAU = Math.PI * 2;
    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
    const lerp = (a, b, k) => a + (b - a) * k;
    const sm = (k) => k * k * (3 - 2 * k);
    const backOut = (k) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * (k - 1) ** 3 + c1 * (k - 1) ** 2; };
    const win = (t, [a, b]) => clamp((t - a) / (b - a), 0, 1);
    const f = (n) => n.toFixed(2);

    /* ── springs: every animated number eases toward its target instead of snapping ── */
    const cfg = {
      hr: [150, 14], hx: [150, 14], hy: [230, 17], lx: [200, 17], ly: [200, 17], brow: [140, 14], open: [220, 19], happy: [260, 22],
      ear: [120, 9], rx: [320, 26], ry: [320, 26], lx2: [200, 18], ly2: [200, 18], pa: [160, 15],
      mx: [90, 13], my: [90, 13], ma: [90, 12], ex: [120, 15], ey: [120, 15], px: [40, 10], py: [40, 10], bulb: [200, 16],
    };
    const P = {};
    Object.keys(cfg).forEach((k) => { P[k] = { x: 0, v: 0, t: 0, k: cfg[k][0], c: cfg[k][1] }; });
    P.open.x = P.open.t = 1;
    const step = (dt) => {
      const n = 2, h = dt / n;
      for (let i = 0; i < n; i++) for (const k in P) { const p = P[k]; p.v += ((p.t - p.x) * p.k - p.v * p.c) * h; p.x += p.v * h; }
    };

    /* ── per-problem content: texts, measured widths, figure ── */
    const rowEls = [0, 1, 2].map((k) => $(`row${k}`));
    const clipEls = [0, 1, 2].map((k) => $(`clipRect${k}`));
    const sqEls = [0, 1, 2].map((k) => $(`sq${k}`));
    const sqLen = sqEls.map((el) => el.getTotalLength());
    sqEls.forEach((el, k) => { el.style.strokeDasharray = `${sqLen[k]}`; });
    const parLen = $("parPath").getTotalLength();
    const triLen = $("triPath").getTotalLength();
    const chkLen = $("check").getTotalLength();
    $("parPath").style.strokeDasharray = `${parLen}`;
    $("triPath").style.strokeDasharray = `${triLen}`;
    $("check").style.strokeDasharray = `${chkLen}`;
    let rowW = [120, 100, 80];
    let curProblem = -1;
    let ulLen = 1;

    function loadProblem(pi) {
      curProblem = pi;
      const pr = PROBLEMS[pi];
      pr.rows.forEach((txt, k) => { rowEls[k].textContent = txt; });
      measure();
      $("figTri").setAttribute("opacity", "0");
      $("figPar").setAttribute("opacity", "0");
    }
    function measure() {
      const pr = PROBLEMS[curProblem];
      if (!pr) return;
      const maxW = pr.fig ? 158 : 250;
      rowEls.forEach((el) => el.setAttribute("font-size", "32"));
      rowW = rowEls.map((el, k) => (el.getComputedTextLength?.() || pr.rows[k].length * 14));
      const scale = Math.min(1, maxW / Math.max(...rowW));
      if (scale < 1) {
        rowEls.forEach((el) => el.setAttribute("font-size", f(32 * scale)));
        rowW = rowW.map((w) => w * scale);
      }
      rowW = rowW.map((w) => w + 10);
      const w = rowW[2] - 10, y = ROW_Y[2] + 12;
      $("ul").setAttribute("d", `M ${ROW_X} ${y} q ${f(w / 4)} -4 ${f(w / 2)} 0 t ${f(w / 2)} 0`);
      ulLen = $("ul").getTotalLength();
      $("ul").style.strokeDasharray = `${ulLen}`;
      $("check").setAttribute("transform", `translate(${f(ROW_X + w + 26)} ${ROW_Y[2] - 8})`);
    }
    document.fonts?.ready?.then(measure);

    /* ── blinking ── */
    let nextBlink = 2.2, blinkStart = -1, dbl = false;
    function blinkScale(now) {
      if (blinkStart < 0 && now >= nextBlink) blinkStart = now;
      let sc = 1;
      if (blinkStart >= 0) {
        const k = (now - blinkStart) / 0.15;
        if (k >= 1) {
          blinkStart = -1;
          if (dbl) { dbl = false; nextBlink = now + 0.12; } else { nextBlink = now + 2 + Math.random() * 3; dbl = Math.random() < 0.25; }
        } else sc = 1 - 0.92 * Math.sin(Math.PI * k);
      }
      return sc;
    }

    /* ── arms: a soft wing, i.e. a quadratic curve from shoulder to hand that bows outward ── */
    function wing(sx, sy, tx, ty, outward) {
      const dx = tx - sx, dy = ty - sy, d = Math.hypot(dx, dy) || 1e-3;
      let nx = -dy / d, ny = dx / d;
      if (nx * outward < 0) { nx = -nx; ny = -ny; }
      const bow = clamp(0.45 * d, 12, 40);
      return { cx: (sx + tx) / 2 + nx * bow, cy: (sy + ty) / 2 + ny * bow, hx: tx, hy: ty };
    }

    /* ── pointer parallax ── */
    let pointerX = 0, pointerY = 0, lastPointer = -99;
    const onMove = (e) => {
      const r = svgEl.getBoundingClientRect();
      pointerX = clamp((e.clientX - (r.left + r.width / 2)) / Math.max(320, window.innerWidth * 0.45), -1, 1);
      pointerY = clamp((e.clientY - (r.top + r.height / 2)) / Math.max(240, window.innerHeight * 0.45), -1, 1);
      lastPointer = performance.now() / 1000;
    };

    /* ── click → early "aha" ── */
    let ahaOverride = -99;
    const onClick = () => { ahaOverride = performance.now() / 1000; };

    const symbols = [...svgEl.querySelectorAll("[data-sym]")];
    const flags = [...svgEl.querySelectorAll("[data-flag]")];
    const sparkles = [...svgEl.querySelectorAll("[data-spark]")];

    /* ── the scene as a function of time ── */
    function render(tAbs, now, dt, snap) {
      tAbs = Math.max(0, tAbs);   // a rAF timestamp can predate the mount time by a few frames
      const pi = Math.floor(tAbs / D) % PROBLEMS.length;
      const tc = tAbs - Math.floor(tAbs / D) * D;
      if (pi !== curProblem) {
        loadProblem(pi);
        $("eraseOverlay").setAttribute("width", "0");
      }
      let gaze = "board";
      for (const [a, b, g] of GAZE) if (tc >= a && tc < b) gaze = g;

      // click-triggered reaction: a short "viewer + happy" override on top of the schedule
      const clickAge = now - ahaOverride;
      const clicked = clickAge >= 0 && clickAge < 1.7;
      const ahaP = clicked ? clickAge / 1.7 : (tc >= AHA[0] && tc < AHA[1] ? (tc - AHA[0]) / (AHA[1] - AHA[0]) : -1);
      const aha = ahaP >= 0;
      if (clicked) gaze = "viewer";

      // ── board: rows, figure, check ──
      const pr = PROBLEMS[pi];
      const erasing = tc >= ERASE[0];
      let writingRow = -1, writeP = 0;
      for (let k = 0; k < 3; k++) {
        const p = win(tc, WRITE[k]);
        clipEls[k].setAttribute("width", f(p * rowW[k] + (p >= 1 ? 40 : 0)));
        if (p > 0 && p < 1) { writingRow = k; writeP = p; }
      }
      const figP = pr.fig ? win(tc, FIG) : 0;
      const figEl = pr.fig === "tri" ? "figTri" : "figPar";
      if (pr.fig) {
        const main = pr.fig === "tri" ? $("triPath") : $("parPath");
        const len = pr.fig === "tri" ? triLen : parLen;
        main.style.strokeDashoffset = `${len * (1 - figP)}`;
        $(figEl).setAttribute("opacity", figP > 0 ? "1" : "0");
        $(figEl + "Extras").setAttribute("opacity", f(clamp((figP - 0.55) / 0.45, 0, 1)));
      }
      const ulP = win(tc, [WRITE[2][1] + 0.05, CHECK[0]]);
      $("ul").style.strokeDashoffset = `${ulLen * (1 - ulP)}`;
      $("ul").setAttribute("opacity", ulP > 0 ? "1" : "0");
      const chP = win(tc, CHECK);
      $("check").style.strokeDashoffset = `${chkLen * (1 - chP)}`;
      $("check").setAttribute("opacity", chP > 0 ? "1" : "0");

      // ── eraser wipe ──
      const sweepP = win(tc, ERASE);
      const eraserX = lerp(26, 304, sweepP);
      $("eraseOverlay").setAttribute("width", f(erasing ? Math.max(0, eraserX - 23) : 0));

      // ── magic marker / eraser targets ──
      let markX, markY, markRot;
      if (writingRow >= 0) {
        markX = ROW_X + writeP * rowW[writingRow]; markY = ROW_Y[writingRow] - 6 + Math.sin(tc * 18) * 2; markRot = 32;
      } else {
        // pre-position at the start of the next row, otherwise rest on the tray
        const nextRow = WRITE.findIndex(([a]) => tc < a && a - tc < 0.45);
        if (nextRow >= 0 && !erasing) { markX = ROW_X; markY = ROW_Y[nextRow] - 6; markRot = 32; }
        else { markX = 116; markY = 244; markRot = 90; }
      }
      P.mx.t = markX; P.my.t = markY; P.ma.t = markRot;
      const eraserActive = tc >= ERASE[0] - 0.4 && tc < ERASE[1] + 0.45;
      if (tc >= ERASE[0] && tc < ERASE[1]) { P.ex.x = eraserX; P.ex.v = 0; P.ex.t = eraserX; P.ey.t = 130 + Math.sin(sweepP * TAU * 4) * 55; P.ey.x = P.ey.t; P.ey.v = 0; }
      else if (eraserActive && tc < ERASE[0]) { P.ex.t = 26; P.ey.t = 130; }
      else { P.ex.t = 230; P.ey.t = 244; }

      // ── gaze / head ──
      const G = {
        board: { hr: -5, hx: -6, hy: 0, lx: -7, ly: -2.5, open: 1, brow: 0.25 },
        note: { hr: 2, hx: 2, hy: 5, lx: 2, ly: 5.5, open: 0.82, brow: -0.45 },
        viewer: { hr: 0, hx: 0, hy: -1, lx: 0, ly: 0, open: 1, brow: 0.7 },
      }[gaze];
      const bob = Math.sin(tAbs * TAU * 1.6);
      const nod = aha ? -6 * Math.abs(Math.sin(ahaP * TAU * 2)) : 0;
      P.hr.t = G.hr + bob * 0.8; P.hx.t = G.hx; P.hy.t = G.hy + bob * 1.4 + nod;
      P.lx.t = G.lx; P.ly.t = G.ly; P.open.t = G.open; P.brow.t = G.brow;
      P.happy.t = aha && ahaP > 0.06 && ahaP < 0.92 ? 1 : 0;
      P.ear.t = aha ? 7 : 0;

      // ── notebook squiggles + right hand (pencil) ──
      let tip = null;
      let copyingRow = -1, copyP = 0;
      for (let k = 0; k < 3; k++) {
        const raw = win(tc, COPY[k]);
        const fade = 1 - win(tc, NOTE_FADE);
        sqEls[k].style.strokeDashoffset = `${sqLen[k] * (1 - raw)}`;
        sqEls[k].setAttribute("opacity", raw > 0 ? f(fade) : "0");
        if (raw > 0 && raw < 1) { copyingRow = k; copyP = raw; }
      }
      if (copyingRow >= 0) {
        const pt = sqEls[copyingRow].getPointAtLength(copyP * sqLen[copyingRow]);
        tip = [(pt.x - OX) / OS, (pt.y - OY) / OS];
      }
      // resting tip: end of the last squiggle drawn so far (or the start of the first line)
      let lastRow = -1;
      for (let k = 0; k < 3; k++) if (tc >= COPY[k][0]) lastRow = k;
      if (!tip) {
        const rk = Math.max(0, lastRow);
        const done = lastRow >= 0 && tc >= COPY[rk][1] && tc < NOTE_FADE[0];
        const pt = sqEls[rk].getPointAtLength(done ? sqLen[rk] : 0);
        tip = [(pt.x - OX) / OS, (pt.y - OY) / OS - (gaze === "board" ? 7 : 2)];
      }
      let alpha = 28;
      let rHand = [tip[0] + GRIP * Math.sin(alpha * Math.PI / 180), tip[1] - GRIP * Math.cos(alpha * Math.PI / 180)];
      let lHand = [-44 + Math.sin(tAbs * 0.9) * 1.2, -16];
      if (aha) {
        const up = sm(clamp(ahaP / 0.18, 0, 1)) * (1 - sm(clamp((ahaP - 0.8) / 0.2, 0, 1)));
        rHand = [lerp(rHand[0], 92, up), lerp(rHand[1], -132 - Math.sin(ahaP * TAU * 3) * 6, up)];
        lHand = [lerp(lHand[0], -98, up), lerp(lHand[1], -138 + Math.sin(ahaP * TAU * 3 + 1) * 6, up)];
        alpha = lerp(alpha, 8, up);
      }
      P.rx.t = rHand[0]; P.ry.t = rHand[1]; P.lx2.t = lHand[0]; P.ly2.t = lHand[1]; P.pa.t = alpha;

      // ── parallax targets (pointer when recent, otherwise a slow idle sway) ──
      const usePointer = now - lastPointer < 2.5;
      const targetX = usePointer ? pointerX : Math.sin(tAbs * 0.55) * 0.5;
      const targetY = usePointer ? pointerY : Math.sin(tAbs * 0.4 + 1) * 0.25;
      P.px.t = targetX; P.py.t = targetY;

      // ── bulb ──
      P.bulb.t = aha && ahaP < 0.88 ? 1 : 0;

      if (snap) for (const k in P) { P[k].x = P[k].t; P[k].v = 0; }
      else step(dt);

      /* ── write everything to the DOM ── */
      const px = P.px.x, py = P.py.x;
      const farD = [-px * 4, -py * 2.5], midD = [px * 2.5, py * 1.5], nearD = [px * 6, py * 3.5];
      $("far").setAttribute("transform", `translate(${f(farD[0])} ${f(farD[1])})`);
      $("mid").setAttribute("transform", `translate(${f(midD[0])} ${f(midD[1])})`);
      $("near").setAttribute("transform", `translate(${f(nearD[0])} ${f(nearD[1])})`);
      $("fx").setAttribute("transform", `translate(${f(nearD[0])} ${f(nearD[1])})`);

      const br = Math.sin(tAbs * TAU / 3);
      const sx = OS * (1 - 0.008 * br), sy = OS * (1 + 0.016 * br);
      $("owl").setAttribute("transform", `translate(${OX} ${OY}) scale(${f(sx)} ${f(sy)})`);
      $("arms").setAttribute("transform", `translate(${OX} ${OY}) scale(${f(sx)} ${f(sy)})`);
      $("head").setAttribute("transform", `translate(${f(P.hx.x)} ${f(P.hy.x)}) rotate(${f(P.hr.x)} 0 -130)`);
      $("earL").setAttribute("transform", `rotate(${f(-P.ear.x + Math.sin(tAbs * 1.7) * 1.2)} -84 -268)`);
      $("earR").setAttribute("transform", `rotate(${f(P.ear.x - Math.sin(tAbs * 1.7 + 1) * 1.2)} 84 -268)`);

      const happy = P.happy.x > 0.5;
      $("eyesOpen").setAttribute("display", happy ? "none" : "inline");
      $("eyesHappy").setAttribute("display", happy ? "inline" : "none");
      const bs = blinkScale(now) * clamp(P.open.x, 0.5, 1.1);
      $("eyeL").setAttribute("transform", `translate(${f(-42 + P.lx.x)} ${f(-186 + P.ly.x)}) scale(1 ${f(bs)})`);
      $("eyeR").setAttribute("transform", `translate(${f(42 + P.lx.x)} ${f(-186 + P.ly.x)}) scale(1 ${f(bs)})`);
      const bw = P.brow.x;
      $("browL").setAttribute("transform", `translate(-42 ${f(-214 - 6 * Math.max(0, bw))}) rotate(${f(bw >= 0 ? -7 * bw : -12 * bw)})`);
      $("browR").setAttribute("transform", `translate(42 ${f(-214 - 6 * Math.max(0, bw))}) rotate(${f(bw >= 0 ? 7 * bw : 12 * bw)})`);
      const cr = 16 + 5 * clamp(P.happy.x, 0, 1);
      $("cheekL").setAttribute("r", f(cr)); $("cheekR").setAttribute("r", f(cr));

      // arms: shoulders are drawn in the near layer, so correct for the mid/near parallax difference
      const dsx = (midD[0] - nearD[0]) / OS, dsy = (midD[1] - nearD[1]) / OS;
      const R = wing(SHOULDER.R[0] + dsx, SHOULDER.R[1] + dsy, P.rx.x, P.ry.x, 1);
      const L = wing(SHOULDER.L[0] + dsx, SHOULDER.L[1] + dsy, P.lx2.x, P.ly2.x, -1);
      const armD = (s, e) => `M ${f(s[0])} ${f(s[1])} Q ${f(e.cx)} ${f(e.cy)} ${f(e.hx)} ${f(e.hy)}`;
      const dR = armD([SHOULDER.R[0] + dsx, SHOULDER.R[1] + dsy], R), dL = armD([SHOULDER.L[0] + dsx, SHOULDER.L[1] + dsy], L);
      $("armR").setAttribute("d", dR); $("armRHi").setAttribute("d", dR); $("armRSh").setAttribute("d", dR);
      $("armL").setAttribute("d", dL); $("armLHi").setAttribute("d", dL); $("armLSh").setAttribute("d", dL);
      $("handR").setAttribute("transform", `translate(${f(R.hx)} ${f(R.hy)})`);
      $("handL").setAttribute("transform", `translate(${f(L.hx)} ${f(L.hy)})`);
      const a = P.pa.x * Math.PI / 180;
      $("pencil").setAttribute("transform", `translate(${f(R.hx - GRIP * Math.sin(a))} ${f(R.hy + GRIP * Math.cos(a))}) rotate(${f(P.pa.x)})`);

      // board marker + eraser
      $("marker").setAttribute("transform", `translate(${f(P.mx.x)} ${f(P.my.x)}) rotate(${f(P.ma.x)})`);
      $("eraser").setAttribute("transform", `translate(${f(P.ex.x)} ${f(P.ey.x)})`);

      // bulb + sparkles
      const bp = clamp(P.bulb.x, 0, 1.3);
      const pop = aha ? backOut(clamp(ahaP / 0.2, 0, 1)) : 0;
      $("bulb").setAttribute("transform", `translate(548 ${f(112 - Math.sin(tAbs * 5) * 1.5)}) scale(${f(Math.max(0, pop * bp))}) rotate(${f(Math.sin(tAbs * 3) * 4)})`);
      sparkles.forEach((el, i) => {
        const s = aha ? clamp(Math.sin(clamp((ahaP * 1.1 - i * 0.06) * Math.PI, 0, Math.PI)), 0, 1) : 0;
        el.setAttribute("transform", `${el.getAttribute("data-at")} scale(${f(s)}) rotate(${f(tAbs * 60 + i * 40)})`);
      });

      // music notes drifting from the headphones
      [0, 1].forEach((i) => {
        const u = ((tAbs + i * 1.7) % 3.4) / 3.4;
        const side = i === 0 ? -1 : 1;
        const x = (side < 0 ? 362 : 542) + side * (6 + u * 24) + Math.sin(u * TAU) * 5 * side;
        const y = 168 - u * 52;
        $("note" + i).setAttribute("transform", `translate(${f(x)} ${f(y)}) rotate(${f(side * 12)}) scale(${f(0.8 + 0.3 * Math.sin(u * Math.PI))})`);
        $("note" + i).setAttribute("opacity", f(Math.sin(u * Math.PI) * 0.8));
      });

      // floating maths symbols + swaying bunting
      symbols.forEach((el, i) => {
        const u = ((tAbs * 0.12 + i * 0.37) % 1);
        el.setAttribute("transform", `translate(0 ${f(-u * 34)})`);
        el.setAttribute("opacity", f(Math.sin(u * Math.PI) * 0.42));
      });
      flags.forEach((el, i) => {
        const base = el.getAttribute("data-at");
        el.setAttribute("transform", `${base} rotate(${f(Math.sin(tAbs * 1.4 + i * 0.9) * 4)})`);
      });
    }

    // initial content
    loadProblem(0);

    let rafId = 0, visible = true;
    const t0 = performance.now() / 1000;
    const cleanups = [];
    if (reduceMotion) {
      // one still frame: answer written, "aha" moment
      render(10.35, 10.35 + 100, 0.016, true);
    } else {
      let last = t0;
      const frame = (ts) => {
        const now = ts / 1000;
        const dt = Math.min(0.05, Math.max(0.001, now - last)); last = now;
        rafId = requestAnimationFrame(frame);
        if (!visible) return;
        try { render(now - t0 + 0.2, now, dt, false); }
        catch (err) { cancelAnimationFrame(rafId); console.error("StudyOwlScene stopped:", err); }   // decorative: never take the dashboard down with it
      };
      rafId = requestAnimationFrame(frame);
      window.addEventListener("pointermove", onMove, { passive: true });
      svgEl.addEventListener("click", onClick);
      let io;
      if ("IntersectionObserver" in window) {
        io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }, { threshold: 0 });
        io.observe(svgEl);
      }
      cleanups.push(() => {
        cancelAnimationFrame(rafId);
        window.removeEventListener("pointermove", onMove);
        svgEl.removeEventListener("click", onClick);
        io?.disconnect();
      });
    }
    return () => { cleanups.forEach((fn) => fn()); };
  }, []);

  return (
    <svg ref={setRef("svg")} viewBox="-36 0 636 420" aria-hidden="true" focusable="false"
      style={{ display: "block", width: "100%", height: "auto", maxHeight: 250, overflow: "visible", cursor: "pointer", WebkitTapHighlightColor: "transparent" }}>
      <defs>
        <radialGradient id={id("gBlue")} cx="35%" cy="28%" r="85%">
          <stop offset="0" stopColor="#93B9FF" /><stop offset=".55" stopColor="#6A9AF3" /><stop offset="1" stopColor="#4F7DE0" />
        </radialGradient>
        <linearGradient id={id("gWhite")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFFFFF" /><stop offset="1" stopColor="#DCE6FA" /></linearGradient>
        <linearGradient id={id("gBeak")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFD76B" /><stop offset="1" stopColor="#F5A623" /></linearGradient>
        <linearGradient id={id("gMint")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8AE0BE" /><stop offset="1" stopColor="#4FB08A" /></linearGradient>
        <radialGradient id={id("gEye")} cx="40%" cy="30%" r="80%"><stop offset="0" stopColor="#3b4170" /><stop offset="1" stopColor="#15182e" /></radialGradient>
        <linearGradient id={id("gWood")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#F6D6A2" /><stop offset="1" stopColor="#E6AE6C" /></linearGradient>
        <linearGradient id={id("gWoodFront")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#D69A57" /><stop offset="1" stopColor="#BD803F" /></linearGradient>
        <linearGradient id={id("gPanel")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#C98C49" /><stop offset="1" stopColor="#A9722F" /></linearGradient>
        <linearGradient id={id("gFrame")} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#F6F8FC" /><stop offset=".5" stopColor="#D5DCEA" /><stop offset="1" stopColor="#A9B4CA" /></linearGradient>
        <linearGradient id={id("gFace")} gradientUnits="userSpaceOnUse" x1="0" y1="39" x2="0" y2="229"><stop offset="0" stopColor="#FFFFFF" /><stop offset="1" stopColor="#EAF0FA" /></linearGradient>
        <linearGradient id={id("gGlare")} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#fff" stopOpacity=".6" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
        <linearGradient id={id("gPage")} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#E9EFFB" /><stop offset=".12" stopColor="#FFFFFF" /><stop offset="1" stopColor="#F6F9FF" /></linearGradient>
        <linearGradient id={id("gPageR")} x1="1" y1="0" x2="0" y2="0"><stop offset="0" stopColor="#E9EFFB" /><stop offset=".12" stopColor="#FFFFFF" /><stop offset="1" stopColor="#F6F9FF" /></linearGradient>
        <linearGradient id={id("gPencil")} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#FFE07A" /><stop offset=".5" stopColor="#FFC93C" /><stop offset="1" stopColor="#E9A417" /></linearGradient>
        <radialGradient id={id("gBulb")} cx="38%" cy="32%" r="75%"><stop offset="0" stopColor="#FFF6BF" /><stop offset=".6" stopColor="#FFD84D" /><stop offset="1" stopColor="#F5A91A" /></radialGradient>
        <clipPath id={id("clipFace")}><rect x="23" y="39" width="282" height="190" rx="5" /></clipPath>
        <clipPath id={id("clipBody")}><ellipse cx="0" cy="-78" rx="64" ry="68" /></clipPath>
        <clipPath id={id("clipHead")}><ellipse cx="0" cy="-195" rx="118" ry="100" /></clipPath>
        {ROW_Y.map((y, k) => (
          <clipPath key={k} id={id(`clipRow${k}`)}><rect ref={setRef(`clipRect${k}`)} x={ROW_X - 8} y={y - 42} width="0" height="62" /></clipPath>
        ))}
      </defs>

      {/* ───────────── far layer: wall dressing, floor, whiteboard ───────────── */}
      <g ref={setRef("far")}>
        <rect x="-200" y="384" width="1100" height="8" fill="var(--hero-base)" />
        <rect x="-200" y="392" width="1100" height="60" fill="var(--hero-floor)" />
        <rect x="-200" y="392" width="1100" height="2" fill="var(--hero-base)" />

        <path d={BUNTING.d} fill="none" stroke="#9aa3c7" strokeWidth="1.6" />
        {BUNTING.flags.map((fl, i) => {
          const at = `translate(${fl.x.toFixed(1)} ${fl.y.toFixed(1)})`;
          return (
            <g key={i} data-flag={i} data-at={at} transform={at}>
              <path d="M -10 0 L 10 0 L 0 21 Z" fill={fl.c} />
              <path d="M -10 0 L 0 0 L 0 21 Z" fill="#000" opacity=".07" />
            </g>
          );
        })}

        {/* whiteboard: shadow, aluminium frame, face */}
        <rect x="24" y="46" width="300" height="208" rx="12" fill="#1b2a55" opacity=".06" />
        <rect x="19" y="39" width="300" height="208" rx="12" fill="#1b2a55" opacity=".10" />
        <rect x="14" y="30" width="300" height="208" rx="11" fill={url("gFrame")} />
        <rect x="14.75" y="30.75" width="298.5" height="206.5" rx="10.5" fill="none" stroke="#fff" strokeOpacity=".85" />
        <rect x="21.5" y="37.5" width="285" height="193" rx="6.5" fill="none" stroke="#8e9bb5" strokeOpacity=".5" />
        <rect x="23" y="39" width="282" height="190" rx="5" fill={url("gFace")} />

        <g clipPath={url("clipFace")}>
          {/* worked solution, revealed left → right as the marker travels */}
          {ROW_Y.map((y, k) => (
            <text key={k} ref={setRef(`row${k}`)} className="eai-hand" x={ROW_X} y={y} fontSize="32" fontWeight="700"
              fill={k === 2 ? "#14966A" : "#27408B"} clipPath={url(`clipRow${k}`)} />
          ))}
          <path ref={setRef("ul")} d="M 0 0" fill="none" stroke="#14966A" strokeWidth="3.2" strokeLinecap="round" opacity="0" />
          <path ref={setRef("check")} d="M 0 0 L 10 12 L 30 -14" fill="none" stroke="#14966A" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round"
            strokeDasharray="40" strokeDashoffset="40" opacity="0" />

          {/* figure for the geometry / graph problems */}
          <g ref={setRef("figTri")} opacity="0">
            <path ref={setRef("triPath")} d="M 226 145 L 226 196 L 294 196 Z" fill="none" stroke="#D9543F" strokeWidth="3.2" strokeLinejoin="round" strokeDasharray="204" strokeDashoffset="204" />
            <g ref={setRef("figTriExtras")} opacity="0">
              <path d="M 226 186 H 236 V 196" fill="none" stroke="#D9543F" strokeWidth="2" />
              <g className="eai-hand" fontSize="26" fontWeight="700" fill="#27408B">
                <text x="204" y="177">3</text><text x="256" y="220">4</text><text x="268" y="160">c</text>
              </g>
            </g>
          </g>
          <g ref={setRef("figPar")} opacity="0">
            <g ref={setRef("figParExtras")} opacity="0">
              <path d="M 210 170 H 306 M 258 110 V 222" fill="none" stroke="#27408B" strokeWidth="2" strokeLinecap="round" />
              <circle cx="238" cy="170" r="5" fill="#14966A" /><circle cx="278" cy="170" r="5" fill="#14966A" />
            </g>
            <path ref={setRef("parPath")} d={PARABOLA} fill="none" stroke="#D9543F" strokeWidth="3.2" strokeLinejoin="round" strokeDasharray="160" strokeDashoffset="160" />
          </g>

          {/* eraser wipe + a few ghost smudges (drawn after it so they never disappear) */}
          <rect ref={setRef("eraseOverlay")} x="23" y="39" width="0" height="190" fill={url("gFace")} />
          <ellipse cx="190" cy="70" rx="46" ry="9" fill="#9aa8c4" opacity=".07" transform="rotate(-8 190 70)" />
          <ellipse cx="96" cy="214" rx="54" ry="8" fill="#9aa8c4" opacity=".06" transform="rotate(5 96 214)" />
          <ellipse cx="270" cy="128" rx="30" ry="7" fill="#9aa8c4" opacity=".05" />
          <path d="M 23 39 L 128 39 L 62 229 L 23 229 Z" fill={url("gGlare")} opacity=".5" />
        </g>

        {/* sticky note + tray + resting markers */}
        <g transform="translate(274 46) rotate(7)">
          <rect width="27" height="27" rx="2" fill="#FFE27A" /><rect y="21" width="27" height="6" rx="1" fill="#000" opacity=".07" />
          <path d="M13.5 5.5 L15.6 10.6 L21 10.9 L16.8 14.4 L18.3 19.7 L13.5 16.7 L8.7 19.7 L10.2 14.4 L6 10.9 L11.4 10.6 Z" fill="#F5A623" />
          <circle cx="13.5" cy="2.5" r="3" fill="#E8604C" />
        </g>
        <rect x="64" y="249" width="198" height="6" rx="3" fill="#1b2a55" opacity=".08" />
        <rect x="58" y="236" width="210" height="14" rx="4" fill={url("gFrame")} />
        <rect x="58.5" y="236.5" width="209" height="2" rx="1" fill="#fff" opacity=".8" />
        <g transform="translate(84 239)"><rect width="34" height="8" rx="4" fill="#E8604C" /><rect x="22" width="12" height="8" rx="4" fill="#B93C2B" /></g>
        <g transform="translate(160 239)"><rect width="34" height="8" rx="4" fill="#3FB487" /><rect x="22" width="12" height="8" rx="4" fill="#278763" /></g>

        {/* the "magic" blue marker that writes the solution (tip at the origin, body up) */}
        <g ref={setRef("marker")} transform="translate(116 244) rotate(90)">
          <path d="M -3 0 L 3 0 L 4.5 -9 L -4.5 -9 Z" fill="#27408B" />
          <rect x="-5" y="-48" width="10" height="40" rx="3" fill="#5B8DEF" />
          <rect x="-5" y="-48" width="4" height="40" rx="2" fill="#fff" opacity=".35" />
          <rect x="-5.5" y="-62" width="11" height="14" rx="3" fill="#27408B" />
        </g>
        {/* eraser block (rests on the tray, sweeps the board during the wipe) */}
        <g ref={setRef("eraser")} transform="translate(230 244)">
          <rect x="-19" y="-11" width="38" height="22" rx="5" fill="#E9EDF7" />
          <rect x="-19" y="2" width="38" height="9" rx="4" fill="#3b3f58" />
          <rect x="-19" y="-11" width="38" height="6" rx="3" fill="#fff" opacity=".7" />
        </g>
      </g>

      {/* ───────────── mid layer: chair + owl ───────────── */}
      <g ref={setRef("mid")}>
        <rect x="372" y="226" width="160" height="84" rx="28" fill={url("gMint")} />
        <rect x="372.5" y="226.5" width="159" height="83" rx="27.5" fill="none" stroke="#fff" strokeOpacity=".4" />
        <path d="M 452 246 V 292" stroke="#2f7f62" strokeOpacity=".35" strokeWidth="1.6" strokeDasharray="4 4" />
        <ellipse cx="396" cy="246" rx="12" ry="4" fill="#fff" opacity=".35" transform="rotate(-20 396 246)" />
        <ellipse cx="452" cy="288" rx="60" ry="9" fill="#1b2a55" opacity=".12" />

        <g ref={setRef("owl")} transform={`translate(${OX} ${OY}) scale(${OS})`}>
          <OutfitLayers outfit={outfit} mount="back" uid={uid} />
          {/* body */}
          <ellipse cx="0" cy="-78" rx="64" ry="68" fill={url("gBlue")} />
          <g clipPath={url("clipBody")}>
            <ellipse cx="0" cy="-98" rx="80" ry="22" fill="#2f55b8" opacity=".3" />
            <ellipse cx="-30" cy="-40" rx="26" ry="14" fill="#fff" opacity=".13" />
            <ellipse cx="0" cy="-14" rx="76" ry="28" fill="#2f55b8" opacity=".25" />
            <path d="M -34 -80 q 8.5 9 17 0 q 8.5 9 17 0 q 8.5 9 17 0 q 8.5 9 17 0 M -26 -62 q 8.5 9 17 0 q 8.5 9 17 0 q 8.5 9 17 0 M -34 -44 q 8.5 9 17 0 q 8.5 9 17 0 q 8.5 9 17 0 q 8.5 9 17 0"
              fill="none" stroke="#B7D0FF" strokeWidth="3" strokeLinecap="round" opacity=".5" />
          </g>

          <OutfitLayers outfit={outfit} mount="torso" uid={uid} />

          {/* head */}
          <g ref={setRef("head")}>
            <g ref={setRef("earL")}><path d="M -96 -258 Q -128 -300 -110 -344 Q -66 -330 -40 -290 Z" fill="#6597F1" /><path d="M -92 -272 Q -112 -300 -104 -326 Q -80 -314 -66 -292 Z" fill="#8DB3FA" opacity=".6" /></g>
            <g ref={setRef("earR")}><path d="M 96 -258 Q 128 -300 110 -344 Q 66 -330 40 -290 Z" fill="#6597F1" /><path d="M 92 -272 Q 112 -300 104 -326 Q 80 -314 66 -292 Z" fill="#3F6BD0" opacity=".35" /></g>

            <ellipse cx="0" cy="-195" rx="118" ry="100" fill={url("gBlue")} />
            <g clipPath={url("clipHead")}>
              <ellipse cx="0" cy="-104" rx="132" ry="44" fill="#2f55b8" opacity=".24" />
              <path d="M 104 -262 Q 132 -200 106 -126" fill="none" stroke="#C4DAFF" strokeWidth="9" opacity=".5" strokeLinecap="round" />
            </g>
            <ellipse cx="-62" cy="-262" rx="40" ry="14" fill="#fff" opacity=".28" transform="rotate(-22 -62 -262)" />

            <path d="M 0 -215 C -18 -240 -98 -245 -100 -185 C -100 -130 -48 -112 0 -112 C 48 -112 100 -130 100 -185 C 98 -245 18 -240 0 -215 Z" fill={url("gWhite")} />
            <path d="M -88 -150 C -76 -122 -40 -114 0 -114" fill="none" stroke="#9fb4de" strokeWidth="5" opacity=".35" strokeLinecap="round" />

            <g ref={setRef("eyesOpen")}>
              <g ref={setRef("eyeL")} transform="translate(-42 -186)"><ellipse rx="13" ry="17" fill={url("gEye")} /><circle cx="-4" cy="-6" r="4.8" fill="#fff" /><circle cx="4.5" cy="6" r="2.2" fill="#fff" opacity=".8" /></g>
              <g ref={setRef("eyeR")} transform="translate(42 -186)"><ellipse rx="13" ry="17" fill={url("gEye")} /><circle cx="-4" cy="-6" r="4.8" fill="#fff" /><circle cx="4.5" cy="6" r="2.2" fill="#fff" opacity=".8" /></g>
            </g>
            <g ref={setRef("eyesHappy")} display="none" stroke="#22263f" strokeWidth="8" strokeLinecap="round" fill="none">
              <path d="M -62 -180 Q -42 -208 -22 -180" /><path d="M 22 -180 Q 42 -208 62 -180" />
            </g>
            <g stroke="#2f4aa0" strokeWidth="7" strokeLinecap="round" fill="none">
              <path ref={setRef("browL")} d="M -20 0 Q 0 -8 20 0" transform="translate(-42 -214)" />
              <path ref={setRef("browR")} d="M -20 0 Q 0 -8 20 0" transform="translate(42 -214)" />
            </g>

            <circle ref={setRef("cheekL")} cx="-72" cy="-160" r="16" fill="#F7B7A3" opacity=".9" />
            <circle ref={setRef("cheekR")} cx="72" cy="-160" r="16" fill="#F7B7A3" opacity=".9" />
            <path d="M -17 -176 Q 0 -190 17 -176 Q 12 -152 0 -146 Q -12 -152 -17 -176 Z" fill={url("gBeak")} />
            <path d="M -9 -178 Q 0 -185 9 -178" fill="none" stroke="#fff" strokeWidth="3" opacity=".6" strokeLinecap="round" />
            <OutfitLayers outfit={outfit} mount="face" uid={uid} />

            {/* headphones */}
            <path d="M -108 -190 C -118 -360 118 -360 108 -190" stroke="#5DBB93" strokeWidth="16" fill="none" strokeLinecap="round" />
            <path d="M -50 -306 Q 0 -329 50 -306" stroke="#F1F7F3" strokeWidth="16" fill="none" />
            <g transform="translate(-124 -186)"><ellipse rx="26" ry="44" fill="#4FB08A" /><ellipse cx="-4" rx="18" ry="34" fill="#F1F7F3" /><ellipse cx="-8" rx="11" ry="24" fill="#5DBB93" /><ellipse cx="-12" cy="-16" rx="5" ry="10" fill="#fff" opacity=".45" /></g>
            <g transform="translate(124 -186)"><ellipse rx="26" ry="44" fill="#4FB08A" /><ellipse cx="4" rx="18" ry="34" fill="#F1F7F3" /><ellipse cx="8" rx="11" ry="24" fill="#5DBB93" /><ellipse cx="4" cy="-16" rx="5" ry="10" fill="#fff" opacity=".45" /></g>
            <OutfitLayers outfit={outfit} mount="top" uid={uid} />
          </g>
        </g>
      </g>

      {/* ───────────── near layer: desk, props, notebook, arms ───────────── */}
      <g ref={setRef("near")}>
        <ellipse cx="470" cy="408" rx="210" ry="9" fill="#1b2a55" opacity=".16" />
        {/* desk body */}
        <path d="M 306 356 L 900 356 L 900 406 L 306 406 Z" fill={url("gPanel")} />
        <rect x="334" y="368" width="120" height="30" rx="5" fill="#000" opacity=".1" />
        <rect x="334" y="366" width="120" height="30" rx="5" fill={url("gWoodFront")} />
        <rect x="384" y="378" width="20" height="5" rx="2.5" fill="#F6D6A2" />
        <path d="M 296 334 L 900 334 L 900 358 L 296 358 Z" fill={url("gWoodFront")} />
        <path d="M 296 334 L 900 334" stroke="#F8E0B6" strokeWidth="2" opacity=".9" />
        {/* desk top */}
        <path d="M 316 290 L 900 290 L 900 334 L 296 334 Z" fill={url("gWood")} />
        <path d="M 316 290 L 900 290" stroke="#fff" strokeOpacity=".5" strokeWidth="1.5" />
        <path d="M 330 303 H 900 M 322 316 H 900 M 312 326 H 900" stroke="#C98C49" strokeOpacity=".28" strokeWidth="1" />
        <ellipse cx="458" cy="318" rx="92" ry="16" fill="#8a5a1f" opacity=".18" />

        {/* books */}
        <ellipse cx="362" cy="323" rx="38" ry="6" fill="#5b3a12" opacity=".25" />
        <g>
          <rect x="330" y="308" width="64" height="15" rx="3" fill="#E9705F" />
          <rect x="334" y="317" width="56" height="3.5" rx="1.5" fill="#fff" opacity=".85" />
          <rect x="330" y="308" width="64" height="4" rx="2" fill="#fff" opacity=".28" />
          <rect x="336" y="294" width="54" height="14" rx="3" fill="#F5C04A" />
          <rect x="340" y="302" width="46" height="3.2" rx="1.5" fill="#fff" opacity=".85" />
          <rect x="336" y="294" width="54" height="4" rx="2" fill="#fff" opacity=".3" />
          <rect x="340" y="281" width="48" height="13" rx="3" fill="#5B8DEF" />
          <rect x="344" y="288" width="40" height="3" rx="1.5" fill="#fff" opacity=".85" />
          <rect x="340" y="281" width="48" height="4" rx="2" fill="#fff" opacity=".3" />
        </g>

        {/* pencil cup */}
        <ellipse cx="552" cy="322" rx="20" ry="5" fill="#5b3a12" opacity=".25" />
        <g>
          <rect x="545" y="284" width="3.4" height="22" rx="1.5" fill="#E9705F" transform="rotate(-14 546 306)" />
          <rect x="552" y="282" width="3.4" height="24" rx="1.5" fill="#5B8DEF" transform="rotate(6 553 306)" />
          <rect x="558" y="286" width="3.4" height="20" rx="1.5" fill="#F5C04A" transform="rotate(20 559 306)" />
          <path d="M 540 300 H 566 L 563 322 Q 553 326 543 322 Z" fill={url("gMint")} />
          <ellipse cx="553" cy="300" rx="13" ry="3.4" fill="#2f7f62" opacity=".55" />
          <path d="M 544 306 Q 542 316 545 320" fill="none" stroke="#fff" strokeWidth="2.4" opacity=".5" strokeLinecap="round" />
        </g>

        {/* notebook */}
        <path d="M 392 297 L 458 294 L 524 297 L 538 337 L 458 342 L 380 337 Z" fill="#1b2a55" opacity=".18" transform="translate(0 3)" />
        <path d="M 394 295 L 458 292 L 522 295 L 534 334 L 458 339 L 384 334 Z" fill="#3E63C9" />
        <path d="M 399 297 L 457 294.5 L 457 334 L 392 331.5 Z" fill={url("gPage")} />
        <path d="M 457 294.5 L 516 297 L 525 331.5 L 457 334 Z" fill={url("gPageR")} />
        <path d="M 457 294.5 V 334" stroke="#aebbe0" strokeWidth="1.6" />
        <path d="M 402 302 L 455 300 M 401 308 L 455 306 M 399 314 L 455 312 M 397 320 L 455 318 M 396 326 L 455 324 M 459 300 L 513 302 M 459 306 L 515 308 M 459 312 L 518 314 M 459 318 L 520 320 M 459 324 L 522 326"
          fill="none" stroke="#C5D4F1" strokeWidth=".9" />
        <path d="M 398 296 L 458 293 L 522 296" fill="none" stroke="#fff" strokeOpacity=".5" />
        {SQUIGGLES.map((d, k) => (
          <path key={k} ref={setRef(`sq${k}`)} d={d} fill="none" stroke="#27408B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0" />
        ))}

        {/* arms + pencil (same transform as the owl so they stay attached to his shoulders) */}
        <g ref={setRef("arms")} transform={`translate(${OX} ${OY}) scale(${OS})`}>
          <path ref={setRef("armLSh")} d="M 0 0" fill="none" stroke="#1b2a55" strokeOpacity=".18" strokeWidth="34" strokeLinecap="round" strokeLinejoin="round" transform="translate(3 6)" />
          <path ref={setRef("armL")} d="M 0 0" fill="none" stroke="#6291EE" strokeWidth="30" strokeLinecap="round" strokeLinejoin="round" />
          <path ref={setRef("armLHi")} d="M 0 0" fill="none" stroke="#9DBFFB" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" opacity=".55" transform="translate(-5 -6)" />
          <g ref={setRef("handL")}><circle r="17" fill="#7FAAF7" /><circle cx="-5" cy="-6" r="6" fill="#fff" opacity=".28" /></g>

          <g ref={setRef("pencil")}>
            <path d="M -5.6 -11 L 5.6 -11 L 0 0 Z" fill="#F3D3A2" />
            <path d="M -2 -4.2 L 2 -4.2 L 0 0 Z" fill="#2b2f4a" />
            <rect x="-5.6" y="-84" width="11.2" height="73" fill={url("gPencil")} />
            <rect x="-5.6" y="-84" width="11.2" height="73" fill="none" stroke="#C98513" strokeOpacity=".5" strokeWidth=".9" />
            <rect x="-6" y="-90" width="12" height="7" fill="#C9CFDD" />
            <rect x="-5.6" y="-100" width="11.2" height="10" rx="4.2" fill="#F4A3B5" />
          </g>

          <path ref={setRef("armRSh")} d="M 0 0" fill="none" stroke="#1b2a55" strokeOpacity=".18" strokeWidth="34" strokeLinecap="round" strokeLinejoin="round" transform="translate(3 6)" />
          <path ref={setRef("armR")} d="M 0 0" fill="none" stroke="#6291EE" strokeWidth="30" strokeLinecap="round" strokeLinejoin="round" />
          <path ref={setRef("armRHi")} d="M 0 0" fill="none" stroke="#9DBFFB" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" opacity=".55" transform="translate(-5 -6)" />
          <g ref={setRef("handR")}><circle r="17" fill="#7FAAF7" /><circle cx="-5" cy="-6" r="6" fill="#fff" opacity=".28" /></g>
        </g>
      </g>

      {/* ───────────── effects: lightbulb, sparkles, music notes, floating symbols ───────────── */}
      <g ref={setRef("fx")}>
        {[["π", 336, 104], ["√x", 562, 262], ["∑", 584, 206], ["x²", 350, 262]].map(([s, x, y], i) => (
          <g key={s} data-sym={i}><text x={x} y={y} fontSize="22" fontWeight="700" fill="var(--primary)" textAnchor="middle">{s}</text></g>
        ))}
        {[0, 1].map((i) => (
          <g key={i} ref={setRef(`note${i}`)} opacity="0">
            <ellipse cx="0" cy="0" rx="5.6" ry="4" fill={i ? "#F28C7D" : "#5DBB93"} transform="rotate(-20)" />
            <path d="M 4.8 -1 V -17 Q 11 -14 10 -8" fill="none" stroke={i ? "#F28C7D" : "#5DBB93"} strokeWidth="2.2" strokeLinecap="round" />
          </g>
        ))}
        {[[506, 96, 6], [584, 128, 7], [524, 70, 5], [470, 62, 4]].map(([x, y, r], i) => (
          <g key={i} data-spark={i} data-at={`translate(${x} ${y})`} transform={`translate(${x} ${y}) scale(0)`}>
            <path d={`M 0 ${-r * 1.7} Q 0 0 ${r * 1.7} 0 Q 0 0 0 ${r * 1.7} Q 0 0 ${-r * 1.7} 0 Q 0 0 0 ${-r * 1.7} Z`} fill="#FFC93C" />
          </g>
        ))}
        <g ref={setRef("bulb")} transform="translate(548 112) scale(0)">
          <g stroke="#FFC21A" strokeWidth="3" strokeLinecap="round">
            <path d="M 0 -26 V -34" /><path d="M -20 -18 L -26 -24" /><path d="M 20 -18 L 26 -24" /><path d="M -26 0 H -34" /><path d="M 26 0 H 34" />
          </g>
          <circle r="16" fill={url("gBulb")} />
          <circle cx="-5" cy="-6" r="5" fill="#fff" opacity=".6" />
          <rect x="-7" y="13" width="14" height="6" rx="2" fill="#9aa3c7" />
          <rect x="-5" y="19" width="10" height="4" rx="2" fill="#7c86ab" />
        </g>
      </g>
    </svg>
  );
}
