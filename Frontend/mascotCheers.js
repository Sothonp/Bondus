/* What the owl says to encourage the student (App.jsx: ExercisePlayer's speech bubble beside the owl,
   and the "set complete" screen). Duolingo-style: a short, varied line at each moment —
     correct  a right answer              retry      right this time, after an earlier miss
     miss     a wrong answer (gentle)     perfect    whole set done, every question right first time
     resilient whole set done after some retries
   Every line is written as an English / Khmer pair so the two languages cannot drift apart; they are
   exposed as CHEER_STRINGS ({ en: {key: line}, km: {key: line} }) and spread into STRINGS in App.jsx,
   so t(lang, key) works as for any other string. Lines for the question screen must stay short (the
   bubble is about 150px wide there) — mascotCheers.test.js enforces the limits. The Khmer has not been
   proofread by a native speaker yet. */

const LINES = {
  correct: [
    ["Great job! 🎉", "ល្អណាស់! 🎉"],
    ["You nailed it! 💪", "ត្រូវទាំងស្រុង! 💪"],
    ["Brilliant! ✨", "អស្ចារ្យណាស់! ✨"],
    ["Spot on! 🎯", "ត្រឹមត្រូវណាស់! 🎯"],
    ["Keep it up! 🔥", "បន្តបែបនេះទៅ! 🔥"],
    ["Awesome work! 👏", "ពូកែណាស់! 👏"],
    ["Way to go! 🚀", "ធ្វើបានល្អណាស់! 🚀"],
    ["You're on a roll! 🌟", "អ្នកកំពុងធ្វើបានល្អខ្លាំង! 🌟"],
  ],
  retry: [
    ["You got it this time! 💪", "លើកនេះអ្នកធ្វើបានហើយ! 💪"],
    ["See? You can do it! 🌟", "មើលចុះ អ្នកអាចធ្វើបាន! 🌟"],
    ["Trying again paid off! 🎉", "ការសាកល្បងម្តងទៀតបានផល! 🎉"],
  ],
  miss: [
    ["Mistakes help you learn! 💙", "កំហុសជួយឱ្យអ្នករៀនបាន! 💙"],
    ["Don't worry, you've got this! 💪", "កុំបារម្ភ អ្នកអាចធ្វើបាន! 💪"],
    ["No worries, we'll try again! 🔁", "មិនអីទេ យើងនឹងសាកល្បងម្តងទៀត! 🔁"],
    ["Keep going, you're learning! 🌟", "បន្តទៅមុខ អ្នកកំពុងរៀន! 🌟"],
    ["Every try makes you better! 🌱", "រាល់ការសាកល្បងធ្វើឱ្យអ្នកប្រសើរឡើង! 🌱"],
  ],
  perfect: [
    ["Flawless! I'm so proud of you! 🎉", "ល្អឥតខ្ចោះ! ខ្ញុំមោទនភាពនឹងអ្នកណាស់! 🎉"],
    ["You're a star! Keep shining! 🌟", "អ្នកជាតារា! បន្តភ្លឺចិញ្ចែងទៅ! 🌟"],
    ["Amazing! Nothing can stop you! 🏆", "អស្ចារ្យណាស់! គ្មានអ្វីអាចបញ្ឈប់អ្នកបានទេ! 🏆"],
  ],
  resilient: [
    ["You never gave up, and it paid off! 🎉", "អ្នកមិនបោះបង់ ហើយវាបានផលល្អ! 🎉"],
    ["Every try got you closer. Well done! 💪", "រាល់ការសាកល្បងនាំអ្នកខិតជិតជោគជ័យ។ ល្អណាស់! 💪"],
    ["I'm proud of how you kept going! 🌟", "ខ្ញុំមោទនភាពដែលអ្នកបន្តព្យាយាម! 🌟"],
  ],
};

const PREFIX = { correct: "cheerCorrect", retry: "cheerRetry", miss: "cheerMiss", perfect: "cheerPerfect", resilient: "cheerResilient" };
const keyOf = (kind, i) => `${PREFIX[kind]}${i + 1}`;
const need = (kind) => { if (!LINES[kind]) throw new Error(`Unknown cheer kind: ${kind}`); return LINES[kind]; };

export const CHEER_STRINGS = { en: {}, km: {} };
for (const kind of Object.keys(LINES)) {
  LINES[kind].forEach(([en, km], i) => { CHEER_STRINGS.en[keyOf(kind, i)] = en; CHEER_STRINGS.km[keyOf(kind, i)] = km; });
}

// The string keys for one kind of moment, in authoring order.
export const cheerKeys = (kind) => need(kind).map((_, i) => keyOf(kind, i));

/* Picks a key for `kind`, never the same one as `previous` (the line shown last, whatever its kind) so
   the owl doesn't repeat itself. `rand` is injectable for tests. */
export const pickCheer = (kind, previous = null, rand = Math.random) => {
  const keys = cheerKeys(kind);
  const pool = keys.length > 1 ? keys.filter((k) => k !== previous) : keys;
  return pool[Math.min(pool.length - 1, Math.floor(rand() * pool.length))];
};
