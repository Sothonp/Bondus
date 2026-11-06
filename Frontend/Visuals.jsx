/* The ```circuit, ```phet, ```molecule, ```compound, ```anatomy, ```gas and ```magnet figures (logic and limits in
   visuals.js and gasSim.js). ```thermo is drawn in App.jsx, which owns the GeoGebra figure. */
import React, { useEffect, useRef, useState } from "react";
import { falstadUrl, parseCircuit, phetSim, PHET_CREDIT, molecule, MOLECULE_SCRIPT, compound, formulaText, anatomy, parseGas } from "./visuals.js";
import { createGas, stepGas, readPressure, idealPressure, setTemperature, setWidth, speedHistogram } from "./gasSim.js";
import { parseMagnet, magnetFacts, wiresFor, seedsFor, traceLine, motorTorque, sig } from "./magnetSim.js";

const FRAME = { width: 560, maxWidth: "100%", borderRadius: 12, overflow: "hidden", border: "1px solid var(--border, #ddd)", background: "#fff" };

function Unreadable({ what, code }) {
  return (
    <div>
      <p className="text-xs eai-muted">This {what} could not be drawn:</p>
      <pre><code>{code}</code></pre>
    </div>
  );
}

/* A live circuit: current flows, the scope under it traces the source's voltage and current. */
export function CircuitFigure({ code }) {
  const circuit = parseCircuit(code);
  if (!circuit) return <Unreadable what="circuit" code={code} />;
  return (
    <div>
      <iframe title="Circuit simulation" src={falstadUrl(circuit)} loading="lazy"
        style={{ ...FRAME, height: 420, display: "block" }} />
      <p className="text-xs eai-muted" style={{ marginTop: 6 }}>
        Live simulation (Falstad CircuitJS): the scope shows the source voltage and the current.
      </p>
    </div>
  );
}

export function PhetFigure({ code }) {
  const sim = phetSim(code);
  if (!sim) return <Unreadable what="simulation" code={code} />;
  return (
    <div>
      <iframe title={sim.title} src={sim.url} loading="lazy" allowFullScreen
        style={{ ...FRAME, aspectRatio: "16 / 10", height: "auto", display: "block" }} />
      <p className="text-xs eai-muted" style={{ marginTop: 6 }}>
        {sim.title}. <a href="https://phet.colorado.edu" target="_blank" rel="noreferrer">{PHET_CREDIT}</a>.
      </p>
    </div>
  );
}

let moleculeLoader = null;
function load3Dmol() {
  if (window.$3Dmol) return Promise.resolve();
  moleculeLoader ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = MOLECULE_SCRIPT;
    script.async = true;
    script.onload = resolve;
    script.onerror = () => { moleculeLoader = null; script.remove(); reject(new Error("3Dmol could not be loaded")); };
    document.head.appendChild(script);
  });
  return moleculeLoader;
}

/* A molecule from the Protein Data Bank that the student can turn and zoom. */
export function MoleculeFigure({ code }) {
  const entry = molecule(code);
  const ref = useRef(null);
  const [state, setState] = useState("loading");

  useEffect(() => {
    if (!entry) return undefined;
    let cancelled = false;
    let viewer = null;
    load3Dmol().then(() => {
      if (cancelled || !ref.current) return;
      viewer = window.$3Dmol.createViewer(ref.current, { backgroundColor: "white" });
      window.$3Dmol.download(`pdb:${entry.pdb}`, viewer, {}, () => {
        if (cancelled) return;
        const cartoon = { cartoon: { color: "spectrum" } };
        viewer.setStyle({}, entry.style === "cartoon" ? cartoon : { ...cartoon, stick: { radius: 0.15 } });
        viewer.zoomTo();
        viewer.rotate(90, "x"); // a helix from the side rather than end-on
        viewer.render();
        setState("ready");
      });
    }).catch(() => { if (!cancelled) setState("failed"); });
    return () => { cancelled = true; try { viewer?.clear(); } catch { /* already gone */ } };
  }, [entry?.pdb]);

  if (!entry) return <Unreadable what="molecule" code={code} />;
  return (
    <div>
      <div ref={ref} style={{ ...FRAME, height: 340, position: "relative" }} />
      <p className="text-xs eai-muted" style={{ marginTop: 6 }}>
        {state === "failed" ? "Couldn't load the 3D viewer. " : ""}
        {entry.title} (PDB {entry.pdb}). Drag to turn it, scroll to zoom. Viewer: 3Dmol.js.
      </p>
    </div>
  );
}

/* A compound by name: PubChem's structural formula, its formula and IUPAC name, and on
   request its 3D model. Everything shown comes from PubChem, not from the tutor. */
export function CompoundFigure({ code }) {
  const entry = compound(code);
  const [info, setInfo] = useState(null);       // { cid, formula, iupac }
  const [missing, setMissing] = useState(false);
  const [show3d, setShow3d] = useState(false);
  const viewerRef = useRef(null);

  useEffect(() => {
    if (!entry) return undefined;
    let cancelled = false;
    setInfo(null); setMissing(false); setShow3d(false);
    fetch(entry.properties)
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
      .then((data) => {
        const row = data?.PropertyTable?.Properties?.[0];
        if (!cancelled && row) setInfo({ cid: row.CID, formula: row.MolecularFormula, iupac: row.IUPACName });
      })
      .catch(() => { if (!cancelled) setMissing(true); });
    return () => { cancelled = true; };
  }, [entry?.name]);

  useEffect(() => {
    if (!show3d || !info?.cid) return undefined;
    let cancelled = false;
    let viewer = null;
    load3Dmol().then(() => {
      if (cancelled || !viewerRef.current) return;
      viewer = window.$3Dmol.createViewer(viewerRef.current, { backgroundColor: "white" });
      window.$3Dmol.download(`cid:${info.cid}`, viewer, {}, () => {
        if (cancelled) return;
        viewer.setStyle({}, { stick: { radius: 0.18 }, sphere: { scale: 0.25 } });
        viewer.zoomTo(); viewer.render();
      });
    }).catch(() => {});
    return () => { cancelled = true; try { viewer?.clear(); } catch { /* already gone */ } };
  }, [show3d, info?.cid]);

  if (!entry) return <Unreadable what="compound" code={code} />;
  if (missing) {
    return <p className="text-xs eai-muted">PubChem has no compound named “{entry.name}”, so its structure is not shown.</p>;
  }
  return (
    <div>
      <div style={{ ...FRAME, width: 420, padding: 8 }}>
        <img src={entry.image} alt={`Structural formula of ${entry.name}`} loading="lazy"
          style={{ display: "block", maxWidth: "100%", margin: "0 auto" }} onError={() => setMissing(true)} />
        {show3d && <div ref={viewerRef} style={{ height: 300, position: "relative", marginTop: 8 }} />}
      </div>
      <p className="text-xs eai-muted" style={{ marginTop: 6 }}>
        <strong>{entry.name}</strong>
        {info?.formula ? <> · {formulaText(info.formula)}</> : null}
        {info?.iupac && info.iupac.toLowerCase() !== entry.name.toLowerCase() ? <> · IUPAC: {info.iupac}</> : null}
        {" · "}
        {info?.cid && !show3d && (
          <><button type="button" onClick={() => setShow3d(true)} style={{ textDecoration: "underline" }}>Show in 3D</button>{" · "}</>
        )}
        <a href={entry.page} target="_blank" rel="noreferrer">Structure from PubChem</a>
      </p>
    </div>
  );
}

/* A 3D anatomy or botany model the student can turn and zoom (Sketchfab). */
export function AnatomyFigure({ code }) {
  const entry = anatomy(code);
  if (!entry) return <Unreadable what="model" code={code} />;
  return (
    <div>
      <iframe title={entry.title} src={entry.url} loading="lazy" allow="autoplay; fullscreen; xr-spatial-tracking" allowFullScreen
        style={{ ...FRAME, height: 380, display: "block" }} />
      <p className="text-xs eai-muted" style={{ marginTop: 6 }}>
        {entry.title}. Drag to turn it, scroll to zoom. Model by {entry.by}, on{" "}
        <a href={entry.page} target="_blank" rel="noreferrer">Sketchfab</a>.
      </p>
    </div>
  );
}

/* An ideal gas in a box: the student sets T and V and watches the measured pressure follow
   p = NkT/V. Pressures are shown relative to the start (T as given, V = 100 %) = 100. */
const BOX = { w: 360, h: 220, pad: 10 };
export function GasFigure({ code }) {
  const settings = parseGas(code);
  const canvasRef = useRef(null);
  const gasRef = useRef(null);
  const [temperature, setT] = useState(settings.temperature);
  const [volume, setV] = useState(100);
  const [reading, setReading] = useState({ measured: 100, ideal: 100, bins: [] });

  useEffect(() => {
    gasRef.current = createGas({ count: settings.count, temperature: settings.temperature });
    const start = idealPressure(gasRef.current);
    let frame = 0, last = performance.now(), sinceReading = 0, raf = 0;
    const draw = (now) => {
      const gas = gasRef.current, canvas = canvasRef.current;
      if (!gas || !canvas) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      stepGas(gas, dt); sinceReading += dt;
      if (sinceReading > 0.8) {
        setReading({ measured: (100 * readPressure(gas)) / start, ideal: (100 * idealPressure(gas)) / start, bins: speedHistogram(gas).counts });
        sinceReading = 0;
      }
      const ctx = canvas.getContext("2d"), scale = BOX.h - 2 * BOX.pad, x0 = BOX.pad, y0 = BOX.pad;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "#334155"; ctx.lineWidth = 2;
      ctx.strokeRect(x0, y0, gas.width * scale * 1.5, scale);
      ctx.fillStyle = "#64748b"; ctx.fillRect(x0 + gas.width * scale * 1.5, y0, 6, scale); // the piston
      const hot = Math.min(1, gas.temperature / 1000);
      ctx.fillStyle = `rgb(${Math.round(60 + 195 * hot)}, ${Math.round(110 - 60 * hot)}, ${Math.round(230 - 180 * hot)})`;
      for (const p of gas.particles) {
        ctx.beginPath(); ctx.arc(x0 + p.x * scale * 1.5, y0 + p.y * scale, 3, 0, 2 * Math.PI); ctx.fill();
      }
      frame = raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf || frame);
  }, [settings.count, settings.temperature]);

  const changeT = (value) => { setT(value); if (gasRef.current) setTemperature(gasRef.current, value); };
  const changeV = (value) => { setV(value); if (gasRef.current) setWidth(gasRef.current, value / 100); };
  const peak = Math.max(1, ...reading.bins);
  return (
    <div style={{ ...FRAME, padding: 10, color: "#0f172a" }}>
      <canvas ref={canvasRef} width={BOX.w} height={BOX.h} style={{ display: "block", maxWidth: "100%", background: "#f8fafc", borderRadius: 8 }} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8, fontSize: 13 }}>
        <label>T = {temperature} K
          <input type="range" min={100} max={1000} step={10} value={temperature} onChange={(e) => changeT(Number(e.target.value))} style={{ width: "100%" }} />
        </label>
        <label>V = {volume} %
          <input type="range" min={40} max={100} step={5} value={volume} onChange={(e) => changeV(Number(e.target.value))} style={{ width: "100%" }} />
        </label>
        <div>p measured: <strong>{reading.measured.toFixed(0)}</strong></div>
        <div>p = NkT/V: <strong>{reading.ideal.toFixed(0)}</strong></div>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 46, marginTop: 8 }} aria-label="Speed distribution">
        {reading.bins.map((n, i) => <div key={i} style={{ flex: 1, height: `${(100 * n) / peak}%`, background: "#93c5fd", borderRadius: 2 }} />)}
      </div>
      <p className="text-xs eai-muted" style={{ marginTop: 6 }}>
        {settings.count} particles of an ideal gas. Pressures relative to the start (= 100); bars: how many particles move at each speed.
      </p>
    </div>
  );
}

/* Magnetic field lines (magnetSim.js) of a wire, a solenoid or a bar magnet, or the Laplace
   force on a wire in a uniform field. The current slider and the reverse button change
   the numbers and the field's direction; the shape of the field does not depend on I. */
const MAG = { size: 320 };
export function MagnetFigure({ code }) {
  const base = parseMagnet(code);
  const canvasRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [reversed, setReversed] = useState(false);

  useEffect(() => {
    if (!base) return;
    if (base.kind === "motor") return; // drawn by MotorFigure
    const fig = { ...base, reversed: base.reversed !== reversed };
    const canvas = canvasRef.current, ctx = canvas?.getContext("2d");
    if (!ctx) return;
    const S = MAG.size, toX = (x) => ((x + 1) / 2) * S, toY = (y) => ((1 - y) / 2) * S;
    ctx.clearRect(0, 0, S, S);
    ctx.fillStyle = "#f8fafc"; ctx.fillRect(0, 0, S, S);
    const arrow = (x, y, dx, dy, color, size = 7) => {
      const m = Math.hypot(dx, dy) || 1, ux = dx / m, uy = dy / m;
      ctx.fillStyle = color; ctx.beginPath();
      ctx.moveTo(x + ux * size, y + uy * size);
      ctx.lineTo(x - ux * size - uy * size * 0.6, y - uy * size + ux * size * 0.6);
      ctx.lineTo(x - ux * size + uy * size * 0.6, y - uy * size - ux * size * 0.6);
      ctx.closePath(); ctx.fill();
    };
    if (fig.kind === "force") {
      // A uniform field B to the right, a wire through the page carrying I, and F = I ℓ × B.
      ctx.strokeStyle = "#60a5fa"; ctx.lineWidth = 1.5;
      for (const y of [-0.6, -0.3, 0, 0.3, 0.6]) {
        ctx.beginPath(); ctx.moveTo(toX(-0.95), toY(y)); ctx.lineTo(toX(0.95), toY(y)); ctx.stroke();
        arrow(toX(0.55), toY(y), 1, 0, "#2563eb");
      }
      const out = !fig.reversed, up = out ? -1 : 1; // out of the page × right = up
      ctx.fillStyle = "#fff"; ctx.strokeStyle = "#0f172a"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(toX(0), toY(0), 12, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#0f172a"; ctx.font = "bold 16px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(out ? "•" : "×", toX(0), toY(0) + (out ? 0 : 1));
      ctx.strokeStyle = "#dc2626"; ctx.lineWidth = 4; ctx.beginPath();
      ctx.moveTo(toX(0), toY(0) + up * 14); ctx.lineTo(toX(0), toY(0) + up * 90); ctx.stroke();
      arrow(toX(0), toY(0) + up * 92, 0, up, "#dc2626", 10);
      ctx.fillStyle = "#dc2626"; ctx.font = "bold 14px sans-serif"; ctx.fillText("F", toX(0) + 18, toY(0) + up * 80);
      ctx.fillStyle = "#2563eb"; ctx.fillText("B", toX(0.85), toY(0.68));
      return;
    }
    const wires = wiresFor(fig);
    if (fig.kind === "bar") {
      // the magnet's body, N where the field leaves it
      const nRight = !fig.reversed;
      ctx.fillStyle = nRight ? "#3b82f6" : "#ef4444"; ctx.fillRect(toX(-0.6), toY(0.25), toX(0) - toX(-0.6), toY(-0.25) - toY(0.25));
      ctx.fillStyle = nRight ? "#ef4444" : "#3b82f6"; ctx.fillRect(toX(0), toY(0.25), toX(0.6) - toX(0), toY(-0.25) - toY(0.25));
      ctx.fillStyle = "#fff"; ctx.font = "bold 18px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(nRight ? "S" : "N", toX(-0.3), toY(0)); ctx.fillText(nRight ? "N" : "S", toX(0.3), toY(0));
    }
    ctx.strokeStyle = "#60a5fa"; ctx.lineWidth = 1.5;
    for (const [sx, sy] of seedsFor(fig)) {
      const line = traceLine(wires, sx, sy);
      if (line.length < 2) continue;
      ctx.beginPath();
      line.forEach(([x, y], i) => (i ? ctx.lineTo(toX(x), toY(y)) : ctx.moveTo(toX(x), toY(y))));
      ctx.stroke();
      for (const at of [0.25, 0.75]) {
        const i = Math.floor(line.length * at), [x1, y1] = line[i], [x2, y2] = line[Math.min(line.length - 1, i + 1)];
        if (fig.kind !== "bar" || Math.abs(y1) > 0.27 || Math.abs(x1) > 0.62) arrow(toX(x1), toY(y1), toX(x2) - toX(x1), toY(y2) - toY(y1), "#2563eb");
      }
    }
    if (fig.kind !== "bar") {
      ctx.font = "bold 12px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      // A densely wound coil: every turn as a dot, every fifth labelled • (out) or × (in).
      const dense = wires.length > 10;
      wires.forEach((w, i) => {
        const labelled = !dense || Math.floor(i / 2) % 5 === 2;
        ctx.fillStyle = labelled ? "#fff" : "#b45309"; ctx.strokeStyle = "#b45309"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(toX(w.x), toY(w.y), labelled ? 7 : 2.2, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
        if (labelled) { ctx.fillStyle = "#b45309"; ctx.fillText(w.current > 0 ? "•" : "×", toX(w.x), toY(w.y) + 0.5); }
      });
    }
  }, [code, reversed]);

  if (!base) return <Unreadable what="magnetic field" code={code} />;
  if (base.kind === "motor") return <MotorFigure fig={base} />;
  const fig = { ...base, I: base.I * scale };
  const facts = magnetFacts(fig);
  const hasCurrent = base.kind !== "bar";
  return (
    <div style={{ ...FRAME, width: 360, padding: 10, color: "#0f172a" }}>
      <canvas ref={canvasRef} width={MAG.size} height={MAG.size} style={{ display: "block", maxWidth: "100%", margin: "0 auto", borderRadius: 8 }} />
      {hasCurrent && (
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 8, fontSize: 13 }}>
          <label style={{ flex: 1 }}>I = {Number(fig.I.toPrecision(3))} A
            <input type="range" min={0.1} max={3} step={0.1} value={scale} onChange={(e) => setScale(Number(e.target.value))} style={{ width: "100%" }} />
          </label>
          <button type="button" onClick={() => setReversed((r) => !r)} style={{ border: "1px solid #cbd5e1", borderRadius: 8, padding: "4px 8px" }}>Reverse current</button>
        </div>
      )}
      <table style={{ marginTop: 6, fontSize: 13 }}><tbody>
        {facts.map(([label, value]) => <tr key={label}><td>{label}</td><td style={{ paddingLeft: 10 }}><strong>{value}</strong></td></tr>)}
      </tbody></table>
      <p className="text-xs eai-muted" style={{ marginTop: 4 }}>
        Cross-section: • current out of the page, × into it. Field lines computed from the currents; values from the exercise.
      </p>
    </div>
  );
}

/* A DC motor seen end-on (textbook 3.2): the coil turns between N and S; the forces on its
   two sides make a couple, τ = N B I S sin α; the commutator reverses the current each time
   the coil's plane is perpendicular to B, so it keeps turning the same way. */
function MotorFigure({ fig }) {
  const canvasRef = useRef(null);
  const [running, setRunning] = useState(true);
  const [alphaDeg, setAlphaDeg] = useState(0);
  const angle = useRef(0.4);

  useEffect(() => {
    let raf = 0, last = performance.now();
    const S = MAG.size, cx = S / 2, cy = S / 2, arm = 72;
    const draw = (now) => {
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (running) angle.current = (angle.current + dt * 1.4) % (2 * Math.PI);
      const theta = angle.current;                      // the coil line, from the horizontal
      ctx.clearRect(0, 0, S, S); ctx.fillStyle = "#f8fafc"; ctx.fillRect(0, 0, S, S);
      // the poles and the field between them, N to S
      ctx.fillStyle = "#ef4444"; ctx.fillRect(0, cy - 90, 46, 180);
      ctx.fillStyle = "#3b82f6"; ctx.fillRect(S - 46, cy - 90, 46, 180);
      ctx.fillStyle = "#fff"; ctx.font = "bold 22px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("N", 23, cy); ctx.fillText("S", S - 23, cy);
      ctx.strokeStyle = "#bfdbfe"; ctx.lineWidth = 1.2;
      for (const dy of [-70, -35, 0, 35, 70]) { ctx.beginPath(); ctx.moveTo(48, cy + dy); ctx.lineTo(S - 48, cy + dy); ctx.stroke(); }
      ctx.fillStyle = "#93c5fd"; ctx.font = "bold 13px sans-serif"; ctx.fillText("B →", S / 2, cy - 100);
      // the coil: side 1 and side 2 at the ends of its line; the commutator sends the current
      // out of the page in whichever side is on the right, so the couple always turns it the same way
      const ends = [1, -1].map((k) => ({ x: cx + k * arm * Math.cos(theta), y: cy - k * arm * Math.sin(theta) }));
      ctx.strokeStyle = "#475569"; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(ends[0].x, ends[0].y); ctx.lineTo(ends[1].x, ends[1].y); ctx.stroke();
      ctx.fillStyle = "#0f172a"; ctx.beginPath(); ctx.arc(cx, cy, 4, 0, 2 * Math.PI); ctx.fill();
      const lever = Math.abs(Math.cos(theta));          // sin α: α between B and the coil's normal
      for (const end of ends) {
        const out = end.x > cx;
        ctx.fillStyle = "#fff"; ctx.strokeStyle = "#b45309"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(end.x, end.y, 11, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#b45309"; ctx.font = "bold 15px sans-serif"; ctx.fillText(out ? "•" : "×", end.x, end.y + 1);
        const dir = out ? -1 : 1;                       // out × B(right) = up on the canvas
        ctx.strokeStyle = "#dc2626"; ctx.lineWidth = 3; ctx.beginPath();
        ctx.moveTo(end.x, end.y + dir * 13); ctx.lineTo(end.x, end.y + dir * 52); ctx.stroke();
        ctx.fillStyle = "#dc2626"; ctx.beginPath();
        ctx.moveTo(end.x, end.y + dir * 60); ctx.lineTo(end.x - 6, end.y + dir * 49); ctx.lineTo(end.x + 6, end.y + dir * 49); ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = "#dc2626"; ctx.font = "bold 13px sans-serif"; ctx.fillText("F", ends[0].x + 18, ends[0].y - 30);
      setAlphaDeg(Math.round((Math.asin(Math.min(1, lever)) * 180) / Math.PI)); // React skips unchanged values
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [running]);

  const facts = magnetFacts(fig);
  const torque = motorTorque(fig, (alphaDeg * Math.PI) / 180);
  return (
    <div style={{ ...FRAME, width: 360, padding: 10, color: "#0f172a" }}>
      <canvas ref={canvasRef} width={MAG.size} height={MAG.size} style={{ display: "block", maxWidth: "100%", margin: "0 auto", borderRadius: 8 }} />
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 8, fontSize: 13 }}>
        <div style={{ flex: 1 }}>α = {alphaDeg}° · τ = N B I S sin α = <strong>{sig(torque)} N·m</strong></div>
        <button type="button" onClick={() => setRunning((r) => !r)} style={{ border: "1px solid #cbd5e1", borderRadius: 8, padding: "4px 8px" }}>{running ? "Pause" : "Play"}</button>
      </div>
      <table style={{ marginTop: 6, fontSize: 13 }}><tbody>
        {facts.map(([label, value]) => <tr key={label}><td>{label}</td><td style={{ paddingLeft: 10 }}><strong>{value}</strong></td></tr>)}
      </tbody></table>
      <p className="text-xs eai-muted" style={{ marginTop: 4 }}>
        The coil seen end-on: • current out of the page, × into it. The commutator reverses the current each half turn, so the coil keeps turning.
      </p>
    </div>
  );
}

