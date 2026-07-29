/**
 * Generic CRUD for every /api/v1 resource.
 *
 * One implementation serves all resources because the registry describes them
 * uniformly. That means consistent pagination, filtering, validation and error
 * shapes across the whole API — and a new resource is a registry entry, not a
 * new pile of hand-written handlers that drift apart.
 *
 * Tenant scoping is automatic (Prisma guard), so nothing here filters by tenant
 * by hand and no handler can forget to.
 */
import prisma from "../../config/database.js";
import { getResource, readableFields, writableFields, requiredFields } from "./api.resources.js";

const err = (message, status = 400, code = "invalid_request") => {
  const e = new Error(message);
  e.status = status;
  e.code = code;
  return e;
};

export const MAX_LIMIT = 200;
export const DEFAULT_LIMIT = 50;

// ── Value coercion / validation ──────────────────────────────────────────────
function coerceField(key, meta, value) {
  if (value === null) return null;

  switch (meta.type) {
    case "number": {
      const n = Number(value);
      if (!Number.isFinite(n)) throw err(`"${key}" must be a number`);
      if (meta.min != null && n < meta.min) throw err(`"${key}" must be at least ${meta.min}`);
      if (meta.max != null && n > meta.max) throw err(`"${key}" must be at most ${meta.max}`);
      return n;
    }
    case "boolean":
      if (typeof value === "boolean") return value;
      if (value === "true") return true;
      if (value === "false") return false;
      throw err(`"${key}" must be true or false`);
    case "date": {
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) throw err(`"${key}" must be an ISO-8601 date`);
      return d;
    }
    case "datestr": {
      const s = String(value);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw err(`"${key}" must be a date in YYYY-MM-DD form`);
      return s;
    }
    default: {
      const s = String(value);
      if (meta.max && s.length > meta.max) throw err(`"${key}" must be ${meta.max} characters or fewer`);
      if (meta.enum && !meta.enum.includes(s)) throw err(`"${key}" must be one of: ${meta.enum.join(", ")}`);
      if (meta.format === "email" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s)) throw err(`"${key}" must be a valid email address`);
      return s;
    }
  }
}

/** Validate a write body against the registry. Unknown/readonly keys are rejected. */
export function validateBody(resource, body = {}, { partial = false } = {}) {
  if (resource.readOnly) throw err(`The ${resource.id} resource is read-only`, 405, "read_only");
  if (typeof body !== "object" || Array.isArray(body) || body === null) throw err("Request body must be a JSON object");

  const allowed = new Set(writableFields(resource));
  const unknown = Object.keys(body).filter((k) => !allowed.has(k));
  if (unknown.length) {
    throw err(
      `Unknown or read-only field(s): ${unknown.join(", ")}. Writable fields are: ${[...allowed].join(", ")}.`,
    );
  }

  const data = {};
  for (const [key, value] of Object.entries(body)) {
    if (value === undefined) continue;
    data[key] = coerceField(key, resource.fields[key], value);
  }

  if (!partial) {
    const missing = requiredFields(resource).filter((k) => data[k] === undefined || data[k] === null || data[k] === "");
    if (missing.length) throw err(`Missing required field(s): ${missing.join(", ")}`);
  }
  if (partial && !Object.keys(data).length) throw err("Provide at least one field to update");
  return data;
}

/** Project a database row down to the resource's public fields. */
export function serialize(resource, row) {
  if (!row) return null;
  const out = { object: resource.id };
  for (const key of readableFields(resource)) {
    if (row[key] !== undefined) out[key] = row[key];
  }
  return out;
}

// ── Query building ───────────────────────────────────────────────────────────
function buildListWhere(resource, query = {}) {
  const where = {};
  for (const key of resource.filterable || []) {
    const raw = query[key];
    if (raw === undefined || raw === "") continue;
    const meta = resource.fields[key];
    if (!meta) continue;
    where[key] = String(raw).includes(",")
      ? { in: String(raw).split(",").map((v) => coerceField(key, meta, v.trim())) }
      : coerceField(key, meta, raw);
  }
  const range = {};
  if (query.created_after) {
    const d = new Date(query.created_after);
    if (Number.isNaN(d.getTime())) throw err('"created_after" must be an ISO-8601 date');
    range.gte = d;
  }
  if (query.created_before) {
    const d = new Date(query.created_before);
    if (Number.isNaN(d.getTime())) throw err('"created_before" must be an ISO-8601 date');
    range.lte = d;
  }
  if (Object.keys(range).length) where.createdAt = range;
  return where;
}

function buildOrderBy(resource, query = {}) {
  if (!query.sort) return resource.defaultSort ? { [resource.defaultSort.field]: resource.defaultSort.dir } : undefined;
  const desc = String(query.sort).startsWith("-");
  const field = desc ? String(query.sort).slice(1) : String(query.sort);
  if (!resource.fields[field]) throw err(`Cannot sort by "${field}"`);
  return { [field]: desc ? "desc" : "asc" };
}

// ── Operations ───────────────────────────────────────────────────────────────
export function resolve(resourceId) {
  const resource = getResource(resourceId);
  if (!resource) throw err(`Unknown resource "${resourceId}"`, 404, "not_found");
  return resource;
}

export async function list(resourceId, query = {}) {
  const resource = resolve(resourceId);
  const where = buildListWhere(resource, query);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(query.limit) || DEFAULT_LIMIT));
  const offset = Math.max(0, Number(query.offset) || 0);
  const select = Object.fromEntries(readableFields(resource).map((k) => [k, true]));

  const [rows, total] = await Promise.all([
    prisma[resource.model].findMany({ where, select, take: limit, skip: offset, orderBy: buildOrderBy(resource, query) }),
    prisma[resource.model].count({ where }),
  ]);

  return {
    object: "list",
    data: rows.map((r) => serialize(resource, r)),
    total,
    limit,
    offset,
    has_more: offset + rows.length < total,
  };
}

export async function retrieve(resourceId, id) {
  const resource = resolve(resourceId);
  const select = Object.fromEntries(readableFields(resource).map((k) => [k, true]));
  const row = await prisma[resource.model].findFirst({ where: { id }, select });
  if (!row) throw err(`No ${resource.name} with id "${id}"`, 404, "not_found");
  return serialize(resource, row);
}

export async function create(resourceId, body) {
  const resource = resolve(resourceId);
  const data = validateBody(resource, body);
  const select = Object.fromEntries(readableFields(resource).map((k) => [k, true]));
  try {
    const row = await prisma[resource.model].create({ data, select });
    return serialize(resource, row);
  } catch (e) {
    throw translatePrismaError(e, resource);
  }
}

export async function update(resourceId, id, body) {
  const resource = resolve(resourceId);
  const data = validateBody(resource, body, { partial: true });
  const exists = await prisma[resource.model].findFirst({ where: { id }, select: { id: true } });
  if (!exists) throw err(`No ${resource.name} with id "${id}"`, 404, "not_found");
  const select = Object.fromEntries(readableFields(resource).map((k) => [k, true]));
  try {
    const row = await prisma[resource.model].update({ where: { id }, data, select });
    return serialize(resource, row);
  } catch (e) {
    throw translatePrismaError(e, resource);
  }
}

export async function remove(resourceId, id) {
  const resource = resolve(resourceId);
  if (resource.readOnly) throw err(`The ${resource.id} resource is read-only`, 405, "read_only");
  const exists = await prisma[resource.model].findFirst({ where: { id }, select: { id: true } });
  if (!exists) throw err(`No ${resource.name} with id "${id}"`, 404, "not_found");
  await prisma[resource.model].delete({ where: { id } });
  return { object: resource.id, id, deleted: true };
}

/** Turn Prisma's internal errors into clean, actionable API errors. */
function translatePrismaError(e, resource) {
  if (e.code === "P2002") {
    const target = Array.isArray(e.meta?.target) ? e.meta.target.join(", ") : e.meta?.target || "field";
    return err(`A ${resource.name} with that ${target} already exists`, 409, "conflict");
  }
  if (e.code === "P2003") return err("A referenced record does not exist", 400, "invalid_reference");
  if (e.code === "P2025") return err(`No ${resource.name} with that id`, 404, "not_found");
  return e;
}
