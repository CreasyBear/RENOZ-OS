# Inventory Maintainer Sprint 158: Transfer Disposition Preservation

## Status

Closed in commit-ready state.

## Issue 1: Transfers Could Launder Damaged Or Quarantined Stock Back To Available

### Problem

Inventory transfers always created destination inventory as `available`, and serialized lineage was also reset to `available`. That made a physical warehouse move double as an implicit disposition cleanup.

For RENOZ Energy battery operations, transfer is a location movement, not a quality decision. Damaged, returned, or quarantined stock must remain visibly damaged, returned, or quarantined after it moves, otherwise support, warranty, warehouse, and dispatch workflows can trust the wrong availability state.

### Workflow Spine

Stock transfer request
-> `stockTransferSchema`
-> `transferInventory`
-> locked source inventory row
-> source disposition resolution
-> destination inventory row lookup/create
-> cost-layer movement
-> serialized lineage upsert
-> movement evidence and finance mutation result.

### Touched Domains

- Inventory transfer server function.
- Serialized lineage transfer status mapping.
- Inventory transfer tenant-scope and integrity contract tests.
- Inventory sprint evidence.

### Business Value Protected

Warehouse moves no longer hide stock condition. A damaged battery, returned unit, or quarantined item stays in its disposition lane after transfer, preserving operator trust in available inventory, support investigations, RMA handling, warranty review, and dispatch readiness.

### Scope Constraints

- Do not change whether non-available stock can be physically transferred.
- Do not change transfer quantity validation, cost-layer movement, finance metadata, or tenant predicates.
- Do not change UI copy or transfer dialog flow.
- Do not merge statuses across destination rows with different dispositions.

### Changes

- Added a transfer destination status resolver that preserves `damaged`, `returned`, and `quarantined` source statuses while defaulting workflow-owned source states to `available`.
- Added serialized lineage mapping so transferred damaged inventory becomes serialized `scrapped`, while returned and quarantined inventory keep matching serialized states.
- Updated serialized destination inserts and updates to write the resolved destination disposition.
- Updated serialized lineage upserts to use the resolved serialized status instead of hard-coded `available`.
- Updated non-serialized destination lookup to include the resolved disposition so destination stock is grouped by product, location, and status.
- Updated non-serialized destination inserts to use the resolved disposition.
- Added static contract coverage that transfer destination writes cannot reintroduce hard-coded `status: 'available'`.

### Standards Checked

- Domain ownership: transfer owns location movement; disposition state is preserved instead of being implicitly normalized.
- Route -> container/page -> hook -> server function -> schema/database -> query/cache policy: this sprint is server-side only and keeps the existing schema/hook/cache contract stable.
- Tenant isolation/data integrity: organization-scoped predicates and row locks remain in place.
- Transactional inventory/finance integrity: all disposition writes remain inside the existing transaction with the cost-layer movement.
- Serialized lineage continuity: lineage status now follows the transferred destination disposition instead of resetting to available.
- UI states/error handling: unchanged; no new operator prompt or error surface introduced.
- Query/cache contract: unchanged.
- Reviewability: small server diff, one contract test, focused gates.

### Smells Removed

- Transfer created false availability for damaged, returned, or quarantined inventory.
- Serialized lineage could contradict the destination inventory disposition after transfer.
- Non-serialized destination grouping ignored status, mixing stock with different dispositions.

### Deferred

- A product decision on whether damaged, returned, or quarantined stock should be transferable at all remains deferred.
- A shared inventory-to-serialized status mapper could reduce duplication with bulk status updates, but that extraction was deferred to avoid widening this slice.
- Browser smoke was skipped because this sprint changes server-side disposition persistence, not a visible UI workflow.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/inventory/transfer-tenant-scope-contract.test.ts tests/unit/inventory/use-transfer-inventory.test.tsx`
- Passed: `./node_modules/.bin/eslint src/server/functions/inventory/transfers.ts tests/unit/inventory/transfer-tenant-scope-contract.test.ts`
- Passed: `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`
- Passed: `git diff --check`

### Goal Adaptation

No adaptation needed. This sprint follows the maintainer goal by preserving a domain invariant in the inventory transfer spine: moving stock must not silently change its business condition.

### Residual Risk

Low for this slice. The main residual policy question is whether certain dispositions should be blocked from transfer rather than preserved during transfer. That should be decided separately with warehouse and support workflow context.
