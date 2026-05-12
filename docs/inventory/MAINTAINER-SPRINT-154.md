# Inventory Maintainer Sprint 154: Bulk Status Updates Serialized Lineage

## Status

Closed in commit-ready state.

## Issue 1: Bulk Status Updates Did Not Update Serialized Lineage

### Problem

`bulkUpdateStatus` changed inventory row disposition and wrote movement/activity evidence, but serialized inventory rows did not update the canonical `serialized_items` status or append a serialized lineage event.

For battery OEM workflows, serialized identity is part of the operational record. If an operator bulk marks serialized stock as quarantined, returned, damaged, sold, available, or allocated, the canonical serial ledger should reflect that same status decision in the same transaction.

### Workflow Spine

Bulk status request
-> transaction starts
-> organization context is set
-> target inventory rows are organization-scoped and locked
-> allocation guard runs
-> inventory status updates
-> movement audit rows are written
-> serialized rows with serial numbers are upserted to the mapped serialized status
-> serialized status-change events are appended
-> product activity logs are written.

### Touched Domains

- Inventory bulk status update server function.
- Serialized inventory lineage.
- Inventory stock mutation contract tests.
- Inventory sprint evidence.

### Business Value Protected

Serial numbers are battery identity. Operators should not see inventory disposition say one thing while the serialized ledger says another. Quarantine, return, damage, sale, availability, and allocation decisions need a reconstructable serial-level trail.

### Scope Constraints

- Do not change bulk status schemas.
- Do not change allocation guard behavior from Sprint 153.
- Do not change query keys, cache invalidation, or UI.
- Do not redesign serialized status enums.

### Changes

- Added an inventory-status to serialized-status mapper for the bulk status path.
- Mapped `sold` inventory to `shipped` serialized status.
- Mapped `damaged` inventory to `scrapped` serialized status.
- Preserved `returned`, `quarantined`, `allocated`, and `available` statuses where the enums align.
- Upserted serialized item status for serialized inventory rows in the same transaction.
- Appended serialized `status_changed` events for the affected serials.
- Added contract coverage for the mapper and transaction-bound lineage writes.

### Standards Checked

- Domain ownership: bulk inventory status owns inventory disposition and now keeps serialized lineage aligned.
- Route -> container/page -> hook -> server function -> schema/database -> query/cache policy: UI/hook/cache unchanged; server mutation side effects tightened.
- Tenant isolation/data integrity: inventory rows remain organization-scoped and locked; serialized writes use organization ID through the shared lineage helper.
- Transactional inventory/finance integrity: no finance writes in this slice; movement/activity/serialized lineage writes remain transaction-bound.
- Serialized lineage continuity: canonical serialized status and event history now follow bulk inventory status changes.
- UI states/error handling: existing mutation behavior retained.
- Query/cache contract: unchanged.
- Reviewability: one mapper, one serialized update loop, one focused contract assertion.

### Smells Removed

- Bulk status updates changed inventory disposition without serialized lineage continuity.
- Serialized rows could remain stale after operator status changes.

### Deferred

- Product-specific UI copy for the status mapping remains deferred.
- Historical cleanup for previously divergent serialized rows remains deferred.
- More granular status-change reason taxonomy remains deferred.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/inventory/stock-mutation-tenant-scope-contract.test.ts`
- Passed: `./node_modules/.bin/eslint src/server/functions/inventory/status-updates.ts tests/unit/inventory/stock-mutation-tenant-scope-contract.test.ts`
- Passed: `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`
- Passed: `git diff --check`

### Goal Adaptation

No adaptation needed. This sprint follows the inventory/warehouse maintainer goal by keeping serialized battery identity aligned with operator stock status changes.

### Residual Risk

Low for this slice. The status mapper is explicit and local, but historical serialized rows may already contain stale status from older bulk updates.
