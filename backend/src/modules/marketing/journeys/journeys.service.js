/**
 * Journey Builder and Automation Studio: saving, versioning, testing and
 * running journeys. Both pages use the same records; an "automation" is a
 * journey whose usual trigger is a schedule over an audience.
 *
 *   draft     being built; nothing runs
 *   active    the published version enrolls and moves contacts
 *   paused    nobody enters or moves; waits resume where they were
 *   archived  finished for good; anyone still inside leaves
 *
 * Editing changes the draft only. Publishing validates the draft completely,
 * checks every email, audience, assignee and channel it names, and freezes it
 * as the next version. People already inside stay on the version they entered.
 */
import prisma from "../../../config/database.js";
import { validate, checkReferences, emptyDefinition, NODE_TYPES, TRIGGERS, EVERY, UNITS, TASK_TYPES, NOTIFY_AUDIENCES } from "./definition.js";
import { EVENT_TYPES, compile } from "../segments.js";
import { enroll, bucket } from "./engine.js";

const err = (message, status = 400) => Object.assign(new Error(message), { status });
const KINDS = ["journey", "automation"];

async function load(tenantId, id) {
  const j = await prisma.marketingJourney.findFirst({ where: { id: String(id), tenantId } });
  if (!j) throw err("Journey not found", 404);
  return j;
}

const audit = (tenantId, userId, action, j, detail) =>
  prisma.auditLog.create({ data: { tenantId, userId, action, resource: "marketing_journey", resourceId: j.id, detail: `${detail} "${j.name}"` } }).catch(() => {});

export function catalog() {
  return { nodeTypes: NODE_TYPES, triggers: TRIGGERS, events: EVENT_TYPES, every: Object.keys(EVERY), units: Object.keys(UNITS), taskTypes: TASK_TYPES, notifyAudiences: NOTIFY_AUDIENCES };
}

/** The real things a journey can point at, for the editor's dropdowns. */
export async function pickers(tenantId) {
  const [emails, audiences, members, routes] = await Promise.all([
    prisma.marketingCampaign.findMany({ where: { tenantId, channel: "email", mode: "triggered", status: { in: ["draft", "active", "paused"] } }, orderBy: { name: "asc" }, select: { id: true, name: true, status: true, subject: true } }),
    prisma.marketingAudience.findMany({ where: { tenantId }, orderBy: { name: "asc" }, select: { id: true, name: true, kind: true } }),
    prisma.user.findMany({ where: { tenantId, isActive: true }, orderBy: { firstName: "asc" }, select: { id: true, firstName: true, lastName: true, department: true, role: { select: { name: true } } } }),
    prisma.chatRoute.findMany({ where: { tenantId, enabled: true }, orderBy: { label: "asc" }, select: { id: true, label: true, provider: true } }),
  ]);
  return {
    emails, audiences, routes,
    members: members.map((u) => ({ id: u.id, name: `${u.firstName} ${u.lastName}`.trim(), department: u.department, role: u.role?.name ?? null })),
  };
}

/** Find CRM contacts by name or email (testing and manual enrollment). */
export async function searchContacts(tenantId, q) {
  const s = String(q ?? "").trim().slice(0, 100);
  return prisma.contact.findMany({
    where: { tenantId, ...(s ? { OR: [{ name: { contains: s, mode: "insensitive" } }, { email: { contains: s, mode: "insensitive" } }] } : {}) },
    orderBy: { createdAt: "desc" }, take: 20, select: { id: true, name: true, email: true },
  });
}

async function counts(tenantId, ids) {
  if (!ids.length) return {};
  const rows = await prisma.marketingJourneyEnrollment.groupBy({ by: ["journeyId", "status"], where: { tenantId, journeyId: { in: ids } }, _count: { _all: true } });
  const goals = await prisma.marketingJourneyEnrollment.groupBy({ by: ["journeyId"], where: { tenantId, journeyId: { in: ids }, exitReason: "goal" }, _count: { _all: true } });
  const out = {};
  for (const id of ids) out[id] = { entered: 0, inside: 0, completed: 0, exited: 0, failed: 0, converted: 0 };
  for (const r of rows) {
    const o = out[r.journeyId];
    o.entered += r._count._all;
    if (r.status === "active" || r.status === "waiting") o.inside += r._count._all;
    else o[r.status] = (o[r.status] ?? 0) + r._count._all;
  }
  for (const g of goals) out[g.journeyId].converted = g._count._all;
  return out;
}

const summary = (j, c, version) => ({
  id: j.id, name: j.name, description: j.description, kind: j.kind, status: j.status,
  triggerType: j.triggerType, version: version ?? null, nextRunAt: j.nextRunAt, lastRunAt: j.lastRunAt, lastError: j.lastError,
  steps: Object.keys(j.draft?.nodes ?? {}).length, createdAt: j.createdAt, updatedAt: j.updatedAt, ...c,
});

export async function list(tenantId, { kind } = {}) {
  const rows = await prisma.marketingJourney.findMany({ where: { tenantId, ...(KINDS.includes(kind) ? { kind } : {}), status: { not: "archived" } }, orderBy: { updatedAt: "desc" } });
  const c = await counts(tenantId, rows.map((r) => r.id));
  const versions = await prisma.marketingJourneyVersion.findMany({ where: { tenantId, id: { in: rows.map((r) => r.currentVersionId).filter(Boolean) } }, select: { id: true, version: true } });
  const vmap = Object.fromEntries(versions.map((v) => [v.id, v.version]));
  return rows.map((j) => summary(j, c[j.id], vmap[j.currentVersionId]));
}

export async function get(tenantId, id) {
  const j = await load(tenantId, id);
  const [c, versions] = await Promise.all([
    counts(tenantId, [j.id]),
    prisma.marketingJourneyVersion.findMany({ where: { tenantId, journeyId: j.id }, orderBy: { version: "desc" }, select: { id: true, version: true, note: true, publishedById: true, createdAt: true } }),
  ]);
  const live = versions.find((v) => v.id === j.currentVersionId);
  return { ...summary(j, c[j.id], live?.version), draft: j.draft, versions };
}

export async function create(tenantId, userId, body = {}) {
  const name = String(body.name ?? "").trim();
  if (!name) throw err("Give it a name");
  const kind = KINDS.includes(body.kind) ? body.kind : "journey";
  const draft = body.draft ? validate(body.draft) : emptyDefinition(kind);
  const j = await prisma.marketingJourney.create({ data: { tenantId, name: name.slice(0, 160), description: body.description ? String(body.description).slice(0, 500) : null, kind, draft, createdById: userId } });
  await audit(tenantId, userId, "marketing.journey.created", j, "Created");
  return get(tenantId, j.id);
}

export async function updateDraft(tenantId, id, body = {}) {
  const j = await load(tenantId, id);
  if (j.status === "archived") throw err("An archived journey can't be edited. Duplicate it instead.", 409);
  const data = {};
  if (body.name !== undefined) {
    const name = String(body.name ?? "").trim();
    if (!name) throw err("Give it a name");
    data.name = name.slice(0, 160);
  }
  if (body.description !== undefined) data.description = body.description ? String(body.description).slice(0, 500) : null;
  if (body.draft !== undefined) data.draft = validate(body.draft);
  await prisma.marketingJourney.update({ where: { id: j.id }, data });
  return get(tenantId, j.id);
}

/** Everything that would stop the draft from publishing. */
export async function check(tenantId, id) {
  const j = await load(tenantId, id);
  let def;
  try { def = validate(j.draft, { strict: true }); } catch (e) { return { ready: false, problems: [e.message] }; }
  const problems = await checkReferences(tenantId, def);
  return { ready: problems.length === 0, problems };
}

export async function publish(tenantId, userId, id, { note } = {}) {
  const j = await load(tenantId, id);
  if (j.status === "archived") throw err("An archived journey can't be published", 409);
  const def = validate(j.draft, { strict: true });
  const problems = await checkReferences(tenantId, def);
  if (problems.length) throw err(problems.join(" "));
  const last = await prisma.marketingJourneyVersion.findFirst({ where: { tenantId, journeyId: j.id }, orderBy: { version: "desc" } });
  const version = await prisma.marketingJourneyVersion.create({ data: { tenantId, journeyId: j.id, version: (last?.version ?? 0) + 1, definition: def, note: note ? String(note).slice(0, 300) : null, publishedById: userId } });
  const t = def.trigger;
  await prisma.marketingJourney.update({
    where: { id: j.id },
    data: {
      currentVersionId: version.id, status: "active", lastError: null, triggerType: t.type,
      triggerKey: t.type === "event" ? t.event : t.type === "audience" ? t.audienceId : null,
      nextRunAt: t.type === "audience" ? new Date() : null,
    },
  });
  await audit(tenantId, userId, "marketing.journey.published", j, `Published version ${version.version} of`);
  return get(tenantId, j.id);
}

export async function pause(tenantId, userId, id) {
  const j = await load(tenantId, id);
  if (j.status !== "active") throw err(`A ${j.status} journey can't be paused`, 409);
  await prisma.marketingJourney.update({ where: { id: j.id }, data: { status: "paused" } });
  await audit(tenantId, userId, "marketing.journey.paused", j, "Paused");
  return get(tenantId, j.id);
}

export async function resume(tenantId, userId, id) {
  const j = await load(tenantId, id);
  if (j.status !== "paused" || !j.currentVersionId) throw err("Only a paused, published journey can be resumed", 409);
  const v = await prisma.marketingJourneyVersion.findFirst({ where: { id: j.currentVersionId, tenantId } });
  const problems = await checkReferences(tenantId, v.definition);
  if (problems.length) throw err(problems.join(" "));
  await prisma.marketingJourney.update({ where: { id: j.id }, data: { status: "active", ...(j.triggerType === "audience" && (!j.nextRunAt || j.nextRunAt < new Date()) ? { nextRunAt: new Date() } : {}) } });
  await audit(tenantId, userId, "marketing.journey.resumed", j, "Resumed");
  return get(tenantId, j.id);
}

export async function archive(tenantId, userId, id) {
  const j = await load(tenantId, id);
  if (j.status === "archived") return get(tenantId, j.id);
  const left = await prisma.marketingJourneyEnrollment.updateMany({
    where: { tenantId, journeyId: j.id, status: { in: ["active", "waiting"] } },
    data: { status: "exited", exitReason: "archived", activeKey: null, waitUntil: null, waitEvent: null, lockedAt: null, finishedAt: new Date() },
  });
  await prisma.marketingJourney.update({ where: { id: j.id }, data: { status: "archived", nextRunAt: null } });
  await audit(tenantId, userId, "marketing.journey.archived", j, `Archived (${left.count} contact(s) removed from)`);
  return { status: "archived", removed: left.count };
}

export async function duplicate(tenantId, userId, id) {
  const j = await load(tenantId, id);
  return create(tenantId, userId, { name: `${j.name} (copy)`, description: j.description, kind: j.kind, draft: j.draft });
}

export async function remove(tenantId, userId, id) {
  const j = await load(tenantId, id);
  const live = await prisma.marketingJourneyEnrollment.count({ where: { tenantId, journeyId: j.id, status: { in: ["active", "waiting"] } } });
  if (live) throw err("Contacts are still inside this journey. Archive it first.", 409);
  if (j.status === "active") throw err("Pause or archive the journey before deleting it", 409);
  await prisma.marketingJourney.delete({ where: { id: j.id } });
  await audit(tenantId, userId, "marketing.journey.deleted", j, "Deleted");
  return { deleted: true };
}

/** Enroll chosen CRM contacts by hand. */
export async function enrollContacts(tenantId, userId, id, contactIds) {
  const j = await load(tenantId, id);
  if (j.status !== "active") throw err("Publish (or resume) the journey before enrolling anyone", 409);
  const ids = [...new Set((Array.isArray(contactIds) ? contactIds : []).map(String))].slice(0, 1000);
  if (!ids.length) throw err("Choose at least one contact");
  const valid = await prisma.contact.findMany({ where: { tenantId, id: { in: ids } }, select: { id: true } });
  const n = await enroll(j, valid.map((c) => c.id), { type: "manual", by: userId });
  await audit(tenantId, userId, "marketing.journey.enrolled", j, `Enrolled ${n} contact(s) into`);
  return { enrolled: n, skipped: ids.length - n };
}

export async function removeEnrollment(tenantId, userId, id, enrollmentId) {
  const j = await load(tenantId, id);
  const r = await prisma.marketingJourneyEnrollment.updateMany({
    where: { id: String(enrollmentId), tenantId, journeyId: j.id, status: { in: ["active", "waiting"] } },
    data: { status: "exited", exitReason: "removed", activeKey: null, waitUntil: null, waitEvent: null, lockedAt: null, finishedAt: new Date() },
  });
  if (!r.count) throw err("That contact isn't inside this journey", 404);
  await audit(tenantId, userId, "marketing.journey.removed", j, "Removed a contact from");
  return { removed: true };
}

export async function enrollments(tenantId, id, { status, limit = 100 } = {}) {
  const j = await load(tenantId, id);
  const rows = await prisma.marketingJourneyEnrollment.findMany({
    where: { tenantId, journeyId: j.id, ...(status ? { status: String(status) } : {}) },
    orderBy: { updatedAt: "desc" }, take: Math.min(500, Number(limit) || 100),
    include: { contact: { select: { id: true, name: true, email: true } }, version: { select: { version: true } } },
  });
  return rows.map((e) => ({
    id: e.id, contact: e.contact, version: e.version.version, status: e.status, nodeId: e.nodeId, waitUntil: e.waitUntil, waitEvent: e.waitEvent,
    steps: e.steps, attempts: e.attempts, exitReason: e.exitReason, lastError: e.lastError, trigger: e.trigger, enteredAt: e.enteredAt, finishedAt: e.finishedAt,
  }));
}

export async function history(tenantId, id, enrollmentId) {
  const j = await load(tenantId, id);
  const e = await prisma.marketingJourneyEnrollment.findFirst({ where: { id: String(enrollmentId), tenantId, journeyId: j.id } });
  if (!e) throw err("Enrollment not found", 404);
  const steps = await prisma.marketingJourneyStep.findMany({ where: { tenantId, enrollmentId: e.id }, orderBy: { seq: "asc" } });
  return steps.map((s) => {
    const { __next, ...detail } = s.detail ?? {};
    return { seq: s.seq, nodeId: s.nodeId, type: s.type, outcome: s.outcome, detail, error: s.error, at: s.updatedAt };
  });
}

/** Per-step outcomes and totals, from enrollment and history rows. */
export async function stats(tenantId, id) {
  const j = await load(tenantId, id);
  const [c, byNode, atNode] = await Promise.all([
    counts(tenantId, [j.id]),
    prisma.marketingJourneyStep.groupBy({ by: ["nodeId", "outcome"], where: { tenantId, journeyId: j.id }, _count: { _all: true } }),
    prisma.marketingJourneyEnrollment.groupBy({ by: ["nodeId"], where: { tenantId, journeyId: j.id, status: { in: ["active", "waiting"] } }, _count: { _all: true } }),
  ]);
  const nodes = {};
  for (const r of byNode) (nodes[r.nodeId] ??= { done: 0, skipped: 0, failed: 0, retry: 0, started: 0, here: 0 })[r.outcome] = r._count._all;
  for (const r of atNode) if (r.nodeId) (nodes[r.nodeId] ??= { done: 0, skipped: 0, failed: 0, retry: 0, started: 0, here: 0 }).here = r._count._all;
  const runs = j.kind === "automation" || j.triggerType === "audience"
    ? await prisma.marketingEvent.findMany({ where: { tenantId, type: "journey.run", properties: { path: ["journeyId"], equals: j.id } }, orderBy: { occurredAt: "desc" }, take: 20, select: { occurredAt: true, properties: true } })
    : [];
  return { ...c[j.id], nodes, runs: runs.map((r) => ({ at: r.occurredAt, enrolled: r.properties?.enrolled ?? 0, version: r.properties?.versionId ?? null })) };
}

/**
 * Test a journey against one real contact without doing anything: which
 * branches they'd take, what they'd be sent, where they'd wait. Uses the draft
 * by default, so you can test before publishing.
 */
export async function simulate(tenantId, id, { contactId, useDraft = true } = {}) {
  const j = await load(tenantId, id);
  let def = j.draft;
  if (!useDraft && j.currentVersionId) def = (await prisma.marketingJourneyVersion.findFirst({ where: { id: j.currentVersionId, tenantId } })).definition;
  def = validate(def, { strict: true });
  const contact = await prisma.contact.findFirst({ where: { id: String(contactId ?? ""), tenantId }, select: { id: true, name: true, email: true } });
  if (!contact) throw err("Choose a contact to test with", 404);
  const is = async (rules) => (await prisma.contact.count({ where: { AND: [{ id: contact.id, tenantId }, await compile(rules, tenantId)] } })) > 0;
  const consent = await prisma.marketingConsent.findFirst({ where: { tenantId, contactId: contact.id, channel: "email" } });
  const suppressed = !!(await prisma.marketingSuppression.findFirst({ where: { tenantId, email: String(contact.email).toLowerCase() } }));

  const path = [];
  if (def.goal && await is(def.goal)) return { contact, path, outcome: "This contact already meets the goal, so they'd finish straight away." };
  if (def.exit && await is(def.exit)) return { contact, path, outcome: "This contact matches the exit rules, so they'd leave straight away." };
  let nodeId = def.entry;
  const simId = `simulation:${contact.id}`;
  while (nodeId && path.length < 100) {
    const n = def.nodes[nodeId];
    const step = { nodeId, type: n.type, label: n.label ?? NODE_TYPES[n.type].label };
    let next = n.next ?? null;
    switch (n.type) {
      case "condition": { const yes = await is(n.rules); step.note = yes ? "Matches → yes" : "Doesn't match → no"; next = yes ? n.yes : n.no; break; }
      case "split": { const a = bucket(simId, nodeId) < n.percent; step.note = `Path ${a ? "A" : "B"} (${a ? n.percent : 100 - n.percent}% of contacts)`; next = a ? n.a : n.b; break; }
      case "wait": step.note = `Waits ${n.amount} ${n.unit}`; break;
      case "wait_for_event": step.note = `Waits up to ${n.days} day(s) for ${n.event}; this test follows the path where it happens`; break;
      case "send_email": step.note = consent?.status !== "subscribed" ? `Skipped — no email consent (${consent?.status ?? "none recorded"})` : suppressed ? "Skipped — address is suppressed" : `Sends to ${contact.email}`; break;
      default: break;
    }
    path.push(step);
    nodeId = next;
  }
  return { contact, path, outcome: "Finishes the journey." };
}
