# Inventory Maintainer Sprint 186: Adjustment Hook Boundary

## Status

Closed and commit-ready.

## Issue 1: Adjustment Mutation Logic Lived Inside the Broad Inventory Hook Module

### Problem

`useAdjustInventory` owns the warehouse correction workflow: adjustment server
call, row/product-location rollback snapshots, operator toast feedback,
inventory/product/valuation/availability cache reconciliation, and movement
refresh. That workflow still lived inside the broad `use-inventory.ts` module
beside list/detail/movement/dashboard/status hooks.

Stock adjustment is not a generic inventory-list concern. It changes battery
stock truth and can affect lot, disposition, serialized, valuation, support,
and fulfillment decisions. The hook boundary should make the correction
contract obvious without scanning the whole inventory hook module.

### Workflow Spine

Inventory detail/product stock adjustment surface
-> `useAdjustInventory`
-> `adjustInventory` server function
-> `stockAdjustmentSchema`/database transaction
-> locked inventory row
-> cost-layer write/consume and valuation recompute
-> serialized lineage updates when applicable
-> movement evidence
-> `invalidateInventoryStockMutationQueries`
-> inventory/product/valuation/WMS/availability query-key families.

### Touched Domains

- Inventory/Warehouse adjustment hook boundary.
- Inventory adjustment cache/source contracts.
- Inventory adjustment tenant-scope and stock-action contract tests.

### Business Value Protected

Warehouse operators can correct stock without the client pretending it can
adjust aggregate stock across ambiguous lots, dispositions, or serial rows. The
adjustment path remains refetch-first after the server transaction commits,
which protects physical stock truth, valuation, and movement evidence.

### Scope Constraints

- Do not change adjustment server transaction behavior.
- Do not change adjustment schema validation, source ambiguity policy, quantity
  math, cost-layer behavior, finance integrity, serialized lineage writes, or
  movement evidence.
- Preserve the existing `@/hooks/inventory/use-inventory` compatibility export.
- Do not refactor transfer, receive, status, dashboard, movement, availability,
  or list hooks in this sprint.

### Changes

- Added `src/hooks/inventory/use-adjust-inventory.ts`.
- Moved adjustment-specific mutation orchestration, rollback snapshots,
  operator feedback, stock mutation invalidation, and movement invalidation
  into the dedicated hook file.
- Left `use-inventory.ts` as a compatibility re-export for
  `useAdjustInventory`.
- Exported `useAdjustInventory` directly from the inventory hook barrel.
- Updated adjustment hook tests to import the dedicated hook.
- Added source-contract coverage proving adjustment orchestration stays out of
  the broad inventory hook module.

### Standards Checked

- Domain ownership: adjustment orchestration now has a dedicated inventory-owned
  hook file.
- Route -> container/page -> hook -> server function -> schema/database ->
  query/cache policy: unchanged behavior, clearer hook boundary.
- Tenant isolation/data integrity: unchanged; adjustment server tenant and
  transaction contracts remain covered.
- Transactional inventory/finance integrity: unchanged; row locking,
  cost-layer writes/consumption, valuation recompute, and finance integrity
  remain server-owned.
- Serialized lineage continuity: unchanged; serialized adjustment behavior
  remains server-owned and covered by existing stock mutation contracts.
- Query/cache contract: unchanged behavior; the adjustment hook still uses
  `invalidateInventoryStockMutationQueries` and refetch-first exact row policy.
- Honest UI states/operator-safe errors: adjustment failures still use the
  inventory mutation error formatter and existing stock-action guidance.
- Reviewability: the diff is a hook extraction, compatibility export update,
  source-contract update, and closeout artifact.

### Smells Removed

- Removed adjustment mutation orchestration from the broad `use-inventory.ts`
  module.
- Removed adjustment-specific server import and schema type import from
  `use-inventory.ts`.
- Removed adjustment cache contract commentary from the broad hook file and
  moved it beside the adjustment mutation.
- Added a source contract to keep the correction workflow in its dedicated
  hook boundary.

### Smells Deferred

- `use-inventory.ts` still owns movement, dashboard, location utilization, bulk
  status, and serial availability hooks.
- The product-level adjustment UI can still preview aggregate stock before
  submitting a product/location correction; Sprint 160 intentionally deferred
  that UI truthfulness slice.
- `src/lib/query-keys.ts` remains large and should eventually be split by
  domain while preserving the canonical `queryKeys` surface.
- The build still emits the existing large-chunk warning and `bcrypt` native
  dependency trace note.

### Gates

- Focused adjustment/cache/integrity contracts:
  `npm run test:vitest -- tests/unit/inventory/use-adjust-inventory.test.tsx tests/unit/inventory/stock-mutation-tenant-scope-contract.test.ts tests/unit/inventory/stock-action-error-messages.test.ts tests/unit/inventory/stock-mutation-cache-contract.test.ts`
  - Passed, 4 files / 21 tests.
- Targeted ESLint:
  `npx eslint src/hooks/inventory/use-adjust-inventory.ts src/hooks/inventory/use-inventory.ts src/hooks/inventory/index.ts tests/unit/inventory/use-adjust-inventory.test.tsx --report-unused-disable-directives`
  - Passed.
- Typecheck:
  `npm run typecheck`
  - Passed.
- Reliability lint:
  `npm run lint:reliability`
  - Passed.
- Full source lint:
  `npm run lint`
  - Passed.
- Diff whitespace:
  `git diff --check`
  - Passed.
- Full unit suite:
  `npm run test:unit`
  - Passed, 744 files / 2443 tests.
- Production build:
  `npm run build`
  - Passed. Existing large-chunk warning and `bcrypt` native dependency trace
    note remain non-blocking warnings.

### Goal Adaptation

No standing goal change. This sprint continues the product-owner goal by moving
another high-integrity Inventory/Warehouse stock-changing workflow behind a
dedicated hook boundary while preserving tenant, finance, serialized-lineage,
and cache contracts.

### Residual Risk

Low for adjustment hook behavior because focused adjustment contracts,
typecheck, lint, full unit suite, and build all passed. Medium-low for broader
inventory hook architecture because `use-inventory.ts` still owns several
workflow families and should keep shrinking through domain-sliced extractions.
