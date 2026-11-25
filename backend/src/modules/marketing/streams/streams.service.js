/**
 * Data Streams: the sources marketing data arrives from.
 *
 *   form  a hosted signup form at /api/public/marketing/forms/<publicKey>
 *   api   POST /api/public/marketing/ingest/events with "Authorization: Bearer <key>"
 *   csv   file imports made in the app
 *
 * The API key is shown once when it's created or rotated; only its SHA-256 is
 * stored. Counts come from what was actually received.
 */
import crypto from "crypto";
import prisma from "../../../config/database.js";
import { publicBase } from "../email/render.js";

const err = (message, status = 400) => Object.assign(new Error(message), { status });
export const KINDS = ["form", "api", "csv"];
const FIELD_KEY = /^[a-z][a-z0-9_]{0,30}$/;
const RESERVED = new Set(["email", "name", "consent", "website", "company_url"]);

export const hashKey = (key) => crypto.createHash("sha256").update(String(key)).digest("hex");
const newSecret = () => `mks_${crypto.randomBytes(24).toString("base64url")}`;

function formConfig(c = {}) {
  const askConsent = c.askConsent !== false;
  const consentText = String(c.consentText ?? "").trim().slice(0, 300);
  if (askConsent && consentText.length < 10) throw err("Write the consent sentence people tick, e.g. \"Email me news and offers. I can unsubscribe at any time.\"");
  const fields = (Array.isArray(c.fields) ? c.fields : []).slice(0, 5).map((f) => {
    const key = String(f?.key ?? "").trim().toLowerCase();
    if (!FIELD_KEY.test(key) || RESERVED.has(key)) throw err(`Field keys use lowercase letters, digits and "_" and can't be ${[...RESERVED].join(", ")}`);
    return { key, label: String(f.label ?? key).trim().slice(0, 60), required: !!f.required };
  });
  let redirectUrl = null;
  if (c.redirectUrl) {
    try { const u = new URL(String(c.redirectUrl)); if (u.protocol !== "https:") throw new Error(); redirectUrl = u.toString(); }
    catch { throw err("The thank-you page must be an https:// address"); }
  }
  return {
    title: String(c.title ?? "Stay in touch").trim().slice(0, 120), intro: String(c.intro ?? "").trim().slice(0, 500),
    button: String(c.button ?? "Sign up").trim().slice(0, 40), successMessage: String(c.successMessage ?? "Thanks — you're on the list.").trim().slice(0, 300),
    askConsent, consentText, requireName: !!c.requireName, fields, redirectUrl,
  };
}

const apiConfig = (c = {}) => ({ createContacts: c.createContacts !== false });

function shape(s) {
  const base = publicBase();
  return {
    id: s.id, name: s.name, kind: s.kind, status: s.status, config: s.config,
    received: s.received, rejected: s.rejected, lastReceivedAt: s.lastReceivedAt, lastError: s.lastError, createdAt: s.createdAt,
    ...(s.kind === "form" ? { formUrl: `${base}/api/public/marketing/forms/${s.publicKey}` } : {}),
    ...(s.kind === "api" ? { keyPrefix: s.secretPrefix, endpoint: `${base}/api/public/marketing/ingest/events` } : {}),
  };
}

async function load(tenantId, id) {
  const s = await prisma.marketingDataSource.findFirst({ where: { id: String(id), tenantId } });
  if (!s) throw err("Data stream not found", 404);
  return s;
}

export async function list(tenantId) {
  const rows = await prisma.marketingDataSource.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } });
  return rows.map(shape);
}

export async function get(tenantId, id) {
  return shape(await load(tenantId, id));
}

export async function create(tenantId, userId, body = {}) {
  const name = String(body.name ?? "").trim().slice(0, 120);
  if (!name) throw err("Name the data stream");
  const kind = String(body.kind ?? "");
  if (!KINDS.includes(kind)) throw err("Choose a form, an API key or a CSV import");
  const data = { tenantId, name, kind, createdById: userId, config: {} };
  let secret = null;
  if (kind === "form") { data.config = formConfig(body.config); data.publicKey = crypto.randomBytes(12).toString("base64url"); }
  if (kind === "api") { data.config = apiConfig(body.config); secret = newSecret(); data.secretHash = hashKey(secret); data.secretPrefix = secret.slice(0, 10); }
  const s = await prisma.marketingDataSource.create({ data });
  await prisma.auditLog.create({ data: { tenantId, userId, action: "marketing.stream.created", resource: "marketing_stream", resourceId: s.id, detail: `Created ${kind} data stream "${name}"` } }).catch(() => {});
  return { ...shape(s), ...(secret ? { secret } : {}) };
}

export async function update(tenantId, id, body = {}) {
  const s = await load(tenantId, id);
  const data = {};
  if (body.name !== undefined) { data.name = String(body.name ?? "").trim().slice(0, 120); if (!data.name) throw err("Name the data stream"); }
  if (body.status !== undefined) { if (!["active", "paused"].includes(body.status)) throw err("Status is active or paused"); data.status = body.status; }
  if (body.config !== undefined) data.config = s.kind === "form" ? formConfig(body.config) : s.kind === "api" ? apiConfig(body.config) : {};
  return shape(await prisma.marketingDataSource.update({ where: { id: s.id }, data }));
}

export async function rotateKey(tenantId, userId, id) {
  const s = await load(tenantId, id);
  if (s.kind !== "api") throw err("Only API streams have keys", 409);
  const secret = newSecret();
  const row = await prisma.marketingDataSource.update({ where: { id: s.id }, data: { secretHash: hashKey(secret), secretPrefix: secret.slice(0, 10) } });
  await prisma.auditLog.create({ data: { tenantId, userId, action: "marketing.stream.key_rotated", resource: "marketing_stream", resourceId: s.id, detail: `Rotated the API key of "${s.name}"` } }).catch(() => {});
  return { ...shape(row), secret };
}

export async function remove(tenantId, userId, id) {
  const s = await load(tenantId, id);
  await prisma.marketingDataSource.delete({ where: { id: s.id } });
  await prisma.auditLog.create({ data: { tenantId, userId, action: "marketing.stream.deleted", resource: "marketing_stream", resourceId: s.id, detail: `Deleted data stream "${s.name}" (contacts and events it brought in are kept)` } }).catch(() => {});
  return { deleted: true };
}

export async function runs(tenantId, id) {
  const s = await load(tenantId, id);
  return prisma.marketingIngestRun.findMany({ where: { tenantId, sourceId: s.id }, orderBy: { startedAt: "desc" }, take: 20 });
}

/** The latest events this stream recorded. */
export async function recent(tenantId, id) {
  const s = await load(tenantId, id);
  return prisma.marketingEvent.findMany({
    where: { tenantId, properties: { path: ["sourceId"], equals: s.id } },
    orderBy: { occurredAt: "desc" }, take: 25,
    select: { id: true, type: true, email: true, occurredAt: true, properties: true },
  });
}

/** Custom event names this tenant has received, for segment and journey pickers. */
export async function customEventTypes(tenantId) {
  const rows = await prisma.marketingEvent.groupBy({ by: ["type"], where: { tenantId, type: { startsWith: "custom:" } }, _count: { _all: true }, orderBy: { type: "asc" }, take: 200 });
  return rows.map((r) => ({ type: r.type, count: r._count._all }));
}

/** Real numbers for the Data Cloud overview. */
export async function overview(tenantId) {
  const since = new Date(Date.now() - 30 * 86_400_000);
  const [profiles, consented, sources, active, events, events30, byType, audiences] = await Promise.all([
    prisma.contact.count({ where: { tenantId } }),
    prisma.marketingConsent.count({ where: { tenantId, channel: "email", status: "subscribed" } }),
    prisma.marketingDataSource.count({ where: { tenantId } }),
    prisma.marketingDataSource.count({ where: { tenantId, status: "active" } }),
    prisma.marketingEvent.count({ where: { tenantId } }),
    prisma.marketingEvent.count({ where: { tenantId, occurredAt: { gte: since } } }),
    prisma.marketingEvent.groupBy({ by: ["type"], where: { tenantId, occurredAt: { gte: since } }, _count: { _all: true } }),
    prisma.marketingAudience.count({ where: { tenantId } }),
  ]);
  return {
    profiles, consented, sources, activeSources: active, events, events30, audiences,
    eventsByType: byType.map((r) => ({ type: r.type, count: r._count._all })).sort((a, b) => b.count - a.count).slice(0, 12),
  };
}
