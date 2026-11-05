/* The topic score and the percentages. Run with:  node --test Frontend/masteryScore.test.js */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { computeTopicScore, topicScoreOf, percent } from "./masteryScore.js";

const a = (correct, difficulty = "Easy") => ({ correct, difficulty, timeSec: 20, ts: 1 });

test("the score is the same as before for ordinary answers", () => {
  assert.equal(computeTopicScore([]), null);
  assert.equal(computeTopicScore([a(true)]), Math.round(100 * 0.7 + 50 * 0.2 + 67 * 0.1));
  assert.equal(computeTopicScore([a(true, "Hard"), a(false, "Hard")]), Math.round(50 * 0.7 + ((100 + 20) / 2) * 0.2 + 33 * 0.1));
});

test("a score is always from 0 to 100, whatever the answers look like", () => {
  const histories = [
    [a(true, "Hard"), a(true, "Hard"), a(true, "Hard"), a(true, "Hard"), a(true, "Hard"), a(true, "Hard")],
    [a(false, "Hard"), a(false, "Hard"), a(false, "Hard")],
    [{ correct: true }, a(false, "Beginner"), a(true, "constructor"), a(true, "__proto__"), { correct: 1 }],
    [null, undefined, "x", 5, a(true)],
  ];
  for (const h of histories) {
    const score = computeTopicScore(h);
    assert.ok(Number.isInteger(score) && score >= 0 && score <= 100, `score ${score}`);
  }
});

test("an exercise with no difficulty counts as Medium instead of making the score NaN", () => {
  const medium = computeTopicScore([a(true, "Medium")]);
  assert.equal(computeTopicScore([{ correct: true }]), medium);
  for (const odd of ["Nonsense", "constructor", "toString", "__proto__", 7, null]) assert.equal(computeTopicScore([a(true, odd)]), medium, String(odd));
});

test("a record's score comes from its history, not from the number saved with it", () => {
  const history = [a(true), a(false)];
  const honest = computeTopicScore(history);
  assert.equal(topicScoreOf({ history, score: honest }), honest);
  assert.equal(topicScoreOf({ history, score: 468000 }), honest, "a bad saved score is ignored");
  assert.equal(topicScoreOf({ history, score: "75" }), honest, "a text score is ignored");
  assert.equal(topicScoreOf({ history, score: NaN }), honest);
});

test("a record with no history falls back to its saved score, as a number from 0 to 100", () => {
  assert.equal(topicScoreOf({ score: 62 }), 62);
  assert.equal(topicScoreOf({ score: "62" }), 62, "text is read as a number, never joined onto other scores");
  assert.equal(topicScoreOf({ score: 9999 }), 100);
  assert.equal(topicScoreOf({ score: -5 }), 0);
  assert.equal(topicScoreOf({ history: [], score: null }), null);
  for (const bad of [undefined, null, "", "abc", NaN, {}]) assert.equal(topicScoreOf({ score: bad }), null, `${String(bad)}`);
  assert.equal(topicScoreOf(null), null);
  assert.equal(topicScoreOf(undefined), null);
  assert.equal(topicScoreOf("x"), null);
});

test("percent is a whole number from 0 to 100, and 0 for anything that is not a number", () => {
  assert.equal(percent(46768), 100);
  assert.equal(percent(23405.4), 100);
  assert.equal(percent(-3), 0);
  assert.equal(percent(55.6), 56);
  assert.equal(percent("40"), 40);
  for (const bad of [NaN, Infinity, undefined, null, "", "abc"]) assert.equal(percent(bad), 0, `${String(bad)}`);
});

test("the Progress screen reads every topic score through topicScoreOf and bounds the readiness figures", () => {
  const app = readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  assert.equal((app.match(/score: topicScoreOf\(rec\)/g) || []).length, 2, "BAC II and university insights");
  assert.doesNotMatch(app, /score: rec\?\.score \?\? null/);
  assert.match(app, /const readiness = \{ overall: percent\(/);
  assert.match(app, /mastery: percent\(avg \?\? 0\), coverage: percent\(coverage\), consistency: percent\(consistency\), speed: percent\(speed\)/);
});
