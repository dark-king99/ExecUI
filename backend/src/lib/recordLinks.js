/**
 * Deep links to records in the web app — the server's half of the same table the
 * client uses (`frontend/src/lib/recordLinks.js`).
 *
 * The server builds links in two places: global search results and
 * notifications. Both were pointing at list pages ("your contract was approved" →
 * the whole register), which makes the reader do the finding. A link that names a
 * record should open that record.
 *
 * Keeping the table in both places is deliberate — the backend can't import from
 * the frontend bundle — but it is *checked*: `test/recordLinks.test.mjs` asserts
 * the two tables are identical, so a link the API emits is always one the SPA
 * knows how to open. Add a record kind here and there, or the test fails.
 */

export const RECORD_ROUTES = {
  document: { path: "/documents", param: "open" },
  envelope: { path: "/documents", param: "envelope", tab: "signatures" },
  template: { path: "/documents", param: "template", tab: "templates" },
  contract: { path: "/contracts", param: "open" },
  person:   { path: "/people",    param: "user" },
  // An employee's own payslip lives under Account, not in the HR console —
  // which they can't open.
  payslip:  { path: "/account/my-hr", param: "payslip" },
  payRun:   { path: "/people",    param: "run",     tab: "payroll" },
  ticket:   { path: "/helpdesk",  param: "ticket" },
  article:  { path: "/helpdesk",  param: "article", tab: "kb" },
  approval: { path: "/approvals", param: "request" },

  // HR records that live on a tab of the HR page.
  leaveRequest: { path: "/people", param: "leave", tab: "leave" },
  timesheet:    { path: "/people", param: "hours", tab: "time" },

  // CRM. These are flat list views, so the parameter focuses a row rather than
  // opening a panel — still the difference between "here it is" and "here is the
  // list it is somewhere in".
  //
  // The paths are the *real* routes. Search had been linking to invented ones
  // (`/crm/contacts`, `/crm/pipeline`, `/crm/tasks`, `/marketing/campaigns`,
  // `/network/monitoring`, `/services/operations`) which match no route at all, so
  // six of the sixteen sources sent every result to the 404 page. That is what a
  // hand-written link in each module buys you, and why this table has a test
  // asserting each path is routable.
  contact:  { path: "/crm/accounts/contacts",  param: "open" },
  deal:     { path: "/crm/opportunities",      param: "open" },
  crmTask:  { path: "/crm/activities",         param: "open" },
  case:     { path: "/crm/service",            param: "open" },
  campaign: { path: "/marketing/personalization/campaigns", param: "open" },
  social:   { path: "/marketing/social/calendar", param: "open" },

  // Business services.
  project: { path: "/services/team",      param: "open" },
  bizTask: { path: "/services/team",      param: "task" },
  sop:     { path: "/services/operation", param: "open" },
  client:  { path: "/services/marketing", param: "open" },

  // Network.
  device:   { path: "/network/inventory",       param: "open" },
  alert:    { path: "/network/alerts",          param: "open" },
  incident: { path: "/network/alerts/incidents", param: "open" },
};

/**
 * Approval subjects. An approval records *what* it is about as an API resource id
 * (`contracts`, `payrun`, `leave`, …); this maps that to the record kind, so the
 * inbox can offer "go and look at the thing you are being asked to approve".
 *
 * Being asked to approve something you cannot open is the single least defensible
 * gap a sign-off inbox can have, which is why the mapping lives beside the routes
 * rather than in the component.
 */
export const APPROVAL_SUBJECTS = {
  contracts: "contract",
  payrun: "payRun",
  leave: "leaveRequest",
  documents: "document",
  "support-tickets": "ticket",
  contacts: "contact",
  deals: "deal",
};

/**
 * A document can be filed against the record it belongs to (`entityType` +
 * `entityId`) — a deal, a project, a client. The columns have existed since the
 * document hub was built and no screen ever read them, so the relationship was
 * real in the database and invisible everywhere else.
 */
export const ENTITY_KINDS = {
  deal: "deal",
  contact: "contact",
  contract: "contract",
  project: "project",
  task: "bizTask",
  campaign: "campaign",
  client: "client",
  ticket: "ticket",
  person: "person",
  sop: "sop",
};

export const entityKind = (entityType) => ENTITY_KINDS[entityType] ?? null;

/** A link to the record a document is filed against, or null. */
export function linkToEntity(entityType, entityId) {
  const kind = entityKind(entityType);
  if (!kind || !entityId) return null;
  return linkTo(kind, entityId);
}

/** The record kind an approval is about, or null when it isn't about a record. */
export const approvalSubjectKind = (resource) => APPROVAL_SUBJECTS[resource] ?? null;

/** A link to the subject of an approval, or null when there is nothing to open. */
export function linkToSubject(resource, recordId) {
  const kind = approvalSubjectKind(resource);
  if (!kind || !recordId) return null;
  return linkTo(kind, recordId);
}

/** A shareable URL that opens one record. Falls back to the list for a bad id. */
export function linkTo(kind, id, extra = {}) {
  const route = RECORD_ROUTES[kind];
  if (!route) return "/";
  const params = new URLSearchParams();
  if (route.tab) params.set("tab", route.tab);
  if (id) params.set(route.param, String(id));
  for (const [k, v] of Object.entries(extra)) {
    if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
  }
  const qs = params.toString();
  return qs ? `${route.path}?${qs}` : route.path;
}
