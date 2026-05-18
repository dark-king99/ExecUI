import prisma from "../../config/database.js";

// ── Stage helpers ─────────────────────────────────────────────────────────────
const DEAL_STAGE_MAP = {
  prospecting: "Discovery", qualification: "Qualified", proposal: "Proposal",
  negotiation: "Negotiation", closed_won: "Closed Won", closed_lost: "Closed Lost",
};
const OPP_STAGE_MAP = {
  prospecting: "Prospecting", qualification: "Qualified", proposal: "Proposal",
  negotiation: "Negotiation", closed_won: "Closed Won", closed_lost: "Closed Lost",
};
const LEAD_STAGE_MAP = {
  prospecting: "New", qualification: "Qualified", proposal: "Contacted",
  negotiation: "Demo Booked", closed_won: "Closed Won", closed_lost: "Closed Lost",
};

const toDbStage = (stage = "") => {
  const map = {
    discovery: "prospecting", prospecting: "prospecting",
    new: "prospecting", contacted: "prospecting",
    qualified: "qualification", "demo booked": "qualification",
    proposal: "proposal", negotiation: "negotiation",
    "closed won": "closed_won", closed_won: "closed_won",
    "closed lost": "closed_lost", closed_lost: "closed_lost",
  };
  return map[stage.toLowerCase().replace(/_/g, " ")] ?? "prospecting";
};

const fmtValue = (v) => {
  if (!v && v !== 0) return "—";
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}k`;
  return `$${v}`;
};

const extractAccount = (name = "") => {
  const descriptors = new Set([
    "Enterprise", "Platform", "Cloud", "Mobile", "Retail", "Data", "AI", "SaaS",
    "Contract", "License", "Integration", "Migration", "Upgrade", "Expansion",
    "Suite", "Warehousing", "Annual", "Renewal", "Deal", "Opportunity",
  ]);
  const words = name.split(" ");
  const parts = [];
  for (const w of words) {
    if (descriptors.has(w)) break;
    parts.push(w);
    if (parts.length >= 3) break;
  }
  return parts.join(" ") || name;
};

const oppInclude = {
  owner: { select: { firstName: true, lastName: true, email: true } },
};

const dealShape = (o) => ({
  id: o.id, name: o.name,
  account: extractAccount(o.name),
  owner: o.owner ? `${o.owner.firstName} ${o.owner.lastName}` : null,
  ownerId: o.ownerId,
  stage: DEAL_STAGE_MAP[o.stage] ?? o.stage,
  value: fmtValue(o.value), rawValue: o.value ?? 0,
  probability: o.probability ?? 0, status: o.status,
  closeDate: o.updatedAt?.toISOString().slice(0, 10) ?? null,
  createdAt: o.createdAt, updatedAt: o.updatedAt,
});

const oppShape = (o) => ({
  ...dealShape(o),
  stage: OPP_STAGE_MAP[o.stage] ?? o.stage,
});

const leadShape = (o) => ({
  id: o.id, name: o.name,
  company: extractAccount(o.name),
  email: o.owner?.email ?? null, phone: null,
  stage: LEAD_STAGE_MAP[o.stage] ?? "New",
  score: Math.min(100, Math.round((o.probability ?? 0) * 0.8 + 20)),
  source: "Inbound",
  value: fmtValue(o.value), rawValue: o.value ?? 0,
  owner: o.owner ? `${o.owner.firstName} ${o.owner.lastName}` : null,
  status: o.status, createdAt: o.createdAt,
});

// ── Customers (Contact model) ─────────────────────────────────────────────────
export const listCustomers = (tenantId) =>
  prisma.contact.findMany({ where: { tenantId } });

export const getCustomer = (tenantId, id) =>
  prisma.contact.findFirst({ where: { id, tenantId } });

export const createCustomer = (tenantId, data) =>
  prisma.contact.create({
    data: {
      name: data.name, email: data.email,
      key: data.key || `contact-${Date.now()}-${Math.random().toString(36).slice(7)}`,
      tenantId,
    },
  });

export const updateCustomer = (tenantId, id, data) =>
  prisma.contact.update({ where: { id }, data: { name: data.name, email: data.email } });

export const deleteCustomer = (tenantId, id) =>
  prisma.contact.delete({ where: { id } });

// ── Deals ─────────────────────────────────────────────────────────────────────
export const listDeals = async (tenantId, params = {}) => {
  const where = { tenantId };
  if (params.stage) where.stage = toDbStage(params.stage);
  if (params.ownerId) where.ownerId = params.ownerId;
  const rows = await prisma.crmOpportunity.findMany({
    where, include: oppInclude,
    orderBy: { createdAt: "desc" },
  });
  return rows.map(dealShape);
};

export const getDeal = async (tenantId, id) => {
  const o = await prisma.crmOpportunity.findFirst({ where: { id, tenantId }, include: oppInclude });
  return o ? dealShape(o) : null;
};

export const createDeal = async (tenantId, data) => {
  const o = await prisma.crmOpportunity.create({
    data: {
      name: data.name,
      stage: toDbStage(data.stage ?? "Discovery"),
      value: Number(data.value) || 0,
      probability: Number(data.probability) || 0,
      status: "active",
      tenantId,
      ...(data.ownerId ? { ownerId: data.ownerId } : {}),
    },
    include: oppInclude,
  });
  return dealShape(o);
};

export const updateDeal = async (tenantId, id, data) => {
  const update = {};
  if (data.name !== undefined) update.name = data.name;
  if (data.stage !== undefined) update.stage = toDbStage(data.stage);
  if (data.value !== undefined) update.value = Number(data.value);
  if (data.probability !== undefined) update.probability = Number(data.probability);
  if (data.status !== undefined) update.status = data.status;
  if (data.ownerId !== undefined) update.ownerId = data.ownerId;
  const o = await prisma.crmOpportunity.update({ where: { id }, data: update, include: oppInclude });
  return dealShape(o);
};

export const getDealTimeline = async (tenantId, id) => {
  const o = await prisma.crmOpportunity.findFirst({ where: { id, tenantId } });
  if (!o) return [];
  return [
    { type: "created", description: "Deal created", timestamp: o.createdAt },
    { type: "updated", description: `Stage: ${DEAL_STAGE_MAP[o.stage] ?? o.stage}`, timestamp: o.updatedAt },
  ];
};

export const getDealTasks = async (tenantId, dealId) => {
  const rows = await prisma.crmTask.findMany({
    where: { tenantId },
    include: { user: { select: { firstName: true, lastName: true } } },
    orderBy: { due_date: "asc" },
    take: 10,
  });
  return rows.map((t) => ({
    id: t.id, title: t.title, status: t.status, priority: t.priority,
    dueDate: t.due_date, assignee: t.user ? `${t.user.firstName} ${t.user.lastName}` : null,
  }));
};

export const createDealTask = async (tenantId, dealId, data) => {
  const firstUser = await prisma.user.findFirst({ where: { tenantId } });
  return prisma.crmTask.create({
    data: {
      title: data.title, task_type: data.task_type ?? "follow_up",
      status: "pending", priority: data.priority ?? "medium",
      due_date: data.dueDate ? new Date(data.dueDate) : null,
      relatedCustomerName: data.relatedCustomerName ?? null,
      tenantId, userId: data.userId ?? firstUser?.id ?? "",
    },
  });
};

export const updateDealTask = async (tenantId, dealId, taskId, data) => {
  const update = {};
  if (data.title !== undefined) update.title = data.title;
  if (data.status !== undefined) update.status = data.status;
  if (data.priority !== undefined) update.priority = data.priority;
  if (data.dueDate !== undefined) update.due_date = data.dueDate ? new Date(data.dueDate) : null;
  return prisma.crmTask.update({ where: { id: taskId }, data: update });
};

export const getDealAudit = async (tenantId, dealId) => {
  const logs = await prisma.auditLog.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return logs.map((l) => ({
    id: l.id, action: l.action, resource: l.resource,
    detail: l.detail, createdAt: l.createdAt,
  }));
};

// ── Leads ─────────────────────────────────────────────────────────────────────
export const listLeads = async (tenantId, params = {}) => {
  const where = { tenantId };
  if (params.stage) where.stage = toDbStage(params.stage);
  const rows = await prisma.crmOpportunity.findMany({
    where, include: oppInclude,
    orderBy: { createdAt: "desc" },
  });
  return rows.map(leadShape);
};

export const getLead = async (tenantId, id) => {
  const o = await prisma.crmOpportunity.findFirst({ where: { id, tenantId }, include: oppInclude });
  return o ? leadShape(o) : null;
};

export const createLead = async (tenantId, data) => {
  const o = await prisma.crmOpportunity.create({
    data: {
      name: data.name ?? data.company ?? "New Lead",
      stage: toDbStage(data.stage ?? "New"),
      value: Number(data.value) || 0,
      probability: Number(data.probability) || 10,
      status: "active", tenantId,
      ...(data.ownerId ? { ownerId: data.ownerId } : {}),
    },
    include: oppInclude,
  });
  return leadShape(o);
};

export const updateLead = async (tenantId, id, data) => {
  const update = {};
  if (data.stage !== undefined) update.stage = toDbStage(data.stage);
  if (data.value !== undefined) update.value = Number(data.value);
  if (data.probability !== undefined) update.probability = Number(data.probability);
  if (data.status !== undefined) update.status = data.status;
  const o = await prisma.crmOpportunity.update({ where: { id }, data: update, include: oppInclude });
  return leadShape(o);
};

export const getLeadActivity = async (tenantId) => {
  const opps = await prisma.crmOpportunity.findMany({
    where: { tenantId },
    include: oppInclude,
    orderBy: { updatedAt: "desc" },
    take: 20,
  });
  return opps.map((o) => ({
    id: o.id, type: "activity", action: "stage_change",
    description: `${o.name} moved to ${LEAD_STAGE_MAP[o.stage] ?? o.stage}`,
    timestamp: o.updatedAt,
  }));
};

// ── Tasks ─────────────────────────────────────────────────────────────────────
export const listTasks = async (tenantId, params = {}) => {
  const where = { tenantId };
  if (params.status) where.status = params.status;
  const rows = await prisma.crmTask.findMany({
    where,
    include: { user: { select: { firstName: true, lastName: true } } },
    orderBy: { due_date: "asc" },
  });
  return rows.map((t) => ({
    id: t.id, title: t.title, status: t.status, priority: t.priority,
    dueDate: t.due_date, task_type: t.task_type,
    assignee: t.user ? `${t.user.firstName} ${t.user.lastName}` : null,
    createdAt: t.createdAt,
  }));
};

export const createTask = async (tenantId, data) => {
  const firstUser = data.userId
    ? null
    : await prisma.user.findFirst({ where: { tenantId } });
  return prisma.crmTask.create({
    data: {
      title: data.title, task_type: data.task_type ?? "follow_up",
      status: data.status ?? "pending", priority: data.priority ?? "medium",
      due_date: data.dueDate ? new Date(data.dueDate) : null,
      relatedCustomerName: data.relatedCustomerName ?? null,
      tenantId, userId: data.userId ?? firstUser?.id ?? "",
    },
  });
};

export const updateTask = async (tenantId, id, data) => {
  const update = {};
  if (data.title !== undefined) update.title = data.title;
  if (data.status !== undefined) update.status = data.status;
  if (data.priority !== undefined) update.priority = data.priority;
  if (data.dueDate !== undefined) update.due_date = data.dueDate ? new Date(data.dueDate) : null;
  return prisma.crmTask.update({ where: { id }, data: update });
};

export const completeTask = async (tenantId, id) => {
  await prisma.crmTask.update({ where: { id }, data: { status: "completed" } });
  return { success: true };
};

// ── Sequences (static) ────────────────────────────────────────────────────────
const STATIC_SEQUENCES = [
  { id: "seq-1", name: "New Lead Outreach", steps: 5, active: true, enrolled: 12, description: "5-touch sequence for new inbound leads" },
  { id: "seq-2", name: "Re-engagement Campaign", steps: 3, active: true, enrolled: 7, description: "Win back cold prospects after 30 days" },
  { id: "seq-3", name: "Post-Demo Follow-up", steps: 4, active: false, enrolled: 0, description: "Automated follow-up after product demo" },
  { id: "seq-4", name: "Contract Renewal", steps: 6, active: true, enrolled: 3, description: "60-day renewal sequence for expiring contracts" },
];

export const listSequences = () => Promise.resolve(STATIC_SEQUENCES);
export const createSequence = (tenantId, data) =>
  Promise.resolve({ id: `seq-${Date.now()}`, ...data, active: true, enrolled: 0 });

// ── Forecast ──────────────────────────────────────────────────────────────────
export const getForecastSummary = async (tenantId) => {
  const opps = await prisma.crmOpportunity.findMany({
    where: { tenantId, status: "active" },
    select: { value: true, probability: true, stage: true },
  });

  const target = 500000;
  const committed = opps
    .filter((o) => ["negotiation", "closed_won"].includes(o.stage))
    .reduce((s, o) => s + (o.value ?? 0), 0);
  const bestCase = opps
    .filter((o) => ["proposal", "negotiation", "closed_won"].includes(o.stage))
    .reduce((s, o) => s + (o.value ?? 0), 0);
  const pipeline = opps.reduce((s, o) => s + (o.value ?? 0), 0);

  return {
    target, committed, bestCase, pipeline,
    targetFmt: fmtValue(target), committedFmt: fmtValue(committed),
    bestCaseFmt: fmtValue(bestCase), pipelineFmt: fmtValue(pipeline),
  };
};

export const getForecastByRep = async (tenantId) => {
  const users = await prisma.user.findMany({
    where: { tenantId },
    select: { id: true, firstName: true, lastName: true },
  });

  const results = await Promise.all(
    users.map(async (u) => {
      const opps = await prisma.crmOpportunity.findMany({
        where: { tenantId, ownerId: u.id, status: "active" },
        select: { value: true, stage: true, probability: true },
      });

      const commit = opps
        .filter((o) => ["negotiation", "closed_won"].includes(o.stage))
        .reduce((s, o) => s + (o.value ?? 0), 0);
      const quota = 100000;
      const pipeline = opps.reduce((s, o) => s + (o.value ?? 0), 0);

      return {
        id: u.id, name: `${u.firstName} ${u.lastName}`,
        quota, quotaFmt: fmtValue(quota),
        commit, commitRaw: commit, commitFmt: fmtValue(commit),
        pipeline, pipelineRaw: pipeline,
        attainment: quota > 0 ? Math.round((commit / quota) * 100) : 0,
        deals: opps.length,
      };
    })
  );

  return results.filter((r) => r.deals > 0);
};

export const getForecastCategories = async (tenantId) => {
  const opps = await prisma.crmOpportunity.findMany({
    where: { tenantId, status: "active" },
    select: { stage: true, value: true },
  });

  const cats = { commit: 0, bestCase: 0, pipeline: 0, omitted: 0 };
  for (const o of opps) {
    const v = o.value ?? 0;
    if (["negotiation", "closed_won"].includes(o.stage)) cats.commit += v;
    else if (o.stage === "proposal") cats.bestCase += v;
    else if (["qualification", "prospecting"].includes(o.stage)) cats.pipeline += v;
    else cats.omitted += v;
  }

  return Object.entries(cats).map(([name, value]) => ({ name, value, valueFmt: fmtValue(value) }));
};

// ── Pipeline ──────────────────────────────────────────────────────────────────
export const getPipelineSummary = async (tenantId) => {
  const opps = await prisma.crmOpportunity.findMany({
    where: { tenantId, status: "active" },
    select: { stage: true, value: true },
  });

  const stageTotals = {};
  for (const o of opps) {
    if (!stageTotals[o.stage]) stageTotals[o.stage] = { count: 0, value: 0 };
    stageTotals[o.stage].count++;
    stageTotals[o.stage].value += o.value ?? 0;
  }

  const stageOrder = ["prospecting", "qualification", "proposal", "negotiation", "closed_won", "closed_lost"];
  const stages = stageOrder.map((s) => ({
    stage: DEAL_STAGE_MAP[s] ?? s,
    dbStage: s,
    count: stageTotals[s]?.count ?? 0,
    value: stageTotals[s]?.value ?? 0,
    valueFmt: fmtValue(stageTotals[s]?.value ?? 0),
  }));

  const totalValue = opps.reduce((s, o) => s + (o.value ?? 0), 0);
  const wonRevenue = stageTotals["closed_won"]?.value ?? 0;

  return {
    stages,
    totalPipeline: totalValue,
    totalPipelineFmt: fmtValue(totalValue),
    wonRevenue,
    wonRevenueFmt: fmtValue(wonRevenue),
    activeReps: new Set(opps.map((o) => o.ownerId).filter(Boolean)).size,
  };
};

export const getPipelineOwners = async (tenantId) => {
  const users = await prisma.user.findMany({
    where: { tenantId },
    select: { id: true, firstName: true, lastName: true },
  });

  const results = await Promise.all(
    users.map(async (u) => {
      const opps = await prisma.crmOpportunity.findMany({
        where: { tenantId, ownerId: u.id, status: "active" },
        select: { value: true, stage: true },
      });

      const pipeline = opps.reduce((s, o) => s + (o.value ?? 0), 0);
      const won = opps.filter((o) => o.stage === "closed_won");
      const closed = opps.filter((o) => ["closed_won", "closed_lost"].includes(o.stage));

      return {
        id: u.id, name: `${u.firstName} ${u.lastName}`,
        openDeals: opps.filter((o) => !["closed_won", "closed_lost"].includes(o.stage)).length,
        pipelineValue: pipeline, pipelineFmt: fmtValue(pipeline),
        avgDeal: opps.length ? Math.round(pipeline / opps.length) : 0,
        winRate: closed.length ? Math.round((won.length / closed.length) * 100) : 0,
      };
    })
  );

  return results.filter((r) => r.openDeals > 0 || r.pipelineValue > 0);
};

// ── AI ────────────────────────────────────────────────────────────────────────
export const aiChat = (tenantId, body = {}) => {
  const msg = (body?.message ?? "").toLowerCase();
  let reply = "I'm your SmartCRM AI. I can help with pipeline analysis, customer risk, lead qualification, forecasting, deal strategy, task management, and general CRM best practices. What would you like to explore?";

  if (msg.includes("pipeline") || (msg.includes("deal") && !msg.includes("win") && !msg.includes("loss"))) {
    reply = "**Pipeline Health**\n\nYour pipeline spans 6 stages: Lead In → Qualified → Proposal → Negotiation → Commit → Closed Won.\n\nKey insight: deals stalling in Negotiation for more than 14 days have a 60% lower close rate. Address blockers early.";
  } else if (msg.includes("risk") || msg.includes("churn")) {
    reply = "**Customer Risk Assessment**\n\nCustomers are flagged **At Risk** when last contact exceeds 14 days — churn typically follows within 3–4 weeks of silent accounts.\n\nSet automated re-engagement alerts at the 10-day mark.";
  } else if (msg.includes("lead") || msg.includes("qualify")) {
    reply = "**Lead Qualification (BANT)**\n\n• **Budget** — Can they fund a purchase this quarter?\n• **Authority** — Are you engaging the economic buyer?\n• **Need** — Is there a clearly articulated business problem?\n• **Timeline** — Do they have urgency to act within 90 days?";
  } else if (msg.includes("forecast") || msg.includes("revenue") || msg.includes("quota")) {
    reply = "**Sales Forecasting**\n\nAccurate forecasting combines stage-weighted pipeline with rep-level commit signals.\n\n**Categories:** Commit → Best Case → Pipeline";
  }

  return Promise.resolve({ reply });
};

export const aiSummaries = () => Promise.resolve({ summary: "Pipeline is healthy with strong activity in Proposal and Negotiation stages. 3 deals require immediate follow-up." });
export const aiAction    = () => Promise.resolve({ result: "Action logged successfully." });

// ── Accounts ──────────────────────────────────────────────────────────────────
export const listAccounts = async (tenantId, params = {}) => {
  const contacts = await prisma.contact.findMany({ where: { tenantId } });

  const enriched = await Promise.all(
    contacts.map(async (c) => {
      const opps = await prisma.crmOpportunity.findMany({
        where: { tenantId, name: { contains: c.name.split(" ")[0] } },
        select: { value: true, stage: true },
      });
      const revenue = opps.reduce((s, o) => s + (o.value ?? 0), 0);
      const openDeals = opps.filter((o) => !["closed_won", "closed_lost"].includes(o.stage)).length;

      return {
        id: c.id, name: c.name, email: c.email,
        revenue, revenueFmt: fmtValue(revenue),
        openDeals, totalDeals: opps.length,
        health: openDeals > 0 ? "active" : "inactive",
        createdAt: c.createdAt,
      };
    })
  );

  return enriched;
};

export const getAccount = async (tenantId, id) => {
  const c = await prisma.contact.findFirst({ where: { id, tenantId } });
  if (!c) return null;
  const opps = await prisma.crmOpportunity.findMany({
    where: { tenantId, name: { contains: c.name.split(" ")[0] } },
    select: { value: true, stage: true, name: true },
  });
  const revenue = opps.reduce((s, o) => s + (o.value ?? 0), 0);
  return { ...c, revenue, revenueFmt: fmtValue(revenue), deals: opps.map(dealShape) };
};

export const getAccountDeals = async (tenantId, accountId) => {
  const c = await prisma.contact.findFirst({ where: { id: accountId, tenantId } });
  if (!c) return [];
  const opps = await prisma.crmOpportunity.findMany({
    where: { tenantId, name: { contains: c.name.split(" ")[0] } },
    include: oppInclude,
    orderBy: { createdAt: "desc" },
  });
  return opps.map(dealShape);
};

export const getAccountTimeline = async (tenantId, accountId) => {
  const c = await prisma.contact.findFirst({ where: { id: accountId, tenantId } });
  if (!c) return [];
  return [
    { type: "created", description: `Account ${c.name} created`, timestamp: c.createdAt },
    { type: "activity", description: "Last contacted via email", timestamp: new Date() },
  ];
};

export const addAccountNote = async (tenantId, accountId, data) => {
  const firstUser = await prisma.user.findFirst({ where: { tenantId } });
  if (!firstUser) return { id: accountId, note: data.note ?? "" };
  return prisma.auditLog.create({
    data: {
      action: "note", resource: "account", resourceId: accountId,
      detail: data.note ?? data.content ?? "",
      tenantId, userId: firstUser.id,
    },
  });
};

// ── Resolutions (static) ──────────────────────────────────────────────────────
const STATIC_RESOLUTIONS = [
  { id: "res-1", title: "Standard Refund Policy", votes: 24, status: "approved", category: "Billing" },
  { id: "res-2", title: "SLA Compensation Guidelines", votes: 18, status: "approved", category: "Support" },
  { id: "res-3", title: "Contract Termination Procedure", votes: 11, status: "under_review", category: "Legal" },
  { id: "res-4", title: "Discount Approval Workflow", votes: 9, status: "approved", category: "Sales" },
];

export const listResolutions = () => Promise.resolve(STATIC_RESOLUTIONS);
export const voteResolution  = (tenantId, id) =>
  Promise.resolve({ id, success: true, votes: STATIC_RESOLUTIONS.find((r) => r.id === id)?.votes + 1 ?? 1 });

// ── Analytics ─────────────────────────────────────────────────────────────────
export const getCrmAnalyticsSummary = async (tenantId) => {
  const opps = await prisma.crmOpportunity.findMany({
    where: { tenantId },
    select: { stage: true, value: true, createdAt: true, updatedAt: true },
  });

  const total = opps.length;
  const won = opps.filter((o) => o.stage === "closed_won");
  const closed = opps.filter((o) => ["closed_won", "closed_lost"].includes(o.stage));
  const pipeline = opps.filter((o) => o.status !== "closed").reduce((s, o) => s + (o.value ?? 0), 0);

  const winRate = closed.length ? Math.round((won.length / closed.length) * 100) : 0;
  const avgCycle = total
    ? Math.round(opps.reduce((s, o) => s + ((o.updatedAt - o.createdAt) / 86400000), 0) / total)
    : 0;
  const avgDeal = won.length
    ? Math.round(won.reduce((s, o) => s + (o.value ?? 0), 0) / won.length)
    : 0;

  return {
    winRate: `${winRate}%`, avgSalesCycle: `${avgCycle}d`,
    pipelineVelocity: fmtValue(pipeline), conversionRate: `${winRate}%`,
    avgDealSize: avgDeal, avgDealSizeFmt: fmtValue(avgDeal),
    totalOpps: total, pipelineValue: pipeline,
  };
};

export const getCrmAnalyticsFunnel = async (tenantId) => {
  const opps = await prisma.crmOpportunity.findMany({
    where: { tenantId },
    select: { stage: true, value: true },
  });

  const stages = ["prospecting", "qualification", "proposal", "negotiation", "closed_won"];
  return stages.map((s) => {
    const group = opps.filter((o) => o.stage === s);
    return {
      stage: DEAL_STAGE_MAP[s] ?? s, count: group.length,
      value: group.reduce((sum, o) => sum + (o.value ?? 0), 0),
    };
  });
};

export const getCrmAnalyticsVelocity = async (tenantId) => {
  const opps = await prisma.crmOpportunity.findMany({
    where: { tenantId, stage: "closed_won" },
    select: { value: true, createdAt: true, updatedAt: true },
  });

  const avgDealSize = opps.length
    ? Math.round(opps.reduce((s, o) => s + (o.value ?? 0), 0) / opps.length)
    : 0;
  const avgCycle = opps.length
    ? Math.round(opps.reduce((s, o) => s + ((o.updatedAt - o.createdAt) / 86400000), 0) / opps.length)
    : 0;
  const allOpps = await prisma.crmOpportunity.findMany({
    where: { tenantId },
    select: { stage: true },
  });
  const closed = allOpps.filter((o) => ["closed_won", "closed_lost"].includes(o.stage));
  const winRate = closed.length ? Math.round((opps.length / closed.length) * 100) : 0;

  return { avgDealSize, avgDealSizeFmt: fmtValue(avgDealSize), avgCycleDays: avgCycle, winRate };
};

export const getCrmAnalyticsWinLoss = async (tenantId) => {
  const opps = await prisma.crmOpportunity.findMany({
    where: { tenantId },
    select: { stage: true, value: true },
  });

  const won = opps.filter((o) => o.stage === "closed_won");
  const lost = opps.filter((o) => o.stage === "closed_lost");

  return {
    won: won.length, wonValue: won.reduce((s, o) => s + (o.value ?? 0), 0),
    lost: lost.length, lostValue: lost.reduce((s, o) => s + (o.value ?? 0), 0),
    reasons: [
      { reason: "Price", pct: 32 }, { reason: "Timing", pct: 24 },
      { reason: "Competitor", pct: 21 }, { reason: "No Decision", pct: 14 },
      { reason: "Missing Features", pct: 9 },
    ],
  };
};

// ── Opportunities ─────────────────────────────────────────────────────────────
export const getOpportunitiesSummary = async (tenantId) => {
  const opps = await prisma.crmOpportunity.findMany({
    where: { tenantId, status: "active" },
    select: { value: true, stage: true },
  });
  const total = opps.length;
  const value = opps.reduce((s, o) => s + (o.value ?? 0), 0);
  const won = opps.filter((o) => o.stage === "closed_won").length;
  return { total, value, valueFmt: fmtValue(value), won };
};

export const listOpportunities = async (tenantId, params = {}) => {
  const where = { tenantId };
  if (params.stage) where.stage = toDbStage(params.stage);
  const rows = await prisma.crmOpportunity.findMany({
    where, include: oppInclude,
    orderBy: { createdAt: "desc" },
  });
  return rows.map(oppShape);
};

export const createOpportunity = async (tenantId, data) => {
  const o = await prisma.crmOpportunity.create({
    data: {
      name: data.name,
      stage: toDbStage(data.stage ?? "Prospecting"),
      value: Number(data.value) || 0,
      probability: Number(data.probability) || 10,
      status: "active", tenantId,
      ...(data.ownerId ? { ownerId: data.ownerId } : {}),
    },
    include: oppInclude,
  });
  return oppShape(o);
};

// ── Renewals ──────────────────────────────────────────────────────────────────
export const listRenewals = async (tenantId) => {
  const opps = await prisma.crmOpportunity.findMany({
    where: { tenantId, stage: "closed_won" },
    include: oppInclude,
    orderBy: { updatedAt: "desc" },
  });

  return opps.map((o, i) => {
    const renewalMs = o.updatedAt.getTime() + (365 + i * 30) * 86400000;
    const renewalDate = new Date(renewalMs);
    const daysLeft = Math.round((renewalMs - Date.now()) / 86400000);
    return {
      id: o.id, name: o.name,
      account: extractAccount(o.name),
      owner: o.owner ? `${o.owner.firstName} ${o.owner.lastName}` : null,
      rawArr: o.value ?? 0, arrFmt: fmtValue(o.value),
      renewalDate: renewalDate.toISOString().slice(0, 10),
      daysLeft, health: daysLeft > 60 ? "green" : daysLeft > 30 ? "yellow" : "red",
      status: daysLeft > 0 ? "upcoming" : "overdue",
    };
  });
};

export const getRenewalsSummary = async (tenantId) => {
  const opps = await prisma.crmOpportunity.findMany({
    where: { tenantId, stage: "closed_won" },
    select: { value: true, updatedAt: true },
  });
  const total = opps.length;
  const totalArr = opps.reduce((s, o) => s + (o.value ?? 0), 0);
  const now = Date.now();
  const atRisk = opps.filter((o, i) => {
    const renewalMs = o.updatedAt.getTime() + (365 + i * 30) * 86400000;
    return (renewalMs - now) / 86400000 < 30;
  }).length;
  return { total, totalArr, totalArrFmt: fmtValue(totalArr), atRisk };
};

// ── Cases ─────────────────────────────────────────────────────────────────────
export const listCases = async (tenantId, params = {}) => {
  const where = { tenantId };
  if (params.status) where.status = params.status;
  const rows = await prisma.crmTicket.findMany({
    where, orderBy: { createdAt: "desc" },
  });
  return rows.map((t) => ({
    id: t.id, title: t.subject, description: t.customer_name,
    ticketNumber: t.ticket_number, category: t.category,
    status: t.status, priority: t.priority, slaStatus: t.sla_status,
    locked: false, approved: false,
    createdAt: t.createdAt, updatedAt: t.updatedAt,
  }));
};

export const getCase = async (tenantId, id) => {
  const t = await prisma.crmTicket.findFirst({ where: { id, tenantId } });
  if (!t) return null;
  return {
    id: t.id, title: t.subject, description: t.customer_name,
    ticketNumber: t.ticket_number, category: t.category,
    status: t.status, priority: t.priority, slaStatus: t.sla_status,
    locked: false, approved: false, notes: [],
    createdAt: t.createdAt, updatedAt: t.updatedAt,
  };
};

export const updateCase = async (tenantId, id, data) => {
  const update = {};
  if (data.status !== undefined) update.status = data.status;
  if (data.priority !== undefined) update.priority = data.priority;
  if (data.subject !== undefined) update.subject = data.subject;
  if (data.sla_status !== undefined) update.sla_status = data.sla_status;
  return prisma.crmTicket.update({ where: { id }, data: update });
};

export const addCaseNote = async (tenantId, id, data) => {
  const ticket = await prisma.crmTicket.findFirst({ where: { id, tenantId } });
  if (!ticket) throw new Error("Case not found");
  return { id, note: data.note ?? data.content ?? "", createdAt: new Date().toISOString() };
};

export const approveCase = async (tenantId, id) => {
  await prisma.crmTicket.update({ where: { id }, data: { status: "resolved" } });
  return { success: true };
};

export const lockCase = async (tenantId, id) => {
  await prisma.crmTicket.update({ where: { id }, data: { sla_status: "breached" } });
  return { success: true };
};

export const unlockCase = async (tenantId, id) => {
  await prisma.crmTicket.update({ where: { id }, data: { sla_status: "on_track" } });
  return { success: true };
};

// ── Playbooks (static) ────────────────────────────────────────────────────────
const STATIC_PLAYBOOKS = [
  { id: "pb-1", name: "Enterprise Onboarding", steps: 8, category: "Onboarding", active: true, description: "Full onboarding workflow for enterprise accounts" },
  { id: "pb-2", name: "SMB Quick Start", steps: 4, category: "Onboarding", active: true, description: "Streamlined onboarding for SMB customers" },
  { id: "pb-3", name: "Expansion & Upsell", steps: 6, category: "Growth", active: true, description: "Identify and execute upsell opportunities" },
  { id: "pb-4", name: "Churn Prevention", steps: 5, category: "Retention", active: true, description: "Early warning and intervention for at-risk accounts" },
  { id: "pb-5", name: "Competitive Displacement", steps: 7, category: "Sales", active: false, description: "Win strategy when competing against key rivals" },
  { id: "pb-6", name: "Executive Business Review", steps: 3, category: "Success", active: true, description: "Quarterly executive alignment and value review" },
];

export const listPlaybooks  = () => Promise.resolve(STATIC_PLAYBOOKS);
export const getPlaybook    = (tenantId, id) => Promise.resolve(STATIC_PLAYBOOKS.find((p) => p.id === id) ?? null);
export const runPlaybook    = (tenantId, id) => Promise.resolve({ started: true, playbookId: id, startedAt: new Date().toISOString() });
export const createPlaybook = (tenantId, data) =>
  Promise.resolve({ id: `pb-${Date.now()}`, ...data, active: true, steps: data.steps ?? 1 });

// ── Partners (Contact enriched) ───────────────────────────────────────────────
export const listPartners = async (tenantId) => {
  const contacts = await prisma.contact.findMany({
    where: { tenantId },
    take: 10,
    orderBy: { createdAt: "desc" },
  });
  return contacts.map((c, i) => ({
    id: c.id, name: c.name, email: c.email,
    type: i % 3 === 0 ? "Reseller" : i % 3 === 1 ? "Referral" : "Technology",
    status: "active", tier: i < 3 ? "Gold" : i < 6 ? "Silver" : "Bronze",
    revenue: (i + 1) * 25000,
  }));
};

export const getPartner = async (tenantId, id) => {
  const c = await prisma.contact.findFirst({ where: { id, tenantId } });
  return c ? { ...c, type: "Partner", status: "active", tier: "Gold" } : null;
};

// ── Meetings (CrmFollowUp) ────────────────────────────────────────────────────
export const listMeetings = async (tenantId, params = {}) => {
  const where = { tenantId, follow_up_type: "meeting" };
  const rows = await prisma.crmFollowUp.findMany({
    where,
    include: { user: { select: { firstName: true, lastName: true } } },
    orderBy: { scheduled_date: "asc" },
    take: 50,
  });
  return rows.map((m) => ({
    id: m.id, title: m.notes ?? "Meeting", notes: m.notes,
    scheduledAt: m.scheduled_date, status: m.status,
    owner: m.user ? `${m.user.firstName} ${m.user.lastName}` : null,
    type: m.follow_up_type,
  }));
};

export const createMeeting = async (tenantId, data) => {
  const firstUser = data.userId
    ? null
    : await prisma.user.findFirst({ where: { tenantId } });
  return prisma.crmFollowUp.create({
    data: {
      customer_name: data.customer_name ?? data.title ?? "Meeting",
      notes: data.notes ?? data.title ?? "",
      follow_up_type: "meeting", status: "scheduled",
      scheduled_date: data.scheduledAt ? new Date(data.scheduledAt) : new Date(),
      tenantId, userId: data.userId ?? firstUser?.id ?? "",
    },
  });
};

// ── Reps ──────────────────────────────────────────────────────────────────────
export const listReps = async (tenantId) => {
  const users = await prisma.user.findMany({
    where: { tenantId },
    select: { id: true, firstName: true, lastName: true, email: true, department: true },
  });

  const results = await Promise.all(
    users.map(async (u) => {
      const opps = await prisma.crmOpportunity.findMany({
        where: { tenantId, ownerId: u.id },
        select: { value: true, stage: true },
      });
      const pipeline = opps.reduce((s, o) => s + (o.value ?? 0), 0);
      const won = opps.filter((o) => o.stage === "closed_won");
      const closed = opps.filter((o) => ["closed_won", "closed_lost"].includes(o.stage));
      const quota = 100000;

      return {
        id: u.id, name: `${u.firstName} ${u.lastName}`, email: u.email,
        department: u.department ?? "Sales",
        openDeals: opps.filter((o) => !["closed_won", "closed_lost"].includes(o.stage)).length,
        pipeline, pipelineFmt: fmtValue(pipeline),
        quota, quotaFmt: fmtValue(quota),
        attainment: quota > 0 ? Math.round((pipeline / quota) * 100) : 0,
        winRate: closed.length ? Math.round((won.length / closed.length) * 100) : 0,
      };
    })
  );

  return results;
};

export const getRepsSummary = async (tenantId) => {
  const users = await prisma.user.findMany({ where: { tenantId }, select: { id: true } });
  const total = users.length;
  const quota = total * 100000;

  const opps = await prisma.crmOpportunity.findMany({
    where: { tenantId, stage: "closed_won" },
    select: { value: true },
  });
  const committed = opps.reduce((s, o) => s + (o.value ?? 0), 0);

  return {
    total, quota, quotaFmt: fmtValue(quota),
    committed, committedFmt: fmtValue(committed),
    attainment: quota > 0 ? Math.round((committed / quota) * 100) : 0,
  };
};

// ── Integrations (static) ─────────────────────────────────────────────────────
const STATIC_INTEGRATIONS = [
  { id: "int-1", name: "Salesforce", status: "connected", type: "CRM", lastSync: new Date(Date.now() - 3600000).toISOString(), records: 1240 },
  { id: "int-2", name: "HubSpot", status: "connected", type: "Marketing", lastSync: new Date(Date.now() - 7200000).toISOString(), records: 580 },
  { id: "int-3", name: "Slack", status: "connected", type: "Messaging", lastSync: new Date(Date.now() - 1800000).toISOString(), records: 0 },
  { id: "int-4", name: "Gmail", status: "connected", type: "Email", lastSync: new Date(Date.now() - 900000).toISOString(), records: 3200 },
  { id: "int-5", name: "LinkedIn Sales Navigator", status: "disconnected", type: "Prospecting", lastSync: null, records: 0 },
  { id: "int-6", name: "ZoomInfo", status: "disconnected", type: "Data Enrichment", lastSync: null, records: 0 },
  { id: "int-7", name: "DocuSign", status: "connected", type: "eSignature", lastSync: new Date(Date.now() - 86400000).toISOString(), records: 45 },
  { id: "int-8", name: "Stripe", status: "connected", type: "Billing", lastSync: new Date(Date.now() - 3600000).toISOString(), records: 890 },
];

export const listIntegrations = () => Promise.resolve(STATIC_INTEGRATIONS);

export const getIntegrationsTimeline = () =>
  Promise.resolve([
    { type: "sync", message: "Salesforce sync completed (1240 records)", timestamp: new Date(Date.now() - 3600000).toISOString() },
    { type: "sync", message: "HubSpot contact sync (580 records)", timestamp: new Date(Date.now() - 7200000).toISOString() },
    { type: "alert", message: "LinkedIn disconnected — token expired", timestamp: new Date(Date.now() - 86400000).toISOString() },
    { type: "sync", message: "Gmail email activity synced", timestamp: new Date(Date.now() - 900000).toISOString() },
  ]);

export const getLeadSources = () =>
  Promise.resolve([
    { source: "Inbound Web", count: 42, pct: 35 },
    { source: "Outbound SDR", count: 28, pct: 23 },
    { source: "Partner Referral", count: 22, pct: 18 },
    { source: "Marketing Campaign", count: 18, pct: 15 },
    { source: "Event / Conference", count: 11, pct: 9 },
  ]);

export const getSyncHealth  = () => Promise.resolve({ status: "healthy", connected: 6, total: 8, lastCheck: new Date().toISOString() });
export const syncIntegrations = () => Promise.resolve({ synced: true, syncedAt: new Date().toISOString(), message: "All integrations synced successfully." });

// ── Database ──────────────────────────────────────────────────────────────────
export const getDatabaseRecords = async (tenantId, params = {}) => {
  const [opps, tasks, tickets, contacts, followups] = await Promise.all([
    prisma.crmOpportunity.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.crmTask.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.crmTicket.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.contact.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.crmFollowUp.findMany({ where: { tenantId }, orderBy: { scheduled_date: "desc" }, take: 10 }),
  ]);

  const all = [
    ...opps.map((o) => ({ ...o, _type: "opportunity", _sortDate: o.createdAt })),
    ...tasks.map((t) => ({ ...t, _type: "task", _sortDate: t.createdAt })),
    ...tickets.map((t) => ({ ...t, _type: "ticket", _sortDate: t.createdAt })),
    ...contacts.map((c) => ({ ...c, _type: "contact", _sortDate: c.createdAt })),
    ...followups.map((f) => ({ ...f, _type: "followup", _sortDate: f.scheduled_date })),
  ].sort((a, b) => new Date(b._sortDate) - new Date(a._sortDate));

  return all;
};

export const getDatabaseUsage = async (tenantId) => {
  const [opps, tasks, tickets, contacts, followups, auditLogs] = await Promise.all([
    prisma.crmOpportunity.count({ where: { tenantId } }),
    prisma.crmTask.count({ where: { tenantId } }),
    prisma.crmTicket.count({ where: { tenantId } }),
    prisma.contact.count({ where: { tenantId } }),
    prisma.crmFollowUp.count({ where: { tenantId } }),
    prisma.auditLog.count({ where: { tenantId } }),
  ]);

  const total = opps + tasks + tickets + contacts + followups + auditLogs;
  const storageMB = (total * 0.004).toFixed(1);

  return {
    total, storage: `${storageMB} MB`,
    breakdown: { opportunities: opps, tasks, tickets, contacts, followups, auditLogs },
  };
};

export const getDatabaseAudit = async (tenantId, params = {}) => {
  const rows = await prisma.auditLog.findMany({
    where: { tenantId },
    include: { user: { select: { firstName: true, lastName: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: Number(params.limit) || 50,
  });
  return rows.map((l) => ({
    id: l.id, action: l.action, resource: l.resource, resourceId: l.resourceId,
    detail: l.detail,
    user: l.user ? `${l.user.firstName} ${l.user.lastName}` : null,
    email: l.user?.email ?? null,
    createdAt: l.createdAt,
  }));
};

// ── Teams ─────────────────────────────────────────────────────────────────────
export const listTeams = async (tenantId) => {
  const users = await prisma.user.findMany({
    where: { tenantId },
    select: { id: true, firstName: true, lastName: true, email: true, department: true },
  });

  const byDept = {};
  for (const u of users) {
    const dept = u.department ?? "General";
    if (!byDept[dept]) byDept[dept] = { name: dept, members: [] };
    byDept[dept].members.push({ id: u.id, name: `${u.firstName} ${u.lastName}`, email: u.email });
  }

  return Object.values(byDept).map((t, i) => ({
    id: `team-${i}`, name: t.name, members: t.members, size: t.members.length,
  }));
};

export const createTeam = (tenantId, data) =>
  Promise.resolve({ id: `team-${Date.now()}`, ...data, size: 0, members: [] });
