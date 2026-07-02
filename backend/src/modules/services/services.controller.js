import * as svc from "./services.service.js";

const handle = (fn) => async (req, res) => {
  try {
    const result = await fn(req);
    if (result === undefined) return res.status(204).end();
    res.json(result);
  } catch (err) {
    console.error("[services]", err.message);
    res.status(500).json({ message: err.message });
  }
};

const tid = (req) => req.user.tenantId;

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const getDashboardStats = handle((req) => svc.getDashboardStats(tid(req)));

// ── Financial ─────────────────────────────────────────────────────────────────
export const listTransactions  = handle((req) => svc.listTransactions(tid(req)));
export const createTransaction = handle(async (req) => { const r = await svc.createTransaction(tid(req), req.body); return r; });
export const deleteTransaction = handle(async (req) => { await svc.deleteTransaction(tid(req), req.params.id); });

export const listTaxPlans  = handle((req) => svc.listTaxPlans(tid(req)));
export const createTaxPlan = handle((req) => svc.createTaxPlan(tid(req), req.body));
export const deleteTaxPlan = handle(async (req) => { await svc.deleteTaxPlan(tid(req), req.params.id); });

export const listInvestments  = handle((req) => svc.listInvestments(tid(req)));
export const createInvestment = handle((req) => svc.createInvestment(tid(req), req.body));
export const deleteInvestment = handle(async (req) => { await svc.deleteInvestment(tid(req), req.params.id); });

// ── Operations ────────────────────────────────────────────────────────────────
export const listSOPs  = handle((req) => svc.listSOPs(tid(req)));
export const createSOP = handle((req) => svc.createSOP(tid(req), req.body));
export const updateSOP = handle((req) => svc.updateSOP(tid(req), req.params.id, req.body));
export const deleteSOP = handle(async (req) => { await svc.deleteSOP(tid(req), req.params.id); });

export const listWorkflows  = handle((req) => svc.listWorkflows(tid(req)));
export const createWorkflow = handle((req) => svc.createWorkflow(tid(req), req.body));
export const deleteWorkflow = handle(async (req) => { await svc.deleteWorkflow(tid(req), req.params.id); });

// ── Strategic ─────────────────────────────────────────────────────────────────
export const listGoals  = handle((req) => svc.listGoals(tid(req)));
export const createGoal = handle((req) => svc.createGoal(tid(req), req.body));
export const updateGoal = handle((req) => svc.updateGoal(tid(req), req.params.id, req.body));
export const deleteGoal = handle(async (req) => { await svc.deleteGoal(tid(req), req.params.id); });

export const listMarketAnalysis   = handle((req) => svc.listMarketAnalysis(tid(req)));
export const createMarketAnalysis = handle((req) => svc.createMarketAnalysis(tid(req), req.body));
export const deleteMarketAnalysis = handle(async (req) => { await svc.deleteMarketAnalysis(tid(req), req.params.id); });

// ── Marketing / Sales ─────────────────────────────────────────────────────────
export const listCampaigns  = handle((req) => svc.listCampaigns(tid(req)));
export const createCampaign = handle((req) => svc.createCampaign(tid(req), req.body));
export const updateCampaign = handle((req) => svc.updateCampaign(tid(req), req.params.id, req.body));
export const deleteCampaign = handle(async (req) => { await svc.deleteCampaign(tid(req), req.params.id); });

export const listClients  = handle((req) => svc.listClients(tid(req)));
export const createClient = handle((req) => svc.createClient(tid(req), req.body));
export const updateClient = handle((req) => svc.updateClient(tid(req), req.params.id, req.body));
export const deleteClient = handle(async (req) => { await svc.deleteClient(tid(req), req.params.id); });

// ── Team ──────────────────────────────────────────────────────────────────────
export const listMembers  = handle((req) => svc.listMembers(tid(req)));
export const createMember = handle((req) => svc.createMember(tid(req), req.body));
export const updateMember = handle((req) => svc.updateMember(tid(req), req.params.id, req.body));
export const deleteMember = handle(async (req) => { await svc.deleteMember(tid(req), req.params.id); });

export const listProjects  = handle((req) => svc.listProjects(tid(req)));
export const createProject = handle((req) => svc.createProject(tid(req), req.body));
export const updateProject = handle((req) => svc.updateProject(tid(req), req.params.id, req.body));
export const deleteProject = handle(async (req) => { await svc.deleteProject(tid(req), req.params.id); });

export const listTasks  = handle((req) => svc.listTasks(tid(req)));
export const createTask = handle((req) => svc.createTask(tid(req), req.body, req.user.userId));
export const updateTask = handle((req) => svc.updateTask(tid(req), req.params.id, req.body, req.user.userId));
export const deleteTask = handle(async (req) => { await svc.deleteTask(tid(req), req.params.id); });

// ── AI ────────────────────────────────────────────────────────────────────────
export const aiInsights  = handle((req) => svc.aiInsights(tid(req), req.body));
export const generateSOP = handle((req) => svc.generateSOP(req.body));
