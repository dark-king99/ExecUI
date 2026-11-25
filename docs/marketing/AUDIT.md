# Marketing module — Phase 1 audit and target architecture

Audited 2026-11-25 against the code on `claude/epic-heisenberg-9jec64`.
Classification letters follow the rebuild brief:
**A** fully functional · **B** persists, execution incomplete · **C** UI without
working backend · **D** fake/simulated · **E** CRM data relabelled as marketing ·
**F** no data architecture · **G** extendable rather than replaceable.

## 1. What exists

### Data models (Prisma)
| Model | Fields of note | Problems |
|---|---|---|
| `MarketingCampaign` | name, objective, channel, status, budget, spent, leads, clicks, opens, conversions, revenue, ctr, openRate, roi | Every metric is **typed in**; nothing increments them. No audience, content, schedule or delivery relation. |
| `MarketingAudience` | name, type, size, status | `size` is typed in; **no membership table**; no rules. |
| `MarketingExperiment` | variants (json), confidence, lift | Lift/confidence typed in; nothing measures them. |
| `SocialAccount` / `SocialPost` / `SocialEngagement` / `SocialFollowerSnapshot` | tokens encrypted; post results/metrics json | Publishing has **no live implementation** (see below). Engagement rows from the old sample generator are flagged `simulated`. |
| `MarketingTodo` / `MarketingScheduleEvent` / `MarketingActivity` | personal dashboard items | Fine (A) — personal productivity, not marketing execution. |
| *(none)* | journeys, automations, data sources, assets, commerce orders, identities, events, scores, attribution, recipes, personalization, sending domains, deliveries, consent | **F** — no tables. |

CRM `Contact` is minimal (`name`, `email`, `key`) — no company, location,
industry or lifecycle fields. Segmentation can only use what exists; richer
attributes need the CDP profile layer (§3.2), not a second CRM.

### Execution infrastructure available to extend (G)
- **Workflow engine** (`modules/workflows`): domain-event triggers on registry
  resources, conditions, actions (update/create record, notify, email,
  approval, post to chat), cycle guard, run log. No delays/branches/waits.
- **Domain events** (`lib/domainEvents.js`) emitted from the Prisma layer.
- **Schedulers**: `setInterval` workers per module (no shared queue).
- **Storage** (`lib/storage.js` + `upload.middleware`) and the `Attachment` model.
- **Connections** (`modules/connections`): OAuth with PKCE, encrypted tokens,
  refresh, per-tenant/per-person connections, chat routing.
- **Email**: `lib/email.js` (Resend) — *transactional* mail for the app itself.
- **ExecAI**: action registry with permission keys; `marketing_create_audience`
  and `marketing_create_experiment` (drafts only).
- **Permissions**: `marketing.campaign.create`, `marketing.audience.write`,
  `marketing.experiment.write` are grantable.

## 2. Service-by-service audit

| Page | Class | Current implementation | Missing | Rebuild |
|---|---|---|---|---|
| Engagement Overview | E/B | Sums typed-in campaign numbers | Real delivery/engagement metrics | Command Center over real events (§3) |
| **Email Studio** | **B** | Campaign CRUD; start/pause flip `status` | Content, audience, sending domain, delivery engine, webhooks, consent, unsubscribe | **Phase 4** |
| Journey Tab | **C/F** | `createFlow` returns an object, stores nothing; list always `[]` | Everything | Phase 6 (on workflow engine + delayed steps) |
| Content Studio | **C/F** | Upload "succeeds", stores nothing | Asset table, storage, versions | Phase 7 (on storage layer) |
| Automation Studio | **C/F** | `listFlows` → `[]` | Everything | Phase 6 (reuse/extend workflow engine) |
| Account Engagement Overview / Prospects | **E** | CRM contacts with null stage/score | Engagement profiles, events | Phase 9 |
| Engagement 3D | **E** | Campaigns relabelled as "journeys" | Real engagement data | Phase 9 |
| Scoring & Grading | **D** | Fixed rule list applied to nothing | Rule engine, score history | Phase 9 |
| Personalization Overview | **F** | Contact count + zeros | Everything | Phase 13 |
| Web Campaigns | **C/F** | Create returns an object, stores nothing | Everything | Phase 7/13 |
| Recipes | **F** | Constant empty array | Template library + installer | Phase 13 |
| JARVIS Insights | **F** | CDP metrics, all null | Real analysis | Phase 12 (ExecAI) |
| Data Cloud Overview | **E/F** | Contact count; sources 0 | CDP | Phase 3/7 |
| Data Streams | **C/F** | Add source returns object, stores nothing | Sources, mapping, ingestion | Phase 7 |
| Identity Resolution | **E** | Searches CRM contacts | Identities, matching, merge history | Phase 10 |
| Segments / Activation / Commerce Audiences | **B/D** | Audience rows; activate flips status; lookalike size 0 | Rules, membership, destinations | **Phase 5** |
| Intelligence Overview | **E/B** | Campaign sums; trend `[]` | Event-based analytics | Phase 11 |
| Channel Analytics | **F** | `[]` | Event model | Phase 11 |
| Attribution | **F** | `[]` / nulls | Touchpoints, conversions, models | Phase 11 |
| Reports | **B** | Lists campaigns | Report types, exports | Phase 11 (reuse report engine) |
| Content Generation | **A/G** | AI text via `assistText`; template fallback | Saving to Content Studio | Phase 7/12 |
| Experiments | **B/D** | Rows; start/pause flip status; lift typed | Variant assignment + measurement | Phase 4+ (email A/B first) |
| Predictive Insights | **F** | CDP nulls | Data, models, evaluation | Phase 12 |
| Commerce Overview / Orders | **E** | **CRM won deals relabelled as orders** | Order model, integrations | Phase 10 |
| Social Composer / Calendar | **B/D** | Posts persist; publishing **always simulated** — live path throws "not implemented" even with credentials | Platform OAuth, real publish, media upload | Phase 8 |
| Social Inbox | **D→C** | Sample generator removed; no live pull | Platform APIs | Phase 8 |
| Social Growth / Analytics | **B** | Real only for typed followers + recorded snapshots | Platform insights APIs | Phase 8 |
| Social Accounts | **B/D** | Stores a pasted token; "connected" without verification | OAuth, verification, refresh | Phase 8 (on connections framework) |

## 3. Target architecture

### 3.1 Principles
- CRM `Contact` stays the identity of record. Marketing adds *profiles,
  consent, events and memberships that reference it* — never a second contact table.
- Every number on a page is computed from rows written by an execution or an
  integration. No typed-in metrics; existing typed fields are kept for history
  but no longer displayed as measurements.
- Long work runs in DB-backed queues claimed with `FOR UPDATE SKIP LOCKED`, so
  multiple app instances can run workers safely and nothing depends on a browser.
- External sends require an explicit person action (or an activated journey a
  person approved); ExecAI drafts and schedules only with confirmation.

### 3.2 Foundation models (Phase 2–3)
- `MarketingConsent` — per contact + channel: `subscribed | unsubscribed |
  bounced | complained`, with source, evidence and timestamps. **Email is sent
  only to `subscribed`.** CRM contacts have no recorded consent today, so the
  initial sendable audience is empty until consent is recorded or imported.
- `MarketingSuppression` — tenant-level address suppression (hard bounce,
  complaint, manual).
- `MarketingEvent` — the standardized event stream (type, channel, contact,
  email, campaign, source, properties, idempotency key). Analytics, scoring,
  attribution and journeys all read this.

### 3.3 Email (Phase 4)
- Provider: **Resend**, through a marketing-only adapter and key
  (`MARKETING_EMAIL_*`), separate from the app's transactional mail. Chosen for
  its domain API (DNS records + verification), per-message tags, signed
  webhooks for delivered/bounced/complained/opened/clicked, and simple pricing;
  SES is the planned second adapter for high volume (cheapest per message, but
  sandbox approval and more setup).
- `MarketingSendingDomain` (DNS records, verification status),
  campaign content/audience/schedule fields, `MarketingEmailDelivery` (one row
  per recipient — the queue and the record), signed one-click unsubscribe
  (RFC 8058), webhook ingestion → events, consent and suppression.

### 3.4 Later phases
Audiences with real membership (5); journeys/automations on an extended
workflow engine with persistent waits (6); data sources + assets (7); social
via OAuth and official APIs (8); engagement profiles and scoring from events
(9); commerce orders and identity graph (10); attribution over events (11);
predictive with minimum-data gates and ExecAI marketing tools (12);
personalization and installable recipes (13); UI (14); hardening (15).

## 4. External dependencies (need people, money or approvals)
| Integration | Status | Needs |
|---|---|---|
| Resend (marketing) | Implementable now | API key; verified sending domain (customer DNS) |
| Amazon SES | Planned adapter | AWS account; production access request |
| Meta Graph / Marketing API | Not started | Meta app, **App Review** for publishing/ads permissions, Business verification |
| LinkedIn | Not started | Marketing Developer Platform **application approval** |
| X API | Not started | **Paid** API tier for posting at scale |
| Google Ads | Not started | Developer token (**approval**), OAuth |
| Shopify / WooCommerce | Not started | Shopify app (review for public distribution); Woo REST keys per store |
| GA4 | Not started | OAuth + property access |
