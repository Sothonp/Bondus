/* Where Tab should go inside the reward pop-up, as a pure function so it can be tested without a browser.
   `items` are the dialog's focusable controls in order, `active` is whatever has focus now (it may not be one of them: when
   a focused button is disabled, e.g. "Equip now" once it has been used, browsers drop focus onto <body>).
   Returns the control to focus (the caller then calls preventDefault) or null to let the browser move focus as usual:
   - at the end of the list, Tab wraps to the first control and Shift+Tab at the start wraps to the last;
   - focus that is outside the dialog is pulled back in: to the first control on Tab, the last on Shift+Tab. */
export function trapTarget(items, active, shift) {
  if (items.length === 0) return null;
  const at = items.indexOf(active);
  if (at === -1) return shift ? items[items.length - 1] : items[0];
  if (shift && at === 0) return items[items.length - 1];
  if (!shift && at === items.length - 1) return items[0];
  return null;
}
