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

## Formerly canned — now wired (July 2026)

| Endpoint(s) | Now |
|---|---|
| CRM cadences | persisted (`CrmSequence`), create + list from the Cadences page |
| CRM Einstein AI | strategy questions answered with **live pipeline numbers**; data questions delegated to the assistant module (uses `AI_BACKEND` when a key is set); AI actions land on the audit trail |
| Deal insights summary | composed from real deals (largest open deal, stalled count, win rate) |
| Partner board voting | persisted (`CrmResolution` + one-ballot-per-user votes, 3-vote quorum auto-approves); starter resolutions seeded per tenant |
| Sales playbooks | persisted (`CrmPlaybook`); run increments a counter + lastRunAt |
| CRM integrations page | list/health from the real Account → Integrations connections; timeline from the email log + connection usage |
| Lead sources | real `source` column on leads (picker in the New Lead form), grouped server-side |
| Notification preferences | persisted per user (`NotificationPref`) with sane defaults |
| Security → SSO/SAML toggle | hidden (backend no longer advertises it); genuine roadmap item |

## Graceful degradation (intentional, keyed on env)

- **Stripe absent** → billing runs in free early-access mode; invoices/cards empty.
- **Resend absent** → emails are recorded in `EmailLog` as `skipped`, never fail.
- **AI keys absent** → assistant uses the `fallback` backend.
