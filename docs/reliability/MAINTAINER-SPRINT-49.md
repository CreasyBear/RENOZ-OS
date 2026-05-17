# Reliability Maintainer Sprint 49: Package Script Runner Reliability

## Status

Closed and commit-ready.

## Problem

The repo's active package-script interface depended on `bun run` for gate
orchestration. In this maintainer runtime, `bun run typecheck` and
`bun run lint` failed before executing the script body with Bun's
`CouldntReadCurrentDirectory` internal error. The underlying tools and
`npm run` could execute the same scripts, but `predeploy`, `release:verify`,
and `deploy-with-guards.mjs` still chained back through Bun, so the fallback
path was not trustworthy.

The predeploy build also exposed a Sprint 48 naming smell: the admin import
workflow helper lived under `src/routes` without TanStack Router's ignored
file prefix, so production build warned that the helper did not export a route.

## Root Cause

Two issues combined:

- The local Bun runtime can inspect packages but fails in its package-script
  runner before script execution in this working directory.
- Repo orchestration was Bun-specific instead of package-runner neutral, so a
  working `npm run` fallback still inherited the broken `bun run` path.

## Workflow Spine Protected

Maintainer package-script entrypoint -> lint -> reliability guards ->
typecheck -> unit suite -> production build.

Deploy guard spine: `deploy:prod` -> `deploy-with-guards.mjs` ->
release-hardening tests -> release gates -> Vercel build/deploy -> probe.

Route/build spine protected: admin users import route -> ignored route helper
file -> TanStack route tree generation -> production build.

## Touched Domains

- Release and repo tooling.
- Maintainer process documentation.
- Admin users import route helper placement.
- Financial contract tests, only to align stale source-contract expectations
  with the finance-owned read-error helper introduced in Sprint 47.

## Business Value Protected

RENOZ-V3 needs a predictable local operator interface. If the documented gates
depend on a runner that fails before execution, future sprint closeout,
release checks, and deploy preparation become harder to trust. This slice
restores a package-script path that a maintainer can run end to end and makes
the build output less noisy for real route warnings.

## Scope Constraints

- No app runtime behavior changed.
- No database schema, tenant predicate, inventory, finance transaction, or
  query/cache invalidation behavior changed.
- `bun` remains the pinned package manager/runtime in `package.json`; this
  slice does not attempt to patch Bun itself.
- Deploy execution was not run. The deploy guard script was updated and covered
  by source contract, while actual production deployment remains a release
  decision.

## Changes

- Replaced nested `bun run` orchestration in `predeploy` and `release:verify`
  with `npm run` chaining.
- Changed the top-level `test` script from `bun test` to `vitest run`, matching
  the repo's actual unit test framework.
- Updated `scripts/deploy-with-guards.mjs` to run package gates through
  `npm run` and call the local Vercel CLI binary instead of `bun x vercel`.
- Updated maintainer process and scripts documentation to make `npm run` the
  local package-script entrypoint and to forbid package scripts from chaining
  through `bun run`.
- Added a package-script runtime contract test.
- Renamed the admin import workflow helper to
  `src/routes/_authenticated/admin/users/-import-page-workflow.ts` so TanStack
  Router ignores it as a helper file.
- Updated the financial separation contract to assert the current container ->
  finance read-error helper -> presenter contract instead of requiring fallback
  copy to live in the presenter source.

## Standards Checked

- Domain ownership: release tooling remains under `scripts` and package
  scripts; admin import workflow helper stays route-local but route-ignored.
- Route -> container/page -> hook -> server function -> schema/database flow:
  unchanged for application workflows.
- Tenant isolation: unchanged.
- Transactional inventory and finance integrity: unchanged.
- Serialized lineage continuity: unchanged.
- Query/cache contracts: unchanged.
- Honest operator tooling states: the documented maintainer runner now matches
  the runner that works in this environment.
- Reviewable diff: package scripts, one deploy script, docs, one contract test,
  one stale financial contract alignment, and one helper file rename.

## Smells Removed

- Removed nested `bun run` from active package-script orchestration.
- Removed `bun test` from the top-level test script in a Vitest-owned repo.
- Removed `bun run` and `bun x` from deploy guard orchestration.
- Removed a production build route-tree warning for a route-local helper file.
- Removed stale finance contract assumptions about where read-error fallback
  copy must live.

## Smells Deferred

- The underlying Bun `CouldntReadCurrentDirectory` failure remains external to
  this slice. `bun run typecheck` still fails in this local runtime.
- Existing production build warnings remain around dependency `"use client"`
  directives, Supabase dynamic/static import chunking, and chunk size. They are
  not introduced by this slice and should be handled as separate build-health
  work.
- Actual deployment was not exercised.
- The local shell reports a Node version outside the package `engines` range in
  some contexts; this sprint restores the working package-script path but does
  not normalize Node version management.

## Gates

- Reproduced original failure:
  `bun run typecheck`
  - Failed before script execution with `CouldntReadCurrentDirectory`.
- Package fallback proof before implementation:
  `npm run typecheck -- --pretty false`
  `npm run lint -- --quiet`
  - Passed.
- Focused tests:
  `npm run test:vitest -- tests/unit/users/import-page-workflow-contract.test.ts tests/unit/scripts/package-script-runtime-contract.test.ts tests/unit/financial/separation-contract.test.ts tests/unit/financial/credit-note-read-feedback-contract.test.ts`
  - Passed, 4 files / 20 tests.
- Targeted ESLint:
  `./node_modules/.bin/eslint src/routes/_authenticated/admin/users/import-page.tsx src/routes/_authenticated/admin/users/-import-page-workflow.ts tests/unit/users/import-page-workflow-contract.test.ts tests/unit/scripts/package-script-runtime-contract.test.ts tests/unit/financial/separation-contract.test.ts scripts/deploy-with-guards.mjs --report-unused-disable-directives`
  - Passed.
- Final package-script predeploy:
  `npm run predeploy`
  - Passed.
  - Includes full source ESLint, routine reliability guards, typecheck, full
    unit suite, and production build.
  - Full unit result: 729 files / 2375 tests passed.
- Diff whitespace:
  `git diff --check`
  - Passed.

## Goal Adaptation

No goal text changed. The maintainer process now reflects the current local
reality: `npm run` is the reliable package-script entrypoint for sprint
closeout while the Bun script-runner issue remains documented and contained.

## Residual Risk

Low for local maintainer closeout because the final `npm run predeploy` passed.
Medium for deployment because the deploy guard was source-contract checked but
not used to deploy. Remaining build warnings are known repo build-health debt,
not proof of failure, but they still reduce signal quality and deserve a later
build-health sprint.
