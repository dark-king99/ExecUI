/**
 * Reports service — saved report definitions, ad-hoc previews, exports and
 * delivery schedules.
 *
 * Access model: a caller may only build reports on datasets their *effective*
 * access allows — department permissions ∩ plan entitlements (the same rule the
 * rest of the app uses) — and employee data is admin-only. Tenant isolation is
 * automatic via the Prisma guard.
 */
import prisma from "../../config/database.js";
import { accessFor, intersectWithPlan } from "../access/access.policy.js";
import { entitlementsFor, DEFAULT_PLAN } from "../billing/plans.config.js";
import { DATASETS, getDataset, canUseDataset, datasetsFor, describeDataset, AGGREGATIONS, OPERATORS } from "./reports.datasets.js";
import { validateDefinition, runReport, DATE_PRESETS, MAX_ROWS } from "./reports.engine.js";
import { renderExport, FORMATS } from "./reports.export.js";
import { validateSchedule, computeNextRun, deliverSchedule, FREQUENCIES } from "./reports.schedule.js";

const ADMIN_ROLES = ["enterprise_admin", "system_admin"];
const err = (message, status = 400) => { const e = new Error(message); e.status = status; return e; };

/** Effective dataset access for the caller. */
export async function contextFor(userId, tenantId) {
  const [user, tenant] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, include: { role: true } }),
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { plan: true, planSolutions: true } }),
  ]);
  const roleName = user?.role?.name;
  const base = accessFor({ role: roleName, department: user?.department });
  const ent = entitlementsFor(tenant?.plan || DEFAULT_PLAN, tenant?.planSolutions || []);
  const access = intersectWithPlan(base, ent);
  return { sections: access.sections || [], isAdmin: ADMIN_ROLES.includes(roleName), userId, roleName };
}

/** Catalog of datasets this caller can report on, plus builder metadata. */
export async function listDatasets(userId, tenantId) {
  const ctx = await contextFor(userId, tenantId);
  return {
    datasets: datasetsFor(ctx).map(describeDataset),
    operators: OPERATORS,
    aggregations: AGGREGATIONS,
    datePresets: DATE_PRESETS,
    formats: FORMATS,
    frequencies: FREQUENCIES,
    maxRows: MAX_ROWS,
  };
}

function requireDataset(datasetId, ctx) {
  const dataset = getDataset(datasetId);
  if (!dataset) throw err(`Unknown dataset "${datasetId}"`, 404);
  if (!canUseDataset(dataset, ctx)) throw err("You don't have access to that data set.", 403);
  return dataset;
}

/** Run a definition without saving it (the builder's live preview). */
export async function preview(userId, tenantId, body = {}) {
  const ctx = await contextFor(userId, tenantId);
  const dataset = requireDataset(body.dataset, ctx);
  const def = validateDefinition(dataset, body.definition || body);
  const result = await runReport(dataset, def);
  return { dataset: dataset.id, datasetName: dataset.name, definition: def, ...result };
}

// ── Saved reports ────────────────────────────────────────────────────────────
const shape = (r) => ({
  id: r.id,
  name: r.name,
  description: r.description,
  dataset: r.dataset,
  datasetName: DATASETS[r.dataset]?.name || r.dataset,
  definition: r.definition,
  shared: r.shared,
  createdById: r.createdById,
  createdBy: r.createdBy ? `${r.createdBy.firstName} ${r.createdBy.lastName}`.trim() : null,
  scheduleCount: r._count?.schedules ?? (r.schedules?.length || 0),
  createdAt: r.createdAt,
  updatedAt: r.updatedAt,
});

/** Saved reports visible to the caller: org-shared ones plus their own private. */
export async function listReports(userId, tenantId) {
  const ctx = await contextFor(userId, tenantId);
  const rows = await prisma.report.findMany({
    where: { OR: [{ shared: true }, { createdById: userId }] },
    include: { createdBy: { select: { firstName: true, lastName: true } }, _count: { select: { schedules: true } } },
    orderBy: { updatedAt: "desc" },
  });
  // Hide reports on datasets this caller can no longer access (plan/role change).
  return rows.filter((r) => canUseDataset(getDataset(r.dataset), ctx)).map(shape);
}

async function loadReport(id, userId, ctx) {
  const r = await prisma.report.findFirst({
    where: { id },
    include: { createdBy: { select: { firstName: true, lastName: true } }, _count: { select: { schedules: true } } },
  });
  if (!r) throw err("Report not found", 404);
  if (!r.shared && r.createdById !== userId) throw err("Report not found", 404);
  requireDataset(r.dataset, ctx);
  return r;
}

export async function getReport(userId, tenantId, id) {
  const ctx = await contextFor(userId, tenantId);
  return shape(await loadReport(id, userId, ctx));
}

export async function createReport(userId, tenantId, body = {}) {
  const ctx = await contextFor(userId, tenantId);
  const dataset = requireDataset(body.dataset, ctx);
  const name = String(body.name || "").trim();
  if (!name) throw err("Give the report a name");
  const definition = validateDefinition(dataset, body.definition || {});
  const row = await prisma.report.create({
    data: {
      name: name.slice(0, 120),
      description: body.description ? String(body.description).slice(0, 500) : null,
      dataset: dataset.id,
      definition,
      shared: body.shared === undefined ? true : !!body.shared,
      createdById: userId,
    },
    include: { createdBy: { select: { firstName: true, lastName: true } }, _count: { select: { schedules: true } } },
  });
  return shape(row);
}

export async function updateReport(userId, tenantId, id, body = {}) {
  const ctx = await contextFor(userId, tenantId);
  const existing = await loadReport(id, userId, ctx);
  // Only the author or an admin may change a report others rely on.
  if (existing.createdById !== userId && !ctx.isAdmin) throw err("Only the report's author or an admin can change it.", 403);

  const datasetId = body.dataset || existing.dataset;
  const dataset = requireDataset(datasetId, ctx);
  const data = {};
  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) throw err("Give the report a name");
    data.name = name.slice(0, 120);
  }
  if (body.description !== undefined) data.description = body.description ? String(body.description).slice(0, 500) : null;
  if (body.shared !== undefined) data.shared = !!body.shared;
  if (body.dataset !== undefined) data.dataset = dataset.id;
  if (body.definition !== undefined || body.dataset !== undefined) {
    data.definition = validateDefinition(dataset, body.definition ?? existing.definition ?? {});
  }

  const row = await prisma.report.update({
    where: { id },
    data,
    include: { createdBy: { select: { firstName: true, lastName: true } }, _count: { select: { schedules: true } } },
  });
  return shape(row);
}

export async function deleteReport(userId, tenantId, id) {
  const ctx = await contextFor(userId, tenantId);
  const existing = await loadReport(id, userId, ctx);
  if (existing.createdById !== userId && !ctx.isAdmin) throw err("Only the report's author or an admin can delete it.", 403);
  await prisma.report.delete({ where: { id } }); // schedules cascade
  return { deleted: true, id };
}

/** Run a saved report. */
export async function runSaved(userId, tenantId, id, overrides = {}) {
  const ctx = await contextFor(userId, tenantId);
  const report = await loadReport(id, userId, ctx);
  const dataset = getDataset(report.dataset);
  const def = validateDefinition(dataset, { ...(report.definition || {}), ...overrides });
  const result = await runReport(dataset, def);
  return { report: shape(report), dataset: dataset.id, datasetName: dataset.name, definition: def, ...result };
}

// ── Export ───────────────────────────────────────────────────────────────────
/**
 * Render an export. Accepts either a saved report id or an ad-hoc definition,
 * so the builder can download what it is previewing before saving.
 */
export async function exportReport(userId, tenantId, { reportId, dataset: datasetId, definition, format = "csv", name } = {}) {
  const ctx = await contextFor(userId, tenantId);
  let dataset, def, title;

  if (reportId) {
    const report = await loadReport(reportId, userId, ctx);
    dataset = getDataset(report.dataset);
    def = validateDefinition(dataset, report.definition || {});
    title = report.name;
  } else {
    dataset = requireDataset(datasetId, ctx);
    def = validateDefinition(dataset, definition || {});
    title = name || dataset.name;
  }

  // Exports may pull more than a screen preview.
  def.limit = MAX_ROWS;
  const result = await runReport(dataset, def);
  return renderExport(format, result, { name: title, subtitle: dataset.name });
}

// ── Schedules ────────────────────────────────────────────────────────────────
const shapeSchedule = (s) => ({
  id: s.id,
  reportId: s.reportId,
  reportName: s.report?.name,
  format: s.format,
  frequency: s.frequency,
  hour: s.hour,
  minute: s.minute,
  weekday: s.weekday,
  dayOfMonth: s.dayOfMonth,
  timezone: s.timezone,
  recipients: s.recipients,
  active: s.active,
  nextRunAt: s.nextRunAt,
  lastRunAt: s.lastRunAt,
  lastStatus: s.lastStatus,
  lastError: s.lastError,
  runCount: s.runCount,
});

export async function listSchedules(userId, tenantId) {
  const rows = await prisma.reportSchedule.findMany({
    include: { report: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(shapeSchedule);
}

export async function createSchedule(userId, tenantId, body = {}) {
  const ctx = await contextFor(userId, tenantId);
  const report = await loadReport(body.reportId, userId, ctx);
  const spec = validateSchedule(body);
  const nextRunAt = computeNextRun(spec, new Date());
  const row = await prisma.reportSchedule.create({
    data: { ...spec, reportId: report.id, createdById: userId, nextRunAt },
    include: { report: { select: { name: true } } },
  });
  return shapeSchedule(row);
}

export async function updateSchedule(userId, tenantId, id, body = {}) {
  const ctx = await contextFor(userId, tenantId);
  const existing = await prisma.reportSchedule.findFirst({ where: { id } });
  if (!existing) throw err("Schedule not found", 404);
  if (existing.createdById !== userId && !ctx.isAdmin) throw err("Only the schedule's owner or an admin can change it.", 403);

  const spec = validateSchedule({ ...existing, ...body });
  const nextRunAt = spec.active ? computeNextRun(spec, new Date()) : null;
  const row = await prisma.reportSchedule.update({
    where: { id },
    data: { ...spec, nextRunAt },
    include: { report: { select: { name: true } } },
  });
  return shapeSchedule(row);
}

export async function deleteSchedule(userId, tenantId, id) {
  const ctx = await contextFor(userId, tenantId);
  const existing = await prisma.reportSchedule.findFirst({ where: { id } });
  if (!existing) throw err("Schedule not found", 404);
  if (existing.createdById !== userId && !ctx.isAdmin) throw err("Only the schedule's owner or an admin can delete it.", 403);
  await prisma.reportSchedule.delete({ where: { id } });
  return { deleted: true, id };
}

/** Send a schedule immediately (the "Send now" button) without altering cadence. */
export async function runScheduleNow(userId, tenantId, id) {
  const existing = await prisma.reportSchedule.findFirst({ where: { id }, include: { report: true } });
  if (!existing) throw err("Schedule not found", 404);
  const { email, result, filename } = await deliverSchedule(existing, existing.report);
  const status = email?.sent ? "sent" : email?.skipped ? "skipped" : "failed";
  await prisma.reportSchedule.update({
    where: { id },
    data: {
      lastRunAt: new Date(), lastStatus: status,
      lastError: email?.sent ? null : email?.message || email?.error || null,
      runCount: { increment: 1 },
    },
  });
  return {
    status,
    filename,
    rows: result.totalRows,
    recipients: existing.recipients,
    message: email?.sent
      ? `Sent to ${existing.recipients.join(", ")}.`
      : email?.skipped
        ? "Email isn't configured on this server (set RESEND_API_KEY) — nothing was sent."
        : email?.error || "Delivery failed.",
  };
}
