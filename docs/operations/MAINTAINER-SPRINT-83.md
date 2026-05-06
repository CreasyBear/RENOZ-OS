# Operations Maintainer Sprint 83: Project Active Record Scope

## Status

Closed in commit-ready state.

## Issue 1: Soft-Deleted Projects Remained Visible To Normal Reads And Writes

### Problem

`deleteProject` now writes `deletedAt`, but normal project read paths still selected deleted records and non-delete writes could still update or complete them. That meant a cancelled/deleted project could reappear in project lists, load by detail URL, and remain mutable through update/completion server functions.

### Workflow Spine

Project list/detail surfaces
-> `useProjects`, `useProjectsCursor`, `useProject`, `useUpdateProject`, `useCompleteProject`
-> `getProjects`, `getProjectsCursor`, `getProject`, `updateProject`, `completeProject`
-> `projects.deletedAt`
-> project list/detail/query invalidation contracts
-> formatted operator-safe mutation/read feedback.

### Touched Domains

- Jobs project server read functions.
- Jobs project update/completion server functions.
- Project mutation source-contract tests.
- Project active-record source-contract test.
- Operations maintainer closeout docs.

### Business Value Protected

Deleting a project should remove it from normal operator workflows. RENOZ operators should not see archived/cancelled project records as active work, and follow-up edits should not accidentally mutate deleted operational history.

### Scope Constraints

- Do not add archive/restore UI.
- Do not change delete semantics from soft delete to hard delete.
- Do not hide non-deleted projects with `status = "cancelled"`; only `deletedAt` defines hidden soft-delete scope.
- Do not change query key shapes or cache invalidation behavior.
- Do not reopen serialized gates for this non-serialized project read/write slice.

### Changes

- Added `projects.deletedAt IS NULL` to `getProjects` list conditions.
- Added `projects.deletedAt IS NULL` to `getProjectsCursor` list conditions.
- Added `projects.deletedAt IS NULL` to `getProject` detail lookup.
- Added `projects.deletedAt IS NULL` to `updateProject` pre-read and final update predicate.
- Added `projects.deletedAt IS NULL` to `completeProject` pre-read and final update predicate.
- Updated existing project action/create-edit mutation contract tests to enforce the stronger update predicates.
- Added a focused active-record contract test covering list, cursor, detail, update, and completion server paths.

### Standards Checked

- Domain ownership: unchanged; project active-record behavior remains centralized in the projects server function.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: checked normal project list/detail/update/completion paths from hooks to `projects.deletedAt`.
- Tenant isolation/data integrity: improved. Active-record scope now complements existing organization scope on normal reads and non-delete writes.
- Safe mutation/cache contracts: preserved. Query keys and invalidation policy were not changed.
- Honest UI states/operator-safe errors: preserved. Deleted records now resolve through existing not-found/read error handling instead of appearing as active work.
- Reviewability: the diff is bounded to server predicates, contract-test expectations, one new focused test, and this closeout.

### Smells Removed

- Deleted projects included in offset project lists.
- Deleted projects included in cursor project lists.
- Deleted projects accessible by project detail read.
- Deleted projects mutable by update.
- Deleted projects mutable by completion/cancellation closeout.

### Deferred

- Explicit archive/restore workflows remain unbuilt.
- Historical deleted-project audit/reporting views remain out of scope.
- `generateProjectNumber` still considers deleted projects when picking the next sequence, which avoids accidental number reuse but may deserve a future policy decision.

### Verification

- Passed: `./node_modules/.bin/vitest run tests/unit/jobs/project-active-record-contract.test.ts tests/unit/jobs/project-actions-mutation-contract.test.ts tests/unit/jobs/project-create-edit-mutation-contract.test.ts tests/unit/jobs/project-members-mutation-contract.test.ts` - 4 files, 7 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Skipped: serialized gates. They are retired as routine closeout evidence and this slice did not touch serialized lineage, inventory identity, or warranty/RMA serial continuity.

### Goal Adaptation

Declined. The standing maintainer goal already covers tenant isolation, data-integrity implications, safe mutation/cache contracts, meaningful tests, and evidence-based closeout. Serialized gates remain retired as routine evidence.

### Residual Risk

Low for normal project active-record scope. Medium for project archival/product design because there is no explicit archive/restore or deleted-project audit surface yet.
