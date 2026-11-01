/* The streak flame: one icon with three resting looks (cold, dormant, lit) plus a one-off "igniting" animation when a
   dormant flame becomes lit. The rules live in streakFlame.js; this file only draws them. Pure presentation, like
   MobileNav.jsx: nothing is imported back from App.jsx.

   Colour is never the only signal. Lit has a glow and a bright gradient, dormant is flat with a small ember dot, cold is
   an outline, and each comes with a text label from useFlameInfo(). The colours are the --streak-* tokens in App.jsx. */
import React, { useEffect, useRef, useState } from "react";
import { Flame } from "lucide-react";
import { flameUrgency, flameLabel, hoursLeftToday } from "./streakFlame.js";

/* The lit flame's gradient, defined once. Render this a single time near the root; every lit flame points at it. */
export function StreakFlameDefs() {
  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: "absolute" }}>
      <defs>
        <linearGradient id="eai-streak-grad" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" style={{ stopColor: "var(--streak-core)" }} />
          <stop offset="0.5" style={{ stopColor: "var(--streak-mid)" }} />
          <stop offset="1" style={{ stopColor: "var(--streak-edge)" }} />
        </linearGradient>
      </defs>
    </svg>
  );
}

/* `state` is "cold" | "dormant" | "lit". `ring` adds the slow breathing ring (the last 3 hours of a dormant day).
   `slow` stretches the flicker for large flames, like the dashboard card. */
export function StreakFlame({ state, size = 16, ring = false, slow = false }) {
  const lit = state === "lit", dormant = state === "dormant";
  const previous = useRef(state);
  const [igniting, setIgniting] = useState(false);

  // Dormant to lit while the screen is open is the moment worth celebrating; a page that loads already lit stays calm.
  useEffect(() => {
    const was = previous.current;
    previous.current = state;
    if (was === "dormant" && state === "lit") {
      setIgniting(true);
      const id = setTimeout(() => setIgniting(false), 1300);
      return () => clearTimeout(id);
    }
    return undefined;
  }, [state]);

  const cls = ["eai-streak", dormant && ring ? "eai-streak-ring" : "", igniting ? "eai-streak-igniting" : ""].filter(Boolean).join(" ");
  const dot = Math.max(3, Math.round(size * 0.18));
  return (
    <span className={cls} aria-hidden="true">
      <span className={lit ? (slow ? "eai-fx-streak-slow" : "eai-fx-streak") : "eai-streak-still"}>
        <Flame
          size={size}
          fill={lit ? "url(#eai-streak-grad)" : dormant ? "var(--streak-dormant)" : "none"}
          style={{ color: lit ? "var(--streak-edge)" : "var(--streak-dormant)" }}
        />
      </span>
      {dormant && <span className="eai-streak-dot" style={{ width: dot, height: dot }} />}
    </span>
  );
}

/* The words and urgency for the current flame. A dormant flame re-reads the clock every minute and when the phone wakes
   (timers freeze while a phone is locked); lit and cold flames need no clock at all. */
export function useFlameInfo(state, lang = "en") {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (state !== "dormant") return undefined;
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 60000);
    const onVisible = () => { if (document.visibilityState === "visible") tick(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onVisible); };
  }, [state]);
  const hoursLeft = hoursLeftToday(now);
  const urgency = flameUrgency(state, hoursLeft);
  return { urgency, label: flameLabel(state, urgency, hoursLeft, lang) };
}
