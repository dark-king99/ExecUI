/**
 * Cross-view links.
 *
 * The point of these tests is that a link built on the server can always be
 * opened by the client. The server builds links in search results and
 * notifications; the SPA reads them. Those are two files in two packages, and
 * nothing but this test stops them drifting apart — at which point every link of
 * that kind silently lands on a list page instead of the record it names, which
 * is exactly the failure the shared table was introduced to fix.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  RECORD_ROUTES, linkTo, linkToSubject, linkToEntity, APPROVAL_SUBJECTS, ENTITY_KINDS,
} from "../src/lib/recordLinks.js";
import {
  RECORD_ROUTES as CLIENT_ROUTES, linkTo as clientLinkTo,
} from "../../frontend/src/lib/recordLinks.js";
import { SOURCES } from "../src/modules/search/search.registry.js";

test("the server and client route tables are identical", () => {
  assert.deepEqual(
    Object.keys(RECORD_ROUTES).sort(),
    Object.keys(CLIENT_ROUTES).sort(),
    "a record kind exists on one side only — links of that kind won't open",
  );
  for (const kind of Object.keys(RECORD_ROUTES)) {
    assert.deepEqual(RECORD_ROUTES[kind], CLIENT_ROUTES[kind], `route for "${kind}" differs`);
  }
});

test("both implementations build the same URL", () => {
  for (const kind of Object.keys(RECORD_ROUTES)) {
    assert.equal(linkTo(kind, "abc-123"), clientLinkTo(kind, "abc-123"), kind);
  }
});

test("a link carries the record id on the parameter its page reads", () => {
  const url = new URL(linkTo("contract", "c1"), "https://app.test");
  assert.equal(url.pathname, "/contracts");
  assert.equal(url.searchParams.get("open"), "c1");
});

test("a record on a tabbed page opens on the right tab", () => {
  const url = new URL(linkTo("payRun", "r1"), "https://app.test");
  assert.equal(url.pathname, "/people");
  assert.equal(url.searchParams.get("tab"), "payroll", "payroll is a tab of HR, not a page");
  assert.equal(url.searchParams.get("run"), "r1");

  const slip = new URL(linkTo("payslip", "p1"), "https://app.test");
  assert.equal(slip.searchParams.get("tab"), "me");
  assert.equal(slip.searchParams.get("payslip"), "p1");
});

test("an unknown kind degrades to the app root rather than a broken path", () => {
  assert.equal(linkTo("nope", "x"), "/");
});

test("a missing id yields the list page, not `?open=undefined`", () => {
  assert.equal(linkTo("contract", null), "/contracts");
  assert.equal(linkTo("document", undefined), "/documents");
  // A tabbed page still lands on its tab.
  assert.equal(linkTo("payRun", ""), "/people?tab=payroll");
});

test("ids are escaped, so a link can't be broken by its own contents", () => {
  const url = new URL(linkTo("ticket", "a&b=c d"), "https://app.test");
  assert.equal(url.searchParams.get("ticket"), "a&b=c d");
});

test("extras are added and empty extras are dropped", () => {
  assert.equal(linkTo("person", "u1", { tab: "time" }), "/people?user=u1&tab=time");
  assert.equal(linkTo("person", "u1", { tab: "", other: null }), "/people?user=u1");
});

// ── Search results ──────────────────────────────────────────────────────────
test("every search source opens the record it found", () => {
  const paths = new Set(Object.values(CLIENT_ROUTES).map((r) => r.path));
  for (const source of Object.values(SOURCES)) {
    const link = source.link({ id: "rec-1" });
    assert.equal(typeof link, "string");
    assert.ok(link.startsWith("/"), `${source.id} link must be app-relative`);
    const [path, qs] = link.split("?");
    // No source may invent a path. Every one must come from the shared table,
    // which is the only place that is checked against the router.
    assert.ok(paths.has(path), `${source.id} links to ${path}, which is not in the record route table`);
    assert.ok(qs?.includes("rec-1"), `${source.id} drops the record id, so it lands on a list`);
  }
});

test("documents, contracts, tickets, articles and people all open their record", () => {
  const expected = {
    documents: "document", contracts: "contract", tickets: "ticket",
    kb_articles: "article", people: "person",
  };
  for (const [sourceId, kind] of Object.entries(expected)) {
    assert.equal(
      SOURCES[sourceId].link({ id: "rec-1" }),
      linkTo(kind, "rec-1"),
      `search results for ${sourceId} must open the record`,
    );
  }
});

// ── Every destination must be a real route ───────────────────────────────────
/**
 * The reason this test exists: six of the sixteen search sources linked to routes
 * that were never declared — `/crm/contacts` (the real path is
 * `/crm/accounts/contacts`), `/crm/pipeline`, `/crm/tasks`,
 * `/marketing/campaigns`, `/network/monitoring`, `/services/operations` (the route
 * is singular). Every contact, deal, task, campaign, device and alert a person
 * found in global search took them to the 404 page.
 *
 * Nothing detected it because a link is just a string until somebody clicks it.
 * So the table is checked against the router: the module configs that generate
 * the route table, plus the routes declared in App.jsx.
 */
test("every record route is declared in the SPA's router", async () => {
  const fs = await import("node:fs/promises");
  const root = new URL("../../frontend/src/", import.meta.url);

  const declared = new Set();

  // Module solution configs generate their own routes.
  for (const mod of ["crm", "marketing", "network", "analytics"]) {
    const src = await fs.readFile(new URL(`apps/${mod}/solutions.config.jsx`, root), "utf8");
    for (const m of src.matchAll(/path:\s*"([^"]+)"/g)) declared.add(m[1]);
  }
  // Everything else is a <Route> in the app shell.
  const app = await fs.readFile(new URL("App/App.jsx", root), "utf8");
  for (const m of app.matchAll(/<Route\s+path="([^"]+)"/g)) {
    if (!m[1].includes("*") && !m[1].includes(":")) declared.add(m[1]);
  }

  for (const [kind, route] of Object.entries(RECORD_ROUTES)) {
    assert.ok(
      declared.has(route.path),
      `"${kind}" links to ${route.path}, which no route declares — every link of that kind lands on the 404 page`,
    );
  }
});

// ── Approval subjects ────────────────────────────────────────────────────────
test("an approval links to the record it is about", () => {
  assert.equal(linkToSubject("contracts", "c1"), linkTo("contract", "c1"));
  assert.equal(linkToSubject("payrun", "r1"), linkTo("payRun", "r1"));
  assert.equal(linkToSubject("leave", "l1"), linkTo("leaveRequest", "l1"));
});

test("an approval about nothing in particular offers no link", () => {
  assert.equal(linkToSubject(null, null), null);
  assert.equal(linkToSubject("contracts", null), null, "no record id means nothing to open");
  assert.equal(linkToSubject("something-else", "x1"), null, "an unmapped resource is not guessed at");
});

test("every approval subject maps to a kind the route table knows", () => {
  for (const [resource, kind] of Object.entries(APPROVAL_SUBJECTS)) {
    assert.ok(RECORD_ROUTES[kind], `approval subject "${resource}" maps to unknown kind "${kind}"`);
  }
});

test("every module that raises approvals is covered", () => {
  // These are the resource ids the services actually pass to the approvals
  // engine. A module raising approvals nobody can open is the gap this fixes.
  for (const resource of ["contracts", "payrun", "leave"]) {
    assert.ok(APPROVAL_SUBJECTS[resource], `approvals raised for "${resource}" have no link`);
  }
});

// ── Documents filed against a record ─────────────────────────────────────────
test("a document links to the record it is filed against", () => {
  assert.equal(linkToEntity("deal", "d1"), linkTo("deal", "d1"));
  assert.equal(linkToEntity("project", "p1"), linkTo("project", "p1"));
  assert.equal(linkToEntity(null, "x"), null);
  assert.equal(linkToEntity("deal", null), null);
});

test("every entity kind maps to a real route", () => {
  for (const [entityType, kind] of Object.entries(ENTITY_KINDS)) {
    assert.ok(RECORD_ROUTES[kind], `entityType "${entityType}" maps to unknown kind "${kind}"`);
  }
});
