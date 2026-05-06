# Orders Maintainer Sprint 34

## Status

Closed in commit-ready state.

## Issue 1: Draft Order Totals Recalculation Fail-Closed Contract

### Problem

`recalculateOrderTotals` is the shared totals helper behind draft order line-item add, update, and delete. It read active orders with `deletedAt IS NULL`, but if that read failed it silently returned. It also wrote recalculated totals back to `orders` without an active-row predicate or returned-row guard.

That meant a line-item mutation transaction could, in principle, commit after the totals helper failed to prove the active order still existed or failed to prove the totals update persisted.

### Workflow Spine

Draft order line-item add/update/delete
-> order-line-item server mutation
-> active draft order validation
-> active order aggregate version claim
-> line-item write
-> `recalculateOrderTotals`
-> proved active order totals write
-> order detail and list cache invalidation.

### Touched Domains

- Orders line-item totals helper.
- Orders line-item write-scope contract tests.
- Orders maintainer closeout docs.

### Business Value Protected

Line-item changes drive order subtotal, tax, total, and balance due. Operators should not be able to change a draft order line item while the server quietly skips or fails the totals persistence that commercial and fulfillment workflows depend on.

### Scope Constraints

- Do not change pricing math, tax math, discount behavior, line-item mutation payloads, hook APIs, visible UI, or cache invalidation behavior.
- Do not change the order aggregate version requirement introduced in earlier Orders maintenance.
- Do not touch fulfillment picking, shipments, inventory, payment ledger, finance reporting, serialized lineage, or RMA behavior.

### Changes

- Replaced the silent missing-order return in `recalculateOrderTotals` with a typed `NotFoundError`.
- Added `isNull(orders.deletedAt)` to the final totals update predicate.
- Added `.returning({ id: orders.id })` and a typed guard to prove totals persistence.
- Extended `order-line-item-write-scope-contract.test.ts` to cover fail-closed totals recalculation.

### Standards Checked

- Domain ownership: totals recalculation remains a local Orders line-item helper.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: checked line-item hooks, server functions, totals helper, `orders.deletedAt`, `order_line_items`, and centralized `queryKeys.orders`.
- Tenant isolation/data integrity: improved. The totals update now proves organization scope and active-row scope.
- Query/cache contract: preserved. Add/update/delete line-item hooks still invalidate order detail and finite/infinite order list collections through centralized query keys.
- Honest UI states/operator-safe errors: improved. A missing or raced order now rolls back the mutation with typed not-found behavior instead of pretending totals were recalculated.
- Reviewability: the diff is bounded to one helper and one focused contract test extension.

### Smells Removed

- Silent no-op return when totals recalculation could not read the active order.
- Totals update without active-row predicate.
- Totals update without returned-row evidence.

### Deferred

- Broader order pricing and financial projection tests remain a separate concern; this slice changed persistence proof, not math.
- Browser QA remains deferred because no visible UI, route behavior, or hook cache contract changed.
- Other non-line-item totals helpers should be reviewed in their own domain slices.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/orders/order-line-item-write-scope-contract.test.ts tests/unit/orders/order-write-contracts.test.ts tests/unit/orders/order-mutation-invalidation.test.tsx` - 3 files, 23 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Skipped: browser QA, `bun run build`, `bun run test:unit`, `bun run lint:reliability`, finance, document, release, and deploy gates because this slice did not change visible UI, build-time behavior, shared route/read contracts, financial persistence, document generation, release packaging, or deployment paths.

### Goal Adaptation

Declined. The standing maintainer goal already covers safe mutation contracts, tenant isolation, data-integrity implications, operator-safe errors, meaningful tests, and evidence-based sprint closeout.

### Residual Risk

Low for draft order line-item totals persistence proof. Moderate for the broader Orders domain because shipment, picking, payment, RMA, and amendment helpers still deserve their own bounded write-contract reviews.
