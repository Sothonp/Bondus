/* The screens for plans and the daily limit on AI questions: the "N left today" strip above the coach, and the admin's page for
   switching a student's plan on after they have paid. Pure presentation, like ExerciseUi.jsx: the api client, the translators
   (`tr(key)`, `trf(key, vars)`) and the language come from App.jsx and nothing is imported back from it. The rules (who may
   ask, what counts) are in aiQuota.js; the counting itself is on the backend. */
import React, { useEffect, useRef, useState } from "react";
import { CheckCircle2, AlertTriangle, Search, Upload } from "lucide-react";

const kmc = (lang) => (lang === "km" ? "eai-km" : "");

/* The names a student sees for the paid plans (the pricing page's own labels). */
export const PLAN_NAMES = { free: "Free", standard: "VIP Bondus", premium: "Super Bondus" };

/* A thin strip above the coach: how many AI questions are left today, with an Upgrade button while a better plan exists. */
export function UsageStrip({ text, left, limit, exhausted, unlimited = false, onUpgrade, upgradeLabel, lang = "en" }) {
  const share = limit > 0 ? Math.min(1, Math.max(0, left / limit)) : 0;
  return (
    <div className={`flex items-center gap-3 pb-2 text-xs ${kmc(lang)}`} role="status">
      <span className="font-semibold" style={{ color: exhausted ? "var(--ember)" : "var(--muted)" }}>{text}</span>
      {/* An admin's own "limit" is a real, large number, not a true cap -- a bar nearly full of it would read as
          "almost out", the opposite of what "unlimited" means, so there is no bar at all once that's true. */}
      {!unlimited && (
        <span aria-hidden="true" className="h-1.5 rounded-full overflow-hidden flex-shrink-0" style={{ width: 72, background: "var(--bg-soft)" }}>
          <span className="block h-full rounded-full" style={{ width: `${share * 100}%`, background: exhausted ? "var(--ember)" : "var(--primary)", transition: "width .2s ease" }} />
        </span>
      )}
      {onUpgrade && (
        <button type="button" onClick={onUpgrade} className="eai-focus font-bold rounded-full px-2.5 py-1" style={{ background: "var(--gold-soft)", color: "var(--gold)" }}>
          {upgradeLabel}
        </button>
      )}
    </div>
  );
}

const dateText = (iso, lang) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString(lang === "km" ? "km-KH" : "en-GB", { day: "numeric", month: "short", year: "numeric" });
};

const MONTH_CHOICES = [1, 3, 6, 12];

const QR_MAX_BYTES = 2 * 1024 * 1024; // the backend refuses more (config bondus.payment_qr)
const QR_TYPES = /^image\/(jpeg|png|webp)$/;

/* Admin: the QR code students pay a plan with. Shows the current picture; uploading a new one replaces it for everyone, and
   "use the original" goes back to the one that came with the app. */
export function PaymentQrAdmin({ api, lang = "en", tr }) {
  const [info, setInfo] = useState(undefined); // undefined while loading, null if it could not be read, else { qrUrl, isCustom }
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // { ok, key }
  const fileRef = useRef(null);

  useEffect(() => {
    let alive = true;
    api.getPayment().then((res) => { if (alive) setInfo(res); }).catch(() => { if (alive) setInfo(null); });
    return () => { alive = false; };
  }, [api]);

  const run = async (job) => {
    setBusy(true); setMsg(null);
    try { setInfo(await job()); setMsg({ ok: true, key: "adminQrSaved" }); }
    catch { setMsg({ ok: false, key: "adminQrFailed" }); }
    finally { setBusy(false); }
  };
  const pick = (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // so choosing the same file again still fires
    if (!file) return;
    if (!QR_TYPES.test(file.type)) { setMsg({ ok: false, key: "adminQrNotImage" }); return; }
    if (file.size > QR_MAX_BYTES) { setMsg({ ok: false, key: "adminQrTooBig" }); return; }
    run(() => api.uploadPaymentQr(file));
  };

  return (
    <section className="eai-card space-y-3" aria-labelledby="admin-qr-title">
      <div>
        <h3 id="admin-qr-title" className={`font-bold ${kmc(lang)}`}>{tr("adminQrTitle")}</h3>
        <p className={`text-sm eai-muted mt-1 ${kmc(lang)}`}>{tr("adminQrDesc")}</p>
      </div>
      <div className="flex gap-4 items-start flex-wrap">
        {info?.qrUrl
          ? <img src={info.qrUrl} alt={tr("planPayQrAlt")} className="rounded-xl border" style={{ width: 150, background: "#fff", borderColor: "var(--line)" }} />
          : <p className={`text-sm eai-muted ${kmc(lang)}`}>{info === undefined ? tr("planPayQrLoading") : tr("adminQrNone")}</p>}
        <div className="space-y-2 min-w-0">
          {info && <p className={`text-xs eai-muted ${kmc(lang)}`}>{info.isCustom ? tr("adminQrCustom") : tr("adminQrShipped")}</p>}
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={pick} className="sr-only" tabIndex={-1} aria-hidden="true" />
          <div className="flex gap-2 flex-wrap items-center">
            <button type="button" disabled={busy} onClick={() => fileRef.current?.click()} className={`eai-btn eai-focus px-3.5 py-2.5 text-sm flex items-center gap-2 ${kmc(lang)}`}
              style={{ background: "var(--primary)", color: "#fff", opacity: busy ? 0.6 : 1 }}>
              <Upload size={15} aria-hidden="true" /> {busy ? tr("adminQrUploading") : tr("adminQrUpload")}
            </button>
            {info?.isCustom && (
              <button type="button" disabled={busy} onClick={() => run(() => api.resetPaymentQr())} className={`eai-focus text-sm font-semibold px-2 py-2.5 ${kmc(lang)}`} style={{ color: "var(--primary)", opacity: busy ? 0.6 : 1 }}>
                {tr("adminQrReset")}
              </button>
            )}
          </div>
          {msg && (
            <p className={`text-xs flex items-center gap-1 ${kmc(lang)}`} style={{ color: msg.ok ? "var(--jade)" : "var(--ember)" }} role={msg.ok ? "status" : "alert"}>
              {msg.ok ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />} {tr(msg.key)}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

/* Admin: the students on a paid plan (or whoever the search finds), each with buttons to switch a plan on for N months. */
export function AdminPlans({ api, lang = "en", tr, trf }) {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [months, setMonths] = useState(1);
  const [busyId, setBusyId] = useState(null);
  const [flash, setFlash] = useState({}); // student id -> "saved" | "error"
  const query = q.trim();
  const searching = query.length >= 2;

  useEffect(() => {
    let alive = true;
    setLoading(true); setFailed(false);
    // A moment after the last key, so typing a name is one request and not one per letter.
    const timer = setTimeout(() => {
      api.getAdminUsers(searching ? query : "")
        .then((res) => { if (alive) setRows(res.users); })
        .catch(() => { if (alive) { setRows([]); setFailed(true); } })
        .finally(() => { if (alive) setLoading(false); });
    }, searching ? 300 : 0);
    return () => { alive = false; clearTimeout(timer); };
  }, [api, query, searching]);

  const change = async (row, plan, extra = {}) => {
    setBusyId(row.id);
    setFlash((f) => ({ ...f, [row.id]: undefined }));
    try {
      const res = await api.setUserPlan(row.id, { plan, ...extra });
      setRows((list) => list.map((r) => (r.id === row.id ? res.user : r)));
      setFlash((f) => ({ ...f, [row.id]: "saved" }));
    } catch {
      setFlash((f) => ({ ...f, [row.id]: "error" }));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5 eai-rise">
      <div>
        <h2 className={`eai-display text-2xl font-extrabold ${kmc(lang)}`}>{tr("adminPlansTitle")}</h2>
        <p className={`eai-muted text-sm mt-1 ${kmc(lang)}`}>{tr("adminPlansDesc")}</p>
      </div>

      <PaymentQrAdmin api={api} lang={lang} tr={tr} />

      <div className="flex gap-3 flex-wrap items-end">
        <label className="flex-1 min-w-[220px]">
          <span className="sr-only">{tr("adminPlansSearch")}</span>
          <span className="flex items-center gap-2 px-3 rounded-xl border" style={{ background: "var(--card)", borderColor: "var(--line)" }}>
            <Search size={16} className="eai-muted" aria-hidden="true" />
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr("adminPlansSearch")}
              className={`eai-focus w-full py-3 bg-transparent text-sm outline-none ${kmc(lang)}`} style={{ color: "var(--ink)" }} />
          </span>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <span className={`eai-muted ${kmc(lang)}`}>{tr("adminPlansMonths")}</span>
          <select value={months} onChange={(e) => setMonths(Number(e.target.value))} className="eai-focus rounded-xl border px-3 py-3 text-sm" style={{ background: "var(--card)", borderColor: "var(--line)", color: "var(--ink)" }}>
            {MONTH_CHOICES.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
      </div>

      <h3 className={`text-sm font-bold ${kmc(lang)}`}>{searching ? tr("adminPlansResults") : tr("adminPlansPaidList")}</h3>

      {loading ? <p className={`text-sm eai-muted ${kmc(lang)}`}>{tr("adminPlansLoading")}</p>
        : failed ? <p className={`text-sm flex items-center gap-2 ${kmc(lang)}`} style={{ color: "var(--ember)" }} role="alert"><AlertTriangle size={14} /> {tr("adminPlansLoadError")}</p>
        : rows.length === 0 ? <div className="eai-card text-center"><p className={`text-sm eai-muted ${kmc(lang)}`}>{tr("adminPlansNone")}</p></div>
        : (
          <ul className="space-y-3">
            {rows.map((row) => {
              const busy = busyId === row.id;
              return (
                <li key={row.id} className="eai-card space-y-3">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{row.name}</p>
                      <p className="text-xs eai-muted truncate">{[row.email, row.phone].filter(Boolean).join(" · ")}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: row.plan === "free" ? "var(--bg-soft)" : "var(--gold)", color: row.plan === "free" ? "var(--ink)" : "#fff" }}>{PLAN_NAMES[row.plan] ?? row.plan}</span>
                      <p className={`text-xs eai-muted mt-1 ${kmc(lang)}`}>
                        {row.plan === "free" ? "" : row.planExpiresAt ? trf("planEndsOn", { date: dateText(row.planExpiresAt, lang) }) : tr("adminPlansNoEnd")}
                      </p>
                    </div>
                  </div>
                  <p className={`text-xs eai-muted ${kmc(lang)}`}>{trf("adminPlansUsed", { used: row.aiUsedToday, limit: row.aiLimit })}</p>
                  <div className="flex gap-2 flex-wrap items-center">
                    {["standard", "premium"].map((id) => (
                      <button key={id} type="button" disabled={busy} onClick={() => change(row, id, { months })}
                        className={`eai-btn eai-focus px-3.5 py-2.5 text-sm ${kmc(lang)}`}
                        style={{ background: id === "premium" ? "var(--gold)" : "var(--card)", color: id === "premium" ? "#fff" : "var(--ink)", border: id === "premium" ? "none" : "1px solid var(--line)", opacity: busy ? 0.6 : 1 }}>
                        {trf("adminPlansSet", { plan: PLAN_NAMES[id] })}
                      </button>
                    ))}
                    {row.plan !== "free" && (
                      <button type="button" disabled={busy} onClick={() => change(row, "free")} className={`eai-focus text-sm font-semibold px-2 py-2.5 ${kmc(lang)}`} style={{ color: "var(--primary)", opacity: busy ? 0.6 : 1 }}>
                        {tr("adminPlansSetFree")}
                      </button>
                    )}
                    {flash[row.id] === "saved" && <span className={`text-xs flex items-center gap-1 ${kmc(lang)}`} style={{ color: "var(--jade)" }} role="status"><CheckCircle2 size={14} /> {tr("adminPlansSaved")}</span>}
                    {flash[row.id] === "error" && <span className={`text-xs flex items-center gap-1 ${kmc(lang)}`} style={{ color: "var(--ember)" }} role="alert"><AlertTriangle size={14} /> {tr("adminPlansSaveError")}</span>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
    </div>
  );
}
