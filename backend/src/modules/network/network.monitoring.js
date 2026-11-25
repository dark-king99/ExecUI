/**
 * Importing from a monitoring tool the customer already runs.
 *
 * LibreNMS is supported (an open-source monitoring system with a REST API).
 * A sync imports:
 *   devices   hostname, address, OS, hardware, up/down, uptime
 *   traffic   per-device in/out rates, summed from its ports
 *   links     the LLDP/CDP/xDP neighbours LibreNMS discovered — onto the map
 * CPU and memory are not imported: LibreNMS exposes them per-sensor through
 * graph endpoints that differ by device, so those come from an ExecUI
 * collector instead. Imported devices are marked "monitoring" so it's always
 * clear where a number came from.
 */
import prisma from "../../config/database.js";
import { runUnscoped, runWithTenant } from "../../lib/tenantContext.js";
import { log } from "../../lib/logger.js";
import { loadSettings, monitoringToken } from "./network.settings.js";
import { typeFrom, vendorFrom, osFrom } from "./network.classify.js";

const err = (message, status = 400) => Object.assign(new Error(message), { status });

async function librenms(base, token, path) {
  const res = await fetch(`${base}/api/v0${path}`, {
    headers: { "X-Auth-Token": token, Accept: "application/json" },
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

      await prisma.networkSettings.update({ where: { tenantId }, data: { monitoringLastSyncAt: now, monitoringLastError: null } });
      return out;
    } catch (e) {
      await prisma.networkSettings.update({ where: { tenantId }, data: { monitoringLastError: String(e.message).slice(0, 300) } }).catch(() => {});
      throw e;
    }
  });
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
