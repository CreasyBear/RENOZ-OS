# Inventory Maintainer Sprint 189: Available Serial Hook Boundary

## Status

Closed and commit-ready.

## Issue 1: Available Serial Reads Lived Inside the Broad Inventory Hook Module

### Problem

`useAvailableSerials` feeds the serialized picking and fulfillment workflow. It
tells operators which battery serial numbers can still be selected for an order
or mobile pick, and it depends on the inventory serial-availability server
function plus the centralized `availableSerials` query-key family.

That read hook still lived inside `use-inventory.ts` beside list, detail,
low-stock, dashboard, location-utilization, and compatibility exports. After
the movement-read extraction, serial availability was the next high-integrity
read surface to split because it directly affects serialized picking decisions.

Available serial reads are not generic inventory-list behavior. They are a
serialized fulfillment decision surface and should have a dedicated hook
boundary that keeps the server function, fallback copy, stale policy, and cache
key visible.

### Workflow Spine

Order fulfillment pick dialog and mobile picking page
-> `useAvailableSerials`
-> `getAvailableSerials` server function
-> serial availability schema/database read
-> `queryKeys.inventory.availableSerials(productId, locationId)`
-> selectable serialized battery inventory for picking.

### Touched Domains

- Inventory/Warehouse serial availability read hook boundary.
- Orders/Fulfillment serialized picking read surface.
- Mobile picking serial selector read surface.
- Inventory/support shaped-read and source-contract tests.

### Business Value Protected

Operators can pick serialized batteries from an explicit availability read path
that is easier to inspect and maintain. This protects fulfillment accuracy,
serialized lineage continuity, and operator confidence that selected serials
are not already allocated elsewhere.

### Scope Constraints

- Do not change `getAvailableSerials` server behavior.
- Do not change serial availability schemas, tenant predicates, database reads,
  result shape, stale time, or query-key shape.
- Preserve the existing `@/hooks/inventory/use-inventory` compatibility export.
- Preserve the inventory hook barrel import used by order fulfillment and
  mobile picking surfaces.
- Do not refactor serialized item mutations, picking mutations, dashboard,
  location-utilization, list, detail, or low-stock hooks in this sprint.

### Changes

- Added `src/hooks/inventory/use-available-serials.ts`.
- Moved `UseAvailableSerialsOptions` and `useAvailableSerials` into the
  dedicated serial-availability hook module.
- Left `use-inventory.ts` as a compatibility re-export for
  `useAvailableSerials` and `UseAvailableSerialsOptions`.
- Exported `useAvailableSerials` directly from the inventory hook barrel.
- Updated inventory/support normalization tests to import the dedicated
  available-serial hook directly.
- Added source-contract coverage proving serial-availability read orchestration
  stays out of the broad inventory hook module.

### Standards Checked

- Domain ownership: serial availability now has a dedicated inventory-owned
  hook file.
- Route -> container/page -> hook -> server function -> schema/database ->
  query/cache policy: unchanged behavior, clearer hook ownership.
- Tenant isolation/data integrity: unchanged; serial availability tenant scope
  remains server-owned and covered by location-scope contracts.
- Transactional inventory/finance integrity: unchanged; this slice only moves a
  read hook and does not alter inventory-changing transactions.
- Serialized lineage continuity: unchanged; serialized availability still reads
  through `getAvailableSerials` and refreshes through the existing
  `availableSerialsAll` invalidation policy.
- Query/cache contract: unchanged behavior; the hook still uses
  `queryKeys.inventory.availableSerials(productId, locationId)`.
- Honest UI states/operator-safe errors: unchanged fallback copy remains
  explicit when available serial reads fail.
- Reviewability: the diff is a hook extraction, compatibility export update,
  direct barrel export, source-contract update, and closeout artifact.

### Smells Removed

- Removed serial-availability read orchestration from the broad
  `use-inventory.ts` module.
- Removed the serial-availability server import and option type ownership from
  `use-inventory.ts`.
- Reduced `use-inventory.ts` from 216 lines before this slice to 186 lines.
- Added a source contract to keep available-serial reads in their dedicated hook
  boundary.

### Smells Deferred

- `use-inventory.ts` still owns inventory list, search, detail, low-stock,
  dashboard, and location-utilization hooks.
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

- Focused serial availability/query contracts:
  `npm run test:vitest -- tests/unit/inventory-support/query-normalization-wave6g.test.tsx tests/unit/shared/query-key-integrity.test.ts tests/unit/inventory/serial-availability-location-scope-contract.test.ts tests/unit/inventory/serialized-item-tenant-scope-contract.test.ts`
  - Passed, 4 files / 14 tests.
- Targeted ESLint:
  `npx eslint src/hooks/inventory/use-available-serials.ts src/hooks/inventory/use-inventory.ts src/hooks/inventory/index.ts tests/unit/inventory-support/query-normalization-wave6g.test.tsx --report-unused-disable-directives`
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
  - Passed, 744 files / 2446 tests.
- Production build:
  `npm run build`
  - Passed. Existing large-chunk warning and `bcrypt` native dependency trace
    note remain non-blocking warnings.

### Goal Adaptation

No standing goal change. This sprint continues the product-owner goal by moving
another serialized Inventory/Warehouse decision surface behind a dedicated hook
boundary while preserving query/cache policy, tenant/data-integrity assumptions,
and operator-safe read states.

### Residual Risk

Low for available-serial hook behavior because focused serial/query contracts,
targeted ESLint, typecheck, reliability lint, full source lint, full unit suite,
diff check, and build all passed. Medium-low for broader inventory architecture
because `use-inventory.ts` still owns multiple read workflow families and the
inventory UI/server modules still have large mixed-responsibility surfaces.
