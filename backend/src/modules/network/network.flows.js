/**
 * Flow traffic (NetFlow v5/v9, IPFIX) as the collector summarises it.
 *
 * Each report carries totals per (protocol, service port) and the busiest
 * conversations for the window since the previous report. Stored as-is, then
 * summed over whatever period a page asks for. Names come from here, not from
 * the collector, so the list can grow without redeploying collectors.
 */
import prisma from "../../config/database.js";

const PROTOCOLS = { 1: "ICMP", 6: "TCP", 17: "UDP", 47: "GRE", 50: "IPsec ESP", 51: "IPsec AH", 58: "ICMPv6", 89: "OSPF", 132: "SCTP" };
const SERVICES = {
  "6/80": "HTTP", "6/443": "HTTPS", "17/443": "QUIC (HTTP/3)", "6/8080": "HTTP (alt)", "6/8443": "HTTPS (alt)",
  "17/53": "DNS", "6/53": "DNS", "6/22": "SSH", "6/23": "Telnet", "6/21": "FTP", "6/20": "FTP data", "17/69": "TFTP",
  "6/25": "SMTP", "6/465": "SMTPS", "6/587": "SMTP submission", "6/110": "POP3", "6/995": "POP3S", "6/143": "IMAP", "6/993": "IMAPS",
  "6/445": "SMB (file sharing)", "6/139": "NetBIOS", "17/137": "NetBIOS", "17/138": "NetBIOS", "6/3389": "Remote Desktop", "6/5900": "VNC",
  "17/123": "NTP", "17/161": "SNMP", "17/162": "SNMP traps", "17/514": "Syslog", "17/67": "DHCP", "17/68": "DHCP",
  "6/389": "LDAP", "6/636": "LDAPS", "6/1433": "SQL Server", "6/1521": "Oracle", "6/3306": "MySQL", "6/5432": "PostgreSQL", "6/6379": "Redis", "6/27017": "MongoDB",
  "17/1194": "OpenVPN", "6/1194": "OpenVPN", "17/51820": "WireGuard", "6/1723": "PPTP", "6/1883": "MQTT",
  "17/3478": "STUN/TURN (video calls)", "17/5060": "SIP (voice)", "6/5060": "SIP (voice)", "6/5061": "SIP TLS",
  "17/8801": "Zoom", "17/8802": "Zoom", "6/8801": "Zoom", "6/5222": "XMPP", "6/9100": "Printing",
};

/** A readable name for a (protocol, port) bucket. */
export function serviceName(protocol, port) {
  const known = SERVICES[`${protocol}/${port}`];
  if (known) return known;
  const p = PROTOCOLS[protocol] ?? `IP protocol ${protocol}`;
  return port ? `${p} ${port}` : p;
}

const num = (v) => (Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : null);
const isIp = (v) => typeof v === "string" && v.length <= 45 && /^[0-9a-f:.]+$/i.test(v);

/** Store one report's flow summary. Returns how many rows were kept. */
export async function ingestFlows(tenantId, collectorId, flows) {
  if (!flows || typeof flows !== "object") return 0;
  const periodStart = new Date(flows.since);
  const periodEnd = new Date(flows.until);
  if (Number.isNaN(periodStart.getTime()) || Number.isNaN(periodEnd.getTime()) || periodEnd < periodStart) return 0;
  const base = { tenantId, collectorId, periodStart, periodEnd };

  const stats = (Array.isArray(flows.byService) ? flows.byService : []).slice(0, 500)
    .map((b) => ({ protocol: Math.trunc(num(b.protocol) ?? -1), port: Math.trunc(num(b.port) ?? -1), bytes: num(b.bytes), packets: num(b.packets) ?? 0 }))
    .filter((b) => b.protocol >= 0 && b.protocol <= 255 && b.port >= 0 && b.port <= 65535 && b.bytes != null)
    .map((b) => ({ ...base, ...b }));
  const convs = (Array.isArray(flows.conversations) ? flows.conversations : []).slice(0, 500)
    .filter((c) => isIp(c.src) && isIp(c.dst) && num(c.bytes) != null)
    .map((c) => ({ ...base, srcIp: c.src, dstIp: c.dst, protocol: Math.trunc(num(c.protocol) ?? 0) & 255, port: Math.trunc(num(c.port) ?? 0) & 65535, bytes: num(c.bytes), packets: num(c.packets) ?? 0 }));

  if (stats.length) await prisma.networkFlowStat.createMany({ data: stats });
  if (convs.length) await prisma.networkFlowConversation.createMany({ data: convs });
  return stats.length + convs.length;
}

const human = (bytes) => {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let v = bytes, i = 0;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i += 1; }
  return `${v >= 100 || i === 0 ? Math.round(v) : v.toFixed(1)} ${units[i]}`;
};

/** Traffic by application over the last `hours`, largest first. */
export async function protocolBreakdown(tenantId, { hours = 1 } = {}) {
  const since = new Date(Date.now() - hours * 3_600_000);
  const rows = await prisma.networkFlowStat.groupBy({
    by: ["protocol", "port"], where: { tenantId, periodEnd: { gte: since } },
    _sum: { bytes: true, packets: true },
  });
  const named = new Map();
  for (const r of rows) {
    const name = serviceName(r.protocol, r.port);
    const e = named.get(name) ?? { name, protocol: r.protocol, port: r.port, bytesRaw: 0, packets: 0 };
    e.bytesRaw += r._sum.bytes ?? 0;
    e.packets += r._sum.packets ?? 0;
    named.set(name, e);
  }
  const total = [...named.values()].reduce((s, e) => s + e.bytesRaw, 0);
  const sorted = [...named.values()].sort((a, b) => b.bytesRaw - a.bytesRaw);
  // Top 9 by name, the rest as "Other", so the chart stays readable.
  const top = sorted.slice(0, 9);
  const rest = sorted.slice(9);
  if (rest.length) top.push({ name: `Other (${rest.length})`, protocol: null, port: null, bytesRaw: rest.reduce((s, e) => s + e.bytesRaw, 0), packets: rest.reduce((s, e) => s + e.packets, 0) });
  return top.map((e) => ({
    name: e.name, protocol: e.protocol, port: e.port,
    bytesRaw: e.bytesRaw, bytes: human(e.bytesRaw), packets: e.packets,
    percent: total ? +((e.bytesRaw / total) * 100).toFixed(1) : 0,
    mbps: +((e.bytesRaw * 8) / (hours * 3600) / 1e6).toFixed(3),
  }));
}

/** Busiest conversations over the last `hours`. */
export async function topConversations(tenantId, { hours = 1, limit = 20 } = {}) {
  const since = new Date(Date.now() - hours * 3_600_000);
  const rows = await prisma.networkFlowConversation.groupBy({
    by: ["srcIp", "dstIp", "protocol", "port"], where: { tenantId, periodEnd: { gte: since } },
    _sum: { bytes: true, packets: true }, orderBy: { _sum: { bytes: "desc" } }, take: limit,
  });
  return rows.map((r) => ({
    src: r.srcIp, dst: r.dstIp, service: serviceName(r.protocol, r.port),
    bytesRaw: r._sum.bytes ?? 0, bytes: human(r._sum.bytes ?? 0), packets: r._sum.packets ?? 0,
  }));
}

/** Drop flow summaries older than the metric retention window. */
export async function pruneFlows(tenantId, days) {
  const before = new Date(Date.now() - days * 86_400_000);
  const [a, b] = await Promise.all([
    prisma.networkFlowStat.deleteMany({ where: { tenantId, periodEnd: { lt: before } } }),
    prisma.networkFlowConversation.deleteMany({ where: { tenantId, periodEnd: { lt: before } } }),
  ]);
  return a.count + b.count;
}
