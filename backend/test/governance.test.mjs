import test from "node:test";
import assert from "node:assert/strict";
import {
  CATEGORIES, BY_ID, getCategory, subjectCategories, retainableCategories,
  subjectWhere, describeCategory, REDACTED,
} from "../src/modules/governance/governance.registry.js";
import { catalog, cutoffFor } from "../src/modules/governance/governance.service.js";

// ── Registry integrity ───────────────────────────────────────────────────────
test("every category is internally consistent", () => {
  for (const c of CATEGORIES) {
    assert.ok(c.id && c.label, "needs an id and label");
    assert.ok(c.model, `${c.id} needs a Prisma model`);
    assert.ok(c.dateField, `${c.id} needs a date field for retention`);
    assert.ok(["delete", "anonymize", null].includes(c.onErase), `${c.id} has an invalid onErase`);
    if (c.onErase === "anonymize") {
      assert.ok(c.anonymize && Object.keys(c.anonymize).length, `${c.id} anonymizes but declares no fields`);
    }
    if (c.subject) {
      assert.ok(["self", "userId", "email"].includes(c.subject.by), `${c.id} has an unknown subject linkage`);
      if (c.subject.by === "email") assert.ok(c.subject.field, `${c.id} email linkage needs a field`);
      assert.ok(c.exportFields?.length, `${c.id} is subject-linked so it must declare exportFields`);
    }
    if (c.defaultRetentionDays != null) {
      assert.ok(c.defaultRetentionDays > 0 && c.defaultRetentionDays <= 3650, `${c.id} default retention out of range`);
    }
  }
});

test("category ids are unique and indexed", () => {
  const ids = CATEGORIES.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length, "duplicate category id");
  for (const id of ids) assert.equal(BY_ID[id].id, id);
  assert.equal(getCategory("does_not_exist"), null);
});

test("audit evidence is anonymized, never deleted", () => {
  // If this flips to "delete", an erasure would destroy the record of what
  // happened — which is the opposite of what an auditor needs.
  for (const id of ["audit_logs", "approval_decisions"]) {
    assert.equal(getCategory(id).onErase, "anonymize", `${id} must survive erasure`);
  }
});

test("erasing an employee keeps the row but strips every identifier", () => {
  const profile = getCategory("employee_profile");
  assert.equal(profile.onErase, "anonymize", "the row survives so ownership links stay intact");
  const a = profile.anonymize;
  for (const field of ["firstName", "lastName", "email", "phone", "employeeId", "passwordHash", "mfaSecret"]) {
    assert.ok(field in a, `${field} must be cleared on erasure`);
  }
  assert.equal(a.isActive, false, "an erased account must be deactivated");
  assert.equal(a.passwordHash, null, "credentials must be destroyed");
  assert.equal(a.mfaSecret, null, "MFA secret must be destroyed");
  // email is NOT NULL + UNIQUE, so it must become a per-row tombstone.
  assert.equal(typeof a.email, "function");
  const tombstone = a.email({ id: "u_123" });
  assert.ok(tombstone.includes("u_123"), "tombstone must be unique per row");
  assert.ok(!tombstone.includes("@gov.co"), "must not retain the real address");
  assert.notEqual(a.email({ id: "u_1" }), a.email({ id: "u_2" }), "no collisions between erased users");
});

test("subject linkage resolves to the right Prisma filter", () => {
  assert.deepEqual(subjectWhere(getCategory("employee_profile"), { userId: "u1" }), { id: "u1" });
  assert.deepEqual(subjectWhere(getCategory("audit_logs"), { userId: "u1" }), { userId: "u1" });
  assert.deepEqual(subjectWhere(getCategory("email_logs"), { email: "a@b.co" }), { toEmail: "a@b.co" });
  assert.deepEqual(subjectWhere(getCategory("contacts"), { email: "a@b.co" }), { email: "a@b.co" });
  assert.deepEqual(subjectWhere(getCategory("direct_messages"), { userId: "u1" }), { senderId: "u1" });

  // Missing the identifier a category needs must yield null, never an
  // unfiltered clause — that would erase or export everyone's rows.
  assert.equal(subjectWhere(getCategory("audit_logs"), { email: "a@b.co" }), null);
  assert.equal(subjectWhere(getCategory("email_logs"), { userId: "u1" }), null);
  assert.equal(subjectWhere(getCategory("webhook_deliveries"), { userId: "u1" }), null);
});

test("no subject filter can ever be empty", () => {
  // An empty {} where-clause would match every row in the table.
  for (const c of subjectCategories()) {
    for (const ident of [{ userId: "u1" }, { email: "a@b.co" }, { userId: "u1", email: "a@b.co" }]) {
      const where = subjectWhere(c, ident);
      if (where !== null) {
        assert.ok(Object.keys(where).length > 0, `${c.id} produced an empty filter for ${JSON.stringify(ident)}`);
      }
    }
    assert.equal(subjectWhere(c, {}), null, `${c.id} must refuse to build a filter with no identifier`);
  }
});

test("retention-only categories carry no subject link and no erase action", () => {
  for (const id of ["webhook_deliveries", "workflow_runs", "social_snapshots"]) {
    const c = getCategory(id);
    assert.equal(c.subject, null);
    assert.equal(c.onErase, null);
    assert.ok(c.defaultRetentionDays, `${id} should have a recommended retention window`);
  }
});

test("categories holding customer payloads default to short retention", () => {
  // Webhook payloads can carry customer data; keeping them for a year by
  // default would quietly turn a delivery log into a shadow data store.
  assert.ok(getCategory("webhook_deliveries").defaultRetentionDays <= 90);
});

test("every subject-linked category can be exported and erased", () => {
  for (const c of subjectCategories()) {
    assert.ok(c.exportFields?.length, `${c.id} must be exportable`);
    assert.ok(c.onErase, `${c.id} must declare an erasure behaviour`);
  }
});

test("export field lists never include secrets", () => {
  const forbidden = [
    "passwordHash", "mfaSecret", "tokenHash", "secret", "tokenCipher", "tenantId",
    // Encrypted HR identifiers: a data subject is entitled to the *value* of
    // their bank details, which HR can give them — never the ciphertext, and
    // never the iv/tag that go with it.
    "taxIdCipher", "taxIdIv", "taxIdTag",
    "nationalIdCipher", "nationalIdIv", "nationalIdTag",
    "bankAccountCipher", "bankAccountIv", "bankAccountTag",
  ];
  for (const c of CATEGORIES) {
    for (const f of c.exportFields || []) {
      assert.ok(!forbidden.includes(f), `${c.id}.${f} must never be exported to a data subject`);
    }
  }
});

// ── Catalog ──────────────────────────────────────────────────────────────────
test("the catalog exposes descriptions without internals", () => {
  const c = catalog();
  assert.equal(c.categories.length, CATEGORIES.length);
  assert.equal(c.subjectLinked.length, subjectCategories().length);
  assert.equal(c.retainable.length, retainableCategories().length);
  const described = describeCategory(getCategory("audit_logs"));
  assert.equal(described.onErase, "anonymize");
  assert.ok(!("model" in described), "the Prisma model name is an internal detail");
  assert.ok(!("anonymize" in described));
});

// ── Retention maths ──────────────────────────────────────────────────────────
test("the retention cutoff is exactly N days back", () => {
  const now = new Date("2026-07-29T12:00:00Z");
  assert.equal(cutoffFor(90, now).toISOString(), "2026-04-30T12:00:00.000Z");
  assert.equal(cutoffFor(1, now).toISOString(), "2026-07-28T12:00:00.000Z");
  assert.ok(cutoffFor(365, now) < now, "the cutoff is always in the past");
});

test("REDACTED is a clear, non-empty marker", () => {
  assert.equal(REDACTED, "[redacted]");
  assert.ok(REDACTED.length > 0, "an empty marker would read as missing data rather than removed data");
});
