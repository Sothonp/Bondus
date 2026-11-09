/* The EN / ខ្មែរ switch: one small glass pill, used on the landing and auth screens, the main app header, and anywhere
   else a student needs to change the UI language without leaving the screen they're on. Pure presentation, like
   StreakFlame.jsx: nothing is imported back from App.jsx. */
import React from "react";

export function LangToggle({ lang, setLang, style }) {
  return (
    <button onClick={() => setLang((l) => (l === "en" ? "km" : "en"))} className="eai-focus eai-km"
      style={{
        height: 44, padding: "0 14px", borderRadius: 14, border: "1px solid var(--glass-line)",
        background: "var(--glass-bg)", backdropFilter: "blur(16px) saturate(180%)", WebkitBackdropFilter: "blur(16px) saturate(180%)",
        boxShadow: "var(--glass-shadow)", color: "var(--ink)", display: "grid", placeItems: "center",
        fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "background-color .15s ease, transform .12s ease",
        ...style,
      }}
      aria-label={lang === "en" ? "ប្តូរទៅភាសាខ្មែរ" : "Switch to English"}>
      {lang === "en" ? "ខ្មែរ" : "EN"}
    </button>
  );
}
