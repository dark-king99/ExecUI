import * as svc  from "./marketing.service.js";
import * as dash from "./marketing.dashboard.service.js";

const tid = (req) => req.user.tenantId;
const uid = (req) => req.user.userId;

const handle = (fn) => async (req, res) => {
  try {
    res.json(await fn(req, res));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const getDashboardProfile  = handle((req) => dash.getDashboardProfile(uid(req), tid(req)));
export const getDashboardOverview = handle((req) => dash.getDashboardOverview(tid(req)));
export const getDashboardServiceStats = handle((req) => dash.getServiceStats(tid(req)));

// Todos
export const listDashboardTodos  = handle((req) => dash.listTodos(uid(req), tid(req)));
export const createDashboardTodo = handle((req) => dash.createTodo(uid(req), tid(req), req.body));
export const updateDashboardTodo = handle((req) => dash.updateTodo(req.params.id, tid(req), req.body));
export const deleteDashboardTodo = handle(async (req, res) => {
  await dash.deleteTodo(req.params.id, tid(req));
  res.status(204).end();
});

// Schedule
export const listDashboardSchedule      = handle((req) => dash.listScheduleEvents(uid(req), tid(req)));
export const createDashboardScheduleEvent = handle((req) => dash.createScheduleEvent(uid(req), tid(req), req.body));
export const deleteDashboardScheduleEvent = handle(async (req, res) => {
  await dash.deleteScheduleEvent(req.params.id, uid(req), tid(req));
  res.status(204).end();
});

// Activities
export const listDashboardActivities = handle((req) => dash.listActivities(uid(req), tid(req)));
export const logDashboardActivity    = handle((req) => dash.logActivity(uid(req), tid(req), req.body));

// Campaigns
export const listCampaigns     = handle((req) => svc.listCampaigns(tid(req), req.query));
export const getCampaign       = handle((req) => svc.getCampaign(tid(req), req.params.id));
export const createCampaign    = handle((req) => svc.createCampaign(tid(req), req.body));
export const updateCampaign    = handle((req) => svc.updateCampaign(tid(req), req.params.id, req.body));
export const startCampaign     = handle((req) => svc.startCampaign(tid(req), req.params.id));
export const pauseCampaign     = handle((req) => svc.pauseCampaign(tid(req), req.params.id));
export const getCampaignSummary= handle((req) => svc.getCampaignSummary(tid(req)));

// Attribution
export const getAttributionChannels = handle((req) => svc.getAttributionChannels(tid(req)));
export const getAttributionSummary  = handle((req) => svc.getAttributionSummary(tid(req)));
export const getAttributionModels   = handle((req) => svc.getAttributionModels(tid(req)));
export const getAttributionLtvCac   = handle((req) => svc.getAttributionLtvCac(tid(req)));

// Audiences
export const listAudiences           = handle((req) => svc.listAudiences(tid(req), req.query));
export const getAudience             = handle((req) => svc.getAudience(tid(req), req.params.id));
export const createAudience          = handle((req) => svc.createAudience(tid(req), req.body));
export const activateAudience        = handle((req) => svc.activateAudience(tid(req), req.params.id, req.body));
export const createLookalikeAudience = handle((req) => svc.createLookalikeAudience(tid(req), req.params.id));
export const getAudienceOverlap      = handle((req) => svc.getAudienceOverlap(tid(req), req.params.id));

// Analytics
export const getMarketingAnalyticsSummary = handle((req) => svc.getMarketingAnalyticsSummary(tid(req)));
export const getMarketingAnalyticsTrend   = handle((req) => svc.getMarketingAnalyticsTrend(tid(req), req.query));
export const getMarketingChannelPerf      = handle((req) => svc.getMarketingChannelPerf(tid(req)));

// Experiments
export const listExperiments  = handle((req) => svc.listExperiments(tid(req), req.query));
export const getExperiment    = handle((req) => svc.getExperiment(tid(req), req.params.id));
export const createExperiment = handle((req) => svc.createExperiment(tid(req), req.body));
export const startExperiment  = handle((req) => svc.startExperiment(tid(req), req.params.id));
export const pauseExperiment  = handle((req) => svc.pauseExperiment(tid(req), req.params.id));

// Profiles
export const searchProfiles = handle((req) => svc.searchProfiles(tid(req), req.query));
export const getProfile     = handle((req) => svc.getProfile(tid(req), req.params.id));

// Teams
export const listTeamMembers  = handle((req) => svc.listTeamMembers(tid(req)));
export const listTeamTasks    = handle((req) => svc.listTeamTasks(tid(req), req.query));
export const getTeamMetrics   = handle((req) => svc.getTeamMetrics(tid(req)));
export const inviteTeamMember = handle((req) => svc.inviteTeamMember(tid(req), req.body));
export const createTeamTask   = handle((req) => svc.createTeamTask(tid(req), req.body));

// B2B
export const listB2BAccounts  = handle((req) => svc.listB2BAccounts(tid(req), req.query));
export const getB2BAccount    = handle((req) => svc.getB2BAccount(tid(req), req.params.id));
export const listB2BJourneys  = handle((req) => svc.listB2BJourneys(tid(req)));
export const getB2BJourney    = handle((req) => svc.getB2BJourney(tid(req), req.params.id));
export const createB2BJourney = handle((req) => svc.createB2BJourney(tid(req), req.body));

// Content assets
export const listContentAssets  = handle((req) => svc.listContentAssets(tid(req), req.query));
export const getContentAsset    = handle((req) => svc.getContentAsset(tid(req), req.params.id));
export const uploadContentAsset = handle((req) => svc.uploadContentAsset(tid(req), req.body));
export const deleteContentAsset = handle(async (req, res) => {
  await svc.deleteContentAsset(tid(req), req.params.id);
  res.status(204).end();
});

// Commerce
export const listOrders         = handle((req) => svc.listOrders(tid(req), req.query));
export const getCommerceMetrics = handle((req) => svc.getCommerceMetrics(tid(req)));

// Personalization
export const listPersonalization       = handle((req) => svc.listPersonalization(tid(req)));
export const getPersonalizationMetrics = handle((req) => svc.getPersonalizationMetrics(tid(req)));
export const createPersonalization     = handle((req) => svc.createPersonalization(tid(req), req.body));

// CDP
export const getCdpMetrics    = handle((req) => svc.getCdpMetrics(tid(req)));
export const getCdpSources    = handle((req) => svc.getCdpSources(tid(req)));
export const createCdpSource  = handle((req) => svc.createCdpSource(tid(req), req.body));
export const createCdpSegment = handle((req) => svc.createCdpSegment(tid(req), req.body));

// Flows
export const listFlows    = handle((req) => svc.listFlows(tid(req)));
export const getFlow      = handle((req) => svc.getFlow(tid(req), req.params.id));
export const getFlowStats = handle((req) => svc.getFlowStats(tid(req), req.params.id));
export const createFlow   = handle((req) => svc.createFlow(tid(req), req.body));
export const updateFlow   = handle((req) => svc.updateFlow(tid(req), req.params.id, req.body));

// AI
export const generateAi = handle((req) => svc.generateAi(tid(req), req.body));
