/**
 * Read-only solution views for ExecAI — one entry per thing the agent may look at.
 *
 * Every view is gated exactly as the module's own pages are: the caller's
 * effective `access.sections` (department ∩ plan) must include the section, and
 * the plan must include the solution. That mirrors `requireModule` on the HTTP
 * routes, so the agent can never read something its user couldn't open in the
 * UI — and, deliberately, it can't read anything MORE.
 *
 * An entry either names a `run` that calls the module's own service, or names a
 * `model` with a fixed `select` for a bounded list. `where` may be a function of
 * the caller, which is how "my tasks" stays scoped to the person asking.
 *
 * What is NOT here, on purpose: views whose service returns placeholder data.
 * Marketing attribution, channel performance and trend, network traffic
 * in/out split and service health currently return hard-coded values. An agent
 * that reported "your attribution revenue is $0" from a stub would be confidently
 * wrong, so those stay out until the services are backed by real data.
 */
import prisma from "../../config/database.js";
import * as crm from "../crm/crm.service.js";
import * as marketing from "../marketing/marketing.service.js";
import * as network from "../network/network.service.js";
import * as services from "../services/services.service.js";
import { currentIndustryId, listRecords } from "../crm/industries/industry.service.js";
import { industryObjects } from "../crm/industries/registry.js";

/** Longest list any view may hand back. Summaries are trimmed to this too. */
export const MAX_ROWS = 10;

/** `solution: ANY` gates on the section alone — for views spanning its solutions. */
const ANY = "*";

const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };

const SOLUTIONS = {
  // ── CRM ──────────────────────────────────────────────────────────────────
  crm_leads: { section: "crm", solution: "leads", title: "CRM leads", description: "List recent CRM leads (prospecting-stage opportunities).", model: "crmOpportunity", where: { stage: "prospecting" }, select: { id: true, name: true, stage: true, status: true, source: true, value: true } },
  crm_pipeline: { section: "crm", solution: "opportunities", title: "CRM pipeline", description: "Open pipeline by stage: count and value per stage, win rate and average deal size.", run: crm.getPipelineSummary },
  crm_renewals: { section: "crm", solution: "opportunities", title: "CRM renewals", description: "Renewal book summary. Renewal dates are ESTIMATED as one year after a deal closed; say so when reporting them.", run: crm.getRenewalsSummary },
  crm_forecast: { section: "crm", solution: "forecasting", title: "CRM forecast", description: "Read the CRM sales forecast summary. Its target is a fixed application placeholder.", run: crm.getForecastSummary },
  crm_analytics: { section: "crm", solution: "analytics", title: "CRM analytics", description: "Read the CRM analytics summary.", run: crm.getCrmAnalyticsSummary },
  crm_funnel: { section: "crm", solution: "analytics", title: "CRM funnel", description: "Deal funnel: how many opportunities and how much value sit at each stage.", run: crm.getCrmAnalyticsFunnel },
  crm_win_loss: { section: "crm", solution: "analytics", title: "CRM win/loss", description: "Won versus lost deals, by count and value.", run: crm.getCrmAnalyticsWinLoss },
  crm_my_tasks: {
    section: "crm", solution: "activities", title: "My open CRM tasks",
    description: "The signed-in user's own pending and in-progress CRM tasks, soonest due first. Use this for 'my tasks' — it needs no user id.",
    model: "crmTask",
    where: ({ userId }) => ({ userId, status: { in: ["pending", "in_progress"] } }),
    orderBy: { due_date: "asc" },
    select: { id: true, title: true, task_type: true, status: true, priority: true, due_date: true },
  },
  crm_my_meetings: {
    section: "crm", solution: "activities", title: "My upcoming meetings",
    description: "The signed-in user's own CRM meetings from today onwards, soonest first.",
    model: "crmFollowUp",
    where: ({ userId }) => ({ userId, follow_up_type: "meeting", scheduled_date: { gte: startOfToday() } }),
    orderBy: { scheduled_date: "asc" },
    select: { id: true, notes: true, status: true, scheduled_date: true },
  },

  // ── Marketing ────────────────────────────────────────────────────────────
  marketing_campaigns: { section: "marketing", solution: "engagement", title: "Campaign performance", description: "Campaign totals by status, total spend and revenue, and return on ad spend.", run: marketing.getCampaignSummary },
  marketing_audiences: { section: "marketing", solution: "engagement", title: "Marketing audiences", description: "List recent marketing audiences.", model: "marketingAudience", select: { id: true, name: true, type: true, size: true, status: true } },
  marketing_experiments: { section: "marketing", solution: "intelligence", title: "Marketing experiments", description: "List recent marketing experiments.", model: "marketingExperiment", select: { id: true, name: true, type: true, status: true, metric: true, confidence: true, lift: true } },
  marketing_summary: { section: "marketing", solution: "intelligence", title: "Marketing analytics", description: "Read the marketing analytics summary derived from campaign data.", run: marketing.getMarketingAnalyticsSummary },

  // ── Network ──────────────────────────────────────────────────────────────
  network_overview: { section: "network", title: "Network overview", description: "Read the network dashboard summary; health labels are application-derived estimates.", run: network.getDashboardOverview },
  network_capacity: { section: "network", title: "Network capacity", description: "Average CPU, memory and bandwidth across devices, and how many devices are at warning (CPU 75–89%) or critical (CPU 90%+).", run: network.getCapacitySummary },
  network_backup_health: { section: "network", title: "Backup health", description: "Total backups, today's successes and failures, and stored size.", run: network.getStorageStats },
  network_incidents: { section: "network", title: "Network incidents", description: "List recent network incidents.", model: "networkIncident", select: { id: true, title: true, severity: true, status: true, createdAt: true } },
  network_incident_timeline: {
    section: "network", title: "Incident timeline", needsId: true,
    description: "The event timeline of ONE incident — pass its id (from network_incidents) as `id`.",
    run: (tenantId, { id }) => network.getIncidentTimeline(tenantId, id),
  },
  network_changes: { section: "network", title: "Network changes", description: "List recent network change records, without approving or executing them.", model: "networkChange", select: { id: true, title: true, priority: true, status: true, createdAt: true } },
  network_backups: { section: "network", title: "Network backups", description: "List recent backup records, without creating or restoring backups.", model: "networkBackup", select: { id: true, backup_type: true, status: true, size_gb: true, createdAt: true } },

  // ── Business Services (admin-only section) ───────────────────────────────
  services_dashboard: { section: "services", solution: ANY, title: "Business services dashboard", description: "Income, expenses and net profit; project, team and client counts; SOP count; strategic goal progress.", run: services.getDashboardStats },
  services_goals: { section: "services", solution: "strategic", title: "Strategic goals", description: "Strategic goals with category, progress, status, priority and target date.", model: "bizGoal", select: { id: true, title: true, category: true, progress: true, status: true, priority: true, target_date: true } },
  services_market_analysis: { section: "services", solution: "strategic", title: "Market analyses", description: "Recorded market analyses with their market, type and status.", model: "bizMarketAnalysis", select: { id: true, title: true, market: true, analysis_type: true, status: true } },
  services_sops: { section: "services", solution: "operation", title: "Standard operating procedures", description: "SOPs with department, status and version (steps omitted).", model: "bizSOP", select: { id: true, title: true, department: true, status: true, version: true } },
  services_clients: { section: "services", solution: "marketing", title: "Business clients", description: "Clients with company, status, annual value, industry and contract end.", model: "bizClient", select: { id: true, name: true, company: true, status: true, annual_value: true, industry: true, contract_end: true } },
  services_investments: { section: "services", solution: "financial", title: "Investments", description: "Investments with type, current value and computed ROI.", run: services.listInvestments },
  services_tax_plans: { section: "services", solution: "financial", title: "Tax plans", description: "Tax plans by year with status and estimated savings.", model: "bizTaxPlan", orderBy: { year: "desc" }, select: { id: true, title: true, year: true, status: true, estimated_savings: true } },
};

/**
 * Plan + department gate. `solution` omitted means "the section is enough"
 * (Network is all-or-nothing on every plan that has it); `ANY` means "any one
 * solution in the section" — for a dashboard that spans them.
 */
export function hasSolutionAccess(access, section, solution) {
  if (!access?.sections?.includes(section)) return false;
  const allowed = access.plan?.solutions?.[section];
  if (section === "network") return allowed === "all";
  if (!Array.isArray(allowed)) return false;
  if (solution === ANY) return allowed.length > 0;
  return allowed.includes(solution);
}

export function solutionCatalog(access) {
  return Object.entries(SOLUTIONS).filter(([, entry]) =>
    hasSolutionAccess(access, entry.section, entry.solution),
  ).map(([id, entry]) => ({ id, title: entry.title, description: entry.description, needsId: !!entry.needsId }));
}

/** Arrays inside a summary can be long (every transaction, every rep). Trim them. */
function bound(value) {
  if (Array.isArray(value)) return value.slice(0, MAX_ROWS).map(bound);
  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, bound(v)]));
  }
  return value;
}

export async function readSolution({ access, tenantId, userId, solution, id }) {
  const entry = SOLUTIONS[solution];
  if (!entry || !hasSolutionAccess(access, entry.section, entry.solution)) {
    throw new Error("Solution is unavailable or not authorized.");
  }
  if (entry.needsId && (typeof id !== "string" || !id.trim() || id.length > 200)) {
    throw new Error("This view needs the id of one record.");
  }
  if (entry.run) {
    const data = await entry.run(tenantId, { userId, id });
    // A list-shaped service result renders as records; anything else as a summary.
    if (Array.isArray(data)) {
      return { title: entry.title, rows: bound(data), total: data.length, kind: "records" };
    }
    return { title: entry.title, data: bound(data), kind: "summary" };
  }
  const extra = typeof entry.where === "function" ? entry.where({ userId }) : entry.where;
  const where = { tenantId, ...extra };
  const [rows, total] = await Promise.all([
    prisma[entry.model].findMany({ where, select: entry.select, orderBy: entry.orderBy ?? { createdAt: "desc" }, take: MAX_ROWS }),
    prisma[entry.model].count({ where }),
  ]);
  return { title: entry.title, rows, total, kind: "records" };
}

export async function readIndustry({ access, tenantId, surface, objectType }) {
  if (!["crm", "marketing"].includes(surface) || !access?.sections?.includes(surface) || !access.plan?.industry) {
    throw new Error("Industry records are unavailable or not authorized.");
  }
  const industry = await currentIndustryId(tenantId);
  const objects = industryObjects(industry).filter((entry) => entry.surface === surface);
  if (!objectType) return { industry, objects: objects.map(({ id, name }) => ({ id, name })) };
  if (!objects.some(({ id }) => id === objectType)) throw new Error("Industry object is unavailable or not authorized.");
  const result = await listRecords(tenantId, industry, objectType, { limit: MAX_ROWS });
  return {
    industry, objectType, total: result.total,
    rows: result.records.map(({ id, stage, status, amount, currency, createdAt }) =>
      ({ id, stage, status, amount, currency, createdAt })),
  };
}
