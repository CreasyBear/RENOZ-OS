# Support Maintainer Sprint 10

This sprint moves from issue-detail cleanup to the RMA receive workflow. The target is receiving-location honesty in the RMA receive dialog: operators should not be able to attempt a return-to-stock receive while active receiving locations are still loading or unavailable.

Status: Closed after Issue 1.

## Business Value

RMA receive restores returned batteries or components into warehouse truth. If operators cannot tell whether a receiving location is loading, unavailable, or inactive, they can lose confidence in returned-stock recovery and may repeatedly hit avoidable errors.

## Workflow Spine

RMA detail route
-> `RmaDetailContainer`
-> `useRmaDetail`
-> `RmaWorkflowActions`
-> `RmaReceiveDialog`
-> selected active warehouse location
-> `receiveRma` server transaction
-> inventory movement and restored stock truth.

## Architecture Constraints

- Keep this sprint support/RMA presentation only.
- Do not change routes, hooks, server functions, schemas, database access, query keys, cache invalidation, RMA receive mutation behavior, inventory transaction behavior, cost-layer behavior, serialized lineage behavior, or RMA status transitions.
- Preserve active-location filtering, selected `locationId` submission, inspection condition, inspection notes, pending dialog guards, and close/reset behavior.
- Make location loading and no-active-location states explicit before mutation submission.
- Add focused tests for active-location filtering, loading blocked state, no-active-location blocked state, missing-location validation, and successful receive payload.

## Issue Ledger

### 1. RMA Receive Location Availability Honesty

Problem:

- The RMA receive dialog filters inactive locations but does not explain when there are no active receiving locations.
- The receive button remains clickable while locations are loading, which produces a generic choose-location error rather than an honest loading state.
- RMA receive location selection is high-stakes because it drives returned-stock restoration into inventory.

Workflow protected:

RMA detail -> receive dialog -> active receiving location selection -> receive mutation -> returned-stock inventory truth.

Planned slice:

- Derive active receiving locations once in the dialog.
- Show explicit loading and no-active-location helper text.
- Disable `Mark Received` while locations are loading or no active receiving location exists.
- Keep missing selected-location validation for the normal selectable state.
- Add focused tests for the dialog states.

Out of scope:

- Changing `receiveRma` server transaction behavior.
- Changing location query behavior.
- Changing RMA detail hooks, mutation invalidation, status transitions, inventory movement writes, cost layers, serialized lineage, or remedy execution.

Closeout:

- Touched domains: support/RMA receive presentation, returned-stock location selection, support UI tests, support sprint evidence.
- Workflow protected: RMA detail route -> `RmaDetailContainer` -> `useRmaDetail` -> `RmaWorkflowActions` -> `RmaReceiveDialog` -> selected active warehouse location -> existing `receiveRma` server transaction.
- Business value protected: operators now get honest feedback when receiving locations are loading or unavailable, and cannot attempt returned-stock recovery until an active receiving location can be selected.
- Architecture standards checked: no route, hook, server function, schema, database, query key, cache invalidation, RMA mutation behavior, inventory transaction behavior, cost-layer behavior, serialized lineage behavior, or RMA status transition changed.
- Tenant isolation and data integrity checked: no tenant predicate or database write path changed. The existing server-side selected-location validation remains the authority.
- Query/cache contract checked: no query keys, invalidation, optimistic update, rollback, or cache policy changed.
- Smells removed: the receive dialog no longer presents an empty selector without explanation when no active receiving location exists; the receive action is blocked while receiving locations are loading or unavailable; active-location filtering now has focused coverage.
- Smells deferred: server fallback for a single active location remains unchanged; bulk RMA receive location UX remains outside this dialog slice; browser QA remains deferred until visual/workflow QA.
- Gates run: `./node_modules/.bin/vitest run tests/unit/support/rma-receive-dialog.test.tsx`; `./node_modules/.bin/eslint src/components/domain/support/rma/rma-receive-dialog.tsx tests/unit/support/rma-receive-dialog.test.tsx`; `./node_modules/.bin/vitest run tests/unit/support`; `env NODE_OPTIONS=--max-old-space-size=8192 ./node_modules/.bin/tsc --noEmit`.
- Gates skipped: browser QA, because this was a focused client presentation-state change with unit coverage and no route/server/data changes.
- Goal adaptations: declined. The standing product-owner goal and bounded sprint closeout format still fit this slice.
- Residual risk: returned-stock recovery still depends on server transaction coverage and trace-contract tests. A future RMA/inventory slice should review post-receive cache refresh and inventory movement visibility rather than further polishing this dialog.
