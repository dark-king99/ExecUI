// Services module – in-memory stub store per-request (replace with DB queries as needed).
// All responses are tenant-scoped via authenticate middleware (req.user.tenantId).

import { randomUUID } from 'crypto';

// ── Simple in-memory stores (per process; replace with Prisma calls) ──────────
const stores = {
  transactions:    {},
  taxPlans:        {},
  investments:     {},
  sops:            {},
  workflows:       {},
  goals:           {},
  marketAnalysis:  {},
  campaigns:       {},
  clients:         {},
  members:         {},
  projects:        {},
  tasks:           {},
};

function tid(req) { return req.user?.tenantId ?? 'default'; }

function getStore(name, tenantId) {
  if (!stores[name][tenantId]) stores[name][tenantId] = [];
  return stores[name][tenantId];
}

function listStore(name, tenantId) {
  return getStore(name, tenantId);
}

function createItem(name, tenantId, data) {
  const item = { id: randomUUID(), ...data, createdAt: new Date().toISOString() };
  getStore(name, tenantId).push(item);
  return item;
}

function updateItem(name, tenantId, id, data) {
  const store = getStore(name, tenantId);
  const idx = store.findIndex(i => i.id === id);
  if (idx === -1) return null;
  store[idx] = { ...store[idx], ...data, updatedAt: new Date().toISOString() };
  return store[idx];
}

function deleteItem(name, tenantId, id) {
  const store = getStore(name, tenantId);
  const idx = store.findIndex(i => i.id === id);
  if (idx === -1) return false;
  store.splice(idx, 1);
  return true;
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const getDashboardStats = (req, res) => {
  const t = tid(req);
  const txs    = listStore('transactions', t);
  const income = txs.filter(x => x.type === 'income').reduce((s, x) => s + (x.amount || 0), 0);
  const expenses = txs.filter(x => x.type === 'expense').reduce((s, x) => s + (x.amount || 0), 0);
  const projects = listStore('projects', t);
  const members  = listStore('members', t);
  const goals    = listStore('goals', t);
  const sops     = listStore('sops', t);
  const active   = projects.filter(p => p.status === 'in_progress');

  res.json({
    financial: {
      total_income:      income,
      total_expenses:    expenses,
      net_profit:        income - expenses,
      transaction_count: txs.length,
    },
    projects: {
      active:    active.length,
      completed: projects.filter(p => p.status === 'completed').length,
      total:     projects.length,
    },
    team:     { active_members: members.filter(m => m.status === 'active').length, total: members.length },
    clients:  { active: 0, total: 0, total_value: 0 },
    operations: { sops_count: sops.length },
    strategic:  {
      goals_count:  goals.length,
      avg_progress: goals.length
        ? Math.round(goals.reduce((s, g) => s + (g.progress || 0), 0) / goals.length)
        : 0,
    },
    recent_transactions: txs.slice(-5).reverse(),
    recent_projects:     active.slice(0, 4),
  });
};

// ── Financial ─────────────────────────────────────────────────────────────────
export const listTransactions   = (req, res) => res.json(listStore('transactions', tid(req)));
export const createTransaction  = (req, res) => res.status(201).json(createItem('transactions', tid(req), req.body));
export const deleteTransaction  = (req, res) => {
  const ok = deleteItem('transactions', tid(req), req.params.id);
  ok ? res.status(204).end() : res.status(404).json({ message: 'Not found' });
};

export const listTaxPlans  = (req, res) => res.json(listStore('taxPlans', tid(req)));
export const createTaxPlan = (req, res) => res.status(201).json(createItem('taxPlans', tid(req), req.body));
export const deleteTaxPlan = (req, res) => {
  const ok = deleteItem('taxPlans', tid(req), req.params.id);
  ok ? res.status(204).end() : res.status(404).json({ message: 'Not found' });
};

export const listInvestments  = (req, res) => res.json(listStore('investments', tid(req)));
export const createInvestment = (req, res) => res.status(201).json(createItem('investments', tid(req), req.body));
export const deleteInvestment = (req, res) => {
  const ok = deleteItem('investments', tid(req), req.params.id);
  ok ? res.status(204).end() : res.status(404).json({ message: 'Not found' });
};

// ── Operations ────────────────────────────────────────────────────────────────
export const listSOPs  = (req, res) => res.json(listStore('sops', tid(req)));
export const createSOP = (req, res) => res.status(201).json(createItem('sops', tid(req), req.body));
export const updateSOP = (req, res) => {
  const item = updateItem('sops', tid(req), req.params.id, req.body);
  item ? res.json(item) : res.status(404).json({ message: 'Not found' });
};
export const deleteSOP = (req, res) => {
  const ok = deleteItem('sops', tid(req), req.params.id);
  ok ? res.status(204).end() : res.status(404).json({ message: 'Not found' });
};

export const listWorkflows  = (req, res) => res.json(listStore('workflows', tid(req)));
export const createWorkflow = (req, res) => res.status(201).json(createItem('workflows', tid(req), req.body));
export const deleteWorkflow = (req, res) => {
  const ok = deleteItem('workflows', tid(req), req.params.id);
  ok ? res.status(204).end() : res.status(404).json({ message: 'Not found' });
};

// ── Strategic ─────────────────────────────────────────────────────────────────
export const listGoals  = (req, res) => res.json(listStore('goals', tid(req)));
export const createGoal = (req, res) => res.status(201).json(createItem('goals', tid(req), req.body));
export const updateGoal = (req, res) => {
  const item = updateItem('goals', tid(req), req.params.id, req.body);
  item ? res.json(item) : res.status(404).json({ message: 'Not found' });
};
export const deleteGoal = (req, res) => {
  const ok = deleteItem('goals', tid(req), req.params.id);
  ok ? res.status(204).end() : res.status(404).json({ message: 'Not found' });
};

export const listMarketAnalysis  = (req, res) => res.json(listStore('marketAnalysis', tid(req)));
export const createMarketAnalysis = (req, res) => res.status(201).json(createItem('marketAnalysis', tid(req), req.body));
export const deleteMarketAnalysis = (req, res) => {
  const ok = deleteItem('marketAnalysis', tid(req), req.params.id);
  ok ? res.status(204).end() : res.status(404).json({ message: 'Not found' });
};

// ── Marketing / Sales ─────────────────────────────────────────────────────────
export const listCampaigns  = (req, res) => res.json(listStore('campaigns', tid(req)));
export const createCampaign = (req, res) => res.status(201).json(createItem('campaigns', tid(req), req.body));
export const updateCampaign = (req, res) => {
  const item = updateItem('campaigns', tid(req), req.params.id, req.body);
  item ? res.json(item) : res.status(404).json({ message: 'Not found' });
};
export const deleteCampaign = (req, res) => {
  const ok = deleteItem('campaigns', tid(req), req.params.id);
  ok ? res.status(204).end() : res.status(404).json({ message: 'Not found' });
};

export const listClients  = (req, res) => res.json(listStore('clients', tid(req)));
export const createClient = (req, res) => res.status(201).json(createItem('clients', tid(req), req.body));
export const updateClient = (req, res) => {
  const item = updateItem('clients', tid(req), req.params.id, req.body);
  item ? res.json(item) : res.status(404).json({ message: 'Not found' });
};
export const deleteClient = (req, res) => {
  const ok = deleteItem('clients', tid(req), req.params.id);
  ok ? res.status(204).end() : res.status(404).json({ message: 'Not found' });
};

// ── Team ──────────────────────────────────────────────────────────────────────
export const listMembers  = (req, res) => res.json(listStore('members', tid(req)));
export const createMember = (req, res) => res.status(201).json(createItem('members', tid(req), req.body));
export const updateMember = (req, res) => {
  const item = updateItem('members', tid(req), req.params.id, req.body);
  item ? res.json(item) : res.status(404).json({ message: 'Not found' });
};
export const deleteMember = (req, res) => {
  const ok = deleteItem('members', tid(req), req.params.id);
  ok ? res.status(204).end() : res.status(404).json({ message: 'Not found' });
};

export const listProjects  = (req, res) => res.json(listStore('projects', tid(req)));
export const createProject = (req, res) => res.status(201).json(createItem('projects', tid(req), req.body));
export const updateProject = (req, res) => {
  const item = updateItem('projects', tid(req), req.params.id, req.body);
  item ? res.json(item) : res.status(404).json({ message: 'Not found' });
};
export const deleteProject = (req, res) => {
  const ok = deleteItem('projects', tid(req), req.params.id);
  ok ? res.status(204).end() : res.status(404).json({ message: 'Not found' });
};

export const listTasks  = (req, res) => res.json(listStore('tasks', tid(req)));
export const createTask = (req, res) => res.status(201).json(createItem('tasks', tid(req), req.body));
export const updateTask = (req, res) => {
  const item = updateItem('tasks', tid(req), req.params.id, req.body);
  item ? res.json(item) : res.status(404).json({ message: 'Not found' });
};
export const deleteTask = (req, res) => {
  const ok = deleteItem('tasks', tid(req), req.params.id);
  ok ? res.status(204).end() : res.status(404).json({ message: 'Not found' });
};

// ── AI ────────────────────────────────────────────────────────────────────────
export const aiInsights = (req, res) => {
  const { module: mod } = req.body;
  res.json({
    insights: [
      `Your ${mod || 'business'} metrics are trending positively.`,
      'Consider reviewing your top performing areas for scaling opportunities.',
      'Data suggests focusing on efficiency improvements this quarter.',
    ],
    recommendations: [
      'Analyze current performance benchmarks',
      'Identify top growth levers',
      'Set measurable targets for next period',
    ],
  });
};

export const generateSOP = (req, res) => {
  const { title, department } = req.body;
  res.json({
    content: `# Standard Operating Procedure: ${title || 'New SOP'}\n\n**Department:** ${department || 'General'}\n\n## Purpose\nThis SOP outlines the steps required to complete the ${title || 'process'} effectively.\n\n## Scope\nApplicable to all team members in the ${department || 'relevant'} department.\n\n## Procedure\n1. Preparation\n2. Execution\n3. Review\n4. Documentation\n\n## Review Schedule\nThis SOP should be reviewed quarterly.`,
  });
};
