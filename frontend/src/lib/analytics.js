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
const HOST = import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com";
const CAPTURE_PII = import.meta.env.VITE_ANALYTICS_CAPTURE_PII === "true";

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
  return !!KEY && !optedOut();
}

/** Load + initialise the provider once. Safe no-op without a key / on opt-out. */
export async function initAnalytics() {
  if (ready || starting || !analyticsEnabled()) return;
  starting = true;
  try {
    const { default: posthog } = await import("posthog-js");
    posthog.init(KEY, {
      api_host: HOST,
      capture_pageview: false, // SPA pageviews are sent manually (see trackPageview)
      autocapture: true, // clicks / inputs → "what did they interact with"
      capture_performance: true, // page + resource timings → slow-UI signals
      persistence: "localStorage+cookie",
      session_recording: {
        maskAllInputs: true, // never record what users type
        maskTextSelector: "[data-private]",
      },
      respect_dnt: true,
    });
    client = posthog;
    ready = true;
    // Global error capture so UI crashes show up as $exception events.
    window.addEventListener("error", (e) => captureError(e?.error || e?.message, { source: "window.onerror" }));
    window.addEventListener("unhandledrejection", (e) => captureError(e?.reason, { source: "unhandledrejection" }));
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

/** Tie events to a user (id only by default; role/plan as properties). */
export function identify(user) {
  if (!user) return;
  const id = user.id || user.userId || user.email;
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
    if (typeof client.captureException === "function") {
      client.captureException(error instanceof Error ? error : new Error(String(error)), context);
    } else {
      client.capture("$exception", {
        $exception_message: error?.message || String(error),
        $exception_type: error?.name,
        stack: error?.stack,
        ...context,
      });
    }
  } catch {
    /* ignore */
  }
}
