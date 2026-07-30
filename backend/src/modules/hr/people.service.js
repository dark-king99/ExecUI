/**
 * People records — the employment facts about each person.
 *
 * Two things shape this file:
 *
 * 1. **Government ids and bank details are encrypted at rest** and never
 *    returned in full. The console shows the last four digits, which is enough
 *    to confirm "the right account" without turning every HR screen into a
 *    place where someone's bank details can leak.
 *
 * 2. **Compensation is versioned, never edited.** A raise adds a row with an
 *    effective date; payroll then resolves "what was this person paid as of the
 *    pay date". Editing a salary in place would silently rewrite history and
 *    change what past payslips claim to have been based on.
 */
import prisma from "../../config/database.js";
import { encryptSecret, decryptSecret, last4 } from "../../lib/secrets.js";
import { log } from "../../lib/logger.js";
import {
  EMPLOYMENT_TYPES, EMPLOYMENT_STATUSES, PAYABLE_STATUSES, WORK_LOCATIONS,
  PAY_FREQUENCIES, PAY_TYPES, employmentType, employmentStatus, payFrequency,
} from "./hr.registry.js";
import { compensationAt, round2 } from "./payroll.engine.js";

const err = (message, status = 400) => { const e = new Error(message); e.status = status; return e; };

const str = (v, max) => (v == null || v === "" ? null : String(v).slice(0, max));
const date = (v, field) => {
  if (v == null || v === "") return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) throw err(`${field} isn't a valid date`);
  return d;
};

const nameOf = (u) => (u ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email : null);

// ── Shaping ──────────────────────────────────────────────────────────────────
/**
 * The client-facing shape. Note what is absent: no ciphertext, no IVs, no tags.
 * Only the last four digits of each sensitive identifier ever leave the server.
 */
export function shapeProfile(p, { user, compensation, manager } = {}) {
  if (!p) return null;
  return {
    id: p.id,
    userId: p.userId,
    name: user ? nameOf(user) : undefined,
    email: user?.email,
    jobTitle: user?.jobTitle ?? null,
    department: user?.department ?? null,
    avatarUrl: user?.avatarUrl ?? null,
    employmentType: p.employmentType,
    employmentTypeLabel: employmentType(p.employmentType)?.label ?? p.employmentType,
    status: p.status,
    statusLabel: employmentStatus(p.status)?.label ?? p.status,
    onPayroll: PAYABLE_STATUSES.includes(p.status),
    hireDate: p.hireDate,
    probationEndAt: p.probationEndAt,
    noticeGivenAt: p.noticeGivenAt,
    endDate: p.endDate,
    terminationReason: p.terminationReason,
    workLocation: p.workLocation,
    managerId: p.managerId,
    managerName: manager ? nameOf(manager) : null,
    costCenter: p.costCenter,
    weeklyHours: p.weeklyHours,
    dateOfBirth: p.dateOfBirth,
    emergencyName: p.emergencyName,
    emergencyPhone: p.emergencyPhone,
    emergencyRelation: p.emergencyRelation,
    // Confirmation, not disclosure.
    taxIdLast4: p.taxIdLast4,
    nationalIdLast4: p.nationalIdLast4,
    bankName: p.bankName,
    bankAccountLast4: p.bankAccountLast4,
    hasBankDetails: !!p.bankAccountCipher,
    notes: p.notes,
    compensation: compensation ? shapeCompensation(compensation) : null,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

export const shapeCompensation = (c) => ({
  id: c.id,
  userId: c.userId,
  effectiveFrom: c.effectiveFrom,
  payType: c.payType,
  payTypeLabel: PAY_TYPES.find((t) => t.id === c.payType)?.label ?? c.payType,
  baseAmount: c.baseAmount,
  currency: c.currency,
  payFrequency: c.payFrequency,
  payFrequencyLabel: payFrequency(c.payFrequency)?.label ?? c.payFrequency,
  hoursPerWeek: c.hoursPerWeek,
  reason: c.reason,
  note: c.note,
  createdById: c.createdById,
  createdAt: c.createdAt,
});

export const shapeEvent = (e) => ({
  id: e.id, type: e.type, detail: e.detail, fromValue: e.fromValue, toValue: e.toValue,
  effectiveAt: e.effectiveAt, actorId: e.actorId, actorName: e.actorName, createdAt: e.createdAt,
});

// ── Timeline ─────────────────────────────────────────────────────────────────
export async function recordEvent(userId, type, { detail, fromValue, toValue, effectiveAt, actor, tenantId } = {}) {
  try {
    await prisma.employmentEvent.create({
      data: {
        ...(tenantId ? { tenantId } : {}),
        userId, type,
        detail: str(detail, 500),
        fromValue: str(fromValue, 200),
        toValue: str(toValue, 200),
        effectiveAt: effectiveAt ?? null,
        actorId: actor?.userId ?? null,
        actorName: str(actor?.name, 160),
      },
    });
  } catch (e) {
    log.warn?.("employment_event_failed", { userId, type, error: e.message });
  }
}

async function actorFor(userId) {
  if (!userId) return { userId: null, name: null };
  const u = await prisma.user.findFirst({
    where: { id: userId }, select: { firstName: true, lastName: true, email: true },
  });
  return { userId, name: nameOf(u) };
}

// ── Reading ──────────────────────────────────────────────────────────────────
/**
 * The directory. Every active employee appears — including people with no HR
 * profile yet, so onboarding gaps are visible rather than hidden. That's the
 * whole point of a People console.
 */
export async function listPeople({ status, search, department, includeInactive = false, limit = 500 } = {}) {
  const where = {};
  if (!includeInactive) where.isActive = true;
  if (department) where.department = { equals: department, mode: "insensitive" };
  if (search) {
    const q = String(search).slice(0, 120);
    where.OR = [
      { firstName: { contains: q, mode: "insensitive" } },
      { lastName: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { jobTitle: { contains: q, mode: "insensitive" } },
    ];
  }

  const users = await prisma.user.findMany({
    where,
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    take: Math.min(1000, Math.max(1, Number(limit) || 500)),
    select: {
      id: true, firstName: true, lastName: true, email: true, jobTitle: true,
      department: true, avatarUrl: true, isActive: true, employeeId: true,
      employment: true,
    },
  });

  const ids = users.map((u) => u.id);
  const [comps, managers] = await Promise.all([
    ids.length ? prisma.compensation.findMany({ where: { userId: { in: ids } }, orderBy: { effectiveFrom: "desc" } }) : [],
    prisma.user.findMany({ where: { id: { in: users.map((u) => u.employment?.managerId).filter(Boolean) } }, select: { id: true, firstName: true, lastName: true, email: true } }),
  ]);
  const byManager = Object.fromEntries(managers.map((m) => [m.id, m]));
  const compsByUser = comps.reduce((acc, c) => { (acc[c.userId] ??= []).push(c); return acc; }, {});

  const rows = users.map((u) => {
    const profile = u.employment;
    const current = compensationAt(compsByUser[u.id] ?? [], new Date());
    if (!profile) {
      // No HR record yet — say so plainly instead of inventing defaults.
      return {
        id: null, userId: u.id, name: nameOf(u), email: u.email, jobTitle: u.jobTitle,
        department: u.department, avatarUrl: u.avatarUrl, employeeId: u.employeeId,
        status: null, statusLabel: "Not onboarded", onPayroll: false,
        employmentType: null, hireDate: null, managerName: null,
        compensation: current ? shapeCompensation(current) : null,
        needsOnboarding: true,
      };
    }
    return {
      ...shapeProfile(profile, { user: u, compensation: current, manager: byManager[profile.managerId] }),
      employeeId: u.employeeId,
      needsOnboarding: false,
    };
  });

  return status ? rows.filter((r) => r.status === status) : rows;
}

export async function getPerson(userId) {
  if (!userId) throw err("Employee not found", 404);
  const user = await prisma.user.findFirst({
    where: { id: userId },
    select: {
      id: true, firstName: true, lastName: true, email: true, jobTitle: true,
      department: true, avatarUrl: true, isActive: true, employeeId: true, employment: true,
    },
  });
  if (!user) throw err("Employee not found", 404);

  const [comps, events, manager, reports] = await Promise.all([
    prisma.compensation.findMany({ where: { userId }, orderBy: { effectiveFrom: "desc" } }),
    prisma.employmentEvent.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 100 }),
    user.employment?.managerId
      ? prisma.user.findFirst({ where: { id: user.employment.managerId }, select: { id: true, firstName: true, lastName: true, email: true } })
      : null,
    prisma.employmentProfile.findMany({
      where: { managerId: userId },
      select: { userId: true, user: { select: { firstName: true, lastName: true, email: true, jobTitle: true } } },
    }),
  ]);

  const current = compensationAt(comps, new Date());
  return {
    ...shapeProfile(user.employment, { user, compensation: current, manager }),
    userId: user.id,
    name: nameOf(user),
    email: user.email,
    employeeId: user.employeeId,
    isActive: user.isActive,
    needsOnboarding: !user.employment,
    compensationHistory: comps.map(shapeCompensation),
    directReports: reports.map((r) => ({ userId: r.userId, name: nameOf(r.user), jobTitle: r.user?.jobTitle ?? null })),
    events: events.map(shapeEvent),
  };
}

/** Headline numbers for the console. */
export async function stats() {
  const [headcount, profiles, comps, openLeave, pendingTime] = await Promise.all([
    prisma.user.count({ where: { isActive: true } }),
    prisma.employmentProfile.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.compensation.findMany({ orderBy: { effectiveFrom: "desc" } }),
    prisma.leaveRequest.count({ where: { status: "pending" } }),
    prisma.timeEntry.count({ where: { status: "submitted" } }),
  ]);

  // Annualized salary commitment, per currency — never summed across currencies.
  const latestByUser = new Map();
  const now = new Date();
  for (const c of comps) {
    if (new Date(c.effectiveFrom) > now) continue;
    if (!latestByUser.has(c.userId)) latestByUser.set(c.userId, c);
  }
  const salaryByCurrency = {};
  for (const c of latestByUser.values()) {
    if (c.payType !== "salary") continue;
    salaryByCurrency[c.currency] = round2((salaryByCurrency[c.currency] ?? 0) + Number(c.baseAmount ?? 0));
  }

  const byStatus = Object.fromEntries(profiles.map((p) => [p.status, p._count._all]));
  const onboarded = profiles.reduce((s, p) => s + p._count._all, 0);
  return {
    headcount,
    onboarded,
    awaitingOnboarding: Math.max(0, headcount - onboarded),
    byStatus,
    annualSalaryByCurrency: salaryByCurrency,
    pendingLeaveRequests: openLeave,
    timesheetsAwaitingApproval: pendingTime,
  };
}

/** Org chart: who reports to whom, derived from the profiles. */
export async function orgChart() {
  const profiles = await prisma.employmentProfile.findMany({
    where: { status: { not: "terminated" } },
    select: {
      userId: true, managerId: true, status: true,
      user: { select: { firstName: true, lastName: true, email: true, jobTitle: true, department: true } },
    },
  });
  const nodes = profiles.map((p) => ({
    userId: p.userId, name: nameOf(p.user), jobTitle: p.user?.jobTitle ?? null,
    department: p.user?.department ?? null, managerId: p.managerId, status: p.status,
  }));
  const ids = new Set(nodes.map((n) => n.userId));
  return {
    nodes,
    // A manager outside the set (left the company, never onboarded) would make a
    // tree that silently drops people; surface those instead.
    roots: nodes.filter((n) => !n.managerId || !ids.has(n.managerId)).map((n) => n.userId),
  };
}

// ── Writing ──────────────────────────────────────────────────────────────────
function validateProfile(body = {}, { partial = false } = {}) {
  const data = {};

  if (body.employmentType !== undefined || !partial) {
    const t = body.employmentType ?? "full_time";
    if (!employmentType(t)) throw err(`Employment type must be one of: ${EMPLOYMENT_TYPES.map((x) => x.id).join(", ")}`);
    data.employmentType = t;
  }
  if (body.status !== undefined) {
    if (!employmentStatus(body.status)) throw err(`Status must be one of: ${EMPLOYMENT_STATUSES.map((x) => x.id).join(", ")}`);
    data.status = body.status;
  }
  if (body.hireDate !== undefined) data.hireDate = date(body.hireDate, "Hire date");
  if (body.probationEndAt !== undefined) data.probationEndAt = date(body.probationEndAt, "Probation end");
  if (body.noticeGivenAt !== undefined) data.noticeGivenAt = date(body.noticeGivenAt, "Notice date");
  if (body.endDate !== undefined) data.endDate = date(body.endDate, "End date");
  if (body.terminationReason !== undefined) data.terminationReason = str(body.terminationReason, 500);
  if (body.workLocation !== undefined) {
    const loc = body.workLocation ? String(body.workLocation).slice(0, 60) : null;
    if (loc && !WORK_LOCATIONS.includes(loc) && loc.length > 60) throw err("Work location is too long");
    data.workLocation = loc;
  }
  if (body.costCenter !== undefined) data.costCenter = str(body.costCenter, 80);
  if (body.weeklyHours !== undefined) {
    if (body.weeklyHours == null || body.weeklyHours === "") data.weeklyHours = null;
    else {
      const h = Number(body.weeklyHours);
      if (!Number.isFinite(h) || h < 0 || h > 168) throw err("Weekly hours must be between 0 and 168");
      data.weeklyHours = h;
    }
  }
  if (body.dateOfBirth !== undefined) data.dateOfBirth = date(body.dateOfBirth, "Date of birth");
  if (body.emergencyName !== undefined) data.emergencyName = str(body.emergencyName, 160);
  if (body.emergencyPhone !== undefined) data.emergencyPhone = str(body.emergencyPhone, 40);
  if (body.emergencyRelation !== undefined) data.emergencyRelation = str(body.emergencyRelation, 60);
  if (body.bankName !== undefined) data.bankName = str(body.bankName, 120);
  if (body.notes !== undefined) data.notes = str(body.notes, 4000);

  const hire = data.hireDate, end = data.endDate;
  if (hire && end && end < hire) throw err("The end date can't be before the hire date");

  return data;
}

/** Encrypt a sensitive identifier into its three columns + a last-4 hint. */
function sealed(prefix, value) {
  if (value === undefined) return {};
  if (value === null || value === "") {
    return { [`${prefix}Cipher`]: null, [`${prefix}Iv`]: null, [`${prefix}Tag`]: null, [`${prefix}Last4`]: null };
  }
  const { ciphertext, iv, tag } = encryptSecret(String(value).trim());
  return {
    [`${prefix}Cipher`]: ciphertext, [`${prefix}Iv`]: iv, [`${prefix}Tag`]: tag,
    [`${prefix}Last4`]: last4(String(value).trim()),
  };
}

function sensitiveFields(body = {}) {
  return {
    ...sealed("taxId", body.taxId),
    ...sealed("nationalId", body.nationalId),
    ...sealed("bankAccount", body.bankAccount),
  };
}

/** Create or update someone's employment record. */
export async function upsertProfile(actorId, userId, body = {}) {
  const user = await prisma.user.findFirst({ where: { id: userId }, select: { id: true, firstName: true, lastName: true, email: true } });
  if (!user) throw err("Employee not found", 404);

  if (body.managerId !== undefined && body.managerId) {
    if (body.managerId === userId) throw err("Someone can't be their own manager");
    const manager = await prisma.user.findFirst({ where: { id: String(body.managerId) }, select: { id: true } });
    if (!manager) throw err("That manager doesn't exist in this organization", 404);
    // A cycle would make the org chart infinite; walk up and refuse one.
    if (await reportsTo(String(body.managerId), userId)) {
      throw err(`${nameOf(user)} already manages that person — this would create a reporting loop.`);
    }
  }

  const existing = await prisma.employmentProfile.findFirst({ where: { userId } });
  const data = validateProfile(body, { partial: !!existing });
  if (body.managerId !== undefined) data.managerId = body.managerId ? String(body.managerId) : null;
  Object.assign(data, sensitiveFields(body));

  const actor = await actorFor(actorId);

  if (!existing) {
    await prisma.employmentProfile.create({ data: { ...data, userId, status: data.status ?? "active" } });
    await recordEvent(userId, "hired", {
      detail: `Employment record created${data.hireDate ? ` · hired ${new Date(data.hireDate).toISOString().slice(0, 10)}` : ""}`,
      effectiveAt: data.hireDate ?? new Date(), actor,
    });
  } else {
    if (data.status && data.status !== existing.status) {
      await recordEvent(userId, "status", {
        detail: `Status changed`, fromValue: existing.status, toValue: data.status, actor,
      });
      if (data.status === "terminated") {
        await recordEvent(userId, "terminated", {
          detail: data.terminationReason || "Employment ended",
          effectiveAt: data.endDate ?? new Date(), actor,
        });
      }
    }
    const touched = Object.keys(data).filter((k) => !k.endsWith("Cipher") && !k.endsWith("Iv") && !k.endsWith("Tag") && !k.endsWith("Last4"));
    const sealedChanged = ["taxId", "nationalId", "bankAccount"].filter((p) => data[`${p}Cipher`] !== undefined);
    await prisma.employmentProfile.update({ where: { id: existing.id }, data });
    if (touched.length || sealedChanged.length) {
      await recordEvent(userId, "profile", {
        detail: `Updated: ${[...touched, ...sealedChanged.map((s) => `${s} (encrypted)`)].join(", ")}`, actor,
      });
    }
  }

  return getPerson(userId);
}

/** Does `candidate` report (directly or indirectly) to `manager`? */
async function reportsTo(candidateId, managerId, depth = 0) {
  if (depth > 20 || !candidateId) return false;
  const p = await prisma.employmentProfile.findFirst({ where: { userId: candidateId }, select: { managerId: true } });
  if (!p?.managerId) return false;
  if (p.managerId === managerId) return true;
  return reportsTo(p.managerId, managerId, depth + 1);
}

/**
 * Reveal one sensitive field. Separate, deliberate and audited: reading
 * someone's bank details is an act, not a side effect of opening their page.
 */
export async function revealSensitive(actorId, userId, field) {
  const allowed = { taxId: "taxId", nationalId: "nationalId", bankAccount: "bankAccount" };
  const prefix = allowed[field];
  if (!prefix) throw err(`"${field}" isn't a revealable field`);

  const p = await prisma.employmentProfile.findFirst({ where: { userId } });
  if (!p) throw err("Employee not found", 404);
  if (!p[`${prefix}Cipher`]) return { field, value: null };

  let value;
  try {
    value = decryptSecret({ ciphertext: p[`${prefix}Cipher`], iv: p[`${prefix}Iv`], tag: p[`${prefix}Tag`] });
  } catch {
    throw err("This value can't be decrypted — the encryption key has changed since it was stored.", 409);
  }

  const actor = await actorFor(actorId);
  await recordEvent(userId, "profile", { detail: `${field} was viewed`, actor });
  return { field, value };
}

// ── Compensation ─────────────────────────────────────────────────────────────
export async function listCompensation(userId) {
  const rows = await prisma.compensation.findMany({ where: { userId }, orderBy: { effectiveFrom: "desc" } });
  return rows.map(shapeCompensation);
}

export async function addCompensation(actorId, userId, body = {}) {
  const user = await prisma.user.findFirst({ where: { id: userId }, select: { id: true } });
  if (!user) throw err("Employee not found", 404);

  const effectiveFrom = date(body.effectiveFrom, "Effective date");
  if (!effectiveFrom) throw err("A compensation record needs an effective date");

  const payType = body.payType ?? "salary";
  if (!PAY_TYPES.some((t) => t.id === payType)) throw err('Pay type must be "salary" or "hourly"');

  const baseAmount = Number(body.baseAmount);
  if (!Number.isFinite(baseAmount) || baseAmount < 0) throw err("Enter the amount as a positive number");
  if (payType === "salary" && baseAmount > 100_000_000) throw err("That salary looks like a typo — check the amount");
  if (payType === "hourly" && baseAmount > 100_000) throw err("That hourly rate looks like a typo — check the amount");

  const freq = body.payFrequency ?? "monthly";
  if (!payFrequency(freq)) throw err(`Pay frequency must be one of: ${PAY_FREQUENCIES.map((f) => f.id).join(", ")}`);

  const currency = String(body.currency ?? "USD").toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) throw err("Currency must be a 3-letter code, like USD");

  // Two records on the same day are ambiguous — payroll couldn't say which one
  // applied, so make the caller correct the existing row instead.
  const clash = await prisma.compensation.findFirst({ where: { userId, effectiveFrom } });
  if (clash) throw err(`There's already a compensation record effective ${effectiveFrom.toISOString().slice(0, 10)}. Change that one, or pick a different date.`, 409);

  const previous = compensationAt(await prisma.compensation.findMany({ where: { userId } }), effectiveFrom);

  const created = await prisma.compensation.create({
    data: {
      userId, effectiveFrom, payType, baseAmount, currency, payFrequency: freq,
      hoursPerWeek: body.hoursPerWeek == null || body.hoursPerWeek === "" ? null : Number(body.hoursPerWeek),
      reason: str(body.reason, 80),
      note: str(body.note, 500),
      createdById: actorId,
    },
  });

  const actor = await actorFor(actorId);
  await recordEvent(userId, "compensation", {
    detail: body.reason ? `Compensation ${body.reason}` : "Compensation recorded",
    fromValue: previous ? `${previous.currency} ${previous.baseAmount} ${previous.payType}` : null,
    toValue: `${currency} ${baseAmount} ${payType}`,
    effectiveAt: effectiveFrom, actor,
  });

  return shapeCompensation(created);
}

/**
 * Correct a compensation record. Allowed, but only while no payslip has been
 * calculated against it — once someone has been paid on a figure, that figure
 * is part of the record and the fix is a new dated row, not a rewrite.
 */
export async function updateCompensation(actorId, id, body = {}) {
  const existing = await prisma.compensation.findFirst({ where: { id } });
  if (!existing) throw err("Compensation record not found", 404);

  const paid = await prisma.payslip.count({
    where: {
      userId: existing.userId,
      payRun: { status: { in: ["approved", "paid"] }, periodEnd: { gte: existing.effectiveFrom } },
    },
  });
  if (paid) {
    throw err("This figure has already been used in an approved pay run. Add a new dated record instead — payroll history can't be rewritten.", 409);
  }

  const data = {};
  if (body.baseAmount !== undefined) {
    const amount = Number(body.baseAmount);
    if (!Number.isFinite(amount) || amount < 0) throw err("Enter the amount as a positive number");
    data.baseAmount = amount;
  }
  if (body.effectiveFrom !== undefined) data.effectiveFrom = date(body.effectiveFrom, "Effective date");
  if (body.payType !== undefined) {
    if (!PAY_TYPES.some((t) => t.id === body.payType)) throw err('Pay type must be "salary" or "hourly"');
    data.payType = body.payType;
  }
  if (body.payFrequency !== undefined) {
    if (!payFrequency(body.payFrequency)) throw err("Unknown pay frequency");
    data.payFrequency = body.payFrequency;
  }
  if (body.currency !== undefined) {
    const cur = String(body.currency).toUpperCase();
    if (!/^[A-Z]{3}$/.test(cur)) throw err("Currency must be a 3-letter code, like USD");
    data.currency = cur;
  }
  if (body.reason !== undefined) data.reason = str(body.reason, 80);
  if (body.note !== undefined) data.note = str(body.note, 500);

  await prisma.compensation.update({ where: { id }, data });
  await recordEvent(existing.userId, "compensation", {
    detail: "Compensation record corrected", actor: await actorFor(actorId),
  });
  return shapeCompensation(await prisma.compensation.findFirst({ where: { id } }));
}

export async function deleteCompensation(actorId, id) {
  const existing = await prisma.compensation.findFirst({ where: { id } });
  if (!existing) throw err("Compensation record not found", 404);
  const paid = await prisma.payslip.count({
    where: {
      userId: existing.userId,
      payRun: { status: { in: ["approved", "paid"] }, periodEnd: { gte: existing.effectiveFrom } },
    },
  });
  if (paid) throw err("This figure has been used in an approved pay run and can't be deleted.", 409);
  await prisma.compensation.delete({ where: { id } });
  await recordEvent(existing.userId, "compensation", {
    detail: `Removed the record effective ${existing.effectiveFrom.toISOString().slice(0, 10)}`,
    actor: await actorFor(actorId),
  });
  return { deleted: true };
}

/** Free-text note on someone's timeline. */
export async function addNote(actorId, userId, note) {
  const text = String(note ?? "").trim();
  if (!text) throw err("Write something to add to the record");
  const user = await prisma.user.findFirst({ where: { id: userId }, select: { id: true } });
  if (!user) throw err("Employee not found", 404);
  await recordEvent(userId, "note", { detail: text.slice(0, 500), actor: await actorFor(actorId) });
  return getPerson(userId);
}

/** The signed-in person's own record — no salary of anyone else, no ids. */
export async function myProfile(userId) {
  const person = await getPerson(userId);
  return {
    userId: person.userId,
    name: person.name,
    email: person.email,
    jobTitle: person.jobTitle,
    department: person.department,
    employmentType: person.employmentType,
    employmentTypeLabel: person.employmentTypeLabel,
    status: person.status,
    statusLabel: person.statusLabel,
    hireDate: person.hireDate,
    workLocation: person.workLocation,
    managerName: person.managerName,
    weeklyHours: person.weeklyHours,
    emergencyName: person.emergencyName,
    emergencyPhone: person.emergencyPhone,
    emergencyRelation: person.emergencyRelation,
    bankName: person.bankName,
    bankAccountLast4: person.bankAccountLast4,
    compensation: person.compensation,
    directReports: person.directReports,
    needsOnboarding: person.needsOnboarding,
  };
}

/** What an employee may change about themselves: contact details only. */
export async function updateMyProfile(userId, body = {}) {
  const existing = await prisma.employmentProfile.findFirst({ where: { userId } });
  if (!existing) throw err("Your HR record hasn't been set up yet — ask an administrator.", 404);

  const data = {};
  if (body.emergencyName !== undefined) data.emergencyName = str(body.emergencyName, 160);
  if (body.emergencyPhone !== undefined) data.emergencyPhone = str(body.emergencyPhone, 40);
  if (body.emergencyRelation !== undefined) data.emergencyRelation = str(body.emergencyRelation, 60);
  if (body.bankName !== undefined) data.bankName = str(body.bankName, 120);
  if (body.bankAccount !== undefined) Object.assign(data, sealed("bankAccount", body.bankAccount));
  if (!Object.keys(data).length) throw err("Nothing to update");

  await prisma.employmentProfile.update({ where: { id: existing.id }, data });
  await recordEvent(userId, "profile", {
    detail: `Self-service update: ${Object.keys(data).filter((k) => !/Cipher|Iv|Tag|Last4/.test(k)).concat(data.bankAccountCipher !== undefined ? ["bank account"] : []).join(", ")}`,
    actor: await actorFor(userId),
  });
  return myProfile(userId);
}
