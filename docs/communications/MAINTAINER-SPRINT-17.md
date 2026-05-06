# Communications Maintainer Sprint 17

## Status

Closed in commit-ready state.

## Issue 1: Inbox Cached Read-State Copy

### Problem

The unified inbox presenter still rendered raw read errors in its cached-degraded alert. The `useInbox` hook already reads through the canonical server-side inbox read, centralized inbox query keys, tenant-scoped server logic, and normalized read errors. The remaining smell was the presenter trusting `error.message` directly while cached inbox items remained visible.

### Workflow Spine

Inbox route/container
-> `Inbox` presenter
-> `useInbox`
-> `listInboxItems`
-> `readInboxItems`
-> email history and scheduled email schemas/database records
-> centralized inbox list query key
-> normalized read-query error
-> communications-owned read-state formatter
-> operator-safe cached-degraded copy.

### Touched Domains

- Communications inbox presenter read-state UI.
- Communications read-state copy helper.
- Communications read-state tests.
- Communications maintainer closeout docs.

### Business Value Protected

The unified inbox is an operator-facing communication work queue. Operators should be able to keep scanning cached inbox items during refresh failures without seeing database, provider, or backend details.

### Scope Constraints

- Do not change inbox filters, tab behavior, selection behavior, list/detail rendering, inbox actions, action mutation copy, hook normalization, server functions, tenant predicates, query keys, cache invalidation, email history reads, scheduled email reads, or cold-load list/detail error boundaries.
- Keep this as cached read-state copy only.
- Browser QA is skipped because this is copy-path behavior with no intended route, layout, or interaction change.
- Serialized gates are retired from routine closeout evidence and were not run for this communications slice because it does not touch serial lineage, inventory identity, warranty/RMA continuity, serialized movement, or repair scripts.

### Changes

- Added an inbox item fallback to `COMMUNICATION_READ_MESSAGES`.
- Routed cached inbox degradation copy through `formatCommunicationReadError`.
- Extended focused source coverage so the inbox cached state stays behind communications-owned copy.
- Added runtime presenter coverage that cached inbox items stay visible during refresh failures.

### Standards Checked

- Domain ownership: inbox cached read-state copy now uses the communications read formatter.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: preserved. This sprint changes only the presenter display boundary after the existing inbox read fails with cached items available.
- Query/cache policy: unchanged. Inbox list query keys, cache behavior, and invalidation behavior were not changed.
- Tenant isolation/data integrity: unchanged. Inbox reads still flow through existing server functions and tenant predicates.
- UI states/error handling: strengthened. Cached inbox state no longer renders direct raw error text.
- Reviewability: the diff is limited to one fallback constant, one alert message call site, focused tests, runtime presenter coverage, and this closeout note.

### Smells Removed

- Direct `error instanceof Error ? error.message` rendering for cached inbox degradation.
- Missing source coverage that inbox cached read state uses communications-owned copy.
- Missing runtime coverage that cached inbox content stays visible during refresh failures.

### Deferred

- Inbox cold-load list/detail error boundaries remain unchanged and do not expose raw read-query text in this slice.
- Remaining communications read-state surfaces still need separate review: analytics, campaign preview, email preview, and upcoming calls widgets.
- Browser QA was not run because this is cached read-state copy behavior with no intended route or visual layout change.

### Gates

- Passed: focused communication read-state tests, `./node_modules/.bin/vitest run tests/unit/communications/communication-read-error-messages.test.ts tests/unit/communications/inbox-read-state.test.tsx` - 2 files, 3 tests.
- Passed: broader communications suite, `./node_modules/.bin/vitest run tests/unit/communications` - 14 files, 62 tests.
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

Low for cached inbox read-state copy. Remaining communications read-state risk is concentrated in analytics, preview panels, and upcoming-call widget surfaces and should continue as small surface-specific slices.
