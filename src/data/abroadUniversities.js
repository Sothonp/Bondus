/* Study-abroad university data for the Discovery Engine's country filter — a curated starting
   list, NOT an audited enrollment statistic. Real institutions with real reputations, but which
   ones Cambodian students "most commonly" attend isn't a published, verifiable figure (checked
   via web search before writing this file — Fulbright/Australia Awards/Manaaki NZ Scholarships
   placements are handled case-by-case and no institution-level breakdown is public). Selection
   favors well-known scholarship-program partners, large research universities, and, where
   relevant, real Khmer diaspora hubs (noted per entry) — a reasonable first cut to replace with
   real placement/enrollment data later, not ground truth. Tuition figures are illustrative
   estimates, same disclaimer as UNI_PROFILE_INFO in universities.js.

   `logo` points at Wikipedia's Special:FilePath redirect for that school's own infobox logo/seal
   file (stable regardless of the underlying Commons file hash; ?width=250 requests a small
   rendition) — real official marks, used the same nominative-fair-use way any college-search or
   comparison site displays them for identification, not endorsement. UniLogo already falls back
   to a plain icon if an image 404s, so a broken link degrades gracefully rather than breaking
   the page.

   Shape matches a merged UNIS + UNI_PROFILE_INFO entry (abbr, n, location, tags, budgetTier,
   tuitionUSDPerYear, languageOfInstruction, degreeLevels, note, logo, c) so scoreUniversityMatch()
   in Frontend/App.jsx works against these entries unmodified via its optional `info` override
   parameter — no separate scoring path needed for abroad universities. `tags` uses the same
   UNI_FIELDS ids as domestic data, so major filtering needs no extra vocabulary. */

const FILE_PATH = "https://en.wikipedia.org/wiki/Special:FilePath/";
const logo = (filename) => `${FILE_PATH}${filename}?width=250`;

export const ABROAD_COUNTRIES = [
  { id: "US", label: "United States" },
  { id: "AU", label: "Australia" },
  { id: "CA", label: "Canada" },
  { id: "NZ", label: "New Zealand" },
];

export const ABROAD_UNIVERSITIES = {
  US: [
    {
      abbr: "CSULB", n: "California State University, Long Beach", location: "Long Beach, California",
      logo: logo("CSU-Longbeach_seal.svg"), c: "var(--primary)",
      tags: ["business", "computer_science", "engineering", "social_sciences", "other"],
      budgetTier: "medium", tuitionUSDPerYear: { min: 19000, max: 24000 },
      languageOfInstruction: ["English"], degreeLevels: ["Bachelor's", "Master's"],
      note: "Long Beach is home to the largest Cambodian community outside Cambodia (\"Cambodia Town\"), making CSULB a common landing point for Khmer students and families in the US.",
    },
    {
      abbr: "UCLA", n: "University of California, Los Angeles", location: "Los Angeles, California",
      logo: logo("University_of_California,_Los_Angeles_logo.svg"), c: "var(--gold)",
      tags: ["computer_science", "engineering", "business", "medicine", "social_sciences", "design"],
      budgetTier: "high", tuitionUSDPerYear: { min: 45000, max: 60000 },
      languageOfInstruction: ["English"], degreeLevels: ["Bachelor's", "Master's", "PhD"],
      note: "A top-ranked public research university close to Southern California's large Southeast Asian community.",
    },
    {
      abbr: "UW", n: "University of Washington", location: "Seattle, Washington",
      logo: logo("University_of_Washington_seal.svg"), c: "var(--jade)",
      tags: ["computer_science", "engineering", "data_science", "business", "medicine"],
      budgetTier: "high", tuitionUSDPerYear: { min: 38000, max: 52000 },
      languageOfInstruction: ["English"], degreeLevels: ["Bachelor's", "Master's", "PhD"],
      note: "Seattle has a well-established Khmer community, and UW is a frequent Fulbright graduate-study destination.",
    },
    {
      abbr: "ASU", n: "Arizona State University", location: "Tempe, Arizona",
      logo: logo("Arizona_State_University_seal.svg"), c: "var(--ember)",
      tags: ["business", "engineering", "computer_science", "education", "other"],
      budgetTier: "medium", tuitionUSDPerYear: { min: 29000, max: 34000 },
      languageOfInstruction: ["English"], degreeLevels: ["Bachelor's", "Master's"],
      note: "One of the largest US universities by international enrollment, with well-supported pathway programs.",
    },
    {
      abbr: "UMN", n: "University of Minnesota, Twin Cities", location: "Minneapolis, Minnesota",
      logo: logo("Seal_of_the_University_of_Minnesota.svg"), c: "var(--muted)",
      tags: ["engineering", "business", "medicine", "social_sciences", "data_science"],
      budgetTier: "high", tuitionUSDPerYear: { min: 35000, max: 44000 },
      languageOfInstruction: ["English"], degreeLevels: ["Bachelor's", "Master's", "PhD"],
      note: "A frequent host institution for Fulbright graduate scholars from Cambodia.",
    },
    {
      abbr: "Harvard", n: "Harvard University", location: "Cambridge, Massachusetts",
      logo: logo("Harvard_University_logo.svg"), c: "var(--primary)",
      tags: ["law", "business", "medicine", "social_sciences", "education"],
      budgetTier: "high", tuitionUSDPerYear: { min: 56000, max: 60000 },
      languageOfInstruction: ["English"], degreeLevels: ["Bachelor's", "Master's", "PhD"],
      note: "One of the most internationally recognized universities in the world and a common Fulbright graduate placement.",
    },
    {
      abbr: "MIT", n: "Massachusetts Institute of Technology", location: "Cambridge, Massachusetts",
      logo: logo("MIT_Seal.svg"), c: "var(--gold)",
      tags: ["computer_science", "engineering", "data_science", "other"],
      budgetTier: "high", tuitionUSDPerYear: { min: 57000, max: 61000 },
      languageOfInstruction: ["English"], degreeLevels: ["Bachelor's", "Master's", "PhD"],
      note: "Globally renowned for engineering and computer science — a reach school for top STEM applicants.",
    },
    {
      abbr: "UIUC", n: "University of Illinois Urbana-Champaign", location: "Urbana-Champaign, Illinois",
      logo: logo("University_of_Illinois_seal.svg"), c: "var(--jade)",
      tags: ["engineering", "computer_science", "business", "data_science"],
      budgetTier: "high", tuitionUSDPerYear: { min: 34000, max: 41000 },
      languageOfInstruction: ["English"], degreeLevels: ["Bachelor's", "Master's", "PhD"],
      note: "One of the largest engineering and computer science programs in the US, with strong international student support.",
    },
    {
      abbr: "SJSU", n: "San José State University", location: "San José, California",
      logo: logo("SJSU_Seal.svg"), c: "var(--ember)",
      tags: ["business", "engineering", "computer_science", "design"],
      budgetTier: "medium", tuitionUSDPerYear: { min: 19000, max: 23000 },
      languageOfInstruction: ["English"], degreeLevels: ["Bachelor's", "Master's"],
      note: "Located in the heart of Silicon Valley, with strong ties to the Bay Area's large Southeast Asian community.",
    },
  ],
  AU: [
    {
      abbr: "ANU", n: "Australian National University", location: "Canberra",
      logo: logo("Australian_National_University_(emblem).svg"), c: "var(--primary)",
      tags: ["social_sciences", "business", "law", "data_science", "other"],
      budgetTier: "high", tuitionUSDPerYear: { min: 30000, max: 45000 },
      languageOfInstruction: ["English"], degreeLevels: ["Bachelor's", "Master's", "PhD"],
      note: "A common Australia Awards Scholarship destination for Cambodian postgraduate students.",
    },
    {
      abbr: "UniMelb", n: "University of Melbourne", location: "Melbourne",
      logo: logo("The_University_of_Melbourne_Logo.svg"), c: "var(--gold)",
      tags: ["business", "engineering", "medicine", "law", "design", "social_sciences"],
      budgetTier: "high", tuitionUSDPerYear: { min: 32000, max: 48000 },
      languageOfInstruction: ["English"], degreeLevels: ["Bachelor's", "Master's", "PhD"],
      note: "Australia's top-ranked university and a Group of Eight member — a common Australia Awards placement.",
    },
    {
      abbr: "USyd", n: "University of Sydney", location: "Sydney",
      logo: logo("The_University_of_Sydney_Logo.svg"), c: "var(--jade)",
      tags: ["business", "engineering", "medicine", "law", "data_science"],
      budgetTier: "high", tuitionUSDPerYear: { min: 32000, max: 47000 },
      languageOfInstruction: ["English"], degreeLevels: ["Bachelor's", "Master's", "PhD"],
      note: "One of Australia's most recognized universities among Southeast Asian applicants.",
    },
    {
      abbr: "Monash", n: "Monash University", location: "Melbourne",
      logo: logo("Monash_University_logo-en.svg"), c: "var(--ember)",
      tags: ["business", "engineering", "computer_science", "medicine", "design"],
      budgetTier: "medium", tuitionUSDPerYear: { min: 28000, max: 40000 },
      languageOfInstruction: ["English"], degreeLevels: ["Bachelor's", "Master's", "PhD"],
      note: "A large international student body with strong business and IT programs.",
    },
    {
      abbr: "RMIT", n: "RMIT University", location: "Melbourne",
      logo: logo("RMIT_University_Logo.svg"), c: "var(--muted)",
      tags: ["design", "business", "information_technology", "engineering"],
      budgetTier: "medium", tuitionUSDPerYear: { min: 25000, max: 36000 },
      languageOfInstruction: ["English"], degreeLevels: ["Bachelor's", "Master's"],
      note: "Well known across Southeast Asia for design, IT and business programs.",
    },
    {
      abbr: "UQ", n: "University of Queensland", location: "Brisbane",
      logo: logo("Logo_of_the_University_of_Queensland.svg"), c: "var(--primary)",
      tags: ["engineering", "medicine", "business", "social_sciences"],
      budgetTier: "high", tuitionUSDPerYear: { min: 30000, max: 44000 },
      languageOfInstruction: ["English"], degreeLevels: ["Bachelor's", "Master's", "PhD"],
      note: "A Group of Eight member in Brisbane, popular with Australia Awards scholars in engineering and agriculture.",
    },
    {
      abbr: "UNSW", n: "University of New South Wales", location: "Sydney",
      logo: logo("University_of_New_South_Wales_Logo.png"), c: "var(--gold)",
      tags: ["engineering", "business", "computer_science", "law", "design"],
      budgetTier: "high", tuitionUSDPerYear: { min: 32000, max: 46000 },
      languageOfInstruction: ["English"], degreeLevels: ["Bachelor's", "Master's", "PhD"],
      note: "Strong engineering and business reputation, based in Sydney.",
    },
    {
      abbr: "Adelaide", n: "University of Adelaide", location: "Adelaide",
      logo: logo("The_University_of_Adelaide_Logo.svg"), c: "var(--jade)",
      tags: ["engineering", "medicine", "business", "social_sciences"],
      budgetTier: "medium", tuitionUSDPerYear: { min: 28000, max: 38000 },
      languageOfInstruction: ["English"], degreeLevels: ["Bachelor's", "Master's", "PhD"],
      note: "A Group of Eight university with a lower cost of living than Sydney or Melbourne.",
    },
    {
      abbr: "Deakin", n: "Deakin University", location: "Melbourne",
      logo: logo("Deakin_University_Logo_2017.svg"), c: "var(--ember)",
      tags: ["business", "information_technology", "design", "education"],
      budgetTier: "medium", tuitionUSDPerYear: { min: 24000, max: 32000 },
      languageOfInstruction: ["English"], degreeLevels: ["Bachelor's", "Master's"],
      note: "Well known across Southeast Asia for flexible, career-focused business and IT programs.",
    },
  ],
  CA: [
    {
      abbr: "UofT", n: "University of Toronto", location: "Toronto, Ontario",
      logo: logo("UofT_logo.svg"), c: "var(--primary)",
      tags: ["engineering", "business", "medicine", "computer_science", "social_sciences"],
      budgetTier: "high", tuitionUSDPerYear: { min: 40000, max: 58000 },
      languageOfInstruction: ["English"], degreeLevels: ["Bachelor's", "Master's", "PhD"],
      note: "Canada's most internationally recognized university, with a large international student population.",
    },
    {
      abbr: "UBC", n: "University of British Columbia", location: "Vancouver, British Columbia",
      logo: logo("British_columbia_ca_univ_logo.svg"), c: "var(--gold)",
      tags: ["business", "engineering", "computer_science", "medicine", "social_sciences"],
      budgetTier: "high", tuitionUSDPerYear: { min: 38000, max: 52000 },
      languageOfInstruction: ["English"], degreeLevels: ["Bachelor's", "Master's", "PhD"],
      note: "Vancouver has a growing Southeast Asian international student community.",
    },
    {
      abbr: "McGill", n: "McGill University", location: "Montreal, Quebec",
      logo: logo("Mcgill_univ_ca_logo.png"), c: "var(--jade)",
      tags: ["medicine", "engineering", "business", "law", "social_sciences"],
      budgetTier: "high", tuitionUSDPerYear: { min: 35000, max: 50000 },
      languageOfInstruction: ["English", "French"], degreeLevels: ["Bachelor's", "Master's", "PhD"],
      note: "One of Canada's most selective universities, popular for graduate research.",
    },
    {
      abbr: "UAlberta", n: "University of Alberta", location: "Edmonton, Alberta",
      logo: logo("University_of_Alberta_Logo_(2021).svg"), c: "var(--ember)",
      tags: ["engineering", "business", "medicine", "data_science"],
      budgetTier: "medium", tuitionUSDPerYear: { min: 25000, max: 34000 },
      languageOfInstruction: ["English"], degreeLevels: ["Bachelor's", "Master's", "PhD"],
      note: "Relatively lower international tuition with strong engineering programs.",
    },
    {
      abbr: "SFU", n: "Simon Fraser University", location: "Burnaby, British Columbia",
      logo: logo("Simon_Fraser_University_Logo.svg"), c: "var(--muted)",
      tags: ["business", "computer_science", "engineering", "education"],
      budgetTier: "medium", tuitionUSDPerYear: { min: 26000, max: 33000 },
      languageOfInstruction: ["English"], degreeLevels: ["Bachelor's", "Master's"],
      note: "Known for co-op programs that combine study with paid work terms.",
    },
    {
      abbr: "Waterloo", n: "University of Waterloo", location: "Waterloo, Ontario",
      logo: logo("University_of_Waterloo_logo.svg"), c: "var(--primary)",
      tags: ["computer_science", "engineering", "data_science", "business"],
      budgetTier: "high", tuitionUSDPerYear: { min: 38000, max: 50000 },
      languageOfInstruction: ["English"], degreeLevels: ["Bachelor's", "Master's", "PhD"],
      note: "Canada's most recognized school for computer science and engineering co-op programs.",
    },
    {
      abbr: "Ottawa", n: "University of Ottawa", location: "Ottawa, Ontario",
      logo: logo("University_of_Ottawa_Logo.svg"), c: "var(--gold)",
      tags: ["law", "social_sciences", "business", "engineering"],
      budgetTier: "medium", tuitionUSDPerYear: { min: 28000, max: 36000 },
      languageOfInstruction: ["English", "French"], degreeLevels: ["Bachelor's", "Master's", "PhD"],
      note: "Canada's largest bilingual (English/French) university, located in the national capital.",
    },
    {
      abbr: "York", n: "York University", location: "Toronto, Ontario",
      logo: logo("Logo_York_University.svg"), c: "var(--jade)",
      tags: ["business", "social_sciences", "law", "education"],
      budgetTier: "medium", tuitionUSDPerYear: { min: 27000, max: 35000 },
      languageOfInstruction: ["English"], degreeLevels: ["Bachelor's", "Master's", "PhD"],
      note: "Home to the Schulich School of Business, one of Canada's most recognized business schools.",
    },
    {
      abbr: "Calgary", n: "University of Calgary", location: "Calgary, Alberta",
      logo: logo("University_of_Calgary_Logo.svg"), c: "var(--ember)",
      tags: ["engineering", "business", "medicine", "data_science"],
      budgetTier: "medium", tuitionUSDPerYear: { min: 26000, max: 34000 },
      languageOfInstruction: ["English"], degreeLevels: ["Bachelor's", "Master's", "PhD"],
      note: "Lower cost of living than Toronto or Vancouver, with strong engineering and energy-sector ties.",
    },
  ],
  NZ: [
    {
      abbr: "UoA", n: "University of Auckland", location: "Auckland",
      logo: logo("University_of_Auckland_logo.svg"), c: "var(--primary)",
      tags: ["business", "engineering", "medicine", "computer_science", "law"],
      budgetTier: "medium", tuitionUSDPerYear: { min: 22000, max: 35000 },
      languageOfInstruction: ["English"], degreeLevels: ["Bachelor's", "Master's", "PhD"],
      note: "New Zealand's largest and highest-ranked university, and a Manaaki New Zealand Scholarships partner.",
    },
    {
      abbr: "VUW", n: "Victoria University of Wellington", location: "Wellington",
      logo: logo("Victoria_University_of_Wellington_logo.svg"), c: "var(--gold)",
      tags: ["law", "social_sciences", "business", "design"],
      budgetTier: "medium", tuitionUSDPerYear: { min: 20000, max: 30000 },
      languageOfInstruction: ["English"], degreeLevels: ["Bachelor's", "Master's", "PhD"],
      note: "Located in the capital, with particular strength in law, public policy and social sciences.",
    },
    {
      abbr: "Otago", n: "University of Otago", location: "Dunedin",
      logo: logo("University_of_Otago_logo_2024.svg"), c: "var(--jade)",
      tags: ["medicine", "social_sciences", "business"],
      budgetTier: "medium", tuitionUSDPerYear: { min: 20000, max: 32000 },
      languageOfInstruction: ["English"], degreeLevels: ["Bachelor's", "Master's", "PhD"],
      note: "New Zealand's oldest university, well regarded for health sciences.",
    },
    {
      abbr: "Massey", n: "Massey University", location: "Palmerston North / Auckland / Wellington",
      logo: logo("Massey_University_Logo.svg"), c: "var(--ember)",
      tags: ["business", "education", "engineering", "design"],
      budgetTier: "low", tuitionUSDPerYear: { min: 18000, max: 26000 },
      languageOfInstruction: ["English"], degreeLevels: ["Bachelor's", "Master's", "PhD"],
      note: "A Manaaki New Zealand Scholarships destination with multiple campuses across the country.",
    },
    {
      abbr: "Canterbury", n: "University of Canterbury", location: "Christchurch",
      logo: logo("University_of_Canterbury_Coat_of_Arms.svg"), c: "var(--muted)",
      tags: ["engineering", "business", "computer_science"],
      budgetTier: "medium", tuitionUSDPerYear: { min: 21000, max: 31000 },
      languageOfInstruction: ["English"], degreeLevels: ["Bachelor's", "Master's", "PhD"],
      note: "Based in Christchurch, well regarded for engineering.",
    },
    {
      abbr: "Lincoln", n: "Lincoln University", location: "Lincoln, Canterbury",
      logo: logo("Lincoln_University_logo.svg"), c: "var(--primary)",
      tags: ["business", "other"],
      budgetTier: "low", tuitionUSDPerYear: { min: 17000, max: 24000 },
      languageOfInstruction: ["English"], degreeLevels: ["Bachelor's", "Master's"],
      note: "A smaller, specialized university near Christchurch with lower tuition than the larger city universities.",
    },
    {
      abbr: "AUT", n: "Auckland University of Technology", location: "Auckland",
      logo: logo("Logo_of_Auckland_University_of_Technology.svg"), c: "var(--gold)",
      tags: ["business", "design", "computer_science", "information_technology"],
      budgetTier: "medium", tuitionUSDPerYear: { min: 20000, max: 28000 },
      languageOfInstruction: ["English"], degreeLevels: ["Bachelor's", "Master's"],
      note: "A practical, career-focused university in central Auckland, popular with international students.",
    },
    {
      abbr: "Waikato", n: "University of Waikato", location: "Hamilton",
      logo: logo("University_of_Waikato_logo.svg"), c: "var(--jade)",
      tags: ["business", "computer_science", "education"],
      budgetTier: "low", tuitionUSDPerYear: { min: 18000, max: 25000 },
      languageOfInstruction: ["English"], degreeLevels: ["Bachelor's", "Master's", "PhD"],
      note: "Located in Hamilton, with a well-regarded management school and lower cost of living than Auckland.",
    },
  ],
};
