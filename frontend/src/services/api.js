/**
 * Central API Service Layer
 * All frontend API calls go through this module.
 * Base URL is configured via VITE_API_BASE_URL environment variable.
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';
export const WS_URL = import.meta.env.VITE_WS_URL ?? '';

// ── Token management ───────────────────────────────────────────────────────
function getToken() {
  try {
    const stored = localStorage.getItem('user');
    if (!stored) return null;
    return JSON.parse(stored)?.token ?? null;
  } catch {
    return null;
  }
}

// ── Core request ──────────────────────────────────────────────────────────
async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const body = await response.json();
      message = body?.message ?? body?.error ?? message;
    } catch { /* ignore */ }
    throw new Error(message);
  }

  if (response.status === 204) return null;
  return response.json();
}

const get    = (path, params) => {
  const qs = params ? `?${new URLSearchParams(params)}` : '';
  return request(`${path}${qs}`);
};
const post   = (path, body)   => request(path, { method: 'POST',   body: JSON.stringify(body) });
const put    = (path, body)   => request(path, { method: 'PUT',    body: JSON.stringify(body) });
const patch  = (path, body)   => request(path, { method: 'PATCH',  body: JSON.stringify(body) });
const del    = (path)         => request(path, { method: 'DELETE' });

// ── Auth ──────────────────────────────────────────────────────────────────
export const auth = {
  login:   (credentials) => post('/auth/login', credentials),
  signup:  (data)        => post('/auth/signup', data),
  logout:  ()            => post('/auth/logout'),
  me:      ()            => get('/auth/me'),
  refresh: ()            => post('/auth/refresh'),
};

// ── Analytics ─────────────────────────────────────────────────────────────
export const analytics = {
  kpis:              ()       => get('/analytics/kpis'),
  healthSummary:     ()       => get('/analytics/health-summary'),
  revenueVsPlan:     ()       => get('/analytics/revenue-vs-plan'),
  operationalServices: ()     => get('/analytics/operational/services'),
  operationalEvents:   ()     => get('/analytics/operational/events'),
  cohorts:           ()       => get('/analytics/cohorts'),
  retentionByTier:   ()       => get('/analytics/retention/by-tier'),
  churnSignals:      ()       => get('/analytics/churn-signals'),
  revenueSegments:   ()       => get('/analytics/revenue/segments'),
  expansionPipeline: ()       => get('/analytics/revenue/expansion'),
  datasets:          ()       => get('/analytics/data-quality/datasets'),
  savedQueries:      ()       => get('/analytics/explorer/queries'),
  runQuery:          (body)   => post('/analytics/explorer/run', body),
  saveQuery:         (body)   => post('/analytics/explorer/queries', body),
  deleteQuery:       (id)     => del(`/analytics/explorer/queries/${id}`),
  deduplicateDataset:(id)     => post(`/analytics/data-quality/datasets/${id}/deduplicate`),
};

// ── CRM ───────────────────────────────────────────────────────────────────
export const crm = {
  customers: {
    list:   (params) => get('/crm/customers', params),
    get:    (id)     => get(`/crm/customers/${id}`),
    create: (data)   => post('/crm/customers', data),
    update: (id, d)  => put(`/crm/customers/${id}`, d),
    delete: (id)     => del(`/crm/customers/${id}`),
  },
  deals: {
    list:           (params) => get('/crm/deals', params),
    get:            (id)     => get(`/crm/deals/${id}`),
    create:         (data)   => post('/crm/deals', data),
    update:         (id, d)  => put(`/crm/deals/${id}`, d),
    timeline:       (id)     => get(`/crm/deals/${id}/timeline`),
    tasks:          (id)     => get(`/crm/deals/${id}/tasks`),
    createTask:     (id, d)  => post(`/crm/deals/${id}/tasks`, d),
    updateTask:     (dealId, taskId, d) => put(`/crm/deals/${dealId}/tasks/${taskId}`, d),
    auditTrail:     (id)     => get(`/crm/deals/${id}/audit`),
  },
  leads: {
    list:     (params) => get('/crm/leads', params),
    get:      (id)     => get(`/crm/leads/${id}`),
    create:   (data)   => post('/crm/leads', data),
    update:   (id, d)  => put(`/crm/leads/${id}`, d),
    activity: (params) => get('/crm/leads/activity', params),
  },
  tasks: {
    list:   (params) => get('/crm/tasks', params),
    create: (data)   => post('/crm/tasks', data),
    update: (id, d)  => put(`/crm/tasks/${id}`, d),
    complete:(id)    => post(`/crm/tasks/${id}/complete`),
  },
  sequences: {
    list:   ()     => get('/crm/sequences'),
    create: (data) => post('/crm/sequences', data),
  },
  forecast: {
    summary:    () => get('/crm/forecast/summary'),
    byRep:      () => get('/crm/forecast/by-rep'),
    categories: () => get('/crm/forecast/categories'),
  },
  pipeline: {
    summary: (params) => get('/crm/pipeline/summary', params),
    owners:  ()       => get('/crm/pipeline/owners'),
  },
  ai: {
    chat:      (body) => post('/crm/ai/chat', body),
    summaries: (body) => post('/crm/ai/summaries', body),
    action:    (body) => post('/crm/ai/action', body),
  },
  accounts: {
    list:     (params) => get('/crm/accounts', params),
    get:      (id)     => get(`/crm/accounts/${id}`),
    deals:    (id)     => get(`/crm/accounts/${id}/deals`),
    timeline: (id)     => get(`/crm/accounts/${id}/timeline`),
    addNote:  (id, d)  => post(`/crm/accounts/${id}/notes`, d),
  },
  resolutions: {
    list: ()           => get('/crm/resolutions'),
    vote: (id, type)   => post(`/crm/resolutions/${id}/vote`, { type }),
  },
  analytics: {
    summary:  ()       => get('/crm/analytics/summary'),
    funnel:   ()       => get('/crm/analytics/funnel'),
    velocity: ()       => get('/crm/analytics/velocity'),
    winLoss:  ()       => get('/crm/analytics/win-loss'),
  },
  opportunities: {
    summary: ()        => get('/crm/opportunities/summary'),
    list:    (params)  => get('/crm/opportunities', params),
  },
  renewals: {
    list:    (params)  => get('/crm/renewals', params),
    summary: ()        => get('/crm/renewals/summary'),
  },
  cases: {
    list:    (params)  => get('/crm/cases', params),
    get:     (id)      => get(`/crm/cases/${id}`),
    update:  (id, d)   => put(`/crm/cases/${id}`, d),
    addNote: (id, d)   => post(`/crm/cases/${id}/notes`, d),
    approve: (id)      => post(`/crm/cases/${id}/approve`),
    lock:    (id)      => post(`/crm/cases/${id}/lock`),
    unlock:  (id)      => post(`/crm/cases/${id}/unlock`),
  },
  playbooks: {
    list:   ()         => get('/crm/playbooks'),
    get:    (id)       => get(`/crm/playbooks/${id}`),
    run:    (id)       => post(`/crm/playbooks/${id}/run`),
    create: (data)     => post('/crm/playbooks', data),
  },
  partners: {
    list:    ()        => get('/crm/partners'),
    get:     (id)      => get(`/crm/partners/${id}`),
  },
  meetings: {
    list:    (params)  => get('/crm/meetings', params),
    create:  (data)    => post('/crm/meetings', data),
  },
  reps: {
    list:    (params)  => get('/crm/reps', params),
    summary: ()        => get('/crm/reps/summary'),
  },
  integrations: {
    list:       ()     => get('/crm/integrations'),
    timeline:   (params) => get('/crm/integrations/timeline', params),
    leadSources:()     => get('/crm/integrations/lead-sources'),
    syncHealth: ()     => get('/crm/integrations/sync-health'),
    sync:       ()     => post('/crm/integrations/sync'),
  },
  database: {
    records: (params)  => get('/crm/database/records', params),
    usage:   ()        => get('/crm/database/usage'),
    auditTrail: (params) => get('/crm/database/audit', params),
  },
  teams: {
    list:   ()         => get('/crm/teams'),
    create: (data)     => post('/crm/teams', data),
  },
};

// ── Marketing ─────────────────────────────────────────────────────────────
export const marketing = {
  campaigns: {
    list:    (params) => get('/marketing/campaigns', params),
    get:     (id)     => get(`/marketing/campaigns/${id}`),
    create:  (data)   => post('/marketing/campaigns', data),
    update:  (id, d)  => put(`/marketing/campaigns/${id}`, d),
    start:   (id)     => post(`/marketing/campaigns/${id}/start`),
    pause:   (id)     => post(`/marketing/campaigns/${id}/pause`),
    summary: ()       => get('/marketing/campaigns/summary'),
  },
  attribution: {
    channels: ()       => get('/marketing/attribution/channels'),
    summary:  ()       => get('/marketing/attribution/summary'),
    models:   ()       => get('/marketing/attribution/models'),
    ltvCac:   ()       => get('/marketing/attribution/ltv-cac'),
  },
  audiences: {
    list:            (params) => get('/marketing/audiences', params),
    get:             (id)     => get(`/marketing/audiences/${id}`),
    create:          (data)   => post('/marketing/audiences', data),
    activate:        (id, d)  => post(`/marketing/audiences/${id}/activate`, d),
    createLookalike: (id)     => post(`/marketing/audiences/${id}/lookalike`),
    overlap:         (id)     => get(`/marketing/audiences/${id}/overlap`),
  },
  analytics: {
    summary:     ()       => get('/marketing/analytics/summary'),
    trend:       (params) => get('/marketing/analytics/trend', params),
    channelPerf: ()       => get('/marketing/analytics/channel-performance'),
  },
  experiments: {
    list:   (params) => get('/marketing/experiments', params),
    get:    (id)     => get(`/marketing/experiments/${id}`),
    create: (data)   => post('/marketing/experiments', data),
    start:  (id)     => post(`/marketing/experiments/${id}/start`),
    pause:  (id)     => post(`/marketing/experiments/${id}/pause`),
  },
  profiles: {
    search: (params) => get('/marketing/profiles/search', params),
    get:    (id)     => get(`/marketing/profiles/${id}`),
  },
  teams: {
    list:    ()       => get('/marketing/teams/members'),
    tasks:   (params) => get('/marketing/teams/tasks', params),
    metrics: ()       => get('/marketing/teams/metrics'),
    invite:  (data)   => post('/marketing/teams/invite', data),
    createTask: (data)=> post('/marketing/teams/tasks', data),
  },
  b2b: {
    accounts: {
      list: (params) => get('/marketing/b2b/accounts', params),
      get:  (id)     => get(`/marketing/b2b/accounts/${id}`),
    },
    journeys: {
      list:   ()     => get('/marketing/b2b/journeys'),
      get:    (id)   => get(`/marketing/b2b/journeys/${id}`),
      create: (data) => post('/marketing/b2b/journeys', data),
    },
  },
  content: {
    assets: {
      list:   (params) => get('/marketing/content/assets', params),
      get:    (id)     => get(`/marketing/content/assets/${id}`),
      upload: (data)   => post('/marketing/content/assets', data),
      delete: (id)     => del(`/marketing/content/assets/${id}`),
    },
  },
  commerce: {
    orders:  (params) => get('/marketing/commerce/orders', params),
    metrics: ()       => get('/marketing/commerce/metrics'),
  },
  personalization: {
    list:    ()       => get('/marketing/personalization'),
    metrics: ()       => get('/marketing/personalization/metrics'),
    create:  (data)   => post('/marketing/personalization', data),
  },
  cdp: {
    metrics: () => get('/marketing/cdp/metrics'),
    sources: () => get('/marketing/cdp/sources'),
  },
  flows: {
    list:   ()       => get('/marketing/flows'),
    get:    (id)     => get(`/marketing/flows/${id}`),
    stats:  (id)     => get(`/marketing/flows/${id}/stats`),
    create: (data)   => post('/marketing/flows', data),
    update: (id, d)  => put(`/marketing/flows/${id}`, d),
  },
  ai: {
    generate: (body) => post('/marketing/ai/generate', body),
  },
};

// ── Network ───────────────────────────────────────────────────────────────
export const network = {
  devices: {
    list:   (params) => get('/network/devices', params),
    get:    (id)     => get(`/network/devices/${id}`),
    update: (id, d)  => put(`/network/devices/${id}`, d),
  },
  alerts: {
    list:         (params) => get('/network/alerts', params),
    acknowledge:  (id)     => post(`/network/alerts/${id}/acknowledge`),
    resolve:      (id)     => post(`/network/alerts/${id}/resolve`),
  },
  traffic: {
    overview:    () => get('/network/traffic/overview'),
    topTalkers:  () => get('/network/traffic/top-talkers'),
    protocols:   () => get('/network/traffic/protocols'),
    anomalies:   () => get('/network/traffic/anomalies'),
  },
  topology: {
    regions: () => get('/network/topology/regions'),
    nodes:   () => get('/network/topology/nodes'),
    links:   () => get('/network/topology/links'),
  },
  incidents: {
    list:     (params) => get('/network/incidents', params),
    get:      (id)     => get(`/network/incidents/${id}`),
    create:   (data)   => post('/network/incidents', data),
    update:   (id, d)  => put(`/network/incidents/${id}`, d),
    timeline: (id)     => get(`/network/incidents/${id}/timeline`),
    resolve:  (id)     => post(`/network/incidents/${id}/resolve`),
    escalate: (id)     => post(`/network/incidents/${id}/escalate`),
  },
  serviceHealth: {
    list:    ()        => get('/network/service-health'),
    get:     (id)      => get(`/network/service-health/${id}`),
  },
  capacity: {
    links:   ()        => get('/network/capacity/links'),
    summary: ()        => get('/network/capacity/summary'),
  },
  automation: {
    jobs:      (params) => get('/network/automation/jobs', params),
    templates: ()       => get('/network/automation/templates'),
    run:       (id)     => post(`/network/automation/jobs/${id}/run`),
    create:    (data)   => post('/network/automation/jobs', data),
  },
  changes: {
    list:    (params) => get('/network/changes', params),
    get:     (id)     => get(`/network/changes/${id}`),
    create:  (data)   => post('/network/changes', data),
    approve: (id)     => post(`/network/changes/${id}/approve`),
    reject:  (id)     => post(`/network/changes/${id}/reject`),
  },
  docs: {
    list: ()   => get('/network/docs'),
    get:  (id) => get(`/network/docs/${id}`),
  },
  policies: {
    list:  ()   => get('/network/policies'),
    check: (id) => post(`/network/policies/${id}/check`),
  },
  settings: {
    get:      ()     => get('/network/settings'),
    update:   (data) => put('/network/settings', data),
    profiles: {
      list:   ()     => get('/network/settings/profiles'),
      get:    (id)   => get(`/network/settings/profiles/${id}`),
      update: (id,d) => put(`/network/settings/profiles/${id}`, d),
    },
  },
};

// ── Account ───────────────────────────────────────────────────────────────
export const account = {
  profile: {
    get:    ()     => get('/account/profile'),
    update: (data) => put('/account/profile', data),
    avatar: (file) => {
      const form = new FormData();
      form.append('avatar', file);
      return request('/account/profile/avatar', {
        method: 'POST',
        body: form,
        headers: {},           // let browser set multipart boundary
      });
    },
  },
  security: {
    get:            ()     => get('/account/security'),
    changePassword: (data) => post('/account/security/password', data),
    mfa:            {
      enable:  ()     => post('/account/security/mfa/enable'),
      disable: ()     => post('/account/security/mfa/disable'),
      verify:  (data) => post('/account/security/mfa/verify', data),
    },
    sessions: {
      list:   ()   => get('/account/security/sessions'),
      revoke: (id) => del(`/account/security/sessions/${id}`),
    },
  },
  apiKeys: {
    list:   ()     => get('/account/api-keys'),
    create: (data) => post('/account/api-keys', data),
    delete: (id)   => del(`/account/api-keys/${id}`),
    rotate: (id)   => post(`/account/api-keys/${id}/rotate`),
  },
  notifications: {
    preferences:       ()     => get('/account/notifications/preferences'),
    updatePreferences: (data) => put('/account/notifications/preferences', data),
  },
  team: {
    list:   ()         => get('/account/team/members'),
    invite: (data)     => post('/account/team/invite', data),
    update: (id, data) => put(`/account/team/members/${id}`, data),
    remove: (id)       => del(`/account/team/members/${id}`),
    roles:  ()         => get('/account/team/roles'),
  },
  billing: {
    get:             ()     => get('/account/billing'),
    plans:           ()     => get('/account/billing/plans'),
    upgrade:         (data) => post('/account/billing/upgrade', data),
    paymentMethods:  ()     => get('/account/billing/payment-methods'),
    invoices:        ()     => get('/account/billing/invoices'),
  },
  auditLogs: {
    list: (params) => get('/account/audit-logs', params),
  },
};
