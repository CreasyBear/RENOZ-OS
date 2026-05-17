# Inventory Maintainer Sprint 187: Bulk Status Hook Boundary

## Status

Closed and commit-ready.

## Issue 1: Bulk Status Mutation Logic Lived Inside the Broad Inventory Hook Module

### Problem

`useBulkUpdateInventoryStatus` owns an operator-facing inventory disposition
workflow: bulk status server call, domain-specific blocker copy, stock mutation
cache reconciliation, movement refresh, and serialized/product stock invalidation.
That workflow still lived inside `use-inventory.ts` beside read hooks for
inventory lists, details, movements, dashboard, locations, and available serials.

Bulk status updates are not generic inventory-list behavior. Changing battery
stock to quarantined, damaged, returned, or another disposition affects
warehouse truth, serialized availability, movement evidence, allocation safety,
support recovery, warranty review, and dispatch readiness. The hook boundary
should make that product risk clear.

### Workflow Spine

Inventory browser bulk operation
-> `useBulkUpdateInventoryStatus`
-> `bulkUpdateStatus` server function
-> `bulkUpdateStatusSchema`/database transaction
-> locked inventory rows and workflow-owner guards
-> row disposition updates
-> movement/activity evidence
-> serialized lineage updates when applicable
-> `invalidateInventoryStockMutationQueries`
-> inventory/product/valuation/WMS/availability/serialized query-key families.

### Touched Domains

- Inventory/Warehouse bulk status hook boundary.
- Inventory browser bulk status cache/source contracts.
- Inventory status update tenant-scope and cache contract tests.

### Business Value Protected

Warehouse operators can quarantine, damage-mark, or otherwise update multiple
inventory rows without stale stock, serialized picker, WMS, product inventory,
or movement views hiding the result. Status updates keep operator-safe blocker
copy for allocated or workflow-owned stock, so bulk actions do not imply that
allocation or fulfillment safeguards can be bypassed.

### Scope Constraints

- Do not change status update server transaction behavior.
- Do not change status schema validation, allocation/workflow guards,
  serialized lineage writes, movement evidence, or result shape.
- Preserve the existing `@/hooks/inventory/use-inventory` compatibility export.
- Do not refactor adjustment, transfer, receive, dashboard, movement,
  availability, or list hooks in this sprint.

### Changes

- Added `src/hooks/inventory/use-bulk-update-inventory-status.ts`.
- Moved bulk status mutation orchestration, operator feedback, stock mutation
  invalidation, and blocker copy into the dedicated hook file.
- Changed the hook to import `bulkUpdateStatus` directly from the inventory
  status-update server module instead of the broader inventory facade.
- Left `use-inventory.ts` as a compatibility re-export for
  `useBulkUpdateInventoryStatus` and `BulkUpdateInventoryStatusInput`.
- Exported `useBulkUpdateInventoryStatus` directly from the inventory hook
  barrel.
- Updated bulk status hook tests to import the dedicated hook and mock the
  status-update server module directly.
- Added source-contract coverage proving bulk status orchestration stays out
  of the broad inventory hook module.

### Standards Checked

- Domain ownership: bulk status orchestration now has a dedicated
  inventory-owned hook file.
- Route -> container/page -> hook -> server function -> schema/database ->
  query/cache policy: the route/page continues to use the inventory hook export,
  while the hook now points at the status-update server module directly.
- Tenant isolation/data integrity: unchanged; status-update server tenant and
  workflow-owner contracts remain covered.
- Transactional inventory/finance integrity: unchanged; status changes remain
  server-owned and transaction-backed.
- Serialized lineage continuity: unchanged; serialized status updates and cache
  refreshes remain covered by status/cache contracts.
- Query/cache contract: unchanged behavior; the hook still uses
  `invalidateInventoryStockMutationQueries` with movement refresh.
- Honest UI states/operator-safe errors: allocated and workflow-owned blockers
  still map to explicit operator guidance.
- Reviewability: the diff is a hook extraction, direct server-module import,
  compatibility export update, source-contract update, and closeout artifact.

### Smells Removed

- Removed bulk status mutation orchestration from the broad `use-inventory.ts`
  module.
- Removed mutation-only TanStack Query imports, toast/error helpers, stock
  mutation cache import, and status server import from `use-inventory.ts`.
- Removed status update type ownership from the broad inventory hook file.
- Replaced the broader inventory facade import with the status-update server
  module at the hook boundary.
- Added a source contract to keep disposition-change orchestration in its
  dedicated hook boundary.

### Smells Deferred

- `use-inventory.ts` still owns movement, dashboard, location utilization, and
  serial availability hooks.
- The inventory browser bulk operation UI remains a future candidate for
  stronger selection summaries and consequence copy.
- `src/lib/query-keys.ts` remains large and should eventually be split by
  domain while preserving the canonical `queryKeys` surface.
- The build still emits the existing large-chunk warning and `bcrypt` native
  dependency trace note.

### Gates

- Focused bulk status/cache/browser contracts:
  `npm run test:vitest -- tests/unit/inventory/use-bulk-update-inventory-status.test.tsx tests/unit/inventory/stock-mutation-tenant-scope-contract.test.ts tests/unit/inventory/stock-mutation-cache-contract.test.ts tests/unit/inventory/query-normalization-wave3-browser.test.tsx`
  - Passed, 4 files / 21 tests.
- Targeted ESLint:
  `npx eslint src/hooks/inventory/use-bulk-update-inventory-status.ts src/hooks/inventory/use-inventory.ts src/hooks/inventory/index.ts tests/unit/inventory/use-bulk-update-inventory-status.test.tsx --report-unused-disable-directives`
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
  - Passed, 744 files / 2444 tests.
- Production build:
  `npm run build`
  - Passed. Existing large-chunk warning and `bcrypt` native dependency trace
    note remain non-blocking warnings.

### Goal Adaptation

No standing goal change. This sprint continues the product-owner goal by moving
another high-integrity Inventory/Warehouse operator mutation behind a dedicated
hook boundary while preserving tenant, serialized-lineage, operator-error, and
cache contracts.

### Residual Risk

Low for bulk status hook behavior because focused status/cache/browser
contracts, typecheck, lint, full unit suite, and build all passed. Medium-low
for broader inventory hook architecture because `use-inventory.ts` still owns
several read workflow families and should keep shrinking through domain-sliced
extractions.
