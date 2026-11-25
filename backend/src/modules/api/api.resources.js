/**
 * Resource registry — the field-level contract for generic record access.
 *
 * ExecAI's record tools and workflow automation both read and write records
 * through this registry: which Prisma model backs each resource, which module
 * it belongs to, and exactly which fields are readable, writable and required.
 * A field that isn't listed can never be read or written by either — adding one
 * is a deliberate act, not an accident of the ORM. It also decides which models
 * emit domain events (config/database.js), which is what triggers workflows.
 *
 * (There used to be a public /api/v1 built on this too. It was removed; the
 * registry stays because the agent and the workflow engine depend on it.)
 *
 * Field flags:
 *   writable  — accepted on POST/PATCH
 *   required  — must be present on POST
 *   readonly  — always returned, never accepted (id, timestamps, derived)
 *   enum      — allowed values (rejected otherwise)
 */

export const SCOPES = [
  "crm:read", "crm:write",
  "marketing:read", "marketing:write",
  "services:read", "services:write",
  "network:read", "network:write",
  "people:read",
  "reports:read",
  "contracts:read", "contracts:write",
  "documents:read",
  "hr:read",
  "helpdesk:read", "helpdesk:write",
];

const f = (type, opts = {}) => ({ type, ...opts });
const ro = (type) => ({ type, readonly: true });

export const RESOURCES = {
  // ── CRM ───────────────────────────────────────────────────────────────────
  contacts: {
    id: "contacts", name: "Contact", model: "contact", module: "crm", scope: "crm",
    fields: {
      id: ro("string"),
      name: f("string", { writable: true, required: true, max: 200 }),
      email: f("string", { writable: true, required: true, max: 200, format: "email" }),
      key: f("string", { writable: true, max: 120 }),
      createdAt: ro("date"),
    },
    filterable: ["name", "email"],
    defaultSort: { field: "createdAt", dir: "desc" },
  },

  opportunities: {
    id: "opportunities", name: "Opportunity", model: "crmOpportunity", module: "crm", scope: "crm",
    fields: {
      id: ro("string"),
      name: f("string", { writable: true, required: true, max: 200 }),
      value: f("number", { writable: true, min: 0 }),
      stage: f("string", { writable: true, enum: ["prospecting", "qualification", "proposal", "negotiation", "closed_won", "closed_lost"] }),
      status: f("string", { writable: true, enum: ["active", "won", "lost"] }),
      source: f("string", { writable: true, max: 80 }),
      probability: f("number", { writable: true, min: 0, max: 100 }),
      ownerId: f("string", { writable: true, ref: "user" }),
      createdAt: ro("date"),
      updatedAt: ro("date"),
    },
    filterable: ["stage", "status", "source", "ownerId"],
    defaultSort: { field: "createdAt", dir: "desc" },
  },

  tasks: {
    id: "tasks", name: "CrmTask", model: "crmTask", module: "crm", scope: "crm",
    fields: {
      id: ro("string"),
      title: f("string", { writable: true, required: true, max: 200 }),
      task_type: f("string", { writable: true, enum: ["call", "email", "meeting", "follow_up", "review"] }),
      status: f("string", { writable: true, enum: ["pending", "in_progress", "completed", "cancelled"] }),
      priority: f("string", { writable: true, enum: ["low", "medium", "high", "urgent"] }),
      due_date: f("date", { writable: true }),
      relatedCustomerName: f("string", { writable: true, max: 200 }),
      userId: f("string", { writable: true, ref: "user" }),
      createdAt: ro("date"),
      updatedAt: ro("date"),
    },
    filterable: ["status", "priority", "task_type", "userId"],
    defaultSort: { field: "createdAt", dir: "desc" },
  },

  tickets: {
    id: "tickets", name: "Ticket", model: "crmTicket", module: "crm", scope: "crm",
    fields: {
      id: ro("string"),
      ticket_number: f("string", { writable: true, max: 40 }),
      subject: f("string", { writable: true, required: true, max: 200 }),
      customer_name: f("string", { writable: true, required: true, max: 200 }),
      category: f("string", { writable: true, max: 80 }),
      priority: f("string", { writable: true, enum: ["low", "medium", "high", "urgent"] }),
      status: f("string", { writable: true, enum: ["open", "in_progress", "pending", "resolved", "closed"] }),
      sla_status: f("string", { writable: true, enum: ["on_track", "at_risk", "breached"] }),
      createdAt: ro("date"),
      updatedAt: ro("date"),
    },
    filterable: ["status", "priority", "category", "sla_status"],
    defaultSort: { field: "createdAt", dir: "desc" },
  },

  // ── Marketing ─────────────────────────────────────────────────────────────
  campaigns: {
    id: "campaigns", name: "Campaign", model: "marketingCampaign", module: "marketing", scope: "marketing",
    fields: {
      id: ro("string"),
      name: f("string", { writable: true, required: true, max: 200 }),
      objective: f("string", { writable: true, max: 80 }),
      channel: f("string", { writable: true, max: 80 }),
      status: f("string", { writable: true, max: 40 }),
      budget: f("number", { writable: true, min: 0 }),
      spent: f("number", { writable: true, min: 0 }),
      leads: f("number", { writable: true, min: 0 }),
      clicks: f("number", { writable: true, min: 0 }),
      opens: f("number", { writable: true, min: 0 }),
      conversions: f("number", { writable: true, min: 0 }),
      revenue: f("number", { writable: true, min: 0 }),
      startDate: f("date", { writable: true }),
      endDate: f("date", { writable: true }),
      createdAt: ro("date"),
      updatedAt: ro("date"),
    },
    filterable: ["status", "channel", "objective"],
    defaultSort: { field: "createdAt", dir: "desc" },
  },

  // ── Business services ─────────────────────────────────────────────────────
  projects: {
    id: "projects", name: "Project", model: "bizProject", module: "services", scope: "services",
    fields: {
      id: ro("string"),
      name: f("string", { writable: true, required: true, max: 200 }),
      description: f("string", { writable: true, max: 2000 }),
      status: f("string", { writable: true, enum: ["planning", "in_progress", "review", "completed"] }),
      priority: f("string", { writable: true, enum: ["low", "medium", "high", "urgent"] }),
      progress: f("number", { writable: true, min: 0, max: 100 }),
      budget: f("number", { writable: true, min: 0 }),
      start_date: f("datestr", { writable: true }),
      end_date: f("datestr", { writable: true }),
      createdAt: ro("date"),
      updatedAt: ro("date"),
    },
    filterable: ["status", "priority"],
    defaultSort: { field: "createdAt", dir: "desc" },
  },

  "team-tasks": {
    id: "team-tasks", name: "TeamTask", model: "bizTask", module: "services", scope: "services",
    fields: {
      id: ro("string"),
      title: f("string", { writable: true, required: true, max: 200 }),
      description: f("string", { writable: true, max: 2000 }),
      project_id: f("string", { writable: true }),
      status: f("string", { writable: true, enum: ["todo", "in_progress", "review", "done"] }),
      priority: f("string", { writable: true, enum: ["low", "medium", "high", "urgent"] }),
      assignee: f("string", { writable: true, max: 200 }),
      due_date: f("datestr", { writable: true }),
      createdAt: ro("date"),
      updatedAt: ro("date"),
    },
    filterable: ["status", "priority", "assignee", "project_id"],
    defaultSort: { field: "createdAt", dir: "desc" },
  },

  transactions: {
    id: "transactions", name: "Transaction", model: "bizTransaction", module: "services", scope: "services",
    fields: {
      id: ro("string"),
      type: f("string", { writable: true, required: true, enum: ["income", "expense"] }),
      category: f("string", { writable: true, required: true, max: 120 }),
      amount: f("number", { writable: true, required: true }),
      description: f("string", { writable: true, max: 1000 }),
      date: f("datestr", { writable: true, required: true }),
      status: f("string", { writable: true, enum: ["completed", "pending", "cancelled"] }),
      createdAt: ro("date"),
    },
    filterable: ["type", "category", "status"],
    defaultSort: { field: "createdAt", dir: "desc" },
  },

  // ── Network ───────────────────────────────────────────────────────────────
  devices: {
    id: "devices", name: "Device", model: "networkDevice", module: "network", scope: "network",
    fields: {
      id: ro("string"),
      hostname: f("string", { writable: true, required: true, max: 200 }),
      ip_address: f("string", { writable: true, required: true, max: 60 }),
      device_type: f("string", { writable: true, enum: ["server", "endpoint", "router", "switch", "firewall", "cloud"] }),
      status: f("string", { writable: true, enum: ["up", "down", "degraded", "maintenance"] }),
      os: f("string", { writable: true, max: 120 }),
      cpu_util: f("number", { writable: true, min: 0, max: 100 }),
      mem_util: f("number", { writable: true, min: 0, max: 100 }),
      bandwidth_mbps: f("number", { writable: true, min: 0 }),
      region: f("string", { writable: true, max: 80 }),
      cloud_provider: f("string", { writable: true, max: 40 }),
      createdAt: ro("date"),
      updatedAt: ro("date"),
    },
    filterable: ["status", "device_type", "region", "cloud_provider"],
    defaultSort: { field: "hostname", dir: "asc" },
  },

  alerts: {
    id: "alerts", name: "Alert", model: "networkAlert", module: "network", scope: "network",
    fields: {
      id: ro("string"),
      title: f("string", { writable: true, required: true, max: 200 }),
      message: f("string", { writable: true, max: 2000 }),
      severity: f("string", { writable: true, enum: ["info", "warning", "critical"] }),
      status: f("string", { writable: true, enum: ["open", "acknowledged", "resolved"] }),
      deviceId: f("string", { writable: true }),
      createdAt: ro("date"),
      resolvedAt: f("date", { writable: true }),
    },
    filterable: ["severity", "status", "deviceId"],
    defaultSort: { field: "createdAt", dir: "desc" },
  },

  // ── Contracts (CLM) ───────────────────────────────────────────────────────
  // `status` is deliberately read-only: a contract's lifecycle moves only along
  // the transitions declared in the CLM registry, so an integration can't push
  // an unsigned draft straight to "active". Use the lifecycle endpoint for that.
  contracts: {
    id: "contracts", name: "Contract", model: "contract", module: "contracts", scope: "contracts",
    fields: {
      id: ro("string"),
      title: f("string", { writable: true, required: true, max: 250 }),
      counterparty: f("string", { writable: true, required: true, max: 200 }),
      type: f("string", { writable: true, enum: ["msa", "sow", "nda", "dpa", "vendor", "customer", "employment", "lease", "license", "other"] }),
      status: ro("string"),
      value: f("number", { writable: true, min: 0 }),
      currency: f("string", { writable: true, max: 3 }),
      startDate: f("date", { writable: true }),
      endDate: f("date", { writable: true }),
      autoRenew: f("boolean", { writable: true }),
      renewalTermMonths: f("number", { writable: true, min: 1, max: 120 }),
      noticePeriodDays: f("number", { writable: true, min: 0, max: 730 }),
      documentId: f("string", { writable: true }),
      ownerId: f("string", { writable: true, ref: "user" }),
      notes: f("string", { writable: true, max: 4000 }),
      terminatedAt: ro("date"),
      createdAt: ro("date"),
      updatedAt: ro("date"),
    },
    filterable: ["status", "type", "counterparty", "ownerId", "autoRenew"],
    defaultSort: { field: "endDate", dir: "asc" },
  },

  // ── Documents (metadata only — file bytes are never served over /api/v1) ───
  documents: {
    id: "documents", name: "Document", model: "document", module: "documents", scope: "documents",
    readOnly: true,
    fields: {
      id: ro("string"),
      title: ro("string"),
      description: ro("string"),
      category: ro("string"),
      status: ro("string"),
      confidential: ro("boolean"),
      currentVersion: ro("number"),
      entityType: ro("string"),
      entityId: ro("string"),
      ownerId: ro("string"),
      ownerName: ro("string"),
      createdAt: ro("date"),
      updatedAt: ro("date"),
    },
    filterable: ["category", "status", "confidential", "ownerId"],
    defaultSort: { field: "updatedAt", dir: "desc" },
  },

  // ── Helpdesk ──────────────────────────────────────────────────────────────
  // Tickets are writable so another system (a status page, a monitoring tool, an
  // email gateway) can raise support requests. `status` and the outcome
  // timestamps are read-only: a ticket's lifecycle moves through the helpdesk,
  // where replying to the customer and recording a first response are the same
  // act. Internal notes are not reachable here at all.
  "support-tickets": {
    id: "support-tickets", name: "SupportTicket", model: "crmTicket", module: "helpdesk", scope: "helpdesk",
    fields: {
      id: ro("string"),
      ticket_number: ro("string"),
      subject: f("string", { writable: true, required: true, max: 200 }),
      description: f("string", { writable: true, max: 20000 }),
      customer_name: f("string", { writable: true, max: 200 }),
      contactEmail: f("string", { writable: true, max: 200, format: "email" }),
      category: f("string", { writable: true, max: 80 }),
      priority: f("string", { writable: true, enum: ["low", "medium", "high", "urgent"] }),
      status: ro("string"),
      source: ro("string"),
      assigneeName: ro("string"),
      satisfaction: ro("number"),
      firstResponseAt: ro("date"),
      resolvedAt: ro("date"),
      createdAt: ro("date"),
      updatedAt: ro("date"),
    },
    filterable: ["status", "priority", "category", "source", "contactEmail"],
    defaultSort: { field: "createdAt", dir: "desc" },
  },

  "help-articles": {
    id: "help-articles", name: "HelpArticle", model: "kbArticle", module: "helpdesk", scope: "helpdesk",
    readOnly: true,
    fields: {
      id: ro("string"),
      title: ro("string"),
      slug: ro("string"),
      excerpt: ro("string"),
      body: ro("string"),
      status: ro("string"),
      visibility: ro("string"),
      views: ro("number"),
      helpfulYes: ro("number"),
      helpfulNo: ro("number"),
      publishedAt: ro("date"),
      updatedAt: ro("date"),
    },
    filterable: ["status", "visibility"],
    defaultSort: { field: "updatedAt", dir: "desc" },
  },

  // ── HR (read-only, and deliberately incomplete) ────────────────────────────
  // These exist so an accounting or BI system can pull payroll totals and
  // absence. Bank details, government ids, dates of birth and emergency contacts
  // are NOT in the registry at all, so no token scope can ever reach them — the
  // only way to see those is a deliberate, audited reveal in the HR console.
  payslips: {
    id: "payslips", name: "Payslip", model: "payslip", module: "hr", scope: "hr",
    readOnly: true,
    fields: {
      id: ro("string"),
      userId: ro("string"),
      payRunId: ro("string"),
      currency: ro("string"),
      gross: ro("number"),
      taxableGross: ro("number"),
      tax: ro("number"),
      deductions: ro("number"),
      net: ro("number"),
      employerCost: ro("number"),
      hours: ro("number"),
      prorated: ro("boolean"),
      createdAt: ro("date"),
    },
    filterable: ["userId", "payRunId", "currency"],
    defaultSort: { field: "createdAt", dir: "desc" },
  },

  "leave-requests": {
    id: "leave-requests", name: "LeaveRequest", model: "leaveRequest", module: "hr", scope: "hr",
    readOnly: true,
    fields: {
      id: ro("string"),
      userId: ro("string"),
      leaveTypeId: ro("string"),
      startDate: ro("date"),
      endDate: ro("date"),
      days: ro("number"),
      halfDay: ro("boolean"),
      status: ro("string"),
      createdAt: ro("date"),
    },
    filterable: ["userId", "status", "leaveTypeId"],
    defaultSort: { field: "startDate", dir: "desc" },
  },

  employment: {
    id: "employment", name: "Employment", model: "employmentProfile", module: "hr", scope: "hr",
    readOnly: true,
    fields: {
      id: ro("string"),
      userId: ro("string"),
      employmentType: ro("string"),
      status: ro("string"),
      hireDate: ro("date"),
      endDate: ro("date"),
      workLocation: ro("string"),
      managerId: ro("string"),
      costCenter: ro("string"),
      weeklyHours: ro("number"),
      createdAt: ro("date"),
      updatedAt: ro("date"),
    },
    filterable: ["status", "employmentType", "managerId", "costCenter"],
    defaultSort: { field: "createdAt", dir: "desc" },
  },

  // ── People (read-only: staff PII is never writable over the public API) ────
  employees: {
    id: "employees", name: "Employee", model: "user", module: "people", scope: "people",
    readOnly: true,
    fields: {
      id: ro("string"),
      firstName: ro("string"),
      lastName: ro("string"),
      email: ro("string"),
      department: ro("string"),
      jobTitle: ro("string"),
      status: ro("string"),
      isActive: ro("boolean"),
      lastLoginAt: ro("date"),
      createdAt: ro("date"),
    },
    filterable: ["department", "isActive", "status"],
    defaultSort: { field: "createdAt", dir: "desc" },
  },
};

export const getResource = (id) => RESOURCES[id] || null;
export const listResources = () => Object.values(RESOURCES);

/** Event types this API can emit, derived from the registry. */
export function eventTypes() {
  const out = [];
  for (const r of listResources()) {
    out.push(`${r.id}.created`, `${r.id}.updated`);
    if (!r.readOnly) out.push(`${r.id}.deleted`);
  }
  return out.sort();
}

/** Fields safe to return over the API. */
export const readableFields = (r) => Object.keys(r.fields);
export const writableFields = (r) => Object.entries(r.fields).filter(([, m]) => m.writable).map(([k]) => k);
export const requiredFields = (r) => Object.entries(r.fields).filter(([, m]) => m.required).map(([k]) => k);

