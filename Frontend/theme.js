/* Light / dark theme — tested in theme.test.js.

   The app follows the device's light/dark setting until the student taps the sun/moon button; from then on their pick
   wins and is remembered in this browser (localStorage), so a refresh no longer drops back to light. The pick is per
   browser on purpose, like the device setting it overrides, so it is not saved to the account.

   The pure helpers take their storage / window as arguments so the tests can stub them. useTheme() is the one place
   that touches the real ones. */
import { useEffect, useState } from "react";

export const THEME_KEY = "bondus_theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";

/* The saved pick, "light" or "dark", or null when there is none (or storage is missing or blocked). */
export function readThemeChoice(storage) {
  try {
    const saved = storage?.getItem(THEME_KEY);
    return saved === "light" || saved === "dark" ? saved : null;
  } catch { return null; }
}

export function saveThemeChoice(storage, choice) {
  try { storage?.setItem(THEME_KEY, choice); } catch { /* blocked (private mode): the pick lasts until the page closes */ }
}

export const deviceIsDark = (win) => !!win?.matchMedia?.(DARK_QUERY)?.matches;

/* A pick wins; with none, the device decides. */
export const isDark = (choice, systemDark) => (choice ? choice === "dark" : systemDark);

/* Calls onChange(isDark) whenever the device flips between light and dark (an OS schedule at sunset, say). Returns a
   function that stops watching. Older Safari only has addListener. */
export function watchDeviceTheme(win, onChange) {
  const mq = win?.matchMedia?.(DARK_QUERY);
  if (!mq) return () => {};
  const listener = (e) => onChange(!!e.matches);
  if (mq.addEventListener) { mq.addEventListener("change", listener); return () => mq.removeEventListener("change", listener); }
  mq.addListener?.(listener);
  return () => mq.removeListener?.(listener);
}

const browserStorage = () => { try { return globalThis.localStorage ?? null; } catch { return null; } };

/* Same shape as useState: [dark, setDark]. setDark takes a boolean or an updater (d) => !d, so every existing toggle
   keeps working, and records the result as the student's pick. */
export function useTheme() {
  const [choice, setChoice] = useState(() => readThemeChoice(browserStorage()));
  const [systemDark, setSystemDark] = useState(() => deviceIsDark(globalThis.window));
  useEffect(() => watchDeviceTheme(globalThis.window, setSystemDark), []);
  const dark = isDark(choice, systemDark);
  const setDark = (value) => {
    const picked = (typeof value === "function" ? value(dark) : value) ? "dark" : "light";
    setChoice(picked);
    saveThemeChoice(browserStorage(), picked);
  };
  return [dark, setDark];
}
