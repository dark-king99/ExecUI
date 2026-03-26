import prisma from "../../config/database.js";
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

    const mapping = await assignPermissionToRole(roleId, permissionId);

    res.status(201).json(mapping);

  } catch (error) {
    res.status(500).json({ error: error.message });
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
    res.status(500).json({ error: error.message });
  }
};


export const listRoles = async (req, res) => {
  try {

    const roles = await findRolesByTenant(req.user.tenantId);

    res.json(roles);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


export const createTenantRole = async (req, res) => {
  try {

    const { name } = req.body;

    const role = await createRole(req.user.tenantId, name);

    res.status(201).json(role);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};