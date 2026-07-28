import test from "node:test";
import assert from "node:assert/strict";
import {
  POINTS, DAILY_CAPS, LEVELS,
  navAward, actionAward, levelFor, nextStreak, evaluateBadges,
  dayKey, previousDayKey,
} from "../src/modules/rewards/rewards.config.js";

test("navigation award maps a route to its section, once-per-section value", () => {
  const a = navAward("/crm/contacts/123");
  assert.equal(a.category, "navigation");
  assert.equal(a.type, "visit:/crm");
  assert.equal(a.section, "CRM");
  assert.equal(a.points, POINTS.navVisit);
});

test("navigation award uses the longest matching prefix", () => {
  assert.equal(navAward("/overview").type, "visit:/overview");
  assert.equal(navAward("/rewards").section, "Rewards");
});

test("navigation award ignores query/hash and unknown routes", () => {
  assert.equal(navAward("/crm?tab=x").type, "visit:/crm");
  assert.equal(navAward("/totally-unknown"), null);
  assert.equal(navAward(""), null);
  assert.equal(navAward(null), null);
});

test("action award: creating work is performance, edits/cleanup are usage", () => {
  assert.deepEqual(
    { c: actionAward("POST", "/crm/contacts").category, p: actionAward("POST", "/crm/contacts").points },
    { c: "performance", p: POINTS.create },
  );
  assert.equal(actionAward("PUT", "/marketing/campaigns/1").category, "usage");
  assert.equal(actionAward("PATCH", "/network/devices/1").points, POINTS.update);
  assert.equal(actionAward("DELETE", "/services/financial/x").points, POINTS.remove);
});

test("action award ignores reads and non-core modules", () => {
  assert.equal(actionAward("GET", "/crm/contacts"), null);
  assert.equal(actionAward("POST", "/account/profile"), null);
  assert.equal(actionAward("POST", "/rewards/track"), null); // no self-farming
  assert.equal(actionAward("POST", "/auth/login"), null);
});

test("levelFor returns tier + progress toward the next tier", () => {
  const l0 = levelFor(0);
  assert.equal(l0.level, 1);
  assert.equal(l0.name, "Newcomer");
  assert.equal(l0.progress, 0);

  const l = levelFor(325); // between 150 (L2) and 500 (L3)
  assert.equal(l.level, 2);
  assert.equal(l.next.level, 3);
  assert.equal(l.pointsToNext, 175);
  assert.ok(l.progress > 0.4 && l.progress < 0.6);

  const top = levelFor(999999);
  assert.equal(top.level, LEVELS[LEVELS.length - 1].level);
  assert.equal(top.next, null);
  assert.equal(top.progress, 1);
});

test("levelFor clamps negatives and non-numbers", () => {
  assert.equal(levelFor(-50).level, 1);
  assert.equal(levelFor("nope").level, 1);
});

test("streak: same day holds, consecutive day increments, gap resets", () => {
  assert.equal(nextStreak("2026-07-28", "2026-07-28", 4), 4); // same day
  assert.equal(nextStreak("2026-07-27", "2026-07-28", 4), 5); // consecutive
  assert.equal(nextStreak("2026-07-25", "2026-07-28", 4), 1); // gap resets
  assert.equal(nextStreak(null, "2026-07-28", 0), 1);         // first ever
});

test("day-key helpers are UTC and consistent", () => {
  assert.equal(dayKey(new Date("2026-07-28T23:59:00Z")), "2026-07-28");
  assert.equal(previousDayKey("2026-03-01"), "2026-02-28");
  assert.equal(previousDayKey("2026-01-01"), "2025-12-31");
});

test("badges unlock from an enriched stat", () => {
  assert.deepEqual(evaluateBadges({ points: 0 }), []);
  const earned = evaluateBadges({
    points: 3000, perfPoints: 1200, eventsCount: 600,
    longestStreak: 30, level: 5, rank: 1, sectionsVisited: 6,
  });
  for (const id of ["first_steps", "explorer", "streak_7", "streak_30", "producer", "power_user", "expert", "podium"]) {
    assert.ok(earned.includes(id), `expected badge ${id}`);
  }
});

test("daily caps are defined for every tracked category", () => {
  for (const cat of ["navigation", "usage", "performance"]) {
    assert.ok(Number.isFinite(DAILY_CAPS[cat]) && DAILY_CAPS[cat] > 0, `${cat} cap`);
  }
});
