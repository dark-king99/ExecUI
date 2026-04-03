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

export const aiChat     = stubObj({ reply: "" });
export const aiSummaries= stubObj({ summary: "" });
export const aiAction   = stubObj({ result: "" });

export const listAccounts       = stub;
export const getAccount         = stubObj({});
export const getAccountDeals    = stub;
export const getAccountTimeline = stub;
export const addAccountNote     = stubObj({});

export const listResolutions    = stub;
export const voteResolution     = stubObj({});

export const getCrmAnalyticsSummary = stubObj({ deals: 0, revenue: 0, winRate: 0, avgCycle: 0 });
export const getCrmAnalyticsFunnel  = stub;
export const getCrmAnalyticsVelocity= stubObj({});
export const getCrmAnalyticsWinLoss = stubObj({});

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
