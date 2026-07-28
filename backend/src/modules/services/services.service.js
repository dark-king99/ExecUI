import prisma from "../../config/database.js";
import { randomUUID } from "crypto";
import { notify } from "../notifications/notifications.service.js";
import { assistText } from "../../lib/aiAssist.js";

// BizTask.assignee is a display name — resolve it to a tenant user and drop a
// notification in their bell. Fire-and-forget: a notify failure never blocks
// the task mutation itself.
async function notifyAssignee(tenantId, task, actorId, action) {
  try {
    if (!task?.assignee) return;
    const [first, ...rest] = String(task.assignee).trim().split(/\s+/);
    const user = await prisma.user.findFirst({
      where: {
        tenantId,
        firstName: { equals: first, mode: "insensitive" },
        ...(rest.length ? { lastName: { equals: rest.join(" "), mode: "insensitive" } } : {}),
      },
    });
    if (!user || user.id === actorId) return; // unknown name or self-assignment
    const actor = actorId ? await prisma.user.findUnique({ where: { id: actorId } }) : null;
    await notify({
      tenantId,
      userId: user.id,
      type: "task",
      title: action === "assigned" ? "New task assigned to you" : "A task of yours was updated",
      body: `${task.title}${task.due_date ? ` · due ${task.due_date}` : ""}`,
      link: "/services/team",
      actorName: actor ? `${actor.firstName} ${actor.lastName}`.trim() : null,
    });
  } catch { /* never break the task flow over a notification */ }
}

// ── Seed data ─────────────────────────────────────────────────────────────────

// ── Lazy seeding ──────────────────────────────────────────────────────────────

// ── Dashboard ─────────────────────────────────────────────────────────────────
export async function getDashboardStats(tenantId) {

  const [
    transactions, projects, members, clients, goals, sops,
  ] = await Promise.all([
    prisma.bizTransaction.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } }),
    prisma.bizProject.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } }),
    prisma.bizMember.findMany({ where: { tenantId } }),
    prisma.bizClient.findMany({ where: { tenantId } }),
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
    team:     {
      active_members: members.filter(m => m.status === "active").length,
      total:          members.length,
    },
    clients: {
      active:      clients.filter(c => c.status === "active").length,
      total:       clients.length,
      total_value: clients.filter(c => c.status === "active").reduce((s, c) => s + c.annual_value, 0),
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

// ── Operations – Workflows ────────────────────────────────────────────────────
export async function listWorkflows(tenantId) {
  return prisma.bizWorkflow.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } });
}

export async function createWorkflow(tenantId, data) {
  return prisma.bizWorkflow.create({
    data: {
      name:         data.name,
      description:  data.description ?? null,
      department:   data.department ?? null,
      trigger:      data.trigger ?? null,
      steps:        data.steps ?? [],
      status:       data.status ?? 'active',
      is_automated: data.is_automated ?? false,
      tenantId,
    },
  });
}

export async function deleteWorkflow(tenantId, id) {
  await prisma.bizWorkflow.deleteMany({ where: { id, tenantId } });
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

// ── Marketing / Sales – Campaigns ────────────────────────────────────────────
export async function listCampaigns(tenantId) {
  const campaigns = await prisma.bizCampaign.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } });
  return campaigns.map((c) => ({ ...c, type: c.platform }));
}

export async function createCampaign(tenantId, data) {
  return prisma.bizCampaign.create({
    data: {
      name:       data.name,
      platform:   data.type ?? data.platform ?? 'email',
      status:     data.status ?? 'draft',
      budget:     Number(data.budget) || 0,
      spent:      Number(data.spent) || 0,
      start_date: data.start_date ?? null,
      end_date:   data.end_date ?? null,
      tenantId,
    },
  });
}

export async function updateCampaign(tenantId, id, data) {
  const updateData = {};
  if (data.name !== undefined)       updateData.name       = data.name;
  if (data.type !== undefined)       updateData.platform   = data.type;
  if (data.platform !== undefined)   updateData.platform   = data.platform;
  if (data.status !== undefined)     updateData.status     = data.status;
  if (data.budget !== undefined)     updateData.budget     = Number(data.budget) || 0;
  if (data.spent !== undefined)      updateData.spent      = Number(data.spent) || 0;
  if (data.start_date !== undefined) updateData.start_date = data.start_date;
  if (data.end_date !== undefined)   updateData.end_date   = data.end_date;
  return prisma.bizCampaign.update({ where: { id }, data: updateData });
}

export async function deleteCampaign(tenantId, id) {
  await prisma.bizCampaign.deleteMany({ where: { id, tenantId } });
}

// ── Marketing / Sales – Clients ───────────────────────────────────────────────
export async function listClients(tenantId) {
  const clients = await prisma.bizClient.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } });
  return clients.map((c) => ({ ...c, value: c.annual_value }));
}

export async function createClient(tenantId, data) {
  return prisma.bizClient.create({
    data: {
      name:         data.name,
      company:      data.company ?? null,
      email:        data.email ?? null,
      phone:        data.phone ?? null,
      annual_value: Number(data.annual_value ?? data.value) || 0,
      status:       data.status ?? 'active',
      contract_end: data.contract_end ?? null,
      industry:     data.industry ?? null,
      tenantId,
    },
  });
}

export async function updateClient(tenantId, id, data) {
  const updateData = {};
  if (data.name !== undefined)         updateData.name         = data.name;
  if (data.company !== undefined)      updateData.company      = data.company;
  if (data.email !== undefined)        updateData.email        = data.email;
  if (data.phone !== undefined)        updateData.phone        = data.phone;
  const av = data.annual_value ?? data.value;
  if (av !== undefined)                updateData.annual_value = Number(av) || 0;
  if (data.status !== undefined)       updateData.status       = data.status;
  if (data.contract_end !== undefined) updateData.contract_end = data.contract_end;
  if (data.industry !== undefined)     updateData.industry     = data.industry;
  return prisma.bizClient.update({ where: { id }, data: updateData });
}

export async function deleteClient(tenantId, id) {
  await prisma.bizClient.deleteMany({ where: { id, tenantId } });
}

// ── Team – Members ────────────────────────────────────────────────────────────
export async function listMembers(tenantId) {
  return prisma.bizMember.findMany({ where: { tenantId }, orderBy: { name: "asc" } });
}

export async function createMember(tenantId, data) {
  return prisma.bizMember.create({
    data: {
      name:       data.name,
      role:       data.role ?? '',
      department: data.department || 'General',
      email:      data.email ?? null,
      status:     data.status ?? 'active',
      skills:     data.skills ?? [],
      avatar_url: data.avatar_url ?? null,
      tenantId,
    },
  });
}

export async function updateMember(tenantId, id, data) {
  const updateData = {};
  if (data.name !== undefined)       updateData.name       = data.name;
  if (data.role !== undefined)       updateData.role       = data.role;
  if (data.department !== undefined) updateData.department = data.department;
  if (data.email !== undefined)      updateData.email      = data.email;
  if (data.status !== undefined)     updateData.status     = data.status;
  if (data.skills !== undefined)     updateData.skills     = data.skills;
  if (data.avatar_url !== undefined) updateData.avatar_url = data.avatar_url;
  return prisma.bizMember.update({ where: { id }, data: updateData });
}

export async function deleteMember(tenantId, id) {
  await prisma.bizMember.deleteMany({ where: { id, tenantId } });
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
  return prisma.bizTask.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } });
}

export async function createTask(tenantId, data, actorId = null) {
  const task = await prisma.bizTask.create({
    data: {
      title:       data.title,
      description: data.description ?? null,
      project_id:  data.project_id ?? null,
      status:      data.status ?? 'todo',
      priority:    data.priority ?? 'medium',
      assignee:    data.assignee ?? data.assigned_to ?? null,
      due_date:    data.due_date ?? null,
      tenantId,
    },
  });
  notifyAssignee(tenantId, task, actorId, "assigned");
  return task;
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
  if (assignee !== undefined)         updateData.assignee    = assignee;
  const task = await prisma.bizTask.update({ where: { id }, data: updateData });
  // Notify on reassignment to a new person (not on every status touch).
  if (assignee !== undefined && assignee && assignee !== before?.assignee) {
    notifyAssignee(tenantId, task, actorId, "assigned");
  }
  return task;
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
