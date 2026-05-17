# Reliability Maintainer Sprint 47: Credit Note Read-State Feedback

## Status

Closed and commit-ready.

## Problem

The credit-note list container still passed the hook error object into the
presenter as an `Error`, manufacturing `new Error('Unknown error')` for
non-`Error` failures. The presenter happened to render stable copy, but the
container/presenter contract still allowed raw read failures to cross the UI
boundary. The detail container also used one not-found message for any failed
read, which made system failures less honest.

## Workflow Spine Protected

Financial credit-note route -> list/detail container -> `useCreditNotes` /
`useCreditNote` -> finance server function -> read-path policy -> finance-owned
read formatter -> list/detail error UI.

## Touched Domains

- Financial credit notes.
- Shared financial read-state feedback pattern.

## Business Value Protected

Credit notes are finance closeout tools for refunds, invoice adjustments, and
RMA/remedy outcomes. Operators need stable, finance-owned read failure copy when
credit-note lists or details fail, without database/provider wording and without
mislabeling every failed detail read as a deleted record.

## Scope Constraints

- No route search schema, server function, database query, tenant predicate,
  mutation behavior, PDF generation, invoice application, or cache invalidation
  changed.
- Credit-note list and detail hooks already normalize read failures; this slice
  hardens the final UI boundary.
- The presenter remains presentational and receives already-safe copy.
- This slice does not address admin user import feedback or other financial
  monolith concerns.

## Changes

- Added a credit-note read feedback helper with list/detail fallback messages.
- Routed credit-note list read errors through `getCreditNoteListReadErrorMessage`.
- Replaced the list presenter `Error | null` prop with an explicit
  `readErrorMessage: string | null` contract.
- Routed credit-note detail error copy through
  `getCreditNoteDetailReadErrorMessage`.
- Changed the detail error title from not-found-only copy to a more honest
  failed-read title.
- Added a focused finance read feedback contract.
- Updated the housekeeping ledger to remove credit-note list read-state wrapping
  from the current live raw-error examples.

## Standards Checked

- Domain ownership: financial credit notes now own list/detail read copy.
- Route -> container/page -> hook -> server function -> schema/database flow:
  unchanged and made clearer at the UI boundary.
- Tenant isolation: unchanged. Existing finance server functions and read hooks
  still own organization scope.
- Transactional inventory and finance integrity: unchanged. No write path,
  invoice application, or credit-note mutation behavior changed.
- Serialized lineage continuity: unchanged.
- Honest UI states: list and detail read failures now display formatter-owned
  copy, preserving normalized not-found/system distinction.
- Query/cache contracts: unchanged. Existing `queryKeys.financial` and
  credit-note invalidation contracts remain in place.
- Reviewable diff: one finance helper, two containers/presenter, one focused
  test, and docs only.

## Smells Removed

- Removed `new Error('Unknown error')` wrapping from the credit-note list
  container.
- Removed the raw error-object boundary between the credit-note list container
  and presenter.
- Removed not-found-only detail copy for all credit-note detail failures.

## Smells Deferred

- Admin user import still has ad hoc CSV parsing/result feedback and remains the
  next live raw-error/resilience candidate.
- Broader financial monoliths, including Xero and credit-note server surfaces,
  remain large-file architecture debt.
- This slice does not add a lint rule banning raw error object props in
  presenters.

## Gates

- Focused tests:
  `./node_modules/.bin/vitest run tests/unit/financial/credit-note-read-feedback-contract.test.ts`
  - Passed, 1 file / 3 tests.
- Focused finance regression pack:
  `./node_modules/.bin/vitest run tests/unit/financial/credit-note-read-feedback-contract.test.ts tests/unit/financial/credit-note-feedback-contract.test.ts tests/unit/financial/credit-note-sorting.test.ts`
  - Passed, 3 files / 9 tests.
- Targeted ESLint:
  `./node_modules/.bin/eslint src/components/domain/financial/credit-note-read-error-messages.ts src/components/domain/financial/credit-notes-list-container.tsx src/components/domain/financial/credit-notes-list-presenter.tsx src/components/domain/financial/credit-note-detail-container.tsx tests/unit/financial/credit-note-read-feedback-contract.test.ts --report-unused-disable-directives`
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
- Full unit suite:
  `./node_modules/.bin/vitest run tests/unit`
  - Skipped; this slice changed a finance read-feedback UI boundary only. Focused
    finance tests, typecheck, full source lint, and routine read-path guards were
    the meaningful evidence.
- Production build:
  `NODE_ENV=production NODE_OPTIONS=--max-old-space-size=12288 ./node_modules/.bin/vite build`
  - Skipped; no route loading, server code, schema, build config, or bundle
    boundary changed.
- Package-script reliability:
  `bun run ...`
  - Skipped due the known local `CouldntReadCurrentDirectory` Bun runtime
    failure; direct project tools were used instead.

## Goal Adaptation

No goal text changed. This sprint continues the standing maintainer goal by
closing a small financial read-state boundary without broadening finance
behavior.

## Residual Risk

Low code risk after focused and broad static gates passed because this is a
client read-feedback contract change only. Residual product risk remains in the
admin user import workflow and broader financial large-file architecture debt.
