/* Styles for the Water Festival hero (FestivalHero.jsx) and its layout in Welcome. Rendered inside Welcome only, next to
   LANDING_CSS. Motion only runs once the scene has every layer (.is-live) and never for people who asked for less motion
   (FestivalScene then draws just the poster), and there is a reduced-motion twin at the bottom anyway. */
/* Styles for the Water Festival hero (FestivalHero.jsx) and its layout in Welcome. Rendered inside Welcome only, next to
   LANDING_CSS. The picture is a looping video with the sky cut away, so it sits straight on the page's white background; FestivalScene draws only its poster (a still frame) for
   people who asked for less motion, so there is a reduced-motion twin at the bottom as well. */
export const FESTIVAL_CSS = `
/* ── The scene: a white box with the video's own shape (960 x 614); the poster sits under the video ── */
.eai-fh-stage{ position:relative; width:100%; background:#FFFFFF; }
.eai-fh-scene{ position:relative; width:100%; aspect-ratio:960 / 614; overflow:hidden; background:#FFFFFF; }
.eai-fh-poster, .eai-fh-video{ position:absolute; inset:0; display:block; width:100%; height:100%; object-fit:cover; background:#FFFFFF; }
.eai-fh-video{ pointer-events:none; }

/* The owl's speech bubble: its tail points at the owl's head. A button, so a tap shows the next line. */
.eai-fh-bubblepos{ position:absolute; z-index:4; transform:translate(-50%, -100%); width:max-content; max-width:min(240px, 62%); }
.eai-fh-bubble{ display:block; border:0; background:none; padding:0; margin:0; cursor:pointer; font:inherit; color:inherit; text-align:inherit; border-radius:18px; }
.eai-fh-bubble:active{ transform:scale(.97); }
@media (max-width:639px){ .eai-fh-bubblepos .eai-card{ font-size:12.5px !important; padding:7px 12px !important; border-radius:16px; } }

/* ── Layout of the hero around it ──
   Phone/tablet: the picture runs edge to edge at the top, and the frosted card with the headline and buttons overlaps its lower
   edge. Laptop (1024px+): the card on the left overlaps the picture's left edge, so the picture's moving colours show through
   the card's blur; the picture is the bigger half. */
.eai-lp.theme-light .eai-lp-hero{ background:#FFFFFF; }
/* Light page: the white picture simply melts into the white page. Dark page: it is a rounded white card. */
.eai-lp.theme-light .eai-fh-hero .eai-fh-stage{ box-shadow:none; }
@media (max-width:1023px){ .eai-lp.theme-dark .eai-fh-hero .eai-fh-stage{ margin-inline:auto; width:100%; max-width:760px; margin-top:14px; border-radius:28px; overflow:hidden; } }
.eai-fh-hero{ display:flex; flex-direction:column; width:100%; max-width:1200px; flex:1 1 auto; }
.eai-fh-hero .eai-fh-stage{ margin-inline:-24px; width:calc(100% + 48px); }
.eai-fh-card{ position:relative; z-index:10; margin:-36px 8px 0; padding:22px 20px 20px; border-radius:28px; text-align:center;
  background:var(--bg); border:1px solid var(--line); box-shadow:0 20px 44px -24px rgba(15,23,42,.4); }
/* The frosted blur is only for laptops: on a phone a blur over a playing video is costly, so the card is a solid soft white. */
@media (min-width:1024px) and (hover:hover){
  @supports (backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)){
    .eai-fh-card{ background:color-mix(in srgb, var(--bg) 70%, transparent); -webkit-backdrop-filter:blur(16px) saturate(1.4); backdrop-filter:blur(16px) saturate(1.4); }
  }
}
@media not all and (min-width:1024px){ .eai-fh-card{ background:color-mix(in srgb, var(--bg) 94%, transparent); } }
.eai-fh-card h1{ margin:0 0 10px; }
.eai-fh-card p{ margin:0; }
.eai-fh-actions{ display:flex; flex-direction:column; gap:12px; width:100%; margin-top:20px; }
.eai-fh-body{ flex:1 1 auto; display:flex; flex-direction:column; justify-content:center; padding:0 0 14px; }
@media (min-width:640px) and (max-width:1023px){
  .eai-fh-hero .eai-fh-stage{ margin-inline:auto; width:100%; max-width:760px; margin-top:16px; border-radius:28px; overflow:hidden; box-shadow:0 24px 50px -30px rgba(15,23,42,.45); }
  .eai-fh-card{ width:100%; max-width:520px; margin:-40px auto 0; }
}
@media (min-width:1024px){
  .eai-fh-hero{ flex-direction:row-reverse; align-items:center; justify-content:center; padding:8px 0 16px; }
  .eai-fh-hero .eai-fh-stage{ margin:0; width:auto; flex:1 1 0; min-width:0; border-radius:36px; overflow:hidden; box-shadow:0 30px 60px -34px rgba(15,23,42,.5); }
  .eai-fh-body{ flex:none; display:block; padding:0; width:min(440px, 42%); margin-right:-64px; position:relative; z-index:10; }
  .eai-fh-card{ margin:0; text-align:left; padding:44px 32px 30px; border-radius:32px; }
  .eai-fh-card .eai-fh-actions{ max-width:none; }
}
.eai-lp-flora-card{ position:absolute; z-index:11; top:-28px; left:-24px; width:72px; height:72px; }
@media (min-width:1024px){ .eai-lp-flora-card{ top:-52px; left:-50px; width:96px; height:96px; } }
@media (max-width:339px){ .eai-lp-flora-card{ display:none; } }

@media (prefers-reduced-motion: reduce){
  .eai-fh-bubble:active{ transform:none; }
}
`;
