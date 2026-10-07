/* Where Tab should go inside the reward pop-up (Frontend/rewards/focusTrap.js): wrap at the ends, and pull focus back in
   when it has fallen out of the dialog. Run with:  node --test Frontend/rewards/focusTrap.test.js */
import { test } from "node:test";
import assert from "node:assert/strict";
import { trapTarget } from "./focusTrap.js";

const items = ["close", "equip", "wardrobe", "continue"];

test("Tab from the last control wraps to the first; Shift+Tab from the first wraps to the last", () => {
  assert.equal(trapTarget(items, "continue", false), "close");
  assert.equal(trapTarget(items, "close", true), "continue");
});
test("Tab and Shift+Tab in the middle are left to the browser", () => {
  assert.equal(trapTarget(items, "equip", false), null);
  assert.equal(trapTarget(items, "wardrobe", true), null);
});
test("focus that fell out of the dialog (onto <body> once the focused button was disabled) is pulled back in: first on Tab, last on Shift+Tab", () => {
  assert.equal(trapTarget(items, "body", false), "close");
  assert.equal(trapTarget(items, "body", true), "continue");
  assert.equal(trapTarget(items, null, false), "close");
});
test("no focusable controls: nothing to trap", () => {
  assert.equal(trapTarget([], "body", false), null);
});
