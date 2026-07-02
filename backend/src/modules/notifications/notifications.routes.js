import express from "express";
import jwt from "jsonwebtoken";
import { authenticate } from "../../middleware/auth.middleware.js";
import * as svc from "./notifications.service.js";
import { sseHandler } from "../../lib/sse.js";

// EventSource cannot set an Authorization header, so the live stream
// authenticates with the same JWT passed as a query parameter.
function authenticateFromQuery(req, res, next) {
  try {
    req.user = jwt.verify(String(req.query.token ?? ""), process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: "Unauthorized" });
  }
}

const router = express.Router();
const tid = (req) => req.user.tenantId;
const uid = (req) => req.user.userId;
const handle = (fn) => async (req, res) => {
  try { res.json(await fn(req)); }
  catch (err) { res.status(400).json({ message: err.message }); }
};

// Live stream: pushes an event the instant a notification is created.
router.get("/stream",      authenticateFromQuery, sseHandler);

router.get("/",            authenticate, handle((req) => svc.list(tid(req), uid(req), req.query)));
router.get("/unread-count",authenticate, handle(async (req) => ({ count: await svc.unreadCount(tid(req), uid(req)) })));
router.post("/:id/read",   authenticate, handle((req) => svc.markRead(tid(req), uid(req), req.params.id)));
router.post("/read-all",   authenticate, handle((req) => svc.markAllRead(tid(req), uid(req))));

export default router;
