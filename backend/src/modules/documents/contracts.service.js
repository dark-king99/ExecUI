/**
 * Contract lifecycle management (CLM).
 *
 * A contract is the *business* object: counterparty, money, dates, obligations.
 * The document is the paper. Keeping them separate is what lets a contract move
 * through review and signature while the paper gets re-versioned underneath it.
 *
 * Two rules do most of the work here:
 *
 * 1. **Status only ever moves along a declared edge.** Every transition goes
 *    through the registry's map, so `draft → active` without signature is
 *    refused by construction rather than by reviewer vigilance.
 * 2. **Every move leaves a timeline entry.** "How did this become active, and
 *    who did it?" is the question a contract register exists to answer.
 *
 * Approval routing reuses the approvals engine, and activation on signature is
 * driven by the e-signature module's completion hook — no polling.
 */
import prisma from "../../config/database.js";
import { runWithTenant } from "../../lib/tenantContext.js";
import { onDomainEvent } from "../../lib/domainEvents.js";
import { log } from "../../lib/logger.js";
import { notify, notifyMany } from "../notifications/notifications.service.js";
import { sendEmail } from "../../lib/email.js";
import {
  CONTRACT_STATES, CONTRACT_STATUSES, CONTRACT_TYPES, LIVE_STATUSES,
  canTransition, transitionError, contractType, renewalStatus, RENEWAL_LABELS,
  addMonths, noticeDeadline, daysUntil, nextStates,
} from "./documents.registry.js";

const err = (message, status = 400) => { const e = new Error(message); e.status = status; return e; };

const str = (v, max) => (v == null || v === "" ? null : String(v).slice(0, max));
const date = (v, field) => {
  if (v == null || v === "") return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) throw err(`${field} isn't a valid date`);
  return d;
};

export const shapeEvent = (e) => ({
  id: e.id, type: e.type, detail: e.detail, fromStatus: e.fromStatus, toStatus: e.toStatus,
  actorId: e.actorId, actorName: e.actorName, createdAt: e.createdAt,
});

export function shape(c, { events, now = new Date() } = {}) {
  const renewal = renewalStatus(c, now);
  return {
    id: c.id,
    title: c.title,
    counterparty: c.counterparty,
    type: c.type,
    typeLabel: contractType(c.type)?.label ?? c.type,
    status: c.status,
    statusLabel: CONTRACT_STATES[c.status]?.label ?? c.status,
    statusTone: CONTRACT_STATES[c.status]?.tone ?? "slate",
    nextStates: nextStates(c.status),
    value: c.value,
    currency: c.currency,
    startDate: c.startDate,
    endDate: c.endDate,
    autoRenew: c.autoRenew,
    renewalTermMonths: c.renewalTermMonths,
    noticePeriodDays: c.noticePeriodDays,
    noticeDeadline: noticeDeadline(c),
    renewal: { ...renewal, label: RENEWAL_LABELS[renewal.state] ?? renewal.state },
    documentId: c.documentId,
    documentTitle: c.document?.title ?? null,
    approvalRequestId: c.approvalRequestId,
    signatureRequestId: c.signatureRequestId,
    signatureStatus: c.signature?.status ?? null,
    ownerId: c.ownerId,
    ownerName: c.ownerName,
    notes: c.notes,
    terminatedAt: c.terminatedAt,
    renewedFromId: c.renewedFromId,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    events: events ? events.map(shapeEvent) : undefined,
  };
}

const include = {
  document: { select: { title: true } },
  signature: { select: { status: true } },
};

async function timeline(contractId, type, { detail, fromStatus, toStatus, actor, tenantId } = {}) {
  try {
    await prisma.contractEvent.create({
      data: {
        ...(tenantId ? { tenantId } : {}),
        contractId, type,
        detail: str(detail, 500),
        fromStatus: fromStatus ?? null,
        toStatus: toStatus ?? null,
        actorId: actor?.userId ?? null,
        actorName: str(actor?.name, 160),
      },
    });
  } catch (e) {
    log.warn?.("contract_event_failed", { contractId, type, error: e.message });
  }
}

async function actorName(userId) {
  if (!userId) return null;
  const u = await prisma.user.findFirst({
    where: { id: userId }, select: { firstName: true, lastName: true, email: true },
  });
  return u ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email : null;
}

// ── Reading ──────────────────────────────────────────────────────────────────
export async function listContracts({ status, type, search, mine, userId, expiringDays, limit = 200 } = {}) {
  const where = {};
  if (status && status !== "all") {
    where.status = status === "live" ? { in: LIVE_STATUSES } : status;
  }
  if (type) where.type = type;
  if (mine && userId) where.ownerId = userId;
  if (expiringDays) {
    where.status = { in: LIVE_STATUSES };
    where.endDate = { lte: new Date(Date.now() + Number(expiringDays) * 86_400_000) };
  }
  if (search) {
    const q = String(search).slice(0, 120);
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { counterparty: { contains: q, mode: "insensitive" } },
    ];
  }

  const rows = await prisma.contract.findMany({
    where, orderBy: [{ endDate: "asc" }, { createdAt: "desc" }],
    take: Math.min(500, Math.max(1, Number(limit) || 200)),
    include,
  });
  return rows.map((c) => shape(c));
}

export async function getContract(id) {
  if (!id) throw err("Contract not found", 404);
  const row = await prisma.contract.findFirst({ where: { id }, include });
  if (!row) throw err("Contract not found", 404);
  const events = await prisma.contractEvent.findMany({
    where: { contractId: id }, orderBy: { createdAt: "desc" }, take: 200,
  });
  return shape(row, { events });
}

/** Portfolio summary for the console header. */
export async function portfolio() {
  const now = new Date();
  const [byStatus, live, expiring] = await Promise.all([
    prisma.contract.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.contract.findMany({
      where: { status: { in: LIVE_STATUSES } },
      select: { value: true, currency: true, endDate: true, noticePeriodDays: true, status: true, autoRenew: true },
    }),
    prisma.contract.count({
      where: { status: { in: LIVE_STATUSES }, endDate: { lte: new Date(now.getTime() + 90 * 86_400_000) } },
    }),
  ]);

  // Values are summed per currency — silently adding USD to EUR would be a lie.
  const valueByCurrency = {};
  let needingAttention = 0;
  for (const c of live) {
    valueByCurrency[c.currency] = (valueByCurrency[c.currency] ?? 0) + (c.value ?? 0);
    const r = renewalStatus(c, now);
    if (["overdue", "notice_passed", "due_soon", "notice_soon"].includes(r.state)) needingAttention++;
  }

  return {
    byStatus: Object.fromEntries(byStatus.map((r) => [r.status, r._count._all])),
    liveCount: live.length,
    valueByCurrency,
    expiringIn90Days: expiring,
    needingAttention,
    autoRenewing: live.filter((c) => c.autoRenew).length,
  };
}

// ── Writing ──────────────────────────────────────────────────────────────────
function validateFields(body = {}, { partial = false } = {}) {
  const data = {};

  if (body.title !== undefined || !partial) {
    const t = String(body.title ?? "").trim();
    if (!t) throw err("A contract needs a title");
    data.title = t.slice(0, 250);
  }
  if (body.counterparty !== undefined || !partial) {
    const cp = String(body.counterparty ?? "").trim();
    if (!cp) throw err("A contract needs a counterparty — who is it with?");
    data.counterparty = cp.slice(0, 200);
  }
  if (body.type !== undefined) {
    if (!contractType(body.type)) {
      throw err(`Unknown contract type "${body.type}". Pick one of: ${CONTRACT_TYPES.map((t) => t.id).join(", ")}`);
    }
    data.type = body.type;
  }
  if (body.value !== undefined) {
    const v = Number(body.value);
    if (!Number.isFinite(v) || v < 0) throw err("Value must be a positive number");
    data.value = v;
  }
  if (body.currency !== undefined) {
    const cur = String(body.currency ?? "").trim().toUpperCase();
    if (cur && !/^[A-Z]{3}$/.test(cur)) throw err("Currency must be a 3-letter code, like USD");
    data.currency = cur || "USD";
  }
  if (body.startDate !== undefined) data.startDate = date(body.startDate, "Start date");
  if (body.endDate !== undefined) data.endDate = date(body.endDate, "End date");
  if (body.autoRenew !== undefined) data.autoRenew = !!body.autoRenew;
  if (body.renewalTermMonths !== undefined) {
    if (body.renewalTermMonths == null || body.renewalTermMonths === "") data.renewalTermMonths = null;
    else {
      const m = Math.trunc(Number(body.renewalTermMonths));
      if (!Number.isFinite(m) || m < 1 || m > 120) throw err("Renewal term must be between 1 and 120 months");
      data.renewalTermMonths = m;
    }
  }
  if (body.noticePeriodDays !== undefined) {
    const d = Math.trunc(Number(body.noticePeriodDays));
    if (!Number.isFinite(d) || d < 0 || d > 730) throw err("Notice period must be between 0 and 730 days");
    data.noticePeriodDays = d;
  }
  if (body.notes !== undefined) data.notes = str(body.notes, 4000);
  if (body.documentId !== undefined) data.documentId = str(body.documentId, 64);

  const start = data.startDate, end = data.endDate;
  if (start && end && end < start) throw err("The end date can't be before the start date");

  return data;
}

export async function createContract(user, body = {}) {
  const data = validateFields(body);
  data.type = data.type ?? "other";
  data.currency = data.currency ?? "USD";
  data.createdById = user.userId;
  data.ownerId = body.ownerId ? String(body.ownerId) : user.userId;
  data.ownerName = await actorName(data.ownerId);

  if (data.documentId) {
    const doc = await prisma.document.findFirst({ where: { id: data.documentId }, select: { id: true } });
    if (!doc) throw err("That document doesn't exist", 404);
  }

  const created = await prisma.contract.create({ data, include });
  await timeline(created.id, "created", {
    detail: `${created.title} with ${created.counterparty}`,
    toStatus: created.status,
    actor: { userId: user.userId, name: await actorName(user.userId) },
  });
  return getContract(created.id);
}

export async function updateContract(user, id, body = {}) {
  const existing = await prisma.contract.findFirst({ where: { id } });
  if (!existing) throw err("Contract not found", 404);
  if (CONTRACT_STATES[existing.status]?.terminal) {
    throw err(`A ${CONTRACT_STATES[existing.status].label.toLowerCase()} contract is a closed record and can't be edited. Create a renewal or a new contract instead.`, 409);
  }

  const data = validateFields(body, { partial: true });
  // Cross-field check against what's already stored, not just what was sent.
  const start = data.startDate ?? existing.startDate;
  const end = data.endDate ?? existing.endDate;
  if (start && end && end < start) throw err("The end date can't be before the start date");

  if (body.ownerId !== undefined) {
    const owner = await prisma.user.findFirst({ where: { id: String(body.ownerId) }, select: { id: true } });
    if (!owner) throw err("That owner doesn't exist in this organization", 404);
    data.ownerId = owner.id;
    data.ownerName = await actorName(owner.id);
  }
  // Changing the dates re-arms the reminders — otherwise an extended contract
  // would stay silent because it had already been warned about once.
  if (data.endDate !== undefined) {
    data.renewalNotifiedAt = null;
    data.expiryNotifiedAt = null;
  }

  await prisma.contract.update({ where: { id }, data });
  const changed = Object.keys(data).filter((k) => !["renewalNotifiedAt", "expiryNotifiedAt", "ownerName"].includes(k));
  if (changed.length) {
    await timeline(id, "updated", {
      detail: `changed: ${changed.join(", ")}`,
      actor: { userId: user.userId, name: await actorName(user.userId) },
    });
  }
  return getContract(id);
}

/**
 * Move a contract along the lifecycle. The registry decides what's legal; this
 * adds the domain checks that need the database (you can't activate an unsigned
 * contract that has an outstanding envelope).
 */
export async function transition(user, id, to, { note } = {}) {
  const existing = await prisma.contract.findFirst({ where: { id }, include });
  if (!existing) throw err("Contract not found", 404);
  if (!CONTRACT_STATUSES.includes(to)) throw err(`"${to}" isn't a contract status.`);
  if (!canTransition(existing.status, to)) throw err(transitionError(existing.status, to), 409);

  if (to === "active" && existing.signatureRequestId) {
    const env = await prisma.signatureRequest.findFirst({
      where: { id: existing.signatureRequestId }, select: { status: true },
    });
    if (env && !["completed", "cancelled"].includes(env.status)) {
      throw err(`This contract is out for signature (${env.status}). Wait for the signatures, or cancel the envelope first.`, 409);
    }
  }

  const data = { status: to };
  if (to === "terminated") data.terminatedAt = new Date();
  if (to === "active" && !existing.startDate) data.startDate = new Date();

  await prisma.contract.update({ where: { id }, data });
  await timeline(id, "status", {
    detail: note ? String(note) : null,
    fromStatus: existing.status, toStatus: to,
    actor: { userId: user.userId, name: await actorName(user.userId) },
  });

  if (existing.ownerId && existing.ownerId !== user.userId) {
    try {
      await notify({
        tenantId: existing.tenantId, userId: existing.ownerId, type: "contract",
        title: `${existing.title} is now ${CONTRACT_STATES[to].label.toLowerCase()}`,
        body: note || null, link: "/contracts", actorName: "Contracts",
      });
    } catch { /* a notification failure must not undo a lifecycle move */ }
  }
  return getContract(id);
}

/** Free-text note on the timeline — the "why" that no status field captures. */
export async function addNote(user, id, note) {
  const text = String(note ?? "").trim();
  if (!text) throw err("Write something to add to the timeline");
  const existing = await prisma.contract.findFirst({ where: { id }, select: { id: true } });
  if (!existing) throw err("Contract not found", 404);
  await timeline(id, "note", { detail: text.slice(0, 500), actor: { userId: user.userId, name: await actorName(user.userId) } });
  return getContract(id);
}

export async function deleteContract(user, id) {
  const existing = await prisma.contract.findFirst({ where: { id } });
  if (!existing) throw err("Contract not found", 404);
  if (LIVE_STATUSES.includes(existing.status)) {
    throw err("An active contract can't be deleted — terminate it instead, so the register keeps the history.", 409);
  }
  if (existing.signatureRequestId) {
    throw err("This contract has a signature envelope against it. Cancel the envelope first.", 409);
  }
  await prisma.contract.delete({ where: { id } });
  return { deleted: true };
}

// ── Approval routing ─────────────────────────────────────────────────────────
/**
 * Send a contract for internal sign-off.
 *
 * The outcome comes back through the domain-event bus (see `startContractHooks`)
 * rather than through a workflow action, because a contract's status is
 * deliberately NOT writable through the generic record layer — the lifecycle map
 * is the only way it moves.
 */
export async function requestApproval(user, id, { steps, summary } = {}) {
  const contract = await prisma.contract.findFirst({ where: { id } });
  if (!contract) throw err("Contract not found", 404);
  if (!["draft", "in_review"].includes(contract.status)) {
    throw err(`Only a draft or in-review contract can be sent for approval (this one is ${contract.status}).`, 409);
  }
  if (contract.approvalRequestId) {
    const open = await prisma.approvalRequest.findFirst({
      where: { id: contract.approvalRequestId }, select: { status: true },
    });
    if (open?.status === "pending") throw err("This contract is already out for approval.", 409);
  }

  const { createRequest } = await import("../approvals/approvals.service.js");
  const request = await createRequest({
    tenantId: contract.tenantId,
    title: `Contract approval: ${contract.title}`,
    summary: summary
      ? String(summary).slice(0, 1000)
      : `${contract.counterparty} · ${contract.currency} ${Number(contract.value ?? 0).toLocaleString()}`,
    resource: "contracts",
    recordId: contract.id,
    recordLabel: `${contract.title} (${contract.counterparty})`,
    steps: Array.isArray(steps) && steps.length
      ? steps
      : [{ name: "Contract approval", approvers: { type: "admins" }, requiredCount: 1 }],
    requestedById: user.userId,
    ctx: { record: contract },
  });

  await prisma.contract.update({
    where: { id },
    data: { approvalRequestId: request.id, status: contract.status === "draft" ? "in_review" : contract.status },
  });
  await timeline(id, "approval", {
    detail: `sent for approval — ${request.steps.length} step(s)`,
    fromStatus: contract.status, toStatus: "in_review",
    actor: { userId: user.userId, name: await actorName(user.userId) },
  });
  return getContract(id);
}

// ── Signature routing ────────────────────────────────────────────────────────
/**
 * Send the contract's document out for signature and link the envelope. The
 * contract lands in pending_signature; completion activates it (see below).
 */
export async function sendForSignature(user, id, body = {}) {
  const contract = await prisma.contract.findFirst({ where: { id } });
  if (!contract) throw err("Contract not found", 404);
  if (CONTRACT_STATES[contract.status]?.terminal) throw err(`A ${contract.status} contract can't be sent for signature.`, 409);

  const documentId = body.documentId ?? contract.documentId;
  if (!documentId) throw err("Attach a document to this contract first — there's nothing to sign.");

  const { createRequest, sendRequest } = await import("./signatures.service.js");
  const envelope = await createRequest(user, {
    documentId,
    title: body.title || `Signature: ${contract.title}`,
    message: body.message,
    signers: body.signers,
    sequential: body.sequential,
    expiresInDays: body.expiresInDays,
  });
  const sent = await sendRequest(user, envelope.id);

  const data = { signatureRequestId: envelope.id, documentId };
  if (canTransition(contract.status, "pending_signature")) data.status = "pending_signature";
  await prisma.contract.update({ where: { id }, data });

  await timeline(id, "signature", {
    detail: `sent to ${sent.signers.map((s) => s.email).join(", ")}`,
    fromStatus: contract.status, toStatus: data.status ?? contract.status,
    actor: { userId: user.userId, name: await actorName(user.userId) },
  });

  return { contract: await getContract(id), envelope: sent };
}

/**
 * Called by the e-signature module when an envelope completes. Any contract
 * bound to that envelope activates — which is the whole point of tracking
 * signature state on the contract in the first place.
 */
export async function onSignatureCompleted(signatureRequestId) {
  const contracts = await prisma.contract.findMany({ where: { signatureRequestId } });
  for (const c of contracts) {
    if (!canTransition(c.status, "active")) continue;
    await prisma.contract.update({
      where: { id: c.id },
      data: { status: "active", startDate: c.startDate ?? new Date() },
    });
    await timeline(c.id, "signature", {
      detail: "all parties signed — contract activated",
      fromStatus: c.status, toStatus: "active",
      actor: { name: "E-signature" },
      tenantId: c.tenantId,
    });
    if (c.ownerId) {
      try {
        await notify({
          tenantId: c.tenantId, userId: c.ownerId, type: "contract",
          title: `${c.title} is now active`, body: "All parties have signed.",
          link: "/contracts", actorName: "Contracts",
        });
      } catch { /* best effort */ }
    }
  }
  return { activated: contracts.length };
}

// ── Approval outcome hook ────────────────────────────────────────────────────
/**
 * React to this module's own approvals. Approved ⇒ ready for signature;
 * rejected ⇒ back to the drawing board. Both go through `transition`, so the
 * lifecycle map and the timeline apply exactly as they would for a person.
 */
export async function onApprovalOutcome({ tenantId, record, action }) {
  if (record?.subjectResource !== "contracts" || !record?.subjectRecordId) return { handled: false };

  const to = action === "approved" ? "pending_signature" : action === "rejected" ? "draft" : null;
  if (!to) return { handled: false };

  return runWithTenant({ tenantId }, async () => {
    const contract = await prisma.contract.findFirst({ where: { id: record.subjectRecordId } });
    if (!contract || !canTransition(contract.status, to)) return { handled: false };

    await prisma.contract.update({ where: { id: contract.id }, data: { status: to } });
    await timeline(contract.id, "approval", {
      detail: action === "approved" ? "approved internally — ready for signature" : "approval was rejected",
      fromStatus: contract.status, toStatus: to,
      actor: { name: "Approvals" }, tenantId,
    });
    if (contract.ownerId) {
      try {
        await notify({
          tenantId, userId: contract.ownerId, type: "contract",
          title: action === "approved" ? `${contract.title} was approved` : `${contract.title} was rejected`,
          body: action === "approved" ? "It's ready to send for signature." : "Review the comments and revise it.",
          link: "/contracts", actorName: "Contracts",
        });
      } catch { /* best effort */ }
    }
    return { handled: true, status: to };
  });
}

let unsubscribe = null;
/** Subscribe to approval outcomes. Called once at boot. */
export function startContractHooks() {
  if (unsubscribe) return unsubscribe;
  unsubscribe = onDomainEvent((event) => {
    if (event?.resource !== "approvals") return;
    onApprovalOutcome(event).catch((e) => log.warn?.("contract_approval_hook_failed", { error: e.message }));
  });
  return unsubscribe;
}

export function stopContractHooks() {
  if (unsubscribe) unsubscribe();
  unsubscribe = null;
}

// ── Renewal ──────────────────────────────────────────────────────────────────
/**
 * Create the successor contract. The original is marked `renewed` rather than
 * edited — the register keeps both, which is what makes a contract history
 * auditable instead of a moving target.
 */
export async function renewContract(user, id, body = {}) {
  const source = await prisma.contract.findFirst({ where: { id } });
  if (!source) throw err("Contract not found", 404);
  if (!["active", "expired"].includes(source.status)) {
    throw err(`Only an active or expired contract can be renewed (this one is ${source.status}).`, 409);
  }

  const months = Number(body.termMonths) || source.renewalTermMonths || 12;
  if (months < 1 || months > 120) throw err("Renewal term must be between 1 and 120 months");

  const start = body.startDate ? date(body.startDate, "Start date") : (source.endDate ? new Date(source.endDate.getTime() + 86_400_000) : new Date());
  // A 12-month term starting 1 Aug 2027 ends 31 Jul 2028, not 1 Aug — the last
  // day of the term is the day before the anniversary. Getting this wrong would
  // overlap the new term with the old one by a day.
  const end = body.endDate ? date(body.endDate, "End date") : new Date(addMonths(start, months).getTime() - 86_400_000);
  if (end < start) throw err("The end date can't be before the start date");

  const renewal = await prisma.contract.create({
    data: {
      title: String(body.title ?? `${source.title} (renewal)`).slice(0, 250),
      counterparty: source.counterparty,
      type: source.type,
      status: "draft",
      value: body.value !== undefined ? Number(body.value) || 0 : source.value,
      currency: source.currency,
      startDate: start,
      endDate: end,
      autoRenew: body.autoRenew !== undefined ? !!body.autoRenew : source.autoRenew,
      renewalTermMonths: months,
      noticePeriodDays: source.noticePeriodDays,
      documentId: body.documentId ?? source.documentId,
      ownerId: source.ownerId,
      ownerName: source.ownerName,
      notes: source.notes,
      renewedFromId: source.id,
      createdById: user.userId,
    },
  });

  const actor = { userId: user.userId, name: await actorName(user.userId) };
  await timeline(renewal.id, "renewal", {
    detail: `renews ${source.title} · ${months} month term`, toStatus: "draft", actor,
  });

  if (canTransition(source.status, "renewed")) {
    await prisma.contract.update({ where: { id: source.id }, data: { status: "renewed" } });
    await timeline(source.id, "renewal", {
      detail: `superseded by renewal ${renewal.id}`, fromStatus: source.status, toStatus: "renewed", actor,
    });
  }

  return { renewal: await getContract(renewal.id), source: await getContract(source.id) };
}

// ── Reminders (called by the scheduler) ──────────────────────────────────────
/**
 * Warn owners about contracts approaching their notice deadline or end date,
 * and expire the ones that have run out.
 *
 * Reminders are stamped (`renewalNotifiedAt` / `expiryNotifiedAt`) so a daily
 * ticker nags once, not every day — the fastest way to make people ignore a
 * renewal alert is to send it thirty times.
 */
export async function runContractReminders({ now = new Date(), horizonDays = 30 } = {}) {
  const summary = { reminded: 0, expired: 0, autoRenewed: 0 };

  const live = await prisma.contract.findMany({
    where: { status: { in: LIVE_STATUSES }, endDate: { not: null } },
  });

  for (const c of live) {
    const r = renewalStatus(c, now);

    // ── Past the end date ──
    if (r.state === "overdue") {
      if (c.autoRenew && c.renewalTermMonths) {
        // Auto-renew means the term rolls forward; the contract stays the same
        // agreement, so this extends dates rather than creating a successor.
        const start = c.endDate;
        const end = addMonths(start, c.renewalTermMonths);
        await prisma.contract.update({
          where: { id: c.id },
          data: { startDate: c.startDate ?? start, endDate: end, renewalNotifiedAt: null, expiryNotifiedAt: null },
        });
        await timeline(c.id, "renewal", {
          detail: `auto-renewed for ${c.renewalTermMonths} months (now ends ${end.toISOString().slice(0, 10)})`,
          actor: { name: "Contract scheduler" }, tenantId: c.tenantId,
        });
        summary.autoRenewed++;
        await alert(c, `${c.title} auto-renewed`, `The term rolled forward to ${end.toISOString().slice(0, 10)}.`);
        continue;
      }
      if (canTransition(c.status, "expired")) {
        await prisma.contract.update({ where: { id: c.id }, data: { status: "expired" } });
        await timeline(c.id, "status", {
          detail: "reached its end date without renewal",
          fromStatus: c.status, toStatus: "expired",
          actor: { name: "Contract scheduler" }, tenantId: c.tenantId,
        });
        summary.expired++;
        await alert(c, `${c.title} has expired`, `It reached its end date (${new Date(c.endDate).toISOString().slice(0, 10)}) without being renewed.`);
      }
      continue;
    }

    // ── Approaching notice deadline / end date ──
    const notice = noticeDeadline(c);
    const noticeDays = notice ? daysUntil(notice, now) : null;
    const endDays = daysUntil(c.endDate, now);

    const noticeDue = noticeDays != null && noticeDays <= horizonDays && !c.renewalNotifiedAt;
    const endDue = endDays <= horizonDays && !c.expiryNotifiedAt;
    if (!noticeDue && !endDue) continue;

    const lines = [
      `Contract: ${c.title}`,
      `Counterparty: ${c.counterparty}`,
      `Ends: ${new Date(c.endDate).toISOString().slice(0, 10)} (${endDays} day${endDays === 1 ? "" : "s"})`,
      notice ? `Notice deadline: ${notice.toISOString().slice(0, 10)}${noticeDays != null ? ` (${noticeDays} day${noticeDays === 1 ? "" : "s"})` : ""}` : null,
      c.autoRenew
        ? `This contract auto-renews${c.renewalTermMonths ? ` for ${c.renewalTermMonths} months` : ""} — give notice before the deadline if you don't want that.`
        : "This contract does not auto-renew — renew it if you want it to continue.",
    ].filter(Boolean);

    await prisma.contract.update({
      where: { id: c.id },
      data: {
        ...(noticeDue ? { renewalNotifiedAt: now } : {}),
        ...(endDue ? { expiryNotifiedAt: now } : {}),
      },
    });
    await timeline(c.id, "reminder", {
      detail: noticeDue ? `notice deadline in ${noticeDays} days` : `ends in ${endDays} days`,
      actor: { name: "Contract scheduler" }, tenantId: c.tenantId,
    });
    summary.reminded++;
    await alert(c, `Contract renewal: ${c.title}`, lines.join("\n"));
  }

  return summary;
}

/** Notify the owner in-app, and email them when a provider is configured. */
async function alert(contract, title, body) {
  await runWithTenant({ tenantId: contract.tenantId }, async () => {
    try {
      if (contract.ownerId) {
        await notify({
          tenantId: contract.tenantId, userId: contract.ownerId, type: "contract",
          title, body, link: "/contracts", actorName: "Contracts",
        });
      } else {
        // No owner: tell the admins rather than letting it fall on the floor.
        const admins = await prisma.user.findMany({
          where: { isActive: true, role: { name: { in: ["enterprise_admin", "system_admin"] } } },
          select: { id: true },
        });
        if (admins.length) {
          await notifyMany(admins.map((a) => a.id), {
            tenantId: contract.tenantId, type: "contract", title, body,
            link: "/contracts", actorName: "Contracts",
          });
        }
      }
    } catch (e) {
      log.warn?.("contract_alert_failed", { contractId: contract.id, error: e.message });
    }

    try {
      const owner = contract.ownerId
        ? await prisma.user.findFirst({ where: { id: contract.ownerId }, select: { email: true } })
        : null;
      if (owner?.email) {
        await sendEmail({
          tenantId: contract.tenantId, to: owner.email, subject: title,
          text: `${body}\n\nOpen the contract register to act on this.`,
          context: "contract_reminder", userId: contract.ownerId,
        });
      }
    } catch { /* email is best effort; the in-app notification already landed */ }
  });
}
