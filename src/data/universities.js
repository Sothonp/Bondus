/* Real Cambodian university & major data — sourced from each university's official site.
   Shared between the frontend (Universities tab, AI Coach) and the /api/major-guidance
   serverless function, so both stay grounded in the same real data. */

export const UNIS = [
  { n: "Royal University of Phnom Penh", abbr: "RUPP", ready: 42, c: "var(--primary)", logo: "/logos/rupp.png" },
  { n: "Institute of Technology of Cambodia", abbr: "ITC", ready: 35, c: "var(--ember)", logo: "/logos/itc.png" },
  { n: "American University of Phnom Penh", abbr: "AUPP", ready: 38, c: "var(--gold)", logo: "/logos/aupp.png" },
  { n: "National University of Management", abbr: "NUM", ready: 44, c: "var(--jade)", logo: "/logos/num.png" },
  { n: "Royal University of Law and Economics", abbr: "RULE", ready: 30, c: "var(--muted)", logo: "/logos/rule.png" },
  { n: "Cambodia Academy of Digital Technology", abbr: "CADT", ready: 33, c: "var(--primary)", logo: "/logos/cadt.png" },
  { n: "University of Health Sciences", abbr: "UHS", ready: 25, c: "var(--ember)", logo: "/logos/uhs.png" },
];

export const UNI_MAJORS = {
  RUPP: [
    { faculty: "Faculty of Science", majors: [
      { n: "Biology", d: "RUPP's Department of Biology (est. 1988) has students complete a Foundation Year before branching into zoology, botany, microbiology, ecology and biotechnology, with recognized departmental strength in ecology, entomology and Cambodian biodiversity research. Graduates move into education, research, environmental management, healthcare and industry through the department's national and regional research partnerships." },
      { n: "Chemistry", d: "RUPP runs Chemistry as a separate track from its own Bio-Chemistry bachelor's program — a split between general/analytical chemistry and applied biochemistry rather than one combined major. It feeds directly into RUPP's in-house MSc and PhD Chemistry programs, giving strong undergraduates a clear pipeline into the university's own graduate research." },
      { n: "Computer Science", d: "RUPP's B.Sc. curriculum pairs a formal software-engineering sequence (requirements analysis, system design, SDLC-based development) with dedicated data-communications coursework — voice-band, baseband and broadband transmission, LAN/WAN/MAN administration, and Intranet/web/email server management. The department also runs its own Master's in Computer Science as a direct in-house path to graduate study." },
      { n: "Environmental Science", d: "Established in 2001, RUPP's Environmental Science department was Cambodia's first and remains its leading program in the field, offering a Pollution/Urban Environmental Science track (~153 credits) and a Natural Resource Management track (~151 credits). It also anchors RUPP's Master of Science in Biodiversity Conservation and its Climate Change Master's program." },
      { n: "Mathematics", d: "RUPP's Department of Mathematics runs its own BSc through PhD pipeline, pairing theoretical statistics (hypothesis testing, regression, SPSS) with applied numerical methods (Taylor series, spline interpolation, numerical ODE solving) and hands-on C programming. That combination of pure math and computational/statistical tooling is uncommon in a standalone math degree." },
      { n: "Physics", d: "RUPP's Physics program combines a renewable-energy specialization — solar PV/thermal, wind turbines, mini/macro hydro, geothermal and biomass systems — with an electronics track covering semiconductors, diodes, transistors, ICs and analog/digital circuit design. That dual focus targets both Cambodia's growing renewable-energy sector and electronics/instrumentation work." },
    ]},
    { faculty: "Faculty of Engineering", majors: [
      { n: "Bio-Engineering / Biotechnology", d: "This English-medium program in the Faculty of Engineering's Department of Bio-Engineering was developed and is taught in partnership with Sweden's Umeå University, Lund University and the Swedish University of Agricultural Sciences. It trains engineers in biotechnology and food-technology fundamentals to build Cambodia's applied-bioscience research and education capacity." },
      { n: "Business & Supply Chain Analytics", d: "Run by RUPP's Department of Automation & Supply Chain Systems Engineering (est. 2022) as a 2+2 program with Thailand's Sirindhorn International Institute of Technology — years 1-2 at RUPP, years 3-4 in Thailand — the 168-credit degree centers on automation, digital manufacturing and Industry 4.0 supply-chain optimization. It was created specifically to support the Cambodian government's manufacturing-digitalization strategy." },
      { n: "Data Science and Engineering", d: "Taught in English by RUPP's Department of Information Technology Engineering, this major applies engineering-track rigor to data analytics, systems and pipelines rather than a standalone stats/CS approach. The same department also runs an in-house Master's in Data Science and Engineering for direct progression." },
      { n: "Environmental Engineering", d: "One of the international programs in RUPP's Faculty of Engineering (founded 2013 with seven degree programs across five departments), this major has its own department distinct from the Faculty of Science's Environmental Science program, applying engineering methods to water, waste and pollution-control systems. It targets infrastructure-level environmental solutions rather than the Science faculty's policy/management focus." },
      { n: "Food Technology Engineering", d: "Established in February 2022 with input from experts at Osaka Prefecture University, this Bachelor of Engineering focuses on food safety, nutrition, sensory quality and processing from raw produce to finished products. It was created explicitly to supply skilled food technologists for Cambodia's agro-industry and food-security development." },
      { n: "Information Technology Engineering", d: "Delivered by RUPP's Department of Information Technology Engineering alongside its Data Science and Engineering major, this Bachelor of Engineering applies an engineering curriculum — rather than pure computer science — to IT systems design and infrastructure. The department also runs its own Master of IT Engineering for graduates continuing on." },
      { n: "Telecommunication & Electronics Engineering", d: "Offered by RUPP's dedicated Department of Telecommunication and Electronic Engineering, one of the Faculty of Engineering's five founding departments (2013), this Bachelor of Engineering trains students specifically in telecom and electronics systems — distinct from the Physics department's electronics coursework in the Faculty of Science." },
    ]},
    { faculty: "Institute of Foreign Languages", majors: [
      { n: "English (for Work Skills)", d: "Introduced in 1997, this four-year BA has students take common coursework through Year III before choosing a Year IV specialization in English for International Business, Translation and Interpreting, or Professional Communication. It's explicitly vocational, aimed at employers needing advanced English rather than literary or linguistic study." },
      { n: "Teaching English as a Foreign Language (TEFL)", d: "RUPP's B.Ed. in TEFL shares Years II-III coursework with the English for Work Skills degree before diverging into education-specific pedagogy and a required teaching practicum, training graduates to teach English at Cambodia's secondary and tertiary levels." },
      { n: "Chinese", d: "One of IFL's six language departments, Chinese offers a four-year BA built on the same Foundation Year plus Years II-IV specialization structure used across RUPP's language programs, geared toward business, translation, or education careers." },
      { n: "French", d: "RUPP's French department sits within the Institute of Foreign Languages — housed in a landmark building designed by Cambodian architect Vann Molyvann (completed 1972) — and benefits from RUPP's membership in the Agence Universitaire de la Francophonie (AUF), giving direct ties to Francophonie academic networks." },
      { n: "Japanese", d: "Established in 2003 as the first bachelor's-level Japanese program in Cambodia, this department splits into a B.Ed. track for future Japanese teachers and a BA in Japanese for Business for corporate careers, after a shared Foundation Year covering Hiragana, Katakana, Kanji, grammar and conversation." },
      { n: "Korean", d: "Officially established March 9, 2007, RUPP's Department of Korean Studies offers a four-year BA covering listening, speaking, reading and writing proficiency alongside broader Korean studies — one of IFL's newer departments, reflecting growing Cambodia-Korea ties." },
      { n: "Thai", d: "RUPP's Department of Thai offers a four-year B.Ed. following IFL's standard model — shared Foundation Year, common Years II-III coursework, then Year IV specialization in Thai-language skills and pedagogy — aimed at Cambodia's demand for Thai-language professionals." },
    ]},
    { faculty: "Faculty of Development Studies", majors: [
      { n: "Community Development", d: "This program covers agricultural restructuring, sustainable resource management, rural poverty, women in rural development, and the role of NGOs and micro-credit, building skills to plan, implement and evaluate community action strategies, plus a human-rights component examining UN conventions applied to welfare work." },
      { n: "Economic Development", d: "RUPP's Bachelor in Economic Development requires a minimum of 132 credits (excluding a 15-credit BA thesis or 9-credit research report option), with English instruction delivered through RUPP's own English Language Studies Unit during the Foundation Year." },
      { n: "Natural Resources Management and Development", d: "A multidisciplinary program spanning the social and natural-science dimensions of resource management, with many courses tied to field practice involving direct interaction with local communities, practitioners and policymakers around real Cambodian land-use conflicts." },
    ]},
    { faculty: "Faculty of Education", majors: [
      { n: "Education Studies", d: "One of three departments in RUPP's Faculty of Education (alongside Higher Education Management and Lifelong Learning), this program trains students in educational policy and practice across general education levels, in a faculty that now spans certificate through PhD study." },
      { n: "Lifelong Learning", d: "Created to institutionalize lifelong learning as its own field of study, this department serves education and training needs beyond the classroom — workplace and community settings — with the explicit aim of maximizing human capital across Cambodian society." },
    ]},
    { faculty: "Faculty of Social Science and Humanities", majors: [
      { n: "Geography and Land Management", d: "This BA combines geographic coursework with field-based land-administration training; the department expanded into graduate education with a Master of Arts in Geography launched in 2022, preparing graduates for land-use, planning and government roles specific to Cambodia." },
      { n: "History", d: "RUPP's BA in History emphasizes Khmer, Asian and world history with particular focus on Cambodia's and Southeast Asia's socio-economic, political and cultural development. Graduates go into teaching, research, library and government/NGO administration, and tourism, or continue into postgraduate political science or international relations." },
      { n: "Khmer Literature", d: "This department trains students to analyze, explain and compare all aspects of Khmer language and literature as the foundation of Khmer culture and identity, building advanced social-research skills over four years. Graduates commonly move into teaching, journalism, and government culture/tourism roles." },
      { n: "Linguistics", d: "RUPP's four-year BA teaches general linguistic theory and analysis with particular focus on the Khmer language, training students in description, comparison and applied research. Graduates work in language teaching, translation/interpreting, dictionary compilation, publishing and mass media." },
      { n: "Media and Communication", d: "This four-year BA in Media Management, taught substantially in English, covers print, broadcast and multimedia/online journalism, photojournalism, media law and ethics, PR/advertising, and newsroom production, culminating in a thesis or production project. Admission requires demonstrated English proficiency plus RUPP's own entrance exam and interview." },
      { n: "Philosophy", d: "RUPP's BA curriculum runs from Introduction to Ethics and Political Philosophy through Medieval/Renaissance and Modern Philosophy — Hobbes, Locke, Descartes, Hume, Hegel, Kant — paired with a Research Methodology course and a thesis requirement." },
      { n: "Psychology", d: "Tracing to 1980 as part of a combined Faculty of Psycho-Pedagogy, with a dedicated psychology degree since 1994, admission is based on High School Certificate results in Mathematics and Biology. Graduates commonly become counselors at clinics, schools and rehabilitation centers, or join the Ministries of Women's or Social Affairs." },
      { n: "Social Work", d: "Established in 2008, this runs Cambodia's first Bachelor of Social Work, with a Year 3 Field Learning placement and a Year 4 practicum built around an individualized project at an assigned agency. Its community-development sequence explicitly contrasts needs-based versus rights-based approaches to development." },
      { n: "Sociology", d: "Based at RUPP's Campus II, this BA examines youth issues, environmental issues, media ethics, the impact of international organizations on developing economies, and the effects of tourism — linking sociological theory directly to real Cambodian social problems to inform government and NGO decisions." },
      { n: "Tourism", d: "Opened in 2001, this interdisciplinary BA in Tourism Management focuses on research-based, sustainable tourism development rather than hospitality-operations training. The department also runs RUPP's Master of Arts in Sustainable Tourism Management and Excellence." },
    ]},
    { faculty: "Institute for International Studies and Public Policy", majors: [
      { n: "International Economics", d: "RUPP's IISPP offers a BSc in Economics with named concentrations in international economics, digital economy, managerial economics and actuarial economics rather than one generalist track. International-concentration graduates go on to roles as trade officers, market/financial analysts, actuarial analysts and fintech consultants." },
      { n: "International Relations", d: "This BA (minimum 120 credits) splits at senior year into a standard IR track with concentrations in International Relations or International Trade and Entrepreneurship, and a separate BA in International Studies (Honours). It earned ASEAN University Network Quality Assurance accreditation in 2024, targeting UN agencies, embassies, NGOs and multinationals." },
      { n: "Political Science and Public Policy", d: "This BA in Politics and Public Administration is delivered through interactive lectures, seminars, workshops, case studies and simulations rather than a purely lecture-based format. Graduates typically move into policy officer roles, government liaison work, advising/lobbying, or research and teaching." },
      { n: "Vietnamese Studies", d: "This BA offers distinct tracks in Vietnamese Translation and Interpretation and Vietnamese Business Communication, plus a Pre-Departure Vietnamese Language Program for students headed to Vietnam, built to grow Cambodian expertise as bilateral ties deepen." },
    ]},
  ],
  ITC: [
    { faculty: "Faculty of Electrical Engineering", majors: [
      { n: "Electrical and Energy Engineering", d: "One of ITC's founding departments (est. 1964, alongside Civil Engineering), this 5-year, ~150-credit engineer's degree covers electrical energy, automation, electronics and telecommunications tracks, with strong graduate placement across Cambodia's power and industrial sectors." },
      { n: "Industrial and Mechanical Engineering", d: "Established in 1999 from the earlier Department of Industrial and Mine, this department trains mechanical and industrial engineers through Dynamics & Control, Materials Science, and Thermal laboratories, and hosts the ECAM Engineering dual-degree pathway with ECAM LaSalle of Lyon, France." },
      { n: "Information and Communication Technology", d: "Delivered by ITC's Department of Information and Communication Engineering (GIC), the 5-year engineer's degree can extend into an optional Master in Mobile Technology, with mandatory internships at firms like Smart, Cellcard, Sabay and Wing, plus Erasmus+-linked exchanges in Europe, Thailand and China." },
      { n: "Telecommunication and Network Engineering", d: "A department distinct from ICT within the Faculty of Electrical Engineering, focused specifically on telecom infrastructure and network systems engineering for Cambodia's telecom operators and network industry." },
      { n: "Applied Mathematics and Statistics", d: "This department provides the quantitative foundation for ITC's engineering faculties at undergraduate level, while its graduate track specializes in machine learning, data analytics, educational data mining and predictive modeling for the SDGs." },
    ]},
    { faculty: "Faculty of Civil Engineering", majors: [
      { n: "Civil Engineering", d: "ITC's oldest department (founded 1964) runs from a shared Tronc Commun foundation year into reinforced concrete design, soil mechanics, road/bridge construction and earthquake engineering, using dedicated Road Materials, Soil Mechanics and Construction Materials labs. Top students can pursue scholarship pathways with partner universities in France, Belgium, Japan and China." },
      { n: "Architectural Engineering", d: "Launched roughly a decade ago to produce graduates who are both architects and structural engineers, the 5-year GAR program (2-year Tronc Commun + 3-year specialization, 45 courses) centers on a five-part Architectural Design Workshop sequence and two mandatory internships, with exchanges in France, Belgium, Thailand and Japan." },
      { n: "Infrastructure and Transportation", d: "Run by the Department of Transport and Infrastructure Engineering (GTI), this program trains engineers in road/bridge design, maintenance and repair alongside transportation and logistics planning, using a Transport Laboratory equipped with GNSS, LIDAR and PTV VISSIM traffic-simulation tools." },
    ]},
    { faculty: "Faculty of Hydrology and Water Resources Engineering", majors: [
      { n: "Water Resources and Rural Infrastructure", d: "Focused on river-basin management, hydraulic structures and rural infrastructure design, this program includes GIS/remote sensing and climate-change coursework to prepare engineers for water resources planning and construction across Cambodia." },
      { n: "Water Environmental Engineering", d: "Run by the Department of Water and Environmental Engineering, this program trains engineers in water supply, sanitation and wastewater treatment aimed at Cambodia's environmental protection and public-health infrastructure needs." },
    ]},
    { faculty: "Faculty of Geo-Resources and Geotechnical Engineering", majors: [
      { n: "Geotechnical Engineering", d: "Part of a faculty created as a department in 2011 and elevated to full faculty status in 2017 to meet Cambodia's emerging natural-resource development needs, this track covers soil mechanics and foundation engineering for construction projects." },
      { n: "Geo-Resources and Petroleum", d: "Sharing a faculty with Geotechnical Engineering, this track covers geology, mining and petroleum engineering, supported by a dedicated Petroleum Engineering Lab, to supply engineers for Cambodia's developing oil, gas and mining sectors." },
    ]},
    { faculty: "Faculty of Chemical and Food Engineering", majors: [
      { n: "Chemical Engineering", d: "Based in the Chemical Engineering and Food Technology department, this program is oriented toward Cambodia's agro-industry and environmental-management sectors and feeds into ITC's Master of Agro-Industrial Engineering for continuing students." },
      { n: "Food Science and Technology", d: "Delivered through ITC's Agro-Industrial Engineering track, this program pairs food technology and process engineering with business management coursework, supported by the Food Technology and Nutrition research unit's work on processing, storage and preservation." },
    ]},
    { faculty: "International Engineering Program (taught in English)", majors: [
      { n: "Artificial Intelligence Engineering and Cybersecurity", d: "A 5-year, English-medium track (equivalent to Master's/M1 level) leading to a double degree with an international partner university in France, Australia, the EU, Malaysia, Thailand or Indonesia, with annual industry internships and project-based coursework." },
      { n: "Software Engineering", d: "An English-medium, 5-year International Engineering Program major combining project-based software development coursework with annual internships at industry partners, leading to a double degree from ITC and an international partner university." },
      { n: "Materials Science and Engineering", d: "One of the newer (2024) English-medium IEP majors added when ITC expanded its double-degree partnerships to France, Australia, the EU, Malaysia, Thailand and Indonesia, offering a 5-year track with annual industry internships." },
      { n: "Electronics and Smart Automation System", d: "An English-medium, 5-year IEP major combining electronics and automation coursework with project-based learning and annual industrial internships, awarding a double degree through ITC's international partner universities." },
      { n: "Sustainable Engineering and Business", d: "An English-medium IEP major pairing engineering fundamentals with sustainability and business coursework over a 5-year double-degree track with ITC's international partner universities." },
      { n: "Construction Management and Infrastructure Engineering", d: "One of ITC's newer (2024) English-medium IEP majors, combining construction management with infrastructure engineering over a 5-year double-degree track delivered with partner universities in France, Australia, the EU, Malaysia, Thailand and Indonesia." },
      { n: "Robotics and Automation Engineering", d: "A double-degree pathway with ECAM LaSalle of Lyon, France: after ITC's shared foundation years, students complete ECAM's 3-year robotics/automation syllabus taught in English at ITC, graduating with both an ECAM engineer's degree and an ITC Master's-equivalent degree." },
      { n: "Industrial Engineering and Supply Chain Management", d: "The other ECAM LaSalle (Lyon, France) double-degree pathway at ITC, delivering ECAM's 3-year industrial engineering and supply-chain syllabus in English and awarding both an ECAM engineer's degree and an ITC engineering degree." },
    ]},
  ],
  AUPP: [
    { faculty: "Faculty of Business and Management", majors: [
      { n: "Business (B.S.)", d: "A 125-credit single-degree program covering marketing, finance, accounting and management, with a required 160-hour internship after 84 credits, built on AUPP's American liberal-arts general education base." },
      { n: "Business Administration", d: "A 125-credit dual degree earning both an AUPP degree and a Bachelor of Science in Business Administration from the University of Arizona's Eller College of Management (a top-10 US public business school); students complete ~2 years of pre-articulated coursework at AUPP before formal UA admission in junior year. It's currently AUPP's most popular major." },
      { n: "Tourism and Hospitality Management", d: "A 124-credit dual degree with Fort Hays State University (awarding a BBA), covering hotel/resort management, sustainable tourism, food and beverage management, and meetings/conventions plus a required internship. AUPP is not currently accepting new applicants — the program is in teach-out status for enrolled students." },
    ]},
    { faculty: "Faculty of Digital Technologies", majors: [
      { n: "Information Technology Management (B.S.)", d: "A 121-credit single-degree program (46 general education, 56 IT major, 19 electives) built around Data Structures, Operating Systems and Database Design, capped by a required internship and capstone project — training graduates for systems analyst, IT project manager or database administrator roles." },
      { n: "Computer Science", d: "A dual-degree track with Fort Hays State University following the same 121-credit ITM curriculum while earning FHSU's accredited BS in Computer Science, requiring at least 45 upper-division (300+ level) credits and a 2.0 GPA in all FHSU coursework, with core courses in Data Structures, Assembly Language, Operating Systems and Software Engineering." },
      { n: "Web and Mobile Application Development", d: "AUPP awards a BS in Interactive App Design and Development while dual-degree partner Fort Hays State University awards a BS in Web and Mobile Application Development, across a 122-credit curriculum spanning Front-End, Back-End and Mobile Web Development, Database Design and HCI, ending in an internship and final-year project." },
    ]},
    { faculty: "Faculty of Law", majors: [
      { n: "Law (B.A.)", d: "A 124-unit BA (61 in general education) grounded in Cambodian, U.S. and international law, with coursework in business law, contracts, criminal law and IP. Graduates have gone on to LLM/JD study at Boston University, Georgetown, the University of Arizona and the University of London." },
      { n: "Business Administration and Law", d: "A dual degree pairing AUPP's law curriculum with a BA in Law from the University of Arizona's James E. Rogers College of Law (a top-50 US law school and the first American university to offer a BA in Law), delivered via hybrid instruction from joint AUPP/UA faculty entirely in Phnom Penh." },
    ]},
    { faculty: "Faculty of Social Sciences", majors: [
      { n: "International Relations and Diplomacy (B.A.)", d: "A 124-credit single-degree BA using problem-centered, evidence-based teaching to examine Southeast Asian and global politics, diplomacy and security. Graduates pursue government, NGO, international-organization and multinational careers, or graduate study in international affairs." },
      { n: "Communication", d: "A 127-credit dual degree pairing an AUPP BS in Business with a BA in Communication from the University of Arizona, combining Strategic Public Relations and PR Campaigns coursework with a full business core in accounting, finance, marketing and management." },
      { n: "Global Affairs", d: "Launched Spring 2025, this 125-credit dual degree pairs AUPP's BA in International Relations and Diplomacy with a BS in Political Science from Fort Hays State University, completable entirely in Phnom Penh with an optional semester or year at FHSU's Kansas campus." },
      { n: "Graphic Design", d: "One of AUPP's dual-degree design programs delivered jointly with U.S. partner-university faculty (University of Arizona or Fort Hays State University) in the third and fourth years, so students complete the full U.S.-accredited degree without leaving Phnom Penh." },
      { n: "Interior Design", d: "A dual degree with AUPP's U.S. partner universities pairing design studio coursework with AUPP's built-environment curriculum, preparing graduates for interior design roles in Cambodia's expanding hospitality, real estate and architecture sectors." },
      { n: "Architecture (B.Arch)", d: "A five-year, minimum-181-unit professional degree with eight sequential design studios, two internships, and coursework in structures, building systems and materials, plus electives like Green Design and Building Information Modelling. AUPP is not currently accepting new applicants — the program is in teach-out status." },
    ]},
  ],
  NUM: [
    { faculty: "Faculty of Management", majors: [
      { n: "Management", d: "Housed at NUM's Wat Phnom main campus, this program traces to NUM's founding era as the Faculty of Business, built with support from the Asia Foundation, Georgetown University and the University of San Francisco, with job-placement support through NUM's USAID-backed Career Center." },
      { n: "Marketing", d: "Became a distinct major in the 1990s when NUM's predecessor, the Faculty of Business, expanded its curriculum alongside accounting and finance; the four-year program targets Cambodia's fast-growing consumer, retail and services sectors." },
      { n: "Management of Technology", d: "Trains students with a technical or scientific background to translate technology and R&D advances into market-ready innovations, with coursework on planning, executing and integrating technology-driven initiatives into organizational strategy." },
      { n: "Management of Information Technology", d: "Prepares students to manage organizational information systems — assessing information needs, designing systems, and building IT architecture aligned with business goals — including applied coursework such as IT for E-commerce." },
    ]},
    { faculty: "Faculty of Accounting and Finance", majors: [
      { n: "Accounting", d: "Based at the Wat Phnom campus with a specialization track in Accounting and Taxation, this became a core major in the 1990s when the Faculty of Business restructured its four-year undergraduate curriculum." },
      { n: "Finance and Banking", d: "Offers specialization tracks in Finance and Insurance and Finance and Security Market, added when the institution expanded into tourism, finance and MIS programs in 2004 under the NUM name." },
      { n: "Bank Management", d: "Aimed at developing senior-level bank leadership skills distinct from general finance and banking, reflecting NUM's ties to Cambodia's banking sector, with specialized bank-management coursework also offered at the graduate level." },
    ]},
    { faculty: "Faculty of Economics", majors: [
      { n: "Economics", d: "One of NUM's original four-year degree tracks, grounding students in economic theory paired with the analytical tools to track and interpret Cambodia's and the world's economies." },
      { n: "Eco-Business", d: "Blends core economics with applied business and entrepreneurship, added as NUM broadened its bachelor's offerings beyond its original management and accounting programs, for students applying economic analysis inside private-sector ventures." },
      { n: "Environmental Management", d: "Reflects NUM's growing focus on sustainability within Cambodia's development policy, also offered as a dedicated Master of Environmental Management through the School of Graduate Studies, preparing graduates for environmental planning roles." },
    ]},
    { faculty: "Faculty of Law", majors: [
      { n: "Law", d: "A four-year program with a dedicated Moot Court and the NUM Legal Clinic for hands-on casework, partnering with the Extraordinary Chambers in the Courts of Cambodia (ECCC), the ASEAN University Network and the University of Tokyo, using case-based teaching to prepare students for bar and licensing exams." },
      { n: "Business Law", d: "Draws on NUM's decade-long partnership with Japanese universities and the Japan Jurists League for Cambodia, bringing in Japanese professors and lawyers to teach comparative civil, transaction, patent and copyright law alongside Cambodian commercial law." },
    ]},
    { faculty: "Faculty of Public Administration and Policy", majors: [
      { n: "Public Administration", d: "A Bachelor of Public Administration delivered through NUM's Faculty of Law in coordination with the Faculty of Public Administration and Policy, training students in the management and operations of state institutions for careers in Cambodia's civil service." },
      { n: "Public Policy", d: "Offered through NUM's School of Public Policy at the Veal Sbov international campus, this Bachelor of Public Policy combines political science, economics, sociology and law with policy analysis, research and communication skills for careers as civil servants or policy officers." },
    ]},
    { faculty: "Faculty of International Business", majors: [
      { n: "International Business", d: "Taught in English through NUM International College (NUMIC) at the Wat Phnom campus, this four-year iBBA can lead into a 3+1 dual-degree track finishing the final year at a partner university in France or the United States, with emphasis on global market risk and cross-border trade." },
      { n: "Logistics & Supply Chain Management", d: "Part of NUM's international-business program cluster, building skills from operational to strategic decision-making in logistics leadership; also offered as a dedicated Master of Logistics & Supply Chain Management through NUM's School of Graduate Studies." },
    ]},
    { faculty: "Faculty of Information Technology", majors: [
      { n: "Information Technology", d: "Run across NUM's Wat Phnom and Veal Sbov campuses with Bachelor of IT, Business Information Technology, and Robotics & AI tracks sharing a first-year foundation in Python, CISCO networking and design thinking, plus hands-on programs like SPARK-FIT peer mentoring and Robocon robotics competitions." },
    ]},
    { faculty: "Faculty of Tourism and Foreign Languages", majors: [
      { n: "Tourism and Hospitality", d: "Added to the curriculum in 2004 when the Faculty of Business became NUM, this major is also offered in English through NUM International College, at both bachelor's and master's levels." },
      { n: "English Literature", d: "One of NUM's original four-year bachelor's programs, offered alongside Management, Marketing, and Accounting and Finance since the university's early curriculum expansion." },
    ]},
  ],
  RULE: [
    { faculty: "Faculty of Law", majors: [
      { n: "Law (Khmer Program)", d: "RULE's founding Khmer-language law track traces to the university's 1949 origins as Cambodia's first institution of legal education, making it the country's oldest pipeline into the judiciary, prosecution and civil service. Graduates commonly sit bar and magistracy entrance exams to become judges, prosecutors and government legal officers." },
      { n: "Law (English Program)", d: "Known as ELBBL (English Language-Based Bachelor of Law), this evening program was founded in 2002 with up to four elective specializations, a clinical legal education component placing final-year students with real communities since 2016, and the Center for the Study of Humanitarian Law (est. 2014). Alumni work as judges, lawyers, arbitrators and notaries, with many pursuing graduate study abroad." },
      { n: "Trilingual Law Program", d: "Run through RULE's French Cooperation Pole (active since 1994) with Lumière Lyon 2 University, this is the only law bachelor's in Cambodia taught fully in French alongside Khmer and English coursework. Students graduate with two diplomas — one from RULE, one from Lyon 2 — giving European-system recognition." },
      { n: "Law (Japanese-Khmer)", d: "RULE hosts Nagoya University's Research and Education Center for Japanese Law (est. 2008), training roughly 20 students a year toward JLPT Level 1-2 Japanese proficiency alongside legal studies, including short-term study visits to Nagoya University and observation of live Japanese court proceedings." },
      { n: "Law (Chinese-Khmer)", d: "This track pairs Cambodian legal training with Chinese-language study, supported by exchanges such as a two-week program at Southwest University of Political Science and Law in Chongqing, aimed at students pursuing legal careers connected to China." },
    ]},
    { faculty: "Faculty of Public Administration", majors: [
      { n: "Public Administration", d: "RULE positions itself as Cambodia's leading university in public administration; this program trains students for the civil service and government ministries with practical components like constitutional-law seminars and visits to the National Assembly and Senate." },
      { n: "International Relations (English Program)", d: "This English-taught track prepares students for diplomacy, international organizations and regional affairs, drawing on RULE's ASEAN University Network membership (since 2009) and academic exchange agreements across roughly 18 countries." },
    ]},
    { faculty: "Faculty of Economics and Management", majors: [
      { n: "Economics", d: "Built on a dual-degree curriculum developed with Lumière Lyon 2 University (partnership since 1994) covering macro/microeconomics and international economics, preparing graduates for banking, government planning and development-organization roles in Cambodia's transitional economy." },
      { n: "Business Administration", d: "Covers business strategy, marketing and human resources management, and can be paired with RULE's French Cooperation Pole dual-degree track with Lyon 2 for a second European diploma alongside mandatory internships." },
      { n: "Accounting", d: "Covers managerial and financial accounting, feeding graduates into Cambodia's corporate, audit and banking sectors centered in Phnom Penh, with mandatory internships built into the RULE-Lyon 2 dual-degree track." },
      { n: "Finance and Banking", d: "Focuses on financial management and banking operations for Cambodia's fast-growing banking and microfinance sector, and is one of the domains covered under RULE's dual-degree partnership with Lumière Lyon 2 University." },
    ]},
    { faculty: "Faculty of Information Economics", majors: [
      { n: "Information Economics", d: "Delivered by RULE's dedicated Faculty of Information Economics, this program pairs economic theory with information technology and data/statistical analysis, combining quantitative IT skills with economics in a way RULE's other economics tracks don't." },
    ]},
  ],
  CADT: [
    { faculty: "Institute of Digital Technology", majors: [
      { n: "Computer Science", d: "Delivered through CADT's Institute of Digital Technology, this 4-year bachelor's program was one of the first dedicated Computer Science degrees in Cambodia and splits into Software Engineering and Data Science specializations. All applicants sit CADT's own entrance exam, and the program feeds CADT's mission to build technical talent for Cambodia's digital government, economy and society." },
      { n: "Telecoms & Networking", d: "A 4-year bachelor's program — one of CADT's original three degrees alongside Computer Science and Digital Business — training students in telecom infrastructure and network systems, with a choice between a Telecoms & Networking specialization and a Cyber Security specialization covering network defense and digital-security practice." },
      { n: "Digital Business (E-Commerce)", d: "A 3.5-year bachelor's program specialized in e-Commerce, covering digital marketing, online business operations and e-commerce platform management for Cambodia's expanding digital marketplace — part of CADT's founding lineup of bachelor's degrees, the first of their kind in the country." },
    ]},
  ],
  UHS: [
    { faculty: "Faculty of Medicine", majors: [
      { n: "Medicine (Doctor of Medicine)", d: "UHS traces to Cambodia's 1946 Royal School for Medical Officers and its Faculty of Medicine runs an 8-year integrated track — a 6-year Bachelor of Medical Sciences followed by a 2-year clinical internship — leading to a Doctor of Medicine (MD). Graduates can continue into 3-4 year MD-D.E.S. specialty tracks in fields like internal medicine, cardiology, surgery, pediatrics and psychiatry." },
    ]},
    { faculty: "Faculty of Pharmacy", majors: [
      { n: "Pharmacy", d: "A 5-year Bachelor of Pharmacy (BPharm) program covering pharmaceutical sciences, drug formulation and clinical pharmacy practice, with further Doctor of Pharmacy (PharmD, 3+ years) and MSc/PhD research tracks available to graduates pursuing pharmaceutical research or advanced clinical pharmacy careers." },
    ]},
    { faculty: "Faculty of Dentistry", majors: [
      { n: "Dentistry", d: "A 5-year Bachelor of Dental Sciences (BDentSc) program that can extend into a 7-year Doctor of Dental Surgery (DDS) track, covering oral health, restorative dentistry and dental surgery, with a Master of Dental Sciences in Orthodontics (4 years) open to DDS holders." },
    ]},
    { faculty: "Technical School for Medical Care", majors: [
      { n: "Nursing", d: "A 4-year Bachelor of Science in Nursing (BSN), with 3-year diploma and bridging-program pathways for diploma holders, training students in clinical nursing care, patient management and health-system practice for hospital and community health roles." },
      { n: "Midwifery", d: "A 4-year Bachelor in Midwifery (BMidW), with 3-year diploma and bridging pathways, covering maternal and reproductive health, prenatal care and delivery practice for roles in hospitals and community maternal-health services." },
      { n: "Medical Laboratory Technology", d: "A diploma-to-bachelor track training students in diagnostic laboratory science — clinical chemistry, hematology, microbiology and pathology testing — for medical laboratory technician roles in hospitals and clinics." },
      { n: "Physiotherapy", d: "A diploma-to-bachelor track covering physical rehabilitation, musculoskeletal therapy and patient mobility care, preparing graduates for physiotherapist roles in hospitals and rehabilitation centers." },
      { n: "Medical Imaging (Radiation Technology)", d: "A diploma-to-bachelor track training students in diagnostic imaging — X-ray, ultrasound and radiologic technology — for medical imaging technician roles in hospitals and diagnostic centers." },
    ]},
    { faculty: "Department of Public Health", majors: [
      { n: "Public Health", d: "Launched in the 2013-2014 academic year and delivered with Cambodia's National Institute of Public Health, this Bachelor of Public Health (BPH) covers epidemiology, health systems and community health, with master's-level pathways for graduates pursuing public-health policy or research careers." },
    ]},
  ],
};
