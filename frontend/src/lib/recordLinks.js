/**
 * Deep links between related records — one table that knows how to open a record
 * from anywhere else in the app.
 *
 * Why this exists: two views that describe the same thing must agree on how to
 * reach it. When each screen invents its own URL, half of them end up pointing
 * at an unfiltered list ("here is the contract" → the whole register) or at a
 * parameter nobody reads. Both had happened: global search linked staff to
 * `/people?user=…`, which People never looked at, and documents and contracts
 * linked to each other's list page with no record selected.
 *
 * So the rule is: a link to a record is `linkTo(kind, id)`, and the page that
 * owns that record reads the parameter with `useRecordParam`.
 *
 * The **backend has the same table** (`backend/src/lib/recordLinks.js`) because
 * it builds links too — search results and notifications. A test asserts the two
 * are identical, so a link the server sends can always be opened by the client.
 * This file therefore stays free of React imports: the test loads it directly.
 */

/**
 * kind → { path, param }. `param` is the query key the owning page reads;
 * `tab` opens the record on the right tab of a tabbed page.
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
