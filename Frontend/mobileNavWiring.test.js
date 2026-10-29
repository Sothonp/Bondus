/* Guards on how the phone layout is wired: a sticky top bar, a fixed bottom navigation bar with a More sheet, and a
   dashboard that stacks in one column. App.jsx is read as text because the app has no DOM test harness; the choice of
   items is tested in mobileNav.test.js and the real layout was checked in a browser at phone widths.
   Run with:  node --test Frontend/mobileNavWiring.test.js */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const read = (name) => (existsSync(new URL(`./${name}`, import.meta.url)) ? readFileSync(new URL(`./${name}`, import.meta.url), "utf8") : "");
const app = read("App.jsx");
const nav = read("MobileNav.jsx");
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const defined = (key) => (app.match(new RegExp(`[\\s,{]${key}:`, "g")) || []).length;
// The app shell is the last function in App.jsx; other components (an accordion) have their own setOpen.
const shell = app.slice(app.indexOf("export default function App()"));
const dashboard = app.slice(app.indexOf("function Dashboard("), app.indexOf("/* ════════════════════════ Browse (field-aware)"));

test("the phone layout lives in MobileNav.jsx and App.jsx uses it with the split navigation", () => {
  assert.match(app, /import \{ MobileTopBar, MobileBottomNav \} from "\.\/MobileNav\.jsx";/);
  assert.match(app, /import \{ splitMobileNav \} from "\.\/mobileNav\.js";/);
  assert.match(app, /const mobileNav = splitMobileNav\(navItems\);/);
  assert.match(app, /<MobileTopBar /);
  assert.match(app, /<MobileBottomNav /);
  assert.match(app, /primary=\{mobileNav\.primary\} more=\{mobileNav\.more\}/);
});

test("on a phone the sidebar drawer and its hamburger are gone: the sidebar and desktop header only show on large screens", () => {
  assert.match(app, /<aside className="hidden lg:flex sticky top-0 z-30 h-screen w-64/);
  assert.match(app, /<header className="hidden lg:block sticky top-0 z-10 border-b"/);
  assert.doesNotMatch(shell, /-translate-x-full|setOpen\(|<Menu size/);
  assert.doesNotMatch(shell, /useState\(false\);\s*\n\s*const \[open, setOpen\]/);
});

test("the page leaves room under the fixed bar, including the iPhone home-indicator area", () => {
  assert.match(app, /<main className=\{`eai-main /);
  assert.match(app, /@media \(max-width:1023\.98px\)\{ \.eai-main\{ padding-bottom:calc\(5rem \+ env\(safe-area-inset-bottom\)\) !important; \} \}/);
  assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1\.0, viewport-fit=cover" \/>/);
});

test("the top bar is sticky, only on phones, with the logo and name, the streak and XP pill, the dark toggle and the avatar", () => {
  const bar = nav.slice(nav.indexOf("export function MobileTopBar("), nav.indexOf("function MoreSheet("));
  assert.match(bar, /className="lg:hidden sticky top-0 z-40 border-b"/);
  assert.match(bar, /\{logo\}/);
  assert.match(bar, />Bondus</);
  assert.match(bar, /<Flame /);
  assert.match(bar, /<Zap /);
  assert.match(bar, /onClick=\{onToggleDark\}/);
  assert.match(bar, /\{initials\}/);
  // The language switch moved into More; the running-exam chip gets its own strip so it is never lost.
  assert.doesNotMatch(bar, /LangToggle|onToggleLang/);
  assert.match(bar, /\{examChip && /);
});

test("the bottom bar is fixed, translucent and blurred, clear of the home indicator, only on phones", () => {
  const bottom = nav.slice(nav.indexOf("export function MobileBottomNav("));
  assert.match(bottom, /fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t/);
  assert.match(bottom, /backdropFilter: "blur\(12px\)"/);
  assert.match(bottom, /color-mix\(in srgb, var\(--card\) 80%, transparent\)/);
  assert.match(bottom, /paddingBottom: "env\(safe-area-inset-bottom\)"/);
  assert.match(bottom, /aria-current=\{on \? "page" : undefined\}/);
  assert.match(bottom, /moreIsActive\(tab, more\)/);
});

test("the More sheet is a modal dialog that closes on the backdrop, Escape and choosing a page, and holds language and log out", () => {
  const sheet = nav.slice(nav.indexOf("function MoreSheet("), nav.indexOf("export function MobileBottomNav("));
  assert.match(sheet, /role="dialog"/);
  assert.match(sheet, /aria-modal="true"/);
  assert.match(sheet, /e\.key === "Escape"/);
  assert.match(sheet, /document\.body\.style\.overflow = "hidden"/);
  assert.match(sheet, /onClick=\{onClose\}/);
  assert.match(sheet, /onGo\(n\.id\); onClose\(\)/);
  assert.match(sheet, /onClick=\{onToggleLang\}/);
  assert.match(sheet, /onClick=\{onLogout\}/);
  assert.match(sheet, /n\.premium/);
});

test("the new strings exist once in English and once in Khmer", () => {
  for (const key of ["navMore", "moreLanguage"]) assert.equal(defined(key), 2, `${key} should be defined in both languages, found ${defined(key)}`);
});

test("the dashboard puts the streak and level cards in a two-column row before the study plan", () => {
  assert.match(app, /function StreakStat\(/);
  assert.match(app, /function LevelStat\(/);
  const mobileStats = dashboard.indexOf('grid grid-cols-2 gap-3 lg:hidden');
  assert.ok(mobileStats > 0, "the two-column stats row is missing");
  assert.ok(mobileStats < dashboard.indexOf('t(lang, "dashTodayPlan")'), "the stats row must come before the study plan");
  // Desktop keeps its single combined card.
  assert.match(dashboard, /eai-card p-6 hidden lg:flex flex-col gap-5 justify-center/);
});

test("the study-plan form stacks into full-width controls on a phone and the suggestions scroll sideways", () => {
  assert.match(dashboard, /<div className="flex flex-col sm:flex-row gap-2">/);
  assert.match(dashboard, /className=\{`eai-ob-input eai-focus w-full sm:w-\[84px\] sm:flex-shrink-0/);
  assert.match(dashboard, /eai-glass eai-focus px-4 text-sm flex items-center justify-center gap-1\.5 w-full sm:w-auto/);
  assert.match(dashboard, /flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible eai-scroll/);
});

test("the hero's buttons are full width and stacked on a phone", () => {
  assert.match(app, /@media \(max-width:639px\)\{ \.eai-hero-actions\{ flex-direction:column; align-items:stretch; \} \.eai-hero-actions button\{ width:100%; justify-content:center; \} \}/);
});
