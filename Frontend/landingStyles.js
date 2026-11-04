/* Styles for the scrolling landing page (Landing.jsx). Rendered inside Welcome only, so they exist only while the landing page is
   showing. They sit on top of the .eai-lp colour tokens in App.jsx's STYLES (--bg, --card, --ink, --muted, --line, --primary,
   --lp-link, --lp-hover). Every animation has a prefers-reduced-motion twin at the bottom that shows the finished state at once.
   Newer CSS (color-mix) is always written after a plain fallback line, so an older phone gets a flat colour rather than nothing. */
export const LANDING_CSS = `
.eai-root.eai-lp{ --lp-soft:#EFF6FF; --lpnav-h:64px; overflow-x:clip; }
.eai-root.eai-lp.theme-dark{ --lp-soft:#16224A; }
html.eai-lp-scroll{ scroll-padding-top:72px; }
@media (prefers-reduced-motion: no-preference){ html.eai-lp-scroll{ scroll-behavior:smooth; } }

/* ── Sticky navigation: see-through over the hero, a blurred bordered bar once the page scrolls ── */
.eai-lpnav{ position:sticky; top:0; z-index:50; padding-top:env(safe-area-inset-top); border-bottom:1px solid transparent; background:transparent;
  transition:background-color .25s ease, border-color .25s ease, box-shadow .25s ease; }
.eai-lpnav.is-stuck{ background:var(--bg); border-bottom-color:var(--line); }
@supports (backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)){
  .eai-lpnav.is-stuck{ background:color-mix(in srgb, var(--bg) 82%, transparent); -webkit-backdrop-filter:saturate(1.4) blur(12px); backdrop-filter:saturate(1.4) blur(12px); }
}
.eai-lpnav-in{ display:flex; align-items:center; gap:12px; max-width:1120px; height:var(--lpnav-h); margin:0 auto; padding:0 20px; }
@media (min-width:1024px){ .eai-lpnav-in{ padding:0 40px; } }
.eai-lpnav-brand{ display:inline-flex; align-items:center; border-radius:10px; flex:none; }
.eai-lpnav-links{ display:none; gap:4px; margin-left:16px; }
@media (min-width:900px){ .eai-lpnav-links{ display:flex; } }
.eai-lpnav-link{ padding:8px 12px; border-radius:10px; font-size:14px; font-weight:600; color:var(--muted); text-decoration:none; transition:color .15s ease, background-color .15s ease; }
.eai-lpnav-link:hover{ color:var(--ink); background:var(--lp-hover); }
.eai-lpnav-link.is-active{ color:var(--lp-link); }
.eai-lpnav-right{ display:flex; align-items:center; gap:8px; margin-left:auto; }
.eai-lpnav-login{ display:none; padding:8px 14px; border-radius:10px; font-size:14px; font-weight:700; color:var(--lp-link); background:none; border:0; cursor:pointer; }
.eai-lpnav-login:hover{ background:var(--lp-hover); }
@media (min-width:640px){ .eai-lpnav-login{ display:inline-block; } }

/* ── Top fold ── */
.eai-lp-hero{ display:flex; flex-direction:column; align-items:center; min-height:calc(100vh - var(--lpnav-h) - 1px); min-height:calc(100dvh - var(--lpnav-h) - 1px - env(safe-area-inset-top)); overflow-x:clip; }

/* The bouncing cue above the subject ribbon */
.eai-lpcue{ display:flex; flex-direction:column; align-items:center; gap:0; padding:4px 14px 8px; border:0; background:none; border-radius:12px; cursor:pointer;
  color:var(--muted); font-size:11px; font-weight:700; letter-spacing:.1em; text-transform:uppercase; transition:color .15s ease; }
.eai-lpcue:hover{ color:var(--ink); }
.eai-lpcue.eai-km{ font-size:13px; letter-spacing:normal; text-transform:none; }
.eai-lpcue svg{ animation:eai-lp-cue 1.8s ease-in-out infinite; }
@keyframes eai-lp-cue{ 0%,100%{ transform:translateY(-2px); opacity:.5; } 50%{ transform:translateY(5px); opacity:1; } }

/* ── Sections ── */
.eai-lpsec{ padding:72px 24px; }
@media (min-width:1024px){ .eai-lpsec{ padding:104px 40px; } }
.eai-lpalt{ background:var(--lp-hover); }
.eai-lpwrap{ max-width:1120px; margin:0 auto; }
.eai-lph2{ margin:0; text-align:center; text-wrap:balance; font-family:'Sora', system-ui, sans-serif; font-weight:700; font-size:clamp(26px, 4.2vw, 38px); line-height:1.2; color:var(--ink); }
.eai-lpsub{ max-width:580px; margin:14px auto 0; text-align:center; text-wrap:balance; font-size:clamp(15px, 2vw, 18px); line-height:1.6; color:var(--muted); }
.eai-lpcenter{ display:flex; justify-content:center; margin-top:48px; }
.eai-lp-cta{ max-width:320px; }

/* Scroll-in reveal: starts a little low and see-through, settles when the section reaches the screen */
.eai-reveal{ opacity:0; transform:translateY(18px); transition:opacity .6s ease, transform .6s cubic-bezier(.2,.7,.2,1); }
.eai-reveal.is-in{ opacity:1; transform:none; }

/* ── Interactive preview ── */
.eai-lpprev{ display:grid; gap:28px; margin-top:44px; align-items:center; }
@media (min-width:1024px){ .eai-lpprev{ grid-template-columns:minmax(0,1fr) auto; gap:72px; } }
.eai-lpprev-side{ display:flex; flex-direction:column; gap:16px; }
@media (min-width:1024px){ .eai-lpprev-side{ max-width:520px; justify-self:end; width:100%; } }
.eai-lp-tabs{ display:flex; flex-wrap:wrap; justify-content:center; gap:8px; }
@media (min-width:1024px){ .eai-lp-tabs{ flex-direction:column; flex-wrap:nowrap; gap:10px; } }
.eai-lp-tab{ display:flex; align-items:center; gap:10px; padding:10px 14px; border:2px solid var(--line); border-radius:14px; background:var(--card); color:var(--ink);
  font-size:14px; font-weight:700; text-align:left; cursor:pointer; transition:border-color .2s ease, background-color .2s ease, transform .1s ease; }
.eai-lp-tab:hover{ background:var(--lp-hover); }
.eai-lp-tab:active{ transform:scale(.98); }
.eai-lp-tab[aria-selected="true"]{ border-color:var(--lp-link); background:var(--lp-soft); }
.eai-lp-tabicon{ display:grid; place-items:center; flex:none; width:34px; height:34px; border-radius:10px; background:var(--lp-hover); color:var(--muted); transition:background-color .2s ease, color .2s ease; }
.eai-lp-tab[aria-selected="true"] .eai-lp-tabicon{ background:var(--lp-link); color:#FFFFFF; }
.eai-lp-tabtext{ display:flex; flex-direction:column; gap:3px; min-width:0; }
.eai-lp-tab-desc{ display:none; font-size:13px; font-weight:500; line-height:1.5; color:var(--muted); }
@media (min-width:1024px){
  .eai-lp-tab{ padding:14px 16px; font-size:16px; }
  .eai-lp-tab[aria-selected="true"] .eai-lp-tab-desc{ display:block; }
}
.eai-lp-tabdesc{ margin:0; text-align:center; font-size:15px; line-height:1.6; color:var(--muted); min-height:3.2em; }
@media (min-width:1024px){ .eai-lp-tabdesc{ display:none; } }
.eai-lp-prevcta{ max-width:320px; align-self:center; }
@media (min-width:1024px){ .eai-lp-prevcta{ align-self:flex-start; margin-top:8px; } }
.eai-lpprev-phone{ display:flex; flex-direction:column; align-items:center; gap:14px; }
.eai-lp-note{ margin:0; font-size:12px; color:var(--muted); text-align:center; }

/* The phone: an iPhone 17 Pro-style device. A thin aluminium frame around a slim black bezel, soft 54px corners, a Dynamic Island
   pill, a home indicator, and the tall modern screen shape (about 9 : 19.5). The screen has generous padding all round (the top
   clears the island), and the demo pieces inside are spaced 14px apart so each block stands on its own. */
.eai-lpdevice{ position:relative; width:296px; max-width:100%; flex:none; }
.eai-lpdevice::before, .eai-lpdevice::after{ content:""; position:absolute; width:3px; border-radius:2px; background:#C4C9D4; }
.eai-lpdevice::before{ left:-3px; top:112px; height:58px; box-shadow:0 74px 0 #C4C9D4; }  /* action + volume buttons */
.eai-lpdevice::after{ right:-3px; top:150px; height:84px; }                              /* side button */
.eai-root.theme-dark .eai-lpdevice::before, .eai-root.theme-dark .eai-lpdevice::after{ background:#566089; }
.eai-root.theme-dark .eai-lpdevice::before{ box-shadow:0 74px 0 #566089; }
.eai-lpphone{ position:relative; width:100%; aspect-ratio:9 / 19.5; border:7px solid #07090F; border-radius:54px; background:var(--card); overflow:hidden;
  box-shadow:0 0 0 2.5px #C4C9D4, 0 0 0 3.5px rgba(15,23,42,.12), 0 32px 64px -28px rgba(15,23,42,.45); }
.eai-root.theme-dark .eai-lpphone{ border-color:#03040A; box-shadow:0 0 0 2.5px #566089, 0 0 0 3.5px rgba(0,0,0,.4), 0 32px 64px -28px rgba(0,0,0,.75); }
.eai-lpphone::before{ content:""; position:absolute; z-index:3; top:11px; left:50%; width:88px; height:26px; transform:translateX(-50%); border-radius:99px; background:#000000; }  /* Dynamic Island */
.eai-lpphone::after{ content:""; position:absolute; z-index:3; bottom:8px; left:50%; width:104px; height:4px; transform:translateX(-50%); border-radius:99px; background:var(--ink); opacity:.28; }  /* home indicator */
.eai-lpscreen{ position:absolute; inset:0; display:flex; flex-direction:column; gap:14px; padding:58px 20px 32px; overflow:hidden; font-size:13.5px; line-height:1.5; color:var(--ink); }

/* Demo pieces: everything fades up in turn (--d is each piece's delay), so a tab plays like a short film each time it opens */
.eai-d{ animation:eai-d-up .55s cubic-bezier(.2,.7,.2,1) var(--d,0s) both; }
@keyframes eai-d-up{ from{ opacity:0; transform:translateY(10px); } to{ opacity:1; transform:none; } }
.eai-d-row{ display:flex; align-items:center; justify-content:space-between; gap:8px; font-size:14px; }
.eai-d-sub{ font-size:12.5px; color:var(--muted); font-weight:600; }
.eai-d-bar{ height:8px; margin-top:10px; border-radius:99px; background:var(--line); overflow:hidden; }
.eai-d-bar > i{ display:block; height:100%; border-radius:inherit; background:var(--lp-link); width:var(--to,50%); animation:eai-d-fill 1s cubic-bezier(.2,.7,.2,1) var(--d,0s) both; }
.eai-d-bar > i.is-jade{ background:var(--jade); }
@keyframes eai-d-fill{ from{ width:0; } }
.eai-d-card{ padding:14px 16px; border:2px solid var(--line); border-radius:14px; background:var(--card); }
.eai-d-q{ font-size:21px; font-weight:700; text-align:center; padding:14px 16px; }
.eai-d-opt{ display:flex; align-items:center; gap:10px; padding:9px 14px; border:2px solid var(--line); border-radius:14px; background:var(--card); font-weight:600; }
.eai-d-opt.is-right{ animation:eai-d-up .55s cubic-bezier(.2,.7,.2,1) var(--d,0s) both, eai-d-right .45s ease 1.2s forwards; }
@keyframes eai-d-right{ to{ border-color:var(--jade); background:var(--lp-hover); } }
@supports (background: color-mix(in srgb, red 10%, white)){ @keyframes eai-d-right{ to{ border-color:var(--jade); background:color-mix(in srgb, var(--jade) 14%, var(--card)); } } }
.eai-d-key{ display:grid; place-items:center; width:24px; height:24px; border-radius:8px; background:var(--lp-hover); font-size:12px; font-weight:700; color:var(--muted); }
.eai-d-tick{ margin-left:auto; color:var(--jade); opacity:0; animation:eai-d-pop .35s ease 1.35s forwards; }
@keyframes eai-d-pop{ from{ opacity:0; transform:scale(.4); } to{ opacity:1; transform:none; } }
.eai-d-why{ border-color:var(--jade); font-size:12.5px; }
.eai-d-why b{ color:var(--jade); }

.eai-d-bubble{ max-width:92%; padding:12px 14px; border-radius:18px; font-size:13.5px; }
.eai-d-me{ align-self:flex-end; background:var(--primary); color:#FFFFFF; border-bottom-right-radius:4px; }
.eai-d-ai{ align-self:flex-start; background:var(--lp-hover); border:1px solid var(--line); border-bottom-left-radius:4px; display:flex; flex-direction:column; gap:12px; }
.eai-d-who{ display:flex; align-items:center; gap:5px; font-size:11px; font-weight:700; color:var(--lp-link); text-transform:uppercase; letter-spacing:.05em; }
.eai-km-root .eai-d-who{ text-transform:none; letter-spacing:normal; }
.eai-d-step{ display:flex; gap:10px; align-items:flex-start; }
.eai-d-num{ flex:none; display:grid; place-items:center; width:20px; height:20px; border-radius:99px; background:var(--lp-link); color:#FFFFFF; font-size:11px; font-weight:700; }
.eai-d-chip{ align-self:flex-start; display:inline-flex; align-items:center; gap:8px; padding:9px 14px; border:2px solid var(--lp-link); border-radius:99px; color:var(--lp-link); font-weight:700; font-size:12px; }
.eai-d-typing{ align-self:flex-start; display:flex; gap:5px; padding:12px 14px; border-radius:14px; background:var(--lp-hover); animation:eai-d-typing 1.4s ease .35s both; overflow:hidden; }
.eai-d-typing i{ width:6px; height:6px; border-radius:99px; background:var(--muted); animation:eai-d-dot .9s ease-in-out infinite; }
.eai-d-typing i:nth-child(2){ animation-delay:.15s; } .eai-d-typing i:nth-child(3){ animation-delay:.3s; }
@keyframes eai-d-dot{ 0%,100%{ opacity:.35; transform:translateY(0); } 50%{ opacity:1; transform:translateY(-3px); } }
@keyframes eai-d-typing{ 0%{ opacity:0; max-height:0; padding:0 14px; margin-bottom:-14px; } 12%{ opacity:1; max-height:38px; padding:12px 14px; margin-bottom:0; } 88%{ opacity:1; max-height:38px; padding:12px 14px; margin-bottom:0; } 100%{ opacity:0; max-height:0; padding:0 14px; margin-bottom:-14px; } }

.eai-d-search{ display:flex; align-items:center; gap:10px; padding:12px 14px; border-radius:12px; background:var(--lp-hover); color:var(--muted); font-size:12.5px; }
.eai-d-uni{ display:flex; align-items:center; gap:12px; padding:10px 12px; }
.eai-d-logo{ flex:none; display:grid; place-items:center; width:38px; height:38px; border-radius:10px; background:#FFFFFF; border:1px solid var(--line); overflow:hidden; }
.eai-d-logo img{ width:30px; height:30px; object-fit:contain; }
.eai-d-unitext{ display:flex; flex-direction:column; min-width:0; }
.eai-d-unitext b{ font-size:14px; }
.eai-d-unitext small{ font-size:11px; color:var(--muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.eai-d-sch{ display:flex; flex-direction:column; gap:10px; }
.eai-d-sch b{ font-size:14.5px; line-height:1.35; }
.eai-d-schrow em{ flex:none; font-style:normal; font-size:11px; font-weight:700; padding:3px 10px; border-radius:99px; background:var(--lp-soft); color:var(--lp-link); }
.eai-d-schrow{ display:flex; align-items:center; justify-content:space-between; gap:12px; }
.eai-d-remind{ display:inline-flex; align-items:center; gap:7px; font-size:12.5px; font-weight:700; color:var(--muted); }
.eai-d-remind svg{ transform-origin:50% 0; animation:eai-d-ring 1.2s ease 1.2s 1; }
@keyframes eai-d-ring{ 0%,100%{ transform:rotate(0); } 20%{ transform:rotate(16deg); } 40%{ transform:rotate(-14deg); } 60%{ transform:rotate(8deg); } 80%{ transform:rotate(-5deg); } }
.eai-d-check{ display:flex; align-items:center; gap:12px; margin-top:12px; }
.eai-d-box{ flex:none; display:grid; place-items:center; width:18px; height:18px; border-radius:6px; border:2px solid var(--line); color:#FFFFFF; animation:eai-d-tick .35s ease var(--d,0s) both; }
@keyframes eai-d-tick{ from{ background:transparent; border-color:var(--line); color:transparent; } to{ background:var(--jade); border-color:var(--jade); color:#FFFFFF; } }
.eai-d-line{ flex:1; height:8px; border-radius:99px; background:var(--line); }

/* ── Features ── */
.eai-lpfeat{ display:grid; gap:16px; margin:48px 0 0; padding:0; list-style:none; grid-template-columns:1fr; }
@media (min-width:640px){ .eai-lpfeat{ grid-template-columns:repeat(2, minmax(0,1fr)); gap:20px; } }
@media (min-width:1024px){ .eai-lpfeat{ grid-template-columns:repeat(3, minmax(0,1fr)); } }
.eai-lpfeat-card{ padding:24px; border:2px solid var(--line); border-bottom-width:4px; border-radius:20px; background:var(--card); transition:opacity .6s ease, transform .6s cubic-bezier(.2,.7,.2,1), border-color .2s ease; }
.eai-lpfeat-card.is-in:hover{ transform:translateY(-4px); border-color:var(--acc); }
.eai-lpfeat-tile{ display:grid; place-items:center; width:48px; height:48px; border-radius:14px; background:var(--lp-hover); color:var(--acc); margin-bottom:16px; }
@supports (background: color-mix(in srgb, red 10%, white)){ .eai-lpfeat-tile{ background:color-mix(in srgb, var(--acc) 14%, var(--card)); } }
.eai-lpfeat-card h3{ margin:0 0 6px; font-size:18px; font-weight:700; color:var(--ink); }
.eai-lpfeat-card p{ margin:0; font-size:15px; line-height:1.6; color:var(--muted); }

/* ── Stats banner ── */
.eai-lpstats{ position:relative; overflow:hidden; padding:56px 24px; background:var(--primary-deep); color:#FFFFFF; }
@media (min-width:1024px){ .eai-lpstats{ padding:72px 40px; } }
.eai-lpstats-grid{ display:grid; gap:36px; grid-template-columns:1fr; text-align:center; }
@media (min-width:640px){ .eai-lpstats-grid{ grid-template-columns:repeat(auto-fit, minmax(0,1fr)); gap:24px; } }
.eai-lpstat{ display:flex; flex-direction:column; align-items:center; gap:6px; }
.eai-lpstat b{ font-family:'Sora', system-ui, sans-serif; font-weight:800; font-size:clamp(36px, 6vw, 56px); line-height:1.1; font-variant-numeric:tabular-nums; }
.eai-lpstat > span{ font-size:15px; font-weight:600; opacity:.85; }
@media (min-width:640px){ .eai-lpstat + .eai-lpstat{ border-left:1px solid rgba(255,255,255,.25); } }

/* ── Romdoul flowers (Romdoul.jsx): Cambodia's national flower as quiet decoration. Light mode only (the app hides every Romdoul
   piece in dark mode, and so does this). They take no space, ignore taps, and sit behind the text. ── */
.eai-lporn{ display:flex; align-items:center; justify-content:center; gap:14px; margin:0 auto 18px; }
.eai-lporn::before, .eai-lporn::after{ content:""; width:44px; height:2px; border-radius:2px; background:linear-gradient(90deg, transparent, var(--romdoul-edge)); opacity:.55; }
.eai-lporn::after{ transform:scaleX(-1); }
.theme-dark .eai-lporn{ display:none; }
.eai-lpstats-flora{ position:absolute; z-index:0; width:110px; height:110px; opacity:.95; }
.eai-lpstats-flora-r{ right:-20px; bottom:-30px; }
.eai-lpstats-flora-l{ display:none; left:-20px; top:-30px; transform:scale(-1, -1); }
@media (min-width:640px){ .eai-lpstats-flora{ width:140px; height:140px; } .eai-lpstats-flora-l{ display:block; } }
.eai-lpstats-grid > *{ position:relative; z-index:1; }
.eai-lpclose{ position:relative; overflow:hidden; }
.eai-lpclose-in{ position:relative; z-index:1; }
.eai-lpclose-flora{ display:none; position:absolute; z-index:0; width:120px; height:120px; }
.eai-lpclose-flora-l{ left:4%; bottom:20px; transform:scaleX(-1); }
.eai-lpclose-flora-r{ right:4%; top:20px; }
@media (min-width:900px){ .eai-lpclose-flora{ display:block; } }
@media (max-width:339px){ .eai-lpstats-flora{ display:none; } }

/* ── How it works ── */
.eai-lphow{ display:grid; gap:36px; margin:52px 0 0; padding:0; list-style:none; counter-reset:none; }
@media (min-width:900px){ .eai-lphow{ grid-template-columns:repeat(3, minmax(0,1fr)); gap:32px; } }
.eai-lphow-step{ position:relative; display:flex; flex-direction:column; align-items:center; text-align:center; }
.eai-lphow-num{ position:relative; z-index:1; display:grid; place-items:center; width:56px; height:56px; border-radius:99px; background:var(--primary); border-bottom:4px solid var(--primary-deep); color:#FFFFFF; font-family:'Sora', system-ui, sans-serif; font-size:24px; font-weight:800; }
.eai-lphow-label{ margin-top:14px; font-size:12px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:var(--lp-link); }
.eai-lphow-label.eai-km{ letter-spacing:normal; text-transform:none; font-size:13px; }
.eai-lphow-step h3{ margin:6px 0 8px; font-size:20px; font-weight:700; line-height:1.3; color:var(--ink); text-wrap:balance; }
.eai-lphow-step p{ margin:0; max-width:300px; font-size:15px; line-height:1.6; color:var(--muted); }
@media (min-width:900px){
  .eai-lphow-step:not(:last-child)::after{ content:""; position:absolute; top:27px; left:calc(50% + 40px); width:calc(100% + 32px - 80px); border-top:3px dashed var(--line); }
}

/* ── FAQ ── */
.eai-lpfaq-wrap{ max-width:760px; }
.eai-lpfaq{ display:flex; flex-direction:column; gap:12px; margin-top:44px; }
.eai-lpfaq-item{ border:2px solid var(--line); border-radius:16px; background:var(--card); transition:border-color .2s ease; }
.eai-lpfaq-item.is-open{ border-color:var(--lp-link); }
.eai-lpfaq-item h3{ margin:0; }
.eai-lpfaq-q{ display:flex; align-items:center; justify-content:space-between; gap:16px; width:100%; padding:16px 18px; border:0; border-radius:14px; background:none; color:var(--ink);
  font-size:16px; font-weight:700; line-height:1.4; text-align:left; cursor:pointer; }
.eai-lpfaq-q svg{ flex:none; color:var(--muted); transition:transform .3s ease; }
.eai-lpfaq-item.is-open .eai-lpfaq-q svg{ transform:rotate(180deg); color:var(--lp-link); }
.eai-lpfaq-a{ display:grid; grid-template-rows:0fr; transition:grid-template-rows .3s ease; }
.eai-lpfaq-item.is-open .eai-lpfaq-a{ grid-template-rows:1fr; }
.eai-lpfaq-a > div{ overflow:hidden; min-height:0; }
.eai-lpfaq-a p{ margin:0; padding:0 18px 18px; font-size:15px; line-height:1.7; color:var(--muted); }

/* ── Closing call to action ── */
.eai-lpclose-in{ display:flex; flex-direction:column; align-items:center; }
.eai-lpclose-btns{ display:flex; flex-direction:column; gap:12px; width:100%; max-width:420px; margin-top:32px; }
@media (min-width:640px){ .eai-lpclose-btns{ flex-direction:row; max-width:520px; } }

/* ── Footer ── */
.eai-lpfoot{ padding:56px 24px calc(28px + env(safe-area-inset-bottom)); border-top:1px solid var(--line); background:var(--bg); }
@media (min-width:1024px){ .eai-lpfoot{ padding:72px 40px 32px; } }
.eai-lpfoot-grid{ display:grid; gap:36px 24px; grid-template-columns:repeat(2, minmax(0,1fr)); }
@media (min-width:900px){ .eai-lpfoot-grid{ grid-template-columns:minmax(0,1.6fr) repeat(3, minmax(0,1fr)); gap:40px; } }
.eai-lpfoot-brand{ grid-column:1 / -1; display:flex; flex-direction:column; align-items:flex-start; gap:12px; }
@media (min-width:900px){ .eai-lpfoot-brand{ grid-column:auto; } }
.eai-lpfoot-brand p{ margin:0; max-width:300px; font-size:14px; line-height:1.6; color:var(--muted); }
.eai-lpfoot-mail{ display:inline-flex; align-items:center; gap:8px; font-size:14px; font-weight:600; color:var(--lp-link); text-decoration:none; border-radius:8px; word-break:break-all; }
.eai-lpfoot-mail:hover{ text-decoration:underline; }
.eai-lpfoot-social{ display:flex; gap:10px; margin-top:4px; }
.eai-lpfoot-ico{ display:grid; place-items:center; width:40px; height:40px; border:2px solid var(--line); border-radius:12px; color:var(--ink); background:var(--card); transition:background-color .15s ease, border-color .15s ease, transform .15s ease; }
.eai-lpfoot-ico:hover{ background:var(--lp-hover); border-color:var(--lp-link); transform:translateY(-2px); }
.eai-lpfoot-col{ display:flex; flex-direction:column; align-items:flex-start; gap:10px; }
.eai-lpfoot-col h4{ margin:0 0 4px; font-size:12px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:var(--ink); }
.eai-lpfoot-col h4.eai-km{ letter-spacing:normal; text-transform:none; font-size:14px; }
.eai-lpfoot-link{ padding:0; border:0; background:none; font-size:14px; font-weight:500; color:var(--muted); text-decoration:none; text-align:left; cursor:pointer; border-radius:6px; transition:color .15s ease; }
.eai-lpfoot-link:hover{ color:var(--lp-link); }
.eai-lpfoot-bottom{ display:flex; flex-direction:column; gap:6px; margin-top:44px; padding-top:20px; border-top:1px solid var(--line); font-size:13px; color:var(--muted); }
@media (min-width:640px){ .eai-lpfoot-bottom{ flex-direction:row; justify-content:space-between; } }

/* Visible only to screen readers */
.eai-root .sr-only{ position:absolute; width:1px; height:1px; margin:-1px; padding:0; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0; }

/* ── Reduced motion: no bouncing, counting, fading or sliding; every piece shows its finished state at once ── */
@media (prefers-reduced-motion: reduce){
  .eai-lpcue svg{ animation:none; }
  .eai-reveal{ opacity:1; transform:none; transition:none; }
  .eai-lpfeat-card.is-in:hover{ transform:none; }
  .eai-d, .eai-d-opt.is-right, .eai-d-bar > i, .eai-d-tick, .eai-d-box, .eai-d-remind svg{ animation:none; }
  .eai-d-opt.is-right{ border-color:var(--jade); }
  .eai-d-tick{ opacity:1; }
  .eai-d-box{ background:var(--jade); border-color:var(--jade); }
  .eai-d-typing{ display:none; }
  .eai-lpfaq-a, .eai-lpfaq-q svg, .eai-lpnav, .eai-lp-tab, .eai-lpfoot-ico{ transition:none; }
}
`;
