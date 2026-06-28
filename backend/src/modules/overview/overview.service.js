import prisma from "../../config/database.js";
import { accessFor, DEPT_LABELS } from "../access/access.policy.js";

const pct = (n, d) => (d > 0 ? Math.round((n / d) * 100) : 0);
const money = (n) => Math.round(n || 0);

function gaugeStatus(v) {
  if (v == null) return "No data";
  if (v >= 85) return "Excellent";
  if (v >= 70) return "Good";
  if (v >= 50) return "Fair";
  if (v > 0)   return "Needs attention";
  return "No data";
}

// ── Per-section live metrics (tenant-scoped) ──────────────────────────────────
async function crmMetrics(tenantId) {
  const [open, openAgg, wonAgg, total, clients] = await Promise.all([
    prisma.crmOpportunity.count({ where: { tenantId, status: "active" } }),
    prisma.crmOpportunity.aggregate({ where: { tenantId, status: "active" }, _sum: { value: true } }),
    prisma.crmOpportunity.aggregate({ where: { tenantId, status: "won" }, _sum: { value: true } }),
    prisma.crmOpportunity.count({ where: { tenantId } }),
    prisma.bizClient.count({ where: { tenantId, status: "active" } }),
  ]);
  const won = await prisma.crmOpportunity.count({ where: { tenantId, status: "won" } });
  return {
    openDeals: open,
    pipelineValue: money(openAgg._sum.value),
    wonValue: money(wonAgg._sum.value),
    clients,
    winRate: pct(won, total),
  };
}

async function marketingMetrics(tenantId) {
  const [active, audiences, agg] = await Promise.all([
    prisma.marketingCampaign.count({ where: { tenantId, status: { in: ["active", "running", "live"] } } }),
    prisma.marketingAudience.count({ where: { tenantId } }),
    prisma.marketingCampaign.aggregate({ where: { tenantId }, _sum: { conversions: true, leads: true, revenue: true } }),
  ]);
  const reachAgg = await prisma.marketingAudience.aggregate({ where: { tenantId }, _sum: { size: true } });
  return {
    activeCampaigns: active,
    audiences,
    conversions: agg._sum.conversions || 0,
    leads: agg._sum.leads || 0,
    reach: reachAgg._sum.size || 0,
    revenue: money(agg._sum.revenue),
  };
}

async function networkMetrics(tenantId) {
  const [devices, up, openAlerts, critical] = await Promise.all([
    prisma.networkDevice.count({ where: { tenantId } }),
    prisma.networkDevice.count({ where: { tenantId, status: "up" } }),
    prisma.networkAlert.count({ where: { tenantId, status: { not: "resolved" } } }),
    prisma.networkAlert.count({ where: { tenantId, status: { not: "resolved" }, severity: "critical" } }),
  ]);
  return { devices, devicesUp: up, uptimePct: pct(up, devices), openAlerts, criticalAlerts: critical };
}

async function servicesMetrics(tenantId) {
  const [income, expense, projects, doneTasks, totalTasks, sops] = await Promise.all([
    prisma.bizTransaction.aggregate({ where: { tenantId, type: "income" }, _sum: { amount: true } }),
    prisma.bizTransaction.aggregate({ where: { tenantId, type: "expense" }, _sum: { amount: true } }),
    prisma.bizProject.count({ where: { tenantId, status: { in: ["in_progress", "planning", "review"] } } }),
    prisma.bizTask.count({ where: { tenantId, status: "done" } }),
    prisma.bizTask.count({ where: { tenantId } }),
    prisma.bizSOP.count({ where: { tenantId, status: "active" } }),
  ]);
  const revenue = money(income._sum.amount), expenses = money(expense._sum.amount);
  return {
    revenue, expenses, netProfit: revenue - expenses,
    margin: revenue > 0 ? pct(revenue - expenses, revenue) : 0,
    activeProjects: projects,
    openTasks: totalTasks - doneTasks,
    completedTasks: doneTasks,
    taskCompletion: pct(doneTasks, totalTasks),
    sops,
  };
}

// ── Department dashboards (gauge + kpi band) ──────────────────────────────────
function buildKpis(deptKey, m) {
  const k = (key, label, value, unit = "", hint = "") => ({ key, label, value, unit, hint });
  switch (deptKey) {
    case "sales":
      return [
        k("openDeals", "Open Deals", m.crm.openDeals),
        k("pipeline", "Pipeline Value", m.crm.pipelineValue, "$"),
        k("clients", "Active Clients", m.crm.clients),
        k("winRate", "Win Rate", m.crm.winRate, "%"),
      ];
    case "marketing":
      return [
        k("campaigns", "Active Campaigns", m.marketing.activeCampaigns),
        k("audiences", "Audiences", m.marketing.audiences),
        k("reach", "Audience Reach", m.marketing.reach),
        k("conversions", "Conversions", m.marketing.conversions),
      ];
    case "it":
      return [
        k("devices", "Managed Devices", m.network.devices),
        k("uptime", "Uptime", m.network.uptimePct, "%"),
        k("alerts", "Open Alerts", m.network.openAlerts),
        k("critical", "Critical", m.network.criticalAlerts),
      ];
    case "finance":
      return [
        k("revenue", "Revenue", m.services.revenue, "$"),
        k("expenses", "Expenses", m.services.expenses, "$"),
        k("profit", "Net Profit", m.services.netProfit, "$"),
        k("margin", "Margin", m.services.margin, "%"),
      ];
    case "operations":
      return [
        k("projects", "Active Projects", m.services.activeProjects),
        k("openTasks", "Open Tasks", m.services.openTasks),
        k("uptime", "Network Uptime", m.network.uptimePct, "%"),
        k("sops", "Active SOPs", m.services.sops),
      ];
    default: // executive
      return [
        k("revenue", "Revenue", m.services?.revenue ?? 0, "$"),
        k("openDeals", "Open Deals", m.crm?.openDeals ?? 0),
        k("campaigns", "Active Campaigns", m.marketing?.activeCampaigns ?? 0),
        k("uptime", "Network Uptime", m.network?.uptimePct ?? 0, "%"),
        k("clients", "Active Clients", m.crm?.clients ?? 0),
        k("projects", "Active Projects", m.services?.activeProjects ?? 0),
      ];
  }
}

function buildGauge(deptKey, m) {
  let value = null, label = "Department Efficiency";
  switch (deptKey) {
    case "sales":      value = m.crm.winRate;            label = "Sales Efficiency"; break;
    case "marketing":  value = m.marketing.activeCampaigns > 0 ? Math.min(100, pct(m.marketing.conversions, Math.max(1, m.marketing.leads)) || m.marketing.activeCampaigns * 10) : 0; label = "Marketing Efficiency"; break;
    case "it":         value = m.network.uptimePct;       label = "Network Health"; break;
    case "finance":    value = m.services.margin;         label = "Financial Efficiency"; break;
    case "operations": value = m.services.taskCompletion; label = "Operational Efficiency"; break;
    default: {
      const parts = [m.crm?.winRate, m.network?.uptimePct, m.services?.taskCompletion, m.services?.margin].filter((x) => typeof x === "number");
      value = parts.length ? Math.round(parts.reduce((a, b) => a + b, 0) / parts.length) : 0;
      label = "Enterprise Efficiency";
    }
  }
  return { value, label, status: gaugeStatus(value) };
}

// ── Cross-cutting panels ──────────────────────────────────────────────────────
async function recentActivity(tenantId) {
  const logs = await prisma.auditLog.findMany({
    where: { tenantId },
    include: { user: { select: { firstName: true, lastName: true } } },
    orderBy: { createdAt: "desc" },
    take: 6,
  });
  return logs.map((l) => ({
    id: l.id,
    user: l.user ? `${l.user.firstName} ${l.user.lastName}`.trim() : "System",
    action: l.action,
    detail: l.detail ?? l.resource ?? null,
    time: l.createdAt,
  }));
}

async function upcomingSchedule(tenantId) {
  const now = new Date();
  const [events, followUps] = await Promise.all([
    prisma.marketingScheduleEvent.findMany({ where: { tenantId, start_time: { gte: now } }, orderBy: { start_time: "asc" }, take: 5 }),
    prisma.crmFollowUp.findMany({ where: { tenantId, status: "scheduled", scheduled_date: { gte: now } }, orderBy: { scheduled_date: "asc" }, take: 5 }),
  ]);
  const merged = [
    ...events.map((e) => ({ id: e.id, title: e.title, type: e.event_type, when: e.start_time })),
    ...followUps.map((f) => ({ id: f.id, title: `${f.follow_up_type} · ${f.customer_name}`, type: f.follow_up_type, when: f.scheduled_date })),
  ].sort((a, b) => new Date(a.when) - new Date(b.when));
  return merged.slice(0, 5);
}

async function taskWorkflow(tenantId) {
  const [tasks, counts] = await Promise.all([
    prisma.bizTask.findMany({ where: { tenantId }, orderBy: { updatedAt: "desc" }, take: 6 }),
    prisma.bizTask.groupBy({ by: ["status"], where: { tenantId }, _count: { _all: true } }),
  ]);
  const byStatus = { todo: 0, in_progress: 0, review: 0, done: 0 };
  counts.forEach((c) => { byStatus[c.status] = c._count._all; });
  return {
    byStatus,
    items: tasks.map((t) => ({ id: t.id, title: t.title, status: t.status, priority: t.priority, due: t.due_date })),
  };
}

async function deptMessages(tenantId, deptKey, privileged) {
  const where = privileged
    ? { tenantId }                                                           // execs/admins see all
    : { tenantId, OR: [{ toDept: null }, { toDept: deptKey }, { fromDept: deptKey }] };
  const rows = await prisma.deptMessage.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 8,
  });
  return rows.map((r) => ({
    id: r.id, authorName: r.authorName, fromDept: r.fromDept, toDept: r.toDept, body: r.body, time: r.createdAt,
  }));
}

// ── Public API ────────────────────────────────────────────────────────────────
export async function getDashboard(userId, tenantId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true },
  });
  const access = accessFor({ role: user?.role?.name, department: user?.department });

  // Only compute metrics for sections the user may access.
  const want = new Set(access.sections);
  const [crm, marketing, network, services] = await Promise.all([
    want.has("crm")       ? crmMetrics(tenantId)      : Promise.resolve(null),
    want.has("marketing") ? marketingMetrics(tenantId): Promise.resolve(null),
    want.has("network")   ? networkMetrics(tenantId)  : Promise.resolve(null),
    want.has("services")  ? servicesMetrics(tenantId) : Promise.resolve(null),
  ]);
  // Executive needs cross-section numbers even though sections cover all.
  const m = { crm, marketing, network, services };
  if (access.privileged) {
    if (!m.crm) m.crm = await crmMetrics(tenantId);
    if (!m.marketing) m.marketing = await marketingMetrics(tenantId);
    if (!m.network) m.network = await networkMetrics(tenantId);
    if (!m.services) m.services = await servicesMetrics(tenantId);
  }

  const [activity, schedule, tasks, messages] = await Promise.all([
    recentActivity(tenantId),
    upcomingSchedule(tenantId),
    taskWorkflow(tenantId),
    deptMessages(tenantId, access.dept, access.privileged),
  ]);

  return {
    identity: {
      name: `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() || user?.email,
      firstName: user?.firstName ?? null,
      email: user?.email ?? null,
      role: user?.role?.name ?? null,
      department: access.label,
      deptKey: access.dept,
      avatarUrl: user?.avatarUrl ?? null,
      employeeId: user?.employeeId ?? null,
    },
    access: { sections: access.sections, slices: access.slices, privileged: access.privileged, deptKey: access.dept, label: access.label },
    gauge: buildGauge(access.dept, m),
    kpis: buildKpis(access.dept, m),
    metrics: m,
    activity,
    schedule,
    tasks,
    messages,
  };
}

export async function postMessage(userId, tenantId, { body, toDept }) {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { role: true } });
  const access = accessFor({ role: user?.role?.name, department: user?.department });
  if (!body || !String(body).trim()) throw new Error("Message body is required");
  const msg = await prisma.deptMessage.create({
    data: {
      tenantId,
      authorId: userId,
      authorName: `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() || user?.email || "Unknown",
      fromDept: access.dept,
      toDept: toDept && toDept !== "all" ? toDept : null,
      body: String(body).trim(),
    },
  });
  return { id: msg.id, authorName: msg.authorName, fromDept: msg.fromDept, toDept: msg.toDept, body: msg.body, time: msg.createdAt };
}

export const DEPARTMENTS = DEPT_LABELS;
