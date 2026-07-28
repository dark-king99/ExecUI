/**
 * Reward service — records point-earning events and reads the leaderboard /
 * personal profiles. All queries run inside the caller's tenant context, so
 * everything is automatically isolated to the organization (see
 * config/database.js). The leaderboard is intentionally readable by every
 * employee — it's an org-wide view.
 */
import prisma from "../../config/database.js";
import {
  POINTS, LEVELS, BADGES, DAILY_CAPS, EARN_GUIDE,
  levelFor, evaluateBadges, dayKey, nextStreak, navAward, actionAward,
} from "./rewards.config.js";

const startOfDayUTC = (today) => new Date(`${today}T00:00:00.000Z`);
const bucketFor = (category) =>
  category === "navigation" ? "navPoints" : category === "performance" ? "perfPoints" : "usagePoints";

/**
 * Record a single award for a user, applying anti-abuse caps:
 *  • navigation is deduped to once per section per day
 *  • every category has a daily point ceiling
 * Returns { awarded, capped }. Never throws — callers (incl. fire-and-forget
 * middleware) can ignore the result.
 */
export async function recordEvent(userId, award, detail = null) {
  if (!userId || !award || !award.category) return { awarded: 0 };
  try {
    const today = dayKey();
    const dayStart = startOfDayUTC(today);

    if (award.category === "navigation") {
      const seen = await prisma.rewardEvent.count({
        where: { userId, type: award.type, createdAt: { gte: dayStart } },
      });
      if (seen > 0) return { awarded: 0, capped: true };
    }

    let points = Math.max(0, award.points | 0);
    const cap = DAILY_CAPS[award.category];
    if (cap != null) {
      const agg = await prisma.rewardEvent.aggregate({
        _sum: { points: true },
        where: { userId, category: award.category, createdAt: { gte: dayStart } },
      });
      const used = agg._sum.points || 0;
      points = Math.max(0, Math.min(points, cap - used));
    }
    if (points <= 0) return { awarded: 0, capped: true };

    await prisma.rewardEvent.create({
      data: { userId, category: award.category, type: award.type, points, detail: detail ?? award.label ?? null },
    });
    await bumpStat(userId, award.category, points, today);
    return { awarded: points };
  } catch {
    // Rewards are best-effort; never let tracking break the underlying request.
    return { awarded: 0, error: true };
  }
}

/** Upsert the running rollup and advance the activity streak. */
async function bumpStat(userId, category, points, today) {
  const bucket = bucketFor(category);
  const existing = await prisma.rewardStat.findFirst({ where: { userId } });
  if (!existing) {
    try {
      await prisma.rewardStat.create({
        data: { userId, points, [bucket]: points, eventsCount: 1, currentStreak: 1, longestStreak: 1, lastActiveDay: today },
      });
      return;
    } catch {
      // Lost a race to create the row — fall through to update the winner.
    }
  }
  const row = existing || (await prisma.rewardStat.findFirst({ where: { userId } }));
  if (!row) return;
  const streak = nextStreak(row.lastActiveDay, today, row.currentStreak);
  await prisma.rewardStat.update({
    where: { id: row.id },
    data: {
      points: row.points + points,
      [bucket]: row[bucket] + points,
      eventsCount: row.eventsCount + 1,
      currentStreak: streak,
      longestStreak: Math.max(row.longestStreak, streak),
      lastActiveDay: today,
    },
  });
}

/** Award navigation points for visiting a client route. */
export function trackNavigation(userId, path) {
  const award = navAward(path);
  if (!award) return Promise.resolve({ awarded: 0 });
  return recordEvent(userId, award, award.label);
}

/** Award usage/performance points for a successful mutating request. */
export function recordAction(userId, method, path) {
  const award = actionAward(method, path);
  if (!award) return Promise.resolve({ awarded: 0 });
  return recordEvent(userId, award, award.label);
}

const windowStart = (range) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - (range === "week" ? 7 : 30));
  return d;
};

/**
 * Org-wide leaderboard. `range`: "all" (lifetime rollup) | "month" | "week"
 * (points earned in the window). Every active member appears, ranked.
 */
export async function getLeaderboard({ range = "all", limit = 100 } = {}) {
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, firstName: true, lastName: true, avatarUrl: true, department: true, jobTitle: true },
  });

  const pointsByUser = new Map();
  const streakByUser = new Map();
  if (range === "all") {
    const stats = await prisma.rewardStat.findMany({
      select: { userId: true, points: true, currentStreak: true, longestStreak: true },
    });
    for (const s of stats) {
      pointsByUser.set(s.userId, s.points);
      streakByUser.set(s.userId, { current: s.currentStreak, longest: s.longestStreak });
    }
  } else {
    const grouped = await prisma.rewardEvent.groupBy({
      by: ["userId"],
      where: { createdAt: { gte: windowStart(range) } },
      _sum: { points: true },
    });
    for (const g of grouped) pointsByUser.set(g.userId, g._sum.points || 0);
  }

  const rows = users
    .map((u) => {
      const points = pointsByUser.get(u.id) || 0;
      const lvl = levelFor(points);
      const streak = streakByUser.get(u.id) || { current: 0, longest: 0 };
      return {
        userId: u.id,
        name: `${u.firstName} ${u.lastName}`.trim() || "Member",
        avatarUrl: u.avatarUrl || null,
        department: u.department || null,
        jobTitle: u.jobTitle || null,
        points,
        level: lvl.level,
        levelName: lvl.name,
        currentStreak: streak.current,
        longestStreak: streak.longest,
      };
    })
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));

  rows.forEach((r, i) => {
    r.rank = i + 1;
    r.badges = evaluateBadges({ points: r.points, level: r.level, rank: r.rank, longestStreak: r.longestStreak });
  });

  return {
    range,
    memberCount: rows.length,
    updatedAt: new Date().toISOString(),
    leaderboard: rows.slice(0, limit),
  };
}

const EMPTY_STAT = { points: 0, navPoints: 0, usagePoints: 0, perfPoints: 0, eventsCount: 0, currentStreak: 0, longestStreak: 0, lastActiveDay: null };

/** Detailed personal profile for one user (self or a colleague). */
export async function getForUser(userId) {
  const user = await prisma.user.findFirst({
    where: { id: userId },
    select: { id: true, firstName: true, lastName: true, avatarUrl: true, department: true, jobTitle: true },
  });
  if (!user) return null;

  const stat = (await prisma.rewardStat.findFirst({ where: { userId } })) || EMPTY_STAT;
  const [higher, memberCount, navTypes, recent, windowEvents] = await Promise.all([
    prisma.rewardStat.count({ where: { points: { gt: stat.points } } }),
    prisma.user.count({ where: { isActive: true } }),
    prisma.rewardEvent.groupBy({ by: ["type"], where: { userId, category: "navigation" } }),
    prisma.rewardEvent.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.rewardEvent.findMany({
      where: { userId, createdAt: { gte: startOfDayUTC(dayKey(new Date(Date.now() - 13 * 864e5))) } },
      select: { points: true, createdAt: true },
    }),
  ]);

  const rank = stat.points > 0 ? higher + 1 : memberCount; // no points ⇒ last
  const lvl = levelFor(stat.points);
  const enriched = { ...stat, level: lvl.level, rank, sectionsVisited: navTypes.length };
  const earned = new Set(evaluateBadges(enriched));

  return {
    user: {
      id: user.id,
      name: `${user.firstName} ${user.lastName}`.trim() || "Member",
      avatarUrl: user.avatarUrl || null,
      department: user.department || null,
      jobTitle: user.jobTitle || null,
    },
    points: stat.points,
    rank,
    memberCount,
    sectionsVisited: navTypes.length,
    breakdown: { navigation: stat.navPoints, usage: stat.usagePoints, performance: stat.perfPoints },
    streak: { current: stat.currentStreak, longest: stat.longestStreak, lastActiveDay: stat.lastActiveDay },
    level: lvl,
    badges: BADGES.map((b) => ({ id: b.id, name: b.name, icon: b.icon, desc: b.desc, earned: earned.has(b.id) })),
    recent: recent.map((e) => ({ id: e.id, category: e.category, type: e.type, points: e.points, detail: e.detail, createdAt: e.createdAt })),
    activitySeries: buildDailySeries(windowEvents, 14),
  };
}

/** Points-per-day for the last `days` days (oldest → newest). */
function buildDailySeries(events, days) {
  const buckets = new Map();
  for (let i = days - 1; i >= 0; i--) buckets.set(dayKey(new Date(Date.now() - i * 864e5)), 0);
  for (const e of events) {
    const k = dayKey(new Date(e.createdAt));
    if (buckets.has(k)) buckets.set(k, buckets.get(k) + e.points);
  }
  return Array.from(buckets, ([day, points]) => ({ day, points }));
}

/** The rules/tiers/badges catalog — powers the UI's "how to earn" panel. */
export function getConfig() {
  return {
    points: POINTS,
    dailyCaps: DAILY_CAPS,
    levels: LEVELS,
    badges: BADGES.map((b) => ({ id: b.id, name: b.name, icon: b.icon, desc: b.desc })),
    earnGuide: EARN_GUIDE,
  };
}
