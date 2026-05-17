# Reliability Maintainer Sprint 34: Test Runtime Warning Signal Cleanup

## Status

Closed and commit-ready.

## Problem

The full unit suite was green, but it repeatedly emitted two broad warnings that
had become accepted background noise across domain sprint closeouts:

- Node 25 warned that `--localstorage-file` was provided without a valid path.
- Auth rate-limit initialization warned that Upstash Redis was not configured.

Both warnings were expected in local tests, but their repetition weakened the
test suite as an operator signal. Future test stderr should point to behavior
worth investigating, not known harness/runtime defaults.

## Workflow Spine Protected

Maintainer sprint closeout -> test runtime -> shared auth/rate-limit module
initialization -> jsdom component tests and server-function tests -> readable
unit-suite evidence.

## Touched Domains

- Reliability test harness.
- Auth rate-limit infrastructure.

## Business Value Protected

RENOZ-V3 depends on a large unit suite to keep order, inventory, warranty,
support, finance, and document workflows safe while the repo is carved into
cleaner modules. Reducing false-positive stderr makes regressions easier to
notice and makes sprint closeout evidence easier for a future maintainer to
trust.

## Scope Constraints

- No route, UI, hook, server function workflow, schema, database, query key,
  cache invalidation, tenant enforcement, inventory behavior, finance behavior,
  serialized-lineage behavior, or product runtime UI changed.
- Auth rate-limit production behavior remains fail-closed when Redis is missing.
- Development still logs missing Upstash configuration.
- The Vitest change is scoped to forked test workers.

## Changes

- Added `poolOptions.forks.execArgv: ['--no-experimental-webstorage']` to
  `vitest.config.ts` so Node 25's experimental `globalThis.localStorage` does
  not compete with jsdom's browser-storage contract during tests.
- Suppressed the missing-Upstash auth rate-limit warning only when the module is
  loaded under the test runtime.
- Added a focused auth runtime-logging regression test that proves test runtime
  silence and development-time warning behavior.

## Standards Checked

- Domain ownership: test harness change stays in Vitest config; rate-limit log
  policy stays in auth infrastructure.
- Route -> container/page -> hook -> server function -> schema/database -> query
  key/cache policy: no app workflow changed.
- Tenant isolation: unchanged.
- Inventory and finance integrity: unchanged.
- Serialized lineage continuity: unchanged.
- Honest UI states and operator-safe errors: unchanged.
- Mutation/cache contracts: unchanged.
- Reviewable diff: one test-harness setting, one auth logging guard, one focused
  regression test.

## Smells Removed

- Removed the recurring Node 25 `--localstorage-file` warning from tests that
  import Supabase auth helpers under jsdom.
- Removed the missing-Upstash auth rate-limit warning from test output while
  preserving development visibility.
- Added a regression test so auth rate-limit logging cannot silently drift back
  into noisy test-runtime behavior.

## Smells Deferred

- Existing `useRouter must be used inside a <RouterProvider>` warnings remain in
  product/dashboard query-normalization tests. They are now the clearest next
  test-signal cleanup candidate.
- Some inventory dashboard tests intentionally log debug/error output while
  asserting degraded read behavior. That belongs to a separate logger/test
  harness policy slice.
- AI Redis/memory fallback warnings were not changed because they did not appear
  in this sprint's focused reproducer or full-suite output.

## Gates

- Focused warning reproducer with trace warnings:
  `NODE_OPTIONS=--trace-warnings ./node_modules/.bin/vitest run tests/unit/orders/order-fulfillment-tab.test.tsx --reporter=dot`
  - Passed, 1 file / 1 test.
  - Confirmed no `--localstorage-file` warning and no missing-Upstash warning.
- Focused regression set:
  `./node_modules/.bin/vitest run tests/unit/auth/rate-limit-test-runtime-logging.test.ts tests/unit/auth/rate-limit-client-id.test.ts tests/unit/orders/order-fulfillment-tab.test.tsx --reporter=dot`
  - Passed, 3 files / 5 tests.
- Targeted ESLint:
  `./node_modules/.bin/eslint src/lib/auth/rate-limit.ts tests/unit/auth/rate-limit-test-runtime-logging.test.ts --report-unused-disable-directives`
  - Passed.
- Typecheck:
  `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`
  - Passed in 50s.
- Full ESLint:
  `./node_modules/.bin/eslint src --ext .ts,.tsx --report-unused-disable-directives`
  - Passed in 53s.
- Routine reliability guards:
  - `node scripts/check-route-casts.mjs` passed.
  - `node scripts/check-pending-dialog-guards.mjs` passed.
  - `node scripts/check-read-path-query-guards.mjs` passed.
- Full unit suite:
  `./node_modules/.bin/vitest run tests/unit`
  - Passed, 713 files / 2325 tests in 109s.

## Goal Adaptation

No goal text changed. This sprint applies the standing goal by making gates
better evidence: quieter tests make future domain work safer to evaluate.

## Residual Risk

Low application risk because runtime behavior changes are test-only except for
test-runtime log suppression. Production auth rate limiting still fails closed
when Redis is missing. Medium test-signal debt remains from router-provider
warnings in query-normalization tests and intentional inventory logger output.
