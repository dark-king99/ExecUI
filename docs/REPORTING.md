# Custom Reporting & Scheduled Exports

Employees can build their own reports on the organization's data, export them to
**CSV / Excel / PDF**, and have them **emailed automatically** on a daily, weekly
or monthly cadence.

Find it at **Analytics → Reports** (`/analytics/reports`).

## What you can build

| Capability | Detail |
|---|---|
| **Data sets** | Contacts, Opportunities, CRM Tasks, Support Tickets, Campaigns, Social Posts, Transactions, Projects, Team Tasks, Network Devices, Network Alerts, Employees |
| **Columns** | Pick any subject fields; related values (e.g. deal Owner) are flattened for you |
| **Filters** | Type-aware operators — `is / is not / contains / starts with / is any of / is empty`, `> ≥ < ≤ / between`, `on / before / after` |
| **Date ranges** | Today, yesterday, last 7/30/90 days, this/last month, this quarter, this year, or a custom range |
| **Summarize** | Group by any groupable field with `COUNT / SUM / AVG / MIN / MAX` measures |
| **Sort & limit** | Any column (or aggregate) with a row ceiling |

Reports can be **saved** (shared org-wide or kept private) and re-opened later.

## Exports

| Format | Notes |
|---|---|
| **CSV** | UTF‑8 with BOM so Excel opens accented characters correctly |
| **Excel (.xlsx)** | Bold frozen header, auto-filter, native number/currency formatting — numbers stay numbers, so they sort and sum |
| **PDF** | Paginated table with title, generated-at stamp, row summary and page numbers; auto-landscape for wide reports |

Screen previews are capped for responsiveness; **exports pull up to 10,000 rows**.

### Spreadsheet-injection safety

A cell beginning with `=`, `+`, `-`, `@`, tab or carriage-return is executed as a
formula by Excel/Sheets — so a malicious value stored in a CRM record could
attack whoever opens the export. Every text cell is neutralised with a leading
apostrophe in both CSV and Excel output. Filenames are sanitised against path
traversal.

## Scheduled delivery

Save a report, press **Schedule**, and choose:

- **Cadence** — daily, weekly (pick the weekday) or monthly (day 1–28, so every
  month can fire)
- **Time + timezone** — expressed in *your* timezone (e.g. `07:00 Africa/Monrovia`),
  not UTC, and it stays correct across daylight-saving changes
- **Format** — CSV, Excel or PDF
- **Recipients** — up to 20 email addresses

The report is rendered fresh at delivery time and attached to the email. You can
**Send now**, **pause/resume**, or delete a schedule, and each one shows its next
run, last run, delivery status and any error.

**Email must be configured** (`RESEND_API_KEY`) for delivery to actually happen.
Without it, a run is recorded honestly as `skipped` with an explanatory message
rather than pretending it sent.

## Security model

- **Server-authoritative.** The API returns only the data sets and fields the
  caller may use, and re-validates every definition on run *and* export — a
  tampered payload is rejected, not trusted.
- **No SQL from users.** A report definition is a whitelisted field/operator
  spec, executed through Prisma with parameterized values. Unknown fields,
  disallowed operators, non-aggregatable measures and bad sort targets are all
  rejected with a 400.
- **Access follows the rest of the app.** Data sets are gated by *department
  permissions ∩ plan entitlements*; the **Employees** data set is admin-only
  because it contains staff PII. Saved reports on a data set you've lost access
  to disappear from your list.
- **Tenant isolation** is automatic via the Prisma tenant guard — a report can
  only ever read your own organization's rows.
- **Editing rights.** Only a report's author or an admin can change or delete it
  (same for schedules), so shared reports others depend on can't be altered
  underneath them.

## Operating notes

- The scheduler runs **in-process**, ticking once a minute. Due schedules are
  claimed with a conditional update, so running multiple app instances will not
  double-send.
- Set `REPORT_SCHEDULER=off` to disable the ticker (used in tests, or when you'd
  rather drive delivery from an external cron).
- At larger scale, move delivery to a dedicated job queue — the run logic is
  already isolated in `runDueSchedules()` and can be called from anywhere.

## Extending the data sets

Add an entry to `backend/src/modules/reports/reports.datasets.js`: name the
Prisma model, list the fields you want exposed with their types, and mark which
are `groupable` / `aggregatable`. That's the whole change — the builder UI,
validation, exports and scheduling all read from the registry. Because the
registry is the whitelist, adding a field is a deliberate act rather than an
accidental exposure.
