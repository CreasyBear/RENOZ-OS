# Reliability Maintainer Sprint 45: Shared Utility Failure Feedback

## Status

Closed and commit-ready.

## Problem

After closing shared bulk and error-boundary feedback, the remaining raw-error
scan still showed three shared utility seams that could leak thrown text or
metadata into operator-facing feedback:

- exhausted Supabase file upload retries
- SKU copy failure diagnostics
- job-progress notification failure messages

These are small surfaces, but they are reused across domains. Leaving them
ad hoc would keep the resilience policy inconsistent after the larger boundary
cleanup.

## Workflow Spine Protected

Shared utility action -> local failure or job metadata -> centralized formatter
or job feedback helper -> safe displayed/logged diagnostic -> existing retry,
copy, or job recovery action.

## Touched Domains

- Shared platform UI.
- Shared file upload hook.
- Shared data-table SKU cell.
- Shared automation job notifications.

## Business Value Protected

Operators use these utility surfaces while moving through higher-value battery
OEM workflows: uploading files, copying SKUs, and watching async jobs. Failures
should not expose database/provider/stack wording or collapse to vague unknowns
when the app already has safer feedback helpers.

## Scope Constraints

- No route, schema, database, tenant, inventory, finance, or query/cache
  contracts changed.
- File upload retry behavior and backoff timing are unchanged.
- SKU copy UI behavior is unchanged; only unsafe failure diagnostics are
  normalized before logging.
- Job notification layout and retry/detail actions are unchanged.
- Existing bulk-import logging lines remain bounded diagnostic logging and were
  not changed by this slice.

## Changes

- Routed exhausted file upload retry errors through `formatMutationError`.
- Preserved the original upload failure as `cause` while presenting stable retry
  guidance.
- Routed SKU copy diagnostic logging through `formatMutationError`.
- Routed failed job notification status text through the existing
  `formatAutomationJobFailureMessage` helper.
- Expanded focused tests/source contracts for SKU copy, job notification, and
  file upload retry feedback.
- Updated the housekeeping ledger to remove these shared surfaces from the live
  raw-error examples.

## Standards Checked

- Domain ownership: shared utility components/hooks own their local feedback;
  domain callers remain unchanged.
- Route -> container/page -> hook -> server function -> schema/database flow:
  unchanged. This slice hardens client-side utility feedback only.
- Tenant isolation: unchanged.
- Transactional inventory and finance integrity: unchanged.
- Serialized lineage continuity: unchanged.
- Honest UI states: exhausted uploads, failed copy diagnostics, and failed job
  notifications now use formatter-owned safe copy.
- Query/cache contracts: unchanged.
- Reviewable diff: three shared source files, focused tests, and docs only.

## Smells Removed

- Removed raw retry-exhaustion upload messages that embedded the last thrown
  message.
- Removed raw SKU clipboard error diagnostics from the shared SKU cell.
- Removed direct `metadata.error?.message` rendering from job-progress
  notifications.

## Smells Deferred

- Admin user import row results and the financial credit-note error wrapper
  remain live raw-error candidates.
- Bulk import wizard logging still records bounded caught-exception messages for
  diagnostics; operator-facing bulk import text was already normalized in
  Reliability Maintainer Sprint 43.
- This slice does not add a new global notification/error component.
- Package-script execution through `bun run` still fails locally with
  `CouldntReadCurrentDirectory`; direct tools remain the reliable local path.

## Gates

- Focused tests:
  `./node_modules/.bin/vitest run tests/unit/shared/sku-cell-copy-feedback.test.tsx tests/unit/automation-jobs/job-progress-feedback-contract.test.ts tests/unit/shared/upload-retry-feedback-contract.test.ts`
  - Passed, 3 files / 7 tests.
- Targeted ESLint:
  `./node_modules/.bin/eslint src/hooks/files/use-files-supabase.ts src/components/shared/data-table/cells/sku-cell.tsx src/components/shared/notifications/job-progress-notification.tsx tests/unit/shared/sku-cell-copy-feedback.test.tsx tests/unit/automation-jobs/job-progress-feedback-contract.test.ts tests/unit/shared/upload-retry-feedback-contract.test.ts --report-unused-disable-directives`
  - Passed.
- Typecheck:
  `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit --pretty false`
- Passed.
- Full source ESLint:
  `./node_modules/.bin/eslint src --ext .ts,.tsx --report-unused-disable-directives`
  - Passed.
- Routine reliability guards:
  `node scripts/check-route-casts.mjs`
  `node scripts/check-pending-dialog-guards.mjs`
  `node scripts/check-read-path-query-guards.mjs`
  - Passed.
- Full unit suite:
  `./node_modules/.bin/vitest run tests/unit`
  - Passed, 725 files / 2,361 tests.
- Diff whitespace:
  `git diff --check`
- Passed.
- Package-script reliability:
  `bun run ...`
  - Skipped due the known local `CouldntReadCurrentDirectory` Bun runtime
    failure; direct project tools were used instead.

## Goal Adaptation

No goal text changed. This sprint continues the standing maintainer goal by
closing another bounded shared-platform resilience slice without broadening
domain behavior.

## Residual Risk

Low application-code risk after focused tests and final gates. Medium
resilience debt remains in the two domain/route-specific raw-error candidates
listed above.
