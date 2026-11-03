/* Guards on how the AI Coach's chat history is wired into the screen. App.jsx is read as text because the app has no DOM test
   harness in CI (the same way khmerWiring.test.js does); the behaviour itself was driven in a real browser and the chat store
   is tested in coachHistory.test.js.
   Run with:  node --test Frontend/coachHistoryWiring.test.js */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (name) => readFileSync(new URL(`./${name}`, import.meta.url), "utf8");
const app = read("App.jsx");
const ui = read("CoachHistory.jsx");
const between = (text, from, to) => { const a = text.indexOf(from); const b = text.indexOf(to, a + from.length); assert.ok(a >= 0 && b > a, `${from} … ${to}`); return text.slice(a, b); };
const coach = between(app, "function Coach(", "/* ════════════════════════ Super Bondus");

test("the Coach keeps a list of saved chats instead of one list of messages per mode", () => {
  assert.ok(!app.includes("msgsByMode") && !app.includes("setMsgsByMode"), "the old per-mode message lists are gone");
  assert.match(coach, /const \[chats, setChats\] = useState\(saved\.chats\);/);
  assert.match(coach, /const \[activeByMode, setActiveByMode\] = useState\(saved\.active\);/);
  assert.match(coach, /loadHistory\(safeStorage\(\), userKey\)/);
  assert.match(app, /<Coach p=\{p\} lang=\{lang\} userKey=\{userKeyOf\(profile\)\} onUpgrade=\{\(\) => go\("super"\)\} \/>/, "saved per student");
});

test("a reply is written into the chat it was asked in, and only one reply is written at a time", () => {
  const send = between(coach, "const send = (text) => {", "const stop = ");
  assert.match(send, /const chatId = activeId \?\? newChatId\(stamp\);/);
  assert.match(send, /patchChat\(chatId, replyMode, \(c\) => upsertMessage\(c, \{ id: replyId, role: "ai", \.\.\.reply \}\)\)/);
  assert.match(send, /\|\| generating \|\|/, "a second question waits for the first");
  assert.match(send, /setLoadingId\(chatId\)/);
  assert.match(send, /setLoadingId\(\(id\) => \(id === chatId \? null : id\)\)/, "and frees the Coach only for its own chat");
  assert.match(coach, /const patchChat = \(id, chatMode, change, \{ create = false \} = \{\}\)/);
  assert.match(coach, /found \|\| create \? putChat\(/, "only a question makes a chat; a late reply for a deleted chat is dropped");
  assert.match(coach, /if \(loadingId === id\) abortRef\.current\?\.abort\(\);/, "deleting the chat that is answering stops it");
  assert.match(coach, /const loading = generating && loadingId === activeId;/, "the 'thinking' state belongs to its own chat");
  assert.match(coach, /\{generating && !loading && <p[^>]*>\{T\("histBusy"\)\}<\/p>\}/, "another chat's answer is explained, not silent");
});

test("the first question names the chat; a blank screen only becomes a chat when something is sent", () => {
  assert.match(coach, /withTitle\(upsertMessage\(c, \{\s*id: userId, role: "user", text: shownText,/);
  assert.match(coach, /const newChat = \(\) => \{\s*setActiveByMode\(\(a\) => \(\{ \.\.\.a, \[mode\]: null \}\)\);/);
  assert.match(coach, /\(hover: hover\)/, "a phone's keyboard is not opened by New chat");
});

test("chats are saved shortly after a change, when the page is hidden, and when the Coach is left; and only if this tab changed them", () => {
  assert.match(coach, /setTimeout\(flush, 400\)/);
  assert.match(coach, /window\.addEventListener\("pagehide", flush\)/);
  assert.match(coach, /document\.addEventListener\("visibilitychange", hidden\)/);
  assert.match(coach, /alive\.current = false;\s*flush\(\);/);
  assert.match(coach, /if \(!dirty\.current \|\| userKey == null\) return;/);
  assert.match(coach, /if \(all\.length === 0\) clearHistory\(storage, userKey\);/, "deleting every chat removes the saved copy");
  assert.match(coach, /tf\(langNow, "histSaveFailed"\)/, "a refused save is not silent");
});

test("the list is shown beside the chat on a wide screen and as a sheet elsewhere, never both", () => {
  assert.match(coach, /useMediaQuery\("\(min-width: 1280px\)"\)/);
  assert.match(coach, /const railShown = wide && railOpen;/);
  assert.match(coach, /\{railShown && <HistoryRail \{\.\.\.historyProps\} onHide=\{toggleHistory\} \/>\}/);
  assert.match(coach, /\{historyOpen && !wide && <HistorySheet \{\.\.\.historyProps\} onClose=\{\(\) => setHistoryOpen\(false\)\} \/>\}/);
  assert.match(coach, /useEffect\(\(\) => \{ if \(wide\) setHistoryOpen\(false\); \}, \[wide\]\);/);
  assert.match(coach, /\{!railShown && <NewChatButton /, "the header's New chat steps aside when the list has its own");
  assert.match(coach, /chatsForModes\(chats, availableModeIds\)/, "a student only sees chats of the modes they have");
});

test("the sheet is drawn at the top of the app, is a modal dialog, and does not zoom an iPhone", () => {
  assert.match(ui, /createPortal\(sheet, host\)/);
  assert.match(ui, /document\.querySelector\("\.eai-root"\)/, "inside the themed root, so the colours and the Khmer font reach it");
  assert.match(ui, /role="dialog" aria-modal="true"/);
  assert.match(ui, /e\.key === "Escape"/);
  assert.match(ui, /document\.body\.style\.overflow = "hidden"/);
  assert.match(ui, /opener\.focus\(\)/, "the keyboard goes back where it was");
  const css = between(app, ".eai-hist-input{", "\n");
  assert.match(css, /font-size:16px/, "an input under 16 px makes iOS Safari zoom the page");
  assert.match(app, /\.eai-hist-sheet\{[^}]*z-index:60/, "above the phone's bottom bar");
});

test("deleting asks first, and every control has a name a screen reader can read", () => {
  assert.match(ui, /T\("histDeleteAsk"\)/);
  assert.match(ui, /T\("histClearAsk"\)/);
  assert.match(ui, /autoFocus onClick=\{stop\}/, "Cancel is what the keyboard lands on");
  for (const key of ["histMore", "histSearchClear", "histClose", "histRenameLabel", "histSearch", "histShow", "histHide"]) assert.ok(ui.includes(`"${key}"`), key);
  assert.match(ui, /aria-current=\{active \? "true" : undefined\}/);
});

test("the mode tabs scroll instead of running off a phone, and the title keeps its line", () => {
  assert.match(coach, /overflow-x-auto \[scrollbar-width:none\]/);
  assert.match(coach, /shrink-0 whitespace-nowrap ?\$\{km\}`\}>\{T\("coachTitle"\)\}|font-extrabold shrink-0 whitespace-nowrap/);
});

test("the Coach header wraps instead of drawing the title under New chat and the mode tabs", () => {
  // Breaks if: the title group goes back to flex-1 below lg. A flex-1 box starts from zero width, so the row never wraps and a title
  // that will not shrink is drawn under the buttons (seen on a phone in Khmer after leaving the Coach and coming back).
  assert.match(coach, /order-1 flex items-center gap-2\.5 min-w-0 flex-auto lg:flex-1/);
  assert.doesNotMatch(coach, /order-1 flex items-center gap-2\.5 min-w-0 flex-1"/);
  // the History button is icon-only on a phone, so the title and New chat fit on one line
  assert.match(ui, /max-\[479px\]:hidden \$\{kmc\(lang\)\}`\}>\{T\("histButton"\)\}/);
});
