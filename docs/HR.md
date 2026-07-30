# HR / People Ops & Payroll

Two routes, deliberately:

- **`/people` — the HR console, administrators only.** It administers *other
  people*: employment records, compensation, leave decisions, payroll. It is not
  in an employee's sidebar, not in their search results, and not reachable by URL.
- **`/account/my-hr` — your own record, everybody.** Your details, your leave,
  your timesheet, your payslips. Beside your profile, because it is yours.

Hiding the console must never take away somebody's own payslip; that split is
what makes both true at once.

| Capability | Where | Who |
|---|---|---|
| **My HR** — own details, leave, timesheet, payslips | **Account → My HR** | every employee |
| **Directory & employment records** | **HR → Directory** | admins |
| **Compensation history** | **HR → Directory → person** | admins |
| **Leave** — types, balances, approvals | **HR → Leave** | admins; managers decide their own team's |
| **Timesheets** — submit and approve hours | **HR → Timesheets** | employees submit, managers/admins approve |
| **Payroll** — components, tax, pay runs, payslips | **HR → Payroll** | **enterprise admins only** |

---

## 0. Why payroll is inside HR

Payroll is a tab of HR, not a page of its own. Two reasons:

1. **It isn't a separate thing.** A pay run reads the employment records, the
   compensation history and the approved timesheets that live on the other tabs.
   Splitting it out put a wall between a calculation and its own inputs.
2. **A top-level nav item advertises a page.** Payroll is the most sensitive
   screen in the product; it has no business appearing in the sidebar of every
   employee who can't open it.

Access is checked on the **effective** role, so a system admin previewing the
product as another role loses payroll too — a preview that keeps admin pages
isn't a preview. The API is independently gated: every `/api/payroll/*` route
requires an admin role regardless of what the UI shows.

`/payroll` still resolves — it redirects to `/people?tab=payroll`. Bookmarks,
notification links sent before the move, and older docs keep working; a page that
moves shouldn't become a 404.

Tabs are addressable (`?tab=payroll`, `?tab=leave`, `?tab=me&section=pay`), which
is what lets a notification about a payslip or a pay run open the thing it is
about instead of the module it belongs to.

## 1. What is stated up front

- **ExecUI does not move money.** Payroll calculates and records; marking a run
  paid records a payment made elsewhere, and the bank export produces a payment
  file you give your bank. Nothing in the product claims to have paid anyone.
- **No tax rates ship with the product, for any country.** The engine is generic
  and the organization enters its own bands. A wrong rate shipped as a default
  would be worse than no default at all. **This module is not tax advice.**
- Statutory entitlements (leave, retention) differ everywhere, so the starter
  values are a **starting point to edit**, never a claim about what anyone is owed.

## 2. Employment records

Employment lives in its own table, not on the user. A `User` answers "can this
person sign in?"; employment answers "what are we paying them, and into which
account?" — a far more sensitive question with different access rules. Mixing
them would mean every route that reads a user could accidentally read a salary.

- **Government ids and bank details are encrypted at rest** (AES-256-GCM, the
  same store as integration secrets). Only the **last four digits** are ever
  returned, so a console can confirm "the right account" without becoming a place
  where bank details leak.
- Seeing a value in full is a **separate, audited action** — `Reveal` writes to
  that person's timeline, and the page says so. Reading someone's bank details is
  an act, not a side effect of opening their page.
- People with **no employment record are shown as "Not onboarded"**, never hidden.
  A missing HR record is exactly what a People console should surface.
- Reporting loops are refused: the guard walks the management chain before
  accepting a manager.

## 3. Compensation is versioned

A raise **adds a dated record**; it never edits the old one. Payroll then resolves
*"what was this person paid as of the pay date"* — so a raise dated next month
cannot silently back-pay this month, and a payslip from two years ago is still
explicable.

Correcting a figure is allowed only while **no approved pay run has used it**.
After that the fix is a new dated row, because payroll history isn't rewritable.

## 4. Leave

- Types are the organization's own catalog (paid/unpaid, annual entitlement,
  carry-over cap, whether weekends count).
- **Balances are never implied.** Booking checks the remaining allocation and
  refuses to overdraw it; days are held the moment leave is approved, because a
  booked holiday is already spent.
- Overlapping requests are refused **with the conflicting dates**, rather than
  silently double-booked.
- Approval routes through the **existing approvals engine** — the employee's
  manager where there is one, admins otherwise, so a request never falls to
  nobody. Managers can also decide directly from the console.
- **Year rollover** carries unused days forward, capped per type, and is
  idempotent: the daily ticker can run it any number of times without doubling
  anyone's allowance.
- **Unpaid leave reaches payroll**, split correctly across periods when it spans a
  month boundary.

## 5. Timesheets

Only **approved** hours are ever paid, and **only once**: a paid entry is locked
to its payslip, so the same hours can't be claimed in the next run. You cannot
approve your own hours, and reopening approved-but-unpaid hours is admin-only.

## 6. Payroll calculation

Three principles, all enforced in `payroll.engine.js` (pure, unit-tested):

**One denominator.** A mid-month joiner and a day of unpaid leave are both
prorated on **working days in the period**. Mixing calendar days for one and
working days for the other produces numbers nobody can reconcile.

**A declared order of operations:**

```
base pay (prorated, less unpaid leave)
  → earnings         (% of base first, then fixed, then % of gross)
  → gross
  → pre-tax deductions reduce taxable pay
  → income tax       (annualize → progressive bands → divide by periods)
  → post-tax deductions
  → net = gross − deductions − tax
  → employer contributions (a cost; never touch take-home pay)
```

Percentages always state what they're a percentage *of*, so "5% pension" is never
ambiguous.

**It must add up.** Every line is rounded to cents and `net` is *derived* from the
rounded figures. A payslip whose lines don't sum to its total is a payslip
somebody will refuse to accept — so a test asserts that earnings lines sum to
gross, deduction lines to deductions, and net to the difference.

Tax annualizes the period's taxable pay, applies the marginal bands, then divides
back — which is how cumulative PAYE-style systems behave, and means a monthly and
a weekly payroll on the same salary reach the same annual tax. Semi-monthly is
**24** periods and biweekly is **26**; conflating them is a classic payroll bug and
there's a test for it.

### Pay frequency and periods

| Frequency | Periods/year |
|---|---|
| Monthly | 12 |
| Twice monthly | 24 |
| Every 2 weeks | 26 |
| Weekly | 52 |

## 7. The pay-run lifecycle

```
draft ──► review ──► approved ──► paid
  └────────┴───────────┴────────► cancelled
```

- **draft / review** — recalculate as often as you like.
- **approved / paid** — **locked**. Recalculation and edits are refused, and the
  compensation the run used can no longer be edited either. A pay run you can
  still change after sign-off is not a record of what was paid to anyone.
- Approval goes through the approvals engine; the outcome returns over the
  domain-event bus.
- Overlapping runs for the same frequency are refused — that's how the same period
  gets paid twice.

**Every exclusion is reported.** Calculating lists who was *not* paid and why: no
compensation on record, no approved hours, paid in another currency, starts after
the period, left before it, or **no employment record at all**. A payroll where
somebody silently didn't get paid is the worst failure this module could have.

## 8. Payslips and the bank file

- Each payslip stores its full line breakdown **and a snapshot** of the
  compensation, tax table and period count used — so it stays explicable years
  later, after the salary has changed five times.
- Payslips download as PDFs; employees get their own from **My HR**, and only from
  runs that are approved or paid (an unapproved run is a work in progress, not a
  payslip anyone should hold).
- The **bank payment file** (CSV) is available only once a run is approved. Account
  numbers are decrypted there and only there, for exactly the people in the run,
  and the export is recorded on each person's timeline. Without `?download=true`
  the endpoint returns a readiness summary **without** account numbers — the
  console is asking "is this ready?", not "give me everyone's bank details".
- Anyone with no payable account is listed as excluded, with the reason.

## 9. Access model

- **Self-service** (`/api/hr/me/*`) — anyone signed in, always about themselves.
  The user id comes from the token, never the request, so there is no id to
  tamper with. Fetching a colleague's payslip by id returns 404.
- **Managers** decide leave and approve hours for their own reports only.
- **Everything else is admin-only.** Salaries, bank details, pay runs and the tax
  table have no partial-access department.
- Self-service can change contact details and its own bank account — never
  employment status, salary or anyone else's record.

## 10. How this connects to the rest of the product

- **Approvals** — leave requests and pay runs both use the existing engine, inbox
  and audit trail.
- **Reporting** — `payslips` and `leave_requests` are admin-only datasets, so
  "what did payroll cost by month" is answerable without a database client.
- **Public API** — `payslips`, `leave-requests` and `employment` are exposed
  **read-only** under `hr:read`. Bank details, government ids, dates of birth and
  emergency contacts are **not in the registry at all**, so no token scope can
  ever reach them.
- **Compliance** — six governance categories cover HR data. Erasure **anonymizes**:
  the employment row survives so payroll history stays valid, while the encrypted
  ids and bank details are **destroyed** and personal details cleared. Leave
  *reasons* are redacted (they can be health data) even though the absence itself
  is kept. Payroll records default to indefinite retention because they're
  commonly a statutory record — check local law before purging them.

## 11. Operating notes

- `HR_SCHEDULER=off` disables the daily ticker (leave-year rollover). The leave and
  payroll approval hooks stay wired either way.
- `SECRETS_KEY` must be set and **stable** in production: it's what decrypts bank
  details. Rotating it without re-encrypting makes the bank export fail loudly
  rather than silently paying the wrong account.
- Payroll runs and payslips are per-currency. Values are never summed across
  currencies anywhere in the module — an employee paid in another currency is
  excluded from a run with that reason given, rather than converted at a rate
  nobody chose.
