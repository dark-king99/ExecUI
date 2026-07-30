/**
 * Helpdesk housekeeping — an hourly pass that expires portal sign-in links and
 * dead sessions.
 *
 * Tokens already refuse to work once expired; this deletes the rows so the table
 * doesn't accumulate stale credentials indefinitely. A hashed token nobody can
 * use is still a record of who contacted support and when, and keeping it
 * forever isn't a decision anyone made.
 *
 * `HELPDESK_SCHEDULER=off` disables it.
 */
import prisma from "../../config/database.js";
import { runUnscoped, runWithTenant } from "../../lib/tenantContext.js";
import { log } from "../../lib/logger.js";
import { purgeExpired } from "./portal.service.js";

const HOUR_MS = 3_600_000;
let timer = null;
let running = false;

export async function runHelpdeskSweep() {
  if (running) return { skipped: "already running" };
  running = true;
  const totals = { tenants: 0, links: 0, sessions: 0 };
  try {
    const tenants = await runUnscoped(async () => prisma.tenant.findMany({ select: { id: true } }));
    for (const { id: tenantId } of tenants) {
      try {
        const result = await runWithTenant({ tenantId }, async () => purgeExpired());
        totals.tenants++;
        totals.links += result.links;
        totals.sessions += result.sessions;
      } catch (e) {
        log.warn?.("portal_purge_failed", { tenantId, error: e.message });
      }
    }
    if (totals.links || totals.sessions) log.info?.("portal_purge", totals);
    return totals;
  } finally {
    running = false;
  }
}

export function startHelpdeskScheduler({ intervalMs = HOUR_MS } = {}) {
  if (process.env.HELPDESK_SCHEDULER === "off") {
    log.info?.("helpdesk_scheduler_disabled");
    return null;
  }
  if (timer) return timer;

  setTimeout(() => { runHelpdeskSweep().catch(() => {}); }, 120_000).unref?.();
  timer = setInterval(() => { runHelpdeskSweep().catch(() => {}); }, intervalMs);
  timer.unref?.();
  log.info?.("helpdesk_scheduler_started", { intervalMinutes: Math.round(intervalMs / 60_000) });
  return timer;
}

export function stopHelpdeskScheduler() {
  if (timer) clearInterval(timer);
  timer = null;
}
