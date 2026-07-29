/**
 * Subscription plans + entitlements (single source of truth).
 * Mirrored on the frontend in src/lib/plans.js.
 *
 * A tenant's plan caps which modules/solutions the ORG has access to.
 * A user's department (access.policy) further caps what that employee sees.
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
  { id: "social",             name: "Social" },
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

// "Important half" for the Standard plan.
const CRM_STD = ["leads", "accounts", "opportunities", "forecasting", "activities"];
const MKT_STD = ["engagement", "account-engagement", "personalization", "intelligence", "social"];
// Premium ships the core services; Enterprise/Executive ship all of them.
const SVC_PREMIUM = ["financial", "operation", "strategic"];

// Monthly AI-assist request allowance per plan. AI features (Einstein copilots,
// content generation, insights) draw from this pool; it resets each calendar
// month. Enforced server-side in lib/aiQuota.js and surfaced on the plan cards.
// (Only consumed when a real AI provider is configured — the free deterministic
// responses are unlimited, so an unconfigured install has no AI cost at all.)
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
  // Executive includes Network Ops. The base price covers the small-office
  // network profile; the enterprise (datacenter) network profile is priced higher.
  { id: "executive",  name: "Executive",  price: 5099, networkDatacenterPrice: 5599,
    tagline: "The complete platform, including Network Ops",
    crm: CRM_ALL, marketing: MKT_ALL, services: SVC_ALL,     network: true,  industry: true, ai: AI_LIMITS.executive },
];

// Custom plans pick 8+ CRM/Marketing solutions ($49 each) and may add one
// industry customization for a flat surcharge.
export const CUSTOM = { id: "custom", name: "Custom", unitPrice: 49, minUnits: 8, industryPrice: 100, ai: AI_LIMITS.custom };

/** Monthly AI request allowance for a plan (defaults to the DEFAULT_PLAN's). */
export function aiLimitFor(planId) {
  return AI_LIMITS[planId] ?? AI_LIMITS[DEFAULT_PLAN] ?? 0;
}

export const DEFAULT_PLAN = "executive"; // free + full during early distribution

const parseCustom = (customSolutions = []) => {
  const crm = [], marketing = [];
  for (const s of customSolutions) {
    if (s.startsWith("crm:")) crm.push(s.slice(4));
    else if (s.startsWith("marketing:")) marketing.push(s.slice(10));
  }
  // Custom plans can always opt into an industry (billed as a surcharge).
  return { crm, marketing, industry: true };
};

function build({ crm = [], marketing = [], services = [], network = false, industry = false }) {
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
    industry: !!industry,
  };
}

/** Resolve entitlements for a tenant's plan (+ custom solutions). */
export function entitlementsFor(planId, customSolutions = []) {
  if (planId === "custom") return build(parseCustom(customSolutions));
  const p = PLANS.find((x) => x.id === planId) || PLANS.find((x) => x.id === DEFAULT_PLAN);
  return build(p);
}

/**
 * Monthly price for a plan.
 * @param opts.networkProfile "office" | "datacenter" — Executive costs more on datacenter.
 * @param opts.industry tenant industry id — Custom adds a surcharge when one is chosen.
 */
export function priceFor(planId, customSolutions = [], opts = {}) {
  if (planId === "custom") {
    const units = (customSolutions || []).filter((s) => s.startsWith("crm:") || s.startsWith("marketing:")).length;
    const industryAddon = opts.industry && opts.industry !== "general" ? CUSTOM.industryPrice : 0;
    return CUSTOM.unitPrice * units + industryAddon;
  }
  const p = PLANS.find((x) => x.id === planId);
  if (!p) return 0;
  if (planId === "executive" && opts.networkProfile === "datacenter" && p.networkDatacenterPrice) {
    return p.networkDatacenterPrice;
  }
  return p.price;
}

export function planLabel(planId) {
  if (planId === "custom") return "Custom";
  return PLANS.find((x) => x.id === planId)?.name ?? "—";
}
