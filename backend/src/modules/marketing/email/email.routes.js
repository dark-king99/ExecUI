/**
 * Email Studio, consent and audience rules — mounted at /api/marketing/email
 * and /api/marketing (behind the marketing module gate).
 *
 * Drafting is open to the module. Sending, scheduling and test sends need
 * "Send marketing email"; domains and email settings need "Manage marketing
 * settings". Admins pass both.
 */
import express from "express";
import { requirePermission } from "../../../middleware/permission.middleware.js";
import * as svc from "./email.service.js";
import * as foundation from "../foundation.js";
import * as audiences from "../audiences.service.js";

const router = express.Router();
const tid = (req) => req.user.tenantId;
const uid = (req) => req.user.userId;
const handle = (fn) => async (req, res) => {
  try { res.json(await fn(req)); }
  catch (e) { res.status(e.status ?? 500).json({ message: e.message }); }
};
const send = requirePermission("marketing.email.send");
const settings = requirePermission("marketing.settings.manage");
const consentWrite = requirePermission("marketing.audience.write");

// Settings + domains
router.get("/email/settings", handle((req) => svc.getSettings(tid(req))));
router.put("/email/settings", settings, handle((req) => svc.updateSettings(tid(req), req.body ?? {})));
router.get("/email/domains", handle((req) => svc.listDomains(tid(req))));
router.post("/email/domains", settings, handle((req) => svc.addDomain(tid(req), uid(req), req.body?.domain)));
router.post("/email/domains/:id/check", settings, handle((req) => svc.checkDomain(tid(req), req.params.id)));
router.delete("/email/domains/:id", settings, handle((req) => svc.removeDomain(tid(req), req.params.id)));

// Campaigns
router.get("/email/campaigns", handle((req) => svc.listEmailCampaigns(tid(req))));
router.post("/email/campaigns", handle((req) => svc.createEmailCampaign(tid(req), uid(req), req.body ?? {})));
router.get("/email/campaigns/:id", handle((req) => svc.getEmailCampaign(tid(req), req.params.id)));
router.put("/email/campaigns/:id", handle((req) => svc.updateEmailCampaign(tid(req), req.params.id, req.body ?? {})));
router.delete("/email/campaigns/:id", handle((req) => svc.remove(tid(req), req.params.id)));
router.post("/email/campaigns/:id/duplicate", handle((req) => svc.duplicate(tid(req), uid(req), req.params.id)));
router.get("/email/campaigns/:id/readiness", handle((req) => svc.readiness(tid(req), req.params.id)));
router.get("/email/campaigns/:id/stats", handle((req) => svc.stats(tid(req), req.params.id)));
router.get("/email/campaigns/:id/deliveries", handle((req) => svc.deliveries(tid(req), req.params.id, req.query)));
router.post("/email/campaigns/:id/test", send, handle((req) => svc.sendTest(tid(req), uid(req), req.params.id, req.body ?? {})));
router.post("/email/campaigns/:id/schedule", send, handle((req) => svc.schedule(tid(req), req.params.id, req.body?.at)));
router.post("/email/campaigns/:id/unschedule", send, handle((req) => svc.unschedule(tid(req), req.params.id)));
router.post("/email/campaigns/:id/send", send, handle((req) => svc.start(tid(req), req.params.id)));
router.post("/email/campaigns/:id/pause", send, handle((req) => svc.pause(tid(req), req.params.id)));
router.post("/email/campaigns/:id/resume", send, handle((req) => svc.resume(tid(req), req.params.id)));
router.post("/email/campaigns/:id/cancel", send, handle((req) => svc.cancel(tid(req), req.params.id)));

// Consent + suppression
router.get("/consent/summary", handle((req) => foundation.consentSummary(tid(req))));
router.put("/consent/contacts/:id", consentWrite, handle((req) => foundation.setConsent(tid(req), req.params.id, { ...req.body, channel: "email", source: req.body?.source ?? "manual", actorId: uid(req) })));
router.post("/consent/import", consentWrite, handle((req) => foundation.importConsent(tid(req), { ...req.body, actorId: uid(req) })));
router.post("/consent/suppressions", consentWrite, handle((req) => foundation.suppress(tid(req), req.body?.email, "manual", req.body?.detail)));
router.delete("/consent/suppressions/:email", consentWrite, handle((req) => foundation.unsuppress(tid(req), req.params.email)));

// Audience rules + members
router.put("/audiences/:id/definition", consentWrite, handle((req) => audiences.setDefinition(tid(req), req.params.id, req.body ?? {})));
router.get("/audiences/:id/preview", handle((req) => audiences.preview(tid(req), req.params.id)));
router.post("/audiences/:id/members", consentWrite, handle((req) => audiences.addMembers(tid(req), req.params.id, req.body?.contactIds)));
router.delete("/audiences/:id/members/:contactId", consentWrite, handle((req) => audiences.removeMember(tid(req), req.params.id, req.params.contactId)));

export default router;
