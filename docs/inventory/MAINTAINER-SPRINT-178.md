# Inventory Maintainer Sprint 178: Warehouse Location Cache Scope

## Status

Closed in commit-ready state.

## Issue 1: Warehouse Location Mutations Refreshed the Location Root

### Problem

Warehouse location create, update, and delete mutations invalidated `queryKeys.locations.all` from both the legacy composable location hook and the newer focused warehouse-location mutation hooks.

Location changes affect a known set of reads: location lists, hierarchy/tree views, utilization, affected detail, and affected contents. Root invalidation hid that contract and made the two mutation surfaces harder to compare.

### Workflow Spine

Inventory location management
-> `useLocations` / focused warehouse-location mutation hooks
-> warehouse location server functions
-> tenant-scoped location write
-> location list/tree/hierarchy/utilization refresh
-> affected location detail/contents refresh.

### Touched Domains

- Inventory warehouse location mutation hooks.
- Central query-key factory.
- Inventory location query normalization tests.
- Inventory sprint evidence.

### Business Value Protected

RENOZ warehouse/bin structure can change without relying on broad location-root refresh. Operators still get fresh location navigation, location detail, location contents, and utilization surfaces after location edits.

### Scope Constraints

- Do not change location server behavior, auth, validation, hierarchy rules, or delete constraints.
- Do not change inventory stock, receiving, transfer, or count behavior.
- Do not change UI copy or form validation.
- Keep this slice limited to warehouse location mutation cache ownership.

### Changes

- Added location `details()` and `hierarchies()` query-key prefixes while preserving existing detail and hierarchy key shapes.
- Added `invalidateLocationMutationQueries` to centralize location mutation cache refresh in `use-locations`.
- Replaced location-root invalidation in composable create/update/delete with list, tree, hierarchy, utilization, affected detail, and affected contents refresh.
- Replaced location-root invalidation in focused warehouse-location create/update/delete hooks with the same helper.
- Added hook coverage proving both mutation surfaces refresh targeted prefixes without invalidating the location root.

### Standards Checked

- Domain ownership: warehouse location hooks own location tree/list/hierarchy/detail/contents/utilization refresh.
- Route -> container/page -> hook -> server function -> schema/database -> query/cache policy: mutation result/variables now drive affected location cache policy.
- Tenant isolation/data integrity: unchanged; server writes remain tenant-scoped.
- Transactional inventory/finance integrity: unchanged.
- Serialized lineage continuity: not applicable.
- Honest UI/error handling: unchanged; existing mutation fallback copy remains.
- Query/cache contract: improved and covered with focused hook tests.
- Reviewability: one local helper, two query-key prefixes, and focused regression coverage.

### Smells Removed

- Warehouse location mutations refreshed the location root instead of named read surfaces.
- Legacy and focused location mutation hooks duplicated broad invalidation behavior.

### Deferred

- No browser smoke; this was a hook/cache contract slice.
- No inventory row/product label cache audit for location-name changes; existing behavior only refreshed location-owned surfaces, and this slice preserved that boundary.
- No redesign of the legacy composable hook versus focused hook split.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/inventory/query-normalization-wave3-locations.test.tsx tests/unit/inventory/location-permission-contract.test.ts tests/unit/inventory/location-schema-ownership.test.ts tests/unit/inventory/warehouse-location-schema-ownership.test.ts`
- Passed: `./node_modules/.bin/eslint src/hooks/inventory/use-locations.ts src/lib/query-keys.ts tests/unit/inventory/query-normalization-wave3-locations.test.tsx --report-unused-disable-directives`
- Passed: `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`
- Passed: `git diff --check`

### Goal Adaptation

No adaptation needed. This sprint follows the maintainer goal by tightening a warehouse-domain cache contract without broadening scope into inventory stock workflows.

### Residual Risk

Low. Server behavior is unchanged. Remaining risk is limited to location labels embedded in broader inventory/product reads, which should be audited as a separate read-model slice before changing cross-domain invalidation policy.
