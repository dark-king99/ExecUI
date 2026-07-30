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

## 3. Pages are reachable by name

`lib/searchIndex.js` lists every destination for Ctrl/⌘ + K and the navbar search,
filtered by what the viewer can actually reach — module access **and**
`adminOnly`. Offering a page that immediately redirects is worse than not
offering it.

Everything outside the module sidebars had been missing from this index, so
Documents, Contracts, HR, Payroll, Helpdesk, Approvals and the compliance and
developer consoles were reachable only by clicking the sidebar.

## 4. Worked example: Documents ↔ Contracts

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

## 5. Registries are checked against the schema

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
