/**
 * Connected-account sync — every few minutes, every active connection.
 *
 * Connections are synced one at a time so a large organization can't flood
 * Google or Microsoft (both rate-limit per app). `CONNECTIONS_SYNC_MINUTES`
 * sets the interval (default 5); `CONNECTIONS_SCHEDULER=off` disables it.
 */
import prisma from "../../config/database.js";
import { runUnscoped } from "../../lib/tenantContext.js";
import { log } from "../../lib/logger.js";
import { syncConnection } from "./sync.service.js";
import { pruneRequests } from "./connections.service.js";
import { getProvider } from "./providers.js";

let timer = null;
let running = false;

export async function runConnectionSync() {
  if (running) return { skipped: "already running" };
  running = true;
  const totals = { connections: 0, failed: 0 };
  try {
    await pruneRequests().catch(() => {});
    const rows = await runUnscoped(() => prisma.oAuthConnection.findMany({ where: { status: "active" } }));
    for (const c of rows) {
      if (!getProvider(c.provider)?.configured()) continue; // credentials removed from the server
      const r = await syncConnection(c);
      totals.connections += 1;
      if (!r.ok) totals.failed += 1;
    }
    if (totals.connections) log.info?.("connection_sync", totals);
    return totals;
  } finally {
    running = false;
  }
}

export function startConnectionScheduler() {
  if (process.env.CONNECTIONS_SCHEDULER === "off") {
    log.info?.("connection_scheduler_disabled");
    return null;
  }
  if (timer) return timer;
  const minutes = Math.max(1, Number(process.env.CONNECTIONS_SYNC_MINUTES) || 5);
  setTimeout(() => { runConnectionSync().catch(() => {}); }, 60_000).unref?.();
  timer = setInterval(() => { runConnectionSync().catch(() => {}); }, minutes * 60_000);
  timer.unref?.();
  log.info?.("connection_scheduler_started", { intervalMinutes: minutes });
  return timer;
}

export function stopConnectionScheduler() {
  if (timer) clearInterval(timer);
  timer = null;
}
