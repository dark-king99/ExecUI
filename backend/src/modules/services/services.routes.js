import express from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import * as c from './services.controller.js';

const router = express.Router();
const auth = authenticate;

// Dashboard
router.get('/dashboard/stats', auth, c.getDashboardStats);

// Financial
router.get('/financial/transactions',        auth, c.listTransactions);
router.post('/financial/transactions',       auth, c.createTransaction);
router.delete('/financial/transactions/:id', auth, c.deleteTransaction);

router.get('/financial/tax-plans',        auth, c.listTaxPlans);
router.post('/financial/tax-plans',       auth, c.createTaxPlan);
router.delete('/financial/tax-plans/:id', auth, c.deleteTaxPlan);

router.get('/financial/investments',        auth, c.listInvestments);
router.post('/financial/investments',       auth, c.createInvestment);
router.delete('/financial/investments/:id', auth, c.deleteInvestment);

// Operations
router.get('/operations/sops',        auth, c.listSOPs);
router.post('/operations/sops',       auth, c.createSOP);
router.put('/operations/sops/:id',    auth, c.updateSOP);
router.delete('/operations/sops/:id', auth, c.deleteSOP);

router.get('/operations/workflows',        auth, c.listWorkflows);
router.post('/operations/workflows',       auth, c.createWorkflow);
router.delete('/operations/workflows/:id', auth, c.deleteWorkflow);

// Strategic
router.get('/strategic/goals',        auth, c.listGoals);
router.post('/strategic/goals',       auth, c.createGoal);
router.put('/strategic/goals/:id',    auth, c.updateGoal);
router.delete('/strategic/goals/:id', auth, c.deleteGoal);

router.get('/strategic/market-analysis',        auth, c.listMarketAnalysis);
router.post('/strategic/market-analysis',       auth, c.createMarketAnalysis);
router.delete('/strategic/market-analysis/:id', auth, c.deleteMarketAnalysis);

// Marketing / Sales
router.get('/marketing/campaigns',        auth, c.listCampaigns);
router.post('/marketing/campaigns',       auth, c.createCampaign);
router.put('/marketing/campaigns/:id',    auth, c.updateCampaign);
router.delete('/marketing/campaigns/:id', auth, c.deleteCampaign);

router.get('/marketing/clients',        auth, c.listClients);
router.post('/marketing/clients',       auth, c.createClient);
router.put('/marketing/clients/:id',    auth, c.updateClient);
router.delete('/marketing/clients/:id', auth, c.deleteClient);

// Team
router.get('/team/members',        auth, c.listMembers);
router.post('/team/members',       auth, c.createMember);
router.put('/team/members/:id',    auth, c.updateMember);
router.delete('/team/members/:id', auth, c.deleteMember);

router.get('/team/projects',        auth, c.listProjects);
router.post('/team/projects',       auth, c.createProject);
router.put('/team/projects/:id',    auth, c.updateProject);
router.delete('/team/projects/:id', auth, c.deleteProject);

router.get('/team/tasks',        auth, c.listTasks);
router.post('/team/tasks',       auth, c.createTask);
router.put('/team/tasks/:id',    auth, c.updateTask);
router.delete('/team/tasks/:id', auth, c.deleteTask);

// AI
router.post('/ai/insights',     auth, c.aiInsights);
router.post('/ai/generate-sop', auth, c.generateSOP);

export default router;
