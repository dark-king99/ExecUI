/**
 * Organization deletion.
 *
 * The interesting half of this file needs a real database: the whole point of
 * the cascade is what Postgres does when a Tenant row disappears, and that
 * cannot be asserted against a mock. Those tests skip cleanly when DATABASE_URL
 * isn't set so the suite still runs anywhere, but CI runs against a real
 * Postgres and therefore actually exercises them.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { Prisma } from "@prisma/client";
import {
  TENANT_MODELS, USER_RESTRICTED_MODELS, GRACE_DAYS,
} from "../src/modules/tenants/tenants.service.js";

const HAS_DB = !!process.env.DATABASE_URL;

// ── Static analysis: the schema itself ───────────────────────────────────────
const MODELS = Prisma.dmmf.datamodel.models;

test("every tenant-scoped model cascades from Tenant", () => {
  const missing = MODELS
    .filter((m) => m.fields.some((f) => f.name === "tenantId"))
    .filter((m) => {
      const rel = m.fields.find((f) => f.kind === "object" && f.type === "Tenant" && (f.relationFromFields ?? []).includes("tenantId"));
      return rel && rel.relationOnDelete !== "Cascade";
    })
    .map((m) => m.name);
  assert.deepEqual(missing, [], `these models would block a tenant delete: ${missing.join(", ")}`);
});

test("the blast radius is derived from the schema, not a hand-kept list", () => {
  assert.ok(TENANT_MODELS.length > 80, `expected the whole app, got ${TENANT_MODELS.length}`);
  assert.ok(TENANT_MODELS.includes("User"));
  assert.ok(TENANT_MODELS.includes("CrmTask"));
  assert.ok(!TENANT_MODELS.includes("Tenant"), "Tenant is the root, not a scoped model");
});

// If this list ever empties, the pre-clear step is dead code and the purge is
// relying on Postgres trigger ordering again — which is the thing it exists to
// avoid. If it grows, that's fine: the purge handles whatever is in it.
test("the RESTRICT-referencing models are identified", () => {
  assert.ok(USER_RESTRICTED_MODELS.length > 0, "expected at least the CRM/marketing tables");
  assert.ok(USER_RESTRICTED_MODELS.includes("AuditLog"));
  assert.ok(USER_RESTRICTED_MODELS.every((m) => TENANT_MODELS.includes(m)), "all must be tenant-scoped");
});

test("the grace window is a sane default", () => {
  assert.ok(GRACE_DAYS >= 1 && GRACE_DAYS <= 365, `grace window out of range: ${GRACE_DAYS}`);
});

// ── Against a real database ──────────────────────────────────────────────────
test("deleting an organization", { skip: !HAS_DB && "DATABASE_URL not set" }, async (t) => {
  const { default: prisma } = await import("../src/config/database.js");
  const { runUnscoped } = await import("../src/lib/tenantContext.js");
  const svc = await import("../src/modules/tenants/tenants.service.js");

  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const made = [];
  // Incremented before use, so a seed that throws part-way still burns its
  // index — otherwise the next seed collides on the unique slug and every
  // remaining subtest fails for the wrong reason.
  let n = 0;

  /** A tenant with a user, an audit row and a CRM task — enough to exercise
   *  both the cascade and the RESTRICT pre-clear. */
  const seed = async (name = `Test Org ${stamp}`) => {
    const i = n++;
    return runUnscoped(async () => {
      const tenant = await prisma.tenant.create({
        data: { name, slug: `t-${stamp}-${i}`, code: `T${i}${stamp}`.slice(0, 12), plan: "executive" },
      });
      made.push(tenant.id);
      const role = await prisma.role.create({ data: { name: "enterprise_admin", tenantId: tenant.id } });
      const user = await prisma.user.create({
        data: { email: `u-${stamp}-${i}@t.test`, firstName: "T", lastName: "U", passwordHash: "x", tenantId: tenant.id, roleId: role.id },
      });
      await prisma.auditLog.create({ data: { tenantId: tenant.id, userId: user.id, action: "seed", resource: "tenant" } });
      await prisma.crmTask.create({ data: { tenantId: tenant.id, userId: user.id, title: "seed" } });
      await prisma.contact.create({ data: { tenantId: tenant.id, key: `k-${stamp}-${i}`, name: "Seed", email: `c-${stamp}-${i}@t.test` } });
      return { tenant, user };
    });
  };

  t.after(async () => {
    await runUnscoped(async () => {
      for (const id of made) {
        for (const m of USER_RESTRICTED_MODELS) {
          const d = prisma[m[0].toLowerCase() + m.slice(1)];
          await d?.deleteMany?.({ where: { tenantId: id } }).catch(() => {});
        }
        await prisma.tenant.delete({ where: { id } }).catch(() => {});
      }
    });
    await prisma.$disconnect();
  });

  await t.test("the preview counts what would actually be destroyed", async () => {
    const { tenant } = await seed();
    const preview = await svc.previewDeletion(tenant.id);
    assert.ok(preview.total >= 5, `expected the seeded rows, got ${preview.total}`);
    assert.equal(preview.counts.User, 1);
    assert.equal(preview.counts.AuditLog, 1);
    assert.equal(preview.counts.Contact, 1);
  });

  await t.test("a mistyped name is refused", async () => {
    const { tenant, user } = await seed();
    await assert.rejects(
      () => svc.requestDeletion(tenant.id, user.id, { confirmName: "Not The Name" }),
      /exactly/,
    );
    await assert.rejects(() => svc.requestDeletion(tenant.id, user.id, { confirmName: "" }), /Type the organization/);
    const status = await svc.deletionStatus(tenant.id);
    assert.equal(status.pending, false, "a refused request must not schedule anything");
  });

  await t.test("the exact name schedules a purge one grace window out", async () => {
    const { tenant, user } = await seed();
    // Case and surrounding whitespace are forgiven; nothing else is.
    const res = await svc.requestDeletion(tenant.id, user.id, { confirmName: `  ${tenant.name.toUpperCase()} `, reason: "Closing" });
    assert.equal(res.pending, true);
    const days = Math.round((new Date(res.scheduledFor) - Date.now()) / 86_400_000);
    assert.equal(days, GRACE_DAYS);
    // Still entirely intact.
    assert.equal((await svc.previewDeletion(tenant.id)).counts.User, 1);
  });

  await t.test("a purge before the window elapses is refused", async () => {
    const { tenant, user } = await seed();
    await svc.requestDeletion(tenant.id, user.id, { confirmName: tenant.name });
    await assert.rejects(() => svc.purgeTenant(tenant.id), /grace window/);
    await assert.rejects(() => svc.purgeTenant(tenant.id, { force: false }), /grace window/);
  });

  await t.test("cancelling clears the schedule", async () => {
    const { tenant, user } = await seed();
    await svc.requestDeletion(tenant.id, user.id, { confirmName: tenant.name });
    const after = await svc.cancelDeletion(tenant.id, user.id);
    assert.equal(after.pending, false);
    assert.equal(after.scheduledFor, null);
    await assert.rejects(() => svc.cancelDeletion(tenant.id, user.id), /No deletion is scheduled/);
  });

  await t.test("a legal hold refuses the request outright", async () => {
    const { tenant, user } = await seed();
    await runUnscoped(async () => {
      await prisma.legalHold.create({
        data: { tenantId: tenant.id, name: "Litigation hold", scope: "category", category: "audit_logs", placedById: user.id },
      });
    });
    await assert.rejects(
      () => svc.requestDeletion(tenant.id, user.id, { confirmName: tenant.name }),
      /legal hold/i,
    );
  });

  // The guarantee that matters: a hold placed AFTER the request must still win.
  await t.test("a hold placed during the grace window still blocks the purge", async () => {
    const { tenant, user } = await seed();
    await svc.requestDeletion(tenant.id, user.id, { confirmName: tenant.name });
    await runUnscoped(async () => {
      await prisma.tenant.update({ where: { id: tenant.id }, data: { deletionScheduledFor: new Date(Date.now() - 1000) } });
      await prisma.legalHold.create({
        data: { tenantId: tenant.id, name: "Late hold", scope: "category", category: "audit_logs", placedById: user.id },
      });
    });
    await assert.rejects(() => svc.purgeTenant(tenant.id), /legal hold/i);

    const { due, purged, blocked } = await svc.runScheduledPurges();
    assert.ok(due >= 1);
    assert.ok(!purged.some((p) => p.id === tenant.id), "must not have been purged");
    assert.ok(blocked.some((b) => b.id === tenant.id), "should be reported as blocked");
    // And it is still all there.
    assert.equal((await svc.previewDeletion(tenant.id)).counts.User, 1);
  });

  // The whole point: one delete, and the organization is gone from every table.
  await t.test("once due, the purge removes everything", async () => {
    const { tenant } = await seed();
    const before = await svc.previewDeletion(tenant.id);
    assert.ok(before.total > 0);

    await runUnscoped(async () => {
      await prisma.tenant.update({ where: { id: tenant.id }, data: { deletionScheduledFor: new Date(Date.now() - 1000) } });
    });
    const result = await svc.purgeTenant(tenant.id);
    assert.equal(result.removed.total, before.total);

    const after = await svc.previewDeletion(tenant.id);
    assert.equal(after.total, 0, `rows survived: ${JSON.stringify(after.counts)}`);
    const gone = await runUnscoped(async () => prisma.tenant.findFirst({ where: { id: tenant.id } }));
    assert.equal(gone, null);
  });

  await t.test("the export is built from the governance registry", async () => {
    const { tenant } = await seed();
    const bundle = await svc.exportOrganization(tenant.id);
    assert.equal(bundle.organization.id, tenant.id);
    assert.ok(bundle.exportedAt);
    assert.ok(bundle.data.employee_profile, "the employee category should be present");
    assert.equal(bundle.data.employee_profile.count, 1);
    // Registry-declared fields only — a password hash must never reach an export.
    const row = bundle.data.employee_profile.rows[0];
    assert.ok(row.email);
    assert.ok(!("passwordHash" in row), "exports must not carry credentials");
  });

  await t.test("purging an already-purged organization is a clean 404", async () => {
    await assert.rejects(() => svc.purgeTenant("00000000-0000-0000-0000-000000000000"), /not found/i);
  });
});
