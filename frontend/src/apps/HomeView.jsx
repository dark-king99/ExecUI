import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  BarChart3,
  Bot,
  Database,
  Megaphone,
  Network,
  ShieldCheck,
  Target,
  ArrowRight,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

// ─── Data ─────────────────────────────────────────────────────────────────────

const highlights = [
  {
    icon: Database,
    title: "Unified Data Core",
    description:
      "Bring CRM, marketing automation, and network telemetry into one trusted source of truth.",
    accent: "text-sky-500 bg-sky-500/10 dark:bg-sky-500/10",
  },
  {
    icon: Bot,
    title: "AI-Augmented Workflows",
    description:
      "Embedded AI accelerates decisions, automates outreach, and predicts network risks before they escalate.",
    accent: "text-violet-500 bg-violet-500/10 dark:bg-violet-500/10",
  },
  {
    icon: ShieldCheck,
    title: "Enterprise Ready",
    description:
      "Designed with security, compliance, and scale in mind — from day one. SOC 2, multi-tenant, SSO.",
    accent: "text-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/10",
  },
];

const stats = [
  { label: "Minutes to onboard", value: "< 5" },
  { label: "Channels orchestrated", value: "12+" },
  { label: "Customer data points", value: "500k" },
];

const sections = [
  {
    title: "CRM",
    subtitle: "Unify customer data and drive revenue with AI insight.",
    icon: Database,
    color: "text-sky-500",
    border: "border-sky-500/30 dark:border-sky-500/20",
    bg: "bg-sky-500/5 dark:bg-sky-500/5",
    iconBg: "bg-sky-500/10",
    features: [
      "Unify customer profiles across every touchpoint",
      "AI insight engine for next-best actions",
      "Collaborative pipeline view for revenue teams",
      "Secure, compliant data governance",
    ],
    path: "/crm",
  },
  {
    title: "Marketing",
    subtitle: "Orchestrate omnichannel campaigns with precision and AI power.",
    icon: Megaphone,
    color: "text-violet-500",
    border: "border-violet-500/30 dark:border-violet-500/20",
    bg: "bg-violet-500/5 dark:bg-violet-500/5",
    iconBg: "bg-violet-500/10",
    features: [
      "Manual + AI-assisted campaign creation",
      "Content and prompt studio for ads and social",
      "Cross-channel scheduling & management",
      "Engagement analytics and response automation",
    ],
    path: "/marketing",
  },
  {
    title: "Network",
    subtitle: "Monitor and protect critical infrastructure in real time.",
    icon: Network,
    color: "text-emerald-500",
    border: "border-emerald-500/30 dark:border-emerald-500/20",
    bg: "bg-emerald-500/5 dark:bg-emerald-500/5",
    iconBg: "bg-emerald-500/10",
    features: [
      "Real-time monitoring & topology mapping",
      "Automated inventory, backups, and audits",
      "Pre-built & custom alert workflows",
      "Traffic analysis with enterprise-grade security",
    ],
    path: "/network",
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function HomeView() {
  const navigate = useNavigate();

  return (
    <div className="min-h-full bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">

      {/* Subtle background gradient (dark only) */}
      <div className="pointer-events-none fixed inset-0 dark:block hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.08),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(52,211,153,0.06),transparent_50%)]" />
      </div>

      <div className="relative max-w-6xl mx-auto px-6 pt-12 pb-24 space-y-20">

        {/* ── Hero ────────────────────────────────────────────────────── */}
        <section className="animate-slide-up">
          {/* Kicker badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-500 dark:text-slate-400 mb-6 shadow-sm">
            <Sparkles size={12} className="text-indigo-500" />
            Euvis Softwares — Intelligent Cloud Platform
          </div>

          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
            <div className="max-w-2xl">
              <h1 className="text-3xl sm:text-4xl font-semibold text-slate-900 dark:text-white leading-tight tracking-tight mb-4">
                All-in-one platform for CRM, Marketing Automation, and Network Management.
              </h1>
              <p className="text-base text-slate-500 dark:text-slate-400 leading-relaxed">
                Build customer relationships, orchestrate omnichannel marketing, and protect critical
                infrastructure with real-time intelligence and AI-powered automation.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 lg:flex-col lg:items-end shrink-0">
              <button
                onClick={() => navigate("/crm")}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-900/20 hover:shadow-indigo-900/30 transition-all hover:-translate-y-0.5"
              >
                Get started
                <ArrowRight size={14} />
              </button>
              <button
                onClick={() => navigate("/services")}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-all hover:-translate-y-0.5"
              >
                Explore services
              </button>
            </div>
          </div>

          {/* Stats row */}
          <div className="mt-10 flex flex-wrap items-center gap-8">
            {stats.map(({ label, value }) => (
              <div key={label}>
                <p className="text-2xl font-semibold text-slate-900 dark:text-white">{value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Feature highlights ────────────────────────────────────── */}
        <section>
          <div className="grid gap-5 md:grid-cols-3">
            {highlights.map(({ icon: Icon, title, description, accent }, i) => (
              <div
                key={title}
                className="group flex flex-col gap-4 p-6 rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900/50 hover:shadow-md dark:hover:border-slate-700 transition-all duration-200 animate-fade-in"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent}`}>
                  <Icon size={18} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1.5">
                    {title}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                    {description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Module cards ──────────────────────────────────────────── */}
        <section>
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">
              Core Modules
            </p>
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
              Everything your enterprise needs
            </h2>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {sections.map(({ title, subtitle, icon: Icon, color, border, bg, iconBg, features, path }, i) => (
              <div
                key={title}
                onClick={() => navigate(path)}
                className={`group flex flex-col gap-5 p-6 rounded-2xl border ${border} ${bg} cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-1 animate-slide-up`}
                style={{ animationDelay: `${i * 100}ms` }}
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center`}>
                    <Icon size={18} className={color} />
                  </div>
                  <span className="flex items-center gap-1 text-xs font-medium text-slate-400 dark:text-slate-500">
                    Core Module
                    <ArrowRight size={11} className="opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-0.5" />
                  </span>
                </div>

                {/* Title */}
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-1">
                    {title}
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                    {subtitle}
                  </p>
                </div>

                {/* Feature list */}
                <ul className="flex flex-col gap-2.5 mt-auto">
                  {features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-400">
                      <CheckCircle2 size={14} className={`shrink-0 mt-0.5 ${color}`} />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* ── Platform status banner ─────────────────────────────────── */}
        <section>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-6 py-5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50">
            <div className="flex items-center gap-3">
              <div className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  All systems operational
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  CRM sync, marketing automations, and network telemetry are live.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {["Zero-trust", "AI-guided", "Multi-tenant"].map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 rounded-full text-xs font-medium text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
