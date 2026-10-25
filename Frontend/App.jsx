import React, { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
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
  Shirt, Trash2, Mail, MailCheck, School,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { UNIS, UNI_MAJORS, UNI_SCHOLARSHIPS, UNI_PROFILE_INFO } from "../src/data/universities.js";
import { UNI_QUIZ_BANK } from "../src/data/universityQuizBank.js";
import { ABROAD_COUNTRIES, ABROAD_UNIVERSITIES } from "../src/data/abroadUniversities.js";
import { RAW_EXERCISES } from "../src/data/bacExercises.js";
import { FIELD_SUBJECTS, FOREIGN_LANGUAGE, FOREIGN_LANGUAGES, fieldSubjects, subjectId, subjectLabel } from "./subjects.js";
import { hasDiagnostic, diagnosticSubjects, buildSections, locate } from "./diagnosticPlan.js";
import { useExamSessions } from "./useExamSessions.js";
import { ExamTimerBar, SubmitSheet, ExamResultCard, RunningChip, JoinSchoolCard, SchoolReportPage } from "./ExamSessionUi.jsx";
import SubjectIcon from "./SubjectIcon.jsx";
import { EXAM_PAPER_PDFS, EXAM_PAPER_IMAGES, newestPaperYear } from "./examPapers.js";
import StudyOwlScene from "./StudyOwlScene.jsx";
import SubjectRibbon from "./SubjectRibbon.jsx";
import { HeroPlaneDefs, HeroPlaneBack, HeroPlaneFront } from "./HeroPlane.jsx";
import { emptyRewards, sanitizeRewards, claimBox, equipItem, sanitizeOutfit, advanceLevel } from "./rewards/rewardLogic.js";
import { todaysTasks, addTask, toggleTask, removeTask, remainingSuggestions, MAX_TITLE_LENGTH, MAX_TASKS_PER_DAY } from "./dailyPlan.js";
import LoadingScreen from "./LoadingScreen.jsx";
import { createApi } from "./api.js";
import {
  userToProfile, registrationToPayload, registrationToPatch, registrationErrorStep, taskFromServer, stateToSave,
  answerEvent, statusEvent, boxEvent, diagnosticEvent, apiErrorKey, waitParts, isCodeAlreadySent,
} from "./serverMapping.js";
import { createEventQueue } from "./eventQueue.js";
import { createStateSaver } from "./stateSaver.js";
import { RewardsContext, useRewards } from "./rewards/RewardsContext.jsx";
import { OutfitLayers } from "./rewards/itemArt.jsx";
import { REWARD_STYLES } from "./rewards/rewardStyles.js";
import TreasureBox from "./rewards/TreasureBox.jsx";
import Wardrobe from "./rewards/Wardrobe.jsx";
import { setIndexes, nextInSet, nextSetStart } from "./practiceFlow.js";
import { CHEER_STRINGS, pickCheer } from "./mascotCheers.js";
import { SCENE_W, SCENE_H, TOTAL_S, HOP_AT, HOP_S, ISO_MATRIX, PHONE_C, STAND, OWL_HEAD, OWL_SVG, STAND_TRANSFORM, planeKeyframesCss, riderKeyframesCss, vanishKeyframesCss } from "./heroFlight.js";

/* ════════════════════════ Configuration / domain data ════════════════════════ */
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

/* XP paid the first time an exercise is answered correctly. One constant, so the dashboard's lesson
   card can never promise a different number than the handlers below actually pay out. */
const XP_PER_CORRECT = 30;

/* The backend (Laravel API, /api/v1). With VITE_API_URL set, students sign in on the server and their progress, XP,
   streak and daily plan live there. With it unset the app is the old browser-only prototype, unchanged. */
const api = createApi({ baseUrl: import.meta.env.VITE_API_URL });
const SERVER_MODE = api.enabled;
const safeStorage = () => { try { return globalThis.localStorage ?? null; } catch { return null; } };
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
  const subjectNames = fieldSubjects(p.field, p.foreignLanguage);
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
  if (strong[0]) plan.push({ id: 90, s: strong[0].s, task: `${strong[0].s} flash quiz`, min: 15, why: "Spaced revision", done: false });
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
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Kantumruy+Pro:wght@400;500;600;700;800&family=Caveat:wght@600;700&display=swap');

.eai-root{ font-family:'Plus Jakarta Sans', system-ui, sans-serif; color:var(--ink);
  background:var(--bg); min-height:100vh; -webkit-font-smoothing:antialiased; }
.eai-display{ font-family:'Sora', system-ui, sans-serif; letter-spacing:-0.02em; }
.eai-km{ font-family:'Kantumruy Pro', system-ui, sans-serif; }
/* High School + Khmer language: force Kantumruy Pro on every element in the app shell, overriding
   the Sora/Plus Jakarta Sans/inline font-family rules above — so switching to Khmer doesn't depend
   on every new component remembering to tag itself with .eai-km. Never applied to the University
   track (see isUniProfile guard at each .eai-root that adds this class). */
.eai-km-root, .eai-km-root *{ font-family:'Kantumruy Pro', system-ui, sans-serif !important; }

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

/* Streak pill flame: an organic, irregular flicker (scale/skew/rotate all drift out of sync with
   each other) plus a pulsing ember glow, looping forever — reads as a living flame rather than a
   metronomic pulse. */
.eai-fx-fire{ display:inline-flex; transform-origin:50% 92%; animation:eai-fire-flicker 1.7s ease-in-out infinite; }
/* Same flicker, stretched to twice the duration — for a larger, more prominent flame (like the
   Dashboard streak card) where a slow, gentle flicker reads better than the pill's quicker one. */
.eai-fx-fire-slow{ display:inline-flex; transform-origin:50% 92%; animation:eai-fire-flicker 3.4s ease-in-out infinite; }
@keyframes eai-fire-flicker{
  0%   { transform:scale(1,1) rotate(0deg) skewX(0deg); filter:drop-shadow(0 0 2px var(--ember)) brightness(1); }
  13%  { transform:scale(1.1,0.9) rotate(-4deg) skewX(2deg); filter:drop-shadow(0 0 6px var(--ember)) brightness(1.2); }
  27%  { transform:scale(0.93,1.08) rotate(3deg) skewX(-2deg); filter:drop-shadow(0 0 3px var(--ember)) brightness(0.92); }
  41%  { transform:scale(1.07,0.95) rotate(-2deg) skewX(1deg); filter:drop-shadow(0 0 7px var(--ember)) brightness(1.25); }
  56%  { transform:scale(0.96,1.06) rotate(4deg) skewX(-1deg); filter:drop-shadow(0 0 3px var(--ember)) brightness(0.97); }
  70%  { transform:scale(1.08,0.93) rotate(-3deg) skewX(2deg); filter:drop-shadow(0 0 6px var(--ember)) brightness(1.15); }
  85%  { transform:scale(0.97,1.04) rotate(1deg) skewX(-1deg); filter:drop-shadow(0 0 4px var(--ember)) brightness(1.05); }
  100% { transform:scale(1,1) rotate(0deg) skewX(0deg); filter:drop-shadow(0 0 2px var(--ember)) brightness(1); }
}

/* XP pill lightning: mostly still, punctuated by two quick bright strikes per loop (a double-flash
   strobe, like a real bolt), instead of a smooth rhythmic pulse. */
.eai-fx-bolt{ display:inline-flex; animation:eai-bolt-flicker 2.6s ease-in-out infinite; }
@keyframes eai-bolt-flicker{
  0%, 38%, 53%, 78%, 100% { filter:drop-shadow(0 0 1px var(--gold)) brightness(1); opacity:1; }
  40%  { filter:drop-shadow(0 0 3px var(--gold)) brightness(1.3); opacity:.9; }
  43%  { filter:drop-shadow(0 0 9px #fff59d) brightness(2); opacity:1; }
  46%  { filter:drop-shadow(0 0 2px var(--gold)) brightness(0.9); opacity:.85; }
  50%  { filter:drop-shadow(0 0 10px #fff59d) brightness(2.1); opacity:1; }
  80%  { filter:drop-shadow(0 0 6px var(--gold)) brightness(1.5); opacity:1; }
}

/* Level pill trending-up arrow: a gentle climbing drift — eases upward with a brightening glow,
   then resets — evoking a graph line (or rocket) actually ascending, looping forever. */
.eai-fx-climb{ display:inline-flex; animation:eai-climb-drift 2s ease-in-out infinite; }
@keyframes eai-climb-drift{
  0%   { transform:translateY(0) scale(1); filter:drop-shadow(0 0 1px var(--primary)) brightness(1); }
  35%  { transform:translateY(-2px) scale(1.04); filter:drop-shadow(0 0 4px var(--primary)) brightness(1.1); }
  60%  { transform:translateY(-3.5px) scale(1.07); filter:drop-shadow(0 0 6px var(--primary)) brightness(1.2); }
  80%  { transform:translateY(-1px) scale(1.03); filter:drop-shadow(0 0 3px var(--primary)) brightness(1.08); }
  100% { transform:translateY(0) scale(1); filter:drop-shadow(0 0 1px var(--primary)) brightness(1); }
}
/* Explore-tile icons (Dashboard's Practice/Universities/Browse/Progress cards): same idea as the
   header pills above — the glyph itself is animated and only the glyph glows (drop-shadow tinted
   by --icon-glow, each tile's own accent color). The badge behind it stays flat: no halo. Each icon
   gets a motion that suits it, and --icon-glow-delay staggers the four so they don't move in
   robotic unison. */
.eai-ico{ display:inline-flex; animation-duration:2.6s; animation-timing-function:ease-in-out; animation-iteration-count:infinite; animation-delay:var(--icon-glow-delay, 0s); }
.eai-ico-target{ animation-name:eai-ico-lockon; }
.eai-ico-cap{ transform-origin:50% 80%; animation-name:eai-ico-toss; }
.eai-ico-book{ transform-origin:50% 90%; animation-name:eai-ico-flip; }
.eai-ico-chart{ transform-origin:50% 100%; animation-name:eai-ico-grow; }
/* Target: a quick "lock-on" pulse — shrinks in, snaps out bright, settles. */
@keyframes eai-ico-lockon{
  0%, 100%{ transform:scale(1); filter:drop-shadow(0 0 1px var(--icon-glow, var(--primary))) brightness(1); }
  30%{ transform:scale(.88); filter:drop-shadow(0 0 2px var(--icon-glow, var(--primary))) brightness(1); }
  45%{ transform:scale(1.14); filter:drop-shadow(0 0 8px var(--icon-glow, var(--primary))) brightness(1.3); }
  65%{ transform:scale(1); filter:drop-shadow(0 0 3px var(--icon-glow, var(--primary))) brightness(1.05); }
}
/* Graduation cap: a little graduation-day toss — tips back, hops up, drops back down. */
@keyframes eai-ico-toss{
  0%, 100%{ transform:translateY(0) rotate(0deg); filter:drop-shadow(0 0 1px var(--icon-glow, var(--primary))) brightness(1); }
  25%{ transform:translateY(0) rotate(-7deg); filter:drop-shadow(0 0 3px var(--icon-glow, var(--primary))) brightness(1.1); }
  50%{ transform:translateY(-4px) rotate(6deg); filter:drop-shadow(0 0 8px var(--icon-glow, var(--primary))) brightness(1.25); }
  75%{ transform:translateY(0) rotate(-2deg); filter:drop-shadow(0 0 3px var(--icon-glow, var(--primary))) brightness(1.05); }
}
/* Open book: pages "breathe" open and shut, with the glow rising as it opens. */
@keyframes eai-ico-flip{
  0%, 100%{ transform:scale(1,1); filter:drop-shadow(0 0 1px var(--icon-glow, var(--primary))) brightness(1); }
  40%{ transform:scale(1.12,.94); filter:drop-shadow(0 0 7px var(--icon-glow, var(--primary))) brightness(1.25); }
  65%{ transform:scale(.95,1.05); filter:drop-shadow(0 0 3px var(--icon-glow, var(--primary))) brightness(1.05); }
}
/* Bar chart: bars "grow" — stretches up from the baseline with a brightening glow, then resets. */
@keyframes eai-ico-grow{
  0%, 100%{ transform:scale(1,1); filter:drop-shadow(0 0 1px var(--icon-glow, var(--primary))) brightness(1); }
  35%{ transform:scale(.96,.82); filter:drop-shadow(0 0 2px var(--icon-glow, var(--primary))) brightness(1); }
  60%{ transform:scale(1.04,1.14); filter:drop-shadow(0 0 8px var(--icon-glow, var(--primary))) brightness(1.3); }
  80%{ transform:scale(1,1.03); filter:drop-shadow(0 0 3px var(--icon-glow, var(--primary))) brightness(1.08); }
}
@media (prefers-reduced-motion: reduce){ .eai-rise{ animation:none; } .eai-btn,.eai-tile,.eai-pick{ transition:none; } .eai-fx-fire,.eai-fx-fire-slow,.eai-fx-bolt,.eai-fx-climb,.eai-ico{ animation:none; } }

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
.eai-exam-options{ display:flex; flex-wrap:wrap; gap:8px 14px; align-items:center; padding:0 6px 8px; font-size:13px; color:var(--muted); }
.eai-exam-options label{ display:flex; align-items:center; gap:6px; }
.eai-exam-options select{ background:var(--card); color:var(--ink); border:1px solid var(--line); border-radius:10px; padding:5px 8px; font:inherit; font-size:13px; max-width:100%; }
.eai-exam-check input{ accent-color:var(--primary); width:15px; height:15px; }
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
.eai-hero-card{ position:relative; overflow:hidden; border-radius:22px; background:var(--card); border:1px solid var(--line); box-shadow:var(--shadow); display:flex; flex-direction:column; }
@media (min-width:640px){ .eai-hero-card{ flex-direction:row; } }
.eai-hero-content{ position:relative; z-index:3; padding:32px; flex:1 1 auto; min-width:0; }
@media (max-width:640px){ .eai-hero-content{ padding:24px 24px 8px; } }
/* The study scene: a tinted "room" (wall = the box's own background, floor/desk drawn by the SVG)
   that fades in from the text side — or from the top when stacked on phones — and sits flush with
   the card's bottom-right corner. The fade is a CSS mask, so the wall, floor and props all share it;
   the SVG's viewBox leaves 36 units (5.7% of its width) of empty wall on the left for it to happen in.
   The box takes whatever the greeting doesn't need (it keeps ~436px so both buttons stay on one row);
   the SVG is height-capped, so on very wide cards it stops growing and the extra width is just wall. */
.eai-hero-mascot{ --hero-floor:#D8D7F0; --hero-base:rgba(255,255,255,.45); position:relative; z-index:3; overflow:hidden; display:flex; align-items:flex-end; justify-content:center;
  background:var(--primary-soft);
  -webkit-mask-image:linear-gradient(180deg, transparent 0, #000 18px); mask-image:linear-gradient(180deg, transparent 0, #000 18px); }
@media (min-width:640px){
  .eai-hero-mascot{ flex:0 1 calc(100% - 436px); min-width:260px; max-width:460px;
    -webkit-mask-image:linear-gradient(90deg, transparent 0, #000 5.5%); mask-image:linear-gradient(90deg, transparent 0, #000 5.5%); }
}
.theme-dark .eai-hero-mascot{ --hero-floor:#15172F; --hero-base:rgba(255,255,255,.06); }
/* Handwriting on the study scene's whiteboard — beats the Khmer UI's blanket font override */
.eai-hand{ font-family:'Caveat','Segoe Print','Bradley Hand','Comic Sans MS',cursive; }
.eai-km-root .eai-hand{ font-family:'Caveat','Segoe Print','Bradley Hand','Comic Sans MS',cursive !important; }
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
  --bg:#FFFFFF; --card:#FFFFFF; --surface-2:#FFFFFF; --bg-soft:#F3F4F6;
  --ink:#111827; --muted:#6B7280; --label:#4B5563; --muted-2:#9CA3AF; --line:#E5E7EB;
  --input-border:#E5E7EB; --input-border-hover:#D1D5DB; --focus-border:#1D4ED8;
  --primary:#1D4ED8; --primary-hover:#1E40AF; --primary-soft:#EFF6FF; --primary-ring:rgba(29,78,216,.14);
  --gold:#EE9A21; --gold-soft:#FFF0D4; --ember:#DC2626;
  --progress-track:#E5E7EB; --progress-fill:#1D4ED8;
  --ob-disabled:#E5E7EB; --ob-disabled-edge:#D1D5DB;
  --shadow:none;
  --glass-bg:#FFFFFF; --glass-line:#E5E7EB; --glass-shadow:none;
}
.eai-onboarding.theme-dark{
  --bg:#111827; --card:#1F2937; --surface-2:#1F2937; --bg-soft:#1F2937;
  --ink:#F9FAFB; --muted:#9CA3AF; --label:#D1D5DB; --muted-2:#6B7280; --line:#374151;
  --input-border:#374151; --input-border-hover:#4B5563; --focus-border:#3B82F6;
  --primary:#3B82F6; --primary-hover:#60A5FA; --primary-soft:rgba(59,130,246,.14); --primary-ring:rgba(59,130,246,.2);
  --gold:#EFA421; --gold-soft:#302716; --ember:#F87171;
  --progress-track:#1F2937; --progress-fill:#1D4ED8;
  --ob-disabled:#374151; --ob-disabled-edge:#1F2937;
  --shadow:none;
  --glass-bg:#1F2937; --glass-line:#374151; --glass-shadow:none;
}
.eai-onboarding{ position:relative; transition:background-color .25s ease, color .25s ease; }


.eai-ob-heading{ margin-bottom:22px; }
.eai-ob-title{ font-family:'Sora', system-ui, sans-serif; font-weight:700; font-size:28px; letter-spacing:-.02em; line-height:1.22; color:var(--ink); }
.eai-ob-desc{ font-size:15px; color:var(--muted); margin-top:6px; max-width:620px; line-height:1.55; }
@media (max-width:640px){ .eai-ob-title{ font-size:24px; } }

/* "Mascot asks" question presentation — the owl beside a speech bubble holding the current
   step's question, one at a time, instead of a plain heading. */
.eai-ob-mascot-row{ display:flex; align-items:flex-start; gap:0px; margin-bottom:22px; }
.eai-ob-mascot-avatar{ width:152px; height:207px; flex-shrink:0; background:transparent; display:grid; place-items:center; }
.eai-ob-bubble{ position:relative; background:var(--card); border:2px solid var(--line); border-radius:16px; padding:14px 18px; box-shadow:none; flex:1; align-self:center; animation:eai-ob-bubble-in .35s ease-out; }
@keyframes eai-ob-bubble-in{ from{ opacity:0; transform:translateX(-8px) scale(.97); } to{ opacity:1; transform:none; } }
.eai-ob-bubble::before{ content:""; position:absolute; left:-8px; top:64px; width:14px; height:14px; background:var(--card);
  border-left:2px solid var(--line); border-bottom:2px solid var(--line); transform:rotate(45deg); border-radius:0 0 0 3px; }
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


/* One-shot "wave hello" gesture, triggered by the mascot's Wave button. No separate arm layer to
   swing, so this is a friendly whole-body wiggle (rotate/scale only, anchored) rather than a
   literal arm-raise — still reads as an energetic greeting. */
.eai-mascot-wave .eai-mascot-img{ animation:eai-mascot-wave .9s ease-in-out 1; }
@keyframes eai-mascot-wave{
  0%   { transform:rotate(0deg) scale(1); }
  15%  { transform:rotate(-9deg) scale(1.03); }
  30%  { transform:rotate(7deg) scale(1.03); }
  45%  { transform:rotate(-7deg) scale(1.02); }
  60%  { transform:rotate(5deg) scale(1.02); }
  75%  { transform:rotate(-3deg) scale(1.01); }
  100% { transform:rotate(0deg) scale(1); }
}

.eai-mascot-hover .eai-mascot-img{ animation:none; transform:rotate(-6deg) scale(1.06); transition:transform .25s ease-out; }

/* Toggled directly on OwlMascot's pointTargetRef element while the owl's "point" state is aiming
   at it — a glow ring + slight scale-up, so the gesture visibly lands on something. */
.eai-mascot-pointed{ box-shadow:0 0 0 4px var(--primary-soft), var(--shadow) !important; transform:scale(1.04); }

/* ── Landing hero: the owl flies its airplane in, lands it on a phone, and stands ─────────────────────
   One SVG drawing. Every movement is a CSS animation of the poses heroFlight.js generates, all on one clock
   (TOTAL_S): the plane's keyframes end at its stop, the owl's at its standing spot, so nothing is measured in JS. */
.eai-hero{ position:relative; width:min(100%, 560px, calc(60vh * 1.1818)); aspect-ratio:520 / 440; }
.eai-hero-svg{ display:block; width:100%; height:100%; overflow:visible; }
.eai-hero-bubble{ position:absolute; transform:translateX(-50%); }
.eai-hero-cloud{ animation:eai-hero-drift linear infinite; animation-duration:var(--cd); animation-delay:var(--cdl); }
@keyframes eai-hero-drift{ from{ transform:translateX(-260px); } to{ transform:translateX(620px); } }
.eai-plane{ animation:eai-plane-go ${TOTAL_S}s linear both; }
.eai-plane-vanish{ animation:eai-plane-vanish ${TOTAL_S}s linear both; }
.eai-rider{ animation:eai-rider-go ${TOTAL_S}s linear both; }
/* Once standing, the owl bobs up and down (3 scene units: about 3px at laptop size). */
.eai-rider-bob{ animation:eai-rider-bob 3.6s ease-in-out ${TOTAL_S}s infinite; }
@keyframes eai-rider-bob{ 0%, 100% { transform:translateY(0); } 50% { transform:translateY(-3px); } }
/* The propeller turns in its own plane: the blades sit in a group whose matrix (heroPlane.js) lays that plane into the
   scene's view, so spinning them about the hub here looks like a real disc turning. */
.eai-prop-spin{ transform-origin:0 0; animation:eai-prop-spin .32s linear infinite; }
@keyframes eai-prop-spin{ to{ transform:rotate(360deg); } }
.eai-stand-shadow{ animation:eai-stand-shadow ${HOP_S}s ease-out ${HOP_AT}s both; }
@keyframes eai-stand-shadow{ from{ opacity:0; } to{ opacity:1; } }
${planeKeyframesCss("eai-plane-go")}
${vanishKeyframesCss("eai-plane-vanish")}
${riderKeyframesCss("eai-rider-go")}
/* Coming back to the landing page from sign-up: the owl is already standing and nothing replays. */
.eai-hero-skip .eai-plane{ display:none; }
.eai-hero-skip .eai-rider{ animation:none; transform:${STAND_TRANSFORM}; }
.eai-hero-skip .eai-rider-bob{ animation-delay:0s; }
.eai-hero-skip .eai-stand-shadow{ animation:none; opacity:1; }
@media (prefers-reduced-motion: reduce){
  .eai-hero-cloud, .eai-plane, .eai-plane-vanish, .eai-rider, .eai-rider-bob, .eai-stand-shadow, .eai-prop-spin{ animation:none; }
  .eai-plane{ display:none; }
  .eai-rider{ transform:${STAND_TRANSFORM}; }
}

/* ── Landing page (Welcome): flat white, Duolingo-style ──────────────────────────────────────────
   Scoped to .eai-lp, so every other screen keeps the app's indigo theme. Rather than restyle each
   piece, .eai-lp re-points the colour tokens: what Welcome shares with other screens (the language
   toggle, the speech bubble, focus rings) picks the landing palette up by itself. The page is a plain
   solid colour — no gradient, no corner glows. The blue is a rich #1D4ED8 with a darker #1E40AF
   underside (white on it is 6.7:1, so the button labels pass WCAG AA); the neutrals are #111827
   (headline), #6B7280 (subtitle) and #E5E5E5 (borders). --lp-link is the blue used for text ("BONDUS",
   the secondary button). On the near-black dark page that deep blue would sink into the background (text
   2.9:1), so dark mode keeps a brighter fill (#2563EB over #1D4ED8) and lifts the text blue to #3B82F6. */
.eai-root.eai-lp{ --primary:#1D4ED8; --primary-deep:#1E40AF; --lp-link:#1D4ED8; --shadow:none; }
.eai-root.eai-lp.theme-light{
  --bg:#FFFFFF; --card:#FFFFFF; --ink:#111827; --muted:#6B7280; --line:#E5E5E5;
  --glass-bg:#FFFFFF; --glass-line:#E5E5E5; --glass-shadow:none; --lp-hover:#F7F7F7;
  --hero-cloud-1:#DBE8FA; --hero-cloud-2:#E6EEF8; --hero-cloud-3:#D2E2F6;
  --hero-phone:#1D4ED8; --hero-phone-edge:#1E3A8A; --hero-screen-a:#F7FAFF; --hero-screen-b:#DCE9FA;
  --hero-park:#BFDBFE; --hero-block:#93C5FD; --hero-runway:#CBD5E1; --hero-runway-line:#FFFFFF;
  --hero-plane-a:#3B82F6; --hero-plane-b:#1D4ED8; --hero-plane-wing:#60A5FA; --hero-plane-fin:#1E3A8A;
  --hero-plane-edge:#1E40AF; --hero-rim:#F8FAFC; --hero-interior:#172554; --hero-seat:#C27A0E;
  --hero-gold:#F5A623; --hero-prop:#374151;
  --hero-ground:rgba(15,23,42,.16);
}
.eai-root.eai-lp.theme-dark{
  --primary:#2563EB; --primary-deep:#1D4ED8; --lp-hover:var(--card); --lp-link:#3B82F6;
  --hero-cloud-1:#1A2348; --hero-cloud-2:#212B55; --hero-cloud-3:#172042;
  --hero-phone:#2563EB; --hero-phone-edge:#1E3A8A; --hero-screen-a:#1F2B55; --hero-screen-b:#2A3A72;
  --hero-park:#34478A; --hero-block:#4B5F9E; --hero-runway:#475569; --hero-runway-line:#E2E8F0;
  --hero-plane-a:#60A5FA; --hero-plane-b:#2563EB; --hero-plane-wing:#3B82F6; --hero-plane-fin:#1E3A8A;
  --hero-plane-edge:#1E3A8A; --hero-rim:#E2E8F0; --hero-interior:#0B1437; --hero-seat:#B7791F;
  --hero-gold:#F5A623; --hero-prop:#CBD5E1;
  --hero-ground:rgba(0,0,0,.45);
}
/* The speech bubble (an .eai-card) gets the same 2px outline as the buttons and corner chips; the
   bubble's tail is drawn with a 2px outline already, so it joins up. */
.eai-lp .eai-card{ border-width:2px; }
/* The two buttons are chunky pressable slabs: a 4px darker underside (a real border-bottom), a bold
   uppercase label, 16px corners. Pressing sinks the button onto its underside: the border shrinks and the
   button moves down by the same amount, with an equal margin added back so the button below never shifts.
   Both buttons come out exactly the same height (the primary's missing 2px top border is padding instead).
   Khmer has no letter case and breaks if it is letter-spaced, so only Latin text gets the tracking. */
.eai-lp-btn{ display:block; width:100%; padding:13px 16px; border:2px solid transparent; border-bottom-width:4px; border-radius:16px;
  font-size:15px; font-weight:700; line-height:1.35; text-align:center; text-transform:uppercase; cursor:pointer;
  transition:filter .15s ease, background-color .15s ease, transform .08s ease; }
.eai-lp-btn:not(.eai-km){ letter-spacing:.06em; }
.eai-lp-btn-primary{ background:var(--primary); color:#FFFFFF; border-width:0 0 4px; border-bottom-color:var(--primary-deep); padding-top:15px; }
.eai-lp-btn-primary:hover{ filter:brightness(1.07); }
.eai-lp-btn-primary:active{ border-bottom-width:0; margin-bottom:4px; transform:translateY(4px); }
.eai-lp-btn-secondary{ background:var(--bg); color:var(--lp-link); border-color:var(--line); }
.eai-lp-btn-secondary:hover{ background:var(--lp-hover); }
.eai-lp-btn-secondary:active{ border-bottom-width:2px; margin-bottom:2px; transform:translateY(2px); }
@media (prefers-reduced-motion: reduce){ .eai-lp-btn{ transition:none; } }

/* Subject ribbon: the strip of subjects along the bottom of the landing page (SubjectRibbon.jsx). A 1px top border
   in the page's line colour on the page background; names are small bold uppercase, muted until hovered. The track
   scrolls sideways with the scrollbar hidden, and the list centres itself when it fits (auto margins fall back to
   the start when it overflows, so nothing is cut off on the left). The arrows only show from 640px up: on a phone
   the strip is dragged. Khmer has no letter case and breaks if letter-spaced, so it gets a plain, larger size. */
.eai-ribbon{ background:var(--bg); border-top:1px solid var(--line); padding-bottom:env(safe-area-inset-bottom); }
.eai-ribbon-inner{ display:flex; align-items:center; max-width:1680px; margin:0 auto; padding:0 8px; }
.eai-ribbon-track{ flex:1 1 0; min-width:0; display:flex; overflow-x:auto; overscroll-behavior-x:contain; scrollbar-width:none; }
.eai-ribbon-track::-webkit-scrollbar{ display:none; }
.eai-ribbon-list{ display:flex; margin:0 auto; padding:0; list-style:none; }
.eai-ribbon-item{ display:flex; align-items:center; gap:10px; min-height:56px; padding:0 14px; background:none; border:0; cursor:pointer; white-space:nowrap;
  font-size:12px; font-weight:700; letter-spacing:.05em; text-transform:uppercase; color:var(--muted); transition:color .15s ease; }
.eai-ribbon-item:hover{ color:var(--ink); }
.eai-ribbon-item.eai-km{ font-size:14px; letter-spacing:normal; text-transform:none; }
.eai-ribbon-tile{ display:grid; place-items:center; flex:none; width:36px; height:28px; border-radius:8px; color:#FFFFFF; }
.eai-ribbon-arrow{ display:none; place-items:center; flex:none; width:40px; height:40px; background:none; border:0; border-radius:12px; cursor:pointer; color:var(--muted); transition:color .15s ease; }
.eai-ribbon-arrow:hover{ color:var(--ink); }
.eai-ribbon-arrow[aria-disabled="true"]{ opacity:.3; cursor:default; }
.eai-ribbon-arrow[data-idle="true"]{ visibility:hidden; }
@media (min-width:640px){ .eai-ribbon-arrow{ display:grid; } }
@media (prefers-reduced-motion: reduce){ .eai-ribbon-item, .eai-ribbon-arrow{ transition:none; } }

/* Duolingo-style MCQ layout: owl beside a bordered question card, options as full-width stacked
   rows instead of a plain grid. Stacks (mascot above card) below the sm breakpoint. */
.eai-ex-layout{ display:flex; align-items:flex-start; gap:18px; }
.eai-ex-mascot{ position:relative; width:150px; flex-shrink:0; }
/* The owl's speech bubble (cheers / gentle encouragement — see mascotCheers.js). Wide screens: it floats
   above the owl's head, tail pointing down at it. The owl wears 34px of padding-top so that room is always
   there (nothing moves when the bubble appears): the owl artwork already has 42px of empty space above its
   ears, and 34 + 42 fits the tallest bubble (2 lines = 64px) plus its 9px tail with a few px to spare.
   The bubble's bottom edge is therefore 64px below the column top. It may overhang the column by 8px each
   side (the 18px gap to the card keeps 10px clear), centred so the tail points at the owl. Every line stays
   within 2 lines at that width (checked in Edge for EN and KM). Phones: see the media query below. */
.eai-ex-owl{ padding-top:34px; }
.eai-ex-say{ position:absolute; left:-8px; right:-8px; bottom:calc(100% - 64px); display:flex; justify-content:center; pointer-events:none; z-index:2; }
.eai-ex-say .eai-tail-side{ display:none; }
.eai-ex-card{ flex:1; min-width:0; background:var(--card); border:2px solid color-mix(in srgb, var(--primary) 28%, var(--line)); border-radius:26px; padding:24px 26px; box-shadow:var(--shadow); }
.eai-ex-qlabel{ font-size:11px; font-weight:800; letter-spacing:.06em; text-transform:uppercase; color:var(--primary); }
.eai-ex-question{ font-size:19px; font-weight:800; margin:6px 0 18px; line-height:1.35; }
.eai-ex-options{ display:flex; flex-direction:column; gap:10px; }
.eai-ex-option{ width:100%; text-align:left; padding:14px 18px; border-radius:16px; font-size:14px; font-weight:600; display:flex; align-items:center; justify-content:space-between; gap:10px; transition:border-color .12s ease, background .12s ease, transform .1s ease; }
.eai-ex-option:active:not(:disabled){ transform:translateY(1px); }
@media (max-width:640px){
  .eai-ex-layout{ flex-direction:column; align-items:center; }
  /* Phones: the owl sits at the left of its row and its bubble beside it (tail pointing left) — no extra height. */
  .eai-ex-mascot{ width:100%; display:flex; align-items:center; gap:10px; }
  .eai-ex-owl{ width:104px; flex-shrink:0; padding-top:0; }
  .eai-ex-say{ position:static; flex:1; min-width:0; justify-content:flex-start; }
  .eai-ex-say .eai-tail-down{ display:none; }
  .eai-ex-say .eai-tail-side{ display:block; }
  .eai-ex-card{ width:100%; padding:20px; }
}

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


.eai-ob-tag{ display:inline-flex; align-items:center; gap:5px; font-size:11px; font-weight:600; padding:3px 9px; border-radius:999px; background:var(--glass-bg); border:1px solid var(--glass-line); color:var(--muted); }

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

.eai-km.eai-ob-btn-primary{ letter-spacing:normal; }
.eai-ob-btn-secondary{ height:50px; width:100%; border-radius:14px; font-weight:600; font-size:14px; background:var(--glass-bg); color:var(--ink);
  border:1px solid var(--glass-line); backdrop-filter:blur(16px) saturate(180%); -webkit-backdrop-filter:blur(16px) saturate(180%); box-shadow:var(--glass-shadow);
  transition:background-color .2s ease, border-color .2s ease, transform .12s ease; }
.eai-ob-btn-secondary:hover{ border-color:var(--primary); transform:translateY(-1px); }

.eai-ob-option-card{ position:relative; border-radius:16px; padding:22px; border:2px solid var(--line); border-bottom-width:4px; background:var(--card);
  backdrop-filter:blur(16px) saturate(180%); -webkit-backdrop-filter:blur(16px) saturate(180%); box-shadow:var(--glass-shadow);
  transition:background-color .2s ease, border-color .2s ease; display:flex; flex-direction:column; height:100%; }
.eai-ob-option-card.is-primary{ background:var(--primary-soft); border-color:var(--primary); }
.eai-ob-badge{ position:absolute; top:16px; right:16px; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.04em;
  padding:4px 9px; border-radius:999px; background:var(--primary); color:#fff; }
.eai-ob-benefits{ margin-top:12px; display:flex; flex-direction:column; gap:6px; }
.eai-ob-benefits li{ display:flex; align-items:center; gap:6px; font-size:12px; color:var(--muted); }

.eai-ob-footer{ text-align:center; font-size:13px; color:var(--muted); margin-top:18px; }

@media (prefers-reduced-motion: reduce){
  .eai-ob-btn-primary, .eai-ob-btn-secondary{ transition:none; }
  .eai-ob-bubble{ animation:none; }
}
${REWARD_STYLES}`;

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

function Pill({ icon: Icon, color, soft, label, value, effect }) {
  const fxClass = effect === "fire" ? "eai-fx-fire" : effect === "bolt" ? "eai-fx-bolt" : effect === "climb" ? "eai-fx-climb" : "";
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: soft }}>
      <span className={fxClass}><Icon size={16} style={{ color }} /></span>
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

/* White dashboard hero card: greeting + actions on the left, and on the right a little room where
   the owl mascot sits at his desk studying maths while a whiteboard writes the solution out (see
   StudyOwlScene.jsx). The scene is wider than the old standing owl, so on phones it stacks under the
   text instead of squeezing in beside it. */
function WelcomeHeroCard({ userName, greeting, message, onStartPlan, onAskCoach, lang = "en" }) {
  const firstName = (userName || "").split(" ")[0];
  return (
    <div className="eai-hero-card">
      <div className="eai-hero-content">
        <p className="eai-km eai-hero-greeting">{greeting}, {firstName}! 👋</p>
        <h2 className={`eai-hero-title ${lang === "km" ? "eai-km" : ""}`}>{lang === "km" ? `សូមស្វាគមន៍, ${firstName}` : `Welcome, ${firstName}.`}</h2>
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
      <div className="eai-hero-mascot" aria-hidden="true">
        <StudyOwlScene />
      </div>
    </div>
  );
}

/* Wide purple "recommended lesson" banner shown on the Dashboard. `imageUrl` is an optional decorative
   background (a handwritten-formula illustration by default) — purely decorative, so it renders with
   an empty alt and is hidden from screen readers. */
function RecommendedLessonCard({ title, subject, duration, description, xpNote, imageUrl, onStart, lang = "en" }) {
  return (
    <div className="eai-lesson-card">
      {imageUrl && <img src={imageUrl} alt="" aria-hidden="true" className="eai-lesson-decor" />}
      <div className="eai-lesson-overlay" />
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
        <div className="min-w-0">
          <div className={`eai-lesson-label ${lang === "km" ? "eai-km" : ""}`}><Star size={16} /> {t(lang, "recommendedNextLesson")}</div>
          <h3 className="eai-lesson-title">{subject}: {title}</h3>
          <p className={`eai-lesson-desc ${lang === "km" ? "eai-km" : ""}`}>{[duration && `${duration} ${t(lang, "lessonWord")}`, description, xpNote].filter(Boolean).join(" · ")}</p>
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

/* Switches the app's UI language (English / Khmer). Styled inline so it can sit in a flex row next to the
   theme toggle, in the onboarding header and on the landing page. */
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
    <div role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}
      aria-label={`Step ${step} of ${list.length}: ${list[step - 1]}`}
      className="h-3 w-full overflow-hidden rounded-full bg-[var(--progress-track)]">
      <div className="h-full rounded-full bg-[#1D4ED8] transition-[width] duration-300 ease-out motion-reduce:transition-none"
        style={{ width: `${pct}%` }} />
    </div>
  );
}
/* The onboarding screens' shared frame. It fills the whole screen (no card): a header with the back arrow, the
   progress bar and the language and theme toggles; the mascot and its speech bubble above the step's content;
   and an optional footer bar, pinned to the bottom, that holds the step's Continue button. Colours come from the
   .eai-onboarding tokens: pure white in light mode, #111827 in dark mode. */
function OnboardingLayout({ dark, setDark, step, stepLabels, stepLabelsKm, title, description, onBack, footer, children, lang = "en", setLang, mascotState = "idle" }) {
  const bubbleRef = useRef(null);
  const owlTrigger = useRef({ type: "no", nonce: 0, duration: 1.3 });
  const prevMascotState = useRef(mascotState);
  useEffect(() => {
    // Bridges the older idle/happy/sad/... state prop (still driven by real validation events,
    // e.g. Login's shake-on-error) into a one-shot "no" head-shake on the rigged owl.
    if (mascotState === "sad" && prevMascotState.current !== "sad") {
      owlTrigger.current = { type: "no", nonce: owlTrigger.current.nonce + 1, duration: 1.3 };
    }
    prevMascotState.current = mascotState;
  }, [mascotState]);

  return (
    <div className={`eai-root eai-onboarding ${dark ? "theme-dark" : "theme-light"} ${lang === "km" ? "eai-km-root" : ""} flex min-h-screen w-full flex-col justify-between bg-[var(--bg)] text-[var(--ink)]`}
      style={{ minHeight: "100dvh" }}>
      <style>{STYLES}</style>

      <header className="mx-auto flex w-full max-w-4xl items-center justify-between gap-4 px-6 py-6">
        {onBack ? (
          <button onClick={onBack} aria-label={t(lang, "backWord")}
            className="eai-focus grid h-10 w-10 shrink-0 place-items-center rounded-xl text-[var(--muted)] transition-colors hover:bg-[var(--primary-soft)] hover:text-[var(--primary)]">
            <ChevronLeft size={24} />
          </button>
        ) : (
          <span aria-hidden="true" className="h-10 w-10 shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          {step != null && <OnboardingProgress step={step} lang={lang} stepLabels={stepLabels} stepLabelsKm={stepLabelsKm} />}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {setLang && (
            <LangToggle lang={lang} setLang={setLang}
              style={{ height: 40, borderRadius: 12, border: "2px solid var(--line)", background: "var(--card)", boxShadow: "none", backdropFilter: "none", WebkitBackdropFilter: "none" }} />
          )}
          <button onClick={() => setDark((d) => !d)} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            className="eai-focus grid h-10 w-10 place-items-center rounded-xl border-2 border-[var(--line)] bg-[var(--card)] text-[var(--ink)] transition-colors">
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      <main className="eai-rise mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-8 px-4 pb-8">
        {(title || description) && (
          <div className="eai-ob-mascot-row w-full">
            <div className="eai-ob-mascot-avatar">
              <OwlMascot pointTargetRef={bubbleRef} triggerRef={owlTrigger} />
            </div>
            <div className="eai-ob-bubble" ref={bubbleRef}>
              {title && <h1 className={`eai-ob-title ${lang === "km" ? "eai-km" : ""}`}>{title}</h1>}
              {description && <p className={`eai-ob-desc ${lang === "km" ? "eai-km" : ""}`}>{description}</p>}
            </div>
          </div>
        )}
        <div className="w-full">{children}</div>
        <p className={`eai-ob-footer ${lang === "km" ? "eai-km" : ""}`}>{t(lang, "prototypeFooter")}</p>
      </main>

      {footer && (
        <footer className="sticky bottom-0 z-10 w-full border-t border-[var(--line)] bg-[var(--bg)] px-6 py-4">
          <div className="mx-auto flex w-full max-w-4xl justify-end">{footer}</div>
        </footer>
      )}
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
    <button
      className={`eai-ob-btn-primary eai-focus flex w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-[#1E40AF] bg-[#1D4ED8] px-8 py-3.5 text-[15px] font-bold uppercase tracking-wider text-white transition-[transform,background-color] duration-100 hover:bg-[#1E40AF] active:translate-y-[2px] active:border-b-2 disabled:cursor-not-allowed disabled:border-[var(--ob-disabled-edge)] disabled:bg-[var(--ob-disabled)] disabled:text-[var(--muted-2)] disabled:hover:bg-[var(--ob-disabled)] disabled:active:translate-y-0 ${className}`}
      {...props}>
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
      className={`eai-focus w-full cursor-pointer rounded-2xl border-2 border-b-4 p-4 text-left transition-[transform,border-color,background-color] duration-150 active:translate-y-[2px] active:border-b-2 ${selected ? "border-[#1D4ED8] bg-[var(--primary-soft)]" : "border-[var(--line)] bg-[var(--card)] hover:border-[#3B82F6]"}`}>
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
        {subjects.map((s) => <span key={s} className={`eai-ob-tag ${lang === "km" ? "eai-km" : ""}`}><SubjectIcon subject={s} size={12} />{subjectLabel(s, lang)}</span>)}
      </div>
    </button>
  );
}

function SubjectChip({ subject, label, selected, onToggle, lang = "en" }) {
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
      {subject && <SubjectIcon subject={subject} size={15} />}
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

/* Genuinely-rigged SVG owl mascot — independent parts (head, ears, arms, feet, eyes) driven by a
   small spring-physics system, ported from a standalone HTML/SVG/JS prototype into React: the SVG
   markup became JSX (camelCased presentation attributes; per-instance-unique gradient/clip ids via
   a random suffix, so mounting this twice on one page can't collide), and the animation — spring
   step, per-state pose(), the auto idle/wave/point/dance/walk/jump sequencer, blinking, and the
   render loop — moved unchanged into a single mount-once useEffect that grabs each part through
   refs instead of document.getElementById. Runs the built-in "auto" behavior sequence (unless `calm`,
   below); clicking the owl makes it jump on top of that, exactly like the prototype's SVG click handler.
   `calm` is the landing page's mode: the owl never starts the wave/point/dance/walk/jump routine by
   itself. It holds perfectly still for `calmDelayS` after mounting (default OWL_CALM_HOLD_S), then eases
   (OWL_CALM_RAMP_S) into the idle pose alone — breathing, a slow sway, the odd head tilt and blink. The
   markup carries the rest pose on every part the rig moves, so even the first painted frame is the
   neutral owl. `seated` is for an owl riding in something (the landing page's airplane): no ground
   shadow, and whatever carries it does the moving. `svgProps` are extra attributes for the root <svg> —
   x/y/width/height (and a `style` that replaces the default 100%-wide block) let it nest inside a
   larger SVG drawing as a positioned child.
   `pointTargetRef`, when given, is what the "point" state aims its arm/eyes at — re-aimed every
   frame via getBoundingClientRect + getScreenCTM so it tracks correctly even if the target moves
   or the layout changes; the target also gets an "eai-mascot-pointed" class toggled on it while
   pointed at, for a highlight. No mode buttons are exposed here — see the removed Wave/Cheer/Idle
   controls this replaced.
   The owl wears the saved outfit from RewardsContext (cosmetic items drawn as SVG layers — see rewards/itemArt.jsx);
   an `outfit` prop overrides it, which is how the Wardrobe previews changes before they are saved. The layers draw at
   four mounts: back (behind everything), torso (below the chin), face (under the headphones) and top (over them). */
const OWL_CALM_HOLD_S = 1.2;
const OWL_CALM_RAMP_S = 1.4;

export function OwlMascot({ pointTargetRef, triggerRef, outfit, calm = false, calmDelayS = OWL_CALM_HOLD_S, seated = false, svgProps }) {
  const uid = useRef(Math.random().toString(36).slice(2, 8)).current;
  const rewardsCtx = useRewards();
  const worn = outfit ?? rewardsCtx.outfit;
  const refs = useRef({});
  const setRef = (name) => (el) => { refs.current[name] = el; };

  useEffect(() => {
    const $ = (name) => refs.current[name];
    const TAU = Math.PI * 2;
    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
    const lerp = (a, b, k) => a + (b - a) * k;
    const sm = (k) => k * k * (3 - 2 * k);
    const nowS = () => performance.now() / 1000;

    const cfg = {
      x: [140, 18], y: [380, 26], rot: [160, 12], sx: [260, 15], sy: [260, 15], hr: [170, 11], hy: [200, 14],
      aL: [200, 13], aR: [200, 13], fL: [300, 22], fR: [300, 22], hp: [120, 14], eL: [90, 7], eR: [90, 7],
      gL: [260, 20], gR: [260, 20], lk: [160, 14], lv: [160, 14],
    };
    const init = { sx: 1, sy: 1, aL: 10, aR: 10 };
    const P = {};
    Object.keys(cfg).forEach((k) => {
      const v = init[k] !== undefined ? init[k] : 0;
      P[k] = { x: v, v: 0, t: v, k: cfg[k][0], c: cfg[k][1] };
    });
    function step(dt) {
      const n = 2, h = dt / n;
      for (let i = 0; i < n; i++) {
        for (const k in P) {
          const p = P[k];
          p.v += ((p.t - p.x) * p.k - p.v * p.c) * h;
          p.x += p.v * h;
        }
      }
    }

    const svgEl = refs.current.svg;
    const aim = { dir: 1, ang: 100, lv: 0 };
    function svgToScreen(x, y) {
      const pt = svgEl.createSVGPoint(); pt.x = x; pt.y = y;
      return pt.matrixTransform(svgEl.getScreenCTM());
    }
    function aimAt(el) {
      if (!el) return;
      const r = el.getBoundingClientRect();
      const tx = r.left + r.width / 2, ty = r.top + r.height / 2;
      const sR = svgToScreen(260 + 58, 490 - 104), sL = svgToScreen(260 - 58, 490 - 104);
      const eye = svgToScreen(260, 490 - 186);
      const dir = tx > (sR.x + sL.x) / 2 ? 1 : -1;
      const s = dir > 0 ? sR : sL;
      const dx = tx - s.x, dy = ty - s.y;
      aim.dir = dir;
      aim.ang = clamp(Math.atan2(Math.abs(dx), dy) * 180 / Math.PI, 35, 170);
      aim.lv = clamp((ty - eye.y) / 220, -1, 1);
    }

    let walkX = 0, walkDir = 1;
    const rest = () => ({ x: 0, y: 0, rot: 0, sx: 1, sy: 1, hr: 0, hy: 0, aL: 10, aR: 10, fL: 0, fR: 0, hp: 0, gL: 0, gR: 0, lk: 0, lv: 0 });
    const REST = rest();
    function pose(s, t) {
      const d = rest();
      const br = Math.sin(t * TAU / 2.4);
      let c, sh, a, b, u, k, tilt, up, w, beat, pu, ang, poke, dc;

      if (s === "idle") {
        sh = Math.sin(t * TAU / 4.8);
        d.sy = 1 + .022 * br; d.sx = 1 - .012 * br;
        d.rot = sh * 1.6; d.x = sh * 7;
        d.fL = Math.max(0, sh) * 4; d.fR = Math.max(0, -sh) * 4;
        tilt = clamp(Math.sin(t * TAU / 7) * 2.2, 0, 1);
        d.hr = -sh * 2.2 + tilt * 9; d.hp = tilt;
        d.aL = 10 + br * 1.5; d.aR = 10 + br * 1.5 + sh * 2;
      } else if (s === "wave") {
        up = sm(clamp(t / .35, 0, 1));
        d.sy = 1 + .02 * br; d.sx = 1 - .01 * br;
        d.aR = lerp(10, 128, up) + Math.sin(t * TAU * 2.4) * 18 * up;
        d.aL = 10 + br * 1.5;
        d.hr = up * 9; d.hp = up; d.rot = -up * 2.5; d.x = -up * 6;
      } else if (s === "point") {
        pu = sm(clamp(t / .3, 0, 1));
        poke = Math.sin(t * TAU * 1.7) * 5 * pu;
        ang = lerp(10, aim.ang, pu) + poke;
        d.sy = 1 + .02 * br; d.sx = 1 - .01 * br;
        if (aim.dir > 0) { d.aR = ang; d.gR = pu; d.aL = 10 + br * 1.5; }
        else { d.aL = ang; d.gL = pu; d.aR = 10 + br * 1.5; }
        d.hr = aim.dir * 7 * pu; d.rot = aim.dir * 3 * pu; d.x = aim.dir * 5 * pu;
        d.lk = aim.dir * pu; d.lv = aim.lv * pu; d.hp = 0;
      } else if (s === "no") {
        dc = Math.exp(-t * 1.6);
        d.hr = Math.sin(t * TAU * 3) * 12 * dc; d.sy = 1 + .02 * br; d.hp = 0;
      } else if (s === "walk") {
        c = t * TAU * 1.5; w = Math.sin(c);
        d.fL = Math.max(0, w) * 15; d.fR = Math.max(0, -w) * 15;
        d.rot = w * 5 + walkDir * 3; d.y = -Math.abs(w) * 6;
        d.aL = 18 - w * 24; d.aR = 18 + w * 24;
        d.hr = -w * 3; d.hp = .3;
        d.sy = 1 + .02 * Math.cos(2 * c); d.sx = 1 - .012 * Math.cos(2 * c);
        d.x = walkX;
      } else if (s === "dance") {
        beat = t * 1.9;
        a = Math.sin(Math.PI * beat); b = Math.abs(a);
        d.y = -b * 26; d.sy = .9 + .16 * b; d.sx = 1.08 - .14 * b;
        d.rot = a * 8; d.x = a * 10;
        d.hr = Math.sin(Math.PI * beat + 1) * 11; d.hy = -b * 5;
        d.aL = 85 + 55 * a; d.aR = 85 - 55 * a;
        d.fL = Math.max(0, a) * 12; d.fR = Math.max(0, -a) * 12; d.hp = 1;
      } else if (s === "jump") {
        u = t % 1.9;
        if (u < .28) {
          k = sm(u / .28);
          d.sy = 1 - .2 * k; d.sx = 1 + .14 * k; d.aL = d.aR = 10 - 22 * k; d.hp = .4;
        } else if (u < 1.0) {
          k = (u - .28) / .72;
          d.y = -112 * 4 * k * (1 - k);
          d.sy = lerp(1.14, 1, clamp(k * 2, 0, 1)); d.sx = 2 - d.sy;
          d.aL = d.aR = 150; d.fL = d.fR = 10; d.hp = 1;
          d.rot = Math.sin(k * TAU) * 8; d.hr = -Math.sin(k * TAU) * 6;
        } else if (u < 1.25) {
          k = (u - 1.0) / .25;
          d.sy = .82 + .1 * k; d.sx = 1.16 - .1 * k; d.aL = d.aR = lerp(60, 10, k); d.hp = 1;
        } else {
          k = (u - 1.25) / .65;
          d.hr = Math.sin(k * TAU * 1.5) * 6 * (1 - k); d.hp = 1 - k * .6;
          d.aL = d.aR = 10 + (1 - k) * 20;
        }
      }
      return d;
    }

    const seq = [["idle", 4], ["wave", 3.2], ["idle", 1], ["point", 4], ["idle", 1], ["dance", 7.6], ["idle", 1], ["walk", 6.5], ["idle", 1], ["jump", 5.7]];
    const seqTotal = seq.reduce((s, e) => s + e[1], 0);
    let mode = "auto", over = null, cur = "idle", t0 = nowS();
    // calm: the idle clock starts only after the still beat, so t stays 0 (the rest pose) until then.
    const calmFrom = t0 + calmDelayS;
    let curStart = calm ? calmFrom : 0;
    // Read fresh every frame rather than snapshotting once: the target (the Welcome screen's
    // speech bubble) remounts on a `key={text}` change every time its message rotates, which
    // would otherwise leave this pointed at a detached DOM node after the first rotation.
    let prevAimEl = null;
    // External one-shot reactions (e.g. a form-validation error) come through triggerRef rather
    // than a prop the effect depends on, so a parent can request one mid-sequence without
    // tearing down and restarting this whole rig; read fresh each frame, same as pointTargetRef.
    let lastTriggerNonce = triggerRef?.current?.nonce ?? 0;

    function pick(now) {
      if (over) { if (now < over.until) return over.s; over = null; }
      if (mode !== "auto") return mode;
      if (calm) return "idle";
      let m = (now - t0) % seqTotal;
      for (let i = 0; i < seq.length; i++) { if (m < seq[i][1]) return seq[i][0]; m -= seq[i][1]; }
      return "idle";
    }

    let nextBlink = calm ? calmFrom + .8 : 2, blinkStart = -1, dbl = false;
    function blinkScale(now) {
      if (blinkStart < 0 && now >= nextBlink) blinkStart = now;
      let sc = 1;
      if (blinkStart >= 0) {
        const k = (now - blinkStart) / .15;
        if (k >= 1) {
          blinkStart = -1;
          if (dbl) { dbl = false; nextBlink = now + .12; }
          else { nextBlink = now + 2 + Math.random() * 3; dbl = Math.random() < .25; }
        } else sc = 1 - .92 * Math.sin(Math.PI * k);
      }
      return sc;
    }

    const f = (n) => n.toFixed(2);
    let last = nowS();
    let rafId, hlOn = false;

    function frame(ts) {
      const now = ts / 1000;
      const dt = Math.min(.05, Math.max(.001, now - last)); last = now;

      if (triggerRef?.current && triggerRef.current.nonce !== lastTriggerNonce) {
        lastTriggerNonce = triggerRef.current.nonce;
        over = { s: triggerRef.current.type, until: now + (triggerRef.current.duration || 1.3) };
      }

      const s = pick(now);
      if (s !== cur) { cur = s; curStart = now; }
      const t = Math.max(0, now - curStart);

      if (cur === "walk") {
        walkX += walkDir * 72 * dt;
        if (walkX > 75) { walkX = 75; walkDir = -1; }
        if (walkX < -75) { walkX = -75; walkDir = 1; }
      }
      const aimEl = pointTargetRef?.current || null;
      if (aimEl !== prevAimEl) { prevAimEl?.classList.remove("eai-mascot-pointed"); prevAimEl = aimEl; hlOn = false; }
      if (cur === "point") aimAt(aimEl);

      const isPoint = cur === "point";
      if (isPoint !== hlOn) { hlOn = isPoint; aimEl?.classList.toggle("eai-mascot-pointed", isPoint); }

      const d = pose(cur, t);
      // calm: ease the idle pose in from rest rather than snapping to it. Always 1 once the ramp is over
      // (and always 1 outside calm), so every other state and every non-calm owl is untouched.
      const ramp = calm && cur === "idle" ? sm(clamp((now - calmFrom) / OWL_CALM_RAMP_S, 0, 1)) : 1;
      if (ramp < 1) for (const k in d) d[k] = REST[k] + (d[k] - REST[k]) * ramp;
      for (const k in d) P[k].t = d[k];
      P.eL.t = -P.hr.x * .5 + P.y.v * .03 + Math.sin(now * 3) * 1.5 * ramp;
      P.eR.t = -P.hr.x * .5 - P.y.v * .03 - Math.sin(now * 3 + 1) * 1.5 * ramp;
      step(dt);

      $("move").setAttribute("transform", `translate(${f(P.x.x)} ${f(P.y.x)}) rotate(${f(P.rot.x)}) scale(${f(P.sx.x)} ${f(P.sy.x)})`);
      $("head").setAttribute("transform", `translate(0 ${f(P.hy.x)}) rotate(${f(P.hr.x)} 0 -130)`);
      $("earL").setAttribute("transform", `rotate(${f(clamp(P.eL.x, -25, 25))} -84 -268)`);
      $("earR").setAttribute("transform", `rotate(${f(clamp(P.eR.x, -25, 25))} 84 -268)`);
      $("armL").setAttribute("transform", `translate(-58 -104) rotate(${f(P.aL.x)})`);
      $("armR").setAttribute("transform", `translate(58 -104) rotate(${f(-P.aR.x)})`);
      $("fingL").setAttribute("transform", `translate(0 62) scale(${f(clamp(P.gL.x, 0, 1.15))})`);
      $("fingR").setAttribute("transform", `translate(0 62) scale(${f(clamp(P.gR.x, 0, 1.15))})`);
      $("footL").setAttribute("transform", `translate(0 ${f(-Math.max(0, P.fL.x))})`);
      $("footR").setAttribute("transform", `translate(0 ${f(-Math.max(0, P.fR.x))})`);

      const happy = P.hp.x > .5;
      $("eyesOpen").setAttribute("display", happy ? "none" : "inline");
      $("eyesHappy").setAttribute("display", happy ? "inline" : "none");
      const bs = blinkScale(now), lx = P.lk.x * 7, ly = P.lv.x * 5;
      $("eyeL").setAttribute("transform", `translate(${f(-42 + lx)} ${f(-186 + ly)}) scale(1 ${f(bs)})`);
      $("eyeR").setAttribute("transform", `translate(${f(42 + lx)} ${f(-186 + ly)}) scale(1 ${f(bs)})`);
      const cr = 16 + 5 * clamp(P.hp.x, 0, 1);
      $("cheekL").setAttribute("r", f(cr)); $("cheekR").setAttribute("r", f(cr));

      const sc = clamp(1 + P.y.x / 320, .5, 1.1);
      $("shadow").setAttribute("cx", f(260 + P.x.x));
      $("shadow").setAttribute("rx", f(96 * sc));
      $("shadow").setAttribute("opacity", f(.03 + .15 * sc));

      rafId = requestAnimationFrame(frame);
    }
    rafId = requestAnimationFrame(frame);

    const onClick = () => { over = { s: "jump", until: nowS() + 1.9 }; };
    svgEl?.addEventListener("click", onClick);

    return () => {
      cancelAnimationFrame(rafId);
      svgEl?.removeEventListener("click", onClick);
      prevAimEl?.classList.remove("eai-mascot-pointed");
    };
  }, [pointTargetRef, triggerRef, calm, calmDelayS]);

  const { style: svgStyle, ...svgAttrs } = svgProps ?? {};
  return (
    <svg ref={setRef("svg")} viewBox="0 0 520 540" role="img" aria-label="Animated blue owl mascot with mint headphones"
      style={{ display: "block", width: "100%", height: "auto", cursor: "pointer", WebkitTapHighlightColor: "transparent", ...svgStyle }}
      {...svgAttrs}>
      <defs>
        <radialGradient id={`gBlue-${uid}`} cx="35%" cy="28%" r="85%">
          <stop offset="0" stopColor="#93B9FF" />
          <stop offset=".55" stopColor="#6A9AF3" />
          <stop offset="1" stopColor="#4F7DE0" />
        </radialGradient>
        <linearGradient id={`gWhite-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#E6EDFB" />
        </linearGradient>
        <linearGradient id={`gBeak-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFD76B" />
          <stop offset="1" stopColor="#F5A623" />
        </linearGradient>
        <clipPath id={`clipBody-${uid}`}><ellipse cx="0" cy="-78" rx="64" ry="68" /></clipPath>
      </defs>

      <ellipse ref={setRef("shadow")} display={seated ? "none" : undefined} cx="260" cy="494" rx="96" ry="14" fill="#1b2a55" opacity=".18" />

      <g transform="translate(260 490)">
        <g ref={setRef("move")} transform="translate(0 0) rotate(0) scale(1 1)">
          <OutfitLayers outfit={worn} mount="back" uid={uid} />
          <ellipse ref={setRef("footL")} transform="translate(0 0)" cx="-34" cy="-12" rx="28" ry="14" fill="#4F7DE0" />
          <ellipse ref={setRef("footR")} transform="translate(0 0)" cx="34" cy="-12" rx="28" ry="14" fill="#4F7DE0" />

          <ellipse cx="0" cy="-78" rx="64" ry="68" fill={`url(#gBlue-${uid})`} />
          <g clipPath={`url(#clipBody-${uid})`}>
            <ellipse cx="0" cy="-98" rx="80" ry="22" fill="#2f55b8" opacity=".28" />
            <ellipse cx="-30" cy="-40" rx="26" ry="14" fill="#fff" opacity=".12" />
          </g>

          <OutfitLayers outfit={worn} mount="torso" uid={uid} />

          <g ref={setRef("head")} transform="translate(0 0) rotate(0 0 -130)">
            <g ref={setRef("earL")} transform="rotate(0 -84 -268)"><path d="M -96 -258 Q -128 -300 -110 -344 Q -66 -330 -40 -290 Z" fill="#6597F1" /></g>
            <g ref={setRef("earR")} transform="rotate(0 84 -268)"><path d="M 96 -258 Q 128 -300 110 -344 Q 66 -330 40 -290 Z" fill="#6597F1" /></g>

            <ellipse cx="0" cy="-195" rx="118" ry="100" fill={`url(#gBlue-${uid})`} />
            <ellipse cx="-62" cy="-262" rx="38" ry="14" fill="#fff" opacity=".2" transform="rotate(-22 -62 -262)" />

            <path d="M 0 -215 C -18 -240 -98 -245 -100 -185 C -100 -130 -48 -112 0 -112 C 48 -112 100 -130 100 -185 C 98 -245 18 -240 0 -215 Z" fill={`url(#gWhite-${uid})`} />

            <g ref={setRef("eyesOpen")}>
              <g ref={setRef("eyeL")} transform="translate(-42 -186)"><ellipse rx="11" ry="15" fill="#22263f" /><circle cx="-3" cy="-5" r="4" fill="#fff" /></g>
              <g ref={setRef("eyeR")} transform="translate(42 -186)"><ellipse rx="11" ry="15" fill="#22263f" /><circle cx="-3" cy="-5" r="4" fill="#fff" /></g>
            </g>
            <g ref={setRef("eyesHappy")} display="none" stroke="#22263f" strokeWidth="8" strokeLinecap="round" fill="none">
              <path d="M -60 -182 Q -42 -206 -24 -182" />
              <path d="M 24 -182 Q 42 -206 60 -182" />
            </g>

            <circle ref={setRef("cheekL")} cx="-72" cy="-160" r="16" fill="#F7B7A3" opacity=".9" />
            <circle ref={setRef("cheekR")} cx="72" cy="-160" r="16" fill="#F7B7A3" opacity=".9" />
            <path d="M -17 -176 Q 0 -190 17 -176 Q 12 -152 0 -146 Q -12 -152 -17 -176 Z" fill={`url(#gBeak-${uid})`} />
            <OutfitLayers outfit={worn} mount="face" uid={uid} />

            <path d="M -108 -190 C -118 -360 118 -360 108 -190" stroke="#5DBB93" strokeWidth="16" fill="none" strokeLinecap="round" />
            <path d="M -50 -306 Q 0 -329 50 -306" stroke="#F1F7F3" strokeWidth="16" fill="none" />
            <g transform="translate(-124 -186)">
              <ellipse rx="26" ry="44" fill="#4FB08A" />
              <ellipse cx="-4" rx="18" ry="34" fill="#F1F7F3" />
              <ellipse cx="-8" rx="11" ry="24" fill="#5DBB93" />
            </g>
            <g transform="translate(124 -186)">
              <ellipse rx="26" ry="44" fill="#4FB08A" />
              <ellipse cx="4" rx="18" ry="34" fill="#F1F7F3" />
              <ellipse cx="8" rx="11" ry="24" fill="#5DBB93" />
            </g>
            <OutfitLayers outfit={worn} mount="top" uid={uid} />
          </g>

          <g ref={setRef("armL")} transform="translate(-58 -104) rotate(10)">
            <rect x="-17" y="-10" width="34" height="74" rx="17" fill="#6291EE" />
            <circle cx="0" cy="54" r="19" fill="#7FAAF7" />
            <g ref={setRef("fingL")} transform="translate(0 62) scale(0)"><ellipse cx="0" cy="14" rx="8" ry="15" fill="#7FAAF7" /></g>
          </g>
          <g ref={setRef("armR")} transform="translate(58 -104) rotate(-10)">
            <rect x="-17" y="-10" width="34" height="74" rx="17" fill="#6291EE" />
            <circle cx="0" cy="54" r="19" fill="#7FAAF7" />
            <g ref={setRef("fingR")} transform="translate(0 62) scale(0)"><ellipse cx="0" cy="14" rx="8" ry="15" fill="#7FAAF7" /></g>
          </g>
        </g>
      </g>
    </svg>
  );
}

/* Duolingo-style speech bubble: a rounded card with a small triangular tail. Two tail variants are
   both always in the DOM and one is shown per layout. placement "auto" (the finish screen) switches
   on Tailwind's `sm:` breakpoint (640px): below it the bubble stacks above the mascot (tail points
   down), at/above it the bubble sits beside the mascot (tail points left). placement "above" (the
   landing hero's bubble) is always above the mascot with the tail pointing down, whatever the
   width — the landing page's hero column is too narrow for a side bubble.
   placement "exercise" is the question screen's owl column and is the reverse — above the owl's head on
   wide screens (tail down), beside the owl on phones (tail left) — switched by the .eai-ex-say CSS so
   it follows that layout's own breakpoint. `size` "lg" is the bigger finish-screen version and `delay`
   (seconds) holds the pop-in back (used so the owl's jump finishes before it speaks). `text` swaps
   with a fade/rise so a new encouraging line doesn't just pop in. `bubbleRef` (optional) is attached
   to the card itself, so OwlMascot can aim its "point" gesture at it and toggle a highlight on it
   directly. */
function MascotSpeechBubble({ text, lang = "en", bubbleRef, placement = "auto", size = "md", delay = 0 }) {
  const exercise = placement === "exercise";
  const above = placement === "above";
  const downTail = exercise ? "eai-tail-down" : above ? "" : "sm:hidden";
  const sideTail = exercise ? "eai-tail-side" : above ? "hidden" : "hidden sm:block";
  const big = size === "lg";
  return (
    <div className="eai-rise" key={text} style={{ position: "relative", maxWidth: big ? 300 : 220, animationDelay: delay ? `${delay}s` : undefined }}>
      <div ref={bubbleRef} className={`eai-card ${kmClass(text)}`} style={{ padding: big ? "14px 22px" : "10px 16px", fontSize: big ? 17 : 14, fontWeight: 600, textAlign: "center", textWrap: exercise || big ? "balance" : undefined, color: "var(--ink)", transition: "box-shadow .25s ease, transform .25s ease" }}>
        {text}
      </div>
      {/* Tail pointing down (bubble above the mascot). Two stacked border-triangles (outline color
          behind, card color on top, 2px smaller) — the standard CSS trick for a bordered tail. */}
      <div aria-hidden="true" className={downTail} style={{
        position: "absolute", left: "50%", bottom: -9, transform: "translateX(-50%)", width: 0, height: 0,
        borderLeft: "9px solid transparent", borderRight: "9px solid transparent", borderTop: "9px solid var(--line)",
      }} />
      <div aria-hidden="true" className={downTail} style={{
        position: "absolute", left: "50%", bottom: -7, transform: "translateX(-50%)", width: 0, height: 0,
        borderLeft: "7px solid transparent", borderRight: "7px solid transparent", borderTop: "7px solid var(--card)",
      }} />
      {/* Tail pointing left (bubble beside the mascot). */}
      <div aria-hidden="true" className={sideTail} style={{
        position: "absolute", left: -9, top: "50%", transform: "translateY(-50%)", width: 0, height: 0,
        borderTop: "9px solid transparent", borderBottom: "9px solid transparent", borderRight: "9px solid var(--line)",
      }} />
      <div aria-hidden="true" className={sideTail} style={{
        position: "absolute", left: -7, top: "50%", transform: "translateY(-50%)", width: 0, height: 0,
        borderTop: "7px solid transparent", borderBottom: "7px solid transparent", borderRight: "7px solid var(--card)",
      }} />
    </div>
  );
}

/* ════════════════════════ Landing hero: the owl flies its airplane in, lands it on a phone and stands ════════════════════════
   One SVG drawing in scene units; heroFlight.js has the story and every pose. The phone lies flat in isometric view, so
   its runway runs toward the viewer, and the airplane (HeroPlane.jsx) is a chunky 3D prop plane in the same view: as it
   lines up, its nose points down the runway, toward the user. The owl sits inside the plane's open cockpit: the plane is
   drawn in two layers with the owl between them, so the cockpit's near wall hides its feet and lower belly. At touchdown
   the plane fades out, the owl hops out and stands on the runway, and then its speech bubble appears. Every movement is
   a CSS animation of the poses heroFlight.js generates; React only waits for the owl to land. */
const HERO_MESSAGE_KEYS = ["mascotMsg1", "mascotMsg2", "mascotMsg3", "mascotMsg4", "mascotMsg5", "mascotMsg6"];
// Clouds drift left to right on a loop (.eai-hero-cloud). `x` is where a cloud starts, so the sky is already full on load.
const HERO_CLOUDS = [
  { id: 1, x: -20, y: 44, scale: 1.2, speed: 9, front: true },
  { id: 2, x: 330, y: 22, scale: 0.95, speed: 6 },
  { id: 3, x: 40, y: 246, scale: 0.8, speed: 12 },
];
const CLOUD_TRAVEL = 880;   // the drift runs from -260 to 620 (.eai-hero-drift)
const BUBBLE_GAP = 8;       // between the bubble's tail and the owl's ears

// Set once the owl has landed in this page load, so coming back to the landing page from sign-up shows the owl
// standing at once instead of replaying the flight.
let heroIntroPlayed = false;

function HeroCloud({ uid, cloud }) {
  const dur = CLOUD_TRAVEL / cloud.speed;
  const delay = -((cloud.x + 260) / CLOUD_TRAVEL) * dur;   // start part-way along, so the sky is already full
  return (
    <g className="eai-hero-cloud" style={{ "--cd": `${dur.toFixed(1)}s`, "--cdl": `${delay.toFixed(1)}s` }}>
      <use href={`#${uid}-cloud`} transform={`translate(0 ${cloud.y}) scale(${cloud.scale})`} style={{ fill: `var(--hero-cloud-${cloud.id})` }} />
    </g>
  );
}

// The phone, lying flat in isometric view: a slab with a screen. The runway runs down the middle toward the viewer,
// with a little grass and a few buildings either side. Plan units: 520 along the runway, 290 across it.
function HeroPhone({ uid }) {
  return (
    <g transform={`translate(${PHONE_C[0]} ${PHONE_C[1]})`}>
      <g transform="translate(0 12)">{/* the slab's thickness, straight down the screen */}
        <g transform={ISO_MATRIX}><rect x="-260" y="-145" width="520" height="290" rx="40" style={{ fill: "var(--hero-phone-edge)" }} /></g>
      </g>
      <g transform={ISO_MATRIX}>
        <rect x="-260" y="-145" width="520" height="290" rx="40" style={{ fill: "var(--hero-phone)" }} />
        <rect x="-238" y="-123" width="476" height="246" rx="26" fill={`url(#${uid}-screen)`} />
        <rect x="-200" y="-104" width="120" height="56" rx="10" style={{ fill: "var(--hero-park)" }} />
        <rect x="96" y="52" width="120" height="56" rx="10" style={{ fill: "var(--hero-park)" }} />
        <rect x="-170" y="40" width="56" height="44" rx="8" style={{ fill: "var(--hero-block)" }} />
        <rect x="104" y="-96" width="62" height="38" rx="8" style={{ fill: "var(--hero-block)" }} />
        <rect x="-200" y="-30" width="400" height="60" rx="6" style={{ fill: "var(--hero-runway)" }} />
        <rect x="-200" y="-26" width="400" height="2" style={{ fill: "var(--hero-runway-line)" }} />
        <rect x="-200" y="24" width="400" height="2" style={{ fill: "var(--hero-runway-line)" }} />
        {[-170, -110, -50, 10, 70, 130].map((u) => (
          <rect key={u} x={u} y="-1.5" width="34" height="3" style={{ fill: "var(--hero-runway-line)" }} />
        ))}
      </g>
    </g>
  );
}

// The airplane is HeroPlane.jsx (geometry in heroPlane.js): a chunky 3D prop plane in the same view as the phone, drawn in
// two layers with the owl between them so the owl sits inside its cockpit.

function HeroScene({ lang = "en" }) {
  const uid = useRef(Math.random().toString(36).slice(2, 8)).current;
  const [skipIntro] = useState(() => heroIntroPlayed || !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
  const [landed, setLanded] = useState(skipIntro);
  const [msgIdx, setMsgIdx] = useState(0);

  // The owl's landing is an animation event; the timer is only a backstop in case that event never arrives.
  useEffect(() => {
    if (landed) { heroIntroPlayed = true; return undefined; }
    const id = setTimeout(() => setLanded(true), (TOTAL_S + 0.6) * 1000);
    return () => clearTimeout(id);
  }, [landed]);

  // The bubble starts cycling through its lines once it appears.
  useEffect(() => {
    if (!landed) return undefined;
    const id = setInterval(() => setMsgIdx((i) => (i + 1) % HERO_MESSAGE_KEYS.length), 4500);
    return () => clearInterval(id);
  }, [landed]);

  const sky = `url(#${uid}-sky)`;
  const bubbleBottom = (1 - (STAND[1] - OWL_HEAD - BUBBLE_GAP) / SCENE_H) * 100;
  return (
    <div className={`eai-hero${skipIntro ? " eai-hero-skip" : ""}`}>
      <svg viewBox={`0 0 ${SCENE_W} ${SCENE_H}`} className="eai-hero-svg" role="img" aria-label={t(lang, "heroAlt")}>
        <defs>
          <g id={`${uid}-cloud`}>
            <rect x="6" y="34" width="128" height="26" rx="13" />
            <circle cx="42" cy="36" r="22" /><circle cx="74" cy="26" r="28" /><circle cx="106" cy="38" r="20" />
          </g>
          <linearGradient id={`${uid}-fade`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#000" /><stop offset=".07" stopColor="#fff" /><stop offset=".93" stopColor="#fff" /><stop offset="1" stopColor="#000" />
          </linearGradient>
          <mask id={`${uid}-sky`} maskUnits="userSpaceOnUse" x="0" y="-160" width={SCENE_W} height={SCENE_H + 320}>
            <rect x="0" y="-160" width={SCENE_W} height={SCENE_H + 320} fill={`url(#${uid}-fade)`} />
          </mask>
          <linearGradient id={`${uid}-screen`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" style={{ stopColor: "var(--hero-screen-a)" }} /><stop offset="1" style={{ stopColor: "var(--hero-screen-b)" }} />
          </linearGradient>
          <HeroPlaneDefs uid={uid} />
        </defs>

        <g mask={sky}>{HERO_CLOUDS.filter((c) => !c.front).map((c) => <HeroCloud key={c.id} uid={uid} cloud={c} />)}</g>
        <HeroPhone uid={uid} />
        <ellipse className="eai-stand-shadow" cx={STAND[0]} cy={STAND[1] + 3} rx="40" ry="7" style={{ fill: "var(--hero-ground)" }} />

        {/* The plane in two layers with the owl between them: everything behind the owl, the owl, then the near wall of the
            body and the rest of the near side. Both plane layers play the same keyframes on the same clock. */}
        <g mask={sky}>
          <g className="eai-plane">
            <g className="eai-plane-vanish"><HeroPlaneBack uid={uid} /></g>
          </g>
        </g>

        <g mask={sky}>
          <g className="eai-rider" onAnimationEnd={(e) => { if (e.animationName === "eai-rider-go") setLanded(true); }}>
            <g className="eai-rider-bob">
              <OwlMascot calm seated calmDelayS={skipIntro ? 0.5 : TOTAL_S + 0.05} svgProps={{ ...OWL_SVG, style: { width: undefined, height: undefined } }} />
            </g>
          </g>
        </g>

        <g mask={sky}>
          <g className="eai-plane">
            <g className="eai-plane-vanish"><HeroPlaneFront uid={uid} /></g>
          </g>
        </g>

        <g mask={sky} opacity=".88">{HERO_CLOUDS.filter((c) => c.front).map((c) => <HeroCloud key={c.id} uid={uid} cloud={c} />)}</g>
      </svg>

      {landed && (
        <div className="eai-hero-bubble" style={{ left: `${(STAND[0] / SCENE_W) * 100}%`, bottom: `${bubbleBottom}%` }}>
          <MascotSpeechBubble text={t(lang, HERO_MESSAGE_KEYS[msgIdx])} lang={lang} placement="above" />
        </div>
      )}
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

// The corner chips (language + theme) on the landing page. LangToggle's own glass look is switched off
// through its `style` prop so it matches the theme button: flat, 2px border, solid fill.
const landingChip = { height: 44, borderRadius: 12, border: "2px solid var(--line)", background: "var(--card)", color: "var(--ink)", boxShadow: "none", backdropFilter: "none", WebkitBackdropFilter: "none" };

function Welcome({ dark, setDark, lang, setLang, onLogin, onCreate }) {
  return (
    <div className={`eai-root eai-lp ${dark ? "theme-dark" : "theme-light"} ${lang === "km" ? "eai-km-root" : ""} relative flex flex-col items-center overflow-hidden px-6 pt-20 lg:px-10 lg:pt-12`}
      style={{ minHeight: "100dvh" }}>
      <style>{STYLES}</style>

      {/* Theme + language toggles — flat bordered chips in the top-right corner of the page. Same 44px
          height and 2px border on both, centred on one line, so they sit square on the solid background
          (they scroll away with the page instead of floating over it). */}
      <div className="absolute right-5 top-5 z-50 flex items-center gap-2">
        <LangToggle lang={lang} setLang={setLang} style={{ ...landingChip, minWidth: 44 }} />
        <button onClick={() => setDark((d) => !d)} className="eai-focus" aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
          style={{ ...landingChip, width: 44, display: "grid", placeItems: "center", cursor: "pointer" }}>
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

      {/* Duolingo-style landing layout.
          Laptop/desktop (lg, 1024px+): two equal columns side by side, centred on the screen — mascot
          + speech bubble on the left; title, subtitle and the two buttons stacked on the right.
          Phone/tablet (below lg): one column — mascot on top, title + subtitle right under it, buttons
          pinned to the bottom (thumb zone). The right-hand wrapper is `display: contents` below lg so
          its title block and buttons become direct children of <main>; the two `mt-auto`s then split
          the spare height so the mascot + title group floats between the top and the buttons. */}
      <main className="relative z-10 flex w-full max-w-[1120px] flex-1 flex-col pb-8 lg:flex-row lg:items-center lg:gap-16 lg:pb-12 xl:gap-24">
        {/* Left column — the hero scene: the owl flies its airplane in through the clouds, loops, and lands
            on a phone, where its speech bubble appears. It sizes itself off both the column's width and
            the screen's height, so it never pushes the page into a scroll on a short laptop screen. */}
        <div className="mt-auto flex justify-center lg:mt-0 lg:flex-1 lg:basis-0">
          <HeroScene lang={lang} />
        </div>

        {/* Right column — title, subtitle, buttons */}
        <div className="contents lg:flex lg:flex-1 lg:basis-0 lg:flex-col lg:items-center">
          <div className="mt-6 flex w-full flex-col items-center text-center lg:mt-0">
            <h1 className={`text-balance [font-size:clamp(28px,5vw,44px)] lg:[font-size:clamp(30px,3.6vw,44px)] ${lang === "km" ? "eai-km" : ""}`} style={{ fontWeight: "700", color: "var(--ink)", marginBottom: "12px", fontFamily: lang === "km" ? undefined : "'Sora', system-ui, sans-serif" }}>
              {t(lang, "welcomeHeading")} <span style={{ color: "var(--lp-link)" }}>{t(lang, "welcomeBrand")}</span>
            </h1>
            <p className={`text-balance ${lang === "km" ? "eai-km" : ""}`} style={{ fontSize: "clamp(14px, 2vw, 18px)", color: "var(--muted)", lineHeight: "1.6" }}>
              {t(lang, "welcomeSubtitle")}
            </p>
          </div>

          {/* Buttons — stacked, full width up to 420px. Styles live in the .eai-lp-btn rules in STYLES. */}
          <div className="mt-auto flex w-full max-w-[420px] flex-col gap-3 self-center pt-8 lg:mt-10 lg:pt-0">
            <button onClick={onCreate} className={`eai-lp-btn eai-lp-btn-secondary eai-focus ${lang === "km" ? "eai-km" : ""}`}>
              {t(lang, "createAccount")}
            </button>
            <button onClick={onLogin} className={`eai-lp-btn eai-lp-btn-primary eai-focus ${lang === "km" ? "eai-km" : ""}`}>
              {t(lang, "login")}
            </button>
          </div>
        </div>
      </main>

      {/* Subject ribbon — pinned to the bottom of the page. The page has side padding, so the negative margins
          let the strip and its top border run edge to edge. Tapping a subject starts sign-up. */}
      <SubjectRibbon lang={lang} onSelect={onCreate} className="relative z-10 self-stretch -mx-6 lg:-mx-10" />
    </div>
  );
}

function Login({ dark, setDark, onBack, onLogin, onCreateInstead, onForgot, lang = "en", setLang }) {
  const [method, setMethod] = useState("phone"); // "phone" | "email"
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [mascotState, setMascotState] = useState("idle");
  const shake = () => { setMascotState("sad"); setTimeout(() => setMascotState("idle"), 1200); };
  const switchMethod = (m) => { setMethod(m); setError(""); };
  // The browser-only prototype let a phone number alone sign in; with the server both ways need the password.
  const needsPassword = SERVER_MODE || method === "email";
  const submit = async () => {
    if (busy) return;
    const creds = method === "phone" ? { phone: phone.trim(), ...(SERVER_MODE ? { password } : {}) } : { email: email.trim(), password };
    const identifier = method === "phone" ? creds.phone : creds.email;
    if (!identifier || (needsPassword && !creds.password)) {
      setError(t(lang, method === "email" ? "errEnterEmailPassword" : SERVER_MODE ? "errEnterPhonePassword" : "errEnterPhone")); shake(); return;
    }
    setBusy(true);
    try {
      const res = await onLogin(creds);
      if (res === true) return;
      setError(res && res.error ? apiErrorText(lang, res.error, res.retryAfter) : t(lang, method === "phone" ? "errPhoneNotFound" : "errEmailNotFound"));
      shake();
    } finally { setBusy(false); }
  };
  return (
    <OnboardingLayout dark={dark} setDark={setDark} onBack={onBack} lang={lang} setLang={setLang} mascotState={mascotState}
      title={t(lang, "loginTitle")} description={t(lang, "loginDesc")}
      footer={
        <PrimaryButton onClick={submit} disabled={busy} className={`sm:w-auto ${lang === "km" ? "eai-km" : ""}`}>{t(lang, "loginTitle")} <ChevronRight size={16} /></PrimaryButton>
      }>
      <div className="flex gap-1 p-1 rounded-full eai-soft" style={{ width: "fit-content", marginBottom: 18 }}>
        {["phone", "email"].map((m) => (
          <button key={m} onClick={() => switchMethod(m)}
            className={`eai-focus text-xs font-semibold px-3.5 py-1.5 rounded-full ${lang === "km" ? "eai-km" : ""}`}
            style={{ background: method === m ? "var(--card)" : "transparent", color: method === m ? "var(--ink)" : "var(--muted)", boxShadow: method === m ? "var(--shadow)" : "none" }}>
            {t(lang, m === "phone" ? "loginWithPhone" : "loginWithEmail")}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {method === "phone" ? (
          <FormField label={t(lang, "phoneNumberLabel")} required error={error} lang={lang}>
            <input className="eai-ob-input eai-focus" placeholder="016556618" autoComplete="tel" inputMode="tel"
              value={phone} onChange={(e) => { setPhone(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && submit()} />
          </FormField>
        ) : (
          <FormField label={t(lang, "emailLabel")} required error={error} lang={lang}>
            <input type="email" className="eai-ob-input eai-focus" placeholder="e.g. sophea@gmail.com" autoComplete="email" inputMode="email"
              value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && submit()} />
          </FormField>
        )}
        {needsPassword && (
          <FormField label={t(lang, "passwordLabel")} required>
            <input type="password" className="eai-ob-input eai-focus" placeholder="••••••••" autoComplete="current-password"
              value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && submit()} />
          </FormField>
        )}
        {SERVER_MODE && (
          <div className="text-right" style={{ marginTop: -6 }}>
            <button type="button" onClick={onForgot} className={`eai-focus text-xs font-semibold ${lang === "km" ? "eai-km" : ""}`} style={{ color: "var(--primary)" }}>
              {t(lang, "forgotLink")}
            </button>
          </div>
        )}
      </div>

      <p className={`text-center text-xs eai-muted mt-4 ${lang === "km" ? "eai-km" : ""}`}>
        {t(lang, "noAccountYet")}{" "}
        <button onClick={onCreateInstead} className="eai-focus font-semibold" style={{ color: "var(--primary)" }}>{t(lang, "createOne")}</button>
      </p>
    </OnboardingLayout>
  );
}

/* The waiting state while a reset code is being emailed (on a slow connection that can take a while): a friendly envelope
   that floats, three pulsing dots and a calm explanation. It stands still for people who ask for reduced motion. */
function SendingCard({ lang }) {
  const still = useReducedMotion();
  const km = lang === "km" ? "eai-km" : "";
  return (
    <div className="flex flex-col items-center text-center py-8 px-2" role="status" aria-live="polite">
      <div className="relative">
        <motion.div className="grid place-items-center" style={{ width: 92, height: 92, borderRadius: 28, background: "var(--primary-soft)", boxShadow: "0 14px 30px -16px var(--primary)" }}
          animate={still ? undefined : { y: [0, -9, 0], rotate: [0, -3, 3, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}>
          <Mail size={42} strokeWidth={1.8} style={{ color: "var(--primary)" }} />
        </motion.div>
        <motion.span aria-hidden="true" className="absolute rounded-full" style={{ width: 11, height: 11, background: "var(--gold)", top: -5, right: -7 }}
          animate={still ? undefined : { scale: [1, 1.5, 1], opacity: [1, 0.45, 1] }} transition={{ duration: 1.6, repeat: Infinity }} />
        <motion.span aria-hidden="true" className="absolute rounded-full" style={{ width: 8, height: 8, background: "var(--ember)", bottom: 2, left: -9 }}
          animate={still ? undefined : { scale: [1, 1.6, 1], opacity: [0.9, 0.4, 0.9] }} transition={{ duration: 1.9, repeat: Infinity, delay: 0.5 }} />
      </div>
      <div className="flex gap-1.5 mt-7" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <motion.span key={i} className="rounded-full" style={{ width: 9, height: 9, background: "var(--primary)" }}
            animate={still ? { opacity: 0.6 } : { opacity: [0.25, 1, 0.25], scale: [0.8, 1.2, 0.8] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }} />
        ))}
      </div>
      <p className={`eai-display font-extrabold text-lg mt-5 ${km}`}>{t(lang, "forgotSendingTitle")}</p>
      <p className={`text-sm eai-muted mt-1.5 ${km}`} style={{ maxWidth: 300 }}>{t(lang, "forgotSendingSub")}</p>
    </div>
  );
}

/* Shown on the code screen once the email is on its way: where it went, how long it lasts, and where to look. */
function CheckEmailCard({ lang, email }) {
  const still = useReducedMotion();
  const km = lang === "km" ? "eai-km" : "";
  return (
    <motion.div initial={still ? false : { opacity: 0, y: 10, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className="flex items-center gap-3.5 p-4 rounded-2xl mb-5" style={{ background: "var(--jade-soft)", border: "1px solid var(--jade)" }}>
      <motion.div initial={still ? false : { scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 14, delay: 0.15 }}
        className="grid place-items-center rounded-2xl flex-shrink-0" style={{ width: 48, height: 48, background: "var(--card)" }}>
        <MailCheck size={24} style={{ color: "var(--jade)" }} />
      </motion.div>
      <div className="min-w-0">
        <p className={`eai-display font-bold text-sm ${km}`}>{t(lang, "forgotCheckEmailTitle")}</p>
        <p className={`text-xs eai-muted mt-0.5 ${km}`} style={{ overflowWrap: "anywhere" }}>
          {email ? <>{t(lang, "forgotCodeSent")} <strong style={{ color: "var(--ink)" }}>{email}</strong></> : t(lang, "forgotCodeSentGeneric")}
        </p>
        <p className={`text-xs eai-muted mt-0.5 ${km}`}>{t(lang, "forgotCodeExpires")} {t(lang, "forgotCheckSpam")}</p>
      </div>
    </motion.div>
  );
}

// Logins that were just sent a reset code: login -> { until: the time (ms) the resend wait ends, masked: "ve***@gmail.com" }.
// Kept outside the screen so going Back and pressing "Send code" again inside the wait goes straight to the code screen
// instead of asking the server again (which would refuse, but still use up one of the few tries allowed per hour).
const recentCodes = new Map();

/* ════════════════════════ Forgot password (server mode) ════════════════════════
   Step 1: the student gives their phone number or email and the server emails a 6-digit code to the address on the
   account. Step 2: they type the code and a new password; the server answers with a fresh login, so they land on the
   dashboard. `onSignedIn` loads the account and resolves to true, or to { error } when that fails. */
function ForgotPassword({ dark, setDark, onBack, onSignedIn, lang = "en", setLang }) {
  const [step, setStep] = useState(1);
  const [login, setLogin] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);       // resetting the password
  const [sending, setSending] = useState(false);   // the code email is being sent
  const [cooldown, setCooldown] = useState(0); // seconds until a new code may be requested
  const [mascotState, setMascotState] = useState("idle");
  const shake = () => { setMascotState("sad"); setTimeout(() => setMascotState("idle"), 1200); };
  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const sendCode = async () => {
    if (sending || !login.trim()) return;
    const who = login.trim().toLowerCase();
    const recent = recentCodes.get(who);
    if (recent && recent.until > Date.now()) { // a code is already on its way: no new request, just the code screen
      setMaskedEmail(recent.masked); setStep(2); setCooldown(Math.ceil((recent.until - Date.now()) / 1000));
      return;
    }
    setSending(true); setError("");
    try {
      const res = await api.forgotPassword({ login: login.trim() });
      recentCodes.set(who, { until: Date.now() + 60000, masked: res?.maskedEmail ?? "" });
      setMaskedEmail(res?.maskedEmail ?? ""); setCode(""); setStep(2); setCooldown(60);
    } catch (err) {
      // A code was sent a moment ago (the server sends nothing new and says how long until a new one may be asked
      // for): just go to the code screen. Anything else is a real problem, e.g. the hourly limit: say how long to wait.
      if (isCodeAlreadySent(err) && err.retryAfter > 0) {
        const masked = err.body?.maskedEmail ?? recentCodes.get(who)?.masked ?? "";
        recentCodes.set(who, { until: Date.now() + err.retryAfter * 1000, masked });
        setMaskedEmail(masked); setStep(2); setCooldown(err.retryAfter);
      } else { setError(apiErrorText(lang, err?.code, err?.retryAfter)); shake(); }
    }
    finally { setSending(false); }
  };
  const resetPassword = async () => {
    if (busy) return;
    if (!/^\d{6}$/.test(code.trim())) { setError(t(lang, "errInvalidCode")); shake(); return; }
    if (password.length < 8) { setError(t(lang, "errPasswordShort")); shake(); return; }
    setBusy(true); setError("");
    try {
      await api.resetPassword({ login: login.trim(), code: code.trim(), password });
      const res = await onSignedIn();
      if (res !== true) { setError(apiErrorText(lang, res?.error, res?.retryAfter)); shake(); }
    } catch (err) { setError(apiErrorText(lang, err?.code, err?.retryAfter)); shake(); }
    finally { setBusy(false); }
  };

  const km = lang === "km" ? "eai-km" : "";
  return (
    <OnboardingLayout dark={dark} setDark={setDark} onBack={step === 2 ? () => { setStep(1); setError(""); } : onBack} lang={lang} setLang={setLang} mascotState={mascotState}
      title={t(lang, "forgotTitle")}
      description={step === 1 ? t(lang, "forgotDesc") : t(lang, "forgotStep2Desc")}
      footer={
        step === 1
          ? <PrimaryButton onClick={sendCode} disabled={sending || !login.trim()} className={`sm:w-auto ${km}`}>{sending ? <LoaderCircle size={18} className="animate-spin" aria-hidden="true" /> : <>{t(lang, "forgotSendCode")} <ChevronRight size={16} /></>}</PrimaryButton>
          : <PrimaryButton onClick={resetPassword} disabled={busy || !code.trim() || !password} className={`sm:w-auto ${km}`}>{t(lang, "forgotResetBtn")} <ChevronRight size={16} /></PrimaryButton>
      }>
      {step === 1 ? (
        sending ? <SendingCard lang={lang} /> : (
          <FormField label={t(lang, "forgotLoginLabel")} required error={error} lang={lang}>
            <input className="eai-ob-input eai-focus" placeholder="016556618" autoComplete="username"
              value={login} onChange={(e) => { setLogin(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && sendCode()} />
          </FormField>
        )
      ) : (
        <div>
          <CheckEmailCard lang={lang} email={maskedEmail} />
          {sending ? <SendingCard lang={lang} /> : (
        <div className="space-y-4">
          <FormField label={t(lang, "forgotCodeLabel")} required error={error} lang={lang}>
            <input className="eai-ob-input eai-focus" placeholder="123456" inputMode="numeric" maxLength={6} autoComplete="one-time-code"
              value={code} onChange={(e) => { setCode(e.target.value.replace(/\D/g, "")); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && resetPassword()} />
          </FormField>
          <FormField label={t(lang, "forgotNewPasswordLabel")} required>
            <input type="password" className="eai-ob-input eai-focus" placeholder="••••••••" autoComplete="new-password"
              value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && resetPassword()} />
            <p className={`text-xs eai-muted mt-1.5 ${km}`}>{t(lang, "passwordHint")}</p>
          </FormField>
          <button type="button" onClick={sendCode} disabled={sending || cooldown > 0}
            className={`eai-focus text-xs font-semibold ${km}`} style={{ color: cooldown > 0 ? "var(--muted)" : "var(--primary)", cursor: cooldown > 0 ? "not-allowed" : "pointer" }}>
            {t(lang, "forgotResend")}{cooldown > 0 ? ` (${localizeNum(cooldown, lang)})` : ""}
          </button>
        </div>
          )}
        </div>
      )}
      <p className={`text-center text-xs eai-muted mt-5 ${km}`}>
        <button onClick={onBack} className="eai-focus font-semibold" style={{ color: "var(--primary)" }}>{t(lang, "backToLogin")}</button>
      </p>
    </OnboardingLayout>
  );
}

/* ════════════════════════ Registration ════════════════════════
   Sign-up is high school only: it opens straight on step 1 with no education-level question.
   High-school steps 1–3 (account details, academic track, learning preferences) are the original
   BAC II flow, unchanged. The university steps 2–4 below are parked and unreachable from sign-up
   (nothing sets `educationLevel: "university"` any more); they stay so the parked track keeps compiling.
   `initialForm`/`initialStep` let App.jsx re-open this at a specific step — used when a student
   goes "Back" from the step-4 AssessmentChoice screen, so their answers aren't lost. */
function Register({ onComplete, dark, setDark, initialForm, initialStep, onBack, lang = "en", setLang }) {
  const [step, setStep] = useState(initialStep ?? 1);
  const [form, setForm] = useState(initialForm ?? {
    name: "", phone: "", email: "", password: "", age: "",
    educationLevel: "highschool", // new sign-ups are always high school; "university" only survives on already-saved profiles
    // High-school (BAC II) fields:
    grade: "12", field: "", target: "A",
    targetExamYear: EXAM_YEARS[1], dailyMinutes: 60, targetUniversity: "",
    subjectsToImprove: [], foreignLanguage: FOREIGN_LANGUAGES[0],
    // University fields:
    universityGoals: [], universityMajor: "", universityYear: "",
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const canFinish = form.name.trim() && form.field;
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  // With the server, onComplete creates the account and may answer { error, step } (phone already used, etc.).
  const finish = async (data) => {
    if (submitting) return;
    setSubmitError(""); setSubmitting(true);
    try {
      const res = await onComplete(data);
      if (res && res.error) { setSubmitError(apiErrorText(lang, res.error, res.retryAfter)); if (res.step) setStep(res.step); }
    } finally { setSubmitting(false); }
  };
  const phoneDigits = form.phone.replace(/[\s().-]/g, "").replace(/^\+/, "");
  const accountOk = Boolean(form.name.trim()) && (!SERVER_MODE || (/^\d{8,15}$/.test(phoneDigits) && form.password.length >= 8));
  const submitErrorBanner = submitError ? <p className="eai-ob-error mb-4" role="alert"><AlertTriangle size={12} /> {submitError}</p> : null;
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

  // ── Step 1: account details (shared layout; grade/target only shown for high school) ──
  if (step === 1) {
    return (
      <OnboardingLayout dark={dark} setDark={setDark} step={1} stepLabels={isUni ? UNI_ONBOARDING_STEPS : undefined} stepLabelsKm={isUni ? UNI_ONBOARDING_STEPS_KM : undefined}
        onBack={onBack} lang={lang} setLang={isUni ? undefined : setLang}
        title={t(lang, "createAccountTitle")} description={t(lang, "createAccountDesc")}
        footer={
          <PrimaryButton onClick={() => setStep(2)} disabled={!accountOk} className={`sm:w-auto ${lang === "km" ? "eai-km" : ""}`}>
            {isUni ? t(lang, "continueWord") : t(lang, "continueToTrack")} <ChevronRight size={16} />
          </PrimaryButton>
        }>
        {submitErrorBanner}
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
            {SERVER_MODE && <p className={`text-xs eai-muted mt-1.5 ${lang === "km" ? "eai-km" : ""}`}>{t(lang, "emailResetHint")}</p>}
          </FormField>
          <FormField label={t(lang, "passwordLabel")} required={SERVER_MODE}>
            <input type="password" className="eai-ob-input eai-focus" placeholder="••••••••" autoComplete="new-password"
              value={form.password} onChange={(e) => set("password", e.target.value)} />
            {SERVER_MODE && <p className={`text-xs eai-muted mt-1.5 ${lang === "km" ? "eai-km" : ""}`}>{t(lang, "passwordHint")}</p>}
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
        title={t(lang, "chooseTrackTitle")} description={t(lang, "chooseTrackDesc")}
        footer={
          <PrimaryButton onClick={() => setStep(3)} disabled={!canFinish} className={`sm:w-auto ${lang === "km" ? "eai-km" : ""}`}>
            {t(lang, "continueWord")} <ChevronRight size={16} />
          </PrimaryButton>
        }>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" role="radiogroup" aria-label="Academic track">
          {Object.entries(FIELD_META).map(([key, meta]) => (
            <TrackCard key={key} meta={meta} subjects={FIELD_SUBJECTS[key]} selected={form.field === key} onSelect={() => set("field", key)} lang={lang} />
          ))}
        </div>


      </OnboardingLayout>
    );
  }

  // ── High-school step 3: learning preferences ──
  return (
    <OnboardingLayout dark={dark} setDark={setDark} step={3} onBack={() => setStep(2)} lang={lang} setLang={setLang}
      title={t(lang, "personalizeTitle")} description={t(lang, "personalizeDesc")}
      footer={
        <PrimaryButton onClick={() => finish({ ...form, age: Number(form.age) || null })} disabled={submitting} className={`sm:w-auto ${lang === "km" ? "eai-km" : ""}`}>
          {t(lang, "continueWord")} <ChevronRight size={16} />
        </PrimaryButton>
      }>
      {submitErrorBanner}
      <div className="grid grid-cols-1 sm:grid-cols-2" style={{ columnGap: 16, rowGap: 22 }}>
        <SelectField label={t(lang, "targetExamYearLabel")} value={form.targetExamYear} onChange={(e) => set("targetExamYear", Number(e.target.value))}
          options={EXAM_YEARS.map((y) => ({ value: y, label: String(y) }))} />
        <SelectField label={t(lang, "dailyStudyTimeLabel")} value={form.dailyMinutes} onChange={(e) => set("dailyMinutes", Number(e.target.value))}
          options={STUDY_MINUTES.map((m) => ({ value: m, label: `${m} ${t(lang, "minutesWord")}` }))} />
        <SelectField label={t(lang, "targetUniLabel")} value={form.targetUniversity} onChange={(e) => set("targetUniversity", e.target.value)}
          options={[{ value: "", label: t(lang, "notSureYet") }, ...UNIS.map((u) => ({ value: u.abbr, label: `${u.abbr} — ${lang === "km" ? u.nKm : u.n}` }))]} />
        {FIELD_SUBJECTS[form.field].includes(FOREIGN_LANGUAGE) && (
          <SelectField label={t(lang, "foreignLanguageLabel")} value={form.foreignLanguage} onChange={(e) => set("foreignLanguage", e.target.value)}
            options={FOREIGN_LANGUAGES.map((l) => ({ value: l, label: subjectLabel(l, lang) }))} />
        )}
      </div>

      <div className="mt-7">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <span className={`text-sm font-semibold ${lang === "km" ? "eai-km" : ""}`} style={{ color: "var(--ink)" }}>{t(lang, "subjectsImproveQ")}</span>
            <p className={`text-xs eai-muted mt-0.5 ${lang === "km" ? "eai-km" : ""}`}>{t(lang, "subjectsImproveSub")}</p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {form.subjectsToImprove.length === 0 ? (
              <button onClick={() => finish({ ...form, subjectsToImprove: [], age: Number(form.age) || null })}
                className={`eai-ob-text-action eai-focus ${lang === "km" ? "eai-km" : ""}`}>{t(lang, "skipStepWord")}</button>
            ) : (
              <button onClick={clearSubjects} className={`eai-ob-text-action eai-focus ${lang === "km" ? "eai-km" : ""}`}>{t(lang, "clearSelectionWord")}</button>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {fieldSubjects(form.field, form.foreignLanguage).map((s) => {
            const id = subjectId(s);
            return <SubjectChip key={id} subject={s} label={subjectLabel(s, lang)} selected={form.subjectsToImprove.includes(id)} onToggle={() => toggleImprove(id)} lang={lang} />;
          })}
        </div>
      </div>


    </OnboardingLayout>
  );
}

/* ════════════════════════ Dashboard ════════════════════════ */
function Dashboard({ p, go, plan, onTogglePlan, onAddPlanTask, onRemovePlanTask, bonusXp = 0, lang = "en" }) {
  const xp = p.xp + bonusXp;
  // "Today's plan" is the student's own list: each day starts empty, older days stay stored but hidden.
  const tasks = todaysTasks(plan, dateKey());
  const done = tasks.filter((x) => x.done).length;
  const planPct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  const suggestions = remainingSuggestions(p.plan ?? [], plan, dateKey()).slice(0, 3);
  const planFull = tasks.length >= MAX_TASKS_PER_DAY;
  const subjectOptions = fieldSubjects(p.field, p.foreignLanguage); // the subjects this student sits: their chosen foreign language, not the "Foreign Language" placeholder
  const [draft, setDraft] = useState({ title: "", subject: "", minutes: "" });
  const canAdd = Boolean(draft.title.trim()) && !planFull;
  const submitTask = (e) => {
    e.preventDefault();
    if (!canAdd) return;
    onAddPlanTask({ title: draft.title, subject: draft.subject || null, minutes: draft.minutes });
    setDraft((d) => ({ ...d, title: "", minutes: "" })); // keep the chosen subject: students often add several tasks for one subject
  };

  return (
    <div className="space-y-5 eai-rise">
      {/* Hero */}
      <WelcomeHeroCard
        userName={p.name} greeting="សួស្តី" message={t(lang, "heroMessage")}
        onStartPlan={() => go("practice")} onAskCoach={() => go("coach")} lang={lang}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Daily plan */}
        <div className="eai-card p-6 lg:col-span-2">
          <CardHead title={t(lang, "dashTodayPlan")} kh={lang === "km" ? null : "ផែនការសិក្សាថ្ងៃនេះ"}
            action={<span className="text-xs font-bold eai-display" style={{ color: "var(--jade)" }}>{done}/{tasks.length} {t(lang, "dashDone")}</span>} />
          <div className="h-1.5 rounded-full eai-soft mb-4 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${planPct}%`, background: "var(--jade)", transition: "width .3s" }} />
          </div>
          <form onSubmit={submitTask} className="flex flex-col sm:flex-row gap-2 mb-4">
            <input value={draft.title} maxLength={MAX_TITLE_LENGTH} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              placeholder={t(lang, "planAddPlaceholder")} aria-label={t(lang, "planAddPlaceholder")}
              className={`eai-ob-input eai-focus flex-1 min-w-0 ${lang === "km" ? "eai-km" : ""}`} style={{ height: 42 }} />
            <div className="flex gap-2">
              <select value={draft.subject} onChange={(e) => setDraft((d) => ({ ...d, subject: e.target.value }))}
                aria-label={t(lang, "planSubjectOptional")}
                className={`eai-ob-input eai-focus flex-1 min-w-0 ${lang === "km" ? "eai-km" : ""}`} style={{ height: 42 }}>
                <option value="">{t(lang, "planSubjectOptional")}</option>
                {subjectOptions.map((s) => <option key={s} value={s}>{subjectLabel(s, lang)}</option>)}
              </select>
              <input type="number" min="1" max="600" inputMode="numeric" value={draft.minutes}
                onChange={(e) => setDraft((d) => ({ ...d, minutes: e.target.value }))}
                placeholder={t(lang, "planMinutesShort")} aria-label={t(lang, "planMinutesShort")}
                className={`eai-ob-input eai-focus ${lang === "km" ? "eai-km" : ""}`} style={{ height: 42, width: 84, flexShrink: 0 }} />
              <button type="submit" disabled={!canAdd}
                className={`eai-btn eai-glass eai-focus px-4 text-sm flex items-center gap-1.5 flex-shrink-0 ${lang === "km" ? "eai-km" : ""}`}
                style={{ opacity: canAdd ? 1 : 0.5, cursor: canAdd ? "pointer" : "not-allowed" }}>
                <Plus size={15} /> {t(lang, "planAdd")}
              </button>
            </div>
          </form>
          <div className="space-y-2.5">
            {tasks.length === 0 && (
              <p className={`text-sm eai-muted py-2 ${lang === "km" ? "eai-km" : ""}`}>{t(lang, "planEmpty")}</p>
            )}
            {tasks.map((task) => (
              <div key={task.id} className="eai-nav flex items-center gap-2 p-3 rounded-2xl border" style={{ borderColor: "var(--line)" }}>
                <button onClick={() => onTogglePlan(task.id)} aria-pressed={task.done} className="eai-focus flex-1 min-w-0 flex items-center gap-3 text-left rounded-xl">
                  {task.done ? <CheckCircle2 size={22} style={{ color: "var(--jade)", flexShrink: 0 }} /> : <Circle size={22} className="eai-muted" style={{ flexShrink: 0 }} />}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate" style={{ textDecoration: task.done ? "line-through" : "none", opacity: task.done ? 0.5 : 1 }}>{task.task}</p>
                    <p className="text-xs eai-muted">{[task.s ? subjectLabel(task.s, lang) : null, task.why === "My task" ? t(lang, "planMyTask") : task.why].filter(Boolean).join(" · ")}</p>
                  </div>
                  {task.min ? <span className="text-xs font-bold eai-muted flex items-center gap-1 flex-shrink-0"><Clock size={13} /> {task.min}m</span> : null}
                </button>
                <button onClick={() => onRemovePlanTask(task.id)} aria-label={t(lang, "planDeleteTask")} title={t(lang, "planDeleteTask")}
                  className="eai-focus eai-muted p-1.5 rounded-lg flex-shrink-0"><Trash2 size={16} /></button>
              </div>
            ))}
          </div>
          {suggestions.length > 0 && (
            <div className="mt-4">
              <p className={`text-xs font-semibold eai-muted mb-2 ${lang === "km" ? "eai-km" : ""}`}>{t(lang, "planSuggested")}</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((sg) => (
                  <button key={sg.id} onClick={() => onAddPlanTask({ title: sg.task, subject: sg.s, minutes: sg.min, why: sg.why })} disabled={planFull}
                    className="eai-focus eai-soft text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5">
                    <Plus size={12} /> {sg.task}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Streak + XP + Level */}
        <div className="eai-card p-6 flex flex-col gap-5 justify-center">
          <div className="flex items-center gap-4">
            <div className="grid place-items-center rounded-2xl" style={{ width: 60, height: 60, background: "var(--ember-soft)" }}>
              <span className="eai-fx-fire-slow"><Flame size={30} style={{ color: "var(--ember)" }} /></span>
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
        description={t(lang, "targetsWeakest")} xpNote={`+${localizeNum(XP_PER_CORRECT, lang)} ${t(lang, "xpPerCorrect")}`}
        imageUrl="/decor/math-formulas.svg" onStart={() => go("practice")} lang={lang}
      />

      {/* Explore more */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Target, fx: "eai-ico-target", label: t(lang, "navPractice"), desc: t(lang, "exploreSharpen"), tab: "practice", c: "var(--jade)" },
          { icon: GraduationCap, fx: "eai-ico-cap", label: t(lang, "navUniversities"), desc: t(lang, "exploreBrowseMajors"), tab: "universities", c: "var(--primary)" },
          { icon: BookOpen, fx: "eai-ico-book", label: t(lang, "browseTitle"), desc: t(lang, "exploreBrowsePast"), tab: "browse", c: "var(--ember)" },
          { icon: BarChart3, fx: "eai-ico-chart", label: t(lang, "navProgress"), desc: t(lang, "exploreStats"), tab: "progress", c: "var(--gold)" },
        ].map((c, i) => (
          <button key={c.label} onClick={() => go(c.tab)} className="eai-card eai-tile eai-focus p-5 text-left flex items-center gap-3.5">
            <div className="grid place-items-center rounded-xl flex-shrink-0" style={{ width: 40, height: 40, background: "var(--bg-soft)" }}>
              <span className={`eai-ico ${c.fx}`} style={{ "--icon-glow": c.c, "--icon-glow-delay": `${i * 0.4}s` }}>
                <c.icon size={19} style={{ color: c.c }} />
              </span>
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

function ExamPaperPage({ paper, onBack, lang = "en", topSlot = null }) {
  // Localized on every render from the raw subject/year, not baked into a string at click-time —
  // otherwise toggling language while already on this page would leave the title stuck in
  // whichever language was active the moment "View" was clicked.
  const title = `${subjectLabel(paper.subject, lang)} · ${bacIILabel(lang)} ${localizeNum(paper.year, lang)}`;
  return (
    <div className="space-y-5 eai-rise">
      <button onClick={onBack} className={`eai-focus flex items-center gap-1 text-sm eai-muted ${lang === "km" ? "eai-km" : ""}`}>
        <ChevronLeft size={16} /> {t(lang, "allExamsWord")}
      </button>
      {topSlot}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className={`eai-display text-2xl font-extrabold ${lang === "km" ? "eai-km" : ""}`}>{title}</h2>
          <p className={`eai-muted text-sm mt-1 ${lang === "km" ? "eai-km" : ""}`}>{paper.pdf ? t(lang, "pdfPaperDesc") : t(lang, "imagePaperDesc")}</p>
        </div>
        {paper.pdf && (
          <a href={paper.pdf} target="_blank" rel="noopener noreferrer"
            className={`eai-btn eai-focus text-sm py-2.5 px-4 text-white flex items-center gap-1.5 flex-shrink-0 ${lang === "km" ? "eai-km" : ""}`}
            style={{ background: "var(--primary)" }}>
            <Download size={15} /> {t(lang, "openPdfBtn")}
          </a>
        )}
      </div>
      {paper.pdf ? (
        <>
          {/* Inline preview: works on most desktop browsers via their native PDF plugin. Many mobile
              browsers (Chrome for Android in particular) and in-app webviews (Facebook/Instagram/TikTok)
              don't support rendering a PDF inside an <iframe> at all and just show a blank frame — the
              "Open PDF" button above and the note below are the reliable path on those. */}
          <p className={`text-xs eai-muted sm:hidden ${lang === "km" ? "eai-km" : ""}`}>{t(lang, "openPdfMobileNote")}</p>
          <iframe src={`${paper.pdf}#view=FitH`} title={title} className="w-full block" style={{ height: "88vh", border: "none" }} />
        </>
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

function Browse({ p, lang = "en", exam, tr }) {
  const [year, setYear] = useState(() => newestPaperYear(p.field));
  const [viewingPaper, setViewingPaper] = useState(null);
  // Timed attempts: "read" = the paper with the running clock, "submit" = adding the photos, "result" = how long it took.
  const [phase, setPhase] = useState("read");
  const [finished, setFinished] = useState(null);
  const [note, setNote] = useState("");
  const running = exam.current;
  const paperFor = (subject, y) => { const key = `${subject}-${p.field}-${y}`; return { subject, year: y, pdf: EXAM_PAPER_PDFS[key], images: EXAM_PAPER_IMAGES[key] }; };
  const startAttempt = (subject, y) => {
    const res = exam.start({ subject, field: p.field, year: y, student: { name: p.name, grade: p.grade } });
    if (res.error === "already_running") { setNote(tr("examAlreadyRunning")); return; }
    if (res.error) { setNote(tr("examErr_generic")); return; }
    setNote(""); setPhase("read"); setViewingPaper(paperFor(subject, y));
  };
  // The attempt closed by itself (official time + 30 minutes) while the student was on the photo screen.
  useEffect(() => { if (phase === "submit" && !running) { setPhase("read"); setNote(tr("examExpired")); } }, [phase, running]); // eslint-disable-line react-hooks/exhaustive-deps

  if (phase === "result" && finished) {
    return <ExamResultCard session={finished} lang={lang} tr={tr} onDone={() => { setFinished(null); setPhase("read"); setViewingPaper(null); }} />;
  }
  if (phase === "submit" && running) {
    return (
      <SubmitSheet session={running} lang={lang} tr={tr}
        onAdd={(photo) => exam.addPhoto(running.id, photo)} onRemove={(i) => exam.removePhoto(running.id, i)}
        onSubmit={() => { const res = exam.submit(running.id); if (res.ok) { setFinished(res.session); setPhase("result"); } return res; }}
        onBack={() => setPhase("read")} />
    );
  }
  if (viewingPaper) {
    const mine = running && running.subject === viewingPaper.subject && running.year === viewingPaper.year ? running : null;
    return (
      <ExamPaperPage paper={viewingPaper} onBack={() => setViewingPaper(null)} lang={lang}
        topSlot={mine ? <ExamTimerBar session={mine} now={exam.now} lang={lang} tr={tr} onFinish={() => setPhase("submit")} onCancel={() => exam.cancel(mine.id)} /> : null} />
    );
  }
  const diffLabel = (d) => (lang === "km" ? { Easy: "ងាយ", Medium: "មធ្យម", Hard: "ពិបាក" }[d] : d);
  return (
    <div className="space-y-5 eai-rise">
      <div>
        <h2 className={`eai-display text-2xl font-extrabold ${lang === "km" ? "eai-km" : ""}`}>{t(lang, "browseTitle")}</h2>
        <p className={`eai-muted text-sm mt-1 ${lang === "km" ? "eai-km" : ""}`}>
          {p.grade === "university" ? t(lang, "universityEntrance") : bacIILabel(lang)} · {lang === "km" ? `${t(lang, "trackWord")}${FIELD_META[p.field].km}` : `${FIELD_META[p.field].label} ${t(lang, "trackWord")}`} · {t(lang, "officialPapers")} {localizeNum(2010, lang)}–{localizeNum(2026, lang)}
        </p>
      </div>
      <JoinSchoolCard school={exam.school} lang={lang} tr={tr} lookup={exam.schoolForCode} onJoin={exam.joinSchool} onLeave={exam.leaveSchool} hint={tr("schoolDemoHint")} />
      {running && (
        <div className="eai-card p-4 flex flex-wrap items-center justify-between gap-3" style={{ borderColor: "var(--primary)" }} data-testid="exam-resume">
          <div className="flex items-center gap-3 min-w-0">
            <span className="grid place-items-center rounded-2xl" style={{ width: 40, height: 40, background: "var(--primary-soft)", color: "var(--primary)" }}><Timer size={20} /></span>
            <div className="min-w-0">
              <p className={`text-xs eai-muted ${lang === "km" ? "eai-km" : ""}`}>{tr("examRunningTitle")}</p>
              <p className={`font-bold truncate ${lang === "km" ? "eai-km" : ""}`}>{subjectLabel(running.subject, lang)} · {bacIILabel(lang)} {localizeNum(running.year, lang)}</p>
            </div>
          </div>
          <button onClick={() => { setViewingPaper(paperFor(running.subject, running.year)); setPhase("read"); }} className={`eai-btn eai-focus text-sm py-2 px-4 text-white ${lang === "km" ? "eai-km" : ""}`} style={{ background: "var(--primary)" }}>{tr("examResume")}</button>
        </div>
      )}
      {note && <p className={`eai-ob-error flex items-center gap-1.5 ${lang === "km" ? "eai-km" : ""}`} role="alert"><AlertTriangle size={13} /> {note}</p>}
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
                <SubjectIcon subject={sub.s} tile />
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
              {hasPaper && (
                <button onClick={() => startAttempt(sub.s, year)} data-testid={`start-${sub.s}`}
                  className={`eai-btn eai-focus w-full mt-4 text-sm py-2.5 flex items-center justify-center gap-1.5 text-white ${lang === "km" ? "eai-km" : ""}`} style={{ background: "var(--primary)" }}>
                  <Timer size={14} /> {tr("examStartBtn")}
                </button>
              )}
              <div className="flex gap-2 mt-2">
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

/* Canonical (English) topic key → Khmer display label, built once from the data above. Internal
   tracking (topicMastery, SUBJECT_TOPICS, weak/strong subject lookups) always keys on the English
   topic string; only rendered UI text goes through topicLabel(). */
const TOPIC_LABEL_KM = {};
Object.values(RAW_EXERCISES).flat().forEach((r) => { if (r.topicKm) TOPIC_LABEL_KM[r.topic] = r.topicKm; });
// University quiz topics (UNI_QUIZ_BANK) are deliberately English-only — no topicKm to register
// here — so topicLabel() falls through to returning the raw English topic even in Khmer mode.
const topicLabel = (topic, lang) => (lang === "km" ? (TOPIC_LABEL_KM[topic] ?? topic) : topic);

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
    // Only subjects whose bank entries carry a chapter (currently History, Biology, Physics, Chemistry, Mathematics) get
    // grouped into a chapter-picker step in PracticeSubject; everything else is unaffected (chapter
    // stays undefined). Kept as the stable English key (never localized here) so PracticeSubject's
    // selected-chapter state stays valid across a language toggle — chapterKm is exposed alongside
    // it purely for display, localized separately by the component that renders it.
    chapter: r.chapter, chapterKm: r.chapterKm,
    // Optional presentation hints (Chemistry uses both; every other bank leaves them undefined).
    // chapterOrder sorts the chapter picker into curriculum order even when a chapter's questions
    // were appended later; stage 0 marks a short formula quiz that PracticeSubject lists first.
    // Neither changes an exercise's id, which stays `${subject}-${position in the bank}`.
    chapterOrder: r.chapterOrder, stage: r.stage,
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
        {fieldSubjects(p.field, p.foreignLanguage).map((s) => {
          const list = getExercises(s, lang);
          const doneN = list.filter((ex) => practice[ex.id]?.status === "completed").length;
          const pct = list.length ? Math.round((doneN / list.length) * 100) : 0;
          const isWeak = p.weak.some((w) => w.s === s);
          return (
            <button key={s} onClick={() => setSubject(s)} className="eai-card eai-tile eai-focus p-5 text-left">
              <div className="flex items-center justify-between">
                <SubjectIcon subject={s} tile />
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

/* Session state for answering one set of questions (the order rule lives in practiceFlow.js): which
   question is on screen, whether the student is only reviewing a set that was already completed,
   whether the question on screen is a second try of one missed earlier, which questions were missed
   this session (for the summary) and the "set complete" screen. `progress` is the saved per-exercise
   record (practice / uniPractice); a question counts as done once its status is "completed". Shared by
   PracticeSubject and UniversityPracticeCourse. */
function useSetSession(list, progress) {
  const [idx, setIdx] = useState(null); // question on screen (index into `list`); null = the list view
  const [reviewing, setReviewing] = useState(false);
  const [isRetry, setIsRetry] = useState(false);
  const [finished, setFinished] = useState(null); // { from } once every question in the set is correct
  const [missed, setMissed] = useState({});
  const isDone = (ex) => progress[ex.id]?.status === "completed";
  const show = (i) => { setIdx(i); setIsRetry(!isDone(list[i]) && progress[list[i].id]?.result === "incorrect"); };
  const onScreen = idx != null && list[idx] != null;
  const upNext = onScreen ? nextInSet(list, isDone, idx, reviewing) : null;
  const members = onScreen ? setIndexes(list, idx) : [];
  return {
    idx, isDone, isRetry, finished, missed,
    pos: members.indexOf(idx) + 1, size: members.length, doneCount: members.filter((j) => isDone(list[j])).length, // "Question 3 of 7" + progress bar
    start: (i) => { setReviewing(setIndexes(list, i).every((j) => isDone(list[j]))); setMissed({}); setFinished(null); show(i); },
    // Next has nothing to offer only when the question just missed is the one left — it must be tried again.
    canAdvance: upNext !== idx,
    finishing: upNext == null, // nothing left in the set: Next becomes "Finish set"
    advance: () => {
      if (upNext == null) { setFinished({ from: idx }); setIdx(null); return; }
      if (reviewing && upNext <= idx) setReviewing(false); // the review pass is over; only retries are left
      show(upNext);
    },
    exit: () => setIdx(null),
    leaveFinished: () => setFinished(null),
    noteMiss: (ex) => setMissed((m) => ({ ...m, [ex.id]: true })),
  };
}

function PracticeSubject({ p, subject, practice, onAnswer, onSetStatus, onBack, lang = "en" }) {
  const fullList = getExercises(subject, lang);
  // Subjects whose bank entries carry a chapter (currently History, Biology, Physics, Chemistry, Mathematics) get an extra
  // chapter-picker step before the exercise list; every other subject is unaffected.
  const hasChapters = fullList.some((ex) => ex.chapter);
  const chapterKeys = hasChapters ? [...new Set(fullList.map((ex) => ex.chapter))] : [];
  // Chapters keep first-appearance order unless EVERY chapter carries a numeric chapterOrder, in
  // which case they sort by it (so lessons appended to the bank later still land in curriculum order).
  const chapterRank = (ch) => fullList.find((ex) => ex.chapter === ch)?.chapterOrder;
  const chapters = chapterKeys.every((ch) => chapterRank(ch) != null)
    ? [...chapterKeys].sort((a, b) => chapterRank(a) - chapterRank(b))
    : chapterKeys;
  const [chapter, setChapter] = useState(null);
  // Inside a chapter, formula-quiz questions (stage 0) come first, then the practice problems —
  // students warm up on the lesson's formulas before the longer questions. The sort is stable, so
  // each group keeps its authored order.
  const stageOf = (ex) => ex.stage ?? 1;
  const list = hasChapters
    ? fullList.filter((ex) => ex.chapter === chapter).sort((a, b) => stageOf(a) - stageOf(b))
    : fullList;
  // Selected-chapter state above is always the stable English key so it survives a language
  // toggle intact (the exercise bank's Khmer name isn't derived until display time) — this helper
  // is the only place that turns that stable key into the localized label shown on screen.
  const chapterLabel = (ch) => (lang === "km" ? fullList.find((ex) => ex.chapter === ch)?.chapterKm || ch : ch);
  const backToList = hasChapters && chapter != null ? () => setChapter(null) : onBack;
  const session = useSetSession(list, practice);
  // Name shown on the "set complete" screen: the formula quiz / practice problems for a staged lesson,
  // otherwise the chapter (or the whole subject).
  const usesStages = list.some((e) => e.stage != null);
  const setName = (i) => (usesStages ? t(lang, stageOf(list[i]) === 0 ? "setNameFormulas" : "practiceProblemsHeading") : hasChapters ? chapterLabel(chapter) : subjectLabel(subject, lang));

  // ── "Missed the same topic twice" nudge (session-only). The order of the questions is NOT adaptive:
  // a set goes forward, missed questions come round again, and the set is complete once all are right
  // (see practiceFlow.js). ──
  const [topicMisses, setTopicMisses] = useState({});
  const [banner, setBanner] = useState(null);
  useEffect(() => { if (!banner) return; const t = setTimeout(() => setBanner(null), 5000); return () => clearTimeout(t); }, [banner]);

  const handleResult = (ex, correct) => {
    if (!correct) session.noteMiss(ex);
    const topicShown = topicLabel(ex.topic, lang);
    const missCount = correct ? 0 : (topicMisses[ex.topic] || 0) + 1;
    setTopicMisses((m) => ({ ...m, [ex.topic]: missCount }));
    if (!correct && missCount >= 2) setBanner({ text: lang === "km" ? `អ្នកខកខាន ${topicShown} ពីរដងជាប់គ្នា — សូមពិនិត្យការពន្យល់ដោយប្រុងប្រយ័ត្នមុននឹងសាកល្បងម្តងទៀត។` : `You've missed ${topicShown} twice in a row — review the explanation carefully before trying again.`, tone: "ember" });
  };

  if (session.idx != null && list[session.idx]) {
    const cur = list[session.idx];
    return (
      <ExercisePlayer ex={cur} entry={practice[cur.id]} subject={subject} index={session.pos - 1} total={session.size}
        progress={{ done: session.doneCount, total: session.size }} isRetry={session.isRetry} banner={banner}
        onAnswer={(ex, result, meta) => { onAnswer(ex, result, meta); handleResult(ex, result === "correct"); }}
        onSetStatus={onSetStatus} onBack={session.exit}
        onNext={session.canAdvance ? session.advance : null} finishing={session.finishing} lang={lang} glass />
    );
  }

  // Every question in the set answered correctly → the "set complete" screen.
  if (session.finished) {
    const members = setIndexes(list, session.finished.from);
    const upcoming = nextSetStart(list, session.isDone, session.finished.from);
    return (
      <SetComplete name={setName(session.finished.from)} total={members.length} setKey={list[members[0]].id} retried={members.filter((j) => session.missed[list[j].id]).length}
        onNextSet={upcoming != null ? () => session.start(upcoming) : null} onBack={session.leaveFinished} lang={lang} glass />
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
                <h3 className={`eai-display font-bold mt-3 ${lang === "km" ? "eai-km" : ""}`}>{chapterLabel(ch)}</h3>
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
            <div className="flex flex-wrap items-center gap-2">
              <h2 className={`eai-display text-2xl font-extrabold ${lang === "km" ? "eai-km" : ""}`}>{hasChapters ? chapterLabel(chapter) : subjectLabel(subject, lang)}</h2>
              {pct === 100 && <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${lang === "km" ? "eai-km" : ""}`} style={{ background: "var(--jade-soft)", color: "var(--jade)" }}><CheckCircle2 size={12} /> {t(lang, "status_completed")}</span>}
            </div>
            <p className={`eai-muted text-sm mt-0.5 ${lang === "km" ? "eai-km" : ""}`}>{list.length} {t(lang, "exercisesWord")} · {doneN} {t(lang, "completedWord")}</p>
          </div>
          <Ring value={pct} size={60} color="var(--jade)"><span className="eai-display font-bold text-xs">{pct}%</span></Ring>
        </div>
      </div>

      <div className="space-y-3">
        {list.map((ex, i) => {
          const entry = practice[ex.id];
          const st = STATUS[entry?.status || "pending"];
          // A section header appears wherever the group changes (only for banks that use stages).
          const isDrill = stageOf(ex) === 0;
          const groupStarts = list.some((e) => e.stage != null) && (i === 0 || stageOf(list[i - 1]) !== stageOf(ex));
          const group = groupStarts ? list.filter((e) => (stageOf(e) === 0) === isDrill) : [];
          const groupDone = group.filter((e) => practice[e.id]?.status === "completed").length;
          return (
            <React.Fragment key={ex.id}>
            {groupStarts && (
              <div className={i === 0 ? "" : "pt-3"}>
                <div className="flex items-center gap-2">
                  {isDrill && <Brain size={16} style={{ color: "var(--primary)" }} />}
                  <h3 className={`eai-display font-bold ${lang === "km" ? "eai-km" : ""}`}>{t(lang, isDrill ? "formulaQuizHeading" : "practiceProblemsHeading")}</h3>
                  <span className="text-xs font-semibold eai-muted">{groupDone}/{group.length}</span>
                  {groupDone === group.length && <CheckCircle2 size={15} style={{ color: "var(--jade)" }} />}
                </div>
                {isDrill && <p className={`eai-muted text-xs mt-0.5 ${lang === "km" ? "eai-km" : ""}`}>{t(lang, "formulaQuizHint")}</p>}
              </div>
            )}
            <div className="eai-card p-4 flex flex-wrap items-center gap-3">
              <div className="grid place-items-center rounded-xl flex-shrink-0 eai-display font-bold" style={{ width: 36, height: 36, background: "var(--bg-soft)", color: "var(--muted)" }}>{setIndexes(list, i).indexOf(i) + 1}</div>
              <div className="min-w-0 flex-1" style={{ minWidth: 180 }}>
                <p className="text-sm font-semibold truncate">{ex.prompt}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full eai-soft eai-muted ${lang === "km" ? "eai-km" : ""}`}>{topicLabel(ex.topic, lang)}</span>
                  <span className="text-xs font-semibold" style={{ color: diffColor(ex.difficulty) }}>{ex.difficulty}</span>
                  <span className={`text-xs font-semibold flex items-center gap-1 ${lang === "km" ? "eai-km" : ""}`} style={{ color: st.color }}><st.icon size={12} /> {lang === "km" ? t(lang, `status_${entry?.status || "pending"}`) : st.label}</span>
                </div>
              </div>
              <StatusControl status={entry?.status} onChange={(s) => onSetStatus(ex, s)} lang={lang} />
              <button onClick={() => session.start(i)} className={`eai-btn eai-focus text-sm py-2 px-4 text-white flex items-center gap-1.5 flex-shrink-0 ${lang === "km" ? "eai-km" : ""}`} style={{ background: "var(--primary)" }}>
                {entry?.status === "completed" ? t(lang, "reviewWord") : t(lang, "solveWord")} <ChevronRight size={15} />
              </button>
            </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

/* `index`/`total` are the question's position inside its SET ("Question 3 of 7"), `progress` is how many
   of the set are already correct, `isRetry` marks a question missed earlier that has come round again,
   and `finishing` means Next will end the set (the button then reads "Finish set"). onNext is null when
   the question just missed is the only one left — it has to be tried again. The owl beside the card
   reacts to every answer and says something encouraging (mascotCheers.js): a cheer for a right answer
   (a "you got it this time" one when the question had been missed before), a gentle one for a wrong
   answer. */
function ExercisePlayer({ ex, entry, subject, index, total, progress, isRetry = false, banner, onAnswer, onSetStatus, onBack, onNext, finishing = false, lang = "en", glass = false }) {
  const [choice, setChoice] = useState(null);
  const [phase, setPhase] = useState("answering"); // answering | mistake | result
  const isMcq = Array.isArray(ex.options);
  const submitted = phase !== "answering";
  const correct = submitted && gradeAnswer(ex, choice);
  const startRef = useRef(Date.now());
  const pendingTimeRef = useRef(0);
  const cardRef = useRef(null);
  const owlTrigger = useRef({ type: "no", nonce: 0, duration: 1.3 });
  const reactOwl = (type, duration) => { owlTrigger.current = { type, nonce: owlTrigger.current.nonce + 1, duration }; };
  // What the owl is saying right now ({ key, kind }, or null) and the bookkeeping behind picking it: the
  // last line shown (never repeated back to back) and whether this question has been missed in this visit
  // (a right answer after a miss gets the "this time" line even if the question is not otherwise a retry).
  const [cheer, setCheer] = useState(null);
  const lastCheerRef = useRef(null);
  const missedRef = useRef(false);
  const sayCheer = (kind) => { const key = pickCheer(kind, lastCheerRef.current); lastCheerRef.current = key; setCheer({ key, kind }); };

  // The player is reused for the next question (same component, new `ex`): start it clean — no leftover
  // bubble from the previous question, no memory of a miss that belonged to it.
  useEffect(() => { setCheer(null); missedRef.current = false; }, [ex.id]);

  const submit = () => {
    if (choice == null || String(choice).trim() === "") return;
    const isCorrect = gradeAnswer(ex, choice);
    const timeSec = Math.round((Date.now() - startRef.current) / 100) / 10;
    if (isCorrect) {
      onAnswer(ex, "correct", { timeSec }); setPhase("result"); reactOwl("jump", 1.9);
      sayCheer(isRetry || missedRef.current ? "retry" : "correct");
    } else {
      pendingTimeRef.current = timeSec; setPhase("mistake"); reactOwl("no", 1.3);
      missedRef.current = true; sayCheer("miss");
    }
  };
  const chooseMistake = (mistakeType) => { onAnswer(ex, "incorrect", { timeSec: pendingTimeRef.current, mistakeType }); setPhase("result"); };
  const retry = () => { setPhase("answering"); setChoice(null); setCheer(null); startRef.current = Date.now(); };
  const next = () => { retry(); onNext?.(); };

  return (
    <div className="space-y-5 eai-rise">
      <button onClick={onBack} className={`eai-focus flex items-center gap-1 text-sm eai-muted ${lang === "km" ? "eai-km" : ""}`}><ChevronLeft size={16} /> {subjectLabel(subject, lang)}</button>

      {banner && (
        <div className="eai-rise flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold" style={{ background: `var(--${banner.tone}-soft)`, color: `var(--${banner.tone})` }}>
          <Sparkles size={15} /> {banner.text}
        </div>
      )}

      <div className="eai-ex-layout">
        <div className="eai-ex-mascot">
          <div className="eai-ex-owl"><OwlMascot pointTargetRef={cardRef} triggerRef={owlTrigger} /></div>
          {/* Always rendered (even when empty): the phone layout's row keeps its shape, and a live region has to
              exist before its text does for screen readers to announce it. The owl jumps for a right answer, so
              that bubble waits (0.9s) until it is nearly back on the ground; the gentle "wrong answer" line has
              no jump to wait for and appears straight away. */}
          <div className="eai-ex-say" role="status">
            {cheer && <MascotSpeechBubble text={t(lang, cheer.key)} lang={lang} placement="exercise" delay={cheer.kind === "miss" ? 0 : 0.9} />}
          </div>
        </div>

        <div className="eai-ex-card" ref={cardRef}>
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <span className={`eai-ex-qlabel eai-display ${lang === "km" ? "eai-km" : ""}`}>{t(lang, "questionWord")} {index + 1} {t(lang, "ofWord")} {total}</span>
            <StatusControl status={entry?.status} onChange={(s) => onSetStatus(ex, s)} lang={lang} />
          </div>
          {progress && (
            <div className="h-1.5 rounded-full eai-soft mb-3 overflow-hidden" title={`${progress.done}/${progress.total}`}>
              <div className="h-full rounded-full" style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%`, background: "var(--jade)", transition: "width .4s ease" }} />
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className={`text-xs px-2 py-0.5 rounded-full eai-soft eai-muted ${lang === "km" ? "eai-km" : ""}`}>{topicLabel(ex.topic, lang)}</span>
            <span className="text-xs font-semibold" style={{ color: diffColor(ex.difficulty) }}>{ex.difficulty}</span>
            {isRetry && <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${lang === "km" ? "eai-km" : ""}`} style={{ background: "var(--gold-soft)", color: "var(--gold)" }}><RotateCcw size={11} /> {t(lang, "retryChip")}</span>}
          </div>

          <h3 className="eai-ex-question eai-display">{ex.prompt}</h3>

          {isMcq ? (
            <div className="eai-ex-options">
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
                    className="eai-ex-option eai-focus"
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
              {correct ? t(lang, onNext && !finishing ? "recCorrectMore" : "recCorrectLast") : t(lang, onNext ? "recIncorrectQueued" : "recIncorrect")}
            </p>

            <div className="flex flex-wrap gap-2 pt-1">
              {!correct && (
                <button onClick={retry} className={`eai-btn ${glass ? "eai-glass" : "eai-soft"} eai-focus py-2.5 px-4 text-sm flex items-center gap-1.5 ${lang === "km" ? "eai-km" : ""}`} style={glass ? undefined : { color: "var(--ink)" }}>
                  <RotateCcw size={15} /> {t(lang, "tryAgain")}
                </button>
              )}
              {onNext && (
                <button onClick={next} className={`eai-btn ${glass ? "eai-glass" : "text-white"} eai-focus py-2.5 px-4 text-sm flex items-center gap-1.5 ${lang === "km" ? "eai-km" : ""}`} style={glass ? undefined : { background: "var(--primary)" }}>
                  {t(lang, finishing ? "finishSet" : "nextExercise")} <ChevronRight size={15} />
                </button>
              )}
              <button onClick={onBack} className={`eai-btn ${glass ? "eai-glass" : "eai-soft"} eai-focus py-2.5 px-4 text-sm ${lang === "km" ? "eai-km" : ""}`} style={glass ? undefined : { color: "var(--ink)" }}>{t(lang, "backToList")}</button>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

/* Shown once every question of a set has been answered correctly (see useSetSession / practiceFlow.js).
   `retried` = how many questions needed more than one try this session; `onNextSet` (optional) starts
   the next set of the lesson, e.g. the practice problems after the formula quiz. The owl celebrates
   (dances) with a bigger speech bubble beside it: a "flawless" line when nothing had to be retried, a
   "you never gave up" one when some questions did. */
function SetComplete({ name, total, retried, setKey, onNextSet, onBack, lang = "en", glass = false }) {
  const km = lang === "km" ? "eai-km" : "";
  const summary = retried === 0 ? t(lang, "setCompleteClean") : t(lang, retried === 1 ? "setCompleteRetriedOne" : "setCompleteRetriedMany").replace("{n}", retried);
  // Picked once per visit (lazy initial state), not on every render, so the line doesn't change under the student.
  const [cheerKey] = useState(() => pickCheer(retried === 0 ? "perfect" : "resilient"));
  // OwlMascot reads its trigger's nonce when it mounts, so the dance has to be requested after mount.
  const celebrate = useRef({ type: "dance", nonce: 0, duration: 4.5 });
  useEffect(() => { celebrate.current = { ...celebrate.current, nonce: celebrate.current.nonce + 1 }; }, []);
  return (
    <div className="space-y-5 eai-rise">
      <div className="eai-card p-8 text-center">
        <div className="flex flex-col-reverse sm:flex-row items-center justify-center gap-3 sm:gap-5 mb-4">
          <div style={{ width: "clamp(150px, 22vw, 210px)", maxWidth: "55vw", flexShrink: 0 }}>
            <OwlMascot triggerRef={celebrate} />
          </div>
          <MascotSpeechBubble text={t(lang, cheerKey)} lang={lang} size="lg" delay={0.35} />
        </div>
        <h2 className={`eai-display text-2xl font-extrabold flex items-center justify-center gap-2 ${km}`}>
          <CheckCircle2 size={26} style={{ color: "var(--jade)", flexShrink: 0 }} /> {t(lang, "setCompleteTitle")}
        </h2>
        <p className={`eai-muted text-sm mt-1 ${km}`}>{name} · {total}/{total} {t(lang, "completedWord")}</p>
        <p className={`text-sm mt-4 ${km}`}>{summary}</p>
        <div className="mt-5"><TreasureBox setKey={setKey} total={total} retried={retried} lang={lang} /></div>
        <div className="flex flex-wrap justify-center gap-2 mt-6">
          {onNextSet && (
            <button onClick={onNextSet} className={`eai-btn ${glass ? "eai-glass" : "text-white"} eai-focus py-2.5 px-4 text-sm flex items-center gap-1.5 ${km}`} style={glass ? undefined : { background: "var(--primary)" }}>
              {t(lang, "nextSetBtn")} <ChevronRight size={15} />
            </button>
          )}
          <button onClick={onBack} className={`eai-btn ${glass ? "eai-glass" : "eai-soft"} eai-focus py-2.5 px-4 text-sm ${km}`} style={glass ? undefined : { color: "var(--ink)" }}>{t(lang, "backToList")}</button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════ University Practice ════════════════════════
   The university track's quiz UI — reuses ExercisePlayer/StatusControl/STATUS/getUniExercises
   as-is (they're subject-shape-agnostic) rather than re-deriving the exercise-answering screen.
   A course is one set and uses the same flow as PracticeSubject (useSetSession / practiceFlow.js):
   forward through the course, missed questions come round again, and the set is complete once every
   question is right. Same mastery tracking underneath via onAnswer -> handleUniAnswer -> recordAttempt. */
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
  const session = useSetSession(list, uniPractice);
  const courseTitle = lang === "km" ? course.titleKm : course.title;

  if (session.idx != null && list[session.idx]) {
    const cur = list[session.idx];
    return (
      <ExercisePlayer ex={cur} entry={uniPractice[cur.id]} subject={courseTitle} index={session.pos - 1} total={session.size}
        progress={{ done: session.doneCount, total: session.size }} isRetry={session.isRetry} banner={null}
        onAnswer={(ex, result, meta) => { onAnswer(ex, result, meta); if (result !== "correct") session.noteMiss(ex); }}
        onSetStatus={onSetStatus} onBack={session.exit}
        onNext={session.canAdvance ? session.advance : null} finishing={session.finishing} lang={lang} />
    );
  }

  if (session.finished) {
    const members = setIndexes(list, session.finished.from);
    return <SetComplete name={courseTitle} total={list.length} setKey={list[members[0]].id} retried={list.filter((ex) => session.missed[ex.id]).length}
      onNextSet={null} onBack={session.leaveFinished} lang={lang} />;
  }

  const doneN = list.filter((ex) => uniPractice[ex.id]?.status === "completed").length;
  const pct = list.length ? Math.round((doneN / list.length) * 100) : 0;

  return (
    <div className="space-y-5 eai-rise">
      <button onClick={onBack} className={`eai-focus flex items-center gap-1 text-sm eai-muted ${lang === "km" ? "eai-km" : ""}`}><ChevronLeft size={16} /> {t(lang, "allSubjects")}</button>
      <div className="eai-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="eai-display text-2xl font-extrabold">{courseTitle}</h2>
              {pct === 100 && <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${lang === "km" ? "eai-km" : ""}`} style={{ background: "var(--jade-soft)", color: "var(--jade)" }}><CheckCircle2 size={12} /> {t(lang, "status_completed")}</span>}
            </div>
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
              <div className="grid place-items-center rounded-xl flex-shrink-0 eai-display font-bold" style={{ width: 36, height: 36, background: "var(--bg-soft)", color: "var(--muted)" }}>{setIndexes(list, i).indexOf(i) + 1}</div>
              <div className="min-w-0 flex-1" style={{ minWidth: 180 }}>
                <p className="text-sm font-semibold truncate">{ex.prompt}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full eai-soft eai-muted ${lang === "km" ? "eai-km" : ""}`}>{topicLabel(ex.topic, lang)}</span>
                  <span className="text-xs font-semibold" style={{ color: diffColor(ex.difficulty) }}>{ex.difficulty}</span>
                  <span className={`text-xs font-semibold flex items-center gap-1 ${lang === "km" ? "eai-km" : ""}`} style={{ color: st.color }}><st.icon size={12} /> {lang === "km" ? t(lang, `status_${entry?.status || "pending"}`) : st.label}</span>
                </div>
              </div>
              <StatusControl status={entry?.status} onChange={(s) => onSetStatus(ex, s)} lang={lang} />
              <button onClick={() => session.start(i)} className={`eai-btn eai-focus text-sm py-2 px-4 text-white flex items-center gap-1.5 flex-shrink-0 ${lang === "km" ? "eai-km" : ""}`} style={{ background: "var(--primary)" }}>
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
   Science sits it in four sections (Mathematics, Physics, Chemistry, Biology) of a dozen questions
   each; Social Science has none (diagnosticPlan.js). No feedback mid-test — like a real diagnostic,
   you only see results at the end. It seeds the very first real topic-mastery scores; everything
   the dashboard shows flows from this. */
function Diagnostic({ reg, dark, onComplete, lang = "en" }) {
  const sections = useMemo(() => buildSections(reg.field, (s) => getExercises(s, lang)), [reg.field, lang]);
  const queue = useMemo(() => sections.flatMap((s) => s.questions), [sections]);
  const [i, setI] = useState(0);
  const [topicMastery, setTopicMastery] = useState({});
  const [choice, setChoice] = useState(null);
  const startRef = useRef(Date.now());

  useEffect(() => { startRef.current = Date.now(); }, [i]);

  if (i >= queue.length) {
    return <DiagnosticResults reg={reg} dark={dark} topicMastery={topicMastery} onComplete={() => onComplete(topicMastery)} lang={lang} />;
  }

  const ex = queue[i];
  const where = locate(sections, i); // { section, sections, position, size }

  const answer = (confidence) => {
    const correct = gradeAnswer(ex, choice);
    const timeSec = (Date.now() - startRef.current) / 1000;
    setTopicMastery((tm) => recordAttempt(tm, ex.subject, ex.topic, { correct, difficulty: ex.difficulty, timeSec, confidence, mistakeType: null, ts: Date.now() }));
    setChoice(null);
    setI((n) => n + 1);
  };

  return (
    <div className={`eai-root ${dark ? "theme-dark" : "theme-light"} ${lang === "km" ? "eai-km-root" : ""}`} style={{ minHeight: "100vh" }}>
      <style>{STYLES}</style>
      <div className="flex items-center justify-center p-4" style={{ minHeight: "100vh" }}>
        <div className="w-full eai-rise" style={{ maxWidth: 640 }}>
          <div className="flex items-center justify-between mb-2">
            <p className={`text-sm font-semibold eai-muted flex items-center gap-1.5 ${lang === "km" ? "eai-km" : ""}`}><ClipboardCheck size={15} /> {t(lang, "diagnosticTestWord")}</p>
            <p className={`text-xs eai-muted ${lang === "km" ? "eai-km" : ""}`}>{t(lang, "sectionWord")} {localizeNum(where.section, lang)} {t(lang, "ofWord")} {localizeNum(where.sections, lang)} · {t(lang, "questionWord")} {localizeNum(where.position, lang)} {t(lang, "ofWord")} {localizeNum(where.size, lang)}</p>
          </div>
          <div className="flex gap-1.5 mb-6">
            {sections.map((sec, k) => {
              const current = k + 1 === where.section;
              const filled = k + 1 < where.section ? 100 : current ? Math.round(((where.position - 1) / where.size) * 100) : 0;
              return (
                <div key={sec.subject} className="flex-1 min-w-0">
                  <div className="h-1.5 rounded-full eai-soft overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${filled}%`, background: "var(--primary)", transition: "width .3s" }} />
                  </div>
                  <p className={`text-[10px] sm:text-xs mt-1 truncate ${current ? "font-semibold" : "eai-muted"} ${lang === "km" ? "eai-km" : ""}`}>{subjectLabel(sec.subject, lang)}</p>
                </div>
              );
            })}
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
  const rows = diagnosticSubjects(reg.field).map((s) => {
    const topics = SUBJECT_TOPICS[s] || [];
    const scores = topics.map((t) => topicMastery[s]?.[t]?.score).filter((x) => x != null);
    const m = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
    return { s, m, level: masteryLevel(m) };
  });
  const known = rows.filter((r) => r.m != null);
  const overall = known.length ? Math.round(known.reduce((a, b) => a + b.m, 0) / known.length) : null;
  const overallLevel = masteryLevel(overall);

  return (
    <div className={`eai-root ${dark ? "theme-dark" : "theme-light"} ${lang === "km" ? "eai-km-root" : ""}`} style={{ minHeight: "100vh" }}>
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
                    <SubjectIcon subject={s.s} size={16} />
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
    return `I don't have a strong-subject signal for you yet — answer a few practice questions so I can ground this in your real mastery. In the meantime, tell me a subject you enjoy or an interest area and I'll suggest real majors from Cambodian universities.`;
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
  // A dev-proxy failure (server down) is a 5xx without a FastAPI error body. With no server address set, a host such as
  // Vercel answers "404 not found" for /api/query/...: that is the same "no AI server", not an error to show a student.
  if (!detail && (res.status >= 500 || (!RAG_API && res.status === 404))) throw new RagError(RAG_API ? UNREACHABLE : UNCONFIGURED, 0);
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

async function ragStreamRequest(path, body, { signal, status }) {
  const send = () => ragRequest(path, {
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

/* Streams one reply from a /api/.../stream endpoint into onUpdate at the reading pace above, and
   asks for more while the model stops at its output limit: next(textSoFar) builds the body of the
   follow-up request. Resolves to { text, sources, stopReason }; a failure is thrown with what had
   arrived by then as err.partial (and err.sources) so the caller can keep it. */
async function ragStreamReply(path, body, next, { onUpdate = () => {}, signal, onImages, initialStatus, stageLabels = STAGE_LABELS }) {
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
  const streamOnce = async (requestBody) => {
    const base = text.length; // a model switch rewinds this request's own output, not the answer so far
    let finished = false;
    let stopReason = null;
    const res = await ragStreamRequest(path, JSON.stringify(requestBody), { signal, status });
    try {
      for await (const event of readNdjson(res)) {
        if (event.type === "status") status(stageLabels[event.stage]);
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
    status(initialStatus);
    let stopReason = await streamOnce(body);
    for (let round = 0; TRUNCATED_STOPS.has(stopReason) && round < CONTINUE_ROUNDS && !signal?.aborted; round++) {
      stopReason = await streamOnce(next(text));
    }
    await drain();
    return { text, sources, stopReason };
  } catch (err) {
    err.partial = text;
    err.sources = sources;
    throw err;
  } finally {
    stopPacing();
  }
}

async function ragStudyReply(t, p, history, onUpdate = () => {}, { images = [], signal, onImages } = {}) {
  const first = {
    prompt: t,
    history: toRagHistory(history),
    images: images.map(({ data, mime_type, name }) => ({ data, mime_type, name })),
  };
  // The photos are already read, so a continuation sends the answer so far instead.
  const next = (text) => {
    // The question rides along so retrieval finds the same passages again; on its
    // own the continuation phrase matches nothing and the server would announce
    // mid-answer that the curriculum does not cover this.
    const lang = KHMER_CHAR.test(text) ? "km" : "en";
    return {
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
    };
  };
  try {
    let { text, sources, stopReason } = await ragStreamReply("/api/query/stream", first, next, {
      onUpdate, signal, onImages,
      initialStatus: images.length ? STAGE_LABELS.reading_images : STAGE_LABELS.searching,
    });
    if (TRUNCATED_STOPS.has(stopReason)) text += "\n\n*(This exercise is longer than I can answer in one go. Ask me to carry on from the last step.)*";
    return { text: text || "…", rag: true, sources };
  } catch (err) {
    const { partial: text = "", sources = [] } = err;
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
  }
}

/* Exam Generator: a new mock BAC II paper from /api/exam/stream, modelled on the real past papers
   of one subject in the server's library, with a worked answer key and marking scheme. One seed
   per paper picks which past years the model studies, and the continuation rounds send it again
   so they see the same ones. */
const EXAM_FOCUS_MAX = 1000;
const EXAM_STAGE_LABELS = {
  searching: "Studying past papers…",
  generating: "Writing your paper and checking its answers (this takes a minute or two)…",
};

async function examPaperReply(t, p, history, onUpdate = () => {}, { signal, exam } = {}) {
  const first = {
    subject: subjectId(exam.subject),
    language: exam.language,
    focus: t.slice(0, EXAM_FOCUS_MAX),
    answer_key: exam.answerKey,
    seed: Math.floor(Math.random() * 2 ** 31),
  };
  const next = (text) => ({ ...first, partial: text, continues_math: opensInDisplayMath(text) });
  const meta = { subject: exam.subject };
  try {
    let { text, sources, stopReason } = await ragStreamReply("/api/exam/stream", first, next, {
      onUpdate, signal, initialStatus: EXAM_STAGE_LABELS.searching, stageLabels: EXAM_STAGE_LABELS,
    });
    if (TRUNCATED_STOPS.has(stopReason)) text += "\n\n*(The paper ran longer than I can write in one go. Generate it again, or turn the answer key off for a shorter paper.)*";
    return { text: text || "…", rag: true, sources, exam: meta };
  } catch (err) {
    const { partial: text = "", sources = [] } = err;
    if (signal?.aborted) {
      return text
        ? { text: `${text}\n\n*(Stopped)*`, rag: true, sources, exam: meta, error: true }
        : { text: "Stopped.", error: true };
    }
    if (text) return { text: `${text}\n\n*(The paper was cut off: ${err.message})*`, rag: true, sources, exam: meta, error: true };
    return { text: `Sorry, I couldn't write that paper: ${err.message}`, error: true };
  }
}

/* Opens the paper alone in a new window and prints it, so "Save as PDF" gives a clean exam sheet
   without the app around it. The app's stylesheets (KaTeX's among them) are copied across. */
const escapeHtml = (text) => text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function printExamPaper(node, title) {
  const win = window.open("", "_blank");
  if (!win) return false;
  const styles = [...document.querySelectorAll('link[rel="stylesheet"], style')].map((el) => el.outerHTML).join("\n");
  win.document.write(`<!doctype html><html><head><meta charset="utf-8">
<base href="${escapeHtml(document.baseURI)}"><title>${escapeHtml(title)}</title>${styles}
<style>
:root{ --ink:#000; --muted:#444; --line:#bbb; --card:#fff; --bg:#fff; --bg-soft:#f3f3f3; --primary:#1e3a8a; color-scheme:light; }
html,body{ background:#fff !important; color:#000 !important; }
body{ margin:0; padding:24px 32px; font-size:14px; line-height:1.6; }
.eai-md{ max-width:none; }
.eai-md h2, .eai-md h3{ break-after:avoid; }
.eai-md .katex-display{ overflow:visible !important; }
@page{ margin:16mm; }
</style></head><body><div class="eai-md">${node.innerHTML}</div></body></html>`);
  win.document.close();
  win.focus();
  // KaTeX and Khmer fonts load after the write; print once they have.
  (win.document.fonts?.ready || Promise.resolve()).then(() => setTimeout(() => win.print(), 200));
  return true;
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
    canStop: true,
  },
  exam: {
    label: "Exam Generator", icon: FileText,
    subtitle: "New BAC II mock papers, modelled on real past papers, with a worked answer key",
    suggestions: () => ["A full paper, exactly like the real exam", "A harder paper for a top grade", "Focus on the chapters students find hardest"],
    placeholder: "Optional: a topic to focus on, e.g. integrals and complex numbers…",
    intro: "Pick a subject below and I'll write a new mock BAC II paper in the format of the real past papers, then its full answer key and marking scheme. Add a topic to focus on, or just press send.",
    reply: examPaperReply,
    canStop: true,
    allowEmpty: true,
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

/* The years of the real papers a generated paper was modelled on (meta's sources, newest first). */
const modelledOn = (sources = []) => [...new Set(sources.map((s) => s.heading).filter(Boolean))];

function AssistantMessage({ m, Icon }) {
  const answerRef = useRef(null);
  const [printBlocked, setPrintBlocked] = useState(false);
  const years = m.exam ? modelledOn(m.sources) : [];
  return (
    <div className="flex gap-3">
      <div className="eai-avatar"><Icon size={15} color="#fff" /></div>
      <div className="flex-1 min-w-0 text-[15px] leading-relaxed" style={{ color: m.error ? "var(--ember)" : "var(--ink)" }}>
        {m.rag && !m.text && m.notice ? <StatusLine text={m.notice} />
          : m.rag ? <div ref={answerRef}><RichAnswer text={m.text} streaming={m.streaming} /></div>
          : <div style={{ whiteSpace: "pre-wrap" }}>{m.text}</div>}
        {!m.streaming && m.text && (
          <div className="eai-msg-actions">
            <CopyButton text={m.text} />
            {m.exam && (
              <button className="eai-icon-btn sm eai-focus" title="Print or save as PDF" aria-label="Print or save the paper as PDF"
                onClick={() => setPrintBlocked(!printExamPaper(answerRef.current, `${m.exam.subject} mock paper`))}>
                <Download size={15} />
              </button>
            )}
            {years.length > 0 && <span className="text-xs eai-muted self-center">Modelled on the {years.join(", ")} BAC II papers</span>}
            {printBlocked && <span className="text-xs self-center" style={{ color: "var(--ember)" }}>Allow pop-ups to print the paper.</span>}
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
const COACH_MODE_IDS_HIGHSCHOOL = ["study", "exam", "major"];

function Coach({ p }) {
  const isUni = p.educationLevel === "university";
  const [mode, setMode] = useState(isUni ? "university" : "study");
  const [msgsByMode, setMsgsByMode] = useState({ study: [], exam: [], major: [], university: [] });
  const examSubjects = isUni ? [] : fieldSubjects(p.field, p.foreignLanguage);
  const [examOptions, setExamOptions] = useState(() => ({
    subject: (p.weak?.[0] && examSubjects.includes(p.weak[0].s) ? p.weak[0].s : examSubjects[0]) || "Mathematics",
    answerKey: true,
    language: "km",
  }));
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
  const canSend = !loading && !preparing && (input.trim() !== "" || readyAttachments.length > 0 || active.allowEmpty);

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
    if ((!t && !images.length && !active.allowEmpty) || loading || (preparing && text === undefined)) return;
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
    const exam = mode === "exam" ? { ...examOptions } : null;
    const shownText = exam
      ? [`📝 ${exam.subject} mock paper · ${exam.answerKey ? "with answer key" : "questions only"} · ${exam.language === "km" ? "Khmer" : "English"}`, t].filter(Boolean).join("\n")
      : t;
    setMsgsByMode((m) => ({
      ...m,
      [mode]: [...m[mode], {
        id: userId, role: "user", text: shownText,
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
    const extras = { images, signal: controller.signal, onImages, exam };
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
        {mode === "exam" && (
          <div className="eai-exam-options" role="group" aria-label="Paper options">
            <label>
              <span>Subject</span>
              <select className="eai-focus" value={examOptions.subject} disabled={loading}
                onChange={(e) => setExamOptions((o) => ({ ...o, subject: e.target.value }))}>
                {examSubjects.map((s) => <option key={s} value={s}>{s} · {subjectLabel(s, "km")}</option>)}
              </select>
            </label>
            <label>
              <span>Language</span>
              <select className="eai-focus" value={examOptions.language} disabled={loading}
                onChange={(e) => setExamOptions((o) => ({ ...o, language: e.target.value }))}>
                <option value="km">ខ្មែរ (Khmer)</option>
                <option value="en">English</option>
              </select>
            </label>
            <label className="eai-exam-check">
              <input type="checkbox" checked={examOptions.answerKey} disabled={loading}
                onChange={(e) => setExamOptions((o) => ({ ...o, answerKey: e.target.checked }))} />
              <span>Answer key &amp; marking scheme</span>
            </label>
          </div>
        )}
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
              {loading && active.canStop
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
/* The school's view of the exam times. For now it lives in the browser with a demo school and sample data; once the backend
   serves real reports it will show only for admin accounts. */
const SCHOOL_NAV = { id: "schoolReport", label: "School report", labelKm: "របាយការណ៍សាលា", icon: School };

const NAV = [
  { id: "dashboard", label: "Dashboard", labelKm: "ផ្ទាំងគ្រប់គ្រង", icon: LayoutDashboard },
  { id: "browse", label: "Browse exams", labelKm: "រកមើលកម្រងសំណួរ", icon: BookOpen },
  { id: "practice", label: "Practice", labelKm: "លំហាត់អនុវត្ត", icon: Target },
  { id: "universities", label: "Universities", labelKm: "សាកលវិទ្យាល័យ", icon: GraduationCap },
  { id: "coach", label: "AI coach", labelKm: "គ្រូបង្វឹក AI", icon: Sparkles },
  { id: "languages", label: "Languages", labelKm: "ភាសាបរទេស", icon: Globe },
  { id: "progress", label: "Progress", labelKm: "វឌ្ឍនភាព", icon: BarChart3 },
  { id: "wardrobe", label: "Wardrobe", labelKm: "បន្ទប់ស្លៀកពាក់", icon: Shirt },
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
  { id: "wardrobe", label: "Wardrobe", labelKm: "បន្ទប់ស្លៀកពាក់", icon: Shirt },
  { id: "super", label: "Super Bondus", labelKm: "Super Bondus", icon: Crown, premium: true },
];

/* ════════════════════════ UI localization (English / Khmer) ════════════════════════
   A small, hand-picked dictionary for the highest-traffic screens (nav, welcome, dashboard,
   language hub) rather than a full line-by-line translation of the whole app — t(lang, key)
   falls back to the English string if a key is ever missing, so a partial dictionary never
   breaks rendering. */
const STRINGS = {
  en: {
    ...CHEER_STRINGS.en, // the owl's encouraging lines (mascotCheers.js)
    // Welcome
    welcomeHeading: "Welcome to", welcomeBrand: "BONDUS",
    welcomeSubtitle: "Less Time Searching, More Time Learning!",
    createAccount: "Create an account", login: "Login",
    mascotMsg1: "Let's study together! 📚", mascotMsg2: "You've got this! 💪", mascotMsg3: "Ready when you are!",
    mascotMsg4: "Keep that streak alive! 🔥", mascotMsg5: "Small steps, big wins!", mascotMsg6: "I believe in you!",
    heroAlt: "The BONDUS owl lands its airplane on a phone",
    // Shell / nav
    logOut: "Log out", streakKeepIt: "Study today to keep it!",
    navPractice: "Practice", navUniversities: "Universities", navProgress: "Progress", navExplore: "Explore",
    // Dashboard
    dashGreetingPrefix: "Welcome,",
    dashStartPlan: "Start today's plan", dashAskCoach: "Ask your AI coach",
    dashTodayPlan: "Today's study plan", dashDone: "done",
    planEmpty: "No tasks yet. Add what you plan to study today.", planAddPlaceholder: "Add a task for today…",
    planSubjectOptional: "Subject (optional)", planMinutesShort: "Min", planAdd: "Add", planDeleteTask: "Delete task",
    planSuggested: "Suggested for you", planMyTask: "My task",
    errInvalidCredentials: "Wrong phone number, email or password.",
    errEnterPhonePassword: "Enter your phone number and password.",
    errPhoneTaken: "This phone number already has an account. Try logging in instead.",
    errEmailTaken: "This email already has an account. Try logging in instead.",
    errValidation: "Please check the details you entered and try again.",
    errTooMany: "Too many tries. Please wait a little and try again.",
    errTooManyWait: "Too many tries. Please try again in {time}.",
    errNetwork: "Can't reach the server. Check your internet connection and try again.",
    errServer: "Something went wrong on our side. Please try again in a moment.",
    errSession: "Your session ended. Please log in again.",
    errInvalidCode: "That code is wrong or has expired.",
    errNoEmail: "We couldn't find an account with an email for that phone number or email, so no code was sent. Check what you typed. Accounts created without an email can't reset their password yet.",
    errEmailFailed: "We couldn't send the email right now. Please try again in a moment.",
    errPlanLimit: "You've reached today's limit of tasks.",
    errPlanSave: "Couldn't save that task. Please try again.",
    errSaveProgress: "We couldn't save your progress. Please try again later.",
    errPasswordShort: "Password must be at least 8 characters.",
    retryWord: "Try again",
    passwordHint: "At least 8 characters",
    emailResetHint: "Add an email so you can reset your password if you forget it.",
    forgotLink: "Forgot password?", forgotTitle: "Reset your password",
    forgotDesc: "Enter your phone number or email. We'll email a 6-digit code to the address on your account.",
    forgotSendCode: "Send code", forgotCodeSent: "We sent a 6-digit code to", forgotCodeExpires: "It expires in 15 minutes.",
    forgotCodeLabel: "6-digit code", forgotNewPasswordLabel: "New password", forgotResetBtn: "Reset password",
    forgotResend: "Send a new code", forgotLoginLabel: "Phone number or email", backToLogin: "Back to log in",
    forgotCodeSentGeneric: "We sent a 6-digit code to the email on your account.",
    forgotSendingTitle: "Sending your code…",
    forgotSendingSub: "This can take up to a minute. Please keep this page open.",
    forgotCheckEmailTitle: "Check your email",
    forgotCheckSpam: "Can't see it? Look in your Spam folder.",
    forgotStep2Desc: "Type the code from the email and choose a new password.",
    dashStreak: "day streak · keep it alive",
    dashExplore: "Explore more",
    heroMessage: "One small step today keeps the streak alive — here's what's next for you.",
    recommendedNextLesson: "Recommended next lesson", lessonWord: "lesson", xpPerCorrect: "XP per correct answer", startLesson: "Start lesson",
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
    openPdfBtn: "Open PDF", openPdfMobileNote: "Preview not loading? Some phone browsers can't show PDFs inline — tap \"Open PDF\" above to view it directly.",
    // Practice
    practiceTitle: "Practice & mock exams",
    practiceDesc: "Pick a subject. Every exercise is auto-corrected with an explanation and the formula to use, and you can mark each one Pending, In progress, or Completed.",
    focusArea: "Focus area", exercisesAutoGraded: "exercises · auto-graded", completedWord: "completed",
    allSubjects: "All subjects", allChapters: "All chapters", chooseChapterDesc: "Choose a chapter to see its exercises.", exercisesWord: "exercises", reviewWord: "Review", solveWord: "Solve",
    formulaQuizHeading: "Formula quiz — start here", formulaQuizHint: "Short questions on this lesson's formulas. Get comfortable with them first, then move on to the practice problems below.", practiceProblemsHeading: "Practice problems",
    status_pending: "Pending", status_in_progress: "In progress", status_completed: "Completed",
    exerciseXofY: "Exercise {i} of {n}",
    typeAnswer: "Type your answer…", checkAnswer: "Check answer",
    whyMissed: "Why do you think you missed this? (optional)", skipWord: "Skip",
    correctXp: "Correct! +30 XP", notQuite: "Not quite", correctAnswerIs: "Correct answer:",
    explanationWord: "Explanation", formulaApproach: "Formula / approach to use",
    recCorrectMore: "Nice, you applied the right method. Keep the momentum and try the next one.",
    recCorrectLast: "Nice, you applied the right method. That's the last exercise in this set!",
    recIncorrect: "Re-read the formula above and how it maps to the question, then tap Try again — you've got this.",
    tryAgain: "Try again", nextExercise: "Next exercise", backToList: "Back to list",
    finishSet: "Finish set", retryChip: "Retry — missed earlier", nextSetBtn: "Continue to the next set",
    recIncorrectQueued: "Not quite — read the explanation above. We'll bring this question back after the rest of the set, so tap Next and keep going.",
    setCompleteTitle: "Set complete!", setNameFormulas: "Formula quiz",
    setCompleteClean: "You got every question right on the first try.",
    setCompleteRetriedOne: "1 question needed another try — and you got it right in the end.",
    setCompleteRetriedMany: "{n} questions needed another try — and you got them all right in the end.",
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
    targetExamYearLabel: "Target exam year", foreignLanguageLabel: "Foreign language exam", dailyStudyTimeLabel: "Daily study time", minutesWord: "minutes",
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
    diagnosticTestWord: "Diagnostic test", questionWord: "Question", sectionWord: "Section",
    // Timed exam attempts
    examStartBtn: "Start timed attempt", examResume: "Resume", examRunningTitle: "Attempt in progress",
    examAlreadyRunning: "You already have an attempt running. Finish or cancel it first.",
    examExpired: "That attempt closed because the time ran out. You can start again.",
    examElapsed: "Time spent", examLeft: "left", examOverBy: "Over the official time by", examOfficialTime: "Official time",
    examFinishBtn: "Finish & submit photo", examCancelBtn: "Cancel attempt", examCancelAsk: "Cancel this attempt? It won't be counted.",
    examCancelYes: "Yes, cancel", examKeepGoing: "Keep going",
    examSubmitTitle: "Submit your work", examSubmitDesc: "Take a clear photo of each page of your answers. Photograph only your answer sheets. The clock keeps running until you press Submit.",
    examTakePhoto: "Take photo", examChoosePhoto: "Choose from gallery", examPreparing: "Preparing photo…", examPhotosCount: "{n} of {max} photos",
    examRemovePhoto: "Remove photo", examSubmitBtn: "Submit and stop the clock", examBackToPaper: "Back to the paper",
    examErr_generic: "Something went wrong. Please try again.", examErr_not_image: "That file is not a photo.", examErr_invalid_photo: "That photo can't be used.",
    examErr_too_big: "That photo is too large.", examErr_too_many_photos: "You can send up to 10 photos.", examErr_no_photos: "Add at least one photo first.",
    examErr_not_running: "This attempt has already ended.",
    examDoneTitle: "Submitted!", examDoneSpent: "You spent", examDonePhotos: "Photos sent", examDoneBack: "Back to exam papers",
    schoolJoinTitle: "Join your school", schoolJoinDesc: "Enter the code your school gave you. Your school will then see your exam times.",
    schoolCodePlaceholder: "School code", schoolJoinBtn: "Join", schoolBadCode: "That code wasn't found. Check it and try again.",
    schoolConfirmTitle: "Join {name}?", schoolSees: "Your school will see: your name, grade and track, how many minutes you spend on each exam paper, and the photos you submit.",
    schoolLeaveAnytime: "You can leave any time. Leaving removes you from the school's report.", schoolConfirmBtn: "Yes, join", notNowWord: "Not now",
    schoolYours: "Your school", schoolLeaveBtn: "Leave school", schoolDemoHint: "Demo: use the code DEMO-001",
    reportTitle: "School report", reportNoSchool: "Join a school first (in Browse exams) to see its report.",
    reportAttempts: "Attempts", reportStudents: "Students", reportAvgMin: "Average minutes", reportPerPaper: "Average minutes per exam paper", reportStudentsWord: "students", reportStudentOne: "student",
    reportEmpty: "No finished attempts yet.", reportStudentCol: "Student", reportGradeCol: "Grade", reportPaperCol: "Paper", reportMinutesCol: "Minutes",
    reportStatusCol: "Status", reportPhotosCol: "Photos", reportStatus_submitted: "Submitted", reportStatus_expired: "Not submitted",
    reportSampleBadge: "Sample", reportSampleNote: "Sample data for demonstration. These are not real students.",
    reportLoadSample: "Load sample class", reportClearSample: "Remove sample class", reportDownloadCsv: "Download spreadsheet", reportViewPhotos: "View", reportClose: "Close",
    howSureWereYou: "How sure were you?", confidentWord: "Confident", guessedWord: "I guessed",
    noFeedbackDuringTest: "No feedback during the test — you'll see your results at the end.",
    diagnosticComplete: "Diagnostic complete!", startingPointIs: "Here's your real starting point — overall level is",
    goToDashboard: "Go to my dashboard",
  },
  km: {
    ...CHEER_STRINGS.km, // the owl's encouraging lines (mascotCheers.js)
    // Welcome
    welcomeHeading: "សូមស្វាគមន៍មកកាន់", welcomeBrand: "BONDUS",
    welcomeSubtitle: "សន្សំសំចៃពេលរក ទទួលបានការសិក្សាកាន់តែច្រើន!",
    createAccount: "បង្កើតគណនី", login: "ចូលគណនី",
    mascotMsg1: "តោះសិក្សាជាមួយគ្នា! 📚", mascotMsg2: "អ្នកអាចធ្វើវាបាន! 💪", mascotMsg3: "ត្រៀមខ្លួនហើយ ពេលណាក៏បាន!",
    mascotMsg4: "រក្សានិន្នាការឱ្យបន្ត! 🔥", mascotMsg5: "ជំហានតូចៗ ជោគជ័យធំ!", mascotMsg6: "ខ្ញុំជឿជាក់លើអ្នក!",
    heroAlt: "ទីទុយ BONDUS ចុះចតយន្តហោះរបស់វានៅលើទូរស័ព្ទ",
    // Shell / nav
    logOut: "ចាកចេញ", streakKeepIt: "សិក្សាថ្ងៃនេះដើម្បីរក្សានិន្នាការ!",
    navPractice: "លំហាត់អនុវត្ត", navUniversities: "សាកលវិទ្យាល័យ", navProgress: "វឌ្ឍនភាព", navExplore: "ស្វែងរក",
    // Dashboard
    dashGreetingPrefix: "សូមស្វាគមន៍,",
    dashStartPlan: "ចាប់ផ្តើមផែនការថ្ងៃនេះ", dashAskCoach: "សួរគ្រូបង្វឹក AI",
    dashTodayPlan: "ផែនការសិក្សាថ្ងៃនេះ", dashDone: "បានធ្វើរួច",
    planEmpty: "មិនទាន់មានកិច្ចការទេ។ បន្ថែមអ្វីដែលអ្នកគ្រោងសិក្សាថ្ងៃនេះ។", planAddPlaceholder: "បន្ថែមកិច្ចការសម្រាប់ថ្ងៃនេះ…",
    planSubjectOptional: "មុខវិជ្ជា (ស្រេចចិត្ត)", planMinutesShort: "នាទី", planAdd: "បន្ថែម", planDeleteTask: "លុបកិច្ចការ",
    planSuggested: "ណែនាំសម្រាប់អ្នក", planMyTask: "កិច្ចការរបស់ខ្ញុំ",
    errInvalidCredentials: "លេខទូរស័ព្ទ អ៊ីមែល ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវ។",
    errEnterPhonePassword: "សូមបញ្ចូលលេខទូរស័ព្ទ និងពាក្យសម្ងាត់របស់អ្នក។",
    errPhoneTaken: "លេខទូរស័ព្ទនេះមានគណនីរួចហើយ។ សូមព្យាយាមចូលគណនីជំនួសវិញ។",
    errEmailTaken: "អ៊ីមែលនេះមានគណនីរួចហើយ។ សូមព្យាយាមចូលគណនីជំនួសវិញ។",
    errValidation: "សូមពិនិត្យព័ត៌មានដែលអ្នកបានបញ្ចូល រួចព្យាយាមម្តងទៀត។",
    errTooMany: "ព្យាយាមច្រើនដងពេក។ សូមរង់ចាំបន្តិច រួចព្យាយាមម្តងទៀត។",
    errTooManyWait: "ព្យាយាមច្រើនដងពេក។ សូមរង់ចាំ {time} រួចព្យាយាមម្តងទៀត។",
    errNetwork: "មិនអាចភ្ជាប់ទៅម៉ាស៊ីនមេបានទេ។ សូមពិនិត្យអ៊ីនធឺណិតរបស់អ្នក រួចព្យាយាមម្តងទៀត។",
    errServer: "មានបញ្ហាកើតឡើងនៅខាងយើង។ សូមព្យាយាមម្តងទៀតក្នុងពេលបន្តិចទៀត។",
    errSession: "សម័យរបស់អ្នកបានផុតកំណត់។ សូមចូលគណនីម្តងទៀត។",
    errInvalidCode: "លេខកូដមិនត្រឹមត្រូវ ឬបានផុតកំណត់។",
    errNoEmail: "យើងរកមិនឃើញគណនីដែលមានអ៊ីមែលសម្រាប់លេខទូរស័ព្ទ ឬអ៊ីមែលនេះទេ ដូច្នេះមិនបានផ្ញើលេខកូដឡើយ។ សូមពិនិត្យអ្វីដែលអ្នកបានវាយ។ គណនីដែលបង្កើតដោយគ្មានអ៊ីមែលមិនអាចកំណត់ពាក្យសម្ងាត់ឡើងវិញបានទេ។",
    errEmailFailed: "យើងមិនអាចផ្ញើអ៊ីមែលបានទេនៅពេលនេះ។ សូមព្យាយាមម្តងទៀតក្នុងពេលបន្តិចទៀត។",
    errPlanLimit: "អ្នកបានដល់ចំនួនកិច្ចការអតិបរមាសម្រាប់ថ្ងៃនេះហើយ។",
    errPlanSave: "មិនអាចរក្សាទុកកិច្ចការនោះបានទេ។ សូមព្យាយាមម្តងទៀត។",
    errSaveProgress: "យើងមិនអាចរក្សាទុកវឌ្ឍនភាពរបស់អ្នកបានទេ។ សូមព្យាយាមម្តងទៀតពេលក្រោយ។",
    errPasswordShort: "ពាក្យសម្ងាត់ត្រូវមានយ៉ាងហោចណាស់ ៨តួអក្សរ។",
    retryWord: "ព្យាយាមម្តងទៀត",
    passwordHint: "យ៉ាងហោចណាស់ ៨តួអក្សរ",
    emailResetHint: "បន្ថែមអ៊ីមែល ដើម្បីអាចកំណត់ពាក្យសម្ងាត់ឡើងវិញ ប្រសិនបើអ្នកភ្លេច។",
    forgotLink: "ភ្លេចពាក្យសម្ងាត់?", forgotTitle: "កំណត់ពាក្យសម្ងាត់ឡើងវិញ",
    forgotDesc: "បញ្ចូលលេខទូរស័ព្ទ ឬអ៊ីមែលរបស់អ្នក។ យើងនឹងផ្ញើលេខកូដ ៦ខ្ទង់ទៅអ៊ីមែលនៅលើគណនីរបស់អ្នក។",
    forgotSendCode: "ផ្ញើលេខកូដ", forgotCodeSent: "យើងបានផ្ញើលេខកូដ ៦ខ្ទង់ទៅ", forgotCodeExpires: "លេខកូដនឹងផុតកំណត់ក្នុងរយៈពេល ១៥នាទី។",
    forgotCodeLabel: "លេខកូដ ៦ខ្ទង់", forgotNewPasswordLabel: "ពាក្យសម្ងាត់ថ្មី", forgotResetBtn: "កំណត់ពាក្យសម្ងាត់ឡើងវិញ",
    forgotResend: "ផ្ញើលេខកូដថ្មី", forgotLoginLabel: "លេខទូរស័ព្ទ ឬអ៊ីមែល", backToLogin: "ត្រឡប់ទៅចូលគណនី",
    forgotCodeSentGeneric: "យើងបានផ្ញើលេខកូដ ៦ខ្ទង់ទៅអ៊ីមែលនៅលើគណនីរបស់អ្នក។",
    forgotSendingTitle: "កំពុងផ្ញើលេខកូដរបស់អ្នក…",
    forgotSendingSub: "អាចចំណាយពេលរហូតដល់មួយនាទី។ សូមកុំបិទទំព័រនេះ។",
    forgotCheckEmailTitle: "សូមពិនិត្យអ៊ីមែលរបស់អ្នក",
    forgotCheckSpam: "រកមិនឃើញមែនទេ? សូមមើលក្នុងថត Spam។",
    forgotStep2Desc: "វាយលេខកូដពីអ៊ីមែល ហើយជ្រើសរើសពាក្យសម្ងាត់ថ្មី។",
    dashStreak: "ថ្ងៃជាប់គ្នា · បន្តរក្សា",
    dashExplore: "ស្វែងយល់បន្ថែម",
    heroMessage: "ជំហានតូចមួយថ្ងៃនេះជួយរក្សានិន្នាការឲ្យបន្ត។ នេះជាអ្វីដែលបន្ទាប់សម្រាប់អ្នក។",
    recommendedNextLesson: "មេរៀនបន្ទាប់ដែលបានណែនាំ", lessonWord: "មេរៀន", xpPerCorrect: "XP ក្នុងមួយចម្លើយត្រឹមត្រូវ", startLesson: "ចាប់ផ្តើមមេរៀន",
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
    openPdfBtn: "បើកឯកសារ PDF", openPdfMobileNote: "មើលមិនឃើញមែនទេ? កម្មវិធីរុករកទូរស័ព្ទខ្លះមិនអាចបង្ហាញ PDF ដោយផ្ទាល់បានទេ សូមចុច \"បើកឯកសារ PDF\" ខាងលើ ដើម្បីមើលវាដោយផ្ទាល់។",
    // Practice
    practiceTitle: "លំហាត់អនុវត្ត និងតេស្តសាកល្បង",
    practiceDesc: "ជ្រើសរើសមុខវិជ្ជាមួយ។ លំហាត់នីមួយៗត្រូវបានកែដោយស្វ័យប្រវត្តិជាមួយការពន្យល់ និងរូបមន្តត្រូវប្រើ ហើយអ្នកអាចសម្គាល់វាថា កំពុងរង់ចាំ កំពុងធ្វើ ឬបានបញ្ចប់។",
    focusArea: "ផ្នែកត្រូវផ្តោត", exercisesAutoGraded: "លំហាត់ · ដាក់ពិន្ទុស្វ័យប្រវត្តិ", completedWord: "បានបញ្ចប់",
    allSubjects: "មុខវិជ្ជាទាំងអស់", allChapters: "ជំពូកទាំងអស់", chooseChapterDesc: "ជ្រើសរើសជំពូកមួយ ដើម្បីមើលលំហាត់របស់វា។", exercisesWord: "លំហាត់", reviewWord: "ពិនិត្យឡើងវិញ", solveWord: "ដោះស្រាយ",
    formulaQuizHeading: "កម្រងសំណួររូបមន្ត — ចាប់ផ្តើមពីទីនេះ", formulaQuizHint: "សំណួរខ្លីៗអំពីរូបមន្តនៃមេរៀននេះ។ ហាត់ឱ្យចេះច្បាស់សិន រួចទើបបន្តទៅលំហាត់អនុវត្តខាងក្រោម។", practiceProblemsHeading: "លំហាត់អនុវត្ត",
    status_pending: "កំពុងរង់ចាំ", status_in_progress: "កំពុងធ្វើ", status_completed: "បានបញ្ចប់",
    exerciseXofY: "លំហាត់ {i} នៃ {n}",
    typeAnswer: "វាយចម្លើយរបស់អ្នក…", checkAnswer: "ពិនិត្យចម្លើយ",
    whyMissed: "ហេតុអ្វីអ្នកគិតថាខកខានចម្លើយនេះ? (ស្រេចចិត្ត)", skipWord: "រំលង",
    correctXp: "ត្រឹមត្រូវ! +30 XP", notQuite: "មិនទាន់ត្រឹមត្រូវ", correctAnswerIs: "ចម្លើយត្រឹមត្រូវ៖",
    explanationWord: "ការពន្យល់", formulaApproach: "រូបមន្ត / វិធីសាស្ត្រត្រូវប្រើ",
    recCorrectMore: "ល្អណាស់ — អ្នកបានប្រើវិធីត្រឹមត្រូវ។ បន្តល្បឿននេះ ហើយសាកល្បងលំហាត់បន្ទាប់។",
    recCorrectLast: "ល្អណាស់ — អ្នកបានប្រើវិធីត្រឹមត្រូវ។ នេះជាលំហាត់ចុងក្រោយក្នុងសំណុំនេះ!",
    recIncorrect: "អានរូបមន្តខាងលើម្តងទៀត និងរបៀបភ្ជាប់ជាមួយសំណួរ បន្ទាប់មកចុចសាកល្បងម្តងទៀត — អ្នកអាចធ្វើបាន។",
    tryAgain: "សាកល្បងម្តងទៀត", nextExercise: "លំហាត់បន្ទាប់", backToList: "ត្រឡប់ទៅបញ្ជី",
    finishSet: "បញ្ចប់សំណុំនេះ", retryChip: "សាកល្បងម្តងទៀត — ខុសពីមុន", nextSetBtn: "បន្តទៅសំណុំបន្ទាប់",
    recIncorrectQueued: "មិនទាន់ត្រូវទេ — សូមអានការពន្យល់ខាងលើ។ យើងនឹងយកសំណួរនេះមកសួរម្តងទៀតបន្ទាប់ពីសំណួរផ្សេងទៀតក្នុងសំណុំនេះ ដូច្នេះសូមចុចបន្ទាប់ ហើយបន្តទៅមុខ។",
    setCompleteTitle: "បានបញ្ចប់សំណុំនេះហើយ!", setNameFormulas: "កម្រងសំណួររូបមន្ត",
    setCompleteClean: "អ្នកឆ្លើយត្រូវគ្រប់សំណួរតាំងពីលើកដំបូង។",
    setCompleteRetriedOne: "មាន 1 សំណួរដែលត្រូវសាកល្បងម្តងទៀត — ហើយទីបំផុតអ្នកឆ្លើយត្រូវ។",
    setCompleteRetriedMany: "មាន {n} សំណួរដែលត្រូវសាកល្បងម្តងទៀត — ហើយទីបំផុតអ្នកឆ្លើយត្រូវទាំងអស់។",
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
    targetExamYearLabel: "ឆ្នាំប្រឡងគោលដៅ", foreignLanguageLabel: "ភាសាបរទេសដែលប្រឡង", dailyStudyTimeLabel: "ពេលវេលាសិក្សាប្រចាំថ្ងៃ", minutesWord: "នាទី",
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
    diagnosticTestWord: "តេស្តវាយតម្លៃ", questionWord: "សំណួរ", sectionWord: "ផ្នែក",
    // Timed exam attempts
    examStartBtn: "ចាប់ផ្តើមធ្វើជាមួយនាឡិកា", examResume: "បន្តធ្វើ", examRunningTitle: "កំពុងធ្វើវិញ្ញាសា",
    examAlreadyRunning: "អ្នកមានវិញ្ញាសាកំពុងធ្វើរួចហើយ។ សូមបញ្ចប់ ឬបោះបង់វាជាមុនសិន។",
    examExpired: "វិញ្ញាសានោះបានបិទដោយសារអស់ម៉ោង។ អ្នកអាចចាប់ផ្តើមម្តងទៀតបាន។",
    examElapsed: "ពេលវេលាដែលបានប្រើ", examLeft: "នៅសល់", examOverBy: "លើសម៉ោងផ្លូវការ", examOfficialTime: "ម៉ោងផ្លូវការ",
    examFinishBtn: "បញ្ចប់ និងផ្ញើរូបថត", examCancelBtn: "បោះបង់ការធ្វើ", examCancelAsk: "បោះបង់ការធ្វើនេះ? វានឹងមិនត្រូវបានរាប់ទេ។",
    examCancelYes: "បាទ/ចាស បោះបង់", examKeepGoing: "បន្តទៀត",
    examSubmitTitle: "ផ្ញើការងាររបស់អ្នក", examSubmitDesc: "ថតរូបឱ្យច្បាស់នៃទំព័រចម្លើយនីមួយៗ។ ថតតែក្រដាសចម្លើយរបស់អ្នកប៉ុណ្ណោះ។ នាឡិកានៅតែដើររហូតដល់អ្នកចុចផ្ញើ។",
    examTakePhoto: "ថតរូប", examChoosePhoto: "ជ្រើសរើសពីអាល់ប៊ុម", examPreparing: "កំពុងរៀបចំរូបថត…", examPhotosCount: "រូបថត {n} ក្នុងចំណោម {max}",
    examRemovePhoto: "លុបរូបថត", examSubmitBtn: "ផ្ញើ ហើយបញ្ឈប់នាឡិកា", examBackToPaper: "ត្រឡប់ទៅវិញ្ញាសា",
    examErr_generic: "មានបញ្ហាកើតឡើង។ សូមព្យាយាមម្តងទៀត។", examErr_not_image: "ឯកសារនោះមិនមែនជារូបថតទេ។", examErr_invalid_photo: "រូបថតនោះមិនអាចប្រើបានទេ។",
    examErr_too_big: "រូបថតនោះធំពេក។", examErr_too_many_photos: "អ្នកអាចផ្ញើរូបថតបានអតិបរមា ១០ រូប។", examErr_no_photos: "សូមបន្ថែមរូបថតយ៉ាងហោចណាស់មួយជាមុនសិន។",
    examErr_not_running: "ការធ្វើនេះបានបញ្ចប់រួចហើយ។",
    examDoneTitle: "បានផ្ញើរួចហើយ!", examDoneSpent: "អ្នកបានប្រើពេល", examDonePhotos: "រូបថតដែលបានផ្ញើ", examDoneBack: "ត្រឡប់ទៅវិញ្ញាសា",
    schoolJoinTitle: "ចូលរួមជាមួយសាលារបស់អ្នក", schoolJoinDesc: "បញ្ចូលកូដដែលសាលាបានផ្តល់ឱ្យអ្នក។ បន្ទាប់មកសាលានឹងឃើញពេលវេលាដែលអ្នកប្រើក្នុងការធ្វើវិញ្ញាសា។",
    schoolCodePlaceholder: "កូដសាលា", schoolJoinBtn: "ចូលរួម", schoolBadCode: "រកមិនឃើញកូដនោះទេ។ សូមពិនិត្យ ហើយព្យាយាមម្តងទៀត។",
    schoolConfirmTitle: "ចូលរួមជាមួយ {name}?", schoolSees: "សាលារបស់អ្នកនឹងឃើញ៖ ឈ្មោះ ថ្នាក់ និងផ្នែករបស់អ្នក ចំនួននាទីដែលអ្នកប្រើលើវិញ្ញាសានីមួយៗ និងរូបថតដែលអ្នកផ្ញើ។",
    schoolLeaveAnytime: "អ្នកអាចចាកចេញបានគ្រប់ពេល។ ការចាកចេញនឹងដកអ្នកចេញពីរបាយការណ៍របស់សាលា។", schoolConfirmBtn: "បាទ/ចាស ចូលរួម", notNowWord: "កុំទាន់",
    schoolYours: "សាលារបស់អ្នក", schoolLeaveBtn: "ចាកចេញពីសាលា", schoolDemoHint: "សាកល្បង៖ ប្រើកូដ DEMO-001",
    reportTitle: "របាយការណ៍សាលា", reportNoSchool: "សូមចូលរួមជាមួយសាលាជាមុនសិន (នៅក្នុងរកមើលកម្រងសំណួរ) ដើម្បីមើលរបាយការណ៍របស់វា។",
    reportAttempts: "ចំនួនដែលបានធ្វើ", reportStudents: "សិស្ស", reportAvgMin: "នាទីជាមធ្យម", reportPerPaper: "នាទីជាមធ្យមក្នុងមួយវិញ្ញាសា", reportStudentsWord: "សិស្ស", reportStudentOne: "សិស្ស",
    reportEmpty: "មិនទាន់មានការធ្វើដែលបានបញ្ចប់នៅឡើយទេ។", reportStudentCol: "សិស្ស", reportGradeCol: "ថ្នាក់", reportPaperCol: "វិញ្ញាសា", reportMinutesCol: "នាទី",
    reportStatusCol: "ស្ថានភាព", reportPhotosCol: "រូបថត", reportStatus_submitted: "បានផ្ញើ", reportStatus_expired: "មិនបានផ្ញើ",
    reportSampleBadge: "គំរូ", reportSampleNote: "ទិន្នន័យគំរូសម្រាប់បង្ហាញប៉ុណ្ណោះ។ ទាំងនេះមិនមែនជាសិស្សពិតប្រាកដទេ។",
    reportLoadSample: "បង្ហាញថ្នាក់គំរូ", reportClearSample: "លុបថ្នាក់គំរូ", reportDownloadCsv: "ទាញយកតារាង", reportViewPhotos: "មើល", reportClose: "បិទ",
    howSureWereYou: "តើអ្នកប្រាកដប៉ុណ្ណា?", confidentWord: "ជឿជាក់", guessedWord: "ខ្ញុំទាយ",
    noFeedbackDuringTest: "គ្មានមតិកែលម្អកំឡុងពេលធ្វើតេស្តទេ — អ្នកនឹងឃើញលទ្ធផលនៅចុងក្រោយ។",
    diagnosticComplete: "តេស្តវាយតម្លៃបានបញ្ចប់!", startingPointIs: "នេះជាចំណុចចាប់ផ្តើមពិតរបស់អ្នក — កម្រិតទាំងមូលគឺ",
    goToDashboard: "ទៅកាន់ផ្ទាំងគ្រប់គ្រងរបស់ខ្ញុំ",
  },
};
const t = (lang, key) => STRINGS[lang]?.[key] ?? STRINGS.en[key] ?? key;
// "48 minutes", "1 hour 5 minutes" (English) / the same in Khmer digits and words.
const formatWait = (lang, seconds) => {
  const w = waitParts(seconds);
  if (!w) return "";
  const km = lang === "km";
  const hours = w.hours ? (km ? `${localizeNum(w.hours, lang)} ម៉ោង` : `${w.hours} ${w.hours === 1 ? "hour" : "hours"}`) : "";
  const minutes = w.minutes ? (km ? `${localizeNum(w.minutes, lang)} នាទី` : `${w.minutes} ${w.minutes === 1 ? "minute" : "minutes"}`) : "";
  return [hours, minutes].filter(Boolean).join(" ");
};
// A backend error code -> English/Khmer message. For "too many tries" it says how long to wait when the server told us.
const apiErrorText = (lang, code, retryAfter) =>
  code === "too_many_requests" && waitParts(retryAfter)
    ? t(lang, "errTooManyWait").replace("{time}", formatWait(lang, retryAfter))
    : t(lang, apiErrorKey(code));

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

/* A short message in the corner (a failed save, an expired session). `text` is already translated. */
function NoticeToast({ text, onClose }) {
  return (
    <AnimatePresence>
      {text && (
        <motion.button type="button" onClick={onClose} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }}
          className="eai-card flex items-center gap-2.5 px-4 py-2.5 text-left"
          style={{ position: "fixed", top: 72, right: 16, zIndex: 60, boxShadow: "var(--shadow)", borderColor: "var(--ember)", maxWidth: "min(92vw, 380px)" }}>
          <AlertTriangle size={16} style={{ color: "var(--ember)", flexShrink: 0 }} />
          <span className="text-sm font-semibold">{text}</span>
        </motion.button>
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
  const [retaking, setRetaking] = useState(false); // true while completing the diagnostic later — no entry point right now: the Dashboard banner that set it was removed
  const [topicMastery, setTopicMastery] = useState(saved?.topicMastery ?? {}); // { [subject]: { [topic]: { history, score, lastPracticedAt } } }
  const [uniTopicMastery, setUniTopicMastery] = useState(saved?.uniTopicMastery ?? {}); // same shape as topicMastery, keyed by "{major}::{courseTitle}" subjects — see deriveUniInsights
  const [tab, setTab] = useState(saved?.profile?.educationLevel === "university" ? "universityHub" : "dashboard");
  const [dark, setDark] = useState(false);
  const [lang, setLang] = useState("en"); // "en" | "km" — UI language, independent of theme
  const [open, setOpen] = useState(false);
  const [practice, setPractice] = useState(saved?.practice ?? {}); // { [exId]: { status, result, at, subject, topic, xpAwarded } }
  const [uniPractice, setUniPractice] = useState(saved?.uniPractice ?? {}); // same shape as practice, university-track quiz attempts (exercise ids prefixed "uni:" so they never collide with practice's ids)
  const [uniPracticeTarget, setUniPracticeTarget] = useState(null); // course id to deep-link straight into when the Hub links to a specific course — consumed once by UniversityPractice
  const [plan, setPlan] = useState(saved?.plan ?? []);
  const [bonusXp, setBonusXp] = useState(saved?.bonusXp ?? 0);
  const [rewards, setRewards] = useState(() => (saved?.rewards ? sanitizeRewards(saved.rewards) : emptyRewards())); // treasure-box rewards: { claimedSets, owned, outfit } — see rewards/rewardLogic.js
  const [langResults, setLangResults] = useState(saved?.langResults ?? {}); // { [languageName]: { listening, reading, writing, speaking, overall, feedback, completedAt } }
  const [takingLangTest, setTakingLangTest] = useState(null); // language name currently being tested, or null
  // ── Server mode (VITE_API_URL set): the account, progress, XP, streak and plan live on the Laravel backend ──
  const [booting, setBooting] = useState(SERVER_MODE && api.hasToken()); // restoring a saved login
  const [bootError, setBootError] = useState(false);  // the saved login could not be restored because the server was unreachable or busy (holds the error)
  const [summary, setSummary] = useState(null);       // GET /me/summary: { xp, level, xpToNext, streak, longestStreak, studiedToday, todayMinutes, weekHours }
  const [notice, setNotice] = useState(null);         // a STRINGS key shown as a toast (a failed save, an expired session)
  const hydratedRef = useRef(false);                  // true once the account is loaded; progress is only saved after that
  const serverUserRef = useRef(null);                 // the account created during sign-up, before the dashboard exists
  const lastSavedRef = useRef("");                    // JSON of the progress the server already has, so loading never triggers a save
  const prevLevelRef = useRef(null);
  const planOps = useRef(Promise.resolve());          // plan changes are sent one at a time, in order
  const planBusy = useRef(0);
  const planIdMap = useRef(new Map());                // temporary id (task not saved yet) -> server id
  const saverRef = useRef(null);
  const queueRef = useRef(null);
  const go = (t) => { setTab(t); setOpen(false); };

  // Returning user (a profile already existed in localStorage) — briefly greet them, then fade out.
  useEffect(() => {
    if (!showWelcomeBack) return;
    const t = setTimeout(() => setShowWelcomeBack(false), 2600);
    return () => clearTimeout(t);
  }, [showWelcomeBack]);

  // Browser-only prototype (no VITE_API_URL): persist everything so progress survives a page refresh.
  useEffect(() => {
    if (SERVER_MODE || !profile) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ profile, topicMastery, uniTopicMastery, practice, uniPractice, plan, bonusXp, langResults, rewards }));
  }, [profile, topicMastery, uniTopicMastery, practice, uniPractice, plan, bonusXp, langResults, rewards]);

  // Forget everything about the signed-in student (state, saved-but-unsent work stays in storage under their id).
  const resetSession = () => {
    hydratedRef.current = false;
    saverRef.current?.cancel(); queueRef.current?.setUser(null);
    serverUserRef.current = null; planIdMap.current = new Map(); lastSavedRef.current = ""; prevLevelRef.current = null;
    setSummary(null);
    setProfile(null); setPendingReg(null); setResumeReg(null); setShowDiagnostic(false); setRetaking(false);
    setTopicMastery({}); setUniTopicMastery({}); setPractice({}); setUniPractice({}); setPlan([]); setBonusXp(0); setRewards(emptyRewards()); setLangResults({}); setTab("dashboard");
  };
  // Without a server, logging out deliberately leaves localStorage alone (see loadSaved); with one, the token is revoked.
  const handleLogout = () => { if (SERVER_MODE) api.logout(); resetSession(); setBootError(false); setBooting(false); setEntry("welcome"); };
  // The back arrow on the "Can't reach the server" screen: give up on the saved login and go to the login screen.
  const leaveSavedLogin = () => { handleLogout(); setEntry("login"); };

  // With the server: signs in with phone-or-email + password, then loads the account. Without it: matches either a phone
  // number or an email+password against whatever is saved in this browser. Resolves to true, or to { error } (a server
  // error code) / false so the Login screen can show a message inline instead of failing silently.
  const handleLogin = async ({ phone, email, password } = {}) => {
    if (SERVER_MODE) {
      try {
        await api.login({ login: (phone ?? email ?? "").trim(), password });
        await loadAccount();
        setShowWelcomeBack(true);
        return true;
      } catch (err) {
        return { error: err?.code ?? "server_error", retryAfter: err?.retryAfter ?? null };
      }
    }
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
    setRewards(sanitizeRewards(data.rewards));
    setShowWelcomeBack(true);
    setTab(data.profile.educationLevel === "university" ? "universityHub" : "dashboard");
    return true;
  };
  // After "Forgot password": the reset already stored a fresh login, so just load the account.
  const handleSignedIn = async () => {
    try { await loadAccount(); setShowWelcomeBack(true); return true; }
    catch (err) { return { error: err?.code ?? "server_error", retryAfter: err?.retryAfter ?? null }; }
  };

  // Registration collects answers, then the student chooses to take the diagnostic now or explore
  // first — self-reports alone aren't trusted, but personalization is never required to start.
  // University profiles skip AssessmentChoice/Diagnostic entirely — there's no BAC II mastery
  // engine for them, so the account activates immediately into the University Hub.
  // With the server the account is created here (so "phone already used" shows up on the sign-up screen, not after the
  // whole flow); the dashboard appears once the diagnostic is done or skipped. Resolves to { error, step } on failure.
  const handleRegister = async (reg) => {
    if (reg.educationLevel === "university") {
      // Register's form keeps these as flat fields (universityGoals/Major/Year); nest them into
      // universityProfile here so UniversityHub, the University Mentor Coach mode and
      // deriveInsights only ever have one shape to read from.
      const { universityGoals, universityMajor, universityYear, ...rest } = reg;
      const built = buildProfile({ ...rest, universityProfile: { goals: universityGoals, major: universityMajor, year: universityYear } });
      setProfile({ ...built, hasCompletedDiagnostic: false, isPersonalized: false, bannerDismissed: false });
      setTab("universityHub");
      return null;
    }
    if (SERVER_MODE) {
      try {
        if (serverUserRef.current && api.hasToken()) {
          // They went Back from the assessment screen and changed something: update the account created a moment ago.
          serverUserRef.current = (await api.patchMe(registrationToPatch(reg))).user;
        } else {
          serverUserRef.current = (await api.register(registrationToPayload(reg))).user;
        }
      } catch (err) {
        return { error: err?.code ?? "server_error", step: registrationErrorStep(err), retryAfter: err?.retryAfter ?? null };
      }
    }
    // A track with no diagnostic (Social Science) has no assessment screen to show: straight to the dashboard.
    if (!hasDiagnostic(reg.field)) return enterDashboard(reg);
    setPendingReg(reg); setResumeReg(null);
    return null;
  };
  // "Back" from the step-4 AssessmentChoice screen — re-opens Register at step 3 with prior answers intact.
  const handleBackToPreferences = () => { setResumeReg({ form: pendingReg, step: 3 }); setPendingReg(null); };
  const handleDiagnosticComplete = async (diagnosticMastery) => {
    if (SERVER_MODE) {
      try {
        await api.patchMe({ hasCompletedDiagnostic: true, isPersonalized: true });
        const current = await api.getState();
        await api.putState(stateToSave({ topicMastery: diagnosticMastery }), current?.revision ?? 0);
        await loadAccount();
        sendStudy(diagnosticEvent()); // finishing the diagnostic counts as studying today (it starts the streak)
        setPendingReg(null);
        setShowDiagnostic(false);
      } catch (err) {
        flash(apiErrorKey(err?.code)); // stay on the results screen so "Done" can be pressed again
      }
      return;
    }
    const built = buildProfile(pendingReg);
    setTopicMastery(diagnosticMastery);
    setProfile({ ...built, hasCompletedDiagnostic: true, isPersonalized: true, bannerDismissed: false });
    setPlan([]); // each student writes their own plan; the generated tasks are only offered as suggestions
    setPendingReg(null);
    setShowDiagnostic(false);
  };
  // Straight to an unpersonalized dashboard with no assessment: "Explore first", or a track that has none (Social Science).
  // With the server the account already exists, so this only loads it. Resolves to { error, retryAfter } when that fails,
  // so the caller can say so.
  const enterDashboard = async (reg) => {
    if (SERVER_MODE) {
      try { await loadAccount(); setPendingReg(null); return null; }
      catch (err) { return { error: err?.code ?? "server_error", retryAfter: err?.retryAfter ?? null }; }
    }
    const built = buildProfile(reg);
    setTopicMastery({});
    setProfile({ ...built, hasCompletedDiagnostic: false, isPersonalized: false, bannerDismissed: false });
    setPlan([]); // each student writes their own plan; the generated tasks are only offered as suggestions
    setPendingReg(null);
    return null;
  };
  // "Explore First" — skip the diagnostic and go straight to an unpersonalized dashboard.
  const handleSkipDiagnostic = async () => { const res = await enterDashboard(pendingReg); if (res) flash(apiErrorKey(res.error)); };
  // Completing the diagnostic later, from the Dashboard banner — updates the existing profile
  // in place instead of building a fresh one.
  const handleLaterDiagnosticComplete = (diagnosticMastery) => {
    const updated = { ...profile, hasCompletedDiagnostic: true, isPersonalized: true, bannerDismissed: true };
    setTopicMastery(diagnosticMastery);
    setProfile(updated);
    setPlan([]); // each student writes their own plan; the generated tasks are only offered as suggestions
    setRetaking(false);
  };

  // Real day-streak and weekly study time, computed from actual answered-question timestamps
  // (both tracks) — not static profile fields, so they're 0 until a student actually earns them.
  const streakStats = useMemo(() => computeStreakStats(topicMastery, uniTopicMastery), [topicMastery, uniTopicMastery]);
  // With the server, streak and weekly hours come from its study ledger (days counted in Phnom Penh time), not from this browser.
  const liveStreak = summary ? summary.streak : streakStats.streak;
  const liveLongestStreak = summary ? summary.longestStreak : streakStats.longestStreak;
  // Timed exam attempts and the school report (kept per student on this device until the backend part exists).
  const exam = useExamSessions({
    userKey: profile ? `${profile.phone ?? ""}|${profile.name}` : "anon",
    limitFor: (field, subject) => SUBJECT_DURATION_MIN[field]?.[subject] ?? 180,
  });
  const tr = (key) => t(lang, key);
  const showSchoolReport = !SERVER_MODE;
  const weeklyStudyHours = useMemo(() => (summary ? summary.weekHours : buildWeeklyStudyHours(topicMastery, uniTopicMastery)), [summary, topicMastery, uniTopicMastery]);

  // Live insights recompute from topicMastery on every change — this is what makes weak/strong
  // subjects, the recommended lesson, and exam readiness actually update as the student practices.
  const insights = useMemo(() => (profile ? deriveInsights(profile, topicMastery, liveStreak) : null), [profile, topicMastery, liveStreak]);
  const uniInsights = useMemo(
    () => (profile?.educationLevel === "university" ? deriveUniInsights(profile, uniTopicMastery) : null),
    [profile, uniTopicMastery]
  );
  const p = useMemo(
    () => (profile ? { ...profile, ...insights, streak: liveStreak, longestStreak: liveLongestStreak, universityInsights: uniInsights } : null),
    [profile, insights, uniInsights, liveStreak, liveLongestStreak]
  );

  // Level up whenever XP crosses the next threshold (can chain multiple levels from one big award).
  useEffect(() => {
    if (!profile) return;
    const totalXp = profile.xp + bonusXp;
    if (totalXp >= profile.xpToNext) {
      setProfile((cur) => {
        const next = advanceLevel({ level: cur.level, xpToNext: cur.xpToNext }, cur.xp + bonusXp);
        setLevelUpToast(next.level);
        return { ...cur, ...next };
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

  // ── Server mode plumbing ──────────────────────────────────────────────────────────────────────────────
  const flash = (key) => setNotice(key); // `key` is a STRINGS key, so the message follows the language toggle
  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(null), 4500);
    return () => clearTimeout(timer);
  }, [notice]);

  // The server's numbers replace whatever the screen guessed. A level gained by an answer shows the level-up toast.
  const applySummary = (sm, { announce = true } = {}) => {
    setSummary(sm);
    setProfile((cur) => (cur ? { ...cur, level: sm.level, xp: sm.xp, xpToNext: sm.xpToNext } : cur));
    if (announce && prevLevelRef.current != null && sm.level > prevLevelRef.current) setLevelUpToast(sm.level);
    prevLevelRef.current = sm.level;
  };
  if (!saverRef.current) saverRef.current = createStateSaver({ api, onError: () => flash("errSaveProgress") });
  if (!queueRef.current) {
    // XP shown right after an answer is a guess (bonusXp); once the server confirms (or rejects) the event, the guess is
    // taken back out and the server's own total is shown.
    const refund = (ev) => { if (ev._award) setBonusXp((x) => Math.max(0, x - ev._award)); };
    queueRef.current = createEventQueue({
      send: ({ _award, ...body }) => api.postStudyEvent(body),
      storage: safeStorage(),
      onApplied: (ev, res) => { applySummary(res.summary); refund(ev); },
      onDropped: refund,
    });
  }
  const sendStudy = (event, award = 0) => { if (SERVER_MODE && event) queueRef.current.push({ ...event, _award: award }); };

  // Fetch the account, progress, XP summary and today's plan from the server and show them. Throws an ApiError on failure.
  const loadAccount = async () => {
    const [me, st, sm, pl] = await Promise.all([api.getMe(), api.getState(), api.getSummary(), api.getPlan(dateKey())]);
    const saved = stateToSave(st?.state && typeof st.state === "object" ? st.state : {});
    const wardrobe = sanitizeRewards(saved.rewards);
    saverRef.current.cancel();
    saverRef.current.setRevision(st?.revision ?? 0);
    lastSavedRef.current = JSON.stringify(stateToSave({ ...saved, rewards: wardrobe }));
    planIdMap.current = new Map();
    queueRef.current.setUser(me.user.id);
    setProfile(userToProfile(me.user, sm));
    setTopicMastery(saved.topicMastery); setUniTopicMastery(saved.uniTopicMastery);
    setPractice(saved.practice); setUniPractice(saved.uniPractice);
    setLangResults(saved.langResults); setRewards(wardrobe);
    setPlan((pl?.tasks ?? []).map(taskFromServer));
    setBonusXp(0);
    applySummary(sm, { announce: false });
    hydratedRef.current = true;
    setTab(me.user.educationLevel === "university" ? "universityHub" : "dashboard");
    queueRef.current.flush(); // anything left unsent from last time
    return me.user;
  };
  // Restore the saved login when the page opens (or retry after the server could not be reached).
  const bootAccount = () => {
    setBootError(false); setBooting(true);
    return loadAccount()
      .then(() => setShowWelcomeBack(true))
      .catch((err) => {
        // Server down (0), slow (408), busy (429) or broken (5xx): the saved login is probably still good, so keep it and offer "Try again".
        if (err?.status === 0 || err?.status === 408 || err?.status === 429 || err?.status >= 500) setBootError(err);
        else api.clearToken();
      })
      .finally(() => setBooting(false));
  };
  useEffect(() => {
    if (SERVER_MODE && api.hasToken()) bootAccount();
  }, []);
  // The token was rejected (expired or revoked): back to the login screen with a short explanation.
  useEffect(() => {
    api.onUnauthorized(() => { resetSession(); setEntry("login"); flash("errSession"); });
  }, []);

  // Save progress to the server a moment after the last change (never right after loading it).
  useEffect(() => {
    if (!SERVER_MODE || !hydratedRef.current) return;
    const state = stateToSave({ topicMastery, uniTopicMastery, practice, uniPractice, langResults, rewards });
    const json = JSON.stringify(state);
    if (json === lastSavedRef.current) return;
    lastSavedRef.current = json;
    saverRef.current.schedule(state);
  }, [topicMastery, uniTopicMastery, practice, uniPractice, langResults, rewards]);

  // Keep the screen in step with the server: a day that rolled over, XP earned on another device, events left unsent.
  const refreshLive = async () => {
    try {
      const [sm, pl] = await Promise.all([api.getSummary(), planBusy.current === 0 ? api.getPlan(dateKey()) : Promise.resolve(null)]);
      applySummary(sm, { announce: false });
      if (pl) { const day = pl.date ?? dateKey(); setPlan((arr) => [...arr.filter((x) => x.date !== day), ...(pl.tasks ?? []).map(taskFromServer)]); }
    } catch { /* offline: keep what is on screen */ }
  };
  useEffect(() => {
    if (!SERVER_MODE) return undefined;
    const onVisibility = () => {
      if (!hydratedRef.current) return;
      if (document.visibilityState === "hidden") { saverRef.current.flush(); queueRef.current.flush(); }
      else refreshLive();
    };
    const onOnline = () => { if (hydratedRef.current) { queueRef.current.flush(); saverRef.current.flush(); } };
    const timer = setInterval(() => { if (hydratedRef.current) queueRef.current.flush(); }, 20000);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", onOnline);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", onVisibility); window.removeEventListener("online", onOnline); };
  }, []);

  // Everything the rewards feature reads and writes, shared through RewardsContext (see rewards/RewardsContext.jsx).
  // Claiming a box pays its XP, any level-up and the new wardrobe in ONE handler, so React batches them into a single
  // render: the level-up effect above then finds nothing left to level and LevelUpToast stays quiet (the reward pop-up
  // shows the level-up itself).
  const rewardsApi = {
    outfit: rewards.outfit,
    owned: rewards.owned,
    isClaimed: (setKey) => Boolean(rewards.claimedSets[setKey]),
    claimSet: ({ setKey, total, retried }) => {
      if (!profile) return null;
      const out = claimBox({
        rewards, progress: { level: profile.level, xp: profile.xp + bonusXp, xpToNext: profile.xpToNext },
        longestStreak: liveLongestStreak, setKey, total, retried,
      });
      if (!out) return null;
      setBonusXp((x) => x + out.result.xp);
      setProfile((cur) => ({ ...cur, level: out.result.after.level, xpToNext: out.result.after.xpToNext }));
      setRewards(out.rewards);
      if (SERVER_MODE) {
        prevLevelRef.current = out.result.after.level; // the reward pop-up already shows this level-up; no second toast
        sendStudy(boxEvent({ setKey, total, retried, itemId: out.result.itemId }), out.result.xp);
      }
      return out.result;
    },
    equip: (slot, itemId) => setRewards((r) => equipItem(r, slot, itemId)),
    saveOutfit: (outfit) => setRewards((r) => ({ ...r, outfit: sanitizeOutfit(outfit, r.owned) })),
    openWardrobe: () => go("wardrobe"),
  };

  // The daily plan is the student's own to-do list (rules in dailyPlan.js): ticking a task earns no XP.
  // With the server, each change shows on screen at once and is then sent in order; a failure undoes it and says so.
  const planChange = (job) => {
    planBusy.current += 1;
    planOps.current = planOps.current.then(job).catch(() => {}).finally(() => { planBusy.current -= 1; });
    return planOps.current;
  };
  const realTaskId = (id) => planIdMap.current.get(id) ?? id;
  const togglePlanTask = (id) => {
    const target = plan.find((x) => x.id === id);
    setPlan((arr) => toggleTask(arr, id));
    if (!SERVER_MODE || !target) return;
    const done = !target.done;
    planChange(async () => {
      const sid = realTaskId(id);
      if (sid < 0) return; // it never got saved (the add failed)
      try { await api.patchPlanTask(sid, { done }); }
      catch { setPlan((arr) => arr.map((x) => (x.id === id || x.id === sid ? { ...x, done: !done } : x))); flash("errPlanSave"); }
    });
  };
  const addPlanTask = (task) => {
    const date = dateKey();
    const tempId = -(Date.now() * 1000 + Math.floor(Math.random() * 1000)); // negative: can never clash with a server id
    const next = addTask(plan, task, date, tempId);
    if (next === plan) return; // empty title, or today's list is full
    setPlan(next);
    if (!SERVER_MODE) return;
    const added = next[next.length - 1];
    planChange(async () => {
      try {
        const res = await api.addPlanTask({ title: added.task, subject: added.s ?? undefined, minutes: added.min ?? undefined, date });
        const saved = taskFromServer(res.task);
        planIdMap.current.set(tempId, saved.id);
        setPlan((arr) => arr.map((x) => (x.id === tempId ? { ...saved, done: x.done } : x)));
      } catch (err) {
        setPlan((arr) => arr.filter((x) => x.id !== tempId));
        flash(err?.code === "plan_limit_reached" ? "errPlanLimit" : "errPlanSave");
      }
    });
  };
  const removePlanTask = (id) => {
    const removed = plan.find((x) => x.id === id);
    setPlan((arr) => removeTask(arr, id));
    if (!SERVER_MODE || !removed) return;
    planChange(async () => {
      const sid = realTaskId(id);
      if (sid < 0) return;
      try { await api.deletePlanTask(sid); }
      catch (err) {
        if (err?.status === 404) return; // already gone
        setPlan((arr) => (arr.some((x) => x.id === sid) ? arr : [...arr, { ...removed, id: sid }]));
        flash("errPlanSave");
      }
    });
  };

  // Record an answered exercise: bookkeeping for XP (unchanged) + feeding the topic-mastery engine
  // (new) so the subject's score, weak/strong tag, and every derived recommendation update live.
  // With the server the XP added here is a guess shown at once; the study event below makes the server the judge.
  const handleAnswer = (ex, result, meta = {}) => {
    const already = practice[ex.id]?.xpAwarded;
    const xpAwarded = already || result === "correct";
    setPractice((prev) => ({ ...prev, [ex.id]: { status: result === "correct" ? "completed" : "in_progress", result, at: Date.now(), subject: ex.subject, topic: ex.topic, xpAwarded } }));
    if (result === "correct" && !already) setBonusXp((x) => x + XP_PER_CORRECT);
    setTopicMastery((tm) => recordAttempt(tm, ex.subject, ex.topic, {
      correct: result === "correct", difficulty: ex.difficulty, timeSec: meta.timeSec ?? null, mistakeType: meta.mistakeType ?? null, confidence: null, ts: Date.now(),
    }));
    sendStudy(answerEvent(ex, result, meta), result === "correct" && !already ? XP_PER_CORRECT : 0);
  };
  // Manually set a status (Pending / In progress / Completed). XP is only ever awarded once per exercise.
  const handleSetStatus = (ex, status) => {
    const already = practice[ex.id]?.xpAwarded;
    const xpAwarded = already || status === "completed";
    setPractice((prev) => ({ ...prev, [ex.id]: { ...(prev[ex.id] || { result: null }), status, at: Date.now(), subject: ex.subject, topic: ex.topic, xpAwarded } }));
    if (status === "completed" && !already) setBonusXp((x) => x + XP_PER_CORRECT);
    sendStudy(statusEvent(ex, status), status === "completed" && !already ? XP_PER_CORRECT : 0);
  };
  // University-track twins of handleAnswer/handleSetStatus above — same logic, writing to the
  // uniPractice/uniTopicMastery stores instead so BAC-II and university progress never collide.
  const handleUniAnswer = (ex, result, meta = {}) => {
    const already = uniPractice[ex.id]?.xpAwarded;
    const xpAwarded = already || result === "correct";
    setUniPractice((prev) => ({ ...prev, [ex.id]: { status: result === "correct" ? "completed" : "in_progress", result, at: Date.now(), subject: ex.subject, topic: ex.topic, xpAwarded } }));
    if (result === "correct" && !already) setBonusXp((x) => x + XP_PER_CORRECT);
    setUniTopicMastery((tm) => recordAttempt(tm, ex.subject, ex.topic, {
      correct: result === "correct", difficulty: ex.difficulty, timeSec: meta.timeSec ?? null, mistakeType: meta.mistakeType ?? null, confidence: null, ts: Date.now(),
    }));
    sendStudy(answerEvent(ex, result, meta), result === "correct" && !already ? XP_PER_CORRECT : 0);
  };
  const handleUniSetStatus = (ex, status) => {
    const already = uniPractice[ex.id]?.xpAwarded;
    const xpAwarded = already || status === "completed";
    setUniPractice((prev) => ({ ...prev, [ex.id]: { ...(prev[ex.id] || { result: null }), status, at: Date.now(), subject: ex.subject, topic: ex.topic, xpAwarded } }));
    if (status === "completed" && !already) setBonusXp((x) => x + XP_PER_CORRECT);
    sendStudy(statusEvent(ex, status), status === "completed" && !already ? XP_PER_CORRECT : 0);
  };

  // A short message in the corner. It needs the theme classes for its colours, so it brings its own wrapper
  // (display: contents keeps that wrapper out of the layout).
  const noticeToast = notice ? (
    <div className={`eai-root ${dark ? "theme-dark" : "theme-light"}`} style={{ display: "contents" }}>
      <NoticeToast text={t(lang, notice)} onClose={() => setNotice(null)} />
    </div>
  ) : null;

  if (SERVER_MODE && booting) return <LoadingScreen lang={lang} dark={dark} />;
  if (SERVER_MODE && bootError) return (
    <OnboardingLayout dark={dark} setDark={setDark} onBack={leaveSavedLogin} lang={lang} setLang={setLang}
      title={bootError.status === 429 ? apiErrorText(lang, bootError.code, bootError.retryAfter) : t(lang, "errNetwork")} description=""
      footer={<PrimaryButton onClick={bootAccount} className={`sm:w-auto ${lang === "km" ? "eai-km" : ""}`}>{t(lang, "retryWord")}</PrimaryButton>}>
      <span />
    </OnboardingLayout>
  );
  if (pendingReg && !showDiagnostic) return <>{noticeToast}<AssessmentChoice reg={pendingReg} dark={dark} setDark={setDark} onStart={() => setShowDiagnostic(true)} onSkip={handleSkipDiagnostic} onBack={handleBackToPreferences} lang={lang} setLang={setLang} /></>;
  if (pendingReg) return <>{noticeToast}<Diagnostic reg={pendingReg} dark={dark} onComplete={handleDiagnosticComplete} lang={lang} /></>;
  if (!profile && entry === "welcome") return <Welcome dark={dark} setDark={setDark} lang={lang} setLang={setLang} onLogin={() => setEntry("login")} onCreate={() => setEntry("create")} />;
  if (!profile && entry === "login") return <>{noticeToast}<Login dark={dark} setDark={setDark} onBack={() => setEntry("welcome")} onLogin={handleLogin} onCreateInstead={() => setEntry("create")} onForgot={() => setEntry("forgot")} lang={lang} setLang={setLang} /></>;
  if (!profile && entry === "forgot" && SERVER_MODE) return <>{noticeToast}<ForgotPassword dark={dark} setDark={setDark} onBack={() => setEntry("login")} onSignedIn={handleSignedIn} lang={lang} setLang={setLang} /></>;
  if (!profile) return <>{noticeToast}<Register onComplete={handleRegister} dark={dark} setDark={setDark} initialForm={resumeReg?.form} initialStep={resumeReg?.step} onBack={() => setEntry("welcome")} lang={lang} setLang={setLang} /></>;
  if (retaking) return <RewardsContext.Provider value={rewardsApi}><Diagnostic reg={profile} dark={dark} onComplete={handleLaterDiagnosticComplete} lang={lang} /></RewardsContext.Provider>;
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
    dashboard: <Dashboard p={p} go={go} plan={plan} onTogglePlan={togglePlanTask} onAddPlanTask={addPlanTask} onRemovePlanTask={removePlanTask} bonusXp={bonusXp} lang={lang} />,
    browse: <Browse p={p} lang={lang} exam={exam} tr={tr} />,
    schoolReport: <SchoolReportPage report={exam.report()} lang={lang} tr={tr} onLoadSample={exam.loadSample} onClearSample={exam.clearSample} />,
    practice: <Practice p={p} practice={practice} onAnswer={handleAnswer} onSetStatus={handleSetStatus} lang={lang} />,
    universities: <Universities p={p} lang={lang} />, languages: <Languages results={langResults} onTakeDiagnostic={(name) => setTakingLangTest(name)} lang={lang} />, coach: <Coach p={p} lang={lang} />,
    progress: isUniProfile ? <UniversityProgress p={p} lang={lang} /> : <Progress p={p} practice={practice} bonusXp={bonusXp} lang={lang} weeklyStudyHours={weeklyStudyHours} />,
    universityHub: <UniversityHub p={p} go={go} onPracticeCourse={(courseId) => { setUniPracticeTarget(courseId); go("uniPractice"); }} lang={lang} />,
    explore: <UniversityExplore p={p} go={go} lang={lang} />,
    scholarships: <Scholarships p={p} lang={lang} />,
    uniPractice: <UniversityPractice p={p} uniPractice={uniPractice} onAnswer={handleUniAnswer} onSetStatus={handleUniSetStatus}
      initialCourseId={uniPracticeTarget} onConsumeInitialCourse={() => setUniPracticeTarget(null)} lang={lang} />,
    super: <SuperBondus p={p} lang={lang} />,
    wardrobe: <Wardrobe lang={lang} renderOwl={(outfit) => <OwlMascot outfit={outfit} />} />,
  }[tab];

  return (
    <RewardsContext.Provider value={rewardsApi}>
    <div className={`eai-root ${dark ? "theme-dark" : "theme-light"} ${lang === "km" && !isUniProfile ? "eai-km-root" : ""}`}>
      <style>{STYLES}</style>
      <WelcomeBackToast name={profile.name} show={showWelcomeBack} />
      <LevelUpToast level={levelUpToast} show={levelUpToast != null} />
      {noticeToast}
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
            {(isUniProfile ? UNI_NAV : showSchoolReport ? [...NAV, SCHOOL_NAV] : NAV).map((n) => {
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
              <span className="eai-fx-fire" style={{ display: "block", margin: "0 auto", width: 20 }}><Flame size={20} style={{ color: "var(--ember)" }} /></span>
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
                <Pill icon={Flame} color="var(--ember)" soft="var(--ember-soft)" value={p.streak} label={lang === "km" ? "ថ្ងៃជាប់គ្នា" : "streak"} effect="fire" />
                <Pill icon={Zap} color="var(--gold)" soft="var(--gold-soft)" value={(profile.xp + bonusXp).toLocaleString()} label="XP" effect="bolt" />
                <Pill icon={TrendingUp} color="var(--primary)" soft="var(--primary-soft)" value={`Lv ${profile.level}`} label="" effect="climb" />
              </div>
              <div className="flex items-center gap-2 ml-auto">
                {!isUniProfile && exam.current && <RunningChip session={exam.current} now={exam.now} lang={lang} onClick={() => go("browse")} />}
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
    </RewardsContext.Provider>
  );
}

