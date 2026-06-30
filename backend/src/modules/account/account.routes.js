import express from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requireRole } from "../../middleware/role.middleware.js";
import { uploadImage } from "../../middleware/upload.middleware.js";
import * as c from "./account.controller.js";

const router = express.Router();
const auth = authenticate;

// ── Profile ───────────────────────────────────────────────────────────────
router.get("/profile",              auth, c.getProfile);
router.put("/profile",              auth, c.updateProfile);
router.post("/profile/avatar",      auth, ...uploadImage, c.uploadAvatar);
router.delete("/profile/avatar",    auth, c.removeAvatar);

// ── Security ──────────────────────────────────────────────────────────────
router.get("/security",                     auth, c.getSecurity);
router.post("/security/password",           auth, c.changePassword);
router.post("/security/mfa/enable",         auth, c.enableMfa);
router.post("/security/mfa/disable",        auth, c.disableMfa);
router.post("/security/mfa/verify",         auth, c.verifyMfa);
router.get("/security/sessions",            auth, c.listSessions);
router.delete("/security/sessions/:id",     auth, c.revokeSession);

// ── Notifications ─────────────────────────────────────────────────────────
router.get("/notifications/preferences",    auth, c.getNotificationPreferences);
router.put("/notifications/preferences",    auth, c.updateNotificationPreferences);

// ── Team ──────────────────────────────────────────────────────────────────
router.get("/team/members",          auth, c.listTeamMembers);
router.post("/team/invite",          auth, c.inviteTeamMember);
router.put("/team/members/:id",      auth, c.updateTeamMember);
router.delete("/team/members/:id",   auth, c.removeTeamMember);
router.get("/team/roles",            auth, c.listRoles);

// ── Billing ───────────────────────────────────────────────────────────────
router.get("/billing",                   auth, c.getBilling);
router.get("/billing/plans",             auth, c.getPlans);
// Selecting/changing the org plan is an admin action (it caps everyone's access).
router.post("/billing/select",           auth, requireRole("enterprise_admin", "system_admin"), c.selectPlan);
router.post("/billing/upgrade",          auth, c.upgradePlan);
router.get("/billing/payment-methods",   auth, c.getPaymentMethods);
router.get("/billing/invoices",          auth, c.getInvoices);
router.post("/billing/portal",           auth, c.createPortalSession);
router.post("/billing/setup",            auth, c.createSetupSession);

// Stripe webhook (raw body required — mounted before JSON parser in server.js)
router.post("/billing/webhook", express.raw({ type: "application/json" }), c.stripeWebhook);

// ── Audit logs ────────────────────────────────────────────────────────────
router.get("/audit-logs", auth, c.listAuditLogs);

export default router;
