# Inventory Maintainer Sprint 188: Movement Read Hook Boundary

## Status

Closed and commit-ready.

## Issue 1: Movement Read Logic Lived Inside the Broad Inventory Hook Module

### Problem

Inventory movement history is the audit trail for warehouse stock truth. It
explains how battery stock changed through receiving, adjustment, transfer,
bulk status changes, stock counts, fulfillment, returns, warranty/RMA recovery,
and finance-adjacent valuation flows.

`useInventoryMovements`, `useMovements`, and `useMovementsDashboard` still lived
inside the broad `use-inventory.ts` module beside list, detail, low-stock,
dashboard, location-utilization, serial-availability, and compatibility
exports. The recent receive, transfer, adjustment, and bulk-status hook
extractions left movement reads as the next obvious hook boundary.

Movement reads are not generic inventory-list behavior. They are operational
evidence. Their hook module should make the query-key/cache contract and
operator-safe read fallback easy to inspect.

### Workflow Spine

Inventory detail, receiving history, analytics, and dashboard movement surfaces
-> `useInventoryMovements` / `useMovements` / `useMovementsDashboard`
-> `listMovements` server function
-> `MovementListQuery` schema/database read
-> `queryKeys.inventory.movements(...)`
-> movement history and dashboard movement evidence for warehouse operators.

### Touched Domains

- Inventory/Warehouse movement read hook boundary.
- Inventory movement read source contracts.
- Inventory movement/dashboard shaped-read tests.

### Business Value Protected

Warehouse operators and Joel can inspect movement history as evidence for how
stock changed without needing to scan the general inventory hook module. This
keeps the audit path for receive, transfer, adjustment, status, stock count,
fulfillment, and RMA activity easier to reason about as RENOZ-V3 keeps moving
toward a saleable and scalable operations platform.

### Scope Constraints

- Do not change `listMovements` server behavior.
- Do not change movement schemas, tenant predicates, database reads, result
  shape, stale times, refetch interval, or query-key shapes.
- Preserve the existing `@/hooks/inventory/use-inventory` compatibility export.
- Do not refactor dashboard, list, detail, low-stock, serial-availability, or
  location-utilization hooks in this sprint.

### Changes

- Added `src/hooks/inventory/use-inventory-movements.ts`.
- Moved `useInventoryMovements`, `useMovements`, and
  `useMovementsDashboard` into the dedicated movement-read hook module.
- Left `use-inventory.ts` as a compatibility re-export for the movement hooks.
- Exported movement read hooks directly from the inventory hook barrel.
- Updated inventory detail to import `useInventoryMovements` from the dedicated
  movement module.
- Updated movement read tests to import the dedicated movement hook module.
- Added source-contract coverage proving movement read orchestration stays out
  of the broad inventory hook module.

### Standards Checked

- Domain ownership: movement read orchestration now has a dedicated
  inventory-owned hook file.
- Route -> container/page -> hook -> server function -> schema/database ->
  query/cache policy: unchanged behavior, clearer hook ownership.
- Tenant isolation/data integrity: unchanged; movement server read contracts
  remain server-owned.
- Transactional inventory/finance integrity: unchanged; this slice only moves
  read hooks and does not alter inventory-changing transactions.
- Serialized lineage continuity: unchanged; movement reads continue to display
  server-owned movement evidence.
- Query/cache contract: unchanged behavior; movement hooks still use
  `queryKeys.inventory.movements(...)`.
- Honest UI states/operator-safe errors: unchanged fallback copy remains
  explicit for movement and dashboard movement read failures.
- Reviewability: the diff is a hook extraction, compatibility export update,
  direct barrel export, source-contract update, and closeout artifact.

### Smells Removed

- Removed movement read orchestration from the broad `use-inventory.ts` module.
- Removed the movement server import and `MovementListQuery` type import from
  `use-inventory.ts`.
- Reduced `use-inventory.ts` from 298 lines before this slice to 216 lines.
- Added a source contract to keep movement read orchestration in its dedicated
  hook boundary.

### Smells Deferred

- `use-inventory.ts` still owns inventory list, search, detail, low-stock,
  dashboard, location-utilization, and available-serial read hooks.
- `src/hooks/inventory/use-locations.ts` remains a large hook module and should
  be reviewed after the remaining `use-inventory.ts` read families are split.
- `src/components/domain/inventory/unified-inventory-dashboard.tsx` and
  `src/components/domain/inventory/views/inventory-detail-view.tsx` remain large
  UI modules.
- `src/server/functions/inventory/valuation.ts` remains a large server module.
- `src/lib/query-keys.ts` remains large and should eventually be split by
  domain while preserving the canonical `queryKeys` surface.
- The build still emits the existing large-chunk warning and `bcrypt` native
  dependency trace note.

### Gates

- Focused movement/query contracts:
  `npm run test:vitest -- tests/unit/inventory/query-normalization-wave3-movements.test.tsx tests/unit/inventory/query-normalization-wave7b.test.tsx tests/unit/inventory/query-key-read-contract.test.ts tests/unit/inventory/stock-in-workflow-trace.test.ts`
  - Passed, 4 files / 20 tests.
- Targeted ESLint:
  `npx eslint src/hooks/inventory/use-inventory-movements.ts src/hooks/inventory/use-inventory.ts src/hooks/inventory/index.ts src/hooks/inventory/use-inventory-detail.ts tests/unit/inventory/query-normalization-wave3-movements.test.tsx tests/unit/inventory/query-normalization-wave7b.test.tsx --report-unused-disable-directives`
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
  - Passed, 744 files / 2445 tests.
- Production build:
  `npm run build`
  - Passed. Existing large-chunk warning and `bcrypt` native dependency trace
    note remain non-blocking warnings.

### Goal Adaptation

No standing goal change. This sprint continues the product-owner goal by moving
another Inventory/Warehouse evidence workflow behind a dedicated hook boundary
while preserving query/cache policy, tenant/data-integrity assumptions, and
operator-safe read states.

### Residual Risk

Low for movement hook behavior because focused movement/read contracts,
targeted ESLint, typecheck, reliability lint, full source lint, full unit suite,
diff check, and build all passed. Medium-low for broader inventory architecture
because `use-inventory.ts` still owns multiple read workflow families and the
inventory UI/server modules still have large mixed-responsibility surfaces.
