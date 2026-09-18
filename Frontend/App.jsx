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
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { UNIS, UNI_MAJORS } from "../src/data/universities.js";

/* ════════════════════════ Configuration / domain data ════════════════════════ */
/* Field-specific subject priorities. Change these lists to extend the curriculum. */
const FIELD_SUBJECTS = {
  science: ["Mathematics", "Physics", "Chemistry", "Biology", "Khmer Literature", "History", "English", "French"],
  social_science: ["Khmer Literature", "History", "Geography", "Morality", "Earth Science", "Mathematics", "English", "French"],
};

const FIELD_META = {
  science: { label: "Science", km: "វិទ្យាសាស្ត្រ", icon: Atom, color: "var(--primary)", blurb: "Math, physics, chemistry and biology-focused track.", blurbKm: "ផ្នែកផ្តោតលើគណិតវិទ្យា រូបវិទ្យា គីមីវិទ្យា និងជីវវិទ្យា។" },
  social_science: { label: "Social Science", km: "វិទ្យាសាស្ត្រសង្គម", icon: Landmark, color: "var(--gold)", blurb: "Literature, history, geography and civics-focused track.", blurbKm: "ផ្នែកផ្តោតលើអក្សរសាស្ត្រ ប្រវត្តិវិទ្យា ភូមិវិទ្យា និងសីលធម៌។" },
};

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

/* Build the static part of a student profile — registration answers + gamification state.
   Subject mastery, weak/strong tags, predictions and recommendations are never baked in here;
   they're derived live from real attempt history by deriveInsights() below. */
function buildProfile(reg) {
  return { ...reg, level: 1, xp: 40, xpToNext: 500, streak: 1, longestStreak: 1 };
}

/* Turns topic-mastery history into everything the UI shows: subject scores, weak/strong tags,
   a grade-range estimate, exam readiness, a recommended lesson, and AI recommendations. This is
   the "reassess" half of the assess → identify weakness → recommend → practice → reassess loop —
   call it fresh (useMemo) whenever topicMastery changes and the whole app updates with it. */
function deriveInsights(p, topicMastery) {
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
  const consistency = clamp(30 + p.streak * 10, 0, 100);
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

const WEEK_SEED = [
  { d: "Mon", h: 0.4 }, { d: "Tue", h: 0.6 }, { d: "Wed", h: 0.3 },
  { d: "Thu", h: 0.8 }, { d: "Fri", h: 0.5 }, { d: "Sat", h: 1.1 }, { d: "Sun", h: 0.5 },
];
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
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Noto+Sans+Khmer:wght@400;600;700&display=swap');

.eai-root{ font-family:'Plus Jakarta Sans', system-ui, sans-serif; color:var(--ink);
  background:var(--bg); min-height:100vh; -webkit-font-smoothing:antialiased; }
.eai-display{ font-family:'Sora', system-ui, sans-serif; letter-spacing:-0.02em; }
.eai-km{ font-family:'Noto Sans Khmer', system-ui, sans-serif; }

.theme-light{
  --bg:#FFFFFF; --bg-soft:#F1EADB; --card:#FFFFFF; --ink:#1A1B3A; --muted:#71728C;
  --line:#ECE3D3; --primary:#403FB0; --primary-soft:#ECECFB; --gold:#E29A30; --gold-soft:#FBEFD7;
  --ember:#D9543F; --ember-soft:#FAE2DB; --jade:#159A82; --jade-soft:#DBF1EC;
  --shadow:0 1px 2px rgba(26,27,58,.04), 0 10px 30px rgba(26,27,58,.07);
}
.theme-dark{
  --bg:#0C0D1E; --bg-soft:#14152C; --card:#191B33; --ink:#F2EFE6; --muted:#9A9BB6;
  --line:#2A2C49; --primary:#8a89f5; --primary-soft:#23244A; --gold:#EEAB49; --gold-soft:#2B2417;
  --ember:#E96E58; --ember-soft:#2E1B18; --jade:#2BB89C; --jade-soft:#13271F;
  --shadow:0 1px 2px rgba(0,0,0,.35), 0 14px 34px rgba(0,0,0,.4);
}

.eai-card{ background:var(--card); border:1px solid var(--line); border-radius:22px; box-shadow:var(--shadow); }
.eai-soft{ background:var(--bg-soft); }
.eai-muted{ color:var(--muted); }
.eai-btn{ font-weight:600; border-radius:13px; transition:transform .12s ease, filter .12s ease; cursor:pointer; border:none; }
.eai-btn:hover{ filter:brightness(1.05); }
.eai-btn:active{ transform:translateY(1px); }
.eai-nav{ transition:background .15s ease, color .15s ease; cursor:pointer; }
.eai-nav:hover{ background:var(--bg-soft); }
.eai-tile{ transition:transform .15s ease, box-shadow .15s ease, border-color .15s ease; cursor:pointer; }
.eai-tile:hover{ transform:translateY(-3px); box-shadow:var(--shadow); border-color:var(--primary); }
.eai-focus:focus-visible{ outline:2px solid var(--primary); outline-offset:2px; }
input.eai-input, select.eai-input{ background:var(--bg-soft); color:var(--ink); border:1px solid var(--line); border-radius:14px; }
input.eai-input::placeholder{ color:var(--muted); }
.eai-rise{ animation:rise .5s cubic-bezier(.2,.7,.3,1) both; }
@keyframes rise{ from{ opacity:0; transform:translateY(10px);} to{ opacity:1; transform:none;} }
@keyframes bounce{ 0%,60%,100%{ transform:translateY(0); opacity:.5;} 30%{ transform:translateY(-4px); opacity:1;} }
.eai-scroll::-webkit-scrollbar{ height:6px; width:6px; }
.eai-scroll::-webkit-scrollbar-thumb{ background:var(--line); border-radius:99px; }
.eai-pick{ transition:transform .15s ease, border-color .15s ease, box-shadow .15s ease; cursor:pointer; }
.eai-pick:hover{ transform:translateY(-2px); box-shadow:var(--shadow); }
@media (prefers-reduced-motion: reduce){ .eai-rise{ animation:none; } .eai-btn,.eai-tile,.eai-pick{ transition:none; } }

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
.eai-md > * + *{ margin-top:.6em; }
.eai-md ol{ list-style:decimal; padding-left:1.4em; } .eai-md ul{ list-style:disc; padding-left:1.4em; }
.eai-md li + li{ margin-top:.25em; }
.eai-md h1,.eai-md h2,.eai-md h3,.eai-md h4{ font-weight:700; }
.eai-md strong{ font-weight:700; }
.eai-md a{ color:var(--primary); text-decoration:underline; }
.eai-md code{ font-size:.9em; background:var(--card); border-radius:6px; padding:.1em .35em; }
.eai-md pre{ background:var(--card); border:1px solid var(--line); border-radius:12px; padding:10px 12px; overflow-x:auto; }
.eai-md pre code{ background:none; padding:0; }
.eai-md table{ border-collapse:collapse; } .eai-md th,.eai-md td{ border:1px solid var(--line); padding:4px 8px; }
.eai-md blockquote{ border-left:3px solid var(--line); padding-left:10px; color:var(--muted); }
.eai-md .katex-display{ overflow-x:auto; overflow-y:hidden; padding:2px 0; margin:.4em 0; }
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
}
.eai-onboarding.theme-dark{
  --bg:#090B1D; --card:#17192F; --surface-2:#1D203B; --bg-soft:#202238;
  --ink:#F5F3FC; --muted:#A7AAC2; --label:#B8BACD; --muted-2:#8589A4; --line:#2A2D49;
  --input-border:#30334F; --input-border-hover:#424665; --focus-border:#8A82F4;
  --primary:#8179F2; --primary-hover:#918AF7; --primary-soft:#28294D; --primary-ring:rgba(138,130,244,.10);
  --gold:#EFA421; --gold-soft:#302716; --ember:#F17A70;
  --progress-track:#292C47; --progress-fill:#8179F2;
  --shadow:0 18px 50px rgba(0,0,0,.22);
}
.eai-onboarding{ position:relative; transition:background-color .25s ease, color .25s ease; }
.eai-onboarding::before{ content:""; position:fixed; inset:0; pointer-events:none; z-index:0; }
.eai-onboarding.theme-light::before{ background-image:radial-gradient(circle at 50% 25%, rgba(86,78,210,.07), transparent 42%); }
.eai-onboarding.theme-dark::before{ background-image:radial-gradient(circle at 50% 25%, rgba(115,105,235,.12), transparent 45%); }
.eai-onboarding > *{ position:relative; z-index:1; }

.eai-ob-toggle{ position:fixed; top:20px; right:20px; width:44px; height:44px; border-radius:14px; border:1px solid var(--line);
  background:var(--bg-soft); color:var(--ink); display:grid; place-items:center; z-index:20; transition:background-color .15s ease, transform .12s ease; }
.eai-ob-toggle:hover{ background:var(--card); transform:translateY(-1px); }

.eai-ob-card{ background:var(--card); border:1px solid var(--line); border-radius:24px; box-shadow:var(--shadow); padding:40px;
  transition:background-color .25s ease, border-color .25s ease, box-shadow .25s ease; }
@media (max-width:640px){ .eai-ob-card{ padding:22px; border-radius:20px; } }

.eai-ob-progress{ margin-bottom:18px; }
.eai-ob-progress-top{ display:flex; align-items:baseline; justify-content:space-between; gap:8px; }
.eai-ob-progress-step{ font-size:12px; font-weight:700; color:var(--primary); text-transform:uppercase; letter-spacing:.04em; }
.eai-ob-progress-label{ font-size:12px; font-weight:600; color:var(--muted); }
.eai-ob-progress-track{ margin-top:8px; height:6px; border-radius:999px; background:var(--progress-track); overflow:hidden; }
.eai-ob-progress-fill{ height:100%; border-radius:999px; background:var(--progress-fill); transition:width .3s ease; }

.eai-ob-back-row{ min-height:28px; display:flex; align-items:center; margin-bottom:8px; }
.eai-ob-back{ display:inline-flex; align-items:center; gap:4px; font-size:13px; font-weight:600; color:var(--muted);
  min-height:44px; padding:0 6px; border-radius:10px; transition:color .15s ease, background-color .15s ease; }
.eai-ob-back:hover{ color:var(--primary); background:var(--primary-soft); }

.eai-ob-heading{ margin-bottom:22px; }
.eai-ob-title{ font-family:'Sora', system-ui, sans-serif; font-weight:700; font-size:28px; letter-spacing:-.02em; line-height:1.22; color:var(--ink); }
.eai-ob-desc{ font-size:15px; color:var(--muted); margin-top:6px; max-width:620px; line-height:1.55; }
@media (max-width:640px){ .eai-ob-title{ font-size:24px; } }

.eai-ob-label{ font-size:13px; font-weight:600; color:var(--label); display:block; }
.eai-ob-input{ height:48px; width:100%; border-radius:14px; border:1px solid var(--input-border); background:var(--bg-soft); color:var(--ink);
  padding:0 16px; font-size:14px; transition:background-color .2s ease, border-color .2s ease, box-shadow .2s ease; }
.eai-ob-input::placeholder{ color:var(--muted-2); }
.eai-ob-input:hover{ border-color:var(--input-border-hover); }
.eai-ob-input:focus-visible{ outline:none; border-color:var(--focus-border); box-shadow:0 0 0 4px var(--primary-ring); }
.eai-ob-error{ display:flex; align-items:center; gap:5px; font-size:12px; color:var(--ember); margin-top:6px; }

.eai-ob-track-card{ width:100%; text-align:left; border-radius:18px; border:1px solid var(--line); background:var(--surface-2);
  padding:20px; cursor:pointer; transition:background-color .18s ease, border-color .18s ease, transform .15s ease, box-shadow .18s ease; }
.eai-ob-track-card:hover{ border-color:var(--primary); background:var(--bg-soft); transform:translateY(-1px); }
.eai-ob-track-card.is-selected{ background:var(--primary-soft); border-color:var(--primary); box-shadow:0 0 0 3px var(--primary-ring); }
.eai-ob-tag{ font-size:11px; font-weight:600; padding:3px 9px; border-radius:999px; background:var(--bg-soft); color:var(--muted); }

.eai-ob-chip{ height:37px; padding:0 14px; border-radius:999px; border:1px solid var(--line); background:var(--surface-2); color:var(--ink);
  font-size:12px; font-weight:600; display:inline-flex; align-items:center; gap:6px; cursor:pointer;
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
.eai-ob-btn-secondary{ height:50px; width:100%; border-radius:14px; font-weight:600; font-size:14px; background:var(--bg-soft); color:var(--ink);
  border:1px solid var(--line); transition:background-color .2s ease, border-color .2s ease, transform .12s ease; }
.eai-ob-btn-secondary:hover{ background:var(--card); border-color:var(--primary); transform:translateY(-1px); }

.eai-ob-option-card{ position:relative; border-radius:18px; padding:22px; border:1px solid var(--line); background:var(--surface-2);
  transition:background-color .2s ease, border-color .2s ease; }
.eai-ob-option-card.is-primary{ background:var(--primary-soft); border-color:var(--primary); }
.eai-ob-badge{ position:absolute; top:16px; right:16px; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.04em;
  padding:4px 9px; border-radius:999px; background:var(--primary); color:#fff; }
.eai-ob-benefits{ margin-top:12px; display:flex; flex-direction:column; gap:6px; }
.eai-ob-benefits li{ display:flex; align-items:center; gap:6px; font-size:12px; color:var(--muted); }

.eai-ob-footer{ text-align:center; font-size:13px; color:var(--muted); margin-top:18px; }

@media (prefers-reduced-motion: reduce){
  .eai-ob-progress-fill{ transition:none; }
  .eai-ob-track-card, .eai-ob-btn-primary, .eai-ob-btn-secondary, .eai-ob-toggle{ transition:none; }
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
      <span className="text-sm font-bold eai-display" style={{ color: "var(--ink)" }}>{value}</span>
      <span className="text-xs eai-muted hidden sm:inline">{label}</span>
    </div>
  );
}

function CardHead({ title, kh, action }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <h3 className="eai-display font-bold text-base">{title}</h3>
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
          <button onClick={onStartPlan} className={`eai-btn eai-focus text-white px-4 py-2.5 text-sm flex items-center gap-2 ${lang === "km" ? "eai-km" : ""}`} style={{ background: "var(--primary)" }}>
            <Target size={16} /> {t(lang, "dashStartPlan")}
          </button>
          <button onClick={onAskCoach} className={`eai-btn eai-focus px-4 py-2.5 text-sm flex items-center gap-2 eai-soft ${lang === "km" ? "eai-km" : ""}`} style={{ color: "var(--ink)" }}>
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

/* Switches the app's UI language (English / Khmer) — visually matches ThemeToggle/.eai-ob-toggle
   but styled inline rather than via that class, since .eai-ob-toggle hardcodes position:fixed
   (fine for a lone corner button, but it fights layout when composed into a flex row alongside
   other controls — the same reason the header's dark-mode button also skips that class). */
function LangToggle({ lang, setLang, style }) {
  return (
    <button onClick={() => setLang((l) => (l === "en" ? "km" : "en"))} className="eai-focus eai-km"
      style={{
        height: 44, padding: "0 14px", borderRadius: 14, border: "1px solid var(--line)",
        background: "var(--bg-soft)", color: "var(--ink)", display: "grid", placeItems: "center",
        fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "background-color .15s ease, transform .12s ease",
        ...style,
      }}
      aria-label={lang === "en" ? "ប្តូរទៅភាសាខ្មែរ" : "Switch to English"}>
      {lang === "en" ? "ខ្មែរ" : "EN"}
    </button>
  );
}

function OnboardingProgress({ step, lang = "en" }) {
  const pct = (step / ONBOARDING_STEPS.length) * 100;
  const steps = lang === "km" ? ONBOARDING_STEPS_KM : ONBOARDING_STEPS;
  return (
    <div className="eai-ob-progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}
      aria-label={`Step ${step} of ${steps.length}: ${steps[step - 1]}`}>
      <div className="eai-ob-progress-top">
        <span className={`eai-ob-progress-step ${lang === "km" ? "eai-km" : ""}`}>{t(lang, "stepWord")} {step} {t(lang, "ofWord")} {steps.length}</span>
        <span className={`eai-ob-progress-label ${lang === "km" ? "eai-km" : ""}`}>{steps[step - 1]}</span>
      </div>
      <div className="eai-ob-progress-track">
        <div className="eai-ob-progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function OnboardingLayout({ dark, setDark, step, title, description, onBack, children, lang = "en", setLang }) {
  return (
    <div className={`eai-root eai-onboarding ${dark ? "theme-dark" : "theme-light"}`} style={{ minHeight: "100vh" }}>
      <style>{STYLES}</style>
      <div style={{ position: "fixed", top: 20, right: 20, zIndex: 20, display: "flex", gap: 8 }}>
        {setLang && <LangToggle lang={lang} setLang={setLang} />}
        <button onClick={() => setDark((d) => !d)} className="eai-focus" aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
          style={{ position: "static", width: 44, height: 44, borderRadius: 14, border: "1px solid var(--line)", background: "var(--bg-soft)", color: "var(--ink)", display: "grid", placeItems: "center", transition: "background-color .15s ease, transform .12s ease" }}>
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

      <div className="flex items-start sm:items-center justify-center px-4 sm:px-6" style={{ minHeight: "100vh", paddingTop: 32, paddingBottom: 32 }}>
        <div className="w-full eai-rise" style={{ maxWidth: 820 }}>
          <div className="flex items-center justify-center gap-2.5" style={{ marginBottom: 24 }}>
            <div className="grid place-items-center rounded-xl overflow-hidden" style={{ width: 44, height: 44 }}>
              <BondusLogo />
            </div>
            <div>
              <p className="eai-display font-extrabold text-lg leading-none">Bondus Cambodia</p>
              <p className="eai-km text-xs eai-muted">រៀនពូកែ ប្រឡងជាប់</p>
            </div>
          </div>

          <div className="eai-ob-card">
            {step != null && <OnboardingProgress step={step} lang={lang} />}
            <div className="eai-ob-back-row">
              {onBack ? (
                <button onClick={onBack} className={`eai-ob-back eai-focus ${lang === "km" ? "eai-km" : ""}`}>
                  <ChevronLeft size={16} /> {t(lang, "backWord")}
                </button>
              ) : (
                <span aria-hidden="true" className="eai-ob-back" style={{ visibility: "hidden" }}>
                  <ChevronLeft size={16} /> {t(lang, "backWord")}
                </span>
              )}
            </div>

            {(title || description) && (
              <div className="eai-ob-heading">
                {title && <h1 className={`eai-ob-title ${lang === "km" ? "eai-km" : ""}`}>{title}</h1>}
                {description && <p className={`eai-ob-desc ${lang === "km" ? "eai-km" : ""}`}>{description}</p>}
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
      <span className="eai-ob-label">{label}{required && <span style={{ color: "var(--ember)" }}> *</span>}</span>
      <div className="mt-1.5">{children}</div>
      {error && <p className="eai-ob-error" role="alert"><AlertTriangle size={12} /> {error}</p>}
    </label>
  );
}

function SelectField({ label, required, value, onChange, options, autoComplete }) {
  return (
    <FormField label={label} required={required}>
      <select className="eai-ob-input eai-focus" value={value} onChange={onChange} autoComplete={autoComplete}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
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
      <div className="grid place-items-center rounded-xl flex-shrink-0" style={{ width: 40, height: 40, background: primary ? "var(--primary)" : "var(--bg-soft)" }}>
        <Icon size={19} color={primary ? "#fff" : "var(--ink)"} />
      </div>
      <h3 className="eai-display font-bold mt-3 text-base">{title}</h3>
      <p className="text-sm eai-muted mt-1.5 leading-relaxed">{description}</p>
      {benefits && (
        <ul className="eai-ob-benefits">
          {benefits.map((b) => <li key={b}><CheckCircle2 size={13} style={{ color: "var(--primary)", flexShrink: 0 }} /> {b}</li>)}
        </ul>
      )}
      {primary ? (
        <PrimaryButton onClick={onClick} className="mt-5 w-full"><Sparkles size={16} /> {buttonLabel}</PrimaryButton>
      ) : (
        <SecondaryButton onClick={onClick} className="mt-5 w-full">{buttonLabel}</SecondaryButton>
      )}
    </div>
  );
}

/* ════════════════════════ Welcome / Login ════════════════════════
   The very first screen, before any account exists in this session. This is a local-storage-only
   prototype (no backend), so "logging in" means matching a phone number against whatever account
   is already saved in this browser — logging out (see App's handleLogout) intentionally leaves
   that data in place so it can be recovered here later. */

function BondusCharacter() {
  return (
    <img
      src="/logos/Bondus_mascout_nobg.png"
      alt="BONDUS mascot - friendly owl reading a book"
      style={{ width: "100%", height: "auto", display: "block" }}
      onError={(e) => {
        e.target.style.display = "none";
      }}
    />
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
          style={{ position: "static", width: 44, height: 44, borderRadius: 14, border: "1px solid var(--line)", background: "var(--bg-soft)", color: "var(--ink)", display: "grid", placeItems: "center", transition: "background-color .15s ease, transform .12s ease" }}>
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
              onMouseEnter={(e) => e.target.style.background = "var(--primary-soft)"}
              onMouseLeave={(e) => e.target.style.background = "transparent"}
            >
              {t(lang, "createAccount")}
            </button>
            <button
              onClick={onLogin}
              className={`eai-focus ${lang === "km" ? "eai-km" : ""}`}
              style={{ width: "100%", padding: "14px 16px", background: "var(--primary)", color: "white", fontWeight: "600", borderRadius: "9999px", border: "none", cursor: "pointer", transition: "all 0.2s", fontSize: "clamp(14px, 1.5vw, 16px)", boxShadow: "0 4px 12px rgba(55, 48, 163, 0.3)" }}
              onMouseEnter={(e) => e.target.style.filter = "brightness(0.9)"}
              onMouseLeave={(e) => e.target.style.filter = "brightness(1)"}
            >
              {t(lang, "login")}
            </button>
          </div>
        </div>

        {/* Mascot Illustration — sized off the full viewport, not the text column, so it actually grows on wide screens */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: "100%", flex: 1, marginTop: "24px" }}>
          <div style={{ width: "clamp(220px, 28vw, 420px)", maxWidth: "90vw" }}>
            <BondusCharacter />
          </div>
        </div>
      </div>
    </div>
  );
}

function Login({ dark, setDark, onBack, onLogin, onCreateInstead, lang = "en", setLang }) {
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const submit = () => {
    if (!phone.trim()) { setError(t(lang, "errEnterPhone")); return; }
    if (!onLogin(phone.trim())) setError(t(lang, "errPhoneNotFound"));
  };
  return (
    <OnboardingLayout dark={dark} setDark={setDark} onBack={onBack} lang={lang} setLang={setLang}
      title={t(lang, "loginTitle")} description={t(lang, "loginDesc")}>
      <FormField label={t(lang, "phoneNumberLabel")} required error={error} lang={lang}>
        <input className="eai-ob-input eai-focus" placeholder="016556618" autoComplete="tel" inputMode="tel"
          value={phone} onChange={(e) => { setPhone(e.target.value); setError(""); }}
          onKeyDown={(e) => e.key === "Enter" && submit()} />
      </FormField>

      <PrimaryButton onClick={submit} className={`w-full mt-6 ${lang === "km" ? "eai-km" : ""}`}>{t(lang, "loginTitle")} <ChevronRight size={16} /></PrimaryButton>
      <p className={`text-center text-xs eai-muted mt-4 ${lang === "km" ? "eai-km" : ""}`}>
        {t(lang, "noAccountYet")}{" "}
        <button onClick={onCreateInstead} className="eai-focus font-semibold" style={{ color: "var(--primary)" }}>{t(lang, "createOne")}</button>
      </p>
    </OnboardingLayout>
  );
}

/* ════════════════════════ Registration ════════════════════════
   Steps 1–3 of the onboarding flow (account details, academic track, learning preferences).
   `initialForm`/`initialStep` let App.jsx re-open this at a specific step — used when a student
   goes "Back" from the step-4 AssessmentChoice screen, so their answers aren't lost. */
function Register({ onComplete, dark, setDark, initialForm, initialStep, onBack, lang = "en", setLang }) {
  const [step, setStep] = useState(initialStep ?? 0);
  const [form, setForm] = useState(initialForm ?? {
    name: "", phone: "", age: "", grade: "12", field: "", target: "A",
    targetExamYear: EXAM_YEARS[1], dailyMinutes: 60, targetUniversity: "",
    subjectsToImprove: [],
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const canFinish = form.name.trim() && form.field;

  // Unlimited multi-select.
  const toggleImprove = (id) => setForm((f) => ({
    ...f, subjectsToImprove: f.subjectsToImprove.includes(id) ? f.subjectsToImprove.filter((x) => x !== id) : [...f.subjectsToImprove, id],
  }));
  const clearSubjects = () => setForm((f) => ({ ...f, subjectsToImprove: [] }));

  if (step === 0) {
    return (
      <OnboardingLayout dark={dark} setDark={setDark} step={1} onBack={onBack} lang={lang} setLang={setLang}
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
          <FormField label={t(lang, "ageLabel")}>
            <input type="number" min="8" max="99" inputMode="numeric" className="eai-ob-input eai-focus" placeholder="18"
              value={form.age} onChange={(e) => set("age", e.target.value)} />
          </FormField>
          <SelectField label={t(lang, "gradeLevelLabel")} value={form.grade} onChange={(e) => set("grade", e.target.value)}
            options={[{ value: "11", label: t(lang, "grade11") }, { value: "12", label: t(lang, "grade12") }]} />
          <SelectField label={t(lang, "targetGradeLabel")} value={form.target} onChange={(e) => set("target", e.target.value)}
            options={["A", "B", "C", "D", "E"].map((g) => ({ value: g, label: `${t(lang, "gradeWord")} ${g}` }))} />
        </div>

        <PrimaryButton onClick={() => setStep(1)} disabled={!form.name.trim()} className={`w-full mt-8 ${lang === "km" ? "eai-km" : ""}`}>
          {t(lang, "continueToTrack")} <ChevronRight size={16} />
        </PrimaryButton>
      </OnboardingLayout>
    );
  }

  if (step === 1) {
    return (
      <OnboardingLayout dark={dark} setDark={setDark} step={2} onBack={() => setStep(0)} lang={lang} setLang={setLang}
        title={t(lang, "chooseTrackTitle")} description={t(lang, "chooseTrackDesc")}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" role="radiogroup" aria-label="Academic track">
          {Object.entries(FIELD_META).map(([key, meta]) => (
            <TrackCard key={key} meta={meta} subjects={FIELD_SUBJECTS[key]} selected={form.field === key} onSelect={() => set("field", key)} lang={lang} />
          ))}
        </div>

        <PrimaryButton onClick={() => setStep(2)} disabled={!canFinish} className={`w-full mt-8 ${lang === "km" ? "eai-km" : ""}`}>
          {t(lang, "continueWord")} <ChevronRight size={16} />
        </PrimaryButton>
      </OnboardingLayout>
    );
  }

  return (
    <OnboardingLayout dark={dark} setDark={setDark} step={3} onBack={() => setStep(1)} lang={lang} setLang={setLang}
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
  km: ["ផែនទីសិក្សាផ្ទាល់ខ្លួន", "អនុសាសន៍ AI", "ការវិភាគសមត្ថភាពមុខវិជ្ជា", "សំណួរអនុវត្តន៍សម្របតាមកម្រិត", "អនុសាសន៍ក្រដាសប្រឡង BAC II", "តាមដានវឌ្ឍនភាព"],
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
              <button onClick={onStartAssessment} className={`eai-btn eai-focus mt-3.5 px-4 py-2 text-xs text-white ${lang === "km" ? "eai-km" : ""}`} style={{ background: "var(--primary)" }}>
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
/* Scanned official exam papers, keyed by "Subject-Year". Only entries present here get a working
   View button — everything else stays a no-op until its pages are added. */
const EXAM_PAPER_IMAGES = {
  "Mathematics-2025": ["/exams/science-math-2025.jpg", "/exams/science-math-2025-2.jpg", "/exams/science-math-2025-3.jpg"],
};

function ExamPaperPage({ paper, onBack }) {
  return (
    <div className="space-y-5 eai-rise">
      <button onClick={onBack} className="eai-focus flex items-center gap-1 text-sm eai-muted">
        <ChevronLeft size={16} /> All exams
      </button>
      <div>
        <h2 className="eai-display text-2xl font-extrabold">{paper.title}</h2>
        <p className="eai-muted text-sm mt-1">Scroll down to see every page of the official paper.</p>
      </div>
      <div className="eai-card p-4 sm:p-6">
        <div className="space-y-4">
          {paper.images.map((src, i) => (
            <img key={i} src={src} alt={`${paper.title} — page ${i + 1}`} className="w-full rounded-xl border" style={{ borderColor: "var(--line)", display: "block" }} />
          ))}
        </div>
      </div>
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
  social_science: {
    "Khmer Literature": 150, Mathematics: 90, "Earth Science": 60,
    History: 90, Geography: 90, Morality: 90, English: 60,
  },
};

function Browse({ p, lang = "en" }) {
  const [year, setYear] = useState(2023);
  const [viewingPaper, setViewingPaper] = useState(null);
  if (viewingPaper) return <ExamPaperPage paper={viewingPaper} onBack={() => setViewingPaper(null)} />;
  const diffLabel = (d) => (lang === "km" ? { Easy: "ងាយ", Medium: "មធ្យម", Hard: "ពិបាក" }[d] : d);
  return (
    <div className="space-y-5 eai-rise">
      <div>
        <h2 className={`eai-display text-2xl font-extrabold ${lang === "km" ? "eai-km" : ""}`}>{t(lang, "browseTitle")}</h2>
        <p className={`eai-muted text-sm mt-1 ${lang === "km" ? "eai-km" : ""}`}>
          {p.grade === "university" ? t(lang, "universityEntrance") : "BAC II"} · {lang === "km" ? FIELD_META[p.field].km : FIELD_META[p.field].label} {t(lang, "trackWord")} · {t(lang, "officialPapers")} 2010–2026
        </p>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 eai-scroll">
        {YEARS.map((y) => (
          <button key={y} onClick={() => setYear(y)} className="eai-btn eai-focus px-4 py-2 text-sm flex-shrink-0"
            style={{ background: y === year ? "var(--primary)" : "var(--card)", color: y === year ? "#fff" : "var(--ink)", border: y === year ? "none" : "1px solid var(--line)" }}>
            {y}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...p.subjects].sort((a, b) => (a.tag === "weak" ? -1 : b.tag === "weak" ? 1 : 0)).map((sub) => {
          const diff = levelToDifficulty(sub.level);
          const dc = diff === "Hard" ? "var(--ember)" : diff === "Medium" ? "var(--gold)" : "var(--jade)";
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
              <p className="text-xs eai-muted mt-0.5">BAC II {year} · {SUBJECT_DURATION_MIN[p.field]?.[sub.s] ?? 180} {t(lang, "minAbbrev")} · {SUBJECT_FULL_MARKS[p.field]?.[sub.s] ?? 100} {t(lang, "marksWord")}</p>
              <div className="flex items-center gap-2 mt-3">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: "var(--bg-soft)", color: dc }}>{diffLabel(diff)}</span>
                <span className={`text-xs eai-muted ${lang === "km" ? "eai-km" : ""}`}>{sub.m != null ? `${t(lang, "matchesLevel")} ${lang === "km" ? levelLabel(sub.level, lang) : sub.level.toLowerCase()}` : t(lang, "answerSheetReady")}</span>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => {
                    const images = EXAM_PAPER_IMAGES[`${sub.s}-${year}`];
                    if (images) setViewingPaper({ title: `${sub.s} · BAC II ${year}`, images });
                  }}
                  className={`eai-btn eai-focus flex-1 text-sm py-2 flex items-center justify-center gap-1.5 text-white ${lang === "km" ? "eai-km" : ""}`} style={{ background: "var(--primary)" }}>
                  <Eye size={14} /> {t(lang, "viewWord")}
                </button>
                <button className="eai-btn eai-focus text-sm py-2 px-3 eai-soft flex items-center justify-center" style={{ color: "var(--ink)" }}><Download size={14} /></button>
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
    { topic: "Cell biology", topicKm: "ជីវវិទ្យាកោសិកា", difficulty: "Easy",
      prompt: "Which organelle is the 'powerhouse of the cell'?", promptKm: "តើសរីរាង្គណាមួយត្រូវបានហៅថា 'រោងចក្រថាមពលនៃកោសិកា'?",
      options: ["Mitochondria", "Nucleus", "Ribosome", "Golgi body"], answer: "Mitochondria",
      optionsKm: ["មីតូខនឌ្រី", "នុយក្លេអ៊ុស", "រីបូសូម", "ហ្គោលហ្ស៊ីបូឌី"], answerKm: "មីតូខនឌ្រី",
      explanation: "Mitochondria generate most of the cell's ATP through respiration.", explanationKm: "មីតូខនឌ្រី(Mitochondria) បង្កើត ATP ភាគច្រើនរបស់កោសិកាតាមរយៈការដកដង្ហើមកោសិកា។",
      formula: "Key concept: respiration produces ATP in the mitochondria", formulaKm: "គោលគំនិតសំខាន់៖ ការដកដង្ហើមកោសិកាបង្កើត ATP នៅក្នុងមីតូខនឌ្រី" },
    { topic: "Genetics", topicKm: "សន្ដតិវិទ្យា", difficulty: "Medium",
      prompt: "Crossing Aa × Aa gives what dominant : recessive ratio?", promptKm: "ការបំពាល់ Aa × Aa ផ្តល់សមាមាត្រលក្ខណៈលេចធ្លោ : លក្ខណៈកប់កំបាំង ជាប៉ុន្មាន?",
      options: ["3 : 1", "1 : 1", "9 : 3 : 3 : 1", "1 : 2 : 1"], answer: "3 : 1",
      explanation: "The Punnett square gives genotypes 1 AA : 2 Aa : 1 aa, so phenotypes are 3 dominant : 1 recessive.",
      explanationKm: "តារាង Punnett ផ្តល់ហ្សែនកូន 1 AA : 2 Aa : 1 aa ដូច្នេះលក្ខណៈខាងក្រៅគឺ 3 លេចធ្លោ : 1 កប់កំបាំង។",
      formula: "Use a Punnett square for a monohybrid cross", formulaKm: "ប្រើតារាង Punnett សម្រាប់ការបំពាល់ឯកកូនកាត់" },
    { topic: "Photosynthesis", topicKm: "ការសំយោគពន្លឺ", difficulty: "Easy",
      prompt: "Which gas is released during photosynthesis?", promptKm: "តើឧស្ម័នអ្វីត្រូវបានបញ្ចេញកំឡុងពេលសំយោគពន្លឺ?",
      options: ["Oxygen", "Carbon dioxide", "Nitrogen", "Hydrogen"], answer: "Oxygen",
      optionsKm: ["អុកសីសែន", "កាបូនឌីអុកស៊ីត", "អាសូត", "អ៊ីដ្រូសែន"], answerKm: "អុកសីសែន",
      explanation: "Plants take in CO₂ and release O₂: 6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂.", explanationKm: "រុក្ខជាតិស្រូបយក CO₂ ហើយបញ្ចេញ O₂៖ 6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂។",
      formula: "Equation: 6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂", formulaKm: "សមីការ៖ 6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂" },
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
      formula: "Key fact: Angkor Wat ≈ early 1100s, Suryavarman II", formulaKm: "ចំណុចសំខាន់៖ អង្គរវត្ត ≈ ដើមទសវត្សរ៍ ១១០០ សូរ្យវរ្ម័នទី២" },
    { topic: "Khmer Empire", topicKm: "អាណាចក្រខ្មែរ", difficulty: "Easy",
      prompt: "What was the capital of the Khmer Empire at its height?", promptKm: "តើរាជធានីរបស់អាណាចក្រខ្មែរនៅសម័យរុងរឿងបំផុតគឺទីណា?",
      options: ["Angkor", "Phnom Penh", "Oudong", "Longvek"], answer: "Angkor",
      optionsKm: ["អង្គរ", "ភ្នំពេញ", "ឧដុង្គ", "លង្វែក"], answerKm: "អង្គរ",
      explanation: "Angkor was the empire's capital during its golden age.", explanationKm: "អង្គរជារាជធានីនៃអាណាចក្រក្នុងសម័យមាសរបស់ខ្លួន។",
      formula: "Key fact: Angkor was the imperial capital", formulaKm: "ចំណុចសំខាន់៖ អង្គរជារាជធានីនៃអាណាចក្រ" },
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
  const list = getExercises(subject, lang);
  const [idx, setIdx] = useState(null);

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
        onNext={list.length > 1 ? () => setIdx(pickNext(idx)) : null} lang={lang} />
    );
  }

  const doneN = list.filter((ex) => practice[ex.id]?.status === "completed").length;
  const pct = list.length ? Math.round((doneN / list.length) * 100) : 0;

  return (
    <div className="space-y-5 eai-rise">
      <button onClick={onBack} className={`eai-focus flex items-center gap-1 text-sm eai-muted ${lang === "km" ? "eai-km" : ""}`}><ChevronLeft size={16} /> {t(lang, "allSubjects")}</button>
      <div className="eai-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className={`eai-display text-2xl font-extrabold ${lang === "km" ? "eai-km" : ""}`}>{subjectLabel(subject, lang)}</h2>
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

function ExercisePlayer({ ex, entry, subject, index, total, tier, banner, onAnswer, onSetStatus, onBack, onNext, lang = "en" }) {
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
            className={`eai-btn eai-focus w-full mt-5 py-3 text-sm text-white ${lang === "km" ? "eai-km" : ""}`} style={{ background: "var(--primary)", opacity: choice == null || String(choice).trim() === "" ? 0.5 : 1 }}>
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

            {/* Formula / approach */}
            <div className="p-4 rounded-2xl" style={{ background: "var(--primary-soft)" }}>
              <div className="flex items-center gap-2 mb-1.5"><Brain size={15} style={{ color: "var(--primary)" }} /><span className={`text-xs font-bold eai-display ${lang === "km" ? "eai-km" : ""}`} style={{ color: "var(--primary)" }}>{t(lang, "formulaApproach")}</span></div>
              <p className="text-sm font-semibold" style={{ color: "var(--primary)" }}>{ex.formula}</p>
            </div>

            {/* Recommendation */}
            <p className={`text-sm eai-muted leading-relaxed ${lang === "km" ? "eai-km" : ""}`}>
              {correct ? t(lang, onNext ? "recCorrectMore" : "recCorrectLast") : t(lang, "recIncorrect")}
            </p>

            <div className="flex flex-wrap gap-2 pt-1">
              {!correct && (
                <button onClick={retry} className={`eai-btn eai-focus py-2.5 px-4 text-sm flex items-center gap-1.5 eai-soft ${lang === "km" ? "eai-km" : ""}`} style={{ color: "var(--ink)" }}>
                  <RotateCcw size={15} /> {t(lang, "tryAgain")}
                </button>
              )}
              {onNext && (
                <button onClick={next} className={`eai-btn eai-focus py-2.5 px-4 text-sm text-white flex items-center gap-1.5 ${lang === "km" ? "eai-km" : ""}`} style={{ background: "var(--primary)" }}>
                  {t(lang, "nextExercise")} <ChevronRight size={15} />
                </button>
              )}
              <button onClick={onBack} className={`eai-btn eai-focus py-2.5 px-4 text-sm eai-soft ${lang === "km" ? "eai-km" : ""}`} style={{ color: "var(--ink)" }}>{t(lang, "backToList")}</button>
            </div>
          </div>
        )}
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
                  <button onClick={() => answer("confident")} className={`eai-btn eai-focus py-3 text-sm font-semibold text-white ${lang === "km" ? "eai-km" : ""}`} style={{ background: "var(--jade)" }}>😎 {t(lang, "confidentWord")}</button>
                  <button onClick={() => answer("guess")} className={`eai-btn eai-focus py-3 text-sm font-semibold ${lang === "km" ? "eai-km" : ""}`} style={{ background: "var(--bg-soft)", color: "var(--ink)" }}>🤔 {t(lang, "guessedWord")}</button>
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

          <button onClick={onComplete} className={`eai-btn eai-focus w-full mt-5 py-3 text-sm text-white flex items-center justify-center gap-2 ${lang === "km" ? "eai-km" : ""}`} style={{ background: "var(--primary)" }}>
            <Sparkles size={16} /> {t(lang, "goToDashboard")} <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* Per-university entrance exam content: official practice sets + commonly-seen exercises. */
const UNI_DETAIL = {
  RUPP: {
    exam: "Entrance & Scholarship Exam", examKm: "ការប្រឡងចូល និងអាហារូបករណ៍",
    sets: [
      { title: "Entrance Mock — Full Paper", subject: "Mixed", q: 80, diff: "Hard" },
      { title: "Scholarship Aptitude Test", subject: "Reasoning", q: 40, diff: "Medium" },
      { title: "English Proficiency Set", subject: "English", q: 50, diff: "Medium" },
    ],
    common: [
      { topic: "Quadratic equations & functions", subject: "Mathematics", freq: "Frequently" },
      { topic: "Academic reading comprehension", subject: "English", freq: "Frequently" },
      { topic: "Essay: contemporary Cambodian society", subject: "Khmer Literature", freq: "Often" },
      { topic: "Logical reasoning puzzles", subject: "Reasoning", freq: "Often" },
      { topic: "Current affairs & general knowledge", subject: "General", freq: "Sometimes" },
    ],
  },
  ITC: {
    exam: "Engineering Entrance Exam", examKm: "ការប្រឡងចូលផ្នែកវិស្វកម្ម",
    sets: [
      { title: "Mathematics Entrance Paper", subject: "Mathematics", q: 40, diff: "Hard" },
      { title: "Physics Problem Set", subject: "Physics", q: 35, diff: "Hard" },
      { title: "Chemistry Fundamentals", subject: "Chemistry", q: 30, diff: "Medium" },
    ],
    common: [
      { topic: "Derivatives & integrals", subject: "Mathematics", freq: "Frequently" },
      { topic: "Kinematics & Newton's laws", subject: "Physics", freq: "Frequently" },
      { topic: "Vectors & trigonometry", subject: "Mathematics", freq: "Often" },
      { topic: "Stoichiometry & the mole", subject: "Chemistry", freq: "Often" },
      { topic: "Electric circuits basics", subject: "Physics", freq: "Sometimes" },
    ],
  },
  AUPP: {
    exam: "Admissions & English Placement", examKm: "ការចូលរៀន និងតេស្តកម្រិតភាសាអង់គ្លេស",
    sets: [
      { title: "English Placement Test", subject: "English", q: 60, diff: "Medium" },
      { title: "Critical Reading & Writing", subject: "English", q: 45, diff: "Medium" },
      { title: "Quantitative Aptitude (SAT-style)", subject: "Mathematics", q: 40, diff: "Medium" },
    ],
    common: [
      { topic: "Essay writing & argumentation", subject: "English", freq: "Frequently" },
      { topic: "Sentence correction & grammar", subject: "English", freq: "Frequently" },
      { topic: "Data interpretation & word problems", subject: "Mathematics", freq: "Often" },
      { topic: "Vocabulary in context", subject: "English", freq: "Often" },
      { topic: "Algebra & percentages", subject: "Mathematics", freq: "Sometimes" },
    ],
  },
  NUM: {
    exam: "Business & Management Entrance", examKm: "ការប្រឡងចូលពាណិជ្ជកម្ម និងគ្រប់គ្រង",
    sets: [
      { title: "Math for Business Paper", subject: "Mathematics", q: 40, diff: "Medium" },
      { title: "English for Business", subject: "English", q: 50, diff: "Medium" },
      { title: "Logical & Numerical Reasoning", subject: "Reasoning", q: 35, diff: "Medium" },
    ],
    common: [
      { topic: "Percentages, interest & ratios", subject: "Mathematics", freq: "Frequently" },
      { topic: "Reading & business vocabulary", subject: "English", freq: "Frequently" },
      { topic: "Data tables & graph reading", subject: "Reasoning", freq: "Often" },
      { topic: "Basic statistics & averages", subject: "Mathematics", freq: "Often" },
      { topic: "Short essay: economy & society", subject: "English", freq: "Sometimes" },
    ],
  },
  RULE: {
    exam: "Law & Economics Entrance", examKm: "ការប្រឡងចូលនីតិសាស្ត្រ និងសេដ្ឋកិច្ច",
    sets: [
      { title: "Khmer Essay & Comprehension", subject: "Khmer Literature", q: 30, diff: "Medium" },
      { title: "General Knowledge & Civics", subject: "General", q: 50, diff: "Medium" },
      { title: "Logical Reasoning for Law", subject: "Reasoning", q: 40, diff: "Hard" },
    ],
    common: [
      { topic: "Argumentative essay (Khmer)", subject: "Khmer Literature", freq: "Frequently" },
      { topic: "Constitution & civic knowledge", subject: "General", freq: "Frequently" },
      { topic: "Critical reasoning & inference", subject: "Reasoning", freq: "Often" },
      { topic: "Current legal & social affairs", subject: "General", freq: "Often" },
      { topic: "Economics fundamentals", subject: "General", freq: "Sometimes" },
    ],
  },
  CADT: {
    exam: "Digital Technology Entrance", examKm: "ការប្រឡងចូលបច្ចេកវិទ្យាឌីជីថល",
    sets: [
      { title: "Mathematics Diagnostic", subject: "Mathematics", q: 35, diff: "Medium" },
      { title: "Computing & Logic Set", subject: "Reasoning", q: 30, diff: "Medium" },
      { title: "English & Comprehension Combined", subject: "English", q: 45, diff: "Medium" },
    ],
    common: [
      { topic: "Functions & graphs", subject: "Mathematics", freq: "Frequently" },
      { topic: "Algorithmic & logical thinking", subject: "Reasoning", freq: "Frequently" },
      { topic: "Reading comprehension", subject: "English", freq: "Often" },
      { topic: "Probability & statistics basics", subject: "Mathematics", freq: "Often" },
      { topic: "Number sequences & patterns", subject: "Reasoning", freq: "Sometimes" },
    ],
  },
  UHS: {
    exam: "Health Sciences Entrance", examKm: "ការប្រឡងចូលវិទ្យាសាស្ត្រសុខាភិបាល",
    sets: [
      { title: "Biology Diagnostic", subject: "Biology", q: 40, diff: "Hard" },
      { title: "Chemistry Concepts Set", subject: "Chemistry", q: 35, diff: "Hard" },
      { title: "Mathematics & Physics Combined", subject: "Mathematics", q: 30, diff: "Medium" },
    ],
    common: [
      { topic: "Human anatomy & physiology", subject: "Biology", freq: "Frequently" },
      { topic: "Organic chemistry basics", subject: "Chemistry", freq: "Frequently" },
      { topic: "Cell biology & genetics", subject: "Biology", freq: "Often" },
      { topic: "Chemical reactions & equations", subject: "Chemistry", freq: "Often" },
      { topic: "Applied mathematics for sciences", subject: "Mathematics", freq: "Sometimes" },
    ],
  },
};

const diffColor = (d) => (d === "Hard" ? "var(--ember)" : d === "Medium" ? "var(--gold)" : "var(--jade)");
const freqColor = (f) => (f === "Frequently" ? "var(--ember)" : f === "Often" ? "var(--gold)" : "var(--muted)");

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
    <div className="grid place-items-center rounded-xl flex-shrink-0 p-2 overflow-hidden" style={{ width: size, height: size, background: "var(--bg-soft)" }}>
      <img src={uni.logo} alt={`${uni.abbr} logo`} className="max-w-full max-h-full w-auto h-auto min-w-0 min-h-0 object-contain" onError={() => setFailed(true)} />
    </div>
  );
}

function UniversityDetail({ uni, onBack, lang = "en" }) {
  const d = UNI_DETAIL[uni.abbr] || { exam: "Entrance Exam", examKm: "ការប្រឡងចូល", sets: [], common: [] };
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
          <p className={`text-xs eai-muted mt-0.5 ${lang === "km" ? "eai-km" : ""}`}>{lang === "km" ? d.examKm : d.exam} · {t(lang, "readinessWord")} {uni.ready}%</p>
        </div>
      </div>

      {/* Majors offered */}
      <Majors abbr={uni.abbr} color={uni.c} lang={lang} />

      {/* Published practice sets */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <FileText size={17} style={{ color: "var(--primary)" }} />
          <h3 className={`eai-display font-bold ${lang === "km" ? "eai-km" : ""}`}>{t(lang, "publishedSets")}</h3>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${lang === "km" ? "eai-km" : ""}`} style={{ background: "var(--primary-soft)", color: "var(--primary)" }}>{t(lang, "officialWord")}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {d.sets.map((s, i) => (
            <div key={i} className="eai-card eai-tile p-5">
              <div className="flex items-center justify-between">
                <div className="grid place-items-center rounded-xl" style={{ width: 38, height: 38, background: "var(--primary-soft)" }}>
                  <ClipboardCheck size={18} style={{ color: "var(--primary)" }} />
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: "var(--bg-soft)", color: diffColor(s.diff) }}>{s.diff}</span>
              </div>
              <h4 className="eai-display font-bold mt-3 text-sm">{s.title}</h4>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-xs px-2 py-0.5 rounded-full eai-soft eai-muted">{s.subject}</span>
                <span className="text-xs eai-muted flex items-center gap-1"><Clock size={12} /> {s.q} Q</span>
              </div>
              <button className={`eai-btn eai-focus w-full mt-4 py-2 text-sm text-white flex items-center justify-center gap-1.5 ${lang === "km" ? "eai-km" : ""}`} style={{ background: "var(--primary)" }}>
                <Eye size={14} /> {t(lang, "startSet")}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Common exercises */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Repeat size={17} style={{ color: "var(--gold)" }} />
          <h3 className={`eai-display font-bold ${lang === "km" ? "eai-km" : ""}`}>{t(lang, "commonExercises")}</h3>
        </div>
        <div className="eai-card divide-y" style={{ borderColor: "var(--line)" }}>
          {d.common.map((c, i) => (
            <div key={i} className="flex items-center gap-3 p-4" style={{ borderColor: "var(--line)" }}>
              <div className="grid place-items-center rounded-xl flex-shrink-0" style={{ width: 34, height: 34, background: "var(--bg-soft)" }}>
                <Target size={16} style={{ color: freqColor(c.freq) }} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate">{c.topic}</p>
                <span className="text-xs px-2 py-0.5 rounded-full eai-soft eai-muted">{c.subject}</span>
              </div>
              <span className="text-xs font-semibold flex-shrink-0" style={{ color: freqColor(c.freq) }}>{c.freq}</span>
              <button className={`eai-btn eai-focus text-xs py-1.5 px-3 eai-soft flex-shrink-0 hidden sm:block ${lang === "km" ? "eai-km" : ""}`} style={{ color: "var(--ink)" }}>{t(lang, "navPractice")}</button>
            </div>
          ))}
        </div>
        <p className={`text-xs eai-muted mt-2 ${lang === "km" ? "eai-km" : ""}`}>{t(lang, "frequencyNote")}</p>
      </div>
    </div>
  );
}

function Universities({ lang = "en" }) {
  const [selected, setSelected] = useState(null);
  if (selected) return <UniversityDetail uni={selected} onBack={() => setSelected(null)} lang={lang} />;
  return (
    <div className="space-y-5 eai-rise">
      <div>
        <h2 className={`eai-display text-2xl font-extrabold ${lang === "km" ? "eai-km" : ""}`}>{t(lang, "universitiesTitle")}</h2>
        <p className={`eai-muted text-sm mt-1 ${lang === "km" ? "eai-km" : ""}`}>{t(lang, "universitiesDesc")}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {UNIS.map((u) => (
          <button key={u.abbr} onClick={() => setSelected(u)} className="eai-card eai-tile eai-focus p-5 flex items-center gap-4 text-left w-full">
            <UniLogo uni={u} size={64} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2"><GraduationCap size={16} style={{ color: u.c }} /><span className="eai-display font-bold">{u.abbr}</span></div>
              <p className={`text-sm truncate mt-0.5 ${lang === "km" ? "eai-km" : ""}`}>{lang === "km" ? u.nKm : u.n}</p>
              <p className={`text-xs eai-muted mt-0.5 ${lang === "km" ? "eai-km" : ""}`}>{t(lang, "viewPracticeSets")}</p>
            </div>
            <ChevronRight size={18} className="eai-muted" />
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

function Progress({ p, practice = {}, bonusXp = 0, lang = "en" }) {
  const xp = p.xp + bonusXp;
  const [openSubject, setOpenSubject] = useState(null);

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
            action={<Pill icon={Clock} color="var(--primary)" soft="var(--primary-soft)" value="4.2h" label={t(lang, "thisWeek")} />} />
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={WEEK_SEED} margin={{ top: 5, right: 5, left: -22, bottom: 0 }}>
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

/* Free hosting tiers stop the API when it is idle, so the first request after a quiet spell waits
   for it to boot — or is refused while it boots. Say so rather than looking stuck, and retry once
   before falling back to the offline reply. Streaming a query is read-only, so a retry is safe. */
const COLD_START_MS = 5000;
const COLD_START_RETRY_MS = 4000;
const WAKING = "Waking the AI coach server (this can take a minute after it has been idle)…";

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
  let text = "";
  let stopReason = null;
  let sources = [];
  let finished = false;
  let frame = 0;
  const flush = () => { frame = 0; onUpdate({ text, rag: true, streaming: true, sources, notice: null }); };
  const status = (notice) => { if (!text) onUpdate({ text, rag: true, streaming: true, sources, notice }); };
  const lost = "The connection to the AI coach server was lost.";
  try {
    status(images.length ? STAGE_LABELS.reading_images : STAGE_LABELS.searching);
    const res = await ragStreamRequest(
      JSON.stringify({
        prompt: t,
        history: toRagHistory(history),
        images: images.map(({ data, mime_type, name }) => ({ data, mime_type, name })),
      }),
      { signal, status },
    );
    try {
      for await (const event of readNdjson(res)) {
        if (event.type === "status") status(STAGE_LABELS[event.stage]);
        else if (event.type === "images") onImages?.(event.images);
        else if (event.type === "meta") sources = event.sources || [];
        else if (event.type === "delta") {
          text += event.text;
          if (!frame) frame = requestAnimationFrame(flush);
        } else if (event.type === "reset") {
          // The server is restarting the answer with another model.
          text = "";
          cancelAnimationFrame(frame);
          frame = 0;
          onUpdate({ text, rag: true, streaming: true, sources, notice: "Switching to another model…" });
        } else if (event.type === "error") throw new RagError(event.detail, event.status);
        else if (event.type === "done") { finished = true; stopReason = event.stop_reason; }
      }
    } catch (err) {
      throw err instanceof RagError || signal?.aborted ? err : new RagError(lost, 0);
    }
    if (!finished) throw new RagError(lost, 0);
    if (TRUNCATED_STOPS.has(stopReason)) text += "\n\n*(The answer reached its length limit. Ask me to continue.)*";
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
    cancelAnimationFrame(frame);
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

/* The prompt asks for $...$ / $$...$$, but models sometimes emit \( \) or \[ \]. */
const normalizeMath = (text) => outsideCode(text, (part) => fenceDisplayMath(part
  .replace(/\\\[([\s\S]+?)\\\]/g, (_, body) => `\n$$\n${body.trim()}\n$$\n`)
  .replace(/\\\(([\s\S]+?)\\\)/g, (_, body) => `$${body.trim()}$`)));

/* While an answer is still arriving, hide a trailing unclosed $$ block or code fence so half a
   formula or graph never flashes on screen. */
const hideUnclosed = (text, marker) => {
  const parts = text.split(marker);
  return parts.length % 2 === 0 ? parts.slice(0, -1).join(marker) : text;
};

/* ── GeoGebra figures: ```geogebra / ```geogebra-3d blocks (see prompts.py rule 5) ── */
const GGB_SCRIPT = "https://www.geogebra.org/apps/deployggb.js";
const GGB_MAX_LINES = 30;
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

function GeoGebraFigure({ code, is3d }) {
  const [ids] = useState(() => { ggbCounter += 1; return { container: `ggb-box-${ggbCounter}`, applet: `ggbApplet${ggbCounter}` }; });
  const ref = useRef(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadGeoGebra().then(() => {
      if (cancelled || !ref.current) return;
      const commands = geogebraCommands(code);
      const applet = new window.GGBApplet({
        id: ids.applet,
        appName: is3d ? "3d" : "graphing",
        width: Math.max(260, ref.current.clientWidth), height: 340,
        showToolBar: false, showAlgebraInput: false, showMenuBar: false,
        showResetIcon: true, enableShiftDragZoom: true, showZoomButtons: true, enableRightClick: false,
        appletOnLoad: (api) => commands.forEach((command) => {
          try { api.evalCommand(command); } catch { /* skip a bad line, keep the rest */ }
        }),
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
  return <div id={ids.container} ref={ref} style={{ width: 520, maxWidth: "100%", height: 340, borderRadius: 12, overflow: "hidden", background: "#fff" }} />;
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

const KATEX_OPTIONS = { throwOnError: false, strict: false }; // Khmer inside math only warns
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

/* Numbered like the passages the model cites as [1], [2], … */
function SourceList({ sources }) {
  if (!sources?.length) return null;
  return (
    <details className="mt-2 text-xs eai-muted">
      <summary style={{ cursor: "pointer" }}>Sources ({sources.length})</summary>
      <ol className="mt-1 space-y-0.5">
        {sources.map((s, i) => (
          <li key={s.id}>[{i + 1}] {s.title || s.source}{s.page != null ? ` · p. ${s.page}` : ""}</li>
        ))}
      </ol>
    </details>
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
            {m.rag && <SourceList sources={m.sources} />}
          </div>
        )}
      </div>
    </div>
  );
}

function Coach({ p }) {
  const [mode, setMode] = useState("study");
  const [msgsByMode, setMsgsByMode] = useState({ study: [], major: [] });
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
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
    const docs = files.filter((f) => !isImageFile(f));
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
          {Object.entries(COACH_MODES).map(([id, m]) => (
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
                      <button role="menuitem" onClick={() => { setMenuOpen(false); docRef.current?.click(); }} disabled={uploading}>
                        <FileUp size={17} />
                        <span><span className="block font-medium">Add to study library</span><span className="block text-xs eai-muted">PDF, notes or scans the coach can search</span></span>
                      </button>
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

      {dragging && <div className="eai-drop"><div className="flex items-center gap-2 font-semibold"><ImagePlus size={20} /> Drop photos to ask about them, or documents to add to your library</div></div>}
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
      "ក្រដាសប្រឡង BAC II ចាស់ៗ",
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

function SuperBondus({ lang = "en" }) {
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
          <p className={`eai-muted text-sm mt-0.5 ${lang === "km" ? "eai-km" : ""}`}>{t(lang, "superBondusDesc")}</p>
        </div>
      </div>

      {upgraded ? (
        <div className="eai-card p-6 flex items-start gap-3" style={{ borderColor: "var(--gold)" }}>
          <CheckCircle2 size={20} style={{ color: "var(--jade)", flexShrink: 0, marginTop: 2 }} />
          <div>
            <p className={`font-semibold ${lang === "km" ? "eai-km" : ""}`}>
              {upgraded.id === "free" ? t(lang, "allSet") : `${t(lang, "thanksUpgrade")} ${lang === "km" ? upgraded.labelKm : upgraded.label}!`}
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
            {SUPER_PLANS.map((plan) => {
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
                    <span className={`eai-display font-bold ${lang === "km" ? "eai-km" : ""}`}>{lang === "km" ? plan.labelKm : plan.label}</span>
                    {on && <CheckCircle2 size={18} style={{ color: "var(--gold)" }} />}
                  </div>
                  <p className="mt-2"><span className="eai-display text-2xl font-extrabold">{plan.price}</span> <span className={`text-sm eai-muted ${lang === "km" ? "eai-km" : ""}`}>{lang === "km" ? (plan.periodKm ?? plan.period) : plan.period}</span></p>
                  <p className={`text-xs eai-muted mt-1 ${lang === "km" ? "eai-km" : ""}`}>{lang === "km" ? plan.taglineKm : plan.tagline}</p>
                  <ul className="mt-4 space-y-2 flex-1">
                    {(lang === "km" ? plan.featuresKm : plan.features).map((f) => (
                      <li key={f} className={`flex items-start gap-2 text-xs eai-muted leading-relaxed ${lang === "km" ? "eai-km" : ""}`}>
                        <CheckCircle2 size={13} style={{ color: "var(--gold)", flexShrink: 0, marginTop: 1.5 }} /> {f}
                      </li>
                    ))}
                  </ul>
                  <button onClick={(e) => { e.stopPropagation(); setUpgraded(plan); }}
                    className={`eai-btn eai-focus w-full mt-5 py-2.5 text-sm flex items-center justify-center gap-2 ${lang === "km" ? "eai-km" : ""}`}
                    style={{ background: plan.best ? "var(--gold)" : "var(--card)", color: plan.best ? "#fff" : "var(--ink)", border: plan.best ? "none" : "1px solid var(--line)" }}>
                    {lang === "km" ? plan.buttonKm : plan.button} <ArrowRight size={14} />
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
  { id: "languages", label: "Languages", labelKm: "ភាសាបរទេស", icon: Globe },
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
    navPractice: "Practice", navUniversities: "Universities", navProgress: "Progress",
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
    langHubSubtitle: "Diagnostic-driven roadmaps and unlimited AI mock tests with skill-by-skill scoring.",
    takeDiagnostic: "Take diagnostic", retakeDiagnostic: "Retake diagnostic", comingSoon: "Coming soon",
    // Browse
    browseTitle: "Browse exams", universityEntrance: "University entrance", trackWord: "track", officialPapers: "official papers",
    recommendedForYou: "Recommended for you", minAbbrev: "min", marksWord: "marks",
    matchesLevel: "Matches your", answerSheetReady: "Answer sheet ✓", viewWord: "View",
    // Practice
    practiceTitle: "Practice & mock exams",
    practiceDesc: "Pick a subject. Every exercise is auto-corrected with an explanation and the formula to use, and you can mark each one Pending, In progress, or Completed.",
    focusArea: "Focus area", exercisesAutoGraded: "exercises · auto-graded", completedWord: "completed",
    allSubjects: "All subjects", exercisesWord: "exercises", reviewWord: "Review", solveWord: "Solve",
    status_pending: "Pending", status_in_progress: "In progress", status_completed: "Completed",
    exerciseXofY: "Exercise {i} of {n}", adaptiveWord: "Adaptive",
    typeAnswer: "Type your answer…", checkAnswer: "Check answer",
    whyMissed: "Why do you think you missed this? (optional)", skipWord: "Skip",
    correctXp: "Correct! +30 XP", notQuite: "Not quite", correctAnswerIs: "Correct answer:",
    explanationWord: "Explanation", formulaApproach: "Formula / approach to use",
    recCorrectMore: "Nice — you applied the right method. Keep the momentum and try the next one.",
    recCorrectLast: "Nice — you applied the right method. That's the last exercise in this set!",
    recIncorrect: "Re-read the formula above and how it maps to the question, then tap Try again — you've got this.",
    tryAgain: "Try again", nextExercise: "Next exercise", backToList: "Back to list",
    // Universities
    universitiesTitle: "University & scholarship prep",
    universitiesDesc: "Tap a university to see its published practice sets and common exam exercises.",
    viewPracticeSets: "View practice sets & common exercises", allUniversities: "All universities",
    readinessWord: "readiness", publishedSets: "Published practice sets", officialWord: "Official", startSet: "Start set",
    commonExercises: "Common exercises in this exam", frequencyNote: "Frequency reflects how often each topic has appeared in recent past papers.",
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
    // Register
    createAccountTitle: "Create your account", createAccountDesc: "A few details so your AI coach and study plan fit you.",
    fullNameLabel: "Full name", ageLabel: "Age", gradeLevelLabel: "Grade level",
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
    navPractice: "លំហាត់អនុវត្ត", navUniversities: "សាកលវិទ្យាល័យ", navProgress: "វឌ្ឍនភាព",
    // Dashboard
    dashGreetingPrefix: "សូមស្វាគមន៍,",
    dashStartPlan: "ចាប់ផ្តើមផែនការថ្ងៃនេះ", dashAskCoach: "សួរគ្រូបង្វឹក AI",
    dashTodayPlan: "ផែនការសិក្សាថ្ងៃនេះ", dashDone: "បានធ្វើរួច",
    dashStreak: "ថ្ងៃជាប់គ្នា · បន្តរក្សា",
    dashExplore: "ស្វែងយល់បន្ថែម",
    unlockBannerTitle: "ដោះសោផែនការសិក្សាផ្ទាល់ខ្លួនរបស់អ្នក",
    unlockBannerDesc: "បំពេញការធ្វើតេស្តវាយតម្លៃ ២០សំណួរ ដើម្បីទទួលបាន៖",
    startAssessment: "ចាប់ផ្តើមតេស្តវាយតម្លៃ",
    heroMessage: "ជំហានតូចមួយថ្ងៃនេះជួយរក្សានិន្នាការឲ្យបន្ត — នេះជាអ្វីដែលបន្ទាប់សម្រាប់អ្នក។",
    recommendedNextLesson: "មេរៀនបន្ទាប់ដែលបានណែនាំ", lessonWord: "មេរៀន", startLesson: "ចាប់ផ្តើមមេរៀន",
    toLevel: "XP ទៅកម្រិត", targetsWeakest: "ផ្តោតលើប្រធានបទខ្សោយបំផុតរបស់អ្នក",
    exploreSharpen: "ពង្រឹងមុខវិជ្ជាខ្សោយរបស់អ្នក", exploreBrowseMajors: "រកមើលជំនាញ និងការត្រៀមប្រឡងចូល", exploreStats: "ស្ថិតិ និងការវិភាគពេញលេញរបស់អ្នក",
    exploreBrowsePast: "ក្រដាសប្រឡងផ្លូវការតាមឆ្នាំ",
    // Language hub
    langHubTitle: "មជ្ឈមណ្ឌលភាសាអន្តរជាតិ",
    langHubSubtitle: "ផែនទីបង្ហាញផ្លូវផ្អែកលើការធ្វើតេស្តវាយតម្លៃ និងតេស្តសាកល្បង AI មិនកំណត់ ជាមួយពិន្ទុសម្រាប់ជំនាញនីមួយៗ។",
    takeDiagnostic: "ធ្វើតេស្តវាយតម្លៃ", retakeDiagnostic: "ធ្វើតេស្តវាយតម្លៃម្តងទៀត", comingSoon: "មកដល់ឆាប់ៗនេះ",
    // Browse
    browseTitle: "រកមើលកម្រងសំណួរប្រឡង", universityEntrance: "ប្រឡងចូលសាកលវិទ្យាល័យ", trackWord: "ផ្នែក", officialPapers: "ក្រដាសប្រឡងផ្លូវការ",
    recommendedForYou: "បានណែនាំសម្រាប់អ្នក", minAbbrev: "នាទី", marksWord: "ពិន្ទុ",
    matchesLevel: "ត្រូវនឹងកម្រិត", answerSheetReady: "សន្លឹកចម្លើយ ✓", viewWord: "មើល",
    // Practice
    practiceTitle: "លំហាត់អនុវត្ត និងតេស្តសាកល្បង",
    practiceDesc: "ជ្រើសរើសមុខវិជ្ជាមួយ។ លំហាត់នីមួយៗត្រូវបានកែដោយស្វ័យប្រវត្តិជាមួយការពន្យល់ និងរូបមន្តត្រូវប្រើ ហើយអ្នកអាចសម្គាល់វាថា កំពុងរង់ចាំ កំពុងធ្វើ ឬបានបញ្ចប់។",
    focusArea: "ផ្នែកត្រូវផ្តោត", exercisesAutoGraded: "លំហាត់ · ដាក់ពិន្ទុស្វ័យប្រវត្តិ", completedWord: "បានបញ្ចប់",
    allSubjects: "មុខវិជ្ជាទាំងអស់", exercisesWord: "លំហាត់", reviewWord: "ពិនិត្យឡើងវិញ", solveWord: "ដោះស្រាយ",
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
    universitiesDesc: "ចុចលើសាកលវិទ្យាល័យមួយ ដើម្បីមើលសំណុំលំហាត់ដែលបានចេញផ្សាយ និងលំហាត់ដែលច្រើនតែជួប។",
    viewPracticeSets: "មើលសំណុំលំហាត់ និងលំហាត់ទូទៅ", allUniversities: "សាកលវិទ្យាល័យទាំងអស់",
    readinessWord: "កម្រិតត្រៀមខ្លួន", publishedSets: "សំណុំលំហាត់ដែលបានចេញផ្សាយ", officialWord: "ផ្លូវការ", startSet: "ចាប់ផ្តើមសំណុំលំហាត់",
    commonExercises: "លំហាត់ទូទៅក្នុងការប្រឡងនេះ", frequencyNote: "ភាពញឹកញាប់បង្ហាញពីរបៀបដែលប្រធានបទនីមួយៗបានលេចឡើងក្នុងក្រដាសប្រឡងថ្មីៗ។",
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
    superBondusDesc: "ដោះសោឧបករណ៍ BAC II ពេញលេញ — ការណែនាំដោយ AI មិនកំណត់ ក្រដាសប្រឡងចាស់ៗទាំងអស់ និងការវិភាគស៊ីជម្រៅ។",
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
    // Register
    createAccountTitle: "បង្កើតគណនីរបស់អ្នក", createAccountDesc: "ព័ត៌មានមួយចំនួនដើម្បីឲ្យគ្រូបង្វឹក AI និងផែនការសិក្សាសមស្របនឹងអ្នក។",
    fullNameLabel: "ឈ្មោះពេញ", ageLabel: "អាយុ", gradeLevelLabel: "កម្រិតថ្នាក់",
    grade11: "ថ្នាក់ទី១១", grade12: "ថ្នាក់ទី១២ (BAC II)", targetGradeLabel: "និទ្ទេសគោលដៅ", gradeWord: "និទ្ទេស",
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

export default function App() {
  const saved = useRef(loadSaved()).current;
  const isReturningUser = useRef(Boolean(saved?.profile)).current; // profile already existed in this browser on load — i.e. "logged in" automatically
  const [showWelcomeBack, setShowWelcomeBack] = useState(isReturningUser);
  const [profile, setProfile] = useState(saved?.profile ?? null);
  const [entry, setEntry] = useState("welcome"); // "welcome" | "login" | "create" — which pre-account screen to show when there's no active profile yet
  const [pendingReg, setPendingReg] = useState(null); // registration answers, awaiting the assessment-choice screen
  const [resumeReg, setResumeReg] = useState(null); // { form, step } — re-opens Register at a given step when going Back from AssessmentChoice
  const [showDiagnostic, setShowDiagnostic] = useState(false); // true once they pick "Start Personalized Assessment"
  const [retaking, setRetaking] = useState(false); // true while completing the diagnostic later, from the Dashboard banner
  const [topicMastery, setTopicMastery] = useState(saved?.topicMastery ?? {}); // { [subject]: { [topic]: { history, score, lastPracticedAt } } }
  const [tab, setTab] = useState("dashboard");
  const [dark, setDark] = useState(true);
  const [lang, setLang] = useState("en"); // "en" | "km" — UI language, independent of theme
  const [open, setOpen] = useState(false);
  const [practice, setPractice] = useState(saved?.practice ?? {}); // { [exId]: { status, result, at, subject, topic, xpAwarded } }
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ profile, topicMastery, practice, plan, bonusXp, langResults }));
  }, [profile, topicMastery, practice, plan, bonusXp, langResults]);

  // Logging out clears the active session but deliberately leaves localStorage alone, so "Log in"
  // can restore the same account later by matching the phone number used at signup.
  const handleLogout = () => {
    setProfile(null); setPendingReg(null); setResumeReg(null); setShowDiagnostic(false); setRetaking(false);
    setTopicMastery({}); setPractice({}); setPlan([]); setBonusXp(0); setTab("dashboard"); setEntry("welcome");
  };

  // Matches a phone number against whatever's currently saved in this browser. Returns true/false
  // so the Login screen can show "account not found" inline instead of failing silently.
  const handleLogin = (phone) => {
    const data = loadSaved();
    const clean = phone.replace(/\s+/g, "");
    if (!data?.profile || data.profile.phone?.replace(/\s+/g, "") !== clean) return false;
    setProfile(data.profile);
    setTopicMastery(data.topicMastery ?? {});
    setPractice(data.practice ?? {});
    setPlan(data.plan ?? []);
    setBonusXp(data.bonusXp ?? 0);
    setShowWelcomeBack(true);
    return true;
  };

  // Registration collects answers, then the student chooses to take the diagnostic now or explore
  // first — self-reports alone aren't trusted, but personalization is never required to start.
  const handleRegister = (reg) => { setPendingReg(reg); setResumeReg(null); };
  // "Back" from the step-4 AssessmentChoice screen — re-opens Register at step 3 with prior answers intact.
  const handleBackToPreferences = () => { setResumeReg({ form: pendingReg, step: 2 }); setPendingReg(null); };
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

  // Live insights recompute from topicMastery on every change — this is what makes weak/strong
  // subjects, the recommended lesson, and exam readiness actually update as the student practices.
  const insights = useMemo(() => (profile ? deriveInsights(profile, topicMastery) : null), [profile, topicMastery]);
  const p = useMemo(() => (profile ? { ...profile, ...insights } : null), [profile, insights]);

  // Level up whenever XP crosses the next threshold (can chain multiple levels from one big award).
  useEffect(() => {
    if (!profile) return;
    const totalXp = profile.xp + bonusXp;
    if (totalXp >= profile.xpToNext) {
      setProfile((cur) => {
        let level = cur.level, xpToNext = cur.xpToNext;
        while (cur.xp + bonusXp >= xpToNext) { level += 1; xpToNext = Math.round(xpToNext * 1.35); }
        return { ...cur, level, xpToNext };
      });
    }
  }, [profile, bonusXp]);

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
  const view = {
    dashboard: <Dashboard p={p} go={go} plan={plan} onTogglePlan={togglePlanTask} bonusXp={bonusXp} onStartAssessment={() => setRetaking(true)} onDismissBanner={dismissBanner} lang={lang} />,
    browse: <Browse p={p} lang={lang} />,
    practice: <Practice p={p} practice={practice} onAnswer={handleAnswer} onSetStatus={handleSetStatus} lang={lang} />,
    universities: <Universities lang={lang} />, languages: <Languages results={langResults} onTakeDiagnostic={(name) => setTakingLangTest(name)} lang={lang} />, coach: <Coach p={p} lang={lang} />, progress: <Progress p={p} practice={practice} bonusXp={bonusXp} lang={lang} />,
    super: <SuperBondus lang={lang} />,
  }[tab];

  return (
    <div className={`eai-root ${dark ? "theme-dark" : "theme-light"}`}>
      <style>{STYLES}</style>
      <WelcomeBackToast name={profile.name} show={showWelcomeBack} />
      <div className="flex">
        {open && <div className="fixed inset-0 z-20 lg:hidden" style={{ background: "rgba(0,0,0,.4)" }} onClick={() => setOpen(false)} />}
        <aside className={`fixed lg:sticky top-0 z-30 h-screen w-64 flex-shrink-0 border-r flex flex-col ${open ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
          style={{ background: "var(--card)", borderColor: "var(--line)", transition: "transform .25s ease" }}>
          <div className="p-5 flex items-center gap-2.5">
            <div className="grid place-items-center rounded-xl overflow-hidden" style={{ width: 40, height: 40 }}>
              <BondusLogo />
            </div>
            <div><p className="eai-display font-extrabold leading-none">Bondus Cambodia</p><p className="eai-km text-xs eai-muted">កម្ពុជា · Cambodia</p></div>
          </div>
          <nav className="px-3 space-y-1 flex-1 overflow-y-auto eai-scroll">
            {NAV.map((n) => {
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
              <p className="text-xs font-semibold mt-2">{profile.streak}-day streak</p>
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
                <Pill icon={Flame} color="var(--ember)" soft="var(--ember-soft)" value={profile.streak} label={lang === "km" ? "ថ្ងៃជាប់គ្នា" : "streak"} />
                <Pill icon={Zap} color="var(--gold)" soft="var(--gold-soft)" value={(profile.xp + bonusXp).toLocaleString()} label="XP" />
                <Pill icon={TrendingUp} color="var(--primary)" soft="var(--primary-soft)" value={`Lv ${profile.level}`} label="" />
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <LangToggle lang={lang} setLang={setLang} style={{ width: "auto", height: 38 }} />
                <button onClick={() => setDark((d) => !d)} className="eai-btn eai-focus eai-soft grid place-items-center" style={{ width: 38, height: 38, color: "var(--ink)" }}>
                  {dark ? <Sun size={18} /> : <Moon size={18} />}
                </button>
                <div className="grid place-items-center rounded-full text-sm font-bold text-white" style={{ width: 38, height: 38, background: "var(--primary)" }}>{initials}</div>
              </div>
            </div>
          </header>
          <main className="p-4 sm:p-6 max-w-6xl mx-auto">{view}</main>
        </div>
      </div>
    </div>
  );
}

