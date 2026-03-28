import React from "react";
import { useSidebar } from "../components/SidebarContext";
import {
  Activity,
  Bot,
  CalendarClock,
  Cloud,
  Database,
  Megaphone,
  Network,
  ShieldCheck,
  Target,
} from "lucide-react";

const crmFeatures = [
  "Unify customer profiles across every touchpoint",
  "AI insight engine for next-best actions",
  "Collaborative pipeline view for revenue teams",
  "Secure, compliant data governance",
];

const marketingFeatures = [
  "Manual + AI-assisted campaign creation",
  "Content and prompt studio for ads and social",
  "Cross-channel scheduling & management",
  "Engagement analytics and response automation",
];

const networkFeatures = [
  "Real-time monitoring & topology mapping",
  "Automated inventory, backups, and audits",
  "Pre-built & custom alert workflows",
  "Traffic analysis with enterprise-grade security",
  "API integrations and cloud-ready deployment",
];

const highlights = [
  {
    icon: Database,
    title: "Unified Data Core",
    description:
      "Bring CRM, marketing automation, and network telemetry into one trusted source of truth.",
  },
  {
    icon: Bot,
    title: "AI-Augmented Workflows",
    description:
      "Use embedded AI to accelerate decisions, automate outreach, and predict network risks.",
  },
  {
    icon: ShieldCheck,
    title: "Enterprise Ready",
    description:
      "Designed with security, compliance, and scale in mind, from day one.",
  },
];

const stats = [
  { label: "Minutes to map", value: "5" },
  { label: "Channels orchestrated", value: "12+" },
  { label: "Customer data points", value: "500k" },
];

const sections = [
  {
    key: "crm",
    title: "CRM",
    subtitle: "Unify customer database and AI insight",
    icon: Database,
    accent: "from-cyan-500/30 to-sky-500/5",
    features: crmFeatures,
  },
  {
    key: "marketing",
    title: "Marketing Automation",
    subtitle: "Manual + AI marketing automation, ads, social engagement, and campaign management",
    icon: Megaphone,
    accent: "from-fuchsia-500/30 to-rose-500/5",
    features: marketingFeatures,
  },
  {
    key: "network",
    title: "Network Management",
    subtitle: "Monitor & manage networks with enterprise-grade intelligence",
    icon: Network,
    accent: "from-emerald-500/30 to-teal-500/5",
    features: networkFeatures,
  },
];

export default function HomeView() {
  const { setAppSection } = useSidebar();

  return (
    <div className="min-h-full min-w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <div className="flex-1 relative">
        <div className="absolute inset-0 hidden dark:block dark:bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.2),transparent_45%),radial-gradient(circle_at_20%_40%,rgba(244,63,94,0.18),transparent_40%),radial-gradient(circle_at_80%_20%,rgba(52,211,153,0.18),transparent_45%)]" />

        <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-16 px-6 pb-20 pt-16">

          {/* Header */}
          <header className="flex flex-col gap-6">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">
              <Activity className="h-4 w-4" />
              Euvis Softwares
            </div>

            <div className="flex flex-col gap-5">
              <h1 className="text-3xl font-semibold dark:text-white">
                All-in-One Intelligent Cloud Application for CRM, Marketing Automation, and Network Management.
              </h1>

              <p className="text-slate-600 dark:text-slate-300">
                Build customer relationships, orchestrate omnichannel marketing, and protect infrastructure with AI-powered automation.
              </p>
            </div>
          </header>

          {/* Highlights */}
          <section className="grid gap-6 md:grid-cols-3">
            {highlights.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="rounded-2xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 p-6 shadow-lg"
                >
                  <Icon className="h-6 w-6" />
                  <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm">{item.description}</p>
                </div>
              );
            })}
          </section>

          {/* Core Services (CLICKABLE) */}
          <section className="grid gap-6 lg:grid-cols-3">
            {sections.map((section) => {
              const Icon = section.icon;

              return (
                <div
                  key={section.key}
                  onClick={() => setAppSection(section.key)}
                  className={`group cursor-pointer flex flex-col gap-6 rounded-3xl border 
                    bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800
                    shadow-sm bg-linear-to-br ${section.accent} p-6 shadow-xl
                    hover:scale-[1.02] hover:shadow-2xl transition`}
                >
                  <div className="flex items-center justify-between">
                    <div className="rounded-2xl border p-3">
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-[0.2em]">
                      Core Service
                    </span>
                  </div>

                  <div>
                    <h2 className="text-3xl font-semibold">{section.title}</h2>
                    <p className="mt-2 text-sm">{section.subtitle}</p>
                  </div>

                  <ul className="flex flex-col gap-3 text-sm">
                    {section.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Target className="mt-0.5 h-4 w-4" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </section>

        </div>
      </div>
    </div>
  );
}