/**
 * Every destination outside the module solution configs — the pages Ctrl/⌘ + K
 * and the navbar search can take you to.
 *
 * Each entry declares what it needs (`section`, `solution`, `adminOnly`) and
 * `lib/visibility.js` decides who sees it. Anything not declared is visible to
 * everybody, so a new admin page must say so or the test in
 * `backend/test/visibility.test.mjs` fails.
 *
 * Deliberately free of JSX imports so it can be loaded — and checked — outside a
 * bundler.
 */
export const STATIC_DESTINATIONS = [
  { label: "Home",               path: "/home",                 section: null, keywords: "home landing start" },
  { label: "Executive Overview", path: "/overview",             section: null, keywords: "overview dashboard executive kpi efficiency" },
  { label: "Profile",            path: "/account/profile",      section: null, keywords: "account profile avatar photo name" },
  { label: "Security",           path: "/account/security",     section: null, keywords: "account security password mfa sessions" },
  { label: "Notifications",      path: "/account/notifications",section: null, keywords: "account notifications alerts" },
  { label: "Integrations",       path: "/account/integrations", section: null, adminOnly: true, keywords: "integrations connections webhooks external api secrets outbound" },
  { label: "Organization", adminOnly: true,       path: "/account/organization", section: null, keywords: "organization enterprise company" },
  { label: "Members", adminOnly: true,            path: "/account/members",      section: null, keywords: "members team employees people" },
  { label: "Billing", adminOnly: true,            path: "/account/billing",      section: null, keywords: "billing plan subscription invoices" },
  { label: "Audit Logs", adminOnly: true,         path: "/account/audit",        section: null, keywords: "audit logs activity history" },

  { label: "CRM · Sales Cloud",  path: "/crm",       section: "crm",       keywords: "crm sales cloud customers deals pipeline" },
  { label: "Marketing Cloud",    path: "/marketing", section: "marketing", keywords: "marketing campaigns email journeys" },
  { label: "Network Operations", path: "/network",   section: "network",   keywords: "network ops devices alerts traffic" },
  { label: "Analytics",          path: "/analytics", section: "analytics", keywords: "analytics data reports insights" },

  { label: "Services Dashboard", path: "/services/dashboard", section: "services", keywords: "services dashboard overview" },
  { label: "Financial Management", path: "/services/financial", section: "services", solution: "financial", keywords: "finance revenue expenses cash flow" },
  { label: "Operations System",  path: "/services/operation", section: "services", solution: "operation", keywords: "operations sop process" },
  { label: "Strategic Planning", path: "/services/strategic", section: "services", solution: "strategic", keywords: "strategy goals okr roadmap" },
  { label: "Marketing & Sales",  path: "/services/marketing", section: "services", solution: "marketing", keywords: "marketing sales revenue" },
  { label: "Team & Project",     path: "/services/team",      section: "services", solution: "team", keywords: "team project coordination tasks" },

  // Company-wide pages that live outside the module sidebars. These were
  // reachable only from the sidebar until now, which made them invisible to
  // Ctrl+K — the fastest way to move around the product.
  { label: "Documents",          path: "/documents",  section: null, keywords: "documents files versions templates upload signature esign envelope" },
  { label: "Signatures",         path: "/documents?tab=signatures", section: null, adminOnly: true, keywords: "signature esign envelope sign parties certificate" },
  { label: "Contracts",          path: "/contracts",  section: null, adminOnly: true, keywords: "contracts clm register renewal counterparty notice period agreement msa nda" },
  // The HR console administers other people's employment, pay and leave —
  // administrators only, and absent for everybody else. An employee's own record
  // is "My HR", which is theirs and always available.
  { label: "My HR",              path: "/account/my-hr", section: null, keywords: "my hr payslip payslips leave holiday timesheet hours my pay my details employment" },
  { label: "HR",                 path: "/people",     section: null, adminOnly: true, keywords: "hr people directory employees staff onboarding compensation" },
  { label: "Leave administration", path: "/people?tab=leave", section: null, adminOnly: true, keywords: "leave holiday vacation absence balances approve decide" },
  { label: "Timesheet approvals", path: "/people?tab=time",  section: null, adminOnly: true, keywords: "timesheet hours time tracking approve" },
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
