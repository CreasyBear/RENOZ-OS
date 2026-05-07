# Jobs Maintainer Sprint 2

## Status

Closed in commit-ready state.

## Issue 1: Job Template List Surfaced Raw Read Errors

### Problem

The job-template settings list already receives normalized read-query failures from `useJobTemplates`, but the list UI rendered arbitrary `Error.message` values in its error state. Database, tenant, or runtime details could leak into settings when operators manage reusable job templates.

### Workflow Spine

Settings job templates route
-> job template list
-> `useJobTemplates`
-> `listJobTemplates` server function
-> job template schema/database
-> `queryKeys.jobTemplates.templates()`
-> settings list error state.

### Touched Domains

- Jobs job-template settings list read feedback.
- Job-template read feedback helper.
- Job-template settings contract tests.
- Jobs maintainer closeout docs.

### Business Value Protected

Job templates help RENOZ repeat service/project work without rebuilding task and checklist structure every time. If the settings list fails to load, operators should see recoverable copy, not raw persistence or runtime details.

### Scope Constraints

- Do not change job-template server functions, schemas, tenant checks, query keys, mutation behavior, deletion feedback, settings route behavior, or table layout.
- Keep this slice to list read-state feedback.
- Do not run or list serialized gates; this sprint does not touch serialized inventory or lineage workflows.

### Changes

- Added `job-template-read-error-messages.ts` with `getJobTemplateListReadErrorMessage`.
- Routed the job-template list `ErrorState` through the read-feedback helper.
- Preserved normalized read-query messages while falling back for arbitrary thrown errors.
- Extended the job-template settings contract test to cover read failure formatting and source wiring.

### Standards Checked

- Domain ownership: job-template read feedback remains in `src/components/domain/jobs/job-templates`.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: preserved; the hook still normalizes through `normalizeReadQueryError` and uses `queryKeys.jobTemplates.templates()`.
- Tenant isolation/data integrity: unchanged; no server function, tenant predicate, schema, or database behavior changed.
- Query/cache contract: unchanged; read query key and mutation invalidation behavior remain untouched.
- Honest UI states/operator-safe errors: improved for job-template list read failures.
- Reviewability: bounded diff across one helper, one consumer, one existing test, and this closeout.

### Smells Removed

- Raw `Error.message` rendering in the job-template list read failure state.
- Generic `'An error occurred'` fallback in a domain settings workflow.
- Missing read-feedback test coverage for job templates.

### Deferred

- Other jobs/project surfaces still render raw read errors and should be handled as separate slices: project notes, files, BOM, tasks, schedule calendar, and task kanban.
- Browser QA remains deferred because this slice changes read-failure copy routing only.
- Full `bun run test:unit` and `bun run build` remain deferred to broader release/predeploy sweeps.

### Verification

- Passed: `bun run test:vitest tests/unit/jobs/job-template-settings-contract.test.ts tests/unit/jobs/jobs-template-dead-surface-contract.test.ts tests/unit/jobs/checklist-server-tenant-scope-contract.test.ts` (3 files, 5 tests).
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for removed raw job-template list `Error.message` rendering.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. The standing maintainer goal already covers clear domain ownership, operator-safe errors, query/cache contracts, meaningful tests, and reviewable diffs. The serialized-gates retirement remains in effect.

### Residual Risk

Low for job-template settings read feedback. Moderate for the broader jobs domain because several project and scheduling read states still need the same normalized feedback pattern.
