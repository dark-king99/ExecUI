/**
 * Collectors — the on-site agents — and what happens to what they report.
 *
 * A collector is created here and gets a token, shown once. It then calls
 * three endpoints with that token (see collector.routes.js):
 *   POST /api/collector/hello    who it is; returns its configuration
 *   GET  /api/collector/config   configuration + any queued jobs
 *   POST /api/collector/report   what it found
 *
 * Ingesting a report is where the network picture becomes real:
 *   • every reachable device is created or updated, including ones a person
 *     had typed in by hand at the same address (they become collector-sourced);
 *   • measured CPU, memory, traffic and latency replace the old values, and a
 *     sample is kept for history;
 *   • a known device that stops answering goes down and raises an alert, and
 *     one that crosses the CPU/memory thresholds raises a warning — each
 *     resolved automatically when the condition clears (if enabled);
 *   • LLDP/CDP neighbours become links, which are the only thing the network
 *     map draws.
 */
import crypto from "crypto";
import prisma from "../../config/database.js";
import { runUnscoped, runWithTenant } from "../../lib/tenantContext.js";
import { log } from "../../lib/logger.js";
import { loadSettings, snmpCommunity, isPrivate } from "./network.settings.js";
import { vendorFrom, typeFrom, osFrom } from "./network.classify.js";

const err = (message, status = 400) => Object.assign(new Error(message), { status });
const hash = (token) => crypto.createHash("sha256").update(token).digest("hex");

export const MAX_DEVICES_PER_REPORT = 5000;
export const MAX_LINKS_PER_REPORT = 10000;
export const LINK_FRESH_MS = 24 * 3_600_000;

// ── Management ───────────────────────────────────────────────────────────────
const shapeCollector = (c) => ({
  id: c.id, name: c.name, tokenPrefix: c.tokenPrefix, hostname: c.hostname, platform: c.platform,
  version: c.version, lastSeenAt: c.lastSeenAt, lastReportAt: c.lastReportAt, lastError: c.lastError,
  revoked: !!c.revokedAt, createdAt: c.createdAt,
  // "online" means it checked in within three polling intervals, nothing more.
  online: !c.revokedAt && !!c.lastSeenAt && Date.now() - new Date(c.lastSeenAt).getTime() < 5 * 60_000,
});

export async function listCollectors(tenantId) {
  const rows = await prisma.networkCollector.findMany({ where: { tenantId }, orderBy: { createdAt: "asc" } });
  return rows.map(shapeCollector);
}

/** Create a collector. The token is returned this once and never again. */
export async function createCollector(tenantId, userId, { name } = {}) {
  const label = String(name ?? "").trim().slice(0, 80);
  if (!label) throw err("Give the collector a name, e.g. the site it runs at");
  const token = `exc_${crypto.randomBytes(32).toString("base64url")}`;
  const row = await prisma.networkCollector.create({
    data: { tenantId, name: label, tokenHash: hash(token), tokenPrefix: token.slice(0, 10), createdById: userId ?? null },
  });
  await prisma.auditLog.create({ data: { tenantId, userId, action: "network.collector.created", resource: "collector", resourceId: row.id, detail: `Collector "${label}" created` } }).catch(() => {});
  return { collector: shapeCollector(row), token };
}

export async function revokeCollector(tenantId, userId, id) {
  const row = await prisma.networkCollector.findFirst({ where: { id: String(id), tenantId } });
  if (!row) throw err("Collector not found", 404);
  const updated = await prisma.networkCollector.update({ where: { id: row.id }, data: { revokedAt: new Date() } });
  await prisma.auditLog.create({ data: { tenantId, userId, action: "network.collector.revoked", resource: "collector", resourceId: row.id, detail: `Collector "${row.name}" revoked` } }).catch(() => {});
  return shapeCollector(updated);
}

/** Resolve a bearer token to its collector. Revoked or unknown → null. */
export async function collectorForToken(token) {
  if (typeof token !== "string" || !token.startsWith("exc_") || token.length > 200) return null;
  const row = await runUnscoped(() => prisma.networkCollector.findUnique({ where: { tokenHash: hash(token) } }));
  return row && !row.revokedAt ? row : null;
}

// ── Configuration for the agent ──────────────────────────────────────────────
export async function collectorConfig(collector, hello = null) {
  return runWithTenant({ tenantId: collector.tenantId }, async () => {
    const patch = { lastSeenAt: new Date() };
    if (hello) {
      patch.hostname = String(hello.hostname ?? "").slice(0, 120) || null;
      patch.platform = String(hello.platform ?? "").slice(0, 60) || null;
      patch.version = String(hello.version ?? "").slice(0, 30) || null;
    }
    await prisma.networkCollector.update({ where: { id: collector.id }, data: patch });

    const settings = await loadSettings(collector.tenantId);
    // Devices to keep an eye on between discovery sweeps: everything with an
    // address that this organization knows about, wherever it came from.
    const known = await prisma.networkDevice.findMany({
      where: { tenantId: collector.tenantId, ip_address: { not: "" }, source: { in: ["collector", "manual"] } },
      select: { ip_address: true },
      take: MAX_DEVICES_PER_REPORT,
    });
    const jobs = await prisma.networkAutomationJob.findMany({
      where: { tenantId: collector.tenantId, status: "queued", kind: "discovery" },
      select: { id: true, kind: true },
    });
    if (jobs.length) {
      await prisma.networkAutomationJob.updateMany({ where: { id: { in: jobs.map((j) => j.id) } }, data: { status: "running" } });
    }
    return {
      collectorId: collector.id,
      pollingIntervalSec: settings.pollingIntervalSec,
      discoveryIntervalMin: settings.discoveryIntervalMin,
      subnets: settings.subnets ?? [],
      snmp: { version: settings.snmpVersion, community: snmpCommunity(settings) ?? "public" },
      known: [...new Set(known.map((d) => d.ip_address).filter(isPrivate))],
      jobs,
      serverTime: new Date().toISOString(),
    };
  });
}

// ── Report validation ────────────────────────────────────────────────────────
const isIPv4 = (ip) => typeof ip === "string" && /^(\d{1,3})(\.\d{1,3}){3}$/.test(ip) && ip.split(".").every((o) => Number(o) <= 255);
const str = (v, n) => (v == null ? null : String(v).replace(/[\u0000-\u001f]/g, " ").trim().slice(0, n) || null);
const num = (v, min, max) => {
  const n = Number(v);
  return v == null || !Number.isFinite(n) ? null : Math.min(max, Math.max(min, n));
};
const macOf = (v) => {
  const m = String(v ?? "").toLowerCase().replace(/[^0-9a-f]/g, "");
  return m.length === 12 ? m.match(/../g).join(":") : null;
};

export function cleanDevice(d) {
  if (!d || !isIPv4(d.ip)) return null;
  return {
    ip: d.ip,
    reachable: d.reachable === true,
    mac: macOf(d.mac),
    hostname: str(d.sysName, 120) ?? str(d.hostname, 120),
    sysDescr: str(d.sysDescr, 400),
    sysObjectId: str(d.sysObjectId, 120),
    sysServices: num(d.sysServices, 0, 127),
    snmp: d.snmp === true,
    openPorts: Array.isArray(d.openPorts) ? d.openPorts.map(Number).filter((p) => p > 0 && p < 65536).slice(0, 20) : [],
    latencyMs: num(d.latencyMs, 0, 60_000),
    cpu: num(d.cpu, 0, 100),
    mem: num(d.mem, 0, 100),
    uptimeSec: num(d.uptimeSec, 0, 1e10),
    inBps: num(d.inBps, 0, 1e13),
    outBps: num(d.outBps, 0, 1e13),
  };
}

// ── Ingestion ────────────────────────────────────────────────────────────────
async function raise(tenantId, device, kind, { title, message, severity }) {
  const open = await prisma.networkAlert.findFirst({ where: { tenantId, deviceId: device.id, kind, status: { not: "resolved" } } });
  if (open) return false;
  await prisma.networkAlert.create({ data: { tenantId, deviceId: device.id, kind, title, message, severity, status: "open" } });
  return true;
}

async function clear(tenantId, device, kind) {
  const r = await prisma.networkAlert.updateMany({
    where: { tenantId, deviceId: device.id, kind, status: { not: "resolved" } },
    data: { status: "resolved", resolvedAt: new Date() },
  });
  return r.count;
}

async function findDevice(tenantId, { mac, ip }) {
  if (mac) {
    const byMac = await prisma.networkDevice.findFirst({ where: { tenantId, mac } });
    if (byMac) return byMac;
  }
  return prisma.networkDevice.findFirst({ where: { tenantId, ip_address: ip }, orderBy: { updatedAt: "desc" } });
}

/**
 * Apply one collector report. Returns counts. Each device is handled on its
 * own, so one malformed entry can't sink the rest of the report.
 */
export async function ingestReport(collector, report = {}) {
  const tenantId = collector.tenantId;
  return runWithTenant({ tenantId }, async () => {
    const settings = await loadSettings(tenantId);
    const now = new Date();
    const out = { devices: 0, created: 0, down: 0, alerts: 0, resolved: 0, links: 0, skipped: 0 };

    const devices = (Array.isArray(report.devices) ? report.devices : []).slice(0, MAX_DEVICES_PER_REPORT);
    for (const raw of devices) {
      const d = cleanDevice(raw);
      if (!d || !isPrivate(d.ip)) { out.skipped += 1; continue; }
      const existing = await findDevice(tenantId, d);
      // A host that didn't answer is only news if we already knew about it.
      if (!d.reachable && !existing) continue;

      let device;
      if (!d.reachable) {
        device = await prisma.networkDevice.update({
          where: { id: existing.id },
          data: { status: "down", latency_ms: null, collectorId: collector.id },
        });
        out.down += 1;
      } else {
        const vendor = vendorFrom(d) ?? existing?.vendor ?? null;
        const measured = d.cpu != null || d.mem != null || d.inBps != null || d.outBps != null;
        const data = {
          ip_address: d.ip,
          status: "up",
          source: existing?.source === "monitoring" ? "monitoring" : "collector",
          collectorId: collector.id,
          lastSeenAt: now,
          latency_ms: d.latencyMs,
          snmp: d.snmp || !!existing?.snmp,
          ...(d.mac ? { mac: d.mac } : {}),
          ...(vendor ? { vendor } : {}),
          ...(d.sysDescr ? { sys_descr: d.sysDescr, os: osFrom(d.sysDescr) } : {}),
          ...(d.uptimeSec != null ? { uptime_sec: Math.round(d.uptimeSec) } : {}),
          ...(measured ? {
            metricsAt: now,
            ...(d.cpu != null ? { cpu_util: d.cpu } : {}),
            ...(d.mem != null ? { mem_util: d.mem } : {}),
            ...(d.inBps != null ? { in_bps: d.inBps } : {}),
            ...(d.outBps != null ? { out_bps: d.outBps } : {}),
            ...(d.inBps != null || d.outBps != null ? { bandwidth_mbps: +(((d.inBps ?? 0) + (d.outBps ?? 0)) / 1e6).toFixed(3) } : {}),
          } : {}),
        };
        if (existing) {
          // Keep a name a person chose; fill one in only if there wasn't one.
          if (d.hostname && (!existing.hostname || existing.hostname === existing.ip_address)) data.hostname = d.hostname;
          if (existing.source === "manual" && !existing.lastSeenAt) data.device_type = typeFrom({ ...d, vendor });
          device = await prisma.networkDevice.update({ where: { id: existing.id }, data });
        } else {
          device = await prisma.networkDevice.create({
            data: { tenantId, hostname: d.hostname ?? d.ip, device_type: typeFrom({ ...d, vendor }), region: null, ...data },
          });
          out.created += 1;
        }
      }
      out.devices += 1;

      // Alerts: one open alert per condition, cleared when the condition is.
      const wasUp = existing ? existing.status !== "down" : true;
      if (!d.reachable) {
        if (wasUp && await raise(tenantId, device, "unreachable", { severity: "critical", title: `${device.hostname} is unreachable`, message: `${device.ip_address} stopped answering the collector "${collector.name}".` })) out.alerts += 1;
      } else {
        if (settings.autoResolveAlerts) out.resolved += await clear(tenantId, device, "unreachable");
        for (const [kind, value, limit, label] of [["cpu", d.cpu, settings.cpuThreshold, "CPU"], ["memory", d.mem, settings.memThreshold, "Memory"]]) {
          if (value == null) continue;
          if (value >= limit) {
            if (await raise(tenantId, device, kind, { severity: "warning", title: `${label} at ${Math.round(value)}% on ${device.hostname}`, message: `Above the ${limit}% threshold set in network settings.` })) out.alerts += 1;
          } else if (settings.autoResolveAlerts) {
            out.resolved += await clear(tenantId, device, kind);
          }
        }
      }

      await prisma.networkMetricSample.create({
        data: { tenantId, deviceId: device.id, at: now, up: d.reachable, cpu: d.cpu, mem: d.mem, in_bps: d.inBps, out_bps: d.outBps, latency_ms: d.latencyMs },
      });
    }

    out.links = await ingestLinks(tenantId, collector, report.links, now);
    await finishJobs(tenantId, report.jobResults);
    await prisma.networkCollector.update({ where: { id: collector.id }, data: { lastSeenAt: now, lastReportAt: now, lastError: str(report.error, 300) } });
    log.info?.("collector_report", { tenantId, collectorId: collector.id, ...out });
    return out;
  });
}

/** Resolve one end of an LLDP/CDP neighbour to a device, creating it if it has a private address. */
async function resolveEnd(tenantId, collectorId, end, now) {
  if (!end) return null;
  const ip = isIPv4(end.ip) ? end.ip : null;
  const mac = macOf(end.chassisId);
  const name = str(end.name, 120);
  if (ip || mac) {
    const found = await findDevice(tenantId, { ip, mac });
    if (found && (!ip || found.ip_address === ip || (mac && found.mac === mac))) return found;
  }
  if (name) {
    const short = name.split(".")[0];
    const byName = await prisma.networkDevice.findFirst({
      where: { tenantId, OR: [{ hostname: { equals: name, mode: "insensitive" } }, { hostname: { equals: short, mode: "insensitive" } }] },
    });
    if (byName) return byName;
  }
  if (ip && isPrivate(ip)) {
    // A neighbour seen over LLDP/CDP is real even if the sweep missed it.
    return prisma.networkDevice.create({
      data: {
        tenantId, hostname: name ?? ip, ip_address: ip, device_type: typeFrom({ sysDescr: end.description }),
        status: "up", source: "collector", collectorId, lastSeenAt: now, ...(mac ? { mac } : {}),
        ...(end.description ? { sys_descr: str(end.description, 400) } : {}),
      },
    });
  }
  return null;
}

async function ingestLinks(tenantId, collector, links, now) {
  let count = 0;
  for (const l of (Array.isArray(links) ? links : []).slice(0, MAX_LINKS_PER_REPORT)) {
    const protocol = ["lldp", "cdp"].includes(l?.protocol) ? l.protocol : null;
    if (!protocol) continue;
    const a = await resolveEnd(tenantId, collector.id, l.local, now);
    const b = await resolveEnd(tenantId, collector.id, l.remote, now);
    if (!a || !b || a.id === b.id) continue;
    // Both switches report the same cable; store it once, in a fixed order.
    let [x, xPort, y, yPort] = [a, str(l.localPort, 80) ?? "", b, str(l.remotePort, 80) ?? ""];
    if (x.id > y.id) [x, xPort, y, yPort] = [y, yPort, x, xPort];
    await prisma.networkLink.upsert({
      where: { tenantId_aDeviceId_aPort_bDeviceId_bPort: { tenantId, aDeviceId: x.id, aPort: xPort, bDeviceId: y.id, bPort: yPort } },
      update: { lastSeenAt: now, protocol },
      create: { tenantId, aDeviceId: x.id, aPort: xPort, bDeviceId: y.id, bPort: yPort, protocol, source: "collector", lastSeenAt: now },
    });
    count += 1;
  }
  return count;
}

async function finishJobs(tenantId, results) {
  for (const r of (Array.isArray(results) ? results : []).slice(0, 50)) {
    if (typeof r?.id !== "string") continue;
    await prisma.networkAutomationJob.updateMany({
      where: { id: r.id, tenantId, status: "running" },
      data: {
        status: r.ok ? "success" : "failed",
        lastRun: new Date(),
        duration: num(r.durationMs, 0, 1e9) != null ? `${(r.durationMs / 1000).toFixed(1)}s` : null,
        lastResult: str(r.summary, 500),
      },
    });
  }
}

/** Drop metric samples past the organization's retention window. */
export async function pruneSamples() {
  const all = await runUnscoped(() => prisma.networkSettings.findMany({ select: { tenantId: true, metricRetentionDays: true } }));
  const custom = new Map(all.map((s) => [s.tenantId, s.metricRetentionDays]));
  let removed = 0;
  for (const [tenantId, days] of custom) {
    const r = await runUnscoped(() => prisma.networkMetricSample.deleteMany({ where: { tenantId, at: { lt: new Date(Date.now() - days * 86_400_000) } } }));
    removed += r.count;
  }
  // Everyone else gets the default 30 days.
  const r = await runUnscoped(() => prisma.networkMetricSample.deleteMany({
    where: { tenantId: { notIn: [...custom.keys()] }, at: { lt: new Date(Date.now() - 30 * 86_400_000) } },
  }));
  return removed + r.count;
}
