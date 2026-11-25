/**
 * A journey's definition: what starts it, the steps, and when people leave.
 *
 *   {
 *     trigger: { type: "contact_created" }
 *            | { type: "event", event: "email.clicked" | "form.submitted" | "custom:<name>", campaignId?, sourceId? }
 *            | { type: "audience", audienceId, every: "hour" | "day" | "week" }
 *            | { type: "manual" },
 *     entry: "<node id>",
 *     nodes: { "<id>": <node>, … },
 *     reentry: "never" | "after_finish",
 *     goal:  <segment rule tree> | null,   reaching it ends the trip as converted
 *     exit:  <segment rule tree> | null,   matching it removes the contact
 *   }
 *
 * Nodes (each points to the next by id; `null` ends the journey):
 *   send_email            { campaignId, next }          a journey email (mode "triggered")
 *   wait                  { amount, unit, next }        minutes | hours | days
 *   wait_for_event        { event, campaignId?, days, next, timeout }
 *   condition             { rules, yes, no }            a segment rule tree on the contact
 *   split                 { percent, a, b }             random A/B, stable per enrollment
 *   add_to_audience       { audienceId, next }          static audiences only
 *   remove_from_audience  { audienceId, next }
 *   create_task           { title, taskType, assigneeId, dueInDays, next }   a CRM task
 *   notify                { audience: { type, value }, title, body, next }  in-app
 *   post_chat             { routeId, text, next }       a Slack/Teams channel route
 *   webhook               { url, next }                 https POST, public addresses only
 *
 * The graph must be acyclic: a contact can't loop forever, and every trip ends.
 * `validate` is pure; `checkReferences` confirms ids exist in the tenant.
 */
import prisma from "../../../config/database.js";
import { compile, isEventType } from "../segments.js";
import { checkWebhookUrl } from "../../../lib/safeHttp.js";

const err = (message, status = 400) => Object.assign(new Error(message), { status });
export const MAX_NODES = 60;
export const TRIGGERS = ["contact_created", "event", "audience", "manual"];
export const EVERY = { hour: 3_600_000, day: 86_400_000, week: 7 * 86_400_000 };
export const UNITS = { minutes: 60_000, hours: 3_600_000, days: 86_400_000 };
export const TASK_TYPES = ["call", "email", "meeting", "follow_up", "review"];
export const NOTIFY_AUDIENCES = ["role", "department", "user", "admins"];

export const NODE_TYPES = {
  send_email: { label: "Send email", exits: ["next"] },
  wait: { label: "Wait", exits: ["next"] },
  wait_for_event: { label: "Wait for an event", exits: ["next", "timeout"] },
  condition: { label: "If / else", exits: ["yes", "no"] },
  split: { label: "A/B split", exits: ["a", "b"] },
  add_to_audience: { label: "Add to audience", exits: ["next"] },
  remove_from_audience: { label: "Remove from audience", exits: ["next"] },
  create_task: { label: "Create CRM task", exits: ["next"] },
  notify: { label: "Notify the team", exits: ["next"] },
  post_chat: { label: "Post to a channel", exits: ["next"] },
  webhook: { label: "Call a webhook", exits: ["next"] },
};

export const emptyDefinition = (kind = "journey") => ({
  trigger: kind === "automation" ? { type: "audience", audienceId: null, every: "day" } : { type: "manual" },
  entry: null, nodes: {}, reentry: "never", goal: null, exit: null,
});

const str = (v, max, what) => {
  const s = String(v ?? "").trim();
  if (!s) throw err(`${what} is required`);
  return s.slice(0, max);
};
const int = (v, min, max, what) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) throw err(`${what} must be a whole number from ${min} to ${max}`);
  return n;
};
const ref = (v) => (v === null || v === undefined || v === "" ? null : String(v));

function normalizeNode(id, n) {
  const where = `Step "${n?.label || id}"`;
  if (!n || !NODE_TYPES[n.type]) throw err(`${where}: unknown step type "${n?.type}"`);
  const base = { type: n.type, ...(n.label ? { label: String(n.label).slice(0, 80) } : {}) };
  switch (n.type) {
    case "send_email": return { ...base, campaignId: str(n.campaignId, 64, `${where}: the email`), next: ref(n.next) };
    case "wait": {
      if (!UNITS[n.unit]) throw err(`${where}: unit must be minutes, hours or days`);
      const max = { minutes: 1440, hours: 720, days: 365 }[n.unit];
      return { ...base, amount: int(n.amount, 1, max, `${where}: the wait`), unit: n.unit, next: ref(n.next) };
    }
    case "wait_for_event": {
      if (!isEventType(n.event)) throw err(`${where}: unknown event "${n.event}"`);
      return { ...base, event: n.event, ...(n.campaignId ? { campaignId: String(n.campaignId) } : {}), days: int(n.days, 1, 90, `${where}: the time limit`), next: ref(n.next), timeout: ref(n.timeout) };
    }
    case "condition":
      if (!n.rules || !n.rules.op) throw err(`${where}: add at least one rule`);
      return { ...base, rules: n.rules, yes: ref(n.yes), no: ref(n.no) };
    case "split":
      return { ...base, percent: int(n.percent, 1, 99, `${where}: the A share`), a: ref(n.a), b: ref(n.b) };
    case "add_to_audience":
    case "remove_from_audience":
      return { ...base, audienceId: str(n.audienceId, 64, `${where}: the audience`), next: ref(n.next) };
    case "create_task":
      if (!TASK_TYPES.includes(n.taskType ?? "follow_up")) throw err(`${where}: unknown task type`);
      return { ...base, title: str(n.title, 200, `${where}: the task title`), taskType: n.taskType ?? "follow_up", assigneeId: str(n.assigneeId, 64, `${where}: who it's assigned to`), dueInDays: int(n.dueInDays ?? 1, 0, 90, `${where}: due in`), next: ref(n.next) };
    case "notify": {
      const a = n.audience ?? {};
      if (!NOTIFY_AUDIENCES.includes(a.type)) throw err(`${where}: choose who to notify`);
      if (a.type !== "admins" && !String(a.value ?? "").trim()) throw err(`${where}: choose who to notify`);
      return { ...base, audience: { type: a.type, value: a.type === "admins" ? null : String(a.value).trim() }, title: str(n.title, 120, `${where}: the title`), body: String(n.body ?? "").slice(0, 500), next: ref(n.next) };
    }
    case "post_chat":
      return { ...base, routeId: str(n.routeId, 64, `${where}: the channel`), text: str(n.text, 1000, `${where}: the message`), next: ref(n.next) };
    case "webhook":
      checkWebhookUrl(n.url);
      return { ...base, url: String(n.url).trim(), next: ref(n.next) };
    default: throw err(`${where}: unknown step type`);
  }
}

/**
 * Validate and normalize a definition. `strict` (publishing) also requires a
 * complete, runnable graph; drafts may be half-built.
 */
export function validate(def, { strict = false } = {}) {
  if (!def || typeof def !== "object") throw err("A journey definition is required");
  const t = def.trigger ?? {};
  if (!TRIGGERS.includes(t.type)) throw err(`Unknown trigger "${t.type}"`);
  let trigger = { type: t.type };
  if (t.type === "event") {
    if (!isEventType(t.event)) throw err(`Unknown trigger event "${t.event}"`);
    trigger = { ...trigger, event: t.event, ...(t.campaignId ? { campaignId: String(t.campaignId) } : {}), ...(t.sourceId ? { sourceId: String(t.sourceId) } : {}) };
  }
  if (t.type === "audience") {
    if (!EVERY[t.every]) throw err("Run an audience trigger every hour, day or week");
    if (strict && !t.audienceId) throw err("Choose the audience this automation enrolls");
    trigger = { ...trigger, audienceId: ref(t.audienceId), every: t.every };
  }

  const rawNodes = def.nodes && typeof def.nodes === "object" ? def.nodes : {};
  const ids = Object.keys(rawNodes);
  if (ids.length > MAX_NODES) throw err(`A journey can have at most ${MAX_NODES} steps`);
  const nodes = {};
  for (const id of ids) {
    if (!/^[A-Za-z0-9_-]{1,40}$/.test(id)) throw err(`Step ids may use letters, digits, - and _ (got "${id.slice(0, 40)}")`);
    nodes[id] = normalizeNode(id, rawNodes[id]);
  }
  for (const [id, n] of Object.entries(nodes)) {
    for (const k of NODE_TYPES[n.type].exits) {
      if (n[k] !== null && !nodes[n[k]]) throw err(`Step "${n.label || id}" points to a step that doesn't exist`);
      if (n[k] === id) throw err(`Step "${n.label || id}" points to itself`);
    }
  }
  const entry = ref(def.entry);
  if (entry && !nodes[entry]) throw err("The first step doesn't exist");
  if (strict && !entry) throw err("Add a first step");

  // Acyclic: depth-first search with colors.
  const color = {};
  const visit = (id) => {
    if (color[id] === 1) throw err("Steps can't loop back to an earlier step — every journey has to end");
    if (color[id] === 2) return;
    color[id] = 1;
    for (const k of NODE_TYPES[nodes[id].type].exits) if (nodes[id][k]) visit(nodes[id][k]);
    color[id] = 2;
  };
  for (const id of ids) visit(id);
  if (strict) {
    const live = reachable(nodes, entry);
    const unreachable = ids.filter((id) => !live.has(id));
    if (unreachable.length) throw err(`${unreachable.length} step(s) can't be reached from the first step — connect or delete them`);
  }

  const reentry = def.reentry === "after_finish" ? "after_finish" : "never";
  const goal = def.goal && def.goal.op ? def.goal : null;
  const exit = def.exit && def.exit.op ? def.exit : null;
  return { trigger, entry, nodes, reentry, goal, exit };
}

export function reachable(nodes, entry) {
  const seen = new Set();
  const stack = entry ? [entry] : [];
  while (stack.length) {
    const id = stack.pop();
    if (seen.has(id) || !nodes[id]) continue;
    seen.add(id);
    for (const k of NODE_TYPES[nodes[id].type].exits) if (nodes[id][k]) stack.push(nodes[id][k]);
  }
  return seen;
}

/** Confirm every id a definition mentions exists in this tenant and is usable. */
export async function checkReferences(tenantId, def) {
  const problems = [];
  const rules = [def.goal, def.exit, ...Object.values(def.nodes).filter((n) => n.type === "condition").map((n) => n.rules)].filter(Boolean);
  for (const r of rules) {
    try { await compile(r, tenantId); } catch (e) { problems.push(e.message); }
  }
  if (def.trigger.type === "audience" && def.trigger.audienceId) {
    const a = await prisma.marketingAudience.findFirst({ where: { id: def.trigger.audienceId, tenantId } });
    if (!a) problems.push("The trigger's audience no longer exists.");
  }
  for (const n of Object.values(def.nodes)) {
    const name = `Step "${n.label || NODE_TYPES[n.type].label}"`;
    if (n.type === "send_email") {
      const c = await prisma.marketingCampaign.findFirst({ where: { id: n.campaignId, tenantId } });
      if (!c) problems.push(`${name}: that email no longer exists.`);
      else if (c.mode !== "triggered") problems.push(`${name}: "${c.name}" is a one-off campaign. Journeys send journey emails.`);
      else if (c.status !== "active" && c.status !== "paused") problems.push(`${name}: activate the journey email "${c.name}" in Email Studio first.`);
    }
    if (n.type === "add_to_audience" || n.type === "remove_from_audience") {
      const a = await prisma.marketingAudience.findFirst({ where: { id: n.audienceId, tenantId } });
      if (!a) problems.push(`${name}: that audience no longer exists.`);
      else if (a.kind !== "static") problems.push(`${name}: "${a.name}" is rule-based; only static audiences have members to add or remove.`);
    }
    if (n.type === "create_task") {
      const u = await prisma.user.findFirst({ where: { id: n.assigneeId, tenantId, isActive: true } });
      if (!u) problems.push(`${name}: the assignee isn't an active member of this workspace.`);
    }
    if (n.type === "post_chat") {
      const r = await prisma.chatRoute.findFirst({ where: { id: n.routeId, tenantId } });
      if (!r) problems.push(`${name}: that channel route no longer exists.`);
    }
  }
  return problems;
}
