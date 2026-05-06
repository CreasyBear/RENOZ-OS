# Communications Maintainer Sprint 20

## Status

Closed in commit-ready state.

## Issue 1: Campaign Analytics Read-State Copy

### Problem

The campaign analytics page combined campaign-list and email-metric read errors, then displayed the selected error's `.message` directly. Both hooks already normalize read failures, but the analytics route display boundary could still leak backend-shaped text when either read path failed.

### Workflow Spine

Campaign analytics route
-> `AnalyticsPage`
-> `useCampaigns` and `useEmailMetrics`
-> campaign and email analytics server functions
-> campaign/email history schemas and database records
-> centralized campaign list and email analytics query keys
-> normalized read-query errors
-> communications-owned read-state formatter
-> operator-safe analytics unavailable/cached copy.

### Touched Domains

- Communications campaign analytics route read-state UI.
- Communications read-state copy helper.
- Communications read-state and analytics runtime tests.
- Communications maintainer closeout docs.

### Business Value Protected

Campaign analytics is a business visibility surface for outbound communication performance. Operators should be able to review cached campaign metrics during refresh failures, or see clear recovery copy when analytics is unavailable, without seeing provider, database, or backend details.

### Scope Constraints

- Do not change campaign analytics calculations, date range behavior, campaign filters, email metric filters, cards, status distribution, top campaign ranking, hook normalization, server functions, tenant predicates, query keys, cache invalidation, or email delivery metrics.
- Keep this as route read-state copy only.
- Browser QA is skipped because this is copy-path behavior with no intended route, layout, or interaction change.
- Serialized gates are retired from routine closeout evidence and were not run for this communications slice because it does not touch serial lineage, inventory identity, warranty/RMA continuity, serialized movement, or repair scripts.

### Changes

- Added campaign analytics fallback copy to `COMMUNICATION_READ_MESSAGES`.
- Introduced a single `analyticsError` display boundary for combined campaign and email-metric read failures.
- Routed campaign analytics alert copy through `formatCommunicationReadError`.
- Extended focused source coverage so analytics route copy stays behind communications-owned formatting.
- Added runtime analytics page coverage that backend-shaped errors do not render while cached analytics data remains visible.

### Standards Checked

- Domain ownership: campaign analytics read-state copy now uses the communications read formatter.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: preserved. This sprint changes only the route display boundary after existing campaign and email metric reads fail.
- Query/cache policy: unchanged. Campaign list and email analytics query keys, cache behavior, and invalidation behavior were not changed.
- Tenant isolation/data integrity: unchanged. Campaign and email analytics reads still flow through existing server functions and tenant predicates.
- UI states/error handling: strengthened. Campaign analytics no longer renders direct raw read error text.
- Reviewability: the diff is limited to one fallback constant, one route alert message boundary, focused tests, runtime route coverage, and this closeout note.

### Smells Removed

- Direct `(campaignsError ?? emailMetricsError)?.message` rendering in campaign analytics.
- Duplicate ad hoc analytics fallback copy outside `COMMUNICATION_READ_MESSAGES`.
- Missing runtime coverage that cached analytics failures use operator-safe copy.

### Deferred

- Campaign recipient preview and email preview read-state copy remain separate follow-up slices.
- Generic communications error boundary behavior remains separate because it handles render exceptions rather than query read states.
- Browser QA was not run because this is read-state copy behavior with no intended route or visual layout change.

### Gates

- Passed: focused communication read-state tests, `./node_modules/.bin/vitest run tests/unit/communications/communication-read-error-messages.test.ts tests/unit/communications/campaign-analytics-read-state.test.tsx tests/unit/communications/query-normalization-wave4d.test.tsx` - 3 files, 11 tests.
- Passed: broader communications suite, `./node_modules/.bin/vitest run tests/unit/communications` - 17 files, 67 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Note: the communications suite still emits the existing `--localstorage-file` jsdom warning; tests pass.
- Skipped: browser QA because this is read-state copy behavior with no intended route or visual layout change.
- Skipped: reliability, finance, document, release, and deploy gates because this slice did not deliberately change route casts, pending dialog guards, read-path query guard baselines, finance persistence, document generation, release packaging, or production release paths.
- Retired for routine closeout: serialized gate evidence. It remains relevant only for direct serial lineage, inventory identity, serialized movement, warranty/RMA serial continuity, or repair-script work.

### Goal Adaptation

Accepted the ongoing runtime adaptation that serialized gates are no longer routine sprint evidence. Declined changing the standing product-owner goal itself because serialized lineage continuity remains a valid domain invariant for battery OEM workflows.

### Residual Risk

Low for campaign analytics read-state copy. Remaining communications read-state risk is concentrated in campaign recipient preview, email preview, and the generic communications error boundary.
