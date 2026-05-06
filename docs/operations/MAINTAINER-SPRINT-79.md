# Operations Maintainer Sprint 79: Project Completion Closeout Contract

## Status

Closed in commit-ready state.

## Issue 1: Project Completion Used Raw Failure Feedback And A Weak Write Predicate

### Problem

The project completion dialog built an operator-facing failure toast from a raw caught error and also exposed `completeProject.error?.message` through the form error summary. In the same workflow, the server completion function verified organization ownership before update, but the actual update predicate only used project ID.

### Workflow Spine

Project detail
-> `ProjectCompletionDialog`
-> `projectCompletionFormSchema`
-> `useCompleteProject`
-> `completeProject`
-> `projects`
-> project list/detail/alert cache invalidation
-> formatted operator feedback.

### Touched Domains

- Jobs project completion dialog.
- Jobs project mutation error formatter.
- Project completion server function.
- Project action mutation/source contract test.
- Operations maintainer closeout docs.

### Business Value Protected

Project completion is operational closeout for RENOZ work: final status, completion date, actual costs, customer feedback, and handover pack generation. Failures now stay operator-safe, and the database write itself explicitly preserves tenant scope.

### Scope Constraints

- Do not change completion form fields, validation rules, success flow, handover pack generation semantics, cache invalidation, or activity logging.
- Do not change project create/edit/delete behavior.
- Do not broaden this into all remaining project raw toasts.

### Changes

- Added the `complete` action to `formatProjectMutationError`.
- Updated `ProjectCompletionDialog` to use `formatProjectMutationError(error, 'complete')`.
- Removed the raw `completeProject.error?.message` fallback from the inline form error summary.
- Changed the completion update predicate to require both `projects.id` and `projects.organizationId`.
- Added a post-update not-found guard before activity logging.
- Extended the project action mutation contract test to cover completion feedback and the scoped completion update.

### Standards Checked

- Domain ownership: project-level completion feedback now uses the project action formatter.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: completion dialog, hook, server function, schema, database write, and existing invalidation path were checked.
- Tenant isolation/data integrity: improved. The completion write now carries the organization predicate, not only the pre-read.
- Safe mutation/cache contracts: preserved. `useCompleteProject` invalidation behavior was not changed.
- Honest UI states/operator-safe errors: improved. Completion failures no longer show raw caught error messages.
- Reviewability: the diff is bounded to completion feedback, the completion server write predicate, one contract test, and this closeout.

### Smells Removed

- `Failed to complete project: ${message}` raw toast.
- Raw `completeProject.error?.message` form error fallback.
- Completion update scoped only by project ID after the pre-read.
- Missing post-update not-found guard before activity logging.

### Deferred

- Other project-domain raw toasts outside the completion/action workflows remain future slices.
- Browser QA was not run because this slice changes error wiring and server predicate behavior, not layout.
- Handover pack generation remains best-effort inside completion; changing that would be a separate product/data-integrity decision.

### Verification

- Passed: `./node_modules/.bin/vitest run tests/unit/jobs/project-actions-mutation-contract.test.ts` - 1 file, 2 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. The standing maintainer goal already covers tenant isolation, operator-safe errors, meaningful tests, and evidence-based sprint closeout.

### Residual Risk

Medium-low. The completion write is now tenant-scoped and feedback is safe. The remaining workflow risk is that handover pack generation is still logged but does not block completion when it fails; that policy may be intentional, but it should be revisited as its own completion/document-integrity slice.
