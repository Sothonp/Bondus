/* The Water Festival hero: the rowing video and its posters exist, the video is set up to loop silently on a white background,
   the old airplane hero is really gone, the words match the brief, and the still (poster-only) fallback is in place.
   Run with:  node --test Frontend/festivalHero.test.js */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (f) => fs.readFileSync(new URL(f, import.meta.url), "utf8");
const exists = (f) => fs.existsSync(new URL(f, import.meta.url));
const hero = read("./FestivalHero.jsx");
const app = read("./App.jsx");
const css = read("./festivalStyles.js");

test("the rowing video and its posters exist, and the scene points at them", () => {
  for (const f of ["hero-festival.mp4", "hero-festival-poster.webp", "hero-festival-poster.jpg"]) assert.ok(exists(`../public/hero/${f}`), `${f} is missing`);
  for (const path of ["/hero/hero-festival.mp4", "/hero/hero-festival-poster.webp", "/hero/hero-festival-poster.jpg"]) assert.ok(hero.includes(path), path);
  assert.ok(!fs.readdirSync(new URL("../public/hero/", import.meta.url)).some((f) => f.startsWith("festival-")), "the old layered pieces should be deleted");
});

test("the video is light enough for a phone on mobile data, and is a real mp4", () => {
  const dir = new URL("../public/hero/", import.meta.url);
  const size = (f) => fs.statSync(new URL(f, dir)).size;
  assert.ok(size("hero-festival.mp4") < 400 * 1024, `video is ${Math.round(size("hero-festival.mp4") / 1024)} KB`);
  assert.ok(size("hero-festival-poster.webp") < 200 * 1024);
  assert.equal(fs.readFileSync(new URL("hero-festival.mp4", dir)).subarray(4, 8).toString("latin1"), "ftyp", "not an MP4 file");
});

test("the video autoplays, loops silently inline, and sits on a white background", () => {
  const tag = hero.match(/<video[\s\S]*?\/>/)[0];
  for (const attr of ["loop", "muted", "playsInline", "poster="]) assert.ok(tag.includes(attr), `video lacks ${attr}`);
  assert.match(css, /\.eai-fh-stage\{[^}]*background:#FFFFFF/);
  assert.match(css, /\.eai-fh-scene\{[^}]*background:#FFFFFF/);
});

test("the old airplane / runway / phone hero is gone", () => {
  for (const f of ["./HeroPlane.jsx", "./heroFlight.js", "./heroPlane.js"]) assert.ok(!exists(f), `${f} should be deleted`);
  for (const word of ["HeroPlane", "heroFlight", "HeroScene", "HeroPhone", "eai-plane", "eai-rider", "eai-hero-svg", "runway", "ISO_MATRIX", "heroIntroPlayed"]) {
    assert.ok(!app.includes(word), `App.jsx still mentions ${word}`);
  }
  assert.ok(!/--hero-plane|--hero-runway|--hero-phone/.test(app), "old hero colour tokens");
});

test("the headline, tagline and picture description are the Water Festival ones, in both languages", () => {
  assert.match(app, /welcomeHeading: "Learn with", welcomeBrand: "BONDUS!"/);
  assert.match(app, /welcomeSubtitle: "Discover your path with the best Cambodian learning app\."/);
  assert.match(app, /welcomeHeading: "រៀនជាមួយ", welcomeBrand: "BONDUS!"/);
  assert.match(app, /heroAlt: "The BONDUS owl leads a dragon boat race at the Water Festival/);
  assert.match(app, /heroAlt: "ទីទុយ BONDUS ដឹកនាំទូក/);
});

test("people who ask for less motion, have Data Saver on, or hit a video error get the still poster only", () => {
  assert.match(hero, /const still = reduce \|\| saveData \|\| failed;/);
  assert.ok(hero.includes("navigator.connection?.saveData"));
  assert.match(hero, /\{!still && \(\s*<video/);
  assert.ok(hero.includes("onError={() => setFailed(true)}"), "a video that fails to load falls back to the poster");
});

test("the video starts after load, and pauses while scrolling and while scrolled out of view", () => {
  assert.ok(hero.includes("IntersectionObserver") && hero.includes("v.pause()"));
  assert.ok(hero.includes('addEventListener("scroll", onScroll') && hero.includes('document.readyState === "complete"'));
});

test("the owl's chat bubble is a button above its head that shows the next line on a tap", () => {
  assert.match(app, /className="eai-fh-bubble eai-focus" onClick=\{\(\) => setMsgIdx/);
  assert.match(app, /placement="above"/);
  assert.match(app, /if \(reduceMotion\) return undefined;/, "no auto-rotation under reduced motion");
  assert.ok(hero.includes("OWL_ANCHOR"));
});

test("the headline sits on a frosted (backdrop-blur) card on laptops, and a solid soft card on phones", () => {
  assert.match(css, /\.eai-fh-card\{[^}]*backdrop-filter:blur\(16px\)/);
  assert.match(css, /@media \(min-width:1024px\) and \(hover:hover\)\{\s*@supports/, "blur only on laptops");
});
