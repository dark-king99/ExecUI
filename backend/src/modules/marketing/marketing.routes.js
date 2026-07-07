import express from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import * as c from "./marketing.controller.js";

const router = express.Router();
const auth = authenticate;

// ── Dashboard ─────────────────────────────────────────────────────────────────
router.get("/dashboard/profile",           auth, c.getDashboardProfile);
router.get("/dashboard/overview",          auth, c.getDashboardOverview);
router.get("/dashboard/service-stats",     auth, c.getDashboardServiceStats);

router.get("/dashboard/todos",             auth, c.listDashboardTodos);
router.post("/dashboard/todos",            auth, c.createDashboardTodo);
router.patch("/dashboard/todos/:id",       auth, c.updateDashboardTodo);
router.delete("/dashboard/todos/:id",      auth, c.deleteDashboardTodo);

router.get("/dashboard/schedule",          auth, c.listDashboardSchedule);
router.post("/dashboard/schedule",         auth, c.createDashboardScheduleEvent);
router.delete("/dashboard/schedule/:id",   auth, c.deleteDashboardScheduleEvent);

router.get("/dashboard/activities",        auth, c.listDashboardActivities);
router.post("/dashboard/activities",       auth, c.logDashboardActivity);

// ── Campaigns ────────────────────────────────────────────────────────────
router.get("/campaigns/summary",        auth, c.getCampaignSummary);
router.get("/campaigns",                auth, c.listCampaigns);
router.get("/campaigns/:id",            auth, c.getCampaign);
router.post("/campaigns",               auth, c.createCampaign);
router.put("/campaigns/:id",            auth, c.updateCampaign);
router.post("/campaigns/:id/start",     auth, c.startCampaign);
router.post("/campaigns/:id/pause",     auth, c.pauseCampaign);

// ── Attribution ───────────────────────────────────────────────────────────
router.get("/attribution/channels",  auth, c.getAttributionChannels);
router.get("/attribution/summary",   auth, c.getAttributionSummary);
router.get("/attribution/models",    auth, c.getAttributionModels);
router.get("/attribution/ltv-cac",   auth, c.getAttributionLtvCac);

// ── Audiences ─────────────────────────────────────────────────────────────
router.get("/audiences",                    auth, c.listAudiences);
router.get("/audiences/:id",                auth, c.getAudience);
router.post("/audiences",                   auth, c.createAudience);
router.post("/audiences/:id/activate",      auth, c.activateAudience);
router.post("/audiences/:id/lookalike",     auth, c.createLookalikeAudience);
router.get("/audiences/:id/overlap",        auth, c.getAudienceOverlap);

// ── Analytics ─────────────────────────────────────────────────────────────
router.get("/analytics/summary",            auth, c.getMarketingAnalyticsSummary);
router.get("/analytics/trend",              auth, c.getMarketingAnalyticsTrend);
router.get("/analytics/channel-performance",auth, c.getMarketingChannelPerf);

// ── Experiments ───────────────────────────────────────────────────────────
router.get("/experiments",              auth, c.listExperiments);
router.get("/experiments/:id",          auth, c.getExperiment);
router.post("/experiments",             auth, c.createExperiment);
router.post("/experiments/:id/start",   auth, c.startExperiment);
router.post("/experiments/:id/pause",   auth, c.pauseExperiment);

// ── Profiles ──────────────────────────────────────────────────────────────
router.get("/profiles/search",  auth, c.searchProfiles);
router.get("/profiles/:id",     auth, c.getProfile);

// ── Teams ─────────────────────────────────────────────────────────────────
router.get("/teams/members",    auth, c.listTeamMembers);
router.get("/teams/tasks",      auth, c.listTeamTasks);
router.get("/teams/metrics",    auth, c.getTeamMetrics);
router.post("/teams/invite",    auth, c.inviteTeamMember);
router.post("/teams/tasks",     auth, c.createTeamTask);

// ── B2B ───────────────────────────────────────────────────────────────────
router.get("/b2b/accounts",           auth, c.listB2BAccounts);
router.get("/b2b/accounts/:id",       auth, c.getB2BAccount);
router.get("/b2b/journeys",           auth, c.listB2BJourneys);
router.get("/b2b/journeys/:id",       auth, c.getB2BJourney);
router.post("/b2b/journeys",          auth, c.createB2BJourney);

// ── Content assets ────────────────────────────────────────────────────────
router.get("/content/assets",         auth, c.listContentAssets);
router.get("/content/assets/:id",     auth, c.getContentAsset);
router.post("/content/assets",        auth, c.uploadContentAsset);
router.delete("/content/assets/:id",  auth, c.deleteContentAsset);

// ── Commerce ──────────────────────────────────────────────────────────────
router.get("/commerce/orders",   auth, c.listOrders);
router.get("/commerce/metrics",  auth, c.getCommerceMetrics);

// ── Personalization ───────────────────────────────────────────────────────
router.get("/personalization/metrics",  auth, c.getPersonalizationMetrics);
router.get("/personalization",          auth, c.listPersonalization);
router.post("/personalization",         auth, c.createPersonalization);

// ── CDP ───────────────────────────────────────────────────────────────────
router.get("/cdp/metrics",   auth, c.getCdpMetrics);
router.get("/cdp/sources",   auth, c.getCdpSources);
router.post("/cdp/sources",  auth, c.createCdpSource);
router.post("/cdp/segments", auth, c.createCdpSegment);

// ── Flows ─────────────────────────────────────────────────────────────────
router.get("/flows",              auth, c.listFlows);
router.get("/flows/:id/stats",    auth, c.getFlowStats);
router.get("/flows/:id",          auth, c.getFlow);
router.post("/flows",             auth, c.createFlow);
router.put("/flows/:id",          auth, c.updateFlow);

// ── AI ────────────────────────────────────────────────────────────────────
router.post("/ai/generate", auth, c.generateAi);

export default router;
