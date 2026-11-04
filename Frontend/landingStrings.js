/* The words on the scrolling landing page (Landing.jsx), kept apart from App.jsx's STRINGS table like moreStrings.js so this
   part is one self-contained piece. Every key has both languages and every Khmer line has Khmer letters in it
   (landing.test.js checks it). The Khmer is a first draft in the app's own vocabulary and should be read by a native speaker.

   The wording is deliberately plain about what is real: the demo screens are labelled as samples, and the numbers in the FAQ
   match the plans page (Free 5 AI questions a day, VIP Bondus 60, Super Bondus 150). If the plans change, change them here too. */
export const LANDING_STRINGS = {
  en: {
    // nav + hero extras
    navFeatures: "Features", navHow: "How it works", navFaq: "FAQ", navLogin: "Log in", navLabel: "Page sections", navHome: "BONDUS home",
    scrollCue: "Scroll to explore",

    // interactive preview
    previewTitle: "See BONDUS in action",
    previewSub: "Tap through the tabs for a quick look inside the app.",
    previewNote: "Sample screens, shown for illustration.",
    previewTabs: "App previews",
    tabExam: "Grade 12 Exam Prep", tabExamDesc: "Practise BacII-style questions by subject and chapter, and see where you stand.",
    tabMentor: "AI Mentor", tabMentorDesc: "Ask anything and get the answer broken down step by step, in Khmer or English.",
    tabUni: "University Hub", tabUniDesc: "Compare universities and majors, then see what it takes to get in.",
    tabScholar: "Scholarship Center", tabScholarDesc: "Find scholarships and keep track of what you need to apply.",
    previewCta: "Try it free",
    demoExamSubject: "Mathematics · Integrals", demoExamCounter: "Question 3 of 10",
    demoExamCorrect: "Correct!", demoExamWhy: "The antiderivative of 2x is x², and 1² − 0² = 1.",
    demoExamReady: "Exam readiness",
    demoAsk: "Why is the derivative of x² equal to 2x?", demoMentor: "AI Mentor",
    demoStep1: "Bring the exponent down as a multiplier.", demoStep2: "Subtract 1 from the exponent.", demoStep3: "So x² becomes 2·x¹, which is 2x.",
    demoPractice: "Practise a question",
    demoUniTitle: "Universities", demoUniSearch: "Search universities or majors",
    demoSchTitle: "Scholarships", demoSch1: "Merit scholarship", demoSch2: "Need-based support", demoSch3: "Study-abroad award",
    demoSchTag: "Sample", demoSchRemind: "Remind me", demoSchChecklist: "Application checklist",

    // features
    featuresTitle: "Everything you need to prepare for the BacII",
    featuresSub: "One place to practise, plan and choose where to study next.",
    featExamTitle: "AI Exam Practice", featExamBody: "Practise by subject and chapter, then learn from a clear explanation of every answer.",
    featUniTitle: "University Hub", featUniBody: "Explore universities and majors in Cambodia and see what you need to get in.",
    featSchTitle: "Scholarship Finder", featSchBody: "Browse scholarships and keep your application steps in one place.",
    featLangTitle: "Bilingual Support", featLangBody: "Use the app in Khmer or English, whichever feels easier, and switch any time.",
    featPlanTitle: "Daily Plan & Streaks", featPlanBody: "A study plan for today and a streak that keeps you coming back.",
    featReadyTitle: "Exam Readiness", featReadyBody: "See your strong and weak subjects so you know what to study next.",

    // stats
    statsLabel: "BONDUS at a glance",
    statQuestions: "Practice questions",
    statGradeValue: "Grade 12", statGradeLabel: "Focused on the BacII",
    statAiValue: "24/7", statAiLabel: "AI assistance",

    // how it works
    howTitle: "How it works", howSub: "From sign-up to exam-ready in three steps.",
    howStep1: "Create your free account", howStep1Body: "Sign in with Google or Facebook. It only takes a moment.",
    howStep2: "Choose your subjects and target university", howStep2Body: "Tell us your track and where you want to study, so your plan fits you.",
    howStep3: "Practice with AI feedback", howStep3Body: "Answer questions, learn from the explanations and watch your exam readiness grow.",
    howStepLabel: "Step {n}",

    // FAQ
    faqTitle: "Frequently asked questions", faqSub: "Quick answers before you start.",
    faq1Q: "Does BONDUS cover the Grade 12 curriculum?",
    faq1A: "BONDUS is built for Cambodian Grade 12 students preparing for the BacII, in both the Science and Social Science tracks. Practice questions cover Mathematics, Chemistry, Biology, Physics, History and more, and the question bank keeps growing.",
    faq2Q: "What does the free plan include, and what are the limits?",
    faq2A: "Free lets you practise, follow a study plan and keep a streak, with 5 AI questions a day. VIP Bondus ($2.99/month) gives 60 AI questions and 10 photo or PDF uploads a day. Super Bondus ($5.99/month) gives 150 AI questions and 40 uploads a day, plus deeper analysis.",
    faq3Q: "How often is the university information updated?",
    faq3A: "The University Hub covers seven universities today, including RUPP, ITC, AUPP, NUM, RULE, CADT and UHS. We update it when we learn of changes, but requirements and deadlines can change, so always check the university's official announcement before you apply.",
    faq4Q: "Can I use BONDUS in Khmer?",
    faq4A: "Yes. Tap the language button at the top of the page, or inside the app, to switch between Khmer and English at any time.",
    faq5Q: "Do I need to install anything?",
    faq5A: "No. BONDUS runs in your phone's browser, so you can start right away. Create an account with Google or Facebook and you are in.",

    // closing call to action
    ctaTitle: "Ready to study smarter?", ctaBody: "Join BONDUS and spend less time searching and more time learning.",

    // footer
    footTagline: "Less Time Searching, More Time Learning!",
    footExplore: "Explore", footStart: "Get started", footLegal: "Legal", footPrivacy: "Privacy Policy", footTerms: "Terms of Service",
    footContact: "Contact us", footFollow: "Follow BONDUS",
    footCopy: "© {year} BONDUS. All rights reserved.", footMade: "Made for Cambodian students.",
  },
  km: {
    navFeatures: "លក្ខណៈពិសេស", navHow: "របៀបប្រើ", navFaq: "សំណួរញឹកញាប់", navLogin: "ចូលគណនី", navLabel: "ផ្នែកនៃទំព័រ", navHome: "ទំព័រដើម BONDUS",
    scrollCue: "រមូរចុះក្រោមដើម្បីស្វែងយល់",

    previewTitle: "មើល BONDUS ដំណើរការ",
    previewSub: "ចុចផ្ទាំងនីមួយៗ ដើម្បីមើលអ្វីដែលមាននៅក្នុងកម្មវិធី។",
    previewNote: "ទាំងនេះជាអេក្រង់គំរូ សម្រាប់បង្ហាញប៉ុណ្ណោះ។",
    previewTabs: "ការមើលកម្មវិធីជាមុន",
    tabExam: "ត្រៀមប្រឡងថ្នាក់ទី១២", tabExamDesc: "ហាត់សំណួរបែប BacII តាមមុខវិជ្ជា និងជំពូក ហើយដឹងថាអ្នកនៅត្រង់ណា។",
    tabMentor: "គ្រូ AI", tabMentorDesc: "សួរអ្វីក៏បាន ហើយទទួលបានចម្លើយពន្យល់ម្តងមួយជំហាន ជាភាសាខ្មែរ ឬអង់គ្លេស។",
    tabUni: "មជ្ឈមណ្ឌលសាកលវិទ្យាល័យ", tabUniDesc: "ប្រៀបធៀបសាកលវិទ្យាល័យ និងជំនាញ រួចមើលថាត្រូវការអ្វីខ្លះដើម្បីចូលរៀន។",
    tabScholar: "មជ្ឈមណ្ឌលអាហារូបករណ៍", tabScholarDesc: "ស្វែងរកអាហារូបករណ៍ និងតាមដានអ្វីដែលត្រូវមានសម្រាប់ដាក់ពាក្យ។",
    previewCta: "សាកល្បងដោយឥតគិតថ្លៃ",
    demoExamSubject: "គណិតវិទ្យា · អាំងតេក្រាល", demoExamCounter: "សំណួរទី ៣ ក្នុងចំណោម ១០",
    demoExamCorrect: "ត្រឹមត្រូវ!", demoExamWhy: "ព្រីមីទីវនៃ 2x គឺ x² ហើយ 1² − 0² = 1។",
    demoExamReady: "ភាពត្រៀមខ្លួនប្រឡង",
    demoAsk: "ហេតុអ្វីបានជាដេរីវេនៃ x² ស្មើនឹង 2x?", demoMentor: "គ្រូ AI",
    demoStep1: "យកស្វ័យគុណមកធ្វើជាមេគុណ។", demoStep2: "ដកស្វ័យគុណចេញ ១។", demoStep3: "ដូច្នេះ x² ក្លាយជា 2·x¹ ពោលគឺ 2x។",
    demoPractice: "ហាត់សំណួរមួយ",
    demoUniTitle: "សាកលវិទ្យាល័យ", demoUniSearch: "ស្វែងរកសាកលវិទ្យាល័យ ឬជំនាញ",
    demoSchTitle: "អាហារូបករណ៍", demoSch1: "អាហារូបករណ៍តាមសមត្ថភាព", demoSch2: "ជំនួយតាមតម្រូវការ", demoSch3: "អាហារូបករណ៍សិក្សានៅបរទេស",
    demoSchTag: "គំរូ", demoSchRemind: "រំលឹកខ្ញុំ", demoSchChecklist: "បញ្ជីត្រួតពិនិត្យការដាក់ពាក្យ",

    featuresTitle: "អ្វីៗទាំងអស់ដែលអ្នកត្រូវការដើម្បីត្រៀមប្រឡង BacII",
    featuresSub: "កន្លែងតែមួយសម្រាប់ហាត់ធ្វើផែនការ និងជ្រើសរើសកន្លែងសិក្សាបន្ត។",
    featExamTitle: "ហាត់ប្រឡងជាមួយ AI", featExamBody: "ហាត់តាមមុខវិជ្ជា និងជំពូក រួចរៀនពីការពន្យល់ច្បាស់លាស់នៃចម្លើយនីមួយៗ។",
    featUniTitle: "មជ្ឈមណ្ឌលសាកលវិទ្យាល័យ", featUniBody: "ស្វែងយល់អំពីសាកលវិទ្យាល័យ និងជំនាញនៅកម្ពុជា ហើយដឹងថាត្រូវការអ្វីខ្លះដើម្បីចូលរៀន។",
    featSchTitle: "ស្វែងរកអាហារូបករណ៍", featSchBody: "មើលអាហារូបករណ៍ និងរក្សាជំហានដាក់ពាក្យទាំងអស់នៅកន្លែងតែមួយ។",
    featLangTitle: "ពីរភាសា", featLangBody: "ប្រើកម្មវិធីជាភាសាខ្មែរ ឬអង់គ្លេស តាមដែលងាយស្រួលជាង ហើយប្តូរបានគ្រប់ពេល។",
    featPlanTitle: "ផែនការប្រចាំថ្ងៃ និងថ្ងៃជាប់ៗគ្នា", featPlanBody: "ផែនការសិក្សាសម្រាប់ថ្ងៃនេះ និងថ្ងៃជាប់ៗគ្នាដែលជួយឱ្យអ្នកមករៀនរាល់ថ្ងៃ។",
    featReadyTitle: "ភាពត្រៀមខ្លួនប្រឡង", featReadyBody: "មើលមុខវិជ្ជាខ្លាំង និងខ្សោយរបស់អ្នក ដើម្បីដឹងថាត្រូវរៀនអ្វីបន្ទាប់។",

    statsLabel: "BONDUS ក្នុងមួយភ្លែត",
    statQuestions: "សំណួរហាត់",
    statGradeValue: "ថ្នាក់ទី១២", statGradeLabel: "ផ្តោតលើការប្រឡង BacII",
    statAiValue: "២៤/៧", statAiLabel: "ជំនួយពី AI",

    howTitle: "របៀបប្រើប្រាស់", howSub: "ពីការចុះឈ្មោះ ដល់ត្រៀមខ្លួនប្រឡង ក្នុងបីជំហាន។",
    howStep1: "បង្កើតគណនីឥតគិតថ្លៃ", howStep1Body: "ចូលជាមួយ Google ឬ Facebook។ ប្រើពេលតែបន្តិចប៉ុណ្ណោះ។",
    howStep2: "ជ្រើសរើសមុខវិជ្ជា និងសាកលវិទ្យាល័យគោលដៅ", howStep2Body: "ប្រាប់យើងអំពីផ្នែករបស់អ្នក និងកន្លែងដែលអ្នកចង់រៀន ដើម្បីឱ្យផែនការស័ក្តិសមនឹងអ្នក។",
    howStep3: "ហាត់ជាមួយមតិកែលម្អពី AI", howStep3Body: "ឆ្លើយសំណួរ រៀនពីការពន្យល់ ហើយមើលភាពត្រៀមខ្លួនប្រឡងរបស់អ្នកកើនឡើង។",
    howStepLabel: "ជំហានទី {n}",

    faqTitle: "សំណួរដែលសួរញឹកញាប់", faqSub: "ចម្លើយខ្លីៗ មុនពេលអ្នកចាប់ផ្តើម។",
    faq1Q: "តើ BONDUS គ្របដណ្តប់កម្មវិធីសិក្សាថ្នាក់ទី១២ ដែរឬទេ?",
    faq1A: "BONDUS ត្រូវបានបង្កើតឡើងសម្រាប់សិស្សថ្នាក់ទី១២ នៅកម្ពុជាដែលត្រៀមប្រឡង BacII ទាំងផ្នែកវិទ្យាសាស្ត្រ និងវិទ្យាសាស្ត្រសង្គម។ សំណួរហាត់គ្របដណ្តប់គណិតវិទ្យា គីមីវិទ្យា ជីវវិទ្យា រូបវិទ្យា ប្រវត្តិវិទ្យា និងច្រើនទៀត ហើយបណ្តុំសំណួរកំពុងកើនឡើងជានិច្ច។",
    faq2Q: "តើគម្រោងឥតគិតថ្លៃមានអ្វីខ្លះ ហើយមានដែនកំណត់អ្វី?",
    faq2A: "គម្រោងឥតគិតថ្លៃអនុញ្ញាតឱ្យអ្នកហាត់ ធ្វើតាមផែនការសិក្សា និងរក្សាថ្ងៃជាប់ៗគ្នា ជាមួយសំណួរ AI ៥ ក្នុងមួយថ្ងៃ។ VIP Bondus ($2.99/ខែ) ផ្តល់សំណួរ AI ៦០ និងការផ្ទុករូបថត ឬ PDF ១០ ក្នុងមួយថ្ងៃ។ Super Bondus ($5.99/ខែ) ផ្តល់សំណួរ AI ១៥០ និងការផ្ទុក ៤០ ក្នុងមួយថ្ងៃ ព្រមទាំងការវិភាគស៊ីជម្រៅ។",
    faq3Q: "តើព័ត៌មានសាកលវិទ្យាល័យត្រូវបានធ្វើបច្ចុប្បន្នភាពញឹកញាប់ប៉ុណ្ណា?",
    faq3A: "បច្ចុប្បន្នមជ្ឈមណ្ឌលសាកលវិទ្យាល័យគ្របដណ្តប់សាកលវិទ្យាល័យប្រាំពីរ រួមមាន RUPP, ITC, AUPP, NUM, RULE, CADT និង UHS។ យើងធ្វើបច្ចុប្បន្នភាពនៅពេលដែលយើងដឹងពីការផ្លាស់ប្តូរ ប៉ុន្តែលក្ខខណ្ឌ និងកាលកំណត់អាចប្រែប្រួល ដូច្នេះសូមពិនិត្យសេចក្តីជូនដំណឹងផ្លូវការរបស់សាកលវិទ្យាល័យជានិច្ច មុនពេលដាក់ពាក្យ។",
    faq4Q: "តើខ្ញុំអាចប្រើ BONDUS ជាភាសាខ្មែរបានទេ?",
    faq4A: "បាន។ ចុចប៊ូតុងភាសានៅខាងលើទំព័រ ឬក្នុងកម្មវិធី ដើម្បីប្តូររវាងភាសាខ្មែរ និងអង់គ្លេសបានគ្រប់ពេល។",
    faq5Q: "តើខ្ញុំត្រូវដំឡើងអ្វីដែរឬទេ?",
    faq5A: "ទេ។ BONDUS ដំណើរការក្នុងកម្មវិធីរុករករបស់ទូរស័ព្ទអ្នក ដូច្នេះអ្នកអាចចាប់ផ្តើមភ្លាមៗ។ បង្កើតគណនីជាមួយ Google ឬ Facebook ជាការស្រេច។",

    ctaTitle: "ត្រៀមខ្លួនរៀនឱ្យឆ្លាតជាងមុនហើយឬនៅ?", ctaBody: "ចូលរួមជាមួយ BONDUS ហើយចំណាយពេលរកតិច រៀនបានកាន់តែច្រើន។",

    footTagline: "សន្សំសំចៃពេលរក ទទួលបានការសិក្សាកាន់តែច្រើន!",
    footExplore: "ស្វែងយល់", footStart: "ចាប់ផ្តើម", footLegal: "ផ្លូវច្បាប់", footPrivacy: "គោលការណ៍ភាពឯកជន", footTerms: "លក្ខខណ្ឌប្រើប្រាស់",
    footContact: "ទាក់ទងយើង", footFollow: "តាមដាន BONDUS",
    footCopy: "© {year} BONDUS។ រក្សាសិទ្ធិគ្រប់យ៉ាង។", footMade: "បង្កើតឡើងសម្រាប់សិស្សកម្ពុជា។",
  },
};

/** The landing page's words in `lang`; English for a language or key it has none for. */
export function landingText(lang, key) {
  return LANDING_STRINGS[lang === "km" ? "km" : "en"][key] ?? LANDING_STRINGS.en[key] ?? key;
}

export function fillLanding(text, vars = {}) {
  return String(text).replace(/\{(\w+)\}/g, (m, name) => (name in vars ? String(vars[name]) : m));
}
