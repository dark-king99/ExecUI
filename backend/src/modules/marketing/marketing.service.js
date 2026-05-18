import prisma from "../../config/database.js";

// ── Lazy seed helpers ─────────────────────────────────────────────────────────
// If the DB has no data yet for a tenant, auto-insert realistic demo rows.

const SEED_CAMPAIGNS = [
  { name: "Q2 Product Launch", objective: "Pipeline", channel: "email", status: "active", budget: 15000, spent: 9200, leads: 312, clicks: 2840, opens: 8100, conversions: 48, revenue: 72000, ctr: 5.2, openRate: 38.4, roi: 682 },
  { name: "Brand Awareness Push", objective: "Brand Awareness", channel: "paid", status: "active", budget: 25000, spent: 18700, leads: 1240, clicks: 14200, opens: 0, conversions: 87, revenue: 43000, ctr: 3.8, openRate: null, roi: 130 },
  { name: "Enterprise Newsletter", objective: "Retention", channel: "email", status: "active", budget: 3000, spent: 1200, leads: 89, clicks: 640, opens: 4200, conversions: 12, revenue: 18000, ctr: 6.1, openRate: 44.2, roi: 1400 },
  { name: "LinkedIn Lead Gen", objective: "Lead Generation", channel: "social", status: "paused", budget: 8000, spent: 5600, leads: 204, clicks: 3100, opens: 0, conversions: 31, revenue: 31000, ctr: 2.9, openRate: null, roi: 454 },
  { name: "Summer Promotion", objective: "Revenue", channel: "multi-channel", status: "completed", budget: 20000, spent: 19800, leads: 890, clicks: 9200, opens: 22000, conversions: 142, revenue: 284000, ctr: 4.4, openRate: 41.1, roi: 1334 },
  { name: "Webinar Series", objective: "Demand Gen", channel: "content", status: "active", budget: 5000, spent: 2100, leads: 178, clicks: 1200, opens: 3400, conversions: 22, revenue: 33000, ctr: 7.2, openRate: 52.3, roi: 1471 },
  { name: "Retargeting Campaign", objective: "Pipeline", channel: "paid", status: "draft", budget: 10000, spent: 0, leads: 0, clicks: 0, opens: 0, conversions: 0, revenue: 0, ctr: null, openRate: null, roi: null },
  { name: "Customer Renewal Drive", objective: "Retention", channel: "email", status: "paused", budget: 4000, spent: 1800, leads: 56, clicks: 380, opens: 2100, conversions: 18, revenue: 54000, ctr: 5.8, openRate: 47.6, roi: 2900 },
];

const SEED_AUDIENCES = [
  { name: "High-Intent Prospects", type: "behavioral", size: 4200, status: "active", description: "Visitors who viewed pricing page 2+ times in last 30 days" },
  { name: "Enterprise Decision Makers", type: "firmographic", size: 1850, status: "active", description: "Directors and above at companies with 500+ employees" },
  { name: "Churned Customers 90d", type: "behavioral", size: 720, status: "draft", description: "Customers who cancelled subscription in the last 90 days" },
  { name: "Lookalike — Top 10% Revenue", type: "lookalike", size: 6100, status: "active", description: "Lookalike audience modelled on top revenue accounts" },
  { name: "Mid-Market CTOs", type: "demographic", size: 2300, status: "active", description: "CTOs and VPs of Engineering at 50–500 employee companies" },
  { name: "Product Trial Users", type: "intent", size: 890, status: "draft", description: "Users currently in active free trial" },
];

const SEED_EXPERIMENTS = [
  {
    name: "Homepage CTA Color", type: "a/b", status: "running", metric: "conversion_rate",
    hypothesis: "A green CTA will outperform the default blue by at least 10%",
    confidence: 72, lift: 8.4,
    variants: [
      { name: "Control (Blue CTA)", conversions: 148, visitors: 2240, rate: 6.6 },
      { name: "Variant A (Green CTA)", conversions: 179, visitors: 2215, rate: 8.1 },
    ],
  },
  {
    name: "Email Subject Line Length", type: "a/b", status: "completed", metric: "click_rate",
    hypothesis: "Shorter subject lines (<40 chars) will drive higher open and click rates",
    confidence: 95, lift: 14.2, result: "winning-declared",
    variants: [
      { name: "Long subject (control)", conversions: 310, visitors: 8200, rate: 3.8 },
      { name: "Short subject (<40 chars)", conversions: 394, visitors: 8100, rate: 4.9 },
    ],
  },
  {
    name: "Pricing Page Layout", type: "multivariate", status: "running", metric: "conversion_rate",
    hypothesis: "Highlighting the Growth plan will increase upgrades from Starter",
    confidence: 58, lift: 5.1,
    variants: [
      { name: "Original Layout", conversions: 42, visitors: 1100, rate: 3.8 },
      { name: "Growth Highlighted", conversions: 51, visitors: 1085, rate: 4.7 },
      { name: "Annual Toggle First", conversions: 38, visitors: 1092, rate: 3.5 },
    ],
  },
  {
    name: "Onboarding Flow Steps", type: "split", status: "completed", metric: "engagement",
    hypothesis: "Reducing onboarding from 7 steps to 4 will improve 7-day activation",
    confidence: 99, lift: 31.0, result: "winning-declared",
    variants: [
      { name: "7-step flow (control)", conversions: 180, visitors: 600, rate: 30.0 },
      { name: "4-step flow", conversions: 235, visitors: 600, rate: 39.2 },
    ],
  },
  {
    name: "Ad Creative Format", type: "a/b", status: "draft", metric: "click_rate",
    hypothesis: "Video thumbnails will outperform static images on paid social",
    confidence: null, lift: null,
    variants: [
      { name: "Static image", conversions: 0, visitors: 0, rate: 0 },
      { name: "Video thumbnail", conversions: 0, visitors: 0, rate: 0 },
    ],
  },
];

async function lazySeedCampaigns(tenantId) {
  const count = await prisma.marketingCampaign.count({ where: { tenantId } });
  if (count > 0) return;
  const now = new Date();
  await prisma.marketingCampaign.createMany({
    data: SEED_CAMPAIGNS.map((c, i) => ({
      ...c,
      tenantId,
      startDate: new Date(now.getTime() - (90 - i * 10) * 86400000),
      endDate:   c.status === "completed" ? new Date(now.getTime() - i * 7 * 86400000) : null,
    })),
  });
}

async function lazySeedAudiences(tenantId) {
  const count = await prisma.marketingAudience.count({ where: { tenantId } });
  if (count > 0) return;
  await prisma.marketingAudience.createMany({ data: SEED_AUDIENCES.map((a) => ({ ...a, tenantId })) });
}

async function lazySeedExperiments(tenantId) {
  const count = await prisma.marketingExperiment.count({ where: { tenantId } });
  if (count > 0) return;
  await prisma.marketingExperiment.createMany({
    data: SEED_EXPERIMENTS.map((e) => ({ ...e, tenantId, variants: e.variants })),
  });
}

const fmtCurrency = (v) => {
  if (!v && v !== 0) return null;
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}k`;
  return `$${v}`;
};

// ── Campaigns ─────────────────────────────────────────────────────────────────
export const listCampaigns = async (tenantId, params = {}) => {
  await lazySeedCampaigns(tenantId);
  const where = { tenantId };
  if (params.status && params.status !== "all") where.status = params.status;
  const rows = await prisma.marketingCampaign.findMany({
    where, orderBy: { createdAt: "desc" },
  });
  return rows.map((c) => ({
    ...c,
    budgetFmt:  fmtCurrency(c.budget),
    spentFmt:   fmtCurrency(c.spent),
    revenueFmt: fmtCurrency(c.revenue),
  }));
};

export const getCampaign = async (tenantId, id) => {
  await lazySeedCampaigns(tenantId);
  return prisma.marketingCampaign.findFirst({ where: { id, tenantId } });
};

export const createCampaign = async (tenantId, data) => {
  return prisma.marketingCampaign.create({
    data: {
      name:      data.name,
      objective: data.objective  ?? "lead_generation",
      channel:   data.channel    ?? "email",
      status:    "draft",
      budget:    Number(data.budget)  || 0,
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate:   data.endDate   ? new Date(data.endDate)   : null,
      tenantId,
    },
  });
};

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
  await lazySeedCampaigns(tenantId);
  const campaigns = await prisma.marketingCampaign.findMany({ where: { tenantId } });
  const totalRevenue = campaigns.reduce((s, c) => s + (c.revenue ?? 0), 0);
  const totalSpend   = campaigns.reduce((s, c) => s + (c.spent   ?? 0), 0);
  return {
    total:          campaigns.length,
    active:         campaigns.filter((c) => c.status === "active").length,
    paused:         campaigns.filter((c) => c.status === "paused").length,
    completed:      campaigns.filter((c) => c.status === "completed").length,
    activeJourneys: campaigns.filter((c) => c.status === "active").length,
    liveContacts:   campaigns.filter((c) => c.status === "active").reduce((s, c) => s + c.leads, 0),
    totalRevenue,   totalSpend,
    totalRevenueFmt: fmtCurrency(totalRevenue),
    totalSpendFmt:   fmtCurrency(totalSpend),
    roas: totalSpend > 0 ? Math.round((totalRevenue / totalSpend) * 10) / 10 : 0,
  };
};

// ── Attribution ───────────────────────────────────────────────────────────────
const ATTRIBUTION_CHANNELS = [
  { channel: "Paid Search",     revenue: 312000, spend: 48000, roas: 6.5, conversions: 142, ctr: 4.2, color: "#6366f1" },
  { channel: "Email Marketing", revenue: 228000, spend: 12000, roas: 19.0, conversions: 98, ctr: 5.8, color: "#22c55e" },
  { channel: "Social (Paid)",   revenue: 174000, spend: 38000, roas: 4.6, conversions: 74, ctr: 2.9, color: "#f59e0b" },
  { channel: "Organic Search",  revenue: 142000, spend: 8000,  roas: 17.8, conversions: 61, ctr: 6.1, color: "#3b82f6" },
  { channel: "Content / Blog",  revenue: 98000,  spend: 14000, roas: 7.0,  conversions: 42, ctr: 7.4, color: "#ec4899" },
  { channel: "Referral",        revenue: 76000,  spend: 4000,  roas: 19.0, conversions: 34, ctr: 9.2, color: "#14b8a6" },
  { channel: "Events",          revenue: 54000,  spend: 22000, roas: 2.5,  conversions: 23, ctr: 3.1, color: "#f97316" },
];

export const getAttributionChannels = () => Promise.resolve(ATTRIBUTION_CHANNELS);

export const getAttributionSummary = () => {
  const totalRevenue = ATTRIBUTION_CHANNELS.reduce((s, c) => s + c.revenue, 0);
  const totalSpend   = ATTRIBUTION_CHANNELS.reduce((s, c) => s + c.spend, 0);
  return Promise.resolve({
    totalRevenue, totalSpend,
    roas: Math.round((totalRevenue / totalSpend) * 10) / 10,
    avgLtv: 4200, cac: 380,
    totalRevenueFmt: fmtCurrency(totalRevenue),
    totalSpendFmt:   fmtCurrency(totalSpend),
  });
};

export const getAttributionModels = () => Promise.resolve([
  {
    name: "Linear",
    description: "Equal credit to each touchpoint",
    channels: { "Paid Search": 25, "Email": 22, "Social": 18, "Organic": 15, "Content": 12, "Referral": 8 },
  },
  {
    name: "Last Touch",
    description: "Full credit to last touchpoint before conversion",
    channels: { "Paid Search": 38, "Email": 28, "Social": 16, "Organic": 10, "Content": 6, "Referral": 2 },
  },
  {
    name: "First Touch",
    description: "Full credit to first touchpoint",
    channels: { "Organic": 34, "Social": 24, "Paid Search": 20, "Content": 12, "Email": 8, "Referral": 2 },
  },
  {
    name: "Time Decay",
    description: "More credit to touchpoints closer to conversion",
    channels: { "Email": 32, "Paid Search": 28, "Social": 20, "Organic": 12, "Content": 5, "Referral": 3 },
  },
]);

export const getAttributionLtvCac = () => Promise.resolve({
  ltv: 4200, cac: 380, ltvCacRatio: 11.1,
  avgLtv: 4200,
  bySegment: { Enterprise: 18400, "Mid-Market": 6200, SMB: 1800 },
  cacByChannel: { "Paid Search": 420, "Email": 85, "Social": 310, "Organic": 180, "Content": 210 },
});

// ── Audiences ─────────────────────────────────────────────────────────────────
export const listAudiences = async (tenantId, params = {}) => {
  await lazySeedAudiences(tenantId);
  const where = { tenantId };
  if (params.type && params.type !== "all") where.type = params.type;
  return prisma.marketingAudience.findMany({ where, orderBy: { createdAt: "desc" } });
};

export const getAudience = async (tenantId, id) => {
  await lazySeedAudiences(tenantId);
  return prisma.marketingAudience.findFirst({ where: { id, tenantId } });
};

export const createAudience = async (tenantId, data) => {
  return prisma.marketingAudience.create({
    data: {
      name:        data.name,
      type:        data.type        ?? "behavioral",
      size:        Number(data.size) || 0,
      description: data.description ?? null,
      status:      "draft",
      tenantId,
    },
  });
};

export const activateAudience = async (tenantId, id) => {
  await prisma.marketingAudience.update({ where: { id }, data: { status: "active" } });
  return { activated: true };
};

export const createLookalikeAudience = async (tenantId, id) => {
  const source = await prisma.marketingAudience.findFirst({ where: { id, tenantId } });
  const newAud = await prisma.marketingAudience.create({
    data: {
      name:        `Lookalike — ${source?.name ?? "Audience"}`,
      type:        "lookalike",
      size:        Math.round((source?.size ?? 1000) * 3.2),
      description: `Lookalike audience modelled on "${source?.name ?? "source"}"`,
      status:      "draft",
      tenantId,
    },
  });
  return newAud;
};

export const getAudienceOverlap = async (tenantId, id) => {
  return { overlap: Math.floor(Math.random() * 30) + 5, audienceId: id };
};

// ── Analytics ─────────────────────────────────────────────────────────────────
export const getMarketingAnalyticsSummary = async (tenantId) => {
  const campaigns = await prisma.marketingCampaign.findMany({ where: { tenantId } });
  if (campaigns.length === 0) await lazySeedCampaigns(tenantId);
  const all = campaigns.length ? campaigns : await prisma.marketingCampaign.findMany({ where: { tenantId } });

  const totalRevenue     = all.reduce((s, c) => s + (c.revenue ?? 0), 0);
  const totalSpend       = all.reduce((s, c) => s + (c.spent ?? 0), 0);
  const totalConversions = all.reduce((s, c) => s + (c.conversions ?? 0), 0);
  const active           = all.filter((c) => c.status === "active");

  return {
    totalRevenue, totalSpend,
    roas:             totalSpend > 0 ? Math.round((totalRevenue / totalSpend) * 10) / 10 : 0,
    totalConversions,
    activeJourneys:   active.length,
    liveContacts:     active.reduce((s, c) => s + c.leads, 0),
    totalRevenueFmt:  fmtCurrency(totalRevenue),
    totalSpendFmt:    fmtCurrency(totalSpend),
  };
};

export const getMarketingAnalyticsTrend = async (tenantId) => {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  return months.map((m, i) => ({
    month: m,
    revenue:     18000 + i * 8000 + Math.floor(Math.random() * 5000),
    spend:       6000  + i * 1500,
    leads:       80    + i * 30,
    conversions: 12    + i * 5,
  }));
};

export const getMarketingChannelPerf = async (tenantId) => {
  return ATTRIBUTION_CHANNELS.map((ch) => ({
    channel:     ch.channel,
    revenue:     ch.revenue,
    spend:       ch.spend,
    roas:        ch.roas,
    conversions: ch.conversions,
    ctr:         ch.ctr,
  }));
};

// ── Experiments ───────────────────────────────────────────────────────────────
export const listExperiments = async (tenantId, params = {}) => {
  await lazySeedExperiments(tenantId);
  const where = { tenantId };
  if (params.status && params.status !== "all") where.status = params.status;
  const rows = await prisma.marketingExperiment.findMany({ where, orderBy: { createdAt: "desc" } });
  return rows.map((e) => ({
    ...e,
    variants: Array.isArray(e.variants) ? e.variants : [],
  }));
};

export const getExperiment = async (tenantId, id) => {
  await lazySeedExperiments(tenantId);
  const e = await prisma.marketingExperiment.findFirst({ where: { id, tenantId } });
  if (!e) return null;
  return { ...e, variants: Array.isArray(e.variants) ? e.variants : [] };
};

export const createExperiment = async (tenantId, data) => {
  return prisma.marketingExperiment.create({
    data: {
      name:       data.name,
      type:       data.type       ?? "a/b",
      metric:     data.metric     ?? "conversion_rate",
      hypothesis: data.hypothesis ?? null,
      status:     "draft",
      variants:   [
        { name: "Control",   conversions: 0, visitors: 0, rate: 0 },
        { name: "Variant A", conversions: 0, visitors: 0, rate: 0 },
      ],
      tenantId,
    },
  });
};

export const startExperiment = async (tenantId, id) => {
  await prisma.marketingExperiment.update({ where: { id }, data: { status: "running" } });
  return { started: true };
};

export const pauseExperiment = async (tenantId, id) => {
  await prisma.marketingExperiment.update({ where: { id }, data: { status: "paused" } });
  return { paused: true };
};

// ── Profiles (CDP — derived from Contact model) ───────────────────────────────
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
  return contacts.map((c) => ({
    id: c.id, name: c.name, email: c.email,
    company: c.name.split(" ").slice(-1)[0] + " Corp",
    score: Math.floor(Math.random() * 40) + 60,
  }));
};

export const getProfile = async (tenantId, id) => {
  const contact = await prisma.contact.findFirst({ where: { id, tenantId } });
  if (!contact) return null;

  const opps = await prisma.crmOpportunity.findMany({
    where: { tenantId, name: { contains: contact.name.split(" ")[0] } },
    select: { name: true, value: true, stage: true, createdAt: true },
    take: 5,
  });

  return {
    id:           contact.id,
    name:         contact.name,
    email:        contact.email,
    company:      `${contact.name.split(" ").slice(-1)[0]} Corp`,
    score:        82,
    lifecycleStage: "Customer",
    firstSeen:    contact.createdAt,
    lastSeen:     new Date(),
    attributes: {
      Industry:  "Technology",
      "Company Size": "201–500",
      Region:    "North America",
      "Subscription Plan": "Enterprise",
    },
    consent: { email: true, sms: false, ads: true, analytics: true },
    identityGraph: {
      email:     contact.email,
      domain:    contact.email?.split("@")[1] ?? null,
      contactId: contact.id,
    },
    timeline: [
      { event: "Profile Created", date: contact.createdAt },
      { event: "First Campaign Engaged", date: new Date(contact.createdAt.getTime() + 86400000 * 3) },
      ...opps.map((o) => ({ event: `Opportunity: ${o.name}`, date: o.createdAt })),
    ],
    activations: [
      { platform: "Google Ads",   status: "active",      synced: new Date() },
      { platform: "LinkedIn Ads", status: "active",      synced: new Date() },
      { platform: "Mailchimp",    status: "unsubscribed", synced: new Date() },
    ],
  };
};

// ── Teams (backed by real User + CrmTask data) ────────────────────────────────
const MARKETING_ROLES = ["content-writer", "designer", "analyst", "email-marketer", "admin", "manager"];

export const listTeamMembers = async (tenantId) => {
  const users = await prisma.user.findMany({
    where: { tenantId },
    include: { role: true },
    orderBy: { createdAt: "asc" },
  });
  return users.map((u, i) => ({
    id:         u.id,
    name:       `${u.firstName} ${u.lastName}`,
    email:      u.email,
    role:       MARKETING_ROLES[i % MARKETING_ROLES.length],
    department: u.department ?? "Marketing",
    jobTitle:   u.jobTitle   ?? "Marketing Specialist",
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

export const inviteTeamMember = async (tenantId, data) => {
  return { invited: true, email: data.email, role: data.role };
};

export const createTeamTask = async (tenantId, data) => {
  const firstUser = await prisma.user.findFirst({ where: { tenantId } });
  return prisma.crmTask.create({
    data: {
      title:     data.title,
      task_type: "follow_up",
      status:    "pending",
      priority:  data.priority ?? "medium",
      due_date:  data.dueDate  ? new Date(data.dueDate) : null,
      tenantId,
      userId:    data.userId   ?? firstUser?.id ?? "",
    },
  });
};

// ── B2B ───────────────────────────────────────────────────────────────────────
export const listB2BAccounts = async (tenantId, params = {}) => {
  const contacts = await prisma.contact.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    take: Number(params.limit) || 20,
  });
  return contacts.map((c, i) => ({
    id:       c.id,
    name:     c.name,
    email:    c.email,
    industry: ["Technology", "Finance", "Healthcare", "Retail", "Manufacturing"][i % 5],
    size:     ["1–10", "11–50", "51–200", "201–500", "500+"][i % 5],
    stage:    ["Prospect", "MQL", "SQL", "Customer", "Champion"][i % 5],
    score:    Math.floor(Math.random() * 40) + 60,
  }));
};

export const getB2BAccount = async (tenantId, id) => {
  const c = await prisma.contact.findFirst({ where: { id, tenantId } });
  if (!c) return null;
  return { id: c.id, name: c.name, email: c.email, industry: "Technology", size: "201–500", stage: "Customer", score: 82 };
};

export const listB2BJourneys = async (tenantId) => {
  await lazySeedCampaigns(tenantId);
  const campaigns = await prisma.marketingCampaign.findMany({
    where: { tenantId, status: { in: ["active", "completed"] } },
    take: 5,
  });
  return campaigns.map((c) => ({
    id:      c.id,
    name:    `${c.name} Journey`,
    status:  c.status,
    steps:   5,
    enrolled: c.leads,
    converted: c.conversions,
  }));
};

export const getB2BJourney = async (tenantId, id) => {
  const c = await prisma.marketingCampaign.findFirst({ where: { id, tenantId } });
  if (!c) return null;
  return { id: c.id, name: `${c.name} Journey`, status: c.status, steps: 5, enrolled: c.leads, converted: c.conversions };
};

export const createB2BJourney = async (tenantId, data) => {
  return prisma.marketingCampaign.create({
    data: {
      name: data.name ?? "New Journey", objective: "demand_gen",
      channel: "multi-channel", status: "draft",
      tenantId,
    },
  });
};

// ── Content assets (static/computed) ─────────────────────────────────────────
const DEMO_ASSETS = [
  { id: "asset-1", name: "Q2 Campaign Hero Banner", type: "image", size: "1.2 MB", status: "approved", url: null, createdAt: new Date("2026-03-01") },
  { id: "asset-2", name: "Product Demo Video", type: "video", size: "48 MB", status: "approved", url: null, createdAt: new Date("2026-02-15") },
  { id: "asset-3", name: "Enterprise Datasheet PDF", type: "document", size: "820 KB", status: "approved", url: null, createdAt: new Date("2026-03-10") },
  { id: "asset-4", name: "Social Ad Pack (10 variants)", type: "image", size: "4.8 MB", status: "draft", url: null, createdAt: new Date("2026-04-01") },
  { id: "asset-5", name: "Webinar Recording — April", type: "video", size: "210 MB", status: "approved", url: null, createdAt: new Date("2026-04-20") },
];

export const listContentAssets  = () => Promise.resolve(DEMO_ASSETS);
export const getContentAsset    = (tenantId, id) => Promise.resolve(DEMO_ASSETS.find((a) => a.id === id) ?? null);
export const uploadContentAsset = (tenantId, data) => Promise.resolve({ id: `asset-${Date.now()}`, ...data, status: "draft" });
export const deleteContentAsset = () => Promise.resolve({ deleted: true });

// ── Commerce (computed) ───────────────────────────────────────────────────────
export const listOrders = async (tenantId) => {
  const opps = await prisma.crmOpportunity.findMany({
    where: { tenantId, stage: "closed_won" },
    include: { owner: { select: { firstName: true, lastName: true } } },
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
  return {
    totalRevenue, totalOrders, avgOrderValue,
    totalRevenueFmt: fmtCurrency(totalRevenue),
    channelMatrix: [
      { channel: "Direct",  revenue: Math.round(totalRevenue * 0.45), orders: Math.round(totalOrders * 0.45) },
      { channel: "Partner", revenue: Math.round(totalRevenue * 0.30), orders: Math.round(totalOrders * 0.30) },
      { channel: "Self-serve", revenue: Math.round(totalRevenue * 0.25), orders: Math.round(totalOrders * 0.25) },
    ],
  };
};

// ── Personalization (static/computed) ─────────────────────────────────────────
const DEMO_PERSONALIZATIONS = [
  { id: "p-1", name: "Homepage Hero — Enterprise CTA", status: "active", variant: "B", lift: 14.2, impressions: 12400 },
  { id: "p-2", name: "Pricing Page — Annual Toggle", status: "active", variant: "A", lift: 8.7, impressions: 6800 },
  { id: "p-3", name: "Blog CTA — Demo Request", status: "paused", variant: "C", lift: 5.1, impressions: 3200 },
  { id: "p-4", name: "Onboarding — Role Selector", status: "active", variant: "B", lift: 22.4, impressions: 4100 },
];

export const listPersonalization = () => Promise.resolve(DEMO_PERSONALIZATIONS);

export const getPersonalizationMetrics = async (tenantId) => {
  const contacts = await prisma.contact.count({ where: { tenantId } });
  return {
    active: DEMO_PERSONALIZATIONS.filter((p) => p.status === "active").length,
    variants: DEMO_PERSONALIZATIONS.length,
    impressions: DEMO_PERSONALIZATIONS.reduce((s, p) => s + p.impressions, 0),
    lift: 14.2,
    estimatedReach: contacts * 12,
    topLifecycleStage: "Customer",
    lastVisitWindow: "7 days",
    topIndustry: "Technology",
  };
};

export const createPersonalization = (tenantId, data) =>
  Promise.resolve({ id: `p-${Date.now()}`, ...data, status: "draft", lift: 0, impressions: 0 });

// ── CDP (Customer Data Platform) ──────────────────────────────────────────────
const CDP_SOURCES = [
  { id: "src-1", name: "Salesforce CRM",     type: "crm",       status: "connected", records: 4820, lastSync: new Date(Date.now() - 3600000) },
  { id: "src-2", name: "Google Analytics 4", type: "analytics",  status: "connected", records: 128400, lastSync: new Date(Date.now() - 1800000) },
  { id: "src-3", name: "Mailchimp",          type: "email",      status: "connected", records: 12300, lastSync: new Date(Date.now() - 7200000) },
  { id: "src-4", name: "Google Ads",         type: "ads",        status: "connected", records: 38200, lastSync: new Date(Date.now() - 5400000) },
  { id: "src-5", name: "Shopify",            type: "ecommerce",  status: "connected", records: 6100, lastSync: new Date(Date.now() - 86400000) },
  { id: "src-6", name: "LinkedIn Ads",       type: "ads",        status: "disconnected", records: 0, lastSync: null },
  { id: "src-7", name: "Webhook / Events",   type: "webhook",    status: "connected", records: 284000, lastSync: new Date(Date.now() - 600000) },
];

export const getCdpMetrics = async (tenantId) => {
  const contacts = await prisma.contact.count({ where: { tenantId } });
  const users    = await prisma.user.count({ where: { tenantId } });
  return {
    totalProfiles:      contacts * 420 + 18000,
    activeSources:      CDP_SOURCES.filter((s) => s.status === "connected").length,
    totalSources:       CDP_SOURCES.length,
    resolvedIdentities: contacts * 380 + 14200,
    totalEvents:        284000 + contacts * 1200,
    activeModels:       4,
    activeSegments:     6,
    audience:           contacts * 420 + 18000,
    audienceDelta:      12.4,
    confidence:         94,
    latency:            180,
    projectedLift:      18.2,
    sqlPreview:         "SELECT user_id, SUM(revenue) AS ltv FROM events WHERE event_type = 'purchase' GROUP BY user_id HAVING ltv > 500",
    predictiveLayer: { churnRisk: 8.4, upsellProbability: 22.1, nextBestAction: "Email re-engagement" },
  };
};

export const getCdpSources   = () => Promise.resolve(CDP_SOURCES);
export const createCdpSource = (tenantId, data) =>
  Promise.resolve({ id: `src-${Date.now()}`, ...data, status: "pending", records: 0, lastSync: null });
export const createCdpSegment = (tenantId, data) =>
  Promise.resolve({ id: `seg-${Date.now()}`, ...data, size: 0, status: "building" });

// ── Flows (automation) ────────────────────────────────────────────────────────
const DEMO_FLOWS = [
  { id: "flow-1", name: "Welcome Series", status: "active", steps: 5, enrolled: 1240, converted: 187, trigger: "signup" },
  { id: "flow-2", name: "Trial Nurture", status: "active", steps: 7, enrolled: 342, converted: 89, trigger: "trial_start" },
  { id: "flow-3", name: "Churn Prevention", status: "active", steps: 4, enrolled: 128, converted: 34, trigger: "risk_score" },
  { id: "flow-4", name: "Post-Purchase Upsell", status: "paused", steps: 3, enrolled: 0, converted: 0, trigger: "purchase" },
  { id: "flow-5", name: "Re-engagement", status: "draft", steps: 3, enrolled: 0, converted: 0, trigger: "inactivity_30d" },
];

export const listFlows    = () => Promise.resolve(DEMO_FLOWS);
export const getFlow      = (tenantId, id) => Promise.resolve(DEMO_FLOWS.find((f) => f.id === id) ?? null);
export const getFlowStats = (tenantId, id) => {
  const flow = DEMO_FLOWS.find((f) => f.id === id);
  return Promise.resolve({
    entered: flow?.enrolled ?? 0, converted: flow?.converted ?? 0,
    active: flow?.enrolled ?? 0, dropped: Math.floor((flow?.enrolled ?? 0) * 0.15),
  });
};
export const createFlow = (tenantId, data) =>
  Promise.resolve({ id: `flow-${Date.now()}`, ...data, status: "draft", enrolled: 0, converted: 0 });
export const updateFlow = (tenantId, id, data) =>
  Promise.resolve({ id, ...data });

// ── AI ────────────────────────────────────────────────────────────────────────
export const generateAi = (tenantId, body = {}) => {
  const { mode = "content", prompt = "" } = body;
  const topic = prompt.slice(0, 60) || "your campaign";
  const responses = {
    content: {
      title: `Content Brief: ${topic}`,
      summary: `AI-generated content strategy focused on "${topic}". Targets mid-funnel engagement with value-driven messaging.`,
      copy: `Unlock the power of [Your Product] — built for teams who demand results.\n\n✓ Increase efficiency by 40%\n✓ Cut manual work in half\n✓ Trusted by 500+ companies\n\nStart your free trial today.`,
      steps: [
        "Define your primary audience persona and pain points",
        "Map content pieces to each funnel stage (TOFU / MOFU / BOFU)",
        "A/B test headline and CTA variations across 3 formats",
        "Measure engagement, scroll depth, and CTR after 72 hours",
        "Iterate copy based on click-through and conversion data",
      ],
    },
    campaign: {
      title: `Campaign Plan: ${topic}`,
      summary: `Multi-channel campaign spanning email, social, and paid ads for "${topic}". Estimated 6-week runway.`,
      copy: `Phase 1 — Awareness (Week 1–2): Broad reach via paid social\nPhase 2 — Nurture (Week 3–4): Email drip + retargeting\nPhase 3 — Convert (Week 5–6): High-intent ads + sales outreach`,
      steps: [
        "Set SMART objectives: target MQLs, CPL, and revenue influenced",
        "Build segmented audience lists by persona and intent tier",
        "Create ad creative in 3 formats: story, feed, and banner",
        "Schedule 5-touch email drip sequence with dynamic personalisation",
        "Monitor ROAS weekly; pause spend below 2× ROAS threshold",
      ],
    },
    social: {
      title: `Social Media Pack: ${topic}`,
      summary: `Ready-to-use social content for LinkedIn, Instagram, and X targeting "${topic}".`,
      copy: `🔷 LinkedIn: "Most teams spend 60% of their time on manual work. Ours doesn't."\n\n📸 Instagram: "5 signs your CRM is holding you back"\n\n𝕏 Thread: "Hot take: more features ≠ better software. Simplicity wins."`,
      steps: [
        "Post LinkedIn thought leadership 3× per week (Tue / Thu / Sat)",
        "Run Instagram carousel series over 2 weeks",
        "Schedule X threads at peak hours: 9 AM or 5 PM in target timezone",
        "Respond to all comments within 2 hours",
        "Boost top-performing organic posts with $20–50/day paid budget",
      ],
    },
    ads: {
      title: `Ad Copy Suite: ${topic}`,
      summary: `High-converting ad variations for Google, Meta, and LinkedIn targeting "${topic}".`,
      copy: `Google: "Stop Losing Deals — Try [Product] Free"\nMeta: "Your competitors close 2× more deals. Find out why →"\nLinkedIn: "Join 500+ revenue teams. See ROI in 30 days."`,
      steps: [
        "Run creative A/B test (2 headlines + 2 images) for minimum 7 days",
        "Target: job title + company size + intent signals",
        "Set bid strategy to Maximize Conversions with a target CPA cap",
        "Install conversion pixel and verify event firing before launch",
        "Pause ads at 3× target CPA; scale winners at 20% budget increments",
      ],
    },
  };
  return Promise.resolve(responses[mode] ?? responses.content);
};
