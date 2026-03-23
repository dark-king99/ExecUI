import express from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requireRole } from "../../middleware/role.middleware.js";
import { requirePermission } from "../../middleware/permission.middleware.js";
import { listRoles, createTenantRole, addPermissionToRole, listRolePermissions } from "./role.controller.js";

const router = express.Router();

router.get(
  "/",
  authenticate,
  requireRole("enterprise_admin"),
  requirePermission("role.read"),
  listRoles
);

router.post(
  "/",
  authenticate,
  requireRole("enterprise_admin"),
  requirePermission("role.create"),
  createTenantRole
);

router.post(
    "/permission",
    authenticate,
    requireRole("enterprise_admin"),
    requirePermission("role.permission.assign"),
    addPermissionToRole
  );
  
  router.get(
    "/:roleId/permissions",
    authenticate,
    requireRole("enterprise_admin"),
    requirePermission("role.permission.read"),
    listRolePermissions
  );

export default router;