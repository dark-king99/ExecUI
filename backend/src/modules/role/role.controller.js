import prisma from "../../config/database.js";
import { normalizeRoleName, isGrantable } from "./permission.catalog.js";
import {
  assignPermissionToRole,
  createRole,
  findRolesByTenant,
  getRolePermissions,
  getRoleWithPermissions
} from "./role.service.js";


export const addPermissionToRole = async (req, res) => {
  try {
    const { roleId, permissionId } = req.body;

    const role = await getRoleWithPermissions(roleId);

    if (!role || role.tenantId !== req.user.tenantId) {
      return res.status(404).json({ error: "Role not found" });
    }
    // Only catalog permissions are grantable — otherwise this endpoint could
    // hand out admin_access or the role-management keys.
    const permission = await prisma.permission.findUnique({ where: { id: String(permissionId ?? "") } });
    if (!permission || !isGrantable(permission.key)) {
      return res.status(400).json({ error: "That permission can't be granted." });
    }
    if (["enterprise_admin", "system_admin"].includes(role.name)) {
      return res.status(400).json({ error: "Admins already have every permission." });
    }

    const mapping = await assignPermissionToRole(roleId, permissionId);

    res.status(201).json(mapping);

  } catch (error) {
    res.status(error.status ?? 500).json({ error: error.message });
  }
};


export const listRolePermissions = async (req, res) => {
  try {
    const { roleId } = req.params;

    const role = await getRoleWithPermissions(roleId);

    if (!role || role.tenantId !== req.user.tenantId) {
      return res.status(404).json({ error: "Role not found" });
    }

    const permissions = await getRolePermissions(roleId);

    res.json(permissions);

  } catch (error) {
    res.status(error.status ?? 500).json({ error: error.message });
  }
};


export const listRoles = async (req, res) => {
  try {

    const roles = await findRolesByTenant(req.user.tenantId);

    res.json(roles);

  } catch (error) {
    res.status(error.status ?? 500).json({ error: error.message });
  }
};


export const createTenantRole = async (req, res) => {
  try {

    // Same rules as the Roles & Permissions panel: normalized, and never a
    // reserved name. This endpoint was only safe before because the permission
    // middleware 403'd real admins; a role named "system_admin" would make its
    // members platform operators.
    const name = normalizeRoleName(req.body?.name);
    if (await prisma.role.findFirst({ where: { tenantId: req.user.tenantId, name } })) {
      return res.status(409).json({ error: `A role called "${name}" already exists.` });
    }

    const role = await createRole(req.user.tenantId, name);

    res.status(201).json(role);

  } catch (error) {
    res.status(error.status ?? 500).json({ error: error.message });
  }
};