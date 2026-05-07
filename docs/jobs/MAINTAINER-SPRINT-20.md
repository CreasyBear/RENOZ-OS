# Jobs Maintainer Sprint 20: Project File Storage Boundary

## Status

Closed in commit-ready state.

## Issue 1: Project File Upload Trusted Caller-Supplied Storage Paths

### Problem

Project file uploads used a server wrapper around shared storage, but the client built the storage path and the wrapper did not authenticate, verify the project, or own the storage namespace. Project file deletion also removed only the `project_files` row, leaving the backing storage object behind.

### Workflow Spine

Project files dialog
-> `uploadProjectFile`
-> shared Supabase storage helper
-> `createFile`
-> `project_files.file_url`
-> `useFiles` / `useDeleteFile`
-> `queryKeys.projectFiles.byProject(projectId)` and stats invalidation.

### Touched Domains

- Jobs project-file storage helper.
- Jobs project-file upload server action.
- Jobs project files dialog.
- Jobs project-file server delete lifecycle.
- Jobs project-file mutation/storage tests.
- Jobs maintainer closeout docs.

### Business Value Protected

Project files hold drawings, specifications, warranty paperwork, proposals, and service evidence. Uploads need tenant/project ownership, and deletes should not leave storage debris that later confuses operators or accumulates cost.

### Scope Constraints

- Do not redesign project file metadata, project file UI, project file schemas, hooks, query keys, cache invalidation, or storage provider.
- Keep the existing two-step upload then metadata-create flow.
- Use the shared storage utility and existing project verification helper.
- Keep storage deletion best-effort after database deletion.

### Changes

- Added `src/lib/jobs/project-file-storage.ts` for bucket ownership, filename sanitization, tenant/project scoped storage paths, and delete path extraction.
- Moved project-file storage path construction from the client dialog to the server upload action.
- Added auth and tenant-scoped project verification to `uploadProjectFile`.
- Stored fallback URLs as `storage://attachments/{path}` instead of a bucketless client-built path.
- Removed backing storage objects best-effort after project file records are deleted.
- Extended source contracts for upload path ownership and delete storage cleanup.

### Standards Checked

- Domain ownership: project-file storage policy now lives in the Jobs lib surface and is consumed by Jobs upload/delete paths.
- Route -> dialog -> server upload -> create metadata -> schema/database -> query key/cache policy: preserved; upload boundary is now server-owned.
- Tenant isolation/data integrity: strengthened. Upload verifies the authenticated organization can access the project before creating a storage path under that organization/project namespace.
- Query/cache policy: unchanged. Existing create/delete hooks still invalidate project file list and stats keys.
- UI states/error handling: unchanged; existing operator-safe mutation formatting still handles upload/create/delete failures.
- Reviewability: one helper, one upload wrapper, one delete cleanup, focused tests, and this closeout note.

### Smells Removed

- Caller-supplied project-file storage paths.
- Server-side storage upload without explicit auth/project verification.
- Bucketless `storage://` fallback URL creation in the client.
- Project file delete path that ignored backing storage.

### Deferred

- If `createFile` fails after `uploadProjectFile` succeeds, the uploaded object can still be orphaned because the current workflow is two server calls. A future slice should combine upload and metadata creation or add explicit upload rollback.
- Existing legacy project file URLs remain as stored; this sprint adds cleanup for owned public URLs and both old/new `storage://` forms.
- Browser QA was not selected because this is storage/server-boundary work with no intended visual layout change.

### Gates

- Passed: focused project file storage/mutation contracts.
- Passed: focused ESLint on touched Jobs storage/server/dialog/test files.
- Passed: `bun run typecheck`.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. This fits the standing maintainer goal and the current update that serialized gates are retired from routine closeout evidence.

### Residual Risk

Moderate. Upload path ownership and delete cleanup are fixed, but full transactional upload-plus-metadata integrity remains a future workflow consolidation.
