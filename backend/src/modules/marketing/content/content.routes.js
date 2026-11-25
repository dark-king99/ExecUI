/**
 * Content Studio — mounted at /api/marketing/content.
 *
 * Uploading, editing and archiving are open to the module. Approving (which
 * makes an asset available to insert into email) and deleting need
 * "Approve marketing content". Uploads are multipart, in the "file" field.
 */
import express from "express";
import { requirePermission } from "../../../middleware/permission.middleware.js";
import { uploadFile } from "../../../middleware/upload.middleware.js";
import * as svc from "./assets.service.js";

const router = express.Router();
const tid = (req) => req.user.tenantId;
const uid = (req) => req.user.userId;
const handle = (fn) => async (req, res) => {
  try { res.json(await fn(req)); }
  catch (e) { res.status(e.status ?? 500).json({ message: e.message }); }
};
const approve = requirePermission("marketing.content.approve");

router.get("/assets", handle((req) => svc.list(tid(req), req.query)));
router.get("/assets/summary", handle((req) => svc.summary(tid(req))));
router.post("/assets", ...uploadFile, handle((req) => svc.create(tid(req), uid(req), req.file, req.body ?? {})));
router.get("/assets/:id", handle((req) => svc.get(tid(req), req.params.id)));
router.put("/assets/:id", handle((req) => svc.update(tid(req), req.params.id, req.body ?? {})));
router.post("/assets/:id/versions", ...uploadFile, handle((req) => svc.addVersion(tid(req), uid(req), req.params.id, req.file, req.body ?? {})));
router.post("/assets/:id/approve", approve, handle((req) => svc.setStatus(tid(req), uid(req), req.params.id, "approve")));
router.post("/assets/:id/unapprove", approve, handle((req) => svc.setStatus(tid(req), uid(req), req.params.id, "unapprove")));
router.post("/assets/:id/archive", handle((req) => svc.setStatus(tid(req), uid(req), req.params.id, "archive")));
router.post("/assets/:id/restore", handle((req) => svc.setStatus(tid(req), uid(req), req.params.id, "restore")));
router.delete("/assets/:id", approve, handle((req) => svc.remove(tid(req), uid(req), req.params.id)));

export default router;
