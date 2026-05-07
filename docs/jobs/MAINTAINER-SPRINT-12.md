# Jobs Maintainer Sprint 12

## Status

Closed in commit-ready state.

## Issue 1: Schedule Calendar Warning Surfaced Raw Read Errors

### Problem

The schedule calendar reads site visits through `useSchedule`, which normalizes read failures with the shared read-path policy. The calendar container still rendered arbitrary `error.message` values in its unavailable and cached-schedule warning, which could leak database, tenant, or runtime details inside dispatch planning.

### Workflow Spine

Schedule calendar route
-> schedule calendar container
-> `useSchedule(dateFrom, dateTo, { projectId })`
-> `getSiteVisits` server function
-> site visits schema/database
-> `queryKeys.siteVisits.schedule(dateFrom, dateTo, projectId)`
-> schedule unavailable or cached-schedule warning.

### Touched Domains

- Jobs/schedule read feedback.
- Schedule read-feedback helper.
- Schedule read-feedback contract tests.
- Jobs maintainer closeout docs.

### Business Value Protected

The schedule calendar is the dispatch surface for site visits across projects and installers. If schedule reads fail, operators should keep cached schedule data visible where available and see safe recovery copy instead of raw persistence or runtime details.

### Scope Constraints

- Do not change schedule route state, date range calculation, project filtering, drag/drop rescheduling, server functions, schemas, tenant checks, query keys, cache invalidation, dashboard rendering, or visit creation.
- Preserve the unavailable/cached-schedule behavior from existing query-normalization tests.
- Do not run serialized gates; this sprint does not touch serialized inventory or lineage workflows.

### Changes

- Added `schedule-read-error-messages.ts` with `getScheduleDataReadErrorMessage`.
- Routed the schedule calendar warning through the schedule-owned read-feedback helper.
- Preserved normalized read-query messages while suppressing arbitrary thrown errors.
- Added a focused schedule read-feedback contract test.

### Standards Checked

- Domain ownership: schedule read feedback remains in `src/components/domain/jobs/schedule`.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: preserved; `useSchedule` still normalizes reads and uses centralized site-visit schedule query keys.
- Tenant isolation/data integrity: unchanged; no server function, tenant predicate, schema, or database behavior changed.
- Query/cache contract: unchanged; schedule query key and invalidation behavior remain untouched.
- Honest UI states/operator-safe errors: improved; unavailable and cached schedule warning states keep their behavior with safe copy.
- Reviewability: bounded diff across one helper, one container, one focused test, and this closeout.

### Smells Removed

- Raw `error.message` rendering in the schedule calendar warning.
- Inline fallback copy inside the schedule container instead of schedule-owned read-feedback helper.
- Missing read-feedback contract coverage for schedule warnings.

### Deferred

- Broader schedule UI QA remains a separate workflow because this slice changes read-failure copy routing only.
- Full `bun run test:unit` and `bun run build` remain deferred to broader release/predeploy sweeps.

### Verification

- Passed: `bun run test:vitest tests/unit/jobs/schedule-read-feedback-contract.test.ts tests/unit/jobs/query-normalization-wave4a.test.tsx` (2 files, 15 tests).
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for removed raw schedule `error.message` rendering.
- Passed: `git diff --check`.

### Goal Adaptation

Accepted in execution. Serialized gates remain retired as routine evidence and were not run for this unrelated Jobs read-feedback slice. The standing maintainer goal remains otherwise unchanged.

### Residual Risk

Low for schedule read feedback. Moderate for broader Jobs scheduling UX because this did not dogfood drag/drop, filters, or visit creation.
