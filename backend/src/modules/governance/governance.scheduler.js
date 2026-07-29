/**
 * Retention ticker — applies each tenant's retention policies once a day.
 *
 * Runs across all tenants, entering each one's context so the purge is scoped
 * by the tenant guard rather than by hand-written filters. Best-effort: a
 * failure in one tenant never stops the others.
 */
import prisma from "../../config/database.js";
import { runUnscoped, runWithTenant } from "../../lib/tenantContext.js";
import { log } from "../../lib/logger.js";
import { runRetention } from "./governance.service.js";

const DAY_MS = 86_400_000;
let timer = null;

/** Run retention for every tenant that has at least one active policy. */
export async function runRetentionForAllTenants() {
  const tenantIds = await runUnscoped(async () => {
    const rows = await prisma.retentionPolicy.findMany({
      where: { active: true }, select: { tenantId: true }, distinct: ["tenantId"],
    });
    return rows.map((r) => r.tenantId);
  });

  const summary = [];
  for (const tenantId of tenantIds) {
    try {
      const result = await runWithTenant({ tenantId }, async () => runRetention());
      const purged = result.results.reduce((n, r) => n + (r.purged || 0), 0);
      summary.push({ tenantId, purged });
      if (purged) log.info?.("retention_purge", { tenantId, purged });
    } catch (e) {
      summary.push({ tenantId, error: e.message });
      log.warn?.("retention_tenant_failed", { tenantId, error: e.message });
    }
  }
  return { tenants: tenantIds.length, summary };
}

export function startRetentionScheduler({ intervalMs = DAY_MS } = {}) {
  if (timer || process.env.RETENTION_SCHEDULER === "off") return;
  timer = setInterval(() => {
    runRetentionForAllTenants().catch((e) => log.error?.("retention_tick_failed", { error: e.message }));
  }, intervalMs);
  timer.unref?.();
  log.info?.("retention_scheduler_started", { intervalHours: intervalMs / 3_600_000 });
}

export function stopRetentionScheduler() {
  if (timer) { clearInterval(timer); timer = null; }
}
