import prisma from "../../config/database.js";

// ── Customers (backed by Contact model) ───────────────────────────────────
export const listCustomers = (tenantId, params = {}) =>
  prisma.contact.findMany({ where: { tenantId } });

export const getCustomer = (tenantId, id) =>
  prisma.contact.findFirst({ where: { id, tenantId } });

export const createCustomer = (tenantId, data) =>
  prisma.contact.create({
    data: {
      name: data.name,
      email: data.email,
      key: data.key || `contact-${Date.now()}-${Math.random().toString(36).slice(7)}`,
      tenantId,
    },
  });

export const updateCustomer = (tenantId, id, data) =>
  prisma.contact.update({ where: { id }, data: { name: data.name, email: data.email } });

export const deleteCustomer = (tenantId, id) =>
  prisma.contact.delete({ where: { id } });

// ── Stubs – return empty/zero shapes so the frontend renders empty states ──
const stub   = () => Promise.resolve([]);
const stubObj = (shape = {}) => () => Promise.resolve(shape);

export const listDeals          = stub;
export const getDeal            = stubObj({});
export const createDeal         = stubObj({});
export const updateDeal         = stubObj({});
export const getDealTimeline    = stub;
export const getDealTasks       = stub;
export const createDealTask     = stubObj({});
export const updateDealTask     = stubObj({});
export const getDealAudit       = stub;

export const listLeads          = stub;
export const getLead            = stubObj({});
export const createLead         = stubObj({});
export const updateLead         = stubObj({});
export const getLeadActivity    = stub;

export const listTasks          = stub;
export const createTask         = stubObj({});
export const updateTask         = stubObj({});
export const completeTask       = stubObj({ success: true });

export const listSequences      = stub;
export const createSequence     = stubObj({});

export const getForecastSummary  = stubObj({ target: 0, committed: 0, bestCase: 0, pipeline: 0 });
export const getForecastByRep    = stub;
export const getForecastCategories = stub;

export const getPipelineSummary  = stubObj({ stages: [] });
export const getPipelineOwners   = stub;

export const aiChat = (tenantId, body = {}) => {
  const msg = (body?.message ?? "").toLowerCase();

  let reply =
    "I'm your SmartCRM AI. I can help with pipeline analysis, customer risk, lead qualification, forecasting, deal strategy, task management, and general CRM best practices. What would you like to explore?";

  if (msg.includes("pipeline") || msg.includes("stage") || (msg.includes("deal") && !msg.includes("win") && !msg.includes("loss"))) {
    reply = "**Pipeline Health**\n\nYour pipeline spans 6 stages: Lead In → Qualified → Proposal → Negotiation → Commit → Closed Won.\n\nKey insight: deals stalling in Negotiation for more than 14 days have a 60% lower close rate. Address blockers early.\n\n**Recommended actions:**\n• Flag any Proposal-stage deal older than 7 days for immediate follow-up\n• Add a stale-deal automation trigger at 10 days of inactivity\n• Run a weekly pipeline review focused on deals in Negotiation and Commit";
  } else if (msg.includes("risk") || msg.includes("churn") || msg.includes("at risk") || msg.includes("health")) {
    reply = "**Customer Risk Assessment**\n\nCustomers are flagged **At Risk** when last contact exceeds 14 days — churn typically follows within 3–4 weeks of silent accounts.\n\n**How to reduce churn:**\n• Set automated re-engagement alerts at the 10-day mark\n• Assign a CSM to every account over $10K ARR\n• Cadence: weekly for Enterprise, bi-weekly for SMB\n• Track NPS quarterly — any score below 7 should trigger an escalation call";
  } else if (msg.includes("lead") || msg.includes("prospect") || msg.includes("qualify")) {
    reply = "**Lead Qualification (BANT Framework)**\n\n• **Budget** — Can they fund a purchase this quarter?\n• **Authority** — Are you engaging the economic buyer?\n• **Need** — Is there a clearly articulated business problem?\n• **Timeline** — Do they have urgency to act within 90 days?\n\nResponding to inbound leads within **5 minutes** yields a 21× higher qualification rate. Set up instant routing rules for all form fills and chat inquiries.";
  } else if (msg.includes("forecast") || msg.includes("revenue") || msg.includes("quota") || msg.includes("target")) {
    reply = "**Sales Forecasting**\n\nAccurate forecasting combines stage-weighted pipeline (probability × deal value) with rep-level commit signals.\n\n**Forecast categories:**\n• **Commit** — Rep is confident; expected to close this period\n• **Best Case** — Likely but not yet locked\n• **Pipeline** — In play, needs continued development\n\nForecast accuracy improves significantly when correlated with deal engagement signals: email opens, meeting frequency, multi-threading.";
  } else if (msg.includes("follow") || msg.includes("task") || msg.includes("next step") || msg.includes("cadence")) {
    reply = "**Follow-Up Cadence**\n\nOptimal B2B follow-up sequence:\n• **Day 1** — Meeting recap or initial outreach\n• **Day 3** — Value-add resource (case study, ROI calculator)\n• **Day 7** — Personalised check-in\n• **Day 14** — Final soft touch or schedule next meeting\n\nAutomate task creation after every logged meeting. Set a 24-hour SLA for responding to all open deals. Use sequences for repetitive touches and save rep time for high-value moments.";
  } else if (msg.includes("win") || msg.includes("loss") || msg.includes("won") || msg.includes("lost")) {
    reply = "**Win / Loss Analysis**\n\nTop reasons deals are lost:\n1. **Price** (32%) — Address with ROI calculators early\n2. **Timing** (24%) — Re-engage in 60–90 days with a nurture sequence\n3. **Competitor** (21%) — Build battlecards for top 3 objections\n4. **No Decision** (14%) — Strengthen the business case and executive sponsor\n5. **Missing Features** (9%) — Route to Product with context\n\nA win rate above 25% is healthy for outbound; above 40% for inbound-sourced pipeline.";
  } else if (msg.includes("customer") || msg.includes("account") || msg.includes("contact") || msg.includes("segment")) {
    reply = "**Account Health & Segmentation**\n\nHealthy accounts share three traits: regular engagement (touchpoints every ≤14 days), expanding usage or upsell interest, and multi-threading (3+ stakeholder relationships).\n\n**Engagement scoring:**\n• Last contact < 7 days: Healthy ✅\n• Last contact 7–14 days: Watch ⚠️\n• Last contact > 14 days: At Risk 🔴\n\nFor accounts over $50K ARR, assign a dedicated CSM and run Quarterly Business Reviews (QBRs).";
  } else if (msg.includes("best practice") || msg.includes("how to") || msg.includes("tip") || msg.includes("improve") || msg.includes("optimize")) {
    reply = "**CRM Best Practices**\n\n1. **Data hygiene** — Deduplicate contacts monthly, enforce required fields at entry\n2. **Activity logging** — Auto-log all calls, emails, and meetings via integrations\n3. **Stage discipline** — Define clear entry and exit criteria for every pipeline stage\n4. **Velocity tracking** — Measure days-in-stage, not just close date\n5. **Segmentation** — Slice pipeline by deal size, vertical, and source for clean forecasting\n6. **Automation** — Use sequences for repetitive touches; reserve reps for strategic conversations\n7. **Reporting cadence** — Daily pipeline hygiene, weekly forecast call, monthly win/loss review";
  } else if (msg.includes("summary") || msg.includes("overview") || msg.includes("what can") || msg.includes("help")) {
    reply = "**SmartCRM Capabilities**\n\nHere's what I can help you with:\n\n• **Pipeline** — Stage health, deal velocity, stale deal alerts\n• **Customers** — Risk scoring, engagement tracking, churn prevention\n• **Leads** — Qualification frameworks, routing, response SLAs\n• **Forecasting** — Commit vs best case, rep-level accuracy\n• **Tasks** — Follow-up cadences, automation, SLA tracking\n• **Win/Loss** — Loss reason analysis, competitive insights\n• **Best Practices** — Frameworks, playbooks, process optimisation\n\nAsk me anything — type a question or pick a topic from the sidebar.";
  } else if (msg.includes("crm") && (msg.includes("what is") || msg.includes("explain") || msg.includes("define"))) {
    reply = "**What is a CRM?**\n\nA CRM (Customer Relationship Management) system is the central platform for managing all interactions with current and potential customers.\n\n**Core functions:**\n• **Contact management** — Centralised customer database with full history\n• **Pipeline management** — Visual deal tracking from first touch to close\n• **Activity logging** — Emails, calls, meetings auto-synced\n• **Automation** — Sequences, task routing, alerts\n• **Analytics** — Win rates, velocity, forecast accuracy, rep performance\n\nA well-adopted CRM typically drives a 15–30% increase in sales productivity and significantly improves forecast accuracy.";
  }

  return Promise.resolve({ reply });
};

export const aiSummaries = stubObj({ summary: "" });
export const aiAction    = stubObj({ result: "" });

export const listAccounts       = stub;
export const getAccount         = stubObj({});
export const getAccountDeals    = stub;
export const getAccountTimeline = stub;
export const addAccountNote     = stubObj({});

export const listResolutions    = stub;
export const voteResolution     = stubObj({});

export const getCrmAnalyticsSummary  = stubObj({ pipelineVelocity: "—", conversionRate: "—", avgSalesCycle: "—", winRate: "—" });
export const getCrmAnalyticsFunnel   = stub;
export const getCrmAnalyticsVelocity = stub;
export const getCrmAnalyticsWinLoss  = stub;

export const getOpportunitiesSummary = stubObj({ total: 0, value: 0 });
export const listOpportunities       = stub;
export const createOpportunity       = stubObj({});

export const listRenewals       = stub;
export const getRenewalsSummary = stubObj({ total: 0, value: 0, atRisk: 0 });

export const listCases          = stub;
export const getCase            = stubObj({});
export const updateCase         = stubObj({});
export const addCaseNote        = stubObj({});
export const approveCase        = stubObj({ success: true });
export const lockCase           = stubObj({ success: true });
export const unlockCase         = stubObj({ success: true });

export const listPlaybooks      = stub;
export const getPlaybook        = stubObj({});
export const runPlaybook        = stubObj({ started: true });
export const createPlaybook     = stubObj({});

export const listPartners       = stub;
export const getPartner         = stubObj({});

export const listMeetings       = stub;
export const createMeeting      = stubObj({});

export const listReps           = stub;
export const getRepsSummary     = stubObj({ total: 0, quota: 0, attainment: 0 });

export const listIntegrations       = stub;
export const getIntegrationsTimeline= stub;
export const getLeadSources         = stub;
export const getSyncHealth          = stubObj({ status: "ok" });
export const syncIntegrations       = stubObj({ synced: true });

export const getDatabaseRecords = stub;
export const getDatabaseUsage   = stubObj({ records: 0, storage: "0 MB" });
export const getDatabaseAudit   = stub;

export const listTeams          = stub;
export const createTeam         = stubObj({});
