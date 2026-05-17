# Inventory Maintainer Sprint 191: Location Utilization Hook Boundary

Status: closed and commit-ready.

## Problem

`useLocationUtilization` provides warehouse capacity and stock-utilization visibility, but it lived in the broad inventory hook module beside list, detail, search, low-stock, mutation compatibility exports, and other read contracts.

That mixed a warehouse-location utilization read with the core inventory list/detail/search hook surface, making the module harder to scan and easier to accidentally widen when changing inventory reads.

## Workflow Spine Protected

```text
warehouse utilization consumer
  -> useLocationUtilization
  -> getLocationUtilization server function
  -> organization-scoped warehouse location / inventory read model
  -> queryKeys.locations.utilization()
  -> capacity and stock-utilization visibility
```

## Touched Domains

- Inventory/Warehouse location utilization hook boundary.
- Location query/cache source contract tests.
- Inventory hook barrel exports.

## Business Value Protected

Warehouse capacity and utilization are operating truth for stock placement, slotting, and warehouse review. Keeping that read path focused makes the next warehouse workflow easier to inspect without dragging the entire inventory hook module into scope.

## Changes

- Added `src/hooks/inventory/use-location-utilization.ts` as the dedicated location-utilization read hook.
- Removed the direct location server-function import and inline utilization hook from `src/hooks/inventory/use-inventory.ts`.
- Preserved compatibility by re-exporting `useLocationUtilization` from `use-inventory.ts`.
- Exported `useLocationUtilization` directly from `src/hooks/inventory/index.ts` under a warehouse utilization read/cache contract comment.
- Added runtime and source-boundary coverage in `tests/unit/inventory/query-normalization-wave3-locations.test.tsx`.

## Standards Checked

- Domain ownership: location utilization now has a focused warehouse/inventory hook module.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: no route or server behavior changed; the hook boundary now maps directly to `getLocationUtilization` and `queryKeys.locations.utilization()`.
- Tenant isolation: unchanged; the server function remains the organization-scoped authority.
- Transactional integrity: unchanged; this is a read-only utilization path.
- Serialized lineage: not touched.
- Query/cache contract: preserved with `queryKeys.locations.utilization()`, `staleTime: 60 * 1000`, and `refetchInterval: 60 * 1000`.
- Operator-safe error handling: preserved through the same `resolveReadResult` always-shaped fallback copy.
- Reviewable diff: limited to hook extraction, export wiring, focused tests, and this closeout note.

## Smells Removed

- Removed the location server-function import from the broad inventory hook module.
- Removed the utilization fallback copy and read orchestration from `use-inventory.ts`.
- Reduced `use-inventory.ts` to the inventory list/detail/search/low-stock read surface plus compatibility exports.
- Added a source-boundary test so the utilization hook does not silently drift back into the broad module.

## Smells Deferred

- `use-inventory.ts` still owns list, detail, search, and low-stock reads. That is acceptable for now, but low-stock may become its own hook if future stock replenishment work needs a sharper boundary.
- `src/hooks/inventory/use-locations.ts` remains a larger mixed location-management hook and should be handled only through a workflow-specific slice.
- `src/components/domain/inventory/unified-inventory-dashboard.tsx`, `src/components/domain/inventory/views/inventory-detail-view.tsx`, `src/server/functions/inventory/valuation.ts`, and `src/lib/query-keys.ts` remain major inventory/operations architecture pressure points.
- Production build was not rerun for this closeout because this was a hook-boundary extraction and the audit run already covered typecheck, lint, reliability guards, focused tests, and full unit tests.

## Verification

- `git diff --check` passed.
- `npm run lint:reliability` passed.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run test:vitest -- tests/unit/inventory/query-normalization-wave3-locations.test.tsx tests/unit/inventory/location-permission-contract.test.ts tests/unit/shared/query-key-integrity.test.ts tests/unit/inventory/query-normalization-wave7b.test.tsx` passed, 4 files / 23 tests.
- `./node_modules/.bin/eslint src/hooks/inventory/use-location-utilization.ts src/hooks/inventory/use-inventory.ts src/hooks/inventory/index.ts tests/unit/inventory/query-normalization-wave3-locations.test.tsx --report-unused-disable-directives` passed.
- `npm run test:unit` passed, 744 files / 2449 tests.

## Goal Adaptation

No standing goal change. This sprint continues the product-owner goal by shrinking a mixed inventory module around a warehouse read contract and making the repo easier to reason about.

## Residual Risk

Low risk for this slice because runtime behavior, server functions, tenant predicates, and query key policy are unchanged. Broader residual risk remains in large inventory dashboard/detail surfaces and valuation/query-key modules.
