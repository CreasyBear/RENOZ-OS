# Orders Maintainer Sprint 42

## Status

Closed in commit-ready state.

## Issue 1: Fulfillment Query Key Prefix Contract

### Problem

Order fulfillment invalidations used `queryKeys.orders.fulfillment()` as the intended cache root after status, shipment, import, and manual refresh events. The key builder appended an empty string sentinel for the unfiltered key, while the dashboard summary lived at `['orders', 'fulfillment', 'summary']`.

That made the unfiltered fulfillment key a sibling of the summary key instead of its prefix. A successful status update or refresh could therefore miss the fulfillment dashboard summary unless a caller also remembered to invalidate the summary directly.

### Workflow Spine

Order status update / fulfillment refresh
-> centralized order query keys
-> fulfillment root invalidation
-> fulfillment queue and dashboard summary queries
-> operator-visible fulfillment counts and readiness surfaces.

### Touched Domains

- Orders query key infrastructure.
- Fulfillment dashboard cache contract.
- Order status mutation invalidation evidence.
- Orders maintainer closeout docs.

### Business Value Protected

Fulfillment operators use the dashboard summary to understand what is confirmed, picking, ready to ship, shipped, and blocked. Those numbers should refresh whenever order status changes or fulfillment is manually refreshed, without relying on each caller to know every downstream summary key.

### Scope Constraints

- Do not change order status transitions, shipment transitions, fulfillment server reads, picking/shipping behavior, inventory writes, finance persistence, document generation, visible UI, or route behavior.
- Keep this as a centralized query/cache contract fix.

### Changes

- Added `queryKeys.orders.fulfillmentRoot()`.
- Changed unfiltered `queryKeys.orders.fulfillment()` to return the root key instead of a sentinel-terminated key.
- Kept filtered fulfillment queue keys beneath the root.
- Repointed `queryKeys.orders.fulfillmentSummary()` to the fulfillment root.
- Added `order-fulfillment-query-key-contract.test.ts` proving root invalidation catches fulfillment summary and filtered queue keys without leaking to shipment keys.
- Extended `order-mutation-invalidation.test.tsx` so a status update proves fulfillment summary and filtered queue caches are invalidated through the root.

### Standards Checked

- Domain ownership: fulfillment cache shape remains centralized in `queryKeys.orders`.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: checked the order status mutation to fulfillment dashboard summary cache spine.
- Tenant isolation/data integrity: unchanged; no server functions, database predicates, or schemas touched.
- Query/cache contract: improved. The unfiltered fulfillment key now behaves as a true root for fulfillment surfaces.
- Transactional inventory and finance integrity: unchanged; no inventory or finance writes changed.
- Serialized lineage continuity: unchanged; no serial identity, allocation, or lineage behavior changed.
- Honest UI states/operator-safe errors: improved indirectly by reducing stale fulfillment metrics after successful status writes.
- Reviewability: bounded diff across centralized query keys, one existing mutation test, one new contract test, and this closeout.

### Smells Removed

- Empty-string sentinel in a prefix-sensitive fulfillment query key.
- Hidden mismatch between fulfillment invalidation intent and dashboard summary cache shape.
- Caller-dependent summary refresh behavior for status updates.

### Deferred

- Broader fulfillment refresh helpers in components remain as-is; the root key now carries the invariant.
- Browser QA remains deferred because this slice changes cache invalidation semantics without visible layout changes.
- Full `bun run test:unit` and `bun run build` remain deferred to larger release/predeploy sweeps.

### Gates

- Passed: `bun test tests/unit/orders/order-fulfillment-query-key-contract.test.ts`.
- Passed: `bun run test:vitest tests/unit/orders/order-fulfillment-query-key-contract.test.ts tests/unit/orders/order-mutation-invalidation.test.tsx`.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Skipped: browser QA, `bun run build`, `bun run test:unit`, `bun run lint:reliability`, finance, document, release, and deploy gates because this slice did not change visible UI, build-time behavior, guarded route/read contracts, financial calculations, document generation, release packaging, or deployment paths.

### Goal Adaptation

Declined. The standing maintainer goal already covers centralized query keys, safe mutation/cache contracts, honest UI states, and risk-selected evidence. The retired serialized-gate posture remains unchanged and is not part of this unrelated cache-contract slice.

### Residual Risk

Low for fulfillment query key invalidation. Moderate residual risk remains in broader fulfillment dashboard freshness because this slice protects cache shape but does not add browser-level refresh QA or DB-backed integration coverage.
