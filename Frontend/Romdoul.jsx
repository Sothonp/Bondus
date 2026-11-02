/* Romdoul (ផ្ករំដួល), Cambodia's national flower, as small decorative SVGs: a cream-yellow blossom with three overlapping
   petals and a bud in the middle that shows a three-way seam, with glossy green leaves. Drawn here from the flower's shape
   (not copied from any picture), so it is ours to use.

   Four pieces, each used for one job (see the Romdoul section in App.jsx's STYLES):
     RomdoulCluster  blossoms and leaves, a watermark in the corner of a big card
     RomdoulBlossom  one top-down blossom, a small bullet or section marker
     RomdoulVine     a vertical stem with leaves and tiny blossoms, the chapter-path rail once a chapter is earned
     RomdoulSprig    a leaf sprig, for empty states

   Rules that keep them safe: they are decoration only (aria-hidden, no pointer events, no text on them), they take no
   space in the layout (the parent positions them), and they are light-mode only: the colours below are new tokens that
   exist in the light theme, and `.theme-dark .eai-romdoul` hides them. Nothing here changes an existing token.
   Pure presentation, like StreakFlame.jsx: nothing is imported back from App.jsx. */
import React, { useId } from "react";

const PETAL = "M32 34 C 19 30, 17 12, 32 3 C 47 12, 45 30, 32 34 Z";
const LEAF = "M0 0 C 5 -7, 17 -8, 26 0 C 17 8, 5 7, 0 0 Z";
const EDGE = "var(--romdoul-edge)";
const LEAF_EDGE = "var(--leaf-edge)";

/* One blossom centred on (cx, cy) at scale s, inside a larger drawing. The 64-unit blossom has its middle at (32, 34). */
function Bloom({ cx, cy, s = 1, rot = 0 }) {
  return (
    <g transform={`translate(${cx} ${cy}) rotate(${rot}) scale(${s}) translate(-32 -34)`}>
      {[0, 120, 240].map((a) => (
        <g key={a} transform={`rotate(${a} 32 34)`}>
          <path d={PETAL} fill="var(--romdoul)" stroke={EDGE} strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M28 21 C 29 15, 31 11, 34 8" fill="none" stroke="#fff" strokeOpacity=".6" strokeWidth="1.6" strokeLinecap="round" />
        </g>
      ))}
      <circle cx="32" cy="34" r="10.5" fill="var(--romdoul)" stroke={EDGE} strokeWidth="1.5" />
      <circle cx="32" cy="34" r="10.5" fill="#fff" fillOpacity=".35" />
      <path d="M32 34 L32 23.5 M32 34 L41.1 39.2 M32 34 L22.9 39.2" fill="none" stroke={EDGE} strokeWidth="1.5" strokeLinecap="round" />
    </g>
  );
}

function Leaf({ x, y, rot, s = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      <path d={LEAF} fill="var(--leaf)" stroke={LEAF_EDGE} strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M2 0 L22 0" fill="none" stroke="#fff" strokeOpacity=".45" strokeWidth="1" strokeLinecap="round" />
    </g>
  );
}

const common = { className: "eai-romdoul", "aria-hidden": "true", focusable: "false" };

export function RomdoulCluster({ className = "", style }) {
  return (
    <svg {...common} className={`eai-romdoul ${className}`} style={style} viewBox="0 0 96 96">
      <Leaf x={48} y={50} rot={-150} s={1.7} />
      <Leaf x={48} y={50} rot={-22} s={1.6} />
      <Leaf x={48} y={50} rot={98} s={1.45} />
      <Bloom cx={69} cy={66} s={0.6} rot={20} />
      <Bloom cx={41} cy={42} s={0.85} />
      <Bloom cx={76} cy={30} s={0.36} rot={-30} />
    </svg>
  );
}

export function RomdoulBlossom({ size = 16, className = "", style }) {
  return (
    <svg {...common} className={`eai-romdoul ${className}`} style={style} width={size} height={size} viewBox="0 0 64 64">
      <Bloom cx={32} cy={34} s={0.98} />
    </svg>
  );
}

/* Fills the space it is given (the rail's connector). A repeating 36 x 64 tile, so a tall rail gets more blossoms and
   a short one fewer, and nothing is stretched. */
/* `stage` says how far along the chapter above the connector is: "bud" (locked: a pale bud on a grey stem, still reads as
   locked), "grow" (open or in progress: green stem, leaves and a closed bud) or "bloom" (passed or mastered: leaves and a
   full blossom). */
export function RomdoulVine({ stage = "bloom", className = "", style }) {
  const id = useId().replace(/:/g, "");
  const tile = stage === "bud" ? (
    <>
      <path d="M18 0 L18 64" fill="none" stroke="var(--line)" strokeWidth="2" strokeLinecap="round" />
      <g opacity=".85"><Bloom cx={18} cy={28} s={0.27} /></g>
    </>
  ) : stage === "grow" ? (
    <>
      <path d="M18 0 C 20 16, 16 32, 18 64" fill="none" stroke="var(--stem)" strokeWidth="2" strokeLinecap="round" />
      <Leaf x={18} y={16} rot={196} s={0.42} />
      <Leaf x={18} y={16} rot={-16} s={0.42} />
      <Bloom cx={18} cy={36} s={0.24} />
    </>
  ) : (
    <>
      <path d="M18 0 C 21 16, 15 32, 18 64" fill="none" stroke="var(--stem)" strokeWidth="2" strokeLinecap="round" />
      <Leaf x={18} y={14} rot={196} s={0.5} />
      <Leaf x={18} y={14} rot={-16} s={0.5} />
      <Bloom cx={18} cy={44} s={0.3} />
    </>
  );
  // The wrapper takes the connector's space (flex-1); the drawing is laid over it, so its own height never pushes a row taller.
  return (
    <span className={`eai-romdoul ${className}`} data-stage={stage} style={{ position: "relative", flex: "1 1 0", width: 36, minHeight: 14, WebkitMaskImage: "linear-gradient(180deg, #000 78%, transparent)", maskImage: "linear-gradient(180deg, #000 78%, transparent)", ...style }} aria-hidden="true">
      <svg focusable="false" width="36" height="100%" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <pattern id={`${id}-v`} width="36" height="64" patternUnits="userSpaceOnUse">{tile}</pattern>
        </defs>
        <rect width="36" height="100%" fill={`url(#${id}-v)`} />
      </svg>
    </span>
  );
}

export function RomdoulSprig({ size = 32, className = "", style }) {
  return (
    <svg {...common} className={`eai-romdoul ${className}`} style={style} width={size} height={size} viewBox="0 0 64 64">
      <path d="M12 58 C 22 44, 32 30, 50 8" fill="none" stroke="var(--stem)" strokeWidth="2.2" strokeLinecap="round" />
      <Leaf x={19} y={48} rot={-112} s={0.8} />
      <Leaf x={23} y={44} rot={-8} s={0.8} />
      <Leaf x={31} y={33} rot={-124} s={0.85} />
      <Leaf x={35} y={29} rot={-18} s={0.85} />
      <Leaf x={49} y={9} rot={-58} s={0.9} />
    </svg>
  );
}
