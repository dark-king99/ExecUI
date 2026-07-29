/**
 * Workflow actions — what an automation is allowed to *do*.
 *
 * Every action is a named, whitelisted operation with its own validator, so a
 * workflow can only perform things this file implements. There is no "run
 * script" escape hatch, and record writes are validated through the same public
 * API registry that guards external callers — an automation therefore can't set
 * a field a person couldn't set through the API.
 *
 * Validators are pure (unit-tested); executors take a context and touch the DB.
 */
import prisma from "../../config/database.js";
import { getResource, RESOURCES } from "../api/api.resources.js";
import { validateBody, serialize } from "../api/api.service.js";
import { notify, notifyMany } from "../notifications/notifications.service.js";
import { sendEmail } from "../../lib/email.js";
import { renderTemplate } from "./workflows.rules.js";

const err = (message, status = 400) => { const e = new Error(message); e.status = status; return e; };

export const AUDIENCE_TYPES = ["role", "department", "user", "admins", "record_owner"];

export const ACTION_TYPES = {
  update_record:    "Update the record that triggered this",
  create_record:    "Create a new record",
  notify:           "Send an in-app notification",
  send_email:       "Send an email",
  request_approval: "Require approval",
};

const isEmail = (s) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(s).trim());

// ── Audience ─────────────────────────────────────────────────────────────────
function validateAudience(a = {}) {
  if (!AUDIENCE_TYPES.includes(a.type)) throw err(`Unknown audience type "${a.type}"`);
  if (["role", "department", "user"].includes(a.type) && !String(a.value || "").trim()) {
    throw err(`Audience "${a.type}" needs a value`);
  }
  return { type: a.type, value: a.value ? String(a.value).trim() : null };
}

/** Resolve an audience to concrete user ids inside the current tenant. */
export async function resolveAudience(audience, ctx = {}) {
  const { type, value } = audience || {};
  const base = { isActive: true };
  let where;

  switch (type) {
    case "user":       where = { ...base, id: value }; break;
    case "department": where = { ...base, department: { equals: value, mode: "insensitive" } }; break;
    case "role":       where = { ...base, role: { name: value } }; break;
    case "admins":     where = { ...base, role: { name: { in: ["enterprise_admin", "system_admin"] } } }; break;
    case "record_owner": {
      const ownerId = ctx.record?.ownerId || ctx.record?.userId || ctx.record?.createdById;
      if (!ownerId) return [];
      where = { ...base, id: ownerId };
      break;
    }
    default: return [];
  }
  const users = await prisma.user.findMany({ where, select: { id: true } });
  return users.map((u) => u.id);
}

// ── Validation ───────────────────────────────────────────────────────────────
/**
 * Validate one action against the triggering resource.
 * Throws a 400 with an actionable message; returns the normalized action.
 */
export function validateAction(triggerResourceId, action = {}) {
  const type = action.type;
  if (!ACTION_TYPES[type]) throw err(`Unknown action "${type}"`);

  switch (type) {
    case "update_record": {
      const resource = getResource(triggerResourceId);
      if (!resource) throw err(`Unknown resource "${triggerResourceId}"`);
      if (resource.readOnly) throw err(`${resource.name} records can't be updated by a workflow`);
      const fields = action.fields || {};
      if (!Object.keys(fields).length) throw err("Choose at least one field to update");
      // Template placeholders are resolved at run time, so validate the shape
      // with placeholders stripped — the real value is re-validated on write.
      const probe = Object.fromEntries(
        Object.entries(fields).map(([k, v]) => [k, typeof v === "string" && v.includes("{{") ? "" : v]),
      );
      const withValues = Object.fromEntries(Object.entries(probe).filter(([, v]) => v !== ""));
      if (Object.keys(withValues).length) validateBody(resource, withValues, { partial: true });
      // Any templated key must still be a writable field.
      for (const key of Object.keys(fields)) {
        const meta = resource.fields[key];
        if (!meta?.writable) throw err(`"${key}" is not a writable field on ${resource.name}`);
      }
      return { type, fields };
    }

    case "create_record": {
      const target = getResource(action.resource);
      if (!target) throw err(`Unknown resource "${action.resource}"`);
      if (target.readOnly) throw err(`${target.name} records can't be created by a workflow`);
      const fields = action.fields || {};
      for (const key of Object.keys(fields)) {
        if (!target.fields[key]?.writable) throw err(`"${key}" is not a writable field on ${target.name}`);
      }
      // Required fields must be supplied (a literal or a template).
      const missing = Object.entries(target.fields)
        .filter(([, m]) => m.required)
        .map(([k]) => k)
        .filter((k) => fields[k] === undefined || fields[k] === "");
      if (missing.length) throw err(`Missing required field(s) for ${target.name}: ${missing.join(", ")}`);
      return { type, resource: target.id, fields };
    }

    case "notify": {
      if (!String(action.title || "").trim()) throw err("Notification needs a title");
      return {
        type,
        audience: validateAudience(action.audience),
        title: String(action.title).slice(0, 200),
        body: action.body ? String(action.body).slice(0, 1000) : null,
        link: action.link ? String(action.link).slice(0, 300) : null,
      };
    }

    case "send_email": {
      const to = (Array.isArray(action.to) ? action.to : String(action.to || "").split(","))
        .map((s) => String(s).trim()).filter(Boolean);
      if (!to.length) throw err("Email action needs at least one recipient");
      if (to.length > 20) throw err("An email action can have at most 20 recipients");
      // A recipient may be a literal address or a {{record.field}} placeholder.
      for (const t of to) {
        if (!t.includes("{{") && !isEmail(t)) throw err(`"${t}" is not a valid email address`);
      }
      if (!String(action.subject || "").trim()) throw err("Email needs a subject");
      return {
        type, to,
        subject: String(action.subject).slice(0, 300),
        body: String(action.body || "").slice(0, 5000),
      };
    }

    case "request_approval": {
      if (!String(action.title || "").trim()) throw err("Approval needs a title");
      const steps = Array.isArray(action.steps) ? action.steps : [];
      if (!steps.length) throw err("An approval needs at least one step");
      if (steps.length > 5) throw err("An approval can have at most 5 steps");
      return {
        type,
        title: String(action.title).slice(0, 200),
        summary: action.summary ? String(action.summary).slice(0, 1000) : null,
        steps: steps.map((s, i) => {
          const audience = validateAudience(s.approvers);
          const requiredCount = Math.max(1, Math.min(10, Number(s.requiredCount) || 1));
          return { name: String(s.name || `Step ${i + 1}`).slice(0, 80), approvers: audience, requiredCount };
        }),
      };
    }

    default:
      throw err(`Unknown action "${type}"`);
  }
}

/** Validate a whole action list. */
export function validateActions(triggerResourceId, actions = []) {
  const list = Array.isArray(actions) ? actions : [];
  if (!list.length) throw err("A workflow needs at least one action");
  if (list.length > 10) throw err("A workflow can have at most 10 actions");
  return list.map((a) => validateAction(triggerResourceId, a));
}

// ── Execution ────────────────────────────────────────────────────────────────
/** Resolve template placeholders in a field map. */
const renderFields = (fields, ctx) =>
  Object.fromEntries(
    Object.entries(fields).map(([k, v]) => [k, typeof v === "string" ? renderTemplate(v, ctx) : v]),
  );

/**
 * Execute one action. Returns a small result object for the run log. Throws only
 * on genuine failure — the caller records it against the run.
 */
export async function executeAction(action, ctx) {
  const { record = {}, event = "", resourceId, tenantId, userId } = ctx;
  const tpl = { record, event };

  switch (action.type) {
    case "update_record": {
      const resource = getResource(resourceId);
      if (!record.id) return { type: action.type, skipped: "no record id" };
      const data = validateBody(resource, renderFields(action.fields, tpl), { partial: true });
      const updated = await prisma[resource.model].update({ where: { id: record.id }, data });
      return { type: action.type, resource: resource.id, id: record.id, fields: Object.keys(data), record: serialize(resource, updated) };
    }

    case "create_record": {
      const target = getResource(action.resource);
      const data = validateBody(target, renderFields(action.fields, tpl));
      const created = await prisma[target.model].create({ data });
      return { type: action.type, resource: target.id, id: created.id };
    }

    case "notify": {
      const ids = await resolveAudience(action.audience, ctx);
      if (!ids.length) return { type: action.type, skipped: "no matching recipients" };
      await notifyMany(ids, {
        tenantId,
        type: "workflow",
        title: renderTemplate(action.title, tpl),
        body: action.body ? renderTemplate(action.body, tpl) : null,
        link: action.link || null,
        actorName: "Automation",
      });
      return { type: action.type, notified: ids.length };
    }

    case "send_email": {
      const to = action.to.map((t) => renderTemplate(t, tpl).trim()).filter((t) => isEmail(t));
      if (!to.length) return { type: action.type, skipped: "no valid recipients after templating" };
      const res = await sendEmail({
        tenantId,
        to,
        subject: renderTemplate(action.subject, tpl),
        text: renderTemplate(action.body, tpl),
        context: "workflow",
        userId,
      });
      return { type: action.type, to, sent: !!res.sent, skipped: res.skipped ? res.message : undefined };
    }

    case "request_approval": {
      // Imported lazily: the approvals service runs actions when a chain
      // completes, so a static import here would create a cycle.
      const { createRequest } = await import("../approvals/approvals.service.js");
      const request = await createRequest({
        tenantId,
        title: renderTemplate(action.title, tpl),
        summary: action.summary ? renderTemplate(action.summary, tpl) : null,
        resource: resourceId,
        recordId: record.id || null,
        recordLabel: record.name || record.title || record.subject || record.hostname || null,
        steps: action.steps,
        requestedById: userId || null,
        workflowId: ctx.workflowId || null,
        ctx,
      });
      return { type: action.type, requestId: request.id, steps: request.steps.length };
    }

    default:
      return { type: action.type, skipped: "unknown action" };
  }
}

/** Run a list of actions in order, collecting per-action outcomes. */
export async function executeActions(actions = [], ctx) {
  const results = [];
  for (const action of actions) {
    try {
      results.push({ ok: true, ...(await executeAction(action, ctx)) });
    } catch (e) {
      results.push({ ok: false, type: action.type, error: String(e.message).slice(0, 400) });
    }
  }
  return results;
}

/** Catalog for the builder UI. */
export function actionCatalog() {
  return {
    actions: Object.entries(ACTION_TYPES).map(([type, label]) => ({ type, label })),
    audiences: AUDIENCE_TYPES,
    resources: Object.values(RESOURCES).map((r) => ({
      id: r.id,
      name: r.name,
      readOnly: !!r.readOnly,
      fields: Object.entries(r.fields).map(([key, m]) => ({
        key, label: key, type: m.type, writable: !!m.writable, required: !!m.required, enum: m.enum || undefined,
      })),
    })),
  };
}
