/**
 * Connectivity service — the small-office backbone of Network Management:
 * internet/WAN links (ISP connections) with bandwidth and data-usage monitoring,
 * plus the network scale profile (office vs datacenter).
 *
 * Additive: the existing enterprise network features are untouched. An office
 * with no servers can now monitor its internet, routers and devices.
 */
import prisma from "../../../config/database.js";
import { ValidationError, NotFoundError } from "../../../lib/errors.js";

const PROFILES = ["office", "datacenter"];
const LINK_TYPES = ["fiber", "dsl", "lte", "fixed_wireless", "satellite", "other"];

const shape = (c) => ({
  id: c.id, name: c.name, provider: c.provider, linkType: c.linkType, role: c.role,
  downMbps: c.downMbps, upMbps: c.upMbps, ipAddress: c.ipAddress, gateway: c.gateway,
  status: c.status, monthlyUsageGb: c.monthlyUsageGb, dataCapGb: c.dataCapGb,
  usagePct: c.dataCapGb ? Math.min(100, Math.round((c.monthlyUsageGb / c.dataCapGb) * 100)) : null,
  monthlyCost: c.monthlyCost, currency: c.currency, notes: c.notes,
  createdAt: c.createdAt, updatedAt: c.updatedAt,
});

// ── Profile ──────────────────────────────────────────────────────────────────
export async function getProfile(tenantId) {
  const t = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { networkProfile: true } });
  return { profile: t?.networkProfile || "office" };
}
export async function setProfile(tenantId, profile) {
  if (!PROFILES.includes(profile)) throw new ValidationError("Unknown network profile");
  await prisma.tenant.update({ where: { id: tenantId }, data: { networkProfile: profile } });
  return { profile };
}

// ── Connections (ISP / WAN links) ────────────────────────────────────────────
export async function list(tenantId) {
  const rows = await prisma.networkConnection.findMany({ where: { tenantId }, orderBy: [{ role: "asc" }, { createdAt: "asc" }] });
  return rows.map(shape);
}

export async function create(tenantId, body = {}) {
  const name = String(body.name || "").trim();
  if (!name) throw new ValidationError("A connection name is required");
  const row = await prisma.networkConnection.create({
    data: {
      tenantId, name,
      provider: body.provider || null,
      linkType: LINK_TYPES.includes(body.linkType) ? body.linkType : "fiber",
      role: body.role === "backup" ? "backup" : "primary",
      downMbps: num(body.downMbps), upMbps: num(body.upMbps),
      ipAddress: body.ipAddress || null, gateway: body.gateway || null,
      status: ["up", "down", "degraded"].includes(body.status) ? body.status : "up",
      monthlyUsageGb: num(body.monthlyUsageGb) ?? 0,
      dataCapGb: num(body.dataCapGb),
      monthlyCost: num(body.monthlyCost),
      currency: body.currency ? String(body.currency).slice(0, 8) : "LRD",
      notes: body.notes || null,
    },
  });
  return shape(row);
}

export async function update(tenantId, id, body = {}) {
  const existing = await prisma.networkConnection.findFirst({ where: { id, tenantId } });
  if (!existing) throw new NotFoundError("Connection not found");
  const data = {};
  for (const k of ["name", "provider", "ipAddress", "gateway", "notes"]) if (body[k] !== undefined) data[k] = body[k] || null;
  if (body.name !== undefined) data.name = String(body.name).trim();
  if (body.linkType !== undefined && LINK_TYPES.includes(body.linkType)) data.linkType = body.linkType;
  if (body.role !== undefined) data.role = body.role === "backup" ? "backup" : "primary";
  if (body.status !== undefined && ["up", "down", "degraded"].includes(body.status)) data.status = body.status;
  for (const k of ["downMbps", "upMbps", "monthlyUsageGb", "dataCapGb", "monthlyCost"]) if (body[k] !== undefined) data[k] = num(body[k]);
  if (body.currency !== undefined) data.currency = String(body.currency).slice(0, 8);
  const row = await prisma.networkConnection.update({ where: { id }, data });
  return shape(row);
}

export async function remove(tenantId, id) {
  const c = await prisma.networkConnection.findFirst({ where: { id, tenantId } });
  if (!c) throw new NotFoundError("Connection not found");
  await prisma.networkConnection.delete({ where: { id } });
  return { deleted: true };
}

// ── Office summary (internet + routers + devices at a glance) ─────────────────
export async function summary(tenantId) {
  const [conns, devicesTotal, devicesUp, routers, alertsActive] = await Promise.all([
    prisma.networkConnection.findMany({ where: { tenantId } }),
    prisma.networkDevice.count({ where: { tenantId } }),
    prisma.networkDevice.count({ where: { tenantId, status: "up" } }),
    prisma.networkDevice.count({ where: { tenantId, device_type: { in: ["router", "gateway", "firewall", "access_point"] } } }),
    prisma.networkAlert.count({ where: { tenantId, status: { not: "resolved" } } }).catch(() => 0),
  ]);
  const linksUp = conns.filter((c) => c.status === "up").length;
  const totalDown = conns.reduce((s, c) => s + (c.downMbps || 0), 0);
  const totalUp = conns.reduce((s, c) => s + (c.upMbps || 0), 0);
  const usageGb = conns.reduce((s, c) => s + (c.monthlyUsageGb || 0), 0);
  const capGb = conns.reduce((s, c) => s + (c.dataCapGb || 0), 0);
  const monthlyCost = conns.reduce((s, c) => s + (c.monthlyCost || 0), 0);
  return {
    links: conns.length, linksUp,
    totalDownMbps: totalDown, totalUpMbps: totalUp,
    usageGb: Math.round(usageGb), capGb: capGb || null,
    usagePct: capGb ? Math.min(100, Math.round((usageGb / capGb) * 100)) : null,
    monthlyCost, currency: conns[0]?.currency || "LRD",
    devicesTotal, devicesUp, routers, alertsActive,
  };
}

function num(v) {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
