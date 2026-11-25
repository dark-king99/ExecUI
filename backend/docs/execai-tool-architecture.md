# ExecAI tools, policy retrieval, and access boundaries

## First-party tools currently available

ExecAI's model tool calls are implemented inside the backend and use the same
tenant-scoped Prisma client and resource registry as the application:

| Tool | Access and effect |
|---|---|
| `get_workspace_overview` | Aggregate counts for resources in the user's effective module access. Read-only. |
| `search_records` | Bounded search over the caller's authorized resource catalog; returns at most 10 redacted records. |
| `create_record` / `update_record` | Only registry-writable fields and explicitly granted resource permissions; writes create audit entries. No delete tool. |
| `search_execui_policy` | Retrieves public Terms, Acceptable Use, Refund, Privacy, and Security policy excerpts for grounded answers. |
| `list_automation_workflows` | Admin-only, tenant-scoped summaries; read-only and does not execute a workflow. |
| `read_solution` | Read-only module views (`assistant.solutions.js`): CRM pipeline, funnel, win/loss, renewals, *my* tasks and meetings; marketing campaign performance, audiences, experiments; network capacity, backup health, incidents and an incident's timeline; Business Services dashboard, goals, SOPs, clients, investments, tax plans, market analyses. Gated on section + plan solution. |
| `read_industry_records` | The tenant industry's CRM/marketing object types, or up to 10 records of one. |
| `run_action` | Permission-aware writes across CRM, Marketing, Network and Business Services (`assistant.actions.js`). Offered only with the actions the caller may take. See below. |
| `run_python_analysis` | Offered only when the separate Python runner is configured. Do not enable it until the runner has OS-level isolation and resource controls. |

CRM tasks require an assigned user. When an authorized task creation omits
`userId`, ExecAI assigns the task to the signed-in user.

`read_solution` and `read_industry_records` were advertised to the model before
the dispatcher handled them, so every call failed. They are dispatched now, and
each re-checks authorization itself rather than trusting the offered catalog.

## Workspace actions (`run_action`)

| Action | Module · solution | Needs (non-admin) | Effect |
|---|---|---|---|
| `crm_create_lead` | CRM · leads | `crm.pipeline.manage` | New lead owned by the caller |
| `crm_update_lead` | CRM · leads | `crm.pipeline.manage` | Open stages, value, probability. Refuses a closed deal |
| `crm_create_task` | CRM · activities | self-service | Task for the caller; another assignee needs `crm.activity.write` and must be active |
| `crm_complete_task` | CRM · activities | self-service | Caller's own task; someone else's needs `crm.activity.write` |
| `crm_schedule_meeting` | CRM · activities | self-service | Meeting on the caller's calendar |
| `crm_add_account_note` | CRM · accounts | `crm.contact.write` | Note attributed to the caller |
| `marketing_create_audience` | Marketing · engagement | `marketing.audience.write` | **Draft** audience |
| `marketing_create_experiment` | Marketing · intelligence | `marketing.experiment.write` | **Draft** experiment |
| `network_acknowledge_alert` | Network | `network.alerts.manage` | Open alert → acknowledged. Refuses a resolved one |
| `network_open_incident` | Network | `network.incidents.manage` | Incident opened as `open` |
| `network_request_change` | Network | `network.changes.request` | Change request, always `pending` |
| `services_create_goal` | Services · strategic | admin (section) | Goal in `planning`, 0% |
| `services_update_goal_progress` | Services · strategic | admin (section) | Progress and status |
| `services_draft_sop` | Services · operation | admin (section) | SOP as **draft** |
| `services_create_client` | Services · marketing | admin (section) | Business client |

**Gates, in order.** (1) The section must be in the caller's effective access
(department ∩ plan) and the plan must include the solution — the same gate
`requireModule` applies to the module's HTTP routes. (2) A non-admin needs the
listed permission; admins pass. (3) The action re-reads the record to enforce
ownership and lifecycle rules. Business Services is admin-only as a section, so
its actions need no key: no non-admin ever reaches the section gate.

**Why writes are stricter than the UI.** The module routes check only module
access. The agent adds a permission because it acts on an instruction that can
be wrong, ambiguous, or planted in a record's text. Self-service is the narrow
exception: a user may create and complete their own tasks and schedule their
own meetings, which touches nobody else's work.

**Input is a whitelist.** Each action declares the only fields it accepts and
rejects anything else. Network incidents and changes are built field by field
because their services spread the input straight into the row: passed through,
a model could create a change request already marked `approved`.

**Permission keys.** Migration `20261124120000_add_execai_action_permissions`
inserts every key the actions check. That includes `crm.contact.write` and
`crm.pipeline.manage`, which previously existed only where the development seed
ran — a tenant created by signup gets four coarse keys, so in production they
could not have been granted. Granting is through the roles API
(`POST /roles/:id/permissions`); **the Team & Permissions page does not yet expose
it**, so until it does, non-admins have only the self-service actions.

**Deliberately absent**, with the reason, so nobody adds them by accident:

- Deleting anything — irreversible; the agent has no delete.
- Closing (won/lost) or re-opening a deal; converting a lead — commercial
  commitments and protected lifecycle moves, made by a person.
- Starting or pausing a campaign — starting one sends email to customers.
- Approving or rejecting a change — the approval is the human control.
- Running automation, restarting a server, restoring a backup — operational
  effects outside the database.
- Resolving an alert or incident — closes the loop on evidence the model can't see.

**Placeholder data is not exposed.** Marketing attribution, channel performance
and trend, the network traffic in/out split and service health return
hard-coded values today. They have no read view, because an agent reporting
them would be confidently wrong.

**Audit and replay.** Every action writes an `ai_agent.<action>` audit entry.
It is written after the action rather than in one transaction, because the
domain services use the shared client and can't join one; a failed audit write
is logged as an error. Runs that performed a write are never served from the
30-second response cache, which previously could record a second run as having
made a change it never made. After the first turn, `run_action` is withdrawn with
the other write tools, so a write can't be chained off a tool result.

These are first-party agent tools, not a connection to a third-party MCP server.
The current policy retriever uses lexical term matching over version-controlled
policy excerpts. Each result includes the public policy route and section.
For recognized simple policy questions, ExecAI shows the retrieved excerpts
verbatim rather than trusting a model-generated summary.
When a policy changes, update the corresponding document in
`assistant/policyCorpus.js` and keep its summary aligned with the policy page
under `frontend/src/apps/`.

## Useful MCP integrations to consider

- **Microsoft Teams or Slack**: draft or send an approved internal notification.
- **Google Drive, SharePoint, or Notion**: retrieve organization-approved
  procedures and playbooks.
- **GitHub**: inspect repository issues and workflow status for engineering
  teams.
- **Calendar**: find availability and draft meeting invitations.
- **Payment-provider support**: only through a dedicated, server-side billing
  service with seller-level credentials; never expose a seller account's
  Paddle/Dodo MCP credentials to tenant users.

Do not connect a generic database MCP server to production. Prefer registered
ExecUI tools so tenant filters, row/field permissions, auditing, and plan
entitlements stay enforced. Third-party MCP connections require an explicit
server URL, authentication strategy, per-tool allowlist, data-sharing review,
timeouts, and audit/redaction behavior. None is inferred from this repository's
Paddle support tooling.

## Why automation is not yet application-wide

The public API resource registry currently covers 18 resources across CRM,
Marketing, Network, Services, Contracts, Documents, HR, People, and Helpdesk.
The agent can only expose resources whose module maps directly to the caller's
effective `access.sections`; that access descriptor currently covers CRM,
Marketing, Network, Analytics, and admin-only Services. Contracts, Documents,
HR, People, and Helpdesk use separate route and data rules and must not become
agent-accessible merely because they appear in the resource registry.

Writes are narrower still: the generic `create_record`/`update_record` path
grants selected CRM and Marketing operations, `run_action` covers the domain
actions listed above, and only the tenant administrator can inspect workflow
summaries. The many application surfaces outside the generic resource registry
(payroll, approvals, documents, contracts, governance, and other domain
services) need explicit read/write tools that invoke their existing service
authorization and validation logic. Until those adapters and tests exist,
ExecAI must report the surface as unavailable instead of using direct ORM
access or granting broad CRUD.

## Run history and progress

Runs persist per tenant and user, with prompt and response redaction and a
90-day default retention category. The authenticated `/assistant/chat/stream`
endpoint emits server-sent events for run start, completed tool steps, and the
final result. `/assistant/runs` and `/assistant/runs/:runId` return only the
current user's history. Disconnecting the browser does not cancel server-side
execution; it completes and remains available in run history.

## Provider failures and quota

The configured model must be available to the provider account and support
function calling. For Groq, check the account's models endpoint or dashboard;
model availability can differ between accounts. Changes to AI environment
variables require a backend restart.

If the provider fails before any model completion or tool execution, a small
set of explicit overview and policy requests can return local, read-only data
with a degraded-mode notice. Other requests fail explicitly; partial runs are
never replayed automatically. Check their saved steps before retrying.
Quota reservations are released for model-not-found, authentication, rate-limit
and other selected pre-execution HTTP rejections, and connection failures known
to occur before connecting. HTTP 400, timeouts, and other ambiguous failures
remain metered because the provider may have processed them; reservations are
also retained if any model completion succeeded.
