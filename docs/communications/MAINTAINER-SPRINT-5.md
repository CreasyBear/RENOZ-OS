# Communications Maintainer Sprint 5

## Status

Closed in commit-ready state.

## Issue 1: Scheduled Call Mutation Failure Copy

### Problem

Scheduled call actions still used generic `getUserFriendlyMessage(error as Error)`, raw mutation error display, or broad "Failed to ..." toasts. That left call scheduling, completion, snooze/reschedule, and cancellation behind the communications-owned mutation feedback contract and risked exposing backend, database, stack, or server details during customer follow-up workflows.

### Workflow Spine

Communications calls route
-> `CallsPage`
-> `ScheduledCallsList`, `ScheduleCallDialog`, `CallOutcomeDialog`, and `ScheduledCallActionMenu`
-> scheduled call mutation hooks
-> communications scheduled call server functions
-> scheduled call schema/database records
-> scheduled call query keys and activity invalidation
-> communications-owned scheduled call mutation formatter
-> operator-safe schedule, complete, outcome, snooze/reschedule, and cancel failure copy.

### Touched Domains

- Communications scheduled call route/page.
- Communications scheduled call dialogs and action menu.
- Communications mutation feedback helper.
- Communications mutation feedback tests.
- Communications maintainer closeout docs.

### Business Value Protected

Scheduled calls support sales follow-up, install coordination, technical support, warranty/RMA follow-up, and customer recovery. Operators should be able to schedule, complete, snooze, reschedule, or cancel calls with safe recovery copy when the mutation fails, without seeing raw database constraints, stack traces, or server internals.

### Scope Constraints

- Do not change scheduled call routes, list rendering, form validation, dialog layout, action labels, server functions, schemas, tenant predicates, activity logging, success copy, read-state query normalization, or scheduled call status behavior.
- Preserve the existing cache policy: schedule invalidates scheduled calls; update/cancel/complete invalidate scheduled calls and detail where applicable; complete also invalidates activity queries.
- Keep this as scheduled call mutation failure feedback only.
- Serialized gates are retired from routine closeout evidence and were not run for this communications slice because it does not touch serial lineage, inventory identity, warranty/RMA continuity, serialized movement, or repair scripts.

### Changes

- Added scheduled call fallbacks for schedule, complete, outcome, cancel, reschedule, and snooze failures.
- Routed `CallsPage` complete, cancel, and reschedule failures through `formatCommunicationScheduledCallMutationError`.
- Routed `ScheduleCallDialog` schedule failure toast and form submit error through the communications-owned formatter.
- Routed `CallOutcomeDialog` outcome failure toast through the communications-owned formatter.
- Routed `ScheduledCallActionMenu` snooze and cancel failures through the communications-owned formatter.
- Added focused coverage for unsafe scheduled call fallback suppression and source-level scheduled call formatter wiring.

### Standards Checked

- Domain ownership: scheduled call mutation feedback now uses the communications mutation formatter.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: preserved. This sprint changes post-failure feedback after existing scheduled call mutations fail.
- Query/cache policy: unchanged. No invalidation, rollback, stale-time, detail key, list key, upcoming key, or activity key behavior changed.
- Tenant isolation/data integrity: unchanged. No server function, auth predicate, organization predicate, scheduled call persistence, activity logging, or status transition behavior changed.
- UI states/error handling: strengthened. Scheduled call mutation failures no longer expose raw mutation messages.
- Reviewability: the diff is limited to formatter fallbacks, page/dialog/menu failure handlers, focused tests, and this closeout note.

### Smells Removed

- Generic `getUserFriendlyMessage(error as Error)` handling for scheduled call schedule, outcome, snooze, and cancel failures.
- Raw `scheduleMutation.error?.message` display in the schedule-call dialog submit error.
- Broad unformatted `toastError("Failed to ...")` scheduled call page mutation failures.
- Missing scheduled call mutation coverage in the communications mutation feedback contract.

### Deferred

- Scheduled call read-state copy still displays normalized read-query messages and can be reviewed separately as a query-state slice.
- Upcoming calls widget read-state copy still displays normalized read-query messages and remains outside this mutation-feedback slice.
- Template editor, communication preferences, suppression dialogs, quick log, signatures, email preview, domain verification, analytics, campaign detail panel, and campaign wizard feedback remain separate communications slices.
- Browser QA was not run because this is failure-copy behavior with no intended route or visual layout change.

### Gates

- Passed: focused communications mutation feedback test, `./node_modules/.bin/vitest run tests/unit/communications/communications-mutation-errors.test.ts` - 1 file, 8 tests.
- Passed: targeted source scan for scheduled call formatter wiring and removed raw scheduled call mutation failure paths.
- Passed: broader communications suite, `./node_modules/.bin/vitest run tests/unit/communications` - 12 files, 52 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Note: the broader suite still emits the existing `--localstorage-file` jsdom warning; tests pass.
- Skipped: browser QA because this is failure-copy behavior with no intended route or visual layout change.
- Skipped: reliability, finance, document, release, deploy, and serialized gates because this slice did not deliberately change route casts, pending dialog guards, read-path query guard baselines, finance persistence, document generation, release packaging, repair scripts, serial lineage, inventory identity, serialized movement, or warranty/RMA serial continuity.

### Goal Adaptation

Declined. The standing maintainer process already covers domain ownership, operator-safe errors, query/cache contracts, meaningful tests, and evidence-based closeout.

### Residual Risk

Low for scheduled call mutation failure feedback. Remaining communications feedback risk is broader: read-state copy and other communications action surfaces still need their own domain review.
