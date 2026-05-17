# Reliability Maintainer Sprint 43: Shared Bulk Error Feedback

## Status

Closed and commit-ready.

## Problem

Shared bulk workflows were still allowed to echo thrown technical messages into
operator-facing UI. The highest leverage current examples were the generic bulk
operations modal and the shared bulk import wizard. Both sit under multiple
domains, so raw failures here become repeated operator frustration across
products, customers, warranty imports, and other multi-record workflows.

## Workflow Spine Protected

Bulk action/import UI -> shared component -> caller-provided mutation/import
handler -> operation result or rejection -> centralized mutation error formatter
-> safe inline feedback and row-level result copy.

## Touched Domains

- Shared platform UI.
- Bulk operations used by product/customer-style multi-record workflows.
- Bulk import workflows used by product/warranty/customer-style imports.

## Business Value Protected

Bulk workflows are where operators fix data at scale. When they fail, the UI
must say what the operator can do next instead of leaking provider, database,
or stack wording. This slice keeps high-volume operational recovery calmer and
more consistent without changing domain behavior.

## Scope Constraints

- No route, schema, database, tenant, inventory, finance, or query/cache
  contracts changed.
- Safe caller-provided validation or business messages can still pass through
  the centralized formatter.
- Technical messages that look like database/provider/stack failures now fall
  back to stable copy.
- Client-side diagnostic logging still records bounded failure context.

## Changes

- Routed `BulkOperationsModal` dialog errors through
  `formatMutationError`.
- Sanitized bulk operation result row errors before display.
- Replaced thrown-operation `String(error)` result fallback with safe formatter
  copy.
- Routed `BulkImportWizard` parse/import errors through
  `formatMutationError`.
- Sanitized shared bulk import row result errors before display.
- Added focused tests for unsafe rejected bulk operations, unsafe row-level
  bulk operation results, unsafe parse failures, and unsafe import failures.

## Standards Checked

- Domain ownership: shared UI owns shared feedback behavior; domain callers
  keep their specific mutation/import implementations.
- Route -> container/page -> hook -> server function -> schema/database flow:
  unchanged. This slice only hardens the shared presentation edge.
- Tenant isolation: unchanged.
- Transactional inventory and finance integrity: unchanged.
- Serialized lineage continuity: unchanged.
- Honest UI states: unsafe failures now present stable recovery copy instead
  of raw technical text.
- Query/cache contracts: unchanged.
- Reviewable diff: two shared components, focused tests, and docs only.

## Smells Removed

- Removed direct `err instanceof Error ? err.message` display from the shared
  bulk operation dialogs.
- Removed raw `String(error)` operation-result display from the shared bulk
  modal.
- Removed direct thrown-message display from shared bulk import parse/import
  failure states.
- Removed raw imported-row result display from the shared bulk import wizard.

## Smells Deferred

- Remaining error-boundary surfaces still render `this.state.error.message`
  and should get a separate shared error-boundary formatter pass.
- `src/components/shared/data-table/cells/sku-cell.tsx`,
  `src/components/shared/notifications/job-progress-notification.tsx`, and
  several route-level import/upload paths still need revalidation before
  claiming broad raw-error closure.
- This slice does not add retryability affordances beyond stable recovery copy.
- Package-script execution through `bun run` still fails locally with
  `CouldntReadCurrentDirectory`; direct Node and binary gates remain the
  reliable local path.

## Gates

- Focused shared feedback tests:
  `./node_modules/.bin/vitest run tests/unit/shared/bulk-import-wizard-error-handling.test.tsx tests/unit/shared/bulk-operations-modal-feedback-contract.test.tsx`
  - Passed, 2 files / 8 tests.
- Targeted ESLint:
  `./node_modules/.bin/eslint src/components/shared/bulk-import-wizard.tsx src/components/shared/modals/bulk-operations-modal.tsx tests/unit/shared/bulk-import-wizard-error-handling.test.tsx tests/unit/shared/bulk-operations-modal-feedback-contract.test.tsx --report-unused-disable-directives`
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
  - Passed, 723 files / 2357 tests.
- Diff whitespace:
  `git diff --check`
  - Passed.
- Package-script reliability:
  `bun run lint:reliability`
  - Skipped in final gates because the current local Bun runtime still fails
    before script execution with `CouldntReadCurrentDirectory`; direct Node
    guard commands above are the authoritative local evidence for this slice.

## Goal Adaptation

No goal text changed. This sprint applies the standing maintainer goal by
hardening shared operator-safe error behavior in a bounded, reviewable slice.

## Residual Risk

Low application-code risk for the touched components after focused tests and
final gates. Medium product-quality debt remains because raw technical error
display still exists in other shared boundaries and error boundaries.
