import { lazy } from "react";
import {
  LayoutDashboard, Megaphone, LineChart, Layers,
  Target, Filter, TrendingUp,
  Wifi, Gauge, Activity,
} from "lucide-react";

/**
 * Analytics — a cross-service data overview of the three core services
 * (Marketing Cloud, Sales Cloud / CRM, and Network Ops) and their solutions.
 *
 * Each "solution" here is one core service; its pages roll up the analytics for
 * that service's own sub-services. This config is the single source of truth
 * that drives the sidebar, route table, executive launcher, and tab chrome.
 */
export const SOLUTIONS = [
  {
    id: "marketing",
    name: "Marketing",
    tagline: "Marketing Cloud performance",
    description: "Revenue, ROAS, channels, and engagement rolled up across every Marketing Cloud solution.",
    icon: Megaphone,
    color: "violet",
    pages: [
      { id: "overview",  label: "Overview",  icon: LayoutDashboard, path: "/analytics/marketing",          component: lazy(() => import("./solutions/marketing/Overview")) },
      { id: "channels",  label: "Channels",  icon: LineChart,       path: "/analytics/marketing/channels", component: lazy(() => import("./solutions/marketing/Channels")) },
      { id: "solutions", label: "Solutions", icon: Layers,          path: "/analytics/marketing/solutions", component: lazy(() => import("./solutions/marketing/Solutions")) },
    ],
  },
  {
    id: "sales",
    name: "Sales",
    tagline: "Sales Cloud / CRM performance",
    description: "Pipeline, win rates, funnel velocity, and forecast attainment across the CRM.",
    icon: Target,
    color: "orange",
    pages: [
      { id: "overview", label: "Overview", icon: LayoutDashboard, path: "/analytics/sales",          component: lazy(() => import("./solutions/sales/Overview")) },
      { id: "funnel",   label: "Funnel",   icon: Filter,          path: "/analytics/sales/funnel",   component: lazy(() => import("./solutions/sales/Funnel")) },
      { id: "forecast", label: "Forecast", icon: TrendingUp,      path: "/analytics/sales/forecast", component: lazy(() => import("./solutions/sales/Forecast")) },
    ],
  },
  {
    id: "network",
    name: "Network",
    tagline: "Network Ops health & traffic",
    description: "Uptime, capacity, service health, and traffic analytics across the network estate.",
    icon: Wifi,
    color: "emerald",
    pages: [
      { id: "overview",     label: "Overview",     icon: LayoutDashboard, path: "/analytics/network",             component: lazy(() => import("./solutions/network/Overview")) },
      { id: "performance",  label: "Performance",  icon: Gauge,           path: "/analytics/network/performance", component: lazy(() => import("./solutions/network/Performance")) },
      { id: "traffic",      label: "Traffic",      icon: Activity,        path: "/analytics/network/traffic",     component: lazy(() => import("./solutions/network/Traffic")) },
    ],
  },
];

/** Flat route table consumed by the router. */
export const ANALYTICS_ROUTES = SOLUTIONS.flatMap((s) =>
  s.pages.map((p) => ({ path: p.path, Component: p.component }))
);

/** Find the solution that owns a given pathname (most specific root wins). */
export function getSolutionByPath(pathname) {
  let match = null;
  for (const s of SOLUTIONS) {
    const root = s.pages[0].path;
    if (pathname === root || pathname.startsWith(root + "/")) {
      if (!match || root.length > match.pages[0].path.length) match = s;
    }
  }
  return match;
}

/** Accent color classes keyed by solution color. Static strings for Tailwind.
 *  `stat` maps to a color supported by the shared <Stat> component. */
export const SOLUTION_COLORS = {
  indigo:  { text: "text-indigo-600 dark:text-indigo-400",   bg: "bg-indigo-600",  soft: "bg-indigo-50 dark:bg-indigo-500/10",   softText: "text-indigo-700 dark:text-indigo-400",   grad: "from-indigo-500 to-violet-600", chip: "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400",   stat: "indigo" },
  violet:  { text: "text-violet-600 dark:text-violet-400",   bg: "bg-violet-600",  soft: "bg-violet-50 dark:bg-violet-500/10",   softText: "text-violet-700 dark:text-violet-400",   grad: "from-violet-500 to-purple-600", chip: "bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400",   stat: "violet" },
  orange:  { text: "text-orange-600 dark:text-orange-400",   bg: "bg-orange-600",  soft: "bg-orange-50 dark:bg-orange-500/10",   softText: "text-orange-700 dark:text-orange-400",   grad: "from-orange-500 to-amber-600",  chip: "bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",   stat: "orange" },
  emerald: { text: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-600", soft: "bg-emerald-50 dark:bg-emerald-500/10", softText: "text-emerald-700 dark:text-emerald-400", grad: "from-emerald-500 to-teal-600",  chip: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400", stat: "emerald" },
  sky:     { text: "text-sky-600 dark:text-sky-400",         bg: "bg-sky-600",     soft: "bg-sky-50 dark:bg-sky-500/10",         softText: "text-sky-700 dark:text-sky-400",         grad: "from-sky-500 to-blue-600",      chip: "bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400",               stat: "sky" },
  amber:   { text: "text-amber-600 dark:text-amber-400",     bg: "bg-amber-600",   soft: "bg-amber-50 dark:bg-amber-500/10",     softText: "text-amber-700 dark:text-amber-400",     grad: "from-amber-500 to-orange-600",  chip: "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",       stat: "amber" },
};

export const colorOf = (c) => SOLUTION_COLORS[c] ?? SOLUTION_COLORS.indigo;
