/* Real Cambodian university & major data — sourced from each university's official site.
   Shared between the frontend (Universities tab, AI Coach) and the /api/major-guidance
   serverless function, so both stay grounded in the same real data. */

export const UNIS = [
  { n: "Royal University of Phnom Penh", nKm: "សាកលវិទ្យាល័យភូមិន្ទភ្នំពេញ", abbr: "RUPP", ready: 42, c: "var(--primary)", logo: "/logos/rupp.png" },
  { n: "Institute of Technology of Cambodia", nKm: "វិទ្យាស្ថានបច្ចេកវិទ្យាកម្ពុជា", abbr: "ITC", ready: 35, c: "var(--ember)", logo: "/logos/itc.png" },
  { n: "American University of Phnom Penh", nKm: "សាកលវិទ្យាល័យអាមេរិកាំងភ្នំពេញ", abbr: "AUPP", ready: 38, c: "var(--gold)", logo: "/logos/aupp.png" },
  { n: "National University of Management", nKm: "សាកលវិទ្យាល័យជាតិគ្រប់គ្រង", abbr: "NUM", ready: 44, c: "var(--jade)", logo: "/logos/num.png" },
  { n: "Royal University of Law and Economics", nKm: "សាកលវិទ្យាល័យភូមិន្ទនីតិសាស្ត្រ និងវិទ្យាសាស្ត្រសេដ្ឋកិច្ច", abbr: "RULE", ready: 30, c: "var(--muted)", logo: "/logos/rule.png" },
  { n: "Cambodia Academy of Digital Technology", nKm: "បណ្ឌិត្យសភាបច្ចេកវិទ្យាឌីជីថលកម្ពុជា", abbr: "CADT", ready: 33, c: "var(--primary)", logo: "/logos/cadt.png" },
  { n: "University of Health Sciences", nKm: "សាកលវិទ្យាល័យវិទ្យាសាស្ត្រសុខាភិបាល", abbr: "UHS", ready: 25, c: "var(--ember)", logo: "/logos/uhs.png" },
];

export const UNI_MAJORS = {
  RUPP: [
    { faculty: "Faculty of Science", facultyKm: "មហាវិទ្យាល័យវិទ្យាសាស្ត្រ", majors: [
      { n: "Biology", nKm: "ជីវវិទ្យា", d: "RUPP's Department of Biology (est. 1988) has students complete a Foundation Year before branching into zoology, botany, microbiology, ecology and biotechnology, with recognized departmental strength in ecology, entomology and Cambodian biodiversity research. Graduates move into education, research, environmental management, healthcare and industry through the department's national and regional research partnerships.", dKm: "សិក្សាសត្វវិទ្យា រុក្ខវិទ្យា មីក្រូជីវវិទ្យា និងបច្ចេកវិទ្យាជីវៈ ជាមួយកម្លាំងស្រាវជ្រាវជីវចម្រុះខ្មែរដ៏រឹងមាំ។" },
      { n: "Chemistry", nKm: "គីមីវិទ្យា", d: "RUPP runs Chemistry as a separate track from its own Bio-Chemistry bachelor's program — a split between general/analytical chemistry and applied biochemistry rather than one combined major. It feeds directly into RUPP's in-house MSc and PhD Chemistry programs, giving strong undergraduates a clear pipeline into the university's own graduate research.", dKm: "ផ្តោតលើគីមីទូទៅ/វិភាគ និងជីវគីមីអនុវត្ត ភ្ជាប់ទៅកម្មវិធីអនុបណ្ឌិត និងបណ្ឌិតរបស់សាកលវិទ្យាល័យផ្ទាល់។" },
      { n: "Computer Science", nKm: "វិទ្យាសាស្ត្រកុំព្យូទ័រ", d: "RUPP's B.Sc. curriculum pairs a formal software-engineering sequence (requirements analysis, system design, SDLC-based development) with dedicated data-communications coursework — voice-band, baseband and broadband transmission, LAN/WAN/MAN administration, and Intranet/web/email server management. The department also runs its own Master's in Computer Science as a direct in-house path to graduate study.", dKm: "បញ្ចូលវិស្វកម្មសូហ្វវែរជាមួយបច្ចេកវិទ្យាទំនាក់ទំនងទិន្នន័យ ភ្ជាប់ទៅកម្មវិធីអនុបណ្ឌិតផ្ទាល់ខ្លួន។" },
      { n: "Environmental Science", nKm: "វិទ្យាសាស្ត្របរិស្ថាន", d: "Established in 2001, RUPP's Environmental Science department was Cambodia's first and remains its leading program in the field, offering a Pollution/Urban Environmental Science track (~153 credits) and a Natural Resource Management track (~151 credits). It also anchors RUPP's Master of Science in Biodiversity Conservation and its Climate Change Master's program.", dKm: "កម្មវិធីទី១ និងឈានមុខគេនៅកម្ពុជា ជាមួយផ្លូវជំនាញគ្រប់គ្រងបំពុល/បរិស្ថានទីក្រុង និងធនធានធម្មជាតិ។" },
      { n: "Mathematics", nKm: "គណិតវិទ្យា", d: "RUPP's Department of Mathematics runs its own BSc through PhD pipeline, pairing theoretical statistics (hypothesis testing, regression, SPSS) with applied numerical methods (Taylor series, spline interpolation, numerical ODE solving) and hands-on C programming. That combination of pure math and computational/statistical tooling is uncommon in a standalone math degree.", dKm: "បញ្ចូលស្ថិតិទ្រឹស្ដី វិធីសាស្ត្រលេខអនុវត្ត និងសរសេរកម្មវិធី C ជាមួយផ្លូវសិក្សារហូតដល់កម្រិតបណ្ឌិត។" },
      { n: "Physics", nKm: "រូបវិទ្យា", d: "RUPP's Physics program combines a renewable-energy specialization — solar PV/thermal, wind turbines, mini/macro hydro, geothermal and biomass systems — with an electronics track covering semiconductors, diodes, transistors, ICs and analog/digital circuit design. That dual focus targets both Cambodia's growing renewable-energy sector and electronics/instrumentation work.", dKm: "មានផ្លូវឯកទេសថាមពលកកើតឡើងវិញ និងអេឡិចត្រូនិក សម្រាប់វិស័យថាមពល និងបច្ចេកវិទ្យាកំពុងរីកចម្រើននៅកម្ពុជា។" },
    ]},
    { faculty: "Faculty of Engineering", facultyKm: "មហាវិទ្យាល័យវិស្វកម្ម", majors: [
      { n: "Bio-Engineering / Biotechnology", nKm: "វិស្វកម្មជីវៈ / បច្ចេកវិទ្យាជីវៈ", d: "This English-medium program in the Faculty of Engineering's Department of Bio-Engineering was developed and is taught in partnership with Sweden's Umeå University, Lund University and the Swedish University of Agricultural Sciences. It trains engineers in biotechnology and food-technology fundamentals to build Cambodia's applied-bioscience research and education capacity.", dKm: "កម្មវិធីភាសាអង់គ្លេស សិក្សារួមគ្នាជាមួយសាកលវិទ្យាល័យស៊ុយអែត លើមូលដ្ឋានបច្ចេកវិទ្យាជីវៈ និងចំណីអាហារ។" },
      { n: "Business & Supply Chain Analytics", nKm: "ការវិភាគពាណិជ្ជកម្ម និងខ្សែសង្វាក់ផ្គត់ផ្គង់", d: "Run by RUPP's Department of Automation & Supply Chain Systems Engineering (est. 2022) as a 2+2 program with Thailand's Sirindhorn International Institute of Technology — years 1-2 at RUPP, years 3-4 in Thailand — the 168-credit degree centers on automation, digital manufacturing and Industry 4.0 supply-chain optimization. It was created specifically to support the Cambodian government's manufacturing-digitalization strategy.", dKm: "កម្មវិធីរួម ២+២ ជាមួយប្រទេសថៃ ផ្តោតលើស្វ័យប្រវត្តិកម្ម និងខ្សែសង្វាក់ផ្គត់ផ្គងឧស្សាហកម្ម ៤.០។" },
      { n: "Data Science and Engineering", nKm: "វិទ្យាសាស្ត្រទិន្នន័យ និងវិស្វកម្ម", d: "Taught in English by RUPP's Department of Information Technology Engineering, this major applies engineering-track rigor to data analytics, systems and pipelines rather than a standalone stats/CS approach. The same department also runs an in-house Master's in Data Science and Engineering for direct progression.", dKm: "អនុវត្តភាពម៉ត់ចត់ផ្នែកវិស្វកម្មទៅលើការវិភាគ និងប្រព័ន្ធទិន្នន័យ។" },
      { n: "Environmental Engineering", nKm: "វិស្វកម្មបរិស្ថាន", d: "One of the international programs in RUPP's Faculty of Engineering (founded 2013 with seven degree programs across five departments), this major has its own department distinct from the Faculty of Science's Environmental Science program, applying engineering methods to water, waste and pollution-control systems. It targets infrastructure-level environmental solutions rather than the Science faculty's policy/management focus.", dKm: "អនុវត្តវិធីសាស្ត្រវិស្វកម្មទៅលើប្រព័ន្ធទឹក សំណល់ និងគ្រប់គ្រងការបំពុល។" },
      { n: "Food Technology Engineering", nKm: "វិស្វកម្មបច្ចេកវិទ្យាចំណីអាហារ", d: "Established in February 2022 with input from experts at Osaka Prefecture University, this Bachelor of Engineering focuses on food safety, nutrition, sensory quality and processing from raw produce to finished products. It was created explicitly to supply skilled food technologists for Cambodia's agro-industry and food-security development.", dKm: "ផ្តោតលើសុវត្ថិភាពចំណីអាហារ អាហារូបត្ថម្ភ និងដំណើរការផលិតកម្ម។" },
      { n: "Information Technology Engineering", nKm: "វិស្វកម្មបច្ចេកវិទ្យាព័ត៌មាន", d: "Delivered by RUPP's Department of Information Technology Engineering alongside its Data Science and Engineering major, this Bachelor of Engineering applies an engineering curriculum — rather than pure computer science — to IT systems design and infrastructure. The department also runs its own Master of IT Engineering for graduates continuing on.", dKm: "អនុវត្តកម្មវិធីសិក្សាវិស្វកម្មទៅលើការរចនាប្រព័ន្ធ និងហេដ្ឋារចនាសម្ព័ន្ធព័ត៌មានវិទ្យា។" },
      { n: "Telecommunication & Electronics Engineering", nKm: "វិស្វកម្មទូរគមនាគមន៍ និងអេឡិចត្រូនិក", d: "Offered by RUPP's dedicated Department of Telecommunication and Electronic Engineering, one of the Faculty of Engineering's five founding departments (2013), this Bachelor of Engineering trains students specifically in telecom and electronics systems — distinct from the Physics department's electronics coursework in the Faculty of Science.", dKm: "បណ្តុះបណ្តាលនិស្សិតលើប្រព័ន្ធទូរគមនាគមន៍ និងអេឡិចត្រូនិកជាក់លាក់។" },
    ]},
    { faculty: "Institute of Foreign Languages", facultyKm: "វិទ្យាស្ថានភាសាបរទេស", majors: [
      { n: "English (for Work Skills)", nKm: "ភាសាអង់គ្លេស (សម្រាប់ជំនាញការងារ)", d: "Introduced in 1997, this four-year BA has students take common coursework through Year III before choosing a Year IV specialization in English for International Business, Translation and Interpreting, or Professional Communication. It's explicitly vocational, aimed at employers needing advanced English rather than literary or linguistic study.", dKm: "កម្មវិធីអនុវត្តន៍ជាក់ស្តែង ជាមួយឯកទេសពាណិជ្ជកម្មអន្តរជាតិ ការបកប្រែ ឬទំនាក់ទំនងវិជ្ជាជីវៈនៅឆ្នាំទី៤។" },
      { n: "Teaching English as a Foreign Language (TEFL)", nKm: "ការបង្រៀនភាសាអង់គ្លេសជាភាសាបរទេស", d: "RUPP's B.Ed. in TEFL shares Years II-III coursework with the English for Work Skills degree before diverging into education-specific pedagogy and a required teaching practicum, training graduates to teach English at Cambodia's secondary and tertiary levels.", dKm: "បណ្តុះបណ្តាលគ្រូបង្រៀនភាសាអង់គ្លេសសម្រាប់កម្រិតមធ្យមសិក្សា និងឧត្តមសិក្សានៅកម្ពុជា។" },
      { n: "Chinese", nKm: "ភាសាចិន", d: "One of IFL's six language departments, Chinese offers a four-year BA built on the same Foundation Year plus Years II-IV specialization structure used across RUPP's language programs, geared toward business, translation, or education careers.", dKm: "ថ្នាក់បរិញ្ញាបត្រ៤ឆ្នាំ ត្រៀមខ្លួនសម្រាប់អាជីពពាណិជ្ជកម្ម ការបកប្រែ ឬការអប់រំ។" },
      { n: "French", nKm: "ភាសាបារាំង", d: "RUPP's French department sits within the Institute of Foreign Languages — housed in a landmark building designed by Cambodian architect Vann Molyvann (completed 1972) — and benefits from RUPP's membership in the Agence Universitaire de la Francophonie (AUF), giving direct ties to Francophonie academic networks.", dKm: "ភ្ជាប់ទំនាក់ទំនងផ្ទាល់ជាមួយបណ្តាញសាកលវិទ្យាល័យបារាំងតាមរយៈសមាគម Francophonie។" },
      { n: "Japanese", nKm: "ភាសាជប៉ុន", d: "Established in 2003 as the first bachelor's-level Japanese program in Cambodia, this department splits into a B.Ed. track for future Japanese teachers and a BA in Japanese for Business for corporate careers, after a shared Foundation Year covering Hiragana, Katakana, Kanji, grammar and conversation.", dKm: "កម្មវិធីភាសាជប៉ុនកម្រិតបរិញ្ញាបត្រដំបូងគេនៅកម្ពុជា ជាមួយផ្លូវគ្រូបង្រៀន ឬពាណិជ្ជកម្ម។" },
      { n: "Korean", nKm: "ភាសាកូរ៉េ", d: "Officially established March 9, 2007, RUPP's Department of Korean Studies offers a four-year BA covering listening, speaking, reading and writing proficiency alongside broader Korean studies — one of IFL's newer departments, reflecting growing Cambodia-Korea ties.", dKm: "បង្រៀនជំនាញស្តាប់ និយាយ អាន សរសេរ រួមជាមួយចំណេះដឹងទូទៅអំពីកូរ៉េ។" },
      { n: "Thai", nKm: "ភាសាថៃ", d: "RUPP's Department of Thai offers a four-year B.Ed. following IFL's standard model — shared Foundation Year, common Years II-III coursework, then Year IV specialization in Thai-language skills and pedagogy — aimed at Cambodia's demand for Thai-language professionals.", dKm: "បណ្តុះបណ្តាលជំនាញភាសា និងគរុកោសល្យថៃ ឆ្លើយតបនឹងតម្រូវការវិជ្ជាជីវៈភាសាថៃនៅកម្ពុជា។" },
    ]},
    { faculty: "Faculty of Development Studies", facultyKm: "មហាវិទ្យាល័យអភិវឌ្ឍន៍សិក្សា", majors: [
      { n: "Community Development", nKm: "អភិវឌ្ឍន៍សហគមន៍", d: "This program covers agricultural restructuring, sustainable resource management, rural poverty, women in rural development, and the role of NGOs and micro-credit, building skills to plan, implement and evaluate community action strategies, plus a human-rights component examining UN conventions applied to welfare work.", dKm: "សិក្សាកសិកម្ម ភាពក្រីក្រជនបទ តួនាទីអង្គការក្រៅរដ្ឋាភិបាល និងសិទ្ធិមនុស្សក្នុងការងារសង្គម។" },
      { n: "Economic Development", nKm: "អភិវឌ្ឍន៍សេដ្ឋកិច្ច", d: "RUPP's Bachelor in Economic Development requires a minimum of 132 credits (excluding a 15-credit BA thesis or 9-credit research report option), with English instruction delivered through RUPP's own English Language Studies Unit during the Foundation Year.", dKm: "តម្រូវឲ្យបានយ៉ាងតិច១៣២ក្រេឌីត បង្រៀនជាភាសាអង់គ្លេសដោយផ្នែកភាសាផ្ទាល់ខ្លួនរបស់សាកលវិទ្យាល័យ។" },
      { n: "Natural Resources Management and Development", nKm: "គ្រប់គ្រង និងអភិវឌ្ឍធនធានធម្មជាតិ", d: "A multidisciplinary program spanning the social and natural-science dimensions of resource management, with many courses tied to field practice involving direct interaction with local communities, practitioners and policymakers around real Cambodian land-use conflicts.", dKm: "កម្មវិធីពហុវិទ្យា ភ្ជាប់ជាមួយការអនុវត្តន៍ជាក់ស្តែងលើជម្លោះដីធ្លីកម្ពុជា។" },
    ]},
    { faculty: "Faculty of Education", facultyKm: "មហាវិទ្យាល័យអប់រំ", majors: [
      { n: "Education Studies", nKm: "ការសិក្សាអប់រំ", d: "One of three departments in RUPP's Faculty of Education (alongside Higher Education Management and Lifelong Learning), this program trains students in educational policy and practice across general education levels, in a faculty that now spans certificate through PhD study.", dKm: "បណ្តុះបណ្តាលគោលនយោបាយ និងការអនុវត្តអប់រំគ្រប់កម្រិត។" },
      { n: "Lifelong Learning", nKm: "ការសិក្សាពេញមួយជីវិត", d: "Created to institutionalize lifelong learning as its own field of study, this department serves education and training needs beyond the classroom — workplace and community settings — with the explicit aim of maximizing human capital across Cambodian society.", dKm: "ផ្តោតលើតម្រូវការសិក្សា/បណ្តុះបណ្តាលក្រៅថ្នាក់រៀន ដូចជាកន្លែងធ្វើការ និងសហគមន៍។" },
    ]},
    { faculty: "Faculty of Social Science and Humanities", facultyKm: "មហាវិទ្យាល័យវិទ្យាសាស្ត្រសង្គម និងមនុស្សសាស្ត្រ", majors: [
      { n: "Geography and Land Management", nKm: "ភូមិវិទ្យា និងគ្រប់គ្រងដីធ្លី", d: "This BA combines geographic coursework with field-based land-administration training; the department expanded into graduate education with a Master of Arts in Geography launched in 2022, preparing graduates for land-use, planning and government roles specific to Cambodia.", dKm: "បញ្ចូលភូមិវិទ្យា និងការគ្រប់គ្រងដីធ្លីជាក់ស្តែង សម្រាប់តួនាទីផែនការ និងរដ្ឋាភិបាល។" },
      { n: "History", nKm: "ប្រវត្តិវិទ្យា", d: "RUPP's BA in History emphasizes Khmer, Asian and world history with particular focus on Cambodia's and Southeast Asia's socio-economic, political and cultural development. Graduates go into teaching, research, library and government/NGO administration, and tourism, or continue into postgraduate political science or international relations.", dKm: "ផ្តោតលើប្រវត្តិសាស្ត្រខ្មែរ អាស៊ី និងពិភពលោក សម្រាប់អាជីពបង្រៀន ស្រាវជ្រាវ ឬរដ្ឋបាល។" },
      { n: "Khmer Literature", nKm: "អក្សរសាស្ត្រខ្មែរ", d: "This department trains students to analyze, explain and compare all aspects of Khmer language and literature as the foundation of Khmer culture and identity, building advanced social-research skills over four years. Graduates commonly move into teaching, journalism, and government culture/tourism roles.", dKm: "វិភាគ និងប្រៀបធៀបគ្រប់ទិដ្ឋភាពនៃភាសា និងអក្សរសាស្ត្រខ្មែរជាមូលដ្ឋានវប្បធម៌ជាតិ។" },
      { n: "Linguistics", nKm: "ភាសាវិទ្យា", d: "RUPP's four-year BA teaches general linguistic theory and analysis with particular focus on the Khmer language, training students in description, comparison and applied research. Graduates work in language teaching, translation/interpreting, dictionary compilation, publishing and mass media.", dKm: "សិក្សាទ្រឹស្ដីភាសាទូទៅ ដោយផ្តោតលើភាសាខ្មែរ សម្រាប់ការបកប្រែ បោះពុម្ព ឬបង្រៀន។" },
      { n: "Media and Communication", nKm: "ប្រព័ន្ធផ្សព្វផ្សាយ និងទំនាក់ទំនង", d: "This four-year BA in Media Management, taught substantially in English, covers print, broadcast and multimedia/online journalism, photojournalism, media law and ethics, PR/advertising, and newsroom production, culminating in a thesis or production project. Admission requires demonstrated English proficiency plus RUPP's own entrance exam and interview.", dKm: "បង្រៀនជាភាសាអង់គ្លេសភាគច្រើន គ្របដណ្តប់សារព័ត៌មាន ការផ្សាយ និងផលិតកម្មប្រព័ន្ធផ្សព្វផ្សាយ។" },
      { n: "Philosophy", nKm: "ទស្សនវិជ្ជា", d: "RUPP's BA curriculum runs from Introduction to Ethics and Political Philosophy through Medieval/Renaissance and Modern Philosophy — Hobbes, Locke, Descartes, Hume, Hegel, Kant — paired with a Research Methodology course and a thesis requirement.", dKm: "សិក្សាទស្សនវិជ្ជាបូព៌ា-លោកខាងលិច ចាប់ពីសីលធម៌រហូតដល់ទស្សនវិជ្ជាទំនើប។" },
      { n: "Psychology", nKm: "ចិត្តវិទ្យា", d: "Tracing to 1980 as part of a combined Faculty of Psycho-Pedagogy, with a dedicated psychology degree since 1994, admission is based on High School Certificate results in Mathematics and Biology. Graduates commonly become counselors at clinics, schools and rehabilitation centers, or join the Ministries of Women's or Social Affairs.", dKm: "ត្រូវការពិន្ទុគណិតវិទ្យា និងជីវវិទ្យាល្អ សម្រាប់អាជីពប្រឹក្សា និងសង្គមកិច្ច។" },
      { n: "Social Work", nKm: "សង្គមកិច្ច", d: "Established in 2008, this runs Cambodia's first Bachelor of Social Work, with a Year 3 Field Learning placement and a Year 4 practicum built around an individualized project at an assigned agency. Its community-development sequence explicitly contrasts needs-based versus rights-based approaches to development.", dKm: "កម្មវិធីសង្គមកិច្ចដំបូងគេនៅកម្ពុជា ជាមួយការអនុវត្តន៍ជាក់ស្តែងនៅភ្នាក់ងារពិត។" },
      { n: "Sociology", nKm: "សង្គមវិទ្យា", d: "Based at RUPP's Campus II, this BA examines youth issues, environmental issues, media ethics, the impact of international organizations on developing economies, and the effects of tourism — linking sociological theory directly to real Cambodian social problems to inform government and NGO decisions.", dKm: "ភ្ជាប់ទ្រឹស្ដីសង្គមទៅនឹងបញ្ហាសង្គមខ្មែរពិតប្រាកដ ដូចជាយុវជន បរិស្ថាន និងទេសចរណ៍។" },
      { n: "Tourism", nKm: "ទេសចរណ៍", d: "Opened in 2001, this interdisciplinary BA in Tourism Management focuses on research-based, sustainable tourism development rather than hospitality-operations training. The department also runs RUPP's Master of Arts in Sustainable Tourism Management and Excellence.", dKm: "ផ្តោតលើការគ្រប់គ្រងទេសចរណ៍ប្រកបដោយចីរភាពតាមរយៈស្រាវជ្រាវ មិនមែនប្រតិបត្តិការសេវាកម្មតែម្យ៉ាង។" },
    ]},
    { faculty: "Institute for International Studies and Public Policy", facultyKm: "វិទ្យាស្ថានសិក្សាអន្តរជាតិ និងគោលនយោបាយសាធារណៈ", majors: [
      { n: "International Economics", nKm: "សេដ្ឋកិច្ចអន្តរជាតិ", d: "RUPP's IISPP offers a BSc in Economics with named concentrations in international economics, digital economy, managerial economics and actuarial economics rather than one generalist track. International-concentration graduates go on to roles as trade officers, market/financial analysts, actuarial analysts and fintech consultants.", dKm: "មានឯកទេសសេដ្ឋកិច្ចអន្តរជាតិ សេដ្ឋកិច្ចឌីជីថល និងសេដ្ឋកិច្ចគ្រប់គ្រង។" },
      { n: "International Relations", nKm: "ទំនាក់ទំនងអន្តរជាតិ", d: "This BA (minimum 120 credits) splits at senior year into a standard IR track with concentrations in International Relations or International Trade and Entrepreneurship, and a separate BA in International Studies (Honours). It earned ASEAN University Network Quality Assurance accreditation in 2024, targeting UN agencies, embassies, NGOs and multinationals.", dKm: "ទទួលបានការទទួលស្គាល់គុណភាព ASEAN University Network ក្នុងឆ្នាំ២០២៤ ត្រៀមខ្លួនសម្រាប់អង្គការអន្តរជាតិ។" },
      { n: "Political Science and Public Policy", nKm: "វិទ្យាសាស្ត្រនយោបាយ និងគោលនយោបាយសាធារណៈ", d: "This BA in Politics and Public Administration is delivered through interactive lectures, seminars, workshops, case studies and simulations rather than a purely lecture-based format. Graduates typically move into policy officer roles, government liaison work, advising/lobbying, or research and teaching.", dKm: "បង្រៀនតាមករណីសិក្សា និងការក្លែងធ្វើ ត្រៀមខ្លួនសម្រាប់តួនាទីគោលនយោបាយ។" },
      { n: "Vietnamese Studies", nKm: "វៀតណាមសិក្សា", d: "This BA offers distinct tracks in Vietnamese Translation and Interpretation and Vietnamese Business Communication, plus a Pre-Departure Vietnamese Language Program for students headed to Vietnam, built to grow Cambodian expertise as bilateral ties deepen.", dKm: "មានផ្លូវបកប្រែ និងទំនាក់ទំនងពាណិជ្ជកម្មវៀតណាម សម្រាប់ទំនាក់ទំនងទ្វេភាគីកាន់តែស៊ីជម្រៅ។" },
    ]},
  ],
  ITC: [
    { faculty: "Faculty of Electrical Engineering", facultyKm: "មហាវិទ្យាល័យវិស្វកម្មអគ្គិសនី", majors: [
      { n: "Electrical and Energy Engineering", nKm: "វិស្វកម្មអគ្គិសនី និងថាមពល", d: "One of ITC's founding departments (est. 1964, alongside Civil Engineering), this 5-year, ~150-credit engineer's degree covers electrical energy, automation, electronics and telecommunications tracks, with strong graduate placement across Cambodia's power and industrial sectors.", dKm: "កម្មវិធីស្ថាបនិកមួយរបស់ ITC គ្របដណ្តប់ថាមពលអគ្គិសនី ស្វ័យប្រវត្តិកម្ម និងទូរគមនាគមន៍។" },
      { n: "Industrial and Mechanical Engineering", nKm: "វិស្វកម្មឧស្សាហកម្ម និងមេកានិក", d: "Established in 1999 from the earlier Department of Industrial and Mine, this department trains mechanical and industrial engineers through Dynamics & Control, Materials Science, and Thermal laboratories, and hosts the ECAM Engineering dual-degree pathway with ECAM LaSalle of Lyon, France.", dKm: "មានកម្មវិធីសញ្ញាបត្រពីរជាមួយសាលា ECAM បារាំង តាមរយៈមន្ទីរពិសោធន៍ឌីណាមិក សម្ភារៈ និងកម្តៅ។" },
      { n: "Information and Communication Technology", nKm: "បច្ចេកវិទ្យាព័ត៌មាន និងទំនាក់ទំនង", d: "Delivered by ITC's Department of Information and Communication Engineering (GIC), the 5-year engineer's degree can extend into an optional Master in Mobile Technology, with mandatory internships at firms like Smart, Cellcard, Sabay and Wing, plus Erasmus+-linked exchanges in Europe, Thailand and China.", dKm: "ត្រូវការកម្មសិក្សានៅក្រុមហ៊ុនទូរគមនាគមន៍ធំៗ រួមទាំងការផ្លាស់ប្តូរនិស្សិតតាមកម្មវិធី Erasmus+។" },
      { n: "Telecommunication and Network Engineering", nKm: "វិស្វកម្មទូរគមនាគមន៍ និងបណ្តាញ", d: "A department distinct from ICT within the Faculty of Electrical Engineering, focused specifically on telecom infrastructure and network systems engineering for Cambodia's telecom operators and network industry.", dKm: "ផ្តោតលើហេដ្ឋារចនាសម្ព័ន្ធទូរគមនាគមន៍ និងប្រព័ន្ធបណ្តាញសម្រាប់ក្រុមហ៊ុនប្រតិបត្តិករទូរគមនាគមន៍។" },
      { n: "Applied Mathematics and Statistics", nKm: "គណិតវិទ្យា និងស្ថិតិអនុវត្ត", d: "This department provides the quantitative foundation for ITC's engineering faculties at undergraduate level, while its graduate track specializes in machine learning, data analytics, educational data mining and predictive modeling for the SDGs.", dKm: "ជាមូលដ្ឋានបរិមាណវិភាគសម្រាប់មហាវិទ្យាល័យវិស្វកម្មទាំងអស់ ជាមួយឯកទេសរៀនម៉ាស៊ីននៅកម្រិតបញ្ចប់ការសិក្សា។" },
    ]},
    { faculty: "Faculty of Civil Engineering", facultyKm: "មហាវិទ្យាល័យវិស្វកម្មសំណង់", majors: [
      { n: "Civil Engineering", nKm: "វិស្វកម្មសំណង់", d: "ITC's oldest department (founded 1964) runs from a shared Tronc Commun foundation year into reinforced concrete design, soil mechanics, road/bridge construction and earthquake engineering, using dedicated Road Materials, Soil Mechanics and Construction Materials labs. Top students can pursue scholarship pathways with partner universities in France, Belgium, Japan and China.", dKm: "មហាវិទ្យាល័យចាស់ជាងគេរបស់ ITC គ្របដណ្តប់ការរចនាបេតុង មេកានិចដី និងសំណង់ផ្លូវ/ស្ពាន។" },
      { n: "Architectural Engineering", nKm: "វិស្វកម្មស្ថាបត្យកម្ម", d: "Launched roughly a decade ago to produce graduates who are both architects and structural engineers, the 5-year GAR program (2-year Tronc Commun + 3-year specialization, 45 courses) centers on a five-part Architectural Design Workshop sequence and two mandatory internships, with exchanges in France, Belgium, Thailand and Japan.", dKm: "បណ្តុះបណ្តាលទាំងស្ថាបត្យករ និងវិស្វករសំណង់រួមគ្នា ក្នុងកម្មវិធី ៥ឆ្នាំ។" },
      { n: "Infrastructure and Transportation", nKm: "ហេដ្ឋារចនាសម្ព័ន្ធ និងដឹកជញ្ជូន", d: "Run by the Department of Transport and Infrastructure Engineering (GTI), this program trains engineers in road/bridge design, maintenance and repair alongside transportation and logistics planning, using a Transport Laboratory equipped with GNSS, LIDAR and PTV VISSIM traffic-simulation tools.", dKm: "បណ្តុះបណ្តាលការរចនាផ្លូវ/ស្ពាន និងផែនការដឹកជញ្ជូន ដោយប្រើឧបករណ៍ក្លែងធ្វើចរាចរណ៍ទំនើប។" },
    ]},
    { faculty: "Faculty of Hydrology and Water Resources Engineering", facultyKm: "មហាវិទ្យាល័យវិស្វកម្មធនធានទឹក", majors: [
      { n: "Water Resources and Rural Infrastructure", nKm: "ធនធានទឹក និងហេដ្ឋារចនាសម្ព័ន្ធជនបទ", d: "Focused on river-basin management, hydraulic structures and rural infrastructure design, this program includes GIS/remote sensing and climate-change coursework to prepare engineers for water resources planning and construction across Cambodia.", dKm: "ផ្តោតលើគ្រប់គ្រងអាងទន្លេ សំណង់ធារាសាស្ត្រ និងផលប៉ះពាល់អាកាសធាតុ។" },
      { n: "Water Environmental Engineering", nKm: "វិស្វកម្មបរិស្ថានទឹក", d: "Run by the Department of Water and Environmental Engineering, this program trains engineers in water supply, sanitation and wastewater treatment aimed at Cambodia's environmental protection and public-health infrastructure needs.", dKm: "បណ្តុះបណ្តាលការផ្គត់ផ្គង់ទឹក អនាម័យ និងប្រព័ន្ធសម្អាតទឹកកខ្វក់។" },
    ]},
    { faculty: "Faculty of Geo-Resources and Geotechnical Engineering", facultyKm: "មហាវិទ្យាល័យវិស្វកម្មភូគព្ភសាស្ត្រ និងធនធានផែនដី", majors: [
      { n: "Geotechnical Engineering", nKm: "វិស្វកម្មភូគព្ភបច្ចេកទេស", d: "Part of a faculty created as a department in 2011 and elevated to full faculty status in 2017 to meet Cambodia's emerging natural-resource development needs, this track covers soil mechanics and foundation engineering for construction projects.", dKm: "គ្របដណ្តប់មេកានិចដី និងគ្រឹះសំណង់សម្រាប់គម្រោងសំណង់។" },
      { n: "Geo-Resources and Petroleum", nKm: "ធនធានផែនដី និងប្រេងកាត", d: "Sharing a faculty with Geotechnical Engineering, this track covers geology, mining and petroleum engineering, supported by a dedicated Petroleum Engineering Lab, to supply engineers for Cambodia's developing oil, gas and mining sectors.", dKm: "គ្របដណ្តប់ភូគព្ភសាស្ត្រ រ៉ែ និងវិស្វកម្មប្រេងកាត សម្រាប់វិស័យថាមពលកំពុងរីកចម្រើន។" },
    ]},
    { faculty: "Faculty of Chemical and Food Engineering", facultyKm: "មហាវិទ្យាល័យវិស្វកម្មគីមី និងចំណីអាហារ", majors: [
      { n: "Chemical Engineering", nKm: "វិស្វកម្មគីមី", d: "Based in the Chemical Engineering and Food Technology department, this program is oriented toward Cambodia's agro-industry and environmental-management sectors and feeds into ITC's Master of Agro-Industrial Engineering for continuing students.", dKm: "តម្រង់ទិសទៅឧស្សាហកម្មកសិកម្ម និងគ្រប់គ្រងបរិស្ថាន ភ្ជាប់ទៅអនុបណ្ឌិតវិស្វកម្មកសិឧស្សាហកម្ម។" },
      { n: "Food Science and Technology", nKm: "វិទ្យាសាស្ត្រ និងបច្ចេកវិទ្យាចំណីអាហារ", d: "Delivered through ITC's Agro-Industrial Engineering track, this program pairs food technology and process engineering with business management coursework, supported by the Food Technology and Nutrition research unit's work on processing, storage and preservation.", dKm: "បញ្ចូលបច្ចេកវិទ្យាចំណីអាហារ វិស្វកម្មដំណើរការ និងការគ្រប់គ្រងអាជីវកម្ម។" },
    ]},
    { faculty: "International Engineering Program (taught in English)", facultyKm: "កម្មវិធីវិស្វកម្មអន្តរជាតិ (បង្រៀនជាភាសាអង់គ្លេស)", majors: [
      { n: "Artificial Intelligence Engineering and Cybersecurity", nKm: "វិស្វកម្មបញ្ញាសិប្បនិម្មិត និងសន្តិសុខអនឡាញ", d: "A 5-year, English-medium track (equivalent to Master's/M1 level) leading to a double degree with an international partner university in France, Australia, the EU, Malaysia, Thailand or Indonesia, with annual industry internships and project-based coursework.", dKm: "កម្មវិធីភាសាអង់គ្លេស៥ឆ្នាំ ទទួលបានសញ្ញាបត្រពីរជាមួយសាកលវិទ្យាល័យដៃគូបរទេស។" },
      { n: "Software Engineering", nKm: "វិស្វកម្មសូហ្វវែរ", d: "An English-medium, 5-year International Engineering Program major combining project-based software development coursework with annual internships at industry partners, leading to a double degree from ITC and an international partner university.", dKm: "បញ្ចូលការអភិវឌ្ឍសូហ្វវែរតាមគម្រោង ជាមួយកម្មសិក្សាប្រចាំឆ្នាំ និងសញ្ញាបត្រពីរ។" },
      { n: "Materials Science and Engineering", nKm: "វិទ្យាសាស្ត្រ និងវិស្វកម្មសម្ភារៈ", d: "One of the newer (2024) English-medium IEP majors added when ITC expanded its double-degree partnerships to France, Australia, the EU, Malaysia, Thailand and Indonesia, offering a 5-year track with annual industry internships.", dKm: "កម្មវិធីថ្មីមួយក្នុងចំណោមកម្មវិធីភាសាអង់គ្លេសរបស់ ITC ដែលបានពង្រីកភាពជាដៃគូអន្តរជាតិ។" },
      { n: "Electronics and Smart Automation System", nKm: "អេឡិចត្រូនិក និងប្រព័ន្ធស្វ័យប្រវត្តិកម្មឆ្លាតវៃ", d: "An English-medium, 5-year IEP major combining electronics and automation coursework with project-based learning and annual industrial internships, awarding a double degree through ITC's international partner universities.", dKm: "បញ្ចូលអេឡិចត្រូនិក និងស្វ័យប្រវត្តិកម្មតាមគម្រោង ជាមួយកម្មសិក្សាឧស្សាហកម្មប្រចាំឆ្នាំ។" },
      { n: "Sustainable Engineering and Business", nKm: "វិស្វកម្មចីរភាព និងអាជីវកម្ម", d: "An English-medium IEP major pairing engineering fundamentals with sustainability and business coursework over a 5-year double-degree track with ITC's international partner universities.", dKm: "បញ្ចូលមូលដ្ឋានវិស្វកម្មជាមួយចីរភាព និងជំនាញអាជីវកម្ម។" },
      { n: "Construction Management and Infrastructure Engineering", nKm: "គ្រប់គ្រងសំណង់ និងវិស្វកម្មហេដ្ឋារចនាសម្ព័ន្ធ", d: "One of ITC's newer (2024) English-medium IEP majors, combining construction management with infrastructure engineering over a 5-year double-degree track delivered with partner universities in France, Australia, the EU, Malaysia, Thailand and Indonesia.", dKm: "បញ្ចូលគ្នារវាងគ្រប់គ្រងសំណង់ និងវិស្វកម្មហេដ្ឋារចនាសម្ព័ន្ធ ក្នុងកម្មវិធីសញ្ញាបត្រពីរ។" },
      { n: "Robotics and Automation Engineering", nKm: "វិស្វកម្មរ៉ូបូត និងស្វ័យប្រវត្តិកម្ម", d: "A double-degree pathway with ECAM LaSalle of Lyon, France: after ITC's shared foundation years, students complete ECAM's 3-year robotics/automation syllabus taught in English at ITC, graduating with both an ECAM engineer's degree and an ITC Master's-equivalent degree.", dKm: "ផ្លូវសញ្ញាបត្រពីរជាមួយសាលា ECAM LaSalle បារាំង ចប់ជាមួយសញ្ញាបត្រវិស្វករទាំងពីរ។" },
      { n: "Industrial Engineering and Supply Chain Management", nKm: "វិស្វកម្មឧស្សាហកម្ម និងគ្រប់គ្រងខ្សែសង្វាក់ផ្គត់ផ្គង់", d: "The other ECAM LaSalle (Lyon, France) double-degree pathway at ITC, delivering ECAM's 3-year industrial engineering and supply-chain syllabus in English and awarding both an ECAM engineer's degree and an ITC engineering degree.", dKm: "ផ្លូវសញ្ញាបត្រពីរជាមួយ ECAM LaSalle បារាំង ក្នុងវិស្វកម្មឧស្សាហកម្ម និងខ្សែសង្វាក់ផ្គត់ផ្គង់។" },
    ]},
  ],
  AUPP: [
    { faculty: "Faculty of Business and Management", facultyKm: "មហាវិទ្យាល័យពាណិជ្ជកម្ម និងគ្រប់គ្រង", majors: [
      { n: "Business (B.S.)", nKm: "ពាណិជ្ជកម្ម (B.S.)", d: "A 125-credit single-degree program covering marketing, finance, accounting and management, with a required 160-hour internship after 84 credits, built on AUPP's American liberal-arts general education base.", dKm: "កម្មវិធី១២៥ក្រេឌីត គ្របដណ្តប់ទីផ្សារ ហិរញ្ញវត្ថុ គណនេយ្យ និងគ្រប់គ្រង ជាមួយកម្មសិក្សាកាតព្វកិច្ច។" },
      { n: "Business Administration", nKm: "រដ្ឋបាលពាណិជ្ជកម្ម", d: "A 125-credit dual degree earning both an AUPP degree and a Bachelor of Science in Business Administration from the University of Arizona's Eller College of Management (a top-10 US public business school); students complete ~2 years of pre-articulated coursework at AUPP before formal UA admission in junior year. It's currently AUPP's most popular major.", dKm: "សញ្ញាបត្រពីរជាមួយសាកលវិទ្យាល័យ Arizona សហរដ្ឋអាមេរិក ជាកម្មវិធីពេញនិយមបំផុតរបស់ AUPP។" },
      { n: "Tourism and Hospitality Management", nKm: "គ្រប់គ្រងទេសចរណ៍ និងបដិសណ្ឋារកិច្ច", d: "A 124-credit dual degree with Fort Hays State University (awarding a BBA), covering hotel/resort management, sustainable tourism, food and beverage management, and meetings/conventions plus a required internship. AUPP is not currently accepting new applicants — the program is in teach-out status for enrolled students.", dKm: "សញ្ញាបត្រពីរជាមួយសាកលវិទ្យាល័យ Fort Hays សហរដ្ឋអាមេរិក (បច្ចុប្បន្នមិនទទួលនិស្សិតថ្មីទេ)។" },
    ]},
    { faculty: "Faculty of Digital Technologies", facultyKm: "មហាវិទ្យាល័យបច្ចេកវិទ្យាឌីជីថល", majors: [
      { n: "Information Technology Management (B.S.)", nKm: "គ្រប់គ្រងបច្ចេកវិទ្យាព័ត៌មាន (B.S.)", d: "A 121-credit single-degree program (46 general education, 56 IT major, 19 electives) built around Data Structures, Operating Systems and Database Design, capped by a required internship and capstone project — training graduates for systems analyst, IT project manager or database administrator roles.", dKm: "ផ្តោតលើរចនាសម្ព័ន្ធទិន្នន័យ ប្រព័ន្ធប្រតិបត្តិការ និងមូលដ្ឋានទិន្នន័យ ជាមួយកម្មសិក្សា និងគម្រោងបញ្ចប់ការសិក្សា។" },
      { n: "Computer Science", nKm: "វិទ្យាសាស្ត្រកុំព្យូទ័រ", d: "A dual-degree track with Fort Hays State University following the same 121-credit ITM curriculum while earning FHSU's accredited BS in Computer Science, requiring at least 45 upper-division (300+ level) credits and a 2.0 GPA in all FHSU coursework, with core courses in Data Structures, Assembly Language, Operating Systems and Software Engineering.", dKm: "សញ្ញាបត្រពីរជាមួយ Fort Hays State University ក្នុងវិទ្យាសាស្ត្រកុំព្យូទ័រដែលទទួលស្គាល់។" },
      { n: "Web and Mobile Application Development", nKm: "អភិវឌ្ឍកម្មវិធីវេប និងទូរស័ព្ទចល័ត", d: "AUPP awards a BS in Interactive App Design and Development while dual-degree partner Fort Hays State University awards a BS in Web and Mobile Application Development, across a 122-credit curriculum spanning Front-End, Back-End and Mobile Web Development, Database Design and HCI, ending in an internship and final-year project.", dKm: "គ្របដណ្តប់ការអភិវឌ្ឍផ្នែកខាងមុខ ខាងក្រោយ និងទូរស័ព្ទចល័ត រួមជាមួយគម្រោងឆ្នាំចុងក្រោយ។" },
    ]},
    { faculty: "Faculty of Law", facultyKm: "មហាវិទ្យាល័យនីតិសាស្ត្រ", majors: [
      { n: "Law (B.A.)", nKm: "នីតិសាស្ត្រ (B.A.)", d: "A 124-unit BA (61 in general education) grounded in Cambodian, U.S. and international law, with coursework in business law, contracts, criminal law and IP. Graduates have gone on to LLM/JD study at Boston University, Georgetown, the University of Arizona and the University of London.", dKm: "ផ្អែកលើច្បាប់ខ្មែរ អាមេរិក និងអន្តរជាតិ និស្សិតបានបន្តការសិក្សានៅសាកលវិទ្យាល័យល្បីៗនៅសហរដ្ឋអាមេរិក។" },
      { n: "Business Administration and Law", nKm: "រដ្ឋបាលពាណិជ្ជកម្ម និងនីតិសាស្ត្រ", d: "A dual degree pairing AUPP's law curriculum with a BA in Law from the University of Arizona's James E. Rogers College of Law (a top-50 US law school and the first American university to offer a BA in Law), delivered via hybrid instruction from joint AUPP/UA faculty entirely in Phnom Penh.", dKm: "សញ្ញាបត្រពីរជាមួយសាលានីតិសាស្ត្រ Arizona បង្រៀនផ្ទាល់នៅភ្នំពេញ។" },
    ]},
    { faculty: "Faculty of Social Sciences", facultyKm: "មហាវិទ្យាល័យវិទ្យាសាស្ត្រសង្គម", majors: [
      { n: "International Relations and Diplomacy (B.A.)", nKm: "ទំនាក់ទំនងអន្តរជាតិ និងការទូត (B.A.)", d: "A 124-credit single-degree BA using problem-centered, evidence-based teaching to examine Southeast Asian and global politics, diplomacy and security. Graduates pursue government, NGO, international-organization and multinational careers, or graduate study in international affairs.", dKm: "សិក្សានយោបាយ ការទូត និងសន្តិសុខតំបន់អាស៊ីអាគ្នេយ៍ និងសកល តាមរបៀបផ្អែកលើភស្តុតាង។" },
      { n: "Communication", nKm: "ទំនាក់ទំនង", d: "A 127-credit dual degree pairing an AUPP BS in Business with a BA in Communication from the University of Arizona, combining Strategic Public Relations and PR Campaigns coursework with a full business core in accounting, finance, marketing and management.", dKm: "សញ្ញាបត្រពីរជាមួយ Arizona បញ្ចូលទំនាក់ទំនងសាធារណៈ ជាមួយមូលដ្ឋានពាណិជ្ជកម្មពេញលេញ។" },
      { n: "Global Affairs", nKm: "កិច្ចការសកល", d: "Launched Spring 2025, this 125-credit dual degree pairs AUPP's BA in International Relations and Diplomacy with a BS in Political Science from Fort Hays State University, completable entirely in Phnom Penh with an optional semester or year at FHSU's Kansas campus.", dKm: "សញ្ញាបត្រពីរថ្មីជាមួយ Fort Hays State University ចាប់ផ្តើមឆ្នាំ២០២៥។" },
      { n: "Graphic Design", nKm: "ការរចនាក្រាហ្វិក", d: "One of AUPP's dual-degree design programs delivered jointly with U.S. partner-university faculty (University of Arizona or Fort Hays State University) in the third and fourth years, so students complete the full U.S.-accredited degree without leaving Phnom Penh.", dKm: "សញ្ញាបត្រពីរជាមួយសាកលវិទ្យាល័យដៃគូអាមេរិក បង្រៀនដោយសាស្ត្រាចារ្យរួមគ្នា។" },
      { n: "Interior Design", nKm: "ការរចនាខាងក្នុង", d: "A dual degree with AUPP's U.S. partner universities pairing design studio coursework with AUPP's built-environment curriculum, preparing graduates for interior design roles in Cambodia's expanding hospitality, real estate and architecture sectors.", dKm: "បញ្ចូលការរចនាស្ទូឌីយោជាមួយវិស័យសំណង់ ត្រៀមខ្លួនសម្រាប់ទីផ្សារបដិសណ្ឋារកិច្ច/អចលនទ្រព្យកម្ពុជា។" },
      { n: "Architecture (B.Arch)", nKm: "ស្ថាបត្យកម្ម (B.Arch)", d: "A five-year, minimum-181-unit professional degree with eight sequential design studios, two internships, and coursework in structures, building systems and materials, plus electives like Green Design and Building Information Modelling. AUPP is not currently accepting new applicants — the program is in teach-out status.", dKm: "សញ្ញាបត្រវិជ្ជាជីវៈ៥ឆ្នាំ (បច្ចុប្បន្នមិនទទួលនិស្សិតថ្មីទេ)។" },
    ]},
  ],
  NUM: [
    { faculty: "Faculty of Management", facultyKm: "មហាវិទ្យាល័យគ្រប់គ្រង", majors: [
      { n: "Management", nKm: "គ្រប់គ្រង", d: "Housed at NUM's Wat Phnom main campus, this program traces to NUM's founding era as the Faculty of Business, built with support from the Asia Foundation, Georgetown University and the University of San Francisco, with job-placement support through NUM's USAID-backed Career Center.", dKm: "កម្មវិធីស្នូលចាស់ជាងគេរបស់ NUM ជាមួយការគាំទ្រការងារតាមរយៈមជ្ឈមណ្ឌលអាជីពគាំទ្រដោយ USAID។" },
      { n: "Marketing", nKm: "ទីផ្សារ", d: "Became a distinct major in the 1990s when NUM's predecessor, the Faculty of Business, expanded its curriculum alongside accounting and finance; the four-year program targets Cambodia's fast-growing consumer, retail and services sectors.", dKm: "កម្មវិធី៤ឆ្នាំ ឆ្លើយតបទីផ្សារប្រើប្រាស់ លក់រាយ និងសេវាកម្មដែលកំពុងរីកចម្រើន។" },
      { n: "Management of Technology", nKm: "គ្រប់គ្រងបច្ចេកវិទ្យា", d: "Trains students with a technical or scientific background to translate technology and R&D advances into market-ready innovations, with coursework on planning, executing and integrating technology-driven initiatives into organizational strategy.", dKm: "បណ្តុះបណ្តាលនិស្សិតបំប្លែងបច្ចេកវិទ្យា/ស្រាវជ្រាវទៅជានវានុវត្តន៍ទីផ្សារ។" },
      { n: "Management of Information Technology", nKm: "គ្រប់គ្រងបច្ចេកវិទ្យាព័ត៌មាន", d: "Prepares students to manage organizational information systems — assessing information needs, designing systems, and building IT architecture aligned with business goals — including applied coursework such as IT for E-commerce.", dKm: "បណ្តុះបណ្តាលការគ្រប់គ្រងប្រព័ន្ធព័ត៌មានស្របតាមគោលដៅអាជីវកម្ម។" },
    ]},
    { faculty: "Faculty of Accounting and Finance", facultyKm: "មហាវិទ្យាល័យគណនេយ្យ និងហិរញ្ញវត្ថុ", majors: [
      { n: "Accounting", nKm: "គណនេយ្យ", d: "Based at the Wat Phnom campus with a specialization track in Accounting and Taxation, this became a core major in the 1990s when the Faculty of Business restructured its four-year undergraduate curriculum.", dKm: "មានឯកទេសគណនេយ្យ និងពន្ធដារ ជាកម្មវិធីស្នូលតាំងពីទសវត្សរ៍ ១៩៩០។" },
      { n: "Finance and Banking", nKm: "ហិរញ្ញវត្ថុ និងធនាគារ", d: "Offers specialization tracks in Finance and Insurance and Finance and Security Market, added when the institution expanded into tourism, finance and MIS programs in 2004 under the NUM name.", dKm: "មានឯកទេសធានារ៉ាប់រង និងទីផ្សារមូលបត្រ។" },
      { n: "Bank Management", nKm: "គ្រប់គ្រងធនាគារ", d: "Aimed at developing senior-level bank leadership skills distinct from general finance and banking, reflecting NUM's ties to Cambodia's banking sector, with specialized bank-management coursework also offered at the graduate level.", dKm: "ផ្តោតលើជំនាញភាពជាអ្នកដឹកនាំកម្រិតខ្ពស់ក្នុងវិស័យធនាគារ។" },
    ]},
    { faculty: "Faculty of Economics", facultyKm: "មហាវិទ្យាល័យសេដ្ឋកិច្ច", majors: [
      { n: "Economics", nKm: "សេដ្ឋកិច្ច", d: "One of NUM's original four-year degree tracks, grounding students in economic theory paired with the analytical tools to track and interpret Cambodia's and the world's economies.", dKm: "កម្មវិធីដើមរបស់ NUM ផ្តោតលើទ្រឹស្ដីសេដ្ឋកិច្ច និងឧបករណ៍វិភាគ។" },
      { n: "Eco-Business", nKm: "សេដ្ឋកិច្ច-អាជីវកម្ម", d: "Blends core economics with applied business and entrepreneurship, added as NUM broadened its bachelor's offerings beyond its original management and accounting programs, for students applying economic analysis inside private-sector ventures.", dKm: "បញ្ចូលសេដ្ឋកិច្ចស្នូលជាមួយអាជីវកម្ម និងសហគ្រិនភាពអនុវត្ត។" },
      { n: "Environmental Management", nKm: "គ្រប់គ្រងបរិស្ថាន", d: "Reflects NUM's growing focus on sustainability within Cambodia's development policy, also offered as a dedicated Master of Environmental Management through the School of Graduate Studies, preparing graduates for environmental planning roles.", dKm: "ឆ្លុះបញ្ចាំងពីការផ្តោតលើចីរភាពរបស់ NUM ក្នុងគោលនយោបាយអភិវឌ្ឍន៍កម្ពុជា។" },
    ]},
    { faculty: "Faculty of Law", facultyKm: "មហាវិទ្យាល័យនីតិសាស្ត្រ", majors: [
      { n: "Law", nKm: "នីតិសាស្ត្រ", d: "A four-year program with a dedicated Moot Court and the NUM Legal Clinic for hands-on casework, partnering with the Extraordinary Chambers in the Courts of Cambodia (ECCC), the ASEAN University Network and the University of Tokyo, using case-based teaching to prepare students for bar and licensing exams.", dKm: "មានតុលាការក្លែងធ្វើផ្ទាល់ខ្លួន និងគ្លីនិកច្បាប់ សហការជាមួយអង្គជំនុំជម្រះវិសាមញ្ញក្នុងតុលាការកម្ពុជា។" },
      { n: "Business Law", nKm: "ច្បាប់ពាណិជ្ជកម្ម", d: "Draws on NUM's decade-long partnership with Japanese universities and the Japan Jurists League for Cambodia, bringing in Japanese professors and lawyers to teach comparative civil, transaction, patent and copyright law alongside Cambodian commercial law.", dKm: "ទាញយកអត្ថប្រយោជន៍ពីភាពជាដៃគូជប៉ុនរបស់ NUM បង្រៀនច្បាប់ពាណិជ្ជកម្មប្រៀបធៀប។" },
    ]},
    { faculty: "Faculty of Public Administration and Policy", facultyKm: "មហាវិទ្យាល័យរដ្ឋបាល និងគោលនយោបាយសាធារណៈ", majors: [
      { n: "Public Administration", nKm: "រដ្ឋបាលសាធារណៈ", d: "A Bachelor of Public Administration delivered through NUM's Faculty of Law in coordination with the Faculty of Public Administration and Policy, training students in the management and operations of state institutions for careers in Cambodia's civil service.", dKm: "បណ្តុះបណ្តាលការគ្រប់គ្រង និងប្រតិបត្តិការស្ថាប័នរដ្ឋសម្រាប់អាជីពមុខងារសាធារណៈ។" },
      { n: "Public Policy", nKm: "គោលនយោបាយសាធារណៈ", d: "Offered through NUM's School of Public Policy at the Veal Sbov international campus, this Bachelor of Public Policy combines political science, economics, sociology and law with policy analysis, research and communication skills for careers as civil servants or policy officers.", dKm: "បញ្ចូលវិទ្យាសាស្ត្រនយោបាយ សេដ្ឋកិច្ច សង្គមវិទ្យា និងច្បាប់ជាមួយការវិភាគគោលនយោបាយ។" },
    ]},
    { faculty: "Faculty of International Business", facultyKm: "មហាវិទ្យាល័យពាណិជ្ជកម្មអន្តរជាតិ", majors: [
      { n: "International Business", nKm: "ពាណិជ្ជកម្មអន្តរជាតិ", d: "Taught in English through NUM International College (NUMIC) at the Wat Phnom campus, this four-year iBBA can lead into a 3+1 dual-degree track finishing the final year at a partner university in France or the United States, with emphasis on global market risk and cross-border trade.", dKm: "បង្រៀនជាភាសាអង់គ្លេស អាចបន្តទៅសាកលវិទ្យាល័យបារាំង ឬអាមេរិកនៅឆ្នាំចុងក្រោយ។" },
      { n: "Logistics & Supply Chain Management", nKm: "គ្រប់គ្រងឡូជីស្ទីក និងខ្សែសង្វាក់ផ្គត់ផ្គង់", d: "Part of NUM's international-business program cluster, building skills from operational to strategic decision-making in logistics leadership; also offered as a dedicated Master of Logistics & Supply Chain Management through NUM's School of Graduate Studies.", dKm: "បង្កើតជំនាញពីកម្រិតប្រតិបត្តិការទៅកម្រិតយុទ្ធសាស្ត្រក្នុងវិស័យឡូជីស្ទីក។" },
    ]},
    { faculty: "Faculty of Information Technology", facultyKm: "មហាវិទ្យាល័យបច្ចេកវិទ្យាព័ត៌មាន", majors: [
      { n: "Information Technology", nKm: "បច្ចេកវិទ្យាព័ត៌មាន", d: "Run across NUM's Wat Phnom and Veal Sbov campuses with Bachelor of IT, Business Information Technology, and Robotics & AI tracks sharing a first-year foundation in Python, CISCO networking and design thinking, plus hands-on programs like SPARK-FIT peer mentoring and Robocon robotics competitions.", dKm: "មានផ្លូវ IT ពាណិជ្ជកម្ម និងរ៉ូបូត/AI ជាមួយមូលដ្ឋាន Python និងបណ្តាញ CISCO រួម។" },
    ]},
    { faculty: "Faculty of Tourism and Foreign Languages", facultyKm: "មហាវិទ្យាល័យទេសចរណ៍ និងភាសាបរទេស", majors: [
      { n: "Tourism and Hospitality", nKm: "ទេសចរណ៍ និងបដិសណ្ឋារកិច្ច", d: "Added to the curriculum in 2004 when the Faculty of Business became NUM, this major is also offered in English through NUM International College, at both bachelor's and master's levels.", dKm: "ក៏មានបង្រៀនជាភាសាអង់គ្លេស ទាំងកម្រិតបរិញ្ញាបត្រ និងអនុបណ្ឌិត។" },
      { n: "English Literature", nKm: "អក្សរសាស្ត្រអង់គ្លេស", d: "One of NUM's original four-year bachelor's programs, offered alongside Management, Marketing, and Accounting and Finance since the university's early curriculum expansion.", dKm: "កម្មវិធីដើមមួយក្នុងចំណោមកម្មវិធីដើមរបស់ NUM។" },
    ]},
  ],
  RULE: [
    { faculty: "Faculty of Law", facultyKm: "មហាវិទ្យាល័យនីតិសាស្ត្រ", majors: [
      { n: "Law (Khmer Program)", nKm: "នីតិសាស្ត្រ (កម្មវិធីខ្មែរ)", d: "RULE's founding Khmer-language law track traces to the university's 1949 origins as Cambodia's first institution of legal education, making it the country's oldest pipeline into the judiciary, prosecution and civil service. Graduates commonly sit bar and magistracy entrance exams to become judges, prosecutors and government legal officers.", dKm: "ដើមកំណើតតាំងពីឆ្នាំ១៩៤៩ ជាស្ថាប័នអប់រំច្បាប់ចាស់ជាងគេនៅកម្ពុជា ត្រៀមចៅក្រម និងព្រះរាជអាជ្ញា។" },
      { n: "Law (English Program)", nKm: "នីតិសាស្ត្រ (កម្មវិធីអង់គ្លេស)", d: "Known as ELBBL (English Language-Based Bachelor of Law), this evening program was founded in 2002 with up to four elective specializations, a clinical legal education component placing final-year students with real communities since 2016, and the Center for the Study of Humanitarian Law (est. 2014). Alumni work as judges, lawyers, arbitrators and notaries, with many pursuing graduate study abroad.", dKm: "ELBBL ជាកម្មវិធីល្ងាច ជាមួយអប់រំច្បាប់គ្លីនិកជាក់ស្តែងចាប់តាំងពី២០១៦។" },
      { n: "Trilingual Law Program", nKm: "កម្មវិធីនីតិសាស្ត្រត្រៃភាសា", d: "Run through RULE's French Cooperation Pole (active since 1994) with Lumière Lyon 2 University, this is the only law bachelor's in Cambodia taught fully in French alongside Khmer and English coursework. Students graduate with two diplomas — one from RULE, one from Lyon 2 — giving European-system recognition.", dKm: "បង្រៀនជាភាសាបារាំង ខ្មែរ និងអង់គ្លេស ជាមួយសញ្ញាបត្រពីរជាមួយសាកលវិទ្យាល័យ Lyon 2 បារាំង។" },
      { n: "Law (Japanese-Khmer)", nKm: "នីតិសាស្ត្រ (ជប៉ុន-ខ្មែរ)", d: "RULE hosts Nagoya University's Research and Education Center for Japanese Law (est. 2008), training roughly 20 students a year toward JLPT Level 1-2 Japanese proficiency alongside legal studies, including short-term study visits to Nagoya University and observation of live Japanese court proceedings.", dKm: "សហការជាមួយសាកលវិទ្យាល័យ Nagoya ជប៉ុន ត្រៀមភាសាជប៉ុនកម្រិត JLPT ១-២ រួមជាមួយច្បាប់។" },
      { n: "Law (Chinese-Khmer)", nKm: "នីតិសាស្ត្រ (ចិន-ខ្មែរ)", d: "This track pairs Cambodian legal training with Chinese-language study, supported by exchanges such as a two-week program at Southwest University of Political Science and Law in Chongqing, aimed at students pursuing legal careers connected to China.", dKm: "បញ្ចូលការសិក្សាច្បាប់ខ្មែរជាមួយភាសាចិន សម្រាប់អាជីពទាក់ទងនឹងចិន។" },
    ]},
    { faculty: "Faculty of Public Administration", facultyKm: "មហាវិទ្យាល័យរដ្ឋបាល", majors: [
      { n: "Public Administration", nKm: "រដ្ឋបាលសាធារណៈ", d: "RULE positions itself as Cambodia's leading university in public administration; this program trains students for the civil service and government ministries with practical components like constitutional-law seminars and visits to the National Assembly and Senate.", dKm: "RULE ចាត់ទុកខ្លួនជាសាកលវិទ្យាល័យឈានមុខគេផ្នែករដ្ឋបាលសាធារណៈនៅកម្ពុជា។" },
      { n: "International Relations (English Program)", nKm: "ទំនាក់ទំនងអន្តរជាតិ (កម្មវិធីអង់គ្លេស)", d: "This English-taught track prepares students for diplomacy, international organizations and regional affairs, drawing on RULE's ASEAN University Network membership (since 2009) and academic exchange agreements across roughly 18 countries.", dKm: "ត្រៀមខ្លួនសម្រាប់ការទូត និងអង្គការអន្តរជាតិ ជាសមាជិក ASEAN University Network។" },
    ]},
    { faculty: "Faculty of Economics and Management", facultyKm: "មហាវិទ្យាល័យសេដ្ឋកិច្ច និងគ្រប់គ្រង", majors: [
      { n: "Economics", nKm: "សេដ្ឋកិច្ច", d: "Built on a dual-degree curriculum developed with Lumière Lyon 2 University (partnership since 1994) covering macro/microeconomics and international economics, preparing graduates for banking, government planning and development-organization roles in Cambodia's transitional economy.", dKm: "សញ្ញាបត្រពីរជាមួយ Lyon 2 បារាំង ត្រៀមខ្លួនសម្រាប់ធនាគារ និងផែនការរដ្ឋាភិបាល។" },
      { n: "Business Administration", nKm: "រដ្ឋបាលពាណិជ្ជកម្ម", d: "Covers business strategy, marketing and human resources management, and can be paired with RULE's French Cooperation Pole dual-degree track with Lyon 2 for a second European diploma alongside mandatory internships.", dKm: "គ្របដណ្តប់យុទ្ធសាស្ត្រអាជីវកម្ម ទីផ្សារ និងធនធានមនុស្ស។" },
      { n: "Accounting", nKm: "គណនេយ្យ", d: "Covers managerial and financial accounting, feeding graduates into Cambodia's corporate, audit and banking sectors centered in Phnom Penh, with mandatory internships built into the RULE-Lyon 2 dual-degree track.", dKm: "គ្របដណ្តប់គណនេយ្យគ្រប់គ្រង និងហិរញ្ញវត្ថុ ជាមួយកម្មសិក្សាកាតព្វកិច្ច។" },
      { n: "Finance and Banking", nKm: "ហិរញ្ញវត្ថុ និងធនាគារ", d: "Focuses on financial management and banking operations for Cambodia's fast-growing banking and microfinance sector, and is one of the domains covered under RULE's dual-degree partnership with Lumière Lyon 2 University.", dKm: "ផ្តោតលើគ្រប់គ្រងហិរញ្ញវត្ថុ និងប្រតិបត្តិការធនាគារ។" },
    ]},
    { faculty: "Faculty of Information Economics", facultyKm: "មហាវិទ្យាល័យសេដ្ឋកិច្ចព័ត៌មាន", majors: [
      { n: "Information Economics", nKm: "សេដ្ឋកិច្ចព័ត៌មាន", d: "Delivered by RULE's dedicated Faculty of Information Economics, this program pairs economic theory with information technology and data/statistical analysis, combining quantitative IT skills with economics in a way RULE's other economics tracks don't.", dKm: "បញ្ចូលទ្រឹស្ដីសេដ្ឋកិច្ចជាមួយបច្ចេកវិទ្យាព័ត៌មាន និងការវិភាគទិន្នន័យ។" },
    ]},
  ],
  CADT: [
    { faculty: "Institute of Digital Technology", facultyKm: "វិទ្យាស្ថានបច្ចេកវិទ្យាឌីជីថល", majors: [
      { n: "Computer Science", nKm: "វិទ្យាសាស្ត្រកុំព្យូទ័រ", d: "Delivered through CADT's Institute of Digital Technology, this 4-year bachelor's program was one of the first dedicated Computer Science degrees in Cambodia and splits into Software Engineering and Data Science specializations. All applicants sit CADT's own entrance exam, and the program feeds CADT's mission to build technical talent for Cambodia's digital government, economy and society.", dKm: "កម្មវិធីវិទ្យាសាស្ត្រកុំព្យូទ័រដំបូងគេមួយនៅកម្ពុជា មានឯកទេសសូហ្វវែរ និងវិទ្យាសាស្ត្រទិន្នន័យ។" },
      { n: "Telecoms & Networking", nKm: "ទូរគមនាគមន៍ និងបណ្តាញ", d: "A 4-year bachelor's program — one of CADT's original three degrees alongside Computer Science and Digital Business — training students in telecom infrastructure and network systems, with a choice between a Telecoms & Networking specialization and a Cyber Security specialization covering network defense and digital-security practice.", dKm: "មានឯកទេសបណ្តាញទូរគមនាគមន៍ ឬសន្តិសុខអនឡាញ។" },
      { n: "Digital Business (E-Commerce)", nKm: "ពាណិជ្ជកម្មឌីជីថល (អ៊ីខមមើស)", d: "A 3.5-year bachelor's program specialized in e-Commerce, covering digital marketing, online business operations and e-commerce platform management for Cambodia's expanding digital marketplace — part of CADT's founding lineup of bachelor's degrees, the first of their kind in the country.", dKm: "គ្របដណ្តប់ទីផ្សារឌីជីថល និងគ្រប់គ្រងអាជីវកម្មអនឡាញ។" },
    ]},
  ],
  UHS: [
    { faculty: "Faculty of Medicine", facultyKm: "មហាវិទ្យាល័យវេជ្ជសាស្ត្រ", majors: [
      { n: "Medicine (Doctor of Medicine)", nKm: "វេជ្ជសាស្ត្រ (បណ្ឌិតវេជ្ជសាស្ត្រ)", d: "UHS traces to Cambodia's 1946 Royal School for Medical Officers and its Faculty of Medicine runs an 8-year integrated track — a 6-year Bachelor of Medical Sciences followed by a 2-year clinical internship — leading to a Doctor of Medicine (MD). Graduates can continue into 3-4 year MD-D.E.S. specialty tracks in fields like internal medicine, cardiology, surgery, pediatrics and psychiatry.", dKm: "កម្មវិធីរួម៨ឆ្នាំ (៦ឆ្នាំវិទ្យាសាស្ត្រពេទ្យ + ២ឆ្នាំបំពេញការជាគ្លីនិក) នាំទៅរកសញ្ញាបត្របណ្ឌិតវេជ្ជសាស្ត្រ។" },
    ]},
    { faculty: "Faculty of Pharmacy", facultyKm: "មហាវិទ្យាល័យឱសថសាស្ត្រ", majors: [
      { n: "Pharmacy", nKm: "ឱសថសាស្ត្រ", d: "A 5-year Bachelor of Pharmacy (BPharm) program covering pharmaceutical sciences, drug formulation and clinical pharmacy practice, with further Doctor of Pharmacy (PharmD, 3+ years) and MSc/PhD research tracks available to graduates pursuing pharmaceutical research or advanced clinical pharmacy careers.", dKm: "បរិញ្ញាបត្រ៥ឆ្នាំ គ្របដណ្តប់វិទ្យាសាស្ត្រឱសថ និងការអនុវត្តគ្លីនិក។" },
    ]},
    { faculty: "Faculty of Dentistry", facultyKm: "មហាវិទ្យាល័យទន្តសាស្ត្រ", majors: [
      { n: "Dentistry", nKm: "ទន្តសាស្ត្រ", d: "A 5-year Bachelor of Dental Sciences (BDentSc) program that can extend into a 7-year Doctor of Dental Surgery (DDS) track, covering oral health, restorative dentistry and dental surgery, with a Master of Dental Sciences in Orthodontics (4 years) open to DDS holders.", dKm: "បរិញ្ញាបត្រ៥ឆ្នាំ អាចបន្តទៅជាបណ្ឌិតវះកាត់ធ្មេញ៧ឆ្នាំ។" },
    ]},
    { faculty: "Technical School for Medical Care", facultyKm: "សាលាបច្ចេកទេសថែទាំវេជ្ជសាស្ត្រ", majors: [
      { n: "Nursing", nKm: "គិលានុបដ្ឋាយិកា", d: "A 4-year Bachelor of Science in Nursing (BSN), with 3-year diploma and bridging-program pathways for diploma holders, training students in clinical nursing care, patient management and health-system practice for hospital and community health roles.", dKm: "បរិញ្ញាបត្រវិទ្យាសាស្ត្រគិលានុបដ្ឋាក ៤ឆ្នាំ ជាមួយផ្លូវសញ្ញាបត្រ៣ឆ្នាំ។" },
      { n: "Midwifery", nKm: "ឆមប", d: "A 4-year Bachelor in Midwifery (BMidW), with 3-year diploma and bridging pathways, covering maternal and reproductive health, prenatal care and delivery practice for roles in hospitals and community maternal-health services.", dKm: "បរិញ្ញាបត្រឆមប៤ឆ្នាំ គ្របដណ្តប់សុខភាពមាតា និងទារកព្រមទាំងការសម្រាលកូន។" },
      { n: "Medical Laboratory Technology", nKm: "បច្ចេកទេសមន្ទីរពិសោធន៍វេជ្ជសាស្ត្រ", d: "A diploma-to-bachelor track training students in diagnostic laboratory science — clinical chemistry, hematology, microbiology and pathology testing — for medical laboratory technician roles in hospitals and clinics.", dKm: "បណ្តុះបណ្តាលការធ្វើតេស្តគីមី ឈាមវិទ្យា និងមីក្រូជីវវិទ្យា។" },
      { n: "Physiotherapy", nKm: "ព្យាបាលដោយចលនា", d: "A diploma-to-bachelor track covering physical rehabilitation, musculoskeletal therapy and patient mobility care, preparing graduates for physiotherapist roles in hospitals and rehabilitation centers.", dKm: "គ្របដណ្តប់ការស្តារនីតិសម្បទា និងព្យាបាលឆ្អឹង/សាច់ដុំ។" },
      { n: "Medical Imaging (Radiation Technology)", nKm: "រូបភាពវេជ្ជសាស្ត្រ (បច្ចេកទេសវិទ្យុសកម្ម)", d: "A diploma-to-bachelor track training students in diagnostic imaging — X-ray, ultrasound and radiologic technology — for medical imaging technician roles in hospitals and diagnostic centers.", dKm: "បណ្តុះបណ្តាល X-ray អ៊ុលត្រាសោន និងបច្ចេកទេសរូបភាពវិនិច្ឆ័យ។" },
    ]},
    { faculty: "Department of Public Health", facultyKm: "នាយកដ្ឋានសុខាភិបាលសាធារណៈ", majors: [
      { n: "Public Health", nKm: "សុខាភិបាលសាធារណៈ", d: "Launched in the 2013-2014 academic year and delivered with Cambodia's National Institute of Public Health, this Bachelor of Public Health (BPH) covers epidemiology, health systems and community health, with master's-level pathways for graduates pursuing public-health policy or research careers.", dKm: "សហការជាមួយវិទ្យាស្ថានជាតិសុខាភិបាលសាធារណៈ គ្របដណ្តប់រោគរាតត្បាត និងសុខភាពសហគមន៍។" },
    ]},
  ],
};

/* Placeholder scholarship data — NOT sourced from official pages. Names, coverage, requirements
   and exam/deadline dates below are illustrative examples for prototyping the Scholarships UI.
   Replace with each university's verified, current-year figures before treating this as real
   guidance for students. */
export const UNI_SCHOLARSHIPS = {
  RUPP: [
    {
      name: "ASEAN Merit Scholarship",
      coverage: "Full tuition waiver + monthly stipend",
      requirements: ["BAC II grade A or B", "Top 10% of RUPP entrance exam applicants", "English proficiency (IELTS 5.5+ or equivalent)"],
      examDate: "Early September (entrance exam) — illustrative date, verify with RUPP",
    },
    {
      name: "Rural Student Support Grant",
      coverage: "50% tuition reduction",
      requirements: ["Household registered in a rural province", "BAC II grade B or above", "Recommendation letter from high school director"],
      examDate: "Rolling application, before intake deadline — illustrative date, verify with RUPP",
    },
  ],
  ITC: [
    {
      name: "Government Priority Scholarship (STEM)",
      coverage: "Full tuition + dormitory housing",
      requirements: ["BAC II grade A in Mathematics and Physics", "Pass ITC's Tronc Commun entrance exam", "Cambodian citizenship"],
      examDate: "Late August (entrance exam) — illustrative date, verify with ITC",
    },
    {
      name: "Women in Engineering Scholarship",
      coverage: "75% tuition reduction",
      requirements: ["Female applicant", "BAC II grade B or above in a science track", "Interview with the Faculty of Electrical Engineering"],
      examDate: "September, alongside general admissions — illustrative date, verify with ITC",
    },
  ],
  AUPP: [
    {
      name: "Presidential Scholarship",
      coverage: "Up to 100% tuition, renewable yearly with GPA requirement",
      requirements: ["BAC II grade A", "SAT/AUPP placement test in top bracket", "Personal statement + interview"],
      examDate: "Rolling — placement test scheduled after application, typically July–August (illustrative)",
    },
    {
      name: "Need-Based Financial Aid Grant",
      coverage: "25%–60% tuition, based on demonstrated need",
      requirements: ["Family income documentation", "BAC II grade C or above", "Completed financial aid application form"],
      examDate: "Reviewed on a rolling basis each semester — illustrative, verify with AUPP admissions",
    },
  ],
  NUM: [
    {
      name: "NUM Excellence Scholarship",
      coverage: "Full tuition for Year 1, merit-renewable after",
      requirements: ["BAC II grade A", "Top scorer on NUM's own entrance assessment", "Enrollment in Management, Accounting, Finance or Law"],
      examDate: "Early September (entrance assessment) — illustrative date, verify with NUM",
    },
    {
      name: "Provincial Access Scholarship",
      coverage: "40% tuition reduction",
      requirements: ["Household outside Phnom Penh", "BAC II grade B or above", "Commitment letter to complete the full program"],
      examDate: "Rolling, before each semester intake — illustrative date, verify with NUM",
    },
  ],
  RULE: [
    {
      name: "Francophonie Law Scholarship",
      coverage: "Full tuition for the Trilingual (French) Law Program + study-exchange stipend",
      requirements: ["BAC II grade B or above", "French proficiency (DELF B1 or equivalent)", "Pass RULE's Trilingual Program entrance interview"],
      examDate: "Late August (entrance interview) — illustrative date, verify with RULE",
    },
    {
      name: "Public Service Merit Award",
      coverage: "50% tuition reduction",
      requirements: ["BAC II grade B or above", "Essay on public administration or legal reform in Cambodia", "Interview with the Faculty of Public Administration"],
      examDate: "September, alongside general admissions — illustrative date, verify with RULE",
    },
  ],
  CADT: [
    {
      name: "Digital Talent Scholarship",
      coverage: "Full tuition + laptop stipend",
      requirements: ["BAC II grade A in Mathematics", "Pass CADT's own entrance exam in top applicants", "Basic coding assessment (no prior experience required)"],
      examDate: "Early September (entrance exam) — illustrative date, verify with CADT",
    },
    {
      name: "Women in Tech Grant",
      coverage: "60% tuition reduction",
      requirements: ["Female applicant", "BAC II grade B or above", "Short motivation essay on digital technology in Cambodia"],
      examDate: "Rolling, before intake deadline — illustrative date, verify with CADT",
    },
  ],
  UHS: [
    {
      name: "Ministry of Health Priority Scholarship",
      coverage: "Full tuition for Medicine, Pharmacy or Dentistry programs",
      requirements: ["BAC II grade A in Biology and Chemistry", "Top scorer on UHS entrance exam", "Commitment to public-hospital service after graduation (per program terms)"],
      examDate: "Late August (entrance exam) — illustrative date, verify with UHS",
    },
    {
      name: "Provincial Health Workforce Grant",
      coverage: "50% tuition reduction for Nursing, Midwifery or Medical Laboratory Technology",
      requirements: ["Household outside Phnom Penh", "BAC II grade B or above in a science track", "Commitment letter to serve in a provincial health facility post-graduation"],
      examDate: "Rolling, before intake deadline — illustrative date, verify with UHS",
    },
  ],
};
