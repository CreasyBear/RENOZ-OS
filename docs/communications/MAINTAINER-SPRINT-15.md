# Communications Maintainer Sprint 15

## Status

Closed in commit-ready state.

## Issue 1: Scheduled Communication Cached Read-State Copy

### Problem

Scheduled email and scheduled call pages still rendered direct `error.message` text in cached-degraded alerts. Their hooks already normalize scheduled list read failures, but the route display boundary bypassed the communications-owned read-state formatter. That left timed follow-up surfaces trusting raw error shape while showing cached data.

### Workflow Spine

Scheduled email/call routes
-> `ScheduledEmailsPage` and `CallsPage`
-> `useScheduledEmails` and `useScheduledCalls`
-> scheduled email/call server functions
-> scheduled email/call schemas and database records
-> centralized scheduled list query keys
-> normalized read-query errors
-> communications-owned read-state formatter
-> operator-safe cached-degraded copy.

### Touched Domains

- Communications scheduled email route read-state UI.
- Communications scheduled call route read-state UI.
- Communications read-state copy helper.
- Communications read-state tests.
- Communications maintainer closeout docs.

### Business Value Protected

Scheduled emails and calls drive customer follow-up, support timing, warranty reminders, and operational communication. Operators should be able to keep working from cached scheduled communication queues during refresh failures without seeing backend, provider, or database details.

### Scope Constraints

- Do not change scheduled email/call filters, list rendering, dialogs, mutation copy, success copy, status behavior, hook normalization, server functions, tenant predicates, query keys, cache invalidation, processing jobs, or cold-load ErrorState/list behavior.
- Keep this as cached read-state copy only.
- Browser QA is skipped because this is copy-path behavior with no intended route, layout, or interaction change.
- Serialized gates are retired from routine closeout evidence and were not run for this communications slice because it does not touch serial lineage, inventory identity, warranty/RMA continuity, serialized movement, or repair scripts.

### Changes

- Added scheduled email and scheduled call fallbacks to `COMMUNICATION_READ_MESSAGES`.
- Routed cached scheduled email degradation copy through `formatCommunicationReadError`.
- Routed cached scheduled call degradation copy through `formatCommunicationReadError`.
- Extended focused read-state source coverage so scheduled email and scheduled call cached states stay behind communications-owned copy.

### Standards Checked

- Domain ownership: scheduled communication cached read-state copy now uses the communications read formatter.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: preserved. This sprint changes only the UI display boundary after the existing scheduled list reads fail with cached data available.
- Query/cache policy: unchanged. Scheduled email/call list query keys, cache behavior, and invalidation behavior were not changed.
- Tenant isolation/data integrity: unchanged. Scheduled email/call reads still flow through existing server functions and tenant predicates.
- UI states/error handling: strengthened. Cached scheduled email/call states no longer render direct `error.message` text.
- Reviewability: the diff is limited to fallback constants, two alert message call sites, focused tests, and this closeout note.

### Smells Removed

- Direct `error instanceof Error ? error.message` rendering for cached scheduled email degradation.
- Direct `error instanceof Error ? error.message` rendering for cached scheduled call degradation.
- Missing source coverage that scheduled communication cached read states use communications-owned copy.

### Deferred

- Scheduled email cold-load list error behavior remains owned by `ScheduledEmailsList` and was not changed.
- Scheduled call cold-load ErrorState copy remains generic and does not expose raw error text.
- Other communications read-state surfaces still need separate review: campaigns, inbox list/detail, analytics, campaign preview, email history, email preview, and upcoming calls widgets.
- Browser QA was not run because this is cached read-state copy behavior with no intended route or visual layout change.

### Gates

- Passed: focused communication read-state tests, `./node_modules/.bin/vitest run tests/unit/communications/communication-read-error-messages.test.ts tests/unit/communications/query-normalization-wave4c.test.tsx` - 2 files, 9 tests.
- Passed: broader communications suite, `./node_modules/.bin/vitest run tests/unit/communications` - 13 files, 59 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Note: the communications suite still emits the existing `--localstorage-file` jsdom warning; tests pass.
- Skipped: browser QA because this is cached read-state copy behavior with no intended route or visual layout change.
- Skipped: reliability, finance, document, release, and deploy gates because this slice did not deliberately change route casts, pending dialog guards, read-path query guard baselines, finance persistence, document generation, release packaging, or production release paths.
- Retired for routine closeout: serialized gate evidence. It remains relevant only for direct serial lineage, inventory identity, serialized movement, warranty/RMA serial continuity, or repair-script work.

### Goal Adaptation

Accepted the runtime adaptation that serialized gates are no longer routine sprint evidence. Declined changing the standing product-owner goal itself because serialized lineage continuity remains a valid domain invariant for battery OEM workflows.

### Residual Risk

Low for scheduled email and scheduled call cached read-state copy. Remaining communications read-state risk is broader and should continue as small surface-specific slices rather than a large communications sweep.
