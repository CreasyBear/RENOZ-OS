# Pipeline Maintainer Sprint 72: Pipeline Realtime Cache Scope

## Status

Closed in commit-ready state.

## Issue 1: Pipeline Realtime Subscriptions Refreshed Opportunity and Quote Roots

### Problem

`usePipelineRealtime` and `usePipelineByStage` subscribed to organization-scoped pipeline broadcasts but invalidated `queryKeys.opportunities.all`. The broader pipeline subscription also invalidated `queryKeys.quotes.all`. Those root refreshes hid the actual live-read surfaces: opportunity lists, board/stage views, metrics, hot leads, quote list/detail reads, and dashboard summaries.

### Workflow Spine

Pipeline database broadcast
-> `usePipelineRealtime` / `usePipelineByStage`
-> `useRealtimeBroadcast`
-> explicit opportunity, pipeline board/metrics, quote, and dashboard query-key families
-> live sales pipeline reads.

### Touched Domains

- Pipeline realtime hook.
- Pipeline realtime cache contract test.
- Pipeline maintainer closeout docs.

### Business Value Protected

RENOZ uses the pipeline to track battery sales opportunities, quote movement, and forecast health. Realtime opportunity updates should keep sales boards and summary views fresh without refreshing unrelated opportunity or quote-owned cache families through root keys.

### Scope Constraints

- Do not change Supabase realtime subscription behavior.
- Do not change opportunity notification copy or stage labels.
- Do not change pipeline server reads/writes, quote generation, or opportunity mutations.
- Keep this slice limited to static query-key families passed to the realtime broadcast wrapper.

### Changes

- Removed `queryKeys.opportunities.all` from both pipeline realtime hooks.
- Removed `queryKeys.quotes.all` from the broad pipeline realtime hook.
- Removed redundant concrete `queryKeys.opportunities.list({})`, which is covered by `queryKeys.opportunities.lists()`.
- Added explicit opportunity list/infinite/detail/hot-lead/stage, pipeline board/stage/metric, quote list/detail, and dashboard families.
- Added a focused source contract preventing opportunity/quote root regression in the realtime hook.

### Standards Checked

- Domain ownership: pipeline realtime owns live opportunity cache refresh policy.
- Route -> container/page -> hook -> server function -> schema/database -> query/cache policy: realtime hooks now name affected pipeline cache families.
- Tenant isolation/data integrity: unchanged; channel remains organization-scoped.
- Transactional inventory/finance integrity: not touched.
- Serialized lineage continuity: not touched.
- Honest UI/error handling: pipeline realtime toasts remain unchanged.
- Query/cache contract: improved and covered by focused source contract.
- Reviewability: one hook cache-array change, one focused test, one closeout note.

### Smells Removed

- Opportunity root invalidation from pipeline realtime.
- Quote root invalidation from pipeline realtime.
- Redundant concrete opportunity list invalidation next to the opportunity list prefix.

### Deferred

- Payload-specific `opportunities.detail(record.id)` and `pipeline.opportunity(record.id)` invalidation would require extending `useRealtimeBroadcast` to accept payload-derived query keys.
- Legacy postgres_changes realtime hooks remain a separate compatibility surface.
- Browser/realtime smoke was not selected because this is a static query-key contract slice.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/pipeline/pipeline-realtime-cache-contract.test.ts tests/unit/pipeline/opportunity-mutation-cache-contract.test.ts tests/unit/pipeline/opportunity-bulk-stage-cache-contract.test.tsx tests/unit/pipeline/quote-mutation-cache-contract.test.ts tests/unit/pipeline/pipeline-activity-query-key-contract.test.ts`.
- Passed: `./node_modules/.bin/eslint src/hooks/realtime/use-pipeline-realtime.ts tests/unit/pipeline/pipeline-realtime-cache-contract.test.ts --report-unused-disable-directives`.
- Passed: `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`.
- Passed: `git diff --check`.

### Goal Adaptation

No adaptation needed. This sprint continues local cache-contract cleanup under the standing maintainer goal.

### Residual Risk

Medium. The realtime refresh is explicit but still family-wide because the broadcast wrapper does not support payload-derived query keys.
