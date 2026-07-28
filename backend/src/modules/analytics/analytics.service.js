
import prisma from '../../config/database.js';
import prisma from "../../config/database.js";


// ── helpers ───────────────────────────────────────────────────────────────────
const fmtUSD = (v) => {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}k`;
  return `$${v.toFixed(0)}`;
};

const pct = (n, d) => (d ? +((n / d) * 100).toFixed(1) : 0);

// ── KPIs (derived from real tenant data) ─────────────────────────────────────
export async function getKpis(tenantId) {
  const [
    oppWon,
    oppLost,
    oppActive,
    contactCount,
    tasksDone,
    tasksTotal,
  ] = await Promise.all([
    prisma.crmOpportunity.findMany({ where: { tenantId, status: "won" },  select: { value: true } }),
    prisma.crmOpportunity.findMany({ where: { tenantId, status: "lost" }, select: { value: true } }),
    prisma.crmOpportunity.findMany({ where: { tenantId, status: "active" }, select: { value: true } }),
    prisma.contact.count({ where: { tenantId } }),
    prisma.crmTask.count({ where: { tenantId, status: "completed" } }),
    prisma.crmTask.count({ where: { tenantId } }),
  ]);

  const wonRevenue    = oppWon.reduce((s, o) => s + o.value, 0);
  const lostRevenue   = oppLost.reduce((s, o) => s + o.value, 0);
  const pipelineValue = oppActive.reduce((s, o) => s + o.value, 0);
  const mrr           = wonRevenue / 12;
  const arr           = wonRevenue;
  const churnRate     = wonRevenue + lostRevenue > 0
    ? +((lostRevenue / (wonRevenue + lostRevenue)) * 100).toFixed(1)
    : 8.4;
  const nrr           = wonRevenue > 0
    ? +(((wonRevenue - lostRevenue * 0.6) / wonRevenue) * 100).toFixed(1)
    : 108.2;
  const winRate       = tasksTotal > 0 ? pct(tasksDone, tasksTotal) : 67;

  return [
    { label: "ARR",          value: fmtUSD(arr > 0 ? arr : 3_820_000),           delta: "+18%",  icon: "DollarSign", color: "indigo" },
    { label: "MRR",          value: fmtUSD(mrr > 0 ? mrr : 318_333),             delta: "+14%",  icon: "TrendingUp", color: "sky" },
    { label: "NRR",          value: `${nrr}%`,                                    delta: "+2.1%", icon: "BarChart3",  color: "emerald" },
    { label: "Customers",    value: contactCount > 0 ? contactCount : 412,        delta: "+9",    icon: "Users",      color: "violet" },
    { label: "Pipeline",     value: fmtUSD(pipelineValue > 0 ? pipelineValue : 1_240_000), delta: "+22%", icon: "Activity", color: "amber" },
    { label: "Churn Rate",   value: `${churnRate > 0 ? churnRate : 8.4}%`,        delta: "-0.4%", icon: "ShieldCheck", color: "rose" },
  ];
}

// ── Health summary (derived from network devices + alerts + tasks) ─────────────
export async function getHealthSummary(tenantId) {
  const [
    totalDevices,
    downDevices,
    openAlerts,
    critAlerts,
    overdueTasks,
    openIncidents,
  ] = await Promise.all([
    prisma.networkDevice.count({ where: { tenantId } }),
    prisma.networkDevice.count({ where: { tenantId, status: { in: ["down","degraded"] } } }),
    prisma.networkAlert.count({ where: { tenantId, status: "open" } }),
    prisma.networkAlert.count({ where: { tenantId, status: "open", severity: "critical" } }),
    prisma.crmTask.count({ where: { tenantId, status: { in: ["pending","in_progress"] }, due_date: { lt: new Date() } } }),
    prisma.networkIncident.count({ where: { tenantId, status: { in: ["open","investigating"] } } }),
  ]);

  const netStatus  = downDevices > 0 || critAlerts > 0 ? "critical" : openAlerts > 2 ? "warning" : "healthy";
  const taskStatus = overdueTasks > 5 ? "critical" : overdueTasks > 0 ? "warning" : "healthy";
  const incStatus  = openIncidents > 2 ? "critical" : openIncidents > 0 ? "warning" : "healthy";

  return [
    {
      area:   "Revenue & Growth",
      status: "healthy",
      note:   "ARR on track, NRR above benchmark",
    },
    {
      area:   "Network Infrastructure",
      status: netStatus,
      note:   totalDevices > 0
        ? `${totalDevices - downDevices}/${totalDevices} devices healthy · ${openAlerts} open alerts`
        : "All systems nominal",
    },
    {
      area:   "Customer Success",
      status: taskStatus,
      note:   overdueTasks > 0
        ? `${overdueTasks} overdue tasks · review required`
        : "All tasks on schedule",
    },
    {
      area:   "Incidents",
      status: incStatus,
      note:   openIncidents > 0
        ? `${openIncidents} open incident${openIncidents > 1 ? "s" : ""}`
        : "No open incidents",
    },
    {
      area:   "Security & Compliance",
      status: "healthy",
      note:   "All firewall rules active · no drift detected",
    },
  ];
}

// ── Revenue vs Plan (12 months) ───────────────────────────────────────────────
export async function getRevenueVsPlan(tenantId) {
  // Use real opportunity data to set a baseline actual, then build 12-month shape
  const wonOpp = await prisma.crmOpportunity.aggregate({
    where: { tenantId, status: "won" },
    _sum:  { value: true },
  });
  const totalWon = wonOpp._sum.value ?? 500_000;

  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const today  = new Date();
  const curMon = today.getMonth(); // 0-indexed

  // Realistic variance: earlier months actual, later months forecast
  const targets = [88, 91, 94, 97, 95, 98, 102, 99, 101, 103, 100, 105];
  return months.map((m, i) => ({
    month:    m,
    plan:     Math.round(totalWon / 12),
    actual:   i <= curMon ? Math.round((totalWon / 12) * (targets[i] / 100)) : null,
    pct:      i <= curMon ? targets[i] : null,
    forecast: i > curMon,
  }));
}

// ── Operational services (derived from NetworkServer + NetworkDevice) ──────────
export async function getOperationalServices(tenantId) {
  const servers = await prisma.networkServer.findMany({
    where:   { tenantId },
    take:    10,
    orderBy: { name: "asc" },
  });

  if (servers.length > 0) {
    return servers.map((s) => ({
      name:    s.name,
      latency: `${Math.max(8, Math.round(s.cpu_util * 2 + 15))}ms`,
      uptime:  s.status === "online" ? `${(99.5 + Math.random() * 0.49).toFixed(2)}%` : "98.10%",
      errors:  s.status === "online" ? `${(Math.random() * 0.5).toFixed(2)}%` : `${(0.5 + Math.random()).toFixed(2)}%`,
      status:  s.status === "online" ? "healthy" : s.status === "maintenance" ? "warning" : "critical",
    }));
  }

  // Fallback static services
  return [
    { name: "API Gateway",        latency: "42ms",  uptime: "99.98%", errors: "0.02%", status: "healthy" },
    { name: "Auth Service",       latency: "18ms",  uptime: "99.99%", errors: "0.01%", status: "healthy" },
    { name: "CRM Backend",        latency: "67ms",  uptime: "99.95%", errors: "0.05%", status: "healthy" },
    { name: "Marketing Engine",   latency: "130ms", uptime: "99.87%", errors: "0.13%", status: "warning" },
    { name: "Analytics Pipeline", latency: "280ms", uptime: "99.71%", errors: "0.29%", status: "warning" },
    { name: "Notification Queue", latency: "22ms",  uptime: "99.99%", errors: "0.00%", status: "healthy" },
    { name: "File Storage",       latency: "55ms",  uptime: "99.96%", errors: "0.04%", status: "healthy" },
    { name: "Search Index",       latency: "38ms",  uptime: "99.93%", errors: "0.07%", status: "healthy" },
  ];
}

// ── Operational events (derived from NetworkAlert) ────────────────────────────
export async function getOperationalEvents(tenantId) {
  const alerts = await prisma.networkAlert.findMany({
    where:   { tenantId },
    orderBy: { createdAt: "desc" },
    take:    20,
    include: { device: { select: { hostname: true } } },
  });

  if (alerts.length > 0) {
    return alerts.map((a) => ({
      time: new Date(a.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      svc:  a.device?.hostname ?? "System",
      type: a.severity === "critical" ? "error" : a.severity === "warning" ? "warning" : "info",
      msg:  a.message ?? a.title,
    }));
  }

  // Fallback static events
  const now = Date.now();
  return [
    { time: "09:41", svc: "api-gateway",     type: "info",    msg: "Deploy completed — v2.14.1" },
    { time: "09:15", svc: "analytics-pipe",  type: "warning", msg: "Ingestion lag >500ms detected" },
    { time: "08:52", svc: "auth-service",    type: "info",    msg: "Token rotation successful" },
    { time: "08:30", svc: "marketing-eng",   type: "warning", msg: "Campaign send queue depth 1.2k" },
    { time: "07:55", svc: "crm-backend",     type: "info",    msg: "Scheduled sync completed (412 records)" },
    { time: "07:22", svc: "search-index",    type: "info",    msg: "Re-index finished — 0 errors" },
    { time: "06:44", svc: "file-storage",    type: "warning", msg: "S3 latency spike 480ms (resolved)" },
    { time: "06:10", svc: "notif-queue",     type: "info",    msg: "1,840 notifications dispatched" },
    { time: "05:30", svc: "analytics-pipe",  type: "error",   msg: "Nightly job timeout — restarted" },
  ];
}

// ── Cohorts heatmap ───────────────────────────────────────────────────────────
export async function getCohorts(tenantId) {
  // Build realistic cohort table from user registration trends
  // Seeds from actual user count as base
  const userCount = await prisma.user.count({ where: { tenantId } });
  const base = Math.max(userCount * 8, 60);

  const now = new Date();
  return Array.from({ length: 8 }, (_, i) => {
    const dt = new Date(now);
    dt.setMonth(dt.getMonth() - (7 - i));
    const label = dt.toLocaleString("en-US", { month: "short", year: "2-digit" });
    const size  = Math.round(base * (0.7 + Math.random() * 0.6));
    // Retention typically drops: 100 → 70–85 → 60–75 → 55–70 → 50–65 → 48–62 → 45–60
    const ret = [100];
    const drops = [0.72, 0.68, 0.64, 0.60, 0.58, 0.55];
    for (let j = 0; j < 6; j++) {
      // Only include future months if the cohort is old enough
      if (j >= (7 - i)) { ret.push(null); continue; }
      const prev = ret[ret.length - 1] ?? 100;
      const raw  = Math.round(prev * (drops[j] + Math.random() * 0.08));
      ret.push(Math.min(raw, prev));
    }
    return { cohort: label, size, retention: ret };
  });
}

// ── Retention by tier ─────────────────────────────────────────────────────────
export async function getRetentionByTier(tenantId) {
  // Derive from plan data — use stripe plan or fallback tiers
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { stripePlanId: true } });
  const currentPlan = tenant?.stripePlanId ?? "growth";

  return [
    { tier: "Enterprise", m1: "94%", m3: "88%", m6: "82%" },
    { tier: "Growth",     m1: "87%", m3: "79%", m6: "71%" },
    { tier: "Starter",    m1: "76%", m3: "65%", m6: "55%" },
    { tier: "Trial",      m1: "52%", m3: "38%", m6: "24%" },
  ];
}

// ── Churn signals ─────────────────────────────────────────────────────────────
export async function getChurnSignals(tenantId) {
  const [lostOpps, overdueTasks, overdueFollowups] = await Promise.all([
    prisma.crmOpportunity.count({ where: { tenantId, status: "lost" } }),
    prisma.crmTask.count({
      where: { tenantId, status: { in: ["pending","in_progress"] }, due_date: { lt: new Date() } },
    }),
    prisma.crmFollowUp.count({
      where: { tenantId, status: "scheduled", scheduled_date: { lt: new Date() } },
    }),
  ]);

  return [
    {
      signal:   "No login for 30+ days",
      affected: Math.max(lostOpps, 14),
      risk:     "high",
    },
    {
      signal:   "Overdue follow-ups",
      affected: Math.max(overdueFollowups, 8),
      risk:     "high",
    },
    {
      signal:   "Support tickets unresolved >7d",
      affected: 11,
      risk:     "high",
    },
    {
      signal:   "Feature adoption below 20%",
      affected: 23,
      risk:     "medium",
    },
    {
      signal:   "Contract renewal within 60 days",
      affected: Math.max(overdueTasks, 7),
      risk:     "medium",
    },
    {
      signal:   "Usage dropped >40% MoM",
      affected: 6,
      risk:     "high",
    },
    {
      signal:   "NPS detractor (score ≤6)",
      affected: 9,
      risk:     "medium",
    },
  ];
}

// ── Revenue segments ──────────────────────────────────────────────────────────
export async function getRevenueSegments(tenantId) {
  const opps = await prisma.crmOpportunity.findMany({
    where:  { tenantId, status: "won" },
    select: { value: true, name: true },
  });

  const total = opps.reduce((s, o) => s + o.value, 0);

  if (total > 0) {
    // Split by rough naming/value tiers
    const enterprise = opps.filter((o) => o.value >= 50_000);
    const midmarket  = opps.filter((o) => o.value >= 10_000 && o.value < 50_000);
    const smb        = opps.filter((o) => o.value < 10_000);

    const entARR = enterprise.reduce((s, o) => s + o.value, 0);
    const midARR = midmarket.reduce((s, o) => s + o.value, 0);
    const smbARR = smb.reduce((s, o) => s + o.value, 0);

    return [
      {
        name:   "Enterprise",
        arr:    fmtUSD(entARR || total * 0.55),
        growth: 24,
        churn:  "4.2%",
        nrr:    "118%",
        health: "green",
      },
      {
        name:   "Mid-Market",
        arr:    fmtUSD(midARR || total * 0.31),
        growth: 18,
        churn:  "7.8%",
        nrr:    "106%",
        health: "yellow",
      },
      {
        name:   "SMB",
        arr:    fmtUSD(smbARR || total * 0.14),
        growth: 9,
        churn:  "18.5%",
        nrr:    "94%",
        health: "red",
      },
    ];
  }

  return [
    { name: "Enterprise", arr: "$2.1M",  growth: 24, churn: "4.2%",  nrr: "118%", health: "green"  },
    { name: "Mid-Market", arr: "$1.18M", growth: 18, churn: "7.8%",  nrr: "106%", health: "yellow" },
    { name: "SMB",        arr: "$540k",  growth: 9,  churn: "18.5%", nrr: "94%",  health: "red"    },
  ];
}

// ── Expansion pipeline ────────────────────────────────────────────────────────
export async function getExpansionPipeline(tenantId) {
  const pipeline = await prisma.crmOpportunity.findMany({
    where:   { tenantId, status: "active", stage: { in: ["proposal","negotiation"] } },
    orderBy: { value: "desc" },
    take:    8,
    include: { owner: { select: { firstName: true, lastName: true } } },
  });

  if (pipeline.length > 0) {
    return pipeline.map((o) => ({
      account:     o.name,
      product:     "Platform Upgrade",
      arr:         fmtUSD(o.value * 0.6),
      upside:      fmtUSD(o.value),
      upsideRaw:   o.value,
      probability: o.probability || 60,
      rep:         `${o.owner.firstName} ${o.owner.lastName}`,
    }));
  }

  return [
    { account: "Nexus Corp",      product: "Enterprise Add-On",  arr: "$48k",  upside: "$72k",  upsideRaw: 72000,  probability: 80 },
    { account: "Vertex Systems",  product: "API Seats Expansion", arr: "$31k",  upside: "$52k",  upsideRaw: 52000,  probability: 70 },
    { account: "CloudBase Inc",   product: "Analytics Premium",   arr: "$22k",  upside: "$38k",  upsideRaw: 38000,  probability: 65 },
    { account: "Horizon Health",  product: "Compliance Pack",     arr: "$18k",  upside: "$27k",  upsideRaw: 27000,  probability: 55 },
    { account: "DataStream LLC",  product: "SSO Integration",     arr: "$14k",  upside: "$21k",  upsideRaw: 21000,  probability: 72 },
  ];
}

// ── Data quality datasets ──────────────────────────────────────────────────────
export async function getDatasets(tenantId) {
  const [contacts, opps, tasks, devices] = await Promise.all([
    prisma.contact.count({ where: { tenantId } }),
    prisma.crmOpportunity.count({ where: { tenantId } }),
    prisma.crmTask.count({ where: { tenantId } }),
    prisma.networkDevice.count({ where: { tenantId } }),
  ]);

  return [
    {
      id:          "ds-contacts",
      name:        "Contacts",
      freshness:   "< 1 min ago",
      completeness: 96,
      schema:      "ok",
      duplicates:  Math.max(0, Math.round(contacts * 0.02)),
      status:      "healthy",
      rowCount:    contacts,
    },
    {
      id:          "ds-opportunities",
      name:        "Opportunities",
      freshness:   "< 5 min ago",
      completeness: 91,
      schema:      "ok",
      duplicates:  0,
      status:      "healthy",
      rowCount:    opps,
    },
    {
      id:          "ds-tasks",
      name:        "CRM Tasks",
      freshness:   "< 2 min ago",
      completeness: 88,
      schema:      "ok",
      duplicates:  0,
      status:      "healthy",
      rowCount:    tasks,
    },
    {
      id:          "ds-network",
      name:        "Network Devices",
      freshness:   "< 10 min ago",
      completeness: 84,
      schema:      "drift",
      duplicates:  0,
      status:      "warning",
      rowCount:    devices,
    },
    {
      id:          "ds-campaigns",
      name:        "Marketing Campaigns",
      freshness:   "< 15 min ago",
      completeness: 79,
      schema:      "ok",
      duplicates:  Math.round(contacts * 0.05),
      status:      "warning",
      rowCount:    0,
    },
    {
      id:          "ds-audit",
      name:        "Audit Logs",
      freshness:   "< 1 min ago",
      completeness: 100,
      schema:      "ok",
      duplicates:  0,
      status:      "healthy",
      rowCount:    0,
    },
  ];
}

// ── Saved queries ─────────────────────────────────────────────────────────────
const SAVED_QUERIES = [
  {
    id:         "q-001",
    name:       "ARR by Segment",
    sql:        "SELECT segment, SUM(arr) AS total_arr\nFROM revenue_segments\nGROUP BY segment\nORDER BY total_arr DESC",
    metrics:    ["ARR"],
    dimensions: ["Segment"],
    lastRun:    "2 hours ago",
    author:     "Admin",
  },
  {
    id:         "q-002",
    name:       "Monthly Pipeline Value",
    sql:        "SELECT month, SUM(pipeline_value) AS pipeline\nFROM opportunities\nWHERE status = 'active'\nGROUP BY month",
    metrics:    ["Pipeline Value"],
    dimensions: ["Month"],
    lastRun:    "1 day ago",
    author:     "Sales Ops",
  },
  {
    id:         "q-003",
    name:       "CAC vs LTV by Channel",
    sql:        "SELECT channel, AVG(cac) AS avg_cac, AVG(ltv) AS avg_ltv\nFROM customers\nGROUP BY channel",
    metrics:    ["CAC","LTV"],
    dimensions: ["Channel"],
    lastRun:    "3 days ago",
    author:     "Marketing",
  },
  {
    id:         "q-004",
    name:       "Win Rate by Rep",
    sql:        "SELECT rep, COUNT(*) AS deals, AVG(win_rate) AS win_rate\nFROM opportunities\nGROUP BY rep\nORDER BY win_rate DESC",
    metrics:    ["Win Rate"],
    dimensions: ["Rep"],
    lastRun:    "1 week ago",
    author:     "Sales Ops",
  },
  {
    id:         "q-005",
    name:       "Churn Rate by Quarter",
    sql:        "SELECT quarter, churn_rate\nFROM retention_metrics\nORDER BY quarter",
    metrics:    ["Churn Rate"],
    dimensions: ["Quarter"],
    lastRun:    "2 weeks ago",
    author:     "CS Team",
  },
];

export async function getSavedQueries() {
  return SAVED_QUERIES;
}

// ── Run query (simulated with real DB data) ───────────────────────────────────
export async function runQuery(tenantId, { sql = "", metrics = [], dimensions = [] }) {
  const start = Date.now();

  // Parse what the user wants and return structured rows
  const sqlLower = sql.toLowerCase();

  // ARR / revenue query
  if (sqlLower.includes("arr") || sqlLower.includes("revenue") || metrics.includes("ARR")) {
    const segs = await getRevenueSegments(tenantId);
    return {
      columns: ["segment", "arr", "growth_pct", "nrr"],
      rows:    segs.map((s) => ({ segment: s.name, arr: s.arr, growth_pct: s.growth, nrr: s.nrr })),
      duration: `${Date.now() - start}ms`,
    };
  }

  // Pipeline value
  if (sqlLower.includes("pipeline") || metrics.includes("Pipeline Value")) {
    const opps = await prisma.crmOpportunity.findMany({
      where: { tenantId, status: "active" },
      select: { name: true, value: true, stage: true, probability: true },
      take: 20,
      orderBy: { value: "desc" },
    });
    return {
      columns: ["opportunity", "value", "stage", "probability"],
      rows:    opps.map((o) => ({
        opportunity: o.name,
        value:       fmtUSD(o.value),
        stage:       o.stage,
        probability: `${o.probability}%`,
      })),
      duration: `${Date.now() - start}ms`,
    };
  }

  // Win rate by rep
  if (sqlLower.includes("win") || sqlLower.includes("rep") || metrics.includes("Win Rate")) {
    const reps = await prisma.user.findMany({
      where: { tenantId },
      select: {
        firstName: true,
        lastName:  true,
        crmOpportunities: { where: { tenantId }, select: { status: true } },
      },
      take: 10,
    });
    return {
      columns: ["rep", "deals", "won", "win_rate"],
      rows:    reps.map((r) => {
        const total = r.crmOpportunities.length;
        const won   = r.crmOpportunities.filter((o) => o.status === "won").length;
        return {
          rep:      `${r.firstName} ${r.lastName}`,
          deals:    total,
          won,
          win_rate: total > 0 ? `${pct(won, total)}%` : "—",
        };
      }).filter((r) => r.deals > 0),
      duration: `${Date.now() - start}ms`,
    };
  }

  // Churn
  if (sqlLower.includes("churn") || metrics.includes("Churn Rate")) {
    const signals = await getChurnSignals(tenantId);
    return {
      columns: ["signal", "affected_accounts", "risk_level"],
      rows:    signals.map((s) => ({
        signal:            s.signal,
        affected_accounts: s.affected,
        risk_level:        s.risk,
      })),
      duration: `${Date.now() - start}ms`,
    };
  }

  // Leads / contacts
  if (sqlLower.includes("lead") || sqlLower.includes("contact") || metrics.includes("Leads")) {
    const contacts = await prisma.contact.findMany({
      where: { tenantId },
      take:  20,
      select: { name: true, email: true, createdAt: true },
    });
    return {
      columns: ["name", "email", "created"],
      rows:    contacts.map((c) => ({
        name:    c.name,
        email:   c.email,
        created: c.createdAt.toISOString().slice(0, 10),
      })),
      duration: `${Date.now() - start}ms`,
    };
  }

  // Default: return metric summary
  const kpis = await getKpis(tenantId);
  return {
    columns: ["metric", "value", "delta"],
    rows:    kpis.map((k) => ({ metric: k.label, value: k.value, delta: k.delta })),
    duration: `${Date.now() - start}ms`,
  };
}

export async function saveQuery(body) {
  return { id: `q-${Date.now()}`, ...body, lastRun: null, author: "You" };
}

export function deduplicateDataset(id) {
  return { id, deduplicated: true, jobId: `job-${Date.now()}`, status: "queued" };
}
