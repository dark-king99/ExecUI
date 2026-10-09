# Tenancy: per-organization configuration & deletion

Two capabilities that both hang off the `Tenant` row: what an organization can
**configure** about itself, and what happens when it **leaves**.

---

## 1. Per-tenant settings

Every org-level option used to become another column on `Tenant` — `plan`,
`planSolutions`, `industry`, `networkProfile` — so each new one cost a migration
and every consumer had to know where to look.

Settings now live in `TenantSetting`, one row per `(tenantId, key)`, declared in
[`backend/src/modules/settings/settings.registry.js`](../backend/src/modules/settings/settings.registry.js):

| Field | Meaning |
| --- | --- |
| `key` | Stable identifier and the DB key. **Never rename one in place** — stored rows are keyed by it. |
| `group` | How the admin UI clusters it. |
| `type` | `string` · `color` · `email` · `url` · `boolean` |
| `default` | What a tenant that has never set it gets. |
| `entitlement` | Plan flag required to **set** it (`null` = any plan). |
| `public` | May be read with **no session at all**. |
| `max` | Length cap for strings. |
| `describe` | One line, shown beside the field in the admin UI. |

Adding a setting is a registry entry. The storage, validation, defaulting, plan
gating, admin UI field and API shape all follow from it.

### `public: true` is the sharp edge

Public values are served by the customer portal and the signing page, which have
no session by design — so **anyone who knows an organization's slug can read
them**. Only put things there that are already public by nature: the name and
logo an organization *wants* shown to its own customers. Never a value that
reveals how the org is configured internally.

`settings.test.mjs` asserts the exact public key list, so widening it is a
deliberate act that shows up in a diff.

### API

| Method | Path | Who |
| --- | --- | --- |
| `GET` | `/api/organization/settings` | enterprise admin |
| `PUT` | `/api/organization/settings` | enterprise admin |
| `GET` | `/api/organization/branding` | any signed-in user (the app shell reads it) |
| `POST` | `/api/organization/branding/logo` | enterprise admin (multipart) |

`PUT` validates **every** key before storing **any** of them, so a request with
one bad field changes nothing at all.

---

## 2. White-labelling

Branding is the settings store's first consumer, and an **Enterprise/Executive**
entitlement — gated exactly like SSO.

| Setting | Effect |
| --- | --- |
| `branding.productName` | Replaces "ExecUI" in portals and outbound mail. |
| `branding.logoUrl` | App sidebar and customer-facing pages. |
| `branding.primaryColor` | Accent on customer-facing pages. |
| `branding.supportEmail` | Shown to customers as the way to reach the org. |
| `branding.hidePoweredBy` | Removes the platform credit from the portals. |
| `branding.emailFromName` | Display name on outbound mail (**not** public). |

### Two rules that make plan changes behave

1. **Reads never fail on entitlement.** A tenant that set a logo on Enterprise
   and downgraded still has that row; it simply stops being *applied*.
   `brandingFor()` resolves the plan first and returns platform defaults
   otherwise — so a downgrade takes effect everywhere at once without deleting
   anything the customer gets back by upgrading. (Note the consequence:
   "Powered by ExecUI" **returns** on a downgrade.)
2. **Writes are the only place entitlement is enforced**, per setting, because
   the registry gates individual keys rather than the group.

### What is and isn't branded

Branded — surfaces belonging to the **tenant**:

- The customer support portal (`/portal/:slug`) — header logo, name, support
  address, footer credit.
- The signing page (`/sign/:token`) — a counterparty signing Acme's contract
  sees Acme's page.
- The in-app sidebar logo, falling back to the animated wordmark when no logo is
  set or the plan doesn't include branding.
- Invite email, the Executive Overview report email, the payroll bank file note,
  and the DSAR export notice.

**Not** branded — surfaces belonging to **us**:

- Billing-provider product names. The tenant is buying ExecUI; a white-label
  invoice would be a lie.
- The public API, OpenAPI document and SCIM service documents. Those describe
  *this* product to integrators.

### Email sending

Only the **display name** is per-tenant. The sending address stays on the
platform's verified domain (`RESEND_FROM`), because mail from a domain we
haven't proven we own lands in spam. Giving a tenant their own sending address
requires verifying their domain with the mail provider first — a separate piece
of work, not done here.

The display name is tenant-supplied and therefore stripped of `" \ < > , ; :`
and CR/LF before use: without that, a name could append a second address or a
whole extra header.

---

## 3. Deleting an organization

`DELETE FROM "Tenant"` now removes the organization from all ~96 tenant-scoped
tables in one statement. Because that is true, everything around it exists to
make sure it only happens deliberately.

### The cascade

Migration `20260731090000_tenant_deletion_cascade` adds `ON DELETE CASCADE` to
the 36 tenant foreign keys that predated the convention (`User`, `Role`,
`Contact`, and the CRM / marketing / network / business-services tables). The
other 50 already had it.

`tenants.test.mjs` asserts from the Prisma DMMF that **no** tenant-scoped model
is missing it, so a new model that forgets fails the suite rather than surfacing
years later as a failed deletion.

**One subtlety worth knowing.** Eight tables still reference `User` with
`RESTRICT`. The cascade deletes both those rows and the `User` rows, but
Postgres fires referential actions in constraint order and RESTRICT is checked
immediately — so success would otherwise depend on which trigger happens to run
first. `purgeTenant` clears those tables explicitly before deleting the tenant
row, removing the ordering dependency. The list is derived from the schema
(`USER_RESTRICTED_MODELS`), so a new model can't quietly reintroduce the problem.

### The guards

1. **Typed confirmation.** The caller retypes the organization's exact name
   (case and surrounding whitespace forgiven, nothing else). Not a checkbox.
2. **Legal holds refuse.** An active hold blocks the request outright, and is
   checked **again at purge time** — a hold placed *during* the grace window
   must still win, or the guarantee is worthless.
3. **A grace window.** `TENANT_DELETION_GRACE_DAYS` (default **30**). The
   request only schedules; `tenants.scheduler.js` carries it out later. Any
   admin can cancel until then.
4. **An export first.** `GET /api/organization/deletion/export` returns
   everything the governance registry declares the org holds — registry-declared
   fields only, so credentials can't leak into it.

No route destroys anything. `purgeTenant` is reachable only from the scheduler,
and refuses if the window hasn't elapsed — so no request, replayed or forged,
can skip it.

### API

| Method | Path | Effect |
| --- | --- | --- |
| `GET` | `/api/organization/deletion` | Status + any blocking holds |
| `GET` | `/api/organization/deletion/preview` | Row counts per table — what would be destroyed |
| `GET` | `/api/organization/deletion/export` | Pre-deletion JSON bundle |
| `POST` | `/api/organization/deletion` | Schedule (requires `confirmName`) |
| `DELETE` | `/api/organization/deletion` | Cancel |

All enterprise-admin only. The UI lives in **Account → Organization**.

### Configuration

| Variable | Default | Meaning |
| --- | --- | --- |
| `TENANT_DELETION_GRACE_DAYS` | `30` | Days between request and purge |
| `TENANT_PURGE_INTERVAL_HOURS` | `24` | How often the scheduler sweeps |

The scheduler deliberately does **not** run on boot: a deploy shouldn't be the
thing that destroys an organization. The first sweep is one interval in, and a
tenant whose window elapsed while the server was down is picked up on the next
tick.

### Recovering from a mistake

Before the window elapses: cancel, in the UI or via `DELETE`. After the purge:
restore from backup (`PRODUCTION_READINESS.md` §4). The grace window exists
precisely so that the second sentence is rarely needed.
