# Inventory Maintainer Sprint 107: Low-Stock Alert Threshold Cache

## Status

Closed in commit-ready state.

## Issue 1: Low-Stock Alert Reads Sent Thresholds Without Keying Them

### Problem

`useLowStockAlerts` sent `reorderPoint`, `criticalThreshold`, and `locationId` to `getLowStockAlerts`, but the query key only carried the location scope. Operators changing alert thresholds could reuse cached results from a different threshold pair, which makes shortage severity and inclusion look unreliable.

### Workflow Spine

Product/warehouse low-stock alert surface
-> `useLowStockAlerts`
-> `queryKeys.products.stockAlerts`
-> `getLowStockAlerts`
-> inventory quantity and threshold filtering
-> product stock alert mutation invalidation prefix.

### Touched Domains

- Product inventory hook.
- Product query-key factory.
- Product stock alert cache contract tests.
- Inventory sprint evidence.

### Business Value Protected

Low-stock alerts guide replenishment and hold-back decisions for battery stock. Threshold changes should produce threshold-specific cache entries so operators do not see stale warning/critical states after changing alert sensitivity.

### Scope Constraints

- Do not change server low-stock alert filtering, response shape, thresholds, authorization, database predicates, inventory writes, or movement rows.
- Preserve `queryKeys.products.stockAlertsAll()` as the mutation invalidation prefix from Sprint 105.
- Do not change product stock mutation invalidations.
- Do not change UI layout or alert copy.

### Changes

- Added a `ProductStockAlertFilters` query-key type.
- Changed `queryKeys.products.stockAlerts` to accept the full alert filter object.
- Added `alertFilters` in `useLowStockAlerts` and reused it for both query key and server payload.
- Updated the existing product stock alert cache contract to assert threshold/location key coverage and prefix invalidation.

### Standards Checked

- Domain ownership: product stock alert query keys now describe the product alert read contract.
- Route -> container/page -> hook -> server -> schema/database -> query/cache policy: hook key and server payload are aligned; server/schema/database behavior unchanged.
- Tenant isolation/data integrity: no auth, organization predicates, inventory writes, movements, valuation, finance, or serialized lineage behavior changed.
- Query/cache contract: threshold/location-filtered alert reads now have distinct keys while stock mutations still invalidate the alert prefix.
- UI states/error handling: low-stock alert surfaces should refetch by actual threshold configuration rather than showing stale severity/inclusion state.
- Reviewability: one query-key change, one hook mapping change, one contract update, one closeout note.

### Smells Removed

- Alert query key omitted `reorderPoint` and `criticalThreshold` while the server payload used them.
- Alert read key was still named like a simple scope after Sprint 105; it now carries the complete filter contract.

### Deferred

- `getLowStockAlerts` product/location joins should receive a separate tenant-aware relation hardening pass; this sprint intentionally stayed on the read/cache contract.
- Browser QA was not selected because this is a hook/query-key contract fix with no intended layout change.

### Gates

- Passed: focused product stock alert cache contract.
- Passed: focused ESLint on touched query key, hook, and test.
- Passed: `bun run typecheck`.
- Passed: `git diff --check`.

### Goal Adaptation

No adaptation needed. Serialized gates remain retired and this sprint does not change serialized lineage behavior.

### Residual Risk

Low for alert cache correctness. Existing cached entries using the previous location-only key shape will age out naturally.
