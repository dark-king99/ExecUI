# Global Federated Search

One query across every module the signed-in person can see. Two ways in:

| Where | What it does |
|---|---|
| **Ctrl / ⌘ + K** | Pages *and* records as you type, plus "search everything" |
| **`/search`** | The full ranked list, with per-source filters |

---

## 1. There is no search index

Sources are queried **live** through the registry. That means a result can never
be stale and there is no reindex job to fail quietly at 3am — the two failure
modes that make search untrustworthy.

The cost is honest: matching is `ILIKE`-based (`contains`, case-insensitive),
not true full-text. That is fine at the scale a single tenant's tables reach,
and it degrades predictably — slowly, on very large tables, rather than wrongly.

**When to upgrade:** if a tenant's largest searchable table passes roughly a
million rows, add a Postgres `tsvector` column plus a GIN index per source and
swap `buildWhere` for a `@@` match. Nothing else in the module changes — the
registry, scoring, grouping and access model stay exactly as they are.

## 2. The registry is the security boundary

`search.registry.js` declares every searchable source: the Prisma model, which
fields may be **matched**, which may be **returned**, and the access required.
The engine reads nothing else, so a column that isn't listed can't be searched or
surfaced, and exposing one is a deliberate act.

Access is layered exactly as it is everywhere else:

| Declaration | Effect |
|---|---|
| `module: "crm"` | only people whose department **and** plan include CRM |
| `adminOnly: true` | enterprise/system admins only (staff directory, contracts) |
| neither | any signed-in employee (documents, knowledge base) |

**Access is applied before the query, not after.** A source the caller can't see
is never queried at all, so its row count can't leak through a total that doesn't
match the results. Asking for a forbidden source explicitly returns **403** rather
than an empty list — an empty list would read as "nothing matched".

Sources also carry their own filter where staleness would mislead: archived
documents, inactive employees and archived articles are never surfaced.

## 3. Every word must match

`parseQuery` splits the query into terms; quoted `"phrases stay whole"`. Then
**every** term must appear in at least one searchable field (`AND` of `OR`s).
The union is what makes search feel broken on a large database — searching
`acme invoice` should not return every row mentioning either word.

Terms shorter than two characters are dropped (a single letter matches most of
the database), the term count is capped, and stray quote characters are stripped
rather than searched for.

## 4. Ranking

Scoring is one function, `scoreRow`, so results sort **globally** — if the best
match is a contract and the second is a person, that's the order shown.

Each term scores `field weight × match quality`, best field wins:

| Match | Multiplier |
|---|---|
| exact value | ×4 |
| value starts with the term | ×3 |
| term starts a word inside the value | ×2 |
| term appears anywhere | ×1 |

Then:

- **Matching every term is worth 1.5×** — a row that covers the whole query beats
  one that matches a single term repeatedly.
- **Identifier fields** (`ticket_number`, `ip_address`, `employeeId`) are marked
  `exactOnly` and only count on an exact or prefix match. A ticket whose number
  merely *contains* the digit you typed is not a result anybody wanted.
- **Recency is a tiebreaker, not a thumb on the scale**: worth about 10% at a week
  old and ~1% after a year, so it separates equal matches without letting a weak
  fresh hit beat a strong old one.
- Regex metacharacters in a term are escaped, so `.*` matches nothing rather than
  everything.

## 5. What a result carries

`title`, `subtitle`, a **snippet** with context around the match, the source
label, a link, and the score. The registry builds the title and subtitle, so
search output and the module's own list can't disagree about what a record is
called.

**A result opens the record, not the list it lives in.** Links are built with
`linkTo` from the shared route table, which the SPA also reads — see
[`docs/NAVIGATION.md`](./NAVIGATION.md). Documents, contracts, tickets, articles
and people all land on the record you clicked.

Sources are also **checked against the database schema**: matched fields and
selected columns must exist and matched fields must be text. A broken source
degrades to a warning at runtime, which meant one source had been throwing on
every query since it was written without anybody noticing.

## 6. Operating notes

- `SEARCH_RATE_LIMIT_PER_MIN` (default 120) limits searching per user — generous
  for a person typing, tight enough that it can't be used to enumerate the
  database. Type-ahead is debounced client-side and asks for a smaller net.
- Sources are queried in parallel with `Promise.allSettled`: one broken source
  degrades to a named warning in the response rather than failing the search.
- Adding a source is a registry entry: model, fields with weights, a title
  builder, a link, and the access it needs.
