/* The AI Coach's saved chats (coachHistory.js): titles, the day groups, search, and saving and loading, including a save
   that is corrupt, too big, or refused by the browser.
   Run with:  node --test Frontend/coachHistory.test.js */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_CHATS, MAX_MESSAGES, RESUME_WITHIN_MS, TITLE_MAX, historyKey, userKeyOf, clip, titleFrom, newChatId, makeChat,
  upsertMessage, changeMessage, withTitle, putChat, removeChat, renameChat, chatsForModes, groupChats, searchChats,
  formatWhen, serializeHistory, restoreHistory, loadHistory, saveHistory, clearHistory,
} from "./coachHistory.js";

const NOW = new Date(2026, 10, 2, 9, 30).getTime();          // Mon 2 Nov 2026, 09:30 on the machine's own clock
const at = (daysAgo, h = 12, m = 0) => new Date(2026, 10, 2 - daysAgo, h, m).getTime();
const chat = (id, updatedAt, extra = {}) => ({
  id, mode: "study", title: id, createdAt: updatedAt, updatedAt,
  messages: [{ id: `${id}-u`, role: "user", text: `question ${id}` }, { id: `${id}-a`, role: "ai", rag: true, text: `answer ${id}` }], ...extra,
});
const fakeStorage = (failFirst = 0) => {
  const data = new Map();
  let fails = failFirst;
  return {
    data,
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => { if (fails > 0) { fails -= 1; throw new Error("QuotaExceededError"); } data.set(k, v); },
    removeItem: (k) => data.delete(k),
  };
};

test("a title is the first line of the question, tidied, and null when there are no words", () => {
  assert.equal(titleFrom("  How do   I solve\tintegrals?\nThe second line"), "How do I solve integrals?");
  assert.equal(titleFrom("\n\n  \nFirst real line"), "First real line");
  assert.equal(titleFrom(""), null);
  assert.equal(titleFrom("   \n  "), null);
  assert.equal(titleFrom(undefined), null);
  assert.equal(titleFrom("📝 Mock paper: Mathematics · Khmer\nintegrals"), "📝 Mock paper: Mathematics · Khmer");
});

test("a long title is cut at TITLE_MAX letters with an ellipsis, and not through an emoji", () => {
  const long = "word ".repeat(40);
  const title = titleFrom(long);
  assert.ok(title.endsWith("…"));
  assert.ok([...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(title)].length <= TITLE_MAX);
  assert.equal(titleFrom("x".repeat(TITLE_MAX)), "x".repeat(TITLE_MAX), "exactly TITLE_MAX is kept whole");
  const family = "👨‍👩‍👧‍👦"; // one letter made of seven code points
  const cut = clip(family.repeat(10), 3);
  assert.equal(cut, `${family}${family}…`);
});

test("a Khmer title is cut between letters, never through a stacked consonant or a vowel sign", () => {
  const sentence = "តើខ្ញុំអាចដោះស្រាយអាំងតេក្រាលនេះបានដោយរបៀបណា ហើយតើមានវិធីផ្សេងទៀតទេ សូមពន្យល់ជាជំហានៗ";
  const khmer = `${sentence} ${sentence}`; // 90 letters: longer than a title
  const title = titleFrom(khmer);
  assert.ok(title.endsWith("…"));
  const body = title.slice(0, -1);
  assert.ok(khmer.startsWith(body.trimEnd()), "the title is a leading part of the question");
  // a cut through a letter would leave the body ending in a subscript joiner (coeng) or begin the rest with a dependent mark
  assert.ok(!body.endsWith("្"), "does not end on a coeng");
  const rest = khmer.slice(body.length);
  assert.ok(!/^[ា-៑៓៝]/.test(rest), "the rest does not begin with a vowel sign or other dependent mark");
});

test("a new chat gets a unique id and starts empty", () => {
  const a = newChatId(1_700_000_000_000, () => 0.123456);
  const b = newChatId(1_700_000_000_000, () => 0.654321);
  assert.notEqual(a, b);
  assert.match(a, /^chat-[a-z0-9]+-[a-z0-9]+$/);
  assert.deepEqual(makeChat({ id: "c1", mode: "exam", now: 5 }), { id: "c1", mode: "exam", title: null, createdAt: 5, updatedAt: 5, messages: [] });
});

test("upsertMessage appends, replaces in place by id, bumps updatedAt, and keeps the newest MAX_MESSAGES", () => {
  let c = makeChat({ id: "c", mode: "study", now: 1 });
  c = upsertMessage(c, { id: "u1", role: "user", text: "hi" }, 10);
  c = upsertMessage(c, { id: "r1", role: "ai", text: "he" }, 20);
  c = upsertMessage(c, { id: "u2", role: "user", text: "more" }, 30);
  c = upsertMessage(c, { id: "r1", role: "ai", text: "hello" }, 40);
  assert.deepEqual(c.messages.map((m) => [m.id, m.text]), [["u1", "hi"], ["r1", "hello"], ["u2", "more"]], "r1 was replaced where it was");
  assert.equal(c.updatedAt, 40);
  let big = makeChat({ id: "big", mode: "study" });
  for (let i = 0; i < MAX_MESSAGES + 25; i += 1) big = upsertMessage(big, { id: `m${i}`, role: i % 2 ? "ai" : "user", text: String(i) });
  assert.equal(big.messages.length, MAX_MESSAGES);
  assert.equal(big.messages.at(-1).id, `m${MAX_MESSAGES + 24}`);
  assert.equal(big.messages[0].id, "m25");
});

test("changeMessage changes one message, and leaves the chat alone when that message is gone", () => {
  const c = chat("c", 100);
  const changed = changeMessage(c, "c-u", (m) => ({ ...m, readings: [] }), 200);
  assert.deepEqual(changed.messages[0].readings, []);
  assert.equal(changed.updatedAt, 200);
  assert.equal(changeMessage(c, "nope", (m) => m, 300), c);
});

test("a chat is named from its first question once, and a rename is never overwritten", () => {
  const c = makeChat({ id: "c", mode: "study" });
  const named = withTitle(c, "What is a limit?");
  assert.equal(named.title, "What is a limit?");
  assert.equal(withTitle(named, "Something else").title, "What is a limit?");
  assert.equal(withTitle(c, "").title, null, "a photo with no words leaves the chat untitled for now");
  assert.equal(withTitle(withTitle(c, ""), "Now with words").title, "Now with words");
  const renamed = renameChat([named], "c", "  My   limits  ")[0];
  assert.deepEqual([renamed.title, renamed.renamed], ["My limits", true]);
  assert.equal(withTitle({ ...c, renamed: true }, "ignored").title, null, "a renamed-but-blank chat is not retitled");
});

test("renameChat ignores a blank name, clips a long one, and does not move the chat", () => {
  const list = [chat("a", 300), chat("b", 200)];
  assert.equal(renameChat(list, "a", "   "), list);
  assert.equal(renameChat(list, "a", "").length, 2);
  const long = renameChat(list, "b", "y".repeat(200));
  assert.ok([...long[1].title].length <= 80);
  assert.equal(long[1].updatedAt, 200);
  assert.deepEqual(long.map((c) => c.id), ["a", "b"]);
});

test("putChat replaces a chat in place or puts a new one first, and keeps the MAX_CHATS most recent", () => {
  let list = [chat("a", 100), chat("b", 200)];
  list = putChat(list, { ...list[0], title: "A!" });
  assert.deepEqual(list.map((c) => c.id), ["a", "b"]);
  assert.equal(list[0].title, "A!");
  list = putChat(list, chat("c", 300));
  assert.deepEqual(list.map((c) => c.id), ["c", "a", "b"]);
  let many = [];
  for (let i = 0; i < MAX_CHATS + 5; i += 1) many = putChat(many, chat(`c${i}`, 1000 + i));
  assert.equal(many.length, MAX_CHATS);
  assert.ok(many.some((c) => c.id === `c${MAX_CHATS + 4}`), "the newest is kept");
  assert.ok(!many.some((c) => c.id === "c0"), "the oldest went");
  assert.deepEqual(removeChat(list, "a").map((c) => c.id), ["c", "b"]);
});

test("chatsForModes hides chats of a mode the student does not have (a university student has only the Mentor)", () => {
  const list = [chat("a", 1), { ...chat("b", 2), mode: "university" }, { ...chat("c", 3), mode: "exam" }];
  assert.deepEqual(chatsForModes(list, ["university"]).map((c) => c.id), ["b"]);
  assert.deepEqual(chatsForModes(list, ["study", "exam", "major"]).map((c) => c.id), ["a", "c"]);
});

test("groupChats puts chats under Today, Yesterday, Previous 7 days and Earlier by calendar day, newest first", () => {
  const list = [
    chat("earlier-old", at(40)), chat("eight", at(8, 23, 59)), chat("seven", at(7, 0, 5)), chat("three", at(3)),
    chat("yest-late", at(1, 23, 59)), chat("yest-early", at(1, 0, 0)), chat("today-early", at(0, 0, 30)), chat("today-now", at(0, 9, 29)),
  ];
  const groups = groupChats(list, NOW);
  assert.deepEqual(groups.map((g) => g.id), ["today", "yesterday", "week", "earlier"]);
  const ids = (id) => groups.find((g) => g.id === id).items.map((c) => c.id);
  assert.deepEqual(ids("today"), ["today-now", "today-early"]);
  assert.deepEqual(ids("yesterday"), ["yest-late", "yest-early"]);
  assert.deepEqual(ids("week"), ["three", "seven"], "seven days ago is still in the week");
  assert.deepEqual(ids("earlier"), ["eight", "earlier-old"], "eight days ago is Earlier");
});

test("groupChats leaves out empty groups, treats a clock-skewed future time as today, and does not change its input", () => {
  const list = [chat("future", NOW + 3_600_000), chat("old", at(90))];
  const copy = JSON.stringify(list);
  assert.deepEqual(groupChats(list, NOW).map((g) => g.id), ["today", "earlier"]);
  assert.equal(JSON.stringify(list), copy);
  assert.deepEqual(groupChats([], NOW), []);
});

test("searchChats finds a chat by its title or by anything said in it, in Khmer too, and a blank search finds all", () => {
  const list = [
    chat("limits", 3, { title: "Limits and continuity" }),
    chat("khmer", 2, { title: "សំណួរអំពីអាំងតេក្រាល", messages: [{ id: "m", role: "user", text: "បង្ហាញខ្ញុំពីរបៀបធ្វើ" }] }),
    chat("photo", 1, { title: null, messages: [{ id: "p", role: "user", text: "" }, { id: "q", role: "ai", text: "The Pythagorean theorem says…" }] }),
  ];
  assert.deepEqual(searchChats(list, "LIMITS").map((c) => c.id), ["limits"]);
  assert.deepEqual(searchChats(list, "pythagorean").map((c) => c.id), ["photo"], "a word in an answer");
  assert.deepEqual(searchChats(list, "អាំងតេក្រាល").map((c) => c.id), ["khmer"]);
  assert.deepEqual(searchChats(list, "របៀបធ្វើ").map((c) => c.id), ["khmer"]);
  assert.deepEqual(searchChats(list, "  ").map((c) => c.id), ["limits", "khmer", "photo"]);
  assert.deepEqual(searchChats(list, "zzz"), []);
});

test("formatWhen: a time today and yesterday, the weekday this week, the date before that, Khmer digits in Khmer", () => {
  assert.match(formatWhen(at(0, 8, 15), NOW, "en"), /8:15/);
  assert.match(formatWhen(at(1, 20, 5), NOW, "en"), /8:05/);
  assert.match(formatWhen(at(3), NOW, "en"), /^[A-Z][a-z]{2}$/);
  assert.match(formatWhen(at(20), NOW, "en"), /Oct/);
  assert.match(formatWhen(new Date(2025, 5, 1).getTime(), NOW, "en"), /2025/);
  assert.match(formatWhen(at(0, 8, 15), NOW, "km"), /៨:១៥/);
  assert.ok(!/[0-9]/.test(formatWhen(at(0, 8, 15), NOW, "km")));
});

test("saving drops a photo's picture, finishes a half-written reply, and drops a reply that had written nothing", () => {
  const c = chat("c", NOW, {
    messages: [
      { id: "u1", role: "user", text: "what is this?", images: [{ id: "i1", name: "page.jpg", thumb: "data:image/jpeg;base64,AAAA" }], readings: [{ index: 1, text: "x²" }], historyText: "what is this?\n\n[Photo 1]\nx²" },
      { id: "r1", role: "ai", rag: true, text: "It is a parabola, and", streaming: true, notice: "Generating…" },
      { id: "u2", role: "user", text: "and now?" },
      { id: "r2", role: "ai", rag: true, text: "", streaming: true, notice: "Searching…" },
    ],
  });
  const json = serializeHistory({ chats: [c], active: { study: "c" } });
  assert.ok(!json.includes("data:image"), "no picture is saved");
  const back = restoreHistory(json, { now: NOW }).chats[0];
  assert.deepEqual(back.messages.map((m) => m.id), ["u1", "r1", "u2"], "the empty reply is gone");
  assert.deepEqual(back.messages[0].images, [{ id: "i1", name: "page.jpg" }]);
  assert.deepEqual(back.messages[0].readings[0].text, "x²");
  assert.equal(back.messages[0].historyText, "what is this?\n\n[Photo 1]\nx²");
  assert.equal(back.messages[1].streaming, false);
  assert.equal(back.messages[1].notice, null);
  assert.equal(back.messages[1].text, "It is a parabola, and");
  assert.equal(c.messages[0].images[0].thumb, "data:image/jpeg;base64,AAAA", "the chat in memory keeps its picture");
  assert.equal(c.messages[1].streaming, true, "and is not changed");
});

test("a chat comes back as it was saved: title, rename flag, times, exam paper and answer-key flags", () => {
  const paper = { id: "r", role: "ai", rag: true, text: "PAPER", exam: { subject: "Mathematics", language: "km" } };
  const c = chat("c", NOW - 1000, { title: "My paper", renamed: true, createdAt: NOW - 5000, messages: [{ id: "u", role: "user", text: "📝 Mock paper" }, paper, { id: "bad", role: "ai", rag: true, error: true, text: "oops", error2: 1 }] });
  const back = restoreHistory(serializeHistory({ chats: [c], active: {} }), { now: NOW }).chats[0];
  assert.deepEqual(back, { ...c, messages: c.messages });
  assert.equal(back.messages[2].error2, 1, "a field this code does not know about survives");
});

test("the chat the Coach reopens on is restored only if it is recent, in its own mode, and still there", () => {
  const recent = chat("recent", NOW - 60_000);
  const stale = chat("stale", NOW - RESUME_WITHIN_MS - 1000, { mode: "exam" });
  const wrong = chat("wrong", NOW - 1000, { mode: "major" });
  const json = serializeHistory({ chats: [recent, stale, wrong], active: { study: "recent", exam: "stale", major: "recent", university: "ghost" } });
  const { chats, active } = restoreHistory(json, { now: NOW });
  assert.equal(chats.length, 3);
  assert.deepEqual(active, { study: "recent" });
});

test("a chat of a mode the student does not have is dropped on load", () => {
  const json = serializeHistory({ chats: [chat("a", NOW), chat("u", NOW - 5, { mode: "university" })], active: {} });
  assert.deepEqual(restoreHistory(json, { now: NOW, modes: ["university"] }).chats.map((c) => c.id), ["u"]);
  assert.deepEqual(restoreHistory(json.replace('"mode":"study"', '"mode":"astrology"'), { now: NOW }).chats.map((c) => c.id), ["u"]);
});

test("a corrupt, old or odd save gives an empty history instead of breaking the screen", () => {
  for (const raw of ["", "not json", "null", "[]", "{}", '{"v":2,"chats":[]}', '{"v":1,"chats":"x"}', '{"v":1}']) {
    assert.deepEqual(restoreHistory(raw), { chats: [], active: {} }, raw);
  }
  const weird = JSON.stringify({ v: 1, active: { study: "ok" }, chats: [
    null, 5, "x", { id: "", mode: "study", messages: [{ id: "m", role: "user" }] }, { id: "nomsgs", mode: "study", messages: [] },
    { id: "ok", mode: "study", updatedAt: NOW, messages: [
      null, { role: "user", text: "no id" }, { id: "badrole", role: "system", text: "x" },
      { id: "m1", role: "user", text: 42, images: "nope", readings: [null, { index: 1, warnings: "w" }], exam: 7 },
      { id: "m2", role: "ai", text: "fine", images: [{ id: "a" }, { name: "no id" }, null] },
    ] },
    { id: "ok", mode: "study", updatedAt: NOW - 1, messages: [{ id: "dup", role: "user", text: "second chat with the same id" }] },
  ] });
  const { chats, active } = restoreHistory(weird, { now: NOW });
  assert.deepEqual(chats.map((c) => c.id), ["ok"], "only the one good chat, once");
  const [m1, m2] = chats[0].messages;
  assert.deepEqual([m1.id, m1.text, m1.images, m1.readings, "exam" in m1], ["m1", "", [], [{ index: 1, warnings: [] }], false]);
  assert.deepEqual(m2.images, [{ id: "a", name: "photo" }]);
  assert.deepEqual(active, { study: "ok" });
});

test("when the save is too big the oldest chats go, and the newest is kept (shortened if it alone is too big)", () => {
  const filler = "x".repeat(2000);
  const list = Array.from({ length: 20 }, (_, i) => chat(`c${i}`, NOW - i * 1000, { messages: [{ id: "u", role: "user", text: `${i} ${filler}` }, { id: "a", role: "ai", text: filler }] }));
  const json = serializeHistory({ chats: list, active: {} }, { maxChars: 20_000 });
  assert.ok(json.length <= 20_000);
  const ids = restoreHistory(json, { now: NOW }).chats.map((c) => c.id);
  assert.equal(ids[0], "c0");
  assert.ok(ids.length > 1 && ids.length < 20);
  assert.deepEqual(ids, list.slice(0, ids.length).map((c) => c.id), "a run of the newest, no gaps");

  const longChat = chat("long", NOW, { messages: Array.from({ length: 100 }, (_, i) => ({ id: `m${i}`, role: i % 2 ? "ai" : "user", text: `${i} ${filler}` })) });
  const one = restoreHistory(serializeHistory({ chats: [longChat], active: {} }, { maxChars: 30_000 }), { now: NOW }).chats;
  assert.equal(one.length, 1);
  assert.ok(one[0].messages.length >= 2 && one[0].messages.length < 100);
  assert.equal(one[0].messages.at(-1).id, "m99", "its newest messages are kept");
});

test("a chat with no messages is not saved", () => {
  const json = serializeHistory({ chats: [makeChat({ id: "empty", mode: "study" }), chat("full", NOW)], active: { study: "empty" } });
  const back = restoreHistory(json, { now: NOW });
  assert.deepEqual(back.chats.map((c) => c.id), ["full"]);
  assert.deepEqual(back.active, {});
});

test("loadHistory and saveHistory keep each student's chats apart", () => {
  const storage = fakeStorage();
  assert.equal(saveHistory(storage, "user-1", { chats: [chat("mine", NOW)], active: { study: "mine" } }), true);
  assert.equal(saveHistory(storage, "user-2", { chats: [chat("theirs", NOW)], active: {} }), true);
  assert.deepEqual(loadHistory(storage, "user-1", { now: NOW }).chats.map((c) => c.id), ["mine"]);
  assert.deepEqual(loadHistory(storage, "user-1", { now: NOW }).active, { study: "mine" });
  assert.deepEqual(loadHistory(storage, "user-2", { now: NOW }).chats.map((c) => c.id), ["theirs"]);
  assert.deepEqual(loadHistory(storage, "user-3", { now: NOW }), { chats: [], active: {} });
  assert.ok(storage.data.has(historyKey("user-1")));
  clearHistory(storage, "user-1");
  assert.deepEqual(loadHistory(storage, "user-1", { now: NOW }), { chats: [], active: {} });
  assert.equal(loadHistory(storage, "user-2", { now: NOW }).chats.length, 1, "clearing one student leaves the other");
});

test("saving survives a browser that refuses (storage full), by saving less", () => {
  const filler = "y".repeat(3000);
  const list = Array.from({ length: 10 }, (_, i) => chat(`c${i}`, NOW - i * 1000, { messages: [{ id: "u", role: "user", text: filler }, { id: "a", role: "ai", text: filler }] }));
  const storage = fakeStorage(1);
  assert.equal(saveHistory(storage, "u", { chats: list, active: {} }), true);
  const saved = loadHistory(storage, "u", { now: NOW }).chats;
  assert.ok(saved.length >= 1 && saved.length < 10, `kept ${saved.length}`);
  assert.equal(saved[0].id, "c0");
  const never = { getItem: () => null, setItem() { throw new Error("blocked"); }, removeItem() { throw new Error("blocked"); } };
  assert.equal(saveHistory(never, "u", { chats: list, active: {} }), false);
  assert.doesNotThrow(() => clearHistory(never, "u"));
});

test("no storage, no user, or a storage that throws on read: an empty history, never an error", () => {
  assert.deepEqual(loadHistory(null, "u"), { chats: [], active: {} });
  assert.deepEqual(loadHistory(fakeStorage(), null), { chats: [], active: {} });
  assert.deepEqual(loadHistory({ getItem() { throw new Error("denied"); } }, "u"), { chats: [], active: {} });
  assert.equal(saveHistory(null, "u", { chats: [], active: {} }), false);
  assert.equal(saveHistory(fakeStorage(), null, { chats: [], active: {} }), false);
});

test("userKeyOf is the same notion of 'this student' as the warm-up's", () => {
  assert.equal(userKeyOf({ userId: 7, email: "a@b.c" }), "7");
  assert.equal(userKeyOf({ email: "a@b.c", name: "A" }), "a@b.c");
  assert.equal(userKeyOf({ phone: "012", name: "A" }), "012");
  assert.equal(userKeyOf({ name: "A" }), "A");
  assert.equal(userKeyOf(null), null);
});
