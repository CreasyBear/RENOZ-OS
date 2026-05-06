# Orders Maintainer Sprint 33

## Status

Closed in commit-ready state.

## Issue 1: Draft Order Line-Item Write Evidence

### Problem

Draft order line-item mutations used the order version as the aggregate concurrency guard, but the final line-item writes did not fully prove the specific target row before recalculating order totals and returning success. `updateOrderLineItem` updated by line-item id and organization only, then returned the possibly missing result. `deleteOrderLineItem` could delete zero rows for a bad or raced item id, recalculate totals, and still return `{ success: true }`.

The aggregate version claim also lacked `deletedAt IS NULL`, so a line-item mutation could claim a version on an order that was soft-deleted after the pre-read.

### Workflow Spine

Draft order line-item edit/delete
-> `useUpdateOrderLineItem` / `useDeleteOrderLineItem`
-> order-line-item server function
-> active draft order validation
-> active order aggregate version claim
-> target line-item write proof
-> order total recalculation
-> order detail and list cache invalidation.

### Touched Domains

- Orders line-item server mutations.
- Orders aggregate version helper.
- Orders line-item write-scope contract tests.
- Orders maintainer closeout docs.

### Business Value Protected

Draft line items define order totals, tax, balance due, fulfillment expectations, and customer-facing commitments. Operators should not see a successful edit/delete when the target row was missing, raced away, or no longer belongs to the active draft order being edited.

### Scope Constraints

- Do not change line-item input schemas, payloads, hook APIs, visible UI, order pricing math, or returned success/result shapes.
- Do not change the existing optimistic order-version requirement.
- Preserve cache behavior: detail invalidation plus finite/infinite order list invalidation.
- Do not touch fulfillment picking, shipments, inventory, finance ledger writes, serialized lineage, or RMA behavior.

### Changes

- Added `deletedAt IS NULL` to `claimOrderAggregateVersion`.
- Added `orderId` to the final `updateOrderLineItem` update predicate.
- Added a `NotFoundError` guard if the final line-item update returns no row.
- Added an in-transaction target line-item existence check before delete count validation.
- Added `.returning({ id: orderLineItems.id })` to the final line-item delete and a guard before totals recalculation.
- Added `order-line-item-write-scope-contract.test.ts`.

### Standards Checked

- Domain ownership: draft line-item mutation rules remain inside Orders server functions and Orders hooks.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: checked line-item hooks, server functions, order aggregate version helper, `orders.deletedAt`, `order_line_items`, and centralized `queryKeys.orders`.
- Tenant isolation/data integrity: improved. Aggregate version claims are active-row scoped, and line-item writes prove order id plus organization id before totals are recalculated.
- Query/cache contract: preserved. Line-item mutations still invalidate order detail plus finite and infinite order list collections through centralized query keys.
- Honest UI states/operator-safe errors: improved. Missing or raced line-item targets now fail with typed not-found errors instead of successful no-op writes.
- Reviewability: the diff is bounded to the aggregate helper, line-item mutation write guards, one focused source contract test, and this closeout.

### Smells Removed

- Aggregate order version claim could update a soft-deleted order.
- Line-item update final write did not include the parent order id.
- Line-item update could return an unproved missing row.
- Line-item delete could return success after deleting zero rows.
- Totals recalculation could run after an unproved line-item delete.

### Deferred

- `recalculateOrderTotals` still has a silent return when the active order cannot be read; a broader totals helper contract review remains a separate slice.
- Line-item mutations still hard-delete rows, which is existing product behavior and not changed here.
- Browser QA remains deferred because this slice did not change visible UI, interaction layout, or hook cache behavior.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/orders/order-line-item-write-scope-contract.test.ts tests/unit/orders/order-write-contracts.test.ts tests/unit/orders/order-mutation-invalidation.test.tsx` - 3 files, 22 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Skipped: browser QA, `bun run build`, `bun run test:unit`, `bun run lint:reliability`, finance, document, release, and deploy gates because this slice did not change visible UI, build-time behavior, shared route/read contracts, financial persistence, document generation, release packaging, or deployment paths.

### Goal Adaptation

Declined. The standing maintainer goal and sprint process already cover safe mutation contracts, active-row data integrity, operator-safe errors, centralized query/cache checks, meaningful tests, and risk-selected evidence. Serialized gates remain retired as routine evidence and were not relevant to this non-serialized line-item edit slice.

### Residual Risk

Low for draft order line-item update/delete no-op success. Moderate for the broader Orders totals path because `recalculateOrderTotals` should get its own focused contract review before changing its silent missing-order behavior.
