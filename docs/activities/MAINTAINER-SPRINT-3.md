# Activity Maintainer Sprint 3

## Status

Closed in commit-ready state.

## Issue 1: Activity Analytics Read-State Ownership

### Problem

Activity analytics presenters owned hardcoded failed-read copy for trend, distribution, entity, heatmap, and leaderboard widgets. The hooks already normalize stats and leaderboard read failures, but the analytics UI ignored the normalized activity copy and drifted away from the shared feed/timeline read-state pattern.

### Workflow Spine

Activity dashboard analytics
-> chart, heatmap, and leaderboard presenters
-> `useActivityStats` and `useActivityLeaderboard`
-> activity server read functions
-> normalized read-query errors
-> shared activity read-error formatter
-> operator-safe analytics error UI.

### Touched Domains

- Shared activity analytics read feedback.
- Activity stats and leaderboard hook fallback copy.
- Activity read-state contracts.

### Business Value Protected

Activity analytics help operators understand operating cadence, follow-up load, record coverage, and team activity. Failed analytics reads should explain temporary unavailability safely and consistently instead of showing widget-specific generic failures that do not match the rest of the activity domain.

### Scope Constraints

- Do not change chart data mapping, colors, dimensions, tooltips, empty states, or loading skeletons.
- Do not change activity stats or leaderboard server functions, schemas, query keys, stale times, filters, or cache policy.
- Do not broaden into export/download behavior.
- Do not reopen serialized gates as routine evidence for this activity read-state slice.

### Changes

- Added centralized `ACTIVITY_READ_MESSAGES.statistics` and `ACTIVITY_READ_MESSAGES.leaderboard`.
- Replaced inline stats and leaderboard hook fallback strings with the centralized activity read messages.
- Routed activity chart, heatmap, and leaderboard error states through `formatActivityReadError`.
- Added `role="alert"` to analytics widget failure states that did not already expose the error boundary semantically.
- Expanded formatter and source contracts to pin analytics read-state ownership and remove the hardcoded failed-load strings.

### Standards Checked

- Domain ownership: analytics unavailable copy now lives in `src/lib/activities/read-error-messages.ts`.
- Route -> container/page -> hook -> server flow: analytics presenters still consume activity hooks; hooks still normalize read failures; server reads are unchanged.
- Query/cache policy: activity stats and leaderboard query keys, stale times, filters, and cache behavior are unchanged.
- Tenant isolation/data integrity: no server function, schema, query predicate, or tenant boundary changed.
- Inventory/finance integrity: no inventory, valuation, finance, or closeout path changed.
- Serialized lineage: not touched; serialized gates are retired from routine closeout and were not relevant to this slice.
- UI states/error handling: analytics failed reads now consume normalized activity copy and suppress raw non-normalized errors through the shared formatter.
- Reviewability: the diff is limited to the activity read-message helper, analytics presenters, hook fallback constants, focused tests, and this closeout note.

### Smells Removed

- Hardcoded `Failed to load trend data`.
- Hardcoded `Failed to load distribution data`.
- Hardcoded `Failed to load entity data`.
- Hardcoded `Failed to load heatmap data`.
- Hardcoded `Failed to load leaderboard`.
- Inline stats and leaderboard unavailable strings inside hooks instead of the domain read-message helper.

### Deferred

- Activity export/download feedback remains separate because this slice did not find an operator-facing export error path to fix.
- Chart rendering and responsive layout QA remain deferred because this slice changed only failure copy and alert semantics.
- A cross-domain read-state abstraction remains deferred; the activity-local helper is still clearer for this domain-owned cleanup.

### Gates

- Passed: focused analytics read-state contracts, `./node_modules/.bin/vitest run tests/unit/activities/activity-read-error-messages.test.ts tests/unit/activities/activity-read-state-contract.test.tsx` - 2 files, 5 tests.
- Passed: `./node_modules/.bin/vitest run tests/unit/activities` - 16 files, 42 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for removed analytics failed-load strings, centralized stats/leaderboard messages, `formatActivityReadError`, and stats/leaderboard hook fallbacks.
- Passed: `git diff --check`.
- Skipped: browser QA because this was source-covered read-state wiring with no layout, chart data, or interaction behavior change.
- Skipped: reliability, finance, document, release, deploy, and serialized gates because this slice did not touch those contracts. Serialized gates are no longer routine evidence and should only reopen for deliberate serialized lineage, inventory identity, or invariant changes.

### Goal Adaptation

Declined. The standing maintainer goal already covers honest UI states, operator-safe errors, domain ownership, meaningful tests, and risk-selected evidence. The retired serialized-gate posture from Sprint 2 remains in effect.

### Residual Risk

Analytics error states are source-contracted rather than browser-tested. The hooks still provide the authoritative normalized copy; unsupported non-normalized presenter errors intentionally fall back to the activity-owned analytics messages.
