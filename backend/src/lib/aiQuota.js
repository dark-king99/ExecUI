/**
 * Per-plan AI usage quota — enforces each tenant's monthly AI-assist allowance.
 *
 * Only consumed when a live AI provider is configured (see lib/ai.js). In the
 * default deterministic mode there is no external cost, so we don't meter it.
 *
 * Usage is tracked in the AiUsage table, one row per (tenant, calendar month).
 * The period rolls over automatically — a new month simply starts a new row.
 */
import prisma from "../config/database.js";
import { runUnscoped } from "./tenantContext.js";
import { aiLimitFor } from "../modules/billing/plans.config.js";
import { aiConfigured } from "./ai.js";

class QuotaError extends Error {
  constructor(message, limit) {
    super(message);
    this.status = 429;
    this.code = "AI_QUOTA_EXCEEDED";
    this.limit = limit;
  }
}

const period = (d = new Date()) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

// The tenant's plan is the source of truth for the allowance. Tenant lookups are
// unscoped (the Tenant row is not itself tenant-filtered).
async function planFor(tenantId) {
  const tenant = await runUnscoped(() =>
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { plan: true } })
  );
  return tenant?.plan || "executive";
}

/** Current month's usage + the plan limit (for surfacing in the UI). */
export async function getUsage(tenantId) {
  const p = period();
  const [row, plan] = await Promise.all([
    prisma.aiUsage.findFirst({ where: { tenantId, period: p }, select: { count: true } }),
    planFor(tenantId),
  ]);
  const limit = aiLimitFor(plan);
  const used = row?.count ?? 0;
  return {
    configured: aiConfigured(),
    plan,
    period: p,
    used,
    limit,
    remaining: Math.max(limit - used, 0),
  };
}

/**
 * Reserve one AI request for this tenant this month.
 * - No live provider ⇒ returns { metered:false } (deterministic mode, free).
 * - Over the plan limit ⇒ throws QuotaError (HTTP 429).
 * - Otherwise increments the counter and returns { metered:true, used, limit }.
 *
 * Call this BEFORE hitting the model, so we only bill within the allowance.
 */
export async function consume(tenantId) {
  if (!aiConfigured()) return { metered: false };

  const p = period();
  const plan = await planFor(tenantId);
  const limit = aiLimitFor(plan);

  // Atomic-ish: read, check, then increment via upsert. Race windows can only
  // over-count by the number of concurrent requests, which is acceptable here.
  const existing = await prisma.aiUsage.findFirst({ where: { tenantId, period: p }, select: { count: true } });
  const used = existing?.count ?? 0;
  if (used >= limit) {
    throw new QuotaError(
      `Your plan's monthly AI allowance (${limit.toLocaleString()} requests) is used up. It resets next month, or upgrade for more.`,
      limit,
    );
  }

  await prisma.aiUsage.upsert({
    where: { tenantId_period: { tenantId, period: p } },
    create: { tenantId, period: p, count: 1 },
    update: { count: { increment: 1 } },
  });

  return { metered: true, used: used + 1, limit };
}

export { QuotaError };
