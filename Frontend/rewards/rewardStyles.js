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

/* ── treasure box on the Set complete screen ── */
.eai-rw-box-wrap{ display:flex; flex-direction:column; align-items:center; gap:6px; }
.eai-rw-box{ position:relative; display:block; padding:0; border:0; background:none; cursor:pointer; border-radius:24px; }
.eai-rw-box:disabled{ cursor:default; }
.eai-rw-chest{ display:block; overflow:visible; }
.eai-rw-box.is-idle::before{ content:""; position:absolute; inset:-14px; border-radius:50%; pointer-events:none;
  background:radial-gradient(circle, color-mix(in srgb, var(--gold) 38%, transparent), transparent 68%); animation:eai-rw-pulse 2.4s ease-in-out infinite; }
.eai-rw-box.is-idle .eai-rw-chest{ animation:eai-rw-bob 2.6s ease-in-out infinite; }
.eai-rw-box.is-opening .eai-rw-chest{ animation:eai-rw-shake .5s ease-in-out; }
.eai-rw-lid{ transform-box:fill-box; transform-origin:50% 100%; transition:transform .35s cubic-bezier(.3,1.4,.5,1) .45s; }
.eai-rw-box.is-opening .eai-rw-lid, .eai-rw-box.is-opened .eai-rw-lid{ transform:translateY(-16px) scaleY(.8); }
.eai-rw-inside{ opacity:0; transition:opacity .3s ease .45s; }
.eai-rw-box.is-opening .eai-rw-inside, .eai-rw-box.is-opened .eai-rw-inside{ opacity:1; }
.eai-rw-spark{ transform-box:fill-box; transform-origin:center; animation:eai-rw-twinkle 1.8s ease-in-out infinite; }
.eai-rw-box.is-opening .eai-rw-spark, .eai-rw-box.is-opened .eai-rw-spark{ animation:none; opacity:0; }
.eai-rw-burst{ position:absolute; left:50%; top:46%; width:160px; height:160px; margin:-80px 0 0 -80px; border-radius:50%; opacity:0; pointer-events:none;
  background:radial-gradient(circle, #FFE7A0 0%, color-mix(in srgb, #FFD76B 45%, transparent) 38%, transparent 70%); }
.eai-rw-box.is-opening .eai-rw-burst{ animation:eai-rw-burst .9s ease-out .4s forwards; }
.eai-rw-claimed{ margin-top:16px; }
@keyframes eai-rw-bob{ 0%,100%{ transform:translateY(0); } 50%{ transform:translateY(-6px); } }
@keyframes eai-rw-pulse{ 0%,100%{ opacity:.55; transform:scale(.94); } 50%{ opacity:1; transform:scale(1.06); } }
@keyframes eai-rw-shake{ 0%,100%{ transform:translateX(0) rotate(0); } 20%{ transform:translateX(-5px) rotate(-3deg); } 40%{ transform:translateX(5px) rotate(3deg); }
  60%{ transform:translateX(-4px) rotate(-2deg); } 80%{ transform:translateX(4px) rotate(2deg); } }
@keyframes eai-rw-twinkle{ 0%,100%{ opacity:.25; transform:scale(.6); } 50%{ opacity:1; transform:scale(1.15); } }
@keyframes eai-rw-burst{ 0%{ opacity:0; transform:scale(.3); } 35%{ opacity:1; } 100%{ opacity:0; transform:scale(1.5); } }

/* ── Wardrobe page ── */
.eai-rw-wardrobe{ display:grid; gap:20px; grid-template-columns:1fr; align-items:start; }
@media (min-width:900px){ .eai-rw-wardrobe{ grid-template-columns:minmax(260px, 340px) 1fr; } }
.eai-rw-preview{ padding:20px; text-align:center; }
.eai-rw-stage{ width:min(100%, 280px); margin:0 auto; padding:12px 12px 4px; border-radius:20px; background:var(--primary-soft); }
.eai-rw-note{ min-height:20px; margin-top:10px; font-size:12px; font-weight:600; color:var(--muted); }
.eai-rw-note.is-saved{ color:var(--jade); }
.eai-rw-save-row{ display:flex; flex-wrap:wrap; justify-content:center; gap:8px; margin-top:8px; }
.eai-rw-save-row .eai-btn:disabled{ opacity:.5; cursor:default; }
.eai-rw-picker{ padding:16px; }
.eai-rw-tabs{ display:flex; flex-wrap:wrap; gap:6px; margin-bottom:14px; }
.eai-rw-tab{ display:inline-flex; align-items:center; gap:6px; padding:8px 12px; border-radius:12px; font-size:13px; font-weight:700; color:var(--muted); background:var(--bg-soft); }
.eai-rw-tab[aria-selected="true"]{ color:var(--primary); background:var(--primary-soft); box-shadow:inset 0 0 0 1.5px var(--primary); }
.eai-rw-tab-count{ font-size:11px; font-weight:600; opacity:.8; }
.eai-rw-grid{ display:grid; grid-template-columns:repeat(auto-fill, minmax(116px, 1fr)); gap:10px; }
.eai-rw-tile{ --rw-accent:var(--muted); position:relative; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px;
  min-height:132px; padding:12px 8px; text-align:center; border-radius:16px; border:1px solid var(--line); background:var(--card); cursor:pointer;
  transition:transform .15s ease, border-color .15s ease, box-shadow .15s ease; }
.eai-rw-tile:hover{ transform:translateY(-1px); border-color:var(--rw-accent); }
.eai-rw-tile[aria-pressed="true"]{ border-color:var(--rw-accent); background:color-mix(in srgb, var(--rw-accent) 12%, var(--card));
  box-shadow:0 0 0 2px color-mix(in srgb, var(--rw-accent) 55%, transparent); }
.eai-rw-tile.is-locked{ cursor:default; }
.eai-rw-tile.is-locked:hover{ transform:none; border-color:var(--line); }
.eai-rw-tile-name{ font-size:12px; font-weight:700; line-height:1.25; }
.eai-rw-tile-hint{ font-size:11px; line-height:1.25; color:var(--muted); }
.eai-rw-lock{ position:absolute; top:8px; right:8px; color:var(--muted); }
.eai-rw-worn{ position:absolute; top:8px; right:8px; color:var(--rw-accent); }
.eai-rw-mystery{ width:64px; height:64px; display:grid; place-items:center; border-radius:16px; font-size:28px; font-weight:800; color:var(--muted); background:var(--bg-soft); }

@media (prefers-reduced-motion: reduce){
  .eai-rw-modal *, .eai-rw-particle, .eai-rw-box, .eai-rw-box *, .eai-rw-box::before{ animation:none !important; transition:none !important; }
}
`;
