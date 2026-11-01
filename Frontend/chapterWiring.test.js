/* Guards on how the chapter path is wired into Practice. App.jsx is read as text because the app has no DOM test harness;
   the rules are tested in chapterProgress.test.js, and the list was rendered to markup in English and Khmer by hand.
   Run with:  node --test Frontend/chapterWiring.test.js */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CHAPTER_STRINGS } from "./chapterStrings.js";

const read = (name) => readFileSync(new URL(`./${name}`, import.meta.url), "utf8");
const app = read("App.jsx");
const list = read("ChapterList.jsx");
const rules = read("chapterProgress.js");
const strip = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const subject = app.slice(app.indexOf("function PracticeSubject("), app.indexOf("function PracticeSubject(") + 6500);

test("Practice shows the chapter path and decides the open chapter from the practice record", () => {
  assert.match(app, /import ChapterList from "\.\/ChapterList\.jsx";/);
  assert.match(app, /import \{ chapterStates \} from "\.\/chapterProgress\.js";/);
  assert.match(subject, /const chapterRows = hasChapters \? chapterStates\(fullList, practice\) : \[\];/);
  assert.match(subject, /<ChapterList rows=\{chapterRows\} labelOf=\{chapterLabel\} lang=\{lang\} localize=\{localizeNum\} onOpen=\{setChapter\} \/>/);
});

test("the chapter order rule lives in one place, not copied into the screen", () => {
  assert.doesNotMatch(subject, /chapterRank|chapterKeys/);
  assert.match(rules, /export function chapterKeys\(list\)/);
});

test("a locked chapter is never opened, even when it was remembered or tapped", () => {
  assert.match(subject, /const chapter = pickedChapter != null && chapterRows\.some\(\(r\) => r\.key === pickedChapter && r\.state !== "locked"\) \? pickedChapter : null;/);
});

test("subjects without chapters keep their flat list", () => {
  assert.match(subject, /const hasChapters = fullList\.some\(\(ex\) => ex\.chapter\);/);
  assert.match(subject, /: fullList;/);
});

test("the pass and master scores come from one config, used by the rules, the list and the grade estimate", () => {
  assert.match(rules, /from "\.\/progressionConfig\.js"/);
  assert.match(list, /from "\.\/progressionConfig\.js"/);
  assert.match(app, /if \(avg >= MASTER_PERCENT\) return "A";/);
  for (const [name, src] of [["chapterProgress.js", rules], ["ChapterList.jsx", list]]) {
    assert.doesNotMatch(strip(src), /(?<![\d.])(70|85)(?![\d.])/, `${name} must not hard-code the pass or master score`);
  }
});

test("a lock is grey, never the ember red, and the state is always said in words", () => {
  assert.doesNotMatch(strip(list), /--ember/);
  assert.match(list, /locked: \{ icon: Lock, color: "var\(--muted\)"/);
  for (const state of ["locked", "available", "inProgress", "passed", "mastered"]) assert.match(list, new RegExp(`${state}: \\{ icon:`));
  assert.match(list, /\{w\(look\.label\)\}/);
});

test("a locked chapter opens a labelled dialog that can be closed with Escape, and never a dead tap", () => {
  assert.match(list, /role="dialog"/);
  assert.match(list, /aria-modal="true"/);
  assert.match(list, /aria-labelledby="chapter-sheet-title"/);
  assert.match(list, /e\.key === "Escape"/);
  assert.match(list, /if \(row\.state !== "locked"\) \{ onOpen\(row\.key\); return; \}/);
});

test("the sheet sends the student to an open chapter, never to another locked one", () => {
  assert.match(list, /while \(j > 0 && rows\[j\]\.state === "locked"\) j--;/);
  assert.match(list, /onOpen\(target\.key\)/);
});

test("every word the list asks for exists in English and Khmer", () => {
  const en = Object.keys(CHAPTER_STRINGS.en), km = Object.keys(CHAPTER_STRINGS.km);
  assert.deepEqual([...km].sort(), [...en].sort());
  const used = new Set([...list.matchAll(/\bw\(\s*"(\w+)"/g)].map((m) => m[1]));
  for (const label of list.matchAll(/label: "(\w+)"/g)) used.add(label[1]); // the state names, looked up through LOOK
  assert.ok(used.size >= 15, "found the keys the list uses");
  for (const key of used) assert.ok(en.includes(key), `"${key}" is used by the list but not defined`);
  for (const lang of ["en", "km"]) for (const [k, v] of Object.entries(CHAPTER_STRINGS[lang])) {
    assert.ok(String(v).trim(), `${lang}.${k} is empty`);
    for (const [, name] of String(v).matchAll(/\{(\w+)\}/g)) assert.ok(["name", "pass", "master", "n", "solved", "total"].includes(name), `unknown placeholder {${name}}`);
  }
});
