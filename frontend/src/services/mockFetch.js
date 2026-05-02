/**
 * Mock Fetch Interceptor
 *
 * Replaces the global `fetch` with a router that matches API paths and
 * returns realistic mock responses from mockData.js.
 *
 * Activated when VITE_USE_MOCK=true in .env.
 * The real backend is never contacted while this is active.
 */

import {
  mockAuth,
  mockAnalytics,
  mockCrmDashboard,
  mockCrm,
  mockMarketing,
  mockNetworkDashboard,
  mockNetwork,
  mockAccount,
  mockServices,
} from './mockData.js';

// ── Response builders ──────────────────────────────────────────────────────────

function ok(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function noContent() {
  return new Response(null, { status: 204 });
}

function created(data) {
  return ok({ ...data, id: data.id ?? `mock_${Date.now()}` }, 201);
}

// Simulate a short async delay so loading states are visible in the UI.
const DELAY_MS = 300;
function delay() {
  return new Promise((r) => setTimeout(r, DELAY_MS));
}

// ── Path matcher ───────────────────────────────────────────────────────────────
// Returns the first entry whose pattern matches `path` and `method`.
// Pattern is a string (exact) or a RegExp.

function matchRoute(routes, method, path) {
  for (const [routeMethod, pattern, handler] of routes) {
    if (routeMethod !== 'ANY' && routeMethod !== method) continue;
    if (typeof pattern === 'string') {
      if (path === pattern || path.startsWith(pattern + '?')) return handler;
    } else {
      const m = path.match(pattern);
      if (m) return (req) => handler(req, m);
    }
  }
  return null;
}

// ── Route table ────────────────────────────────────────────────────────────────
// [ method, pattern, handler(request, regexMatch?) => Response ]
// Method 'ANY' matches GET, POST, PUT, PATCH, DELETE.

const ROUTES = [
  // ── Auth ──────────────────────────────────────────────────────────────────
  ['POST', '/auth/login',   () => ok(mockAuth.login)],
  ['POST', '/auth/signup',  () => ok(mockAuth.login)],
  ['POST', '/auth/logout',  () => noContent()],
  ['GET',  '/auth/me',      () => ok(mockAuth.me)],
  ['POST', '/auth/refresh', () => ok({ token: mockAuth.login.token })],

  // ── Analytics ─────────────────────────────────────────────────────────────
  ['GET',  '/analytics/kpis',                         () => ok(mockAnalytics.kpis)],
  ['GET',  '/analytics/health-summary',               () => ok(mockAnalytics.healthSummary)],
  ['GET',  '/analytics/revenue-vs-plan',              () => ok(mockAnalytics.revenueVsPlan)],
  ['GET',  '/analytics/operational/services',         () => ok(mockAnalytics.operationalServices)],
  ['GET',  '/analytics/operational/events',           () => ok(mockAnalytics.operationalEvents)],
  ['GET',  '/analytics/cohorts',                      () => ok(mockAnalytics.cohorts)],
  ['GET',  '/analytics/retention/by-tier',            () => ok(mockAnalytics.retentionByTier)],
  ['GET',  '/analytics/churn-signals',                () => ok(mockAnalytics.churnSignals)],
  ['GET',  '/analytics/revenue/segments',             () => ok(mockAnalytics.revenueSegments)],
  ['GET',  '/analytics/revenue/expansion',            () => ok(mockAnalytics.expansionPipeline)],
  ['GET',  '/analytics/data-quality/datasets',        () => ok(mockAnalytics.datasets)],
  ['POST', /^\/analytics\/data-quality\/datasets\/([^/]+)\/deduplicate$/, (_, m) =>
    ok({ id: m[1], message: 'Deduplication started', rows_removed: Math.floor(Math.random() * 200) + 10 })],
  ['GET',  '/analytics/explorer/queries',             () => ok(mockAnalytics.savedQueries)],
  ['POST', '/analytics/explorer/queries',             async (req) => {
    const body = await req.json().catch(() => ({}));
    return created({ ...body, id: `q_${Date.now()}`, created_at: new Date().toISOString() });
  }],
  ['DELETE', /^\/analytics\/explorer\/queries\/([^/]+)$/, () => noContent()],
  ['POST', '/analytics/explorer/run', async (req) => {
    const body = await req.json().catch(() => ({}));
    return ok({
      columns: ['id', 'name', 'value', 'created_at'],
      rows: [
        { id: 1, name: 'Sample Row A', value: 42000, created_at: new Date().toISOString() },
        { id: 2, name: 'Sample Row B', value: 81000, created_at: new Date().toISOString() },
        { id: 3, name: 'Sample Row C', value: 31500, created_at: new Date().toISOString() },
      ],
      query: body.sql ?? '',
      execution_ms: 124,
    });
  }],

  // ── CRM Dashboard (CRMView.jsx direct fetch) ──────────────────────────────
  ['GET', '/crm/dashboard/profile',                       () => ok(mockCrmDashboard.profile)],
  ['GET', /^\/crm\/dashboard\/services\/recent/,          () => ok(mockCrmDashboard.servicesRecent)],
  ['POST', '/crm/dashboard/services/track',               () => ok({ success: true })],
  ['GET', /^\/crm\/dashboard\/tasks/,                     () => ok(mockCrmDashboard.tasks)],
  ['PATCH', /^\/crm\/dashboard\/tasks\/([^/]+)$/,         async (req, m) => {
    const body = await req.json().catch(() => ({}));
    const task = mockCrmDashboard.tasks.find((t) => t.id === m[1]);
    return ok({ ...(task ?? { id: m[1] }), ...body });
  }],
  ['GET', /^\/crm\/dashboard\/tickets/,                   () => ok(mockCrmDashboard.tickets)],
  ['PATCH', /^\/crm\/dashboard\/tickets\/([^/]+)$/,       async (req, m) => {
    const body = await req.json().catch(() => ({}));
    const tkt = mockCrmDashboard.tickets.find((t) => t.id === m[1]);
    return ok({ ...(tkt ?? { id: m[1] }), ...body });
  }],
  ['GET', /^\/crm\/dashboard\/follow-ups/,                () => ok(mockCrmDashboard.followUps)],
  ['GET', '/crm/dashboard/opportunities',                 () => ok(mockCrmDashboard.opportunities)],
  ['GET', '/crm/dashboard/overview',                      () => ok(mockCrmDashboard.overview)],

  // ── CRM Customers ─────────────────────────────────────────────────────────
  ['GET',    /^\/crm\/customers$/,                        () => ok(mockCrm.customers)],
  ['GET',    /^\/crm\/customers\?/,                       () => ok(mockCrm.customers)],
  ['GET',    /^\/crm\/customers\/([^/]+)$/,               (_, m) => {
    const c = mockCrm.customers.find((x) => x.id === m[1]) ?? mockCrm.customers[0];
    return ok(c);
  }],
  ['POST',   '/crm/customers',                            async (req) => {
    const body = await req.json().catch(() => ({}));
    return created({ ...body, id: `cust_${Date.now()}`, created_at: new Date().toISOString() });
  }],
  ['PUT',    /^\/crm\/customers\/([^/]+)$/,               async (req, m) => {
    const body = await req.json().catch(() => ({}));
    const c = mockCrm.customers.find((x) => x.id === m[1]) ?? { id: m[1] };
    return ok({ ...c, ...body });
  }],
  ['DELETE', /^\/crm\/customers\/([^/]+)$/,               () => noContent()],

  // ── CRM Deals ─────────────────────────────────────────────────────────────
  ['GET',    /^\/crm\/deals(\?.*)?$/,                     () => ok(mockCrm.deals)],
  ['GET',    /^\/crm\/deals\/([^/]+)$/,                   (_, m) => {
    const d = mockCrm.deals.find((x) => x.id === m[1]) ?? mockCrm.deals[0];
    return ok(d);
  }],
  ['POST',   '/crm/deals',                                async (req) => {
    const body = await req.json().catch(() => ({}));
    return created({ ...body, id: `deal_${Date.now()}` });
  }],
  ['PUT',    /^\/crm\/deals\/([^/]+)$/,                   async (req, m) => {
    const body = await req.json().catch(() => ({}));
    const d = mockCrm.deals.find((x) => x.id === m[1]) ?? { id: m[1] };
    return ok({ ...d, ...body });
  }],
  ['GET',    /^\/crm\/deals\/([^/]+)\/timeline$/,         (_, m) => ok([
    { event: 'Deal created',          ts: new Date(Date.now() - 30 * 86400000).toISOString() },
    { event: 'Moved to Proposal',     ts: new Date(Date.now() - 20 * 86400000).toISOString() },
    { event: 'Demo completed',        ts: new Date(Date.now() - 10 * 86400000).toISOString() },
    { event: 'Contract sent',         ts: new Date(Date.now() - 5  * 86400000).toISOString() },
  ])],
  ['GET',    /^\/crm\/deals\/([^/]+)\/tasks$/,            () => ok(mockCrm.tasks)],
  ['POST',   /^\/crm\/deals\/([^/]+)\/tasks$/,            async (req) => {
    const body = await req.json().catch(() => ({}));
    return created({ ...body, id: `ct_${Date.now()}` });
  }],
  ['PUT',    /^\/crm\/deals\/([^/]+)\/tasks\/([^/]+)$/,   async (req) => {
    const body = await req.json().catch(() => ({}));
    return ok(body);
  }],
  ['GET',    /^\/crm\/deals\/([^/]+)\/audit$/,            () => ok([
    { user: 'Alex Morgan', action: 'Updated stage', ts: new Date().toISOString() },
    { user: 'Jamie Lee',   action: 'Added note',    ts: new Date(Date.now() - 86400000).toISOString() },
  ])],

  // ── CRM Leads ─────────────────────────────────────────────────────────────
  ['GET',    /^\/crm\/leads(\?.*)?$/,                     () => ok(mockCrm.leads)],
  ['GET',    /^\/crm\/leads\/([^/]+)$/,                   (_, m) => {
    const l = mockCrm.leads.find((x) => x.id === m[1]) ?? mockCrm.leads[0];
    return ok(l);
  }],
  ['POST',   '/crm/leads',                                async (req) => {
    const body = await req.json().catch(() => ({}));
    return created({ ...body, id: `lead_${Date.now()}` });
  }],
  ['PUT',    /^\/crm\/leads\/([^/]+)$/,                   async (req, m) => {
    const body = await req.json().catch(() => ({}));
    const l = mockCrm.leads.find((x) => x.id === m[1]) ?? { id: m[1] };
    return ok({ ...l, ...body });
  }],
  ['GET',    /^\/crm\/leads\/activity/,                   () => ok(mockCrm.leads.map((l) => ({
    ...l, action: 'Email opened', ts: new Date().toISOString(),
  })))],

  // ── CRM Tasks ─────────────────────────────────────────────────────────────
  ['GET',    /^\/crm\/tasks/,                             () => ok(mockCrm.tasks)],
  ['POST',   '/crm/tasks',                                async (req) => {
    const body = await req.json().catch(() => ({}));
    return created({ ...body, id: `ct_${Date.now()}` });
  }],
  ['PUT',    /^\/crm\/tasks\/([^/]+)$/,                   async (req, m) => {
    const body = await req.json().catch(() => ({}));
    const t = mockCrm.tasks.find((x) => x.id === m[1]) ?? { id: m[1] };
    return ok({ ...t, ...body });
  }],
  ['POST',   /^\/crm\/tasks\/([^/]+)\/complete$/,         (_, m) => ok({ id: m[1], status: 'completed' })],

  // ── CRM Sequences ─────────────────────────────────────────────────────────
  ['GET',    '/crm/sequences',                            () => ok(mockCrm.sequences)],
  ['POST',   '/crm/sequences',                            async (req) => {
    const body = await req.json().catch(() => ({}));
    return created({ ...body, id: `seq_${Date.now()}` });
  }],

  // ── CRM Forecast ──────────────────────────────────────────────────────────
  ['GET', '/crm/forecast/summary',    () => ok(mockCrm.forecastSummary)],
  ['GET', '/crm/forecast/by-rep',     () => ok(mockCrm.forecastByRep)],
  ['GET', '/crm/forecast/categories', () => ok(mockCrm.forecastCategories)],

  // ── CRM Pipeline ──────────────────────────────────────────────────────────
  ['GET', /^\/crm\/pipeline\/summary/, () => ok(mockCrm.pipelineSummary)],
  ['GET', '/crm/pipeline/owners',       () => ok(mockCrm.pipelineOwners)],

  // ── CRM AI ────────────────────────────────────────────────────────────────
  ['POST', '/crm/ai/chat',      async (req) => {
    const body = await req.json().catch(() => ({}));
    return ok({
      reply: `[Mock AI] You asked: "${body.message ?? '...'}". Based on current pipeline data, I recommend following up with Acme Corp as their renewal is 25 days away and they have an open high-priority ticket.`,
      ts: new Date().toISOString(),
    });
  }],
  ['POST', '/crm/ai/summaries', async (req) => {
    const body = await req.json().catch(() => ({}));
    return ok({ summary: `[Mock AI] Summary for ${body.entity ?? 'entity'}: Strong engagement, 2 open tasks, renewal on track.` });
  }],
  ['POST', '/crm/ai/action',    async (req) => {
    const body = await req.json().catch(() => ({}));
    return ok({ result: `[Mock AI] Action "${body.action ?? 'unknown'}" executed successfully.` });
  }],

  // ── CRM Analytics ─────────────────────────────────────────────────────────
  ['GET', '/crm/analytics/summary',  () => ok(mockCrm.analyticsSummary)],
  ['GET', '/crm/analytics/funnel',   () => ok(mockCrm.analyticsFunnel)],
  ['GET', '/crm/analytics/velocity', () => ok(mockCrm.analyticsVelocity)],
  ['GET', '/crm/analytics/win-loss', () => ok(mockCrm.analyticsWinLoss)],

  // ── CRM Opportunities ─────────────────────────────────────────────────────
  ['GET',  '/crm/opportunities/summary', () => ok(mockCrm.opportunitiesSummary)],
  ['GET',  /^\/crm\/opportunities/,      () => ok(mockCrm.opportunities)],
  ['POST', '/crm/opportunities',         async (req) => {
    const body = await req.json().catch(() => ({}));
    return created({ ...body, id: `opp_${Date.now()}` });
  }],

  // ── CRM Renewals ──────────────────────────────────────────────────────────
  ['GET', '/crm/renewals/summary', () => ok(mockCrm.renewalsSummary)],
  ['GET', /^\/crm\/renewals/,      () => ok(mockCrm.renewals)],

  // ── CRM Cases ─────────────────────────────────────────────────────────────
  ['GET',  /^\/crm\/cases(\?.*)?$/,                 () => ok(mockCrm.cases)],
  ['GET',  /^\/crm\/cases\/([^/]+)$/,               (_, m) => {
    const c = mockCrm.cases.find((x) => x.id === m[1]) ?? mockCrm.cases[0];
    return ok(c);
  }],
  ['PUT',  /^\/crm\/cases\/([^/]+)$/,               async (req, m) => {
    const body = await req.json().catch(() => ({}));
    const c = mockCrm.cases.find((x) => x.id === m[1]) ?? { id: m[1] };
    return ok({ ...c, ...body });
  }],
  ['POST', /^\/crm\/cases\/([^/]+)\/notes$/,        async (req) => {
    const body = await req.json().catch(() => ({}));
    return created({ ...body, id: `note_${Date.now()}` });
  }],
  ['POST', /^\/crm\/cases\/([^/]+)\/approve$/,      (_, m) => ok({ id: m[1], status: 'approved' })],
  ['POST', /^\/crm\/cases\/([^/]+)\/lock$/,         (_, m) => ok({ id: m[1], locked: true  })],
  ['POST', /^\/crm\/cases\/([^/]+)\/unlock$/,       (_, m) => ok({ id: m[1], locked: false })],

  // ── CRM Playbooks ─────────────────────────────────────────────────────────
  ['GET',  '/crm/playbooks',                         () => ok(mockCrm.playbooks)],
  ['GET',  /^\/crm\/playbooks\/([^/]+)$/,            (_, m) => {
    const p = mockCrm.playbooks.find((x) => x.id === m[1]) ?? mockCrm.playbooks[0];
    return ok(p);
  }],
  ['POST', '/crm/playbooks',                         async (req) => {
    const body = await req.json().catch(() => ({}));
    return created({ ...body, id: `pb_${Date.now()}` });
  }],
  ['POST', /^\/crm\/playbooks\/([^/]+)\/run$/,       (_, m) => ok({ id: m[1], status: 'running', started_at: new Date().toISOString() })],

  // ── CRM Partners ──────────────────────────────────────────────────────────
  ['GET', '/crm/partners',              () => ok(mockCrm.partners)],
  ['GET', /^\/crm\/partners\/([^/]+)$/, (_, m) => {
    const p = mockCrm.partners.find((x) => x.id === m[1]) ?? mockCrm.partners[0];
    return ok(p);
  }],

  // ── CRM Meetings ──────────────────────────────────────────────────────────
  ['GET',  /^\/crm\/meetings/,  () => ok(mockCrm.meetings)],
  ['POST', '/crm/meetings',     async (req) => {
    const body = await req.json().catch(() => ({}));
    return created({ ...body, id: `mtg_${Date.now()}` });
  }],

  // ── CRM Reps ──────────────────────────────────────────────────────────────
  ['GET', '/crm/reps/summary', () => ok(mockCrm.repsSummary)],
  ['GET', /^\/crm\/reps/,      () => ok(mockCrm.reps)],

  // ── CRM Integrations ──────────────────────────────────────────────────────
  ['GET',  '/crm/integrations',               () => ok(mockCrm.integrations)],
  ['GET',  /^\/crm\/integrations\/timeline/,  () => ok(mockCrm.integrationTimeline)],
  ['GET',  '/crm/integrations/lead-sources',  () => ok(mockCrm.leadSources)],
  ['GET',  '/crm/integrations/sync-health',   () => ok(mockCrm.syncHealth)],
  ['POST', '/crm/integrations/sync',          () => ok({ status: 'syncing', started_at: new Date().toISOString() })],

  // ── CRM Database ──────────────────────────────────────────────────────────
  ['GET', /^\/crm\/database\/records/,  () => ok(mockCrm.databaseRecords)],
  ['GET', '/crm/database/usage',        () => ok(mockCrm.databaseUsage)],
  ['GET', /^\/crm\/database\/audit/,    () => ok(mockCrm.databaseAudit)],

  // ── CRM Teams ─────────────────────────────────────────────────────────────
  ['GET',  '/crm/teams',  () => ok(mockCrm.teams)],
  ['POST', '/crm/teams',  async (req) => {
    const body = await req.json().catch(() => ({}));
    return created({ ...body, id: `team_${Date.now()}` });
  }],

  // ── CRM Accounts ──────────────────────────────────────────────────────────
  ['GET',  /^\/crm\/accounts(\?.*)?$/,              () => ok(mockCrm.accounts)],
  ['GET',  /^\/crm\/accounts\/([^/]+)$/,            (_, m) => {
    const a = mockCrm.accounts.find((x) => x.id === m[1]) ?? mockCrm.accounts[0];
    return ok(a);
  }],
  ['GET',  /^\/crm\/accounts\/([^/]+)\/deals$/,     () => ok(mockCrm.deals)],
  ['GET',  /^\/crm\/accounts\/([^/]+)\/timeline$/,  () => ok([
    { event: 'Account created',       ts: new Date(Date.now() - 400 * 86400000).toISOString() },
    { event: 'First purchase',        ts: new Date(Date.now() - 380 * 86400000).toISOString() },
    { event: 'Renewal completed',     ts: new Date(Date.now() - 20  * 86400000).toISOString() },
  ])],
  ['POST', /^\/crm\/accounts\/([^/]+)\/notes$/,     async (req) => {
    const body = await req.json().catch(() => ({}));
    return created({ ...body, id: `note_${Date.now()}` });
  }],

  // ── CRM Resolutions ───────────────────────────────────────────────────────
  ['GET',  '/crm/resolutions',                   () => ok(mockCrm.resolutions)],
  ['POST', /^\/crm\/resolutions\/([^/]+)\/vote$/, async (req, m) => {
    const body = await req.json().catch(() => ({}));
    const r = mockCrm.resolutions.find((x) => x.id === m[1]) ?? mockCrm.resolutions[0];
    const updated = { ...r };
    if (body.type === 'for') updated.votes_for += 1;
    else updated.votes_against += 1;
    return ok(updated);
  }],

  // ── Marketing Campaigns ───────────────────────────────────────────────────
  ['GET',  '/marketing/campaigns/summary',            () => ok(mockMarketing.campaignsSummary)],
  ['GET',  /^\/marketing\/campaigns(\?.*)?$/,         () => ok(mockMarketing.campaigns)],
  ['GET',  /^\/marketing\/campaigns\/([^/]+)$/,       (_, m) => {
    const c = mockMarketing.campaigns.find((x) => x.id === m[1]) ?? mockMarketing.campaigns[0];
    return ok(c);
  }],
  ['POST', '/marketing/campaigns',                    async (req) => {
    const body = await req.json().catch(() => ({}));
    return created({ ...body, id: `camp_${Date.now()}`, status: 'draft' });
  }],
  ['PUT',  /^\/marketing\/campaigns\/([^/]+)$/,       async (req, m) => {
    const body = await req.json().catch(() => ({}));
    const c = mockMarketing.campaigns.find((x) => x.id === m[1]) ?? { id: m[1] };
    return ok({ ...c, ...body });
  }],
  ['POST', /^\/marketing\/campaigns\/([^/]+)\/start$/, (_, m) => ok({ id: m[1], status: 'active'  })],
  ['POST', /^\/marketing\/campaigns\/([^/]+)\/pause$/, (_, m) => ok({ id: m[1], status: 'paused'  })],

  // ── Marketing Attribution ─────────────────────────────────────────────────
  ['GET', '/marketing/attribution/channels', () => ok(mockMarketing.attributionChannels)],
  ['GET', '/marketing/attribution/summary',  () => ok(mockMarketing.attributionSummary)],
  ['GET', '/marketing/attribution/models',   () => ok(mockMarketing.attributionModels)],
  ['GET', '/marketing/attribution/ltv-cac',  () => ok(mockMarketing.attributionLtvCac)],

  // ── Marketing Audiences ───────────────────────────────────────────────────
  ['GET',  /^\/marketing\/audiences(\?.*)?$/,                       () => ok(mockMarketing.audiences)],
  ['GET',  /^\/marketing\/audiences\/([^/]+)$/,                     (_, m) => {
    const a = mockMarketing.audiences.find((x) => x.id === m[1]) ?? mockMarketing.audiences[0];
    return ok(a);
  }],
  ['POST', '/marketing/audiences',                                  async (req) => {
    const body = await req.json().catch(() => ({}));
    return created({ ...body, id: `aud_${Date.now()}`, status: 'building' });
  }],
  ['POST', /^\/marketing\/audiences\/([^/]+)\/activate$/,           (_, m) => ok({ id: m[1], status: 'active' })],
  ['POST', /^\/marketing\/audiences\/([^/]+)\/lookalike$/,          (_, m) => ok({ id: `aud_look_${m[1]}`, source_id: m[1], status: 'building', size: 0 })],
  ['GET',  /^\/marketing\/audiences\/([^/]+)\/overlap$/,            () => ok({ overlap_pct: 18, overlapping_profiles: 2200 })],

  // ── Marketing Analytics ───────────────────────────────────────────────────
  ['GET', '/marketing/analytics/summary',             () => ok(mockMarketing.analyticsSummary)],
  ['GET', /^\/marketing\/analytics\/trend/,           () => ok(mockMarketing.analyticsTrend)],
  ['GET', '/marketing/analytics/channel-performance', () => ok(mockMarketing.analyticsChannelPerf)],

  // ── Marketing Experiments ─────────────────────────────────────────────────
  ['GET',  /^\/marketing\/experiments(\?.*)?$/,               () => ok(mockMarketing.experiments)],
  ['GET',  /^\/marketing\/experiments\/([^/]+)$/,             (_, m) => {
    const e = mockMarketing.experiments.find((x) => x.id === m[1]) ?? mockMarketing.experiments[0];
    return ok(e);
  }],
  ['POST', '/marketing/experiments',                          async (req) => {
    const body = await req.json().catch(() => ({}));
    return created({ ...body, id: `exp_${Date.now()}`, status: 'draft' });
  }],
  ['POST', /^\/marketing\/experiments\/([^/]+)\/start$/,      (_, m) => ok({ id: m[1], status: 'running' })],
  ['POST', /^\/marketing\/experiments\/([^/]+)\/pause$/,      (_, m) => ok({ id: m[1], status: 'paused'  })],

  // ── Marketing Profiles ────────────────────────────────────────────────────
  ['GET', /^\/marketing\/profiles\/search/, () => ok({ profiles: [], total: 0 })],
  ['GET', /^\/marketing\/profiles\/([^/]+)$/, (_, m) => ok({ id: m[1], name: 'Sample Profile', email: 'sample@example.com' })],

  // ── Marketing Teams ───────────────────────────────────────────────────────
  ['GET',  '/marketing/teams/members',     () => ok(mockMarketing.teams)],
  ['GET',  /^\/marketing\/teams\/tasks/,   () => ok(mockMarketing.teamTasks)],
  ['GET',  '/marketing/teams/metrics',     () => ok(mockMarketing.teamMetrics)],
  ['POST', '/marketing/teams/invite',      async (req) => {
    const body = await req.json().catch(() => ({}));
    return ok({ ...body, id: `tm_${Date.now()}`, status: 'pending' });
  }],
  ['POST', '/marketing/teams/tasks',       async (req) => {
    const body = await req.json().catch(() => ({}));
    return created({ ...body, id: `tt_${Date.now()}` });
  }],

  // ── Marketing B2B ─────────────────────────────────────────────────────────
  ['GET',  /^\/marketing\/b2b\/accounts(\?.*)?$/,         () => ok(mockMarketing.b2bAccounts)],
  ['GET',  /^\/marketing\/b2b\/accounts\/([^/]+)$/,       (_, m) => {
    const a = mockMarketing.b2bAccounts.find((x) => x.id === m[1]) ?? mockMarketing.b2bAccounts[0];
    return ok(a);
  }],
  ['GET',  '/marketing/b2b/journeys',                     () => ok(mockMarketing.b2bJourneys)],
  ['GET',  /^\/marketing\/b2b\/journeys\/([^/]+)$/,       (_, m) => {
    const j = mockMarketing.b2bJourneys.find((x) => x.id === m[1]) ?? mockMarketing.b2bJourneys[0];
    return ok(j);
  }],
  ['POST', '/marketing/b2b/journeys',                     async (req) => {
    const body = await req.json().catch(() => ({}));
    return created({ ...body, id: `jrn_${Date.now()}` });
  }],

  // ── Marketing Content ─────────────────────────────────────────────────────
  ['GET',    /^\/marketing\/content\/assets(\?.*)?$/, () => ok(mockMarketing.contentAssets)],
  ['GET',    /^\/marketing\/content\/assets\/([^/]+)$/, (_, m) => {
    const a = mockMarketing.contentAssets.find((x) => x.id === m[1]) ?? mockMarketing.contentAssets[0];
    return ok(a);
  }],
  ['POST',   '/marketing/content/assets',             async (req) => {
    const body = await req.json().catch(() => ({}));
    return created({ ...body, id: `ast_${Date.now()}` });
  }],
  ['DELETE', /^\/marketing\/content\/assets\/([^/]+)$/, () => noContent()],

  // ── Marketing Commerce ────────────────────────────────────────────────────
  ['GET', /^\/marketing\/commerce\/orders/,  () => ok(mockMarketing.commerceOrders)],
  ['GET', '/marketing/commerce/metrics',     () => ok(mockMarketing.commerceMetrics)],

  // ── Marketing Personalization ─────────────────────────────────────────────
  ['GET',  '/marketing/personalization',         () => ok(mockMarketing.personalization)],
  ['GET',  '/marketing/personalization/metrics', () => ok(mockMarketing.personalizationMetrics)],
  ['POST', '/marketing/personalization',         async (req) => {
    const body = await req.json().catch(() => ({}));
    return created({ ...body, id: `pers_${Date.now()}` });
  }],

  // ── Marketing CDP ─────────────────────────────────────────────────────────
  ['GET',  '/marketing/cdp/metrics',       () => ok(mockMarketing.cdpMetrics)],
  ['GET',  '/marketing/cdp/sources',       () => ok(mockMarketing.cdpSources)],
  ['POST', '/marketing/cdp/sources',       async (req) => {
    const body = await req.json().catch(() => ({}));
    return created({ ...body, id: `src_${Date.now()}` });
  }],
  ['POST', '/marketing/cdp/segments',      async (req) => {
    const body = await req.json().catch(() => ({}));
    return created({ ...body, id: `seg_${Date.now()}` });
  }],

  // ── Marketing Flows ───────────────────────────────────────────────────────
  ['GET',  '/marketing/flows',                         () => ok(mockMarketing.flows)],
  ['GET',  /^\/marketing\/flows\/([^/]+)$/,            (_, m) => {
    const f = mockMarketing.flows.find((x) => x.id === m[1]) ?? mockMarketing.flows[0];
    return ok(f);
  }],
  ['GET',  /^\/marketing\/flows\/([^/]+)\/stats$/,     (_, m) => ok({ id: m[1], opens: 840, clicks: 210, conversions: 42 })],
  ['POST', '/marketing/flows',                         async (req) => {
    const body = await req.json().catch(() => ({}));
    return created({ ...body, id: `flow_${Date.now()}` });
  }],
  ['PUT',  /^\/marketing\/flows\/([^/]+)$/,            async (req, m) => {
    const body = await req.json().catch(() => ({}));
    const f = mockMarketing.flows.find((x) => x.id === m[1]) ?? { id: m[1] };
    return ok({ ...f, ...body });
  }],

  // ── Marketing AI ──────────────────────────────────────────────────────────
  ['POST', '/marketing/ai/generate', async (req) => {
    const body = await req.json().catch(() => ({}));
    return ok({
      content: `[Mock AI] Generated ${body.type ?? 'content'} for ${body.context ?? 'your campaign'}:\n\nSubject: "Unlock Your Q3 Growth Potential"\n\nHi {first_name},\n\nWe've identified key opportunities that could accelerate your results by 40%...\n\n— ExecUI Team`,
      tokens_used: 148,
    });
  }],

  // ── Network Dashboard (NetworkView.jsx direct fetch) ──────────────────────
  ['GET', '/network/dashboard/overview',      () => ok(mockNetworkDashboard.overview)],
  ['GET', '/network/dashboard/device-usage',  () => ok(mockNetworkDashboard.deviceUsage)],
  ['GET', '/network/dashboard/storage',       () => ok(mockNetworkDashboard.storage)],

  // ── Network Devices ───────────────────────────────────────────────────────
  ['GET',  /^\/network\/devices(\?.*)?$/,         () => ok(mockNetwork.devices)],
  ['GET',  /^\/network\/devices\/([^/]+)$/,       (_, m) => {
    const d = mockNetwork.devices.find((x) => x.id === m[1]) ?? mockNetwork.devices[0];
    return ok(d);
  }],
  ['PUT',  /^\/network\/devices\/([^/]+)$/,       async (req, m) => {
    const body = await req.json().catch(() => ({}));
    const d = mockNetwork.devices.find((x) => x.id === m[1]) ?? { id: m[1] };
    return ok({ ...d, ...body });
  }],

  // ── Network Alerts ────────────────────────────────────────────────────────
  ['GET',  /^\/network\/alerts(\?.*)?$/,                      () => ok(mockNetwork.alerts)],
  ['POST', /^\/network\/alerts\/([^/]+)\/acknowledge$/,       (_, m) => ok({ id: m[1], status: 'acknowledged' })],
  ['POST', /^\/network\/alerts\/([^/]+)\/resolve$/,           (_, m) => ok({ id: m[1], status: 'resolved'     })],

  // ── Network Traffic ───────────────────────────────────────────────────────
  ['GET', '/network/traffic/overview',   () => ok(mockNetwork.trafficOverview)],
  ['GET', '/network/traffic/top-talkers',() => ok(mockNetwork.topTalkers)],
  ['GET', '/network/traffic/protocols',  () => ok(mockNetwork.protocols)],
  ['GET', '/network/traffic/anomalies',  () => ok(mockNetwork.trafficAnomalies)],

  // ── Network Topology ──────────────────────────────────────────────────────
  ['GET', '/network/topology/regions', () => ok(mockNetwork.topologyRegions)],
  ['GET', '/network/topology/nodes',   () => ok(mockNetwork.topologyNodes)],
  ['GET', '/network/topology/links',   () => ok(mockNetwork.topologyLinks)],

  // ── Network Incidents ─────────────────────────────────────────────────────
  ['GET',  /^\/network\/incidents(\?.*)?$/,                   () => ok(mockNetwork.incidents)],
  ['GET',  /^\/network\/incidents\/([^/]+)$/,                 (_, m) => {
    const i = mockNetwork.incidents.find((x) => x.id === m[1]) ?? mockNetwork.incidents[0];
    return ok(i);
  }],
  ['POST', '/network/incidents',                              async (req) => {
    const body = await req.json().catch(() => ({}));
    return created({ ...body, id: `inc_${Date.now()}`, status: 'open' });
  }],
  ['PUT',  /^\/network\/incidents\/([^/]+)$/,                 async (req, m) => {
    const body = await req.json().catch(() => ({}));
    const i = mockNetwork.incidents.find((x) => x.id === m[1]) ?? { id: m[1] };
    return ok({ ...i, ...body });
  }],
  ['GET',  /^\/network\/incidents\/([^/]+)\/timeline$/,       () => ok([
    { event: 'Incident opened',      ts: new Date(Date.now() - 2 * 3600000).toISOString() },
    { event: 'Assigned to ops-team', ts: new Date(Date.now() - 1.5 * 3600000).toISOString() },
    { event: 'Investigation started',ts: new Date(Date.now() - 1 * 3600000).toISOString() },
  ])],
  ['POST', /^\/network\/incidents\/([^/]+)\/resolve$/,        (_, m) => ok({ id: m[1], status: 'resolved'  })],
  ['POST', /^\/network\/incidents\/([^/]+)\/escalate$/,       (_, m) => ok({ id: m[1], status: 'escalated' })],

  // ── Network Service Health ────────────────────────────────────────────────
  ['GET', '/network/service-health',              () => ok(mockNetwork.serviceHealth)],
  ['GET', /^\/network\/service-health\/([^/]+)$/, (_, m) => {
    const s = mockNetwork.serviceHealth.find((x) => x.id === m[1]) ?? mockNetwork.serviceHealth[0];
    return ok(s);
  }],

  // ── Network Capacity ──────────────────────────────────────────────────────
  ['GET', '/network/capacity/links',   () => ok(mockNetwork.capacityLinks)],
  ['GET', '/network/capacity/summary', () => ok(mockNetwork.capacitySummary)],

  // ── Network Automation ────────────────────────────────────────────────────
  ['GET',  /^\/network\/automation\/jobs(\?.*)?$/,            () => ok(mockNetwork.automationJobs)],
  ['GET',  '/network/automation/templates',                   () => ok(mockNetwork.automationTemplates)],
  ['POST', /^\/network\/automation\/jobs\/([^/]+)\/run$/,     (_, m) => ok({ id: m[1], status: 'running', started_at: new Date().toISOString() })],
  ['POST', '/network/automation/jobs',                        async (req) => {
    const body = await req.json().catch(() => ({}));
    return created({ ...body, id: `job_${Date.now()}`, status: 'pending' });
  }],

  // ── Network Changes ───────────────────────────────────────────────────────
  ['GET',  /^\/network\/changes(\?.*)?$/,                     () => ok(mockNetwork.changes)],
  ['GET',  /^\/network\/changes\/([^/]+)$/,                   (_, m) => {
    const c = mockNetwork.changes.find((x) => x.id === m[1]) ?? mockNetwork.changes[0];
    return ok(c);
  }],
  ['POST', '/network/changes',                                async (req) => {
    const body = await req.json().catch(() => ({}));
    return created({ ...body, id: `chg_${Date.now()}`, status: 'pending' });
  }],
  ['POST', /^\/network\/changes\/([^/]+)\/approve$/,          (_, m) => ok({ id: m[1], status: 'approved' })],
  ['POST', /^\/network\/changes\/([^/]+)\/reject$/,           (_, m) => ok({ id: m[1], status: 'rejected' })],

  // ── Network Docs ──────────────────────────────────────────────────────────
  ['GET', '/network/docs',              () => ok(mockNetwork.docs)],
  ['GET', /^\/network\/docs\/([^/]+)$/, (_, m) => {
    const d = mockNetwork.docs.find((x) => x.id === m[1]) ?? mockNetwork.docs[0];
    return ok({ ...d, content: `# ${d.title}\n\nThis is mock documentation content for testing purposes.` });
  }],

  // ── Network Policies ──────────────────────────────────────────────────────
  ['GET',  '/network/policies',                           () => ok(mockNetwork.policies)],
  ['POST', /^\/network\/policies\/([^/]+)\/check$/,       (_, m) => ok({ id: m[1], status: 'compliant', issues: [] })],

  // ── Network Settings ──────────────────────────────────────────────────────
  ['GET', '/network/settings',                    () => ok(mockNetwork.settings)],
  ['PUT', '/network/settings',                    async (req) => {
    const body = await req.json().catch(() => ({}));
    return ok({ ...mockNetwork.settings, ...body });
  }],
  ['GET', '/network/settings/profiles',           () => ok(mockNetwork.settingsProfiles)],
  ['GET', /^\/network\/settings\/profiles\/([^/]+)$/, (_, m) => {
    const p = mockNetwork.settingsProfiles.find((x) => x.id === m[1]) ?? mockNetwork.settingsProfiles[0];
    return ok(p);
  }],
  ['PUT', /^\/network\/settings\/profiles\/([^/]+)$/, async (req, m) => {
    const body = await req.json().catch(() => ({}));
    const p = mockNetwork.settingsProfiles.find((x) => x.id === m[1]) ?? { id: m[1] };
    return ok({ ...p, ...body });
  }],

  // ── Account Profile ───────────────────────────────────────────────────────
  ['GET', '/account/profile',        () => ok(mockAccount.profile)],
  ['PUT', '/account/profile',        async (req) => {
    const body = await req.json().catch(() => ({}));
    return ok({ ...mockAccount.profile, ...body });
  }],
  ['POST', '/account/profile/avatar', () => ok({ avatar_url: '/mock-avatar.png' })],

  // ── Account Security ──────────────────────────────────────────────────────
  ['GET',  '/account/security',               () => ok(mockAccount.security)],
  ['POST', '/account/security/password',      () => ok({ message: 'Password updated successfully.' })],
  ['POST', '/account/security/mfa/enable',    () => ok({ qr_code: 'data:image/png;base64,mock', secret: 'MOCK_MFA_SECRET' })],
  ['POST', '/account/security/mfa/disable',   () => ok({ message: 'MFA disabled.' })],
  ['POST', '/account/security/mfa/verify',    () => ok({ verified: true })],
  ['GET',  '/account/security/sessions',      () => ok(mockAccount.sessions)],
  ['DELETE', /^\/account\/security\/sessions\/([^/]+)$/, () => noContent()],

  // ── Account API Keys ──────────────────────────────────────────────────────
  ['GET',    '/account/api-keys',                          () => ok(mockAccount.apiKeys)],
  ['POST',   '/account/api-keys',                          async (req) => {
    const body = await req.json().catch(() => ({}));
    return created({ ...body, id: `key_${Date.now()}`, prefix: 'eui_new_***', key: 'eui_new_mock_key_shown_once' });
  }],
  ['DELETE', /^\/account\/api-keys\/([^/]+)$/,             () => noContent()],
  ['POST',   /^\/account\/api-keys\/([^/]+)\/rotate$/,     (_, m) => ok({ id: m[1], key: 'eui_rotated_mock_key_shown_once', prefix: 'eui_rot_***' })],

  // ── Account Notifications ─────────────────────────────────────────────────
  ['GET', '/account/notifications/preferences',       () => ok(mockAccount.notificationPreferences)],
  ['PUT', '/account/notifications/preferences',       async (req) => {
    const body = await req.json().catch(() => ({}));
    return ok({ ...mockAccount.notificationPreferences, ...body });
  }],

  // ── Account Team ──────────────────────────────────────────────────────────
  ['GET',    '/account/team/members',              () => ok(mockAccount.teamMembers)],
  ['POST',   '/account/team/invite',               async (req) => {
    const body = await req.json().catch(() => ({}));
    return ok({ ...body, id: `tm_${Date.now()}`, status: 'pending' });
  }],
  ['PUT',    /^\/account\/team\/members\/([^/]+)$/, async (req, m) => {
    const body = await req.json().catch(() => ({}));
    const m2 = mockAccount.teamMembers.find((x) => x.id === m[1]) ?? { id: m[1] };
    return ok({ ...m2, ...body });
  }],
  ['DELETE', /^\/account\/team\/members\/([^/]+)$/, () => noContent()],
  ['GET',    '/account/team/roles',                 () => ok(mockAccount.roles)],

  // ── Account Billing ───────────────────────────────────────────────────────
  ['GET',  '/account/billing',                () => ok(mockAccount.billing)],
  ['GET',  '/account/billing/plans',          () => ok(mockAccount.billingPlans)],
  ['POST', '/account/billing/upgrade',        async (req) => {
    const body = await req.json().catch(() => ({}));
    return ok({ ...mockAccount.billing, plan: body.plan ?? mockAccount.billing.plan });
  }],
  ['GET',  '/account/billing/payment-methods',() => ok(mockAccount.paymentMethods)],
  ['GET',  '/account/billing/invoices',       () => ok(mockAccount.invoices)],

  // ── Account Audit Logs ────────────────────────────────────────────────────
  ['GET', /^\/account\/audit-logs/, () => ok(mockAccount.auditLogs)],

  // ── Services Dashboard ────────────────────────────────────────────────────
  ['GET', '/services/dashboard/stats', () => ok(mockServices.dashboardStats)],

  // ── Services Financial ────────────────────────────────────────────────────
  ['GET',    '/services/financial/transactions',                    () => ok(mockServices.financialTransactions)],
  ['POST',   '/services/financial/transactions',                    async (req) => {
    const body = await req.json().catch(() => ({}));
    return created({ ...body, id: `txn_${Date.now()}`, date: new Date().toISOString() });
  }],
  ['DELETE', /^\/services\/financial\/transactions\/([^/]+)$/,     () => noContent()],
  ['GET',    '/services/financial/tax-plans',                      () => ok(mockServices.taxPlans)],
  ['POST',   '/services/financial/tax-plans',                      async (req) => {
    const body = await req.json().catch(() => ({}));
    return created({ ...body, id: `tax_${Date.now()}` });
  }],
  ['DELETE', /^\/services\/financial\/tax-plans\/([^/]+)$/,        () => noContent()],
  ['GET',    '/services/financial/investments',                    () => ok(mockServices.investments)],
  ['POST',   '/services/financial/investments',                    async (req) => {
    const body = await req.json().catch(() => ({}));
    return created({ ...body, id: `inv_${Date.now()}` });
  }],
  ['DELETE', /^\/services\/financial\/investments\/([^/]+)$/,      () => noContent()],

  // ── Services Operations ───────────────────────────────────────────────────
  ['GET',    '/services/operations/sops',                          () => ok(mockServices.sops)],
  ['POST',   '/services/operations/sops',                          async (req) => {
    const body = await req.json().catch(() => ({}));
    return created({ ...body, id: `sop_${Date.now()}`, version: '1.0', status: 'draft' });
  }],
  ['PUT',    /^\/services\/operations\/sops\/([^/]+)$/,            async (req, m) => {
    const body = await req.json().catch(() => ({}));
    const s = mockServices.sops.find((x) => x.id === m[1]) ?? { id: m[1] };
    return ok({ ...s, ...body });
  }],
  ['DELETE', /^\/services\/operations\/sops\/([^/]+)$/,            () => noContent()],
  ['GET',    '/services/operations/workflows',                     () => ok(mockServices.workflows)],
  ['POST',   '/services/operations/workflows',                     async (req) => {
    const body = await req.json().catch(() => ({}));
    return created({ ...body, id: `wf_${Date.now()}`, active: false });
  }],
  ['DELETE', /^\/services\/operations\/workflows\/([^/]+)$/,       () => noContent()],

  // ── Services Strategic ────────────────────────────────────────────────────
  ['GET',    '/services/strategic/goals',                          () => ok(mockServices.goals)],
  ['POST',   '/services/strategic/goals',                          async (req) => {
    const body = await req.json().catch(() => ({}));
    return created({ ...body, id: `goal_${Date.now()}`, progress: 0, status: 'on_track' });
  }],
  ['PUT',    /^\/services\/strategic\/goals\/([^/]+)$/,            async (req, m) => {
    const body = await req.json().catch(() => ({}));
    const g = mockServices.goals.find((x) => x.id === m[1]) ?? { id: m[1] };
    return ok({ ...g, ...body });
  }],
  ['DELETE', /^\/services\/strategic\/goals\/([^/]+)$/,            () => noContent()],
  ['GET',    '/services/strategic/market-analysis',               () => ok(mockServices.marketAnalysis)],
  ['POST',   '/services/strategic/market-analysis',               async (req) => {
    const body = await req.json().catch(() => ({}));
    return created({ ...body, id: `ma_${Date.now()}`, status: 'draft' });
  }],
  ['DELETE', /^\/services\/strategic\/market-analysis\/([^/]+)$/,  () => noContent()],

  // ── Services Marketing ────────────────────────────────────────────────────
  ['GET',    '/services/marketing/campaigns',                      () => ok(mockServices.marketingCampaigns)],
  ['POST',   '/services/marketing/campaigns',                      async (req) => {
    const body = await req.json().catch(() => ({}));
    return created({ ...body, id: `sc_${Date.now()}`, status: 'planning' });
  }],
  ['PUT',    /^\/services\/marketing\/campaigns\/([^/]+)$/,        async (req, m) => {
    const body = await req.json().catch(() => ({}));
    const c = mockServices.marketingCampaigns.find((x) => x.id === m[1]) ?? { id: m[1] };
    return ok({ ...c, ...body });
  }],
  ['DELETE', /^\/services\/marketing\/campaigns\/([^/]+)$/,        () => noContent()],
  ['GET',    '/services/marketing/clients',                        () => ok(mockServices.marketingClients)],
  ['POST',   '/services/marketing/clients',                        async (req) => {
    const body = await req.json().catch(() => ({}));
    return created({ ...body, id: `mc_${Date.now()}` });
  }],
  ['PUT',    /^\/services\/marketing\/clients\/([^/]+)$/,          async (req, m) => {
    const body = await req.json().catch(() => ({}));
    const c = mockServices.marketingClients.find((x) => x.id === m[1]) ?? { id: m[1] };
    return ok({ ...c, ...body });
  }],
  ['DELETE', /^\/services\/marketing\/clients\/([^/]+)$/,          () => noContent()],

  // ── Services Team ─────────────────────────────────────────────────────────
  ['GET',    '/services/team/members',                             () => ok(mockServices.teamMembers)],
  ['POST',   '/services/team/members',                             async (req) => {
    const body = await req.json().catch(() => ({}));
    return created({ ...body, id: `stm_${Date.now()}`, status: 'active' });
  }],
  ['PUT',    /^\/services\/team\/members\/([^/]+)$/,               async (req, m) => {
    const body = await req.json().catch(() => ({}));
    const mem = mockServices.teamMembers.find((x) => x.id === m[1]) ?? { id: m[1] };
    return ok({ ...mem, ...body });
  }],
  ['DELETE', /^\/services\/team\/members\/([^/]+)$/,               () => noContent()],
  ['GET',    '/services/team/projects',                            () => ok(mockServices.teamProjects)],
  ['POST',   '/services/team/projects',                            async (req) => {
    const body = await req.json().catch(() => ({}));
    return created({ ...body, id: `proj_${Date.now()}`, progress: 0, status: 'planning' });
  }],
  ['PUT',    /^\/services\/team\/projects\/([^/]+)$/,              async (req, m) => {
    const body = await req.json().catch(() => ({}));
    const p = mockServices.teamProjects.find((x) => x.id === m[1]) ?? { id: m[1] };
    return ok({ ...p, ...body });
  }],
  ['DELETE', /^\/services\/team\/projects\/([^/]+)$/,              () => noContent()],
  ['GET',    '/services/team/tasks',                               () => ok(mockServices.teamTasks)],
  ['POST',   '/services/team/tasks',                               async (req) => {
    const body = await req.json().catch(() => ({}));
    return created({ ...body, id: `stask_${Date.now()}`, status: 'pending' });
  }],
  ['PUT',    /^\/services\/team\/tasks\/([^/]+)$/,                 async (req, m) => {
    const body = await req.json().catch(() => ({}));
    const t = mockServices.teamTasks.find((x) => x.id === m[1]) ?? { id: m[1] };
    return ok({ ...t, ...body });
  }],
  ['DELETE', /^\/services\/team\/tasks\/([^/]+)$/,                 () => noContent()],

  // ── Services AI ───────────────────────────────────────────────────────────
  ['POST', '/services/ai/insights',     async (req) => {
    const body = await req.json().catch(() => ({}));
    return ok({
      insights: [
        `[Mock AI] Based on current data, ${body.context ?? 'your operations'} show positive trends.`,
        'Revenue is tracking 4% above plan for the current quarter.',
        'Customer health scores have improved by 8 points since last month.',
      ],
    });
  }],
  ['POST', '/services/ai/generate-sop', async (req) => {
    const body = await req.json().catch(() => ({}));
    return ok({
      sop: {
        title: body.title ?? 'Generated SOP',
        steps: [
          { step: 1, description: 'Identify stakeholders and define scope' },
          { step: 2, description: 'Document current process flow' },
          { step: 3, description: 'Define success criteria and KPIs' },
          { step: 4, description: 'Assign roles and responsibilities' },
          { step: 5, description: 'Test and validate the procedure' },
          { step: 6, description: 'Publish and train team members' },
        ],
      },
    });
  }],
];

// ── Installer ──────────────────────────────────────────────────────────────────

const _realFetch = window.fetch.bind(window);

function extractPath(url) {
  try {
    const base = window.location.origin;
    const full = url.startsWith('http') ? url : `${base}${url}`;
    const parsed = new URL(full);
    // Strip the /api prefix that the Vite proxy would normally strip.
    const pathname = parsed.pathname.replace(/^\/api/, '');
    return pathname + (parsed.search ? parsed.search : '');
  } catch {
    return url;
  }
}

export function installMockFetch() {
  window.fetch = async function mockFetch(input, init = {}) {
    const url = typeof input === 'string' ? input : input.url;
    const method = (init?.method ?? 'GET').toUpperCase();
    const path = extractPath(url);

    // Only intercept API calls (paths starting with /api or matching our routes).
    // Pass through everything else (static assets, CDN requests).
    if (!url.includes('/api/') && !url.startsWith('/api') && !ROUTES.some(([, p]) => {
      if (typeof p === 'string') return path.startsWith(p.split('?')[0]);
      return p.test(path);
    })) {
      return _realFetch(input, init);
    }

    await delay();

    const req = new Request(typeof input === 'string' ? `http://mock${input}` : input, init);

    const handler = matchRoute(ROUTES, method, path);
    if (handler) {
      try {
        const response = await handler(req);
        return response;
      } catch (err) {
        console.error('[MockFetch] Handler error for', method, path, err);
        return new Response(JSON.stringify({ message: 'Mock handler error', detail: err.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Unmatched route — return a graceful 404 instead of crashing the app.
    console.warn(`[MockFetch] No handler for ${method} ${path}`);
    return new Response(JSON.stringify({ message: `[Mock] No handler: ${method} ${path}` }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  console.info('[MockFetch] Installed — all API calls are intercepted by mock data.');
}
