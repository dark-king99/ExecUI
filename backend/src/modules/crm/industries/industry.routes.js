/**
 * Industry module routes — additive, mounted at /api/crm/industry.
 * The core CRM routes are untouched; this router only adds the industry layer.
 *
 * A tenant has exactly ONE industry, resolved server-side, so callers can only
 * ever read/write their own industry's objects (defence in depth on top of the
 * tenant guard).
 */
import express from "express";
import { authenticate } from "../../../middleware/auth.middleware.js";
import { requireRole } from "../../../middleware/role.middleware.js";
import * as svc from "./industry.service.js";

const router = express.Router();
const tid = (req) => req.user.tenantId;
const adminOnly = requireRole("enterprise_admin", "system_admin");

const handle = (fn) => async (req, res) => {
  try { res.json(await fn(req)); }
  catch (err) { res.status(err.status ?? 400).json({ message: err.message, code: err.code }); }
};

// Catalog of all industries (drives the industry picker).
router.get("/catalog", authenticate, handle(() => ({ industries: svc.catalog() })));

// Current tenant industry + manifest.
router.get("/", authenticate, handle((req) => svc.getIndustry(tid(req))));

// Change the tenant's industry (admin only — it reshapes everyone's CRM).
router.put("/", authenticate, adminOnly, handle((req) => svc.setIndustry(tid(req), req.body?.industry)));

// Generic records for the tenant's own industry.
router.get("/records/:objectType", authenticate, handle(async (req) => {
  const industry = await svc.currentIndustryId(tid(req));
  return svc.listRecords(tid(req), industry, req.params.objectType, req.query);
}));

router.post("/records/:objectType", authenticate, handle(async (req) => {
  const industry = await svc.currentIndustryId(tid(req));
  return svc.createRecord(tid(req), industry, req.params.objectType, req.body, req.user);
}));

router.get("/stats/:objectType", authenticate, handle(async (req) => {
  const industry = await svc.currentIndustryId(tid(req));
  return svc.stats(tid(req), industry, req.params.objectType);
}));

router.patch("/records/:id", authenticate, handle((req) => svc.updateRecord(tid(req), req.params.id, req.body)));
router.delete("/records/:id", authenticate, handle((req) => svc.deleteRecord(tid(req), req.params.id)));

export default router;
