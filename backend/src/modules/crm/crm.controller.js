import * as svc from "./crm.service.js";
import * as dash from "./crm.dashboard.service.js";

const tid  = (req) => req.user.tenantId;
const uid  = (req) => req.user.userId;

const handle = (fn) => async (req, res) => {
  try {
    res.json(await fn(req, res));
  } catch (err) {
    res.status(err.status ?? 500).json({ message: err.message });
  }
};

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const getDashboardProfile  = handle((req) => dash.getDashboardProfile(uid(req), tid(req)));
export const getDashboardOverview = handle((req) => dash.getDashboardOverview(uid(req), tid(req)));

// Dashboard Tasks (separate from generic CRM tasks)
export const listDashboardTasks   = handle((req) => dash.listDashboardTasks(uid(req), tid(req), req.query));
export const createDashboardTask  = handle((req) => dash.createDashboardTask(uid(req), tid(req), req.body));
export const updateDashboardTask  = handle((req) => dash.updateDashboardTask(tid(req), req.params.id, req.body));

// Dashboard Tickets
export const listDashboardTickets  = handle((req) => dash.listDashboardTickets(tid(req), req.query));
export const createDashboardTicket = handle((req) => dash.createDashboardTicket(tid(req), req.body));
export const updateDashboardTicket = handle((req) => dash.updateDashboardTicket(tid(req), req.params.id, req.body));

// Dashboard Follow-ups
export const listDashboardFollowUps  = handle((req) => dash.listDashboardFollowUps(uid(req), tid(req), req.query));
export const createDashboardFollowUp = handle((req) => dash.createDashboardFollowUp(uid(req), tid(req), req.body));

// Dashboard Opportunities
export const listDashboardOpportunities  = handle((req) => dash.listDashboardOpportunities(tid(req), req.query));
export const createDashboardOpportunity  = handle((req) => dash.createDashboardOpportunity(uid(req), tid(req), req.body));
export const updateDashboardOpportunity  = handle((req) => dash.updateDashboardOpportunity(tid(req), req.params.id, req.body));

// Service Usage
export const listRecentServices = handle((req) => dash.listRecentServices(uid(req), tid(req), Number(req.query.limit) || 4));
export const trackService       = handle((req) => dash.trackService(uid(req), tid(req), req.body));

// Customers
export const listCustomers   = handle((req) => svc.listCustomers(tid(req), req.query));
export const getCustomer     = handle((req) => svc.getCustomer(tid(req), req.params.id));
export const createCustomer  = handle((req) => svc.createCustomer(tid(req), req.body));
export const updateCustomer  = handle((req) => svc.updateCustomer(tid(req), req.params.id, req.body));
export const deleteCustomer  = handle(async (req, res) => { await svc.deleteCustomer(tid(req), req.params.id); res.status(204).end(); });

// Deals
export const listDeals       = handle((req) => svc.listDeals(tid(req), req.query));
export const getDeal         = handle((req) => svc.getDeal(tid(req), req.params.id));
export const createDeal      = handle((req) => svc.createDeal(tid(req), { ...req.body, ownerId: req.body.ownerId ?? req.user.userId }));
export const updateDeal      = handle((req) => svc.updateDeal(tid(req), req.params.id, req.body));
export const getDealTimeline = handle((req) => svc.getDealTimeline(tid(req), req.params.id));
export const getDealTasks    = handle((req) => svc.getDealTasks(tid(req), req.params.id));
export const createDealTask  = handle((req) => svc.createDealTask(tid(req), req.params.id, req.body, uid(req)));
export const updateDealTask  = handle((req) => svc.updateDealTask(tid(req), req.params.dealId, req.params.taskId, req.body));
export const getDealAudit    = handle((req) => svc.getDealAudit(tid(req), req.params.id));

// Leads
export const listLeads       = handle((req) => svc.listLeads(tid(req), req.query));
export const getLead         = handle((req) => svc.getLead(tid(req), req.params.id));
export const createLead      = handle((req) => svc.createLead(tid(req), { ...req.body, ownerId: req.body.ownerId ?? req.user.userId }));
export const updateLead      = handle((req) => svc.updateLead(tid(req), req.params.id, req.body));
export const getLeadActivity = handle((req) => svc.getLeadActivity(tid(req), req.query));

// Tasks
export const listTasks       = handle((req) => svc.listTasks(tid(req), req.query));
export const createTask      = handle((req) => svc.createTask(tid(req), req.body, uid(req)));
export const updateTask      = handle((req) => svc.updateTask(tid(req), req.params.id, req.body));
export const completeTask    = handle((req) => svc.completeTask(tid(req), req.params.id));

// Sequences
export const listSequences   = handle((req) => svc.listSequences(tid(req)));
export const createSequence  = handle((req) => svc.createSequence(tid(req), req.body));

// Forecast
export const getForecastSummary    = handle((req) => svc.getForecastSummary(tid(req)));
export const getForecastByRep      = handle((req) => svc.getForecastByRep(tid(req)));
export const getForecastCategories = handle((req) => svc.getForecastCategories(tid(req)));

// Pipeline
export const getPipelineSummary = handle((req) => svc.getPipelineSummary(tid(req), req.query));
export const getPipelineOwners  = handle((req) => svc.getPipelineOwners(tid(req)));

// AI
export const aiChat      = handle((req) => svc.aiChat(tid(req), req.body));
export const aiSummaries = handle((req) => svc.aiSummaries(tid(req), req.body));
export const aiAction    = handle((req) => svc.aiAction(tid(req), req.body));

// Accounts
export const listAccounts       = handle((req) => svc.listAccounts(tid(req), req.query));
export const getAccount         = handle((req) => svc.getAccount(tid(req), req.params.id));
export const getAccountDeals    = handle((req) => svc.getAccountDeals(tid(req), req.params.id));
export const getAccountTimeline = handle((req) => svc.getAccountTimeline(tid(req), req.params.id));
export const addAccountNote     = handle((req) => svc.addAccountNote(tid(req), req.params.id, req.body));

// Resolutions
export const listResolutions = handle((req) => svc.listResolutions(tid(req)));
export const voteResolution  = handle((req) => svc.voteResolution(tid(req), req.params.id, req.body));

// CRM Analytics
export const getCrmAnalyticsSummary  = handle((req) => svc.getCrmAnalyticsSummary(tid(req)));
export const getCrmAnalyticsFunnel   = handle((req) => svc.getCrmAnalyticsFunnel(tid(req)));
export const getCrmAnalyticsVelocity = handle((req) => svc.getCrmAnalyticsVelocity(tid(req)));
export const getCrmAnalyticsWinLoss  = handle((req) => svc.getCrmAnalyticsWinLoss(tid(req)));

// Opportunities
export const getOpportunitiesSummary = handle((req) => svc.getOpportunitiesSummary(tid(req)));
export const listOpportunities       = handle((req) => svc.listOpportunities(tid(req), req.query));
export const createOpportunity       = handle((req) => svc.createOpportunity(tid(req), { ...req.body, ownerId: req.body.ownerId ?? req.user.userId }));

// Renewals
export const listRenewals       = handle((req) => svc.listRenewals(tid(req), req.query));
export const getRenewalsSummary = handle((req) => svc.getRenewalsSummary(tid(req)));

// Cases
export const listCases   = handle((req) => svc.listCases(tid(req), req.query));
export const getCase     = handle((req) => svc.getCase(tid(req), req.params.id));
export const updateCase  = handle((req) => svc.updateCase(tid(req), req.params.id, req.body));
export const addCaseNote = handle((req) => svc.addCaseNote(tid(req), req.params.id, req.body));
export const approveCase = handle((req) => svc.approveCase(tid(req), req.params.id));
export const lockCase    = handle((req) => svc.lockCase(tid(req), req.params.id));
export const unlockCase  = handle((req) => svc.unlockCase(tid(req), req.params.id));

// Playbooks
export const listPlaybooks   = handle((req) => svc.listPlaybooks(tid(req)));
export const getPlaybook     = handle((req) => svc.getPlaybook(tid(req), req.params.id));
export const runPlaybook     = handle((req) => svc.runPlaybook(tid(req), req.params.id));
export const createPlaybook  = handle((req) => svc.createPlaybook(tid(req), req.body));

// Partners
export const listPartners = handle((req) => svc.listPartners(tid(req)));
export const getPartner   = handle((req) => svc.getPartner(tid(req), req.params.id));

// Meetings
export const listMeetings  = handle((req) => svc.listMeetings(tid(req), req.query));
export const createMeeting = handle((req) => svc.createMeeting(tid(req), req.body));

// Reps
export const listReps       = handle((req) => svc.listReps(tid(req), req.query));
export const getRepsSummary = handle((req) => svc.getRepsSummary(tid(req)));

// Integrations
export const listIntegrations        = handle((req) => svc.listIntegrations(tid(req)));
export const getIntegrationsTimeline = handle((req) => svc.getIntegrationsTimeline(tid(req), req.query));
export const getLeadSources          = handle((req) => svc.getLeadSources(tid(req)));
export const getSyncHealth           = handle((req) => svc.getSyncHealth(tid(req)));
export const syncIntegrations        = handle((req) => svc.syncIntegrations(tid(req)));

// Database
export const getDatabaseRecords = handle((req) => svc.getDatabaseRecords(tid(req), req.query));
export const getDatabaseUsage   = handle((req) => svc.getDatabaseUsage(tid(req)));
export const getDatabaseAudit   = handle((req) => svc.getDatabaseAudit(tid(req), req.query));

// Teams
export const listTeams  = handle((req) => svc.listTeams(tid(req)));
export const createTeam = handle((req) => svc.createTeam(tid(req), req.body));
