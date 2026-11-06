/* Tests for the circuit, PhET and molecule figures (Frontend/visuals.js).
   Run with:  node --test Frontend/visuals.test.js   (no dependencies — Node's built-in runner) */
import { test } from "node:test";
import assert from "node:assert/strict";
import { anatomy, compound, falstadText, falstadUrl, FALSTAD_URL, formulaText, molecule, parseCircuit, parseGas, parseThermo, phetSim, thermoFigure } from "./visuals.js";
import { createGas, idealPressure, readPressure, setTemperature, setWidth, stepGas } from "./gasSim.js";

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

test("a Carnot cycle: the volumes, heats, work and efficiency follow from the four values", () => {
  const cycle = parseThermo("carnot Th 600 Tc 300 V1 1 V2 2");
  assert.deepEqual(cycle, { kind: "carnot", n: 1, gamma: 1.4, Th: 600, Tc: 300, V1: 1, V2: 2 });
  const { code, facts } = thermoFigure(cycle);
  assert.match(code, /^C = \(11\.31, 220\.4\)$/m, "V_C = V_2 (T1/T2)^(1/(γ-1))");
  assert.match(code, /^D = \(5\.657, 440\.7\)$/m);
  assert.match(code, /^W = IntegralBetween\(top, bot, 1, 11\.3137\)$/m, "the cycle's area is the work");
  assert.deepEqual(facts.map(([, value]) => value), ["3456 J", "1728 J", "1728 J", "50 %"]);
  assert.ok(!/Function\(|Segment\(|Polygon\(/.test(code), "only commands GeoGebra's graphing app accepts");
});

test("single processes: the work by the gas", () => {
  const work = (text) => thermoFigure(parseThermo(text)).facts.at(-1)[1];
  assert.equal(work("isothermal T 300 V1 1 V2 2"), "1728 J");
  assert.equal(work("isobaric p 100 V1 1 V2 3"), "200 J");
  assert.equal(work("isochoric V 2 p1 100 p2 300"), "0 J");
  assert.equal(work("adiabatic p1 200 V1 1 V2 2"), "121.1 J");
  assert.equal(work("adiabatic p1 200 V1 1 V2 2 gamma 1.67"), "110.9 J", "a monatomic gas");
});

test("a thermodynamics block that cannot be right is refused", () => {
  assert.equal(parseThermo("carnot Th 300 Tc 600 V1 1 V2 2"), null, "cold hotter than hot");
  assert.equal(parseThermo("isothermal T 300 V1 2 V2 2"), null, "no change");
  assert.equal(parseThermo("isobaric V1 1 V2 2"), null, "no pressure");
  assert.equal(parseThermo("otto cycle"), null);
});

test("only listed anatomy models are embedded", () => {
  assert.equal(anatomy("eye")?.url, "https://sketchfab.com/models/f7745aaff145485fb02cf729c96c5f37/embed?autostart=1&ui_infos=0&ui_watermark=0&ui_hint=2&dnt=1");
  assert.equal(anatomy("anatomy: Inner-Ear")?.key, "inner-ear");
  assert.equal(anatomy("liver"), null);
  assert.equal(anatomy("https://sketchfab.com/models/abc/embed"), null);
});

test("the gas figure's settings are clamped to what the simulation can show", () => {
  assert.deepEqual(parseGas("T 400"), { temperature: 400, count: 60 });
  assert.deepEqual(parseGas("T 99999\nN 5000"), { temperature: 1500, count: 150 });
});

test("the simulated gas obeys pV = NkT: measured pressure follows T and V", () => {
  const gas = createGas({ count: 400, temperature: 300 });
  const measured = () => { readPressure(gas); stepGas(gas, 40); return readPressure(gas); };
  const close = (actual, expected) => assert.ok(Math.abs(actual / expected - 1) < 0.05, `${actual} vs ${expected}`);
  const p0 = measured();
  close(p0, idealPressure(gas));
  setTemperature(gas, 600);
  close(measured() / p0, 2);   // T doubled, p doubles
  setWidth(gas, 0.5);
  close(measured() / p0, 4);   // and V halved, p doubles again
});

test("bare numbers in the documented order are read as the named values", () => {
  assert.deepEqual(parseThermo("carnot 600 300 1 2"), parseThermo("carnot Th 600 Tc 300 V1 1 V2 2"));
  assert.equal(parseThermo("isothermal 300 10 20 2")?.n, 2);
  assert.equal(thermoFigure(parseThermo("isothermal 300 10 20 2")).facts[0][1], "3456 J", "2 mol at 300 K, 10 L -> 20 L");
});

import { fieldAt, magnetFacts, motorTorque, MU0, parseMagnet, seedsFor, sig, traceLine, wiresFor } from "./magnetSim.js";

test("a straight wire's field is μ0 I / (2π d), anticlockwise for a current out of the page", () => {
  const { bx, by } = fieldAt([{ x: 0, y: 0, current: 5 }], 0.1, 0);
  assert.ok(Math.abs(Math.hypot(bx, by) / ((MU0 * 5) / (2 * Math.PI * 0.1)) - 1) < 1e-9);
  assert.ok(by > 0 && Math.abs(bx) < 1e-15, "to the right of the wire the field points up");
  assert.deepEqual(magnetFacts(parseMagnet("wire I 5 d 0.1")), [["B = μ0 I / (2π d)", "1 × 10⁻⁵ T"]]);
});

test("a solenoid: uniform inside, weak outside, and the textbook values", () => {
  const fig = parseMagnet("solenoid N 500 l 0.5 I 2 r 0.02 R 4");
  const wires = wiresFor(fig), centre = fieldAt(wires, 0, 0), offAxis = fieldAt(wires, 0.2, 0.08), outside = fieldAt(wires, 0, 0.7);
  assert.ok(Math.abs(Math.hypot(offAxis.bx, offAxis.by) / Math.hypot(centre.bx, centre.by) - 1) < 0.1, "uniform inside");
  assert.ok(Math.hypot(outside.bx, outside.by) < Math.hypot(centre.bx, centre.by) / 5, "weak outside");
  assert.deepEqual(magnetFacts(fig).map(([, v]) => v), ["2.513 × 10⁻³ T", "62.83 m", "7.896 × 10⁻⁴ H", "1.579 × 10⁻³ J", "8 V"]);
  for (const [x, y] of seedsFor(fig)) {
    assert.ok(Math.max(...traceLine(wires, x, y).map(([px]) => px)) > 0.55, `the line from y=${y} leaves through the end`);
  }
});

test("the Laplace force and the motor's torque", () => {
  assert.deepEqual(magnetFacts(parseMagnet("force B 0.5 I 2 l 0.1 angle 30")), [["F = B I ℓ sin α", "0.05 N"]]);
  const motor = parseMagnet("motor B 0.5 I 2 N 100 a 0.05 b 0.04");
  assert.deepEqual(magnetFacts(motor).map(([, v]) => v), ["5 N", "0.2 N·m"]);
  assert.ok(Math.abs(motorTorque(motor, Math.PI / 2) - 0.2) < 1e-12, "largest with the coil's plane along B");
  assert.ok(motorTorque(motor, 0) < 1e-12, "zero with the plane across B");
  assert.equal(parseMagnet("motor B 0.5 I 2 N 100 S 0.002")?.S, 0.002);
});

test("a magnet block that cannot be drawn is refused", () => {
  assert.equal(parseMagnet("solenoid I 2"), null, "no turns or length");
  assert.equal(parseMagnet("motor B 0.5 I 2"), null, "no coil area");
  assert.equal(parseMagnet("dipole"), null);
  assert.equal(sig(0.002513), "2.513 × 10⁻³");
});

