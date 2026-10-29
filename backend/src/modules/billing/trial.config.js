export const PLAN_TRIAL_DURATIONS = Object.freeze({
  starter: 14,
  standard: 14,
  premium: 30,
  enterprise: 30,
  executive: 30,
});
export const TRIAL_DURATION_DAYS = PLAN_TRIAL_DURATIONS.starter;

export function trialDurationDays(planId = "starter") {
  return PLAN_TRIAL_DURATIONS[planId] ?? TRIAL_DURATION_DAYS;
}

export function trialDurationLabel(planId = "starter") {
  return trialDurationDays(planId) === 30 ? "one-month" : `${trialDurationDays(planId)}-day`;
}

export function paddleTrialPeriodForPlan(planId = "starter") {
  return trialDurationDays(planId) === 30
    ? { interval: "month", frequency: 1 }
    : { interval: "day", frequency: 14 };
}

export function trialEndsAtFrom(startedAt = new Date(), planId = "starter") {
  if (trialDurationDays(planId) !== 30) {
    return new Date(startedAt.getTime() + trialDurationDays(planId) * 24 * 60 * 60 * 1000);
  }

  const end = new Date(startedAt);
  const dayOfMonth = end.getUTCDate();
  end.setUTCDate(1);
  end.setUTCMonth(end.getUTCMonth() + 1);
  const lastDayOfMonth = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0)).getUTCDate();
  end.setUTCDate(Math.min(dayOfMonth, lastDayOfMonth));
  return end;
}

export function trialPeriodDays(period) {
  if (!period || !Number.isFinite(period.frequency) || period.frequency <= 0) return null;
  const days = ({ day: 1, week: 7, month: 30 })[period.interval];
  return days ? days * period.frequency : null;
}

export function hasPaddleTrialPeriod(period, planId = "starter") {
  const expected = paddleTrialPeriodForPlan(planId);
  return period?.interval === expected.interval && period?.frequency === expected.frequency;
}

export function hasPlanAccess(tenant, now = new Date()) {
  if (!tenant.trialEndsAt) return true;
  if (new Date(tenant.trialEndsAt) > now) return true;
  return tenant.providerPlanId === tenant.plan;
}
