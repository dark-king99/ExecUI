# Documents, E-signature & Contracts (CLM)

Three connected things, in one module:

| Capability | Where | Who |
|---|---|---|
| **Document hub** — versioned company documents | **Documents** | every employee |
| **Templates** — write once, generate per counterparty | **Documents → Templates** | admins generate; everyone can read |
| **E-signature** — send a document out to be signed | **Documents → Signatures** | admins |
| **Contract register (CLM)** — value, dates, lifecycle, renewals | **Contracts** | admins |
| **Signing portal** — where the counterparty signs | `/sign/<token>` | anyone with the link |

---

## 1. Documents are versioned, and versions are immutable

A **document** is the identity of a file — its title, owner, category. The bytes
always live in a **version**. Uploading a replacement adds version *N+1*; it never
overwrites version *N*, and the old file stays downloadable.

That isn't tidiness, it's the foundation of everything else: each version records
the **SHA-256 of its bytes**, and a signature is bound to that fingerprint. "This
is the contract we signed" becomes a fact you can check rather than a claim.

- Categories are declared in `documents.registry.js` (general, contract, policy,
  SOP, proposal, invoice, HR, legal, technical).
- **Archive is the default way to retire** a document. Permanent deletion is
  admin-only and is **refused** while the document carries signature envelopes or
  a contract — deleting signed evidence shouldn't be one click away.
- Executable file types are rejected, the same as elsewhere in the product.
- Only the **owner or an admin** may edit a document or add a version.

## 2. Templates

A template is plain text with `{{placeholders}}`, rendered by the *same*
prototype-safe templating the automation engine uses — templating is where
injection bugs live, so there is one hardened implementation, not two.

- Placeholders are **discovered from the body**, so a template can never ask for a
  value it doesn't use or silently drop one it does.
- Generating **refuses to proceed with a blank required value**. An agreement with
  an empty counterparty name is worse than an error message.
- Output is a real **PDF** (pdfkit, as used by report exports), filed as version 1
  of a new document — so a generated agreement enters the same versioned,
  signable, checksummed pipeline as an uploaded one.

## 3. E-signature

### What makes the signature defensible

| Decision | Why |
|---|---|
| Each party gets a random 32-byte token; **only its SHA-256 is stored** | A database dump can't be used to sign on someone's behalf. |
| Signing requires a **typed legal name *and* an explicit consent tick** | Intent (the ESIGN/UETA idea) is captured, never inferred from a click. |
| The certificate records the **SHA-256 of the exact version signed** | A later edit to the document is detectable, not arguable. |
| The certificate carries a **hash over its own canonical JSON** | Tampering with a stored certificate is provable — `verifyCertificate` recomputes it. |
| Links are **single-use** and expire (30 days by default) | A forwarded or leaked link stops working. |
| The signer's **IP and browser are recorded — and they're told so** | It's evidence, and evidence collected in secret is a different thing. |

Sequential or parallel: a sequential envelope invites one party at a time and
advances automatically when each signs. **One decline ends the envelope** — an
agreement isn't partially agreed. Viewers receive a copy and never hold it open.

On completion every party is emailed the fingerprint and certificate id, and the
sender can download the certificate as a PDF.

### Honest degradation

With no email provider configured, **nothing is faked**: the response says
`no_email_provider` in plain words and returns the signing links to the sender to
distribute. The links exist nowhere else — they're minted in that response and
only their hashes are kept — which is exactly what makes handing them over safe
rather than a leak.

### The public endpoints

`/api/sign/:token` (GET, sign, decline) is the only unauthenticated write surface
in the product, because a counterparty has no account and shouldn't need one.
Accordingly it is token-only (no ids are accepted from the caller), rate-limited
per IP more tightly than the global limit, and runs unscoped by necessity — with
every subsequent write pinned to the tenant the token itself resolved to.

## 4. Contract lifecycle

A contract is the *business* object — counterparty, money, dates, obligations. The
document is the paper. Separating them is what lets a contract move through review
and signature while the paper gets re-versioned underneath it.

```
draft ──► in_review ──► pending_signature ──► active ──► renewed
  │           │                │                 ├────► expired
  └───────────┴────────────────┴───────► cancelled└────► terminated
```

**Status only ever moves along a declared edge** (`CONTRACT_STATES` in the
registry). `draft → renewed` is impossible; a terminated contract is a dead end.
The UI generates its buttons from the same map, so it can only offer a move the
backend will accept, and a refusal always explains what *is* allowed.

Two extra checks need the database: a contract can't be hand-activated while an
envelope is still out for signature, and a terminal contract can't be edited.

**Every move leaves a timeline entry** — status changes, approvals, signatures,
reminders, renewals and free-text notes. "How did this become active, and who did
it?" is the question a register exists to answer.

- **Approval routing** reuses the approvals engine. The outcome comes back over
  the domain-event bus, and `contracts:write` over the public API deliberately
  **cannot set `status`** — the lifecycle map is the only door.
- **Signature routing** sends the attached document; completion activates the
  contract automatically via the e-signature completion hook (no polling).
- **Renewal** creates a *successor* contract and marks the original `renewed`,
  rather than editing dates in place — so the register keeps both. A 12-month
  term starting 1 Aug 2027 ends 31 Jul 2028, not 1 Aug. The chain is a real
  relation, readable in both directions ("what did this replace?" and "what
  replaced it?"), and creating a renewal takes you to the renewal — that is the
  record you now work on.

### The document and the contract can each see the other

Separating the business object from the paper is only tolerable if neither side
becomes an id you have to go and look up.

| From a document | From a contract |
|---|---|
| the contracts it is attached to, with status and whether they are in force | the document, its current version, file name and SHA-256 |
| the signature envelopes raised against it | the envelope, and how many parties have signed |

So the register can distinguish **no document** from **a document with no file in
it** — both stop a signature, and a title on its own hides the second case
entirely — and the hub can say what a document is being used for before you try to
delete it.

The guards are in the service, and the UI states them on the button rather than
after the click:

| Action | Refused when | Because |
|---|---|---|
| Delete document | a contract is attached (the error **names it**) | a contract without its paperwork isn't a record of anything |
| Delete document | signature requests exist against it | it would destroy signature evidence |
| Archive document | a contract using it is **in force** | archiving hides it from the hub and from search, losing a live obligation's own evidence from view while the obligation carries on |

A *closed* contract's document can be archived — the point is the live commitment,
not the row.

See [`docs/NAVIGATION.md`](./NAVIGATION.md) for the linking and refresh mechanisms
these views share with the rest of the product.

## 5. Renewal reminders

The daily ticker (`contracts.scheduler.js`) does three things per tenant:

1. **Reminds** the owner when the **notice deadline** (end date minus the notice
   period) or the end date falls inside 30 days. The notice deadline is the date
   that actually costs money: miss it and an auto-renewing contract renews whether
   you wanted it to or not.
2. **Auto-renews** contracts marked `autoRenew` when they pass their end date,
   rolling the term forward by the renewal term.
3. **Expires** contracts that reached their end date without renewal.

Reminders are stamped, so a daily ticker nags **once**, not every day — the
fastest way to make people ignore a renewal alert is to send it thirty times.
Changing the end date re-arms the reminders. The same pass closes out signature
envelopes that ran past their expiry. `CLM_SCHEDULER=off` disables it; the
approval hook stays wired either way.

## 6. How this connects to the rest of the product

- **Reporting** — `contracts` is a dataset (admin-only): value, status, renewal
  dates, auto-renew. Renewal exposure is the report finance teams ask for first.
- **Public API** — `contracts` (read/write, status read-only) and `documents`
  (metadata only, never file bytes) under the `contracts:*` / `documents:read`
  scopes, with the usual webhook events.
- **Compliance** — signer identities are a governance category. A signing party is
  a **data subject** even if they were never an employee or a CRM contact, so
  subject lookup finds them. Erasure **anonymizes** their signer rows: the
  signature evidence survives, the identity doesn't (name → `[redacted]`, email →
  a per-row tombstone, IP and user agent cleared). The audit trail and contract
  timeline are kept indefinitely by default — they're what prove a signature
  happened.
- **Approvals & automation** — contracts route through the existing engines.

## 7. Operating notes

- Uploaded files are served from `/api/uploads/<key>` as static objects, which is
  what lets a counterparty read the document before signing. Keys are
  unguessable, but they are **not** access-controlled — treat the object store as
  "anyone with the URL". Put it behind signed URLs before storing genuinely
  restricted material.
- `APP_URL` (or `FRONTEND_URL`) must be set correctly in production: it's what the
  signing links point at.
- `SIGN_RATE_LIMIT_PER_MIN` tunes the signing portal's per-IP limit (default 30).
- Signature envelopes and their audit trail are never updated or deleted by the
  app; cancelling revokes tokens rather than removing history.
