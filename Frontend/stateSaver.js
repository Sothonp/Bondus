/* Debounced saving of the student's progress to PUT /me/state — tested in stateSaver.test.js.

   schedule(state) waits `delayMs` after the LAST change and then saves the newest state once (a student answering
   questions quickly makes many changes but only one request). The server numbers every save (`revision`) and refuses a
   save made from an old number with 409 stale_state; that means another device saved in between. Progress only ever
   grows (attempts are added, never removed), so this saver is last-writer-wins: it takes the server's current number
   and writes its own state on top, instead of asking the student to resolve anything.

   Failures: no connection / server trouble -> the state is kept and retried after `retryMs`; a save the server will
   never accept (too large, invalid) is dropped and reported through onError so it cannot loop forever. */

const RETRY_LATER = (status) => status === 0 || status === 401 || status === 408 || status === 429 || status >= 500;
const MAX_STALE_RETRIES = 3;

// The defaults are wrapped, not passed bare: a browser refuses setTimeout when it is called as a method of `timers`.
export function createStateSaver({ api, delayMs = 1500, retryMs = 10000, timers = { set: (fn, ms) => setTimeout(fn, ms), clear: (id) => clearTimeout(id) }, onError = () => {} }) {
  let revision = 0;
  let pending = null;   // newest state not yet saved
  let timer = null;
  let running = null;

  const clearTimer = () => { if (timer) { timers.clear(timer); timer = null; } };
  const arm = (ms) => { clearTimer(); timer = timers.set(() => { timer = null; flush(); }, ms); };

  async function drain() {
    let stale = 0;
    while (pending) {
      const state = pending;
      pending = null;
      try {
        const res = await api.putState(state, revision);
        revision = res.revision;
        stale = 0;
      } catch (err) {
        if (err?.code === "stale_state" && stale < MAX_STALE_RETRIES) {
          stale += 1;
          try {
            revision = Number.isFinite(err.body?.revision) ? err.body.revision : (await api.getState()).revision;
          } catch {
            if (!pending) pending = state;        // could not even ask the server: try the whole save again later
            arm(retryMs);
            return;
          }
          if (!pending) pending = state;          // write ours on top of the newer revision
          continue;
        }
        if (RETRY_LATER(err?.status ?? 0)) {
          if (!pending) pending = state;          // keep the data and try again later
          arm(retryMs);
          return;
        }
        onError(err);                              // will never succeed: drop it
        return;
      }
    }
  }

  function flush() {
    clearTimer();
    if (!running) running = drain().finally(() => { running = null; if (pending && !timer) arm(delayMs); });
    return running;
  }

  return {
    setRevision(r) { revision = Number.isFinite(r) ? r : 0; },
    getRevision: () => revision,
    hasPending: () => pending !== null || running !== null,
    schedule(state) { pending = state; if (!running) arm(delayMs); },
    flush,                                         // save right now (used when the tab is hidden)
    cancel() { pending = null; clearTimer(); },    // sign-out: forget unsaved state
  };
}
