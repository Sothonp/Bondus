/* Streak flame rules — pure functions, no React, tested in streakFlame.test.js.

   The flame has three resting states. Its colour depends only on whether the student studied today; the time of day
   changes the wording and the urgency, never the hue (a fourth look, "igniting", is the one-off animation when a
   dormant flame becomes lit — see StreakFlame.jsx).

     cold     no streak at all           outline flame, nothing to protect yet
     dormant  a streak, nothing today    flat slate flame; the streak is alive until the Phnom Penh day ends
     lit      studied today              orange gradient flame with a glow

   "Studied today" comes from the server's study ledger (summary.studiedToday) or, in browser-only mode, from the answer
   history (computeStreakStats). A day is always the Phnom Penh day, the same one the Laravel backend counts. */

export const PHNOM_PENH_TZ = "Asia/Phnom_Penh";

/* Hours (fractional) from `now` to the next midnight in Phnom Penh, between 0 and 24. */
export function hoursLeftToday(now = Date.now()) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: PHNOM_PENH_TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .formatToParts(new Date(now));
  const hour = Number(parts.find((x) => x.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((x) => x.type === "minute")?.value ?? 0);
  return 24 - (hour + minute / 60);
}

/* A student who studied today is lit even if the streak count has not caught up yet. */
export function flameState({ streak, studiedToday }) {
  if (studiedToday) return "lit";
  return streak > 0 ? "dormant" : "cold";
}

/* How loudly a dormant flame asks for attention. Only a dormant flame ever does, and never by turning red.
   label     "Not lit yet today"
   countdown "Ends in 5h 10m" (the last 6 hours)
   ring      the countdown plus a slow breathing ring (the last 3 hours) */
export function flameUrgency(state, hoursLeft) {
  if (state !== "dormant") return "none";
  if (hoursLeft <= 3) return "ring";
  if (hoursLeft <= 6) return "countdown";
  return "label";
}

export function countdownText(hoursLeft, lang = "en") {
  const total = Math.max(0, Math.ceil(hoursLeft * 60));
  const h = Math.floor(total / 60), m = total % 60;
  if (lang === "km") return `នៅសល់ ${h} ម៉ោង ${m} នាទី`;
  return h > 0 ? `Ends in ${h}h ${m}m` : `Ends in ${m}m`;
}

export const FLAME_STRINGS = {
  en: { cold: "Start your streak", lit: "Lit today", dormant: "Not lit yet today" },
  km: { cold: "ចាប់ផ្តើមថ្ងៃជាប់គ្នារបស់អ្នក", lit: "ភ្លើងឆេះហើយថ្ងៃនេះ", dormant: "មិនទាន់ឆេះថ្ងៃនេះ" },
};

/* The words that sit next to the flame, so the state never depends on colour alone. */
export function flameLabel(state, urgency, hoursLeft, lang = "en") {
  const strings = FLAME_STRINGS[lang] ?? FLAME_STRINGS.en;
  if (state === "dormant" && (urgency === "countdown" || urgency === "ring")) return countdownText(hoursLeft, lang);
  return strings[state];
}
