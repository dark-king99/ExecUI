import prisma from "../../config/database.js";
import { assistText } from "../../lib/aiAssist.js";

// Real-data-only service. No seeded/demo records, no fabricated metrics —
// endpoints return the tenant's actual data (or empty) so the UI reflects
// reality. Features without a backing table return empty results.

const fmtCurrency = (v) => {
  if (!v && v !== 0) return null;
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}k`;
  return `$${v}`;
};

// ── Campaigns ─────────────────────────────────────────────────────────────────
export const listCampaigns = async (tenantId, params = {}) => {
  const where = { tenantId };
  if (params.status && params.status !== "all") where.status = params.status;
  const rows = await prisma.marketingCampaign.findMany({ where, orderBy: { createdAt: "desc" } });
  return rows.map((c) => ({
    ...c,
    budgetFmt:  fmtCurrency(c.budget),
    spentFmt:   fmtCurrency(c.spent),
    revenueFmt: fmtCurrency(c.revenue),
  }));
};

export const getCampaign = async (tenantId, id) =>
  prisma.marketingCampaign.findFirst({ where: { id, tenantId } });

export const createCampaign = async (tenantId, data) =>
  prisma.marketingCampaign.create({
    data: {
      name:      data.name,
      objective: data.objective ?? "lead_generation",
      channel:   data.channel   ?? "email",
      status:    "draft",
      budget:    Number(data.budget) || 0,
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate:   data.endDate   ? new Date(data.endDate)   : null,
      tenantId,
    },
  });

export const updateCampaign = async (tenantId, id, data) => {
  const update = {};
  ["name","objective","channel","status","budget","spent","leads","clicks","opens","conversions","revenue","ctr","openRate","roi"].forEach((k) => {
    if (data[k] !== undefined) update[k] = data[k];
  });
  if (data.startDate) update.startDate = new Date(data.startDate);
  if (data.endDate)   update.endDate   = new Date(data.endDate);
  return prisma.marketingCampaign.update({ where: { id }, data: update });
};

export const startCampaign = async (tenantId, id) => {
  await prisma.marketingCampaign.update({ where: { id }, data: { status: "active", startDate: new Date() } });
  return { started: true };
};

export const pauseCampaign = async (tenantId, id) => {
  await prisma.marketingCampaign.update({ where: { id }, data: { status: "paused" } });
  return { paused: true };
};

export const getCampaignSummary = async (tenantId) => {
  const campaigns = await prisma.marketingCampaign.findMany({ where: { tenantId } });
  const totalRevenue = campaigns.reduce((s, c) => s + (c.revenue ?? 0), 0);
  const totalSpend   = campaigns.reduce((s, c) => s + (c.spent   ?? 0), 0);
  return {
    total:          campaigns.length,
    active:         campaigns.filter((c) => c.status === "active").length,
    paused:         campaigns.filter((c) => c.status === "paused").length,
    completed:      campaigns.filter((c) => c.status === "completed").length,
    activeJourneys: campaigns.filter((c) => c.status === "active").length,
    liveContacts:   campaigns.filter((c) => c.status === "active").reduce((s, c) => s + (c.leads ?? 0), 0),
    totalRevenue,   totalSpend,
    totalRevenueFmt: fmtCurrency(totalRevenue),
    totalSpendFmt:   fmtCurrency(totalSpend),
    roas: totalSpend > 0 ? Math.round((totalRevenue / totalSpend) * 10) / 10 : 0,
  };
};

// ── Attribution (no backing table → empty until a data source is connected) ───
export const getAttributionChannels = () => Promise.resolve([]);
export const getAttributionSummary  = () => Promise.resolve({
  totalRevenue: 0, totalSpend: 0, roas: 0, avgLtv: null, cac: null,
  totalRevenueFmt: null, totalSpendFmt: null,
});
export const getAttributionModels = () => Promise.resolve([]);
export const getAttributionLtvCac = () => Promise.resolve({ ltv: null, cac: null, ltvCacRatio: null, bySegment: {}, cacByChannel: {} });

// ── Audiences ─────────────────────────────────────────────────────────────────
export const listAudiences = async (tenantId, params = {}) => {
  const where = { tenantId };
  if (params.type && params.type !== "all") where.type = params.type;
  return prisma.marketingAudience.findMany({ where, orderBy: { createdAt: "desc" } });
};

export const getAudience = async (tenantId, id) =>
  prisma.marketingAudience.findFirst({ where: { id, tenantId } });

export const createAudience = async (tenantId, data) =>
  prisma.marketingAudience.create({
    data: {
      name:        data.name,
      type:        data.type ?? "behavioral",
      size:        Number(data.size) || 0,
      description: data.description ?? null,
      status:      "draft",
      tenantId,
    },
  });

export const activateAudience = async (tenantId, id) => {
  await prisma.marketingAudience.update({ where: { id }, data: { status: "active" } });
  return { activated: true };
};

export const createLookalikeAudience = async (tenantId, id) => {
  const source = await prisma.marketingAudience.findFirst({ where: { id, tenantId } });
  return prisma.marketingAudience.create({
    data: {
      name:        `Lookalike — ${source?.name ?? "Audience"}`,
      type:        "lookalike",
      size:        0,
      description: `Lookalike audience modelled on "${source?.name ?? "source"}"`,
      status:      "draft",
      tenantId,
    },
  });
};

export const getAudienceOverlap = async (tenantId, id) => ({ overlap: null, audienceId: id });

// ── Analytics (real campaign data; no time-series table → empty trend) ─────────
export const getMarketingAnalyticsSummary = async (tenantId) => {
  const all = await prisma.marketingCampaign.findMany({ where: { tenantId } });
  const totalRevenue     = all.reduce((s, c) => s + (c.revenue ?? 0), 0);
  const totalSpend       = all.reduce((s, c) => s + (c.spent ?? 0), 0);
  const totalConversions = all.reduce((s, c) => s + (c.conversions ?? 0), 0);
  const active           = all.filter((c) => c.status === "active");
  return {
    totalRevenue, totalSpend,
    roas:             totalSpend > 0 ? Math.round((totalRevenue / totalSpend) * 10) / 10 : 0,
    totalConversions,
    activeJourneys:   active.length,
    liveContacts:     active.reduce((s, c) => s + (c.leads ?? 0), 0),
    totalRevenueFmt:  fmtCurrency(totalRevenue),
    totalSpendFmt:    fmtCurrency(totalSpend),
  };
};

export const getMarketingAnalyticsTrend = async () => Promise.resolve([]);
export const getMarketingChannelPerf    = async () => Promise.resolve([]);

// ── Experiments ───────────────────────────────────────────────────────────────
export const listExperiments = async (tenantId, params = {}) => {
  const where = { tenantId };
  if (params.status && params.status !== "all") where.status = params.status;
  const rows = await prisma.marketingExperiment.findMany({ where, orderBy: { createdAt: "desc" } });
  return rows.map((e) => ({ ...e, variants: Array.isArray(e.variants) ? e.variants : [] }));
};

export const getExperiment = async (tenantId, id) => {
  const e = await prisma.marketingExperiment.findFirst({ where: { id, tenantId } });
  if (!e) return null;
  return { ...e, variants: Array.isArray(e.variants) ? e.variants : [] };
};

export const createExperiment = async (tenantId, data) =>
  prisma.marketingExperiment.create({
    data: {
      name:       data.name,
      type:       data.type   ?? "a/b",
      metric:     data.metric ?? "conversion_rate",
      hypothesis: data.hypothesis ?? null,
      status:     "draft",
      variants:   [
        { name: "Control",   conversions: 0, visitors: 0, rate: 0 },
        { name: "Variant A", conversions: 0, visitors: 0, rate: 0 },
      ],
      tenantId,
    },
  });

export const startExperiment = async (tenantId, id) => {
  await prisma.marketingExperiment.update({ where: { id }, data: { status: "running" } });
  return { started: true };
};

export const pauseExperiment = async (tenantId, id) => {
  await prisma.marketingExperiment.update({ where: { id }, data: { status: "paused" } });
  return { paused: true };
};

// ── Profiles (derived from real Contact records) ──────────────────────────────
export const searchProfiles = async (tenantId, params = {}) => {
  const q = params.q ?? "";
  const contacts = await prisma.contact.findMany({
    where: {
      tenantId,
      ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } : {}),
    },
    take: 20,
    orderBy: { createdAt: "desc" },
  });
  return contacts.map((c) => ({ id: c.id, name: c.name, email: c.email, company: null, score: null }));
};

export const getProfile = async (tenantId, id) => {
  const contact = await prisma.contact.findFirst({ where: { id, tenantId } });
  if (!contact) return null;
  return {
    id:           contact.id,
    name:         contact.name,
    email:        contact.email,
    company:      null,
    score:        null,
    lifecycleStage: null,
    firstSeen:    contact.createdAt,
    lastSeen:     contact.updatedAt ?? contact.createdAt,
    attributes:   {},
    consent:      {},
    identityGraph: {
      email:     contact.email,
      domain:    contact.email?.split("@")[1] ?? null,
      contactId: contact.id,
    },
    timeline:     [{ event: "Profile Created", date: contact.createdAt }],
    activations:  [],
  };
};

// ── Teams (real User + CrmTask data) ──────────────────────────────────────────
export const listTeamMembers = async (tenantId) => {
  const users = await prisma.user.findMany({
    where: { tenantId },
    include: { role: true },
    orderBy: { createdAt: "asc" },
  });
  return users.map((u) => ({
    id:         u.id,
    name:       `${u.firstName} ${u.lastName}`,
    email:      u.email,
    role:       u.jobTitle ?? u.role?.name ?? null,
    department: u.department ?? null,
    jobTitle:   u.jobTitle ?? null,
    isActive:   u.isActive,
    avatar:     u.avatarUrl,
    joinedAt:   u.createdAt,
  }));
};

export const listTeamTasks = async (tenantId, params = {}) => {
  const where = { tenantId };
  if (params.status) where.status = params.status;
  const tasks = await prisma.crmTask.findMany({
    where,
    include: { user: { select: { firstName: true, lastName: true } } },
    orderBy: { due_date: "asc" },
    take: 50,
  });
  return tasks.map((t) => ({
    id:        t.id,
    title:     t.title,
    status:    t.status,
    priority:  t.priority,
    dueDate:   t.due_date,
    assignee:  t.user ? `${t.user.firstName} ${t.user.lastName}` : null,
    completed: t.status === "completed",
  }));
};

export const getTeamMetrics = async (tenantId) => {
  const [totalMembers, tasks, campaigns] = await Promise.all([
    prisma.user.count({ where: { tenantId } }),
    prisma.crmTask.findMany({ where: { tenantId }, select: { status: true } }),
    prisma.marketingCampaign.count({ where: { tenantId, status: "active" } }),
  ]);
  return {
    totalMembers,
    teamSize:        totalMembers,
    openTasks:       tasks.filter((t) => t.status !== "completed").length,
    completedTasks:  tasks.filter((t) => t.status === "completed").length,
    activeCampaigns: campaigns,
    tasksCompleted:  tasks.filter((t) => t.status === "completed").length,
  };
};

export const inviteTeamMember = async (tenantId, data) => ({ invited: true, email: data.email, role: data.role });

export const createTeamTask = async (tenantId, data) => {
  const firstUser = await prisma.user.findFirst({ where: { tenantId } });
  return prisma.crmTask.create({
    data: {
      title:     data.title,
      task_type: "follow_up",
      status:    "pending",
      priority:  data.priority ?? "medium",
      due_date:  data.dueDate ? new Date(data.dueDate) : null,
      tenantId,
      userId:    data.userId ?? firstUser?.id ?? "",
    },
  });
};

// ── B2B (real Contact / Campaign records; no fabricated firmographics) ─────────
export const listB2BAccounts = async (tenantId, params = {}) => {
  const contacts = await prisma.contact.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    take: Number(params.limit) || 20,
  });
  return contacts.map((c) => ({
    id: c.id, name: c.name, email: c.email,
    industry: null, size: null, stage: null, score: null,
  }));
};

export const getB2BAccount = async (tenantId, id) => {
  const c = await prisma.contact.findFirst({ where: { id, tenantId } });
  if (!c) return null;
  return { id: c.id, name: c.name, email: c.email, industry: null, size: null, stage: null, score: null };
};

export const listB2BJourneys = async (tenantId) => {
  const campaigns = await prisma.marketingCampaign.findMany({
    where: { tenantId, status: { in: ["active", "completed"] } },
    take: 5,
  });
  return campaigns.map((c) => ({
    id:        c.id,
    name:      `${c.name} Journey`,
    status:    c.status,
    steps:     null,
    enrolled:  c.leads ?? 0,
    converted: c.conversions ?? 0,
  }));
};

export const getB2BJourney = async (tenantId, id) => {
  const c = await prisma.marketingCampaign.findFirst({ where: { id, tenantId } });
  if (!c) return null;
  return { id: c.id, name: `${c.name} Journey`, status: c.status, steps: null, enrolled: c.leads ?? 0, converted: c.conversions ?? 0 };
};

export const createB2BJourney = async (tenantId, data) =>
  prisma.marketingCampaign.create({
    data: { name: data.name ?? "New Journey", objective: "demand_gen", channel: "multi-channel", status: "draft", tenantId },
  });

// ── Content assets (no backing table) ─────────────────────────────────────────
export const listContentAssets  = () => Promise.resolve([]);
export const getContentAsset    = () => Promise.resolve(null);
export const uploadContentAsset = (tenantId, data) => Promise.resolve({ id: `asset-${Date.now()}`, ...data, status: "draft" });
export const deleteContentAsset = () => Promise.resolve({ deleted: true });

// ── Commerce (real closed-won opportunities) ──────────────────────────────────
export const listOrders = async (tenantId) => {
  const opps = await prisma.crmOpportunity.findMany({
    where: { tenantId, stage: "closed_won" },
    orderBy: { updatedAt: "desc" },
    take: 20,
  });
  return opps.map((o) => ({
    id:       o.id.slice(0, 8).toUpperCase(),
    customer: o.name.split(" ").slice(0, 2).join(" "),
    value:    o.value ?? 0,
    status:   "completed",
    channel:  "direct",
    date:     o.updatedAt,
  }));
};

export const getCommerceMetrics = async (tenantId) => {
  const opps = await prisma.crmOpportunity.findMany({
    where: { tenantId, stage: "closed_won" },
    select: { value: true },
  });
  const totalRevenue  = opps.reduce((s, o) => s + (o.value ?? 0), 0);
  const totalOrders   = opps.length;
  const avgOrderValue = totalOrders ? Math.round(totalRevenue / totalOrders) : 0;
  return { totalRevenue, totalOrders, avgOrderValue, totalRevenueFmt: fmtCurrency(totalRevenue), channelMatrix: [] };
};

// ── Personalization (no backing table) ────────────────────────────────────────
export const listPersonalization = () => Promise.resolve([]);

export const getPersonalizationMetrics = async (tenantId) => {
  const contacts = await prisma.contact.count({ where: { tenantId } });
  return {
    active: 0, variants: 0, impressions: 0, lift: null,
    estimatedReach: contacts, topLifecycleStage: null, lastVisitWindow: null, topIndustry: null,
  };
};

export const createPersonalization = (tenantId, data) =>
  Promise.resolve({ id: `p-${Date.now()}`, ...data, status: "draft", lift: 0, impressions: 0 });

// ── CDP (real counts only; sources require a connected integration) ───────────
export const getCdpMetrics = async (tenantId) => {
  const [contacts, sources] = await Promise.all([
    prisma.contact.count({ where: { tenantId } }),
    Promise.resolve(0),
  ]);
  return {
    totalProfiles:      contacts,
    activeSources:      sources,
    totalSources:       sources,
    resolvedIdentities: contacts,
    totalEvents:        0,
    activeModels:       0,
    activeSegments:     await prisma.marketingAudience.count({ where: { tenantId } }),
    audience:           contacts,
    audienceDelta:      null,
    confidence:         null,
    latency:            null,
    projectedLift:      null,
    sqlPreview:         null,
    predictiveLayer:    { churnRisk: null, upsellProbability: null, nextBestAction: null },
  };
};

export const getCdpSources    = () => Promise.resolve([]);
export const createCdpSource  = (tenantId, data) => Promise.resolve({ id: `src-${Date.now()}`, ...data, status: "pending", records: 0, lastSync: null });
export const createCdpSegment = (tenantId, data) => Promise.resolve({ id: `seg-${Date.now()}`, ...data, size: 0, status: "building" });

// ── Flows (no backing table) ──────────────────────────────────────────────────
export const listFlows    = () => Promise.resolve([]);
export const getFlow       = () => Promise.resolve(null);
export const getFlowStats  = () => Promise.resolve({ entered: 0, converted: 0, active: 0, dropped: 0 });
export const createFlow    = (tenantId, data) => Promise.resolve({ id: `flow-${Date.now()}`, ...data, status: "draft", enrolled: 0, converted: 0 });
export const updateFlow    = (tenantId, id, data) => Promise.resolve({ id, ...data });

// ── AI content generation (a functional generator, not stored data) ───────────
export const generateAi = async (tenantId, body = {}) => {
  const { mode = "content", prompt = "" } = body;
  const topic = prompt.trim();
  if (!topic) {
    return Promise.resolve({
      title: "Add a prompt to generate",
      summary: "Describe your goal, audience, and channel and Einstein will draft content, a plan, and next steps.",
      copy: "",
      steps: [],
    });
  }
  const short = topic.slice(0, 60);
  const responses = {
    content: {
      title: `Content Brief: ${short}`,
      summary: `AI-generated content strategy focused on "${short}". Targets mid-funnel engagement with value-driven messaging.`,
      copy: `Unlock the power of your product — built for teams who demand results.\n\n✓ Increase efficiency\n✓ Cut manual work\n✓ Trusted by teams like yours\n\nStart your free trial today.`,
      steps: [
        "Define your primary audience persona and pain points",
        "Map content pieces to each funnel stage (TOFU / MOFU / BOFU)",
        "A/B test headline and CTA variations across formats",
        "Measure engagement, scroll depth, and CTR",
        "Iterate copy based on click-through and conversion data",
      ],
    },
    campaign: {
      title: `Campaign Plan: ${short}`,
      summary: `Multi-channel campaign spanning email, social, and paid ads for "${short}".`,
      copy: `Phase 1 — Awareness: Broad reach via paid social\nPhase 2 — Nurture: Email drip + retargeting\nPhase 3 — Convert: High-intent ads + sales outreach`,
      steps: [
        "Set SMART objectives: target MQLs, CPL, and revenue influenced",
        "Build segmented audience lists by persona and intent tier",
        "Create ad creative in multiple formats",
        "Schedule a multi-touch email sequence with personalisation",
        "Monitor ROAS weekly and reallocate spend to winners",
      ],
    },
    social: {
      title: `Social Media Pack: ${short}`,
      summary: `Ready-to-use social content targeting "${short}".`,
      copy: `LinkedIn: Lead with a strong point of view.\nInstagram: Use a carousel to teach one idea.\nX: Post a concise, opinionated thread.`,
      steps: [
        "Post thought leadership a few times per week",
        "Run a carousel series over two weeks",
        "Schedule posts at peak hours for your timezone",
        "Respond to comments quickly",
        "Boost top-performing organic posts",
      ],
    },
    ads: {
      title: `Ad Copy Suite: ${short}`,
      summary: `High-converting ad variations targeting "${short}".`,
      copy: `Headline A: Solve the core problem in five words.\nHeadline B: Lead with a quantified outcome.`,
      steps: [
        "Run a creative A/B test for at least 7 days",
        "Target by job title, company size, and intent signals",
        "Set a bid strategy with a target CPA cap",
        "Install and verify the conversion pixel",
        "Pause underperformers; scale winners gradually",
      ],
    },
  };
  // Keep the title/summary/steps scaffold deterministic; let the model write the
  // actual copy (real output when AI is on, the template when it's off/over quota).
  const base = responses[mode] ?? responses.content;
  const copy = await assistText({
    tenantId,
    system: "You are a senior marketing copywriter. Output publish-ready copy only — no preamble or explanation. Keep it under 130 words.",
    user: `Format: ${mode}. Brief: "${topic}"`,
    maxTokens: 260,
    fallback: () => base.copy,
  });
  return { ...base, copy };
};
