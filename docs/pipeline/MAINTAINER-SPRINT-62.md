# Pipeline Maintainer Sprint 62

## Status

Closed in commit-ready state.

## Issue 1: Opportunity Conversion UI Still Treated Created Orders As Pending

### Problem

`convertToOrder` already creates or replays an order through the orders domain, but the client hook still exposed unused conversion options and the opportunity detail workflow told operators that conversion was only initiated before navigating to the orders list. That made a completed conversion feel ambiguous and forced operators to find the new order manually.

### Workflow Spine

Opportunity detail convert action
-> opportunity detail hook
-> opportunity conversion mutation hook
-> pipeline convert server function
-> latest quote version validation
-> orders `createOrder` server function
-> order list/detail cache invalidation
-> navigate directly to the created order detail.

### Touched Domains

- Pipeline opportunity conversion UI workflow.
- Pipeline opportunity mutation hook/cache policy.
- Pipeline opportunity conversion server labeling.
- Pipeline opportunity mutation feedback/source contract.
- Pipeline opportunity mutation cache/source contract.
- Pipeline maintainer closeout docs.

### Business Value Protected

Won opportunities become live fulfillment work. Operators should land on the exact order that was created from the opportunity quote, with cache policy prepared for the order detail view they are about to inspect.

### Scope Constraints

- Do not change order creation semantics, quote-to-order payload mapping, order numbering, idempotency key, tenant checks, financial totals, or order line item behavior.
- Do not add opportunity-to-order schema linkage in this slice; that needs a deliberate cross-domain data model decision.
- Keep this focused on truthful conversion UX and cache policy.

### Changes

- Removed the stale "Stub" label from the conversion server section.
- Removed unused `createJob` and `depositPercentage` options from the conversion hook input contract.
- Changed the conversion hook to send only the server-supported opportunity ID.
- Added created order detail and with-customer cache invalidation after conversion.
- Changed opportunity detail conversion feedback to say which order was created and navigate directly to `/orders/$orderId`.
- Extended source contracts to protect the honest conversion feedback, order-detail navigation, cache invalidation, and absence of stale pending-integration copy.

### Standards Checked

- Domain ownership: conversion remains coordinated from the pipeline hook, while order creation stays in the orders server function.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: opportunity detail delegates conversion to the hook; the hook calls the pipeline server function and invalidates pipeline plus order caches before detail navigation.
- Tenant isolation/data integrity: unchanged; conversion still uses the tenant-scoped opportunity read and the orders domain create contract.
- Query/cache contract: improved; the created order detail and with-customer caches are invalidated before navigation.
- Honest UI states/operator-safe errors: improved; successful conversion now reports a created order instead of a vague initiated state.
- Reviewability: bounded diff across one server label, two hooks, two source contracts, and this closeout.

### Smells Removed

- Stale "Stub" marker on a production conversion workflow.
- Hook input options that the server schema did not accept.
- "Order conversion initiated" copy after a completed order create/replay.
- Navigation to the broad orders list when the created order ID is known.

### Deferred

- Durable opportunity-to-order linkage remains deferred. The current order metadata/client request ID creates idempotency, but a first-class relation would require schema, read-model, and migration work.
- Conversion activity/audit on the opportunity remains deferred to a conversion lineage slice.
- Browser QA remains deferred because this source-covered slice changes navigation target and cache policy without visual layout changes.
- Full `bun run test:unit` and `bun run build` remain deferred to broader release/predeploy sweeps.

### Verification

- Passed: `bun run test:vitest tests/unit/pipeline/opportunity-mutation-cache-contract.test.ts tests/unit/pipeline/opportunity-mutation-feedback-contract.test.ts tests/unit/pipeline/opportunity-list-query-contract.test.tsx` (3 files, 7 tests).
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for conversion cache policy, created-order navigation, removed unused options, and removed stale pending copy.
- Passed: `git diff --check`.
- Skipped: serialized gates; this slice does not touch serial lineage, inventory identity, warranty/RMA continuity, or a related cross-domain invariant.

### Goal Adaptation

Declined. The standing maintainer goal already covers workflow spines, cache policy, honest UI states, production-readiness cleanup, and reviewable diffs. The Sprint 60 serialized-gate adaptation remains in force.

### Residual Risk

Low for conversion feedback and navigation. Moderate for broader conversion lineage because the opportunity table still does not have a first-class converted order relationship.
