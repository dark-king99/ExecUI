/**
 * Approvals routes — mounted at /api/approvals.
 *
 * Available to every authenticated employee: approving is a normal part of the
 * job, not an admin function. Authorization is per-request (you must be an
 * approver on the current step), enforced in the service.
 */
import express from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import * as svc from "./approvals.service.js";
import { capture } from "../../lib/analytics.js";

const router = express.Router();
const uid = (req) => req.user.userId;
const isAdmin = (req) => ["enterprise_admin", "system_admin"].includes(req.user.role);

const handle = (fn, status = 200) => async (req, res) => {
  try { res.status(status).json(await fn(req)); }
  catch (err) { res.status(err.status ?? 500).json({ message: err.message }); }
};

const captureAction = (event, fn) => handle(async (req) => {
  const result = await fn(req);
  await capture(undefined, event, { area: "approvals" });
  return result;
});

router.get("/", authenticate, handle((req) =>
  svc.listRequests({
    status: req.query.status, mine: req.query.mine === "true", userId: uid(req),
    workflowId: req.query.workflowId, resource: req.query.resource, recordId: req.query.recordId,
    limit: req.query.limit,
  })));

router.get("/pending-count", authenticate, handle((req) => svc.pendingCountFor(uid(req)).then((count) => ({ count }))));

router.post("/", authenticate, handle((req) =>
  svc.createRequest({ ...req.body, tenantId: req.user.tenantId, requestedById: uid(req) }), 201));

router.get("/:id", authenticate, handle((req) => svc.getRequest(req.params.id)));
router.post("/:id/decide", authenticate, captureAction("approval_decided", (req) => svc.decide(uid(req), req.params.id, req.body || {})));
router.post("/:id/cancel", authenticate, handle((req) => svc.cancelRequest(uid(req), req.params.id, { isAdmin: isAdmin(req) })));

export default router;
