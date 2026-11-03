import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startSsr } from "./rewards/ssrHarness.js";

let s, SubjectRibbon;
before(async () => {
  s = await startSsr();
  ({ default: SubjectRibbon } = await s.load("/Frontend/SubjectRibbon.jsx"));
});
after(() => s.close());

const labels = (html) => [...html.matchAll(/<button[^>]*class="eai-ribbon-item[^"]*"[^>]*>.*?<\/button>/g)].map((m) => s.text(m[0]));

test("renders the eleven subject names in order (English)", () => {
  const html = s.render(s.h(SubjectRibbon, { lang: "en" }));
  assert.deepEqual(labels(html), ["Math", "Khmer", "Physics", "Chemistry", "English", "Biology", "History", "Earth & Science", "Economy", "Morality", "Geography"]);
});

test("renders Khmer names and Khmer-font items when the app is in Khmer", () => {
  const html = s.render(s.h(SubjectRibbon, { lang: "km" }));
  assert.equal(labels(html).length, 11);
  assert.ok(labels(html).every((l) => /[ក-៿]/.test(l)));
  assert.match(html, /class="eai-ribbon-item eai-focus eai-km"/);
});

test("is a labelled region with two arrow buttons that start idle", () => {
  const html = s.render(s.h(SubjectRibbon, { lang: "en" }));
  assert.match(html, /<section[^>]*aria-label="Subjects"/);
  assert.match(html, /aria-label="Scroll subjects left"/);
  assert.match(html, /aria-label="Scroll subjects right"/);
  assert.equal((html.match(/class="eai-ribbon-arrow/g) || []).length, 2);
});

test("icons are decorative: hidden from assistive tech", () => {
  const html = s.render(s.h(SubjectRibbon, { lang: "en" }));
  assert.equal((html.match(/class="eai-ribbon-tile"[^>]*aria-hidden="true"/g) || []).length, 33, "every icon, in all three copies of the list");
});

test("extra classes go on the region", () => {
  const html = s.render(s.h(SubjectRibbon, { lang: "en", className: "self-stretch -mx-6" }));
  assert.match(html, /<section[^>]*class="eai-ribbon self-stretch -mx-6"/);
});

test("the list is drawn three times so the strip can loop; only the first copy is read out and tabbed to", () => {
  // Breaks if: the extra copies get in the way of screen readers or the keyboard (33 buttons instead of 11), or the loop loses its copies.
  const html = s.render(s.h(SubjectRibbon, { lang: "en" }));
  assert.equal((html.match(/<ul[^>]*class="eai-ribbon-list/g) || []).length, 3);
  assert.equal((html.match(/<ul[^>]*class="eai-ribbon-list eai-ribbon-clone"[^>]*aria-hidden="true"/g) || []).length, 2);
  assert.equal((html.match(/class="eai-ribbon-copy eai-ribbon-item[^"]*"/g) || []).length, 22);
  assert.equal((html.match(/class="eai-ribbon-copy[^"]*"[^>]*tabindex="-1"|tabindex="-1"[^>]*class="eai-ribbon-copy/g) || []).length, 22);
  assert.equal(labels(html).length, 11, "the real buttons are still the eleven");
});
