/* The daily warm-up — pure functions, no React, tested in warmup.test.js.

   Once a day, before the dashboard, a student answers three quick multiple-choice questions. This file decides which
   three, remembers how far the student got (so closing the app halfway resumes at the same question), and decides
   whether the gate is needed at all. The three answers are recorded like any practice answer (mastery, XP, the study
   ledger); finishing also sends one `warmup` event, which is what lights the day on the server.

   The three questions are picked from what the student already works on:
     weak    the topic with the lowest score
     review  the topic practised longest ago (a spaced-review question)
     fresh   a topic the student has not been assessed on yet, or any other one
   Picking is seeded by user and day, so the same student gets the same three on every device that day. It is only done
   once: the chosen ids are saved with the progress, because answering changes the scores the picking reads. */

export const WARMUP_COUNT = 3;
export const WARMUP_SECONDS = 45;

/* 32-bit FNV-1a hash and a small seeded generator (mulberry32): the same text always gives the same numbers. */
export function seedFrom(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* A warm-up question is multiple choice with its answer among the options. */
export const isWarmupQuestion = (ex) => Array.isArray(ex?.options) && ex.options.length >= 2 && ex.options.includes(ex.answer);

/* `pool`: the student's exercises ({ id, subject, topic, difficulty, options, answer }).
   `mastery`: the topic-mastery store ({ [subject]: { [topic]: { score, lastPracticedAt } } }).
   Returns up to `count` of { id, slot } in the order they are asked; fewer when the pool is small, none when it is empty. */
export function pickWarmupQuestions({ pool, mastery = {}, seed, count = WARMUP_COUNT }) {
  const random = seededRandom(seedFrom(String(seed)));
  const usable = pool.filter(isWarmupQuestion);
  const topics = new Map();
  for (const ex of usable) {
    const key = `${ex.subject}\u0000${ex.topic}`;
    if (!topics.has(key)) topics.set(key, { key, subject: ex.subject, topic: ex.topic, questions: [] });
    topics.get(key).questions.push(ex);
  }
  const all = [...topics.values()].map((t) => {
    const rec = mastery?.[t.subject]?.[t.topic];
    return { ...t, score: rec?.score ?? null, last: rec?.lastPracticedAt ?? null };
  });
  const chosen = [];
  const usedIds = new Set();
  const usedTopics = new Set();
  const pickIn = (t) => {
    const left = t.questions.filter((q) => !usedIds.has(q.id));
    if (!left.length) return null;
    const easy = left.filter((q) => q.difficulty === "Easy" || q.difficulty === "Medium"); // a warm-up should be quick
    const from = easy.length ? easy : left;
    return from[Math.floor(random() * from.length)];
  };
  const take = (slot, candidates) => {
    for (const t of candidates) {
      const q = pickIn(t);
      if (q) { chosen.push({ id: q.id, slot }); usedIds.add(q.id); usedTopics.add(t.key); return true; }
    }
    return false;
  };
  const shuffled = (list) => list.map((t) => ({ t, r: random() })).sort((a, b) => a.r - b.r).map((x) => x.t);
  const free = () => all.filter((t) => !usedTopics.has(t.key));

  take("weak", [...free().filter((t) => t.score != null).sort((a, b) => a.score - b.score), ...shuffled(free())]);
  if (chosen.length < count) take("review", [...free().filter((t) => t.last != null).sort((a, b) => a.last - b.last), ...shuffled(free())]);
  if (chosen.length < count) take("fresh", [...shuffled(free().filter((t) => t.score == null)), ...shuffled(free())]);
  // A small pool (fewer topics than slots): top up with any unused question.
  const rest = shuffled(usable.filter((q) => !usedIds.has(q.id)));
  for (const q of rest) { if (chosen.length >= count) break; chosen.push({ id: q.id, slot: "fresh" }); usedIds.add(q.id); }
  return chosen.slice(0, count);
}

/* ── Progress ─────────────────────────────────────────────────────────────────────────────────────────────────────
   { day, slots: [{ id, slot }], answers: [{ id, correct }], doneAt: null | ms, before: { flame, streak } }  — one per
   student per day. `before` is how the flame and the streak count stood when the warm-up began: answering the first
   question already counts as studying, so the live numbers move under the screen, and the screen must keep showing the
   dormant flame until the last answer. */

export const newWarmup = (day, slots, before = null) => ({ day, slots, answers: [], doneAt: null, before });

export function recordWarmupAnswer(state, id, correct) {
  if (state.answers.some((a) => a.id === id)) return state;
  return { ...state, answers: [...state.answers, { id, correct: Boolean(correct) }] };
}
export const warmupAnswered = (state) => state.answers.length;
export const warmupFinished = (state) => state.slots.length > 0 && state.answers.length >= state.slots.length;
export const finishWarmup = (state, now = Date.now()) => (state.doneAt ? state : { ...state, doneAt: now });
export const warmupScore = (state) => ({ correct: state.answers.filter((a) => a.correct).length, total: state.slots.length });

/* The index of the question to show: the first one not answered yet (so a reopened app resumes in the right place). */
export const warmupCurrentIndex = (state) => Math.min(state.answers.length, Math.max(0, state.slots.length - 1));

const storageKey = (userKey) => `bondus.warmup.v1:${userKey}`;
const isState = (s) => s && typeof s.day === "string" && Array.isArray(s.slots) && Array.isArray(s.answers)
  && s.slots.every((x) => x && typeof x.id === "string") && s.answers.every((a) => a && typeof a.id === "string");

/* Saved progress for `day`, or null. Anything saved for another day is ignored (and overwritten by the next save). */
export function loadWarmup(storage, userKey, day) {
  try {
    const raw = storage?.getItem(storageKey(userKey));
    const state = raw ? JSON.parse(raw) : null;
    return isState(state) && state.day === day ? { ...state, doneAt: state.doneAt ?? null, before: state.before ?? null } : null;
  } catch { return null; }
}
export function saveWarmup(storage, userKey, state) {
  try { storage?.setItem(storageKey(userKey), JSON.stringify(state)); } catch { /* storage full or blocked: progress is simply not kept */ }
}

/* ── The gate ─────────────────────────────────────────────────────────────────────────────────────────────────────
   Must the student do the warm-up before the dashboard?
   eligible       a BAC II student (not an admin, not on the university track)
   hasQuestions   the pool has at least one usable question — otherwise there is nothing to ask, so never block
   state          this device's progress for today
   With the server, its summary has the last word on whether today's warm-up is done (`warmupDoneToday`: the warm-up, or
   the diagnostic, which counts as that day's warm-up). While the summary is still loading, or from an older backend that
   does not send the field, the gate stays open rather than flash a quiz or lock students out. Finishing on this device
   counts at once, even when the event has not reached the server yet. Without a server, a student who already studied
   today (the diagnostic included) is not interrupted, but one who has started the warm-up must finish it: their first
   answer already counts as studying, which must not close the gate halfway. */
export function needsWarmup({ eligible, hasQuestions, serverMode, summary, today, state, studiedToday }) {
  if (!eligible || !hasQuestions) return false;
  if (state?.day === today && state.doneAt) return false;
  if (serverMode) return summary?.warmupDoneToday === false;
  if (state?.day === today) return true; // started, not finished (a finished one returned above)
  return !studiedToday;
}
