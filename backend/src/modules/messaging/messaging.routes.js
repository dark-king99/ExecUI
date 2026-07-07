import express from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import * as svc from "./messaging.service.js";

const router = express.Router();
const tid = (req) => req.user.tenantId;
const uid = (req) => req.user.userId;
const handle = (fn) => async (req, res) => {
  try { res.json(await fn(req)); }
  catch (err) { res.status(400).json({ message: err.message }); }
};

router.get("/conversations", authenticate, handle((req) => svc.listConversations(tid(req), uid(req))));
router.get("/directory",     authenticate, handle((req) => svc.directory(tid(req), uid(req))));
router.get("/dm/:userId",    authenticate, handle((req) => svc.getDmThread(tid(req), uid(req), req.params.userId)));
router.post("/dm",           authenticate, handle((req) => svc.sendDm(tid(req), uid(req), req.body)));
router.get("/dept",          authenticate, handle((req) => svc.getDeptThread(tid(req), uid(req))));
router.post("/dept",         authenticate, handle((req) => svc.sendDept(tid(req), uid(req), req.body)));

export default router;
