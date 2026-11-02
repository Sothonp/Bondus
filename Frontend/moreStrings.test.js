/* The words in moreStrings.js: both languages have every key, every Khmer line has Khmer letters in it, and a line has the
   same {placeholders} in both languages (a Khmer line that dropped {name} would show the student a blank).
   Run with:  node --test Frontend/moreStrings.test.js */
import { test } from "node:test";
import assert from "node:assert/strict";
import { MORE_STRINGS, moreText, fillText } from "./moreStrings.js";

const KHMER = /[ក-៿]/;
const placeholders = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

test("English and Khmer have exactly the same keys", () => {
  const en = Object.keys(MORE_STRINGS.en);
  const km = Object.keys(MORE_STRINGS.km);
  assert.deepEqual(en.filter((k) => !(k in MORE_STRINGS.km)), [], "keys with no Khmer");
  assert.deepEqual(km.filter((k) => !(k in MORE_STRINGS.en)), [], "Khmer keys with no English");
});

test("every Khmer line has Khmer letters in it (an untranslated copy of the English would not)", () => {
  const bare = Object.entries(MORE_STRINGS.km).filter(([, v]) => !KHMER.test(v)).map(([k]) => k);
  assert.deepEqual(bare, []);
});

test("a line has the same {placeholders} in both languages", () => {
  const off = Object.keys(MORE_STRINGS.en).filter((k) => JSON.stringify(placeholders(MORE_STRINGS.en[k])) !== JSON.stringify(placeholders(MORE_STRINGS.km[k])));
  assert.deepEqual(off, []);
});

test("no line is empty, and none has stray whitespace at its ends", () => {
  for (const lang of ["en", "km"]) {
    for (const [k, v] of Object.entries(MORE_STRINGS[lang])) {
      assert.ok(v.length > 0, `${lang}.${k} is empty`);
      // These two keep a space on purpose: the text read follows "Khmer OCR: ", and the Khmer unit follows its number.
      if (!["coachKhmerOcr", "sigHoursUnit"].includes(k)) assert.equal(v, v.trim(), `${lang}.${k} has stray whitespace`);
    }
  }
});

test("moreText gives the Khmer line, and English for a language or key it has none for", () => {
  assert.equal(moreText("km", "navClose"), MORE_STRINGS.km.navClose);
  assert.equal(moreText("en", "navClose"), "Close");
  assert.equal(moreText("fr", "navClose"), "Close");
  assert.equal(moreText("km", "noSuchKey"), undefined);
});

test("fillText fills every {placeholder}, each one wherever it appears, and leaves text without any alone", () => {
  assert.equal(fillText("Hi {name}, {name}!", { name: "Sok" }), "Hi Sok, Sok!");
  assert.equal(fillText("{n}-day streak", { n: "៣" }), "៣-day streak");
  assert.equal(fillText("Close"), "Close");
  assert.equal(fillText("Level {level}", { level: 0 }), "Level 0");
});

test("the Khmer lines that carry a number take it as a {placeholder}, so the screen can pass Khmer numerals in", () => {
  assert.match(MORE_STRINGS.km.streakDays, /\{n\}/);
  assert.match(MORE_STRINGS.km.toastLevelUp, /\{level\}/);
  assert.match(MORE_STRINGS.km.coachMaxPhotos, /\{n\}/);
  assert.match(MORE_STRINGS.km.sigConsistencyValue, /\{n\}/);
});
