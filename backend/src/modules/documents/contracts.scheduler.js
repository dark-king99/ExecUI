/**
 * CLM ticker — one daily pass that does two jobs:
 *   • contract renewal reminders, auto-renewals and expiries
 *   • closing out signature envelopes that ran past their expiry date
 *
 * Both are per-tenant, and each tenant is entered through `runWithTenant` so the
 * tenant guard scopes the queries rather than hand-written filters. Deliberately
 * one ticker rather than two: this module's background work is a single daily
 * sweep, and splitting it would only add another timer to reason about.
 *
 * `CLM_SCHEDULER=off` disables it (useful in tests and one-off scripts).
 */
import prisma from "../../config/database.js";
import { runWithTenant, runUnscoped } from "../../lib/tenantContext.js";
import { log } from "../../lib/logger.js";
import { runContractReminders, startContractHooks, stopContractHooks } from "./contracts.service.js";
import { expireStaleRequests } from "./signatures.service.js";

const DAY_MS = 86_400_000;
let timer = null;
let running = false;

/** One pass across every tenant. Exported so it can be triggered manually. */
export async function runClmSweep() {
  if (running) return { skipped: "already running" };
  running = true;
  const totals = { tenants: 0, reminded: 0, expired: 0, autoRenewed: 0, envelopesExpired: 0 };

  try {
    const tenants = await runUnscoped(async () => prisma.tenant.findMany({ select: { id: true } }));

    for (const { id: tenantId } of tenants) {
      try {
        const result = await runWithTenant({ tenantId }, async () => runContractReminders());
        totals.tenants++;
        totals.reminded += result.reminded;
        totals.expired += result.expired;
        totals.autoRenewed += result.autoRenewed;
      } catch (e) {
        log.warn?.("clm_tenant_sweep_failed", { tenantId, error: e.message });
      }
    }

    // Envelope expiry sweeps every tenant in one query and enters each row's
    // own context internally.
    try {
      const { expired } = await expireStaleRequests();
      totals.envelopesExpired = expired;
    } catch (e) {
      log.warn?.("signature_expiry_sweep_failed", { error: e.message });
    }

    if (totals.reminded || totals.expired || totals.autoRenewed || totals.envelopesExpired) {
      log.info?.("clm_sweep", totals);
    }
    return totals;
  } finally {
    running = false;
  }
}

export function startClmScheduler({ intervalMs = DAY_MS } = {}) {
  // Approval outcomes are event-driven, not scheduled — they're wired up here so
  // the module has a single "start me" entry point, and they stay wired even
  // when the daily sweep is switched off.
  startContractHooks();

  if (process.env.CLM_SCHEDULER === "off") {
    log.info?.("clm_scheduler_disabled");
    return null;
  }
  if (timer) return timer;

  // Give the process a moment to finish booting before the first pass.
  setTimeout(() => { runClmSweep().catch(() => {}); }, 60_000).unref?.();

  timer = setInterval(() => { runClmSweep().catch(() => {}); }, intervalMs);
  timer.unref?.();
  log.info?.("clm_scheduler_started", { intervalHours: Math.round(intervalMs / 3_600_000) });
  return timer;
}

export function stopClmScheduler() {
  if (timer) clearInterval(timer);
  timer = null;
  stopContractHooks();
}
