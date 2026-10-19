import { PLANE } from "./heroPlane.js";

/* The landing page's airplane, painted from the geometry in heroPlane.js. HeroScene draws it in two layers with the owl
   between them, so the owl sits inside the cockpit:
     <HeroPlaneBack>   far wing and tail wing, the body, the tail fin, the cockpit's inside and far rim, the seat back
     (the owl)
     <HeroPlaneFront>  the near wall of the body, the near rim, the near tail wing and wing, the engine cowl, the propeller
   Both layers animate with the same keyframes (HeroScene wraps each in .eai-plane), so they stay together. The body is
   drawn in both: the front layer repeats it clipped to everything in front of the near rim, which is what hides the
   owl's feet and lower belly. Colours are the --hero-* tokens, so light and dark mode and the landing palette apply.
   The gradients and the clip path both layers share live in <HeroPlaneDefs>, rendered once in the scene's <defs>. */

const fill = (name) => ({ fill: `var(${name})` });
const ROUND = { strokeLinejoin: "round", strokeLinecap: "round" };

export function HeroPlaneDefs({ uid }) {
  const [x1, y1, x2, y2] = PLANE.fuselage.shade;
  return (
    <>
      {/* Belly to top across the body: dark underside, rich middle, bright upper side — a rounded barrel. */}
      <linearGradient id={`${uid}-body`} gradientUnits="userSpaceOnUse" x1={x1} y1={y1} x2={x2} y2={y2}>
        <stop offset="0" style={{ stopColor: "var(--hero-plane-fin)" }} />
        <stop offset=".34" style={{ stopColor: "var(--hero-plane-b)" }} />
        <stop offset=".78" style={{ stopColor: "var(--hero-plane-a)" }} />
        <stop offset="1" style={{ stopColor: "var(--hero-plane-a)" }} />
      </linearGradient>
      <radialGradient id={`${uid}-gold`} cx=".38" cy=".3" r=".8">
        <stop offset="0" stopColor="#FFE9A8" />
        <stop offset=".35" style={{ stopColor: "var(--hero-gold)" }} />
        <stop offset="1" style={{ stopColor: "var(--hero-seat)" }} />
      </radialGradient>
      {/* The tail fin: brighter toward the top, so it catches the light like the body does. */}
      <linearGradient id={`${uid}-fin`} gradientUnits="userSpaceOnUse" x1="0" y1="-42" x2="0" y2="-104">
        <stop offset="0" style={{ stopColor: "var(--hero-plane-b)" }} />
        <stop offset="1" style={{ stopColor: "var(--hero-plane-a)" }} />
      </linearGradient>
      <clipPath id={`${uid}-near`}><path d={PLANE.cockpit.clip} /></clipPath>
      <clipPath id={`${uid}-finclip`}><path d={PLANE.tail.fin} /></clipPath>
    </>
  );
}

// A wing or tail wing: the plank's edge (the same outline dropped by its thickness), then its top face and painted tip.
function Plank({ plank, edge = "var(--hero-plane-edge)", top = "var(--hero-plane-wing)", tip = "var(--hero-gold)" }) {
  return (
    <g>
      <path d={plank.edge} style={{ fill: edge, stroke: edge, strokeWidth: 3, ...ROUND }} />
      <path d={plank.top} style={{ fill: top, stroke: top, strokeWidth: 3, ...ROUND }} />
      <path d={plank.tipCap} style={{ fill: tip, stroke: tip, strokeWidth: 3, ...ROUND }} />
    </g>
  );
}

function Body({ uid }) {
  return (
    <g>
      <path d={PLANE.fuselage.path} fill={`url(#${uid}-body)`} />
      <path d={PLANE.fuselage.band} style={{ fill: "none", stroke: "var(--hero-gold)", strokeWidth: 7, ...ROUND }} />
      <path d={PLANE.fuselage.highlight} style={{ fill: "none", stroke: "#FFFFFF", strokeOpacity: 0.3, strokeWidth: 5, ...ROUND }} />
    </g>
  );
}

export function HeroPlaneBack({ uid }) {
  const { cockpit, tail, wings } = PLANE;
  return (
    <g>
      <Plank plank={wings.far} />
      <Plank plank={tail.farStab} />
      <Body uid={uid} />
      <path d={tail.finEdge} style={{ ...fill("--hero-plane-edge"), stroke: "var(--hero-plane-edge)", strokeWidth: 2, ...ROUND }} />
      <path d={tail.fin} fill={`url(#${uid}-fin)`} style={{ stroke: "var(--hero-plane-b)", strokeWidth: 2, ...ROUND }} />
      <g clipPath={`url(#${uid}-finclip)`}><path d={tail.finStripe} style={fill("--hero-gold")} /></g>
      <path d={cockpit.interior} style={fill("--hero-interior")} />
      <path d={cockpit.farArcPath} style={{ fill: "none", stroke: "var(--hero-plane-fin)", strokeWidth: 12, strokeOpacity: 0.55, strokeLinecap: "butt" }} />
      <path d={cockpit.farArcPath} style={{ fill: "none", stroke: "var(--hero-rim)", strokeWidth: 8, ...ROUND }} />
      <path d={cockpit.seat.side} style={{ ...fill("--hero-seat"), stroke: "var(--hero-seat)", strokeWidth: 2, ...ROUND }} />
      <path d={cockpit.seat.front} style={{ ...fill("--hero-gold"), stroke: "var(--hero-gold)", strokeWidth: 2, ...ROUND }} />
      <path d={cockpit.seat.top} style={{ fill: "#FFD479", stroke: "#FFD479", strokeWidth: 2, ...ROUND }} />
    </g>
  );
}

export function HeroPlaneFront({ uid }) {
  const { cockpit, tail, wings, nose } = PLANE;
  return (
    <g>
      <g clipPath={`url(#${uid}-near)`}><Body uid={uid} /></g>
      <path d={cockpit.nearArcPath} style={{ fill: "none", stroke: "var(--hero-plane-fin)", strokeWidth: 12, strokeOpacity: 0.55, strokeLinecap: "butt" }} />
      <path d={cockpit.nearArcPath} style={{ fill: "none", stroke: "var(--hero-rim)", strokeWidth: 8, ...ROUND }} />
      <Plank plank={tail.nearStab} />
      <Plank plank={wings.near} />
      <path d={nose.cowl} fill={`url(#${uid}-gold)`} style={{ stroke: "var(--hero-seat)", strokeWidth: 2, ...ROUND }} />
      <path d={nose.cowlInner} style={fill("--hero-interior")} />
      <g transform={nose.matrix}>
        <circle r={nose.discRadius} style={{ ...fill("--hero-prop"), fillOpacity: 0.14 }} />
        <g className="eai-prop-spin">
          {[0, 180].map((turn) => (
            <g key={turn} transform={`rotate(${turn})`}>
              <path d="M 6 -10 L 60 -7.5 Q 71 0 60 7.5 L 6 10 Z" style={fill("--hero-prop")} />
              <path d="M 53 -7.7 L 60 -7.5 Q 71 0 60 7.5 L 53 7.7 Z" style={fill("--hero-gold")} />
            </g>
          ))}
        </g>
      </g>
      <circle cx={nose.spinner[0]} cy={nose.spinner[1]} r="13" fill={`url(#${uid}-gold)`} style={{ stroke: "var(--hero-seat)", strokeWidth: 1.5 }} />
    </g>
  );
}
