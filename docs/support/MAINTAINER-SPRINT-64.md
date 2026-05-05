# Support Maintainer Sprint 64

This sprint follows Sprint 63's RMA detail read-state cleanup into issue-detail CSAT feedback. The target is `CsatDisplayCard`: hard feedback reads should use the support-domain read-error formatter, cached feedback should remain visible with explicit degraded copy, and the existing CSAT hook/query-key contract should remain unchanged.

Status: Closed after Issue 1.

## Business Value

CSAT feedback helps RENOZ learn from support outcomes and follow up on poor experiences. Operators should not see internal feedback read errors, and cached customer feedback should stay visible when refresh fails.

## Workflow Spine

`/support/issues/$issueId`
-> `IssueDetailContainer`
-> `IssueDetailView`
-> `CsatDisplayCard`
-> `useIssueFeedback`
-> `getIssueFeedback` server function and schema
-> CSAT feedback database read
-> `queryKeys.support.csatDetail`
-> operator-safe hard-error and stale-data CSAT feedback states.

## Architecture Constraints

- Keep this sprint to issue-detail CSAT feedback read-state presentation.
- Do not change CSAT entry, feedback link generation, public feedback, server functions, schemas, query keys, cache policy, or mutation feedback.
- Preserve nullable-by-design no-feedback behavior.
- Use the support read-error helper introduced in Sprint 59 for hard failures.
- Serialized gates are no longer part of the default maintainer closeout. They apply only when a slice touches serialized lineage, inventory identity, serialized movement, warranty/RMA serial continuity, or repair scripts; this diff touches none of those contracts.

## Issue Ledger

### 1. CSAT Feedback Safe Read Error

Problem:

- `CsatDisplayCard` rendered `error.message` directly for hard issue-feedback read failures.
- Existing feedback stayed visible on refresh failure, but the UI did not disclose that the data was stale.

Workflow protected:

Issue detail container -> CSAT display card -> CSAT issue-feedback hook -> CSAT server function/schema -> CSAT detail query key -> operator-safe hard-error and stale-data states.

Implemented slice:

- Routed hard CSAT feedback read-failure copy through `formatSupportReadError`.
- Added a stale feedback refresh warning while keeping existing feedback visible.
- Added source contract coverage for CSAT feedback read-state behavior.

Out of scope:

- CSAT entry mutation feedback.
- Feedback link generation.
- Public feedback route behavior.
- CSAT metrics/dashboard read states, closed in Sprint 57.
- Browser QA and visual spacing.

Closeout:

- Touched domains: support issue-detail CSAT display, support issue detail container contract, support tests, support sprint evidence.
- Workflow protected: `/support/issues/$issueId` -> `IssueDetailContainer` -> `IssueDetailView` -> `CsatDisplayCard` -> `useIssueFeedback` -> `getIssueFeedback` -> `queryKeys.support.csatDetail` -> operator-safe hard/stale CSAT feedback states.
- Business value protected: operators no longer see arbitrary CSAT feedback read error text and can distinguish cached customer feedback from a fresh read.
- Architecture standards checked: presenter owns feedback display states; hook normalization, server function, schema, database reads, query key policy, CSAT entry/link/public flows, and mutations unchanged.
- Tenant isolation and data integrity checked: no organization predicate, feedback read SQL, CSAT write path, support issue linkage, or permission boundary changed.
- Query/cache contract checked: issue feedback still uses the centralized CSAT detail query key with normalized nullable-by-design read-error behavior.
- Smells removed: raw `error.message` display in CSAT feedback hard-error state; silent stale feedback after refresh failure.
- Smells deferred: browser visual QA remains a future slice.
- Gates run: focused CSAT feedback/read-state, issue-detail wiring, support read-error, and query-normalization contracts, 4 files / 8 tests; full support unit suite, 65 files / 200 tests; `bun run typecheck`; `bun run lint`; targeted source scans; `git diff --check`.
- Gates skipped: browser QA, because this is a copy/read-state contract slice without layout changes requiring visual proof; serialized gates, because this slice does not touch serialized lineage, inventory identity, serialized movement, warranty/RMA serial continuity, or repair scripts.
- Goal adaptations: adopted the default-gate change from the user direction on May 5, 2026: serialized gates are now domain-triggered rather than a standing closeout gate.
- Residual risk: browser visual QA remains unrun; broader CSAT feedback history/list read-state hardening remains a future support slice if that workflow surfaces operator confusion.
