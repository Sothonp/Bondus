/* The exam paper map (Frontend/examPapers.js): which year the Browse page should open on.
   Run with:  node --test Frontend/examPapers.test.js */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { EXAM_PAPER_PDFS, newestPaperYear } from "./examPapers.js";

test("Browse opens on each track's newest year that really has papers (Science 2025, Social Science 2022)", () => {
  assert.equal(newestPaperYear("science"), 2025);
  assert.equal(newestPaperYear("social_science"), 2022);
});

test("that year really has papers for the track, and the next year has none", () => {
  const has = (field, y) => Object.keys(EXAM_PAPER_PDFS).some((k) => k.endsWith(`-${field}-${y}`));
  for (const field of ["science", "social_science"]) {
    const y = newestPaperYear(field);
    assert.ok(has(field, y), `${field} ${y} has no paper`);
    assert.ok(!has(field, y + 1), `${field} ${y + 1} already has papers, so ${y} is not the newest`);
  }
});

test("the other track's papers are not counted, and picture papers count too", () => {
  const pdfs = { "Physics-science-2025": "/a.pdf", "History-social_science-2019": "/b.pdf" };
  const images = { "Geography-social_science-2021": ["/p1.jpg"] };
  assert.equal(newestPaperYear("social_science", pdfs, images), 2021);
  assert.equal(newestPaperYear("science", pdfs, images), 2025);
});

test("with no papers at all, or an unknown track, it falls back to a sensible year", () => {
  assert.equal(newestPaperYear("science", {}, {}), 2023);
  assert.equal(newestPaperYear(undefined), 2023);
  assert.equal(newestPaperYear("science", {}, {}, 2019), 2019);
});

test("the Browse page starts on that year instead of a fixed one", () => {
  const app = readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  assert.match(app, /const \[year, setYear\] = useState\(\(\) => newestPaperYear\(p\.field\)\);/);
});
