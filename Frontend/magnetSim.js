/* Magnetic fields for the ```magnet figure (Physics chapter 3, lesson 1: field and magnetic
   force; lesson 3: the solenoid).

   The picture is a cross-section, so every current is a straight wire through the page:
   "out" (towards the reader, ⊙) or "in" (⊗). Each gives the Biot-Savart field of an
   infinite wire, B = μ0 I / (2π r), around it anticlockwise for "out"; the field of a
   figure is their sum. A solenoid is two rows of such wires (out along the top, in along
   the bottom), so its field is uniform inside and returns outside, as in the textbook. A
   bar magnet is drawn as the same: its field outside is that of a solenoid of its shape.
   Field lines are traced by following B from seed points.

   The numbers under the figure (B, L, W, F) come from the textbook formulas with the
   exercise's own values, in SI units; the drawing itself is to scale only in shape.
   visuals.test.js checks the fields against those formulas. */

export const MU0 = 4 * Math.PI * 1e-7;

/* Field at (x, y) of wires { x, y, current } (current > 0 = out of the page). */
export function fieldAt(wires, x, y) {
  let bx = 0, by = 0;
  for (const w of wires) {
    const dx = x - w.x, dy = y - w.y, r2 = dx * dx + dy * dy;
    if (r2 < 1e-12) continue;
    const k = (MU0 * w.current) / (2 * Math.PI * r2);
    bx += -k * dy; by += k * dx;
  }
  return { bx, by };
}

/* The wires that draw each kind of figure, in a box from -1 to 1 (arbitrary length unit). */
export function wiresFor(figure) {
  const sign = figure.reversed ? -1 : 1;
  if (figure.kind === "wire") return [{ x: 0, y: 0, current: sign * figure.I }];
  if (figure.kind === "solenoid" || figure.kind === "bar") {
    // Densely wound (like the real coil), or field lines leak out between the turns.
    const turns = 40, half = 0.55, gap = 0.22;
    const wires = [];
    for (let i = 0; i < turns; i++) {
      const x = -half + (2 * half * i) / (turns - 1);
      wires.push({ x, y: gap, current: sign * figure.I }, { x, y: -gap, current: -sign * figure.I });
    }
    return wires;
  }
  return [];
}

/* One field line from (x, y), followed both ways; stops at the box edge, near a wire or
   when it closes on itself. */
export function traceLine(wires, x, y, { step = 0.012, maxSteps = 900, box = 1 } = {}) {
  const half = (dir) => {
    const points = [];
    let px = x, py = y;
    for (let i = 0; i < maxSteps; i++) {
      const a = fieldAt(wires, px, py), m = Math.hypot(a.bx, a.by);
      if (!m) break;
      // midpoint step (RK2) along the unit field
      const mx = px + (dir * step * a.bx) / m / 2, my = py + (dir * step * a.by) / m / 2;
      const b = fieldAt(wires, mx, my), n = Math.hypot(b.bx, b.by);
      if (!n) break;
      px += (dir * step * b.bx) / n; py += (dir * step * b.by) / n;
      if (Math.abs(px) > box || Math.abs(py) > box) break;
      if (wires.some((w) => Math.hypot(px - w.x, py - w.y) < 0.02)) break;
      points.push([px, py]);
      if (i > 20 && Math.hypot(px - x, py - y) < step * 0.9) { points.push([x, y]); break; }
    }
    return points;
  };
  return [...half(-1).reverse(), [x, y], ...half(1)];
}

/* Where field lines start, so they spread evenly over the figure. */
export function seedsFor(figure) {
  if (figure.kind === "wire") return [0.12, 0.25, 0.4, 0.58, 0.8].map((r) => [r, 0]);
  if (figure.kind === "solenoid" || figure.kind === "bar") {
    // Inside, away from the windings: lines started nearer the turns leak between them.
    return [-0.11, -0.08, -0.04, 0, 0.04, 0.08, 0.11].map((y) => [0, y]);
  }
  if (figure.kind === "force") return [-0.6, -0.3, 0, 0.3, 0.6].map((y) => [-0.95, y]);
  return [];
}

/* The block, one figure per block, SI units:
     solenoid N 500 l 0.5 I 2 [r 0.02] [R 4]   (turns, length in m, current in A, radius in m, resistance)
     wire I 5 [d 0.1]                          (current in A, distance from the wire in m)
     bar                                       (a bar magnet's field lines)
     force B 0.5 I 2 l 0.1 [angle 90]          (Laplace force on a wire in a uniform field)
     motor B 0.5 I 2 N 100 a 0.05 b 0.04       (a DC motor: N turns of an a × b coil, S = a·b; or S 0.002) */
const NUMBER = "([0-9]*\\.?[0-9]+(?:e-?[0-9]+)?)";
const value = (text, name) => {
  const m = text.match(new RegExp(`(?:^|\\s)${name}\\s*[:=]?\\s*${NUMBER}`));
  return m ? Number(m[1]) : undefined;
};

export function parseMagnet(code) {
  const text = ` ${code.trim().replace(/\n/g, " ")} `;
  const kind = ["solenoid", "wire", "bar", "force", "motor"].find((k) => new RegExp(`^\\s*${k}\\b`, "i").test(text));
  if (!kind) return null;
  const reversed = /\b(?:in|reversed)\b/i.test(text.replace(/^\s*\w+/, ""));
  const fig = { kind, reversed, I: value(text, "I") ?? 1 };
  if (kind === "solenoid") Object.assign(fig, { N: value(text, "N"), l: value(text, "l") ?? value(text, "L"), r: value(text, "r"), R: value(text, "R") });
  if (kind === "wire") fig.d = value(text, "d");
  if (kind === "force") Object.assign(fig, { B: value(text, "B"), l: value(text, "l") ?? value(text, "L"), angle: value(text, "angle") ?? 90 });
  if (kind === "motor") {
    const a = value(text, "a"), b = value(text, "b");
    Object.assign(fig, { B: value(text, "B"), N: value(text, "N") ?? 1, a, b, S: value(text, "S") ?? (a && b ? a * b : undefined) });
  }
  const positive = (...names) => names.every((n) => fig[n] === undefined || fig[n] > 0);
  if (!(fig.I > 0) || !positive("N", "l", "r", "R", "d", "B")) return null;
  if (kind === "solenoid" && !(fig.N > 0 && fig.l > 0)) return null;
  if (kind === "force" && !(fig.B > 0 && fig.l > 0)) return null;
  if (kind === "motor" && !(fig.B > 0 && fig.S > 0 && fig.N > 0)) return null;
  return fig;
}

const SUPERSCRIPT = { "-": "⁻", 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹" };
/* 0.002513 -> "2.513 × 10⁻³"; ordinary sizes stay plain ("62.83", "8"). */
export function sig(x) {
  if (x === 0 || (Math.abs(x) >= 0.01 && Math.abs(x) < 1e5)) return String(Number(x.toPrecision(4)));
  const exponent = Math.floor(Math.log10(Math.abs(x)));
  const mantissa = Number((x / 10 ** exponent).toPrecision(4));
  return `${mantissa} × 10${String(exponent).replace(/./g, (c) => SUPERSCRIPT[c])}`;
}

/* The textbook quantities for the figure, as [label, value] rows. */
export function magnetFacts(fig) {
  if (fig.kind === "solenoid") {
    const B = (MU0 * fig.N * fig.I) / fig.l;
    const rows = [["B = μ0 N I / ℓ (inside, uniform)", `${sig(B)} T`]];
    if (fig.r) {
      const area = Math.PI * fig.r ** 2, L = (MU0 * fig.N ** 2 * area) / fig.l;
      rows.push(["ℓ wire = N · 2πr", `${sig(fig.N * 2 * Math.PI * fig.r)} m`],
        ["L = μ0 N² S / ℓ", `${sig(L)} H`], ["W = ½ L I²", `${sig(0.5 * L * fig.I ** 2)} J`]);
    }
    if (fig.R) rows.push(["U = R I", `${sig(fig.R * fig.I)} V`]);
    return rows;
  }
  if (fig.kind === "wire") {
    return fig.d ? [["B = μ0 I / (2π d)", `${sig((MU0 * fig.I) / (2 * Math.PI * fig.d))} T`]]
      : [["B = μ0 I / (2π d) at a distance d from the wire", ""]];
  }
  if (fig.kind === "force") {
    const F = fig.B * fig.I * fig.l * Math.sin((fig.angle * Math.PI) / 180);
    return [["F = B I ℓ sin α", `${sig(F)} N`]];
  }
  if (fig.kind === "motor") {
    const rows = [];
    if (fig.a) rows.push(["F = N B I a (on each side of the coil)", `${sig(fig.N * fig.B * fig.I * fig.a)} N`]);
    rows.push(["τ max = N B I S (coil plane parallel to B)", `${sig(fig.N * fig.B * fig.I * fig.S)} N·m`]);
    return rows;
  }
  return [["Field lines leave the N pole and enter the S pole", ""]];
}

/* The motor's torque when the coil's normal makes the angle alpha (radians) with B. */
export const motorTorque = (fig, alpha) => fig.N * fig.B * fig.I * fig.S * Math.abs(Math.sin(alpha));
