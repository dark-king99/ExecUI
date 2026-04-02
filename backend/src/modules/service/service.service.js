import prisma from "../../config/database.js";

// ── Dashboard Overview ────────────────────────────────────────────────────────

export async function getDashboardOverview(tenantId) {
  const [
    totalRequests,
    pendingApprovals,
    openTickets,
    resolvedRequests,
    requestsThisMonth,
  ] = await Promise.all([
    prisma.serviceRequest.count({ where: { tenantId } }),
    prisma.serviceApproval.count({ where: { tenantId, status: "pending" } }),
    prisma.serviceRequest.count({ where: { tenantId, status: { notIn: ["resolved", "rejected"] } } }),
    prisma.serviceRequest.count({ where: { tenantId, status: "resolved" } }),
    prisma.serviceRequest.count({
      where: {
        tenantId,
        createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      },
    }),
  ]);

  const slaCompliance = totalRequests > 0
    ? Math.round((resolvedRequests / totalRequests) * 100)
    : 100;

  return {
    kpis: {
      total_requests: totalRequests,
      pending_approvals: pendingApprovals,
      sla_compliance: slaCompliance,
      open_tickets: openTickets,
    },
    stats: {
      requests_this_month: requestsThisMonth,
      avg_resolution_days: null,
    },
  };
}

// ── Catalog ───────────────────────────────────────────────────────────────────

export async function listCatalogItems(tenantId, query = {}) {
  const { category, status, search, take = 50, skip = 0 } = query;
  return prisma.serviceCatalogItem.findMany({
    where: {
      tenantId,
      ...(category ? { category } : {}),
      ...(status   ? { status }   : {}),
      ...(search   ? {
        OR: [
          { name:        { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ],
      } : {}),
    },
    orderBy: { name: "asc" },
    take: Number(take),
    skip: Number(skip),
  });
}

export async function createCatalogItem(tenantId, data) {
  return prisma.serviceCatalogItem.create({
    data: { ...data, tenantId },
  });
}

// ── Requests ──────────────────────────────────────────────────────────────────

export async function listRequests(tenantId, query = {}) {
  const { status, priority, category, take = 50, skip = 0 } = query;
  return prisma.serviceRequest.findMany({
    where: {
      tenantId,
      ...(status   ? { status }   : {}),
      ...(priority ? { priority } : {}),
      ...(category ? { category } : {}),
    },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: Number(take),
    skip: Number(skip),
  });
}

export async function createRequest(tenantId, userId, data) {
  const request = await prisma.serviceRequest.create({
    data: { ...data, tenantId, userId },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });

  // Auto-create a pending approval record
  await prisma.serviceApproval.create({
    data: {
      requestId:  request.id,
      approverId: userId, // default approver = requester until assigned
      tenantId,
      status: "pending",
    },
  });

  return request;
}

export async function getRequest(tenantId, id) {
  return prisma.serviceRequest.findFirstOrThrow({
    where: { id, tenantId },
    include: {
      user:      { select: { id: true, firstName: true, lastName: true, email: true } },
      approvals: true,
    },
  });
}

export async function updateRequestStatus(tenantId, id, status) {
  await prisma.serviceRequest.findFirstOrThrow({ where: { id, tenantId } });
  return prisma.serviceRequest.update({ where: { id }, data: { status } });
}

// ── Approvals ─────────────────────────────────────────────────────────────────

export async function listPendingApprovals(tenantId) {
  return prisma.serviceApproval.findMany({
    where: { tenantId, status: "pending" },
    include: {
      request: {
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function approveRequest(tenantId, approvalId, approverId, notes) {
  await prisma.serviceApproval.findFirstOrThrow({ where: { id: approvalId, tenantId } });
  const approval = await prisma.serviceApproval.update({
    where: { id: approvalId },
    data: { status: "approved", approverId, notes },
  });
  await prisma.serviceRequest.update({
    where: { id: approval.requestId },
    data: { status: "approved" },
  });
  return approval;
}

export async function rejectRequest(tenantId, approvalId, approverId, notes) {
  await prisma.serviceApproval.findFirstOrThrow({ where: { id: approvalId, tenantId } });
  const approval = await prisma.serviceApproval.update({
    where: { id: approvalId },
    data: { status: "rejected", approverId, notes },
  });
  await prisma.serviceRequest.update({
    where: { id: approval.requestId },
    data: { status: "rejected" },
  });
  return approval;
}

// ── Knowledge Base ────────────────────────────────────────────────────────────

export async function listKBArticles(tenantId, query = {}) {
  const { category, search, take = 50, skip = 0 } = query;
  return prisma.serviceKBArticle.findMany({
    where: {
      tenantId,
      ...(category ? { category } : {}),
      ...(search   ? {
        OR: [
          { title:   { contains: search, mode: "insensitive" } },
          { summary: { contains: search, mode: "insensitive" } },
        ],
      } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: Number(take),
    skip: Number(skip),
  });
}

export async function createKBArticle(tenantId, data) {
  return prisma.serviceKBArticle.create({ data: { ...data, tenantId } });
}

// ── Reports ───────────────────────────────────────────────────────────────────

export async function getReportsSummary(tenantId) {
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const [total, thisMonth, resolved, byStatus, byPriority] = await Promise.all([
    prisma.serviceRequest.count({ where: { tenantId } }),
    prisma.serviceRequest.count({ where: { tenantId, createdAt: { gte: monthStart } } }),
    prisma.serviceRequest.count({ where: { tenantId, status: "resolved" } }),
    prisma.serviceRequest.groupBy({ by: ["status"],   where: { tenantId }, _count: { id: true } }),
    prisma.serviceRequest.groupBy({ by: ["priority"], where: { tenantId }, _count: { id: true } }),
  ]);

  const slaCompliance = total > 0 ? Math.round((resolved / total) * 100) : 100;

  const requestsByStatus   = Object.fromEntries(byStatus.map((r)   => [r.status,   r._count.id]));
  const requestsByPriority = Object.fromEntries(byPriority.map((r) => [r.priority, r._count.id]));

  return {
    total_requests_this_month: thisMonth,
    avg_resolution_hours: 0,
    sla_compliance_pct: slaCompliance,
    resolved_this_month: resolved,
    requests_by_status: requestsByStatus,
    requests_by_priority: requestsByPriority,
    top_services: [],
  };
}

// ── SLA (stub — real SLA tracking would require a dedicated model) ─────────────

export async function getSLAStats(tenantId) {
  const [total, resolved, pending] = await Promise.all([
    prisma.serviceRequest.count({ where: { tenantId } }),
    prisma.serviceRequest.count({ where: { tenantId, status: "resolved" } }),
    prisma.serviceRequest.count({ where: { tenantId, status: "pending" } }),
  ]);

  const compliance = total > 0 ? Math.round((resolved / total) * 100) : 100;
  const atRisk = Math.round(pending * 0.3);
  const breached = Math.round(pending * 0.1);
  const onTrack = pending - atRisk - breached;

  return {
    compliance_pct: compliance,
    on_track: Math.max(0, onTrack),
    at_risk: atRisk,
    breached: breached,
    policies: [],
  };
}

// ── Settings (stub — stored in-memory/config, not DB-backed) ──────────────────

const settingsCache = new Map();

export async function getSettings(tenantId) {
  return settingsCache.get(tenantId) ?? {
    notifications: {
      email_on_request: true,
      email_on_approval: true,
      email_on_rejection: true,
      email_on_resolution: false,
    },
    sla_defaults: {
      response_hours: 4,
      resolution_hours: 24,
    },
    categories: ["general", "it", "hr", "finance", "facilities"],
  };
}

export async function updateSettings(tenantId, data) {
  settingsCache.set(tenantId, data);
  return data;
}
