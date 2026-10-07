import { ITEM_BY_ID, MOUNTS, SLOTS } from "./catalog.js";

/* The cosmetic items' artwork, drawn as SVG layers that attach to the hand-rigged owl (OwlMascot in App.jsx and
   StudyOwlScene.jsx). Everything is in OWL-LOCAL units — origin between the feet, y up is negative — the same space
   both owls draw in, so one drawing fits both and follows the owl's head tilt, dance and jump.

   The owl, for orientation: head ellipse centre (0,-195) radii 118×100; ears reach y -344; the headphone band tops
   out at y ≈ -325 (hats sit on it, base y -322); ear cups at (±124,-186); eyes at (±42,-186); beak top y ≈ -183; body
   ellipse centre (0,-78) radii 64×68. The head hides everything above y ≈ -95, and hanging arms hide |x| > 41.

   An item has `layers`, one drawing function per MOUNT it needs (see the owls):
     back   behind the whole owl (before the feet)     torso  on the body, below the chin
     face   on the face, under the headphones          top    over the headphones (hats, pins)
   Drawing functions get { uid } — the owl's instance id — and must suffix every id they define with it, because
   several owls can share a page. Solid fills and opacity only; no animation. `thumbBox` is the item's bounds plus a
   little padding: the viewBox ItemThumb crops to. */

// Corner points of a star polygon (first tip pointing up) around (cx, cy).
const starPoints = (cx, cy, outer, inner, tips = 5) =>
  Array.from({ length: tips * 2 }, (_, i) => {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / tips;
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(" ");

// A band across the party hat's cone between two heights (0 = base, 1 = apex). The cone: base (±32,-322), apex (6,-402).
const coneBand = (t1, t2) => {
  const edge = (t) => [6 * t - 32 * (1 - t), 6 * t + 32 * (1 - t), -322 - 80 * t].map((n) => n.toFixed(1));
  const [l1, r1, y1] = edge(t1);
  const [l2, r2, y2] = edge(t2);
  return `${l1},${y1} ${r1},${y1} ${r2},${y2} ${l2},${y2}`;
};

// y of a quadratic curve with equal end heights `end` and control height `mid`, at parameter t in 0..1.
const quadY = (end, mid, t) => (1 - t) ** 2 * end + 2 * t * (1 - t) * mid + t ** 2 * end;

// One golden wing, on the left; the right one is this mirrored.
const Wing = () => (
  <>
    <path d="M -46 -100 Q -100 -150 -136 -128 Q -128 -112 -118 -108 Q -122 -92 -108 -88 Q -108 -72 -92 -68 Q -88 -54 -66 -48 Q -56 -70 -46 -100 Z"
      fill="#FFD76B" stroke="#F5B93A" strokeWidth="3" strokeLinejoin="round" />
    <path d="M -52 -96 L -118 -108 M -52 -90 L -104 -86 M -52 -80 L -86 -62" fill="none" stroke="#FFF1B8" strokeWidth="2.5" strokeLinecap="round" opacity=".8" />
  </>
);

export const ITEM_ART = {
  /* ── hats (mount: top) ── */
  "hat-party": {
    thumbBox: [-38, -417, 76, 111],
    layers: {
      top: () => (
        <>
          <path d="M -32 -322 Q 0 -312 32 -322 L 6 -402 Z" fill="#F06A8D" />
          <polygon points={coneBand(0.2, 0.34)} fill="#FFD76B" />
          <polygon points={coneBand(0.5, 0.64)} fill="#FFD76B" />
          <circle cx="-10" cy="-340" r="2.6" fill="#FFFFFF" />
          <circle cx="14" cy="-352" r="2.6" fill="#FFFFFF" />
          <circle cx="0" cy="-372" r="2.6" fill="#FFFFFF" />
          <circle cx="6" cy="-404" r="7" fill="#FFD76B" />
        </>
      ),
    },
  },
  "hat-flower": {
    thumbBox: [10, -344, 56, 58],
    layers: {
      top: () => (
        <>
          <ellipse cx="24" cy="-298" rx="10" ry="5" fill="#4FB08A" transform="rotate(-25 24 -298)" />
          <ellipse cx="52" cy="-298" rx="10" ry="5" fill="#4FB08A" transform="rotate(25 52 -298)" />
          <g transform="translate(38 -316)">
            {Array.from({ length: 8 }, (_, k) => <ellipse key={k} cx="0" cy="-12" rx="6.5" ry="10" fill="#FF8FB1" transform={`rotate(${k * 45})`} />)}
            <circle r="7" fill="#FFD76B" />
          </g>
        </>
      ),
    },
  },
  "hat-grad": {
    thumbBox: [-58, -362, 125, 66],
    layers: {
      top: () => (
        <>
          <path d="M -34 -330 L -34 -318 Q 0 -306 34 -318 L 34 -330 Z" fill="#3A4068" />
          <polygon points="-52,-338 0,-356 52,-338 0,-320" fill="#2B2F4A" />
          <path d="M -52 -338 L 0 -320 L 52 -338" fill="none" stroke="#4A5185" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M 0 -338 L 50 -337" fill="none" stroke="#FFD76B" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="0" cy="-338" r="3.5" fill="#FFD76B" />
          <path d="M 52 -338 L 56 -314" fill="none" stroke="#FFD76B" strokeWidth="3" strokeLinecap="round" />
          <ellipse cx="56" cy="-309" rx="4.5" ry="7" fill="#FFD76B" />
        </>
      ),
    },
  },
  "hat-wizard": {
    thumbBox: [-64, -420, 128, 115],
    layers: {
      top: () => (
        <>
          <ellipse cx="0" cy="-322" rx="58" ry="11" fill="#5B3FA8" />
          <path d="M -34 -326 C -28 -372 -2 -398 22 -414 C 14 -390 26 -356 34 -326 Z" fill="#6D4FC4" />
          <path d="M -35 -330 Q 0 -322 35 -330 L 33 -340 Q 0 -332 -33 -340 Z" fill="#FFD76B" />
          <polygon points={starPoints(-8, -352, 5, 2.2)} fill="#FFD76B" />
          <polygon points={starPoints(8, -372, 5, 2.2)} fill="#FFD76B" />
          <polygon points={starPoints(16, -396, 4, 1.8)} fill="#FFD76B" />
        </>
      ),
    },
  },
  "hat-crown": {
    thumbBox: [-48, -382, 96, 66],
    layers: {
      top: () => (
        <>
          <path d="M -38 -322 L -38 -364 L -28 -348 L -19 -366 L -9 -348 L 0 -370 L 9 -348 L 19 -366 L 28 -348 L 38 -364 L 38 -322 Z" fill="#F5B93A" />
          <rect x="-38" y="-334" width="76" height="12" rx="2" fill="#E29A30" />
          <path d="M -34 -331 L 34 -331" fill="none" stroke="#FFE7A0" strokeWidth="2" strokeLinecap="round" opacity=".6" />
          {[[-38, -366], [-19, -368], [0, -372], [19, -368], [38, -366]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="3.5" fill="#FFE7A0" />)}
          <circle cx="0" cy="-328" r="5" fill="#E9506F" />
          <circle cx="-20" cy="-328" r="4" fill="#4FB0F0" />
          <circle cx="20" cy="-328" r="4" fill="#4FB0F0" />
        </>
      ),
    },
  },

  /* ── glasses (mount: face) — drawn under the headphones, so the ear cups hide where the temples end ── */
  "face-round": {
    thumbBox: [-106, -221, 212, 68],
    layers: {
      face: () => (
        <>
          <circle cx="-42" cy="-186" r="26" fill="#BFE3FF" fillOpacity=".25" stroke="#2B2F4A" strokeWidth="5" />
          <circle cx="42" cy="-186" r="26" fill="#BFE3FF" fillOpacity=".25" stroke="#2B2F4A" strokeWidth="5" />
          <path d="M -16 -190 Q 0 -200 16 -190" fill="none" stroke="#2B2F4A" strokeWidth="5" strokeLinecap="round" />
          <path d="M -68 -190 L -100 -196 M 68 -190 L 100 -196" fill="none" stroke="#2B2F4A" strokeWidth="5" strokeLinecap="round" />
        </>
      ),
    },
  },
  "face-shades": {
    thumbBox: [-106, -212, 212, 52],
    layers: {
      face: () => (
        <>
          <rect x="-70" y="-206" width="56" height="40" rx="8" fill="#1B1F36" fillOpacity=".92" />
          <rect x="14" y="-206" width="56" height="40" rx="8" fill="#1B1F36" fillOpacity=".92" />
          <rect x="-14" y="-198" width="28" height="6" fill="#1B1F36" />
          <path d="M -70 -196 L -100 -196 M 70 -196 L 100 -196" fill="none" stroke="#1B1F36" strokeWidth="6" strokeLinecap="round" />
          <polygon points="-60,-202 -51,-202 -61,-178 -68,-178" fill="#FFFFFF" fillOpacity=".25" />
          <polygon points="24,-202 33,-202 23,-178 16,-178" fill="#FFFFFF" fillOpacity=".25" />
        </>
      ),
    },
  },
  "face-star": {
    thumbBox: [-106, -222, 212, 68],
    layers: {
      face: () => (
        <>
          <polygon points={starPoints(-42, -186, 30, 14)} fill="#FFD76B" fillOpacity=".55" stroke="#E29A30" strokeWidth="3" strokeLinejoin="round" />
          <polygon points={starPoints(42, -186, 30, 14)} fill="#FFD76B" fillOpacity=".55" stroke="#E29A30" strokeWidth="3" strokeLinejoin="round" />
          <path d="M -14 -196 Q 0 -204 14 -196" fill="none" stroke="#E29A30" strokeWidth="4" strokeLinecap="round" />
          <path d="M -70 -195 L -100 -196 M 70 -195 L 100 -196" fill="none" stroke="#E29A30" strokeWidth="4" strokeLinecap="round" />
        </>
      ),
    },
  },

  /* ── clothes (mostly torso; only y -95 and below shows under the chin) ── */
  "body-bowtie": {
    thumbBox: [-40, -100, 80, 40],
    layers: {
      torso: () => (
        <>
          <path d="M -4 -80 L -30 -94 Q -34 -80 -30 -66 Z" fill="#E9506F" />
          <path d="M 4 -80 L 30 -94 Q 34 -80 30 -66 Z" fill="#E9506F" />
          <rect x="-6" y="-88" width="12" height="16" rx="3" fill="#C23A57" />
        </>
      ),
    },
  },
  "body-scarf": {
    thumbBox: [-66, -114, 126, 98],
    layers: {
      torso: () => {
        // The band is two quadratic curves, so its stripes are measured off them to run edge to edge.
        const top = (x) => quadY(-108, -74, (x + 60) / 120);
        const bottom = (x) => quadY(-90, -56, (x + 56) / 112);
        return (
          <>
            <path d="M 22 -76 L 46 -70 L 54 -26 L 30 -22 Z" fill="#D95A49" />
            <path d="M 28 -35.5 L 52 -37" fill="none" stroke="#FFFFFF" strokeOpacity=".7" strokeWidth="4" />
            <path d="M -60 -108 Q 0 -74 60 -108 L 56 -90 Q 0 -56 -56 -90 Z" fill="#E9705F" />
            {[-36, 0, 36].map((x) => (
              <path key={x} d={`M ${x} ${top(x).toFixed(1)} L ${x} ${bottom(x).toFixed(1)}`} fill="none" stroke="#FFFFFF" strokeOpacity=".7" strokeWidth="4" />
            ))}
          </>
        );
      },
    },
  },
  "body-labcoat": {
    thumbBox: [-64, -116, 128, 112],
    layers: {
      // Clipped to the body ellipse so the coat never sticks out past the owl's silhouette.
      torso: ({ uid }) => {
        const clip = `cl-labcoat-${uid}`;
        return (
          <>
            <clipPath id={clip}><ellipse cx="0" cy="-78" rx="64" ry="68" /></clipPath>
            <g clipPath={`url(#${clip})`}>
              <path d="M -70 -110 L -70 4 L 70 4 L 70 -110 L 22 -110 L 0 -56 L -22 -110 Z" fill="#F4F7FF" />
              <path d="M 0 -56 L 0 4" fill="none" stroke="#C9D4EE" strokeWidth="1.5" />
              <path d="M -22 -108 L -46 -98 L -26 -74 L 0 -56 Z" fill="#FFFFFF" stroke="#C9D4EE" strokeWidth="2" strokeLinejoin="round" />
              <path d="M 22 -108 L 46 -98 L 26 -74 L 0 -56 Z" fill="#FFFFFF" stroke="#C9D4EE" strokeWidth="2" strokeLinejoin="round" />
              <rect x="18" y="-44" width="26" height="22" rx="3" fill="none" stroke="#C9D4EE" strokeWidth="2" />
              <rect x="24" y="-52" width="4" height="12" rx="1" fill="#5B8DEF" />
              <circle cx="0" cy="-38" r="3" fill="#C9D4EE" />
              <circle cx="0" cy="-20" r="3" fill="#C9D4EE" />
            </g>
          </>
        );
      },
    },
  },
  "body-cape": {
    thumbBox: [-102, -122, 204, 136],
    layers: {
      back: () => (
        <>
          <path d="M -52 -116 Q -104 -60 -92 -4 Q 0 12 92 -4 Q 104 -60 52 -116 Z" fill="#7A4FD1" />
          <path d="M -44 -100 Q -60 -50 -50 -10 Q 0 4 50 -10 Q 60 -50 44 -100 Z" fill="#5E3AB0" fillOpacity=".5" />
          <path d="M -92 -4 Q 0 12 92 -4" fill="none" stroke="#FFD76B" strokeWidth="4" strokeLinecap="round" />
        </>
      ),
      torso: () => (
        <>
          <path d="M -46 -104 Q 0 -80 46 -104" fill="none" stroke="#FFD76B" strokeWidth="6" strokeLinecap="round" />
          <circle cx="0" cy="-88" r="7" fill="#FFD76B" stroke="#E29A30" strokeWidth="2" />
          <circle cx="0" cy="-88" r="3" fill="#E9506F" />
        </>
      ),
    },
  },

  /* ── extras ── */
  "extra-backpack": {
    thumbBox: [-88, -128, 176, 104],
    layers: {
      back: () => (
        <>
          <rect x="-74" y="-122" width="148" height="92" rx="20" fill="#F5A623" />
          <rect x="-74" y="-62" width="148" height="32" rx="16" fill="#D98A12" fillOpacity=".6" />
          <rect x="-82" y="-84" width="20" height="38" rx="8" fill="#D98A12" />
          <rect x="62" y="-84" width="20" height="38" rx="8" fill="#D98A12" />
        </>
      ),
      torso: () => (
        <>
          <path d="M -36 -104 L -40 -50 M 36 -104 L 40 -50" fill="none" stroke="#C97A10" strokeWidth="9" strokeLinecap="round" />
          <rect x="-44" y="-72" width="8" height="6" rx="1.5" fill="#FFD76B" />
          <rect x="36" y="-72" width="8" height="6" rx="1.5" fill="#FFD76B" />
        </>
      ),
    },
  },
  "extra-badge": {
    thumbBox: [-146, -220, 40, 40],
    layers: {
      top: () => <polygon points={starPoints(-126, -200, 14, 6)} fill="#FFD76B" stroke="#E29A30" strokeWidth="2" strokeLinejoin="round" />,
    },
  },
  "extra-medal": {
    thumbBox: [-24, -102, 48, 68],
    layers: {
      torso: () => (
        <>
          <polygon points="-18,-96 -8,-96 3,-68 -7,-68" fill="#E9506F" />
          <polygon points="18,-96 8,-96 -3,-68 7,-68" fill="#4FB0F0" />
          <circle cx="0" cy="-56" r="15" fill="#F5B93A" stroke="#E29A30" strokeWidth="3" />
          <polygon points={starPoints(0, -56, 7, 3)} fill="#FFE7A0" />
        </>
      ),
    },
  },
  "extra-wings": {
    thumbBox: [-142, -142, 284, 102],
    layers: {
      back: () => (
        <>
          <Wing />
          <g transform="scale(-1 1)"><Wing /></g>
        </>
      ),
    },
  },
};

// The art for an item id; an own-property check so a stray "constructor" in a save can't reach Object.prototype.
const artOf = (id) => (typeof id === "string" && Object.prototype.hasOwnProperty.call(ITEM_ART, id) ? ITEM_ART[id] : null);

/* Everything an outfit draws at ONE mount of an owl. Always renders the mount's <g>, empty when nothing is worn there,
   so the owls' structure doesn't change with the outfit. Items draw in slot order (hat, face, body, extra). Unknown ids
   and null slots are skipped, so a damaged save can never break the owl. */
export function OutfitLayers({ outfit, mount, uid = "o" }) {
  return (
    <g data-outfit-mount={mount}>
      {SLOTS.map((slot) => {
        const id = outfit?.[slot];
        const layer = artOf(id)?.layers[mount];
        return layer ? <g key={id} data-item={id}>{layer({ uid })}</g> : null;
      })}
    </g>
  );
}

/* A small picture of one item on its own, cropped to its thumbBox. `dimmed` greys it for locked items. */
export function ItemThumb({ itemId, lang = "en", size = 64, dimmed = false }) {
  const art = artOf(itemId);
  const item = ITEM_BY_ID[itemId];
  if (!art || !item) return null;
  const outfit = { [item.slot]: itemId };
  return (
    <svg viewBox={art.thumbBox.join(" ")} width={size} height={size} role="img" aria-label={lang === "km" ? item.nameKm : item.name}
      style={dimmed ? { opacity: 0.4, filter: "grayscale(1)" } : undefined}>
      {MOUNTS.filter((m) => art.layers[m]).map((m) => <OutfitLayers key={m} outfit={outfit} mount={m} uid={`thumb-${itemId}`} />)}
    </svg>
  );
}
