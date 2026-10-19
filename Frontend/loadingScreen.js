/* The Duolingo-style loading screen, as strings (no React, no DOM at import time). Tests: node --test Frontend/loadingScreen.test.js

   One drawing serves two places, so they cannot drift apart:
   - LoadingScreen.jsx renders it inside the app: <Suspense fallback={<LoadingScreen lang={lang} dark={dark} />}> around
     anything lazy-loaded, or {isLoading && <LoadingScreen ... />} while data loads;
   - splashPlugin.js writes it into index.html, so the very first load (a blank white page while the app downloads) shows
     it too. main.jsx hands over with dismissSplash() once the app has painted.

   The mascot is the BONDUS owl as a small inline drawing, animated with plain CSS (no JS rig, no image request), so it
   can play before the app exists. It grooves on a ~1.1s loop: the body sways from -6 to +6 degrees pivoting on its feet
   and hops a little each time it passes upright, the feet tap in turn, the head and headphones bounce a beat later,
   the arms swing a little, and three music notes float up beside its head and fade. With reduced motion it stands still.

   The overlay is fixed, full screen, centred, z-index 50: white with #6B7280 text (4.8:1) in light mode, #111827 with
   #9CA3AF text (7.1:1) in dark. It fades in after 150ms, so a load that finishes quickly never flashes it. Distances in
   the owl's animations are drawing units: the owl is drawn 520 wide and shown up to 300px wide, so 7 units is about 4px.
   The gradient and clip ids (eai-ld-*) are fixed, which is safe: every copy of the drawing defines them identically. */

export const SPLASH_ID = "eai-splash";

const MESSAGES = { en: "Getting things ready", km: "កំពុងរៀបចំ" };
// The words only; the three animated dots after them are drawn for you.
export const loadingMessage = (lang) => MESSAGES[lang] ?? MESSAGES.en;

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/* ---- the drawing ---- */

// A music note, drawn around its own origin and coloured as given; it floats up from where it is placed.
const note = (x, y, color, delay) =>
  `<g transform="translate(${x} ${y})"><g class="eai-ld-note" style="animation-delay:${delay}s">` +
  `<ellipse cx="0" cy="0" rx="12" ry="8.5" transform="rotate(-20)" fill="${color}"/>` +
  `<path d="M 10 -3 L 10 -42" stroke="${color}" stroke-width="5.5" stroke-linecap="round" fill="none"/>` +
  `<path d="M 10 -42 Q 32 -36 30 -16 Q 23 -28 10 -28 Z" fill="${color}"/>` +
  `</g></g>`;

// Same artwork as the app's OwlMascot, in its happy-eyed dancing look, with a wrapper group at each pivot (feet, neck,
// shoulders) so CSS can turn a part about the right point by plain rotation.
const OWL = [
  '<svg class="eai-ld-owl" viewBox="0 0 520 540" aria-hidden="true" focusable="false">',
  "<defs>",
  '<radialGradient id="eai-ld-blue" cx="35%" cy="28%" r="85%"><stop offset="0" stop-color="#93B9FF"/><stop offset=".55" stop-color="#6A9AF3"/><stop offset="1" stop-color="#4F7DE0"/></radialGradient>',
  '<linearGradient id="eai-ld-white" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#E6EDFB"/></linearGradient>',
  '<linearGradient id="eai-ld-beak" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFD76B"/><stop offset="1" stop-color="#F5A623"/></linearGradient>',
  '<clipPath id="eai-ld-clip"><ellipse cx="0" cy="-78" rx="64" ry="68"/></clipPath>',
  "</defs>",
  '<ellipse cx="260" cy="494" rx="96" ry="14" fill="#1b2a55" opacity=".18"/>',
  '<g transform="translate(260 490)"><g class="eai-ld-body">',
  '<ellipse class="eai-ld-foot-l" cx="-34" cy="-12" rx="28" ry="14" fill="#4F7DE0"/>',
  '<ellipse class="eai-ld-foot-r" cx="34" cy="-12" rx="28" ry="14" fill="#4F7DE0"/>',
  '<ellipse cx="0" cy="-78" rx="64" ry="68" fill="url(#eai-ld-blue)"/>',
  '<g clip-path="url(#eai-ld-clip)"><ellipse cx="0" cy="-98" rx="80" ry="22" fill="#2f55b8" opacity=".28"/><ellipse cx="-30" cy="-40" rx="26" ry="14" fill="#fff" opacity=".12"/></g>',
  '<g transform="translate(0 -130)"><g class="eai-ld-head"><g transform="translate(0 130)">',
  '<path d="M -96 -258 Q -128 -300 -110 -344 Q -66 -330 -40 -290 Z" fill="#6597F1"/>',
  '<path d="M 96 -258 Q 128 -300 110 -344 Q 66 -330 40 -290 Z" fill="#6597F1"/>',
  '<ellipse cx="0" cy="-195" rx="118" ry="100" fill="url(#eai-ld-blue)"/>',
  '<ellipse cx="-62" cy="-262" rx="38" ry="14" fill="#fff" opacity=".2" transform="rotate(-22 -62 -262)"/>',
  '<path d="M 0 -215 C -18 -240 -98 -245 -100 -185 C -100 -130 -48 -112 0 -112 C 48 -112 100 -130 100 -185 C 98 -245 18 -240 0 -215 Z" fill="url(#eai-ld-white)"/>',
  '<g stroke="#22263f" stroke-width="8" stroke-linecap="round" fill="none"><path d="M -60 -182 Q -42 -206 -24 -182"/><path d="M 24 -182 Q 42 -206 60 -182"/></g>',
  '<circle cx="-72" cy="-160" r="21" fill="#F7B7A3" opacity=".9"/><circle cx="72" cy="-160" r="21" fill="#F7B7A3" opacity=".9"/>',
  '<path d="M -17 -176 Q 0 -190 17 -176 Q 12 -152 0 -146 Q -12 -152 -17 -176 Z" fill="url(#eai-ld-beak)"/>',
  '<path d="M -108 -190 C -118 -360 118 -360 108 -190" stroke="#5DBB93" stroke-width="16" fill="none" stroke-linecap="round"/>',
  '<path d="M -50 -306 Q 0 -329 50 -306" stroke="#F1F7F3" stroke-width="16" fill="none"/>',
  '<g transform="translate(-124 -186)"><ellipse rx="26" ry="44" fill="#4FB08A"/><ellipse cx="-4" rx="18" ry="34" fill="#F1F7F3"/><ellipse cx="-8" rx="11" ry="24" fill="#5DBB93"/></g>',
  '<g transform="translate(124 -186)"><ellipse rx="26" ry="44" fill="#4FB08A"/><ellipse cx="4" rx="18" ry="34" fill="#F1F7F3"/><ellipse cx="8" rx="11" ry="24" fill="#5DBB93"/></g>',
  "</g></g></g>",
  '<g transform="translate(-58 -104)"><g class="eai-ld-arm-l"><rect x="-17" y="-10" width="34" height="74" rx="17" fill="#6291EE"/><circle cx="0" cy="54" r="19" fill="#7FAAF7"/></g></g>',
  '<g transform="translate(58 -104)"><g class="eai-ld-arm-r"><rect x="-17" y="-10" width="34" height="74" rx="17" fill="#6291EE"/><circle cx="0" cy="54" r="19" fill="#7FAAF7"/></g></g>',
  "</g></g>",
  note(404, 176, "#F5A623", 0), note(438, 118, "#5DBB93", 0.7), note(96, 150, "#6A9AF3", 1.4),
  "</svg>",
].join("");

/* ---- the markup ---- */

// The whole overlay as one HTML string. `id` is for the first-load copy in index.html; `message` is plain text (escaped).
export function loadingMarkup({ lang = "en", dark = false, message, id } = {}) {
  const text = esc(message ?? loadingMessage(lang));
  return (
    `<div${id ? ` id="${esc(id)}"` : ""} class="eai-ld${dark ? " eai-ld-dark" : ""}" role="status" aria-live="polite">` +
    OWL +
    `<p class="eai-ld-text"${lang === "km" ? ' lang="km"' : ""}>${text}<span class="eai-ld-dots" aria-hidden="true"><i>.</i><i>.</i><i>.</i></span></p>` +
    "</div>"
  );
}

/* ---- the CSS (each rule starts its own line, which the tests rely on) ---- */

export const LOADING_CSS = `
.eai-ld{ position:fixed; inset:0; z-index:50; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:20px; box-sizing:border-box; padding:24px; margin:0; background:#FFFFFF; color:#6B7280; opacity:0; animation:eai-ld-in .25s ease-out .15s forwards; -webkit-font-smoothing:antialiased; }
.eai-ld-dark{ background:#111827; color:#9CA3AF; }
@keyframes eai-ld-in{
  to{ opacity:1; }
}
.eai-ld-leaving{ animation:eai-ld-out .3s ease forwards; pointer-events:none; }
@keyframes eai-ld-out{
  from{ opacity:1; }
  to{ opacity:0; }
}
.eai-ld-owl{ display:block; width:min(300px, 62vw); height:auto; overflow:visible; }
.eai-ld-text{ margin:0; font-size:17px; font-weight:600; line-height:1.4; text-align:center; font-family:ui-rounded, "SF Pro Rounded", Nunito, Sora, "Plus Jakarta Sans", system-ui, -apple-system, "Segoe UI", sans-serif; }
.eai-ld-text[lang="km"]{ font-family:"Kantumruy Pro", "Noto Sans Khmer", "Khmer OS", system-ui, sans-serif; }
.eai-ld-dots i{ font-style:normal; animation:eai-ld-dot 1.2s ease-in-out infinite; }
.eai-ld-dots i:nth-child(2){ animation-delay:.2s; }
.eai-ld-dots i:nth-child(3){ animation-delay:.4s; }
@keyframes eai-ld-dot{
  0%, 60%, 100%{ opacity:.25; }
  30%{ opacity:1; }
}
.eai-ld-body{ transform-origin:0 0; animation:eai-ld-sway 1.1s ease-in-out infinite; }
@keyframes eai-ld-sway{
  0%, 100%{ transform:rotate(-6deg) translateY(0); }
  25%{ transform:rotate(0deg) translateY(-7px); }
  50%{ transform:rotate(6deg) translateY(0); }
  75%{ transform:rotate(0deg) translateY(-7px); }
}
.eai-ld-foot-l{ animation:eai-ld-tap 1.1s ease-in-out infinite; }
.eai-ld-foot-r{ animation:eai-ld-tap 1.1s ease-in-out infinite; animation-delay:-.55s; }
@keyframes eai-ld-tap{
  0%, 50%, 100%{ transform:translateY(0); }
  25%{ transform:translateY(-12px); }
}
.eai-ld-head{ transform-origin:0 0; animation:eai-ld-nod 1.1s ease-in-out .1s infinite; }
@keyframes eai-ld-nod{
  0%, 100%{ transform:rotate(5deg) translateY(0); }
  25%{ transform:rotate(0deg) translateY(-8px); }
  50%{ transform:rotate(-5deg) translateY(0); }
  75%{ transform:rotate(0deg) translateY(-8px); }
}
.eai-ld-arm-l{ transform-origin:0 0; transform:rotate(10deg); animation:eai-ld-arm-l 1.1s ease-in-out infinite; }
.eai-ld-arm-r{ transform-origin:0 0; transform:rotate(-10deg); animation:eai-ld-arm-r 1.1s ease-in-out infinite; }
@keyframes eai-ld-arm-l{
  0%, 100%{ transform:rotate(22deg); }
  50%{ transform:rotate(2deg); }
}
@keyframes eai-ld-arm-r{
  0%, 100%{ transform:rotate(-2deg); }
  50%{ transform:rotate(-22deg); }
}
.eai-ld-note{ opacity:0; animation:eai-ld-note 2.1s ease-out infinite; }
@keyframes eai-ld-note{
  0%{ opacity:0; transform:translateY(0) scale(.6); }
  20%{ opacity:1; }
  100%{ opacity:0; transform:translateY(-70px) scale(1); }
}
@media (prefers-reduced-motion: reduce){
  .eai-ld, .eai-ld *{ animation:none !important; }
  .eai-ld{ opacity:1; }
  .eai-ld-note{ display:none; }
}
`;

/* ---- handing over from the first-load copy ---- */

// Once the app has painted, fade the first-load screen out and take it away. Safe to call when it is not there.
export function dismissSplash(doc = document, later = setTimeout) {
  const el = doc.getElementById(SPLASH_ID);
  if (!el) return false;
  el.classList.add("eai-ld-leaving");
  later(() => el.remove(), 350);
  return true;
}
