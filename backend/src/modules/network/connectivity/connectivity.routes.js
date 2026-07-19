/**
 * Connectivity + network-profile routes — additive, mounted under /api/network.
 * Existing enterprise network routes are untouched.
 */
import express from "express";
import { authenticate } from "../../../middleware/auth.middleware.js";
import { requireRole } from "../../../middleware/role.middleware.js";
import * as svc from "./connectivity.service.js";

const router = express.Router();
const tid = (req) => req.user.tenantId;
const adminOnly = requireRole("enterprise_admin", "system_admin");
const handle = (fn) => async (req, res) => {
  try { res.json(await fn(req)); }
  catch (err) { res.status(err.status ?? 400).json({ message: err.message, code: err.code }); }
};

// Network scale profile
router.get("/profile",  authenticate, handle((req) => svc.getProfile(tid(req))));
router.put("/profile",  authenticate, adminOnly, handle((req) => svc.setProfile(tid(req), req.body?.profile)));

// Internet / WAN connections
router.get("/connections",        authenticate, handle((req) => svc.list(tid(req))));
router.post("/connections",       authenticate, handle((req) => svc.create(tid(req), req.body)));
router.patch("/connections/:id",  authenticate, handle((req) => svc.update(tid(req), req.params.id, req.body)));
router.delete("/connections/:id", authenticate, handle((req) => svc.remove(tid(req), req.params.id)));

// Office at-a-glance summary
router.get("/connectivity/summary", authenticate, handle((req) => svc.summary(tid(req))));

export default router;
