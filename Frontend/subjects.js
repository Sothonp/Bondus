/* BAC II subjects by track: the canonical (English) subject names every part of the app keys on —
   mastery, the exercise bank, exam papers — plus their Khmer labels.

   The Science track sits seven papers. The seventh is a foreign language the student picks once,
   English or French, so FIELD_SUBJECTS lists it as FOREIGN_LANGUAGE and fieldSubjects() swaps in
   the student's choice. The Social Science list still carries both languages. */
export const FOREIGN_LANGUAGE = "Foreign Language";
export const FOREIGN_LANGUAGES = ["English", "French"];

/* Field-specific subject priorities. Change these lists to extend the curriculum. */
export const FIELD_SUBJECTS = {
  science: ["Mathematics", "Physics", "Chemistry", "Biology", "Khmer Literature", "History", FOREIGN_LANGUAGE],
  social_science: ["Khmer Literature", "History", "Geography", "Morality", "Earth Science", "Mathematics", "English", "French"],
};

// The subjects a student actually sits: the track's list with the foreign-language slot filled in.
// Profiles saved before the choice existed have no foreignLanguage and get English.
export function fieldSubjects(field, foreignLanguage) {
  const language = FOREIGN_LANGUAGES.includes(foreignLanguage) ? foreignLanguage : FOREIGN_LANGUAGES[0];
  return (FIELD_SUBJECTS[field] || []).map((s) => (s === FOREIGN_LANGUAGE ? language : s));
}

export const subjectId = (s) => s.toLowerCase().replace(/\s+/g, "_");

/* Same pattern as topicLabel(), one level up: the canonical (English) subject name is the key
   used everywhere a subject is tracked or matched (FIELD_SUBJECTS, topicMastery, deriveInsights'
   weak/strong lists, the exercise bank) — only subjectLabel() changes what's shown on screen. */
export const SUBJECT_LABEL_KM = {
  Mathematics: "គណិតវិទ្យា", Physics: "រូបវិទ្យា", Chemistry: "គីមីវិទ្យា", Biology: "ជីវវិទ្យា",
  "Khmer Literature": "អក្សរសាស្ត្រខ្មែរ", History: "ប្រវត្តិវិទ្យា", English: "ភាសាអង់គ្លេស", French: "ភាសាបារាំង",
  Geography: "ភូមិវិទ្យា", Morality: "សីលធម៌ពលរដ្ឋវិទ្យា", "Earth Science": "ផែនដីវិទ្យា",
  [FOREIGN_LANGUAGE]: "ភាសាបរទេស",
};
export const subjectLabel = (subject, lang) => (lang === "km" ? (SUBJECT_LABEL_KM[subject] ?? subject) : subject);
