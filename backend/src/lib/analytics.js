/**
 * Server-side product analytics — provider-agnostic wrapper over PostHog.
 *
 * Honest degradation (like the app's other integrations):
 *   • No POSTHOG_KEY set → every call is a safe no-op; nothing leaves the server.
 *   • Key set            → server events and errors stream to PostHog, so a
 *     backend 5xx shows up next to the user's session/replay — telling you which
 *     ROUTE (not just which screen) needs improvement.
 *
 * Privacy: identifies by user id only and never sends request bodies or PII —
 * just route, status, and ids. Analytics must never throw into a request path,
 * so every call is wrapped and best-effort.
 *
 * Swapping providers later means changing only this file.
 */
import "dotenv/config";
import { PostHog, setupExpressErrorHandler } from "posthog-node";
import { log } from "./logger.js";

const KEY = process.env.POSTHOG_KEY;
const HOST = process.env.POSTHOG_HOST;

if (process.env.NODE_ENV !== "production" && !KEY) {
  throw new Error("POSTHOG_KEY variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once POSTHOG_KEY is configured");
}
if (process.env.NODE_ENV !== "production" && !HOST) {
  throw new Error("POSTHOG_HOST variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once POSTHOG_HOST is configured");
}

let client = null;

export function analyticsEnabled() {
  return !!KEY && !!HOST;
}

function getClient() {
  if (!analyticsEnabled()) return null;
  if (client) return client;
  try {
    client = new PostHog(KEY, {
      host: HOST,
      flushAt: 20,
      flushInterval: 10_000,
      enableExceptionAutocapture: true,
    });
    log.info?.("analytics_enabled", { host: HOST });
  } catch (err) {
    log.warn?.("analytics_init_failed", { error: String(err?.message || err).slice(0, 200) });
    client = null;
  }
  return client;
}

/** Mount the SDK's Express handler before the app's response error middleware. */
export function setupExpressErrorTracking(app) {
  try {
    const c = getClient();
    if (c) setupExpressErrorHandler(c, app);
  } catch {
    /* never break application setup */
  }
}

/** Run work inside the authenticated request's analytics identity. */
export function withAnalyticsContext({ userId, sessionId, tenantId, role }, fn) {
  let c;
  try {
    c = getClient();
  } catch {
    return fn();
  }
  if (!c || !userId) return fn();
  return c.withContext({
    distinctId: String(userId),
    ...(sessionId ? { sessionId: String(sessionId) } : {}),
    properties: {
      $groups: tenantId ? { company: String(tenantId) } : undefined,
      role,
    },
  }, fn);
}

/** Fire a named server event, inheriting the authenticated request context. */
export async function capture(distinctId, event, properties = {}) {
  try {
    const c = getClient();
    if (!c) return;
    c.capture({
      ...(distinctId ? { distinctId: String(distinctId) } : {}),
      event,
      properties,
    });
  } catch {
    /* never break the caller */
  }
}

/** Report a server error with route/status/request context (no PII, no body). */
export async function captureError(error, ctx = {}) {
  try {
    const c = await getClient();
    if (!c) return;
    c.captureException(error, ctx.userId ? String(ctx.userId) : "server", {
      ...ctx,
      groups: ctx.tenantId ? { company: String(ctx.tenantId) } : undefined,
    });
  } catch {
    /* never break the caller */
  }
}

/** Flush buffered events on graceful shutdown so nothing is lost. */
export async function shutdownAnalytics() {
  try {
    if (client) await client.shutdown();
  } catch {
    /* ignore */
  }
}
