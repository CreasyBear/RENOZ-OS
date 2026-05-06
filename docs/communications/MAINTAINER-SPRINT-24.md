# Communications Maintainer Sprint 24

## Status

Closed in commit-ready state.

## Issue 1: Call Outcome Submit Error Copy

### Problem

The call outcome dialog used the communications scheduled-call mutation formatter for toast failures, but the form-level submit error still rendered `completeMutation.error?.message` directly. A failed outcome log could expose backend-shaped details inside the dialog even though the domain formatter already had safe recovery copy for the same mutation.

### Workflow Spine

Call outcome workflow
-> `CallOutcomeDialog`
-> `useCompleteCall`
-> scheduled-call completion server function
-> scheduled-call schema/database records
-> scheduled-call query/cache invalidation
-> communications scheduled-call mutation formatter
-> operator-safe form submit error copy.

### Touched Domains

- Communications scheduled-call outcome dialog.
- Communications mutation error source contract test.
- Communications maintainer closeout docs.

### Business Value Protected

Call outcomes turn customer follow-up into usable operational history. If logging an outcome fails, operators need clear recovery copy in the same dialog without database, provider, or infrastructure details.

### Scope Constraints

- Do not change scheduled-call completion behavior, outcome values, customer links, dialog form validation, query keys, cache invalidation, server functions, tenant predicates, schemas, or toast behavior.
- Keep this as scheduled-call outcome submit-error display only.
- Browser QA is skipped because this is copy-path behavior with no intended layout or interaction change.
- The serialized gate pack is closed and no longer part of routine maintainer closeout; this sprint did not touch serialized lineage or inventory identity work.

### Changes

- Routed call outcome form-level submit errors through `formatCommunicationScheduledCallMutationError(..., "outcome")`.
- Extended the communications mutation error source contract so the outcome dialog keeps both toast and submit-error paths behind the scheduled-call formatter.

### Standards Checked

- Domain ownership: scheduled-call outcome submit copy now uses the communications mutation formatter.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: preserved. This sprint changes only dialog error presentation after the existing mutation fails.
- Query/cache policy: unchanged. Scheduled-call invalidation and mutation behavior were not changed.
- Tenant isolation/data integrity: unchanged. Outcome logging still flows through the existing server function and tenant predicates.
- UI states/error handling: strengthened. The dialog no longer renders raw mutation error text in its form-level summary.
- Reviewability: the diff is limited to one dialog submit-error expression, one source contract assertion, and this closeout note.

### Smells Removed

- Direct `completeMutation.error?.message` rendering in the call outcome dialog.
- Split error policy where toast failures were formatter-owned but form summary failures were raw.

### Deferred

- Template editor submit-error copy remains a separate communications mutation/form slice.
- Generic communications error boundary behavior remains separate because it handles render exceptions rather than mutation feedback.
- Browser QA was not run because this is submit-error copy behavior with no intended layout change.

### Gates

- Passed: focused communications mutation error contract test, `./node_modules/.bin/vitest run tests/unit/communications/communications-mutation-errors.test.ts` - 1 file, 13 tests.
- Passed: broader communications suite, `./node_modules/.bin/vitest run tests/unit/communications` - 20 files, 70 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Note: the broader communications suite still emits the existing `--localstorage-file` jsdom warning; tests pass.
- Skipped: browser QA because this is mutation copy behavior with no intended route or visual layout change.
- Skipped: reliability, finance, document, release, and deploy gates because this slice did not deliberately change route casts, pending dialog guards, read-path query guard baselines, finance persistence, document generation, release packaging, or production release paths.

### Goal Adaptation

Declined. Sprint 23 already updated the serialized gate posture. This sprint applies the standing maintainer goal by tightening an operator-facing mutation feedback boundary without widening behavior.

### Residual Risk

Low for call outcome submit-error copy. Remaining communications error-surface risk is concentrated in template editor form summary behavior and the generic communications render-boundary display.
