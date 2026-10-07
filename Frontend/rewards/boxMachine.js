/* The treasure box's state machine — pure, so what a click does can be tested without a browser (boxMachine.test.js).

     claimed  the set's reward was collected before this visit: no chest is shown, and nothing can reopen it
     idle     the chest waits to be clicked
     opening  clicked: the claim has run, the opening animation plays
     opened   the animation is done and the pop-up is open (modalOpen); it can be closed and reopened as a recap

   The phase a box starts in is decided once, when it mounts. Only a click on an idle chest starts opening, so a second
   click (a double-click, say) changes nothing — and a student who leaves without clicking has claimed nothing. */

export const initialBox = (claimedOnMount) => ({ phase: claimedOnMount ? "claimed" : "idle", modalOpen: false });

export function boxReducer(state, action) {
  switch (action.type) {
    case "click": return state.phase === "idle" ? { ...state, phase: "opening" } : state;
    case "opened": return state.phase === "opening" ? { phase: "opened", modalOpen: true } : state;
    case "reopen": return state.phase === "opened" && !state.modalOpen ? { ...state, modalOpen: true } : state;
    case "close": return state.modalOpen ? { ...state, modalOpen: false } : state;
    default: return state;
  }
}
