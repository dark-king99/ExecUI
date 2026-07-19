/**
 * Subscription plans + entitlements (frontend mirror of
 * backend/src/modules/billing/plans.config.js).
 *
 * A tenant's plan caps which modules/solutions the ORG can access.
 * A user's department (access.js) further caps what that employee sees.
 * Effective access = plan entitlements ∩ department permissions.
 */

export const CRM_SOLUTIONS = [
  { id: "leads",         name: "Leads" },
  { id: "accounts",      name: "Accounts & Contacts" },
  { id: "opportunities", name: "Opportunities" },
  { id: "forecasting",   name: "Forecasting" },
  { id: "activities",    name: "Activities" },
  { id: "einstein",      name: "Einstein (Sales AI)" },
  { id: "analytics",     name: "CRM Analytics" },
  { id: "service",       name: "Service Cloud" },
  { id: "partners",      name: "Partners" },
];
export const MKT_SOLUTIONS = [
  { id: "engagement",         name: "Engagement" },
  { id: "account-engagement", name: "Account Engagement" },
  { id: "personalization",    name: "Personalization" },
  { id: "datacloud",          name: "Data Cloud" },
  { id: "intelligence",       name: "Intelligence" },
  { id: "einstein",           name: "Einstein (Marketing AI)" },
  { id: "commerce",           name: "Commerce" },
];
export const SERVICES_SOLUTIONS = [
  { id: "financial", name: "Financial Management" },
  { id: "operation", name: "Operations System" },
  { id: "strategic", name: "Strategic Planning" },
  { id: "marketing", name: "Marketing & Sales" },
  { id: "team",      name: "Team & Project" },
];

const ids = (arr) => arr.map((s) => s.id);
const CRM_ALL = ids(CRM_SOLUTIONS);
const MKT_ALL = ids(MKT_SOLUTIONS);
const SVC_ALL = ids(SERVICES_SOLUTIONS);

const CRM_STD = ["leads", "accounts", "opportunities", "forecasting", "activities"];
const MKT_STD = ["engagement", "account-engagement", "personalization", "intelligence"];
const SVC_PREMIUM = ["financial", "operation", "strategic"];

// Monthly AI-assist request allowance per plan (mirrors backend plans.config.js).
export const AI_LIMITS = {
  standard:   300,
  premium:    1_500,
  enterprise: 6_000,
  executive:  30_000,
  custom:     1_500,
};

export const PLANS = [
  { id: "standard",   name: "Standard",   price: 399,  tagline: "Core CRM & Marketing to get selling",
    crm: CRM_STD, marketing: MKT_STD, services: [],          network: false, industry: true, ai: AI_LIMITS.standard },
  { id: "premium",    name: "Premium",    price: 999,  tagline: "Full CRM & Marketing + core Services", highlighted: true,
    crm: CRM_ALL, marketing: MKT_ALL, services: SVC_PREMIUM, network: false, industry: true, ai: AI_LIMITS.premium },
  { id: "enterprise", name: "Enterprise", price: 1999, tagline: "Everything in Premium + full Services",
    crm: CRM_ALL, marketing: MKT_ALL, services: SVC_ALL,     network: false, industry: true, ai: AI_LIMITS.enterprise },
  { id: "executive",  name: "Executive",  price: 5099, networkDatacenterPrice: 5599,
    tagline: "The complete platform, including Network Ops",
    crm: CRM_ALL, marketing: MKT_ALL, services: SVC_ALL,     network: true,  industry: true, ai: AI_LIMITS.executive },
];

export const CUSTOM = { id: "custom", name: "Custom", unitPrice: 49, minUnits: 8, industryPrice: 100, ai: AI_LIMITS.custom };
export const DEFAULT_PLAN = "executive";

/** Monthly AI request allowance for a plan. */
export function aiLimitFor(planId) {
  return AI_LIMITS[planId] ?? AI_LIMITS[DEFAULT_PLAN] ?? 0;
}

const parseCustom = (customSolutions = []) => {
  const crm = [], marketing = [];
  for (const s of customSolutions) {
    if (s.startsWith("crm:")) crm.push(s.slice(4));
    else if (s.startsWith("marketing:")) marketing.push(s.slice(10));
  }
  return { crm, marketing };
};

function build({ crm = [], marketing = [], services = [], network = false }) {
  const sections = [];
  if (crm.length) sections.push("crm");
  if (marketing.length) sections.push("marketing");
  if (services.length) sections.push("services");
  if (network) sections.push("network");
  const analyticsSlices = [];
  if (crm.length) analyticsSlices.push("sales");
  if (marketing.length) analyticsSlices.push("marketing");
  if (network) analyticsSlices.push("network");
  if (analyticsSlices.length) sections.push("analytics");
  return {
    sections,
    solutions: { crm, marketing, services, network: network ? "all" : [] },
    analyticsSlices,
  };
}

export function entitlementsFor(planId, customSolutions = []) {
  if (planId === "custom") return build(parseCustom(customSolutions));
  const p = PLANS.find((x) => x.id === planId) || PLANS.find((x) => x.id === DEFAULT_PLAN);
  return build(p);
}

export function priceFor(planId, customSolutions = [], opts = {}) {
  if (planId === "custom") {
    const units = (customSolutions || []).filter((s) => s.startsWith("crm:") || s.startsWith("marketing:")).length;
    const industryAddon = opts.industry && opts.industry !== "general" ? CUSTOM.industryPrice : 0;
    return CUSTOM.unitPrice * units + industryAddon;
  }
  const p = PLANS.find((x) => x.id === planId);
  if (!p) return 0;
  if (planId === "executive" && opts.networkProfile === "datacenter" && p.networkDatacenterPrice) return p.networkDatacenterPrice;
  return p.price;
}

export function planLabel(planId) {
  if (planId === "custom") return "Custom";
  return PLANS.find((x) => x.id === planId)?.name ?? "—";
}

/** True if a tenant on `planId` has access to a given solution in a module. */
export function planHasSolution(planId, customSolutions, module, solutionId) {
  const ent = entitlementsFor(planId, customSolutions);
  if (module === "network") return ent.solutions.network === "all";
  const list = ent.solutions[module] || [];
  return list.includes(solutionId);
}
