import { useEffect, useReducer, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { ITEM_BY_ID } from "./catalog.js";
import { useRewards } from "./RewardsContext.jsx";
import { boxReducer, initialBox } from "./boxMachine.js";
import RewardModal from "./RewardModal.jsx";
import { rt } from "./rewardStrings.js";

/* The treasure box on the "Set complete!" screen: a chest the student taps to claim the set's reward (see boxMachine.js
   for the states). The claim happens at the click — XP, level-up and the item are paid there once — and the pop-up
   opens when the opening animation ends. A set that already paid out shows only a short note. */

const OPEN_MS = 900;   // length of the opening animation (the CSS in rewardStyles.js uses the same timing)
const SPARKS = [[10, 30], [110, 24], [100, 8]];

function Chest() {
  return (
    <svg className="eai-rw-chest" viewBox="0 0 120 104" width="120" height="104" aria-hidden="true" focusable="false">
      <ellipse cx="60" cy="98" rx="46" ry="5" fill="#1b2a55" opacity=".16" />
      <rect x="14" y="48" width="92" height="46" rx="8" fill="#B7791F" />
      <rect x="14" y="76" width="92" height="18" rx="8" fill="#8A5A1F" />
      <path d="M 46 54 L 46 90 M 74 54 L 74 90" stroke="#8A5A1F" strokeWidth="2" opacity=".5" />
      <rect x="24" y="48" width="10" height="46" fill="var(--gold)" />
      <rect x="86" y="48" width="10" height="46" fill="var(--gold)" />
      <ellipse className="eai-rw-inside" cx="60" cy="49" rx="44" ry="7" fill="#FFE7A0" />
      <g className="eai-rw-lid">
        <path d="M 14 50 Q 14 16 60 16 Q 106 16 106 50 Z" fill="#C98B2B" />
        <path d="M 24 50 L 24 26 L 34 20 L 34 50 Z M 86 50 L 86 20 L 96 26 L 96 50 Z" fill="var(--gold)" />
        <path d="M 30 26 Q 44 18 60 18" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".28" />
      </g>
      <rect x="50" y="42" width="20" height="20" rx="4" fill="#FFD76B" stroke="#C98513" strokeWidth="2" />
      <circle cx="60" cy="50" r="3" fill="#5A3A0A" />
      <rect x="59" y="50" width="2" height="7" rx="1" fill="#5A3A0A" />
      {SPARKS.map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <path className="eai-rw-spark" style={{ animationDelay: `${i * 0.5}s` }} d="M 0 -6 L 1.6 -1.6 L 6 0 L 1.6 1.6 L 0 6 L -1.6 1.6 L -6 0 L -1.6 -1.6 Z" fill="#FFE7A0" />
        </g>
      ))}
    </svg>
  );
}

export default function TreasureBox({ setKey, total, retried, lang = "en" }) {
  const km = lang === "km" ? "eai-km" : "";
  const { claimSet, isClaimed, equip, outfit, openWardrobe } = useRewards();
  const reduce = useReducedMotion();
  // Read once, on mount: claiming during this visit must not flip the box to "already collected" mid-animation.
  const [claimedBefore] = useState(() => isClaimed(setKey));
  const [box, dispatch] = useReducer(boxReducer, claimedBefore, initialBox);
  const [result, setResult] = useState(null);
  const timer = useRef(null);
  const chestRef = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);   // StrictMode mounts twice in development

  if (box.phase === "claimed") return <p className={`eai-rw-claimed text-sm eai-muted ${km}`}>{rt(lang, "rwBoxAlready")}</p>;

  const onChest = () => {
    if (box.phase === "opened") { dispatch({ type: "reopen" }); return; }   // a recap of what was won; nothing is claimed again
    if (box.phase !== "idle") return;
    const res = claimSet({ setKey, total, retried });
    if (!res) return;
    setResult(res);
    dispatch({ type: "click" });
    if (reduce) dispatch({ type: "opened" });
    else timer.current = setTimeout(() => dispatch({ type: "opened" }), OPEN_MS);
  };
  const close = () => { dispatch({ type: "close" }); chestRef.current?.focus(); };
  const item = result?.itemId ? ITEM_BY_ID[result.itemId] : null;

  return (
    <div className="eai-rw-box-wrap">
      <button type="button" ref={chestRef} className={`eai-rw-box eai-focus is-${box.phase}`} onClick={onChest}
        disabled={box.phase === "opening"} aria-label={rt(lang, "rwBoxLabel")}>
        <span className="eai-rw-burst" aria-hidden="true" />
        <Chest />
      </button>
      <p className={`text-xs eai-muted ${km}`}>{box.phase === "opened" ? rt(lang, "rwBoxCollected") : rt(lang, "rwBoxPrompt")}</p>
      {box.modalOpen && result && (
        <RewardModal result={result} lang={lang} equipped={Boolean(item) && outfit[item.slot] === result.itemId}
          onEquip={() => equip(item.slot, result.itemId)}
          onOpenWardrobe={() => { dispatch({ type: "close" }); openWardrobe(); }}
          onClose={close} />
      )}
    </div>
  );
}
