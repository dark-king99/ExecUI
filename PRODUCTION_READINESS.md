# Production Readiness

Status of ExecUI against the launch checklist. Legend: **✅ in place** · **⚠️ partial / planned** · **📋 policy + runbook**.
Cross-refs: [`SECURITY.md`](./SECURITY.md) (secret rotation), [`docs/DATA-STATUS.md`](./docs/DATA-STATUS.md), [`deployment.yaml`](./deployment.yaml), [`docker-compose.yml`](./docker-compose.yml).

| # | Area | Status |
|---|------|--------|
| 1 | Input sanitization & injection prevention | ✅ |
| 2 | Error handling & graceful degradation | ✅ |
| 3 | Caching strategy & invalidation | ✅ |
| 4 | Disaster recovery | 📋 |
| 5 | Health checks | ✅ |
| 6 | Accessibility | ⚠️ |
| 7 | Rate limiting & abuse prevention | ✅ |
| 8 | PII handling, retention & deletion | ✅ |
| 9 | Load & stress testing | ✅ (tooling) |
| 10 | Regression tests & CI | ✅ |
| 11 | RTO / RPO | 📋 |
| 12 | HTTPS / TLS / cert rotation | 📋 |
| 13 | Code review process & standard | ✅ |

---

## 1. Input sanitization & injection prevention — ✅
- **Validation:** request bodies validated with **zod** schemas (`*.schema.js`, `middleware/validate`). Reject on shape/size before any handler runs.
- **SQL injection:** all DB access is **Prisma** (parameterized). The only raw SQL is a literal `SELECT 1` health probe — no interpolation anywhere.
- **XSS:** React escapes by default; **zero `dangerouslySetInnerHTML`** in the app. Outbound HTML emails are server-built from escaped values.
- **Hardening middleware** (`middleware/hardening.middleware.js`): `sanitizeInput` blocks prototype-pollution keys (`__proto__`, etc.) and oversized payloads; `enforceJsonContentType`; JSON/urlencoded body cap **200 KB**.
- **Tenant isolation:** every tenant-scoped query is auto-filtered by the Prisma tenant guard (`lib/tenantContext`) — verified by cross-tenant tests.
- **Secrets:** at rest via `SECRETS_KEY` (AES-GCM, `lib/secrets`); passwords bcrypt; social/integration tokens, SSO client secrets, SP private keys, and **employee government ids + bank account numbers** encrypted. `SECRETS_KEY` must be stable in production — rotating it without re-encrypting makes the payroll bank export fail loudly rather than silently paying a wrong account.
- **Federated identity** (see [`docs/SSO.md`](./docs/SSO.md)): SAML assertions are signature/audience/timestamp-verified via `@node-saml/node-saml` (no hand-rolled XML-DSig); OIDC uses PKCE + `state` + `nonce` with JWKS signature verification and rejects `alg:none`/HMAC. SSO login requests and handoff codes are single-use and short-lived, so no session token ever travels in a URL. SCIM bearer tokens are stored only as SHA-256 hashes and are bound to a single tenant.

## 2. Error handling & graceful degradation — ✅
- **Central handler** (`middleware/error.middleware.js`): 5xx never leak stack/internals to clients (generic message + `requestId`; stack goes to logs only). 4xx return the caller-facing message.
- **Stay-up:** `uncaughtException` / `unhandledRejection` are logged, not fatal (`server.js`). DB connect **auto-retries** with backoff; migrations applied on boot but non-fatal if the CLI is unavailable.
- **Provider fallbacks (honest degradation):** AI, email (Resend), Stripe and social publishing all run in a **clearly-labelled simulated mode** when their keys aren't set — the app is fully usable and never errors on a missing integration.
- **Frontend:** `useApi` exposes `{loading,error}` states; `friendlyError()` maps statuses to clean copy (never raw HTML); Error Boundaries wrap route trees; 401 triggers a clean session expiry.

## 3. Caching strategy & invalidation — ✅
- **Client query cache** (`hooks/useApi`): in-memory `queryCache` keyed per query; `invalidateQueries()` + a cross-page **invalidation bus**; `useDataSync` refetches on window focus and after mutations, so a write on one page refreshes dependent reads elsewhere.
- **Polling:** dashboards use `pollingInterval` for near-live data without hammering the API.
- **HTTP:** static assets served `immutable, maxAge 7d`; `compression` (gzip) on all responses.
- **Server cache:** intentionally **stateless** today (rate limiter and query results are in-process). **When scaling to multiple instances, move the rate limiter and any shared cache to Redis** (noted in `deployment.yaml`). Invalidation there is TTL + explicit key busting on write.

## 4. Disaster recovery — 📋
**Backups**
- Postgres: nightly `pg_dump` (full) + WAL archiving for point-in-time recovery. Store off-host (object storage), encrypted, **retain 30 days**.
- Uploads volume (`STORAGE_ROOT`): snapshot with the same cadence.
- Config/secrets: kept in the deployment secret store (not in backups); recovery uses the rotation runbook in `SECURITY.md`.

**Restore procedure**
1. Provision Postgres + PVC from `deployment.yaml`.
2. `pg_restore` the latest good dump (or PITR to just before the incident).
3. Restore the uploads snapshot.
4. Deploy the app image at the matching git SHA; `prisma migrate deploy` runs on boot.
5. Verify `/api/health/ready` is green and smoke-test login + one write.

**Test cadence:** rehearse a full restore into a scratch namespace **quarterly**; record the measured RTO.

## 5. Health checks — ✅
- `GET /health/live` (+ `/api/health/live`) — **liveness**, always fast, never rate-limited.
- `GET /health` · `/health/ready` · `/api/health` — **readiness**: pings the DB with a 2s timeout; returns non-200 when the DB is unreachable so orchestrators stop routing traffic.
- Wired into `docker-compose.yml` `healthcheck` and intended for k8s liveness/readiness probes.

## 6. Accessibility — ⚠️ (baseline in place; audit planned)
In place: semantic landmarks, keyboard-focusable controls with visible focus rings, `aria-hidden` on decorative/animated layers, `aria-label` on icon-only and animated text, `prefers-reduced-motion` honored (hero title, ambient background, logo), theme-aware contrast (light/dark).
**Next pass (tracked):** run **axe / Lighthouse** on every route; fix color-contrast edge cases; ensure all modals trap focus and restore it; label every form field + error with `aria-describedby`; verify the CRM/Marketing/Network launchers are fully operable by keyboard and screen reader. Target: **WCAG 2.1 AA**.

## 7. Rate limiting & abuse prevention — ✅
- **Global** per-IP limiter (600/min default, env `RATE_LIMIT_PER_MIN`); health checks exempt.
- **Auth-specific** stricter limits on login/signup (`middleware/ratelimit.middleware.js`, ~5/min, keyed by IP **and** attempted email so one IP can't lock out everyone).
- **Overload protection:** `concurrencyLimiter` (max in-flight, sheds load with 503 before the event loop drowns) + `requestTimeout` (25s) + body-size caps.
- `trust proxy` set so limits key on the real client IP behind the ingress.
- **Visitor-facing portals** carry their own tighter limits, and are the only unauthenticated write surfaces: the **e-signature portal** (`/api/sign/:token`, 30/min, `SIGN_RATE_LIMIT_PER_MIN`) and the **customer support portal** (`/api/portal/:slug`, `PORTAL_LINK_LIMIT_PER_HOUR` 8 on the endpoint that sends email, `PORTAL_WRITE_LIMIT_PER_MIN` 12, `PORTAL_READ_LIMIT_PER_MIN` 120). Both authorize on a 256-bit token stored only as a SHA-256 hash; both are single-use and expiring. Requesting a portal sign-in link returns an identical response whether or not the address is known, so it can't be used to enumerate customers.
- **Global search** is limited per user (`SEARCH_RATE_LIMIT_PER_MIN`, default 120) so type-ahead can't be used to enumerate records.
- **CORS** now restricted via `CORS_ORIGINS` allowlist (unset ⇒ same-origin reflect for dev). Auth uses bearer tokens (no cookies) ⇒ no CSRF surface.
> Single-instance limiter is in-process; **move to a Redis store before horizontal scaling.**

## 8. PII handling, retention & deletion — ✅
**PII inventory:** user name, email, phone, job title, avatar; tenant/company; audit logs; billing customer id (Stripe holds card data — we never store PANs); e-signature parties (name, email, IP, user agent); **HR/payroll** — employment record, date of birth, emergency contact, compensation history, payslips, leave and timesheets; **support** — customer email, ticket conversations, portal sign-in sessions (IP + browser) and article feedback. Social/integration tokens are encrypted at rest; e-signature access tokens are stored only as SHA-256 hashes; **government ids and bank account numbers are encrypted at rest (AES-256-GCM) and only ever returned as their last four digits — seeing one in full is a separate, audited action.**
**Handling:** passwords bcrypt; secrets/tokens AES-GCM; PII never logged (logs carry `reqId`, not payloads); TLS in transit (§12).
**Deletion:**
- Employee removal → `DELETE /users/admin/users/:id` (hard delete + audit entry).
- Org/tenant deletion: **✅ complete.** Every tenant relation now declares `onDelete: Cascade`, so removing a `Tenant` row removes the organization from all ~96 tenant-scoped tables. It is deliberately not a single call: an admin retypes the organization's name, an active **legal hold refuses the request outright**, and the purge runs from a scheduler only after a **30-day grace window** (`TENANT_DELETION_GRACE_DAYS`) during which any admin can cancel. Holds are re-checked at purge time, so one placed *during* the window still wins. A full pre-deletion export, built from the same governance registry, is available throughout. See [`docs/TENANCY.md`](./docs/TENANCY.md).
**Retention — automated.** Configurable per data category in **Account → Compliance**, applied by a daily job. Each category declares a recommended default (webhook deliveries 30d, sessions/notifications/email logs 90d, audit logs 730d) and whether expiry **deletes** or **anonymizes**. A live preview shows what a policy would remove before it runs. See [`docs/COMPLIANCE.md`](./docs/COMPLIANCE.md).
**Data-subject requests — self-serve.** Export (Art. 15) produces a portable JSON bundle of every category held about a person; erasure (Art. 17) deletes or anonymizes per category. Audit logs, approval decisions, email logs and the employee row are **anonymized rather than deleted** so evidence and record ownership survive; credentials and MFA secrets are destroyed. Every request — including blocked ones and why — is recorded permanently.
**Legal holds.** A hold on a person or a data category freezes it against erasure and purging, and always beats a deletion request.
**Signing counterparties.** People who sign a document are data subjects too, even when they were never employees or CRM contacts — subject lookup finds them by email. Erasure **anonymizes** their signer rows (name redacted, email replaced with a per-row tombstone, IP and user agent cleared) so the *signature evidence* survives while the identity does not. The signing audit trail and contract timeline are retained indefinitely by default: they are what prove a signature happened. See [`docs/DOCUMENTS.md`](./docs/DOCUMENTS.md).
**Support customers.** A customer who contacted support is a data subject even though they have no account: subject lookup finds them by email. Erasure **redacts their messages** while keeping the thread so the ticket still makes sense, **deletes** their portal sessions and sign-in links outright, and keeps an article's helpful/not-helpful vote while dropping the comment and address. Portal sessions default to 30-day retention and are purged hourly once expired. See [`docs/HELPDESK.md`](./docs/HELPDESK.md).
**Employees & payroll.** Erasure anonymizes the employment record so payroll history stays valid, while **destroying the encrypted government ids and bank details** and clearing date of birth and emergency contacts. Leave *reasons* are redacted (they can be health data) even though the absence itself is kept. Payslips, compensation history and the employment timeline default to **indefinite retention** because payroll is commonly a statutory record (often 3–7 years) — check local law before purging. See [`docs/HR.md`](./docs/HR.md).
**Data-subject requests:** export = the tenant's own data via existing list endpoints; erasure = tenant/user delete above.
**Product analytics:** optional, off unless PostHog keys are set (see [`docs/ANALYTICS.md`](./docs/ANALYTICS.md)). Sends only ids/role/plan (no names/emails unless explicitly enabled), respects Do-Not-Track + opt-out, and masks all inputs in session replay. Backend error events carry route/status/ids only — never request bodies.

## 9. Load & stress testing — ✅ (tooling shipped)
- `backend/scripts/loadtest.mjs` — zero-dep concurrent load tool: throughput, p50/p95/p99, error rate, 429 count; non-zero exit on >1% hard errors (CI-gate friendly).
- **Method:** ramp concurrency until p95 latency or error rate climbs to find the safe ceiling; confirm the rate limiter returns 429 (not 5xx) and the concurrency limiter sheds with 503 under overload.
- Example: `node scripts/loadtest.mjs --url http://localhost:5555/api/health -c 100 -d 30`.
- **Before GA:** run against staging on production-sized data; set autoscaling/HPA thresholds from the observed knee.

## 10. Regression tests & CI — ✅
- `backend/test/*.mjs` (node:test) cover plan entitlements/pricing, tenant isolation, and core services; run with `npm test`.
- **CI** (`.github/workflows/ci.yml`): on every PR/push — backend lint+test **against a real Postgres service** (migrate deploy + test), frontend build. A red check should **block merge** (enable branch protection → require status checks).
- **Coverage plan:** add API integration tests per module and a small Playwright smoke suite (login → each section) so UI regressions are caught automatically.

## 11. RTO / RPO — 📋
- **RPO ≤ 15 min** — WAL archiving / PITR bounds data loss to the last archived segment; nightly full dumps are the floor.
- **RTO ≤ 1 hour** — restore procedure in §4 (provision → restore DB+uploads → deploy at SHA → verify). Stateless app + IaC keep rebuild fast.
- Both are **validated by the quarterly restore rehearsal** (§4); record actuals and tighten targets as infra matures.

## 12. HTTPS / TLS / certificate rotation — 📋
- **TLS terminates at the ingress / load balancer**; the app trusts `X-Forwarded-*` (`trust proxy`). Force HTTP→HTTPS redirect at the edge.
- **HSTS** already emitted by helmet (`maxAge 180d, includeSubDomains`); add `preload` once the apex is HTTPS-only.
- **Certificates:** managed LB certs **or** cert-manager + Let's Encrypt (ACME) with **auto-renew ~30 days before expiry**. Rotation is zero-downtime (edge reload). Alert on **<21 days to expiry**.
- Modern TLS only (1.2+/1.3), disable legacy ciphers at the edge. Outbound calls (Stripe/AI/Resend) verify the system CA bundle.

## 13. Code review process & standard — ✅
- **Every change via PR**; CI (§10) must be green; **≥1 approving review** for `main` (enable branch protection: require review + status checks + up-to-date branch).
- **`.github/PULL_REQUEST_TEMPLATE.md`** enforces the reviewer checklist: scope, correctness, security (validation/tenant-scope/authz/no PII in logs), migrations, tests, performance, a11y, docs.
- **Standards:** ESLint (`eslint.config.js`); small focused PRs; conventional, descriptive commit messages; secrets never committed (`SECURITY.md`); reversible migrations; no destructive default actions.

---

### Open follow-ups (prioritized)
1. ~~**Retention automation**~~ — **done**: per-category policies + daily purge + legal holds (`docs/COMPLIANCE.md`).
2. ~~**Tenant-deletion cascade**~~ — **done**: all 36 remaining tenant foreign keys now cascade, and organization deletion is a guarded, staged flow (typed-name confirmation → legal-hold refusal → 30-day grace window → scheduled purge). See [`docs/TENANCY.md`](./docs/TENANCY.md).
3. **Object-store access control** — uploaded files are served as static objects at `/api/uploads/<key>` (unguessable keys, but no authorization). This is what lets a signing counterparty read a document without an account; put it behind **signed, expiring URLs** before storing genuinely restricted material. See [`docs/DOCUMENTS.md`](./docs/DOCUMENTS.md) §7.
4. **Accessibility audit** — axe/Lighthouse sweep + fixes to WCAG 2.1 AA; focus-trap all modals.
5. **Redis** — shared rate-limit + cache store to unlock horizontal scaling.
6. **Test depth** — per-module API integration tests + a Playwright login→section smoke suite in CI.
7. **First DR rehearsal** — run the restore drill, record RTO/RPO actuals.
