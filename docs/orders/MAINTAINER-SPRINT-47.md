# Orders Maintainer Sprint 47: Orders Realtime Cache Scope

## Status

Closed in commit-ready state.

## Issue 1: Orders Realtime Subscriptions Refreshed the Orders Root

### Problem

`useOrdersRealtime` subscribed to organization-scoped order broadcasts but invalidated `queryKeys.orders.all` on every update. That refreshed unrelated order templates, amendments, payments, shipments, and other order-owned surfaces even though the broadcast payload represents order row changes.

### Workflow Spine

Orders database broadcast
-> `useOrdersRealtime`
-> `useRealtimeBroadcast`
-> explicit order list/detail/fulfillment/stats/dashboard query-key families
-> live order and fulfillment reads.

### Touched Domains

- Orders realtime hook.
- Orders realtime cache contract test.
- Orders maintainer closeout docs.

### Business Value Protected

RENOZ operators use order and fulfillment screens to track confirmed, processing, shipped, and delivered battery orders. Realtime order row updates should refresh visible order lists, details, fulfillment, stats, and dashboards without hiding the contract behind an order-root refresh.

### Scope Constraints

- Do not change Supabase realtime subscription behavior.
- Do not change order notification copy or status labels.
- Do not change order server reads/writes, fulfillment transactions, payment ledgers, amendments, or shipments.
- Keep this slice limited to static query-key families passed to the realtime broadcast wrapper.

### Changes

- Removed `queryKeys.orders.all` from `useOrdersRealtime`.
- Removed redundant `queryKeys.orders.list({})`, which is already covered by `queryKeys.orders.lists()`.
- Added explicit order detail, fulfillment root, and stats families alongside list, infinite-list, recent-order, and dashboard families.
- Added a focused source contract preventing order-root regression in the realtime hook.

### Standards Checked

- Domain ownership: orders realtime owns live order cache refresh policy.
- Route -> container/page -> hook -> server function -> schema/database -> query/cache policy: the realtime hook now names affected order cache families.
- Tenant isolation/data integrity: unchanged; channel remains organization-scoped.
- Transactional inventory/finance integrity: no fulfillment, inventory, payment, or finance writes changed.
- Serialized lineage continuity: not touched.
- Honest UI/error handling: order realtime toasts remain unchanged.
- Query/cache contract: improved and covered by focused source contract.
- Reviewability: one hook cache-array change, one focused test, one closeout note.

### Smells Removed

- Orders realtime root invalidation.
- Redundant concrete list invalidation next to the order list prefix.

### Deferred

- Payload-specific `orders.detail(record.id)` invalidation would require extending `useRealtimeBroadcast` to accept payload-derived query keys.
- Pipeline realtime root keys remain separate domain-sliced work.
- Browser/realtime smoke was not selected because this is a static query-key contract slice.

### Gates

- Passed: focused orders realtime cache contract.
- Passed: focused order list/fulfillment cache contracts.
- Passed: focused ESLint on touched realtime hook and contract.
- Passed: full typecheck.
- Passed: `git diff --check`.

### Goal Adaptation

No adaptation needed. This sprint continues local cache-contract cleanup under the standing maintainer goal.

### Residual Risk

Medium. The realtime refresh is explicit but still family-wide because the broadcast wrapper does not support payload-derived query keys.
