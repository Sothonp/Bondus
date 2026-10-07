/* Canonical chapter registry for the Grade 12 Mathematics lesson bank: the stable English key, the
   Khmer display label, and the curriculum order (chapter.lesson — so 2.2 sorts before 3.1).

   Same mechanism as src/data/chemistry/chapters.js: every lesson file takes its chapter from here via
   chapterOf(), which throws on an unknown key, so a mistyped chapter name can never silently create
   an extra card in the chapter picker.

   Lessons follow the two MoEYS Grade 12 mathematics booklets (the lesson-summary + model-exercise
   booklet and the "methods for solving exercises" booklet): sequences and induction, limits,
   derivatives and primitives, definite integrals, function study, exponential and logarithmic
   functions, complex numbers, conics, differential equations, probability, and vectors in space.
   "Mathematics Foundations" (order 0) holds the 8 original starter questions that predate the
   lesson bank — they keep their original positions, see mathematicsExercises.js. */
export const CHAPTERS = [
  ["Mathematics Foundations", "មូលដ្ឋានគណិតវិទ្យា", 0],
  ["1.1 Mathematical Induction", "១.១ វិចារអនុមានរួមគណិតវិទ្យា", 1.1],
  ["1.2 Limits of Sequences", "១.២ លីមីតនៃស្វ៊ីត", 1.2],
  ["1.3 Limits of Functions", "១.៣ លីមីតនៃអនុគមន៍", 1.3],
  ["2.1 Derivatives", "២.១ ដេរីវេនៃអនុគមន៍", 2.1],
  ["2.2 Primitives (Antiderivatives)", "២.២ ព្រីមីទីវនៃអនុគមន៍", 2.2],
  ["3.1 Definite Integrals", "៣.១ អាំងតេក្រាលកំណត់", 3.1],
  ["4.1 Function Study & Graphs", "៤.១ សិក្សាអថេរភាព និងសង់ខ្សែកោង", 4.1],
  ["4.2 Exponential Functions", "៤.២ អនុគមន៍អិចស្ប៉ូណង់ស្យែល", 4.2],
  ["4.3 Natural Logarithm", "៤.៣ អនុគមន៍លោការីតនេពែ", 4.3],
  ["5.1 Complex Numbers: Algebraic Form", "៥.១ ចំនួនកុំផ្លិច៖ ទម្រង់ពីជគណិត", 5.1],
  ["5.2 Complex Numbers: Trigonometric Form", "៥.២ ចំនួនកុំផ្លិច៖ ទម្រង់ត្រីកោណមាត្រ", 5.2],
  ["6.1 Conics", "៦.១ កោនិក", 6.1],
  ["7.1 Differential Equations", "៧.១ សមីការឌីផេរ៉ង់ស្យែល", 7.1],
  ["8.1 Probability", "៨.១ ប្រូបាប", 8.1],
  ["9.1 Vectors in Space", "៩.១ វ៉ិចទ័រក្នុងលំហ និងផលគុណវ៉ិចទ័រ", 9.1],
];

export const CHAPTER_ORDER = Object.fromEntries(CHAPTERS.map(([en, , order]) => [en, order]));

// [englishKey, khmerLabel] for withChapter()/drill(); throws on a key that is not in the registry.
export const chapterOf = (en) => {
  const c = CHAPTERS.find(([key]) => key === en);
  if (!c) throw new Error(`Unknown mathematics chapter: ${en}`);
  return [c[0], c[1]];
};
