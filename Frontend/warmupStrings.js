/* Words for the daily warm-up screen (WarmUpGate.jsx), English and Khmer. Kept apart from App.jsx's STRINGS, like
   CHEER_STRINGS and RIBBON_STRINGS, so the screen is one self-contained piece. {n}, {total} and {c} are filled in by
   fillWarmup(). Questions, answers, explanations and topic names come from the exercise bank in the student's language;
   the screen's own wording that already exists in App.jsx (Check answer, Explanation ...) is passed in as tr(key).
   The Khmer lines are first drafts: they should be read by a native speaker before students see them. */
export const WARMUP_STRINGS = {
  en: {
    title: "Daily warm-up",
    subtitleCold: "Start your streak with today's quiz",
    subtitleDormant: "Light your flame with today's quiz",
    subtitleLit: "Warm up before you study",
    streakDays: "{n}-day streak",
    questionOf: "Question {n} of {total}",
    secondsLeft: "{n} seconds left",
    slotWeak: "Your weakest topic",
    slotReview: "Time to review",
    slotFresh: "Something fresh",
    correct: "Correct!",
    timeUp: "Time is up.",
    why: "Why",
    next: "Continue",
    finish: "Finish",
    doneTitle: "Your flame is lit.",
    doneTitleFirst: "Your streak has started.",
    dayN: "Day {n}",
    score: "{c} of {total} correct",
    missedTitle: "To review",
    go: "Go to my dashboard",
    note: "Three quick questions, once a day.",
  },
  km: {
    title: "ហាត់កម្តៅប្រចាំថ្ងៃ",
    subtitleCold: "ចាប់ផ្តើមថ្ងៃជាប់គ្នារបស់អ្នកជាមួយសំណួរថ្ងៃនេះ",
    subtitleDormant: "បំភ្លឺភ្លើងរបស់អ្នកជាមួយសំណួរថ្ងៃនេះ",
    subtitleLit: "កម្តៅខួរក្បាលមុនចាប់ផ្តើមរៀន",
    streakDays: "{n} ថ្ងៃជាប់គ្នា",
    questionOf: "សំណួរទី {n} នៃ {total}",
    secondsLeft: "នៅសល់ {n} វិនាទី",
    slotWeak: "ប្រធានបទដែលអ្នកខ្សោយជាងគេ",
    slotReview: "ដល់ពេលត្រួតពិនិត្យឡើងវិញ",
    slotFresh: "អ្វីថ្មីៗ",
    correct: "ត្រឹមត្រូវ!",
    timeUp: "អស់ម៉ោងហើយ។",
    why: "ហេតុអ្វី",
    next: "បន្ត",
    finish: "បញ្ចប់",
    doneTitle: "ភ្លើងរបស់អ្នកឆេះហើយ។",
    doneTitleFirst: "ថ្ងៃជាប់គ្នារបស់អ្នកបានចាប់ផ្តើមហើយ។",
    dayN: "ថ្ងៃទី {n}",
    score: "ត្រឹមត្រូវ {c} នៃ {total}",
    missedTitle: "ត្រូវត្រួតពិនិត្យឡើងវិញ",
    go: "ទៅផ្ទាំងគ្រប់គ្រងរបស់ខ្ញុំ",
    note: "សំណួរខ្លីៗបីក្នុងមួយថ្ងៃ។",
  },
};

export const warmupText = (lang, key) => (WARMUP_STRINGS[lang] ?? WARMUP_STRINGS.en)[key] ?? WARMUP_STRINGS.en[key] ?? key;
export const fillWarmup = (text, vars = {}) => Object.entries(vars).reduce((out, [k, v]) => out.split(`{${k}}`).join(String(v)), text);
