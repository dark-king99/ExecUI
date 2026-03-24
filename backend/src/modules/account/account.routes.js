import express from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import * as c from "./account.controller.js";

const router = express.Router();
const auth = authenticate;

// ── Profile ───────────────────────────────────────────────────────────────
router.get("/profile",              auth, c.getProfile);
router.put("/profile",              auth, c.updateProfile);
router.post("/profile/avatar",      auth, c.uploadAvatar);

// ── Security ──────────────────────────────────────────────────────────────
router.get("/security",                     auth, c.getSecurity);
router.post("/security/password",           auth, c.changePassword);
router.post("/security/mfa/enable",         auth, c.enableMfa);
router.post("/security/mfa/disable",        auth, c.disableMfa);
router.post("/security/mfa/verify",         auth, c.verifyMfa);
router.get("/security/sessions",            auth, c.listSessions);
router.delete("/security/sessions/:id",     auth, c.revokeSession);

// ── API Keys ──────────────────────────────────────────────────────────────
router.get("/api-keys",          auth, c.listApiKeys);
router.post("/api-keys",         auth, c.createApiKey);
router.delete("/api-keys/:id",   auth, c.deleteApiKey);
router.post("/api-keys/:id/rotate", auth, c.rotateApiKey);

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
router.post("/billing/upgrade",          auth, c.upgradePlan);
router.get("/billing/payment-methods",   auth, c.getPaymentMethods);
router.get("/billing/invoices",          auth, c.getInvoices);

// ── Audit logs ────────────────────────────────────────────────────────────
router.get("/audit-logs", auth, c.listAuditLogs);

export default router;
