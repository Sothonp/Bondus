/* CSS for the treasure-box rewards and the Wardrobe, appended to App.jsx's STYLES. Every class is prefixed eai-rw-
   (rewardStyles.test.js checks that each one a component uses has a rule here) and colours come from the theme
   variables, so light and dark mode both work. Under prefers-reduced-motion the CSS animations are switched off;
   the framer-motion ones are skipped in the components with useReducedMotion(). */
export const REWARD_STYLES = `
/* ── reward pop-up ── */
.eai-rw-overlay{ position:fixed; inset:0; z-index:110; display:grid; place-items:center; padding:16px; overflow-y:auto;
  background:rgba(12,13,30,.55); backdrop-filter:blur(3px); -webkit-backdrop-filter:blur(3px); }
.eai-rw-modal{ position:relative; width:100%; max-width:420px; padding:26px 22px 20px; text-align:center; }
.eai-rw-close{ position:absolute; top:10px; right:10px; width:32px; height:32px; border-radius:10px; display:grid; place-items:center;
  color:var(--muted); transition:background-color .15s ease, color .15s ease; }
.eai-rw-close:hover{ background:var(--bg-soft); color:var(--ink); }
.eai-rw-confetti{ position:absolute; left:50%; top:34%; width:0; height:0; pointer-events:none; }
.eai-rw-particle{ position:absolute; left:-4px; top:-4px; width:8px; height:8px; border-radius:2px; }
.eai-rw-item{ --rw-accent:var(--muted); display:flex; align-items:center; gap:14px; margin-top:14px; padding:12px 14px; text-align:left;
  border-radius:18px; border:1px solid color-mix(in srgb, var(--rw-accent) 45%, transparent);
  background:color-mix(in srgb, var(--rw-accent) 12%, var(--card)); box-shadow:0 0 26px color-mix(in srgb, var(--rw-accent) 26%, transparent); }
.eai-rw-rarity-common{ --rw-accent:var(--muted); }
.eai-rw-rarity-rare{ --rw-accent:var(--primary); }
.eai-rw-rarity-epic{ --rw-accent:#8B5CF6; }
.eai-rw-rarity-legendary{ --rw-accent:var(--gold); }
.eai-rw-chip{ display:inline-block; font-size:11px; font-weight:700; padding:2px 8px; border-radius:999px; color:var(--rw-accent);
  background:color-mix(in srgb, var(--rw-accent) 16%, transparent); }
.eai-rw-new{ display:inline-block; font-size:11px; font-weight:800; padding:2px 8px; border-radius:999px; color:#fff; background:var(--ember); }
.eai-rw-xp{ display:inline-block; font-size:34px; font-weight:800; line-height:1.1; color:var(--gold); }
.eai-rw-flawless{ display:inline-block; margin-left:8px; vertical-align:middle; font-size:12px; font-weight:700; padding:3px 10px;
  border-radius:999px; color:var(--jade); background:var(--jade-soft); }
.eai-rw-sr{ position:absolute; width:1px; height:1px; margin:-1px; padding:0; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0; }
.eai-rw-level{ margin-bottom:2px; }
.eai-rw-bar{ height:12px; margin-top:6px; border-radius:999px; background:var(--bg-soft); overflow:hidden; }
.eai-rw-bar-fill{ height:100%; border-radius:999px; background:linear-gradient(90deg, var(--primary), var(--jade)); }
.eai-rw-banner{ display:inline-flex; align-items:center; gap:6px; margin-top:10px; padding:6px 12px; border-radius:999px;
  font-size:13px; font-weight:800; color:var(--gold); background:var(--gold-soft); }
.eai-rw-actions{ display:flex; flex-wrap:wrap; justify-content:center; gap:8px; margin-top:20px; }
.eai-rw-actions .eai-btn:disabled{ opacity:.6; cursor:default; }

@media (prefers-reduced-motion: reduce){
  .eai-rw-modal *, .eai-rw-particle{ animation:none !important; transition:none !important; }
}
`;
