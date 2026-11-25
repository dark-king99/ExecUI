/**
 * Network housekeeping, every few minutes:
 *   • import from connected monitoring tools (every 10 minutes);
 *   • alert when a collector stops checking in — otherwise its devices would
 *     keep showing their last readings as if they were current — and resolve
 *     that alert when it's back;
 *   • drop metric samples past retention (hourly).
 * `NETWORK_SCHEDULER=off` disables it.
 */
import { notifyChat } from "../connections/chat.service.js";
import prisma from "../../config/database.js";
import { runUnscoped } from "../../lib/tenantContext.js";
import { log } from "../../lib/logger.js";
import { syncAllMonitoring } from "./network.monitoring.js";
import { pruneSamples } from "./network.collectors.js";

const OFFLINE_MS = 15 * 60_000;
let timer = null;
let ticks = 0;
let running = false;

export async function checkCollectors(now = Date.now()) {
  const rows = await runUnscoped(() => prisma.networkCollector.findMany({ where: { revokedAt: null, lastSeenAt: { not: null } } }));
  let raised = 0, resolved = 0;
  for (const c of rows) {
    const kind = `collector:${c.id}`;
    const offline = now - c.lastSeenAt.getTime() > OFFLINE_MS;
    await runUnscoped(async () => {
      const open = await prisma.networkAlert.findFirst({ where: { tenantId: c.tenantId, kind, status: { not: "resolved" } } });
      if (offline && !open) {
        await prisma.networkAlert.create({
          data: {
            tenantId: c.tenantId, kind, severity: "critical", status: "open",
            title: `Collector "${c.name}" is offline`,
            message: `It last checked in at ${c.lastSeenAt.toISOString()}. Device readings from it are no longer current.`,
          },
        });
        notifyChat(c.tenantId, "network_alerts", { title: `🔴 Collector "${c.name}" is offline`, text: `Last check-in ${c.lastSeenAt.toISOString()}.`, link: "/network/config/settings" });
        raised += 1;
      } else if (!offline && open) {
        await prisma.networkAlert.update({ where: { id: open.id }, data: { status: "resolved", resolvedAt: new Date() } });
        resolved += 1;
      }
    });
  }
  return { raised, resolved };
}

export async function runNetworkHousekeeping() {
  if (running) return { skipped: "already running" };
  running = true;
  try {
    const out = { collectors: await checkCollectors() };
    if (ticks % 2 === 0) out.monitoring = await syncAllMonitoring();
    if (ticks % 12 === 0) out.pruned = await pruneSamples();
    ticks += 1;
    return out;
  } finally {
    running = false;
  }
}

export function startNetworkScheduler() {
  if (process.env.NETWORK_SCHEDULER === "off") { log.info?.("network_scheduler_disabled"); return null; }
  if (timer) return timer;
  setTimeout(() => { runNetworkHousekeeping().catch((e) => log.warn?.("network_housekeeping_failed", { error: e.message })); }, 90_000).unref?.();
  timer = setInterval(() => { runNetworkHousekeeping().catch((e) => log.warn?.("network_housekeeping_failed", { error: e.message })); }, 5 * 60_000);
  timer.unref?.();
  log.info?.("network_scheduler_started", { intervalMinutes: 5 });
  return timer;
}

export function stopNetworkScheduler() {
  if (timer) clearInterval(timer);
  timer = null;
}
