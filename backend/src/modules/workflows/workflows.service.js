/**
 * Workflow management — create, edit and inspect automation rules.
 *
 * A workflow is validated against the resource registry at save time, so a
 * broken rule is rejected when someone writes it rather than failing silently
 * at 3am against a live record.
 */
import prisma from "../../config/database.js";
import { getResource, RESOURCES, eventTypes } from "../api/api.resources.js";
import { validateConditions, describeRule, CONDITION_OPS, VALUELESS_OPS } from "./workflows.rules.js";
import { validateActions, actionCatalog, ACTION_TYPES } from "./workflows.actions.js";
import { runWorkflow, listRuns } from "./workflows.engine.js";

const err = (message, status = 400) => { const e = new Error(message); e.status = status; return e; };

/** "opportunities.updated" → { resource: "opportunities", action: "updated" } */
export function parseTrigger(triggerEvent) {
  const [resourceId, action] = String(triggerEvent || "").split(".");
  const resource = getResource(resourceId);
  if (!resource || !["created", "updated", "deleted"].includes(action)) {
    throw err(`Unknown trigger "${triggerEvent}". Use <resource>.created|updated|deleted.`);
  }
  return { resource, resourceId, action };
}

const shape = (w) => ({
  id: w.id,
  name: w.name,
  description: w.description,
  triggerEvent: w.triggerEvent,
  match: w.match,
  conditions: w.conditions,
  actions: w.actions,
  oncePerRecord: w.oncePerRecord,
  active: w.active,
  runCount: w.runCount,
  lastRunAt: w.lastRunAt,
  lastStatus: w.lastStatus,
  lastError: w.lastError,
  summary: safeSummary(w),
  createdAt: w.createdAt,
  updatedAt: w.updatedAt,
});

function safeSummary(w) {
  try {
    const { resourceId, action } = parseTrigger(w.triggerEvent);
    const when = describeRule(resourceId, w.conditions || [], w.match);
    const does = (w.actions || []).map((a) => ACTION_TYPES[a.type] || a.type).join(", ");
    return `When a ${getResource(resourceId)?.name} is ${action} and ${when} → ${does}`;
  } catch {
    return null;
  }
}

/** Everything the builder UI needs to compose a rule. */
export function catalog() {
  return {
    triggers: eventTypes(),
    operators: Object.entries(CONDITION_OPS).map(([op, label]) => ({ op, label, valueless: VALUELESS_OPS.includes(op) })),
    ...actionCatalog(),
    resourceFields: Object.fromEntries(
      Object.values(RESOURCES).map((r) => [
        r.id,
        Object.entries(r.fields).map(([key, m]) => ({
          key, type: m.type, writable: !!m.writable, enum: m.enum || undefined,
        })),
      ]),
    ),
  };
}

export async function listWorkflows() {
  const rows = await prisma.workflow.findMany({ orderBy: { createdAt: "desc" } });
  return rows.map(shape);
}

export async function getWorkflow(id) {
  const row = await prisma.workflow.findFirst({ where: { id } });
  if (!row) throw err("Workflow not found", 404);
  return shape(row);
}

function validatePayload(body) {
  const name = String(body.name || "").trim();
  if (!name) throw err("Give the workflow a name");
  const { resourceId } = parseTrigger(body.triggerEvent);
  const match = body.match === "any" ? "any" : "all";
  const conditions = validateConditions(resourceId, body.conditions || [], match);
  const actions = validateActions(resourceId, body.actions || []);
  return {
    name: name.slice(0, 120),
    description: body.description ? String(body.description).slice(0, 500) : null,
    triggerEvent: body.triggerEvent,
    match,
    conditions,
    actions,
    oncePerRecord: !!body.oncePerRecord,
    active: body.active === undefined ? true : !!body.active,
  };
}

export async function createWorkflow(userId, body = {}) {
  const data = validatePayload(body);
  const row = await prisma.workflow.create({ data: { ...data, createdById: userId } });
  return shape(row);
}

export async function updateWorkflow(id, body = {}) {
  const existing = await prisma.workflow.findFirst({ where: { id } });
  if (!existing) throw err("Workflow not found", 404);
  // Toggling active is a common one-field action; don't force a full payload.
  if (Object.keys(body).length === 1 && body.active !== undefined) {
    const row = await prisma.workflow.update({ where: { id }, data: { active: !!body.active } });
    return shape(row);
  }
  const data = validatePayload({ ...existing, ...body });
  const row = await prisma.workflow.update({ where: { id }, data });
  return shape(row);
}

export async function deleteWorkflow(id) {
  const existing = await prisma.workflow.findFirst({ where: { id } });
  if (!existing) throw err("Workflow not found", 404);
  await prisma.workflow.delete({ where: { id } }); // runs cascade
  return { deleted: true, id };
}

/**
 * Dry-run a workflow against a real record without performing any action —
 * so someone can confirm a rule matches what they think before enabling it.
 */
export async function testWorkflow(tenantId, id, { recordId } = {}) {
  const wf = await prisma.workflow.findFirst({ where: { id } });
  if (!wf) throw err("Workflow not found", 404);
  const { resource, resourceId, action } = parseTrigger(wf.triggerEvent);

  const record = recordId
    ? await prisma[resource.model].findFirst({ where: { id: recordId } })
    : await prisma[resource.model].findFirst({ orderBy: { createdAt: "desc" } });

  if (!record) {
    return { matched: false, message: `No ${resource.name} records to test against yet.`, record: null };
  }

  const outcome = await runWorkflow(wf, { tenantId, type: `${resourceId}.${action}`, resource: resourceId, record, dryRun: true });
  return {
    ...outcome,
    record: { id: record.id, label: record.name || record.title || record.subject || record.hostname || record.id },
    rule: describeRule(resourceId, wf.conditions || [], wf.match),
    message: outcome.matched
      ? "This record matches — the actions below would run."
      : "This record does not match the conditions, so nothing would run.",
  };
}

export const runHistory = (params) => listRuns(params);
