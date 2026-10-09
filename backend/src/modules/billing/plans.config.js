/**
 * Subscription plans + entitlements (single source of truth).
 * Mirrored on the frontend in src/lib/plans.js.
 *
 * A tenant's plan caps which modules/solutions the ORG has access to.
 * A user's department (access.policy) further caps what that employee sees.
 * Effective access = plan entitlements ∩ department permissions.
 *
 * PRICES here are the published list: high-income market, SME segment. What a
 * given tenant actually pays runs through the regional price book in
 * pricing.book.js — see `priceFor`.
 */
import { multiplierFor, marketFor, displayPrice } from "./pricing.book.js";

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
// Starter is deliberately thin — enough to run a pipeline, not enough to
// cannibalise Standard.
const CRM_MIN = ["leads", "accounts", "activities"];
const MKT_MIN = ["engagement"];
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
  starter:    100,
  standard:   300,
  premium:    1_500,
  enterprise: 6_000,
  executive:  30_000,
  custom:     1_500,
};

export const PLANS = [
  // The long tail. Standard was the floor, which meant the smallest customer
  // we could serve was one already spending real money on software — most of the
  // market was priced out before the regional book even applied. Starter is a
  // genuine entry point: the CRM and marketing basics, nothing else.
  { id: "starter",    name: "Starter",    price: 129,  tagline: "The essentials for a small team",
    crm: CRM_MIN, marketing: MKT_MIN, services: [],          network: false, industry: false, ai: AI_LIMITS.starter },
  { id: "standard",   name: "Standard",   price: 449,  tagline: "Core CRM & Marketing to get selling",
    crm: CRM_STD, marketing: MKT_STD, services: [],          network: false, industry: true, ai: AI_LIMITS.standard },
  { id: "premium",    name: "Premium",    price: 1099, tagline: "Full CRM & Marketing + core Services", highlighted: true,
    crm: CRM_ALL, marketing: MKT_ALL, services: SVC_PREMIUM, network: false, industry: true, ai: AI_LIMITS.premium },
  { id: "enterprise", name: "Enterprise", price: 2199, tagline: "Everything in Premium + full Services",
    crm: CRM_ALL, marketing: MKT_ALL, services: SVC_ALL,     network: false, industry: true, sso: true, branding: true, ai: AI_LIMITS.enterprise },
  // Executive includes Network Ops. The base price covers the small-office
  // network profile; the enterprise (datacenter) network profile is priced higher.
  { id: "executive",  name: "Executive",  price: 5599, networkDatacenterPrice: 6099,
    tagline: "The complete platform, including Network Ops",
    crm: CRM_ALL, marketing: MKT_ALL, services: SVC_ALL,     network: true,  industry: true, sso: true, branding: true, ai: AI_LIMITS.executive },
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

function build({ crm = [], marketing = [], services = [], network = false, industry = false, sso = false, branding = false }) {
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
    sso: !!sso,
    // White-labelling: an upsell tier, like SSO. Gates only what a tenant may
    // SET — an existing value simply stops being applied on a lesser plan.
    branding: !!branding,
  };
}

/** Resolve entitlements for a tenant's plan (+ custom solutions). */
export function entitlementsFor(planId, customSolutions = []) {
  if (planId === "custom") return build(parseCustom(customSolutions));
  const p = PLANS.find((x) => x.id === planId) || PLANS.find((x) => x.id === DEFAULT_PLAN);
  return build(p);
}

/**
 * The published (high-income, SME) list price for a plan, before the price book.
 * This is what the pricing page shows a visitor whose market we don't know.
 */
export function listPriceFor(planId, customSolutions = [], opts = {}) {
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

/**
 * Monthly price in USD for a plan, after the regional price book.
 *
 * @param opts.networkProfile "office" | "datacenter" — Executive costs more on datacenter.
 * @param opts.industry tenant industry id — Custom adds a surcharge when one is chosen.
 * @param opts.country ISO-3166 alpha-2 — selects the income band.
 * @param opts.segment sme | mid_market | enterprise | regulated.
 *
 * Callers that pass neither country nor segment get the list price unchanged,
 * which is what keeps every existing caller and every existing tenant on
 * exactly the price they had before the book existed.
 */
export function priceFor(planId, customSolutions = [], opts = {}) {
  const list = listPriceFor(planId, customSolutions, opts);
  if (!list) return 0;
  if (opts.country == null && opts.segment == null) return list;
  const price = list * multiplierFor({ country: opts.country, segment: opts.segment });
  // Whole dollars: an invoice for $79.80 reads like a mistake, and cent-level
  // minor units make fractional cents somebody else's rounding problem.
  return Math.max(1, Math.round(price));
}

/** The full pricing picture for one plan in one market. */
export function quoteFor(planId, customSolutions = [], opts = {}) {
  const list = listPriceFor(planId, customSolutions, opts);
  const usd = priceFor(planId, customSolutions, opts);
  const market = marketFor({ country: opts.country, segment: opts.segment });
  return {
    plan: planId,
    listUsd: list,
    ...displayPrice(usd, { country: opts.country }),
    market,
    // Shown as "60% off list in your market" — or a surcharge above 1.
    adjustment: list ? Math.round((usd / list) * 100) / 100 : 1,
  };
}

export function planLabel(planId) {
  if (planId === "custom") return "Custom";
  return PLANS.find((x) => x.id === planId)?.name ?? "—";
}
