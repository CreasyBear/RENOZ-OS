# Jobs Maintainer Sprint 26: Job Assignment Mutation Error Hygiene

## Status

Closed in commit-ready state.

## Issue 1: Legacy Job Assignment Mutations Returned Raw Error Messages

### Problem

Legacy job assignment mutations caught server failures and returned raw `error.message` strings in `{ success: false, error }` responses. That could surface database, stack, or internal lookup details to operators instead of stable remediation copy.

### Workflow Spine

Job assignment actions
-> `useCreateJob` / `useUpdateJob` / `useDeleteJob` and legacy action callers
-> `createJobAssignment` / `updateJobAssignment` / `deleteJobAssignment` / lifecycle/photo mutations
-> `job_assignments` / `job_photos`
-> mutation result strings
-> jobs/query invalidation.

### Touched Domains

- Jobs assignment server functions.
- Jobs server mutation error policy helper.
- Jobs mutation error contract tests.
- Jobs maintainer closeout docs.

### Business Value Protected

Field work management should fail in a way operators can act on. Internal database language in create/update/cancel/start/complete/photo failures increases support load and reduces trust.

### Scope Constraints

- Do not change mutation success semantics or response shapes.
- Do not rewrite legacy job assignment screens.
- Do not change query keys, invalidation, database writes, or activity logging.
- Reuse the shared mutation error policy.

### Changes

- Added `src/lib/jobs/job-assignment-errors.ts` with action-specific server mutation fallbacks.
- Replaced raw catch result strings in create, update, cancel, start, complete, and photo create mutations.
- Added a focused contract test for safe formatting and server call-site coverage.

### Standards Checked

- Domain ownership: Jobs assignment mutation feedback now has a Jobs-owned policy helper.
- Route/container/page -> hook -> server function -> schema/database -> query key/cache policy: server result boundary improved; hook/cache behavior unchanged.
- Tenant isolation/data integrity: unchanged. Existing organization-scoped mutation predicates remain in place.
- Transactional inventory/finance integrity: not touched.
- UI states/error handling: mutation result strings no longer expose unsafe internals.
- Reviewability: one helper, one server file, one focused test, one closeout doc.

### Smells Removed

- Raw `error.message` returns from job assignment create/update/cancel/start/complete/photo create catches.
- Repeated fallback copy scattered through the legacy assignment server file.

### Deferred

- Legacy job assignment relation fetches still deserve a tenant-scope tightening pass.
- Batch import job errors in `job-batch-operations.ts` still need a sibling sanitizer.
- Browser QA was not selected because this is server result/error policy work with no intended layout change.

### Gates

- Passed: focused Jobs assignment mutation error contract.
- Passed: focused ESLint on touched Jobs assignment files.
- Passed: `bun run typecheck`.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. This follows the standing maintainer goal; serialized gates remain retired from routine closeout evidence.

### Residual Risk

Low. Error text is safer and response shape is unchanged. Some legacy callers may still need UI-level formatting later if they display server result strings directly.
