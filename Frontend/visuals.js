/* Figures beyond GeoGebra, each from a fenced block the tutor writes (prompts.py rule 7):

   ```circuit    -> a live Falstad CircuitJS simulation of a series circuit
   ```phet       -> an embedded PhET simulation, from a fixed list
   ```molecule   -> a 3D molecule (3Dmol.js) from the Protein Data Bank, from a fixed list
   ```compound   -> a chemical compound by name, its structure and formula from PubChem

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
