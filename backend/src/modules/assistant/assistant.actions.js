/**
 * Write actions ExecAI may take on a user's behalf — permission-aware by
 * construction.
 *
 * Each action declares, in one place:
 *
 *   section / solution  the module and plan entitlement it belongs to. Same gate
 *                       as the read views and as `requireModule` on the HTTP
 *                       routes: no plan, no department access, no action.
 *   permission          the role permission a NON-admin needs. Admins pass.
 *                       `null` means the action is self-service — see below.
 *   elevated            for self-service actions, the permission needed to act on
 *                       someone ELSE's work (assign a task to a colleague,
 *                       complete their task).
 *   input               the only fields accepted. Anything else is refused, not
 *                       ignored — a model that sends `status: "approved"` on a
 *                       change request is told no rather than quietly obeyed.
 *   run                 calls the module's own service. No raw ORM writes, so the
 *                       service's validation and side effects (notifications,
 *                       derived fields) still apply.
 *
 * Why writes are stricter than the UI. The HTTP routes for these modules check
 * only module access; any member of the department may, say, open an incident.
 * The agent requires an explicit permission on top, because it acts from a
 * natural-language instruction that can be wrong, ambiguous, or planted in a
 * record's text. A person clicking "Open incident" has seen the form; a model
 * acting on "sort out the outage" has not.
 *
 * Self-service is the exception, and it is narrow: a user may create and
 * complete their OWN tasks and schedule their OWN meetings in a module they can
 * already use. That touches nobody's work but theirs. The moment it would touch
 * someone else's, `elevated` applies.
 *
 * What is deliberately absent — and the reason, so nobody "helpfully" adds it:
 *   delete anything              irreversible; the agent has no delete at all
 *   close a deal (won/lost)      a commercial commitment, made by a person
 *   convert a lead               moves a protected lifecycle state and notifies
 *   start/pause a campaign       starting one sends email to customers
 *   approve/reject a change      the approval IS the human control
 *   run automation, restart a server, restore a backup
 *                                operational effects outside the database
 *   resolve an alert or incident closes the loop on evidence a model can't see
 */
import prisma from "../../config/database.js";
import * as crm from "../crm/crm.service.js";
import * as marketing from "../marketing/marketing.service.js";
import * as network from "../network/network.service.js";
import * as services from "../services/services.service.js";
import { hasSolutionAccess } from "./assistant.solutions.js";

const err = (message) => Object.assign(new Error(message), { status: 400 });

// ── Field types ──────────────────────────────────────────────────────────────
const str = (max, o = {}) => ({ type: "string", max, ...o });
const id = (o = {}) => ({ type: "id", ...o });
const num = (min, max, o = {}) => ({ type: "number", min, max, ...o });
const int = (min, max, o = {}) => ({ type: "integer", min, max, ...o });
const oneOf = (values, o = {}) => ({ type: "enum", values, ...o });
const date = (o = {}) => ({ type: "date", ...o });
const email = (o = {}) => ({ type: "email", max: 160, ...o });
const list = (max, itemMax, o = {}) => ({ type: "list", max, itemMax, ...o });
const required = { required: true };

// Stages a model may move a lead between. Closed stages are absent on purpose.
const OPEN_STAGES = ["new", "contacted", "qualified", "proposal", "negotiation"];
const CLOSED_DB_STAGES = new Set(["closed_won", "closed_lost"]);

async function findInTenant(model, tenantId, recordId, label) {
  const row = await prisma[model].findFirst({ where: { id: recordId, tenantId } });
  if (!row) throw err(`No ${label} with that id in this workspace.`);
  return row;
}

async function activeColleague(tenantId, userId) {
  const user = await prisma.user.findFirst({ where: { id: userId, tenantId, isActive: true }, select: { id: true } });
  if (!user) throw err("The assignee must be an active member of this workspace.");
  return user.id;
}

export const ACTIONS = {
  // ── CRM ──────────────────────────────────────────────────────────────────
  crm_create_lead: {
    section: "crm", solution: "leads", permission: "crm.pipeline.manage", effect: "create", title: "Lead",
    description: "Create a new lead owned by the signed-in user.",
    input: {
      name: str(160, required),
      value: num(0, 1e12),
      source: oneOf(["Inbound", "Outbound", "Referral", "Website", "Event"]),
      probability: int(0, 100),
    },
    run: (ctx, input) => crm.createLead(ctx.tenantId, { ...input, stage: "new", ownerId: ctx.userId }),
  },

  crm_update_lead: {
    section: "crm", solution: "leads", permission: "crm.pipeline.manage", effect: "update", title: "Lead",
    description: "Move an open lead between open stages, or change its value or probability. Cannot close a deal.",
    input: {
      id: id(required),
      stage: oneOf(OPEN_STAGES),
      value: num(0, 1e12),
      probability: int(0, 100),
    },
    atLeastOne: ["stage", "value", "probability"],
    async run(ctx, { id: leadId, ...changes }) {
      const lead = await findInTenant("crmOpportunity", ctx.tenantId, leadId, "lead");
      // Neither into nor out of a closed stage: re-opening a won deal is as much a
      // commercial decision as closing one.
      if (CLOSED_DB_STAGES.has(lead.stage)) {
        throw err("That deal is closed. Closed deals are changed in the CRM by a person, not by ExecAI.");
      }
      return crm.updateLead(ctx.tenantId, leadId, changes);
    },
  },

  crm_create_task: {
    section: "crm", solution: "activities", permission: null, elevated: "crm.activity.write",
    effect: "create", title: "CRM task",
    description: "Create a CRM task. Assigned to the signed-in user unless assigneeId names a colleague (needs extra permission).",
    input: {
      title: str(200, required),
      dueDate: date(),
      priority: oneOf(["low", "medium", "high", "urgent"]),
      taskType: oneOf(["call", "email", "meeting", "follow_up", "review"]),
      relatedCustomerName: str(160),
      assigneeId: id(),
    },
    async run(ctx, { taskType, assigneeId, ...input }) {
      let owner = ctx.userId;
      if (assigneeId && assigneeId !== ctx.userId) {
        if (!ctx.can("crm.activity.write")) throw err("Assigning a task to someone else needs the crm.activity.write permission.");
        owner = await activeColleague(ctx.tenantId, assigneeId);
      }
      return crm.createTask(ctx.tenantId, { ...input, task_type: taskType, userId: owner }, ctx.userId);
    },
  },

  crm_complete_task: {
    section: "crm", solution: "activities", permission: null, elevated: "crm.activity.write",
    effect: "update", title: "CRM task",
    description: "Mark one of the signed-in user's own open CRM tasks complete (someone else's needs extra permission).",
    input: { id: id(required) },
    async run(ctx, { id: taskId }) {
      const task = await findInTenant("crmTask", ctx.tenantId, taskId, "task");
      if (task.userId !== ctx.userId && !ctx.can("crm.activity.write")) {
        throw err("That task belongs to someone else.");
      }
      if (["completed", "cancelled"].includes(task.status)) throw err(`That task is already ${task.status}.`);
      await crm.completeTask(ctx.tenantId, taskId);
      return { id: taskId, title: task.title, status: "completed" };
    },
  },

  crm_schedule_meeting: {
    section: "crm", solution: "activities", permission: null, effect: "create", title: "Meeting",
    description: "Put a meeting on the signed-in user's CRM calendar.",
    input: {
      title: str(160, required),
      scheduledAt: date(required),
      notes: str(1000),
    },
    run: (ctx, input) => crm.createMeeting(ctx.tenantId, { ...input, userId: ctx.userId }, ctx.userId),
  },

  crm_add_account_note: {
    section: "crm", solution: "accounts", permission: "crm.contact.write", effect: "create", title: "Account note",
    description: "Add a note to a CRM account, attributed to the signed-in user.",
    input: { accountId: id(required), note: str(2000, required) },
    async run(ctx, { accountId, note }) {
      await findInTenant("contact", ctx.tenantId, accountId, "account");
      return crm.addAccountNote(ctx.tenantId, accountId, { note }, ctx.userId);
    },
  },

  // ── Marketing ────────────────────────────────────────────────────────────
  marketing_create_audience: {
    section: "marketing", solution: "engagement", permission: "marketing.audience.write", effect: "create", title: "Audience",
    description: "Create a DRAFT audience segment. It is not active until a person activates it.",
    input: {
      name: str(120, required),
      // Lookalikes are derived from a source audience in the UI; creating one by
      // name alone would be a lookalike of nothing.
      type: oneOf(["behavioral", "firmographic", "demographic", "intent"]),
      description: str(500),
    },
    run: (ctx, input) => marketing.createAudience(ctx.tenantId, input),
  },

  marketing_create_experiment: {
    section: "marketing", solution: "intelligence", permission: "marketing.experiment.write", effect: "create", title: "Experiment",
    description: "Create a DRAFT experiment. It does not start until a person starts it.",
    input: {
      name: str(120, required),
      type: oneOf(["a/b", "multivariate", "split"]),
      metric: oneOf(["conversion_rate", "click_rate", "engagement"]),
      hypothesis: str(500),
    },
    run: (ctx, input) => marketing.createExperiment(ctx.tenantId, input),
  },

  // ── Network ──────────────────────────────────────────────────────────────
  network_acknowledge_alert: {
    section: "network", permission: "network.alerts.manage", effect: "update", title: "Alert",
    description: "Acknowledge an open network alert. Never resolves it.",
    input: { id: id(required) },
    async run(ctx, { id: alertId }) {
      const alert = await findInTenant("networkAlert", ctx.tenantId, alertId, "alert");
      // The service would happily set a RESOLVED alert back to acknowledged,
      // quietly reopening it. Only an open alert can be acknowledged.
      if (alert.status !== "open") throw err(`That alert is already ${alert.status}.`);
      return network.acknowledgeAlert(ctx.tenantId, alertId);
    },
  },

  network_open_incident: {
    section: "network", permission: "network.incidents.manage", effect: "create", title: "Incident",
    description: "Open a new network incident.",
    input: {
      title: str(160, required),
      severity: oneOf(["low", "medium", "high", "critical"]),
      description: str(2000),
    },
    // Built field by field: the service spreads whatever it's given into the row,
    // so passing the model's object through would let it set status or ids.
    run: (ctx, { title, severity, description }) =>
      network.createIncident(ctx.tenantId, { title, severity: severity ?? "medium", description: description ?? null, status: "open" }),
  },

  network_request_change: {
    section: "network", permission: "network.changes.request", effect: "create", title: "Change request",
    description: "Submit a network change request for approval. It is always created PENDING; ExecAI cannot approve it.",
    input: {
      title: str(160, required),
      description: str(2000),
      priority: oneOf(["low", "medium", "high", "urgent"]),
    },
    // Same mass-assignment guard as incidents — and here it matters more: a
    // request created with status "approved" would skip the approval entirely.
    run: (ctx, { title, description, priority }) =>
      network.createChange(ctx.tenantId, { title, description: description ?? null, priority: priority ?? "medium", status: "pending" }),
  },

  // ── Business Services ────────────────────────────────────────────────────
  // The whole section is admin-only (see access.policy), so these need no
  // permission key: nobody who isn't an admin reaches the section gate.
  services_create_goal: {
    section: "services", solution: "strategic", permission: null, effect: "create", title: "Strategic goal",
    description: "Create a strategic goal in planning status at 0% progress.",
    input: {
      title: str(160, required),
      category: str(40),
      description: str(1000),
      targetDate: date(),
      priority: oneOf(["low", "medium", "high"]),
    },
    run: (ctx, { targetDate, ...input }) =>
      services.createGoal(ctx.tenantId, { ...input, target_date: targetDate ?? null, progress: 0, status: "planning" }),
  },

  services_update_goal_progress: {
    section: "services", solution: "strategic", permission: null, effect: "update", title: "Strategic goal",
    description: "Record progress (0–100) on a strategic goal, optionally with a new status.",
    input: {
      id: id(required),
      progress: int(0, 100, required),
      status: oneOf(["planning", "in_progress", "at_risk", "completed"]),
    },
    async run(ctx, { id: goalId, ...changes }) {
      await findInTenant("bizGoal", ctx.tenantId, goalId, "goal");
      return services.updateGoal(ctx.tenantId, goalId, changes);
    },
  },

  services_draft_sop: {
    section: "services", solution: "operation", permission: null, effect: "create", title: "SOP draft",
    description: "Draft a standard operating procedure. Created as DRAFT so a person reviews it before anyone follows it.",
    input: {
      title: str(160, required),
      department: str(60, required),
      description: str(1000),
      steps: list(30, 300),
    },
    run: (ctx, input) => services.createSOP(ctx.tenantId, { ...input, steps: input.steps ?? [], status: "draft", version: "0.1" }),
  },

  services_create_client: {
    section: "services", solution: "marketing", permission: null, effect: "create", title: "Client",
    description: "Add a business client.",
    input: {
      name: str(160, required),
      company: str(160),
      email: email(),
      annualValue: num(0, 1e12),
      industry: str(60),
    },
    run: (ctx, { annualValue, ...input }) =>
      services.createClient(ctx.tenantId, { ...input, annual_value: annualValue ?? 0, status: "active" }),
  },
};

/** Permission keys the actions introduce. Inserted by migration so they can be granted. */
export const ACTION_PERMISSIONS = [...new Set(
  Object.values(ACTIONS).flatMap((a) => [a.permission, a.elevated]).filter(Boolean),
)].sort();

// ── Authorization ────────────────────────────────────────────────────────────
const ADMIN_ROLES = new Set(["enterprise_admin", "system_admin"]);
export const isAdminRole = (role) => ADMIN_ROLES.has(role);

/** May this caller take this action at all? (Ownership is checked again in `run`.) */
export function canPerform(action, { access, role, permissions = new Set() } = {}) {
  if (!action) return false;
  if (!hasSolutionAccess(access, action.section, action.solution)) return false;
  if (isAdminRole(role)) return true;
  return !action.permission || permissions.has(action.permission);
}

/** The actions this caller may see — and therefore the only ones the model is offered. */
export function actionCatalog(access, { role, permissions = new Set() } = {}) {
  return Object.entries(ACTIONS)
    .filter(([, action]) => canPerform(action, { access, role, permissions }))
    .map(([name, action]) => ({ name, ...action }));
}

// ── Input validation ─────────────────────────────────────────────────────────
// Every action's input is checked here against its declared fields, regardless
// of what the provider claims about schema enforcement — models invent fields.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function coerceField(name, spec, raw) {
  switch (spec.type) {
    case "string": {
      if (typeof raw !== "string") throw err(`${name} must be text.`);
      const v = raw.trim();
      if (!v) throw err(`${name} cannot be empty.`);
      if (v.length > spec.max) throw err(`${name} must be ${spec.max} characters or fewer.`);
      return v;
    }
    case "id": {
      if (typeof raw !== "string" || !raw.trim() || raw.length > 200) throw err(`${name} must be a record id.`);
      return raw.trim();
    }
    case "email": {
      if (typeof raw !== "string" || raw.length > spec.max || !EMAIL.test(raw.trim())) throw err(`${name} must be an email address.`);
      return raw.trim().toLowerCase();
    }
    case "number":
    case "integer": {
      const v = typeof raw === "string" && raw.trim() !== "" ? Number(raw) : raw;
      if (typeof v !== "number" || !Number.isFinite(v)) throw err(`${name} must be a number.`);
      if (spec.type === "integer" && !Number.isInteger(v)) throw err(`${name} must be a whole number.`);
      if (v < spec.min || v > spec.max) throw err(`${name} must be between ${spec.min} and ${spec.max}.`);
      return v;
    }
    case "enum": {
      if (!spec.values.includes(raw)) throw err(`${name} must be one of: ${spec.values.join(", ")}.`);
      return raw;
    }
    case "date": {
      if (typeof raw !== "string" || raw.length > 40) throw err(`${name} must be an ISO date.`);
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) throw err(`${name} must be an ISO date.`);
      const year = d.getUTCFullYear();
      if (year < 2000 || year > 2100) throw err(`${name} is out of range.`);
      return raw;
    }
    case "list": {
      if (!Array.isArray(raw) || raw.length > spec.max) throw err(`${name} must be a list of at most ${spec.max} items.`);
      return raw.map((item, i) => coerceField(`${name}[${i}]`, { type: "string", max: spec.itemMax }, item));
    }
    default:
      throw err(`${name} has an unsupported type.`);
  }
}

/** Validate and normalize `raw` for `action`. Unknown fields are an error. */
export function validateInput(action, raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw err("Action input must be an object.");
  const unknown = Object.keys(raw).filter((k) => !(k in action.input));
  if (unknown.length) throw err(`Not accepted for this action: ${unknown.join(", ")}.`);

  const out = {};
  for (const [name, spec] of Object.entries(action.input)) {
    const present = raw[name] !== undefined && raw[name] !== null;
    if (!present) {
      if (spec.required) throw err(`${name} is required.`);
      continue;
    }
    out[name] = coerceField(name, spec, raw[name]);
  }
  if (action.atLeastOne && !action.atLeastOne.some((k) => k in out)) {
    throw err(`Provide at least one of: ${action.atLeastOne.join(", ")}.`);
  }
  return out;
}

/** One compact line per action, for the model's tool description. */
export function describeAction(name, action) {
  const fields = Object.entries(action.input).map(([field, spec]) => {
    const kind = spec.type === "enum" ? spec.values.join("|") : spec.type === "list" ? "string[]" : spec.type;
    return `${field}${spec.required ? "*" : ""}:${kind}`;
  });
  return `${name} — ${action.description} Input {${fields.join(", ")}}`;
}

/**
 * Validate, authorize and run one action. Throws on anything not permitted.
 * `ctx`: { tenantId, userId, role, access, permissions:Set<string> }.
 */
export async function performAction(name, rawInput, ctx) {
  const action = Object.hasOwn(ACTIONS, name) ? ACTIONS[name] : null;
  if (!canPerform(action, ctx)) throw err("That action is not available to you.");
  const input = validateInput(action, rawInput);
  const can = (permission) => isAdminRole(ctx.role) || ctx.permissions.has(permission);
  const result = await action.run({ ...ctx, can }, input);
  return { action, input, result };
}
