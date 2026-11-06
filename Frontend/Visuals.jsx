/* The ```circuit, ```phet, ```molecule and ```compound figures (logic and limits in visuals.js). */
import React, { useEffect, useRef, useState } from "react";
import { falstadUrl, parseCircuit, phetSim, PHET_CREDIT, molecule, MOLECULE_SCRIPT, compound, formulaText } from "./visuals.js";

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
