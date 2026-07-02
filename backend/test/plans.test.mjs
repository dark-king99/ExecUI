import test from "node:test";
import assert from "node:assert/strict";
import {
  PLANS, CUSTOM, DEFAULT_PLAN,
  CRM_SOLUTIONS, MKT_SOLUTIONS, SERVICES_SOLUTIONS,
  entitlementsFor, priceFor, planLabel,
} from "../src/modules/billing/plans.config.js";

test("four tiers exist with the agreed prices", () => {
  const prices = Object.fromEntries(PLANS.map((p) => [p.id, p.price]));
  assert.deepEqual(prices, { standard: 299, premium: 799, enterprise: 1799, executive: 5099 });
});

test("standard = half CRM + important marketing, no services, no network", () => {
  const e = entitlementsFor("standard");
  assert.equal(e.solutions.crm.length, 5);
  assert.equal(e.solutions.marketing.length, 4);
  assert.deepEqual(e.solutions.services, []);
  assert.notEqual(e.solutions.network, "all");
  assert.ok(!e.sections.includes("network"));
  assert.ok(!e.sections.includes("services"));
});

test("premium = full CRM + full marketing + core services", () => {
  const e = entitlementsFor("premium");
  assert.equal(e.solutions.crm.length, CRM_SOLUTIONS.length);
  assert.equal(e.solutions.marketing.length, MKT_SOLUTIONS.length);
  assert.equal(e.solutions.services.length, 3);
  assert.ok(!e.sections.includes("network"));
});

test("enterprise = premium + full services; executive adds network", () => {
  const ent = entitlementsFor("enterprise");
  assert.equal(ent.solutions.services.length, SERVICES_SOLUTIONS.length);
  assert.ok(!ent.sections.includes("network"));

  const exec = entitlementsFor("executive");
  assert.equal(exec.solutions.network, "all");
  assert.ok(exec.sections.includes("network"));
});

test("every plan gets analytics for its active modules", () => {
  for (const p of PLANS) {
    const e = entitlementsFor(p.id);
    assert.ok(e.sections.includes("analytics"), `${p.id} should include analytics`);
    assert.ok(e.analyticsSlices.includes("sales"));
    assert.ok(e.analyticsSlices.includes("marketing"));
  }
  assert.ok(!entitlementsFor("standard").analyticsSlices.includes("network"));
  assert.ok(entitlementsFor("executive").analyticsSlices.includes("network"));
});

test("custom plan: $49/unit, min 8, CRM+Marketing namespacing", () => {
  assert.equal(CUSTOM.unitPrice, 49);
  assert.equal(CUSTOM.minUnits, 8);
  const picks = ["crm:leads", "crm:accounts", "marketing:engagement"];
  assert.equal(priceFor("custom", picks), 3 * 49);
  const e = entitlementsFor("custom", picks);
  assert.deepEqual(e.solutions.crm, ["leads", "accounts"]);
  assert.deepEqual(e.solutions.marketing, ["engagement"]);
  assert.ok(!e.sections.includes("services"));
  assert.ok(!e.sections.includes("network"));
});

test("unknown plan falls back to the default", () => {
  assert.deepEqual(entitlementsFor("bogus"), entitlementsFor(DEFAULT_PLAN));
  assert.equal(priceFor("bogus"), 0);
  assert.equal(planLabel("premium"), "Premium");
  assert.equal(planLabel("custom"), "Custom");
});
