import test from "node:test";
import assert from "node:assert/strict";
import {
  evaluateCondition, matchesConditions, validateConditions, renderTemplate,
  describeRule, CONDITION_OPS, VALUELESS_OPS,
} from "../src/modules/workflows/workflows.rules.js";
import {
  validateAction, validateActions, ACTION_TYPES, AUDIENCE_TYPES, actionCatalog,
} from "../src/modules/workflows/workflows.actions.js";
import { parseTrigger, catalog } from "../src/modules/workflows/workflows.service.js";
import { MAX_DEPTH } from "../src/modules/workflows/workflows.engine.js";

const DEAL = { id: "d1", name: "Mega renewal", value: 60000, status: "won", stage: "closed_won", probability: 90, source: null };

// ── Condition evaluation ─────────────────────────────────────────────────────
test("comparison operators behave as a business user would expect", () => {
  assert.equal(evaluateCondition(DEAL, { field: "status", op: "eq", value: "won" }), true);
  assert.equal(evaluateCondition(DEAL, { field: "status", op: "eq", value: "WON" }), true, "case-insensitive");
  assert.equal(evaluateCondition(DEAL, { field: "status", op: "ne", value: "lost" }), true);
  assert.equal(evaluateCondition(DEAL, { field: "value", op: "gte", value: 50000 }), true);
  assert.equal(evaluateCondition(DEAL, { field: "value", op: "gt", value: 60000 }), false);
  assert.equal(evaluateCondition(DEAL, { field: "value", op: "lt", value: 60001 }), true);
  assert.equal(evaluateCondition(DEAL, { field: "value", op: "gte", value: "50000" }), true, "string numbers coerce");
});

test("text operators", () => {
  assert.equal(evaluateCondition(DEAL, { field: "name", op: "contains", value: "renew" }), true);
  assert.equal(evaluateCondition(DEAL, { field: "name", op: "not_contains", value: "trial" }), true);
  assert.equal(evaluateCondition(DEAL, { field: "name", op: "starts_with", value: "mega" }), true);
  assert.equal(evaluateCondition(DEAL, { field: "stage", op: "in", value: "closed_won,closed_lost" }), true);
  assert.equal(evaluateCondition(DEAL, { field: "stage", op: "in", value: ["proposal"] }), false);
  assert.equal(evaluateCondition(DEAL, { field: "stage", op: "not_in", value: "proposal" }), true);
});

test("emptiness and boolean operators", () => {
  assert.equal(evaluateCondition(DEAL, { field: "source", op: "is_empty" }), true);
  assert.equal(evaluateCondition(DEAL, { field: "name", op: "not_empty" }), true);
  assert.equal(evaluateCondition({ isActive: true }, { field: "isActive", op: "is_true" }), true);
  assert.equal(evaluateCondition({ isActive: false }, { field: "isActive", op: "is_false" }), true);
  assert.equal(evaluateCondition({ isActive: "yes" }, { field: "isActive", op: "is_true" }), false, "only real booleans");
});

test("a missing field never throws and never matches a comparison", () => {
  assert.equal(evaluateCondition({}, { field: "nope", op: "eq", value: "x" }), false);
  assert.equal(evaluateCondition({}, { field: "nope", op: "gt", value: 1 }), false);
  assert.equal(evaluateCondition({}, { field: "nope", op: "is_empty" }), true);
  assert.equal(evaluateCondition(DEAL, { field: "status", op: "made_up" }), false, "unknown op is false, not a crash");
});

test("all vs any matching, and an empty rule matches everything", () => {
  const both = [{ field: "status", op: "eq", value: "won" }, { field: "value", op: "gte", value: 50000 }];
  assert.equal(matchesConditions(DEAL, both, "all"), true);
  assert.equal(matchesConditions(DEAL, both, "any"), true);

  const oneFails = [{ field: "status", op: "eq", value: "won" }, { field: "value", op: "gte", value: 999999 }];
  assert.equal(matchesConditions(DEAL, oneFails, "all"), false);
  assert.equal(matchesConditions(DEAL, oneFails, "any"), true);

  assert.equal(matchesConditions(DEAL, [], "all"), true, "no conditions = fire on every event");
});

// ── Condition validation ─────────────────────────────────────────────────────
test("conditions are validated against the resource field whitelist", () => {
  assert.throws(() => validateConditions("opportunities", [{ field: "tenantId", op: "eq", value: "other" }]), /Unknown field/);
  assert.throws(() => validateConditions("opportunities", [{ field: "value; DROP TABLE x", op: "eq", value: 1 }]), /Unknown field/);
  assert.throws(() => validateConditions("opportunities", [{ field: "status", op: "exec", value: "x" }]), /Unknown condition operator/);
  assert.throws(() => validateConditions("opportunities", [{ field: "status", op: "eq" }]), /needs a value/);
  assert.throws(() => validateConditions("nope", []), /Unknown resource/);
  assert.throws(() => validateConditions("opportunities", [], "sometimes"), /must be "all" or "any"/);

  const ok = validateConditions("opportunities", [{ field: "status", op: "is_empty", value: "ignored" }]);
  assert.equal(ok[0].value, null, "valueless operators drop their value");
});

test("every operator is either valueless or declared", () => {
  for (const op of Object.keys(CONDITION_OPS)) {
    assert.equal(typeof CONDITION_OPS[op], "string");
  }
  for (const op of VALUELESS_OPS) assert.ok(CONDITION_OPS[op], `${op} must be a known operator`);
});

// ── Templating ───────────────────────────────────────────────────────────────
test("templates resolve record fields and nothing else", () => {
  const out = renderTemplate("Deal {{record.name}} worth {{record.value}} ({{event}})", { record: DEAL, event: "opportunities.updated" });
  assert.equal(out, "Deal Mega renewal worth 60000 (opportunities.updated)");
});

test("templates cannot reach outside the record", () => {
  assert.equal(renderTemplate("{{process.env.JWT_SECRET}}", { record: DEAL }), "", "no globals");
  assert.equal(renderTemplate("{{record.__proto__}}", { record: DEAL }), "", "no prototype access");
  assert.equal(renderTemplate("{{constructor}}", { record: DEAL }), "");
  assert.equal(renderTemplate("{{record.constructor}}", { record: DEAL }), "", "no constructor access");
  assert.equal(renderTemplate("{{record.toString}}", { record: DEAL }), "", "no inherited methods");
  assert.equal(renderTemplate("{{record.missing}}", { record: DEAL }), "", "unknown field renders empty, not the raw token");
});

test("templating handles nulls, dates and non-strings safely", () => {
  assert.equal(renderTemplate("[{{record.source}}]", { record: DEAL }), "[]");
  const d = new Date("2026-07-29T10:00:00Z");
  assert.equal(renderTemplate("{{record.when}}", { record: { when: d } }), d.toISOString());
  assert.equal(renderTemplate(null, { record: DEAL }), "");
  assert.equal(renderTemplate(12345, { record: DEAL }), "12345");
});

test("describeRule reads like a sentence", () => {
  const text = describeRule("opportunities", [
    { field: "status", op: "eq", value: "won" },
    { field: "value", op: "gte", value: 50000 },
  ], "all");
  assert.match(text, /is "won" AND/);
  assert.equal(describeRule("opportunities", [], "all"), "every event");
});

// ── Action validation ────────────────────────────────────────────────────────
test("update_record may only touch writable fields of the trigger resource", () => {
  assert.throws(() => validateAction("opportunities", { type: "update_record", fields: { createdAt: "x" } }), /not a writable field|read-only/);
  assert.throws(() => validateAction("opportunities", { type: "update_record", fields: { tenantId: "other" } }), /not a writable field|read-only/);
  assert.throws(() => validateAction("opportunities", { type: "update_record", fields: {} }), /at least one field/);
  assert.throws(() => validateAction("employees", { type: "update_record", fields: { firstName: "x" } }), /can't be updated/);

  const ok = validateAction("opportunities", { type: "update_record", fields: { stage: "closed_won" } });
  assert.equal(ok.fields.stage, "closed_won");
  // Enum values are still enforced on literal (non-templated) values.
  assert.throws(() => validateAction("opportunities", { type: "update_record", fields: { stage: "invented" } }), /must be one of/);
  // A templated value defers validation to run time rather than failing now.
  assert.doesNotThrow(() => validateAction("opportunities", { type: "update_record", fields: { source: "{{record.name}}" } }));
});

test("create_record enforces the target's required fields", () => {
  assert.throws(() => validateAction("opportunities", { type: "create_record", resource: "nope", fields: {} }), /Unknown resource/);
  assert.throws(() => validateAction("opportunities", { type: "create_record", resource: "employees", fields: {} }), /can't be created/);
  assert.throws(() => validateAction("opportunities", { type: "create_record", resource: "tasks", fields: {} }), /Missing required field/);
  const ok = validateAction("opportunities", { type: "create_record", resource: "tasks", fields: { title: "Follow up on {{record.name}}" } });
  assert.equal(ok.resource, "tasks");
});

test("notify and email actions are validated", () => {
  assert.throws(() => validateAction("opportunities", { type: "notify", audience: { type: "wizard" }, title: "x" }), /Unknown audience/);
  assert.throws(() => validateAction("opportunities", { type: "notify", audience: { type: "role" }, title: "x" }), /needs a value/);
  assert.throws(() => validateAction("opportunities", { type: "notify", audience: { type: "admins" } }), /needs a title/);
  assert.doesNotThrow(() => validateAction("opportunities", { type: "notify", audience: { type: "admins" }, title: "Won: {{record.name}}" }));

  assert.throws(() => validateAction("opportunities", { type: "send_email", to: [], subject: "s" }), /at least one recipient/);
  assert.throws(() => validateAction("opportunities", { type: "send_email", to: ["nope"], subject: "s" }), /not a valid email/);
  assert.throws(() => validateAction("opportunities", { type: "send_email", to: ["a@b.co"] }), /needs a subject/);
  // A templated recipient is allowed — it resolves at run time.
  assert.doesNotThrow(() => validateAction("opportunities", { type: "send_email", to: ["{{record.email}}"], subject: "s" }));
});

test("approval actions require staffed, bounded step chains", () => {
  assert.throws(() => validateAction("opportunities", { type: "request_approval", title: "t", steps: [] }), /at least one step/);
  assert.throws(() => validateAction("opportunities", { type: "request_approval", steps: [{ approvers: { type: "admins" } }] }), /needs a title/);
  assert.throws(() => validateAction("opportunities", {
    type: "request_approval", title: "t",
    steps: Array.from({ length: 6 }, () => ({ approvers: { type: "admins" } })),
  }), /at most 5 steps/);

  const ok = validateAction("opportunities", {
    type: "request_approval", title: "Approve {{record.name}}",
    steps: [{ name: "Finance", approvers: { type: "department", value: "Finance" }, requiredCount: 99 }],
  });
  assert.equal(ok.steps[0].requiredCount, 10, "requiredCount is clamped");
});

test("unknown actions are refused, and lists are bounded", () => {
  assert.throws(() => validateAction("opportunities", { type: "run_script", code: "rm -rf /" }), /Unknown action/);
  assert.throws(() => validateActions("opportunities", []), /at least one action/);
  assert.throws(() => validateActions("opportunities",
    Array.from({ length: 11 }, () => ({ type: "notify", audience: { type: "admins" }, title: "x" }))), /at most 10 actions/);
});

// ── Triggers & catalog ───────────────────────────────────────────────────────
test("triggers must name a real resource and lifecycle action", () => {
  const t = parseTrigger("opportunities.updated");
  assert.equal(t.resourceId, "opportunities");
  assert.equal(t.action, "updated");
  assert.throws(() => parseTrigger("opportunities.exploded"), /Unknown trigger/);
  assert.throws(() => parseTrigger("nonsense.created"), /Unknown trigger/);
  assert.throws(() => parseTrigger(""), /Unknown trigger/);
});

test("the builder catalog only advertises what the engine implements", () => {
  const c = catalog();
  assert.ok(c.triggers.length > 0);
  assert.deepEqual(c.actions.map((a) => a.type).sort(), Object.keys(ACTION_TYPES).sort());
  assert.deepEqual(actionCatalog().audiences, AUDIENCE_TYPES);
  for (const op of c.operators) assert.ok(CONDITION_OPS[op.op], `${op.op} must be implemented`);
  // Read-only resources are surfaced but flagged, so the UI won't offer writes.
  assert.equal(c.resources.find((r) => r.id === "employees").readOnly, true);
});

test("the cycle guard has a real, small depth limit", () => {
  assert.ok(MAX_DEPTH >= 1 && MAX_DEPTH <= 5, `MAX_DEPTH should be small, got ${MAX_DEPTH}`);
});
