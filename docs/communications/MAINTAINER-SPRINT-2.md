# Communications Maintainer Sprint 2

## Status

Closed in commit-ready state.

## Issue 1: Inbox Action Failure Copy

### Problem

The communications inbox is an operator triage surface for live email workflows. Inbox item actions still used generic `getUserFriendlyMessage(error as Error)` descriptions under raw "Failed to ..." toast titles for mark-read, mark-all-read, star, archive, and delete failures. That left inbox actions behind the communications-owned mutation feedback contract and risked exposing backend, provider, or database details to operators.

### Workflow Spine

Communications inbox route
-> `Inbox`
-> `use-inbox-actions`
-> communications inbox action server functions
-> communications inbox/email-history query keys
-> communications-owned inbox mutation formatter
-> operator-safe failure toast copy.

### Touched Domains

- Communications inbox action hooks.
- Communications mutation feedback helper.
- Communications mutation feedback tests.
- Communications maintainer closeout docs.

### Business Value Protected

The shared inbox supports day-to-day email triage for ordering, support, warranty, RMA, dealer, and customer follow-up. When an operator marks email read, marks all email read, stars, archives, or deletes an email, failure copy should be safe and actionable without leaking provider details, tenant data internals, database names, stack traces, or raw server text.

### Scope Constraints

- Do not change inbox routes, the `Inbox` presenter, inbox action server functions, schemas, tenant predicates, optimistic cancel/invalidate behavior, success copy, read states, account connection, sync, campaign, template, scheduled email, signature, or settings behavior.
- Keep this as inbox action failure feedback only.
- Serialized gates are retired from routine closeout evidence and were not run for this communications slice because it does not touch serial lineage, inventory identity, warranty/RMA continuity, or repair scripts.

### Changes

- Added inbox action fallbacks for mark read, mark all read, toggle starred, archive, and delete to the communications mutation formatter.
- Routed all five inbox action `onError` handlers through `formatCommunicationInboxMutationError`.
- Added focused coverage for unsafe inbox fallback suppression and source-level inbox action formatter wiring.

### Standards Checked

- Domain ownership: inbox action feedback now uses the communications mutation formatter.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: preserved. This sprint changes post-failure feedback after existing inbox action mutations fail.
- Query/cache policy: unchanged. Inbox action optimistic cancellation and invalidation still use centralized communications inbox and email-history query keys.
- Tenant isolation/data integrity: unchanged. No server function, auth predicate, organization predicate, inbox persistence, or message state behavior changed.
- UI states/error handling: strengthened. Inbox action failures no longer expose raw mutation messages.
- Reviewability: the diff is limited to formatter fallbacks, inbox action error handlers, focused tests, and this closeout note.

### Smells Removed

- Generic `getUserFriendlyMessage(error as Error)` handling for five inbox action errors.
- Raw "Failed to ..." inbox action toast titles for mark-read, mark-all-read, star, archive, and delete failures.
- Missing inbox action coverage in the communications mutation feedback contract.

### Deferred

- Inbox account connection, sync, and callback feedback still use generic error formatting and should be reviewed as a separate inbox/account slice.
- Inbox read-state cached error copy is separate query-state behavior and remains out of this mutation-action slice.
- Quick-log, scheduled call, signature, settings, analytics, suppression, domain verification, campaign, and template action feedback remain separate communications slices.
- Browser QA was not run because this is failure-copy behavior with no intended route or visual layout change.

### Gates

- Passed: focused communications mutation feedback test, `./node_modules/.bin/vitest run tests/unit/communications/communications-mutation-errors.test.ts` - 1 file, 5 tests.
- Passed: targeted source scan for inbox formatter wiring and removed raw inbox action fallback paths.
- Passed: broader communications suite, `./node_modules/.bin/vitest run tests/unit/communications` - 12 files, 49 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Note: the broader suite still emits the existing `--localstorage-file` jsdom warning; tests pass.
- Skipped: browser QA because this is failure-copy behavior with no intended route or visual layout change.
- Skipped: reliability, finance, document, release, deploy, and serialized gates because this slice did not deliberately change route casts, pending dialog guards, read-path query guard baselines, finance persistence, document generation, release packaging, repair scripts, serial lineage, inventory identity, serialized movement, or warranty/RMA serial continuity.

### Goal Adaptation

Accepted. Routine serialized gates are no longer part of ordinary sprint closeout. They remain available only for work that directly changes serial lineage, inventory identity, warranty/RMA continuity, serialized movement, or related repair scripts.

### Residual Risk

Low for communications inbox action failure feedback. Remaining communications feedback risk is broader: inbox account/sync flows, scheduled calls, signatures, settings, analytics, suppression, domain verification, campaigns, and templates still need their own domain review.
