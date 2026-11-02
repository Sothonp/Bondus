/* The Romdoul flower decoration: light mode only, decoration only, and no existing colour token touched. */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const dir = path.dirname(fileURLToPath(import.meta.url));
const read = (f) => fs.readFileSync(path.join(dir, f), "utf8");
const app = read("App.jsx");
const art = read("Romdoul.jsx");
const chapters = read("ChapterList.jsx");

test("every flower is decoration: hidden from screen readers, no text, no imports from App", () => {
  assert.match(art, /"aria-hidden": "true"/);
  assert.match(art, /focusable: "false"/);
  assert.doesNotMatch(art, /<text|<title|from "\.\/App/);
  const vine = art.slice(art.indexOf("export function RomdoulVine"), art.indexOf("export function RomdoulSprig"));
  assert.match(vine, /aria-hidden="true"/);
});

test("flowers are light mode only and take no space or taps", () => {
  assert.match(app, /\.theme-dark \.eai-romdoul\{ display:none; \}/);
  assert.match(app, /\.eai-romdoul\{[^}]*pointer-events:none/);
  assert.match(app, /\.eai-romdoul-corner\{ position:absolute;/);
  assert.match(app, /@media \(max-width:339px\)\{ \.eai-romdoul-corner\{ display:none; \} \}/);
});

test("the Romdoul tokens are new ones in the light theme, and the core tokens are exactly as before", () => {
  assert.match(app, /\.theme-light\{ --romdoul:#F6DE97; --romdoul-edge:#C48A2A; --leaf:#5BA24C;/);
  const light = app.slice(app.indexOf(".theme-light{\n"), app.indexOf(".theme-dark{\n"));
  for (const token of ["--bg:#FFFFFF", "--card:#FFFFFF", "--ink:#1A1B3A", "--primary:#403FB0", "--primary-soft:#ECECFB", "--gold:#E29A30", "--line:#E7E6EF"]) assert.ok(light.includes(token), token);
  assert.doesNotMatch(light, /romdoul|--leaf/);
});

test("the flowers sit where the plan put them, and corner text leaves room for them", () => {
  assert.match(app, /import \{ RomdoulCluster, RomdoulBlossom, RomdoulSprig \} from "\.\/Romdoul\.jsx";/);
  const hero = app.slice(app.indexOf("function WelcomeHeroCard"), app.indexOf("function RecommendedLessonCard"));
  assert.match(hero, /<RomdoulCluster className="eai-romdoul-corner" \/>/);
  const lesson = app.slice(app.indexOf("function RecommendedLessonCard"), app.indexOf("/* ═", app.indexOf("function RecommendedLessonCard")));
  assert.match(lesson, /<RomdoulCluster className="eai-romdoul-corner" \/>/);
  assert.match(app, /\.theme-light \.eai-hero-greeting\{ padding-inline-end:52px; \}/);
  assert.match(app, /\.theme-light \.eai-lesson-label\{ padding-inline-end:52px; \}/);
  assert.match(app, /<RomdoulBlossom size=\{15\} className="eai-romdoul-bullet" \/>/, "CardHead has the blossom bullet");
  assert.match(app, /<RomdoulSprig size=\{34\} \/>/, "the empty plan has a sprig");
});

test("the chapter path draws a Romdoul vine in light mode, staged by the chapter above, and dark mode keeps the plain line", () => {
  assert.match(chapters, /<RomdoulVine stage=\{row\.state === "passed" \|\| row\.state === "mastered" \? "bloom" : row\.state === "locked" \? "bud" : "grow"\} \/>/);
  assert.match(chapters, /<RomdoulBlossom size=\{15\} className="eai-romdoul-bullet" \/>/, "the chapter count has the blossom bullet");
  assert.match(app, /\.theme-light \.eai-rail-line\{ display:none; \}/);
  assert.doesNotMatch(app, /\.theme-dark \.eai-rail-line/, "dark mode never hides the plain line");
  for (const stage of ["bud", "grow", "bloom"]) assert.ok(art.includes(stage), stage);
  assert.match(app, /\{subjectLabel\(subject, lang\)\}<RomdoulSprig size=\{34\} \/><\/h2>/, "the subject heading has a sprig");
});
