/**
 * Product analytics — a thin, provider-agnostic layer over PostHog.
 *
 * Honest degradation (same pattern as AI / email / social in this app):
 *   • No VITE_POSTHOG_KEY set  → every call is a safe no-op. The app is fully
 *     usable and ships nothing anywhere.
 *   • Key set                  → pageviews, autocaptured clicks, session replay,
 *     custom events and errors stream to your PostHog project, so you can see
 *     where users drop off (funnels), what confused them (replays / heatmaps),
 *     and which UI paths error out.
 *
 * Privacy by default: respects Do-Not-Track and an explicit opt-out, masks all
 * text and inputs in session replay, and does NOT send names/emails unless
 * VITE_ANALYTICS_CAPTURE_PII === "true". Analytics can never throw into the app.
 *
 * Swapping providers later means changing only this file — nothing else imports
 * the SDK.
 */
const KEY = import.meta.env.VITE_POSTHOG_KEY;
const HOST = import.meta.env.VITE_POSTHOG_HOST;
const CAPTURE_PII = import.meta.env.VITE_ANALYTICS_CAPTURE_PII === "true";
const API_HOST = (() => {
  if (typeof window === "undefined") return undefined;
  try {
    return new URL(import.meta.env.VITE_API_BASE_URL || "/api", window.location.origin).hostname;
  } catch {
    return window.location.hostname;
  }
})();

if (import.meta.env.DEV && !KEY) {
  throw new Error("VITE_POSTHOG_KEY variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once VITE_POSTHOG_KEY is configured");
}
if (import.meta.env.DEV && !HOST) {
  throw new Error("VITE_POSTHOG_HOST variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once VITE_POSTHOG_HOST is configured");
}

let client = null; // the posthog instance once loaded
let ready = false;
let starting = false;
const queue = []; // calls made before the SDK finished loading

function optedOut() {
  try {
    if (localStorage.getItem("analytics_opt_out") === "1") return true;
    const dnt = navigator.doNotTrack || window.doNotTrack || navigator.msDoNotTrack;
    return dnt === "1" || dnt === "yes";
  } catch {
    return false;
  }
}

/** True when a provider is configured and the user hasn't opted out. */
export function analyticsEnabled() {
  return !!KEY && !!HOST && !optedOut();
}

/** Load + initialise the provider once. Safe no-op without a key / on opt-out. */
export async function initAnalytics() {
  if (ready || starting || !analyticsEnabled()) return;
  starting = true;
  try {
    const { default: posthog } = await import("posthog-js");
    posthog.init(KEY, {
      api_host: HOST,
      // The SDK adds PostHog's distinct/session headers to API requests so the
      // backend can associate server-side errors with the browser session.
      tracing_headers: API_HOST ? [API_HOST] : [],
      capture_pageview: false, // SPA pageviews are sent manually (see trackPageview)
      autocapture: true, // clicks / inputs → "what did they interact with"
      capture_performance: true, // page + resource timings → slow-UI signals
      logs: {
        serviceName: "exec-ui-web",
        environment: import.meta.env.MODE,
      },
      persistence: "localStorage+cookie",
      session_recording: {
        maskAllInputs: true, // never record what users type
        maskTextSelector: "[data-private]",
      },
      respect_dnt: true,
      // Use the SDK's global handlers for uncaught browser errors and rejections.
      capture_exceptions: {
        capture_unhandled_errors: true,
        capture_unhandled_rejections: true,
        capture_console_errors: false,
      },
    });
    client = posthog;
    ready = true;
    logInfo("browser_analytics_initialized", { runtime: "web" });
    for (const [method, args] of queue.splice(0)) {
      try { client[method]?.(...args); } catch { /* ignore */ }
    }
  } catch {
    // Provider failed to load — stay a no-op, never break the app.
  } finally {
    starting = false;
  }
}

function call(method, ...args) {
  if (!analyticsEnabled()) return;
  if (ready && client) {
    try { client[method]?.(...args); } catch { /* ignore */ }
  } else {
    queue.push([method, args]);
  }
}

/** Send an explicit operational log without forwarding browser console output. */
export function logInfo(body, attributes = {}) {
  if (!analyticsEnabled() || !ready || !client) return;
  try {
    client.logger?.info(body, attributes);
  } catch {
    /* logging must never affect the UI */
  }
}

/** Tie events to a user (id only by default; role/plan as properties). */
export function identify(user) {
  if (!user) return;
  const id = user.id || user.userId;
  if (!id) return;
  const props = { role: user.role, plan: user.plan };
  if (CAPTURE_PII) {
    props.email = user.email;
    props.name = [user.firstName, user.lastName].filter(Boolean).join(" ") || undefined;
  }
  call("identify", String(id), props);
  if (user.tenantId) call("group", "company", String(user.tenantId), { plan: user.plan });
}

/** Clear identity on logout so the next session isn't attributed to them. */
export function resetAnalytics() {
  call("reset");
}

/** Fire a named product event (funnel step, feature use, …). */
export function track(event, props = {}) {
  call("capture", event, props);
}

/** Record an SPA pageview (drop-off funnels are built from these). */
export function trackPageview(path) {
  call("capture", "$pageview", { path, $current_url: typeof window !== "undefined" ? window.location.href : path });
}

/** Report a client-side error with context (component, route, …). */
export function captureError(error, context = {}) {
  if (!error || !analyticsEnabled() || !ready || !client) return;
  try {
    client.captureException(error instanceof Error ? error : new Error(String(error)), context);
  } catch {
    /* ignore */
  }
}
