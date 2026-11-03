/* The owl's face is the site icon (browser tab, home-screen icon, and the round icon Google shows beside the site name).
   Run with:  node --test Frontend/siteIcons.test.js */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const root = new URL("../", import.meta.url);
const html = readFileSync(new URL("index.html", root), "utf8");
const hrefs = [...html.matchAll(/<link\s+rel="(?:icon|apple-touch-icon|manifest)"[^>]*href="([^"]+)"/g)].map((m) => m[1]);

test("index.html links the icons, and every linked file exists in public/", () => {
  // Breaks if: a link points at a file that was renamed or never added (the tab and Google then show a blank globe).
  assert.ok(hrefs.includes("/favicon.ico"), "Google looks for /favicon.ico first");
  assert.ok(hrefs.includes("/apple-touch-icon.png"));
  for (const href of hrefs) assert.ok(existsSync(new URL(`public${href}`, root)), href);
});

test("PNG icons are square, and the sizes Google asks for are multiples of 48 px", () => {
  // Breaks if: an icon is the wrong shape (squashed in the tab) or a size Google will not use.
  const size = (file) => { const b = readFileSync(new URL(`public/${file}`, root)); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
  for (const [file, n] of [["favicon-48x48.png", 48], ["favicon-96x96.png", 96], ["icon-192.png", 192], ["icon-512.png", 512]]) {
    assert.deepEqual(size(file), [n, n], file);
    assert.equal(n % 48 === 0 || n === 512, true);
  }
  assert.deepEqual(size("apple-touch-icon.png"), [180, 180]);
});

test("favicon.ico holds 16, 32 and 48 px images", () => {
  const b = readFileSync(new URL("public/favicon.ico", root));
  assert.equal(b.readUInt16LE(2), 1, "an icon file");
  const count = b.readUInt16LE(4);
  const sizes = Array.from({ length: count }, (_, i) => b[6 + i * 16] || 256).sort((a, c) => a - c);
  assert.deepEqual(sizes, [16, 32, 48]);
});

test("the web manifest names the app and points at real icons", () => {
  const manifest = JSON.parse(readFileSync(new URL("public/site.webmanifest", root), "utf8"));
  assert.equal(manifest.name, "Bondus");
  for (const icon of manifest.icons) assert.ok(existsSync(new URL(`public${icon.src}`, root)), icon.src);
});
