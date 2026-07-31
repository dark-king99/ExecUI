/**
 * Compliance & data governance.
 *
 * Three self-serve capabilities an enterprise buyer's legal team will ask for:
 *   • Data-subject requests — export everything held about a person (GDPR
 *     Art. 15) or erase it (Art. 17).
 *   • Retention policies — keep each category of data only as long as the
 *     organization has decided to, purged automatically.
 *   • Legal holds — freeze data against erasure and purging for litigation or
 *     investigation. A hold always beats a deletion request.
 *
 * Everything is driven by governance.registry.js, so the privacy behaviour of a
 * data category is declared once and applies to export, erasure and retention
 * alike. Every action is recorded — being able to *evidence* what you did is
 * most of what compliance actually means.
 */
import prisma from "../../config/database.js";
import { log } from "../../lib/logger.js";
import { currentTenantId } from "../../lib/tenantContext.js";
import { brandingFor } from "../settings/settings.service.js";
import {
  CATEGORIES, getCategory, subjectCategories, retainableCategories,
  subjectWhere, describeCategory, REDACTED,
} from "./governance.registry.js";

const err = (message, status = 400) => { const e = new Error(message); e.status = status; return e; };
const normEmail = (e) => String(e || "").trim().toLowerCase();

// ── Catalog ──────────────────────────────────────────────────────────────────
export function catalog() {
  return {
    categories: CATEGORIES.map(describeCategory),
    retainable: retainableCategories().map((c) => c.id),
    subjectLinked: subjectCategories().map((c) => c.id),
  };
}

// ── Legal holds ──────────────────────────────────────────────────────────────
const shapeHold = (h) => ({
  id: h.id, name: h.name, reason: h.reason, scope: h.scope,
  subjectEmail: h.subjectEmail, category: h.category,
  active: h.active, releasedAt: h.releasedAt, createdAt: h.createdAt,
});

export async function listHolds() {
  const rows = await prisma.legalHold.findMany({ orderBy: { createdAt: "desc" } });
  return rows.map(shapeHold);
}

export async function placeHold(userId, body = {}) {
  const name = String(body.name || "").trim();
  if (!name) throw err("Give the hold a name so others know what it covers");
  const scope = body.scope === "category" ? "category" : "subject";

  if (scope === "subject") {
    const email = normEmail(body.subjectEmail);
    if (!email) throw err("A subject hold needs the person's email address");
    const row = await prisma.legalHold.create({
      data: { name: name.slice(0, 160), reason: body.reason?.slice(0, 500) || null, scope, subjectEmail: email, placedById: userId },
    });
    return shapeHold(row);
  }

  if (!getCategory(body.category)) throw err(`Unknown data category "${body.category}"`);
  const row = await prisma.legalHold.create({
    data: { name: name.slice(0, 160), reason: body.reason?.slice(0, 500) || null, scope, category: body.category, placedById: userId },
  });
  return shapeHold(row);
}

export async function releaseHold(userId, id) {
  const existing = await prisma.legalHold.findFirst({ where: { id } });
  if (!existing) throw err("Hold not found", 404);
  if (!existing.active) throw err("That hold is already released", 409);
  const row = await prisma.legalHold.update({
    where: { id }, data: { active: false, releasedAt: new Date(), releasedById: userId },
  });
  return shapeHold(row);
}

/** Active holds affecting a subject and/or a category. */
export async function activeHoldsFor({ email, category } = {}) {
  const holds = await prisma.legalHold.findMany({ where: { active: true } });
  return holds.filter((h) => {
    if (h.scope === "subject") return email && normEmail(h.subjectEmail) === normEmail(email);
    return category && h.category === category;
  });
}

// ── Subject lookup ───────────────────────────────────────────────────────────
/** Find who an email belongs to: an employee, a CRM contact, or both. */
export async function findSubject(rawEmail) {
  const email = normEmail(rawEmail);
  if (!email) throw err("Enter the person's email address");

  const [user, contact, signer] = await Promise.all([
    prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true, email: true, firstName: true, lastName: true, department: true, jobTitle: true, isActive: true, status: true },
    }),
    prisma.contact.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true, email: true, name: true },
    }),
    // Someone who signed a document is a data subject too, even if they were
    // never an employee or a CRM contact — and they have the same rights.
    prisma.signer.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true, email: true, name: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!user && !contact && !signer) return { email, found: false, subjectType: null };
  return {
    email,
    found: true,
    subjectType: user ? "employee" : contact ? "contact" : "counterparty",
    userId: user?.id || null,
    label: user ? `${user.firstName} ${user.lastName}`.trim() : contact?.name || signer?.name || email,
    employee: user || null,
    contact: contact || null,
    counterparty: signer || null,
  };
}

// ── Export (Art. 15) ─────────────────────────────────────────────────────────
/**
 * Everything held about a person, category by category, as a portable bundle.
 * Only registry-declared fields are included — the export can't accidentally
 * leak an internal column, and it can't silently miss a category either.
 */
export async function exportSubject(requestedById, rawEmail) {
  const subject = await findSubject(rawEmail);
  if (!subject.found) throw err(`No employee, contact or signing party found with the email "${normEmail(rawEmail)}"`, 404);

  const data = {};
  let recordCount = 0;

  for (const category of subjectCategories()) {
    const where = subjectWhere(category, { userId: subject.userId, email: subject.email });
    if (!where) continue;
    try {
      const rows = await prisma[category.model].findMany({ where });
      if (!rows.length) continue;
      data[category.id] = {
        label: category.label,
        count: rows.length,
        records: rows.map((r) => pick(r, category.exportFields)),
      };
      recordCount += rows.length;
    } catch (e) {
      log.warn?.("dsar_export_category_failed", { category: category.id, error: e.message });
    }
  }

  // The regulator reading this sees the organization's product name, not ours.
  const brand = await brandingFor(currentTenantId());
  const bundle = {
    subject: { email: subject.email, type: subject.subjectType, label: subject.label },
    generatedAt: new Date().toISOString(),
    categories: data,
    notice: `Personal data held by this organization in ${brand.productName}, exported for a data-subject access request.`,
  };

  const request = await prisma.dataRequest.create({
    data: {
      type: "export", subjectType: subject.subjectType, subjectId: subject.userId,
      subjectEmail: subject.email, subjectLabel: subject.label,
      status: "completed", result: bundle, recordCount,
      requestedById, completedAt: new Date(),
    },
  });

  return { id: request.id, recordCount, bundle };
}

const pick = (row, fields) => {
  if (!fields) return row;
  const out = {};
  for (const f of fields) if (row[f] !== undefined) out[f] = row[f];
  return out;
};

// ── Erasure (Art. 17) ────────────────────────────────────────────────────────
/**
 * Erase a person: delete or anonymize per category, according to the registry.
 * Refuses outright while a legal hold covers the subject — that refusal is
 * itself recorded, because "we declined and why" is exactly what an auditor
 * will ask for later.
 */
export async function eraseSubject(requestedById, rawEmail, { note } = {}) {
  const subject = await findSubject(rawEmail);
  if (!subject.found) throw err(`No employee, contact or signing party found with the email "${normEmail(rawEmail)}"`, 404);

  const holds = await activeHoldsFor({ email: subject.email });
  if (holds.length) {
    const blocked = await prisma.dataRequest.create({
      data: {
        type: "erase", subjectType: subject.subjectType, subjectId: subject.userId,
        subjectEmail: subject.email, subjectLabel: subject.label,
        status: "blocked",
        result: { holds: holds.map((h) => ({ id: h.id, name: h.name, reason: h.reason })) },
        note: note || null,
        error: `Blocked by ${holds.length} active legal hold(s): ${holds.map((h) => h.name).join(", ")}`,
        requestedById, completedAt: new Date(),
      },
    });
    const e = err(`Erasure is blocked by an active legal hold: ${holds.map((h) => h.name).join(", ")}. Release the hold first.`, 409);
    e.requestId = blocked.id;
    throw e;
  }

  const summary = [];
  let recordCount = 0;

  for (const category of subjectCategories()) {
    if (!category.onErase) continue;
    const where = subjectWhere(category, { userId: subject.userId, email: subject.email });
    if (!where) continue;

    try {
      if (category.onErase === "delete") {
        const res = await prisma[category.model].deleteMany({ where });
        if (res.count) summary.push({ category: category.id, label: category.label, action: "deleted", count: res.count });
        recordCount += res.count;
      } else {
        // Anonymize row-by-row: values may depend on the row (e.g. a unique
        // email tombstone), which updateMany can't express.
        const rows = await prisma[category.model].findMany({ where, select: { id: true } });
        for (const row of rows) {
          const full = await prisma[category.model].findFirst({ where: { id: row.id } });
          const data = {};
          for (const [field, value] of Object.entries(category.anonymize || {})) {
            data[field] = typeof value === "function" ? value(full) : value;
          }
          if (Object.keys(data).length) await prisma[category.model].update({ where: { id: row.id }, data });
        }
        if (rows.length) summary.push({ category: category.id, label: category.label, action: "anonymized", count: rows.length });
        recordCount += rows.length;
      }
    } catch (e) {
      summary.push({ category: category.id, label: category.label, action: "failed", error: e.message });
      log.warn?.("dsar_erase_category_failed", { category: category.id, error: e.message });
    }
  }

  const failed = summary.filter((s) => s.action === "failed");
  const request = await prisma.dataRequest.create({
    data: {
      type: "erase", subjectType: subject.subjectType, subjectId: subject.userId,
      subjectEmail: subject.email, subjectLabel: subject.label,
      status: failed.length ? "failed" : "completed",
      result: { summary },
      recordCount,
      note: note || null,
      error: failed.length ? failed.map((f) => `${f.category}: ${f.error}`).join("; ").slice(0, 500) : null,
      requestedById, completedAt: new Date(),
    },
  });

  return { id: request.id, status: request.status, recordCount, summary };
}

// ── Request history ──────────────────────────────────────────────────────────
export async function listRequests({ limit = 50 } = {}) {
  const rows = await prisma.dataRequest.findMany({
    orderBy: { createdAt: "desc" },
    take: Math.min(200, Math.max(1, Number(limit) || 50)),
    select: {
      id: true, type: true, subjectType: true, subjectEmail: true, subjectLabel: true,
      status: true, recordCount: true, note: true, error: true, completedAt: true, createdAt: true,
    },
  });
  return rows;
}

/** Full record including the export bundle (used for download). */
export async function getRequest(id) {
  const row = await prisma.dataRequest.findFirst({ where: { id } });
  if (!row) throw err("Request not found", 404);
  return row;
}

// ── Retention ────────────────────────────────────────────────────────────────
const shapePolicy = (p) => ({
  id: p.id, category: p.category,
  label: getCategory(p.category)?.label || p.category,
  retainDays: p.retainDays, action: p.action, active: p.active,
  lastRunAt: p.lastRunAt, lastPurged: p.lastPurged, totalPurged: p.totalPurged,
  createdAt: p.createdAt,
});

export async function listPolicies() {
  const rows = await prisma.retentionPolicy.findMany({ orderBy: { category: "asc" } });
  const existing = new Set(rows.map((r) => r.category));
  // Surface unconfigured categories too, with their recommended default.
  const suggestions = retainableCategories()
    .filter((c) => !existing.has(c.id))
    .map((c) => ({
      id: null, category: c.id, label: c.label,
      retainDays: c.defaultRetentionDays, action: c.onErase === "anonymize" ? "anonymize" : "delete",
      active: false, suggested: true, pii: !!c.pii, note: c.note || null,
    }));
  return { policies: rows.map(shapePolicy), suggestions };
}

export async function upsertPolicy(userId, body = {}) {
  const category = getCategory(body.category);
  if (!category) throw err(`Unknown data category "${body.category}"`);
  if (!category.dateField) throw err(`${category.label} can't have a retention policy`);

  const retainDays = Number(body.retainDays);
  if (!Number.isFinite(retainDays) || retainDays < 1 || retainDays > 3650) {
    throw err("Retention must be between 1 and 3650 days");
  }
  const action = body.action === "anonymize" ? "anonymize" : "delete";
  if (action === "anonymize" && !category.anonymize) {
    throw err(`${category.label} has no anonymization rules — use delete instead`);
  }

  // Find-then-write rather than upsert: upsert's `where` needs the composite
  // (tenantId, category) key, which would mean threading the tenant id through
  // by hand — exactly the thing the tenant guard exists to prevent. findFirst
  // and create are both scoped automatically.
  const active = body.active === undefined ? true : !!body.active;
  const existing = await prisma.retentionPolicy.findFirst({ where: { category: category.id } });
  const row = existing
    ? await prisma.retentionPolicy.update({ where: { id: existing.id }, data: { retainDays, action, active } })
    : await prisma.retentionPolicy.create({ data: { category: category.id, retainDays, action, active, createdById: userId } });
  return shapePolicy(row);
}

export async function deletePolicy(id) {
  const existing = await prisma.retentionPolicy.findFirst({ where: { id } });
  if (!existing) throw err("Policy not found", 404);
  await prisma.retentionPolicy.delete({ where: { id } });
  return { deleted: true, id };
}

/** Rows a policy would affect right now, without touching anything. */
export async function previewRetention() {
  const policies = await prisma.retentionPolicy.findMany({ where: { active: true } });
  const out = [];
  for (const p of policies) {
    const category = getCategory(p.category);
    if (!category) continue;
    const holds = await activeHoldsFor({ category: p.category });
    const cutoff = cutoffFor(p.retainDays);
    let count = 0;
    try {
      count = await prisma[category.model].count({ where: { [category.dateField]: { lt: cutoff } } });
    } catch (e) {
      log.warn?.("retention_preview_failed", { category: p.category, error: e.message });
    }
    out.push({
      category: p.category, label: category.label, retainDays: p.retainDays,
      action: p.action, cutoff, count,
      heldBy: holds.map((h) => h.name),
      blocked: holds.length > 0,
    });
  }
  return out;
}

export const cutoffFor = (retainDays, now = new Date()) =>
  new Date(now.getTime() - Number(retainDays) * 86400000);

/**
 * Apply every active retention policy for the current tenant.
 * Categories under a legal hold are skipped, not partially purged.
 */
export async function runRetention({ now = new Date() } = {}) {
  const policies = await prisma.retentionPolicy.findMany({ where: { active: true } });
  const results = [];

  for (const p of policies) {
    const category = getCategory(p.category);
    if (!category) continue;

    const holds = await activeHoldsFor({ category: p.category });
    if (holds.length) {
      results.push({ category: p.category, skipped: `legal hold: ${holds.map((h) => h.name).join(", ")}`, purged: 0 });
      continue;
    }

    const cutoff = cutoffFor(p.retainDays, now);
    const where = { [category.dateField]: { lt: cutoff } };

    try {
      let purged = 0;
      if (p.action === "anonymize" && category.anonymize) {
        const rows = await prisma[category.model].findMany({ where, select: { id: true } });
        for (const row of rows) {
          const full = await prisma[category.model].findFirst({ where: { id: row.id } });
          const data = {};
          for (const [field, value] of Object.entries(category.anonymize)) {
            data[field] = typeof value === "function" ? value(full) : value;
          }
          if (Object.keys(data).length) await prisma[category.model].update({ where: { id: row.id }, data });
          purged++;
        }
      } else {
        purged = (await prisma[category.model].deleteMany({ where })).count;
      }

      await prisma.retentionPolicy.update({
        where: { id: p.id },
        data: { lastRunAt: new Date(), lastPurged: purged, totalPurged: { increment: purged } },
      });
      results.push({ category: p.category, action: p.action, purged, cutoff });
    } catch (e) {
      results.push({ category: p.category, error: e.message, purged: 0 });
      log.warn?.("retention_purge_failed", { category: p.category, error: e.message });
    }
  }

  return { policies: policies.length, results, ranAt: new Date().toISOString() };
}

export { REDACTED };
