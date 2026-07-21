import { lazy } from "react";
import {
  Mail, Workflow, Image, CalendarClock, LayoutDashboard,
  Building2, Users, Target, GitBranch,
  Sparkles, Wand2, Layers, Brain,
  Database, Share2, Fingerprint, PieChart, Rocket,
  BarChart3, LineChart, Crosshair, FileBarChart,
  Bot, FlaskConical, Lightbulb,
  ShoppingCart, Package, Megaphone,
  Inbox, TrendingUp,
} from "lucide-react";

/**
 * Marketing Cloud — solution-based architecture.
 *
 * Each "solution" is a sub-service (modelled on Salesforce Marketing Cloud)
 * that owns MULTIPLE pages. This config is the single source of truth that
 * drives the sidebar, the route table, the solutions launcher, and the
 * per-solution tab chrome. The first page of each solution is its root path.
 */
export const SOLUTIONS = [
  {
    id: "engagement",
    name: "Engagement",
    short: "Engagement",
    tagline: "Email, mobile & cross-channel journeys",
    description:
      "Plan, build, and automate one-to-one customer journeys across email, mobile, and the web — the core of Marketing Cloud Engagement.",
    icon: Megaphone,
    color: "violet",
    pages: [
      { id: "overview",   label: "Overview",          icon: LayoutDashboard, path: "/marketing/engagement",            component: lazy(() => import("./solutions/engagement/Overview")) },
      { id: "email",      label: "Email Studio",       icon: Mail,            path: "/marketing/engagement/email",      component: lazy(() => import("./solutions/engagement/EmailStudio")) },
      { id: "journeys",   label: "Journey Builder",    icon: Workflow,        path: "/marketing/engagement/journeys",   component: lazy(() => import("./solutions/engagement/JourneyBuilder")) },
      { id: "content",    label: "Content Builder",    icon: Image,           path: "/marketing/engagement/content",    component: lazy(() => import("./solutions/engagement/ContentBuilder")) },
      { id: "automation", label: "Automation Studio",  icon: CalendarClock,   path: "/marketing/engagement/automation", component: lazy(() => import("./solutions/engagement/AutomationStudio")) },
    ],
  },
  {
    id: "account-engagement",
    name: "Account Engagement",
    short: "Account Engagement",
    tagline: "B2B marketing automation (Pardot)",
    description:
      "Generate pipeline with B2B marketing automation — prospect nurturing, engagement programs, and lead scoring & grading.",
    icon: Building2,
    color: "sky",
    pages: [
      { id: "overview",  label: "Overview",           icon: LayoutDashboard, path: "/marketing/account-engagement",          component: lazy(() => import("./solutions/account-engagement/Overview")) },
      { id: "prospects", label: "Prospects",          icon: Users,           path: "/marketing/account-engagement/prospects", component: lazy(() => import("./solutions/account-engagement/Prospects")) },
      { id: "studio",    label: "Engagement Studio",  icon: GitBranch,       path: "/marketing/account-engagement/studio",    component: lazy(() => import("./solutions/account-engagement/EngagementStudio")) },
      { id: "scoring",   label: "Scoring & Grading",  icon: Target,          path: "/marketing/account-engagement/scoring",   component: lazy(() => import("./solutions/account-engagement/Scoring")) },
    ],
  },
  {
    id: "personalization",
    name: "Personalization",
    short: "Personalization",
    tagline: "Real-time 1:1 experiences",
    description:
      "Deliver real-time, individualized experiences across web and app with interaction-time decisioning and recommendation recipes.",
    icon: Wand2,
    color: "pink",
    pages: [
      { id: "overview",  label: "Overview",          icon: LayoutDashboard, path: "/marketing/personalization",            component: lazy(() => import("./solutions/personalization/Overview")) },
      { id: "campaigns", label: "Web Campaigns",     icon: Sparkles,        path: "/marketing/personalization/campaigns",  component: lazy(() => import("./solutions/personalization/Campaigns")) },
      { id: "recipes",   label: "Recipes",           icon: Layers,          path: "/marketing/personalization/recipes",    component: lazy(() => import("./solutions/personalization/Recipes")) },
      { id: "decisions", label: "Einstein Decisions", icon: Brain,          path: "/marketing/personalization/decisions",  component: lazy(() => import("./solutions/personalization/Decisions")) },
    ],
  },
  {
    id: "datacloud",
    name: "Data Cloud",
    short: "Data Cloud",
    tagline: "Unified profiles & segmentation (CDP)",
    description:
      "Unify every data source into a single customer profile, resolve identities, build segments, and activate audiences anywhere.",
    icon: Database,
    color: "indigo",
    pages: [
      { id: "overview",   label: "Overview",            icon: LayoutDashboard, path: "/marketing/datacloud",            component: lazy(() => import("./solutions/datacloud/Overview")) },
      { id: "streams",    label: "Data Streams",        icon: Share2,          path: "/marketing/datacloud/streams",    component: lazy(() => import("./solutions/datacloud/DataStreams")) },
      { id: "identity",   label: "Identity Resolution", icon: Fingerprint,     path: "/marketing/datacloud/identity",   component: lazy(() => import("./solutions/datacloud/Identity")) },
      { id: "segments",   label: "Segments",            icon: PieChart,        path: "/marketing/datacloud/segments",   component: lazy(() => import("./solutions/datacloud/Segments")) },
      { id: "activation", label: "Activation",          icon: Rocket,          path: "/marketing/datacloud/activation", component: lazy(() => import("./solutions/datacloud/Activation")) },
    ],
  },
  {
    id: "intelligence",
    name: "Intelligence",
    short: "Intelligence",
    tagline: "Cross-channel analytics & attribution",
    description:
      "Connect, harmonize, and visualize marketing performance across every channel with unified analytics and multi-touch attribution.",
    icon: BarChart3,
    color: "amber",
    pages: [
      { id: "overview",    label: "Overview",         icon: LayoutDashboard, path: "/marketing/intelligence",             component: lazy(() => import("./solutions/intelligence/Overview")) },
      { id: "channels",    label: "Channel Analytics", icon: LineChart,      path: "/marketing/intelligence/channels",    component: lazy(() => import("./solutions/intelligence/ChannelPerformance")) },
      { id: "attribution", label: "Attribution",      icon: Crosshair,       path: "/marketing/intelligence/attribution", component: lazy(() => import("./solutions/intelligence/Attribution")) },
      { id: "reports",     label: "Reports",          icon: FileBarChart,    path: "/marketing/intelligence/reports",     component: lazy(() => import("./solutions/intelligence/Reports")) },
    ],
  },
  {
    id: "einstein",
    name: "Einstein",
    short: "Einstein AI",
    tagline: "Generative & predictive marketing AI",
    description:
      "Put AI to work — generate on-brand content, run experiments, and surface predictive insights to optimize every campaign.",
    icon: Bot,
    color: "emerald",
    pages: [
      { id: "overview",    label: "Overview",            icon: LayoutDashboard, path: "/marketing/einstein",             component: lazy(() => import("./solutions/einstein/Overview")) },
      { id: "content",     label: "Content Generation",  icon: Sparkles,        path: "/marketing/einstein/content",     component: lazy(() => import("./solutions/einstein/ContentGeneration")) },
      { id: "experiments", label: "Experiments",         icon: FlaskConical,    path: "/marketing/einstein/experiments", component: lazy(() => import("./solutions/einstein/Experiments")) },
      { id: "predictive",  label: "Predictive Insights", icon: Lightbulb,       path: "/marketing/einstein/predictive",  component: lazy(() => import("./solutions/einstein/Predictive")) },
    ],
  },
  {
    id: "commerce",
    name: "Commerce",
    short: "Commerce",
    tagline: "Commerce marketing & order insights",
    description:
      "Connect marketing to revenue — track orders, channel mix, and storefront performance to drive commerce growth.",
    icon: ShoppingCart,
    color: "rose",
    pages: [
      { id: "overview",  label: "Overview",   icon: LayoutDashboard, path: "/marketing/commerce",           component: lazy(() => import("./solutions/commerce/Overview")) },
      { id: "orders",    label: "Orders",     icon: Package,         path: "/marketing/commerce/orders",    component: lazy(() => import("./solutions/commerce/Orders")) },
      { id: "audiences", label: "Audiences",  icon: Crosshair,       path: "/marketing/commerce/audiences", component: lazy(() => import("./solutions/commerce/Audiences")) },
    ],
  },
  {
    id: "social",
    name: "Social",
    short: "Social",
    tagline: "Publish, schedule & grow social",
    description:
      "Push Einstein- and Content-Builder-generated content to Facebook, Instagram, WhatsApp, X, LinkedIn and more — schedule, publish, and grow engagement and following from one hub.",
    icon: Share2,
    color: "sky",
    pages: [
      { id: "composer",  label: "Composer",  icon: Sparkles,      path: "/marketing/social",           component: lazy(() => import("./solutions/social/Composer")) },
      { id: "calendar",  label: "Calendar",  icon: CalendarClock, path: "/marketing/social/calendar",  component: lazy(() => import("./solutions/social/Calendar")) },
      { id: "inbox",     label: "Inbox",     icon: Inbox,         path: "/marketing/social/inbox",     component: lazy(() => import("./solutions/social/Inbox")) },
      { id: "growth",    label: "Growth",    icon: TrendingUp,    path: "/marketing/social/growth",    component: lazy(() => import("./solutions/social/Growth")) },
      { id: "accounts",  label: "Accounts",  icon: Share2,        path: "/marketing/social/accounts",  component: lazy(() => import("./solutions/social/Accounts")) },
      { id: "analytics", label: "Analytics", icon: BarChart3,     path: "/marketing/social/analytics", component: lazy(() => import("./solutions/social/Analytics")) },
    ],
  },
];

/** Flat route table consumed by the router. */
export const MARKETING_ROUTES = SOLUTIONS.flatMap((s) =>
  s.pages.map((p) => ({ path: p.path, Component: p.component }))
);

/** Find the solution that owns a given pathname. */
export function getSolutionByPath(pathname) {
  // Prefer the most specific (longest) matching root path.
  let match = null;
  for (const s of SOLUTIONS) {
    const root = s.pages[0].path;
    if (pathname === root || pathname.startsWith(root + "/")) {
      if (!match || root.length > match.pages[0].path.length) match = s;
    }
  }
  return match;
}

/** Accent color classes keyed by solution color. Static strings for Tailwind. */
export const SOLUTION_COLORS = {
  violet: { text: "text-violet-600 dark:text-violet-400", bg: "bg-violet-600", soft: "bg-violet-50 dark:bg-violet-500/10", softText: "text-violet-700 dark:text-violet-400", ring: "ring-violet-500/30", grad: "from-violet-500 to-purple-600", chip: "bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400", stat: "violet" },
  sky:    { text: "text-sky-600 dark:text-sky-400",       bg: "bg-sky-600",    soft: "bg-sky-50 dark:bg-sky-500/10",       softText: "text-sky-700 dark:text-sky-400",       ring: "ring-sky-500/30",    grad: "from-sky-500 to-blue-600",      chip: "bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400",          stat: "sky" },
  pink:   { text: "text-pink-600 dark:text-pink-400",     bg: "bg-pink-600",   soft: "bg-pink-50 dark:bg-pink-500/10",     softText: "text-pink-700 dark:text-pink-400",     ring: "ring-pink-500/30",   grad: "from-pink-500 to-rose-600",     chip: "bg-pink-50 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400",       stat: "red" },
  indigo: { text: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-600", soft: "bg-indigo-50 dark:bg-indigo-500/10", softText: "text-indigo-700 dark:text-indigo-400", ring: "ring-indigo-500/30", grad: "from-indigo-500 to-violet-600", chip: "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400", stat: "indigo" },
  amber:  { text: "text-amber-600 dark:text-amber-400",   bg: "bg-amber-600",  soft: "bg-amber-50 dark:bg-amber-500/10",   softText: "text-amber-700 dark:text-amber-400",   ring: "ring-amber-500/30",  grad: "from-amber-500 to-orange-600",  chip: "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",    stat: "amber" },
  emerald:{ text: "text-emerald-600 dark:text-emerald-400",bg: "bg-emerald-600",soft: "bg-emerald-50 dark:bg-emerald-500/10",softText: "text-emerald-700 dark:text-emerald-400",ring: "ring-emerald-500/30",grad: "from-emerald-500 to-teal-600",  chip: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400", stat: "emerald" },
  rose:   { text: "text-rose-600 dark:text-rose-400",     bg: "bg-rose-600",   soft: "bg-rose-50 dark:bg-rose-500/10",     softText: "text-rose-700 dark:text-rose-400",     ring: "ring-rose-500/30",   grad: "from-rose-500 to-pink-600",     chip: "bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400",       stat: "red" },
};

export const colorOf = (c) => SOLUTION_COLORS[c] ?? SOLUTION_COLORS.violet;
