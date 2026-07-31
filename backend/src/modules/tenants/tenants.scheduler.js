/**
 * Organization-purge ticker.
 *
 * Scheduled deletions become real here and nowhere else. Running on a timer
 * rather than in the request that asked for it is the point: the grace window
 * only means something if the destruction is genuinely deferred, and a tenant
 * whose window elapsed while the server was down is still picked up on the next
 * tick.
 *
 * Best-effort per tenant — one blocked by a legal hold is logged and skipped,
 * never allowed to stop the rest.
 */
import { log } from "../../lib/logger.js";
import { runScheduledPurges } from "./tenants.service.js";

const HOURS = Number(process.env.TENANT_PURGE_INTERVAL_HOURS) || 24;

let timer = null;

export function startTenantScheduler() {
  const tick = async () => {
    try {
      const { due, purged, blocked } = await runScheduledPurges();
      if (due) log.info("tenant_purge_run", { due, purged: purged.length, blocked: blocked.length });
      for (const b of blocked) log.warn("tenant_purge_skipped", { tenantId: b.id, reason: b.reason });
    } catch (e) {
      log.error("tenant_purge_failed", { error: e.message });
    }
  };
  // Not on boot: a deploy shouldn't be the thing that destroys an organization.
  // First sweep is one interval in.
  timer = setInterval(tick, HOURS * 3_600_000);
  timer.unref?.();
  log.info("tenant_scheduler_started", { intervalHours: HOURS });
  return timer;
}

export function stopTenantScheduler() {
  if (timer) clearInterval(timer);
  timer = null;
}
