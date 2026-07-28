/**
 * Reward system — points catalog, tiers, badges, and the pure rules that turn
 * activity into points. Everything here is dependency-free and side-effect-free
 * so it can be unit-tested and shared by the service, the tracking middleware,
 * and (via the API) the UI's "how to earn" panel.
 *
 * Three tracked dimensions:
 *   • navigation  — visiting the app's sections (breadth of engagement)
 *   • usage       — maintaining the workspace (edits, cleanup, small actions)
 *   • performance — producing work (creating records / completing actions)
 */

// ── Point values ─────────────────────────────────────────────────────────────
export const POINTS = {
  navVisit: 5, // per section, once/day
  create: 10, // POST on a core module (produced work)
  update: 4, // PUT/PATCH
  remove: 2, // DELETE
};

// Per-day, per-user caps so points reflect real work, not farming.
// navigation is additionally deduped to once per section per day (see service).
export const DAILY_CAPS = {
  navigation: 60, // ~12 section visits
  usage: 120,
  performance: 200,
};

// ── Sections (client navigation) ─────────────────────────────────────────────
// Maps a client route to a human label. Longest matching prefix wins.
export const SECTIONS = {
  "/overview": "Executive Overview",
  "/crm": "CRM",
  "/marketing": "Marketing",
  "/network": "Network",
  "/analytics": "Analytics",
  "/services": "Business Services",
  "/rewards": "Rewards",
  "/account": "Account",
  "/home": "Home",
};

/** Resolve a client path to a navigation award, or null if it's not a section. */
export function navAward(path) {
  if (typeof path !== "string" || !path) return null;
  const clean = path.split("?")[0].split("#")[0];
  const key = Object.keys(SECTIONS)
    .sort((a, b) => b.length - a.length)
    .find((p) => clean === p || clean.startsWith(p + "/"));
  if (!key) return null;
  return { category: "navigation", type: `visit:${key}`, points: POINTS.navVisit, label: `Visited ${SECTIONS[key]}`, section: SECTIONS[key], key };
}

// ── Core modules eligible for usage/performance points ───────────────────────
export const MODULE_LABELS = {
  crm: "CRM",
  marketing: "Marketing",
  network: "Network",
  analytics: "Analytics",
  services: "Business Services",
};

/**
 * Resolve a successful mutating API request to a usage/performance award.
 * `path` is the API path AFTER the `/api` prefix, e.g. "/crm/contacts".
 * Creating new work-product (POST) is "performance"; edits/cleanup are "usage".
 * Returns null for reads, unknown modules, and non-mutating methods.
 */
export function actionAward(method, path) {
  if (typeof path !== "string") return null;
  const m = String(method || "").toUpperCase();
  const seg = path.replace(/^\/+/, "").split(/[/?#]/)[0];
  const label = MODULE_LABELS[seg];
  if (!label) return null;
  switch (m) {
    case "POST":
      return { category: "performance", type: `create:${seg}`, points: POINTS.create, label: `Produced work in ${label}` };
    case "PUT":
    case "PATCH":
      return { category: "usage", type: `update:${seg}`, points: POINTS.update, label: `Updated ${label}` };
    case "DELETE":
      return { category: "usage", type: `delete:${seg}`, points: POINTS.remove, label: `Tidied up ${label}` };
    default:
      return null;
  }
}

// ── Levels / tiers ───────────────────────────────────────────────────────────
export const LEVELS = [
  { level: 1, name: "Newcomer", min: 0 },
  { level: 2, name: "Contributor", min: 150 },
  { level: 3, name: "Operator", min: 500 },
  { level: 4, name: "Specialist", min: 1200 },
  { level: 5, name: "Expert", min: 2500 },
  { level: 6, name: "Leader", min: 5000 },
  { level: 7, name: "Executive", min: 9000 },
  { level: 8, name: "Legend", min: 15000 },
];

/** Level info for a point total, plus progress toward the next tier. */
export function levelFor(points) {
  const p = Math.max(0, Number(points) || 0);
  let cur = LEVELS[0];
  for (const l of LEVELS) if (p >= l.min) cur = l;
  const next = LEVELS.find((l) => l.min > p) || null;
  const span = next ? next.min - cur.min : 0;
  const into = p - cur.min;
  return {
    level: cur.level,
    name: cur.name,
    min: cur.min,
    next: next ? { level: next.level, name: next.name, min: next.min } : null,
    pointsToNext: next ? next.min - p : 0,
    progress: next ? Math.min(1, span ? into / span : 0) : 1,
  };
}

// ── Badges ───────────────────────────────────────────────────────────────────
// Each badge's `test` receives an enriched stat: the RewardStat fields plus
// { level, rank, sectionsVisited }. Missing fields simply fail the test.
export const BADGES = [
  { id: "first_steps", name: "First Steps", icon: "👣", desc: "Earn your first points", test: (s) => s.points > 0 },
  { id: "explorer", name: "Explorer", icon: "🧭", desc: "Visit 6 different sections", test: (s) => (s.sectionsVisited || 0) >= 6 },
  { id: "streak_7", name: "On a Roll", icon: "🔥", desc: "7-day activity streak", test: (s) => (s.longestStreak || 0) >= 7 },
  { id: "streak_30", name: "Unstoppable", icon: "⚡", desc: "30-day activity streak", test: (s) => (s.longestStreak || 0) >= 30 },
  { id: "producer", name: "Producer", icon: "🏭", desc: "1,000 performance points", test: (s) => (s.perfPoints || 0) >= 1000 },
  { id: "power_user", name: "Power User", icon: "💪", desc: "500 workspace actions", test: (s) => (s.eventsCount || 0) >= 500 },
  { id: "expert", name: "Expert", icon: "🎓", desc: "Reach level 5", test: (s) => (s.level || 1) >= 5 },
  { id: "podium", name: "Podium", icon: "🏅", desc: "Rank top 3 in your org", test: (s) => s.rank != null && s.rank <= 3 },
];

/** Ids of every badge a stat currently earns. */
export function evaluateBadges(stat) {
  return BADGES.filter((b) => {
    try {
      return b.test(stat);
    } catch {
      return false;
    }
  }).map((b) => b.id);
}

// ── Day keys (UTC) ───────────────────────────────────────────────────────────
/** "YYYY-MM-DD" for a Date (UTC). */
export function dayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

/** The day key immediately before `key`. */
export function previousDayKey(key) {
  const d = new Date(`${key}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return dayKey(d);
}

/**
 * Next streak value given the last active day, today, and the current streak.
 * Same day → unchanged; consecutive day → +1; any gap → reset to 1.
 */
export function nextStreak(lastDay, today, current) {
  if (lastDay === today) return current || 1;
  if (lastDay && previousDayKey(today) === lastDay) return (current || 0) + 1;
  return 1;
}

// Catalog surfaced to the UI's "How to earn" panel.
export const EARN_GUIDE = [
  { icon: "🧭", title: "Explore the platform", detail: `Visit each section — +${POINTS.navVisit} per section, once a day.`, category: "navigation" },
  { icon: "🏭", title: "Get work done", detail: `Create records and complete actions — +${POINTS.create} each.`, category: "performance" },
  { icon: "🔧", title: "Keep things current", detail: `Update and maintain your workspace — +${POINTS.update} each.`, category: "usage" },
  { icon: "🔥", title: "Show up daily", detail: "Build an activity streak and climb the leaderboard.", category: "streak" },
];
