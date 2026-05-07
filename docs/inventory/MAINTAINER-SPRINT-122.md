# Inventory Maintainer Sprint 122: Forecast Active Product Scope

## Status

Closed in commit-ready state.

## Issue 1: Forecast Reads and Writes Could Use Soft-Deleted Products

### Problem

Forecast product reads, manual forecast upserts, bulk forecast upserts, and safety stock calculation verified tenant product ownership but did not require active product records. Reorder recommendations filtered `isActive`, but still did not exclude soft-deleted products.

### Workflow Spine

Inventory forecasting
-> forecast hooks/cache contract
-> `getProductForecast`, `upsertForecast`, `bulkUpdateForecasts`, `calculateSafetyStock`, `getReorderRecommendations`
-> active tenant-scoped products
-> tenant-scoped forecasts and inventory
-> forecast, safety stock, and reorder planning outputs.

### Touched Domains

- Inventory forecasting server function.
- Inventory forecasting tenant-scope contract tests.
- Inventory sprint evidence.

### Business Value Protected

Forecasting drives purchasing and stock planning. Archived products should not receive new forecasts, safety-stock calculations, or reorder recommendations that make them look operationally active.

### Scope Constraints

- Do not change forecast math, historical demand calculation, allocatable-stock semantics, reorder urgency rules, response shape, hooks, query keys, or cache policy.
- Do not change inventory writes, movements, valuation, finance, or serialized lineage behavior.
- Keep existing not-found behavior for missing, cross-tenant, or archived products.

### Changes

- Added `forecastProductWhereCondition` for active tenant-scoped product validation.
- Reused the helper in product forecast reads, single forecast upserts, and safety stock calculation.
- Required bulk forecast product validation to exclude soft-deleted products.
- Required reorder recommendations to exclude soft-deleted products while preserving the existing `isActive` filter.
- Updated the existing forecasting tenant-scope contract to guard active product validation and recommendation scope.

### Standards Checked

- Domain ownership: forecasting product-scope policy is local to the forecasting server function.
- Route -> container/page -> hook -> server -> schema/database -> query/cache policy: server validation and recommendation scopes hardened; hook/query-key/cache behavior unchanged.
- Tenant isolation/data integrity: forecast rows and inventory rows remain organization-scoped; planning actions now require active same-tenant products.
- Query/cache contract: unchanged; no mutation invalidation behavior changed.
- UI states/error handling: response shape is stable; archived products use the existing product not found path.
- Reviewability: one helper, five predicate updates, one existing contract update, one closeout note.

### Smells Removed

- Repeated ad hoc product validation predicates in forecasting.
- Soft-deleted products could receive manual or bulk forecasts.
- Soft-deleted products could receive safety stock calculations.
- Soft-deleted products could appear in reorder recommendations despite `isActive`.

### Deferred

- Existing forecast rows tied to archived products remain a data remediation/UX-policy slice.
- Forecast listing still returns stored forecast rows without product descriptors; deciding whether to hide archived-product forecasts is a separate product policy decision.
- Browser QA was not selected because this is a server validation/planning-scope slice with no intended layout change.

### Gates

- Passed: `bunx vitest run tests/unit/inventory/forecasting-tenant-scope-contract.test.ts`.
- Passed: focused ESLint on touched server function and test.
- Passed: `bun run typecheck`.
- Passed: `git diff --check`.

### Goal Adaptation

No adaptation needed. Serialized gates remain retired and this sprint does not change serialized lineage behavior.

### Residual Risk

Moderate. Existing stored forecasts can still reference archived product IDs until a remediation or listing-policy slice decides how to surface or retire them.
