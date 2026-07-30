/**
 * Leave management.
 *
 * The rules that matter:
 *
 * • **A balance is never implied.** Requesting leave checks the remaining
 *   allocation and refuses to overdraw it, and the days are held against the
 *   balance the moment the request is approved — not when it starts, because a
 *   booked holiday is already spent.
 *
 * • **Approval routes through the existing approvals engine**, so leave sign-off
 *   uses the same inbox, audit trail and delegation rules as everything else.
 *   The manager on the employment record is the first approver when there is
 *   one; otherwise it falls to admins rather than to nobody.
 *
 * • **Unpaid leave reaches payroll.** Approved days on an unpaid type are
 *   deducted from the pay period they fall in, split correctly across months for
 *   leave that spans a period boundary.
 */
import prisma from "../../config/database.js";
import { runWithTenant, runUnscoped } from "../../lib/tenantContext.js";
import { notify, notifyMany } from "../notifications/notifications.service.js";
import { onDomainEvent } from "../../lib/domainEvents.js";
import { log } from "../../lib/logger.js";
import { DEFAULT_LEAVE_TYPES, LEAVE_STATUSES } from "./hr.registry.js";
import { requestedDays, remainingDays, leaveDaysInPeriod, round2 } from "./payroll.engine.js";
import { recordEvent } from "./people.service.js";

const err = (message, status = 400) => { const e = new Error(message); e.status = status; return e; };
const str = (v, max) => (v == null || v === "" ? null : String(v).slice(0, max));
const nameOf = (u) => (u ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email : null);

const date = (v, field) => {
  const d = new Date(v);
  if (!v || Number.isNaN(d.getTime())) throw err(`${field} isn't a valid date`);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

const currentYear = () => new Date().getUTCFullYear();

// ── Shaping ──────────────────────────────────────────────────────────────────
export const shapeType = (t) => ({
  id: t.id, code: t.code, name: t.name, paid: t.paid, annualDays: t.annualDays,
  carryOverMax: t.carryOverMax, requiresApproval: t.requiresApproval,
  countsWeekends: t.countsWeekends, active: t.active, colour: t.colour, note: t.note,
});

export const shapeBalance = (b, { type, user } = {}) => ({
  id: b.id, userId: b.userId, userName: user ? nameOf(user) : undefined,
  leaveTypeId: b.leaveTypeId,
  leaveTypeName: type?.name ?? b.leaveType?.name ?? null,
  leaveTypeCode: type?.code ?? b.leaveType?.code ?? null,
  paid: type?.paid ?? b.leaveType?.paid ?? null,
  year: b.year,
  entitledDays: b.entitledDays, carriedOver: b.carriedOver,
  adjustment: b.adjustment, usedDays: b.usedDays,
  remaining: remainingDays(b),
});

export const shapeRequest = (r) => ({
  id: r.id, userId: r.userId, userName: r.user ? nameOf(r.user) : undefined,
  leaveTypeId: r.leaveTypeId,
  leaveTypeName: r.leaveType?.name ?? null,
  paid: r.leaveType?.paid ?? null,
  startDate: r.startDate, endDate: r.endDate, days: r.days, halfDay: r.halfDay,
  reason: r.reason, status: r.status, approvalRequestId: r.approvalRequestId,
  decidedById: r.decidedById, decidedAt: r.decidedAt, decisionNote: r.decisionNote,
  createdAt: r.createdAt,
});

const include = {
  user: { select: { firstName: true, lastName: true, email: true } },
  leaveType: { select: { name: true, code: true, paid: true, countsWeekends: true } },
};

// ── Types ────────────────────────────────────────────────────────────────────
export async function listTypes({ includeInactive = false } = {}) {
  const rows = await prisma.leaveType.findMany({
    where: includeInactive ? {} : { active: true },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });
  return rows.map(shapeType);
}

export async function createType(body = {}) {
  const code = String(body.code ?? "").trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
  if (!code) throw err("A leave type needs a short code, like \"annual\"");
  const name = String(body.name ?? "").trim();
  if (!name) throw err("A leave type needs a name");

  const clash = await prisma.leaveType.findFirst({ where: { code } });
  if (clash) throw err(`There's already a leave type with the code "${code}"`, 409);

  const row = await prisma.leaveType.create({
    data: {
      code: code.slice(0, 40), name: name.slice(0, 80),
      paid: body.paid !== false,
      annualDays: Math.max(0, Number(body.annualDays) || 0),
      carryOverMax: Math.max(0, Number(body.carryOverMax) || 0),
      requiresApproval: body.requiresApproval !== false,
      countsWeekends: !!body.countsWeekends,
      colour: str(body.colour, 20),
      note: str(body.note, 300),
    },
  });
  return shapeType(row);
}

export async function updateType(id, body = {}) {
  const existing = await prisma.leaveType.findFirst({ where: { id } });
  if (!existing) throw err("Leave type not found", 404);
  const data = {};
  if (body.name !== undefined) {
    const n = String(body.name).trim();
    if (!n) throw err("A leave type needs a name");
    data.name = n.slice(0, 80);
  }
  if (body.paid !== undefined) data.paid = !!body.paid;
  if (body.annualDays !== undefined) data.annualDays = Math.max(0, Number(body.annualDays) || 0);
  if (body.carryOverMax !== undefined) data.carryOverMax = Math.max(0, Number(body.carryOverMax) || 0);
  if (body.requiresApproval !== undefined) data.requiresApproval = !!body.requiresApproval;
  if (body.countsWeekends !== undefined) data.countsWeekends = !!body.countsWeekends;
  if (body.active !== undefined) data.active = !!body.active;
  if (body.colour !== undefined) data.colour = str(body.colour, 20);
  if (body.note !== undefined) data.note = str(body.note, 300);
  await prisma.leaveType.update({ where: { id }, data });
  return shapeType(await prisma.leaveType.findFirst({ where: { id } }));
}

export async function deleteType(id) {
  const existing = await prisma.leaveType.findFirst({ where: { id } });
  if (!existing) throw err("Leave type not found", 404);
  const used = await prisma.leaveRequest.count({ where: { leaveTypeId: id } });
  if (used) throw err("People have booked leave of this type. Deactivate it instead, so their history stays intact.", 409);
  await prisma.leaveType.delete({ where: { id } });
  return { deleted: true };
}

/**
 * Seed the starter catalog. Explicitly an action an admin takes, not something
 * that happens silently — statutory entitlements differ everywhere, and these
 * numbers are a starting point the organization is expected to edit.
 */
export async function seedDefaultTypes() {
  const existing = await prisma.leaveType.findMany({ select: { code: true } });
  const have = new Set(existing.map((t) => t.code));
  const created = [];
  for (const t of DEFAULT_LEAVE_TYPES) {
    if (have.has(t.code)) continue;
    created.push(await prisma.leaveType.create({ data: { ...t, requiresApproval: true } }));
  }
  return { created: created.length, types: (await listTypes({ includeInactive: true })) };
}

// ── Balances ─────────────────────────────────────────────────────────────────
/** Ensure this person has an allocation row per active type for the year. */
export async function ensureBalances(userId, year = currentYear()) {
  const types = await prisma.leaveType.findMany({ where: { active: true } });
  const existing = await prisma.leaveBalance.findMany({ where: { userId, year } });
  const have = new Set(existing.map((b) => b.leaveTypeId));

  for (const type of types) {
    if (have.has(type.id)) continue;
    await prisma.leaveBalance.create({
      data: { userId, leaveTypeId: type.id, year, entitledDays: type.annualDays },
    });
  }
  return listBalances({ userId, year });
}

export async function listBalances({ userId, year = currentYear() } = {}) {
  const rows = await prisma.leaveBalance.findMany({
    where: { ...(userId ? { userId } : {}), year },
    include: { leaveType: true, user: { select: { firstName: true, lastName: true, email: true } } },
    orderBy: [{ leaveType: { name: "asc" } }],
  });
  return rows.map((b) => shapeBalance(b, { type: b.leaveType, user: b.user }));
}

export async function adjustBalance(actorId, body = {}) {
  const { userId, leaveTypeId } = body;
  const year = Number(body.year) || currentYear();
  if (!userId || !leaveTypeId) throw err("Choose an employee and a leave type");

  const type = await prisma.leaveType.findFirst({ where: { id: leaveTypeId } });
  if (!type) throw err("Leave type not found", 404);

  const data = {};
  if (body.entitledDays !== undefined) data.entitledDays = Math.max(0, Number(body.entitledDays) || 0);
  if (body.carriedOver !== undefined) data.carriedOver = Math.max(0, Number(body.carriedOver) || 0);
  if (body.adjustment !== undefined) {
    const adj = Number(body.adjustment);
    if (!Number.isFinite(adj)) throw err("The adjustment must be a number");
    data.adjustment = adj;
  }

  const existing = await prisma.leaveBalance.findFirst({ where: { userId, leaveTypeId, year } });
  if (existing) await prisma.leaveBalance.update({ where: { id: existing.id }, data });
  else await prisma.leaveBalance.create({ data: { userId, leaveTypeId, year, entitledDays: type.annualDays, ...data } });

  await recordEvent(userId, "leave", {
    detail: `${type.name} allocation adjusted for ${year}`,
    actor: { userId: actorId, name: null },
  });
  return listBalances({ userId, year });
}

/**
 * Year rollover: carry unused days into the next year, capped per type, and open
 * the new year's entitlement. Idempotent — running it twice does not double
 * anyone's allowance.
 */
export async function rollOverYear(fromYear = currentYear() - 1, toYear = currentYear()) {
  const types = await prisma.leaveType.findMany({ where: { active: true } });
  const byId = Object.fromEntries(types.map((t) => [t.id, t]));
  const previous = await prisma.leaveBalance.findMany({ where: { year: fromYear } });
  let created = 0, carried = 0;

  for (const balance of previous) {
    const type = byId[balance.leaveTypeId];
    if (!type) continue;
    const existing = await prisma.leaveBalance.findFirst({
      where: { userId: balance.userId, leaveTypeId: balance.leaveTypeId, year: toYear },
    });
    if (existing) continue; // already rolled over
    const unused = Math.max(0, remainingDays(balance));
    const carryOver = Math.min(unused, Number(type.carryOverMax ?? 0));
    await prisma.leaveBalance.create({
      data: {
        userId: balance.userId, leaveTypeId: balance.leaveTypeId, year: toYear,
        entitledDays: type.annualDays, carriedOver: round2(carryOver),
      },
    });
    created++;
    if (carryOver > 0) carried += carryOver;
  }
  return { fromYear, toYear, created, daysCarried: round2(carried) };
}

// ── Requests ─────────────────────────────────────────────────────────────────
export async function listRequests({ userId, status, from, to, limit = 200 } = {}) {
  const where = {};
  if (userId) where.userId = userId;
  if (status && status !== "all") where.status = status;
  if (from || to) {
    where.AND = [
      ...(to ? [{ startDate: { lte: new Date(to) } }] : []),
      ...(from ? [{ endDate: { gte: new Date(from) } }] : []),
    ];
  }
  const rows = await prisma.leaveRequest.findMany({
    where, include, orderBy: { startDate: "desc" },
    take: Math.min(500, Math.max(1, Number(limit) || 200)),
  });
  return rows.map(shapeRequest);
}

export async function getRequest(id) {
  const row = await prisma.leaveRequest.findFirst({ where: { id }, include });
  if (!row) throw err("Leave request not found", 404);
  return shapeRequest(row);
}

/**
 * Book leave. Overlap and balance are both checked here, because "computer said
 * yes then HR said no" is the worst possible outcome for the person asking.
 */
export async function requestLeave(user, body = {}) {
  const userId = body.userId && body.userId !== user.userId ? String(body.userId) : user.userId;
  // Booking on someone else's behalf is an admin action.
  if (userId !== user.userId && !["enterprise_admin", "system_admin"].includes(user.role)) {
    throw err("Only an administrator can book leave for someone else.", 403);
  }

  const type = await prisma.leaveType.findFirst({ where: { id: body.leaveTypeId } });
  if (!type) throw err("Choose a leave type", 404);
  if (!type.active) throw err(`${type.name} isn't available for booking any more.`);

  const startDate = date(body.startDate, "Start date");
  const endDate = date(body.endDate ?? body.startDate, "End date");
  if (endDate < startDate) throw err("The end date can't be before the start date");

  const days = requestedDays(startDate, endDate, {
    halfDay: !!body.halfDay, countsWeekends: type.countsWeekends,
  });
  if (days <= 0) {
    throw err(type.countsWeekends
      ? "That range contains no days."
      : "That range is entirely weekend — pick working days, or set this leave type to count weekends.");
  }

  // Overlapping leave is nearly always a mistake, so it's refused with the
  // conflicting dates rather than silently double-booked.
  const clash = await prisma.leaveRequest.findFirst({
    where: {
      userId, status: { in: ["pending", "approved"] },
      startDate: { lte: endDate }, endDate: { gte: startDate },
    },
    include,
  });
  if (clash) {
    throw err(`This overlaps leave you already have booked (${clash.leaveType?.name}, ${clash.startDate.toISOString().slice(0, 10)} → ${clash.endDate.toISOString().slice(0, 10)}).`, 409);
  }

  // Paid types draw on an allocation; unpaid leave has nothing to draw down.
  if (type.paid && type.annualDays > 0) {
    const year = startDate.getUTCFullYear();
    await ensureBalances(userId, year);
    const balance = await prisma.leaveBalance.findFirst({ where: { userId, leaveTypeId: type.id, year } });
    const left = remainingDays(balance);
    if (days > left) {
      throw err(`That's ${days} day${days === 1 ? "" : "s"} but only ${left} remain${left === 1 ? "s" : ""} of your ${type.name.toLowerCase()} for ${year}.`);
    }
  }

  const needsApproval = type.requiresApproval;
  const created = await prisma.leaveRequest.create({
    data: {
      userId, leaveTypeId: type.id, startDate, endDate, days,
      halfDay: !!body.halfDay, reason: str(body.reason, 500),
      status: needsApproval ? "pending" : "approved",
      decidedAt: needsApproval ? null : new Date(),
    },
    include,
  });

  if (!needsApproval) {
    await applyToBalance(created, +1);
  } else {
    await raiseApproval(user, created, type);
  }

  await recordEvent(userId, "leave", {
    detail: `${type.name}: ${startDate.toISOString().slice(0, 10)} → ${endDate.toISOString().slice(0, 10)} (${days}d, ${created.status})`,
    effectiveAt: startDate,
    actor: { userId: user.userId, name: user.name ?? null },
  });

  return shapeRequest(created);
}

/** Move days on or off the relevant year's balance. */
async function applyToBalance(request, sign) {
  const type = await prisma.leaveType.findFirst({ where: { id: request.leaveTypeId } });
  if (!type?.paid || !type.annualDays) return;
  const year = new Date(request.startDate).getUTCFullYear();
  await ensureBalances(request.userId, year);
  const balance = await prisma.leaveBalance.findFirst({
    where: { userId: request.userId, leaveTypeId: request.leaveTypeId, year },
  });
  if (!balance) return;
  await prisma.leaveBalance.update({
    where: { id: balance.id },
    data: { usedDays: Math.max(0, round2(Number(balance.usedDays ?? 0) + sign * Number(request.days ?? 0))) },
  });
}

/** Route the request to the person's manager, or to admins if they have none. */
async function raiseApproval(user, request, type) {
  try {
    const profile = await prisma.employmentProfile.findFirst({
      where: { userId: request.userId }, select: { managerId: true },
    });
    const approvers = profile?.managerId
      ? { type: "user", value: profile.managerId }
      : { type: "admins" };

    const requester = await prisma.user.findFirst({
      where: { id: request.userId }, select: { firstName: true, lastName: true, email: true },
    });

    const { createRequest } = await import("../approvals/approvals.service.js");
    const approval = await createRequest({
      tenantId: user.tenantId,
      title: `Leave request: ${nameOf(requester)}`,
      summary: `${type.name} · ${request.startDate.toISOString().slice(0, 10)} → ${request.endDate.toISOString().slice(0, 10)} · ${request.days} day${request.days === 1 ? "" : "s"}${request.reason ? ` · ${request.reason}` : ""}`,
      resource: "leave",
      recordId: request.id,
      recordLabel: `${nameOf(requester)} — ${type.name}`,
      steps: [{ name: profile?.managerId ? "Manager approval" : "HR approval", approvers, requiredCount: 1 }],
      requestedById: request.userId,
      ctx: { record: request },
    });
    await prisma.leaveRequest.update({ where: { id: request.id }, data: { approvalRequestId: approval.id } });
  } catch (e) {
    // A routing failure must not lose the request — it stays pending and an
    // admin can decide it directly.
    log.warn?.("leave_approval_route_failed", { requestId: request.id, error: e.message });
  }
}

/** Decide a request directly (admin, or the assigned manager). */
export async function decideRequest(user, id, { decision, note } = {}) {
  if (!["approved", "rejected"].includes(decision)) throw err('Decision must be "approved" or "rejected"');

  const request = await prisma.leaveRequest.findFirst({ where: { id }, include });
  if (!request) throw err("Leave request not found", 404);
  if (request.status !== "pending") throw err(`This request is already ${request.status}.`, 409);

  const isAdmin = ["enterprise_admin", "system_admin"].includes(user.role);
  if (!isAdmin) {
    const profile = await prisma.employmentProfile.findFirst({ where: { userId: request.userId }, select: { managerId: true } });
    if (profile?.managerId !== user.userId) throw err("Only this person's manager or an administrator can decide their leave.", 403);
  }

  const updated = await prisma.leaveRequest.update({
    where: { id },
    data: { status: decision, decidedById: user.userId, decidedAt: new Date(), decisionNote: str(note, 500) },
    include,
  });

  if (decision === "approved") await applyToBalance(updated, +1);

  try {
    await notify({
      tenantId: request.tenantId, userId: request.userId, type: "leave",
      title: `Your ${request.leaveType?.name?.toLowerCase() ?? "leave"} was ${decision}`,
      body: note || `${request.startDate.toISOString().slice(0, 10)} → ${request.endDate.toISOString().slice(0, 10)}`,
      link: "/account/my-hr?section=leave", actorName: "People Ops",
    });
  } catch { /* the decision stands even if the notification fails */ }

  await recordEvent(request.userId, "leave", {
    detail: `${request.leaveType?.name ?? "Leave"} ${decision}${note ? ` — ${note}` : ""}`,
    actor: { userId: user.userId, name: user.name ?? null },
  });

  return shapeRequest(updated);
}

/**
 * Cancel a request. Approved leave can be cancelled up to the day it starts —
 * after that it has been taken, and un-taking it isn't a data operation.
 */
export async function cancelRequest(user, id) {
  const request = await prisma.leaveRequest.findFirst({ where: { id }, include });
  if (!request) throw err("Leave request not found", 404);

  const isAdmin = ["enterprise_admin", "system_admin"].includes(user.role);
  if (request.userId !== user.userId && !isAdmin) throw err("You can only cancel your own leave.", 403);
  if (!["pending", "approved"].includes(request.status)) throw err(`This request is already ${request.status}.`, 409);

  const today = new Date(); today.setUTCHours(0, 0, 0, 0);
  if (request.status === "approved" && new Date(request.startDate) < today && !isAdmin) {
    throw err("This leave has already started — ask an administrator to amend it.", 409);
  }

  const updated = await prisma.leaveRequest.update({
    where: { id }, data: { status: "cancelled", decidedAt: new Date(), decidedById: user.userId }, include,
  });
  if (request.status === "approved") await applyToBalance(request, -1);

  await recordEvent(request.userId, "leave", {
    detail: `${request.leaveType?.name ?? "Leave"} cancelled`,
    actor: { userId: user.userId, name: user.name ?? null },
  });
  return shapeRequest(updated);
}

/** Unpaid, approved leave days falling inside a pay period, per employee. */
export async function unpaidLeaveForPeriod(periodStart, periodEnd) {
  const requests = await prisma.leaveRequest.findMany({
    where: {
      status: "approved",
      leaveType: { paid: false },
      startDate: { lte: new Date(periodEnd) },
      endDate: { gte: new Date(periodStart) },
    },
    include: { leaveType: { select: { countsWeekends: true } } },
  });

  const byUser = {};
  for (const r of requests) {
    const days = leaveDaysInPeriod(r, periodStart, periodEnd, { countsWeekends: r.leaveType?.countsWeekends });
    if (days > 0) byUser[r.userId] = round2((byUser[r.userId] ?? 0) + days);
  }
  return byUser;
}

/** Who is off, over a window — the calendar the whole team can see. */
export async function calendar({ from, to } = {}) {
  const start = from ? new Date(from) : new Date();
  const end = to ? new Date(to) : new Date(start.getTime() + 60 * 86_400_000);
  const rows = await prisma.leaveRequest.findMany({
    where: {
      status: { in: ["pending", "approved"] },
      startDate: { lte: end }, endDate: { gte: start },
    },
    include, orderBy: { startDate: "asc" },
  });
  // Reasons are personal; the calendar answers "who is away", not "why".
  return rows.map((r) => ({
    id: r.id, userId: r.userId, userName: nameOf(r.user),
    leaveTypeName: r.leaveType?.name ?? null,
    startDate: r.startDate, endDate: r.endDate, days: r.days,
    halfDay: r.halfDay, status: r.status,
  }));
}

// ── Approval outcome hook ────────────────────────────────────────────────────
/** Apply an approvals-engine outcome to the leave request it was raised for. */
export async function onApprovalOutcome({ tenantId, record, action }) {
  if (record?.subjectResource !== "leave" || !record?.subjectRecordId) return { handled: false };
  const status = action === "approved" ? "approved" : action === "rejected" ? "rejected" : null;
  if (!status) return { handled: false };

  return runWithTenant({ tenantId }, async () => {
    const request = await prisma.leaveRequest.findFirst({ where: { id: record.subjectRecordId }, include });
    if (!request || request.status !== "pending") return { handled: false };

    await prisma.leaveRequest.update({ where: { id: request.id }, data: { status, decidedAt: new Date() } });
    if (status === "approved") await applyToBalance(request, +1);

    try {
      await notify({
        tenantId, userId: request.userId, type: "leave",
        title: `Your ${request.leaveType?.name?.toLowerCase() ?? "leave"} was ${status}`,
        body: `${request.startDate.toISOString().slice(0, 10)} → ${request.endDate.toISOString().slice(0, 10)}`,
        link: "/account/my-hr?section=leave", actorName: "People Ops",
      });
    } catch { /* best effort */ }

    await recordEvent(request.userId, "leave", {
      detail: `${request.leaveType?.name ?? "Leave"} ${status} via approvals`,
      actor: { name: "Approvals" }, tenantId,
    });
    return { handled: true, status };
  });
}

let unsubscribe = null;
export function startLeaveHooks() {
  if (unsubscribe) return unsubscribe;
  unsubscribe = onDomainEvent((event) => {
    if (event?.resource !== "approvals") return;
    onApprovalOutcome(event).catch((e) => log.warn?.("leave_approval_hook_failed", { error: e.message }));
  });
  return unsubscribe;
}

export function stopLeaveHooks() {
  if (unsubscribe) unsubscribe();
  unsubscribe = null;
}

/** Annual rollover sweep, run by the HR scheduler. */
export async function runYearRollover() {
  const year = currentYear();
  const tenants = await runUnscoped(async () => prisma.tenant.findMany({ select: { id: true } }));
  let tenantsProcessed = 0, balancesCreated = 0;
  for (const { id: tenantId } of tenants) {
    try {
      const result = await runWithTenant({ tenantId }, async () => rollOverYear(year - 1, year));
      tenantsProcessed++;
      balancesCreated += result.created;
    } catch (e) {
      log.warn?.("leave_rollover_failed", { tenantId, error: e.message });
    }
  }
  return { year, tenantsProcessed, balancesCreated };
}

export { LEAVE_STATUSES };
