/* The treasure box's state machine (Frontend/rewards/boxMachine.js): what a click, the end of the opening animation and
   closing the pop-up do. Run with:  node --test Frontend/rewards/boxMachine.test.js */
import { test } from "node:test";
import assert from "node:assert/strict";
import { initialBox, boxReducer } from "./boxMachine.js";

test("an unclaimed set starts idle with the pop-up closed (Review Focus 2)", () => assert.deepEqual(initialBox(false), { phase: "idle", modalOpen: false }));
test("a claimed set starts claimed and no action ever opens it", () => {
  let st = initialBox(true);
  for (const type of ["click", "opened", "reopen"]) assert.equal(boxReducer(st, { type }), st);
});
test("a click only starts opening from idle; a second click changes nothing (Review Focus 1)", () => {
  const opening = boxReducer(initialBox(false), { type: "click" });
  assert.equal(opening.phase, "opening");
  assert.equal(boxReducer(opening, { type: "click" }), opening);
});
test("the pop-up opens only when the opening animation ends, and can be closed and reopened", () => {
  const idle = initialBox(false);
  assert.equal(boxReducer(idle, { type: "opened" }), idle);
  const opened = boxReducer(boxReducer(idle, { type: "click" }), { type: "opened" });
  assert.deepEqual(opened, { phase: "opened", modalOpen: true });
  const closed = boxReducer(opened, { type: "close" }); assert.equal(closed.modalOpen, false);
  assert.equal(boxReducer(closed, { type: "reopen" }).modalOpen, true);
  assert.equal(boxReducer(idle, { type: "reopen" }), idle);
});
