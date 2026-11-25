# Email Studio

Real email campaigns: written, tested, scheduled or sent; delivered through a
verified domain; only to contacts who agreed; with bounces, complaints,
opens, clicks and unsubscribes coming back from the provider.

## Setup (once per deployment)
1. Create a Resend account for marketing (separate from the app's
   transactional key) → `MARKETING_RESEND_API_KEY`.
2. Resend → Webhooks → add `<APP_URL>/api/public/marketing/email/events` for
   `email.delivered`, `email.bounced`, `email.complained`, `email.opened`,
   `email.clicked`, `email.failed`, `email.delivery_delayed` →
   `MARKETING_RESEND_WEBHOOK_SECRET`.
3. Optional: turn on open/click tracking per domain in Resend.

## Setup (per organization) — Email Studio → Sending setup
1. **Add a sending domain** (e.g. `mail.company.com`) and publish the SPF/DKIM
   records shown; press *Check DNS* until it's verified. Publishing the
   recommended **DMARC** record is strongly advised (Gmail/Yahoo require it for
   bulk senders).
2. **Postal address** — required in every marketing email by CAN-SPAM and
   similar laws; added to the footer automatically.

## Consent
Marketing email goes **only** to CRM contacts whose email consent is
`subscribed`. Existing contacts start with no consent recorded, so nobody is
emailed until consent is recorded — individually, by import with a stated
source ("Website signup form, 2026"), or (later phases) by forms. Every change
is kept as an event with its source. Hard bounces and spam complaints suppress
the address and update consent automatically; every email has a one-click
unsubscribe link and `List-Unsubscribe` headers (RFC 8058).

## How a send runs
- *Send now* / scheduled time → the campaign is validated (subject, body,
  verified domain, audience, postal address, provider) and one delivery row is
  written per sendable recipient. Status: **running**.
- A background worker (every app instance, coordinated by the database with
  `FOR UPDATE SKIP LOCKED`) sends at `MARKETING_EMAIL_RATE`, re-checking consent
  and suppression just before each message. The delivery id is the provider
  idempotency key, so a crash mid-send can't duplicate a message.
- Temporary errors (rate limits, provider outages) retry after 1, 5 and 30
  minutes; permanent ones fail. When nothing is left: **completed** (or
  **failed** if every message failed). A domain that loses verification
  **pauses** the campaign with the reason.

## Numbers
All counts come from delivery rows and provider webhooks: *accepted* (the
provider took it), *delivered* (the receiving server confirmed), bounced,
complained, opened (pixel-based, approximate), clicked, unsubscribed, failed,
skipped. None of them proves inbox placement.

## Permissions
Drafting: anyone with the Marketing module. Sending, scheduling, test sends:
**Send marketing email** (`marketing.email.send`). Domains and email settings:
**Manage marketing settings** (`marketing.settings.manage`). Admins have both.
Test emails go only to members of the workspace.
