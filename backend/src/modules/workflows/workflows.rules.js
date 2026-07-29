/**
 * Workflow rules — condition matching and text templating.
 *
 * Everything here is pure and dependency-free so the decision logic of an
 * automation can be unit-tested exhaustively, and so a rule is *data* rather
 * than code: conditions are a validated list of {field, op, value} evaluated by
 * this file. Nothing a user writes is ever executed, interpolated into SQL, or
 * passed to a template engine that could reach outside the record.
 */
import { getResource } from "../api/api.resources.js";

export const CONDITION_OPS = {
  eq: "is",
  ne: "is not",
  gt: "greater than",
  gte: "greater than or equal to",
  lt: "less than",
  lte: "less than or equal to",
  contains: "contains",
  not_contains: "does not contain",
  starts_with: "starts with",
  in: "is any of",
  not_in: "is none of",
  is_empty: "is empty",
  not_empty: "is not empty",
  is_true: "is true",
  is_false: "is false",
};

/** Operators that don't take a value. */
export const VALUELESS_OPS = ["is_empty", "not_empty", "is_true", "is_false"];

const err = (message, status = 400) => { const e = new Error(message); e.status = status; return e; };

const num = (v) => (v === null || v === undefined || v === "" ? NaN : Number(v));
const str = (v) => (v === null || v === undefined ? "" : String(v));
const lower = (v) => str(v).toLowerCase();
const listOf = (v) => (Array.isArray(v) ? v : str(v).split(",").map((s) => s.trim()).filter(Boolean));

/** Evaluate one condition against a record. Unknown operators are false. */
export function evaluateCondition(record, { field, op, value }) {
  const actual = record?.[field];

  switch (op) {
    case "eq":  return lower(actual) === lower(value);
    case "ne":  return lower(actual) !== lower(value);
    case "gt":  return num(actual) > num(value);
    case "gte": return num(actual) >= num(value);
    case "lt":  return num(actual) < num(value);
    case "lte": return num(actual) <= num(value);
    case "contains":     return lower(actual).includes(lower(value));
    case "not_contains": return !lower(actual).includes(lower(value));
    case "starts_with":  return lower(actual).startsWith(lower(value));
    case "in":     return listOf(value).some((v) => lower(v) === lower(actual));
    case "not_in": return !listOf(value).some((v) => lower(v) === lower(actual));
    case "is_empty":  return actual === null || actual === undefined || actual === "";
    case "not_empty": return !(actual === null || actual === undefined || actual === "");
    case "is_true":  return actual === true;
    case "is_false": return actual === false;
    default: return false;
  }
}

/**
 * Does this record satisfy the rule?
 * `match: "all"` requires every condition; `"any"` requires one.
 * An empty condition list matches everything (fire on any event of that type).
 */
export function matchesConditions(record, conditions = [], match = "all") {
  const list = Array.isArray(conditions) ? conditions : [];
  if (!list.length) return true;
  return match === "any"
    ? list.some((c) => evaluateCondition(record, c))
    : list.every((c) => evaluateCondition(record, c));
}

/** Validate conditions against the triggering resource's field whitelist. */
export function validateConditions(resourceId, conditions = [], match = "all") {
  if (!["all", "any"].includes(match)) throw err('"match" must be "all" or "any"');
  const resource = getResource(resourceId);
  if (!resource) throw err(`Unknown resource "${resourceId}"`);
  const list = Array.isArray(conditions) ? conditions : [];
  if (list.length > 20) throw err("A workflow can have at most 20 conditions");

  return list.map((c) => {
    if (!resource.fields[c.field]) {
      throw err(`Unknown field "${c.field}" for ${resource.name}`);
    }
    if (!CONDITION_OPS[c.op]) throw err(`Unknown condition operator "${c.op}"`);
    const needsValue = !VALUELESS_OPS.includes(c.op);
    if (needsValue && (c.value === undefined || c.value === null || c.value === "")) {
      throw err(`Condition on "${c.field}" needs a value`);
    }
    return { field: c.field, op: c.op, value: needsValue ? c.value : null };
  });
}

// ── Templating ───────────────────────────────────────────────────────────────
const MAX_TEMPLATE = 5000;

/**
 * Replace {{record.field}} / {{event}} / {{now}} placeholders.
 *
 * Deliberately not a template engine: only these explicit paths resolve, so a
 * message can never reach into internals or execute anything. Unknown
 * placeholders render as an empty string rather than leaking the raw token.
 */
export function renderTemplate(template, { record = {}, event = "", extra = {} } = {}) {
  const text = str(template).slice(0, MAX_TEMPLATE);
  return text.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, path) => {
    if (path === "event") return str(event);
    if (path === "now") return new Date().toISOString();
    if (path.startsWith("record.")) {
      const key = path.slice(7);
      // Own properties only: a plain lookup would resolve __proto__ and
      // constructor up the prototype chain and render internals into a message.
      if (!record || !Object.prototype.hasOwnProperty.call(record, key)) return "";
      const v = record[key];
      if (v === null || v === undefined) return "";
      if (v instanceof Date) return v.toISOString();
      if (typeof v === "object" || typeof v === "function") return "";
      return str(v);
    }
    if (Object.prototype.hasOwnProperty.call(extra, path)) return str(extra[path]);
    return "";
  });
}

/** Human summary of a rule, for the UI and run log. */
export function describeRule(resourceId, conditions = [], match = "all") {
  const resource = getResource(resourceId);
  if (!conditions.length) return "every event";
  const parts = conditions.map((c) => {
    const label = resource?.fields[c.field]?.label || c.field;
    const op = CONDITION_OPS[c.op] || c.op;
    return VALUELESS_OPS.includes(c.op) ? `${label} ${op}` : `${label} ${op} "${c.value}"`;
  });
  return parts.join(match === "any" ? " OR " : " AND ");
}
