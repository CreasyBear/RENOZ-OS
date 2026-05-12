# Jobs Maintainer Sprint 35: Calendar Sync Cache Scope

## Status

Closed in commit-ready state.

## Issue 1: Calendar Sync Mutations Refreshed the Whole Calendar Cache

### Problem

Calendar sync, update, and remove mutations invalidated `queryKeys.jobCalendar.all` and then separately invalidated `queryKeys.jobCalendar.oauth.all()`. The root refresh already covered OAuth and also reached unrelated calendar availability/config keys. The mutation intent is narrower: refresh schedule/calendar views plus OAuth sync state.

### Workflow Spine

Jobs calendar UI
-> calendar sync/update/remove hooks
-> OAuth bridge server functions
-> external calendar sync state
-> Job Calendar view families and OAuth query families.

### Touched Domains

- Jobs scheduling hooks.
- Jobs calendar mutation contract tests.
- Jobs maintainer closeout docs.

### Business Value Protected

Operators need external calendar sync state to stay honest without causing unrelated schedule configuration and availability state to churn. Calendar event operations should refresh visible schedule/timeline/kanban surfaces and OAuth sync state, not the entire `jobCalendar` namespace.

### Scope Constraints

- Do not change OAuth bridge server behavior.
- Do not change calendar toasts, user-facing messages, or error handling.
- Do not change reschedule optimistic update or cross-view polling sync.
- Keep availability/config cache review deferred.

### Changes

- Added `invalidateCalendarSyncViews` to centralize sync/update/remove cache impact.
- Replaced `jobCalendar.all` invalidations with explicit calendar view families plus `jobCalendar.oauth.all()`.
- Extended the calendar mutation contract to reject root calendar invalidation and require the named cache helper.

### Standards Checked

- Domain ownership: Jobs scheduling owns calendar sync cache policy.
- Route/container/page -> hook -> server function -> schema/database -> query key/cache policy: hook cache policy now matches OAuth bridge mutation impact.
- Tenant isolation/data integrity: no auth, server, or database behavior changed.
- Transactional inventory/finance integrity: not touched.
- UI states/error handling: existing formatter-backed toasts remain unchanged.
- Reviewability: one hook helper, one focused contract update, one closeout note.

### Smells Removed

- Duplicate root calendar plus OAuth invalidation.
- Calendar sync mutation refreshes that reached availability/config keys without owning those workflows.
- Repeated inline cache invalidation blocks across sync/update/remove.

### Deferred

- `use-jobs-view-sync` still uses broad cross-view invalidations and needs a dedicated synchronization-policy sprint.
- Calendar availability/config keys were not changed because no current sync mutation evidence showed they are affected.
- Browser QA was not selected because this is a hook cache-contract slice with no UI behavior change.

### Gates

- Passed: focused calendar mutation contract.
- Passed: focused ESLint on touched scheduling hook and contract.
- Passed: full typecheck.
- Passed: `git diff --check`.

### Goal Adaptation

No adaptation needed. This sprint continues local Jobs cache-contract cleanup under the standing maintainer goal.

### Residual Risk

Low. Sync/update/remove still refresh broad calendar view families because external calendar event operations do not expose affected date ranges.
