/* The AI Coach's chat history, as screens: the list of past chats (search, Today / Yesterday / Earlier groups, rename and
   delete), shown beside the chat on a wide screen (HistoryRail) and as a sheet on a phone or tablet (HistorySheet).
   Pure presentation, like MobileNav.jsx: the chats and the actions come in as props and nothing is imported back from App.jsx.
   What a chat is and how it is saved is in coachHistory.js. */
import { RomdoulSprig } from "./Romdoul.jsx";
import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { History, Plus, Search, X, MoreHorizontal, Pencil, Trash2, MessageSquare, PanelLeftClose } from "lucide-react";
import { groupChats, searchChats, formatWhen } from "./coachHistory.js";

const GROUP_KEY = { today: "histToday", yesterday: "histYesterday", week: "histWeek", earlier: "histEarlier" };
const kmc = (lang) => (lang === "km" ? "eai-km" : "");

/* true while the screen matches the media query (a phone turning sideways, a window being resized). */
export function useMediaQuery(query) {
  const read = () => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(query).matches;
  const [matches, setMatches] = useState(read);
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return undefined;
    const list = window.matchMedia(query);
    const update = () => setMatches(list.matches);
    update();
    if (list.addEventListener) list.addEventListener("change", update); else list.addListener(update);
    return () => { if (list.removeEventListener) list.removeEventListener("change", update); else list.removeListener(update); };
  }, [query]);
  return matches;
}

/* The "History" button in the Coach's header: opens the sheet on a phone, shows or hides the side list on a wide screen. */
export function HistoryToggle({ pressed, wide, onClick, T, lang }) {
  const label = wide ? T(pressed ? "histHide" : "histShow") : T("histTitle");
  return (
    <button type="button" onClick={onClick} className="eai-hist-toggle eai-focus" aria-label={label} title={label}
      {...(wide ? { "aria-pressed": pressed } : { "aria-haspopup": "dialog", "aria-expanded": pressed })}>
      <History size={17} />
      {/* Icon only on a phone: the header has to fit the title and New chat beside it (the button keeps its name for screen readers). */}
      <span className={`text-sm font-semibold max-[479px]:hidden ${kmc(lang)}`}>{T("histButton")}</span>
    </button>
  );
}

export function NewChatButton({ onClick, T, lang, className = "" }) {
  return (
    <button type="button" onClick={onClick} className={`eai-hist-toggle eai-focus ${className}`} aria-label={T("histNew")} title={T("histNew")}>
      <Plus size={17} />
      <span className={`text-sm font-semibold max-[340px]:hidden ${kmc(lang)}`}>{T("histNew")}</span>
    </button>
  );
}

/* One chat in the list. Tapping it opens the chat; the "..." button reveals Rename and Delete underneath (a row of words,
   not a floating menu, so it works the same with a finger, a mouse and a keyboard). Delete asks first. */
function HistoryRow({ chat, active, now, modeInfo, lang, T, state, setState, onSelect, onRename, onDelete }) {
  const km = kmc(lang);
  const info = modeInfo[chat.mode];
  const Icon = info?.Icon ?? MessageSquare;
  const title = chat.title || T("histUntitled");
  const [draft, setDraft] = useState(title);
  const mine = state?.id === chat.id ? state.kind : null;
  const stop = () => setState(null);
  const commit = () => {
    const name = draft.trim();
    if (name && name !== title) onRename(chat.id, name);
    stop();
  };

  if (mine === "rename") {
    return (
      <li>
        <form className="eai-hist-row on" onSubmit={(e) => { e.preventDefault(); commit(); }} style={{ padding: 8, gap: 8, flexWrap: "wrap" }}>
          <input className={`eai-hist-input ${km}`} style={{ padding: "8px 12px", flex: "1 1 100%" }} value={draft} maxLength={80} autoFocus
            aria-label={T("histRenameLabel")} onChange={(e) => setDraft(e.target.value)} onFocus={(e) => e.target.select()}
            onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); stop(); } }} />
          <button type="submit" className={`eai-hist-chip primary eai-focus ${km}`}>{T("histSave")}</button>
          <button type="button" className={`eai-hist-chip eai-focus ${km}`} onClick={stop}>{T("histCancel")}</button>
        </form>
      </li>
    );
  }
  return (
    <li>
      <div className={`eai-hist-row${active ? " on" : ""}`}>
        <button type="button" className="eai-hist-main eai-focus" onClick={() => onSelect(chat.id)} aria-current={active ? "true" : undefined}>
          <span className="eai-hist-icon" aria-hidden="true"><Icon size={15} /></span>
          <span className="min-w-0 flex-1">
            <span className={`eai-hist-title ${km}`} dir="auto">{title}</span>
            <span className={`eai-hist-meta ${km}`}>{[info?.label, formatWhen(chat.updatedAt, now, lang)].filter(Boolean).join(" · ")}</span>
          </span>
        </button>
        <button type="button" className="eai-hist-more eai-focus" data-more={chat.id} aria-label={T("histMore", { title })}
          aria-expanded={mine !== null} onClick={() => setState(mine ? null : { id: chat.id, kind: "menu" })}>
          <MoreHorizontal size={17} />
        </button>
      </div>
      {mine === "menu" && (
        <div className="eai-hist-actions">
          <button type="button" className={`eai-hist-chip eai-focus ${km}`} onClick={() => { setDraft(title); setState({ id: chat.id, kind: "rename" }); }}>
            <Pencil size={13} /> {T("histRename")}
          </button>
          <button type="button" className={`eai-hist-chip danger eai-focus ${km}`} onClick={() => setState({ id: chat.id, kind: "delete" })}>
            <Trash2 size={13} /> {T("histDelete")}
          </button>
        </div>
      )}
      {mine === "delete" && (
        <div className="eai-hist-actions" role="group" aria-label={T("histDeleteAsk")}>
          <span className={`text-[13px] font-semibold ${km}`}>{T("histDeleteAsk")}</span>
          <button type="button" className={`eai-hist-chip danger solid eai-focus ${km}`} onClick={() => { onDelete(chat.id); stop(); }}>{T("histDelete")}</button>
          <button type="button" className={`eai-hist-chip eai-focus ${km}`} autoFocus onClick={stop}>{T("histCancel")}</button>
        </div>
      )}
    </li>
  );
}

/* Everything inside the panel: New chat, search, the grouped list, and the footer. The same in the rail and the sheet. */
function HistoryList({ chats, activeId, modeInfo, lang, T, onSelect, onNew, onRename, onDelete, onClearAll }) {
  const km = kmc(lang);
  const uid = useId();
  const listRef = useRef(null);
  const [query, setQuery] = useState("");
  const [row, setRow] = useState(null);           // { id, kind: "menu" | "rename" | "delete" }: the row showing its actions
  const [confirmAll, setConfirmAll] = useState(false);
  const now = useMemo(() => Date.now(), [chats]); // eslint-disable-line react-hooks/exhaustive-deps
  const found = useMemo(() => searchChats(chats, query), [chats, query]);
  const groups = useMemo(() => groupChats(found, now), [found, now]);
  const searching = query.trim() !== "";

  // After a row closes its rename box or its question, put the keyboard back on that row's "..." button.
  const wasOpen = useRef(null);
  useEffect(() => {
    if (row === null && wasOpen.current) {
      const id = wasOpen.current;
      wasOpen.current = null;
      const button = [...(listRef.current?.querySelectorAll("[data-more]") ?? [])].find((b) => b.dataset.more === id);
      if (button && document.activeElement === document.body) button.focus();
    }
    if (row) wasOpen.current = row.id;
  }, [row]);

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <div className="px-3 pt-1">
        <button type="button" onClick={onNew} className="eai-hist-new eai-focus">
          <Plus size={17} /> <span className={km}>{T("histNew")}</span>
        </button>
      </div>
      {chats.length > 0 && (
        <div className="eai-hist-search">
          <Search size={15} className="eai-hist-search-icon" aria-hidden="true" />
          <input type="search" className={`eai-hist-input ${km}`} value={query} placeholder={T("histSearch")} aria-label={T("histSearch")}
            enterKeyHint="search" autoComplete="off" autoCorrect="off" spellCheck={false}
            onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Escape" && query) { e.stopPropagation(); setQuery(""); } }} />
          {query && (
            <button type="button" className="eai-hist-search-clear eai-focus" aria-label={T("histSearchClear")} onClick={() => setQuery("")}><X size={14} /></button>
          )}
        </div>
      )}

      <div ref={listRef} className="eai-hist-scroll eai-scroll">
        {chats.length === 0 ? (
          <div className="eai-hist-empty">
            <RomdoulSprig size={36} />
            <span className="eai-hist-empty-icon" aria-hidden="true"><MessageSquare size={20} /></span>
            <p className={`font-semibold text-sm ${km}`}>{T("histEmptyTitle")}</p>
            <p className={`eai-muted text-[13px] ${km}`}>{T("histEmptyBody")}</p>
          </div>
        ) : groups.length === 0 ? (
          <p className={`eai-hist-empty eai-muted text-[13px] ${km}`} role="status">{T("histNoMatch", { q: query.trim() })}</p>
        ) : groups.map((g) => (
          <section key={g.id} aria-labelledby={`${uid}-${g.id}`}>
            <h3 id={`${uid}-${g.id}`} className={`eai-hist-group ${km}`}>{T(GROUP_KEY[g.id])}</h3>
            <ul aria-label={T("histList")} className="space-y-0.5">
              {g.items.map((chat) => (
                <HistoryRow key={chat.id} chat={chat} active={chat.id === activeId} now={now} modeInfo={modeInfo} lang={lang} T={T}
                  state={row} setState={setRow} onSelect={onSelect} onRename={onRename} onDelete={onDelete} />
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div className="eai-hist-foot">
        <p className={`text-[12px] eai-muted ${km}`}>{T("histDeviceOnly")}</p>
        {chats.length > 0 && !searching && (confirmAll ? (
          <div className="flex items-center gap-2 flex-wrap" role="group" aria-label={T("histClearAsk")}>
            <span className={`text-[13px] font-semibold ${km}`}>{T("histClearAsk")}</span>
            <button type="button" className={`eai-hist-chip danger solid eai-focus ${km}`} onClick={() => { setConfirmAll(false); onClearAll(); }}>{T("histClearYes")}</button>
            <button type="button" className={`eai-hist-chip eai-focus ${km}`} autoFocus onClick={() => setConfirmAll(false)}>{T("histCancel")}</button>
          </div>
        ) : (
          <button type="button" className={`eai-hist-clear eai-focus ${km}`} onClick={() => setConfirmAll(true)}>{T("histClearAll")}</button>
        ))}
      </div>
    </div>
  );
}

/* The list beside the chat, on a wide screen. Hidden with its own button, or the "History" one in the header. */
export function HistoryRail({ onHide, T, lang, ...list }) {
  return (
    <aside className="eai-hist-rail" aria-label={T("histTitle")}>
      <div className="eai-hist-head">
        <h2 className={`eai-display text-base font-extrabold ${kmc(lang)}`}>{T("histTitle")}</h2>
        <button type="button" onClick={onHide} className="eai-icon-btn eai-focus" aria-label={T("histHide")} title={T("histHide")}><PanelLeftClose size={18} /></button>
      </div>
      <HistoryList T={T} lang={lang} {...list} />
    </aside>
  );
}

/* A modal dialog like the "More" sheet: the backdrop, the close button and Escape close it, Tab stays inside it, the page
   behind does not scroll, and the keyboard goes back to the button that opened it. */
function useDialog(ref, onClose) {
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const opener = document.activeElement;
    const el = ref.current;
    el?.querySelector("[data-autofocus]")?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") { close.current(); return; }
      if (e.key !== "Tab" || !el) return;
      const items = [...el.querySelectorAll("button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex='-1'])")].filter((i) => i.offsetParent !== null);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, [ref]);
}

/* The list as a sheet: up from the bottom on a phone (the thumb's end of the screen), in from the left on a tablet. Only
   mounted while open, so the search box starts empty each time. */
export function HistorySheet({ onClose, T, lang, ...list }) {
  const ref = useRef(null);
  const stable = useCallback(() => onClose(), [onClose]);
  useDialog(ref, stable);
  // Drawn at the top of the app (the element that carries the theme), not where the Coach is: the Coach's page slides in with
  // a CSS transform, and a transformed parent makes `position: fixed` mean "inside me" instead of "the whole screen".
  const host = typeof document === "undefined" ? null : document.querySelector(".eai-root") ?? document.body;
  const sheet = (
    <>
      <div className="eai-hist-backdrop" onClick={onClose} aria-hidden="true" />
      <div ref={ref} role="dialog" aria-modal="true" aria-label={T("histTitle")} className="eai-hist-sheet">
        <div className="eai-hist-grip" aria-hidden="true" />
        <div className="eai-hist-head">
          <h2 className={`eai-display text-lg font-extrabold ${kmc(lang)}`}>{T("histTitle")}</h2>
          <button type="button" data-autofocus onClick={onClose} className="eai-focus grid place-items-center rounded-full" aria-label={T("histClose")}
            style={{ width: 36, height: 36, background: "var(--bg-soft)", color: "var(--ink)" }}><X size={18} /></button>
        </div>
        <HistoryList T={T} lang={lang} {...list} />
      </div>
    </>
  );
  return host ? createPortal(sheet, host) : sheet;
}
