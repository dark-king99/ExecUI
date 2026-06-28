import { useNavigate } from "react-router-dom";
import { Users, Megaphone, Network, BarChart3, Layers, ArrowRight, ArrowUpRight } from "lucide-react";
import { SOLUTIONS as MKT } from "./marketing/solutions.config";
import { SOLUTIONS as CRM } from "./crm/solutions.config";
import { SOLUTIONS as NET } from "./network/solutions.config";
import { SOLUTIONS as ANA } from "./analytics/solutions.config";

// Map a config SOLUTIONS array into lightweight overview entries.
const toEntries = (sols) =>
  sols.map((s) => ({ name: s.name, tagline: s.tagline, path: s.pages?.[0]?.path ?? s.basePath }));

// The "Services" area has no solutions.config; describe it inline.
const SERVICES = [
  { name: "Financial Management", tagline: "Revenue, expenses & cash flow", path: "/services/financial" },
  { name: "Operations System",    tagline: "SOPs & process control",       path: "/services/operation" },
  { name: "Strategic Planning",   tagline: "Goals, OKRs & roadmap",         path: "/services/strategic" },
  { name: "Marketing & Sales",    tagline: "Campaigns & revenue ops",       path: "/services/marketing" },
  { name: "Team & Project",       tagline: "Coordination & delivery",       path: "/services/team" },
];

// Static color maps (Tailwind can't compile interpolated class names).
const THEME = {
  orange:  { icon: "text-orange-500 bg-orange-500/10",   ring: "hover:border-orange-300 dark:hover:border-orange-500/40",   dot: "bg-orange-500" },
  violet:  { icon: "text-violet-500 bg-violet-500/10",   ring: "hover:border-violet-300 dark:hover:border-violet-500/40",   dot: "bg-violet-500" },
  emerald: { icon: "text-emerald-500 bg-emerald-500/10", ring: "hover:border-emerald-300 dark:hover:border-emerald-500/40", dot: "bg-emerald-500" },
  indigo:  { icon: "text-indigo-500 bg-indigo-500/10",   ring: "hover:border-indigo-300 dark:hover:border-indigo-500/40",   dot: "bg-indigo-500" },
  sky:     { icon: "text-sky-500 bg-sky-500/10",         ring: "hover:border-sky-300 dark:hover:border-sky-500/40",         dot: "bg-sky-500" },
};

const CORE = [
  { key: "crm",       name: "CRM · Sales Cloud",    icon: Users,     color: "orange",  path: "/crm",       tagline: "Unify customer data and drive revenue from lead to renewal.",  solutions: toEntries(CRM) },
  { key: "marketing", name: "Marketing Cloud",      icon: Megaphone, color: "violet",  path: "/marketing", tagline: "Orchestrate omnichannel campaigns and 1:1 personalization.",   solutions: toEntries(MKT) },
  { key: "network",   name: "Network Operations",   icon: Network,   color: "emerald", path: "/network",   tagline: "Map, monitor, and protect your entire infrastructure estate.", solutions: toEntries(NET) },
  { key: "analytics", name: "Analytics",            icon: BarChart3, color: "indigo",  path: "/analytics", tagline: "A cross-service data overview of every core capability.",      solutions: toEntries(ANA) },
  { key: "services",  name: "Business Services",    icon: Layers,    color: "sky",     path: "/services",  tagline: "Run day-to-day operations, finance, and project delivery.",    solutions: SERVICES },
];

const TOTAL_SOLUTIONS = CORE.reduce((n, s) => n + s.solutions.length, 0);

export default function ExecutiveOverview() {
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 dark:border-slate-800 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500">Executive Overview</p>
          <h1 className="mt-1.5 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Everything your enterprise runs on
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            A bird's-eye view of every core service and the solutions inside them. Jump straight
            into any area to get to work.
          </p>
        </div>
        <div className="flex gap-6">
          <div>
            <p className="text-2xl font-semibold text-slate-900 dark:text-white">{CORE.length}</p>
            <p className="text-xs text-slate-500">Core services</p>
          </div>
          <div>
            <p className="text-2xl font-semibold text-slate-900 dark:text-white">{TOTAL_SOLUTIONS}</p>
            <p className="text-xs text-slate-500">Solutions</p>
          </div>
        </div>
      </div>

      {/* ── Service cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
        {CORE.map(({ key, name, icon: Icon, color, path, tagline, solutions }) => {
          const t = THEME[color];
          return (
            <div
              key={key}
              className={`flex flex-col rounded-2xl border border-slate-200 bg-white p-5 transition-all dark:border-slate-800 dark:bg-slate-900/50 ${t.ring}`}
            >
              {/* Card header */}
              <button onClick={() => navigate(path)} className="group flex items-start gap-3.5 text-left">
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${t.icon}`}>
                  <Icon size={20} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-base font-semibold text-slate-900 dark:text-white">
                    {name}
                    <ArrowUpRight size={15} className="text-slate-400 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-slate-600 dark:group-hover:text-slate-300" />
                  </span>
                  <span className="mt-1 block text-sm leading-relaxed text-slate-500 dark:text-slate-400">{tagline}</span>
                </span>
              </button>

              {/* Solutions */}
              <div className="mt-4 flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {solutions.length} solutions
                </p>
              </div>
              <ul className="mt-2 space-y-0.5">
                {solutions.map((sol) => (
                  <li key={sol.path}>
                    <button
                      onClick={() => navigate(sol.path)}
                      className="group flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/70"
                    >
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${t.dot}`} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-slate-700 dark:text-slate-200">{sol.name}</span>
                        <span className="block truncate text-xs text-slate-400">{sol.tagline}</span>
                      </span>
                      <ArrowRight size={13} className="shrink-0 text-slate-300 opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100 dark:text-slate-600" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
