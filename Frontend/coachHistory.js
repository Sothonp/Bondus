/* The AI Coach's saved chats: the pure part (no React, no DOM), tested in coachHistory.test.js.

   A chat belongs to one Coach mode (Study Help, Exam Generator, Major Guidance, University Mentor), has a title taken from
   the first question, and holds its messages. The list is kept in localStorage under the student's own key, so it is on
   this device only and two students on one browser never see each other's chats. Nothing here talks to a server.

   What is NOT kept: a photo's picture (a 1200 px data URL is far too big for localStorage, so a saved chat shows the
   photo's file name instead), and the "thinking..." status line of a reply that was cut off. What the photo said (the
   text read from it) is kept, so the chat still makes sense. */

export const COACH_MODE_LIST = ["study", "exam", "major", "university"];
export const MAX_CHATS = 60;           // the oldest go first
export const MAX_MESSAGES = 200;       // per chat, the oldest go first
export const MAX_CHARS = 1_200_000;    // the whole saved text; localStorage allows about 5 million per site
export const TITLE_MAX = 48;           // letters (as a person counts them) in a title made from a question
export const RENAME_MAX = 80;
export const RESUME_WITHIN_MS = 6 * 60 * 60 * 1000; // a chat touched in the last 6 hours is where the Coach reopens
const STORE_VERSION = 1;
const KHMER_DIGITS = "០១២៣៤៥៦៧៨៩";

export const historyKey = (userKey) => `bondus_coach_chats_v1:${userKey}`;
/* Same notion of "this student" as the daily warm-up uses. */
export const userKeyOf = (profile) => (profile ? String(profile.userId ?? profile.email ?? profile.phone ?? profile.name) : null);

const byRecent = (a, b) => b.updatedAt - a.updatedAt;
const str = (v) => (typeof v === "string" ? v : "");

/* ── Titles ── */
let segmenter;
/* A title is cut by letters as a person sees them, not by code units: Khmer stacks a consonant, a subscript and a vowel
   into one letter, and cutting through it leaves a stray mark. */
function graphemes(value) {
  if (typeof Intl !== "undefined" && typeof Intl.Segmenter === "function") {
    segmenter ??= new Intl.Segmenter(undefined, { granularity: "grapheme" });
    return Array.from(segmenter.segment(value), (s) => s.segment);
  }
  return Array.from(value);
}
export function clip(value, max) {
  const parts = graphemes(value);
  return parts.length <= max ? value : `${parts.slice(0, max - 1).join("").trimEnd()}…`;
}
/* The first line of the first question, tidied. null when there is nothing to name it by (a photo with no words). */
export function titleFrom(question, max = TITLE_MAX) {
  const line = String(question ?? "").split(/\r?\n/).map((l) => l.replace(/\s+/g, " ").trim()).find(Boolean);
  return line ? clip(line, max) : null;
}

/* ── One chat ── */
export const newChatId = (now = Date.now(), random = Math.random) => `chat-${now.toString(36)}-${random().toString(36).slice(2, 8)}`;
export const makeChat = ({ id, mode, title = null, now = Date.now() }) => ({ id, mode, title, createdAt: now, updatedAt: now, messages: [] });

/* Adds a message, or replaces the one with the same id in its place (a streaming reply updates one message again and
   again). Bumps updatedAt, which is what orders the list. */
export function upsertMessage(chat, message, now = Date.now()) {
  const has = chat.messages.some((m) => m.id === message.id);
  let messages = has ? chat.messages.map((m) => (m.id === message.id ? message : m)) : [...chat.messages, message];
  if (messages.length > MAX_MESSAGES) messages = messages.slice(messages.length - MAX_MESSAGES);
  return { ...chat, messages, updatedAt: now };
}
export function changeMessage(chat, id, change, now = Date.now()) {
  if (!chat.messages.some((m) => m.id === id)) return chat;
  return { ...chat, messages: chat.messages.map((m) => (m.id === id ? change(m) : m)), updatedAt: now };
}
/* Names the chat from a question, once. A chat the student renamed keeps their name. */
export function withTitle(chat, question) {
  if (chat.title || chat.renamed) return chat;
  const title = titleFrom(question);
  return title ? { ...chat, title } : chat;
}

/* ── The list ── */
export function putChat(chats, chat) {
  const next = chats.some((c) => c.id === chat.id) ? chats.map((c) => (c.id === chat.id ? chat : c)) : [chat, ...chats];
  return next.length > MAX_CHATS ? [...next].sort(byRecent).slice(0, MAX_CHATS) : next;
}
export const removeChat = (chats, id) => chats.filter((c) => c.id !== id);
/* A blank name is ignored (the old one stays). Renaming does not move the chat in the list. */
export function renameChat(chats, id, name) {
  const clean = clip(String(name ?? "").replace(/\s+/g, " ").trim(), RENAME_MAX);
  return clean ? chats.map((c) => (c.id === id ? { ...c, title: clean, renamed: true } : c)) : chats;
}
export const chatsForModes = (chats, modes) => chats.filter((c) => modes.includes(c.mode));

/* Today / Yesterday / Previous 7 days / Earlier, by the device's own calendar days, newest first. Empty groups are left out. */
export function groupChats(chats, now = Date.now()) {
  const day = new Date(now);
  day.setHours(0, 0, 0, 0);
  const today = day.getTime();
  day.setDate(day.getDate() - 1);
  const yesterday = day.getTime();
  day.setDate(day.getDate() - 6);
  const week = day.getTime();
  const groups = [{ id: "today", items: [] }, { id: "yesterday", items: [] }, { id: "week", items: [] }, { id: "earlier", items: [] }];
  for (const chat of [...chats].sort(byRecent)) {
    groups[chat.updatedAt >= today ? 0 : chat.updatedAt >= yesterday ? 1 : chat.updatedAt >= week ? 2 : 3].items.push(chat);
  }
  return groups.filter((g) => g.items.length > 0);
}

const norm = (s) => String(s ?? "").normalize("NFC").toLowerCase().trim();
/* Chats whose title or any message contains the words typed. A blank search finds everything. */
export function searchChats(chats, query) {
  const q = norm(query);
  if (!q) return chats;
  return chats.filter((c) => norm(c.title).includes(q) || c.messages.some((m) => typeof m.text === "string" && norm(m.text).includes(q)));
}

/* "2:15 PM" for today and yesterday, "Mon" within the week, "12 Oct" (and the year, if it is another one) before that. */
export function formatWhen(ts, now = Date.now(), lang = "en") {
  try {
    const locale = lang === "km" ? "km-KH" : "en";
    const then = new Date(ts);
    const midnight = new Date(now);
    midnight.setHours(0, 0, 0, 0);
    const daysAgo = Math.round((midnight.getTime() - new Date(then).setHours(0, 0, 0, 0)) / 86_400_000);
    const options = daysAgo <= 1 ? { hour: "numeric", minute: "2-digit" }
      : daysAgo < 7 ? { weekday: "short" }
      : then.getFullYear() === midnight.getFullYear() ? { day: "numeric", month: "short" }
      : { day: "numeric", month: "short", year: "numeric" };
    const out = new Intl.DateTimeFormat(locale, options).format(then);
    return lang === "km" ? out.replace(/[0-9]/g, (d) => KHMER_DIGITS[d]) : out;
  } catch {
    return "";
  }
}

/* ── Saving and loading ── */

/* A reply that was still streaming when the page closed is finished as it stands; one with nothing yet is dropped. */
function settleMessage(m) {
  if (!m.streaming) return m;
  return m.text ? { ...m, streaming: false, notice: null } : null;
}
const storable = (m) => {
  const settled = settleMessage(m);
  if (!settled) return null;
  return Array.isArray(settled.images) ? { ...settled, images: settled.images.map(({ id, name }) => ({ id, name })) } : settled;
};
const storableChat = (c) => ({
  id: c.id, mode: c.mode, title: c.title ?? null, ...(c.renamed ? { renamed: true } : {}),
  createdAt: c.createdAt, updatedAt: c.updatedAt, messages: c.messages.map(storable).filter(Boolean),
});

const encode = (chats, active) => {
  const keep = {};
  for (const mode of COACH_MODE_LIST) if (chats.some((c) => c.id === active?.[mode] && c.mode === mode)) keep[mode] = active[mode];
  return JSON.stringify({ v: STORE_VERSION, active: keep, chats });
};

/* The text to save: newest chats first, each message settled and without photo pictures, and no more than maxChars. When it
   is too big the oldest chats go; the newest chat is never dropped, only shortened (its oldest messages go) if it alone is too big. */
export function serializeHistory({ chats, active }, { maxChars = MAX_CHARS } = {}) {
  let list = [...chats].sort(byRecent).slice(0, MAX_CHATS).map(storableChat).filter((c) => c.messages.length > 0);
  let json = encode(list, active);
  while (json.length > maxChars && list.length > 1) {
    list = list.slice(0, -1);
    json = encode(list, active);
  }
  while (json.length > maxChars && list.length === 1 && list[0].messages.length > 2) {
    list = [{ ...list[0], messages: list[0].messages.slice(Math.ceil(list[0].messages.length / 2)) }];
    json = encode(list, active);
  }
  return json;
}

function restoreMessage(raw) {
  if (!raw || typeof raw !== "object" || typeof raw.id !== "string" || (raw.role !== "user" && raw.role !== "ai")) return null;
  const m = { ...raw, text: str(raw.text) };
  if (m.images !== undefined) {
    m.images = Array.isArray(m.images)
      ? m.images.filter((i) => i && typeof i === "object" && typeof i.id === "string").map((i) => ({ id: i.id, name: str(i.name) || "photo" }))
      : [];
  }
  if (m.readings !== undefined) {
    m.readings = Array.isArray(m.readings)
      ? m.readings.filter((r) => r && typeof r === "object").map((r) => ({ ...r, warnings: Array.isArray(r.warnings) ? r.warnings.map(String) : [] }))
      : [];
  }
  if (m.exam !== undefined && (m.exam === null || typeof m.exam !== "object")) delete m.exam;
  return settleMessage(m);
}
function restoreChat(raw, modes) {
  if (!raw || typeof raw !== "object" || typeof raw.id !== "string" || !raw.id || !modes.includes(raw.mode) || !Array.isArray(raw.messages)) return null;
  const messages = raw.messages.map(restoreMessage).filter(Boolean).slice(-MAX_MESSAGES);
  if (messages.length === 0) return null;
  const updatedAt = Number.isFinite(raw.updatedAt) ? raw.updatedAt : 0;
  return {
    id: raw.id, mode: raw.mode, title: typeof raw.title === "string" && raw.title ? raw.title : null, ...(raw.renamed ? { renamed: true } : {}),
    createdAt: Number.isFinite(raw.createdAt) ? raw.createdAt : updatedAt, updatedAt, messages,
  };
}

/* What was saved, checked as it comes back: anything that is not the shape we write is dropped rather than trusted, so a
   corrupt or old save can never break the Coach screen. `active` has, per mode, the chat the Coach reopens on. */
export function restoreHistory(raw, { now = Date.now(), modes = COACH_MODE_LIST } = {}) {
  const none = { chats: [], active: {} };
  let data;
  try { data = JSON.parse(raw); } catch { return none; }
  if (!data || data.v !== STORE_VERSION || !Array.isArray(data.chats)) return none;
  const seen = new Set();
  const chats = data.chats.map((c) => restoreChat(c, modes)).filter((c) => c && !seen.has(c.id) && seen.add(c.id)).sort(byRecent).slice(0, MAX_CHATS);
  const active = {};
  for (const mode of modes) {
    const chat = chats.find((c) => c.id === data.active?.[mode] && c.mode === mode);
    if (chat && now - chat.updatedAt <= RESUME_WITHIN_MS) active[mode] = chat.id;
  }
  return { chats, active };
}

/* The mode the Coach reopens on: of the modes this student has, the one whose resumable chat was touched last. null when
   there is none (the Coach then opens on its usual first mode). */
export function reopenMode({ chats, active }, modeIds) {
  let best = null;
  for (const mode of modeIds) {
    const chat = chats.find((c) => c.id === active[mode]);
    if (chat && (!best || chat.updatedAt > best.updatedAt)) best = chat;
  }
  return best ? best.mode : null;
}

export function loadHistory(storage, userKey, options) {
  try {
    const raw = userKey == null ? null : storage?.getItem(historyKey(userKey));
    return raw ? restoreHistory(raw, options) : { chats: [], active: {} };
  } catch {
    return { chats: [], active: {} };
  }
}
/* true when it was saved. If the browser refuses (storage full), tries again with less, down to nothing. */
export function saveHistory(storage, userKey, state, options) {
  if (!storage || userKey == null) return false;
  let json = serializeHistory(state, options);
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      storage.setItem(historyKey(userKey), json);
      return true;
    } catch {
      json = serializeHistory(state, { ...options, maxChars: Math.floor(json.length / 2) });
    }
  }
  return false;
}
export function clearHistory(storage, userKey) {
  try { if (userKey != null) storage?.removeItem(historyKey(userKey)); } catch { /* storage blocked: nothing to clear */ }
}
