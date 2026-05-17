# Inventory Maintainer Sprint 190: Dashboard Read Hook Boundary

## Status

Closed and commit-ready.

## Issue 1: Inventory Dashboard Reads Lived Inside the Broad Inventory Hook Module

### Problem

`useInventoryDashboard` powers inventory visibility in the unified inventory
dashboard, dashboard overview, business overview, and inventory context. It
surfaces metrics and top movers that help operators understand warehouse stock
health, low-stock pressure, and inventory value.

That read hook still lived inside `use-inventory.ts` beside list, detail,
search, low-stock, location-utilization, and compatibility exports. After the
movement and serial-availability extractions, dashboard metrics were the next
operator-facing read surface to split.

Inventory dashboard reads are not generic list/detail behavior. They are a
warehouse visibility surface and should have a dedicated hook boundary that
makes the server function, read fallback, refresh interval, and dashboard cache
key visible.

### Workflow Spine

Unified inventory dashboard, dashboard overview, business overview, and
inventory context
-> `useInventoryDashboard`
-> `getInventoryDashboard` server function
-> inventory dashboard schema/database read
-> `queryKeys.inventory.dashboard()`
-> stock health metrics and top-moving product visibility.

### Touched Domains

- Inventory/Warehouse dashboard read hook boundary.
- Inventory dashboard shaped-read and source-contract tests.
- Dashboard overview and business overview inventory health imports.

### Business Value Protected

Operators and Joel get inventory health and top-mover visibility through a
dedicated dashboard read path instead of a broad inventory hook module. This
keeps warehouse truth, stock pressure, and business overview signals easier to
inspect as RENOZ-V3 becomes a more reliable operations platform.

### Scope Constraints

- Do not change `getInventoryDashboard` server behavior.
- Do not change dashboard schemas, tenant predicates, database reads, result
  shape, stale time, refresh interval, or query-key shape.
- Preserve the existing `@/hooks/inventory/use-inventory` compatibility export.
- Preserve the inventory hook barrel import used by existing inventory
  dashboard/context consumers.
- Do not refactor WMS dashboard, location-utilization, list, detail, search, or
  low-stock hooks in this sprint.

### Changes

- Added `src/hooks/inventory/use-inventory-dashboard.ts`.
- Moved `useInventoryDashboard` into the dedicated inventory-dashboard hook
  module.
- Left `use-inventory.ts` as a compatibility re-export for
  `useInventoryDashboard`.
- Exported `useInventoryDashboard` directly from the inventory hook barrel.
- Updated dashboard overview and business overview containers to import the
  dedicated dashboard hook directly.
- Updated dashboard normalization tests to import the dedicated dashboard hook.
- Added source-contract coverage proving dashboard read orchestration stays out
  of the broad inventory hook module.

### Standards Checked

- Domain ownership: inventory dashboard metrics now have a dedicated
  inventory-owned hook file.
- Route -> container/page -> hook -> server function -> schema/database ->
  query/cache policy: unchanged behavior, clearer hook ownership.
- Tenant isolation/data integrity: unchanged; dashboard server read contracts
  remain server-owned.
- Transactional inventory/finance integrity: unchanged; this slice only moves a
  read hook and does not alter inventory-changing transactions.
- Serialized lineage continuity: unchanged; this slice does not touch serialized
  inventory identity or lineage writes.
- Query/cache contract: unchanged behavior; the hook still uses
  `queryKeys.inventory.dashboard()`.
- Honest UI states/operator-safe errors: unchanged fallback copy remains
  explicit when dashboard metrics fail.
- Reviewability: the diff is a hook extraction, compatibility export update,
  direct barrel export, two direct consumer import updates, source-contract
  update, and closeout artifact.

### Smells Removed

- Removed dashboard read orchestration from the broad `use-inventory.ts`
  module.
- Removed the dashboard server import from `use-inventory.ts`.
- Reduced `use-inventory.ts` from 186 lines before this slice to 161 lines.
- Added a source contract to keep dashboard reads in their dedicated hook
  boundary.

### Smells Deferred

- `use-inventory.ts` still owns inventory list, search, detail, low-stock, and
  location-utilization hooks.
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

- Focused dashboard/query contracts:
  `npm run test:vitest -- tests/unit/inventory/query-normalization-wave3-dashboard.test.tsx tests/unit/inventory/query-normalization-wave7b.test.tsx tests/unit/shared/query-key-integrity.test.ts tests/unit/inventory/stock-in-workflow-trace.test.ts`
  - Passed, 4 files / 26 tests.
- Targeted ESLint:
  `npx eslint src/hooks/inventory/use-inventory-dashboard.ts src/hooks/inventory/use-inventory.ts src/hooks/inventory/index.ts src/components/domain/dashboard/overview/overview-container.tsx src/components/domain/dashboard/business-overview/business-overview-container.tsx tests/unit/inventory/query-normalization-wave3-dashboard.test.tsx --report-unused-disable-directives`
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
  - Passed, 744 files / 2447 tests.
- Production build:
  `npm run build`
  - Passed. Existing large-chunk warning and `bcrypt` native dependency trace
    note remain non-blocking warnings.

### Goal Adaptation

No standing goal change. This sprint continues the product-owner goal by moving
another Inventory/Warehouse visibility surface behind a dedicated hook boundary
while preserving query/cache policy, tenant/data-integrity assumptions, and
operator-safe read states.

### Residual Risk

Low for inventory dashboard hook behavior because focused dashboard/read
contracts, targeted ESLint, typecheck, reliability lint, full source lint, full
unit suite, diff check, and build all passed. Medium-low for broader inventory
architecture because `use-inventory.ts` still owns several read workflow
families and the inventory UI/server modules still have large
mixed-responsibility surfaces.
