/**
 * Roles & permissions as an organization admin manages them.
 *
 * Every operation here is reached only through admin-gated routes, and each one
 * re-checks that the role or member belongs to the caller's tenant — the role
 * and user ids come from the request body or URL, so they are never trusted.
 *
 * Two boundaries hold throughout:
 *   • Only keys in the grantable catalog can be granted or revoked.
 *   • Admin roles are not managed here. They pass every permission check
 *     anyway, and promoting someone to admin — or demoting an admin — is a
 *     deliberate act that belongs on the Members page, not a side effect of
 *     tidying up roles.
 */
import prisma from "../../config/database.js";
import { catalog, grantable, isGrantable, ADMIN_ROLE_NAMES, normalizeRoleName } from "./permission.catalog.js";

const err = (message, status = 400) => Object.assign(new Error(message), { status });
const isAdminRole = (role) => ADMIN_ROLE_NAMES.has(role?.name);

const audit = (tenantId, userId, action, resourceId, detail) =>
  prisma.auditLog.create({ data: { tenantId, userId, action, resource: "role", resourceId, detail } });

async function roleInTenant(tenantId, roleId) {
  const role = typeof roleId === "string" && roleId
    ? await prisma.role.findFirst({ where: { id: roleId, tenantId } })
    : null;
  if (!role) throw err("Role not found", 404);
  return role;
}

/** Everything the panel shows: the catalog, and each role with its members and grants. */
export async function overview(tenantId) {
  const roles = await prisma.role.findMany({
    where: { tenantId },
    include: {
      rolePermissions: { include: { permission: { select: { key: true } } } },
      users: { select: { id: true, firstName: true, lastName: true, email: true, isActive: true } },
    },
  });
  return {
    catalog: catalog(),
    roles: roles
      .map((r) => ({
        id: r.id,
        name: r.name,
        admin: isAdminRole(r),
        // Only catalog keys are shown. The coarse signup keys an admin role
        // carries are not grants anyone made here.
        granted: r.rolePermissions.map((rp) => rp.permission.key).filter(isGrantable).sort(),
        members: r.users
          .map((u) => ({ id: u.id, name: `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email, email: u.email, active: u.isActive }))
          .sort((a, b) => a.name.localeCompare(b.name)),
      }))
      // Admin roles first, then alphabetical.
      .sort((a, b) => (b.admin - a.admin) || a.name.localeCompare(b.name)),
  };
}

export async function grant(tenantId, actorId, roleId, key) {
  const entry = grantable(key);
  if (!entry) throw err("That permission can't be granted here.");
  const role = await roleInTenant(tenantId, roleId);
  if (isAdminRole(role)) throw err("Admins already have every permission.");

  // Created on first grant if this database never had it: the key list lives in
  // the catalog, and signup only ever created four coarse keys.
  const permission = await prisma.permission.upsert({
    where: { key },
    update: {},
    create: { key, description: entry.description },
  });
  await prisma.rolePermission.upsert({
    where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
    update: {},
    create: { roleId: role.id, permissionId: permission.id },
  });
  await audit(tenantId, actorId, "role.permission.granted", role.id, `Granted ${key} to ${role.name}`);
  return overview(tenantId);
}

export async function revoke(tenantId, actorId, roleId, key) {
  if (!isGrantable(key)) throw err("That permission can't be revoked here.");
  const role = await roleInTenant(tenantId, roleId);
  if (isAdminRole(role)) throw err("Admins always have every permission.");
  const permission = await prisma.permission.findUnique({ where: { key } });
  if (permission) {
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id, permissionId: permission.id } });
  }
  await audit(tenantId, actorId, "role.permission.revoked", role.id, `Revoked ${key} from ${role.name}`);
  return overview(tenantId);
}

export async function createRole(tenantId, actorId, rawName) {
  const name = normalizeRoleName(rawName);
  if (await prisma.role.findFirst({ where: { tenantId, name } })) throw err(`A role called "${name}" already exists.`, 409);
  const role = await prisma.role.create({ data: { tenantId, name } });
  await audit(tenantId, actorId, "role.created", role.id, `Created role ${name}`);
  return overview(tenantId);
}

/**
 * Move a member into a role. Their permissions follow the role at once; the
 * role name in their session updates the next time they sign in.
 */
export async function assignMember(tenantId, actorId, userId, roleId) {
  const role = await roleInTenant(tenantId, roleId);
  if (isAdminRole(role)) throw err("Promote someone to admin from the Members page.");
  if (userId === actorId) throw err("You can't change your own role.");
  const user = typeof userId === "string" && userId
    ? await prisma.user.findFirst({ where: { id: userId, tenantId }, include: { role: true } })
    : null;
  if (!user) throw err("Member not found", 404);
  if (isAdminRole(user.role)) throw err("Demote an admin from the Members page.");
  if (user.roleId === role.id) return overview(tenantId);

  await prisma.user.update({ where: { id: user.id }, data: { roleId: role.id } });
  await audit(tenantId, actorId, "role.member.assigned", role.id, `Moved ${user.email} from ${user.role?.name ?? "—"} to ${role.name}`);
  return overview(tenantId);
}
