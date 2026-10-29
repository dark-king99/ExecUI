import prisma from "../../config/database.js";
import { ConflictError, NotFoundError, ValidationError } from "../../lib/errors.js";
import { runUnscoped } from "../../lib/tenantContext.js";
import { provider } from "../billing/providers/index.js";
import { isRefundWindowOpen, refundDeadlineFrom } from "./refunds.policy.js";

const REQUEST_STATUSES = new Set([
  "submitted",
  "under_review",
  "needs_information",
  "approved",
  "declined",
  "refunded",
]);

function requestDto(record) {
  return {
    id: record.id,
    tenantId: record.tenantId,
    tenantName: record.tenant?.name ?? null,
    submittedBy: record.submittedBy
      ? `${record.submittedBy.firstName} ${record.submittedBy.lastName}`.trim()
      : null,
    submittedByEmail: record.submittedBy?.email ?? null,
    transactionId: record.transactionId,
    amount: record.amount,
    currency: record.currency,
    firstPaidAt: record.firstPaidAt,
    reason: record.reason,
    details: record.details,
    status: record.status,
    adminNote: record.adminNote,
    paddleRefundReference: record.paddleRefundReference,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

async function firstPaidTransaction(tenantId) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { providerCustomerId: true, providerSubscriptionId: true },
  });
  if (!tenant) throw new NotFoundError("Tenant not found");
  if (!tenant.providerCustomerId || !tenant.providerSubscriptionId) return null;

  const active = provider();
  if (active.id !== "paddle" || !active.findFirstPaidSubscriptionTransaction) return null;
  return active.findFirstPaidSubscriptionTransaction(tenantId, {
    customerId: tenant.providerCustomerId,
    subscriptionId: tenant.providerSubscriptionId,
  });
}

export async function getRefundCenter(tenantId, isSystemAdmin) {
  const active = provider();
  const [records, transaction] = await Promise.all([
    isSystemAdmin
      ? runUnscoped(() => prisma.refundRequest.findMany({
        include: {
          tenant: { select: { name: true } },
          submittedBy: { select: { firstName: true, lastName: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 200,
      }))
      : prisma.refundRequest.findMany({
        where: { tenantId },
        include: {
          tenant: { select: { name: true } },
          submittedBy: { select: { firstName: true, lastName: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    firstPaidTransaction(tenantId),
  ]);

  const deadline = refundDeadlineFrom(transaction?.paidAt);
  return {
    provider: active.id,
    providerConfigured: !!active.configured?.(),
    firstPaidTransaction: transaction,
    refundDeadlineAt: deadline,
    refundEligible: isRefundWindowOpen(transaction?.paidAt),
    requests: records.map(requestDto),
  };
}

export async function submitRefundRequest(tenantId, userId, { reason, details }) {
  const active = provider();
  if (active.id !== "paddle") {
    throw new ValidationError("Refund requests through this form are available for Paddle subscriptions only.");
  }
  if (!active.configured?.()) {
    throw Object.assign(new Error("Paddle billing is not configured. Please contact SUL TECH support."), { status: 503 });
  }

  const transaction = await firstPaidTransaction(tenantId);
  if (!transaction) {
    throw new ValidationError("There is no captured paid subscription charge to request a refund for yet.");
  }
  if (!isRefundWindowOpen(transaction.paidAt)) {
    throw new ValidationError("The 30-day refund request period for the first paid charge has ended.");
  }

  try {
    const record = await prisma.refundRequest.create({
      data: {
        tenantId,
        submittedById: userId,
        transactionId: transaction.transactionId,
        amount: transaction.amount,
        currency: transaction.currency,
        firstPaidAt: transaction.paidAt,
        reason,
        details,
      },
      include: {
        tenant: { select: { name: true } },
        submittedBy: { select: { firstName: true, lastName: true, email: true } },
      },
    });
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: "refund_request_submitted",
        resource: "refund_request",
        resourceId: record.id,
        detail: `Paddle transaction ${transaction.transactionId}`,
      },
    });
    return requestDto(record);
  } catch (error) {
    if (error.code === "P2002") {
      throw new ConflictError("A refund request has already been submitted for this first paid charge.");
    }
    throw error;
  }
}

export async function updateRefundRequest(requestId, userId, {
  status,
  adminNote,
  paddleRefundReference,
}) {
  if (!REQUEST_STATUSES.has(status)) throw new ValidationError("Invalid refund request status.");
  if (status === "refunded" && !paddleRefundReference?.trim()) {
    throw new ValidationError("Enter the Paddle refund reference after the refund has been issued in Paddle.");
  }

  const current = await runUnscoped(() => prisma.refundRequest.findUnique({
    where: { id: requestId },
    select: { id: true, tenantId: true },
  }));
  if (!current) throw new NotFoundError("Refund request not found");

  const updated = await runUnscoped(() => prisma.refundRequest.update({
    where: { id: requestId },
    data: {
      status,
      adminNote: adminNote?.trim() || null,
      paddleRefundReference: paddleRefundReference?.trim() || null,
      reviewedById: userId,
      resolvedAt: ["refunded", "declined"].includes(status) ? new Date() : null,
    },
    include: {
      tenant: { select: { name: true } },
      submittedBy: { select: { firstName: true, lastName: true, email: true } },
    },
  }));

  await runUnscoped(() => prisma.auditLog.create({
    data: {
      tenantId: current.tenantId,
      userId,
      action: "refund_request_updated",
      resource: "refund_request",
      resourceId: requestId,
      detail: `Status changed to ${status}`,
    },
  }));
  return requestDto(updated);
}
