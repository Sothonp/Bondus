import { useId, useState } from "react";
import { Check, Lock, RotateCcw, Save, Shirt } from "lucide-react";
import { ITEMS, MILESTONES, SLOTS } from "./catalog.js";
import { useRewards } from "./RewardsContext.jsx";
import { equipItem, sameOutfit } from "./rewardLogic.js";
import { ItemThumb, RARITY_CLASS } from "./itemArt.jsx";
import { HINT_KEY, SLOT_LABEL_KEY, localizeDigits, rt } from "./rewardStrings.js";

/* The Wardrobe (dressing room): a big owl wearing the DRAFT outfit, and a tab per slot of items to put on it. Tapping an
   owned item wears it (tap again to take it off); slots are independent, so they mix and match. "Save style" makes the
   draft the saved outfit, which every owl in the app wears; "Reset" goes back to the saved one; leaving the page drops an
   unsaved draft. Locked items stay visible: a milestone item shows what unlocks it, a random-drop item stays a mystery.
   `renderOwl(outfit)` supplies the owl (App passes it in, since this file can't import App.jsx). */
export default function Wardrobe({ lang = "en", renderOwl, initialSlot = "hat" }) {
  const km = lang === "km" ? "eai-km" : "";
  const uid = useId();
  const { outfit, owned, saveOutfit } = useRewards();
  const [draft, setDraft] = useState(outfit);
  const [slot, setSlot] = useState(SLOTS.includes(initialSlot) ? initialSlot : "hat");
  const [justSaved, setJustSaved] = useState(false);
  const dirty = !sameOutfit(draft, outfit);

  const tabId = (s) => `${uid}-tab-${s}`;
  const nameOf = (item) => (lang === "km" ? item.nameKm : item.name);
  // What unlocks a milestone item ("Reach level 5"); null for an item that only drops at random.
  const hintOf = (itemId) => {
    const m = MILESTONES.find((x) => x.itemId === itemId);
    if (!m) return null;
    return m.kind === "firstBox" ? rt(lang, HINT_KEY.firstBox) : rt(lang, HINT_KEY[m.kind], { n: m.value });
  };

  const toggle = (item) => {
    setDraft((d) => equipItem({ owned, outfit: d }, item.slot, d[item.slot] === item.id ? null : item.id).outfit);
    setJustSaved(false);
  };
  const save = () => { saveOutfit(draft); setJustSaved(true); };
  const reset = () => { setDraft(outfit); setJustSaved(false); };

  // Arrow keys / Home / End move between the tabs (the standard tabs pattern).
  const onTabKey = (e) => {
    const at = SLOTS.indexOf(slot);
    const next = e.key === "ArrowRight" ? (at + 1) % SLOTS.length
      : e.key === "ArrowLeft" ? (at + SLOTS.length - 1) % SLOTS.length
      : e.key === "Home" ? 0 : e.key === "End" ? SLOTS.length - 1 : null;
    if (next == null) return;
    e.preventDefault();
    setSlot(SLOTS[next]);
    e.currentTarget.querySelectorAll('[role="tab"]')[next]?.focus();
  };

  return (
    <div className="space-y-5 eai-rise">
      <div>
        <h1 className={`eai-display text-2xl font-extrabold flex items-center gap-2 ${km}`}><Shirt size={24} style={{ color: "var(--primary)" }} aria-hidden="true" /> {rt(lang, "wardrobeTitle")}</h1>
        <p className={`eai-muted text-sm mt-1 ${km}`}>{rt(lang, "wardrobeSub")}</p>
      </div>

      <div className="eai-rw-wardrobe">
        <section className="eai-card eai-rw-preview">
          <div className="eai-rw-stage">{renderOwl ? renderOwl(draft) : null}</div>
          <p role="status" className={`eai-rw-note ${justSaved && !dirty ? "is-saved" : ""} ${km}`}>
            {dirty ? rt(lang, "wardrobeUnsaved") : justSaved ? rt(lang, "wardrobeSaved") : ""}
          </p>
          <div className="eai-rw-save-row">
            <button type="button" onClick={save} disabled={!dirty} className={`eai-btn eai-focus text-white py-2.5 px-4 text-sm flex items-center gap-1.5 ${km}`} style={{ background: "var(--primary)" }}>
              <Save size={15} aria-hidden="true" /> {rt(lang, "wardrobeSave")}
            </button>
            <button type="button" onClick={reset} disabled={!dirty} className={`eai-btn eai-soft eai-focus py-2.5 px-4 text-sm flex items-center gap-1.5 ${km}`} style={{ color: "var(--ink)" }}>
              <RotateCcw size={15} aria-hidden="true" /> {rt(lang, "wardrobeReset")}
            </button>
          </div>
        </section>

        <section className="eai-card eai-rw-picker">
          <div className="eai-rw-tabs" role="tablist" onKeyDown={onTabKey}>
            {SLOTS.map((s) => {
              const all = ITEMS.filter((i) => i.slot === s);
              const have = all.filter((i) => owned.includes(i.id)).length;
              return (
                <button key={s} type="button" role="tab" id={tabId(s)} aria-selected={s === slot} aria-controls={`${uid}-panel`} tabIndex={s === slot ? 0 : -1}
                  onClick={() => setSlot(s)} className={`eai-rw-tab eai-focus ${km}`}>
                  {rt(lang, SLOT_LABEL_KEY[s])} <span className="eai-rw-tab-count">{localizeDigits(`${have}/${all.length}`, lang)}</span>
                </button>
              );
            })}
          </div>

          <div role="tabpanel" id={`${uid}-panel`} aria-labelledby={tabId(slot)} className="eai-rw-grid">
            {ITEMS.filter((i) => i.slot === slot).map((item) => {
              if (owned.includes(item.id)) {
                const worn = draft[item.slot] === item.id;
                return (
                  <button key={item.id} type="button" aria-pressed={worn} onClick={() => toggle(item)} className={`eai-rw-tile eai-focus ${RARITY_CLASS[item.rarity]}`}>
                    <ItemThumb itemId={item.id} lang={lang} size={64} />
                    <span className={`eai-rw-tile-name ${km}`}>{nameOf(item)}</span>
                    {worn && <Check size={14} className="eai-rw-worn" aria-hidden="true" />}
                  </button>
                );
              }
              const hint = hintOf(item.id);
              if (hint) {
                return (
                  <button key={item.id} type="button" aria-disabled="true" aria-label={`${nameOf(item)} — ${rt(lang, "wardrobeLocked")} — ${hint}`}
                    className={`eai-rw-tile is-locked eai-focus ${RARITY_CLASS[item.rarity]}`}>
                    <ItemThumb itemId={item.id} lang={lang} size={64} dimmed />
                    <Lock size={13} className="eai-rw-lock" aria-hidden="true" />
                    <span className={`eai-rw-tile-name ${km}`}>{nameOf(item)}</span>
                    <span className={`eai-rw-tile-hint ${km}`}>{hint}</span>
                  </button>
                );
              }
              // A random-drop item stays a mystery until it drops: no name, no picture, not even in the accessible label.
              return (
                <button key={item.id} type="button" aria-disabled="true" aria-label={`${rt(lang, "wardrobeLocked")} — ${rt(lang, "wardrobeRandomHint")}`} className="eai-rw-tile is-locked eai-focus">
                  <span className="eai-rw-mystery" aria-hidden="true">?</span>
                  <Lock size={13} className="eai-rw-lock" aria-hidden="true" />
                  <span className={`eai-rw-tile-hint ${km}`}>{rt(lang, "wardrobeRandomHint")}</span>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
