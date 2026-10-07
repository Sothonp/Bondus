import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { animate, motion, useReducedMotion } from "framer-motion";
import { Sparkles, TrendingUp, X } from "lucide-react";
import { ITEM_BY_ID } from "./catalog.js";
import { levelFill } from "./rewardLogic.js";
import { ItemThumb, RARITY_CLASS } from "./itemArt.jsx";
import { RARITY_LABEL_KEY, localizeDigits, rt } from "./rewardStrings.js";

/* The pop-up a treasure box opens into: the item that dropped (if any), the bonus XP, and level progress.
   `result` is what claimBox returned (see rewardLogic.js); `equipped` says whether the new item is already worn.
   It owns the level-up announcement (App skips its own toast for a box's XP). Esc, the overlay and ✕ call onClose;
   focus moves in on open and Tab stays inside. TreasureBox renders it and puts focus back on the chest. */

const CONFETTI = ["var(--gold)", "var(--jade)", "var(--primary)", "var(--ember)"];

// The XP figure, counting up from 0 (straight to the value when motion is reduced).
function XpCount({ value, lang, reduce }) {
  const [shown, setShown] = useState(reduce ? value : 0);
  useEffect(() => {
    if (reduce) { setShown(value); return undefined; }
    const controls = animate(0, value, { duration: 0.8, ease: "easeOut", onUpdate: (v) => setShown(Math.round(v)) });
    return () => controls.stop();
  }, [value, reduce]);
  return <>{localizeDigits(shown, lang)}</>;
}

// A short burst of confetti for a level-up.
function Confetti() {
  return (
    <div className="eai-rw-confetti" aria-hidden="true">
      {Array.from({ length: 12 }, (_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        return (
          <motion.span key={i} className="eai-rw-particle" style={{ background: CONFETTI[i % CONFETTI.length] }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{ x: Math.cos(angle) * 110, y: Math.sin(angle) * 80 - 20, opacity: 0, scale: 0.6, rotate: 180 }}
            transition={{ duration: 1.1, ease: "easeOut", delay: 0.8 }} />
        );
      })}
    </div>
  );
}

export default function RewardModal({ result, lang = "en", equipped = false, onEquip, onOpenWardrobe, onClose }) {
  const km = lang === "km" ? "eai-km" : "";
  const titleId = useId();
  const reduce = useReducedMotion();
  const dialogRef = useRef(null);
  const primaryRef = useRef(null);
  const item = result.itemId ? ITEM_BY_ID[result.itemId] : null;
  const focusEquip = Boolean(item) && !equipped;   // the Equip button is the primary action until the item is worn

  const beforePct = Math.round(levelFill(result.before) * 100);
  const afterPct = Math.round(levelFill(result.after) * 100);
  const barMotion = reduce
    ? { width: `${afterPct}%`, transition: { duration: 0 } }
    : result.leveledUp
      // Fill the level, hold, then settle at where the new level stands (its threshold is higher, so the bar drops back).
      ? { width: [`${beforePct}%`, "100%", `${afterPct}%`], transition: { duration: 1.5, times: [0, 0.55, 1], ease: "easeInOut", delay: 0.3 } }
      : { width: `${afterPct}%`, transition: { duration: 0.9, ease: "easeOut", delay: 0.3 } };

  useEffect(() => { primaryRef.current?.focus(); }, []);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") { e.stopPropagation(); onClose(); return; }
      if (e.key !== "Tab") return;
      const focusable = dialogRef.current?.querySelectorAll("button:not([disabled])");
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const node = (
    <div className="eai-rw-overlay" onClick={onClose}>
      <motion.div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} className={`eai-rw-modal eai-card ${km}`}
        onClick={(e) => e.stopPropagation()}
        initial={reduce ? false : { opacity: 0, y: 16, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.22 }}>
        <button type="button" className="eai-rw-close eai-focus" onClick={onClose} aria-label={rt(lang, "rwClose")}><X size={16} /></button>
        {result.leveledUp && !reduce && <Confetti />}

        <h2 id={titleId} className={`eai-display text-xl font-extrabold flex items-center justify-center gap-2 ${km}`}>
          <Sparkles size={20} style={{ color: "var(--gold)" }} aria-hidden="true" /> {rt(lang, "rwTitle")}
        </h2>

        {item ? (
          <div className={`eai-rw-item ${RARITY_CLASS[item.rarity]}`}>
            <ItemThumb itemId={item.id} lang={lang} size={88} />
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`eai-rw-chip ${km}`}>{rt(lang, RARITY_LABEL_KEY[item.rarity])}</span>
                <span className={`eai-rw-new ${km}`}>{rt(lang, "rwNew")}</span>
              </div>
              <p className={`eai-display font-bold mt-1 ${km}`}>{lang === "km" ? item.nameKm : item.name}</p>
              <p className={`text-xs eai-muted ${km}`}>{result.source === "milestone" ? rt(lang, "rwSourceMilestone") : rt(lang, "rwSourceRandom")}</p>
            </div>
          </div>
        ) : (
          <p className={`text-sm mt-3 ${km}`}>{rt(lang, "rwAllOwned")}</p>
        )}

        <div className="mt-4">
          <p className="eai-rw-xp eai-display" aria-hidden="true">+<XpCount value={result.xp} lang={lang} reduce={reduce} /> XP</p>
          <span className="eai-rw-sr">{rt(lang, "rwXpEarned", { n: result.xp })}</span>
          {result.flawless && <span className={`eai-rw-flawless ${km}`}>{rt(lang, "rwFlawless")}</span>}
        </div>

        <div className="mt-4 text-left">
          <p className={`eai-rw-level text-sm font-semibold ${km}`}>{rt(lang, "rwLevel", { n: result.after.level })}</p>
          <div className="eai-rw-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={afterPct} aria-label={rt(lang, "rwLevel", { n: result.after.level })}>
            <motion.div className="eai-rw-bar-fill" initial={{ width: `${reduce ? afterPct : beforePct}%` }} animate={barMotion} />
          </div>
          <p className={`text-xs eai-muted mt-1 ${km}`}>{rt(lang, "rwToNext", { n: result.after.xpToNext - result.after.xp, m: result.after.level + 1 })}</p>
          {result.leveledUp && (
            <motion.div className={`eai-rw-banner ${km}`} initial={reduce ? false : { opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: reduce ? 0 : 0.8 }}>
              <TrendingUp size={14} aria-hidden="true" /> {rt(lang, "rwLevelUp", { n: result.after.level })}
            </motion.div>
          )}
        </div>

        <div className="eai-rw-actions">
          {item && (
            <button type="button" ref={focusEquip ? primaryRef : undefined} onClick={onEquip} disabled={equipped}
              className={`eai-btn eai-focus text-white py-2.5 px-4 text-sm ${km}`} style={{ background: "var(--primary)" }}>
              {equipped ? rt(lang, "rwEquipped") : rt(lang, "rwEquipNow")}
            </button>
          )}
          <button type="button" onClick={onOpenWardrobe} className={`eai-btn eai-soft eai-focus py-2.5 px-4 text-sm ${km}`} style={{ color: "var(--ink)" }}>{rt(lang, "rwOpenWardrobe")}</button>
          <button type="button" ref={focusEquip ? undefined : primaryRef} onClick={onClose} className={`eai-btn eai-soft eai-focus py-2.5 px-4 text-sm ${km}`} style={{ color: "var(--ink)" }}>{rt(lang, "rwContinue")}</button>
        </div>
      </motion.div>
    </div>
  );

  // Portal into the app root: the "Set complete" card is animated (a transform), which would trap a fixed overlay inside
  // it. The root still carries the theme variables. Server-side (tests) there is no document, so it renders inline.
  const host = typeof document !== "undefined" ? document.querySelector(".eai-root") : null;
  return host ? createPortal(node, host) : node;
}
