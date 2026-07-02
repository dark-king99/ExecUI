# Data status — real vs. placeholder, per module

Grounded audit of what each surface actually serves (checked against the
backend services, July 2026). "Real" = tenant-scoped Prisma queries.

## Fully real (database-backed, tenant-scoped)

| Area | Notes |
|---|---|
| Auth, sessions, 2FA, audit logs | bcrypt + TOTP + UserSession/AuditLog tables |
| Users & team management | invite (email via Resend), roles, status, employee IDs |
| Executive Overview | KPIs/gauge/panels aggregate live CRM/Marketing/Network/Services data |
| CRM — leads, opportunities, deals, tasks, tickets, follow-ups, customers, forecasting & analytics rollups | leads are early-stage opportunities; convert promotes them into the pipeline |
| Marketing — campaigns, audiences, experiments, todos, schedule, dashboards | |
| Network — devices, servers, alerts, incidents, changes, backups, firewall rules, restrictions, automation jobs | heaviest Prisma usage in the app |
| Services — transactions, tax plans, investments, SOPs, workflows, goals, projects, tasks, clients, members | feeds the Overview task workflow |
| Messaging, notifications (incl. SSE stream), email log | |
| Billing — plan/entitlements always real; subscription/invoices/cards real **when `STRIPE_SECRET_KEY` is set**, empty demo lists otherwise (by design) | |
| Integrations secret store | AES-256-GCM at rest |
| Analytics module | rollups over the real CRM/network/services tables |

## Canned / empty responses (honest stubs — decide: wire or remove)

| Endpoint(s) | Behavior today | Suggested path |
|---|---|---|
| CRM cadences (`listSequences`, create) | returns `[]` / echoes input | needs a `CrmSequence` model if the Cadences page should persist |
| CRM Einstein AI (`aiSummaries`, `aiAction`, copilot reply) | canned strings | wire to the assistant module (`AI_BACKEND`) |
| Partner board voting (`listResolutions`, `voteResolution`) | `[]` / fake success | needs a `Resolution` model |
| Sales playbooks (`listPlaybooks`, `runPlaybook`, create) | `[]` / fake success | model or remove page |
| CRM integrations timeline (`listIntegrations`, `getIntegrationsTimeline`) | `[]` | point at the real Account → Integrations connections |
| Lead sources (`getLeadSources`) | `[]` | derive from lead `source` field once captured |
| Account → notification **preferences** | static `{email:true,…}`, not persisted | small `NotificationPref` table (delivery itself is real) |
| Security → SSO/SAML toggle | display-only | roadmap item; hide until built |

## Graceful degradation (intentional, keyed on env)

- **Stripe absent** → billing runs in free early-access mode; invoices/cards empty.
- **Resend absent** → emails are recorded in `EmailLog` as `skipped`, never fail.
- **AI keys absent** → assistant uses the `fallback` backend.
