# Support Maintainer Sprint 59

This sprint follows Sprint 58's support metrics read-state cleanup into the support issue list and issue detail read states. The target is issue list/detail reads: route and container presentation should not leak arbitrary `Error.message` text, issue detail not-found semantics should stay explicit, and hook/query-key contracts should remain unchanged.

Status: Closed after Issue 1.

## Business Value

Issues are the core support workflow for battery support, warranty escalation, RMA initiation, and customer follow-up. Operators need clear recovery copy when issue reads fail, not internal database or network error text.

## Workflow Spine

`/support/issues` and `/support/issues/$issueId`
-> `IssuesPage` / `IssueDetailContainer`
-> `useIssuesWithSlaMetrics` / `useIssueDetail`
-> `useIssues` / `useIssue`
-> `getIssuesWithSlaMetrics` / `getIssueById` server functions and schemas
-> issue list/detail database reads
-> `queryKeys.support.issuesListFiltered` / `queryKeys.support.issueDetail`
-> operator-safe list/detail error states.

## Architecture Constraints

- Keep this sprint to support issue list/detail read-state presentation.
- Do not change issue server functions, schemas, issue list/detail SQL, query keys, or cache policy.
- Preserve detail not-found semantics from normalized read errors.
- Serialized gates are not part of this slice's gate set; this diff does not touch serialized lineage, inventory identity, serialized movement, warranty/RMA serial continuity, or repair scripts.

## Issue Ledger

### 1. Issue List/Detail Safe Read Errors

Problem:

- The issue list displayed raw `error.message` text for read failures.
- The issue detail container displayed raw `error.message` text and used a generic failed-load title even for normalized not-found responses.
- There was no support-domain read-error formatter equivalent to the warranty read-error helper.

Workflow protected:

Issue list/detail route/container -> support issue hooks -> issue server functions/schemas -> issue query keys -> operator-safe read-state copy.

Implemented slice:

- Added `formatSupportReadError` to display only normalized read-query messages and otherwise fall back to safe operator copy.
- Added `isSupportReadNotFound` to preserve issue detail not-found title semantics.
- Replaced raw issue list/detail read-error rendering with support-domain formatting.
- Added helper tests and source contract coverage for issue read-state behavior.

Out of scope:

- Issue list/detail server behavior.
- Issue query/cache policy.
- Issue board raw read-state copy.
- Issue templates read-state copy.
- Browser QA and visual spacing.

Closeout:

- Touched domains: support issue list route, support issue detail container, support read-error helper, support tests, support sprint evidence.
- Workflow protected: `/support/issues` and `/support/issues/$issueId` -> `useIssuesWithSlaMetrics` / `useIssueDetail` -> `useIssues` / `useIssue` -> `getIssuesWithSlaMetrics` / `getIssueById` -> `queryKeys.support.issuesListFiltered` / `queryKeys.support.issueDetail` -> operator-safe list/detail read states.
- Business value protected: operators no longer see arbitrary issue read error text and still get explicit not-found messaging for missing issue records.
- Architecture standards checked: route/container own display states; hook normalization, server functions, schemas, database reads, and query key policy unchanged.
- Tenant isolation and data integrity checked: no organization predicate, issue read SQL, issue write path, RMA/warranty linkage, or permission boundary changed.
- Query/cache contract checked: issue list and detail still use centralized support issue query keys with normalized read-error behavior.
- Smells removed: raw issue list/detail read errors; generic issue detail failed-load title for normalized not-found; missing support-domain read-error formatter.
- Smells deferred: issue board raw issue load copy and issue-template read-state copy remain future support slices.
- Gates run: focused support read-error/read-state and query normalization contracts, 3 files / 7 tests; full support unit suite, 60 files / 195 tests; `bun run typecheck`; `bun run lint`; targeted source scans; `git diff --check`.
- Gates skipped: browser QA, because this sprint changes error-copy branching and helper contracts with source/unit coverage, but no dev server was already running.
- Goal adaptations: declined. The Sprint 57 serialized-gate adaptation still applies; this slice does not touch those contracts.
- Residual risk: issue board raw issue-load copy and issue-template list read-state copy remain future support slices; browser visual QA remains needed before a visual release.
