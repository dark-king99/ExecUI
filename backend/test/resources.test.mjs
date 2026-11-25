import test from "node:test";
import assert from "node:assert/strict";
import {
  RESOURCES, SCOPES, getResource,
  eventTypes, readableFields, writableFields, requiredFields,
} from "../src/modules/api/api.resources.js";
import { validateBody, serialize } from "../src/modules/api/api.service.js";

const CONTACTS = getResource("contacts");
const OPPS = getResource("opportunities");

// ── Registry integrity ───────────────────────────────────────────────────────
test("every resource is internally consistent", () => {
  for (const r of Object.values(RESOURCES)) {
    assert.ok(r.model, `${r.id} needs a model`);
    assert.ok(SCOPES.includes(`${r.scope}:read`), `${r.id} scope must exist`);
    assert.ok(r.fields.id?.readonly, `${r.id}.id must be readonly`);
    for (const key of r.filterable || []) assert.ok(r.fields[key], `${r.id} filterable "${key}" must exist`);
    if (r.defaultSort) assert.ok(r.fields[r.defaultSort.field], `${r.id} defaultSort field must exist`);
    // A readonly field can never be writable — that's the whole guarantee.
    for (const [key, m] of Object.entries(r.fields)) {
      assert.ok(!(m.readonly && m.writable), `${r.id}.${key} cannot be both readonly and writable`);
    }
  }
});

test("employee data is read-only to the agent and to workflows", () => {
  const employees = getResource("employees");
  assert.equal(employees.readOnly, true);
  assert.equal(writableFields(employees).length, 0, "no employee field may be written");
  assert.throws(() => validateBody(employees, { firstName: "x" }), /read-only/);
});

test("event types cover create/update/delete, minus delete on read-only resources", () => {
  const events = eventTypes();
  assert.ok(events.includes("contacts.created"));
  assert.ok(events.includes("opportunities.updated"));
  assert.ok(events.includes("tickets.deleted"));
  assert.ok(!events.includes("employees.deleted"), "read-only resources emit no delete event");
});

// ── Write validation (the injection boundary) ────────────────────────────────
test("unknown and readonly fields are rejected on write", () => {
  assert.throws(() => validateBody(CONTACTS, { name: "A", email: "a@b.co", hacked: 1 }), /Unknown or read-only/);
  assert.throws(() => validateBody(CONTACTS, { name: "A", email: "a@b.co", id: "forced-id" }), /Unknown or read-only/);
  assert.throws(() => validateBody(CONTACTS, { name: "A", email: "a@b.co", createdAt: "2020-01-01" }), /Unknown or read-only/);
  assert.throws(() => validateBody(CONTACTS, { name: "A", email: "a@b.co", tenantId: "other-tenant" }), /Unknown or read-only/);
});

test("required fields are enforced on create but not on patch", () => {
  assert.throws(() => validateBody(CONTACTS, { name: "Acme" }), /Missing required field\(s\): email/);
  const patch = validateBody(CONTACTS, { name: "Acme" }, { partial: true });
  assert.deepEqual(patch, { name: "Acme" });
  assert.throws(() => validateBody(CONTACTS, {}, { partial: true }), /at least one field/);
});

test("values are coerced and constrained by type", () => {
  const d = validateBody(OPPS, { name: "Deal", value: "1500", probability: 50 });
  assert.equal(d.value, 1500, "numeric strings become numbers");
  assert.throws(() => validateBody(OPPS, { name: "D", value: "abc" }), /must be a number/);
  assert.throws(() => validateBody(OPPS, { name: "D", probability: 150 }), /at most 100/);
  assert.throws(() => validateBody(OPPS, { name: "D", stage: "invented" }), /must be one of/);
  assert.throws(() => validateBody(CONTACTS, { name: "A", email: "not-an-email" }), /valid email/);
  assert.throws(() => validateBody(CONTACTS, { name: "x".repeat(500), email: "a@b.co" }), /characters or fewer/);
});

test("date types are parsed strictly", () => {
  const ok = validateBody(getResource("tasks"), { title: "T", due_date: "2026-07-29T10:00:00Z" });
  assert.ok(ok.due_date instanceof Date);
  assert.throws(() => validateBody(getResource("tasks"), { title: "T", due_date: "not-a-date" }), /ISO-8601/);
  // datestr fields must be plain calendar dates
  const tx = getResource("transactions");
  assert.throws(() => validateBody(tx, { type: "income", category: "c", amount: 1, date: "2026-07-29T10:00:00Z" }), /YYYY-MM-DD/);
  assert.equal(validateBody(tx, { type: "income", category: "c", amount: 1, date: "2026-07-29" }).date, "2026-07-29");
});

test("a body must be a JSON object", () => {
  assert.throws(() => validateBody(CONTACTS, [1, 2]), /must be a JSON object/);
  assert.throws(() => validateBody(CONTACTS, null), /must be a JSON object/);
});

// ── Serialization ────────────────────────────────────────────────────────────
test("serialize exposes only registry fields — never internal columns", () => {
  const row = { id: "1", name: "Acme", email: "a@b.co", key: "k", createdAt: new Date(), tenantId: "SECRET", passwordHash: "SECRET" };
  const out = serialize(CONTACTS, row);
  assert.equal(out.object, "contacts");
  assert.equal(out.name, "Acme");
  assert.ok(!("tenantId" in out), "tenantId must never be serialized");
  assert.ok(!("passwordHash" in out), "internal columns must never be serialized");
  assert.deepEqual(Object.keys(out).sort(), ["createdAt", "email", "id", "key", "name", "object"].sort());
});
