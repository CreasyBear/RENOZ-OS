# Communications Maintainer Sprint 19

## Status

Closed in commit-ready state.

## Issue 1: Scheduled Email List Cold-Load Read-State Copy

### Problem

The scheduled email route cached-degraded alert was already behind communications-owned read copy, but the `ScheduledEmailsList` presenter still rendered direct `error.message` text in its cold-load failure state. The hook already normalizes scheduled email list read failures, but the presenter display boundary could still expose backend-shaped errors.

### Workflow Spine

Scheduled email route
-> `ScheduledEmailsPage`
-> `ScheduledEmailsList`
-> `useScheduledEmails`
-> scheduled email server functions
-> scheduled email schemas and database records
-> centralized scheduled email list query key
-> normalized read-query error
-> communications-owned read-state formatter
-> operator-safe cold-load copy.

### Touched Domains

- Communications scheduled email list read-state UI.
- Communications read-state tests.
- Communications scheduled email list runtime tests.
- Communications maintainer closeout docs.

### Business Value Protected

Scheduled emails are operational reminders and follow-up work. Operators should get clear recovery copy when the list cannot load, without seeing provider, database, or backend details.

### Scope Constraints

- Do not change scheduled email route filters, cached-degraded route alert, list table rendering, empty state, edit/cancel actions, mutation copy, hook normalization, server functions, tenant predicates, query keys, cache invalidation, scheduled email processing, or status behavior.
- Keep this as cold-load read-state copy only.
- Browser QA is skipped because this is copy-path behavior with no intended route, layout, or interaction change.
- Serialized gates are retired from routine closeout evidence and were not run for this communications slice because it does not touch serial lineage, inventory identity, warranty/RMA continuity, serialized movement, or repair scripts.

### Changes

- Routed scheduled email list cold-load failure copy through `formatCommunicationReadError`.
- Reused `COMMUNICATION_READ_MESSAGES.scheduledEmails` so page and presenter copy share the same communications-owned fallback.
- Extended focused source coverage so the scheduled email list stays behind communications-owned copy.
- Added runtime presenter coverage that backend-shaped scheduled email list errors do not render to operators.

### Standards Checked

- Domain ownership: scheduled email list cold-load copy now uses the communications read formatter.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: preserved. This sprint changes only the presenter display boundary after the existing scheduled email list read fails without cached data.
- Query/cache policy: unchanged. Scheduled email list query keys, cache behavior, and invalidation behavior were not changed.
- Tenant isolation/data integrity: unchanged. Scheduled email reads still flow through existing server functions and tenant predicates.
- UI states/error handling: strengthened. Scheduled email cold-load list state no longer renders direct raw error text.
- Reviewability: the diff is limited to one presenter message call site, focused source coverage, runtime presenter coverage, and this closeout note.

### Smells Removed

- Direct `error instanceof Error ? error.message : "An error occurred"` rendering in scheduled email list cold-load state.
- Duplicate ad hoc fallback copy outside `COMMUNICATION_READ_MESSAGES`.
- Missing runtime coverage that scheduled email list cold-load failures use operator-safe copy.

### Deferred

- Campaign analytics and campaign/email preview panel read-state copy remain separate follow-up slices.
- Scheduled email table, edit/cancel actions, and processing behavior were not changed.
- Browser QA was not run because this is read-state copy behavior with no intended route or visual layout change.

### Gates

- Passed: focused communication read-state tests, `./node_modules/.bin/vitest run tests/unit/communications/communication-read-error-messages.test.ts tests/unit/communications/scheduled-emails-list-read-state.test.tsx` - 2 files, 3 tests.
- Passed: broader communications suite, `./node_modules/.bin/vitest run tests/unit/communications` - 16 files, 66 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Note: the communications suite still emits the existing `--localstorage-file` jsdom warning; tests pass.
- Skipped: browser QA because this is cached read-state copy behavior with no intended route or visual layout change.
- Skipped: reliability, finance, document, release, and deploy gates because this slice did not deliberately change route casts, pending dialog guards, read-path query guard baselines, finance persistence, document generation, release packaging, or production release paths.
- Retired for routine closeout: serialized gate evidence. It remains relevant only for direct serial lineage, inventory identity, serialized movement, warranty/RMA serial continuity, or repair-script work.

### Goal Adaptation

Accepted the ongoing runtime adaptation that serialized gates are no longer routine sprint evidence. Declined changing the standing product-owner goal itself because serialized lineage continuity remains a valid domain invariant for battery OEM workflows.

### Residual Risk

Low for scheduled email list cold-load read-state copy. Remaining communications read-state risk is concentrated in analytics and preview panel surfaces.
