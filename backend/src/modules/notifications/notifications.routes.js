import express from "express";
import jwt from "jsonwebtoken";
import { authenticate } from "../../middleware/auth.middleware.js";
import { runWithTenant } from "../../lib/tenantContext.js";
import { tenantHasTrialAccess } from "../../middleware/access.middleware.js";
import * as svc from "./notifications.service.js";
import { sseHandler } from "../../lib/sse.js";

// EventSource cannot set an Authorization header, so the live stream
// authenticates with the same JWT passed as a query parameter.
async function authenticateFromQuery(req, res, next) {
  let decoded;
  try {
    decoded = jwt.verify(String(req.query.token ?? ""), process.env.JWT_SECRET);
    if (!decoded?.tenantId) return res.status(401).json({ message: "Unauthorized" });
  } catch {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    if (!(await tenantHasTrialAccess(decoded.tenantId))) {
      return res.status(403).json({
        message: "Your free trial has ended. Choose a plan in Billing to restore workspace access.",
        code: "TRIAL_EXPIRED",
      });
    }
    req.user = decoded;
    return runWithTenant(
      { tenantId: decoded.tenantId, userId: decoded.userId, role: decoded.role },
      () => next(),
    );
  } catch (error) {
    next(error);
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
