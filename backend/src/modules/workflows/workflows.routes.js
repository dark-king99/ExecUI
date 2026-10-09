/**
 * Workflow automation routes — mounted at /api/workflows.
 *
 * Admin-only: a rule acts on everyone's data automatically, so authoring one is
 * an administrative act. Approvals (which every employee participates in) live
 * separately at /api/approvals.
 */
import express from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requireRole } from "../../middleware/role.middleware.js";
import * as svc from "./workflows.service.js";
import { capture } from "../../lib/analytics.js";

const router = express.Router();
const uid = (req) => req.user.userId;
const tid = (req) => req.user.tenantId;

const handle = (fn, status = 200) => async (req, res) => {
  try { res.status(status).json(await fn(req)); }
  catch (err) { res.status(err.status ?? 500).json({ message: err.message }); }
};

const captureAction = (event, fn, status = 200) => handle(async (req) => {
  const result = await fn(req);
  await capture(undefined, event, { area: "workflows" });
  return result;
}, status);

router.use(authenticate, requireRole("enterprise_admin", "system_admin"));

router.get("/catalog", handle(() => svc.catalog()));
router.get("/runs", handle((req) => svc.runHistory({ workflowId: req.query.workflowId, limit: req.query.limit })));

router.get("/", handle(() => svc.listWorkflows()));
router.post("/", captureAction("workflow_created", (req) => svc.createWorkflow(uid(req), req.body), 201));
router.get("/:id", handle((req) => svc.getWorkflow(req.params.id)));
router.put("/:id", handle((req) => svc.updateWorkflow(req.params.id, req.body)));
router.delete("/:id", handle((req) => svc.deleteWorkflow(req.params.id)));
router.post("/:id/test", captureAction("workflow_tested", (req) => svc.testWorkflow(tid(req), req.params.id, req.body || {})));

export default router;
