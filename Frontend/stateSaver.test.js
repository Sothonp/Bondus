/* Tests for the debounced progress saver (Frontend/stateSaver.js), with fake timers and a fake API.
   Run with:  node --test Frontend/stateSaver.test.js */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createStateSaver } from "./stateSaver.js";

const fail = (status, code, body = null) => Object.assign(new Error(code ?? `status ${status}`), { status, code, body });

/* Timers you advance by hand: tick() fires every scheduled callback. */
function fakeTimers() {
  let next = 1; const jobs = new Map();
  return {
    set: (fn, ms) => { jobs.set(next, { fn, ms }); return next++; },
    clear: (id) => jobs.delete(id),
    pending: () => [...jobs.values()].map((j) => j.ms),
    tick: async () => { const due = [...jobs.entries()]; jobs.clear(); for (const [, j] of due) j.fn(); await new Promise((r) => setTimeout(r, 0)); },
  };
}

function setup(putImpl, getImpl = async () => ({ revision: 0 })) {
  const puts = [], errors = [], timers = fakeTimers();
  const api = {
    putState: async (state, base) => { puts.push({ state, base }); return putImpl(state, base, puts.length); },
    getState: getImpl,
  };
  const saver = createStateSaver({ api, delayMs: 1500, retryMs: 10000, timers, onError: (e) => errors.push(e) });
  return { saver, puts, errors, timers };
}

const settle = () => new Promise((r) => setTimeout(r, 5));

test("many quick changes make one request with the newest state, sent after the delay", async () => {
  const { saver, puts, timers } = setup(async (s, base, n) => ({ revision: n }));
  saver.schedule({ v: 1 }); saver.schedule({ v: 2 }); saver.schedule({ v: 3 });
  assert.equal(puts.length, 0);
  assert.deepEqual(timers.pending(), [1500]);
  await timers.tick(); await settle();
  assert.deepEqual(puts, [{ state: { v: 3 }, base: 0 }]);
  assert.equal(saver.getRevision(), 1);
});

test("each save uses the revision the server gave back last time", async () => {
  const { saver, puts, timers } = setup(async (s, base, n) => ({ revision: n * 10 }));
  saver.setRevision(5);
  saver.schedule({ v: 1 }); await timers.tick(); await settle();
  saver.schedule({ v: 2 }); await timers.tick(); await settle();
  assert.deepEqual(puts.map((p) => p.base), [5, 10]);
});

test("a conflict (another device saved) takes the server's revision and writes ours on top", async () => {
  const { saver, puts, timers } = setup(async (s, base, n) => {
    if (n === 1) throw fail(409, "stale_state", { code: "stale_state", revision: 9 });
    return { revision: base + 1 };
  });
  saver.schedule({ v: 1 }); await timers.tick(); await settle();
  assert.deepEqual(puts.map((p) => [p.state.v, p.base]), [[1, 0], [1, 9]]);
  assert.equal(saver.getRevision(), 10);
});

test("a conflict without a revision in the answer asks the server for it", async () => {
  const { saver, puts, timers } = setup(async (s, base, n) => { if (n === 1) throw fail(409, "stale_state", {}); return { revision: base + 1 }; }, async () => ({ revision: 4 }));
  saver.schedule({ v: 1 }); await timers.tick(); await settle();
  assert.deepEqual(puts.map((p) => p.base), [0, 4]);
});

test("a conflict that never clears gives up after a few tries instead of looping", async () => {
  const { saver, puts, timers, errors } = setup(async () => { throw fail(409, "stale_state", { revision: 1 }); });
  saver.schedule({ v: 1 }); await timers.tick(); await settle();
  assert.equal(puts.length, 4);                   // the first try plus three retries
  assert.equal(errors.length, 1);
});

test("with no connection the state is kept and retried later, then saved", async () => {
  let offline = true;
  const { saver, puts, timers } = setup(async (s, base, n) => { if (offline) throw fail(0, "network_error"); return { revision: 1 }; });
  saver.schedule({ v: 1 }); await timers.tick(); await settle();
  assert.equal(puts.length, 1);
  assert.deepEqual(timers.pending(), [10000]);    // retry armed
  offline = false;
  await timers.tick(); await settle();
  assert.equal(puts.length, 2);
  assert.deepEqual(puts[1].state, { v: 1 });
  assert.equal(saver.getRevision(), 1);
});

test("newer changes made while offline replace the old unsent state", async () => {
  let offline = true;
  const { saver, puts, timers } = setup(async () => { if (offline) throw fail(0, "network_error"); return { revision: 1 }; });
  saver.schedule({ v: 1 }); await timers.tick(); await settle();
  saver.schedule({ v: 2 });
  offline = false;
  await timers.tick(); await settle();
  assert.deepEqual(puts.at(-1).state, { v: 2 });
});

test("a save the server will never accept is dropped and reported, not retried forever", async () => {
  const { saver, puts, timers, errors } = setup(async () => { throw fail(413, "payload_too_large"); });
  saver.schedule({ v: 1 }); await timers.tick(); await settle();
  assert.equal(puts.length, 1);
  assert.equal(errors[0].code, "payload_too_large");
  assert.deepEqual(timers.pending(), []);
  assert.equal(saver.hasPending(), false);
});

test("a change made during a save is saved right after, with the new revision", async () => {
  let release; const gate = new Promise((r) => { release = r; });
  const { saver, puts, timers } = setup(async (s, base, n) => { if (n === 1) await gate; return { revision: n }; });
  saver.schedule({ v: 1 }); await timers.tick();
  saver.schedule({ v: 2 });                       // arrives while save 1 is in flight
  release(); await settle();
  assert.deepEqual(puts.map((p) => [p.state.v, p.base]), [[1, 0], [2, 1]]);
});

test("flush() saves immediately (used when the tab is hidden)", async () => {
  const { saver, puts, timers } = setup(async () => ({ revision: 1 }));
  saver.schedule({ v: 1 });
  await saver.flush();
  assert.equal(puts.length, 1);
  assert.deepEqual(timers.pending(), []);
});

test("cancel() forgets unsaved state (sign-out)", async () => {
  const { saver, puts, timers } = setup(async () => ({ revision: 1 }));
  saver.schedule({ v: 1 });
  saver.cancel();
  await timers.tick(); await settle();
  assert.equal(puts.length, 0);
  assert.equal(saver.hasPending(), false);
});
