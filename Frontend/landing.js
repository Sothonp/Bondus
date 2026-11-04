/* Small pure helpers for the scrolling landing page (Landing.jsx), kept apart so they can be tested without a browser.

   - practiceQuestionStat: the "practice questions" number in the stats banner is the REAL size of the question bank,
     rounded DOWN to the hundred ("1,062 questions" shows as "1,000+"), so the page never claims more than the app has.
   - socialLinks / contactEmail: the footer's social icons and contact address come from build-time settings
     (VITE_SOCIAL_* and VITE_CONTACT_EMAIL). An icon only appears when its address is set and is a real https:// link, so
     there are never dead or placeholder icons on the page.
   - toKhmerDigits: Khmer pages show Khmer digits, like the rest of the app's Khmer text. */

export const NAV_SECTIONS = ["features", "how", "faq"];

/** Rounds `count` down to a multiple of `step`; a bank smaller than one step is shown as its exact size. */
export function practiceQuestionStat(count, step = 100) {
  const n = Math.floor(Number(count));
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n < step ? n : Math.floor(n / step) * step;
}

const SOCIALS = [
  { id: "facebook", key: "VITE_SOCIAL_FACEBOOK", label: "Facebook" },
  { id: "telegram", key: "VITE_SOCIAL_TELEGRAM", label: "Telegram" },
  { id: "tiktok", key: "VITE_SOCIAL_TIKTOK", label: "TikTok" },
  { id: "youtube", key: "VITE_SOCIAL_YOUTUBE", label: "YouTube" },
];

/** The social channels that are set up, as [{ id, label, url }]. Only https:// addresses are accepted. */
export function socialLinks(env = {}) {
  const out = [];
  for (const s of SOCIALS) {
    const raw = typeof env[s.key] === "string" ? env[s.key].trim() : "";
    if (!raw) continue;
    let url;
    try { url = new URL(raw); } catch { continue; }
    if (url.protocol !== "https:" || !url.hostname.includes(".")) continue;
    out.push({ id: s.id, label: s.label, url: url.toString() });
  }
  return out;
}

/** The contact address for the footer, or "" when none is set (or it doesn't look like an address). */
export function contactEmail(env = {}) {
  const raw = typeof env.VITE_CONTACT_EMAIL === "string" ? env.VITE_CONTACT_EMAIL.trim() : "";
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(raw) ? raw : "";
}

const KHMER_DIGITS = "០១២៣៤៥៦៧៨៩";
export function toKhmerDigits(text) {
  return String(text).replace(/[0-9]/g, (d) => KHMER_DIGITS[Number(d)]);
}

/** "1,000" in English, "១,០០០" in Khmer. */
export function formatCount(n, lang = "en") {
  const text = Math.round(n).toLocaleString("en-US");
  return lang === "km" ? toKhmerDigits(text) : text;
}

/** Eased progress 0..1 for a count-up that lasts `duration` ms (easeOutCubic). */
export function countProgress(elapsed, duration) {
  if (duration <= 0) return 1;
  const p = Math.min(1, Math.max(0, elapsed / duration));
  return 1 - Math.pow(1 - p, 3);
}
