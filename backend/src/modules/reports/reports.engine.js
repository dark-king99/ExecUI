/**
 * Report query engine.
 *
 * Turns a validated report definition into a Prisma query. Every field name is
 * resolved through the dataset registry before it reaches Prisma, and all values
 * are passed as parameters — there is no string-built SQL anywhere, so a report
 * definition cannot be an injection vector. Tenant scoping is automatic (the
 * Prisma tenant guard), so a report only ever sees the caller's own org.
 *
 * A definition looks like:
 * {
 *   fields:  ["name", "stage", "value"],
 *   filters: [{ field: "status", op: "eq", value: "active" }],
 *   dateRange: { field: "createdAt", preset: "last_30_days" }   // or from/to
 *   groupBy: "stage",                                            // optional
 *   aggregations: [{ field: "value", fn: "sum" }],               // with groupBy
 *   sort: { field: "value", dir: "desc" },
 *   limit: 500,
 * }
 */
import prisma from "../../config/database.js";
import { getDataset, OPERATORS, AGGREGATIONS } from "./reports.datasets.js";

export const MAX_ROWS = 10_000;
export const DEFAULT_LIMIT = 500;

const bad = (message) => {
  const e = new Error(message);
  e.status = 400;
  return e;
};

// ── Relative date ranges ─────────────────────────────────────────────────────
export const DATE_PRESETS = [
  "today", "yesterday", "last_7_days", "last_30_days", "last_90_days",
  "this_month", "last_month", "this_quarter", "this_year", "all_time", "custom",
];

const startOfDay = (d) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

/** Resolve a preset to { gte, lt } (UTC), or null for all_time. */
export function resolveDateRange(preset, from, to, now = new Date()) {
  const today = startOfDay(now);
  const day = 86400000;
  const mk = (gte, lt) => ({ gte, lt });

  switch (preset) {
    case "today":        return mk(today, new Date(today.getTime() + day));
    case "yesterday":    return mk(new Date(today.getTime() - day), today);
    case "last_7_days":  return mk(new Date(today.getTime() - 6 * day), new Date(today.getTime() + day));
    case "last_30_days": return mk(new Date(today.getTime() - 29 * day), new Date(today.getTime() + day));
    case "last_90_days": return mk(new Date(today.getTime() - 89 * day), new Date(today.getTime() + day));
    case "this_month":   return mk(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)),
                                   new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1)));
    case "last_month":   return mk(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1)),
                                   new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)));
    case "this_quarter": {
      const q = Math.floor(today.getUTCMonth() / 3) * 3;
      return mk(new Date(Date.UTC(today.getUTCFullYear(), q, 1)), new Date(Date.UTC(today.getUTCFullYear(), q + 3, 1)));
    }
    case "this_year":    return mk(new Date(Date.UTC(today.getUTCFullYear(), 0, 1)),
                                   new Date(Date.UTC(today.getUTCFullYear() + 1, 0, 1)));
    case "custom": {
      const range = {};
      if (from) range.gte = new Date(from);
      if (to) range.lt = new Date(new Date(to).getTime() + day); // inclusive end day
      return Object.keys(range).length ? range : null;
    }
    case "all_time":
    default:             return null;
  }
}

// ── Validation ───────────────────────────────────────────────────────────────
const coerce = (type, v) => {
  if (type === "number") {
    const n = Number(v);
    if (Number.isNaN(n)) throw bad(`"${v}" is not a number`);
    return n;
  }
  if (type === "boolean") return v === true || v === "true";
  if (type === "date") {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) throw bad(`"${v}" is not a date`);
    return d;
  }
  return String(v);
};

/** Validate + normalize a definition against its dataset. Throws 400 on abuse. */
export function validateDefinition(dataset, raw = {}) {
  if (!dataset) throw bad("Unknown dataset");
  const known = dataset.fields;
  const pick = (k) => {
    const meta = known[k];
    if (!meta) throw bad(`Unknown field "${k}" for dataset "${dataset.id}"`);
    return meta;
  };

  // Fields
  let fields = Array.isArray(raw.fields) && raw.fields.length ? raw.fields : dataset.defaultFields;
  fields = [...new Set(fields)];
  fields.forEach(pick);

  // Filters
  const filters = (Array.isArray(raw.filters) ? raw.filters : []).map((flt) => {
    const meta = pick(flt.field);
    const allowed = OPERATORS[meta.type] || [];
    if (!allowed.includes(flt.op)) throw bad(`Operator "${flt.op}" is not allowed on ${meta.label}`);
    const needsValue = !["is_empty", "not_empty"].includes(flt.op);
    let value = flt.value;
    if (needsValue) {
      if (value === undefined || value === null || value === "") throw bad(`Filter on ${meta.label} needs a value`);
      if (flt.op === "in") {
        const list = Array.isArray(value) ? value : String(value).split(",").map((s) => s.trim()).filter(Boolean);
        if (!list.length) throw bad(`Filter on ${meta.label} needs at least one value`);
        value = list.map((v) => coerce(meta.type === "datestr" ? "string" : meta.type, v));
      } else if (flt.op === "between") {
        const pair = Array.isArray(value) ? value : String(value).split(",");
        if (pair.length !== 2) throw bad(`"Between" on ${meta.label} needs two values`);
        value = pair.map((v) => coerce(meta.type === "datestr" ? "string" : meta.type, v));
      } else {
        value = coerce(meta.type === "datestr" ? "string" : meta.type, value);
      }
    }
    return { field: flt.field, op: flt.op, value };
  });

  // Date range
  let dateRange = null;
  if (raw.dateRange?.preset && raw.dateRange.preset !== "all_time") {
    const field = raw.dateRange.field || dataset.dateField;
    const meta = pick(field);
    if (meta.type !== "date" && meta.type !== "datestr") throw bad(`${meta.label} is not a date field`);
    if (!DATE_PRESETS.includes(raw.dateRange.preset)) throw bad("Unknown date range");
    dateRange = { field, preset: raw.dateRange.preset, from: raw.dateRange.from || null, to: raw.dateRange.to || null };
  }

  // Grouping + aggregation
  let groupBy = null;
  let aggregations = [];
  if (raw.groupBy) {
    const meta = pick(raw.groupBy);
    if (!meta.groupable) throw bad(`${meta.label} can't be grouped by`);
    if (meta.relation) throw bad(`${meta.label} can't be grouped by`);
    groupBy = raw.groupBy;
    aggregations = (Array.isArray(raw.aggregations) ? raw.aggregations : []).map((a) => {
      if (!AGGREGATIONS.includes(a.fn)) throw bad(`Unknown aggregation "${a.fn}"`);
      if (a.fn === "count") return { fn: "count", field: null };
      const m = pick(a.field);
      if (!m.aggregatable) throw bad(`${m.label} can't be aggregated`);
      return { fn: a.fn, field: a.field };
    });
    if (!aggregations.length) aggregations = [{ fn: "count", field: null }];
  }

  // Sort
  let sort = null;
  if (raw.sort?.field) {
    if (groupBy) {
      // In grouped mode only the group key or an aggregate alias is sortable.
      const isAgg = aggregations.some((a) => aggAlias(a) === raw.sort.field);
      if (raw.sort.field !== groupBy && !isAgg) throw bad("Sort field must be the grouped field or an aggregate");
      sort = { field: raw.sort.field, dir: raw.sort.dir === "asc" ? "asc" : "desc" };
    } else {
      const meta = pick(raw.sort.field);
      if (meta.relation) throw bad(`${meta.label} can't be sorted on`);
      sort = { field: raw.sort.field, dir: raw.sort.dir === "asc" ? "asc" : "desc" };
    }
  } else if (!groupBy && dataset.defaultSort) {
    sort = dataset.defaultSort;
  }

  const limit = Math.min(MAX_ROWS, Math.max(1, Number(raw.limit) || DEFAULT_LIMIT));
  return { fields, filters, dateRange, groupBy, aggregations, sort, limit };
}

export const aggAlias = (a) => (a.fn === "count" ? "count" : `${a.fn}_${a.field}`);

// ── Where builder ────────────────────────────────────────────────────────────
function filterClause(meta, op, value) {
  switch (op) {
    case "eq":          return value;
    case "ne":          return { not: value };
    case "contains":    return { contains: value, mode: "insensitive" };
    case "starts_with": return { startsWith: value, mode: "insensitive" };
    case "in":          return { in: value };
    case "is_empty":    return null;
    case "not_empty":   return { not: null };
    case "gt":          return { gt: value };
    case "gte":         return { gte: value };
    case "lt":          return { lt: value };
    case "lte":         return { lte: value };
    case "between":     return { gte: value[0], lte: value[1] };
    case "on": {
      const d = new Date(value);
      const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
      return { gte: start, lt: new Date(start.getTime() + 86400000) };
    }
    case "before":      return { lt: value };
    case "after":       return { gt: value };
    default:            throw bad(`Unsupported operator "${op}"`);
  }
}

export function buildWhere(dataset, def, now = new Date()) {
  const where = {};
  for (const flt of def.filters || []) {
    const meta = dataset.fields[flt.field];
    if (meta.relation) continue; // relation fields aren't filterable
    where[flt.field] = filterClause(meta, flt.op, flt.value);
  }
  if (def.dateRange) {
    const r = resolveDateRange(def.dateRange.preset, def.dateRange.from, def.dateRange.to, now);
    if (r) {
      const meta = dataset.fields[def.dateRange.field];
      where[def.dateRange.field] = meta.type === "datestr"
        ? { gte: r.gte?.toISOString().slice(0, 10), lt: r.lt?.toISOString().slice(0, 10) }
        : r;
    }
  }
  return where;
}

// ── Execution ────────────────────────────────────────────────────────────────
const flattenRelation = (row, key, meta) => {
  const rel = row[meta.relation.path];
  if (!rel) return null;
  const vals = Object.keys(meta.relation.select).map((k) => rel[k]).filter(Boolean);
  return vals.join(" ") || null;
};

/**
 * Run a validated definition. Returns { columns, rows, totalRows, truncated }.
 * `columns` carry labels so exporters and the UI render identically.
 */
export async function runReport(dataset, def, { now = new Date() } = {}) {
  const started = Date.now();
  const delegate = prisma[dataset.model];
  if (!delegate) throw bad(`Dataset "${dataset.id}" is not queryable`);
  const where = buildWhere(dataset, def, now);

  // ── Grouped / aggregated ──
  if (def.groupBy) {
    const _count = true;
    const sums = {}, avgs = {}, mins = {}, maxs = {};
    for (const a of def.aggregations) {
      if (a.fn === "sum") sums[a.field] = true;
      if (a.fn === "avg") avgs[a.field] = true;
      if (a.fn === "min") mins[a.field] = true;
      if (a.fn === "max") maxs[a.field] = true;
    }
    const args = { by: [def.groupBy], where, _count };
    if (Object.keys(sums).length) args._sum = sums;
    if (Object.keys(avgs).length) args._avg = avgs;
    if (Object.keys(mins).length) args._min = mins;
    if (Object.keys(maxs).length) args._max = maxs;

    const grouped = await delegate.groupBy(args);
    const pickAgg = (g, a) => {
      if (a.fn === "count") return typeof g._count === "number" ? g._count : g._count?._all ?? 0;
      const bucket = { sum: "_sum", avg: "_avg", min: "_min", max: "_max" }[a.fn];
      const v = g[bucket]?.[a.field];
      return v == null ? 0 : typeof v === "number" ? Number(v.toFixed(2)) : v;
    };

    let rows = grouped.map((g) => {
      const row = { [def.groupBy]: g[def.groupBy] ?? "—" };
      for (const a of def.aggregations) row[aggAlias(a)] = pickAgg(g, a);
      return row;
    });

    if (def.sort) {
      const k = def.sort.field, dir = def.sort.dir === "asc" ? 1 : -1;
      rows.sort((x, y) => (x[k] > y[k] ? dir : x[k] < y[k] ? -dir : 0));
    }
    const totalRows = rows.length;
    rows = rows.slice(0, def.limit);

    const columns = [
      { key: def.groupBy, label: dataset.fields[def.groupBy].label, type: dataset.fields[def.groupBy].type },
      ...def.aggregations.map((a) => ({
        key: aggAlias(a),
        label: a.fn === "count" ? "Count" : `${a.fn.toUpperCase()} of ${dataset.fields[a.field].label}`,
        type: "number",
        money: a.fn !== "count" && !!dataset.fields[a.field]?.money,
      })),
    ];
    return { columns, rows, totalRows, truncated: totalRows > rows.length, durationMs: Date.now() - started, grouped: true };
  }

  // ── Flat rows ──
  const select = {};
  const include = {};
  for (const key of def.fields) {
    const meta = dataset.fields[key];
    if (meta.relation) include[meta.relation.path] = { select: meta.relation.select };
    else select[key] = true;
  }
  const args = { where, take: def.limit };
  if (Object.keys(include).length) {
    // Prisma forbids select+include together: select scalars via `select` inside include-mode.
    args.select = { ...select, ...include };
  } else {
    args.select = select;
  }
  if (def.sort) args.orderBy = { [def.sort.field]: def.sort.dir };

  const [raw, totalRows] = await Promise.all([delegate.findMany(args), delegate.count({ where })]);

  const rows = raw.map((r) => {
    const out = {};
    for (const key of def.fields) {
      const meta = dataset.fields[key];
      out[key] = meta.relation ? flattenRelation(r, key, meta) : r[key];
    }
    return out;
  });

  const columns = def.fields.map((key) => ({
    key,
    label: dataset.fields[key].label,
    type: dataset.fields[key].type,
    money: !!dataset.fields[key].money,
  }));

  return { columns, rows, totalRows, truncated: totalRows > rows.length, durationMs: Date.now() - started, grouped: false };
}
