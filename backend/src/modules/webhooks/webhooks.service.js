/**
 * Outbound webhooks — registration, signing, delivery and retry.
 *
 * Events originate from the Prisma layer (see config/database.js), so a callback
 * fires whether the change came through the public API or the app's own UI.
 * Each delivery is signed so receivers can verify it really came from ExecUI and
 * hasn't been tampered with or replayed, and failures are retried with
 * exponential backoff and recorded as an auditable log the customer can inspect.
 */
import crypto from "crypto";
import prisma from "../../config/database.js";
import { runUnscoped, runWithTenant } from "../../lib/tenantContext.js";
import { onDomainEvent } from "../../lib/domainEvents.js";
import { log } from "../../lib/logger.js";
import { getResource, readableFields, eventTypes } from "../api/api.resources.js";

/** Retry schedule (minutes) — six attempts across roughly 32 hours. */
export const BACKOFF_MINUTES = [1, 5, 30, 120, 360, 1440];
export const MAX_ATTEMPTS = BACKOFF_MINUTES.length;
/** Consecutive failures before an endpoint is parked. */
export const AUTO_DISABLE_AFTER = 15;
const TIMEOUT_MS = Number(process.env.WEBHOOK_TIMEOUT_MS) || 10_000;

const err = (m, status = 400) => { const e = new Error(m); e.status = status; return e; };

// ── URL safety (SSRF) ────────────────────────────────────────────────────────
/**
 * Private, loopback, link-local and internal-TLD targets. Checked with explicit
 * prefix matching (an anchored alternation silently fails to match "127.0.0.1",
 * which would leave cloud metadata endpoints like 169.254.169.254 reachable).
 */
export function isPrivateHost(hostname) {
  const h = String(hostname || "").toLowerCase().replace(/^\[|\]$/g, "");
  if (!h) return true;
  if (h === "localhost" || h === "::1" || h === "0.0.0.0") return true;
  if (h.endsWith(".local") || h.endsWith(".internal") || h.endsWith(".localhost")) return true;
  if (/^127\./.test(h)) return true;                      // loopback
  if (/^10\./.test(h)) return true;                       // RFC1918
  if (/^192\.168\./.test(h)) return true;                 // RFC1918
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true;  // RFC1918
  if (/^169\.254\./.test(h)) return true;                 // link-local (cloud metadata)
  if (/^(fc|fd)[0-9a-f]{2}:/.test(h)) return true;        // IPv6 unique-local
  if (/^fe80:/.test(h)) return true;                      // IPv6 link-local
  return false;
}

/**
 * Customers supply these URLs, so an unvalidated endpoint is an SSRF hole into
 * whatever the server can reach. Require HTTPS and reject private/loopback
 * targets. WEBHOOK_ALLOW_PRIVATE=true relaxes it for local development/tests.
 */
export function validateWebhookUrl(raw) {
  let url;
  try { url = new URL(String(raw)); } catch { throw err("Enter a valid absolute URL"); }
  const allowPrivate = process.env.WEBHOOK_ALLOW_PRIVATE === "true";
  if (!allowPrivate && url.protocol !== "https:") throw err("Webhook URLs must use HTTPS");
  if (!["http:", "https:"].includes(url.protocol)) throw err("Webhook URLs must use HTTPS");
  if (!allowPrivate && isPrivateHost(url.hostname)) throw err("That address is not publicly reachable");
  return url.toString();
}

// ── Signing ──────────────────────────────────────────────────────────────────
export const generateSecret = () => `whsec_${crypto.randomBytes(24).toString("base64url")}`;

/** `t=<unix>,v1=<hex>` over `${timestamp}.${body}` — verifiable by the receiver. */
export function signPayload(secret, body, timestamp = Math.floor(Date.now() / 1000)) {
  const signature = crypto.createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
  return { header: `t=${timestamp},v1=${signature}`, timestamp, signature };
}

/**
 * Reference verifier — the exact check a receiver should perform. Exported so
 * it can be tested here and pasted into docs/API.md with confidence.
 */
export function verifySignature(secret, body, header, { toleranceSec = 300, now = Date.now() } = {}) {
  const parts = Object.fromEntries(String(header || "").split(",").map((p) => p.split("=").map((s) => s.trim())));
  const t = Number(parts.t);
  if (!t || !parts.v1) return false;
  if (Math.abs(now / 1000 - t) > toleranceSec) return false; // replay window
  const expected = crypto.createHmac("sha256", secret).update(`${t}.${body}`).digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(String(parts.v1), "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// ── Endpoint management ──────────────────────────────────────────────────────
const shape = (e, { withSecret = false } = {}) => ({
  id: e.id,
  url: e.url,
  description: e.description,
  events: e.events,
  active: e.active,
  failureCount: e.failureCount,
  disabledAt: e.disabledAt,
  lastStatus: e.lastStatus,
  lastAttemptAt: e.lastAttemptAt,
  createdAt: e.createdAt,
  ...(withSecret ? { secret: e.secret } : { secretHint: `${e.secret.slice(0, 11)}…` }),
});

export const availableEvents = () => eventTypes();

export async function listEndpoints() {
  const rows = await prisma.webhookEndpoint.findMany({ orderBy: { createdAt: "desc" } });
  return rows.map((e) => shape(e));
}

function validateEvents(events) {
  const list = [...new Set(Array.isArray(events) ? events : [events])].filter(Boolean);
  if (!list.length) throw err("Subscribe to at least one event");
  if (list.includes("*")) return ["*"];
  const known = new Set(eventTypes());
  const unknown = list.filter((e) => !known.has(e));
  if (unknown.length) throw err(`Unknown event type(s): ${unknown.join(", ")}`);
  return list;
}

export async function createEndpoint(userId, body = {}) {
  const url = validateWebhookUrl(body.url);
  const events = validateEvents(body.events);
  const row = await prisma.webhookEndpoint.create({
    data: {
      url, events,
      description: body.description ? String(body.description).slice(0, 300) : null,
      secret: generateSecret(),
      createdById: userId,
    },
  });
  // Secret is returned in full on creation only.
  return shape(row, { withSecret: true });
}

export async function updateEndpoint(id, body = {}) {
  const existing = await prisma.webhookEndpoint.findFirst({ where: { id } });
  if (!existing) throw err("Endpoint not found", 404);
  const data = {};
  if (body.url !== undefined) data.url = validateWebhookUrl(body.url);
  if (body.events !== undefined) data.events = validateEvents(body.events);
  if (body.description !== undefined) data.description = body.description ? String(body.description).slice(0, 300) : null;
  if (body.active !== undefined) {
    data.active = !!body.active;
    // Re-enabling clears the failure trip so delivery resumes cleanly.
    if (body.active) { data.failureCount = 0; data.disabledAt = null; }
  }
  const row = await prisma.webhookEndpoint.update({ where: { id }, data });
  return shape(row);
}

export async function deleteEndpoint(id) {
  const existing = await prisma.webhookEndpoint.findFirst({ where: { id } });
  if (!existing) throw err("Endpoint not found", 404);
  await prisma.webhookEndpoint.delete({ where: { id } });
  return { deleted: true, id };
}

/** Rotate the signing secret (returned once, like creation). */
export async function rotateSecret(id) {
  const existing = await prisma.webhookEndpoint.findFirst({ where: { id } });
  if (!existing) throw err("Endpoint not found", 404);
  const row = await prisma.webhookEndpoint.update({ where: { id }, data: { secret: generateSecret() } });
  return shape(row, { withSecret: true });
}

export async function listDeliveries({ endpointId, limit = 50 } = {}) {
  const rows = await prisma.webhookDelivery.findMany({
    where: endpointId ? { endpointId } : {},
    orderBy: { createdAt: "desc" },
    take: Math.min(200, Math.max(1, Number(limit) || 50)),
  });
  return rows.map((d) => ({
    id: d.id, endpointId: d.endpointId, event: d.event, status: d.status,
    attempts: d.attempts, responseStatus: d.responseStatus, error: d.error,
    nextAttemptAt: d.nextAttemptAt, deliveredAt: d.deliveredAt, createdAt: d.createdAt,
    payload: d.payload,
  }));
}

// ── Event capture → delivery queue ───────────────────────────────────────────
/** Only the fields the public API exposes ever leave the system. */
function serializeRecord(resourceId, record) {
  const resource = getResource(resourceId);
  if (!resource) return {};
  const out = {};
  for (const key of readableFields(resource)) if (record[key] !== undefined) out[key] = record[key];
  return out;
}

const matches = (endpoint, type) => endpoint.events.includes("*") || endpoint.events.includes(type);

/** Queue a delivery per subscribed endpoint. Called for every domain event. */
export async function enqueueEvent({ tenantId, resource, action, type, record }) {
  if (!tenantId || !getResource(resource)) return { queued: 0 };
  const endpoints = await runWithTenant({ tenantId }, async () =>
    prisma.webhookEndpoint.findMany({ where: { active: true } }),
  );
  const targets = endpoints.filter((e) => matches(e, type));
  if (!targets.length) return { queued: 0 };

  const payload = {
    type,
    resource,
    action,
    created: new Date().toISOString(),
    data: serializeRecord(resource, record),
  };

  await runWithTenant({ tenantId }, async () =>
    prisma.webhookDelivery.createMany({
      data: targets.map((e) => ({
        tenantId, endpointId: e.id, event: type, payload,
        status: "pending", nextAttemptAt: new Date(),
      })),
    }),
  );
  return { queued: targets.length };
}

let unsubscribe = null;
/** Wire the Prisma domain-event stream into the delivery queue. */
export function subscribeToDomainEvents() {
  if (unsubscribe) return;
  unsubscribe = onDomainEvent((event) => {
    enqueueEvent(event).catch((e) => log.warn?.("webhook_enqueue_failed", { error: e.message }));
  });
}

// ── Delivery ─────────────────────────────────────────────────────────────────
/** POST one delivery and record the outcome. Returns "delivered"|"retry"|"failed". */
export async function attemptDelivery(delivery, endpoint) {
  const body = JSON.stringify({ id: delivery.id, ...delivery.payload });
  const { header, timestamp } = signPayload(endpoint.secret, body);
  const attempt = delivery.attempts + 1;

  let responseStatus = null, responseBody = null, error = null, ok = false;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(endpoint.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "ExecUI-Webhooks/1.0",
        "X-ExecUI-Event": delivery.event,
        "X-ExecUI-Delivery": delivery.id,
        "X-ExecUI-Timestamp": String(timestamp),
        "X-ExecUI-Signature": header,
      },
      body,
      signal: controller.signal,
      redirect: "manual", // never follow a redirect to an unvalidated host
    });
    responseStatus = res.status;
    responseBody = (await res.text().catch(() => "")).slice(0, 1000);
    ok = res.status >= 200 && res.status < 300;
    if (!ok) error = `Endpoint responded ${res.status}`;
  } catch (e) {
    error = e.name === "AbortError" ? `Timed out after ${TIMEOUT_MS}ms` : e.message;
  } finally {
    clearTimeout(timer);
  }

  const exhausted = attempt >= MAX_ATTEMPTS;
  const nextAttemptAt = ok || exhausted ? null
    : new Date(Date.now() + BACKOFF_MINUTES[attempt - 1] * 60_000);

  await prisma.webhookDelivery.update({
    where: { id: delivery.id },
    data: {
      attempts: attempt,
      status: ok ? "delivered" : exhausted ? "failed" : "pending",
      responseStatus, responseBody, error,
      nextAttemptAt,
      deliveredAt: ok ? new Date() : null,
    },
  });

  // Track endpoint health; park it after sustained failure so we stop hammering.
  if (ok) {
    await prisma.webhookEndpoint.update({
      where: { id: endpoint.id },
      data: { failureCount: 0, lastStatus: `${responseStatus}`, lastAttemptAt: new Date() },
    });
  } else {
    const failures = endpoint.failureCount + 1;
    const park = failures >= AUTO_DISABLE_AFTER;
    await prisma.webhookEndpoint.update({
      where: { id: endpoint.id },
      data: {
        failureCount: failures,
        lastStatus: responseStatus ? `${responseStatus}` : "error",
        lastAttemptAt: new Date(),
        ...(park ? { active: false, disabledAt: new Date() } : {}),
      },
    });
  }

  return ok ? "delivered" : exhausted ? "failed" : "retry";
}

/** Process the due queue across all tenants. */
export async function deliverPending(now = new Date(), limit = 50) {
  const due = await runUnscoped(async () =>
    prisma.webhookDelivery.findMany({
      where: { status: "pending", nextAttemptAt: { lte: now } },
      include: { endpoint: true },
      orderBy: { createdAt: "asc" },
      take: limit,
    }),
  );

  let delivered = 0, retried = 0, failed = 0;
  for (const d of due) {
    if (!d.endpoint || !d.endpoint.active) {
      await runUnscoped(async () => prisma.webhookDelivery.update({
        where: { id: d.id }, data: { status: "failed", error: "Endpoint is inactive", nextAttemptAt: null },
      }).catch(() => {}));
      failed++;
      continue;
    }
    // Claim so parallel instances don't double-send.
    const claimed = await runUnscoped(async () => prisma.webhookDelivery.updateMany({
      where: { id: d.id, status: "pending", nextAttemptAt: d.nextAttemptAt },
      data: { nextAttemptAt: new Date(Date.now() + 60_000) },
    }));
    if (!claimed.count) continue;

    try {
      const outcome = await runWithTenant({ tenantId: d.tenantId }, () => attemptDelivery(d, d.endpoint));
      if (outcome === "delivered") delivered++; else if (outcome === "retry") retried++; else failed++;
    } catch (e) {
      failed++;
      log.warn?.("webhook_delivery_error", { deliveryId: d.id, error: e.message });
    }
  }
  return { due: due.length, delivered, retried, failed };
}

/** Re-queue a delivery for an immediate fresh attempt. */
export async function replayDelivery(id) {
  const d = await prisma.webhookDelivery.findFirst({ where: { id } });
  if (!d) throw err("Delivery not found", 404);
  const row = await prisma.webhookDelivery.update({
    where: { id },
    data: { status: "pending", attempts: 0, nextAttemptAt: new Date(), error: null, responseStatus: null },
  });
  return { replayed: true, id: row.id };
}

/** Send a synthetic event so a customer can verify their receiver end-to-end. */
export async function testEndpoint(id) {
  const endpoint = await prisma.webhookEndpoint.findFirst({ where: { id } });
  if (!endpoint) throw err("Endpoint not found", 404);
  const delivery = await prisma.webhookDelivery.create({
    data: {
      endpointId: endpoint.id,
      event: "ping",
      payload: { type: "ping", resource: null, action: "ping", created: new Date().toISOString(), data: { message: "Test event from ExecUI" } },
      status: "pending",
      nextAttemptAt: new Date(),
    },
  });
  const outcome = await attemptDelivery(delivery, endpoint);
  const after = await prisma.webhookDelivery.findFirst({ where: { id: delivery.id } });
  return {
    outcome,
    responseStatus: after?.responseStatus ?? null,
    error: after?.error ?? null,
    message: outcome === "delivered"
      ? `Your endpoint accepted the test event (HTTP ${after?.responseStatus}).`
      : `Delivery did not succeed: ${after?.error || "unknown error"}. It will be retried automatically.`,
  };
}

// ── Worker ───────────────────────────────────────────────────────────────────
let timer = null;

export function startWebhookWorker({ intervalMs = 30_000 } = {}) {
  subscribeToDomainEvents();
  if (timer || process.env.WEBHOOK_WORKER === "off") return;
  timer = setInterval(() => {
    deliverPending().catch((e) => log.error?.("webhook_worker_tick_failed", { error: e.message }));
  }, intervalMs);
  timer.unref?.();
  log.info?.("webhook_worker_started", { intervalMs });
}

export function stopWebhookWorker() {
  if (timer) { clearInterval(timer); timer = null; }
}
