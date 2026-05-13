# Reliability Maintainer Sprint 8: Full Unit Timeout Stabilization

## Status

Closed in commit-ready state.

## Issue 1: Full Unit Suite Failed on Slow Integration-Style Tests

### Problem

The sprint 7 audit found the full unit suite failing in three files even though the same files passed immediately in isolation. The failing tests were route/page integration-style tests whose first dynamic import or render sat near Vitest's default `10s` timeout under full-suite load.

### Root Cause

The default per-test timeout was too tight for three known slow tests when the whole repository suite runs under worker contention. The login-route assertion failure was secondary: the timed-out first test continued running after Vitest moved on, allowing a delayed sign-out call to leak into the next assertion.

### Workflow Spine

Auth route test stability
-> login route `beforeLoad`
-> stale-session sign-out and transient-reason no-op branches
-> deterministic route contract assertions.

Password recovery route test stability
-> update-password route `beforeLoad`
-> server/no-window no-op branch
-> recovery link redirect and session exchange branches.

Communications page degradation test stability
-> campaigns page container render
-> cached campaigns remain visible
-> degraded read-state banner remains visible.

### Touched Domains

- Auth route unit tests.
- Communications query-normalization/page degradation unit tests.
- Reliability maintainer closeout docs.

### Business Value Protected

The full unit suite is a maintainer trust surface. When it fails because of harness timing instead of product behavior, every future repo-health decision becomes slower and less credible. This slice restores the broad unit gate as useful evidence for release readiness and ongoing sprint closeout.

### Scope Constraints

- Do not change route behavior, communication UI behavior, mocks, or production code.
- Do not raise the global Vitest timeout.
- Calibrate only the tests proven to exceed the default timeout under full-suite contention.
- Preserve the original assertions.

### Changes

- Added an explicit `20_000ms` timeout to the slow cached-campaign degradation test.
- Added an explicit `20_000ms` timeout to the login route invalid-user sign-out test.
- Added an explicit `20_000ms` timeout to the update-password server/no-window route test.

### Standards Checked

- Domain ownership: changes stay inside the affected domain-owned unit tests.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: unchanged; this is test harness calibration only.
- Tenant isolation/data integrity: not touched.
- Transactional inventory/finance integrity: not touched.
- Serialized lineage continuity: not touched.
- Honest UI states: communications degraded/cached assertion preserved.
- Operator-safe error handling: route/auth and communications error-state assertions preserved.
- Query/cache contract: unchanged.
- Reviewability: three one-line timeout calibrations plus this closeout.

### Smells Removed

- Full-suite-only timeouts in known slow integration-style tests.
- Secondary mock leakage caused by a timed-out login test continuing after Vitest advanced to the next test.
- Sprint 7 residual risk that the broad unit suite was red despite focused tests passing.

### Deferred

- Several integration-style unit tests remain slow and should eventually be decomposed into smaller route/container/presenter contracts.
- Repeated `--localstorage-file` warnings remain test-environment noise.
- Missing Upstash env warnings remain expected local-test noise.
- Router-provider warnings in some query-normalization tests remain existing harness noise.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/communications/query-normalization-wave4d.test.tsx tests/unit/routes/login-route.test.ts tests/unit/routes/update-password-route.test.ts`, `3` files and `24` tests.
- Passed: `./node_modules/.bin/vitest run tests/unit`, `672` files and `2255` tests.
- Passed: `./node_modules/.bin/vitest run tests/unit --testTimeout 30000`, `672` files and `2255` tests, used to confirm the timeout root cause before editing.
- Passed: `./node_modules/.bin/eslint tests/unit/communications/query-normalization-wave4d.test.tsx tests/unit/routes/login-route.test.ts tests/unit/routes/update-password-route.test.ts --report-unused-disable-directives`.
- Passed: `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`.
- Passed: `git diff --check`.

### Goal Adaptation

No adaptation needed. This sprint continues the maintainer goal by converting an audit concern into a bounded, verified reliability fix without changing runtime behavior.

### Residual Risk

Low for touched behavior because production code was not changed and all original assertions remain intact. Medium for suite maintainability: the full suite is green again, but the slowest integration-style tests still create avoidable load and should be decomposed when their domains are next touched.
