export const TRIAL_DURATION_DAYS = 14;

export function trialEndsAtFrom(startedAt = new Date()) {
  return new Date(startedAt.getTime() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000);
}

export function trialPeriodDays(period) {
  if (!period || !Number.isFinite(period.frequency) || period.frequency <= 0) return null;
  const days = ({ day: 1, week: 7, month: 30 })[period.interval];
  return days ? days * period.frequency : null;
}

export function hasPaddleTrialPeriod(period) {
  return trialPeriodDays(period) === TRIAL_DURATION_DAYS;
}

export function hasPlanAccess(tenant, now = new Date()) {
  if (!tenant.trialEndsAt) return true;
  if (new Date(tenant.trialEndsAt) > now) return true;
  return tenant.providerPlanId === tenant.plan;
}
