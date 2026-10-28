/* A durable, ordered outbox for study events (answers, treasure boxes, the diagnostic) — tested in eventQueue.test.js.

   Every event is saved to storage first and then sent, one at a time and in order. If the network is down or the server
   has a hiccup, the event stays queued and flush() is simply called again later (the app does this on a timer, when the
   browser comes back online and after the next event). Events carry a unique attemptId, so a retry the server already
   received can never pay XP twice.

   What happens to a failed send:
     status 0 / 429 / 5xx / 401 / 408 -> keep it and stop for now (offline, rate-limited, server problem, or the login
                                          expired: the events wait for the next sign-in of the same student)
     any other 4xx                    -> it can never succeed (the server rejected it), so drop it and call onDropped
   Queues are stored per student (key + user id), so one student's events are never sent under another account. */

const MAX_QUEUE = 200;
const RETRY_LATER = (status) => status === 0 || status === 401 || status === 408 || status === 429 || status >= 500;

export function createEventQueue({ send, storage = null, keyPrefix = "bondus_events_", onApplied = () => {}, onDropped = () => {} }) {
  let userId = null;
  let events = [];
  let flushing = null;
  let flushAgain = false;

  const key = () => `${keyPrefix}${userId}`;
  const persist = () => {
    if (userId == null) return;
    try { events.length ? storage?.setItem(key(), JSON.stringify(events)) : storage?.removeItem(key()); } catch { /* storage full or blocked: the in-memory queue still works */ }
  };
  const restore = () => {
    try {
      const raw = storage?.getItem(key());
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list.filter((e) => e && typeof e === "object") : [];
    } catch { return []; }
  };

  async function run() {
    while (events.length && userId != null) {
      const event = events[0];
      let response;
      try {
        response = await send(event);
      } catch (err) {
        if (RETRY_LATER(err?.status ?? 0)) return;           // keep it, try again later
        events.shift(); persist(); onDropped(event, err);    // the server will never accept this one
        continue;
      }
      events.shift(); persist();
      onApplied(event, response);
    }
  }

  function flush() {
    if (flushing) { flushAgain = true; return flushing; }
    flushing = (async () => {
      try {
        do { flushAgain = false; await run(); } while (flushAgain);
      } finally { flushing = null; }
    })();
    return flushing;
  }

  return {
    /* Switch to a student's queue (or null when signed out). Whatever they left unsent last time is picked up. */
    setUser(id) { userId = id ?? null; events = userId == null ? [] : restore(); },
    push(event) {
      if (userId == null) return Promise.resolve();
      events.push(event);
      if (events.length > MAX_QUEUE) events.splice(0, events.length - MAX_QUEUE);
      persist();
      return flush();
    },
    flush: () => (userId == null ? Promise.resolve() : flush()),
    size: () => events.length,
  };
}
