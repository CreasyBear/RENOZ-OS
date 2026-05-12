# Search Maintainer Sprint 1

## Status

Closed in commit-ready state.

## Issue 1: Recent Item Cache Scope

### Problem

`useTrackRecentItem` invalidated `queryKeys.recentItems.all` after recording a recently viewed entity. The only read surface in the current search hook layer is `useRecentItems`, which reads `queryKeys.recentItems.list(limit)`. Root invalidation kept the recent-items dropdown working, but it hid the actual cache family affected by view tracking.

### Workflow Spine

Detail container view
-> `useTrackView`
-> `useTrackRecentItem`
-> `trackRecentItem` server function
-> organization/user-scoped recent item upsert and pruning
-> recent-item list cache family
-> palette/recent-items UI refresh.

### Touched Domains

- Search recent-items tracking hook.
- Recent-items cache contract test.
- Search maintainer evidence.

### Business Value Protected

Recent items help operators jump back into active customer, order, support, warranty, and warehouse work. Tracking a view should refresh the recents list without leaving a domain-root invalidation path that makes future search cache surfaces harder to reason about.

### Scope Constraints

- Do not change global search, quick search, index status, reindexing, recent-item server functions, schemas, tenant/user predicates, database writes, pruning behavior, or UI rendering.
- Keep this sprint to the recent-item tracking cache contract.
- Do not broaden into search read-state normalization or search UI design.

### Changes

- Replaced recent-items root invalidation with `queryKeys.recentItems.lists()` invalidation after successful tracking.
- Added a focused hook contract proving tracking refreshes recent-item list queries without invalidating `queryKeys.recentItems.all`.
- Created the first search maintainer closeout folder for this domain.

### Standards Checked

- Domain ownership: recent-item tracking cache policy remains in `src/hooks/search/use-track-recent-item.ts`.
- Route -> container/page -> hook -> server flow: unchanged; detail containers can still use `useTrackView`, which calls `useTrackRecentItem`.
- Query/cache policy: tracking now refreshes the recent-items list family, matching `useRecentItems`.
- Tenant isolation/data integrity: no server function, schema, organization predicate, user predicate, recent-item upsert, or pruning transaction changed.
- Inventory/finance integrity: no inventory, valuation, finance, fulfillment, support, or warranty persistence changed.
- Serialized lineage: not touched; serialized gates remain retired from routine closeout.
- UI states/error handling: fire-and-forget tracking behavior and silent failure handling are unchanged.
- Reviewability: the diff is limited to one hook cache key, one focused test, and this closeout note.

### Smells Removed

- Domain-root `queryKeys.recentItems.all` invalidation from recent-item tracking.

### Deferred

- Search read-state normalization remains deferred because this slice only touched mutation cache scope.
- Browser QA remains deferred because no visible UI, layout, or interaction behavior changed.
- Broader search/indexing architecture review remains a future domain sprint.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/search/recent-items-cache-contract.test.tsx` - 1 file, 1 test.
- Passed: `./node_modules/.bin/eslint src/hooks/search/use-track-recent-item.ts tests/unit/search/recent-items-cache-contract.test.tsx --report-unused-disable-directives`.
- Passed: targeted implementation source scan showing `queryKeys.recentItems.all` only in the negative contract assertion.
- Passed: `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`.
- Pending before commit: `git diff --check`.
- Skipped: browser QA, reliability, finance, document, release, deploy, and serialized gates because this slice did not touch those contracts.

### Goal Adaptation

Declined. The standing maintainer goal already covers centralized query keys, safe mutation/cache contracts, meaningful tests, reviewable diffs, and risk-selected evidence. The local-only posture remains in effect.

### Residual Risk

Low for current recent-items cache behavior. Future independent recent-item cache families should add named prefixes and extend the hook contract rather than returning to root invalidation.
