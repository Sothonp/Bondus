/* Tells the app when the Phnom Penh day changes while it is open, so the flame cools and the next warm-up can be asked for
   at midnight instead of at the next launch. A timer is set for the next midnight; but a locked phone freezes timers, so the
   day is also re-read whenever the page becomes visible again. */
import { useEffect, useRef } from "react";
import { phnomPenhDay, msUntilMidnight } from "./streakFlame.js";

export function useDayRollover(onNewDay, enabled = true) {
  const callback = useRef(onNewDay);
  callback.current = onNewDay;
  useEffect(() => {
    if (!enabled) return undefined;
    let day = phnomPenhDay();
    let timer;
    const check = () => {
      const now = phnomPenhDay();
      if (now !== day) { day = now; callback.current?.(now); }
      clearTimeout(timer);
      timer = setTimeout(check, msUntilMidnight() + 500);
    };
    timer = setTimeout(check, msUntilMidnight() + 500);
    const onVisible = () => { if (document.visibilityState === "visible") check(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearTimeout(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, [enabled]);
}
