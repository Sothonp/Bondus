/* The daily warm-up — pure functions, no React, tested in warmup.test.js.

   Once a day, before the dashboard, a student answers up to three quick multiple-choice questions. It is a REVIEW: only
   questions the student has already done in Practice are ever asked, never new material. This file decides which
   three, remembers how far the student got (so closing the app halfway resumes at the same question), and decides
   whether the gate is needed at all. The answers are recorded like any practice answer (mastery, XP, the study
   ledger); finishing also sends one `warmup` event, which is what lights the day on the server.

   The questions are picked from the practised ones:
     weak     a question from the topic with the lowest score
     review   a question from the topic practised longest ago (spaced review)
     missed   a question the student last got wrong; when there is none, any other practised question ("again")
   Inside a topic, a question last answered wrong comes first, then the one done longest ago. A student who has not
   practised anything yet has nothing to review, so she gets easy starter questions instead (starterQuestions below).
   Picking is seeded by user and day, so the same student gets the same questions on every device that day. It is only
   done once: the chosen ids are saved with the progress, because answering changes the scores the picking reads. */

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

/* Has the student done this question in Practice? `rec` is its entry in the practice store ({ status, result, at }):
   answered (right or wrong), or ticked Completed. Opened or ticked In progress without an answer does not count. */
export const wasPractised = (rec) => Boolean(rec) && (rec.result === "correct" || rec.result === "incorrect" || rec.status === "completed");

/* The questions a warm-up may ask: every practised question that can be asked as multiple choice, in the given subjects
   (null = any). `practice` is the practice store; `lookup(id)` returns the question for an id, or null. */
export function practisedPool(practice, lookup, subjects = null) {
  return Object.keys(practice ?? {})
    .filter((id) => wasPractised(practice[id]))
    .map((id) => lookup(id))
    .filter((ex) => ex && isWarmupQuestion(ex) && (!subjects || subjects.has(ex.subject)));
}

/* `pool`: practised questions ({ id, subject, topic, options, answer }), see practisedPool.
   `mastery`: the topic-mastery store ({ [subject]: { [topic]: { score, lastPracticedAt } } }).
   `practice`: the practice store, for what each question last scored and when it was done.
   Returns up to `count` of { id, slot } in the order they are asked; fewer when the pool is small, none when it is empty. */
export function pickWarmupQuestions({ pool, mastery = {}, practice = {}, seed, count = WARMUP_COUNT }) {
  const random = seededRandom(seedFrom(String(seed)));
  const usable = pool.filter(isWarmupQuestion);
  const wrong = (q) => practice?.[q.id]?.result === "incorrect";
  // Wrong first, then done longest ago; the same ids always tie-break the same way for the same seed.
  const order = (a, b) => (wrong(b) - wrong(a)) || ((practice?.[a.id]?.at ?? 0) - (practice?.[b.id]?.at ?? 0))
    || (seedFrom(`${seed}|${a.id}`) - seedFrom(`${seed}|${b.id}`));
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
  const add = (q, slot, topicKey) => { chosen.push({ id: q.id, slot }); usedIds.add(q.id); if (topicKey) usedTopics.add(topicKey); };
  const take = (slot, candidates) => {
    for (const t of candidates) {
      const q = t.questions.filter((x) => !usedIds.has(x.id)).sort(order)[0];
      if (q) { add(q, slot, t.key); return true; }
    }
    return false;
  };
  const shuffled = (list) => list.map((t) => ({ t, r: random() })).sort((a, b) => a.r - b.r).map((x) => x.t);
  const free = () => all.filter((t) => !usedTopics.has(t.key));

  take("weak", [...free().filter((t) => t.score != null).sort((a, b) => a.score - b.score), ...shuffled(free())]);
  if (chosen.length < count) take("review", [...free().filter((t) => t.last != null).sort((a, b) => a.last - b.last), ...shuffled(free())]);
  if (chosen.length < count) {
    // A question last answered wrong, preferably from a topic not used yet; the most valuable thing to look at again.
    const missed = usable.filter((q) => wrong(q) && !usedIds.has(q.id));
    const fresh = missed.filter((q) => !usedTopics.has(`${q.subject}\u0000${q.topic}`));
    const pick = (fresh.length ? fresh : missed).sort(order)[0];
    if (pick) add(pick, "missed", `${pick.subject}\u0000${pick.topic}`);
  }
  // Nothing missed, or a small pool (fewer topics than slots): top up with any other practised question.
  const rest = usable.filter((q) => !usedIds.has(q.id)).sort(order);
  const fromNewTopics = rest.filter((q) => !usedTopics.has(`${q.subject}\u0000${q.topic}`));
  for (const q of [...fromNewTopics, ...rest.filter((x) => !fromNewTopics.includes(x))]) {
    if (chosen.length >= count) break;
    add(q, "again", `${q.subject}\u0000${q.topic}`);
  }
  return chosen.slice(0, count);
}

/* A student who has not practised anything yet has nothing to review, which used to mean no warm-up at all: the day after
   the diagnostic nothing asked her to study, so her streak sat at 1 and then ended. Until she has something to review,
   the warm-up asks up to three easy starter questions from her own subjects instead. `pool` is every multiple-choice
   question of those subjects. Easy ones come first, from different topics where it can, and the same student gets the
   same questions all day. Answering them puts them in Practice, so from the next day on the warm-up is a real review. */
export const STARTER_SLOT = "starter";
export function starterQuestions({ pool, seed, count = WARMUP_COUNT }) {
  const usable = pool.filter(isWarmupQuestion);
  const rank = (q) => (q.difficulty === "Easy" ? 0 : q.difficulty === "Medium" ? 1 : 2);
  const order = (a, b) => rank(a) - rank(b) || seedFrom(`${seed}|${a.id}`) - seedFrom(`${seed}|${b.id}`);
  const topics = new Map();
  for (const q of [...usable].sort(order)) {
    const key = `${q.subject}\u0000${q.topic}`;
    if (!topics.has(key)) topics.set(key, []);
    topics.get(key).push(q);
  }
  // The topics with the easiest question first, ties broken by the seed so the day's choice is stable.
  const byTopic = [...topics.entries()].sort(([ka, a], [kb, b]) => rank(a[0]) - rank(b[0]) || seedFrom(`${seed}|${ka}`) - seedFrom(`${seed}|${kb}`));
  const chosen = [];
  for (const [, questions] of byTopic) {
    if (chosen.length >= count) break;
    chosen.push(questions[0]);
  }
  for (const q of [...usable].sort(order)) {
    if (chosen.length >= count) break;
    if (!chosen.includes(q)) chosen.push(q);
  }
  return chosen.map((q) => ({ id: q.id, slot: STARTER_SLOT }));
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
