/* React side of timed exam attempts: one store per signed-in student, the running attempt, and a clock that only ticks
   while an attempt is running. The rules live in examSessions.js. */
import { useCallback, useEffect, useMemo, useState } from "react";
import { createLocalExamStore, expiresAt } from "./examSessions.js";

function browserStorage() {
  try {
    const s = window.localStorage;
    s.setItem("__bondus_probe", "1"); s.removeItem("__bondus_probe");
    return s;
  } catch {
    const m = new Map(); // private windows or blocked storage: this visit still works, it just is not kept
    return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
  }
}

/* userKey: who the attempts belong to (changes when another student signs in on this device).
   limitFor(field, subject): the paper's official minutes. */
export function useExamSessions({ userKey, limitFor }) {
  const store = useMemo(() => createLocalExamStore({ storage: browserStorage(), key: `bondus_exam_v1:${userKey}`, limitFor }), [userKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const read = useCallback(() => ({ current: store.current(), history: store.history(), school: store.school() }), [store]);
  const [snap, setSnap] = useState(read);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => { setSnap(read()); }, [read]);

  const refresh = useCallback(() => { setNow(Date.now()); setSnap(read()); }, [read]);

  // Tick once a second while an attempt runs; when its time (plus the grace) is up the store closes it and we re-read.
  const runningId = snap.current?.id;
  const closeAt = snap.current ? expiresAt(snap.current) : null;
  useEffect(() => {
    if (!runningId) return undefined;
    const tick = () => { const t = Date.now(); setNow(t); if (closeAt != null && t >= closeAt) setSnap(read()); };
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [runningId, closeAt, read]);

  // Each action returns the store's answer ({ ok } or { error }) and refreshes what the screens show.
  const act = useCallback((fn) => (...args) => { const res = fn(...args); refresh(); return res; }, [refresh]);

  return useMemo(() => ({
    now, current: snap.current, history: snap.history, school: snap.school,
    start: act(store.start), addPhoto: act(store.addPhoto), removePhoto: act(store.removePhoto), submit: act(store.submit), cancel: act(store.cancel),
    schoolForCode: store.schoolForCode, joinSchool: act(store.joinSchool), leaveSchool: act(store.leaveSchool),
    report: store.report, loadSample: act(store.loadSample), clearSample: act(store.clearSample),
  }), [now, snap, store, act]);
}
