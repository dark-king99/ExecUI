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
  payslip:  { path: "/people",    param: "payslip", tab: "me" },
  payRun:   { path: "/people",    param: "run",     tab: "payroll" },
  ticket:   { path: "/helpdesk",  param: "ticket" },
  article:  { path: "/helpdesk",  param: "article", tab: "kb" },
  approval: { path: "/approvals", param: "request" },
};

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
