# Inventory Maintainer Sprint 134: Positive Adjustment Product Guard

## Status

Closed in commit-ready state.

## Issue 1: Positive Adjustments Could Revive Inactive or Non-Inventory Products

### Problem

Sprint 133 blocked manual receiving from creating live inventory for inactive or non-inventory products. Stock adjustments still loaded only same-tenant, non-deleted product identity before allowing a positive quantity adjustment or creating a new inventory row.

That left a second live-stock write path where inactive, discontinued, or non-inventory products could re-enter warehouse and valuation state outside receiving.

### Workflow Spine

Stock adjustment
-> product availability preflight
-> tenant-scoped inventory row lock
-> positive/new-row adjustment guard
-> inventory quantity update
-> movement, cost-layer, valuation, activity, and optional serialized lineage writes.

### Touched Domains

- Inventory adjustment server function.
- Inventory stock mutation tenant-scope contract tests.
- Inventory sprint evidence.

### Business Value Protected

Operators need adjustments to correct stock, but positive adjustments should not create fresh stock for products that the catalog says are inactive or not inventory-tracked. This keeps warehouse truth and valuation aligned with catalog state while preserving the ability to reduce legacy stock.

### Scope Constraints

- Do not change manual receiving, PO receiving, transfer, valuation, alerts, forecasts, or procurement behavior.
- Do not block negative adjustments against existing inactive/non-inventory stock because that can be the cleanup path.
- Do not change schema validation, location negative-inventory policy, movement shape, cost-layer math, or serialized lineage helpers.
- Do not repair existing inventory rows.

### Changes

- `adjustInventory` now loads product `status`, `isActive`, and `trackInventory`.
- Positive adjustments and adjustment-created inventory rows now require `status = active`, `isActive = true`, and `trackInventory = true`.
- Negative adjustments against existing rows remain allowed.
- Updated the focused stock mutation contract test.

### Standards Checked

- Domain ownership: stock correction policy stays in the inventory adjustment server function.
- Route -> container/page -> hook -> server -> schema/database -> query/cache policy: server mutation boundary hardened; UI, hooks, and cache policy unchanged.
- Tenant isolation/data integrity: product lookup remains same-tenant and soft-delete guarded; final inventory and serialized writes remain organization-scoped.
- Transactional inventory/finance integrity: invalid stock increases are blocked before inventory, movement, cost-layer, valuation, activity, or serialized writes.
- Serialized lineage continuity: serialized adjustment flow remains unchanged after preflight.
- UI states/error handling: server returns an operator-safe validation message for invalid stock increases.
- Query/cache contract: unchanged.
- Reviewability: one server preflight expansion, one conditional guard, one focused contract update, one closeout note.

### Smells Removed

- Adjustment stock-in policy was weaker than manual receiving policy.
- Inactive/non-inventory products could be revived through positive adjustments.
- Negative adjustment cleanup and positive stock creation were not separated as product policies.

### Deferred

- Product detail adjustment UI can still present generic controls; server policy is authoritative.
- Existing inactive/non-inventory stock remains a data-quality/UX policy slice.
- Zero-quantity adjustment behavior remains unchanged.
- Browser QA was not selected because this is a server mutation policy slice with no intended layout change.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/inventory/stock-mutation-tenant-scope-contract.test.ts`.
- Passed: focused ESLint on touched adjustment server function and stock mutation contract test.
- Passed: `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`.
- Passed: `git diff --check`.

### Goal Adaptation

No adaptation needed. Serialized gates remain retired; this sprint preserves lineage continuity by blocking invalid stock increases before serialized writes.

### Residual Risk

Low to moderate. Transfers and negative adjustments retain legacy-stock cleanup behavior by design.
