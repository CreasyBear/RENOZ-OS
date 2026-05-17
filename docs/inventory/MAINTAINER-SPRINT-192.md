# Inventory Maintainer Sprint 192: Warehouse Location Mutation Boundary

Status: closed and commit-ready.

## Problem

`use-locations.ts` still mixed three different warehouse concerns: the legacy composite location hook, hierarchy/detail read hooks, and focused warehouse location create/update/delete mutation hooks.

The locations page already consumes the focused mutation hooks directly through the inventory barrel, so leaving those mutations inside the legacy composite module made mutation/cache ownership harder to inspect and kept the file larger than the workflow required.

## Workflow Spine Protected

```text
inventory locations page
  -> useCreateWarehouseLocation / useUpdateWarehouseLocation / useDeleteWarehouseLocation
  -> warehouse location server functions
  -> organization-scoped warehouse location writes
  -> queryKeys.locations list/tree/hierarchy/utilization/detail/content invalidation
  -> operator-visible location tree/detail refresh
```

## Touched Domains

- Inventory/Warehouse location mutation hooks.
- Warehouse location query/cache invalidation policy.
- Inventory hook barrel exports.
- Location query-normalization and source-boundary tests.

## Business Value Protected

Warehouse locations are the operating map for receiving, stock counts, picking, RMAs, and support receive workflows. Keeping warehouse location mutations in a focused module makes it easier to reason about which caches refresh after a warehouse structure change, without scanning the legacy location composite hook.

## Changes

- Added `src/hooks/inventory/use-warehouse-location-mutations.ts` for focused warehouse location create/update/delete hooks.
- Moved warehouse location mutation cache invalidation into `invalidateWarehouseLocationMutationQueries`.
- Updated the legacy `useLocations` composite hook to consume the shared invalidation helper.
- Preserved compatibility by re-exporting focused mutation hooks from `use-locations.ts`.
- Exported mutation hooks directly from `src/hooks/inventory/index.ts` under a warehouse location mutation/cache contract comment.
- Updated location tests to import the focused mutation hooks from their owning module and added a source-boundary contract.

## Standards Checked

- Domain ownership: focused warehouse location mutations now have their own hook module.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: location page mutation hooks now map directly to warehouse location server functions and centralized location query keys.
- Tenant isolation: unchanged; server functions remain the organization-scoped authority.
- Transactional integrity: unchanged; this sprint moved client hook ownership and cache invalidation only.
- Serialized lineage: not touched.
- Query/cache contract: preserved for list, tree, hierarchy, utilization, detail, and contents invalidation; root location invalidation remains intentionally avoided.
- Operator-safe errors: preserved through `formatInventoryMutationError` fallback copy.
- Reviewable diff: limited to mutation hook extraction, barrel wiring, test coverage, and this closeout note.

## Smells Removed

- Removed focused warehouse location mutation hook implementations from the legacy `use-locations.ts` composite module.
- Moved repeated location mutation invalidation policy into one named helper.
- Reduced `use-locations.ts` from 722 lines to 650 lines.
- Added a source-boundary test so focused warehouse location mutations do not drift back into the legacy composite module.

## Smells Deferred

- `use-locations.ts` still owns legacy composite list/detail/contents state, mapper helpers, hierarchy/detail read hooks, and location suggestion logic.
- Hierarchy/detail read hooks still live at the bottom of `use-locations.ts`; they can be extracted later if a location page read-state or route boundary change needs it.
- `src/components/domain/inventory/unified-inventory-dashboard.tsx`, `src/components/domain/inventory/views/inventory-detail-view.tsx`, `src/server/functions/inventory/valuation.ts`, and `src/lib/query-keys.ts` remain larger architecture pressure points.
- Production build was not rerun because this was a hook-boundary extraction covered by typecheck, lint, reliability guards, focused tests, and the full unit suite.

## Verification

- `git diff --check` passed.
- `npm run test:vitest -- tests/unit/inventory/query-normalization-wave3-locations.test.tsx tests/unit/inventory/location-permission-contract.test.ts tests/unit/shared/query-key-integrity.test.ts` passed, 3 files / 20 tests.
- `./node_modules/.bin/eslint src/hooks/inventory/use-warehouse-location-mutations.ts src/hooks/inventory/use-locations.ts src/hooks/inventory/index.ts tests/unit/inventory/query-normalization-wave3-locations.test.tsx --report-unused-disable-directives` passed.
- `npm run lint:reliability` passed.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run test:unit` passed, 744 files / 2450 tests.

## Goal Adaptation

No standing goal change. This sprint continues the product-owner goal by making a warehouse mutation/cache contract explicit and reducing mixed ownership in the inventory hook layer.

## Residual Risk

Low risk for this slice because server functions, schemas, tenant predicates, and UI behavior are unchanged. Medium residual architecture risk remains in the legacy location composite hook and larger inventory dashboard/detail/valuation surfaces.
