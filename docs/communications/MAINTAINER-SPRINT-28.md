# Communications Maintainer Sprint 28: Activity Cache Scope

## Status

Closed in commit-ready state.

## Issue 1: Quick Log and Completed Calls Refreshed the Activity Root

### Problem

`useCreateQuickLog` and `useCompleteCall` both write customer activity records, but they refreshed `queryKeys.activities.all`. That root invalidation hid the actual activity surfaces affected by communications mutations: activity feeds, stats, leaderboard, customer/opportunity timelines, unified activity timelines, and customer communication history.

Completed calls also had customer identity in the server result, but the hook did not use it for customer-specific activity refresh.

### Workflow Spine

Quick log or scheduled call completion
-> communications hook
-> communications server function
-> tenant-scoped quick-log or scheduled-call transaction
-> customer activity write
-> activity feed/stat/leaderboard refresh
-> customer/opportunity/unified/customer-communication refresh when identity is known
-> scheduled-call cache refresh for call workflows.

### Touched Domains

- Communications quick-log mutation hook.
- Communications scheduled-call completion hook.
- Communications activity cache helper.
- Activity query-key factory.
- Communications/activity cache tests.
- Communications sprint evidence.

### Business Value Protected

Customer calls, notes, and meetings are part of sales, support, warranty, and account follow-up. Operators should see fresh activity timelines after quick logs and completed calls without broad activity-root refreshes that make cache ownership hard to audit.

### Scope Constraints

- Do not change quick-log or scheduled-call server writes, validation, permissions, transaction behavior, or activity payloads.
- Do not change scheduled-call list/detail read behavior.
- Do not change UI copy, mutation error formatting, or read-state presentation.
- Keep this slice limited to communications activity mutation cache ownership.

### Changes

- Added `queryKeys.activities.statsAll()` and `queryKeys.activities.leaderboards()` prefixes while preserving existing key shapes.
- Added `invalidateCommunicationActivityMutationQueries` to centralize communications-owned activity refresh.
- Replaced quick-log `queryKeys.activities.all` invalidation with explicit activity collection and known customer/opportunity refresh.
- Replaced completed-call `queryKeys.activities.all` invalidation with the same helper using returned `customerId`.
- Added hook coverage proving quick-log and completed-call activity writes avoid activity-root invalidation.

### Standards Checked

- Domain ownership: communications hooks own communications-triggered activity cache refresh.
- Route -> container/page -> hook -> server function -> schema/database -> query/cache policy: unchanged server writes; hook cache refresh now follows returned or submitted activity identity.
- Tenant isolation/data integrity: unchanged; server functions remain organization-scoped.
- Transactional inventory/finance integrity: not applicable.
- Serialized lineage continuity: not applicable.
- Honest UI/error handling: unchanged; existing communications mutation formatter contracts remain.
- Query/cache contract: improved and covered by focused tests.
- Reviewability: one helper, two hook call sites, two query-key prefixes, and focused regression coverage.

### Smells Removed

- Quick log invalidated the activity root after every activity write.
- Completed call invalidated the activity root even though the server result carries `customerId`.
- Activity stats and leaderboard key families lacked prefix helpers for mutation cache policy.

### Deferred

- `useInvalidateActivities().all()` and generic activity mutations still expose activity-root invalidation. Those belong in a separate activities-domain sprint because they are broader than communications-owned activity writes.
- No browser smoke; this was a hook/cache contract slice with no intended visible UI change.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/communications/activity-cache-contract.test.tsx tests/unit/activities/use-quick-log-invalidation.test.ts tests/unit/communications/communications-mutation-errors.test.ts tests/unit/communications/query-normalization-wave4c.test.tsx`
- Passed: `./node_modules/.bin/eslint src/hooks/communications/_activity-cache.ts src/hooks/communications/use-quick-log.ts src/hooks/communications/use-scheduled-calls.ts src/lib/query-keys.ts tests/unit/communications/activity-cache-contract.test.tsx --report-unused-disable-directives`
- Passed: `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`
- Passed: `git diff --check`

### Goal Adaptation

No adaptation needed. This sprint follows the maintainer goal by replacing broad cache refresh with explicit communications-domain activity cache ownership.

### Residual Risk

Low for quick-log and completed-call cache freshness. Moderate for generic activity mutations because the activities-domain helper still exposes root invalidation outside this communications slice.
