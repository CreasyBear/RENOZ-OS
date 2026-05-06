# Orders Maintainer Sprint 43

## Status

Closed in commit-ready state.

## Issue 1: Managed Status Option Query Key Ownership

### Problem

`use-order-status` built managed status option and workflow option query keys inline by appending literals to `queryKeys.orders.detail(orderId)`. The shape was compatible with the detail prefix, but the hook owned part of the cache contract that should live in centralized query keys.

Managed status options are part of the operator-facing order transition workflow. Their read and invalidation keys should be named domain contracts, not repeated hook-local array expressions.

### Workflow Spine

Order detail / fulfillment action surface
-> managed status option hook
-> order status server function
-> centralized order query keys
-> managed status mutation invalidation
-> refreshed next-action/status choices.

### Touched Domains

- Orders query key infrastructure.
- Managed order status option hooks.
- Managed order status mutation invalidation coverage.
- Orders maintainer closeout docs.

### Business Value Protected

Operators need current, trustworthy status choices when moving orders through confirmation, picking, shipping, delivery, rollback, or cancellation paths. Centralized keys reduce the chance that reads and invalidations drift as this workflow grows.

### Scope Constraints

- Do not change order status transition rules, server functions, permissions, inventory allocation/release behavior, shipment behavior, visible UI, or route behavior.
- Keep this as a cache ownership cleanup slice.

### Changes

- Added `queryKeys.orders.managedStatusOptions(orderId)`.
- Added `queryKeys.orders.workflowOptions(orderId)`.
- Updated `useManagedOrderStatusOptions` and `useOrderWorkflowOptions` to use centralized keys.
- Updated managed status mutation invalidation to use the centralized keys.
- Extended `order-mutation-invalidation.test.tsx` to prove managed status changes invalidate both centralized option keys.

### Standards Checked

- Domain ownership: managed status option cache contracts now live in `queryKeys.orders`.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: checked the order status option read and managed status mutation invalidation spine.
- Tenant isolation/data integrity: unchanged; no server functions, database predicates, permissions, schemas, or write contracts touched.
- Query/cache contract: improved by removing hook-local literal child keys.
- Transactional inventory and finance integrity: unchanged; no inventory or finance writes changed.
- Serialized lineage continuity: unchanged; no serial identity, allocation, or lineage behavior changed.
- Honest UI states/operator-safe errors: unchanged at the component layer; status option freshness contract is clearer.
- Reviewability: bounded diff across centralized query keys, one order status hook, one existing mutation test, and this closeout.

### Smells Removed

- Hook-local `managed-status-options` query key construction.
- Hook-local `workflow-options` query key construction.
- Repeated read/write cache key shape inside the status hook.

### Deferred

- Broader order status UI feedback and transition copy remain separate slices.
- Browser QA remains deferred because this slice changes cache ownership without visible layout changes.
- Full `bun run test:unit` and `bun run build` remain deferred to larger release/predeploy sweeps.

### Gates

- Passed: `bun run test:vitest tests/unit/orders/order-mutation-invalidation.test.tsx`.
- Passed: `rg -n "managed-status-options|workflow-options|\\[\\.\\.\\.queryKeys\\.orders\\.detail" src/hooks/orders src/lib/query-keys.ts tests/unit/orders/order-mutation-invalidation.test.tsx`.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Skipped: browser QA, `bun run build`, `bun run test:unit`, `bun run lint:reliability`, finance, document, release, and deploy gates because this slice did not change visible UI, build-time behavior, guarded route/read contracts, financial calculations, document generation, release packaging, or deployment paths.

### Goal Adaptation

Declined. The standing maintainer goal already requires centralized query keys, safe mutation/cache contracts, and reviewable domain-sliced diffs.

### Residual Risk

Low for managed status option cache ownership. Broader order status UX and server transition behavior were intentionally untouched.
