/* Tests for the React LoadingScreen (Frontend/LoadingScreen.jsx), rendered to static markup through Vite.
   Run with:  node --test Frontend/loadingScreen.ssr.test.js */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { Suspense, lazy } from "react";
import { startSsr } from "./rewards/ssrHarness.js";
import { loadingMarkup, loadingMessage } from "./loadingScreen.js";

let s, LoadingScreen;
before(async () => {
  s = await startSsr();
  ({ default: LoadingScreen } = await s.load("/Frontend/LoadingScreen.jsx"));
});
after(() => s.close());

test("it renders the shared overlay and brings its own CSS, so it works anywhere in the tree", () => {
  const html = s.render(s.h(LoadingScreen, {}));
  assert.ok(html.includes(loadingMarkup({})));
  assert.match(html, /<style>[^<]*\.eai-ld\{/);
});

test("dark mode, Khmer and a custom message come through the props", () => {
  assert.ok(s.render(s.h(LoadingScreen, { dark: true })).includes('class="eai-ld eai-ld-dark"'));
  const km = s.render(s.h(LoadingScreen, { lang: "km" }));
  assert.ok(km.includes(loadingMessage("km")) && km.includes('lang="km"'));
  const custom = s.render(s.h(LoadingScreen, { message: "Opening your lessons" }));
  assert.ok(custom.includes("Opening your lessons") && !custom.includes(loadingMessage("en")));
});

test("it announces itself as a status and keeps the decorative owl away from screen readers", () => {
  const html = s.render(s.h(LoadingScreen, {}));
  assert.match(html, /role="status" aria-live="polite"/);
  assert.match(html, /<svg class="eai-ld-owl"[^>]*aria-hidden="true"/);
});

test("it works as a Suspense fallback while a lazy page loads", () => {
  const Page = lazy(() => new Promise(() => {}));   // never arrives
  const html = s.render(s.h(Suspense, { fallback: s.h(LoadingScreen, { lang: "en" }) }, s.h(Page)));
  assert.ok(html.includes(loadingMarkup({})));
});

test("it can be switched on and off with a flag", () => {
  const screen = (isLoading) => s.render(s.h("div", null, isLoading && s.h(LoadingScreen, {}), s.h("main", null, "page")));
  assert.ok(screen(true).includes("eai-ld"));
  assert.ok(!screen(false).includes("eai-ld"));
});
