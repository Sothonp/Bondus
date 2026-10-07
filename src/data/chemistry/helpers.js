/* Shared helpers for the Grade 12 Science-track Chemistry practice bank.

   Every exercise in src/data/chemistry/*.js uses the same shape as the other BAC II subjects in
   RAW_EXERCISES (Frontend/App.jsx): topic/topicKm, difficulty, prompt/promptKm, options/answer
   (+ optionsKm/answerKm only when the choices contain translatable words — pure numbers and
   formulas deliberately fall back to the English options), explanation/explanationKm and
   formula/formulaKm. Exercises are authored with the correct answer FIRST for readability; see
   spreadAnswers() for how that is turned into a varied order at load time.

   withChapter() stamps the same chapter/chapterKm pair on every exercise of one lesson, so the
   chapter picker in PracticeSubject groups them (chapter is the stable English key, chapterKm is
   display-only). The lessons follow the Grade 12 chemistry lesson-summary booklet. */

// FNV-1a hash of the English prompt → seed, so every question always gets the same order.
const hash = (s) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
};
// mulberry32 PRNG
const prng = (seed) => () => {
  seed = (seed + 0x6D2B79F5) >>> 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/* The app renders options in array order and never shuffles, so a bank where the right answer is
   always first teaches students to just tap the first choice. This applies one deterministic
   permutation (seeded from the prompt, so it is stable across renders, reloads and language
   toggles) to options AND optionsKm together, keeping answer/answerKm matched. */
export const spreadAnswers = (e) => {
  const order = e.options.map((_, i) => i);
  const rand = prng(hash(e.prompt));
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const out = { ...e, options: order.map((i) => e.options[i]) };
  if (e.optionsKm) out.optionsKm = order.map((i) => e.optionsKm[i]);
  return out;
};

// keepOrder = true leaves the authored option order untouched (used for the original starter
// questions, whose option order students have already seen).
export const withChapter = (chapter, chapterKm, list, keepOrder = false) =>
  list.map((e) => ({ ...(keepOrder ? e : spreadAnswers(e)), chapter, chapterKm }));

/* Formula-quiz questions: short recall / selection / substitution items on one lesson's formulas.
   stage 0 makes PracticeSubject list them first in their chapter (under a "Formula quiz" header),
   ahead of the longer practice problems, so a student warms up on the formulas before tackling
   the problems. Ids are unaffected — they still come from the question's position in the bank. */
export const drill = (chapter, chapterKm, list) =>
  withChapter(chapter, chapterKm, list).map((e) => ({ ...e, stage: 0 }));
