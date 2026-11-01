/* Rules for the streak flame: which state it is in, and how urgent a dormant one looks.
   Run with:  node --test Frontend/streakFlame.test.js */
import { test } from "node:test";
import assert from "node:assert/strict";
import { flameState, flameUrgency, hoursLeftToday, countdownText, flameLabel, FLAME_STRINGS } from "./streakFlame.js";

test("no streak and nothing studied is cold", () => {
  assert.equal(flameState({ streak: 0, studiedToday: false }), "cold");
});

test("a streak that has not been fed today is dormant", () => {
  assert.equal(flameState({ streak: 12, studiedToday: false }), "dormant");
});

test("studying today lights the flame, even before the streak count catches up", () => {
  assert.equal(flameState({ streak: 12, studiedToday: true }), "lit");
  assert.equal(flameState({ streak: 0, studiedToday: true }), "lit");
});

test("hours left are counted to midnight in Phnom Penh (UTC+7), whatever the device clock says", () => {
  assert.equal(hoursLeftToday(Date.parse("2026-11-01T11:00:00Z")), 6);      // 18:00 in Phnom Penh
  assert.equal(hoursLeftToday(Date.parse("2026-11-01T15:00:00Z")), 2);      // 22:00
  assert.equal(hoursLeftToday(Date.parse("2026-11-01T01:30:00Z")), 15.5);   // 08:30
  assert.ok(Math.abs(hoursLeftToday(Date.parse("2026-11-01T16:59:00Z")) - 1 / 60) < 1e-9); // 23:59
  assert.equal(hoursLeftToday(Date.parse("2026-11-01T17:00:00Z")), 24);     // exactly midnight: a new day
});

test("only a dormant flame is ever urgent, and it escalates in the last 6 and 3 hours", () => {
  assert.equal(flameUrgency("lit", 1), "none");
  assert.equal(flameUrgency("cold", 1), "none");
  assert.equal(flameUrgency("dormant", 12), "label");
  assert.equal(flameUrgency("dormant", 6.01), "label");
  assert.equal(flameUrgency("dormant", 6), "countdown");
  assert.equal(flameUrgency("dormant", 3.01), "countdown");
  assert.equal(flameUrgency("dormant", 3), "ring");
  assert.equal(flameUrgency("dormant", 0.2), "ring");
});

test("the countdown reads in hours and minutes, and in Khmer", () => {
  assert.equal(countdownText(5 + 10 / 60), "Ends in 5h 10m");
  assert.equal(countdownText(0.5), "Ends in 30m");
  assert.equal(countdownText(2, "km"), "នៅសល់ 2 ម៉ោង 0 នាទី");
});

test("the label says the state in words, so colour never carries it alone", () => {
  assert.equal(flameLabel("lit", "none", 5, "en"), "Lit today");
  assert.equal(flameLabel("cold", "none", 5, "en"), "Start your streak");
  assert.equal(flameLabel("dormant", "label", 12, "en"), "Not lit yet today");
  assert.equal(flameLabel("dormant", "countdown", 5, "en"), "Ends in 5h 0m");
  assert.equal(flameLabel("dormant", "label", 12, "km"), FLAME_STRINGS.km.dormant);
  assert.equal(flameLabel("lit", "none", 12, "fr"), "Lit today"); // unknown language falls back to English
});
