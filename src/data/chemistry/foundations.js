import { withChapter } from "./helpers.js";

/* Prerequisite calculation skills used throughout the Grade 12 chemistry course (moles, molarity,
   dilution, pH of a strong acid, balancing). The first three entries are the original Chemistry
   starter questions — they MUST stay first and in this order, because exercise ids are positional
   (Chemistry-1, Chemistry-2, Chemistry-3) and students' saved progress is keyed on them. */
const CH = ["Chemistry Foundations", "មូលដ្ឋានគីមីវិទ្យា"];

const ORIGINAL = withChapter(...CH, [
  { topic: "Moles", topicKm: "មូល", difficulty: "Medium",
    prompt: "How many moles are in 36 g of water (H₂O, M = 18 g/mol)?", promptKm: "តើទឹក 36 ក្រាម (H₂O, M = 18 g/mol) មានប៉ុន្មានមូល?",
    options: ["2", "1", "0.5", "36"], answer: "2",
    explanation: "Moles = mass ÷ molar mass = 36 ÷ 18 = 2 mol.", explanationKm: "ចំនួនមូល = ម៉ាស់ ÷ ម៉ាស់ម៉ូល = 36 ÷ 18 = 2 mol។",
    formula: "n = mass ÷ molar mass", formulaKm: "n = ម៉ាស់ ÷ ម៉ាស់ម៉ូល" },
  { topic: "Acids & bases", topicKm: "អាស៊ីត និងបាស", difficulty: "Medium",
    prompt: "What is the pH of 0.01 M HCl?", promptKm: "តើ pH នៃ HCl កំហាប់ 0.01 M ស្មើនឹងប៉ុន្មាន?",
    options: ["2", "1", "12", "0.01"], answer: "2",
    explanation: "HCl fully dissociates, so [H⁺] = 0.01 = 10⁻². pH = −log(10⁻²) = 2.", explanationKm: "HCl បំបែកទាំងស្រុង ដូច្នេះ [H⁺] = 0.01 = 10⁻²។ pH = −log(10⁻²) = 2។",
    formula: "pH = −log[H⁺]", formulaKm: "pH = −log[H⁺]" },
  { topic: "Balancing", topicKm: "តុល្យភាពសមីការ", difficulty: "Easy",
    prompt: "In 2H₂ + O₂ → 2H₂O, what is the coefficient of H₂?", promptKm: "ក្នុងសមីការ 2H₂ + O₂ → 2H₂O តើមេគុណនៃ H₂ ស្មើនឹងប៉ុន្មាន?",
    options: ["2", "1", "3", "4"], answer: "2",
    explanation: "Balance hydrogen and oxygen on both sides: 2H₂ + O₂ → 2H₂O.", explanationKm: "តុល្យភាពអាតូមអ៊ីដ្រូសែន និងអុកសីហ្សែនទាំងសងខាង៖ 2H₂ + O₂ → 2H₂O។",
    formula: "Conserve atoms of each element on both sides", formulaKm: "រក្សាចំនួនអាតូមនីមួយៗឲ្យស្មើគ្នាទាំងសងខាង" },
], true);

const ADDED = withChapter(...CH, [
  { topic: "Molarity", topicKm: "កំហាប់ម៉ូល", difficulty: "Medium",
    prompt: "A solution contains 0.5 mol of NaOH dissolved to make 250 mL of solution. What is its molarity?", promptKm: "សូលុយស្យុងមួយមាន NaOH 0.5 mol រំលាយបានម៉ាឌ 250 mL។ តើកំហាប់ម៉ូលរបស់វាស្មើប៉ុន្មាន?",
    options: ["2 M", "0.5 M", "0.125 M", "125 M"], answer: "2 M",
    explanation: "C = n ÷ V = 0.5 mol ÷ 0.250 L = 2 mol/L.", explanationKm: "C = n ÷ V = 0.5 mol ÷ 0.250 L = 2 mol/L។",
    formula: "C = n ÷ V", formulaKm: "C = n ÷ V" },
  { topic: "Molar mass", topicKm: "ម៉ាស់ម៉ូល", difficulty: "Easy",
    prompt: "What is the mass of 0.25 mol of NaOH? (M = 40 g/mol)", promptKm: "តើ NaOH 0.25 mol មានម៉ាស់ប៉ុន្មាន? (M = 40 g/mol)",
    options: ["10 g", "4 g", "160 g", "0.00625 g"], answer: "10 g",
    explanation: "m = n × M = 0.25 × 40 = 10 g.", explanationKm: "m = n × M = 0.25 × 40 = 10 g។",
    formula: "m = n × M", formulaKm: "m = n × M" },
  { topic: "Dilution", topicKm: "ការរំលាយ", difficulty: "Medium",
    prompt: "10 mL of 1.0 M HCl is diluted with water to a total volume of 100 mL. What is the new concentration?", promptKm: "យកសូលុយស្យុង HCl 1.0 M ចំនួន 10 mL មករំលាយជាមួយទឹកឱ្យបានម៉ាឌសរុប 100 mL។ តើកំហាប់ថ្មីស្មើប៉ុន្មាន?",
    options: ["0.1 M", "1.0 M", "0.01 M", "10 M"], answer: "0.1 M",
    explanation: "The moles of solute do not change: C₁V₁ = C₂V₂, so C₂ = 1.0 × 10 ÷ 100 = 0.1 M.", explanationKm: "ចំនួនម៉ូលនៃសារធាតុរំលាយមិនប្រែប្រួលទេ៖ C₁V₁ = C₂V₂ ដូច្នេះ C₂ = 1.0 × 10 ÷ 100 = 0.1 M។",
    formula: "C₁V₁ = C₂V₂", formulaKm: "C₁V₁ = C₂V₂" },
  { topic: "Gas volume at STP", topicKm: "ម៉ាឌឧស្ម័ននៅ STP", difficulty: "Easy",
    prompt: "What volume does 0.5 mol of any gas occupy at STP? (Vₘ = 22.4 L/mol)", promptKm: "តើឧស្ម័នណាមួយ 0.5 mol មានម៉ាឌប៉ុន្មាននៅ STP? (Vₘ = 22.4 L/mol)",
    options: ["11.2 L", "22.4 L", "44.8 L", "5.6 L"], answer: "11.2 L",
    explanation: "V = n × Vₘ = 0.5 × 22.4 = 11.2 L.", explanationKm: "V = n × Vₘ = 0.5 × 22.4 = 11.2 L។",
    formula: "V = n × Vₘ", formulaKm: "V = n × Vₘ" },
]);

export const FOUNDATIONS = [...ORIGINAL, ...ADDED];
