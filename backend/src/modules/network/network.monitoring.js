/**
 * Importing from a monitoring tool the customer already runs.
 *
 * LibreNMS is supported (an open-source monitoring system with a REST API).
 * A sync imports:
 *   devices   hostname, address, OS, hardware, up/down, uptime
 *   traffic   per-device in/out rates, summed from its ports
 *   links     the LLDP/CDP/xDP neighbours LibreNMS discovered — onto the map
 *   alerts    LibreNMS's open alerts, resolved here when LibreNMS clears them
 * and, when "add discovered devices" is on, pushes devices an ExecUI collector
 * found into LibreNMS (with the SNMP v2c/v3 credentials from network settings)
 * so LibreNMS starts polling and graphing them.
 *
 * CPU and memory are not imported: LibreNMS exposes them per-sensor through
 * graph endpoints that differ by device, so those come from an ExecUI
 * collector instead. Imported devices are marked "monitoring" so it's always
 * clear where a number came from.
 */
import prisma from "../../config/database.js";
import { runUnscoped, runWithTenant } from "../../lib/tenantContext.js";
import { log } from "../../lib/logger.js";
import { loadSettings, monitoringToken, snmpForCollector } from "./network.settings.js";
import { notifyChat } from "../connections/chat.service.js";
import { typeFrom, vendorFrom, osFrom } from "./network.classify.js";

const err = (message, status = 400) => Object.assign(new Error(message), { status });

async function librenms(base, token, path, { method = "GET", json } = {}) {
  const res = await fetch(`${base}/api/v0${path}`, {
    method,
    headers: { "X-Auth-Token": token, Accept: "application/json", ...(json ? { "Content-Type": "application/json" } : {}) },
    body: json ? JSON.stringify(json) : undefined,
    signal: AbortSignal.timeout(20_000),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || body?.status === "error") {
    throw err(`LibreNMS ${res.status}: ${String(body?.message ?? res.statusText).slice(0, 200)}`, res.status === 401 ? 401 : 502);
  }
  return body;
}

const LIBRENMS_TYPE = { network: null, firewall: "firewall", server: "server", wireless: "wireless", storage: "storage", printer: "printer", workstation: "endpoint", appliance: "server" };

/** Pull everything from the tenant's LibreNMS. */
export async function syncMonitoring(tenantId) {
  return runWithTenant({ tenantId }, async () => {
    const settings = await loadSettings(tenantId);
    if (settings.monitoringTool !== "librenms" || !settings.monitoringUrl) throw err("No monitoring tool is connected.", 409);
    const token = monitoringToken(settings);
    if (!token) throw err("Add the monitoring tool's API token in network settings.", 409);
    const base = settings.monitoringUrl;
    const now = new Date();
    const out = { devices: 0, created: 0, links: 0 };

    try {
      const [{ devices = [] }, { ports = [] }, links] = await Promise.all([
        librenms(base, token, "/devices"),
        librenms(base, token, "/ports?columns=device_id,ifInOctets_rate,ifOutOctets_rate"),
        librenms(base, token, "/resources/links").catch(() => ({ links: [] })),
      ]);

      // Traffic per device: sum of its ports' octet rates (bytes/s → bits/s).
      const traffic = new Map();
      for (const p of ports) {
        const t = traffic.get(p.device_id) ?? { in: 0, out: 0 };
        t.in += Number(p.ifInOctets_rate) * 8 || 0;
        t.out += Number(p.ifOutOctets_rate) * 8 || 0;
        traffic.set(p.device_id, t);
      }

      const byLibreId = new Map();
      for (const d of devices) {
        const externalRef = `librenms:${d.device_id}`;
        const sysDescr = d.sysDescr ?? null;
        const vendor = vendorFrom({ sysObjectId: d.sysObjectID, sysDescr }) ?? d.hardware ?? null;
        const up = d.status === 1 || d.status === true || d.status === "1";
        const t = traffic.get(d.device_id);
        const data = {
          hostname: String(d.sysName || d.hostname || d.ip || externalRef).slice(0, 120),
          ip_address: String(d.ip || (/^\d+\.\d+\.\d+\.\d+$/.test(d.hostname ?? "") ? d.hostname : "")),
          status: up ? "up" : "down",
          os: osFrom(sysDescr) ?? d.os ?? null,
          vendor,
          sys_descr: sysDescr,
          region: d.location ? String(d.location).slice(0, 80) : null,
          uptime_sec: d.uptime != null ? Math.round(Number(d.uptime)) : null,
          lastSeenAt: up ? now : undefined,
          ...(t ? { in_bps: t.in, out_bps: t.out, bandwidth_mbps: +((t.in + t.out) / 1e6).toFixed(3), metricsAt: now } : {}),
          source: "monitoring",
          externalRef,
        };
        const existing = await prisma.networkDevice.findFirst({
          where: { tenantId, OR: [{ externalRef }, ...(data.ip_address ? [{ ip_address: data.ip_address }] : [])] },
        });
        const row = existing
          ? await prisma.networkDevice.update({ where: { id: existing.id }, data: { ...data, source: existing.source === "collector" ? "collector" : "monitoring" } })
          : await prisma.networkDevice.create({ data: { tenantId, device_type: LIBRENMS_TYPE[d.type] ?? typeFrom({ sysDescr, vendor }), ...data } });
        if (!existing) out.created += 1;
        byLibreId.set(String(d.device_id), row);
        out.devices += 1;
      }

      for (const l of links?.links ?? []) {
        const a = byLibreId.get(String(l.local_device_id));
        const b = byLibreId.get(String(l.remote_device_id));
        if (!a || !b || a.id === b.id) continue;
        let [x, xPort, y, yPort] = [a, String(l.local_port_id ?? ""), b, String(l.remote_port ?? "")];
        if (x.id > y.id) [x, xPort, y, yPort] = [y, yPort, x, xPort];
        await prisma.networkLink.upsert({
          where: { tenantId_aDeviceId_aPort_bDeviceId_bPort: { tenantId, aDeviceId: x.id, aPort: xPort, bDeviceId: y.id, bPort: yPort } },
          update: { lastSeenAt: now },
          create: { tenantId, aDeviceId: x.id, aPort: xPort, bDeviceId: y.id, bPort: yPort, protocol: String(l.protocol ?? "monitoring").toLowerCase().slice(0, 20), source: "monitoring", lastSeenAt: now },
        });
        out.links += 1;
      }

      // Alerts and auto-add are extras: their failure is reported, not fatal.
      out.alerts = await syncAlerts(tenantId, base, token, byLibreId).catch((e) => ({ error: e.message }));
      if (settings.monitoringAutoAdd) out.added = await pushDiscovered(tenantId, base, token, settings).catch((e) => ({ error: e.message }));

      await prisma.networkSettings.update({ where: { tenantId }, data: { monitoringLastSyncAt: now, monitoringLastError: null } });
      return out;
    } catch (e) {
      await prisma.networkSettings.update({ where: { tenantId }, data: { monitoringLastError: String(e.message).slice(0, 300) } }).catch(() => {});
      throw e;
    }
  });
}

const SEVERITY = { critical: "critical", warning: "warning", ok: "info", info: "info" };

/**
 * Mirror LibreNMS's open alerts. Each becomes one ExecUI alert (kind
 * "librenms:<id>") on the matching device; when it's no longer open in
 * LibreNMS, it's resolved here.
 */
export async function syncAlerts(tenantId, base, token, byLibreId = new Map()) {
  const [{ alerts = [] }, rules] = await Promise.all([
    librenms(base, token, "/alerts?state=1"),
    librenms(base, token, "/rules").catch(() => ({ rules: [] })),
  ]);
  const ruleName = new Map((rules?.rules ?? []).map((r) => [String(r.id), r.name]));
  const seen = new Set();
  let opened = 0, resolved = 0;
  for (const a of alerts) {
    const kind = `librenms:${a.id}`;
    seen.add(kind);
    const exists = await prisma.networkAlert.findFirst({ where: { tenantId, kind, status: { not: "resolved" } } });
    if (exists) continue;
    const device = byLibreId.get(String(a.device_id))
      ?? await prisma.networkDevice.findFirst({ where: { tenantId, externalRef: `librenms:${a.device_id}` } });
    const severity = SEVERITY[String(a.severity ?? "").toLowerCase()] ?? "warning";
    const title = `${ruleName.get(String(a.rule_id)) ?? a.name ?? "LibreNMS alert"}${device ? ` on ${device.hostname}` : ""}`.slice(0, 200);
    await prisma.networkAlert.create({
      data: { tenantId, kind, deviceId: device?.id ?? null, severity, status: "open", title, message: `Raised by LibreNMS${a.timestamp ? ` at ${a.timestamp}` : ""}.` },
    });
    notifyChat(tenantId, "network_alerts", { title: `${severity === "critical" ? "🔴" : "🟠"} ${title}`, text: "From LibreNMS", link: "/network/alerts" });
    opened += 1;
  }
  const open = await prisma.networkAlert.findMany({ where: { tenantId, kind: { startsWith: "librenms:" }, status: { not: "resolved" } }, select: { id: true, kind: true } });
  for (const a of open) {
    if (seen.has(a.kind)) continue;
    await prisma.networkAlert.update({ where: { id: a.id }, data: { status: "resolved", resolvedAt: new Date() } });
    resolved += 1;
  }
  return { open: alerts.length, opened, resolved };
}

const LIBRE_AUTH = { md5: "MD5", sha: "SHA", sha224: "SHA-224", sha256: "SHA-256", sha384: "SHA-384", sha512: "SHA-512" };

/** The add-device body LibreNMS expects, from ExecUI's SNMP settings. */
export function librenmsDeviceBody(hostname, snmp) {
  if (snmp.version !== "v3") return { hostname, version: snmp.version ?? "v2c", community: snmp.community ?? "public" };
  return {
    hostname, version: "v3", authlevel: snmp.level, authname: snmp.user,
    ...(snmp.level !== "noAuthNoPriv" ? { authpass: snmp.authPassword, authalgo: LIBRE_AUTH[snmp.authProtocol] } : {}),
    ...(snmp.level === "authPriv" ? { cryptopass: snmp.privPassword, cryptoalgo: "AES" } : {}),
  };
}

/**
 * Ask LibreNMS to monitor devices the collector found that it doesn't know
 * yet. At most 20 per sync; a device is retried a day after a failed attempt.
 * Once LibreNMS has it, the next import links the two by address.
 */
export async function pushDiscovered(tenantId, base, token, settings) {
  const snmp = snmpForCollector(settings);
  if (snmp.error) return { added: 0, skipped: snmp.error };
  const candidates = await prisma.networkDevice.findMany({
    where: {
      tenantId, source: "collector", snmp: true, externalRef: null, ip_address: { not: "" },
      OR: [{ monitoringAddedAt: null }, { monitoringAddedAt: { lt: new Date(Date.now() - 86_400_000) } }],
    },
    take: 20,
  });
  let added = 0;
  for (const d of candidates) {
    try {
      await librenms(base, token, "/devices", { method: "POST", json: librenmsDeviceBody(d.ip_address, snmp) });
      added += 1;
    } catch (e) {
      // "already exists" is success for our purposes; anything else is retried tomorrow.
      if (!/exist/i.test(e.message)) log.warn?.("librenms_add_failed", { tenantId, ip: d.ip_address, error: e.message });
    }
    await prisma.networkDevice.update({ where: { id: d.id }, data: { monitoringAddedAt: new Date() } });
  }
  return { added, tried: candidates.length };
}

/** Scheduler entry: sync every tenant that has a monitoring tool connected. */
export async function syncAllMonitoring() {
  const rows = await runUnscoped(() => prisma.networkSettings.findMany({
    where: { monitoringTool: { not: null }, monitoringTokenCipher: { not: null } },
    select: { tenantId: true },
  }));
  let ok = 0;
  for (const { tenantId } of rows) {
    try { await syncMonitoring(tenantId); ok += 1; }
    catch (e) { log.warn?.("monitoring_sync_failed", { tenantId, error: e.message }); }
  }
  return { tenants: rows.length, ok };
}
