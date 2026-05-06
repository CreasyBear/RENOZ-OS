# Communications Maintainer Sprint 9

## Status

Closed in commit-ready state.

## Issue 1: Quick Log Mutation Failure Copy

### Problem

The quick log dialog still handled save failures with generic `getUserFriendlyMessage(error as Error)` copy under a broad "Failed to save log" toast. That left a high-frequency operator workflow behind the communications mutation feedback contract and could expose backend, database, stack, permission, or validation internals while operators capture calls, notes, and meetings.

### Workflow Spine

Authenticated app shell and command palette quick-log entry points
-> `QuickLogDialog`
-> `useCreateQuickLog`
-> `createQuickLog` server function
-> `quickLogSchema`
-> `activities` insert and completed `scheduledCalls` insert in one transaction for call logs
-> activity, customer, opportunity, scheduled-call, and customer-communications query key invalidation
-> communications-owned quick log mutation formatter
-> operator-safe save and retry-failure copy.

### Touched Domains

- Communications quick log dialog.
- Communications mutation feedback helper.
- Quick log activity/cache contract tests.
- Communications mutation feedback tests.
- Communications maintainer closeout docs.

### Business Value Protected

Quick log is an operational memory surface. It helps RENOZ capture customer calls, notes, meetings, customer timelines, opportunity context, and completed call records without forcing operators through heavier workflows. Failed saves need safe, direct recovery copy because losing or confusing activity logging weakens support, sales follow-up, warranty context, and handover quality.

### Scope Constraints

- Do not change authenticated route wiring, command palette behavior, quick-log dialog layout, customer selection, form schema, success copy, keyboard shortcut behavior, server function, database writes, tenant predicates, transaction boundary, or mutation cache policy.
- Preserve the existing cache contract: successful quick logs still invalidate activity roots, customer/opportunity activity keys, customer communications, order entity prefixes, and scheduled calls for logged calls.
- Keep this as quick log mutation failure feedback only.
- Serialized gates remain retired from routine closeout evidence and were not run for this communications slice because it does not touch serial lineage, inventory identity, warranty/RMA continuity, serialized movement, or repair scripts.

### Changes

- Added a communications-owned quick log mutation fallback.
- Routed initial quick log save failure copy through `formatCommunicationQuickLogMutationError`.
- Reused one quick log mutation input object for initial save and retry.
- Added safe retry failure copy so a failed toast retry does not silently fall back to raw or missing feedback.
- Added focused coverage for unsafe quick log fallback suppression and source-level quick log formatter wiring.

### Standards Checked

- Domain ownership: quick log mutation feedback now uses the communications mutation formatter.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: preserved. This sprint changes post-failure feedback after the existing quick log mutation fails.
- Query/cache policy: unchanged. No invalidation, rollback, stale-time, optimistic update, or cache key behavior changed.
- Tenant isolation/data integrity: unchanged. `createQuickLog` still uses `withAuth`, writes `organizationId`, and keeps activity plus completed-call insert behavior inside the existing transaction.
- UI states/error handling: strengthened. Initial save and retry failures now use operator-safe copy.
- Reviewability: the diff is limited to formatter fallback, quick-log failure handlers, focused tests, and this closeout note.

### Smells Removed

- Generic `getUserFriendlyMessage(error as Error)` handling for quick log save failures.
- Broad "Failed to save log" toast title that bypassed communications-owned mutation copy.
- Duplicated quick-log mutation input construction between initial save and retry.
- Retry failure path without safe, domain-owned failure copy.

### Deferred

- Retry success behavior is unchanged; this slice did not add a new success toast or close behavior for toast-triggered retries.
- Quick log read/presentation behavior, customer selector UX, and keyboard shortcut ownership remain separate slices.
- Communication preferences, email preview, domain verification, analytics, campaign detail panel, and campaign wizard feedback remain separate communications slices.
- Browser QA was not run because this is failure-copy behavior with no intended route or visual layout change.

### Gates

- Passed: focused communications mutation feedback test, `./node_modules/.bin/vitest run tests/unit/communications/communications-mutation-errors.test.ts` - 1 file, 12 tests.
- Passed: targeted source scan for quick-log formatter wiring and removed raw quick-log mutation failure paths.
- Passed: broader communications plus quick-log cache contract suite, `./node_modules/.bin/vitest run tests/unit/communications tests/unit/activities/use-quick-log-invalidation.test.ts` - 13 files, 57 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Note: the broader suite still emits the existing `--localstorage-file` jsdom warning; tests pass.
- Skipped: browser QA because this is failure-copy behavior with no intended route or visual layout change.
- Skipped: reliability, finance, document, release, and deploy gates because this slice did not deliberately change route casts, pending dialog guards, read-path query guard baselines, finance persistence, document generation, release packaging, or production release paths.
- Retired for routine closeout: serialized gate evidence. It remains relevant only for direct serial lineage, inventory identity, serialized movement, warranty/RMA serial continuity, or repair-script work.

### Goal Adaptation

Declined. Sprint 8 already adapted the standing maintainer process to retire routine serialized gates. This sprint applies the existing goal by tightening a high-frequency communications mutation boundary while preserving cache, tenancy, and transaction contracts.

### Residual Risk

Low for quick log mutation failure feedback. Remaining communications feedback risk is broader: preferences, preview, domain verification, analytics, campaign wizard/detail, and remaining read-state surfaces still need their own domain review.
