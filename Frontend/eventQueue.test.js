/* Tests for the study-event outbox (Frontend/eventQueue.js).
   Run with:  node --test Frontend/eventQueue.test.js */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createEventQueue } from "./eventQueue.js";

const memoryStorage = () => { const m = new Map(); return { m, getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };
const fail = (status) => Object.assign(new Error(`status ${status}`), { status });

function setup(sendImpl, storage = memoryStorage()) {
  const sent = [], applied = [], dropped = [];
  const queue = createEventQueue({
    send: async (ev) => { const r = await sendImpl(ev, sent.length); sent.push(ev); return r; },
    storage, onApplied: (ev, res) => applied.push([ev, res]), onDropped: (ev, err) => dropped.push([ev, err.status]),
  });
  queue.setUser(1);
  return { queue, sent, applied, dropped, storage };
}

test("events are sent in order and reported with the server's answer", async () => {
  const { queue, sent, applied } = setup(async (ev) => ({ summary: { xp: ev.n } }));
  queue.push({ n: 1 }); queue.push({ n: 2 }); await queue.push({ n: 3 });
  assert.deepEqual(sent.map((e) => e.n), [1, 2, 3]);
  assert.deepEqual(applied.map(([, r]) => r.summary.xp), [1, 2, 3]);
  assert.equal(queue.size(), 0);
});

test("a failed send keeps the event, later sends it once, and keeps the order", async () => {
  let offline = true;
  const { queue, sent } = setup(async () => { if (offline) throw fail(0); return {}; });
  await queue.push({ n: 1 }); await queue.push({ n: 2 });
  assert.equal(queue.size(), 2);
  assert.equal(sent.length, 0);
  offline = false;
  await queue.flush();
  assert.deepEqual(sent.map((e) => e.n), [1, 2]);
  assert.equal(queue.size(), 0);
});

test("rate limits, server errors, timeouts and an expired login are all kept for later", async () => {
  for (const status of [0, 401, 408, 429, 500, 503]) {
    const { queue, dropped } = setup(async () => { throw fail(status); });
    await queue.push({ n: 1 });
    assert.equal(queue.size(), 1, `status ${status} should keep the event`);
    assert.equal(dropped.length, 0);
  }
});

test("an event the server rejects for good (422) is dropped and the next one still goes", async () => {
  const { queue, sent, dropped } = setup(async (ev) => { if (ev.n === 1) throw fail(422); return {}; });
  await queue.push({ n: 1 });
  await queue.push({ n: 2 });
  assert.deepEqual(dropped.map(([e, s]) => [e.n, s]), [[1, 422]]);
  assert.deepEqual(sent.map((e) => e.n), [2]);
  assert.equal(queue.size(), 0);
});

test("unsent events survive a page reload, and belong to their own student", async () => {
  const storage = memoryStorage();
  const a = setup(async () => { throw fail(0); }, storage);
  await a.queue.push({ n: 1 });
  assert.ok(storage.getItem("bondus_events_1"));

  const b = createEventQueue({ send: async () => ({}), storage });
  b.setUser(2);
  assert.equal(b.size(), 0);                    // another student sees nothing
  b.setUser(1);
  assert.equal(b.size(), 1);                    // the right student gets theirs back
  await b.flush();
  assert.equal(b.size(), 0);
  assert.equal(storage.getItem("bondus_events_1"), null);
});

test("nothing is queued or sent while signed out", async () => {
  const { queue, sent } = setup(async () => ({}));
  queue.setUser(null);
  await queue.push({ n: 1 });
  assert.equal(queue.size(), 0);
  assert.equal(sent.length, 0);
});

test("two flushes at once never send the same event twice", async () => {
  let release;
  const gate = new Promise((r) => { release = r; });
  const { queue, sent } = setup(async () => { await gate; return {}; });
  const p1 = queue.push({ n: 1 });
  const p2 = queue.flush();
  release();
  await Promise.all([p1, p2]);
  assert.deepEqual(sent.map((e) => e.n), [1]);
});

test("an event pushed while another is being sent still goes out", async () => {
  let release;
  const gate = new Promise((r) => { release = r; });
  const { queue, sent } = setup(async (ev) => { if (ev.n === 1) await gate; return {}; });
  const first = queue.push({ n: 1 });
  queue.push({ n: 2 });
  release();
  await first;
  await queue.flush();
  assert.deepEqual(sent.map((e) => e.n), [1, 2]);
});

test("the queue is capped so a long offline spell cannot grow forever", async () => {
  const { queue } = setup(async () => { throw fail(0); });
  for (let i = 0; i < 250; i++) await queue.push({ n: i });
  assert.equal(queue.size(), 200);
});

test("broken storage does not break sending", async () => {
  const broken = { getItem() { throw new Error("x"); }, setItem() { throw new Error("x"); }, removeItem() { throw new Error("x"); } };
  const { queue, sent } = setup(async () => ({}), broken);
  await queue.push({ n: 1 });
  assert.equal(sent.length, 1);
});
