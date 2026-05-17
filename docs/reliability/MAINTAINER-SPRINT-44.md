# Reliability Maintainer Sprint 44: Error Boundary Feedback

## Status

Closed and commit-ready.

## Problem

Several shared and domain error boundaries still rendered
`this.state.error.message` directly in their fallback details. Most of that
copy was dev-only, but it kept the repo's error-boundary policy inconsistent:
some surfaces were formatter-owned while boundary fallbacks still carried local
raw-message conventions.

## Workflow Spine Protected

Render failure -> React error boundary -> structured logging/monitoring keeps
raw exception context -> boundary fallback -> shared formatter-owned diagnostic
copy -> retry or route-recovery action.

## Touched Domains

- Auth.
- Communications.
- Profile/users.
- Orders fulfillment.
- Suppliers.
- Shared kanban/platform UI.
- Shared error feedback infrastructure.

## Business Value Protected

Error boundaries are the last visible recovery layer when a workflow crashes.
Operators should see stable recovery guidance, and developers should still get
raw exception context through logs and monitoring. This slice separates those
two responsibilities instead of letting render fallbacks become accidental
exception dumps.

## Scope Constraints

- No route, schema, database, tenant, inventory, finance, or query/cache
  contracts changed.
- Raw exception details remain available to logging, monitoring, and optional
  error handlers.
- Boundary fallback UI now renders formatter-owned diagnostic text instead of
  raw exception messages.
- Component stack details remain dev-only and were not broadened.

## Changes

- Added `src/lib/error-boundary-feedback.ts` as the shared formatter for error
  boundary fallback diagnostics.
- Migrated auth, communications, profile, fulfillment, supplier, and kanban
  boundaries away from direct `this.state.error.message` rendering.
- Added a source contract proving the boundary family uses the shared formatter
  and suppresses unsafe database/provider/stack messages.
- Updated the housekeeping ledger to mark the boundary slice closed while
  keeping other raw-error surfaces open.

## Standards Checked

- Domain ownership: shared formatter owns boundary diagnostic policy; domain
  boundaries keep their titles, descriptions, icons, and recovery actions.
- Route -> container/page -> hook -> server function -> schema/database flow:
  unchanged. This slice hardens fallback presentation only.
- Tenant isolation: unchanged.
- Transactional inventory and finance integrity: unchanged.
- Serialized lineage continuity: unchanged.
- Honest UI states: fallback UI keeps retry/recovery actions and no longer
  displays unsafe exception messages directly.
- Query/cache contracts: unchanged.
- Reviewable diff: one small shared helper, six boundary call sites, focused
  source contract, and docs only.

## Smells Removed

- Removed direct `this.state.error.message` rendering from the tracked boundary
  family.
- Removed repeated local boundary diagnostic policy in favor of one shared
  formatter.

## Smells Deferred

- Non-boundary raw-error candidates remain in upload, job-progress, SKU copy,
  admin import, and credit-note surfaces.
- This does not create a generic visual error-boundary component; the boundaries
  still intentionally keep their domain-specific layouts.
- Retryability metadata is still implicit in the fallback copy rather than a
  structured UI contract.
- Package-script execution through `bun run` still fails locally with
  `CouldntReadCurrentDirectory`; direct tools remain the reliable local path.

## Gates

- Focused boundary feedback contract:
  `./node_modules/.bin/vitest run tests/unit/shared/error-boundary-feedback-contract.test.ts`
  - Passed, 1 file / 2 tests.
- Targeted ESLint:
  `./node_modules/.bin/eslint src/lib/error-boundary-feedback.ts src/components/auth/auth-error-boundary.tsx src/components/shared/kanban/kanban-error-boundary.tsx src/components/domain/communications/communications-error-boundary.tsx src/components/domain/users/profile-error-boundary.tsx src/components/domain/orders/fulfillment/fulfillment-error-boundary.tsx src/components/error/supplier-error-boundary.tsx tests/unit/shared/error-boundary-feedback-contract.test.ts --report-unused-disable-directives`
  - Passed.
- Typecheck:
  `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit --pretty false`
  - Passed.
- Full source ESLint:
  `./node_modules/.bin/eslint src --ext .ts,.tsx --report-unused-disable-directives`
  - Passed.
- Routine reliability guards:
  - `node scripts/check-route-casts.mjs` passed.
  - `node scripts/check-pending-dialog-guards.mjs` passed.
  - `node scripts/check-read-path-query-guards.mjs` passed.
- Full unit suite:
  `./node_modules/.bin/vitest run tests/unit`
  - Passed, 724 files / 2359 tests.
- Diff whitespace:
  `git diff --check`
  - Passed.
- Package-script reliability:
  `bun run lint:reliability`
  - Skipped because the local Bun runtime still fails before script execution
    with `CouldntReadCurrentDirectory`; direct Node guard commands above are
    the authoritative local evidence for this slice.

## Goal Adaptation

No goal text changed. This sprint continues the standing maintainer goal by
centralizing another operator-safe error policy in a bounded shared-platform
slice.

## Residual Risk

Low application-code risk after focused and broad gates. Medium remaining
resilience debt remains in non-boundary raw-error surfaces.
