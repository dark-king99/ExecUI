import express from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requireRole } from "../../middleware/role.middleware.js";
import * as email from "../../lib/email.js";

const router = express.Router();
const tid = (req) => req.user.tenantId;
const uid = (req) => req.user.userId;
const handle = (fn) => async (req, res) => {
  try { res.json(await fn(req)); }
  catch (err) { res.status(400).json({ message: err.message }); }
};

// Is outbound email configured on this server?
router.get("/status", authenticate, (_req, res) => res.json({ configured: email.emailConfigured() }));

// Generic send — used by Marketing (Email Studio), CRM (email a contact), etc.
router.post("/send", authenticate, handle((req) =>
  email.sendEmail({
    tenantId: tid(req), userId: uid(req),
    to: req.body.to, subject: req.body.subject, html: req.body.html, text: req.body.text,
    context: req.body.context || "manual",
  })
));

// Delivery log (admins).
router.get("/logs", authenticate, requireRole("enterprise_admin", "system_admin"),
  handle((req) => email.listEmailLogs(tid(req), Number(req.query.limit) || 50)));

export default router;
