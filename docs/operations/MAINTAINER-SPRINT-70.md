# Operations Maintainer Sprint 70: Project Time Tracking Scope

## Status

Closed in commit-ready state.

## Issue 1: Project Sidebar Time Tracking Treated Project IDs As Job IDs

### Problem

The active project detail sidebar rendered a time-tracking card with `project.id`, then passed that value as `jobId` into legacy job-time APIs. The server validated `jobId` against `job_assignments.id`, while `job_time_entries.job_id` still references job assignments. That meant project-level time tracking could fail for real project IDs, write rows without the project anchor, and invalidate caches under a misleading key.

### Workflow Spine

Project detail sidebar
-> project sidebar `TimeCard`
-> `useJobTimeEntries`, `useStartTimer`, `useStopTimer`, `useCreateManualEntry`
-> `getJobTimeEntries`, `startTimer`, `stopTimer`, `createManualEntry`
-> `startTimerSchema`, `createManualEntrySchema`, entry mutation schemas
-> `projects`, `job_assignments.migrated_to_project_id`, `job_time_entries.project_id`
-> `queryKeys.jobTime.entriesByScope` and `queryKeys.jobTime.costs.byScope`.

### Touched Domains

- Project detail sidebar time tracking.
- Jobs resource hooks.
- Job time schemas.
- Job time server functions.
- Centralized query keys.
- Jobs mutation error formatting.
- Maintainer sprint process docs.
- Focused job time contract tests.

### Business Value Protected

Project labor time is part of RENOZ Energy's operational truth: it supports project execution, labor costing, profitability review, and service accountability. The active project page now has a project-scoped time contract instead of relying on an accidental ID collision between projects and legacy job assignments.

### Scope Constraints

- Do not redesign the project detail sidebar.
- Do not migrate `job_time_entries.job_id` away from job assignments in this slice.
- Do not rewrite the broader legacy job time tab unless proven active.
- Preserve legacy job-scoped time tracking input compatibility.
- Keep serialized gates retired as routine evidence; this slice does not touch serialized lineage.

### Changes

- Added `projectId` as a first-class time-tracking scope alongside legacy `jobId` in job-time schemas.
- Added project-scoped query keys for job time entries and labor costs.
- Updated job resource hooks to use scope-aware query keys and to invalidate both configured and resolved scopes after mutations.
- Updated the active project sidebar time card to pass `projectId` explicitly for reads, timer starts/stops, and manual entries.
- Added `formatJobTimeMutationError` and replaced generic project time-tracking mutation failure toasts with action-specific safe messages.
- Added a server-side project time resolver that validates tenant-scoped projects, resolves backing jobs through `job_assignments.migrated_to_project_id`, and creates a locked placeholder backing job when a project-scoped timer/manual entry needs one.
- Set `job_time_entries.project_id` on new project-scoped time entries.
- Scoped stop/update/delete final write predicates by organization and resolved job scope.
- Added focused contract coverage to prevent project IDs from being passed as job IDs again.
- Updated the maintainer sprint process to make the serialized-gate retirement explicit in the canonical process doc.

### Standards Checked

- Domain ownership: project sidebar owns the project UI; jobs resource hooks/server functions own the time-tracking contract; query keys remain centralized.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: checked and strengthened for the active project detail time-tracking path.
- Tenant isolation/data integrity: strengthened. Project resolution requires organization scope and non-deleted projects; time entry writes remain organization-scoped and entry mutations include scoped final predicates.
- Safe mutation/cache contracts: strengthened. Project-scoped reads and mutations now share scope-aware query keys and invalidation.
- Honest UI states: preserved existing loading/error/degraded read behavior; mutation feedback is safer and action-specific.
- Transactional inventory and finance integrity: inventory and finance tables were not touched. Labor cost read contracts now support project scope.
- Serialized lineage: not touched. Serialized gates are not routine evidence for this slice.
- Reviewability: the diff is limited to one active UI surface, job time schemas/server functions/hooks, query keys, focused tests, and closeout/process docs.

### Smells Removed

- Project detail time card passing `projectId` as `jobId`.
- Job-time schemas requiring a legacy job assignment for project-level time tracking.
- Time entry inserts that could omit the project anchor for project workflows.
- Job time cache invalidation tied only to legacy `jobId` keys.
- Generic project time-tracking mutation failure toasts.

### Deferred

- The generic `src/components/domain/jobs/time/job-time-tab.tsx` still appears legacy or currently unused and still has raw console errors; it should be handled only after an active route is confirmed.
- Duplicate active timers under highly concurrent starts still deserve a database-level invariant or dedicated locking slice; this sprint preserves existing behavior and locks only placeholder project job creation.
- Full migration from legacy job-assignment-backed time entries to a project-native time model remains a larger data-model decision.
- Browser QA remains a follow-up if the project detail sidebar interaction flow is visually changed.

### Gates

- Passed: `bun test tests/unit/jobs/project-time-tracking-contract.test.ts` - 1 file, 3 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Skipped: full unit suite and build because this is a focused project time-tracking contract slice covered by targeted tests plus type/lint gates.
- Skipped: browser QA because no layout or successful interaction flow was redesigned.

### Goal Adaptation

Accepted runtime/process adaptation: serialized gates are no longer routine closeout evidence and are now explicitly retired in `docs/reference/maintainer-sprint-process.md`. Serialized lineage remains a domain invariant only when a slice touches serial identity, movement, warranty/RMA serial continuity, or related repair work.

### Residual Risk

Medium. The active project sidebar no longer confuses project IDs with job IDs, but the underlying time model still depends on legacy job assignments. A future data-model sprint should decide whether project time tracking stays backed by placeholder jobs or becomes project-native end to end.
