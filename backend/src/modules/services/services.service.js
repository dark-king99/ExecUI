
import prisma from "../../config/database.js";

import { randomUUID } from "crypto";
import { notify } from "../notifications/notifications.service.js";
import { assistText } from "../../lib/aiAssist.js";

/**
 * Business Services — the managers' workspace.
 *
 * It covers work that belongs to running the business rather than to one
 * department: finances, SOPs, strategic goals and market analysis, and the
 * projects that coordinate people across teams. It deliberately does NOT keep
 * its own copies of things the core modules own — clients live in CRM,
 * campaigns in Marketing, automation in ExecAI, and people are the workspace's
 * own members (Account → Members), not a separate roster.
 */

const OPEN_TASK = { not: "done" };
const nameOf = (u) => `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email;

/**
 * A task's assignee is a workspace member id. Ids that don't belong to this
 * tenant are refused, so a task can't be pointed at someone in another
 * organization. Older tasks may hold a display name instead; they still show.
 */
async function assertMember(tenantId, userId) {
  if (userId == null || userId === "") return null;
  const user = await prisma.user.findFirst({ where: { id: String(userId), tenantId }, select: { id: true } });
  if (!user) throw Object.assign(new Error("Assign the task to a member of this workspace."), { status: 400 });
  return user.id;
}

// Drop a notification in the assignee's bell. Fire-and-forget: a notify
// failure never blocks the task mutation itself.
async function notifyAssignee(tenantId, task, actorId) {
  try {
    if (!task?.assignee || task.assignee === actorId) return;
    const user = await prisma.user.findFirst({ where: { id: task.assignee, tenantId } });
    if (!user) return;
    const actor = actorId ? await prisma.user.findUnique({ where: { id: actorId } }) : null;
    await notify({
      tenantId,
      userId: user.id,
      type: "task",
      title: "New task assigned to you",
      body: `${task.title}${task.due_date ? ` · due ${task.due_date}` : ""}`,
      link: "/services/team",
      actorName: actor ? nameOf(actor) : null,
    });
  } catch { /* never break the task flow over a notification */ }
}

/** The page reads `assigned_to`; the column is `assignee`. */
const shapeTask = (t) => ({ ...t, assigned_to: t.assignee });

// ── Dashboard ─────────────────────────────────────────────────────────────────
export async function getDashboardStats(tenantId) {

  const [
    transactions, projects, activeMembers, totalMembers, openTasks, overdueTasks, goals, sops,
  ] = await Promise.all([
    prisma.bizTransaction.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } }),
    prisma.bizProject.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } }),
    prisma.user.count({ where: { tenantId, isActive: true } }),
    prisma.user.count({ where: { tenantId } }),
    prisma.bizTask.count({ where: { tenantId, status: OPEN_TASK } }),
    prisma.bizTask.count({ where: { tenantId, status: OPEN_TASK, due_date: { lt: new Date().toISOString().slice(0, 10), not: null } } }),
    prisma.bizGoal.findMany({ where: { tenantId } }),
    prisma.bizSOP.count({ where: { tenantId } }),
  ]);

  const income   = transactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expenses = transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const active   = projects.filter(p => p.status === "in_progress");
  const avgProg  = goals.length
    ? Math.round(goals.reduce((s, g) => s + g.progress, 0) / goals.length)
    : 0;

  return {
    financial: {
      total_income:      income,
      total_expenses:    expenses,
      net_profit:        income - expenses,
      transaction_count: transactions.length,
    },
    projects: {
      active:    active.length,
      completed: projects.filter(p => p.status === "completed").length,
      total:     projects.length,
    },
    team: {
      active_members: activeMembers,
      total:          totalMembers,
      open_tasks:     openTasks,
      overdue_tasks:  overdueTasks,
    },
    operations: { sops_count: sops },
    strategic: {
      goals_count:  goals.length,
      avg_progress: avgProg,
    },
    recent_transactions: transactions.slice(0, 5),
    recent_projects:     active.slice(0, 4),
  };
}

// ── Financial – Transactions ──────────────────────────────────────────────────
export async function listTransactions(tenantId) {
  return prisma.bizTransaction.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } });
}

export async function createTransaction(tenantId, data) {
  return prisma.bizTransaction.create({
    data: {
      type:        data.type ?? 'income',
      category:    data.category,
      amount:      Number(data.amount) || 0,
      description: data.description ?? null,
      date:        data.date ?? new Date().toISOString().split('T')[0],
      status:      data.status ?? 'completed',
      tenantId,
    },
  });
}

export async function deleteTransaction(tenantId, id) {
  await prisma.bizTransaction.deleteMany({ where: { id, tenantId } });
}

// ── Financial – Tax Plans ─────────────────────────────────────────────────────
export async function listTaxPlans(tenantId) {
  return prisma.bizTaxPlan.findMany({ where: { tenantId }, orderBy: { year: "desc" } });
}

export async function createTaxPlan(tenantId, data) {
  return prisma.bizTaxPlan.create({
    data: {
      title:             data.title ?? `Tax Plan ${data.year ?? new Date().getFullYear()}`,
      year:              Number(data.year) || new Date().getFullYear(),
      status:            data.status ?? 'active',
      estimated_savings: Number(data.estimated_savings) || 0,
      strategy:          data.strategy ?? null,
      notes:             data.notes ?? null,
      tenantId,
    },
  });
}

export async function deleteTaxPlan(tenantId, id) {
  await prisma.bizTaxPlan.deleteMany({ where: { id, tenantId } });
}

// ── Financial – Investments ───────────────────────────────────────────────────
const RISK_LEVEL_BY_TYPE = { stocks: 'high', bonds: 'low', real_estate: 'medium', other: 'medium' };

export async function listInvestments(tenantId) {
  const invs = await prisma.bizInvestment.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } });
  return invs.map((inv) => ({
    ...inv,
    roi_percentage: inv.initial_value > 0
      ? Number(((inv.current_value - inv.initial_value) / inv.initial_value * 100).toFixed(2))
      : 0,
    risk_level: RISK_LEVEL_BY_TYPE[inv.type] ?? 'medium',
  }));
}

export async function createInvestment(tenantId, data) {
  return prisma.bizInvestment.create({
    data: {
      name:          data.name,
      type:          data.type ?? 'stocks',
      initial_value: Number(data.initial_value) || 0,
      current_value: Number(data.current_value) || 0,
      status:        data.status ?? 'active',
      notes:         data.notes ?? null,
      tenantId,
    },
  });
}

export async function deleteInvestment(tenantId, id) {
  await prisma.bizInvestment.deleteMany({ where: { id, tenantId } });
}

// ── Operations – SOPs ─────────────────────────────────────────────────────────
export async function listSOPs(tenantId) {
  return prisma.bizSOP.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } });
}

export async function createSOP(tenantId, data) {
  return prisma.bizSOP.create({
    data: {
      title:       data.title,
      department:  data.department,
      description: data.description ?? null,
      steps:       data.steps ?? [],
      status:      data.status ?? 'active',
      version:     data.version ?? '1.0',
      tenantId,
    },
  });
}

export async function updateSOP(tenantId, id, data) {
  const updateData = {};
  if (data.title !== undefined)       updateData.title       = data.title;
  if (data.department !== undefined)  updateData.department  = data.department;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.steps !== undefined)       updateData.steps       = data.steps;
  if (data.status !== undefined)      updateData.status      = data.status;
  if (data.version !== undefined)     updateData.version     = data.version;
  return prisma.bizSOP.update({ where: { id }, data: updateData });
}

export async function deleteSOP(tenantId, id) {
  await prisma.bizSOP.deleteMany({ where: { id, tenantId } });
}

// ── Strategic – Goals ─────────────────────────────────────────────────────────
export async function listGoals(tenantId) {
  return prisma.bizGoal.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } });
}

export async function createGoal(tenantId, data) {
  return prisma.bizGoal.create({
    data: {
      title:       data.title,
      category:    data.category ?? 'growth',
      description: data.description ?? null,
      target_date: data.target_date ?? null,
      progress:    Number(data.progress) || 0,
      milestones:  data.milestones ?? [],
      status:      data.status ?? 'in_progress',
      priority:    data.priority ?? 'medium',
      tenantId,
    },
  });
}

export async function updateGoal(tenantId, id, data) {
  const updateData = {};
  if (data.title !== undefined)       updateData.title       = data.title;
  if (data.category !== undefined)    updateData.category    = data.category;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.target_date !== undefined) updateData.target_date = data.target_date;
  if (data.progress !== undefined)    updateData.progress    = Number(data.progress) || 0;
  if (data.milestones !== undefined)  updateData.milestones  = data.milestones;
  if (data.status !== undefined)      updateData.status      = data.status;
  if (data.priority !== undefined)    updateData.priority    = data.priority;
  return prisma.bizGoal.update({ where: { id }, data: updateData });
}

export async function deleteGoal(tenantId, id) {
  await prisma.bizGoal.deleteMany({ where: { id, tenantId } });
}

// ── Strategic – Market Analysis ───────────────────────────────────────────────
export async function listMarketAnalysis(tenantId) {
  return prisma.bizMarketAnalysis.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } });
}

export async function createMarketAnalysis(tenantId, data) {
  return prisma.bizMarketAnalysis.create({
    data: {
      title:         data.title,
      market:        data.market ?? data.market_segment ?? '',
      analysis_type: data.analysis_type ?? 'competitive',
      summary:       data.summary ?? data.findings ?? null,
      opportunities: data.opportunities ?? [],
      threats:       data.threats ?? [],
      status:        data.status ?? 'active',
      tenantId,
    },
  });
}

export async function deleteMarketAnalysis(tenantId, id) {
  await prisma.bizMarketAnalysis.deleteMany({ where: { id, tenantId } });
}

// ── Team – Members (the workspace's own people) ───────────────────────────
/**
 * Everyone in the workspace, with their open and overdue task counts — the
 * workload view a manager plans from. Read-only here: people are added and
 * removed in Account → Members.
 */
export async function listMembers(tenantId) {
  const today = new Date().toISOString().slice(0, 10);
  const [users, tasks] = await Promise.all([
    prisma.user.findMany({
      where: { tenantId },
      select: { id: true, firstName: true, lastName: true, email: true, isActive: true, department: true, jobTitle: true, role: { select: { name: true } } },
    }),
    prisma.bizTask.findMany({ where: { tenantId, status: OPEN_TASK, assignee: { not: null } }, select: { assignee: true, due_date: true } }),
  ]);
  const load = new Map();
  for (const t of tasks) {
    const entry = load.get(t.assignee) ?? { open: 0, overdue: 0 };
    entry.open += 1;
    if (t.due_date && t.due_date < today) entry.overdue += 1;
    load.set(t.assignee, entry);
  }
  return users
    .map((u) => ({
      id: u.id,
      name: nameOf(u),
      email: u.email,
      role: u.jobTitle || (u.role?.name ?? "").replaceAll("_", " "),
      department: u.department ?? null,
      status: u.isActive ? "active" : "inactive",
      open_tasks: load.get(u.id)?.open ?? 0,
      overdue_tasks: load.get(u.id)?.overdue ?? 0,
    }))
    .sort((a, b) => (b.status === "active") - (a.status === "active") || a.name.localeCompare(b.name));
}

// ── Team – Projects ───────────────────────────────────────────────────────────
export async function listProjects(tenantId) {
  return prisma.bizProject.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } });
}

export async function createProject(tenantId, data) {
  return prisma.bizProject.create({
    data: {
      name:         data.name,
      description:  data.description ?? null,
      status:       data.status ?? 'planning',
      priority:     data.priority ?? 'medium',
      progress:     Number(data.progress) || 0,
      budget:       Number(data.budget) || 0,
      team_members: data.team_members ?? [],
      start_date:   data.start_date ?? null,
      end_date:     data.end_date ?? null,
      tenantId,
    },
  });
}

export async function updateProject(tenantId, id, data) {
  const updateData = {};
  if (data.name !== undefined)         updateData.name         = data.name;
  if (data.description !== undefined)  updateData.description  = data.description;
  if (data.status !== undefined)       updateData.status       = data.status;
  if (data.priority !== undefined)     updateData.priority     = data.priority;
  if (data.progress !== undefined)     updateData.progress     = Number(data.progress) || 0;
  if (data.budget !== undefined)       updateData.budget       = Number(data.budget) || 0;
  if (data.team_members !== undefined) updateData.team_members = data.team_members;
  if (data.start_date !== undefined)   updateData.start_date   = data.start_date;
  if (data.end_date !== undefined)     updateData.end_date     = data.end_date;
  return prisma.bizProject.update({ where: { id }, data: updateData });
}

export async function deleteProject(tenantId, id) {
  await prisma.bizProject.deleteMany({ where: { id, tenantId } });
}

// ── Team – Tasks ──────────────────────────────────────────────────────────────
export async function listTasks(tenantId) {
  const tasks = await prisma.bizTask.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } });
  return tasks.map(shapeTask);
}

export async function createTask(tenantId, data, actorId = null) {
  const task = await prisma.bizTask.create({
    data: {
      title:       data.title,
      description: data.description ?? null,
      project_id:  data.project_id ?? null,
      status:      data.status ?? 'todo',
      priority:    data.priority ?? 'medium',
      assignee:    await assertMember(tenantId, data.assignee ?? data.assigned_to),
      due_date:    data.due_date ?? null,
      tenantId,
    },
  });
  notifyAssignee(tenantId, task, actorId);
  return shapeTask(task);
}

export async function updateTask(tenantId, id, data, actorId = null) {
  const before = await prisma.bizTask.findFirst({ where: { id, tenantId } });
  const updateData = {};
  if (data.title !== undefined)       updateData.title       = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.project_id !== undefined)  updateData.project_id  = data.project_id;
  if (data.status !== undefined)      updateData.status      = data.status;
  if (data.priority !== undefined)    updateData.priority    = data.priority;
  if (data.due_date !== undefined)    updateData.due_date    = data.due_date;
  const assignee = data.assignee ?? data.assigned_to;
  if (assignee !== undefined)         updateData.assignee    = await assertMember(tenantId, assignee);
  const task = await prisma.bizTask.update({ where: { id }, data: updateData });
  // Notify on reassignment to a new person (not on every status touch).
  if (updateData.assignee && updateData.assignee !== before?.assignee) {
    notifyAssignee(tenantId, task, actorId);
  }
  return shapeTask(task);
}

export async function deleteTask(tenantId, id) {
  await prisma.bizTask.deleteMany({ where: { id, tenantId } });
}

// ── AI ────────────────────────────────────────────────────────────────────────
export async function aiInsights(tenantId, { module: mod, context, query }) {
  const [goals, projects, transactions] = await Promise.all([
    prisma.bizGoal.findMany({ where: { tenantId }, select: { title: true, progress: true, status: true } }),
    prisma.bizProject.findMany({ where: { tenantId, status: "in_progress" }, select: { name: true, progress: true } }),
    prisma.bizTransaction.findMany({ where: { tenantId }, select: { type: true, amount: true }, take: 30 }),
  ]);

  const income   = transactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expenses = transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const margin   = income > 0 ? ((income - expenses) / income * 100).toFixed(1) : 0;
  const atRisk   = goals.filter(g => g.status === "at_risk").map(g => g.title);

  // Deterministic insight lines double as the AI fallback (free when AI is off).
  const insights = [
    `Net margin is ${margin}% — ${parseFloat(margin) > 25 ? "healthy and above benchmark" : "below the 25% target; review expense categories"}.`,
    projects.length > 0
      ? `${projects.length} project${projects.length > 1 ? "s" : ""} in progress — avg completion ${Math.round(projects.reduce((s,p)=>s+p.progress,0)/projects.length)}%.`
      : "No active projects currently tracked.",
    atRisk.length > 0
      ? `${atRisk.length} strategic goal${atRisk.length > 1 ? "s are" : " is"} at risk: ${atRisk.slice(0,2).join(", ")}.`
      : "All tracked goals are on track.",
  ];
  const recommendations = [
    income > expenses
      ? "Consider reinvesting net profit surplus into highest-ROI growth initiatives."
      : "Prioritize expense reduction — payroll and operations are typically highest levers.",
    "Review at-risk strategic goals weekly to identify blockers before they compound.",
    "Ensure compliance and expansion milestones have clear owners and deadlines.",
  ];

  // When AI is live, turn the compact metrics into a tailored recommendation set.
  const aiRecs = await assistText({
    tenantId,
    system: "You are a business operations analyst. Given the metrics, return 3 short, specific recommendations as plain lines separated by newlines. No numbering, no preamble.",
    user: `Margin ${margin}%. Income ${income}, expenses ${expenses}. Active projects: ${projects.length}. At-risk goals: ${atRisk.length ? atRisk.slice(0,3).join(", ") : "none"}.${query ? ` Focus: ${String(query).slice(0,120)}` : ""}`,
    maxTokens: 200,
    fallback: () => recommendations.join("\n"),
  });
  const parsed = aiRecs.split("\n").map(s => s.replace(/^[-•\d.\s]+/, "").trim()).filter(Boolean);

  return { insights, recommendations: parsed.length ? parsed.slice(0, 4) : recommendations };
}

export async function generateSOP(tenantId, { title, department }) {
  const fallback = () => `# Standard Operating Procedure: ${title || "New SOP"}\n\n**Department:** ${department || "General"}\n**Version:** 1.0\n**Status:** Draft\n\n## Purpose\nThis SOP defines the repeatable, auditable steps to complete the **${title || "process"}** efficiently and in compliance with company standards.\n\n## Scope\nApplicable to all ${department || "relevant"} team members involved in this process.\n\n## Procedure\n\n1. **Preparation** — Gather required inputs, tools and approvals before starting.\n2. **Execution** — Follow each step sequentially; do not skip steps without documented justification.\n3. **Validation** — Verify outputs meet acceptance criteria defined in this SOP.\n4. **Documentation** — Record completion, exceptions and outcomes in the designated system.\n5. **Escalation** — For any deviation, notify the department lead within 2 business hours.\n\n## Metrics\n- Target completion time: TBD\n- Error rate threshold: < 2%\n- Review frequency: Quarterly\n\n## Review & Approval\nThis SOP should be reviewed every 90 days and updated to reflect process changes.`;
  const content = await assistText({
    tenantId,
    system: "You write clear, professional Standard Operating Procedures in markdown, with Purpose, Scope, Procedure (numbered), Metrics, and Review sections. Output the SOP only.",
    user: `SOP title: "${title || "New SOP"}". Department: "${department || "General"}".`,
    maxTokens: 320,
    fallback,
  });
  return { content };
}
