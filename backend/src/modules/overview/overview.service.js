import prisma from "../../config/database.js";
import { accessFor, DEPT_LABELS, SECTIONS } from "../access/access.policy.js";
import * as messaging from "../messaging/messaging.service.js";

const pct = (n, d) => (d > 0 ? Math.round((n / d) * 100) : 0);
const money = (n) => Math.round(n || 0);

// Zero-filled section shapes — used whenever a metric query fails or a section
// isn't computed, so the dashboard degrades gracefully instead of erroring.
const DEFAULT_METRICS = {
  crm:       { openDeals: 0, pipelineValue: 0, wonValue: 0, clients: 0, winRate: 0 },
  marketing: { activeCampaigns: 0, audiences: 0, conversions: 0, leads: 0, reach: 0, revenue: 0 },
  network:   { devices: 0, devicesUp: 0, uptimePct: 0, openAlerts: 0, criticalAlerts: 0 },
  services:  { revenue: 0, expenses: 0, netProfit: 0, margin: 0, activeProjects: 0, openTasks: 0, completedTasks: 0, taskCompletion: 0, sops: 0 },
};

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
        k("openDeals", "Open Deals", (m.crm?.openDeals ?? 0)),
        k("pipeline", "Pipeline Value", (m.crm?.pipelineValue ?? 0), "$"),
        k("clients", "Active Clients", (m.crm?.clients ?? 0)),
        k("winRate", "Win Rate", (m.crm?.winRate ?? 0), "%"),
      ];
    case "marketing":
      return [
        k("campaigns", "Active Campaigns", (m.marketing?.activeCampaigns ?? 0)),
        k("audiences", "Audiences", (m.marketing?.audiences ?? 0)),
        k("reach", "Audience Reach", (m.marketing?.reach ?? 0)),
        k("conversions", "Conversions", (m.marketing?.conversions ?? 0)),
      ];
    case "it":
      return [
        k("devices", "Managed Devices", (m.network?.devices ?? 0)),
        k("uptime", "Uptime", (m.network?.uptimePct ?? 0), "%"),
        k("alerts", "Open Alerts", (m.network?.openAlerts ?? 0)),
        k("critical", "Critical", (m.network?.criticalAlerts ?? 0)),
      ];
    case "finance":
      return [
        k("revenue", "Revenue", (m.services?.revenue ?? 0), "$"),
        k("expenses", "Expenses", (m.services?.expenses ?? 0), "$"),
        k("profit", "Net Profit", (m.services?.netProfit ?? 0), "$"),
        k("margin", "Margin", (m.services?.margin ?? 0), "%"),
      ];
    case "operations":
      return [
        k("projects", "Active Projects", (m.services?.activeProjects ?? 0)),
        k("openTasks", "Open Tasks", (m.services?.openTasks ?? 0)),
        k("uptime", "Network Uptime", (m.network?.uptimePct ?? 0), "%"),
        k("sops", "Active SOPs", (m.services?.sops ?? 0)),
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
    case "sales":      value = (m.crm?.winRate ?? 0);            label = "Sales Efficiency"; break;
    case "marketing":  value = (m.marketing?.activeCampaigns ?? 0) > 0 ? Math.min(100, pct((m.marketing?.conversions ?? 0), Math.max(1, (m.marketing?.leads ?? 0))) || (m.marketing?.activeCampaigns ?? 0) * 10) : 0; label = "Marketing Efficiency"; break;
    case "it":         value = (m.network?.uptimePct ?? 0);       label = "Network Health"; break;
    case "finance":    value = (m.services?.margin ?? 0);         label = "Financial Efficiency"; break;
    case "operations": value = (m.services?.taskCompletion ?? 0); label = "Operational Efficiency"; break;
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

  // Each section/panel is resolved defensively: a single failing query yields
  // safe, zero-filled defaults so the dashboard NEVER 500s or blanks because
  // of one bad query. Every section is always a valid object (never null), so
  // downstream KPI/gauge builders can't trip over a missing section.
  const safe = (p, fallback) => p.catch((e) => { console.error("overview section failed:", e.message); return fallback; });

  const want = new Set(access.privileged ? SECTIONS : access.sections);
  const [crm, marketing, network, services] = await Promise.all([
    want.has("crm")       ? safe(crmMetrics(tenantId), DEFAULT_METRICS.crm)            : Promise.resolve(DEFAULT_METRICS.crm),
    want.has("marketing") ? safe(marketingMetrics(tenantId), DEFAULT_METRICS.marketing): Promise.resolve(DEFAULT_METRICS.marketing),
    want.has("network")   ? safe(networkMetrics(tenantId), DEFAULT_METRICS.network)    : Promise.resolve(DEFAULT_METRICS.network),
    want.has("services")  ? safe(servicesMetrics(tenantId), DEFAULT_METRICS.services)  : Promise.resolve(DEFAULT_METRICS.services),
  ]);
  const m = { crm, marketing, network, services };

  const [activity, schedule, tasks, messages] = await Promise.all([
    safe(recentActivity(tenantId), []),
    safe(upcomingSchedule(tenantId), []),
    safe(taskWorkflow(tenantId), { byStatus: { todo: 0, in_progress: 0, review: 0, done: 0 }, items: [] }),
    safe(deptMessages(tenantId, access.dept, access.privileged), []),
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

// Posting from the Executive Overview shares the messaging path so recipients
// get in-app notifications (the message stays in the app — never emailed).
export async function postMessage(userId, tenantId, { body, toDept }) {
  return messaging.sendDept(tenantId, userId, { body, toDept });
}

export const DEPARTMENTS = DEPT_LABELS;
