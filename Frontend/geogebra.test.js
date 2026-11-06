/* Tests for building GeoGebra figures (Frontend/geogebra.js).
   Run with:  node --test Frontend/geogebra.test.js   (no dependencies — Node's built-in runner) */
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildFigure, geogebraCommands, isSpatial } from "./geogebra.js";

/* A stand-in for the applet API: every command builds, and a labelled one ("f(x) = ...",
   "a: x = 1", "A = (0, 1)") creates its label. An unlabelled curve ("y = 2x") is named by
   GeoGebra itself, as the real app does. */
function fakeApi({ fails = [] } = {}) {
  const objects = new Set();
  let unnamed = 0;
  return {
    objects,
    setErrorDialogsActive() {},
    exists: (name) => objects.has(name),
    evalCommand(command) {
      if (fails.some((bad) => command.includes(bad))) return false;
      // The real applet returns false for a view or style command even when it works.
      if (/^\s*(?:ZoomIn|SetColor|ShowGrid)\s*\(/.test(command)) return false;
      const label = command.match(/^\s*([A-Za-z]\w*)\s*(?:\(\s*[A-Za-z]\w*\s*\))?\s*[:=]/)?.[1];
      objects.add(label && !["x", "y", "z"].includes(label) ? label : `eq${++unnamed}`);
      return true;
    },
  };
}

test("a sine wave written with x, pi and t builds in full", () => {
  const commands = geogebraCommands([
    "y = 2*sin(x)",
    "f(x) = 0.05*sin(2*pi*(x/0.5))",
    "g(x) = sin(x)",
    "A = Integral(f, 0, pi)",
    "ZoomIn(-0.1, -0.07, 2*pi, pi)",
  ].join("\n"));
  assert.deepEqual(buildFigure(fakeApi(), commands), []);
});

test("an unlabelled equation is not reported as failed", () => {
  assert.deepEqual(buildFigure(fakeApi(), ["y = 3*sin(2*x)", "x = 1"]), []);
});

test("a construction on an object that does not exist is still reported", () => {
  const unbuilt = buildFigure(fakeApi(), ["A = (0, 0)", "Segment(A, B)"]);
  assert.deepEqual(unbuilt, ["Segment(A, B) (no B)"]);
});

test("a command GeoGebra rejects is reported", () => {
  assert.deepEqual(buildFigure(fakeApi({ fails: ["Text("] }), ['Text("node", 5, 0)']), ['Text("node", 5, 0)']);
});

test("scripting commands and comments are dropped, and blocks are capped", () => {
  const code = ["# a wave", "Execute({\"x\"})", "f(x) = sin(x)", ...Array(40).fill("A = (1, 1)")].join("\n");
  const commands = geogebraCommands(code);
  assert.equal(commands[0], "f(x) = sin(x)");
  assert.equal(commands.length, 30);
});

test("a figure with a point in space needs the 3D app", () => {
  assert.equal(isSpatial(["A = (1, 2, 3)"]), true);
  assert.equal(isSpatial(["f(x) = sin(x)", "y = 2"]), false);
});

test("view and style commands are not reported as failed, though evalCommand returns false", () => {
  const commands = ["f(x) = sin(x)", "SetColor(f, \"red\")", "ShowGrid(true)", "ZoomIn(-1, -2, 7, 2)"];
  assert.deepEqual(buildFigure(fakeApi(), commands), []);
});
