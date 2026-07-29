# Compliance & Data Governance

Self-serve tooling for the three things a customer's legal team will ask about:

| Capability | What it answers |
|---|---|
| **Data-subject requests** | "Show me / delete everything you hold about this person." (GDPR Art. 15 & 17) |
| **Retention policies** | "How long do you keep our data, and who enforces that?" |
| **Legal holds** | "Can you freeze records while we're in litigation?" |

Find it at **Account → Compliance** (admin only).

---

## 1. What personal data is held

Every category is declared once in
`backend/src/modules/governance/governance.registry.js`, and that single
declaration drives export, erasure *and* retention. A privacy answer you can
only produce by grepping the codebase isn't one you can defend to a regulator —
so there is exactly one place to look.

| Category | Links to a person by | On erasure |
|---|---|---|
| Employee profile | the user record itself | **anonymized** |
| CRM contacts | email | deleted |
| Audit logs | user id | **anonymized** |
| Login sessions | user id | deleted |
| Notifications | user id | deleted |
| Email logs | recipient email | **anonymized** |
| Direct messages | sender id | **anonymized** |
| Reward activity | user id | deleted |
| Approval decisions | user id | **anonymized** |
| Webhook deliveries | — (retention only) | — |
| Automation run history | — (retention only) | — |
| Social follower snapshots | — (retention only) | — |

### Why some categories are anonymized rather than deleted

Audit logs, approval decisions, email logs and the employee record itself are
**stripped of identifying data but kept**. Three reasons:

- An audit trail with holes is worthless as evidence — including as evidence that
  you honored the erasure request.
- Approval history has to remain reconstructable: "who signed off on this
  $2M discount" can't become unanswerable because someone left.
- The employee row anchors ownership of deals, tickets and projects. Deleting it
  would orphan business records that legitimately belong to the company, not the
  individual.

What actually happens to an erased employee: name → `[redacted]`, email → a
unique per-row tombstone (`erased-<id>@deleted.invalid`, because the column is
`NOT NULL UNIQUE`), phone/avatar/job title/employee id → null, **password hash
and MFA secret destroyed**, account deactivated, status → `erased`.

---

## 2. Data-subject requests

1. **Look up** the person by email. The system reports whether they're an
   employee, a CRM contact, or both.
2. **Export** produces a portable JSON bundle, category by category, containing
   only registry-declared fields — so it can't accidentally include an internal
   column, and can't silently miss a category either. It downloads immediately
   and is retained so you can re-download it later.
3. **Erase** deletes or anonymizes per the table above, and reports exactly what
   it did to each category.

**Everything is recorded permanently** — exports, erasures, *and blocked
attempts with the reason they were blocked*. Being able to evidence how a request
was handled is most of what compliance actually is.

Secrets (`passwordHash`, `mfaSecret`, tokens) and `tenantId` are never included
in an export; a test enforces that.

---

## 3. Retention policies

Set a window per category and choose **delete** or **anonymize**. Policies run
**automatically once a day**, and unconfigured categories are surfaced in the UI
with a recommended default rather than sitting invisible.

Recommended defaults ship in the registry — e.g. webhook deliveries **30 days**
(payloads can carry customer data, so a delivery log shouldn't quietly become a
shadow data store), sessions and notifications 90, audit logs 730.

**Preview before you trust it.** The console shows a live count of rows currently
past retention for each policy, and **Run now** applies everything immediately.

---

## 4. Legal holds

A hold freezes data against erasure and retention purging. Two scopes:

- **A person** — by email. Any erasure request for them is **refused** while the
  hold is active (and the refusal is recorded).
- **A data category** — retention purging skips that category entirely rather
  than partially purging it.

**A hold always beats a deletion request.** Releasing a hold makes the data
eligible again and records who released it and when.

---

## 5. Operating notes

- The retention ticker runs daily, iterating tenants and entering each one's
  context so purges are scoped by the tenant guard rather than hand-written
  filters. `RETENTION_SCHEDULER=off` disables it.
- Erasure and anonymizing purges write row-by-row (values can depend on the row,
  like the email tombstone), so a very large purge is deliberately steady rather
  than one giant statement.
- All governance routes are **admin-only** — exporting or erasing a person's data
  and changing retention are acts with legal weight.
- Tenant deletion already cascades to every tenant-scoped table, so removing an
  organization removes its data outright.

## 6. Adding a category

Add an entry to the registry: the Prisma model, its date field, how it links to a
person (`userId` / `email` / `self`, or `null` for retention-only), whether
erasure deletes or anonymizes, and which fields to redact. Export, erasure,
retention and the console all pick it up. Because the registry is the whitelist,
exposing a field to a data subject is always a deliberate act.
