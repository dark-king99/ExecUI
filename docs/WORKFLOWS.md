# Workflow Automation & Approvals

Two connected capabilities:

- **Workflows** — "when this happens, do that." Rules react automatically when
  your data changes. *Account → Automation* (admin only).
- **Approvals** — multi-step sign-off on a record, raised by a workflow or by a
  person. *Approvals* in the main sidebar (every employee).

---

## 1. Workflows

### Triggers

A workflow listens to a record lifecycle event: `<resource>.created`,
`<resource>.updated` or `<resource>.deleted` — e.g. `opportunities.updated`.

Events are captured at the **data layer**, so a rule fires whether the change
came from the ExecUI web app, the public API, or a background job. This is the
same event stream that drives outbound webhooks.

> `updateMany` / `deleteMany` bulk operations do **not** emit events (they return
> counts, not records). Per-record writes — which is what the UI and API perform
> — always do.

### Conditions

Optionally narrow the trigger. Each condition is `field · operator · value`,
combined with **all** (AND) or **any** (OR). No conditions means every event of
that type fires the rule.

Operators: `is`, `is not`, `greater than (or equal to)`, `less than (or equal
to)`, `contains`, `does not contain`, `starts with`, `is any of`, `is none of`,
`is empty`, `is not empty`, `is true`, `is false`.

Text comparisons are case-insensitive; numeric ones coerce numeric strings, so
`value ≥ "50000"` behaves as a person expects.

### Actions

| Action | What it does |
|---|---|
| **Update the record** | Set writable fields on the record that triggered the rule |
| **Create a record** | Create a related record (e.g. a follow-up task when a deal is won) |
| **Send a notification** | In-app notification to a role, department, specific user, all admins, or the record owner |
| **Send an email** | To fixed addresses or an address taken from the record |
| **Require approval** | Raise a multi-step approval chain (below) |

There is deliberately **no "run a script" action**. Every action is a named,
whitelisted operation, and record writes are validated through the same registry
that guards the public API — so an automation can never set a field a person
couldn't set through the API.

### Templates

Text fields accept `{{record.<field>}}`, `{{event}}` and `{{now}}`:

```
Title:  Big deal won: {{record.name}}
Body:   Closed at {{record.value}} on {{now}}
```

This is not a general template engine — only those explicit paths resolve.
Prototype access (`{{record.__proto__}}`, `{{record.constructor}}`) and globals
resolve to an empty string, and unknown fields render empty rather than leaking
the raw token.

### Loop protection

A workflow action writes a record → that write emits an event → which could
re-trigger the same rule, forever. Two defences, both active:

1. **Chain tracking.** Actions run inside an execution context that records
   depth and which workflows have already run. A workflow never runs twice in
   one chain, and chains stop at a depth of 3. A self-referential rule therefore
   performs its action exactly once.
2. **Once per record.** Optional per-rule flag: skip a record this workflow has
   already handled successfully. This is also the fix for an "on updated" rule
   that would otherwise fire on every subsequent edit.

Prevented cycles are logged (`workflow_cycle_prevented`) rather than failing
silently.

### Testing a rule before you trust it

**Test** performs a dry run against a real record: it reports whether the record
matches and which actions *would* run — without performing any of them.

### Run history

Every evaluation is recorded: which rule, which event, which record, whether
conditions matched, each action's outcome, duration, and any error. A rule that
partially fails is marked `failed` with the failing action named, and the
remaining actions still run — one broken step doesn't silently abort the rest.

---

## 2. Approvals

An approval request has ordered **steps**. Each step names its approvers by
**role**, **department**, **specific user**, **all admins**, or the **record
owner**, and a `requiredCount` of approvals needed to clear it.

**Approvers are resolved to real people when the request is raised** and frozen
onto it. If someone changes department next week, an in-flight approval still
means what it meant when it was requested — and the audit trail stays truthful.

### Flow

1. Approvers on step 1 are notified (in-app, real-time).
2. Once `requiredCount` of them approve, the step clears and step 2 is notified.
3. **Any single rejection ends the whole chain immediately** — the request is
   rejected and the requester is notified.
4. When the final step clears, the request is approved and any `onApprove`
   actions defined by the originating workflow run.

### Rules enforced server-side

- You may only decide if you are an approver on the **current** step. Being an
  approver on a later step confers nothing yet.
- You may not record two decisions on the same step (also enforced by a unique
  database index, so a double-submit can't slip through).
- A decided request cannot be decided again.
- Only the requester or an admin can withdraw a pending request.

Every decision is stored with its author, timestamp and comment.

---

## 3. Example

**"Any deal over $50,000 that's won needs Finance then Executive sign-off."**

- Trigger: `opportunities.updated`
- Conditions (all): `status is won`, `value ≥ 50000`
- Once per record: **on**
- Actions:
  1. Notify **all admins** — "Big deal won: `{{record.name}}`"
  2. Require approval "Approve discount on `{{record.name}}`" with steps
     *Finance review* (department: Finance) → *Executive sign-off* (role:
     enterprise_admin)

---

## 4. Operating notes

- The engine runs in-process, subscribed to the domain-event stream.
  `WORKFLOW_ENGINE=off` disables it.
- Automation failures never affect the write that triggered them — an action
  error is recorded against the run, not thrown back into the user's request.
- Workflows are **admin-only** to author, because a rule acts on everyone's data
  automatically. Approvals are open to every employee, since approving is a
  normal part of the job.
- Adding a new action means adding a validator + executor in
  `backend/src/modules/workflows/workflows.actions.js`; the builder UI reads the
  catalog from the server, so it picks the new action up automatically.
