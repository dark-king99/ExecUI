/**
 * Roles & permissions: what an admin may grant, and that nobody else can.
 *
 * The HTTP half runs the real Express app against the database with tokens
 * minted exactly as login mints them, because "employees can't grant" is a
 * property of the routes, not of the panel that hides the buttons.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { GRANTABLE, isGrantable, unlocksFor, normalizeRoleName } from "../src/modules/role/permission.catalog.js";
import { ACTION_PERMISSIONS } from "../src/modules/assistant/assistant.actions.js";
import { requirePermission } from "../src/middleware/permission.middleware.js";

const HAS_DB = !!process.env.DATABASE_URL;

// ── The catalog ──────────────────────────────────────────────────────────────
test("every permission the agent checks can be granted", () => {
  for (const key of [...ACTION_PERMISSIONS, "marketing.campaign.create"]) {
    assert.ok(isGrantable(key), `${key} is checked but can't be granted`);
  }
});

test("nothing that manufactures an admin is grantable", () => {
  for (const key of ["admin_access", "crm_access", "role.create", "role.permission.assign", "role.read", "user.invite"]) {
    assert.equal(isGrantable(key), false, key);
  }
});

test("every grantable permission says what it unlocks", () => {
  for (const { key, label, description, group } of GRANTABLE) {
    assert.ok(label && description && ["CRM", "Marketing", "Network"].includes(group), key);
    assert.ok(unlocksFor(key).length > 0, `${key} unlocks nothing — why is it grantable?`);
  }
});

test("reserved role names are refused however they're written", () => {
  for (const name of ["system_admin", "System Admin", "SYSTEM-ADMIN", " enterprise_admin ", "Enterprise  Admin"]) {
    assert.throws(() => normalizeRoleName(name), /reserved/, name);
  }
  assert.equal(normalizeRoleName("Network Operator"), "network_operator");
  assert.throws(() => normalizeRoleName("x"), /2–40/);
  assert.throws(() => normalizeRoleName("!!!"), /2–40/);
});

// ── The middleware ───────────────────────────────────────────────────────────
test("requirePermission means the same thing whatever else a role holds", { skip: !HAS_DB && "DATABASE_URL not set" }, async () => {
  const { default: prisma } = await import("../src/config/database.js");
  const original = prisma.user.findUnique;
  const as = (roleName, keys) => {
    prisma.user.findUnique = async () => ({ role: { name: roleName, rolePermissions: keys.map((key) => ({ permission: { key } })) } });
  };
  const call = async () => {
    let status = 200;
    const res = { status: (s) => { status = s; return { json: () => {} }; } };
    let passed = false;
    await requirePermission("crm.pipeline.manage")({ user: { userId: "u" } }, res, () => { passed = true; });
    return passed ? "pass" : status;
  };
  try {
    as("enterprise_admin", ["crm_access"]);
    assert.equal(await call(), "pass", "an admin with only coarse keys was refused");
    as("employee", []);
    assert.equal(await call(), 403, "a role with NO keys used to pass every check");
    as("employee", ["network.alerts.manage"]);
    assert.equal(await call(), 403);
    as("employee", ["crm.pipeline.manage"]);
    assert.equal(await call(), "pass");
  } finally {
    prisma.user.findUnique = original;
  }
});

// ── Over HTTP ────────────────────────────────────────────────────────────────
test("the roles & permissions API", { skip: !HAS_DB && "DATABASE_URL not set" }, async (t) => {
  const { default: app } = await import("../src/app.js");
  const { default: prisma } = await import("../src/config/database.js");
  const { runUnscoped } = await import("../src/lib/tenantContext.js");
  const jwt = (await import("jsonwebtoken")).default;

  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const made = await runUnscoped(async () => {
    const mkTenant = (n) => prisma.tenant.create({
      data: { name: `Roles ${n} ${stamp}`, slug: `roles-${n}-${stamp}`, code: `R${n}${stamp}`.slice(0, 12), plan: "executive" },
    });
    const tenant = await mkTenant("a");
    const other = await mkTenant("b");
    const adminRole = await prisma.role.create({ data: { name: "enterprise_admin", tenantId: tenant.id } });
    const employeeRole = await prisma.role.create({ data: { name: "employee", tenantId: tenant.id } });
    const foreignRole = await prisma.role.create({ data: { name: "employee", tenantId: other.id } });
    const mk = (n, roleId, tenantId = tenant.id) => prisma.user.create({
      data: { email: `roles-${n}-${stamp}@t.test`, firstName: n, lastName: "T", passwordHash: "x", tenantId, roleId },
    });
    return {
      tenant, other, adminRole, employeeRole, foreignRole,
      admin: await mk("admin", adminRole.id),
      admin2: await mk("admin2", adminRole.id),
      emp: await mk("emp", employeeRole.id),
      outsider: await mk("outsider", foreignRole.id, other.id),
    };
  });

  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const token = (u, role) => jwt.sign({ userId: u.id, tenantId: u.tenantId, role, email: u.email }, process.env.JWT_SECRET);
  const adminTok = token(made.admin, "enterprise_admin");
  const empTok = token(made.emp, "employee");
  const call = async (tok, method, path, body) => {
    const res = await fetch(`${base}${path}`, {
      method, headers: { Authorization: `Bearer ${tok}`, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, body: await res.json().catch(() => null) };
  };

  t.after(async () => {
    server.close();
    await runUnscoped(async () => {
      for (const tid of [made.tenant.id, made.other.id]) {
        await prisma.auditLog.deleteMany({ where: { tenantId: tid } });
        const roles = await prisma.role.findMany({ where: { tenantId: tid }, select: { id: true } });
        await prisma.rolePermission.deleteMany({ where: { roleId: { in: roles.map((r) => r.id) } } });
        await prisma.user.deleteMany({ where: { tenantId: tid } });
        await prisma.role.deleteMany({ where: { tenantId: tid } });
        await prisma.tenant.delete({ where: { id: tid } }).catch(() => {});
      }
    });
  });

  await t.test("an employee is refused every endpoint, not just hidden from them", async () => {
    const r = made.employeeRole.id;
    for (const [method, path, body] of [
      ["GET", "/account/team/access"],
      ["POST", "/account/team/access/roles", { name: "sneaky" }],
      ["PUT", `/account/team/access/roles/${r}/permissions/crm.pipeline.manage`],
      ["DELETE", `/account/team/access/roles/${r}/permissions/crm.pipeline.manage`],
      ["PUT", `/account/team/access/members/${made.emp.id}/role`, { roleId: made.adminRole.id }],
    ]) {
      assert.equal((await call(empTok, method, path, body)).status, 403, `${method} ${path}`);
    }
  });

  await t.test("an admin sees the catalog and every role", async () => {
    const { status, body } = await call(adminTok, "GET", "/account/team/access");
    assert.equal(status, 200);
    assert.equal(body.catalog.length, GRANTABLE.length);
    const admin = body.roles.find((r) => r.name === "enterprise_admin");
    assert.equal(admin.admin, true);
    assert.equal(body.roles[0].name, "enterprise_admin", "admin roles list first");
    assert.deepEqual(body.roles.find((r) => r.name === "employee").members.map((m) => m.email), [made.emp.email]);
  });

  await t.test("granting and revoking", async () => {
    const path = `/account/team/access/roles/${made.employeeRole.id}/permissions/crm.pipeline.manage`;
    const granted = await call(adminTok, "PUT", path);
    assert.equal(granted.status, 200);
    assert.deepEqual(granted.body.roles.find((r) => r.id === made.employeeRole.id).granted, ["crm.pipeline.manage"]);
    assert.equal((await call(adminTok, "PUT", path)).status, 200, "granting twice is harmless");
    const revoked = await call(adminTok, "DELETE", path);
    assert.deepEqual(revoked.body.roles.find((r) => r.id === made.employeeRole.id).granted, []);
    const audit = await runUnscoped(() => prisma.auditLog.findMany({ where: { tenantId: made.tenant.id, action: { startsWith: "role.permission." } } }));
    assert.ok(audit.length >= 2, "grants and revokes are audited");
  });

  await t.test("what can't be granted, or granted to whom", async () => {
    const empRole = made.employeeRole.id;
    assert.equal((await call(adminTok, "PUT", `/account/team/access/roles/${empRole}/permissions/admin_access`)).status, 400);
    assert.equal((await call(adminTok, "PUT", `/account/team/access/roles/${made.adminRole.id}/permissions/crm.pipeline.manage`)).status, 400);
    assert.equal((await call(adminTok, "PUT", `/account/team/access/roles/${made.foreignRole.id}/permissions/crm.pipeline.manage`)).status, 404,
      "another organization's role is invisible");
  });

  await t.test("creating roles", async () => {
    const ok = await call(adminTok, "POST", "/account/team/access/roles", { name: "Network Operator" });
    assert.equal(ok.status, 200);
    assert.ok(ok.body.roles.some((r) => r.name === "network_operator"));
    assert.equal((await call(adminTok, "POST", "/account/team/access/roles", { name: "network operator" })).status, 409);
    for (const name of ["System Admin", "enterprise_admin"]) {
      assert.equal((await call(adminTok, "POST", "/account/team/access/roles", { name })).status, 400, name);
    }
    // The older endpoint obeys the same rule.
    assert.equal((await call(adminTok, "POST", "/roles", { name: "system admin" })).status, 400);
  });

  await t.test("moving members between roles", async () => {
    const ops = (await call(adminTok, "GET", "/account/team/access")).body.roles.find((r) => r.name === "network_operator");
    const moved = await call(adminTok, "PUT", `/account/team/access/members/${made.emp.id}/role`, { roleId: ops.id });
    assert.equal(moved.status, 200);
    assert.deepEqual(moved.body.roles.find((r) => r.id === ops.id).members.map((m) => m.id), [made.emp.id]);

    const refused = [
      [made.emp.id, made.adminRole.id, "promotion to admin happens on the Members page"],
      [made.admin2.id, ops.id, "an admin can't be demoted here"],
      [made.admin.id, ops.id, "nobody changes their own role"],
      [made.outsider.id, ops.id, "another organization's member"],
      [made.emp.id, made.foreignRole.id, "another organization's role"],
    ];
    for (const [userId, roleId, why] of refused) {
      assert.ok([400, 404].includes((await call(adminTok, "PUT", `/account/team/access/members/${userId}/role`, { roleId })).status), why);
    }
  });

  await t.test("a member can't be put in another organization's role", async () => {
    const res = await call(adminTok, "PUT", `/users/admin/users/${made.emp.id}`, { roleId: made.foreignRole.id });
    assert.equal(res.status, 400);
    const emp = await runUnscoped(() => prisma.user.findFirst({ where: { id: made.emp.id } }));
    assert.notEqual(emp.roleId, made.foreignRole.id);
  });
});
