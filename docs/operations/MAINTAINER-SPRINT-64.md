# Operations Maintainer Sprint 64: Project Files Mutation Contracts

## Status

Closed in commit-ready state.

## Issue 1: Project File Mutations Dropped Operator Context And Used Weak Write Scope

### Problem

Project file reads already used normalized unavailable states and centralized query keys, but upload/delete failures could still expose raw thrown messages or vague generic feedback. The upload form collected a description that the server discarded, new uploads were forced into position `0`, and update/delete server mutations only accepted file identity instead of carrying the route project boundary into final write predicates.

### Workflow Spine

Jobs project files workflow
-> `ProjectFilesTab`, `FileUploadDialog`
-> `useFiles`, `useCreateFile`, `useUpdateFile`, `useDeleteFile`
-> `listFiles`, `getFile`, `createFile`, `updateFile`, `deleteFile`
-> `createFileSchema`, `updateFileSchema`, `projectScopedFileIdSchema`, `projectFiles`
-> `queryKeys.projectFiles.byProject`, `detail`, and `stats`
-> tenant- and project-scoped writes with safe mutation feedback and stable file ordering.

### Touched Domains

- Jobs project files UI and upload dialog.
- Jobs project files TanStack Query hooks.
- Project files server functions and schemas.
- Jobs mutation error formatting.
- Focused jobs contract tests.
- Operations maintainer closeout docs.

### Business Value Protected

Project files carry proposals, contracts, specs, drawings, photos, reports, and warranty artifacts for RENOZ Energy operational work. Upload metadata now survives, file ordering appends by default, delete/reorder is atomic, and operators see safe feedback when file operations fail.

### Scope Constraints

- Do not change the files list read contract, empty/unavailable states, or query key shape.
- Do not change storage upload wiring beyond safe failure feedback.
- Keep cache invalidation on project file list, stats, and detail keys.
- Keep the slice limited to project file upload/update/delete mutation contracts and file metadata persistence.

### Changes

- Added `formatProjectFileMutationError` with action-specific upload/update/delete fallbacks and safe server-code messages.
- Exported the project file mutation formatter through the jobs hook barrel.
- Replaced raw upload and generic delete failure feedback with safe formatter output.
- Removed forced `position: 0` from project file upload payloads so the server append-position logic works.
- Changed project file creation schema `position` from defaulted to optional.
- Persisted upload descriptions via `description: data.description ?? null`.
- Required `projectId` in file update server input.
- Added `projectScopedFileIdSchema` for delete-file mutation input.
- Updated `useUpdateFile` and `useDeleteFile` to carry the route `projectId` to the server function.
- Added `projectFiles.projectId` to update/delete final write predicates.
- Wrapped delete plus remaining-file reorder in a transaction.
- Converted touched project file not-found paths to `NotFoundError`.
- Added focused contract coverage for safe mutation feedback, hook cache contracts, schema input scope, server predicates, transactional delete/reorder, metadata persistence, and append positioning.

### Standards Checked

- Domain ownership: project file mutation concerns remain inside jobs file UI, hooks, schemas, and server functions.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: checked and strengthened for project file upload/update/delete.
- Tenant isolation/data integrity: strengthened. Update/delete now require organization and project predicates, and delete/reorder happens transactionally.
- Safe mutation/cache contracts: strengthened. Mutations retain project list/stats/detail invalidation and now use safe operator messages.
- Honest UI states: read-state behavior preserved; mutation failure feedback is now safer.
- Transactional inventory and finance integrity: not touched.
- Reviewability: the diff is limited to project file mutation contracts, one formatter extension, one focused test, and this closeout note.

### Smells Removed

- Raw upload error feedback from storage/server exceptions.
- Generic project file delete failure feedback.
- Discarded upload description metadata.
- Forced first-position upload payloads that bypassed append ordering.
- File update server input without route project scope.
- File delete server input without route project scope.
- Delete plus reorder spread across non-transactional statements.
- Generic project file not-found errors in touched server paths.

### Deferred

- Physical storage cleanup after database file deletion remains a separate storage lifecycle slice.
- Project file edit UI coverage remains separate because this sprint protected the existing upload/delete live surface and server update contract.
- Broader file preview/download UX polish remains outside this mutation-contract slice.

### Gates

- Passed: `bun test tests/unit/jobs/project-files-mutation-contract.test.ts` - 1 file, 2 tests.
- Passed: `./node_modules/.bin/vitest run tests/unit/jobs/project-files-mutation-contract.test.ts tests/unit/jobs/query-normalization-wave4a.test.tsx` - 2 files, 15 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Skipped: full unit suite and build because this slice is a narrow project files mutation contract change covered by focused tests plus type/lint gates.
- Skipped: browser QA because no layout, navigation, or successful file upload journey was changed beyond mutation payload/error contracts; browser upload requires storage credentials and is better handled in a dedicated storage workflow slice.

### Goal Adaptation

Declined. The standing maintainer goal already covers domain ownership, safe mutation/cache contracts, tenant isolation, data integrity, operator-safe errors, meaningful tests, and reviewable diffs.

### Residual Risk

Medium. The database mutation contract is safer, but physical storage cleanup and end-to-end upload behavior still depend on the storage integration and should be tested in a dedicated storage lifecycle sprint.
