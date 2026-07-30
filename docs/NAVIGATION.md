# How views find each other

Two screens that describe the same records have to agree — about how to reach a
record, and about what it currently says. This document is the contract they hold
each other to.

There are exactly three mechanisms, and no view is allowed a fourth.

| Concern | Mechanism |
|---|---|
| "Open that record over there" | `linkTo(kind, id)` → `useRecordParam(param)` |
| "The data I'm showing just changed elsewhere" | any write broadcasts an invalidation |
| "Take me to that page by name" | the destination index (Ctrl/⌘ + K) |

---

## 1. A link to a record is `linkTo`

`frontend/src/lib/recordLinks.js` and `backend/src/lib/recordLinks.js` hold the
same table: for each kind of record, the page that owns it, the query parameter
that page reads, and the tab it lives on.

```js
linkTo("contract", id)   // → /contracts?open=<id>
linkTo("payRun",  id)    // → /people?tab=payroll&run=<id>
```

The owning page reads it with `useRecordParam`, which also **writes** it — so
opening a record by hand updates the address bar, and the URL is always shareable.

**Why a table and not a string in each component.** Before this existed, every
view invented its own URL, and roughly half of them were wrong in ways nothing
reported:

- global search linked staff to `/people?user=…`, and the People page never read
  that parameter — every one of those results landed on an unfiltered directory;
- documents and contracts linked to each other's *list* page, so "here is the
  contract" meant "here is the register, go and find it";
- every contract notification pointed at `/contracts` regardless of which
  contract it was about.

A wrong link doesn't throw. It just quietly wastes the reader's time, which is
why this is a table with a test rather than a convention.

**The two tables are checked.** `backend/test/recordLinks.test.mjs` asserts they
are identical and that both build the same URL, because the server emits links
(search results, notifications) that the client has to be able to open. Add a
record kind to one side only and the suite fails.

**Adding a relationship** is three lines: an entry in both tables, and
`useRecordParam` in the page that owns the record.

## 2. A write refreshes every view, not just the one that made it

`services/api.js` broadcasts a query invalidation after **any** successful
non-GET request. Every mounted `useApi` query refetches; `useDataSync` covers
components that fetch by hand.

It lives at the single door every request goes through, deliberately. It used to
be the caller's job — `useMutation` broadcast, and a page that saved through the
API client directly did not. Pages that remembered stayed in sync and pages that
forgot went stale, which is not a problem you can fix by being careful.

Notes:

- Invalidations are **coalesced** on a short timer, so one user action that issues
  three writes causes one refresh, not three.
- `QUIET_PATHS` exempts writes nothing depends on — currently reward navigation
  tracking, which fires on every page change.
- Signing out clears the shared cache, so the next person to sign in on that
  browser can't be shown the previous user's data while their own loads.

## 3. If you can't use it, you don't see it

`lib/visibility.js` is the one answer to "can this person see X". Three gates,
applied together:

| Gate | Question | Source |
|---|---|---|
| **plan** | did the organization buy it? | `lib/plans.js` |
| **department** | is it this employee's job? | `lib/access.js` |
| **role** | is this an administrator? | the **effective** role |

The sidebar, the routes, the command palette and the destination index all call
it, so a page cannot be visible on one surface and absent from another.

**Absent, not disabled, and not shown-then-redirected.** Two reasons:

1. Every entry somebody can't open is a thing they have to learn to ignore. A nav
   full of those stops being a nav.
2. Advertising what a plan doesn't include, or what a role isn't allowed to touch,
   tells people something about the organization they weren't meant to be told.
   "Payroll" in the sidebar of somebody who can't open it is an invitation to ask
   why.

**HR is the worked example.** The console administers *other people* — employment
records, compensation, leave decisions, payroll — so it is administrators only:
absent from the sidebar, absent from search, and `/people` redirects. But an
employee must still read their own payslip, book leave and submit hours, so that
lives at **`/account/my-hr`**, beside their profile, where it is theirs rather
than something they administer. Hiding the console must never take away somebody's
own payslip.

**Plans hide solutions, not just modules.** A Premium tenant gets three of the
five Business Services; the other two are not in the sidebar, not routable, and
not in the command palette. Analytics is sliced the same way — no Network Ops, no
Network analytics, and the launcher doesn't poll for data it will be refused.

Declaring a page's requirements is one object:

```js
{ section: "services", solution: "team", adminOnly: false }
```

Anything left unset is unrestricted, so a new admin page has to say so — and
`backend/test/visibility.test.mjs` fails any destination that is visible to
everybody without being on a short list of genuinely universal ones.

Routes still guard themselves. Hiding a link is presentation; the redirect holds
when somebody types the URL, and the API authorizes independently of both.

## 4. Pages are reachable by name

`lib/searchIndex.js` lists every destination for Ctrl/⌘ + K and the navbar search,
filtered by what the viewer can actually reach — module access **and**
`adminOnly`. Offering a page that immediately redirects is worse than not
offering it.

Everything outside the module sidebars had been missing from this index, so
Documents, Contracts, HR, Payroll, Helpdesk, Approvals and the compliance and
developer consoles were reachable only by clicking the sidebar.

## 5. Worked example: Documents ↔ Contracts

A contract is the *business* object — counterparty, money, dates. A document is
the paper. They are separate so the paper can be re-versioned while the contract
moves through review and signature. That separation is only tolerable if each one
can see the other.

**What each side reports**

| From a document you can see | From a contract you can see |
|---|---|
| every contract it is attached to, with status and whether it is in force | the document, its current version, file name and SHA-256 |
| every signature envelope raised against it | the envelope, and how many parties have signed |
| — | the contract it renews, and the one that renewed it |

**What that makes possible**

- The register distinguishes **no document** from **a document with no file in
  it**. Both block a signature, for different reasons, and a title alone hides
  the second one entirely.
- A document row links to its contract; a contract links back to the document hub
  and opens the file directly.
- Archive and delete are **disabled with the reason on the button** when a
  contract depends on the document, rather than failing after the click.
- Creating a renewal takes you to the renewal, because that is the record you now
  work on.

**The guards behind it**, enforced in the service and not just the UI:

- Deleting a document attached to a contract is refused, and the error **names the
  contract**.
- Deleting a document carrying signature evidence is refused.
- **Archiving** a document is refused while a contract using it is in force.
  Archiving hides a document from the hub and from search; doing that to the paper
  behind a live obligation loses the contract's own evidence from view while the
  obligation carries on. A closed contract's document can be archived.
- `renewedFromId` is a real foreign key, so a renewal cannot point at a contract
  that no longer exists.

## 6. What the full sweep found

Auditing every relationship in the schema against the screens that show it turned
up ten gaps. Three were not "missing links" but wrong behaviour:

**Search sent six of its sixteen sources to the 404 page.** `/crm/contacts`,
`/crm/pipeline`, `/crm/tasks`, `/marketing/campaigns`, `/network/monitoring` and
`/services/operations` are not routes — the real ones are
`/crm/accounts/contacts`, `/crm/opportunities`, `/crm/activities`,
`/marketing/personalization/campaigns`, `/network/inventory` and
`/services/operation`. Every contact, deal, task, campaign, device and alert
anybody found in global search took them to "page not found". A link is only a
string until someone clicks it, so the route table is now checked against the
router itself.

**CRM → Service → Cases was a second implementation over the helpdesk's own
table.** One `CrmTicket`, two screens, and the CRM one was wrong in three ways:
the case description was read from the *customer's name*; adding a note returned
a note object and saved nothing, so the UI said "note added" and it was gone on
refresh; and resolving set `status` without `resolvedAt`, which left resolution
times blank and made the "rate only after resolution" rule refuse ratings for
tickets that were in fact resolved. It delegates to the helpdesk service now — one
status machine, one timeline, one thread — and each screen links to the other.

**The Business Services pages had never loaded their data.** All six built their
base URL as `${VITE_API_BASE_URL ?? ''}/services`, so with the variable unset they
requested `/services/…`, which matches no route and falls through to the SPA. The
pages parsed HTML as JSON and logged `Unexpected token '<'`. The API is at
`/api/services`; the base now defaults to `/api` like the shared client does.

The rest were relationships the database knew about and no screen showed:

| Relationship | Was | Now |
|---|---|---|
| Approval → the record being approved | a label, nothing to click | opens the contract, pay run or leave request |
| Contract / pay run → its approval | an id in the payload | a link to the request |
| Ticket ↔ CRM contact | resolved on creation, never shown | each links to the other; the queue filters by contact |
| Payslip → the person | a name in plain text | opens the employment record the figures came from |
| Alert ↔ device | a hostname in plain text | each links to the other; alerts filter by device |
| Data subject → their record | an email address | opens the person or contact before you erase them |
| Workflow → approvals it raised | nothing | the requests that rule created |
| Document → the record it is filed against | two unread columns | a link to the deal, project or client |

## 7. Registries are checked against the schema

Search sources declare the columns they match and return. A source whose query
throws degrades to a named warning rather than failing the whole search — correct
at runtime, and a terrible way to find a typo: the `sops` source named `content`
and `category` on a model with `description` and `department`, threw on every
query ever made, and procedures were simply never searchable. Nothing failed, so
nothing was noticed.

`backend/test/search.test.mjs` now validates every source against the generated
Prisma schema: matched fields and selected columns must exist, matched fields must
be text, and the title and subtitle builders must only read columns the source
actually selected.
