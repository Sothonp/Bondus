/* Canonical chapter registry for the Grade 12 Chemistry bank: the stable English key, the Khmer
   display label, and the curriculum order (chapter.lesson — so 4.3 sorts before 5.1).

   Every lesson file takes its chapter from here via chapterOf(), which throws on an unknown key, so a
   mistyped chapter name can never silently create an extra card in the chapter picker. The order
   numbers are what PracticeSubject sorts by (see chapterOrder in Frontend/App.jsx), which is why a
   lesson can be appended to the bank later and still show up in the right place.

   Numbering follows the official Grade 12 chemistry textbook: 1 kinetics, 2 aqueous solutions and
   intermolecular forces, 3 acids and bases, 4 chemical equilibrium, 5 gases, 6 organic chemistry. */
export const CHAPTERS = [
  ["Chemistry Foundations", "មូលដ្ឋានគីមីវិទ្យា", 0],
  ["1.1 Reaction Rate", "១.១ ល្បឿនប្រតិកម្មគីមី", 1.1],
  ["1.2 Factors Affecting Reaction Rate", "១.២ កត្តាជះឥទ្ធិពលលើល្បឿនប្រតិកម្ម", 1.2],
  ["2.1 Species in Aqueous Solution", "២.១ សមាសធាតុក្នុងសូលុយស្យុងទឹក", 2.1],
  ["2.2 Intermolecular Forces", "២.២ កម្លាំងអន្តរម៉ូលេគុល", 2.2],
  ["3.1 Acid–Base Theory", "៣.១ ទ្រឹស្តីអាស៊ីត-បាស", 3.1],
  ["3.2 Acid–Base Reactions", "៣.២ ប្រតិកម្មអាស៊ីត-បាស", 3.2],
  ["3.3 Aqueous Solutions & pH", "៣.៣ សូលុយស្យុងទឹក និង pH", 3.3],
  ["3.4 Acid–Base Titration", "៣.៤ អត្រាកម្មអាស៊ីត-បាស", 3.4],
  ["4.1 Nature of Chemical Equilibrium", "៤.១ ធម្មជាតិនៃលំនឹងគីមី", 4.1],
  ["4.2 Shifting Equilibrium (Le Chatelier)", "៤.២ ការរំកិលលំនឹង", 4.2],
  ["4.3 Acid, Base & Salt Equilibria", "៤.៣ លំនឹងនៃអាស៊ីត បាស និងអំបិល", 4.3],
  ["5.1 Properties of Gases", "៥.១ លក្ខណៈឧស្ម័ន", 5.1],
  ["5.2 Gas Laws", "៥.២ ច្បាប់ឧស្ម័ន", 5.2],
  ["5.3 Ideal Gas Law & Gas Mixtures", "៥.៣ ច្បាប់ឧស្ម័នបរិសុទ្ធ និងល្បាយឧស្ម័ន", 5.3],
  ["6.1 Esters, Fats & Oils", "៦.១ អេស្ទែ ខ្លាញ់ និងប្រេង", 6.1],
  ["6.2 Amines, Amides & Amino Acids", "៦.២ អាមីន អាមីត និងអាស៊ីតអាមីណេ", 6.2],
  ["6.3 Aromatic Compounds", "៦.៣ សមាសធាតុប្រហើរ", 6.3],
  ["6.4 Carbohydrates & Lipids", "៦.៤ កាបូនអ៊ីដ្រាត និងលីពីត", 6.4],
];

export const CHAPTER_ORDER = Object.fromEntries(CHAPTERS.map(([en, , order]) => [en, order]));

// [englishKey, khmerLabel] for withChapter()/drill(); throws on a key that is not in the registry.
export const chapterOf = (en) => {
  const c = CHAPTERS.find(([key]) => key === en);
  if (!c) throw new Error(`Unknown chemistry chapter: ${en}`);
  return [c[0], c[1]];
};
