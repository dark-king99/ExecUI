import express from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requireRole } from "../../middleware/role.middleware.js";
import {
  listUsers, getUser, inviteUser, updateUser, deleteUser, toggleUserStatus,
  listSessions, listAuditLogs, getWorkspaceStats, listRoles,
} from "./users.controller.js";

const router = express.Router();
const auth  = authenticate;
const admin = [authenticate, requireRole("enterprise_admin")];

// Roles list (for invite dropdown)
router.get("/admin/roles",             ...admin, listRoles);

// Workspace overview (admin)
router.get("/admin/workspace/stats",   ...admin, getWorkspaceStats);
router.get("/admin/workspace/sessions", ...admin, listSessions);
router.get("/admin/workspace/audit",   ...admin, listAuditLogs);

// User management (admin)
router.get("/admin/users",          ...admin, listUsers);
router.post("/admin/invite",        ...admin, inviteUser);
router.get("/admin/users/:id",      ...admin, getUser);
router.put("/admin/users/:id",      ...admin, updateUser);
router.delete("/admin/users/:id",   ...admin, deleteUser);
router.post("/admin/users/:id/toggle-status", ...admin, toggleUserStatus);

export default router;
