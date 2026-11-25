/**
 * The segmentation engine: audience rules → real CRM contacts.
 *
 * A dynamic audience is a rule tree evaluated against the database each time
 * it's used, so membership is always current. A static audience is an explicit
 * member list. Both resolve to CRM contacts — marketing keeps no copy of them.
 *
 * Rule tree:
 *   { op: "and" | "or", rules: [ <rule | group>, … ] }      (nesting ≤ 4 deep)
 * Rules (what CRM and the marketing event stream actually hold today):
 *   { field: "email",   cmp: "contains" | "not_contains" | "equals" | "ends_with", value }
 *   { field: "name",    cmp: "contains" | "not_contains" | "equals", value }
 *   { field: "created", cmp: "within_days" | "before" | "after", value }
 *   { field: "consent", cmp: "is" | "is_not", value: "subscribed" | "unsubscribed" | "bounced" | "complained" | "none" }
 *   { field: "event",   cmp: "within_days" | "never", type: "email.opened" | "form.submitted" | "custom:<name>" | …, value?: days, campaignId? }
 *   { field: "audience", cmp: "member" | "not_member", value: <audience id> }
 */
import prisma from "../../config/database.js";

const err = (message, status = 400) => Object.assign(new Error(message), { status });
const MAX_DEPTH = 4;
const MAX_RULES = 50;
const DAY = 86_400_000;
export const EVENT_TYPES = ["email.sent", "email.delivered", "email.opened", "email.clicked", "email.bounced", "email.complained", "email.unsubscribed", "consent.changed", "form.submitted"];
// Events sent through a Data Streams API key are namespaced "custom:<name>".
export const CUSTOM_EVENT_RE = /^custom:[a-z0-9][a-z0-9_.-]{0,63}$/;
export const isEventType = (t) => EVENT_TYPES.includes(t) || CUSTOM_EVENT_RE.test(String(t ?? ""));

const text = (v) => {
  const s = String(v ?? "").trim();
  if (!s || s.length > 200) throw err("Rule values must be 1–200 characters");
  return s;
};
const days = (v) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1 || n > 3650) throw err("Days must be a whole number from 1 to 3650");
  return n;
};
const date = (v) => {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) throw err("That isn't a date");
  return d;
};

/**
 * Validate a rule tree and compile it to a Prisma `where` on Contact.
 * `resolveAudience` compiles a referenced audience (with a cycle guard).
 */
export async function compile(tree, tenantId, { depth = 0, seen = new Set(), count = { n: 0 } } = {}) {
  if (depth > MAX_DEPTH) throw err(`Rules can be nested at most ${MAX_DEPTH} deep`);
  if (!tree || !["and", "or"].includes(tree.op) || !Array.isArray(tree.rules)) throw err('A rule group needs op "and" or "or" and a list of rules');
  const parts = [];
  for (const r of tree.rules) {
    count.n += 1;
    if (count.n > MAX_RULES) throw err(`An audience can have at most ${MAX_RULES} rules`);
    if (r && r.op) { parts.push(await compile(r, tenantId, { depth: depth + 1, seen, count })); continue; }
    parts.push(await compileRule(r, tenantId, { depth, seen, count }));
  }
  if (!parts.length) return {};
  return tree.op === "and" ? { AND: parts } : { OR: parts };
}

async function compileRule(r, tenantId, ctx) {
  const ci = (v) => ({ mode: "insensitive", ...v });
  switch (r?.field) {
    case "email":
    case "name": {
      const v = text(r.value);
      const f = r.field;
      if (r.cmp === "contains") return { [f]: ci({ contains: v }) };
      if (r.cmp === "not_contains") return { NOT: { [f]: ci({ contains: v }) } };
      if (r.cmp === "equals") return { [f]: ci({ equals: v }) };
      if (r.cmp === "ends_with" && f === "email") return { email: ci({ endsWith: v.startsWith("@") ? v : `@${v}` }) };
      break;
    }
    case "created": {
      if (r.cmp === "within_days") return { createdAt: { gte: new Date(Date.now() - days(r.value) * DAY) } };
      if (r.cmp === "before") return { createdAt: { lt: date(r.value) } };
      if (r.cmp === "after") return { createdAt: { gt: date(r.value) } };
      break;
    }
    case "consent": {
      const v = String(r.value);
      if (v === "none") {
        const none = { marketingConsents: { none: { channel: "email" } } };
        return r.cmp === "is_not" ? { NOT: none } : none;
      }
      if (!["subscribed", "unsubscribed", "bounced", "complained"].includes(v)) throw err("Unknown consent status");
      const has = { marketingConsents: { some: { channel: "email", status: v } } };
      return r.cmp === "is_not" ? { NOT: has } : has;
    }
    case "event": {
      if (!isEventType(r.type)) throw err(`Unknown event type "${r.type}"`);
      const where = { type: r.type, ...(r.campaignId ? { campaignId: String(r.campaignId) } : {}) };
      if (r.cmp === "within_days") return { marketingEvents: { some: { ...where, occurredAt: { gte: new Date(Date.now() - days(r.value) * DAY) } } } };
      if (r.cmp === "never") return { marketingEvents: { none: where } };
      break;
    }
    case "audience": {
      const id = String(r.value ?? "");
      if (ctx.seen.has(id)) throw err("An audience can't include itself");
      const a = await prisma.marketingAudience.findFirst({ where: { id, tenantId } });
      if (!a) throw err("Referenced audience not found", 404);
      const inner = await audienceWhere(a, tenantId, { ...ctx, depth: ctx.depth + 1, seen: new Set([...ctx.seen, id]) });
      return r.cmp === "not_member" ? { NOT: inner } : inner;
    }
    default:
      break;
  }
  throw err(`Unsupported rule: ${JSON.stringify(r).slice(0, 120)}`);
}

/** The Contact `where` for an audience (static members or dynamic rules). */
export async function audienceWhere(audience, tenantId, ctx = {}) {
  if (audience.kind === "static") return { audienceMembers: { some: { audienceId: audience.id } } };
  if (!audience.definition) return { id: { in: [] } }; // a dynamic audience with no rules has no members, never "everyone"
  return compile(audience.definition, tenantId, { seen: new Set([audience.id, ...(ctx.seen ?? [])]), depth: ctx.depth ?? 0, count: ctx.count ?? { n: 0 } });
}

/** Contacts in the audience who may receive marketing email right now. */
export async function sendableWhere(audience, tenantId, suppressed) {
  const base = await audienceWhere(audience, tenantId);
  return {
    AND: [
      { tenantId },
      base,
      { marketingConsents: { some: { channel: "email", status: "subscribed" } } },
      ...(suppressed.size ? [{ NOT: { email: { in: [...suppressed], mode: "insensitive" } } }] : []),
    ],
  };
}

/** Member count, sendable count, and a sample — for previews. */
export async function previewAudience(tenantId, audience, suppressed) {
  const where = { AND: [{ tenantId }, await audienceWhere(audience, tenantId)] };
  const [members, sendable, sample] = await Promise.all([
    prisma.contact.count({ where }),
    prisma.contact.count({ where: await sendableWhere(audience, tenantId, suppressed) }),
    prisma.contact.findMany({ where, take: 10, orderBy: { createdAt: "desc" }, select: { id: true, name: true, email: true } }),
  ]);
  return { members, sendable, sample };
}
