# Reliability Maintainer Sprint 50: Supabase Auth Import Boundary

## Status

Closed and commit-ready.

## Problem

Production build emitted a first-party warning because
`src/lib/auth/route-auth.ts` dynamically imported the browser Supabase client
while the rest of the browser auth surface imported the same module statically.
That mixed import shape meant the dynamic import could not move the module into
another chunk, adding noisy build output without a real code-splitting benefit.

## Workflow Spine Protected

Auth route guard -> browser Supabase client -> session/user validation ->
application user lookup -> route redirect policy.

Build spine protected: package build -> Vite chunk analysis -> Nitro/Vercel
output -> TypeScript compile.

## Touched Domains

- Auth route guard.
- Supabase browser client import boundary.
- Build hygiene/reliability test coverage.

## Business Value Protected

RENOZ-V3 needs production build output with enough signal that real regressions
stand out. Removing known first-party warning noise makes release checks and
maintainer closeout easier to trust without changing operator auth behavior.

## Scope Constraints

- No auth policy, redirect policy, retry policy, user lookup, tenant selection,
  or session invalidation behavior changed.
- No database schema, RLS, inventory, finance, serialized lineage, or query key
  behavior changed.
- Remaining chunk-size and dependency `"use client"` warnings were not handled
  in this slice.

## Changes

- Replaced repeated dynamic imports of `@/lib/supabase/client` in
  `route-auth.ts` with one static import for `supabase` and
  `onAuthStateChange`.
- Added a route-auth source contract that requires the Supabase browser client
  to stay on one static import path and rejects reintroduced dynamic imports.

## Standards Checked

- Domain ownership: auth route guard behavior remains owned by `src/lib/auth`.
- Route -> container/page -> hook -> server function -> schema/database flow:
  unchanged.
- Tenant isolation: unchanged; application user lookup still selects the same
  organization-owned app user row before authenticated routes proceed.
- Transactional inventory and finance integrity: unchanged.
- Serialized lineage continuity: unchanged.
- Query/cache contracts: unchanged.
- Operator-safe errors and redirects: unchanged; existing route auth redirect
  tests still cover invalid user, expired session, offline, and auth-check
  failure paths.
- Reviewable diff: one auth import-boundary cleanup and one focused contract.

## Smells Removed

- Removed mixed static/dynamic imports for the browser Supabase client from the
  auth route guard.
- Removed the first-party Vite warning that the dynamic Supabase import could
  not form a separate chunk.
- Added regression coverage so this warning does not quietly return.

## Smells Deferred

- Production build still reports chunk-size warnings. That is broader bundle
  shaping work.
- Production build still reports dependency-level `"use client"` directive
  warnings from Radix, TanStack, Framer Motion, and related packages.
- Full unit and full predeploy were not rerun for this narrow import-boundary
  slice.

## Gates

- Focused auth route tests:
  `npm run test:vitest -- tests/unit/auth/route-auth.test.ts tests/unit/routes/login-route.test.ts tests/unit/routes/update-password-route.test.ts`
  - Passed, 3 files / 23 tests.
- Targeted ESLint:
  `npx eslint src/lib/auth/route-auth.ts tests/unit/auth/route-auth.test.ts --report-unused-disable-directives`
  - Passed.
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
  - The Supabase mixed static/dynamic import warning did not recur.
  - Remaining warnings: chunk size and dependency `"use client"` directives.

## Goal Adaptation

No goal text changed. This sprint applies the existing goal to build hygiene:
production-grade gates should be quiet enough to be useful evidence.

## Residual Risk

Low for auth behavior because the route guard logic and focused route tests were
unchanged apart from import timing. Medium for build hygiene overall because
chunk-size warnings remain and deserve a separate bundle-shaping sprint.
