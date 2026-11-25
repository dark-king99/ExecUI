import * as svc from "./services.service.js";

const handle = (fn) => async (req, res) => {
  try {
    const result = await fn(req);
    if (result === undefined) return res.status(204).end();
    res.json(result);
  } catch (err) {
    console.error("[services]", err.message);
    res.status(err.status ?? 500).json({ message: err.message });
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


// ── Strategic ─────────────────────────────────────────────────────────────────
export const listGoals  = handle((req) => svc.listGoals(tid(req)));
export const createGoal = handle((req) => svc.createGoal(tid(req), req.body));
export const updateGoal = handle((req) => svc.updateGoal(tid(req), req.params.id, req.body));
export const deleteGoal = handle(async (req) => { await svc.deleteGoal(tid(req), req.params.id); });

export const listMarketAnalysis   = handle((req) => svc.listMarketAnalysis(tid(req)));
export const createMarketAnalysis = handle((req) => svc.createMarketAnalysis(tid(req), req.body));
export const deleteMarketAnalysis = handle(async (req) => { await svc.deleteMarketAnalysis(tid(req), req.params.id); });

// ── Team ──────────────────────────────────────────────────────────────────────
export const listMembers  = handle((req) => svc.listMembers(tid(req)));

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
export const generateSOP = handle((req) => svc.generateSOP(tid(req), req.body));
