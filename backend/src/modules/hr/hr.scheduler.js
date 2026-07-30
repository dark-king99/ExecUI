/**
 * HR ticker — a daily pass that opens each new year's leave allocations and
 * carries over whatever the organization's policy allows.
 *
 * It runs every day but does almost nothing for 364 of them: `rollOverYear` is
 * idempotent, so a second pass never doubles anyone's allowance. That's
 * deliberate — a job that only works if it fires on exactly one day of the year
 * is a job that will one day be missed.
 *
 * The approval hooks (leave and payroll) are event-driven, not scheduled, and are
 * wired up here so the module has a single "start me" entry point.
 * `HR_SCHEDULER=off` disables the ticker; the hooks stay wired either way.
 */
import { log } from "../../lib/logger.js";
import { runYearRollover, startLeaveHooks, stopLeaveHooks } from "./leave.service.js";
import { startPayrollHooks, stopPayrollHooks } from "./payroll.service.js";

const DAY_MS = 86_400_000;
let timer = null;
let running = false;

export async function runHrSweep() {
  if (running) return { skipped: "already running" };
  running = true;
  try {
    const result = await runYearRollover();
    if (result.balancesCreated) log.info?.("hr_leave_rollover", result);
    return result;
  } catch (e) {
    log.warn?.("hr_sweep_failed", { error: e.message });
    return { error: e.message };
  } finally {
    running = false;
  }
}

export function startHrScheduler({ intervalMs = DAY_MS } = {}) {
  startLeaveHooks();
  startPayrollHooks();

  if (process.env.HR_SCHEDULER === "off") {
    log.info?.("hr_scheduler_disabled");
    return null;
  }
  if (timer) return timer;

  setTimeout(() => { runHrSweep().catch(() => {}); }, 90_000).unref?.();
  timer = setInterval(() => { runHrSweep().catch(() => {}); }, intervalMs);
  timer.unref?.();
  log.info?.("hr_scheduler_started", { intervalHours: Math.round(intervalMs / 3_600_000) });
  return timer;
}

export function stopHrScheduler() {
  if (timer) clearInterval(timer);
  timer = null;
  stopLeaveHooks();
  stopPayrollHooks();
}
