import { lazy } from "react";
import {
  LayoutDashboard, UserPlus, Activity, Target,
  Building2, Users, Contact,
  Briefcase, Workflow, GitBranch,
  TrendingUp, BarChart3, Gauge,
  ListChecks, CalendarClock, Repeat,
  Bot, Sparkles, BookOpen,
  LineChart, FileBarChart,
  Headset, RefreshCw,
  Handshake, Vote,
} from "lucide-react";

/**
 * CRM — solution-based architecture modelled on Salesforce Sales Cloud.
 *
 * Each "solution" is a sub-service that owns MULTIPLE pages. This config is the
 * single source of truth that drives the sidebar, the route table, the Sales
 * Cloud launcher, and the per-solution tab chrome. The first page of each
 * solution is its root path.
 */
export const SOLUTIONS = [
  {
    id: "leads",
    name: "Leads",
    tagline: "Capture, qualify & route new demand",
    description: "Work every new lead from first touch to qualified — with an inbox, activity feed, and Einstein-style scoring.",
    icon: UserPlus,
    color: "amber",
    pages: [
      { id: "inbox",    label: "Lead Inbox",   icon: UserPlus, path: "/crm/leads",          component: lazy(() => import("./solutions/leads/Inbox")) },
      { id: "activity", label: "Activity",     icon: Activity, path: "/crm/leads/activity",  component: lazy(() => import("./solutions/leads/Activity")) },
      { id: "scoring",  label: "Lead Scoring", icon: Target,   path: "/crm/leads/scoring",   component: lazy(() => import("./solutions/leads/Scoring")) },
    ],
  },
  {
    id: "accounts",
    name: "Accounts & Contacts",
    tagline: "The book of business",
    description: "Manage accounts and contacts with a complete 360° view of relationships, revenue, and open deals.",
    icon: Building2,
    color: "sky",
    pages: [
      { id: "accounts", label: "Accounts",    icon: Building2, path: "/crm/accounts",          component: lazy(() => import("./solutions/accounts/Accounts")) },
      { id: "a360",     label: "Account 360", icon: Users,     path: "/crm/accounts/360",      component: lazy(() => import("./solutions/accounts/Account360")) },
      { id: "contacts", label: "Contacts",    icon: Contact,   path: "/crm/accounts/contacts", component: lazy(() => import("./solutions/accounts/Contacts")) },
    ],
  },
  {
    id: "opportunities",
    name: "Opportunities",
    tagline: "Move deals through the pipeline",
    description: "Track every opportunity across stages with a visual pipeline, deal workspace, and a focused deal room.",
    icon: Target,
    color: "violet",
    pages: [
      { id: "pipeline",  label: "Pipeline",    icon: Briefcase, path: "/crm/opportunities",            component: lazy(() => import("./solutions/opportunities/Pipeline")) },
      { id: "workspace", label: "Workspace",   icon: Workflow,  path: "/crm/opportunities/workspace",  component: lazy(() => import("./solutions/opportunities/Workspace")) },
      { id: "dealroom",  label: "Deal Room",   icon: GitBranch, path: "/crm/opportunities/deals",      component: lazy(() => import("./solutions/opportunities/DealRoom")) },
    ],
  },
  {
    id: "forecasting",
    name: "Forecasting",
    tagline: "Commit, best case & quota",
    description: "Roll up the pipeline into a forecast — category breakdowns, per-rep commits, and quota attainment.",
    icon: TrendingUp,
    color: "emerald",
    pages: [
      { id: "summary", label: "Summary",        icon: TrendingUp, path: "/crm/forecasting",         component: lazy(() => import("./solutions/forecasting/Summary")) },
      { id: "byrep",   label: "By Rep",         icon: BarChart3,  path: "/crm/forecasting/reps",    component: lazy(() => import("./solutions/forecasting/ByRep")) },
      { id: "quota",   label: "Quota Attainment", icon: Gauge,    path: "/crm/forecasting/quota",   component: lazy(() => import("./solutions/forecasting/Quota")) },
    ],
  },
  {
    id: "activities",
    name: "Activities",
    tagline: "Tasks, cadences & meetings",
    description: "Stay on top of every follow-up — tasks, automated outreach cadences, and scheduled meetings in one place.",
    icon: ListChecks,
    color: "indigo",
    pages: [
      { id: "tasks",    label: "Tasks",     icon: ListChecks,    path: "/crm/activities",           component: lazy(() => import("./solutions/activities/Tasks")) },
      { id: "cadences", label: "Cadences",  icon: Repeat,        path: "/crm/activities/cadences",  component: lazy(() => import("./solutions/activities/Cadences")) },
      { id: "meetings", label: "Meetings",  icon: CalendarClock, path: "/crm/activities/meetings",  component: lazy(() => import("./solutions/activities/Meetings")) },
    ],
  },
  {
    id: "einstein",
    name: "Einstein",
    tagline: "Sales AI: copilot & insights",
    description: "Put AI to work across the deal — a conversational copilot, deal insights, and guided selling playbooks.",
    icon: Bot,
    color: "teal",
    pages: [
      { id: "copilot",   label: "Copilot",       icon: Sparkles, path: "/crm/einstein",           component: lazy(() => import("./solutions/einstein/Copilot")) },
      { id: "insights",  label: "Deal Insights", icon: TrendingUp, path: "/crm/einstein/insights", component: lazy(() => import("./solutions/einstein/DealInsights")) },
      { id: "playbooks", label: "Playbooks",     icon: BookOpen, path: "/crm/einstein/playbooks", component: lazy(() => import("./solutions/einstein/Playbooks")) },
    ],
  },
  {
    id: "analytics",
    name: "Analytics",
    tagline: "Funnel, velocity & reports",
    description: "Understand performance with conversion funnels, sales velocity, win/loss analysis, and saved reports.",
    icon: BarChart3,
    color: "blue",
    pages: [
      { id: "overview", label: "Overview",         icon: LayoutDashboard, path: "/crm/analytics",          component: lazy(() => import("./solutions/analytics/Overview")) },
      { id: "funnel",   label: "Funnel & Velocity", icon: LineChart,      path: "/crm/analytics/funnel",   component: lazy(() => import("./solutions/analytics/Funnel")) },
      { id: "reports",  label: "Reports",          icon: FileBarChart,    path: "/crm/analytics/reports",  component: lazy(() => import("./solutions/analytics/Reports")) },
    ],
  },
  {
    id: "service",
    name: "Service Cloud",
    tagline: "Post-sale: cases & renewals",
    description: "Keep customers happy after the close — manage support cases and stay ahead of upcoming renewals.",
    icon: Headset,
    color: "rose",
    pages: [
      { id: "cases",    label: "Cases",    icon: Headset,   path: "/crm/service",          component: lazy(() => import("./solutions/service/Cases")) },
      { id: "renewals", label: "Renewals", icon: RefreshCw, path: "/crm/service/renewals", component: lazy(() => import("./solutions/service/Renewals")) },
    ],
  },
  {
    id: "partners",
    name: "Partners",
    tagline: "Partner relationships & governance",
    description: "Manage your partner ecosystem and run governance with shared resolutions and board voting.",
    icon: Handshake,
    color: "orange",
    pages: [
      { id: "partners", label: "Partners",     icon: Handshake, path: "/crm/partners",       component: lazy(() => import("./solutions/partners/Partners")) },
      { id: "board",    label: "Board Voting", icon: Vote,      path: "/crm/partners/board", component: lazy(() => import("./solutions/partners/BoardVoting")) },
    ],
  },
];

/** Flat route table consumed by the router. */
export const CRM_ROUTES = SOLUTIONS.flatMap((s) =>
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
  orange:  { text: "text-orange-600 dark:text-orange-400",   bg: "bg-orange-600",  soft: "bg-orange-50 dark:bg-orange-500/10",   softText: "text-orange-700 dark:text-orange-400",   grad: "from-orange-500 to-amber-600",  chip: "bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",   stat: "orange" },
  amber:   { text: "text-amber-600 dark:text-amber-400",     bg: "bg-amber-600",   soft: "bg-amber-50 dark:bg-amber-500/10",     softText: "text-amber-700 dark:text-amber-400",     grad: "from-amber-500 to-orange-600",  chip: "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",       stat: "amber" },
  sky:     { text: "text-sky-600 dark:text-sky-400",         bg: "bg-sky-600",     soft: "bg-sky-50 dark:bg-sky-500/10",         softText: "text-sky-700 dark:text-sky-400",         grad: "from-sky-500 to-blue-600",      chip: "bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400",               stat: "sky" },
  violet:  { text: "text-violet-600 dark:text-violet-400",   bg: "bg-violet-600",  soft: "bg-violet-50 dark:bg-violet-500/10",   softText: "text-violet-700 dark:text-violet-400",   grad: "from-violet-500 to-purple-600", chip: "bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400",   stat: "violet" },
  emerald: { text: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-600", soft: "bg-emerald-50 dark:bg-emerald-500/10", softText: "text-emerald-700 dark:text-emerald-400", grad: "from-emerald-500 to-teal-600",  chip: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400", stat: "emerald" },
  indigo:  { text: "text-indigo-600 dark:text-indigo-400",   bg: "bg-indigo-600",  soft: "bg-indigo-50 dark:bg-indigo-500/10",   softText: "text-indigo-700 dark:text-indigo-400",   grad: "from-indigo-500 to-violet-600", chip: "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400",   stat: "indigo" },
  teal:    { text: "text-teal-600 dark:text-teal-400",       bg: "bg-teal-600",    soft: "bg-teal-50 dark:bg-teal-500/10",       softText: "text-teal-700 dark:text-teal-400",       grad: "from-teal-500 to-emerald-600",  chip: "bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400",           stat: "emerald" },
  blue:    { text: "text-blue-600 dark:text-blue-400",       bg: "bg-blue-600",    soft: "bg-blue-50 dark:bg-blue-500/10",       softText: "text-blue-700 dark:text-blue-400",       grad: "from-blue-500 to-indigo-600",   chip: "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",           stat: "sky" },
  rose:    { text: "text-rose-600 dark:text-rose-400",       bg: "bg-rose-600",    soft: "bg-rose-50 dark:bg-rose-500/10",       softText: "text-rose-700 dark:text-rose-400",       grad: "from-rose-500 to-pink-600",     chip: "bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400",           stat: "red" },
};

export const colorOf = (c) => SOLUTION_COLORS[c] ?? SOLUTION_COLORS.orange;
