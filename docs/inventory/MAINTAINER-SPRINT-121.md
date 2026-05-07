# Inventory Maintainer Sprint 121: Serialized Item Active Product Scope

## Status

Closed in commit-ready state.

## Issue 1: Serialized Item Reads and Product Assignment Could Use Soft-Deleted Products

### Problem

Serialized item list/detail reads and create/update product validation scoped products to the organization, but did not require active product records. Serialized lineage rows should remain visible, but archived product descriptors should not appear as current SKU context, and new manual serial assignments should not point at archived products.

### Workflow Spine

Serialized item list/detail/create/update
-> serialized item hooks/cache contract
-> `listSerializedItems`, `getSerializedItem`, `createSerializedItem`, `updateSerializedItem`
-> tenant-scoped `serialized_items`
-> active tenant-scoped product descriptors or validation
-> tenant-scoped inventory/location/receipt/order/shipment/warranty/RMA references
-> serialized lineage rows and timelines.

### Touched Domains

- Inventory serialized item server function.
- Inventory serialized item tenant-scope contract tests.
- Inventory sprint evidence.

### Business Value Protected

Serial lineage supports warranty, RMA, support, fulfillment, and inventory traceability. Operators need archived-product serial history to remain visible, but current labels and manual assignments must not treat archived SKUs as active operational products.

### Scope Constraints

- Do not change serialized item filters, pagination, lifecycle state rules, event creation, allocation release, delete safeguards, response shape, hooks, query keys, or cache policy.
- Do not change order, shipment, warranty, RMA, inventory, valuation, finance, or serialized lineage event continuity behavior.
- Preserve left-join read behavior so lineage rows remain visible when an active product descriptor is unavailable.

### Changes

- Added `serializedProductJoinCondition` for active tenant-scoped serialized item product descriptors.
- Added `serializedProductWhereCondition` for active tenant-scoped product validation.
- Reused the descriptor helper in serialized item list count, list rows, and detail rows.
- Reused the validation helper in serialized item create and update.
- Updated the existing serialized item tenant-scope contract to guard active product descriptors and product assignment validation.

### Standards Checked

- Domain ownership: serialized product descriptor and assignment policy is local to the serialized item server function.
- Route -> container/page -> hook -> server -> schema/database -> query/cache policy: server read/mutation predicates hardened; hook/query-key/cache behavior unchanged.
- Tenant isolation/data integrity: serialized rows remain organization-scoped; product labels and assignments now require active same-tenant products.
- Serialized lineage continuity: event creation, allocation release, deletion safeguards, and reference subqueries are unchanged.
- Query/cache contract: unchanged; no mutation invalidation behavior changed.
- UI states/error handling: response shape is stable; archived product labels become null and archived assignment attempts use the existing product not found path.
- Reviewability: two helpers, five predicate replacements, one existing contract update, one closeout note.

### Smells Removed

- Repeated ad hoc serialized product joins.
- Repeated ad hoc serialized product validation predicates.
- Soft-deleted products could label serialized item reads.
- Soft-deleted products could be assigned to manually created or updated serialized items.

### Deferred

- Explicit archived-product serialized lineage UI state remains a UX/data-policy slice.
- Broader serialized item server decomposition remains separate.
- Browser QA was not selected because this is a server descriptor/validation-scope slice with no intended layout change.

### Gates

- Passed: `bunx vitest run tests/unit/inventory/serialized-item-tenant-scope-contract.test.ts`.
- Passed: focused ESLint on touched server function and test.
- Passed: `bun run typecheck`.
- Passed: `git diff --check`.

### Goal Adaptation

No adaptation needed. Serialized gates remain retired; this sprint preserves serialized lineage continuity and only changes product descriptor/assignment scope.

### Residual Risk

Moderate. Existing serialized rows tied to archived products remain visible with null product labels. A later UX/data-policy slice should decide whether to explicitly label those rows as archived-product lineage.
