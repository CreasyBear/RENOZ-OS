# Reliability Maintainer Sprint 35: Router Warning Test Boundary Cleanup

## Status

Closed and commit-ready.

## Problem

After the broader test-runtime warning cleanup, the remaining high-signal suite
noise was a TanStack Router warning:

`Warning: useRouter must be used inside a <RouterProvider> component!`

The warning appeared in product and dashboard query-normalization tests that
were not exercising route behavior. The tests validated read-state shaping,
degraded UI copy, and cache contracts, but a hook/component import still reached
router-backed helpers:

- `useSearchSuggestions` reached TanStack Start `useServerFn`.
- `ProductInventoryTabContainer` reached TanStack Router `useNavigate`.

Leaving the warning in place made future router-context defects harder to spot.

## Workflow Spine Protected

Maintainer closeout evidence -> product/dashboard query-normalization tests ->
read-state and degraded-state contracts -> clean test output that flags new
router-context regressions.

## Touched Domains

- Products test coverage.
- Dashboard/product operational test coverage.
- Reliability/test-signal hygiene.

## Business Value Protected

Product catalog and inventory dashboard tests protect operator-facing battery
OEM workflows: product search, product imagery, product inventory availability,
and tracked product counts. Keeping those tests quiet makes the suite a better
warning system while the repo continues to be carved into cleaner domain
modules.

## Scope Constraints

- No production route, component, hook, server function, schema, database, query
  key, cache invalidation, tenant enforcement, inventory behavior, finance
  behavior, or serialized-lineage behavior changed.
- The tests still exercise the same read contracts and unavailable/degraded UI
  states.
- Router behavior was not mocked globally; only the non-router test boundaries
  that triggered the warning were isolated.

## Changes

- Added a local `@tanstack/react-start` `useServerFn` test mock in
  `tests/unit/products/query-normalization-wave5b.test.tsx`, matching the
  established pattern in other query-normalization tests.
- Added a local `@tanstack/react-router` `useNavigate` test mock in
  `tests/unit/dashboard/query-normalization-wave5c.test.tsx` for the inventory
  tab unavailable-state render that does not exercise navigation.

## Standards Checked

- Domain ownership: test boundary changes stay inside the product/dashboard
  test files that own the warning.
- Route -> container/page -> hook -> server function -> schema/database -> query
  key/cache policy: production flow unchanged.
- Tenant isolation: unchanged.
- Inventory and finance integrity: unchanged.
- Serialized lineage continuity: unchanged.
- Honest UI states and operator-safe errors: existing read-state assertions
  remain intact.
- Mutation/cache contracts: unchanged.
- Reviewable diff: two local test mocks, no shared harness or production
  behavior change.

## Smells Removed

- Removed the product search suggestion `useServerFn` router-context warning
  from query-normalization tests.
- Removed the product inventory tab `useNavigate` router-context warning from
  dashboard/product operational tests.
- Preserved the tests as focused read-state contracts instead of requiring a
  full router for non-router assertions.

## Smells Deferred

- Inventory dashboard tests still emit intentional debug/error logger output
  while asserting degraded read behavior. That is the next clear test-signal
  cleanup candidate.
- This sprint did not create a shared test helper for router-backed hooks.
  Duplication is acceptable for now because only two focused tests needed local
  isolation and a shared helper would be broader than the current slice.

## Gates

- Focused trace run:
  `./node_modules/.bin/vitest run tests/unit/products/query-normalization-wave5b.test.tsx tests/unit/dashboard/query-normalization-wave5c.test.tsx --reporter=dot --printConsoleTrace`
  - Passed, 2 files / 10 tests.
  - Confirmed no `useRouter must be used inside a <RouterProvider>` warning.
- Targeted ESLint:
  `./node_modules/.bin/eslint tests/unit/products/query-normalization-wave5b.test.tsx tests/unit/dashboard/query-normalization-wave5c.test.tsx --report-unused-disable-directives`
  - Passed.
- Typecheck:
  `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`
  - Passed in 51s.
- Routine reliability guards:
  - `node scripts/check-route-casts.mjs` passed.
  - `node scripts/check-pending-dialog-guards.mjs` passed.
  - `node scripts/check-read-path-query-guards.mjs` passed.
- Full unit suite:
  `./node_modules/.bin/vitest run tests/unit --reporter=dot`
  - Passed, 713 files / 2325 tests in 118s.

## Goal Adaptation

No goal text changed. This sprint continues the standing goal by improving the
trustworthiness of gate evidence while leaving production workflow behavior
unchanged.

## Residual Risk

Low application risk because only test boundaries changed. Medium test-signal
debt remains from inventory logger output that is now the most visible suite
noise.
