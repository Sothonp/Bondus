/* Figures beyond GeoGebra, each from a fenced block the tutor writes (prompts.py rule 7):

   ```circuit    -> a live Falstad CircuitJS simulation of a series circuit
   ```phet       -> an embedded PhET simulation, from a fixed list
   ```molecule   -> a 3D molecule (3Dmol.js) from the Protein Data Bank, from a fixed list
   ```compound   -> a chemical compound by name, its structure and formula from PubChem
   ```anatomy    -> a 3D anatomy or botany model (Sketchfab), from a fixed list
   ```thermo     -> a P-V diagram (Carnot cycle or one process) computed here, drawn in GeoGebra
   ```gas        -> a particle simulation of an ideal gas (gasSim.js)

   The tutor never writes simulator formats or URLs itself: it describes the circuit in a
   few lines and names a simulation or molecule, and this file builds the rest, so a
   malformed block costs a figure, never a broken page or a link the model made up.
   Visuals.jsx draws them; visuals.test.js checks this logic without a browser. */

/* ── Circuits (Falstad CircuitJS, https://www.falstad.com/circuit) ──
   The block, one item per line, SI units:
     source: ac <peak volts> <frequency Hz>      (or  source: dc <volts>)
     R <ohms> | L <henries> | C <farads>          (in series, in this order)
   Line formats come from CircuitJS's own source (ResistorElm.dump() and so on):
     r x1 y1 x2 y2 0 R    c ... 0 C 0 0    l ... 0 L 0    w ... 0
     v x1 y1 x2 y2 0 <waveform 0 dc|1 ac> <freq> <peak> <bias> <phase> <duty>
     o <element> <speed> 0 <flags: 1 current + 2 voltage> <V scale> <A scale> <position> */
export const FALSTAD_URL = "https://www.falstad.com/circuit/circuitjs.html";
const MAX_PARTS = 6;
const PART = /^\s*([RLC])\s*[:=]?\s*([0-9]*\.?[0-9]+(?:e-?[0-9]+)?)\b/i;
const SOURCE = /^\s*source\s*[:=]?\s*(ac|dc)\s+([0-9]*\.?[0-9]+(?:e-?[0-9]+)?)(?:\s+([0-9]*\.?[0-9]+(?:e-?[0-9]+)?))?/i;

export function parseCircuit(code) {
  let source = null;
  const parts = [];
  for (const line of code.split("\n")) {
    const s = line.match(SOURCE);
    if (s) {
      const ac = s[1].toLowerCase() === "ac";
      source = { ac, volts: Number(s[2]), frequency: ac ? Number(s[3] || 50) : 0 };
      continue;
    }
    const p = line.match(PART);
    if (p && parts.length < MAX_PARTS) parts.push({ kind: p[1].toUpperCase(), value: Number(p[2]) });
  }
  const valid = source && source.volts > 0 && (!source.ac || source.frequency > 0)
    && parts.length > 0 && parts.every((part) => part.value > 0 && Number.isFinite(part.value));
  return valid ? { source, parts } : null;
}

// Plain numbers only: CircuitJS's URL decoding leaves "+" alone, so no "1e+5".
const num = (value) => {
  const text = String(Number(value.toPrecision(6)));
  return text.includes("e+") ? value.toFixed(0) : text;
};

/* A rectangle: the source on the left edge, the parts along the top, wires back round
   the right and bottom. Grid multiples of 16, as CircuitJS snaps to. */
export function falstadText({ source, parts }) {
  const step = 128, left = 128, top = 64, bottom = 256;
  const right = left + step * parts.length;
  const dt = source.ac ? 1 / (source.frequency * 400) : 5e-6;
  const lines = [`$ 1 ${num(dt)} 10.2 50 ${num(Math.max(5, source.volts))} 50`];
  lines.push(`v ${left} ${bottom} ${left} ${top} 0 ${source.ac ? 1 : 0} ${num(source.frequency || 40)} ${num(source.volts)} 0 0 0.5`);
  parts.forEach((part, i) => {
    const [x1, x2] = [left + step * i, left + step * (i + 1)];
    if (part.kind === "R") lines.push(`r ${x1} ${top} ${x2} ${top} 0 ${num(part.value)}`);
    if (part.kind === "C") lines.push(`c ${x1} ${top} ${x2} ${top} 0 ${num(part.value)} 0 0`);
    if (part.kind === "L") lines.push(`l ${x1} ${top} ${x2} ${top} 0 ${num(part.value)} 0`);
  });
  lines.push(`w ${right} ${top} ${right} ${bottom} 0`, `w ${right} ${bottom} ${left} ${bottom} 0`);
  // A scope on the source (element 0) traces its voltage and current: the phase shift.
  // 400 steps a period (dt above) at 4 steps a pixel: about 100 pixels per period.
  lines.push(`o 0 ${source.ac ? 4 : 64} 0 3 ${num(Math.max(1, source.volts) * 1.25)} 0.1 0`);
  return lines.join("\n") + "\n";
}

export function falstadUrl(circuit) {
  return `${FALSTAD_URL}?cct=${encodeURIComponent(falstadText(circuit))}`;
}

/* ── PhET simulations (https://phet.colorado.edu, CC BY 4.0, free for non-commercial
   education). Only these: each was checked to load. The tutor names one by its key. */
export const PHET_SIMS = {
  "faradays-electromagnetic-lab": "Faraday's Electromagnetic Lab",
  "faradays-law": "Faraday's Law",
  "circuit-construction-kit-ac": "Circuit Construction Kit: AC",
  "wave-on-a-string": "Wave on a String",
  "wave-interference": "Wave Interference",
  "gas-properties": "Gas Properties",
  "gene-expression-essentials": "Gene Expression Essentials",
  "ph-scale": "pH Scale",
  "acid-base-solutions": "Acid-Base Solutions",
  "concentration": "Concentration",
  "balancing-chemical-equations": "Balancing Chemical Equations",
  "molecule-shapes": "Molecule Shapes",
  "reactants-products-and-leftovers": "Reactants, Products and Leftovers",
  "gases-intro": "Gases Intro",
  "states-of-matter": "States of Matter",
  "diffusion": "Diffusion",
  "energy-forms-and-changes": "Energy Forms and Changes",
  "neuron": "Neuron",
  "natural-selection": "Natural Selection",
  "membrane-transport": "Membrane Transport",
  "magnets-and-electromagnets": "Magnets and Electromagnets",
  "magnet-and-compass": "Magnet and Compass",
  "generator": "Generator",
};
export const PHET_CREDIT = "Simulation by PhET Interactive Simulations, University of Colorado Boulder, licensed under CC-BY-4.0";

export function phetSim(code) {
  const key = code.trim().replace(/^(?:sim|phet)\s*[:=]\s*/i, "").split(/\s+/)[0]?.toLowerCase();
  if (!key || !Object.hasOwn(PHET_SIMS, key)) return null;
  return { key, title: PHET_SIMS[key], url: `https://phet.colorado.edu/sims/html/${key}/latest/${key}_all.html` };
}

/* ── Molecules (3Dmol.js, BSD licence; structures from the RCSB Protein Data Bank).
   Fixed entries, so the tutor never invents a PDB id. */
export const MOLECULES = {
  dna: { pdb: "1BNA", title: "ADN (DNA) — B-DNA double helix", style: "cartoon+stick" },
  trna: { pdb: "1EHZ", title: "ARNt (tRNA) — transfer RNA", style: "cartoon+stick" },
  insulin: { pdb: "4INS", title: "Insulin", style: "cartoon" },
  hemoglobin: { pdb: "1A3N", title: "Hemoglobin", style: "cartoon" },
  lysozyme: { pdb: "1LYZ", title: "Lysozyme (an enzyme)", style: "cartoon" },
};
export const MOLECULE_SCRIPT = "https://cdn.jsdelivr.net/npm/3dmol@2.4.2/build/3Dmol-min.js";

export function molecule(code) {
  const key = code.trim().replace(/^(?:molecule|pdb)\s*[:=]\s*/i, "").split(/\s+/)[0]?.toLowerCase();
  return key && Object.hasOwn(MOLECULES, key) ? { key, ...MOLECULES[key] } : null;
}

/* ── Compounds (PubChem, https://pubchem.ncbi.nlm.nih.gov, a free US government database).
   The tutor names a compound in English ("ethyl acetate", "acetamide", "glucose"); PubChem
   finds it by that name and supplies its structural formula picture, molecular formula,
   IUPAC name and 3D model, so no structure in the figure comes from the model itself.
   A name PubChem does not know shows a short note instead. */
const PUBCHEM = "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound";
const COMPOUND_NAME = /^[A-Za-z0-9][A-Za-z0-9 ,'()[\]+-]{1,79}$/;

export function compound(code) {
  const name = code.trim().split("\n")[0].replace(/^(?:compound|name)\s*[:=]\s*/i, "").trim();
  if (!COMPOUND_NAME.test(name)) return null;
  const path = `${PUBCHEM}/name/${encodeURIComponent(name)}`;
  return {
    name,
    image: `${path}/PNG?image_size=400x260`,
    properties: `${path}/property/MolecularFormula,IUPACName/JSON`,
    page: `https://pubchem.ncbi.nlm.nih.gov/#query=${encodeURIComponent(name)}`,
  };
}

/* "C4H8O2" -> "C₄H₈O₂", for the caption. */
export const formulaText = (formula) => (formula || "").replace(/\d/g, (d) => "₀₁₂₃₄₅₆₇₈₉"[d]);

/* ── Anatomy and botany in 3D (Sketchfab embeds). Fixed models, picked for the Grade 12
   biology chapters and mostly from medical schools; the tutor names one by its key. */
export const ANATOMY = {
  eye: { uid: "f7745aaff145485fb02cf729c96c5f37", title: "Anatomy of the eye", by: "E-learning UMCG" },
  ear: { uid: "4f5438fc9337454587ec4a2c30c8c42f", title: "Ear cross-section (outer, middle and inner ear)", by: "Ebers" },
  "inner-ear": { uid: "f80bda64666c4b8aaac8f63b7b82a0a0", title: "Anatomy of the inner ear (cochlea, semicircular canals)", by: "University of Dundee School of Medicine" },
  brain: { uid: "95b4e19bb32c4edeb46fcb3db048037c", title: "Human brain with internal structures", by: "The Center for BioMedical Visualization at SGU" },
  neuron: { uid: "1552b08138764c4897ac262cc5721792", title: "Nerve cell (neuron and oligodendrocyte)", by: "Ebers" },
  pancreas: { uid: "f7b30e11b5df445fbdfe0e262e777c85", title: "Human pancreas, cross-section", by: "arloopa" },
  flower: { uid: "7e3186fec9b941aa97fde7ecb080828a", title: "Flower cross-section", by: "Ebers" },
};

export function anatomy(code) {
  const key = code.trim().replace(/^(?:anatomy|model)\s*[:=]\s*/i, "").split(/\s+/)[0]?.toLowerCase();
  if (!key || !Object.hasOwn(ANATOMY, key)) return null;
  const entry = ANATOMY[key];
  return {
    key, ...entry,
    url: `https://sketchfab.com/models/${entry.uid}/embed?autostart=1&ui_infos=0&ui_watermark=0&ui_hint=2&dnt=1`,
    page: `https://sketchfab.com/3d-models/${entry.uid}`,
  };
}

/* ── Thermodynamics: P-V diagrams computed here and drawn in GeoGebra.
   Units: volume in L, pressure in kPa, temperature in K (so p·V in kPa·L is in J).
     carnot Th 600 Tc 300 V1 1 V2 2 [n 1] [gamma 1.4]
     isothermal T 300 V1 1 V2 2 [n 1]
     isobaric p 100 V1 1 V2 3
     isochoric V 2 p1 100 p2 300
     adiabatic p1 200 V1 1 V2 2 [gamma 1.4]
   The tutor gives the exercise's values; the curves, points, work and efficiency come
   from the formulas here, so the figure cannot disagree with the physics. */
export const GAS_CONSTANT = 8.31; // the value the Grade 12 textbook and its answers use
const THERMO_KINDS = ["carnot", "isothermal", "isobaric", "isochoric", "adiabatic"];
const NEEDS = {
  carnot: ["Th", "Tc", "V1", "V2"], isothermal: ["T", "V1", "V2"], isobaric: ["p", "V1", "V2"],
  isochoric: ["V", "p1", "p2"], adiabatic: ["p1", "V1", "V2"],
};

export function parseThermo(code) {
  const text = code.trim();
  const kind = THERMO_KINDS.find((name) => new RegExp(`^${name}\\b`, "i").test(text));
  if (!kind) return null;
  const values = { n: 1, gamma: 1.4 };
  // Bare numbers in the documented order ("carnot 600 300 1 2") count as the named values.
  const bare = text.slice(kind.length).trim();
  if (/^[0-9.eE\s,+-]+$/.test(bare)) {
    const order = [...NEEDS[kind], ...(kind === "isothermal" ? ["n"] : kind === "carnot" ? ["n", "gamma"] : kind === "adiabatic" ? ["gamma"] : [])];
    bare.split(/[\s,]+/).filter(Boolean).forEach((number, i) => { if (order[i]) values[order[i]] = Number(number); });
  }
  for (const [, key, value] of text.matchAll(/\b(Th|Tc|T|V1|V2|V|p1|p2|p|n|gamma|γ)\s*[:=]?\s*([0-9]*\.?[0-9]+(?:e-?[0-9]+)?)/gi)) {
    const name = key === "γ" ? "gamma" : ({ th: "Th", tc: "Tc", t: "T", v1: "V1", v2: "V2", v: "V", p1: "p1", p2: "p2", p: "p", n: "n", gamma: "gamma" })[key.toLowerCase()];
    values[name] = Number(value);
  }
  const ok = NEEDS[kind].every((key) => values[key] > 0) && values.n > 0 && values.gamma > 1
    && (kind !== "carnot" || (values.Th > values.Tc && values.V2 > values.V1))
    && (!["isothermal", "isobaric", "adiabatic"].includes(kind) || values.V2 !== values.V1);
  return ok ? { kind, ...values } : null;
}

const r = (value, digits = 4) => Number(value.toPrecision(digits));

/* The GeoGebra commands for the diagram, and the numbers to show under it. */
export function thermoFigure(t) {
  const R = GAS_CONSTANT, g = t.gamma;
  const lines = [], facts = [];
  const view = (vmax, pmax) => `ZoomIn(0, 0, ${r(vmax * 1.15)}, ${r(pmax * 1.2)})`;
  if (t.kind === "carnot") {
    const ratio = (t.Th / t.Tc) ** (1 / (g - 1));
    const [VA, VB, VC, VD] = [t.V1, t.V2, t.V2 * ratio, t.V1 * ratio];
    const hot = t.n * R * t.Th, cold = t.n * R * t.Tc;
    const [pA, pB] = [hot / VA, hot / VB];
    // The upper side of the cycle is the hot isotherm then the adiabat B->C, the lower
    // side the adiabat A->D then the cold isotherm; the work is the area between them.
    lines.push(
      `top(x) = If(${r(VA, 6)} <= x <= ${r(VC, 6)}, If(x <= ${r(VB, 6)}, ${r(hot, 6)} / x, ${r(pB * VB ** g, 6)} * x^(-${g})))`,
      `bot(x) = If(${r(VA, 6)} <= x <= ${r(VC, 6)}, If(x <= ${r(VD, 6)}, ${r(pA * VA ** g, 6)} * x^(-${g}), ${r(cold, 6)} / x))`,
      `W = IntegralBetween(top, bot, ${r(VA, 6)}, ${r(VC, 6)})`,
      `A = (${r(VA)}, ${r(pA)})`, `B = (${r(VB)}, ${r(pB)})`,
      `C = (${r(VC)}, ${r(cold / VC)})`, `D = (${r(VD)}, ${r(cold / VD)})`,
      `Text("T1 = ${t.Th} K", (${r(VB)}, ${r(pB * 1.08)}))`, `Text("T2 = ${t.Tc} K", (${r(VD)}, ${r((cold / VD) * 0.8)}))`,
      view(VC, pA),
    );
    const qHot = t.n * R * t.Th * Math.log(VB / VA), qCold = t.n * R * t.Tc * Math.log(VC / VD);
    facts.push(["Q1 (from the hot source, A→B)", `${r(qHot)} J`], ["Q2 (to the cold source, C→D)", `${r(qCold)} J`],
      ["W = Q1 − Q2 (shaded area)", `${r(qHot - qCold)} J`], ["η = 1 − T2/T1", `${r((1 - t.Tc / t.Th) * 100, 3)} %`]);
  } else if (t.kind === "isothermal") {
    const k = t.n * R * t.T, [a, b] = [Math.min(t.V1, t.V2), Math.max(t.V1, t.V2)];
    lines.push(`f(x) = If(${a} <= x <= ${b}, ${r(k, 6)} / x)`, `W = Integral(f, ${a}, ${b})`,
      `A = (${t.V1}, ${r(k / t.V1)})`, `B = (${t.V2}, ${r(k / t.V2)})`, view(b, k / a));
    facts.push(["W by the gas = nRT ln(V2/V1) (shaded area)", `${r(k * Math.log(t.V2 / t.V1))} J`]);
  } else if (t.kind === "isobaric") {
    const [a, b] = [Math.min(t.V1, t.V2), Math.max(t.V1, t.V2)];
    lines.push(`f(x) = If(${a} <= x <= ${b}, ${t.p})`, `W = Integral(f, ${a}, ${b})`,
      `A = (${t.V1}, ${t.p})`, `B = (${t.V2}, ${t.p})`, view(b, t.p));
    facts.push(["W by the gas = p(V2 − V1) (shaded area)", `${r(t.p * (t.V2 - t.V1))} J`]);
  } else if (t.kind === "isochoric") {
    // The graphing app has no Segment: a vertical line piece is a curve in its parameter.
    lines.push(`A = (${t.V}, ${t.p1})`, `B = (${t.V}, ${t.p2})`,
      `c = Curve(${t.V}, t, t, ${Math.min(t.p1, t.p2)}, ${Math.max(t.p1, t.p2)})`, view(t.V, Math.max(t.p1, t.p2)));
    facts.push(["W by the gas (volume constant)", "0 J"]);
  } else {
    const k = t.p1 * t.V1 ** g, p2 = k * t.V2 ** -g, [a, b] = [Math.min(t.V1, t.V2), Math.max(t.V1, t.V2)];
    lines.push(`f(x) = If(${a} <= x <= ${b}, ${r(k, 6)} * x^(-${g}))`, `W = Integral(f, ${a}, ${b})`,
      `A = (${t.V1}, ${t.p1})`, `B = (${t.V2}, ${r(p2)})`, view(b, k * a ** -g));
    facts.push(["p2 = p1 (V1/V2)^γ", `${r(p2)} kPa`], ["W by the gas = (p1V1 − p2V2)/(γ − 1) (shaded area)", `${r((t.p1 * t.V1 - p2 * t.V2) / (g - 1))} J`]);
  }
  return { code: lines.join("\n"), facts, axes: "V (L) horizontally, p (kPa) vertically" };
}

/* ── The ideal-gas particle simulation's settings: ```gas  T 300  [N 60] */
export function parseGas(code) {
  const T = Number(code.match(/\bT\s*[:=]?\s*([0-9]*\.?[0-9]+)/i)?.[1] ?? 300);
  const N = Number(code.match(/\bN\s*[:=]?\s*([0-9]+)/)?.[1] ?? 60);
  return { temperature: Math.min(1500, Math.max(50, T || 300)), count: Math.min(150, Math.max(10, N || 60)) };
}
