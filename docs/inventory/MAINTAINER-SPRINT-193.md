# Inventory Maintainer Sprint 193: Warehouse Location Read Boundary

Status: closed and commit-ready.

## Problem

After the warehouse location mutation extraction, `use-locations.ts` still owned route-facing focused read hooks for hierarchy and detail at the bottom of the legacy composite hook module.

The inventory locations page consumes `useLocationHierarchy` and `useLocationDetail` as focused read hooks through the inventory barrel. Keeping those route-facing reads inside the legacy composite module made the hook file continue to mix page reads, legacy composite state, mapper helpers, and compatibility exports.

## Workflow Spine Protected

```text
inventory locations page
  -> useLocationHierarchy / useLocationDetail
  -> warehouse location server read functions
  -> organization-scoped warehouse location hierarchy/detail read models
  -> queryKeys.locations.hierarchy(rootId) / queryKeys.locations.detail(locationId)
  -> operator-visible location tree and detail panel
```

## Touched Domains

- Inventory/Warehouse location hierarchy and detail read hooks.
- Inventory hook barrel exports.
- Location query-normalization and source-boundary tests.

## Business Value Protected

The locations page is the operator map for receiving, stock placement, counts, picking, and return handling. Keeping hierarchy and detail reads in a focused module makes that page's read path easier to inspect and reduces the cost of future warehouse UX or error-state work.

## Changes

- Added `src/hooks/inventory/use-warehouse-location-reads.ts` for focused hierarchy/detail read hooks.
- Removed hierarchy/detail read hook implementations from `src/hooks/inventory/use-locations.ts`.
- Preserved compatibility by re-exporting hierarchy/detail hooks from `use-locations.ts`.
- Exported hierarchy/detail hooks directly from `src/hooks/inventory/index.ts` under a warehouse location read/cache contract comment.
- Added runtime coverage for focused hierarchy/detail read hooks and source-boundary coverage to keep them outside the legacy composite module.

## Standards Checked

- Domain ownership: route-facing warehouse location reads now have a focused hook module.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: the locations page read hooks map directly to warehouse read server functions and centralized location query keys.
- Tenant isolation: unchanged; server functions remain the organization-scoped authority.
- Transactional integrity: unchanged; this is a read-only boundary extraction.
- Serialized lineage: not touched.
- Query/cache contract: preserved for `queryKeys.locations.hierarchy(rootId)` and `queryKeys.locations.detail(locationId)`.
- Operator-safe errors: unchanged; this sprint does not alter read error policy.
- Reviewable diff: limited to read hook extraction, barrel wiring, focused tests, and this closeout note.

## Smells Removed

- Removed focused hierarchy/detail read hook implementations from the legacy `use-locations.ts` composite module.
- Removed route-facing warehouse read server-function imports from `use-locations.ts`.
- Reduced `use-locations.ts` from 650 lines to 620 lines.
- Added a source-boundary test so focused warehouse location reads do not drift back into the legacy composite module.

## Smells Deferred

- `use-locations.ts` still owns legacy composite list/detail/contents state, mapper helpers, and location suggestion logic.
- The composite hook still imports location create/update/delete server functions for backwards-compatible actions; future slices should only extract those after deciding how much legacy composite behavior is still needed.
- `src/components/domain/inventory/unified-inventory-dashboard.tsx`, `src/components/domain/inventory/views/inventory-detail-view.tsx`, `src/server/functions/inventory/valuation.ts`, and `src/lib/query-keys.ts` remain larger architecture pressure points.
- Production build was not rerun because this was a read-hook boundary extraction covered by typecheck, lint, reliability guards, focused tests, and the full unit suite.

## Verification

- `git diff --check` passed.
- `npm run test:vitest -- tests/unit/inventory/query-normalization-wave3-locations.test.tsx tests/unit/inventory/location-permission-contract.test.ts tests/unit/shared/query-key-integrity.test.ts` passed, 3 files / 22 tests.
- `./node_modules/.bin/eslint src/hooks/inventory/use-warehouse-location-reads.ts src/hooks/inventory/use-locations.ts src/hooks/inventory/index.ts tests/unit/inventory/query-normalization-wave3-locations.test.tsx --report-unused-disable-directives` passed.
- `npm run lint:reliability` passed.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run test:unit` passed, 744 files / 2452 tests.

## Goal Adaptation

No standing goal change. This sprint continues the product-owner goal by making a warehouse read/cache contract explicit and reducing mixed ownership in the inventory hook layer.

## Residual Risk

Low risk for this slice because server functions, schemas, tenant predicates, and UI behavior are unchanged. Medium residual architecture risk remains in the legacy location composite hook and larger inventory dashboard/detail/valuation surfaces.
