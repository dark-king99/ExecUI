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
  { label: "Integrations",       path: "/account/integrations", section: null, keywords: "integrations connections webhooks external api secrets outbound" },
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

  // Company-wide pages that live outside the module sidebars. These were
  // reachable only from the sidebar until now, which made them invisible to
  // Ctrl+K — the fastest way to move around the product.
  { label: "Documents",          path: "/documents",  section: null, keywords: "documents files versions templates upload signature esign envelope" },
  { label: "Signatures",         path: "/documents?tab=signatures", section: null, adminOnly: true, keywords: "signature esign envelope sign parties certificate" },
  { label: "Contracts",          path: "/contracts",  section: null, adminOnly: true, keywords: "contracts clm register renewal counterparty notice period agreement msa nda" },
  { label: "HR",                 path: "/people",     section: null, keywords: "hr people directory employees staff onboarding leave timesheet payslip my hr" },
  { label: "Leave",              path: "/people?tab=leave", section: null, keywords: "leave holiday vacation absence time off balance" },
  { label: "Timesheets",         path: "/people?tab=time",  section: null, keywords: "timesheet hours time tracking approve" },
  { label: "Payroll",            path: "/people?tab=payroll", section: null, adminOnly: true, keywords: "payroll pay run payslip salary wages tax bank file components hr" },
  { label: "Helpdesk",           path: "/helpdesk",   section: "crm", keywords: "helpdesk support tickets queue knowledge base portal customer" },
  { label: "Approvals",          path: "/approvals",  section: null, keywords: "approvals sign off requests inbox decide" },
  { label: "Rewards",            path: "/rewards",    section: null, keywords: "rewards points leaderboard perks" },
  { label: "Global search",      path: "/search",     section: null, keywords: "search everything find records global" },
  { label: "Compliance",         path: "/account/compliance", section: null, adminOnly: true, keywords: "compliance governance dsar erasure retention legal hold gdpr privacy" },
  { label: "Workflows",          path: "/account/workflows",  section: null, adminOnly: true, keywords: "workflows automation rules approvals chains" },
  { label: "Developer",          path: "/account/developer",  section: null, adminOnly: true, keywords: "developer api tokens webhooks openapi" },
  { label: "Single sign-on",     path: "/account/sso",        section: null, adminOnly: true, keywords: "sso saml oidc scim provisioning identity" },
];

export const SEARCH_INDEX = [
  ...STATIC,
  ...fromConfig(CRM, "crm", "CRM"),
  ...fromConfig(MKT, "marketing", "Marketing"),
  ...fromConfig(NET, "network", "Network"),
  ...fromConfig(ANA, "analytics", "Analytics"),
];

/** Can this person actually open that destination? */
export const canReach = (entry, allowedSections = [], isAdmin = false) =>
  (entry.section == null || allowedSections.includes(entry.section)) &&
  (!entry.adminOnly || isAdmin);

/**
 * Rank index entries against a query, filtered by what the user can reach.
 * Offering a page that immediately redirects is worse than not offering it, so
 * admin-only destinations are hidden rather than listed and then bounced.
 */
export function searchApp(query, allowedSections = [], isAdmin = false) {
  const q = (query || "").trim().toLowerCase();
  if (!q) return [];
  const tokens = q.split(/\s+/).filter(Boolean);
  return SEARCH_INDEX
    .filter((e) => canReach(e, allowedSections, isAdmin))
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
