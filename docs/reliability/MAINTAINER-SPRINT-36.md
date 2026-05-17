# Reliability Maintainer Sprint 36: WMS Dashboard Diagnostic Noise Cleanup

## Status

Closed and commit-ready.

## Problem

After the router-context warning cleanup, the remaining visible unit-suite noise
came from the WMS dashboard read hook:

- `[useWMSDashboard] queryFn started`
- `[useWMSDashboard] getWMSDashboard returned`
- `[useWMSDashboard] queryFn error`

Those diagnostics were duplicated at the hook boundary while the read path
already used `resolveReadResult` to normalize missing or failed dashboard data
into an operator-safe unavailable state. The duplicate hook-level logging made
tests and local debugging noisier without strengthening the inventory dashboard
contract.

## Workflow Spine Protected

Inventory dashboard route/container -> WMS dashboard hook -> `getWMSDashboard`
server function -> always-shaped read result normalization -> centralized
inventory query key/cache policy -> quiet unit-suite evidence.

## Touched Domains

- Inventory/WMS dashboard read hook.
- Inventory query-normalization test coverage.
- Reliability/test-signal hygiene.

## Business Value Protected

The WMS dashboard supports warehouse visibility for stock value, movement, and
availability. Operators need this screen to fail honestly when dashboard data is
temporarily unavailable. Maintainers need inventory tests that surface real
regressions instead of accepted background diagnostics.

## Scope Constraints

- No route, page/container, server function, schema, database query, tenant
  check, query key, cache timing, inventory mutation, finance behavior, or
  serialized-lineage behavior changed.
- The hook still calls `getWMSDashboard({ data: {} })`.
- The hook still uses `queryKeys.inventory.wmsDashboard()`.
- The hook still uses `resolveReadResult` with the same fallback message.
- The query `staleTime` remains one minute.

## Changes

- Removed `inventoryLogger` from `useWMSDashboard`.
- Replaced the wrapped async query function with a direct `resolveReadResult`
  call around `getWMSDashboard`.
- Added a source-level regression contract proving query diagnostics stay out
  of the WMS dashboard read hook while preserving the unavailable-data fallback.

## Standards Checked

- Domain ownership: change stays inside the WMS dashboard read hook and its
  inventory-focused contract test.
- Route -> container/page -> hook -> server function -> schema/database -> query
  key/cache policy: hook still delegates to the same server function and
  centralized inventory query key.
- Tenant isolation: unchanged; tenant enforcement remains server-side.
- Transactional inventory and finance integrity: unchanged; this is a read-only
  dashboard hook cleanup.
- Serialized lineage continuity: unchanged.
- Honest UI states and operator-safe errors: preserved through
  `resolveReadResult` and the existing fallback message.
- Mutation/cache contracts: unchanged.
- Reviewable diff: one hook simplification and one focused contract test.

## Smells Removed

- Removed duplicated query-start, query-result, and query-error diagnostics from
  a React Query read hook.
- Reduced full-suite output noise so future inventory failures are easier to
  notice.
- Preserved read-state normalization instead of hiding logs in the test harness.

## Smells Deferred

- This sprint does not define a repo-wide logger/noise policy for every test.
  Future slices should handle logging where diagnostics are duplicated,
  unstructured, or operator-hostile.
- Remaining raw `console.*` and TODO markers in `src` should be handled as
  bounded domain slices rather than broad mechanical cleanup.
- No browser QA was run because this slice does not change rendered UI behavior.

## Gates

- Focused inventory trace run:
  `./node_modules/.bin/vitest run tests/unit/inventory/query-normalization-wave3-dashboard.test.tsx tests/unit/inventory/query-normalization-wave7b.test.tsx tests/unit/inventory/wms-dashboard-diagnostic-logging-contract.test.ts --reporter=dot --printConsoleTrace`
  - Passed, 3 files / 12 tests in 4s.
  - Confirmed the WMS dashboard diagnostics no longer appear in focused trace
    output.
- Typecheck:
  `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`
  - Passed in 58s.
- Full source ESLint:
  `./node_modules/.bin/eslint src --ext .ts,.tsx --report-unused-disable-directives`
  - Passed in 60s.
- Routine reliability guards:
  - `node scripts/check-route-casts.mjs` passed.
  - `node scripts/check-pending-dialog-guards.mjs` passed.
  - `node scripts/check-read-path-query-guards.mjs` passed.
- Full unit suite:
  `./node_modules/.bin/vitest run tests/unit --reporter=dot`
  - Passed, 714 files / 2326 tests in 98s.
- Diff hygiene:
  - `git diff --check` passed.

## Goal Adaptation

No goal text changed. This sprint applies the standing maintainer goal by
improving gate evidence quality while leaving the WMS dashboard workflow
behavior unchanged.

## Residual Risk

Low application risk. The production behavior change is removal of duplicated
hook-level diagnostics. Read failures still flow through `resolveReadResult`,
and server-side inventory dashboard logging remains available where the data is
actually fetched.
