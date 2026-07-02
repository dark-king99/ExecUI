import test from "node:test";
import assert from "node:assert/strict";
import { canonicalDept, accessFor, intersectWithPlan } from "../src/modules/access/access.policy.js";
import { entitlementsFor } from "../src/modules/billing/plans.config.js";

test("free-text departments normalize to canonical keys", () => {
  assert.equal(canonicalDept("Chief Executive Office"), "executive");
  assert.equal(canonicalDept("Sales & Revenue"), "sales");
  assert.equal(canonicalDept("Growth Marketing"), "marketing");
  assert.equal(canonicalDept("IT Infrastructure"), "it");
  assert.equal(canonicalDept("Finance & Accounting"), "finance");
  assert.equal(canonicalDept("Operations"), "operations");
  assert.equal(canonicalDept("Something Else"), "general");
  assert.equal(canonicalDept(null), "general");
});

test("admins are privileged regardless of department", () => {
  const a = accessFor({ role: "enterprise_admin", department: "Marketing" });
  assert.equal(a.privileged, true);
  assert.deepEqual([...a.sections].sort(), ["analytics", "crm", "marketing", "network", "services"]);
});

test("strict-by-function: marketing employee cannot reach network", () => {
  const a = accessFor({ role: "employee", department: "Marketing" });
  assert.ok(a.sections.includes("marketing"));
  assert.ok(!a.sections.includes("network"));
  assert.ok(!a.sections.includes("crm"));
  assert.deepEqual(a.slices, ["marketing"]);
});

test("plan ∩ department: standard plan strips network even from admins", () => {
  const admin = accessFor({ role: "enterprise_admin", department: "Executive" });
  const eff = intersectWithPlan(admin, entitlementsFor("standard"));
  assert.ok(!eff.sections.includes("network"));
  assert.ok(!eff.sections.includes("services"));
  assert.ok(eff.sections.includes("crm"));
  assert.ok(eff.sections.includes("marketing"));
  assert.ok(!eff.slices.includes("network"));
});

test("plan ∩ department: sales employee on executive plan keeps only CRM+analytics", () => {
  const sales = accessFor({ role: "employee", department: "Sales" });
  const eff = intersectWithPlan(sales, entitlementsFor("executive"));
  assert.deepEqual([...eff.sections].sort(), ["analytics", "crm"]);
  assert.deepEqual(eff.slices, ["sales"]);
});

test("custom plan without CRM removes CRM from a sales employee", () => {
  const sales = accessFor({ role: "employee", department: "Sales" });
  const mktOnly = entitlementsFor("custom", [
    "marketing:engagement", "marketing:intelligence", "marketing:personalization",
    "marketing:commerce", "marketing:datacloud", "marketing:einstein",
    "marketing:account-engagement", "marketing:engagement",
  ]);
  const eff = intersectWithPlan(sales, mktOnly);
  assert.ok(!eff.sections.includes("crm"));
});
