# Jobs Maintainer Sprint 3

## Status

Closed in commit-ready state.

## Issue 1: Projects List Surfaced Raw Read Errors

### Problem

The projects list hook normalizes read failures with the shared read-path policy, but the presenter still rendered raw `error.message` in its full-error state. Project lists are the gateway into service/project execution work, so failed reads need operator-safe recovery copy instead of arbitrary database, tenant, or runtime details.

### Workflow Spine

Projects route/container
-> projects list presenter
-> `useProjects`
-> `getProjects` server function
-> project schema/database
-> `queryKeys.projects.list(filters)`
-> project list error state.

### Touched Domains

- Jobs/projects list read feedback.
- Projects read-feedback helper.
- Project list read-feedback contract tests.
- Jobs maintainer closeout docs.

### Business Value Protected

Projects are secondary to the battery OEM spine, but they still support RENOZ service/project execution. The list should fail with clear recovery copy so operators can retry without seeing persistence or runtime internals.

### Scope Constraints

- Do not change project server functions, schemas, tenant checks, query keys, cache invalidation, deletion behavior, list layout, mobile cards, or project detail tabs.
- Keep this slice to the projects list full-error state.
- Do not run or list serialized gates; this sprint does not touch serialized inventory or lineage workflows.

### Changes

- Added `project-read-error-messages.ts` with `getProjectListReadErrorMessage`.
- Routed `ProjectsListPresenter` error descriptions through the read-feedback helper.
- Preserved normalized read-query messages while suppressing arbitrary thrown errors.
- Added a focused project-list read-feedback contract test.

### Standards Checked

- Domain ownership: project list read feedback remains in `src/components/domain/jobs/projects`.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: preserved; `useProjects` still normalizes reads and uses centralized project query keys.
- Tenant isolation/data integrity: unchanged; no server function, tenant predicate, schema, or database behavior changed.
- Query/cache contract: unchanged; list query key and project mutation invalidation behavior remain untouched.
- Honest UI states/operator-safe errors: improved for projects list read failures.
- Reviewability: bounded diff across one helper, one presenter, one focused test, and this closeout.

### Smells Removed

- Raw `error.message` rendering in `ProjectsListPresenter`.
- Generic `"An unexpected error occurred"` fallback in the projects list failure state.
- Missing read-feedback test coverage for the projects list presenter.

### Deferred

- Project detail surfaces still need separate read-feedback slices: notes, files, BOM, site visits, task tabs, schedule, and alert warnings.
- Browser QA remains deferred because this slice changes read-failure copy routing only.
- Full `bun run test:unit` and `bun run build` remain deferred to broader release/predeploy sweeps.

### Verification

- Passed: `bun run test:vitest tests/unit/jobs/project-list-read-feedback-contract.test.ts tests/unit/jobs/query-normalization-wave6c.test.tsx` (2 files, 5 tests).
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for removed raw projects list `error.message` rendering and generic fallback copy.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. The standing maintainer goal already covers domain ownership, read/query contracts, operator-safe errors, meaningful tests, and reviewable diffs. The serialized-gates retirement remains in effect.

### Residual Risk

Low for the projects list. Moderate for the broader jobs/project detail area because several cached-read warning surfaces still render raw messages and should be handled in later, small slices.
