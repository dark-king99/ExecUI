/**
 * Application search index — a flat catalog of navigable destinations
 * (modules, solutions, solution pages, account & service pages) used by the
 * navbar search. Department access is respected: results in a module the
 * employee can't access are filtered out.
 */
import { SOLUTIONS as MKT } from "../apps/marketing/solutions.config";
import { SOLUTIONS as CRM } from "../apps/crm/solutions.config";
import { SOLUTIONS as NET } from "../apps/network/solutions.config";
import { SOLUTIONS as ANA } from "../apps/analytics/solutions.config";

function fromConfig(sols, section, sectionLabel) {
  const out = [];
  sols.forEach((s) => {
    (s.pages || []).forEach((p) => {
      out.push({
        label: p.label,
        group: `${sectionLabel} · ${s.name}`,
        path: p.path,
        section,
        keywords: `${s.name} ${s.tagline || ""} ${p.label} ${section}`,
      });
    });
  });
  return out;
}

const STATIC = [
  { label: "Home",               path: "/home",                 section: null, keywords: "home landing start" },
  { label: "Executive Overview", path: "/overview",             section: null, keywords: "overview dashboard executive kpi efficiency" },
  { label: "Profile",            path: "/account/profile",      section: null, keywords: "account profile avatar photo name" },
  { label: "Security",           path: "/account/security",     section: null, keywords: "account security password mfa sessions" },
  { label: "Notifications",      path: "/account/notifications",section: null, keywords: "account notifications alerts" },
  { label: "API Keys",           path: "/account/api-keys",     section: null, keywords: "account api keys tokens" },
  { label: "Organization",       path: "/account/organization", section: null, keywords: "organization enterprise company" },
  { label: "Members",            path: "/account/members",      section: null, keywords: "members team employees people" },
  { label: "Billing",            path: "/account/billing",      section: null, keywords: "billing plan subscription invoices" },
  { label: "Audit Logs",         path: "/account/audit",        section: null, keywords: "audit logs activity history" },

  { label: "CRM · Sales Cloud",  path: "/crm",       section: "crm",       keywords: "crm sales cloud customers deals pipeline" },
  { label: "Marketing Cloud",    path: "/marketing", section: "marketing", keywords: "marketing campaigns email journeys" },
  { label: "Network Operations", path: "/network",   section: "network",   keywords: "network ops devices alerts traffic" },
  { label: "Analytics",          path: "/analytics", section: "analytics", keywords: "analytics data reports insights" },

  { label: "Services Dashboard", path: "/services/dashboard", section: "services", keywords: "services dashboard overview" },
  { label: "Financial Management", path: "/services/financial", section: "services", keywords: "finance revenue expenses cash flow" },
  { label: "Operations System",  path: "/services/operation", section: "services", keywords: "operations sop process" },
  { label: "Strategic Planning", path: "/services/strategic", section: "services", keywords: "strategy goals okr roadmap" },
  { label: "Marketing & Sales",  path: "/services/marketing", section: "services", keywords: "marketing sales revenue" },
  { label: "Team & Project",     path: "/services/team",      section: "services", keywords: "team project coordination tasks" },
];

export const SEARCH_INDEX = [
  ...STATIC,
  ...fromConfig(CRM, "crm", "CRM"),
  ...fromConfig(MKT, "marketing", "Marketing"),
  ...fromConfig(NET, "network", "Network"),
  ...fromConfig(ANA, "analytics", "Analytics"),
];

/** Rank index entries against a query, filtered by the user's allowed sections. */
export function searchApp(query, allowedSections = []) {
  const q = (query || "").trim().toLowerCase();
  if (!q) return [];
  const tokens = q.split(/\s+/).filter(Boolean);
  return SEARCH_INDEX
    .filter((e) => e.section == null || allowedSections.includes(e.section))
    .map((e) => {
      const label = e.label.toLowerCase();
      const hay = `${label} ${(e.group || "").toLowerCase()} ${e.keywords.toLowerCase()} ${e.path.toLowerCase()}`;
      let score = 0;
      if (label === q) score += 200;
      if (label.startsWith(q)) score += 120;
      if (label.includes(q)) score += 60;
      if (e.path.toLowerCase().includes(q)) score += 40;
      if (hay.includes(q)) score += 15;
      tokens.forEach((t) => { if (hay.includes(t)) score += 6; });
      return { ...e, score };
    })
    .filter((e) => e.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
}
