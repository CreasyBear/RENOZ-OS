# Inventory Maintainer Sprint 132: Forecast Write Purchasable Product Guard

## Status

Closed in commit-ready state.

## Issue 1: Forecast Writes Could Target Non-Purchasable Products

### Problem

Sprint 131 scoped reorder recommendations to active purchasable products, but manual forecast upsert and bulk forecast update still accepted any tenant-owned, non-deleted product.

Forecast records feed reorder planning and procurement decisions. Allowing forecasts on inactive, discontinued, or non-purchasable products keeps stale procurement intent alive even when those products cannot become valid purchase orders.

### Workflow Spine

Inventory forecasting write
-> forecast product validation
-> forecast upsert / bulk upsert
-> reorder recommendation read model
-> create PO from recommendation
-> purchase-order mutation / receiving / inventory and finance state.

### Touched Domains

- Inventory forecasting server function.
- Inventory forecasting tenant-scope contract tests.
- Inventory/procurement sprint evidence.

### Business Value Protected

Forecasting should create actionable procurement planning data. Blocking inactive or non-purchasable products at forecast write time keeps planning records aligned with purchase-order policy and reduces stale operator work.

### Scope Constraints

- Do not change forecast schemas, quantities, safety-stock calculations, or recommendation math.
- Do not change list/read query keys or cache policy.
- Do not repair existing saved forecasts for non-purchasable products.
- Do not hide non-purchasable products from non-procurement inventory alerting.

### Changes

- Tightened `forecastProductWhereCondition` to require:
  - same organization
  - `status = 'active'`
  - `isActive = true`
  - `isPurchasable = true`
  - `deletedAt IS NULL`
- Applied the same product-state predicates to bulk forecast product validation.
- Updated the focused forecasting contract test.

### Standards Checked

- Domain ownership: forecast write validation stays in inventory forecasting server functions.
- Route -> container/page -> hook -> server -> schema/database -> query/cache policy: server write boundary hardened; UI and cache behavior unchanged.
- Tenant isolation/data integrity: product validation remains tenant-scoped and now matches procurement policy.
- Transactional inventory/finance integrity: forecast records are less likely to seed invalid PO and receiving workflows.
- Serialized lineage continuity: no serialized path changed; this remains upstream procurement planning.
- UI states/error handling: invalid product state continues to fail closed with not-found semantics.
- Reviewability: one helper predicate update, one bulk predicate update, one focused contract update, one closeout note.

### Smells Removed

- Forecast writes could preserve procurement intent for products no longer purchasable.
- Forecast write policy was weaker than reorder recommendation and PO creation policy.

### Deferred

- Existing stale forecast records are not repaired by this sprint.
- A forecasting UI affordance explaining non-purchasable products is a separate UX slice.
- Browser QA was not selected because this is a server write predicate slice with no intended layout change.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/inventory/forecasting-tenant-scope-contract.test.ts`.
- Passed: focused ESLint on touched forecasting server function and test.
- Passed: `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`.
- Passed: `git diff --check`.

### Goal Adaptation

No adaptation needed. Serialized gates remain retired; this sprint is upstream of stock-in and preserves lineage continuity.

### Residual Risk

Low for new forecast writes. Existing stale forecast records remain possible until handled by a data-quality or cleanup slice.
