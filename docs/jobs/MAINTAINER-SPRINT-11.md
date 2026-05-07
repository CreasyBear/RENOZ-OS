# Jobs Maintainer Sprint 11

## Status

Closed in commit-ready state.

## Issue 1: Project Time Card Warning Surfaced Raw Read Errors

### Problem

The project sidebar time card reads project-scoped time entries through `useJobTimeEntries`, which normalizes read failures with the shared read-path policy. The card still rendered arbitrary `error.message` values in its unavailable and cached-time warning, which could leak database, tenant, or runtime details inside project execution.

### Workflow Spine

Project detail route
-> project sidebar time card
-> `useJobTimeEntries({ projectId })`
-> `getJobTimeEntries` server function
-> job time entries schema/database
-> `queryKeys.jobTime.entriesByScope(input)`
-> time tracking unavailable or cached-time warning.

### Touched Domains

- Jobs/project time tracking read feedback.
- Shared projects read-feedback helper.
- Project time read-feedback contract tests.
- Jobs maintainer closeout docs.

### Business Value Protected

Time tracking supports project costing, billable labor visibility, and operator accountability. If time reads fail, operators should keep cached time summaries visible where available and see safe recovery copy instead of raw persistence or runtime details.

### Scope Constraints

- Do not change timer start/stop/manual-entry mutations, project/job scope resolution, server functions, schemas, tenant checks, query keys, cache invalidation, time summary math, or card layout.
- Preserve the unavailable/cached-time behavior from existing query-normalization tests.
- Do not run serialized gates; this sprint does not touch serialized inventory or lineage workflows.

### Changes

- Extended `project-read-error-messages.ts` with `getProjectTimeTrackingReadErrorMessage`.
- Routed the project time card warning through the read-feedback helper.
- Preserved normalized read-query messages while suppressing arbitrary thrown errors.
- Added a focused project time read-feedback contract test.

### Standards Checked

- Domain ownership: project time read feedback remains in `src/components/domain/jobs/projects`.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: preserved; `useJobTimeEntries({ projectId })` still normalizes reads and uses centralized scoped job-time query keys.
- Tenant isolation/data integrity: unchanged; no server function, tenant predicate, schema, or database behavior changed.
- Query/cache contract: unchanged; scoped job-time query key and invalidation behavior remain untouched.
- Honest UI states/operator-safe errors: improved; unavailable and cached time-warning states keep their behavior with safe copy.
- Reviewability: bounded diff across one helper, one card, one focused test, and this closeout.

### Smells Removed

- Raw `error.message` rendering in the project time tracking warning.
- Inline fallback copy inside the time card instead of domain-owned read-feedback helper.
- Missing read-feedback contract coverage for project time read warnings.

### Deferred

- Schedule read-warning cleanup remains a separate Jobs slice.
- Browser QA remains deferred because this slice changes read-failure copy routing only.
- Full `bun run test:unit` and `bun run build` remain deferred to broader release/predeploy sweeps.

### Verification

- Passed: `bun run test:vitest tests/unit/jobs/project-time-read-feedback-contract.test.ts tests/unit/jobs/query-normalization-wave4b-admin.test.tsx tests/unit/jobs/project-time-tracking-contract.test.ts` (3 files, 14 tests).
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for removed raw project time `error.message` rendering.
- Passed: `git diff --check`.

### Goal Adaptation

Accepted in execution. Serialized gates remain retired as routine evidence and were not run for this unrelated Jobs read-feedback slice. The standing maintainer goal remains otherwise unchanged.

### Residual Risk

Low for project time read feedback. Moderate for the broader Jobs area because schedule read warnings still need separate cleanup.
