/**
 * Payroll — pay components, tax tables, pay runs and payslips.
 *
 * What this module does and doesn't do, stated plainly because payroll is not a
 * place for ambiguity:
 *
 * • It **calculates** pay from compensation, approved hours, unpaid leave and the
 *   organization's own components and tax bands, and produces payslips that
 *   reconcile to the cent.
 * • It **records** that a run was approved and paid, by whom and when.
 * • It **does not move money.** There is no bank integration here. Marking a run
 *   paid records a payment that happened elsewhere, and the bank export produces
 *   a payment file you hand to your bank. Anything else would be pretending.
 * • It is **not tax advice**, and it ships no jurisdiction's rates. The bands are
 *   the organization's own configuration.
 *
 * Approved runs are immutable. Recalculation is refused once a run is signed off,
 * because a pay run you can still change afterwards is not a record of what was
 * paid to anyone.
 */
import prisma from "../../config/database.js";
import { linkTo } from "../../lib/recordLinks.js";
import { log } from "../../lib/logger.js";
import { notify } from "../notifications/notifications.service.js";
import { onDomainEvent } from "../../lib/domainEvents.js";
import { runWithTenant } from "../../lib/tenantContext.js";
import {
  PAYABLE_STATUSES, PAYRUN_STATES, PAYRUN_STATUSES, EDITABLE_PAYRUN_STATUSES,
  COMPONENT_KINDS, COMPONENT_CALCS, COMPONENT_APPLIES_TO,
  canTransitionRun, runTransitionError, nextRunStates, isRunLocked,
  payFrequency, periodsPerYear,
} from "./hr.registry.js";
import {
  computePayslip, runTotals, compensationAt, validateBands, annualTax,
  round2, workingDays,
} from "./payroll.engine.js";
import { unpaidLeaveForPeriod } from "./leave.service.js";
import { hoursForPeriod } from "./time.service.js";
import { recordEvent } from "./people.service.js";

const err = (message, status = 400) => { const e = new Error(message); e.status = status; return e; };
const str = (v, max) => (v == null || v === "" ? null : String(v).slice(0, max));
const nameOf = (u) => (u ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email : null);

const date = (v, field) => {
  const d = new Date(v);
  if (!v || Number.isNaN(d.getTime())) throw err(`${field} isn't a valid date`);
  return d;
};

// ── Pay components ───────────────────────────────────────────────────────────
export const shapeComponent = (c, { assignments } = {}) => ({
  id: c.id, code: c.code, name: c.name, kind: c.kind,
  kindLabel: COMPONENT_KINDS.find((k) => k.id === c.kind)?.label ?? c.kind,
  calc: c.calc,
  calcLabel: COMPONENT_CALCS.find((k) => k.id === c.calc)?.label ?? c.calc,
  amount: c.amount, currency: c.currency, taxable: c.taxable, preTax: c.preTax,
  capPerPeriod: c.capPerPeriod, appliesTo: c.appliesTo, active: c.active,
  sortOrder: c.sortOrder, note: c.note,
  assignedCount: assignments ?? c._count?.assignments,
  createdAt: c.createdAt,
});

export async function listComponents({ includeInactive = false } = {}) {
  const rows = await prisma.payComponent.findMany({
    where: includeInactive ? {} : { active: true },
    orderBy: [{ active: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { assignments: true } } },
  });
  return rows.map((c) => shapeComponent(c));
}

function validateComponent(body = {}, { partial = false } = {}) {
  const data = {};

  if (body.name !== undefined || !partial) {
    const name = String(body.name ?? "").trim();
    if (!name) throw err("A pay component needs a name");
    data.name = name.slice(0, 120);
  }
  if (body.kind !== undefined || !partial) {
    const kind = body.kind ?? "deduction";
    if (!COMPONENT_KINDS.some((k) => k.id === kind)) throw err(`Kind must be one of: ${COMPONENT_KINDS.map((k) => k.id).join(", ")}`);
    data.kind = kind;
  }
  if (body.calc !== undefined || !partial) {
    const calc = body.calc ?? "fixed";
    if (!COMPONENT_CALCS.some((c) => c.id === calc)) throw err(`Calculation must be one of: ${COMPONENT_CALCS.map((c) => c.id).join(", ")}`);
    data.calc = calc;
  }
  if (body.amount !== undefined || !partial) {
    const amount = Number(body.amount ?? 0);
    if (!Number.isFinite(amount) || amount < 0) throw err("The amount must be a positive number");
    const calc = data.calc ?? body.calc;
    if (calc && calc !== "fixed" && amount > 100) throw err("A percentage can't be more than 100");
    data.amount = amount;
  }
  if (body.currency !== undefined) {
    const cur = String(body.currency ?? "USD").toUpperCase();
    if (!/^[A-Z]{3}$/.test(cur)) throw err("Currency must be a 3-letter code, like USD");
    data.currency = cur;
  }
  if (body.taxable !== undefined) data.taxable = !!body.taxable;
  if (body.preTax !== undefined) data.preTax = !!body.preTax;
  if (body.capPerPeriod !== undefined) {
    if (body.capPerPeriod == null || body.capPerPeriod === "") data.capPerPeriod = null;
    else {
      const cap = Number(body.capPerPeriod);
      if (!Number.isFinite(cap) || cap < 0) throw err("The cap must be a positive number");
      data.capPerPeriod = cap;
    }
  }
  if (body.appliesTo !== undefined) {
    if (!COMPONENT_APPLIES_TO.some((a) => a.id === body.appliesTo)) throw err('appliesTo must be "all" or "assigned"');
    data.appliesTo = body.appliesTo;
  }
  if (body.active !== undefined) data.active = !!body.active;
  if (body.sortOrder !== undefined) data.sortOrder = Math.trunc(Number(body.sortOrder) || 0);
  if (body.note !== undefined) data.note = str(body.note, 300);

  return data;
}

export async function createComponent(actorId, body = {}) {
  const code = String(body.code ?? "").trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_");
  if (!code) throw err("A pay component needs a short code, like \"PENSION\"");
  const clash = await prisma.payComponent.findFirst({ where: { code } });
  if (clash) throw err(`There's already a component with the code "${code}"`, 409);

  const data = validateComponent(body);
  const row = await prisma.payComponent.create({
    data: { ...data, code: code.slice(0, 40), createdById: actorId },
  });
  return shapeComponent(row);
}

export async function updateComponent(id, body = {}) {
  const existing = await prisma.payComponent.findFirst({ where: { id } });
  if (!existing) throw err("Pay component not found", 404);
  const data = validateComponent(body, { partial: true });
  await prisma.payComponent.update({ where: { id }, data });
  const row = await prisma.payComponent.findFirst({ where: { id }, include: { _count: { select: { assignments: true } } } });
  return shapeComponent(row);
}

export async function deleteComponent(id) {
  const existing = await prisma.payComponent.findFirst({ where: { id } });
  if (!existing) throw err("Pay component not found", 404);
  // Payslip lines store the code and amount, so history survives deletion — but
  // an active component with assignments is almost always meant to be
  // deactivated rather than removed.
  const assigned = await prisma.employeePayComponent.count({ where: { componentId: id } });
  if (assigned) throw err(`${assigned} employee(s) have this component assigned. Deactivate it instead.`, 409);
  await prisma.payComponent.delete({ where: { id } });
  return { deleted: true };
}

/** Assign a component to one employee, optionally with an amount override. */
export async function assignComponent(body = {}) {
  const { userId, componentId } = body;
  if (!userId || !componentId) throw err("Choose an employee and a component");
  const [user, component] = await Promise.all([
    prisma.user.findFirst({ where: { id: String(userId) }, select: { id: true } }),
    prisma.payComponent.findFirst({ where: { id: String(componentId) } }),
  ]);
  if (!user) throw err("Employee not found", 404);
  if (!component) throw err("Pay component not found", 404);

  const amount = body.amount == null || body.amount === "" ? null : Number(body.amount);
  if (amount != null && (!Number.isFinite(amount) || amount < 0)) throw err("The amount must be a positive number");
  if (amount != null && component.calc !== "fixed" && amount > 100) throw err("A percentage can't be more than 100");

  const data = {
    amount,
    effectiveFrom: body.effectiveFrom ? date(body.effectiveFrom, "Effective from") : null,
    effectiveTo: body.effectiveTo ? date(body.effectiveTo, "Effective to") : null,
    active: body.active !== false,
    note: str(body.note, 300),
  };
  if (data.effectiveFrom && data.effectiveTo && data.effectiveTo < data.effectiveFrom) {
    throw err("The end date can't be before the start date");
  }

  const existing = await prisma.employeePayComponent.findFirst({ where: { userId, componentId } });
  if (existing) await prisma.employeePayComponent.update({ where: { id: existing.id }, data });
  else await prisma.employeePayComponent.create({ data: { ...data, userId, componentId } });

  return listAssignments(userId);
}

export async function unassignComponent(id) {
  const existing = await prisma.employeePayComponent.findFirst({ where: { id } });
  if (!existing) throw err("Assignment not found", 404);
  await prisma.employeePayComponent.delete({ where: { id } });
  return { deleted: true };
}

export async function listAssignments(userId) {
  const rows = await prisma.employeePayComponent.findMany({
    where: { userId }, include: { component: true }, orderBy: { createdAt: "asc" },
  });
  return rows.map((a) => ({
    id: a.id, userId: a.userId, componentId: a.componentId,
    code: a.component.code, name: a.component.name, kind: a.component.kind,
    calc: a.component.calc,
    amount: a.amount ?? a.component.amount,
    overridden: a.amount != null,
    effectiveFrom: a.effectiveFrom, effectiveTo: a.effectiveTo,
    active: a.active, note: a.note,
  }));
}

// ── Tax tables ───────────────────────────────────────────────────────────────
export const shapeTaxTable = (t) => ({
  id: t.id, name: t.name, jurisdiction: t.jurisdiction, currency: t.currency,
  bands: t.bands ?? [], allowance: t.allowance, active: t.active,
  isDefault: t.isDefault, note: t.note, createdAt: t.createdAt,
});

export async function listTaxTables() {
  const rows = await prisma.taxTable.findMany({ orderBy: [{ isDefault: "desc" }, { name: "asc" }] });
  return rows.map(shapeTaxTable);
}

export async function upsertTaxTable(actorId, body = {}) {
  const name = String(body.name ?? "").trim();
  if (!name) throw err("A tax table needs a name");
  const bands = validateBands(body.bands);
  const allowance = Number(body.allowance ?? 0);
  if (!Number.isFinite(allowance) || allowance < 0) throw err("The tax-free allowance must be a positive number");

  const currency = String(body.currency ?? "USD").toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) throw err("Currency must be a 3-letter code, like USD");

  const data = {
    name: name.slice(0, 120),
    jurisdiction: str(body.jurisdiction, 80),
    currency, bands, allowance,
    active: body.active !== false,
    isDefault: !!body.isDefault,
    note: str(body.note, 300),
  };

  const row = body.id
    ? await (async () => {
      const existing = await prisma.taxTable.findFirst({ where: { id: String(body.id) } });
      if (!existing) throw err("Tax table not found", 404);
      return prisma.taxTable.update({ where: { id: existing.id }, data });
    })()
    : await prisma.taxTable.create({ data: { ...data, createdById: actorId } });

  // Exactly one default, or "the default" means nothing.
  if (data.isDefault) {
    await prisma.taxTable.updateMany({ where: { id: { not: row.id } }, data: { isDefault: false } });
  }
  return shapeTaxTable(row);
}

export async function deleteTaxTable(id) {
  const existing = await prisma.taxTable.findFirst({ where: { id } });
  if (!existing) throw err("Tax table not found", 404);
  const used = await prisma.payRun.count({ where: { taxTableId: id, status: { in: ["approved", "paid"] } } });
  if (used) throw err("This table was used in an approved pay run. Deactivate it instead so past payslips stay explicable.", 409);
  await prisma.taxTable.delete({ where: { id } });
  return { deleted: true };
}

/**
 * What a given annual income would pay under a table. Lets an admin sanity-check
 * their bands against a figure they already know, before anyone is paid on them.
 */
export async function previewTax(id, annualIncome) {
  const table = await prisma.taxTable.findFirst({ where: { id } });
  if (!table) throw err("Tax table not found", 404);
  const income = Number(annualIncome);
  if (!Number.isFinite(income) || income < 0) throw err("Enter an annual income to test");
  const tax = annualTax(income, table);
  return {
    table: shapeTaxTable(table),
    annualIncome: income,
    annualTax: tax,
    effectiveRate: income > 0 ? round2((tax / income) * 100) : 0,
    monthly: round2(tax / 12),
    note: "Illustrative, using the bands entered above. This is not tax advice.",
  };
}

// ── Pay runs ─────────────────────────────────────────────────────────────────
export const shapeRun = (r, { payslips } = {}) => ({
  id: r.id,
  reference: r.reference,
  periodStart: r.periodStart, periodEnd: r.periodEnd, payDate: r.payDate,
  frequency: r.frequency,
  frequencyLabel: payFrequency(r.frequency)?.label ?? r.frequency,
  currency: r.currency,
  status: r.status,
  statusLabel: PAYRUN_STATES[r.status]?.label ?? r.status,
  statusTone: PAYRUN_STATES[r.status]?.tone ?? "slate",
  nextStates: nextRunStates(r.status),
  locked: isRunLocked(r.status),
  totals: r.totals ?? {},
  taxTableId: r.taxTableId,
  approvalRequestId: r.approvalRequestId,
  note: r.note,
  calculatedAt: r.calculatedAt,
  approvedById: r.approvedById, approvedAt: r.approvedAt,
  paidAt: r.paidAt, paymentRef: r.paymentRef,
  createdById: r.createdById, createdAt: r.createdAt,
  payslipCount: payslips?.length ?? r._count?.payslips ?? undefined,
  payslips: payslips ? payslips.map(shapePayslip) : undefined,
});

export const shapePayslip = (p) => ({
  id: p.id, payRunId: p.payRunId, userId: p.userId,
  userName: p.user ? nameOf(p.user) : undefined,
  currency: p.currency, gross: p.gross, taxableGross: p.taxableGross,
  tax: p.tax, deductions: p.deductions, net: p.net, employerCost: p.employerCost,
  hours: p.hours, daysInPeriod: p.daysInPeriod, daysWorked: p.daysWorked,
  unpaidLeaveDays: p.unpaidLeaveDays, prorated: p.prorated,
  lines: p.lines ?? [], snapshot: p.snapshot ?? {},
  note: p.note, createdAt: p.createdAt,
});

export async function listRuns({ status, limit = 100 } = {}) {
  const where = {};
  if (status && status !== "all") where.status = status;
  const rows = await prisma.payRun.findMany({
    where, orderBy: { periodStart: "desc" },
    take: Math.min(300, Math.max(1, Number(limit) || 100)),
    include: { _count: { select: { payslips: true } } },
  });
  return rows.map((r) => shapeRun(r));
}

export async function getRun(id) {
  if (!id) throw err("Pay run not found", 404);
  const row = await prisma.payRun.findFirst({ where: { id } });
  if (!row) throw err("Pay run not found", 404);
  const payslips = await prisma.payslip.findMany({
    where: { payRunId: id },
    include: { user: { select: { firstName: true, lastName: true, email: true } } },
    orderBy: { net: "desc" },
  });
  return shapeRun(row, { payslips });
}

export async function createRun(actorId, body = {}) {
  const periodStart = date(body.periodStart, "Period start");
  const periodEnd = date(body.periodEnd, "Period end");
  if (periodEnd < periodStart) throw err("The period end can't be before the period start");
  if (workingDays(periodStart, periodEnd) === 0) throw err("That period contains no working days");

  const payDate = body.payDate ? date(body.payDate, "Pay date") : periodEnd;
  const frequency = body.frequency ?? "monthly";
  if (!payFrequency(frequency)) throw err("Unknown pay frequency");

  const currency = String(body.currency ?? "USD").toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) throw err("Currency must be a 3-letter code, like USD");

  // Two open runs over the same period would double-pay whoever is in both.
  const overlap = await prisma.payRun.findFirst({
    where: {
      status: { in: ["draft", "review", "approved", "paid"] },
      frequency,
      periodStart: { lte: periodEnd }, periodEnd: { gte: periodStart },
    },
  });
  if (overlap) {
    throw err(`A ${overlap.status} ${frequency} pay run already covers ${overlap.periodStart.toISOString().slice(0, 10)} → ${overlap.periodEnd.toISOString().slice(0, 10)}. Use that one, or cancel it first.`, 409);
  }

  let taxTableId = body.taxTableId ? String(body.taxTableId) : null;
  if (taxTableId) {
    const table = await prisma.taxTable.findFirst({ where: { id: taxTableId } });
    if (!table) throw err("Tax table not found", 404);
  } else {
    const fallback = await prisma.taxTable.findFirst({ where: { active: true, isDefault: true } })
      ?? await prisma.taxTable.findFirst({ where: { active: true } });
    taxTableId = fallback?.id ?? null;
  }

  const run = await prisma.payRun.create({
    data: {
      reference: str(body.reference, 120) ?? `${periodStart.toISOString().slice(0, 7)} — ${payFrequency(frequency).label.toLowerCase()}`,
      periodStart, periodEnd, payDate, frequency, currency,
      taxTableId, note: str(body.note, 500), createdById: actorId,
    },
  });
  return getRun(run.id);
}

export async function updateRun(id, body = {}) {
  const existing = await prisma.payRun.findFirst({ where: { id } });
  if (!existing) throw err("Pay run not found", 404);
  if (isRunLocked(existing.status)) {
    throw err(`A ${PAYRUN_STATES[existing.status].label.toLowerCase()} pay run can't be changed. Its figures are the record of what was paid.`, 409);
  }

  const data = {};
  if (body.reference !== undefined) data.reference = str(body.reference, 120);
  if (body.note !== undefined) data.note = str(body.note, 500);
  if (body.payDate !== undefined) data.payDate = date(body.payDate, "Pay date");
  if (body.periodStart !== undefined) data.periodStart = date(body.periodStart, "Period start");
  if (body.periodEnd !== undefined) data.periodEnd = date(body.periodEnd, "Period end");
  if (body.taxTableId !== undefined) {
    if (body.taxTableId) {
      const table = await prisma.taxTable.findFirst({ where: { id: String(body.taxTableId) } });
      if (!table) throw err("Tax table not found", 404);
      data.taxTableId = table.id;
    } else data.taxTableId = null;
  }
  const start = data.periodStart ?? existing.periodStart;
  const end = data.periodEnd ?? existing.periodEnd;
  if (end < start) throw err("The period end can't be before the period start");

  await prisma.payRun.update({ where: { id }, data });
  return getRun(id);
}

/**
 * Calculate (or recalculate) every payslip in the run.
 *
 * Recalculation replaces the run's payslips wholesale rather than patching them:
 * a partially-updated run — some payslips on old figures, some on new — is the
 * one state that must never exist.
 */
export async function calculateRun(actorId, id) {
  const run = await prisma.payRun.findFirst({ where: { id } });
  if (!run) throw err("Pay run not found", 404);
  if (!EDITABLE_PAYRUN_STATUSES.includes(run.status)) {
    throw err(`A ${PAYRUN_STATES[run.status].label.toLowerCase()} pay run can't be recalculated.`, 409);
  }

  const [profiles, taxTable, components, unpaidLeave, hours] = await Promise.all([
    prisma.employmentProfile.findMany({
      where: { status: { in: PAYABLE_STATUSES } },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true, isActive: true } } },
    }),
    run.taxTableId ? prisma.taxTable.findFirst({ where: { id: run.taxTableId } }) : null,
    prisma.payComponent.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    unpaidLeaveForPeriod(run.periodStart, run.periodEnd),
    hoursForPeriod(run.periodStart, run.periodEnd),
  ]);

  const userIds = profiles.map((p) => p.userId);
  const [allComp, assignments] = await Promise.all([
    userIds.length ? prisma.compensation.findMany({ where: { userId: { in: userIds } } }) : [],
    userIds.length ? prisma.employeePayComponent.findMany({ where: { userId: { in: userIds } } }) : [],
  ]);
  const compByUser = allComp.reduce((acc, c) => { (acc[c.userId] ??= []).push(c); return acc; }, {});
  const assignByUser = assignments.reduce((acc, a) => { (acc[a.userId] ??= []).push(a); return acc; }, {});

  const computed = [];
  const skipped = [];
  const consumedEntryIds = [];

  // Active people with no employment record at all would otherwise be invisible
  // to payroll — not skipped, just absent. Listing them is the difference between
  // "nobody was missed" and "we think nobody was missed".
  const onboardedIds = new Set(profiles.map((p) => p.userId));
  const unonboarded = await prisma.user.findMany({
    where: { isActive: true, id: { notIn: [...onboardedIds] } },
    select: { id: true, firstName: true, lastName: true, email: true },
  });
  for (const u of unonboarded) {
    skipped.push({ userId: u.id, name: nameOf(u), reason: "no employment record — not onboarded" });
  }

  for (const profile of profiles) {
    const user = profile.user;
    const name = nameOf(user);

    if (!user?.isActive) { skipped.push({ userId: profile.userId, name, reason: "account is deactivated" }); continue; }
    // Someone who joined after the period, or left before it, isn't paid in it.
    if (profile.hireDate && new Date(profile.hireDate) > run.periodEnd) {
      skipped.push({ userId: profile.userId, name, reason: "starts after this period" }); continue;
    }
    if (profile.endDate && new Date(profile.endDate) < run.periodStart) {
      skipped.push({ userId: profile.userId, name, reason: "left before this period" }); continue;
    }

    const compensation = compensationAt(compByUser[profile.userId] ?? [], run.payDate);
    if (!compensation) { skipped.push({ userId: profile.userId, name, reason: "no compensation on record" }); continue; }
    if (compensation.currency !== run.currency) {
      skipped.push({ userId: profile.userId, name, reason: `paid in ${compensation.currency}, this run is in ${run.currency}` });
      continue;
    }

    const userAssignments = assignByUser[profile.userId] ?? [];
    const assignedIds = new Set(userAssignments.map((a) => a.componentId));
    const applicable = components
      .filter((c) => c.appliesTo === "all" || assignedIds.has(c.id))
      .filter((c) => c.currency === run.currency || c.calc !== "fixed") // a fixed amount in another currency can't be mixed in
      .map((c) => ({ component: c, assignment: userAssignments.find((a) => a.componentId === c.id) ?? null }));

    const timesheet = hours[profile.userId] ?? { hours: 0, overtimeHours: 0, entryIds: [] };
    if (compensation.payType === "hourly" && !timesheet.hours && !timesheet.overtimeHours) {
      skipped.push({ userId: profile.userId, name, reason: "no approved hours in this period" });
      continue;
    }

    try {
      const slip = computePayslip({
        employee: {
          userId: profile.userId, name,
          employmentType: profile.employmentType, status: profile.status,
          hireDate: profile.hireDate, endDate: profile.endDate,
        },
        compensation,
        periodStart: run.periodStart, periodEnd: run.periodEnd,
        frequency: run.frequency,
        components: applicable,
        taxTable,
        hours: timesheet.hours, overtimeHours: timesheet.overtimeHours,
        unpaidLeaveDays: unpaidLeave[profile.userId] ?? 0,
        currency: run.currency,
      });
      computed.push(slip);
      if (compensation.payType === "hourly") consumedEntryIds.push(...timesheet.entryIds);
    } catch (e) {
      skipped.push({ userId: profile.userId, name, reason: e.message });
    }
  }

  const totals = runTotals(computed);

  await prisma.payslip.deleteMany({ where: { payRunId: id } });
  for (const slip of computed) {
    await prisma.payslip.create({
      data: {
        payRunId: id, userId: slip.userId, currency: slip.currency,
        gross: slip.gross, taxableGross: slip.taxableGross, tax: slip.tax,
        deductions: slip.deductions, net: slip.net, employerCost: slip.employerCost,
        hours: slip.hours, daysInPeriod: slip.daysInPeriod, daysWorked: slip.daysWorked,
        unpaidLeaveDays: slip.unpaidLeaveDays, prorated: slip.prorated,
        lines: slip.lines, snapshot: slip.snapshot,
      },
    });
  }

  await prisma.payRun.update({
    where: { id },
    data: {
      status: run.status === "draft" ? "review" : run.status,
      totals: { ...totals, skipped: skipped.length },
      calculatedAt: new Date(),
    },
  });

  const result = await getRun(id);
  return { ...result, skipped, hourlyEntriesPending: consumedEntryIds.length };
}

/** Send the run for sign-off through the approvals engine. */
export async function requestRunApproval(user, id, { steps, summary } = {}) {
  const run = await prisma.payRun.findFirst({ where: { id } });
  if (!run) throw err("Pay run not found", 404);
  if (run.status !== "review") throw err("Calculate the run first, then send it for approval.", 409);

  const count = await prisma.payslip.count({ where: { payRunId: id } });
  if (!count) throw err("This run has no payslips — there's nothing to approve.", 409);

  if (run.approvalRequestId) {
    const open = await prisma.approvalRequest.findFirst({ where: { id: run.approvalRequestId }, select: { status: true } });
    if (open?.status === "pending") throw err("This run is already out for approval.", 409);
  }

  const totals = run.totals ?? {};
  const { createRequest } = await import("../approvals/approvals.service.js");
  const approval = await createRequest({
    tenantId: run.tenantId,
    title: `Payroll approval: ${run.reference}`,
    summary: summary
      ? String(summary).slice(0, 1000)
      : `${count} employee(s) · net ${run.currency} ${Number(totals.net ?? 0).toLocaleString()} · pay date ${run.payDate.toISOString().slice(0, 10)}`,
    resource: "payrun",
    recordId: run.id,
    recordLabel: run.reference,
    steps: Array.isArray(steps) && steps.length
      ? steps
      : [{ name: "Payroll approval", approvers: { type: "admins" }, requiredCount: 1 }],
    requestedById: user.userId,
    ctx: { record: run },
  });

  await prisma.payRun.update({ where: { id }, data: { approvalRequestId: approval.id } });
  return getRun(id);
}

/** Move the run along its lifecycle. */
export async function transitionRun(user, id, to, { note, paymentRef } = {}) {
  const run = await prisma.payRun.findFirst({ where: { id } });
  if (!run) throw err("Pay run not found", 404);
  if (!PAYRUN_STATUSES.includes(to)) throw err(`"${to}" isn't a pay-run status.`);
  if (!canTransitionRun(run.status, to)) throw err(runTransitionError(run.status, to), 409);

  if (to === "approved") {
    const count = await prisma.payslip.count({ where: { payRunId: id } });
    if (!count) throw err("This run has no payslips — calculate it first.", 409);
    if (!run.calculatedAt) throw err("This run hasn't been calculated yet.", 409);
  }

  const data = { status: to };
  if (to === "approved") { data.approvedById = user.userId; data.approvedAt = new Date(); }
  if (to === "paid") {
    data.paidAt = new Date();
    data.paymentRef = str(paymentRef, 120);
  }
  if (note) data.note = str(note, 500);

  await prisma.payRun.update({ where: { id }, data });

  if (to === "paid") await onRunPaid(id);

  return getRun(id);
}

/**
 * A paid run is final: lock the hours it consumed so they can't be paid again,
 * and tell each person their payslip is available.
 */
async function onRunPaid(runId) {
  const run = await prisma.payRun.findFirst({ where: { id: runId } });
  const payslips = await prisma.payslip.findMany({ where: { payRunId: runId } });

  for (const slip of payslips) {
    if (slip.hours != null) {
      await prisma.timeEntry.updateMany({
        where: {
          userId: slip.userId, status: "approved", payslipId: null,
          date: { gte: run.periodStart, lte: run.periodEnd },
        },
        data: { payslipId: slip.id },
      });
    }
    try {
      await notify({
        tenantId: run.tenantId, userId: slip.userId, type: "payroll",
        title: `Your payslip for ${run.reference} is available`,
        body: `Net pay ${slip.currency} ${Number(slip.net).toLocaleString()}`,
        link: linkTo("payslip", slip.id), actorName: "Payroll",
      });
    } catch { /* payment stands regardless */ }
    await recordEvent(slip.userId, "payroll", {
      detail: `Paid ${slip.currency} ${slip.net} — ${run.reference}`,
      effectiveAt: run.payDate, actor: { name: "Payroll" }, tenantId: run.tenantId,
    });
  }
}

export async function deleteRun(id) {
  const run = await prisma.payRun.findFirst({ where: { id } });
  if (!run) throw err("Pay run not found", 404);
  if (["approved", "paid"].includes(run.status)) {
    throw err("An approved or paid run is a permanent record and can't be deleted. Cancel it instead if it was raised in error.", 409);
  }
  await prisma.payRun.delete({ where: { id } });
  return { deleted: true };
}

// ── Payslips ─────────────────────────────────────────────────────────────────
export async function getPayslip(id, { forUserId } = {}) {
  const slip = await prisma.payslip.findFirst({
    where: { id },
    include: {
      user: { select: { firstName: true, lastName: true, email: true, jobTitle: true } },
      payRun: true,
    },
  });
  if (!slip) throw err("Payslip not found", 404);
  // Self-service must never be able to read someone else's pay by guessing ids.
  if (forUserId && slip.userId !== forUserId) throw err("Payslip not found", 404);
  // An unapproved run is a work in progress, not a payslip anyone should hold.
  if (forUserId && !["approved", "paid"].includes(slip.payRun.status)) throw err("Payslip not found", 404);

  return {
    ...shapePayslip(slip),
    employeeName: nameOf(slip.user),
    jobTitle: slip.user?.jobTitle ?? null,
    run: {
      id: slip.payRun.id, reference: slip.payRun.reference,
      periodStart: slip.payRun.periodStart, periodEnd: slip.payRun.periodEnd,
      payDate: slip.payRun.payDate, status: slip.payRun.status,
      frequency: slip.payRun.frequency,
    },
  };
}

/** Someone's own payslips — only from runs that have been approved or paid. */
export async function myPayslips(userId, { limit = 24 } = {}) {
  const rows = await prisma.payslip.findMany({
    where: { userId, payRun: { status: { in: ["approved", "paid"] } } },
    include: { payRun: { select: { reference: true, periodStart: true, periodEnd: true, payDate: true, status: true } } },
    orderBy: { createdAt: "desc" },
    take: Math.min(120, Math.max(1, Number(limit) || 24)),
  });
  return rows.map((p) => ({
    ...shapePayslip(p),
    run: p.payRun,
  }));
}

/** Year-to-date figures for a person, from approved/paid runs only. */
export async function yearToDate(userId, year = new Date().getUTCFullYear()) {
  const rows = await prisma.payslip.findMany({
    where: {
      userId,
      payRun: {
        status: { in: ["approved", "paid"] },
        payDate: { gte: new Date(Date.UTC(year, 0, 1)), lte: new Date(Date.UTC(year, 11, 31, 23, 59, 59)) },
      },
    },
    select: { gross: true, tax: true, deductions: true, net: true, currency: true },
  });
  const sum = (key) => round2(rows.reduce((s, r) => s + Number(r[key] ?? 0), 0));
  return {
    year, payslips: rows.length,
    currency: rows[0]?.currency ?? null,
    gross: sum("gross"), tax: sum("tax"), deductions: sum("deductions"), net: sum("net"),
  };
}

/** Payslip as a PDF — what someone files, or gives to a bank or landlord. */
export async function payslipPdf(id, { forUserId } = {}) {
  const slip = await getPayslip(id, { forUserId });
  const tenant = await prisma.tenant.findFirst({ select: { name: true } });

  const PDFDocument = (await import("pdfkit")).default;
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 56 });
      const chunks = [];
      doc.on("data", (c) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const money = (n) => `${slip.currency} ${Number(n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      const left = doc.page.margins.left;
      const right = doc.page.width - doc.page.margins.right;

      doc.fontSize(18).fillColor("#0f172a").text("Payslip");
      doc.fontSize(9).fillColor("#64748b").text(tenant?.name ?? "");
      doc.moveDown(0.8);

      const pair = (label, value) => {
        doc.fontSize(8).fillColor("#64748b").text(label);
        doc.fontSize(11).fillColor("#0f172a").text(String(value ?? "—"));
        doc.moveDown(0.4);
      };
      pair("Employee", `${slip.employeeName}${slip.jobTitle ? ` · ${slip.jobTitle}` : ""}`);
      pair("Pay period", `${new Date(slip.run.periodStart).toISOString().slice(0, 10)} → ${new Date(slip.run.periodEnd).toISOString().slice(0, 10)}`);
      pair("Pay date", new Date(slip.run.payDate).toISOString().slice(0, 10));
      if (slip.prorated) pair("Days worked", `${slip.daysWorked} of ${slip.daysInPeriod} working days`);
      if (slip.hours != null) pair("Hours paid", slip.hours);
      if (slip.unpaidLeaveDays > 0) pair("Unpaid leave", `${slip.unpaidLeaveDays} day(s)`);

      doc.moveDown(0.5);
      doc.moveTo(left, doc.y).lineTo(right, doc.y).strokeColor("#e2e8f0").stroke();
      doc.moveDown(0.6);

      const row = (label, amount, { bold = false, colour = "#0f172a" } = {}) => {
        const y = doc.y;
        doc.fontSize(bold ? 11 : 10).fillColor(colour).text(label, left, y, { width: 320 });
        doc.fontSize(bold ? 11 : 10).fillColor(colour).text(money(amount), left + 330, y, { width: right - left - 330, align: "right" });
        doc.y = y + (bold ? 18 : 15);
      };

      const section = (title) => {
        doc.moveDown(0.4).fontSize(9).fillColor("#64748b").text(title.toUpperCase());
        doc.moveDown(0.2);
      };

      section("Earnings");
      for (const line of slip.lines.filter((l) => l.kind === "earning")) row(line.label, line.amount);
      row("Gross pay", slip.gross, { bold: true });

      const deductionLines = slip.lines.filter((l) => l.kind === "deduction");
      const taxLines = slip.lines.filter((l) => l.kind === "tax");
      if (deductionLines.length || taxLines.length) {
        section("Deductions");
        for (const line of [...deductionLines, ...taxLines]) row(line.label, line.amount, { colour: "#b91c1c" });
        row("Total deductions", round2(slip.deductions + slip.tax), { bold: true, colour: "#b91c1c" });
      }

      doc.moveDown(0.3);
      doc.moveTo(left, doc.y).lineTo(right, doc.y).strokeColor("#0f172a").stroke();
      doc.moveDown(0.4);
      row("Net pay", slip.net, { bold: true, colour: "#047857" });

      const employerLines = slip.lines.filter((l) => l.kind === "employer");
      if (employerLines.length) {
        section("Employer contributions (not deducted from your pay)");
        for (const line of employerLines) row(line.label, line.amount, { colour: "#475569" });
      }

      const info = slip.lines.filter((l) => l.kind === "info");
      if (info.length) {
        doc.moveDown(0.4);
        for (const line of info) doc.fontSize(8).fillColor("#94a3b8").text(`${line.label}: ${money(Math.abs(line.amount))}${line.note ? ` — ${line.note}` : ""}`);
      }

      doc.moveDown(1);
      doc.fontSize(8).fillColor("#94a3b8").text(
        `Generated ${new Date().toUTCString()}. Tax is calculated from the bands configured by ${tenant?.name ?? "this organization"}`
        + `${slip.snapshot?.taxTable?.name ? ` ("${slip.snapshot.taxTable.name}")` : ""} and annualized over ${slip.snapshot?.periodsPerYear ?? 12} pay periods.`,
        { width: right - left },
      );

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}

// ── Bank export ──────────────────────────────────────────────────────────────
/**
 * A payment file for the bank — the honest alternative to pretending we can move
 * money. Only available once the run is approved, because you shouldn't be able
 * to generate a payment instruction from unapproved figures.
 *
 * Account numbers are decrypted here and *only* here, for exactly the people in
 * the run, and the export is recorded on each person's timeline.
 */
export async function bankExport(actorId, id) {
  const run = await prisma.payRun.findFirst({ where: { id } });
  if (!run) throw err("Pay run not found", 404);
  if (!["approved", "paid"].includes(run.status)) {
    throw err("Approve the run before exporting a payment file — a bank file built from draft figures is a mistake waiting to happen.", 409);
  }

  const payslips = await prisma.payslip.findMany({
    where: { payRunId: id },
    include: { user: { select: { firstName: true, lastName: true, email: true, employeeId: true } } },
    orderBy: { createdAt: "asc" },
  });

  const profiles = await prisma.employmentProfile.findMany({
    where: { userId: { in: payslips.map((p) => p.userId) } },
  });
  const byUser = Object.fromEntries(profiles.map((p) => [p.userId, p]));

  const { decryptSecret } = await import("../../lib/secrets.js");
  const rows = [], missing = [];

  for (const slip of payslips) {
    const profile = byUser[slip.userId];
    let account = null;
    if (profile?.bankAccountCipher) {
      try {
        account = decryptSecret({
          ciphertext: profile.bankAccountCipher, iv: profile.bankAccountIv, tag: profile.bankAccountTag,
        });
      } catch {
        account = null;
      }
    }
    if (!account) {
      missing.push({ userId: slip.userId, name: nameOf(slip.user), reason: profile?.bankAccountCipher ? "account details can't be decrypted" : "no bank account on record" });
      continue;
    }
    rows.push({
      userId: slip.userId,
      employeeId: slip.user?.employeeId ?? "",
      name: nameOf(slip.user),
      bankName: profile.bankName ?? "",
      account,
      currency: slip.currency,
      amount: Number(slip.net).toFixed(2),
      reference: `${run.reference} ${slip.user?.employeeId ?? ""}`.trim().slice(0, 35),
    });
  }

  // Columns are listed explicitly so the internal userId can never leak into a
  // file that gets emailed to a bank.
  const COLUMNS = [
    ["Employee ID", "employeeId"], ["Name", "name"], ["Bank", "bankName"],
    ["Account", "account"], ["Currency", "currency"], ["Amount", "amount"], ["Reference", "reference"],
  ];
  // Spreadsheet apps execute cells beginning = + - @ — the same neutralisation
  // the report exporter applies, for the same reason.
  const cell = (v) => {
    const s = String(v ?? "");
    const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
    return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  const csv = [
    COLUMNS.map(([label]) => cell(label)).join(","),
    ...rows.map((r) => COLUMNS.map(([, key]) => cell(r[key])).join(",")),
  ].join("\n") + "\n";

  for (const row of rows) {
    await recordEvent(row.userId, "payroll", {
      detail: `Included in the bank payment file for ${run.reference}`,
      actor: { userId: actorId, name: null }, tenantId: run.tenantId,
    }).catch(() => {});
  }

  return {
    filename: `payment-file-${run.reference.replace(/[^a-z0-9]+/gi, "-").toLowerCase().slice(0, 50)}.csv`,
    // Explicit \uFEFF rather than a literal BOM character: a literal one is
    // invisible in source and easy to lose, and Excel needs it to read UTF-8.
    csv: `\uFEFF${csv}`,
    rows: rows.length,
    total: round2(rows.reduce((s, r) => s + Number(r.amount), 0)),
    currency: run.currency,
    missing,
    note: "ExecUI does not transfer money. Upload this file to your bank, or use it to key the payments in.",
  };
}

// ── Approval outcome hook ────────────────────────────────────────────────────
export async function onApprovalOutcome({ tenantId, record, action }) {
  if (record?.subjectResource !== "payrun" || !record?.subjectRecordId) return { handled: false };
  const to = action === "approved" ? "approved" : action === "rejected" ? "draft" : null;
  if (!to) return { handled: false };

  return runWithTenant({ tenantId }, async () => {
    const run = await prisma.payRun.findFirst({ where: { id: record.subjectRecordId } });
    if (!run || !canTransitionRun(run.status, to)) return { handled: false };

    await prisma.payRun.update({
      where: { id: run.id },
      data: {
        status: to,
        ...(to === "approved" ? { approvedAt: new Date(), approvedById: record.requestedById ?? null } : {}),
      },
    });

    if (run.createdById) {
      try {
        await notify({
          tenantId, userId: run.createdById, type: "payroll",
          title: action === "approved" ? `${run.reference} was approved` : `${run.reference} was sent back`,
          body: action === "approved" ? "You can now record it as paid and export the payment file." : "Review the comments and recalculate.",
          link: linkTo("payRun", run.id), actorName: "Payroll",
        });
      } catch { /* best effort */ }
    }
    return { handled: true, status: to };
  });
}

let unsubscribe = null;
export function startPayrollHooks() {
  if (unsubscribe) return unsubscribe;
  unsubscribe = onDomainEvent((event) => {
    if (event?.resource !== "approvals") return;
    onApprovalOutcome(event).catch((e) => log.warn?.("payroll_approval_hook_failed", { error: e.message }));
  });
  return unsubscribe;
}

export function stopPayrollHooks() {
  if (unsubscribe) unsubscribe();
  unsubscribe = null;
}

/** Headline payroll numbers for the console. */
export async function payrollStats() {
  const [runs, lastPaid, components, tables] = await Promise.all([
    prisma.payRun.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.payRun.findFirst({ where: { status: "paid" }, orderBy: { paidAt: "desc" } }),
    prisma.payComponent.count({ where: { active: true } }),
    prisma.taxTable.count({ where: { active: true } }),
  ]);
  return {
    byStatus: Object.fromEntries(runs.map((r) => [r.status, r._count._all])),
    lastPaidRun: lastPaid
      ? { id: lastPaid.id, reference: lastPaid.reference, paidAt: lastPaid.paidAt, totals: lastPaid.totals }
      : null,
    activeComponents: components,
    activeTaxTables: tables,
    periodsPerYear: Object.fromEntries(["monthly", "semimonthly", "biweekly", "weekly"].map((f) => [f, periodsPerYear(f)])),
  };
}
