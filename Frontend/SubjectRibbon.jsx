import { useCallback, useEffect, useRef, useState } from "react";
import { Atom, BookText, ChevronLeft, ChevronRight, Coins, Dna, FlaskConical, Globe, Landmark, Languages, Map as MapIcon, Scale, Sigma } from "lucide-react";
import { RIBBON_STRINGS, RIBBON_SUBJECTS, scrollState, scrollStep } from "./subjectRibbon.js";

/* The Duolingo-style strip of subjects at the bottom of the landing page: a coloured icon tile and an uppercase name per
   subject, drifting sideways round and round without end. The list is drawn three times in a row and the belt slides left by
   exactly one list's width, then starts again, so the loop has no visible join (the extra copies are hidden from screen
   readers and the keyboard). It stops while a finger, the mouse or keyboard focus is on it, so a subject can be tapped. Each
   subject is a button that calls `onSelect` (the landing page uses it to start sign-up). Styles are the .eai-ribbon rules in
   STYLES in App.jsx.

   For people who ask their device for less motion (prefers-reduced-motion) nothing moves: the extra copies are hidden and
   the strip is the plain sideways-scrolling row it was, with the two arrow buttons. The arrows hide when everything already
   fits, and dim at either end (aria-disabled rather than disabled, so a keyboard user's focus isn't dropped at the end).

   The icons are lucide glyphs, matching the subject logos in the practice section; emoji flags would show as "KH" on Windows. */

const ICONS = {
  mathematics: Sigma, khmer: BookText, physics: Atom, chemistry: FlaskConical, english: Languages, biology: Dna,
  history: Landmark, earth: Globe, economy: Coins, morality: Scale, geography: MapIcon,
};

const COPIES = 3;            // the belt moves by one list's width, so the lists must be at least as wide as the screen between them
const PIXELS_PER_SECOND = 45; // a calm reading pace; the duration is set from the list's width so the speed is the same everywhere

export default function SubjectRibbon({ lang = "en", onSelect, className = "" }) {
  const km = lang === "km";
  const text = RIBBON_STRINGS[km ? "km" : "en"];
  const trackRef = useRef(null);
  const listRef = useRef(null);
  const [edge, setEdge] = useState({ canLeft: false, canRight: false });
  const [seconds, setSeconds] = useState(50);

  const measure = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const next = scrollState(el);
    setEdge((prev) => (prev.canLeft === next.canLeft && prev.canRight === next.canRight ? prev : next));
    const width = listRef.current?.getBoundingClientRect().width;
    if (width) setSeconds(Math.min(150, Math.max(20, Math.round(width / PIXELS_PER_SECOND))));
  }, []);

  // Re-measure when the track or the list changes size (window resize, language switch, web font arriving).
  useEffect(() => {
    measure();
    if (typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(trackRef.current);
    observer.observe(listRef.current);
    return () => observer.disconnect();
  }, [measure]);

  const scroll = (direction) => {
    const el = trackRef.current;
    if (!el) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: scrollStep(el.clientWidth, direction), behavior: reduce ? "auto" : "smooth" });
  };

  const overflows = edge.canLeft || edge.canRight;
  const arrow = (direction, Icon, enabled, label) => (
    <button type="button" className="eai-ribbon-arrow eai-focus" aria-label={label} aria-disabled={!enabled}
      data-idle={!overflows} tabIndex={overflows ? 0 : -1} onClick={() => enabled && scroll(direction)}>
      <Icon size={20} aria-hidden="true" />
    </button>
  );

  return (
    <section aria-label={text.region} className={`eai-ribbon ${className}`.trim()}>
      <div className="eai-ribbon-inner">
        {arrow(-1, ChevronLeft, edge.canLeft, text.left)}
        <div ref={trackRef} className="eai-ribbon-track" onScroll={measure}>
          <div className="eai-ribbon-belt" style={{ "--ribbon-seconds": `${seconds}s` }}>
            {Array.from({ length: COPIES }, (_, copy) => {
              const clone = copy > 0;
              return (
                <ul key={copy} ref={clone ? undefined : listRef} className={clone ? "eai-ribbon-list eai-ribbon-clone" : "eai-ribbon-list"} aria-hidden={clone ? "true" : undefined}>
                  {RIBBON_SUBJECTS.map((subject) => {
                    const Icon = ICONS[subject.id];
                    return (
                      <li key={subject.id}>
                        <button type="button" tabIndex={clone ? -1 : undefined} onClick={onSelect}
                          className={`${clone ? "eai-ribbon-copy " : ""}eai-ribbon-item eai-focus ${km ? "eai-km" : ""}`.trim()}>
                          <span className="eai-ribbon-tile" style={{ background: subject.color }} aria-hidden="true"><Icon size={17} strokeWidth={2.5} /></span>
                          {km ? subject.km : subject.en}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              );
            })}
          </div>
        </div>
        {arrow(1, ChevronRight, edge.canRight, text.right)}
      </div>
    </section>
  );
}
