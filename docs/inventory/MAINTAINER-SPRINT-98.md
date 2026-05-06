# Inventory Maintainer Sprint 98: Analytics Read-State Safety

This sprint follows the product-owner goal into inventory analytics read states. The route already distinguished hard failures from degraded stale-data states, but both branches displayed raw query `error.message` text for valuation, aging, turnover, and movement analytics.

## Business Value

Inventory analytics supports warehouse value, aging, stock movement, and turnover decisions. When those reads fail, operators need stable recovery guidance, not database, policy, provider, or stack details. Stale data should remain visible honestly, but the warning copy should stay safe.

Protected value:

- valuation and finance-integrity review remains operator-safe during read failures
- aging, turnover, and movement analytics do not leak raw backend messages
- stale analytics panels still render existing data with explicit degraded warnings
- hard failures still block fake report panels and keep retry available

## Workflow Spine

```text
/inventory/analytics route
  -> analytics page read-state classification
  -> inventory valuation / aging / turnover / movement hooks
  -> inventory read server functions
  -> inventory schemas/database
  -> inventory query keys/cache policy
  -> operator-safe unavailable or stale-data panel
```

## Changes

- Added route-owned inventory analytics read-state messages for valuation, aging, turnover, and movement panels.
- Removed direct `error.message` rendering from inventory analytics hard-failure and degraded-state warnings.
- Added UI coverage for raw cold-read failures with no data.
- Added UI coverage for raw degraded refresh failures while stale analytics data remains visible.

## Closeout

Touched domains: Inventory analytics route and inventory analytics unit coverage.

Workflow protected: inventory analytics route -> valuation/aging/turnover/movement hooks -> read errors -> unavailable or stale-data read-state panel -> retry action.

Business value: warehouse operators get safe, action-oriented analytics failure copy without losing honest stale-data behavior for valuation, aging, turnover, or movement views.

Standards checked: route/page owns presentation copy; hooks, server functions, schemas, database reads, query keys, cache policy, tenant predicates, valuation math, movement transforms, and mutation behavior unchanged.

Smells removed: raw inventory analytics `error.message` display in hard-failure and degraded stale-data states.

Deferred: broader inventory routes still have independent read-state copy patterns and should be handled as domain slices when they surface operator risk. Browser QA was skipped because this slice changes error text and has focused rendered UI coverage without layout or interaction changes.

Verification:

- `./node_modules/.bin/vitest run tests/unit/inventory/query-normalization-wave3-analytics.test.tsx` passed, 1 file, 11 tests.
- `./node_modules/.bin/vitest run tests/unit/inventory/query-normalization-wave3-analytics.test.tsx tests/unit/inventory/valuation-permission-contract.test.ts tests/unit/inventory/valuation-tenant-scope-contract.test.ts tests/unit/inventory/analytics-turnover-summary-contract.test.ts tests/unit/inventory/valuation-turnover-window-contract.test.ts tests/unit/inventory/valuation-turnover-product-filter-contract.test.ts` passed, 6 files, 21 tests.
- `./node_modules/.bin/vitest run tests/unit/inventory` passed, 60 files, 200 tests.
- `bun run typecheck` passed.
- `bun run lint` passed.
- `git diff --check` passed.

Goal adaptation: declined. The existing maintainer goal already covers honest UI states, operator-safe errors, query/cache contract preservation, and evidence-based sprint closeout. The retired serialized gate posture remains unchanged and is not part of this inventory read-state slice.

Residual risk: inventory analytics read-state copy is now safe, but full browser visual QA for analytics error panels remains useful before a visual release.
