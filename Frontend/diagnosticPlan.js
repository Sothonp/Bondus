/* The diagnostic test: which tracks have one, which subjects it covers and which questions it asks.

   Science sits it in four sections (Mathematics, Physics, Chemistry, Biology) of a dozen questions each, about a quarter
   of an hour in all. Social Science has no diagnostic. The questions come from the same bank as practice, so there is
   nothing new to write. The picker is deterministic: every student gets the same questions in English or Khmer, because
   it only reads the canonical fields (id, topic, difficulty, chapter) and never the translated text. */

export const QUESTIONS_PER_SECTION = 12;

// A track with no entry here has no diagnostic.
const DIAGNOSTIC_SUBJECTS = { science: ["Mathematics", "Physics", "Chemistry", "Biology"] };

export const diagnosticSubjects = (field) => DIAGNOSTIC_SUBJECTS[field] ?? [];
export const hasDiagnostic = (field) => diagnosticSubjects(field).length > 0;

const LEVELS = ["Easy", "Medium", "Hard"];

/* Up to `count` items at even steps through `pool`, so the picks reach every part of it. A pick whose topic is already in
   `topics` is passed over for the next one along; `topics` is added to as picks are made (null: repeat topics freely). */
function spread(pool, count, topics) {
  const out = [];
  for (let k = 0; k < count; k++) {
    const start = Math.floor(((k + 0.5) * pool.length) / count);
    for (let step = 0; step < pool.length; step++) {
      const candidate = pool[(start + step) % pool.length];
      if (out.includes(candidate) || (topics && topics.has(candidate.topic))) continue;
      out.push(candidate);
      topics?.add(candidate.topic);
      break;
    }
  }
  return out;
}

/* `count` questions for one subject: spread over the syllabus, no topic twice, about a quarter easy and a quarter hard,
   and asked from easy to hard. A subject with fewer questions than that gives all it has. */
export function pickSection(exercises, count = QUESTIONS_PER_SECTION) {
  const want = Math.min(count, exercises.length);
  if (want <= 0) return [];

  // A chapter's questions stay together and chapters keep the order they first appear in, so even steps through the
  // list reach the whole syllabus instead of whatever happens to be authored first.
  const byChapter = new Map();
  for (const ex of exercises) {
    const key = ex.chapter ?? "";
    if (!byChapter.has(key)) byChapter.set(key, []);
    byChapter.get(key).push(ex);
  }
  const ordered = [...byChapter.values()].flat();

  const quarter = Math.round(want / 4);
  const quota = { Easy: quarter, Hard: quarter, Medium: want - 2 * quarter };
  const topics = new Set();
  const picked = [];
  for (const level of LEVELS) picked.push(...spread(ordered.filter((ex) => ex.difficulty === level), quota[level], topics));

  // A level too small to fill its share is made up from the others, then (out of fresh topics) from repeats.
  const left = () => ordered.filter((ex) => !picked.includes(ex));
  if (picked.length < want) picked.push(...spread(left(), want - picked.length, topics));
  if (picked.length < want) picked.push(...spread(left(), want - picked.length, null));

  const rank = (ex) => Math.max(0, LEVELS.indexOf(ex.difficulty));
  return picked.sort((a, b) => rank(a) - rank(b) || ordered.indexOf(a) - ordered.indexOf(b));
}

/* The sections of a track's diagnostic: [{ subject, questions }], empty for a track with none. `listFor(subject)` is the
   subject's whole question list (App.jsx's getExercises). */
export function buildSections(field, listFor, count = QUESTIONS_PER_SECTION) {
  return diagnosticSubjects(field)
    .map((subject) => ({ subject, questions: pickSection(listFor(subject), count) }))
    .filter((section) => section.questions.length > 0);
}

/* Where question number `index` (counting from 0 through every section) sits: its section, and its place in it. */
export function locate(sections, index) {
  let before = 0;
  for (let s = 0; s < sections.length; s++) {
    const size = sections[s].questions.length;
    if (index < before + size) return { subject: sections[s].subject, section: s + 1, sections: sections.length, position: index - before + 1, size };
    before += size;
  }
  return null;
}
