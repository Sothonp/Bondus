/* Tests for the Vite plugin that writes the first-load loading screen into index.html (Frontend/splashPlugin.js).
   Run with:  node --test Frontend/splashPlugin.test.js */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { bondusSplash } from "./splashPlugin.js";
import { LOADING_CSS, SPLASH_ID, loadingMarkup } from "./loadingScreen.js";

const indexHtml = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const plugin = bondusSplash();

test("the first-load screen goes into index.html: its CSS in the head, the screen just before the app's root", () => {
  const out = plugin.transformIndexHtml(indexHtml);
  assert.ok(out.includes(`<style id="eai-ld-css">${LOADING_CSS}</style>`));
  assert.ok(out.indexOf("eai-ld-css") < out.indexOf("</head>"), "in the head");
  assert.ok(out.includes(loadingMarkup({ id: SPLASH_ID })));
  assert.ok(out.indexOf(`id="${SPLASH_ID}"`) < out.indexOf('<div id="root"'), "before the root, so the app mounts beside it");
  assert.equal((out.match(new RegExp(`id="${SPLASH_ID}"`, "g")) || []).length, 1);
});

test("everything else in index.html is kept", () => {
  const out = plugin.transformIndexHtml(indexHtml);
  for (const keep of ["<title>Bondus</title>", '<script type="module" src="/Frontend/main.jsx"></script>', '<div id="root"></div>']) assert.ok(out.includes(keep), keep);
});

test("it is a Vite plugin with a name", () => {
  assert.equal(typeof plugin.name, "string");
  assert.equal(typeof plugin.transformIndexHtml, "function");
});

test("if index.html loses its head or its root, the build says so instead of quietly dropping the screen", () => {
  assert.throws(() => plugin.transformIndexHtml("<html><head></head><body></body></html>"), /root/);
  assert.throws(() => plugin.transformIndexHtml('<html><body><div id="root"></div></body></html>'), /head/);
});
