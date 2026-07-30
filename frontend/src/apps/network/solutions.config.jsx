import { lazy } from "react";
import {
  Map, MapPinned, Boxes, Server, Bell, AlertTriangle,
  Activity, Users, Network, Radar, Gauge, HeartPulse, TrendingUp,
  GitBranch, Bot, Settings, ShieldAlert, ShieldCheck, Lock, Library,
  Wifi, Router, Globe,
} from "lucide-react";

/**
 * Network Ops — solution-based architecture modelled on Auvik.
 *
 * Each "solution" is a sub-service that owns MULTIPLE pages. This config is the
 * single source of truth that drives the sidebar, the route table, the
 * launcher, and the per-solution tab chrome. The first page of each solution is
 * its root path.
 */
// A page/solution with no `profile` shows in both modes. `profile: "datacenter"`
// hides it in the small-office view; `profile: "office"` shows it only there.
export const SOLUTIONS = [
  {
    id: "connectivity",
    name: "Connectivity",
    tagline: "Internet, ISP links & data usage",
    description: "Monitor every internet/WAN link — bandwidth, status and monthly data usage — the backbone of an office network with no servers.",
    icon: Wifi,
    color: "sky",
    pages: [
      { id: "internet", label: "Internet Links", icon: Globe,  path: "/network/connectivity",        component: lazy(() => import("./solutions/connectivity/Internet")) },
    ],
  },
  {
    id: "map",
    name: "Network Map",
    tagline: "Auto-discovered topology",
    description: "See your whole network at a glance — an automatically generated, always-current topology of every device and link.",
    icon: Map,
    color: "indigo",
    pages: [
      { id: "topology", label: "Topology", icon: Network,   path: "/network/map",       component: lazy(() => import("./solutions/map/Topology")) },
      { id: "sites",    label: "Sites",    icon: MapPinned, path: "/network/map/sites", component: lazy(() => import("./solutions/map/Sites")) },
    ],
  },
  {
    id: "inventory",
    name: "Inventory",
    tagline: "Every device & server",
    description: "A live inventory of every managed device and server — status, utilization, OS, and location, all in one place.",
    icon: Boxes,
    color: "sky",
    pages: [
      { id: "devices", label: "Devices", icon: Boxes,  path: "/network/inventory",         component: lazy(() => import("./solutions/inventory/Devices")) },
      { id: "servers", label: "Servers", icon: Server, path: "/network/inventory/servers", component: lazy(() => import("./solutions/inventory/Servers")), profile: "datacenter" },
    ],
  },
  {
    id: "alerts",
    name: "Alerts",
    tagline: "Alerting & incident response",
    description: "Catch problems before users do — triage alerts and coordinate incident response from one console.",
    icon: Bell,
    color: "rose",
    pages: [
      { id: "alerts",    label: "Alerts",    icon: Bell,          path: "/network/alerts",           component: lazy(() => import("./solutions/alerts/Alerts")) },
      { id: "incidents", label: "Incidents", icon: AlertTriangle, path: "/network/alerts/incidents", component: lazy(() => import("./solutions/alerts/Incidents")) },
    ],
  },
  {
    id: "traffic",
    name: "TrafficInsights",
    tagline: "Flow analysis & anomalies",
    description: "Understand exactly what's on your network — bandwidth, top talkers, protocols, and traffic anomalies.",
    icon: Activity,
    color: "violet",
    pages: [
      { id: "overview",  label: "Overview",    icon: Activity, path: "/network/traffic",            component: lazy(() => import("./solutions/traffic/Overview")) },
      { id: "talkers",   label: "Top Talkers", icon: Users,    path: "/network/traffic/talkers",    component: lazy(() => import("./solutions/traffic/TopTalkers")) },
      { id: "protocols", label: "Protocols",   icon: Network,  path: "/network/traffic/protocols",  component: lazy(() => import("./solutions/traffic/Protocols")) },
      { id: "anomalies", label: "Anomalies",   icon: Radar,    path: "/network/traffic/anomalies",  component: lazy(() => import("./solutions/traffic/Anomalies")) },
    ],
  },
  {
    id: "performance",
    name: "Performance",
    tagline: "Monitoring, SLAs & capacity",
    description: "Track real-time device performance, service-level health, and capacity headroom across the estate.",
    icon: Gauge,
    color: "emerald",
    pages: [
      { id: "monitor",  label: "Monitor",        icon: Gauge,     path: "/network/performance",          component: lazy(() => import("./solutions/performance/Monitor")) },
      { id: "health",   label: "Service Health", icon: HeartPulse, path: "/network/performance/health",  component: lazy(() => import("./solutions/performance/ServiceHealth")), profile: "datacenter" },
      { id: "capacity", label: "Capacity",       icon: TrendingUp, path: "/network/performance/capacity", component: lazy(() => import("./solutions/performance/Capacity")), profile: "datacenter" },
    ],
  },
  {
    id: "config",
    name: "Configuration",
    tagline: "Change, automation & settings",
    description: "Govern change with approvals, automate routine ops, and tune monitoring settings and profiles.",
    icon: GitBranch,
    color: "amber",
    pages: [
      { id: "changes",    label: "Changes",    icon: GitBranch, path: "/network/config",            component: lazy(() => import("./solutions/config/Changes")), profile: "datacenter" },
      { id: "automation", label: "Automation", icon: Bot,       path: "/network/config/automation", component: lazy(() => import("./solutions/config/Automation")), profile: "datacenter" },
      { id: "settings",   label: "Settings",   icon: Settings,  path: "/network/config/settings",   component: lazy(() => import("./solutions/config/Settings")) },
    ],
  },
  {
    id: "security",
    name: "Security",
    tagline: "Firewall, policy & access",
    description: "Lock down the network — manage firewall rules, run compliance policy checks, and enforce access restrictions.",
    icon: ShieldAlert,
    color: "red",
    pages: [
      { id: "firewall",     label: "Firewall",     icon: ShieldAlert, path: "/network/security",              component: lazy(() => import("./solutions/security/Firewall")) },
      { id: "policies",     label: "Policies",     icon: ShieldCheck, path: "/network/security/policies",     component: lazy(() => import("./solutions/security/Policies")) },
      { id: "restrictions", label: "Restrictions", icon: Lock,        path: "/network/security/restrictions", component: lazy(() => import("./solutions/security/Restrictions")) },
    ],
  },
  {
    id: "docs",
    name: "Documentation",
    tagline: "Auto-generated network docs",
    description: "Always-current documentation for your network — runbooks, guides, and references in one library.",
    icon: Library,
    color: "teal",
    pages: [
      { id: "library", label: "Library", icon: Library, path: "/network/docs", component: lazy(() => import("./solutions/docs/Library")) },
    ],
  },
];

/** Flat route table consumed by the router (all pages; visibility is UI-only). */
// Each route carries the solution that owns it, so the router can refuse a page
// the organization's plan doesn't include — not just the module it sits in.
export const NETWORK_ROUTES = SOLUTIONS.flatMap((s) =>
  s.pages.map((p) => ({ path: p.path, Component: p.component, solution: s.id }))
);

const pageInProfile = (page, profile) => !page.profile || page.profile === profile;

/**
 * Solutions visible for a given network profile ("office" | "datacenter").
 * Pages tagged for the other profile are dropped; solutions left with no
 * visible pages are hidden entirely.
 */
export function solutionsForProfile(profile = "office") {
  return SOLUTIONS
    .map((s) => ({ ...s, pages: s.pages.filter((p) => pageInProfile(p, profile)) }))
    .filter((s) => s.pages.length > 0);
}

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
  emerald: { text: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-600", soft: "bg-emerald-50 dark:bg-emerald-500/10", softText: "text-emerald-700 dark:text-emerald-400", grad: "from-emerald-500 to-teal-600",  chip: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400", stat: "emerald" },
  indigo:  { text: "text-indigo-600 dark:text-indigo-400",   bg: "bg-indigo-600",  soft: "bg-indigo-50 dark:bg-indigo-500/10",   softText: "text-indigo-700 dark:text-indigo-400",   grad: "from-indigo-500 to-violet-600", chip: "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400",   stat: "indigo" },
  sky:     { text: "text-sky-600 dark:text-sky-400",         bg: "bg-sky-600",     soft: "bg-sky-50 dark:bg-sky-500/10",         softText: "text-sky-700 dark:text-sky-400",         grad: "from-sky-500 to-blue-600",      chip: "bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400",               stat: "sky" },
  rose:    { text: "text-rose-600 dark:text-rose-400",       bg: "bg-rose-600",    soft: "bg-rose-50 dark:bg-rose-500/10",       softText: "text-rose-700 dark:text-rose-400",       grad: "from-rose-500 to-pink-600",     chip: "bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400",           stat: "red" },
  violet:  { text: "text-violet-600 dark:text-violet-400",   bg: "bg-violet-600",  soft: "bg-violet-50 dark:bg-violet-500/10",   softText: "text-violet-700 dark:text-violet-400",   grad: "from-violet-500 to-purple-600", chip: "bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400",   stat: "violet" },
  amber:   { text: "text-amber-600 dark:text-amber-400",     bg: "bg-amber-600",   soft: "bg-amber-50 dark:bg-amber-500/10",     softText: "text-amber-700 dark:text-amber-400",     grad: "from-amber-500 to-orange-600",  chip: "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",       stat: "amber" },
  red:     { text: "text-red-600 dark:text-red-400",         bg: "bg-red-600",     soft: "bg-red-50 dark:bg-red-500/10",         softText: "text-red-700 dark:text-red-400",         grad: "from-red-500 to-rose-600",      chip: "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400",               stat: "red" },
  teal:    { text: "text-teal-600 dark:text-teal-400",       bg: "bg-teal-600",    soft: "bg-teal-50 dark:bg-teal-500/10",       softText: "text-teal-700 dark:text-teal-400",       grad: "from-teal-500 to-emerald-600",  chip: "bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400",           stat: "emerald" },
};

export const colorOf = (c) => SOLUTION_COLORS[c] ?? SOLUTION_COLORS.emerald;
