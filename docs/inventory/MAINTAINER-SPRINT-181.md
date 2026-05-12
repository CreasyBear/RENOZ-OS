# Inventory Maintainer Sprint 181: Inventory Realtime Cache Scope

## Status

Closed in commit-ready state.

## Issue 1: Inventory Realtime Subscriptions Refreshed the Inventory Root

### Problem

`useInventoryRealtime` subscribed to organization-scoped inventory broadcasts but invalidated `queryKeys.inventory.all` on every broadcast. That protected freshness, but it hid the read surfaces affected by live stock changes and refreshed unrelated inventory-owned families through the root.

### Workflow Spine

Inventory database broadcast
-> `useInventoryRealtime`
-> `useRealtimeBroadcast`
-> explicit inventory/product stock/dashboard query-key families
-> live warehouse, product stock, alert, and dashboard reads.

### Touched Domains

- Inventory realtime hook.
- Inventory realtime cache contract test.
- Inventory sprint evidence.

### Business Value Protected

RENOZ operators rely on live stock and low-stock feedback for warehouse and purchasing decisions. Realtime inventory updates should keep stock lists, details, movements, alerts, product stock surfaces, and dashboard alerts fresh without using an opaque inventory-root refresh.

### Scope Constraints

- Do not change Supabase realtime subscription behavior.
- Do not change notification copy or low-stock alert handling.
- Do not change inventory server reads/writes, stock transactions, valuation, or serialized lineage.
- Keep this slice limited to static query-key families passed to the realtime broadcast wrapper.

### Changes

- Removed `queryKeys.inventory.all` from `useInventoryRealtime`.
- Added explicit inventory list, detail, item, movement, and alert families.
- Added explicit product stock/inventory/stat/alert/movement families affected by stock changes.
- Added a focused source contract preventing inventory/product root regression in the realtime hook.

### Standards Checked

- Domain ownership: inventory realtime owns live stock cache refresh policy.
- Route -> container/page -> hook -> server function -> schema/database -> query/cache policy: the realtime hook now names the cache families it refreshes.
- Tenant isolation/data integrity: unchanged; channel remains organization-scoped.
- Transactional inventory/finance integrity: no stock or valuation writes changed.
- Serialized lineage continuity: no serialized write behavior changed.
- Honest UI/error handling: low-stock and quantity-change notifications remain unchanged.
- Query/cache contract: improved and covered by focused source contract.
- Reviewability: one hook cache-array change, one focused test, one closeout note.

### Smells Removed

- Inventory realtime root invalidation.
- Realtime stock refresh policy that hid product stock/read dependencies.

### Deferred

- Payload-specific detail invalidation would require extending `useRealtimeBroadcast` to accept payload-derived query keys; this sprint intentionally kept the generic wrapper unchanged.
- Orders and pipeline realtime root keys remain separate domain-sliced work.
- Browser/realtime smoke was not selected because this is a static query-key contract slice.

### Gates

- Passed: focused inventory realtime cache contract.
- Passed: focused inventory stock/product cache contracts.
- Passed: focused ESLint on touched realtime hook and contract.
- Passed: full typecheck.
- Passed: `git diff --check`.

### Goal Adaptation

No adaptation needed. This sprint continues local cache-contract cleanup under the standing maintainer goal.

### Residual Risk

Medium. The realtime refresh is explicit but still family-wide because the current broadcast wrapper does not support payload-derived query keys.
