/* The phone layout's frame: a sticky top bar, a fixed bottom navigation bar, and the "More" sheet that holds the rest
   of the pages. Everything here is below the `lg` breakpoint (the sidebar and header take over from there). Which pages
   go in the bar and which in More is decided by mobileNav.js; this file only draws them. Pure presentation, like
   ExerciseUi.jsx: a translator `tr(key)` and `lang` come from App.jsx and nothing is imported back from it. */
import React, { useCallback, useEffect, useState } from "react";
import { Flame, Zap, Moon, Sun, LayoutGrid, Globe, LogOut, ChevronRight, X } from "lucide-react";
import { moreIsActive } from "./mobileNav.js";

const kmc = (lang) => (lang === "km" ? "eai-km" : "");
const labelOf = (n, lang) => (lang === "km" ? n.labelKm ?? n.label : n.label);

/* Sticky bar at the top: logo and name, a compact streak + XP pill, the dark-mode toggle and the avatar. The language
   switch lives in More instead. A running exam gets its own strip underneath so the timer is never out of sight. */
export function MobileTopBar({ logo, initials, dark, onToggleDark, streak, xp, examChip }) {
  return (
    <header className="lg:hidden sticky top-0 z-40 border-b"
      style={{ background: "color-mix(in srgb, var(--bg) 85%, transparent)", borderColor: "var(--line)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", paddingTop: "env(safe-area-inset-top)" }}>
      <div className="px-4 max-[360px]:px-3 h-14 flex items-center gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="grid place-items-center rounded-xl overflow-hidden flex-shrink-0" style={{ width: 34, height: 34 }}>{logo}</div>
          <span className="eai-display font-extrabold text-base leading-none truncate">Bondus</span>
        </div>
        <div className="flex items-center gap-2 max-[360px]:gap-1.5 flex-shrink-0">
          <div className="flex items-center gap-2 max-[360px]:gap-1.5 rounded-full px-2.5 max-[360px]:px-2 py-1.5" style={{ background: "var(--bg-soft)" }}>
            <span className="eai-fx-fire inline-flex items-center gap-1">
              <Flame size={15} style={{ color: "var(--ember)" }} />
              <span className="text-sm font-bold eai-display">{streak}</span>
            </span>
            <span className="h-4" style={{ width: 1, background: "var(--line)" }} />
            <span className="eai-fx-bolt inline-flex items-center gap-1">
              <Zap size={15} style={{ color: "var(--gold)" }} />
              <span className="text-sm font-bold eai-display">{xp}</span>
            </span>
          </div>
          <button onClick={onToggleDark} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"} className="eai-btn eai-focus grid place-items-center w-9 h-9 max-[360px]:w-8 max-[360px]:h-8"
            style={{ color: "var(--ink)", background: "var(--card)", border: "1px solid var(--line)" }}>
            {dark ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <div className="grid place-items-center rounded-full text-xs font-bold text-white w-9 h-9 max-[360px]:w-8 max-[360px]:h-8" style={{ background: "var(--primary)" }}>{initials}</div>
        </div>
      </div>
      {examChip && <div className="px-4 pb-2">{examChip}</div>}
    </header>
  );
}

/* The rest of the pages, as a sheet that slides up over the page. A modal dialog: the backdrop, the close button and
   Escape all close it, as does choosing a page, and the page behind it does not scroll while it is open. */
function MoreSheet({ open, items, tab, lang, tr, showLanguage, onGo, onToggleLang, onLogout, onClose }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open, onClose]);

  const row = "eai-nav eai-focus w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left";
  return (
    <div className="lg:hidden" aria-hidden={!open}>
      <div className="fixed inset-0 z-[55]" onClick={onClose}
        style={{ background: "rgba(0,0,0,.4)", opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none", transition: "opacity .2s ease" }} />
      <div role="dialog" aria-modal="true" aria-label={tr("navMore")} className="fixed left-0 right-0 bottom-0 z-[60] rounded-t-3xl border-t overflow-y-auto"
        style={{
          background: "var(--card)", borderColor: "var(--line)", maxHeight: "85vh", boxShadow: "var(--shadow)",
          paddingBottom: "calc(12px + env(safe-area-inset-bottom))",
          transform: open ? "translateY(0)" : "translateY(100%)", visibility: open ? "visible" : "hidden",
          transition: `transform .25s ease, visibility 0s linear ${open ? "0s" : ".25s"}`,
        }}>
        <div className="mx-auto mt-2.5 rounded-full" style={{ width: 40, height: 4, background: "var(--line)" }} />
        <div className="px-5 pt-3 pb-1 flex items-center justify-between">
          <h2 className={`eai-display font-extrabold text-lg ${kmc(lang)}`}>{tr("navMore")}</h2>
          <button onClick={onClose} aria-label="Close" className="eai-focus grid place-items-center rounded-full" style={{ width: 36, height: 36, background: "var(--bg-soft)", color: "var(--ink)" }}><X size={18} /></button>
        </div>
        <div className="px-3 pb-2 space-y-1">
          {items.map((n) => {
            const on = tab === n.id;
            const color = on ? (n.premium ? "var(--gold)" : "var(--primary)") : n.premium ? "var(--gold)" : "var(--ink)";
            return (
              <button key={n.id} onClick={() => { onGo(n.id); onClose(); }} aria-current={on ? "page" : undefined} className={row}
                style={{ background: on ? (n.premium ? "var(--gold-soft)" : "var(--primary-soft)") : "transparent", color }}>
                <n.icon size={20} />
                <span className={`text-sm font-semibold flex-1 ${kmc(lang)}`}>{labelOf(n, lang)}</span>
                {n.premium && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "var(--gold)", color: "#fff", letterSpacing: ".02em" }}>PRO</span>}
                <ChevronRight size={16} className="eai-muted" />
              </button>
            );
          })}
        </div>
        <div className="mx-5 my-2 h-px" style={{ background: "var(--line)" }} />
        <div className="px-3 space-y-1">
          {showLanguage && (
            <button onClick={onToggleLang} className={row} style={{ color: "var(--ink)" }}>
              <Globe size={20} />
              <span className={`text-sm font-semibold flex-1 ${kmc(lang)}`}>{tr("moreLanguage")}</span>
              <span className="eai-km text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: "var(--bg-soft)" }}>{lang === "en" ? "ខ្មែរ" : "EN"}</span>
            </button>
          )}
          <button onClick={onLogout} className={row} style={{ color: "var(--ember)" }}>
            <LogOut size={20} />
            <span className={`text-sm font-semibold flex-1 ${kmc(lang)}`}>{tr("logOut")}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* Fixed bar along the bottom: the primary pages plus More. Translucent with a blur, and padded for the home-indicator
   area so it never sits under it. The active page is marked for screen readers (aria-current) as well as by colour. */
export function MobileBottomNav({ primary, more, tab, lang, tr, showLanguage, onGo, onToggleLang, onLogout }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const closeSheet = useCallback(() => setSheetOpen(false), []);
  const moreActive = moreIsActive(tab, more) || sheetOpen;
  const item = "eai-focus flex flex-col items-center justify-center gap-1 py-2 min-w-0";
  const pill = (on) => ({ width: 46, height: 28, background: on ? "var(--primary-soft)" : "transparent", transition: "background-color .15s ease" });
  const text = "text-[11px] max-[360px]:text-[10px] font-semibold leading-none truncate max-w-full px-0.5";

  return (
    <>
      <MoreSheet open={sheetOpen} items={more} tab={tab} lang={lang} tr={tr} showLanguage={showLanguage}
        onGo={onGo} onToggleLang={onToggleLang} onLogout={onLogout} onClose={closeSheet} />
      <nav aria-label="Main" className="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t"
        style={{ background: "color-mix(in srgb, var(--card) 80%, transparent)", borderColor: "var(--line)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="grid" style={{ gridTemplateColumns: `repeat(${primary.length + 1}, minmax(0, 1fr))` }}>
          {primary.map((n) => {
            const on = tab === n.id;
            return (
              <button key={n.id} onClick={() => onGo(n.id)} aria-current={on ? "page" : undefined} className={`${item} ${kmc(lang)}`}
                style={{ color: on ? "var(--primary)" : "var(--muted)", minHeight: 58 }}>
                <span className="grid place-items-center rounded-full" style={pill(on)}><n.icon size={21} /></span>
                <span className={text}>{labelOf(n, lang)}</span>
              </button>
            );
          })}
          <button onClick={() => setSheetOpen(true)} aria-haspopup="dialog" aria-expanded={sheetOpen} className={`${item} ${kmc(lang)}`}
            style={{ color: moreActive ? "var(--primary)" : "var(--muted)", minHeight: 58 }}>
            <span className="grid place-items-center rounded-full" style={pill(moreActive)}><LayoutGrid size={21} /></span>
            <span className={text}>{tr("navMore")}</span>
          </button>
        </div>
      </nav>
    </>
  );
}
