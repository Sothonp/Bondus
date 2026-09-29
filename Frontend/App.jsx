import React, { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import {
  LayoutDashboard, BookOpen, Target, GraduationCap, Globe, Sparkles,
  TrendingUp, Flame, Zap, ChevronRight, Download, Bookmark,
  Eye, Clock, Moon, Sun, Menu, Send, Brain, CheckCircle2, Circle,
  Award, ArrowUpRight, ArrowDownRight, Lightbulb, Star, BarChart3,
  Atom, Landmark, LogIn, CalendarCheck, Timer, Gauge as GaugeIcon, BookMarked,
  ClipboardCheck, FileText, Activity as ActivityIcon, AlertTriangle, Repeat,
  ChevronLeft, XCircle, RotateCcw, Trophy, Crown, ArrowRight,
  Headphones, Mic, Volume2, PlayCircle,
  Plus, ArrowUp, Square, Copy, Check, X, ImagePlus, FileUp, LoaderCircle, ScanText, ChevronDown,
  Briefcase, DollarSign, Compass,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { UNIS, UNI_MAJORS, UNI_SCHOLARSHIPS, UNI_PROFILE_INFO } from "../src/data/universities.js";
import { UNI_QUIZ_BANK } from "../src/data/universityQuizBank.js";
import { ABROAD_COUNTRIES, ABROAD_UNIVERSITIES } from "../src/data/abroadUniversities.js";

/* ════════════════════════ Configuration / domain data ════════════════════════ */
/* Field-specific subject priorities. Change these lists to extend the curriculum. */
const FIELD_SUBJECTS = {
  science: ["Mathematics", "Physics", "Chemistry", "Biology", "Khmer Literature", "History", "English", "French"],
  social_science: ["Khmer Literature", "History", "Geography", "Morality", "Earth Science", "Mathematics", "English", "French"],
};

const FIELD_META = {
  science: { label: "Science", km: "វិទ្យាសាស្រ្ត", icon: Atom, color: "var(--primary)", blurb: "Math, physics, chemistry and biology-focused track.", blurbKm: "ផ្នែកផ្តោតលើគណិតវិទ្យា រូបវិទ្យា គីមីវិទ្យា និងជីវវិទ្យា។" },
  social_science: { label: "Social Science", km: "វិទ្យាសាស្ត្រសង្គម", icon: Landmark, color: "var(--gold)", blurb: "Literature, history, geography and civics-focused track.", blurbKm: "ផ្នែកផ្តោតលើអក្សរសាស្ត្រ ប្រវត្តិវិទ្យា ភូមិវិទ្យា និងសីលធម៌។" },
};

/* ── University pathway (separate from the Grade 11/12 BAC II model above) ──
   A university profile never touches FIELD_SUBJECTS/FIELD_META — it has its own goals/major/year
   onboarding and its own Hub, so "University" never gets routed into BAC II content. */
const UNI_GOALS = [
  { id: "prepare_university", label: "Prepare for University", labelKm: "រៀបចំសម្រាប់សាកលវិទ្យាល័យ", icon: GraduationCap },
  { id: "learn_subjects", label: "Learn University Subjects", labelKm: "រៀនមុខវិជ្ជាសាកលវិទ្យាល័យ", icon: BookOpen },
  { id: "career_prep", label: "Career & Job Preparation", labelKm: "រៀបចំអាជីព និងការងារ", icon: Briefcase },
  { id: "study_abroad", label: "Study Abroad", labelKm: "សិក្សានៅបរទេស", icon: Globe },
  { id: "scholarship_prep", label: "Scholarship Preparation", labelKm: "រៀបចំអាហារូបករណ៍", icon: DollarSign },
  { id: "language_prep", label: "IELTS / TOEFL / Language Prep", labelKm: "រៀបចំ IELTS/TOEFL/ភាសា", icon: Mic },
  { id: "explore_majors", label: "Explore Majors & Careers", labelKm: "ស្វែងរកជំនាញ និងអាជីព", icon: Compass },
  { id: "find_university", label: "Find a University", labelKm: "ស្វែងរកសាកលវិទ្យាល័យ", icon: Landmark },
];

const UNI_FIELDS = [
  { id: "computer_science", label: "Computer Science", labelKm: "វិទ្យាសាស្ត្រកុំព្យូទ័រ" },
  { id: "software_engineering", label: "Software Engineering", labelKm: "វិស្វកម្មសូហ្វវែរ" },
  { id: "information_technology", label: "Information Technology", labelKm: "បច្ចេកវិទ្យាព័ត៌មាន" },
  { id: "data_science", label: "Data Science", labelKm: "វិទ្យាសាស្ត្រទិន្នន័យ" },
  { id: "cybersecurity", label: "Cybersecurity", labelKm: "សន្តិសុខសាយប័រ" },
  { id: "business", label: "Business", labelKm: "ពាណិជ្ជកម្ម" },
  { id: "finance", label: "Finance", labelKm: "ហិរញ្ញវត្ថុ" },
  { id: "accounting", label: "Accounting", labelKm: "គណនេយ្យ" },
  { id: "engineering", label: "Engineering", labelKm: "វិស្វកម្ម" },
  { id: "medicine", label: "Medicine", labelKm: "វេជ្ជសាស្ត្រ" },
  { id: "law", label: "Law", labelKm: "នីតិសាស្ត្រ" },
  { id: "design", label: "Design", labelKm: "រចនាកម្ម" },
  { id: "education", label: "Education", labelKm: "អប់រំ" },
  { id: "social_sciences", label: "Social Sciences", labelKm: "សិក្សាសង្គម" },
  { id: "other", label: "Other", labelKm: "ផ្សេងទៀត" },
];

const UNI_YEARS = [
  { id: "preparing", label: "Preparing for university", labelKm: "កំពុងរៀបចំចូលសាកលវិទ្យាល័យ" },
  { id: "year1", label: "1st Year", labelKm: "ឆ្នាំទី១" },
  { id: "year2", label: "2nd Year", labelKm: "ឆ្នាំទី២" },
  { id: "year3", label: "3rd Year", labelKm: "ឆ្នាំទី៣" },
  { id: "year4plus", label: "4th Year+", labelKm: "ឆ្នាំទី៤ ឡើងទៅ" },
  { id: "graduating", label: "Graduating", labelKm: "ជិតបញ្ចប់ការសិក្សា" },
  { id: "not_enrolled", label: "Not enrolled yet", labelKm: "មិនទាន់ចូលរៀន" },
];

/* Sample "Continue Learning" course outlines — Phase 1 only ships real content for Computer
   Science to prove the pattern; other majors show a "coming soon" state instead of fake content. */
const UNI_COURSES = {
  computer_science: [
    { id: "js_fundamentals", title: "JavaScript Fundamentals", titleKm: "មូលដ្ឋានគ្រឹះ JavaScript",
      lessons: ["Variables & data types", "Functions & scope", "Arrays & objects", "DOM basics"],
      lessonsKm: ["អថេរ និងប្រភេទទិន្នន័យ", "អនុគមន៍ និង scope", "អារេ និងវត្ថុ", "មូលដ្ឋាន DOM"] },
    { id: "data_structures", title: "Data Structures", titleKm: "រចនាសម្ព័ន្ធទិន្នន័យ",
      lessons: ["Arrays & linked lists", "Stacks & queues", "Trees & graphs", "Big-O basics"],
      lessonsKm: ["អារេ និង linked list", "Stack និង queue", "ដើមឈើ និងក្រាហ្វ", "មូលដ្ឋាន Big-O"] },
    { id: "database_sql", title: "Database & SQL", titleKm: "មូលដ្ឋានទិន្នន័យ និង SQL",
      lessons: ["Tables & relationships", "SELECT / WHERE / JOIN", "Indexes", "Normalization basics"],
      lessonsKm: ["តារាង និងទំនាក់ទំនង", "SELECT / WHERE / JOIN", "លិបិក្រម", "មូលដ្ឋាន Normalization"] },
    { id: "git_github", title: "Git & GitHub", titleKm: "Git និង GitHub",
      lessons: ["Commits & branches", "Merging & conflicts", "Pull requests", "Working with a team"],
      lessonsKm: ["Commit និង branch", "Merge និងជម្លោះ", "Pull request", "ធ្វើការជាក្រុម"] },
  ],
};

/* University-track "subject" taxonomy, derived the same way SUBJECT_TOPICS is derived from
   RAW_EXERCISES below — one entry per major with quiz content, subject keys are
   "{major}::{courseTitle}" (see src/data/universityQuizBank.js for why). A major with no
   UNI_QUIZ_BANK entries simply has no keys here, which deriveUniInsights() treats as
   "coming soon" rather than fabricating mastery data. */
const UNI_MASTERY_SUBJECTS = Object.fromEntries(
  Object.entries(UNI_COURSES).map(([major, courses]) => [major, courses.map((c) => `${major}::${c.title}`)])
);
const UNI_MASTERY_TOPICS = Object.fromEntries(
  Object.entries(UNI_QUIZ_BANK).map(([subject, list]) => [subject, [...new Set(list.map((e) => e.topic))]])
);
// English-only, by design — see the comment atop UNI_QUIZ_BANK (src/data/universityQuizBank.js).
// Unlike getExercises() below, this ignores `lang` entirely rather than falling back per-field.
function getUniExercises(subjectKey) {
  const list = UNI_QUIZ_BANK[subjectKey] || [];
  return list.map((r, i) => ({
    id: `uni:${subjectKey}:${i + 1}`, subject: subjectKey, topic: r.topic, difficulty: r.difficulty,
    prompt: r.prompt, options: r.options, answer: r.answer, explanation: r.explanation,
  }));
}

const EXAM_YEARS = [2026, 2027, 2028];
const STUDY_MINUTES = [30, 45, 60, 90, 120];
const MISTAKE_TYPES = [
  "Concept misunderstanding", "Wrong formula", "Calculation error",
  "Careless mistake", "Time management", "Misread question",
];
/* Display-only Khmer labels — the English string is still what's stored on the attempt record
   (topicMastery/practice mistakeType field), so switching languages never changes past data. */
const MISTAKE_TYPE_LABEL_KM = {
  "Concept misunderstanding": "យល់ច្រឡំគំនិត", "Wrong formula": "ប្រើរូបមន្តខុស", "Calculation error": "គណនាខុស",
  "Careless mistake": "ភ្លាំងភ្លាត់", "Time management": "គ្រប់គ្រងពេលវេលា", "Misread question": "អានសំណួរខុស",
};
const mistakeTypeLabel = (mt, lang) => (lang === "km" ? (MISTAKE_TYPE_LABEL_KM[mt] ?? mt) : mt);

const subjectId = (s) => s.toLowerCase().replace(/\s+/g, "_");

/* Auto-detects Khmer script in a string so shared low-level components (CardHead, FormField,
   SelectField, OnboardingOptionCard, Pill…) can switch to the Kantumruy Pro font (.eai-km)
   without every call site needing to thread a `lang` prop through just for this. */
const KHMER_RE = /[ក-៿]/;
const kmClass = (s) => (typeof s === "string" && KHMER_RE.test(s) ? "eai-km" : "");

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

/* ════════════════════════ Mastery engine ════════════════════════
   Turns raw answer history into a 0-100 topic score:
   score = 70% recent accuracy + 20% difficulty performance + 10% consistency (answer streak).
   Recent attempts (last 5) matter most, so mastery moves as the student actually improves. */
const DIFF_WEIGHT = { Easy: 50, Medium: 75, Hard: 100 };

function computeTopicScore(history) {
  if (!history.length) return null;
  const recent = history.slice(-5);
  const recentAccuracy = (recent.filter((h) => h.correct).length / recent.length) * 100;
  const difficultyScore = recent.reduce((sum, h) => sum + (h.correct ? DIFF_WEIGHT[h.difficulty] : DIFF_WEIGHT[h.difficulty] * 0.2), 0) / recent.length;
  let streak = 0;
  for (let i = recent.length - 1; i >= 0; i--) {
    const dir = recent[i].correct ? 1 : -1;
    if (streak === 0 || Math.sign(streak) === dir) streak += dir; else break;
  }
  const consistencyScore = clamp(50 + streak * 17, 0, 100);
  return Math.round(recentAccuracy * 0.70 + difficultyScore * 0.20 + consistencyScore * 0.10);
}

function masteryLevel(score) {
  if (score == null) return "Not assessed";
  if (score < 40) return "Beginner";
  if (score < 60) return "Developing";
  if (score < 75) return "Intermediate";
  if (score < 90) return "Proficient";
  return "Exam Ready";
}
const LEVEL_COLOR = {
  "Not assessed": "var(--muted)", Beginner: "var(--ember)", Developing: "var(--gold)",
  Intermediate: "var(--primary)", Proficient: "var(--jade)", "Exam Ready": "var(--jade)",
};
const levelToDifficulty = (level) => (level === "Intermediate" ? "Medium" : level === "Proficient" || level === "Exam Ready" ? "Hard" : "Easy");
// Display-only Khmer labels for the canonical (English) mastery-level keys used above for
// color/difficulty lookups — those keys stay English internally so LEVEL_COLOR/levelToDifficulty
// never need to know about lang; only the rendered text changes.
const LEVEL_LABEL_KM = {
  "Not assessed": "មិនទាន់វាយតម្លៃ", Beginner: "ចាប់ផ្តើម", Developing: "កំពុងរីកចម្រើន",
  Intermediate: "មធ្យម", Proficient: "ស្ទាត់ជំនាញ", "Exam Ready": "ត្រៀមរួចប្រឡង",
};
const levelLabel = (level, lang) => (lang === "km" ? (LEVEL_LABEL_KM[level] ?? level) : level);

/* Record one answered question into the topic-mastery store. Immutable update — every new
   answer (diagnostic or practice) calls this and the resulting score feeds straight back into
   the UI, since deriveInsights() below recomputes from this store on every render. */
function recordAttempt(topicMastery, subject, topic, attempt) {
  const subj = topicMastery[subject] || {};
  const prev = subj[topic] || { history: [] };
  const history = [...prev.history, attempt].slice(-20);
  return { ...topicMastery, [subject]: { ...subj, [topic]: { history, score: computeTopicScore(history), lastPracticedAt: attempt.ts } } };
}

const estimateGradeRange = (avg) => {
  if (avg == null) return "—";
  if (avg >= 85) return "A";
  if (avg >= 75) return "A–B";
  if (avg >= 60) return "B–C";
  if (avg >= 40) return "C–D";
  return "D–E";
};

const DAY_MS = 86400000;
const dateKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const dateKeyToTime = (key) => { const [y, m, d] = key.split("-").map(Number); return new Date(y, m - 1, d).getTime(); };

/* Flattens every recorded attempt (from either track's topic-mastery store) into one list of
   { ts, timeSec, ... } — the raw activity log the streak and weekly-hours stats below read from. */
function collectAttempts(topicMastery = {}, uniTopicMastery = {}) {
  const flatten = (store) => Object.values(store).flatMap((subj) => Object.values(subj).flatMap((topic) => topic.history || []));
  return [...flatten(topicMastery), ...flatten(uniTopicMastery)];
}

/* Real day-streak: a day only counts if the student actually answered a practice/diagnostic
   question that day (recordAttempt's ts). No baked-in starting streak — a fresh account is 0
   until it's earned, and the streak breaks the first calendar day with no activity. */
function computeStreakStats(topicMastery, uniTopicMastery) {
  const days = [...new Set(collectAttempts(topicMastery, uniTopicMastery).map((a) => dateKey(new Date(a.ts))))].sort();
  if (!days.length) return { streak: 0, longestStreak: 0 };
  let longest = 1, run = 1;
  for (let i = 1; i < days.length; i++) {
    const gap = Math.round((dateKeyToTime(days[i]) - dateKeyToTime(days[i - 1])) / DAY_MS);
    run = gap === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
  }
  const today = dateKey(), yesterday = dateKey(new Date(Date.now() - DAY_MS));
  const last = days[days.length - 1];
  let streak = 0;
  if (last === today || last === yesterday) {
    streak = 1;
    for (let i = days.length - 1; i > 0; i--) {
      const gap = Math.round((dateKeyToTime(days[i]) - dateKeyToTime(days[i - 1])) / DAY_MS);
      if (gap === 1) streak += 1; else break;
    }
  }
  return { streak, longestStreak: Math.max(longest, streak) };
}

/* Real trailing-7-day study time in hours, built from the actual per-question timing
   recordAttempt stores (timeSec) — replaces the old fixed WEEK_SEED placeholder. */
function buildWeeklyStudyHours(topicMastery, uniTopicMastery) {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    days.push({ key: dateKey(d), d: d.toLocaleDateString("en-US", { weekday: "short" }), seconds: 0 });
  }
  const byKey = Object.fromEntries(days.map((x) => [x.key, x]));
  collectAttempts(topicMastery, uniTopicMastery).forEach((a) => {
    const bucket = byKey[dateKey(new Date(a.ts))];
    if (bucket && a.timeSec) bucket.seconds += a.timeSec;
  });
  return days.map((x) => ({ d: x.d, h: Math.round((x.seconds / 3600) * 10) / 10 }));
}

/* Build the static part of a student profile — registration answers + gamification state.
   Subject mastery, weak/strong tags, predictions, recommendations and the day streak are never
   baked in here; they're derived live from real attempt history by deriveInsights() and
   computeStreakStats() below — a brand-new account starts at a 0 streak, not a freebie. */
function buildProfile(reg) {
  return { ...reg, level: 1, xp: 40, xpToNext: 500 };
}

/* Turns topic-mastery history into everything the UI shows: subject scores, weak/strong tags,
   a grade-range estimate, exam readiness, a recommended lesson, and AI recommendations. This is
   the "reassess" half of the assess → identify weakness → recommend → practice → reassess loop —
   call it fresh (useMemo) whenever topicMastery changes and the whole app updates with it. */
function deriveInsights(p, topicMastery, streak = 0) {
  // University profiles never had a BAC II track (p.field), so they skip the whole mastery
  // engine below and get empty-but-safe defaults instead — every consumer (Progress, Coach's
  // study/major fallbacks) can rely on subjects/weak/strong always being arrays.
  if (p.educationLevel === "university") {
    return {
      subjects: [], weak: [], strong: [], avg: null,
      prediction: { A: 0, B: 0, C: 0, D: 0, E: 0 }, gradeRange: "—",
      readiness: { overall: 0, mastery: 0, coverage: 0, consistency: 0, speed: 0 },
      priorityTopic: null, strongestTopic: null, plan: [], recommendedLesson: null, recs: [],
    };
  }
  const subjectNames = FIELD_SUBJECTS[p.field];
  const prior = (s) => (p.subjectsToImprove?.includes(subjectId(s)) ? 45 : null);

  const subjects = subjectNames.map((s) => {
    const topicNames = SUBJECT_TOPICS[s] || [];
    const topics = topicNames.map((t) => {
      const rec = topicMastery[s]?.[t];
      return { t, score: rec?.score ?? null, attempts: rec?.history?.length ?? 0 };
    });
    const assessedTopics = topics.filter((x) => x.score != null);
    const m = assessedTopics.length
      ? Math.round(assessedTopics.reduce((a, b) => a + b.score, 0) / assessedTopics.length)
      : prior(s);

    // Trend: accuracy in the newer half of this subject's attempts vs. the older half.
    const allAttempts = topicNames.flatMap((t) => topicMastery[s]?.[t]?.history || []).sort((a, b) => a.ts - b.ts);
    let trend = 0;
    if (allAttempts.length >= 2) {
      const mid = Math.floor(allAttempts.length / 2);
      const acc = (arr) => (arr.filter((h) => h.correct).length / arr.length) * 100;
      trend = clamp(Math.round((acc(allAttempts.slice(mid)) - acc(allAttempts.slice(0, mid))) / 10), -3, 3);
    }

    return { s, m, level: masteryLevel(m), tag: m == null ? "" : m < 60 ? "weak" : m >= 85 ? "strong" : "", t: trend, topics, assessed: assessedTopics.length > 0 };
  });

  const known = subjects.filter((x) => x.m != null);
  const weak = subjects.filter((x) => x.tag === "weak").sort((a, b) => a.m - b.m);
  const strong = subjects.filter((x) => x.tag === "strong").sort((a, b) => b.m - a.m);
  const avg = known.length ? Math.round(known.reduce((a, b) => a + b.m, 0) / known.length) : null;

  // Priority / strongest topic across every subject — only among topics actually attempted.
  const allTopics = subjects.flatMap((sub) => sub.topics.filter((x) => x.score != null).map((x) => ({ subject: sub.s, ...x })));
  const priorityTopic = allTopics.length ? [...allTopics].sort((a, b) => a.score - b.score)[0] : null;
  const strongestTopic = allTopics.length ? [...allTopics].sort((a, b) => b.score - a.score)[0] : null;

  // Grade prediction: map average mastery → a distribution over A–E (feeds the existing chart).
  const A = clamp(Math.round(((avg ?? 60) - 45) * 1.9), 4, 90);
  const B = clamp(Math.round((100 - A) * 0.55), 4, 45);
  const C = clamp(Math.round((100 - A - B) * 0.6), 1, 30);
  const D = clamp(Math.round((100 - A - B - C) * 0.6), 0, 20);
  const E = clamp(100 - A - B - C - D, 0, 100);
  const gradeRange = estimateGradeRange(avg);

  // Exam readiness composite: mastery + syllabus coverage + consistency + a completion-speed proxy.
  const totalTopics = subjectNames.reduce((n, s) => n + (SUBJECT_TOPICS[s]?.length || 0), 0);
  const coverage = totalTopics ? Math.round((allTopics.length / totalTopics) * 100) : 0;
  const allAttemptsEver = subjectNames.flatMap((s) => (SUBJECT_TOPICS[s] || []).flatMap((t) => topicMastery[s]?.[t]?.history || []));
  const avgTime = allAttemptsEver.length ? allAttemptsEver.reduce((a, h) => a + (h.timeSec || 45), 0) / allAttemptsEver.length : null;
  const speed = avgTime == null ? 60 : clamp(Math.round(100 - ((avgTime - 30) / 60) * 100), 10, 100);
  const consistency = clamp(30 + streak * 10, 0, 100);
  const readiness = { overall: Math.round((avg ?? 0) * 0.5 + coverage * 0.2 + consistency * 0.15 + speed * 0.15), mastery: avg ?? 0, coverage, consistency, speed };

  // Most common mistake type, for a targeted (not generic) recommendation.
  const mistakeCounts = {};
  allAttemptsEver.forEach((h) => { if (!h.correct && h.mistakeType) mistakeCounts[h.mistakeType] = (mistakeCounts[h.mistakeType] || 0) + 1; });
  const topMistake = Object.entries(mistakeCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

  // Recommended lesson: the lowest-scoring attempted topic, or the weakest subject as a fallback.
  const recommendedLesson = priorityTopic
    ? { subject: priorityTopic.subject, topic: priorityTopic.t }
    : weak[0]
      ? { subject: weak[0].s, topic: (SUBJECT_TOPICS[weak[0].s] || [])[0] || weak[0].s }
      : { subject: subjects[0].s, topic: (SUBJECT_TOPICS[subjects[0].s] || [])[0] || subjects[0].s };

  // Daily plan: the two lowest-scoring topics + a strong-subject revision + a daily habit.
  const plan = [];
  [...allTopics].sort((a, b) => a.score - b.score).slice(0, 2).forEach((pt, i) =>
    plan.push({ id: i + 1, s: pt.subject, task: `${pt.t} — review & practice`, min: 35, why: "Priority topic", done: false }));
  if (strong[0]) plan.push({ id: 90, s: strong[0].s, task: `${strong[0].s} flash quiz`, min: 15, why: "Spaced revision", done: true });
  plan.push({ id: 91, s: "English", task: "Reading passage + 15 vocab", min: 20, why: "Daily habit", done: false });

  const recs = [];
  if (priorityTopic) recs.push({ icon: Lightbulb, c: "var(--ember)", t: `${priorityTopic.t} is dragging you down`,
    d: `You're at ${priorityTopic.score}% in ${priorityTopic.subject} · ${priorityTopic.t}. Clearing a few lessons here moves your estimate the most.` });
  if (topMistake) recs.push({ icon: AlertTriangle, c: "var(--gold)", t: `Your most common mistake: ${topMistake}`,
    d: topMistake === "Calculation error" || topMistake === "Careless mistake"
      ? "You understand the concepts — try shorter, timed numerical drills instead of another full lesson."
      : "Revisit the underlying concept before doing more practice questions." });
  else recs.push({ icon: Brain, c: "var(--primary)", t: "You focus best in the morning",
    d: "Your accuracy is higher before 10am — schedule hard topics early." });
  if (strongestTopic) recs.push({ icon: TrendingUp, c: "var(--jade)", t: `${strongestTopic.t} is exam-ready`,
    d: `You've held ${strongestTopic.score}% in ${strongestTopic.subject} — switch to light revision and reinvest the time.` });

  return { subjects, weak, strong, avg, prediction: { A, B, C, D, E }, gradeRange, readiness, priorityTopic, strongestTopic, plan, recommendedLesson, recs };
}

/* University-track twin of deriveInsights() above — deliberately simpler. It does not invent
   BAC-II-only concepts (grade prediction, exam readiness composite, a daily study plan) that
   have no university-track meaning yet. When the student's major has no UNI_QUIZ_BANK content
   (every major except computer_science today), it returns contentAvailable:false so the UI can
   show an honest "coming soon" state instead of fabricated numbers. */
function deriveUniInsights(p, uniTopicMastery) {
  const major = p.universityProfile?.major;
  const subjectKeys = UNI_MASTERY_SUBJECTS[major] || [];
  if (!subjectKeys.length) {
    return { subjects: [], weak: [], strong: [], avg: null, recommendedLesson: null, contentAvailable: false };
  }

  const subjects = subjectKeys.map((key) => {
    const topicNames = UNI_MASTERY_TOPICS[key] || [];
    const topics = topicNames.map((t) => {
      const rec = uniTopicMastery[key]?.[t];
      return { t, score: rec?.score ?? null, attempts: rec?.history?.length ?? 0 };
    });
    const assessedTopics = topics.filter((x) => x.score != null);
    const m = assessedTopics.length ? Math.round(assessedTopics.reduce((a, b) => a + b.score, 0) / assessedTopics.length) : null;
    return { s: key, m, level: masteryLevel(m), tag: m == null ? "" : m < 60 ? "weak" : m >= 85 ? "strong" : "", topics, assessed: assessedTopics.length > 0 };
  });

  const known = subjects.filter((x) => x.m != null);
  const weak = subjects.filter((x) => x.tag === "weak").sort((a, b) => a.m - b.m);
  const strong = subjects.filter((x) => x.tag === "strong").sort((a, b) => b.m - a.m);
  const avg = known.length ? Math.round(known.reduce((a, b) => a + b.m, 0) / known.length) : null;

  const allTopics = subjects.flatMap((sub) => sub.topics.filter((x) => x.score != null).map((x) => ({ subject: sub.s, ...x })));
  const priorityTopic = allTopics.length ? [...allTopics].sort((a, b) => a.score - b.score)[0] : null;

  const recommendedLesson = priorityTopic
    ? { subject: priorityTopic.subject, topic: priorityTopic.t }
    : weak[0]
      ? { subject: weak[0].s, topic: (UNI_MASTERY_TOPICS[weak[0].s] || [])[0] || weak[0].s }
      : { subject: subjects[0].s, topic: (UNI_MASTERY_TOPICS[subjects[0].s] || [])[0] || subjects[0].s };

  return { subjects, weak, strong, avg, recommendedLesson, contentAvailable: true };
}

/* Continuously-analyzed AI signals shown on the Progress tab. */
function analyticsSignals(p, live = {}) {
  const lessons = live.completedLessons ?? 0;
  return [
    { icon: LogIn, label: "Login frequency", value: "Today", note: "Active now" },
    { icon: CalendarCheck, label: "Study consistency", value: `${p.streak}-day`, note: "Streak going" },
    { icon: Timer, label: "Study hours", value: live.hours ?? "0.5h", note: "This week" },
    { icon: GaugeIcon, label: "Learning speed", value: lessons ? "Good" : "—", note: lessons ? "Steady pace" : "Calibrating" },
    { icon: BookMarked, label: "Completed lessons", value: `${lessons}`, note: lessons ? "Nice work" : "Let's begin" },
    { icon: ClipboardCheck, label: "Quiz scores", value: live.quizScore != null ? `${live.quizScore}%` : "—", note: live.quizScore != null ? "Avg accuracy" : "No quizzes yet" },
    { icon: FileText, label: "Mock exams", value: "0", note: "Try one soon" },
    { icon: ActivityIcon, label: "Subject performance", value: p.avg != null ? `${p.avg}%` : "—", note: "Avg mastery" },
    { icon: AlertTriangle, label: "Mistake patterns", value: live.mistakes != null ? `${live.mistakes}` : "—", note: live.mistakes ? "Review these" : "Tracking" },
    { icon: Repeat, label: "Weak concepts", value: `${p.weak.length}`, note: "Flagged to revise" },
    { icon: Star, label: "Strong concepts", value: `${p.strong.length}`, note: "Keep them sharp" },
    { icon: Brain, label: "Learning habits", value: lessons ? "Forming" : "New", note: "AI is watching" },
  ];
}

const YEARS = [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011, 2010];
/* pct starts at 0 for all four — none of this is real progress until a student actually takes a
   diagnostic, so showing anything higher would be the same fabricated-baseline problem as the
   old hardcoded "Goal Band 7.0" (a brand-new account has done nothing yet). IELTS has no static
   "goal" here either — it's asked fresh at the start of each diagnostic (see IeltsDiagnostic's
   "goal" stage) and stored per-result. The other three are still inert "Coming soon" placeholders. */
const LANGS = [
  { n: "IELTS Academic", now: "—", pct: 0, c: "var(--ember)" },
  { n: "TOEFL iBT", goal: "Score 90", now: "—", pct: 0, c: "var(--primary)" },
  { n: "HSK", goal: "Level 4", now: "—", pct: 0, c: "var(--gold)" },
  { n: "DELF", goal: "B2", now: "—", pct: 0, c: "var(--jade)" },
];

/* ════════════════════════ IELTS diagnostic ════════════════════════
   A short, four-skill placement test (Listening, Reading, Writing, Speaking) — not a full mock
   exam. Listening/Reading are auto-graded client-side from a fixed answer key; Writing/Speaking
   are graded by the Gemini-backed /api/ielts-grade function (same resilience pattern as Major
   Guidance: falls back to a local estimate if the API call fails, so the flow never dead-ends). */
const IELTS_CONTENT = {
  listening: {
    script: `Welcome to the university library orientation. The library is open from eight in the morning until ten at night on weekdays, and from nine until six on weekends. First-year students can borrow up to five books for two weeks, while final-year students can borrow up to ten books for a full month. If you need a book that's already checked out, you can place a hold online and we'll email you when it's back. The quiet study rooms on the third floor must be booked in advance through the library website, and each booking is limited to two hours per day. Remember, food isn't allowed inside the building, but water in a closed bottle is fine.`,
    questions: [
      { q: "On weekdays, until what time is the library open?", options: ["6 PM", "8 PM", "10 PM", "Midnight"], answer: "10 PM" },
      { q: "How many books can a first-year student borrow at once?", options: ["Two", "Five", "Eight", "Ten"], answer: "Five" },
      { q: "Where are the quiet study rooms located?", options: ["First floor", "Second floor", "Third floor", "Basement"], answer: "Third floor" },
      { q: "What is NOT allowed inside the library?", options: ["Closed water bottles", "Laptops", "Food", "Quiet conversation"], answer: "Food" },
    ],
  },
  reading: {
    passage: `Urban beekeeping has grown rapidly in cities around the world over the past decade. Once considered an unusual hobby, keeping honeybee hives on rooftops and in community gardens is now promoted by some city governments as a way to support local ecosystems. Bees pollinate a wide range of plants, and their presence can noticeably improve yields in nearby gardens and parks. However, researchers have also raised concerns: in cities with a very high density of hives, honeybees may compete with wild, native bee species for limited flowers, potentially harming biodiversity rather than helping it. Experts now recommend that city planners think carefully about hive density and prioritise planting more flowering plants alongside any expansion of urban beekeeping, so that food sources grow along with the bee population.`,
    questions: [
      { q: "What has happened to urban beekeeping in the last ten years?", options: ["It has declined", "It has grown rapidly", "It has stayed the same", "It has been banned"], answer: "It has grown rapidly" },
      { q: "According to the passage, bees help nearby gardens by...", options: ["Removing pests", "Pollinating plants", "Fertilising soil", "Reducing noise"], answer: "Pollinating plants" },
      { q: "What concern do researchers raise about high hive density?", options: ["Bees produce less honey", "Honeybees may compete with native bees", "Hives are expensive to maintain", "Bees become aggressive"], answer: "Honeybees may compete with native bees" },
      { q: "What do experts recommend city planners do?", options: ["Ban beekeeping entirely", "Reduce the number of parks", "Plant more flowers alongside hive expansion", "Move hives outside cities"], answer: "Plant more flowers alongside hive expansion" },
    ],
  },
  writing: {
    prompt: "Some people think that university students should be required to attend classes in person, while others believe online study should be an equally acceptable option. Discuss both views and give your own opinion.",
    minWords: 150,
  },
  speaking: {
    cueCard: "Describe a skill you would like to learn in the future.",
    bulletPoints: ["what the skill is", "why you want to learn it", "how you would learn it", "and explain how it might change your life"],
    prepSeconds: 30,
  },
};

/* Simple, transparent band conversion for the auto-graded skills — not the official IELTS scale,
   just a reasonable placement estimate from a 4-question sample. */
function bandFromScore(correct, total) {
  const pct = correct / total;
  if (pct >= 1) return 8.5;
  if (pct >= 0.75) return 7.5;
  if (pct >= 0.5) return 6.5;
  if (pct >= 0.25) return 5.5;
  return 4.5;
}

const roundToHalfBand = (n) => Math.round(n * 2) / 2;

/* Writing/Speaking calls the real /api/ielts-grade serverless function (Gemini). If that call
   fails — no API key configured yet, network hiccup, rate limit — it falls back to a local
   word-count-based estimate so the flow still produces a result instead of erroring out. */
async function gradeIeltsResponse(skill, prompt, response) {
  try {
    const res = await fetch("/api/ielts-grade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ skill, prompt, response }),
    });
    const data = await res.json();
    if (!res.ok || typeof data.band !== "number") throw new Error(data.error || "Request failed");
    return { band: data.band, feedback: data.feedback || "" };
  } catch {
    const words = response.trim().split(/\s+/).filter(Boolean).length;
    const band = words >= 180 ? 6.5 : words >= 100 ? 5.5 : words >= 40 ? 4.5 : 3.5;
    return { band, feedback: "AI grading is temporarily unavailable, so this is a rough estimate based on response length. Try again later for detailed feedback." };
  }
}

/* Mock classmates for the dashboard leaderboard. The current user is merged in and ranked live by XP. */
const LEADERBOARD_SEED = [
  { name: "Sokha Ly", xp: 2140 },
  { name: "Dara Pich", xp: 1890 },
  { name: "Chanthy Roeun", xp: 1675 },
  { name: "Vichet Sok", xp: 1420 },
  { name: "Sreymom Heng", xp: 1310 },
  { name: "Bopha Chea", xp: 980 },
  { name: "Pisey Chan", xp: 760 },
  { name: "Rithy Ouk", xp: 540 },
];

/* ════════════════════════ Theme + base styles ════════════════════════ */
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Kantumruy+Pro:wght@400;500;600;700&display=swap');

.eai-root{ font-family:'Plus Jakarta Sans', system-ui, sans-serif; color:var(--ink);
  background:var(--bg); min-height:100vh; -webkit-font-smoothing:antialiased; }
.eai-display{ font-family:'Sora', system-ui, sans-serif; letter-spacing:-0.02em; }
.eai-km{ font-family:'Kantumruy Pro', system-ui, sans-serif; }

.theme-light{
  --bg:#FFFFFF; --bg-soft:#F2F1F7; --card:#FFFFFF; --ink:#1A1B3A; --muted:#71728C;
  --line:#E7E6EF; --glass-bg:rgba(255,255,255,.55); --glass-line:rgba(255,255,255,.8); --glass-shadow:0 1px 3px rgba(26,27,58,.08), inset 0 1px 0 rgba(255,255,255,.6);
  --primary:#403FB0; --primary-soft:#ECECFB; --gold:#E29A30; --gold-soft:#FBEFD7;
  --ember:#D9543F; --ember-soft:#FAE2DB; --jade:#159A82; --jade-soft:#DBF1EC;
  --shadow:0 1px 2px rgba(26,27,58,.04), 0 10px 30px rgba(26,27,58,.07);
}
.theme-dark{
  --bg:#0C0D1E; --bg-soft:#14152C; --card:#191B33; --ink:#F2EFE6; --muted:#9A9BB6;
  --line:#2A2C49; --glass-bg:rgba(255,255,255,.08); --glass-line:rgba(255,255,255,.16); --glass-shadow:0 1px 3px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.08);
  --primary:#8a89f5; --primary-soft:#23244A; --gold:#EEAB49; --gold-soft:#2B2417;
  --ember:#E96E58; --ember-soft:#2E1B18; --jade:#2BB89C; --jade-soft:#13271F;
  --shadow:0 1px 2px rgba(0,0,0,.35), 0 14px 34px rgba(0,0,0,.4);
}

.eai-card{ background:var(--card); border:1px solid var(--line); border-radius:22px; box-shadow:var(--shadow); }
/* --bg-soft stays a solid, de-yellowed neutral — used directly (not through a class) in ~30
   places (SVG strokes, icon-badge fills, hover backgrounds) that need real visible contrast and
   can't render a backdrop-filter. .eai-soft/.eai-input are the actual "liquid glass" material —
   frosted, translucent, floating (blur + a soft shadow with a bright top rim) instead of a flat
   fill — applied to every chip, tag, panel, progress track, button and filter input that already
   uses these classes app-wide. */
.eai-soft{ background:var(--glass-bg); backdrop-filter:blur(16px) saturate(180%); -webkit-backdrop-filter:blur(16px) saturate(180%); border:1px solid var(--glass-line); box-shadow:var(--glass-shadow); }
.eai-muted{ color:var(--muted); }
.eai-btn{ font-weight:600; border-radius:13px; transition:transform .12s ease, filter .12s ease; cursor:pointer; border:none; }
.eai-btn:hover{ filter:brightness(1.05); }
.eai-btn:active{ transform:translateY(1px); }
.eai-nav{ transition:background .15s ease, color .15s ease; cursor:pointer; }
.eai-nav:hover{ background:var(--bg-soft); }
.eai-tile{ transition:transform .15s ease, box-shadow .15s ease, border-color .15s ease; cursor:pointer; }
.eai-tile:hover{ transform:translateY(-3px); box-shadow:var(--shadow); border-color:var(--primary); }
.eai-focus:focus-visible{ outline:2px solid var(--primary); outline-offset:2px; }
input.eai-input, select.eai-input{ background:var(--glass-bg); color:var(--ink); border:1px solid var(--glass-line); border-radius:14px; backdrop-filter:blur(16px) saturate(180%); -webkit-backdrop-filter:blur(16px) saturate(180%); box-shadow:var(--glass-shadow); }
input.eai-input::placeholder{ color:var(--muted); }
.eai-rise{ animation:rise .5s cubic-bezier(.2,.7,.3,1) both; }
@keyframes rise{ from{ opacity:0; transform:translateY(10px);} to{ opacity:1; transform:none;} }
@keyframes bounce{ 0%,60%,100%{ transform:translateY(0); opacity:.5;} 30%{ transform:translateY(-4px); opacity:1;} }
.eai-scroll::-webkit-scrollbar{ height:6px; width:6px; }
.eai-scroll::-webkit-scrollbar-thumb{ background:var(--line); border-radius:99px; }
.eai-pick{ transition:transform .15s ease, border-color .15s ease, box-shadow .15s ease; cursor:pointer; }
.eai-pick:hover{ transform:translateY(-2px); box-shadow:var(--shadow); }
@media (prefers-reduced-motion: reduce){ .eai-rise{ animation:none; } .eai-btn,.eai-tile,.eai-pick{ transition:none; } }

/* ── Liquid glass button (High School track — trial rollout) ──
   A frosted, refractive replacement for a flat-color button: translucent tinted glass at rest
   (blur + saturation + a bright top-rim shadow), and on hover a diagonal sheen sweeps across the
   surface — like light refracting through moving glass — while the blur deepens and the button
   lifts. "--glass-tint" defaults to the brand primary; pass a different token inline
   (style={{ "--glass-tint": "var(--jade)" }}) to tint an individual button. Drop "eai-glass" onto
   any "eai-btn" in place of a solid background/text-white — it supplies its own surface, border
   and text color, so no other button styling is needed alongside it. */
.eai-glass{
  --glass-tint: var(--primary);
  position: relative;
  overflow: hidden;
  isolation: isolate; /* contains the sheen's stacking to this button, not the page behind it */
  color: var(--ink);
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--glass-tint) 24%, transparent), color-mix(in srgb, var(--glass-tint) 6%, transparent)),
    var(--glass-bg);
  border: 1px solid var(--glass-line);
  box-shadow: var(--glass-shadow);
  backdrop-filter: blur(14px) saturate(160%);
  -webkit-backdrop-filter: blur(14px) saturate(160%);
  transition: transform .4s cubic-bezier(.22,1,.36,1), box-shadow .4s cubic-bezier(.22,1,.36,1),
    backdrop-filter .4s cubic-bezier(.22,1,.36,1), border-color .4s cubic-bezier(.22,1,.36,1);
}
/* the sheen itself: an oversized diagonal highlight parked just off the left edge at rest, then
   swept through to the right on hover — inset is larger than 100% so a rotated band never clips
   at the corners as it travels */
.eai-glass::before{
  content: "";
  position: absolute;
  inset: -50% -60%;
  background: linear-gradient(115deg, transparent 42%, rgba(255,255,255,.55) 50%, transparent 58%);
  transform: translateX(-130%) rotate(8deg);
  transition: transform .7s cubic-bezier(.22,1,.36,1);
  pointer-events: none;
}
.theme-dark .eai-glass::before{ background: linear-gradient(115deg, transparent 42%, rgba(255,255,255,.2) 50%, transparent 58%); }
.eai-glass:hover{
  transform: translateY(-2px);
  border-color: color-mix(in srgb, var(--glass-tint) 45%, var(--glass-line));
  box-shadow: 0 14px 32px color-mix(in srgb, var(--glass-tint) 22%, transparent), inset 0 1px 0 rgba(255,255,255,.4);
  backdrop-filter: blur(20px) saturate(200%);
  -webkit-backdrop-filter: blur(20px) saturate(200%);
}
.eai-glass:hover::before{ transform: translateX(130%) rotate(8deg); }
.eai-glass:active{ transform: translateY(0) scale(.98); }
.eai-glass:disabled, .eai-glass[disabled]{ opacity:.5; cursor:not-allowed; }
@media (prefers-reduced-motion: reduce){ .eai-glass, .eai-glass::before{ transition:none; } .eai-glass:hover{ transform:none; } }

/* AI Coach chat (Claude / ChatGPT style) */
/* Fills what is left under the app header (64px) and main's padding (2x24px).
   dvh keeps the composer clear of a mobile browser's retracting URL bar, and the
   floor is low enough that a short window scrolls the messages, not the composer. */
.eai-coach-view{ height:calc(100vh - 112px); height:calc(100dvh - 112px); min-height:360px; }
.eai-chat-col{ max-width:768px; margin:0 auto; padding:20px 16px 12px; display:flex; flex-direction:column; gap:22px; }
.eai-user-bubble{ background:var(--bg-soft); color:var(--ink); border-radius:20px; padding:10px 16px; max-width:85%; white-space:pre-wrap; line-height:1.55; font-size:15px; overflow-wrap:anywhere; }
.eai-chat-img{ width:168px; height:168px; object-fit:cover; border-radius:14px; border:1px solid var(--line); display:block; cursor:zoom-in; }
.eai-avatar{ width:30px; height:30px; border-radius:99px; background:var(--primary); display:grid; place-items:center; flex:none; margin-top:1px; }
.eai-msg-actions{ display:flex; align-items:flex-start; gap:6px; margin-top:6px; flex-wrap:wrap; }
.eai-msg-actions details{ margin-top:5px; }
.eai-icon-btn{ width:36px; height:36px; border-radius:99px; display:grid; place-items:center; color:var(--muted); background:transparent; border:none; cursor:pointer; transition:background .15s ease, color .15s ease; }
.eai-icon-btn:hover{ background:var(--bg-soft); color:var(--ink); }
.eai-icon-btn.sm{ width:28px; height:28px; border-radius:8px; }
.eai-composer-wrap{ max-width:768px; margin:0 auto; width:100%; padding:6px 16px 4px; }
.eai-composer{ background:var(--card); border:1px solid var(--line); border-radius:26px; box-shadow:var(--shadow); transition:border-color .15s ease; }
.eai-composer:focus-within{ border-color:var(--primary); }
.eai-composer.drag{ border-color:var(--primary); border-style:dashed; }
.eai-composer-input{ display:block; width:100%; resize:none; border:none; outline:none; background:transparent; color:var(--ink); font:inherit; font-size:15px; line-height:1.5; padding:14px 18px 6px; max-height:200px; overflow-y:auto; }
.eai-composer-input::placeholder{ color:var(--muted); }
.eai-send{ width:36px; height:36px; border-radius:99px; display:grid; place-items:center; background:var(--ink); color:var(--card); border:none; cursor:pointer; transition:opacity .15s ease; }
.eai-send:disabled{ opacity:.25; cursor:default; }
.eai-attach{ position:relative; width:64px; height:64px; border-radius:12px; overflow:hidden; border:1px solid var(--line); flex:none; }
.eai-attach img{ width:100%; height:100%; object-fit:cover; display:block; }
.eai-attach > button{ position:absolute; top:3px; right:3px; width:20px; height:20px; border-radius:99px; background:rgba(0,0,0,.7); color:#fff; display:grid; place-items:center; border:none; cursor:pointer; }
.eai-attach-busy{ position:absolute; inset:0; background:rgba(255,255,255,.6); display:grid; place-items:center; color:#333; }
.eai-menu{ position:absolute; bottom:44px; left:0; width:280px; background:var(--card); border:1px solid var(--line); border-radius:16px; box-shadow:var(--shadow); padding:6px; z-index:20; }
.eai-menu button{ width:100%; display:flex; gap:10px; align-items:flex-start; text-align:left; padding:9px 10px; border-radius:10px; background:none; border:none; color:var(--ink); cursor:pointer; font-size:14px; }
.eai-menu button:hover:not(:disabled){ background:var(--bg-soft); }
.eai-menu button:disabled{ opacity:.5; cursor:default; }
.eai-menu svg{ flex:none; margin-top:2px; }
.eai-suggest{ text-align:left; padding:12px 14px; border-radius:16px; border:1px solid var(--line); background:var(--card); color:var(--ink); font-size:14px; cursor:pointer; transition:background .15s ease, border-color .15s ease; }
.eai-suggest:hover{ background:var(--bg-soft); border-color:var(--primary); }
.eai-reading{ max-width:85%; font-size:13px; color:var(--muted); }
.eai-reading summary{ cursor:pointer; display:inline-flex; gap:6px; align-items:center; list-style:none; border-radius:8px; padding:2px 4px; }
.eai-reading summary::-webkit-details-marker{ display:none; }
.eai-reading[open] summary svg:last-child{ transform:rotate(180deg); }
.eai-reading > div{ margin-top:6px; padding:10px 12px; border:1px solid var(--line); border-radius:12px; color:var(--ink); background:var(--card); text-align:left; }
.eai-status{ display:inline-flex; align-items:center; gap:8px; color:var(--muted); font-size:14px; min-height:30px; }
.eai-shimmer{ background:linear-gradient(90deg, var(--muted) 35%, var(--ink) 50%, var(--muted) 65%); background-size:250% 100%; -webkit-background-clip:text; background-clip:text; color:transparent; animation:shimmer 1.8s linear infinite; }
@keyframes shimmer{ from{ background-position:100% 0; } to{ background-position:-150% 0; } }
.eai-spin{ animation:spin 1s linear infinite; }
@keyframes spin{ to{ transform:rotate(360deg); } }
.eai-drop{ position:absolute; inset:0; z-index:30; display:grid; place-items:center; padding:24px; text-align:center; color:var(--primary); background:color-mix(in srgb, var(--bg) 85%, transparent); border:2px dashed var(--primary); border-radius:22px; pointer-events:none; }
.eai-lightbox{ position:fixed; inset:0; z-index:100; background:rgba(0,0,0,.85); display:grid; place-items:center; padding:24px; cursor:zoom-out; }
.eai-lightbox img{ max-width:100%; max-height:100%; border-radius:12px; }
.eai-footnote{ text-align:center; font-size:11px; color:var(--muted); margin-top:6px; }
@media (prefers-reduced-motion: reduce){ .eai-spin,.eai-shimmer{ animation:none; } .eai-shimmer{ color:var(--muted); background:none; } }
/* AI Coach answers: Markdown + KaTeX */
/* Khmer stacks diacritics above and below the line, so answers need more leading
   than Latin text before the rows of a derivation stop touching each other. */
.eai-md{ line-height:1.8; }
.eai-md > * + *{ margin-top:.7em; }
.eai-md ol{ list-style:decimal; padding-left:1.4em; } .eai-md ul{ list-style:disc; padding-left:1.4em; }
.eai-md li + li{ margin-top:.35em; }
.eai-md li > ul,.eai-md li > ol{ margin-top:.35em; padding-left:1.1em; }
.eai-md li::marker{ color:var(--muted); }
.eai-md h1,.eai-md h2,.eai-md h3,.eai-md h4{ font-weight:700; }
/* One heading per part of an exercise: a rule and real space above it so eight
   answers read as eight blocks instead of one wall of Khmer and LaTeX. */
.eai-md h2,.eai-md h3,.eai-md h4{ font-size:1em; margin-top:1.3em; padding-top:.75em; border-top:1px solid var(--line); }
.eai-md > :first-child{ margin-top:0; padding-top:0; border-top:none; }
.eai-md strong{ font-weight:700; }
.eai-md a{ color:var(--primary); text-decoration:underline; }
.eai-md code{ font-size:.9em; background:var(--card); border-radius:6px; padding:.1em .35em; }
.eai-md pre{ background:var(--card); border:1px solid var(--line); border-radius:12px; padding:10px 12px; overflow-x:auto; }
.eai-md pre code{ background:none; padding:0; }
.eai-md table{ border-collapse:collapse; } .eai-md th,.eai-md td{ border:1px solid var(--line); padding:4px 8px; }
.eai-md blockquote{ border-left:3px solid var(--line); padding-left:10px; color:var(--muted); }
/* A displayed step can be wider than the column and taller than its line box.
   Scroll it sideways rather than squeezing it, and clip with a margin so tall
   parts (\lim limits, nested \frac, a \left[ that spans two rows) keep their
   ascenders instead of being sliced off. overflow-y:clip is ignored by older
   browsers, which fall back to the hidden above it. */
.eai-md .katex-display{ overflow-x:auto; overflow-y:hidden; overflow-y:clip; overflow-clip-margin:.5em; padding:.4em .1em; margin:.7em 0; }
.eai-md .katex{ font-size:1.05em; }
.eai-pick:hover{ transform:translateY(-2px); box-shadow:var(--shadow); }
@media (prefers-reduced-motion: reduce){ .eai-rise{ animation:none; } .eai-btn,.eai-tile,.eai-pick{ transition:none; } }

/* ── Welcome hero card ── */
.eai-hero-card{ position:relative; overflow:hidden; border-radius:22px; background:var(--card); border:1px solid var(--line); box-shadow:var(--shadow); display:flex; }
.eai-hero-content{ position:relative; z-index:3; padding:32px; flex:1 1 auto; min-width:0; }
@media (max-width:640px){ .eai-hero-content{ padding:24px; } }
.eai-hero-illustration{ position:relative; flex:0 0 42%; display:none; overflow:hidden; }
@media (min-width:768px){ .eai-hero-illustration{ display:block; } }
.eai-hero-image{ position:absolute; top:-15%; left:0; width:110%; height:130%; object-fit:cover; object-position:left center; z-index:1; opacity:.9; }
.theme-dark .eai-hero-image{ filter:invert(1) brightness(1.6); opacity:.75; }
.eai-hero-divider{ position:absolute; inset:0; z-index:2; pointer-events:none; background:var(--primary);
  clip-path:polygon(10% 0%, 17% 0%, -9% 100%, -16% 100%); }
.eai-hero-greeting{ font-size:14px; color:var(--gold); }
.eai-hero-title{ font-family:'Sora', system-ui, sans-serif; font-size:28px; font-weight:800; color:var(--ink); margin-top:4px; letter-spacing:-.01em; }
@media (max-width:640px){ .eai-hero-title{ font-size:24px; } }
.eai-hero-message{ font-size:14px; color:var(--muted); margin-top:8px; max-width:420px; line-height:1.55; }
.eai-hero-actions{ display:flex; flex-wrap:wrap; align-items:center; gap:12px; margin-top:20px; }

/* ── Recommended lesson banner ── */
.eai-lesson-card{
  position:relative; overflow:hidden; border-radius:22px; padding:24px; min-height:125px; color:#fff;
  background:linear-gradient(110deg, #4338B8 0%, #4C43C7 45%, #5C4FD9 100%);
  box-shadow:0 14px 35px rgba(63,55,180,.18);
  border:1px solid rgba(255,255,255,.14);
}
.theme-dark .eai-lesson-card{
  background:linear-gradient(110deg, #3730A3 0%, #4438B5 45%, #5145C8 100%);
  box-shadow:0 10px 26px rgba(0,0,0,.35);
  border-color:rgba(160,150,255,.18);
}
.eai-lesson-card::after{
  content:""; position:absolute; inset:0; pointer-events:none;
  background:radial-gradient(ellipse 60% 90% at 100% 30%, rgba(154,141,245,.25), transparent 70%);
}
.eai-lesson-decor{
  position:absolute; top:0; right:0; width:55%; height:100%; object-fit:cover; object-position:right center;
  opacity:.32; mix-blend-mode:screen; pointer-events:none;
}
.eai-lesson-overlay{
  position:absolute; inset:0; pointer-events:none;
  background:linear-gradient(to right, #4A40BF 0%, rgba(74,64,191,.96) 35%, rgba(74,64,191,.35) 75%, rgba(74,64,191,.1) 100%);
}
.theme-dark .eai-lesson-overlay{
  background:linear-gradient(to right, #3730A3 0%, rgba(55,48,163,.96) 35%, rgba(55,48,163,.35) 75%, rgba(55,48,163,.1) 100%);
}
.eai-lesson-label{ display:flex; align-items:center; gap:8px; font-size:13px; font-weight:500; color:rgba(237,235,255,.92); }
.eai-lesson-title{ font-family:'Sora', system-ui, sans-serif; font-size:22px; font-weight:700; color:#fff; margin-top:8px; letter-spacing:-.01em; }
.eai-lesson-desc{ font-size:14px; color:rgba(255,255,255,.8); margin-top:6px; }
.eai-lesson-btn{
  background:#FFFFFF; color:#4942C6; height:48px; padding:0 22px; border-radius:14px; font-weight:600; font-size:14px;
  display:inline-flex; align-items:center; justify-content:center; gap:8px; border:none; cursor:pointer; flex-shrink:0;
  box-shadow:0 4px 14px rgba(31,25,90,.18);
  transition:background-color .2s ease, box-shadow .2s ease, transform .2s ease;
}
.eai-lesson-btn:hover{ background:#F4F2FF; transform:translateY(-1px); box-shadow:0 6px 18px rgba(31,25,90,.22); }
.eai-lesson-btn:hover .eai-lesson-arrow{ transform:translateX(2px); }
.eai-lesson-btn:active{ transform:translateY(0) scale(.98); filter:brightness(.97); }
.eai-lesson-arrow{ transition:transform .2s ease; }
@media (max-width:640px){
  .eai-lesson-card{ padding:20px; }
  .eai-lesson-title{ font-size:19px; }
  .eai-lesson-decor{ width:42%; height:46%; opacity:.16; }
}
@media (prefers-reduced-motion: reduce){
  .eai-lesson-btn, .eai-lesson-arrow{ transition:none; }
  .eai-lesson-btn:hover{ transform:none; }
}

/* ── Onboarding flow: shared layout, progress, cards, inputs, buttons ── */
.eai-onboarding.theme-light{
  --bg:#F8F8FC; --card:#FFFFFF; --surface-2:#FFFFFF; --bg-soft:#F5F4FA;
  --ink:#181A3B; --muted:#727694; --label:#696D8B; --muted-2:#999CB2; --line:#E5E4EE;
  --input-border:#E2E1EB; --input-border-hover:#C9C6E5; --focus-border:#5148D5;
  --primary:#4C44C7; --primary-hover:#4139B8; --primary-soft:#EFEEFC; --primary-ring:rgba(81,72,213,.12);
  --gold:#EE9A21; --gold-soft:#FFF0D4; --ember:#E76F61;
  --progress-track:#ECEBF5; --progress-fill:#5148D5;
  --shadow:0 18px 50px rgba(31,31,70,.08);
  --glass-bg:rgba(255,255,255,.55); --glass-line:rgba(255,255,255,.8); --glass-shadow:0 1px 3px rgba(26,27,58,.08), inset 0 1px 0 rgba(255,255,255,.6);
}
.eai-onboarding.theme-dark{
  --bg:#090B1D; --card:#17192F; --surface-2:#1D203B; --bg-soft:#202238;
  --ink:#F5F3FC; --muted:#A7AAC2; --label:#B8BACD; --muted-2:#8589A4; --line:#2A2D49;
  --input-border:#30334F; --input-border-hover:#424665; --focus-border:#8A82F4;
  --primary:#8179F2; --primary-hover:#918AF7; --primary-soft:#28294D; --primary-ring:rgba(138,130,244,.10);
  --gold:#EFA421; --gold-soft:#302716; --ember:#F17A70;
  --progress-track:#292C47; --progress-fill:#8179F2;
  --shadow:0 18px 50px rgba(0,0,0,.22);
  --glass-bg:rgba(255,255,255,.08); --glass-line:rgba(255,255,255,.16); --glass-shadow:0 1px 3px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.08);
}
.eai-onboarding{ position:relative; transition:background-color .25s ease, color .25s ease; }
.eai-onboarding::before{ content:""; position:fixed; inset:0; pointer-events:none; z-index:0; }
.eai-onboarding.theme-light::before{ background-image:radial-gradient(circle at 50% 25%, rgba(86,78,210,.07), transparent 42%); }
.eai-onboarding.theme-dark::before{ background-image:radial-gradient(circle at 50% 25%, rgba(115,105,235,.12), transparent 45%); }
.eai-onboarding > *{ position:relative; z-index:1; }

.eai-ob-toggle{ position:fixed; top:20px; right:20px; width:44px; height:44px; border-radius:14px; border:1px solid var(--line);
  background:var(--bg-soft); color:var(--ink); display:grid; place-items:center; z-index:20; transition:background-color .15s ease, transform .12s ease; }
.eai-ob-toggle:hover{ background:var(--card); transform:translateY(-1px); }

.eai-ob-card{ background:var(--card); border:1px solid var(--line); border-radius:24px; box-shadow:var(--shadow); padding:40px; padding-top:16px; padding-bottom:64px;
  transition:background-color .25s ease, border-color .25s ease, box-shadow .25s ease; }
@media (max-width:640px){ .eai-ob-card{ padding:22px; padding-top:8px; padding-bottom:40px; border-radius:20px; } }

.eai-ob-progress{ margin-bottom:18px; }
.eai-ob-progress-top{ display:flex; align-items:baseline; justify-content:space-between; gap:8px; }
.eai-ob-progress-step{ font-size:12px; font-weight:700; color:var(--primary); text-transform:uppercase; letter-spacing:.04em; }
.eai-ob-progress-label{ font-size:12px; font-weight:600; color:var(--muted); }
.eai-ob-progress-track{ margin-top:8px; height:6px; border-radius:999px; background:var(--progress-track); overflow:hidden; }
.eai-ob-progress-fill{ height:100%; border-radius:999px; background:var(--progress-fill); transition:width .3s ease; }

/* Duolingo-style top row: a bare chevron beside the progress bar, instead of a separate "Back" row. */
.eai-ob-progress-row{ display:flex; align-items:center; gap:12px; margin-bottom:22px; }
.eai-ob-back-icon{ display:grid; place-items:center; width:32px; height:32px; border-radius:10px; flex-shrink:0;
  color:var(--muted); transition:color .15s ease, background-color .15s ease; }
.eai-ob-back-icon:hover{ color:var(--primary); background:var(--primary-soft); }
.eai-ob-progress-row .eai-ob-progress{ flex:1; margin-bottom:0; }

.eai-ob-heading{ margin-bottom:22px; }
.eai-ob-title{ font-family:'Sora', system-ui, sans-serif; font-weight:700; font-size:28px; letter-spacing:-.02em; line-height:1.22; color:var(--ink); }
.eai-ob-desc{ font-size:15px; color:var(--muted); margin-top:6px; max-width:620px; line-height:1.55; }
@media (max-width:640px){ .eai-ob-title{ font-size:24px; } }

/* "Mascot asks" question presentation — the owl beside a speech bubble holding the current
   step's question, one at a time, instead of a plain heading. */
.eai-ob-mascot-row{ display:flex; align-items:flex-start; gap:0px; margin-bottom:22px; }
.eai-ob-mascot-avatar{ width:152px; height:207px; flex-shrink:0; background:transparent; display:grid; place-items:center; }
.eai-ob-bubble{ position:relative; background:var(--card); border:1px solid var(--line); border-radius:18px; padding:14px 18px; box-shadow:var(--shadow); flex:1; align-self:center; animation:eai-ob-bubble-in .35s ease-out; }
@keyframes eai-ob-bubble-in{ from{ opacity:0; transform:translateX(-8px) scale(.97); } to{ opacity:1; transform:none; } }
.eai-ob-bubble::before{ content:""; position:absolute; left:-7px; top:64px; width:14px; height:14px; background:var(--card);
  border-left:1px solid var(--line); border-bottom:1px solid var(--line); transform:rotate(45deg); border-radius:0 0 0 3px; }
.eai-ob-bubble .eai-ob-title{ font-size:20px; margin:0; }
.eai-ob-bubble .eai-ob-desc{ margin-top:4px; font-size:14px; }
@media (max-width:640px){ .eai-ob-mascot-avatar{ width:120px; height:163px; } .eai-ob-bubble .eai-ob-title{ font-size:18px; } }

/* ── Mascot: whole-image "acted" states (see Mascot component) ──
   idle = organic breathing/sway, feet planted, no floating. Other states are one-shot reactions
   to real UI events (hover a button, submit a form, log in) rather than loops. */
.eai-mascot{ display:inline-block; }
.eai-mascot-img{ transform-origin:50% 100%; will-change:transform; -webkit-user-drag:none; user-select:none; -webkit-user-select:none; pointer-events:none; }

.eai-mascot-idle .eai-mascot-img{ animation:eai-mascot-idle 3.2s ease-in-out infinite; }
@keyframes eai-mascot-idle{
  0%, 100% { transform:rotate(0deg) scaleY(1); }
  25% { transform:rotate(4deg) scaleY(1.015); }
  50% { transform:rotate(0deg) scaleY(1); }
  75% { transform:rotate(-3deg) scaleY(1.01); }
}

.eai-mascot-hover .eai-mascot-img{ animation:none; transform:rotate(-6deg) scale(1.06); transition:transform .25s ease-out; }

.eai-mascot-happy .eai-mascot-img{ animation:eai-mascot-happy .7s ease-in-out 1; }
@keyframes eai-mascot-happy{
  0% { transform:translateY(0) rotate(0deg); }
  30% { transform:translateY(-14px) rotate(-6deg); }
  55% { transform:translateY(0) rotate(4deg); }
  75% { transform:translateY(-5px) rotate(-2deg); }
  100% { transform:translateY(0) rotate(0deg); }
}

.eai-mascot-sad .eai-mascot-img{ animation:eai-mascot-sad .5s ease-out 1 forwards; }
@keyframes eai-mascot-sad{
  0% { transform:rotate(0deg) scaleY(1); filter:none; }
  100% { transform:rotate(4deg) scaleY(.95) translateY(3px); filter:saturate(.7) brightness(.96); }
}

.eai-mascot-loading .eai-mascot-img{ animation:eai-mascot-loading 1.1s ease-in-out infinite; }
@keyframes eai-mascot-loading{
  0%, 100% { transform:scale(1); opacity:1; }
  50% { transform:scale(.96); opacity:.8; }
}

.eai-mascot-success .eai-mascot-img{ animation:eai-mascot-success .5s cubic-bezier(.34,1.56,.64,1) 1; }
@keyframes eai-mascot-success{
  0% { transform:scale(1) rotate(0deg); }
  50% { transform:scale(1.14) rotate(-4deg); }
  100% { transform:scale(1) rotate(0deg); }
}
.eai-mascot-badge{ position:absolute; top:-2px; right:-2px; width:26px; height:26px; border-radius:50%; background:var(--jade); color:#fff;
  display:grid; place-items:center; box-shadow:0 2px 8px rgba(0,0,0,.2); animation:eai-mascot-badge-in .3s ease-out; z-index:2; }
@keyframes eai-mascot-badge-in{ from{ transform:scale(0); opacity:0; } to{ transform:scale(1); opacity:1; } }

.eai-mascot-celebration .eai-mascot-img{ animation:eai-mascot-celebrate 1s ease-in-out 1; }
@keyframes eai-mascot-celebrate{
  0% { transform:translateY(0) rotate(0deg) scale(1); }
  20% { transform:translateY(-18px) rotate(-10deg) scale(1.05); }
  40% { transform:translateY(0) rotate(8deg) scale(1); }
  60% { transform:translateY(-10px) rotate(-6deg) scale(1.03); }
  80% { transform:translateY(0) rotate(3deg) scale(1); }
  100% { transform:translateY(0) rotate(0deg) scale(1); }
}
.eai-mascot-confetti{ position:absolute; inset:-20px; pointer-events:none; overflow:visible; z-index:1; }
.eai-mascot-confetti span{ position:absolute; top:40%; left:50%; width:7px; height:7px; border-radius:2px; animation:eai-confetti-burst 1.1s ease-out forwards; }
@keyframes eai-confetti-burst{
  0% { transform:translate(0,0) rotate(0deg); opacity:1; }
  100% { transform:translate(var(--dx), var(--dy)) rotate(var(--rot)); opacity:0; }
}

@media (prefers-reduced-motion: reduce){
  .eai-mascot-img{ animation:none !important; transition:none !important; }
  .eai-mascot-confetti{ display:none; }
}

.eai-ob-label{ font-size:13px; font-weight:600; color:var(--label); display:block; }
/* Liquid-glass onboarding material — frosted/translucent (blur + a soft shadow with a bright
   top rim) instead of a flat fill, matching the same look used across the rest of the app.
   Hover/selected states still layer their own (opaque, branded) background on top. */
.eai-ob-input{ height:48px; width:100%; border-radius:14px; border:1px solid var(--glass-line); background:var(--glass-bg); color:var(--ink);
  padding:0 16px; font-size:14px; backdrop-filter:blur(16px) saturate(180%); -webkit-backdrop-filter:blur(16px) saturate(180%); box-shadow:var(--glass-shadow);
  transition:background-color .2s ease, border-color .2s ease, box-shadow .2s ease; }
.eai-ob-input::placeholder{ color:var(--muted-2); }
.eai-ob-input:hover{ border-color:var(--input-border-hover); }
.eai-ob-input:focus-visible{ outline:none; border-color:var(--focus-border); box-shadow:0 0 0 4px var(--primary-ring); }
.eai-ob-error{ display:flex; align-items:center; gap:5px; font-size:12px; color:var(--ember); margin-top:6px; }

.eai-ob-track-card{ width:100%; text-align:left; border-radius:18px; border:1px solid var(--glass-line); background:var(--glass-bg);
  padding:20px; cursor:pointer; backdrop-filter:blur(16px) saturate(180%); -webkit-backdrop-filter:blur(16px) saturate(180%); box-shadow:var(--glass-shadow);
  transition:background-color .18s ease, border-color .18s ease, transform .15s ease, box-shadow .18s ease; }
.eai-ob-track-card:hover{ border-color:var(--primary); transform:translateY(-1px); }
.eai-ob-track-card.is-selected{ background:var(--primary-soft); border-color:var(--primary); box-shadow:0 0 0 3px var(--primary-ring); }
.eai-ob-tag{ font-size:11px; font-weight:600; padding:3px 9px; border-radius:999px; background:var(--glass-bg); border:1px solid var(--glass-line); color:var(--muted); }

.eai-ob-chip{ height:37px; padding:0 14px; border-radius:999px; border:1px solid var(--glass-line); background:var(--glass-bg); color:var(--ink);
  font-size:12px; font-weight:600; display:inline-flex; align-items:center; gap:6px; cursor:pointer;
  backdrop-filter:blur(16px) saturate(180%); -webkit-backdrop-filter:blur(16px) saturate(180%); box-shadow:var(--glass-shadow);
  transition:background-color .15s ease, border-color .15s ease, color .15s ease; }
.eai-ob-chip:hover{ border-color:var(--primary); }
.eai-ob-chip.is-selected{ background:var(--primary-soft); border-color:var(--primary); }
.theme-light .eai-ob-chip.is-selected{ color:var(--primary); }
.theme-dark .eai-ob-chip.is-selected{ color:var(--ink); }

.eai-ob-text-action{ font-size:12px; font-weight:600; color:var(--muted); padding:5px 9px; border-radius:8px;
  transition:color .15s ease, background-color .15s ease; }
.eai-ob-text-action:hover{ color:var(--primary); background:var(--primary-soft); }

.eai-ob-btn-primary{ height:50px; width:100%; border-radius:14px; font-weight:600; font-size:14px; color:#fff; background:var(--primary);
  border:none; transition:background-color .2s ease, transform .12s ease; }
.eai-ob-btn-primary:hover:not(:disabled){ background:var(--primary-hover); transform:translateY(-1px); }
.eai-ob-btn-primary:active:not(:disabled){ transform:translateY(0); }
.eai-ob-btn-primary:disabled{ background:var(--primary-soft); color:var(--muted-2); cursor:not-allowed; }
.eai-ob-btn-secondary{ height:50px; width:100%; border-radius:14px; font-weight:600; font-size:14px; background:var(--glass-bg); color:var(--ink);
  border:1px solid var(--glass-line); backdrop-filter:blur(16px) saturate(180%); -webkit-backdrop-filter:blur(16px) saturate(180%); box-shadow:var(--glass-shadow);
  transition:background-color .2s ease, border-color .2s ease, transform .12s ease; }
.eai-ob-btn-secondary:hover{ border-color:var(--primary); transform:translateY(-1px); }

.eai-ob-option-card{ position:relative; border-radius:18px; padding:22px; border:1px solid var(--glass-line); background:var(--glass-bg);
  backdrop-filter:blur(16px) saturate(180%); -webkit-backdrop-filter:blur(16px) saturate(180%); box-shadow:var(--glass-shadow);
  transition:background-color .2s ease, border-color .2s ease; display:flex; flex-direction:column; height:100%; }
.eai-ob-option-card.is-primary{ background:var(--primary-soft); border-color:var(--primary); }
.eai-ob-badge{ position:absolute; top:16px; right:16px; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.04em;
  padding:4px 9px; border-radius:999px; background:var(--primary); color:#fff; }
.eai-ob-benefits{ margin-top:12px; display:flex; flex-direction:column; gap:6px; }
.eai-ob-benefits li{ display:flex; align-items:center; gap:6px; font-size:12px; color:var(--muted); }

.eai-ob-footer{ text-align:center; font-size:13px; color:var(--muted); margin-top:18px; }

@media (prefers-reduced-motion: reduce){
  .eai-ob-progress-fill{ transition:none; }
  .eai-ob-track-card, .eai-ob-btn-primary, .eai-ob-btn-secondary, .eai-ob-toggle{ transition:none; }
  .eai-ob-bubble{ animation:none; }
}
`;

/* ════════════════════════ Signature motif + atoms ════════════════════════ */
function Angkor({ className, style }) {
  const tower = (x, w, h) => {
    const top = 120 - h;
    return (
      <g key={x}>
        <path d={`M${x} 120 L${x} ${top + 14} Q${x} ${top + 4} ${x + w * 0.18} ${top + 2}
          Q${x + w / 2} ${top - 10} ${x + w * 0.82} ${top + 2} Q${x + w} ${top + 4} ${x + w} ${top + 14} L${x + w} 120 Z`} />
        <circle cx={x + w / 2} cy={top - 6} r="2.4" />
      </g>
    );
  };
  return (
    <svg viewBox="0 0 320 120" className={className} style={style} preserveAspectRatio="none" aria-hidden="true">
      <rect x="0" y="112" width="320" height="8" rx="2" />
      {tower(40, 30, 56)}{tower(96, 36, 78)}{tower(142, 44, 104)}{tower(200, 36, 78)}{tower(250, 30, 56)}
    </svg>
  );
}

function Gauge({ value }) {
  const r = 92, cx = 112, cy = 112, len = Math.PI * r;
  return (
    <svg viewBox="0 0 224 128" width="100%" style={{ maxWidth: 280 }} aria-hidden="true">
      <path d={`M${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="var(--bg-soft)" strokeWidth="18" strokeLinecap="round" />
      <path d={`M${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="var(--jade)" strokeWidth="18" strokeLinecap="round"
        strokeDasharray={len} strokeDashoffset={len - (value / 100) * len} />
    </svg>
  );
}

function Ring({ value, size = 60, stroke = 7, color = "var(--gold)", children }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bg-soft)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (value / 100) * c} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>{children}</div>
    </div>
  );
}

function Pill({ icon: Icon, color, soft, label, value }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: soft }}>
      <Icon size={16} style={{ color }} />
      <span className={`text-sm font-bold eai-display ${kmClass(value)}`} style={{ color: "var(--ink)" }}>{value}</span>
      <span className={`text-xs eai-muted hidden sm:inline ${kmClass(label)}`}>{label}</span>
    </div>
  );
}

function CardHead({ title, kh, action }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <h3 className={`eai-display font-bold text-base ${kmClass(title)}`}>{title}</h3>
        {kh && <p className="eai-km text-xs eai-muted mt-0.5">{kh}</p>}
      </div>
      {action}
    </div>
  );
}

/* White dashboard hero card: greeting + actions on the left, a handwritten-formula illustration on
   the right behind a bold diagonal purple divider. The illustration is purely decorative (empty alt,
   aria-hidden) and is hidden below the `md` breakpoint so it never competes with the text on mobile. */
function WelcomeHeroCard({ userName, greeting, message, imageUrl, onStartPlan, onAskCoach, lang = "en" }) {
  const firstName = (userName || "").split(" ")[0];
  return (
    <div className="eai-hero-card">
      <div className="eai-hero-content">
        <p className="eai-km eai-hero-greeting">{greeting}, {firstName}! 👋</p>
        <h2 className={`eai-hero-title ${lang === "km" ? "eai-km" : ""}`}>{lang === "km" ? `សូមស្វាគមន៍, ${firstName}។` : `Welcome, ${firstName}.`}</h2>
        {message && <p className={`eai-hero-message ${lang === "km" ? "eai-km" : ""}`}>{message}</p>}
        <div className="eai-hero-actions">
          <button onClick={onStartPlan} className={`eai-btn eai-glass eai-focus px-4 py-2.5 text-sm flex items-center gap-2 ${lang === "km" ? "eai-km" : ""}`}>
            <Target size={16} /> {t(lang, "dashStartPlan")}
          </button>
          <button onClick={onAskCoach} className={`eai-btn eai-glass eai-focus px-4 py-2.5 text-sm flex items-center gap-2 ${lang === "km" ? "eai-km" : ""}`} style={{ "--glass-tint": "var(--jade)" }}>
            <Sparkles size={16} /> {t(lang, "dashAskCoach")}
          </button>
        </div>
      </div>
      {imageUrl && (
        <div className="eai-hero-illustration">
          <img src={imageUrl} alt="" aria-hidden="true" className="eai-hero-image" />
          <div className="eai-hero-divider" />
        </div>
      )}
    </div>
  );
}

/* Wide purple "recommended lesson" banner shown on the Dashboard. `imageUrl` is an optional decorative
   background (a handwritten-formula illustration by default) — purely decorative, so it renders with
   an empty alt and is hidden from screen readers. */
function RecommendedLessonCard({ title, subject, duration, description, xp, imageUrl, onStart, lang = "en" }) {
  return (
    <div className="eai-lesson-card">
      {imageUrl && <img src={imageUrl} alt="" aria-hidden="true" className="eai-lesson-decor" />}
      <div className="eai-lesson-overlay" />
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
        <div className="min-w-0">
          <div className={`eai-lesson-label ${lang === "km" ? "eai-km" : ""}`}><Star size={16} /> {t(lang, "recommendedNextLesson")}</div>
          <h3 className="eai-lesson-title">{subject}: {title}</h3>
          <p className={`eai-lesson-desc ${lang === "km" ? "eai-km" : ""}`}>{duration} {t(lang, "lessonWord")} · {description} · +{xp} XP</p>
        </div>
        <button onClick={onStart} className={`eai-lesson-btn eai-focus w-full sm:w-auto ${lang === "km" ? "eai-km" : ""}`}>
          {t(lang, "startLesson")} <ArrowRight size={16} className="eai-lesson-arrow" />
        </button>
      </div>
    </div>
  );
}

/* ════════════════════════ Onboarding: shared layout + reusable building blocks ════════════════════════
   One shared visual system (OnboardingLayout) hosts all four onboarding screens — the three Register
   steps plus AssessmentChoice — so the logo, theme toggle, progress indicator, back-button slot, card
   shell and footer never jump between steps. Every field/card/chip/button below is scoped to the
   `.eai-onboarding` class so this palette never leaks into the rest of the app. */
const ONBOARDING_STEPS = ["Account details", "Academic track", "Learning preferences", "Getting started"];
const ONBOARDING_STEPS_KM = ["ព័ត៌មានគណនី", "ជម្រើសផ្នែកសិក្សា", "ចំណង់ចំណូលចិត្តក្នុងការសិក្សា", "ចាប់ផ្តើម"];
const UNI_ONBOARDING_STEPS = ["Account details", "Your goals", "Your field", "Your year"];
const UNI_ONBOARDING_STEPS_KM = ["ព័ត៌មានគណនី", "គោលដៅរបស់អ្នក", "ជំនាញរបស់អ្នក", "ឆ្នាំសិក្សា"];

/* Switches the app's UI language (English / Khmer) — visually matches ThemeToggle/.eai-ob-toggle
   but styled inline rather than via that class, since .eai-ob-toggle hardcodes position:fixed
   (fine for a lone corner button, but it fights layout when composed into a flex row alongside
   other controls — the same reason the header's dark-mode button also skips that class). */
function LangToggle({ lang, setLang, style }) {
  return (
    <button onClick={() => setLang((l) => (l === "en" ? "km" : "en"))} className="eai-focus eai-km"
      style={{
        height: 44, padding: "0 14px", borderRadius: 14, border: "1px solid var(--glass-line)",
        background: "var(--glass-bg)", backdropFilter: "blur(16px) saturate(180%)", WebkitBackdropFilter: "blur(16px) saturate(180%)",
        boxShadow: "var(--glass-shadow)", color: "var(--ink)", display: "grid", placeItems: "center",
        fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "background-color .15s ease, transform .12s ease",
        ...style,
      }}
      aria-label={lang === "en" ? "ប្តូរទៅភាសាខ្មែរ" : "Switch to English"}>
      {lang === "en" ? "ខ្មែរ" : "EN"}
    </button>
  );
}

function OnboardingProgress({ step, lang = "en", stepLabels, stepLabelsKm }) {
  const list = lang === "km" ? (stepLabelsKm || ONBOARDING_STEPS_KM) : (stepLabels || ONBOARDING_STEPS);
  const pct = (step / list.length) * 100;
  return (
    <div className="eai-ob-progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}
      aria-label={`Step ${step} of ${list.length}: ${list[step - 1]}`}>
      <div className="eai-ob-progress-top">
        <span className={`eai-ob-progress-step ${lang === "km" ? "eai-km" : ""}`}>{t(lang, "stepWord")} {step} {t(lang, "ofWord")} {list.length}</span>
        <span className={`eai-ob-progress-label ${lang === "km" ? "eai-km" : ""}`}>{list[step - 1]}</span>
      </div>
      <div className="eai-ob-progress-track">
        <div className="eai-ob-progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function OnboardingLayout({ dark, setDark, step, stepLabels, stepLabelsKm, title, description, onBack, children, lang = "en", setLang, mascotState = "idle" }) {
  return (
    <div className={`eai-root eai-onboarding ${dark ? "theme-dark" : "theme-light"}`} style={{ minHeight: "100vh" }}>
      <style>{STYLES}</style>
      <div style={{ position: "fixed", top: 20, right: 20, zIndex: 20, display: "flex", gap: 8 }}>
        {setLang && <LangToggle lang={lang} setLang={setLang} />}
        <button onClick={() => setDark((d) => !d)} className="eai-focus" aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
          style={{ position: "static", width: 44, height: 44, borderRadius: 14, border: "1px solid var(--glass-line)", background: "var(--glass-bg)", backdropFilter: "blur(16px) saturate(180%)", WebkitBackdropFilter: "blur(16px) saturate(180%)", boxShadow: "var(--glass-shadow)", color: "var(--ink)", display: "grid", placeItems: "center", transition: "background-color .15s ease, transform .12s ease" }}>
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

      <div className="flex items-start sm:items-center justify-center px-4 sm:px-6" style={{ minHeight: "100vh", paddingTop: 32, paddingBottom: 32 }}>
        <div className="w-full eai-rise" style={{ maxWidth: 820 }}>
          <div className="eai-ob-card">
            <div className="eai-ob-progress-row">
              {onBack ? (
                <button onClick={onBack} aria-label={t(lang, "backWord")} className="eai-ob-back-icon eai-focus">
                  <ChevronLeft size={20} />
                </button>
              ) : (
                <span aria-hidden="true" className="eai-ob-back-icon" style={{ visibility: "hidden" }}><ChevronLeft size={20} /></span>
              )}
              {step != null && <OnboardingProgress step={step} lang={lang} stepLabels={stepLabels} stepLabelsKm={stepLabelsKm} />}
            </div>

            {(title || description) && (
              <div className="eai-ob-mascot-row">
                <div className="eai-ob-mascot-avatar">
                  <Mascot src="/logos/Bondus_mascot_headphones_transparent.png" state={mascotState} fill />
                </div>
                <div className="eai-ob-bubble">
                  {title && <h1 className={`eai-ob-title ${lang === "km" ? "eai-km" : ""}`}>{title}</h1>}
                  {description && <p className={`eai-ob-desc ${lang === "km" ? "eai-km" : ""}`}>{description}</p>}
                </div>
              </div>
            )}

            {children}
          </div>
          <p className={`eai-ob-footer ${lang === "km" ? "eai-km" : ""}`}>{t(lang, "prototypeFooter")}</p>
        </div>
      </div>
    </div>
  );
}

function FormField({ label, required, error, children }) {
  return (
    <label className="block">
      <span className={`eai-ob-label ${kmClass(label)}`}>{label}{required && <span style={{ color: "var(--ember)" }}> *</span>}</span>
      <div className="mt-1.5">{children}</div>
      {error && <p className="eai-ob-error" role="alert"><AlertTriangle size={12} /> {error}</p>}
    </label>
  );
}

function SelectField({ label, required, value, onChange, options, autoComplete }) {
  return (
    <FormField label={label} required={required}>
      <select className="eai-ob-input eai-focus" value={value} onChange={onChange} autoComplete={autoComplete}>
        {options.map((o) => <option key={o.value} value={o.value} className={kmClass(o.label)}>{o.label}</option>)}
      </select>
    </FormField>
  );
}

function PrimaryButton({ children, className = "", ...props }) {
  return (
    <button className={`eai-ob-btn-primary eai-focus flex items-center justify-center gap-2 ${className}`} {...props}>
      {children}
    </button>
  );
}

function SecondaryButton({ children, className = "", ...props }) {
  return (
    <button className={`eai-ob-btn-secondary eai-focus flex items-center justify-center gap-2 ${className}`} {...props}>
      {children}
    </button>
  );
}

function TrackCard({ meta, subjects, selected, onSelect, lang = "en" }) {
  const Icon = meta.icon;
  return (
    <button type="button" role="radio" aria-checked={selected} onClick={onSelect}
      className={`eai-ob-track-card eai-focus ${selected ? "is-selected" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="grid place-items-center rounded-xl flex-shrink-0" style={{ width: 40, height: 40, background: meta.color }}>
            <Icon size={20} color="#fff" />
          </div>
          <div>
            <p className={`eai-display font-bold ${lang === "km" ? "eai-km" : ""}`}>{lang === "km" ? meta.km : meta.label}</p>
            {lang !== "km" && <p className="eai-km text-xs eai-muted">{meta.km}</p>}
          </div>
        </div>
        <span aria-hidden="true" style={{ color: "var(--primary)", flexShrink: 0 }}>
          {selected && <CheckCircle2 size={20} />}
        </span>
      </div>
      <p className={`text-xs eai-muted mt-3 leading-relaxed ${lang === "km" ? "eai-km" : ""}`}>{lang === "km" ? meta.blurbKm : meta.blurb}</p>
      <div className="flex flex-wrap gap-1.5 mt-3">
        {subjects.map((s) => <span key={s} className={`eai-ob-tag ${lang === "km" ? "eai-km" : ""}`}>{subjectLabel(s, lang)}</span>)}
      </div>
    </button>
  );
}

function SubjectChip({ label, selected, onToggle, lang = "en" }) {
  return (
    <motion.button type="button" aria-pressed={selected} whileTap={{ scale: 0.95 }} onClick={onToggle}
      className={`eai-ob-chip eai-focus ${selected ? "is-selected" : ""} ${lang === "km" ? "eai-km" : ""}`}>
      <AnimatePresence initial={false}>
        {selected && (
          <motion.span initial={{ scale: 0, opacity: 0, width: 0 }} animate={{ scale: 1, opacity: 1, width: 14 }} exit={{ scale: 0, opacity: 0, width: 0 }}
            transition={{ duration: 0.15 }} style={{ display: "flex", overflow: "hidden" }}>
            <CheckCircle2 size={14} />
          </motion.span>
        )}
      </AnimatePresence>
      {label}
    </motion.button>
  );
}

function OnboardingOptionCard({ variant = "secondary", icon: Icon, title, description, badge, benefits, buttonLabel, onClick }) {
  const primary = variant === "primary";
  return (
    <div className={`eai-ob-option-card ${primary ? "is-primary" : ""}`}>
      {badge && <span className="eai-ob-badge">{badge}</span>}
      {/* flex:1 spacer absorbs the height difference between cards with shorter/longer
          descriptions, so the buttons below always land on the same line. */}
      <div style={{ flex: 1 }}>
        <div className="grid place-items-center rounded-xl flex-shrink-0" style={{ width: 40, height: 40, background: primary ? "var(--primary)" : "var(--bg-soft)" }}>
          <Icon size={19} color={primary ? "#fff" : "var(--ink)"} />
        </div>
        <h3 className={`eai-display font-bold mt-3 text-base ${kmClass(title)}`}>{title}</h3>
        <p className={`text-sm eai-muted mt-1.5 leading-relaxed ${kmClass(description)}`}>{description}</p>
        {benefits && (
          <ul className="eai-ob-benefits">
            {benefits.map((b) => <li key={b} className={kmClass(b)}><CheckCircle2 size={13} style={{ color: "var(--primary)", flexShrink: 0 }} /> {b}</li>)}
          </ul>
        )}
      </div>
      {primary ? (
        <PrimaryButton onClick={onClick} className={`mt-5 w-full ${kmClass(buttonLabel)}`}><Sparkles size={16} /> {buttonLabel}</PrimaryButton>
      ) : (
        <SecondaryButton onClick={onClick} className={`mt-5 w-full ${kmClass(buttonLabel)}`}>{buttonLabel}</SecondaryButton>
      )}
    </div>
  );
}

/* ════════════════════════ Welcome / Login ════════════════════════
   The very first screen, before any account exists in this session. This is a local-storage-only
   prototype (no backend), so "logging in" means matching a phone number against whatever account
   is already saved in this browser — logging out (see App's handleLogout) intentionally leaves
   that data in place so it can be recovered here later. */

/* Small confetti burst used by Mascot's "celebration" state — a handful of colored particles
   flying outward and fading, randomized once per mount so repeated celebrations don't look
   identical. Pure CSS animation driven by --dx/--dy/--rot custom properties per particle. */
const CONFETTI_COLORS = ["var(--primary)", "var(--gold)", "var(--jade)", "var(--ember)"];
function ConfettiBurst() {
  const particles = useMemo(() => Array.from({ length: 14 }, (_, i) => {
    const angle = (Math.PI * 2 * i) / 14 + (Math.random() * 0.5 - 0.25);
    const dist = 55 + Math.random() * 45;
    return {
      id: i,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      dx: `${Math.cos(angle) * dist}px`,
      dy: `${Math.sin(angle) * dist - 18}px`,
      rot: `${Math.round(Math.random() * 360)}deg`,
      delay: `${Math.random() * 0.12}s`,
    };
  }), []);
  return (
    <div className="eai-mascot-confetti" aria-hidden="true">
      {particles.map((p) => (
        <span key={p.id} style={{ background: p.color, "--dx": p.dx, "--dy": p.dy, "--rot": p.rot, animationDelay: p.delay }} />
      ))}
    </div>
  );
}

/* Reusable animated mascot — one static image "acted" through whole-image CSS states rather than
   independently-rigged parts (see the session note on why: the art is a single flattened render,
   not separated layers). `fill` sizes it to 100%/100% of a pre-sized parent (e.g. the onboarding
   avatar slot); omit it to size naturally off width like a normal responsive image (e.g. Welcome's
   big illustration). States: idle | hover | happy | sad | loading | success | celebration. */
function Mascot({ src, state = "idle", fill = false, alt = "Bondus mascot", className = "", style }) {
  return (
    <div className={`eai-mascot eai-mascot-${state} ${className}`} style={{ position: "relative", ...(fill ? { width: "100%", height: "100%" } : null), ...style }}>
      <img src={src} alt={alt} className="eai-mascot-img"
        style={fill ? { width: "100%", height: "100%", objectFit: "contain", display: "block" } : { width: "100%", height: "auto", display: "block" }} />
      {state === "success" && <span className="eai-mascot-badge" aria-hidden="true"><Check size={14} /></span>}
      {state === "celebration" && <ConfettiBurst />}
    </div>
  );
}

function BondusLogo() {
  return (
    <img
      src="/logos/Bondus_mascout_nobg.png"
      alt="BONDUS"
      style={{ width: "100%", height: "100%", objectFit: "contain" }}
    />
  );
}

function Welcome({ dark, setDark, lang, setLang, onLogin, onCreate }) {
  return (
    <div className={`eai-root ${dark ? "theme-dark" : "theme-light"}`} style={{ minHeight: "100vh", background: dark ? "linear-gradient(to bottom right, #0c0d1e, #14152c, #1d1f3b)" : "linear-gradient(to bottom right, #f0f7ff, #ffffff, #f5f3ff)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "16px", position: "relative", overflow: "hidden" }}>
      <style>{STYLES}</style>

      {/* Decorative corner accents */}
      <div style={{ position: "absolute", top: -80, left: -80, width: 320, height: 320, background: "radial-gradient(circle, rgba(96, 165, 250, 0.15), transparent)", borderRadius: "50%", zIndex: 0 }}></div>
      <div style={{ position: "absolute", bottom: -100, right: -100, width: 360, height: 360, background: "radial-gradient(circle, rgba(192, 132, 252, 0.15), transparent)", borderRadius: "50%", zIndex: 0 }}></div>

      {/* Theme + language toggles */}
      <div style={{ position: "fixed", top: 20, right: 20, zIndex: 50, display: "flex", gap: 8 }}>
        <LangToggle lang={lang} setLang={setLang} />
        <button onClick={() => setDark((d) => !d)} className="eai-focus" aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
          style={{ position: "static", width: 44, height: 44, borderRadius: 14, border: "1px solid var(--glass-line)", background: "var(--glass-bg)", backdropFilter: "blur(16px) saturate(180%)", WebkitBackdropFilter: "blur(16px) saturate(180%)", boxShadow: "var(--glass-shadow)", color: "var(--ink)", display: "grid", placeItems: "center", transition: "background-color .15s ease, transform .12s ease" }}>
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

      {/* Responsive Welcome Content */}
      <div style={{ position: "relative", width: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", minHeight: "100vh", padding: "48px 24px", zIndex: 10 }}>

        {/* Top spacing */}
        <div style={{ height: "32px" }}></div>

        {/* Content Section — text/buttons kept at a comfortable reading width */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", width: "100%", maxWidth: "480px" }}>
          {/* Heading */}
          <h1 className={lang === "km" ? "eai-km" : ""} style={{ fontSize: "clamp(28px, 5vw, 44px)", fontWeight: "700", color: "var(--ink)", marginBottom: "12px", fontFamily: lang === "km" ? undefined : "'Sora', system-ui, sans-serif" }}>
            {t(lang, "welcomeHeading")} <span style={{ color: "var(--primary)" }}>{t(lang, "welcomeBrand")}</span>
          </h1>
          <p className={lang === "km" ? "eai-km" : ""} style={{ fontSize: "clamp(14px, 2vw, 18px)", color: "var(--muted)", marginBottom: "48px", lineHeight: "1.6", maxWidth: "100%" }}>
            {t(lang, "welcomeSubtitle")}
          </p>

          {/* Buttons */}
          <div style={{ width: "100%", maxWidth: "420px", display: "flex", flexDirection: "column", gap: "12px", marginBottom: "48px" }}>
            <button
              onClick={onCreate}
              className={`eai-focus ${lang === "km" ? "eai-km" : ""}`}
              style={{ width: "100%", padding: "14px 16px", border: "2px solid var(--primary)", color: "var(--primary)", fontWeight: "600", borderRadius: "9999px", background: "transparent", cursor: "pointer", transition: "all 0.2s", fontSize: "clamp(14px, 1.5vw, 16px)" }}
              onMouseEnter={(e) => { e.target.style.background = "var(--primary-soft)"; }}
              onMouseLeave={(e) => { e.target.style.background = "transparent"; }}
            >
              {t(lang, "createAccount")}
            </button>
            <button
              onClick={onLogin}
              className={`eai-focus ${lang === "km" ? "eai-km" : ""}`}
              style={{ width: "100%", padding: "14px 16px", background: "var(--primary)", color: "white", fontWeight: "600", borderRadius: "9999px", border: "none", cursor: "pointer", transition: "all 0.2s", fontSize: "clamp(14px, 1.5vw, 16px)", boxShadow: "0 4px 12px rgba(55, 48, 163, 0.3)" }}
              onMouseEnter={(e) => { e.target.style.filter = "brightness(0.9)"; }}
              onMouseLeave={(e) => { e.target.style.filter = "brightness(1)"; }}
            >
              {t(lang, "login")}
            </button>
          </div>
        </div>

        {/* Mascot Illustration — sized off the full viewport, not the text column, so it actually grows on wide screens */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: "100%", flex: 1, marginTop: "24px" }}>
          <div style={{ width: "clamp(220px, 28vw, 420px)", maxWidth: "90vw" }}>
            <Mascot src="/logos/Bondus_mascout_nobg.png" alt="BONDUS mascot" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Login({ dark, setDark, onBack, onLogin, onCreateInstead, lang = "en", setLang }) {
  const [method, setMethod] = useState("phone"); // "phone" | "email"
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [mascotState, setMascotState] = useState("idle");
  const shake = () => { setMascotState("sad"); setTimeout(() => setMascotState("idle"), 1200); };
  const switchMethod = (m) => { setMethod(m); setError(""); };
  const submit = () => {
    const creds = method === "phone" ? { phone: phone.trim() } : { email: email.trim(), password };
    if (method === "phone" ? !creds.phone : !creds.email || !creds.password) {
      setError(t(lang, method === "phone" ? "errEnterPhone" : "errEnterEmailPassword")); shake(); return;
    }
    if (!onLogin(creds)) { setError(t(lang, method === "phone" ? "errPhoneNotFound" : "errEmailNotFound")); shake(); }
  };
  return (
    <OnboardingLayout dark={dark} setDark={setDark} onBack={onBack} lang={lang} setLang={setLang} mascotState={mascotState}
      title={t(lang, "loginTitle")} description={t(lang, "loginDesc")}>
      <div className="flex gap-1 p-1 rounded-full eai-soft" style={{ width: "fit-content", marginBottom: 18 }}>
        {["phone", "email"].map((m) => (
          <button key={m} onClick={() => switchMethod(m)}
            className={`eai-focus text-xs font-semibold px-3.5 py-1.5 rounded-full ${lang === "km" ? "eai-km" : ""}`}
            style={{ background: method === m ? "var(--card)" : "transparent", color: method === m ? "var(--ink)" : "var(--muted)", boxShadow: method === m ? "var(--shadow)" : "none" }}>
            {t(lang, m === "phone" ? "loginWithPhone" : "loginWithEmail")}
          </button>
        ))}
      </div>

      {method === "phone" ? (
        <FormField label={t(lang, "phoneNumberLabel")} required error={error} lang={lang}>
          <input className="eai-ob-input eai-focus" placeholder="016556618" autoComplete="tel" inputMode="tel"
            value={phone} onChange={(e) => { setPhone(e.target.value); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && submit()} />
        </FormField>
      ) : (
        <div className="space-y-4">
          <FormField label={t(lang, "emailLabel")} required error={error} lang={lang}>
            <input type="email" className="eai-ob-input eai-focus" placeholder="e.g. sophea@gmail.com" autoComplete="email" inputMode="email"
              value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && submit()} />
          </FormField>
          <FormField label={t(lang, "passwordLabel")} required>
            <input type="password" className="eai-ob-input eai-focus" placeholder="••••••••" autoComplete="current-password"
              value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && submit()} />
          </FormField>
        </div>
      )}

      <PrimaryButton onClick={submit} className={`w-full mt-6 ${lang === "km" ? "eai-km" : ""}`}>{t(lang, "loginTitle")} <ChevronRight size={16} /></PrimaryButton>
      <p className={`text-center text-xs eai-muted mt-4 ${lang === "km" ? "eai-km" : ""}`}>
        {t(lang, "noAccountYet")}{" "}
        <button onClick={onCreateInstead} className="eai-focus font-semibold" style={{ color: "var(--primary)" }}>{t(lang, "createOne")}</button>
      </p>
    </OnboardingLayout>
  );
}

/* ════════════════════════ Registration ════════════════════════
   Step 0 asks "High School or University" first — the two paths never share content after that.
   High-school steps 1–3 (account details, academic track, learning preferences) are the original
   BAC II flow, unchanged. University steps 1–4 (account details, goals, field, year) build a
   separate `universityProfile` and never touch FIELD_SUBJECTS/BAC II content at all.
   `initialForm`/`initialStep` let App.jsx re-open this at a specific step — used when a student
   goes "Back" from the step-4 AssessmentChoice screen, so their answers aren't lost. */
function Register({ onComplete, dark, setDark, initialForm, initialStep, onBack, lang = "en", setLang }) {
  const [step, setStep] = useState(initialStep ?? 0);
  const [form, setForm] = useState(initialForm ?? {
    name: "", phone: "", email: "", password: "", age: "",
    educationLevel: null, // "highschool" | "university" — locked in once chosen at step 0
    // High-school (BAC II) fields:
    grade: "12", field: "", target: "A",
    targetExamYear: EXAM_YEARS[1], dailyMinutes: 60, targetUniversity: "",
    subjectsToImprove: [],
    // University fields:
    universityGoals: [], universityMajor: "", universityYear: "",
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const canFinish = form.name.trim() && form.field;
  const isUni = form.educationLevel === "university";

  // Unlimited multi-select (high-school "subjects to improve").
  const toggleImprove = (id) => setForm((f) => ({
    ...f, subjectsToImprove: f.subjectsToImprove.includes(id) ? f.subjectsToImprove.filter((x) => x !== id) : [...f.subjectsToImprove, id],
  }));
  const clearSubjects = () => setForm((f) => ({ ...f, subjectsToImprove: [] }));
  // University "goals" multi-select (unlimited).
  const toggleGoal = (id) => setForm((f) => ({
    ...f, universityGoals: f.universityGoals.includes(id) ? f.universityGoals.filter((x) => x !== id) : [...f.universityGoals, id],
  }));

  // ── Step 0: education level gate ──
  if (step === 0) {
    return (
      <OnboardingLayout dark={dark} setDark={setDark} onBack={onBack} lang={lang} setLang={setLang}
        title={t(lang, "eduLevelTitle")} description={t(lang, "eduLevelDesc")}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <OnboardingOptionCard icon={BookOpen} title={t(lang, "highSchoolOptTitle")} description={t(lang, "highSchoolOptDesc")}
            buttonLabel={t(lang, "continueWord")} onClick={() => { set("educationLevel", "highschool"); setStep(1); }} />
          <OnboardingOptionCard icon={GraduationCap} title={t(lang, "universityOptTitle")} description={t(lang, "universityOptDesc")}
            buttonLabel={t(lang, "continueWord")} onClick={() => { set("educationLevel", "university"); setLang?.("en"); setStep(1); }} />
        </div>
      </OnboardingLayout>
    );
  }

  // ── Step 1: account details (shared layout; grade/target only shown for high school) ──
  if (step === 1) {
    return (
      <OnboardingLayout dark={dark} setDark={setDark} step={1} stepLabels={isUni ? UNI_ONBOARDING_STEPS : undefined} stepLabelsKm={isUni ? UNI_ONBOARDING_STEPS_KM : undefined}
        onBack={() => setStep(0)} lang={lang} setLang={isUni ? undefined : setLang}
        title={t(lang, "createAccountTitle")} description={t(lang, "createAccountDesc")}>
        <div className="grid grid-cols-1 sm:grid-cols-2" style={{ columnGap: 16, rowGap: 22 }}>
          <FormField label={t(lang, "fullNameLabel")} required>
            <input className="eai-ob-input eai-focus" placeholder="e.g. Sophea Chan" autoComplete="name"
              value={form.name} onChange={(e) => set("name", e.target.value)} />
          </FormField>
          <FormField label={t(lang, "phoneNumberLabel")} required>
            <input className="eai-ob-input eai-focus" placeholder="016556618" autoComplete="tel" inputMode="tel"
              value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </FormField>
          <FormField label={t(lang, "emailLabel")}>
            <input type="email" className="eai-ob-input eai-focus" placeholder="e.g. sophea@gmail.com" autoComplete="email" inputMode="email"
              value={form.email} onChange={(e) => set("email", e.target.value)} />
          </FormField>
          <FormField label={t(lang, "passwordLabel")}>
            <input type="password" className="eai-ob-input eai-focus" placeholder="••••••••" autoComplete="new-password"
              value={form.password} onChange={(e) => set("password", e.target.value)} />
          </FormField>
          <FormField label={t(lang, "ageLabel")}>
            <input type="number" min="8" max="99" inputMode="numeric" className="eai-ob-input eai-focus" placeholder="18"
              value={form.age} onChange={(e) => set("age", e.target.value)} />
          </FormField>
          {!isUni && (
            <>
              <SelectField label={t(lang, "gradeLevelLabel")} value={form.grade} onChange={(e) => set("grade", e.target.value)}
                options={[{ value: "11", label: t(lang, "grade11") }, { value: "12", label: t(lang, "grade12") }]} />
              <SelectField label={t(lang, "targetGradeLabel")} value={form.target} onChange={(e) => set("target", e.target.value)}
                options={["A", "B", "C", "D", "E"].map((g) => ({ value: g, label: `${t(lang, "gradeWord")} ${g}` }))} />
            </>
          )}
        </div>

        <PrimaryButton onClick={() => setStep(2)} disabled={!form.name.trim()} className={`w-full mt-8 ${lang === "km" ? "eai-km" : ""}`}>
          {isUni ? t(lang, "continueWord") : t(lang, "continueToTrack")} <ChevronRight size={16} />
        </PrimaryButton>
      </OnboardingLayout>
    );
  }

  // ── University steps 2–4 ──
  if (isUni && step === 2) {
    return (
      <OnboardingLayout dark={dark} setDark={setDark} step={2} stepLabels={UNI_ONBOARDING_STEPS} stepLabelsKm={UNI_ONBOARDING_STEPS_KM}
        onBack={() => setStep(1)} lang={lang}
        title={t(lang, "uniGoalsTitle")} description={t(lang, "uniGoalsDesc")}>
        <div className="flex flex-wrap gap-2">
          {UNI_GOALS.map((g) => (
            <SubjectChip key={g.id} label={lang === "km" ? g.labelKm : g.label} selected={form.universityGoals.includes(g.id)} onToggle={() => toggleGoal(g.id)} lang={lang} />
          ))}
        </div>
        <p className="text-xs eai-muted mt-3">{t(lang, "uniGoalsWhyWeAsk")}</p>

        <PrimaryButton onClick={() => setStep(3)} disabled={form.universityGoals.length === 0} className={`w-full mt-8 ${lang === "km" ? "eai-km" : ""}`}>
          {t(lang, "continueWord")} <ChevronRight size={16} />
        </PrimaryButton>
      </OnboardingLayout>
    );
  }
  if (isUni && step === 3) {
    return (
      <OnboardingLayout dark={dark} setDark={setDark} step={3} stepLabels={UNI_ONBOARDING_STEPS} stepLabelsKm={UNI_ONBOARDING_STEPS_KM}
        onBack={() => setStep(2)} lang={lang}
        title={t(lang, "uniFieldTitle")} description={t(lang, "uniFieldDesc")}>
        <SelectField label={t(lang, "uniFieldTitle")} value={form.universityMajor} onChange={(e) => set("universityMajor", e.target.value)}
          options={[{ value: "", label: t(lang, "notSureYet") }, ...UNI_FIELDS.map((f) => ({ value: f.id, label: lang === "km" ? f.labelKm : f.label }))]} />

        <PrimaryButton onClick={() => setStep(4)} disabled={!form.universityMajor} className={`w-full mt-8 ${lang === "km" ? "eai-km" : ""}`}>
          {t(lang, "continueWord")} <ChevronRight size={16} />
        </PrimaryButton>
      </OnboardingLayout>
    );
  }
  if (isUni && step === 4) {
    return (
      <OnboardingLayout dark={dark} setDark={setDark} step={4} stepLabels={UNI_ONBOARDING_STEPS} stepLabelsKm={UNI_ONBOARDING_STEPS_KM}
        onBack={() => setStep(3)} lang={lang}
        title={t(lang, "uniYearTitle")} description={t(lang, "uniYearDesc")}>
        <SelectField label={t(lang, "uniYearTitle")} value={form.universityYear} onChange={(e) => set("universityYear", e.target.value)}
          options={UNI_YEARS.map((y) => ({ value: y.id, label: lang === "km" ? y.labelKm : y.label }))} />

        <PrimaryButton onClick={() => onComplete({ ...form, age: Number(form.age) || null })} disabled={!form.universityYear} className={`w-full mt-8 ${lang === "km" ? "eai-km" : ""}`}>
          {t(lang, "continueWord")} <ChevronRight size={16} />
        </PrimaryButton>
      </OnboardingLayout>
    );
  }

  // ── High-school step 2: academic track ──
  if (step === 2) {
    return (
      <OnboardingLayout dark={dark} setDark={setDark} step={2} onBack={() => setStep(1)} lang={lang} setLang={setLang}
        title={t(lang, "chooseTrackTitle")} description={t(lang, "chooseTrackDesc")}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" role="radiogroup" aria-label="Academic track">
          {Object.entries(FIELD_META).map(([key, meta]) => (
            <TrackCard key={key} meta={meta} subjects={FIELD_SUBJECTS[key]} selected={form.field === key} onSelect={() => set("field", key)} lang={lang} />
          ))}
        </div>

        <PrimaryButton onClick={() => setStep(3)} disabled={!canFinish} className={`w-full mt-8 ${lang === "km" ? "eai-km" : ""}`}>
          {t(lang, "continueWord")} <ChevronRight size={16} />
        </PrimaryButton>
      </OnboardingLayout>
    );
  }

  // ── High-school step 3: learning preferences ──
  return (
    <OnboardingLayout dark={dark} setDark={setDark} step={3} onBack={() => setStep(2)} lang={lang} setLang={setLang}
      title={t(lang, "personalizeTitle")} description={t(lang, "personalizeDesc")}>
      <div className="grid grid-cols-1 sm:grid-cols-2" style={{ columnGap: 16, rowGap: 22 }}>
        <SelectField label={t(lang, "targetExamYearLabel")} value={form.targetExamYear} onChange={(e) => set("targetExamYear", Number(e.target.value))}
          options={EXAM_YEARS.map((y) => ({ value: y, label: String(y) }))} />
        <SelectField label={t(lang, "dailyStudyTimeLabel")} value={form.dailyMinutes} onChange={(e) => set("dailyMinutes", Number(e.target.value))}
          options={STUDY_MINUTES.map((m) => ({ value: m, label: `${m} ${t(lang, "minutesWord")}` }))} />
        <SelectField label={t(lang, "targetUniLabel")} value={form.targetUniversity} onChange={(e) => set("targetUniversity", e.target.value)}
          options={[{ value: "", label: t(lang, "notSureYet") }, ...UNIS.map((u) => ({ value: u.abbr, label: `${u.abbr} — ${lang === "km" ? u.nKm : u.n}` }))]} />
      </div>

      <div className="mt-7">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <span className={`text-sm font-semibold ${lang === "km" ? "eai-km" : ""}`} style={{ color: "var(--ink)" }}>{t(lang, "subjectsImproveQ")}</span>
            <p className={`text-xs eai-muted mt-0.5 ${lang === "km" ? "eai-km" : ""}`}>{t(lang, "subjectsImproveSub")}</p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {form.subjectsToImprove.length === 0 ? (
              <button onClick={() => onComplete({ ...form, subjectsToImprove: [], age: Number(form.age) || null })}
                className={`eai-ob-text-action eai-focus ${lang === "km" ? "eai-km" : ""}`}>{t(lang, "skipStepWord")}</button>
            ) : (
              <button onClick={clearSubjects} className={`eai-ob-text-action eai-focus ${lang === "km" ? "eai-km" : ""}`}>{t(lang, "clearSelectionWord")}</button>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {FIELD_SUBJECTS[form.field].map((s) => {
            const id = subjectId(s);
            return <SubjectChip key={id} label={subjectLabel(s, lang)} selected={form.subjectsToImprove.includes(id)} onToggle={() => toggleImprove(id)} lang={lang} />;
          })}
        </div>
      </div>

      <PrimaryButton onClick={() => onComplete({ ...form, age: Number(form.age) || null })} className={`w-full mt-7 ${lang === "km" ? "eai-km" : ""}`}>
        {t(lang, "continueWord")} <ChevronRight size={16} />
      </PrimaryButton>
    </OnboardingLayout>
  );
}

/* ════════════════════════ Dashboard ════════════════════════ */
const PERSONALIZATION_PERKS = {
  en: ["Personalized study roadmap", "AI recommendations", "Subject mastery analysis", "Adaptive practice questions", "BAC II paper recommendations", "Progress tracking"],
  km: ["ផែនទីសិក្សាផ្ទាល់ខ្លួន", "អនុសាសន៍ AI", "ការវិភាគសមត្ថភាពមុខវិជ្ជា", "សំណួរអនុវត្តន៍សម្របតាមកម្រិត", "អនុសាសន៍ក្រដាសប្រឡង បាក់ឌុប", "តាមដានវឌ្ឍនភាព"],
};

function Dashboard({ p, go, plan, onTogglePlan, bonusXp = 0, onStartAssessment, onDismissBanner, lang = "en" }) {
  const xp = p.xp + bonusXp;
  const done = plan.filter((t) => t.done).length;
  const planPct = plan.length ? Math.round((done / plan.length) * 100) : 0;

  return (
    <div className="space-y-5 eai-rise">
      {/* Unlock-personalization banner — only for profiles that explicitly skipped the diagnostic
          (older saved profiles predate this flag and default to personalized, not undefined). */}
      {p.isPersonalized === false && !p.bannerDismissed && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
          className="eai-card p-5 relative" style={{ background: "var(--gold-soft)", border: "1px solid var(--gold)" }}>
          <button onClick={onDismissBanner} aria-label="Dismiss" className="eai-focus absolute top-4 right-4 eai-muted">
            <XCircle size={18} />
          </button>
          <div className="flex items-start gap-3 pr-8">
            <div className="grid place-items-center rounded-xl flex-shrink-0" style={{ width: 40, height: 40, background: "var(--card)" }}>
              <Target size={19} style={{ color: "var(--gold)" }} />
            </div>
            <div className="min-w-0 flex-1">
              <p className={`eai-display font-bold text-sm ${lang === "km" ? "eai-km" : ""}`}>🎯 {t(lang, "unlockBannerTitle")}</p>
              <p className={`text-xs eai-muted mt-1 ${lang === "km" ? "eai-km" : ""}`}>{t(lang, "unlockBannerDesc")}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 mt-2">
                {PERSONALIZATION_PERKS[lang === "km" ? "km" : "en"].map((f) => (
                  <span key={f} className={`text-xs eai-muted flex items-center gap-1.5 ${lang === "km" ? "eai-km" : ""}`}>
                    <CheckCircle2 size={12} style={{ color: "var(--gold)" }} /> {f}
                  </span>
                ))}
              </div>
              <button onClick={onStartAssessment} className={`eai-btn eai-glass eai-focus mt-3.5 px-4 py-2 text-xs ${lang === "km" ? "eai-km" : ""}`}>
                {t(lang, "startAssessment")}
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Hero */}
      <WelcomeHeroCard
        userName={p.name} greeting="សួស្តី" message={t(lang, "heroMessage")}
        onStartPlan={() => go("practice")} onAskCoach={() => go("coach")} lang={lang}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Daily plan */}
        <div className="eai-card p-6 lg:col-span-2">
          <CardHead title={t(lang, "dashTodayPlan")} kh={lang === "km" ? null : "ផែនការសិក្សាថ្ងៃនេះ"}
            action={<span className="text-xs font-bold eai-display" style={{ color: "var(--jade)" }}>{done}/{plan.length} {t(lang, "dashDone")}</span>} />
          <div className="h-1.5 rounded-full eai-soft mb-4 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${planPct}%`, background: "var(--jade)", transition: "width .3s" }} />
          </div>
          <div className="space-y-2.5">
            {plan.map((t) => (
              <button key={t.id} onClick={() => onTogglePlan(t.id)} className="eai-focus w-full flex items-center gap-3 p-3 rounded-2xl text-left eai-nav border" style={{ borderColor: "var(--line)" }}>
                {t.done ? <CheckCircle2 size={22} style={{ color: "var(--jade)", flexShrink: 0 }} /> : <Circle size={22} className="eai-muted" style={{ flexShrink: 0 }} />}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate" style={{ textDecoration: t.done ? "line-through" : "none", opacity: t.done ? 0.5 : 1 }}>{t.task}</p>
                  <p className="text-xs eai-muted">{subjectLabel(t.s, lang)} · {t.why}</p>
                </div>
                <span className="text-xs font-bold eai-muted flex items-center gap-1 flex-shrink-0"><Clock size={13} /> {t.min}m</span>
              </button>
            ))}
          </div>
        </div>

        {/* Streak + XP + Level */}
        <div className="eai-card p-6 flex flex-col gap-5 justify-center">
          <div className="flex items-center gap-4">
            <div className="grid place-items-center rounded-2xl" style={{ width: 60, height: 60, background: "var(--ember-soft)" }}>
              <Flame size={30} style={{ color: "var(--ember)" }} />
            </div>
            <div>
              <p className="eai-display text-3xl font-extrabold leading-none">{p.streak}</p>
              <p className={`text-xs eai-muted mt-1 ${lang === "km" ? "eai-km" : ""}`}>{t(lang, "dashStreak")}</p>
            </div>
          </div>
          <div className="h-px eai-soft" />
          <div className="flex items-center gap-4">
            <Ring value={Math.round((xp / p.xpToNext) * 100)} size={60} color="var(--gold)">
              <span className="eai-display font-bold text-sm">{p.level}</span>
            </Ring>
            <div className="flex-1">
              <p className="text-sm font-bold eai-display flex items-center gap-1.5"><Zap size={15} style={{ color: "var(--gold)" }} /> {xp.toLocaleString()} XP</p>
              <p className={`text-xs eai-muted mt-0.5 ${lang === "km" ? "eai-km" : ""}`}>{p.xpToNext - xp} XP {t(lang, "toLevel")} {p.level + 1}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recommended next lesson */}
      <RecommendedLessonCard
        subject={subjectLabel(p.recommendedLesson.subject, lang)} title={topicLabel(p.recommendedLesson.topic, lang)}
        duration={lang === "km" ? "១២ នាទី" : "12 min"} description={t(lang, "targetsWeakest")} xp={80}
        imageUrl="/decor/math-formulas.svg" onStart={() => go("practice")} lang={lang}
      />

      {/* Explore more */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Target, label: t(lang, "navPractice"), desc: t(lang, "exploreSharpen"), tab: "practice", c: "var(--jade)" },
          { icon: GraduationCap, label: t(lang, "navUniversities"), desc: t(lang, "exploreBrowseMajors"), tab: "universities", c: "var(--primary)" },
          { icon: BookOpen, label: t(lang, "browseTitle"), desc: t(lang, "exploreBrowsePast"), tab: "browse", c: "var(--ember)" },
          { icon: BarChart3, label: t(lang, "navProgress"), desc: t(lang, "exploreStats"), tab: "progress", c: "var(--gold)" },
        ].map((c) => (
          <button key={c.label} onClick={() => go(c.tab)} className="eai-card eai-tile eai-focus p-5 text-left flex items-center gap-3.5">
            <div className="grid place-items-center rounded-xl flex-shrink-0" style={{ width: 40, height: 40, background: "var(--bg-soft)" }}>
              <c.icon size={19} style={{ color: c.c }} />
            </div>
            <div className="min-w-0">
              <p className={`eai-display font-bold text-sm ${lang === "km" ? "eai-km" : ""}`}>{c.label}</p>
              <p className={`text-xs eai-muted mt-0.5 ${lang === "km" ? "eai-km" : ""}`}>{c.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════ Browse (field-aware) ════════════════════════ */
/* Official exam papers, keyed by "Subject-Track-Year" (track = p.field: "science" or
   "social_science") since the same subject differs by track — e.g. Mathematics is a 125-mark,
   150-minute Science paper but a 75-mark Social Science one, so a Social Science student must
   never be shown the Science paper under a plain "Mathematics-Year" key. Only entries present
   in EXAM_PAPER_PDFS or EXAM_PAPER_IMAGES get a working View button — everything else stays a
   no-op (shown as "Coming soon") until its pages are added.

   EXAM_PAPER_PDFS holds the real source document itself (embedded via <iframe>, native browser
   PDF viewer — full quality, zoomable, no re-rendering step). Prefer this format for anything
   newly added. EXAM_PAPER_IMAGES is the older per-page-JPG format, kept only for entries that
   predate the PDF-embed approach.

   Every entry below is a real official paper (question paper + answer key where the source
   provides one) — most of this set (2014–2019, 2021, 2022, both tracks, nearly every subject)
   comes straight from HELMAB/bacii's own per-subject PDF archive on GitHub, already split one
   file per subject/year/track so no page-extraction was needed. "Mathematics-science-2017" is
   an exception, extracted page-for-page from a compiled exam archive sourced from
   document4khmer.wordpress.com's Bac-tagged posts, predating the bulk import.
   "Mathematics-science-2023/2024/2025" are likewise extracted page-for-page (question paper +
   full worked solutions), from a 2014–2025 compiled Math (Science track) booklet by ស៊ុន ពន្លឺ
   supplied directly by the user. 2020 has no papers in either source (Cambodia's national exam
   was cancelled that year), and 2026 isn't published yet anywhere either source could find —
   that one stays "Coming soon" until sourced. Every other subject/track still has no papers for
   2023–2026 for the same reason. */
const EXAM_PAPER_PDFS = {
  "Mathematics-science-2017": "/exams/science-math-2017.pdf",
  "Mathematics-science-2023": "/exams/science-math-2023.pdf",
  "Mathematics-science-2024": "/exams/science-math-2024.pdf",
  "Mathematics-science-2025": "/exams/science-math-2025.pdf",
  "Biology-science-2014": "/exams/science-biology-2014.pdf",
  "Biology-science-2015": "/exams/science-biology-2015.pdf",
  "Biology-science-2016": "/exams/science-biology-2016.pdf",
  "Biology-science-2017": "/exams/science-biology-2017.pdf",
  "Biology-science-2018": "/exams/science-biology-2018.pdf",
  "Biology-science-2019": "/exams/science-biology-2019.pdf",
  "Biology-science-2021": "/exams/science-biology-2021.pdf",
  "Biology-science-2022": "/exams/science-biology-2022.pdf",
  "Chemistry-science-2014": "/exams/science-chemistry-2014.pdf",
  "Chemistry-science-2015": "/exams/science-chemistry-2015.pdf",
  "Chemistry-science-2016": "/exams/science-chemistry-2016.pdf",
  "Chemistry-science-2017": "/exams/science-chemistry-2017.pdf",
  "Chemistry-science-2018": "/exams/science-chemistry-2018.pdf",
  "Chemistry-science-2019": "/exams/science-chemistry-2019.pdf",
  "Chemistry-science-2021": "/exams/science-chemistry-2021.pdf",
  "Chemistry-science-2022": "/exams/science-chemistry-2022.pdf",
  "Earth Science-social_science-2016": "/exams/social-earth-science-2016.pdf",
  "Earth Science-social_science-2017": "/exams/social-earth-science-2017.pdf",
  "Earth Science-social_science-2018": "/exams/social-earth-science-2018.pdf",
  "Earth Science-social_science-2019": "/exams/social-earth-science-2019.pdf",
  "Earth Science-social_science-2021": "/exams/social-earth-science-2021.pdf",
  "Earth Science-social_science-2022": "/exams/social-earth-science-2022.pdf",
  "English-science-2014": "/exams/science-english-2014.pdf",
  "English-science-2015": "/exams/science-english-2015.pdf",
  "English-science-2016": "/exams/science-english-2016.pdf",
  "English-science-2017": "/exams/science-english-2017.pdf",
  "English-science-2018": "/exams/science-english-2018.pdf",
  "English-science-2019": "/exams/science-english-2019.pdf",
  "English-science-2021": "/exams/science-english-2021.pdf",
  "English-science-2022": "/exams/science-english-2022.pdf",
  "English-social_science-2014": "/exams/social-english-2014.pdf",
  "English-social_science-2015": "/exams/social-english-2015.pdf",
  "English-social_science-2016": "/exams/social-english-2016.pdf",
  "English-social_science-2017": "/exams/social-english-2017.pdf",
  "English-social_science-2018": "/exams/social-english-2018.pdf",
  "English-social_science-2019": "/exams/social-english-2019.pdf",
  "English-social_science-2021": "/exams/social-english-2021.pdf",
  "English-social_science-2022": "/exams/social-english-2022.pdf",
  "French-science-2014": "/exams/science-french-2014.pdf",
  "French-science-2015": "/exams/science-french-2015.pdf",
  "French-science-2016": "/exams/science-french-2016.pdf",
  "French-science-2017": "/exams/science-french-2017.pdf",
  "French-social_science-2014": "/exams/social-french-2014.pdf",
  "French-social_science-2015": "/exams/social-french-2015.pdf",
  "French-social_science-2016": "/exams/social-french-2016.pdf",
  "French-social_science-2017": "/exams/social-french-2017.pdf",
  "French-social_science-2018": "/exams/social-french-2018.pdf",
  "French-social_science-2019": "/exams/social-french-2019.pdf",
  "French-social_science-2021": "/exams/social-french-2021.pdf",
  "Geography-social_science-2014": "/exams/social-geography-2014.pdf",
  "Geography-social_science-2015": "/exams/social-geography-2015.pdf",
  "Geography-social_science-2016": "/exams/social-geography-2016.pdf",
  "Geography-social_science-2017": "/exams/social-geography-2017.pdf",
  "Geography-social_science-2019": "/exams/social-geography-2019.pdf",
  "Geography-social_science-2021": "/exams/social-geography-2021.pdf",
  "Geography-social_science-2022": "/exams/social-geography-2022.pdf",
  "History-science-2014": "/exams/science-history-2014.pdf",
  "History-science-2015": "/exams/science-history-2015.pdf",
  "History-science-2016": "/exams/science-history-2016.pdf",
  "History-science-2017": "/exams/science-history-2017.pdf",
  "History-science-2018": "/exams/science-history-2018.pdf",
  "History-science-2019": "/exams/science-history-2019.pdf",
  "History-science-2021": "/exams/science-history-2021.pdf",
  "History-science-2022": "/exams/science-history-2022.pdf",
  "History-social_science-2014": "/exams/social-history-2014.pdf",
  "History-social_science-2015": "/exams/social-history-2015.pdf",
  "History-social_science-2016": "/exams/social-history-2016.pdf",
  "History-social_science-2017": "/exams/social-history-2017.pdf",
  "History-social_science-2018": "/exams/social-history-2018.pdf",
  "History-social_science-2019": "/exams/social-history-2019.pdf",
  "History-social_science-2021": "/exams/social-history-2021.pdf",
  "History-social_science-2022": "/exams/social-history-2022.pdf",
  "Khmer Literature-science-2014": "/exams/science-literature-2014.pdf",
  "Khmer Literature-science-2015": "/exams/science-literature-2015.pdf",
  "Khmer Literature-science-2016": "/exams/science-literature-2016.pdf",
  "Khmer Literature-science-2017": "/exams/science-literature-2017.pdf",
  "Khmer Literature-science-2018": "/exams/science-literature-2018.pdf",
  "Khmer Literature-science-2019": "/exams/science-literature-2019.pdf",
  "Khmer Literature-science-2021": "/exams/science-literature-2021.pdf",
  "Khmer Literature-science-2022": "/exams/science-literature-2022.pdf",
  "Khmer Literature-social_science-2014": "/exams/social-literature-2014.pdf",
  "Khmer Literature-social_science-2015": "/exams/social-literature-2015.pdf",
  "Khmer Literature-social_science-2016": "/exams/social-literature-2016.pdf",
  "Khmer Literature-social_science-2017": "/exams/social-literature-2017.pdf",
  "Khmer Literature-social_science-2018": "/exams/social-literature-2018.pdf",
  "Khmer Literature-social_science-2019": "/exams/social-literature-2019.pdf",
  "Khmer Literature-social_science-2021": "/exams/social-literature-2021.pdf",
  "Khmer Literature-social_science-2022": "/exams/social-literature-2022.pdf",
  "Mathematics-science-2014": "/exams/science-math-2014.pdf",
  "Mathematics-science-2015": "/exams/science-math-2015.pdf",
  "Mathematics-science-2016": "/exams/science-math-2016.pdf",
  "Mathematics-science-2018": "/exams/science-math-2018.pdf",
  "Mathematics-science-2019": "/exams/science-math-2019.pdf",
  "Mathematics-science-2021": "/exams/science-math-2021.pdf",
  "Mathematics-science-2022": "/exams/science-math-2022.pdf",
  "Mathematics-social_science-2014": "/exams/social-math-2014.pdf",
  "Mathematics-social_science-2015": "/exams/social-math-2015.pdf",
  "Mathematics-social_science-2016": "/exams/social-math-2016.pdf",
  "Mathematics-social_science-2017": "/exams/social-math-2017.pdf",
  "Mathematics-social_science-2018": "/exams/social-math-2018.pdf",
  "Mathematics-social_science-2019": "/exams/social-math-2019.pdf",
  "Mathematics-social_science-2021": "/exams/social-math-2021.pdf",
  "Mathematics-social_science-2022": "/exams/social-math-2022.pdf",
  "Morality-social_science-2014": "/exams/social-morality-2014.pdf",
  "Morality-social_science-2015": "/exams/social-morality-2015.pdf",
  "Morality-social_science-2016": "/exams/social-morality-2016.pdf",
  "Morality-social_science-2017": "/exams/social-morality-2017.pdf",
  "Morality-social_science-2018": "/exams/social-morality-2018.pdf",
  "Morality-social_science-2019": "/exams/social-morality-2019.pdf",
  "Morality-social_science-2021": "/exams/social-morality-2021.pdf",
  "Morality-social_science-2022": "/exams/social-morality-2022.pdf",
  "Physics-science-2014": "/exams/science-physics-2014.pdf",
  "Physics-science-2015": "/exams/science-physics-2015.pdf",
  "Physics-science-2016": "/exams/science-physics-2016.pdf",
  "Physics-science-2017": "/exams/science-physics-2017.pdf",
  "Physics-science-2018": "/exams/science-physics-2018.pdf",
  "Physics-science-2019": "/exams/science-physics-2019.pdf",
  "Physics-science-2021": "/exams/science-physics-2021.pdf",
  "Physics-science-2022": "/exams/science-physics-2022.pdf",
};
const EXAM_PAPER_IMAGES = {};

function ExamPaperPage({ paper, onBack, lang = "en" }) {
  // Localized on every render from the raw subject/year, not baked into a string at click-time —
  // otherwise toggling language while already on this page would leave the title stuck in
  // whichever language was active the moment "View" was clicked.
  const title = `${subjectLabel(paper.subject, lang)} · ${bacIILabel(lang)} ${localizeNum(paper.year, lang)}`;
  return (
    <div className="space-y-5 eai-rise">
      <button onClick={onBack} className={`eai-focus flex items-center gap-1 text-sm eai-muted ${lang === "km" ? "eai-km" : ""}`}>
        <ChevronLeft size={16} /> {t(lang, "allExamsWord")}
      </button>
      <div>
        <h2 className={`eai-display text-2xl font-extrabold ${lang === "km" ? "eai-km" : ""}`}>{title}</h2>
        <p className={`eai-muted text-sm mt-1 ${lang === "km" ? "eai-km" : ""}`}>{paper.pdf ? t(lang, "pdfPaperDesc") : t(lang, "imagePaperDesc")}</p>
      </div>
      {paper.pdf ? (
        <iframe src={`${paper.pdf}#view=FitH`} title={title} className="w-full block" style={{ height: "88vh", border: "none" }} />
      ) : (
        <div className="eai-card p-4 sm:p-6">
          <div className="space-y-4">
            {paper.images.map((src, i) => (
              <img key={i} src={src} alt={`${title} — page ${i + 1}`} className="w-full rounded-xl border" style={{ borderColor: "var(--line)", display: "block" }} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* Official BAC II full-mark scale per subject — differs by track (e.g. Mathematics is 125 for
   Science but 75 for Social Science, so this must be keyed by field, not just subject name).
   A subject/track combo not listed here (e.g. French, in either track) falls back to 100. */
const SUBJECT_FULL_MARKS = {
  science: {
    Mathematics: 125, Physics: 75, Chemistry: 75, Biology: 75,
    History: 50, English: 50, "Khmer Literature": 75,
  },
  social_science: {
    "Khmer Literature": 125, Mathematics: 75, "Earth Science": 50,
    History: 75, Geography: 75, Morality: 75, English: 50,
  },
};

/* Official BAC II exam duration (minutes) per subject — also track-specific. Any subject/track
   combo not listed here (e.g. French, or Science-track subjects not yet given) falls back to 180. */
const SUBJECT_DURATION_MIN = {
  science: {
    Mathematics: 150, Physics: 90, Chemistry: 90, Biology: 90,
    "Khmer Literature": 90, History: 60, English: 60,
  },
  social_science: {
    "Khmer Literature": 150, Mathematics: 90, "Earth Science": 60,
    History: 90, Geography: 90, Morality: 90, English: 60,
  },
};

function Browse({ p, lang = "en" }) {
  const [year, setYear] = useState(2023);
  const [viewingPaper, setViewingPaper] = useState(null);
  if (viewingPaper) return <ExamPaperPage paper={viewingPaper} onBack={() => setViewingPaper(null)} lang={lang} />;
  const diffLabel = (d) => (lang === "km" ? { Easy: "ងាយ", Medium: "មធ្យម", Hard: "ពិបាក" }[d] : d);
  return (
    <div className="space-y-5 eai-rise">
      <div>
        <h2 className={`eai-display text-2xl font-extrabold ${lang === "km" ? "eai-km" : ""}`}>{t(lang, "browseTitle")}</h2>
        <p className={`eai-muted text-sm mt-1 ${lang === "km" ? "eai-km" : ""}`}>
          {p.grade === "university" ? t(lang, "universityEntrance") : bacIILabel(lang)} · {lang === "km" ? `${t(lang, "trackWord")}${FIELD_META[p.field].km}` : `${FIELD_META[p.field].label} ${t(lang, "trackWord")}`} · {t(lang, "officialPapers")} {localizeNum(2010, lang)}–{localizeNum(2026, lang)}
        </p>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 eai-scroll">
        {YEARS.map((y) => (
          <button key={y} onClick={() => setYear(y)} className="eai-btn eai-focus px-4 py-2 text-sm flex-shrink-0"
            style={{ background: y === year ? "var(--primary)" : "var(--card)", color: y === year ? "#fff" : "var(--ink)", border: y === year ? "none" : "1px solid var(--line)" }}>
            {localizeNum(y, lang)}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...p.subjects].sort((a, b) => (a.tag === "weak" ? -1 : b.tag === "weak" ? 1 : 0)).map((sub) => {
          const diff = levelToDifficulty(sub.level);
          const dc = diff === "Hard" ? "var(--ember)" : diff === "Medium" ? "var(--gold)" : "var(--jade)";
          const key = `${sub.s}-${p.field}-${year}`;
          const pdf = EXAM_PAPER_PDFS[key];
          const images = EXAM_PAPER_IMAGES[key];
          const hasPaper = Boolean(pdf || images);
          return (
            <div key={sub.s} className="eai-card eai-tile p-5">
              <div className="flex items-start justify-between">
                <div className="grid place-items-center rounded-xl" style={{ width: 40, height: 40, background: "var(--primary-soft)" }}>
                  <BookOpen size={19} style={{ color: "var(--primary)" }} />
                </div>
                {sub.tag === "weak"
                  ? <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${lang === "km" ? "eai-km" : ""}`} style={{ background: "var(--ember-soft)", color: "var(--ember)" }}>{t(lang, "recommendedForYou")}</span>
                  : <Bookmark size={16} className="eai-muted" />}
              </div>
              <h3 className={`eai-display font-bold mt-3 ${lang === "km" ? "eai-km" : ""}`}>{subjectLabel(sub.s, lang)}</h3>
              <p className="text-xs eai-muted mt-0.5">{bacIILabel(lang)} {localizeNum(year, lang)} · {localizeNum(SUBJECT_DURATION_MIN[p.field]?.[sub.s] ?? 180, lang)} {t(lang, "minAbbrev")} · {localizeNum(SUBJECT_FULL_MARKS[p.field]?.[sub.s] ?? 100, lang)} {t(lang, "marksWord")}</p>
              <div className="flex items-center gap-2 mt-3">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: "var(--bg-soft)", color: dc }}>{diffLabel(diff)}</span>
                <span className={`text-xs eai-muted ${lang === "km" ? "eai-km" : ""}`}>{sub.m != null ? `${t(lang, "matchesLevel")} ${lang === "km" ? levelLabel(sub.level, lang) : sub.level.toLowerCase()}` : t(lang, "answerSheetReady")}</span>
              </div>
              <div className="flex gap-2 mt-4">
                {hasPaper ? (
                  <button
                    onClick={() => setViewingPaper({ subject: sub.s, year, pdf, images })}
                    className={`eai-btn eai-glass eai-focus flex-1 text-sm py-2 flex items-center justify-center gap-1.5 ${lang === "km" ? "eai-km" : ""}`}>
                    <Eye size={14} /> {t(lang, "viewWord")}
                  </button>
                ) : (
                  <button disabled title={t(lang, "comingSoon")}
                    className={`eai-btn flex-1 text-sm py-2 flex items-center justify-center gap-1.5 eai-soft cursor-not-allowed ${lang === "km" ? "eai-km" : ""}`}
                    style={{ color: "var(--muted)" }}>
                    <Eye size={14} /> {t(lang, "comingSoon")}
                  </button>
                )}
                {pdf ? (
                  <a href={pdf} download className="eai-btn eai-focus text-sm py-2 px-3 eai-soft flex items-center justify-center" style={{ color: "var(--ink)" }}><Download size={14} /></a>
                ) : (
                  <button disabled={!images} className="eai-btn eai-focus text-sm py-2 px-3 eai-soft flex items-center justify-center disabled:cursor-not-allowed disabled:opacity-50" style={{ color: "var(--ink)" }}><Download size={14} /></button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ════════════════════════ Practice — interactive exercises ════════════════════════ */
/* Exercise bank. Each subject maps to: [topic, difficulty, prompt, options, answer, explanation, formula]. */
/* Each exercise carries an optional *Km field alongside its English counterpart. `topic` stays
   the single canonical (always-English) key used everywhere mastery is tracked/matched
   (topicMastery, SUBJECT_TOPICS, weak/strong lookups) — only topicKm is used for display, via
   topicLabel() below, so switching languages never fragments a student's progress data.
   English/French exercises deliberately keep their options/answer in the target language being
   tested (translating "goes/go/going/gone" into Khmer would defeat the point of an English
   grammar question) — only the surrounding instruction and explanation are localized. */
const RAW_EXERCISES = {
  Mathematics: [
    { topic: "Calculus", topicKm: "ដេរីវេ", difficulty: "Medium",
      prompt: "Find d/dx (3x² + 2x).", promptKm: "រកដេរីវេ d/dx (3x² + 2x)។",
      options: ["6x + 2", "3x + 2", "6x", "x²"], answer: "6x + 2",
      explanation: "Differentiate term by term: d/dx(3x²) = 6x and d/dx(2x) = 2, so the result is 6x + 2.",
      explanationKm: "ដេរីវេនីមួយៗតាមលក្ខខណ្ឌ៖ d/dx(3x²) = 6x និង d/dx(2x) = 2 ដូច្នេះលទ្ធផលគឺ 6x + 2។",
      formula: "Power rule: d/dx[xⁿ] = n·xⁿ⁻¹", formulaKm: "ច្បាប់និទស្សន្ត៖ d/dx[xⁿ] = n·xⁿ⁻¹" },
    { topic: "Algebra", topicKm: "ពិជគណិត", difficulty: "Medium",
      prompt: "Solve x² − 5x + 6 = 0.", promptKm: "ដោះស្រាយ x² − 5x + 6 = 0។",
      options: ["x = 2, 3", "x = 1, 6", "x = −2, −3", "x = 2, −3"], answer: "x = 2, 3",
      explanation: "Factor into (x − 2)(x − 3) = 0, so x = 2 or x = 3.",
      explanationKm: "បំបែកជា (x − 2)(x − 3) = 0 ដូច្នេះ x = 2 ឬ x = 3។",
      formula: "Quadratic: x = (−b ± √(b²−4ac)) / 2a, or factor the trinomial",
      formulaKm: "សមីការការេ៖ x = (−b ± √(b²−4ac)) / 2a ឬបំបែកសមីការបីលក្ខខណ្ឌ" },
    { topic: "Geometry", topicKm: "ធរណីមាត្រ", difficulty: "Easy",
      prompt: "Area of a circle with radius 7 (use π = 22/7)?", promptKm: "ផ្ទៃក្រឡានៃរង្វង់ដែលមានកាំ ៧ (ប្រើ π = 22/7)?",
      options: ["154", "44", "49", "22"], answer: "154",
      explanation: "A = πr² = (22/7) × 7² = (22/7) × 49 = 154.", explanationKm: "A = πr² = (22/7) × 7² = (22/7) × 49 = 154។",
      formula: "Area of a circle: A = πr²", formulaKm: "ផ្ទៃក្រឡារង្វង់៖ A = πr²" },
    { topic: "Trigonometry", topicKm: "ត្រីកោណមាត្រ", difficulty: "Easy",
      prompt: "What is sin(30°)?", promptKm: "តើ sin(30°) ស្មើនឹងប៉ុន្មាន?",
      options: ["1/2", "√3/2", "1", "0"], answer: "1/2",
      explanation: "sin(30°) is a standard angle value equal to 1/2.", explanationKm: "sin(30°) ជាតម្លៃមុំស្តង់ដារដែលស្មើនឹង 1/2។",
      formula: "Standard angles: sin(30°)=1/2, sin(45°)=√2/2, sin(60°)=√3/2", formulaKm: "មុំស្តង់ដារ៖ sin(30°)=1/2, sin(45°)=√2/2, sin(60°)=√3/2" },
    { topic: "Calculus", topicKm: "ដេរីវេ", difficulty: "Hard",
      prompt: "Find ∫4x³ dx.", promptKm: "រកអាំងតេក្រាល ∫4x³ dx។",
      options: ["x⁴ + C", "4x⁴ + C", "12x² + C", "x⁴/4 + C"], answer: "x⁴ + C",
      explanation: "∫4x³ dx = 4·(x⁴/4) + C = x⁴ + C.", explanationKm: "∫4x³ dx = 4·(x⁴/4) + C = x⁴ + C។",
      formula: "Power rule for integration: ∫xⁿ dx = xⁿ⁺¹/(n+1) + C", formulaKm: "ច្បាប់និទស្សន្តសម្រាប់អាំងតេក្រាល៖ ∫xⁿ dx = xⁿ⁺¹/(n+1) + C" },
    { topic: "Algebra", topicKm: "ពិជគណិត", difficulty: "Hard",
      prompt: "If log₂(x) = 5, what is x?", promptKm: "ប្រសិនបើ log₂(x) = 5 តើ x ស្មើនឹងប៉ុន្មាន?",
      options: ["32", "10", "25", "16"], answer: "32",
      explanation: "log₂(x) = 5 means x = 2⁵ = 32.", explanationKm: "log₂(x) = 5 មានន័យថា x = 2⁵ = 32។",
      formula: "Definition: logₐ(x) = b ⟺ x = aᵇ", formulaKm: "និយមន័យ៖ logₐ(x) = b ⟺ x = aᵇ" },
    { topic: "Statistics", topicKm: "ស្ថិតិ", difficulty: "Medium",
      prompt: "Find the mean of 4, 8, 6, 10, 12.", promptKm: "រកមធ្យមភាគនៃ 4, 8, 6, 10, 12។",
      options: ["8", "6", "10", "9"], answer: "8",
      explanation: "Mean = (4+8+6+10+12) ÷ 5 = 40 ÷ 5 = 8.", explanationKm: "មធ្យមភាគ = (4+8+6+10+12) ÷ 5 = 40 ÷ 5 = 8។",
      formula: "Mean = sum of values ÷ number of values", formulaKm: "មធ្យមភាគ = ផលបូកតម្លៃ ÷ ចំនួនតម្លៃ" },
  ],
  Physics: [
    { topic: "Kinematics", topicKm: "ចលនវិទ្យា", difficulty: "Easy",
      prompt: "A car starts from rest and accelerates at 2 m/s² for 5 s. Final velocity?",
      promptKm: "ឡានមួយចាប់ផ្តើមពីស្ថានភាពឈប់ ហើយបង្កើនល្បឿនក្នុងអត្រា 2 m/s² រយៈពេល 5 វិនាទី។ តើល្បឿនចុងក្រោយប៉ុន្មាន?",
      options: ["10 m/s", "7 m/s", "2.5 m/s", "25 m/s"], answer: "10 m/s",
      explanation: "Starting from rest u = 0, so v = 0 + (2)(5) = 10 m/s.", explanationKm: "ចាប់ផ្តើមពីស្ថានភាពឈប់ u = 0 ដូច្នេះ v = 0 + (2)(5) = 10 m/s។",
      formula: "v = u + at", formulaKm: "v = u + at" },
    { topic: "Dynamics", topicKm: "ថាមវិទ្យា", difficulty: "Easy",
      prompt: "Force needed to accelerate a 10 kg mass at 3 m/s²?", promptKm: "តើត្រូវការកម្លាំងប៉ុន្មាន ដើម្បីបង្កើនល្បឿនម៉ាស់ 10 kg ក្នុងអត្រា 3 m/s²?",
      options: ["30 N", "13 N", "3.3 N", "300 N"], answer: "30 N",
      explanation: "Force is mass times acceleration: F = 10 × 3 = 30 N.", explanationKm: "កម្លាំង = ម៉ាស់ × សំទុះ៖ F = 10 × 3 = 30 N។",
      formula: "Newton's 2nd law: F = ma", formulaKm: "ច្បាប់ទី២របស់ញូតុន៖ F = ma" },
    { topic: "Energy", topicKm: "ថាមពល", difficulty: "Medium",
      prompt: "Kinetic energy of a 2 kg object moving at 4 m/s?", promptKm: "តើថាមពលស៊ីនេទិចនៃវត្ថុមួយមានម៉ាស់ 2 kg ដែលកំពុងផ្លាស់ទីក្នុងល្បឿន 4 m/s មានប៉ុន្មាន?",
      options: ["16 J", "8 J", "32 J", "4 J"], answer: "16 J",
      explanation: "KE = ½ × 2 × 4² = ½ × 2 × 16 = 16 J.", explanationKm: "KE = ½ × 2 × 4² = ½ × 2 × 16 = 16 J។",
      formula: "Kinetic energy: KE = ½mv²", formulaKm: "ថាមពលស៊ីនេទិច៖ KE = ½mv²" },
  ],
  Chemistry: [
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
  ],
  Biology: [
    { topic: "Root and stem function", topicKm: "តួនាទីឬស និងដើម", difficulty: "Easy",
      prompt: "In a flowering plant, what is the main function of the roots?", promptKm: "តើឬសរបស់រុក្ខជាតិមានផ្កាមានតួនាទីចម្បងអ្វី?",
      options: ["Anchor the plant and absorb water and minerals from the soil", "Carry out photosynthesis", "Produce pollen", "Store flowers"], answer: "Anchor the plant and absorb water and minerals from the soil",
      optionsKm: ["ចងភ្ជាប់រុក្ខជាតិទៅនឹងដី និងស្រូបយកទឹក និងអំបិលខនិជពីដី", "ធ្វើសំយោគពន្លឺ", "ផលិតលំអង", "ផ្ទុកផ្កា"], answerKm: "ចងភ្ជាប់រុក្ខជាតិទៅនឹងដី និងស្រូបយកទឹក និងអំបិលខនិជពីដី",
      explanation: "Roots anchor the plant in the soil and absorb water and dissolved minerals, which travel up through the stem to the leaves.", explanationKm: "ឬសចងភ្ជាប់រុក្ខជាតិទៅនឹងដី និងស្រូបយកទឹក និងអំបិលខនិជរលាយ ដែលឡើងតាមដើមទៅដល់សន្លឹក។",
      formula: "Root = anchor + absorb; stem = transport + support", formulaKm: "ឬស = ចងភ្ជាប់ + ស្រូប; ដើម = ដឹកជញ្ជូន + ទ្រទ្រង់",
      chapter: "Flowering Plant Reproduction", chapterKm: "ការបន្តពូជរុក្ខជាតិមានផ្កា" },
    { topic: "Xylem and phloem", topicKm: "សរសៃឈើ និងសរសៃស្បែក", difficulty: "Medium",
      prompt: "Which plant tissue carries water and dissolved minerals from the roots up to the leaves?", promptKm: "តើជាលិការុក្ខជាតិមួយណាដឹកនាំទឹក និងអំបិលខនិជពីឬសឡើងទៅសន្លឹក?",
      options: ["Xylem", "Phloem", "Epidermis", "Cortex"], answer: "Xylem",
      optionsKm: ["សរសៃឈើ (Xylem)", "សរសៃស្បែក (Phloem)", "ស្បែកក្រៅ", "ស្រទាប់ចំបើង"], answerKm: "សរសៃឈើ (Xylem)",
      explanation: "Xylem carries water and minerals upward from the roots, while phloem carries food made by photosynthesis to cells that don't photosynthesize.", explanationKm: "សរសៃឈើដឹកនាំទឹក និងអំបិលខនិជពីឬសឡើងលើ ចំណែកឯសរសៃស្បែកដឹកនាំអាហារដែលផលិតដោយសំយោគពន្លឺទៅកោសិកាដែលមិនធ្វើសំយោគពន្លឺ។",
      formula: "Xylem: water up; Phloem: food to all cells", formulaKm: "សរសៃឈើ៖ ទឹកឡើងលើ; សរសៃស្បែក៖ អាហារទៅគ្រប់កោសិកា",
      chapter: "Flowering Plant Reproduction", chapterKm: "ការបន្តពូជរុក្ខជាតិមានផ្កា" },
    { topic: "Leaf cross-section", topicKm: "ផ្នែកទទឹងសន្លឹក", difficulty: "Hard",
      prompt: "Which layer of a leaf's cross-section contains chloroplast-rich cells specialized for photosynthesis?", promptKm: "តើស្រទាប់ណាមួយនៃផ្នែកទទឹងសន្លឹក មានកោសិកាសម្បូរក្លរ៉ូភីលសម្រាប់ធ្វើសំយោគពន្លឺ?",
      options: ["Palisade layer", "Upper epidermis", "Lower epidermis", "Vascular bundle sheath only"], answer: "Palisade layer",
      optionsKm: ["ស្រទាប់បាលីសាទ", "ស្បែកខាងលើ", "ស្បែកខាងក្រោម", "ស្រទាបគ្រែបស្រសៃប្រដាប់ដឹកនាំតែម្យ៉ាង"], answerKm: "ស្រទាប់បាលីសាទ",
      explanation: "The palisade layer, just under the upper epidermis, is packed with chloroplasts and is the main site of photosynthesis; the spongy layer below has air spaces for gas exchange.", explanationKm: "ស្រទាប់បាលីសាទ ដែលនៅក្រោមស្បែកខាងលើ សម្បូរទៅដោយក្លរ៉ូភីល ជាកន្លែងសំខាន់សម្រាប់ធ្វើសំយោគពន្លឺ រីឯស្រទាប់ស្ពឹងខាងក្រោមមានរន្ធខ្យល់សម្រាប់ផ្លាស់ប្តូរឧស្ម័ន។",
      formula: "Leaf layers: epidermis → palisade (photosynthesis) → spongy (gas exchange) → epidermis", formulaKm: "ស្រទាប់សន្លឹក៖ ស្បែក → បាលីសាទ (សំយោគពន្លឺ) → ស្ពឹង (ផ្លាស់ប្តូរឧស្ម័ន) → ស្បែក",
      chapter: "Flowering Plant Reproduction", chapterKm: "ការបន្តពូជរុក្ខជាតិមានផ្កា" },
    { topic: "Flower parts", topicKm: "ផ្នែកនៃផ្កា", difficulty: "Medium",
      prompt: "A flower is the reproductive organ of a plant. How many main parts does it have?", promptKm: "ផ្កាជាសរីរាង្គបន្តពូជរបស់រុក្ខជាតិ។ តើវាមានផ្នែកចម្បងប៉ុន្មាន?",
      options: ["4: sepals, petals, stamens, pistil", "2: petals and stem only", "3: root, stem, leaf", "5: sepal, petal, stamen, pistil, seed"], answer: "4: sepals, petals, stamens, pistil",
      optionsKm: ["៤៖ ក្លៀប, ក្លិប, កម្រាលភ្នែក, ស្ទីល", "២៖ ក្លិប និងដើមតែប៉ុណ្ណោះ", "៣៖ ឬស ដើម សន្លឹក", "៥៖ ក្លៀប ក្លិប កម្រាលភ្នែក ស្ទីល គ្រាប់"], answerKm: "៤៖ ក្លៀប, ក្លិប, កម្រាលភ្នែក, ស្ទីល",
      explanation: "A typical flower has a calyx (sepals), corolla (petals), androecium (stamens, the male part) and gynoecium (pistil, the female part).", explanationKm: "ផ្កាធម្មតាមួយមានក្លៀប (សេប៉ាល់) ក្លិប (ក្រូឡា) កម្រាលភ្នែកញី (អង់ដ្រូស៊ែម) និងស្ទីល/ស្រទាប់ភ្នែកញី (ហ្សីណូស៊ែម)។",
      formula: "Flower = calyx + corolla + stamens (male) + pistil (female)", formulaKm: "ផ្កា = ក្លៀប + ក្លិប + កម្រាលភ្នែកឈ្មោល + ស្ទីលភ្នែកញី",
      chapter: "Flowering Plant Reproduction", chapterKm: "ការបន្តពូជរុក្ខជាតិមានផ្កា" },
    { topic: "The stigma", topicKm: "ស្ទីចម៉ា", difficulty: "Easy",
      prompt: "Which part of the flower's female organ receives pollen grains?", promptKm: "តើផ្នែកណាមួយនៃសរីរាង្គភ្នែកញីទទួលយកគ្រាប់លំអង?",
      options: ["Stigma", "Ovary", "Sepal", "Filament"], answer: "Stigma",
      optionsKm: ["ស្ទីចម៉ា", "អូវុល (អូវែរ)", "ក្លៀប", "កតែងលំអង"], answerKm: "ស្ទីចម៉ា",
      explanation: "The stigma is the tip of the pistil, often sticky, designed to catch and hold pollen grains that land on it.", explanationKm: "ស្ទីចម៉ាជាផ្នែកកំពូលនៃស្ទីល ច្រើនតែស្អិត ត្រូវបានរចនាឡើងដើម្បីចាប់ និងទប់ស្កាត់គ្រាប់លំអងដែលធ្លាក់មកលើ។",
      formula: "Stigma catches pollen → pollen tube grows down style to the ovary", formulaKm: "ស្ទីចម៉ាចាប់លំអង → បំពង់លំអងដុះចុះតាមស្ទីលទៅអូវែរ",
      chapter: "Flowering Plant Reproduction", chapterKm: "ការបន្តពូជរុក្ខជាតិមានផ្កា" },
    { topic: "Types of pollination", topicKm: "ប្រភេទដំណើរលំអង", difficulty: "Medium",
      prompt: "What are the two natural types of pollination in flowering plants?", promptKm: "តើដំណើរលំអងធម្មជាតិមានពីរប្រភេទអ្វីខ្លះ?",
      options: ["Self-pollination and cross-pollination", "Wind and water only", "Natural and artificial only", "Insect and animal only"], answer: "Self-pollination and cross-pollination",
      optionsKm: ["ដំណើរលំអងខ្លួនឯង និងដំណើរលំអងកាត់", "ខ្យល់ និងទឹកតែប៉ុណ្ណោះ", "ធម្មជាតិ និងសិប្បនិម្មិតតែប៉ុណ្ណោះ", "សត្វល្អិត និងសត្វតែប៉ុណ្ណោះ"], answerKm: "ដំណើរលំអងខ្លួនឯង និងដំណើរលំអងកាត់",
      explanation: "Self-pollination transfers pollen from the anther to the stigma of the same flower or another flower on the same plant; cross-pollination transfers pollen between flowers on two different plants.", explanationKm: "ដំណើរលំអងខ្លួនឯង គឺការផ្ទេរលំអងពីកម្រាលភ្នែកទៅស្ទីចម៉ានៃផ្កាតែមួយ ឬផ្កាមួយទៀតលើដើមដដែល ចំណែកឯដំណើរលំអងកាត់ គឺការផ្ទេររវាងផ្កានៃដើមពីរផ្សេងគ្នា។",
      formula: "Self-pollination: same plant; Cross-pollination: two different plants", formulaKm: "ដំណើរលំអងខ្លួនឯង៖ ដើមតែមួយ; ដំណើរលំអងកាត់៖ ដើមពីរផ្សេងគ្នា",
      chapter: "Flowering Plant Reproduction", chapterKm: "ការបន្តពូជរុក្ខជាតិមានផ្កា" },
    { topic: "Cross-pollination agents", topicKm: "ភ្នាក់ងារដំណើរលំអងកាត់", difficulty: "Easy",
      prompt: "Which of the following commonly carries pollen for cross-pollination?", promptKm: "តើមួយណាខាងក្រោមជាទូទៅជួយដឹកនាំលំអងសម្រាប់ដំណើរលំអងកាត់?",
      options: ["Wind, water and insects", "Only sunlight", "Only soil bacteria", "Only the plant's own roots"], answer: "Wind, water and insects",
      optionsKm: ["ខ្យល់ ទឹក និងសត្វល្អិត", "ពន្លឺថ្ងៃតែប៉ុណ្ណោះ", "បាក់តេរីនៅក្នុងដីតែប៉ុណ្ណោះ", "ឬសរបស់រុក្ខជាតិខ្លួនឯងតែប៉ុណ្ណោះ"], answerKm: "ខ្យល់ ទឹក និងសត្វល្អិត",
      explanation: "Cross-pollination is carried out by agents such as wind, water, insects (bees, butterflies) and other animals that move pollen from one plant to another.", explanationKm: "ដំណើរលំអងកាត់ត្រូវបានអនុវត្តដោយភ្នាក់ងារដូចជាខ្យល់ ទឹក សត្វល្អិត (ឃ្មុំ មេអំបៅ) និងសត្វដទៃទៀត ដែលដឹកលំអងពីដើមមួយទៅដើមមួយទៀត។",
      formula: "Cross-pollination agents: wind + water + insects/animals", formulaKm: "ភ្នាក់ងារដំណើរលំអងកាត់៖ ខ្យល់ + ទឹក + សត្វល្អិត/សត្វ",
      chapter: "Flowering Plant Reproduction", chapterKm: "ការបន្តពូជរុក្ខជាតិមានផ្កា" },
    { topic: "Monocot vs dicot", topicKm: "ម៉ូណូកូទីលេដុង ធៀបនឹងឌីកូទីលេដុង", difficulty: "Medium",
      prompt: "Which feature distinguishes a monocot from a dicot plant?", promptKm: "តើលក្ខណៈណាមួយបែងចែកដូងម៉ូណូកូទីលេដុងចេញពីឌីកូទីលេដុង?",
      options: ["Monocots have one cotyledon and parallel leaf veins; dicots have two cotyledons and net-veined leaves", "Monocots always have red flowers", "Dicots never have roots", "Monocots have no seeds"], answer: "Monocots have one cotyledon and parallel leaf veins; dicots have two cotyledons and net-veined leaves",
      optionsKm: ["ម៉ូណូកូទីលេដុងមានកូទីលេដុង១ និងសរសៃស្លឹករាង​ប៉ារ៉ាឡែល; ឌីកូទីលេដុងមានកូទីលេដុង២ និងសរសៃសន្លឹករាងសំណាញ់", "ម៉ូណូកូទីលេដុងតែងតែមានផ្កាពណ៌ក្រហម", "ឌីកូទីលេដុងគ្មានឬសទេ", "ម៉ូណូកូទីលេដុងគ្មានគ្រាប់ទេ"], answerKm: "ម៉ូណូកូទីលេដុងមានកូទីលេដុង១ និងសរសៃស្លឹករាង​ប៉ារ៉ាឡែល; ឌីកូទីលេដុងមានកូទីលេដុង២ និងសរសៃសន្លឹករាងសំណាញ់",
      explanation: "Monocots (e.g. coconut palm) have one cotyledon, parallel leaf veins, flower parts in multiples of 3, and fibrous roots; dicots (e.g. mango) have two cotyledons, net-veined leaves, flower parts in multiples of 4 or 5, and a taproot.", explanationKm: "ម៉ូណូកូទីលេដុង (ឧ. ដូង) មានកូទីលេដុង១ សរសៃសន្លឹករាងប៉ារ៉ាឡែល ផ្កាមានចំនួនផ្នែកគុណនឹង៣ និងឬសជាបាច់ ចំណែកឯឌីកូទីលេដុង (ឧ. ស្វាយ) មានកូទីលេដុង២ សរសៃសន្លឹករាងសំណាញ់ ផ្កាមានចំនួនផ្នែកគុណនឹង៤ ឬ៥ និងឬសចេញ។",
      formula: "Monocot: 1 cotyledon, parallel veins; Dicot: 2 cotyledons, net veins", formulaKm: "ម៉ូណូកូទីលេដុង៖ កូទីលេដុង១ សរសៃប៉ារ៉ាឡែល; ឌីកូទីលេដុង៖ កូទីលេដុង២ សរសៃសំណាញ់",
      chapter: "Flowering Plant Reproduction", chapterKm: "ការបន្តពូជរុក្ខជាតិមានផ្កា" },
    { topic: "Double fertilization", topicKm: "ការបងកកំណើតទវ", difficulty: "Hard",
      prompt: "What is unique about fertilization in flowering plants, known as \"double fertilization\"?", promptKm: "តើអ្វីជាលក្ខណៈពិសេសនៃការបងកកំណើតរបស់រុក្ខជាតិមានផ្កា ដែលហៅថា \"ការបងកកំណើតទវ\"?",
      options: ["One sperm cell fertilizes the egg to form the embryo, and another fuses with the polar nuclei to form the endosperm", "Two sperm cells fertilize two separate eggs", "The egg fertilizes itself without any sperm", "Two eggs are fertilized by one sperm cell"], answer: "One sperm cell fertilizes the egg to form the embryo, and another fuses with the polar nuclei to form the endosperm",
      optionsKm: ["ស្ដែមាឯកតម្ភ១ភ្ជាប់ជាមួយអូអូស្វែរបង្កើតជាអំព្រីយុង ហើយស្ដែមាឯកតម្ភមួយទៀតរលាយជាមួយស្នូលប៉ូផលបង្កើតជាអង់ដូស្ពែម", "ស្ដែមាឯកតម្ភពីរផ្ដល់កំណើតដល់អូអូស្វែរពីរផ្សេងគ្នា", "អូអូស្វែរបង្កកំណើតដោយខ្លួនឯងដោយគ្មានស្ដែមាឯកតម្ភ", "អូអូស្វែរពីរត្រូវបានបង្កកំណើតដោយស្ដែមាឯកតម្ភមួយ"], answerKm: "ស្ដែមាឯកតម្ភ១ភ្ជាប់ជាមួយអូអូស្វែរបង្កើតជាអំព្រីយុង ហើយស្ដែមាឯកតម្ភមួយទៀតរលាយជាមួយស្នូលប៉ូផលបង្កើតជាអង់ដូស្ពែម",
      explanation: "In double fertilization, the pollen tube delivers two sperm nuclei: one fertilizes the egg cell to form the diploid zygote (which grows into the embryo), and the other fuses with the two polar nuclei to form a triploid (3n) cell that becomes the nutrient-storing endosperm.", explanationKm: "ក្នុងការបងកកំណើតទវ បំពង់លំអងបញ្ជូនស្ដែមាឯកតម្ភពីរ៖ មួយបង្កកំណើតជាមួយអូអូស្វែរបង្កើតជាស៊ីកូតឌីបលូអ៊ីត (ដែលនឹងលូតលាស់ទៅជាអំព្រីយុង) ហើយមួយទៀតរលាយជាមួយស្នូលប៉ូផលទាំងពីរបង្កើតជាកោសិកាទ្រីបលូអ៊ីត (3n) ដែលនឹងក្លាយជាអង់ដូស្ពែមផ្ទុកអាហារបំរុង។",
      formula: "Sperm + egg → embryo (2n); Sperm + polar nuclei → endosperm (3n)", formulaKm: "ស្ដែមា + អូអូស្វែរ → អំព្រីយុង (2n); ស្ដែមា + ស្នូលប៉ូផល → អង់ដូស្ពែម (3n)",
      chapter: "Flowering Plant Reproduction", chapterKm: "ការបន្តពូជរុក្ខជាតិមានផ្កា" },
    { topic: "Fruit and seed formation", topicKm: "ការបង្កើតផ្លែ និងគ្រាប់", difficulty: "Medium",
      prompt: "After fertilization in a flowering plant, what typically becomes the fruit?", promptKm: "ក្រោយការបងកកំណើតក្នុងរុក្ខជាតិមានផ្កា តើផ្នែកណាដែលក្លាយទៅជាផ្លែជាទូទៅ?",
      options: ["The ovary wall", "The petals", "The sepals", "The stamen"], answer: "The ovary wall",
      optionsKm: ["ជញ្ជាំងអូវែរ", "ក្លិប", "ក្លៀប", "កម្រាលភ្នែក"], answerKm: "ជញ្ជាំងអូវែរ",
      explanation: "After fertilization, the ovule develops into the seed while the ovary wall develops into the fruit (pericarp), which protects the seed and often aids in its dispersal.", explanationKm: "ក្រោយការបងកកំណើត អូវុលលូតលាស់ទៅជាគ្រាប់ ចំណែកឯជញ្ជាំងអូវែរលូតលាស់ទៅជាផ្លែ (pericarp) ដែលការពារគ្រាប់ និងជួយផ្សព្វផ្សាយគ្រាប់ជាញឹកញាប់។",
      formula: "Ovule → seed; Ovary wall → fruit", formulaKm: "អូវុល → គ្រាប់; ជញ្ជាំងអូវែរ → ផ្លែ",
      chapter: "Flowering Plant Reproduction", chapterKm: "ការបន្តពូជរុក្ខជាតិមានផ្កា" },
    { topic: "Germination stages", topicKm: "ដំណាក់កាលដំណុះគ្រាប់", difficulty: "Medium",
      prompt: "How many main stages does the life cycle of a flowering plant have, and what are they?", promptKm: "តើវដ្តជីវិតរបស់រុក្ខជាតិមានផ្កា មានដំណាក់កាលចម្បងប៉ុន្មាន និងអ្វីខ្លះ?",
      options: ["Two: the flower stage and the seed stage", "Four: root, stem, leaf and flower", "One: the seed stage only", "Three: flower, fruit and root"], answer: "Two: the flower stage and the seed stage",
      optionsKm: ["ពីរ៖ ដំណាក់កាលផ្កា និងដំណាក់កាលគ្រាប់", "បួន៖ ឬស ដើម សន្លឹក និងផ្កា", "មួយ៖ ដំណាក់កាលគ្រាប់តែប៉ុណ្ណោះ", "បី៖ ផ្កា ផ្លែ និងឬស"], answerKm: "ពីរ៖ ដំណាក់កាលផ្កា និងដំណាក់កាលគ្រាប់",
      explanation: "The life cycle of an angiosperm has two main stages — the flower stage (pollination and fertilization) and the seed stage (the seed develops, is dispersed, and germinates into a new plant).", explanationKm: "វដ្តជីវិតរបស់រុក្ខជាតិអង់ស៊ីយូស្សែម មានដំណាក់កាលចម្បងពីរ គឺដំណាក់កាលផ្កា (ដំណើរលំអង និងការបងកកំណើត) និងដំណាក់កាលគ្រាប់ (គ្រាប់លូតលាស់ រីករាលដាល និងដុះទៅជារុក្ខជាតិថ្មី)។",
      formula: "Angiosperm life cycle: flower stage → seed stage", formulaKm: "វដ្តជីវិតរុក្ខជាតិមានផ្កា៖ ដំណាក់កាលផ្កា → ដំណាក់កាលគ្រាប់",
      chapter: "Flowering Plant Reproduction", chapterKm: "ការបន្តពូជរុក្ខជាតិមានផ្កា" },
    { topic: "Invertebrate nervous system", topicKm: "ប្រព័ន្ធប្រសាទសត្វអនឹដ្ឋឆ្អឹងខ្នង", difficulty: "Medium",
      prompt: "Compared to vertebrates, an earthworm's nervous system is best described as ___.", promptKm: "បើប្រៀបធៀបទៅនឹងសត្វមានឆ្អឹងខ្នង តើប្រព័ន្ធប្រសាទរបស់ជនលនគួរពិពណ៌នាថាជា ___?",
      options: ["Simple, with a nerve cord and segmental ganglia instead of a brain and spinal cord", "Identical to a human's nervous system", "Completely absent", "More complex than a mammal's"], answer: "Simple, with a nerve cord and segmental ganglia instead of a brain and spinal cord",
      optionsKm: ["សាមញ្ញ មានខួរក្បាលតូច និងកង់គ្លីយុងតាមប្រចេះជំនួសខួរក្បាល និងខួរឆ្អឹងខ្នង", "ដូចគ្នាបេះបិទនឹងប្រព័ន្ធប្រសាទមនុស្ស", "អវត្តមានទាំងស្រុង", "ស្មុគស្មាញជាងសត្វមានទឹកដោះ"], answerKm: "សាមញ្ញ មានខួរក្បាលតូច និងកង់គ្លីយុងតាមប្រចេះជំនួសខួរក្បាល និងខួរឆ្អឹងខ្នង",
      explanation: "Invertebrates like earthworms have a simpler nervous system built from a small \"brain\" (cerebral ganglion) and a chain of ganglia connected by a nerve cord running along the body, rather than a true brain and spinal cord.", explanationKm: "សត្វអនឹដ្ឋឆ្អឹងខ្នងដូចជាជនលនមានប្រព័ន្ធប្រសាទសាមញ្ញជាង បង្កើតឡើងពីខួរក្បាលតូច (កង់គ្លីយុងខួរក្បាល) និងខ្សែកង់គ្លីយុងភ្ជាប់ដោយប្រសាទចង្កោមតាមបណ្តោយខ្លួន ជំនួសខួរក្បាល និងខួរឆ្អឹងខ្នងពិតប្រាកដ។",
      formula: "Invertebrate: ganglia + nerve cord; Vertebrate: brain + spinal cord", formulaKm: "សត្វអនឹដ្ឋឆ្អឹងខ្នង៖ កង់គ្លីយុង + ប្រសាទចង្កោម; សត្វឆ្អឹងខ្នង៖ ខួរក្បាល + ខួរឆ្អឹងខ្នង",
      chapter: "Nervous System", chapterKm: "ប្រព័ន្ធប្រសាទ" },
    { topic: "Neuron structure", topicKm: "រចនាសម្ព័ន្ធណឺរូន", difficulty: "Medium",
      prompt: "A neuron is divided into three main parts. What are they?", promptKm: "ណឺរូនមួយបែងចែកជាបីផ្នែកសំខាន់។ តើអ្វីខ្លះ?",
      options: ["Dendrites, cell body, and axon", "Nucleus, cytoplasm, and membrane only", "Root, stem, and leaf", "Synapse, myelin, and node only"], answer: "Dendrites, cell body, and axon",
      optionsKm: ["ដង់ស្រ្តើ (dendrite) តួកោសិកា និងអាក់សូន", "ស្នូល ស៊ីតូប្លាស និងភ្នាសតែប៉ុណ្ណោះ", "ឬស ដើម និងសន្លឹក", "ស៊ីណាប់ មីអេលីន និងថ្នាំងតែប៉ុណ្ណោះ"], answerKm: "ដង់ស្រ្តើ (dendrite) តួកោសិកា និងអាក់សូន",
      explanation: "Dendrites are short branching fibers that receive information; the cell body contains the nucleus and organelles; the axon is a single long fiber that carries the nerve impulse away toward the next neuron.", explanationKm: "ដង់ស្រ្តើជាសរសៃខ្លីៗមែកធាងទទួលព័ត៌មាន តួកោសិកាផ្ទុកស្នូល និងធាតុកោសិកា ចំណែកឯអាក់សូនជាសរសៃវែងតែមួយ ដឹកនាំសញ្ញាប្រសាទចេញទៅណឺរូនបន្ទាប់។",
      formula: "Neuron: dendrites (in) → cell body → axon (out)", formulaKm: "ណឺរូន៖ ដង់ស្រ្តើ (ចូល) → តួកោសិកា → អាក់សូន (ចេញ)",
      chapter: "Nervous System", chapterKm: "ប្រព័ន្ធប្រសាទ" },
    { topic: "Types of neurons", topicKm: "ប្រភេទណឺរូន", difficulty: "Medium",
      prompt: "Based on the number of prolongations, neurons are classified into how many types?", promptKm: "ផ្អែកលើភាពពន្លយស៊ីតូប្លាស តើគេចែកណឺរូនជាប៉ុន្មានប្រភេទ?",
      options: ["3: unipolar, bipolar, and multipolar", "2: sensory and motor only", "4: brain, spinal, cranial, and peripheral", "1: only one universal type"], answer: "3: unipolar, bipolar, and multipolar",
      optionsKm: ["៣៖ ណឺរូនឯកប៉ូល ណឺរូនទ្វេប៉ូល និងណឺរូនពហុប៉ូល", "២៖ ណឺរូនវិញ្ញាណនាំ និងណឺរូនចលករតែប៉ុណ្ណោះ", "៤៖ ខួរក្បាល ខួរឆ្អឹងខ្នង ក្បាល និងគ្រឿងកាយតែប៉ុណ្ណោះ", "១៖ មានតែប្រភេទតែមួយសកល"], answerKm: "៣៖ ណឺរូនឯកប៉ូល ណឺរូនទ្វេប៉ូល និងណឺរូនពហុប៉ូល",
      explanation: "A unipolar neuron has one prolongation from the cell body; a bipolar neuron has two (a dendrite and an axon); a multipolar neuron has many dendrites plus one axon.", explanationKm: "ណឺរូនឯកប៉ូលមានពន្លយមួយចេញពីតួកោសិកា ណឺរូនទ្វេប៉ូលមានពីរ (ដង់ស្រ្តើ និងអាក់សូន) ចំណែកឯណឺរូនពហុប៉ូលមានដង់ស្រ្តើច្រើន បូករួមអាក់សូនមួយ។",
      formula: "Unipolar: 1; Bipolar: 2; Multipolar: many + 1 axon", formulaKm: "ឯកប៉ូល៖ ១; ទ្វេប៉ូល៖ ២; ពហុប៉ូល៖ ច្រើន + អាក់សូន១",
      chapter: "Nervous System", chapterKm: "ប្រព័ន្ធប្រសាទ" },
    { topic: "Three neurons in a reflex", topicKm: "ណឺរូនបីប្រភេទក្នុងចលនាឆ្លើយតប", difficulty: "Hard",
      prompt: "When you hear your phone ring and reach to pick it up, which three types of neurons are involved?", promptKm: "ពេលឮទូរស័ព្ទរោទិ៍ ហើយអ្នកលើកទូរស័ព្ទឡើងដើម្បីឆ្លើយតប តើមានណឺរូនបីប្រភេទអ្វីខ្លះចូលរួម?",
      options: ["Sensory (afferent), connector (interneuron), and motor (efferent) neurons", "Only sensory neurons", "Only motor neurons", "Bipolar, unipolar, and multipolar neurons only"], answer: "Sensory (afferent), connector (interneuron), and motor (efferent) neurons",
      optionsKm: ["ណឺរូនវិញ្ញាណនាំ ណឺរូនភ្ជាប់ និងណឺរូនចលករ", "ណឺរូនវិញ្ញាណនាំតែប៉ុណ្ណោះ", "ណឺរូនចលករតែប៉ុណ្ណោះ", "ណឺរូនទ្វេប៉ូល ឯកប៉ូល និងពហុប៉ូលតែប៉ុណ្ណោះ"], answerKm: "ណឺរូនវិញ្ញាណនាំ ណឺរូនភ្ជាប់ និងណឺរូនចលករ",
      explanation: "The sensory neuron carries information from the ear to the central nervous system; the connector (relay/interneuron) neuron in the brain passes it on after interpretation; the motor neuron carries the command from the brain to the muscles that lift the phone.", explanationKm: "ណឺរូនវិញ្ញាណនាំដឹកនាំព័ត៌មានពីត្រចៀកទៅមជ្ឈមណ្ឌលប្រសាទ ណឺរូនភ្ជាប់ (ណឺរូនចង្កោម) នៅក្នុងខួរក្បាលបញ្ជូនបន្តក្រោយបកស្រាយ ណឺរូនចលករដឹកនាំបញ្ជាពីខួរក្បាលទៅសាច់ដុំដែលលើកទូរស័ព្ទ។",
      formula: "Reflex path: sensory → connector → motor neuron", formulaKm: "ផ្លូវឆ្លើយតប៖ ណឺរូនវិញ្ញាណនាំ → ណឺរូនភ្ជាប់ → ណឺរូនចលករ",
      chapter: "Nervous System", chapterKm: "ប្រព័ន្ធប្រសាទ" },
    { topic: "The synapse", topicKm: "ស៊ីណាប់", difficulty: "Medium",
      prompt: "What is a synapse?", promptKm: "តើស៊ីណាប់ជាអ្វី?",
      options: ["The small gap between the end of one neuron's axon and the next neuron", "The center of the cell body", "A type of muscle", "A blood vessel in the brain"], answer: "The small gap between the end of one neuron's axon and the next neuron",
      optionsKm: ["ចន្លោះតូចមួយរវាងចុងអាក់សូននៃណឺរូនមួយ និងណឺរូនបន្ទាប់", "ចំណុចកណ្តាលនៃតួកោសិកា", "ប្រភេទសាច់ដុំមួយ", "សរសៃឈាមក្នុងខួរក្បាល"], answerKm: "ចន្លោះតូចមួយរវាងចុងអាក់សូននៃណឺរូនមួយ និងណឺរូនបន្ទាប់",
      explanation: "The synapse is the junction between the end of one neuron's axon and the dendrite or cell body of the next neuron, where a chemical neurotransmitter carries the signal across the gap.", explanationKm: "ស៊ីណាប់ជាចំណុចប្រសព្វរវាងចុងអាក់សូននៃណឺរូនមួយ និងដង់ស្រ្តើ ឬតួកោសិកានៃណឺរូនបន្ទាប់ ដែលសារធាតុគីមីណឺរូនបញ្ជូនសារឆ្លងកាត់ចន្លោះនេះ។",
      formula: "Nerve impulse → synapse (neurotransmitter) → next neuron", formulaKm: "សញ្ញាប្រសាទ → ស៊ីណាប់ (សារធាតុបញ្ជូនសារ) → ណឺរូនបន្ទាប់",
      chapter: "Nervous System", chapterKm: "ប្រព័ន្ធប្រសាទ" },
    { topic: "Three main parts of the brain", topicKm: "ផ្នែកសំខាន់បីរបស់ខួរក្បាល", difficulty: "Medium",
      prompt: "The brain has three main parts. What are they and what does each control?", promptKm: "ខួរក្បាលមានផ្នែកសំខាន់បី។ តើអ្វីខ្លះ និងនីមួយៗត្រួតពិនិត្យអ្វី?",
      options: ["Cerebrum (thinking, senses), cerebellum (balance, voluntary movement), and medulla oblongata (breathing, heartbeat)", "Cerebrum, spinal cord, and nerve only", "Only the cerebrum, which does everything", "Skull, meninges, and cerebrospinal fluid"], answer: "Cerebrum (thinking, senses), cerebellum (balance, voluntary movement), and medulla oblongata (breathing, heartbeat)",
      optionsKm: ["ខួរធំ (គិត វិញ្ញាណ) ខួរតូច (លំនឹង ចលនាឆន្ទៈ) និងខួរកញ្ឹងក (ដង្ហើម ចង្វាក់បេះដូង)", "ខួរធំ ខួរឆ្អឹងខ្នង និងប្រសាទតែប៉ុណ្ណោះ", "ខួរធំតែមួយប៉ុណ្ណោះដែលធ្វើអ្វីៗគ្រប់យ៉ាង", "ឆ្អឹងលលាដ៍ក្បាល ស្រោមខួរ និងទឹកខួរ"], answerKm: "ខួរធំ (គិត វិញ្ញាណ) ខួរតូច (លំនឹង ចលនាឆន្ទៈ) និងខួរកញ្ឹងក (ដង្ហើម ចង្វាក់បេះដូង)",
      explanation: "The cerebrum handles thinking, judgment and the five senses; the cerebellum coordinates voluntary movement and body balance; the medulla oblongata (part of the brainstem) controls involuntary actions like breathing and heartbeat.", explanationKm: "ខួរធំគ្រប់គ្រងការគិត ការវិនិច្ឆ័យ និងវិញ្ញាណទាំង៥ ខួរតូចសម្របសម្រួលចលនាឆន្ទៈ និងលំនឹងរាងកាយ ចំណែកឯខួរកញ្ឹងក (ផ្នែកនៃដងខួរក្បាល) គ្រប់គ្រងសកម្មភាពអឆន្ទៈដូចជាដង្ហើម និងចង្វាក់បេះដូង។",
      formula: "Cerebrum: thought; Cerebellum: balance; Medulla: breathing/heartbeat", formulaKm: "ខួរធំ៖ គិត; ខួរតូច៖ លំនឹង; ខួរកញ្ឹងក៖ ដង្ហើម/បេះដូង",
      chapter: "Nervous System", chapterKm: "ប្រព័ន្ធប្រសាទ" },
    { topic: "Spinal cord protection", topicKm: "ការការពារខួរឆ្អឹងខ្នង", difficulty: "Easy",
      prompt: "What protects the spinal cord?", promptKm: "តើអ្វីជាអ្នកការពារខួរឆ្អឹងខ្នង?",
      options: ["The vertebral column, meninges, and cerebrospinal fluid", "The skull only", "The ribs only", "Skin only"], answer: "The vertebral column, meninges, and cerebrospinal fluid",
      optionsKm: ["ឆ្អឹងខ្នង ស្រោមខួរ និងទឹកខួរ", "ឆ្អឹងលលាដ៍ក្បាលតែប៉ុណ្ណោះ", "ឆ្អឹងជំនីរតែប៉ុណ្ណោះ", "ស្បែកតែប៉ុណ្ណោះ"], answerKm: "ឆ្អឹងខ្នង ស្រោមខួរ និងទឹកខួរ",
      explanation: "Just as the skull protects the brain, the vertebral column (spine), meninges, and cerebrospinal fluid together protect the delicate spinal cord from injury.", explanationKm: "ដូចឆ្អឹងលលាដ៍ក្បាលការពារខួរក្បាល ឆ្អឹងខ្នង ស្រោមខួរ និងទឹកខួររួមគ្នាការពារខួរឆ្អឹងខ្នងដ៏ងាយរងគ្រោះពីរបួស។",
      formula: "Spinal cord protection: vertebrae + meninges + CSF", formulaKm: "ការការពារខួរឆ្អឹងខ្នង៖ ឆ្អឹងខ្នង + ស្រោមខួរ + ទឹកខួរ",
      chapter: "Nervous System", chapterKm: "ប្រព័ន្ធប្រសាទ" },
    { topic: "Central vs peripheral nervous system", topicKm: "ប្រព័ន្ធប្រសាទកណ្តាល ធៀបនឹងគ្រឿងប្រព័ន្ធប្រសាទ", difficulty: "Medium",
      prompt: "What makes up the central nervous system, as opposed to the peripheral nervous system?", promptKm: "តើអ្វីជាធាតុផ្សំនៃប្រព័ន្ធប្រសាទកណ្តាល ផ្ទុយពីគ្រឿងប្រព័ន្ធប្រសាទ?",
      options: ["The brain and spinal cord", "The sensory and motor nerves only", "The muscles and glands only", "The eyes and ears only"], answer: "The brain and spinal cord",
      optionsKm: ["ខួរក្បាល និងខួរឆ្អឹងខ្នង", "សរសៃប្រសាទវិញ្ញាណនាំ និងចលករតែប៉ុណ្ណោះ", "សាច់ដុំ និងក្រពេញតែប៉ុណ្ណោះ", "ភ្នែក និងត្រចៀកតែប៉ុណ្ណោះ"], answerKm: "ខួរក្បាល និងខួរឆ្អឹងខ្នង",
      explanation: "The central nervous system consists of the brain and spinal cord, which receive, interpret and send out information; the peripheral nervous system consists of the sensory and motor nerves that carry information to and from the central nervous system.", explanationKm: "ប្រព័ន្ធប្រសាទកណ្តាលមានខួរក្បាល និងខួរឆ្អឹងខ្នង ដែលទទួល បកស្រាយ និងបញ្ជូនព័ត៌មានចេញ ចំណែកឯគ្រឿងប្រព័ន្ធប្រសាទមានសរសៃប្រសាទវិញ្ញាណនាំ និងចលករ ដែលដឹកព័ត៌មានចូល និងចេញពីប្រព័ន្ធប្រសាទកណ្តាល។",
      formula: "CNS = brain + spinal cord; PNS = nerves in/out", formulaKm: "ប្រព័ន្ធកណ្តាល = ខួរក្បាល + ខួរឆ្អឹងខ្នង; គ្រឿងប្រព័ន្ធ = សរសៃប្រសាទចូល/ចេញ",
      chapter: "Nervous System", chapterKm: "ប្រព័ន្ធប្រសាទ" },
    { topic: "Somatic vs autonomic nervous system", topicKm: "ប្រព័ន្ធប្រសាទសូម៉ាទិច ធៀបនឹងស្វ័យប្រវត្តិ", difficulty: "Medium",
      prompt: "Which nervous system controls involuntary activities like heartbeat and digestion?", promptKm: "តើប្រព័ន្ធប្រសាទមួយណាគ្រប់គ្រងសកម្មភាពអឆន្ទៈដូចជាចង្វាក់បេះដូង និងការរំលាយអាហារ?",
      options: ["The autonomic nervous system", "The somatic nervous system", "The sensory nervous system only", "The skeletal nervous system"], answer: "The autonomic nervous system",
      optionsKm: ["ប្រព័ន្ធប្រសាទស្វ័យប្រវត្តិ", "ប្រព័ន្ធប្រសាទសូម៉ាទិច", "ប្រព័ន្ធប្រសាទវិញ្ញាណនាំតែប៉ុណ្ណោះ", "ប្រព័ន្ធប្រសាទឆ្អឹង"], answerKm: "ប្រព័ន្ធប្រសាទស្វ័យប្រវត្តិ",
      explanation: "The somatic nervous system connects the central nervous system to skeletal muscles for voluntary actions like walking or writing; the autonomic nervous system connects it to glands, smooth muscle, and heart muscle to control involuntary functions.", explanationKm: "ប្រព័ន្ធប្រសាទសូម៉ាទិចភ្ជាប់ប្រព័ន្ធប្រសាទកណ្តាលទៅសាច់ដុំឆ្អឹងសម្រាប់សកម្មភាពឆន្ទៈដូចជាដើរ ឬសរសេរ ចំណែកឯប្រព័ន្ធប្រសាទស្វ័យប្រវត្តិភ្ជាប់ទៅក្រពេញ សាច់ដុំរលើង និងសាច់ដុំបេះដូង ដើម្បីគ្រប់គ្រងមុខងារអឆន្ទៈ។",
      formula: "Somatic: skeletal muscle (voluntary); Autonomic: glands/heart/smooth muscle (involuntary)", formulaKm: "សូម៉ាទិច៖ សាច់ដុំឆ្អឹង (ឆន្ទៈ); ស្វ័យប្រវត្តិ៖ ក្រពេញ/បេះដូង/សាច់ដុំរលើង (អឆន្ទៈ)",
      chapter: "Nervous System", chapterKm: "ប្រព័ន្ធប្រសាទ" },
    { topic: "Sympathetic vs parasympathetic", topicKm: "សាំប៉ាទិច ធៀបនឹងប៉ារ៉ាសាំប៉ាទិច", difficulty: "Hard",
      prompt: "When facing a sudden danger, which part of the autonomic nervous system speeds up the heart rate to help you react or flee?", promptKm: "នៅពេលជួបគ្រោះថ្នាក់ភ្លាមៗ តើផ្នែកណានៃប្រព័ន្ធប្រសាទស្វ័យប្រវត្តិបង្កើនល្បឿនចង្វាក់បេះដូងជួយឲ្យអ្នកឆ្លើយតប ឬរត់គេច?", options: ["The sympathetic nervous system", "The parasympathetic nervous system", "The somatic nervous system", "The peripheral sensory system only"], answer: "The sympathetic nervous system",
      optionsKm: ["ប្រព័ន្ធប្រសាទសាំប៉ាទិច", "ប្រព័ន្ធប្រសាទប៉ារ៉ាសាំប៉ាទិច", "ប្រព័ន្ធប្រសាទសូម៉ាទិច", "ប្រព័ន្ធប្រសាទវិញ្ញាណនាំគ្រឿងតែប៉ុណ្ណោះ"], answerKm: "ប្រព័ន្ធប្រសាទសាំប៉ាទិច",
      explanation: "The sympathetic system activates when the body is under tension or danger — e.g. speeding up the heart and boosting alertness, as when fleeing a dog. The parasympathetic system has the opposite effect, calming the body back to a normal resting state afterward.", explanationKm: "ប្រព័ន្ធសាំប៉ាទិចធ្វើសកម្មភាពនៅពេលរាងកាយស្ថិតក្នុងភាពតានតឹង ឬគ្រោះថ្នាក់ ដូចជាបង្កើនល្បឿនបេះដូង និងភាពដឹងខ្លួន ដូចនៅពេលរត់គេចពីឆ្កែ។ ប្រព័ន្ធប៉ារ៉ាសាំប៉ាទិចមានឥទ្ធិពលផ្ទុយ ធ្វើឲ្យរាងកាយស្ងប់មកសភាពធម្មតាវិញក្រោយមក។",
      formula: "Sympathetic: fight/flight (speeds up); Parasympathetic: rest (calms down)", formulaKm: "សាំប៉ាទិច៖ ប្រយុទ្ធ/រត់គេច (បង្កើន); ប៉ារ៉ាសាំប៉ាទិច៖ សម្រាក (ស្ងប់)",
      chapter: "Nervous System", chapterKm: "ប្រព័ន្ធប្រសាទ" },
    { topic: "Layers of the eyeball", topicKm: "ស្រទាប់នៃគ្រាប់ភ្នែក", difficulty: "Medium",
      prompt: "The choroid is the middle layer of the eyeball. What is its main role?", promptKm: "ក្រូអ៊ីតជាស្រទាប់កណ្តាលនៃគ្រាប់ភ្នែក។ តើវាមានតួនាទីចម្បងអ្វី?",
      options: ["Nourish the eye and absorb stray light with its dark pigment", "Focus light onto the retina", "Produce tears", "Control the size of the pupil"], answer: "Nourish the eye and absorb stray light with its dark pigment",
      optionsKm: ["ចិញ្ចឹមភ្នែក និងស្រូបយកពន្លឺបំបែកដោយពណ៌ខ្មៅរបស់វា", "ផ្តោតពន្លឺទៅលើតម្រុយ", "ផលិតទឹកភ្នែក", "គ្រប់គ្រងទំហំប្រហោងសិចផ្កា"], answerKm: "ចិញ្ចឹមភ្នែក និងស្រូបយកពន្លឺបំបែកដោយពណ៌ខ្មៅរបស់វា",
      explanation: "The choroid, rich in blood vessels, delivers nutrients and oxygen to the retina and cornea and helps maintain eye temperature. Its dark pigment absorbs scattered light so it doesn't blur the image.", explanationKm: "ក្រូអ៊ីតសម្បូរសរសៃឈាម ជួយបញ្ជូនសារធាតុចិញ្ចឹម និងអុកសីសែនទៅតម្រុយ និងកញ្ចក់ភ្នែក ព្រមទាំងរក្សាសីតុណ្ហភាពក្នុងភ្នែក។ ពណ៌ខ្មៅរបស់វាស្រូបយកពន្លឺបំបែកកុំឲ្យធ្វើឲ្យរូបភាពព្រិល។",
      formula: "Choroid: nourish + absorb stray light (dark pigment)", formulaKm: "ក្រូអ៊ីត៖ ចិញ្ចឹម + ស្រូបពន្លឺបំបែក (ពណ៌ខ្មៅ)",
      chapter: "Sensory Physiology", chapterKm: "សរីរាង្គវិញ្ញាណ" },
    { topic: "The iris and pupil", topicKm: "ប្រស្រីភ្នែក និងរន្ធប្រស្រី", difficulty: "Easy",
      prompt: "What happens to the pupil in bright light?", promptKm: "តើមានអ្វីកើតឡើងចំពោះរន្ធប្រស្រីភ្នែកនៅពេលមានពន្លឺខ្លាំង?",
      options: ["It constricts (becomes smaller) to let in less light", "It dilates (becomes larger) to let in more light", "It closes completely", "It changes color"], answer: "It constricts (becomes smaller) to let in less light",
      optionsKm: ["រួមតូច ដើម្បីឲ្យពន្លឺចូលតិច", "រីកធំ ដើម្បីឲ្យពន្លឺចូលច្រើន", "បិទជិតទាំងស្រុង", "ប្តូរពណ៌"], answerKm: "រួមតូច ដើម្បីឲ្យពន្លឺចូលតិច",
      explanation: "The iris, made of smooth muscle, controls pupil size: the pupil constricts in strong light to limit how much enters, and dilates in dim light to let in more.", explanationKm: "ប្រស្រីភ្នែក (Iris) ដែលបង្កើតឡើងពីសាច់ដុំរលើង គ្រប់គ្រងទំហំរន្ធប្រស្រី៖ រន្ធប្រស្រីរួមតូចនៅពេលមានពន្លឺខ្លាំង ដើម្បីកំណត់បរិមាណពន្លឺចូល និងរីកធំនៅពេលពន្លឺស្រទន់ ដើម្បីឲ្យពន្លឺចូលបានច្រើន។",
      formula: "Bright light → pupil constricts; Dim light → pupil dilates", formulaKm: "ពន្លឺខ្លាំង → រន្ធប្រស្រីរួម; ពន្លឺស្រទន់ → រន្ធប្រស្រីរីក",
      chapter: "Sensory Physiology", chapterKm: "សរីរាង្គវិញ្ញាណ" },
    { topic: "Rods and cones", topicKm: "កោសិកាដំបង និងកោសិកាកោន", difficulty: "Medium",
      prompt: "The retina contains two kinds of light-sensitive cells. Which one lets us perceive color, and requires strong light to do so clearly?", promptKm: "តម្រុយមានកោសិការសួនឹងពន្លឺពីរប្រភេទ។ តើកោសិកាមួយណាដែលអាចឲ្យយើងមើលឃើញពណ៌ ហើយត្រូវការពន្លឺខ្លាំងទើបអាចញែកពណ៌បានច្បាស់?",
      options: ["Cone cells", "Rod cells", "Ganglion cells", "Bipolar cells"], answer: "Cone cells",
      optionsKm: ["កោសិកាកោន", "កោសិកាដំបង", "កោសិកាកង់គ្លីយុង", "កោសិកាទ្វេប៉ូល"], answerKm: "កោសិកាកោន",
      explanation: "Cone cells are sensitive to color but need strong light to distinguish colors clearly, while rod cells are sensitive to dim light but only produce black-and-white vision.", explanationKm: "កោសិកាកោនរសួនឹងពណ៌ ប៉ុន្តែត្រូវការពន្លឺខ្លាំងទើបអាចញែកពណ៌បានច្បាស់ ចំណែកឯកោសិកាដំបងរសួនឹងពន្លឺទន់ ប៉ុន្តែឲ្យតែគំនិតពណ៌សខ្មៅប៉ុណ្ណោះ។",
      formula: "Cones: color (needs bright light); Rods: dim light (black & white)", formulaKm: "កោន៖ ពណ៌ (ត្រូវការពន្លឺខ្លាំង); ដំបង៖ ពន្លឺទន់ (សខ្មៅ)",
      chapter: "Sensory Physiology", chapterKm: "សរីរាង្គវិញ្ញាណ" },
    { topic: "Fovea and blind spot", topicKm: "សាមមទឿង និងចំណុចខ្វាក់", difficulty: "Medium",
      prompt: "Why can't we see anything at the \"blind spot\" of the retina?", promptKm: "ហេតុអ្វីបានជាយើងមើលមិនឃើញអ្វីនៅ \"ចំណុចខ្វាក់\" នៃតម្រុយ?",
      options: ["It's where the optic nerve and blood vessels attach to the eyeball, with no photoreceptor cells there", "It's the sharpest area for color vision", "It only works in the dark", "It is covered by the eyebrow"], answer: "It's where the optic nerve and blood vessels attach to the eyeball, with no photoreceptor cells there",
      optionsKm: ["ជាកន្លែងដែលសរសៃប្រសាទអុបទិច និងសរសៃឈាមភ្ជាប់នឹងគ្រាប់ភ្នែក គ្មានកោសិការសួនឹងពន្លឺនៅទីនោះទេ", "ជាតំបន់ច្បាស់បំផុតសម្រាប់មើលពណ៌", "ដំណើរការតែក្នុងទីងងឹតប៉ុណ្ណោះ", "ត្រូវបានបិទដោយចិញ្ចើម"], answerKm: "ជាកន្លែងដែលសរសៃប្រសាទអុបទិច និងសរសៃឈាមភ្ជាប់នឹងគ្រាប់ភ្នែក គ្មានកោសិការសួនឹងពន្លឺនៅទីនោះទេ",
      explanation: "The blind spot is where the optic nerve and blood vessels exit the retina; since there are no rods or cones there, no light is detected. The fovea, by contrast, is the sharpest spot on the retina and lets us see color clearly.", explanationKm: "ចំណុចខ្វាក់ជាកន្លែងដែលសរសៃប្រសាទអុបទិច និងសរសៃឈាមចេញពីតម្រុយ ដោយសារគ្មានកោសិកាដំបង ឬកោនទីនោះ ទើបគ្មានការទទួលពន្លឺ។ ចំណែកឯសាមមទឿង ជាចំណុចច្បាស់បំផុតនៃតម្រុយ ដែលឲ្យយើងមើលឃើញពណ៌ច្បាស់។",
      formula: "Blind spot: optic nerve exit, no photoreceptors; Fovea: sharpest color vision", formulaKm: "ចំណុចខ្វាក់៖ ចេញនៃសរសៃប្រសាទអុបទិច គ្មានកោសិការសួន; សាមមទឿង៖ ច្បាស់បំផុតសម្រាប់ពណ៌",
      chapter: "Sensory Physiology", chapterKm: "សរីរាង្គវិញ្ញាណ" },
    { topic: "Accommodation of the lens", topicKm: "ការសម្របសម្រួលកែវភ្នែក", difficulty: "Hard",
      prompt: "How does the eye's lens change shape to focus on a nearby object?", promptKm: "តើកែវភ្នែកផ្លាស់ប្តូររាងយ៉ាងដូចម្តេច ដើម្បីផ្តោតលើវត្ថុនៅជិត?",
      options: ["The ciliary muscle contracts, the suspensory ligaments loosen, and the lens becomes more rounded", "The lens becomes completely flat", "The pupil closes entirely", "The retina moves closer to the lens"], answer: "The ciliary muscle contracts, the suspensory ligaments loosen, and the lens becomes more rounded",
      optionsKm: ["សាច់ដុំស៊ីលីអែរកន្ត្រាក់ សរសៃចំណងរបូង ហើយកែវភ្នែកកាន់តែមូល", "កែវភ្នែកទៅជារាបស្មើទាំងស្រុង", "រន្ធប្រស្រីបិទជិតទាំងស្រុង", "តម្រុយផ្លាស់មកជិតកែវភ្នែក"], answerKm: "សាច់ដុំស៊ីលីអែរកន្ត្រាក់ សរសៃចំណងរបូង ហើយកែវភ្នែកកាន់តែមូល",
      explanation: "To see a near object clearly, the ciliary muscle contracts, the suspensory ligaments (zonule fibers) slacken, and the lens's own elasticity lets it become thicker and more curved. To see a distant object, the muscle relaxes, the ligaments pull taut, and the lens flattens.", explanationKm: "ដើម្បីមើលឃើញវត្ថុនៅជិតបានច្បាស់ សាច់ដុំស៊ីលីអែរកន្ត្រាក់ សរសៃចំណងរបូង ហើយកែវភ្នែកនឹងក្រាស់ និងកោងជាងដោយសារភាពយឺតរបស់វាផ្ទាល់។ ដើម្បីមើលវត្ថុនៅឆ្ងាយ សាច់ដុំបន្ធូរ សរសៃចំណងតឹង ហើយកែវភ្នែកសំប៉ែត។",
      formula: "Near object: muscle contracts → lens rounder; Far object: muscle relaxes → lens flatter", formulaKm: "វត្ថុជិត៖ សាច់ដុំកន្ត្រាក់ → កែវមូល; វត្ថុឆ្ងាយ៖ សាច់ដុំបន្ធូរ → កែវសំប៉ែត",
      chapter: "Sensory Physiology", chapterKm: "សរីរាង្គវិញ្ញាណ" },
    { topic: "Path of hearing", topicKm: "ផ្លូវនៃការស្តាប់", difficulty: "Medium",
      prompt: "In which structure of the inner ear is hearing actually generated from sound-wave vibrations?", promptKm: "តើសំណុំណាមួយនៃត្រចៀកខាងក្នុង ដែលការស្តាប់ត្រូវបានបង្កើតឡើងជាក់ស្តែងពីរំញ័ររលកសំឡេង?",
      options: ["The cochlea (spiral tube)", "The semicircular canals", "The eardrum", "The outer ear flap"], answer: "The cochlea (spiral tube)",
      optionsKm: ["បំពង់រាងគូទខ្យង (កូគីលេអា)", "បំពង់រាងពាក់កណ្តាលរង្វង់", "ភ្នាសត្រចៀក", "សន្លឹកត្រចៀកខាងក្រៅ"], answerKm: "បំពង់រាងគូទខ្យង (កូគីលេអា)",
      explanation: "Sound waves make the eardrum vibrate; the three tiny middle-ear bones pass this vibration to the oval window, which makes fluid in the cochlea vibrate. Hair cells lining the cochlea convert this vibration into nerve impulses sent to the brain, where hearing is generated.", explanationKm: "រលកសំឡេងធ្វើឲ្យភ្នាសត្រចៀកញ័រ ឆ្អឹងតូចៗទាំងបីរបស់ត្រចៀកកណ្តាលបញ្ជូនញ័រនេះទៅបង្អួចរាងពងក្រពើ ធ្វើឲ្យសារធាតុរាវក្នុងបំពង់គូទខ្យងញ័រ។ កោសិកាមានរោមតាមបណ្តោយបំពង់គូទខ្យង បំលែងញ័រនេះទៅជាសញ្ញាប្រសាទបញ្ជូនទៅខួរក្បាល ជាកន្លែងដែលការស្តាប់ត្រូវបានបង្កើតឡើងជាក់ស្តែង។",
      formula: "Eardrum → middle-ear bones → cochlea (fluid vibrates) → hair cells → brain", formulaKm: "ភ្នាសត្រចៀក → ឆ្អឹងត្រចៀកកណ្តាល → គូទខ្យង (រាវញ័រ) → កោសិការោម → ខួរក្បាល",
      chapter: "Sensory Physiology", chapterKm: "សរីរាង្គវិញ្ញាណ" },
    { topic: "Balance and the semicircular canals", topicKm: "លំនឹង និងបំពង់រាងពាក់កណ្តាលរង្វង់", difficulty: "Medium",
      prompt: "Which structure of the inner ear helps the body maintain balance?", promptKm: "តើសំណុំណាមួយនៃត្រចៀកខាងក្នុងជួយឲ្យរាងកាយរក្សាលំនឹង?",
      options: ["The semicircular canals", "The cochlea", "The eardrum", "The ear canal"], answer: "The semicircular canals",
      optionsKm: ["បំពង់រាងពាក់កណ្តាលរង្វង់", "បំពង់គូទខ្យង", "ភ្នាសត្រចៀក", "រន្ធត្រចៀក"], answerKm: "បំពង់រាងពាក់កណ្តាលរង្វង់",
      explanation: "The three fluid-filled semicircular canals, oriented in different planes, detect rotation and movement of the head; combined with input from the cerebellum, this keeps the body balanced.", explanationKm: "បំពង់រាងពាក់កណ្តាលរង្វង់ទាំងបី ដែលពោរពេញដោយសារធាតុរាវ និងតម្រង់ទិសផ្សេងគ្នា ចាប់យកចលនាបង្វិល និងចលនាក្បាល រួមជាមួយព័ត៌មានពីខួរតូច ជួយរក្សាលំនឹងរាងកាយ។",
      formula: "Semicircular canals + cerebellum → body balance", formulaKm: "បំពង់ពាក់កណ្តាលរង្វង់ + ខួរតូច → លំនឹងរាងកាយ",
      chapter: "Sensory Physiology", chapterKm: "សរីរាង្គវិញ្ញាណ" },
    { topic: "The five basic tastes", topicKm: "រសជាតិមូលដ្ឋានទាំងប្រាំ", difficulty: "Easy",
      prompt: "Taste buds on the tongue detect different tastes in different regions. Which area typically detects sweetness?", promptKm: "ក្រពេញរសជាតិនៅលើអណ្តាតញែកចាប់រសជាតិផ្សេងៗគ្នាតាមតំបន់។ តើតំបន់ណាជាទូទៅចាប់រសជាតិផ្អែម?",
      options: ["The tip of the tongue", "The base of the tongue", "The sides of the tongue", "Nowhere on the tongue"], answer: "The tip of the tongue",
      optionsKm: ["ចុងអណ្តាត", "គល់អណ្តាត", "ចំហៀងអណ្តាតទាំងសងខាង", "គ្មាននៅត្រង់ណានៅលើអណ្តាតទេ"], answerKm: "ចុងអណ្តាត",
      explanation: "Different regions of the tongue are most sensitive to different tastes: the tip detects sweet, the back detects bitter, and the sides detect salty (front) and sour (back).", explanationKm: "តំបន់ផ្សេងគ្នានៃអណ្តាតរសួនឹងរសជាតិផ្សេងគ្នា៖ ចុងអណ្តាតចាប់រសផ្អែម គល់អណ្តាតចាប់រសល្វីង ចំហៀងខាងមុខចាប់រសប្រៃ និងចំហៀងខាងក្រោយចាប់រសជូរ។",
      formula: "Tip: sweet; sides: salty/sour; back: bitter", formulaKm: "ចុង៖ ផ្អែម; ចំហៀង៖ ប្រៃ/ជូរ; គល់៖ ល្វីង",
      chapter: "Sensory Physiology", chapterKm: "សរីរាង្គវិញ្ញាណ" },
    { topic: "Smell and taste linked", topicKm: "ទំនាក់ទំនងរវាងក្លិន និងរសជាតិ", difficulty: "Medium",
      prompt: "Why does food taste bland when you have a cold and a stuffy nose?", promptKm: "ហេតុអ្វីបានជាអាហារមានរសជាតិសាបនៅពេលអ្នកផ្តាសាយ និងច្រមុះស្ទះ?",
      options: ["Mucus blocks the olfactory receptor cells in the nose, so smell can't function properly to combine with taste", "The tongue stops working completely", "The stomach stops digesting food", "The ears become blocked"], answer: "Mucus blocks the olfactory receptor cells in the nose, so smell can't function properly to combine with taste",
      optionsKm: ["សំបូរស្លសមស្ទះកោសិកាឃានវិញ្ញាណក្នុងច្រមុះ ធ្វើឲ្យក្លិនមិនអាចបំពេញនាទីរួមជាមួយរសជាតិបានត្រឹមត្រូវ", "អណ្តាតឈប់ដំណើរការទាំងស្រុង", "ក្រពះឈប់រំលាយអាហារ", "ត្រចៀកស្ទះ"], answerKm: "សំបូរស្លសមស្ទះកោសិកាឃានវិញ្ញាណក្នុងច្រមុះ ធ្វើឲ្យក្លិនមិនអាចបំពេញនាទីរួមជាមួយរសជាតិបានត្រឹមត្រូវ",
      explanation: "The flavor of food depends on both the taste sense (tongue) and the smell sense (nose) working together. When a cold clogs the nasal mucus layer, the olfactory receptor cells can't detect food's aroma properly, so eating feels bland.", explanationKm: "រសជាតិនៃអាហារពឹងផ្អែកលើទាំងវិញ្ញាណរសជាតិ (អណ្តាត) និងវិញ្ញាណក្លិន (ច្រមុះ) ដែលធ្វើការរួមគ្នា។ ពេលផ្តាសាយស្ទះស្រទាប់ស្លសក្នុងច្រមុះ កោសិកាឃានវិញ្ញាណមិនអាចចាប់ក្លិនអាហារបានត្រឹមត្រូវ ធ្វើឲ្យញ៉ាំមានអារម្មណ៍សាប។",
      formula: "Flavor = taste (tongue) + smell (nose) combined", formulaKm: "រសជាតិ = រស (អណ្តាត) + ក្លិន (ច្រមុះ) រួមគ្នា",
      chapter: "Sensory Physiology", chapterKm: "សរីរាង្គវិញ្ញាណ" },
    { topic: "Skin sensory receptors", topicKm: "អង្គជាវិញ្ញាណនៃស្បែក", difficulty: "Medium",
      prompt: "The skin contains five main types of sensory receptors. What do they detect?", promptKm: "ស្បែកមានអង្គជាវិញ្ញាណចម្បងប្រាំប្រភេទ។ តើពួកវាចាប់អ្វីខ្លះ?",
      options: ["Touch/pressure, contact, cold, heat, and pain", "Only pain", "Only temperature", "Sound waves"], answer: "Touch/pressure, contact, cold, heat, and pain",
      optionsKm: ["ការប៉ះទង្គិច សម្ពាធ ត្រជាក់ កំដៅ និងឈឺចាប់", "ឈឺចាប់តែប៉ុណ្ណោះ", "សីតុណ្ហភាពតែប៉ុណ្ណោះ", "រលកសំឡេង"], answerKm: "ការប៉ះទង្គិច សម្ពាធ ត្រជាក់ កំដៅ និងឈឺចាប់",
      explanation: "The skin's five types of sensory corpuscles each respond to a specific stimulus: light touch/contact, pressure, cold, heat, and pain — together giving the skin its full sense of touch.", explanationKm: "អង្គជាវិញ្ញាណប្រាំប្រភេទរបស់ស្បែក នីមួយៗឆ្លើយតបនឹងកម្លាំងជំរុញជាក់លាក់៖ ការប៉ះស្រាល ការប៉ះទង្គិច សម្ពាធ ត្រជាក់ កំដៅ និងឈឺចាប់ ដែលរួមគ្នាផ្តល់ស្បែកនូវអារម្មណ៍ប៉ះពេញលេញ។",
      formula: "Skin receptors: touch + pressure + cold + heat + pain", formulaKm: "អង្គជាវិញ្ញាណស្បែក៖ ប៉ះ + សម្ពាធ + ត្រជាក់ + កំដៅ + ឈឺចាប់",
      chapter: "Sensory Physiology", chapterKm: "សរីរាង្គវិញ្ញាណ" },
    { topic: "Exocrine vs endocrine glands", topicKm: "ក្រពេញអិចសូគ្រីន ធៀបនឹងអង់ដូគ្រីន", difficulty: "Medium",
      prompt: "What is the key difference between an exocrine gland and an endocrine gland?", promptKm: "តើភាពខុសគ្នាសំខាន់រវាងក្រពេញអិចសូគ្រីន និងក្រពេញអង់ដូគ្រីនជាអ្វី?",
      options: ["Exocrine glands release their product through a duct; endocrine glands release hormones directly into the bloodstream with no duct", "Exocrine glands only exist in plants", "Endocrine glands only produce sweat", "There is no real difference"], answer: "Exocrine glands release their product through a duct; endocrine glands release hormones directly into the bloodstream with no duct",
      optionsKm: ["ក្រពេញអិចសូគ្រីនបញ្ចេញផលិតផលតាមបំពង់នាំ; ក្រពេញអង់ដូគ្រីនបញ្ចេញអរម៉ូនផ្ទាល់ទៅក្នុងចរន្តឈាមដោយគ្មានបំពង់នាំ", "ក្រពេញអិចសូគ្រីនមានតែក្នុងរុក្ខជាតិប៉ុណ្ណោះ", "ក្រពេញអង់ដូគ្រីនផលិតតែញើសប៉ុណ្ណោះ", "គ្មានភាពខុសគ្នាពិតប្រាកដទេ"], answerKm: "ក្រពេញអិចសូគ្រីនបញ្ចេញផលិតផលតាមបំពង់នាំ; ក្រពេញអង់ដូគ្រីនបញ្ចេញអរម៉ូនផ្ទាល់ទៅក្នុងចរន្តឈាមដោយគ្មានបំពង់នាំ",
      explanation: "Exocrine glands (like sweat and salivary glands) secrete substances outside the body or into a cavity through a duct. Endocrine glands (like the thyroid and pituitary) have no duct and release hormones directly into the blood.", explanationKm: "ក្រពេញអិចសូគ្រីន (ដូចជាក្រពេញញើស និងទឹកមាត់) បញ្ចេញសារធាតុទៅក្រៅរាងកាយ ឬចូលក្នុងប្រហោងតាមបំពង់នាំ។ ក្រពេញអង់ដូគ្រីន (ដូចជាក្រពេញទីរ៉ូអ៊ីត និងអុីបូភីស) គ្មានបំពង់នាំទេ ហើយបញ្ចេញអរម៉ូនផ្ទាល់ទៅក្នុងឈាម។",
      formula: "Exocrine: duct → outside; Endocrine: no duct → bloodstream", formulaKm: "អិចសូគ្រីន៖ បំពង់នាំ → ក្រៅ; អង់ដូគ្រីន៖ គ្មានបំពង់ → ចរន្តឈាម",
      chapter: "Endocrine System", chapterKm: "ប្រព័ន្ធអង់ដូគ្រីន" },
    { topic: "The hypothalamus and pituitary", topicKm: "អុីបូតាឡាមុស និងអុីបូភីស", difficulty: "Medium",
      prompt: "Which gland is often called the \"master gland\" because the hypothalamus uses it to control the release of hormones from other endocrine glands?", promptKm: "តើក្រពេញមួយណាត្រូវបានហៅថា \"ក្រពេញមេ\" ព្រោះអុីបូតាឡាមុសប្រើវាដើម្បីគ្រប់គ្រងការបញ្ចេញអរម៉ូនរបស់ក្រពេញអង់ដូគ្រីនផ្សេងទៀត?",
      options: ["The pituitary gland", "The pancreas", "The adrenal gland", "The thymus"], answer: "The pituitary gland",
      optionsKm: ["ក្រពេញអុីបូភីស", "លំពែង", "ក្រពេញលើតម្រងនោម", "ក្រពេញទីមុស"], answerKm: "ក្រពេញអុីបូភីស",
      explanation: "The hypothalamus controls the anterior pituitary's hormone release (e.g. TSH controls the thyroid, ACTH controls the adrenal cortex), and stores/releases two hormones made by the hypothalamus (ADH and oxytocin) from its posterior lobe — making the pituitary the body's central hormonal relay.", explanationKm: "អុីបូតាឡាមុសគ្រប់គ្រងការបញ្ចេញអរម៉ូនរបស់អុីបូភីសមុខ (ឧ. TSH គ្រប់គ្រងក្រពេញទីរ៉ូអ៊ីត ACTH គ្រប់គ្រងក្រពេញលើតម្រងនោម) ហើយសន្សំ/បញ្ចេញអរម៉ូនពីរដែលផលិតដោយអុីបូតាឡាមុស (ADH និងអុកស៊ីតូស៊ីន) ពីអុីបូភីសក្រោយ ធ្វើឲ្យអុីបូភីសជាចំណុចផ្ទេរអរម៉ូនកណ្តាលរបស់រាងកាយ។",
      formula: "Hypothalamus → controls → pituitary → controls → other glands", formulaKm: "អុីបូតាឡាមុស → គ្រប់គ្រង → អុីបូភីស → គ្រប់គ្រង → ក្រពេញផ្សេងទៀត",
      chapter: "Endocrine System", chapterKm: "ប្រព័ន្ធអង់ដូគ្រីន" },
    { topic: "Growth hormone", topicKm: "អរម៉ូនលូតលាស់", difficulty: "Medium",
      prompt: "What happens if the anterior pituitary secretes too much growth hormone (GH) during childhood?", promptKm: "តើមានអ្វីកើតឡើង បើអុីបូភីសមុខបញ្ចេញអរម៉ូនលូតលាស់ (GH) ច្រើនពេកក្នុងវ័យកុមារភាព?",
      options: ["The child grows abnormally tall (gigantism)", "The child stops growing entirely", "The child's bones become soft", "The child loses their sense of taste"], answer: "The child grows abnormally tall (gigantism)",
      optionsKm: ["កុមារកាលយទៅជាមនុស្សដំឡោក (ខ្ពស់ពិសេស)", "កុមារឈប់លូតលាស់ទាំងស្រុង", "ឆ្អឹងកុមារទៅជាទន់", "កុមារបាត់បង់ការញ៉ាំរសជាតិ"], answerKm: "កុមារកាលយទៅជាមនុស្សដំឡោក (ខ្ពស់ពិសេស)",
      explanation: "Growth hormone (GH) affects bone and cartilage growth as well as protein, glucose and lipid metabolism. Too little GH in childhood causes dwarfism (a person of unusually short stature), while too much causes gigantism (unusually tall stature).", explanationKm: "អរម៉ូនលូតលាស់ (GH) ជះឥទ្ធិពលលើការលូតលាស់ឆ្អឹង និងខ្សែឆ្អឹងខ្ចី ព្រមទាំងតំណរនីតិកម្មប្រូតេអ៊ីន គ្លុយកូស និងលីពីត។ GH តិចពេកក្នុងវ័យកុមារភាព ធ្វើឲ្យក្លាយជាមនុស្សក្រិន (តូចពិសេស) ចំណែកឯច្រើនពេកធ្វើឲ្យក្លាយជាមនុស្សដំឡោក (ខ្ពស់ពិសេស)។",
      formula: "Too little GH → dwarfism; Too much GH → gigantism", formulaKm: "GH តិចពេក → មនុស្សក្រិន; GH ច្រើនពេក → មនុស្សដំឡោក",
      chapter: "Endocrine System", chapterKm: "ប្រព័ន្ធអង់ដូគ្រីន" },
    { topic: "ADH and water balance", topicKm: "ADH និងតុល្យភាពទឹក", difficulty: "Hard",
      prompt: "What does antidiuretic hormone (ADH), released by the posterior pituitary, do when the blood becomes too concentrated?", promptKm: "តើអរម៉ូន ADH ដែលបញ្ចេញដោយអុីបូភីសក្រោយ ធ្វើអ្វី ពេលឈាមកាន់តែខាប់?",
      options: ["It makes the kidneys reabsorb more water, concentrating the urine", "It makes the kidneys release more water, diluting the urine", "It stops kidney function entirely", "It has no effect on the kidneys"], answer: "It makes the kidneys reabsorb more water, concentrating the urine",
      optionsKm: ["ធ្វើឲ្យតម្រងនោមស្រូបទឹកមកវិញច្រើន ធ្វើឲ្យទឹកនោមខាប់ជាង", "ធ្វើឲ្យតម្រងនោមបញ្ចេញទឹកច្រើន ធ្វើឲ្យទឹកនោមស្ដើងជាង", "បញ្ឈប់មុខងារតម្រងនោមទាំងស្រុង", "គ្មានឥទ្ធិពលលើតម្រងនោមទេ"], answerKm: "ធ្វើឲ្យតម្រងនោមស្រូបទឹកមកវិញច្រើន ធ្វើឲ្យទឹកនោមខាប់ជាង",
      explanation: "When blood becomes concentrated (too little water), osmoreceptor neurons trigger the release of ADH, which makes the kidneys reabsorb more water from the collecting ducts back into the blood — concentrating the urine. Once the blood is diluted again, ADH release stops. This is a classic example of negative-feedback control.", explanationKm: "ពេលឈាមកាន់តែខាប់ (ទឹកតិចពេក) ណឺរូនរសួនឹងសម្ពាធអូស្មូសជំរុញឲ្យបញ្ចេញ ADH ដែលធ្វើឲ្យតម្រងនោមស្រូបទឹកមកវិញច្រើនពីបំពង់ប្រមូលទៅឈាម ធ្វើឲ្យទឹកនោមខាប់ជាង។ ពេលឈាមស្ដើងវិញ ការបញ្ចេញ ADH ឈប់។ នេះជាឧទាហរណ៍បុរាណនៃការត្រួតពិនិត្យតាមមតិត្រឡប់អវិជ្ជមាន។",
      formula: "Blood too concentrated → ADH released → kidneys reabsorb water", formulaKm: "ឈាមខាប់ → បញ្ចេញ ADH → តម្រងនោមស្រូបទឹកមកវិញ",
      chapter: "Endocrine System", chapterKm: "ប្រព័ន្ធអង់ដូគ្រីន" },
    { topic: "Oxytocin's roles", topicKm: "តួនាទីអុកស៊ីតូស៊ីន", difficulty: "Medium",
      prompt: "Which hormone triggers uterine muscle contractions during childbirth and also causes milk to be released during breastfeeding?", promptKm: "តើអរម៉ូនមួយណាបណ្តាលឲ្យសាច់ដុំស្បូនកន្ត្រាក់ពេលសម្រាលកូន ហើយក៏បណ្តាលឲ្យបញ្ចេញទឹកដោះពេលបំបៅកូនផងដែរ?",
      options: ["Oxytocin", "Prolactin", "Growth hormone", "Thyroxine"], answer: "Oxytocin",
      optionsKm: ["អុកស៊ីតូស៊ីន", "ប្រូឡាក់ទីន", "អរម៉ូនលូតលាស់", "ទីរុកស៊ីន"], answerKm: "អុកស៊ីតូស៊ីន",
      explanation: "Oxytocin, released by the posterior pituitary, triggers strong uterine contractions to push the baby out during delivery, and also causes the smooth muscle around milk-producing cells to contract, releasing milk through small ducts at the nipple during breastfeeding.", explanationKm: "អុកស៊ីតូស៊ីន ដែលបញ្ចេញដោយអុីបូភីសក្រោយ បណ្តាលឲ្យស្បូនកន្ត្រាក់ខ្លាំងជំរុញទារកចេញពេលសម្រាល ហើយក៏បណ្តាលឲ្យសាច់ដុំរលើងជុំវិញកោសិកាផលិតទឹកដោះកន្ត្រាក់ បញ្ចេញទឹកដោះតាមរន្ធតូចៗនៅចុងដោះពេលបំបៅកូន។",
      formula: "Oxytocin: uterine contraction (birth) + milk release (breastfeeding)", formulaKm: "អុកស៊ីតូស៊ីន៖ ស្បូនកន្ត្រាក់ (សម្រាល) + បញ្ចេញទឹកដោះ (បំបៅ)",
      chapter: "Endocrine System", chapterKm: "ប្រព័ន្ធអង់ដូគ្រីន" },
    { topic: "Thyroid hormones", topicKm: "អរម៉ូនក្រពេញទីរ៉ូអ៊ីត", difficulty: "Medium",
      prompt: "Which thyroid hormone raises the metabolic rate of proteins, glucose, and fats?", promptKm: "តើអរម៉ូនក្រពេញទីរ៉ូអ៊ីតមួយណាបង្កើនអត្រានីតិកម្មប្រូតេអ៊ីន គ្លុយកូស និងខ្លាញ់?",
      options: ["Thyroxine", "Calcitonin", "Parathyroid hormone", "Insulin"], answer: "Thyroxine",
      optionsKm: ["ទីរុកស៊ីន", "កាល់ស៊ីតូនីន", "អរម៉ូនប៉ារ៉ាទីរ៉ូអ៊ីត", "អាំងស៊ុយលីន"], answerKm: "ទីរុកស៊ីន",
      explanation: "The thyroid gland releases two hormones: thyroxine, which increases the metabolic rate of proteins, glucose and fats, and calcitonin, which regulates blood calcium by directing excess calcium to be stored in bone.", explanationKm: "ក្រពេញទីរ៉ូអ៊ីតបញ្ចេញអរម៉ូនពីរ៖ ទីរុកស៊ីន ដែលបង្កើនអត្រានីតិកម្មប្រូតេអ៊ីន គ្លុយកូស និងខ្លាញ់ និងកាល់ស៊ីតូនីន ដែលគ្រប់គ្រងកាល់ស្យូមក្នុងឈាមដោយចាប់យកកាល់ស្យូមលើសទៅសន្សំក្នុងឆ្អឹង។",
      formula: "Thyroxine: raises metabolism; Calcitonin: lowers blood calcium", formulaKm: "ទីរុកស៊ីន៖ បង្កើននីតិកម្ម; កាល់ស៊ីតូនីន៖ បន្ថយកាល់ស្យូមក្នុងឈាម",
      chapter: "Endocrine System", chapterKm: "ប្រព័ន្ធអង់ដូគ្រីន" },
    { topic: "Iodine deficiency", topicKm: "កង្វះជាតិអុីយ៉ូត", difficulty: "Hard",
      prompt: "Why does a diet lacking iodine cause the thyroid gland to swell, a condition known as goiter?", promptKm: "ហេតុអ្វីបានជាការទទួលទានអាហារខ្វះជាតិអុីយ៉ូត ធ្វើឲ្យក្រពេញទីរ៉ូអ៊ីតរីកធំ ជំងឺដែលហៅថាពកក?",
      options: ["Low thyroxine keeps triggering TSH release, which keeps stimulating the thyroid to grow even though it still can't produce thyroxine without iodine", "Iodine makes the thyroid shrink", "The pituitary stops working completely without iodine", "Excess iodine always causes goiter, never a deficiency"], answer: "Low thyroxine keeps triggering TSH release, which keeps stimulating the thyroid to grow even though it still can't produce thyroxine without iodine",
      optionsKm: ["ទីរុកស៊ីនទាបបន្តជំរុញឲ្យបញ្ចេញ TSH ដែលបន្តជំរុញក្រពេញទីរ៉ូអ៊ីតឲ្យរីកធំ ទោះបីជានៅតែមិនអាចផលិតទីរុកស៊ីនដោយគ្មានអុីយ៉ូត", "អុីយ៉ូតធ្វើឲ្យក្រពេញទីរ៉ូអ៊ីតរួមតូច", "អុីបូភីសឈប់ដំណើរការទាំងស្រុងដោយគ្មានអុីយ៉ូត", "អុីយ៉ូតលើសតែងតែបណ្តាលឲ្យពកកជានិច្ច មិនមែនកង្វះទេ"], answerKm: "ទីរុកស៊ីនទាបបន្តជំរុញឲ្យបញ្ចេញ TSH ដែលបន្តជំរុញក្រពេញទីរ៉ូអ៊ីតឲ្យរីកធំ ទោះបីជានៅតែមិនអាចផលិតទីរុកស៊ីនដោយគ្មានអុីយ៉ូត",
      explanation: "Low blood thyroxine causes the hypothalamus and pituitary to keep releasing TRH and TSH to stimulate the thyroid. But without iodine, the thyroid still can't make thyroxine, so it keeps enlarging under the constant stimulation — producing a goiter.", explanationKm: "ទីរុកស៊ីនទាបក្នុងឈាម ធ្វើឲ្យអុីបូតាឡាមុស និងអុីបូភីសបន្តបញ្ចេញ TRH និង TSH ដើម្បីជំរុញក្រពេញទីរ៉ូអ៊ីត។ ប៉ុន្តែដោយគ្មានអុីយ៉ូត ក្រពេញទីរ៉ូអ៊ីតនៅតែមិនអាចផលិតទីរុកស៊ីនបាន ទើបវារីកធំឡើងៗក្រោមការជំរុញជាប់លាប់ បណ្តាលឲ្យកើតជំងឺពកក។",
      formula: "No iodine → no thyroxine → TSH keeps rising → thyroid enlarges (goiter)", formulaKm: "គ្មានអុីយ៉ូត → គ្មានទីរុកស៊ីន → TSH កើនឡើងជានិច្ច → ក្រពេញទីរ៉ូអ៊ីតរីកធំ (ពកក)",
      chapter: "Endocrine System", chapterKm: "ប្រព័ន្ធអង់ដូគ្រីន" },
    { topic: "Adrenaline (epinephrine)", topicKm: "អរម៉ូនអេពីណេហ្វ្រីន", difficulty: "Medium",
      prompt: "Which adrenal hormone is released in response to sudden danger, causing a racing heartbeat and a rush of energy (the \"fight or flight\" response)?", promptKm: "តើអរម៉ូនក្រពេញលើតម្រងនោមមួយណាបញ្ចេញនៅពេលប្រឈមគ្រោះថ្នាក់ភ្លាមៗ ធ្វើឲ្យបេះដូងលោតលឿន និងមានថាមពលភ្លាមៗ (ឆ្លើយតបប្រយុទ្ធ ឬរត់គេច)?",
      options: ["Adrenaline (epinephrine)", "Cortisol", "Aldosterone", "Insulin"], answer: "Adrenaline (epinephrine)",
      optionsKm: ["អាដ្រេណាលីន (អេពីណេហ្វ្រីន)", "កត់ទីសូល", "អាល់ដូស្តេរូន", "អាំងស៊ុយលីន"], answerKm: "អាដ្រេណាលីន (អេពីណេហ្វ្រីន)",
      explanation: "The adrenal medulla releases adrenaline (epinephrine) in response to fear or a sudden threat — such as an angry dog chasing you — producing a faster heartbeat and quick energy so the body can respond or flee.", explanationKm: "ខួរក្រពេញលើតម្រងនោមបញ្ចេញអាដ្រេណាលីន (អេពីណេហ្វ្រីន) ឆ្លើយតបនឹងការភ័យខ្លាច ឬការគំរាមកំហែងភ្លាមៗ ដូចជាឆ្កែខឹងដេញ ធ្វើឲ្យបេះដូងលោតលឿន និងផ្តល់ថាមពលភ្លាមៗ ដើម្បីរាងកាយអាចឆ្លើយតប ឬរត់គេច។",
      formula: "Sudden danger → adrenal medulla → adrenaline → fast heartbeat + energy", formulaKm: "គ្រោះថ្នាក់ភ្លាមៗ → ខួរក្រពេញលើតម្រងនោម → អាដ្រេណាលីន → បេះដូងលឿន + ថាមពល",
      chapter: "Endocrine System", chapterKm: "ប្រព័ន្ធអង់ដូគ្រីន" },
    { topic: "Insulin and glucagon", topicKm: "អាំងស៊ុយលីន និងគ្លុយកាកុង", difficulty: "Medium",
      prompt: "The pancreas releases two opposing hormones to control blood glucose. Which one lowers blood glucose after a meal?", promptKm: "លំពែងបញ្ចេញអរម៉ូនពីរដែលផ្ទុយគ្នាដើម្បីគ្រប់គ្រងគ្លុយកូសក្នុងឈាម។ តើមួយណាបន្ថយគ្លុយកូសក្នុងឈាមក្រោយពេលបរិភោគ?",
      options: ["Insulin, released by beta cells", "Glucagon, released by alpha cells", "Thyroxine", "Adrenaline"], answer: "Insulin, released by beta cells",
      optionsKm: ["អាំងស៊ុយលីន បញ្ចេញដោយកោសិកាបេតា", "គ្លុយកាកុង បញ្ចេញដោយកោសិកាអាល់ហ្វា", "ទីរុកស៊ីន", "អាដ្រេណាលីន"], answerKm: "អាំងស៊ុយលីន បញ្ចេញដោយកោសិកាបេតា",
      explanation: "When blood glucose rises, beta cells in the pancreas's islets of Langerhans release insulin, which makes target cells (liver, muscle, fat) take up glucose for use or storage, lowering blood glucose. When glucose falls too low, alpha cells release glucagon, which raises it back up.", explanationKm: "ពេលគ្លុយកូសក្នុងឈាមឡើងខ្ពស់ កោសិកាបេតានៅក្នុងអុីឡូតដឺឡង់ហែរង់របស់លំពែង បញ្ចេញអាំងស៊ុយលីន ដែលធ្វើឲ្យកោសិកាគោលដៅ (ថ្លើម សាច់ដុំ ខ្លាញ់) ស្រូបយកគ្លុយកូសទៅប្រើ ឬសន្សំ ធ្វើឲ្យគ្លុយកូសក្នុងឈាមធ្លាក់ចុះ។ ពេលគ្លុយកូសទាបពេក កោសិកាអាល់ហ្វាបញ្ចេញគ្លុយកាកុង ធ្វើឲ្យវាឡើងវិញ។",
      formula: "High glucose → insulin (lowers); Low glucose → glucagon (raises)", formulaKm: "គ្លុយកូសខ្ពស់ → អាំងស៊ុយលីន (បន្ថយ); គ្លុយកូសទាប → គ្លុយកាកុង (បង្កើន)",
      chapter: "Endocrine System", chapterKm: "ប្រព័ន្ធអង់ដូគ្រីន" },
    { topic: "Diabetes and insulin deficiency", topicKm: "ជំងឺទឹកនោមផ្អែម និងកង្វះអាំងស៊ុយលីន", difficulty: "Hard",
      prompt: "What condition results from a deficiency of insulin?", promptKm: "តើកង្វះអាំងស៊ុយលីនបណ្តាលឲ្យកើតជំងឺអ្វី?",
      options: ["Diabetes mellitus, where excess glucose is excreted in the urine", "Gigantism", "Goiter", "Osteoporosis only"], answer: "Diabetes mellitus, where excess glucose is excreted in the urine",
      optionsKm: ["ជំងឺទឹកនោមផ្អែម ដែលគ្លុយកូសលើសបញ្ចេញតាមទឹកនោម", "ជំងឺមនុស្សដំឡោក", "ជំងឺពកក", "ជំងឺឆ្អឹងស្តើងតែប៉ុណ្ណោះ"], answerKm: "ជំងឺទឹកនោមផ្អែម ដែលគ្លុយកូសលើសបញ្ចេញតាមទឹកនោម",
      explanation: "Without enough insulin, blood glucose rises too high for the kidneys to reabsorb it all, so glucose is excreted in the urine — a hallmark of diabetes mellitus.", explanationKm: "ដោយគ្មានអាំងស៊ុយលីនគ្រប់គ្រាន់ គ្លុយកូសក្នុងឈាមឡើងខ្ពស់ពេក ធ្វើឲ្យតម្រងនោមមិនអាចស្រូបយកមកវិញបានទាំងអស់ ទើបបញ្ចេញគ្លុយកូសតាមទឹកនោម ដែលជាសញ្ញាចម្បងនៃជំងឺទឹកនោមផ្អែម។",
      formula: "Insulin deficiency → high blood glucose → glucose in urine (diabetes)", formulaKm: "កង្វះអាំងស៊ុយលីន → គ្លុយកូសឈាមខ្ពស់ → គ្លុយកូសក្នុងទឹកនោម (ទឹកនោមផ្អែម)",
      chapter: "Endocrine System", chapterKm: "ប្រព័ន្ធអង់ដូគ្រីន" },
    { topic: "Amino acid structure", topicKm: "រចនាសម្ព័ន្ធអាស៊ីតអាមីណេ", difficulty: "Medium",
      prompt: "Every amino acid molecule is built from a carboxyl group, an amine group, and one other part. What is that third part?", promptKm: "គ្រប់ម៉ូលេគុលអាស៊ីតអាមីណេសុទ្ធតែផ្សំពីបណ្តុំកាបុកស៊ីល បណ្តុំអាមីន និងផ្នែកមួយទៀត។ តើផ្នែកទីបីនោះជាអ្វី?",
      options: ["A variable side chain (R group)", "A second carboxyl group always", "A sugar molecule", "A phosphate group"], answer: "A variable side chain (R group)",
      optionsKm: ["រ៉ាឌីកាល R ដែលប្រែប្រួល", "បណ្តុំកាបុកស៊ីលទីពីរជានិច្ច", "ម៉ូលេគុលសករ", "បណ្តុំផូស្វាត"], answerKm: "រ៉ាឌីកាល R ដែលប្រែប្រួល",
      explanation: "Every amino acid has a carboxyl group (-COOH), an amine group (-NH2), and a variable side chain called the R group (radical), which is what makes the 20 amino acids different from one another.", explanationKm: "អាស៊ីតអាមីណេនីមួយៗមានបណ្តុំកាបុកស៊ីល (-COOH) បណ្តុំអាមីន (-NH2) និងរ៉ាឌីកាល R ដែលប្រែប្រួល ជាអ្វីដែលធ្វើឲ្យអាស៊ីតអាមីណេទាំង២០ខុសគ្នា។",
      formula: "Amino acid = -COOH + -NH2 + R group", formulaKm: "អាស៊ីតអាមីណេ = -COOH + -NH2 + រ៉ាឌីកាល R",
      chapter: "Amino Acids & Proteins", chapterKm: "អាស៊ីតអាមីណេ និងប្រូតេអ៊ីន" },
    { topic: "20 amino acids", topicKm: "អាស៊ីតអាមីណេ ២០ប្រភេទ", difficulty: "Easy",
      prompt: "How many different types of amino acids are found in the cells of living organisms?", promptKm: "តើមានអាស៊ីតអាមីណេប៉ុន្មានប្រភេទផ្សេងគ្នាដែលមាននៅក្នុងកោសិការបស់សារពាង្គកាយរស់?",
      options: ["20", "4", "64", "100"], answer: "20",
      optionsKm: ["២០", "៤", "៦៤", "១០០"], answerKm: "២០",
      explanation: "There are 20 standard amino acids in living cells, each distinguished only by the structure of its R group (radical).", explanationKm: "មានអាស៊ីតអាមីណេស្តង់ដារចំនួន២០ក្នុងកោសិការស់ ដែលនីមួយៗខុសគ្នាដោយសារតែរ៉ាឌីកាល R តែប៉ុណ្ណោះ។",
      formula: "20 standard amino acids, distinguished by R group", formulaKm: "អាស៊ីតអាមីណេស្តង់ដារ ២០ប្រភេទ ខុសគ្នាដោយ R",
      chapter: "Amino Acids & Proteins", chapterKm: "អាស៊ីតអាមីណេ និងប្រូតេអ៊ីន" },
    { topic: "Peptide bonds", topicKm: "ចំណងពិបទីត", difficulty: "Medium",
      prompt: "A peptide bond forms between two amino acids by releasing what byproduct?", promptKm: "ចំណងពិបទីតបង្កើតឡើងរវាងអាស៊ីតអាមីណេពីរ ដោយបញ្ចេញផលិតផលរងអ្វី?",
      options: ["A water molecule", "A carbon dioxide molecule", "An oxygen molecule", "A glucose molecule"], answer: "A water molecule",
      optionsKm: ["ម៉ូលេគុលទឹក", "ម៉ូលេគុលកាបូនឌីអុកស៊ីត", "ម៉ូលេគុលអុកសីសែន", "ម៉ូលេគុលគ្លុយកូស"], answerKm: "ម៉ូលេគុលទឹក",
      explanation: "A peptide bond is a covalent bond formed between the carboxyl group of one amino acid and the amine group of another, releasing one water molecule — a dehydration (condensation) reaction.", explanationKm: "ចំណងពិបទីតជាសម្ព័ន្ធកូវ៉ាឡង់ដែលបង្កើតឡើងរវាងបណ្តុំកាបុកស៊ីលនៃអាស៊ីតអាមីណេមួយ និងបណ្តុំអាមីននៃអាស៊ីតអាមីណេមួយទៀត ដោយបញ្ចេញម៉ូលេគុលទឹកមួយ ជាប្រតិកម្មដេអ៊ីស្ដ្រាតកម្ម (ការផ្សំដោយបំបាត់ទឹក)។",
      formula: "Amino acid + Amino acid → dipeptide + H2O", formulaKm: "អាស៊ីតអាមីណេ + អាស៊ីតអាមីណេ → ឌីពិបទីត + H2O",
      chapter: "Amino Acids & Proteins", chapterKm: "អាស៊ីតអាមីណេ និងប្រូតេអ៊ីន" },
    { topic: "Protein primary structure", topicKm: "រចនាសម្ព័ន្ធទី១របស់ប្រូតេអ៊ីន", difficulty: "Medium",
      prompt: "What determines a protein's primary structure?", promptKm: "តើអ្វីកំណត់រចនាសម្ព័ន្ធទី១របស់ប្រូតេអ៊ីន?",
      options: ["The specific sequence of amino acids linked by peptide bonds", "The coiling of the chain into a helix", "The folding into a 3D globular shape", "The joining of several separate protein subunits"], answer: "The specific sequence of amino acids linked by peptide bonds",
      optionsKm: ["លំដាប់ជាក់លាក់នៃអាស៊ីតអាមីណេភ្ជាប់ដោយចំណងពិបទីត", "ការវេចខ្សែច្រវាក់ទៅជារាងស្ពៀល", "ការបត់ទៅជារាងបីវិមាត្ររាងមូល", "ការភ្ជាប់ឯកតារងប្រូតេអ៊ីនដាច់ដោយឡែកជាច្រើន"], answerKm: "លំដាប់ជាក់លាក់នៃអាស៊ីតអាមីណេភ្ជាប់ដោយចំណងពិបទីត",
      explanation: "A protein's primary structure is simply the specific sequence of amino acids joined by peptide bonds; this sequence determines the protein's identity and ultimately its final 3D shape and function.", explanationKm: "រចនាសម្ព័ន្ធទី១របស់ប្រូតេអ៊ីន គឺគ្រាន់តែជាលំដាប់ជាក់លាក់នៃអាស៊ីតអាមីណេភ្ជាប់ដោយចំណងពិបទីត លំដាប់នេះកំណត់អត្តសញ្ញាណប្រូតេអ៊ីន និងទីបំផុតរូបរាងបីវិមាត្រចុងក្រោយ និងនាទីរបស់វា។",
      formula: "Primary structure = amino acid sequence", formulaKm: "រចនាសម្ព័ន្ធទី១ = លំដាប់អាស៊ីតអាមីណេ",
      chapter: "Amino Acids & Proteins", chapterKm: "អាស៊ីតអាមីណេ និងប្រូតេអ៊ីន" },
    { topic: "Protein functions: catalyst", topicKm: "តួនាទីប្រូតេអ៊ីន៖ កាតាលីករ", difficulty: "Medium",
      prompt: "Why are proteins described as acting as catalysts in the body?", promptKm: "ហេតុអ្វីបានជាប្រូតេអ៊ីនត្រូវបានពិពណ៌នាថាដើរតួជាកាតាលីករក្នុងរាងកាយ?",
      options: ["Because enzymes, which are proteins, speed up chemical reactions in digestion and metabolism", "Because they only provide structure to bones", "Because they only transport oxygen", "Because they only store energy"], answer: "Because enzymes, which are proteins, speed up chemical reactions in digestion and metabolism",
      optionsKm: ["ពីព្រោះអង់ស៊ីម ដែលជាប្រូតេអ៊ីន បង្កើនល្បឿនប្រតិកម្មគីមីក្នុងការរំលាយអាហារ និងតំណរនីតិកម្ម", "ពីព្រោះពួកវាផ្តល់តែរចនាសម្ព័ន្ធដល់ឆ្អឹង", "ពីព្រោះពួកវាដឹកនាំតែអុកសីសែន", "ពីព្រោះពួកវាសន្សំតែថាមពល"], answerKm: "ពីព្រោះអង់ស៊ីម ដែលជាប្រូតេអ៊ីន បង្កើនល្បឿនប្រតិកម្មគីមីក្នុងការរំលាយអាហារ និងតំណរនីតិកម្ម",
      explanation: "Enzymes are a class of proteins that act as biological catalysts, speeding up chemical reactions such as digestion (e.g. amylase) or metabolic pathways (e.g. respiratory enzymes) without being consumed themselves.", explanationKm: "អង់ស៊ីមជាប្រភេទប្រូតេអ៊ីនមួយដែលដើរតួជាកាតាលីករជីវសាស្ត្រ បង្កើនល្បឿនប្រតិកម្មគីមីដូចជាការរំលាយអាហារ (ឧ. អាមីឡាស) ឬដំណើរការតំណរនីតិកម្ម (ឧ. អង់ស៊ីមដកដង្ហើម) ដោយមិនត្រូវបានប្រើប្រាស់អស់ទៅផ្ទាល់ខ្លួន។",
      formula: "Protein function: enzyme = biological catalyst", formulaKm: "តួនាទីប្រូតេអ៊ីន៖ អង់ស៊ីម = កាតាលីករជីវសាស្ត្រ",
      chapter: "Amino Acids & Proteins", chapterKm: "អាស៊ីតអាមីណេ និងប្រូតេអ៊ីន" },
    { topic: "Protein functions: transport and defense", topicKm: "តួនាទីប្រូតេអ៊ីន៖ ដឹកនាំ និងការពារ", difficulty: "Medium",
      prompt: "Hemoglobin and antibodies are both proteins. What functions do they represent, respectively?", promptKm: "អេម៉ូក្លូប៊ីន និងអង់ទីករសុទ្ធតែជាប្រូតេអ៊ីន។ តើពួកវាតំណាងឲ្យតួនាទីអ្វីរៀងគ្នា?",
      options: ["Transport (carrying oxygen) and defense (fighting pathogens)", "Both are only structural proteins", "Both are only enzymes", "Both are only hormones"], answer: "Transport (carrying oxygen) and defense (fighting pathogens)",
      optionsKm: ["ដឹកនាំ (ដឹកអុកសីសែន) និងការពារ (ប្រយុទ្ធនឹងភ្នាក់ងារបង្កជំងឺ)", "ទាំងពីរជាប្រូតេអ៊ីនរចនាសម្ព័ន្ធតែប៉ុណ្ណោះ", "ទាំងពីរជាអង់ស៊ីមតែប៉ុណ្ណោះ", "ទាំងពីរជាអរម៉ូនតែប៉ុណ្ណោះ"], answerKm: "ដឹកនាំ (ដឹកអុកសីសែន) និងការពារ (ប្រយុទ្ធនឹងភ្នាក់ងារបង្កជំងឺ)",
      explanation: "Hemoglobin is a transport protein that carries oxygen from the lungs to tissues throughout the body. Antibodies (immunoglobulins) are defense proteins that protect the body against invading pathogens.", explanationKm: "អេម៉ូក្លូប៊ីនជាប្រូតេអ៊ីនដឹកនាំ ដែលដឹកអុកសីសែនពីសួតទៅជាលិកាទូទាំងរាងកាយ។ អង់ទីករ (អ៊ីមុយណូក្លូប៊ូលីន) ជាប្រូតេអ៊ីនការពារ ដែលការពាររាងកាយពីភ្នាក់ងារបង្កជំងឺឈ្លានពាន។",
      formula: "Protein roles: hemoglobin = transport; antibody = defense", formulaKm: "តួនាទីប្រូតេអ៊ីន៖ អេម៉ូក្លូប៊ីន = ដឹកនាំ; អង់ទីករ = ការពារ",
      chapter: "Amino Acids & Proteins", chapterKm: "អាស៊ីតអាមីណេ និងប្រូតេអ៊ីន" },
    { topic: "Factors that denature proteins", topicKm: "កត្តាបំផ្លាញរចនាសម្ព័ន្ធប្រូតេអ៊ីន", difficulty: "Medium",
      prompt: "Which of the following can cause a protein to lose its shape and function (denature)?", promptKm: "តើមួយណាខាងក្រោមអាចធ្វើឲ្យប្រូតេអ៊ីនបាត់បង់រូបរាង និងមុខងារ (denature)?",
      options: ["High temperature, strong acid or base, and heavy metals", "Cold water only", "Vitamin C only", "Sunlight only, never heat"], answer: "High temperature, strong acid or base, and heavy metals",
      optionsKm: ["សីតុណ្ហភាពខ្ពស់ អាស៊ីត ឬបាសខ្លាំង និងលោហធាតុធ្ងន់", "ទឹកត្រជាក់តែប៉ុណ្ណោះ", "វីតាមីន C តែប៉ុណ្ណោះ", "ពន្លឺថ្ងៃតែប៉ុណ្ណោះ មិនមែនកំដៅទេ"], answerKm: "សីតុណ្ហភាពខ្ពស់ អាស៊ីត ឬបាសខ្លាំង និងលោហធាតុធ្ងន់",
      explanation: "Factors such as high temperature, strong acids or bases, heavy metals, organic solvents, high salt concentration, and mechanical agitation can break the bonds holding a protein's shape, denaturing it and destroying its function.", explanationKm: "កត្តាដូចជាសីតុណ្ហភាពខ្ពស់ អាស៊ីត ឬបាសខ្លាំង លោហធាតុធ្ងន់ អង្គធាតុរំលាយសរីរាង្គ កំហាប់អំបិលខ្ពស់ និងចលនាមេកានិច អាចបំបែកចំណងដែលកាន់រូបរាងប្រូតេអ៊ីន ធ្វើឲ្យវាបាត់បង់រូបរាង និងមុខងារ។",
      formula: "Denaturation causes: heat + acid/base + heavy metals + agitation", formulaKm: "កត្តាបំផ្លាញប្រូតេអ៊ីន៖ កំដៅ + អាស៊ីត/បាស + លោហធាតុធ្ងន់ + ចលនា",
      chapter: "Amino Acids & Proteins", chapterKm: "អាស៊ីតអាមីណេ និងប្រូតេអ៊ីន" },
    { topic: "What enzymes do", topicKm: "តួនាទីអង់ស៊ីម", difficulty: "Easy",
      prompt: "What is an enzyme?", promptKm: "តើអង់ស៊ីមជាអ្វី?",
      options: ["A catalyst that speeds up a specific biochemical reaction", "A type of sugar", "A structural bone protein only", "A hormone that only the pancreas makes"], answer: "A catalyst that speeds up a specific biochemical reaction",
      optionsKm: ["កាតាលីករដែលបង្កើនល្បឿនប្រតិកម្មជីវគីមីជាក់លាក់មួយ", "ប្រភេទសករមួយ", "ប្រូតេអ៊ីនរចនាសម្ព័ន្ធឆ្អឹងតែប៉ុណ្ណោះ", "អរម៉ូនដែលមានតែលំពែងផលិត"], answerKm: "កាតាលីករដែលបង្កើនល្បឿនប្រតិកម្មជីវគីមីជាក់លាក់មួយ",
      explanation: "An enzyme is a catalyst — nearly always a protein — that speeds up the rate of a specific biochemical reaction without itself being used up.", explanationKm: "អង់ស៊ីមជាកាតាលីករ ស្ទើរតែតែងជាប្រូតេអ៊ីន ដែលបង្កើនល្បឿននៃប្រតិកម្មជីវគីមីជាក់លាក់មួយ ដោយមិនត្រូវបានប្រើប្រាស់អស់ទៅផ្ទាល់ខ្លួន។",
      formula: "Enzyme = biological catalyst (protein)", formulaKm: "អង់ស៊ីម = កាតាលីករជីវសាស្ត្រ (ប្រូតេអ៊ីន)",
      chapter: "Enzymes", chapterKm: "អង់ស៊ីម" },
    { topic: "Enzyme specificity", topicKm: "ភាពជាក់លាក់របស់អង់ស៊ីម", difficulty: "Medium",
      prompt: "Why does a single cell need so many different kinds of enzymes?", promptKm: "ហេតុអ្វីបានជាកោសិកាមួយត្រូវការអង់ស៊ីមច្រើនប្រភេទផ្សេងគ្នា?",
      options: ["Because each enzyme acts on only one specific type of chemical reaction (its substrate)", "Because enzymes wear out after one use", "Because the cell has no other proteins", "Because only one enzyme exists in nature"], answer: "Because each enzyme acts on only one specific type of chemical reaction (its substrate)",
      optionsKm: ["ពីព្រោះអង់ស៊ីមនីមួយៗធ្វើសកម្មភាពលើប្រតិកម្មគីមីតែមួយប្រភេទជាក់លាក់ (សុបស្ត្រាត់របស់វា)", "ពីព្រោះអង់ស៊ីមប្រើតែម្តងហើយបាត់", "ពីព្រោះកោសិកាគ្មានប្រូតេអ៊ីនផ្សេងទៀត", "ពីព្រោះមានអង់ស៊ីមតែមួយប្រភេទប៉ុណ្ណោះនៅក្នុងធម្មជាតិ"], answerKm: "ពីព្រោះអង់ស៊ីមនីមួយៗធ្វើសកម្មភាពលើប្រតិកម្មគីមីតែមួយប្រភេទជាក់លាក់ (សុបស្ត្រាត់របស់វា)",
      explanation: "Cells carry out thousands of different chemical reactions, and each enzyme is specific to just one type of reaction (its substrate), so many different enzymes are needed to catalyze them all.", explanationKm: "កោសិកាធ្វើប្រតិកម្មគីមីរាប់ពាន់ប្រភេទផ្សេងគ្នា ហើយអង់ស៊ីមនីមួយៗជាក់លាក់ចំពោះប្រតិកម្មតែមួយប្រភេទ (សុបស្ត្រាត់របស់វា) ទើបត្រូវការអង់ស៊ីមច្រើនប្រភេទដើម្បីជំរុញពួកវាទាំងអស់។",
      formula: "One enzyme = one specific substrate reaction", formulaKm: "អង់ស៊ីមមួយ = ប្រតិកម្មសុបស្ត្រាត់ជាក់លាក់មួយ",
      chapter: "Enzymes", chapterKm: "អង់ស៊ីម" },
    { topic: "Enzyme naming", topicKm: "ការដាក់ឈ្មោះអង់ស៊ីម", difficulty: "Easy",
      prompt: "Enzyme names are typically formed by combining the substrate name with which suffix?", promptKm: "ឈ្មោះអង់ស៊ីមជាទូទៅត្រូវបានបង្កើតឡើងដោយផ្សំឈ្មោះសុបស្ត្រាត់ជាមួយបច្ច័យអ្វី?",
      options: ["-ase", "-ose", "-ine", "-ol"], answer: "-ase",
      optionsKm: ["-ase", "-ose", "-ine", "-ol"], answerKm: "-ase",
      explanation: "Enzymes are typically named after their substrate plus the suffix \"-ase\" — for example, an enzyme that breaks down lactose is called lactase.", explanationKm: "អង់ស៊ីមជាទូទៅត្រូវបានដាក់ឈ្មោះតាមសុបស្ត្រាត់របស់វា បូកបច្ច័យ \"-ase\" ឧទាហរណ៍ អង់ស៊ីមដែលបំបែកឡាក់តូស ត្រូវបានហៅថាឡាក់តាស។",
      formula: "Enzyme name = substrate + \"-ase\"", formulaKm: "ឈ្មោះអង់ស៊ីម = សុបស្ត្រាត់ + \"-ase\"",
      chapter: "Enzymes", chapterKm: "អង់ស៊ីម" },
    { topic: "Enzyme categories", topicKm: "ក្រុមអង់ស៊ីម", difficulty: "Hard",
      prompt: "Which enzyme category catalyzes reactions that break large molecules into smaller ones using water?", promptKm: "តើក្រុមអង់ស៊ីមមួយណាជំរុញប្រតិកម្មបំបែកម៉ូលេគុលធំទៅជាតូចៗដោយប្រើទឹក?",
      options: ["Hydrolases", "Oxidoreductases", "Ligases", "Isomerases"], answer: "Hydrolases",
      optionsKm: ["អុីស្ដ្រូឡាស", "អុកស៊ីដូរេដុកតាស", "លីហ្គាស", "អុីសូមេរ៉ាស"], answerKm: "អុីស្ដ្រូឡាស",
      explanation: "Enzymes fall into 6 major categories: oxidoreductases, transferases, hydrolases, lyases, isomerases and ligases. Hydrolases specifically catalyze hydrolysis — breaking a large molecule apart using water, such as amylase breaking down starch.", explanationKm: "អង់ស៊ីមមានក្រុមសំខាន់៦៖ អុកស៊ីដូរេដុកតាស ត្រង់ស្វេរ៉ាស អុីស្ដ្រូឡាស លីអ៉ាស អុីសូមេរ៉ាស និងលីហ្គាស។ អុីស្ដ្រូឡាសជំរុញប្រតិកម្មអុីស្ដ្រូលីស ដោយបំបែកម៉ូលេគុលធំដោយប្រើទឹក ដូចជាអាមីឡាសបំបែកម្សៅ។",
      formula: "6 enzyme groups: oxidoreductase, transferase, hydrolase, lyase, isomerase, ligase", formulaKm: "ក្រុមអង់ស៊ីម៦៖ អុកស៊ីដូរេដុកតាស ត្រង់ស្វេរ៉ាស អុីស្ដ្រូឡាស លីអ៉ាស អុីសូមេរ៉ាស លីហ្គាស",
      chapter: "Enzymes", chapterKm: "អង់ស៊ីម" },
    { topic: "Coenzymes", topicKm: "កូអង់ស៊ីម", difficulty: "Medium",
      prompt: "What is a coenzyme?", promptKm: "តើកូអង់ស៊ីមជាអ្វី?",
      options: ["A non-protein molecule that helps an enzyme carry out its reaction, such as vitamin B", "A second copy of the same enzyme", "A protein that destroys enzymes", "The name for a denatured enzyme"], answer: "A non-protein molecule that helps an enzyme carry out its reaction, such as vitamin B",
      optionsKm: ["ម៉ូលេគុលដែលមិនមែនជាប្រូតេអ៊ីន ដែលជួយអង់ស៊ីមអនុវត្តប្រតិកម្មរបស់វា ដូចជាវីតាមីន B", "ច្បាប់ចម្លងទីពីរនៃអង់ស៊ីមតែមួយ", "ប្រូតេអ៊ីនដែលបំផ្លាញអង់ស៊ីម", "ឈ្មោះសម្រាប់អង់ស៊ីមដែលបាត់បង់រូបរាង"], answerKm: "ម៉ូលេគុលដែលមិនមែនជាប្រូតេអ៊ីន ដែលជួយអង់ស៊ីមអនុវត្តប្រតិកម្មរបស់វា ដូចជាវីតាមីន B",
      explanation: "A coenzyme is a non-protein molecule, such as vitamin B, that joins with an enzyme to help speed up its chemical reaction.", explanationKm: "កូអង់ស៊ីមជាម៉ូលេគុលដែលមិនមែនជាប្រូតេអ៊ីន ដូចជាវីតាមីន B ដែលចូលរួមជាមួយអង់ស៊ីមដើម្បីជួយបង្កើនល្បឿនប្រតិកម្មគីមីរបស់វា។",
      formula: "Enzyme + coenzyme (e.g. vitamin B) → active reaction", formulaKm: "អង់ស៊ីម + កូអង់ស៊ីម (ឧ. វីតាមីន B) → ប្រតិកម្មសកម្ម",
      chapter: "Enzymes", chapterKm: "អង់ស៊ីម" },
    { topic: "Temperature and enzyme activity", topicKm: "សីតុណ្ហភាព និងសកម្មភាពអង់ស៊ីម", difficulty: "Hard",
      prompt: "Why does enzyme activity sharply decrease when temperature rises above about 45°C?", promptKm: "ហេតុអ្វីបានជាសកម្មភាពអង់ស៊ីមថយចុះខ្លាំង នៅពេលសីតុណ្ហភាពលើសពី ៤៥ អង្សាសេ?",
      options: ["Because the enzyme, being a protein, denatures and loses its functional shape at high temperature", "Because the enzyme freezes at that temperature", "Because water boils at 45°C", "Because the substrate disappears"], answer: "Because the enzyme, being a protein, denatures and loses its functional shape at high temperature",
      optionsKm: ["ពីព្រោះអង់ស៊ីម ដែលជាប្រូតេអ៊ីន បាត់បង់រូបរាងមុខងារនៅសីតុណ្ហភាពខ្ពស់ (denature)", "ពីព្រោះអង់ស៊ីមកកនៅសីតុណ្ហភាពនោះ", "ពីព្រោះទឹកពុះនៅ ៤៥ អង្សាសេ", "ពីព្រោះសុបស្ត្រាត់បាត់ទៅវិញ"], answerKm: "ពីព្រោះអង់ស៊ីម ដែលជាប្រូតេអ៊ីន បាត់បង់រូបរាងមុខងារនៅសីតុណ្ហភាពខ្ពស់ (denature)",
      explanation: "Since an enzyme is a protein, excessively high temperature breaks the bonds holding its 3D shape, denaturing it — the enzyme's active site becomes distorted and it can no longer catalyze its reaction efficiently.", explanationKm: "ដោយសារអង់ស៊ីមជាប្រូតេអ៊ីន សីតុណ្ហភាពខ្ពស់ពេកបំបែកចំណងដែលកាន់រូបរាងបីវិមាត្ររបស់វា ធ្វើឲ្យ denature តំបន់សកម្មរបស់វាខូចទ្រង់ទ្រាយ ហើយវាលែងអាចជំរុញប្រតិកម្មបានប្រកបដោយប្រសិទ្ធភាព។",
      formula: "Too much heat → protein denatures → enzyme activity drops", formulaKm: "កំដៅច្រើនពេក → ប្រូតេអ៊ីនបាត់រូបរាង → សកម្មភាពអង់ស៊ីមធ្លាក់ចុះ",
      chapter: "Enzymes", chapterKm: "អង់ស៊ីម" },
    { topic: "pH and enzyme activity", topicKm: "pH និងសកម្មភាពអង់ស៊ីម", difficulty: "Medium",
      prompt: "What happens to an enzyme's activity in a very acidic or very basic environment (extreme pH)?", promptKm: "តើមានអ្វីកើតឡើងចំពោះសកម្មភាពអង់ស៊ីម នៅក្នុងបរិយាកាសអាស៊ីតខ្លាំង ឬបាសខ្លាំង (pH ជ្រុលបំផុត)?",
      options: ["It decreases because extreme pH breaks the enzyme's structural bonds, denaturing it", "It always increases without limit", "It stays exactly the same at any pH", "Only water-based enzymes are affected"], answer: "It decreases because extreme pH breaks the enzyme's structural bonds, denaturing it",
      optionsKm: ["ថយចុះ ពីព្រោះ pH ជ្រុលបំបែកចំណងរចនាសម្ព័ន្ធអង់ស៊ីម ធ្វើឲ្យ denature", "កើនឡើងជានិច្ចដោយគ្មានដែនកំណត់", "ដដែលមិនប្រែប្រួលនៅ pH ណាមួយ", "មានតែអង់ស៊ីមផ្អែកលើទឹកទេដែលរងឥទ្ធិពល"], answerKm: "ថយចុះ ពីព្រោះ pH ជ្រុលបំបែកចំណងរចនាសម្ព័ន្ធអង់ស៊ីម ធ្វើឲ្យ denature",
      explanation: "Each enzyme works best at a specific optimal pH. A very acidic or very basic environment breaks the bonds holding the enzyme's shape, denaturing it and reducing its activity — as happens with amylase outside its optimal range.", explanationKm: "អង់ស៊ីមនីមួយៗដំណើរការល្អបំផុតត្រង់ pH ល្អប្រសើរជាក់លាក់មួយ។ បរិយាកាសអាស៊ីត ឬបាសខ្លាំងបំបែកចំណងកាន់រូបរាងអង់ស៊ីម ធ្វើឲ្យ denature និងបន្ថយសកម្មភាព ដូចករណីអាមីឡាសនៅក្រៅចន្លោះ pH ល្អប្រសើររបស់វា។",
      formula: "Extreme pH → breaks enzyme structure → activity falls", formulaKm: "pH ជ្រុល → បំបែករចនាសម្ព័ន្ធអង់ស៊ីម → សកម្មភាពធ្លាក់ចុះ",
      chapter: "Enzymes", chapterKm: "អង់ស៊ីម" },
    { topic: "Griffith's experiment", topicKm: "ការពិសោធន៍របស់លោកគ្រីភីធ", difficulty: "Hard",
      prompt: "In Griffith's 1928 experiment, live harmless bacteria mixed with heat-killed deadly bacteria caused mice to die. What did he conclude?", promptKm: "ក្នុងការពិសោធន៍ឆ្នាំ១៩២៨របស់លោកគ្រីភីធ បាក់តេរីមិនបង្កគ្រោះថ្នាក់រស់ លាយជាមួយបាក់តេរីបង្កគ្រោះថ្នាក់ដែលស្លាប់ដោយកម្តៅ ធ្វើឲ្យសត្វកណ្តុរស្លាប់។ តើគាត់សន្និដ្ឋានអ្វី?",
      options: ["A \"transforming substance\" from the dead bacteria had transferred genetic traits to the living bacteria", "Heat always kills every trait permanently", "Bacteria cannot transfer traits to each other", "Mice are immune to all bacteria"], answer: "A \"transforming substance\" from the dead bacteria had transferred genetic traits to the living bacteria",
      optionsKm: ["សារធាតុ \"បំប្លែង\" ពីបាក់តេរីដែលស្លាប់ បានផ្ទេរលក្ខណៈតំណពូជទៅបាក់តេរីរស់", "កម្តៅតែងតែសម្លាប់លក្ខណៈទាំងអស់ជារៀងរហូត", "បាក់តេរីមិនអាចផ្ទេរលក្ខណៈគ្នាទៅវិញទៅមកបានទេ", "សត្វកណ្តុរមានភាពស៊ាំចំពោះបាក់តេរីទាំងអស់"], answerKm: "សារធាតុ \"បំប្លែង\" ពីបាក់តេរីដែលស្លាប់ បានផ្ទេរលក្ខណៈតំណពូជទៅបាក់តេរីរស់",
      explanation: "Griffith mixed live harmless R-strain bacteria with heat-killed deadly S-strain bacteria and injected the mix into mice, which died and were found to carry live S-strain bacteria. He concluded that some \"transforming substance\" from the dead S bacteria had permanently changed the R bacteria into disease-causing S bacteria — though he did not yet know that substance was DNA.", explanationKm: "លោកគ្រីភីធបានលាយបាក់តេរីមិនបង្កគ្រោះថ្នាក់ពូជ R ដែលរស់ ជាមួយបាក់តេរីបង្កគ្រោះថ្នាក់ពូជ S ដែលស្លាប់ដោយកម្តៅ ហើយចាក់លាយចូលក្នុងកណ្តុរ ដែលស្លាប់ និងមានបាក់តេរីពូជ S រស់នៅក្នុងឈាម។ គាត់សន្និដ្ឋានថា សារធាតុ \"បំប្លែង\" ពីបាក់តេរី S ដែលស្លាប់ បានប្តូរបាក់តេរី R ទៅជាបាក់តេរី S បង្កជំងឺជារៀងរហូត ទោះបីជាគាត់មិនទាន់ដឹងថាសារធាតុនោះជា DNA។",
      formula: "Griffith: dead S + live R → live S found (transforming substance)", formulaKm: "គ្រីភីធ៖ S ស្លាប់ + R រស់ → រកឃើញ S រស់ (សារធាតុបំប្លែង)",
      chapter: "DNA & Genetic Information", chapterKm: "ADN ជាទម្រង់ព័ត៌មានេសនេទិច" },
    { topic: "Avery's experiment", topicKm: "ការពិសោធន៍របស់លោកអាវើរី", difficulty: "Hard",
      prompt: "Avery's follow-up experiment extracted purified DNA from dead S-strain bacteria and mixed it with live R-strain bacteria. What did this prove?", promptKm: "ការពិសោធន៍តម្រូតរបស់លោកអាវើរី បានដកយក DNA សុទ្ធពីបាក់តេរីពូជ S ដែលស្លាប់ លាយជាមួយបាក់តេរីពូជ R រស់។ តើវាបញ្ជាក់អ្វី?",
      options: ["DNA itself is the genetic material responsible for transformation", "Proteins are the genetic material", "Sugar is the genetic material", "Bacteria don't need genetic material at all"], answer: "DNA itself is the genetic material responsible for transformation",
      optionsKm: ["ADN ខ្លួនឯងជាសារធាតុតំណពូជទទួលខុសត្រូវការបំប្លែង", "ប្រូតេអ៊ីនជាសារធាតុតំណពូជ", "សករជាសារធាតុតំណពូជ", "បាក់តេរីមិនត្រូវការសារធាតុតំណពូជទាល់តែសោះ"], answerKm: "ADN ខ្លួនឯងជាសារធាតុតំណពូជទទួលខុសត្រូវការបំប្លែង",
      explanation: "By purifying DNA specifically from the dead S-strain bacteria and showing it alone could transform live R-strain bacteria into disease-causing S-strain bacteria, Avery proved that DNA — not protein — is the genetic material.", explanationKm: "តាមរយៈការដកយក DNA សុទ្ធពីបាក់តេរីពូជ S ដែលស្លាប់ ហើយបង្ហាញថាវាតែម្នាក់ឯងអាចបំប្លែងបាក់តេរីពូជ R រស់ទៅជាបាក់តេរីពូជ S បង្កជំងឺបាន លោកអាវើរីបានបញ្ជាក់ថា DNA មិនមែនប្រូតេអ៊ីនទេ ជាសារធាតុតំណពូជ។",
      formula: "Avery: purified DNA alone transforms bacteria → DNA is genetic material", formulaKm: "អាវើរី៖ DNA សុទ្ធតែម្នាក់ឯងបំប្លែងបាក់តេរី → DNA ជាសារធាតុតំណពូជ",
      chapter: "DNA & Genetic Information", chapterKm: "ADN ជាទម្រង់ព័ត៌មានេសនេទិច" },
    { topic: "Hershey and Chase experiment", topicKm: "ការពិសោធន៍របស់លោកហឺស៊ី និងឆេស", difficulty: "Hard",
      prompt: "Hershey and Chase labeled a virus's protein coat with radioactive sulfur-35 and its DNA with radioactive phosphorus-32. Which label ended up inside the infected bacteria?", promptKm: "លោកហឺស៊ី និងឆេសបានដាក់ស្លាកសំបកប្រូតេអ៊ីនរបស់វីរុសដោយស័ន្ធសាំង៣៥ ធាតុវិទ្យុសកម្ម និង DNA របស់វាដោយផូស្វាត៣២ ធាតុវិទ្យុសកម្ម។ តើស្លាកណាដែលបញ្ចប់នៅខាងក្នុងបាក់តេរីដែលឆ្លង?",
      options: ["The phosphorus-32 label (DNA), proving DNA enters the bacteria and carries genetic information", "The sulfur-35 label (protein) only", "Both labels equally", "Neither label entered the bacteria"], answer: "The phosphorus-32 label (DNA), proving DNA enters the bacteria and carries genetic information",
      optionsKm: ["ស្លាកផូស្វាត៣២ (DNA) ដែលបញ្ជាក់ថា DNA ចូលទៅក្នុងបាក់តេរី និងផ្ទុកព័ត៌មានតំណពូជ", "ស្លាកស័ន្ធសាំង៣៥ (ប្រូតេអ៊ីន) តែប៉ុណ្ណោះ", "ស្លាកទាំងពីរស្មើគ្នា", "ស្លាកទាំងពីរមិនបានចូលទៅក្នុងបាក់តេរីទេ"], answerKm: "ស្លាកផូស្វាត៣២ (DNA) ដែលបញ្ជាក់ថា DNA ចូលទៅក្នុងបាក់តេរី និងផ្ទុកព័ត៌មានតំណពូជ",
      explanation: "Only the phosphorus-32-labeled DNA was found inside the bacteria after infection, while the sulfur-35-labeled protein coat stayed outside. This confirmed that DNA, not protein, is the genetic material that viruses inject into bacteria to reproduce.", explanationKm: "មានតែ DNA ដែលដាក់ស្លាកផូស្វាត៣២ប៉ុណ្ណោះដែលរកឃើញនៅខាងក្នុងបាក់តេរីក្រោយឆ្លង ចំណែកឯសំបកប្រូតេអ៊ីនដែលដាក់ស្លាកស័ន្ធសាំង៣៥ នៅតែខាងក្រៅ។ នេះបញ្ជាក់ថា DNA មិនមែនប្រូតេអ៊ីនទេ ជាសារធាតុតំណពូជដែលវីរុសចាក់ចូលទៅបាក់តេរីដើម្បីបន្តពូជ។",
      formula: "Hershey-Chase: only P-32 (DNA) enters bacteria → DNA is genetic material", formulaKm: "ហឺស៊ី-ឆេស៖ មានតែ P-32 (DNA) ចូលបាក់តេរី → DNA ជាសារធាតុតំណពូជ",
      chapter: "DNA & Genetic Information", chapterKm: "ADN ជាទម្រង់ព័ត៌មានេសនេទិច" },
    { topic: "The nucleotide", topicKm: "នុយក្លេអូទីត", difficulty: "Medium",
      prompt: "A DNA nucleotide is made up of which three parts?", promptKm: "នុយក្លេអូទីតរបស់ ADN មួយផ្សំឡើងពីផ្នែកបីអ្វីខ្លះ?",
      options: ["A phosphate group, a deoxyribose sugar, and a nitrogenous base", "Only a sugar and a base", "Two phosphate groups and a base", "A protein, a lipid, and a sugar"], answer: "A phosphate group, a deoxyribose sugar, and a nitrogenous base",
      optionsKm: ["បណ្តុំផូស្វាត សករដេអុកស៊ីរីបូស និងបាសអាហ្សូត", "សករ និងបាសតែប៉ុណ្ណោះ", "បណ្តុំផូស្វាតពីរ និងបាស", "ប្រូតេអ៊ីន លីពីត និងសករ"], answerKm: "បណ្តុំផូស្វាត សករដេអុកស៊ីរីបូស និងបាសអាហ្សូត",
      explanation: "Each DNA nucleotide has one phosphate group, one deoxyribose sugar molecule, and one of four nitrogenous bases (A, T, C, or G) — giving 4 possible types of nucleotide.", explanationKm: "នុយក្លេអូទីត ADN នីមួយៗមានបណ្តុំផូស្វាតមួយ ម៉ូលេគុលសករដេអុកស៊ីរីបូសមួយ និងបាសអាហ្សូតមួយក្នុងចំណោមបួន (A T C ឬ G) ដែលផ្តល់ឲ្យមាននុយក្លេអូទីតបួនប្រភេទ។",
      formula: "Nucleotide = phosphate + deoxyribose sugar + base (A/T/C/G)", formulaKm: "នុយក្លេអូទីត = ផូស្វាត + សករដេអុកស៊ីរីបូស + បាស (A/T/C/G)",
      chapter: "DNA & Genetic Information", chapterKm: "ADN ជាទម្រង់ព័ត៌មានេសនេទិច" },
    { topic: "Watson and Crick's model", topicKm: "គំរូរបស់វ៉ាសុន និងគ្រិក", difficulty: "Hard",
      prompt: "According to Watson and Crick's model, what holds the two strands of the DNA double helix together?", promptKm: "តាមគំរូរបស់វ៉ាសុន និងគ្រិក តើអ្វីភ្ជាប់ខ្សែច្រវាក់ទាំងពីររបស់ ADN ទ្វេស្ពៀល?",
      options: ["Hydrogen bonds between complementary base pairs (A-T and C-G)", "Covalent bonds between the two sugar backbones directly", "Ionic bonds between phosphate groups", "There is no bond; the strands just sit next to each other"], answer: "Hydrogen bonds between complementary base pairs (A-T and C-G)",
      optionsKm: ["ចំណងអ៊ីដ្រូសែនរវាងគូបាសបំពេញគ្នា (A-T និង C-G)", "ចំណងកូវ៉ាឡង់ផ្ទាល់រវាងជួរឆ្អឹងខ្នងសករទាំងពីរ", "ចំណងអ៊ីយ៉ុងរវាងបណ្តុំផូស្វាត", "គ្មានចំណងអ្វីទេ ខ្សែច្រវាក់គ្រាន់តែនៅជាប់គ្នា"], answerKm: "ចំណងអ៊ីដ្រូសែនរវាងគូបាសបំពេញគ្នា (A-T និង C-G)",
      explanation: "In the double helix, the two nucleotide strands are held together by hydrogen bonds between complementary base pairs: adenine (A) always pairs with thymine (T) via 2 hydrogen bonds, and cytosine (C) always pairs with guanine (G) via 3 hydrogen bonds.", explanationKm: "ក្នុងទ្វេស្ពៀល ខ្សែច្រវាក់នុយក្លេអូទីតទាំងពីរភ្ជាប់គ្នាដោយចំណងអ៊ីដ្រូសែនរវាងគូបាសបំពេញគ្នា៖ អាដេនីន (A) តែងតែផ្គូជាមួយធីមីន (T) ដោយចំណងអ៊ីដ្រូសែន២ ហើយស៊ីតូស៊ីន (C) តែងតែផ្គូជាមួយហ្គានីន (G) ដោយចំណងអ៊ីដ្រូសែន៣។",
      formula: "Base pairing: A=T (2 H-bonds); C≡G (3 H-bonds)", formulaKm: "ការបំពេញបាស៖ A=T (អ៊ីដ្រូសែន២); C≡G (អ៊ីដ្រូសែន៣)",
      chapter: "DNA & Genetic Information", chapterKm: "ADN ជាទម្រង់ព័ត៌មានេសនេទិច" },
    { topic: "DNA replication", topicKm: "ការចម្លងខ្លួនឯង ADN", difficulty: "Hard",
      prompt: "During DNA replication, why do the two resulting daughter DNA molecules each end up identical to the original?", promptKm: "ក្នុងអំឡុងពេលចម្លងខ្លួនឯង ADN ហេតុអ្វីបានជា ADN កូនទាំងពីរនីមួយៗដូចនឹង ADN ដើមបេះបិទ?",
      options: ["Each daughter molecule keeps one original strand as a template and builds a new complementary strand following the base-pairing rule", "The whole molecule is copied twice by chance", "Only one daughter molecule is produced", "New nucleotides are added randomly without any rule"], answer: "Each daughter molecule keeps one original strand as a template and builds a new complementary strand following the base-pairing rule",
      optionsKm: ["ADN កូននីមួយៗរក្សាខ្សែច្រវាក់ដើមមួយជាពុម្ព ហើយសាងសង់ខ្សែថ្មីបំពេញគ្នាតាមច្បាប់បំពេញបាស", "ម៉ូលេគុលទាំងមូលត្រូវបានចម្លងពីរដងដោយចៃដន្យ", "មានតែ ADN កូនមួយប៉ុណ្ណោះដែលបង្កើតឡើង", "នុយក្លេអូទីតថ្មីត្រូវបានបន្ថែមដោយចៃដន្យដោយគ្មានច្បាប់"], answerKm: "ADN កូននីមួយៗរក្សាខ្សែច្រវាក់ដើមមួយជាពុម្ព ហើយសាងសង់ខ្សែថ្មីបំពេញគ្នាតាមច្បាប់បំពេញបាស",
      explanation: "This is called semi-conservative replication: the two original strands separate, and free nucleotides pair up with each original strand following the base-pairing rule (A-T, C-G), under the action of DNA polymerase. Each daughter DNA molecule ends up with one original (template) strand and one newly built strand, identical to the parent DNA.", explanationKm: "ដំណើរការនេះហៅថាការចម្លងខ្លួនឯងបែបពាក់កណ្តាលរក្សាទុក៖ ខ្សែច្រវាក់ដើមទាំងពីរញែកគ្នា ហើយនុយក្លេអូទីតសេរីភ្ជាប់ជាមួយខ្សែច្រវាក់ដើមនីមួយៗតាមច្បាប់បំពេញបាស (A-T, C-G) ក្រោមសកម្មភាពរបស់អង់ស៊ីម ADN ប៉ូលីមេរ៉ាស។ ADN កូននីមួយៗបានខ្សែច្រវាក់ដើម (ពុម្ព) មួយ និងខ្សែថ្មីមួយ ដូចនឹង ADN ដើមបេះបិទ។",
      formula: "Semi-conservative replication: 1 old strand + 1 new strand per daughter", formulaKm: "ការចម្លងបែបពាក់កណ្តាលរក្សាទុក៖ ខ្សែចាស់១ + ខ្សែថ្មី១ ក្នុងកូននីមួយៗ",
      chapter: "DNA & Genetic Information", chapterKm: "ADN ជាទម្រង់ព័ត៌មានេសនេទិច" },
    { topic: "DNA vs protein", topicKm: "ADN ធៀបនឹងប្រូតេអ៊ីន", difficulty: "Medium",
      prompt: "Both DNA and proteins are macromolecules made of repeating monomer units. What is DNA's monomer, and what is a protein's monomer?", promptKm: "ទាំង ADN និងប្រូតេអ៊ីនជាម៉ាក្រូម៉ូលេគុលផ្សំពីឯកតារង។ តើ ADN មានឯកតារងអ្វី ហើយប្រូតេអ៊ីនមានឯកតារងអ្វី?",
      options: ["DNA's monomer is the nucleotide; a protein's monomer is the amino acid", "Both use amino acids as their monomer", "Both use nucleotides as their monomer", "DNA's monomer is glucose; a protein's monomer is fatty acid"], answer: "DNA's monomer is the nucleotide; a protein's monomer is the amino acid",
      optionsKm: ["ឯកតារងរបស់ ADN ជានុយក្លេអូទីត; ឯកតារងរបស់ប្រូតេអ៊ីនជាអាស៊ីតអាមីណេ", "ទាំងពីរប្រើអាស៊ីតអាមីណេជាឯកតារង", "ទាំងពីរប្រើនុយក្លេអូទីតជាឯកតារង", "ឯកតារងរបស់ ADN ជាគ្លុយកូស; ឯកតារងរបស់ប្រូតេអ៊ីនជាអាស៊ីតខ្លាញ់"], answerKm: "ឯកតារងរបស់ ADN ជានុយក្លេអូទីត; ឯកតារងរបស់ប្រូតេអ៊ីនជាអាស៊ីតអាមីណេ",
      explanation: "DNA is a polymer built from a specific sequence of 4 types of nucleotides, while a protein is a polymer built from a specific sequence of 20 types of amino acids. Both are macromolecules, but DNA is far larger and encodes the information that determines a protein's amino acid sequence.", explanationKm: "ADN ជាបូលីមែរផ្សំពីលំដាប់ជាក់លាក់នៃនុយក្លេអូទីត៤ប្រភេទ ចំណែកឯប្រូតេអ៊ីនជាបូលីមែរផ្សំពីលំដាប់ជាក់លាក់នៃអាស៊ីតអាមីណេ២០ប្រភេទ។ ទាំងពីរជាម៉ាក្រូម៉ូលេគុល ប៉ុន្តែ ADN ធំជាងច្រើន និងផ្ទុកព័ត៌មានដែលកំណត់លំដាប់អាស៊ីតអាមីណេរបស់ប្រូតេអ៊ីន។",
      formula: "DNA monomer: nucleotide (4 types); Protein monomer: amino acid (20 types)", formulaKm: "ឯកតារង ADN៖ នុយក្លេអូទីត (៤ប្រភេទ); ឯកតារងប្រូតេអ៊ីន៖ អាស៊ីតអាមីណេ (២០ប្រភេទ)",
      chapter: "DNA & Genetic Information", chapterKm: "ADN ជាទម្រង់ព័ត៌មានេសនេទិច" },
    { topic: "What is a gene", topicKm: "ហ្សែនជាអ្វី", difficulty: "Easy",
      prompt: "What is a gene?", promptKm: "តើហ្សែនជាអ្វី?",
      options: ["A segment of DNA that holds the genetic information for building one specific protein", "An entire chromosome", "A single nucleotide", "A type of enzyme"], answer: "A segment of DNA that holds the genetic information for building one specific protein",
      optionsKm: ["អង្គធាតុមួយកម្រិតរបស់ ADN ដែលផ្ទុកព័ត៌មានតំណពូជសម្រាប់សំយោគប្រូតេអ៊ីនជាក់លាក់មួយ", "ក្រូម៉ូសូមទាំងមូល", "នុយក្លេអូទីតតែមួយ", "ប្រភេទអង់ស៊ីមមួយ"], answerKm: "អង្គធាតុមួយកម្រិតរបស់ ADN ដែលផ្ទុកព័ត៌មានតំណពូជសម្រាប់សំយោគប្រូតេអ៊ីនជាក់លាក់មួយ",
      explanation: "A gene is a segment of a DNA molecule that carries the genetic information needed to specify the synthesis of one particular protein.", explanationKm: "ហ្សែនជាអង្គធាតុមួយកម្រិតរបស់ម៉ូលេគុល ADN ដែលផ្ទុកព័ត៌មានតំណពូជចាំបាច់សម្រាប់កំណត់ការសំយោគប្រូតេអ៊ីនជាក់លាក់មួយ។",
      formula: "Gene = DNA segment coding for one protein", formulaKm: "ហ្សែន = អង្គធាតុ ADN កំណត់សំយោគប្រូតេអ៊ីនមួយ",
      chapter: "Gene Expression", chapterKm: "ការសម្តែងចេញនៃហ្សែន" },
    { topic: "Why transcription is needed", topicKm: "ហេតុអ្វីត្រូវការចម្លងសម្រង", difficulty: "Hard",
      prompt: "Why is it necessary to synthesize mRNA (transcription) before a protein can be made?", promptKm: "ហេតុអ្វីបានជាចាំបាច់ត្រូវសំយោគ ARNm (ចម្លងសម្រង) មុននឹងអាចផលិតប្រូតេអ៊ីនបាន?",
      options: ["Because the genetic information is in the nucleus but protein synthesis happens in the cytoplasm, so mRNA must carry the message out", "Because DNA cannot be read at all", "Because mRNA is the only molecule that can enter the nucleus", "Because proteins are made directly from DNA without any intermediate"], answer: "Because the genetic information is in the nucleus but protein synthesis happens in the cytoplasm, so mRNA must carry the message out",
      optionsKm: ["ពីព្រោះព័ត៌មានតំណពូជនៅក្នុងស្នូល ប៉ុន្តែការសំយោគប្រូតេអ៊ីនកើតឡើងក្នុងស៊ីតូប្លាស ទើប ARNm ត្រូវចម្លងសារនោះចេញ", "ពីព្រោះ ADN មិនអាចអានបានទាល់តែសោះ", "ពីព្រោះ ARNm ជាម៉ូលេគុលតែមួយគត់ដែលអាចចូលស្នូលបាន", "ពីព្រោះប្រូតេអ៊ីនផលិតដោយផ្ទាល់ពី ADN ដោយគ្មានអន្តរការីទេ"], answerKm: "ពីព្រោះព័ត៌មានតំណពូជនៅក្នុងស្នូល ប៉ុន្តែការសំយោគប្រូតេអ៊ីនកើតឡើងក្នុងស៊ីតូប្លាស ទើប ARNm ត្រូវចម្លងសារនោះចេញ",
      explanation: "The genetic information sits in the DNA inside the nucleus, but ribosomes that build proteins are located in the cytoplasm. mRNA copies (transcribes) the nucleotide sequence of one strand of a gene and carries that message out to the ribosomes.", explanationKm: "ព័ត៌មានតំណពូជស្ថិតនៅក្នុង ADN ខាងក្នុងស្នូល ប៉ុន្តែរីបូសូមដែលសាងសង់ប្រូតេអ៊ីនស្ថិតនៅក្នុងស៊ីតូប្លាស។ ARNm ចម្លង (ត្រង់ស្គ្រីប) លំដាប់នុយក្លេអូទីតនៃខ្សែច្រវាក់មួយរបស់ហ្សែន ហើយបញ្ជូនសារនោះទៅរីបូសូម។",
      formula: "DNA (nucleus) → mRNA copies → ribosome (cytoplasm) builds protein", formulaKm: "ADN (ស្នូល) → ARNm ចម្លង → រីបូសូម (ស៊ីតូប្លាស) សាងសង់ប្រូតេអ៊ីន",
      chapter: "Gene Expression", chapterKm: "ការសម្តែងចេញនៃហ្សែន" },
    { topic: "mRNA vs DNA", topicKm: "ARNm ធៀបនឹង ADN", difficulty: "Medium",
      prompt: "Which base does mRNA use in place of thymine (T), which is found in DNA?", promptKm: "តើ ARNm ប្រើបាសអ្វីជំនួសធីមីន (T) ដែលមាននៅក្នុង ADN?",
      options: ["Uracil (U)", "Guanine (G)", "Cytosine (C)", "Adenine (A)"], answer: "Uracil (U)",
      optionsKm: ["អ៊ុយរ៉ាស៊ីល (U)", "ហ្គានីន (G)", "ស៊ីតូស៊ីន (C)", "អាដេនីន (A)"], answerKm: "អ៊ុយរ៉ាស៊ីល (U)",
      explanation: "mRNA is single-stranded, made of ribose sugar instead of deoxyribose, and uses uracil (U) instead of thymine (T) as one of its four bases (A, U, C, G).", explanationKm: "ARNm ជាខ្សែច្រវាក់តែមួយ ផ្សំពីសករ​រីបូសជំនួសដេអុកស៊ីរីបូស ហើយប្រើអ៊ុយរ៉ាស៊ីល (U) ជំនួសធីមីន (T) ជាបាសមួយក្នុងចំណោមបាសទាំង៤ (A, U, C, G)។",
      formula: "DNA base T → RNA base U", formulaKm: "បាស ADN T → បាស ARN U",
      chapter: "Gene Expression", chapterKm: "ការសម្តែងចេញនៃហ្សែន" },
    { topic: "Transcription steps", topicKm: "ជំហាននៃការចម្លងសម្រង", difficulty: "Hard",
      prompt: "Which enzyme unwinds the DNA double helix and builds the new mRNA strand during transcription?", promptKm: "តើអង់ស៊ីមមួយណាបើកទ្វេស្ពៀល ADN និងសាងសង់ខ្សែ ARNm ថ្មី ក្នុងអំឡុងពេលចម្លងសម្រង?",
      options: ["RNA polymerase", "DNA polymerase", "ATP synthase", "Lactase"], answer: "RNA polymerase",
      optionsKm: ["ARN ប៉ូលីមេរ៉ាស", "ADN ប៉ូលីមេរ៉ាស", "ATP សាំងតេស", "ឡាក់តាស"], answerKm: "ARN ប៉ូលីមេរ៉ាស",
      explanation: "RNA polymerase recognizes the start signal on a gene, unwinds the DNA double helix by breaking the weak hydrogen bonds, and builds a new complementary mRNA strand by pairing free nucleotides to the template strand following the base-pairing rule (with U pairing with A instead of T).", explanationKm: "ARN ប៉ូលីមេរ៉ាសសម្គាល់សញ្ញាចាប់ផ្តើមលើហ្សែន បើកទ្វេស្ពៀល ADN ដោយកាត់ផ្តាច់ចំណងអ៊ីដ្រូសែនទន់ ហើយសាងសង់ខ្សែ ARNm ថ្មីបំពេញគ្នា ដោយភ្ជាប់នុយក្លេអូទីតសេរីទៅខ្សែពុម្ព តាមច្បាប់បំពេញបាស (U ផ្គូជាមួយ A ជំនួស T)។",
      formula: "RNA polymerase: unwinds DNA + builds mRNA (A-U, T-A, C-G, G-C)", formulaKm: "ARN ប៉ូលីមេរ៉ាស៖ បើក ADN + សាងសង់ ARNm (A-U, T-A, C-G, G-C)",
      chapter: "Gene Expression", chapterKm: "ការសម្តែងចេញនៃហ្សែន" },
    { topic: "The genetic code and codons", topicKm: "កូដតំណពូជ និងកូដុង", difficulty: "Hard",
      prompt: "A codon is a sequence of how many mRNA nucleotides, and what does it specify?", promptKm: "កូដុងមួយជាបន្តនុយក្លេអូទីត ARNm ប៉ុន្មាន ហើយវាកំណត់អ្វី?",
      options: ["3 nucleotides, specifying one amino acid", "1 nucleotide, specifying one protein", "4 nucleotides, specifying one gene", "10 nucleotides, specifying one chromosome"], answer: "3 nucleotides, specifying one amino acid",
      optionsKm: ["នុយក្លេអូទីត៣ កំណត់អាស៊ីតអាមីណេមួយ", "នុយក្លេអូទីត១ កំណត់ប្រូតេអ៊ីនមួយ", "នុយក្លេអូទីត៤ កំណត់ហ្សែនមួយ", "នុយក្លេអូទីត១០ កំណត់ក្រូម៉ូសូមមួយ"], answerKm: "នុយក្លេអូទីត៣ កំណត់អាស៊ីតអាមីណេមួយ",
      explanation: "A codon is a group of 3 consecutive mRNA nucleotides that specifies one particular amino acid. Since 4³ = 64 possible codons exist for only 20 amino acids, most amino acids are specified by more than one codon.", explanationKm: "កូដុងជាក្រុមនុយក្លេអូទីត ARNm ជាប់គ្នាចំនួន៣ ដែលកំណត់អាស៊ីតអាមីណេជាក់លាក់មួយ។ ដោយសារ 4³ = 64 កូដុងអាចមានសម្រាប់អាស៊ីតអាមីណេត្រឹមតែ២០ប្រភេទ អាស៊ីតអាមីណេភាគច្រើនត្រូវបានកំណត់ដោយកូដុងច្រើនជាងមួយ។",
      formula: "Codon = 3 mRNA nucleotides → 1 amino acid; 64 codons for 20 amino acids", formulaKm: "កូដុង = នុយក្លេអូទីត ARNm ៣ → អាស៊ីតអាមីណេ១; កូដុង៦៤ សម្រាប់អាស៊ីតអាមីណេ២០",
      chapter: "Gene Expression", chapterKm: "ការសម្តែងចេញនៃហ្សែន" },
    { topic: "Stop codons", topicKm: "កូដុងបញ្ឈប់", difficulty: "Medium",
      prompt: "How many mRNA codons do not code for any amino acid, and what is their function?", promptKm: "តើមាន ARNm កូដុងប៉ុន្មានដែលមិនកំណត់អាស៊ីតអាមីណេណាមួយ ហើយវាមានតួនាទីអ្វី?",
      options: ["3 stop codons (UAA, UAG, UGA) that signal the end of protein synthesis", "None; every codon codes for an amino acid", "All 64 codons are stop codons", "1 stop codon that starts protein synthesis"], answer: "3 stop codons (UAA, UAG, UGA) that signal the end of protein synthesis",
      optionsKm: ["កូដុងបញ្ឈប់៣ (UAA, UAG, UGA) ដែលបញ្ជាក់ការបញ្ចប់ការសំយោគប្រូតេអ៊ីន", "គ្មានទេ គ្រប់កូដុងកំណត់អាស៊ីតអាមីណេទាំងអស់", "កូដុងទាំង៦៤សុទ្ធតែជាកូដុងបញ្ឈប់", "កូដុងបញ្ឈប់មួយដែលចាប់ផ្តើមការសំយោគប្រូតេអ៊ីន"], answerKm: "កូដុងបញ្ឈប់៣ (UAA, UAG, UGA) ដែលបញ្ជាក់ការបញ្ចប់ការសំយោគប្រូតេអ៊ីន",
      explanation: "Three codons — UAA, UAG and UGA — do not code for any amino acid. They are called stop codons because they signal the ribosome to stop protein synthesis. AUG, by contrast, is the start codon and codes for methionine.", explanationKm: "កូដុងចំនួន៣ គឺ UAA UAG និង UGA មិនកំណត់អាស៊ីតអាមីណេណាមួយទេ។ ពួកវាត្រូវបានហៅថាកូដុងបញ្ឈប់ ព្រោះបញ្ជាក់ឲ្យរីបូសូមឈប់ការសំយោគប្រូតេអ៊ីន។ ចំណែកឯ AUG ជាកូដុងចាប់ផ្តើម និងកំណត់មេទីយូនីន។",
      formula: "Stop codons: UAA, UAG, UGA; Start codon: AUG (methionine)", formulaKm: "កូដុងបញ្ឈប់៖ UAA, UAG, UGA; កូដុងចាប់ផ្តើម៖ AUG (មេទីយូនីន)",
      chapter: "Gene Expression", chapterKm: "ការសម្តែងចេញនៃហ្សែន" },
    { topic: "The role of tRNA", topicKm: "តួនាទីរបស់ ARNt", difficulty: "Medium",
      prompt: "What is the main role of tRNA (transfer RNA) in protein synthesis?", promptKm: "តើតួនាទីចម្បងរបស់ ARNt (ARN ដឹកនាំ) ក្នុងការសំយោគប្រូតេអ៊ីនជាអ្វី?",
      options: ["It carries a specific amino acid to the ribosome and matches its anticodon to the mRNA codon", "It copies DNA into mRNA", "It builds the ribosome itself", "It stores the cell's genetic information"], answer: "It carries a specific amino acid to the ribosome and matches its anticodon to the mRNA codon",
      optionsKm: ["វាដឹកនាំអាស៊ីតអាមីណេជាក់លាក់ទៅរីបូសូម ហើយផ្គូអង់ទីកូដុងរបស់វាជាមួយកូដុង ARNm", "វាចម្លង ADN ទៅជា ARNm", "វាសាងសង់រីបូសូមខ្លួនឯង", "វាផ្ទុកព័ត៌មានតំណពូជរបស់កោសិកា"], answerKm: "វាដឹកនាំអាស៊ីតអាមីណេជាក់លាក់ទៅរីបូសូម ហើយផ្គូអង់ទីកូដុងរបស់វាជាមួយកូដុង ARNm",
      explanation: "Each tRNA molecule picks up one specific amino acid from the cytoplasm and carries it to the ribosome, where its three-nucleotide anticodon pairs with the matching mRNA codon — ensuring amino acids are added in the correct order to build the protein.", explanationKm: "ARNt នីមួយៗចាប់យកអាស៊ីតអាមីណេជាក់លាក់មួយពីស៊ីតូប្លាស ហើយដឹកនាំវាទៅរីបូសូម ជាកន្លែងដែលអង់ទីកូដុងនុយក្លេអូទីតបីរបស់វាផ្គូជាមួយកូដុង ARNm ដែលត្រូវគ្នា ធានាថាអាស៊ីតអាមីណេត្រូវបានបន្ថែមតាមលំដាប់ត្រឹមត្រូវដើម្បីសាងសង់ប្រូតេអ៊ីន។",
      formula: "tRNA: carries amino acid + anticodon matches mRNA codon", formulaKm: "ARNt៖ ដឹកនាំអាស៊ីតអាមីណេ + អង់ទីកូដុងផ្គូនឹងកូដុង ARNm",
      chapter: "Gene Expression", chapterKm: "ការសម្តែងចេញនៃហ្សែន" },
    { topic: "Two stages of protein synthesis", topicKm: "ដំណាក់កាលពីរនៃការសំយោគប្រូតេអ៊ីន", difficulty: "Medium",
      prompt: "Protein synthesis (gene expression) happens in two main stages. What are they, and where does each occur?", promptKm: "ការសំយោគប្រូតេអ៊ីន (ការសម្តែងចេញនៃហ្សែន) កើតឡើងជាពីរដំណាក់កាលចម្បង។ តើអ្វីខ្លះ និងនីមួយៗកើតឡើងនៅឯណា?",
      options: ["Transcription (in the nucleus) and translation (in the cytoplasm, at the ribosome)", "Digestion and absorption, both in the stomach", "Replication and mutation, both in the mitochondria", "Fertilization and cleavage, both in the ovary"], answer: "Transcription (in the nucleus) and translation (in the cytoplasm, at the ribosome)",
      optionsKm: ["ចម្លងសម្រង (ក្នុងស្នូល) និងបកប្រែសម្រង (ក្នុងស៊ីតូប្លាស នៅរីបូសូម)", "ការរំលាយអាហារ និងការស្រូប ទាំងពីរនៅក្នុងក្រពះ", "ការចម្លងខ្លួនឯង និងការផ្លាស់ប្តូរហ្សែន ទាំងពីរនៅមីតូខនឌ្រី", "ការបង្កកំណើត និងការបែងចែកកោសិកា ទាំងពីរនៅអូវែរ"], answerKm: "ចម្លងសម្រង (ក្នុងស្នូល) និងបកប្រែសម្រង (ក្នុងស៊ីតូប្លាស នៅរីបូសូម)",
      explanation: "Stage 1, transcription, copies the DNA gene sequence into mRNA inside the nucleus. Stage 2, translation, reads the mRNA codons at the ribosome in the cytoplasm and assembles the corresponding amino acids into a protein.", explanationKm: "ដំណាក់កាលទី១ ចម្លងសម្រង ចម្លងលំដាប់ហ្សែន ADN ទៅជា ARNm ខាងក្នុងស្នូល។ ដំណាក់កាលទី២ បកប្រែសម្រង អានកូដុង ARNm នៅរីបូសូមក្នុងស៊ីតូប្លាស ហើយផ្គុំអាស៊ីតអាមីណេដែលត្រូវគ្នាទៅជាប្រូតេអ៊ីន។",
      formula: "Transcription (nucleus) → mRNA → Translation (ribosome) → protein", formulaKm: "ចម្លងសម្រង (ស្នូល) → ARNm → បកប្រែសម្រង (រីបូសូម) → ប្រូតេអ៊ីន",
      chapter: "Gene Expression", chapterKm: "ការសម្តែងចេញនៃហ្សែន" },
    { topic: "Selective breeding", topicKm: "ជំរើសពូជ", difficulty: "Easy",
      prompt: "What is selective breeding?", promptKm: "តើជំរើសពូជជាអ្វី?",
      options: ["A farming practice that selects good breeding stock and eliminates weak stock to improve future generations", "A method of cloning that requires no reproduction", "A way to directly edit an organism's DNA sequence", "A type of vaccine production"], answer: "A farming practice that selects good breeding stock and eliminates weak stock to improve future generations",
      optionsKm: ["ការអនុវត្តកសិកម្មដែលជ្រើសរើសពូជល្អ និងលុបបំបាត់ពូជអន់ ដើម្បីធ្វើឲ្យសន្តានក្រោយប្រសើរឡើង", "វិធីសាស្ត្រក្លូនដែលមិនត្រូវការបន្តពូជទេ", "វិធីកែសម្រួលលំដាប់ ADN របស់សារពាង្គកាយដោយផ្ទាល់", "ប្រភេទផលិតវ៉ាក់សាំងមួយ"], answerKm: "ការអនុវត្តកសិកម្មដែលជ្រើសរើសពូជល្អ និងលុបបំបាត់ពូជអន់ ដើម្បីធ្វើឲ្យសន្តានក្រោយប្រសើរឡើង",
      explanation: "Selective breeding is a traditional agricultural practice in which good stock is chosen and poor stock is eliminated over generations, gradually improving desirable traits in crops or livestock — distinct from modern genetic engineering.", explanationKm: "ជំរើសពូជជាការអនុវត្តកសិកម្មបែបប្រពៃណីមួយ ដែលពូជល្អត្រូវបានជ្រើសរើស និងពូជអន់ត្រូវបានលុបបំបាត់ឆ្លងកាត់ជំនាន់ជាច្រើន ធ្វើឲ្យលក្ខណៈចង់បានប្រសើរឡើងបន្តិចម្តងៗនៅក្នុងដំណាំ ឬសត្វចិញ្ចឹម ខុសពីវិស្វកម្មតំណពូជទំនើប។",
      formula: "Selective breeding: choose best stock over generations", formulaKm: "ជំរើសពូជ៖ ជ្រើសរើសពូជល្អបំផុតឆ្លងកាត់ជំនាន់",
      chapter: "Biotechnology", chapterKm: "បច្ចេកទេសជីវវិទ្យា" },
    { topic: "Inbreeding vs outcrossing", topicKm: "ការបង្កាត់ជិត ធៀបនឹងការបង្កាត់ឆ្ងាយ", difficulty: "Medium",
      prompt: "What is a major risk of inbreeding (breeding between close relatives)?", promptKm: "តើហានិភ័យសំខាន់នៃការបង្កាត់ជិត (ការបង្កាត់រវាងញាតិសន្តានជិតស្និទ្ធ) ជាអ្វី?",
      options: ["Weakened offspring vitality and reduced fertility over generations", "Immediate improvement of all traits", "Complete elimination of all genetic disease", "No risk at all compared to outcrossing"], answer: "Weakened offspring vitality and reduced fertility over generations",
      optionsKm: ["កម្លាំងជីវិតកូនចៅចុះខ្សោយ និងលទ្ធភាពបន្តពូជថយចុះឆ្លងកាត់ជំនាន់", "ភាពប្រសើរឡើងភ្លាមៗលើលក្ខណៈទាំងអស់", "លុបបំបាត់ជំងឺតំណពូជទាំងអស់ទាំងស្រុង", "គ្មានហានិភ័យអ្វីទាល់តែសោះបើប្រៀបនឹងការបង្កាត់ឆ្ងាយ"], answerKm: "កម្លាំងជីវិតកូនចៅចុះខ្សោយ និងលទ្ធភាពបន្តពូជថយចុះឆ្លងកាត់ជំនាន់",
      explanation: "Inbreeding (mating between close relatives) tends to weaken offspring vitality and fertility over generations, and increases the chance that harmful recessive traits appear, since it raises chromosome homozygosity. Outcrossing (mating between different breeds/species) generally produces hybrids with better vigor, higher yield, and greater disease resistance, but animals from very different species often cannot produce offspring together.", explanationKm: "ការបង្កាត់ជិត (ការបង្កាត់រវាងញាតិសន្តានជិតស្និទ្ធ) មានទំនោរធ្វើឲ្យកម្លាំងជីវិត និងលទ្ធភាពបន្តពូជរបស់កូនចៅចុះខ្សោយឆ្លងកាត់ជំនាន់ និងបង្កើនឱកាសលេចធ្លោលក្ខណៈកប់កំបាំងបង្កគ្រោះថ្នាក់ ព្រោះវាបង្កើនភាពដូចគ្នានៃក្រូម៉ូសូម។ ការបង្កាត់ឆ្ងាយ (រវាងពូជ/ប្រភេទខុសគ្នា) ជាទូទៅផលិតកូនកាត់មានកម្លាំងជីវិតល្អ ទិន្នផលខ្ពស់ និងធន់នឹងជំងឺ ប៉ុន្តែសត្វមកពីប្រភេទខុសគ្នាឆ្ងាយពេក ជារឿយៗមិនអាចបង្កកំណើតបានជាមួយគ្នា។",
      formula: "Inbreeding: weaker vigor; Outcrossing: hybrid vigor", formulaKm: "បង្កាត់ជិត៖ កម្លាំងជីវិតចុះខ្សោយ; បង្កាត់ឆ្ងាយ៖ កម្លាំងជីវិតកូនកាត់ល្អ",
      chapter: "Biotechnology", chapterKm: "បច្ចេកទេសជីវវិទ្យា" },
    { topic: "Steps of genetic engineering", topicKm: "ជំហាននៃវិស្វកម្មតំណពូជ", difficulty: "Hard",
      prompt: "Genetic engineering to produce a substance like human insulin in bacteria involves 4 main steps. What is the first step?", promptKm: "វិស្វកម្មតំណពូជសម្រាប់ផលិតសារធាតុដូចជាអាំងស៊ុយលីនមនុស្សក្នុងបាក់តេរី ពាក់ព័ន្ធនឹងជំហានចម្បង៤។ តើជំហានទីមួយជាអ្វី?",
      options: ["Cutting the desired DNA molecule into small fragments using restriction enzymes", "Injecting bacteria directly into a human", "Growing the plant in soil", "Harvesting the final product immediately"], answer: "Cutting the desired DNA molecule into small fragments using restriction enzymes",
      optionsKm: ["កាត់ម៉ូលេគុល ADN ចង់បានទៅជាបំណែកតូចៗដោយប្រើអង់ស៊ីមកំណាត់", "ចាក់បាក់តេរីដោយផ្ទាល់ចូលទៅក្នុងមនុស្ស", "ដាំរុក្ខជាតិក្នុងដី", "ប្រមូលផលិតផលចុងក្រោយភ្លាមៗ"], answerKm: "កាត់ម៉ូលេគុល ADN ចង់បានទៅជាបំណែកតូចៗដោយប្រើអង់ស៊ីមកំណាត់",
      explanation: "The 4 steps of genetic engineering are: (1) cutting the DNA molecule into fragments using a restriction enzyme, (2) inserting the desired DNA fragment into a bacterial plasmid using a ligase enzyme, (3) cloning the recombinant bacteria so it multiplies, and (4) expressing the inserted gene so the bacteria produce the desired substance (e.g. insulin).", explanationKm: "ជំហាន៤ របស់វិស្វកម្មតំណពូជគឺ៖ (១) កាត់ម៉ូលេគុល ADN ទៅជាបំណែកដោយប្រើអង់ស៊ីមកំណាត់ (២) បញ្ចូលបំណែក ADN ចង់បានទៅក្នុងប្លាស្មីតបាក់តេរីដោយប្រើអង់ស៊ីមភ្ជាប់ (៣) ក្លូនបាក់តេរីកំចាត់ថ្មីដើម្បីឲ្យវាបន្តពូជ និង (៤) បង្ហាញហ្សែនដែលបានបញ្ចូល ដើម្បីឲ្យបាក់តេរីផលិតសារធាតុចង់បាន (ឧ. អាំងស៊ុយលីន)។",
      formula: "4 steps: cut DNA → insert into plasmid → clone bacteria → express gene", formulaKm: "ជំហាន៤៖ កាត់ ADN → បញ្ចូលប្លាស្មីត → ក្លូនបាក់តេរី → បង្ហាញហ្សែន",
      chapter: "Biotechnology", chapterKm: "បច្ចេកទេសជីវវិទ្យា" },
    { topic: "Benefits of genetic engineering", topicKm: "អត្ថប្រយោជន៍នៃវិស្វកម្មតំណពូជ", difficulty: "Medium",
      prompt: "In the field of healthcare, what does genetic engineering allow scientists to produce?", promptKm: "ក្នុងវិស័យសុខាភិបាល តើវិស្វកម្មតំណពូជអនុញ្ញាតឲ្យអ្នកវិទ្យាសាស្ត្រផលិតអ្វី?",
      options: ["Insulin, vaccines, antibodies and growth hormone", "Only fruit juice", "Only cooking oil", "Only clothing fibers"], answer: "Insulin, vaccines, antibodies and growth hormone",
      optionsKm: ["អាំងស៊ុយលីន វ៉ាក់សាំង អង់ទីករ និងអរម៉ូនលូតលាស់", "ទឹកផ្លែឈើតែប៉ុណ្ណោះ", "ប្រេងចម្អិនតែប៉ុណ្ណោះ", "សរសៃសំពត់តែប៉ុណ្ណោះ"], answerKm: "អាំងស៊ុយលីន វ៉ាក់សាំង អង់ទីករ និងអរម៉ូនលូតលាស់",
      explanation: "Genetic engineering benefits healthcare by enabling mass production of substances such as human insulin (for diabetes), vaccines, antibodies, and growth hormone, using genetically modified bacteria as living factories.", explanationKm: "វិស្វកម្មតំណពូជផ្តល់អត្ថប្រយោជន៍ដល់សុខាភិបាល ដោយអនុញ្ញាតឲ្យផលិតសារធាតុដូចជាអាំងស៊ុយលីនមនុស្ស (សម្រាប់ជំងឺទឹកនោមផ្អែម) វ៉ាក់សាំង អង់ទីករ និងអរម៉ូនលូតលាស់ជាចំនួនច្រើន ដោយប្រើបាក់តេរីកែប្រែហ្សែនជារោងចក្ររស់។",
      formula: "Genetic engineering in health: insulin + vaccines + antibodies + hormones", formulaKm: "វិស្វកម្មតំណពូជក្នុងសុខាភិបាល៖ អាំងស៊ុយលីន + វ៉ាក់សាំង + អង់ទីករ + អរម៉ូន",
      chapter: "Biotechnology", chapterKm: "បច្ចេកទេសជីវវិទ្យា" },
    { topic: "Risks of genetic engineering", topicKm: "ហានិភ័យនៃវិស្វកម្មតំណពូជ", difficulty: "Hard",
      prompt: "Which of these is a recognized environmental risk of genetically modified (GM) crops?", promptKm: "តើមួយណាខាងក្រោមជាហានិភ័យបរិស្ថានដែលទទួលស្គាល់នៃដំណាំកែប្រែហ្សែន (GM)?",
      options: ["It can kill insects living on GM plants, disrupting biodiversity", "It always improves biodiversity", "It has zero effect on any other organism", "It only affects the taste of the crop"], answer: "It can kill insects living on GM plants, disrupting biodiversity",
      optionsKm: ["អាចសម្លាប់សត្វល្អិតដែលរស់នៅលើរុក្ខជាតិ GM រំខានដល់ជីវចម្រុះ", "តែងតែកែលម្អជីវចម្រុះជានិច្ច", "គ្មានឥទ្ធិពលអ្វីទាល់តែសោះលើសារពាង្គកាយផ្សេងទៀត", "ជះឥទ្ធិពលតែលើរសជាតិនៃដំណាំប៉ុណ្ណោះ"], answerKm: "អាចសម្លាប់សត្វល្អិតដែលរស់នៅលើរុក្ខជាតិ GM រំខានដល់ជីវចម្រុះ",
      explanation: "Recognized risks of GM crops include environmental effects (such as killing insects that live on GM plants, disrupting biodiversity, and increasing pest resistance to toxins), economic effects (farmers becoming dependent on seed companies), health effects (possible immune reactions, antibiotic resistance genes), and social/ethical concerns.", explanationKm: "ហានិភ័យដែលទទួលស្គាល់នៃដំណាំ GM រួមមានផលប៉ះពាល់បរិស្ថាន (ដូចជាសម្លាប់សត្វល្អិតដែលរស់នៅលើរុក្ខជាតិ GM រំខានដល់ជីវចម្រុះ និងបង្កើនភាពធន់សត្វល្អិតនឹងសារធាតុពុល) ផលប៉ះពាល់សេដ្ឋកិច្ច (កសិករពឹងផ្អែកលើក្រុមហ៊ុនគ្រាប់ពូជ) ផលប៉ះពាល់សុខភាព (ប្រតិកម្មប្រព័ន្ធភាពស៊ាំ ហ្សែនធន់នឹងថ្នាំអង់ទីប្យូទិច) និងកង្វល់សង្គម/សីលធម៌។",
      formula: "GM crop risks: environment + economy + health + ethics", formulaKm: "ហានិភ័យដំណាំ GM៖ បរិស្ថាន + សេដ្ឋកិច្ច + សុខភាព + សីលធម៌",
      chapter: "Biotechnology", chapterKm: "បច្ចេកទេសជីវវិទ្យា" },
    { topic: "Cloning", topicKm: "ក្លូន", difficulty: "Medium",
      prompt: "What is a clone?", promptKm: "តើក្លូនជាអ្វី?",
      options: ["A group of organisms produced from a single original cell, all with identical genetic information", "A hybrid between two different species", "Any organism produced through normal sexual reproduction", "A mutated organism with new traits"], answer: "A group of organisms produced from a single original cell, all with identical genetic information",
      optionsKm: ["ក្រុមសារពាង្គកាយដែលបានផលិតចេញពីកោសិកាដើមតែមួយ ដែលទាំងអស់មានព័ត៌មានតំណពូជដូចគ្នា", "កូនកាត់រវាងប្រភេទពីរផ្សេងគ្នា", "សារពាង្គកាយណាមួយដែលផលិតតាមរយៈការបន្តពូជផ្លូវភេទធម្មតា", "សារពាង្គកាយផ្លាស់ប្តូរហ្សែនដែលមានលក្ខណៈថ្មី"], answerKm: "ក្រុមសារពាង្គកាយដែលបានផលិតចេញពីកោសិកាដើមតែមួយ ដែលទាំងអស់មានព័ត៌មានតំណពូជដូចគ្នា",
      explanation: "A clone is a group of organisms that all originate from the same single cell and share identical genetic information — as demonstrated by cloning experiments like producing 10 genetically identical calves from a single high-quality cow's embryo.", explanationKm: "ក្លូនជាក្រុមសារពាង្គកាយដែលទាំងអស់មានប្រភពចេញពីកោសិកាតែមួយ និងមានព័ត៌មានតំណពូជដូចគ្នាបេះបិទ ដូចបានបង្ហាញក្នុងការពិសោធន៍ក្លូនដូចជាការផលិតកូនគោ១០ក្បាលមានលក្ខណៈដូចគ្នាបេះបិទ ចេញពីអំព្រីយុងគោគុណភាពខ្ពស់តែមួយ។",
      formula: "Clone = same original cell → identical genetic information", formulaKm: "ក្លូន = កោសិកាដើមតែមួយ → ព័ត៌មានតំណពូជដូចគ្នា",
      chapter: "Biotechnology", chapterKm: "បច្ចេកទេសជីវវិទ្យា" },
    { topic: "Lamarck's theory", topicKm: "ទ្រឹស្តីរបស់ឡាម៉ាក់", difficulty: "Medium",
      prompt: "What was Lamarck's view on the origin of life on Earth?", promptKm: "តើមតិរបស់ឡាម៉ាក់អំពីដើមកំណើតនៃជីវិតលើផែនដីជាអ្វី?",
      options: ["Simple early life forms gradually transformed over a very long time into today's diverse species", "All species were created instantly in their current form", "Life came from a single event with no further change", "Species only ever get simpler, never more complex"], answer: "Simple early life forms gradually transformed over a very long time into today's diverse species",
      optionsKm: ["ភាវៈរស់ដំបូងសាមញ្ញបានផ្លាស់ប្តូរបន្តិចម្តងៗអស់រយៈពេលដ៏វែង ក្លាយទៅជាប្រភេទចម្រុះសព្វថ្ងៃ", "ប្រភេទទាំងអស់ត្រូវបានបង្កើតភ្លាមៗក្នុងទម្រង់បច្ចុប្បន្នរបស់វា", "ជីវិតកើតចេញពីព្រឹត្តិការណ៍តែមួយដោយគ្មានការផ្លាស់ប្តូរបន្ថែម", "ប្រភេទតែងតែទៅជាសាមញ្ញជាងមុន មិនដែលស្មុគស្មាញជាងទេ"], answerKm: "ភាវៈរស់ដំបូងសាមញ្ញបានផ្លាស់ប្តូរបន្តិចម្តងៗអស់រយៈពេលដ៏វែង ក្លាយទៅជាប្រភេទចម្រុះសព្វថ្ងៃ",
      explanation: "Lamarck proposed that the earliest living things to appear on Earth were simple organisms, which then gradually transformed over a very long period of time into the diverse species of living things found on Earth today.", explanationKm: "ឡាម៉ាក់បានស្នើថា ភាវៈរស់ដំបូងបំផុតដែលកកើតឡើងលើផែនដី ជាសារពាង្គកាយសាមញ្ញ ដែលក្រោយមកបានផ្លាស់ប្តូរបន្តិចម្តងៗអស់រយៈពេលដ៏វែង ក្លាយទៅជាប្រភេទភាវៈរស់ចម្រុះដែលរកឃើញលើផែនដីសព្វថ្ងៃ។",
      formula: "Lamarck: simple organisms → gradual change → diverse species", formulaKm: "ឡាម៉ាក់៖ សារពាង្គកាយសាមញ្ញ → ផ្លាស់ប្តូរបន្តិចម្តងៗ → ប្រភេទចម្រុះ",
      chapter: "Evolution Theory (Darwin)", chapterKm: "ទ្រឹស្តីវិវត្តន៍ដាវីន" },
    { topic: "Darwin's voyage", topicKm: "ដំណើររបស់ដាវីន", difficulty: "Medium",
      prompt: "Darwin's famous voyage on the HMS Beagle visited which islands, whose unique wildlife strongly influenced his theory of evolution?", promptKm: "ដំណើររបស់ដាវីនតាមកប៉ាល់ HMS Beagle បានទស្សនាកោះមួយណា ដែលសត្វព្រៃពិសេសរបស់វាជះឥទ្ធិពលយ៉ាងខ្លាំងដល់ទ្រឹស្តីវិវត្តន៍របស់គាត់?",
      options: ["The Galápagos Islands", "The Hawaiian Islands", "The Philippine Islands", "The islands of Japan"], answer: "The Galápagos Islands",
      optionsKm: ["កោះកាឡាបាក់ុស", "កោះហាវ៉ៃ", "កោះហ្វីលីពីន", "កោះជប៉ុន"], answerKm: "កោះកាឡាបាក់ុស",
      explanation: "Darwin's voyage went from England, to South America, to the Galápagos Islands, to Australia, around Africa, and back to England. Observing how species differed between the Galápagos Islands and the South American mainland was key to developing his theory of evolution.", explanationKm: "ដំណើររបស់ដាវីនចេញពីប្រទេសអង់គ្លេស ទៅអាមេរិកខាងត្បូង ទៅកោះកាឡាបាក់ុស ទៅទ្វីបអូស្ត្រាលី ជុំវិញទ្វីបអាហ្វ្រិក ហើយត្រឡប់ចូលអង់គ្លេសវិញ។ ការសង្កេតមើលរបៀបដែលប្រភេទសត្វខុសគ្នារវាងកោះកាឡាបាក់ុស និងទ្វីបអាមេរិកខាងត្បូង ជាគន្លឹះក្នុងការបង្កើតទ្រឹស្តីវិវត្តន៍របស់គាត់។",
      formula: "Darwin's voyage: England → S. America → Galápagos → Australia → England", formulaKm: "ដំណើរដាវីន៖ អង់គ្លេស → អាមេរិកខាងត្បូង → កាឡាបាក់ុស → អូស្ត្រាលី → អង់គ្លេស",
      chapter: "Evolution Theory (Darwin)", chapterKm: "ទ្រឹស្តីវិវត្តន៍ដាវីន" },
    { topic: "Tortoises on different islands", topicKm: "អណ្តើកលើកោះផ្សេងគ្នា", difficulty: "Medium",
      prompt: "Darwin observed that giant tortoises differed between islands of the Galápagos. What explains this, according to his theory?", promptKm: "ដាវីនបានសង្កេតឃើញថាអណ្តើកយក្សខុសគ្នារវាងកោះនានារបស់កាឡាបាក់ុស។ តើអ្វីពន្យល់រឿងនេះ តាមទ្រឹស្តីរបស់គាត់?",
      options: ["Tortoises on different islands adapted differently to each island's own food sources and conditions", "All tortoises are always genetically identical everywhere", "Tortoises cannot adapt to their environment at all", "Only humans caused the tortoises to look different"], answer: "Tortoises on different islands adapted differently to each island's own food sources and conditions",
      optionsKm: ["អណ្តើកលើកោះនីមួយៗសម្របខ្លួនខុសគ្នាតាមប្រភពអាហារ និងលក្ខខណ្ឌនៃកោះនោះៗ", "អណ្តើកទាំងអស់តែងតែដូចគ្នាតាមតំណពូជគ្រប់ទីកន្លែង", "អណ្តើកមិនអាចសម្របខ្លួនទៅនឹងបរិស្ថានទាល់តែសោះ", "មានតែមនុស្សប៉ុណ្ណោះដែលធ្វើឲ្យអណ្តើកមើលទៅខុសគ្នា"], answerKm: "អណ្តើកលើកោះនីមួយៗសម្របខ្លួនខុសគ្នាតាមប្រភពអាហារ និងលក្ខខណ្ឌនៃកោះនោះៗ",
      explanation: "According to Darwin's theory of adaptation, tortoise populations that became isolated on different islands adapted to their own island's specific food sources and environment over generations, gradually developing different shell shapes and features suited to local conditions.", explanationKm: "តាមទ្រឹស្តីនៃការសម្របខ្លួនរបស់ដាវីន ប្រជាសត្វអណ្តើកដែលដាច់ដោយឡែកនៅលើកោះនីមួយៗ បានសម្របខ្លួនទៅនឹងប្រភពអាហារ និងបរិស្ថានជាក់លាក់នៃកោះនោះឆ្លងកាត់ជំនាន់ ធ្វើឲ្យវិវត្តទម្រង់សំបក និងលក្ខណៈខុសគ្នា សមស្របនឹងលក្ខខណ្ឌមូលដ្ឋាន។",
      formula: "Isolated populations → adapt to local island conditions → different traits", formulaKm: "ប្រជាសត្វដាច់ដោយឡែក → សម្របតាមលក្ខខណ្ឌកោះ → លក្ខណៈខុសគ្នា",
      chapter: "Evolution Theory (Darwin)", chapterKm: "ទ្រឹស្តីវិវត្តន៍ដាវីន" },
    { topic: "Overproduction of offspring", topicKm: "ការបង្កើតកូនច្រើនហួសប្រមាណ", difficulty: "Medium",
      prompt: "According to Darwin, why is it important for evolution that organisms produce far more offspring than can survive?", promptKm: "តាមទ្រឹស្តីដាវីន ហេតុអ្វីបានជាការបង្កើតកូនច្រើនហួសប្រមាណជាងអ្វីដែលអាចរស់រានមានសារៈសំខាន់ចំពោះការវិវត្ត?",
      options: ["It creates competition, so only the best-adapted individuals survive and pass on their traits", "It guarantees every offspring survives equally", "It has no relationship to natural selection", "It only matters for plants, not animals"], answer: "It creates competition, so only the best-adapted individuals survive and pass on their traits",
      optionsKm: ["វាបង្កើតការប្រកួតប្រជែង ដូច្នេះមានតែឯកត្តាសម្របបានល្អបំផុតទេដែលរស់រាន និងបន្តលក្ខណៈរបស់វា", "វាធានាថាកូនរបស់ចៅរស់រានស្មើគ្នាទាំងអស់", "វាគ្មានទំនាក់ទំនងអ្វីនឹងជំរើសធម្មជាតិទេ", "វាសំខាន់តែចំពោះរុក្ខជាតិប៉ុណ្ណោះ មិនមែនសត្វទេ"], answerKm: "វាបង្កើតការប្រកួតប្រជែង ដូច្នេះមានតែឯកត្តាសម្របបានល្អបំផុតទេដែលរស់រាន និងបន្តលក្ខណៈរបស់វា",
      explanation: "Since food and space are limited, producing far more offspring than can survive creates a struggle for existence. Individuals whose traits are best adapted to the environment survive and reproduce, passing those advantageous traits to the next generation — the mechanism of natural selection.", explanationKm: "ដោយសារអាហារ និងកន្លែងមានកម្រិត ការបង្កើតកូនច្រើនហួសប្រមាណជាងអ្វីដែលអាចរស់រាន បង្កើតការប្រយុទ្ធដើម្បីរស់។ ឯកត្តាដែលមានលក្ខណៈសម្របនឹងបរិស្ថានបានល្អបំផុត នឹងរស់រាន និងបន្តពូជ ផ្ទេរលក្ខណៈដ៏មានប្រយោជន៍ទាំងនោះទៅសន្តានក្រោយ ជាយន្តការនៃជំរើសធម្មជាតិ។",
      formula: "Overproduction → competition → natural selection → survival of the fittest", formulaKm: "កូនច្រើនហួស → ប្រកួតប្រជែង → ជំរើសធម្មជាតិ → រស់រានអ្នកសមស្របបំផុត",
      chapter: "Evolution Theory (Darwin)", chapterKm: "ទ្រឹស្តីវិវត្តន៍ដាវីន" },
    { topic: "Variation", topicKm: "បម្រែបម្រួល", difficulty: "Easy",
      prompt: "What is \"variation\" in the context of evolution?", promptKm: "តើ \"បម្រែបម្រួល\" ក្នុងបរិបទវិវត្តន៍ជាអ្វី?",
      options: ["Differences that exist between individuals of the same species", "The complete absence of any difference within a species", "A change that only happens to a whole species at once", "A type of disease"], answer: "Differences that exist between individuals of the same species",
      optionsKm: ["ភាពខុសគ្នាដែលមាននៅចំណោមឯកត្តាក្នុងប្រភេទតែមួយ", "អវត្តមានពេញលេញនៃភាពខុសគ្នាណាមួយក្នុងប្រភេទមួយ", "ការផ្លាស់ប្តូរដែលកើតឡើងតែចំពោះប្រភេទទាំងមូលក្នុងពេលតែមួយ", "ប្រភេទជំងឺមួយ"], answerKm: "ភាពខុសគ្នាដែលមាននៅចំណោមឯកត្តាក្នុងប្រភេទតែមួយ",
      explanation: "Variation is the natural difference between individuals of the same species — for example, puppies from the same litter may differ in color and shape, with some being hairless or having more fur than usual.", explanationKm: "បម្រែបម្រួលជាភាពខុសគ្នាធម្មជាតិរវាងឯកត្តាក្នុងប្រភេទតែមួយ ឧទាហរណ៍ កូនឆ្កែពីមេតែមួយអាចមានពណ៌ និងរូបរាងខុសគ្នា ខ្លះគ្មានរោម ឬមានរោមច្រើនជាងធម្មតា។",
      formula: "Variation: differences within the same species", formulaKm: "បម្រែបម្រួល៖ ភាពខុសគ្នាក្នុងប្រភេទតែមួយ",
      chapter: "Evolution Theory (Darwin)", chapterKm: "ទ្រឹស្តីវិវត្តន៍ដាវីន" },
    { topic: "Comparative anatomy", topicKm: "កាយវិភាគប្រៀបធៀប", difficulty: "Hard",
      prompt: "The forelimbs of vertebrates such as humans, whales, and bats have very similar bone structures despite different functions. What is this evidence for?", promptKm: "ជើងមុខរបស់សត្វឆ្អឹងខ្នងដូចជាមនុស្ស ត្រី និងសត្វប្រចៀវ មានរចនាសម្ព័ន្ធឆ្អឹងស្រដៀងគ្នាខ្លាំង ទោះបីជាមុខងារខុសគ្នា។ តើនេះជាភស្តុតាងសម្រាប់អ្វី?",
      options: ["Evolution from a common ancestor", "That these species have no relation to one another", "That bones can change shape within one animal's lifetime", "That all vertebrates eat the same food"], answer: "Evolution from a common ancestor",
      optionsKm: ["ការវិវត្តពីបុព្វបុរសរួមមួយ", "ថាប្រភេទទាំងនេះគ្មានទំនាក់ទំនងអ្វីនឹងគ្នាឡើយ", "ថាឆ្អឹងអាចប្តូររាងក្នុងអំឡុងជីវិតសត្វតែមួយ", "ថាសត្វឆ្អឹងខ្នងទាំងអស់ញ៉ាំអាហារដូចគ្នា"], answerKm: "ការវិវត្តពីបុព្វបុរសរួមមួយ",
      explanation: "Structures that have a similar bone arrangement and originate from the same structure in a common ancestor, even though they now serve different functions (grasping, swimming, flying), are called homologous structures — strong evidence that these species evolved from a common ancestor.", explanationKm: "រចនាសម្ព័ន្ធដែលមានការរៀបចំឆ្អឹងស្រដៀងគ្នា និងមានប្រភពពីរចនាសម្ព័ន្ធតែមួយក្នុងបុព្វបុរសរួម ទោះបីជាឥឡូវនេះបម្រើមុខងារផ្សេងគ្នា (ចាប់ កាត់ហែល ហោះ) ត្រូវបានហៅថារចនាសម្ព័ន្ធអូម៉ូឡូក ជាភស្តុតាងខ្លាំងថាប្រភេទទាំងនេះវិវត្តពីបុព្វបុរសរួមមួយ។",
      formula: "Homologous structures (same origin, different function) = evidence of common ancestry", formulaKm: "រចនាសម្ព័ន្ធអូម៉ូឡូក (ប្រភពដូច មុខងារខុស) = ភស្តុតាងបុព្វបុរសរួម",
      chapter: "Evolution Theory (Darwin)", chapterKm: "ទ្រឹស្តីវិវត្តន៍ដាវីន" },
    { topic: "What is a fossil", topicKm: "ហ្វូស៊ីលជាអ្វី", difficulty: "Easy",
      prompt: "What is a fossil?", promptKm: "តើហ្វូស៊ីលជាអ្វី?",
      options: ["A trace or remains left behind by an ancient organism, preserved in rock", "A living organism found only today", "A type of modern mineral with no biological origin", "A man-made sculpture of an animal"], answer: "A trace or remains left behind by an ancient organism, preserved in rock",
      optionsKm: ["ស្នាម ឬសំណល់ដែលបន្សល់ទុកដោយភាវៈរស់សម័យបុរាណ ដែលរក្សាទុកនៅក្នុងថ្ម", "ភាវៈរស់ដែលរកឃើញតែសព្វថ្ងៃប៉ុណ្ណោះ", "ប្រភេទរ៉ែទំនើបគ្មានប្រភពជីវសាស្ត្រ", "ចម្លាក់សត្វធ្វើដោយមនុស្ស"], answerKm: "ស្នាម ឬសំណល់ដែលបន្សល់ទុកដោយភាវៈរស់សម័យបុរាណ ដែលរក្សាទុកនៅក្នុងថ្ម",
      explanation: "A fossil is a trace or remnant left behind by an ancient organism preserved in rock, such as bone, a shell imprint, or in rare cases (frozen in ice or trapped in amber) the entire body.", explanationKm: "ហ្វូស៊ីលជាស្នាម ឬសំណល់ដែលបន្សល់ទុកដោយភាវៈរស់សម័យបុរាណ រក្សាទុកនៅក្នុងថ្ម ដូចជាឆ្អឹង ស្នាមសំបក ឬក្នុងករណីកម្រ (កកនៅក្នុងទឹកកក ឬជាប់នៅក្នុងជ័រអំពៅ) រាងកាយទាំងមូល។",
      formula: "Fossil = ancient remains/traces preserved in rock", formulaKm: "ហ្វូស៊ីល = សំណល់/ស្នាមបុរាណរក្សាទុកក្នុងថ្ម",
      chapter: "Fossils & Evidence of Evolution", chapterKm: "កំណត់ត្រាផូស៊ីល" },
    { topic: "Three ways fossils form", topicKm: "របៀបបង្កើតហ្វូស៊ីលបីរបៀប", difficulty: "Medium",
      prompt: "Fossils can form in three main ways. What are they?", promptKm: "ហ្វូស៊ីលអាចបង្កើតឡើងបានបីរបៀបចម្បង។ តើអ្វីខ្លះ?",
      options: ["Petrification (turning to stone), mold/cast impressions, and preservation of the whole body", "Only petrification", "Only freezing in ice", "Only through human excavation"], answer: "Petrification (turning to stone), mold/cast impressions, and preservation of the whole body",
      optionsKm: ["ដំណើរកាលយជាថម ការបង្កើតពុម្ពក្រៅ និងពុម្ពក្នុង និងការរក្សាទុករាងកាយទាំងមូល", "ដំណើរកាលយជាថមតែប៉ុណ្ណោះ", "ការកកក្នុងទឹកកកតែប៉ុណ្ណោះ", "ការជីកកកាយដោយមនុស្សតែប៉ុណ្ណោះ"], answerKm: "ដំណើរកាលយជាថម ការបង្កើតពុម្ពក្រៅ និងពុម្ពក្នុង និងការរក្សាទុករាងកាយទាំងមូល",
      explanation: "Fossils form in 3 ways: (1) petrification, where minerals gradually replace the remains, turning them to stone; (2) mold and cast formation, where an organism decays leaving an empty mold that later fills with sediment; and (3) whole-body preservation, when a carcass is buried in tree resin (amber) or trapped in ice.", explanationKm: "ហ្វូស៊ីលបង្កើតឡើងបានបីរបៀប៖ (១) ដំណើរកាលយជាថម ដែលរ៉ែជំនួសសំណល់បន្តិចម្តងៗ ធ្វើឲ្យក្លាយជាថម (២) ការបង្កើតពុម្ពក្រៅ និងពុម្ពក្នុង ដែលសារពាង្គកាយរលួយបន្សល់ទុកពុម្ពទទេ ដែលក្រោយមកបំពេញដោយកំទេចកំណប់ និង (៣) ការរក្សាទុករាងកាយទាំងមូល ពេលសាកសពត្រូវបានកប់នៅក្នុងជ័រឈើ (អំពៅ) ឬជាប់នៅក្នុងទឹកកក។",
      formula: "Fossil formation: petrification, mold/cast, or whole-body preservation", formulaKm: "ការបង្កើតហ្វូស៊ីល៖ ដំណើរកាលយជាថម ពុម្ពក្រៅ/ក្នុង ឬរក្សារាងកាយទាំងមូល",
      chapter: "Fossils & Evidence of Evolution", chapterKm: "កំណត់ត្រាផូស៊ីល" },
    { topic: "Dating fossils", topicKm: "ការកំណត់អាយុហ្វូស៊ីល", difficulty: "Hard",
      prompt: "How can scientists estimate the age of a fossil using radioactive substances?", promptKm: "តើអ្នកវិទ្យាសាស្ត្រអាចប៉ាន់ស្មានអាយុហ្វូស៊ីលដោយប្រើសារធាតុវិទ្យុសកម្មយ៉ាងដូចម្តេច?",
      options: ["By measuring the remaining amount of a radioactive substance (like carbon-14), which decays at a fixed, known rate", "By counting the fossil's visible rings like a tree", "By weighing the fossil only", "By comparing its color to a chart"], answer: "By measuring the remaining amount of a radioactive substance (like carbon-14), which decays at a fixed, known rate",
      optionsKm: ["តាមរយៈការវាស់បរិមាណដែលនៅសល់នៃសារធាតុវិទ្យុសកម្ម (ដូចជាកាបូន១៤) ដែលបំបែកក្នុងអត្រាថេរដែលគេស្គាល់", "តាមរយៈការរាប់រង្វង់ដែលមើលឃើញរបស់ហ្វូស៊ីលដូចដើមឈើ", "តាមរយៈការថ្លឹងទម្ងន់ហ្វូស៊ីលតែប៉ុណ្ណោះ", "តាមរយៈការប្រៀបធៀបពណ៌របស់វាទៅតារាង"], answerKm: "តាមរយៈការវាស់បរិមាណដែលនៅសល់នៃសារធាតុវិទ្យុសកម្ម (ដូចជាកាបូន១៤) ដែលបំបែកក្នុងអត្រាថេរដែលគេស្គាល់",
      explanation: "Radioactive substances like carbon-14 decay into other substances (like nitrogen-14) at a constant, known rate, unaffected by outside conditions. By comparing the ratio of remaining radioactive substance to its decay product in a fossil, scientists can calculate its age — for example, if the ratio has fallen to half of what's found in the atmosphere, the fossil is about 5,730 years old.", explanationKm: "សារធាតុវិទ្យុសកម្មដូចជាកាបូន១៤ បំបែកទៅជាសារធាតុមួយទៀត (ដូចជាអាសូត១៤) ក្នុងអត្រាថេរដែលគេស្គាល់ ដោយមិនប៉ះពាល់ដោយលក្ខខណ្ឌខាងក្រៅ។ ដោយប្រៀបធៀបសមាមាត្រសារធាតុវិទ្យុសកម្មនៅសល់ធៀបនឹងផលិតផលបំបែកក្នុងហ្វូស៊ីល អ្នកវិទ្យាសាស្ត្រអាចគណនាអាយុរបស់វា ឧទាហរណ៍ បើសមាមាត្រធ្លាក់ចុះមកពាក់កណ្តាលនៃអ្វីដែលមាននៅក្នុងបរិយាកាស ហ្វូស៊ីលនោះមានអាយុប្រមាណ ៥៧៣០ឆ្នាំ។",
      formula: "Radioactive dating: measure decay ratio (e.g. C-14 half-life ≈ 5730 years)", formulaKm: "កំណត់អាយុវិទ្យុសកម្ម៖ វាស់សមាមាត្របំបែក (ឧ. កន្លះអាយុ C-14 ≈ ៥៧៣០ឆ្នាំ)",
      chapter: "Fossils & Evidence of Evolution", chapterKm: "កំណត់ត្រាផូស៊ីល" },
    { topic: "Order of fossils in rock layers", topicKm: "លំដាប់ហ្វូស៊ីលតាមស្រទាប់ថ្ម", difficulty: "Medium",
      prompt: "In an undisturbed sequence of sedimentary rock layers, which fossils are generally the oldest?", promptKm: "ក្នុងស្រទាប់ថ្មកំទេចកំណករៀបតាមលំដាប់ដែលមិនរញ្ជួយ តើហ្វូស៊ីលណាដែលចាស់ជាងគេជាទូទៅ?",
      options: ["Fossils found in the deepest (lowest) layers", "Fossils found in the topmost layer", "All fossils are always the same age regardless of layer", "Fossils are dated only by their color"], answer: "Fossils found in the deepest (lowest) layers",
      optionsKm: ["ហ្វូស៊ីលនៅស្រទាប់ជ្រៅបំផុត (ខាងក្រោមបំផុត)", "ហ្វូស៊ីលនៅស្រទាប់លើគេបំផុត", "ហ្វូស៊ីលទាំងអស់តែងតែមានអាយុដូចគ្នា មិនគិតពីស្រទាប់ទេ", "ហ្វូស៊ីលកំណត់អាយុដោយពណ៌របស់វាតែប៉ុណ្ណោះ"], answerKm: "ហ្វូស៊ីលនៅស្រទាប់ជ្រៅបំផុត (ខាងក្រោមបំផុត)",
      explanation: "Since sediment layers are deposited over time with newer layers forming on top of older ones, fossils found in the deepest (lowest) rock layers are generally the oldest, while those closer to the surface are younger.", explanationKm: "ដោយសារស្រទាប់កំទេចកំណកបានតម្កល់ជាបន្តបន្ទាប់តាមពេលវេលា ដោយស្រទាប់ថ្មីបង្កើតនៅលើស្រទាប់ចាស់ ហ្វូស៊ីលនៅស្រទាប់ថ្មជ្រៅបំផុត (ខាងក្រោមបំផុត) ជាទូទៅចាស់ជាងគេ ចំណែកឯហ្វូស៊ីលនៅជិតផ្ទៃថ្មវិញក្មេងជាង។",
      formula: "Rock layers: deepest layer = oldest fossil; topmost layer = youngest fossil", formulaKm: "ស្រទាប់ថ្ម៖ ស្រទាប់ជ្រៅបំផុត = ហ្វូស៊ីលចាស់បំផុត; ស្រទាប់លើ = ហ្វូស៊ីលក្មេងបំផុត",
      chapter: "Fossils & Evidence of Evolution", chapterKm: "កំណត់ត្រាផូស៊ីល" },
    { topic: "Importance of fossils", topicKm: "សារៈសំខាន់នៃហ្វូស៊ីល", difficulty: "Medium",
      prompt: "What is the main scientific importance of fossils?", promptKm: "តើសារៈសំខាន់ចម្បងខាងវិទ្យាសាស្ត្រនៃហ្វូស៊ីលជាអ្វី?",
      options: ["They help scientists understand the history of life's evolution and the Earth's climate in past ages", "They are only useful as decorations", "They prove that no species has ever gone extinct", "They are only used to date rocks, never organisms"], answer: "They help scientists understand the history of life's evolution and the Earth's climate in past ages",
      optionsKm: ["ជួយអ្នកវិទ្យាសាស្ត្រយល់ពីប្រវត្តិវិវត្តន៍ជីវិត និងអាកាសធាតុផែនដីនៅសម័យបុរាណ", "មានប្រយោជន៍តែសម្រាប់តុបតែងប៉ុណ្ណោះ", "បញ្ជាក់ថាគ្មានប្រភេទណាធ្លាប់អស់ពូជទេ", "ប្រើតែសម្រាប់កំណត់អាយុថ្ម មិនដែលកំណត់សារពាង្គកាយទេ"], answerKm: "ជួយអ្នកវិទ្យាសាស្ត្រយល់ពីប្រវត្តិវិវត្តន៍ជីវិត និងអាកាសធាតុផែនដីនៅសម័យបុរាណ",
      explanation: "Fossils let scientists trace the appearance, growth and extinction of species over geological time, and reveal what the Earth's climate conditions were like in each geological era — key evidence for the theory of evolution.", explanationKm: "ហ្វូស៊ីលអនុញ្ញាតឲ្យអ្នកវិទ្យាសាស្ត្រតាមដានការកកើត ការរីកចម្រើន និងការផុតពូជនៃប្រភេទឆ្លងកាត់សម័យកាលភូគព្ភសាស្ត្រ ព្រមទាំងបង្ហាញពីលក្ខខណ្ឌអាកាសធាតុនៃផែនដីនៅសម័យកាលនីមួយៗ ជាភស្តុតាងសំខាន់សម្រាប់ទ្រឹស្តីវិវត្តន៍។",
      formula: "Fossils reveal: evolution timeline + ancient climate conditions", formulaKm: "ហ្វូស៊ីលបង្ហាញ៖ លំដាប់ពេលវេលាវិវត្តន៍ + លក្ខខណ្ឌអាកាសធាតុបុរាណ",
      chapter: "Fossils & Evidence of Evolution", chapterKm: "កំណត់ត្រាផូស៊ីល" },
  ],
  English: [
    { topic: "Grammar", topicKm: "វេយ្យាករណ៍", difficulty: "Easy",
      prompt: "Choose the correct verb: 'She ___ to school every day.'", promptKm: "ជ្រើសរើសកិរិយាស័ព្ទត្រឹមត្រូវ៖ 'She ___ to school every day.'",
      options: ["goes", "go", "going", "gone"], answer: "goes",
      explanation: "Third-person singular in the present simple takes an -s ending: she goes.",
      explanationKm: "សព្វនាមឯកវចនៈបុរសទី៣ក្នុងបច្ចុប្បន្នកាលធម្មតា ត្រូវបន្ថែម -s៖ she goes។",
      formula: "Rule: he/she/it + verb + -s in present simple", formulaKm: "ក្បួន៖ he/she/it + កិរិយាស័ព្ទ + -s ក្នុងបច្ចុប្បន្នកាលធម្មតា" },
    { topic: "Vocabulary", topicKm: "វាក្យសព្ទ", difficulty: "Easy",
      prompt: "Which word is a synonym of 'rapid'?", promptKm: "តើពាក្យណាមួយមានន័យដូចនឹង 'rapid'?",
      options: ["quick", "slow", "large", "late"], answer: "quick",
      explanation: "'Rapid' means happening fast, so 'quick' is the closest synonym.", explanationKm: "'Rapid' មានន័យថាកើតឡើងលឿន ដូច្នេះ 'quick' ជាពាក្យប្រហាក់ប្រហែលបំផុត។",
      formula: "Tip: match the core meaning, not just the topic", formulaKm: "គន្លឹះ៖ ផ្គូផ្គងអត្ថន័យស្នូល មិនមែនគ្រាន់តែប្រធានបទ" },
    { topic: "Parts of speech", topicKm: "ភាគនៃការនិយាយ", difficulty: "Medium",
      prompt: "Identify the noun: 'Happiness is the key.'", promptKm: "កំណត់នាមក្នុងឃ្លា៖ 'Happiness is the key.'",
      options: ["Happiness", "is", "the", "key"], answer: "Happiness",
      explanation: "'Happiness' names a thing (an abstract idea), so it is the noun and subject.", explanationKm: "'Happiness' ជាឈ្មោះនៃគំនិតអរូបី ដូច្នេះវាជានាម និងជាប្រធានបទ។",
      formula: "Tip: a noun names a person, place, thing, or idea", formulaKm: "គន្លឹះ៖ នាមគឺជាឈ្មោះមនុស្ស ទីកន្លែង វត្ថុ ឬគំនិត" },
  ],
  French: [
    { topic: "Verbs", topicKm: "កិរិយាស័ព្ទ", difficulty: "Easy",
      prompt: "Complete: 'Je ___ étudiant.'", promptKm: "បំពេញ៖ 'Je ___ étudiant.'",
      options: ["suis", "es", "est", "être"], answer: "suis",
      explanation: "With 'je' the verb être is conjugated as 'suis': Je suis étudiant.", explanationKm: "ជាមួយ 'je' កិរិយាស័ព្ទ être ត្រូវបំបែកជា 'suis'៖ Je suis étudiant។",
      formula: "être: je suis, tu es, il/elle est", formulaKm: "être: je suis, tu es, il/elle est" },
    { topic: "Plurals", topicKm: "ពហុវចនៈ", difficulty: "Easy",
      prompt: "What is the plural of 'le livre'?", promptKm: "តើពហុវចនៈនៃ 'le livre' ជាអ្វី?",
      options: ["les livres", "la livres", "les livre", "le livres"], answer: "les livres",
      explanation: "The plural article is 'les' and the noun adds -s: les livres.", explanationKm: "អាទិសព្ទពហុវចនៈគឺ 'les' ហើយនាមបន្ថែម -s៖ les livres។",
      formula: "Rule: le/la → les, and add -s to the noun", formulaKm: "ក្បួន៖ le/la → les ហើយបន្ថែម -s ទៅនាម" },
  ],
  "Khmer Literature": [
    { topic: "Classics", topicKm: "អក្សរសាស្ត្របុរាណ", difficulty: "Easy",
      prompt: "The Reamker is the Khmer version of which epic?", promptKm: "រឿងរាមកេរ្តិ៍ជាការកែសម្រួលជាភាសាខ្មែរនៃវីរភាព (epic) មួយណា?",
      options: ["Ramayana", "Mahabharata", "Odyssey", "Iliad"], answer: "Ramayana",
      optionsKm: ["រាមាយណៈ", "មហាភារតៈ", "អូឌីសេ", "អ៊ីលីយ៉ាដ"], answerKm: "រាមាយណៈ",
      explanation: "The Reamker is Cambodia's adaptation of the Indian epic the Ramayana. It is taught as Lesson 2 in the official Grade 12 Khmer Literature textbook.",
      explanationKm: "រឿងរាមកេរ្តិ៍គឺជាការសម្របសម្រួលរបស់កម្ពុជា ចេញពីវីរភាពឥណ្ឌាឈ្មោះរាមាយណៈ។ វាត្រូវបានបង្រៀនជាមេរៀនទី២ ក្នុងសៀវភៅសិក្សាអក្សរសាស្ត្រខ្មែរ ថ្នាក់ទី១២ ជាផ្លូវការ។",
      formula: "Key concept: Reamker = Khmer Ramayana", formulaKm: "គោលគំនិតសំខាន់៖ រាមកេរ្តិ៍ = រាមាយណៈជាភាសាខ្មែរ" },
    { topic: "Classics", topicKm: "អក្សរសាស្ត្របុរាណ", difficulty: "Medium",
      prompt: "'Tum Teav' is best described as a classic Khmer ___.", promptKm: "'តុំទាវ' ពិពណ៌នាបានត្រឹមត្រូវបំផុតថាជា ___ ខ្មែរបុរាណមួយ។",
      options: ["tragic love story", "comedy", "religious chant", "history book"], answer: "tragic love story",
      optionsKm: ["និទានស្នេហ៍សោកនាដកម្ម", "រឿងកំប្លែង", "បទចម្រៀងសាសនា", "សៀវភៅប្រវត្តិសាស្ត្រ"], answerKm: "និទានស្នេហ៍សោកនាដកម្ម",
      explanation: "Tum Teav is a famous Cambodian tragic romance, often compared to Romeo and Juliet. It has been a compulsory part of the national curriculum since the 1950s and is taught as Lesson 1 in the Grade 12 textbook.",
      explanationKm: "តុំទាវជារឿងស្នេហាសោកនាដកម្មល្បីរបស់កម្ពុជា ដែលច្រើនប្រៀបធៀបទៅនឹងរឿង Romeo and Juliet។ វាបានក្លាយជាផ្នែកចាំបាច់នៃកម្មវិធីសិក្សាជាតិតាំងពីទសវត្សរ៍ ១៩៥០ ហើយត្រូវបានបង្រៀនជាមេរៀនទី១ ក្នុងសៀវភៅថ្នាក់ទី១២។",
      formula: "Tip: identify genre from theme and ending", formulaKm: "គន្លឹះ៖ កំណត់ប្រភេទរឿងតាមប្រធានបទ និងទីបញ្ចប់" },
    { topic: "Folk tales", topicKm: "និទានប្រជាប្រិយ", difficulty: "Medium",
      prompt: "'Vorvong and Sorvong' is a classic Khmer folk tale about two ___ who endure trials before regaining their status.",
      promptKm: "'រឿងវរវង្ស-សុរវង្ស' ជានិទានប្រជាប្រិយខ្មែរបុរាណ និយាយអំពី ___ ពីររូប ដែលឆ្លងកាត់ការលំបាកជាច្រើន មុននឹងទទួលបានឋានៈវិញ។",
      options: ["princes", "fishermen", "farmers", "monks"], answer: "princes",
      optionsKm: ["ព្រះរាជបុត្រ", "អ្នកនេសាទ", "កសិករ", "ព្រះសង្ឃ"], answerKm: "ព្រះរាជបុត្រ",
      explanation: "Vorvong and Sorvong is a classic tale in the Khmer sastra lbaeng (moral-teaching story) tradition, about two princes who fall into disgrace and, after a series of ordeals, regain their royal status.",
      explanationKm: "រឿងវរវង្ស-សុរវង្ស ជារឿងបុរាណក្នុងប្រពៃណីសាស្ត្រាល្បែងខ្មែរ (រឿងផ្តល់ក្តីប្រៀនប្រដៅសីលធម៌) និយាយអំពីព្រះរាជបុត្រពីររូបធ្លាក់ចូលក្នុងភាពអាម៉ាស់ ហើយបន្ទាប់ពីឆ្លងកាត់ការសាកល្បងជាច្រើន ក៏បានត្រឡប់ទៅរកឋានៈរាជវង្សវិញ។",
      formula: "Key concept: a moral tale of hardship, exile, and restored royal status", formulaKm: "គោលគំនិតសំខាន់៖ រឿងប្រៀនប្រដៅអំពីការលំបាក ការនិរទេស និងការត្រឡប់ទៅរកឋានៈវិញ" },
  ],
  History: [
    { topic: "Angkor era", topicKm: "សម័យអង្គរ", difficulty: "Medium",
      prompt: "Angkor Wat was built during the reign of which king?", promptKm: "ប្រាសាទអង្គរវត្តត្រូវបានសាងសង់ក្នុងរជ្ជកាលព្រះមហាក្សត្រណា?",
      options: ["Suryavarman II", "Jayavarman VII", "Norodom", "Ang Duong"], answer: "Suryavarman II",
      optionsKm: ["ព្រះបាទសូរ្យវរ្ម័នទី២", "ព្រះបាទជ័យវរ្ម័នទី៧", "ព្រះបាទនរោត្តម", "ព្រះបាទអង្គដួង"], answerKm: "ព្រះបាទសូរ្យវរ្ម័នទី២",
      explanation: "Angkor Wat was constructed in the early 12th century under King Suryavarman II.", explanationKm: "អង្គរវត្តត្រូវបានសាងសង់នៅដើមសតវត្សទី១២ ក្រោមរជ្ជកាលព្រះបាទសូរ្យវរ្ម័នទី២។",
      formula: "Key fact: Angkor Wat ≈ early 1100s, Suryavarman II", formulaKm: "ចំណុចសំខាន់៖ អង្គរវត្ត ≈ ដើមទសវត្សរ៍ ១១០០ សូរ្យវរ្ម័នទី២",
      chapter: "Angkor Era", chapterKm: "សម័យអង្គរ" },
    { topic: "Khmer Empire", topicKm: "អាណាចក្រខ្មែរ", difficulty: "Easy",
      prompt: "What was the capital of the Khmer Empire at its height?", promptKm: "តើរាជធានីរបស់អាណាចក្រខ្មែរនៅសម័យរុងរឿងបំផុតគឺទីណា?",
      options: ["Angkor", "Phnom Penh", "Oudong", "Longvek"], answer: "Angkor",
      optionsKm: ["អង្គរ", "ភ្នំពេញ", "ឧដុង្គ", "លង្វែក"], answerKm: "អង្គរ",
      explanation: "Angkor was the empire's capital during its golden age.", explanationKm: "អង្គរជារាជធានីនៃអាណាចក្រក្នុងសម័យមាសរបស់ខ្លួន។",
      formula: "Key fact: Angkor was the imperial capital", formulaKm: "ចំណុចសំខាន់៖ អង្គរជារាជធានីនៃអាណាចក្រ",
      chapter: "Angkor Era", chapterKm: "សម័យអង្គរ" },

    { topic: "Ang Duong's appeal to France", topicKm: "ការទូលសុំជំនួយបារាំងរបស់ព្រះបាទអង្គដួង", difficulty: "Medium",
      prompt: "Which Cambodian king first appealed to France for protection against threats from Siam and Vietnam, laying the groundwork for the 1863 protectorate?", promptKm: "តើព្រះមហាក្សត្រខ្មែរអង្គណាដំបូងបានទូលសុំជំនួយពីបារាំង ដើម្បីការពារកម្ពុជាពីការគំរាមកំហែងរបស់ស្យាមនិងវៀតណាម ដែលជាមូលដ្ឋាននាំទៅដល់អាណានិគមឆ្នាំ១៨៦៣?",
      options: ["Ang Duong", "Norodom", "Sisowath", "Norodom Sihanouk"], answer: "Ang Duong",
      optionsKm: ["ព្រះបាទអង្គដួង", "ព្រះបាទនរោត្តម", "ព្រះបាទស៊ីសុវត្ថិ", "សម្តេចនរោត្តម សីហនុ"], answerKm: "ព្រះបាទអង្គដួង",
      explanation: "King Ang Duong sought French protection to prevent Cambodia from being fully absorbed by Siam and Vietnam.", explanationKm: "ព្រះបាទអង្គដួងបានស្វែងរកការការពារពីបារាំង ដើម្បីទប់ស្កាត់ការលុបបំបាត់កម្ពុជាទាំងស្រុងដោយស្យាមនិងវៀតណាម។",
      formula: "Key fact: Ang Duong first sought French protection", formulaKm: "ចំណុចសំខាន់៖ ព្រះបាទអង្គដួងជាអ្នកស្វែងរកជំនួយបារាំងដំបូង",
      chapter: "French Protectorate (1863–1953)", chapterKm: "អាណាព្យាបាលបារាំង (១៨៦៣-១៩៥៣)" },
    { topic: "French Protectorate", topicKm: "អាណានិគមបារាំង", difficulty: "Easy",
      prompt: "In what year did France establish its protectorate over Cambodia?", promptKm: "តើបារាំងចាប់ផ្តើមដាក់អាណានិគមលើកម្ពុជានៅឆ្នាំណា?",
      options: ["1863", "1884", "1904", "1953"], answer: "1863",
      optionsKm: ["១៨៦៣", "១៨៨៤", "១៩០៤", "១៩៥៣"], answerKm: "១៨៦៣",
      explanation: "France signed the protectorate treaty with Cambodia on 11 August 1863.", explanationKm: "បារាំងបានចុះហត្ថលេខាលើសន្ធិសញ្ញាអាណានិគមជាមួយកម្ពុជានៅថ្ងៃទី១១ ខែសីហា ឆ្នាំ១៨៦៣។",
      formula: "Key fact: French protectorate began 11 August 1863", formulaKm: "ចំណុចសំខាន់៖ អាណានិគមបារាំងចាប់ផ្តើមថ្ងៃទី១១ សីហា ១៨៦៣",
      chapter: "French Protectorate (1863–1953)", chapterKm: "អាណាព្យាបាលបារាំង (១៨៦៣-១៩៥៣)" },
    { topic: "1884 rebellion", topicKm: "ការបះបោរឆ្នាំ១៨៨៤", difficulty: "Medium",
      prompt: "In what year did Cambodians rise up against a new French convention that stripped the king and local mandarins of power?", promptKm: "តើប្រជាជនខ្មែរបានបះបោរប្រឆាំងនឹងអនុសញ្ញាថ្មីរបស់បារាំង ដែលដកហូតអំណាចព្រះមហាក្សត្រនិងមន្ត្រីមូលដ្ឋាននៅឆ្នាំណា?",
      options: ["1884", "1863", "1904", "1953"], answer: "1884",
      optionsKm: ["១៨៨៤", "១៨៦៣", "១៩០៤", "១៩៥៣"], answerKm: "១៨៨៤",
      explanation: "The 1884 convention triggered a widespread rebellion because it took real power away from the king and local officials.", explanationKm: "អនុសញ្ញាឆ្នាំ១៨៨៤បានធ្វើឱ្យមានការបះបោរយ៉ាងទូលំទូលាយ ព្រោះវាដកហូតអំណាចជាក់ស្តែងពីព្រះមហាក្សត្រនិងមន្ត្រីមូលដ្ឋាន។",
      formula: "Key fact: 1884 convention sparked rebellion", formulaKm: "ចំណុចសំខាន់៖ អនុសញ្ញា១៨៨៤ នាំឱ្យមានការបះបោរ",
      chapter: "French Protectorate (1863–1953)", chapterKm: "អាណាព្យាបាលបារាំង (១៨៦៣-១៩៥៣)" },
    { topic: "Kings during the French period", topicKm: "ព្រះមហាក្សត្រសម័យអាណានិគមបារាំង", difficulty: "Medium",
      prompt: "Which king reigned immediately before Norodom Sihanouk, during the French protectorate (1927–1941)?", promptKm: "តើព្រះមហាក្សត្រអង្គណាបានគ្រងរាជ្យមុនសម្តេចនរោត្តម សីហនុ ក្នុងសម័យអាណានិគមបារាំង (១៩២៧-១៩៤១)?",
      options: ["Sisowath Monivong", "Norodom", "Sisowath", "Ang Duong"], answer: "Sisowath Monivong",
      optionsKm: ["ព្រះបាទស៊ីសុវត្ថិមុនីវង្ស", "ព្រះបាទនរោត្តម", "ព្រះបាទស៊ីសុវត្ថិ", "ព្រះបាទអង្គដួង"], answerKm: "ព្រះបាទស៊ីសុវត្ថិមុនីវង្ស",
      explanation: "Cambodia's kings under French rule reigned in sequence: Norodom (1860–1904), Sisowath (1904–1927), Sisowath Monivong (1927–1941), then Norodom Sihanouk (1941–1955).", explanationKm: "ព្រះមហាក្សត្រខ្មែរសម័យអាណានិគមបារាំងគ្រងរាជ្យតាមលំដាប់៖ ព្រះបាទនរោត្តម (១៨៦០-១៩០៤), ព្រះបាទស៊ីសុវត្ថិ (១៩០៤-១៩២៧), ព្រះបាទស៊ីសុវត្ថិមុនីវង្ស (១៩២៧-១៩៤១), បន្ទាប់មកសម្តេចនរោត្តម សីហនុ (១៩៤១-១៩៥៥)។",
      formula: "Key fact: Norodom → Sisowath → Sisowath Monivong → Sihanouk", formulaKm: "ចំណុចសំខាន់៖ នរោត្តម → ស៊ីសុវត្ថិ → ស៊ីសុវត្ថិមុនីវង្ស → សីហនុ",
      chapter: "French Protectorate (1863–1953)", chapterKm: "អាណាព្យាបាលបារាំង (១៨៦៣-១៩៥៣)" },
    { topic: "Return of Battambang and Siem Reap", topicKm: "ការទទួលយកសៀមរាប-បាត់ដំបងមកវិញ", difficulty: "Medium",
      prompt: "On 23 March 1907, France negotiated the return of which Cambodian provinces, which Siam had controlled since the 18th century?", promptKm: "នៅថ្ងៃទី២៣ ខែមីនា ឆ្នាំ១៩០៧ បារាំងបានចរចាទទួលយកខេត្តណាខ្លះរបស់កម្ពុជាមកវិញ ដែលស្យាមបានគ្រប់គ្រងតាំងពីសតវត្សទី១៨?",
      options: ["Battambang, Siem Reap and Sisophon", "Kampong Cham and Kratie", "Takeo and Kampot", "Ratanakiri and Mondulkiri"], answer: "Battambang, Siem Reap and Sisophon",
      optionsKm: ["បាត់ដំបង សៀមរាប និងស៊ីសុផុន", "កំពង់ចាម និងក្រចេះ", "តាកែវ និងកំពត", "រតនគិរី និងមណ្ឌលគិរី"], answerKm: "បាត់ដំបង សៀមរាប និងស៊ីសុផុន",
      explanation: "These provinces, home to the Angkor temples, were returned to Cambodia through French diplomatic negotiation with Siam.", explanationKm: "ខេត្តទាំងនេះ ដែលជាទីតាំងប្រាសាទអង្គរ ត្រូវបានប្រគល់មកកម្ពុជាវិញ តាមរយៈការចរចាការទូតរបស់បារាំងជាមួយស្យាម។",
      formula: "23 Mar 1907: Battambang, Siem Reap, Sisophon returned by Siam", formulaKm: "២៣ មីនា ១៩០៧៖ បាត់ដំបង សៀមរាប ស៊ីសុផុន ត្រូវបានប្រគល់មកវិញ",
      chapter: "French Protectorate (1863–1953)", chapterKm: "អាណាព្យាបាលបារាំង (១៨៦៣-១៩៥៣)" },
    { topic: "Territorial restoration 1904", topicKm: "ការប្រគល់ដីវិញ ១៩០៤", difficulty: "Medium",
      prompt: "On 13 February 1904, ahead of the larger 1907 restoration, Siam returned which two Cambodian provinces?", promptKm: "នៅថ្ងៃទី១៣ ខែកុម្ភៈ ឆ្នាំ១៩០៤ មុននឹងមានការប្រគល់ដីជាថ្មីទៀតឆ្នាំ១៩០៧ ស្យាមបានប្រគល់ខេត្តអ្វីខ្លះរបស់កម្ពុជាមកវិញ?",
      options: ["Mlu Prey and Stung Treng", "Battambang and Siem Reap", "Kampot and Takeo", "Koh Kong and Kampong Som"], answer: "Mlu Prey and Stung Treng",
      optionsKm: ["ម្លូប្រៃ និងស្ទឹងត្រែង", "បាត់ដំបង និងសៀមរាប", "កំពត និងតាកែវ", "កោះកុង និងកំពង់សោម"], answerKm: "ម្លូប្រៃ និងស្ទឹងត្រែង",
      explanation: "France negotiated the return of Mlu Prey and Stung Treng from Siam in February 1904; Battambang, Siem Reap and Sisophon followed in a separate 1907 treaty.", explanationKm: "បារាំងបានចរចាទទួលបានម្លូប្រៃ និងស្ទឹងត្រែងមកវិញពីស្យាមក្នុងខែកុម្ភៈ ១៩០៤ រីឯបាត់ដំបង សៀមរាប និងស៊ីសុផុន ត្រូវបានប្រគល់មកវិញដោយឡែកក្នុងសន្ធិសញ្ញាឆ្នាំ១៩០៧។",
      formula: "1904 = Mlu Prey + Stung Treng; 1907 = Battambang + Siem Reap + Sisophon", formulaKm: "១៩០៤ = ម្លូប្រៃ + ស្ទឹងត្រែង; ១៩០៧ = បាត់ដំបង + សៀមរាប + ស៊ីសុផុន",
      chapter: "French Protectorate (1863–1953)", chapterKm: "អាណាព្យាបាលបារាំង (១៨៦៣-១៩៥៣)" },
    { topic: "Loss of Koh Tral", topicKm: "ការបាត់បង់កោះត្រល់", difficulty: "Medium",
      prompt: "On 31 January 1939, France transferred which Cambodian island to Cochinchina's administration, a cession Cambodia still disputes today?", promptKm: "នៅថ្ងៃទី៣១ ខែមករា ឆ្នាំ១៩៣៩ បារាំងបានកាត់ផ្តាច់កោះណារបស់កម្ពុជាទៅចំណុះការគ្រប់គ្រងកូសាំងស៊ីន ដែលកម្ពុជានៅតែជជែកវែកញែកសព្វថ្ងៃ?",
      options: ["Koh Tral (Phu Quoc)", "Koh Kong", "Koh Rong", "Koh Sdach"], answer: "Koh Tral (Phu Quoc)",
      optionsKm: ["កោះត្រល់ (ភូកុក)", "កោះកុង", "កោះរ៉ុង", "កោះស្តេច"], answerKm: "កោះត្រល់ (ភូកុក)",
      explanation: "France redrew the administrative boundary in 1939, placing Koh Tral under Cochinchina; the island (known as Phu Quoc) remains under Vietnamese control today.", explanationKm: "បារាំងបានផ្លាស់ប្តូរព្រំដែនរដ្ឋបាលក្នុងឆ្នាំ១៩៣៩ ដាក់កោះត្រល់ចំណុះកូសាំងស៊ីន បច្ចុប្បន្នកោះនេះ (ភូកុក) នៅតែស្ថិតក្រោមការគ្រប់គ្រងវៀតណាម។",
      formula: "31 Jan 1939 → Koh Tral to Cochinchina", formulaKm: "៣១ មករា ១៩៣៩ → កោះត្រល់ទៅកូសាំងស៊ីន",
      chapter: "French Protectorate (1863–1953)", chapterKm: "អាណាព្យាបាលបារាំង (១៨៦៣-១៩៥៣)" },
    { topic: "Cause of the protectorate", topicKm: "មូលហេតុនៃអាណានិគម", difficulty: "Medium",
      prompt: "According to the standard BAC II answer, what was the primary reason Cambodia accepted French colonial protection in 1863?", promptKm: "តាមចម្លើយគំរូប្រឡងបាក់ឌុប តើមូលហេតុចម្បងអ្វីខ្លះដែលធ្វើឲ្យកម្ពុជាទទួលយកអាណានិគមនិយមបារាំងក្នុងឆ្នាំ១៨៦៣?",
      options: ["Siam and Vietnam's continued aggression and pressure on Cambodian territory and sovereignty", "Cambodia wanted to modernize its army with French weapons", "Cambodia sought a trade partnership with France", "The Cambodian king was educated in France"], answer: "Siam and Vietnam's continued aggression and pressure on Cambodian territory and sovereignty",
      optionsKm: ["ការគំរាមកំហែងជាប់លាប់របស់ស្យាម-យួនលើទឹកដី និងអធិបតេយ្យភាពកម្ពុជា", "កម្ពុជាចង់ធ្វើទំនើបកម្មកងទ័ពដោយអាវុធបារាំង", "កម្ពុជាចង់ធ្វើដៃគូពាណិជ្ជកម្មជាមួយបារាំង", "ព្រះមហាក្សត្រខ្មែរបានសិក្សានៅបារាំង"], answerKm: "ការគំរាមកំហែងជាប់លាប់របស់ស្យាម-យួនលើទឹកដី និងអធិបតេយ្យភាពកម្ពុជា",
      explanation: "Facing constant territorial encroachment and assimilation pressure from Siam and Vietnam, Cambodia sought a European power to protect its ethnic survival, leading King Ang Duong and later Norodom to turn to France.", explanationKm: "ដោយប្រឈមមុខនឹងការរំលោភទឹកដី និងសម្ពាធបំបែកជាតិពីស្យាម-យួនជាប់លាប់ កម្ពុជាបានស្វែងរកមហាអំណាចអឺរ៉ុបមួយដើម្បីការពារជនជាតិខ្លួន ដែលនាំឲ្យព្រះបាទអង្គដួង និងក្រោយមកព្រះបាទនរោត្តម បែរទៅរកបារាំង។",
      formula: "Siam+Vietnam threat → seek French protection", formulaKm: "ការគំរាមស្យាម+យួន → ស្វែងរកការការពារបារាំង",
      chapter: "French Protectorate (1863–1953)", chapterKm: "អាណាព្យាបាលបារាំង (១៨៦៣-១៩៥៣)" },
    { topic: "Positive legacy of French rule", topicKm: "ផលវិជ្ជមាននៃរបបអាណានិគម", difficulty: "Medium",
      prompt: "Which of the following is considered a positive outcome of French colonial rule, according to the standard BAC II model answer?", promptKm: "តើមួយណាខាងក្រោមត្រូវបានចាត់ទុកជាផលវិជ្ជមាននៃអាណានិគមនិយមបារាំង តាមចម្លើយគំរូប្រឡងបាក់ឌុប?",
      options: ["France helped protect the Khmer ethnic territory from being absorbed by neighboring countries", "France returned all Cambodian land lost since the Angkor era", "France ended all taxation in Cambodia", "France granted Cambodia full independence immediately in 1863"], answer: "France helped protect the Khmer ethnic territory from being absorbed by neighboring countries",
      optionsKm: ["បារាំងបានជួយការពារទឹកដីជនជាតិខ្មែរកុំឲ្យត្រូវលេបត្របញ្ចូលដោយប្រទេសជិតខាង", "បារាំងបានប្រគល់ទឹកដីខ្មែរដែលបាត់បង់តាំងពីសម័យអង្គរមកវិញទាំងអស់", "បារាំងបានលុបបំបាត់ការយកពន្ធទាំងអស់នៅកម្ពុជា", "បារាំងបានផ្តល់ឯករាជ្យពេញលេញដល់កម្ពុជាភ្លាមៗនៅឆ្នាំ១៨៦៣"], answerKm: "បារាំងបានជួយការពារទឹកដីជនជាតិខ្មែរកុំឲ្យត្រូវលេបត្របញ្ចូលដោយប្រទេសជិតខាង",
      explanation: "Model answers cite French protection of Khmer ethnic territory from Siamese-Vietnamese absorption as a key positive, alongside infrastructure, administrative and education reforms.", explanationKm: "ចម្លើយគំរូលើកឡើងពីការការពារទឹកដីជនជាតិខ្មែរពីការលេបត្របញ្ចូលរបស់ស្យាម-យួន ថាជាផលវិជ្ជមានសំខាន់មួយ រួមជាមួយកំណែទម្រង់ហេដ្ឋារចនាសម្ព័ន្ធ រដ្ឋបាល និងអប់រំ។",
      formula: "French rule +: protected Khmer land from absorption", formulaKm: "បារាំង +: ការពារដីខ្មែរពីការលេបត្របញ្ចូល",
      chapter: "French Protectorate (1863–1953)", chapterKm: "អាណាព្យាបាលបារាំង (១៨៦៣-១៩៥៣)" },
    { topic: "Negative impact of French rule", topicKm: "ផលអវិជ្ជមាននៃរបបអាណានិគម", difficulty: "Medium",
      prompt: "Which of the following is listed as a major negative impact of French colonial rule on ordinary Cambodians?", promptKm: "តើមួយណាខាងក្រោមត្រូវបានចាត់ទុកជាផលអវិជ្ជមានចម្បងនៃអាណានិគមនិយមបារាំងលើប្រជាជនខ្មែរសាមញ្ញ?",
      options: ["Heavy taxes and forced corvée labor that impoverished the population", "Mandatory French-language education for every citizen", "The banning of Buddhism throughout the country", "Abolition of the monarchy in 1863"], answer: "Heavy taxes and forced corvée labor that impoverished the population",
      optionsKm: ["ការយកពន្ធដារ និងបង្ខំពលកម្មជាទម្រង់យ៉ាងធ្ងន់ធ្ងរ ដែលធ្វើឲ្យប្រជាជនក្រីក្រ", "ការបង្ខំអប់រំភាសាបារាំងដល់ប្រជាពលរដ្ឋគ្រប់រូប", "ការហាមឃាត់ព្រះពុទ្ធសាសនាទូទាំងប្រទេស", "ការលុបបំបាត់របបរាជានិយមក្នុងឆ្នាំ១៨៦៣"], answerKm: "ការយកពន្ធដារ និងបង្ខំពលកម្មជាទម្រង់យ៉ាងធ្ងន់ធ្ងរ ដែលធ្វើឲ្យប្រជាជនក្រីក្រ",
      explanation: "The protectorate imposed heavy taxes and corvée labor obligations on Cambodians, a major grievance cited in BAC II model answers on French rule's negative side.", explanationKm: "របបអាណានិគមបានដាក់ពន្ធដារ និងកាតព្វកិច្ចពលកម្មយ៉ាងធ្ងន់ធ្ងរលើប្រជាជនខ្មែរ ដែលជាចំណុចអសុខចិត្តចម្បងមួយក្នុងចម្លើយគំរូស្តីពីផលអវិជ្ជមានរបបអាណានិគម។",
      formula: "French rule −: heavy taxes + corvée labor", formulaKm: "បារាំង −: ពន្ធដារ + ពលកម្មបង្ខំ",
      chapter: "French Protectorate (1863–1953)", chapterKm: "អាណាព្យាបាលបារាំង (១៨៦៣-១៩៥៣)" },
    { topic: "The 1908 Dangrek map", topicKm: "ផែនទីដងរែក ១៩០៨", difficulty: "Hard",
      prompt: "The 1908 French-drawn map of the Dangrek region later proved crucial to Cambodia in which international legal case?", promptKm: "ផែនទីតំបន់ដងរែកឆ្នាំ១៩០៨ ដែលគូសដោយបារាំង ក្រោយមកបានក្លាយជាភស្តុតាងសំខាន់សម្រាប់កម្ពុជាក្នុងសំណុំរឿងតុលាការអន្តរជាតិណា?", options: ["The Preah Vihear temple case at the International Court of Justice", "The Angkor Wat ownership dispute", "The Mekong River boundary case", "The Koh Tral territorial case"], answer: "The Preah Vihear temple case at the International Court of Justice",
      optionsKm: ["សំណុំរឿងប្រាសាទព្រះវិហារនៅតុលាការយុត្តិធម៌អន្តរជាតិ", "វិវាទកម្មសិទ្ធិប្រាសាទអង្គរវត្ត", "សំណុំរឿងព្រំដែនទន្លេមេគង្គ", "សំណុំរឿងទឹកដីកោះត្រល់"], answerKm: "សំណុំរឿងប្រាសាទព្រះវិហារនៅតុលាការយុត្តិធម៌អន្តរជាតិ",
      explanation: "Cambodia used the French-drawn 1908 map, known as the 'Dangrek' map, as key evidence to win the Preah Vihear temple case at the ICJ in 1962.", explanationKm: "កម្ពុជាបានប្រើផែនទីដងរែកដែលគូសដោយបារាំងក្នុងឆ្នាំ១៩០៨ ជាភស្តុតាងសំខាន់ដើម្បីឈ្នះក្តីប្រាសាទព្រះវិហារនៅតុលាការយុត្តិធម៌អន្តរជាតិឆ្នាំ១៩៦២។",
      formula: "1908 Dangrek map → won Preah Vihear case (1962)", formulaKm: "ផែនទីដងរែក ១៩០៨ → ឈ្នះក្តីព្រះវិហារ (១៩៦២)",
      chapter: "French Protectorate (1863–1953)", chapterKm: "អាណាព្យាបាលបារាំង (១៨៦៣-១៩៥៣)" },
    { topic: "Royal Crusade for Independence", topicKm: "ការទមទរឯករាជ្យ", difficulty: "Medium",
      prompt: "Which Cambodian king personally toured France, the US, Canada, Japan and Thailand in 1953 to campaign for independence?", promptKm: "តើព្រះមហាក្សត្រខ្មែរអង្គណាបានយាងទៅបារាំង សហរដ្ឋអាមេរិក កាណាដា ជប៉ុន និងថៃដោយផ្ទាល់ក្នុងឆ្នាំ១៩៥៣ ដើម្បីទមទរឯករាជ្យ?",
      options: ["Norodom Sihanouk", "Norodom", "Sisowath Monivong", "Ang Duong"], answer: "Norodom Sihanouk",
      optionsKm: ["សម្តេចនរោត្តម សីហនុ", "ព្រះបាទនរោត្តម", "ព្រះបាទស៊ីសុវត្ថិមុនីវង្ស", "ព្រះបាទអង្គដួង"], answerKm: "សម្តេចនរោត្តម សីហនុ",
      explanation: "This diplomatic tour is known as the \"Royal Crusade for Independence.\"", explanationKm: "ដំណើរទស្សនកិច្ចនេះត្រូវបានស្គាល់ថាជា \"យុទ្ធនាការទមទរឯករាជ្យ\" របស់សម្តេចនរោត្តម សីហនុ។",
      formula: "Key fact: Royal Crusade for Independence, 1953", formulaKm: "ចំណុចសំខាន់៖ យុទ្ធនាការទមទរឯករាជ្យ ឆ្នាំ១៩៥៣",
      chapter: "French Protectorate (1863–1953)", chapterKm: "អាណាព្យាបាលបារាំង (១៨៦៣-១៩៥៣)" },
    { topic: "Independence from France", topicKm: "ឯករាជ្យពីបារាំង", difficulty: "Easy",
      prompt: "Cambodia gained full independence from France in which year?", promptKm: "តើកម្ពុជាទទួលបានឯករាជ្យពេញលេញពីបារាំងនៅឆ្នាំណា?",
      options: ["1953", "1945", "1954", "1970"], answer: "1953",
      optionsKm: ["១៩៥៣", "១៩៤៥", "១៩៥៤", "១៩៧០"], answerKm: "១៩៥៣",
      explanation: "Cambodia received full independence from France on 9 November 1953, under King Norodom Sihanouk's leadership.", explanationKm: "កម្ពុជាបានទទួលឯករាជ្យពេញលេញពីបារាំងនៅថ្ងៃទី៩ ខែវិច្ឆិកា ឆ្នាំ១៩៥៣ ក្រោមការដឹកនាំរបស់សម្តេចនរោត្តម សីហនុ។",
      formula: "Key fact: Independence Day = 9 November 1953", formulaKm: "ចំណុចសំខាន់៖ ទិវាឯករាជ្យ = ៩ វិច្ឆិកា ១៩៥៣",
      chapter: "French Protectorate (1863–1953)", chapterKm: "អាណាព្យាបាលបារាំង (១៨៦៣-១៩៥៣)" },
    { topic: "Geneva Conference", topicKm: "សន្និសីទក្រុងហ្សឺណែវ", difficulty: "Medium",
      prompt: "The Geneva Conference that recognized Cambodia's independence, sovereignty and territorial integrity was held in which year?", promptKm: "តើសន្និសីទក្រុងហ្សឺណែវ ដែលទទួលស្គាល់ឯករាជ្យ អធិបតេយ្យភាព និងបូរណភាពទឹកដីកម្ពុជា ធ្វើឡើងនៅឆ្នាំណា?",
      options: ["1954", "1953", "1955", "1970"], answer: "1954",
      optionsKm: ["១៩៥៤", "១៩៥៣", "១៩៥៥", "១៩៧០"], answerKm: "១៩៥៤",
      explanation: "The 1954 Geneva Conference required all foreign troops to withdraw from Cambodia and confirmed its sovereignty.", explanationKm: "សន្និសីទក្រុងហ្សឺណែវឆ្នាំ១៩៥៤ តម្រូវឱ្យកងទ័ពបរទេសទាំងអស់ដកចេញពីកម្ពុជា និងបញ្ជាក់ពីអធិបតេយ្យភាពរបស់កម្ពុជា។",
      formula: "Key fact: Geneva Conference, 1954", formulaKm: "ចំណុចសំខាន់៖ សន្និសីទក្រុងហ្សឺណែវ ឆ្នាំ១៩៥៤",
      chapter: "French Protectorate (1863–1953)", chapterKm: "អាណាព្យាបាលបារាំង (១៨៦៣-១៩៥៣)" },
    { topic: "Length of French rule", topicKm: "រយៈពេលអាណានិគមបារាំង", difficulty: "Easy",
      prompt: "The French protectorate over Cambodia (1863–1953) lasted for how many years?", promptKm: "តើអាណានិគមបារាំងលើកម្ពុជា (១៨៦៣-១៩៥៣) មានរយៈពេលប៉ុន្មានឆ្នាំ?",
      options: ["90 years", "70 years", "50 years", "100 years"], answer: "90 years",
      optionsKm: ["៩០ឆ្នាំ", "៧០ឆ្នាំ", "៥០ឆ្នាំ", "១០០ឆ្នាំ"], answerKm: "៩០ឆ្នាំ",
      explanation: "From 1863 to 1953 is exactly 90 years of French protectorate rule.", explanationKm: "ចាប់ពីឆ្នាំ១៨៦៣ដល់១៩៥៣ គឺជារយៈពេល៩០ឆ្នាំគត់នៃអាណានិគមបារាំង។",
      formula: "Key fact: French protectorate = 90 years", formulaKm: "ចំណុចសំខាន់៖ អាណានិគមបារាំង = ៩០ឆ្នាំ",
      chapter: "French Protectorate (1863–1953)", chapterKm: "អាណាព្យាបាលបារាំង (១៨៦៣-១៩៥៣)" },
    { topic: "Preservation of Angkor", topicKm: "ការអភិរក្សប្រាសាទអង្គរ", difficulty: "Easy",
      prompt: "France founded a research institute that studied and helped restore the Angkor temples during the protectorate era. What kind of institution was it?", promptKm: "បារាំងបានបង្កើតស្ថាប័នស្រាវជ្រាវមួយ ដែលបានសិក្សានិងជួយជួសជុលប្រាសាទអង្គរឡើងវិញក្នុងសម័យអាណានិគម។ តើវាជាស្ថាប័នប្រភេទណា?",
      options: ["A French research school for Angkorian archaeology and history", "A military academy", "A Buddhist monastic university", "A royal trade office"], answer: "A French research school for Angkorian archaeology and history",
      optionsKm: ["សាលាស្រាវជ្រាវបារាំងសម្រាប់បុរាណវិទ្យា និងប្រវត្តិសាស្ត្រអង្គរ", "សាលាយោធា", "សាកលវិទ្យាល័យព្រះពុទ្ធសាសនា", "ការិយាល័យពាណិជ្ជកម្មរាជវាំង"], answerKm: "សាលាស្រាវជ្រាវបារាំងសម្រាប់បុរាណវិទ្យា និងប្រវត្តិសាស្ត្រអង្គរ",
      explanation: "France built a research school that studied and catalogued ancient Khmer civilization and restored crumbling Angkorian temples — a lasting benefit for later generations.", explanationKm: "បារាំងបានបង្កើតសាលាមួយសម្រាប់ស្រាវជ្រាវ ចងក្រងអរិយធម៌ប្រវត្តិសាស្ត្រខ្មែរ និងជួសជុលប្រាសាទបុរាណដែលបាក់បែក ដែលនាំផលប្រយោជន៍ដល់កូនខ្មែរជំនាន់ក្រោយ។",
      formula: "Key fact: French research school restored the Angkor temples", formulaKm: "ចំណុចសំខាន់៖ សាលាស្រាវជ្រាវបារាំង ជួសជុលប្រាសាទអង្គរ",
      chapter: "French Protectorate (1863–1953)", chapterKm: "អាណាព្យាបាលបារាំង (១៨៦៣-១៩៥៣)" },
    { topic: "1949 territorial cession", topicKm: "ការកាត់ទឹកដីឆ្នាំ១៩៤៩", difficulty: "Hard",
      prompt: "In 1949, France transferred a portion of ethnic-Khmer territory in the Mekong Delta (Kampuchea Krom) to the administration of which country?", promptKm: "ក្នុងឆ្នាំ១៩៤៩ បារាំងបានកាត់ទឹកដីកម្ពុជាក្រោម ដែលមានជនជាតិខ្មែរច្រើន ឲ្យទៅស្ថិតក្រោមការគ្រប់គ្រងប្រទេសណា?",
      options: ["Vietnam", "Laos", "Thailand", "China"], answer: "Vietnam",
      optionsKm: ["វៀតណាម", "ឡាវ", "ថៃ", "ចិន"], answerKm: "វៀតណាម",
      explanation: "France transferred Kampuchea Krom (Cochinchina) to Vietnamese administration on 4 June 1949, a decision still remembered by many ethnic Khmer today.", explanationKm: "បារាំងបានកាត់ទឹកដីកម្ពុជាក្រោម (កូសាំងស៊ីន) ឲ្យទៅស្ថិតក្រោមរដ្ឋបាលវៀតណាមនៅថ្ងៃទី៤ ខែមិថុនា ឆ្នាំ១៩៤៩ ជាការសម្រេចចិត្តដែលជនជាតិខ្មែរជាច្រើននៅចងចាំរហូតមកដល់សព្វថ្ងៃ។",
      formula: "Key fact: Kampuchea Krom ceded to Vietnam, 1949", formulaKm: "ចំណុចសំខាន់៖ កម្ពុជាក្រោម កាត់ទៅវៀតណាម ១៩៤៩",
      chapter: "French Protectorate (1863–1953)", chapterKm: "អាណាព្យាបាលបារាំង (១៨៦៣-១៩៥៣)" },

    { topic: "Sangkum Reastr Niyum", topicKm: "សង្គមរាស្ត្រនិយម", difficulty: "Easy",
      prompt: "In what year did Norodom Sihanouk abdicate the throne to found and lead the Sangkum Reastr Niyum movement?", promptKm: "តើសម្តេចនរោត្តម សីហនុ បានលះបង់រាជសម្បត្តិដើម្បីបង្កើត និងដឹកនាំចលនាសង្គមរាស្ត្រនិយមនៅឆ្នាំណា?",
      options: ["1955", "1953", "1960", "1970"], answer: "1955",
      optionsKm: ["១៩៥៥", "១៩៥៣", "១៩៦០", "១៩៧០"], answerKm: "១៩៥៥",
      explanation: "The Sangkum Reastr Niyum was founded on 22 March 1955 and governed Cambodia until 1970.", explanationKm: "សង្គមរាស្ត្រនិយមត្រូវបានបង្កើតឡើងនៅថ្ងៃទី២២ ខែមីនា ឆ្នាំ១៩៥៥ និងបានដឹកនាំកម្ពុជារហូតដល់ឆ្នាំ១៩៧០។",
      formula: "Key fact: Sangkum Reastr Niyum founded 22 March 1955", formulaKm: "ចំណុចសំខាន់៖ សង្គមរាស្ត្រនិយម បង្កើតថ្ងៃទី២២ មីនា ១៩៥៥",
      chapter: "Sangkum Reastr Niyum (1955–1970)", chapterKm: "សង្គមរាស្ត្រនិយម (១៩៥៥-១៩៧០)" },
    { topic: "Why Sihanouk founded the Sangkum", topicKm: "ហេតុអ្វីបង្កើតសង្គមរាស្ត្រនិយម", difficulty: "Medium",
      prompt: "Why did Norodom Sihanouk abdicate the throne in 1955 to found and personally lead the Sangkum Reastr Niyum?", promptKm: "ហេតុអ្វីបានជាសម្តេចនរោត្តម សីហនុ លះបង់រាជសម្បត្តិក្នុងឆ្នាំ១៩៥៥ ដើម្បីបង្កើតនិងដឹកនាំសង្គមរាស្ត្រនិយមដោយផ្ទាល់?",
      options: ["He believed the existing political parties were too divided to build the nation", "The French forced him to abdicate", "He wanted to become a Buddhist monk", "The United Nations required it"], answer: "He believed the existing political parties were too divided to build the nation",
      optionsKm: ["ទ្រង់យល់ថាគណបក្សនយោបាយពេលនោះបែកបាក់គ្នាពេក មិនអាចកសាងជាតិបាន", "បារាំងបង្ខំឲ្យទ្រង់លះបង់រាជសម្បត្តិ", "ទ្រង់ចង់ចូលបួសជាព្រះសង្ឃ", "អង្គការសហប្រជាជាតិតម្រូវឲ្យធ្វើដូច្នេះ"], answerKm: "ទ្រង់យល់ថាគណបក្សនយោបាយពេលនោះបែកបាក់គ្នាពេក មិនអាចកសាងជាតិបាន",
      explanation: "Sihanouk felt Cambodia could not build itself right after independence while political parties argued for power, so he abdicated to unite them under one movement.", explanationKm: "សម្តេចសីហនុមានព្រះរាជតម្រិះថា កម្ពុជាមិនអាចកសាងជាតិទើបនឹងទទួលឯករាជ្យបានឡើយ ប្រសិនបើគណបក្សនយោបាយបែងចែកគ្នាដណ្តើមអំណាច ទើបទ្រង់លះបង់រាជសម្បត្តិដើម្បីបង្រួបបង្រួមគណបក្សទាំងអស់ជាមួយចលនាមួយ។",
      formula: "Key fact: Sangkum founded to unite divided political parties", formulaKm: "ចំណុចសំខាន់៖ សង្គមរាស្ត្រនិយម បង្កើតដើម្បីបង្រួបបង្រួមគណបក្ស",
      chapter: "Sangkum Reastr Niyum (1955–1970)", chapterKm: "សង្គមរាស្ត្រនិយម (១៩៥៥-១៩៧០)" },
    { topic: "Sangkum's first election result", topicKm: "លទ្ធផលបោះឆ្នោតដំបូងសង្គមរាស្ត្រនិយម", difficulty: "Medium",
      prompt: "In the Sangkum Reastr Niyum's first election (September 1955), what share of the vote did it win?", promptKm: "តើគណបក្សសង្គមរាស្ត្រនិយមទទួលបានសម្លេងឆ្នោតប៉ុន្មានភាគរយ ក្នុងការបោះឆ្នោតដំបូងរបស់ខ្លួន (ខែកញ្ញា ១៩៥៥)?",
      options: ["83%", "51%", "65%", "99%"], answer: "83%",
      optionsKm: ["៨៣ភាគរយ", "៥១ភាគរយ", "៦៥ភាគរយ", "៩៩ភាគរយ"], answerKm: "៨៣ភាគរយ",
      explanation: "The Sangkum Reastr Niyum won about 83% of the vote in its first election, letting it form a one-party government.", explanationKm: "សង្គមរាស្ត្រនិយមទទួលបានប្រមាណ៨៣ភាគរយនៃសម្លេងឆ្នោតក្នុងការបោះឆ្នោតដំបូង ដែលអនុញ្ញាតឱ្យបង្កើតរដ្ឋាភិបាលឯកបក្ស។",
      formula: "Key fact: Sangkum won ~83% in its first election", formulaKm: "ចំណុចសំខាន់៖ សង្គមរាស្ត្រនិយមឈ្នះ ៨៣% ក្នុងការបោះឆ្នោតដំបូង",
      chapter: "Sangkum Reastr Niyum (1955–1970)", chapterKm: "សង្គមរាស្ត្រនិយម (១៩៥៥-១៩៧០)" },
    { topic: "National Congress (Samaj Cheat)", topicKm: "សមាជជាតិ", difficulty: "Medium",
      prompt: "Under the Sangkum regime, what was the name of the forum where citizens of every class met directly with the government to discuss national affairs?", promptKm: "ក្នុងសម័យសង្គមរាស្ត្រនិយម តើវេទិកាដែលប្រជាពលរដ្ឋគ្រប់វណ្ណៈជួបជាមួយរាជរដ្ឋាភិបាលដោយផ្ទាល់ដើម្បីពិភាក្សាកិច្ចការជាតិ មានឈ្មោះថាអ្វី?",
      options: ["National Congress (Samaj Cheat)", "The Organization (Angkar)", "Supreme National Council", "People's Assembly"], answer: "National Congress (Samaj Cheat)",
      optionsKm: ["សមាជជាតិ", "អង្គការ", "ក្រុមប្រឹក្សាជាតិជាន់ខ្ពស់", "រដ្ឋសភាប្រជាជន"], answerKm: "សមាជជាតិ",
      explanation: "The National Congress (Samaj Cheat), founded in 1955, was a direct-democracy forum letting citizens question the government face to face.", explanationKm: "សមាជជាតិ ដែលបង្កើតឡើងក្នុងឆ្នាំ១៩៥៥ ជាវេទិកាប្រជាធិបតេយ្យផ្ទាល់ ដែលអនុញ្ញាតឱ្យប្រជាពលរដ្ឋសួរសំណួររាជរដ្ឋាភិបាលដោយផ្ទាល់មុខ។",
      formula: "Key fact: Samaj Cheat = Sangkum's national congress", formulaKm: "ចំណុចសំខាន់៖ សមាជជាតិ = វេទិកាជាតិសម័យសង្គមរាស្ត្រនិយម",
      chapter: "Sangkum Reastr Niyum (1955–1970)", chapterKm: "សង្គមរាស្ត្រនិយម (១៩៥៥-១៩៧០)" },
    { topic: "Bandung Conference", topicKm: "សន្និសីទបានដុង", difficulty: "Medium",
      prompt: "At which international conference in April 1955 did Sihanouk formally announce Cambodia's neutral, non-aligned foreign policy to the world?", promptKm: "តើសន្និសីទអន្តរជាតិណា ក្នុងខែមេសា ១៩៥៥ ដែលសម្តេចសីហនុប្រកាសជាផ្លូវការពីគោលនយោបាយអព្យាក្រិតរបស់កម្ពុជាដល់ពិភពលោក?",
      options: ["Bandung Conference (Indonesia)", "Geneva Conference", "Paris Peace Conference", "United Nations General Assembly"], answer: "Bandung Conference (Indonesia)",
      optionsKm: ["សន្និសីទបានដុង (ឥណ្ឌូនេស៊ី)", "សន្និសីទក្រុងហ្សឺណែវ", "សន្និសីទសន្តិភាពក្រុងប៉ារីស", "សន្និបាតអង្គការសហប្រជាជាតិ"], answerKm: "សន្និសីទបានដុង (ឥណ្ឌូនេស៊ី)",
      explanation: "At the Asian-African Conference in Bandung (18-24 April 1955), Sihanouk declared Cambodia's neutrality and met leaders like Zhou Enlai and Pham Van Dong.", explanationKm: "នៅសន្និសីទប្រជាជាតិអាស៊ី-អាហ្វ្រិកនៅបានដុង (១៨-២៤ មេសា ១៩៥៥) សម្តេចសីហនុបានប្រកាសពីអព្យាក្រិតភាពរបស់កម្ពុជា និងបានជួបមេដឹកនាំដូចជាចូអានឡាយ និងផាមវ៉ានដុង។",
      formula: "Key fact: Bandung Conference, April 1955 → neutrality declared", formulaKm: "ចំណុចសំខាន់៖ សន្និសីទបានដុង មេសា ១៩៥៥ → ប្រកាសអព្យាក្រិត",
      chapter: "Sangkum Reastr Niyum (1955–1970)", chapterKm: "សង្គមរាស្ត្រនិយម (១៩៥៥-១៩៧០)" },
    { topic: "Cambodia joins the United Nations", topicKm: "កម្ពុជាចូលជាសមាជិកអង្គការសហប្រជាជាតិ", difficulty: "Easy",
      prompt: "Cambodia became a member of the United Nations on what date?", promptKm: "តើកម្ពុជាបានចូលជាសមាជិកអង្គការសហប្រជាជាតិនៅថ្ងៃណា?",
      options: ["14 December 1955", "9 November 1953", "22 March 1955", "18 April 1955"], answer: "14 December 1955",
      optionsKm: ["១៤ ធ្នូ ១៩៥៥", "៩ វិច្ឆិកា ១៩៥៣", "២២ មីនា ១៩៥៥", "១៨ មេសា ១៩៥៥"], answerKm: "១៤ ធ្នូ ១៩៥៥",
      explanation: "Cambodia joined the UN on 14 December 1955, using the occasion to announce its path of neutrality.", explanationKm: "កម្ពុជាបានចូលជាសមាជិកអង្គការសហប្រជាជាតិនៅថ្ងៃទី១៤ ខែធ្នូ ឆ្នាំ១៩៥៥ ដោយប្រើឱកាសនេះប្រកាសពីមាគ៌ានយោបាយអព្យាក្រិតរបស់ខ្លួន។",
      formula: "Key fact: Cambodia joined UN, 14 Dec 1955", formulaKm: "ចំណុចសំខាន់៖ កម្ពុជាចូល UN ១៤ ធ្នូ ១៩៥៥",
      chapter: "Sangkum Reastr Niyum (1955–1970)", chapterKm: "សង្គមរាស្ត្រនិយម (១៩៥៥-១៩៧០)" },
    { topic: "Joint declaration with India", topicKm: "សេចក្តីប្រកាសរួមជាមួយឥណ្ឌា", difficulty: "Hard",
      prompt: "In March 1955, Sihanouk signed a joint declaration on peaceful coexistence with which foreign leader, during a visit to India?", promptKm: "ក្នុងខែមីនា ១៩៥៥ សម្តេចសីហនុបានចុះហត្ថលេខាលើសេចក្តីប្រកាសរួមស្តីពីការរួមរស់ដោយសន្តិភាព ជាមួយមេដឹកនាំបរទេសណា ក្នុងដំណើរទស្សនកិច្ចទៅឥណ្ឌា?",
      options: ["Jawaharlal Nehru (India)", "Zhou Enlai (China)", "Ho Chi Minh (Vietnam)", "U Nu (Burma)"], answer: "Jawaharlal Nehru (India)",
      optionsKm: ["ចាវហ្ស៊ឺឡាល់ នេរូ (ឥណ្ឌា)", "ចូអានឡាយ (ចិន)", "ហូជីមិញ (វៀតណាម)", "អ៊ូនុ (ភូមា)"], answerKm: "ចាវហ្ស៊ឺឡាល់ នេរូ (ឥណ្ឌា)",
      explanation: "On 18 March 1955, Sihanouk and Indian Prime Minister Nehru signed a joint declaration committing both countries to peaceful coexistence.", explanationKm: "នៅថ្ងៃទី១៨ ខែមីនា ១៩៥៥ សម្តេចសីហនុ និងនាយករដ្ឋមន្ត្រីឥណ្ឌា នេរូ បានចុះហត្ថលេខាលើសេចក្តីប្រកាសរួមមួយ ដើម្បីរួមរស់ដោយសន្តិភាពរវាងប្រទេសទាំងពីរ។",
      formula: "Key fact: Sihanouk-Nehru declaration, March 1955", formulaKm: "ចំណុចសំខាន់៖ សេចក្តីប្រកាសសីហនុ-នេរូ មីនា ១៩៥៥",
      chapter: "Sangkum Reastr Niyum (1955–1970)", chapterKm: "សង្គមរាស្ត្រនិយម (១៩៥៥-១៩៧០)" },
    { topic: "Sangkum-era foreign policy", topicKm: "គោលនយោបាយអព្យាក្រិត", difficulty: "Medium",
      prompt: "What foreign policy did Cambodia adopt throughout the Sangkum Reastr Niyum period (1955-1970)?", promptKm: "តើកម្ពុជាបានប្រកាន់យកគោលនយោបាយអ្វី ក្នុងអំឡុងសម័យសង្គមរាស្ត្រនិយម (១៩៥៥-១៩៧០)?",
      options: ["Neutrality / non-alignment", "Full alliance with the US", "Full alliance with the USSR", "Isolationism"], answer: "Neutrality / non-alignment",
      optionsKm: ["អព្យាក្រិតភាព / មិនចូលបក្សសម្ព័ន្ធ", "សម្ព័ន្ធភាពពេញលេញជាមួយសហរដ្ឋអាមេរិក", "សម្ព័ន្ធភាពពេញលេញជាមួយសហភាពសូវៀត", "ភាពនៅកម្រិតខ្លួនឯង"], answerKm: "អព្យាក្រិតភាព / មិនចូលបក្សសម្ព័ន្ធ",
      explanation: "Cambodia's neutrality policy let it stay at peace for 15 years while neighboring Vietnam was engulfed in war.", explanationKm: "គោលនយោបាយអព្យាក្រិតបានអនុញ្ញាតឱ្យកម្ពុជារស់នៅដោយសន្តិភាពអស់រយៈពេល១៥ឆ្នាំ ខណៈដែលប្រទេសជិតខាងគឺវៀតណាមកំពុងជួបសង្គ្រាម។",
      formula: "Key fact: Neutrality policy, Sangkum era 1955-1970", formulaKm: "ចំណុចសំខាន់៖ គោលនយោបាយអព្យាក្រិត សម័យសង្គមរាស្ត្រនិយម ១៩៥៥-១៩៧០",
      chapter: "Sangkum Reastr Niyum (1955–1970)", chapterKm: "សង្គមរាស្ត្រនិយម (១៩៥៥-១៩៧០)" },
    { topic: "Sihanoukville port", topicKm: "កំពង់ផែព្រះសីហនុ", difficulty: "Easy",
      prompt: "During the Sangkum era, Cambodia built its own deep-water seaport to reduce dependence on Vietnamese ports. What is it called?", promptKm: "ក្នុងសម័យសង្គមរាស្ត្រនិយម កម្ពុជាបានសាងសង់កំពង់ផែសមុទ្រជម្រៅផ្ទាល់ខ្លួន ដើម្បីកាត់បន្ថយការពឹងផ្អែកលើកំពង់ផែវៀតណាម។ តើវាមានឈ្មោះថាអ្វី?",
      options: ["Sihanoukville (Kampong Som)", "Koh Kong", "Kep", "Kampot"], answer: "Sihanoukville (Kampong Som)",
      optionsKm: ["ក្រុងព្រះសីហនុ (កំពង់សោម)", "កោះកុង", "កែប", "កំពត"], answerKm: "ក្រុងព្រះសីហនុ (កំពង់សោម)",
      explanation: "Sihanoukville, Cambodia's first deep-water port, was built during the Sangkum era to give the country independent access to the sea.", explanationKm: "ក្រុងព្រះសីហនុ ជាកំពង់ផែសមុទ្រជម្រៅដំបូងរបស់កម្ពុជា ត្រូវបានសាងសង់ក្នុងសម័យសង្គមរាស្ត្រនិយម ដើម្បីឲ្យប្រទេសមានផ្លូវចេញចូលសមុទ្រដោយឯករាជ្យ។",
      formula: "Key fact: Sihanoukville port built during Sangkum era", formulaKm: "ចំណុចសំខាន់៖ កំពង់ផែព្រះសីហនុ សាងសង់សម័យសង្គមរាស្ត្រនិយម",
      chapter: "Sangkum Reastr Niyum (1955–1970)", chapterKm: "សង្គមរាស្ត្រនិយម (១៩៥៥-១៩៧០)" },
    { topic: "Basis of the neutrality policy", topicKm: "មូលដ្ឋានគោលនយោបាយអព្យាក្រិត", difficulty: "Hard",
      prompt: "Cambodia's neutrality (non-alignment) policy during the Sangkum era was formally grounded in the resolutions of which 1954 international conference?", promptKm: "គោលនយោបាយអព្យាក្រិតរបស់កម្ពុជាក្នុងសម័យសង្គមរាស្ត្រនិយម ត្រូវបានផ្អែកតាមសេចក្តីសម្រេចរបស់សន្និសីទអន្តរជាតិណា ឆ្នាំ១៩៥៤?", options: ["The Geneva Conference on Indochina", "The Bandung Conference", "The Paris Peace Conference", "The San Francisco Conference"], answer: "The Geneva Conference on Indochina",
      optionsKm: ["សន្និសីទក្រុងហ្សឺណែវស្តីពីឥណ្ឌូចិន", "សន្និសីទបាដុង", "សន្និសីទសន្តិភាពប៉ារីស", "សន្និសីទសាន់ហ្វ្រាន់ស៊ីស្កូ"], answerKm: "សន្និសីទក្រុងហ្សឺណែវស្តីពីឥណ្ឌូចិន",
      explanation: "The 1954 Geneva Conference, proposed partly by China and the Soviet Union, recognized Cambodia's independence and became the foundation Sihanouk cited for pursuing a neutral foreign policy.", explanationKm: "សន្និសីទក្រុងហ្សឺណែវ ឆ្នាំ១៩៥៤ ដែលស្នើឡើងដោយចិននិងសូវៀតមួយផ្នែក បានទទួលស្គាល់ឯករាជ្យកម្ពុជា និងក្លាយជាមូលដ្ឋានដែលសម្តេចសីហនុលើកឡើងសម្រាប់ការប្រកាន់យកគោលនយោបាយអព្យាក្រិត។",
      formula: "1954 Geneva Conference → basis for neutrality policy", formulaKm: "សន្និសីទហ្សឺណែវ ១៩៥៤ → មូលដ្ឋានគោលនយោបាយអព្យាក្រិត",
      chapter: "Sangkum Reastr Niyum (1955–1970)", chapterKm: "សង្គមរាស្ត្រនិយម (១៩៥៥-១៩៧០)" },
    { topic: "1961 non-alignment charter", topicKm: "ធម្មនុញ្ញមិនចូលបក្សសម្ព័ន្ធ ១៩៦១", difficulty: "Hard",
      prompt: "In September 1961, Sihanouk signed the charter of the non-aligned movement in which city, reinforcing Cambodia's neutral stance during the Cold War?", promptKm: "ក្នុងខែកញ្ញា ១៩៦១ សម្តេចសីហនុបានចុះហត្ថលេខាលើធម្មនុញ្ញចលនាមិនចូលបក្សសម្ព័ន្ធនៅទីក្រុងណា ជាការពង្រឹងជំហរអព្យាក្រិតរបស់កម្ពុជាកំឡុងសង្គ្រាមត្រជាក់?", options: ["Belgrade", "Bandung", "Geneva", "New Delhi"], answer: "Belgrade",
      optionsKm: ["បែលក្រាដ", "បាដុង", "ហ្សឺណែវ", "ញូវដេលី"], answerKm: "បែលក្រាដ",
      explanation: "Sihanouk signed the non-aligned movement's founding charter in Belgrade, Yugoslavia, in September 1961, cementing Cambodia's refusal to join either Cold War bloc.", explanationKm: "សម្តេចសីហនុបានចុះហត្ថលេខាលើធម្មនុញ្ញចលនាមិនចូលបក្សសម្ព័ន្ធនៅទីក្រុងបែលក្រាដ ប្រទេសយូហ្គោស្លាវី ក្នុងខែកញ្ញា ១៩៦១ ដោយបញ្ជាក់ពីការបដិសេធចូលចំណែកជាមួយប្លុកណាមួយក្នុងសង្គ្រាមត្រជាក់។",
      formula: "Sept 1961 → Belgrade non-aligned charter", formulaKm: "កញ្ញា ១៩៦១ → ធម្មនុញ្ញបែលក្រាដ",
      chapter: "Sangkum Reastr Niyum (1955–1970)", chapterKm: "សង្គមរាស្ត្រនិយម (១៩៥៥-១៩៧០)" },
    { topic: "Women's suffrage", topicKm: "សិទ្ធិបោះឆ្នោតស្រ្តី", difficulty: "Medium",
      prompt: "Cambodian women were granted the right to vote and stand for election on what date during the Sangkum era?", promptKm: "ស្រ្តីខ្មែរទទួលបានសិទ្ធិបោះឆ្នោត និងឈរឈ្មោះបោះឆ្នោតនៅថ្ងៃណា ក្នុងសម័យសង្គមរាស្ត្រនិយម?", options: ["6 May 1958", "9 November 1953", "23 March 1955", "1 September 1961"], answer: "6 May 1958",
      optionsKm: ["៦ ឧសភា ១៩៥៨", "៩ វិច្ឆិកា ១៩៥៣", "២៣ មីនា ១៩៥៥", "១ កញ្ញា ១៩៦១"], answerKm: "៦ ឧសភា ១៩៥៨",
      explanation: "On 6 May 1958, the Sangkum government granted Cambodian women the right to vote and to run for elected office, part of its social reform program.", explanationKm: "នៅថ្ងៃទី៦ ឧសភា ១៩៥៨ រាជរដ្ឋាភិបាលសង្គមរាស្ត្រនិយមបានផ្តល់សិទ្ធិដល់ស្រ្តីខ្មែរក្នុងការបោះឆ្នោត និងឈរឈ្មោះបោះឆ្នោត ជាផ្នែកមួយនៃកម្មវិធីកំណែទម្រង់សង្គម។",
      formula: "6 May 1958 → women's suffrage", formulaKm: "៦ ឧសភា ១៩៥៨ → សិទ្ធិបោះឆ្នោតស្រ្តី",
      chapter: "Sangkum Reastr Niyum (1955–1970)", chapterKm: "សង្គមរាស្ត្រនិយម (១៩៥៥-១៩៧០)" },

    { topic: "1970 coup", topicKm: "រដ្ឋប្រហារឆ្នាំ១៩៧០", difficulty: "Easy",
      prompt: "The coup that overthrew Norodom Sihanouk and created the Khmer Republic took place on what date?", promptKm: "តើរដ្ឋប្រហារដែលទម្លាក់សម្តេចនរោត្តម សីហនុ និងបង្កើតសាធារណរដ្ឋខ្មែរ កើតឡើងនៅថ្ងៃណា?",
      options: ["18 March 1970", "17 April 1975", "7 January 1979", "23 October 1991"], answer: "18 March 1970",
      optionsKm: ["១៨ មីនា ១៩៧០", "១៧ មេសា ១៩៧៥", "៧ មករា ១៩៧៩", "២៣ តុលា ១៩៩១"], answerKm: "១៨ មីនា ១៩៧០",
      explanation: "The 18 March 1970 coup ended the Sangkum era and led to five years of civil war.", explanationKm: "រដ្ឋប្រហារថ្ងៃទី១៨ ខែមីនា ឆ្នាំ១៩៧០ បានបញ្ចប់សម័យសង្គមរាស្ត្រនិយម ហើយនាំឱ្យមានសង្គ្រាមស៊ីវិលអស់រយៈពេល៥ឆ្នាំ។",
      formula: "Key fact: 1970 coup = 18 March 1970", formulaKm: "ចំណុចសំខាន់៖ រដ្ឋប្រហារឆ្នាំ១៩៧០ = ១៨ មីនា ១៩៧០",
      chapter: "Khmer Republic (1970–1975)", chapterKm: "សាធារណរដ្ឋខ្មែរ (១៩៧០-១៩៧៥)" },
    { topic: "Cause of the 1970 coup", topicKm: "មូលហេតុរដ្ឋប្រហារ១៩៧០", difficulty: "Medium",
      prompt: "Which of these was a major grievance that led conservative officials to depose Sihanouk in March 1970?", promptKm: "តើមួយណាខាងក្រោមជាមូលហេតុសំខាន់ដែលនាំឱ្យមន្ត្រីនិយមធនទម្លាក់សម្តេចសីហនុ ក្នុងខែមីនា ១៩៧០?",
      options: ["Vietnamese communist forces were using Cambodian territory as a base and supply route", "Sihanouk had declared war on Thailand", "Sihanouk had abolished the monarchy himself", "Cambodia had lost a war against Laos"], answer: "Vietnamese communist forces were using Cambodian territory as a base and supply route",
      optionsKm: ["កងកម្លាំងកុម្មុយនីស្តវៀតណាមប្រើទឹកដីកម្ពុជាជាមូលដ្ឋាននិងផ្លូវសម្ភារៈ", "សម្តេចសីហនុបានប្រកាសសង្គ្រាមនឹងថៃ", "សម្តេចសីហនុបានលុបបំបាត់ព្រះរាជានិយមដោយខ្លួនឯង", "កម្ពុជាចាញ់សង្គ្រាមនឹងឡាវ"], answerKm: "កងកម្លាំងកុម្មុយនីស្តវៀតណាមប្រើទឹកដីកម្ពុជាជាមូលដ្ឋាននិងផ្លូវសម្ភារៈ",
      explanation: "Conservative officials were angered that Vietnamese communist forces (Viet Cong and North Vietnamese troops) used Cambodian border areas as bases and supply routes, which they felt Sihanouk had tolerated for too long.", explanationKm: "មន្ត្រីនិយមធនមានការខឹងសម្បារ ដែលកងកម្លាំងកុម្មុយនីស្តវៀតណាម (វៀតកុងនិងទាហានវៀតណាមខាងជើង) ប្រើតំបន់ព្រំដែនកម្ពុជាជាមូលដ្ឋាននិងផ្លូវសម្ភារៈ ដែលពួកគេយល់ថាសម្តេចសីហនុបានអត់ធ្មត់យូរពេក។",
      formula: "Key fact: Vietnamese use of Cambodian territory fueled the 1970 coup", formulaKm: "ចំណុចសំខាន់៖ ការប្រើទឹកដីកម្ពុជារបស់វៀតណាម ជំរុញរដ្ឋប្រហារ១៩៧០",
      chapter: "Khmer Republic (1970–1975)", chapterKm: "សាធារណរដ្ឋខ្មែរ (១៩៧០-១៩៧៥)" },
    { topic: "Founding of the Khmer Republic", topicKm: "ការប្រកាសបង្កើតសាធារណរដ្ឋខ្មែរ", difficulty: "Easy",
      prompt: "The Khmer Republic was officially proclaimed on what date (distinct from the 18 March coup itself)?", promptKm: "តើសាធារណរដ្ឋខ្មែរត្រូវបានប្រកាសបង្កើតជាផ្លូវការនៅថ្ងៃណា (ខុសពីថ្ងៃរដ្ឋប្រហារ១៨ មីនា)?",
      options: ["9 October 1970", "18 March 1970", "17 April 1975", "7 January 1979"], answer: "9 October 1970",
      optionsKm: ["៩ តុលា ១៩៧០", "១៨ មីនា ១៩៧០", "១៧ មេសា ១៩៧៥", "៧ មករា ១៩៧៩"], answerKm: "៩ តុលា ១៩៧០",
      explanation: "The coup happened on 18 March 1970, but the Khmer Republic itself was formally proclaimed on 9 October 1970.", explanationKm: "រដ្ឋប្រហារកើតឡើងនៅថ្ងៃទី១៨ ខែមីនា ១៩៧០ ប៉ុន្តែសាធារណរដ្ឋខ្មែរខ្លួនឯងត្រូវបានប្រកាសបង្កើតជាផ្លូវការនៅថ្ងៃទី៩ ខែតុលា ១៩៧០។",
      formula: "Key fact: Khmer Republic proclaimed 9 October 1970", formulaKm: "ចំណុចសំខាន់៖ សាធារណរដ្ឋខ្មែរប្រកាសបង្កើត ៩ តុលា ១៩៧០",
      chapter: "Khmer Republic (1970–1975)", chapterKm: "សាធារណរដ្ឋខ្មែរ (១៩៧០-១៩៧៥)" },
    { topic: "Khmer Republic", topicKm: "សាធារណរដ្ឋខ្មែរ", difficulty: "Easy",
      prompt: "Who became president of the Khmer Republic (1970-1975)?", promptKm: "តើនរណាបានក្លាយជាប្រធានាធិបតីសាធារណរដ្ឋខ្មែរ (១៩៧០-១៩៧៥)?",
      options: ["Lon Nol", "Sisowath Sirik Matak", "Heng Samrin", "Hun Sen"], answer: "Lon Nol",
      optionsKm: ["លន់ នល់", "ស៊ីសុវត្ថិ ស៊ីរិកម៉ាតាក់", "ហេង សំរិន", "ហ៊ុន សែន"], answerKm: "លន់ នល់",
      explanation: "Lon Nol led the coup government and served as president of the Khmer Republic.", explanationKm: "លន់ នល់ បានដឹកនាំរដ្ឋាភិបាលរដ្ឋប្រហារ និងបានធ្វើជាប្រធានាធិបតីសាធារណរដ្ឋខ្មែរ។",
      formula: "Key fact: Khmer Republic president = Lon Nol", formulaKm: "ចំណុចសំខាន់៖ ប្រធានាធិបតីសាធារណរដ្ឋខ្មែរ = លន់ នល់",
      chapter: "Khmer Republic (1970–1975)", chapterKm: "សាធារណរដ្ឋខ្មែរ (១៩៧០-១៩៧៥)" },
    { topic: "Civil war death toll", topicKm: "ចំនួនអ្នកស្លាប់ក្នុងសង្គ្រាមស៊ីវិល", difficulty: "Medium",
      prompt: "The Cambodian civil war (1970–1975) is estimated to have killed how many people?", promptKm: "តើសង្គ្រាមស៊ីវិលកម្ពុជា (១៩៧០-១៩៧៥) ប៉ាន់ស្មានថាបានសម្លាប់ប្រជាជនប៉ុន្មាននាក់?",
      options: ["Over 1 million", "About 50,000", "About 200,000", "Over 3 million"], answer: "Over 1 million",
      optionsKm: ["ជាងមួយលាននាក់", "ប្រមាណ ៥០.០០០នាក់", "ប្រមាណ ២០០.០០០នាក់", "ជាងបីលាននាក់"], answerKm: "ជាងមួយលាននាក់",
      explanation: "The five-year civil war killed over a million people and left many more wounded, displaced, or orphaned.", explanationKm: "សង្គ្រាមស៊ីវិលរយៈពេល៥ឆ្នាំបានសម្លាប់ប្រជាជនជាងមួយលាននាក់ និងបន្សល់ទុកអ្នករបួស ជនភៀសខ្លួន និងក្មេងកំព្រាជាច្រើនទៀត។",
      formula: "Key fact: 1970-75 civil war deaths > 1 million", formulaKm: "ចំណុចសំខាន់៖ អ្នកស្លាប់សង្គ្រាម១៩៧០-៧៥ > ១លាននាក់",
      chapter: "Khmer Republic (1970–1975)", chapterKm: "សាធារណរដ្ឋខ្មែរ (១៩៧០-១៩៧៥)" },
    { topic: "War damage to industry", topicKm: "ការខូចខាតឧស្សាហកម្មដោយសង្គ្រាម", difficulty: "Medium",
      prompt: "By the end of the civil war (1975), roughly what percentage of Cambodia's factories had been destroyed or damaged?", promptKm: "នៅចុងសង្គ្រាមស៊ីវិល (១៩៧៥) តើប្រមាណប៉ុន្មានភាគរយនៃរោងចក្រកម្ពុជាត្រូវបានបំផ្លិចបំផ្លាញ ឬខូចខាត?",
      options: ["75%", "25%", "50%", "10%"], answer: "75%",
      optionsKm: ["៧៥ភាគរយ", "២៥ភាគរយ", "៥០ភាគរយ", "១០ភាគរយ"], answerKm: "៧៥ភាគរយ",
      explanation: "About 75% of Cambodia's factories were destroyed or damaged by the war, crippling the country's industrial base.", explanationKm: "ប្រមាណ៧៥ភាគរយនៃរោងចក្រកម្ពុជាត្រូវបានបំផ្លិចបំផ្លាញ ឬខូចខាតដោយសារសង្គ្រាម ធ្វើឱ្យមូលដ្ឋានឧស្សាហកម្មប្រទេសខ្សោយថយ។",
      formula: "Key fact: ~75% of factories destroyed by 1975", formulaKm: "ចំណុចសំខាន់៖ រោងចក្រ ~៧៥% ត្រូវខូចខាតដល់ឆ្នាំ១៩៧៥",
      chapter: "Khmer Republic (1970–1975)", chapterKm: "សាធារណរដ្ឋខ្មែរ (១៩៧០-១៩៧៥)" },
    { topic: "Refugees in Phnom Penh", topicKm: "ជនភៀសខ្លួននៅភ្នំពេញ", difficulty: "Medium",
      prompt: "About how many war refugees fled from the countryside into Phnom Penh during the civil war?", promptKm: "តើប្រមាណប៉ុន្មាននាក់ជាជនភៀសខ្លួនពីជនបទ បានភៀសមកកាន់ទីក្រុងភ្នំពេញក្នុងកំឡុងសង្គ្រាមស៊ីវិល?",
      options: ["About 2 million", "About 100,000", "About 500,000", "About 5 million"], answer: "About 2 million",
      optionsKm: ["ប្រមាណ ២លាននាក់", "ប្រមាណ ១០០.០០០នាក់", "ប្រមាណ ៥០០.០០០នាក់", "ប្រមាណ ៥លាននាក់"], answerKm: "ប្រមាណ ២លាននាក់",
      explanation: "Roughly 2 million people fled fighting in the countryside for the relative safety of Phnom Penh, where many lived without enough food, jobs, or shelter.", explanationKm: "ប្រមាណ២លាននាក់បានភៀសខ្លួនចេញពីការប្រយុទ្ធក្នុងជនបទ មករកសុវត្ថិភាពនៅភ្នំពេញ ជាកន្លែងដែលពួកគេជាច្រើនរស់នៅដោយខ្វះការងារ ចំណីអាហារ និងជម្រក។",
      formula: "Key fact: ~2 million refugees fled to Phnom Penh", formulaKm: "ចំណុចសំខាន់៖ ជនភៀសខ្លួន ~២លាននាក់ ភៀសមកភ្នំពេញ",
      chapter: "Khmer Republic (1970–1975)", chapterKm: "សាធារណរដ្ឋខ្មែរ (១៩៧០-១៩៧៥)" },
    { topic: "US bombing campaign", topicKm: "យុទ្ធនាការទម្លាក់គ្រាប់បែកអាមេរិក", difficulty: "Hard",
      prompt: "Between 1969 and 1973, about how many tons of bombs did the US B-52 campaign drop on Cambodia?", promptKm: "ចន្លោះឆ្នាំ១៩៦៩ ដល់១៩៧៣ តើអាមេរិកបានទម្លាក់គ្រាប់បែកចំនួនប៉ុន្មានតោនលើកម្ពុជាតាមរយៈយន្តហោះ B ៥២?",
      options: ["About 2 million tons", "About 200,000 tons", "About 20,000 tons", "About 20 million tons"], answer: "About 2 million tons",
      optionsKm: ["ប្រមាណ ២លានតោន", "ប្រមាណ ២០០.០០០តោន", "ប្រមាណ ២០.០០០តោន", "ប្រមាណ ២០លានតោន"], answerKm: "ប្រមាណ ២លានតោន",
      explanation: "The US B-52 bombing campaign dropped roughly 2 million tons of bombs on the Cambodian countryside, turning many rice fields into bomb-cratered land.", explanationKm: "យុទ្ធនាការទម្លាក់គ្រាប់បែកអាមេរិកដោយយន្តហោះ B ៥២ បានទម្លាក់គ្រាប់បែកប្រមាណ២លានតោនលើជនបទកម្ពុជា ធ្វើឱ្យស្រែស្រូវជាច្រើនក្លាយជាដីរណ្តៅគ្រាប់បែក។",
      formula: "Key fact: US B-52 campaign dropped ~2 million tons of bombs, 1969-73", formulaKm: "ចំណុចសំខាន់៖ គ្រាប់បែក B ៥២ ~២លានតោន ១៩៦៩-៧៣",
      chapter: "Khmer Republic (1970–1975)", chapterKm: "សាធារណរដ្ឋខ្មែរ (១៩៧០-១៩៧៥)" },
    { topic: "Lon Nol's exile", topicKm: "ការភៀសខ្លួនរបស់លន់ នល់", difficulty: "Medium",
      prompt: "Lon Nol fled Cambodia by plane just before the Khmer Rouge takeover, on what date?", promptKm: "តើលន់ នល់ បានភៀសខ្លួនចេញពីកម្ពុជាតាមយន្តហោះ មុនពេលខ្មែរក្រហមចូលកាន់កាប់ នៅថ្ងៃណា?",
      options: ["1 April 1975", "17 April 1975", "18 March 1970", "9 October 1970"], answer: "1 April 1975",
      optionsKm: ["១ មេសា ១៩៧៥", "១៧ មេសា ១៩៧៥", "១៨ មីនា ១៩៧០", "៩ តុលា ១៩៧០"], answerKm: "១ មេសា ១៩៧៥",
      explanation: "Lon Nol left Cambodia on 1 April 1975 and went to live in the United States, just over two weeks before the Khmer Rouge captured Phnom Penh.", explanationKm: "លន់ នល់បានចាកចេញពីកម្ពុជានៅថ្ងៃទី១ ខែមេសា ឆ្នាំ១៩៧៥ ហើយទៅរស់នៅសហរដ្ឋអាមេរិក ជាងពីរសប្តាហ៍មុនពេលខ្មែរក្រហមចូលកាន់កាប់ភ្នំពេញ។",
      formula: "Key fact: Lon Nol fled 1 April 1975", formulaKm: "ចំណុចសំខាន់៖ លន់ នល់ ភៀសខ្លួន ១ មេសា ១៩៧៥",
      chapter: "Khmer Republic (1970–1975)", chapterKm: "សាធារណរដ្ឋខ្មែរ (១៩៧០-១៩៧៥)" },
    { topic: "Causes of the 1970 coup", topicKm: "មូលហេតុរដ្ឋប្រហារ ១៩៧០", difficulty: "Hard",
      prompt: "Besides accusations that Sihanouk's neutrality policy had lost direction, which foreign involvement is cited as a cause of the 18 March 1970 coup?", promptKm: "ក្រៅពីការចោទប្រកាន់ថាគោលនយោបាយអព្យាក្រិតរបស់សីហនុលែងមានទិសដៅ តើអន្តរាគមន៍បរទេសណាមួយត្រូវបានលើកឡើងជាមូលហេតុនៃរដ្ឋប្រហារ ១៨ មីនា ១៩៧០?", options: ["Interference by Vietnam and the United States in Cambodian politics", "A trade dispute with Thailand", "A border war with Laos", "French demands to restore colonial rule"], answer: "Interference by Vietnam and the United States in Cambodian politics",
      optionsKm: ["ការជ្រៀតជ្រែករបស់វៀតណាម និងសហរដ្ឋអាមេរិកក្នុងនយោបាយខ្មែរ", "វិវាទពាណិជ្ជកម្មជាមួយថៃ", "សង្គ្រាមព្រំដែនជាមួយឡាវ", "ការទាមទាររបស់បារាំងឲ្យស្តារអាណានិគមឡើងវិញ"], answerKm: "ការជ្រៀតជ្រែករបស់វៀតណាម និងសហរដ្ឋអាមេរិកក្នុងនយោបាយខ្មែរ",
      explanation: "BAC II model answers list Vietnamese and American interference in Cambodian internal politics, alongside elite discontent with Sihanouk, as key causes of the March 1970 coup.", explanationKm: "ចម្លើយគំរូបាក់ឌុបលើកឡើងពីការជ្រៀតជ្រែករបស់វៀតណាម និងសហរដ្ឋអាមេរិកក្នុងនយោបាយផ្ទៃក្នុងខ្មែរ រួមជាមួយភាពមិនពេញចិត្តរបស់ថ្នាក់ដឹកនាំចំពោះសីហនុ ថាជាមូលហេតុចម្បងនៃរដ្ឋប្រហារ មីនា ១៩៧០។",
      formula: "1970 coup causes: elite split + Vietnam/US interference", formulaKm: "មូលហេតុរដ្ឋប្រហារ ១៩៧០៖ បាក់បែកអ្នកដឹកនាំ + ជ្រៀតជ្រែកវៀតណាម/អាមេរិក",
      chapter: "Khmer Republic (1970–1975)", chapterKm: "សាធារណរដ្ឋខ្មែរ (១៩៧០-១៩៧៥)" },
    { topic: "Why the Khmer Republic collapsed", topicKm: "មូលហេតុដួលរលំសាធារណរដ្ឋខ្មែរ", difficulty: "Hard",
      prompt: "According to the BAC II model answer, what was a key reason ordinary people in Phnom Penh grew exhausted with the Khmer Republic government?", promptKm: "តាមចម្លើយគំរូបាក់ឌុប តើហេតុអ្វីខ្លះដែលធ្វើឲ្យប្រជាជននៅភ្នំពេញនឿយណាយនឹងរដ្ឋាភិបាលសាធារណរដ្ឋខ្មែរ?", options: ["Corruption, inflation, food and job shortages amid worsening war conditions", "The government banned all religious practice", "The government moved the capital away from Phnom Penh", "Taxes were completely abolished, bankrupting the state"], answer: "Corruption, inflation, food and job shortages amid worsening war conditions",
      optionsKm: ["អំពើពុករលួយ អតិផរណា កង្វះអាហារ និងការងារ ក្នុងស្ថានភាពសង្គ្រាមកាន់តែធ្ងន់ធ្ងរ", "រដ្ឋាភិបាលហាមឃាត់ការអនុវត្តសាសនាទាំងអស់", "រដ្ឋាភិបាលបានផ្លាស់ប្តូររាជធានីចេញពីភ្នំពេញ", "ពន្ធត្រូវបានលុបបំបាត់ទាំងស្រុង ធ្វើឲ្យរដ្ឋក្ស័យធន"], answerKm: "អំពើពុករលួយ អតិផរណា កង្វះអាហារ និងការងារ ក្នុងស្ថានភាពសង្គ្រាមកាន់តែធ្ងន់ធ្ងរ",
      explanation: "Living on a shrinking patch of land under siege, Phnom Penh residents faced food and shelter shortages, unemployment, inflation, corruption and injustice — fueling widespread discontent with the Khmer Republic.", explanationKm: "ការរស់នៅលើទីក្រុងតូចចង្អៀតក្រោមការឡោមព័ទ្ធ ប្រជាជនភ្នំពេញជួបប្រទះកង្វះអាហារ ជម្រក ការគ្មានការងារធ្វើ អតិផរណា អំពើពុករលួយ និងអយុត្តិធម៌ ដែលជាមូលហេតុនៃភាពមិនពេញចិត្តទូលំទូលាយចំពោះសាធារណរដ្ឋខ្មែរ។",
      formula: "KR collapse: corruption + inflation + shortages + war fatigue", formulaKm: "ការដួលរលំសាធារណរដ្ឋខ្មែរ៖ ពុករលួយ + អតិផរណា + កង្វះខាត + នឿយណាយសង្គ្រាម",
      chapter: "Khmer Republic (1970–1975)", chapterKm: "សាធារណរដ្ឋខ្មែរ (១៩៧០-១៩៧៥)" },
    { topic: "Siege of Phnom Penh", topicKm: "ការឡោមព័ទ្ធភ្នំពេញ", difficulty: "Medium",
      prompt: "In the final phase of the civil war, how did the Khmer Rouge cripple the Khmer Republic government in Phnom Penh?", promptKm: "ក្នុងដំណាក់កាលចុងក្រោយនៃសង្គ្រាមស៊ីវិល តើខ្មែរក្រហមបានធ្វើអ្វី ដើម្បីធ្វើឲ្យរដ្ឋាភិបាលសាធារណរដ្ឋខ្មែរនៅភ្នំពេញអន់ថយ?", options: ["They besieged the city and blocked food and supply routes by both land and river", "They negotiated a ceasefire and shared power", "They cut off electricity only, leaving food supplies untouched", "They opened the borders to allow more refugees in freely"], answer: "They besieged the city and blocked food and supply routes by both land and river",
      optionsKm: ["ពួកគេឡោមព័ទ្ធទីក្រុង និងបិទផ្លូវដឹកជញ្ជូនចំណីអាហារទាំងផ្លូវគោក និងផ្លូវទឹក", "ពួកគេចរចាឈប់បាញ់ប្រហារ និងចែករំលែកអំណាច", "ពួកគេកាត់ថាមពលអគ្គិសនីតែម្យ៉ាង ទុកចំណីអាហារដដដល", "ពួកគេបើកព្រំដែនឲ្យជនភៀសខ្លួនចូលដោយសេរី"], answerKm: "ពួកគេឡោមព័ទ្ធទីក្រុង និងបិទផ្លូវដឹកជញ្ជូនចំណីអាហារទាំងផ្លូវគោក និងផ្លូវទឹក",
      explanation: "The Khmer Rouge surrounded Phnom Penh and tightened control over food-supply routes, worsening shortages and hastening the Republic's collapse in April 1975.", explanationKm: "ខ្មែរក្រហមបានឡោមព័ទ្ធទីក្រុងភ្នំពេញ និងរឹតបន្តឹងការដឹកជញ្ជូនចំណីអាហារចូល ធ្វើឲ្យកង្វះខាតកាន់តែធ្ងន់ធ្ងរ និងបង្កើនល្បឿនការដួលរលំរបស់សាធារណរដ្ឋខ្មែរនៅខែមេសា ១៩៧៥។",
      formula: "KR siege → cut supply routes → Republic collapse (April 1975)", formulaKm: "ខ្មែរក្រហមឡោមព័ទ្ធ → កាត់ផ្លូវដឹកជញ្ជូន → ដួលរលំ (មេសា ១៩៧៥)",
      chapter: "Khmer Republic (1970–1975)", chapterKm: "សាធារណរដ្ឋខ្មែរ (១៩៧០-១៩៧៥)" },

    { topic: "Fall of Phnom Penh", topicKm: "ការដួលរលំទីក្រុងភ្នំពេញ", difficulty: "Easy",
      prompt: "The Khmer Rouge captured Phnom Penh, ending the Khmer Republic, on what date?", promptKm: "តើខ្មែរក្រហមបានចូលកាន់កាប់ទីក្រុងភ្នំពេញ បញ្ចប់សាធារណរដ្ឋខ្មែរ នៅថ្ងៃណា?",
      options: ["17 April 1975", "18 March 1970", "7 January 1979", "9 November 1953"], answer: "17 April 1975",
      optionsKm: ["១៧ មេសា ១៩៧៥", "១៨ មីនា ១៩៧០", "៧ មករា ១៩៧៩", "៩ វិច្ឆិកា ១៩៥៣"], answerKm: "១៧ មេសា ១៩៧៥",
      explanation: "The Khmer Rouge entered Phnom Penh on 17 April 1975, beginning the Democratic Kampuchea regime.", explanationKm: "ខ្មែរក្រហមបានចូលកាន់កាប់ទីក្រុងភ្នំពេញនៅថ្ងៃទី១៧ ខែមេសា ឆ្នាំ១៩៧៥ ដែលជាការចាប់ផ្តើមនៃរបបកម្ពុជាប្រជាធិបតេយ្យ។",
      formula: "Key fact: Fall of Phnom Penh = 17 April 1975", formulaKm: "ចំណុចសំខាន់៖ ការដួលរលំភ្នំពេញ = ១៧ មេសា ១៩៧៥",
      chapter: "Democratic Kampuchea (1975–1979)", chapterKm: "កម្ពុជាប្រជាធិបតេយ្យ (១៩៧៥-១៩៧៩)" },
    { topic: "Democratic Kampuchea", topicKm: "កម្ពុជាប្រជាធិបតេយ្យ", difficulty: "Easy",
      prompt: "What was the official name of the Khmer Rouge regime (1975-1979)?", promptKm: "តើឈ្មោះផ្លូវការរបស់របបខ្មែរក្រហម (១៩៧៥-១៩៧៩) ហៅថាអ្វី?",
      options: ["Democratic Kampuchea", "Khmer Republic", "State of Cambodia", "People's Republic of Kampuchea"], answer: "Democratic Kampuchea",
      optionsKm: ["កម្ពុជាប្រជាធិបតេយ្យ", "សាធារណរដ្ឋខ្មែរ", "រដ្ឋកម្ពុជា", "សាធារណរដ្ឋប្រជាមានិតកម្ពុជា"], answerKm: "កម្ពុជាប្រជាធិបតេយ្យ",
      explanation: "The Khmer Rouge regime called itself \"Democratic Kampuchea\" from 1975 to 1979.", explanationKm: "របបខ្មែរក្រហមបានហៅខ្លួនឯងថា \"កម្ពុជាប្រជាធិបតេយ្យ\" ចាប់ពីឆ្នាំ១៩៧៥ដល់១៩៧៩។",
      formula: "Key fact: 1975-1979 regime = Democratic Kampuchea", formulaKm: "ចំណុចសំខាន់៖ របប១៩៧៥-១៩៧៩ = កម្ពុជាប្រជាធិបតេយ្យ",
      chapter: "Democratic Kampuchea (1975–1979)", chapterKm: "កម្ពុជាប្រជាធិបតេយ្យ (១៩៧៥-១៩៧៩)" },
    { topic: "The Khmer Rouge's \"8 points\"", topicKm: "គោលការណ៍៨ចំណុចរបស់ខ្មែរក្រហម", difficulty: "Hard",
      prompt: "Which of these was one of the Khmer Rouge's declared \"8 points\" after taking power in 1975?", promptKm: "តើមួយណាខាងក្រោមជាគោលការណ៍មួយក្នុងចំណោម\"៨ចំណុច\"ដែលខ្មែរក្រហមប្រកាសក្រោយឡើងកាន់អំណាចឆ្នាំ១៩៧៥?",
      options: ["Evacuate everyone from the cities", "Restore private banking and currency", "Protect all ethnic minorities equally", "Reinstate the previous government's leaders"], answer: "Evacuate everyone from the cities",
      optionsKm: ["ជម្លៀសប្រជាជនចេញពីទីក្រុងទាំងអស់", "ស្តារធនាគារឯកជននិងរូបិយប័ណ្ណឡើងវិញ", "ការពារជនជាតិភាគតិចទាំងអស់ស្មើគ្នា", "តែងតាំងមេដឹកនាំរបបចាស់ឡើងវិញ"], answerKm: "ជម្លៀសប្រជាជនចេញពីទីក្រុងទាំងអស់",
      explanation: "The \"8 points\" included evacuating all cities, abolishing money and markets, and executing the former regime's leaders — the exact opposite of the other three options.", explanationKm: "\"៨ចំណុច\" រួមមានការជម្លៀសទីក្រុងទាំងអស់ លុបបំបាត់ការប្រើប្រាស់រូបិយវត្ថុនិងទីផ្សារ និងប្រហារជីវិតមេដឹកនាំរបបចាស់ — ផ្ទុយពីជម្រើសផ្សេងទៀតទាំងស្រុង។",
      formula: "Key fact: 8-points program included city evacuation", formulaKm: "ចំណុចសំខាន់៖ គោលការណ៍៨ចំណុច រួមមានការជម្លៀសទីក្រុង",
      chapter: "Democratic Kampuchea (1975–1979)", chapterKm: "កម្ពុជាប្រជាធិបតេយ្យ (១៩៧៥-១៩៧៩)" },
    { topic: "\"Angkar\" (the Organization)", topicKm: "\"អង្គការ\"", difficulty: "Medium",
      prompt: "In Democratic Kampuchea, the all-powerful body holding legislative, executive and judicial power at once was known by what name?", promptKm: "ក្នុងសម័យកម្ពុជាប្រជាធិបតេយ្យ តើអង្គភាពដែលកាន់អំណាចនីតិបញ្ញត្តិ នីតិប្រតិបត្តិ និងតុលាការក្នុងពេលតែមួយ មានឈ្មោះហៅថាអ្វី?",
      options: ["Angkar (the Organization)", "The Central Committee", "The People's Assembly", "The Revolutionary Council"], answer: "Angkar (the Organization)",
      optionsKm: ["អង្គការ", "គណៈកម្មាធិការមជ្ឈិម", "រដ្ឋសភាប្រជាជន", "ក្រុមប្រឹក្សាបដិវត្តន៍"], answerKm: "អង្គការ",
      explanation: "\"Angkar\" (the Organization) was the faceless, all-powerful ruling body that Khmer Rouge cadres and citizens alike were told to obey absolutely.", explanationKm: "\"អង្គការ\" ជាអង្គភាពគ្រប់គ្រងអត្តនាមដ៏ខ្លាំងក្លា ដែលកម្មាភិបាលខ្មែរក្រហមនិងប្រជាជនត្រូវបានប្រាប់ឱ្យគោរពស្តាប់បង្គាប់ដាច់ខាត។",
      formula: "Key fact: Angkar = DK's supreme ruling body", formulaKm: "ចំណុចសំខាន់៖ អង្គការ = អង្គភាពគ្រប់គ្រងកំពូលកម្ពុជាប្រជាធិបតេយ្យ",
      chapter: "Democratic Kampuchea (1975–1979)", chapterKm: "កម្ពុជាប្រជាធិបតេយ្យ (១៩៧៥-១៩៧៩)" },
    { topic: "\"New people\" under the Khmer Rouge", topicKm: "\"ប្រជាជនថ្មី\" សម័យខ្មែរក្រហម", difficulty: "Medium",
      prompt: "People evacuated from Phnom Penh and other cities after 17 April 1975 were classified by the Khmer Rouge as ___?", promptKm: "ប្រជាជនដែលត្រូវបានជម្លៀសចេញពីភ្នំពេញនិងទីក្រុងផ្សេងៗ ក្រោយថ្ងៃទី១៧ មេសា ១៩៧៥ ត្រូវបានខ្មែរក្រហមចាត់ទុកជា ___?",
      options: ["\"New people\" (17 April people)", "\"Base people\" (old people)", "Full citizens", "Party members"], answer: "\"New people\" (17 April people)",
      optionsKm: ["\"ប្រជាជនថ្មី\" (ប្រជាជន១៧មេសា)", "\"ប្រជាជនចាស់\" (ប្រជាជនមូលដ្ឋាន)", "ប្រជាពលរដ្ឋពេញសិទ្ធិ", "សមាជិកបក្ស"], answerKm: "\"ប្រជាជនថ្មី\" (ប្រជាជន១៧មេសា)",
      explanation: "The Khmer Rouge divided the population into \"base people\" (rural, pre-1975) and \"new people\" (evacuated city dwellers), who were distrusted and treated far more harshly.", explanationKm: "ខ្មែរក្រហមបានបែងចែកប្រជាជនជា\"ប្រជាជនមូលដ្ឋាន\" (ជនបទ មុនឆ្នាំ១៩៧៥) និង\"ប្រជាជនថ្មី\" (អ្នកទីក្រុងដែលជម្លៀស) ដែលត្រូវបានសង្ស័យនិងប្រព្រឹត្តចំពោះយ៉ាងធ្ងន់ធ្ងរជាង។",
      formula: "Key fact: 17 April evacuees = \"new people\"", formulaKm: "ចំណុចសំខាន់៖ អ្នកជម្លៀស១៧មេសា = \"ប្រជាជនថ្មី\"",
      chapter: "Democratic Kampuchea (1975–1979)", chapterKm: "កម្ពុជាប្រជាធិបតេយ្យ (១៩៧៥-១៩៧៩)" },
    { topic: "\"Base people\" under the Khmer Rouge", topicKm: "\"ប្រជាជនមូលដ្ឋាន\" សម័យខ្មែរក្រហម", difficulty: "Medium",
      prompt: "People who already lived in Khmer Rouge-controlled rural areas before 17 April 1975 were classified as ___?", promptKm: "ប្រជាជនដែលរស់នៅក្នុងតំបន់ជនបទក្រោមការគ្រប់គ្រងខ្មែរក្រហមរួចហើយ មុនថ្ងៃទី១៧ មេសា ១៩៧៥ ត្រូវបានចាត់ទុកជា ___?",
      options: ["\"Base people\" (old people)", "\"New people\" (17 April people)", "Full citizens", "Party members"], answer: "\"Base people\" (old people)",
      optionsKm: ["\"ប្រជាជនមូលដ្ឋាន\" (ប្រជាជនចាស់)", "\"ប្រជាជនថ្មី\" (ប្រជាជន១៧មេសា)", "ប្រជាពលរដ្ឋពេញសិទ្ធិ", "សមាជិកបក្ស"], answerKm: "\"ប្រជាជនមូលដ្ឋាន\" (ប្រជាជនចាស់)",
      explanation: "\"Base people\" were trusted more than the \"new people\" evacuated from cities, and could even become cooperative or unit leaders.", explanationKm: "\"ប្រជាជនមូលដ្ឋាន\" ត្រូវបានទុកចិត្តជាង\"ប្រជាជនថ្មី\"ដែលជម្លៀសពីទីក្រុង ហើយថែមទាំងអាចក្លាយជាប្រធានសហករណ៍ ឬប្រធានកងបាន។",
      formula: "Key fact: Base people = pre-1975 rural population", formulaKm: "ចំណុចសំខាន់៖ ប្រជាជនមូលដ្ឋាន = ប្រជាជនជនបទមុន១៩៧៥",
      chapter: "Democratic Kampuchea (1975–1979)", chapterKm: "កម្ពុជាប្រជាធិបតេយ្យ (១៩៧៥-១៩៧៩)" },
    { topic: "Zonal administration", topicKm: "ការបែងចែករដ្ឋបាលជាភូមិភាគ", difficulty: "Medium",
      prompt: "Democratic Kampuchea divided the country into how many administrative zones?", promptKm: "តើកម្ពុជាប្រជាធិបតេយ្យបានបែងចែកប្រទេសជាភូមិភាគចំនួនប៉ុន្មាន?",
      options: ["7 zones", "4 zones", "10 zones", "25 zones"], answer: "7 zones",
      optionsKm: ["៧ភូមិភាគ", "៤ភូមិភាគ", "១០ភូមិភាគ", "២៥ភូមិភាគ"], answerKm: "៧ភូមិភាគ",
      explanation: "The country was split into 7 zones and 32 regions, each with its own zonal and regional command — including the Eastern, Northwestern, and Southwestern zones.", explanationKm: "ប្រទេសត្រូវបានបែងចែកជា៧ភូមិភាគ និង៣២តំបន់ ដែលនីមួយៗមានបញ្ជាការភូមិភាគនិងតំបន់ផ្ទាល់ខ្លួន — រួមទាំងភូមិភាគខាងកើត ភូមិភាគពាយ័ព្យ និងភូមិភាគនិរតី។",
      formula: "Key fact: DK = 7 zones, 32 regions", formulaKm: "ចំណុចសំខាន់៖ កម្ពុជាប្រជាធិបតេយ្យ = ៧ភូមិភាគ ៣២តំបន់",
      chapter: "Democratic Kampuchea (1975–1979)", chapterKm: "កម្ពុជាប្រជាធិបតេយ្យ (១៩៧៥-១៩៧៩)" },
    { topic: "Purge of the Eastern Zone", topicKm: "ការសម្លាប់សម្អាតភូមិភាគខាងកើត", difficulty: "Hard",
      prompt: "In 1978, the Khmer Rouge purged cadres of which zone, accusing them of having \"Khmer bodies with Vietnamese minds\"?", promptKm: "ក្នុងឆ្នាំ១៩៧៨ ខ្មែរក្រហមបានសម្លាប់សម្អាតកម្មាភិបាលភូមិភាគណា ដោយចោទថាមាន\"ខ្លួនខ្មែរក្បាលយួន\"?",
      options: ["Eastern Zone", "Northwestern Zone", "Central Zone", "Southwestern Zone"], answer: "Eastern Zone",
      optionsKm: ["ភូមិភាគខាងកើត", "ភូមិភាគពាយ័ព្យ", "ភូមិភាគកណ្តាល", "ភូមិភាគនិរតី"], answerKm: "ភូមិភាគខាងកើត",
      explanation: "Fearing disloyalty near the Vietnamese border, the Khmer Rouge leadership purged the Eastern Zone in 1978, killing many cadres and civilians accused of secretly sympathizing with Vietnam.", explanationKm: "ដោយខ្លាចភាពមិនស្មោះត្រង់នៅជិតព្រំដែនវៀតណាម មេដឹកនាំខ្មែរក្រហមបានសម្លាប់សម្អាតភូមិភាគខាងកើតក្នុងឆ្នាំ១៩៧៨ សម្លាប់កម្មាភិបាលនិងប្រជាជនជាច្រើនដែលត្រូវចោទថាកប់ចិត្តគាំទ្រវៀតណាមដោយសម្ងាត់។",
      formula: "Key fact: Eastern Zone purge, 1978", formulaKm: "ចំណុចសំខាន់៖ ការសម្លាប់សម្អាតភូមិភាគខាងកើត ១៩៧៨",
      chapter: "Democratic Kampuchea (1975–1979)", chapterKm: "កម្ពុជាប្រជាធិបតេយ្យ (១៩៧៥-១៩៧៩)" },
    { topic: "Democratic Kampuchea national anthem", topicKm: "ចម្រៀងជាតិកម្ពុជាប្រជាធិបតេយ្យ", difficulty: "Medium",
      prompt: "What was the title of the Democratic Kampuchea national anthem?", promptKm: "តើចម្រៀងជាតិសម័យកម្ពុជាប្រជាធិបតេយ្យមានចំណងជើងអ្វី?",
      options: ["\"17 April, Great Victory\"", "\"Nokor Reach\"", "\"Cambodia's Prosperity\"", "\"Glorious Kingdom\""], answer: "\"17 April, Great Victory\"",
      optionsKm: ["\"១៧ មេសា មហាជោគជ័យ\"", "\"នគររាជ\"", "\"សម្បូរភាពកម្ពុជា\"", "\"រាជាណាចក្រដ៏រុងរឿង\""], answerKm: "\"១៧ មេសា មហាជោគជ័យ\"",
      explanation: "\"17 April, Great Victory\" celebrated the day the Khmer Rouge captured Phnom Penh, and was written by Pol Pot.", explanationKm: "ចម្រៀង \"១៧ មេសា មហាជោគជ័យ\" សរសើរថ្ងៃដែលខ្មែរក្រហមចូលកាន់កាប់ភ្នំពេញ និងនិពន្ធដោយប៉ុល ពត។",
      formula: "Key fact: DK anthem = \"17 April, Great Victory\"", formulaKm: "ចំណុចសំខាន់៖ ចម្រៀងជាតិកម្ពុជាប្រជាធិបតេយ្យ = \"១៧ មេសា មហាជោគជ័យ\"",
      chapter: "Democratic Kampuchea (1975–1979)", chapterKm: "កម្ពុជាប្រជាធិបតេយ្យ (១៩៧៥-១៩៧៩)" },
    { topic: "Democratic Kampuchea flag", topicKm: "ទង់ជាតិកម្ពុជាប្រជាធិបតេយ្យ", difficulty: "Easy",
      prompt: "The Democratic Kampuchea flag had how many colors?", promptKm: "តើទង់ជាតិសម័យកម្ពុជាប្រជាធិបតេយ្យមានពណ៌ប៉ុន្មាន?",
      options: ["2 (red and yellow)", "3 (red, white, blue)", "1 (plain red)", "4 (red, yellow, white, blue)"], answer: "2 (red and yellow)",
      optionsKm: ["២ពណ៌ (ក្រហម និងលឿង)", "៣ពណ៌ (ក្រហម ស ខៀវ)", "១ពណ៌ (ក្រហមសុទ្ធ)", "៤ពណ៌ (ក្រហម លឿង ស ខៀវ)"], answerKm: "២ពណ៌ (ក្រហម និងលឿង)",
      explanation: "The flag had a red field (revolution and struggle) with a yellow silhouette of Angkor Wat.", explanationKm: "ទង់ជាតិមានផ្ទៃក្រហម (និមិត្តរូបនៃបដិវត្តន៍និងការតស៊ូ) ជាមួយរូបប្រាសាទអង្គរពណ៌លឿង។",
      formula: "Key fact: DK flag = red + yellow", formulaKm: "ចំណុចសំខាន់៖ ទង់ជាតិកម្ពុជាប្រជាធិបតេយ្យ = ក្រហម និងលឿង",
      chapter: "Democratic Kampuchea (1975–1979)", chapterKm: "កម្ពុជាប្រជាធិបតេយ្យ (១៩៧៥-១៩៧៩)" },
    { topic: "Khmer Rouge leadership", topicKm: "មេដឹកនាំខ្មែរក្រហម", difficulty: "Medium",
      prompt: "Who led the Democratic Kampuchea government as Prime Minister?", promptKm: "តើនរណាបានដឹកនាំរដ្ឋាភិបាលកម្ពុជាប្រជាធិបតេយ្យ ក្នុងតួនាទីជានាយករដ្ឋមន្ត្រី?",
      options: ["Pol Pot", "Lon Nol", "Heng Samrin", "Hun Sen"], answer: "Pol Pot",
      optionsKm: ["ប៉ុល ពត", "លន់ នល់", "ហេង សំរិន", "ហ៊ុន សែន"], answerKm: "ប៉ុល ពត",
      explanation: "Pol Pot was the Prime Minister and top leader of the Khmer Rouge regime.", explanationKm: "ប៉ុល ពត ជានាយករដ្ឋមន្ត្រី និងជាមេដឹកនាំកំពូលនៃរបបខ្មែរក្រហម។",
      formula: "Key fact: Democratic Kampuchea PM = Pol Pot", formulaKm: "ចំណុចសំខាន់៖ នាយករដ្ឋមន្ត្រីកម្ពុជាប្រជាធិបតេយ្យ = ប៉ុល ពត",
      chapter: "Democratic Kampuchea (1975–1979)", chapterKm: "កម្ពុជាប្រជាធិបតេយ្យ (១៩៧៥-១៩៧៩)" },
    { topic: "S-21 prison", topicKm: "មន្ទីរសន្តិសុខស-២១", difficulty: "Medium",
      prompt: "Who was the head of the S-21 security prison (Tuol Sleng) during Democratic Kampuchea?", promptKm: "តើនរណាជាប្រធានមន្ទីរសន្តិសុខស-២១ (ទួលស្លែង) ក្នុងសម័យកម្ពុជាប្រជាធិបតេយ្យ?",
      options: ["Kaing Guek Eav (Duch)", "Pol Pot", "Nuon Chea", "Ta Mok"], answer: "Kaing Guek Eav (Duch)",
      optionsKm: ["កាំង ហ្គេកអាវ (ឌុច)", "ប៉ុល ពត", "នួន ជា", "តា ម៉ុក"], answerKm: "កាំង ហ្គេកអាវ (ឌុច)",
      explanation: "Kaing Guek Eav, known as \"Duch,\" ran the S-21 (Tuol Sleng) security prison.", explanationKm: "កាំង ហ្គេកអាវ ហៅ \"ឌុច\" ជាអ្នកគ្រប់គ្រងមន្ទីរសន្តិសុខស-២១ (ទួលស្លែង)។",
      formula: "Key fact: S-21 chief = Duch (Kaing Guek Eav)", formulaKm: "ចំណុចសំខាន់៖ ប្រធានស-២១ = ឌុច (កាំង ហ្គេកអាវ)",
      chapter: "Democratic Kampuchea (1975–1979)", chapterKm: "កម្ពុជាប្រជាធិបតេយ្យ (១៩៧៥-១៩៧៩)" },
    { topic: "End of the Khmer Rouge regime", topicKm: "ការដួលរលំខ្មែរក្រហម", difficulty: "Easy",
      prompt: "Cambodia was liberated from the Democratic Kampuchea (Khmer Rouge) regime on what date?", promptKm: "តើកម្ពុជាបានរួចផុតពីរបបកម្ពុជាប្រជាធិបតេយ្យ (ខ្មែរក្រហម) នៅថ្ងៃណា?",
      options: ["7 January 1979", "17 April 1975", "26 September 1989", "23 October 1991"], answer: "7 January 1979",
      optionsKm: ["៧ មករា ១៩៧៩", "១៧ មេសា ១៩៧៥", "២៦ កញ្ញា ១៩៨៩", "២៣ តុលា ១៩៩១"], answerKm: "៧ មករា ១៩៧៩",
      explanation: "The Kampuchean United Front for National Salvation, backed by Vietnamese forces, liberated Phnom Penh on 7 January 1979.", explanationKm: "រណសិរ្សសាមគ្គីសង្គ្រោះជាតិកម្ពុជា ជាមួយកងទ័ពវៀតណាម បានរំដោះទីក្រុងភ្នំពេញនៅថ្ងៃទី៧ ខែមករា ឆ្នាំ១៩៧៩។",
      formula: "Key fact: Liberation Day = 7 January 1979", formulaKm: "ចំណុចសំខាន់៖ ទិវាប្រោសលោក = ៧ មករា ១៩៧៩",
      chapter: "Democratic Kampuchea (1975–1979)", chapterKm: "កម្ពុជាប្រជាធិបតេយ្យ (១៩៧៥-១៩៧៩)" },
    { topic: "Death toll of Democratic Kampuchea", topicKm: "ចំនួនអ្នកស្លាប់សម័យកម្ពុជាប្រជាធិបតេយ្យ", difficulty: "Medium",
      prompt: "The Democratic Kampuchea regime (1975–1979) is recorded as having killed how many people?", promptKm: "របបកម្ពុជាប្រជាធិបតេយ្យ (១៩៧៥-១៩៧៩) ត្រូវបានកត់ត្រាថាបានសម្លាប់ប្រជាជនប៉ុន្មាននាក់?",
      options: ["Over 3 million", "About 500,000", "About 100,000", "Over 10 million"], answer: "Over 3 million",
      optionsKm: ["ជាងបីលាននាក់", "ប្រមាណ ៥០០.០០០នាក់", "ប្រមាណ ១០០.០០០នាក់", "ជាងដប់លាននាក់"], answerKm: "ជាងបីលាននាក់",
      explanation: "The regime is recorded as having killed over 3 million people through execution, forced labor, and starvation — far more than the roughly 1 million killed in the earlier civil war.", explanationKm: "របបនេះត្រូវបានកត់ត្រាថាបានសម្លាប់ប្រជាជនជាងបីលាននាក់ តាមរយៈការប្រហារជីវិត ការបង្ខំធ្វើការ និងការអត់ឃ្លាន — ច្រើនជាងអ្នកស្លាប់ប្រមាណមួយលាននាក់ក្នុងសង្គ្រាមស៊ីវិលមុននោះឆ្ងាយណាស់។",
      formula: "Key fact: DK regime death toll > 3 million", formulaKm: "ចំណុចសំខាន់៖ អ្នកស្លាប់សម័យខ្មែរក្រហម > ៣លាននាក់",
      chapter: "Democratic Kampuchea (1975–1979)", chapterKm: "កម្ពុជាប្រជាធិបតេយ្យ (១៩៧៥-១៩៧៩)" },
    { topic: "Failed rice-production target", topicKm: "ខែនការផលិតស្រូវបីតោនបរាជ័យ", difficulty: "Medium",
      prompt: "What was the Khmer Rouge's nationwide rice-production target, which the country failed to meet and which contributed to mass starvation?", promptKm: "តើខែនការផលិតស្រូវទូទាំងប្រទេសរបស់ខ្មែរក្រហម ដែលប្រទេសមិនអាចសម្រេចបាន និងបានរួមចំណែកឱ្យមានការអត់ឃ្លានទូលំទូលាយ គឺប៉ុន្មាន?",
      options: ["3 tons per hectare", "1 ton per hectare", "10 tons per hectare", "5 tons per hectare"], answer: "3 tons per hectare",
      optionsKm: ["៣តោនក្នុងមួយហិចតា", "១តោនក្នុងមួយហិចតា", "១០តោនក្នុងមួយហិចតា", "៥តោនក្នុងមួយហិចតា"], answerKm: "៣តោនក្នុងមួយហិចតា",
      explanation: "The Khmer Rouge demanded 3 tons of rice per hectare nationwide — far beyond what was realistic — while forcing people to work long hours on too little food.", explanationKm: "ខ្មែរក្រហមទាមទារផលិតកម្មស្រូវ៣តោនក្នុងមួយហិចតាទូទាំងប្រទេស — លើសពីអ្វីដែលជាក់ស្តែងឆ្ងាយណាស់ — ខណៈបង្ខំប្រជាជនធ្វើការយូរម៉ោងដោយអាហារតិចតួច។",
      formula: "Key fact: 3 tons/hectare rice target, failed", formulaKm: "ចំណុចសំខាន់៖ ខែនការស្រូវ ៣តោន/ហិចតា មិនសម្រេច",
      chapter: "Democratic Kampuchea (1975–1979)", chapterKm: "កម្ពុជាប្រជាធិបតេយ្យ (១៩៧៥-១៩៧៩)" },
    { topic: "Basis for the Khmer Rouge tribunal", topicKm: "មូលដ្ឋានតុលាការខ្មែរក្រហម", difficulty: "Hard",
      prompt: "The tribunal that tried senior Khmer Rouge leaders charged them with genocide, crimes against humanity, and which additional category of international crime?", promptKm: "តុលាការដែលកាត់ទោសមេដឹកនាំកំពូលខ្មែរក្រហម បានចោទប្រកាន់ពួកគេពីបទឧក្រិដ្ឋកម្មប្រល័យពូជសាសន៍ ឧក្រិដ្ឋកម្មប្រឆាំងមនុស្សជាតិ និងប្រភេទឧក្រិដ្ឋកម្មអន្តរជាតិណាមួយទៀត?", options: ["War crimes and grave breaches of the 1949 Geneva Conventions", "Tax evasion and smuggling", "Election fraud", "Environmental destruction only"], answer: "War crimes and grave breaches of the 1949 Geneva Conventions",
      optionsKm: ["ឧក្រិដ្ឋកម្មសង្គ្រាម និងការរំលោភបំពានយ៉ាងធ្ងន់ធ្ងរលើអនុសញ្ញាក្រុងហ្សឺណែវឆ្នាំ១៩៤៩", "ការគេចពន្ធ និងជួញដូរខុសច្បាប់", "ការក្លែងបន្លំឆ្នោត", "ការបំផ្លាញបរិស្ថានតែមួយមុខ"], answerKm: "ឧក្រិដ្ឋកម្មសង្គ្រាម និងការរំលោភបំពានយ៉ាងធ្ងន់ធ្ងរលើអនុសញ្ញាក្រុងហ្សឺណែវឆ្នាំ១៩៤៩",
      explanation: "The tribunal's charges included genocide, crimes against humanity, war crimes, crimes against internationally protected persons, and grave breaches of the 1949 Geneva Conventions.", explanationKm: "បទចោទប្រកាន់របស់តុលាការរួមមាន ការប្រល័យពូជសាសន៍ ឧក្រិដ្ឋកម្មប្រឆាំងមនុស្សជាតិ ឧក្រិដ្ឋកម្មសង្គ្រាម ឧក្រិដ្ឋកម្មប្រឆាំងអ្នកទទួលបានការការពារអន្តរជាតិ និងការរំលោភបំពានយ៉ាងធ្ងន់ធ្ងរលើអនុសញ្ញាក្រុងហ្សឺណែវ ១៩៤៩។",
      formula: "KR tribunal charges: genocide + crimes vs humanity + war crimes + Geneva breaches", formulaKm: "បទចោទតុលាការខ្មែរក្រហម៖ ប្រល័យពូជសាសន៍ + ប្រឆាំងមនុស្សជាតិ + សង្គ្រាម + រំលោភហ្សឺណែវ",
      chapter: "Democratic Kampuchea (1975–1979)", chapterKm: "កម្ពុជាប្រជាធិបតេយ្យ (១៩៧៥-១៩៧៩)" },
    { topic: "Purpose of the tribunal", topicKm: "គោលបំណងតុលាការ", difficulty: "Medium",
      prompt: "Which of the following is a stated purpose of trying the senior Khmer Rouge leaders, according to the BAC II model answer?", promptKm: "តើគោលបំណងណាមួយខាងក្រោម ត្រូវបានចែងក្នុងចម្លើយគំរូបាក់ឌុប សម្រាប់ការកាត់ទោសមេដឹកនាំកំពូលខ្មែរក្រហម?", options: ["To deliver justice to survivors and serve as a lesson so such a regime never happens again", "To confiscate all remaining Khmer Rouge property for the state treasury", "To force all former Khmer Rouge cadres into exile", "To rewrite Cambodia's constitution"], answer: "To deliver justice to survivors and serve as a lesson so such a regime never happens again",
      optionsKm: ["ដើម្បីផ្តល់យុត្តិធម៌ដល់ជនរងគ្រោះ និងធ្វើជាមេរៀនកុំឲ្យរបបនេះកើតមានជាថ្មី", "ដើម្បីរឹបអូសទ្រព្យសម្បត្តិខ្មែរក្រហមទាំងអស់ចូលឃ្លាំងរដ្ឋ", "ដើម្បីបង្ខំអតីតកម្មាភិបាលខ្មែរក្រហមទាំងអស់ឲ្យនិរទេស", "ដើម្បីសរសេររដ្ឋធម្មនុញ្ញកម្ពុជាឡើងវិញ"], answerKm: "ដើម្បីផ្តល់យុត្តិធម៌ដល់ជនរងគ្រោះ និងធ្វើជាមេរៀនកុំឲ្យរបបនេះកើតមានជាថ្មី",
      explanation: "The tribunal aimed to give justice and psychological closure to survivors, serve as a lesson for future leaders, deter any repeat of such a regime, and support national reconciliation.", explanationKm: "តុលាការមានគោលបំណងផ្តល់យុត្តិធម៌ និងភាពស្ងប់ស្ងាត់ផ្លូវចិត្តដល់ជនរងគ្រោះ ធ្វើជាមេរៀនសម្រាប់ថ្នាក់ដឹកនាំជំនាន់ក្រោយ ទប់ស្កាត់កុំឲ្យរបបនេះកើតឡើងជាថ្មី និងគាំទ្រការផ្សះផ្សាជាតិ។",
      formula: "Tribunal purpose: justice + lesson + deterrence + reconciliation", formulaKm: "គោលបំណងតុលាការ៖ យុត្តិធម៌ + មេរៀន + ការទប់ស្កាត់ + ការផ្សះផ្សាជាតិ",
      chapter: "Democratic Kampuchea (1975–1979)", chapterKm: "កម្ពុជាប្រជាធិបតេយ្យ (១៩៧៥-១៩៧៩)" },
    { topic: "Cause of the mass killings", topicKm: "មូលហេតុសម្លាប់រង្គាល", difficulty: "Hard",
      prompt: "The Khmer Rouge's policy of rushing to achieve rapid agricultural targets within a 4-year plan was known by what name?", promptKm: "គោលនយោបាយខ្មែរក្រហមដែលប្រញាប់សម្រេចគោលដៅកសិកម្មយ៉ាងឆាប់រហ័សក្នុងផែនការ៤ឆ្នាំ មានឈ្មោះហៅថាអ្វី?", options: ["\"Super Great Leap Forward\"", "\"Win-Win Policy\"", "\"Blue Revolution\"", "\"National Reconciliation Plan\""], answer: "\"Super Great Leap Forward\"",
      optionsKm: ["\"មហាឡោតផ្លោះ មហាអស្ចារ្យ\"", "\"គោលនយោបាយឈ្នះ-ឈ្នះ\"", "\"បដិវត្តន៍ខៀវ\"", "\"ផែនការផ្សះផ្សាជាតិ\""], answerKm: "\"មហាឡោតផ្លោះ មហាអស្ចារ្យ\"",
      explanation: "This policy, aiming to rapidly transform the economy within a 4-year plan, drove the forced labor and unrealistic quotas that contributed heavily to starvation and death under Democratic Kampuchea.", explanationKm: "គោលនយោបាយនេះ ដែលមានគោលដៅផ្លាស់ប្តូរសេដ្ឋកិច្ចយ៉ាងឆាប់រហ័សក្នុងផែនការ៤ឆ្នាំ បានជំរុញឲ្យមានពលកម្មបង្ខំ និងកូតាមិនប្រាកដនិយម ដែលរួមចំណែកយ៉ាងខ្លាំងដល់ការអត់ឃ្លាន និងការស្លាប់ក្នុងសម័យកម្ពុជាប្រជាធិបតេយ្យ។",
      formula: "\"Super Great Leap Forward\" = 4-year plan → forced labor + famine", formulaKm: "\"មហាឡោតផ្លោះ មហាអស្ចារ្យ\" = ផែនការ៤ឆ្នាំ → ពលកម្មបង្ខំ + អត់ឃ្លាន",
      chapter: "Democratic Kampuchea (1975–1979)", chapterKm: "កម្ពុជាប្រជាធិបតេយ្យ (១៩៧៥-១៩៧៩)" },
    { topic: "Early internal dissent", topicKm: "ការប្រឆាំងផ្ទៃក្នុងដំបូង", difficulty: "Hard",
      prompt: "In January 1976, which Khmer Rouge official publicly opposed Pol Pot's leadership, reflecting early internal cracks in the regime?", promptKm: "ក្នុងខែមករា ១៩៧៦ តើមន្ត្រីខ្មែរក្រហមណាបានចេញមុខប្រឆាំងជាសាធារណៈនឹងការដឹកនាំរបស់ប៉ុលពត ដែលឆ្លុះបញ្ចាំងពីស្នាមប្រេះដំបូងក្នុងរបប?", options: ["Hu Nim", "Hun Sen", "Heng Samrin", "Son Sann"], answer: "Hu Nim",
      optionsKm: ["ហ៊ូ នឹម", "ហ៊ុន សែន", "ហេង សំរិន", "សឺន សាន"], answerKm: "ហ៊ូ នឹម",
      explanation: "Hu Nim, a Khmer Rouge official, publicly spoke out against Pol Pot in January 1976 — an early sign of internal dissent that the regime later crushed through purges.", explanationKm: "ហ៊ូ នឹម ជាមន្ត្រីខ្មែរក្រហម បានចេញមុខប្រឆាំងជាសាធារណៈនឹងប៉ុលពតក្នុងខែមករា ១៩៧៦ ជាសញ្ញាដំបូងនៃការប្រឆាំងផ្ទៃក្នុង ដែលក្រោយមករបបបានបង្ក្រាបតាមរយៈការសម្លាប់សម្អាត។",
      formula: "Jan 1976: Hu Nim opposes Pol Pot", formulaKm: "មករា ១៩៧៦៖ ហ៊ូ នឹម ប្រឆាំងប៉ុលពត",
      chapter: "Democratic Kampuchea (1975–1979)", chapterKm: "កម្ពុជាប្រជាធិបតេយ្យ (១៩៧៥-១៩៧៩)" },
    { topic: "Hun Sen's defection", topicKm: "ការភៀសខ្លួនរបស់ហ៊ុន សែន", difficulty: "Medium",
      prompt: "On 20 June 1977, a mid-level Khmer Rouge commander fled to Vietnam to seek support and build an opposition force. Who was this commander?", promptKm: "នៅថ្ងៃទី២០ ខែមិថុនា ឆ្នាំ១៩៧៧ មេបញ្ជាការខ្មែរក្រហមកម្រិតមធ្យមម្នាក់បានភៀសខ្លួនទៅវៀតណាម ដើម្បីស្វែងរកការគាំទ្រ និងបង្កើតកម្លាំងប្រឆាំង។ តើនរណាជាមេបញ្ជាការនេះ?", options: ["Hun Sen", "Heng Samrin", "Pol Pot", "Nuon Chea"], answer: "Hun Sen",
      optionsKm: ["ហ៊ុន សែន", "ហេង សំរិន", "ប៉ុល ពត", "នួន ជា"], answerKm: "ហ៊ុន សែន",
      explanation: "Hun Sen defected to Vietnam on 20 June 1977 to escape Khmer Rouge purges and seek support, later becoming a founding leader of the Kampuchean United Front for National Salvation.", explanationKm: "ហ៊ុន សែន បានភៀសខ្លួនទៅវៀតណាមនៅថ្ងៃទី២០ មិថុនា ១៩៧៧ ដើម្បីគេចពីការសម្លាប់សម្អាតរបស់ខ្មែរក្រហម និងស្វែងរកការគាំទ្រ ដោយក្រោយមកបានក្លាយជាថ្នាក់ដឹកនាំស្ថាបនិកនៃរណសិរ្សសាមគ្គីសង្គ្រោះជាតិកម្ពុជា។",
      formula: "20 June 1977: Hun Sen flees to Vietnam", formulaKm: "២០ មិថុនា ១៩៧៧៖ ហ៊ុន សែនភៀសទៅវៀតណាម",
      chapter: "Democratic Kampuchea (1975–1979)", chapterKm: "កម្ពុជាប្រជាធិបតេយ្យ (១៩៧៥-១៩៧៩)" },

    { topic: "Kampuchean United Front for National Salvation", topicKm: "រណសិរ្សសាមគ្គីសង្គ្រោះជាតិកម្ពុជា", difficulty: "Medium",
      prompt: "The Kampuchean United Front for National Salvation, which helped liberate Cambodia from the Khmer Rouge, was founded on what date?", promptKm: "តើរណសិរ្សសាមគ្គីសង្គ្រោះជាតិកម្ពុជា ដែលបានជួយរំដោះកម្ពុជាពីខ្មែរក្រហម ត្រូវបានបង្កើតឡើងនៅថ្ងៃណា?",
      options: ["2 December 1978", "7 January 1979", "17 April 1975", "26 September 1989"], answer: "2 December 1978",
      optionsKm: ["២ ធ្នូ ១៩៧៨", "៧ មករា ១៩៧៩", "១៧ មេសា ១៩៧៥", "២៦ កញ្ញា ១៩៨៩"], answerKm: "២ ធ្នូ ១៩៧៨",
      explanation: "Founded on 2 December 1978 by figures including Heng Samrin and Hun Sen, this front led the campaign that liberated Phnom Penh a month later.", explanationKm: "បង្កើតឡើងនៅថ្ងៃទី២ ខែធ្នូ ១៩៧៨ ដោយបុគ្គលដូចជាហេង សំរិននិងហ៊ុន សែន រណសិរ្សនេះបានដឹកនាំយុទ្ធនាការដែលរំដោះភ្នំពេញមួយខែក្រោយមក។",
      formula: "Key fact: United Front founded 2 Dec 1978", formulaKm: "ចំណុចសំខាន់៖ រណសិរ្សសាមគ្គី បង្កើត ២ ធ្នូ ១៩៧៨",
      chapter: "PRK & State of Cambodia (1979–1993)", chapterKm: "សាធារណរដ្ឋប្រជាមានិតកម្ពុជា និងរដ្ឋកម្ពុជា (១៩៧៩-១៩៩៣)" },
    { topic: "Renaming to the State of Cambodia", topicKm: "ការប្រែឈ្មោះទៅជារដ្ឋកម្ពុជា", difficulty: "Medium",
      prompt: "Cambodia was renamed from the \"People's Republic of Kampuchea\" to the \"State of Cambodia\" on what date?", promptKm: "តើកម្ពុជាប្តូរឈ្មោះពី\"សាធារណរដ្ឋប្រជាមានិតកម្ពុជា\"ទៅជា\"រដ្ឋកម្ពុជា\"នៅថ្ងៃណា?",
      options: ["30 April 1989", "26 September 1989", "23 October 1991", "24 September 1993"], answer: "30 April 1989",
      optionsKm: ["៣០ មេសា ១៩៨៩", "២៦ កញ្ញា ១៩៨៩", "២៣ តុលា ១៩៩១", "២៤ កញ្ញា ១៩៩៣"], answerKm: "៣០ មេសា ១៩៨៩",
      explanation: "On 30 April 1989, Cambodia adopted a new flag and anthem and restored Buddhism as the state religion under its new name, State of Cambodia.", explanationKm: "នៅថ្ងៃទី៣០ ខែមេសា ១៩៨៩ កម្ពុជាបានប្តូរទង់ជាតិនិងចម្រៀងជាតិថ្មី ព្រមទាំងស្តារព្រះពុទ្ធសាសនាជាសាសនារដ្ឋឡើងវិញ ក្រោមឈ្មោះថ្មីថា\"រដ្ឋកម្ពុជា\"។",
      formula: "Key fact: PRK → State of Cambodia, 30 April 1989", formulaKm: "ចំណុចសំខាន់៖ សាធារណរដ្ឋប្រជាមានិតកម្ពុជា → រដ្ឋកម្ពុជា ៣០ មេសា ១៩៨៩",
      chapter: "PRK & State of Cambodia (1979–1993)", chapterKm: "សាធារណរដ្ឋប្រជាមានិតកម្ពុជា និងរដ្ឋកម្ពុជា (១៩៧៩-១៩៩៣)" },
    { topic: "Vietnamese troop withdrawal", topicKm: "ការដកកងទ័ពវៀតណាម", difficulty: "Medium",
      prompt: "Vietnamese troops fully withdrew from Cambodia on what date?", promptKm: "តើកងទ័ពវៀតណាមបានដកចេញពីកម្ពុជាទាំងស្រុងនៅថ្ងៃណា?",
      options: ["26 September 1989", "7 January 1979", "30 April 1989", "23 October 1991"], answer: "26 September 1989",
      optionsKm: ["២៦ កញ្ញា ១៩៨៩", "៧ មករា ១៩៧៩", "៣០ មេសា ១៩៨៩", "២៣ តុលា ១៩៩១"], answerKm: "២៦ កញ្ញា ១៩៨៩",
      explanation: "Vietnamese forces completed their withdrawal from Cambodia on 26 September 1989.", explanationKm: "កងទ័ពវៀតណាមបានបញ្ចប់ការដកចេញពីកម្ពុជាទាំងស្រុងនៅថ្ងៃទី២៦ ខែកញ្ញា ឆ្នាំ១៩៨៩។",
      formula: "Key fact: Vietnamese withdrawal completed 26 Sept 1989", formulaKm: "ចំណុចសំខាន់៖ ការដកកងទ័ពវៀតណាមចប់ ២៦ កញ្ញា ១៩៨៩",
      chapter: "PRK & State of Cambodia (1979–1993)", chapterKm: "សាធារណរដ្ឋប្រជាមានិតកម្ពុជា និងរដ្ឋកម្ពុជា (១៩៧៩-១៩៩៣)" },
    { topic: "Paris Peace Agreements", topicKm: "សន្ធិសញ្ញាក្រុងប៉ារីស", difficulty: "Medium",
      prompt: "The Paris Peace Agreements, ending Cambodia's civil war, were signed on what date?", promptKm: "តើសន្ធិសញ្ញាសន្តិភាពក្រុងប៉ារីស ដែលបញ្ចប់សង្គ្រាមស៊ីវិលកម្ពុជា ត្រូវបានចុះហត្ថលេខានៅថ្ងៃណា?",
      options: ["23 October 1991", "7 January 1979", "26 September 1989", "24 September 1993"], answer: "23 October 1991",
      optionsKm: ["២៣ តុលា ១៩៩១", "៧ មករា ១៩៧៩", "២៦ កញ្ញា ១៩៨៩", "២៤ កញ្ញា ១៩៩៣"], answerKm: "២៣ តុលា ១៩៩១",
      explanation: "18 countries signed the Paris Peace Agreements on 23 October 1991, ending the political crisis in Cambodia.", explanationKm: "ប្រទេសចំនួន១៨ បានចុះហត្ថលេខាលើសន្ធិសញ្ញាសន្តិភាពក្រុងប៉ារីសនៅថ្ងៃទី២៣ ខែតុលា ឆ្នាំ១៩៩១ ដែលបញ្ចប់វិបត្តិនយោបាយនៅកម្ពុជា។",
      formula: "Key fact: Paris Peace Agreements = 23 October 1991", formulaKm: "ចំណុចសំខាន់៖ សន្ធិសញ្ញាក្រុងប៉ារីស = ២៣ តុលា ១៩៩១",
      chapter: "PRK & State of Cambodia (1979–1993)", chapterKm: "សាធារណរដ្ឋប្រជាមានិតកម្ពុជា និងរដ្ឋកម្ពុជា (១៩៧៩-១៩៩៣)" },
    { topic: "Paris Peace Agreements — signatories", topicKm: "ប្រទេសចូលរួមសន្ធិសញ្ញាក្រុងប៉ារីស", difficulty: "Medium",
      prompt: "How many countries signed the 1991 Paris Peace Agreements on Cambodia?", promptKm: "តើប្រទេសប៉ុន្មានបានចុះហត្ថលេខាលើសន្ធិសញ្ញាសន្តិភាពក្រុងប៉ារីសឆ្នាំ១៩៩១ស្តីពីកម្ពុជា?",
      options: ["18", "10", "25", "5"], answer: "18",
      optionsKm: ["១៨", "១០", "២៥", "៥"], answerKm: "១៨",
      explanation: "18 countries, plus the UN Secretary-General and non-aligned movement representatives, signed the Paris Peace Agreements.", explanationKm: "ប្រទេសចំនួន១៨ ព្រមទាំងលេខាធិការអង្គការសហប្រជាជាតិនិងតំណាងចលនាមិនចូលបក្សសម្ព័ន្ធ បានចុះហត្ថលេខាលើសន្ធិសញ្ញាសន្តិភាពក្រុងប៉ារីស។",
      formula: "Key fact: 18 countries signed the Paris Peace Agreements", formulaKm: "ចំណុចសំខាន់៖ ប្រទេស១៨ ចុះហត្ថលេខាសន្ធិសញ្ញាក្រុងប៉ារីស",
      chapter: "PRK & State of Cambodia (1979–1993)", chapterKm: "សាធារណរដ្ឋប្រជាមានិតកម្ពុជា និងរដ្ឋកម្ពុជា (១៩៧៩-១៩៩៣)" },
    { topic: "UNTAC", topicKm: "អាជ្ញាធររណ្ដោះអាសន្នអង្គការសហប្រជាជាតិ", difficulty: "Medium",
      prompt: "What does UNTAC, the body that administered Cambodia's transition and organized its 1993 election, stand for?", promptKm: "តើ UNTAC ដែលបានគ្រប់គ្រងដំណាក់កាលអន្តរកាល និងរៀបចំការបោះឆ្នោតឆ្នាំ១៩៩៣ តំណាងឱ្យអ្វី?",
      options: ["United Nations Transitional Authority in Cambodia", "United Nations Trade and Cooperation", "United Nations Truce and Ceasefire", "United Nations Technical Assistance Commission"], answer: "United Nations Transitional Authority in Cambodia",
      optionsKm: ["អាជ្ញាធររណ្ដោះអាសន្នរបស់អង្គការសហប្រជាជាតិនៅកម្ពុជា", "ពាណិជ្ជកម្ម និងសហប្រតិបត្តិការអង្គការសហប្រជាជាតិ", "ការឈប់បាញ់ប្រហារអង្គការសហប្រជាជាតិ", "គណៈកម្មការជំនួយបច្ចេកទេសអង្គការសហប្រជាជាតិ"], answerKm: "អាជ្ញាធររណ្ដោះអាសន្នរបស់អង្គការសហប្រជាជាតិនៅកម្ពុជា",
      explanation: "UNTAC disarmed the factions, organized the 1993 election, and helped bring home about 350,000 refugees.", explanationKm: "UNTAC បានដកអាវុធភាគីជម្លោះ រៀបចំការបោះឆ្នោតឆ្នាំ១៩៩៣ និងជួយនាំជនភៀសខ្លួនប្រមាណ៣៥០.០០០នាក់ត្រឡប់មាតុភូមិវិញ។",
      formula: "Key fact: UNTAC ran the 1992-93 transition", formulaKm: "ចំណុចសំខាន់៖ UNTAC គ្រប់គ្រងអន្តរកាល ១៩៩២-៩៣",
      chapter: "PRK & State of Cambodia (1979–1993)", chapterKm: "សាធារណរដ្ឋប្រជាមានិតកម្ពុជា និងរដ្ឋកម្ពុជា (១៩៧៩-១៩៩៣)" },
    { topic: "UNTAC's nickname", topicKm: "ឈ្មោះហៅក្រៅរបស់ UNTAC", difficulty: "Easy",
      prompt: "UNTAC's peacekeeping troops in Cambodia were commonly nicknamed after their headgear as the ___?", promptKm: "តើកងទ័ពរក្សាសន្តិភាព UNTAC នៅកម្ពុជាត្រូវបានគេហៅក្រៅតាមមួករបស់ពួកគេថាជា ___?",
      options: ["Blue Helmet troops", "Green Beret troops", "White Helmet troops", "Red Cap troops"], answer: "Blue Helmet troops",
      optionsKm: ["កងទ័ពមួកខៀវ", "កងទ័ពមួកបៃតង", "កងទ័ពមួកស", "កងទ័ពមួកក្រហម"], answerKm: "កងទ័ពមួកខៀវ",
      explanation: "UNTAC's soldiers wore blue helmets, the standard UN peacekeeping color, earning them the nickname \"Blue Helmet troops.\"", explanationKm: "ទាហាន UNTAC ពាក់មួកខៀវ ជាពណ៌ស្តង់ដាររបស់កងកម្លាំងរក្សាសន្តិភាពអង្គការសហប្រជាជាតិ ធ្វើឱ្យពួកគេត្រូវបានហៅថា\"កងទ័ពមួកខៀវ\"។",
      formula: "Key fact: UNTAC troops = \"Blue Helmet troops\"", formulaKm: "ចំណុចសំខាន់៖ ទាហាន UNTAC = \"កងទ័ពមួកខៀវ\"",
      chapter: "PRK & State of Cambodia (1979–1993)", chapterKm: "សាធារណរដ្ឋប្រជាមានិតកម្ពុជា និងរដ្ឋកម្ពុជា (១៩៧៩-១៩៩៣)" },
    { topic: "Krom Samaki (solidarity groups)", topicKm: "ក្រុមសាមគ្គី", difficulty: "Medium",
      prompt: "After 1979, the government organized farmers into \"Krom Samaki\" (solidarity groups) mainly to help which people, who lacked labor and farm tools?", promptKm: "ក្រោយឆ្នាំ១៩៧៩ រដ្ឋាភិបាលបានរៀបចំកសិករជា\"ក្រុមសាមគ្គី\" ជាចម្បងដើម្បីជួយអ្នកណាដែលខ្វះកម្លាំងពលកម្ម និងឧបករណ៍កសិកម្ម?",
      options: ["War widows, orphans and the elderly", "Former Khmer Rouge cadres", "City merchants", "Buddhist monks"], answer: "War widows, orphans and the elderly",
      optionsKm: ["ស្ត្រីមេម៉ាយ ក្មេងកំព្រា និងមនុស្សចាស់ជរា", "អតីតកម្មាភិបាលខ្មែរក្រហម", "ឈ្មួញទីក្រុង", "ព្រះសង្ឃ"], answerKm: "ស្ត្រីមេម៉ាយ ក្មេងកំព្រា និងមនុស្សចាស់ជរា",
      explanation: "Krom Samaki grouped about 10 or more families together to share labor, draft animals and tools, helping those left without support after the Khmer Rouge era.", explanationKm: "ក្រុមសាមគ្គីបានប្រមូលគ្រួសារប្រមាណ១០ ឬច្រើនជាងនេះ ដើម្បីចែករំលែកកម្លាំងពលកម្ម សត្វព្រៃ និងឧបករណ៍ ជួយអ្នកដែលនៅសល់ដោយគ្មានជំនួយបន្ទាប់ពីសម័យខ្មែរក្រហម។",
      formula: "Key fact: Krom Samaki helped widows, orphans, elderly farm together", formulaKm: "ចំណុចសំខាន់៖ ក្រុមសាមគ្គី ជួយមេម៉ាយ កំព្រា មនុស្សចាស់",
      chapter: "PRK & State of Cambodia (1979–1993)", chapterKm: "សាធារណរដ្ឋប្រជាមានិតកម្ពុជា និងរដ្ឋកម្ពុជា (១៩៧៩-១៩៩៣)" },
    { topic: "KPRP leadership", topicKm: "មេដឹកនាំគណបក្សប្រជាជនបដិវត្តន៍កម្ពុជា", difficulty: "Medium",
      prompt: "Who led the Kampuchean People's Revolutionary Party (the ruling party) from 1981 onward?", promptKm: "តើនរណាបានដឹកនាំគណបក្សប្រជាជនបដិវត្តន៍កម្ពុជា (គណបក្សកាន់អំណាច) ចាប់ពីឆ្នាំ១៩៨១ តទៅ?",
      options: ["Heng Samrin", "Pen Sovan", "Hun Sen", "Chan Sy"], answer: "Heng Samrin",
      optionsKm: ["ហេង សំរិន", "ប៉ែន សុវណ្ណ", "ហ៊ុន សែន", "ចាន់ ស៊ី"], answerKm: "ហេង សំរិន",
      explanation: "Heng Samrin took over leadership of the party from Pen Sovan in December 1981.", explanationKm: "ហេង សំរិនបានដឹកនាំគណបក្សបន្តពីប៉ែន សុវណ្ណ នៅខែធ្នូ ឆ្នាំ១៩៨១។",
      formula: "Key fact: Heng Samrin led KPRP from 1981", formulaKm: "ចំណុចសំខាន់៖ ហេង សំរិន ដឹកនាំគណបក្សចាប់ពី១៩៨១",
      chapter: "PRK & State of Cambodia (1979–1993)", chapterKm: "សាធារណរដ្ឋប្រជាមានិតកម្ពុជា និងរដ្ឋកម្ពុជា (១៩៧៩-១៩៩៣)" },
    { topic: "Supreme National Council", topicKm: "ក្រុមប្រឹក្សាជាតិជាន់ខ្ពស់", difficulty: "Medium",
      prompt: "The Supreme National Council (SNC), which represented all four Cambodian factions before the 1993 election, was chaired by whom?", promptKm: "ក្រុមប្រឹក្សាជាតិជាន់ខ្ពស់ (SNC) ដែលតំណាងឱ្យភាគីខ្មែរទាំង៤មុនការបោះឆ្នោត១៩៩៣ ដឹកនាំដោយនរណា?",
      options: ["Norodom Sihanouk", "Heng Samrin", "Hun Sen", "Son Sann"], answer: "Norodom Sihanouk",
      optionsKm: ["សម្តេចនរោត្តម សីហនុ", "ហេង សំរិន", "ហ៊ុន សែន", "សឺន សាន"], answerKm: "សម្តេចនរោត្តម សីហនុ",
      explanation: "The SNC, formed in September 1990 with 12 members from all Cambodian factions, was chaired by Sihanouk and administered the transition alongside UNTAC.", explanationKm: "SNC ដែលបង្កើតឡើងក្នុងខែកញ្ញា ១៩៩០ មានសមាជិក១២រូបមកពីភាគីខ្មែរទាំងអស់ ដឹកនាំដោយសម្តេចសីហនុ និងបានគ្រប់គ្រងដំណាក់កាលអន្តរកាលរួមជាមួយ UNTAC។",
      formula: "Key fact: SNC formed 1990, chaired by Sihanouk", formulaKm: "ចំណុចសំខាន់៖ SNC បង្កើត១៩៩០ ដឹកនាំដោយសីហនុ",
      chapter: "PRK & State of Cambodia (1979–1993)", chapterKm: "សាធារណរដ្ឋប្រជាមានិតកម្ពុជា និងរដ្ឋកម្ពុជា (១៩៧៩-១៩៩៣)" },
    { topic: "UNTAC repatriation", topicKm: "ការនាំជនភៀសខ្លួនត្រឡប់មកវិញ", difficulty: "Medium",
      prompt: "UNTAC helped repatriate about how many Cambodian refugees from the Thai border camps back home?", promptKm: "តើ UNTAC បានជួយនាំជនភៀសខ្លួនខ្មែរពីជំរំតាមព្រំដែនថៃ ត្រឡប់មកមាតុភូមិវិញប្រមាណប៉ុន្មាននាក់?",
      options: ["About 350,000", "About 35,000", "About 3.5 million", "About 3,500"], answer: "About 350,000",
      optionsKm: ["ប្រមាណ ៣៥០.០០០នាក់", "ប្រមាណ ៣៥.០០០នាក់", "ប្រមាណ ៣,៥លាននាក់", "ប្រមាណ ៣.៥០០នាក់"], answerKm: "ប្រមាណ ៣៥០.០០០នាក់",
      explanation: "UNTAC helped roughly 350,000 Cambodian refugees, who had been living in camps along the Thai border, return home before the 1993 election.", explanationKm: "UNTAC បានជួយជនភៀសខ្លួនខ្មែរប្រមាណ៣៥០.០០០នាក់ ដែលបានរស់នៅជំរំតាមព្រំដែនថៃ ត្រឡប់មកមាតុភូមិវិញ មុនការបោះឆ្នោត១៩៩៣។",
      formula: "Key fact: UNTAC repatriated ~350,000 refugees", formulaKm: "ចំណុចសំខាន់៖ UNTAC នាំជនភៀសខ្លួន ~៣៥០.០០០នាក់ មកវិញ",
      chapter: "PRK & State of Cambodia (1979–1993)", chapterKm: "សាធារណរដ្ឋប្រជាមានិតកម្ពុជា និងរដ្ឋកម្ពុជា (១៩៧៩-១៩៩៣)" },
    { topic: "1984 France-brokered talks", topicKm: "កិច្ចចរចាបារាំង ១៩៨៤", difficulty: "Hard",
      prompt: "In November 1984, which country arranged a preliminary meeting plan between Sihanouk and representatives of the People's Republic of Kampuchea?", promptKm: "ក្នុងខែវិច្ឆិកា ១៩៨៤ ប្រទេសណាបានរៀបចំផែនការប្រជុំដំបូងរវាងសម្តេចសីហនុ និងតំណាងសាធារណរដ្ឋប្រជាមានិតកម្ពុជា?", options: ["France", "China", "The Soviet Union", "Japan"], answer: "France",
      optionsKm: ["បារាំង", "ចិន", "សូវៀត", "ជប៉ុន"], answerKm: "បារាំង",
      explanation: "France organized preliminary talks between Sihanouk and PRK representatives in November 1984, an early step in the years-long process toward peace.", explanationKm: "បារាំងបានរៀបចំកិច្ចប្រជុំដំបូងរវាងសម្តេចសីហនុ និងតំណាងសាធារណរដ្ឋប្រជាមានិតកម្ពុជាក្នុងខែវិច្ឆិកា ១៩៨៤ ជាជំហានដំបូងក្នុងដំណើរការស្វែងរកសន្តិភាពជាច្រើនឆ្នាំ។",
      formula: "Nov 1984: France arranges Sihanouk-PRK talks", formulaKm: "វិច្ឆិកា ១៩៨៤៖ បារាំងរៀបចំកិច្ចប្រជុំសីហនុ-PRK",
      chapter: "PRK & State of Cambodia (1979–1993)", chapterKm: "សាធារណរដ្ឋប្រជាមានិតកម្ពុជា និងរដ្ឋកម្ពុជា (១៩៧៩-១៩៩៣)" },
    { topic: "1987 Sihanouk–Hun Sen talks", topicKm: "កិច្ចប្រជុំសីហនុ-ហ៊ុនសែន ១៩៨៧", difficulty: "Medium",
      prompt: "In December 1987, Sihanouk and Hun Sen held their first direct meeting to seek a political solution, in which country?", promptKm: "ក្នុងខែធ្នូ ១៩៨៧ សម្តេចសីហនុ និងហ៊ុន សែន បានជួបគ្នាផ្ទាល់ជាលើកដំបូង ដើម្បីស្វែងរកដំណោះស្រាយនយោបាយ នៅប្រទេសណា?", options: ["France", "Indonesia", "Thailand", "Vietnam"], answer: "France",
      optionsKm: ["បារាំង", "ឥណ្ឌូនេស៊ី", "ថៃ", "វៀតណាម"], answerKm: "បារាំង",
      explanation: "Sihanouk and Hun Sen met for the first time on 2 December 1987 in France, beginning a series of talks that eventually led to the 1991 Paris Peace Agreements.", explanationKm: "សម្តេចសីហនុ និងហ៊ុន សែន បានជួបគ្នាជាលើកដំបូងនៅថ្ងៃទី២ ខែធ្នូ ១៩៨៧ នៅប្រទេសបារាំង ជាការចាប់ផ្តើមស៊េរីកិច្ចចរចា ដែលចុងក្រោយនាំទៅដល់កិច្ចព្រមព្រៀងសន្តិភាពក្រុងប៉ារីសឆ្នាំ១៩៩១។",
      formula: "2 Dec 1987: first Sihanouk-Hun Sen meeting (France)", formulaKm: "២ ធ្នូ ១៩៨៧៖ ជួបគ្នាលើកដំបូងសីហនុ-ហ៊ុនសែន (បារាំង)",
      chapter: "PRK & State of Cambodia (1979–1993)", chapterKm: "សាធារណរដ្ឋប្រជាមានិតកម្ពុជា និងរដ្ឋកម្ពុជា (១៩៧៩-១៩៩៣)" },
    { topic: "Composition of the SNC", topicKm: "សមាសភាព SNC", difficulty: "Hard",
      prompt: "The Supreme National Council (SNC), formed in September 1990, had 12 members split how between the two sides of the conflict?", promptKm: "ក្រុមប្រឹក្សាជាតិជាន់ខ្ពស់ (SNC) ដែលបង្កើតឡើងក្នុងខែកញ្ញា ១៩៩០ មានសមាជិក១២រូប បែងចែកយ៉ាងដូចម្តេចរវាងភាគីទាំងសង្ខាងជម្លោះ?", options: ["6 members from the State of Cambodia and 6 from the tripartite resistance coalition", "10 members from the government and 2 from the opposition", "All 12 members from foreign observer nations", "4 members from each of three factions equally"], answer: "6 members from the State of Cambodia and 6 from the tripartite resistance coalition",
      optionsKm: ["សមាជិក៦រូបពីរដ្ឋកម្ពុជា និង៦រូបទៀតពីសម្ព័ន្ធភាពបីភាគី", "សមាជិក១០រូបពីរដ្ឋាភិបាល និង២រូបពីភាគីប្រឆាំង", "សមាជិកទាំង១២រូបជាតំណាងបរទេសសង្កេតការណ៍", "សមាជិក៤រូបក្នុងមួយភាគីស្មើគ្នាទាំងបី"], answerKm: "សមាជិក៦រូបពីរដ្ឋកម្ពុជា និង៦រូបទៀតពីសម្ព័ន្ធភាពបីភាគី",
      explanation: "The SNC, chaired by Sihanouk, balanced 6 seats for the State of Cambodia and 6 for the tripartite resistance (FUNCINPEC, KPNLF, Khmer Rouge), representing all Cambodian factions before the 1993 election.", explanationKm: "SNC ដែលដឹកនាំដោយសម្តេចសីហនុ បានតុល្យភាពសមាជិក៦រូបសម្រាប់រដ្ឋកម្ពុជា និង៦រូបសម្រាប់សម្ព័ន្ធភាពបីភាគី (ហ្វុងសិនប៉ិច KPNLF និងខ្មែរក្រហម) តំណាងឱ្យគ្រប់ភាគីខ្មែរមុនការបោះឆ្នោត១៩៩៣។",
      formula: "SNC 1990: 12 members = 6 (State of Cambodia) + 6 (tripartite)", formulaKm: "SNC ១៩៩០៖ សមាជិក១២ = ៦(រដ្ឋកម្ពុជា) + ៦(បីភាគី)",
      chapter: "PRK & State of Cambodia (1979–1993)", chapterKm: "សាធារណរដ្ឋប្រជាមានិតកម្ពុជា និងរដ្ឋកម្ពុជា (១៩៧៩-១៩៩៣)" },
    { topic: "Reintroduction of currency", topicKm: "ការចេញប្រាក់រៀលជាថ្មី", difficulty: "Medium",
      prompt: "After the Khmer Rouge had abolished money entirely, in what year did the PRK government reissue the Riel as national currency?", promptKm: "ក្រោយពេលខ្មែរក្រហមបានលុបបំបាត់ប្រាក់កាសទាំងស្រុង តើរដ្ឋាភិបាល PRK បានចេញប្រាក់រៀលជាថ្មីជារូបិយវត្ថុជាតិនៅឆ្នាំណា?", options: ["1980", "1975", "1985", "1993"], answer: "1980",
      optionsKm: ["១៩៨០", "១៩៧៥", "១៩៨៥", "១៩៩៣"], answerKm: "១៩៨០",
      explanation: "In 1980, the PRK government reissued the Riel to circulate nationwide, restoring a money economy that the Khmer Rouge had completely abolished.", explanationKm: "ក្នុងឆ្នាំ១៩៨០ រដ្ឋាភិបាល PRK បានចេញប្រាក់រៀលឲ្យចរាចរទូទាំងប្រទេសឡើងវិញ ស្តារសេដ្ឋកិច្ចប្រាក់កាសដែលខ្មែរក្រហមបានលុបបំបាត់ទាំងស្រុង។",
      formula: "1980: Riel currency reissued", formulaKm: "១៩៨០៖ ប្រាក់រៀលចេញជាថ្មី",
      chapter: "PRK & State of Cambodia (1979–1993)", chapterKm: "សាធារណរដ្ឋប្រជាមានិតកម្ពុជា និងរដ្ឋកម្ពុជា (១៩៧៩-១៩៩៣)" },
    { topic: "Post-1979 education slogan", topicKm: "ពាក្យស្លោកអប់រំក្រោយ១៩៧៩", difficulty: "Medium",
      prompt: "To rebuild the education system after 1979, despite a severe shortage of trained teachers, the government promoted which slogan?", promptKm: "ដើម្បីស្តារប្រព័ន្ធអប់រំឡើងវិញក្រោយឆ្នាំ១៩៧៩ ខណៈខ្វះគ្រូបណ្តុះបណ្តាលយ៉ាងធ្ងន់ធ្ងរ រដ្ឋាភិបាលបានលើកកម្ពស់ពាក្យស្លោកអ្វី?", options: ["\"Those who know more teach those who know less; those who know less teach those who know nothing\"", "\"Education is the enemy of the revolution\"", "\"Every citizen must learn French first\"", "\"Only city residents may attend school\""], answer: "\"Those who know more teach those who know less; those who know less teach those who know nothing\"",
      optionsKm: ["\"អ្នកចេះច្រើនបង្រៀនអ្នកចេះតិច អ្នកចេះតិចបង្រៀនអ្នកមិនចេះ\"", "\"ការអប់រំជាសត្រូវនៃបដិវត្តន៍\"", "\"ប្រជាពលរដ្ឋគ្រប់រូបត្រូវរៀនភាសាបារាំងជាមុនសិន\"", "\"មានតែអ្នកនៅទីក្រុងទេដែលអាចចូលរៀន\""], answerKm: "\"អ្នកចេះច្រើនបង្រៀនអ្នកចេះតិច អ្នកចេះតិចបង្រៀនអ្នកមិនចេះ\"",
      explanation: "With almost the entire pre-1975 teaching corps killed or scattered, the PRK relied on this slogan to rebuild education using whoever had any knowledge to pass on.", explanationKm: "ដោយសារគ្រូបង្រៀនស្ទើរតែទាំងអស់មុនឆ្នាំ១៩៧៥ត្រូវបានសម្លាប់ ឬខ្ចាត់ខ្ចាយ រដ្ឋាភិបាល PRK បានពឹងផ្អែកលើពាក្យស្លោកនេះ ដើម្បីស្តារការអប់រំដោយប្រើអ្នកណាដែលមានចំណេះដឹងបន្តិចបន្តួច។",
      formula: "Post-1979 education: \"those who know more teach those who know less\"", formulaKm: "អប់រំក្រោយ១៩៧៩៖ \"អ្នកចេះច្រើនបង្រៀនអ្នកចេះតិច\"",
      chapter: "PRK & State of Cambodia (1979–1993)", chapterKm: "សាធារណរដ្ឋប្រជាមានិតកម្ពុជា និងរដ្ឋកម្ពុជា (១៩៧៩-១៩៩៣)" },

    { topic: "1993 election", topicKm: "ការបោះឆ្នោត១៩៩៣", difficulty: "Easy",
      prompt: "The UN-organized general election that led to the second Kingdom of Cambodia was held in what year?", promptKm: "តើការបោះឆ្នោតទូទៅ ដែលរៀបចំដោយអង្គការសហប្រជាជាតិ និងនាំទៅដល់ព្រះរាជាណាចក្រកម្ពុជាទី២ ធ្វើឡើងនៅឆ្នាំណា?",
      options: ["1993", "1979", "1989", "1998"], answer: "1993",
      optionsKm: ["១៩៩៣", "១៩៧៩", "១៩៨៩", "១៩៩៨"], answerKm: "១៩៩៣",
      explanation: "The May 1993 election, organized by UNTAC, led to the founding of the second Kingdom of Cambodia.", explanationKm: "ការបោះឆ្នោតខែឧសភា ឆ្នាំ១៩៩៣ ដែលរៀបចំដោយ UNTAC បាននាំទៅដល់ការបង្កើតព្រះរាជាណាចក្រកម្ពុជាទី២។",
      formula: "Key fact: 1993 election → 2nd Kingdom of Cambodia", formulaKm: "ចំណុចសំខាន់៖ ការបោះឆ្នោត១៩៩៣ → ព្រះរាជាណាចក្រកម្ពុជាទី២",
      chapter: "Kingdom of Cambodia II (1993–present)", chapterKm: "ព្រះរាជាណាចក្រកម្ពុជាទី២ (១៩៩៣-បច្ចុប្បន្ន)" },
    { topic: "Two co-Prime Ministers", topicKm: "នាយករដ្ឋមន្ត្រីរួមពីរអង្គ", difficulty: "Medium",
      prompt: "After the 1993 election, Cambodia had two co-Prime Ministers. Who served as First Prime Minister?", promptKm: "ក្រោយការបោះឆ្នោត១៩៩៣ កម្ពុជាមាននាយករដ្ឋមន្ត្រីរួមពីរអង្គ។ តើនរណាបានធ្វើជានាយករដ្ឋមន្ត្រីទី១?",
      options: ["Norodom Ranariddh", "Hun Sen", "Heng Samrin", "Son Sann"], answer: "Norodom Ranariddh",
      optionsKm: ["នរោត្តម រណឫទ្ធិ", "ហ៊ុន សែន", "ហេង សំរិន", "សឺន សាន"], answerKm: "នរោត្តម រណឫទ្ធិ",
      explanation: "Norodom Ranariddh served as First Prime Minister and Hun Sen as Second Prime Minister in the coalition government formed after the 1993 election.", explanationKm: "នរោត្តម រណឫទ្ធិបានធ្វើជានាយករដ្ឋមន្ត្រីទី១ ហើយហ៊ុន សែនធ្វើជានាយករដ្ឋមន្ត្រីទី២ ក្នុងរដ្ឋាភិបាលចម្រុះដែលបង្កើតឡើងក្រោយការបោះឆ្នោត១៩៩៣។",
      formula: "Key fact: 1993 coalition = Ranariddh (1st PM) + Hun Sen (2nd PM)", formulaKm: "ចំណុចសំខាន់៖ រដ្ឋាភិបាល១៩៩៣ = រណឫទ្ធិ(នាយករដ្ឋមន្ត្រីទី១) + ហ៊ុនសែន(ទី២)",
      chapter: "Kingdom of Cambodia II (1993–present)", chapterKm: "ព្រះរាជាណាចក្រកម្ពុជាទី២ (១៩៩៣-បច្ចុប្បន្ន)" },
    { topic: "Founding of the second Kingdom", topicKm: "ការប្រកាសបង្កើតព្រះរាជាណាចក្រទី២", difficulty: "Medium",
      prompt: "The second Kingdom of Cambodia, with its new constitution and restored monarchy, was formally established on what date?", promptKm: "តើព្រះរាជាណាចក្រកម្ពុជាទី២ ដែលមានរដ្ឋធម្មនុញ្ញថ្មីនិងស្តាររាជានិយមឡើងវិញ ត្រូវបានបង្កើតឡើងជាផ្លូវការនៅថ្ងៃណា?",
      options: ["24 September 1993", "23 October 1991", "May 1993", "7 January 1979"], answer: "24 September 1993",
      optionsKm: ["២៤ កញ្ញា ១៩៩៣", "២៣ តុលា ១៩៩១", "ឧសភា ១៩៩៣", "៧ មករា ១៩៧៩"], answerKm: "២៤ កញ្ញា ១៩៩៣",
      explanation: "The election was held in May 1993, but the second Kingdom of Cambodia was formally proclaimed under its new constitution on 24 September 1993.", explanationKm: "ការបោះឆ្នោតធ្វើឡើងក្នុងខែឧសភា ១៩៩៣ ប៉ុន្តែព្រះរាជាណាចក្រកម្ពុជាទី២ត្រូវបានប្រកាសជាផ្លូវការក្រោមរដ្ឋធម្មនុញ្ញថ្មីនៅថ្ងៃទី២៤ ខែកញ្ញា ១៩៩៣។",
      formula: "Key fact: 2nd Kingdom proclaimed 24 Sept 1993", formulaKm: "ចំណុចសំខាន់៖ ព្រះរាជាណាចក្រទី២ ប្រកាស ២៤ កញ្ញា ១៩៩៣",
      chapter: "Kingdom of Cambodia II (1993–present)", chapterKm: "ព្រះរាជាណាចក្រកម្ពុជាទី២ (១៩៩៣-បច្ចុប្បន្ន)" },
    { topic: "Win-win policy", topicKm: "គោលនយោបាយឈ្នះ-ឈ្នះ", difficulty: "Medium",
      prompt: "Hun Sen's \"win-win\" policy, which integrated the last Khmer Rouge forces and ended Cambodia's civil war, was completed by the end of what year?", promptKm: "តើគោលនយោបាយ \"ឈ្នះ-ឈ្នះ\" របស់សម្តេចហ៊ុន សែន ដែលធ្វើសមាហរណកម្មកងកម្លាំងខ្មែរក្រហមចុងក្រោយ និងបញ្ចប់សង្គ្រាមស៊ីវិលកម្ពុជា បានបញ្ចប់នៅចុងឆ្នាំណា?",
      options: ["1998", "1979", "1991", "1993"], answer: "1998",
      optionsKm: ["១៩៩៨", "១៩៧៩", "១៩៩១", "១៩៩៣"], answerKm: "១៩៩៨",
      explanation: "By the end of 1998, the remaining Khmer Rouge forces had integrated into the government, ending decades of civil war.", explanationKm: "នៅចុងឆ្នាំ១៩៩៨ កងកម្លាំងខ្មែរក្រហមដែលនៅសេសសល់ត្រូវបានធ្វើសមាហរណកម្មចូលជាមួយរដ្ឋាភិបាល ដែលបញ្ចប់សង្គ្រាមស៊ីវិលរាប់ទសវត្សរ៍។",
      formula: "Key fact: Win-win policy completed, end of 1998", formulaKm: "ចំណុចសំខាន់៖ គោលនយោបាយឈ្នះ-ឈ្នះ បញ្ចប់ចុងឆ្នាំ១៩៩៨",
      chapter: "Kingdom of Cambodia II (1993–present)", chapterKm: "ព្រះរាជាណាចក្រកម្ពុជាទី២ (១៩៩៣-បច្ចុប្បន្ន)" },
    { topic: "Win-Win Monument", topicKm: "វិមានឈ្នះ-ឈ្នះ", difficulty: "Easy",
      prompt: "The \"Win-Win Monument,\" commemorating the end of Cambodia's civil war, was inaugurated on what date?", promptKm: "តើ\"វិមានឈ្នះ-ឈ្នះ\" ដែលចងចាំការបញ្ចប់សង្គ្រាមស៊ីវិលកម្ពុជា ត្រូវបានសម្ពោធនៅថ្ងៃណា?",
      options: ["29 December 2018", "29 December 1998", "24 September 1993", "23 October 1991"], answer: "29 December 2018",
      optionsKm: ["២៩ ធ្នូ ២០១៨", "២៩ ធ្នូ ១៩៩៨", "២៤ កញ្ញា ១៩៩៣", "២៣ តុលា ១៩៩១"], answerKm: "២៩ ធ្នូ ២០១៨",
      explanation: "The Win-Win Monument, built at Chroy Changvar in Phnom Penh at Hun Sen's initiative, was inaugurated on 29 December 2018.", explanationKm: "វិមានឈ្នះ-ឈ្នះ ដែលសាងសង់នៅជ្រោយចង្វារ ភ្នំពេញ តាមគំនិតផ្តួចផ្តើមរបស់សម្តេចហ៊ុន សែន ត្រូវបានសម្ពោធនៅថ្ងៃទី២៩ ខែធ្នូ ២០១៨។",
      formula: "Key fact: Win-Win Monument inaugurated 29 Dec 2018", formulaKm: "ចំណុចសំខាន់៖ វិមានឈ្នះ-ឈ្នះ សម្ពោធ ២៩ ធ្នូ ២០១៨",
      chapter: "Kingdom of Cambodia II (1993–present)", chapterKm: "ព្រះរាជាណាចក្រកម្ពុជាទី២ (១៩៩៣-បច្ចុប្បន្ន)" },
    { topic: "Cambodia joins the WTO", topicKm: "កម្ពុជាចូលជាសមាជិក WTO", difficulty: "Easy",
      prompt: "Alongside ASEAN, which major international trade organization did Cambodia join in the 2000s?", promptKm: "ក្រៅពីអាស៊ាន តើកម្ពុជាបានចូលជាសមាជិកអង្គការពាណិជ្ជកម្មអន្តរជាតិសំខាន់មួយណាទៀត ក្នុងទសវត្សរ៍២០០០?",
      options: ["World Trade Organization (WTO)", "European Union (EU)", "OPEC", "G7"], answer: "World Trade Organization (WTO)",
      optionsKm: ["អង្គការពាណិជ្ជកម្មពិភពលោក (WTO)", "សហភាពអឺរ៉ុប (EU)", "អូបិក (OPEC)", "ក្រុមប្រទេសឧស្សាហកម្ម G7"], answerKm: "អង្គការពាណិជ្ជកម្មពិភពលោក (WTO)",
      explanation: "Cambodia joined the World Trade Organization in the 2000s, opening its economy further to international trade.", explanationKm: "កម្ពុជាបានចូលជាសមាជិកអង្គការពាណិជ្ជកម្មពិភពលោកក្នុងទសវត្សរ៍២០០០ បើកទូលាយសេដ្ឋកិច្ចរបស់ខ្លួនកាន់តែច្រើនទៅកាន់ពាណិជ្ជកម្មអន្តរជាតិ។",
      formula: "Key fact: Cambodia joined WTO in the 2000s", formulaKm: "ចំណុចសំខាន់៖ កម្ពុជាចូល WTO ទសវត្សរ៍២០០០",
      chapter: "Kingdom of Cambodia II (1993–present)", chapterKm: "ព្រះរាជាណាចក្រកម្ពុជាទី២ (១៩៩៣-បច្ចុប្បន្ន)" },
    { topic: "UNESCO World Heritage sites", topicKm: "បេតិកភណ្ឌពិភពលោក", difficulty: "Easy",
      prompt: "Which two Cambodian sites are listed as UNESCO World Heritage sites?", promptKm: "តើទីតាំងខ្មែរពីរណាខ្លះត្រូវបានចុះបញ្ជីជាបេតិកភណ្ឌពិភពលោករបស់អង្គការយូណេស្កូ?",
      options: ["Angkor and Preah Vihear Temple", "Kep and Kampot", "Tonle Sap and Mekong River", "Sihanoukville and Koh Rong"], answer: "Angkor and Preah Vihear Temple",
      optionsKm: ["អង្គរ និងប្រាសាទព្រះវិហារ", "កែប និងកំពត", "ទន្លេសាប និងទន្លេមេគង្គ", "ក្រុងព្រះសីហនុ និងកោះរ៉ុង"], answerKm: "អង្គរ និងប្រាសាទព្រះវិហារ",
      explanation: "Angkor and Preah Vihear Temple are both listed as UNESCO World Heritage sites, recognized for their outstanding cultural and historical value.", explanationKm: "អង្គរ និងប្រាសាទព្រះវិហារ ត្រូវបានចុះបញ្ជីជាបេតិកភណ្ឌពិភពលោករបស់អង្គការយូណេស្កូ ដោយទទួលស្គាល់តម្លៃវប្បធម៌និងប្រវត្តិសាស្ត្រពិសេស។",
      formula: "Key fact: Angkor + Preah Vihear = UNESCO World Heritage", formulaKm: "ចំណុចសំខាន់៖ អង្គរ + ព្រះវិហារ = បេតិកភណ្ឌពិភពលោក",
      chapter: "Kingdom of Cambodia II (1993–present)", chapterKm: "ព្រះរាជាណាចក្រកម្ពុជាទី២ (១៩៩៣-បច្ចុប្បន្ន)" },
    { topic: "Cambodian peacekeepers abroad", topicKm: "កងទ័ពមួកខៀវខ្មែរនៅក្រៅប្រទេស", difficulty: "Medium",
      prompt: "Since the 2000s, Cambodia has sent its own soldiers on UN peacekeeping missions abroad. What is this Cambodian peacekeeping contingent commonly called?", promptKm: "ចាប់ពីទសវត្សរ៍២០០០ កម្ពុជាបានចាត់ទាហានផ្ទាល់ខ្លួនទៅបំពេញបេសកកម្មរក្សាសន្តិភាពរបស់អង្គការសហប្រជាជាតិនៅក្រៅប្រទេស។ តើកងទ័ពនេះត្រូវបានគេហៅថាអ្វី?",
      options: ["Blue Helmet troops", "Green Beret troops", "White Guard troops", "Red Cross troops"], answer: "Blue Helmet troops",
      optionsKm: ["កងទ័ពមួកខៀវ", "កងទ័ពមួកបៃតង", "កងឆ្មាំស", "កងឆ្កាងក្រហម"], answerKm: "កងទ័ពមួកខៀវ",
      explanation: "Cambodia's UN peacekeeping soldiers are called \"Blue Helmet troops,\" after the standard blue helmets worn by UN peacekeepers worldwide.", explanationKm: "ទាហានរក្សាសន្តិភាពរបស់កម្ពុជាត្រូវបានហៅថា\"កងទ័ពមួកខៀវ\" តាមមួកខៀវស្តង់ដារដែលទាហានរក្សាសន្តិភាពអង្គការសហប្រជាជាតិពាក់ទូទាំងពិភពលោក។",
      formula: "Key fact: Cambodia's UN peacekeepers = \"Blue Helmet troops\"", formulaKm: "ចំណុចសំខាន់៖ ទាហានរក្សាសន្តិភាពខ្មែរ = \"កងទ័ពមួកខៀវ\"",
      chapter: "Kingdom of Cambodia II (1993–present)", chapterKm: "ព្រះរាជាណាចក្រកម្ពុជាទី២ (១៩៩៣-បច្ចុប្បន្ន)" },
    { topic: "Second Prime Minister 1993", topicKm: "នាយករដ្ឋមន្ត្រីទី២ ១៩៩៣", difficulty: "Medium",
      prompt: "After the 1993 election, who served as Second Prime Minister alongside First Prime Minister Norodom Ranariddh?", promptKm: "ក្រោយការបោះឆ្នោត១៩៩៣ តើនរណាបានធ្វើជានាយករដ្ឋមន្ត្រីទី២ រួមជាមួយនាយករដ្ឋមន្ត្រីទី១ នរោត្តម រណឫទ្ធិ?", options: ["Hun Sen", "Son Sann", "Heng Samrin", "Chea Sim"], answer: "Hun Sen",
      optionsKm: ["ហ៊ុន សែន", "សឺន សាន", "ហេង សំរិន", "ជា ស៊ីម"], answerKm: "ហ៊ុន សែន",
      explanation: "The 1993 coalition government installed two co-Prime Ministers: Norodom Ranariddh as First Prime Minister and Hun Sen as Second Prime Minister, balancing FUNCINPEC and the Cambodian People's Party.", explanationKm: "រដ្ឋាភិបាលចម្រុះឆ្នាំ១៩៩៣ បានតែងតាំងនាយករដ្ឋមន្ត្រីរួមពីរអង្គ៖ នរោត្តម រណឫទ្ធិ ជានាយករដ្ឋមន្ត្រីទី១ និងហ៊ុន សែន ជានាយករដ្ឋមន្ត្រីទី២ ធ្វើតុល្យភាពរវាងហ្វុងសិនប៉ិច និងគណបក្សប្រជាជនកម្ពុជា។",
      formula: "1993: PM1 = Ranariddh, PM2 = Hun Sen", formulaKm: "១៩៩៣៖ នាយក១ = រណឫទ្ធិ, នាយក២ = ហ៊ុនសែន",
      chapter: "Kingdom of Cambodia II (1993–present)", chapterKm: "ព្រះរាជាណាចក្រកម្ពុជាទី២ (១៩៩៣-បច្ចុប្បន្ន)" },
    { topic: "Development strategies", topicKm: "យុទ្ធសាស្ត្រអភិវឌ្ឍន៍", difficulty: "Hard",
      prompt: "After 1998, the government pursued national development first through a \"Triangle Strategy\" and later through which follow-up strategy?", promptKm: "ក្រោយឆ្នាំ១៩៩៨ រាជរដ្ឋាភិបាលបានអនុវត្តយុទ្ធសាស្ត្រអភិវឌ្ឍន៍ជាតិដំបូងតាមរយៈ \"យុទ្ធសាស្ត្រត្រីកោណ\" និងក្រោយមកតាមរយៈយុទ្ធសាស្ត្រអ្វី?", options: ["\"Rectangular Strategy\"", "\"Circular Strategy\"", "\"Pentagon Strategy\"", "\"Diamond Strategy\""], answer: "\"Rectangular Strategy\"",
      optionsKm: ["\"យុទ្ធសាស្ត្រចតុកោណ\"", "\"យុទ្ធសាស្ត្ររង្វង់\"", "\"យុទ្ធសាស្ត្របញ្ចកោណ\"", "\"យុទ្ធសាស្ត្រពេជ្រ\""], answerKm: "\"យុទ្ធសាស្ត្រចតុកោណ\"",
      explanation: "The government's Triangle Strategy (security, integration, development) was followed by the Rectangular Strategy focused on good governance, agriculture, private-sector growth and infrastructure.", explanationKm: "យុទ្ធសាស្ត្រត្រីកោណរបស់រាជរដ្ឋាភិបាល (សន្តិសុខ សមាហរណកម្ម អភិវឌ្ឍន៍) ត្រូវបានបន្តដោយយុទ្ធសាស្ត្រចតុកោណ ដែលផ្តោតលើអភិបាលកិច្ចល្អ កសិកម្ម ការរីកចម្រើនវិស័យឯកជន និងហេដ្ឋារចនាសម្ព័ន្ធ។",
      formula: "Triangle Strategy → Rectangular Strategy", formulaKm: "យុទ្ធសាស្ត្រត្រីកោណ → យុទ្ធសាស្ត្រចតុកោណ",
      chapter: "Kingdom of Cambodia II (1993–present)", chapterKm: "ព្រះរាជាណាចក្រកម្ពុជាទី២ (១៩៩៣-បច្ចុប្បន្ន)" },
    { topic: "Significance of UNESCO listing", topicKm: "សារៈសំខាន់នៃការចុះបញ្ជីយូណេស្កូ", difficulty: "Medium",
      prompt: "Beyond national pride, what is one practical benefit Cambodia gains from having Angkor and Preah Vihear listed as UNESCO World Heritage sites?", promptKm: "ក្រៅពីមោទនភាពជាតិ តើផលប្រយោជន៍ជាក់ស្តែងមួយណា ដែលកម្ពុជាទទួលបានពីការដាក់អង្គរ និងព្រះវិហារក្នុងបញ្ជីបេតិកភណ្ឌពិភពលោករបស់យូណេស្កូ?", options: ["International technical and financial support for preserving the sites, plus tourism revenue", "Automatic membership in the United Nations Security Council", "Exemption from all international treaties", "Full military protection guaranteed by UNESCO"], answer: "International technical and financial support for preserving the sites, plus tourism revenue",
      optionsKm: ["ការគាំទ្រផ្នែកបច្ចេកទេស និងហិរញ្ញវត្ថុអន្តរជាតិសម្រាប់ថែរក្សា ព្រមទាំងចំណូលពីទេសចរណ៍", "ការចូលជាសមាជិកក្រុមប្រឹក្សាសន្តិសុខ អ.ស.ប ដោយស្វ័យប្រវត្តិ", "ការលើកលែងពីកិច្ចព្រមព្រៀងអន្តរជាតិទាំងអស់", "ការធានាការពារយោធាពេញលេញពីយូណេស្កូ"], answerKm: "ការគាំទ្រផ្នែកបច្ចេកទេស និងហិរញ្ញវត្ថុអន្តរជាតិសម្រាប់ថែរក្សា ព្រមទាំងចំណូលពីទេសចរណ៍",
      explanation: "UNESCO listing brings international technical and financial assistance for conservation and drives tourism revenue that benefits local communities and the national economy.", explanationKm: "ការចុះបញ្ជីយូណេស្កូនាំមកនូវជំនួយបច្ចេកទេស និងហិរញ្ញវត្ថុអន្តរជាតិសម្រាប់ការអភិរក្ស ព្រមទាំងជំរុញចំណូលទេសចរណ៍ដែលផ្តល់ផលប្រយោជន៍ដល់សហគមន៍មូលដ្ឋាន និងសេដ្ឋកិច្ចជាតិ។",
      formula: "UNESCO listing → technical/financial aid + tourism revenue", formulaKm: "ការចុះបញ្ជីយូណេស្កូ → ជំនួយបច្ចេកទេស/ហិរញ្ញវត្ថុ + ចំណូលទេសចរណ៍",
      chapter: "Kingdom of Cambodia II (1993–present)", chapterKm: "ព្រះរាជាណាចក្រកម្ពុជាទី២ (១៩៩៣-បច្ចុប្បន្ន)" },
  ],
  Geography: [
    { topic: "Rivers", topicKm: "ទន្លេ", difficulty: "Easy",
      prompt: "What is the longest river in Cambodia?", promptKm: "តើទន្លេណាវែងជាងគេនៅកម្ពុជា?",
      options: ["Mekong", "Tonle Sap", "Bassac", "Sen"], answer: "Mekong",
      optionsKm: ["មេគង្គ", "ទន្លេសាប", "បាសាក់", "សែន"], answerKm: "មេគង្គ",
      explanation: "The Mekong is the longest river flowing through Cambodia.", explanationKm: "ទន្លេមេគង្គជាទន្លេវែងជាងគេដែលហូរកាត់កម្ពុជា។",
      formula: "Key fact: the Mekong dominates Cambodia's river system", formulaKm: "ចំណុចសំខាន់៖ ទន្លេមេគង្គគ្របដណ្តប់ប្រព័ន្ធទន្លេកម្ពុជា" },
    { topic: "Landforms", topicKm: "ភូមិសណ្ឋាន", difficulty: "Easy",
      prompt: "The Tonle Sap is a ___.", promptKm: "បឹងទន្លេសាបជា ___ មួយ។",
      options: ["lake", "mountain", "desert", "ocean"], answer: "lake",
      optionsKm: ["បឹង", "ភ្នំ", "វាលខ្សាច់", "មហាសមុទ្រ"], answerKm: "បឹង",
      explanation: "The Tonle Sap is the largest freshwater lake in Southeast Asia.", explanationKm: "បឹងទន្លេសាបជាបឹងទឹកសាបធំជាងគេនៅអាស៊ីអាគ្នេយ៍។",
      formula: "Key fact: Tonle Sap = freshwater lake", formulaKm: "ចំណុចសំខាន់៖ ទន្លេសាប = បឹងទឹកសាប" },
  ],
  Morality: [
    { topic: "Civics", topicKm: "សីលធម៌ពលរដ្ឋ", difficulty: "Easy",
      prompt: "Which of these is a civic duty of a good citizen?", promptKm: "តើមួយណាខាងក្រោមជាកាតព្វកិច្ចរបស់ប្រជាពលរដ្ឋល្អ?",
      options: ["Respecting the law", "Littering", "Avoiding taxes", "Ignoring elections"], answer: "Respecting the law",
      optionsKm: ["ការគោរពច្បាប់", "ការចោលសម្រាមមិនមានទីតាំង", "ការគេចវេះពន្ធ", "ការមិនអើពើការបោះឆ្នោត"], answerKm: "ការគោរពច្បាប់",
      explanation: "Respecting and obeying the law is a core civic responsibility.", explanationKm: "ការគោរព និងអនុវត្តច្បាប់ជាការទទួលខុសត្រូវសំខាន់របស់ពលរដ្ឋ។",
      formula: "Key concept: rights come with responsibilities", formulaKm: "គោលគំនិតសំខាន់៖ សិទ្ធិមកជាមួយការទទួលខុសត្រូវ" },
    { topic: "Civics", topicKm: "សីលធម៌ពលរដ្ឋ", difficulty: "Easy",
      prompt: "What is the voting age in Cambodia?", promptKm: "តើអាយុសម្រាប់បោះឆ្នោតនៅកម្ពុជាចាប់ពីអាយុប៉ុន្មាន?",
      options: ["18", "16", "21", "25"], answer: "18",
      optionsKm: ["១៨", "១៦", "២១", "២៥"], answerKm: "១៨",
      explanation: "Cambodian citizens may vote from the age of 18.", explanationKm: "ប្រជាពលរដ្ឋកម្ពុជាអាចបោះឆ្នោតបានចាប់ពីអាយុ ១៨ឆ្នាំ។",
      formula: "Key fact: voting age in Cambodia is 18", formulaKm: "ចំណុចសំខាន់៖ អាយុបោះឆ្នោតនៅកម្ពុជាគឺ ១៨ឆ្នាំ" },
  ],
  "Earth Science": [
    { topic: "Structure of Earth", topicKm: "រចនាសម្ព័ន្ធផែនដី", difficulty: "Easy",
      prompt: "What is Earth's outermost solid layer called?", promptKm: "តើស្រទាប់រឹងខាងក្រៅបំផុតរបស់ផែនដីមានឈ្មោះថាអ្វី?",
      options: ["Crust", "Mantle", "Outer core", "Magma"], answer: "Crust",
      optionsKm: ["សែល", "ស្រទាប់កណ្តាល", "ស្នូលខាងក្រៅ", "ម៉ាហ្គម៉ា"], answerKm: "សែល",
      explanation: "The crust is the thin, solid outermost layer of the Earth.", explanationKm: "សែលផែនដីជាស្រទាប់រឹងស្តើងនៅខាងក្រៅបំផុតរបស់ផែនដី។",
      formula: "Key concept: crust → mantle → outer core → inner core", formulaKm: "គោលគំនិតសំខាន់៖ សែល → ស្រទាប់កណ្តាល →ស្នូលខាងក្រៅ → ស្នូលខាងក្នុង" },
    { topic: "Geology", topicKm: "ភូគព្ភវិទ្យា", difficulty: "Medium",
      prompt: "Earthquakes are mainly caused by ___.", promptKm: "រញ្ជួយដីកើតឡើងភាគច្រើនដោយសារ ___។",
      options: ["tectonic plate movement", "heavy rain", "strong wind", "ocean tides"], answer: "tectonic plate movement",
      optionsKm: ["ចលនាបន្ទះតិចតូនិច", "ភ្លៀងខ្លាំង", "ខ្យល់ព្យុះខ្លាំង", "ជំនោរសមុទ្រ"], answerKm: "ចលនាបន្ទះតិចតូនិច",
      explanation: "Most earthquakes happen when tectonic plates shift along faults.", explanationKm: "រញ្ជួយដីភាគច្រើនកើតឡើងនៅពេលបន្ទះតិចតូនិចផ្លាស់ទីតាមបណ្តោយស្នាមប្រេះ។",
      formula: "Key concept: plate tectonics drive earthquakes", formulaKm: "គោលគំនិតសំខាន់៖ តិចតូនិចបន្ទះជាមូលហេតុនៃរញ្ជួយដី" },
  ],
};

/* Canonical (English) topic key → Khmer display label, built once from the data above. Internal
   tracking (topicMastery, SUBJECT_TOPICS, weak/strong subject lookups) always keys on the English
   topic string; only rendered UI text goes through topicLabel(). */
const TOPIC_LABEL_KM = {};
Object.values(RAW_EXERCISES).flat().forEach((r) => { if (r.topicKm) TOPIC_LABEL_KM[r.topic] = r.topicKm; });
// University quiz topics (UNI_QUIZ_BANK) are deliberately English-only — no topicKm to register
// here — so topicLabel() falls through to returning the raw English topic even in Khmer mode.
const topicLabel = (topic, lang) => (lang === "km" ? (TOPIC_LABEL_KM[topic] ?? topic) : topic);

/* Same pattern as topicLabel(), one level up: the canonical (English) subject name is the key
   used everywhere a subject is tracked or matched (FIELD_SUBJECTS, topicMastery, deriveInsights'
   weak/strong lists, the exercise bank) — only subjectLabel() changes what's shown on screen. */
const SUBJECT_LABEL_KM = {
  Mathematics: "គណិតវិទ្យា", Physics: "រូបវិទ្យា", Chemistry: "គីមីវិទ្យា", Biology: "ជីវវិទ្យា",
  "Khmer Literature": "អក្សរសាស្ត្រខ្មែរ", History: "ប្រវត្តិវិទ្យា", English: "ភាសាអង់គ្លេស", French: "ភាសាបារាំង",
  Geography: "ភូមិវិទ្យា", Morality: "សីលធម៌ពលរដ្ឋវិទ្យា", "Earth Science": "ផែនដីវិទ្យា",
};
const subjectLabel = (subject, lang) => (lang === "km" ? (SUBJECT_LABEL_KM[subject] ?? subject) : subject);
// "BAC II" is the official exam's Latin-script name — most Khmer education sites and documents
// still write it that way, but Bondus's own Khmer copy uses the transliteration.
const bacIILabel = (lang) => (lang === "km" ? "បាក់ឌុប" : "BAC II");

const KHMER_DIGITS = ["០", "១", "២", "៣", "៤", "៥", "៦", "៧", "៨", "៩"];
// Converts any number/digit-string to Khmer numerals when lang is "km"; passes through
// unchanged (and non-km languages) otherwise, so callers can wrap any plain number for display.
const localizeNum = (n, lang) => (lang === "km" ? String(n).replace(/[0-9]/g, (d) => KHMER_DIGITS[d]) : String(n));

const EXERCISE_BANK_RAW = RAW_EXERCISES;
function getExercises(subject, lang = "en") {
  const list = EXERCISE_BANK_RAW[subject] || [];
  return list.map((r, i) => ({
    id: `${subject}-${i + 1}`, subject, topic: r.topic, difficulty: r.difficulty,
    prompt: lang === "km" ? (r.promptKm || r.prompt) : r.prompt,
    options: lang === "km" && r.optionsKm ? r.optionsKm : r.options,
    answer: lang === "km" && r.answerKm ? r.answerKm : r.answer,
    explanation: lang === "km" ? (r.explanationKm || r.explanation) : r.explanation,
    formula: lang === "km" ? (r.formulaKm || r.formula) : r.formula,
    // Only subjects whose bank entries carry a chapter (currently History) get grouped into a
    // chapter-picker step in PracticeSubject; everything else is unaffected (chapter stays undefined).
    chapter: lang === "km" ? (r.chapterKm || r.chapter) : r.chapter,
  }));
}
const gradeAnswer = (ex, val) => val != null && String(val).trim().toLowerCase() === String(ex.answer).trim().toLowerCase();

/* Topic taxonomy per subject, derived from the exercise bank (canonical English topics) — this is
   what the diagnostic test, adaptive practice, and per-topic mastery tracking all key off. */
const SUBJECT_TOPICS = Object.fromEntries(
  Object.entries(RAW_EXERCISES).map(([subject, list]) => [subject, [...new Set(list.map((e) => e.topic))]])
);

const STATUS = {
  pending: { label: "Pending", color: "var(--muted)", soft: "var(--bg-soft)", icon: Circle },
  in_progress: { label: "In progress", color: "var(--gold)", soft: "var(--gold-soft)", icon: Clock },
  completed: { label: "Completed", color: "var(--jade)", soft: "var(--jade-soft)", icon: CheckCircle2 },
};
const diffColor = (d) => (d === "Hard" ? "var(--ember)" : d === "Medium" ? "var(--gold)" : "var(--jade)");

function StatusControl({ status, onChange, lang = "en" }) {
  return (
    <div className="flex gap-1 flex-shrink-0">
      {Object.entries(STATUS).map(([key, s]) => {
        const on = (status || "pending") === key;
        const label = t(lang, `status_${key}`);
        return (
          <button key={key} onClick={(e) => { e.stopPropagation(); onChange(key); }}
            className="eai-btn eai-focus text-xs px-2 py-1 flex items-center gap-1"
            title={label}
            style={{ background: on ? s.soft : "transparent", color: on ? s.color : "var(--muted)", border: `1px solid ${on ? s.color : "var(--line)"}` }}>
            <s.icon size={12} /><span className={`hidden md:inline ${lang === "km" ? "eai-km" : ""}`}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

function Practice({ p, practice, onAnswer, onSetStatus, lang = "en" }) {
  const [subject, setSubject] = useState(null);
  if (subject) return <PracticeSubject p={p} subject={subject} practice={practice} onAnswer={onAnswer} onSetStatus={onSetStatus} onBack={() => setSubject(null)} lang={lang} />;

  return (
    <div className="space-y-5 eai-rise">
      <div>
        <h2 className={`eai-display text-2xl font-extrabold ${lang === "km" ? "eai-km" : ""}`}>{t(lang, "practiceTitle")}</h2>
        <p className={`eai-muted text-sm mt-1 ${lang === "km" ? "eai-km" : ""}`}>{t(lang, "practiceDesc")}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {FIELD_SUBJECTS[p.field].map((s) => {
          const list = getExercises(s, lang);
          const doneN = list.filter((ex) => practice[ex.id]?.status === "completed").length;
          const pct = list.length ? Math.round((doneN / list.length) * 100) : 0;
          const isWeak = p.weak.some((w) => w.s === s);
          return (
            <button key={s} onClick={() => setSubject(s)} className="eai-card eai-tile eai-focus p-5 text-left">
              <div className="flex items-center justify-between">
                <div className="grid place-items-center rounded-xl" style={{ width: 40, height: 40, background: "var(--primary-soft)" }}>
                  <Target size={19} style={{ color: "var(--primary)" }} />
                </div>
                {isWeak && <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${lang === "km" ? "eai-km" : ""}`} style={{ background: "var(--ember-soft)", color: "var(--ember)" }}>{t(lang, "focusArea")}</span>}
              </div>
              <h3 className={`eai-display font-bold mt-3 ${lang === "km" ? "eai-km" : ""}`}>{subjectLabel(s, lang)}</h3>
              <p className={`text-xs eai-muted mt-0.5 ${lang === "km" ? "eai-km" : ""}`}>{list.length} {t(lang, "exercisesAutoGraded")}</p>
              <div className="h-1.5 rounded-full eai-soft mt-3 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "var(--jade)" }} />
              </div>
              <p className={`text-xs eai-muted mt-1.5 ${lang === "km" ? "eai-km" : ""}`}>{doneN}/{list.length} {t(lang, "completedWord")}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PracticeSubject({ p, subject, practice, onAnswer, onSetStatus, onBack, lang = "en" }) {
  const fullList = getExercises(subject, lang);
  // Subjects whose bank entries carry a chapter (currently only History) get an extra
  // chapter-picker step before the exercise list; every other subject is unaffected.
  const hasChapters = fullList.some((ex) => ex.chapter);
  const chapters = hasChapters ? [...new Set(fullList.map((ex) => ex.chapter))] : [];
  const [chapter, setChapter] = useState(null);
  const list = hasChapters ? fullList.filter((ex) => ex.chapter === chapter) : fullList;
  const [idx, setIdx] = useState(null);
  const backToList = hasChapters && chapter != null ? () => setChapter(null) : onBack;

  // ── Adaptive difficulty (session-only): 3 correct in a row steps up, 2 wrong in a row steps
  // down, and missing the same topic twice nudges the student to review it. ──
  const subjectLevel = p.subjects.find((s) => s.s === subject)?.level;
  const [tier, setTier] = useState(() => levelToDifficulty(subjectLevel));
  const [streak, setStreak] = useState(0);
  const [topicMisses, setTopicMisses] = useState({});
  const [banner, setBanner] = useState(null);
  useEffect(() => { if (!banner) return; const t = setTimeout(() => setBanner(null), 5000); return () => clearTimeout(t); }, [banner]);

  // Recently-shown exercise ids (most recent last) — with a small bank per subject, always
  // deterministically picking the "first" same-tier candidate made practice bounce back and
  // forth between just two questions the moment only two matched the current tier. Preferring
  // whatever hasn't been seen lately (and picking randomly among ties) fixes that without
  // needing a bigger question bank.
  const [seenIds, setSeenIds] = useState([]);
  useEffect(() => {
    if (idx == null || !list[idx]) return;
    setSeenIds((prev) => {
      const id = list[idx].id;
      if (prev[prev.length - 1] === id) return prev;
      return [...prev, id].slice(-Math.max(1, list.length - 1));
    });
  }, [idx, subject, lang]);

  const pickNext = (fromIdx) => {
    const candidates = list.map((ex, i) => ({ ex, i })).filter(({ i }) => i !== fromIdx);
    if (!candidates.length) return null;
    const sameTier = candidates.filter(({ ex }) => ex.difficulty === tier);
    const pool = sameTier.length ? sameTier : candidates;
    const unseen = pool.filter(({ ex }) => !seenIds.includes(ex.id));
    const finalPool = unseen.length ? unseen : pool;
    return finalPool[Math.floor(Math.random() * finalPool.length)].i;
  };

  const handleResult = (ex, correct) => {
    const nextStreak = correct ? Math.max(1, streak + 1) : Math.min(-1, streak - 1);
    const topicShown = topicLabel(ex.topic, lang);
    if (nextStreak >= 3 && tier !== "Hard") {
      const newTier = tier === "Easy" ? "Medium" : "Hard";
      setTier(newTier); setStreak(0);
      setBanner({ text: lang === "km" ? `និន្នាការល្អ — កំពុងឡើងទៅសំណួរកម្រិត ${newTier}។` : `Nice streak — stepping up to ${newTier} questions.`, tone: "jade" });
    } else if (nextStreak <= -2 && tier !== "Easy") {
      const newTier = tier === "Hard" ? "Medium" : "Easy";
      setTier(newTier); setStreak(0);
      setBanner({ text: lang === "km" ? `តោះបន្ធូរទៅសំណួរកម្រិត ${newTier}វិញ។` : `Let's ease back to ${newTier} questions.`, tone: "gold" });
    } else {
      setStreak(nextStreak);
    }
    const missCount = correct ? 0 : (topicMisses[ex.topic] || 0) + 1;
    setTopicMisses((m) => ({ ...m, [ex.topic]: missCount }));
    if (!correct && missCount >= 2) setBanner({ text: lang === "km" ? `អ្នកខកខាន ${topicShown} ពីរដងជាប់គ្នា — សូមពិនិត្យការពន្យល់ដោយប្រុងប្រយ័ត្នមុននឹងសាកល្បងម្តងទៀត។` : `You've missed ${topicShown} twice in a row — review the explanation carefully before trying again.`, tone: "ember" });
  };

  if (idx != null && list[idx]) {
    return (
      <ExercisePlayer ex={list[idx]} entry={practice[list[idx].id]} subject={subject} index={idx} total={list.length} tier={tier} banner={banner}
        onAnswer={(ex, result, meta) => { onAnswer(ex, result, meta); handleResult(ex, result === "correct"); }}
        onSetStatus={onSetStatus} onBack={() => setIdx(null)}
        onNext={list.length > 1 ? () => setIdx(pickNext(idx)) : null} lang={lang} glass />
    );
  }

  if (hasChapters && chapter == null) {
    return (
      <div className="space-y-5 eai-rise">
        <button onClick={onBack} className={`eai-focus flex items-center gap-1 text-sm eai-muted ${lang === "km" ? "eai-km" : ""}`}><ChevronLeft size={16} /> {t(lang, "allSubjects")}</button>
        <div>
          <h2 className={`eai-display text-2xl font-extrabold ${lang === "km" ? "eai-km" : ""}`}>{subjectLabel(subject, lang)}</h2>
          <p className={`eai-muted text-sm mt-1 ${lang === "km" ? "eai-km" : ""}`}>{t(lang, "chooseChapterDesc")}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {chapters.map((ch) => {
            const chList = fullList.filter((ex) => ex.chapter === ch);
            const doneN = chList.filter((ex) => practice[ex.id]?.status === "completed").length;
            const pct = chList.length ? Math.round((doneN / chList.length) * 100) : 0;
            return (
              <button key={ch} onClick={() => setChapter(ch)} className="eai-card eai-tile eai-focus p-5 text-left">
                <div className="flex items-center justify-between">
                  <div className="grid place-items-center rounded-xl" style={{ width: 40, height: 40, background: "var(--primary-soft)" }}>
                    <BookOpen size={19} style={{ color: "var(--primary)" }} />
                  </div>
                  <Ring value={pct} size={44} color="var(--jade)"><span className="eai-display font-bold" style={{ fontSize: 10 }}>{pct}%</span></Ring>
                </div>
                <h3 className={`eai-display font-bold mt-3 ${lang === "km" ? "eai-km" : ""}`}>{ch}</h3>
                <p className={`text-xs eai-muted mt-0.5 ${lang === "km" ? "eai-km" : ""}`}>{chList.length} {t(lang, "exercisesWord")} · {doneN} {t(lang, "completedWord")}</p>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const doneN = list.filter((ex) => practice[ex.id]?.status === "completed").length;
  const pct = list.length ? Math.round((doneN / list.length) * 100) : 0;

  return (
    <div className="space-y-5 eai-rise">
      <button onClick={backToList} className={`eai-focus flex items-center gap-1 text-sm eai-muted ${lang === "km" ? "eai-km" : ""}`}><ChevronLeft size={16} /> {hasChapters ? t(lang, "allChapters") : t(lang, "allSubjects")}</button>
      <div className="eai-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className={`eai-display text-2xl font-extrabold ${lang === "km" ? "eai-km" : ""}`}>{hasChapters ? chapter : subjectLabel(subject, lang)}</h2>
            <p className={`eai-muted text-sm mt-0.5 ${lang === "km" ? "eai-km" : ""}`}>{list.length} {t(lang, "exercisesWord")} · {doneN} {t(lang, "completedWord")}</p>
          </div>
          <Ring value={pct} size={60} color="var(--jade)"><span className="eai-display font-bold text-xs">{pct}%</span></Ring>
        </div>
      </div>

      <div className="space-y-3">
        {list.map((ex, i) => {
          const entry = practice[ex.id];
          const st = STATUS[entry?.status || "pending"];
          return (
            <div key={ex.id} className="eai-card p-4 flex flex-wrap items-center gap-3">
              <div className="grid place-items-center rounded-xl flex-shrink-0 eai-display font-bold" style={{ width: 36, height: 36, background: "var(--bg-soft)", color: "var(--muted)" }}>{i + 1}</div>
              <div className="min-w-0 flex-1" style={{ minWidth: 180 }}>
                <p className="text-sm font-semibold truncate">{ex.prompt}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full eai-soft eai-muted ${lang === "km" ? "eai-km" : ""}`}>{topicLabel(ex.topic, lang)}</span>
                  <span className="text-xs font-semibold" style={{ color: diffColor(ex.difficulty) }}>{ex.difficulty}</span>
                  <span className={`text-xs font-semibold flex items-center gap-1 ${lang === "km" ? "eai-km" : ""}`} style={{ color: st.color }}><st.icon size={12} /> {lang === "km" ? t(lang, `status_${entry?.status || "pending"}`) : st.label}</span>
                </div>
              </div>
              <StatusControl status={entry?.status} onChange={(s) => onSetStatus(ex, s)} lang={lang} />
              <button onClick={() => setIdx(i)} className={`eai-btn eai-focus text-sm py-2 px-4 text-white flex items-center gap-1.5 flex-shrink-0 ${lang === "km" ? "eai-km" : ""}`} style={{ background: "var(--primary)" }}>
                {entry?.status === "completed" ? t(lang, "reviewWord") : t(lang, "solveWord")} <ChevronRight size={15} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ExercisePlayer({ ex, entry, subject, index, total, tier, banner, onAnswer, onSetStatus, onBack, onNext, lang = "en", glass = false }) {
  const [choice, setChoice] = useState(null);
  const [phase, setPhase] = useState("answering"); // answering | mistake | result
  const isMcq = Array.isArray(ex.options);
  const submitted = phase !== "answering";
  const correct = submitted && gradeAnswer(ex, choice);
  const startRef = useRef(Date.now());
  const pendingTimeRef = useRef(0);

  const submit = () => {
    if (choice == null || String(choice).trim() === "") return;
    const isCorrect = gradeAnswer(ex, choice);
    const timeSec = Math.round((Date.now() - startRef.current) / 100) / 10;
    if (isCorrect) { onAnswer(ex, "correct", { timeSec }); setPhase("result"); }
    else { pendingTimeRef.current = timeSec; setPhase("mistake"); }
  };
  const chooseMistake = (mistakeType) => { onAnswer(ex, "incorrect", { timeSec: pendingTimeRef.current, mistakeType }); setPhase("result"); };
  const retry = () => { setPhase("answering"); setChoice(null); startRef.current = Date.now(); };
  const next = () => { retry(); onNext?.(); };

  return (
    <div className="space-y-5 eai-rise">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className={`eai-focus flex items-center gap-1 text-sm eai-muted ${lang === "km" ? "eai-km" : ""}`}><ChevronLeft size={16} /> {subjectLabel(subject, lang)}</button>
        <span className={`text-xs eai-muted ${lang === "km" ? "eai-km" : ""}`}>{t(lang, "exerciseXofY").replace("{i}", index + 1).replace("{n}", total)}</span>
      </div>

      {banner && (
        <div className="eai-rise flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold" style={{ background: `var(--${banner.tone}-soft)`, color: `var(--${banner.tone})` }}>
          <Sparkles size={15} /> {banner.text}
        </div>
      )}

      <div className="eai-card p-6">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded-full eai-soft eai-muted ${lang === "km" ? "eai-km" : ""}`}>{topicLabel(ex.topic, lang)}</span>
            <span className="text-xs font-semibold" style={{ color: diffColor(ex.difficulty) }}>{ex.difficulty}</span>
            {tier && <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${lang === "km" ? "eai-km" : ""}`} style={{ background: "var(--primary-soft)", color: "var(--primary)" }}>🎯 {t(lang, "adaptiveWord")}: {tier}</span>}
          </div>
          <StatusControl status={entry?.status} onChange={(s) => onSetStatus(ex, s)} lang={lang} />
        </div>

        <h3 className="eai-display text-lg font-bold mb-5">{ex.prompt}</h3>

        {isMcq ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {ex.options.map((opt) => {
              const chosen = choice === opt;
              const isAnswer = opt === ex.answer;
              let bg = "var(--card)", bd = "var(--line)", col = "var(--ink)";
              if (submitted) {
                if (isAnswer) { bg = "var(--jade-soft)"; bd = "var(--jade)"; col = "var(--jade)"; }
                else if (chosen) { bg = "var(--ember-soft)"; bd = "var(--ember)"; col = "var(--ember)"; }
              } else if (chosen) { bg = "var(--primary-soft)"; bd = "var(--primary)"; col = "var(--primary)"; }
              return (
                <button key={opt} disabled={submitted} onClick={() => setChoice(opt)}
                  className="eai-focus text-left px-4 py-3 rounded-2xl text-sm font-medium flex items-center justify-between"
                  style={{ background: bg, border: `1.5px solid ${bd}`, color: col, cursor: submitted ? "default" : "pointer" }}>
                  {opt}
                  {submitted && isAnswer && <CheckCircle2 size={17} />}
                  {submitted && chosen && !isAnswer && <XCircle size={17} />}
                </button>
              );
            })}
          </div>
        ) : (
          <input className="eai-input eai-focus w-full px-4 py-3 text-sm" placeholder={t(lang, "typeAnswer")} value={choice ?? ""}
            disabled={submitted} onChange={(e) => setChoice(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />
        )}

        {phase === "answering" && (
          <button onClick={submit} disabled={choice == null || String(choice).trim() === ""}
            className={`eai-btn ${glass ? "eai-glass" : "text-white"} eai-focus w-full mt-5 py-3 text-sm ${lang === "km" ? "eai-km" : ""}`}
            style={glass ? undefined : { background: "var(--primary)", opacity: choice == null || String(choice).trim() === "" ? 0.5 : 1 }}>
            {t(lang, "checkAnswer")}
          </button>
        )}

        {phase === "mistake" && (
          <div className="mt-5 eai-rise">
            <p className={`text-sm font-semibold mb-2.5 ${lang === "km" ? "eai-km" : ""}`}>{t(lang, "whyMissed")}</p>
            <div className="flex flex-wrap gap-2">
              {MISTAKE_TYPES.map((mt) => (
                <button key={mt} onClick={() => chooseMistake(mt)} className={`eai-btn eai-focus text-xs font-semibold px-3 py-2 rounded-full eai-soft ${lang === "km" ? "eai-km" : ""}`} style={{ color: "var(--ink)" }}>{mistakeTypeLabel(mt, lang)}</button>
              ))}
              <button onClick={() => chooseMistake(null)} className={`eai-btn eai-focus text-xs font-semibold px-3 py-2 rounded-full ${lang === "km" ? "eai-km" : ""}`} style={{ color: "var(--muted)" }}>{t(lang, "skipWord")}</button>
            </div>
          </div>
        )}

        {phase === "result" && (
          <div className="mt-5 space-y-3 eai-rise">
            {/* Result banner */}
            <div className="flex items-center gap-2.5 p-3 rounded-2xl" style={{ background: correct ? "var(--jade-soft)" : "var(--ember-soft)" }}>
              {correct ? <CheckCircle2 size={22} style={{ color: "var(--jade)" }} /> : <XCircle size={22} style={{ color: "var(--ember)" }} />}
              <div>
                <p className={`text-sm font-bold ${lang === "km" ? "eai-km" : ""}`} style={{ color: correct ? "var(--jade)" : "var(--ember)" }}>{correct ? t(lang, "correctXp") : t(lang, "notQuite")}</p>
                {!correct && <p className={`text-xs eai-muted ${lang === "km" ? "eai-km" : ""}`}>{t(lang, "correctAnswerIs")} <b style={{ color: "var(--ink)" }}>{ex.answer}</b></p>}
              </div>
            </div>

            {/* Explanation */}
            <div className="p-4 rounded-2xl eai-soft">
              <div className="flex items-center gap-2 mb-1.5"><Lightbulb size={15} style={{ color: "var(--gold)" }} /><span className={`text-xs font-bold eai-display ${lang === "km" ? "eai-km" : ""}`}>{t(lang, "explanationWord")}</span></div>
              <p className="text-sm leading-relaxed">{ex.explanation}</p>
            </div>

            {/* Formula / approach — only BAC-II exercises carry this field; university quiz
                questions rely on the explanation above instead of a separate formula box. */}
            {ex.formula && (
              <div className="p-4 rounded-2xl" style={{ background: "var(--primary-soft)" }}>
                <div className="flex items-center gap-2 mb-1.5"><Brain size={15} style={{ color: "var(--primary)" }} /><span className={`text-xs font-bold eai-display ${lang === "km" ? "eai-km" : ""}`} style={{ color: "var(--primary)" }}>{t(lang, "formulaApproach")}</span></div>
                <p className="text-sm font-semibold" style={{ color: "var(--primary)" }}>{ex.formula}</p>
              </div>
            )}

            {/* Recommendation */}
            <p className={`text-sm eai-muted leading-relaxed ${lang === "km" ? "eai-km" : ""}`}>
              {correct ? t(lang, onNext ? "recCorrectMore" : "recCorrectLast") : t(lang, "recIncorrect")}
            </p>

            <div className="flex flex-wrap gap-2 pt-1">
              {!correct && (
                <button onClick={retry} className={`eai-btn ${glass ? "eai-glass" : "eai-soft"} eai-focus py-2.5 px-4 text-sm flex items-center gap-1.5 ${lang === "km" ? "eai-km" : ""}`} style={glass ? undefined : { color: "var(--ink)" }}>
                  <RotateCcw size={15} /> {t(lang, "tryAgain")}
                </button>
              )}
              {onNext && (
                <button onClick={next} className={`eai-btn ${glass ? "eai-glass" : "text-white"} eai-focus py-2.5 px-4 text-sm flex items-center gap-1.5 ${lang === "km" ? "eai-km" : ""}`} style={glass ? undefined : { background: "var(--primary)" }}>
                  {t(lang, "nextExercise")} <ChevronRight size={15} />
                </button>
              )}
              <button onClick={onBack} className={`eai-btn ${glass ? "eai-glass" : "eai-soft"} eai-focus py-2.5 px-4 text-sm ${lang === "km" ? "eai-km" : ""}`} style={glass ? undefined : { color: "var(--ink)" }}>{t(lang, "backToList")}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════ University Practice ════════════════════════
   The university track's quiz UI — reuses ExercisePlayer/StatusControl/STATUS/getUniExercises
   as-is (they're subject-shape-agnostic) rather than re-deriving the exercise-answering screen.
   Deliberately skips PracticeSubject's session-only adaptive-difficulty stepping (tier/streak
   banners) to keep this addition scoped — straightforward list-then-answer, same mastery
   tracking underneath via onAnswer -> handleUniAnswer -> recordAttempt. */
function UniversityPractice({ p, uniPractice, onAnswer, onSetStatus, initialCourseId, onConsumeInitialCourse, lang = "en" }) {
  const up = p.universityProfile || {};
  const courses = UNI_COURSES[up.major] || [];
  const [courseId, setCourseId] = useState(initialCourseId || null);
  useEffect(() => { if (initialCourseId) onConsumeInitialCourse?.(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const course = courses.find((c) => c.id === courseId);

  if (course) {
    return <UniversityPracticeCourse course={course} major={up.major} uniPractice={uniPractice}
      onAnswer={onAnswer} onSetStatus={onSetStatus} onBack={() => setCourseId(null)} lang={lang} />;
  }

  if (!courses.length) {
    return (
      <div className="space-y-5 eai-rise">
        <h2 className={`eai-display text-2xl font-extrabold ${lang === "km" ? "eai-km" : ""}`}>{t(lang, "practiceTitle")}</h2>
        <div className="eai-card p-6 text-center">
          <p className={`text-sm eai-muted ${lang === "km" ? "eai-km" : ""}`}>{t(lang, "uniHubCoursesComingSoon")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 eai-rise">
      <div>
        <h2 className={`eai-display text-2xl font-extrabold ${lang === "km" ? "eai-km" : ""}`}>{t(lang, "practiceTitle")}</h2>
        <p className={`eai-muted text-sm mt-1 ${lang === "km" ? "eai-km" : ""}`}>{t(lang, "practiceDesc")}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {courses.map((c) => {
          const key = `${up.major}::${c.title}`;
          const list = getUniExercises(key);
          const doneN = list.filter((ex) => uniPractice[ex.id]?.status === "completed").length;
          const pct = list.length ? Math.round((doneN / list.length) * 100) : 0;
          const isWeak = (p.universityInsights?.weak || []).some((w) => w.s === key);
          return (
            <button key={c.id} onClick={() => setCourseId(c.id)} className="eai-card eai-tile eai-focus p-5 text-left">
              <div className="flex items-center justify-between">
                <div className="grid place-items-center rounded-xl" style={{ width: 40, height: 40, background: "var(--primary-soft)" }}>
                  <Target size={19} style={{ color: "var(--primary)" }} />
                </div>
                {isWeak && <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${lang === "km" ? "eai-km" : ""}`} style={{ background: "var(--ember-soft)", color: "var(--ember)" }}>{t(lang, "focusArea")}</span>}
              </div>
              <h3 className={`eai-display font-bold mt-3 ${lang === "km" ? "eai-km" : ""}`}>{lang === "km" ? c.titleKm : c.title}</h3>
              <p className={`text-xs eai-muted mt-0.5 ${lang === "km" ? "eai-km" : ""}`}>{list.length} {t(lang, "exercisesAutoGraded")}</p>
              <div className="h-1.5 rounded-full eai-soft mt-3 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "var(--jade)" }} />
              </div>
              <p className={`text-xs eai-muted mt-1.5 ${lang === "km" ? "eai-km" : ""}`}>{doneN}/{list.length} {t(lang, "completedWord")}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function UniversityPracticeCourse({ course, major, uniPractice, onAnswer, onSetStatus, onBack, lang = "en" }) {
  const key = `${major}::${course.title}`;
  const list = getUniExercises(key);
  const [idx, setIdx] = useState(null);
  const courseTitle = lang === "km" ? course.titleKm : course.title;

  if (idx != null && list[idx]) {
    return (
      <ExercisePlayer ex={list[idx]} entry={uniPractice[list[idx].id]} subject={courseTitle} index={idx} total={list.length} tier={null} banner={null}
        onAnswer={onAnswer} onSetStatus={onSetStatus} onBack={() => setIdx(null)}
        onNext={list.length > 1 ? () => setIdx((idx + 1) % list.length) : null} lang={lang} />
    );
  }

  const doneN = list.filter((ex) => uniPractice[ex.id]?.status === "completed").length;
  const pct = list.length ? Math.round((doneN / list.length) * 100) : 0;

  return (
    <div className="space-y-5 eai-rise">
      <button onClick={onBack} className={`eai-focus flex items-center gap-1 text-sm eai-muted ${lang === "km" ? "eai-km" : ""}`}><ChevronLeft size={16} /> {t(lang, "allSubjects")}</button>
      <div className="eai-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="eai-display text-2xl font-extrabold">{courseTitle}</h2>
            <p className={`eai-muted text-sm mt-0.5 ${lang === "km" ? "eai-km" : ""}`}>{list.length} {t(lang, "exercisesWord")} · {doneN} {t(lang, "completedWord")}</p>
          </div>
          <Ring value={pct} size={60} color="var(--jade)"><span className="eai-display font-bold text-xs">{pct}%</span></Ring>
        </div>
      </div>

      <div className="space-y-3">
        {list.map((ex, i) => {
          const entry = uniPractice[ex.id];
          const st = STATUS[entry?.status || "pending"];
          return (
            <div key={ex.id} className="eai-card p-4 flex flex-wrap items-center gap-3">
              <div className="grid place-items-center rounded-xl flex-shrink-0 eai-display font-bold" style={{ width: 36, height: 36, background: "var(--bg-soft)", color: "var(--muted)" }}>{i + 1}</div>
              <div className="min-w-0 flex-1" style={{ minWidth: 180 }}>
                <p className="text-sm font-semibold truncate">{ex.prompt}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full eai-soft eai-muted ${lang === "km" ? "eai-km" : ""}`}>{topicLabel(ex.topic, lang)}</span>
                  <span className="text-xs font-semibold" style={{ color: diffColor(ex.difficulty) }}>{ex.difficulty}</span>
                  <span className={`text-xs font-semibold flex items-center gap-1 ${lang === "km" ? "eai-km" : ""}`} style={{ color: st.color }}><st.icon size={12} /> {lang === "km" ? t(lang, `status_${entry?.status || "pending"}`) : st.label}</span>
                </div>
              </div>
              <StatusControl status={entry?.status} onChange={(s) => onSetStatus(ex, s)} lang={lang} />
              <button onClick={() => setIdx(i)} className={`eai-btn eai-focus text-sm py-2 px-4 text-white flex items-center gap-1.5 flex-shrink-0 ${lang === "km" ? "eai-km" : ""}`} style={{ background: "var(--primary)" }}>
                {entry?.status === "completed" ? t(lang, "reviewWord") : t(lang, "solveWord")} <ChevronRight size={15} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ════════════════════════ Assessment choice ════════════════════════
   Shown right after registration, before the (optional) diagnostic test. Students can start the
   real assessment or explore the app unpersonalized — see Dashboard's banner for the return path. */
function AssessmentChoice({ reg, dark, setDark, onStart, onSkip, onBack, lang = "en", setLang }) {
  return (
    <OnboardingLayout dark={dark} setDark={setDark} step={4} onBack={onBack} lang={lang} setLang={setLang}
      title={t(lang, "chooseBeginTitle")}
      description={t(lang, "chooseBeginDesc")}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <OnboardingOptionCard variant="primary" icon={Target} badge={t(lang, "recommendedBadge")}
          title={t(lang, "startPersonalizedTitle")}
          description={t(lang, "startPersonalizedDesc")}
          benefits={t(lang, "startPersonalizedBenefits")}
          buttonLabel={t(lang, "startAssessmentBtn")} onClick={onStart} />
        <OnboardingOptionCard variant="secondary" icon={Eye}
          title={t(lang, "exploreFirstTitle")}
          description={t(lang, "exploreFirstDesc")}
          buttonLabel={t(lang, "exploreFirstBtn")} onClick={onSkip} />
      </div>
    </OnboardingLayout>
  );
}

/* ════════════════════════ Diagnostic test ════════════════════════
   A short, fast-fire assessment run right after registration and before the dashboard exists.
   No feedback mid-test — like a real diagnostic, you only see results at the end. It seeds the
   very first real topic-mastery scores; everything the dashboard shows flows from this. */
function buildDiagnosticQueue(field, lang = "en") {
  return FIELD_SUBJECTS[field].flatMap((s) => getExercises(s, lang));
}

function Diagnostic({ reg, dark, onComplete, lang = "en" }) {
  const queue = useMemo(() => buildDiagnosticQueue(reg.field, lang), [reg.field, lang]);
  const [i, setI] = useState(0);
  const [topicMastery, setTopicMastery] = useState({});
  const [choice, setChoice] = useState(null);
  const startRef = useRef(Date.now());

  useEffect(() => { startRef.current = Date.now(); }, [i]);

  if (i >= queue.length) {
    return <DiagnosticResults reg={reg} dark={dark} topicMastery={topicMastery} onComplete={() => onComplete(topicMastery)} lang={lang} />;
  }

  const ex = queue[i];
  const pct = Math.round((i / queue.length) * 100);

  const answer = (confidence) => {
    const correct = gradeAnswer(ex, choice);
    const timeSec = (Date.now() - startRef.current) / 1000;
    setTopicMastery((tm) => recordAttempt(tm, ex.subject, ex.topic, { correct, difficulty: ex.difficulty, timeSec, confidence, mistakeType: null, ts: Date.now() }));
    setChoice(null);
    setI((n) => n + 1);
  };

  return (
    <div className={`eai-root ${dark ? "theme-dark" : "theme-light"}`} style={{ minHeight: "100vh" }}>
      <style>{STYLES}</style>
      <div className="flex items-center justify-center p-4" style={{ minHeight: "100vh" }}>
        <div className="w-full eai-rise" style={{ maxWidth: 640 }}>
          <div className="flex items-center justify-between mb-2">
            <p className={`text-sm font-semibold eai-muted flex items-center gap-1.5 ${lang === "km" ? "eai-km" : ""}`}><ClipboardCheck size={15} /> {t(lang, "diagnosticTestWord")}</p>
            <p className={`text-xs eai-muted ${lang === "km" ? "eai-km" : ""}`}>{t(lang, "questionWord")} {i + 1} {t(lang, "ofWord")} {queue.length}</p>
          </div>
          <div className="h-1.5 rounded-full eai-soft mb-6 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "var(--primary)", transition: "width .3s" }} />
          </div>

          <div className="eai-card p-6 sm:p-8">
            <div className="flex items-center gap-2 mb-4">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${lang === "km" ? "eai-km" : ""}`} style={{ background: "var(--primary-soft)", color: "var(--primary)" }}>{subjectLabel(ex.subject, lang)}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full eai-soft eai-muted ${lang === "km" ? "eai-km" : ""}`}>{topicLabel(ex.topic, lang)}</span>
              <span className="text-xs font-semibold" style={{ color: diffColor(ex.difficulty) }}>{ex.difficulty}</span>
            </div>
            <h2 className="eai-display text-lg font-bold mb-5">{ex.prompt}</h2>

            {choice == null ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {ex.options.map((opt) => (
                  <button key={opt} onClick={() => setChoice(opt)}
                    className="eai-focus text-left px-4 py-3 rounded-2xl text-sm font-medium"
                    style={{ background: "var(--card)", border: "1.5px solid var(--line)", color: "var(--ink)" }}>
                    {opt}
                  </button>
                ))}
              </div>
            ) : (
              <div className="eai-rise">
                <div className="px-4 py-3 rounded-2xl text-sm font-semibold mb-4" style={{ background: "var(--primary-soft)", color: "var(--primary)" }}>{choice}</div>
                <p className={`text-xs font-semibold eai-muted mb-2.5 ${lang === "km" ? "eai-km" : ""}`}>{t(lang, "howSureWereYou")}</p>
                <div className="grid grid-cols-2 gap-2.5">
                  <button onClick={() => answer("confident")} className={`eai-btn eai-glass eai-focus py-3 text-sm font-semibold ${lang === "km" ? "eai-km" : ""}`} style={{ "--glass-tint": "var(--jade)" }}>😎 {t(lang, "confidentWord")}</button>
                  <button onClick={() => answer("guess")} className={`eai-btn eai-glass eai-focus py-3 text-sm font-semibold ${lang === "km" ? "eai-km" : ""}`} style={{ "--glass-tint": "var(--gold)" }}>🤔 {t(lang, "guessedWord")}</button>
                </div>
              </div>
            )}
          </div>
          <p className={`text-center text-xs eai-muted mt-4 ${lang === "km" ? "eai-km" : ""}`}>{t(lang, "noFeedbackDuringTest")}</p>
        </div>
      </div>
    </div>
  );
}

function DiagnosticResults({ reg, dark, topicMastery, onComplete, lang = "en" }) {
  const rows = FIELD_SUBJECTS[reg.field].map((s) => {
    const topics = SUBJECT_TOPICS[s] || [];
    const scores = topics.map((t) => topicMastery[s]?.[t]?.score).filter((x) => x != null);
    const m = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
    return { s, m, level: masteryLevel(m) };
  });
  const known = rows.filter((r) => r.m != null);
  const overall = known.length ? Math.round(known.reduce((a, b) => a + b.m, 0) / known.length) : null;
  const overallLevel = masteryLevel(overall);

  return (
    <div className={`eai-root ${dark ? "theme-dark" : "theme-light"}`} style={{ minHeight: "100vh" }}>
      <style>{STYLES}</style>
      <div className="flex items-center justify-center p-4" style={{ minHeight: "100vh" }}>
        <div className="w-full eai-rise" style={{ maxWidth: 640 }}>
          <div className="text-center mb-6">
            <div className="inline-grid place-items-center rounded-2xl mb-3" style={{ width: 56, height: 56, background: "var(--jade-soft)" }}>
              <CheckCircle2 size={28} style={{ color: "var(--jade)" }} />
            </div>
            <h1 className={`eai-display text-2xl font-extrabold ${lang === "km" ? "eai-km" : ""}`}>{t(lang, "diagnosticComplete")}</h1>
            <p className={`eai-muted text-sm mt-1 ${lang === "km" ? "eai-km" : ""}`}>{t(lang, "startingPointIs")} <b style={{ color: LEVEL_COLOR[overallLevel] }}>{levelLabel(overallLevel, lang)}</b>.</p>
          </div>

          <div className="eai-card p-6">
            <div className="space-y-3">
              {rows.map((r) => (
                <div key={r.s} className="flex items-center gap-3">
                  <span className="text-sm font-semibold w-32 truncate">{r.s}</span>
                  <div className="flex-1 h-2.5 rounded-full eai-soft overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${r.m ?? 0}%`, background: LEVEL_COLOR[r.level] }} />
                  </div>
                  <span className="text-xs font-bold w-9 text-right eai-display">{r.m != null ? `${r.m}%` : "—"}</span>
                  <span className={`text-xs font-semibold w-24 text-right ${lang === "km" ? "eai-km" : ""}`} style={{ color: LEVEL_COLOR[r.level] }}>{levelLabel(r.level, lang)}</span>
                </div>
              ))}
            </div>
          </div>

          <button onClick={onComplete} className={`eai-btn eai-glass eai-focus w-full mt-5 py-3 text-sm flex items-center justify-center gap-2 ${lang === "km" ? "eai-km" : ""}`}>
            <Sparkles size={16} /> {t(lang, "goToDashboard")} <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}


function Majors({ abbr, color, lang = "en" }) {
  const faculties = UNI_MAJORS[abbr];
  const [open, setOpen] = useState(0);
  if (!faculties) return null;
  const total = faculties.reduce((a, f) => a + f.majors.length, 0);
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <BookOpen size={17} style={{ color: "var(--jade)" }} />
        <h3 className={`eai-display font-bold ${lang === "km" ? "eai-km" : ""}`}>{t(lang, "majorsOffered")}</h3>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${lang === "km" ? "eai-km" : ""}`} style={{ background: "var(--jade-soft)", color: "var(--jade)" }}>{total} {t(lang, "majorsWord")}</span>
      </div>
      <div className="space-y-3">
        {faculties.map((f, i) => {
          const isOpen = open === i;
          return (
            <div key={f.faculty} className="eai-card overflow-hidden">
              <button onClick={() => setOpen(isOpen ? -1 : i)} className="eai-focus w-full flex items-center justify-between gap-3 p-4 text-left">
                <div className="flex items-center gap-2 min-w-0">
                  <GraduationCap size={16} style={{ color, flexShrink: 0 }} />
                  <span className={`eai-display font-bold text-sm truncate ${lang === "km" ? "eai-km" : ""}`}>{lang === "km" ? (f.facultyKm || f.faculty) : f.faculty}</span>
                  <span className="text-xs eai-muted flex-shrink-0">({f.majors.length})</span>
                </div>
                <ChevronRight size={16} className="eai-muted flex-shrink-0" style={{ transform: isOpen ? "rotate(90deg)" : "none", transition: "transform .15s ease" }} />
              </button>
              {isOpen && (
                <div className="px-4 pb-4 space-y-3 border-t" style={{ borderColor: "var(--line)" }}>
                  {f.majors.map((m) => (
                    <div key={m.n} className="pt-3">
                      <p className={`text-sm font-semibold ${lang === "km" ? "eai-km" : ""}`}>{lang === "km" ? (m.nKm || m.n) : m.n}</p>
                      <p className={`text-xs eai-muted mt-0.5 leading-relaxed ${lang === "km" ? "eai-km" : ""}`}>{lang === "km" ? (m.dKm || m.d) : m.d}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function UniLogo({ uni, size = 64 }) {
  const [failed, setFailed] = useState(false);
  if (!uni.logo || failed) {
    return (
      <div className="grid place-items-center rounded-xl flex-shrink-0" style={{ width: size, height: size, background: "var(--bg-soft)" }}>
        <GraduationCap size={Math.round(size * 0.45)} style={{ color: uni.c }} />
      </div>
    );
  }
  return (
    <div className="grid place-items-center rounded-xl flex-shrink-0 p-2 overflow-hidden" style={{ width: size, height: size, background: "transparent" }}>
      <img src={uni.logo} alt={`${uni.abbr} logo`} className="max-w-full max-h-full w-auto h-auto min-w-0 min-h-0 object-contain" onError={() => setFailed(true)} />
    </div>
  );
}

/* Rule-based, weighted, fully explainable match score between a university and a university-track
   student's onboarding profile — no ML, just transparent point values so every score comes with a
   plain-language reason. Returns 0 with no reasons for a high-school profile or a university with
   no UNI_PROFILE_INFO entry, so callers can render "no match data" instead of a fake 0% badge. */
function scoreUniversityMatch(uni, up, info = UNI_PROFILE_INFO[uni.abbr]) {
  if (!info || !up) return { score: 0, reasons: [] };
  const goals = up.goals || [];
  let score = 0;
  const reasons = [];
  if (up.major && info.tags.includes(up.major)) {
    const majorLabel = UNI_FIELDS.find((f) => f.id === up.major);
    score += 50;
    reasons.push({ key: "major", label: `Offers ${majorLabel?.label || up.major}` });
  }
  if (goals.includes("study_abroad") && info.languageOfInstruction.includes("English")) {
    score += 15;
    reasons.push({ key: "english", label: "English-medium — fits study-abroad pathways" });
  }
  if (goals.includes("scholarship_prep") && UNI_SCHOLARSHIPS[uni.abbr]?.length) {
    score += 15;
    reasons.push({ key: "scholarship", label: "Has scholarships you may qualify for" });
  }
  if (goals.includes("find_university") || goals.includes("prepare_university")) score += 10;
  return { score: Math.max(0, Math.min(100, score)), reasons };
}

function UniversityDetail({ uni, p, onBack, lang = "en" }) {
  const info = UNI_PROFILE_INFO[uni.abbr];
  const isUni = p?.educationLevel === "university";
  const up = p?.universityProfile;
  const match = isUni && up ? scoreUniversityMatch(uni, up) : null;
  return (
    <div className="space-y-5 eai-rise">
      <button onClick={onBack} className={`eai-focus flex items-center gap-1 text-sm eai-muted ${lang === "km" ? "eai-km" : ""}`}>
        <ChevronLeft size={16} /> {t(lang, "allUniversities")}
      </button>

      {/* Header */}
      <div className="eai-card p-6 flex items-center gap-4">
        <UniLogo uni={uni} size={72} />
        <div className="min-w-0">
          <div className="flex items-center gap-2"><GraduationCap size={18} style={{ color: uni.c }} /><span className="eai-display text-xl font-extrabold">{uni.abbr}</span></div>
          <p className={`text-sm mt-0.5 ${lang === "km" ? "eai-km" : ""}`}>{lang === "km" ? uni.nKm : uni.n}</p>
        </div>
      </div>

      {/* Why this matches you */}
      {match && match.reasons.length > 0 && (
        <div className="eai-card p-6">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={17} style={{ color: "var(--primary)" }} />
            <h3 className={`eai-display font-bold ${lang === "km" ? "eai-km" : ""}`}>{t(lang, "whyMatchesYou")}</h3>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: "var(--primary-soft)", color: "var(--primary)" }}>{match.score}% {t(lang, "matchWord")}</span>
          </div>
          <div className="space-y-2">
            {match.reasons.map((r) => (
              <div key={r.key} className="flex items-center gap-2">
                <CheckCircle2 size={14} style={{ color: "var(--jade)", flexShrink: 0 }} />
                <span className="text-sm">{r.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Admissions & cost — illustrative prototype data, not sourced from the university */}
      {isUni && info && (
        <div className="eai-card p-6">
          <div className="flex items-center gap-2 mb-1">
            <Compass size={17} style={{ color: "var(--gold)" }} />
            <h3 className={`eai-display font-bold ${lang === "km" ? "eai-km" : ""}`}>{t(lang, "admissionsAndCost")}</h3>
          </div>
          <p className={`text-xs eai-muted mb-3 ${lang === "km" ? "eai-km" : ""}`}>{t(lang, "illustrativeDataNote")}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { l: t(lang, "locationWord"), v: info.location },
              { l: t(lang, "tuitionPerYear"), v: `$${info.tuitionUSDPerYear.min}–${info.tuitionUSDPerYear.max}` },
              { l: t(lang, "languageWord"), v: info.languageOfInstruction.join(" / ") },
              { l: t(lang, "admissionsDeadlineWord"), v: info.admissionsDeadline },
            ].map((f) => (
              <div key={f.l} className="p-3 rounded-2xl eai-soft">
                <p className={`text-xs eai-muted ${lang === "km" ? "eai-km" : ""}`}>{f.l}</p>
                <p className="text-sm font-semibold mt-0.5">{f.v}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Majors offered */}
      <Majors abbr={uni.abbr} color={uni.c} lang={lang} />
    </div>
  );
}

function Universities({ p, lang = "en" }) {
  const [selected, setSelected] = useState(null); // { scope: "domestic" | "abroad", uni }
  const isUni = p?.educationLevel === "university";
  const up = p?.universityProfile;
  const [search, setSearch] = useState("");
  const [filterCountry, setFilterCountry] = useState("KH"); // "KH" = Cambodia, "ANY" = every country combined
  const [filterMajor, setFilterMajor] = useState("all");
  const [filterBudget, setFilterBudget] = useState("all");
  const [filterLanguage, setFilterLanguage] = useState("all");

  if (selected) {
    return selected.scope === "abroad"
      ? <AbroadUniversityDetail uni={selected.uni} p={p} onBack={() => setSelected(null)} lang={lang} />
      : <UniversityDetail uni={selected.uni} p={p} onBack={() => setSelected(null)} lang={lang} />;
  }

  // Every entry is normalized to { scope, u } so "Any country" can mix domestic and abroad
  // universities in one list without the rest of the component needing to branch per-scope.
  // Domestic entries read UNI_PROFILE_INFO by abbr for filtering; abroad entries already carry
  // those same fields (tags/budgetTier/languageOfInstruction) directly on themselves.
  const domesticEntries = UNIS.map((u) => ({ scope: "domestic", u }));
  const abroadEntries = (countryId) => (ABROAD_UNIVERSITIES[countryId] || []).map((u) => ({ scope: "abroad", u }));
  const baseList = !isUni ? domesticEntries
    : filterCountry === "KH" ? domesticEntries
    : filterCountry === "ANY" ? [...domesticEntries, ...ABROAD_COUNTRIES.flatMap((c) => abroadEntries(c.id))]
    : abroadEntries(filterCountry);

  const filtered = !isUni ? baseList : baseList.filter(({ scope, u }) => {
    const info = scope === "abroad" ? u : UNI_PROFILE_INFO[u.abbr];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      if (!u.n.toLowerCase().includes(q) && !u.abbr.toLowerCase().includes(q)) return false;
    }
    if (!info) return true;
    if (filterMajor !== "all" && !info.tags.includes(filterMajor)) return false;
    if (filterBudget !== "all" && info.budgetTier !== filterBudget) return false;
    if (filterLanguage !== "all" && !info.languageOfInstruction.includes(filterLanguage)) return false;
    return true;
  });
  const scoreOf = ({ scope, u }) => scoreUniversityMatch(u, up, scope === "abroad" ? u : undefined).score;
  const ranked = isUni && up ? [...filtered].sort((a, b) => scoreOf(b) - scoreOf(a)) : filtered;

  return (
    <div className="space-y-5 eai-rise">
      <div>
        <h2 className={`eai-display text-2xl font-extrabold ${lang === "km" ? "eai-km" : ""}`}>{t(lang, "universitiesTitle")}</h2>
        <p className={`eai-muted text-sm mt-1 ${lang === "km" ? "eai-km" : ""}`}>{t(lang, "universitiesDesc")}</p>
      </div>

      {isUni && (
        <div className="eai-card p-4 flex flex-wrap gap-2">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t(lang, "searchUniversities")}
            className={`eai-input eai-focus text-sm px-3 py-2 flex-1 ${lang === "km" ? "eai-km" : ""}`} style={{ minWidth: 160 }} />
          <select value={filterCountry} onChange={(e) => setFilterCountry(e.target.value)} className="eai-input eai-focus text-sm px-3 py-2">
            <option value="KH">Cambodia</option>
            <option value="ANY">Any country</option>
            {ABROAD_COUNTRIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <select value={filterMajor} onChange={(e) => setFilterMajor(e.target.value)} className={`eai-input eai-focus text-sm px-3 py-2 ${lang === "km" ? "eai-km" : ""}`}>
            <option value="all">{t(lang, "allMajorsFilter")}</option>
            {UNI_FIELDS.map((f) => <option key={f.id} value={f.id}>{lang === "km" ? f.labelKm : f.label}</option>)}
          </select>
          <select value={filterBudget} onChange={(e) => setFilterBudget(e.target.value)} className={`eai-input eai-focus text-sm px-3 py-2 ${lang === "km" ? "eai-km" : ""}`}>
            <option value="all">{t(lang, "anyBudget")}</option>
            <option value="low">{t(lang, "budgetLow")}</option>
            <option value="medium">{t(lang, "budgetMedium")}</option>
            <option value="high">{t(lang, "budgetHigh")}</option>
          </select>
          <select value={filterLanguage} onChange={(e) => setFilterLanguage(e.target.value)} className={`eai-input eai-focus text-sm px-3 py-2 ${lang === "km" ? "eai-km" : ""}`}>
            <option value="all">{t(lang, "anyLanguage")}</option>
            <option value="Khmer">Khmer</option>
            <option value="English">English</option>
            <option value="French">French</option>
          </select>
        </div>
      )}
      {filterCountry === "ANY" && (
        <p className="text-xs eai-muted">Cambodia's official university programs, plus a curated starting list of study-abroad options across the United States, Australia, Canada and New Zealand not an audited enrollment ranking. Abroad tuition figures are illustrative estimates.</p>
      )}
      {filterCountry !== "KH" && filterCountry !== "ANY" && (
        <p className="text-xs eai-muted">A curated starting list of well-known universities Cambodian students commonly consider in {ABROAD_COUNTRIES.find((c) => c.id === filterCountry)?.label} — not an audited enrollment ranking. Tuition figures are illustrative estimates.</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {ranked.map(({ scope, u }) => {
          const match = isUni && up ? scoreUniversityMatch(u, up, scope === "abroad" ? u : undefined) : null;
          return (
            <button key={`${scope}-${u.abbr}`} onClick={() => setSelected({ scope, uni: u })} className="eai-card eai-tile eai-focus p-5 flex items-center gap-4 text-left w-full">
              <UniLogo uni={{ ...u, c: u.c || "var(--primary)" }} size={64} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2"><GraduationCap size={16} style={{ color: u.c || "var(--primary)" }} /><span className="eai-display font-bold">{u.abbr}</span></div>
                <p className={`text-sm truncate mt-0.5 ${lang === "km" ? "eai-km" : ""}`}>{lang === "km" ? (u.nKm ?? u.n) : u.n}</p>
                <p className={`text-xs eai-muted mt-0.5 ${lang === "km" ? "eai-km" : ""}`}>{scope === "abroad" ? u.location : t(lang, "viewPracticeSets")}</p>
                {match && match.reasons.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {match.reasons.slice(0, 2).map((r) => (
                      <span key={r.key} className="text-xs px-2 py-0.5 rounded-full eai-soft">{r.label}</span>
                    ))}
                  </div>
                )}
              </div>
              {match && match.score > 0 && (
                <span className="text-xs font-bold px-2 py-1 rounded-full flex-shrink-0" style={{ background: "var(--primary-soft)", color: "var(--primary)" }}>{match.score}%</span>
              )}
              <ChevronRight size={18} className="eai-muted flex-shrink-0" />
            </button>
          );
        })}
      </div>
      {isUni && !ranked.length && (
        <div className="eai-card p-6 text-center">
          <p className={`text-sm eai-muted ${lang === "km" ? "eai-km" : ""}`}>{t(lang, "noUniversitiesMatch")}</p>
        </div>
      )}
    </div>
  );
}

/* Study-abroad detail view — a simpler twin of UniversityDetail for ABROAD_UNIVERSITIES entries,
   which have no UNI_MAJORS prose catalog (that's a Cambodia-domestic concept). Shows the match
   panel, an admissions/cost block, majors as plain tag chips, and the curator's note on why this
   school made the list. */
function AbroadUniversityDetail({ uni, p, onBack, lang = "en" }) {
  const up = p?.universityProfile;
  const match = up ? scoreUniversityMatch(uni, up, uni) : null;

  return (
    <div className="space-y-5 eai-rise">
      <button onClick={onBack} className="eai-focus flex items-center gap-1 text-sm eai-muted">
        <ChevronLeft size={16} /> {t(lang, "allUniversities")}
      </button>

      <div className="eai-card p-6 flex items-center gap-4">
        <UniLogo uni={{ ...uni, c: uni.c || "var(--primary)" }} size={72} />
        <div className="min-w-0">
          <div className="flex items-center gap-2"><GraduationCap size={18} style={{ color: "var(--primary)" }} /><span className="eai-display text-xl font-extrabold">{uni.n}</span></div>
          <p className="text-sm eai-muted mt-0.5">{uni.location}</p>
        </div>
      </div>

      {match && match.reasons.length > 0 && (
        <div className="eai-card p-6">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={17} style={{ color: "var(--primary)" }} />
            <h3 className="eai-display font-bold">{t(lang, "whyMatchesYou")}</h3>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: "var(--primary-soft)", color: "var(--primary)" }}>{match.score}% {t(lang, "matchWord")}</span>
          </div>
          <div className="space-y-2">
            {match.reasons.map((r) => (
              <div key={r.key} className="flex items-center gap-2">
                <CheckCircle2 size={14} style={{ color: "var(--jade)", flexShrink: 0 }} />
                <span className="text-sm">{r.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="eai-card p-6">
        <div className="flex items-center gap-2 mb-1">
          <Compass size={17} style={{ color: "var(--gold)" }} />
          <h3 className="eai-display font-bold">{t(lang, "admissionsAndCost")}</h3>
        </div>
        <p className="text-xs eai-muted mb-3">{t(lang, "illustrativeDataNote")}</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { l: t(lang, "locationWord"), v: uni.location },
            { l: t(lang, "tuitionPerYear"), v: `$${uni.tuitionUSDPerYear.min.toLocaleString()}–${uni.tuitionUSDPerYear.max.toLocaleString()}` },
            { l: t(lang, "languageWord"), v: uni.languageOfInstruction.join(" / ") },
            { l: "Degrees offered", v: uni.degreeLevels.join(", ") },
          ].map((f) => (
            <div key={f.l} className="p-3 rounded-2xl eai-soft">
              <p className="text-xs eai-muted">{f.l}</p>
              <p className="text-sm font-semibold mt-0.5">{f.v}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="eai-card p-6">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen size={17} style={{ color: "var(--jade)" }} />
          <h3 className="eai-display font-bold">Majors & fields</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {uni.tags.map((tagId) => {
            const f = UNI_FIELDS.find((x) => x.id === tagId);
            return <span key={tagId} className="text-xs font-semibold px-2.5 py-1 rounded-full eai-soft">{f?.label || tagId}</span>;
          })}
        </div>
      </div>

      <div className="eai-card p-6">
        <div className="flex items-center gap-2 mb-1">
          <Lightbulb size={17} style={{ color: "var(--ember)" }} />
          <h3 className="eai-display font-bold">Why it's on this list</h3>
        </div>
        <p className="text-sm eai-muted leading-relaxed">{uni.note}</p>
      </div>
    </div>
  );
}

/* Same shape/spirit as scoreUniversityMatch, cross-referencing only major/goals — data Bondus
   actually has about a student. The scholarship's own `requirements` (BAC II grade, IELTS score,
   etc.) are deliberately NOT scored against, since no grade/IELTS data is tracked for university
   profiles — scoring against data we don't have would misrepresent a match. Those render as a
   plain unscored checklist instead (see Scholarships below). */
function scoreScholarshipMatch(scholarship, up) {
  if (!up) return { score: 0, reasons: [] };
  const goals = up.goals || [];
  let score = 0;
  const reasons = [];
  if (up.major && scholarship.tags?.includes(up.major)) {
    const majorLabel = UNI_FIELDS.find((f) => f.id === up.major);
    score += 60;
    reasons.push({ key: "major", label: `For ${majorLabel?.label || up.major} students` });
  }
  if (goals.includes("scholarship_prep")) score += 20;
  if (scholarship.needBased && goals.includes("scholarship_prep")) {
    reasons.push({ key: "need", label: "Need-based — no entrance-exam ranking required" });
  }
  if (scholarship.meritBased) {
    reasons.push({ key: "merit", label: "Merit-based — awarded by grades/exam rank" });
  }
  return { score: Math.max(0, Math.min(100, score)), reasons };
}

/* Scholarship Center — Module 5. Lists UNI_SCHOLARSHIPS (src/data/universities.js, explicitly
   flagged there as illustrative/prototype data) grouped by university, each scored via
   scoreScholarshipMatch above. Reachable from Explore's Discover tile (see UniversityExplore). */
function Scholarships({ p, lang = "en" }) {
  const up = p.universityProfile || {};
  const [selected, setSelected] = useState(null); // { abbr, i } of the open scholarship, or null

  const rows = useMemo(() => {
    const list = [];
    Object.entries(UNI_SCHOLARSHIPS).forEach(([abbr, scholarships]) => {
      const uni = UNIS.find((u) => u.abbr === abbr);
      scholarships.forEach((s, i) => list.push({ abbr, i, uni, s, match: scoreScholarshipMatch(s, up) }));
    });
    return list.sort((a, b) => b.match.score - a.match.score);
  }, [up.major, up.goals]);

  if (selected) {
    const row = rows.find((r) => r.abbr === selected.abbr && r.i === selected.i);
    if (row) {
      const { uni, s, match } = row;
      return (
        <div className="space-y-5 eai-rise">
          <button onClick={() => setSelected(null)} className={`eai-focus flex items-center gap-1 text-sm eai-muted ${lang === "km" ? "eai-km" : ""}`}>
            <ChevronLeft size={16} /> {t(lang, "scholarshipsWord")}
          </button>
          <div className="eai-card p-6 flex items-center gap-4">
            <UniLogo uni={uni || { c: "var(--primary)" }} size={56} />
            <div className="min-w-0">
              <h2 className="eai-display text-xl font-extrabold">{s.name}</h2>
              <p className={`text-sm eai-muted mt-0.5 ${lang === "km" ? "eai-km" : ""}`}>{uni ? (lang === "km" ? uni.nKm : uni.n) : selected.abbr}</p>
            </div>
          </div>
          {match.reasons.length > 0 && (
            <div className="eai-card p-6">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={17} style={{ color: "var(--primary)" }} />
                <h3 className={`eai-display font-bold ${lang === "km" ? "eai-km" : ""}`}>{t(lang, "whyYouMatch")}</h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: "var(--primary-soft)", color: "var(--primary)" }}>{match.score}% {t(lang, "matchWord")}</span>
              </div>
              <div className="space-y-2">
                {match.reasons.map((r) => (
                  <div key={r.key} className="flex items-center gap-2">
                    <CheckCircle2 size={14} style={{ color: "var(--jade)", flexShrink: 0 }} />
                    <span className="text-sm">{r.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="eai-card p-6">
            <CardHead title={t(lang, "coverageWord")} />
            <p className="text-sm font-semibold">{s.coverage}</p>
          </div>
          <div className="eai-card p-6">
            <div className="flex items-center gap-2 mb-3">
              <ClipboardCheck size={17} style={{ color: "var(--gold)" }} />
              <h3 className={`eai-display font-bold ${lang === "km" ? "eai-km" : ""}`}>{t(lang, "requirementsWord")}</h3>
            </div>
            <p className={`text-xs eai-muted mb-3 ${lang === "km" ? "eai-km" : ""}`}>{t(lang, "unscoredChecklistNote")}</p>
            <div className="space-y-2">
              {s.requirements.map((r, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Circle size={6} style={{ fill: "var(--muted)", flexShrink: 0 }} />
                  <span className="text-sm">{r}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="eai-card p-6">
            <div className="flex items-center gap-2 mb-1"><CalendarCheck size={17} style={{ color: "var(--ember)" }} /><h3 className={`eai-display font-bold ${lang === "km" ? "eai-km" : ""}`}>{t(lang, "admissionsDeadlineWord")}</h3></div>
            <p className="text-sm">{s.examDate}</p>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="space-y-5 eai-rise">
      <div>
        <h2 className={`eai-display text-2xl font-extrabold ${lang === "km" ? "eai-km" : ""}`}>{t(lang, "scholarshipsWord")}</h2>
        <p className={`eai-muted text-sm mt-1 ${lang === "km" ? "eai-km" : ""}`}>{t(lang, "scholarshipsDesc")}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {rows.map(({ abbr, i, uni, s, match }) => (
          <button key={`${abbr}-${i}`} onClick={() => setSelected({ abbr, i })} className="eai-card eai-tile eai-focus p-5 text-left">
            <div className="flex items-center gap-3">
              <UniLogo uni={uni || { c: "var(--primary)" }} size={44} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold truncate">{s.name}</p>
                <p className={`text-xs eai-muted truncate ${lang === "km" ? "eai-km" : ""}`}>{uni ? (lang === "km" ? uni.nKm : uni.n) : abbr}</p>
              </div>
              {match.score > 0 && (
                <span className="text-xs font-bold px-2 py-1 rounded-full flex-shrink-0" style={{ background: "var(--primary-soft)", color: "var(--primary)" }}>{match.score}%</span>
              )}
            </div>
            <p className="text-xs eai-muted mt-2.5">{s.coverage}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════ IELTS Diagnostic flow ════════════════════════
   intro → listening → reading → writing → speaking → grading → results.
   Listening/Reading are scored instantly from the fixed answer key. Writing/Speaking are sent to
   Gemini (gradeIeltsResponse) once, in parallel, when the student submits the speaking response. */
function IeltsIntroCard({ icon: Icon, label, desc }) {
  return (
    <div className="flex items-start gap-3 p-3.5 rounded-2xl eai-soft">
      <div className="grid place-items-center rounded-xl flex-shrink-0" style={{ width: 36, height: 36, background: "var(--card)" }}>
        <Icon size={17} style={{ color: "var(--primary)" }} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-bold">{label}</p>
        <p className="text-xs eai-muted mt-0.5">{desc}</p>
      </div>
    </div>
  );
}

/* Plain, self-styled button/textarea — the shared PrimaryButton/eai-ob-input classes rely on CSS
   variables (--primary-hover, --input-border, --focus-border, --muted-2) that only exist inside
   .eai-onboarding, and this flow's root isn't wrapped in that scope (same reason the academic
   Diagnostic component above styles its own buttons instead of reusing OnboardingLayout). */
function DiagButton({ children, disabled, className = "", ...props }) {
  return (
    <button {...props} disabled={disabled}
      className={`eai-focus w-full flex items-center justify-center gap-2 text-sm font-semibold text-white ${className}`}
      style={{ height: 50, borderRadius: 14, border: "none", background: disabled ? "var(--bg-soft)" : "var(--primary)", color: disabled ? "var(--muted)" : "#fff", cursor: disabled ? "not-allowed" : "pointer", transition: "filter .15s ease" }}>
      {children}
    </button>
  );
}

function DiagTextarea(props) {
  return (
    <textarea {...props}
      className={`eai-focus ${props.className || ""}`}
      style={{ width: "100%", borderRadius: 14, border: "1.5px solid var(--line)", background: "var(--bg-soft)", color: "var(--ink)", ...props.style }} />
  );
}

function IeltsMCQ({ questions, answers, onAnswer }) {
  return (
    <div className="space-y-4 mt-5">
      {questions.map((q, qi) => (
        <div key={qi}>
          <p className="text-sm font-semibold mb-2">{qi + 1}. {q.q}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {q.options.map((opt) => (
              <button key={opt} onClick={() => onAnswer(qi, opt)}
                className="eai-focus text-left px-3.5 py-2.5 rounded-xl text-sm font-medium"
                style={{
                  background: answers[qi] === opt ? "var(--primary-soft)" : "var(--card)",
                  border: `1.5px solid ${answers[qi] === opt ? "var(--primary)" : "var(--line)"}`,
                  color: answers[qi] === opt ? "var(--primary)" : "var(--ink)",
                }}>
                {opt}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

const IELTS_GOAL_OPTIONS = [5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0];

function IeltsDiagnostic({ dark, onExit, onComplete }) {
  const [stage, setStage] = useState("goal"); // goal | intro | listening | reading | writing | speaking | grading | results
  const [goal, setGoal] = useState(null);
  const [listeningAns, setListeningAns] = useState({});
  const [readingAns, setReadingAns] = useState({});
  const [writingText, setWritingText] = useState("");
  const [speakingText, setSpeakingText] = useState("");
  const [prepLeft, setPrepLeft] = useState(IELTS_CONTENT.speaking.prepSeconds);
  const [prepDone, setPrepDone] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (stage !== "speaking" || prepDone) return;
    if (prepLeft <= 0) { setPrepDone(true); return; }
    const t = setTimeout(() => setPrepLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [stage, prepLeft, prepDone]);

  const playScript = () => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(IELTS_CONTENT.listening.script);
    u.rate = 0.95;
    setSpeaking(true);
    u.onend = () => setSpeaking(false);
    window.speechSynthesis.speak(u);
  };

  const stages = ["listening", "reading", "writing", "speaking"];
  const stageIndex = stages.indexOf(stage);
  const progressPct = (stage === "goal" || stage === "intro") ? 0 : (stage === "grading" || stage === "results") ? 100 : Math.round(((stageIndex + 1) / stages.length) * 100);

  const listeningComplete = Object.keys(listeningAns).length === IELTS_CONTENT.listening.questions.length;
  const readingComplete = Object.keys(readingAns).length === IELTS_CONTENT.reading.questions.length;
  const writingWords = writingText.trim().split(/\s+/).filter(Boolean).length;
  const speakingWords = speakingText.trim().split(/\s+/).filter(Boolean).length;

  const submitAll = async () => {
    setStage("grading");
    const listeningCorrect = IELTS_CONTENT.listening.questions.filter((q, i) => listeningAns[i] === q.answer).length;
    const readingCorrect = IELTS_CONTENT.reading.questions.filter((q, i) => readingAns[i] === q.answer).length;
    const listeningBand = bandFromScore(listeningCorrect, IELTS_CONTENT.listening.questions.length);
    const readingBand = bandFromScore(readingCorrect, IELTS_CONTENT.reading.questions.length);

    const [writingGrade, speakingGrade] = await Promise.all([
      gradeIeltsResponse("writing", IELTS_CONTENT.writing.prompt, writingText),
      gradeIeltsResponse("speaking", IELTS_CONTENT.speaking.cueCard, speakingText),
    ]);

    const overall = roundToHalfBand((listeningBand + readingBand + writingGrade.band + speakingGrade.band) / 4);
    setResult({
      listening: listeningBand, reading: readingBand, writing: writingGrade.band, speaking: speakingGrade.band,
      overall, goal, feedback: { writing: writingGrade.feedback, speaking: speakingGrade.feedback }, completedAt: Date.now(),
    });
    setStage("results");
  };

  return (
    <div className={`eai-root ${dark ? "theme-dark" : "theme-light"}`} style={{ minHeight: "100vh" }}>
      <style>{STYLES}</style>
      <div className="flex items-center justify-center p-4" style={{ minHeight: "100vh" }}>
        <div className="w-full eai-rise" style={{ maxWidth: 680 }}>
          <div className="flex items-center justify-between mb-2">
            <button onClick={onExit} className="eai-focus flex items-center gap-1 text-sm eai-muted"><ChevronLeft size={16} /> Exit diagnostic</button>
            {stages.includes(stage) && <p className="text-xs eai-muted">Section {stageIndex + 1} of {stages.length}</p>}
          </div>
          {stage !== "goal" && stage !== "intro" && (
            <div className="h-1.5 rounded-full eai-soft mb-6 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${progressPct}%`, background: "var(--primary)", transition: "width .3s" }} />
            </div>
          )}

          <div className="eai-card p-6 sm:p-8">
            {stage === "goal" && (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <Target size={20} style={{ color: "var(--primary)" }} />
                  <h2 className="eai-display text-xl font-extrabold">What's your target band score?</h2>
                </div>
                <p className="text-sm eai-muted mt-1 mb-5">We'll track your progress against this goal every time you retake the diagnostic.</p>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
                  {IELTS_GOAL_OPTIONS.map((g) => (
                    <button key={g} onClick={() => setGoal(g)}
                      className="eai-focus py-3 rounded-2xl text-sm font-bold eai-display"
                      style={{
                        background: goal === g ? "var(--primary)" : "var(--card)",
                        color: goal === g ? "#fff" : "var(--ink)",
                        border: `1.5px solid ${goal === g ? "var(--primary)" : "var(--line)"}`,
                      }}>
                      {g.toFixed(1)}
                    </button>
                  ))}
                </div>
                <DiagButton onClick={() => setStage("intro")} disabled={goal == null} className="w-full mt-6">Continue <ChevronRight size={16} /></DiagButton>
              </>
            )}

            {stage === "intro" && (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <ClipboardCheck size={20} style={{ color: "var(--primary)" }} />
                  <h2 className="eai-display text-xl font-extrabold">IELTS placement diagnostic</h2>
                </div>
                <p className="text-sm eai-muted mt-1 mb-5">A short test across all four skills so we can estimate your current band toward your Band {goal?.toFixed(1)} goal. Takes about 15 minutes.</p>
                <div className="space-y-2.5">
                  <IeltsIntroCard icon={Headphones} label="Listening" desc="Play a short audio clip, then answer 4 questions." />
                  <IeltsIntroCard icon={BookOpen} label="Reading" desc="Read a short passage, then answer 4 questions." />
                  <IeltsIntroCard icon={FileText} label="Writing" desc="Write a short essay response to a Task 2 style prompt." />
                  <IeltsIntroCard icon={Mic} label="Speaking" desc="Prepare briefly, then type your spoken response to a cue card." />
                </div>
                <DiagButton onClick={() => setStage("listening")} className="w-full mt-6">Start diagnostic <ChevronRight size={16} /></DiagButton>
              </>
            )}

            {stage === "listening" && (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <Headphones size={18} style={{ color: "var(--primary)" }} />
                  <h2 className="eai-display text-lg font-bold">Listening</h2>
                </div>
                <p className="text-xs eai-muted mb-4">Press play to hear the clip (you can replay it), then answer the questions below.</p>
                <button onClick={playScript} className="eai-btn eai-focus px-4 py-2.5 text-sm text-white flex items-center gap-2" style={{ background: "var(--primary)" }}>
                  <PlayCircle size={16} /> {speaking ? "Playing…" : "Play audio"}
                </button>
                <IeltsMCQ questions={IELTS_CONTENT.listening.questions} answers={listeningAns} onAnswer={(qi, opt) => setListeningAns((a) => ({ ...a, [qi]: opt }))} />
                <DiagButton onClick={() => setStage("reading")} disabled={!listeningComplete} className="w-full mt-6">Continue to Reading <ChevronRight size={16} /></DiagButton>
              </>
            )}

            {stage === "reading" && (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <BookOpen size={18} style={{ color: "var(--primary)" }} />
                  <h2 className="eai-display text-lg font-bold">Reading</h2>
                </div>
                <p className="text-sm leading-relaxed p-4 rounded-2xl eai-soft mt-3" style={{ color: "var(--ink)" }}>{IELTS_CONTENT.reading.passage}</p>
                <IeltsMCQ questions={IELTS_CONTENT.reading.questions} answers={readingAns} onAnswer={(qi, opt) => setReadingAns((a) => ({ ...a, [qi]: opt }))} />
                <DiagButton onClick={() => setStage("writing")} disabled={!readingComplete} className="w-full mt-6">Continue to Writing <ChevronRight size={16} /></DiagButton>
              </>
            )}

            {stage === "writing" && (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <FileText size={18} style={{ color: "var(--primary)" }} />
                  <h2 className="eai-display text-lg font-bold">Writing</h2>
                </div>
                <p className="text-sm mt-2 mb-3" style={{ color: "var(--ink)" }}>{IELTS_CONTENT.writing.prompt}</p>
                <DiagTextarea
                  value={writingText} onChange={(e) => setWritingText(e.target.value)}
                  placeholder="Write your response here…" rows={10}
                  className="w-full p-4 text-sm leading-relaxed"
                  style={{ height: "auto", resize: "vertical" }}
                />
                <p className="text-xs eai-muted mt-2">{writingWords} words · aim for at least {IELTS_CONTENT.writing.minWords}</p>
                <DiagButton onClick={() => setStage("speaking")} disabled={writingWords < 20} className="w-full mt-6">Continue to Speaking <ChevronRight size={16} /></DiagButton>
              </>
            )}

            {stage === "speaking" && (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <Mic size={18} style={{ color: "var(--primary)" }} />
                  <h2 className="eai-display text-lg font-bold">Speaking</h2>
                </div>
                <div className="p-4 rounded-2xl eai-soft mt-3">
                  <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>{IELTS_CONTENT.speaking.cueCard}</p>
                  <ul className="mt-2 space-y-1">
                    {IELTS_CONTENT.speaking.bulletPoints.map((b) => (
                      <li key={b} className="text-xs eai-muted flex items-start gap-1.5"><Circle size={5} className="mt-1.5 flex-shrink-0" style={{ fill: "var(--muted)" }} /> {b}</li>
                    ))}
                  </ul>
                </div>

                {!prepDone ? (
                  <div className="text-center py-8">
                    <p className="text-xs eai-muted mb-2">Preparation time</p>
                    <p className="eai-display text-4xl font-extrabold" style={{ color: "var(--primary)" }}>{prepLeft}s</p>
                    <button onClick={() => setPrepDone(true)} className="eai-focus text-xs font-semibold mt-3" style={{ color: "var(--primary)" }}>Skip preparation</button>
                  </div>
                ) : (
                  <>
                    <DiagTextarea
                      value={speakingText} onChange={(e) => setSpeakingText(e.target.value)}
                      placeholder="Type what you would say out loud…" rows={7}
                      className="w-full p-4 text-sm leading-relaxed mt-4"
                      style={{ height: "auto", resize: "vertical" }}
                    />
                    <p className="text-xs eai-muted mt-2">{speakingWords} words</p>
                    <DiagButton onClick={submitAll} disabled={speakingWords < 10} className="w-full mt-6">Submit diagnostic <ChevronRight size={16} /></DiagButton>
                  </>
                )}
              </>
            )}

            {stage === "grading" && (
              <div className="text-center py-10">
                <div className="mx-auto mb-4 grid place-items-center rounded-2xl" style={{ width: 56, height: 56, background: "var(--primary-soft)" }}>
                  <Sparkles size={26} style={{ color: "var(--primary)" }} />
                </div>
                <p className="text-sm font-semibold">Grading your responses…</p>
                <p className="text-xs eai-muted mt-1">Our AI examiner is scoring your writing and speaking.</p>
              </div>
            )}

            {stage === "results" && result && (
              <>
                <div className="text-center mb-6">
                  <p className="text-xs font-semibold eai-muted uppercase tracking-wide">Estimated overall band</p>
                  <p className="eai-display font-extrabold" style={{ fontSize: 48, color: "var(--primary)", lineHeight: 1 }}>{result.overall.toFixed(1)}</p>
                  {result.goal != null && (
                    <p className="text-xs eai-muted mt-1">
                      {result.overall >= result.goal
                        ? `🎉 You've reached your Band ${result.goal.toFixed(1)} goal!`
                        : `Goal: Band ${result.goal.toFixed(1)} · ${(result.goal - result.overall).toFixed(1)} to go`}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-6">
                  {IELTS_SKILL_META.map((s) => (
                    <div key={s.key} className="rounded-2xl p-3 text-center eai-soft">
                      <s.icon size={16} className="mx-auto mb-1.5" style={{ color: "var(--primary)" }} />
                      <p className="eai-display font-bold text-lg leading-none">{result[s.key].toFixed(1)}</p>
                      <p className="text-xs eai-muted mt-1">{s.label}</p>
                    </div>
                  ))}
                </div>
                {result.feedback.writing && (
                  <div className="p-4 rounded-2xl eai-soft mb-3">
                    <p className="text-xs font-bold flex items-center gap-1.5 mb-1"><FileText size={13} /> Writing feedback</p>
                    <p className="text-xs eai-muted leading-relaxed">{result.feedback.writing}</p>
                  </div>
                )}
                {result.feedback.speaking && (
                  <div className="p-4 rounded-2xl eai-soft mb-3">
                    <p className="text-xs font-bold flex items-center gap-1.5 mb-1"><Mic size={13} /> Speaking feedback</p>
                    <p className="text-xs eai-muted leading-relaxed">{result.feedback.speaking}</p>
                  </div>
                )}
                <DiagButton onClick={() => onComplete(result)} className="w-full mt-4">Done <ChevronRight size={16} /></DiagButton>
              </>
            )}
          </div>
          {(stage === "writing" || stage === "speaking") && <p className="text-center text-xs eai-muted mt-4">Your response is graded by AI once you submit — no feedback shown during the test.</p>}
        </div>
      </div>
    </div>
  );
}

const IELTS_SKILL_META = [
  { key: "listening", label: "Listening", icon: Headphones },
  { key: "reading", label: "Reading", icon: BookOpen },
  { key: "writing", label: "Writing", icon: FileText },
  { key: "speaking", label: "Speaking", icon: Mic },
];

function Languages({ results = {}, onTakeDiagnostic, lang = "en" }) {
  return (
    <div className="space-y-5 eai-rise">
      <div>
        <h2 className={`eai-display text-2xl font-extrabold ${lang === "km" ? "eai-km" : ""}`}>{t(lang, "langHubTitle")}</h2>
        <p className={`eai-muted text-sm mt-1 ${lang === "km" ? "eai-km" : ""}`}>{t(lang, "langHubSubtitle")}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {LANGS.map((l) => {
          const isIelts = l.n === "IELTS Academic";
          const result = results[l.n];
          const now = result ? `Band ${result.overall.toFixed(1)}` : l.now;
          const goalLabel = isIelts ? (result?.goal != null ? `Band ${result.goal.toFixed(1)}` : "Not set yet") : l.goal;
          const pct = result
            ? (isIelts && result.goal ? clamp(Math.round((result.overall / result.goal) * 100), 4, 100) : clamp(Math.round((result.overall / 9) * 100), 4, 100))
            : l.pct;
          return (
            <div key={l.n} className="eai-card p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2"><Globe size={18} style={{ color: l.c }} /><span className="eai-display font-bold">{l.n}</span></div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: "var(--bg-soft)", color: l.c }}>Goal {goalLabel}</span>
              </div>
              <div className="flex items-end justify-between mt-4 mb-2">
                <span className="text-xs eai-muted">Current: <b style={{ color: "var(--ink)" }}>{now}</b></span>
                <span className="text-xs font-bold eai-display">{pct}% there</span>
              </div>
              <div className="h-2.5 rounded-full eai-soft overflow-hidden"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: l.c, transition: "width .3s" }} /></div>

              {isIelts && result && (
                <div className="grid grid-cols-4 gap-1.5 mt-4">
                  {IELTS_SKILL_META.map((s) => (
                    <div key={s.key} className="rounded-xl px-1.5 py-2 text-center eai-soft">
                      <s.icon size={13} className="mx-auto mb-1" style={{ color: l.c }} />
                      <p className="text-[13px] font-bold eai-display leading-none">{result[s.key].toFixed(1)}</p>
                      <p className="text-[10px] eai-muted mt-0.5 leading-none">{s.label}</p>
                    </div>
                  ))}
                </div>
              )}

              {isIelts ? (
                <button onClick={() => onTakeDiagnostic(l.n)} className={`eai-btn eai-focus w-full mt-4 py-2 text-sm text-white flex items-center justify-center gap-1.5 ${lang === "km" ? "eai-km" : ""}`} style={{ background: "var(--primary)" }}>
                  <ClipboardCheck size={15} /> {result ? t(lang, "retakeDiagnostic") : t(lang, "takeDiagnostic")}
                </button>
              ) : (
                <button disabled className={`eai-btn w-full mt-4 py-2 text-sm eai-soft cursor-not-allowed ${lang === "km" ? "eai-km" : ""}`} style={{ color: "var(--muted)" }}>
                  {t(lang, "comingSoon")}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Progress({ p, practice = {}, bonusXp = 0, lang = "en", weeklyStudyHours = [] }) {
  const xp = p.xp + bonusXp;
  const [openSubject, setOpenSubject] = useState(null);
  const weeklyTotalHours = weeklyStudyHours.reduce((sum, x) => sum + x.h, 0);

  // ── Live data collected from the Practice section ───────────────
  const entries = Object.values(practice);
  const isToday = (ts) => new Date(ts).toDateString() === new Date().toDateString();
  const attempted = entries.filter((e) => e.result);
  const completed = entries.filter((e) => e.status === "completed");
  const todayCompleted = completed.filter((e) => isToday(e.at));
  const todayAttempts = attempted.filter((e) => isToday(e.at));
  const correctCount = attempted.filter((e) => e.result === "correct").length;
  const accuracy = attempted.length ? Math.round((correctCount / attempted.length) * 100) : null;
  const mistakes = attempted.length - correctCount;
  const recent = [...completed].sort((a, b) => b.at - a.at).slice(0, 4);
  const live = { completedLessons: completed.length, quizScore: accuracy, mistakes };

  // ── Leaderboard: mock classmates + the current user, ranked live by XP ───
  const leaderboard = useMemo(() => {
    const entries2 = [...LEADERBOARD_SEED, { name: p.name, xp, isYou: true }];
    return entries2.sort((a, b) => b.xp - a.xp).map((e, i) => ({ ...e, rank: i + 1 }));
  }, [p.name, xp]);
  const you = leaderboard.find((e) => e.isYou);

  return (
    <div className="space-y-5 eai-rise">
      <div>
        <h2 className={`eai-display text-2xl font-extrabold ${lang === "km" ? "eai-km" : ""}`}>{t(lang, "navProgress")}</h2>
        <p className={`eai-muted text-sm mt-1 ${lang === "km" ? "eai-km" : ""}`}>{t(lang, "progressDesc")}</p>
      </div>

      {/* Today's progress — collected from Practice */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { l: t(lang, "doneToday"), v: `${todayCompleted.length}`, sub: "exercises", c: "var(--jade)", icon: CheckCircle2 },
          { l: t(lang, "attemptedToday"), v: `${todayAttempts.length}`, sub: "questions", c: "var(--primary)", icon: Target },
          { l: t(lang, "accuracyWord"), v: accuracy != null ? `${accuracy}%` : "—", sub: "all time", c: "var(--gold)", icon: ClipboardCheck },
          { l: t(lang, "xpToday"), v: `+${todayCompleted.length * 30}`, sub: "from practice", c: "var(--ember)", icon: Zap },
        ].map((s) => (
          <div key={s.l} className="eai-card p-4 flex items-center gap-3">
            <div className="grid place-items-center rounded-xl flex-shrink-0" style={{ width: 38, height: 38, background: "var(--bg-soft)" }}>
              <s.icon size={18} style={{ color: s.c }} />
            </div>
            <div className="min-w-0">
              <p className="eai-display text-xl font-extrabold leading-none">{s.v}</p>
              <p className={`text-xs eai-muted mt-0.5 truncate ${lang === "km" ? "eai-km" : ""}`}>{s.l}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Exam readiness — a composite estimate, presented as a range rather than a guarantee */}
        <div className="eai-card p-6 relative overflow-hidden">
          <CardHead title={lang === "km" ? "ភាពត្រៀមខ្លួនប្រឡង" : "Exam readiness"} />
          <div className="flex flex-col items-center -mb-2">
            <Gauge value={p.readiness.overall} />
            <div style={{ marginTop: -68, textAlign: "center" }}>
              <p className="eai-display text-4xl font-extrabold" style={{ color: "var(--jade)" }}>{p.readiness.overall}%</p>
              <p className={`text-xs eai-muted ${lang === "km" ? "eai-km" : ""}`}>{t(lang, "estimatedRange")} {p.gradeRange}</p>
            </div>
          </div>
          <div className="space-y-2 mt-6">
            {[
              { l: t(lang, "knowledgeMastery"), v: p.readiness.mastery },
              { l: t(lang, "syllabusCoverage"), v: p.readiness.coverage },
              { l: t(lang, "studyConsistency"), v: p.readiness.consistency },
              { l: t(lang, "completionSpeed"), v: p.readiness.speed },
            ].map((r) => (
              <div key={r.l} className="flex items-center gap-2">
                <span className={`text-xs eai-muted flex-1 ${lang === "km" ? "eai-km" : ""}`}>{r.l}</span>
                <div className="w-16 h-1.5 rounded-full eai-soft overflow-hidden"><div className="h-full rounded-full" style={{ width: `${r.v}%`, background: "var(--primary)" }} /></div>
                <span className="text-xs font-bold w-8 text-right eai-display">{r.v}%</span>
              </div>
            ))}
          </div>
          <p className={`text-xs eai-muted mt-4 leading-relaxed ${lang === "km" ? "eai-km" : ""}`}>
            {t(lang, "estimateNotGuarantee")} {p.priorityTopic && <>{t(lang, "liftingWillMove1")} <span style={{ color: "var(--ember)", fontWeight: 600 }}>{topicLabel(p.priorityTopic.t, lang)}</span> {t(lang, "liftingWillMove2")}</>}
          </p>
        </div>

        {/* Weekly hours */}
        <div className="eai-card p-6 lg:col-span-2">
          <CardHead title={t(lang, "weeklyStudyHours")}
            action={<Pill icon={Clock} color="var(--primary)" soft="var(--primary-soft)" value={`${weeklyTotalHours.toFixed(1)}h`} label={t(lang, "thisWeek")} />} />
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyStudyHours} margin={{ top: 5, right: 5, left: -22, bottom: 0 }}>
                <defs>
                  <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--jade)" stopOpacity={0.35} /><stop offset="100%" stopColor="var(--jade)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                <XAxis dataKey="d" tick={{ fill: "var(--muted)", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "var(--muted)", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, fontSize: 12 }} formatter={(v) => [`${v}h`, "Studied"]} />
                <Area type="monotone" dataKey="h" stroke="var(--jade)" strokeWidth={2.5} fill="url(#g2)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="eai-card p-6">
        <CardHead title={t(lang, "leaderboard")}
          action={<span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 ${lang === "km" ? "eai-km" : ""}`} style={{ background: "var(--gold-soft)", color: "var(--gold)" }}><Trophy size={12} /> {t(lang, "thisWeek")}</span>} />
        <div className="space-y-1.5">
          {leaderboard.slice(0, 8).map((e) => (
            <div key={e.name} className="flex items-center gap-3 p-2.5 rounded-2xl" style={{ background: e.isYou ? "var(--primary-soft)" : "transparent" }}>
              <div className="grid place-items-center rounded-full flex-shrink-0 eai-display font-bold text-xs" style={{
                width: 28, height: 28,
                background: e.rank === 1 ? "var(--gold-soft)" : e.rank === 3 ? "var(--ember-soft)" : "var(--bg-soft)",
                color: e.rank === 1 ? "var(--gold)" : e.rank === 3 ? "var(--ember)" : "var(--muted)",
              }}>
                {e.rank === 1 ? <Crown size={14} /> : e.rank}
              </div>
              <p className="text-sm font-semibold truncate flex-1 min-w-0" style={{ color: e.isYou ? "var(--primary)" : "var(--ink)" }}>
                {e.name}{e.isYou && <span className={`text-xs eai-muted font-normal ${lang === "km" ? "eai-km" : ""}`}> · {t(lang, "youWord")}</span>}
              </p>
              <span className="text-xs font-bold eai-display flex items-center gap-1 flex-shrink-0" style={{ color: "var(--gold)" }}>
                <Zap size={12} /> {e.xp.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
        {you.rank > 8 && (
          <p className={`text-xs eai-muted mt-3 text-center ${lang === "km" ? "eai-km" : ""}`}>{t(lang, "youreRanked")} #{you.rank} {t(lang, "ofWord")} {leaderboard.length} · {you.xp.toLocaleString()} XP</p>
        )}
      </div>

      {/* AI Learning Analytics */}
      <div className="eai-card p-6">
        <CardHead title={t(lang, "aiLearningAnalytics")}
          action={<span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 ${lang === "km" ? "eai-km" : ""}`} style={{ background: "var(--primary-soft)", color: "var(--primary)" }}><Sparkles size={12} /> {t(lang, "liveWord")}</span>} />
        <p className={`text-xs eai-muted -mt-2 mb-4 ${lang === "km" ? "eai-km" : ""}`}>{t(lang, "coachAnalyzes")}</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {analyticsSignals(p, live).map((sig, i) => (
            <div key={i} className="eai-tile p-3.5 rounded-2xl border" style={{ borderColor: "var(--line)" }}>
              <div className="flex items-center justify-between">
                <div className="grid place-items-center rounded-xl" style={{ width: 32, height: 32, background: "var(--bg-soft)" }}>
                  <sig.icon size={16} style={{ color: "var(--primary)" }} />
                </div>
                <span className="eai-display font-bold text-sm">{sig.value}</span>
              </div>
              <p className="text-xs font-semibold mt-2.5">{sig.label}</p>
              <p className="text-xs eai-muted">{sig.note}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Subject mastery + weak/strong — tap a subject to see its topic-by-topic breakdown */}
        <div className="eai-card p-6 lg:col-span-2">
          <CardHead title={t(lang, "subjectMastery")} />
          <div className="space-y-1">
            {p.subjects.map((s) => {
              const isOpen = openSubject === s.s;
              return (
                <div key={s.s}>
                  <button onClick={() => setOpenSubject(isOpen ? null : s.s)} className="eai-focus w-full flex items-center gap-3 py-1.5">
                    <span className={`text-sm font-semibold w-32 truncate text-left ${lang === "km" ? "eai-km" : ""}`}>{subjectLabel(s.s, lang)}</span>
                    <div className="flex-1 h-2.5 rounded-full eai-soft overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${s.m ?? 0}%`, background: s.tag === "weak" ? "var(--ember)" : s.tag === "strong" ? "var(--jade)" : "var(--primary)" }} />
                    </div>
                    <span className="text-xs font-bold w-9 text-right eai-display">{s.m != null ? `${s.m}%` : "—"}</span>
                    <span className="text-xs flex items-center gap-0.5 w-10" style={{ color: s.t >= 0 ? "var(--jade)" : "var(--ember)" }}>
                      {s.t >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}{Math.abs(s.t)}
                    </span>
                    <ChevronRight size={14} className="eai-muted flex-shrink-0" style={{ transform: isOpen ? "rotate(90deg)" : "none", transition: "transform .15s ease" }} />
                  </button>
                  {isOpen && (
                    <div className="pl-4 pb-2.5 pt-0.5 space-y-1.5">
                      {s.topics.map((t) => (
                        <div key={t.t} className="flex items-center gap-3">
                          <span className={`text-xs eai-muted w-28 truncate ${lang === "km" ? "eai-km" : ""}`}>{topicLabel(t.t, lang)}</span>
                          <div className="flex-1 h-1.5 rounded-full eai-soft overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${t.score ?? 0}%`, background: LEVEL_COLOR[masteryLevel(t.score)] }} />
                          </div>
                          <span className="text-xs w-9 text-right eai-muted">{t.score != null ? `${t.score}%` : "—"}</span>
                          <span className={`text-xs w-20 text-right eai-muted ${lang === "km" ? "eai-km" : ""}`}>{levelLabel(masteryLevel(t.score), lang)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            {p.strong.map((s) => <span key={s.s} className={`text-xs font-semibold px-2.5 py-1 rounded-full ${lang === "km" ? "eai-km" : ""}`} style={{ background: "var(--jade-soft)", color: "var(--jade)" }}>💪 {subjectLabel(s.s, lang)}</span>)}
            {p.weak.map((s) => <span key={s.s} className={`text-xs font-semibold px-2.5 py-1 rounded-full ${lang === "km" ? "eai-km" : ""}`} style={{ background: "var(--ember-soft)", color: "var(--ember)" }}>⚠ {subjectLabel(s.s, lang)}</span>)}
          </div>
        </div>

        {/* AI recommendations */}
        <div className="eai-card p-6">
          <CardHead title={t(lang, "aiRecommendations")} />
          <div className="space-y-3">
            {p.recs.map((r, i) => (
              <div key={i} className="flex gap-3 p-3 rounded-2xl eai-soft">
                <div className="grid place-items-center rounded-xl flex-shrink-0" style={{ width: 34, height: 34, background: "var(--card)" }}>
                  <r.icon size={17} style={{ color: r.c }} />
                </div>
                <div>
                  <p className="text-sm font-semibold leading-snug">{r.t}</p>
                  <p className="text-xs eai-muted mt-0.5 leading-relaxed">{r.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Weekly + Monthly goals */}
        <div className="eai-card p-6">
          <CardHead title={t(lang, "goalsWord")} />
          <div className="space-y-4">
            {[{ l: t(lang, "weeklyWord"), v: "0.5 / 8h", p: 6, c: "var(--gold)" }, { l: t(lang, "monthlyWord"), v: "1 / 24 lessons", p: 4, c: "var(--jade)" }].map((g) => (
              <div key={g.l}>
                <div className="flex justify-between text-sm mb-1.5"><span className={`font-semibold ${lang === "km" ? "eai-km" : ""}`}>{g.l} {t(lang, "goalWord")}</span><span className="eai-muted text-xs">{g.v}</span></div>
                <div className="h-2 rounded-full eai-soft overflow-hidden"><div className="h-full rounded-full" style={{ width: `${g.p}%`, background: g.c }} /></div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div className="eai-card p-6">
          <CardHead title={t(lang, "recentActivity")} />
          <div className="space-y-3">
            {(recent.length
              ? recent.map((e) => ({
                  t: `${t(lang, "completedWord")} ${e.subject}: ${e.topic}`,
                  meta: `${e.result === "correct" ? t(lang, "correctWord") : t(lang, "reviewedWord")} · +30 XP`,
                  c: e.result === "correct" ? "var(--jade)" : "var(--gold)",
                  icon: CheckCircle2,
                }))
              : [
                  { t: t(lang, "createdAccount"), meta: t(lang, "welcomeAboard"), c: "var(--jade)", icon: GraduationCap },
                  { t: `${t(lang, "joinedTrack")} ${lang === "km" ? FIELD_META[p.field].km : FIELD_META[p.field].label}`, meta: t(lang, "subjectsPersonalized"), c: "var(--primary)", icon: FileText },
                  { t: t(lang, "aiBuiltPlan"), meta: t(lang, "basedOnWeak"), c: "var(--gold)", icon: Sparkles },
                ]
            ).map((a, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="grid place-items-center rounded-xl flex-shrink-0" style={{ width: 32, height: 32, background: "var(--bg-soft)" }}>
                  <a.icon size={16} style={{ color: a.c }} />
                </div>
                <div className={`min-w-0 ${lang === "km" ? "eai-km" : ""}`}><p className="text-sm font-medium truncate">{a.t}</p><p className="text-xs eai-muted">{a.meta}</p></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════ University Hub ════════════════════════
   Replaces Dashboard/Browse/Practice/Progress for university profiles — none of the BAC II
   mastery engine applies here (see deriveInsights' university branch above), so this section
   builds its own lightweight views straight off `p.universityProfile` instead. */
/* Per-course mastery chips + a "recommended next" callout, shown above Continue Learning when
   the student's major has real quiz content (today: computer_science only). Reads p.universityInsights
   (deriveUniInsights' output) rather than recomputing anything itself. */
function UniversityMasteryWidget({ p, up, onPracticeCourse, lang = "en" }) {
  const ui = p.universityInsights;
  if (!ui?.contentAvailable) return null;
  const courses = UNI_COURSES[up.major] || [];
  const rec = ui.recommendedLesson;
  const recCourse = rec ? courses.find((c) => `${up.major}::${c.title}` === rec.subject) : null;

  return (
    <div className="eai-card p-6">
      <CardHead title={t(lang, "uniHubYourProgress")} />
      {rec && recCourse && (
        <button onClick={() => onPracticeCourse(recCourse.id)}
          className={`eai-focus w-full flex items-center justify-between gap-3 p-4 rounded-2xl text-left mb-4 ${lang === "km" ? "eai-km" : ""}`}
          style={{ background: "var(--ember-soft)" }}>
          <div className="flex items-center gap-2.5 min-w-0">
            <Lightbulb size={18} style={{ color: "var(--ember)", flexShrink: 0 }} />
            <div className="min-w-0">
              <p className="text-sm font-bold truncate" style={{ color: "var(--ember)" }}>{t(lang, "uniHubRecommendedNext")}</p>
              <p className="text-xs eai-muted truncate">{topicLabel(rec.topic, lang)} · {lang === "km" ? recCourse.titleKm : recCourse.title}</p>
            </div>
          </div>
          <ChevronRight size={16} style={{ color: "var(--ember)", flexShrink: 0 }} />
        </button>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {ui.subjects.map((sub) => {
          const course = courses.find((c) => `${up.major}::${c.title}` === sub.s);
          if (!course) return null;
          return (
            <button key={sub.s} onClick={() => onPracticeCourse(course.id)} className="eai-tile eai-focus p-4 rounded-2xl border text-left" style={{ borderColor: "var(--line)" }}>
              <div className="flex items-center justify-between gap-2">
                <span className={`text-sm font-semibold truncate ${lang === "km" ? "eai-km" : ""}`}>{lang === "km" ? course.titleKm : course.title}</span>
                {sub.tag === "weak" && <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${lang === "km" ? "eai-km" : ""}`} style={{ background: "var(--ember-soft)", color: "var(--ember)" }}>{t(lang, "focusArea")}</span>}
                {sub.tag === "strong" && <span className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: "var(--jade-soft)", color: "var(--jade)" }}>{sub.level}</span>}
              </div>
              <div className="h-1.5 rounded-full eai-soft mt-3 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${sub.m ?? 0}%`, background: sub.tag === "weak" ? "var(--ember)" : "var(--jade)" }} />
              </div>
              <p className="text-xs eai-muted mt-1.5">{sub.m != null ? `${sub.m}% · ${sub.level}` : t(lang, "notAssessedYet")}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function UniversityHub({ p, go, onPracticeCourse, lang = "en" }) {
  const up = p.universityProfile || {};
  const major = UNI_FIELDS.find((f) => f.id === up.major);
  const year = UNI_YEARS.find((y) => y.id === up.year);
  const courses = UNI_COURSES[up.major] || [];
  const goals = up.goals || [];
  const [openCourse, setOpenCourse] = useState(null);

  return (
    <div className="space-y-5 eai-rise">
      <div>
        <h2 className={`eai-display text-2xl font-extrabold ${lang === "km" ? "eai-km" : ""}`}>{t(lang, "dashGreetingPrefix")} {p.name.split(" ")[0]}</h2>
        <p className={`eai-muted text-sm mt-1 ${lang === "km" ? "eai-km" : ""}`}>
          {major ? (lang === "km" ? major.labelKm : major.label) : ""}{year ? ` · ${lang === "km" ? year.labelKm : year.label}` : ""}
        </p>
      </div>

      {goals.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {goals.map((gid) => {
            const g = UNI_GOALS.find((x) => x.id === gid);
            if (!g) return null;
            return (
              <span key={gid} className={`text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 ${lang === "km" ? "eai-km" : ""}`} style={{ background: "var(--primary-soft)", color: "var(--primary)" }}>
                <g.icon size={12} /> {lang === "km" ? g.labelKm : g.label}
              </span>
            );
          })}
        </div>
      )}

      <UniversityMasteryWidget p={p} up={up} onPracticeCourse={onPracticeCourse} lang={lang} />

      {/* Continue Learning */}
      <div className="eai-card p-6">
        <CardHead title={t(lang, "uniHubContinueLearning")} />
        {courses.length ? (
          <div className="space-y-3">
            {courses.map((c) => {
              const isOpen = openCourse === c.id;
              return (
                <div key={c.id} className="eai-card overflow-hidden">
                  <button onClick={() => setOpenCourse(isOpen ? null : c.id)} className="eai-focus w-full flex items-center justify-between gap-3 p-4 text-left">
                    <div className="flex items-center gap-2 min-w-0">
                      <BookOpen size={16} style={{ color: "var(--primary)", flexShrink: 0 }} />
                      <span className={`eai-display font-bold text-sm truncate ${lang === "km" ? "eai-km" : ""}`}>{lang === "km" ? c.titleKm : c.title}</span>
                      <span className="text-xs eai-muted flex-shrink-0">({c.lessons.length})</span>
                    </div>
                    <ChevronRight size={16} className="eai-muted flex-shrink-0" style={{ transform: isOpen ? "rotate(90deg)" : "none", transition: "transform .15s ease" }} />
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 space-y-2.5 border-t" style={{ borderColor: "var(--line)" }}>
                      {(lang === "km" ? c.lessonsKm : c.lessons).map((l, i) => (
                        <div key={i} className="flex items-center gap-2 pt-3">
                          <Circle size={5} style={{ fill: "var(--muted)" }} className="flex-shrink-0" />
                          <span className={`text-sm ${lang === "km" ? "eai-km" : ""}`}>{l}</span>
                        </div>
                      ))}
                      {UNI_QUIZ_BANK[`${up.major}::${c.title}`] ? (
                        <button onClick={() => onPracticeCourse(c.id)} className={`eai-btn eai-focus text-xs font-semibold py-2 px-3 mt-1 ${lang === "km" ? "eai-km" : ""}`} style={{ background: "var(--primary)", color: "white" }}>
                          {t(lang, "practiceThisCourse")}
                        </button>
                      ) : (
                        <p className={`text-xs eai-muted pt-1 ${lang === "km" ? "eai-km" : ""}`}>{t(lang, "uniHubLessonsComingSoon")}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className={`text-sm eai-muted ${lang === "km" ? "eai-km" : ""}`}>{t(lang, "uniHubCoursesComingSoon")}</p>
        )}
      </div>

      {/* Explore teaser */}
      <div className="eai-card p-6">
        <CardHead title={t(lang, "navExplore")} action={<button onClick={() => go("explore")} className={`eai-focus text-xs font-semibold ${lang === "km" ? "eai-km" : ""}`} style={{ color: "var(--primary)" }}>{t(lang, "viewWord")}</button>} />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { icon: Sparkles, label: t(lang, "askAiCoach"), tab: "coach" },
            { icon: Mic, label: "IELTS / TOEFL", tab: "languages" },
            { icon: Landmark, label: t(lang, "navUniversities"), tab: "universities" },
          ].map((it) => (
            <button key={it.tab} onClick={() => go(it.tab)} className={`eai-tile eai-focus p-4 rounded-2xl border text-left ${lang === "km" ? "eai-km" : ""}`} style={{ borderColor: "var(--line)" }}>
              <it.icon size={20} style={{ color: "var(--primary)" }} />
              <p className="text-sm font-semibold mt-2">{it.label}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* Full-page "Explore" hub for university profiles — categorized links to what already exists
   today. Discover/Practice used to be hard-stubbed disabled tiles; both are now real, with
   Practice conditionally enabled only for majors that have quiz content (today: computer_science)
   so it never dead-ends into an empty screen for other majors. Reachable from UNI_NAV and from
   the Hub's teaser row. */
function UniversityExplore({ p, go, lang = "en" }) {
  const up = p.universityProfile || {};
  const hasQuizzes = Object.keys(UNI_QUIZ_BANK).some((key) => key.startsWith(`${up.major}::`));
  const categories = [
    { title: t(lang, "exploreLearnTitle"), items: [
      { icon: Sparkles, label: t(lang, "askAiCoach"), onClick: () => go("coach") },
    ] },
    { title: t(lang, "explorePrepareTitle"), items: [
      { icon: Mic, label: "IELTS / TOEFL", onClick: () => go("languages") },
    ] },
    { title: t(lang, "exploreDiscoverTitle"), items: [
      { icon: Landmark, label: t(lang, "navUniversities"), onClick: () => go("universities") },
      { icon: DollarSign, label: t(lang, "scholarshipsWord"), onClick: () => go("scholarships") },
    ] },
    { title: t(lang, "explorePracticeTitle"), items: [
      { icon: Target, label: t(lang, "quizzesMockExams"), onClick: () => go("uniPractice"), disabled: !hasQuizzes },
    ] },
  ];
  return (
    <div className="space-y-5 eai-rise">
      <div>
        <h2 className={`eai-display text-2xl font-extrabold ${lang === "km" ? "eai-km" : ""}`}>{t(lang, "navExplore")}</h2>
        <p className={`eai-muted text-sm mt-1 ${lang === "km" ? "eai-km" : ""}`}>{t(lang, "uniExploreDesc")}</p>
      </div>
      {categories.map((cat) => (
        <div key={cat.title} className="eai-card p-6">
          <CardHead title={cat.title} />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {cat.items.map((it) => (
              <button key={it.label} onClick={it.onClick} disabled={it.disabled}
                className={`eai-tile eai-focus p-4 rounded-2xl border text-left ${it.disabled ? "cursor-not-allowed" : ""} ${lang === "km" ? "eai-km" : ""}`}
                style={{ borderColor: "var(--line)", opacity: it.disabled ? 0.6 : 1 }}>
                <it.icon size={20} style={{ color: "var(--primary)" }} />
                <p className="text-sm font-semibold mt-2">{it.label}</p>
                {it.disabled && <p className={`text-xs eai-muted mt-0.5 ${lang === "km" ? "eai-km" : ""}`}>{t(lang, "comingSoon")}</p>}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* Lightweight Progress view for university profiles — the BAC II Progress component's "Exam
   readiness"/"Subject mastery" framing doesn't apply here, so this shows what's honestly real:
   streak/XP/leaderboard always, plus real per-course mastery once the student's major has quiz
   content (via p.universityInsights) — a "coming soon" note only for majors that don't yet. */
function UniversityProgress({ p, lang = "en" }) {
  const ui = p.universityInsights;
  const leaderboard = useMemo(() => {
    const entries = [...LEADERBOARD_SEED, { name: p.name, xp: p.xp, isYou: true }];
    return entries.sort((a, b) => b.xp - a.xp).map((e, i) => ({ ...e, rank: i + 1 }));
  }, [p.name, p.xp]);
  const you = leaderboard.find((e) => e.isYou);

  return (
    <div className="space-y-5 eai-rise">
      <div>
        <h2 className={`eai-display text-2xl font-extrabold ${lang === "km" ? "eai-km" : ""}`}>{t(lang, "navProgress")}</h2>
        <p className={`eai-muted text-sm mt-1 ${lang === "km" ? "eai-km" : ""}`}>{t(lang, "uniProgressDesc")}</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { l: t(lang, "streakKeepIt"), v: `${p.streak}`, icon: Flame, c: "var(--ember)" },
          { l: "XP", v: p.xp.toLocaleString(), icon: Zap, c: "var(--gold)" },
          { l: "Level", v: `${p.level}`, icon: TrendingUp, c: "var(--primary)" },
        ].map((s) => (
          <div key={s.l} className="eai-card p-4 flex items-center gap-3">
            <div className="grid place-items-center rounded-xl flex-shrink-0" style={{ width: 38, height: 38, background: "var(--bg-soft)" }}>
              <s.icon size={18} style={{ color: s.c }} />
            </div>
            <div className="min-w-0">
              <p className="eai-display text-xl font-extrabold leading-none">{s.v}</p>
              <p className={`text-xs eai-muted mt-0.5 truncate ${lang === "km" ? "eai-km" : ""}`}>{s.l}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="eai-card p-6">
        <CardHead title={t(lang, "leaderboard")} />
        <div className="space-y-1.5">
          {leaderboard.slice(0, 8).map((e) => (
            <div key={e.name} className="flex items-center gap-3 p-2.5 rounded-2xl" style={{ background: e.isYou ? "var(--primary-soft)" : "transparent" }}>
              <div className="grid place-items-center rounded-full flex-shrink-0 eai-display font-bold text-xs" style={{
                width: 28, height: 28,
                background: e.rank === 1 ? "var(--gold-soft)" : e.rank === 3 ? "var(--ember-soft)" : "var(--bg-soft)",
                color: e.rank === 1 ? "var(--gold)" : e.rank === 3 ? "var(--ember)" : "var(--muted)",
              }}>
                {e.rank === 1 ? <Crown size={14} /> : e.rank}
              </div>
              <p className="text-sm font-semibold truncate flex-1 min-w-0" style={{ color: e.isYou ? "var(--primary)" : "var(--ink)" }}>
                {e.name}{e.isYou && <span className={`text-xs eai-muted font-normal ${lang === "km" ? "eai-km" : ""}`}> · {t(lang, "youWord")}</span>}
              </p>
              <span className="text-xs font-bold eai-display flex items-center gap-1 flex-shrink-0" style={{ color: "var(--gold)" }}>
                <Zap size={12} /> {e.xp.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
        {you.rank > 8 && (
          <p className={`text-xs eai-muted mt-3 text-center ${lang === "km" ? "eai-km" : ""}`}>#{you.rank} · {you.xp.toLocaleString()} XP</p>
        )}
      </div>

      {ui?.contentAvailable ? (
        <div className="eai-card p-6">
          <CardHead title={t(lang, "uniHubYourProgress")} />
          <div className="space-y-2.5">
            {ui.subjects.map((sub) => (
              <div key={sub.s} className="flex items-center gap-3">
                <span className="text-sm font-medium flex-1 min-w-0 truncate">{sub.s.split("::")[1] || sub.s}</span>
                <div className="h-1.5 rounded-full eai-soft overflow-hidden flex-shrink-0" style={{ width: 100 }}>
                  <div className="h-full rounded-full" style={{ width: `${sub.m ?? 0}%`, background: sub.tag === "weak" ? "var(--ember)" : "var(--jade)" }} />
                </div>
                <span className="text-xs eai-muted flex-shrink-0" style={{ width: 70, textAlign: "right" }}>{sub.m != null ? `${sub.m}% ${sub.level}` : t(lang, "notAssessedYet")}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="eai-card p-6 text-center">
          <p className={`text-sm eai-muted ${lang === "km" ? "eai-km" : ""}`}>{t(lang, "uniProgressComingSoon")}</p>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════ AI Coach (self-contained demo tutor) ════════════════════════ */
/* Profile-aware scripted replies — no backend or API key needed. Extend SCRIPTS freely. */

/* ── Major-guidance mode: matches subjects/interests against the real UNI_MAJORS database. ── */
const SUBJECT_MAJOR_KEYWORDS = {
  Mathematics: ["mathematics", "data", "statistics", "engineering", "computer", "finance", "economics", "actuarial", "supply chain"],
  Physics: ["physics", "engineering", "electrical", "mechanical", "renewable", "electronics", "robotics"],
  Chemistry: ["chemistry", "chemical", "food", "biotechnology", "pharmacy"],
  Biology: ["biology", "environmental", "biotechnology", "bio-engineering", "medicine", "medical", "dental", "nursing", "midwifery", "health"],
  "Khmer Literature": ["literature", "khmer", "linguistics", "communication", "journalism", "media"],
  History: ["history", "tourism", "international relations", "political"],
  English: ["english", "communication", "international", "translation", "tourism"],
  French: ["french", "translation", "tourism", "international"],
  Geography: ["geography", "land management", "environmental", "urban"],
  Morality: ["law", "public administration", "political", "philosophy"],
  "Earth Science": ["geology", "environmental", "geo-resources", "petroleum"],
};
const MAJOR_INTEREST_KEYWORDS = {
  engineering: ["engineering"], law: ["law"], medicine: ["biology", "health", "medicine", "medical", "dental", "pharmacy", "nursing"],
  business: ["business", "management", "marketing", "finance", "accounting"],
  "it": ["computer", "software", "information technology", "data", "cyber"],
  computer: ["computer", "software", "information technology", "data", "cyber"],
  design: ["design", "architecture"], tourism: ["tourism", "hospitality"],
  teaching: ["education", "teaching", "tefl"], economics: ["economics"],
};

function findMajorsForKeywords(keywords, limit = 5) {
  const found = new Map(); // major name -> Set of university abbreviations
  Object.entries(UNI_MAJORS).forEach(([abbr, faculties]) => {
    faculties.forEach((f) => {
      f.majors.forEach((m) => {
        const hay = `${m.n} ${f.faculty} ${m.d}`.toLowerCase();
        if (keywords.some((k) => hay.includes(k))) {
          if (!found.has(m.n)) found.set(m.n, new Set());
          found.get(m.n).add(abbr);
        }
      });
    });
  });
  return [...found.entries()].slice(0, limit).map(([name, unis]) => `${name} (${[...unis].join(", ")})`);
}

// Word-boundary matching — plain .includes() false-positives on short words (e.g. "it" inside
// "f-it-s", "hi" inside "t-hi-s"). Escapes regex metacharacters since phrases come from data.
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const hasWord = (text, phrase) => new RegExp(`\\b${escapeRegex(phrase)}\\b`, "i").test(text);

function majorCoachReply(text, p) {
  const t = text.toLowerCase();

  // 1) Did they mention one of their own subjects by name?
  const mentioned = p.subjects.find((s) => hasWord(t, s.s.toLowerCase()));
  if (mentioned) {
    const hits = findMajorsForKeywords(SUBJECT_MAJOR_KEYWORDS[mentioned.s] || [mentioned.s.toLowerCase()]);
    const pct = mentioned.m != null ? ` (${mentioned.m}%)` : "";
    return hits.length
      ? `Since you're working with ${mentioned.s}${pct}, here are real majors that build on it:\n${hits.map((h) => `• ${h}`).join("\n")}\n\nWant full descriptions? Check the Universities tab, or ask me about a specific one.`
      : `${mentioned.s} doesn't map cleanly to a specific major on its own, but it's useful background for a lot of degrees. Tell me an interest area (engineering, law, business, medicine, IT...) and I'll narrow it down.`;
  }

  // 2) Direct interest keywords (engineering, law, medicine, business, IT...)
  for (const [key, kws] of Object.entries(MAJOR_INTEREST_KEYWORDS)) {
    if (hasWord(t, key)) {
      const hits = findMajorsForKeywords(kws);
      if (hits.length) return `Here are real ${key}-related majors across Cambodian universities:\n${hits.map((h) => `• ${h}`).join("\n")}\n\nWant me to compare two of these, or check which one fits your strongest subjects?`;
    }
  }

  // 3) "What major should I choose" / general guidance from their strongest subjects
  if (/\b(major|career|university)\b|which.*degree|what should i (study|major)|choose.*major/.test(t)) {
    const top = p.strong.slice(0, 2).map((s) => s.s);
    if (top.length) {
      const hits = findMajorsForKeywords(top.flatMap((s) => SUBJECT_MAJOR_KEYWORDS[s] || [s.toLowerCase()]));
      return `Based on your strongest subjects (${top.join(", ")}), here's where I'd start looking:\n${hits.length ? hits.map((h) => `• ${h}`).join("\n") : "Browse the Universities tab to explore matching majors."}\n\nOr tell me an interest — engineering, law, business, medicine, IT, design, tourism — and I'll pull real options.`;
    }
    return `I don't have a strong-subject signal for you yet — complete the diagnostic assessment so I can ground this in your real mastery. In the meantime, tell me a subject you enjoy or an interest area and I'll suggest real majors from Cambodian universities.`;
  }

  // 4) Fallback
  return `I can help you find a major that fits. Tell me a subject you enjoy (like Physics or Khmer Literature), an interest area (engineering, law, business, medicine, IT, design, tourism), or ask "what major fits my strengths?"`;
}

function coachReply(text, p) {
  const t = text.toLowerCase();
  const weakest = p.weak[0]?.s;
  const strongest = p.strong[0]?.s;

  // 1) Did they mention one of their own subjects by name?
  const mentioned = p.subjects.find((s) => hasWord(t, s.s.toLowerCase()));
  if (mentioned) {
    const tag = mentioned.tag === "weak" ? "your weakest area — high impact"
      : mentioned.tag === "strong" ? "already a strength, so keep it sharp with light revision"
      : "tracking steadily";
    const focusTopic = [...mentioned.topics].sort((a, b) => (a.score ?? 999) - (b.score ?? 999))[0]?.t || mentioned.s;
    const pct = mentioned.m != null ? `${mentioned.m}%` : "not yet assessed";
    return `${mentioned.s} is at ${pct} (${tag}). I'd start with "${focusTopic}" — do a short lesson, then 8–10 practice questions and review every mistake. Want me to turn that into a 3-day mini-plan?`;
  }

  // 2) Keyword intents
  if (/\b(grade|odds|predict|chance|target)\b/.test(t))
    return `You're estimated in the ${p.gradeRange} range right now, on a ${p.avg ?? 0}% average mastery. The fastest lever is ${weakest || "your weakest subject"} — lifting it 10–15 points moves the estimate the most. Pair that with keeping your streak alive (consistency is weighted heavily) and you'll climb quickly.`;

  if (/\b(today|study|plan|start)\b|\bwhat\b.*\bdo\b/.test(t))
    return `Here's a high-impact ${"~90 min"} plan for today:\n1) ${weakest || "Your weak subject"} — ${p.priorityTopic?.t || "core review"} (35m)\n2) A timed practice set for exam stamina (40m)\n3) A quick ${strongest || "strong-subject"} revision so you don't lose mastery (15m).`;

  if (/\b(ielts|toefl|hsk|delf|english|language|band|speaking|writing)\b/.test(t))
    return `For language exams, start with a diagnostic so we know your real level per skill (listening, reading, writing, speaking). Writing usually has the most room to grow — I can give you a prompt and score it skill-by-skill. Which exam are you aiming for?`;

  if (/\bstuck\b|\bmotivat\w*\b|\bhard\b|\btired\b|\bgive up\b|\bstress\w*\b|\bworried\b|\bnervous\b/.test(t))
    return `That feeling is normal, and you're further along than you think — ${p.avg ?? 0}% average with ${p.strong.length} strong subject${p.strong.length === 1 ? "" : "s"} already. Let's shrink the goal: just 20 focused minutes on ${weakest || "one topic"} today. Small, consistent wins are exactly what move your exam-readiness estimate. You've got this. 🇰🇭`;

  if (/\b(hello|hi|hey)\b|សួស្តី|chom reap/.test(t))
    return `Hi ${p.name.split(" ")[0]}! Ready to study? You can ask me to explain a topic, build a plan, or quiz you. I'd suggest we start with ${weakest || "your weakest subject"} — that's where you'll gain the most.`;

  // 3) Fallback
  return `Good question. I can explain a concept step by step, build a study plan around your weak subjects (${p.weak.map((w) => w.s).join(", ") || "—"}), or quiz you. Try asking about your grade odds, what to study today, or a specific subject.`;
}

/* Major Guidance calls the real /api/major-guidance serverless function (Gemini, grounded in
   the real UNI_MAJORS catalog). If that call fails — no API key configured yet, network hiccup,
   rate limit — it falls back to the local scripted matcher so the feature still gives a
   grounded answer instead of an error. */
async function majorGuidanceReply(t, p, history) {
  try {
    const res = await fetch("/api/major-guidance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: t,
        history: history.map((m) => ({ role: m.role, text: m.text })),
        context: { name: p.name, field: p.field, subjects: p.subjects, weak: p.weak, strong: p.strong },
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.text) throw new Error(data.error || "Request failed");
    return data.text;
  } catch {
    return majorCoachReply(t, p);
  }
}

/* Scripted fallback for University Mentor when /api/university-mentor is unreachable. */
function universityCoachReply(text, p) {
  const t = text.toLowerCase();
  const up = p.universityProfile || {};
  const major = UNI_FIELDS.find((f) => f.id === up.major)?.label || "your field";
  const weakTopic = p.universityInsights?.weak?.[0];

  if (/\bcourse|lesson|learn|quiz|practice\b/.test(t)) {
    if (p.universityInsights?.contentAvailable) {
      return weakTopic
        ? `Head to Practice on your University Hub — your weakest spot right now is ${weakTopic.topics?.find((x) => x.score != null)?.t || weakTopic.s.split("::")[1]}, that's the fastest place to improve your average. Or tell me a specific topic and I'll explain it here.`
        : `Head to Practice on your University Hub to work through ${major} quizzes — they track your mastery per topic as you go. Or tell me a specific topic and I'll explain it here.`;
    }
    return `Check the Continue Learning section on your University Hub for a ${major} course outline. Full interactive lessons and quizzes are coming soon for this field — for now, tell me a specific topic and I'll do my best to explain it.`;
  }
  if (/\bscholarship|fund\w*\b/.test(t))
    return `Check the Scholarships tab (under Explore → Discover) for scholarships tagged to ${major}. Tell me what you're eligible for (grades, English score, target country) and I can help you narrow it down further.`;
  if (/\bcareer|job\b/.test(t))
    return `For ${major}, the strongest early moves are usually a portfolio/projects, an internship, and networking in that field. Want a starter checklist for one of those?`;
  if (/\b(hello|hi|hey)\b|សួស្តី/.test(t))
    return `Hi ${p.name.split(" ")[0]}! I'm your university mentor for ${major}. Ask me about coursework, career prep, scholarships, or studying abroad.`;

  return `I can help with ${major} coursework, career prep, scholarships, or study-abroad questions. What's on your mind?`;
}

/* University Mentor calls /api/university-mentor (same Gemini+Groq serverless pattern as Major
   Guidance), grounded in the student's major/year/goals instead of a BAC II track. Falls back to
   the scripted matcher above on any failure. */
async function universityMentorReply(t, p, history) {
  const up = p.universityProfile || {};
  try {
    const res = await fetch("/api/university-mentor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: t,
        history: history.map((m) => ({ role: m.role, text: m.text })),
        context: {
          name: p.name, major: up.major, year: up.year, goals: up.goals,
          subjects: p.universityInsights?.subjects, weak: p.universityInsights?.weak, strong: p.universityInsights?.strong,
        },
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.text) throw new Error(data.error || "Request failed");
    return data.text;
  } catch {
    return universityCoachReply(t, p);
  }
}

/* Study Help calls the FastAPI RAG server (src/api.py): answers are grounded in the ingested
   Grade 12 curriculum and come back as Markdown with $...$ / $$...$$ LaTeX. In dev, requests go
   through the Vite proxy (vite.config.js); set VITE_RAG_API_URL when the API is hosted elsewhere.
   If the server can't be reached, the scripted coach answers instead so the chat still works. */
const RAG_API = (import.meta.env.VITE_RAG_API_URL || "").replace(/\/+$/, "");
const RAG_UPLOAD_ACCEPT = ".pdf,.md,.markdown,.txt,.png,.jpg,.jpeg,.webp";
const RAG_HISTORY_TURNS = 20;

class RagError extends Error {
  constructor(message, status) { super(message); this.status = status; } // status 0 = unreachable
}

const UNREACHABLE = "The AI coach server is not reachable.";
const UNCONFIGURED =
  "This site was built without an AI coach server address (set VITE_RAG_API_URL and redeploy).";

/* Resolves to the Response when it is OK, otherwise throws a RagError with FastAPI's detail. */
async function ragRequest(path, init) {
  let res;
  try {
    res = await fetch(`${RAG_API}${path}`, init);
  } catch {
    throw new RagError(RAG_API ? UNREACHABLE : UNCONFIGURED, 0);
  }
  if (res.ok) {
    // A static host's single-page fallback answers /api/* with index.html (200 text/html)
    // instead of the API, which is what an unset VITE_RAG_API_URL looks like in production.
    if ((res.headers.get("content-type") || "").includes("text/html"))
      throw new RagError(RAG_API ? UNREACHABLE : UNCONFIGURED, 0);
    return res;
  }
  const detail = (await res.json().catch(() => null))?.detail;
  // A dev-proxy failure (server down) is a 5xx without a FastAPI error body.
  if (!detail && res.status >= 500) throw new RagError(UNREACHABLE, 0);
  const message = typeof detail === "string" ? detail
    : Array.isArray(detail) ? detail.map((d) => d.msg).join("; ")
    : `Request failed (${res.status})`;
  throw new RagError(message, res.status);
}

const ragFetch = async (path, init) => (await ragRequest(path, init)).json();

/* Yields one parsed object per line of an application/x-ndjson response. */
async function* readNdjson(res) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    let newline;
    while ((newline = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (line) yield JSON.parse(line);
    }
    if (done) break;
  }
  if (buffer.trim()) yield JSON.parse(buffer);
}

/* Chat history for the backend: only question/answer pairs the server produced, not greetings,
   upload notices, errors or offline replies. */
const toRagHistory = (history) => history
  .flatMap((m, i) => (m.role === "user" && history[i + 1]?.rag && !history[i + 1].error ? [m, history[i + 1]] : []))
  .slice(-RAG_HISTORY_TURNS)
  .map((m) => ({
    role: m.role === "user" ? "user" : "assistant",
    content: (m.historyText ?? (m.text || "(photo)")).slice(0, 20000),
  }));

/* Streams the answer from /api/query/stream; onUpdate receives the partial message as it grows
   (at most once per animation frame, since every update re-renders Markdown and math).
   Attached photos are read by the server first; onImages receives what it read. */
const TRUNCATED_STOPS = new Set(["length", "max_tokens", "MAX_TOKENS"]);

/* A full BAC II exercise runs to six or eight parts, and one model response often
   stops in the middle of part 4. Rather than handing the student half a proof and
   asking them to type "continue", pick the answer up where it stopped and keep
   streaming into the same message. Three rounds is enough for the longest past
   paper; past that the note below is honest about the limit. */
const CONTINUE_ROUNDS = 3;
const CONTINUE_CONTEXT_CHARS = 12000;
const CONTINUE_QUERY_CHARS = 800;
const KHMER_CHAR = /[\u1780-\u17ff]/;
const CONTINUE_PROMPT = {
  km: "បន្តចម្លើយពីកន្លែងដែលអ្នកឈប់។ កុំចាប់ផ្ដើមឡើងវិញ កុំនិយាយឡើងវិញ ហើយកុំសរុបអ្វីដែលបានសរសេររួច។",
  en: "Continue the answer from exactly where you stopped. Do not restart, repeat or summarise what you already wrote.",
};

/* Free hosting tiers stop the API when it is idle, so the first request after a quiet spell waits
   for it to boot — or is refused while it boots. Say so rather than looking stuck, and retry once
   before falling back to the offline reply. Streaming a query is read-only, so a retry is safe. */
const COLD_START_MS = 5000;
const COLD_START_RETRY_MS = 4000;
const WAKING = "Waking the AI coach server (this can take a minute after it has been idle)…";

/* The models stream faster than anyone reads, and a page of Khmer and worked algebra landing
   all at once is harder to follow than watching it arrive a step at a time. So the deltas are
   buffered and revealed at a steady pace instead of the moment they arrive.

   REVEAL_CHARS_PER_SECOND is the pace when the model can keep up with it, and a model slower
   than that is never held back. REVEAL_CATCHUP_SECONDS is how hard a backlog pushes the pace
   above that floor, so a fast model is slowed down rather than queued behind: at these two
   numbers a 2500-character answer from a 400 char/s model takes about 8s to read out instead
   of 6s, and its last line lands within about 2s of the stream closing. Raise the floor or
   lower the catch-up to speed the reveal up. REVEAL_TICK_MS also caps the re-renders, and
   each one re-runs Markdown and KaTeX over the whole answer. */
const REVEAL_CHARS_PER_SECOND = 180;
const REVEAL_CATCHUP_SECONDS = 1;
const REVEAL_TICK_MS = 40;

async function ragStreamRequest(body, { signal, status }) {
  const send = () => ragRequest("/api/query/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    signal,
  });
  // Only a hosted API sleeps; in dev the proxy reaches a server that is either up or not.
  if (!RAG_API) return send();
  const waking = setTimeout(() => status(WAKING), COLD_START_MS);
  try {
    return await send();
  } catch (err) {
    // Only a boot can be waited out: a configuration mistake or a real error cannot.
    if (err.status !== 0 || err.message !== UNREACHABLE || signal?.aborted) throw err;
    status(WAKING);
    await sleep(COLD_START_RETRY_MS);
    return await send();
  } finally {
    clearTimeout(waking);
  }
}

async function ragStudyReply(t, p, history, onUpdate = () => {}, { images = [], signal, onImages } = {}) {
  let text = "";   // every delta received so far
  let shown = 0;   // how much of it is on screen
  let sources = [];
  let timer = 0;
  let since = 0;
  const paint = () => onUpdate({ text: text.slice(0, shown), rag: true, streaming: true, sources, notice: null });
  const status = (notice) => { if (!shown) onUpdate({ text: "", rag: true, streaming: true, sources, notice }); };
  const lost = "The connection to the AI coach server was lost.";

  const pump = () => {
    timer = 0;
    const now = Date.now();
    // A fresh run (`since` cleared) steps one tick rather than the whole pause before it,
    // so waiting on a slow model does not then dump its answer in one frame.
    const elapsed = since ? Math.min(1, (now - since) / 1000) : REVEAL_TICK_MS / 1000;
    since = now;
    const pending = text.length - shown;
    const rate = Math.max(REVEAL_CHARS_PER_SECOND, pending / REVEAL_CATCHUP_SECONDS);
    shown = Math.min(text.length, shown + Math.max(1, Math.round(rate * elapsed)));
    paint();
    if (shown < text.length) timer = setTimeout(pump, REVEAL_TICK_MS);
    else since = 0;
  };
  const reveal = () => { if (!timer && shown < text.length) timer = setTimeout(pump, REVEAL_TICK_MS); };
  const stopPacing = () => { clearTimeout(timer); timer = 0; since = 0; };
  /* Resolving while text is still held back would hand the finished message the whole answer
     at once, undoing the pacing on its last lines; wait for the buffer to empty first. */
  const drain = () => new Promise((resolve) => {
    const wait = () => { if (shown >= text.length) return resolve(); reveal(); setTimeout(wait, REVEAL_TICK_MS); };
    wait();
  });

  /* One streamed request, appending what it produces to `text`; returns its stop reason. */
  const streamOnce = async (body) => {
    const base = text.length; // a model switch rewinds this request's own output, not the answer so far
    let finished = false;
    let stopReason = null;
    const res = await ragStreamRequest(JSON.stringify(body), { signal, status });
    try {
      for await (const event of readNdjson(res)) {
        if (event.type === "status") status(STAGE_LABELS[event.stage]);
        else if (event.type === "images") onImages?.(event.images);
        else if (event.type === "meta") sources = event.sources?.length ? event.sources : sources;
        else if (event.type === "delta") {
          text += event.text;
          reveal();
        } else if (event.type === "reset") {
          // The server is restarting the answer with another model.
          text = text.slice(0, base);
          shown = Math.min(shown, text.length);
          // Whatever earlier rounds had revealed stays on screen and keeps flowing.
          onUpdate({ text: text.slice(0, shown), rag: true, streaming: true, sources, notice: shown ? null : "Switching to another model…" });
          reveal();
        } else if (event.type === "error") throw new RagError(event.detail, event.status);
        else if (event.type === "done") {
          finished = true;
          stopReason = event.stop_reason;
          /* The server repaired this request's Markdown/LaTeX. Some fixes (closing an
             unclosed $$, lifting Khmer out of a formula) need the whole answer and so
             cannot arrive as deltas; swap the repaired text in, keeping earlier rounds. */
          if (typeof event.answer === "string") {
            text = text.slice(0, base) + event.answer;
            shown = Math.min(shown, text.length);
            reveal();
          }
        }
      }
    } catch (err) {
      throw err instanceof RagError || signal?.aborted ? err : new RagError(lost, 0);
    }
    if (!finished) throw new RagError(lost, 0);
    return stopReason;
  };

  try {
    status(images.length ? STAGE_LABELS.reading_images : STAGE_LABELS.searching);
    let stopReason = await streamOnce({
      prompt: t,
      history: toRagHistory(history),
      images: images.map(({ data, mime_type, name }) => ({ data, mime_type, name })),
    });
    // The photos are already read, so a continuation sends the answer so far instead.
    for (let round = 0; TRUNCATED_STOPS.has(stopReason) && round < CONTINUE_ROUNDS && !signal?.aborted; round++) {
      // The question rides along so retrieval finds the same passages again; on its
      // own the continuation phrase matches nothing and the server would announce
      // mid-answer that the curriculum does not cover this.
      const lang = KHMER_CHAR.test(text) ? "km" : "en";
      stopReason = await streamOnce({
        prompt: `${CONTINUE_PROMPT[lang]}\n\n${t || text.slice(-CONTINUE_QUERY_CHARS)}`,
        history: [
          ...toRagHistory(history),
          { role: "user", content: (t || "(photo)").slice(0, 20000) },
          { role: "assistant", content: text.slice(-CONTINUE_CONTEXT_CHARS) },
        ],
        images: [],
        // The round picks the formula up mid-block, so the server must leave this
        // round headless instead of repairing it as a whole answer.
        continues_math: opensInDisplayMath(text),
      });
    }
    if (TRUNCATED_STOPS.has(stopReason)) text += "\n\n*(This exercise is longer than I can answer in one go. Ask me to carry on from the last step.)*";
    await drain();
    return { text: text || "…", rag: true, sources };
  } catch (err) {
    if (signal?.aborted) {
      return text
        ? { text: `${text}\n\n*(Stopped)*`, rag: true, sources, error: true }
        : { text: "Stopped.", error: true };
    }
    if (err.status === 0 && !text) {
      // A photo can only be read by the server, so there is no offline answer to fall back to.
      if (images.length) return { text: `I can't read your photo right now: ${err.message}`, error: true };
      return { text: `${coachReply(t, p)}\n\n(Offline demo reply: start the AI coach server for curriculum-grounded answers.)` };
    }
    if (text) return { text: `${text}\n\n*(The answer was cut off: ${err.message})*`, rag: true, sources, error: true };
    return { text: `Sorry, I couldn't answer that: ${err.message}`, error: true };
  } finally {
    stopPacing();
  }
}

async function ragUpload(file) {
  const form = new FormData();
  form.append("file", file);
  form.append("background", "true");
  return ragFetch("/api/ingest", { method: "POST", body: form });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/* Uploads (especially scanned PDFs that need OCR) are indexed in the background; poll until done. */
async function waitForIngest(job, { interval = 2000, timeout = 30 * 60 * 1000 } = {}) {
  const deadline = Date.now() + timeout;
  while (job.status === "queued" || job.status === "running") {
    if (Date.now() > deadline) throw new RagError("Indexing is taking unusually long; check the server logs.", 504);
    await sleep(interval);
    job = await ragFetch(`/api/ingest/jobs/${job.job_id}`);
  }
  if (job.status === "failed") throw new RagError(job.error || "Indexing failed", job.error_status || 500);
  return job.result;
}

/* A `$$` that starts a line opens remark-math's display fence, and only a line whose sole
   content is `$$` closes it. Models routinely end a block with `\end{array}$$` instead, and the
   fence then runs to the end of the answer: everything after it — headings, prose, the remaining
   steps — lands inside one math node and KaTeX renders the raw source. Put both delimiters of
   such a block on their own lines so it closes where the model meant it to. A `$$` in the middle
   of a line is inline math to remark-math and already works, so leave those alone. */
const fenceDisplayMath = (text) =>
  text.replace(/^([ \t]*)\$\$([\s\S]*?)\$\$/gm, (_, indent, body) => `${indent}$$\n${body.trim()}\n$$\n`);

/* Fenced code (the GeoGebra blocks) may hold anything, so normalize only the prose around it. */
const CODE_FENCE = /(^```[\s\S]*?^```)/gm;
const outsideCode = (text, fix) => text.split(CODE_FENCE).map((part, i) => (i % 2 ? part : fix(part))).join("");

/* An odd number of display fences leaves the last one open, and remark-math then reads
   everything after it — headings, prose, the remaining steps, a GeoGebra block — as a single
   formula, which KaTeX prints as raw red source (throwOnError is off). It survives to the end
   of a finished answer, where hideUnclosed no longer applies: a model that runs out of room
   mid-block, or writes one $$ too many, loses the whole tail of its answer that way. Drop the
   unmatched fence so the tail renders as ordinary Markdown. */
const LINE_FENCE = /^[ \t]*\$\$[ \t]*$/gm;

/* Whether the text so far stops inside a display block, matching what the server counts
   in answer_format._display_block_open. */
const opensInDisplayMath = (text) => (text.split("$$").length - 1) % 2 === 1;

/* remark-math pairs the fences in document order, so one stray `$$` puts every block
   after it out of step: the prose lands inside a formula, where KaTeX prints it in red,
   and the formulas render as plain Markdown -- which quietly eats the backslash of every
   `\,` and `\;`. The server keeps its own delimiters balanced, but a model can still
   write one too many. Score the blocks the current pairing picks out against the ones a
   pairing shifted by a fence would, and shift when the shifted reading wins. */
const LATEX_COMMAND = /\\[a-zA-Z]{2,}/;
const NOT_MATH = /```|\*\*|\$|(?:^|\n)[ \t]*#{1,6}[ \t]/;

const blockScore = (segments, first) => {
  let score = 0;
  for (let i = first; i < segments.length; i += 2) {
    const body = segments[i].trim();
    if (!body) continue;
    if (NOT_MATH.test(body) || KHMER_CHAR.test(body)) score -= 1;
    else if (LATEX_COMMAND.test(body)) score += 1;
  }
  return score;
};

const realignFences = (text) => {
  const segments = text.split(/^[ \t]*\$\$[ \t]*$/m);
  // Segment 1 is the first block as it stands; segment 2 is the first block one fence on.
  if (segments.length < 4) return text;
  if (blockScore(segments, 2) <= blockScore(segments, 1)) return text;
  return text.replace(/^[ \t]*\$\$[ \t]*\n?/m, "");
};

const dropDanglingFence = (text) => {
  LINE_FENCE.lastIndex = 0;
  let match, count = 0, at = -1, len = 0;
  while ((match = LINE_FENCE.exec(text))) { count++; at = match.index; len = match[0].length; }
  return count % 2 === 0 ? text : text.slice(0, at) + text.slice(at + len);
};

/* The prompt asks for $...$ / $$...$$, but models sometimes emit \( \) or \[ \]. */
const normalizeMath = (text) => outsideCode(text, (part) => dropDanglingFence(realignFences(fenceDisplayMath(part
  .replace(/\\\[([\s\S]+?)\\\]/g, (_, body) => `\n$$\n${body.trim()}\n$$\n`)
  .replace(/\\\(([\s\S]+?)\\\)/g, (_, body) => `$${body.trim()}$`)))));

/* While an answer is still arriving, hide a trailing unclosed $$ block or code fence so half a
   formula or graph never flashes on screen. */
const hideUnclosed = (text, marker) => {
  const parts = text.split(marker);
  return parts.length % 2 === 0 ? parts.slice(0, -1).join(marker) : text;
};

/* ── GeoGebra figures: ```geogebra / ```geogebra-3d blocks (see prompts.py rule 7) ── */
const GGB_SCRIPT = "https://www.geogebra.org/apps/deployggb.js";
const GGB_MAX_LINES = 30;
// One missing object fails every later command that uses it, so report the first few
// steps rather than the whole cascade.
const GGB_MAX_REPORTED = 3;
const GGB_BLOCKED = /^\s*(Execute|SetClickScript|SetUpdateScript|RunClickScript|RunUpdateScript|PlaySound|ReadText)\b/i;
let ggbLoader = null;
let ggbCounter = 0;

function loadGeoGebra() {
  if (window.GGBApplet) return Promise.resolve();
  ggbLoader ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = GGB_SCRIPT;
    script.async = true;
    script.onload = resolve;
    script.onerror = () => { ggbLoader = null; script.remove(); reject(new Error("GeoGebra could not be loaded")); };
    document.head.appendChild(script);
  });
  return ggbLoader;
}

const geogebraCommands = (code) => code.split("\n")
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith("#") && line.length <= 500 && !GGB_BLOCKED.test(line))
  .slice(0, GGB_MAX_LINES);

/* The model picks the fence, and it does not always pick `geogebra-3d` for a figure that
   lives in space. In the 2D graphing app "A = (1, 2, 3)" is not a point, so Plane(A, B, C)
   fails with "Illegal argument: Point A" -- and GeoGebra says so in a modal over the chat.
   Read the commands instead of trusting the fence. */
const GGB_SOLID = /\b(?:Plane|PerpendicularPlane|PlaneBisector|Sphere|Surface|Cube|Prism|Pyramid|Tetrahedron|Octahedron|Cone|Cylinder|InfiniteCone|Vector3D|IntersectConic)\s*\(/i;
const GGB_TRIPLE = /\(\s*-?\d[\d.]*\s*,\s*-?\d[\d.]*\s*,\s*-?\d[\d.]*\s*\)/;
const GGB_Z_AXIS = /(?:^|[\s(])z\s*[=:]/im;
const isSpatial = (commands) => commands.some(
  (command) => GGB_SOLID.test(command) || GGB_TRIPLE.test(command) || GGB_Z_AXIS.test(command));

/* "A = (1,2,3)", "c: x + y = 1" and "f(x) = x^2" each name what they build; a bare
   construction such as Plane(A,B,C) names nothing and is checked by its arguments. */
const GGB_LABEL = /^\s*([A-Za-z]\w*)\s*(?:\(\s*[A-Za-z]\w*\s*\))?\s*[:=]/;
const GGB_ARGUMENTS = /\(([^()]*)\)\s*$/;

/* Build the figure in the order it was written, and report the step that would not build
   rather than leaving GeoGebra to raise a dialog the student can do nothing about. */
function buildFigure(api, commands) {
  const unbuilt = [];
  try { api.setErrorDialogsActive(false); } catch { /* an older applet may not have it */ }
  for (const command of commands) {
    const missing = (command.match(GGB_ARGUMENTS)?.[1] || "").split(",")
      .map((argument) => argument.trim())
      .filter((argument) => /^[A-Za-z]\w{0,2}$/.test(argument) && !api.exists(argument));
    if (missing.length) { unbuilt.push(`${command} (no ${missing.join(", ")})`); continue; }
    let built = false;
    try { built = api.evalCommand(command) !== false; } catch { built = false; }
    const label = command.match(GGB_LABEL)?.[1];
    if (built && label && !api.exists(label)) built = false;
    if (!built) unbuilt.push(command);
  }
  return unbuilt;
}

function GeoGebraFigure({ code, is3d }) {
  const [ids] = useState(() => { ggbCounter += 1; return { container: `ggb-box-${ggbCounter}`, applet: `ggbApplet${ggbCounter}` }; });
  const ref = useRef(null);
  const [failed, setFailed] = useState(false);
  const [unbuilt, setUnbuilt] = useState([]);

  useEffect(() => {
    let cancelled = false;
    setUnbuilt([]);
    loadGeoGebra().then(() => {
      if (cancelled || !ref.current) return;
      const commands = geogebraCommands(code);
      const applet = new window.GGBApplet({
        id: ids.applet,
        // A figure in space needs the 3D app whichever fence the model wrote it in.
        appName: is3d || isSpatial(commands) ? "3d" : "graphing",
        width: Math.max(260, ref.current.clientWidth), height: 340,
        showToolBar: false, showAlgebraInput: false, showMenuBar: false,
        showResetIcon: true, enableShiftDragZoom: true, showZoomButtons: true, enableRightClick: false,
        appletOnLoad: (api) => {
          const skipped = buildFigure(api, commands);
          if (!cancelled && skipped.length) setUnbuilt(skipped);
        },
      }, true);
      applet.inject(ref.current);
    }).catch(() => { if (!cancelled) setFailed(true); });
    const node = ref.current;
    return () => { cancelled = true; if (node) node.innerHTML = ""; };
  }, [code, is3d, ids]);

  if (failed) {
    return (
      <div>
        <p className="text-xs eai-muted">Couldn't load the interactive graph (GeoGebra is unreachable). Commands:</p>
        <pre><code>{code}</code></pre>
      </div>
    );
  }
  return (
    <div>
      <div id={ids.container} ref={ref} style={{ width: 520, maxWidth: "100%", height: 340, borderRadius: 12, overflow: "hidden", background: "#fff" }} />
      {/* Whatever did build is still worth looking at, so the figure stays and the rest is
          reported quietly underneath. */}
      {unbuilt.length > 0 && (
        <p className="text-xs eai-muted" style={{ marginTop: 6 }}>
          Part of this figure couldn't be drawn: {unbuilt.slice(0, GGB_MAX_REPORTED).join("; ")}
          {unbuilt.length > GGB_MAX_REPORTED ? ` (and ${unbuilt.length - GGB_MAX_REPORTED} more)` : ""}
        </p>
      )}
    </div>
  );
}

const hastText = (node) => (node.type === "text" ? node.value : (node.children || []).map(hastText).join(""));

function markdownComponents(streaming) {
  return {
    a: ({ node, ...props }) => <a {...props} target="_blank" rel="noreferrer" />,
    table: ({ node, ...props }) => <div style={{ overflowX: "auto" }}><table {...props} /></div>,
    pre: ({ node, ...props }) => {
      const code = node?.children?.[0];
      const classes = code?.tagName === "code" ? code.properties?.className || [] : [];
      const is3d = classes.includes("language-geogebra-3d");
      if (!is3d && !classes.includes("language-geogebra")) return <pre {...props} />;
      if (streaming) return <p className="text-xs eai-muted">Drawing graph…</p>;
      return <GeoGebraFigure code={hastText(code).trim()} is3d={is3d} />;
    },
  };
}

/* throwOnError:false makes KaTeX print a formula it cannot parse as its own source. Left to
   itself it prints that source in #cc0000, so one bad formula reads as an error the student
   is meant to act on. Show it in the muted text colour instead: still visibly not a formula,
   in both themes, without the alarm. */
const KATEX_OPTIONS = { throwOnError: false, strict: false, errorColor: "var(--muted)" }; // Khmer inside math only warns
const REMARK_PLUGINS = [remarkGfm, remarkMath];
const REHYPE_PLUGINS = [[rehypeKatex, KATEX_OPTIONS]];
const MD_COMPONENTS = markdownComponents(false);
const MD_COMPONENTS_STREAMING = markdownComponents(true);

function RichAnswer({ text, streaming }) {
  const shown = streaming ? hideUnclosed(hideUnclosed(text, "```"), "$$") : text;
  return (
    <div className="eai-md">
      <ReactMarkdown remarkPlugins={REMARK_PLUGINS} rehypePlugins={REHYPE_PLUGINS}
        components={streaming ? MD_COMPONENTS_STREAMING : MD_COMPONENTS}>
        {normalizeMath(shown)}
      </ReactMarkdown>
    </div>
  );
}

const COACH_MODES = {
  study: {
    label: "Study Help", icon: BookOpen,
    subtitle: "Grounded in the Grade 12 curriculum · explains math step by step in Khmer or English",
    greeting: (p) => `Hi ${p.name.split(" ")[0]} 👋 I'm your study coach. ${p.weak[0] ? `I see ${p.weak[0].s} is your biggest opportunity right now.` : ""} What would you like to work on?`,
    suggestions: (p) => ["How do I improve my grade odds?", "What should I study today?", p.weak[0] ? `Help me with ${p.weak[0].s}` : "Make me a study plan"],
    placeholder: "Ask anything about your studies…",
    intro: "Ask a math question in Khmer or English, or snap a photo of a problem. I'll explain it step by step.",
    reply: ragStudyReply,
    canUpload: true,
  },
  major: {
    label: "Major Guidance", icon: GraduationCap,
    subtitle: "Matches your subjects & interests to real Cambodian university majors",
    greeting: (p) => `Hi ${p.name.split(" ")[0]}! Not sure which major to pick? Tell me a subject you enjoy, or ask "what major fits my strengths?" and I'll pull real options from Cambodian universities.`,
    suggestions: (p) => ["What major fits my strengths?", "Tell me about engineering majors", p.strong[0] ? `Majors related to ${p.strong[0].s}` : "Which majors need Mathematics?"],
    placeholder: "Ask about majors, universities, or careers…",
    intro: "Tell me a subject you enjoy or an interest, and I'll suggest real majors at Cambodian universities.",
    reply: majorGuidanceReply,
  },
  university: {
    label: "University Mentor", icon: Compass,
    subtitle: "Knows your major, year and goals — coursework, career prep, scholarships and study abroad",
    greeting: (p) => `Hi ${p.name.split(" ")[0]}! I'm your university mentor. Ask me about ${UNI_FIELDS.find((f) => f.id === p.universityProfile?.major)?.label || "your field"} coursework, career prep, scholarships, or studying abroad.`,
    suggestions: (p) => ["Help me understand a topic", "What should I do to prepare for a career in this field?", "What scholarships should I look for?"],
    placeholder: "Ask about your major, career, or scholarships…",
    intro: "Tell me what you're working on — a course topic, a career question, or a scholarship you're eyeing — and I'll help.",
    reply: universityMentorReply,
  },
};

/* ── Chat UI (Claude / ChatGPT style): message column, rich composer, photo questions ── */
const COACH_MAX_IMAGES = 4;
const COACH_MAX_IMAGE_MB = 20;
const IMAGE_FILE = /\.(png|jpe?g|webp|heic|heif|gif|bmp)$/i;
const isImageFile = (file) => file.type.startsWith("image/") || IMAGE_FILE.test(file.name);

const readAsDataURL = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(blob);
});

/* Draws the (already upright) bitmap on white, at most maxSide px on its longest side. */
function drawScaled(bitmap, maxSide, quality) {
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
}

/* Photos are shrunk in the browser (the server reads 2000 px at most), which keeps uploads small. */
async function prepareImageAttachment(file) {
  if (file.size > COACH_MAX_IMAGE_MB * 1024 * 1024) throw new Error(`${file.name} is larger than ${COACH_MAX_IMAGE_MB} MB`);
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const data = drawScaled(bitmap, 2000, 0.9);
    const thumb = drawScaled(bitmap, 1200, 0.85);
    bitmap.close?.();
    return { data: data.slice(data.indexOf(",") + 1), mime_type: "image/jpeg", thumb };
  } catch {
    // Formats the browser cannot draw (e.g. HEIC outside Safari): let the server try.
    const url = await readAsDataURL(file);
    return { data: url.slice(url.indexOf(",") + 1), mime_type: null, thumb: null };
  }
}

const STAGE_LABELS = {
  reading_images: "Reading your photo…",
  searching: "Searching the curriculum…",
  generating: "Thinking…",
};

const historyTextFor = (text, readings) => [
  text || "(photo)",
  ...readings.map((r) => `[Photo ${r.index}]\n${r.text || "(unreadable)"}`),
].join("\n\n");

function StatusLine({ text }) {
  return (
    <span className="eai-status">
      <LoaderCircle size={15} className="eai-spin" />
      <span className="eai-shimmer">{text}</span>
    </span>
  );
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => {});
  };
  return (
    <button onClick={copy} className="eai-icon-btn sm eai-focus" title={copied ? "Copied" : "Copy"} aria-label="Copy answer">
      {copied ? <Check size={15} /> : <Copy size={15} />}
    </button>
  );
}

function ImageReadings({ readings }) {
  return (
    <details className="eai-reading">
      <summary className="eai-focus"><ScanText size={13} /> Text read from {readings.length > 1 ? "photos" : "photo"} <ChevronDown size={13} /></summary>
      <div className="space-y-3">
        {readings.map((r) => (
          <div key={r.index}>
            {readings.length > 1 && <p className="text-xs font-semibold mb-1">Photo {r.index}</p>}
            {r.vision_text && <RichAnswer text={r.vision_text} />}
            {r.khmer_text && (
              <p className="mt-2" style={{ whiteSpace: "pre-wrap" }}>
                {r.vision_text && <span className="eai-muted text-xs">Khmer OCR: </span>}{r.khmer_text}
              </p>
            )}
            {!r.vision_text && !r.khmer_text && <p className="eai-muted">Couldn't read this photo. Try a sharper, well-lit picture.</p>}
            {r.warnings?.length > 0 && (
              <ul className="eai-muted text-[11px] mt-2 space-y-0.5">
                {r.warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            )}
            <p className="eai-muted text-[11px] mt-2">{[r.vision_engine, r.khmer_engine].filter(Boolean).join(" + ") || "no engine answered"}</p>
          </div>
        ))}
      </div>
    </details>
  );
}

function UserMessage({ m, onOpenImage }) {
  return (
    <div className="flex flex-col items-end gap-1.5">
      {m.images?.length > 0 && (
        <div className="flex flex-wrap justify-end gap-2">
          {m.images.map((img) => (img.thumb
            ? <button key={img.id} onClick={() => onOpenImage(img.thumb)} className="eai-focus" style={{ borderRadius: 14 }} aria-label={`Open ${img.name}`}>
                <img className="eai-chat-img" src={img.thumb} alt={img.name} />
              </button>
            : <div key={img.id} className="eai-user-bubble text-xs flex items-center gap-1.5"><ImagePlus size={14} /> {img.name}</div>))}
        </div>
      )}
      {m.text && <div className="eai-user-bubble">{m.text}</div>}
      {m.readings?.length > 0 && <ImageReadings readings={m.readings} />}
    </div>
  );
}

function AssistantMessage({ m, Icon }) {
  return (
    <div className="flex gap-3">
      <div className="eai-avatar"><Icon size={15} color="#fff" /></div>
      <div className="flex-1 min-w-0 text-[15px] leading-relaxed" style={{ color: m.error ? "var(--ember)" : "var(--ink)" }}>
        {m.rag && !m.text && m.notice ? <StatusLine text={m.notice} />
          : m.rag ? <RichAnswer text={m.text} streaming={m.streaming} />
          : <div style={{ whiteSpace: "pre-wrap" }}>{m.text}</div>}
        {!m.streaming && m.text && (
          <div className="eai-msg-actions">
            <CopyButton text={m.text} />
          </div>
        )}
      </div>
    </div>
  );
}

/* University profiles only ever see the University Mentor mode — Study Help is explicitly
   grounded in "the Grade 12 curriculum" and Major Guidance in BAC II subjects, so showing either
   to a university student would be exactly the BAC II routing bug this Hub exists to avoid. */
const COACH_MODE_IDS_UNIVERSITY = ["university"];
const COACH_MODE_IDS_HIGHSCHOOL = ["study", "major"];

function Coach({ p }) {
  const isUni = p.educationLevel === "university";
  const [mode, setMode] = useState(isUni ? "university" : "study");
  const [msgsByMode, setMsgsByMode] = useState({ study: [], major: [], university: [] });
  const availableModeIds = isUni ? COACH_MODE_IDS_UNIVERSITY : COACH_MODE_IDS_HIGHSCHOOL;
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  // A public deployment runs with ALLOW_WRITES=false, where /api/ingest is a 403.
  // Ask once, so the library upload is hidden rather than failing when tapped.
  // Photos are a query, not a write, and stay available either way.
  const [canAddDocs, setCanAddDocs] = useState(false);
  useEffect(() => {
    let live = true;
    ragFetch("/health")
      .then((h) => live && setCanAddDocs(h.writes_enabled !== false))
      .catch(() => {});   // unreachable: the first question reports it properly
    return () => { live = false; };
  }, []);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [notice, setNotice] = useState("");
  const endRef = useRef(null);
  const textRef = useRef(null);
  const photoRef = useRef(null);
  const docRef = useRef(null);
  const menuRef = useRef(null);
  const abortRef = useRef(null);
  const dragDepth = useRef(0);
  const active = COACH_MODES[mode];
  const msgs = msgsByMode[mode];
  const suggestions = active.suggestions(p);
  const preparing = attachments.some((a) => a.status === "processing");
  const readyAttachments = attachments.filter((a) => a.status === "ready");
  const canSend = !loading && !preparing && (input.trim() !== "" || readyAttachments.length > 0);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [msgs, loading]);

  // Grow the textarea with its content, up to the CSS max-height.
  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [input]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const close = (e) => { if (!menuRef.current?.contains(e.target)) setMenuOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(""), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!lightbox) return undefined;
    const onKey = (e) => e.key === "Escape" && setLightbox(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox]);

  const updateMessage = (targetMode, id, change) => setMsgsByMode((m) => ({
    ...m, [targetMode]: m[targetMode].map((x) => (x.id === id ? change(x) : x)),
  }));

  const addImages = (files) => {
    if (!active.canUpload) return;
    const room = COACH_MAX_IMAGES - attachments.length;
    if (files.length > room) setNotice(`You can attach up to ${COACH_MAX_IMAGES} photos per question.`);
    files.slice(0, Math.max(0, room)).forEach((file) => {
      const id = `att-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const preview = URL.createObjectURL(file);
      setAttachments((list) => [...list, { id, name: file.name || "photo", preview, status: "processing" }]);
      prepareImageAttachment(file)
        .then((prepared) => setAttachments((list) => list.map((a) => (a.id === id
          ? { ...a, ...prepared, thumb: prepared.thumb || preview, status: "ready" } : a))))
        .catch((err) => {
          setNotice(err.message);
          setAttachments((list) => list.filter((a) => a.id !== id));
          URL.revokeObjectURL(preview);
        });
    });
    textRef.current?.focus();
  };

  const removeAttachment = (id) => setAttachments((list) => {
    const gone = list.find((a) => a.id === id);
    if (gone) URL.revokeObjectURL(gone.preview);
    return list.filter((a) => a.id !== id);
  });

  const addFiles = (fileList) => {
    const files = [...(fileList || [])];
    if (!files.length || !active.canUpload) return;
    const images = files.filter(isImageFile);
    const docs = canAddDocs ? files.filter((f) => !isImageFile(f)) : [];
    if (images.length) addImages(images);
    if (docs.length) uploadDocs(docs);
  };

  const send = (text) => {
    const t = (text ?? input).trim();
    const images = active.canUpload && text === undefined ? readyAttachments : [];
    if ((!t && !images.length) || loading || (preparing && text === undefined)) return;
    const historyForReply = msgs; // snapshot before the new user message is appended
    const replyMode = mode;
    const stamp = Date.now();
    const userId = `user-${stamp}`;
    const replyId = `reply-${stamp}`;
    // Streaming replies update one message in place until they finish.
    const upsertReply = (reply) => setMsgsByMode((m) => {
      const list = m[replyMode];
      const message = { id: replyId, role: "ai", ...reply };
      return { ...m, [replyMode]: list.some((x) => x.id === replyId) ? list.map((x) => (x.id === replyId ? message : x)) : [...list, message] };
    });
    const onImages = (readings) => updateMessage(replyMode, userId, (msg) => ({
      ...msg, readings, historyText: historyTextFor(t, readings),
    }));
    setMsgsByMode((m) => ({
      ...m,
      [mode]: [...m[mode], {
        id: userId, role: "user", text: t,
        images: images.map((a) => ({ id: a.id, name: a.name, thumb: a.thumb })),
      }],
    }));
    if (text === undefined) {
      setInput("");
      setAttachments([]); // previews stay alive: the sent message still shows them
    }
    setLoading(true);
    const controller = new AbortController();
    abortRef.current = controller;
    // A minimum "thinking" delay keeps the typing indicator feeling natural for the instant
    // scripted mode, without adding extra wait on top of a real (already-slower) API call.
    const minDelay = new Promise((resolve) => setTimeout(resolve, 400));
    const extras = { images, signal: controller.signal, onImages };
    Promise.all([Promise.resolve(active.reply(t, p, historyForReply, upsertReply, extras)), minDelay])
      .then(([reply]) => (typeof reply === "string" ? { text: reply } : reply))
      .catch((err) => ({ text: `Sorry, something went wrong: ${err.message}`, error: true }))
      .then((reply) => {
        upsertReply({ ...reply, streaming: false, notice: null });
        setLoading(false);
        abortRef.current = null;
      });
  };

  const stop = () => abortRef.current?.abort();

  // Adds documents to the coach's library via /api/ingest and reports progress in the chat.
  const uploadDocs = async (files) => {
    if (uploading) { setNotice("Please wait for the current upload to finish."); return; }
    setUploading(true);
    for (const file of files) {
      const id = `upload-${Date.now()}-${file.name}`;
      const post = (text, extra = {}) => setMsgsByMode((m) => {
        const others = m.study.filter((x) => x.id !== id);
        return { ...m, study: [...others, { id, role: "ai", text, ...extra }] };
      });
      post("", { rag: true, streaming: true, notice: `Adding “${file.name}” to your study library… scanned pages can take a few minutes.` });
      try {
        const result = await waitForIngest(await ragUpload(file));
        const formulas = result.formulas_protected ? `, ${result.formulas_protected} formulas` : "";
        const notes = result.warnings?.length ? `\nNote: ${result.warnings.join(" ")}` : "";
        post(`Added “${result.source}” to your study library (${result.chunks_added} passages${formulas}). Ask me anything about it!${notes}`);
      } catch (err) {
        post(`Couldn't add “${file.name}”: ${err.message}`, { error: true });
      }
    }
    setUploading(false);
  };

  const onKeyDown = (e) => {
    // isComposing: Khmer and other IME keyboards use Enter to confirm a word.
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (canSend) send();
    }
  };

  const onPaste = (e) => {
    const files = [...(e.clipboardData?.files || [])].filter(isImageFile);
    if (files.length && active.canUpload) {
      e.preventDefault();
      addImages(files);
    }
  };

  const dragHandlers = active.canUpload ? {
    onDragEnter: (e) => {
      if (![...e.dataTransfer.types].includes("Files")) return;
      e.preventDefault();
      dragDepth.current += 1;
      setDragging(true);
    },
    onDragOver: (e) => { if ([...e.dataTransfer.types].includes("Files")) e.preventDefault(); },
    onDragLeave: () => {
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0) setDragging(false);
    },
    onDrop: (e) => {
      e.preventDefault();
      dragDepth.current = 0;
      setDragging(false);
      addFiles(e.dataTransfer.files);
    },
  } : {};

  const firstName = p.name.split(" ")[0];

  return (
    <div className="eai-rise eai-coach-view flex flex-col relative" {...dragHandlers}>
      <div className="flex items-center justify-between gap-3 flex-wrap pb-2">
        <div className="flex items-center gap-2.5">
          <h2 className="eai-display text-lg font-extrabold">AI Coach</h2>
          <span className="text-xs eai-muted hidden md:inline">{active.subtitle}</span>
        </div>
        <div className="flex gap-1 p-1 rounded-full eai-soft">
          {availableModeIds.map((id) => [id, COACH_MODES[id]]).map(([id, m]) => (
            <button key={id} onClick={() => setMode(id)}
              className="eai-focus text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5"
              style={{ background: mode === id ? "var(--card)" : "transparent", color: mode === id ? "var(--ink)" : "var(--muted)", boxShadow: mode === id ? "var(--shadow)" : "none" }}>
              <m.icon size={14} /> {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto eai-scroll">
        <div className="eai-chat-col">
          {msgs.length === 0 ? (
            <div className="flex flex-col items-center text-center gap-4 pt-[8vh]">
              <div className="eai-avatar" style={{ width: 52, height: 52 }}><active.icon size={24} color="#fff" /></div>
              <div>
                <h3 className="eai-display text-2xl font-extrabold">Hi {firstName}, what shall we work on?</h3>
                <p className="eai-muted text-sm mt-1.5 max-w-lg">{active.intro}</p>
              </div>
              <div className="grid sm:grid-cols-2 gap-2 w-full mt-2">
                {suggestions.map((s) => (
                  <button key={s} onClick={() => send(s)} className="eai-suggest eai-focus">{s}</button>
                ))}
                {active.canUpload && (
                  <button onClick={() => photoRef.current?.click()} className="eai-suggest eai-focus flex items-center gap-2">
                    <ImagePlus size={16} /> Snap or upload a photo of a problem
                  </button>
                )}
              </div>
            </div>
          ) : msgs.map((m) => (m.role === "user"
            ? <UserMessage key={m.id} m={m} onOpenImage={setLightbox} />
            : <AssistantMessage key={m.id} m={m} Icon={active.icon} />))}
          {loading && !msgs.some((m) => m.streaming) && (
            <div className="flex gap-3">
              <div className="eai-avatar"><active.icon size={15} color="#fff" /></div>
              <StatusLine text="Thinking…" />
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      <div className="eai-composer-wrap">
        {notice && <p className="text-xs text-center mb-2" style={{ color: "var(--ember)" }} role="status">{notice}</p>}
        <div className={`eai-composer${dragging ? " drag" : ""}`}>
          {attachments.length > 0 && (
            <div className="flex gap-2 flex-wrap px-3 pt-3">
              {attachments.map((a) => (
                <div key={a.id} className="eai-attach" title={a.name}>
                  <img src={a.preview} alt={a.name} />
                  {a.status === "processing" && <div className="eai-attach-busy"><LoaderCircle size={18} className="eai-spin" /></div>}
                  <button onClick={() => removeAttachment(a.id)} aria-label={`Remove ${a.name}`}><X size={12} /></button>
                </div>
              ))}
            </div>
          )}
          <textarea ref={textRef} rows={1} className="eai-composer-input"
            placeholder={attachments.length ? "Ask about your photo… (or just send it)" : active.placeholder}
            value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={onKeyDown} onPaste={onPaste} />
          <div className="flex items-center justify-between px-2 pb-2">
            <div className="relative" ref={menuRef}>
              {active.canUpload && (
                <>
                  <button onClick={() => setMenuOpen((open) => !open)} className="eai-icon-btn eai-focus"
                    aria-label="Add photos or files" aria-expanded={menuOpen} title="Add photos or files">
                    <Plus size={20} />
                  </button>
                  {menuOpen && (
                    <div className="eai-menu" role="menu">
                      <button role="menuitem" onClick={() => { setMenuOpen(false); photoRef.current?.click(); }}>
                        <ImagePlus size={17} />
                        <span><span className="block font-medium">Add photos</span><span className="block text-xs eai-muted">Ask about a problem (up to {COACH_MAX_IMAGES})</span></span>
                      </button>
                      {canAddDocs && (
                        <button role="menuitem" onClick={() => { setMenuOpen(false); docRef.current?.click(); }} disabled={uploading}>
                          <FileUp size={17} />
                          <span><span className="block font-medium">Add to study library</span><span className="block text-xs eai-muted">PDF, notes or scans the coach can search</span></span>
                        </button>
                      )}
                    </div>
                  )}
                  <input ref={photoRef} type="file" accept="image/*" multiple hidden
                    onChange={(e) => { addImages([...e.target.files]); e.target.value = ""; }} />
                  <input ref={docRef} type="file" accept={RAG_UPLOAD_ACCEPT} multiple hidden
                    onChange={(e) => { uploadDocs([...e.target.files]); e.target.value = ""; }} />
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              {uploading && <span className="text-xs eai-muted flex items-center gap-1"><LoaderCircle size={13} className="eai-spin" /> Indexing…</span>}
              {loading && active.canUpload
                ? <button onClick={stop} className="eai-send eai-focus" aria-label="Stop generating" title="Stop"><Square size={13} fill="currentColor" /></button>
                : <button onClick={() => send()} disabled={!canSend} className="eai-send eai-focus" aria-label="Send" title="Send (Enter)"><ArrowUp size={18} /></button>}
            </div>
          </div>
        </div>
        <p className="eai-footnote">AI Coach can make mistakes. Double-check important steps.</p>
      </div>

      {dragging && <div className="eai-drop"><div className="flex items-center gap-2 font-semibold"><ImagePlus size={20} /> {canAddDocs ? "Drop photos to ask about them, or documents to add to your library" : "Drop photos to ask about them"}</div></div>}
      {lightbox && (
        <div className="eai-lightbox" onClick={() => setLightbox(null)} role="dialog" aria-label="Photo preview">
          <img src={lightbox} alt="Attached photo" />
        </div>
      )}
    </div>
  );
}

/* ════════════════════════ Super Bondus (premium upsell) ════════════════════════
   A pricing/upgrade page reached from the "Super Bondus" nav item. This prototype has no payment
   backend, so "Upgrade" is honest about that instead of pretending to charge a card. */
const SUPER_PLANS = [
  {
    id: "free", label: "Free", labelKm: "ឥតគិតថ្លៃ", price: "$0", period: "",
    tagline: "Free for everyone individual", taglineKm: "ឥតគិតថ្លៃសម្រាប់អ្នកគ្រប់គ្នា",
    button: "Start for Free", buttonKm: "ចាប់ផ្តើមឥតគិតថ្លៃ",
    features: [
      "BAC II past exams",
      "Simple grading (MCQ + right/wrong only, no explanation)",
      "4 exercises per day from any premium exam category",
      "1-time AI language diagnostic test (CEFR A1–C2)",
      "Full user experience (XP, streaks, leaderboards)",
    ],
    featuresKm: [
      "ក្រដាសប្រឡង បាក់ឌុប ចាស់ៗ",
      "ការដាក់ពិន្ទុសាមញ្ញ (ជម្រើសពហុ + ត្រូវ/ខុស តែប៉ុណ្ណោះ គ្មានការពន្យល់)",
      "៤ លំហាត់ក្នុងមួយថ្ងៃ ពីប្រភេទប្រឡងណាមួយ",
      "តេស្តវាយតម្លៃភាសាដោយ AI ១ដង (CEFR A1–C2)",
      "បទពិសោធន៍អ្នកប្រើពេញលេញ (XP, និន្នាការជាប់, តារាងអ្នកនាំមុខ)",
    ],
  },
  {
    id: "standard", label: "Standard", labelKm: "ស្តង់ដារ", price: "$1.99", period: "/ month", periodKm: "/ ខែ",
    tagline: "Everything in Free, plus:", taglineKm: "អ្វីៗគ្រប់យ៉ាងក្នុងគម្រោងឥតគិតថ្លៃ បូក៖",
    button: "Get Standard", buttonKm: "ទទួលបានស្តង់ដារ",
    features: [
      "AI grade prediction system",
      "50 AI help tokens/month (step-by-step explanations)",
      "Up to 15 premium exercises per day",
      "IELTS/TOEFL reading & listening practice (auto-graded)",
    ],
    featuresKm: [
      "ប្រព័ន្ធព្យាករណ៍និទ្ទេសដោយ AI",
      "៥០ ថូខឹនជំនួយ AI/ខែ (ការពន្យល់ជាជំហានៗ)",
      "រហូតដល់ ១៥ លំហាត់ក្នុងមួយថ្ងៃ",
      "លំហាត់អាន & ស្តាប់ IELTS/TOEFL (ដាក់ពិន្ទុស្វ័យប្រវត្តិ)",
    ],
  },
  {
    id: "premium", label: "Premium", labelKm: "ព្រីមៀម", price: "$3.99", period: "/ month", periodKm: "/ ខែ",
    tagline: "Everything in Standard, plus:", taglineKm: "អ្វីៗគ្រប់យ៉ាងក្នុងគម្រោងស្តង់ដារ បូក៖",
    button: "Get Premium", buttonKm: "ទទួលបានព្រីមៀម", best: true,
    features: [
      "Unlimited AI tutor access",
      "AI-generated adaptive mock exams",
      "Full access to all exam packages",
      "Advanced language grading (speaking + essays)",
      "In-depth analytical recommendations based on performance",
      "Targets IELTS 8.0 / PTE 79+",
    ],
    featuresKm: [
      "ចូលប្រើគ្រូបង្វឹក AI គ្មានកំណត់",
      "តេស្តសាកល្បងសម្របតាមកម្រិត បង្កើតដោយ AI",
      "ចូលប្រើពេញលេញគ្រប់កញ្ចប់ប្រឡង",
      "ការដាក់ពិន្ទុភាសាកម្រិតខ្ពស់ (ការនិយាយ + សេចក្តីសរសេរ)",
      "អនុសាសន៍វិភាគស៊ីជម្រៅផ្អែកលើលទ្ធផល",
      "ផ្តោតលើ IELTS 8.0 / PTE 79+",
    ],
  },
];

/* University-track twin of SUPER_PLANS above — same shape, English-only (no *Km fields; the
   render below falls back to English for any plan missing them, so this doesn't need to
   duplicate strings into featuresKm just to avoid crashing in Khmer mode). Copy mirrors the
   Free/Standard/Premium structure drafted for the University Hub pricing strategy review. */
const UNI_SUPER_PLANS = [
  {
    id: "free", label: "Free", price: "$0", period: "",
    tagline: "Free for every student — University Hub included",
    button: "Start for Free",
    features: [
      "First lesson of every course in your major",
      "Basic Discovery filters: major & location",
      "Public scholarship list, no paywall",
      "A few AI Mentor questions a day",
      "Full user experience (XP, streaks, leaderboards)",
    ],
  },
  {
    id: "standard", label: "Standard", price: "$1.99", period: "/ month",
    tagline: "Everything in Free, plus:",
    button: "Get Standard",
    features: [
      "Every course, every year, fully unlocked",
      "Quizzes with real mastery tracking, not just checkmarks",
      "Advanced Discovery filters + \"why this matches you\"",
      "Full Scholarship Center, matched to your profile",
      "More AI Mentor time — aware of your weak spots",
    ],
  },
  {
    id: "premium", label: "Premium", price: "$3.99", period: "/ month", best: true,
    tagline: "Everything in Standard, plus:",
    button: "Get Premium",
    features: [
      "AI builds your Learn → Practice → Quiz path automatically",
      "Unlimited AI Mentor access",
      "Scholarship Gap Analysis — what's missing, how to fix it",
      "Full mock exams, past papers, advanced IELTS/TOEFL prep",
      "Application tracker + document checklist",
    ],
  },
];

function SuperBondus({ p, lang = "en" }) {
  const plans = p?.educationLevel === "university" ? UNI_SUPER_PLANS : SUPER_PLANS;
  const [selected, setSelected] = useState("premium");
  const [upgraded, setUpgraded] = useState(null); // plan object once a CTA is clicked

  return (
    <div className="space-y-5 eai-rise">
      <div className="flex items-center gap-3">
        <div className="grid place-items-center rounded-2xl flex-shrink-0" style={{ width: 48, height: 48, background: "var(--gold-soft)" }}>
          <Crown size={24} style={{ color: "var(--gold)" }} />
        </div>
        <div>
          <h2 className={`eai-display text-2xl font-extrabold ${lang === "km" ? "eai-km" : ""}`}>{t(lang, "superBondusTitle")}</h2>
          <p className={`eai-muted text-sm mt-0.5 ${lang === "km" ? "eai-km" : ""}`}>
            {p?.educationLevel === "university" ? "Unlock the full University Hub deeper AI mentorship, every test-prep engine, and application tools." : t(lang, "superBondusDesc")}
          </p>
        </div>
      </div>

      {upgraded ? (
        <div className="eai-card p-6 flex items-start gap-3" style={{ borderColor: "var(--gold)" }}>
          <CheckCircle2 size={20} style={{ color: "var(--jade)", flexShrink: 0, marginTop: 2 }} />
          <div>
            <p className={`font-semibold ${lang === "km" ? "eai-km" : ""}`}>
              {upgraded.id === "free" ? t(lang, "allSet") : `${t(lang, "thanksUpgrade")} ${lang === "km" ? (upgraded.labelKm ?? upgraded.label) : upgraded.label}!`}
            </p>
            <p className={`text-sm eai-muted mt-1 leading-relaxed ${lang === "km" ? "eai-km" : ""}`}>
              {upgraded.id === "free" ? t(lang, "freeIncluded") : t(lang, "prototypeNoPayment")}
            </p>
            <button onClick={() => setUpgraded(null)} className={`eai-focus text-sm font-semibold mt-3 ${lang === "km" ? "eai-km" : ""}`} style={{ color: "var(--primary)" }}>{t(lang, "backToPlans")}</button>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-stretch">
            {plans.map((plan) => {
              const on = selected === plan.id;
              return (
                <div key={plan.id} onClick={() => setSelected(plan.id)}
                  className="eai-pick eai-focus flex flex-col text-left p-5 rounded-2xl border-2 relative cursor-pointer"
                  style={{ borderColor: on ? "var(--gold)" : "var(--line)", background: on ? "var(--gold-soft)" : "var(--card)" }}>
                  {plan.best && (
                    <span className={`absolute -top-2.5 right-4 text-[10px] font-bold px-2 py-0.5 rounded-full ${lang === "km" ? "eai-km" : ""}`} style={{ background: "var(--gold)", color: "#fff" }}>
                      {t(lang, "mostPopular")}
                    </span>
                  )}
                  <div className="flex items-center justify-between">
                    <span className={`eai-display font-bold ${lang === "km" ? "eai-km" : ""}`}>{lang === "km" ? (plan.labelKm ?? plan.label) : plan.label}</span>
                    {on && <CheckCircle2 size={18} style={{ color: "var(--gold)" }} />}
                  </div>
                  <p className="mt-2"><span className="eai-display text-2xl font-extrabold">{plan.price}</span> <span className={`text-sm eai-muted ${lang === "km" ? "eai-km" : ""}`}>{lang === "km" ? (plan.periodKm ?? plan.period) : plan.period}</span></p>
                  <p className={`text-xs eai-muted mt-1 ${lang === "km" ? "eai-km" : ""}`}>{lang === "km" ? (plan.taglineKm ?? plan.tagline) : plan.tagline}</p>
                  <ul className="mt-4 space-y-2 flex-1">
                    {(lang === "km" ? (plan.featuresKm ?? plan.features) : plan.features).map((f) => (
                      <li key={f} className={`flex items-start gap-2 text-xs eai-muted leading-relaxed ${lang === "km" ? "eai-km" : ""}`}>
                        <CheckCircle2 size={13} style={{ color: "var(--gold)", flexShrink: 0, marginTop: 1.5 }} /> {f}
                      </li>
                    ))}
                  </ul>
                  <button onClick={(e) => { e.stopPropagation(); setUpgraded(plan); }}
                    className={`eai-btn eai-focus w-full mt-5 py-2.5 text-sm flex items-center justify-center gap-2 ${lang === "km" ? "eai-km" : ""}`}
                    style={{ background: plan.best ? "var(--gold)" : "var(--card)", color: plan.best ? "#fff" : "var(--ink)", border: plan.best ? "none" : "1px solid var(--line)" }}>
                    {lang === "km" ? (plan.buttonKm ?? plan.button) : plan.button} <ArrowRight size={14} />
                  </button>
                </div>
              );
            })}
          </div>

          <p className={`text-center text-xs eai-muted ${lang === "km" ? "eai-km" : ""}`}>{t(lang, "prototypePaymentsNote")}</p>
        </>
      )}
    </div>
  );
}

/* ════════════════════════ Shell ════════════════════════ */
const NAV = [
  { id: "dashboard", label: "Dashboard", labelKm: "ផ្ទាំងគ្រប់គ្រង", icon: LayoutDashboard },
  { id: "browse", label: "Browse exams", labelKm: "រកមើលកម្រងសំណួរ", icon: BookOpen },
  { id: "practice", label: "Practice", labelKm: "លំហាត់អនុវត្ត", icon: Target },
  { id: "universities", label: "Universities", labelKm: "សាកលវិទ្យាល័យ", icon: GraduationCap },
  { id: "coach", label: "AI coach", labelKm: "គ្រូបង្វឹក AI", icon: Sparkles },
  { id: "languages", label: "Languages", labelKm: "ភាសាបរទេស", icon: Globe },
  { id: "progress", label: "Progress", labelKm: "វឌ្ឍនភាព", icon: BarChart3 },
  { id: "super", label: "Super Bondus", labelKm: "Super Bondus", icon: Crown, premium: true },
];

/* Sidebar shown instead of NAV for university profiles — no Browse-exams/Practice (both BAC II
   specific), and University Hub replaces Dashboard. This is the actual fix for "University
   shouldn't send users to Grade 12/BAC II content." */
const UNI_NAV = [
  { id: "universityHub", label: "University Hub", labelKm: "មជ្ឈមណ្ឌលសាកលវិទ្យាល័យ", icon: LayoutDashboard },
  { id: "explore", label: "Explore", labelKm: "ស្វែងរក", icon: Compass },
  { id: "universities", label: "Universities", labelKm: "សាកលវិទ្យាល័យ", icon: GraduationCap },
  { id: "coach", label: "AI coach", labelKm: "គ្រូបង្វឹក AI", icon: Sparkles },
  { id: "progress", label: "Progress", labelKm: "វឌ្ឍនភាព", icon: BarChart3 },
  { id: "super", label: "Super Bondus", labelKm: "Super Bondus", icon: Crown, premium: true },
];

/* ════════════════════════ UI localization (English / Khmer) ════════════════════════
   A small, hand-picked dictionary for the highest-traffic screens (nav, welcome, dashboard,
   language hub) rather than a full line-by-line translation of the whole app — t(lang, key)
   falls back to the English string if a key is ever missing, so a partial dictionary never
   breaks rendering. */
const STRINGS = {
  en: {
    // Welcome
    welcomeHeading: "Welcome to", welcomeBrand: "BONDUS",
    welcomeSubtitle: "Less Time Searching, More Time Learning!",
    createAccount: "Create an account", login: "Login",
    // Shell / nav
    logOut: "Log out", streakKeepIt: "Study today to keep it!",
    navPractice: "Practice", navUniversities: "Universities", navProgress: "Progress", navExplore: "Explore",
    // Dashboard
    dashGreetingPrefix: "Welcome,",
    dashStartPlan: "Start today's plan", dashAskCoach: "Ask your AI coach",
    dashTodayPlan: "Today's study plan", dashDone: "done",
    dashStreak: "day streak · keep it alive",
    dashExplore: "Explore more",
    unlockBannerTitle: "Unlock Your Personalized Study Plan",
    unlockBannerDesc: "Complete your 20-question diagnostic assessment to receive:",
    startAssessment: "Start Assessment",
    heroMessage: "One small step today keeps the streak alive — here's what's next for you.",
    recommendedNextLesson: "Recommended next lesson", lessonWord: "lesson", startLesson: "Start lesson",
    toLevel: "XP to Level", targetsWeakest: "targets your weakest topic",
    exploreSharpen: "Sharpen your weak subjects", exploreBrowseMajors: "Browse majors & entrance prep", exploreStats: "Your full stats & analytics",
    exploreBrowsePast: "Official past exam papers by year",
    // Language hub
    langHubTitle: "International language hub",
    langHubSubtitle: "Diagnostic driven roadmaps and unlimited AI mock tests with skill-by-skill scoring.",
    takeDiagnostic: "Take diagnostic", retakeDiagnostic: "Retake diagnostic", comingSoon: "Coming soon",
    // Browse
    browseTitle: "Browse exams", universityEntrance: "University entrance", trackWord: "track", officialPapers: "official papers",
    recommendedForYou: "Recommended for you", minAbbrev: "min", marksWord: "marks",
    matchesLevel: "Matches your", answerSheetReady: "Answer sheet ✓", viewWord: "View",
    allExamsWord: "All exams", pdfPaperDesc: "The official paper, viewable and downloadable below.",
    imagePaperDesc: "Scroll down to see every page of the official paper.",
    // Practice
    practiceTitle: "Practice & mock exams",
    practiceDesc: "Pick a subject. Every exercise is auto-corrected with an explanation and the formula to use, and you can mark each one Pending, In progress, or Completed.",
    focusArea: "Focus area", exercisesAutoGraded: "exercises · auto-graded", completedWord: "completed",
    allSubjects: "All subjects", allChapters: "All chapters", chooseChapterDesc: "Choose a chapter to see its exercises.", exercisesWord: "exercises", reviewWord: "Review", solveWord: "Solve",
    status_pending: "Pending", status_in_progress: "In progress", status_completed: "Completed",
    exerciseXofY: "Exercise {i} of {n}", adaptiveWord: "Adaptive",
    typeAnswer: "Type your answer…", checkAnswer: "Check answer",
    whyMissed: "Why do you think you missed this? (optional)", skipWord: "Skip",
    correctXp: "Correct! +30 XP", notQuite: "Not quite", correctAnswerIs: "Correct answer:",
    explanationWord: "Explanation", formulaApproach: "Formula / approach to use",
    recCorrectMore: "Nice, you applied the right method. Keep the momentum and try the next one.",
    recCorrectLast: "Nice, you applied the right method. That's the last exercise in this set!",
    recIncorrect: "Re-read the formula above and how it maps to the question, then tap Try again — you've got this.",
    tryAgain: "Try again", nextExercise: "Next exercise", backToList: "Back to list",
    // Universities
    universitiesTitle: "University & scholarship prep",
    universitiesDesc: "Tap a university to see its majors, admissions info and match score.",
    viewPracticeSets: "View university details", allUniversities: "All universities",
    majorsOffered: "Majors offered", majorsWord: "majors",
    // Progress
    progressDesc: "Your full stats, analytics, and where you stand.",
    doneToday: "Done today", attemptedToday: "Attempted today", accuracyWord: "Accuracy", xpToday: "XP today",
    estimatedRange: "estimated range:", knowledgeMastery: "Knowledge mastery", syllabusCoverage: "Syllabus coverage",
    studyConsistency: "Study consistency", completionSpeed: "Completion speed",
    estimateNotGuarantee: "Estimate, not a guarantee.", liftingWillMove1: "Lifting", liftingWillMove2: "will move this the most.",
    weeklyStudyHours: "Weekly study hours", thisWeek: "this week",
    leaderboard: "Leaderboard", youWord: "you", youreRanked: "You're ranked", ofWord: "of",
    aiLearningAnalytics: "AI Learning Analytics", liveWord: "Live",
    coachAnalyzes: "The coach continuously analyzes these signals to personalize your plan:",
    subjectMastery: "Subject mastery", aiRecommendations: "AI recommendations",
    goalsWord: "Goals", weeklyWord: "Weekly", monthlyWord: "Monthly", goalWord: "goal",
    recentActivity: "Recent activity", correctWord: "Correct", reviewedWord: "Reviewed",
    createdAccount: "Created your account", welcomeAboard: "Welcome aboard · +40 XP",
    joinedTrack: "Joined the", subjectsPersonalized: "Subjects personalized",
    aiBuiltPlan: "AI built your first study plan", basedOnWeak: "Based on your weak subjects",
    // Coach
    aiStudyCoach: "AI study coach",
    mode_study_label: "Study Help", mode_study_subtitle: "Demo coach · knows your subjects, weak spots & goals", mode_study_placeholder: "Ask anything about your studies…",
    mode_major_label: "Major Guidance", mode_major_subtitle: "Matches your subjects & interests to real Cambodian university majors", mode_major_placeholder: "Ask about majors, universities, or careers…",
    // Super Bondus
    superBondusTitle: "Super Bondus",
    superBondusDesc: "Unlock the full BAC II toolkit — unlimited AI coaching, every past paper, and deeper analytics.",
    allSet: "You're all set!", thanksUpgrade: "Thanks for trying to upgrade to",
    freeIncluded: "Free is already included with your account — no signup needed.",
    prototypeNoPayment: "This is a prototype, so payments aren't actually connected yet — no card was charged. This screen shows what the Super Bondus upgrade flow will look like once billing is wired up.",
    backToPlans: "Back to plans", mostPopular: "Most popular",
    prototypePaymentsNote: "Prototype · payments are not connected, no card will be charged",
    // Onboarding shared
    backWord: "Back", stepWord: "Step", prototypeFooter: "Prototype · no data leaves your browser",
    // Login
    loginTitle: "Log in", loginDesc: "Enter the phone number you used when you created your account.",
    phoneNumberLabel: "Phone number", noAccountYet: "Don't have an account yet?", createOne: "Create one",
    errEnterPhone: "Enter the phone number you used to sign up.",
    errPhoneNotFound: "We couldn't find an account with that phone number on this device.",
    errEnterEmailPassword: "Enter the email and password you used to sign up.",
    errEmailNotFound: "We couldn't find an account with that email and password on this device.",
    loginWithPhone: "Phone", loginWithEmail: "Email",
    // Register
    eduLevelTitle: "What's your education level?",
    eduLevelDesc: "This decides what Bondus shows you next — high school and university have completely different content.",
    highSchoolOptTitle: "High School", highSchoolOptDesc: "Grade 11 or 12, preparing for the BAC II exam.",
    universityOptTitle: "University", universityOptDesc: "Already at university, a high school graduate, or preparing for university entrance.",
    uniGoalsTitle: "What are you looking for?", uniGoalsDesc: "Select everything that applies — you can change this later.",
    uniGoalsWhyWeAsk: "These personalize your University Hub, Discovery matches, and AI Mentor — the more you pick, the sharper the recommendations.",
    uniFieldTitle: "What's your field?", uniFieldDesc: "Pick the closest match — you can change this later.",
    uniYearTitle: "Where are you now?", uniYearDesc: "So we can tailor what we show you.",
    // University Hub
    uniHubContinueLearning: "Continue learning",
    uniHubCoursesComingSoon: "Course content for this field is coming soon. In the meantime, explore Universities, IELTS prep, or ask your AI mentor.",
    uniHubLessonsComingSoon: "Full interactive lessons are coming soon — this is the course outline.",
    uniExploreDesc: "Everything you need, organized in one place instead of searching across the web.",
    exploreLearnTitle: "Learn", explorePrepareTitle: "Prepare", exploreDiscoverTitle: "Discover", explorePracticeTitle: "Practice",
    askAiCoach: "Ask your AI coach", scholarshipsWord: "Scholarships", quizzesMockExams: "Quizzes & mock exams",
    uniProgressDesc: "Your learning activity across Bondus.",
    uniProgressComingSoon: "Detailed course and quiz analytics are coming soon.",
    uniHubYourProgress: "Your progress", uniHubRecommendedNext: "Recommended next", practiceThisCourse: "Practice this course",
    notAssessedYet: "Not assessed yet",
    whyMatchesYou: "Why this matches you", whyYouMatch: "Why you match", matchWord: "match",
    admissionsAndCost: "Admissions & cost", illustrativeDataNote: "Illustrative figures for planning — always verify with the university directly.",
    locationWord: "Location", tuitionPerYear: "Tuition / year", languageWord: "Language", admissionsDeadlineWord: "Admissions deadline",
    searchUniversities: "Search universities…", allMajorsFilter: "All majors",
    anyBudget: "Any budget", budgetLow: "Budget-friendly", budgetMedium: "Mid-range", budgetHigh: "Higher cost",
    anyLanguage: "Any language", noUniversitiesMatch: "No universities match these filters — try widening your search.",
    scholarshipsDesc: "Scholarships across every university, matched to your major and goals.",
    coverageWord: "Coverage", requirementsWord: "Requirements",
    unscoredChecklistNote: "These are listed as-is — we don't have your grades or test scores yet, so we can't check them off for you.",
    createAccountTitle: "Create your account", createAccountDesc: "A few details so your AI coach and study plan fit you.",
    fullNameLabel: "Full name", emailLabel: "Email", passwordLabel: "Password", ageLabel: "Age", gradeLevelLabel: "Grade level",
    grade11: "Grade 11", grade12: "Grade 12 (BAC II)", targetGradeLabel: "Target grade", gradeWord: "Grade",
    continueToTrack: "Continue to academic track", continueWord: "Continue",
    chooseTrackTitle: "Choose your academic track",
    chooseTrackDesc: "This helps Bondus prioritize the subjects and exam content shown on your dashboard.",
    personalizeTitle: "Personalize your study plan",
    personalizeDesc: "These preferences give your AI coach a starting point. Your diagnostic assessment will verify your current level.",
    targetExamYearLabel: "Target exam year", dailyStudyTimeLabel: "Daily study time", minutesWord: "minutes",
    targetUniLabel: "Target university (optional)", notSureYet: "Not sure yet",
    subjectsImproveQ: "Which subjects would you like to improve?",
    subjectsImproveSub: "Choose as many as you need. You can update these later.",
    skipStepWord: "Skip this step", clearSelectionWord: "Clear selection",
    // Assessment choice
    chooseBeginTitle: "Choose how you'd like to begin",
    chooseBeginDesc: "Take a short diagnostic assessment for a personalized study plan, or explore Bondus first and complete it later.",
    recommendedBadge: "Recommended",
    startPersonalizedTitle: "Start personalized assessment",
    startPersonalizedDesc: "A 15–20 minute diagnostic that helps Bondus understand your current level and create a personalized learning plan.",
    startPersonalizedBenefits: ["Personalized roadmap", "Better practice recommendations", "Progress starting point"],
    startAssessmentBtn: "Start assessment",
    exploreFirstTitle: "Explore Bondus first",
    exploreFirstDesc: "Enter the dashboard without personalization. You can take the assessment later from your dashboard or profile.",
    exploreFirstBtn: "Explore first",
    // Diagnostic
    diagnosticTestWord: "Diagnostic test", questionWord: "Question",
    howSureWereYou: "How sure were you?", confidentWord: "Confident", guessedWord: "I guessed",
    noFeedbackDuringTest: "No feedback during the test — you'll see your results at the end.",
    diagnosticComplete: "Diagnostic complete!", startingPointIs: "Here's your real starting point — overall level is",
    goToDashboard: "Go to my dashboard",
  },
  km: {
    // Welcome
    welcomeHeading: "សូមស្វាគមន៍មកកាន់", welcomeBrand: "BONDUS",
    welcomeSubtitle: "សន្សំសំចៃពេលរក ទទួលបានការសិក្សាកាន់តែច្រើន!",
    createAccount: "បង្កើតគណនី", login: "ចូលគណនី",
    // Shell / nav
    logOut: "ចាកចេញ", streakKeepIt: "សិក្សាថ្ងៃនេះដើម្បីរក្សានិន្នាការ!",
    navPractice: "លំហាត់អនុវត្ត", navUniversities: "សាកលវិទ្យាល័យ", navProgress: "វឌ្ឍនភាព", navExplore: "ស្វែងរក",
    // Dashboard
    dashGreetingPrefix: "សូមស្វាគមន៍,",
    dashStartPlan: "ចាប់ផ្តើមផែនការថ្ងៃនេះ", dashAskCoach: "សួរគ្រូបង្វឹក AI",
    dashTodayPlan: "ផែនការសិក្សាថ្ងៃនេះ", dashDone: "បានធ្វើរួច",
    dashStreak: "ថ្ងៃជាប់គ្នា · បន្តរក្សា",
    dashExplore: "ស្វែងយល់បន្ថែម",
    unlockBannerTitle: "ដោះសោផែនការសិក្សាផ្ទាល់ខ្លួនរបស់អ្នក",
    unlockBannerDesc: "បំពេញការធ្វើតេស្តវាយតម្លៃ ២០សំណួរ ដើម្បីទទួលបាន៖",
    startAssessment: "ចាប់ផ្តើមតេស្តវាយតម្លៃ",
    heroMessage: "ជំហានតូចមួយថ្ងៃនេះជួយរក្សានិន្នាការឲ្យបន្ត។ នេះជាអ្វីដែលបន្ទាប់សម្រាប់អ្នក។",
    recommendedNextLesson: "មេរៀនបន្ទាប់ដែលបានណែនាំ", lessonWord: "មេរៀន", startLesson: "ចាប់ផ្តើមមេរៀន",
    toLevel: "XP ទៅកម្រិត", targetsWeakest: "ផ្តោតលើប្រធានបទខ្សោយបំផុតរបស់អ្នក",
    exploreSharpen: "ពង្រឹងមុខវិជ្ជាខ្សោយរបស់អ្នក", exploreBrowseMajors: "រកមើលជំនាញ និងការត្រៀមប្រឡងចូល", exploreStats: "ស្ថិតិ និងការវិភាគពេញលេញរបស់អ្នក",
    exploreBrowsePast: "ក្រដាសប្រឡងផ្លូវការតាមឆ្នាំ",
    // Language hub
    langHubTitle: "មជ្ឈមណ្ឌលភាសាអន្តរជាតិ",
    langHubSubtitle: "ផែនទីបង្ហាញផ្លូវផ្អែកលើការធ្វើតេស្តវាយតម្លៃ និងតេស្តសាកល្បង AI មិនកំណត់ ជាមួយពិន្ទុសម្រាប់ជំនាញនីមួយៗ។",
    takeDiagnostic: "ធ្វើតេស្តវាយតម្លៃ", retakeDiagnostic: "ធ្វើតេស្តវាយតម្លៃម្តងទៀត", comingSoon: "មកដល់ឆាប់ៗនេះ",
    // Browse
    browseTitle: "រកមើលកម្រងសំណួរប្រឡងបាក់ឌុប", universityEntrance: "ប្រឡងចូលសាកលវិទ្យាល័យ", trackWord: "ផ្នែក", officialPapers: "ក្រដាសប្រឡងផ្លូវការ",
    recommendedForYou: "បានណែនាំសម្រាប់អ្នក", minAbbrev: "នាទី", marksWord: "ពិន្ទុ",
    matchesLevel: "ត្រូវនឹងកម្រិត", answerSheetReady: "សន្លឹកចម្លើយ ✓", viewWord: "មើល",
    allExamsWord: "ការប្រឡងទាំងអស់", pdfPaperDesc: "ក្រដាសប្រឡងផ្លូវការ អាចមើល និងទាញយកបានខាងក្រោម។",
    imagePaperDesc: "រំកិលចុះក្រោមដើម្បីមើលគ្រប់ទំព័រនៃក្រដាសប្រឡងផ្លូវការ។",
    // Practice
    practiceTitle: "លំហាត់អនុវត្ត និងតេស្តសាកល្បង",
    practiceDesc: "ជ្រើសរើសមុខវិជ្ជាមួយ។ លំហាត់នីមួយៗត្រូវបានកែដោយស្វ័យប្រវត្តិជាមួយការពន្យល់ និងរូបមន្តត្រូវប្រើ ហើយអ្នកអាចសម្គាល់វាថា កំពុងរង់ចាំ កំពុងធ្វើ ឬបានបញ្ចប់។",
    focusArea: "ផ្នែកត្រូវផ្តោត", exercisesAutoGraded: "លំហាត់ · ដាក់ពិន្ទុស្វ័យប្រវត្តិ", completedWord: "បានបញ្ចប់",
    allSubjects: "មុខវិជ្ជាទាំងអស់", allChapters: "ជំពូកទាំងអស់", chooseChapterDesc: "ជ្រើសរើសជំពូកមួយ ដើម្បីមើលលំហាត់របស់វា។", exercisesWord: "លំហាត់", reviewWord: "ពិនិត្យឡើងវិញ", solveWord: "ដោះស្រាយ",
    status_pending: "កំពុងរង់ចាំ", status_in_progress: "កំពុងធ្វើ", status_completed: "បានបញ្ចប់",
    exerciseXofY: "លំហាត់ {i} នៃ {n}", adaptiveWord: "សម្របតាមកម្រិត",
    typeAnswer: "វាយចម្លើយរបស់អ្នក…", checkAnswer: "ពិនិត្យចម្លើយ",
    whyMissed: "ហេតុអ្វីអ្នកគិតថាខកខានចម្លើយនេះ? (ស្រេចចិត្ត)", skipWord: "រំលង",
    correctXp: "ត្រឹមត្រូវ! +30 XP", notQuite: "មិនទាន់ត្រឹមត្រូវ", correctAnswerIs: "ចម្លើយត្រឹមត្រូវ៖",
    explanationWord: "ការពន្យល់", formulaApproach: "រូបមន្ត / វិធីសាស្ត្រត្រូវប្រើ",
    recCorrectMore: "ល្អណាស់ — អ្នកបានប្រើវិធីត្រឹមត្រូវ។ បន្តល្បឿននេះ ហើយសាកល្បងលំហាត់បន្ទាប់។",
    recCorrectLast: "ល្អណាស់ — អ្នកបានប្រើវិធីត្រឹមត្រូវ។ នេះជាលំហាត់ចុងក្រោយក្នុងសំណុំនេះ!",
    recIncorrect: "អានរូបមន្តខាងលើម្តងទៀត និងរបៀបភ្ជាប់ជាមួយសំណួរ បន្ទាប់មកចុចសាកល្បងម្តងទៀត — អ្នកអាចធ្វើបាន។",
    tryAgain: "សាកល្បងម្តងទៀត", nextExercise: "លំហាត់បន្ទាប់", backToList: "ត្រឡប់ទៅបញ្ជី",
    // Universities
    universitiesTitle: "ការត្រៀមប្រឡងចូលសាកលវិទ្យាល័យ និងអាហារូបករណ៍",
    universitiesDesc: "ចុចលើសាកលវិទ្យាល័យមួយ ដើម្បីមើលជំនាញ ព័ត៌មានចូលរៀន និងពិន្ទុភាពសមស្រប។",
    viewPracticeSets: "មើលព័ត៌មានលម្អិតសាកលវិទ្យាល័យ", allUniversities: "សាកលវិទ្យាល័យទាំងអស់",
    majorsOffered: "ជំនាញដែលមាន", majorsWord: "ជំនាញ",
    // Progress
    progressDesc: "ស្ថិតិ ការវិភាគពេញលេញរបស់អ្នក និងទីតាំងរបស់អ្នកឈរ។",
    doneToday: "បានធ្វើថ្ងៃនេះ", attemptedToday: "បានសាកល្បងថ្ងៃនេះ", accuracyWord: "ភាពត្រឹមត្រូវ", xpToday: "XP ថ្ងៃនេះ",
    estimatedRange: "ជួរប៉ាន់ស្មាន៖", knowledgeMastery: "ចំណេះដឹងស្ទាត់ជំនាញ", syllabusCoverage: "ការគ្របដណ្តប់កម្មវិធីសិក្សា",
    studyConsistency: "ភាពទៀងទាត់ក្នុងការសិក្សា", completionSpeed: "ល្បឿននៃការបញ្ចប់",
    estimateNotGuarantee: "ជាការប៉ាន់ស្មាន មិនមែនការធានា។", liftingWillMove1: "ការលើកកម្ពស់", liftingWillMove2: "នឹងផ្លាស់ប្តូរនេះច្រើនបំផុត។",
    weeklyStudyHours: "ម៉ោងសិក្សាប្រចាំសប្តាហ៍", thisWeek: "សប្តាហ៍នេះ",
    leaderboard: "តារាងអ្នកនាំមុខ", youWord: "អ្នក", youreRanked: "អ្នកនៅចំណាត់ថ្នាក់", ofWord: "នៃ",
    aiLearningAnalytics: "ការវិភាគការសិក្សាដោយ AI", liveWord: "កំពុងធ្វើការ",
    coachAnalyzes: "គ្រូបង្វឹកវិភាគសញ្ញាទាំងនេះជានិច្ច ដើម្បីធ្វើផែនការសិក្សាផ្ទាល់ខ្លួនរបស់អ្នក៖",
    subjectMastery: "ការស្ទាត់ជំនាញតាមមុខវិជ្ជា", aiRecommendations: "អនុសាសន៍ពី AI",
    goalsWord: "គោលដៅ", weeklyWord: "សប្តាហ៍", monthlyWord: "ខែ", goalWord: "គោលដៅ",
    recentActivity: "សកម្មភាពថ្មីៗ", correctWord: "ត្រឹមត្រូវ", reviewedWord: "បានពិនិត្យឡើងវិញ",
    createdAccount: "បានបង្កើតគណនីរបស់អ្នក", welcomeAboard: "សូមស្វាគមន៍ · +40 XP",
    joinedTrack: "បានចូលរួមផ្នែក", subjectsPersonalized: "មុខវិជ្ជាបានកំណត់ផ្ទាល់ខ្លួន",
    aiBuiltPlan: "AI បានបង្កើតផែនការសិក្សាដំបូងរបស់អ្នក", basedOnWeak: "ផ្អែកលើមុខវិជ្ជាខ្សោយរបស់អ្នក",
    // Coach
    aiStudyCoach: "គ្រូបង្វឹកសិក្សា AI",
    mode_study_label: "ជំនួយសិក្សា", mode_study_subtitle: "គ្រូបង្វឹកសាកល្បង · ដឹងពីមុខវិជ្ជា ចំណុចខ្សោយ និងគោលដៅរបស់អ្នក", mode_study_placeholder: "សួរអ្វីក៏បានអំពីការសិក្សារបស់អ្នក…",
    mode_major_label: "ណែនាំជំនាញ", mode_major_subtitle: "ផ្គូផ្គងមុខវិជ្ជា និងចំណាប់អារម្មណ៍របស់អ្នកទៅនឹងជំនាញសាកលវិទ្យាល័យកម្ពុជាពិតប្រាកដ", mode_major_placeholder: "សួរអំពីជំនាញ សាកលវិទ្យាល័យ ឬអាជីព…",
    // Super Bondus
    superBondusTitle: "Super Bondus",
    superBondusDesc: "ដោះសោឧបករណ៍ បាក់ឌុប ពេញលេញ — ការណែនាំដោយ AI មិនកំណត់ ក្រដាសប្រឡងចាស់ៗទាំងអស់ និងការវិភាគស៊ីជម្រៅ។",
    allSet: "អ្នករួចរាល់ហើយ!", thanksUpgrade: "សូមអរគុណដែលសាកល្បងអាប់ក្រេតទៅជា",
    freeIncluded: "គម្រោងឥតគិតថ្លៃត្រូវបានរួមបញ្ចូលរួចហើយជាមួយគណនីរបស់អ្នក — មិនចាំបាច់ចុះឈ្មោះទេ។",
    prototypeNoPayment: "នេះជាគំរូសាកល្បង ដូច្នេះការទូទាត់មិនទាន់ភ្ជាប់មែនទែននៅឡើយទេ — គ្មានកាតត្រូវបានគិតលុយទេ។ អេក្រង់នេះបង្ហាញពីរបៀបដែលការអាប់ក្រេត Super Bondus នឹងមើលទៅដូចនៅពេលប្រព័ន្ធទូទាត់ត្រូវបានតភ្ជាប់។",
    backToPlans: "ត្រឡប់ទៅគម្រោង", mostPopular: "ពេញនិយមបំផុត",
    prototypePaymentsNote: "គំរូសាកល្បង · ការទូទាត់មិនទាន់ភ្ជាប់ទេ គ្មានកាតត្រូវបានគិតលុយ",
    // Onboarding shared
    backWord: "ត្រឡប់ក្រោយ", stepWord: "ជំហាន", prototypeFooter: "គំរូសាកល្បង · គ្មានទិន្នន័យចេញពីកម្មវិធីរុករករបស់អ្នកទេ",
    // Login
    loginTitle: "ចូលគណនី", loginDesc: "បញ្ចូលលេខទូរស័ព្ទដែលអ្នកបានប្រើនៅពេលបង្កើតគណនី។",
    phoneNumberLabel: "លេខទូរស័ព្ទ", noAccountYet: "មិនទាន់មានគណនីមែនទេ?", createOne: "បង្កើតគណនីថ្មី",
    errEnterPhone: "សូមបញ្ចូលលេខទូរស័ព្ទដែលអ្នកបានប្រើចុះឈ្មោះ។",
    errPhoneNotFound: "យើងរកមិនឃើញគណនីជាមួយលេខទូរស័ព្ទនោះនៅលើឧបករណ៍នេះទេ។",
    errEnterEmailPassword: "សូមបញ្ចូលអ៊ីមែល និងពាក្យសម្ងាត់ដែលអ្នកបានប្រើចុះឈ្មោះ។",
    errEmailNotFound: "យើងរកមិនឃើញគណនីជាមួយអ៊ីមែល និងពាក្យសម្ងាត់នោះនៅលើឧបករណ៍នេះទេ។",
    loginWithPhone: "លេខទូរស័ព្ទ", loginWithEmail: "អ៊ីមែល",
    // Register
    eduLevelTitle: "តើកម្រិតការសិក្សារបស់អ្នកគឺជាអ្វី?",
    eduLevelDesc: "នេះកំណត់នូវអ្វីដែល Bondus បង្ហាញអ្នកបន្ទាប់ — ថ្នាក់វិទ្យាល័យ និងសាកលវិទ្យាល័យមានខ្លឹមសារខុសគ្នាទាំងស្រុង។",
    highSchoolOptTitle: "វិទ្យាល័យ", highSchoolOptDesc: "ថ្នាក់ទី១១ ឬទី១២ រៀបចំសម្រាប់ការប្រឡង បាក់ឌុប។",
    universityOptTitle: "សាកលវិទ្យាល័យ", universityOptDesc: "កំពុងសិក្សានៅសាកលវិទ្យាល័យ ជាអ្នកបញ្ចប់ការសិក្សាវិទ្យាល័យ ឬកំពុងរៀបចំចូលរៀន។",
    uniGoalsTitle: "តើអ្នកកំពុងស្វែងរកអ្វី?", uniGoalsDesc: "ជ្រើសរើសអ្វីៗគ្រប់យ៉ាងដែលពាក់ព័ន្ធ — អ្នកអាចផ្លាស់ប្តូរពេលក្រោយបាន។",
    uniFieldTitle: "តើជំនាញរបស់អ្នកគឺជាអ្វី?", uniFieldDesc: "ជ្រើសរើសជម្រើសដែលនិងគ្នាបំផុត — អ្នកអាចផ្លាស់ប្តូរពេលក្រោយបាន។",
    uniYearTitle: "តើអ្នកនៅដំណាក់កាលណា?", uniYearDesc: "ដើម្បីឲ្យយើងកែសម្រួលអ្វីដែលបង្ហាញអ្នក។",
    // University Hub
    uniHubContinueLearning: "បន្តការសិក្សា",
    uniHubCoursesComingSoon: "ខ្លឹមសារវគ្គសិក្សាសម្រាប់ជំនាញនេះនឹងមកដល់ឆាប់ៗនេះ។ ចន្លោះពេលនេះ សូមស្វែងរកសាកលវិទ្យាល័យ រៀបចំ IELTS ឬសួរគ្រូបង្វឹក AI របស់អ្នក។",
    uniHubLessonsComingSoon: "មេរៀនអន្តរកម្មពេញលេញនឹងមកដល់ឆាប់ៗនេះ — នេះជាគ្រោងវគ្គសិក្សា។",
    uniExploreDesc: "អ្វីៗគ្រប់យ៉ាងដែលអ្នកត្រូវការ រៀបចំនៅកន្លែងតែមួយ — ជំនួសឲ្យការស្វែងរកនៅលើអ៊ីនធឺណិត។",
    exploreLearnTitle: "រៀន", explorePrepareTitle: "រៀបចំ", exploreDiscoverTitle: "ស្វែងយល់", explorePracticeTitle: "អនុវត្ត",
    askAiCoach: "សួរគ្រូបង្វឹក AI របស់អ្នក", scholarshipsWord: "អាហារូបករណ៍", quizzesMockExams: "កម្រងសំណួរ និងការប្រឡងសាកល្បង",
    uniProgressDesc: "សកម្មភាពសិក្សារបស់អ្នកនៅលើ Bondus។",
    uniProgressComingSoon: "ការវិភាគលម្អិតអំពីវគ្គសិក្សា និងកម្រងសំណួរនឹងមកដល់ឆាប់ៗនេះ។",
    createAccountTitle: "បង្កើតគណនីរបស់អ្នក", createAccountDesc: "ព័ត៌មានមួយចំនួនដើម្បីឲ្យគ្រូបង្វឹក AI និងផែនការសិក្សាសមស្របនឹងអ្នក។",
    fullNameLabel: "ឈ្មោះពេញ", emailLabel: "អ៊ីមែល", passwordLabel: "ពាក្យសម្ងាត់", ageLabel: "អាយុ", gradeLevelLabel: "កម្រិតថ្នាក់",
    grade11: "ថ្នាក់ទី១១", grade12: "ថ្នាក់ទី១២ (បាក់ឌុប)", targetGradeLabel: "និទ្ទេសគោលដៅ", gradeWord: "និទ្ទេស",
    continueToTrack: "បន្តទៅផ្នែកសិក្សា", continueWord: "បន្ត",
    chooseTrackTitle: "ជ្រើសរើសផ្នែកសិក្សារបស់អ្នក",
    chooseTrackDesc: "នេះជួយ Bondus កំណត់អាទិភាពមុខវិជ្ជា និងខ្លឹមសារប្រឡងដែលបង្ហាញលើផ្ទាំងគ្រប់គ្រងរបស់អ្នក។",
    personalizeTitle: "ធ្វើផែនការសិក្សាផ្ទាល់ខ្លួន",
    personalizeDesc: "ចំណង់ចំណូលចិត្តទាំងនេះផ្តល់ចំណុចចាប់ផ្តើមដល់គ្រូបង្វឹក AI របស់អ្នក។ ការធ្វើតេស្តវាយតម្លៃនឹងផ្ទៀងផ្ទាត់កម្រិតបច្ចុប្បន្នរបស់អ្នក។",
    targetExamYearLabel: "ឆ្នាំប្រឡងគោលដៅ", dailyStudyTimeLabel: "ពេលវេលាសិក្សាប្រចាំថ្ងៃ", minutesWord: "នាទី",
    targetUniLabel: "សាកលវិទ្យាល័យគោលដៅ (ស្រេចចិត្ត)", notSureYet: "មិនទាន់ប្រាកដ",
    subjectsImproveQ: "តើអ្នកចង់កែលម្អមុខវិជ្ជាមួយណាខ្លះ?",
    subjectsImproveSub: "ជ្រើសរើសតាមចំនួនដែលអ្នកត្រូវការ។ អ្នកអាចកែប្រែពេលក្រោយបាន។",
    skipStepWord: "រំលងជំហាននេះ", clearSelectionWord: "សម្អាតការជ្រើសរើស",
    // Assessment choice
    chooseBeginTitle: "ជ្រើសរើសរបៀបដែលអ្នកចង់ចាប់ផ្តើម",
    chooseBeginDesc: "ធ្វើតេស្តវាយតម្លៃខ្លីមួយសម្រាប់ផែនការសិក្សាផ្ទាល់ខ្លួន ឬស្វែងយល់ពី Bondus មុនហើយបំពេញវានៅពេលក្រោយ។",
    recommendedBadge: "បានណែនាំ",
    startPersonalizedTitle: "ចាប់ផ្តើមតេស្តវាយតម្លៃផ្ទាល់ខ្លួន",
    startPersonalizedDesc: "តេស្តវាយតម្លៃរយៈពេល ១៥–២០ នាទី ដែលជួយ Bondus យល់ដឹងពីកម្រិតបច្ចុប្បន្នរបស់អ្នក និងបង្កើតផែនការសិក្សាផ្ទាល់ខ្លួន។",
    startPersonalizedBenefits: ["ផែនទីបង្ហាញផ្លូវផ្ទាល់ខ្លួន", "អនុសាសន៍អនុវត្តន៍ប្រសើរជាង", "ចំណុចចាប់ផ្តើមវឌ្ឍនភាព"],
    startAssessmentBtn: "ចាប់ផ្តើមតេស្តវាយតម្លៃ",
    exploreFirstTitle: "ស្វែងយល់ពី Bondus មុន",
    exploreFirstDesc: "ចូលទៅផ្ទាំងគ្រប់គ្រងដោយគ្មានការកំណត់ផ្ទាល់ខ្លួន។ អ្នកអាចធ្វើតេស្តវាយតម្លៃពេលក្រោយពីផ្ទាំងគ្រប់គ្រង ឬប្រវត្តិរូបរបស់អ្នក។",
    exploreFirstBtn: "ស្វែងយល់មុន",
    // Diagnostic
    diagnosticTestWord: "តេស្តវាយតម្លៃ", questionWord: "សំណួរ",
    howSureWereYou: "តើអ្នកប្រាកដប៉ុណ្ណា?", confidentWord: "ជឿជាក់", guessedWord: "ខ្ញុំទាយ",
    noFeedbackDuringTest: "គ្មានមតិកែលម្អកំឡុងពេលធ្វើតេស្តទេ — អ្នកនឹងឃើញលទ្ធផលនៅចុងក្រោយ។",
    diagnosticComplete: "តេស្តវាយតម្លៃបានបញ្ចប់!", startingPointIs: "នេះជាចំណុចចាប់ផ្តើមពិតរបស់អ្នក — កម្រិតទាំងមូលគឺ",
    goToDashboard: "ទៅកាន់ផ្ទាំងគ្រប់គ្រងរបស់ខ្ញុំ",
  },
};
const t = (lang, key) => STRINGS[lang]?.[key] ?? STRINGS.en[key] ?? key;

const STORAGE_KEY = "bondus_state_v1";

function loadSaved() {
  // Always return null to start fresh - no auto-login or profile loading
  return null;
}

function WelcomeBackToast({ name, show }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }}
          className="eai-card flex items-center gap-2.5 px-4 py-2.5"
          style={{ position: "fixed", top: 72, right: 16, zIndex: 50, boxShadow: "var(--shadow)" }}>
          <span aria-hidden="true">👋</span>
          <span className="text-sm font-semibold">Welcome back, {name.split(" ")[0]}!</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* Same fixed-toast pattern as WelcomeBackToast above, fired off the level-up effect below. */
function LevelUpToast({ level, show }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div initial={{ opacity: 0, y: -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.95 }} transition={{ duration: 0.25 }}
          className="eai-card flex items-center gap-2.5 px-4 py-2.5"
          style={{ position: "fixed", top: 72, right: 16, zIndex: 50, boxShadow: "var(--shadow)", borderColor: "var(--gold)" }}>
          <TrendingUp size={16} style={{ color: "var(--gold)" }} />
          <span className="text-sm font-semibold">Level up! You're now Level {level}.</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function App() {
  const saved = useRef(loadSaved()).current;
  const isReturningUser = useRef(Boolean(saved?.profile)).current; // profile already existed in this browser on load — i.e. "logged in" automatically
  const [showWelcomeBack, setShowWelcomeBack] = useState(isReturningUser);
  const [levelUpToast, setLevelUpToast] = useState(null); // level number just reached, or null
  const [profile, setProfile] = useState(saved?.profile ?? null);
  const [entry, setEntry] = useState("welcome"); // "welcome" | "login" | "create" — which pre-account screen to show when there's no active profile yet
  const [pendingReg, setPendingReg] = useState(null); // registration answers, awaiting the assessment-choice screen
  const [resumeReg, setResumeReg] = useState(null); // { form, step } — re-opens Register at a given step when going Back from AssessmentChoice
  const [showDiagnostic, setShowDiagnostic] = useState(false); // true once they pick "Start Personalized Assessment"
  const [retaking, setRetaking] = useState(false); // true while completing the diagnostic later, from the Dashboard banner
  const [topicMastery, setTopicMastery] = useState(saved?.topicMastery ?? {}); // { [subject]: { [topic]: { history, score, lastPracticedAt } } }
  const [uniTopicMastery, setUniTopicMastery] = useState(saved?.uniTopicMastery ?? {}); // same shape as topicMastery, keyed by "{major}::{courseTitle}" subjects — see deriveUniInsights
  const [tab, setTab] = useState(saved?.profile?.educationLevel === "university" ? "universityHub" : "dashboard");
  const [dark, setDark] = useState(true);
  const [lang, setLang] = useState("en"); // "en" | "km" — UI language, independent of theme
  const [open, setOpen] = useState(false);
  const [practice, setPractice] = useState(saved?.practice ?? {}); // { [exId]: { status, result, at, subject, topic, xpAwarded } }
  const [uniPractice, setUniPractice] = useState(saved?.uniPractice ?? {}); // same shape as practice, university-track quiz attempts (exercise ids prefixed "uni:" so they never collide with practice's ids)
  const [uniPracticeTarget, setUniPracticeTarget] = useState(null); // course id to deep-link straight into when the Hub links to a specific course — consumed once by UniversityPractice
  const [plan, setPlan] = useState(saved?.plan ?? []);
  const [bonusXp, setBonusXp] = useState(saved?.bonusXp ?? 0);
  const [langResults, setLangResults] = useState(saved?.langResults ?? {}); // { [languageName]: { listening, reading, writing, speaking, overall, feedback, completedAt } }
  const [takingLangTest, setTakingLangTest] = useState(null); // language name currently being tested, or null
  const go = (t) => { setTab(t); setOpen(false); };

  // Returning user (a profile already existed in localStorage) — briefly greet them, then fade out.
  useEffect(() => {
    if (!showWelcomeBack) return;
    const t = setTimeout(() => setShowWelcomeBack(false), 2600);
    return () => clearTimeout(t);
  }, [showWelcomeBack]);

  // Persist everything so progress survives a page refresh — this prototype has no backend yet.
  useEffect(() => {
    if (!profile) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ profile, topicMastery, uniTopicMastery, practice, uniPractice, plan, bonusXp, langResults }));
  }, [profile, topicMastery, uniTopicMastery, practice, uniPractice, plan, bonusXp, langResults]);

  // Logging out clears the active session but deliberately leaves localStorage alone, so "Log in"
  // can restore the same account later by matching the phone number used at signup.
  const handleLogout = () => {
    setProfile(null); setPendingReg(null); setResumeReg(null); setShowDiagnostic(false); setRetaking(false);
    setTopicMastery({}); setUniTopicMastery({}); setPractice({}); setUniPractice({}); setPlan([]); setBonusXp(0); setTab("dashboard"); setEntry("welcome");
  };

  // Matches either a phone number or an email+password against whatever's currently saved in
  // this browser. Returns true/false so the Login screen can show "account not found" inline
  // instead of failing silently.
  const handleLogin = ({ phone, email, password } = {}) => {
    const data = loadSaved();
    if (!data?.profile) return false;
    const matched = phone
      ? data.profile.phone?.replace(/\s+/g, "") === phone.replace(/\s+/g, "")
      : data.profile.email?.trim().toLowerCase() === email.trim().toLowerCase() && data.profile.password === password;
    if (!matched) return false;
    setProfile(data.profile);
    setTopicMastery(data.topicMastery ?? {});
    setUniTopicMastery(data.uniTopicMastery ?? {});
    setPractice(data.practice ?? {});
    setUniPractice(data.uniPractice ?? {});
    setPlan(data.plan ?? []);
    setBonusXp(data.bonusXp ?? 0);
    setShowWelcomeBack(true);
    setTab(data.profile.educationLevel === "university" ? "universityHub" : "dashboard");
    return true;
  };

  // Registration collects answers, then the student chooses to take the diagnostic now or explore
  // first — self-reports alone aren't trusted, but personalization is never required to start.
  // University profiles skip AssessmentChoice/Diagnostic entirely — there's no BAC II mastery
  // engine for them, so the account activates immediately into the University Hub.
  const handleRegister = (reg) => {
    if (reg.educationLevel === "university") {
      // Register's form keeps these as flat fields (universityGoals/Major/Year); nest them into
      // universityProfile here so UniversityHub, the University Mentor Coach mode and
      // deriveInsights only ever have one shape to read from.
      const { universityGoals, universityMajor, universityYear, ...rest } = reg;
      const built = buildProfile({ ...rest, universityProfile: { goals: universityGoals, major: universityMajor, year: universityYear } });
      setProfile({ ...built, hasCompletedDiagnostic: false, isPersonalized: false, bannerDismissed: false });
      setTab("universityHub");
      return;
    }
    setPendingReg(reg); setResumeReg(null);
  };
  // "Back" from the step-4 AssessmentChoice screen — re-opens Register at step 3 with prior answers intact.
  const handleBackToPreferences = () => { setResumeReg({ form: pendingReg, step: 3 }); setPendingReg(null); };
  const handleDiagnosticComplete = (diagnosticMastery) => {
    const built = buildProfile(pendingReg);
    const insights = deriveInsights(built, diagnosticMastery);
    setTopicMastery(diagnosticMastery);
    setProfile({ ...built, hasCompletedDiagnostic: true, isPersonalized: true, bannerDismissed: false });
    setPlan(insights.plan);
    setPendingReg(null);
    setShowDiagnostic(false);
  };
  // "Explore First" — skip the diagnostic and go straight to an unpersonalized dashboard.
  const handleSkipDiagnostic = () => {
    const built = buildProfile(pendingReg);
    const insights = deriveInsights(built, {});
    setTopicMastery({});
    setProfile({ ...built, hasCompletedDiagnostic: false, isPersonalized: false, bannerDismissed: false });
    setPlan(insights.plan);
    setPendingReg(null);
  };
  // Completing the diagnostic later, from the Dashboard banner — updates the existing profile
  // in place instead of building a fresh one.
  const handleLaterDiagnosticComplete = (diagnosticMastery) => {
    const updated = { ...profile, hasCompletedDiagnostic: true, isPersonalized: true, bannerDismissed: true };
    const insights = deriveInsights(updated, diagnosticMastery);
    setTopicMastery(diagnosticMastery);
    setProfile(updated);
    setPlan(insights.plan);
    setRetaking(false);
  };
  const dismissBanner = () => setProfile((cur) => ({ ...cur, bannerDismissed: true }));

  // Real day-streak and weekly study time, computed from actual answered-question timestamps
  // (both tracks) — not static profile fields, so they're 0 until a student actually earns them.
  const streakStats = useMemo(() => computeStreakStats(topicMastery, uniTopicMastery), [topicMastery, uniTopicMastery]);
  const weeklyStudyHours = useMemo(() => buildWeeklyStudyHours(topicMastery, uniTopicMastery), [topicMastery, uniTopicMastery]);

  // Live insights recompute from topicMastery on every change — this is what makes weak/strong
  // subjects, the recommended lesson, and exam readiness actually update as the student practices.
  const insights = useMemo(() => (profile ? deriveInsights(profile, topicMastery, streakStats.streak) : null), [profile, topicMastery, streakStats.streak]);
  const uniInsights = useMemo(
    () => (profile?.educationLevel === "university" ? deriveUniInsights(profile, uniTopicMastery) : null),
    [profile, uniTopicMastery]
  );
  const p = useMemo(
    () => (profile ? { ...profile, ...insights, streak: streakStats.streak, longestStreak: streakStats.longestStreak, universityInsights: uniInsights } : null),
    [profile, insights, uniInsights, streakStats]
  );

  // Level up whenever XP crosses the next threshold (can chain multiple levels from one big award).
  useEffect(() => {
    if (!profile) return;
    const totalXp = profile.xp + bonusXp;
    if (totalXp >= profile.xpToNext) {
      setProfile((cur) => {
        let level = cur.level, xpToNext = cur.xpToNext;
        while (cur.xp + bonusXp >= xpToNext) { level += 1; xpToNext = Math.round(xpToNext * 1.35); }
        setLevelUpToast(level);
        return { ...cur, level, xpToNext };
      });
    }
  }, [profile, bonusXp]);
  useEffect(() => {
    if (!levelUpToast) return;
    const timer = setTimeout(() => setLevelUpToast(null), 2600);
    return () => clearTimeout(timer);
  }, [levelUpToast]);
  // University Hub content is English-only (see UNI_QUIZ_BANK / UNI_PROFILE_INFO) — the language
  // toggle is hidden for this track (below), but if a student switched to Khmer on a previous
  // high-school profile in this browser, force it back to English rather than stranding them in
  // a language they now have no in-app way to change.
  useEffect(() => {
    if (profile?.educationLevel === "university" && lang !== "en") setLang("en");
  }, [profile, lang]);

  const togglePlanTask = (id) => {
    const target = plan.find((x) => x.id === id);
    if (!target) return;
    const nowDone = !target.done;
    setPlan((arr) => arr.map((x) => (x.id === id ? { ...x, done: nowDone } : x)));
    setBonusXp((x) => Math.max(0, x + (nowDone ? 20 : -20)));
  };

  // Record an answered exercise: bookkeeping for XP (unchanged) + feeding the topic-mastery engine
  // (new) so the subject's score, weak/strong tag, and every derived recommendation update live.
  const handleAnswer = (ex, result, meta = {}) => {
    const already = practice[ex.id]?.xpAwarded;
    const xpAwarded = already || result === "correct";
    setPractice((prev) => ({ ...prev, [ex.id]: { status: result === "correct" ? "completed" : "in_progress", result, at: Date.now(), subject: ex.subject, topic: ex.topic, xpAwarded } }));
    if (result === "correct" && !already) setBonusXp((x) => x + 30);
    setTopicMastery((tm) => recordAttempt(tm, ex.subject, ex.topic, {
      correct: result === "correct", difficulty: ex.difficulty, timeSec: meta.timeSec ?? null, mistakeType: meta.mistakeType ?? null, confidence: null, ts: Date.now(),
    }));
  };
  // Manually set a status (Pending / In progress / Completed). XP is only ever awarded once per exercise.
  const handleSetStatus = (ex, status) => {
    const already = practice[ex.id]?.xpAwarded;
    const xpAwarded = already || status === "completed";
    setPractice((prev) => ({ ...prev, [ex.id]: { ...(prev[ex.id] || { result: null }), status, at: Date.now(), subject: ex.subject, topic: ex.topic, xpAwarded } }));
    if (status === "completed" && !already) setBonusXp((x) => x + 30);
  };
  // University-track twins of handleAnswer/handleSetStatus above — same logic, writing to the
  // uniPractice/uniTopicMastery stores instead so BAC-II and university progress never collide.
  const handleUniAnswer = (ex, result, meta = {}) => {
    const already = uniPractice[ex.id]?.xpAwarded;
    const xpAwarded = already || result === "correct";
    setUniPractice((prev) => ({ ...prev, [ex.id]: { status: result === "correct" ? "completed" : "in_progress", result, at: Date.now(), subject: ex.subject, topic: ex.topic, xpAwarded } }));
    if (result === "correct" && !already) setBonusXp((x) => x + 30);
    setUniTopicMastery((tm) => recordAttempt(tm, ex.subject, ex.topic, {
      correct: result === "correct", difficulty: ex.difficulty, timeSec: meta.timeSec ?? null, mistakeType: meta.mistakeType ?? null, confidence: null, ts: Date.now(),
    }));
  };
  const handleUniSetStatus = (ex, status) => {
    const already = uniPractice[ex.id]?.xpAwarded;
    const xpAwarded = already || status === "completed";
    setUniPractice((prev) => ({ ...prev, [ex.id]: { ...(prev[ex.id] || { result: null }), status, at: Date.now(), subject: ex.subject, topic: ex.topic, xpAwarded } }));
    if (status === "completed" && !already) setBonusXp((x) => x + 30);
  };

  if (pendingReg && !showDiagnostic) return <AssessmentChoice reg={pendingReg} dark={dark} setDark={setDark} onStart={() => setShowDiagnostic(true)} onSkip={handleSkipDiagnostic} onBack={handleBackToPreferences} lang={lang} setLang={setLang} />;
  if (pendingReg) return <Diagnostic reg={pendingReg} dark={dark} onComplete={handleDiagnosticComplete} lang={lang} />;
  if (!profile && entry === "welcome") return <Welcome dark={dark} setDark={setDark} lang={lang} setLang={setLang} onLogin={() => setEntry("login")} onCreate={() => setEntry("create")} />;
  if (!profile && entry === "login") return <Login dark={dark} setDark={setDark} onBack={() => setEntry("welcome")} onLogin={handleLogin} onCreateInstead={() => setEntry("create")} lang={lang} setLang={setLang} />;
  if (!profile) return <Register onComplete={handleRegister} dark={dark} setDark={setDark} initialForm={resumeReg?.form} initialStep={resumeReg?.step} onBack={() => setEntry("welcome")} lang={lang} setLang={setLang} />;
  if (retaking) return <Diagnostic reg={profile} dark={dark} onComplete={handleLaterDiagnosticComplete} lang={lang} />;
  if (takingLangTest) return (
    <IeltsDiagnostic
      dark={dark}
      onExit={() => setTakingLangTest(null)}
      onComplete={(res) => { setLangResults((r) => ({ ...r, [takingLangTest]: res })); setTakingLangTest(null); }}
    />
  );

  const initials = profile.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const isUniProfile = profile.educationLevel === "university";
  const view = {
    dashboard: <Dashboard p={p} go={go} plan={plan} onTogglePlan={togglePlanTask} bonusXp={bonusXp} onStartAssessment={() => setRetaking(true)} onDismissBanner={dismissBanner} lang={lang} />,
    browse: <Browse p={p} lang={lang} />,
    practice: <Practice p={p} practice={practice} onAnswer={handleAnswer} onSetStatus={handleSetStatus} lang={lang} />,
    universities: <Universities p={p} lang={lang} />, languages: <Languages results={langResults} onTakeDiagnostic={(name) => setTakingLangTest(name)} lang={lang} />, coach: <Coach p={p} lang={lang} />,
    progress: isUniProfile ? <UniversityProgress p={p} lang={lang} /> : <Progress p={p} practice={practice} bonusXp={bonusXp} lang={lang} weeklyStudyHours={weeklyStudyHours} />,
    universityHub: <UniversityHub p={p} go={go} onPracticeCourse={(courseId) => { setUniPracticeTarget(courseId); go("uniPractice"); }} lang={lang} />,
    explore: <UniversityExplore p={p} go={go} lang={lang} />,
    scholarships: <Scholarships p={p} lang={lang} />,
    uniPractice: <UniversityPractice p={p} uniPractice={uniPractice} onAnswer={handleUniAnswer} onSetStatus={handleUniSetStatus}
      initialCourseId={uniPracticeTarget} onConsumeInitialCourse={() => setUniPracticeTarget(null)} lang={lang} />,
    super: <SuperBondus p={p} lang={lang} />,
  }[tab];

  return (
    <div className={`eai-root ${dark ? "theme-dark" : "theme-light"}`}>
      <style>{STYLES}</style>
      <WelcomeBackToast name={profile.name} show={showWelcomeBack} />
      <LevelUpToast level={levelUpToast} show={levelUpToast != null} />
      <div className="flex">
        {open && <div className="fixed inset-0 z-20 lg:hidden" style={{ background: "rgba(0,0,0,.4)" }} onClick={() => setOpen(false)} />}
        <aside className={`fixed lg:sticky top-0 z-30 h-screen w-64 flex-shrink-0 border-r flex flex-col ${open ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
          style={{ background: "var(--card)", borderColor: "var(--line)", transition: "transform .25s ease" }}>
          <div className="p-5 flex items-center gap-2.5">
            <div className="grid place-items-center rounded-xl overflow-hidden" style={{ width: 40, height: 40 }}>
              <BondusLogo />
            </div>
            <div><p className="eai-display font-extrabold leading-none">Bondus {isUniProfile ? "University" : "Highschool"}</p></div>
          </div>
          <nav className="px-3 space-y-1 flex-1 overflow-y-auto eai-scroll">
            {(isUniProfile ? UNI_NAV : NAV).map((n) => {
              const on = tab === n.id;
              const premiumColor = "var(--gold)";
              return (
                <button key={n.id} onClick={() => go(n.id)} className="eai-nav eai-focus w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left"
                  style={{
                    background: on ? (n.premium ? "var(--gold-soft)" : "var(--primary-soft)") : "transparent",
                    color: on ? (n.premium ? premiumColor : "var(--primary)") : n.premium ? premiumColor : "var(--ink)",
                  }}>
                  <n.icon size={19} />
                  <span className={`text-sm font-semibold flex-1 ${lang === "km" ? "eai-km" : ""}`}>{lang === "km" ? n.labelKm : n.label}</span>
                  {n.premium && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "var(--gold)", color: "#fff", letterSpacing: ".02em" }}>PRO</span>
                  )}
                </button>
              );
            })}
          </nav>
          <div className="p-3 space-y-2">
            <div className="eai-soft rounded-2xl p-4 text-center">
              <Flame size={20} style={{ color: "var(--ember)", margin: "0 auto" }} />
              <p className="text-xs font-semibold mt-2">{p.streak}-day streak</p>
              <p className={`text-xs eai-muted ${lang === "km" ? "eai-km" : ""}`}>{t(lang, "streakKeepIt")}</p>
            </div>
            <button onClick={handleLogout} className={`eai-focus w-full text-center text-xs eai-muted py-1.5 hover:underline ${lang === "km" ? "eai-km" : ""}`}>{t(lang, "logOut")}</button>
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          <header className="sticky top-0 z-10 border-b" style={{ background: "color-mix(in srgb, var(--bg) 85%, transparent)", borderColor: "var(--line)", backdropFilter: "blur(8px)" }}>
            <div className="px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
              <button className="lg:hidden eai-focus" onClick={() => setOpen(true)}><Menu size={22} /></button>
              <div className="hidden sm:flex items-center gap-2">
                <Pill icon={Flame} color="var(--ember)" soft="var(--ember-soft)" value={p.streak} label={lang === "km" ? "ថ្ងៃជាប់គ្នា" : "streak"} />
                <Pill icon={Zap} color="var(--gold)" soft="var(--gold-soft)" value={(profile.xp + bonusXp).toLocaleString()} label="XP" />
                <Pill icon={TrendingUp} color="var(--primary)" soft="var(--primary-soft)" value={`Lv ${profile.level}`} label="" />
              </div>
              <div className="flex items-center gap-2 ml-auto">
                {!isUniProfile && <LangToggle lang={lang} setLang={setLang} style={{ width: "auto", height: 38 }} />}
                <button onClick={() => setDark((d) => !d)} className="eai-btn eai-focus grid place-items-center" style={{ width: 38, height: 38, color: "var(--ink)", background: "var(--card)", border: "1px solid var(--line)" }}>
                  {dark ? <Sun size={18} /> : <Moon size={18} />}
                </button>
                <div className="grid place-items-center rounded-full text-sm font-bold text-white" style={{ width: 38, height: 38, background: "var(--primary)" }}>{initials}</div>
              </div>
            </div>
          </header>
          <main className={`p-4 sm:p-6 mx-auto ${tab === "browse" ? "max-w-full" : "max-w-6xl"}`}>
            <AnimatePresence mode="wait">
              <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
                {view}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </div>
  );
}

