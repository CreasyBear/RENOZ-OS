# Communications Maintainer Sprint 4

## Status

Closed in commit-ready state.

## Issue 1: Scheduled Email Mutation Failure Copy

### Problem

Scheduled email create, update, and cancel failures still used generic `getUserFriendlyMessage(error as Error)` or raw `error.message` paths. That left scheduled delivery operations behind the communications-owned mutation feedback contract and risked exposing provider, database, stack, or server details during a workflow operators use for follow-up, order updates, reminders, and customer support.

### Workflow Spine

Communications scheduled emails route
-> `ScheduledEmailsPage`
-> `ScheduledEmailsList` and `ScheduleEmailDialog`
-> scheduled email mutation hooks
-> communications scheduled email server functions
-> scheduled email schema/database records
-> scheduled email query keys
-> communications-owned scheduled email mutation formatter
-> operator-safe cancel and submit failure copy.

### Touched Domains

- Communications scheduled email route/page.
- Communications scheduled email dialog.
- Communications mutation feedback helper.
- Communications mutation feedback tests.
- Communications maintainer closeout docs.

### Business Value Protected

Scheduled emails support RENOZ follow-up across sales, ordering, support, warranty, RMA, dealer, and customer workflows. Operators should be able to schedule, edit, or cancel delivery with safe recovery copy when the mutation fails, without seeing raw database constraints, provider errors, stack traces, or server internals.

### Scope Constraints

- Do not change scheduled email routes, list rendering, dialog layout, form validation, template/signature selection, server functions, schemas, tenant predicates, processing jobs, success copy, read-state query normalization, or scheduled email status behavior.
- Preserve the existing cache policy: schedule invalidates scheduled email lists; update invalidates scheduled email lists and the edited detail; cancel invalidates scheduled email lists and the cancelled detail.
- Keep this as scheduled email mutation failure feedback only.
- Serialized gates are retired from routine closeout evidence and were not run for this communications slice because it does not touch serial lineage, inventory identity, warranty/RMA continuity, serialized movement, or repair scripts.

### Changes

- Added scheduled email fallbacks for schedule, update, and cancel failures.
- Routed scheduled email cancel failures through `formatCommunicationScheduledEmailMutationError`.
- Routed scheduled email dialog submit failures through `formatCommunicationScheduledEmailMutationError`, choosing schedule or update based on edit state.
- Added focused coverage for unsafe scheduled email fallback suppression and source-level scheduled email formatter wiring.

### Standards Checked

- Domain ownership: scheduled email mutation feedback now uses the communications mutation formatter.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: preserved. This sprint changes post-failure feedback after existing scheduled email mutations fail.
- Query/cache policy: unchanged. No invalidation, rollback, stale-time, detail key, or list key behavior changed.
- Tenant isolation/data integrity: unchanged. No server function, auth predicate, organization predicate, scheduled email persistence, template data, signature data, processing job, or status transition behavior changed.
- UI states/error handling: strengthened. Scheduled email schedule, update, and cancel failures no longer expose raw mutation messages.
- Reviewability: the diff is limited to formatter fallbacks, page/dialog failure handlers, focused tests, and this closeout note.

### Smells Removed

- Generic `getUserFriendlyMessage(error as Error)` handling for scheduled email submit failures.
- Raw `error.message` cancel fallback in the scheduled emails page.
- Missing scheduled email mutation coverage in the communications mutation feedback contract.

### Deferred

- Scheduled email read-state copy still displays normalized read-query messages and can be reviewed separately as a query-state slice.
- Initial scheduled email detail load errors in the dialog still use the read-path normalizer and remain separate from mutation feedback.
- Template editor, communication preferences, suppression dialogs, scheduled calls, quick log, signatures, email preview, domain verification, analytics, campaign detail panel, and campaign wizard feedback remain separate communications slices.
- Browser QA was not run because this is failure-copy behavior with no intended route or visual layout change.

### Gates

- Passed: focused communications mutation feedback test, `./node_modules/.bin/vitest run tests/unit/communications/communications-mutation-errors.test.ts` - 1 file, 7 tests.
- Passed: targeted source scan for scheduled email formatter wiring and removed raw scheduled email mutation failure paths.
- Passed: broader communications suite, `./node_modules/.bin/vitest run tests/unit/communications` - 12 files, 51 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Note: the broader suite still emits the existing `--localstorage-file` jsdom warning; tests pass.
- Skipped: browser QA because this is failure-copy behavior with no intended route or visual layout change.
- Skipped: reliability, finance, document, release, deploy, and serialized gates because this slice did not deliberately change route casts, pending dialog guards, read-path query guard baselines, finance persistence, document generation, release packaging, repair scripts, serial lineage, inventory identity, serialized movement, or warranty/RMA serial continuity.

### Goal Adaptation

Declined. The standing maintainer process already covers domain ownership, operator-safe errors, query/cache contracts, meaningful tests, and evidence-based closeout.

### Residual Risk

Low for scheduled email mutation failure feedback. Remaining communications feedback risk is broader: read-state copy and other communications action surfaces still need their own domain review.
