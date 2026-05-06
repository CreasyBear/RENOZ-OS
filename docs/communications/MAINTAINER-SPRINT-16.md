# Communications Maintainer Sprint 16

## Status

Closed in commit-ready state.

## Issue 1: Campaign And Email History Cached Read-State Copy

### Problem

Campaign and email history pages still rendered raw read errors in cached-degraded alerts. Their hooks already normalize list read failures and preserve cached data, but the route display boundary trusted `error.message` directly. That left outbound campaign planning and delivered-email audit surfaces exposing backend-shaped failures to operators.

### Workflow Spine

Campaign and email history routes
-> `CampaignsPage` and `EmailHistoryPage`
-> `useCampaigns` and `useEmailHistory`
-> campaign and email history server functions
-> campaign/email history schemas and database records
-> centralized campaign/email history list query keys
-> normalized read-query errors
-> communications-owned read-state formatter
-> operator-safe cached-degraded copy.

### Touched Domains

- Communications campaign route read-state UI.
- Communications email history route read-state UI.
- Communications read-state copy helper.
- Communications read-state and query-normalization tests.
- Communications maintainer closeout docs.

### Business Value Protected

Campaigns and email history are customer communication control and audit surfaces. RENOZ operators need to keep reviewing planned campaigns and delivered-message history during refresh failures without seeing provider, database, or backend details.

### Scope Constraints

- Do not change campaign filters, campaign list rendering, campaign mutations, bulk action behavior, confirmation behavior, email history list rendering, hook normalization, server functions, tenant predicates, query keys, cache invalidation, email send processing, or cold-load ErrorState/list behavior.
- Keep this as cached read-state copy only.
- Browser QA is skipped because this is copy-path behavior with no intended route, layout, or interaction change.
- Serialized gates are retired from routine closeout evidence and were not run for this communications slice because it does not touch serial lineage, inventory identity, warranty/RMA continuity, serialized movement, or repair scripts.

### Changes

- Added campaign and email history fallbacks to `COMMUNICATION_READ_MESSAGES`.
- Routed cached campaign degradation copy through `formatCommunicationReadError`.
- Routed cached email history degradation copy through `formatCommunicationReadError`.
- Extended focused source coverage so campaign and email history cached states stay behind communications-owned copy.
- Added runtime cached-state coverage for campaigns and email history.

### Standards Checked

- Domain ownership: campaign and email history cached read-state copy now uses the communications read formatter.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: preserved. This sprint changes only the UI display boundary after existing list reads fail with cached data available.
- Query/cache policy: unchanged. Campaign and email history query keys, cache behavior, and invalidation behavior were not changed.
- Tenant isolation/data integrity: unchanged. Campaign and email history reads still flow through existing server functions and tenant predicates.
- UI states/error handling: strengthened. Cached campaign and email history states no longer render direct raw error text.
- Reviewability: the diff is limited to fallback constants, two alert message call sites, focused tests, runtime cached-state tests, and this closeout note.

### Smells Removed

- Direct `<span>{error.message}</span>` rendering for cached campaign degradation.
- Direct `error instanceof Error ? error.message` rendering for cached email history degradation.
- Missing source coverage that campaign/email history cached read states use communications-owned copy.
- Missing runtime coverage that campaigns/email history keep cached content visible during refresh failures.

### Deferred

- Campaign and email history cold-load states remain unchanged; neither exposed raw error text in this slice.
- Remaining communications read-state surfaces still need separate review: inbox list/detail, analytics, campaign preview, email preview, and upcoming calls widgets.
- Browser QA was not run because this is cached read-state copy behavior with no intended route or visual layout change.

### Gates

- Passed: focused communication read-state tests, `./node_modules/.bin/vitest run tests/unit/communications/communication-read-error-messages.test.ts tests/unit/communications/query-normalization-wave4c.test.tsx tests/unit/communications/query-normalization-wave4d.test.tsx` - 3 files, 18 tests.
- Passed: broader communications suite, `./node_modules/.bin/vitest run tests/unit/communications` - 13 files, 61 tests.
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

Low for campaign and email history cached read-state copy. Remaining communications read-state risk is still fragmented across inbox, analytics, preview, and widget surfaces and should continue as small surface-specific slices.
