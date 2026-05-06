# Communications Maintainer Sprint 18

## Status

Closed in commit-ready state.

## Issue 1: Upcoming Calls Read-State Copy And Scheduled Call Cache Key Integrity

### Problem

The upcoming-calls widget rendered direct `error.message` text in both cold-load and cached-degraded states. While mapping the workflow spine, the scheduled-call list hook also exposed a cache contract smell: `useScheduledCalls` accepted `fromDate`, `toDate`, `limit`, and `offset`, but its query key only included customer, assignee, and status. That allowed the main scheduled-calls page and upcoming-calls widget to share stale or incomplete cache entries.

### Workflow Spine

Upcoming calls widget
-> `UpcomingCallsWidget`
-> `useScheduledCalls`
-> scheduled call server functions
-> scheduled call schemas and database records
-> centralized scheduled call list query key with complete list filters
-> normalized read-query error
-> communications-owned read-state formatter
-> operator-safe cold-load and cached-degraded copy.

### Touched Domains

- Communications upcoming-calls widget read-state UI.
- Communications scheduled-call hook query/cache contract.
- Communications read-state copy helper.
- Communications read-state, remediation, and widget runtime tests.
- Communications maintainer closeout docs.

### Business Value Protected

Upcoming calls are a follow-up work queue for sales, support, warranty, and customer operations. Operators should not see backend details when this widget fails, and the widget must not contaminate or consume the full scheduled-calls page cache because it uses a narrower pending/from-date/limit view.

### Scope Constraints

- Do not change scheduled-call server functions, tenant predicates, schemas, mutation behavior, list rendering, action menus, call outcome dialog behavior, scheduled-call status transitions, or invalidation behavior.
- Do not change the broader calls page beyond the shared hook cache key.
- Keep UI behavior to read-state copy only.
- Browser QA is skipped because this slice changes copy and cache key contracts without intended route, layout, or interaction changes.
- Serialized gates are retired from routine closeout evidence and were not run for this communications slice because it does not touch serial lineage, inventory identity, warranty/RMA continuity, serialized movement, or repair scripts.

### Changes

- Added upcoming-call fallback copy to `COMMUNICATION_READ_MESSAGES`.
- Routed upcoming-call cold-load and cached-degraded errors through `formatCommunicationReadError`.
- Completed `useScheduledCalls` list query keys with `fromDate`, `toDate`, `limit`, and `offset`.
- Serialized scheduled-call date filters to ISO strings in the query key.
- Stabilized the upcoming widget's `fromDate` so the completed query key does not churn every render.
- Added source contract coverage for scheduled-call query key completeness and upcoming-call read-state formatting.
- Added runtime widget coverage for cold-load and cached-degraded failure states.

### Standards Checked

- Domain ownership: upcoming-call read-state copy now uses the communications read formatter.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: strengthened. The hook now keys all list filters it sends to the server function.
- Query/cache policy: strengthened. Scheduled-call list cache entries now separate full list, paginated list, dated list, and widget views.
- Tenant isolation/data integrity: unchanged. Scheduled-call reads still flow through existing server functions and tenant predicates.
- UI states/error handling: strengthened. Upcoming-call cold-load and cached-degraded states no longer render direct raw error text.
- Reviewability: the diff is limited to one hook cache key, one widget `fromDate` stabilization, two widget message call sites, fallback copy, focused tests, runtime tests, and this closeout note.

### Smells Removed

- Direct `error instanceof Error ? error.message` rendering in upcoming-call cold-load state.
- Direct `error instanceof Error ? error.message` rendering in upcoming-call cached-degraded state.
- Incomplete scheduled-call list query key that omitted date and pagination filters sent to the server.
- Render-unstable `new Date()` input for the widget once date filters became part of the cache key.
- Missing runtime coverage that upcoming-call failures keep operator-safe copy and cached calls visible.

### Deferred

- The separate `useUpcomingCalls` hook still exists and was not migrated into the widget in this slice.
- Campaign analytics and campaign/email preview panel read-state copy remain separate follow-up slices.
- Scheduled email cold-load list copy remains separate from this scheduled-call-focused slice.
- Browser QA was not run because this is read-state copy and query-key behavior with no intended route or visual layout change.

### Gates

- Passed: focused communication read-state and cache-contract tests, `./node_modules/.bin/vitest run tests/unit/communications/communication-read-error-messages.test.ts tests/unit/communications/domain-remediation.test.ts tests/unit/communications/upcoming-calls-widget-read-state.test.tsx tests/unit/communications/query-normalization-wave4c.test.tsx` - 4 files, 19 tests.
- Passed: broader communications suite, `./node_modules/.bin/vitest run tests/unit/communications` - 15 files, 65 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Note: the communications suite still emits the existing `--localstorage-file` jsdom warning; tests pass.
- Skipped: browser QA because this is read-state copy and query-key behavior with no intended route or visual layout change.
- Skipped: reliability, finance, document, release, and deploy gates because this slice did not deliberately change route casts, pending dialog guards, read-path query guard baselines, finance persistence, document generation, release packaging, or production release paths.
- Retired for routine closeout: serialized gate evidence. It remains relevant only for direct serial lineage, inventory identity, serialized movement, warranty/RMA serial continuity, or repair-script work.

### Goal Adaptation

Accepted the ongoing runtime adaptation that serialized gates are no longer routine sprint evidence. Declined changing the standing product-owner goal itself because serialized lineage continuity remains a valid domain invariant for battery OEM workflows.

### Residual Risk

Low for upcoming-call read-state copy and scheduled-call list cache separation. The remaining communications read-state risk is concentrated in analytics, preview panels, and scheduled email cold-load list copy.
