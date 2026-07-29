import test from "node:test";
import assert from "node:assert/strict";
import {
  RESOURCES, SCOPES, SCOPE_LABELS, getResource, describeResource,
  eventTypes, readableFields, writableFields, requiredFields,
} from "../src/modules/api/api.resources.js";
import { validateBody, serialize } from "../src/modules/api/api.service.js";
import { generateToken, hashToken, isApiToken } from "../src/modules/api/tokens.service.js";
import { buildOpenApi } from "../src/modules/api/openapi.js";
import {
  signPayload, verifySignature, validateWebhookUrl, generateSecret,
  BACKOFF_MINUTES, MAX_ATTEMPTS,
} from "../src/modules/webhooks/webhooks.service.js";

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

test("every scope has a human description", () => {
  for (const s of SCOPES) assert.ok(SCOPE_LABELS[s], `${s} needs a label`);
});

test("employee data is read-only over the public API", () => {
  const employees = getResource("employees");
  assert.equal(employees.readOnly, true);
  assert.equal(writableFields(employees).length, 0, "no employee field may be written via API");
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

// ── Tokens ───────────────────────────────────────────────────────────────────
test("tokens are prefixed, high-entropy and recognisable", () => {
  const a = generateToken(), b = generateToken();
  assert.ok(a.startsWith("execui_live_"));
  assert.notEqual(a, b, "tokens must be unique");
  assert.ok(a.length > 50, "at least 256 bits of entropy");
  assert.ok(isApiToken(a));
  assert.ok(!isApiToken("Bearer something"));
  assert.ok(!isApiToken(""));
});

test("token hashing is deterministic, one-way and collision-distinct", () => {
  const t = generateToken();
  assert.equal(hashToken(t), hashToken(t), "same input, same hash");
  assert.notEqual(hashToken(t), hashToken(generateToken()));
  assert.match(hashToken(t), /^[a-f0-9]{64}$/, "sha-256 hex");
  assert.ok(!hashToken(t).includes(t.slice(12)), "hash must not contain the token");
});

// ── Webhook signing ──────────────────────────────────────────────────────────
test("signatures verify, and reject wrong secret / tampering / replay", () => {
  const secret = generateSecret();
  const body = JSON.stringify({ id: "evt_1", type: "contacts.created", data: { name: "Acme" } });
  const { header } = signPayload(secret, body);

  assert.equal(verifySignature(secret, body, header), true);
  assert.equal(verifySignature("whsec_wrong", body, header), false, "wrong secret");
  assert.equal(verifySignature(secret, body.replace("Acme", "Evil"), header), false, "tampered body");
  assert.equal(verifySignature(secret, body, "t=1,v1=deadbeef"), false, "garbage signature");
  assert.equal(verifySignature(secret, body, ""), false, "missing signature");

  const stale = signPayload(secret, body, Math.floor(Date.now() / 1000) - 4000);
  assert.equal(verifySignature(secret, body, stale.header), false, "outside the replay window");
  // …but still valid if the receiver widens its tolerance deliberately.
  assert.equal(verifySignature(secret, body, stale.header, { toleranceSec: 99999 }), true);
});

test("secrets are unique and prefixed", () => {
  assert.ok(generateSecret().startsWith("whsec_"));
  assert.notEqual(generateSecret(), generateSecret());
});

// ── Webhook URL safety (SSRF) ────────────────────────────────────────────────
test("webhook URLs must be public HTTPS endpoints", () => {
  const prev = process.env.WEBHOOK_ALLOW_PRIVATE;
  process.env.WEBHOOK_ALLOW_PRIVATE = "false";
  try {
    assert.ok(validateWebhookUrl("https://hooks.acme.com/execui"));
    assert.throws(() => validateWebhookUrl("http://hooks.acme.com/x"), /HTTPS/);
    assert.throws(() => validateWebhookUrl("not a url"), /valid absolute URL/);
    for (const bad of [
      "https://localhost/x", "https://127.0.0.1/x", "https://10.0.0.5/x",
      "https://192.168.1.1/x", "https://169.254.169.254/latest/meta-data",
      "https://172.16.0.1/x", "https://printer.local/x",
    ]) {
      assert.throws(() => validateWebhookUrl(bad), /not publicly reachable/, `${bad} must be rejected`);
    }
  } finally {
    process.env.WEBHOOK_ALLOW_PRIVATE = prev;
  }
});

// ── Retry policy ─────────────────────────────────────────────────────────────
test("backoff is strictly increasing and bounded", () => {
  assert.equal(MAX_ATTEMPTS, BACKOFF_MINUTES.length);
  for (let i = 1; i < BACKOFF_MINUTES.length; i++) {
    assert.ok(BACKOFF_MINUTES[i] > BACKOFF_MINUTES[i - 1], "each retry waits longer");
  }
  const totalHours = BACKOFF_MINUTES.reduce((a, b) => a + b, 0) / 60;
  assert.ok(totalHours > 24 && totalHours < 48, `retries should span ~a day, got ${totalHours}h`);
});

// ── OpenAPI ──────────────────────────────────────────────────────────────────
test("the OpenAPI document matches the registry", () => {
  const doc = buildOpenApi("/api/v1");
  assert.equal(doc.openapi, "3.1.0");
  assert.ok(doc.components.securitySchemes.apiToken);

  for (const r of Object.values(RESOURCES)) {
    const collection = `/api/v1/${r.id}`;
    assert.ok(doc.paths[collection]?.get, `${r.id} must document GET list`);
    assert.ok(doc.paths[`${collection}/{id}`]?.get, `${r.id} must document GET one`);
    if (r.readOnly) {
      assert.ok(!doc.paths[collection].post, `${r.id} is read-only — no POST`);
      assert.ok(!doc.paths[`${collection}/{id}`].delete, `${r.id} is read-only — no DELETE`);
    } else {
      assert.ok(doc.paths[collection].post, `${r.id} must document POST`);
      assert.ok(doc.paths[`${collection}/{id}`].patch, `${r.id} must document PATCH`);
    }
  }
  // Write schemas expose only writable fields, and mark the required ones.
  const contactPost = doc.paths["/api/v1/contacts"].post.requestBody.content["application/json"].schema;
  assert.deepEqual(Object.keys(contactPost.properties).sort(), writableFields(CONTACTS).sort());
  assert.deepEqual(contactPost.required.sort(), requiredFields(CONTACTS).sort());
  assert.ok(!("id" in contactPost.properties), "clients can't set ids");
});

test("describeResource lists the right endpoints per resource", () => {
  const d = describeResource(CONTACTS);
  assert.ok(d.endpoints.includes("POST /api/v1/contacts"));
  const e = describeResource(getResource("employees"));
  assert.ok(!e.endpoints.some((x) => x.startsWith("POST")), "read-only resource advertises no writes");
  assert.ok(readableFields(CONTACTS).includes("id"));
});
