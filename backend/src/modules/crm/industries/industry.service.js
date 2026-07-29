/**
 * Industry service — the generic engine behind every vertical.
 *
 * All industry data lives in the additive IndustryRecord table (auto tenant-
 * scoped by the Prisma tenant guard), so nothing here touches a core CRM model.
 * The core CRM keeps working exactly as before regardless of the chosen industry.
 */
import prisma from "../../../config/database.js";
import { ValidationError, NotFoundError } from "../../../lib/errors.js";
import { INDUSTRIES, GENERAL, isValidIndustry, objectMeta, objectTypesFor, industryObjects } from "./registry.js";
import { entitlementsFor, DEFAULT_PLAN } from "../../billing/plans.config.js";

const shape = (r) => ({
  id: r.id,
  industry: r.industry,
  objectType: r.objectType,
  name: r.name,
  stage: r.stage,
  status: r.status,
  amount: r.amount,
  currency: r.currency,
  ownerId: r.ownerId,
  ownerName: r.ownerName,
  data: r.data ?? {},
  createdAt: r.createdAt,
  updatedAt: r.updatedAt,
});

// ── Tenant industry selection ────────────────────────────────────────────────
export async function getIndustry(tenantId) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { industry: true } });
  const industry = tenant?.industry || GENERAL;
  return { industry, name: INDUSTRIES[industry]?.name ?? "General", available: catalog() };
}

/** Set the tenant's industry (admin action). "general" reverts to core-only. */
export async function setIndustry(tenantId, industry) {
  if (!isValidIndustry(industry)) throw new ValidationError("Unknown industry");
  // Selecting a vertical must be covered by the plan (general always reverts to
  // core CRM, so it's always allowed). Belt-and-braces on top of the admin-only
  // route guard, and future-proof if a plan ever drops industry customization.
  if (industry !== GENERAL) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId }, select: { plan: true, planSolutions: true },
    });
    const ent = entitlementsFor(tenant?.plan || DEFAULT_PLAN, tenant?.planSolutions || []);
    if (!ent.industry) {
      const err = new Error("Industry customization isn't included in your current plan. Upgrade your subscription to enable it.");
      err.status = 403;
      err.code = "PLAN_UPGRADE_REQUIRED";
      throw err;
    }
  }
  await prisma.tenant.update({ where: { id: tenantId }, data: { industry } });
  return getIndustry(tenantId);
}

/** Just the tenant's current industry id (cheap PK lookup). */
export async function currentIndustryId(tenantId) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { industry: true } });
  return tenant?.industry || GENERAL;
}

/** The full catalog (all industries + their object types, surface-tagged). */
export function catalog() {
  return Object.entries(INDUSTRIES).map(([id, def]) => ({
    id,
    name: def.name,
    objects: industryObjects(id),
  }));
}

// ── Generic records ──────────────────────────────────────────────────────────
function requireObject(industry, objectType) {
  const meta = objectMeta(industry, objectType);
  if (!meta) {
    throw new ValidationError(
      `"${objectType}" is not a valid object for the ${industry} industry (expected one of: ${objectTypesFor(industry).join(", ") || "none"})`
    );
  }
  return meta;
}

export async function listRecords(tenantId, industry, objectType, query = {}) {
  requireObject(industry, objectType);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 100, 1), 500);
  const offset = Math.max(parseInt(query.offset, 10) || 0, 0);
  const where = { tenantId, industry, objectType };
  if (query.stage) where.stage = String(query.stage);
  if (query.status) where.status = String(query.status);
  if (query.q) where.name = { contains: String(query.q), mode: "insensitive" };

  const [rows, total] = await Promise.all([
    prisma.industryRecord.findMany({ where, orderBy: { updatedAt: "desc" }, take: limit, skip: offset }),
    prisma.industryRecord.count({ where }),
  ]);
  return { records: rows.map(shape), total, limit, offset };
}

export async function createRecord(tenantId, industry, objectType, body = {}, user = {}) {
  const meta = requireObject(industry, objectType);
  const name = String(body.name ?? "").trim();
  if (!name) throw new ValidationError("A name is required");

  // Built-in columns are explicit; all industry-specific fields live in `data`.
  const { stage, status, amount, currency, ownerId, ownerName, data } = body;
  const resolvedStage = meta.kind === "pipeline" ? (stage && meta.stages.includes(stage) ? stage : meta.stages[0]) : null;

  const row = await prisma.industryRecord.create({
    data: {
      tenantId, industry, objectType, name,
      stage: resolvedStage,
      status: status ? String(status) : "active",
      amount: amount != null && amount !== "" ? Number(amount) : null,
      currency: currency ? String(currency).slice(0, 8) : "LRD",
      ownerId: ownerId ?? user.userId ?? null,
      ownerName: ownerName ?? null,
      data: data && typeof data === "object" ? data : {},
    },
  });
  return shape(row);
}

export async function updateRecord(tenantId, id, patch = {}) {
  const existing = await prisma.industryRecord.findFirst({ where: { id, tenantId } });
  if (!existing) throw new NotFoundError("Record not found");
  const meta = objectMeta(existing.industry, existing.objectType);

  const data = {};
  if (patch.name !== undefined) data.name = String(patch.name).trim();
  if (patch.status !== undefined) data.status = String(patch.status);
  if (patch.amount !== undefined) data.amount = patch.amount === "" || patch.amount == null ? null : Number(patch.amount);
  if (patch.currency !== undefined) data.currency = String(patch.currency).slice(0, 8);
  if (patch.ownerId !== undefined) data.ownerId = patch.ownerId || null;
  if (patch.ownerName !== undefined) data.ownerName = patch.ownerName || null;
  if (patch.stage !== undefined && meta?.kind === "pipeline") {
    if (!meta.stages.includes(patch.stage)) throw new ValidationError(`Invalid stage "${patch.stage}"`);
    data.stage = patch.stage;
  }
  // Merge arbitrary industry fields into the JSON blob.
  if (patch.data !== undefined && patch.data && typeof patch.data === "object") {
    data.data = { ...(existing.data ?? {}), ...patch.data };
  }

  const row = await prisma.industryRecord.update({ where: { id }, data });
  return shape(row);
}

export async function deleteRecord(tenantId, id) {
  const existing = await prisma.industryRecord.findFirst({ where: { id, tenantId } });
  if (!existing) throw new NotFoundError("Record not found");
  await prisma.industryRecord.delete({ where: { id } });
  return { deleted: true };
}

/** Aggregate stats for one object type: counts per stage/status + amount sum. */
export async function stats(tenantId, industry, objectType) {
  const meta = requireObject(industry, objectType);
  const where = { tenantId, industry, objectType };
  const [total, byStage, sum] = await Promise.all([
    prisma.industryRecord.count({ where }),
    meta.kind === "pipeline"
      ? prisma.industryRecord.groupBy({ by: ["stage"], where, _count: { _all: true }, _sum: { amount: true } })
      : Promise.resolve([]),
    prisma.industryRecord.aggregate({ where, _sum: { amount: true } }),
  ]);
  const stages = meta.kind === "pipeline"
    ? meta.stages.map((s) => {
        const row = byStage.find((b) => b.stage === s);
        return { stage: s, count: row?._count?._all ?? 0, amount: row?._sum?.amount ?? 0 };
      })
    : [];
  return { total, kind: meta.kind, stages, totalAmount: sum._sum.amount ?? 0 };
}
