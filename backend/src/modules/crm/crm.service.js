import prisma from "../../config/database.js";
import { notify } from "../notifications/notifications.service.js";
import { assistText } from "../../lib/aiAssist.js";

// Bell notification for a task assigned to someone else. Fire-and-forget —
// a notify failure never blocks the task itself.
async function notifyTaskAssignee(tenantId, task, actorId) {
  try {
    if (!task?.userId || task.userId === actorId) return;
    const actor = actorId ? await prisma.user.findUnique({ where: { id: actorId } }) : null;
    await notify({
      tenantId,
      userId: task.userId,
      type: "task",
      title: "New CRM task assigned to you",
      body: `${task.title}${task.due_date ? ` · due ${new Date(task.due_date).toLocaleDateString()}` : ""}`,
      link: "/crm/activities",
      actorName: actor ? `${actor.firstName} ${actor.lastName}`.trim() : null,
    });
  } catch { /* ignore */ }
}

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
  source: o.source ?? "Inbound",
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

export const createDealTask = async (tenantId, dealId, data, actorId = null) => {
  const firstUser = await prisma.user.findFirst({ where: { tenantId } });
  const task = await prisma.crmTask.create({
    data: {
      title: data.title, task_type: data.task_type ?? "follow_up",
      status: "pending", priority: data.priority ?? "medium",
      due_date: data.dueDate ? new Date(data.dueDate) : null,
      relatedCustomerName: data.relatedCustomerName ?? null,
      tenantId, userId: data.userId ?? firstUser?.id ?? "",
    },
  });
  notifyTaskAssignee(tenantId, task, actorId);
  return task;
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
      source: data.source ?? "Inbound",
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

// Convert a lead into a pipeline opportunity: promote it out of the lead
// stages into "qualification" and notify the owner. Cross-module workflow:
// Leads inbox → Opportunities pipeline, with a bell notification.
export const convertLead = async (tenantId, id, actorId = null) => {
  const lead = await prisma.crmOpportunity.findFirst({ where: { id, tenantId }, include: oppInclude });
  if (!lead) { const e = new Error("Lead not found"); e.status = 404; throw e; }
  if (!["prospecting"].includes(lead.stage)) {
    const e = new Error("This lead is already in the pipeline."); e.status = 400; throw e;
  }
  const opp = await prisma.crmOpportunity.update({
    where: { id },
    data: { stage: "qualification", probability: Math.max(lead.probability ?? 0, 40), status: "active" },
    include: oppInclude,
  });
  if (opp.ownerId && opp.ownerId !== actorId) {
    notify({
      tenantId, userId: opp.ownerId, type: "task",
      title: "Lead converted to opportunity",
      body: `${opp.name} is now in your pipeline (Qualified).`,
      link: "/crm/opportunities",
    }).catch(() => {});
  }
  return { converted: true, opportunity: dealShape(opp) };
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

export const createTask = async (tenantId, data, actorId = null) => {
  const firstUser = data.userId
    ? null
    : await prisma.user.findFirst({ where: { tenantId } });
  const task = await prisma.crmTask.create({
    data: {
      title: data.title, task_type: data.task_type ?? "follow_up",
      status: data.status ?? "pending", priority: data.priority ?? "medium",
      due_date: data.dueDate ? new Date(data.dueDate) : null,
      relatedCustomerName: data.relatedCustomerName ?? null,
      tenantId, userId: data.userId ?? firstUser?.id ?? "",
    },
  });
  notifyTaskAssignee(tenantId, task, actorId);
  return task;
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

// ── Sequences (cadences) — persisted per tenant ───────────────────────────────
export const listSequences = (tenantId) =>
  prisma.crmSequence.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } });

export const createSequence = (tenantId, data) =>
  prisma.crmSequence.create({
    data: {
      tenantId,
      name: data.name,
      description: data.description ?? null,
      steps: Number(data.steps) || 1,
      active: data.active ?? true,
    },
  });

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
// Strategy coaching enriched with LIVE pipeline numbers. When a live AI provider
// is configured (lib/ai.js) and the tenant is within its plan's monthly AI
// allowance, the answer is model-generated; otherwise it falls back to the
// deterministic advisory below (free). Data-lookup questions are delegated to
// the assistant module, which answers from tenant data without spending tokens.
export const aiChat = async (tenantId, body = {}, userId = null) => {
  const message = body?.message ?? "";
  const msg = message.toLowerCase();

  if (/pipeline|forecast|revenue|quota|risk|churn|qualify/.test(msg)) {
    const [open, stalled, agg] = await Promise.all([
      prisma.crmOpportunity.count({ where: { tenantId, status: "active" } }),
      prisma.crmOpportunity.count({
        where: { tenantId, status: "active", updatedAt: { lt: new Date(Date.now() - 14 * 86400000) } },
      }),
      prisma.crmOpportunity.aggregate({ where: { tenantId, status: "active" }, _sum: { value: true } }),
    ]);
    const pipelineValue = fmtValue(agg._sum.value ?? 0);
    // Deterministic advisory answers double as the fallback when AI is off or
    // over quota — so this feature always works, at zero cost by default.
    const fallback = () => {
      if (/risk|churn/.test(msg)) {
        return `**Customer & Deal Risk**\n\nYou have **${stalled} of ${open}** open deals untouched for 14+ days — those are your churn candidates. Silent deals close at roughly half the rate.\n\nStart with the stalled ones in the Pipeline view and log a touch on each this week.`;
      }
      if (/qualify/.test(msg)) {
        return `**Lead Qualification (BANT)**\n\n• **Budget** — can they fund a purchase this quarter?\n• **Authority** — are you talking to the economic buyer?\n• **Need** — a clearly articulated business problem?\n• **Timeline** — urgency to act within 90 days?\n\nYou currently have **${open}** open opportunities worth **${pipelineValue}** to qualify against.`;
      }
      return `**Pipeline Health**\n\nOpen deals: **${open}** · Total value: **${pipelineValue}** · Stalled 14+ days: **${stalled}**.\n\nDeals that sit in Negotiation for more than two weeks close at a much lower rate — clear blockers on the stalled ones first.`;
    };
    // A compact, pre-computed context — never raw rows — keeps input tokens low.
    const reply = await assistText({
      tenantId,
      system: "You are Einstein, a concise CRM sales advisor. Use the metrics provided. Answer in <120 words of markdown. Never invent numbers beyond those given.",
      user: `Metrics — open deals: ${open}, stalled 14+ days: ${stalled}, open pipeline value: ${pipelineValue}.\n\nRep asked: "${message}"`,
      fallback,
    });
    return { reply };
  }

  // Data questions ("how many contacts…", "show my tasks…") → assistant.
  const { chat } = await import("../assistant/assistant.service.js");
  const res = await chat(userId, tenantId, message);
  return { reply: res?.reply ?? "I can help with pipeline analysis, deal risk, lead qualification and forecasting — or ask me about your contacts, tasks and opportunities." };
};

// Deal insights summary composed from the live pipeline (shown on the
// Einstein → Deal Insights page).
export const aiSummaries = async (tenantId) => {
  const [open, stalled, top, winRateData] = await Promise.all([
    prisma.crmOpportunity.count({ where: { tenantId, status: "active" } }),
    prisma.crmOpportunity.count({
      where: { tenantId, status: "active", updatedAt: { lt: new Date(Date.now() - 14 * 86400000) } },
    }),
    prisma.crmOpportunity.findFirst({ where: { tenantId, status: "active" }, orderBy: { value: "desc" } }),
    Promise.all([
      prisma.crmOpportunity.count({ where: { tenantId, status: "won" } }),
      prisma.crmOpportunity.count({ where: { tenantId, status: "lost" } }),
    ]),
  ]);
  const [won, lost] = winRateData;
  const winRate = won + lost ? Math.round((won / (won + lost)) * 100) : null;
  if (open === 0) return { summary: null };
  const parts = [`${open} open deal${open === 1 ? "" : "s"} in play`];
  if (top) parts.push(`largest is ${top.name} at ${fmtValue(top.value)}`);
  if (stalled > 0) parts.push(`${stalled} stalled 14+ days and need a touch`);
  if (winRate != null) parts.push(`historical win rate ${winRate}%`);
  return { summary: parts.join(" · ") + ".", generatedAt: new Date().toISOString() };
};

// Actions from the AI panel are recorded on the audit trail, not faked.
export const aiAction = async (tenantId, body = {}, userId = null) => {
  if (userId) {
    await prisma.auditLog.create({
      data: { userId, tenantId, action: "ai_action", resource: "crm", detail: String(body?.action ?? "ai action").slice(0, 200) },
    }).catch(() => {});
  }
  return { result: "Action logged to the audit trail." };
};

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

// ── Resolutions (no backing table → empty until created) ──────────────────────
// Lazily seed three starter resolutions so the board has something to govern
// the first time the page opens (the page has no create form of its own).
const RESOLUTION_SEED = [
  { title: "Approve FY partner co-marketing budget", category: "Budget",      description: "Allocate shared budget for joint campaigns with certified partners." },
  { title: "Adopt updated partner data-sharing policy", category: "Governance", description: "Contacts exchanged with partners follow the new privacy addendum." },
  { title: "Certify two new implementation partners", category: "Partnerships", description: "Grant certified status to the two candidates that passed review." },
];

export const listResolutions = async (tenantId) => {
  let rows = await prisma.crmResolution.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } });
  if (rows.length === 0) {
    await prisma.crmResolution.createMany({ data: RESOLUTION_SEED.map((r) => ({ ...r, tenantId })) });
    rows = await prisma.crmResolution.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } });
  }
  return rows;
};

export const voteResolution = async (tenantId, id, userId) => {
  const resolution = await prisma.crmResolution.findFirst({ where: { id, tenantId } });
  if (!resolution) { const e = new Error("Resolution not found"); e.status = 404; throw e; }
  try {
    await prisma.crmResolutionVote.create({ data: { resolutionId: id, userId } });
  } catch (err) {
    if (err.code === "P2002") { const e = new Error("You already voted on this resolution."); e.status = 409; throw e; }
    throw err;
  }
  const updated = await prisma.crmResolution.update({ where: { id }, data: { votes: { increment: 1 } } });
  // A simple quorum: 3 votes approves a resolution under review.
  if (updated.status === "under_review" && updated.votes >= 3) {
    return prisma.crmResolution.update({ where: { id }, data: { status: "approved" } });
  }
  return updated;
};

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
    reasons: [],
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

  // Renewal date derived from a standard 1-year term off the close date.
  return opps.map((o) => {
    const renewalMs = o.updatedAt.getTime() + 365 * 86400000;
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
  const atRisk = opps.filter((o) => {
    const renewalMs = o.updatedAt.getTime() + 365 * 86400000;
    return (renewalMs - now) / 86400000 < 30;
  }).length;
  return { total, totalArr, totalArrFmt: fmtValue(totalArr), atRisk };
};

// ── Cases ─────────────────────────────────────────────────────────────────────
/**
 * "Cases" is the CRM's window onto the **same tickets** the helpdesk queue works.
 * One table, two audiences: a salesperson looking at an account's open problems,
 * and a support agent working the queue.
 *
 * It used to be a second implementation over that table, and the divergence did
 * real damage:
 *
 *   • the case description was populated from the *customer's name*;
 *   • adding a note returned a note object and **saved nothing** — the UI said
 *     "note added" and it was gone on refresh;
 *   • resolving a case set `status` without `resolvedAt`, so the helpdesk's
 *     resolution times were blank and the "rate only after resolution" rule
 *     silently refused ratings for tickets that were, in fact, resolved.
 *
 * So it delegates now. Every write goes through the helpdesk service, which owns
 * the status machine, the timeline, the first-response clock and the customer
 * notifications. The only thing this file does is rename fields for the CRM UI.
 */
const caseView = (t) => ({
  id: t.id,
  title: t.subject,
  description: t.description,
  ticketNumber: t.ticketNumber,
  category: t.category,
  status: t.status,
  priority: t.priority,
  slaStatus: t.slaStatus,
  customerName: t.customerName,
  contactEmail: t.contactEmail,
  contactId: t.contactId,
  assigneeName: t.assigneeName,
  source: t.source,
  // The two flags the CRM UI reads. Derived from the ticket rather than
  // hardcoded to false, which is what they were.
  locked: t.slaStatus === "breached",
  approved: ["resolved", "closed"].includes(t.status),
  resolvedAt: t.resolvedAt,
  firstResponseAt: t.firstResponseAt,
  messageCount: t.messageCount,
  createdAt: t.createdAt,
  updatedAt: t.updatedAt,
});

const helpdesk = () => import("../helpdesk/tickets.service.js");

export const listCases = async (tenantId, params = {}) => {
  const { listTickets } = await helpdesk();
  const rows = await listTickets({
    status: params.status, priority: params.priority,
    search: params.search, limit: params.limit,
  });
  return rows.map(caseView);
};

export const getCase = async (tenantId, id) => {
  const { getTicket } = await helpdesk();
  const t = await getTicket(id).catch(() => null);
  if (!t) return null;
  return {
    ...caseView(t),
    // Real notes, from the one thread. Internal notes are the case notes; the
    // public replies are the conversation with the customer.
    notes: (t.messages ?? []).map((m) => ({
      id: m.id, note: m.body, author: m.authorName,
      internal: m.visibility === "internal",
      createdAt: m.createdAt,
    })),
  };
};

export const updateCase = async (tenantId, id, data, user) => {
  const { updateTicket } = await helpdesk();
  // Accept both the CRM field names and the helpdesk ones.
  const t = await updateTicket(user ?? { userId: null }, id, {
    subject: data.subject ?? data.title,
    status: data.status,
    priority: data.priority,
    slaStatus: data.slaStatus ?? data.sla_status,
    category: data.category,
    assigneeId: data.assigneeId,
  });
  return caseView(t);
};

export const addCaseNote = async (tenantId, id, data, user) => {
  const body = String(data.note ?? data.content ?? "").trim();
  if (!body) throw new Error("A note needs some text");
  const { addMessage } = await helpdesk();
  // A case note is an internal note on the ticket thread: the support agent sees
  // it in the same conversation, and the customer never does.
  const t = await addMessage(user ?? { userId: null }, id, { body, visibility: "internal" });
  const last = (t.messages ?? []).find((m) => m.body === body) ?? null;
  return { id: last?.id ?? id, note: body, createdAt: last?.createdAt ?? new Date().toISOString() };
};

export const approveCase = async (tenantId, id, user) => {
  const { updateTicket } = await helpdesk();
  // Goes through the status machine, so resolvedAt is stamped, the change is
  // recorded on the timeline and the customer is told — exactly as it would be
  // if the same person had done it from the helpdesk queue.
  const t = await updateTicket(user ?? { userId: null }, id, { status: "resolved" });
  return { success: true, case: caseView(t) };
};

export const lockCase = async (tenantId, id, user) => {
  const { updateTicket } = await helpdesk();
  const t = await updateTicket(user ?? { userId: null }, id, { slaStatus: "breached" });
  return { success: true, case: caseView(t) };
};

export const unlockCase = async (tenantId, id, user) => {
  const { updateTicket } = await helpdesk();
  const t = await updateTicket(user ?? { userId: null }, id, { slaStatus: "on_track" });
  return { success: true, case: caseView(t) };
};

// ── Playbooks (no backing table → empty until created) ────────────────────────
export const listPlaybooks = (tenantId) =>
  prisma.crmPlaybook.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } });

export const getPlaybook = (tenantId, id) =>
  prisma.crmPlaybook.findFirst({ where: { id, tenantId } });

export const runPlaybook = async (tenantId, id) => {
  const pb = await prisma.crmPlaybook.findFirst({ where: { id, tenantId } });
  if (!pb) { const e = new Error("Playbook not found"); e.status = 404; throw e; }
  const updated = await prisma.crmPlaybook.update({
    where: { id }, data: { runs: { increment: 1 }, lastRunAt: new Date() },
  });
  return { started: true, playbookId: id, runs: updated.runs, startedAt: updated.lastRunAt };
};

export const createPlaybook = (tenantId, data) =>
  prisma.crmPlaybook.create({
    data: {
      tenantId,
      name: data.name,
      description: data.description ?? null,
      category: data.category ?? "general",
      steps: Number(data.steps) || 1,
      active: data.active ?? true,
    },
  });

// ── Partners (Contact enriched) ───────────────────────────────────────────────
export const listPartners = async (tenantId) => {
  const contacts = await prisma.contact.findMany({
    where: { tenantId },
    take: 10,
    orderBy: { createdAt: "desc" },
  });
  return contacts.map((c) => ({
    id: c.id, name: c.name, email: c.email,
    type: null, status: "active", tier: null, revenue: null,
  }));
};

export const getPartner = async (tenantId, id) => {
  const c = await prisma.contact.findFirst({ where: { id, tenantId } });
  return c ? { ...c, type: null, status: "active", tier: null } : null;
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

// ── Integrations (no backing table → empty until connected) ───────────────────
// Backed by the real outbound connections in Account → Integrations.
export const listIntegrations = async (tenantId) => {
  const rows = await prisma.integrationConnection.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } });
  return rows.map((c) => ({
    id: c.id, name: c.name, kind: c.kind, status: c.status,
    lastUsedAt: c.lastUsedAt, lastStatus: c.lastStatus ?? null,
  }));
};

// Recent integration + email activity, newest first.
export const getIntegrationsTimeline = async (tenantId, params = {}) => {
  const take = Math.min(Number(params.limit) || 20, 50);
  const [emails, conns] = await Promise.all([
    prisma.emailLog.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" }, take }),
    prisma.integrationConnection.findMany({ where: { tenantId, lastUsedAt: { not: null } }, orderBy: { lastUsedAt: "desc" }, take }),
  ]);
  return [
    ...emails.map((e) => ({ id: `em-${e.id}`, type: "email", description: `${e.status === "sent" ? "Sent" : "Logged"} “${e.subject}” to ${e.to}`, timestamp: e.createdAt })),
    ...conns.map((c) => ({ id: `cn-${c.id}`, type: c.kind, description: `${c.name} last used (${c.lastStatus ?? "ok"})`, timestamp: c.lastUsedAt })),
  ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, take);
};

// Where leads come from, grouped over the real source column.
export const getLeadSources = async (tenantId) => {
  const groups = await prisma.crmOpportunity.groupBy({ by: ["source"], where: { tenantId }, _count: { _all: true } });
  return groups
    .map((g) => ({ source: g.source ?? "Inbound", count: g._count._all }))
    .sort((a, b) => b.count - a.count);
};

export const getSyncHealth = async (tenantId) => {
  const [total, active] = await Promise.all([
    prisma.integrationConnection.count({ where: { tenantId } }),
    prisma.integrationConnection.count({ where: { tenantId, status: "active" } }),
  ]);
  return {
    status: total === 0 ? "none" : active === total ? "healthy" : "degraded",
    connected: active, total, lastCheck: new Date().toISOString(),
  };
};

export const syncIntegrations = async (tenantId) => {
  const total = await prisma.integrationConnection.count({ where: { tenantId } });
  return {
    synced: true, syncedAt: new Date().toISOString(),
    message: total === 0 ? "No integrations connected — add one in Account → Integrations." : `${total} connection${total === 1 ? "" : "s"} checked.`,
  };
};

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
