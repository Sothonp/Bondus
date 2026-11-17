/* Stage-1 "Formula Introduction" content for Formula Mastery: for each main formula of a chapter, a
   plain-language explanation of every variable and one worked example, read before the student is
   quizzed on it. Separate from the question bank -- this is lesson content, not exercise content, so
   it carries no `id` and never touches exercise positions or student progress.

   Keyed by chapter (the same English chapter key as everywhere else, see mathematics/chapters.js), one
   entry per main formula of that chapter. Pilot coverage matches formulaMastery.js: Mathematics
   Foundations only, for its first pass. Khmer text here was authored by following the patterns already
   in the question bank, not reviewed by a native speaker -- flag for review before this ships. */
export const FORMULA_INTROS = {
  "Mathematics Foundations": [
    {
      key: "vertex",
      topic: "Quadratic vertex formula",
      topicKm: "រូបមន្តកំពូលប៉ារ៉ាបូល",
      formula: "x_vertex = −b ÷ (2a)",
      formulaKm: "x_កំពូល = −b ÷ (2a)",
      whenToUse: "Use this when you need the x-coordinate of a parabola's turning point, from y = ax² + bx + c.",
      whenToUseKm: "ប្រើវានៅពេលចង់រកកូអរដោនេ x នៃកំពូលប៉ារ៉ាបូល ពីសមីការ y = ax² + bx + c។",
      variables: [
        { symbol: "a, b", meaning: "the coefficients of x² and x in y = ax² + bx + c (a is never 0)", meaningKm: "មេគុណនៃ x² និង x ក្នុង y = ax² + bx + c (a មិនស្មើ 0 ទេ)" },
        { symbol: "x_vertex", meaning: "the x-coordinate where the parabola turns -- its axis of symmetry", meaningKm: "កូអរដោនេ x កន្លែងប៉ារ៉ាបូលបត់ -- អ័ក្សស៊ីមេទ្រីរបស់វា" },
      ],
      worked: {
        prompt: "Find the vertex's x-coordinate for y = x² − 4x + 1.",
        promptKm: "រកកូអរដោនេ x នៃកំពូលសម្រាប់ y = x² − 4x + 1។",
        steps: [
          "Identify a = 1, b = −4.",
          "x_vertex = −b ÷ (2a) = −(−4) ÷ (2·1) = 4 ÷ 2.",
          "x_vertex = 2.",
        ],
        stepsKm: [
          "កំណត់ a = 1, b = −4។",
          "x_កំពូល = −b ÷ (2a) = −(−4) ÷ (2·1) = 4 ÷ 2។",
          "x_កំពូល = 2។",
        ],
      },
    },
    {
      key: "angleSum",
      topic: "Angle sum formulas",
      topicKm: "រូបមន្តបូកមុំ",
      formula: "sin(a ± b) = sin a cos b ± cos a sin b;  cos(a ± b) = cos a cos b ∓ sin a sin b",
      formulaKm: "sin(a ± b) = sin a cos b ± cos a sin b;  cos(a ± b) = cos a cos b ∓ sin a sin b",
      whenToUse: "Use this to find sin or cos of a sum or difference of two angles, once you already know sin and cos of each angle separately.",
      whenToUseKm: "ប្រើវានៅពេលចង់រក sin ឬ cos នៃផលបូក/ផលសងនៃមុំពីរ នៅពេលដែលស្គាល់ sin និង cos នៃមុំនីមួយៗរួចហើយ។",
      variables: [
        { symbol: "a, b", meaning: "the two angles being added or subtracted", meaningKm: "មុំទាំងពីរដែលយកមកបូក ឬ សង" },
      ],
      worked: {
        prompt: "Find cos(90°) using a = 60°, b = 30°.",
        promptKm: "រក cos(90°) ដោយប្រើ a = 60°, b = 30°។",
        steps: [
          "cos a = cos 60° = 1/2, sin a = sin 60° = √3/2.",
          "cos b = cos 30° = √3/2, sin b = sin 30° = 1/2.",
          "cos(a + b) = cos a cos b − sin a sin b = (1/2)(√3/2) − (√3/2)(1/2) = 0.",
        ],
        stepsKm: [
          "cos a = cos 60° = 1/2, sin a = sin 60° = √3/2។",
          "cos b = cos 30° = √3/2, sin b = sin 30° = 1/2។",
          "cos(a + b) = cos a cos b − sin a sin b = (1/2)(√3/2) − (√3/2)(1/2) = 0។",
        ],
      },
    },
  ],
};
