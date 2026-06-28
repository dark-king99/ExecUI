import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight, ArrowUpRight, Mail, Play, Sparkles,
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

// ── Integration orbit graphic ─────────────────────────────────────────────────
function OrbitNode({ className, children }) {
  return (
    <div className={`absolute flex items-center justify-center rounded-full bg-slate-900 ring-1 ring-white/10 shadow-lg ${className}`}>
      {children}
    </div>
  );
}

function IntegrationOrbit() {
  return (
    <div className="relative h-44 w-full">
      {/* orbit rings */}
      <div className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/5" />
      <div className="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10" />
      {/* center = ExecUI */}
      <div className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white px-2 shadow-xl">
        <LogoMark className="h-auto w-full" />
      </div>
      {/* nodes */}
      <OrbitNode className="left-[14%] top-[28%] h-11 w-11">
        <Mail className="h-5 w-5 text-rose-400" />
      </OrbitNode>
      <OrbitNode className="left-[40%] top-[8%] h-11 w-11">
        <MessageSquare className="h-5 w-5 text-violet-400" />
      </OrbitNode>
      <OrbitNode className="right-[12%] top-[18%] h-11 w-11">
        <Sparkles className="h-5 w-5 text-orange-400" />
      </OrbitNode>
      <OrbitNode className="left-[20%] bottom-[8%] h-10 w-10">
        <Table2 className="h-5 w-5 text-emerald-400" />
      </OrbitNode>
      <OrbitNode className="right-[8%] bottom-[26%] h-9 w-9">
        <Send className="h-4 w-4 text-sky-400" />
      </OrbitNode>
    </div>
  );
}

// ── Analytics radial graphic ───────────────────────────────────────────────────
function AnalyticsRadial() {
  const rings = [
    { r: 70, color: "#475569", dash: 0.62 },
    { r: 56, color: "#64748b", dash: 0.78 },
    { r: 42, color: "#94a3b8", dash: 0.55 },
    { r: 28, color: "#cbd5e1", dash: 0.85 },
  ];
  return (
    <svg viewBox="0 0 180 180" className="h-44 w-full">
      <g transform="translate(90 90) rotate(-90)">
        {rings.map(({ r, color, dash }) => (
          <circle
            key={r}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * r * dash} ${2 * Math.PI * r}`}
          />
        ))}
        <circle r="13" fill="#f8fafc" />
      </g>
    </svg>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function HomeView() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const goToSystem = () => navigate("/overview");

  const navLinks = [
    { label: "Overview",  to: "/overview" },
    { label: "Services",  to: "/services" },
    { label: "Analytics", to: "/analytics" },
    { label: "Network",   to: "/network" },
  ];

  return (
    // Full-bleed dark canvas (negates the main padding) so the hero is immersive on any theme.
    <div className="-m-6 min-h-full bg-[#0a0a0c] text-slate-100">
      <div className="relative overflow-hidden">
        {/* Background: spotlight beam + faint grid */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 h-[420px] w-[820px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.10),transparent_60%)]" />
          <div className="absolute inset-0 opacity-[0.04] [background-image:linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] [background-size:46px_46px]" />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 pb-14 pt-6">
          {/* ── Top nav ─────────────────────────────────────────────────── */}
          <header className="flex items-center justify-between gap-4">
            <button onClick={() => navigate("/home")} className="flex items-center">
              <img src="/execui-logo.png" alt="ExecUI" className="h-8 w-auto object-contain" draggable="false" />
            </button>
            <nav className="hidden items-center gap-7 md:flex">
              {navLinks.map((l) => (
                <button
                  key={l.label}
                  onClick={() => navigate(l.to)}
                  className="text-sm text-slate-300 transition hover:text-white"
                >
                  {l.label}
                </button>
              ))}
            </nav>
            <button
              onClick={goToSystem}
              className="flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-100"
            >
              Get started
              <ArrowUpRight size={15} />
            </button>
          </header>

          {/* ── Hero ────────────────────────────────────────────────────── */}
          <section className="mx-auto mt-16 max-w-4xl text-center">
            <h1 className="text-4xl font-bold italic leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
              One Platform to Run
              <br />
              Your Entire Enterprise
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base text-slate-400 sm:text-lg">
              From CRM and marketing automation to network operations and analytics,
              ExecUI unifies the tools that help your business adapt and grow.
            </p>

            {/* Email capture */}
            <div className="mx-auto mt-10 max-w-md">
              <p className="mb-3 text-sm font-medium text-slate-300">Stay in the loop</p>
              <form
                onSubmit={(e) => { e.preventDefault(); goToSystem(); }}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-1.5 pl-3.5 backdrop-blur"
              >
                <Mail size={16} className="shrink-0 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="John@gmail.com"
                  className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
                />
                <button
                  type="submit"
                  aria-label="Continue"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-900 transition hover:bg-slate-100"
                >
                  <ArrowRight size={15} />
                </button>
              </form>
              <p className="mt-3 text-xs text-slate-500">We'll never share your email address.</p>
            </div>
          </section>

          {/* ── Bento grid ──────────────────────────────────────────────── */}
          <section className="mt-16 grid grid-cols-1 gap-4 lg:grid-cols-12">
            {/* Left tall — "Explained" video card */}
            <button
              onClick={goToSystem}
              className="group relative col-span-1 flex min-h-[360px] flex-col justify-between overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-slate-800/60 to-slate-900 p-6 text-left lg:col-span-3"
            >
              <div className="flex items-start justify-between">
                <h3 className="text-2xl font-semibold leading-tight text-white">
                  ExecUI<br />Explained
                </h3>
                <LogoMark className="h-5 w-auto opacity-70" />
              </div>
              {/* wave visual */}
              <div className="pointer-events-none absolute inset-x-0 top-20 h-44 opacity-60">
                <svg viewBox="0 0 300 200" className="h-full w-full" preserveAspectRatio="none">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <path
                      key={i}
                      d={`M0 ${60 + i * 16} C 80 ${30 + i * 16}, 220 ${110 + i * 12}, 300 ${50 + i * 16}`}
                      fill="none"
                      stroke="#64748b"
                      strokeOpacity={0.25 + i * 0.05}
                      strokeWidth="1.5"
                    />
                  ))}
                </svg>
              </div>
              <div className="relative flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 p-2.5 backdrop-blur">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-900 transition group-hover:scale-105">
                  <Play size={14} className="ml-0.5 fill-current" />
                </span>
                <span className="flex-1 text-sm font-medium text-white">Learn what we do</span>
                <span className="text-xs text-slate-400">2:37</span>
              </div>
            </button>

            {/* Middle — feature list */}
            <div className="col-span-1 grid grid-rows-4 gap-4 lg:col-span-4">
              {FEATURES.map(({ title, blurb, path, icon: Icon }) => (
                <button
                  key={title}
                  onClick={() => navigate(path)}
                  className="group flex items-center gap-3.5 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left transition hover:border-white/20 hover:bg-white/[0.06]"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 ring-1 ring-white/10">
                    <Icon className="h-5 w-5 text-slate-200" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-white">{title}</span>
                    <span className="block truncate text-xs text-slate-400">{blurb}</span>
                  </span>
                  <ArrowRight size={15} className="shrink-0 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-slate-300" />
                </button>
              ))}
            </div>

            {/* Integrations + Full stack */}
            <div className="col-span-1 grid grid-rows-[1fr_auto] gap-4 lg:col-span-3">
              <div className="flex flex-col rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                <IntegrationOrbit />
                <p className="mt-auto pt-3 text-center text-sm font-semibold text-white">
                  Any integration you can imagine.
                </p>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div>
                  <p className="text-sm font-semibold text-white">Full stack</p>
                  <p className="text-xs text-slate-400">SaaS solutions for the modern world</p>
                </div>
                <span className="flex h-6 w-11 items-center rounded-full bg-slate-700 p-0.5">
                  <span className="h-5 w-5 rounded-full bg-white" />
                </span>
              </div>
            </div>

            {/* Right — Analytics */}
            <button
              onClick={() => navigate("/analytics")}
              className="group col-span-1 flex flex-col rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-left transition hover:border-white/20 lg:col-span-2"
            >
              <h3 className="text-2xl font-semibold text-white">Analytics</h3>
              <p className="mt-1.5 text-sm text-slate-400">
                Designed to help you make informed business decisions.
              </p>
              <div className="my-4 rounded-2xl border border-white/10 bg-black/30 p-3">
                <AnalyticsRadial />
              </div>
              <p className="mt-auto flex items-center gap-1 text-sm font-semibold text-white">
                Not your average bar chart
                <ArrowUpRight size={14} className="text-emerald-400" />
              </p>
              <p className="text-xs text-slate-400">More than just graphs and numbers.</p>
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
