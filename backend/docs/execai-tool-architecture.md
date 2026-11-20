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
| `run_python_analysis` | Offered only when the separate Python runner is configured. Do not enable it until the runner has OS-level isolation and resource controls. |

CRM tasks require an assigned user. When an authorized task creation omits
`userId`, ExecAI assigns the task to the signed-in user.

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

Writes are narrower still: the current permission map grants selected CRM and
Marketing operations, and only the tenant administrator can inspect workflow
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
