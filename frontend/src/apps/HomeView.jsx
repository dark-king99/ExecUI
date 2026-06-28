import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight, ArrowUpRight, Mail, Play, Sparkles, ChevronDown,
  MessageSquare, Table2, Send, Users, Megaphone, Network, BarChart3,
} from "lucide-react";

// ── Feature list (middle column) ──────────────────────────────────────────────
const FEATURES = [
  { title: "Unified CRM",          blurb: "Customer data and pipeline that grow with your business.", path: "/crm",       icon: Users },
  { title: "Marketing automation", blurb: "Built for today, orchestrated for tomorrow.",              path: "/marketing", icon: Megaphone },
  { title: "Network operations",   blurb: "Monitor, map, and protect your whole estate.",             path: "/network",   icon: Network },
  { title: "AI-powered insights",  blurb: "Integrate AI to supercharge every decision.",               path: "/analytics", icon: BarChart3 },
];

// ExecUI wordmark — only used where there's room to render it in full.
function LogoMark({ className = "h-5 w-auto" }) {
  return <img src="/execui-logo.png" alt="" className={`${className} object-contain`} draggable="false" />;
}

// ── Scroll-reveal wrapper (IntersectionObserver) ──────────────────────────────
function Reveal({ children, className = "", delay = 0 }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms`, transitionTimingFunction: "cubic-bezier(0.22,1,0.36,1)" }}
      className={`transition-all duration-700 will-change-transform ${
        shown ? "translate-y-0 opacity-100 blur-0" : "translate-y-8 opacity-0 blur-[2px]"
      } ${className}`}
    >
      {children}
    </div>
  );
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

// ── Page ───────────────────────────────────────────────────────────────────────
export default function HomeView() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const goToSystem = () => navigate("/overview");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinks = [
    { label: "Overview",  to: "/overview" },
    { label: "Services",  to: "/services" },
    { label: "Analytics", to: "/analytics" },
    { label: "Access",   to: "/account/billing" },
  ];

  const cardBase =
    "rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.03] dark:shadow-none";

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-white text-slate-900 dark:bg-[#0a0a0c] dark:text-slate-100">
      <CursorGlow />

      {/* Background: spotlight beam + faint grid */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[640px]">
        <div className="absolute left-1/2 top-0 h-[460px] w-[900px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.16),transparent_62%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.10),transparent_60%)]" />
        <div className="absolute inset-0 opacity-[0.5] bg-[linear-gradient(to_right,rgb(99_102_241/0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgb(99_102_241/0.06)_1px,transparent_1px)] bg-size-[48px_48px] mask-[radial-gradient(ellipse_at_top,black,transparent_70%)] dark:opacity-100 dark:[background-image:linear-gradient(to_right,rgb(255_255_255_/_0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255_/_0.04)_1px,transparent_1px)]" />
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
            <img src="/execui-logo.png" alt="ExecUI" className="h-8 w-auto object-contain dark:brightness-100" draggable="false" />
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
        <section className="mx-auto flex min-h-[78vh] max-w-4xl flex-col items-center justify-center text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-slate-300 animate-fade-in">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-500 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-indigo-500" />
            </span>
            The enterprise operating system
          </div>

          <h1 className="animate-slide-up text-4xl font-bold italic leading-[1.04] tracking-tight sm:text-5xl lg:text-[4.25rem]">
            <span className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-500 bg-clip-text text-transparent dark:from-white dark:via-white dark:to-slate-400">
              One Platform to Run
              <br />
              Your Entire Enterprise
            </span>
          </h1>

          <p className="animate-slide-up delay-75 mx-auto mt-6 max-w-2xl text-base text-slate-500 dark:text-slate-400 sm:text-lg">
            From CRM and marketing automation to network operations and analytics,
            ExecUI unifies the tools that help your business adapt and grow.
          </p>

          {/* Email capture */}
          <div className="animate-slide-up delay-150 mx-auto mt-10 w-full max-w-md">
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
          </div>

          {/* Scroll hint */}
          <div className="mt-14 flex flex-col items-center gap-1 text-slate-400 dark:text-slate-600">
            <span className="text-[11px] uppercase tracking-widest">Scroll</span>
            <ChevronDown size={16} className="animate-bounce" />
          </div>
        </section>

        {/* ── Bento grid ────────────────────────────────────────────────── */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* Left tall — "Explained" video card */}
          <Reveal className="lg:col-span-3" delay={0}>
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
          </Reveal>

          {/* Middle — feature list */}
          <div className="grid grid-rows-4 gap-4 lg:col-span-4">
            {FEATURES.map(({ title, blurb, path, icon: Icon }, i) => (
              <Reveal key={title} delay={80 + i * 80} className="h-full">
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
              </Reveal>
            ))}
          </div>

          {/* Integrations + Full stack */}
          <div className="grid grid-rows-[1fr_auto] gap-4 lg:col-span-3">
            <Reveal delay={160} className="h-full">
              <div className={`flex h-full flex-col p-5 ${cardBase}`}>
                <IntegrationOrbit />
                <p className="mt-auto pt-3 text-center text-sm font-semibold">Any integration you can imagine.</p>
              </div>
            </Reveal>
            <Reveal delay={240}>
              <div className={`flex items-center justify-between p-4 ${cardBase} !rounded-2xl`}>
                <div>
                  <p className="text-sm font-semibold">Full stack</p>
                  <p className="text-xs text-slate-400">SaaS solutions for the modern world</p>
                </div>
                <span className="flex h-6 w-11 items-center rounded-full bg-indigo-500 p-0.5 shadow-inner transition">
                  <span className="ml-auto h-5 w-5 rounded-full bg-white shadow" />
                </span>
              </div>
            </Reveal>
          </div>

          {/* Right — Analytics */}
          <Reveal delay={200} className="lg:col-span-2">
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
          </Reveal>
        </section>

        {/* ── CTA band ──────────────────────────────────────────────────── */}
        <Reveal className="mt-6">
          <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-900 to-slate-800 px-8 py-14 text-center text-white shadow-xl dark:border-white/10 dark:from-indigo-600/20 dark:to-slate-900">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.25),transparent_65%)]" />
            <div className="relative">
              <h2 className="text-3xl font-bold italic tracking-tight sm:text-4xl">Ready when you are.</h2>
              <p className="mx-auto mt-3 max-w-xl text-sm text-slate-300">
                Step into your Executive Overview and see every service, solution, and signal in one place.
              </p>
              <button
                onClick={goToSystem}
                className="group mt-8 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition-all hover:-translate-y-0.5 hover:shadow-2xl"
              >
                Get started
                <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
