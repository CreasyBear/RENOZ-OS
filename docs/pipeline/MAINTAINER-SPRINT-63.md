# Pipeline Maintainer Sprint 63

## Status

Closed in commit-ready state.

## Issue 1: Opportunity Conversion Needed Opportunity-Side Lineage Evidence

### Problem

Sprint 62 made conversion feedback and navigation honest, but conversion lineage was still one-sided. The created order carried an idempotency key and metadata pointing back to the opportunity, while the opportunity itself had no durable machine-readable conversion marker and no timeline entry showing which order it became.

### Workflow Spine

Opportunity detail convert action
-> opportunity conversion mutation hook
-> pipeline convert server function
-> latest quote validation
-> orders `createOrder`
-> opportunity conversion lineage transaction
-> opportunity metadata conversion marker
-> deduplicated opportunity activity evidence
-> order detail navigation and cache invalidation.

### Touched Domains

- Pipeline opportunity conversion server workflow.
- Pipeline opportunity activity timeline evidence.
- Pipeline opportunity metadata lineage marker.
- Pipeline opportunity mutation feedback/source contract.
- Pipeline activity mutation/source contract.
- Pipeline maintainer closeout docs.

### Business Value Protected

Conversion is the handoff from sales pipeline to fulfillment. Operators need to see from the opportunity record which order was created, and the opportunity timeline should preserve conversion evidence even when the order create path replays idempotently.

### Scope Constraints

- Do not change order creation semantics, order numbering, order totals, line item mapping, idempotency key, or the order-side metadata payload.
- Do not add a first-class schema relation in this slice; that remains a deliberate cross-domain migration.
- Keep conversion lineage as a bounded opportunity metadata and activity evidence slice.

### Changes

- Added `recordOpportunityOrderConversion` to write opportunity-side conversion lineage after `createOrder` returns.
- Stored `convertedOrderId`, `convertedOrderNumber`, `convertedQuoteVersionId`, and `convertedAt` in opportunity metadata.
- Preserved `convertedAt` when the same created order is replayed.
- Added a deduplicated opportunity activity entry with `outcome = order:<orderId>` and description `Converted to order <orderNumber>`.
- Added returned-row evidence and explicit server failure code for conversion activity creation.
- Extended source contracts to protect conversion metadata, activity deduplication, and convert workflow invocation.

### Standards Checked

- Domain ownership: order creation remains in the orders domain; opportunity-side conversion lineage is owned by the pipeline server workflow.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: unchanged on the route/hook/cache side from Sprint 62; this sprint strengthens server -> schema/database lineage.
- Tenant isolation/data integrity: lineage update and activity lookup/write use `organizationId + opportunityId` predicates.
- Query/cache contract: unchanged from Sprint 62; opportunity and order caches are already invalidated by the conversion hook.
- Honest UI states/operator-safe errors: conversion now has operator-visible opportunity timeline evidence; failures use a stable server code instead of leaking persistence details.
- Reviewability: bounded diff across one server module, two source contracts, and this closeout.

### Smells Removed

- Conversion left no durable marker on the opportunity record.
- Opportunity timeline did not show the order created from a won opportunity.
- Retried idempotent conversion could not distinguish existing conversion activity from new evidence.

### Deferred

- First-class opportunity-to-order schema relation remains deferred because it requires migration, read-model, UI, and possibly order-domain contract decisions.
- A richer conversion detail card/link in the opportunity UI remains deferred; this sprint records the data and timeline evidence only.
- Browser QA remains deferred because this source-covered slice changes server lineage evidence rather than visible layout.
- Full `bun run test:unit` and `bun run build` remain deferred to broader release/predeploy sweeps.

### Verification

- Passed: `bun run test:vitest tests/unit/pipeline/opportunity-mutation-feedback-contract.test.ts tests/unit/pipeline/activity-mutation-feedback-contract.test.ts tests/unit/pipeline/opportunity-mutation-cache-contract.test.ts tests/unit/pipeline/opportunity-list-query-contract.test.tsx` (4 files, 10 tests).
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for conversion lineage metadata, activity deduplication, tenant predicates, and stable failure code.
- Passed: `git diff --check`.
- Skipped: serialized gates; this slice does not touch serial lineage, inventory identity, warranty/RMA continuity, or a related cross-domain invariant.

### Goal Adaptation

Declined. The standing maintainer goal already covers workflow spines, tenant isolation, lineage continuity, operator-safe errors, meaningful tests, and reviewable diffs. The Sprint 60 serialized-gate adaptation remains in force.

### Residual Risk

Low for opportunity-side conversion lineage evidence. Moderate for broader conversion reporting because metadata is an interim marker rather than a typed schema relation.
