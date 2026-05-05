# Support Maintainer Sprint 63

This sprint follows Sprint 62's RMA list read-state cleanup into the RMA detail surface. The target is RMA detail reads: hard failures should use the support-domain read-error formatter, missing records should keep explicit not-found semantics, and the existing RMA detail hook/query-key contract should remain unchanged.

Status: Closed after Issue 1.

## Business Value

RMA detail is where operators approve, receive, process, and cancel recovery work for returned battery units. When a detail read fails, operators need clear recovery copy and explicit not-found semantics without internal read-error leakage.

## Workflow Spine

`/support/rmas/$rmaId`
-> `RmaDetailContainer`
-> `RmaDetailView`
-> `RmaDetailCard`
-> `useRmaDetail`
-> `useRma`
-> `getRma` server function and schema
-> RMA detail database read
-> `queryKeys.support.rmaDetail`
-> operator-safe hard-error and not-found RMA detail states.

## Architecture Constraints

- Keep this sprint to RMA detail read-state presentation.
- Do not change RMA workflow actions, approve/reject/receive/process/cancel mutations, server functions, schemas, RMA SQL, query keys, cache policy, inventory effects, serialized continuity, or mutation feedback.
- Preserve normalized detail-not-found semantics from `useRma`.
- Use the support read-error helper introduced in Sprint 59 for hard failures.
- Serialized gates are not part of this slice's gate set; this diff does not touch serialized lineage, inventory identity, serialized movement, warranty/RMA serial continuity, or repair scripts.

## Issue Ledger

### 1. RMA Detail Safe Read Error

Problem:

- `RmaDetailCard` rendered `error.message` directly for RMA detail failures.
- Missing detail data without an error used generic `RMA not found` copy, but normalized not-found errors did not have an explicit not-found title.

Workflow protected:

RMA detail route/container -> RMA detail view/card -> RMA detail hook -> RMA server function/schema -> RMA detail query key -> operator-safe hard-error and not-found states.

Implemented slice:

- Routed `RmaDetailCard` hard read-failure copy through `formatSupportReadError`.
- Added `isSupportReadNotFound` classification for the RMA detail title.
- Preserved explicit missing-record copy when no RMA data is returned.
- Added source contract coverage for RMA detail read-state behavior.

Out of scope:

- RMA workflow mutations and mutation feedback.
- RMA list read states, closed in Sprint 62.
- RMA server behavior.
- RMA query/cache policy.
- Browser QA and visual spacing.

Closeout:

- Touched domains: support RMA detail card, support RMA detail container/hook contract, support tests, support sprint evidence.
- Workflow protected: `/support/rmas/$rmaId` -> `RmaDetailContainer` -> `RmaDetailView` -> `RmaDetailCard` -> `useRmaDetail` -> `useRma` -> `getRma` -> `queryKeys.support.rmaDetail` -> operator-safe hard/not-found RMA detail states.
- Business value protected: operators no longer see arbitrary RMA detail read error text and still get explicit not-found messaging for missing RMA records.
- Architecture standards checked: presenter owns detail read-state display; hook normalization, server function, schema, database reads, query key policy, mutations, inventory effects, and workflow actions unchanged.
- Tenant isolation and data integrity checked: no organization predicate, RMA detail SQL, RMA write path, inventory restoration, serialized continuity, support issue linkage, or permission boundary changed.
- Query/cache contract checked: RMA detail still uses the centralized RMA detail query key with normalized detail-not-found read-error behavior.
- Smells removed: raw `error.message` display in RMA detail read state; generic failed-load title for normalized missing RMA records.
- Smells deferred: browser visual QA remains a future slice.
- Gates run: focused RMA detail/list read-state, support read-error, detail view, and mutation feedback contracts, 5 files / 8 tests; full support unit suite, 64 files / 199 tests; `bun run typecheck`; `bun run lint`; targeted source scans; `git diff --check`.
- Gates skipped: browser QA, because this sprint changes RMA detail read-state copy with source/unit coverage, but no dev server was already running.
- Goal adaptations: declined. The Sprint 57 serialized-gate adaptation still applies; this slice does not touch those contracts.
- Residual risk: browser visual QA remains a future slice.
