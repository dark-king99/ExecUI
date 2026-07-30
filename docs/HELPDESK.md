# Helpdesk, Knowledge Base & Customer Portal

| Capability | Where | Who |
|---|---|---|
| **Support queue** — one queue, threaded conversations | **Helpdesk → Queue** | anyone with CRM access |
| **Knowledge base** — public + internal articles | **Helpdesk → Knowledge base** | all read; admins publish |
| **Portal settings** — the shareable URL, manual sign-in links | **Helpdesk → Portal** | admins |
| **Customer portal** — help centre + own requests | `/portal/<org-slug>` | anyone with the link |

---

## 1. One queue

Portal tickets and internally-raised tickets share one table. A support queue
that forks by where the ticket came from is a queue where something gets missed,
so `source` is a column (`internal` / `portal` / `email`), not a separate system.

The queue sorts **urgent first, then oldest**. Newest-first buries the ticket
that has been waiting longest, which is exactly the one that matters.

Tickets get a human reference (`TKT-00001`), sequential per organization, with a
collision retry because two portal submissions can land in the same millisecond.

## 2. One thread, two audiences

Every message carries `visibility`:

- **public** — the customer sees it in the portal and gets it by email
- **internal** — a note only your team sees, in the same thread

An agent reads one story; the portal only ever serves the public half. Every
customer-facing read goes through `publicMessageWhere()`, so there is a single
place to be right about it rather than a condition repeated at each call site.

Consequences the module enforces:

- An **internal note is not a first response** — the customer hasn't heard
  anything, so it doesn't stop the response clock.
- A **public reply with no customer email address is refused**, with an
  explanation, rather than silently going nowhere.
- The thread records whether a reply was **actually emailed**. Implying that
  every reply reached the customer when no provider is configured is a lie the
  customer discovers later.
- A **customer reply reopens** a resolved ticket and clears its resolution: if
  they're still writing, it isn't resolved. A reply to a `pending` ticket (we
  were waiting on them) moves it back to `in_progress`.

Satisfaction is rated **once**, only after resolution, and a rating of 1–2
notifies the admins — a poor rating nobody sees is a wasted warning.

## 3. Knowledge base

Two independent switches decide who can read an article, and **both must be open**:

| | |
|---|---|
| `visibility` | `public` (customers) or `internal` (staff) |
| `status` | `draft` → `published` → `archived` |

A public **draft** is invisible to the portal, which is what makes drafting in the
open safe. Deleting a *published* article is refused — archive it, so a link to it
stops resolving deliberately rather than breaking.

- Slugs are generated, unique, and suffixed on collision rather than overwriting.
- An excerpt is derived from the body when none is written, cut at a sentence.
- Reading time is shown and never rounds to zero.
- **"Was this helpful?"** is stored as rows, not just counters, because the comment
  on a "no" is what tells you which article to rewrite. The console sorts by
  unhelpful votes — that's the list worth acting on.
- Internal articles are searchable by staff through global search; the portal uses
  a separate public-only path that cannot reach them.

## 4. The customer portal

Reachable at `/portal/<org-slug>` — one deployment serves every tenant's portal,
addressed by slug, so there's no tenant header to spoof.

**The help centre needs no sign-in at all.** A help centre you have to log into is
a help centre nobody reads.

### Sign-in is a magic link, not a password

Customers aren't staff. Giving them accounts means storing passwords, handling
resets and defending a second login surface — all so someone can check a ticket.
Instead they prove they own an email address and get a session.

| Decision | Why |
|---|---|
| Only the **SHA-256** of each token is stored (link and session alike) | a database dump can't be used to sign in as a customer |
| Links are **single-use** and expire in 20 minutes | a forwarded or leaked link stops working |
| Requesting a link **always returns the same response** | "no such customer" would leak your customer list |
| Sessions are scoped to **one tenant and one email address** | every read is filtered by that address, so there's no id to tamper with |
| A used token is **stripped from the address bar** | it doesn't linger in history or in a screenshot |

**With no email provider configured, the link is not returned to the caller.**
That would hand anyone a session for any address they typed — the exact thing the
email step exists to prevent. The portal says it couldn't send, and an **admin can
issue a link** from the console instead, with a warning that it signs that person
in.

### What a customer can do

Read the help centre and vote on articles; sign in; raise a request; reply; rate a
resolved request. Starting a request **suggests articles first** — the best support
request is the one nobody had to send.

What they never see: internal notes, assignee, SLA state, agent email addresses,
other people's tickets (a request that isn't theirs is a **404**, because whether
it exists is itself information), or a ticket marked `portalVisible: false`.

## 5. How this connects to the rest of the product

- **Global search** — tickets and articles are searchable sources, including by
  ticket reference. See [`docs/SEARCH.md`](./SEARCH.md).
- **Reporting** — the tickets dataset gained source, assignee, rating, first-reply
  and resolution columns; `kb_articles` is a dataset of its own.
- **Public API** — `support-tickets` is writable (so a monitoring tool or email
  gateway can raise one) with `status` and the outcome timestamps read-only, since
  a ticket's lifecycle moves through the helpdesk. `help-articles` is read-only.
  Internal notes aren't reachable through the API at all.
- **Compliance** — four governance categories. A customer's own messages are
  redacted on erasure while the thread survives so the ticket still makes sense;
  portal sessions and sign-in links are **deleted**; article feedback keeps the
  vote and drops the comment and address.

## 6. Operating notes

- Rate limits: `PORTAL_LINK_LIMIT_PER_HOUR` (8) on requesting a sign-in link —
  the endpoint that sends mail — `PORTAL_WRITE_LIMIT_PER_MIN` (12) on submissions
  and replies, `PORTAL_READ_LIMIT_PER_MIN` (120) on reads.
- The hourly ticker deletes spent and expired links and dead sessions. Tokens
  already refuse to work once expired; this stops the table becoming a permanent
  record of who contacted support and when. `HELPDESK_SCHEDULER=off` disables it.
- `APP_URL` must be correct in production — it's what portal and magic links point
  at.
- Attachments on ticket messages are stored as object URLs, which are unguessable
  but not access-controlled (see the object-store follow-up in
  `PRODUCTION_READINESS.md`).
