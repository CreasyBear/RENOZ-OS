# Inventory Maintainer Sprint 185: Transfer Hook Boundary

## Status

Closed and commit-ready.

## Issue 1: Transfer Mutation Logic Lived Inside the Broad Inventory Hook Module

### Problem

`useTransferInventory` owns a distinct warehouse stock movement workflow:
transfer server call, row/serial-scoped rollback snapshots, operator toast
feedback, product/inventory/valuation/serialized cache reconciliation, and
movement refresh. That workflow still lived inside the broad `use-inventory.ts`
module alongside list/detail/movement/dashboard/adjust/status hooks.

Warehouse transfer is a high-trust RENOZ stock operation. Moving lithium-ion
battery stock between locations must preserve tenant scope, disposition,
cost-layer continuity, serialized lineage, and movement evidence. The hook
boundary should make that contract visible without reading the whole inventory
hook module.

### Workflow Spine

Inventory detail/product stock transfer surface
-> `useTransferInventory`
-> `transferInventory` server function
-> `stockTransferSchema`/database transaction
-> source/destination inventory rows
-> cost-layer movement and valuation recompute
-> serialized lineage events
-> movement evidence
-> `invalidateInventoryStockMutationQueries`
-> inventory/product/valuation/WMS/availability/serialized query-key families.

### Touched Domains

- Inventory/Warehouse transfer hook boundary.
- Inventory transfer cache/source contracts.
- Inventory transfer tenant-scope and integrity contract tests.

### Business Value Protected

Warehouse operators can move battery stock between bins, dispatch shelves,
quarantine areas, recovery locations, and warehouses without the UI pretending
it can safely patch aggregate stock math. The transfer path remains
refetch-first for exact source/destination truth, which protects stock
availability, disposition state, valuation, and serialized traceability.

### Scope Constraints

- Do not change transfer server transaction behavior.
- Do not change transfer schema validation, required reason policy, quantity
  math, cost-layer movement, finance integrity, serialized lineage writes, or
  movement evidence.
- Preserve the existing `@/hooks/inventory/use-inventory` compatibility export.
- Do not refactor adjust, status, dashboard, movement, availability, or list
  hooks in this sprint.

### Changes

- Added `src/hooks/inventory/use-transfer-inventory.ts`.
- Moved transfer-specific mutation orchestration, rollback snapshots, operator
  feedback, stock mutation invalidation, and movement invalidation into the
  dedicated hook file.
- Left `use-inventory.ts` as a compatibility re-export for
  `useTransferInventory`.
- Exported `useTransferInventory` directly from the inventory hook barrel.
- Updated transfer hook tests to import the dedicated hook.
- Updated source-contract tests so transfer row/serial cache behavior is bound
  to the dedicated transfer hook instead of splitting `use-inventory.ts`.
- Removed a stale manual-receive comment left in `use-inventory.ts`.

### Standards Checked

- Domain ownership: transfer orchestration now has a dedicated inventory-owned
  hook file.
- Route -> container/page -> hook -> server function -> schema/database ->
  query/cache policy: unchanged behavior, clearer hook boundary.
- Tenant isolation/data integrity: unchanged; transfer server tenant predicates
  and transaction contracts remain covered.
- Transactional inventory/finance integrity: unchanged; cost-layer movement,
  valuation recompute, and finance mutation success remain server-owned and
  covered by transfer contracts.
- Serialized lineage continuity: unchanged; serialized transfer invalidation
  and lineage continuity remain covered by transfer contracts.
- Query/cache contract: unchanged behavior; the transfer hook still uses
  `invalidateInventoryStockMutationQueries` and refetch-first exact row policy.
- Honest UI states/operator-safe errors: transfer failures still use the
  inventory mutation error formatter and transfer success/failure toasts.
- Reviewability: the diff is a hook extraction, compatibility export update,
  contract update, and closeout artifact.

### Smells Removed

- Removed transfer mutation orchestration from the broad `use-inventory.ts`
  module.
- Removed transfer-specific server import and schema type import from
  `use-inventory.ts`.
- Removed a brittle source-contract split that depended on the transfer hook
  living before a manual-receive comment in `use-inventory.ts`.
- Removed a stale `Receive new inventory stock` comment from the transfer/movement
  boundary.

### Smells Deferred

- `use-inventory.ts` still owns adjustment, movement, dashboard, location
  utilization, bulk status, and serial availability hooks.
- `src/lib/query-keys.ts` remains large and should eventually be split by
  domain while preserving the canonical `queryKeys` surface.
- Large inventory UI surfaces, especially the unified dashboard and detail view,
  remain future extraction candidates.
- The build still emits the existing large-chunk warning and `bcrypt` native
  dependency trace note.

### Gates

- Focused transfer/cache/integrity contracts:
  `npm run test:vitest -- tests/unit/inventory/use-transfer-inventory.test.tsx tests/unit/inventory/transfer-tenant-scope-contract.test.ts tests/unit/inventory/stock-transfer-reason-contract.test.ts tests/unit/inventory/stock-mutation-cache-contract.test.ts`
  - Passed, 4 files / 16 tests.
- Targeted ESLint:
  `npx eslint src/hooks/inventory/use-transfer-inventory.ts src/hooks/inventory/use-inventory.ts src/hooks/inventory/index.ts tests/unit/inventory/use-transfer-inventory.test.tsx tests/unit/inventory/transfer-tenant-scope-contract.test.ts --report-unused-disable-directives`
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
  - Passed, 744 files / 2442 tests.
- Production build:
  `npm run build`
  - Passed. Existing large-chunk warning and `bcrypt` native dependency trace
    note remain non-blocking warnings.

### Goal Adaptation

No standing goal change. This sprint continues the product-owner goal by taking
a high-integrity Inventory/Warehouse workflow out of a broad hook module while
preserving tenant, finance, serialized-lineage, and cache contracts.

### Residual Risk

Low for transfer hook behavior because focused transfer contracts, typecheck,
lint, full unit suite, and build all passed. Medium-low for broader inventory
hook architecture because `use-inventory.ts` still owns multiple workflow
families and should keep shrinking through domain-sliced extractions.
