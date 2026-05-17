# Reliability Maintainer Sprint 51: Dependency Build Warning Signal

## Status

Closed and commit-ready.

## Problem

After Sprint 50 removed the first-party Supabase mixed import warning,
production build output was still dominated by dependency-only Rollup noise:

- dependency `"use client"` module-level directive warnings from Radix,
  TanStack Query/Form, Framer Motion, Sonner, Vaul, and related packages
- dependency unused external import warnings from TanStack Start packages
- Nitro dependency empty chunk notices for generated `_libs/*` chunks

Those warnings were not actionable for RENOZ-V3 application code, but they made
the remaining real build signal harder to see: the large client chunk warning.

## Workflow Spine Protected

Maintainer build gate -> Vite app bundle -> Nitro/Vercel output -> TypeScript
compile -> release-readiness evidence.

## Touched Domains

- Build configuration.
- Build asset/source-contract tests.
- Reliability closeout documentation.

## Business Value Protected

RENOZ-V3 depends on local release gates that operators and maintainers can read
quickly. Build output should not train maintainers to ignore warnings. This
slice removes known dependency-only warning noise while preserving warnings that
describe app-owned risk.

## Scope Constraints

- No runtime app behavior changed.
- No route, hook, server function, schema/database, tenant isolation, inventory,
  finance, serialized lineage, or query/cache behavior changed.
- Manual chunk splitting was not enabled because `vite.config.ts` documents
  that manual chunks previously increased build memory pressure.
- Chunk-size warnings were intentionally not suppressed.

## Changes

- Added a shared Rollup warning filter in `vite.config.ts` for known
  dependency-only build noise:
  - `MODULE_LEVEL_DIRECTIVE` warnings for `"use client"` in `node_modules`
  - unused external import warnings sourced from `node_modules`
  - generated empty dependency chunks under Nitro `_libs/*`
- Reused the same warning filter for both Vite `build.rollupOptions.onwarn`
  and Nitro `rollupConfig.onwarn`.
- Expanded the build asset path source contract to verify the warning filter is
  scoped, applied in both build paths, keeps `manualChunks: undefined`, and does
  not add `chunkSizeWarningLimit`.

## Standards Checked

- Domain ownership: build-warning policy remains in `vite.config.ts`; its
  source contract stays in the build asset tests.
- Route -> container/page -> hook -> server function -> schema/database flow:
  unchanged.
- Tenant isolation: unchanged.
- Transactional inventory and finance integrity: unchanged.
- Serialized lineage continuity: unchanged.
- Query/cache contracts: unchanged.
- Honest gate evidence: build output still reports the large chunk warning
  instead of hiding it behind a larger warning limit.
- Reviewable diff: one config helper and one focused source contract.

## Smells Removed

- Removed dependency-only `"use client"` directive warning spam from production
  build output.
- Removed dependency-only TanStack unused external import warning noise from
  production build output.
- Removed Nitro generated empty `_libs/*` chunk notices from production build
  output.
- Replaced one inline Vite-only warning handler with a named shared warning
  policy used by both Vite and Nitro.

## Smells Deferred

- The largest generated client asset remains about `2.4M`
  (`main-C42zE0Kw.js` in the latest local build output).
- Production build still reports the chunk-size warning. That is real bundle
  shape work, not warning noise.
- Build tracing still notes native dependency architecture for `bcrypt` and
  `node-gyp-build`; that is deployment-environment evidence, not a Rollup
  warning.
- Full unit and full predeploy were not rerun for this config-only warning
  policy slice.

## Gates

- Focused build config/source-contract tests:
  `npm run test:vitest -- tests/unit/build-asset-paths.test.ts tests/unit/scripts/package-script-runtime-contract.test.ts`
  - Passed, 2 files / 5 tests.
- Targeted ESLint for the test file:
  `npx eslint tests/unit/build-asset-paths.test.ts --report-unused-disable-directives`
  - Passed.
  - `vite.config.ts` is intentionally ignored by repo ESLint config; typecheck
    and production build covered it instead.
- Typecheck:
  `npm run typecheck`
  - Passed.
- Reliability lint:
  `npm run lint:reliability`
  - Passed.
- Full source lint:
  `npm run lint`
  - Passed.
- Production build:
  `npm run build`
  - Passed.
  - Dependency directive, dependency unused-import, and empty `_libs/*` chunk
    warning noise did not recur.
  - Remaining warning: chunk size.
- Diff whitespace:
  `git diff --check`
  - Passed.

## Goal Adaptation

No goal text changed. This sprint applies the current goal to build gate
legibility: warnings that remain should mean something to a maintainer.

## Residual Risk

Low for runtime behavior because this is a build warning policy only. Medium for
build performance because the large `main` asset remains and should be handled
through a separate bundle-shaping sprint that accounts for prior manual chunk
memory pressure.
