/**
 * Report dataset registry — the security boundary of the reporting engine.
 *
 * Users compose reports from these datasets and fields ONLY. Nothing a caller
 * sends is ever interpolated into SQL: a dataset names a Prisma model, and a
 * field must exist in that dataset's whitelist before it can be selected,
 * filtered, grouped or sorted. Anything unknown is rejected. Combined with the
 * tenant guard (config/database.js), a report can only ever read the caller's
 * own organization's data.
 *
 * `module` gates a dataset by the caller's plan + department access (the same
 * sections used everywhere else). `adminOnly` further restricts people data.
 *
 * Field types drive which operators the UI offers and how values are coerced:
 *   string | number | boolean | date | datestr (ISO "YYYY-MM-DD" stored as text)
 */

/** Operators allowed per field type. */
export const OPERATORS = {
  string:  ["eq", "ne", "contains", "starts_with", "in", "is_empty", "not_empty"],
  number:  ["eq", "ne", "gt", "gte", "lt", "lte", "between"],
  boolean: ["eq"],
  date:    ["on", "before", "after", "between", "in_range"],
  datestr: ["eq", "before", "after", "between"],
};

export const AGGREGATIONS = ["count", "sum", "avg", "min", "max"];

const f = (label, type, opts = {}) => ({ label, type, ...opts });

export const DATASETS = {
  // ── CRM ───────────────────────────────────────────────────────────────────
  contacts: {
    id: "contacts", name: "Contacts", module: "crm", model: "contact",
    description: "People and companies in your CRM.",
    dateField: "createdAt",
    fields: {
      name:      f("Name", "string"),
      email:     f("Email", "string"),
      createdAt: f("Created", "date", { groupable: true }),
    },
    defaultFields: ["name", "email", "createdAt"],
    defaultSort: { field: "createdAt", dir: "desc" },
  },

  opportunities: {
    id: "opportunities", name: "Opportunities", module: "crm", model: "crmOpportunity",
    description: "Deals, pipeline value, stages and win/loss.",
    dateField: "createdAt",
    fields: {
      name:        f("Deal", "string"),
      value:       f("Value", "number", { aggregatable: true, money: true }),
      stage:       f("Stage", "string", { groupable: true }),
      status:      f("Status", "string", { groupable: true }),
      source:      f("Source", "string", { groupable: true }),
      probability: f("Probability %", "number", { aggregatable: true }),
      ownerName:   f("Owner", "string", { groupable: true, relation: { path: "owner", select: { firstName: true, lastName: true } } }),
      createdAt:   f("Created", "date", { groupable: true }),
      updatedAt:   f("Updated", "date"),
    },
    defaultFields: ["name", "stage", "value", "status", "createdAt"],
    defaultSort: { field: "value", dir: "desc" },
  },

  crm_tasks: {
    id: "crm_tasks", name: "CRM Tasks", module: "crm", model: "crmTask",
    description: "Calls, emails, meetings and follow-ups.",
    dateField: "createdAt",
    fields: {
      title:               f("Title", "string"),
      task_type:           f("Type", "string", { groupable: true }),
      status:              f("Status", "string", { groupable: true }),
      priority:            f("Priority", "string", { groupable: true }),
      due_date:            f("Due", "date"),
      relatedCustomerName: f("Customer", "string", { groupable: true }),
      createdAt:           f("Created", "date", { groupable: true }),
    },
    defaultFields: ["title", "task_type", "status", "priority", "due_date"],
    defaultSort: { field: "createdAt", dir: "desc" },
  },

  tickets: {
    id: "tickets", name: "Support Tickets", module: "crm", model: "crmTicket",
    description: "Service tickets, priority and SLA status.",
    dateField: "createdAt",
    fields: {
      ticket_number: f("Ticket #", "string"),
      subject:       f("Subject", "string"),
      customer_name: f("Customer", "string", { groupable: true }),
      category:      f("Category", "string", { groupable: true }),
      priority:      f("Priority", "string", { groupable: true }),
      status:        f("Status", "string", { groupable: true }),
      sla_status:    f("SLA", "string", { groupable: true }),
      createdAt:     f("Created", "date", { groupable: true }),
    },
    defaultFields: ["ticket_number", "subject", "priority", "status", "sla_status"],
    defaultSort: { field: "createdAt", dir: "desc" },
  },

  // ── Marketing ─────────────────────────────────────────────────────────────
  campaigns: {
    id: "campaigns", name: "Campaigns", module: "marketing", model: "marketingCampaign",
    description: "Spend, leads, conversions and ROI by campaign.",
    dateField: "createdAt",
    fields: {
      name:        f("Campaign", "string"),
      channel:     f("Channel", "string", { groupable: true }),
      objective:   f("Objective", "string", { groupable: true }),
      status:      f("Status", "string", { groupable: true }),
      budget:      f("Budget", "number", { aggregatable: true, money: true }),
      spent:       f("Spent", "number", { aggregatable: true, money: true }),
      leads:       f("Leads", "number", { aggregatable: true }),
      clicks:      f("Clicks", "number", { aggregatable: true }),
      opens:       f("Opens", "number", { aggregatable: true }),
      conversions: f("Conversions", "number", { aggregatable: true }),
      revenue:     f("Revenue", "number", { aggregatable: true, money: true }),
      roi:         f("ROI", "number", { aggregatable: true }),
      startDate:   f("Start", "date"),
      endDate:     f("End", "date"),
      createdAt:   f("Created", "date", { groupable: true }),
    },
    defaultFields: ["name", "channel", "status", "budget", "spent", "conversions", "revenue"],
    defaultSort: { field: "revenue", dir: "desc" },
  },

  social_posts: {
    id: "social_posts", name: "Social Posts", module: "marketing", model: "socialPost",
    description: "Published and scheduled social content.",
    dateField: "createdAt",
    fields: {
      content:     f("Content", "string"),
      status:      f("Status", "string", { groupable: true }),
      source:      f("Source", "string", { groupable: true }),
      authorName:  f("Author", "string", { groupable: true }),
      scheduledAt: f("Scheduled", "date"),
      publishedAt: f("Published", "date"),
      createdAt:   f("Created", "date", { groupable: true }),
    },
    defaultFields: ["content", "status", "source", "publishedAt"],
    defaultSort: { field: "createdAt", dir: "desc" },
  },

  // ── Business Services ─────────────────────────────────────────────────────
  transactions: {
    id: "transactions", name: "Transactions", module: "services", model: "bizTransaction",
    description: "Income and expenses by category.",
    dateField: "createdAt",
    fields: {
      type:        f("Type", "string", { groupable: true }),
      category:    f("Category", "string", { groupable: true }),
      amount:      f("Amount", "number", { aggregatable: true, money: true }),
      description: f("Description", "string"),
      date:        f("Date", "datestr", { groupable: true }),
      status:      f("Status", "string", { groupable: true }),
      createdAt:   f("Created", "date", { groupable: true }),
    },
    defaultFields: ["date", "type", "category", "amount", "status"],
    defaultSort: { field: "createdAt", dir: "desc" },
  },

  projects: {
    id: "projects", name: "Projects", module: "services", model: "bizProject",
    description: "Project status, progress and budget.",
    dateField: "createdAt",
    fields: {
      name:       f("Project", "string"),
      status:     f("Status", "string", { groupable: true }),
      priority:   f("Priority", "string", { groupable: true }),
      progress:   f("Progress %", "number", { aggregatable: true }),
      budget:     f("Budget", "number", { aggregatable: true, money: true }),
      start_date: f("Start", "datestr"),
      end_date:   f("End", "datestr"),
      createdAt:  f("Created", "date", { groupable: true }),
    },
    defaultFields: ["name", "status", "priority", "progress", "budget"],
    defaultSort: { field: "createdAt", dir: "desc" },
  },

  biz_tasks: {
    id: "biz_tasks", name: "Team Tasks", module: "services", model: "bizTask",
    description: "Project tasks, assignees and status.",
    dateField: "createdAt",
    fields: {
      title:     f("Title", "string"),
      status:    f("Status", "string", { groupable: true }),
      priority:  f("Priority", "string", { groupable: true }),
      assignee:  f("Assignee", "string", { groupable: true }),
      due_date:  f("Due", "datestr"),
      createdAt: f("Created", "date", { groupable: true }),
    },
    defaultFields: ["title", "status", "priority", "assignee", "due_date"],
    defaultSort: { field: "createdAt", dir: "desc" },
  },

  // ── Network ───────────────────────────────────────────────────────────────
  devices: {
    id: "devices", name: "Network Devices", module: "network", model: "networkDevice",
    description: "Estate inventory, health and utilization.",
    dateField: "createdAt",
    fields: {
      hostname:       f("Hostname", "string"),
      ip_address:     f("IP", "string"),
      device_type:    f("Type", "string", { groupable: true }),
      status:         f("Status", "string", { groupable: true }),
      os:             f("OS", "string", { groupable: true }),
      cpu_util:       f("CPU %", "number", { aggregatable: true }),
      mem_util:       f("Memory %", "number", { aggregatable: true }),
      bandwidth_mbps: f("Bandwidth (Mbps)", "number", { aggregatable: true }),
      region:         f("Region", "string", { groupable: true }),
      cloud_provider: f("Cloud", "string", { groupable: true }),
      createdAt:      f("Added", "date", { groupable: true }),
    },
    defaultFields: ["hostname", "device_type", "status", "cpu_util", "mem_util"],
    defaultSort: { field: "hostname", dir: "asc" },
  },

  alerts: {
    id: "alerts", name: "Network Alerts", module: "network", model: "networkAlert",
    description: "Alert volume by severity and status.",
    dateField: "createdAt",
    fields: {
      title:      f("Alert", "string"),
      severity:   f("Severity", "string", { groupable: true }),
      status:     f("Status", "string", { groupable: true }),
      message:    f("Message", "string"),
      createdAt:  f("Raised", "date", { groupable: true }),
      resolvedAt: f("Resolved", "date"),
    },
    defaultFields: ["title", "severity", "status", "createdAt"],
    defaultSort: { field: "createdAt", dir: "desc" },
  },

  // ── People (admin only — contains employee PII) ────────────────────────────
  employees: {
    id: "employees", name: "Employees", module: null, adminOnly: true, model: "user",
    description: "Workforce roster, departments and activity.",
    dateField: "createdAt",
    fields: {
      firstName:   f("First name", "string"),
      lastName:    f("Last name", "string"),
      email:       f("Email", "string"),
      department:  f("Department", "string", { groupable: true }),
      jobTitle:    f("Job title", "string", { groupable: true }),
      status:      f("Status", "string", { groupable: true }),
      isActive:    f("Active", "boolean", { groupable: true }),
      lastLoginAt: f("Last login", "date"),
      createdAt:   f("Joined", "date", { groupable: true }),
    },
    defaultFields: ["firstName", "lastName", "email", "department", "isActive"],
    defaultSort: { field: "createdAt", dir: "desc" },
  },
};

export const getDataset = (id) => DATASETS[id] || null;

/** Datasets this caller may use, given their section access and role. */
export function datasetsFor({ sections = [], isAdmin = false } = {}) {
  return Object.values(DATASETS)
    .filter((d) => (d.adminOnly ? isAdmin : true))
    .filter((d) => (d.module ? sections.includes(d.module) : true));
}

export function canUseDataset(dataset, { sections = [], isAdmin = false } = {}) {
  if (!dataset) return false;
  if (dataset.adminOnly && !isAdmin) return false;
  if (dataset.module && !sections.includes(dataset.module)) return false;
  return true;
}

/** Public (UI-facing) shape of a dataset: fields + the operators each allows. */
export function describeDataset(d) {
  return {
    id: d.id,
    name: d.name,
    description: d.description,
    module: d.module,
    adminOnly: !!d.adminOnly,
    dateField: d.dateField || null,
    defaultFields: d.defaultFields,
    defaultSort: d.defaultSort,
    fields: Object.entries(d.fields).map(([key, meta]) => ({
      key,
      label: meta.label,
      type: meta.type,
      groupable: !!meta.groupable,
      aggregatable: !!meta.aggregatable,
      money: !!meta.money,
      operators: OPERATORS[meta.type] || [],
    })),
  };
}
