# Product Analytics & User-Activity Tracking

ExecUI can stream real user-behavior data to an external analytics tool so you
can answer the three questions that matter for improving the product:

| Question | What answers it | Where it comes from |
|---|---|---|
| **Where did the user stop?** | Pageview **funnels** & drop-off | SPA pageviews on every route change |
| **What didn't they understand?** | **Session replay**, heatmaps, rage/dead clicks | Autocapture + session recording |
| **Which part (UI or backend) needs work?** | UI **error** events + backend **5xx** events | Error boundary / global handlers + server error middleware |

The default provider is **PostHog** (one tool covering all three), wired through
a thin, provider-agnostic layer. Nothing is vendor-locked: swapping tools means
editing one file on each side.

## How it degrades honestly

- **No keys set → a safe no-op.** The app is fully usable and sends nothing
  anywhere. This is the default in dev and for anyone who hasn't opted in.
- **Keys set → live.** Events stream to your PostHog project.

## Turn it on

1. Create a project at [PostHog](https://posthog.com) (cloud or self-hosted) and
   copy the **Project API Key**.
2. **Frontend** — set in `frontend/.env`:
   ```
   VITE_POSTHOG_KEY=phc_xxx
   VITE_POSTHOG_HOST=https://us.i.posthog.com   # or eu / your self-host
   VITE_ANALYTICS_CAPTURE_PII=false             # names/emails off by default
   ```
3. **Backend** — set in `backend/.env` (captures server 5xx errors):
   ```
   POSTHOG_KEY=phc_xxx
   POSTHOG_HOST=https://us.i.posthog.com
   ```
4. Rebuild the frontend and restart the backend. Done.

## What gets captured

**Frontend** (`frontend/src/lib/analytics.js`)
- `$pageview` on every route change → build funnels to see the exact step users
  abandon (e.g. signup → plan → first feature).
- **Autocapture** of clicks/inputs and **session replay** (with all inputs and
  `[data-private]` elements masked) → watch where people hesitate or rage-click.
- `identify` on login (user id; role + plan as properties; company as a group),
  `reset` on logout.
- `$exception` for UI crashes (via the Error Boundary) and uncaught
  errors/rejections → which screen/component breaks.
- A `logged_in` funnel anchor event. Add more with
  `import { track } from "lib/analytics"; track("event_name", { ...props })`.

**Backend** (`backend/src/lib/analytics.js`)
- `$exception` for every **5xx**, tagged with `route`, `status`, `requestId`,
  and the user/company ids — so a failing API route lands right next to the
  user's replay. No request bodies or PII are sent.
- `capture(distinctId, event, props)` is available for server-side product
  events.

## Privacy & compliance

- **Opt-in by keys** — off unless configured.
- **Respects Do-Not-Track** and an explicit opt-out
  (`localStorage.analytics_opt_out = "1"`).
- **No PII by default** — only ids, role, and plan leave the app. Names/emails
  require `VITE_ANALYTICS_CAPTURE_PII=true`.
- **Replay masks all inputs**; add `data-private` to any element to mask it too.
- Deleting a user/tenant purges their in-app data (see `PRODUCTION_READINESS.md`
  §8); configure matching retention in your PostHog project.

## Swapping providers

Replace the SDK calls inside the two `analytics.js` files (frontend + backend)
with your tool's SDK (Mixpanel, Amplitude, Sentry, …). The rest of the app only
imports `identify / track / trackPageview / captureError`, so no other file
changes.
