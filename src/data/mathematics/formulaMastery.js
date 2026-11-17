import { drill } from "./helpers.js";
import { chapterOf } from "./chapters.js";

/* Formula Mastery content (stage 0, same "no paper" convention as formulaDrills.js): every item here
   also carries a `kind` tag -- "recognition" | "application" | "missingVariable" | "tricky" -- which
   formulaDrills.js items deliberately do not have. The tag is what lets the Formula Mastery flow
   (FormulaMastery.jsx, still to come) offer a staged curriculum per chapter instead of one flat pool,
   and lets its remediation route a miss back into more of the SAME kind the student missed.

   Untagged stage-0 questions (the existing formula quiz, formulaDrills.js) are left exactly as they
   are: FormulaDrill/FormulaSheet keep working unchanged, and Formula Mastery only ever draws from
   items that have an explicit `kind` here, so a chapter with no Formula Mastery content yet simply
   does not offer it (same "hide when there's nothing to show" rule DrillButton/SheetButton already
   follow for their own counts).

   Appended at the very end of the Mathematics bank (see mathematicsExercises.js) -- same positional-id
   rule as formulaDrills.js: new questions only ever go at the end of FORMULA_MASTERY, never inserted
   earlier, and an existing item here is never reordered or retagged in a way that moves its position.

   Pilot coverage for this first pass: Mathematics Foundations only (the quadratic vertex formula and
   the angle-sum formulas). More chapters are a straightforward continuation of the same pattern, not
   a new mechanism -- deliberately scoped narrow here so every question could be checked by hand rather
   than mass-produced. */

const tag = (kind, list) => list.map((e) => ({ ...e, kind }));

const VERTEX = { topic: "Quadratic vertex formula", topicKm: "រូបមន្តកំពូលប៉ារ៉ាបូល" };
const ANGLE_SUM = { topic: "Angle sum formulas", topicKm: "រូបមន្តបូកមុំ" };
const QUAD_FORMULA = { topic: "Quadratic formula", topicKm: "រូបមន្តសមីការការេ" };

const FOUNDATIONS_MASTERY = drill(...chapterOf("Mathematics Foundations"), [
  ...tag("recognition", [
    { ...VERTEX, difficulty: "Easy",
      prompt: "Which gives the x-coordinate of the vertex of y = ax² + bx + c?", promptKm: "តើរូបមន្តមួយណាផ្តល់កូអរដោនេ x នៃកំពូលនៃ y = ax² + bx + c?",
      options: ["−b ÷ (2a)", "−b ÷ a", "b ÷ (2a)", "c ÷ a"], answer: "−b ÷ (2a)",
      explanation: "Completing the square shows the parabola's axis of symmetry sits at x = −b ÷ (2a).", explanationKm: "ដោយបំពេញការេ អ័ក្សស៊ីមេទ្រីនៃប៉ារ៉ាបូលគឺ x = −b ÷ (2a)។",
      formula: "x_vertex = −b ÷ (2a)", formulaKm: "x_កំពូល = −b ÷ (2a)" },
    { ...ANGLE_SUM, difficulty: "Easy",
      prompt: "Which expression equals cos(a + b)?", promptKm: "តើកន្សោមមួយណាស្មើ cos(a + b)?",
      options: ["cos a cos b − sin a sin b", "cos a cos b + sin a sin b", "sin a cos b + cos a sin b", "sin a sin b − cos a cos b"], answer: "cos a cos b − sin a sin b",
      explanation: "The cosine addition formula subtracts the sine product: cos(a + b) = cos a cos b − sin a sin b.", explanationKm: "រូបមន្តបូកមុំកូស៊ីនុស៖ cos(a + b) = cos a cos b − sin a sin b។",
      formula: "cos(a ± b) = cos a cos b ∓ sin a sin b", formulaKm: "cos(a ± b) = cos a cos b ∓ sin a sin b" },
    { ...ANGLE_SUM, difficulty: "Easy",
      prompt: "Which expression equals sin(a + b)?", promptKm: "តើកន្សោមមួយណាស្មើ sin(a + b)?",
      options: ["sin a cos b + cos a sin b", "cos a cos b − sin a sin b", "sin a cos b − cos a sin b", "cos a sin b − sin a cos b"], answer: "sin a cos b + cos a sin b",
      explanation: "The sine addition formula: sin(a + b) = sin a cos b + cos a sin b.", explanationKm: "រូបមន្តបូកមុំស៊ីនុស៖ sin(a + b) = sin a cos b + cos a sin b។",
      formula: "sin(a ± b) = sin a cos b ± cos a sin b", formulaKm: "sin(a ± b) = sin a cos b ± cos a sin b" },
  ]),
  ...tag("application", [
    { ...VERTEX, difficulty: "Easy",
      prompt: "For y = x² − 4x + 1, what is the x-coordinate of the vertex?", promptKm: "ចំពោះ y = x² − 4x + 1 តើកូអរដោនេ x នៃកំពូលស្មើប៉ុន្មាន?",
      options: ["2", "4", "−2", "1"], answer: "2",
      explanation: "x_vertex = −b ÷ (2a) = −(−4) ÷ (2·1) = 4 ÷ 2 = 2.", explanationKm: "x_កំពូល = −b ÷ (2a) = −(−4) ÷ (2·1) = 4 ÷ 2 = 2។",
      formula: "x_vertex = −b ÷ (2a)", formulaKm: "x_កំពូល = −b ÷ (2a)" },
    { ...VERTEX, difficulty: "Medium",
      prompt: "For y = 2x² + 8x − 3, what is the x-coordinate of the vertex?", promptKm: "ចំពោះ y = 2x² + 8x − 3 តើកូអរដោនេ x នៃកំពូលស្មើប៉ុន្មាន?",
      options: ["−2", "2", "−4", "4"], answer: "−2",
      explanation: "x_vertex = −b ÷ (2a) = −8 ÷ (2·2) = −8 ÷ 4 = −2.", explanationKm: "x_កំពូល = −b ÷ (2a) = −8 ÷ (2·2) = −8 ÷ 4 = −2។",
      formula: "x_vertex = −b ÷ (2a)", formulaKm: "x_កំពូល = −b ÷ (2a)" },
    { ...ANGLE_SUM, difficulty: "Medium",
      prompt: "Using cos(a + b) = cos a cos b − sin a sin b with a = 60° and b = 30°, what is cos(a + b)?", promptKm: "ដោយប្រើ cos(a + b) = cos a cos b − sin a sin b ជាមួយ a = 60° និង b = 30° តើ cos(a + b) ស្មើប៉ុន្មាន?",
      options: ["0", "1", "−1", "1/2"], answer: "0",
      explanation: "cos(60° + 30°) = cos 90° = 0. Check: (1/2)(√3/2) − (√3/2)(1/2) = 0.", explanationKm: "cos(60° + 30°) = cos 90° = 0។ ត្រួតពិនិត្យ៖ (1/2)(√3/2) − (√3/2)(1/2) = 0។",
      formula: "cos(a ± b) = cos a cos b ∓ sin a sin b", formulaKm: "cos(a ± b) = cos a cos b ∓ sin a sin b" },
  ]),
  ...tag("missingVariable", [
    { ...VERTEX, difficulty: "Medium",
      prompt: "A parabola y = ax² − 6x + 2 has its vertex at x = 3. What is a?", promptKm: "ប៉ារ៉ាបូល y = ax² − 6x + 2 មានកំពូលនៅ x = 3។ តើ a ស្មើប៉ុន្មាន?",
      options: ["1", "2", "3", "6"], answer: "1",
      explanation: "x_vertex = −b ÷ (2a) = 6 ÷ (2a) = 3, so 2a = 2 and a = 1.", explanationKm: "x_កំពូល = −b ÷ (2a) = 6 ÷ (2a) = 3 ដូច្នេះ 2a = 2 និង a = 1។",
      formula: "x_vertex = −b ÷ (2a)", formulaKm: "x_កំពូល = −b ÷ (2a)" },
    { ...VERTEX, difficulty: "Medium",
      prompt: "A parabola y = 3x² + bx + 5 has its vertex at x = −1. What is b?", promptKm: "ប៉ារ៉ាបូល y = 3x² + bx + 5 មានកំពូលនៅ x = −1។ តើ b ស្មើប៉ុន្មាន?",
      options: ["6", "−6", "3", "−3"], answer: "6",
      explanation: "x_vertex = −b ÷ (2a) = −b ÷ 6 = −1, so −b = −6 and b = 6.", explanationKm: "x_កំពូល = −b ÷ (2a) = −b ÷ 6 = −1 ដូច្នេះ −b = −6 និង b = 6។",
      formula: "x_vertex = −b ÷ (2a)", formulaKm: "x_កំពូល = −b ÷ (2a)" },
    { ...ANGLE_SUM, difficulty: "Medium",
      prompt: "If cos(a + b) = 1/2 and cos a cos b = 3/4, what is sin a sin b?", promptKm: "បើ cos(a + b) = 1/2 និង cos a cos b = 3/4 តើ sin a sin b ស្មើប៉ុន្មាន?",
      options: ["1/4", "1/2", "−1/4", "1"], answer: "1/4",
      explanation: "cos(a + b) = cos a cos b − sin a sin b, so sin a sin b = cos a cos b − cos(a + b) = 3/4 − 1/2 = 1/4.", explanationKm: "cos(a + b) = cos a cos b − sin a sin b ដូច្នេះ sin a sin b = cos a cos b − cos(a + b) = 3/4 − 1/2 = 1/4។",
      formula: "cos(a ± b) = cos a cos b ∓ sin a sin b", formulaKm: "cos(a ± b) = cos a cos b ∓ sin a sin b" },
  ]),
  ...tag("tricky", [
    { ...VERTEX, difficulty: "Hard",
      prompt: "A parabola y = 2x² + bx + 1 passes through the point (5, 10) and has its vertex at x = −2. What is b?", promptKm: "ប៉ារ៉ាបូល y = 2x² + bx + 1 ឆ្លងកាត់ចំនុច (5, 10) ហើយមានកំពូលនៅ x = −2។ តើ b ស្មើប៉ុន្មាន?",
      options: ["8", "−8", "4", "−4"], answer: "8",
      explanation: "The point (5, 10) is not needed here -- only the vertex formula is. x_vertex = −b ÷ (2a) = −b ÷ 4 = −2, so b = 8.", explanationKm: "ចំនុច (5, 10) មិនចាំបាច់ប្រើទេ -- ត្រូវការតែរូបមន្តកំពូល។ x_កំពូល = −b ÷ (2a) = −b ÷ 4 = −2 ដូច្នេះ b = 8។",
      formula: "x_vertex = −b ÷ (2a)", formulaKm: "x_កំពូល = −b ÷ (2a)" },
    { ...ANGLE_SUM, difficulty: "Medium",
      prompt: "You are given cos a and cos b and asked for cos(a − b). Which extra fact do you also need to use the addition formula directly?", promptKm: "គេឲ្យ cos a និង cos b ហើយសួររក cos(a − b)។ តើត្រូវការព័ត៌មានបន្ថែមអ្វីទៀត ដើម្បីប្រើរូបមន្តបូកមុំផ្ទាល់?",
      options: ["sin a and sin b", "a + b", "a · b", "nothing else is needed"], answer: "sin a and sin b",
      explanation: "cos(a − b) = cos a cos b + sin a sin b -- the formula also needs the sine values, not the cosines alone.", explanationKm: "cos(a − b) = cos a cos b + sin a sin b -- រូបមន្តត្រូវការតម្លៃស៊ីនុសផងដែរ មិនមែនកូស៊ីនុសតែម្យ៉ាងទេ។",
      formula: "cos(a ± b) = cos a cos b ∓ sin a sin b", formulaKm: "cos(a ± b) = cos a cos b ∓ sin a sin b" },
    { ...QUAD_FORMULA, difficulty: "Medium",
      prompt: "Which of these is NOT a correct form of the quadratic formula for ax² + bx + c = 0?", promptKm: "តើមួយណាក្នុងចំណោមនេះ មិនមែនជារូបមន្តដែលត្រឹមត្រូវសម្រាប់ ax² + bx + c = 0?",
      options: ["x = (b ± √Δ) ÷ 2a", "x = (−b ± √Δ) ÷ 2a", "2ax = −b ± √Δ", "x = −b/(2a) ± √Δ/(2a)"], answer: "x = (b ± √Δ) ÷ 2a",
      explanation: "The sign in front of b must be negative: x = (−b ± √Δ) ÷ 2a. The other two are the same formula rearranged.", explanationKm: "សញ្ញាខាងមុខ b ត្រូវតែអវិជ្ជមាន៖ x = (−b ± √Δ) ÷ 2a។ ជម្រើសពីរទៀតគឺរូបមន្តដូចគ្នា គ្រាន់តែរៀបតាងផ្សេង។",
      formula: "x = (−b ± √Δ) ÷ 2a", formulaKm: "x = (−b ± √Δ) ÷ 2a" },
  ]),
]);

export const FORMULA_MASTERY = [
  ...FOUNDATIONS_MASTERY,
];
