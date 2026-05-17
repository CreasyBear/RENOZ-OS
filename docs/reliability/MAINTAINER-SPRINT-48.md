# Reliability Maintainer Sprint 48: Admin User Import Result Feedback

## Status

Closed and commit-ready.

## Problem

The admin user import page still owned CSV parsing, column mapping, row
validation, invitation payload creation, and row-result error display in one
route presenter. It also rendered per-row batch result errors with
`r.error || 'Unknown error'`, while the server batch-insert catch returned raw
database exception text for every row in a failed insert batch.

## Workflow Spine Protected

Admin users import route -> import container -> import workflow helpers ->
`useBatchSendInvitations` -> `batchSendInvitations` server function -> users
invitation query keys/cache invalidation -> invitation result UI.

## Touched Domains

- Admin users.
- User invitations.
- Admin CSV import workflow.

## Business Value Protected

Bulk invitations help onboard operators, support staff, sales users, warehouse
users, and other RENOZ Energy teammates. Failed imports should tell the operator
which invitations need attention without exposing database/provider wording or
making the route component own every parsing and validation concern.

## Scope Constraints

- No route path, route search schema, permission, query key, cache invalidation,
  invitation acceptance, invitation resend/cancel, user role schema, or email
  delivery behavior changed.
- The UI flow stays upload -> map -> validate -> import -> complete.
- Existing safe business row errors such as existing users and pending
  invitations remain visible.
- This slice does not replace the whole import UI or introduce a CSV dependency.

## Changes

- Added pure admin import workflow helpers for CSV parsing, file validation,
  column auto-mapping, mapped row creation, row validation, invitation payload
  creation, parse-error formatting, and import-result error formatting.
- Improved local CSV parsing to handle quoted commas and escaped quotes.
- Added file-reader error handling and case-insensitive `.csv` file checks.
- Replaced per-row `r.error || 'Unknown error'` result rendering with
  `formatUserImportResultError`.
- Preserved the existing user-owned mutation formatter for full-batch failures.
- Replaced server batch-insert row failures with stable operator copy instead
  of raw `err.message`/database text.
- Added focused tests for import workflow helpers and source contracts.

## Standards Checked

- Domain ownership: admin user import parsing/result feedback now lives in a
  user-import workflow helper, with the route presenter orchestrating UI state.
- Route -> container/page -> hook -> server function -> schema/database flow:
  unchanged and clearer at the parsing/result boundary.
- Tenant isolation: unchanged. The server batch send still uses authenticated
  organization scope and existing tenant predicates.
- Transactional inventory and finance integrity: unchanged.
- Serialized lineage continuity: unchanged.
- Honest UI states: invalid CSV, unreadable files, invalid rows, failed rows,
  and full-batch failures now use stable operator copy.
- Query/cache contracts: unchanged. `useBatchSendInvitations` still owns
  invitation list/stats invalidation.
- Reviewable diff: one import workflow helper, one route presenter, one server
  row-result fallback, focused tests, and docs only.

## Smells Removed

- Removed inline CSV parsing and column auto-mapping from the route presenter.
- Removed raw/unknown per-row import result rendering.
- Removed raw server database exception text from batch invitation row results.
- Added pure helper tests around the admin import workflow.

## Smells Deferred

- The import page is still a large route presenter and could later be split into
  upload/map/validate/result subcomponents.
- The server batch invitation function remains a large mixed-concern function
  that combines preflight, insert, email delivery, user row creation, and audit.
- This slice does not add retry/download tooling for failed invitation rows.

## Gates

- Focused tests:
  `./node_modules/.bin/vitest run tests/unit/users/import-page-workflow-contract.test.ts tests/unit/users/user-mutation-errors.test.ts`
  - Passed, 2 files / 9 tests.
- Targeted ESLint:
  `./node_modules/.bin/eslint src/routes/_authenticated/admin/users/import-page.tsx src/routes/_authenticated/admin/users/-import-page-workflow.ts src/server/functions/users/invitations.ts tests/unit/users/import-page-workflow-contract.test.ts tests/unit/users/user-mutation-errors.test.ts --report-unused-disable-directives`
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
- Diff whitespace:
  `git diff --check`
  - Passed.

Skipped:
- Full unit suite and production build were not run for this bounded slice. The
  risk-selected gate set covered the touched workflow helper, existing user
  mutation formatter contract, route/server lint, type surface, reliability
  tripwires, and diff hygiene. Full unit/build remain appropriate before a
  release or branch landing decision.

## Goal Adaptation

No goal text changed. This sprint continues the standing maintainer goal by
closing the remaining tracked user-facing raw-error candidate from the
resilience audit while making the route easier to reason about.

## Residual Risk

Low to medium. The touched behavior is covered by focused helper/source
contracts and repo gates, but the route presenter and batch invitation server
function remain large structural seams. Split them further only when another
behavior or UX slice justifies the wider change.
