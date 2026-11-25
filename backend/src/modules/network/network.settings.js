/**
 * Network settings — saved per organization, and actually used.
 *
 * These used to be a constant object: "saving" returned the edit and kept
 * nothing, and the notification address was a placeholder. Now they decide
 * what the collectors scan and how often they poll, the thresholds that raise
 * alerts, and the optional monitoring tool to import from.
 *
 * Secrets (the SNMP community and the monitoring tool's API token) are
 * encrypted and never returned — the UI only learns whether one is set.
 */
import prisma from "../../config/database.js";
import { encryptSecret, decryptSecret } from "../../lib/secrets.js";

const err = (message, status = 400) => Object.assign(new Error(message), { status });

export const MAX_HOSTS_PER_SUBNET = 4096; // a /20
export const MONITORING_TOOLS = ["librenms"];

const toInt = (ip) => ip.split(".").reduce((n, o) => n * 256 + Number(o), 0);
const isIPv4 = (ip) => /^(\d{1,3})(\.\d{1,3}){3}$/.test(ip) && ip.split(".").every((o) => Number(o) <= 255);

/**
 * Only private address space may be scanned. A collector sweeping public
 * ranges would be ExecUI scanning other people's networks.
 */
export function isPrivate(ip) {
  if (!isIPv4(ip)) return false;
  const n = toInt(ip);
  const inRange = (base, bits) => (n >>> (32 - bits)) === (toInt(base) >>> (32 - bits));
  return inRange("10.0.0.0", 8) || inRange("172.16.0.0", 12) || inRange("192.168.0.0", 16) || inRange("100.64.0.0", 10);
}

export function parseCidr(raw) {
  const [ip, bitsRaw] = String(raw ?? "").trim().split("/");
  const bits = bitsRaw === undefined ? 32 : Number(bitsRaw);
  if (!isIPv4(ip) || !Number.isInteger(bits) || bits < 0 || bits > 32) throw err(`"${raw}" isn't a subnet like 192.168.1.0/24`);
  if (2 ** (32 - bits) > MAX_HOSTS_PER_SUBNET) throw err(`${raw} is too large to scan; split it into /20 or smaller.`);
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  const network = (toInt(ip) & mask) >>> 0;
  const toIp = (n) => [24, 16, 8, 0].map((s) => (n >>> s) & 255).join(".");
  const cidr = `${toIp(network)}/${bits}`;
  if (!isPrivate(toIp(network)) || !isPrivate(toIp((network + 2 ** (32 - bits) - 1) >>> 0))) {
    throw err(`${cidr} isn't private address space. Collectors only scan 10/8, 172.16/12, 192.168/16 and 100.64/10.`);
  }
  return cidr;
}

const readSecret = (s, prefix) => decryptSecret({ ciphertext: s?.[`${prefix}Cipher`], iv: s?.[`${prefix}Iv`], tag: s?.[`${prefix}Tag`] });

export async function loadSettings(tenantId) {
  return (await prisma.networkSettings.findUnique({ where: { tenantId } }))
    ?? { tenantId, subnets: [], pollingIntervalSec: 60, discoveryIntervalMin: 60, snmpVersion: "v2c", cpuThreshold: 85, memThreshold: 90, autoResolveAlerts: true, alertEmail: null, metricRetentionDays: 30, monitoringTool: null, monitoringUrl: null, monitoringLastSyncAt: null, monitoringLastError: null };
}

/** The view the UI gets: no secrets, only whether they're set. */
export const shapeSettings = (s) => ({
  subnets: s.subnets ?? [],
  pollingIntervalSec: s.pollingIntervalSec,
  discoveryIntervalMin: s.discoveryIntervalMin,
  snmpVersion: s.snmpVersion,
  hasSnmpCommunity: !!s.snmpCommunityCipher,
  cpuThreshold: s.cpuThreshold,
  memThreshold: s.memThreshold,
  autoResolveAlerts: s.autoResolveAlerts,
  alertEmail: s.alertEmail,
  metricRetentionDays: s.metricRetentionDays,
  monitoring: {
    tool: s.monitoringTool,
    url: s.monitoringUrl,
    hasToken: !!s.monitoringTokenCipher,
    lastSyncAt: s.monitoringLastSyncAt,
    lastError: s.monitoringLastError,
  },
});

export async function getSettings(tenantId) {
  return shapeSettings(await loadSettings(tenantId));
}

const intIn = (v, min, max, name) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) throw err(`${name} must be a whole number from ${min} to ${max}`);
  return n;
};

export async function updateSettings(tenantId, body = {}) {
  const data = {};
  if (body.subnets !== undefined) {
    const list = Array.isArray(body.subnets) ? body.subnets : String(body.subnets).split(/[\s,]+/);
    data.subnets = [...new Set(list.map((s) => String(s).trim()).filter(Boolean).map(parseCidr))].slice(0, 32);
  }
  if (body.pollingIntervalSec !== undefined) data.pollingIntervalSec = intIn(body.pollingIntervalSec, 30, 3600, "Polling interval (seconds)");
  if (body.discoveryIntervalMin !== undefined) data.discoveryIntervalMin = intIn(body.discoveryIntervalMin, 15, 1440, "Discovery interval (minutes)");
  if (body.snmpVersion !== undefined) {
    // SNMPv3 needs user/auth/privacy keys; the collector speaks v1 and v2c today.
    if (!["v1", "v2c"].includes(body.snmpVersion)) throw err("The collector supports SNMP v1 and v2c. SNMPv3 isn't supported yet.");
    data.snmpVersion = body.snmpVersion;
  }
  if (typeof body.snmpCommunity === "string" && body.snmpCommunity.length) {
    if (body.snmpCommunity.length > 128) throw err("SNMP community is too long");
    const e = encryptSecret(body.snmpCommunity);
    Object.assign(data, { snmpCommunityCipher: e.ciphertext, snmpCommunityIv: e.iv, snmpCommunityTag: e.tag });
  }
  if (body.clearSnmpCommunity === true) Object.assign(data, { snmpCommunityCipher: null, snmpCommunityIv: null, snmpCommunityTag: null });
  if (body.cpuThreshold !== undefined) data.cpuThreshold = intIn(body.cpuThreshold, 10, 100, "CPU threshold");
  if (body.memThreshold !== undefined) data.memThreshold = intIn(body.memThreshold, 10, 100, "Memory threshold");
  if (body.autoResolveAlerts !== undefined) data.autoResolveAlerts = !!body.autoResolveAlerts;
  if (body.alertEmail !== undefined) {
    const v = String(body.alertEmail ?? "").trim();
    if (v && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) throw err("Alert email doesn't look like an email address");
    data.alertEmail = v || null;
  }
  if (body.metricRetentionDays !== undefined) data.metricRetentionDays = intIn(body.metricRetentionDays, 1, 365, "Metric retention (days)");

  if (body.monitoring !== undefined) {
    const m = body.monitoring ?? {};
    if (m.tool === null || m.tool === "") {
      Object.assign(data, { monitoringTool: null, monitoringUrl: null, monitoringTokenCipher: null, monitoringTokenIv: null, monitoringTokenTag: null, monitoringLastError: null });
    } else {
      if (!MONITORING_TOOLS.includes(m.tool)) throw err(`Supported monitoring tools: ${MONITORING_TOOLS.join(", ")}`);
      let url;
      try { url = new URL(String(m.url)); } catch { throw err("Enter the monitoring tool's address, e.g. https://librenms.example.com"); }
      if (!["http:", "https:"].includes(url.protocol)) throw err("The monitoring tool's address must be http or https");
      data.monitoringTool = m.tool;
      data.monitoringUrl = url.toString().replace(/\/$/, "");
      if (typeof m.token === "string" && m.token.length) {
        const e = encryptSecret(m.token);
        Object.assign(data, { monitoringTokenCipher: e.ciphertext, monitoringTokenIv: e.iv, monitoringTokenTag: e.tag });
      }
    }
  }

  const row = await prisma.networkSettings.upsert({
    where: { tenantId },
    update: data,
    create: { tenantId, ...data },
  });
  return shapeSettings(row);
}

export const snmpCommunity = (s) => readSecret(s, "snmpCommunity");
export const monitoringToken = (s) => readSecret(s, "monitoringToken");

/**
 * Starting points a person can apply, not stored profiles. They used to be
 * editable "profiles" whose edits were thrown away.
 */
export const PRESETS = [
  { id: "default", name: "Default", description: "Poll every minute; discover hourly.", pollingIntervalSec: 60, discoveryIntervalMin: 60, cpuThreshold: 85, memThreshold: 90 },
  { id: "critical", name: "Critical infrastructure", description: "Poll every 30 seconds; tighter thresholds.", pollingIntervalSec: 30, discoveryIntervalMin: 30, cpuThreshold: 75, memThreshold: 80 },
  { id: "low-bandwidth", name: "Low-bandwidth site", description: "Poll every 5 minutes to spare a slow uplink.", pollingIntervalSec: 300, discoveryIntervalMin: 240, cpuThreshold: 90, memThreshold: 95 },
];
