/* The scrolling landing page: its pure helpers, its words (both languages), and the wiring that keeps it honest.
   Run with:  node --test Frontend/landing.test.js */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { LANDING_STRINGS, landingText, fillLanding } from "./landingStrings.js";
import { practiceQuestionStat, socialLinks, contactEmail, toKhmerDigits, formatCount, countProgress } from "./landing.js";

const KHMER = /[ក-៿]/;
const placeholders = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
const read = (f) => fs.readFileSync(new URL(f, import.meta.url), "utf8");

test("the practice-question number is the real bank size rounded DOWN to the hundred", () => {
  assert.equal(practiceQuestionStat(1062), 1000);
  assert.equal(practiceQuestionStat(1099), 1000);
  assert.equal(practiceQuestionStat(1100), 1100);
  assert.equal(practiceQuestionStat(99), 99);
  assert.equal(practiceQuestionStat(0), 0);
  assert.equal(practiceQuestionStat(undefined), 0);
  assert.equal(practiceQuestionStat(-5), 0);
});

test("social icons appear only for https addresses that are set", () => {
  assert.deepEqual(socialLinks({}), []);
  assert.deepEqual(socialLinks({ VITE_SOCIAL_FACEBOOK: "  ", VITE_SOCIAL_TELEGRAM: "t.me/x" }), []);
  assert.deepEqual(socialLinks({ VITE_SOCIAL_FACEBOOK: "http://facebook.com/bondus" }), [], "plain http is refused");
  assert.deepEqual(socialLinks({ VITE_SOCIAL_FACEBOOK: "javascript:alert(1)" }), []);
  assert.deepEqual(socialLinks({ VITE_SOCIAL_FACEBOOK: "https://localhost/x" }), [], "no dot in the host");
  const out = socialLinks({ VITE_SOCIAL_YOUTUBE: "https://youtube.com/@bondus", VITE_SOCIAL_FACEBOOK: "https://facebook.com/bondus" });
  assert.deepEqual(out.map((s) => s.id), ["facebook", "youtube"], "in a fixed order");
  assert.equal(out[0].url, "https://facebook.com/bondus");
});

test("the contact address shows only when it looks like an email address", () => {
  assert.equal(contactEmail({}), "");
  assert.equal(contactEmail({ VITE_CONTACT_EMAIL: "hello@bondus.tech" }), "hello@bondus.tech");
  assert.equal(contactEmail({ VITE_CONTACT_EMAIL: " hello@bondus.tech " }), "hello@bondus.tech");
  assert.equal(contactEmail({ VITE_CONTACT_EMAIL: "not an email" }), "");
  assert.equal(contactEmail({ VITE_CONTACT_EMAIL: "a@b" }), "");
});

test("numbers: Khmer digits, thousands separators, and an eased count-up that ends exactly on 1", () => {
  assert.equal(toKhmerDigits("1,000+"), "១,០០០+");
  assert.equal(formatCount(1000, "en"), "1,000");
  assert.equal(formatCount(1000, "km"), "១,០០០");
  assert.equal(countProgress(0, 1000), 0);
  assert.equal(countProgress(1000, 1000), 1);
  assert.equal(countProgress(5000, 1000), 1);
  assert.ok(countProgress(500, 1000) > 0.5, "eases out");
  assert.equal(countProgress(10, 0), 1);
});

test("English and Khmer have the same keys, Khmer letters, and the same {placeholders}", () => {
  const en = LANDING_STRINGS.en, km = LANDING_STRINGS.km;
  assert.deepEqual(Object.keys(en).filter((k) => !(k in km)), [], "keys with no Khmer");
  assert.deepEqual(Object.keys(km).filter((k) => !(k in en)), [], "Khmer keys with no English");
  assert.deepEqual(Object.entries(km).filter(([, v]) => !KHMER.test(v)).map(([k]) => k), [], "Khmer lines with no Khmer letters");
  assert.deepEqual(Object.keys(en).filter((k) => JSON.stringify(placeholders(en[k])) !== JSON.stringify(placeholders(km[k]))), []);
  for (const lang of ["en", "km"]) for (const [k, v] of Object.entries(LANDING_STRINGS[lang])) assert.equal(v, v.trim(), `${lang}.${k} has stray whitespace`);
});

test("landingText falls back to English, and fillLanding fills placeholders", () => {
  assert.equal(landingText("fr", "navFaq"), "FAQ");
  assert.equal(landingText("km", "noSuchKey"), "noSuchKey");
  assert.equal(fillLanding(landingText("en", "footCopy"), { year: 2026 }), "© 2026 BONDUS. All rights reserved.");
});

test("the FAQ numbers match the plans page", () => {
  const faq = LANDING_STRINGS.en.faq2A;
  for (const piece of ["5 AI questions a day", "$2.99", "60 AI questions", "10 photo or PDF uploads", "$5.99", "150 AI questions", "40 uploads"]) assert.ok(faq.includes(piece), piece);
});

test("Welcome keeps its top fold and adds the sections below it", () => {
  const app = read("./App.jsx");
  const welcome = app.slice(app.indexOf("function Welcome("), app.indexOf("function GoogleSignInButton"));
  for (const keep of ["HeroScene", "welcomeHeading", "welcomeBrand", "welcomeSubtitle", "onCreate", "onLogin", "SubjectRibbon"]) assert.ok(welcome.includes(keep), `Welcome lost ${keep}`);
  for (const add of ["<LandingNav", "<ScrollCue", "<LandingBody", "useLandingScroll()", "LANDING_CSS", "PRACTICE_QUESTION_COUNT", "universities={UNIS}"]) assert.ok(welcome.includes(add), `Welcome is missing ${add}`);
  assert.ok(welcome.indexOf("<ScrollCue") < welcome.indexOf("<SubjectRibbon"), "the cue sits above the ribbon");
  assert.ok(welcome.indexOf("<SubjectRibbon") < welcome.indexOf("<LandingBody"), "the ribbon ends the fold");
  assert.ok(!/overflow-hidden/.test(welcome.slice(0, welcome.indexOf("<LandingNav"))), "overflow:hidden on the root would break the sticky bar");
});

test("the stat uses the real question bank, never a made-up round number", () => {
  const app = read("./App.jsx");
  assert.ok(app.includes("const PRACTICE_QUESTION_COUNT = Object.values(RAW_EXERCISES).flat().length"));
  for (const f of ["./Landing.jsx", "./landingStrings.js"]) assert.ok(!/10,000|១០,០០០/.test(read(f)), `${f} claims 10,000`);
});

test("smooth scrolling only for people who haven't asked for less motion, and every animation has a reduced-motion twin", () => {
  const css = read("./landingStyles.js");
  assert.match(css, /@media \(prefers-reduced-motion: no-preference\)\{ html\.eai-lp-scroll\{ scroll-behavior:smooth; \} \}/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)\{[\s\S]*\.eai-lpcue svg\{ animation:none; \}[\s\S]*\.eai-reveal\{ opacity:1; transform:none; transition:none; \}/);
  const land = read("./Landing.jsx");
  assert.match(land, /useInView[\s\S]*typeof IntersectionObserver === "undefined"/, "reveals show at once without IntersectionObserver");
  assert.ok(land.includes("prefers-reduced-motion: reduce"));
});

test("the footer links to the legal pages that exist, and socials/email come from settings", () => {
  const land = read("./Landing.jsx");
  assert.ok(land.includes('href="/privacy.html"') && land.includes('href="/terms.html"'));
  assert.ok(fs.existsSync(new URL("../public/privacy.html", import.meta.url)) && fs.existsSync(new URL("../public/terms.html", import.meta.url)));
  assert.ok(land.includes("socialLinks(env)") && land.includes("contactEmail(env)"));
  const example = read("../.env.example");
  for (const key of ["VITE_SOCIAL_FACEBOOK", "VITE_SOCIAL_TELEGRAM", "VITE_SOCIAL_TIKTOK", "VITE_SOCIAL_YOUTUBE", "VITE_CONTACT_EMAIL"]) assert.ok(example.includes(key), `.env.example lacks ${key}`);
});

test("the demo screens are labelled as samples", () => {
  assert.ok(LANDING_STRINGS.en.previewNote.toLowerCase().includes("sample"));
  assert.ok(LANDING_STRINGS.en.demoSchTag === "Sample");
});
