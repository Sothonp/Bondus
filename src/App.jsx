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
  ChevronLeft, XCircle, RotateCcw, Trophy, Crown,
} from "lucide-react";

/* ════════════════════════ Configuration / domain data ════════════════════════ */
/* Field-specific subject priorities. Change these lists to extend the curriculum. */
const FIELD_SUBJECTS = {
  science: ["Mathematics", "Physics", "Chemistry", "Biology", "Khmer Literature", "History", "English", "French"],
  social_science: ["Khmer Literature", "History", "Geography", "Morality", "Earth Science", "Mathematics", "English", "French"],
};

const FIELD_META = {
  science: { label: "Science", km: "វិទ្យាសាស្ត្រ", icon: Atom, color: "var(--primary)" },
  social_science: { label: "Social Science", km: "វិទ្យាសាស្ត្រសង្គម", icon: Landmark, color: "var(--gold)" },
};

const EXAM_YEARS = [2026, 2027, 2028];
const STUDY_MINUTES = [30, 45, 60, 90, 120];
const MISTAKE_TYPES = [
  "Concept misunderstanding", "Wrong formula", "Calculation error",
  "Careless mistake", "Time management", "Misread question",
];

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
const UNIS = [
  { n: "Royal University of Phnom Penh", abbr: "RUPP", ready: 42, c: "var(--primary)" },
  { n: "Institute of Technology of Cambodia", abbr: "ITC", ready: 35, c: "var(--ember)" },
  { n: "American University of Phnom Penh", abbr: "AUPP", ready: 38, c: "var(--gold)" },
  { n: "National University of Management", abbr: "NUM", ready: 44, c: "var(--jade)" },
  { n: "Royal University of Law and Economics", abbr: "RULE", ready: 30, c: "var(--muted)" },
  { n: "CamTech University", abbr: "CamTech", ready: 33, c: "var(--primary)" },
];
const LANGS = [
  { n: "IELTS Academic", goal: "Band 7.0", now: "—", pct: 20, c: "var(--ember)" },
  { n: "TOEFL iBT", goal: "Score 90", now: "—", pct: 15, c: "var(--primary)" },
  { n: "HSK", goal: "Level 4", now: "—", pct: 10, c: "var(--gold)" },
  { n: "DELF", goal: "B2", now: "—", pct: 18, c: "var(--jade)" },
];

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
  --bg:#FAF6EF; --bg-soft:#F1EADB; --card:#FFFFFF; --ink:#1A1B3A; --muted:#71728C;
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

/* ════════════════════════ Registration ════════════════════════ */
function Register({ onComplete, dark, setDark }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: "", email: "", age: "", grade: "12", field: "", target: "A",
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

  return (
    <div className={`eai-root ${dark ? "theme-dark" : "theme-light"}`} style={{ minHeight: "100vh" }}>
      <style>{STYLES}</style>
      <button onClick={() => setDark((d) => !d)} className="eai-btn eai-focus eai-soft grid place-items-center"
        style={{ position: "fixed", top: 16, right: 16, width: 38, height: 38, color: "var(--ink)", zIndex: 10 }}>
        {dark ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <div className="flex items-center justify-center p-4" style={{ minHeight: "100vh" }}>
        <div className="w-full eai-rise" style={{ maxWidth: 680 }}>
          {/* Brand */}
          <div className="flex items-center justify-center gap-2.5 mb-6">
            <div className="grid place-items-center rounded-xl relative overflow-hidden" style={{ width: 44, height: 44, background: "var(--primary)" }}>
              <Angkor style={{ position: "absolute", bottom: -2, width: 44, height: 20, fill: "var(--gold)", opacity: 0.95 }} />
            </div>
            <div>
              <p className="eai-display font-extrabold text-lg leading-none">Bondus Cambodia</p>
              <p className="eai-km text-xs eai-muted">រៀនពូកែ ប្រឡងជាប់</p>
            </div>
          </div>

          <div className="eai-card p-6 sm:p-8">
            {step === 0 ? (
              <>
                <h1 className="eai-display text-2xl font-extrabold">Create your account</h1>
                <p className="eai-muted text-sm mt-1">A few details so your AI coach and study plan fit you.</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                  <Field label="Full name" required>
                    <input className="eai-input eai-focus w-full px-4 py-2.5 text-sm" placeholder="e.g. Sophea Chan"
                      value={form.name} onChange={(e) => set("name", e.target.value)} />
                  </Field>
                  <Field label="Email (optional)">
                    <input className="eai-input eai-focus w-full px-4 py-2.5 text-sm" placeholder="you@example.com"
                      value={form.email} onChange={(e) => set("email", e.target.value)} />
                  </Field>
                  <Field label="Age">
                    <input type="number" min="8" max="99" className="eai-input eai-focus w-full px-4 py-2.5 text-sm" placeholder="18"
                      value={form.age} onChange={(e) => set("age", e.target.value)} />
                  </Field>
                  <Field label="Grade level">
                    <select className="eai-input eai-focus w-full px-4 py-2.5 text-sm" value={form.grade} onChange={(e) => set("grade", e.target.value)}>
                      <option value="11">Grade 11</option>
                      <option value="12">Grade 12 (BAC II)</option>
                    </select>
                  </Field>
                  <Field label="Target grade">
                    <select className="eai-input eai-focus w-full px-4 py-2.5 text-sm" value={form.target} onChange={(e) => set("target", e.target.value)}>
                      {["A", "B", "C", "D", "E"].map((g) => <option key={g} value={g}>Grade {g}</option>)}
                    </select>
                  </Field>
                </div>

                <button onClick={() => setStep(1)} disabled={!form.name.trim()}
                  className="eai-btn eai-focus w-full mt-6 py-3 text-sm text-white flex items-center justify-center gap-2"
                  style={{ background: "var(--primary)", opacity: form.name.trim() ? 1 : 0.5 }}>
                  Choose your track <ChevronRight size={16} />
                </button>
              </>
            ) : step === 1 ? (
              <>
                <button onClick={() => setStep(0)} className="eai-focus flex items-center gap-1 text-sm eai-muted mb-3">
                  <ChevronLeft size={16} /> Back
                </button>
                <h1 className="eai-display text-2xl font-extrabold">Pick your academic track</h1>
                <p className="eai-muted text-sm mt-1">This decides which subjects we prioritize across your whole dashboard.</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                  {Object.entries(FIELD_META).map(([key, meta]) => {
                    const on = form.field === key;
                    const Icon = meta.icon;
                    return (
                      <button key={key} onClick={() => set("field", key)}
                        className="eai-pick eai-focus text-left p-5 rounded-2xl border-2"
                        style={{ borderColor: on ? meta.color : "var(--line)", background: on ? "var(--bg-soft)" : "var(--card)" }}>
                        <div className="flex items-center gap-2.5">
                          <div className="grid place-items-center rounded-xl" style={{ width: 40, height: 40, background: meta.color }}>
                            <Icon size={20} color="#fff" />
                          </div>
                          <div>
                            <p className="eai-display font-bold">{meta.label}</p>
                            <p className="eai-km text-xs eai-muted">{meta.km}</p>
                          </div>
                          {on && <CheckCircle2 size={20} style={{ color: meta.color, marginLeft: "auto" }} />}
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-4">
                          {FIELD_SUBJECTS[key].map((s) => (
                            <span key={s} className="text-xs px-2 py-0.5 rounded-full eai-soft eai-muted">{s}</span>
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <button onClick={() => setStep(2)} disabled={!canFinish}
                  className="eai-btn eai-focus w-full mt-6 py-3 text-sm text-white flex items-center justify-center gap-2"
                  style={{ background: "var(--primary)", opacity: canFinish ? 1 : 0.5 }}>
                  Continue <ChevronRight size={16} />
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setStep(1)} className="eai-focus flex items-center gap-1 text-sm eai-muted mb-3">
                  <ChevronLeft size={16} /> Back
                </button>
                <h1 className="eai-display text-2xl font-extrabold">A bit more, so we can personalize</h1>
                <p className="eai-muted text-sm mt-1">This gives your AI coach an initial estimate — the diagnostic test right after will check it for real.</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                  <Field label="Target exam year">
                    <select className="eai-input eai-focus w-full px-4 py-2.5 text-sm" value={form.targetExamYear} onChange={(e) => set("targetExamYear", Number(e.target.value))}>
                      {EXAM_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </Field>
                  <Field label="Daily study time">
                    <select className="eai-input eai-focus w-full px-4 py-2.5 text-sm" value={form.dailyMinutes} onChange={(e) => set("dailyMinutes", Number(e.target.value))}>
                      {STUDY_MINUTES.map((m) => <option key={m} value={m}>{m} minutes</option>)}
                    </select>
                  </Field>
                  <Field label="Target university (optional)">
                    <select className="eai-input eai-focus w-full px-4 py-2.5 text-sm" value={form.targetUniversity} onChange={(e) => set("targetUniversity", e.target.value)}>
                      <option value="">Not sure yet</option>
                      {UNIS.map((u) => <option key={u.abbr} value={u.abbr}>{u.abbr} — {u.n}</option>)}
                    </select>
                  </Field>
                </div>

                <div className="mt-5">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <span className="text-sm font-semibold">Which subjects would you like to improve?</span>
                      <p className="text-xs eai-muted mt-0.5">Select the subjects you'd like Bondus to focus on. You can choose as many as you need.</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => onComplete({ ...form, subjectsToImprove: [], age: Number(form.age) || null })}
                        className="eai-focus text-xs font-semibold px-3 py-1.5 rounded-full eai-soft" style={{ color: "var(--ink)" }}>Skip for now</button>
                      <button onClick={clearSubjects} className="eai-focus text-xs font-semibold px-3 py-1.5 rounded-full" style={{ color: "var(--muted)" }}>Clear selection</button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {FIELD_SUBJECTS[form.field].map((s) => {
                      const id = subjectId(s);
                      const on = form.subjectsToImprove.includes(id);
                      return (
                        <motion.button key={id} layout="position" whileTap={{ scale: 0.95 }} onClick={() => toggleImprove(id)}
                          animate={{ scale: on ? [1, 1.06, 1] : 1 }} transition={{ duration: 0.22 }}
                          className="eai-focus text-xs font-semibold pl-2.5 pr-3 py-1.5 rounded-full border flex items-center gap-1.5"
                          style={{ background: on ? "var(--gold-soft)" : "var(--card)", color: on ? "var(--gold)" : "var(--ink)", borderColor: on ? "var(--gold)" : "var(--line)" }}>
                          <AnimatePresence initial={false}>
                            {on && (
                              <motion.span initial={{ scale: 0, opacity: 0, width: 0 }} animate={{ scale: 1, opacity: 1, width: 14 }} exit={{ scale: 0, opacity: 0, width: 0 }}
                                transition={{ duration: 0.15 }} style={{ display: "flex", overflow: "hidden" }}>
                                <CheckCircle2 size={14} />
                              </motion.span>
                            )}
                          </AnimatePresence>
                          {s}
                        </motion.button>
                      );
                    })}
                  </div>
                  <p className="mt-3 leading-relaxed" style={{ fontSize: 11, color: "var(--muted)", opacity: 0.85 }}>
                    These selections help us understand what you'd like to focus on. Your personalized study plan will be created after a short diagnostic assessment.
                  </p>
                </div>

                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
                  className="mt-5 p-5 rounded-2xl" style={{ background: "var(--primary-soft)", border: "1px solid var(--primary)" }}>
                  <div className="flex items-center gap-2">
                    <Sparkles size={17} style={{ color: "var(--primary)" }} />
                    <span className="eai-display font-bold text-sm" style={{ color: "var(--primary)" }}>Personalized Diagnostic Assessment</span>
                  </div>
                  <p className="text-sm mt-2 leading-relaxed">Instead of guessing your strengths and weaknesses, Bondus will analyze your current level and build a study plan just for you.</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
                    {["Takes about 15 minutes", "Adapts to your study track", "Not graded"].map((f) => (
                      <span key={f} className="text-xs font-semibold flex items-center gap-1.5" style={{ color: "var(--primary)" }}>
                        <CheckCircle2 size={13} /> {f}
                      </span>
                    ))}
                  </div>
                </motion.div>

                <motion.button whileTap={{ scale: 0.97 }} whileHover={{ scale: 1.01 }}
                  onClick={() => onComplete({ ...form, age: Number(form.age) || null })}
                  className="eai-btn eai-focus w-full mt-4 py-3.5 text-sm text-white flex items-center justify-center gap-2"
                  style={{ background: "var(--primary)" }}>
                  <Sparkles size={16} /> Start My Diagnostic Assessment <ChevronRight size={16} />
                </motion.button>

                <div className="mt-4 text-center">
                  <p className="text-xs font-semibold eai-muted">After the assessment, you'll receive:</p>
                  <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-2">
                    {[
                      { e: "📊", t: "Your current level by subject" },
                      { e: "🎯", t: "A personalized study roadmap" },
                      { e: "📚", t: "Recommended BAC II past papers" },
                      { e: "🤖", t: "AI-powered daily practice plan" },
                    ].map((b) => (
                      <span key={b.t} className="text-xs eai-muted flex items-center gap-1">{b.e} {b.t}</span>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
          <p className="text-center text-xs eai-muted mt-4">Prototype · no data leaves your browser</p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold eai-muted">{label}{required && <span style={{ color: "var(--ember)" }}> *</span>}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

/* ════════════════════════ Dashboard ════════════════════════ */
function Dashboard({ p, go, plan, onTogglePlan, bonusXp = 0 }) {
  const xp = p.xp + bonusXp;
  const done = plan.filter((t) => t.done).length;
  const planPct = plan.length ? Math.round((done / plan.length) * 100) : 0;

  return (
    <div className="space-y-5 eai-rise">
      {/* Hero */}
      <div className="eai-card overflow-hidden relative">
        <div className="p-6 sm:p-8 relative">
          <p className="eai-km text-sm" style={{ color: "var(--gold)" }}>សួស្តី, {p.name.split(" ")[0]}! 👋</p>
          <h2 className="eai-display text-2xl sm:text-3xl font-extrabold mt-1">Welcome, {p.name.split(" ")[0]}.</h2>
          <p className="eai-muted mt-2 text-sm max-w-md">One small step today keeps the streak alive — here's what's next for you.</p>
          <div className="flex flex-wrap items-center gap-3 mt-5">
            <button className="eai-btn eai-focus text-white px-4 py-2.5 text-sm flex items-center gap-2" style={{ background: "var(--primary)" }} onClick={() => go("practice")}>
              <Target size={16} /> Start today's plan
            </button>
            <button className="eai-btn eai-focus px-4 py-2.5 text-sm flex items-center gap-2 eai-soft" onClick={() => go("coach")} style={{ color: "var(--ink)" }}>
              <Sparkles size={16} /> Ask your AI coach
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Daily plan */}
        <div className="eai-card p-6 lg:col-span-2">
          <CardHead title="Today's study plan" kh="ផែនការសិក្សាថ្ងៃនេះ"
            action={<span className="text-xs font-bold eai-display" style={{ color: "var(--jade)" }}>{done}/{plan.length} done</span>} />
          <div className="h-1.5 rounded-full eai-soft mb-4 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${planPct}%`, background: "var(--jade)", transition: "width .3s" }} />
          </div>
          <div className="space-y-2.5">
            {plan.map((t) => (
              <button key={t.id} onClick={() => onTogglePlan(t.id)} className="eai-focus w-full flex items-center gap-3 p-3 rounded-2xl text-left eai-nav border" style={{ borderColor: "var(--line)" }}>
                {t.done ? <CheckCircle2 size={22} style={{ color: "var(--jade)", flexShrink: 0 }} /> : <Circle size={22} className="eai-muted" style={{ flexShrink: 0 }} />}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate" style={{ textDecoration: t.done ? "line-through" : "none", opacity: t.done ? 0.5 : 1 }}>{t.task}</p>
                  <p className="text-xs eai-muted">{t.s} · {t.why}</p>
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
              <p className="text-xs eai-muted mt-1">day streak · keep it alive</p>
            </div>
          </div>
          <div className="h-px eai-soft" />
          <div className="flex items-center gap-4">
            <Ring value={Math.round((xp / p.xpToNext) * 100)} size={60} color="var(--gold)">
              <span className="eai-display font-bold text-sm">{p.level}</span>
            </Ring>
            <div className="flex-1">
              <p className="text-sm font-bold eai-display flex items-center gap-1.5"><Zap size={15} style={{ color: "var(--gold)" }} /> {xp.toLocaleString()} XP</p>
              <p className="text-xs eai-muted mt-0.5">{p.xpToNext - xp} XP to Level {p.level + 1}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recommended next lesson */}
      <div className="eai-card p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5" style={{ background: "var(--primary)", color: "#fff", border: "none" }}>
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold opacity-90"><Star size={16} /> Recommended next lesson</div>
          <h3 className="eai-display text-xl font-bold mt-2">{p.recommendedLesson.subject}: {p.recommendedLesson.topic}</h3>
          <p className="text-sm opacity-90 mt-1.5">12 min lesson · targets your weakest topic · +80 XP</p>
        </div>
        <button className="eai-btn eai-focus bg-white px-5 py-2.5 text-sm flex items-center justify-center gap-2 flex-shrink-0" style={{ color: "var(--primary)" }} onClick={() => go("practice")}>
          Start lesson <ChevronRight size={16} />
        </button>
      </div>

      {/* Explore more */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: Target, label: "Practice", desc: "Sharpen your weak subjects", tab: "practice", c: "var(--jade)" },
          { icon: GraduationCap, label: "Universities", desc: "Browse majors & entrance prep", tab: "universities", c: "var(--primary)" },
          { icon: BarChart3, label: "Progress", desc: "Your full stats & analytics", tab: "progress", c: "var(--gold)" },
        ].map((c) => (
          <button key={c.label} onClick={() => go(c.tab)} className="eai-card eai-tile eai-focus p-5 text-left flex items-center gap-3.5">
            <div className="grid place-items-center rounded-xl flex-shrink-0" style={{ width: 40, height: 40, background: "var(--bg-soft)" }}>
              <c.icon size={19} style={{ color: c.c }} />
            </div>
            <div className="min-w-0">
              <p className="eai-display font-bold text-sm">{c.label}</p>
              <p className="text-xs eai-muted mt-0.5">{c.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════ Browse (field-aware) ════════════════════════ */
function Browse({ p }) {
  const [year, setYear] = useState(2023);
  return (
    <div className="space-y-5 eai-rise">
      <div>
        <h2 className="eai-display text-2xl font-extrabold">Browse exams</h2>
        <p className="eai-muted text-sm mt-1">
          {p.grade === "university" ? "University entrance" : "BAC II"} · {FIELD_META[p.field].label} track · official papers 2010–2026
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
                  ? <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: "var(--ember-soft)", color: "var(--ember)" }}>Recommended for you</span>
                  : <Bookmark size={16} className="eai-muted" />}
              </div>
              <h3 className="eai-display font-bold mt-3">{sub.s}</h3>
              <p className="text-xs eai-muted mt-0.5">BAC II {year} · 180 min · 100 marks</p>
              <div className="flex items-center gap-2 mt-3">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: "var(--bg-soft)", color: dc }}>{diff}</span>
                <span className="text-xs eai-muted">{sub.m != null ? `Matches your ${sub.level.toLowerCase()} level` : "Answer sheet ✓"}</span>
              </div>
              <div className="flex gap-2 mt-4">
                <button className="eai-btn eai-focus flex-1 text-sm py-2 flex items-center justify-center gap-1.5 text-white" style={{ background: "var(--primary)" }}><Eye size={14} /> View</button>
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
const RAW_EXERCISES = {
  Mathematics: [
    ["Calculus", "Medium", "Find d/dx (3x² + 2x).", ["6x + 2", "3x + 2", "6x", "x²"], "6x + 2",
      "Differentiate term by term: d/dx(3x²) = 6x and d/dx(2x) = 2, so the result is 6x + 2.", "Power rule: d/dx[xⁿ] = n·xⁿ⁻¹"],
    ["Algebra", "Medium", "Solve x² − 5x + 6 = 0.", ["x = 2, 3", "x = 1, 6", "x = −2, −3", "x = 2, −3"], "x = 2, 3",
      "Factor into (x − 2)(x − 3) = 0, so x = 2 or x = 3.", "Quadratic: x = (−b ± √(b²−4ac)) / 2a, or factor the trinomial"],
    ["Geometry", "Easy", "Area of a circle with radius 7 (use π = 22/7)?", ["154", "44", "49", "22"], "154",
      "A = πr² = (22/7) × 7² = (22/7) × 49 = 154.", "Area of a circle: A = πr²"],
  ],
  Physics: [
    ["Kinematics", "Easy", "A car starts from rest and accelerates at 2 m/s² for 5 s. Final velocity?", ["10 m/s", "7 m/s", "2.5 m/s", "25 m/s"], "10 m/s",
      "Starting from rest u = 0, so v = 0 + (2)(5) = 10 m/s.", "v = u + at"],
    ["Dynamics", "Easy", "Force needed to accelerate a 10 kg mass at 3 m/s²?", ["30 N", "13 N", "3.3 N", "300 N"], "30 N",
      "Force is mass times acceleration: F = 10 × 3 = 30 N.", "Newton's 2nd law: F = ma"],
    ["Energy", "Medium", "Kinetic energy of a 2 kg object moving at 4 m/s?", ["16 J", "8 J", "32 J", "4 J"], "16 J",
      "KE = ½ × 2 × 4² = ½ × 2 × 16 = 16 J.", "Kinetic energy: KE = ½mv²"],
  ],
  Chemistry: [
    ["Moles", "Medium", "How many moles are in 36 g of water (H₂O, M = 18 g/mol)?", ["2", "1", "0.5", "36"], "2",
      "Moles = mass ÷ molar mass = 36 ÷ 18 = 2 mol.", "n = mass ÷ molar mass"],
    ["Acids & bases", "Medium", "What is the pH of 0.01 M HCl?", ["2", "1", "12", "0.01"], "2",
      "HCl fully dissociates, so [H⁺] = 0.01 = 10⁻². pH = −log(10⁻²) = 2.", "pH = −log[H⁺]"],
    ["Balancing", "Easy", "In 2H₂ + O₂ → 2H₂O, what is the coefficient of H₂?", ["2", "1", "3", "4"], "2",
      "Balance hydrogen and oxygen on both sides: 2H₂ + O₂ → 2H₂O.", "Conserve atoms of each element on both sides"],
  ],
  Biology: [
    ["Cell biology", "Easy", "Which organelle is the 'powerhouse of the cell'?", ["Mitochondria", "Nucleus", "Ribosome", "Golgi body"], "Mitochondria",
      "Mitochondria generate most of the cell's ATP through respiration.", "Key concept: respiration produces ATP in the mitochondria"],
    ["Genetics", "Medium", "Crossing Aa × Aa gives what dominant : recessive ratio?", ["3 : 1", "1 : 1", "9 : 3 : 3 : 1", "1 : 2 : 1"], "3 : 1",
      "The Punnett square gives genotypes 1 AA : 2 Aa : 1 aa, so phenotypes are 3 dominant : 1 recessive.", "Use a Punnett square for a monohybrid cross"],
    ["Photosynthesis", "Easy", "Which gas is released during photosynthesis?", ["Oxygen", "Carbon dioxide", "Nitrogen", "Hydrogen"], "Oxygen",
      "Plants take in CO₂ and release O₂: 6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂.", "Equation: 6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂"],
  ],
  English: [
    ["Grammar", "Easy", "Choose the correct verb: 'She ___ to school every day.'", ["goes", "go", "going", "gone"], "goes",
      "Third-person singular in the present simple takes an -s ending: she goes.", "Rule: he/she/it + verb + -s in present simple"],
    ["Vocabulary", "Easy", "Which word is a synonym of 'rapid'?", ["quick", "slow", "large", "late"], "quick",
      "'Rapid' means happening fast, so 'quick' is the closest synonym.", "Tip: match the core meaning, not just the topic"],
    ["Parts of speech", "Medium", "Identify the noun: 'Happiness is the key.'", ["Happiness", "is", "the", "key"], "Happiness",
      "'Happiness' names a thing (an abstract idea), so it is the noun and subject.", "Tip: a noun names a person, place, thing, or idea"],
  ],
  French: [
    ["Verbs", "Easy", "Complete: 'Je ___ étudiant.'", ["suis", "es", "est", "être"], "suis",
      "With 'je' the verb être is conjugated as 'suis': Je suis étudiant.", "être: je suis, tu es, il/elle est"],
    ["Plurals", "Easy", "What is the plural of 'le livre'?", ["les livres", "la livres", "les livre", "le livres"], "les livres",
      "The plural article is 'les' and the noun adds -s: les livres.", "Rule: le/la → les, and add -s to the noun"],
  ],
  "Khmer Literature": [
    ["Classics", "Easy", "The Reamker is the Khmer version of which epic?", ["Ramayana", "Mahabharata", "Odyssey", "Iliad"], "Ramayana",
      "The Reamker is Cambodia's adaptation of the Indian epic the Ramayana.", "Key concept: Reamker = Khmer Ramayana"],
    ["Classics", "Medium", "'Tum Teav' is best described as a classic Khmer ___.", ["tragic love story", "comedy", "religious chant", "history book"], "tragic love story",
      "Tum Teav is a famous Cambodian tragic romance, often compared to Romeo and Juliet.", "Tip: identify genre from theme and ending"],
  ],
  History: [
    ["Angkor era", "Medium", "Angkor Wat was built during the reign of which king?", ["Suryavarman II", "Jayavarman VII", "Norodom", "Ang Duong"], "Suryavarman II",
      "Angkor Wat was constructed in the early 12th century under King Suryavarman II.", "Key fact: Angkor Wat ≈ early 1100s, Suryavarman II"],
    ["Khmer Empire", "Easy", "What was the capital of the Khmer Empire at its height?", ["Angkor", "Phnom Penh", "Oudong", "Longvek"], "Angkor",
      "Angkor was the empire's capital during its golden age.", "Key fact: Angkor was the imperial capital"],
  ],
  Geography: [
    ["Rivers", "Easy", "What is the longest river in Cambodia?", ["Mekong", "Tonle Sap", "Bassac", "Sen"], "Mekong",
      "The Mekong is the longest river flowing through Cambodia.", "Key fact: the Mekong dominates Cambodia's river system"],
    ["Landforms", "Easy", "The Tonle Sap is a ___.", ["lake", "mountain", "desert", "ocean"], "lake",
      "The Tonle Sap is the largest freshwater lake in Southeast Asia.", "Key fact: Tonle Sap = freshwater lake"],
  ],
  Morality: [
    ["Civics", "Easy", "Which of these is a civic duty of a good citizen?", ["Respecting the law", "Littering", "Avoiding taxes", "Ignoring elections"], "Respecting the law",
      "Respecting and obeying the law is a core civic responsibility.", "Key concept: rights come with responsibilities"],
    ["Civics", "Easy", "What is the voting age in Cambodia?", ["18", "16", "21", "25"], "18",
      "Cambodian citizens may vote from the age of 18.", "Key fact: voting age in Cambodia is 18"],
  ],
  "Earth Science": [
    ["Structure of Earth", "Easy", "What is Earth's outermost solid layer called?", ["Crust", "Mantle", "Outer core", "Magma"], "Crust",
      "The crust is the thin, solid outermost layer of the Earth.", "Key concept: crust → mantle → outer core → inner core"],
    ["Geology", "Medium", "Earthquakes are mainly caused by ___.", ["tectonic plate movement", "heavy rain", "strong wind", "ocean tides"], "tectonic plate movement",
      "Most earthquakes happen when tectonic plates shift along faults.", "Key concept: plate tectonics drive earthquakes"],
  ],
};

const EXERCISE_BANK = Object.fromEntries(Object.entries(RAW_EXERCISES).map(([subject, arr]) => [
  subject,
  arr.map((r, i) => ({ id: `${subject}-${i + 1}`, subject, topic: r[0], difficulty: r[1], prompt: r[2], options: r[3], answer: r[4], explanation: r[5], formula: r[6] })),
]));
const getExercises = (s) => EXERCISE_BANK[s] || [];
const gradeAnswer = (ex, val) => val != null && String(val).trim().toLowerCase() === String(ex.answer).trim().toLowerCase();

/* Topic taxonomy per subject, derived from the exercise bank — this is what the diagnostic
   test, adaptive practice, and per-topic mastery tracking all key off. */
const SUBJECT_TOPICS = Object.fromEntries(
  Object.entries(EXERCISE_BANK).map(([subject, list]) => [subject, [...new Set(list.map((e) => e.topic))]])
);

const STATUS = {
  pending: { label: "Pending", color: "var(--muted)", soft: "var(--bg-soft)", icon: Circle },
  in_progress: { label: "In progress", color: "var(--gold)", soft: "var(--gold-soft)", icon: Clock },
  completed: { label: "Completed", color: "var(--jade)", soft: "var(--jade-soft)", icon: CheckCircle2 },
};

function StatusControl({ status, onChange }) {
  return (
    <div className="flex gap-1 flex-shrink-0">
      {Object.entries(STATUS).map(([key, s]) => {
        const on = (status || "pending") === key;
        return (
          <button key={key} onClick={(e) => { e.stopPropagation(); onChange(key); }}
            className="eai-btn eai-focus text-xs px-2 py-1 flex items-center gap-1"
            title={s.label}
            style={{ background: on ? s.soft : "transparent", color: on ? s.color : "var(--muted)", border: `1px solid ${on ? s.color : "var(--line)"}` }}>
            <s.icon size={12} /><span className="hidden md:inline">{s.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function Practice({ p, practice, onAnswer, onSetStatus }) {
  const [subject, setSubject] = useState(null);
  if (subject) return <PracticeSubject p={p} subject={subject} practice={practice} onAnswer={onAnswer} onSetStatus={onSetStatus} onBack={() => setSubject(null)} />;

  return (
    <div className="space-y-5 eai-rise">
      <div>
        <h2 className="eai-display text-2xl font-extrabold">Practice &amp; mock exams</h2>
        <p className="eai-muted text-sm mt-1">Pick a subject. Every exercise is auto-corrected with an explanation and the formula to use, and you can mark each one Pending, In progress, or Completed.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {FIELD_SUBJECTS[p.field].map((s) => {
          const list = getExercises(s);
          const doneN = list.filter((ex) => practice[ex.id]?.status === "completed").length;
          const pct = list.length ? Math.round((doneN / list.length) * 100) : 0;
          const isWeak = p.weak.some((w) => w.s === s);
          return (
            <button key={s} onClick={() => setSubject(s)} className="eai-card eai-tile eai-focus p-5 text-left">
              <div className="flex items-center justify-between">
                <div className="grid place-items-center rounded-xl" style={{ width: 40, height: 40, background: "var(--primary-soft)" }}>
                  <Target size={19} style={{ color: "var(--primary)" }} />
                </div>
                {isWeak && <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: "var(--ember-soft)", color: "var(--ember)" }}>Focus area</span>}
              </div>
              <h3 className="eai-display font-bold mt-3">{s}</h3>
              <p className="text-xs eai-muted mt-0.5">{list.length} exercises · auto-graded</p>
              <div className="h-1.5 rounded-full eai-soft mt-3 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "var(--jade)" }} />
              </div>
              <p className="text-xs eai-muted mt-1.5">{doneN}/{list.length} completed</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PracticeSubject({ p, subject, practice, onAnswer, onSetStatus, onBack }) {
  const list = getExercises(subject);
  const [idx, setIdx] = useState(null);

  // ── Adaptive difficulty (session-only): 3 correct in a row steps up, 2 wrong in a row steps
  // down, and missing the same topic twice nudges the student to review it. ──
  const subjectLevel = p.subjects.find((s) => s.s === subject)?.level;
  const [tier, setTier] = useState(() => levelToDifficulty(subjectLevel));
  const [streak, setStreak] = useState(0);
  const [topicMisses, setTopicMisses] = useState({});
  const [banner, setBanner] = useState(null);
  useEffect(() => { if (!banner) return; const t = setTimeout(() => setBanner(null), 5000); return () => clearTimeout(t); }, [banner]);

  const pickNext = (fromIdx) => {
    const candidates = list.map((ex, i) => ({ ex, i })).filter(({ i }) => i !== fromIdx);
    const sameTier = candidates.filter(({ ex }) => ex.difficulty === tier);
    const pool = sameTier.length ? sameTier : candidates;
    return pool.length ? pool[0].i : null;
  };

  const handleResult = (ex, correct) => {
    const nextStreak = correct ? Math.max(1, streak + 1) : Math.min(-1, streak - 1);
    if (nextStreak >= 3 && tier !== "Hard") {
      const t = tier === "Easy" ? "Medium" : "Hard";
      setTier(t); setStreak(0);
      setBanner({ text: `Nice streak — stepping up to ${t} questions.`, tone: "jade" });
    } else if (nextStreak <= -2 && tier !== "Easy") {
      const t = tier === "Hard" ? "Medium" : "Easy";
      setTier(t); setStreak(0);
      setBanner({ text: `Let's ease back to ${t} questions.`, tone: "gold" });
    } else {
      setStreak(nextStreak);
    }
    const missCount = correct ? 0 : (topicMisses[ex.topic] || 0) + 1;
    setTopicMisses((m) => ({ ...m, [ex.topic]: missCount }));
    if (!correct && missCount >= 2) setBanner({ text: `You've missed ${ex.topic} twice in a row — review the explanation carefully before trying again.`, tone: "ember" });
  };

  if (idx != null && list[idx]) {
    return (
      <ExercisePlayer ex={list[idx]} entry={practice[list[idx].id]} subject={subject} index={idx} total={list.length} tier={tier} banner={banner}
        onAnswer={(ex, result, meta) => { onAnswer(ex, result, meta); handleResult(ex, result === "correct"); }}
        onSetStatus={onSetStatus} onBack={() => setIdx(null)}
        onNext={list.length > 1 ? () => setIdx(pickNext(idx)) : null} />
    );
  }

  const doneN = list.filter((ex) => practice[ex.id]?.status === "completed").length;
  const pct = list.length ? Math.round((doneN / list.length) * 100) : 0;

  return (
    <div className="space-y-5 eai-rise">
      <button onClick={onBack} className="eai-focus flex items-center gap-1 text-sm eai-muted"><ChevronLeft size={16} /> All subjects</button>
      <div className="eai-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="eai-display text-2xl font-extrabold">{subject}</h2>
            <p className="eai-muted text-sm mt-0.5">{list.length} exercises · {doneN} completed</p>
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
                  <span className="text-xs px-2 py-0.5 rounded-full eai-soft eai-muted">{ex.topic}</span>
                  <span className="text-xs font-semibold" style={{ color: diffColor(ex.difficulty) }}>{ex.difficulty}</span>
                  <span className="text-xs font-semibold flex items-center gap-1" style={{ color: st.color }}><st.icon size={12} /> {st.label}</span>
                </div>
              </div>
              <StatusControl status={entry?.status} onChange={(s) => onSetStatus(ex, s)} />
              <button onClick={() => setIdx(i)} className="eai-btn eai-focus text-sm py-2 px-4 text-white flex items-center gap-1.5 flex-shrink-0" style={{ background: "var(--primary)" }}>
                {entry?.status === "completed" ? "Review" : "Solve"} <ChevronRight size={15} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ExercisePlayer({ ex, entry, subject, index, total, tier, banner, onAnswer, onSetStatus, onBack, onNext }) {
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
        <button onClick={onBack} className="eai-focus flex items-center gap-1 text-sm eai-muted"><ChevronLeft size={16} /> {subject}</button>
        <span className="text-xs eai-muted">Exercise {index + 1} of {total}</span>
      </div>

      {banner && (
        <div className="eai-rise flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold" style={{ background: `var(--${banner.tone}-soft)`, color: `var(--${banner.tone})` }}>
          <Sparkles size={15} /> {banner.text}
        </div>
      )}

      <div className="eai-card p-6">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-0.5 rounded-full eai-soft eai-muted">{ex.topic}</span>
            <span className="text-xs font-semibold" style={{ color: diffColor(ex.difficulty) }}>{ex.difficulty}</span>
            {tier && <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: "var(--primary-soft)", color: "var(--primary)" }}>🎯 Adaptive: {tier}</span>}
          </div>
          <StatusControl status={entry?.status} onChange={(s) => onSetStatus(ex, s)} />
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
          <input className="eai-input eai-focus w-full px-4 py-3 text-sm" placeholder="Type your answer…" value={choice ?? ""}
            disabled={submitted} onChange={(e) => setChoice(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />
        )}

        {phase === "answering" && (
          <button onClick={submit} disabled={choice == null || String(choice).trim() === ""}
            className="eai-btn eai-focus w-full mt-5 py-3 text-sm text-white" style={{ background: "var(--primary)", opacity: choice == null || String(choice).trim() === "" ? 0.5 : 1 }}>
            Check answer
          </button>
        )}

        {phase === "mistake" && (
          <div className="mt-5 eai-rise">
            <p className="text-sm font-semibold mb-2.5">Why do you think you missed this? (optional)</p>
            <div className="flex flex-wrap gap-2">
              {MISTAKE_TYPES.map((mt) => (
                <button key={mt} onClick={() => chooseMistake(mt)} className="eai-btn eai-focus text-xs font-semibold px-3 py-2 rounded-full eai-soft" style={{ color: "var(--ink)" }}>{mt}</button>
              ))}
              <button onClick={() => chooseMistake(null)} className="eai-btn eai-focus text-xs font-semibold px-3 py-2 rounded-full" style={{ color: "var(--muted)" }}>Skip</button>
            </div>
          </div>
        )}

        {phase === "result" && (
          <div className="mt-5 space-y-3 eai-rise">
            {/* Result banner */}
            <div className="flex items-center gap-2.5 p-3 rounded-2xl" style={{ background: correct ? "var(--jade-soft)" : "var(--ember-soft)" }}>
              {correct ? <CheckCircle2 size={22} style={{ color: "var(--jade)" }} /> : <XCircle size={22} style={{ color: "var(--ember)" }} />}
              <div>
                <p className="text-sm font-bold" style={{ color: correct ? "var(--jade)" : "var(--ember)" }}>{correct ? "Correct! +30 XP" : "Not quite"}</p>
                {!correct && <p className="text-xs eai-muted">Correct answer: <b style={{ color: "var(--ink)" }}>{ex.answer}</b></p>}
              </div>
            </div>

            {/* Explanation */}
            <div className="p-4 rounded-2xl eai-soft">
              <div className="flex items-center gap-2 mb-1.5"><Lightbulb size={15} style={{ color: "var(--gold)" }} /><span className="text-xs font-bold eai-display">Explanation</span></div>
              <p className="text-sm leading-relaxed">{ex.explanation}</p>
            </div>

            {/* Formula / approach */}
            <div className="p-4 rounded-2xl" style={{ background: "var(--primary-soft)" }}>
              <div className="flex items-center gap-2 mb-1.5"><Brain size={15} style={{ color: "var(--primary)" }} /><span className="text-xs font-bold eai-display" style={{ color: "var(--primary)" }}>Formula / approach to use</span></div>
              <p className="text-sm font-semibold" style={{ color: "var(--primary)" }}>{ex.formula}</p>
            </div>

            {/* Recommendation */}
            <p className="text-sm eai-muted leading-relaxed">
              {correct
                ? `Nice — you applied the right method. ${onNext ? "Keep the momentum and try the next one." : "That's the last exercise in this set!"}`
                : "Re-read the formula above and how it maps to the question, then tap Try again — you've got this."}
            </p>

            <div className="flex flex-wrap gap-2 pt-1">
              {!correct && (
                <button onClick={retry} className="eai-btn eai-focus py-2.5 px-4 text-sm flex items-center gap-1.5 eai-soft" style={{ color: "var(--ink)" }}>
                  <RotateCcw size={15} /> Try again
                </button>
              )}
              {onNext && (
                <button onClick={next} className="eai-btn eai-focus py-2.5 px-4 text-sm text-white flex items-center gap-1.5" style={{ background: "var(--primary)" }}>
                  Next exercise <ChevronRight size={15} />
                </button>
              )}
              <button onClick={onBack} className="eai-btn eai-focus py-2.5 px-4 text-sm eai-soft" style={{ color: "var(--ink)" }}>Back to list</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════ Diagnostic test ════════════════════════
   A short, fast-fire assessment run right after registration and before the dashboard exists.
   No feedback mid-test — like a real diagnostic, you only see results at the end. It seeds the
   very first real topic-mastery scores; everything the dashboard shows flows from this. */
function buildDiagnosticQueue(field) {
  return FIELD_SUBJECTS[field].flatMap((s) => getExercises(s));
}

function Diagnostic({ reg, dark, onComplete }) {
  const queue = useMemo(() => buildDiagnosticQueue(reg.field), [reg.field]);
  const [i, setI] = useState(0);
  const [topicMastery, setTopicMastery] = useState({});
  const [choice, setChoice] = useState(null);
  const startRef = useRef(Date.now());

  useEffect(() => { startRef.current = Date.now(); }, [i]);

  if (i >= queue.length) {
    return <DiagnosticResults reg={reg} dark={dark} topicMastery={topicMastery} onComplete={() => onComplete(topicMastery)} />;
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
            <p className="text-sm font-semibold eai-muted flex items-center gap-1.5"><ClipboardCheck size={15} /> Diagnostic test</p>
            <p className="text-xs eai-muted">Question {i + 1} of {queue.length}</p>
          </div>
          <div className="h-1.5 rounded-full eai-soft mb-6 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "var(--primary)", transition: "width .3s" }} />
          </div>

          <div className="eai-card p-6 sm:p-8">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: "var(--primary-soft)", color: "var(--primary)" }}>{ex.subject}</span>
              <span className="text-xs px-2 py-0.5 rounded-full eai-soft eai-muted">{ex.topic}</span>
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
                <p className="text-xs font-semibold eai-muted mb-2.5">How sure were you?</p>
                <div className="grid grid-cols-2 gap-2.5">
                  <button onClick={() => answer("confident")} className="eai-btn eai-focus py-3 text-sm font-semibold text-white" style={{ background: "var(--jade)" }}>😎 Confident</button>
                  <button onClick={() => answer("guess")} className="eai-btn eai-focus py-3 text-sm font-semibold" style={{ background: "var(--bg-soft)", color: "var(--ink)" }}>🤔 I guessed</button>
                </div>
              </div>
            )}
          </div>
          <p className="text-center text-xs eai-muted mt-4">No feedback during the test — you'll see your results at the end.</p>
        </div>
      </div>
    </div>
  );
}

function DiagnosticResults({ reg, dark, topicMastery, onComplete }) {
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
            <h1 className="eai-display text-2xl font-extrabold">Diagnostic complete!</h1>
            <p className="eai-muted text-sm mt-1">Here's your real starting point — overall level is <b style={{ color: LEVEL_COLOR[overallLevel] }}>{overallLevel}</b>.</p>
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
                  <span className="text-xs font-semibold w-24 text-right" style={{ color: LEVEL_COLOR[r.level] }}>{r.level}</span>
                </div>
              ))}
            </div>
          </div>

          <button onClick={onComplete} className="eai-btn eai-focus w-full mt-5 py-3 text-sm text-white flex items-center justify-center gap-2" style={{ background: "var(--primary)" }}>
            <Sparkles size={16} /> Go to my dashboard <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* Per-university entrance exam content: official practice sets + commonly-seen exercises. */
const UNI_DETAIL = {
  RUPP: {
    exam: "Entrance & Scholarship Exam",
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
    exam: "Engineering Entrance Exam",
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
    exam: "Admissions & English Placement",
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
    exam: "Business & Management Entrance",
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
    exam: "Law & Economics Entrance",
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
  CamTech: {
    exam: "STEM & English Entrance",
    sets: [
      { title: "Mathematics Diagnostic", subject: "Mathematics", q: 35, diff: "Medium" },
      { title: "Physics Concepts Set", subject: "Physics", q: 30, diff: "Medium" },
      { title: "English & Logic Combined", subject: "English", q: 45, diff: "Medium" },
    ],
    common: [
      { topic: "Functions & graphs", subject: "Mathematics", freq: "Frequently" },
      { topic: "Mechanics & energy", subject: "Physics", freq: "Frequently" },
      { topic: "Reading comprehension", subject: "English", freq: "Often" },
      { topic: "Probability basics", subject: "Mathematics", freq: "Often" },
      { topic: "Logical sequences", subject: "Reasoning", freq: "Sometimes" },
    ],
  },
};

const diffColor = (d) => (d === "Hard" ? "var(--ember)" : d === "Medium" ? "var(--gold)" : "var(--jade)");
const freqColor = (f) => (f === "Frequently" ? "var(--ember)" : f === "Often" ? "var(--gold)" : "var(--muted)");

/* Real majors offered per university, grouped by faculty. Sourced from each university's official site. */
const UNI_MAJORS = {
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
  CamTech: [
    { faculty: "Faculty of Engineering and Computer Science", majors: [
      { n: "AI and Data Science", d: "CamTech's 156-credit program (106 coursework, 48 internship, 2 industrial placement report) trains students in machine learning, deep learning, NLP, computer vision and big data analytics through 9 internships (3 per term) plus a year-long industry placement, toward roles like data engineer, ML engineer and AI specialist across healthcare, finance and marketing." },
      { n: "Software Engineering", d: "This 156-credit program covers system architecture, algorithms, databases, UI/UX, web and mobile development, DevOps, cloud computing and blockchain, building toward a capstone year-long industry placement — graduates go on to full-stack developer, QA specialist, system architect and CTO roles." },
      { n: "Cyber Security", d: "CamTech's 156-credit cybersecurity major covers malware analysis, cryptography, cloud security, ethical hacking and penetration testing alongside digital law and privacy, with 9 internships built into coursework plus a year-long industry placement, toward roles like cybersecurity engineer and penetration tester." },
      { n: "Robotics and Automation Engineering", d: "This 156-credit program blends mechatronics, embedded systems and PLC programming, computer vision, and industrial automation with hands-on CAD, 3D printing and CNC machining, with internship projects across all three years before a year-long industry placement." },
    ]},
    { faculty: "Faculty of Architecture and Design", majors: [
      { n: "Architecture", d: "CamTech's B.Arch totals 156 credits (126 coursework, 18 \"Virtubiz,\" 12 industrial placement/graduation project) built around nine progressive Design Studios, teaching Revit, AutoCAD, SketchUp, Enscape, Lumion, Rhino, BIM and QGIS for sustainable, energy-efficient design." },
      { n: "Interior Design", d: "This 156-credit program runs students through nine progressively complex design studios plus coursework in sustainable materials, construction and Khmer architectural heritage, using Revit, AutoCAD, SketchUp with Enscape/Lumion, Rhino and AR/VR for spatial visualization." },
    ]},
    { faculty: "Faculty of Business Intelligence", majors: [
      { n: "Business Intelligence", d: "Officially the Risk Management and Business Intelligence major, this 156-credit program covers data mining, predictive analytics, data warehousing, enterprise risk management, and fraud detection alongside core business courses like financial accounting and strategic planning." },
    ]},
  ],
};

function Majors({ abbr, color }) {
  const faculties = UNI_MAJORS[abbr];
  const [open, setOpen] = useState(0);
  if (!faculties) return null;
  const total = faculties.reduce((a, f) => a + f.majors.length, 0);
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <BookOpen size={17} style={{ color: "var(--jade)" }} />
        <h3 className="eai-display font-bold">Majors offered</h3>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: "var(--jade-soft)", color: "var(--jade)" }}>{total} majors</span>
      </div>
      <div className="space-y-3">
        {faculties.map((f, i) => {
          const isOpen = open === i;
          return (
            <div key={f.faculty} className="eai-card overflow-hidden">
              <button onClick={() => setOpen(isOpen ? -1 : i)} className="eai-focus w-full flex items-center justify-between gap-3 p-4 text-left">
                <div className="flex items-center gap-2 min-w-0">
                  <GraduationCap size={16} style={{ color, flexShrink: 0 }} />
                  <span className="eai-display font-bold text-sm truncate">{f.faculty}</span>
                  <span className="text-xs eai-muted flex-shrink-0">({f.majors.length})</span>
                </div>
                <ChevronRight size={16} className="eai-muted flex-shrink-0" style={{ transform: isOpen ? "rotate(90deg)" : "none", transition: "transform .15s ease" }} />
              </button>
              {isOpen && (
                <div className="px-4 pb-4 space-y-3 border-t" style={{ borderColor: "var(--line)" }}>
                  {f.majors.map((m) => (
                    <div key={m.n} className="pt-3">
                      <p className="text-sm font-semibold">{m.n}</p>
                      <p className="text-xs eai-muted mt-0.5 leading-relaxed">{m.d}</p>
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

function UniversityDetail({ uni, onBack }) {
  const d = UNI_DETAIL[uni.abbr] || { exam: "Entrance Exam", sets: [], common: [] };
  return (
    <div className="space-y-5 eai-rise">
      <button onClick={onBack} className="eai-focus flex items-center gap-1 text-sm eai-muted">
        <ChevronLeft size={16} /> All universities
      </button>

      {/* Header */}
      <div className="eai-card p-6 flex items-center gap-4">
        <Ring value={uni.ready} size={72} color={uni.c} stroke={8}><span className="eai-display font-bold">{uni.ready}%</span></Ring>
        <div className="min-w-0">
          <div className="flex items-center gap-2"><GraduationCap size={18} style={{ color: uni.c }} /><span className="eai-display text-xl font-extrabold">{uni.abbr}</span></div>
          <p className="text-sm mt-0.5">{uni.n}</p>
          <p className="text-xs eai-muted mt-0.5">{d.exam} · readiness {uni.ready}%</p>
        </div>
      </div>

      {/* Majors offered */}
      <Majors abbr={uni.abbr} color={uni.c} />

      {/* Published practice sets */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <FileText size={17} style={{ color: "var(--primary)" }} />
          <h3 className="eai-display font-bold">Published practice sets</h3>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: "var(--primary-soft)", color: "var(--primary)" }}>Official</span>
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
              <button className="eai-btn eai-focus w-full mt-4 py-2 text-sm text-white flex items-center justify-center gap-1.5" style={{ background: "var(--primary)" }}>
                <Eye size={14} /> Start set
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Common exercises */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Repeat size={17} style={{ color: "var(--gold)" }} />
          <h3 className="eai-display font-bold">Common exercises in this exam</h3>
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
              <button className="eai-btn eai-focus text-xs py-1.5 px-3 eai-soft flex-shrink-0 hidden sm:block" style={{ color: "var(--ink)" }}>Practice</button>
            </div>
          ))}
        </div>
        <p className="text-xs eai-muted mt-2">Frequency reflects how often each topic has appeared in recent past papers.</p>
      </div>
    </div>
  );
}

function Universities() {
  const [selected, setSelected] = useState(null);
  if (selected) return <UniversityDetail uni={selected} onBack={() => setSelected(null)} />;
  return (
    <div className="space-y-5 eai-rise">
      <div>
        <h2 className="eai-display text-2xl font-extrabold">University &amp; scholarship prep</h2>
        <p className="eai-muted text-sm mt-1">Tap a university to see its published practice sets and common exam exercises.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {UNIS.map((u) => (
          <button key={u.abbr} onClick={() => setSelected(u)} className="eai-card eai-tile eai-focus p-5 flex items-center gap-4 text-left w-full">
            <Ring value={u.ready} size={64} color={u.c} stroke={7}><span className="eai-display font-bold text-sm">{u.ready}%</span></Ring>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2"><GraduationCap size={16} style={{ color: u.c }} /><span className="eai-display font-bold">{u.abbr}</span></div>
              <p className="text-sm truncate mt-0.5">{u.n}</p>
              <p className="text-xs eai-muted mt-0.5">View practice sets &amp; common exercises</p>
            </div>
            <ChevronRight size={18} className="eai-muted" />
          </button>
        ))}
      </div>
    </div>
  );
}

function Languages() {
  return (
    <div className="space-y-5 eai-rise">
      <div>
        <h2 className="eai-display text-2xl font-extrabold">International language hub</h2>
        <p className="eai-muted text-sm mt-1">Diagnostic-driven roadmaps and unlimited AI mock tests with skill-by-skill scoring.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {LANGS.map((l) => (
          <div key={l.n} className="eai-card p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><Globe size={18} style={{ color: l.c }} /><span className="eai-display font-bold">{l.n}</span></div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: "var(--bg-soft)", color: l.c }}>Goal {l.goal}</span>
            </div>
            <div className="flex items-end justify-between mt-4 mb-2">
              <span className="text-xs eai-muted">Current: <b style={{ color: "var(--ink)" }}>{l.now}</b></span>
              <span className="text-xs font-bold eai-display">{l.pct}% there</span>
            </div>
            <div className="h-2.5 rounded-full eai-soft overflow-hidden"><div className="h-full rounded-full" style={{ width: `${l.pct}%`, background: l.c }} /></div>
            <button className="eai-btn eai-focus w-full mt-4 py-2 text-sm eai-soft" style={{ color: "var(--ink)" }}>Take diagnostic</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Progress({ p, practice = {}, bonusXp = 0 }) {
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
        <h2 className="eai-display text-2xl font-extrabold">Progress</h2>
        <p className="eai-muted text-sm mt-1">Your full stats, analytics, and where you stand.</p>
      </div>

      {/* Today's progress — collected from Practice */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { l: "Done today", v: `${todayCompleted.length}`, sub: "exercises", c: "var(--jade)", icon: CheckCircle2 },
          { l: "Attempted today", v: `${todayAttempts.length}`, sub: "questions", c: "var(--primary)", icon: Target },
          { l: "Accuracy", v: accuracy != null ? `${accuracy}%` : "—", sub: "all time", c: "var(--gold)", icon: ClipboardCheck },
          { l: "XP today", v: `+${todayCompleted.length * 30}`, sub: "from practice", c: "var(--ember)", icon: Zap },
        ].map((s) => (
          <div key={s.l} className="eai-card p-4 flex items-center gap-3">
            <div className="grid place-items-center rounded-xl flex-shrink-0" style={{ width: 38, height: 38, background: "var(--bg-soft)" }}>
              <s.icon size={18} style={{ color: s.c }} />
            </div>
            <div className="min-w-0">
              <p className="eai-display text-xl font-extrabold leading-none">{s.v}</p>
              <p className="text-xs eai-muted mt-0.5 truncate">{s.l}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Exam readiness — a composite estimate, presented as a range rather than a guarantee */}
        <div className="eai-card p-6 relative overflow-hidden">
          <CardHead title="Exam readiness" kh="ភាពត្រៀមខ្លួនប្រឡង" />
          <div className="flex flex-col items-center -mb-2">
            <Gauge value={p.readiness.overall} />
            <div style={{ marginTop: -68, textAlign: "center" }}>
              <p className="eai-display text-4xl font-extrabold" style={{ color: "var(--jade)" }}>{p.readiness.overall}%</p>
              <p className="text-xs eai-muted">estimated range: {p.gradeRange}</p>
            </div>
          </div>
          <div className="space-y-2 mt-6">
            {[
              { l: "Knowledge mastery", v: p.readiness.mastery },
              { l: "Syllabus coverage", v: p.readiness.coverage },
              { l: "Study consistency", v: p.readiness.consistency },
              { l: "Completion speed", v: p.readiness.speed },
            ].map((r) => (
              <div key={r.l} className="flex items-center gap-2">
                <span className="text-xs eai-muted flex-1">{r.l}</span>
                <div className="w-16 h-1.5 rounded-full eai-soft overflow-hidden"><div className="h-full rounded-full" style={{ width: `${r.v}%`, background: "var(--primary)" }} /></div>
                <span className="text-xs font-bold w-8 text-right eai-display">{r.v}%</span>
              </div>
            ))}
          </div>
          <p className="text-xs eai-muted mt-4 leading-relaxed">
            Estimate, not a guarantee. {p.priorityTopic && <>Lifting <span style={{ color: "var(--ember)", fontWeight: 600 }}>{p.priorityTopic.t}</span> will move this the most.</>}
          </p>
        </div>

        {/* Weekly hours */}
        <div className="eai-card p-6 lg:col-span-2">
          <CardHead title="Weekly study hours" kh="ម៉ោងសិក្សា"
            action={<Pill icon={Clock} color="var(--primary)" soft="var(--primary-soft)" value="4.2h" label="this week" />} />
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
        <CardHead title="Leaderboard" kh="តារាងអ្នកនាំមុខ"
          action={<span className="text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5" style={{ background: "var(--gold-soft)", color: "var(--gold)" }}><Trophy size={12} /> This week</span>} />
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
                {e.name}{e.isYou && <span className="text-xs eai-muted font-normal"> · you</span>}
              </p>
              <span className="text-xs font-bold eai-display flex items-center gap-1 flex-shrink-0" style={{ color: "var(--gold)" }}>
                <Zap size={12} /> {e.xp.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
        {you.rank > 8 && (
          <p className="text-xs eai-muted mt-3 text-center">You're ranked #{you.rank} of {leaderboard.length} · {you.xp.toLocaleString()} XP</p>
        )}
      </div>

      {/* AI Learning Analytics */}
      <div className="eai-card p-6">
        <CardHead title="AI Learning Analytics" kh="ការវិភាគដោយ AI"
          action={<span className="text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5" style={{ background: "var(--primary-soft)", color: "var(--primary)" }}><Sparkles size={12} /> Live</span>} />
        <p className="text-xs eai-muted -mt-2 mb-4">The coach continuously analyzes these signals to personalize your plan:</p>
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
          <CardHead title="Subject mastery" kh="ការយល់ដឹងតាមមុខវិជ្ជា" />
          <div className="space-y-1">
            {p.subjects.map((s) => {
              const isOpen = openSubject === s.s;
              return (
                <div key={s.s}>
                  <button onClick={() => setOpenSubject(isOpen ? null : s.s)} className="eai-focus w-full flex items-center gap-3 py-1.5">
                    <span className="text-sm font-semibold w-32 truncate text-left">{s.s}</span>
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
                          <span className="text-xs eai-muted w-28 truncate">{t.t}</span>
                          <div className="flex-1 h-1.5 rounded-full eai-soft overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${t.score ?? 0}%`, background: LEVEL_COLOR[masteryLevel(t.score)] }} />
                          </div>
                          <span className="text-xs w-9 text-right eai-muted">{t.score != null ? `${t.score}%` : "—"}</span>
                          <span className="text-xs w-20 text-right eai-muted">{masteryLevel(t.score)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            {p.strong.map((s) => <span key={s.s} className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: "var(--jade-soft)", color: "var(--jade)" }}>💪 {s.s}</span>)}
            {p.weak.map((s) => <span key={s.s} className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: "var(--ember-soft)", color: "var(--ember)" }}>⚠ {s.s}</span>)}
          </div>
        </div>

        {/* AI recommendations */}
        <div className="eai-card p-6">
          <CardHead title="AI recommendations" kh="អនុសាសន៍ពី AI" />
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
          <CardHead title="Goals" kh="គោលដៅ" />
          <div className="space-y-4">
            {[{ l: "Weekly", v: "0.5 / 8h", p: 6, c: "var(--gold)" }, { l: "Monthly", v: "1 / 24 lessons", p: 4, c: "var(--jade)" }].map((g) => (
              <div key={g.l}>
                <div className="flex justify-between text-sm mb-1.5"><span className="font-semibold">{g.l} goal</span><span className="eai-muted text-xs">{g.v}</span></div>
                <div className="h-2 rounded-full eai-soft overflow-hidden"><div className="h-full rounded-full" style={{ width: `${g.p}%`, background: g.c }} /></div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div className="eai-card p-6">
          <CardHead title="Recent activity" kh="សកម្មភាពថ្មីៗ" />
          <div className="space-y-3">
            {(recent.length
              ? recent.map((e) => ({
                  t: `Completed ${e.subject}: ${e.topic}`,
                  meta: `${e.result === "correct" ? "Correct" : "Reviewed"} · +30 XP`,
                  c: e.result === "correct" ? "var(--jade)" : "var(--gold)",
                  icon: CheckCircle2,
                }))
              : [
                  { t: "Created your account", meta: "Welcome aboard · +40 XP", c: "var(--jade)", icon: GraduationCap },
                  { t: `Joined the ${FIELD_META[p.field].label} track`, meta: "Subjects personalized", c: "var(--primary)", icon: FileText },
                  { t: "AI built your first study plan", meta: "Based on your weak subjects", c: "var(--gold)", icon: Sparkles },
                ]
            ).map((a, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="grid place-items-center rounded-xl flex-shrink-0" style={{ width: 32, height: 32, background: "var(--bg-soft)" }}>
                  <a.icon size={16} style={{ color: a.c }} />
                </div>
                <div className="min-w-0"><p className="text-sm font-medium truncate">{a.t}</p><p className="text-xs eai-muted">{a.meta}</p></div>
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
function coachReply(text, p) {
  const t = text.toLowerCase();
  const weakest = p.weak[0]?.s;
  const strongest = p.strong[0]?.s;

  // 1) Did they mention one of their own subjects by name?
  const mentioned = p.subjects.find((s) => t.includes(s.s.toLowerCase()));
  if (mentioned) {
    const tag = mentioned.tag === "weak" ? "your weakest area — high impact"
      : mentioned.tag === "strong" ? "already a strength, so keep it sharp with light revision"
      : "tracking steadily";
    const focusTopic = [...mentioned.topics].sort((a, b) => (a.score ?? 999) - (b.score ?? 999))[0]?.t || mentioned.s;
    const pct = mentioned.m != null ? `${mentioned.m}%` : "not yet assessed";
    return `${mentioned.s} is at ${pct} (${tag}). I'd start with "${focusTopic}" — do a short lesson, then 8–10 practice questions and review every mistake. Want me to turn that into a 3-day mini-plan?`;
  }

  // 2) Keyword intents
  if (/(grade|odds|predict|chance|target)/.test(t))
    return `You're estimated in the ${p.gradeRange} range right now, on a ${p.avg ?? 0}% average mastery. The fastest lever is ${weakest || "your weakest subject"} — lifting it 10–15 points moves the estimate the most. Pair that with keeping your streak alive (consistency is weighted heavily) and you'll climb quickly.`;

  if (/(today|study|plan|what.*do|start)/.test(t))
    return `Here's a high-impact ${"~90 min"} plan for today:\n1) ${weakest || "Your weak subject"} — ${p.priorityTopic?.t || "core review"} (35m)\n2) A timed practice set for exam stamina (40m)\n3) A quick ${strongest || "strong-subject"} revision so you don't lose mastery (15m).`;

  if (/(ielts|toefl|hsk|delf|english|language|band|speaking|writing)/.test(t))
    return `For language exams, start with a diagnostic so we know your real level per skill (listening, reading, writing, speaking). Writing usually has the most room to grow — I can give you a prompt and score it skill-by-skill. Which exam are you aiming for?`;

  if (/(motivat|stuck|hard|tired|give up|stress|worried|nervous)/.test(t))
    return `That feeling is normal, and you're further along than you think — ${p.avg ?? 0}% average with ${p.strong.length} strong subject${p.strong.length === 1 ? "" : "s"} already. Let's shrink the goal: just 20 focused minutes on ${weakest || "one topic"} today. Small, consistent wins are exactly what move your exam-readiness estimate. You've got this. 🇰🇭`;

  if (/(hello|hi|hey|សួស្តី|chom reap)/.test(t))
    return `Hi ${p.name.split(" ")[0]}! Ready to study? You can ask me to explain a topic, build a plan, or quiz you. I'd suggest we start with ${weakest || "your weakest subject"} — that's where you'll gain the most.`;

  // 3) Fallback
  return `Good question. I can explain a concept step by step, build a study plan around your weak subjects (${p.weak.map((w) => w.s).join(", ") || "—"}), or quiz you. Try asking about your grade odds, what to study today, or a specific subject.`;
}

function Coach({ p }) {
  const [msgs, setMsgs] = useState([
    { role: "ai", text: `Hi ${p.name.split(" ")[0]} 👋 I'm your study coach. ${p.weak[0] ? `I see ${p.weak[0].s} is your biggest opportunity right now.` : ""} What would you like to work on?` },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);
  const suggestions = ["How do I improve my grade odds?", "What should I study today?", p.weak[0] ? `Help me with ${p.weak[0].s}` : "Make me a study plan"];

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, loading]);

  const send = (text) => {
    const t = (text ?? input).trim();
    if (!t || loading) return;
    setMsgs((m) => [...m, { role: "user", text: t }]);
    setInput("");
    setLoading(true);
    // Simulate "thinking" so the typing indicator feels natural.
    setTimeout(() => {
      setMsgs((m) => [...m, { role: "ai", text: coachReply(t, p) }]);
      setLoading(false);
    }, 650);
  };

  return (
    <div className="eai-rise flex flex-col" style={{ height: "calc(100vh - 130px)", maxHeight: 760 }}>
      <div className="flex items-center gap-3 mb-4">
        <div className="grid place-items-center rounded-2xl" style={{ width: 44, height: 44, background: "var(--primary)" }}><Sparkles size={22} color="#fff" /></div>
        <div>
          <h2 className="eai-display text-xl font-extrabold">AI study coach</h2>
          <p className="text-xs eai-muted">Demo coach · knows your subjects, weak spots & goals</p>
        </div>
      </div>
      <div className="eai-card flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto eai-scroll p-5 space-y-4">
          {msgs.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className="max-w-[80%] px-4 py-2.5 text-sm leading-relaxed" style={{
                borderRadius: 18, whiteSpace: "pre-wrap",
                background: m.role === "user" ? "var(--primary)" : "var(--bg-soft)",
                color: m.role === "user" ? "#fff" : "var(--ink)",
                borderBottomRightRadius: m.role === "user" ? 4 : 18, borderBottomLeftRadius: m.role === "user" ? 18 : 4,
              }}>{m.text}</div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="px-4 py-3 eai-soft flex items-center gap-1.5" style={{ borderRadius: 18, borderBottomLeftRadius: 4 }}>
                {[0, 1, 2].map((d) => <span key={d} style={{ width: 7, height: 7, borderRadius: 99, background: "var(--muted)", display: "inline-block", animation: "bounce 1.2s infinite", animationDelay: `${d * 0.18}s` }} />)}
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
        <div className="p-4 border-t" style={{ borderColor: "var(--line)" }}>
          <div className="flex gap-2 mb-3 overflow-x-auto eai-scroll pb-1">
            {suggestions.map((s) => (
              <button key={s} onClick={() => send(s)} disabled={loading} className="eai-btn eai-focus text-xs px-3 py-1.5 flex-shrink-0 eai-soft" style={{ color: "var(--ink)", opacity: loading ? 0.5 : 1 }}>{s}</button>
            ))}
          </div>
          <div className="flex gap-2">
            <input className="eai-input eai-focus flex-1 px-4 py-2.5 text-sm" placeholder="Ask anything about your studies…"
              value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} />
            <button onClick={() => send()} disabled={loading} className="eai-btn eai-focus px-4 text-white grid place-items-center" style={{ background: "var(--primary)", opacity: loading ? 0.6 : 1 }}><Send size={17} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════ Shell ════════════════════════ */
const NAV = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "browse", label: "Browse exams", icon: BookOpen },
  { id: "practice", label: "Practice", icon: Target },
  { id: "universities", label: "Universities", icon: GraduationCap },
  { id: "languages", label: "Languages", icon: Globe },
  { id: "coach", label: "AI coach", icon: Sparkles },
  { id: "progress", label: "Progress", icon: BarChart3 },
];

const STORAGE_KEY = "bondus_state_v1";

function loadSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export default function App() {
  const saved = useRef(loadSaved()).current;
  const [profile, setProfile] = useState(saved?.profile ?? null);
  const [pendingReg, setPendingReg] = useState(null); // registration answers, awaiting the diagnostic test
  const [topicMastery, setTopicMastery] = useState(saved?.topicMastery ?? {}); // { [subject]: { [topic]: { history, score, lastPracticedAt } } }
  const [tab, setTab] = useState("dashboard");
  const [dark, setDark] = useState(false);
  const [open, setOpen] = useState(false);
  const [practice, setPractice] = useState(saved?.practice ?? {}); // { [exId]: { status, result, at, subject, topic, xpAwarded } }
  const [plan, setPlan] = useState(saved?.plan ?? []);
  const [bonusXp, setBonusXp] = useState(saved?.bonusXp ?? 0);
  const go = (t) => { setTab(t); setOpen(false); };

  // Persist everything so progress survives a page refresh — this prototype has no backend yet.
  useEffect(() => {
    if (!profile) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ profile, topicMastery, practice, plan, bonusXp }));
  }, [profile, topicMastery, practice, plan, bonusXp]);

  const resetAll = () => {
    localStorage.removeItem(STORAGE_KEY);
    setProfile(null); setPendingReg(null); setTopicMastery({}); setPractice({}); setPlan([]); setBonusXp(0); setTab("dashboard");
  };

  // Registration collects answers, then the diagnostic test measures real mastery before the
  // profile (and its seeded daily plan) is actually built — self-reports alone aren't trusted.
  const handleRegister = (reg) => setPendingReg(reg);
  const handleDiagnosticComplete = (diagnosticMastery) => {
    const built = buildProfile(pendingReg);
    const insights = deriveInsights(built, diagnosticMastery);
    setTopicMastery(diagnosticMastery);
    setProfile(built);
    setPlan(insights.plan);
    setPendingReg(null);
  };

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

  if (pendingReg) return <Diagnostic reg={pendingReg} dark={dark} onComplete={handleDiagnosticComplete} />;
  if (!profile) return <Register onComplete={handleRegister} dark={dark} setDark={setDark} />;

  const initials = profile.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const view = {
    dashboard: <Dashboard p={p} go={go} plan={plan} onTogglePlan={togglePlanTask} bonusXp={bonusXp} />,
    browse: <Browse p={p} />,
    practice: <Practice p={p} practice={practice} onAnswer={handleAnswer} onSetStatus={handleSetStatus} />,
    universities: <Universities />, languages: <Languages />, coach: <Coach p={p} />, progress: <Progress p={p} practice={practice} bonusXp={bonusXp} />,
  }[tab];

  return (
    <div className={`eai-root ${dark ? "theme-dark" : "theme-light"}`}>
      <style>{STYLES}</style>
      <div className="flex">
        {open && <div className="fixed inset-0 z-20 lg:hidden" style={{ background: "rgba(0,0,0,.4)" }} onClick={() => setOpen(false)} />}
        <aside className={`fixed lg:sticky top-0 z-30 h-screen w-64 flex-shrink-0 border-r flex flex-col ${open ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
          style={{ background: "var(--card)", borderColor: "var(--line)", transition: "transform .25s ease" }}>
          <div className="p-5 flex items-center gap-2.5">
            <div className="grid place-items-center rounded-xl relative overflow-hidden" style={{ width: 40, height: 40, background: "var(--primary)" }}>
              <Angkor style={{ position: "absolute", bottom: -2, width: 40, height: 18, fill: "var(--gold)", opacity: 0.9 }} />
            </div>
            <div><p className="eai-display font-extrabold leading-none">EduAI</p><p className="eai-km text-xs eai-muted">កម្ពុជា · Cambodia</p></div>
          </div>
          <nav className="px-3 space-y-1 flex-1 overflow-y-auto eai-scroll">
            {NAV.map((n) => {
              const on = tab === n.id;
              return (
                <button key={n.id} onClick={() => go(n.id)} className="eai-nav eai-focus w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left"
                  style={{ background: on ? "var(--primary-soft)" : "transparent", color: on ? "var(--primary)" : "var(--ink)" }}>
                  <n.icon size={19} /><span className="text-sm font-semibold">{n.label}</span>
                </button>
              );
            })}
          </nav>
          <div className="p-3 space-y-2">
            <div className="eai-soft rounded-2xl p-4 text-center">
              <Flame size={20} style={{ color: "var(--ember)", margin: "0 auto" }} />
              <p className="text-xs font-semibold mt-2">{profile.streak}-day streak</p>
              <p className="text-xs eai-muted">Study today to keep it!</p>
            </div>
            <button onClick={resetAll} className="eai-focus w-full text-center text-xs eai-muted py-1.5 hover:underline">Log out</button>
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          <header className="sticky top-0 z-10 border-b" style={{ background: "color-mix(in srgb, var(--bg) 85%, transparent)", borderColor: "var(--line)", backdropFilter: "blur(8px)" }}>
            <div className="px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
              <button className="lg:hidden eai-focus" onClick={() => setOpen(true)}><Menu size={22} /></button>
              <div className="hidden sm:flex items-center gap-2">
                <Pill icon={Flame} color="var(--ember)" soft="var(--ember-soft)" value={profile.streak} label="streak" />
                <Pill icon={Zap} color="var(--gold)" soft="var(--gold-soft)" value={(profile.xp + bonusXp).toLocaleString()} label="XP" />
                <Pill icon={TrendingUp} color="var(--primary)" soft="var(--primary-soft)" value={`Lv ${profile.level}`} label="" />
              </div>
              <div className="flex items-center gap-2 ml-auto">
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
