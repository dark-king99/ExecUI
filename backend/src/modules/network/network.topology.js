/**
 * The network map, drawn only from real connections.
 *
 * Links come from LLDP/CDP neighbours a collector discovered, or from the
 * connected monitoring tool. Nothing is inferred: this used to attach every
 * server to "a router" by list position, which drew cables that didn't exist.
 *
 * Layout is layered: the most-connected infrastructure device is the core, its
 * neighbours the next row, and so on outward. Devices with no known connection
 * sit in a separate row, labelled as such, rather than being wired to anything.
 */
import prisma from "../../config/database.js";
import { LINK_FRESH_MS } from "./network.collectors.js";

const INFRA = new Set(["router", "firewall", "switch"]);
const STATUS = { up: "ok", down: "down", degraded: "warn", maintenance: "warn" };
const COL = 110;
const ROW = 110;
const MARGIN = 60;

export async function buildMap(tenantId) {
  const [devices, linkRows] = await Promise.all([
    prisma.networkDevice.findMany({
      where: { tenantId },
      select: { id: true, hostname: true, ip_address: true, device_type: true, status: true, source: true, in_bps: true, out_bps: true },
      take: 1000,
    }),
    prisma.networkLink.findMany({
      where: { tenantId, lastSeenAt: { gte: new Date(Date.now() - LINK_FRESH_MS) } },
      take: 5000,
    }),
  ]);

  const byId = new Map(devices.map((d) => [d.id, d]));
  const links = linkRows.filter((l) => byId.has(l.aDeviceId) && byId.has(l.bDeviceId));
  const adj = new Map(devices.map((d) => [d.id, new Set()]));
  for (const l of links) { adj.get(l.aDeviceId).add(l.bDeviceId); adj.get(l.bDeviceId).add(l.aDeviceId); }

  // Breadth-first from the best-connected infrastructure device, component by component.
  const layer = new Map();
  const connected = devices.filter((d) => adj.get(d.id).size > 0)
    .sort((a, b) => (INFRA.has(b.device_type) - INFRA.has(a.device_type)) || (adj.get(b.id).size - adj.get(a.id).size));
  let base = 0;
  for (const root of connected) {
    if (layer.has(root.id)) continue;
    const queue = [root.id];
    layer.set(root.id, base);
    let deepest = base;
    while (queue.length) {
      const id = queue.shift();
      for (const n of adj.get(id)) {
        if (!layer.has(n)) { layer.set(n, layer.get(id) + 1); deepest = Math.max(deepest, layer.get(n)); queue.push(n); }
      }
    }
    base = deepest + 1;
  }

  const rows = new Map();
  for (const d of devices) {
    const r = layer.has(d.id) ? layer.get(d.id) : Infinity; // unconnected → last row
    if (!rows.has(r)) rows.set(r, []);
    rows.get(r).push(d);
  }
  const ordered = [...rows.keys()].sort((a, b) => a - b);
  const widest = Math.max(1, ...[...rows.values()].map((r) => r.length));
  const width = Math.max(680, MARGIN * 2 + (widest - 1) * COL);
  const nodes = [];
  ordered.forEach((r, i) => {
    const row = rows.get(r).sort((a, b) => a.hostname.localeCompare(b.hostname));
    const span = (row.length - 1) * COL;
    row.forEach((d, j) => nodes.push({
      id: d.id, label: d.hostname, name: d.hostname, ip: d.ip_address, type: d.device_type,
      status: STATUS[d.status] ?? "ok", source: d.source, connected: r !== Infinity,
      x: Math.round(width / 2 - span / 2 + j * COL), y: MARGIN + i * ROW,
    }));
  });

  return {
    nodes,
    links: links.map((l) => ({
      id: l.id, source: l.aDeviceId, target: l.bDeviceId, sourcePort: l.aPort || null, targetPort: l.bPort || null,
      protocol: l.protocol, origin: l.source, lastSeenAt: l.lastSeenAt,
    })),
    width,
    height: MARGIN * 2 + Math.max(0, ordered.length - 1) * ROW + 40,
    unconnected: nodes.filter((n) => !n.connected).length,
    hasLinkData: links.length > 0,
  };
}
