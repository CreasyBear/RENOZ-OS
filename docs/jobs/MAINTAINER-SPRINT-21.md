# Jobs Maintainer Sprint 21: Project File Upload Rollback

## Status

Closed in commit-ready state.

## Issue 1: Project File Metadata Failure Could Orphan Uploaded Objects

### Problem

Sprint 20 made project-file storage paths server-owned and tenant/project scoped, but the workflow still uploaded the storage object before creating the `project_files` metadata record. If metadata creation failed after upload, the object could remain in storage without a database row.

### Workflow Spine

Project files dialog
-> `uploadProjectFile`
-> shared Supabase storage helper
-> `createFile`
-> on metadata failure `discardUploadedProjectFile`
-> storage cleanup
-> operator-safe upload error feedback.

### Touched Domains

- Jobs project-file storage helper.
- Jobs project-file upload server action.
- Jobs project files dialog.
- Jobs project-file storage/mutation tests.
- Jobs maintainer closeout docs.

### Business Value Protected

Project files are operational evidence for drawings, specifications, warranty paperwork, and service records. Failed metadata creation should not leave storage-only objects that operators cannot see or manage from the project.

### Scope Constraints

- Do not combine upload and metadata creation into a new server mutation in this sprint.
- Do not change project file schemas, query keys, cache invalidation, UI layout, storage provider, or create/update/delete metadata behavior.
- Keep rollback scoped to objects uploaded by the current tenant/project storage path policy.

### Changes

- Added `isProjectFileStoragePathForProject` to validate storage ownership before rollback.
- Added `discardUploadedProjectFile`, which authenticates, verifies project access, rejects unowned paths, and deletes only owned project-file storage objects.
- Updated the file upload dialog to call rollback when metadata creation fails after upload.
- Expanded source contracts for rollback wiring and owned-path enforcement.

### Standards Checked

- Domain ownership: rollback policy remains in the Jobs project-file storage/upload surface.
- Route/dialog -> server upload -> metadata create -> rollback path -> storage helper: tightened without changing cache policy.
- Tenant isolation/data integrity: rollback requires authenticated project access and an organization/project-prefixed storage path.
- Query/cache policy: unchanged. Successful creates/deletes keep existing project file list and stats invalidations.
- UI states/error handling: existing `formatProjectFileMutationError(error, 'upload')` remains the operator-facing failure boundary.
- Reviewability: one helper predicate, one rollback server action, one dialog call site, focused tests, and this closeout note.

### Smells Removed

- Storage-only orphan risk when `createFile` fails after upload.
- Missing explicit rollback contract for project file uploads.

### Deferred

- A single transactional server function that uploads and creates metadata together remains the cleaner long-term architecture.
- Rollback is best-effort and cannot clean objects uploaded before this contract existed unless a future maintenance task scans for them.
- Browser QA was not selected because this is upload failure cleanup behavior with no intended layout change.

### Gates

- Passed: focused project file storage/mutation contracts.
- Passed: focused ESLint on touched Jobs storage/server/dialog/test files.
- Passed: `bun run typecheck`.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. This fits the standing maintainer goal and the current update that serialized gates are retired from routine closeout evidence.

### Residual Risk

Low to moderate. New failed metadata creates now trigger owned-object rollback, but the two-call workflow still leaves a small window if the browser closes between upload success and metadata creation/rollback.
