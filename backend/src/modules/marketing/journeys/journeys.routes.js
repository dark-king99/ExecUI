/**
 * Journey Builder and Automation Studio — mounted at /api/marketing/journeys
 * (behind the marketing module gate).
 *
 * Building and testing drafts is open to the module. Publishing, pausing,
 * archiving, deleting and enrolling or removing contacts change what happens
 * to real people, so they need "Run journeys and automations". Admins pass.
 */
import express from "express";
import { requirePermission } from "../../../middleware/permission.middleware.js";
import * as svc from "./journeys.service.js";

const router = express.Router();
const tid = (req) => req.user.tenantId;
const uid = (req) => req.user.userId;
const handle = (fn) => async (req, res) => {
  try { res.json(await fn(req)); }
  catch (e) { res.status(e.status ?? 500).json({ message: e.message }); }
};
const run = requirePermission("marketing.journey.manage");

router.get("/catalog", handle(() => svc.catalog()));
router.get("/pickers", handle((req) => svc.pickers(tid(req))));
router.get("/contacts", handle((req) => svc.searchContacts(tid(req), req.query.q)));
router.get("/", handle((req) => svc.list(tid(req), { kind: req.query.kind })));
router.post("/", handle((req) => svc.create(tid(req), uid(req), req.body ?? {})));
router.get("/:id", handle((req) => svc.get(tid(req), req.params.id)));
router.put("/:id", handle((req) => svc.updateDraft(tid(req), req.params.id, req.body ?? {})));
router.delete("/:id", run, handle((req) => svc.remove(tid(req), uid(req), req.params.id)));
router.get("/:id/check", handle((req) => svc.check(tid(req), req.params.id)));
router.post("/:id/simulate", handle((req) => svc.simulate(tid(req), req.params.id, req.body ?? {})));
router.post("/:id/duplicate", handle((req) => svc.duplicate(tid(req), uid(req), req.params.id)));
router.get("/:id/stats", handle((req) => svc.stats(tid(req), req.params.id)));
router.get("/:id/enrollments", handle((req) => svc.enrollments(tid(req), req.params.id, req.query)));
router.get("/:id/enrollments/:eid/history", handle((req) => svc.history(tid(req), req.params.id, req.params.eid)));
router.post("/:id/publish", run, handle((req) => svc.publish(tid(req), uid(req), req.params.id, req.body ?? {})));
router.post("/:id/pause", run, handle((req) => svc.pause(tid(req), uid(req), req.params.id)));
router.post("/:id/resume", run, handle((req) => svc.resume(tid(req), uid(req), req.params.id)));
router.post("/:id/archive", run, handle((req) => svc.archive(tid(req), uid(req), req.params.id)));
router.post("/:id/enroll", run, handle((req) => svc.enrollContacts(tid(req), uid(req), req.params.id, req.body?.contactIds)));
router.delete("/:id/enrollments/:eid", run, handle((req) => svc.removeEnrollment(tid(req), uid(req), req.params.id, req.params.eid)));

export default router;
