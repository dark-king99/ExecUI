/**
 * Mock data for all frontend API endpoints.
 * Used when VITE_USE_MOCK=true to enable fully offline UI testing
 * without touching the backend.
 */

// ── Shared helpers ─────────────────────────────────────────────────────────────
const today = new Date();
const daysAgo = (n) => new Date(today - n * 86400000).toISOString();
const daysAhead = (n) => new Date(today.getTime() + n * 86400000).toISOString();

// ── Auth ───────────────────────────────────────────────────────────────────────
export const mockAuth = {
  login: {
    token: 'mock-jwt-token-for-testing-only',
    user: {
      id: 'usr_001',
      name: 'Alex Morgan',
      email: 'alex.morgan@execui.dev',
      role: 'enterprise_admin',
      tenant: 'client',
      avatar_url: null,
    },
  },
  me: {
    id: 'usr_001',
    name: 'Alex Morgan',
    email: 'alex.morgan@execui.dev',
    role: 'enterprise_admin',
    tenant: 'client',
  },
};

// ── Analytics ──────────────────────────────────────────────────────────────────
export const mockAnalytics = {
  kpis: [
    { label: 'Annual Revenue',     value: '$4.2M',  delta: '+12%', icon: 'DollarSign', color: 'emerald' },
    { label: 'Active Customers',   value: '1,847',  delta: '+8%',  icon: 'Users',      color: 'sky' },
    { label: 'Pipeline Value',     value: '$9.1M',  delta: '+21%', icon: 'TrendingUp', color: 'violet' },
    { label: 'Campaigns Live',     value: '14',     delta: '+3',   icon: 'BarChart3',  color: 'amber' },
    { label: 'Uptime (30d)',       value: '99.97%', delta: '+0.1%',icon: 'Activity',   color: 'emerald' },
    { label: 'Security Score',     value: '94/100', delta: '+2',   icon: 'ShieldCheck',color: 'sky' },
  ],

  healthSummary: [
    { area: 'Sales',       status: 'healthy',  note: 'Q2 targets on track — 87% attainment' },
    { area: 'Marketing',   status: 'healthy',  note: '14 active campaigns, CAC down 9%' },
    { area: 'Network',     status: 'warning',  note: '2 alerts require attention' },
    { area: 'Finance',     status: 'healthy',  note: 'Cash runway 18+ months' },
    { area: 'Support',     status: 'healthy',  note: 'Avg resolution time 4.2 h' },
    { area: 'Compliance',  status: 'healthy',  note: 'SOC 2 audit passed last week' },
  ],

  revenueVsPlan: [
    { month: 'Jan', actual: 310000, plan: 300000, pct: 103 },
    { month: 'Feb', actual: 285000, plan: 300000, pct: 95  },
    { month: 'Mar', actual: 340000, plan: 320000, pct: 106 },
    { month: 'Apr', actual: 360000, plan: 350000, pct: 103 },
    { month: 'May', actual: 395000, plan: 380000, pct: 104 },
    { month: 'Jun', actual: 420000, plan: 400000, pct: 105 },
  ],

  operationalServices: [
    { name: 'CRM API',        status: 'operational', uptime: 99.98, latency_ms: 42  },
    { name: 'Marketing Hub',  status: 'operational', uptime: 99.95, latency_ms: 61  },
    { name: 'Network Agent',  status: 'degraded',    uptime: 97.10, latency_ms: 310 },
    { name: 'Analytics DB',   status: 'operational', uptime: 99.99, latency_ms: 18  },
    { name: 'Auth Service',   status: 'operational', uptime: 100,   latency_ms: 9   },
  ],

  operationalEvents: [
    { id: 'ev_1', service: 'Network Agent', event: 'High latency detected',   severity: 'warning',  ts: daysAgo(0) },
    { id: 'ev_2', service: 'CRM API',       event: 'Deployment v2.4.1',       severity: 'info',     ts: daysAgo(1) },
    { id: 'ev_3', service: 'Analytics DB',  event: 'Index rebuild completed', severity: 'info',     ts: daysAgo(2) },
    { id: 'ev_4', service: 'Auth Service',  event: 'Certificate renewed',     severity: 'info',     ts: daysAgo(3) },
  ],

  cohorts: [
    { cohort: '2024-Q1', size: 420, week1: 100, week4: 78, week8: 64, week12: 55 },
    { cohort: '2024-Q2', size: 510, week1: 100, week4: 81, week8: 67, week12: 59 },
    { cohort: '2024-Q3', size: 480, week1: 100, week4: 76, week8: 62, week12: 51 },
    { cohort: '2024-Q4', size: 530, week1: 100, week4: 83, week8: 69, week12: 61 },
    { cohort: '2025-Q1', size: 490, week1: 100, week4: 80, week8: 65, week12: 57 },
  ],

  retentionByTier: [
    { tier: 'Enterprise', retention_30d: 97, retention_90d: 91, churn_risk: 3 },
    { tier: 'Pro',        retention_30d: 89, retention_90d: 79, churn_risk: 11 },
    { tier: 'Starter',    retention_30d: 74, retention_90d: 58, churn_risk: 26 },
  ],

  churnSignals: [
    { customer: 'Acme Corp',      signal: 'Login frequency dropped 60%', risk: 'high',   arr: 84000 },
    { customer: 'BlueSky Labs',   signal: 'Support tickets up 3x',       risk: 'medium', arr: 36000 },
    { customer: 'Delta Dynamics', signal: 'Feature adoption stalled',    risk: 'medium', arr: 52000 },
    { customer: 'Nexus Inc.',     signal: 'Champion left company',       risk: 'high',   arr: 120000 },
  ],

  revenueSegments: [
    { segment: 'Enterprise', arr: 2100000, pct: 50, growth: 18 },
    { segment: 'Mid-Market', arr: 1260000, pct: 30, growth: 12 },
    { segment: 'SMB',        arr:  840000, pct: 20, growth: 5  },
  ],

  expansionPipeline: [
    { account: 'Acme Corp',      type: 'Upsell',   value: 42000,  stage: 'Proposal',      close_date: daysAhead(30) },
    { account: 'Meridian Co.',   type: 'Cross-sell',value: 28000, stage: 'Discovery',     close_date: daysAhead(45) },
    { account: 'Sigma Systems',  type: 'Renewal+', value: 95000,  stage: 'Negotiation',   close_date: daysAhead(14) },
    { account: 'Pinnacle Group', type: 'Upsell',   value: 61000,  stage: 'Closed Won',    close_date: daysAgo(2)    },
  ],

  datasets: [
    { id: 'ds_1', name: 'Customer Master',    rows: 18420, duplicates: 142, quality_score: 94, last_sync: daysAgo(0) },
    { id: 'ds_2', name: 'Campaign Events',    rows: 94310, duplicates: 807, quality_score: 87, last_sync: daysAgo(0) },
    { id: 'ds_3', name: 'Network Telemetry',  rows: 510200,duplicates: 3100,quality_score: 91, last_sync: daysAgo(0) },
    { id: 'ds_4', name: 'Financial Records',  rows: 7840,  duplicates: 18,  quality_score: 99, last_sync: daysAgo(1) },
  ],

  savedQueries: [
    { id: 'q_1', name: 'Top customers by ARR',      sql: 'SELECT * FROM customers ORDER BY arr DESC LIMIT 10', created_at: daysAgo(5) },
    { id: 'q_2', name: 'Churned last 30 days',      sql: 'SELECT * FROM customers WHERE churned_at > NOW() - INTERVAL 30 DAY', created_at: daysAgo(10) },
    { id: 'q_3', name: 'Campaign conversion rates', sql: 'SELECT campaign_id, converted/sent AS cvr FROM campaigns', created_at: daysAgo(15) },
  ],
};

// ── CRM Dashboard (direct apiFetch in CRMView.jsx) ────────────────────────────
export const mockCrmDashboard = {
  profile: {
    id: 'emp_001',
    name: 'Alex Morgan',
    role: 'Senior Account Executive',
    department: 'CRM',
    email: 'alex.morgan@execui.dev',
    avatar_url: null,
  },

  servicesRecent: [
    { id: 's1', service_name: 'pipeline',      service_title: 'Pipeline Tracker',   service_description: 'Monitor and manage your active deals.', service_icon: 'pipeline',      usage_count: 24 },
    { id: 's2', service_name: 'contacts',      service_title: 'Contact Database',   service_description: 'Unified customer & prospect profiles.',  service_icon: 'contacts',      usage_count: 18 },
    { id: 's3', service_name: 'opportunities', service_title: 'Opportunities',      service_description: 'Track new revenue opportunities.',        service_icon: 'opportunities', usage_count: 12 },
    { id: 's4', service_name: 'analytics',     service_title: 'CRM Analytics',      service_description: 'Revenue intelligence and funnel reports.', service_icon: 'analytics',    usage_count: 9  },
  ],

  tasks: [
    { id: 't1', title: 'Follow up with Acme Corp re: Q3 renewal',   task_type: 'follow_up', priority: 'urgent', status: 'pending',   due_date: daysAhead(1),  relatedCustomerName: 'Acme Corp' },
    { id: 't2', title: 'Prepare demo for Nexus Inc.',                task_type: 'meeting',   priority: 'high',   status: 'pending',   due_date: daysAhead(2),  relatedCustomerName: 'Nexus Inc.' },
    { id: 't3', title: 'Send proposal to BlueSky Labs',              task_type: 'email',     priority: 'high',   status: 'pending',   due_date: daysAhead(3),  relatedCustomerName: 'BlueSky Labs' },
    { id: 't4', title: 'Call Delta Dynamics re: upsell',             task_type: 'call',      priority: 'medium', status: 'pending',   due_date: daysAhead(5),  relatedCustomerName: 'Delta Dynamics' },
    { id: 't5', title: 'Review Meridian contract terms',             task_type: 'review',    priority: 'low',    status: 'completed', due_date: daysAgo(1),    relatedCustomerName: 'Meridian Co.' },
  ],

  tickets: [
    { id: 'tk1', ticket_number: 'TKT-1042', subject: 'API integration error in prod',    customer_name: 'Acme Corp',      category: 'Technical',   priority: 'urgent', status: 'open',        sla_status: 'at_risk' },
    { id: 'tk2', ticket_number: 'TKT-1039', subject: 'Billing discrepancy Q2',           customer_name: 'Nexus Inc.',     category: 'Billing',     priority: 'high',   status: 'in_progress', sla_status: 'on_track' },
    { id: 'tk3', ticket_number: 'TKT-1035', subject: 'Feature request: bulk export',     customer_name: 'BlueSky Labs',   category: 'Feature',     priority: 'medium', status: 'open',        sla_status: 'on_track' },
    { id: 'tk4', ticket_number: 'TKT-1031', subject: 'SSO login fails intermittently',   customer_name: 'Delta Dynamics', category: 'Technical',   priority: 'high',   status: 'open',        sla_status: 'breached' },
    { id: 'tk5', ticket_number: 'TKT-1028', subject: 'Onboarding guidance needed',       customer_name: 'Sigma Systems',  category: 'Onboarding',  priority: 'low',    status: 'in_progress', sla_status: 'on_track' },
  ],

  followUps: [
    { id: 'fu1', customer_name: 'Acme Corp',    follow_up_type: 'Check-in call',   scheduled_date: daysAhead(1), status: 'scheduled' },
    { id: 'fu2', customer_name: 'Nexus Inc.',   follow_up_type: 'Contract review', scheduled_date: daysAhead(2), status: 'scheduled' },
    { id: 'fu3', customer_name: 'BlueSky Labs', follow_up_type: 'Demo walkthrough',scheduled_date: daysAhead(4), status: 'scheduled' },
  ],

  opportunities: [
    { id: 'op1', name: 'Acme Corp - Enterprise Upgrade',   stage: 'negotiation',  value: 95000,  probability: 75 },
    { id: 'op2', name: 'Nexus Inc. - Platform Expansion',  stage: 'proposal',     value: 120000, probability: 55 },
    { id: 'op3', name: 'Meridian Co. - New Business',      stage: 'discovery',    value: 48000,  probability: 30 },
    { id: 'op4', name: 'Sigma Systems - Add-on Modules',   stage: 'closed_won',   value: 34000,  probability: 100 },
    { id: 'op5', name: 'Pinnacle Group - Renewal+',        stage: 'qualification',value: 61000,  probability: 40 },
  ],

  overview: {
    tasks:          { pending: 4, completed_today: 2, overdue: 1 },
    tickets:        { open: 3, in_progress: 2, at_risk: 1, breached: 1 },
    opportunities:  { total: 5, pipeline_value: 358000 },
    follow_ups_today: 1,
  },
};

// ── CRM sub-views ──────────────────────────────────────────────────────────────
export const mockCrm = {
  customers: [
    { id: 'cust_001', name: 'Acme Corp',      email: 'contact@acme.com',     phone: '+1 415-555-0100', status: 'active',   arr: 84000,  tier: 'Enterprise', created_at: daysAgo(400) },
    { id: 'cust_002', name: 'Nexus Inc.',      email: 'hello@nexusinc.com',   phone: '+1 212-555-0200', status: 'active',   arr: 120000, tier: 'Enterprise', created_at: daysAgo(360) },
    { id: 'cust_003', name: 'BlueSky Labs',    email: 'info@bluesky.io',      phone: '+1 650-555-0300', status: 'active',   arr: 36000,  tier: 'Pro',        created_at: daysAgo(280) },
    { id: 'cust_004', name: 'Delta Dynamics',  email: 'ops@deltadyn.com',     phone: '+1 303-555-0400', status: 'at_risk',  arr: 52000,  tier: 'Pro',        created_at: daysAgo(220) },
    { id: 'cust_005', name: 'Meridian Co.',    email: 'bd@meridian.co',       phone: '+1 512-555-0500', status: 'active',   arr: 28000,  tier: 'Starter',    created_at: daysAgo(150) },
    { id: 'cust_006', name: 'Sigma Systems',   email: 'contact@sigma.sys',    phone: '+1 720-555-0600', status: 'active',   arr: 45000,  tier: 'Pro',        created_at: daysAgo(100) },
    { id: 'cust_007', name: 'Pinnacle Group',  email: 'info@pinnacle.group',  phone: '+1 206-555-0700', status: 'churned',  arr: 0,      tier: 'Starter',    created_at: daysAgo(500) },
    { id: 'cust_008', name: 'Aurora Tech',     email: 'sales@auroratech.com', phone: '+1 408-555-0800', status: 'active',   arr: 62000,  tier: 'Pro',        created_at: daysAgo(80)  },
  ],

  deals: [
    { id: 'deal_001', title: 'Acme Corp - Enterprise Renewal',    customer_id: 'cust_001', stage: 'Negotiation',   value: 95000,  probability: 75, owner: 'Alex Morgan',   close_date: daysAhead(30) },
    { id: 'deal_002', title: 'Nexus Inc. - Platform Expansion',   customer_id: 'cust_002', stage: 'Proposal',      value: 120000, probability: 55, owner: 'Jamie Lee',     close_date: daysAhead(45) },
    { id: 'deal_003', title: 'BlueSky Labs - Pro Upgrade',        customer_id: 'cust_003', stage: 'Discovery',     value: 36000,  probability: 30, owner: 'Sam Torres',    close_date: daysAhead(60) },
    { id: 'deal_004', title: 'Delta Dynamics - Save & Expand',    customer_id: 'cust_004', stage: 'Qualification', value: 52000,  probability: 20, owner: 'Alex Morgan',   close_date: daysAhead(90) },
    { id: 'deal_005', title: 'Aurora Tech - New Logo',            customer_id: 'cust_008', stage: 'Closed Won',    value: 62000,  probability: 100,owner: 'Jamie Lee',     close_date: daysAgo(5)    },
    { id: 'deal_006', title: 'Sigma Systems - Add-ons',           customer_id: 'cust_006', stage: 'Proposal',      value: 18000,  probability: 60, owner: 'Sam Torres',    close_date: daysAhead(20) },
  ],

  leads: [
    { id: 'lead_001', name: 'Jordan Patel',   company: 'TechWave',   email: 'j.patel@techwave.io',  source: 'Website',   score: 88, status: 'hot',      created_at: daysAgo(3)  },
    { id: 'lead_002', name: 'Casey Kim',      company: 'Orbis AI',   email: 'c.kim@orbis.ai',       source: 'LinkedIn',  score: 74, status: 'warm',     created_at: daysAgo(7)  },
    { id: 'lead_003', name: 'Riley Chen',     company: 'DataCore',   email: 'r.chen@datacore.co',   source: 'Webinar',   score: 62, status: 'warm',     created_at: daysAgo(10) },
    { id: 'lead_004', name: 'Morgan Davis',   company: 'VaultSec',   email: 'm.davis@vaultsec.net', source: 'Referral',  score: 91, status: 'hot',      created_at: daysAgo(1)  },
    { id: 'lead_005', name: 'Drew Wilson',    company: 'FluxOps',    email: 'd.wilson@fluxops.io',  source: 'Cold Email',score: 35, status: 'cold',     created_at: daysAgo(20) },
  ],

  tasks: [
    { id: 'ct_1', title: 'Call Acme re: renewal',    task_type: 'call',      priority: 'urgent', status: 'pending',   due_date: daysAhead(1), assigned_to: 'Alex Morgan' },
    { id: 'ct_2', title: 'Send Nexus proposal',       task_type: 'email',     priority: 'high',   status: 'pending',   due_date: daysAhead(2), assigned_to: 'Jamie Lee'   },
    { id: 'ct_3', title: 'Demo for BlueSky',          task_type: 'meeting',   priority: 'high',   status: 'completed', due_date: daysAgo(1),   assigned_to: 'Sam Torres'  },
    { id: 'ct_4', title: 'Review Delta contract',     task_type: 'review',    priority: 'medium', status: 'pending',   due_date: daysAhead(5), assigned_to: 'Alex Morgan' },
  ],

  sequences: [
    { id: 'seq_1', name: 'Enterprise Onboarding',  steps: 6, enrolled: 14, active: true,  reply_rate: 28 },
    { id: 'seq_2', name: 'Win-back Lapsed',         steps: 4, enrolled: 31, active: true,  reply_rate: 11 },
    { id: 'seq_3', name: 'Upsell Follow-up',        steps: 3, enrolled: 8,  active: false, reply_rate: 19 },
  ],

  forecastSummary: {
    commit:          { amount: 840000, deals: 12 },
    best_case:       { amount: 1100000, deals: 18 },
    pipeline:        { amount: 1480000, deals: 24 },
    quota:           1000000,
    attainment_pct:  84,
  },

  forecastByRep: [
    { rep: 'Alex Morgan', quota: 350000, commit: 290000, best_case: 380000, closed: 210000 },
    { rep: 'Jamie Lee',   quota: 350000, commit: 310000, best_case: 420000, closed: 195000 },
    { rep: 'Sam Torres',  quota: 300000, commit: 240000, best_case: 300000, closed: 180000 },
  ],

  forecastCategories: [
    { category: 'Closed Won', amount: 585000 },
    { category: 'Commit',     amount: 255000 },
    { category: 'Best Case',  amount: 260000 },
    { category: 'Pipeline',   amount: 380000 },
  ],

  pipelineSummary: [
    { stage: 'Qualification', count: 8,  value: 320000 },
    { stage: 'Discovery',     count: 6,  value: 280000 },
    { stage: 'Proposal',      count: 5,  value: 410000 },
    { stage: 'Negotiation',   count: 4,  value: 380000 },
    { stage: 'Closed Won',    count: 12, value: 740000 },
    { stage: 'Closed Lost',   count: 7,  value: 240000 },
  ],

  pipelineOwners: [
    { owner: 'Alex Morgan', total_value: 520000, deals: 9  },
    { owner: 'Jamie Lee',   total_value: 610000, deals: 8  },
    { owner: 'Sam Torres',  total_value: 300000, deals: 7  },
  ],

  analyticsSummary: {
    win_rate:         42,
    avg_deal_size:    54000,
    avg_cycle_days:   38,
    total_pipeline:   1480000,
    closed_won_qtd:   585000,
  },

  analyticsFunnel: [
    { stage: 'Leads',         count: 142 },
    { stage: 'Qualified',     count: 89  },
    { stage: 'Proposal',      count: 41  },
    { stage: 'Negotiation',   count: 22  },
    { stage: 'Closed Won',    count: 12  },
  ],

  analyticsVelocity: { avg_days_to_close: 38, deals_closed_mtd: 7, revenue_per_day: 18500 },

  analyticsWinLoss: [
    { reason: 'Price',       won: 3, lost: 8  },
    { reason: 'Features',    won: 5, lost: 4  },
    { reason: 'Competitor',  won: 2, lost: 6  },
    { reason: 'Timing',      won: 4, lost: 3  },
    { reason: 'Champion',    won: 6, lost: 2  },
  ],

  opportunitiesSummary: { total: 18, open: 14, value: 1480000, avg_probability: 52 },

  opportunities: [
    { id: 'opp_1', name: 'Acme Enterprise Upgrade',   stage: 'Negotiation',   value: 95000,  probability: 75, close_date: daysAhead(30) },
    { id: 'opp_2', name: 'Nexus Platform Expansion',  stage: 'Proposal',      value: 120000, probability: 55, close_date: daysAhead(45) },
    { id: 'opp_3', name: 'TechWave New Logo',         stage: 'Discovery',     value: 68000,  probability: 35, close_date: daysAhead(60) },
    { id: 'opp_4', name: 'VaultSec Security Bundle',  stage: 'Qualification', value: 42000,  probability: 20, close_date: daysAhead(90) },
  ],

  renewalsSummary: { due_90d: 4, value_at_risk: 292000, on_track: 3, at_risk: 1 },

  renewals: [
    { id: 'ren_1', customer: 'Acme Corp',     arr: 84000,  renewal_date: daysAhead(25), health: 'good',    status: 'on_track' },
    { id: 'ren_2', customer: 'Nexus Inc.',    arr: 120000, renewal_date: daysAhead(60), health: 'good',    status: 'on_track' },
    { id: 'ren_3', customer: 'BlueSky Labs',  arr: 36000,  renewal_date: daysAhead(45), health: 'at_risk', status: 'at_risk'  },
    { id: 'ren_4', customer: 'Sigma Systems', arr: 45000,  renewal_date: daysAhead(80), health: 'good',    status: 'on_track' },
  ],

  cases: [
    { id: 'case_1', case_number: 'CASE-0091', subject: 'API rate limit investigation',  customer: 'Acme Corp',    priority: 'high',   status: 'open',        assigned_to: 'Alex Morgan' },
    { id: 'case_2', case_number: 'CASE-0088', subject: 'Onboarding assistance',         customer: 'Aurora Tech',  priority: 'medium', status: 'in_progress', assigned_to: 'Sam Torres'  },
    { id: 'case_3', case_number: 'CASE-0085', subject: 'Data migration support',        customer: 'Delta Dynamics',priority: 'high',  status: 'pending',     assigned_to: 'Jamie Lee'   },
    { id: 'case_4', case_number: 'CASE-0082', subject: 'Billing inquiry Q2',            customer: 'Nexus Inc.',   priority: 'low',    status: 'closed',      assigned_to: 'Alex Morgan' },
  ],

  playbooks: [
    { id: 'pb_1', name: 'New Customer Onboarding',  steps: 8,  last_run: daysAgo(2),  success_rate: 91 },
    { id: 'pb_2', name: 'Churn Risk Intervention',  steps: 5,  last_run: daysAgo(5),  success_rate: 62 },
    { id: 'pb_3', name: 'Upsell Discovery Call',    steps: 4,  last_run: daysAgo(7),  success_rate: 74 },
    { id: 'pb_4', name: 'Executive Escalation',     steps: 6,  last_run: daysAgo(14), success_rate: 85 },
  ],

  partners: [
    { id: 'par_1', name: 'Vertex Solutions',   tier: 'Gold',   region: 'North America', deals_referred: 12, arr_influenced: 380000 },
    { id: 'par_2', name: 'Apex Consulting',    tier: 'Silver', region: 'Europe',        deals_referred: 7,  arr_influenced: 160000 },
    { id: 'par_3', name: 'Meridian Partners',  tier: 'Bronze', region: 'APAC',          deals_referred: 3,  arr_influenced: 62000  },
  ],

  meetings: [
    { id: 'mtg_1', title: 'Q3 Business Review — Acme Corp',  attendees: 4, start: daysAhead(3),  duration_min: 60 },
    { id: 'mtg_2', title: 'Demo — Nexus Platform',           attendees: 2, start: daysAhead(5),  duration_min: 45 },
    { id: 'mtg_3', title: 'Onboarding — Aurora Tech',        attendees: 3, start: daysAhead(7),  duration_min: 90 },
  ],

  repsSummary: { total: 3, quota_attainment_avg: 84, deals_open: 24 },

  reps: [
    { id: 'rep_1', name: 'Alex Morgan', email: 'alex.morgan@execui.dev', quota: 350000, attainment: 87, deals_open: 9  },
    { id: 'rep_2', name: 'Jamie Lee',   email: 'jamie.lee@execui.dev',   quota: 350000, attainment: 91, deals_open: 8  },
    { id: 'rep_3', name: 'Sam Torres',  email: 'sam.torres@execui.dev',  quota: 300000, attainment: 74, deals_open: 7  },
  ],

  integrations: [
    { id: 'int_1', name: 'Salesforce',  status: 'connected', last_sync: daysAgo(0), records_synced: 18420 },
    { id: 'int_2', name: 'HubSpot',     status: 'connected', last_sync: daysAgo(0), records_synced: 9200  },
    { id: 'int_3', name: 'Slack',       status: 'connected', last_sync: daysAgo(1), records_synced: 0     },
    { id: 'int_4', name: 'Marketo',     status: 'error',     last_sync: daysAgo(3), records_synced: 0     },
  ],

  integrationTimeline: [
    { event: 'Salesforce sync completed',  ts: daysAgo(0), status: 'success' },
    { event: 'HubSpot sync completed',     ts: daysAgo(0), status: 'success' },
    { event: 'Marketo auth token expired', ts: daysAgo(3), status: 'error'   },
  ],

  leadSources: [
    { source: 'Website',    leads: 48, converted: 12, cvr: 25 },
    { source: 'LinkedIn',   leads: 31, converted: 7,  cvr: 23 },
    { source: 'Referral',   leads: 18, converted: 8,  cvr: 44 },
    { source: 'Webinar',    leads: 22, converted: 4,  cvr: 18 },
    { source: 'Cold Email', leads: 55, converted: 5,  cvr: 9  },
  ],

  syncHealth: { status: 'partial', errors: 1, warnings: 2, last_full_sync: daysAgo(1) },

  databaseRecords: [
    { id: 'db_1', type: 'Customer', name: 'Acme Corp',   last_updated: daysAgo(0), owner: 'Alex Morgan' },
    { id: 'db_2', type: 'Lead',     name: 'Jordan Patel',last_updated: daysAgo(1), owner: 'Jamie Lee'   },
    { id: 'db_3', type: 'Deal',     name: 'Nexus Expansion',last_updated: daysAgo(0), owner: 'Jamie Lee' },
  ],

  databaseUsage: { total_records: 28400, storage_gb: 2.4, growth_pct_30d: 8 },

  databaseAudit: [
    { user: 'Alex Morgan', action: 'Updated customer Acme Corp',   ts: daysAgo(0) },
    { user: 'Jamie Lee',   action: 'Created deal Nexus Expansion', ts: daysAgo(0) },
    { user: 'Sam Torres',  action: 'Deleted lead FluxOps',         ts: daysAgo(1) },
  ],

  teams: [
    { id: 'team_1', name: 'Enterprise Sales',  members: 3, quota: 1000000, attainment: 84 },
    { id: 'team_2', name: 'SMB Growth',        members: 2, quota: 400000,  attainment: 76 },
  ],

  accounts: [
    { id: 'acc_1', name: 'Acme Corp',     industry: 'Technology', employees: 1200, arr: 84000,  health: 'good'    },
    { id: 'acc_2', name: 'Nexus Inc.',    industry: 'Finance',    employees: 800,  arr: 120000, health: 'good'    },
    { id: 'acc_3', name: 'Delta Dynamics',industry: 'Retail',     employees: 500,  arr: 52000,  health: 'at_risk' },
  ],

  resolutions: [
    { id: 'res_1', title: 'Migrate to new auth system Q3',  votes_for: 8, votes_against: 2, status: 'approved' },
    { id: 'res_2', title: 'Expand APAC team by 2 reps',     votes_for: 5, votes_against: 4, status: 'open'     },
    { id: 'res_3', title: 'Increase enterprise CAC budget',  votes_for: 6, votes_against: 3, status: 'open'     },
  ],
};

// ── Marketing ──────────────────────────────────────────────────────────────────
export const mockMarketing = {
  campaignsSummary: {
    total: 14, active: 8, paused: 3, draft: 3,
    total_spend: 84200, total_revenue: 310000, avg_roas: 3.7,
  },

  campaigns: [
    { id: 'camp_1', name: 'Q2 Enterprise Outreach',    channel: 'Email',    status: 'active',  budget: 12000, spend: 9200, conversions: 48, roas: 3.8, start_date: daysAgo(30), end_date: daysAhead(30) },
    { id: 'camp_2', name: 'LinkedIn Thought Leadership',channel: 'LinkedIn', status: 'active',  budget: 8000,  spend: 6100, conversions: 31, roas: 4.2, start_date: daysAgo(14), end_date: daysAhead(45) },
    { id: 'camp_3', name: 'Webinar Series — AI in CRM', channel: 'Webinar',  status: 'active',  budget: 5000,  spend: 3400, conversions: 22, roas: 2.9, start_date: daysAgo(7),  end_date: daysAhead(21) },
    { id: 'camp_4', name: 'Retargeting — Churned Accts',channel: 'Display',  status: 'paused',  budget: 6000,  spend: 5100, conversions: 14, roas: 1.8, start_date: daysAgo(60), end_date: daysAhead(0)  },
    { id: 'camp_5', name: 'SEO Content Push — Q2',      channel: 'SEO',      status: 'active',  budget: 4500,  spend: 3200, conversions: 64, roas: 5.1, start_date: daysAgo(45), end_date: daysAhead(15) },
  ],

  attributionChannels: [
    { channel: 'Organic Search', revenue: 92000, conversions: 210, spend: 8000,  roas: 11.5 },
    { channel: 'Paid Social',    revenue: 58000, conversions: 124, spend: 22000, roas: 2.6  },
    { channel: 'Email',          revenue: 74000, conversions: 186, spend: 14000, roas: 5.3  },
    { channel: 'Webinar',        revenue: 41000, conversions: 52,  spend: 9000,  roas: 4.6  },
    { channel: 'Referral',       revenue: 45000, conversions: 67,  spend: 0,     roas: null },
  ],

  attributionSummary: {
    total_revenue: 310000, total_spend: 84200, blended_roas: 3.7, top_channel: 'Organic Search',
  },

  attributionModels: [
    { model: 'Last Touch',      revenue_attributed: 310000 },
    { model: 'First Touch',     revenue_attributed: 285000 },
    { model: 'Linear',          revenue_attributed: 297000 },
    { model: 'Time Decay',      revenue_attributed: 301000 },
    { model: 'Data Driven',     revenue_attributed: 318000 },
  ],

  attributionLtvCac: {
    ltv: 42000, cac: 3800, ltv_cac_ratio: 11.1, payback_months: 8,
  },

  audiences: [
    { id: 'aud_1', name: 'Enterprise Decision Makers', size: 12400, source: 'CRM + LinkedIn',     status: 'active',   match_rate: 74 },
    { id: 'aud_2', name: 'Churned Last 90d',           size: 3800,  source: 'CRM',               status: 'active',   match_rate: 92 },
    { id: 'aud_3', name: 'High-Intent Web Visitors',   size: 9200,  source: 'Pixel',             status: 'active',   match_rate: 68 },
    { id: 'aud_4', name: 'Similar to Top Customers',   size: 28000, source: 'Lookalike',         status: 'building', match_rate: 0  },
  ],

  analyticsSummary: {
    impressions: 2400000, clicks: 84000, conversions: 3120, ctr: 3.5, cvr: 3.7,
    cpc: 1.02, cost_per_conversion: 27.6,
  },

  analyticsTrend: [
    { date: daysAgo(6), impressions: 340000, clicks: 11900, conversions: 441 },
    { date: daysAgo(5), impressions: 320000, clicks: 11200, conversions: 412 },
    { date: daysAgo(4), impressions: 360000, clicks: 12600, conversions: 469 },
    { date: daysAgo(3), impressions: 380000, clicks: 13300, conversions: 493 },
    { date: daysAgo(2), impressions: 350000, clicks: 12250, conversions: 453 },
    { date: daysAgo(1), impressions: 330000, clicks: 11550, conversions: 428 },
    { date: daysAgo(0), impressions: 320000, clicks: 11200, conversions: 424 },
  ],

  analyticsChannelPerf: [
    { channel: 'Email',      ctr: 4.2, cvr: 6.1, cpa: 18 },
    { channel: 'Paid Social',ctr: 2.8, cvr: 2.9, cpa: 42 },
    { channel: 'Display',    ctr: 0.8, cvr: 1.2, cpa: 61 },
    { channel: 'Webinar',    ctr: 8.4, cvr: 9.2, cpa: 24 },
  ],

  experiments: [
    { id: 'exp_1', name: 'Subject line A/B — Q2 Outreach',  status: 'running',   variant_a: 'Unlock Q2 Results',  variant_b: 'See Your Q2 Report', winner: null,       lift: null },
    { id: 'exp_2', name: 'CTA button colour — Landing Page', status: 'completed', variant_a: 'Blue (#3B82F6)',     variant_b: 'Orange (#F97316)',   winner: 'variant_b', lift: 14   },
    { id: 'exp_3', name: 'Send-time optimisation',           status: 'running',   variant_a: '9am Tuesday',        variant_b: '11am Wednesday',     winner: null,       lift: null  },
  ],

  teams: [
    { id: 'tm_1', name: 'Sarah Okafor', role: 'Campaign Manager',   tasks_open: 4, campaigns_owned: 3 },
    { id: 'tm_2', name: 'Liam Nguyen',  role: 'Content Strategist',  tasks_open: 2, campaigns_owned: 2 },
    { id: 'tm_3', name: 'Priya Mehta',  role: 'Growth Analyst',      tasks_open: 6, campaigns_owned: 1 },
  ],

  teamTasks: [
    { id: 'tt_1', title: 'Write copy for Q3 newsletter',    assignee: 'Liam Nguyen',  due: daysAhead(3),  status: 'in_progress' },
    { id: 'tt_2', title: 'Review LinkedIn ad creative',     assignee: 'Sarah Okafor', due: daysAhead(2),  status: 'pending'     },
    { id: 'tt_3', title: 'Analyse experiment #exp_1 data',  assignee: 'Priya Mehta',  due: daysAhead(5),  status: 'pending'     },
  ],

  teamMetrics: { campaigns_live: 8, avg_roas: 3.7, team_tasks_open: 12, budget_utilised_pct: 71 },

  b2bAccounts: [
    { id: 'b2b_1', name: 'Acme Corp',    contacts: 8,  engaged: 6, last_touch: daysAgo(1), stage: 'Active Customer'  },
    { id: 'b2b_2', name: 'TechWave',     contacts: 3,  engaged: 2, last_touch: daysAgo(3), stage: 'Prospect'         },
    { id: 'b2b_3', name: 'Orbis AI',     contacts: 2,  engaged: 1, last_touch: daysAgo(7), stage: 'Early Stage Lead' },
  ],

  b2bJourneys: [
    { id: 'jrn_1', name: 'Enterprise Nurture',    stages: 5, enrolled: 24, conversion_rate: 18 },
    { id: 'jrn_2', name: 'Trial-to-Paid',         stages: 3, enrolled: 62, conversion_rate: 31 },
    { id: 'jrn_3', name: 'Webinar Follow-up',     stages: 4, enrolled: 38, conversion_rate: 22 },
  ],

  contentAssets: [
    { id: 'ast_1', name: 'Q2 ROI Calculator.pdf',       type: 'PDF',   size_kb: 420,  downloads: 184, created_at: daysAgo(10) },
    { id: 'ast_2', name: 'Enterprise Case Study.pdf',   type: 'PDF',   size_kb: 860,  downloads: 312, created_at: daysAgo(20) },
    { id: 'ast_3', name: 'LinkedIn Banner Set.zip',     type: 'Image', size_kb: 2100, downloads: 47,  created_at: daysAgo(5)  },
    { id: 'ast_4', name: 'Webinar Slide Deck.pptx',     type: 'Slide', size_kb: 3400, downloads: 98,  created_at: daysAgo(14) },
  ],

  commerceOrders: [
    { id: 'ord_1', customer: 'Acme Corp',    amount: 8400,  status: 'fulfilled', date: daysAgo(2)  },
    { id: 'ord_2', customer: 'Aurora Tech',  amount: 5200,  status: 'fulfilled', date: daysAgo(4)  },
    { id: 'ord_3', customer: 'BlueSky Labs', amount: 3000,  status: 'processing',date: daysAgo(0)  },
  ],

  commerceMetrics: { gmv_mtd: 84000, orders_mtd: 24, avg_order_value: 3500, refund_rate_pct: 1.8 },

  personalization: [
    { id: 'pers_1', name: 'Homepage Hero — Enterprise',  segment: 'Enterprise', impressions: 12400, ctr: 6.2 },
    { id: 'pers_2', name: 'Pricing Page — SMB',          segment: 'SMB',        impressions: 8100,  ctr: 4.8 },
    { id: 'pers_3', name: 'Blog CTA — Developers',       segment: 'Technical',  impressions: 18200, ctr: 3.1 },
  ],

  personalizationMetrics: { active_rules: 8, avg_lift_pct: 14, impressions_mtd: 380000 },

  cdpMetrics: {
    total_profiles: 184200, unified_pct: 91, sources_connected: 6,
    segments_active: 12, last_ingestion: daysAgo(0),
  },

  cdpSources: [
    { id: 'src_1', name: 'CRM',           type: 'CRM',      records: 18420, status: 'active', last_sync: daysAgo(0) },
    { id: 'src_2', name: 'Website',        type: 'Pixel',    records: 94000, status: 'active', last_sync: daysAgo(0) },
    { id: 'src_3', name: 'Email Platform', type: 'Platform', records: 41000, status: 'active', last_sync: daysAgo(0) },
    { id: 'src_4', name: 'Support System', type: 'CRM',      records: 8200,  status: 'error',  last_sync: daysAgo(2) },
  ],

  flows: [
    { id: 'flow_1', name: 'Welcome Series',         trigger: 'signup',    steps: 5, active: true,  sent_30d: 2410 },
    { id: 'flow_2', name: 'Trial Conversion Nudge', trigger: 'day_7',     steps: 3, active: true,  sent_30d: 840  },
    { id: 'flow_3', name: 'Churn Intervention',     trigger: 'low_usage', steps: 4, active: false, sent_30d: 0    },
    { id: 'flow_4', name: 'Renewal Reminder',       trigger: '60d_before',steps: 3, active: true,  sent_30d: 320  },
  ],
};

// ── Network Dashboard (direct apiFetch in NetworkView.jsx) ─────────────────────
export const mockNetworkDashboard = {
  overview: {
    kpis: {
      total_devices:        42,
      servers_online:       18,
      servers_total:        20,
      active_alerts:        2,
      endpoints_healthy_pct:96,
      cloud_regions:        3,
      avg_cpu_util:         41,
    },
    health: {
      network_status:   'Operational',
      endpoint_health:  'Good',
      server_load:      'Normal',
      security_posture: 'Secure',
    },
    cloud: {
      active_regions:   3,
      cloud_devices:    14,
      incidents_count:  1,
      has_warnings:     true,
    },
  },

  deviceUsage: [
    { id: 'dv_1', hostname: 'prod-web-01',   device_type: 'Server',   cpu_util: 62, mem_util: 71, status: 'up'   },
    { id: 'dv_2', hostname: 'prod-web-02',   device_type: 'Server',   cpu_util: 58, mem_util: 65, status: 'up'   },
    { id: 'dv_3', hostname: 'prod-db-01',    device_type: 'Database', cpu_util: 44, mem_util: 82, status: 'up'   },
    { id: 'dv_4', hostname: 'prod-api-01',   device_type: 'Server',   cpu_util: 71, mem_util: 68, status: 'up'   },
    { id: 'dv_5', hostname: 'edge-fw-01',    device_type: 'Firewall', cpu_util: 28, mem_util: 34, status: 'up'   },
    { id: 'dv_6', hostname: 'backup-store',  device_type: 'Storage',  cpu_util: 12, mem_util: 88, status: 'up'   },
    { id: 'dv_7', hostname: 'legacy-app-01', device_type: 'Server',   cpu_util: 0,  mem_util: 0,  status: 'down' },
  ],

  storage: {
    total_backups:    128,
    successful_today: 14,
    failed_today:     1,
    total_size_gb:    4820,
  },
};

// ── Network sub-views ──────────────────────────────────────────────────────────
export const mockNetwork = {
  devices: [
    { id: 'dv_1', hostname: 'prod-web-01',    ip: '10.0.1.10', device_type: 'Server',   vendor: 'Dell',   status: 'up',   location: 'US-East', os: 'Ubuntu 22.04' },
    { id: 'dv_2', hostname: 'prod-web-02',    ip: '10.0.1.11', device_type: 'Server',   vendor: 'Dell',   status: 'up',   location: 'US-East', os: 'Ubuntu 22.04' },
    { id: 'dv_3', hostname: 'prod-db-01',     ip: '10.0.2.10', device_type: 'Database', vendor: 'HP',     status: 'up',   location: 'US-East', os: 'RHEL 9'       },
    { id: 'dv_4', hostname: 'prod-api-01',    ip: '10.0.1.20', device_type: 'Server',   vendor: 'Cisco',  status: 'up',   location: 'US-West', os: 'Ubuntu 22.04' },
    { id: 'dv_5', hostname: 'edge-fw-01',     ip: '10.0.0.1',  device_type: 'Firewall', vendor: 'Palo Alto',status:'up',  location: 'US-East', os: 'PAN-OS 11'    },
    { id: 'dv_6', hostname: 'backup-store',   ip: '10.0.3.10', device_type: 'Storage',  vendor: 'NetApp', status: 'up',   location: 'DR-Site', os: 'ONTAP 9.13'   },
    { id: 'dv_7', hostname: 'legacy-app-01',  ip: '10.0.4.10', device_type: 'Server',   vendor: 'IBM',    status: 'down', location: 'US-East', os: 'CentOS 7'     },
    { id: 'dv_8', hostname: 'router-core-01', ip: '10.0.0.2',  device_type: 'Router',   vendor: 'Cisco',  status: 'up',   location: 'US-East', os: 'IOS-XE 17.9'  },
  ],

  alerts: [
    { id: 'alrt_1', device: 'prod-api-01',  severity: 'critical', message: 'CPU utilisation above 90% for 10 min',     status: 'open',         ts: daysAgo(0) },
    { id: 'alrt_2', device: 'legacy-app-01',severity: 'critical', message: 'Device unreachable — ping timeout',        status: 'open',         ts: daysAgo(0) },
    { id: 'alrt_3', device: 'prod-db-01',   severity: 'warning',  message: 'Memory usage at 82%',                      status: 'acknowledged', ts: daysAgo(1) },
    { id: 'alrt_4', device: 'backup-store', severity: 'info',     message: 'Backup job failed for 1 volume',           status: 'resolved',     ts: daysAgo(2) },
    { id: 'alrt_5', device: 'edge-fw-01',   severity: 'warning',  message: 'Unusual outbound traffic pattern detected',status: 'open',         ts: daysAgo(0) },
  ],

  trafficOverview: {
    total_bandwidth_gbps: 12.4, peak_gbps: 28.1, utilisation_pct: 44,
    top_protocol: 'HTTPS', anomalies_detected: 1,
  },

  topTalkers: [
    { ip: '10.0.1.10', hostname: 'prod-web-01',  bytes_sent: 48000000000, bytes_recv: 12000000000 },
    { ip: '10.0.1.20', hostname: 'prod-api-01',  bytes_sent: 32000000000, bytes_recv: 8100000000  },
    { ip: '10.0.2.10', hostname: 'prod-db-01',   bytes_sent: 22000000000, bytes_recv: 31000000000 },
  ],

  protocols: [
    { protocol: 'HTTPS', pct: 72 },
    { protocol: 'DNS',   pct: 10 },
    { protocol: 'SSH',   pct: 8  },
    { protocol: 'SMTP',  pct: 6  },
    { protocol: 'Other', pct: 4  },
  ],

  trafficAnomalies: [
    { id: 'ano_1', description: 'Spike in outbound UDP from edge-fw-01', detected: daysAgo(0), severity: 'medium' },
  ],

  topologyRegions: [
    { id: 'reg_1', name: 'US-East',  devices: 24, status: 'healthy'  },
    { id: 'reg_2', name: 'US-West',  devices: 10, status: 'healthy'  },
    { id: 'reg_3', name: 'EU-West',  devices: 6,  status: 'degraded' },
    { id: 'reg_4', name: 'DR-Site',  devices: 2,  status: 'healthy'  },
  ],

  topologyNodes: [
    { id: 'n1', label: 'prod-web-01',  type: 'server',   region: 'US-East', x: 200, y: 100 },
    { id: 'n2', label: 'prod-web-02',  type: 'server',   region: 'US-East', x: 300, y: 100 },
    { id: 'n3', label: 'prod-db-01',   type: 'database', region: 'US-East', x: 250, y: 200 },
    { id: 'n4', label: 'edge-fw-01',   type: 'firewall', region: 'US-East', x: 250, y: 50  },
    { id: 'n5', label: 'prod-api-01',  type: 'server',   region: 'US-West', x: 500, y: 150 },
  ],

  topologyLinks: [
    { source: 'n4', target: 'n1', bandwidth_gbps: 10 },
    { source: 'n4', target: 'n2', bandwidth_gbps: 10 },
    { source: 'n1', target: 'n3', bandwidth_gbps: 5  },
    { source: 'n2', target: 'n3', bandwidth_gbps: 5  },
    { source: 'n4', target: 'n5', bandwidth_gbps: 10 },
  ],

  incidents: [
    { id: 'inc_1', title: 'prod-api-01 high CPU',          severity: 'critical', status: 'open',     assigned_to: 'ops-team', created_at: daysAgo(0) },
    { id: 'inc_2', title: 'legacy-app-01 offline',         severity: 'critical', status: 'open',     assigned_to: 'infra-team',created_at: daysAgo(0) },
    { id: 'inc_3', title: 'EU-West region degradation',    severity: 'high',     status: 'open',     assigned_to: 'cloud-team',created_at: daysAgo(1) },
    { id: 'inc_4', title: 'Backup volume failure resolved',severity: 'medium',   status: 'resolved', assigned_to: 'ops-team', created_at: daysAgo(3) },
  ],

  serviceHealth: [
    { id: 'svc_1', name: 'Web Frontend',  status: 'operational', uptime_pct: 99.97, latency_ms: 42  },
    { id: 'svc_2', name: 'API Gateway',   status: 'degraded',    uptime_pct: 97.10, latency_ms: 310 },
    { id: 'svc_3', name: 'Database',      status: 'operational', uptime_pct: 99.99, latency_ms: 18  },
    { id: 'svc_4', name: 'Auth Service',  status: 'operational', uptime_pct: 100,   latency_ms: 9   },
    { id: 'svc_5', name: 'Storage',       status: 'operational', uptime_pct: 99.90, latency_ms: 28  },
  ],

  capacityLinks: [
    { link: 'US-East ↔ US-West',  capacity_gbps: 40, utilised_gbps: 18, pct: 45 },
    { link: 'US-East ↔ EU-West',  capacity_gbps: 20, utilised_gbps: 14, pct: 70 },
    { link: 'US-East ↔ DR-Site',  capacity_gbps: 10, utilised_gbps: 2,  pct: 20 },
  ],

  capacitySummary: {
    total_capacity_gbps: 70, utilised_gbps: 34, avg_utilisation_pct: 49,
    links_at_risk: 1,
  },

  automationJobs: [
    { id: 'job_1', name: 'Nightly config backup',    template: 'backup',     status: 'success', last_run: daysAgo(0), schedule: 'daily'   },
    { id: 'job_2', name: 'Compliance audit scan',    template: 'audit',      status: 'success', last_run: daysAgo(1), schedule: 'weekly'  },
    { id: 'job_3', name: 'Firmware update — routers',template: 'firmware',   status: 'failed',  last_run: daysAgo(2), schedule: 'manual'  },
    { id: 'job_4', name: 'Log rotation',             template: 'maintenance',status: 'success', last_run: daysAgo(0), schedule: 'daily'   },
  ],

  automationTemplates: [
    { id: 'tmpl_1', name: 'Config Backup',    description: 'Archive all device configs to S3'  },
    { id: 'tmpl_2', name: 'Compliance Audit', description: 'Check devices against CIS benchmarks' },
    { id: 'tmpl_3', name: 'Firmware Update',  description: 'Push firmware to selected devices' },
    { id: 'tmpl_4', name: 'Log Rotation',     description: 'Compress and archive syslog files' },
  ],

  changes: [
    { id: 'chg_1', title: 'Enable TLS 1.3 on edge-fw-01',       status: 'approved',  priority: 'high',   requested_by: 'ops-team',  scheduled: daysAhead(2) },
    { id: 'chg_2', title: 'Replace legacy-app-01 hardware',      status: 'pending',   priority: 'critical',requested_by: 'infra-team',scheduled: daysAhead(7) },
    { id: 'chg_3', title: 'Upgrade prod-db-01 RHEL → 9.4',      status: 'pending',   priority: 'medium', requested_by: 'ops-team',  scheduled: daysAhead(14) },
    { id: 'chg_4', title: 'Add US-West load balancer node',      status: 'completed', priority: 'high',   requested_by: 'cloud-team',scheduled: daysAgo(5)   },
  ],

  docs: [
    { id: 'doc_1', title: 'Network Architecture Overview',     category: 'Architecture', updated_at: daysAgo(7)  },
    { id: 'doc_2', title: 'Incident Response Runbook',         category: 'Operations',   updated_at: daysAgo(14) },
    { id: 'doc_3', title: 'Firewall Rule Policy',              category: 'Security',     updated_at: daysAgo(30) },
    { id: 'doc_4', title: 'Capacity Planning 2025',            category: 'Planning',     updated_at: daysAgo(3)  },
  ],

  policies: [
    { id: 'pol_1', name: 'CIS Level 1 — Servers', compliant: 38, non_compliant: 2, last_check: daysAgo(1) },
    { id: 'pol_2', name: 'PCI DSS Network Seg.',  compliant: 12, non_compliant: 0, last_check: daysAgo(1) },
    { id: 'pol_3', name: 'Internal FW Baselines', compliant: 5,  non_compliant: 1, last_check: daysAgo(2) },
  ],

  settings: {
    monitoring_interval_sec: 60,
    alert_email: 'ops@execui.dev',
    syslog_server: '10.0.5.10',
    snmp_community: 'public',
    auto_remediation: true,
  },

  settingsProfiles: [
    { id: 'prof_1', name: 'Production',   description: 'Strict monitoring and alerting',    active: true  },
    { id: 'prof_2', name: 'Development',  description: 'Relaxed thresholds for dev envs',   active: false },
    { id: 'prof_3', name: 'DR',           description: 'Disaster-recovery monitoring mode', active: false },
  ],
};

// ── Account ────────────────────────────────────────────────────────────────────
export const mockAccount = {
  profile: {
    id: 'usr_001',
    name: 'Alex Morgan',
    email: 'alex.morgan@execui.dev',
    phone: '+1 415-555-0101',
    title: 'VP of Revenue Operations',
    company: 'ExecUI Inc.',
    timezone: 'America/Los_Angeles',
    avatar_url: null,
    created_at: daysAgo(400),
  },

  security: {
    mfa_enabled:          true,
    last_password_change: daysAgo(90),
    active_sessions:      2,
    login_count_30d:      48,
  },

  sessions: [
    { id: 'ses_1', device: 'MacBook Pro (Chrome 124)',    ip: '72.229.28.10',  location: 'San Francisco, CA', last_active: daysAgo(0), current: true  },
    { id: 'ses_2', device: 'iPhone 15 (Safari)',          ip: '72.229.28.11',  location: 'San Francisco, CA', last_active: daysAgo(1), current: false },
  ],

  apiKeys: [
    { id: 'key_1', name: 'Production Integration',  prefix: 'eui_prod_***',  created_at: daysAgo(120), last_used: daysAgo(0)  },
    { id: 'key_2', name: 'Analytics Pipeline',      prefix: 'eui_anlt_***',  created_at: daysAgo(60),  last_used: daysAgo(2)  },
    { id: 'key_3', name: 'Dev Sandbox',             prefix: 'eui_dev_***',   created_at: daysAgo(30),  last_used: daysAgo(5)  },
  ],

  notificationPreferences: {
    email_alerts:       true,
    slack_alerts:       true,
    weekly_digest:      true,
    deal_updates:       true,
    campaign_reports:   true,
    network_incidents:  true,
    billing_alerts:     true,
  },

  teamMembers: [
    { id: 'tm_1', name: 'Alex Morgan',  email: 'alex.morgan@execui.dev',   role: 'admin',   status: 'active', joined: daysAgo(400) },
    { id: 'tm_2', name: 'Jamie Lee',    email: 'jamie.lee@execui.dev',     role: 'member',  status: 'active', joined: daysAgo(300) },
    { id: 'tm_3', name: 'Sam Torres',   email: 'sam.torres@execui.dev',    role: 'member',  status: 'active', joined: daysAgo(250) },
    { id: 'tm_4', name: 'Priya Mehta',  email: 'priya.mehta@execui.dev',   role: 'viewer',  status: 'active', joined: daysAgo(90)  },
    { id: 'tm_5', name: 'Liam Nguyen',  email: 'liam.nguyen@execui.dev',   role: 'member',  status: 'pending',joined: daysAgo(5)   },
  ],

  roles: [
    { id: 'role_admin',  name: 'Admin',  description: 'Full platform access and settings management' },
    { id: 'role_member', name: 'Member', description: 'Access to all apps with standard permissions' },
    { id: 'role_viewer', name: 'Viewer', description: 'Read-only access to dashboards and reports'  },
  ],

  billing: {
    plan:              'Enterprise',
    status:            'active',
    mrr:               4200,
    seats_used:        5,
    seats_total:       20,
    next_billing_date: daysAhead(15),
    billing_email:     'billing@execui.dev',
  },

  billingPlans: [
    { id: 'plan_starter',    name: 'Starter',    price_monthly: 99,   seats: 5,  features: ['CRM', 'Marketing Basics'] },
    { id: 'plan_pro',        name: 'Pro',         price_monthly: 399,  seats: 10, features: ['CRM', 'Marketing', 'Network', 'Analytics'] },
    { id: 'plan_enterprise', name: 'Enterprise',  price_monthly: 1499, seats: 50, features: ['Everything', 'SSO', 'SLA', 'Dedicated CSM'] },
  ],

  paymentMethods: [
    { id: 'pm_1', type: 'card', brand: 'Visa',       last4: '4242', exp: '09/27', default: true  },
    { id: 'pm_2', type: 'card', brand: 'Mastercard', last4: '5555', exp: '03/26', default: false },
  ],

  invoices: [
    { id: 'inv_1', date: daysAgo(30),  amount: 4200, status: 'paid',   pdf_url: '#' },
    { id: 'inv_2', date: daysAgo(60),  amount: 4200, status: 'paid',   pdf_url: '#' },
    { id: 'inv_3', date: daysAgo(90),  amount: 3900, status: 'paid',   pdf_url: '#' },
    { id: 'inv_4', date: daysAgo(120), amount: 3900, status: 'paid',   pdf_url: '#' },
  ],

  auditLogs: [
    { id: 'al_1', user: 'Alex Morgan', action: 'Updated billing email',          ip: '72.229.28.10', ts: daysAgo(0)  },
    { id: 'al_2', user: 'Alex Morgan', action: 'Rotated API key — Dev Sandbox',   ip: '72.229.28.10', ts: daysAgo(1)  },
    { id: 'al_3', user: 'Jamie Lee',   action: 'Updated team member role',        ip: '72.229.28.50', ts: daysAgo(2)  },
    { id: 'al_4', user: 'Sam Torres',  action: 'Exported CRM customer report',    ip: '72.229.28.80', ts: daysAgo(3)  },
    { id: 'al_5', user: 'Alex Morgan', action: 'Invited Liam Nguyen',             ip: '72.229.28.10', ts: daysAgo(5)  },
  ],
};

// ── Services ───────────────────────────────────────────────────────────────────
export const mockServices = {
  dashboardStats: {
    transactions_mtd:     48,
    active_projects:      6,
    team_members:         8,
    goals_on_track:       4,
    goals_at_risk:        1,
    pending_tasks:        12,
    revenue_mtd:          186000,
    campaigns_live:       3,
  },

  financialTransactions: [
    { id: 'txn_1', description: 'AWS Cloud Infrastructure',  amount: -18400, type: 'expense', date: daysAgo(2),  category: 'Infrastructure' },
    { id: 'txn_2', description: 'Enterprise License — Acme', amount: 84000,  type: 'income',  date: daysAgo(3),  category: 'Subscription'   },
    { id: 'txn_3', description: 'Marketing Agency Retainer', amount: -12000, type: 'expense', date: daysAgo(5),  category: 'Marketing'      },
    { id: 'txn_4', description: 'Nexus Inc. Renewal',        amount: 120000, type: 'income',  date: daysAgo(7),  category: 'Subscription'   },
    { id: 'txn_5', description: 'Office & Facilities Q2',    amount: -8600,  type: 'expense', date: daysAgo(10), category: 'Operations'     },
    { id: 'txn_6', description: 'Aurora Tech New Business',  amount: 62000,  type: 'income',  date: daysAgo(12), category: 'New Business'   },
  ],

  taxPlans: [
    { id: 'tax_1', name: 'R&D Tax Credit 2024',        estimated_saving: 48000, status: 'approved', due_date: daysAhead(90)  },
    { id: 'tax_2', name: 'QSBS Election — Series A',   estimated_saving: 210000,status: 'pending',  due_date: daysAhead(180) },
    { id: 'tax_3', name: 'State Nexus Review',         estimated_saving: 12000, status: 'in_review',due_date: daysAhead(45)  },
  ],

  investments: [
    { id: 'inv_1', name: 'Series A — Product Dev',   amount: 500000, type: 'equity',  status: 'deployed', return_pct: null },
    { id: 'inv_2', name: 'T-bills (3-month)',         amount: 200000, type: 'debt',    status: 'active',   return_pct: 5.2  },
    { id: 'inv_3', name: 'Angel — DataCore Startup',  amount: 50000,  type: 'equity',  status: 'active',   return_pct: null },
  ],

  sops: [
    { id: 'sop_1', title: 'Customer Onboarding Process',   category: 'CRM',        version: '2.4', last_updated: daysAgo(14), status: 'active'  },
    { id: 'sop_2', title: 'Incident Response Procedure',   category: 'Network',    version: '3.1', last_updated: daysAgo(7),  status: 'active'  },
    { id: 'sop_3', title: 'Campaign Launch Checklist',     category: 'Marketing',  version: '1.8', last_updated: daysAgo(30), status: 'active'  },
    { id: 'sop_4', title: 'Data Breach Response Plan',     category: 'Security',   version: '1.2', last_updated: daysAgo(60), status: 'review'  },
    { id: 'sop_5', title: 'Employee Offboarding',          category: 'HR',         version: '2.0', last_updated: daysAgo(90), status: 'active'  },
  ],

  workflows: [
    { id: 'wf_1', name: 'Lead → Opportunity Auto-qualify', trigger: 'lead_score > 80', steps: 4, active: true,  runs_30d: 42 },
    { id: 'wf_2', name: 'Alert → Incident Auto-create',    trigger: 'alert_critical',   steps: 3, active: true,  runs_30d: 8  },
    { id: 'wf_3', name: 'Contract Renewal Reminder',       trigger: '60d_before_exp',   steps: 5, active: true,  runs_30d: 3  },
    { id: 'wf_4', name: 'Churn Risk Escalation',           trigger: 'health < 40',      steps: 3, active: false, runs_30d: 0  },
  ],

  goals: [
    { id: 'goal_1', title: 'Reach $5M ARR by Q4 2025',    owner: 'Alex Morgan',  progress: 84, status: 'on_track', due: daysAhead(180) },
    { id: 'goal_2', title: 'Launch EU region by Aug 2025', owner: 'Jamie Lee',   progress: 40, status: 'at_risk',  due: daysAhead(90)  },
    { id: 'goal_3', title: 'Hire 3 enterprise AEs',        owner: 'Sam Torres',  progress: 67, status: 'on_track', due: daysAhead(60)  },
    { id: 'goal_4', title: 'SOC 2 Type II certification',  owner: 'Alex Morgan', progress: 95, status: 'on_track', due: daysAhead(30)  },
    { id: 'goal_5', title: 'Reduce churn to < 5% annual',  owner: 'Priya Mehta', progress: 72, status: 'on_track', due: daysAhead(120) },
  ],

  marketAnalysis: [
    { id: 'ma_1', title: 'CRM Competitive Landscape Q2 2025',    date: daysAgo(14), author: 'Priya Mehta',  status: 'final'   },
    { id: 'ma_2', title: 'Network Security Market Trends',       date: daysAgo(30), author: 'Alex Morgan',  status: 'final'   },
    { id: 'ma_3', title: 'AI in Marketing Automation 2025',      date: daysAgo(7),  author: 'Liam Nguyen',  status: 'draft'   },
  ],

  marketingCampaigns: [
    { id: 'sc_1', name: 'Q2 SMB Webinar Series',     client: 'Internal',       status: 'active',   budget: 8000,   roi_pct: 320 },
    { id: 'sc_2', name: 'Enterprise LinkedIn Push',  client: 'Internal',       status: 'active',   budget: 12000,  roi_pct: 280 },
    { id: 'sc_3', name: 'Partner Co-Marketing',      client: 'Vertex Solutions',status: 'planning', budget: 5000,   roi_pct: null },
  ],

  marketingClients: [
    { id: 'mc_1', name: 'Vertex Solutions',  industry: 'Consulting', campaigns: 2, spend_ytd: 24000, status: 'active' },
    { id: 'mc_2', name: 'Apex Consulting',   industry: 'Services',   campaigns: 1, spend_ytd: 8000,  status: 'active' },
  ],

  teamMembers: [
    { id: 'stm_1', name: 'Alex Morgan',  role: 'Revenue Lead',       department: 'Sales',     status: 'active', projects: 3 },
    { id: 'stm_2', name: 'Jamie Lee',    role: 'Account Executive',  department: 'Sales',     status: 'active', projects: 2 },
    { id: 'stm_3', name: 'Sam Torres',   role: 'Account Executive',  department: 'Sales',     status: 'active', projects: 2 },
    { id: 'stm_4', name: 'Priya Mehta',  role: 'Growth Analyst',     department: 'Marketing', status: 'active', projects: 1 },
    { id: 'stm_5', name: 'Sarah Okafor', role: 'Campaign Manager',   department: 'Marketing', status: 'active', projects: 3 },
    { id: 'stm_6', name: 'Liam Nguyen',  role: 'Content Strategist', department: 'Marketing', status: 'active', projects: 2 },
    { id: 'stm_7', name: 'Raj Patel',    role: 'DevOps Engineer',    department: 'Infra',     status: 'active', projects: 4 },
    { id: 'stm_8', name: 'Dana Park',    role: 'Network Engineer',   department: 'Infra',     status: 'active', projects: 3 },
  ],

  teamProjects: [
    { id: 'proj_1', name: 'ExecUI v3 Launch',         lead: 'Alex Morgan',  status: 'in_progress', progress: 72, due: daysAhead(45)  },
    { id: 'proj_2', name: 'EU Region Expansion',      lead: 'Jamie Lee',    status: 'in_progress', progress: 38, due: daysAhead(90)  },
    { id: 'proj_3', name: 'SOC 2 Certification',      lead: 'Raj Patel',    status: 'in_progress', progress: 94, due: daysAhead(30)  },
    { id: 'proj_4', name: 'Q3 Content Calendar',      lead: 'Liam Nguyen',  status: 'completed',   progress: 100,due: daysAgo(5)     },
    { id: 'proj_5', name: 'Network Infra Upgrade',    lead: 'Dana Park',    status: 'in_progress', progress: 55, due: daysAhead(60)  },
    { id: 'proj_6', name: 'Partner Portal v2',        lead: 'Sam Torres',   status: 'planning',    progress: 10, due: daysAhead(120) },
  ],

  teamTasks: [
    { id: 'stask_1', title: 'Prepare Q3 board deck',       assignee: 'Alex Morgan', project: 'ExecUI v3 Launch',    status: 'in_progress', due: daysAhead(7)  },
    { id: 'stask_2', title: 'EU GDPR compliance review',   assignee: 'Jamie Lee',   project: 'EU Region Expansion', status: 'pending',     due: daysAhead(14) },
    { id: 'stask_3', title: 'Penetration test scheduling', assignee: 'Raj Patel',   project: 'SOC 2 Certification', status: 'completed',   due: daysAgo(3)    },
    { id: 'stask_4', title: 'Write Aug newsletter',        assignee: 'Liam Nguyen', project: 'Q3 Content Calendar', status: 'pending',     due: daysAhead(10) },
  ],
};
