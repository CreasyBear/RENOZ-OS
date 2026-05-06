# Orders Maintainer Sprint 32

## Status

Closed in commit-ready state.

## Issue 1: Draft Order Delete Write Scope

### Problem

`deleteOrder` pre-read an active draft order, but the final soft-delete update only scoped by order id and organization id. If the order was deleted between the pre-read and the write, the mutation could still enqueue a search-delete event, log success, and return `{ success: true }` without proving an active order row was actually updated.

### Workflow Spine

Orders list/detail delete action
-> `useDeleteOrder` / `useDeleteOrderWithConfirmation`
-> `deleteOrder`
-> active draft order validation
-> tenant-scoped transaction
-> active-row soft-delete write
-> search index outbox delete
-> order detail removal and order list cache invalidation.

### Touched Domains

- Orders server write path.
- Orders delete write-scope contract tests.
- Orders maintainer closeout docs.

### Business Value Protected

Draft order deletion should be trustworthy because orders sit close to customer commitments, fulfillment planning, and commercial reporting. Operators should not receive a successful delete state when the server did not prove that the active draft order row was deleted.

### Scope Constraints

- Do not change delete eligibility: only draft orders can be deleted.
- Do not change order schemas, route behavior, visible UI, mutation payloads, or returned result shape.
- Do not change order list/detail cache invalidation behavior.
- Do not change search indexing semantics beyond only enqueueing after a proved write.
- Do not touch fulfillment, inventory, finance, serialized lineage, shipments, or payment ledger behavior.

### Changes

- Added `isNull(orders.deletedAt)` to the final `deleteOrder` soft-delete update predicate.
- Added `.returning({ id: orders.id })` to make the update evidence-bearing.
- Added a `NotFoundError` guard before enqueueing the search-index delete event.
- Added `order-delete-write-scope-contract.test.ts` to preserve tenant scope, active-row scope, transaction context, and guard-before-outbox ordering.

### Standards Checked

- Domain ownership: order deletion remains owned by the Orders server function and Orders hooks.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: checked list/detail delete hooks, `deleteOrder`, `orders.deletedAt`, centralized `queryKeys.orders`, and existing list/detail invalidation.
- Tenant isolation/data integrity: improved. The final write is now tenant-scoped and active-row scoped, not only the pre-read.
- Query/cache contract: preserved. Delete still removes detail cache and invalidates order list collections through centralized query keys.
- Honest UI states/operator-safe errors: improved. A raced delete now fails as a typed not-found case instead of reporting success without a proved row update.
- Reviewability: the diff is bounded to one server write, one focused source contract test, and this closeout.

### Smells Removed

- Pre-read-only active-row enforcement for draft order deletion.
- Search outbox delete enqueue after an unproved soft-delete update.
- Missing source contract for order delete write scope and guard ordering.

### Deferred

- Delete mutations still do not take an `expectedVersion`; adding optimistic concurrency to delete is a broader API and UI contract change.
- Broader Orders delete UX/browser QA remains deferred because this slice did not change visible UI or hook behavior.
- Other soft-delete paths outside Orders remain separate domain slices.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/orders/order-delete-write-scope-contract.test.ts tests/unit/orders/order-write-contracts.test.ts tests/unit/orders/order-payment-ledger-contract.test.ts` - 3 files, 20 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Skipped: browser QA, `bun run build`, `bun run test:unit`, `bun run lint:reliability`, finance, document, release, and deploy gates because this slice did not change visible layout, build-time behavior, shared route/read contracts, financial persistence, document generation, release packaging, or deployment paths.

### Goal Adaptation

Accepted in execution. Serialized gates are closed baseline work and are not part of routine closeout evidence. No standing goal text change was needed because `docs/reference/product-owner-goal.md` and `docs/reference/maintainer-sprint-process.md` already state that serial evidence should be defined only for slices that deliberately touch serial lineage, inventory identity, serialized movement, warranty/RMA serial continuity, or related repair work.

### Residual Risk

Low for draft order delete write scope. Moderate for the broader Orders domain because delete remains non-versioned and other soft-delete workflows should continue to be reviewed domain by domain.
