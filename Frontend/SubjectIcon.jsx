import React from "react";
import { FOREIGN_LANGUAGE } from "./subjects.js";
import { Atom, BookOpen, BookText, Dna, FlaskConical, Globe, Landmark, Languages as LanguagesIcon, Map as MapIcon, Scale, Sigma } from "lucide-react";

/* Logo + accent per subject, keyed by the same canonical English names. Unknown subjects fall back
   to the generic book icon in the primary color. */
export const SUBJECT_ICON = {
  Mathematics: { icon: Sigma, color: "#5B5BD6" },
  Physics: { icon: Atom, color: "#0EA5E9" },
  Chemistry: { icon: FlaskConical, color: "var(--jade)" },
  Biology: { icon: Dna, color: "#22A559" },
  "Khmer Literature": { icon: BookText, color: "var(--gold)" },
  History: { icon: Landmark, color: "#C2703D" },
  English: { icon: LanguagesIcon, color: "var(--ember)" },
  French: { icon: LanguagesIcon, color: "#8B5CF6" },
  [FOREIGN_LANGUAGE]: { icon: LanguagesIcon, color: "var(--ember)" },
  Geography: { icon: MapIcon, color: "#0EA5E9" },
  Morality: { icon: Scale, color: "#8B5CF6" },
  "Earth Science": { icon: Globe, color: "#22A559" },
};
export const subjectAccent = (subject) => SUBJECT_ICON[subject]?.color ?? "var(--primary)";

/* tile=true wraps the icon in the rounded soft tile used on the subject cards; otherwise it is the bare glyph. */
export default function SubjectIcon({ subject, size = 19, tile = false, tileSize = 40 }) {
  const { icon: Icon = BookOpen, color = "var(--primary)" } = SUBJECT_ICON[subject] ?? {};
  const glyph = <Icon size={size} aria-hidden="true" style={{ color, flexShrink: 0 }} />;
  if (!tile) return glyph;
  return (
    <div className="grid place-items-center rounded-xl flex-shrink-0"
      style={{ width: tileSize, height: tileSize, background: `color-mix(in srgb, ${color} 16%, transparent)` }}>
      {glyph}
    </div>
  );
}
