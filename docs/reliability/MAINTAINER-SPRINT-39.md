# Reliability Maintainer Sprint 39: Bulk Import Failure Diagnostics

## Status

Closed and commit-ready.

## Problem

`BulkImportWizard` is a shared CSV import surface. It had two failure paths that
still bypassed the centralized logger:

- file parsing failures used `console.error('Failed to parse file:', err)`
- import operation failures used `console.error('Import failed:', err)`

Triage exposed a second issue: parse failures were visible on the upload step,
but import operation failures set `error` and returned to the validate step
where that error was not rendered. That made a failed import look like the
operator was simply back at validation with no clear reason.

## Workflow Spine Protected

Shared bulk import wizard -> file parser -> mapping/validation -> import action
-> visible failure state -> bounded structured diagnostic.

## Touched Domains

- Shared import UI.
- Product/customer-style bulk import surfaces that may use the generic wizard.
- Reliability/test-signal coverage for shared error handling.

## Business Value Protected

Bulk CSV import is a leverage point for operational data: product catalogs,
customers, and future import surfaces can move many records at once. Import
failures need to be visible and diagnosable without dumping raw console output.
Operators should know whether the file could not be parsed or the import action
failed after validation.

## Scope Constraints

- No route, domain container, import server function, schema, database query,
  tenant check, query key, cache invalidation, inventory mutation, finance
  behavior, or serialized-lineage behavior changed.
- Existing upload-step parse error copy remains visible.
- Existing row validation behavior is unchanged.
- Existing import result summary behavior is unchanged.
- Existing import progress behavior is unchanged.

## Changes

- Replaced raw parse-failure `console.error` with
  `logger.warn('Bulk import file parsing failed', ...)`.
- Replaced raw import-failure `console.error` with
  `logger.warn('Bulk import operation failed', ...)`.
- Logged bounded context only: component name, entity plural, file size/type,
  attempted row count, import mode, and error message.
- Cleared stale errors when a new import starts.
- Added a visible destructive alert for non-upload-step failures so failed import
  operations remain visible after returning to validation.
- Added focused render tests for parse failure visibility, import failure
  visibility, bounded logger context, and the no-raw-console source contract.

## Standards Checked

- Domain ownership: shared import failure handling belongs in
  `BulkImportWizard`; domain-specific import hooks/server functions remain
  untouched.
- Route -> container/page -> hook -> server function -> schema/database -> query
  key/cache policy: unchanged. This slice only hardens shared UI behavior after
  parser/import promises reject.
- Tenant isolation: unchanged.
- Transactional inventory and finance integrity: unchanged.
- Serialized lineage continuity: unchanged.
- Honest UI states and operator-safe errors: improved by rendering import
  operation failures on the validation step instead of silently dropping them.
- Mutation/cache contracts: unchanged.
- Reviewable diff: one shared component update, one focused shared test, one
  closeout doc.

## Smells Removed

- Removed the last runtime `console.error` matches from `src/components/shared`.
- Removed silent import operation failure state in the generic bulk import
  wizard.
- Kept diagnostics centralized and bounded.

## Smells Deferred

- The generic wizard still surfaces thrown error messages directly. Existing
  domain-owned import flows already use safer domain formatters; a future slice
  can add optional shared formatter props if the generic wizard gets direct
  production use.
- Broader clipboard/copy behavior across detail pages remains inconsistent.
- No browser QA was run because the behavior is covered by focused component
  render tests and does not alter routing, data fetching, or layout structure.

## Gates

- Focused component test:
  `./node_modules/.bin/vitest run tests/unit/shared/bulk-import-wizard-error-handling.test.tsx --reporter=dot --printConsoleTrace`
  - Passed, 1 file / 3 tests in 2s.
- Targeted ESLint:
  `./node_modules/.bin/eslint src/components/shared/bulk-import-wizard.tsx tests/unit/shared/bulk-import-wizard-error-handling.test.tsx --report-unused-disable-directives`
  - Passed in 2s.
- Typecheck:
  `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`
  - Passed in 62s.
- Full source ESLint:
  `./node_modules/.bin/eslint src --ext .ts,.tsx --report-unused-disable-directives`
  - Passed in 63s.
- Routine reliability guards:
  - `node scripts/check-route-casts.mjs` passed.
  - `node scripts/check-pending-dialog-guards.mjs` passed.
  - `node scripts/check-read-path-query-guards.mjs` passed.
- Full unit suite:
  `./node_modules/.bin/vitest run tests/unit --reporter=dot`
  - Passed, 717 files / 2334 tests in 106s.
- Shared runtime console check:
  `rg -n "console\\.error" src/components/shared --glob '*.ts' --glob '*.tsx'`
  - Passed with no matches.

## Goal Adaptation

No goal text changed. This sprint applies the standing maintainer goal by
hardening a shared import surface so failures are visible to operators and
diagnostics stay centralized.

## Residual Risk

Low application risk. The change is isolated to shared UI failure handling after
file parsing or import promises reject. Medium future design risk remains if the
generic wizard becomes a primary production import path without domain-specific
safe error formatters.
