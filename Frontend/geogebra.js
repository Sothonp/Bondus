/* GeoGebra figures: reading a ```geogebra / ```geogebra-3d block (prompts.py rule 7) and
   building it in an applet, one command at a time. App.jsx draws the applet; this file
   holds the logic so it can be tested without a browser (geogebra.test.js). */

export const GGB_SCRIPT = "https://www.geogebra.org/apps/deployggb.js";
export const GGB_MAX_LINES = 30;
// One missing object fails every later command that uses it, so report the first few
// steps rather than the whole cascade.
export const GGB_MAX_REPORTED = 3;
const GGB_BLOCKED = /^\s*(Execute|SetClickScript|SetUpdateScript|RunClickScript|RunUpdateScript|PlaySound|ReadText)\b/i;

export const geogebraCommands = (code) => code.split("\n")
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith("#") && line.length <= 500 && !GGB_BLOCKED.test(line))
  .slice(0, GGB_MAX_LINES);

/* The model picks the fence, and it does not always pick `geogebra-3d` for a figure that
   lives in space. In the 2D graphing app "A = (1, 2, 3)" is not a point, so Plane(A, B, C)
   fails with "Illegal argument: Point A" -- and GeoGebra says so in a modal over the chat.
   Read the commands instead of trusting the fence. */
const GGB_SOLID = /\b(?:Plane|PerpendicularPlane|PlaneBisector|Sphere|Surface|Cube|Prism|Pyramid|Tetrahedron|Octahedron|Cone|Cylinder|InfiniteCone|Vector3D|IntersectConic)\s*\(/i;
const GGB_TRIPLE = /\(\s*-?\d[\d.]*\s*,\s*-?\d[\d.]*\s*,\s*-?\d[\d.]*\s*\)/;
const GGB_Z_AXIS = /(?:^|[\s(])z\s*[=:]/im;
export const isSpatial = (commands) => commands.some(
  (command) => GGB_SOLID.test(command) || GGB_TRIPLE.test(command) || GGB_Z_AXIS.test(command));

/* "A = (1,2,3)", "c: x + y = 1" and "f(x) = x^2" each name what they build; a bare
   construction such as Plane(A,B,C) names nothing and is checked by its arguments. */
const GGB_LABEL = /^\s*([A-Za-z]\w*)\s*(?:\(\s*[A-Za-z]\w*\s*\))?\s*[:=]/;
const GGB_ARGUMENTS = /\(([^()]*)\)\s*$/;
/* Names GeoGebra knows without being told: the free variables of a function or equation
   (x, y, z; t for a curve or a wave) and its constants (pi, e, i). They are never objects
   the figure has to build first. "y = 3 sin(2x)" is a curve, not an object named y, and
   sin(x), ZoomIn(0, -1, 2pi, 1) or Integral(f, 0, pi) are not missing anything. */
const GGB_BUILT_IN = new Set(["x", "y", "z", "t", "pi", "e", "i"]);
/* Commands that change the view or an object's style build nothing, and evalCommand
   returns false for them even when they work: ZoomIn(-1, -2, 7, 2) does set the view
   (checked in a real applet). Only an exception means one of them failed. */
const GGB_ACTION = /^\s*(?:ZoomIn|ZoomOut|CenterView|SetAxesRatio|ShowAxes|ShowGrid|ShowLabel|SetColor|SetBackgroundColor|SetLineThickness|SetLineStyle|SetPointSize|SetPointStyle|SetFilling|SetDecoration|SetCaption|SetLabelMode|SetFixed|SetLayer|SetTrace|SetVisibleInView|SetValue|StartAnimation)\s*\(/i;

/* Build the figure in the order it was written, and report the step that would not build
   rather than leaving GeoGebra to raise a dialog the student can do nothing about. */
export function buildFigure(api, commands) {
  const unbuilt = [];
  try { api.setErrorDialogsActive(false); } catch { /* an older applet may not have it */ }
  for (const command of commands) {
    const missing = (command.match(GGB_ARGUMENTS)?.[1] || "").split(",")
      .map((argument) => argument.trim())
      .filter((argument) => /^[A-Za-z]\w{0,2}$/.test(argument) && !GGB_BUILT_IN.has(argument) && !api.exists(argument));
    if (missing.length) { unbuilt.push(`${command} (no ${missing.join(", ")})`); continue; }
    let built = false;
    try {
      const result = api.evalCommand(command);
      built = result !== false || GGB_ACTION.test(command);
    } catch { built = false; }
    const label = command.match(GGB_LABEL)?.[1];
    if (built && label && !GGB_BUILT_IN.has(label) && !api.exists(label)) built = false;
    if (!built) unbuilt.push(command);
  }
  return unbuilt;
}
