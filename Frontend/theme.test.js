/* Tests for the light/dark theme rules (Frontend/theme.js): the app follows the device until the student picks a
   theme, then keeps that pick across refreshes. Storage and the device are stubbed; App.jsx is read as text for the wiring.
   Run with:  node --test Frontend/theme.test.js */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { THEME_KEY, readThemeChoice, saveThemeChoice, deviceIsDark, isDark, watchDeviceTheme } from "./theme.js";

const memoryStorage = (initial = {}) => {
  const data = { ...initial };
  return { data, getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); } };
};
const blockedStorage = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } };

test("a saved pick is read back, whichever theme it was", () => {
  assert.equal(readThemeChoice(memoryStorage({ [THEME_KEY]: "dark" })), "dark");
  assert.equal(readThemeChoice(memoryStorage({ [THEME_KEY]: "light" })), "light");
});

test("nothing saved, an unknown value, no storage, or blocked storage all mean 'no pick yet'", () => {
  assert.equal(readThemeChoice(memoryStorage()), null);
  assert.equal(readThemeChoice(memoryStorage({ [THEME_KEY]: "purple" })), null);
  assert.equal(readThemeChoice(null), null);
  assert.equal(readThemeChoice(blockedStorage), null);
});

test("saving a pick survives a refresh: what is saved is what is read back", () => {
  const storage = memoryStorage();
  saveThemeChoice(storage, "dark");
  assert.equal(storage.data[THEME_KEY], "dark");
  assert.equal(readThemeChoice(storage), "dark");
});

test("saving never throws when storage is blocked or missing", () => {
  assert.doesNotThrow(() => saveThemeChoice(blockedStorage, "dark"));
  assert.doesNotThrow(() => saveThemeChoice(null, "light"));
});

const deviceThat = (matches) => ({ matchMedia: (q) => ({ matches: q === "(prefers-color-scheme: dark)" && matches }) });

test("the device's dark setting is read; no matchMedia (or no window) counts as light", () => {
  assert.equal(deviceIsDark(deviceThat(true)), true);
  assert.equal(deviceIsDark(deviceThat(false)), false);
  assert.equal(deviceIsDark({}), false);
  assert.equal(deviceIsDark(undefined), false);
});

test("with no pick the app follows the device; a pick beats the device either way", () => {
  assert.equal(isDark(null, true), true);
  assert.equal(isDark(null, false), false);
  assert.equal(isDark("light", true), false);
  assert.equal(isDark("dark", false), true);
});

function fakeMedia(legacy = false) {
  const listeners = new Set();
  const mq = { matches: false };
  if (legacy) { mq.addListener = (f) => listeners.add(f); mq.removeListener = (f) => listeners.delete(f); }
  else { mq.addEventListener = (type, f) => { assert.equal(type, "change"); listeners.add(f); }; mq.removeEventListener = (type, f) => listeners.delete(f); }
  return { win: { matchMedia: () => mq }, fire: (matches) => { mq.matches = matches; for (const f of [...listeners]) f({ matches }); }, count: () => listeners.size };
}

for (const legacy of [false, true]) {
  test(`device changes are reported until the watcher is stopped (${legacy ? "older Safari" : "current browsers"})`, () => {
    const { win, fire, count } = fakeMedia(legacy);
    const seen = [];
    const stop = watchDeviceTheme(win, (dark) => seen.push(dark));
    fire(true); fire(false);
    assert.deepEqual(seen, [true, false]);
    stop();
    assert.equal(count(), 0);
    fire(true);
    assert.deepEqual(seen, [true, false]);
  });
}

test("watching does nothing, and does not throw, where there is no matchMedia", () => {
  const stop = watchDeviceTheme({}, () => assert.fail("no events expected"));
  assert.doesNotThrow(stop);
  assert.doesNotThrow(watchDeviceTheme(undefined, () => {}));
});

test("App.jsx gets its theme from useTheme, not from a plain useState(false)", () => {
  const app = readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
  assert.match(app, /import \{ useTheme \} from "\.\/theme\.js";/);
  assert.match(app, /const \[dark, setDark\] = useTheme\(\);/);
  assert.doesNotMatch(app, /const \[dark, setDark\] = useState\(/);
});
