# Inventory Maintainer Sprint 124: Manual Receive Active Product Preflight

## Status

Closed in commit-ready state.

## Issue 1: Manual Receive Could Stock-In Soft-Deleted Products

### Problem

`receiveInventory` verified product tenant ownership before creating inventory, movements, cost layers, activity, and serialized lineage records, but it did not require the product to be active. A soft-deleted SKU could still be manually received into stock.

### Workflow Spine

Manual non-PO receiving
-> receiving hook/cache contract
-> `receiveInventory`
-> active tenant-scoped product preflight
-> tenant-scoped location
-> transactional inventory upsert
-> movement, cost layer, activity, finance result, and optional serialized lineage.

### Touched Domains

- Inventory receiving server function.
- Inventory stock mutation tenant-scope contract tests.
- Inventory sprint evidence.

### Business Value Protected

Manual receiving creates live stock and valuation. Operators should not be able to bring archived SKUs back into operational inventory by receiving them manually.

### Scope Constraints

- Do not change receive schema, serialized receive validation, location validation, inventory upsert behavior, movement creation, cost-layer creation, activity logging, finance metadata, hooks, query keys, or cache policy.
- Do not change purchase-order receiving, transfer, adjustment, valuation, alerts, forecasts, or serialized lineage helpers.
- Keep the existing product not found behavior for missing, cross-tenant, or archived products.

### Changes

- Added `isNull(products.deletedAt)` to the manual receive product preflight.
- Updated the existing stock mutation tenant-scope contract to guard active product preflight before manual stock-in.

### Standards Checked

- Domain ownership: manual receive product validation stays inside the receiving server function.
- Route -> container/page -> hook -> server -> schema/database -> query/cache policy: server preflight hardened; hook/query-key/cache behavior unchanged.
- Tenant isolation/data integrity: product validation now requires same tenant and active record state.
- Transactional inventory/finance integrity: transaction body, cost-layer creation, recomputation, and finance result behavior unchanged.
- Serialized lineage continuity: serialized upsert/event references are preserved and unchanged.
- UI states/error handling: archived products use the existing product not found path.
- Reviewability: one predicate update, one existing contract update, one closeout note.

### Smells Removed

- Soft-deleted products could pass manual receiving preflight.
- Manual receive could create inventory, movement, finance, and serialized lineage records for archived SKUs.

### Deferred

- Purchase-order receiving active-product policy remains a supplier/PO-domain slice.
- Existing inventory rows for archived products remain a UX/data-policy slice.
- Browser QA was not selected because this is a server mutation predicate slice with no intended layout change.

### Gates

- Passed: `bunx vitest run tests/unit/inventory/stock-mutation-tenant-scope-contract.test.ts`.
- Passed: focused ESLint on touched server function and test.
- Passed: `bun run typecheck`.
- Passed: `git diff --check`.

### Goal Adaptation

No adaptation needed. Serialized gates remain retired; this sprint preserves serialized lineage continuity and only changes product preflight.

### Residual Risk

Low. Manual receiving now rejects archived products before transaction-side stock and finance mutations. PO receiving still needs its own domain-specific review.
