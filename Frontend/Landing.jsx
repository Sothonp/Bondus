import { useEffect, useRef, useState } from "react";
import {
  Award, Bell, Brain, Check, ChevronDown, ClipboardCheck, Facebook, Flame, GraduationCap, Languages, Mail,
  Music2, Search, Send, Target, TrendingUp, Youtube,
} from "lucide-react";
import { landingText, fillLanding } from "./landingStrings.js";
import { NAV_SECTIONS, contactEmail, countProgress, formatCount, practiceQuestionStat, socialLinks, toKhmerDigits } from "./landing.js";

/* Everything on the landing page below the top fold, plus the sticky navigation bar, the "scroll to explore" cue and the footer.
   The top fold itself (mascot, headline, buttons, subject ribbon) stays in Welcome in App.jsx; this file only adds the parts a
   visitor scrolls into. Styles are the .eai-lp* rules in landingStyles.js; words are in landingStrings.js (Khmer too).

   Nothing here is invented: the demo screens are labelled "sample", the practice-question number is the real size of the
   question bank rounded down, and the footer's social icons and contact address appear only when they are configured. */

const ENV = (typeof import.meta !== "undefined" && import.meta.env) || {};

/* True when the visitor's device asks for less motion. Counters, reveals and demos then show their final state at once. */
function usePrefersReducedMotion() {
  const [reduce, setReduce] = useState(() => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return undefined;
    const on = () => setReduce(mq.matches);
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return reduce;
}

/* True once the element has been on screen (and stays true). Without IntersectionObserver everything simply shows. */
function useInView(ref) {
  const [seen, setSeen] = useState(() => typeof IntersectionObserver === "undefined");
  useEffect(() => {
    if (seen || !ref.current) return undefined;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { setSeen(true); io.disconnect(); }
    }, { rootMargin: "0px 0px -8% 0px" });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [seen, ref]);
  return seen;
}

export function scrollToSection(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
}

/* A link to a section of this page: a real #anchor (so it can be copied or opened in a new tab) that scrolls smoothly in place
   instead of changing the address. */
function SectionLink({ id, className, children }) {
  return (
    <a href={`#${id}`} className={className} onClick={(e) => { e.preventDefault(); scrollToSection(id); }}>{children}</a>
  );
}

function Reveal({ children, className = "", delay = 0, as: Tag = "div", style, ...rest }) {
  const ref = useRef(null);
  const seen = useInView(ref);
  return (
    <Tag ref={ref} className={`eai-reveal ${seen ? "is-in" : ""} ${className}`} style={{ ...style, transitionDelay: seen && delay ? `${delay}ms` : undefined }} {...rest}>
      {children}
    </Tag>
  );
}

/* ── Sticky navigation ───────────────────────────────────────────────────────────────────────────── */

/* The bar across the top: the wordmark on the left, section links in the middle (wide screens), the language/theme chips and a
   Log in link on the right. It is see-through over the hero and fades into a blurred, bordered bar once the page scrolls, and the
   link for the section being read is highlighted. `brand` and `controls` come from Welcome (they use App.jsx's own pieces). */
export function LandingNav({ lang, brand, controls, onLogin }) {
  const km = lang === "km";
  const [stuck, setStuck] = useState(false);
  const [active, setActive] = useState("");
  const text = (k) => landingText(lang, k);

  useEffect(() => {
    const on = () => setStuck(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return undefined;
    const visible = new Set();
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) (e.isIntersecting ? visible.add(e.target.id) : visible.delete(e.target.id));
      setActive(NAV_SECTIONS.find((id) => visible.has(id)) || "");
    }, { rootMargin: "-40% 0px -55% 0px" });
    for (const id of NAV_SECTIONS) { const el = document.getElementById(id); if (el) io.observe(el); }
    return () => io.disconnect();
  }, []);

  return (
    <header className={`eai-lpnav ${stuck ? "is-stuck" : ""}`}>
      <div className="eai-lpnav-in">
        <a href="#top" className="eai-lpnav-brand eai-focus" aria-label={text("navHome")}
          onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); }}>
          {brand}
        </a>
        <nav className="eai-lpnav-links" aria-label={text("navLabel")}>
          {[["features", "navFeatures"], ["how", "navHow"], ["faq", "navFaq"]].map(([id, key]) => (
            <SectionLink key={id} id={id} className={`eai-lpnav-link eai-focus ${active === id ? "is-active" : ""} ${km ? "eai-km" : ""}`}>{text(key)}</SectionLink>
          ))}
        </nav>
        <div className="eai-lpnav-right">
          <button type="button" onClick={onLogin} className={`eai-lpnav-login eai-focus ${km ? "eai-km" : ""}`}>{text("navLogin")}</button>
          {controls}
        </div>
      </div>
    </header>
  );
}

/* The bouncing "Scroll to explore" cue at the bottom of the top fold. */
export function ScrollCue({ lang }) {
  return (
    <button type="button" className={`eai-lpcue eai-focus ${lang === "km" ? "eai-km" : ""}`} onClick={() => scrollToSection("preview")}>
      <span>{landingText(lang, "scrollCue")}</span>
      <ChevronDown size={20} aria-hidden="true" />
    </button>
  );
}

/* ── Interactive preview ─────────────────────────────────────────────────────────────────────────── */

const TABS = [
  { id: "exam", icon: ClipboardCheck, title: "tabExam", desc: "tabExamDesc" },
  { id: "mentor", icon: Brain, title: "tabMentor", desc: "tabMentorDesc" },
  { id: "uni", icon: GraduationCap, title: "tabUni", desc: "tabUniDesc" },
  { id: "scholar", icon: Award, title: "tabScholar", desc: "tabScholarDesc" },
];

const delay = (s) => ({ "--d": `${s}s` });

function ExamDemo({ lang }) {
  const text = (k) => landingText(lang, k);
  const options = [["A", "0"], ["B", "1"], ["C", "2"], ["D", "½"]].map(([k, v]) => [k, lang === "km" ? toKhmerDigits(v) : v]);
  return (
    <>
      <div className="eai-d" style={delay(0)}>
        <div className="eai-d-row"><b>{text("demoExamSubject")}</b></div>
        <div className="eai-d-sub">{text("demoExamCounter")}</div>
        <div className="eai-d-bar" aria-hidden="true"><i style={{ "--to": "30%", ...delay(0.2) }} /></div>
      </div>
      <div className="eai-d eai-d-card eai-d-q" style={delay(0.15)}>∫₀¹ 2x dx = ?</div>
      {options.map(([k, v], i) => (
        <div key={k} className={`eai-d eai-d-opt ${k === "B" ? "is-right" : ""}`} style={delay(0.3 + i * 0.1)}>
          <span className="eai-d-key">{k}</span><span>{v}</span>
          {k === "B" && <Check size={16} className="eai-d-tick" aria-hidden="true" />}
        </div>
      ))}
      <div className="eai-d eai-d-card eai-d-why" style={delay(1.6)}>
        <b>{text("demoExamCorrect")}</b> {text("demoExamWhy")}
      </div>
      <div className="eai-d" style={delay(1.9)}>
        <div className="eai-d-row"><span className="eai-d-sub">{text("demoExamReady")}</span><b>{lang === "km" ? toKhmerDigits("64%") : "64%"}</b></div>
        <div className="eai-d-bar" aria-hidden="true"><i className="is-jade" style={{ "--to": "64%", ...delay(2.0) }} /></div>
      </div>
    </>
  );
}

function MentorDemo({ lang }) {
  const text = (k) => landingText(lang, k);
  const digit = (n) => (lang === "km" ? toKhmerDigits(n) : String(n));
  return (
    <>
      <div className="eai-d eai-d-bubble eai-d-me" style={delay(0)}>{text("demoAsk")}</div>
      <div className="eai-d-typing" aria-hidden="true"><i /><i /><i /></div>
      <div className="eai-d eai-d-bubble eai-d-ai" style={delay(1.4)}>
        <div className="eai-d-who"><Brain size={14} aria-hidden="true" /> {text("demoMentor")}</div>
        {[1, 2, 3].map((n) => (
          <div key={n} className="eai-d eai-d-step" style={delay(1.8 + (n - 1) * 0.5)}>
            <span className="eai-d-num">{digit(n)}</span><span>{text(`demoStep${n}`)}</span>
          </div>
        ))}
      </div>
      <div className="eai-d eai-d-chip" style={delay(3.4)}><Target size={14} aria-hidden="true" /> {text("demoPractice")}</div>
    </>
  );
}

function UniDemo({ lang, universities }) {
  const text = (k) => landingText(lang, k);
  return (
    <>
      <div className="eai-d eai-d-row" style={delay(0)}><b>{text("demoUniTitle")}</b></div>
      <div className="eai-d eai-d-search" style={delay(0.1)}><Search size={14} aria-hidden="true" /> {text("demoUniSearch")}</div>
      {universities.slice(0, 5).map((u, i) => (
        <div key={u.abbr} className="eai-d eai-d-card eai-d-uni" style={delay(0.25 + i * 0.15)}>
          <span className="eai-d-logo"><img src={u.logo} alt="" loading="lazy" /></span>
          <span className="eai-d-unitext"><b>{u.abbr}</b><small>{lang === "km" ? u.nKm : u.n}</small></span>
        </div>
      ))}
    </>
  );
}

function ScholarDemo({ lang }) {
  const text = (k) => landingText(lang, k);
  return (
    <>
      <div className="eai-d eai-d-row" style={delay(0)}><b>{text("demoSchTitle")}</b></div>
      {["demoSch1", "demoSch2", "demoSch3"].map((k, i) => (
        <div key={k} className="eai-d eai-d-card eai-d-sch" style={delay(0.2 + i * 0.2)}>
          <b>{text(k)}</b>
          <span className="eai-d-schrow">
            <span className="eai-d-remind"><Bell size={13} aria-hidden="true" /> {text("demoSchRemind")}</span>
            <em>{text("demoSchTag")}</em>
          </span>
        </div>
      ))}
      <div className="eai-d eai-d-card" style={delay(1.0)}>
        <div className="eai-d-sub">{text("demoSchChecklist")}</div>
        {[0, 1, 2].map((i) => (
          <div key={i} className="eai-d-check" style={delay(1.3 + i * 0.4)}>
            <span className="eai-d-box"><Check size={11} aria-hidden="true" /></span><span className="eai-d-line" />
          </div>
        ))}
      </div>
    </>
  );
}

function PreviewSection({ lang, universities, onCreate, createLabel }) {
  const [tab, setTab] = useState("exam");
  const km = lang === "km";
  const text = (k) => landingText(lang, k);
  const current = TABS.find((x) => x.id === tab);

  const onKey = (e) => {
    const i = TABS.findIndex((x) => x.id === tab);
    let next = i;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") next = (i + 1) % TABS.length;
    else if (e.key === "ArrowUp" || e.key === "ArrowLeft") next = (i - 1 + TABS.length) % TABS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = TABS.length - 1;
    else return;
    e.preventDefault();
    setTab(TABS[next].id);
    document.getElementById(`eai-lp-tab-${TABS[next].id}`)?.focus();
  };

  return (
    <section id="preview" className="eai-lpsec">
      <div className="eai-lpwrap">
        <Reveal>
          <h2 className={`eai-lph2 ${km ? "eai-km" : ""}`}>{text("previewTitle")}</h2>
          <p className={`eai-lpsub ${km ? "eai-km" : ""}`}>{text("previewSub")}</p>
        </Reveal>

        <Reveal className="eai-lpprev" delay={80}>
          <div className="eai-lpprev-side">
            <div className="eai-lp-tabs" role="tablist" aria-label={text("previewTabs")} onKeyDown={onKey}>
              {TABS.map(({ id, icon: Icon, title, desc }) => (
                <button key={id} type="button" role="tab" id={`eai-lp-tab-${id}`} aria-selected={tab === id} aria-controls="eai-lp-panel"
                  tabIndex={tab === id ? 0 : -1} onClick={() => setTab(id)} className={`eai-lp-tab eai-focus ${km ? "eai-km" : ""}`}>
                  <span className="eai-lp-tabicon"><Icon size={18} aria-hidden="true" /></span>
                  <span className="eai-lp-tabtext"><span>{text(title)}</span><span className="eai-lp-tab-desc">{text(desc)}</span></span>
                </button>
              ))}
            </div>
            <p className={`eai-lp-tabdesc ${km ? "eai-km" : ""}`}>{text(current.desc)}</p>
            <button type="button" onClick={onCreate} className={`eai-lp-btn eai-lp-btn-primary eai-lp-prevcta eai-focus ${km ? "eai-km" : ""}`}>{createLabel || text("previewCta")}</button>
          </div>

          <div className="eai-lpprev-phone">
            <div className="eai-lpdevice">
              <div className="eai-lpphone" role="tabpanel" id="eai-lp-panel" aria-labelledby={`eai-lp-tab-${tab}`}>
                <div className={`eai-lpscreen ${km ? "eai-km" : ""}`} key={`${tab}-${lang}`}>
                  {tab === "exam" && <ExamDemo lang={lang} />}
                  {tab === "mentor" && <MentorDemo lang={lang} />}
                  {tab === "uni" && <UniDemo lang={lang} universities={universities} />}
                  {tab === "scholar" && <ScholarDemo lang={lang} />}
                </div>
              </div>
            </div>
            <p className={`eai-lp-note ${km ? "eai-km" : ""}`}>{text("previewNote")}</p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ── Features ────────────────────────────────────────────────────────────────────────────────────── */

const FEATURES = [
  { icon: ClipboardCheck, acc: "var(--lp-link)", title: "featExamTitle", body: "featExamBody" },
  { icon: GraduationCap, acc: "var(--jade)", title: "featUniTitle", body: "featUniBody" },
  { icon: Award, acc: "var(--gold)", title: "featSchTitle", body: "featSchBody" },
  { icon: Languages, acc: "var(--ember)", title: "featLangTitle", body: "featLangBody" },
  { icon: Flame, acc: "var(--gold)", title: "featPlanTitle", body: "featPlanBody" },
  { icon: TrendingUp, acc: "var(--jade)", title: "featReadyTitle", body: "featReadyBody" },
];

function FeaturesSection({ lang }) {
  const km = lang === "km";
  const text = (k) => landingText(lang, k);
  return (
    <section id="features" className="eai-lpsec eai-lpalt">
      <div className="eai-lpwrap">
        <Reveal>
          <h2 className={`eai-lph2 ${km ? "eai-km" : ""}`}>{text("featuresTitle")}</h2>
          <p className={`eai-lpsub ${km ? "eai-km" : ""}`}>{text("featuresSub")}</p>
        </Reveal>
        <ul className="eai-lpfeat">
          {FEATURES.map(({ icon: Icon, acc, title, body }, i) => (
            <Reveal as="li" key={title} className="eai-lpfeat-card" delay={(i % 3) * 90} style={{ "--acc": acc }}>
              <span className="eai-lpfeat-tile"><Icon size={22} aria-hidden="true" /></span>
              <h3 className={km ? "eai-km" : ""}>{text(title)}</h3>
              <p className={km ? "eai-km" : ""}>{text(body)}</p>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ── Stats banner ────────────────────────────────────────────────────────────────────────────────── */

/* Counts from 0 up to `to` the first time it scrolls into view (straight to `to` for reduced motion). The final number is also
   in the page for screen readers, so they never hear the counting. */
function CountUp({ to, lang }) {
  const ref = useRef(null);
  const seen = useInView(ref);
  const reduce = usePrefersReducedMotion();
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!seen) return undefined;
    if (reduce) { setN(to); return undefined; }
    let raf; let start = null;
    const step = (ts) => {
      if (start === null) start = ts;
      const p = countProgress(ts - start, 1400);
      setN(to * p);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [seen, reduce, to]);
  return (
    <span ref={ref}>
      <span aria-hidden="true">{formatCount(n, lang)}+</span>
      <span className="sr-only">{formatCount(to, lang)}+</span>
    </span>
  );
}

function StatsBanner({ lang, questionCount }) {
  const km = lang === "km";
  const text = (k) => landingText(lang, k);
  const questions = practiceQuestionStat(questionCount);
  return (
    <section className="eai-lpstats" aria-label={text("statsLabel")}>
      <div className="eai-lpwrap eai-lpstats-grid">
        {questions > 0 && (
          <Reveal className="eai-lpstat"><b><CountUp to={questions} lang={lang} /></b><span className={km ? "eai-km" : ""}>{text("statQuestions")}</span></Reveal>
        )}
        <Reveal className="eai-lpstat" delay={90}><b className={km ? "eai-km" : ""}>{text("statGradeValue")}</b><span className={km ? "eai-km" : ""}>{text("statGradeLabel")}</span></Reveal>
        <Reveal className="eai-lpstat" delay={180}><b>{text("statAiValue")}</b><span className={km ? "eai-km" : ""}>{text("statAiLabel")}</span></Reveal>
      </div>
    </section>
  );
}

/* ── How it works ────────────────────────────────────────────────────────────────────────────────── */

function HowSection({ lang, onCreate, createLabel }) {
  const km = lang === "km";
  const text = (k) => landingText(lang, k);
  return (
    <section id="how" className="eai-lpsec">
      <div className="eai-lpwrap">
        <Reveal>
          <h2 className={`eai-lph2 ${km ? "eai-km" : ""}`}>{text("howTitle")}</h2>
          <p className={`eai-lpsub ${km ? "eai-km" : ""}`}>{text("howSub")}</p>
        </Reveal>
        <ol className="eai-lphow">
          {[1, 2, 3].map((n) => (
            <Reveal as="li" key={n} className="eai-lphow-step" delay={(n - 1) * 120}>
              <span className="eai-lphow-num" aria-hidden="true">{km ? toKhmerDigits(n) : n}</span>
              <span className={`eai-lphow-label ${km ? "eai-km" : ""}`}>{fillLanding(text("howStepLabel"), { n: km ? toKhmerDigits(n) : n })}</span>
              <h3 className={km ? "eai-km" : ""}>{text(`howStep${n}`)}</h3>
              <p className={km ? "eai-km" : ""}>{text(`howStep${n}Body`)}</p>
            </Reveal>
          ))}
        </ol>
        <div className="eai-lpcenter">
          <button type="button" onClick={onCreate} className={`eai-lp-btn eai-lp-btn-primary eai-lp-cta eai-focus ${km ? "eai-km" : ""}`}>{createLabel}</button>
        </div>
      </div>
    </section>
  );
}

/* ── FAQ ─────────────────────────────────────────────────────────────────────────────────────────── */

function FaqSection({ lang }) {
  const km = lang === "km";
  const text = (k) => landingText(lang, k);
  const [open, setOpen] = useState(1);
  return (
    <section id="faq" className="eai-lpsec eai-lpalt">
      <div className="eai-lpwrap eai-lpfaq-wrap">
        <Reveal>
          <h2 className={`eai-lph2 ${km ? "eai-km" : ""}`}>{text("faqTitle")}</h2>
          <p className={`eai-lpsub ${km ? "eai-km" : ""}`}>{text("faqSub")}</p>
        </Reveal>
        <Reveal className="eai-lpfaq" delay={80}>
          {[1, 2, 3, 4, 5].map((n) => {
            const isOpen = open === n;
            return (
              <div key={n} className={`eai-lpfaq-item ${isOpen ? "is-open" : ""}`}>
                <h3>
                  <button type="button" id={`eai-faq-q${n}`} aria-expanded={isOpen} aria-controls={`eai-faq-a${n}`} onClick={() => setOpen(isOpen ? 0 : n)}
                    className={`eai-lpfaq-q eai-focus ${km ? "eai-km" : ""}`}>
                    <span>{text(`faq${n}Q`)}</span>
                    <ChevronDown size={20} aria-hidden="true" />
                  </button>
                </h3>
                <div className="eai-lpfaq-a" id={`eai-faq-a${n}`} role="region" aria-labelledby={`eai-faq-q${n}`} aria-hidden={!isOpen}>
                  <div><p className={km ? "eai-km" : ""}>{text(`faq${n}A`)}</p></div>
                </div>
              </div>
            );
          })}
        </Reveal>
      </div>
    </section>
  );
}

/* ── Closing call to action + footer ─────────────────────────────────────────────────────────────── */

function ClosingCta({ lang, onCreate, onLogin, createLabel, loginLabel }) {
  const km = lang === "km";
  const text = (k) => landingText(lang, k);
  return (
    <section className="eai-lpsec eai-lpclose">
      <Reveal className="eai-lpwrap eai-lpclose-in">
        <h2 className={`eai-lph2 ${km ? "eai-km" : ""}`}>{text("ctaTitle")}</h2>
        <p className={`eai-lpsub ${km ? "eai-km" : ""}`}>{text("ctaBody")}</p>
        <div className="eai-lpclose-btns">
          <button type="button" onClick={onCreate} className={`eai-lp-btn eai-lp-btn-secondary eai-focus ${km ? "eai-km" : ""}`}>{createLabel}</button>
          <button type="button" onClick={onLogin} className={`eai-lp-btn eai-lp-btn-primary eai-focus ${km ? "eai-km" : ""}`}>{loginLabel}</button>
        </div>
      </Reveal>
    </section>
  );
}

const SOCIAL_ICONS = { facebook: Facebook, telegram: Send, tiktok: Music2, youtube: Youtube };

function Footer({ lang, brand, onCreate, onLogin, createLabel, loginLabel, env }) {
  const km = lang === "km";
  const text = (k) => landingText(lang, k);
  const socials = socialLinks(env);
  const email = contactEmail(env);
  const year = new Date().getFullYear();
  const yearText = km ? toKhmerDigits(year) : String(year);
  const linkBtn = `eai-lpfoot-link eai-focus ${km ? "eai-km" : ""}`;
  return (
    <footer className="eai-lpfoot">
      <div className="eai-lpwrap">
        <div className="eai-lpfoot-grid">
          <div className="eai-lpfoot-brand">
            {brand}
            <p className={km ? "eai-km" : ""}>{text("footTagline")}</p>
            {email && (
              <a href={`mailto:${email}`} className={`eai-lpfoot-mail eai-focus ${km ? "eai-km" : ""}`}><Mail size={16} aria-hidden="true" /> <span>{email}</span></a>
            )}
            {socials.length > 0 && (
              <div className="eai-lpfoot-social" role="list" aria-label={text("footFollow")}>
                {socials.map((s) => {
                  const Icon = SOCIAL_ICONS[s.id];
                  return (
                    <a key={s.id} role="listitem" href={s.url} target="_blank" rel="noopener noreferrer" aria-label={s.label} title={s.label} className="eai-lpfoot-ico eai-focus">
                      <Icon size={18} aria-hidden="true" />
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          <nav aria-label={text("footExplore")} className="eai-lpfoot-col">
            <h4 className={km ? "eai-km" : ""}>{text("footExplore")}</h4>
            <SectionLink id="features" className={linkBtn}>{text("navFeatures")}</SectionLink>
            <SectionLink id="how" className={linkBtn}>{text("navHow")}</SectionLink>
            <SectionLink id="faq" className={linkBtn}>{text("navFaq")}</SectionLink>
          </nav>

          <div className="eai-lpfoot-col">
            <h4 className={km ? "eai-km" : ""}>{text("footStart")}</h4>
            <button type="button" onClick={onCreate} className={linkBtn}>{createLabel}</button>
            <button type="button" onClick={onLogin} className={linkBtn}>{loginLabel}</button>
          </div>

          <nav aria-label={text("footLegal")} className="eai-lpfoot-col">
            <h4 className={km ? "eai-km" : ""}>{text("footLegal")}</h4>
            <a href="/privacy.html" target="_blank" rel="noopener" className={linkBtn}>{text("footPrivacy")}</a>
            <a href="/terms.html" target="_blank" rel="noopener" className={linkBtn}>{text("footTerms")}</a>
          </nav>
        </div>

        <div className="eai-lpfoot-bottom">
          <span className={km ? "eai-km" : ""}>{fillLanding(text("footCopy"), { year: yearText })}</span>
          <span className={km ? "eai-km" : ""}>{text("footMade")}</span>
        </div>
      </div>
    </footer>
  );
}

/* ── Everything below the top fold ───────────────────────────────────────────────────────────────── */

export function LandingBody({ lang, brand, onCreate, onLogin, createLabel, loginLabel, universities = [], questionCount = 0, env = ENV }) {
  return (
    <>
      <PreviewSection lang={lang} universities={universities} onCreate={onCreate} createLabel={createLabel} />
      <FeaturesSection lang={lang} />
      <StatsBanner lang={lang} questionCount={questionCount} />
      <HowSection lang={lang} onCreate={onCreate} createLabel={createLabel} />
      <FaqSection lang={lang} />
      <ClosingCta lang={lang} onCreate={onCreate} onLogin={onLogin} createLabel={createLabel} loginLabel={loginLabel} />
      <Footer lang={lang} brand={brand} onCreate={onCreate} onLogin={onLogin} createLabel={createLabel} loginLabel={loginLabel} env={env} />
    </>
  );
}

/* Turns on smooth scrolling (and room under the sticky bar) for the whole page while the landing page is showing, and puts it
   back when the visitor moves on. The CSS only smooths motion for people who haven't asked their device for less of it. */
export function useLandingScroll() {
  useEffect(() => {
    document.documentElement.classList.add("eai-lp-scroll");
    return () => document.documentElement.classList.remove("eai-lp-scroll");
  }, []);
}
