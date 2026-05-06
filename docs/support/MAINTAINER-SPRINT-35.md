# Support Maintainer Sprint 35

## Slice

RMA replacement remedy cache contract.

## Why This Matters

Processing an RMA with a replacement remedy creates a real replacement order draft with line items, metadata, and search indexing. The support workflow treated that artifact like a non-financial repair/no-action remedy, refreshing only the source order detail and leaving order lists, replacement order detail, customer order context, and infinite order lists stale.

## Business Value Protected

This protects support, warehouse, and order operations after a battery warranty replacement. Operators should be able to process an RMA replacement and immediately see the replacement draft in order lists and customer order context, while source order detail still refreshes for traceability back to the original sale.

## Workflow Spine

`/support/rmas/$rmaId`
-> `useProcessRma`
-> `processRma`
-> `executeRmaRemedy`
-> replacement branch writes a zero-priced draft `orders` row and `orderLineItems`
-> `invalidateOrderArtifactQueries`
-> source order detail/with-customer, replacement order detail/with-customer, finite and infinite order lists, and customer-scoped order lists.

## Issue Raised

Sprints 33 and 34 made refund and credit remedies reuse finance-owned cache contracts. Replacement remedies still created order artifacts from the support domain without an explicit order artifact cache contract.

## Implementation

- Added `src/hooks/orders/_order-artifact-cache.ts` for order artifact/detail/list invalidation.
- Routed `useProcessRma` replacement remedies through `invalidateOrderArtifactQueries`.
- Preserved refund remedies on `invalidateOrderPaymentLedger`, credit remedies on `invalidateCreditNoteQueries`, and repair/no-action remedies on source order detail invalidation.
- Added runtime coverage for replacement remedy cache invalidation.
- Added a support workflow trace contract that pins replacement remedies to the order artifact cache helper.

## Standards Checked

- Domain ownership: support owns RMA remedy orchestration; order hooks own order artifact cache freshness.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: the protected workflow spine is documented above.
- Query/cache contract: replacement remedies now refresh source order, replacement order, customer order, finite order list, and infinite order list surfaces.
- Tenant isolation: unchanged; this slice does not alter server predicates.
- Transactional order integrity: unchanged; this follows the existing transaction-hardened replacement draft creation path.
- UI states: unchanged; affected views refetch through existing query states.
- Operator-safe errors: unchanged; RMA remedy feedback boundaries were not moved.
- Diff reviewability: one helper, one support hook branch, two focused test updates, one closeout note.

## Smells Removed

- RMA replacement remedies created order artifacts without sharing an explicit order-domain cache contract.
- Replacement order drafts could remain invisible in finite/infinite order lists after remedy execution.
- Source order cache refresh missed the `withCustomer` detail surface.

## Smells Deferred

- Xero payment reconciliation still has a separate cache contract because it owns Xero status surfaces as well as payment state.
- General order mutation helpers still duplicate order collection invalidation in several hook files; this slice only introduced a reusable helper for cross-domain order artifact creation.
- Browser QA was not run because this slice changes mutation cache policy and tests, not visible layout or interaction behavior.

## Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/support/use-rma-mutations.test.tsx tests/unit/support/rma-workflow-trace-contract.test.ts tests/unit/orders/order-mutation-invalidation.test.tsx tests/unit/orders/order-payment-ledger-contract.test.ts` (4 files, 31 tests).
- Passed: `./node_modules/.bin/vitest run tests/unit/support tests/unit/orders` (115 files, 394 tests).
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.

## Goal Adaptation

No further goal text change. The serialized gate retirement from Sprint 34 remains active: serialized lineage continuity is a domain invariant, but the old serialized gate suite is not routine evidence. This slice does not touch serialized lineage.

## Residual Risk

Xero payment reconciliation remains the next cache-contract risk. The order artifact helper may also be worth migrating into native order create/update hooks later, but doing that now would broaden the slice beyond the RMA replacement workflow.
