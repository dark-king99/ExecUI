import prisma from "../../config/database.js";
import * as crm from "../crm/crm.service.js";
import * as marketing from "../marketing/marketing.service.js";
import * as network from "../network/network.service.js";
import { currentIndustryId, listRecords } from "../crm/industries/industry.service.js";
import { industryObjects } from "../crm/industries/registry.js";

const SOLUTIONS = {
  crm_leads: { section: "crm", solution: "leads", title: "CRM leads", description: "List recent CRM leads (prospecting-stage opportunities).", model: "crmOpportunity", where: { stage: "prospecting" }, select: { id: true, name: true, stage: true, status: true, source: true, value: true } },
  crm_forecast: { section: "crm", solution: "forecasting", title: "CRM forecast", description: "Read the CRM sales forecast summary. Its target is a fixed application placeholder.", run: crm.getForecastSummary },
  crm_analytics: { section: "crm", solution: "analytics", title: "CRM analytics", description: "Read the CRM analytics summary.", run: crm.getCrmAnalyticsSummary },
  marketing_audiences: { section: "marketing", solution: "engagement", title: "Marketing audiences", description: "List recent marketing audiences.", model: "marketingAudience", select: { id: true, name: true, type: true, size: true, status: true } },
  marketing_experiments: { section: "marketing", solution: "intelligence", title: "Marketing experiments", description: "List recent marketing experiments.", model: "marketingExperiment", select: { id: true, name: true, type: true, status: true, metric: true, confidence: true, lift: true } },
  marketing_summary: { section: "marketing", solution: "intelligence", title: "Marketing analytics", description: "Read the marketing analytics summary derived from campaign data.", run: marketing.getMarketingAnalyticsSummary },
  network_overview: { section: "network", title: "Network overview", description: "Read the network dashboard summary; health labels are application-derived estimates.", run: network.getDashboardOverview },
  network_incidents: { section: "network", title: "Network incidents", description: "List recent network incidents.", model: "networkIncident", select: { id: true, title: true, severity: true, status: true, createdAt: true } },
  network_changes: { section: "network", title: "Network changes", description: "List recent network change records, without approving or executing them.", model: "networkChange", select: { id: true, title: true, priority: true, status: true, createdAt: true } },
  network_backups: { section: "network", title: "Network backups", description: "List recent backup records, without creating or restoring backups.", model: "networkBackup", select: { id: true, backup_type: true, status: true, size_gb: true, createdAt: true } },
};

export function hasSolutionAccess(access, section, solution) {
  if (!access?.sections?.includes(section)) return false;
  const allowed = access.plan?.solutions?.[section];
  if (section === "network") return allowed === "all";
  return Array.isArray(allowed) && allowed.includes(solution);
}

export function solutionCatalog(access) {
  return Object.entries(SOLUTIONS).filter(([, entry]) =>
    hasSolutionAccess(access, entry.section, entry.solution),
  ).map(([id, entry]) => ({ id, title: entry.title, description: entry.description }));
}

export async function readSolution({ access, tenantId, solution }) {
  const entry = SOLUTIONS[solution];
  if (!entry || !hasSolutionAccess(access, entry.section, entry.solution)) {
    throw new Error("Solution is unavailable or not authorized.");
  }
  if (entry.run) return { title: entry.title, data: await entry.run(tenantId), kind: "summary" };
  const where = { tenantId, ...entry.where };
  const [rows, total] = await Promise.all([
    prisma[entry.model].findMany({ where, select: entry.select, orderBy: { createdAt: "desc" }, take: 10 }),
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
  const result = await listRecords(tenantId, industry, objectType, { limit: 10 });
  return {
    industry, objectType, total: result.total,
    rows: result.records.map(({ id, stage, status, amount, currency, createdAt }) =>
      ({ id, stage, status, amount, currency, createdAt })),
  };
}
