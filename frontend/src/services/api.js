/**
 * Central API Service Layer
 * All frontend API calls go through this module.
 * Base URL is configured via VITE_API_BASE_URL environment variable.
 */

// Default to "/api" even if the env var is missing, so requests still hit the
// backend (vite proxies /api in dev; same-origin in prod) instead of falling
// through to the SPA and returning index.html.
const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
export const WS_URL = import.meta.env.VITE_WS_URL ?? '';

// ── Token management ───────────────────────────────────────────────────────
// Simple: always write to / read from a dedicated localStorage key.
// No module-level state = no timing bugs, no HMR issues, no race conditions.

const TOKEN_KEY = 'auth_token';

export function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || null;
  } catch {
    return null;
  }
}

// ── Body reader – tolerant of non-JSON bodies (never throws) ───────────────
// Returns { json, isJson }. A non-JSON body (HTML error page, proxy page, etc.)
// yields { json: null, isJson: false } rather than blowing up the caller.
async function readBody(response) {
  const text = await response.text();
  if (!text) return { json: null, isJson: true };
  try {
    return { json: JSON.parse(text), isJson: true };
  } catch {
    return { json: null, isJson: false };
  }
}

// Clean, human-readable message for responses we couldn't parse as JSON
// (server down, proxy error, gateway timeout, HTML error page, …).
function friendlyError(status) {
  if (status === 0 || status >= 502) return "Can't reach the server — it may be offline or restarting. Please try again in a moment.";
  if (status === 401) return "Your session has expired. Please sign in again.";
  if (status === 403) return "You don't have access to that.";
  if (status === 404) return "Not found.";
  if (status >= 500) return "The server ran into an error. Please try again.";
  return `Request failed (${status}).`;
}

// ── Core request ──────────────────────────────────────────────────────────
async function request(path, options = {}) {
  const token = getToken();
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers = {
    // Let the browser set multipart boundaries for FormData uploads.
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };
  if (isFormData) delete headers['Content-Type'];

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  } catch {
    // Network-level failure (server unreachable, DNS, CORS, aborted).
    throw new Error("Can't reach the server. Check your connection and try again.");
  }

  if (response.status === 204) return null;

  const { json, isJson } = await readBody(response);

  if (!response.ok) {
    // Auto-logout on invalid/expired token
    if (response.status === 401) {
      clearToken();
      localStorage.removeItem('user');
      window.dispatchEvent(new CustomEvent('auth:expired'));
    }
    // Prefer the API's own message; otherwise a clean status-based message
    // (never surface a raw HTML body).
    const message = (isJson && (json?.message ?? json?.error)) || friendlyError(response.status);
    throw new Error(message);
  }

  // 2xx but not JSON usually means the request didn't reach the API at all
  // (e.g. it hit the SPA fallback and got index.html back).
  if (!isJson) {
    throw new Error("Unexpected response from the server. Please refresh and try again.");
  }
  return json;
}

// SSE stream URL for live notifications (EventSource can't set headers,
// so the JWT rides as a query parameter — verified server-side).
export const notificationsStreamUrl = () =>
  `${BASE_URL}/notifications/stream?token=${encodeURIComponent(localStorage.getItem(TOKEN_KEY) ?? '')}`;

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
  login:          (credentials) => post('/auth/login', credentials),
  signup:         (data)        => post('/auth/signup', data),            // register enterprise (admin)
  employeeSignup: (data)        => post('/auth/employee-signup', data),   // employee joins existing enterprise
  logout:         ()            => post('/auth/logout'),
  me:             ()            => get('/auth/me'),
  refresh:        ()            => post('/auth/refresh'),
};

// ── Enterprise / Admin ────────────────────────────────────────────────────
export const enterprise = {
  organization: {
    get:    ()      => get('/users/admin/organization'),
    update: (data)  => put('/users/admin/organization', data),
  },
  workspace: {
    stats:    ()           => get('/users/admin/workspace/stats'),
    sessions: ()           => get('/users/admin/workspace/sessions'),
    audit:    (params)     => get('/users/admin/workspace/audit', params),
  },
  users: {
    list:         ()           => get('/users/admin/users'),
    get:          (id)         => get(`/users/admin/users/${id}`),
    invite:       (data)       => post('/users/admin/invite', data),
    update:       (id, data)   => put(`/users/admin/users/${id}`, data),
    delete:       (id)         => del(`/users/admin/users/${id}`),
    toggleStatus: (id)         => post(`/users/admin/users/${id}/toggle-status`),
  },
  roles: {
    list: () => get('/users/admin/roles'),
  },
};

// ── Views (bootstrap payloads per module) ─────────────────────────────────
export const views = {
  home:      () => get('/views/home'),
  account:   () => get('/views/account'),
  analytics: () => get('/views/analytics'),
  crm:       () => get('/views/crm'),
  marketing: () => get('/views/marketing'),
  network:   () => get('/views/network'),
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
    convert:  (id)     => post(`/crm/leads/${id}/convert`, {}),
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
    create:  (data)    => post('/crm/opportunities', data),
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
  // Industry modules (additive vertical layer)
  industry: {
    get:      ()               => get('/crm/industry'),
    catalog:  ()               => get('/crm/industry/catalog'),
    set:      (industry)       => put('/crm/industry', { industry }),
    records:  (objectType, params) => get(`/crm/industry/records/${objectType}`, params),
    create:   (objectType, data)   => post(`/crm/industry/records/${objectType}`, data),
    stats:    (objectType)     => get(`/crm/industry/stats/${objectType}`),
    update:   (id, data)       => patch(`/crm/industry/records/${id}`, data),
    remove:   (id)             => del(`/crm/industry/records/${id}`),
  },
};

// ── Marketing ─────────────────────────────────────────────────────────────
export const marketing = {
  social: {
    platforms: ()               => get('/marketing/social/platforms'),
    accounts:  ()               => get('/marketing/social/accounts'),
    connect:   (data)           => post('/marketing/social/accounts', data),
    disconnect:(id)             => del(`/marketing/social/accounts/${id}`),
    posts:     (params)         => get('/marketing/social/posts', params),
    createPost:(data)           => post('/marketing/social/posts', data),
    updatePost:(id, data)       => patch(`/marketing/social/posts/${id}`, data),
    deletePost:(id)             => del(`/marketing/social/posts/${id}`),
    publish:   (id)             => post(`/marketing/social/posts/${id}/publish`),
    improve:   (data)           => post('/marketing/social/improve', data),
    analytics: ()               => get('/marketing/social/analytics'),
  },
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
    metrics:  () => get('/marketing/cdp/metrics'),
    sources:  () => get('/marketing/cdp/sources'),
    addSource: (data) => post('/marketing/cdp/sources', data),
    createSegment: (data) => post('/marketing/cdp/segments', data),
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
    remove:    (id)     => del(`/network/automation/jobs/${id}`),
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
  servers: {
    list:    (params) => get('/network/servers', params),
    get:     (id)     => get(`/network/servers/${id}`),
    metrics: ()       => get('/network/servers/metrics'),
    create:  (data)   => post('/network/servers', data),
    update:  (id, d)  => put(`/network/servers/${id}`, d),
    delete:  (id)     => del(`/network/servers/${id}`),
    restart: (id)     => post(`/network/servers/${id}/restart`),
    sync:    (id)     => post(`/network/servers/${id}/sync`),
  },
  monitor: {
    overview: () => get('/network/monitor/overview'),
    metrics:  () => get('/network/monitor/metrics'),
    events:   () => get('/network/monitor/events'),
  },
  restrictions: {
    list:   (params) => get('/network/restrictions', params),
    get:    (id)     => get(`/network/restrictions/${id}`),
    create: (data)   => post('/network/restrictions', data),
    update: (id, d)  => put(`/network/restrictions/${id}`, d),
    delete: (id)     => del(`/network/restrictions/${id}`),
    toggle: (id)     => post(`/network/restrictions/${id}/toggle`),
  },
  firewall: {
    rules:  {
      list:   (params) => get('/network/firewall/rules', params),
      get:    (id)     => get(`/network/firewall/rules/${id}`),
      create: (data)   => post('/network/firewall/rules', data),
      update: (id, d)  => put(`/network/firewall/rules/${id}`, d),
      delete: (id)     => del(`/network/firewall/rules/${id}`),
      toggle: (id)     => post(`/network/firewall/rules/${id}/toggle`),
    },
    zones: () => get('/network/firewall/zones'),
    logs:  () => get('/network/firewall/logs'),
  },
  sync: () => post('/network/sync'),
};

// ── Notifications ─────────────────────────────────────────────────────────
export const notifications = {
  list:        (params) => get('/notifications', params),
  unreadCount: ()       => get('/notifications/unread-count'),
  markRead:    (id)     => post(`/notifications/${id}/read`),
  markAllRead: ()       => post('/notifications/read-all'),
};

// ── Messaging (in-app: direct messages + department channel) ───────────────
export const messaging = {
  conversations: ()              => get('/messaging/conversations'),
  directory:     ()              => get('/messaging/directory'),
  dmThread:      (userId)        => get(`/messaging/dm/${userId}`),
  sendDm:        (data)          => post('/messaging/dm', data),
  deptThread:    ()              => get('/messaging/dept'),
  sendDept:      (data)          => post('/messaging/dept', data),
};

// ── Email (Resend) ─────────────────────────────────────────────────────────
export const email = {
  status: ()      => get('/email/status'),
  send:   (data)  => post('/email/send', data),
  logs:   (params) => get('/email/logs', params),
};

// ── Executive Overview ────────────────────────────────────────────────────
export const overview = {
  dashboard:   ()     => get('/overview/dashboard'),
  departments: ()     => get('/overview/departments'),
  sendMessage: (data) => post('/overview/messages', data),
  emailReport: ()     => post('/overview/report/email', {}),
};

// ── Attachments (generic, cross-module files) ─────────────────────────────
export const attachments = {
  list:   (entityType, entityId) => get(`/attachments/${entityType}/${entityId}`),
  upload: (entityType, entityId, file) => {
    const form = new FormData();
    form.append('file', file);
    return request(`/attachments/${entityType}/${entityId}`, {
      method: 'POST',
      body: form,
      headers: {},           // let the browser set the multipart boundary
    });
  },
  remove: (id) => del(`/attachments/${id}`),
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
    removeAvatar: () => request('/account/profile/avatar', { method: 'DELETE' }),
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
  // Outbound integration secret store (ExecUI -> external services)
  integrations: {
    list:   ()        => get('/integrations'),
    create: (data)    => post('/integrations', data),
    update: (id, data) => patch(`/integrations/${id}`, data),
    delete: (id)      => del(`/integrations/${id}`),
    test:   (id)      => post(`/integrations/${id}/test`),
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
    get:             ()          => get('/account/billing'),
    plans:           ()          => get('/account/billing/plans'),
    select:          (data)      => post('/account/billing/select', data),
    upgrade:         (data)      => post('/account/billing/upgrade', data),
    paymentMethods:  ()          => get('/account/billing/payment-methods'),
    invoices:        ()          => get('/account/billing/invoices'),
    portal:          (data)      => post('/account/billing/portal', data),
    setup:           (data)      => post('/account/billing/setup', data),
  },
  auditLogs: {
    list: (params) => get('/account/audit-logs', params),
  },
};

// ── Services ──────────────────────────────────────────────────────────────────
export const services = {
  dashboard: {
    stats: () => get('/services/dashboard/stats'),
  },
  financial: {
    transactions: {
      list:   ()     => get('/services/financial/transactions'),
      create: (data) => post('/services/financial/transactions', data),
      delete: (id)   => del(`/services/financial/transactions/${id}`),
    },
    taxPlans: {
      list:   ()     => get('/services/financial/tax-plans'),
      create: (data) => post('/services/financial/tax-plans', data),
      delete: (id)   => del(`/services/financial/tax-plans/${id}`),
    },
    investments: {
      list:   ()     => get('/services/financial/investments'),
      create: (data) => post('/services/financial/investments', data),
      delete: (id)   => del(`/services/financial/investments/${id}`),
    },
  },
  operations: {
    sops: {
      list:   ()         => get('/services/operations/sops'),
      create: (data)     => post('/services/operations/sops', data),
      update: (id, data) => put(`/services/operations/sops/${id}`, data),
      delete: (id)       => del(`/services/operations/sops/${id}`),
    },
    workflows: {
      list:   ()     => get('/services/operations/workflows'),
      create: (data) => post('/services/operations/workflows', data),
      delete: (id)   => del(`/services/operations/workflows/${id}`),
    },
  },
  strategic: {
    goals: {
      list:   ()         => get('/services/strategic/goals'),
      create: (data)     => post('/services/strategic/goals', data),
      update: (id, data) => put(`/services/strategic/goals/${id}`, data),
      delete: (id)       => del(`/services/strategic/goals/${id}`),
    },
    marketAnalysis: {
      list:   ()     => get('/services/strategic/market-analysis'),
      create: (data) => post('/services/strategic/market-analysis', data),
      delete: (id)   => del(`/services/strategic/market-analysis/${id}`),
    },
  },
  marketing: {
    campaigns: {
      list:   ()         => get('/services/marketing/campaigns'),
      create: (data)     => post('/services/marketing/campaigns', data),
      update: (id, data) => put(`/services/marketing/campaigns/${id}`, data),
      delete: (id)       => del(`/services/marketing/campaigns/${id}`),
    },
    clients: {
      list:   ()         => get('/services/marketing/clients'),
      create: (data)     => post('/services/marketing/clients', data),
      update: (id, data) => put(`/services/marketing/clients/${id}`, data),
      delete: (id)       => del(`/services/marketing/clients/${id}`),
    },
  },
  team: {
    members: {
      list:   ()         => get('/services/team/members'),
      create: (data)     => post('/services/team/members', data),
      update: (id, data) => put(`/services/team/members/${id}`, data),
      delete: (id)       => del(`/services/team/members/${id}`),
    },
    projects: {
      list:   ()         => get('/services/team/projects'),
      create: (data)     => post('/services/team/projects', data),
      update: (id, data) => put(`/services/team/projects/${id}`, data),
      delete: (id)       => del(`/services/team/projects/${id}`),
    },
    tasks: {
      list:   ()         => get('/services/team/tasks'),
      create: (data)     => post('/services/team/tasks', data),
      update: (id, data) => put(`/services/team/tasks/${id}`, data),
      delete: (id)       => del(`/services/team/tasks/${id}`),
    },
  },
  ai: {
    insights:    (body) => post('/services/ai/insights', body),
    generateSOP: (body) => post('/services/ai/generate-sop', body),
  },
};
