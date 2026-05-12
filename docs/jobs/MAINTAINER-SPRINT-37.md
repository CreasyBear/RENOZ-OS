# Jobs Maintainer Sprint 37: Projects Page Read Feedback

## Status

Closed in commit-ready state.

## Issue 1: Projects Page Rendered Raw Read Error Messages

### Problem

`/projects` had already been normalized to keep cached project rows visible during refresh failures, and the project list presenter already used `getProjectListReadErrorMessage`. The top-level projects page still rendered `error.message` directly in both the cold-load unavailable alert and the stale-data alert.

### Workflow Spine

`/projects`
-> `ProjectsPage`
-> `useAllProjects`
-> project list server read
-> `getProjectListReadErrorMessage`
-> cold-load or stale-data project page alert.

### Touched Domains

- Projects route page.
- Project list read-feedback contract test.
- Jobs maintainer closeout docs.

### Business Value Protected

Projects track installation/service work that can affect battery delivery, commissioning, and follow-up. A failed project dashboard read should guide the operator to retry without exposing database, transport, or stack-shaped messages.

### Scope Constraints

- Do not change project list reads, query keys, stale-data behavior, navigation, delete behavior, create dialog flow, or dashboard rendering.
- Reuse the existing project read-error helper instead of creating a new formatter.
- Keep this slice limited to page-level read feedback.

### Changes

- Imported `getProjectListReadErrorMessage` into `ProjectsPage`.
- Added one page-local formatted project-list error message.
- Replaced raw `error.message` rendering in cold-load and stale-data alerts.
- Extended the project list read-feedback contract to pin route usage and reject raw route error rendering.

### Standards Checked

- Domain ownership: project list read copy remains owned by `project-read-error-messages.ts`.
- Route -> container/page -> hook -> server function -> schema/database -> query/cache policy: checked through `/projects`, `useAllProjects`, project server reads, and the route alert display boundary.
- Tenant isolation/data integrity: unchanged; no server/database behavior changed.
- Transactional inventory/finance integrity: not touched.
- Serialized lineage continuity: not touched.
- Honest UI/error handling: improved for project route read failures.
- Query/cache contract: unchanged.
- Reviewability: one import, one derived message, two render replacements, one contract extension, one closeout note.

### Smells Removed

- Raw project route `error.message` in the blocking unavailable alert.
- Raw project route `error.message` in the cached-data degraded alert.

### Deferred

- Other route-level raw read messages remain separate domain slices.
- Browser QA remains deferred because this changes alert copy only and preserves route behavior.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/jobs/project-list-read-feedback-contract.test.ts tests/unit/jobs/query-normalization-wave6c.test.tsx`.
- Passed: `./node_modules/.bin/eslint src/routes/_authenticated/projects/projects-page.tsx tests/unit/jobs/project-list-read-feedback-contract.test.ts --report-unused-disable-directives`.
- Passed: `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`.
- Passed: `git diff --check`.

### Goal Adaptation

No adaptation needed. This sprint continues operator-safe jobs/project read feedback under the standing maintainer goal.

### Residual Risk

Low. Project read behavior is unchanged; only route-level error copy is routed through the existing helper.
