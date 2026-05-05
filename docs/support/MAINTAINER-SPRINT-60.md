# Support Maintainer Sprint 60

This sprint follows Sprint 59's support issue list/detail read-state cleanup into the support issue board. The target is the issue board load failure path: it should use the same support-domain read-error formatter and shared retryable error presentation as the list/detail workflow, without changing board mutation behavior.

Status: Closed after Issue 1.

## Business Value

The issue board is the operator queue for drag/drop support work. If the board read fails, operators should get clear recovery copy and a retry path without bespoke weak load-failure UI or internal error leakage.

## Workflow Spine

`/support/issues-board`
-> `IssuesBoardPage`
-> `ErrorState` / `IssueKanbanBoard`
-> `useIssuesWithSlaMetrics`
-> `getIssuesWithSlaMetrics` server function and schema
-> issue list database reads with SLA context
-> `queryKeys.support.issuesListFiltered`
-> operator-safe issue board read-state.

## Architecture Constraints

- Keep this sprint to issue board read-state presentation.
- Do not change issue board filters, quick filters, drag/drop behavior, bulk actions, optimistic rollback, issue server functions, schemas, issue SQL, query keys, cache policy, analytics, or mutation feedback.
- Use the support read-error helper introduced in Sprint 59.
- Serialized gates are not part of this slice's gate set; this diff does not touch serialized lineage, inventory identity, serialized movement, warranty/RMA serial continuity, or repair scripts.

## Issue Ledger

### 1. Issue Board Safe Read Error

Problem:

- The issue board had a bespoke load-failure block with weak copy instead of the shared retryable error-state component.
- The board did not use the support read-error formatter, so it could drift from the list/detail read-state contract.

Workflow protected:

Issue board route -> issue board read-state -> support issue hook -> issue server function/schema -> issue list query key -> operator-safe board read failure.

Implemented slice:

- Replaced the bespoke board load-failure block with `ErrorState`.
- Routed board read-failure copy through `formatSupportReadError`.
- Added source contract coverage for issue board read-state behavior.

Out of scope:

- Issue board mutation feedback.
- Drag/drop and bulk operation rollback behavior.
- Issue list/detail read states, closed in Sprint 59.
- Issue templates read-state copy.
- Browser QA and visual spacing.

Closeout:

- Touched domains: support issue board route, support read-error helper usage, support tests, support sprint evidence.
- Workflow protected: `/support/issues-board` -> `useIssuesWithSlaMetrics` -> `getIssuesWithSlaMetrics` -> `queryKeys.support.issuesListFiltered` -> operator-safe issue board read-state.
- Business value protected: operators get consistent retryable board load-failure copy without internal read-error drift.
- Architecture standards checked: route owns display state; support read-error helper owns safe copy; hook normalization, server function, schema, database reads, query key policy, board mutation behavior, and analytics unchanged.
- Tenant isolation and data integrity checked: no organization predicate, issue read SQL, issue write path, RMA/warranty linkage, status transition, or permission boundary changed.
- Query/cache contract checked: issue board still uses the centralized support issue list query key through `useIssuesWithSlaMetrics`.
- Smells removed: bespoke issue board load-failure UI; board read-state drift from support read-error helper.
- Smells deferred: issue-template list read-state copy remains a future support slice; browser visual QA remains needed before a visual release.
- Gates run: focused issue board read-state/read-error and board feedback contracts, 4 files / 5 tests; full support unit suite, 61 files / 196 tests; `bun run typecheck`; `bun run lint`; targeted source scans; `git diff --check`.
- Gates skipped: browser QA, because this sprint changes board load-failure copy/presentation with source/unit coverage, but no dev server was already running.
- Goal adaptations: declined. The Sprint 57 serialized-gate adaptation still applies; this slice does not touch those contracts.
- Residual risk: issue-template list read-state copy remains a future support slice; browser visual QA remains needed before a visual release.
