# ExecUI Public API & Outbound Webhooks

Other systems can read and write your ExecUI data over a versioned REST API, and
be notified with signed callbacks whenever that data changes.

Manage credentials in **Account → Developer** (admin only). The machine-readable
contract lives at **`GET /api/v1/openapi.json`** (public, no auth).

---

## 1. Authentication

Create a scoped token in Account → Developer, then send it as a bearer token:

```bash
curl https://your-execui-host/api/v1/contacts \
  -H "Authorization: Bearer execui_live_xxxxxxxxxxxxxxxxxxxx"
```

- The plaintext token is shown **once**. Only a SHA-256 hash is stored, so it
  cannot be recovered — if it's lost, revoke it and issue another.
- A token belongs to one organization. It can only ever read or write that
  organization's data.
- Tokens can be given an expiry, and revoked instantly at any time.
- `GET /api/v1/me` introspects the presenting token without touching business data.

### Scopes

Grant only what an integration needs — a read-only token can never write.

| Scope | Grants |
|---|---|
| `crm:read` / `crm:write` | Contacts, opportunities, tasks, tickets |
| `marketing:read` / `marketing:write` | Campaigns |
| `services:read` / `services:write` | Projects, team tasks, transactions |
| `network:read` / `network:write` | Devices, alerts |
| `people:read` | Employee directory (read-only — staff PII is never writable over the API) |
| `reports:read` | List and run saved reports |
| `webhooks:manage` | Manage webhook endpoints |

---

## 2. Resources

`GET /api/v1` lists exactly what the presenting token can reach.

| Resource | Path | Scope |
|---|---|---|
| Contacts | `/api/v1/contacts` | `crm` |
| Opportunities | `/api/v1/opportunities` | `crm` |
| CRM tasks | `/api/v1/tasks` | `crm` |
| Support tickets | `/api/v1/tickets` | `crm` |
| Campaigns | `/api/v1/campaigns` | `marketing` |
| Projects | `/api/v1/projects` | `services` |
| Team tasks | `/api/v1/team-tasks` | `services` |
| Transactions | `/api/v1/transactions` | `services` |
| Network devices | `/api/v1/devices` | `network` |
| Network alerts | `/api/v1/alerts` | `network` |
| Employees *(read-only)* | `/api/v1/employees` | `people` |

Each supports `GET` (list), `GET /:id`, and — unless read-only — `POST`,
`PATCH /:id`, `DELETE /:id`.

### Listing, filtering, paging

```bash
# Open, high-priority tickets created this month, newest first
curl "https://host/api/v1/tickets?status=open&priority=high,urgent\
&created_after=2026-07-01T00:00:00Z&sort=-createdAt&limit=50&offset=0" \
  -H "Authorization: Bearer $EXECUI_TOKEN"
```

- Any *filterable* field can be matched exactly; comma-separate values for an OR match.
- `created_after` / `created_before` take ISO-8601 timestamps.
- `sort=field` ascending, `sort=-field` descending.
- `limit` (default 50, max 200) and `offset`.

```json
{ "object": "list", "data": [ … ], "total": 214, "limit": 50, "offset": 0, "has_more": true }
```

### Writing

```bash
curl -X POST https://host/api/v1/contacts \
  -H "Authorization: Bearer $EXECUI_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Acme Corp","email":"hello@acme.com"}'
```

Only fields declared writable are accepted. Unknown, read-only or internal
fields (`id`, `tenantId`, timestamps) are **rejected** rather than ignored, so a
typo fails loudly instead of silently doing nothing.

### Errors

Every error uses the same envelope:

```json
{ "error": { "code": "insufficient_scope", "message": "…", "required": ["crm:write"], "granted": ["crm:read"] } }
```

| Status | Code | Meaning |
|---|---|---|
| 400 | `invalid_request` | Validation failed — the message names the field |
| 401 | `unauthorized` / `invalid_token` | Missing, malformed, revoked or expired token |
| 403 | `insufficient_scope` | Token lacks the scope |
| 404 | `not_found` | No such record or endpoint |
| 405 | `read_only` | Resource cannot be written |
| 409 | `conflict` | Violates a uniqueness constraint |
| 429 | `rate_limited` | Too many requests |

### Rate limits

120 requests/minute per token by default (`API_RATE_LIMIT_PER_MIN`). Limits are
keyed on the **token**, so one customer's integration can't exhaust another's
budget from a shared IP. Standard `RateLimit-*` headers are returned.

---

## 3. Outbound webhooks

Register an endpoint (Account → Developer, or `POST /api/v1/webhooks`) and
subscribe to events — `["*"]` for all.

Event types are `<resource>.created`, `<resource>.updated`, `<resource>.deleted`
(e.g. `opportunities.updated`). `GET /api/v1` lists them all.

**Events fire wherever the change came from** — the public API, the ExecUI web
app, or a background job — because they're captured at the data layer, not in
the API handler. If someone closes a deal in the UI, your system hears about it.

### Payload

```json
{
  "id": "d3f1…",                      // delivery id (idempotency key)
  "type": "opportunities.updated",
  "resource": "opportunities",
  "action": "updated",
  "created": "2026-07-29T17:41:02.881Z",
  "data": { "id": "…", "name": "Acme renewal", "stage": "closed_won", "value": 48000 }
}
```

`data` contains exactly the fields the public API exposes for that resource —
internal columns are never included.

### Verifying the signature

Each request carries `X-ExecUI-Signature: t=<unix>,v1=<hex>`, an HMAC-SHA256 of
`"{timestamp}.{raw body}"` using your endpoint's signing secret. **Verify it
against the raw body before parsing**, and reject old timestamps to stop replays:

```js
import crypto from "crypto";

function verify(secret, rawBody, header, toleranceSec = 300) {
  const parts = Object.fromEntries(header.split(",").map(p => p.split("=")));
  const t = Number(parts.t);
  if (!t || !parts.v1) return false;
  if (Math.abs(Date.now() / 1000 - t) > toleranceSec) return false;   // replay window
  const expected = crypto.createHmac("sha256", secret)
    .update(`${t}.${rawBody}`).digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(parts.v1, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);       // constant time
}
```

Other headers: `X-ExecUI-Event`, `X-ExecUI-Delivery`, `X-ExecUI-Timestamp`.

### Delivery, retries and failure handling

- Respond **2xx** to acknowledge. Anything else (or a >10s timeout) is a failure.
- Failures retry **6 times with exponential backoff** — 1m, 5m, 30m, 2h, 6h, 24h
  (~32 hours total), then the delivery is marked `failed`.
- After **15 consecutive failures** an endpoint is auto-disabled so a dead
  receiver isn't hammered. Re-enabling it clears the counter.
- Every attempt is logged with status, response code and error, viewable in
  Account → Developer → Deliveries, where any delivery can be **replayed**.
- **Send a test event** from the console to verify your receiver end to end.
- Deliveries carry a stable `id` — use it to make your handler idempotent, since
  a retry after a timeout can deliver the same event twice.

### Endpoint requirements

- Must be **HTTPS** and publicly reachable. Private, loopback and link-local
  addresses (including cloud metadata endpoints like `169.254.169.254`) are
  rejected to prevent SSRF. `WEBHOOK_ALLOW_PRIVATE=true` relaxes this for local
  development only.
- Redirects are **not followed** — the target must respond directly.
- Rotate a signing secret at any time; the new one is shown once.

---

## 4. Operating notes

- The delivery worker runs in-process every 30s and claims work conditionally, so
  running multiple instances will not double-send. `WEBHOOK_WORKER=off` disables
  it; at larger scale move `deliverPending()` behind a real job queue.
- **Bulk operations** (`updateMany` / `deleteMany`) do not emit events — they
  return counts, not records, so there is no payload to send. Per-record writes
  (which is what the API and UI perform) always do.
- Environment: `API_RATE_LIMIT_PER_MIN`, `WEBHOOK_TIMEOUT_MS`,
  `WEBHOOK_ALLOW_PRIVATE`, `WEBHOOK_WORKER`, `APP_URL` (used for the OpenAPI
  server URL).

## 5. Adding a resource

Add an entry to `backend/src/modules/api/api.resources.js` naming the Prisma
model, the guarding scope, and each field's type and `writable`/`required` flags.
CRUD routes, validation, serialization, webhook events and the OpenAPI document
all derive from it — so a new resource is one registry entry, and a field is only
ever exposed because someone deliberately listed it.
