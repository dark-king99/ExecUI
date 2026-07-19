/**
 * CRM Dashboard Service
 * Provides real, tenant-scoped data for the CRM stream dashboard.
 */
import prisma from "../../config/database.js";

// ── Helpers ───────────────────────────────────────────────────────────────────
const todayStart = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};
const todayEnd = () => {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
};

// ── Profile ───────────────────────────────────────────────────────────────────
export async function getDashboardProfile(userId, tenantId) {
  const user = await prisma.user.findFirst({
    where: { id: userId, tenantId },
    include: { role: true },
  });
  if (!user) throw new Error("User not found");
  return {
    id: user.id,
    name: `${user.firstName} ${user.lastName}`,
    email: user.email,
    role: user.role.name,
    department: user.department ?? "CRM",
    avatar_url: user.avatarUrl ?? null,
  };
}

// ── Overview ──────────────────────────────────────────────────────────────────
export async function getDashboardOverview(userId, tenantId) {
  const [
    tasksPending,
    ticketsOpen,
    ticketsAtRisk,
    ticketsBreached,
    followUpsToday,
    oppsAgg,
  ] = await Promise.all([
    prisma.crmTask.count({ where: { tenantId, userId, status: "pending" } }),
    prisma.crmTicket.count({ where: { tenantId, status: "open" } }),
    prisma.crmTicket.count({ where: { tenantId, sla_status: "at_risk" } }),
    prisma.crmTicket.count({ where: { tenantId, sla_status: "breached" } }),
    prisma.crmFollowUp.count({
      where: {
        tenantId,
        userId,
        status: "scheduled",
        scheduled_date: { gte: todayStart(), lte: todayEnd() },
      },
    }),
    prisma.crmOpportunity.aggregate({
      where: { tenantId, status: "active" },
      _sum: { value: true },
      _count: { id: true },
    }),
  ]);

  return {
    tasks: { pending: tasksPending },
    tickets: {
      open: ticketsOpen,
      at_risk: ticketsAtRisk,
      breached: ticketsBreached,
    },
    follow_ups_today: followUpsToday,
    opportunities: {
      total: oppsAgg._count.id,
      pipeline_value: oppsAgg._sum.value ?? 0,
    },
  };
}

// ── Tasks ─────────────────────────────────────────────────────────────────────
export async function listDashboardTasks(userId, tenantId, filters = {}) {
  const where = { userId, tenantId };
  if (filters.status) where.status = filters.status;
  return prisma.crmTask.findMany({
    where,
    orderBy: [{ due_date: "asc" }, { priority: "desc" }],
  });
}

export async function createDashboardTask(userId, tenantId, data) {
  return prisma.crmTask.create({
    data: {
      title: data.title,
      task_type: data.task_type ?? "call",
      status: data.status ?? "pending",
      priority: data.priority ?? "medium",
      due_date: data.due_date ? new Date(data.due_date) : null,
      relatedCustomerName: data.relatedCustomerName ?? null,
      userId,
      tenantId,
    },
  });
}

export async function updateDashboardTask(tenantId, id, data) {
  return prisma.crmTask.update({
    where: { id },
    data: {
      ...(data.status !== undefined && { status: data.status }),
      ...(data.priority !== undefined && { priority: data.priority }),
      ...(data.title !== undefined && { title: data.title }),
    },
  });
}

// ── Tickets ───────────────────────────────────────────────────────────────────
export async function listDashboardTickets(tenantId, filters = {}) {
  const where = { tenantId };
  if (filters.status) where.status = filters.status;
  if (filters.priority) where.priority = filters.priority;
  return prisma.crmTicket.findMany({
    where,
    orderBy: [{ sla_status: "asc" }, { createdAt: "desc" }],
  });
}

export async function createDashboardTicket(tenantId, data) {
  // Auto-generate ticket number in format TKT-YYYYMMDD-XXXX
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(1000 + Math.random() * 9000);
  const ticket_number = `TKT-${dateStr}-${rand}`;

  return prisma.crmTicket.create({
    data: {
      ticket_number,
      subject: data.subject,
      customer_name: data.customer_name,
      category: data.category ?? "general",
      priority: data.priority ?? "medium",
      status: "open",
      sla_status: "on_track",
      tenantId,
    },
  });
}

export async function updateDashboardTicket(tenantId, id, data) {
  return prisma.crmTicket.update({
    where: { id },
    data: {
      ...(data.status !== undefined && { status: data.status }),
      ...(data.sla_status !== undefined && { sla_status: data.sla_status }),
      ...(data.priority !== undefined && { priority: data.priority }),
    },
  });
}

// ── Follow-ups ────────────────────────────────────────────────────────────────
export async function listDashboardFollowUps(userId, tenantId, filters = {}) {
  const where = { userId, tenantId };
  if (filters.status) where.status = filters.status;
  return prisma.crmFollowUp.findMany({
    where,
    orderBy: { scheduled_date: "asc" },
  });
}

export async function createDashboardFollowUp(userId, tenantId, data) {
  return prisma.crmFollowUp.create({
    data: {
      customer_name: data.customer_name,
      follow_up_type: data.follow_up_type ?? "call",
      status: "scheduled",
      scheduled_date: new Date(data.scheduled_date),
      notes: data.notes ?? null,
      userId,
      tenantId,
    },
  });
}

// ── Opportunities ─────────────────────────────────────────────────────────────
export async function listDashboardOpportunities(tenantId, filters = {}) {
  const where = { tenantId };
  if (filters.status) where.status = filters.status;
  else where.status = "active";
  return prisma.crmOpportunity.findMany({
    where,
    orderBy: [{ value: "desc" }],
    include: { owner: { select: { firstName: true, lastName: true, email: true } } },
  });
}

export async function createDashboardOpportunity(userId, tenantId, data) {
  return prisma.crmOpportunity.create({
    data: {
      name: data.name,
      value: data.value ?? 0,
      stage: data.stage ?? "prospecting",
      probability: data.probability ?? 0,
      status: "active",
      ownerId: userId,
      tenantId,
    },
  });
}

export async function updateDashboardOpportunity(tenantId, id, data) {
  return prisma.crmOpportunity.update({
    where: { id },
    data: {
      ...(data.stage !== undefined && { stage: data.stage }),
      ...(data.value !== undefined && { value: data.value }),
      ...(data.probability !== undefined && { probability: data.probability }),
      ...(data.status !== undefined && { status: data.status }),
    },
  });
}

// ── Service Usage ─────────────────────────────────────────────────────────────
export async function listRecentServices(userId, tenantId, limit = 4) {
  return prisma.crmServiceUsage.findMany({
    where: { userId, tenantId },
    orderBy: { lastUsedAt: "desc" },
    take: limit,
  });
}

export async function trackService(userId, tenantId, data) {
  const { service_name, service_title, service_description, service_icon } = data;
  if (!service_name || !service_title) throw new Error("service_name and service_title are required");

  return prisma.crmServiceUsage.upsert({
    where: { service_name_userId_tenantId: { service_name, userId, tenantId } },
    update: {
      usage_count: { increment: 1 },
      lastUsedAt: new Date(),
      service_title,
      service_description: service_description ?? null,
      service_icon: service_icon ?? null,
    },
    create: {
      service_name,
      service_title,
      service_description: service_description ?? null,
      service_icon: service_icon ?? null,
      usage_count: 1,
      userId,
      tenantId,
    },
  });
}
