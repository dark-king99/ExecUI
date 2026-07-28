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
import { log } from "./logger.js";

const KEY = process.env.POSTHOG_KEY;
const HOST = process.env.POSTHOG_HOST || "https://us.i.posthog.com";

let client = null;
let loading = null;

export function analyticsEnabled() {
  return !!KEY;
}

async function getClient() {
  if (!KEY) return null;
  if (client) return client;
  if (!loading) {
    loading = (async () => {
      try {
        const { PostHog } = await import("posthog-node");
        client = new PostHog(KEY, { host: HOST, flushAt: 20, flushInterval: 10_000 });
        log.info?.("analytics_enabled", { host: HOST });
      } catch (err) {
        log.warn?.("analytics_init_failed", { error: String(err?.message || err).slice(0, 200) });
        client = null;
      }
      return client;
    })();
  }
  return loading;
}

/** Fire a named server event. distinctId should be the user id (or "server"). */
export async function capture(distinctId, event, properties = {}) {
  try {
    const c = await getClient();
    if (!c) return;
    c.capture({ distinctId: distinctId ? String(distinctId) : "server", event, properties });
  } catch {
    /* never break the caller */
  }
}

/** Report a server error with route/status/request context (no PII, no body). */
export async function captureError(error, ctx = {}) {
  try {
    const c = await getClient();
    if (!c) return;
    c.capture({
      distinctId: ctx.userId ? String(ctx.userId) : "server",
      event: "$exception",
      properties: {
        $exception_message: error?.message || String(error),
        $exception_type: error?.name || "Error",
        stack: typeof error?.stack === "string" ? error.stack.slice(0, 4000) : undefined,
        ...ctx,
      },
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
