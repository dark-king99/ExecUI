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
export const generateAi = (tenantId, body = {}) => {
  const { mode = "content", prompt = "" } = body;
  const topic = prompt.slice(0, 60) || "your campaign";

  const responses = {
    content: {
      title:   `Content Brief: ${topic}`,
      summary: `AI-generated content strategy focused on "${topic}". Targets mid-funnel engagement with value-driven messaging designed to convert informed prospects.`,
      copy:    `Unlock the power of [Your Product] — built for teams who demand results.\n\n✓ Increase efficiency by 40%\n✓ Cut manual work in half\n✓ Trusted by 500+ companies\n\nStart your free trial today. No credit card required.`,
      steps:   [
        "Define your primary audience persona and pain points",
        "Map content pieces to each funnel stage (TOFU / MOFU / BOFU)",
        "A/B test headline and CTA variations across 3 formats",
        "Measure engagement, scroll depth, and CTR after 72 hours",
        "Iterate copy based on click-through and conversion data",
      ],
    },
    campaign: {
      title:   `Campaign Plan: ${topic}`,
      summary: `Multi-channel campaign spanning email, social, and paid ads for "${topic}". Estimated 6-week runway with phased messaging.`,
      copy:    `Campaign Theme: "Results That Speak"\n\nPhase 1 — Awareness (Week 1–2): Broad reach via paid social and content syndication\nPhase 2 — Nurture (Week 3–4): Email drip + retargeting audiences\nPhase 3 — Convert (Week 5–6): High-intent ads + sales outreach`,
      steps:   [
        "Set SMART objectives: target MQLs, CPL, and revenue influenced",
        "Build segmented audience lists by persona and intent tier",
        "Create ad creative in 3 formats: story, feed, and banner",
        "Schedule 5-touch email drip sequence with dynamic personalisation",
        "Monitor ROAS and CAC weekly; pause spend below 2× ROAS threshold",
      ],
    },
    social: {
      title:   `Social Media Pack: ${topic}`,
      summary: `Ready-to-use social content for LinkedIn, Instagram, and X targeting "${topic}". Includes platform-native formats and optimal posting cadence.`,
      copy:    `🔷 LinkedIn: "Most teams spend 60% of their time on manual work. Ours doesn't. Here's what changed…"\n\n📸 Instagram (Carousel): "5 signs your CRM is holding you back"\n\n𝕏 Thread: "Hot take: more features ≠ better software. Simplicity wins every time. 🧵"\n\n🎥 Reel hook: "We 3× our pipeline without hiring a single new rep. Here's the playbook."`,
      steps:   [
        "Post LinkedIn thought leadership 3× per week (Tue / Thu / Sat)",
        "Run Instagram carousel series (5 sequential posts over 2 weeks)",
        "Schedule X threads for peak hours: 9 AM or 5 PM in target timezone",
        "Respond to all comments within 2 hours to boost algorithmic reach",
        "Boost top-performing organic posts with a $20–50/day paid budget",
      ],
    },
    ads: {
      title:   `Ad Copy Suite: ${topic}`,
      summary: `High-converting ad variations for Google, Meta, and LinkedIn campaigns targeting "${topic}". Optimised for CTR and conversion quality.`,
      copy:    `Google Headline A: "Stop Losing Deals — Try [Product] Free"\nGoogle Headline B: "[Product]: The CRM That Actually Works"\nGoogle Description: "Close more, faster. Join 500+ revenue teams. Free 14-day trial."\n\nMeta Primary Text: "Your competitors close 2× more deals. Find out why →"\n\nLinkedIn Sponsored: "Join 500+ revenue teams who chose [Product] over the rest. See ROI in 30 days."`,
      steps:   [
        "Run creative A/B test (2 headlines + 2 images) for minimum 7 days",
        "Target: job title + company size + intent signals (e.g. G2 visitors)",
        "Set bid strategy to Maximize Conversions with a target CPA cap",
        "Install conversion pixel and verify event firing before launch",
        "Pause ads at 3× target CPA; scale winners at 20% budget increments",
      ],
    },
  };

  return Promise.resolve(responses[mode] ?? responses.content);
};
