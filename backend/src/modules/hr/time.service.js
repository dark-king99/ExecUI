/**
 * Timesheets — the hours hourly pay is calculated from.
 *
 * One rule dominates: **only approved hours are ever paid, and only once.**
 * A draft timesheet must not be able to pay itself, and an entry already
 * attached to a payslip is locked so the same hours can't be claimed in the next
 * run. Everything else here follows from that.
 */
import prisma from "../../config/database.js";
import { notify } from "../notifications/notifications.service.js";
import { round2 } from "./payroll.engine.js";
import { recordEvent } from "./people.service.js";
import { TIME_ENTRY_STATUSES } from "./hr.registry.js";

const err = (message, status = 400) => { const e = new Error(message); e.status = status; return e; };
const str = (v, max) => (v == null || v === "" ? null : String(v).slice(0, max));
const nameOf = (u) => (u ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email : null);

const day = (v, field) => {
  const d = new Date(v);
  if (!v || Number.isNaN(d.getTime())) throw err(`${field} isn't a valid date`);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

const MAX_HOURS_PER_DAY = 24;

export const shape = (e) => ({
  id: e.id, userId: e.userId, userName: e.user ? nameOf(e.user) : undefined,
  date: e.date, hours: e.hours, overtimeHours: e.overtimeHours,
  project: e.project, note: e.note, status: e.status,
  approvedById: e.approvedById, approvedAt: e.approvedAt,
  paid: !!e.payslipId, createdAt: e.createdAt,
});

const include = { user: { select: { firstName: true, lastName: true, email: true } } };

// ── Reading ──────────────────────────────────────────────────────────────────
export async function listEntries({ userId, status, from, to, limit = 500 } = {}) {
  const where = {};
  if (userId) where.userId = userId;
  if (status && status !== "all") where.status = status;
  if (from || to) {
    where.date = {};
    if (from) where.date.gte = day(from, "From date");
    if (to) where.date.lte = day(to, "To date");
  }
  const rows = await prisma.timeEntry.findMany({
    where, include, orderBy: [{ date: "desc" }],
    take: Math.min(1000, Math.max(1, Number(limit) || 500)),
  });
  return rows.map(shape);
}

/** Approved, unpaid hours per employee for a pay period. */
export async function hoursForPeriod(periodStart, periodEnd) {
  const rows = await prisma.timeEntry.findMany({
    where: {
      status: "approved",
      payslipId: null, // never pay the same hours twice
      date: { gte: day(periodStart, "Period start"), lte: day(periodEnd, "Period end") },
    },
    select: { id: true, userId: true, hours: true, overtimeHours: true },
  });

  const byUser = {};
  for (const r of rows) {
    const entry = (byUser[r.userId] ??= { hours: 0, overtimeHours: 0, entryIds: [] });
    entry.hours = round2(entry.hours + Number(r.hours ?? 0));
    entry.overtimeHours = round2(entry.overtimeHours + Number(r.overtimeHours ?? 0));
    entry.entryIds.push(r.id);
  }
  return byUser;
}

/** Totals for a person over a window — what the self-service page shows. */
export async function summary({ userId, from, to } = {}) {
  const entries = await listEntries({ userId, from, to, limit: 1000 });
  const total = (key) => round2(entries.reduce((s, e) => s + Number(e[key] ?? 0), 0));
  const byStatus = {};
  for (const e of entries) byStatus[e.status] = round2((byStatus[e.status] ?? 0) + Number(e.hours ?? 0));
  return {
    entries: entries.length,
    hours: total("hours"),
    overtimeHours: total("overtimeHours"),
    hoursByStatus: byStatus,
    unpaidApprovedHours: round2(entries.filter((e) => e.status === "approved" && !e.paid).reduce((s, e) => s + Number(e.hours ?? 0) + Number(e.overtimeHours ?? 0), 0)),
  };
}

// ── Writing ──────────────────────────────────────────────────────────────────
export async function logTime(user, body = {}) {
  const userId = body.userId && body.userId !== user.userId ? String(body.userId) : user.userId;
  if (userId !== user.userId && !["enterprise_admin", "system_admin"].includes(user.role)) {
    throw err("Only an administrator can log time for someone else.", 403);
  }

  const date = day(body.date, "Date");
  const today = new Date(); today.setUTCHours(0, 0, 0, 0);
  if (date > today) throw err("You can't log hours for a future date");

  const hours = Number(body.hours);
  if (!Number.isFinite(hours) || hours <= 0) throw err("Enter the hours worked as a positive number");
  const overtimeHours = Number(body.overtimeHours ?? 0) || 0;
  if (overtimeHours < 0) throw err("Overtime hours can't be negative");
  if (hours + overtimeHours > MAX_HOURS_PER_DAY) throw err(`${hours + overtimeHours} hours in one day isn't possible — check the entry`);

  const project = str(body.project, 120) ?? "";

  // The unique index is (userId, date, project); adding to an existing entry is
  // friendlier than a constraint error, so same day + same project accumulates.
  const existing = await prisma.timeEntry.findFirst({ where: { userId, date, project } });
  if (existing) {
    if (existing.payslipId) throw err("These hours have already been paid. Log any correction on a new line.", 409);
    if (existing.status === "approved") throw err("That day is already approved. Ask an administrator to reopen it before changing it.", 409);
    const merged = round2(Number(existing.hours) + hours);
    if (merged + round2(Number(existing.overtimeHours) + overtimeHours) > MAX_HOURS_PER_DAY) {
      throw err(`That would take this day over ${MAX_HOURS_PER_DAY} hours`);
    }
    const updated = await prisma.timeEntry.update({
      where: { id: existing.id },
      data: {
        hours: merged,
        overtimeHours: round2(Number(existing.overtimeHours) + overtimeHours),
        note: str(body.note, 300) ?? existing.note,
        status: body.submit ? "submitted" : existing.status === "rejected" ? "draft" : existing.status,
      },
      include,
    });
    return shape(updated);
  }

  const created = await prisma.timeEntry.create({
    data: {
      userId, date, hours: round2(hours), overtimeHours: round2(overtimeHours),
      project, note: str(body.note, 300),
      status: body.submit ? "submitted" : "draft",
    },
    include,
  });
  return shape(created);
}

export async function updateEntry(user, id, body = {}) {
  const entry = await prisma.timeEntry.findFirst({ where: { id } });
  if (!entry) throw err("Time entry not found", 404);

  const isAdmin = ["enterprise_admin", "system_admin"].includes(user.role);
  if (entry.userId !== user.userId && !isAdmin) throw err("You can only change your own timesheet.", 403);
  if (entry.payslipId) throw err("These hours have already been paid and can't be changed.", 409);
  if (entry.status === "approved" && !isAdmin) throw err("Approved hours can only be changed by an administrator.", 409);

  const data = {};
  if (body.hours !== undefined) {
    const h = Number(body.hours);
    if (!Number.isFinite(h) || h <= 0) throw err("Enter the hours worked as a positive number");
    data.hours = round2(h);
  }
  if (body.overtimeHours !== undefined) {
    const o = Number(body.overtimeHours);
    if (!Number.isFinite(o) || o < 0) throw err("Overtime hours can't be negative");
    data.overtimeHours = round2(o);
  }
  if ((data.hours ?? entry.hours) + (data.overtimeHours ?? entry.overtimeHours) > MAX_HOURS_PER_DAY) {
    throw err(`That's more than ${MAX_HOURS_PER_DAY} hours in one day`);
  }
  if (body.note !== undefined) data.note = str(body.note, 300);
  if (body.project !== undefined) data.project = str(body.project, 120) ?? "";
  if (body.status !== undefined) {
    if (!TIME_ENTRY_STATUSES.includes(body.status)) throw err(`Status must be one of: ${TIME_ENTRY_STATUSES.join(", ")}`);
    // Approving is a separate, authorized action — see approveEntries.
    if (body.status === "approved") throw err("Use the approve action to approve hours.");
    data.status = body.status;
  }

  await prisma.timeEntry.update({ where: { id }, data });
  return shape(await prisma.timeEntry.findFirst({ where: { id }, include }));
}

export async function deleteEntry(user, id) {
  const entry = await prisma.timeEntry.findFirst({ where: { id } });
  if (!entry) throw err("Time entry not found", 404);
  const isAdmin = ["enterprise_admin", "system_admin"].includes(user.role);
  if (entry.userId !== user.userId && !isAdmin) throw err("You can only delete your own timesheet entries.", 403);
  if (entry.payslipId) throw err("These hours have been paid and can't be deleted.", 409);
  if (entry.status === "approved" && !isAdmin) throw err("Approved hours can only be removed by an administrator.", 409);
  await prisma.timeEntry.delete({ where: { id } });
  return { deleted: true };
}

/** Submit a date range for approval. */
export async function submitRange(user, { from, to, userId } = {}) {
  const target = userId && userId !== user.userId ? String(userId) : user.userId;
  if (target !== user.userId && !["enterprise_admin", "system_admin"].includes(user.role)) {
    throw err("Only an administrator can submit someone else's timesheet.", 403);
  }
  const start = day(from, "From date"), end = day(to, "To date");
  if (end < start) throw err("The end date can't be before the start date");

  const result = await prisma.timeEntry.updateMany({
    where: { userId: target, status: "draft", date: { gte: start, lte: end }, payslipId: null },
    data: { status: "submitted" },
  });
  if (!result.count) throw err("There are no draft hours in that range to submit.");

  // Tell whoever has to act on it, rather than leaving it in a queue nobody watches.
  try {
    const profile = await prisma.employmentProfile.findFirst({ where: { userId: target }, select: { managerId: true } });
    const person = await prisma.user.findFirst({ where: { id: target }, select: { firstName: true, lastName: true, email: true, tenantId: true } });
    if (profile?.managerId) {
      await notify({
        tenantId: person.tenantId, userId: profile.managerId, type: "timesheet",
        title: `Timesheet to approve: ${nameOf(person)}`,
        body: `${result.count} day${result.count === 1 ? "" : "s"} · ${from} → ${to}`,
        link: "/people", actorName: "People Ops",
      });
    }
  } catch { /* submission stands regardless */ }

  return { submitted: result.count };
}

/**
 * Approve hours. The manager on the employment record or an admin — and never
 * your own timesheet, which is the whole point of an approval step.
 */
export async function approveEntries(user, { ids, userId, from, to, decision = "approved", note } = {}) {
  if (!["approved", "rejected"].includes(decision)) throw err('Decision must be "approved" or "rejected"');

  const where = { status: "submitted", payslipId: null };
  if (Array.isArray(ids) && ids.length) where.id = { in: ids.map(String) };
  else if (userId) {
    where.userId = String(userId);
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = day(from, "From date");
      if (to) where.date.lte = day(to, "To date");
    }
  } else throw err("Choose the entries to decide, or an employee and a date range");

  const entries = await prisma.timeEntry.findMany({ where, select: { id: true, userId: true, hours: true, overtimeHours: true } });
  if (!entries.length) throw err("There are no submitted hours matching that.", 404);

  const isAdmin = ["enterprise_admin", "system_admin"].includes(user.role);
  const owners = [...new Set(entries.map((e) => e.userId))];

  if (owners.includes(user.userId)) throw err("You can't approve your own hours.", 403);
  if (!isAdmin) {
    const profiles = await prisma.employmentProfile.findMany({
      where: { userId: { in: owners } }, select: { userId: true, managerId: true },
    });
    const notMine = profiles.filter((p) => p.managerId !== user.userId).map((p) => p.userId);
    if (notMine.length || profiles.length !== owners.length) {
      throw err("You can only approve hours for people who report to you.", 403);
    }
  }

  await prisma.timeEntry.updateMany({
    where: { id: { in: entries.map((e) => e.id) } },
    data: {
      status: decision,
      approvedById: user.userId,
      approvedAt: decision === "approved" ? new Date() : null,
      note: note ? str(note, 300) : undefined,
    },
  });

  const hours = round2(entries.reduce((s, e) => s + Number(e.hours ?? 0) + Number(e.overtimeHours ?? 0), 0));
  for (const owner of owners) {
    await recordEvent(owner, "timesheet", {
      detail: `${entries.filter((e) => e.userId === owner).length} day(s) ${decision}`,
      actor: { userId: user.userId, name: user.name ?? null },
    });
    try {
      const person = await prisma.user.findFirst({ where: { id: owner }, select: { tenantId: true } });
      await notify({
        tenantId: person.tenantId, userId: owner, type: "timesheet",
        title: `Your hours were ${decision}`, body: note || null,
        link: "/people", actorName: "People Ops",
      });
    } catch { /* best effort */ }
  }

  return { decided: entries.length, hours, decision };
}

/** Reopen approved hours for correction (admin only, and never once paid). */
export async function reopenEntry(user, id) {
  if (!["enterprise_admin", "system_admin"].includes(user.role)) {
    throw err("Only an administrator can reopen approved hours.", 403);
  }
  const entry = await prisma.timeEntry.findFirst({ where: { id } });
  if (!entry) throw err("Time entry not found", 404);
  if (entry.payslipId) throw err("These hours have been paid — correct them with a new entry instead.", 409);
  await prisma.timeEntry.update({
    where: { id }, data: { status: "draft", approvedById: null, approvedAt: null },
  });
  return shape(await prisma.timeEntry.findFirst({ where: { id }, include }));
}
