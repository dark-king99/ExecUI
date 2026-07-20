import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowRight, ArrowUpRight, Mail, Play, Sparkles, ChevronDown,
  MessageSquare, Table2, Send, Users, Megaphone, Network, BarChart3,
  Layers, ShieldCheck, KeyRound, ScrollText, Building2, UserPlus, CreditCard,
  Check, Zap, Crown, Bell,
} from "lucide-react";
import { MeshGradient, FadeUp, Stagger, Item, AnimatedNumber, TiltCard, Marquee } from "../components/motionfx";
import ExecUIBackground from "../components/ExecUIBackground";
import AnimatedLogo from "../components/AnimatedLogo";
import Footer from "../components/Footer";
import { PLANS, CUSTOM, CRM_SOLUTIONS, MKT_SOLUTIONS, SERVICES_SOLUTIONS } from "../lib/plans";
import { SOLUTIONS as NET_SOLUTIONS } from "./network/solutions.config";
import { SOLUTIONS as ANA_SOLUTIONS } from "./analytics/solutions.config";

// ── Animated hero title ───────────────────────────────────────────────────────
// Each letter drops in from above, one at a time; after a 10s hold the two
// halves of each line fly off to opposite sides of the screen and fade. Loops.
const TITLE_LINES = [
  { text: "One Platform to Operate", className: "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-500 bg-clip-text text-transparent dark:from-white dark:via-white dark:to-slate-400" },
  { text: "Your Entire Enterprise", className: "text-sheen bg-gradient-to-r from-cyan-500 via-fuchsia-500 to-blue-500 bg-clip-text text-transparent" },
];

function HeroTitle() {
  const reduce = useReducedMotion();
  const h1Class = "text-4xl font-bold leading-[1.04] tracking-tight sm:text-5xl lg:text-[4.25rem]";

  // Respect reduced-motion: render the title statically.
  if (reduce) {
    return (
      <h1 className={h1Class}>
        {TITLE_LINES.map((l) => (
          <span key={l.text} className="block pb-1"><span className={l.className}>{l.text}</span></span>
        ))}
      </h1>
    );
  }

  // Timeline (seconds) — a single looped keyframe per letter keeps every letter
  // in sync. Stagger is baked into each letter's keyframe `times`, so the drop-in
  // and fly-out both cascade one letter at a time.
  const stagger = 0.08, dropDur = 0.55, hold = 10, exitStagger = 0.05, exitDur = 0.8, endPad = 0.6;
  const totalLetters = TITLE_LINES.reduce((n, l) => n + l.text.replace(/ /g, "").length, 0);
  const dropInTotal = (totalLetters - 1) * stagger + dropDur;
  const holdEnd = dropInTotal + hold;                                   // letters sit until here
  const T = holdEnd + (totalLetters - 1) * exitStagger + exitDur + endPad;

  let gi = -1; // global letter index (drop-in order, across both lines)
  return (
    <h1 className={h1Class} aria-label={TITLE_LINES.map((l) => l.text).join(" ")}>
      {TITLE_LINES.map((line) => {
        const chars = [...line.text];
        const letterCount = line.text.replace(/ /g, "").length;
        let local = -1; // per-line letter index (drives the left/right split)
        return (
          <span key={line.text} className="block pb-1" aria-hidden="true">
            {chars.map((ch, ci) => {
              if (ch === " ") return <span key={ci} className="inline-block">{" "}</span>;
              gi += 1; local += 1;
              const ds = gi * stagger;                    // this letter's drop start
              const es = holdEnd + gi * exitStagger;      // this letter's exit start
              const dir = local < letterCount / 2 ? -1 : 1; // left half → left, right half → right
              const times = [0, ds / T, (ds + dropDur) / T, holdEnd / T, es / T, (es + exitDur) / T, 1];
              return (
                <motion.span
                  key={ci}
                  className={`inline-block will-change-transform ${line.className}`}
                  animate={{
                    y: ["-240%", "-240%", "0%", "0%", "0%", "0%", "0%"],
                    x: ["0vw", "0vw", "0vw", "0vw", "0vw", `${dir * 75}vw`, `${dir * 75}vw`],
                    opacity: [0, 0, 1, 1, 1, 0, 0],
                  }}
                  transition={{
                    duration: T,
                    times,
                    // hold-above · drop (soft overshoot) · sit · sit · fly-out (accelerate) · off
                    ease: ["linear", [0.34, 1.15, 0.5, 1], "linear", "linear", [0.5, 0, 0.75, 0], "linear"],
                    repeat: Infinity,
                    repeatType: "loop",
                  }}
                >
                  {ch}
                </motion.span>
              );
            })}
          </span>
        );
      })}
    </h1>
  );
}

// ── Feature list (bento middle column) ────────────────────────────────────────
const FEATURES = [
  { title: "Unified CRM",          blurb: "Customer data and pipeline that grow with your business.", path: "/crm",       icon: Users },
  { title: "Marketing automation", blurb: "Built for today, orchestrated for tomorrow.",              path: "/marketing", icon: Megaphone },
  { title: "Network operations",   blurb: "Monitor, map, and protect your whole estate.",             path: "/network",   icon: Network },
  { title: "AI-powered insights",  blurb: "Integrate AI to supercharge every decision.",               path: "/analytics", icon: BarChart3 },
];

// ── The product, told honestly: every suite + its real solutions ─────────────
const SUITES = [
  {
    id: "crm", name: "CRM · Sales Cloud", icon: Users, path: "/crm",
    accent: "text-orange-500", chip: "bg-orange-500/10 text-orange-600 dark:text-orange-400 ring-orange-500/20",
    bar: "bg-orange-500", tagline: "Your complete revenue engine.",
    description:
      "Capture leads, convert them into a live pipeline, and forecast with confidence. Deal rooms carry the timeline, tasks and files for every opportunity — and the Einstein copilot answers with your real numbers.",
    solutions: CRM_SOLUTIONS.map((s) => s.name),
    bars: [34, 58, 42, 76, 64, 90],
  },
  {
    id: "marketing", name: "Marketing Cloud", icon: Megaphone, path: "/marketing",
    accent: "text-violet-500", chip: "bg-violet-500/10 text-violet-600 dark:text-violet-400 ring-violet-500/20",
    bar: "bg-violet-500", tagline: "Campaigns that orchestrate themselves.",
    description:
      "Email studio, journey builder and audience intelligence in one place. Real sends go out through Resend on your verified domain, and every campaign feeds attribution straight back into the CRM.",
    solutions: MKT_SOLUTIONS.map((s) => s.name),
    bars: [50, 30, 72, 48, 86, 60],
  },
  {
    id: "network", name: "Network Operations", icon: Network, path: "/network",
    accent: "text-emerald-500", chip: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20",
    bar: "bg-emerald-500", tagline: "See and secure the whole estate.",
    description:
      "Devices, servers, alerts, incidents, firewall rules and automation jobs — the IT department's cockpit, gated so only the teams that should touch infrastructure ever see it.",
    solutions: NET_SOLUTIONS.map((s) => s.name),
    bars: [88, 92, 85, 95, 90, 97],
  },
  {
    id: "services", name: "Business Services", icon: Layers, path: "/services",
    accent: "text-sky-500", chip: "bg-sky-500/10 text-sky-600 dark:text-sky-400 ring-sky-500/20",
    bar: "bg-sky-500", tagline: "Finance to projects, one operating layer.",
    description:
      "Financial management, operations SOPs, strategic planning and team coordination. Task assignments ring the assignee's bell in real time — about 20 ms after you hit save.",
    solutions: SERVICES_SOLUTIONS.map((s) => s.name),
    bars: [44, 66, 52, 78, 58, 70],
  },
  {
    id: "analytics", name: "Analytics", icon: BarChart3, path: "/analytics",
    accent: "text-indigo-500", chip: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 ring-indigo-500/20",
    bar: "bg-indigo-500", tagline: "Every suite, one source of truth.",
    description:
      "Cross-suite dashboards sliced by what your plan and department unlock — sales funnels, marketing attribution, network health. Every KPI on the Executive Overview drills into the view behind the number.",
    solutions: ANA_SOLUTIONS.map((s) => s.name),
    bars: [40, 62, 55, 84, 70, 92],
  },
];

const TOTAL_SOLUTIONS =
  CRM_SOLUTIONS.length + MKT_SOLUTIONS.length + SERVICES_SOLUTIONS.length +
  NET_SOLUTIONS.length + ANA_SOLUTIONS.length;

// Marquee chips: every solution across every suite, tinted by its suite.
const MARQUEE_CHIPS = SUITES.flatMap((s) =>
  s.solutions.map((name) => ({ name, chip: s.chip, suite: s.id }))
);

const HOW_IT_WORKS = [
  {
    icon: Building2, step: "01", title: "Create your enterprise",
    text: "Sign up free and your organization gets its own tenant, an enterprise join code, and you become its admin. Invite employees — each gets an admin-issued employee ID and completes sign-up themselves.",
  },
  {
    icon: UserPlus, step: "02", title: "Departments shape access",
    text: "Sales lives in CRM, Marketing in campaigns, IT in Network Ops. Access is strict by function — an employee only sees the suites and data of their department, enforced in the UI and again at the API.",
  },
  {
    icon: CreditCard, step: "03", title: "Pick the plan that fits",
    text: "Four tiers from Standard to Executive — or compose a Custom plan from individual CRM and Marketing solutions. Your plan caps what the org can reach; departments shape it per person.",
  },
];

const SECURITY_FEATURES = [
  { icon: KeyRound,   title: "Two-factor authentication", text: "TOTP codes from any authenticator app, enforced at sign-in." },
  { icon: ShieldCheck, title: "Encrypted secret store",    text: "Outbound integration credentials sealed with AES-256-GCM." },
  { icon: ScrollText,  title: "Complete audit trail",      text: "Logins, plan changes, security events — every action recorded." },
  { icon: Bell,        title: "Real-time by default",      text: "Notifications stream over SSE the instant they happen." },
];

const TIER_ICONS = { standard: Layers, premium: Zap, enterprise: Sparkles, executive: Crown };

// ExecUI wordmark — only used where there's room to render it in full.
function LogoMark({ className = "h-5 w-auto" }) {
  return <img src="/execui-logo.png" alt="" className={`${className} object-contain`} draggable="false" />;
}

// ── Cursor-following glow + dot ───────────────────────────────────────────────
function CursorGlow() {
  const glow = useRef(null);
  const dot = useRef(null);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia("(pointer: fine)").matches) return;
    let mx = window.innerWidth / 2, my = window.innerHeight / 2;
    let gx = mx, gy = my, dx = mx, dy = my, raf;
    const onMove = (e) => { mx = e.clientX; my = e.clientY; };
    window.addEventListener("pointermove", onMove);
    const tick = () => {
      gx += (mx - gx) * 0.10; gy += (my - gy) * 0.10;
      dx += (mx - dx) * 0.30; dy += (my - dy) * 0.30;
      if (glow.current) glow.current.style.transform = `translate3d(${gx}px,${gy}px,0) translate(-50%,-50%)`;
      if (dot.current)  dot.current.style.transform  = `translate3d(${dx}px,${dy}px,0) translate(-50%,-50%)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("pointermove", onMove); };
  }, []);
  return (
    <>
      <div ref={glow} className="pointer-events-none fixed left-0 top-0 z-1 h-80 w-80 rounded-full bg-indigo-500/20 opacity-70 blur-[90px] dark:bg-indigo-400/20" />
      <div ref={dot} className="pointer-events-none fixed left-0 top-0 z-60 h-7 w-7 rounded-full border border-indigo-500/60 dark:border-white/50" />
    </>
  );
}

// ── Integration orbit graphic ─────────────────────────────────────────────────
function OrbitNode({ className, float, children }) {
  return (
    <div className={`absolute flex items-center justify-center rounded-full bg-white ring-1 ring-slate-200 shadow-md dark:bg-slate-900 dark:ring-white/10 ${float} ${className}`}>
      {children}
    </div>
  );
}

function IntegrationOrbit() {
  return (
    <div className="relative h-44 w-full">
      <div className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-200 dark:border-white/5" />
      <div className="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-200 dark:border-white/10" />
      <div className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white px-2 shadow-xl ring-1 ring-slate-200 dark:ring-white/10">
        <LogoMark className="h-auto w-full" />
      </div>
      <OrbitNode className="left-[14%] top-[28%] h-11 w-11" float="animate-float">
        <Mail className="h-5 w-5 text-rose-500" />
      </OrbitNode>
      <OrbitNode className="left-[40%] top-[8%] h-11 w-11" float="animate-float-slow">
        <MessageSquare className="h-5 w-5 text-violet-500" />
      </OrbitNode>
      <OrbitNode className="right-[12%] top-[18%] h-11 w-11" float="animate-float-slower">
        <Sparkles className="h-5 w-5 text-orange-500" />
      </OrbitNode>
      <OrbitNode className="left-[20%] bottom-[8%] h-10 w-10" float="animate-float-slow">
        <Table2 className="h-5 w-5 text-emerald-500" />
      </OrbitNode>
      <OrbitNode className="right-[8%] bottom-[26%] h-9 w-9" float="animate-float">
        <Send className="h-4 w-4 text-sky-500" />
      </OrbitNode>
    </div>
  );
}

// ── Analytics radial graphic (theme-aware via currentColor) ───────────────────
function AnalyticsRadial() {
  const rings = [
    { r: 70, op: 0.35, dash: 0.62 },
    { r: 56, op: 0.5,  dash: 0.78 },
    { r: 42, op: 0.7,  dash: 0.55 },
    { r: 28, op: 0.9,  dash: 0.85 },
  ];
  return (
    <svg viewBox="0 0 180 180" className="h-44 w-full text-slate-500 dark:text-slate-300">
      <g transform="translate(90 90) rotate(-90)">
        {rings.map(({ r, op, dash }) => (
          <circle
            key={r} r={r} fill="none" stroke="currentColor" strokeOpacity={op}
            strokeWidth="9" strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * r * dash} ${2 * Math.PI * r}`}
          />
        ))}
        <circle r="13" fill="currentColor" />
      </g>
    </svg>
  );
}

// Animated bar visual for the suite tour — springs up on every tab switch.
function SuiteBars({ suite }) {
  return (
    <div className="flex h-40 items-end justify-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-black/30">
      {suite.bars.map((h, i) => (
        <motion.div
          key={`${suite.id}-${i}`}
          className={`w-7 rounded-t-lg ${suite.bar}`}
          initial={{ height: 0, opacity: 0.4 }}
          animate={{ height: `${h}%`, opacity: 0.55 + (h / 100) * 0.45 }}
          transition={{ delay: 0.08 * i, type: "spring", stiffness: 160, damping: 18 }}
        />
      ))}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function HomeView() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const [suite, setSuite] = useState(0);
  const goToSystem = () => navigate("/overview");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // The suite tour advances itself; clicking a tab pins it for a while.
  const pinned = useRef(0);
  useEffect(() => {
    const t = setInterval(() => {
      if (Date.now() - pinned.current > 9000) setSuite((s) => (s + 1) % SUITES.length);
    }, 5200);
    return () => clearInterval(t);
  }, []);
  const pickSuite = (i) => { pinned.current = Date.now(); setSuite(i); };
  const active = SUITES[suite];

  const navLinks = [
    { label: "Overview",  to: "/overview" },
    { label: "Services",  to: "/services" },
    { label: "Analytics", to: "/analytics" },
    { label: "Access",   to: "/account/billing" },
  ];

  const cardBase =
    "rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.03] dark:shadow-none";

  return (
    <div className="relative isolate min-h-screen w-full overflow-x-hidden bg-white text-slate-900 dark:bg-[#0a0a0c] dark:text-slate-100">
      <CursorGlow />

      {/* Page-wide ambient animation (Flow · Orbit · Signal · Rise) fixed behind
          all content. Chips are off so the module labels don't fight the copy. */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <ExecUIBackground showModules={false} />
      </div>

      {/* ── Sticky header ─────────────────────────────────────────────────── */}
      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled
            ? "border-b border-slate-200/70 bg-white/80 backdrop-blur-xl dark:border-white/10 dark:bg-[#0a0a0c]/80"
            : "border-b border-transparent bg-transparent"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <button onClick={() => navigate("/home")} className="flex items-center transition-transform hover:scale-[1.03]">
            <AnimatedLogo className="h-8" />
          </button>
          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((l) => (
              <button
                key={l.label}
                onClick={() => navigate(l.to)}
                className="rounded-lg px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
              >
                {l.label}
              </button>
            ))}
          </nav>
          <button
            onClick={goToSystem}
            className="group flex items-center gap-1.5 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg dark:bg-white dark:text-slate-900"
          >
            Get started
            <ArrowUpRight size={15} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </button>
        </div>
      </header>

      <div className="relative z-10 mx-auto max-w-7xl px-6 pb-24">
        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <section className="mx-auto flex min-h-[82vh] max-w-4xl flex-col items-center justify-center text-center">
          <HeroTitle />

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.45 }}
            className="mx-auto mt-6 max-w-2xl text-base text-slate-500 dark:text-slate-400 sm:text-lg"
          >
            From CRM and marketing automation to network operations and analytics —
            {" "}{TOTAL_SOLUTIONS} solutions across five suites, shaped to each department and plan.
          </motion.p>

          {/* Email capture */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.6 }}
            className="mx-auto mt-10 w-full max-w-md"
          >
            <p className="mb-3 text-sm font-medium text-slate-600 dark:text-slate-300">Stay in the loop</p>
            <form
              onSubmit={(e) => { e.preventDefault(); goToSystem(); }}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1.5 pl-3.5 shadow-sm transition focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/20 dark:border-white/10 dark:bg-white/5"
            >
              <Mail size={16} className="shrink-0 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="John@gmail.com"
                className="flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-white"
              />
              <button
                type="submit"
                aria-label="Continue"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
              >
                <ArrowRight size={15} />
              </button>
            </form>
            <p className="mt-3 text-xs text-slate-400">We'll never share your email address.</p>
          </motion.div>

          {/* Live product numbers */}
          <Stagger className="mt-14 grid w-full max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4" gap={0.1} delay={0.2}>
            {[
              { value: TOTAL_SOLUTIONS, suffix: "", label: "Solutions" },
              { value: 5, suffix: "", label: "Product suites" },
              { value: PLANS.length + 1, suffix: "", label: "Plans + custom" },
              { value: 20, suffix: "ms", prefix: "~", label: "Live events" },
            ].map((s) => (
              <Item key={s.label}>
                <div className="rounded-2xl border border-slate-200 bg-white/60 px-3 py-4 backdrop-blur dark:border-white/10 dark:bg-white/[0.03]">
                  <p className="text-2xl font-bold tracking-tight">
                    <AnimatedNumber value={s.value} suffix={s.suffix} prefix={s.prefix ?? ""} />
                  </p>
                  <p className="mt-0.5 text-[11px] uppercase tracking-widest text-slate-400">{s.label}</p>
                </div>
              </Item>
            ))}
          </Stagger>

          {/* Scroll hint */}
          <div className="mt-12 flex flex-col items-center gap-1 text-slate-400 dark:text-slate-600">
            <span className="text-[11px] uppercase tracking-widest">Scroll</span>
            <ChevronDown size={16} className="animate-bounce" />
          </div>
        </section>

        {/* ── Solutions marquee — every solution in the platform ─────────── */}
        <FadeUp className="mb-20">
          <p className="mb-4 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            {TOTAL_SOLUTIONS} solutions, one login
          </p>
          <Marquee duration={46} className="py-1">
            {MARQUEE_CHIPS.slice(0, Math.ceil(MARQUEE_CHIPS.length / 2)).map((c, i) => (
              <span key={`a-${c.suite}-${c.name}-${i}`} className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium ring-1 ${c.chip}`}>
                {c.name}
              </span>
            ))}
          </Marquee>
          <Marquee duration={52} reverse className="mt-3 py-1">
            {MARQUEE_CHIPS.slice(Math.ceil(MARQUEE_CHIPS.length / 2)).map((c, i) => (
              <span key={`b-${c.suite}-${c.name}-${i}`} className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium ring-1 ${c.chip}`}>
                {c.name}
              </span>
            ))}
          </Marquee>
        </FadeUp>

        {/* ── Suite tour — what each product actually does ────────────────── */}
        <section className="mb-24">
          <FadeUp className="mx-auto mb-10 max-w-2xl text-center">
            <h2 className="text-3xl font-bold italic tracking-tight sm:text-4xl">Five suites, one system</h2>
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
              Everything below is live in the product today — click a suite to see what's inside.
            </p>
          </FadeUp>

          <FadeUp delay={0.1}>
            <div className="mb-6 flex flex-wrap justify-center gap-2">
              {SUITES.map((s, i) => {
                const Icon = s.icon;
                const isActive = i === suite;
                return (
                  <button
                    key={s.id}
                    onClick={() => pickSuite(i)}
                    className={`relative flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                      isActive
                        ? "text-white dark:text-slate-900"
                        : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                    }`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="suite-pill"
                        className="absolute inset-0 rounded-full bg-slate-900 dark:bg-white"
                        transition={{ type: "spring", stiffness: 320, damping: 30 }}
                      />
                    )}
                    <Icon size={15} className={`relative ${isActive ? "" : s.accent}`} />
                    <span className="relative">{s.name}</span>
                  </button>
                );
              })}
            </div>

            <div className={`relative overflow-hidden p-8 ${cardBase}`}>
              <MeshGradient intensity={0.16} hue={false} />
              <AnimatePresence mode="wait">
                <motion.div
                  key={active.id}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -14 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="relative grid items-center gap-8 lg:grid-cols-2"
                >
                  <div>
                    <p className={`text-xs font-semibold uppercase tracking-widest ${active.accent}`}>{active.tagline}</p>
                    <h3 className="mt-2 text-2xl font-bold tracking-tight">{active.name}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{active.description}</p>
                    <div className="mt-5 flex flex-wrap gap-1.5">
                      {active.solutions.map((name) => (
                        <span key={name} className={`rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ${active.chip}`}>
                          {name}
                        </span>
                      ))}
                    </div>
                    <button
                      onClick={() => navigate(active.path)}
                      className="group mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-white"
                    >
                      Open {active.name}
                      <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
                    </button>
                  </div>
                  <SuiteBars suite={active} />
                </motion.div>
              </AnimatePresence>
            </div>
          </FadeUp>
        </section>

        {/* ── How it works ────────────────────────────────────────────────── */}
        <section className="mb-24">
          <FadeUp className="mx-auto mb-10 max-w-2xl text-center">
            <h2 className="text-3xl font-bold italic tracking-tight sm:text-4xl">Built for how enterprises actually work</h2>
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
              Three moves from sign-up to a fully governed workspace.
            </p>
          </FadeUp>
          <Stagger className="grid gap-4 md:grid-cols-3" gap={0.12}>
            {HOW_IT_WORKS.map(({ icon: Icon, step, title, text }) => (
              <Item key={step} className="h-full">
                <TiltCard className={`h-full ${cardBase} !rounded-2xl`}>
                  <div className="flex h-full flex-col p-6">
                    <div className="flex items-center justify-between">
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 ring-1 ring-indigo-100 dark:bg-indigo-500/10 dark:ring-indigo-500/20">
                        <Icon className="h-5 w-5 text-indigo-500" />
                      </span>
                      <span className="text-3xl font-bold text-slate-100 dark:text-white/10">{step}</span>
                    </div>
                    <h3 className="mt-4 text-base font-semibold">{title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{text}</p>
                  </div>
                </TiltCard>
              </Item>
            ))}
          </Stagger>
        </section>

        {/* ── Plans strip ─────────────────────────────────────────────────── */}
        <section className="mb-24">
          <FadeUp className="mx-auto mb-10 max-w-2xl text-center">
            <h2 className="text-3xl font-bold italic tracking-tight sm:text-4xl">A plan for every stage</h2>
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
              Free during early access — upgrade paths are ready when you are.
            </p>
          </FadeUp>
          <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" gap={0.1}>
            {PLANS.map((p) => {
              const Icon = TIER_ICONS[p.id] ?? Layers;
              return (
                <Item key={p.id} className="h-full">
                  <motion.button
                    onClick={() => navigate("/account/billing")}
                    whileHover={{ y: -6 }}
                    transition={{ type: "spring", stiffness: 300, damping: 22 }}
                    className={`relative h-full w-full overflow-hidden p-6 text-left ${cardBase} !rounded-2xl ${
                      p.highlighted ? "ring-2 ring-indigo-500/60" : ""
                    }`}
                  >
                    {p.highlighted && <MeshGradient intensity={0.22} hue={false} />}
                    <div className="relative">
                      <span className="flex items-center gap-2 text-sm font-semibold">
                        <Icon size={15} className="text-indigo-500" /> {p.name}
                      </span>
                      <p className="mt-3 text-3xl font-bold tracking-tight">
                        ${p.price.toLocaleString()}<span className="text-sm font-normal text-slate-400">/mo</span>
                      </p>
                      <p className="mt-2 min-h-[38px] text-xs leading-relaxed text-slate-500 dark:text-slate-400">{p.tagline}</p>
                      <ul className="mt-4 space-y-1.5">
                        <li className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                          <Check size={12} className="text-emerald-500" /> {p.crm.length === CRM_SOLUTIONS.length ? "Full" : p.crm.length} CRM solutions
                        </li>
                        <li className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                          <Check size={12} className="text-emerald-500" /> {p.marketing.length === MKT_SOLUTIONS.length ? "Full" : p.marketing.length} Marketing solutions
                        </li>
                        {p.services.length > 0 && (
                          <li className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                            <Check size={12} className="text-emerald-500" /> Business Services
                          </li>
                        )}
                        {p.network && (
                          <li className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                            <Check size={12} className="text-emerald-500" /> Network Operations
                          </li>
                        )}
                        <li className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                          <Sparkles size={12} className="text-indigo-500" /> {(p.ai ?? 0).toLocaleString()} AI assists / month
                        </li>
                      </ul>
                    </div>
                  </motion.button>
                </Item>
              );
            })}
          </Stagger>
          <FadeUp delay={0.15} className="mt-4">
            <button
              onClick={() => navigate("/account/billing")}
              className={`group flex w-full items-center justify-between p-5 text-left transition hover:border-indigo-300 ${cardBase} !rounded-2xl`}
            >
              <div>
                <p className="text-sm font-semibold">Or compose a Custom plan</p>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Pick any {CUSTOM.minUnits}+ CRM & Marketing solutions at ${CUSTOM.unitPrice} each — only pay for what you use.
                </p>
              </div>
              <ArrowRight size={16} className="shrink-0 text-slate-300 transition group-hover:translate-x-1 group-hover:text-indigo-500" />
            </button>
          </FadeUp>
        </section>

        {/* ── Security band ───────────────────────────────────────────────── */}
        <section className="mb-24">
          <FadeUp>
            <div className={`relative overflow-hidden p-8 ${cardBase}`}>
              <MeshGradient intensity={0.14} hue={false} />
              <div className="relative">
                <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500">Enterprise-grade by default</p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Security your auditors will like</h2>
                <Stagger className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4" gap={0.1}>
                  {SECURITY_FEATURES.map(({ icon: Icon, title, text }) => (
                    <Item key={title}>
                      <div className="flex items-start gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 ring-1 ring-slate-200 dark:bg-white/5 dark:ring-white/10">
                          <Icon className="text-indigo-500" size={18} />
                        </span>
                        <span>
                          <span className="block text-sm font-semibold">{title}</span>
                          <span className="mt-1 block text-xs leading-relaxed text-slate-500 dark:text-slate-400">{text}</span>
                        </span>
                      </div>
                    </Item>
                  ))}
                </Stagger>
              </div>
            </div>
          </FadeUp>
        </section>

        {/* ── Bento grid ────────────────────────────────────────────────── */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* Left tall — "Explained" video card */}
          <FadeUp className="lg:col-span-3">
            <button
              onClick={goToSystem}
              className={`group relative flex h-full min-h-[360px] w-full flex-col justify-between overflow-hidden p-6 text-left transition-all hover:-translate-y-1 ${cardBase}`}
            >
              <div className="flex items-start justify-between">
                <h3 className="text-2xl font-semibold leading-tight">ExecUI<br />Explained</h3>
                <LogoMark className="h-5 w-auto opacity-60" />
              </div>
              <div className="pointer-events-none absolute inset-x-0 top-20 h-44 opacity-50">
                <svg viewBox="0 0 300 200" className="h-full w-full text-slate-400 dark:text-slate-500" preserveAspectRatio="none">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <path key={i} d={`M0 ${60 + i * 16} C 80 ${30 + i * 16}, 220 ${110 + i * 12}, 300 ${50 + i * 16}`}
                      fill="none" stroke="currentColor" strokeOpacity={0.25 + i * 0.05} strokeWidth="1.5" />
                  ))}
                </svg>
              </div>
              <div className="relative flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-2.5 dark:border-white/10 dark:bg-black/30 dark:backdrop-blur">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-white transition group-hover:scale-110 dark:bg-white dark:text-slate-900">
                  <Play size={14} className="ml-0.5 fill-current" />
                </span>
                <span className="flex-1 text-sm font-medium">Learn what we do</span>
                <span className="text-xs text-slate-400">2:37</span>
              </div>
            </button>
          </FadeUp>

          {/* Middle — feature list */}
          <div className="grid grid-rows-4 gap-4 lg:col-span-4">
            {FEATURES.map(({ title, blurb, path, icon: Icon }, i) => (
              <FadeUp key={title} delay={0.08 + i * 0.08} className="h-full">
                <button
                  onClick={() => navigate(path)}
                  className={`group flex h-full w-full items-center gap-3.5 p-4 text-left transition-all hover:-translate-y-0.5 ${cardBase} !rounded-2xl`}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 ring-1 ring-slate-200 transition group-hover:bg-indigo-50 dark:bg-slate-900 dark:ring-white/10 dark:group-hover:bg-indigo-500/10">
                    <Icon className="h-5 w-5 text-slate-600 transition group-hover:text-indigo-600 dark:text-slate-300 dark:group-hover:text-indigo-400" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{title}</span>
                    <span className="block truncate text-xs text-slate-400">{blurb}</span>
                  </span>
                  <ArrowRight size={15} className="shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-indigo-500 dark:text-slate-600" />
                </button>
              </FadeUp>
            ))}
          </div>

          {/* Integrations + Full stack */}
          <div className="grid grid-rows-[1fr_auto] gap-4 lg:col-span-3">
            <FadeUp delay={0.16} className="h-full">
              <div className={`flex h-full flex-col p-5 ${cardBase}`}>
                <IntegrationOrbit />
                <p className="mt-auto pt-3 text-center text-sm font-semibold">Any integration you can imagine.</p>
              </div>
            </FadeUp>
            <FadeUp delay={0.24}>
              <div className={`flex items-center justify-between p-4 ${cardBase} !rounded-2xl`}>
                <div>
                  <p className="text-sm font-semibold">Full stack</p>
                  <p className="text-xs text-slate-400">SaaS solutions for the modern world</p>
                </div>
                <span className="flex h-6 w-11 items-center rounded-full bg-indigo-500 p-0.5 shadow-inner transition">
                  <span className="ml-auto h-5 w-5 rounded-full bg-white shadow" />
                </span>
              </div>
            </FadeUp>
          </div>

          {/* Right — Analytics */}
          <FadeUp delay={0.2} className="lg:col-span-2">
            <button
              onClick={() => navigate("/analytics")}
              className={`group flex h-full w-full flex-col p-6 text-left transition-all hover:-translate-y-1 ${cardBase}`}
            >
              <h3 className="text-2xl font-semibold">Analytics</h3>
              <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">Designed to help you make informed business decisions.</p>
              <div className="my-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-black/30">
                <AnalyticsRadial />
              </div>
              <p className="mt-auto flex items-center gap-1 text-sm font-semibold">
                Not your average bar chart
                <ArrowUpRight size={14} className="text-emerald-500" />
              </p>
              <p className="text-xs text-slate-400">More than just graphs and numbers.</p>
            </button>
          </FadeUp>
        </section>

        {/* ── CTA band ──────────────────────────────────────────────────── */}
        <FadeUp className="mt-6">
          <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 px-8 py-16 text-center text-white shadow-xl dark:border-white/10">
            <MeshGradient intensity={0.8} />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(10,10,14,0.15),rgba(10,10,14,0.75))]" />
            <div className="relative">
              <h2 className="text-3xl font-bold italic tracking-tight sm:text-4xl">Ready when you are.</h2>
              <p className="mx-auto mt-3 max-w-xl text-sm text-slate-300">
                Step into your Executive Overview and see every service, solution, and signal in one place.
              </p>
              <motion.button
                onClick={goToSystem}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                className="group mt-8 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-2xl"
              >
                Get started
                <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
              </motion.button>
            </div>
          </div>
        </FadeUp>
      </div>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <div className="relative z-10">
        <Footer />
      </div>
    </div>
  );
}
