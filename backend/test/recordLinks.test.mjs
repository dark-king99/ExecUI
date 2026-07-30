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

import { RECORD_ROUTES, linkTo } from "../src/lib/recordLinks.js";
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
test("every search source links to a record page the client can open", () => {
  const paths = new Set(Object.values(CLIENT_ROUTES).map((r) => r.path));
  for (const source of Object.values(SOURCES)) {
    const link = source.link({ id: "rec-1" });
    assert.equal(typeof link, "string");
    assert.ok(link.startsWith("/"), `${source.id} link must be app-relative`);
    // Sources that point at a record must use the shared table; module list
    // pages (a deal links to the pipeline) legitimately don't.
    const [path, qs] = link.split("?");
    if (paths.has(path) && qs) {
      assert.ok(qs.includes("rec-1"), `${source.id} claims a record link but drops the id`);
    }
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
