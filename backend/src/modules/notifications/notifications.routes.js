import express from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import * as svc from "./notifications.service.js";

const router = express.Router();
const tid = (req) => req.user.tenantId;
const uid = (req) => req.user.userId;
const handle = (fn) => async (req, res) => {
  try { res.json(await fn(req)); }
  catch (err) { res.status(400).json({ message: err.message }); }
};

router.get("/",            authenticate, handle((req) => svc.list(tid(req), uid(req), req.query)));
router.get("/unread-count",authenticate, handle(async (req) => ({ count: await svc.unreadCount(tid(req), uid(req)) })));
router.post("/:id/read",   authenticate, handle((req) => svc.markRead(tid(req), uid(req), req.params.id)));
router.post("/read-all",   authenticate, handle((req) => svc.markAllRead(tid(req), uid(req))));

export default router;
