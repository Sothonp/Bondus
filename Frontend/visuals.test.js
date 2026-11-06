/* Tests for the circuit, PhET and molecule figures (Frontend/visuals.js).
   Run with:  node --test Frontend/visuals.test.js   (no dependencies — Node's built-in runner) */
import { test } from "node:test";
import assert from "node:assert/strict";
import { compound, falstadText, falstadUrl, FALSTAD_URL, formulaText, molecule, parseCircuit, phetSim } from "./visuals.js";

test("a series RLC circuit becomes a CircuitJS loop with a scope on the source", () => {
  const circuit = parseCircuit("source: ac 311 50\nR 100\nL 0.5\nC 0.0001");
  assert.deepEqual(circuit, {
    source: { ac: true, volts: 311, frequency: 50 },
    parts: [{ kind: "R", value: 100 }, { kind: "L", value: 0.5 }, { kind: "C", value: 0.0001 }],
  });
  const lines = falstadText(circuit).trim().split("\n");
  assert.equal(lines[0], "$ 1 0.00005 10.2 50 311 50");
  assert.equal(lines[1], "v 128 256 128 64 0 1 50 311 0 0 0.5");
  assert.deepEqual(lines.slice(2, 5), ["r 128 64 256 64 0 100", "l 256 64 384 64 0 0.5 0", "c 384 64 512 64 0 0.0001 0 0"]);
  assert.deepEqual(lines.slice(5, 7), ["w 512 64 512 256 0", "w 512 256 128 256 0"]);
  assert.match(lines[7], /^o 0 4 0 3 /);
});

test("the parts join up: each starts where the last ended, and the wires close the loop", () => {
  const lines = falstadText(parseCircuit("source: ac 10 60\nR 5\nC 1e-6")).trim().split("\n")
    .filter((line) => /^[rlcw] /.test(line)).map((line) => line.split(" ").slice(1, 5).map(Number));
  for (let i = 1; i < lines.length; i++) assert.deepEqual(lines[i].slice(0, 2), lines[i - 1].slice(2, 4));
  assert.deepEqual(lines.at(-1).slice(2, 4), [128, 256], "back at the source");
});

test("the URL carries the circuit, with every character CircuitJS needs decoded back", () => {
  const circuit = parseCircuit("source: dc 12\nR 1000\nC 0.000047");
  const url = falstadUrl(circuit);
  assert.ok(url.startsWith(`${FALSTAD_URL}?cct=`));
  assert.equal(decodeURIComponent(url.split("?cct=")[1]), falstadText(circuit));
  assert.ok(!/[+=&\s]/.test(url.split("?cct=")[1]), "nothing raw that a query string would split or mangle");
});

test("units, labels and spelling variations are tolerated; nonsense is refused", () => {
  assert.equal(parseCircuit("Source: AC 220 50\nR = 50 Ω\nL: 0.2 H")?.parts.length, 2);
  assert.equal(parseCircuit("source: ac 220\nR 10")?.source.frequency, 50, "50 Hz unless told otherwise");
  assert.equal(parseCircuit("R 100\nC 0.001"), null, "no source");
  assert.equal(parseCircuit("source: ac 220 50"), null, "no parts");
  assert.equal(parseCircuit("source: ac 220 50\nR 0"), null, "a zero resistor");
});

test("only listed PhET simulations are embedded", () => {
  assert.equal(phetSim("wave-on-a-string")?.url,
    "https://phet.colorado.edu/sims/html/wave-on-a-string/latest/wave-on-a-string_all.html");
  assert.equal(phetSim("sim: Faradays-Electromagnetic-Lab")?.key, "faradays-electromagnetic-lab");
  assert.equal(phetSim("made-up-sim"), null);
  assert.equal(phetSim("https://evil.example/x"), null);
});

test("only listed molecules are loaded, by their fixed PDB id", () => {
  assert.equal(molecule("dna")?.pdb, "1BNA");
  assert.equal(molecule("molecule: Insulin")?.pdb, "4INS");
  assert.equal(molecule("9XYZ"), null, "no invented PDB ids");
});

test("a compound is looked up in PubChem by its name, safely encoded", () => {
  const entry = compound("ethyl acetate");
  assert.equal(entry.image, "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/ethyl%20acetate/PNG?image_size=400x260");
  assert.equal(entry.properties, "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/ethyl%20acetate/property/MolecularFormula,IUPACName/JSON");
  assert.equal(compound("compound: 2-methylpropan-1-ol")?.name, "2-methylpropan-1-ol");
  assert.equal(compound("ethyl acetate\nsome other line")?.name, "ethyl acetate", "the first line only");
});

test("a compound name that is not a name is refused", () => {
  for (const bad of ["", "https://evil.example/x", "<script>", "a/../b", "x".repeat(90), "អាស៊ីត"]) {
    assert.equal(compound(bad), null, bad);
  }
});

test("chemistry PhET simulations are on the list", () => {
  for (const key of ["ph-scale", "acid-base-solutions", "concentration", "balancing-chemical-equations"]) {
    assert.ok(phetSim(key), key);
  }
});

test("formulas get subscript digits", () => {
  assert.equal(formulaText("C4H8O2"), "C₄H₈O₂");
});
