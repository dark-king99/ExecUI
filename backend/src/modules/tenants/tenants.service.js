/**
 * Organization deletion — staged, guarded, and reversible until it isn't.
 *
 * Deleting a tenant is the most destructive thing this product can do: one row
 * removed takes ~96 tables of an entire company with it. The database will now
 * do that in a single statement (see the tenant_deletion_cascade migration), so
 * everything here exists to make sure it only happens deliberately:
 *
 *   1. **Typed confirmation.** The caller must retype the organization's exact
 *      name. Not a checkbox — something you cannot click through by accident.
 *   2. **Legal holds refuse.** A hold exists precisely to stop data being
 *      destroyed, so an active one blocks the request outright and is checked
 *      AGAIN at purge time: a hold placed during the grace window must still
 *      win, or the guarantee is worthless.
 *   3. **A grace window.** The request schedules the purge; a scheduler carries
 *      it out later. Until then any admin can cancel. This is what makes a
 *      mistaken — or malicious — request survivable.
 *   4. **An export first.** The org can download everything the governance
 *      registry knows it holds before the data stops existing.
 *
 * Only when all of that has passed does anything get deleted.
 */
import { Prisma } from "@prisma/client";
import prisma from "../../config/database.js";
import { runUnscoped, runWithTenant } from "../../lib/tenantContext.js";
import { log } from "../../lib/logger.js";
import { CATEGORIES } from "../governance/governance.registry.js";

const err = (message, status = 400) => Object.assign(new Error(message), { status });

/** Days between requesting a deletion and the purge running. */
export const GRACE_DAYS = Number(process.env.TENANT_DELETION_GRACE_DAYS) || 30;

// ── What a purge would destroy ───────────────────────────────────────────────
const MODELS = Prisma.dmmf.datamodel.models;
const delegateName = (model) => model[0].toLowerCase() + model.slice(1);

/** Every model carrying a tenantId — the blast radius, straight from the schema. */
export const TENANT_MODELS = MODELS
  .filter((m) => m.fields.some((f) => f.name === "tenantId"))
  .map((m) => m.name);

/**
 * Models that reference `User` with RESTRICT.
 *
 * The cascade from Tenant deletes both these rows and the User rows, but
 * Postgres fires those referential actions in constraint order, and RESTRICT is
 * checked immediately — so whether the delete succeeds would otherwise depend on
 * which trigger happens to run first. Clearing these explicitly before the
 * tenant row goes removes the ordering dependency entirely. Derived from the
 * schema so a new model can't quietly reintroduce the problem.
 */
export const USER_RESTRICTED_MODELS = MODELS
  .filter((m) =>
    m.fields.some((f) => f.name === "tenantId") &&
    m.fields.some((f) =>
      f.kind === "object" && f.type === "User" &&
      (f.relationOnDelete ?? "Restrict") === "Restrict" &&
      (f.relationFromFields ?? []).length > 0),
  )
  .map((m) => m.name);

/** Row counts per table for one tenant — what deletion would actually remove. */
export async function previewDeletion(tenantId) {
  const counts = {};
  let total = 0;
  await runUnscoped(async () => {
    for (const model of TENANT_MODELS) {
      const d = prisma[delegateName(model)];
      if (!d?.count) continue;
      const n = await d.count({ where: { tenantId } }).catch(() => 0);
      if (n > 0) { counts[model] = n; total += n; }
    }
  });
  return { total, tables: Object.keys(counts).length, counts };
}

// ── Status ───────────────────────────────────────────────────────────────────
const shape = (t) => ({
  id: t.id,
  name: t.name,
  requestedAt: t.deletionRequestedAt,
  requestedById: t.deletionRequestedById,
  scheduledFor: t.deletionScheduledFor,
  reason: t.deletionReason,
  pending: !!t.deletionScheduledFor,
  graceDays: GRACE_DAYS,
});

export async function deletionStatus(tenantId) {
  const tenant = await runUnscoped(async () => prisma.tenant.findFirst({ where: { id: tenantId } }));
  if (!tenant) throw err("Organization not found", 404);
  const holds = await activeHolds(tenantId);
  return { ...shape(tenant), blockingHolds: holds.map((h) => ({ id: h.id, name: h.name, scope: h.scope })) };
}

/** Active legal holds for a tenant. Any one of them blocks a purge. */
async function activeHolds(tenantId) {
  return runUnscoped(async () =>
    prisma.legalHold.findMany({
      where: { tenantId, active: true },
      select: { id: true, name: true, scope: true, category: true, subjectEmail: true },
    }),
  );
}

// ── Request / cancel ─────────────────────────────────────────────────────────
export async function requestDeletion(tenantId, userId, { confirmName, reason } = {}) {
  const tenant = await runUnscoped(async () => prisma.tenant.findFirst({ where: { id: tenantId } }));
  if (!tenant) throw err("Organization not found", 404);
  if (tenant.deletionScheduledFor) throw err("Deletion is already scheduled for this organization", 409);

  // Retyping the name is the whole guard — compare it strictly, only forgiving
  // surrounding whitespace and case.
  const typed = String(confirmName ?? "").trim();
  if (!typed) throw err("Type the organization's name to confirm");
  if (typed.toLowerCase() !== tenant.name.trim().toLowerCase()) {
    throw err(`That doesn't match. Type the organization's name exactly: "${tenant.name}"`);
  }

  const holds = await activeHolds(tenantId);
  if (holds.length) {
    throw err(
      `A legal hold is in force (${holds.map((h) => h.name).join(", ")}). ` +
      "Release it before deleting the organization — a hold exists to stop exactly this.",
      409,
    );
  }

  const scheduledFor = new Date(Date.now() + GRACE_DAYS * 86_400_000);
  const updated = await runUnscoped(async () =>
    prisma.tenant.update({
      where: { id: tenantId },
      data: {
        deletionRequestedAt: new Date(),
        deletionRequestedById: userId ?? null,
        deletionScheduledFor: scheduledFor,
        deletionReason: reason ? String(reason).slice(0, 500) : null,
      },
    }),
  );

  await prisma.auditLog.create({
    data: {
      userId, tenantId, action: "request_tenant_deletion", resource: "tenant", resourceId: tenantId,
      detail: `Deletion scheduled for ${scheduledFor.toISOString()}${reason ? ` — ${String(reason).slice(0, 200)}` : ""}`,
    },
  });
  log.info("tenant_deletion_requested", { tenantId, scheduledFor });

  return shape(updated);
}

export async function cancelDeletion(tenantId, userId) {
  const tenant = await runUnscoped(async () => prisma.tenant.findFirst({ where: { id: tenantId } }));
  if (!tenant) throw err("Organization not found", 404);
  if (!tenant.deletionScheduledFor) throw err("No deletion is scheduled", 409);

  const updated = await runUnscoped(async () =>
    prisma.tenant.update({
      where: { id: tenantId },
      data: {
        deletionRequestedAt: null, deletionRequestedById: null,
        deletionScheduledFor: null, deletionReason: null,
      },
    }),
  );
  await prisma.auditLog.create({
    data: {
      userId, tenantId, action: "cancel_tenant_deletion", resource: "tenant", resourceId: tenantId,
      detail: "Scheduled deletion cancelled",
    },
  });
  return shape(updated);
}

// ── Export ───────────────────────────────────────────────────────────────────
const pick = (row, fields) => Object.fromEntries(fields.filter((f) => f in row).map((f) => [f, row[f]]));

/**
 * Everything the governance registry declares this organization holds.
 *
 * Deliberately built from the same registry that drives data-subject exports
 * and retention: a privacy answer you can only give by grepping the codebase is
 * one you can't defend, and that applies to an org's own copy of its data too.
 */
export async function exportOrganization(tenantId) {
  const tenant = await runUnscoped(async () =>
    prisma.tenant.findFirst({
      where: { id: tenantId },
      select: { id: true, name: true, slug: true, code: true, plan: true, industry: true, createdAt: true },
    }),
  );
  if (!tenant) throw err("Organization not found", 404);

  const data = {};
  await runWithTenant({ tenantId }, async () => {
    for (const cat of CATEGORIES) {
      const d = prisma[cat.model];
      if (!d?.findMany) continue;
      const rows = await d.findMany({ take: 50_000 }).catch(() => []);
      data[cat.id] = {
        label: cat.label,
        count: rows.length,
        // Only registry-declared fields, exactly as the subject export does —
        // so this can't accidentally start including a column nobody reviewed.
        rows: cat.exportFields ? rows.map((r) => pick(r, cat.exportFields)) : rows,
      };
    }
  });

  return {
    organization: tenant,
    exportedAt: new Date().toISOString(),
    notice:
      "A copy of this organization's data, generated before deletion. " +
      "Categories follow the data-governance registry.",
    data,
  };
}

// ── The purge ────────────────────────────────────────────────────────────────
/**
 * Actually destroy an organization. No route reaches this directly — the
 * scheduler calls it, and only for a tenant whose grace window has elapsed.
 */
export async function purgeTenant(tenantId, { force = false } = {}) {
  const tenant = await runUnscoped(async () => prisma.tenant.findFirst({ where: { id: tenantId } }));
  if (!tenant) throw err("Organization not found", 404);
  if (!force) {
    if (!tenant.deletionScheduledFor) throw err("No deletion is scheduled for this organization", 409);
    if (tenant.deletionScheduledFor > new Date()) throw err("The grace window has not elapsed", 409);
  }

  // Re-check holds at the moment of destruction. One placed during the grace
  // window must still stop this, or the guarantee means nothing.
  const holds = await activeHolds(tenantId);
  if (holds.length) {
    log.warn("tenant_purge_blocked_by_hold", { tenantId, holds: holds.map((h) => h.id) });
    throw err(`Blocked by an active legal hold (${holds.map((h) => h.name).join(", ")})`, 409);
  }

  const preview = await previewDeletion(tenantId);

  await runUnscoped(async () => {
    await prisma.$transaction(async (tx) => {
      // Clear the RESTRICT-referencing tables first so the outcome never depends
      // on Postgres's trigger ordering (see USER_RESTRICTED_MODELS).
      for (const model of USER_RESTRICTED_MODELS) {
        const d = tx[delegateName(model)];
        if (d?.deleteMany) await d.deleteMany({ where: { tenantId } });
      }
      // One statement takes the rest.
      await tx.tenant.delete({ where: { id: tenantId } });
    });
  });

  log.info("tenant_purged", { tenantId, name: tenant.name, rows: preview.total, tables: preview.tables });
  return { id: tenantId, name: tenant.name, removed: preview };
}

/** Tenants whose grace window has elapsed. Used by the scheduler. */
export async function dueForPurge(now = new Date()) {
  return runUnscoped(async () =>
    prisma.tenant.findMany({
      where: { deletionScheduledFor: { not: null, lte: now } },
      select: { id: true, name: true, deletionScheduledFor: true },
    }),
  );
}

/** Purge everything due. Returns what happened, including what was blocked. */
export async function runScheduledPurges({ now = new Date() } = {}) {
  const due = await dueForPurge(now);
  const purged = [];
  const blocked = [];
  for (const t of due) {
    try {
      purged.push(await purgeTenant(t.id));
    } catch (e) {
      blocked.push({ id: t.id, name: t.name, reason: e.message });
    }
  }
  return { due: due.length, purged, blocked };
}
