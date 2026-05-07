# Jobs Maintainer Sprint 16

## Status

Closed in commit-ready state.

## Issue 1: Calendar Sync Mutations Surfaced Raw Errors

### Problem

The calendar OAuth sync hooks used safe read normalization for calendar queries, but sync, update, and remove mutation error toasts still rendered arbitrary `Error.message` values. Provider, database, tenant, or runtime details could leak in operator-facing calendar sync feedback.

### Workflow Spine

Schedule/calendar integration hook
-> `useSyncJobToCalendar` / `useUpdateJobCalendarEvent` / `useRemoveJobFromCalendar`
-> OAuth calendar server functions
-> calendar/provider sync state
-> `queryKeys.jobCalendar.all` and `queryKeys.jobCalendar.oauth.all()`
-> operator toast feedback and cache invalidation.

### Touched Domains

- Jobs/calendar OAuth mutation feedback.
- Jobs mutation-error formatter.
- Calendar mutation contract tests.
- Jobs maintainer closeout docs.

### Business Value Protected

Calendar sync keeps installation and service schedules aligned outside the app. Operators need safe, actionable feedback when provider sync fails, without leaking provider payloads, database details, tenant context, or runtime stack messages.

### Scope Constraints

- Do not change calendar server functions, OAuth provider behavior, mutation inputs, success toasts, query invalidation, cache keys, read queries, or schedule UI.
- Preserve existing success invalidation of `queryKeys.jobCalendar.all` and `queryKeys.jobCalendar.oauth.all()`.
- Do not run serialized gates; this sprint does not touch serialized inventory or lineage workflows.

### Changes

- Added `formatJobCalendarMutationError` with sync/update/remove fallbacks and calendar-specific code messages.
- Routed calendar sync, update, and remove toast descriptions through the formatter.
- Exported the formatter through the Jobs hook barrel.
- Added a focused calendar mutation contract test.

### Standards Checked

- Domain ownership: calendar mutation feedback remains in Jobs hooks and the shared Jobs mutation-error helper.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: preserved; mutation hooks still call the same server functions and invalidate the same query keys.
- Tenant isolation/data integrity: unchanged; no server function, tenant predicate, provider state, or database behavior changed.
- Query/cache contract: unchanged; calendar and OAuth invalidation behavior remains untouched.
- Honest UI states/operator-safe errors: improved; unsafe mutation messages now fall back to calendar-owned recovery copy.
- Reviewability: bounded diff across one formatter, one hook, one barrel export, one focused test, and this closeout.

### Smells Removed

- Raw `Error.message` rendering in calendar sync/update/remove toast descriptions.
- Calendar mutation fallback copy split across hook call sites.
- Missing mutation feedback contract coverage for calendar OAuth sync hooks.

### Deferred

- Browser QA remains deferred because this slice changes mutation failure copy routing only.
- Full `bun run test:unit` and `bun run build` remain deferred to broader release/predeploy sweeps.

### Verification

- Passed: `bun run test:vitest tests/unit/jobs/calendar-mutation-contract.test.ts` (1 file, 2 tests).
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for removed raw calendar mutation `error.message` rendering.
- Passed: `git diff --check`.

### Goal Adaptation

Accepted in execution. Serialized gates remain retired as routine evidence and were not run for this unrelated Jobs calendar-feedback slice. The standing maintainer goal remains otherwise unchanged.

### Residual Risk

Low for calendar mutation feedback. Moderate for broader calendar integration UX because this did not exercise real OAuth provider failures or browser sync flows.
