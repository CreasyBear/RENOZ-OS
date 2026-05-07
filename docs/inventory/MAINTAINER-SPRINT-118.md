# Inventory Maintainer Sprint 118: Valuation Active Product Descriptors

## Status

Closed in commit-ready state.

## Issue 1: Valuation Reads Could Use Soft-Deleted Product Labels

### Problem

Inventory valuation reads and finance integrity drift rows scoped product descriptor joins to the organization, but did not require active product records. For finance-facing stock truth, hiding archived-product inventory value would be unsafe, but showing archived product labels as current SKU descriptors is also misleading.

### Workflow Spine

Inventory valuation and finance integrity
-> valuation hook/cache contract
-> `getInventoryValuation`, `getInventoryFinanceIntegrity`, `getInventoryAging`
-> tenant-scoped `inventory` and `inventory_cost_layers`
-> active tenant-scoped product descriptors
-> tenant-scoped categories/locations
-> valuation, aging, and drift report rows.

### Touched Domains

- Inventory valuation server function.
- Inventory valuation tenant-scope contract tests.
- Inventory sprint evidence.

### Business Value Protected

Valuation reports support purchasing, stock planning, cash tied up in inventory, and finance reconciliation. They must keep all inventory value visible while avoiding archived product metadata as current operational labels.

### Scope Constraints

- Do not change valuation totals, cost layer calculations, finance integrity calculations, aging buckets, turnover, hooks, query keys, or cache policy.
- Do not change inventory writes, cost-layer writes, weighted-average product-cost writes, finance reconciliation writes, or serialized lineage behavior.
- Preserve archived-product inventory row visibility by using left joins and explicit fallback labels where descriptor records are unavailable.

### Changes

- Added `valuationInventoryProductJoinCondition` for active tenant-scoped inventory-to-product descriptor joins.
- Reused the helper in valuation category, product, and aging reads.
- Changed valuation product breakdown to anchor `productId` and cost-layer joins on `inventory.productId` so rows remain visible without active product descriptors.
- Added active-product filtering to finance integrity drift-row product labels.
- Updated the valuation tenant-scope contract to guard active descriptors and row-preserving fallback behavior.

### Standards Checked

- Domain ownership: valuation descriptor policy is local to the valuation server function.
- Route -> container/page -> hook -> server -> schema/database -> query/cache policy: server descriptor scope hardened; hook/query-key/cache behavior unchanged.
- Tenant isolation/data integrity: inventory and cost-layer rows remain organization-scoped; product labels now require active same-tenant products.
- Finance integrity: valuation totals and drift calculations remain row-preserving; only descriptor enrichment changed.
- Query/cache contract: unchanged; no mutation or invalidation behavior changed.
- UI states/error handling: response shape is stable; archived product descriptors become fallback labels instead of active-looking metadata.
- Reviewability: one helper, three descriptor join updates, one raw SQL descriptor update, one existing contract update, one closeout note.

### Smells Removed

- Repeated ad hoc valuation product descriptor joins.
- Soft-deleted products could enrich valuation category/product/aging rows.
- Soft-deleted products could enrich finance integrity drift rows.

### Deferred

- Weighted-average product-cost write active-product policy remains a separate mutation-scope sprint.
- Explicit archived-product valuation UI state remains a UX/data-policy slice.
- Browser QA was not selected because this is a server descriptor-scope slice with no intended layout change.

### Gates

- Passed: `bunx vitest run tests/unit/inventory/valuation-tenant-scope-contract.test.ts`.
- Passed: focused ESLint on touched server function and test.
- Passed: `bun run typecheck`.
- Passed: `git diff --check`.

### Goal Adaptation

No adaptation needed. Serialized gates remain retired and this sprint does not change serialized lineage behavior.

### Residual Risk

Moderate. Archived-product inventory value remains visible under fallback labels, which protects finance truth but is not ideal UX. A later data-policy slice should decide whether archived product activity should be explicitly labeled, remediated, or blocked from ordinary operational reports.
