# Inventory Maintainer Sprint 131: Reorder Recommendation Purchasable Scope

## Status

Closed in commit-ready state.

## Issue 1: Forecasting Could Recommend Reordering Non-Purchasable Products

### Problem

Purchase-order creation, direct inventory PO creation, and PO receiving now require active purchasable product state. Reorder recommendations still scanned active product rows without checking product `status` or `isPurchasable`.

That meant the forecasting page could recommend a PO for products that the create-PO workflow would later block.

### Workflow Spine

Inventory forecasting
-> reorder recommendation read model
-> product active/purchasable predicate
-> recommendation table
-> create PO from recommendation dialog
-> purchase-order mutation
-> receiving / inventory / finance state.

### Touched Domains

- Inventory forecasting server function.
- Inventory forecasting tenant-scope contract tests.
- Inventory/procurement sprint evidence.

### Business Value Protected

Forecasting recommendations should be actionable procurement advice. Excluding inactive, discontinued, or non-purchasable products keeps operators from chasing recommendations that cannot become valid purchase orders.

### Scope Constraints

- Do not change forecasting write/upsert behavior.
- Do not change recommendation quantity, urgency, stock semantics, location breakdowns, query keys, or cache policy.
- Do not globally hide non-purchasable products from inventory alerting, because they may still require warehouse attention outside procurement.

### Changes

- Reorder recommendations now require:
  - same organization
  - `status = 'active'`
  - `isActive = true`
  - `isPurchasable = true`
  - `deletedAt IS NULL`
- Updated the focused forecasting contract to pin the purchasable recommendation predicate.

### Standards Checked

- Domain ownership: forecasting procurement advice stays in the inventory forecasting server function.
- Route -> container/page -> hook -> server -> schema/database -> query/cache policy: server read model hardened; hook/cache behavior unchanged.
- Tenant isolation/data integrity: product query remains tenant-scoped and now matches purchasable procurement policy.
- Transactional inventory/finance integrity: recommendations are less likely to seed invalid PO and receiving workflows.
- Serialized lineage continuity: no serialized path changed; this is upstream procurement guidance only.
- UI states/error handling: recommendation list now avoids invalid procurement advice instead of relying on dialog submit blocking.
- Reviewability: one predicate refinement, one focused contract update, one closeout note.

### Smells Removed

- Forecasting could recommend reorder actions for products that PO creation would reject.
- Recommendation product policy was weaker than PO creation and receiving policy.

### Deferred

- Existing saved forecasts for non-purchasable products remain as data but no longer surface in reorder recommendations.
- Low-stock/out-of-stock alert rules may still surface non-purchasable products for warehouse awareness; direct create-PO actions remain guarded.
- Browser QA was not selected because this is a server read-model predicate slice with no intended layout change.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/inventory/forecasting-tenant-scope-contract.test.ts`.
- Passed: focused ESLint on touched forecasting server function and test.
- Passed: `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`.
- Passed: `git diff --check`.

### Goal Adaptation

No adaptation needed. Serialized gates remain retired; this sprint is upstream of stock-in and preserves lineage continuity.

### Residual Risk

Low. Reorder recommendations now align with procurement product policy. Other non-forecast product-aware procurement surfaces should be reviewed as separate slices.
