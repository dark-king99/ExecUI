import assert from "node:assert/strict";
import test from "node:test";
import { TRIAL_DURATION_DAYS, hasPaddleTrialPeriod, hasPlanAccess, trialDurationDays, trialEndsAtFrom, trialPeriodDays } from "../src/modules/billing/trial.config.js";

test("trial access lasts 14 days", () => {
  const startedAt = new Date("2026-10-21T12:00:00.000Z");
  assert.equal(TRIAL_DURATION_DAYS, 14);
  assert.equal(trialEndsAtFrom(startedAt).toISOString(), "2026-11-04T12:00:00.000Z");
});

test("trial duration follows the selected plan", () => {
  const startedAt = new Date("2026-10-21T12:00:00.000Z");
  assert.equal(trialDurationDays("starter"), 14);
  assert.equal(trialDurationDays("standard"), 14);
  assert.equal(trialDurationDays("premium"), 30);
  assert.equal(trialDurationDays("enterprise"), 30);
  assert.equal(trialDurationDays("executive"), 30);
  assert.equal(trialEndsAtFrom(startedAt, "premium").toISOString(), "2026-11-21T12:00:00.000Z");
  assert.equal(
    trialEndsAtFrom(new Date("2026-01-31T12:00:00.000Z"), "premium").toISOString(),
    "2026-02-28T12:00:00.000Z",
  );
});

test("existing tenants without trial metadata retain access", () => {
  assert.equal(hasPlanAccess({ plan: "executive", providerPlanId: null, trialEndsAt: null }), true);
});

test("trial access is available up to but not at the expiry instant", () => {
  const ends = new Date("2026-11-04T12:00:00.000Z");
  assert.equal(hasPlanAccess({ plan: "starter", providerPlanId: null, trialEndsAt: ends }, new Date(ends.getTime() - 1)), true);
  assert.equal(hasPlanAccess({ plan: "starter", providerPlanId: null, trialEndsAt: ends }, ends), false);
});

test("confirmed plans remain accessible after trial expiry", () => {
  const tenant = { plan: "premium", providerPlanId: "premium", trialEndsAt: "2026-11-04T12:00:00.000Z" };
  assert.equal(hasPlanAccess(tenant, new Date("2026-11-05T12:00:00.000Z")), true);
});

test("an unconfirmed plan is restricted after trial expiry", () => {
  const tenant = { plan: "premium", providerPlanId: null, trialEndsAt: "2026-11-04T12:00:00.000Z" };
  assert.equal(hasPlanAccess(tenant, new Date("2026-11-05T12:00:00.000Z")), false);
});

test("Paddle price trials must match the selected plan's free trial", () => {
  assert.equal(trialPeriodDays({ interval: "day", frequency: 14 }), 14);
  assert.equal(trialPeriodDays({ interval: "week", frequency: 2 }), 14);
  assert.equal(hasPaddleTrialPeriod({ interval: "day", frequency: 14 }, "starter"), true);
  assert.equal(hasPaddleTrialPeriod({ interval: "day", frequency: 14 }, "standard"), true);
  assert.equal(hasPaddleTrialPeriod({ interval: "day", frequency: 14 }, "premium"), false);
  assert.equal(trialPeriodDays({ interval: "day", frequency: 13 }), 13);
  assert.equal(trialPeriodDays({ interval: "month", frequency: 2 }), 60);
  assert.equal(hasPaddleTrialPeriod({ interval: "month", frequency: 1 }, "premium"), true);
  assert.equal(hasPaddleTrialPeriod({ interval: "month", frequency: 1 }, "executive"), true);
  assert.equal(hasPaddleTrialPeriod({ interval: "day", frequency: 30 }, "premium"), false);
  assert.equal(trialPeriodDays(null), null);
});
