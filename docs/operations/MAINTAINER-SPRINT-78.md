# Operations Maintainer Sprint 78: Project Action Failure Formatting

## Status

Closed in commit-ready state.

## Issue 1: Project-Level Actions Still Used Raw Generic Failure Toasts

### Problem

Active project surfaces still showed hard-coded generic failure toasts for project deletion and generated document actions. These errors were operator-facing but did not go through the same safe mutation formatting pattern already used by project notes, files, workstreams, tasks, BOM, and site visits.

### Workflow Spine

Project list or project detail
-> project action handler
-> `useDeleteProject` or project detail action
-> server function/document generation action
-> project cache invalidation or generated document side effect
-> formatted operator feedback.

### Touched Domains

- Jobs project detail actions.
- Jobs project list delete and bulk delete actions.
- Jobs mutation error formatting helper.
- Jobs hook barrel exports.
- Project action mutation/source contract test.
- Operations maintainer closeout docs.

### Business Value Protected

Project deletion and generated documents are operationally sensitive actions. Operators now get consistent, permission-aware, validation-aware, and non-leaky errors instead of raw generic strings when these actions fail.

### Scope Constraints

- Do not change project delete mutation behavior, cache invalidation, confirmation behavior, navigation, document generation behavior, or success toasts.
- Do not change server functions, schemas, database writes, or generated document artifacts.
- Do not broaden this into all project forms or project detail UI restructuring.

### Changes

- Added `formatProjectMutationError` with actions for `delete`, `bulkDelete`, `generateWorkOrder`, and `generateCompletionCertificate`.
- Exported `formatProjectMutationError` and `ProjectMutationAction` from the jobs hook barrel.
- Updated project detail delete/work-order/certificate failure handlers to format caught errors.
- Updated project list single and bulk delete failure handlers to format caught errors.
- Added a focused `project-actions-mutation-contract` test for formatter behavior and source wiring.

### Standards Checked

- Domain ownership: strengthened. Project-level action feedback now has a project action formatter instead of scattered raw strings.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: only container feedback changed; mutation/server/cache contracts were preserved.
- Tenant isolation/data integrity: not touched.
- Safe mutation/cache contracts: preserved. `useDeleteProject` invalidation and detail actions were not changed.
- Honest UI states/operator-safe errors: improved. Failures now use normalized mutation formatting.
- Reviewability: the diff is bounded to formatter additions, two project containers, one source/formatter test, and this closeout.

### Smells Removed

- `Failed to delete project` raw toast in project detail.
- `Failed to generate work order` raw toast.
- `Failed to generate completion certificate` raw toast.
- Raw project delete toasts in project list single and bulk delete paths.
- Missing project-level mutation formatter in the jobs barrel.

### Deferred

- Project create/edit/completion form feedback was not evaluated in this slice.
- Document generation internals were not changed; this only improves operator-facing failure feedback.
- Browser QA was not run because this is a formatter/source-wiring change without intended visual layout changes.

### Verification

- Passed: `./node_modules/.bin/vitest run tests/unit/jobs/project-actions-mutation-contract.test.ts` - 1 file, 2 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. The standing maintainer goal already requires operator-safe errors, workflow contracts, meaningful tests, and sprint closeout.

### Residual Risk

Low. The active project-level action paths covered by this slice now use the shared formatter. Remaining raw project-domain toasts should be handled only when tied to a specific workflow slice.
