# Support Maintainer Sprint 62

This sprint follows Sprint 61's issue-template read-state cleanup into the RMA list. The target is RMA list reads: hard failures should use the support-domain read-error formatter, stale refresh failures should keep cached RMAs visible with explicit degraded copy, and the existing RMA hook/query-key contract should remain unchanged.

Status: Closed after Issue 1.

## Business Value

RMAs are the recovery workflow for returned battery units and warranty/support outcomes. Operators need to know when the RMA queue is unavailable without seeing internal read errors or mistaking stale data for a fresh queue.

## Workflow Spine

`/support/rmas`
-> `RmasListContainer`
-> `RmaList`
-> `useRmas`
-> `listRmas` server function and schema
-> RMA list database reads
-> `queryKeys.support.rmasListFiltered`
-> operator-safe hard-error and stale-data RMA states.

## Architecture Constraints

- Keep this sprint to RMA list read-state presentation.
- Do not change RMA filters, pagination, sorting, selection, bulk approval/receive behavior, server functions, schemas, RMA SQL, query keys, cache policy, inventory effects, or mutation feedback.
- Preserve container-owned hard vs stale read-state classification.
- Use the support read-error helper introduced in Sprint 59 for hard failures.
- Serialized gates are not part of this slice's gate set; this diff does not touch serialized lineage, inventory identity, serialized movement, warranty/RMA serial continuity, or repair scripts.

## Issue Ledger

### 1. RMA List Safe Read Errors

Problem:

- `RmaList` rendered `error.message` directly for hard RMA list failures.
- `RmasListContainer` rendered `error.message` directly in the stale-data warning when cached RMAs existed.

Workflow protected:

RMA list route/container -> RMA list presenter -> support RMA hook -> RMA server function/schema -> RMA list query key -> operator-safe hard-error and stale-data states.

Implemented slice:

- Routed `RmaList` hard read-failure copy through `formatSupportReadError`.
- Replaced stale RMA refresh error details with explicit cached-data warning copy.
- Added source contract coverage for RMA list read-state behavior.

Out of scope:

- RMA mutations and mutation feedback.
- RMA detail read states.
- RMA server behavior.
- RMA query/cache policy.
- Browser QA and visual spacing.

Closeout:

- Touched domains: support RMA list presenter, support RMA list container, support tests, support sprint evidence.
- Workflow protected: `/support/rmas` -> `RmasListContainer` -> `RmaList` -> `useRmas` -> `listRmas` -> `queryKeys.support.rmasListFiltered` -> operator-safe hard/stale RMA read states.
- Business value protected: operators no longer see arbitrary RMA read error text and can distinguish cached RMA data from fresh queue data.
- Architecture standards checked: container owns hard vs stale classification; presenter owns hard-error display; hook normalization, server function, schema, database reads, query key policy, mutations, inventory effects, and bulk behavior unchanged.
- Tenant isolation and data integrity checked: no organization predicate, RMA read SQL, RMA write path, inventory restoration, serialized continuity, support issue linkage, or permission boundary changed.
- Query/cache contract checked: RMA list still uses the centralized filtered RMA query key with normalized always-shaped read-error behavior.
- Smells removed: raw `error.message` display in RMA hard-error and stale-warning states.
- Smells deferred: RMA detail read states and browser visual QA remain future slices.
- Gates run: focused RMA read-state, read-error, read-model, bulk feedback, and list execution contracts, 5 files / 11 tests; full support unit suite, 63 files / 198 tests; `bun run typecheck`; `bun run lint`; targeted source scans; `git diff --check`.
- Gates skipped: browser QA, because this sprint changes RMA hard/stale read-state copy with source/unit coverage, but no dev server was already running.
- Goal adaptations: declined. The Sprint 57 serialized-gate adaptation still applies; this slice does not touch those contracts.
- Residual risk: RMA detail read states and browser visual QA remain future slices.
