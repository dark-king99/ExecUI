import express from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requireRole } from "../../middleware/role.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { createIntegrationSchema, updateIntegrationSchema } from "./integrations.schema.js";
import * as svc from "./integrations.service.js";

const router = express.Router();
const auth = authenticate;
// Outbound integration secrets are tenant infrastructure — admins only.
const adminOnly = requireRole("enterprise_admin", "system_admin");

const tid = (req) => req.user.tenantId;
const uid = (req) => req.user.userId;
const handle = (fn) => async (req, res) => {
  try { res.json(await fn(req)); }
  catch (err) { res.status(400).json({ message: err.message }); }
};

router.get("/",            auth, adminOnly, handle((req) => svc.list(tid(req))));
router.post("/",           auth, adminOnly, validate(createIntegrationSchema), handle((req) => svc.create(tid(req), uid(req), req.body)));
router.patch("/:id",       auth, adminOnly, validate(updateIntegrationSchema), handle((req) => svc.update(tid(req), req.params.id, req.body)));
router.delete("/:id",      auth, adminOnly, handle((req) => svc.remove(tid(req), req.params.id)));
router.post("/:id/test",   auth, adminOnly, handle((req) => svc.test(tid(req), req.params.id)));

export default router;
