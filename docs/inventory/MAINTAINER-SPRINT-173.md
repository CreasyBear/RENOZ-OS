# Inventory Maintainer Sprint 173: Order Amendment Cache Scope

## Status

Closed in commit-ready state.

## Issue 1: Order Amendment Actions Refreshed the Order Root

### Problem

Approving, rejecting, applying, and cancelling order amendments invalidated `queryKeys.orders.all`. That hid the actual read-after-write contract behind a root refresh covering order lists, details, fulfillment, shipments, payments, templates, and amendment queries.

Order amendments are a commercial control point: some actions only change amendment review state, while apply can change order totals, line items, payment summary, and fulfillment readiness. Those differences should be explicit in the hook cache policy.

### Workflow Spine

Amendment review/apply UI
-> `useApproveAmendment` / `useRejectAmendment` / `useApplyAmendment` / `useCancelAmendment`
-> order amendment server function
-> tenant-scoped amendment/order update
-> affected amendment/order cache refresh
-> explicit apply side-effect refresh for payment summary and fulfillment surfaces.

### Touched Domains

- Order amendment mutation hooks.
- Order mutation invalidation tests.
- Inventory sprint evidence.

### Business Value Protected

Amendment workflows now refresh the operational surfaces an operator actually depends on without forcing every order-owned query to refetch. Applying an amendment still refreshes order detail, order collections, amendment context, payment summary, and fulfillment queues explicitly.

### Scope Constraints

- Do not change order amendment server behavior, auth, validation, or transaction semantics.
- Do not change amendment UI copy or error handling.
- Do not change order payment mutation cache policy.
- Keep this slice focused on hook cache ownership.

### Changes

- Added local amendment cache helpers for order collections, order detail/with-customer detail, amendment list/detail, and applied-amendment side effects.
- Removed `queryKeys.orders.all` invalidation from approve, reject, apply, and cancel amendment hooks.
- Approve/reject/cancel now refresh affected amendment list/detail, affected order detail, and order collections.
- Apply now refreshes the same amendment/order surfaces plus payment summary and fulfillment list/kanban/summary surfaces.
- Added hook coverage proving amendment review/apply refreshes the explicit surfaces without order-root invalidation.

### Standards Checked

- Domain ownership: amendment hooks own amendment/order refresh; apply owns explicit commercial side-effect refresh.
- Route -> container/page -> hook -> server function -> schema/database -> query/cache policy: mutation results now carry `orderId` into targeted cache refresh.
- Tenant isolation/data integrity: unchanged; server-side amendment/order writes remain tenant-scoped.
- Transactional inventory/finance integrity: unchanged; apply transaction and payment-status recompute are untouched.
- Serialized lineage continuity: not applicable.
- Honest UI/error handling: unchanged; existing operator-safe amendment errors remain.
- Query/cache contract: improved and covered with focused mutation tests.
- Reviewability: one hook helper extraction plus focused tests.

### Smells Removed

- Amendment state changes relied on `orders.all` to refresh unrelated order-owned surfaces.
- Apply amendment relied on root invalidation to implicitly refresh fulfillment and payment summary.
- Reject amendment did not refresh the affected order amendment list despite receiving `orderId` from the server result.

### Deferred

- No DB-backed integration test for apply amendment recalculating order totals and payment status.
- No browser smoke; this was a hook/cache contract slice.
- Other order hooks may still have root invalidation and need separate audits.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/orders/order-mutation-invalidation.test.tsx tests/unit/orders/order-amendment-feedback-contract.test.ts tests/unit/orders/order-amendments-wire-types.test.ts tests/unit/orders/order-refactor-smoke.test.ts`
- Passed: `./node_modules/.bin/eslint src/hooks/orders/use-order-amendments.ts tests/unit/orders/order-mutation-invalidation.test.tsx --report-unused-disable-directives`
- Passed: `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`
- Passed: `git diff --check`

### Goal Adaptation

No adaptation needed. This sprint follows the maintainer goal by replacing a broad mutation side effect with a workflow-owned cache contract.

### Residual Risk

Low to medium. The hook now explicitly refreshes the key surfaces previously hidden under `orders.all`, but row-level apply behavior still lacks DB-backed integration proof.
