<!-- Keep PRs small and focused. CI (lint · test · build) must be green before review. -->

## What & why
<!-- One or two sentences: what this changes and the reason. Link any issue. -->

## How to verify
<!-- The exact steps a reviewer runs to see it work (commands, routes, screenshots). -->

## Reviewer checklist
- [ ] **Scope** — one logical change; no unrelated edits
- [ ] **Correctness** — happy path + edge cases handled; errors surfaced, not swallowed
- [ ] **Security** — inputs validated (zod), tenant-scoped queries, no secrets/PII in logs or client, authz checked
- [ ] **Data** — migration included & reversible; `onDelete` behavior considered; no destructive default
- [ ] **Tests** — new/changed behavior covered; `npm test` passes; regressions considered
- [ ] **Perf** — no N+1 / unbounded queries; pagination on lists; cache invalidated where state changes
- [ ] **UX/A11y** — keyboard reachable, labelled controls, sufficient contrast, reduced-motion respected
- [ ] **Docs** — README/PRODUCTION_READINESS/SECURITY updated if behavior or ops change

## Rollout / rollback
<!-- Any env vars, feature flags, or data backfill? How to roll back safely. -->
