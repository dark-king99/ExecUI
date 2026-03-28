// All marketing services return tenant-scoped data.
// Resources not yet in the database return safe empty/zero shapes
// so the frontend renders empty states instead of crashing.

const stub    = () => Promise.resolve([]);
const stubObj = (shape = {}) => () => Promise.resolve(shape);

// ── Campaigns ─────────────────────────────────────────────────────────────
export const listCampaigns    = stub;
export const getCampaign      = stubObj({});
export const createCampaign   = stubObj({});
export const updateCampaign   = stubObj({});
export const startCampaign    = stubObj({ started: true });
export const pauseCampaign    = stubObj({ paused: true });
export const getCampaignSummary = stubObj({
  total: 0, active: 0, paused: 0, completed: 0,
  activeJourneys: 0, liveContacts: 0, totalRevenue: 0, totalSpend: 0,
});

// ── Attribution ───────────────────────────────────────────────────────────
export const getAttributionChannels = stub;
export const getAttributionSummary  = stubObj({ totalRevenue: 0, totalSpend: 0, roas: 0 });
export const getAttributionModels   = stub;
export const getAttributionLtvCac   = stub;

// ── Audiences ─────────────────────────────────────────────────────────────
export const listAudiences          = stub;
export const getAudience            = stubObj({});
export const createAudience         = stubObj({});
export const activateAudience       = stubObj({ activated: true });
export const createLookalikeAudience= stubObj({});
export const getAudienceOverlap     = stubObj({ overlap: 0 });

// ── Analytics ─────────────────────────────────────────────────────────────
export const getMarketingAnalyticsSummary = stubObj({
  totalRevenue: 0, totalSpend: 0, roas: 0, totalConversions: 0,
  activeJourneys: 0, liveContacts: 0,
});
export const getMarketingAnalyticsTrend   = stub;
export const getMarketingChannelPerf      = stub;

// ── Experiments ───────────────────────────────────────────────────────────
export const listExperiments   = stub;
export const getExperiment     = stubObj({});
export const createExperiment  = stubObj({});
export const startExperiment   = stubObj({ started: true });
export const pauseExperiment   = stubObj({ paused: true });

// ── Profiles ──────────────────────────────────────────────────────────────
export const searchProfiles = stub;
export const getProfile     = stubObj({});

// ── Teams ─────────────────────────────────────────────────────────────────
export const listTeamMembers  = stub;
export const listTeamTasks    = stub;
export const getTeamMetrics   = stubObj({ tasksCompleted: 0, activeCampaigns: 0, teamSize: 0 });
export const inviteTeamMember = stubObj({ invited: true });
export const createTeamTask   = stubObj({});

// ── B2B ───────────────────────────────────────────────────────────────────
export const listB2BAccounts    = stub;
export const getB2BAccount      = stubObj({});
export const listB2BJourneys    = stub;
export const getB2BJourney      = stubObj({});
export const createB2BJourney   = stubObj({});

// ── Content assets ────────────────────────────────────────────────────────
export const listContentAssets  = stub;
export const getContentAsset    = stubObj({});
export const uploadContentAsset = stubObj({});
export const deleteContentAsset = stubObj({ deleted: true });

// ── Commerce ──────────────────────────────────────────────────────────────
export const listOrders = stub;
export const getCommerceMetrics = stubObj({
  totalRevenue: 0, totalOrders: 0, avgOrderValue: 0, channelMatrix: [],
});

// ── Personalization ───────────────────────────────────────────────────────
export const listPersonalization = stub;
export const getPersonalizationMetrics = stubObj({
  active: 0, variants: 0, impressions: 0, lift: 0, estimatedReach: 0,
  topLifecycleStage: "", lastVisitWindow: "", topIndustry: "",
});
export const createPersonalization = stubObj({});

// ── CDP ───────────────────────────────────────────────────────────────────
export const getCdpMetrics = stubObj({
  totalProfiles: 0, activeSources: 0, resolvedIdentities: 0,
  totalEvents: 0, activeModels: 0, activeSegments: 0,
  audience: 0, audienceDelta: 0, confidence: 0, latency: 0,
  projectedLift: 0, sqlPreview: "", predictiveLayer: {},
});
export const getCdpSources    = stub;
export const createCdpSource  = stubObj({});
export const createCdpSegment = stubObj({});

// ── Flows ─────────────────────────────────────────────────────────────────
export const listFlows   = stub;
export const getFlow     = stubObj({});
export const getFlowStats= stubObj({ entered: 0, converted: 0, active: 0, dropped: 0 });
export const createFlow  = stubObj({});
export const updateFlow  = stubObj({});

// ── AI ────────────────────────────────────────────────────────────────────
export const generateAi  = stubObj({ result: "" });
