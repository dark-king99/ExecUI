/**
 * Approvals — multi-step sign-off on a record.
 *
 * Approvers are resolved to concrete people when the request is raised, and
 * frozen onto the request. That matters: if someone changes department or a
 * role's membership next week, an in-flight approval still means what it meant
 * when it was requested, and the audit trail stays truthful.
 *
 * Steps run in order. A step clears once `requiredCount` of its approvers
 * approve; any single rejection ends the whole chain. Every decision is stored
 * with its author and comment, and a decision can never be cast twice by the
 * same person on the same step (enforced by a unique index).
 */
import prisma from "../../config/database.js";
import { runWithTenant } from "../../lib/tenantContext.js";
import { emitDomainEvent } from "../../lib/domainEvents.js";
import { notify, notifyMany } from "../notifications/notifications.service.js";
import { log } from "../../lib/logger.js";
import { resolveAudience, executeActions } from "../workflows/workflows.actions.js";

const err = (message, status = 400) => { const e = new Error(message); e.status = status; return e; };

const shape = (r, { decisions = [] } = {}) => ({
  id: r.id,
  title: r.title,
  summary: r.summary,
  resource: r.resource,
  recordId: r.recordId,
  recordLabel: r.recordLabel,
  status: r.status,
  currentStep: r.currentStep,
  steps: (r.steps || []).map((s, i) => ({
    name: s.name,
    requiredCount: s.requiredCount,
    approverIds: s.approverIds,
    approverNames: s.approverNames || [],
    status: s.status,
    index: i,
  })),
  workflowId: r.workflowId,
  requestedById: r.requestedById,
  decidedAt: r.decidedAt,
  createdAt: r.createdAt,
  decisions: decisions.map((d) => ({
    id: d.id, stepIndex: d.stepIndex, userId: d.userId, userName: d.userName,
    decision: d.decision, comment: d.comment, createdAt: d.createdAt,
  })),
});

const nameOf = (u) => `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email;

/**
 * Raise an approval request. `steps` are audience specs; they're resolved to
 * real approvers here and stored on the request.
 */
export async function createRequest({
  tenantId, title, summary = null, resource = null, recordId = null, recordLabel = null,
  steps = [], requestedById = null, workflowId = null, onApprove = [], ctx = {},
}) {
  if (!String(title || "").trim()) throw err("An approval needs a title");
  if (!Array.isArray(steps) || !steps.length) throw err("An approval needs at least one step");

  const run = (fn) => (tenantId ? runWithTenant({ tenantId }, fn) : fn());

  const resolved = await run(async () => {
    const out = [];
    for (const [i, step] of steps.entries()) {
      const ids = await resolveAudience(step.approvers, ctx);
      const people = ids.length
        ? await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, firstName: true, lastName: true, email: true } })
        : [];
      out.push({
        name: step.name || `Step ${i + 1}`,
        approvers: step.approvers,
        approverIds: people.map((p) => p.id),
        approverNames: people.map(nameOf),
        requiredCount: Math.max(1, Math.min(people.length || 1, Number(step.requiredCount) || 1)),
        status: i === 0 ? "pending" : "waiting",
      });
    }
    return out;
  });

  const unstaffed = resolved.filter((s) => !s.approverIds.length).map((s) => s.name);
  if (unstaffed.length === resolved.length) {
    throw err(`No one matches the approvers for: ${unstaffed.join(", ")}. Pick a role, department or person that exists.`);
  }

  const request = await run(async () =>
    prisma.approvalRequest.create({
      data: {
        title: String(title).slice(0, 200),
        summary, resource, recordId, recordLabel,
        steps: resolved, onApprove, workflowId, requestedById,
        status: "pending", currentStep: 0,
      },
    }),
  );

  await notifyStep(tenantId, request, 0);
  return shape(request);
}

async function notifyStep(tenantId, request, stepIndex) {
  const step = request.steps?.[stepIndex];
  if (!step?.approverIds?.length) return;
  try {
    await runWithTenant({ tenantId }, async () =>
      notifyMany(step.approverIds, {
        tenantId,
        type: "approval",
        title: `Approval needed: ${request.title}`,
        body: request.recordLabel ? `${step.name} — ${request.recordLabel}` : step.name,
        link: "/approvals",
        actorName: "Approvals",
      }),
    );
  } catch (e) {
    log.warn?.("approval_notify_failed", { requestId: request.id, error: e.message });
  }
}

// ── Reading ──────────────────────────────────────────────────────────────────
export async function listRequests({ status, mine, userId, limit = 100 } = {}) {
  const where = {};
  if (status) where.status = status;
  const rows = await prisma.approvalRequest.findMany({
    where, orderBy: { createdAt: "desc" },
    take: Math.min(200, Math.max(1, Number(limit) || 100)),
    include: { decisions: true },
  });
  const list = rows.map((r) => shape(r, { decisions: r.decisions }));
  if (!mine || !userId) return list;
  // "Awaiting me": pending, on a step I'm an approver for, and I haven't voted.
  return list.filter((r) =>
    r.status === "pending" &&
    r.steps[r.currentStep]?.approverIds?.includes(userId) &&
    !r.decisions.some((d) => d.stepIndex === r.currentStep && d.userId === userId),
  );
}

export async function getRequest(id) {
  const row = await prisma.approvalRequest.findFirst({ where: { id }, include: { decisions: true } });
  if (!row) throw err("Approval not found", 404);
  return shape(row, { decisions: row.decisions });
}

/** How many approvals are waiting on this user (drives the inbox badge). */
export async function pendingCountFor(userId) {
  const rows = await prisma.approvalRequest.findMany({
    where: { status: "pending" }, include: { decisions: true },
  });
  return rows.filter((r) =>
    r.steps?.[r.currentStep]?.approverIds?.includes(userId) &&
    !r.decisions.some((d) => d.stepIndex === r.currentStep && d.userId === userId),
  ).length;
}

// ── Deciding ─────────────────────────────────────────────────────────────────
/**
 * Record an approve/reject decision and advance (or end) the chain.
 * Authorization is explicit: the caller must be an approver on the *current*
 * step — being an approver on a later step confers nothing yet.
 */
export async function decide(userId, requestId, { decision, comment = null } = {}) {
  if (!["approve", "reject"].includes(decision)) throw err('Decision must be "approve" or "reject"');

  const request = await prisma.approvalRequest.findFirst({ where: { id: requestId }, include: { decisions: true } });
  if (!request) throw err("Approval not found", 404);
  if (request.status !== "pending") throw err(`This request is already ${request.status}.`, 409);

  const stepIndex = request.currentStep;
  const step = request.steps?.[stepIndex];
  if (!step) throw err("This request has no active step", 409);
  if (!step.approverIds?.includes(userId)) throw err("You're not an approver on the current step.", 403);
  if (request.decisions.some((d) => d.stepIndex === stepIndex && d.userId === userId)) {
    throw err("You've already recorded a decision on this step.", 409);
  }

  const user = await prisma.user.findFirst({ where: { id: userId }, select: { firstName: true, lastName: true, email: true } });
  await prisma.approvalDecision.create({
    data: {
      requestId, stepIndex, userId,
      userName: user ? nameOf(user) : null,
      decision, comment: comment ? String(comment).slice(0, 1000) : null,
    },
  });

  // ── Rejection ends the chain immediately ──
  if (decision === "reject") {
    const steps = [...request.steps];
    steps[stepIndex] = { ...step, status: "rejected" };
    const updated = await prisma.approvalRequest.update({
      where: { id: requestId },
      data: { status: "rejected", steps, decidedAt: new Date() },
      include: { decisions: true },
    });
    await notifyOutcome(request.tenantId, updated, "rejected", comment);
    return shape(updated, { decisions: updated.decisions });
  }

  // ── Approval: has this step cleared? ──
  const approvalsOnStep = request.decisions.filter((d) => d.stepIndex === stepIndex && d.decision === "approve").length + 1;
  const steps = [...request.steps];

  if (approvalsOnStep < step.requiredCount) {
    // Still waiting on more approvers for this step.
    const updated = await prisma.approvalRequest.update({
      where: { id: requestId }, data: { steps }, include: { decisions: true },
    });
    return shape(updated, { decisions: updated.decisions });
  }

  steps[stepIndex] = { ...step, status: "approved" };
  const isLast = stepIndex >= steps.length - 1;

  if (!isLast) {
    steps[stepIndex + 1] = { ...steps[stepIndex + 1], status: "pending" };
    const updated = await prisma.approvalRequest.update({
      where: { id: requestId },
      data: { steps, currentStep: stepIndex + 1 },
      include: { decisions: true },
    });
    await notifyStep(request.tenantId, updated, stepIndex + 1);
    return shape(updated, { decisions: updated.decisions });
  }

  // ── Fully approved ──
  const updated = await prisma.approvalRequest.update({
    where: { id: requestId },
    data: { status: "approved", steps, decidedAt: new Date() },
    include: { decisions: true },
  });

  // Whatever the workflow said to do on approval now runs.
  if (Array.isArray(updated.onApprove) && updated.onApprove.length) {
    const record = updated.recordId && updated.resource
      ? await loadRecord(updated.resource, updated.recordId)
      : {};
    const results = await executeActions(updated.onApprove, {
      tenantId: request.tenantId,
      resourceId: updated.resource,
      record: record || {},
      event: "approval.approved",
      userId: updated.requestedById,
    });
    log.info?.("approval_actions_ran", { requestId, results: results.length });
  }

  await notifyOutcome(request.tenantId, updated, "approved", comment);
  return shape(updated, { decisions: updated.decisions });
}

async function loadRecord(resourceId, recordId) {
  try {
    const { getResource } = await import("../api/api.resources.js");
    const resource = getResource(resourceId);
    if (!resource) return {};
    return (await prisma[resource.model].findFirst({ where: { id: recordId } })) || {};
  } catch {
    return {};
  }
}

/**
 * Announce an outcome on the domain-event bus so in-process modules can react to
 * their own approvals (the contract register moves to pending_signature this
 * way). Deliberately not a webhook resource: `resource` here is the *subject* of
 * the approval, and the webhook queue ignores events whose resource isn't a
 * public API resource, so nothing leaks outward from this.
 */
function announceOutcome(request, outcome) {
  emitDomainEvent({
    tenantId: request.tenantId,
    resource: "approvals",
    action: outcome,
    type: `approval.${outcome}`,
    record: {
      id: request.id,
      subjectResource: request.resource ?? null,
      subjectRecordId: request.recordId ?? null,
      title: request.title,
      requestedById: request.requestedById ?? null,
    },
  });
}

async function notifyOutcome(tenantId, request, outcome, comment) {
  announceOutcome(request, outcome);
  if (!request.requestedById) return;
  try {
    await runWithTenant({ tenantId }, async () =>
      notify({
        tenantId,
        userId: request.requestedById,
        type: "approval",
        title: `${request.title} was ${outcome}`,
        body: comment || null,
        link: "/approvals",
        actorName: "Approvals",
      }),
    );
  } catch (e) {
    log.warn?.("approval_outcome_notify_failed", { requestId: request.id, error: e.message });
  }
}

/** Withdraw a request (requester or an admin). */
export async function cancelRequest(userId, requestId, { isAdmin = false } = {}) {
  const request = await prisma.approvalRequest.findFirst({ where: { id: requestId } });
  if (!request) throw err("Approval not found", 404);
  if (request.status !== "pending") throw err(`This request is already ${request.status}.`, 409);
  if (request.requestedById !== userId && !isAdmin) throw err("Only the requester or an admin can cancel this.", 403);
  const updated = await prisma.approvalRequest.update({
    where: { id: requestId }, data: { status: "cancelled", decidedAt: new Date() }, include: { decisions: true },
  });
  return shape(updated, { decisions: updated.decisions });
}
