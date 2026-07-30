/**
 * What each person can see.
 *
 * The rule under test: **if you can't use it, you don't see it.** These assert
 * the negative cases, because the positive ones are obvious and the negative ones
 * are what a leak looks like — an employee finding "Payroll" in the nav, or a
 * Standard-plan tenant finding Network Ops in their command palette.
 *
 * The policy module is pure and framework-free precisely so it can be tested
 * here, next to the API's own authorization, rather than only through a browser.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  canSee, canSeeSection, canSeeSolution, canSeeAdmin, visible,
} from "../../frontend/src/lib/visibility.js";
// The static destination table only; the config-derived half imports JSX and
// belongs to the bundler. Everything declared by hand is checked here.
import { STATIC_DESTINATIONS as SEARCH_INDEX } from "../../frontend/src/lib/destinations.js";

const canReach = (entry, user, role) => canSee(user, entry, role);

const user = (over = {}) => ({
  role: "user", department: "sales", plan: "executive", planSolutions: [], ...over,
});
const admin = (over = {}) => user({ role: "enterprise_admin", department: "executive", ...over });

// ── Role ─────────────────────────────────────────────────────────────────────
test("HR is administrators only, and absent rather than blocked", () => {
  const entry = { adminOnly: true };
  assert.equal(canSee(admin(), entry, "enterprise_admin"), true);
  assert.equal(canSee(user(), entry, "user"), false);
  assert.equal(canSee(user({ department: "finance" }), entry, "user"), false,
    "not even for the department that runs payroll — it's a role question");
});

test("a system admin previewing as another role loses admin pages", () => {
  const su = user({ role: "system_admin" });
  assert.equal(canSeeAdmin(su, "enterprise_admin"), true, "no preview: still an admin");
  assert.equal(canSeeAdmin(su, "sales"), false, "previewing as Sales must actually look like Sales");
});

test("the stored role is never consulted when an effective role is given", () => {
  // The whole point of the preview is that it overrides.
  assert.equal(canSeeAdmin({ role: "enterprise_admin" }, "user"), false);
});

// ── Plan ─────────────────────────────────────────────────────────────────────
test("a plan without a module hides the module", () => {
  const standard = user({ plan: "standard", department: "it" });
  assert.equal(canSeeSection(standard, "network", "user"), false,
    "Standard has no Network Ops, so it is not in the nav at all");
  const executive = user({ plan: "executive", department: "it" });
  assert.equal(canSeeSection(executive, "network", "user"), true);
});

test("a plan without a solution hides that solution, not just the module", () => {
  // Premium buys three of the five Business Services. Business Services is
  // admin-only, so the viewer here is an admin.
  const premium = admin({ plan: "premium" });
  assert.equal(canSeeSection(premium, "services", "enterprise_admin"), true, "the module is included");
  assert.equal(canSeeSolution(premium, "services", "financial", "enterprise_admin"), true);
  assert.equal(canSeeSolution(premium, "services", "operation", "enterprise_admin"), true);
  assert.equal(canSeeSolution(premium, "services", "team", "enterprise_admin"), false,
    "Team & Project is not in Premium — showing it and bouncing on click is the bug");
  assert.equal(canSeeSolution(premium, "services", "marketing", "enterprise_admin"), false);

  const enterprise = admin({ plan: "enterprise" });
  assert.equal(canSeeSolution(enterprise, "services", "team", "enterprise_admin"), true);
});

test("a Standard plan hides the CRM solutions it doesn't include", () => {
  const std = user({ plan: "standard", department: "sales" });
  assert.equal(canSeeSolution(std, "crm", "opportunities", "user"), true);
  assert.equal(canSeeSolution(std, "crm", "einstein", "user"), false, "Sales AI is not in Standard");
  assert.equal(canSeeSolution(std, "crm", "service", "user"), false);
  assert.equal(canSeeSolution(std, "crm", "partners", "user"), false);
});

test("analytics is sliced by what the plan actually holds data for", () => {
  const noNetwork = user({ plan: "premium", department: "executive" });
  assert.equal(canSeeSolution(noNetwork, "analytics", "sales", "user"), true);
  assert.equal(canSeeSolution(noNetwork, "analytics", "marketing", "user"), true);
  assert.equal(canSeeSolution(noNetwork, "analytics", "network", "user"), false,
    "a Network analytics dashboard with no Network Ops behind it is an empty promise");
  assert.equal(canSeeSolution(noNetwork, "analytics", "reports", "user"), true,
    "reports work on whatever the plan does include");
});

test("a custom plan shows exactly what it bought and nothing else", () => {
  const custom = user({
    plan: "custom", department: "executive",
    planSolutions: ["crm:leads", "crm:accounts", "marketing:social"],
  });
  assert.equal(canSeeSolution(custom, "crm", "leads", "user"), true);
  assert.equal(canSeeSolution(custom, "crm", "forecasting", "user"), false);
  assert.equal(canSeeSolution(custom, "marketing", "social", "user"), true);
  assert.equal(canSeeSolution(custom, "marketing", "commerce", "user"), false);
  assert.equal(canSeeSection(custom, "network", "user"), false);
  assert.equal(canSeeSection(custom, "services", "user"), false);
});

// ── Department ───────────────────────────────────────────────────────────────
test("department still narrows what the plan allows", () => {
  const marketer = user({ department: "marketing", plan: "executive" });
  assert.equal(canSeeSection(marketer, "marketing", "user"), true);
  assert.equal(canSeeSection(marketer, "network", "user"), false,
    "the org bought Network Ops; this employee's job doesn't include it");
});

test("access is the intersection, so either gate alone is enough to hide it", () => {
  // Sales department, Standard plan: CRM yes, Network no (plan), Services no (dept).
  const u = user({ department: "sales", plan: "standard" });
  assert.equal(canSeeSection(u, "crm", "user"), true);
  assert.equal(canSeeSection(u, "network", "user"), false);
  assert.equal(canSeeSection(u, "services", "user"), false);
});

// ── The one policy drives every surface ──────────────────────────────────────
test("a solution is hidden without its module needing to be checked separately", () => {
  const noCrm = user({ department: "it", plan: "executive" });
  assert.equal(canSeeSolution(noCrm, "crm", "leads", "user"), false,
    "canSeeSolution must imply canSeeSection, or a page slips through");
});

test("`visible` filters a declared list the same way", () => {
  const entries = [
    { label: "Documents" },
    { label: "Contracts", adminOnly: true },
    { label: "Network", section: "network" },
  ];
  assert.deepEqual(
    visible(user({ plan: "standard" }), entries, "user").map((e) => e.label),
    ["Documents"],
  );
  assert.deepEqual(
    visible(admin({ plan: "executive" }), entries, "enterprise_admin").map((e) => e.label),
    ["Documents", "Contracts", "Network"],
  );
});

// ── The destination index obeys it too ───────────────────────────────────────
test("an employee cannot find HR, payroll or any admin console by name", () => {
  const employee = user();
  const forbidden = ["/people", "/people?tab=payroll", "/contracts",
    "/account/compliance", "/account/developer", "/account/sso", "/account/billing"];
  for (const path of forbidden) {
    const entry = SEARCH_INDEX.find((e) => e.path === path);
    assert.ok(entry, `${path} is missing from the index`);
    assert.equal(canReach(entry, employee, "user"), false, `${path} must not be findable`);
  }
});

test("an employee can still find their own HR record", () => {
  const entry = SEARCH_INDEX.find((e) => e.path === "/account/my-hr");
  assert.ok(entry, "My HR must be in the index");
  assert.equal(canReach(entry, user(), "user"), true,
    "hiding the HR console must not take away somebody's own payslip");
});

test("a plan cannot find the pages it didn't buy", () => {
  const premium = user({ plan: "premium", department: "operations" });
  const team = SEARCH_INDEX.find((e) => e.path === "/services/team");
  assert.ok(team);
  assert.equal(canReach(team, premium, "user"), false);

  const standard = user({ plan: "standard", department: "it" });
  for (const entry of SEARCH_INDEX.filter((e) => e.section === "network")) {
    assert.equal(canReach(entry, standard, "user"), false,
      `${entry.path} is Network, which Standard does not include`);
  }
});

test("every indexed destination declares a section or is genuinely universal", () => {
  const UNIVERSAL = new Set([
    "/home", "/overview", "/account/profile", "/account/security",
    "/account/notifications", "/account/my-hr", "/documents", "/approvals",
    "/rewards", "/search",
  ]);
  for (const e of SEARCH_INDEX) {
    if (e.section == null && !e.adminOnly && !UNIVERSAL.has(e.path)) {
      assert.fail(`${e.path} is visible to everybody — declare a section or adminOnly`);
    }
  }
});

// ── Business Services is an administrator's module ───────────────────────────
/**
 * The bug these cover: a newly invited employee saw **Business Services and
 * nothing else** — the company's financial management, strategic planning and
 * operations — while CRM, Marketing and Network were all hidden. Exactly
 * backwards. The cause was the `general` department row, which is where anybody
 * with a blank or unrecognized department lands, and which granted `services`
 * alone.
 */
test("a newly invited employee gets the operational modules, not the company's books", () => {
  // No department set — the state every invited person starts in.
  const invited = user({ department: undefined, plan: "executive" });
  for (const section of ["crm", "marketing", "network", "analytics"]) {
    assert.equal(canSeeSection(invited, section, "user"), true,
      `a new employee should be able to work in ${section}`);
  }
  assert.equal(canSeeSection(invited, "services", "user"), false,
    "Business Services administers the company — it is not a new hire's landing page");
});

test("an unrecognized department behaves the same as a blank one", () => {
  for (const dept of ["", "  ", "Widget Polishing", null]) {
    const u = user({ department: dept, plan: "executive" });
    assert.equal(canSeeSection(u, "crm", "user"), true, `department "${dept}"`);
    assert.equal(canSeeSection(u, "services", "user"), false, `department "${dept}"`);
  }
});

test("no department grants Business Services — only an admin role does", () => {
  for (const dept of ["executive", "finance", "operations", "sales", "marketing", "it", "general"]) {
    assert.equal(canSeeSection(user({ department: dept }), "services", "user"), false,
      `department "${dept}" must not grant Business Services`);
  }
  assert.equal(canSeeSection(admin(), "services", "enterprise_admin"), true,
    "an administrator does get it");
});

test("an executive-department employee who isn't an admin still doesn't get it", () => {
  // The department that grants everything, held by somebody who administers
  // nothing: the role is what decides.
  const exec = user({ department: "executive", plan: "executive" });
  assert.equal(canSeeSection(exec, "crm", "user"), true);
  assert.equal(canSeeSection(exec, "services", "user"), false);
});

test("every department leaves an employee with something to do", () => {
  // A department that grants nothing is an employee who signs in to an empty
  // product — which is what Finance would have become when services moved.
  for (const dept of ["executive", "sales", "marketing", "it", "finance", "operations", "general"]) {
    const u = user({ department: dept, plan: "executive" });
    const open = ["crm", "marketing", "network", "analytics", "services"]
      .filter((s) => canSeeSection(u, s, "user"));
    assert.ok(open.length > 0, `department "${dept}" can open nothing at all`);
  }
});

test("the plan still narrows what a department grants", () => {
  // A new employee on Standard: no Network Ops, because the org didn't buy it.
  const invited = user({ department: undefined, plan: "standard" });
  assert.equal(canSeeSection(invited, "crm", "user"), true);
  assert.equal(canSeeSection(invited, "marketing", "user"), true);
  assert.equal(canSeeSection(invited, "network", "user"), false,
    "Standard has no Network Ops — the department can't grant what the plan lacks");
});
