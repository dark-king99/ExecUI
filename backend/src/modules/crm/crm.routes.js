import express from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import * as c from "./crm.controller.js";
import industryRouter from "./industries/industry.routes.js";

const router = express.Router();
const auth = authenticate; // shorthand

// ── Industry modules (additive layer — core CRM routes below are unchanged) ──
router.use("/industry", industryRouter);

// ── Dashboard ─────────────────────────────────────────────────────────────────
router.get("/dashboard/profile",             auth, c.getDashboardProfile);
router.get("/dashboard/overview",            auth, c.getDashboardOverview);

router.get("/dashboard/tasks",               auth, c.listDashboardTasks);
router.post("/dashboard/tasks",              auth, c.createDashboardTask);
router.patch("/dashboard/tasks/:id",         auth, c.updateDashboardTask);

router.get("/dashboard/tickets",             auth, c.listDashboardTickets);
router.post("/dashboard/tickets",            auth, c.createDashboardTicket);
router.patch("/dashboard/tickets/:id",       auth, c.updateDashboardTicket);

router.get("/dashboard/follow-ups",          auth, c.listDashboardFollowUps);
router.post("/dashboard/follow-ups",         auth, c.createDashboardFollowUp);

router.get("/dashboard/opportunities",       auth, c.listDashboardOpportunities);
router.post("/dashboard/opportunities",      auth, c.createDashboardOpportunity);
router.patch("/dashboard/opportunities/:id", auth, c.updateDashboardOpportunity);

router.get("/dashboard/services/recent",     auth, c.listRecentServices);
router.post("/dashboard/services/track",     auth, c.trackService);

// ── Customers ────────────────────────────────────────────────────────────
router.get("/customers",          auth, c.listCustomers);
router.get("/customers/:id",      auth, c.getCustomer);
router.post("/customers",         auth, c.createCustomer);
router.put("/customers/:id",      auth, c.updateCustomer);
router.delete("/customers/:id",   auth, c.deleteCustomer);

// ── Deals ─────────────────────────────────────────────────────────────────
router.get("/deals",                              auth, c.listDeals);
router.get("/deals/:id",                          auth, c.getDeal);
router.post("/deals",                             auth, c.createDeal);
router.put("/deals/:id",                          auth, c.updateDeal);
router.get("/deals/:id/timeline",                 auth, c.getDealTimeline);
router.get("/deals/:id/tasks",                    auth, c.getDealTasks);
router.post("/deals/:id/tasks",                   auth, c.createDealTask);
router.put("/deals/:dealId/tasks/:taskId",        auth, c.updateDealTask);
router.get("/deals/:id/audit",                    auth, c.getDealAudit);

// ── Leads ─────────────────────────────────────────────────────────────────
router.get("/leads/activity",   auth, c.getLeadActivity);
router.get("/leads",            auth, c.listLeads);
router.get("/leads/:id",        auth, c.getLead);
router.post("/leads",           auth, c.createLead);
router.put("/leads/:id",        auth, c.updateLead);
router.post("/leads/:id/convert", auth, c.convertLead);

// ── Tasks ─────────────────────────────────────────────────────────────────
router.get("/tasks",            auth, c.listTasks);
router.post("/tasks",           auth, c.createTask);
router.put("/tasks/:id",        auth, c.updateTask);
router.post("/tasks/:id/complete", auth, c.completeTask);

// ── Sequences ─────────────────────────────────────────────────────────────
router.get("/sequences",        auth, c.listSequences);
router.post("/sequences",       auth, c.createSequence);

// ── Forecast ──────────────────────────────────────────────────────────────
router.get("/forecast/summary",    auth, c.getForecastSummary);
router.get("/forecast/by-rep",     auth, c.getForecastByRep);
router.get("/forecast/categories", auth, c.getForecastCategories);

// ── Pipeline ──────────────────────────────────────────────────────────────
router.get("/pipeline/summary", auth, c.getPipelineSummary);
router.get("/pipeline/owners",  auth, c.getPipelineOwners);

// ── AI ────────────────────────────────────────────────────────────────────
router.post("/ai/chat",       auth, c.aiChat);
router.post("/ai/summaries",  auth, c.aiSummaries);
router.post("/ai/action",     auth, c.aiAction);

// ── Accounts ──────────────────────────────────────────────────────────────
router.get("/accounts",                auth, c.listAccounts);
router.get("/accounts/:id",            auth, c.getAccount);
router.get("/accounts/:id/deals",      auth, c.getAccountDeals);
router.get("/accounts/:id/timeline",   auth, c.getAccountTimeline);
router.post("/accounts/:id/notes",     auth, c.addAccountNote);

// ── Resolutions ───────────────────────────────────────────────────────────
router.get("/resolutions",              auth, c.listResolutions);
router.post("/resolutions/:id/vote",    auth, c.voteResolution);

// ── Analytics ─────────────────────────────────────────────────────────────
router.get("/analytics/summary",  auth, c.getCrmAnalyticsSummary);
router.get("/analytics/funnel",   auth, c.getCrmAnalyticsFunnel);
router.get("/analytics/velocity", auth, c.getCrmAnalyticsVelocity);
router.get("/analytics/win-loss", auth, c.getCrmAnalyticsWinLoss);

// ── Opportunities ─────────────────────────────────────────────────────────
router.get("/opportunities/summary", auth, c.getOpportunitiesSummary);
router.get("/opportunities",         auth, c.listOpportunities);
router.post("/opportunities",        auth, c.createOpportunity);

// ── Renewals ──────────────────────────────────────────────────────────────
router.get("/renewals/summary", auth, c.getRenewalsSummary);
router.get("/renewals",         auth, c.listRenewals);

// ── Cases ─────────────────────────────────────────────────────────────────
router.get("/cases",                auth, c.listCases);
router.get("/cases/:id",            auth, c.getCase);
router.put("/cases/:id",            auth, c.updateCase);
router.post("/cases/:id/notes",     auth, c.addCaseNote);
router.post("/cases/:id/approve",   auth, c.approveCase);
router.post("/cases/:id/lock",      auth, c.lockCase);
router.post("/cases/:id/unlock",    auth, c.unlockCase);

// ── Playbooks ─────────────────────────────────────────────────────────────
router.get("/playbooks",            auth, c.listPlaybooks);
router.get("/playbooks/:id",        auth, c.getPlaybook);
router.post("/playbooks/:id/run",   auth, c.runPlaybook);
router.post("/playbooks",           auth, c.createPlaybook);

// ── Partners ──────────────────────────────────────────────────────────────
router.get("/partners",      auth, c.listPartners);
router.get("/partners/:id",  auth, c.getPartner);

// ── Meetings ──────────────────────────────────────────────────────────────
router.get("/meetings",  auth, c.listMeetings);
router.post("/meetings", auth, c.createMeeting);

// ── Reps ──────────────────────────────────────────────────────────────────
router.get("/reps/summary", auth, c.getRepsSummary);
router.get("/reps",         auth, c.listReps);

// ── Integrations ──────────────────────────────────────────────────────────
router.get("/integrations",                auth, c.listIntegrations);
router.get("/integrations/timeline",       auth, c.getIntegrationsTimeline);
router.get("/integrations/lead-sources",   auth, c.getLeadSources);
router.get("/integrations/sync-health",    auth, c.getSyncHealth);
router.post("/integrations/sync",          auth, c.syncIntegrations);

// ── Database ──────────────────────────────────────────────────────────────
router.get("/database/records", auth, c.getDatabaseRecords);
router.get("/database/usage",   auth, c.getDatabaseUsage);
router.get("/database/audit",   auth, c.getDatabaseAudit);

// ── Teams ─────────────────────────────────────────────────────────────────
router.get("/teams",  auth, c.listTeams);
router.post("/teams", auth, c.createTeam);

export default router;
