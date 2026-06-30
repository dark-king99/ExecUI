import express from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requireRole } from "../../middleware/role.middleware.js";
import * as c from "./overview.controller.js";

const router = express.Router();

// Executive Overview is the entry to the main system — available to every
// authenticated employee; the payload itself is department-scoped.
router.get("/dashboard",    authenticate, c.getDashboard);
router.get("/departments",  authenticate, c.listDepartments);
// Department Communication from the Executive Overview is enterprise-admin only.
// (Every employee can still use the department channel in Account → Messaging.)
router.post("/messages",    authenticate, requireRole("enterprise_admin", "system_admin"), c.postMessage);

export default router;
