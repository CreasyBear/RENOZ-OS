# Jobs Maintainer Sprint 38: Project File Upload Build Boundary

## Status

Closed in commit-ready state.

## Issue 1: Project File Upload Server Module Entered Browser Build

### Problem

The project file and audio-note dialogs imported `uploadProjectFile` directly from a server-only module. During production build, Vite followed that import into `src/server/functions/files/upload-project-file.ts`, externalized `node:crypto` for browser compatibility, and failed because `randomUUID` was not available in the browser bundle.

### Workflow Spine

`ProjectFilesTab` / project note dialogs
-> upload dialog client interaction
-> `uploadProjectFile` server function
-> tenant/project-scoped storage path construction
-> Supabase storage upload
-> project file/note mutation
-> rollback server function on mutation failure.

### Touched Domains

- Jobs/project files.
- Jobs/project notes with audio attachments.
- Server-owned project file storage upload boundary.
- Project file storage contract test.
- Jobs maintainer closeout docs.

### Business Value Protected

Project files and audio notes are evidence surfaces for service/project work. Operators need uploads to stay tenant-scoped and rollback-safe, while the app must still build for production without leaking server-only storage code into the browser bundle.

### Scope Constraints

- Do not change project file row creation, note creation/update behavior, storage path format, bucket ownership, project existence checks, permissions, or rollback ownership checks.
- Keep uploads server-owned; do not move service-role storage writes into the browser.
- Keep this sprint focused on the production build boundary exposed by the audit.

### Changes

- Converted project file upload and rollback functions to TanStack `createServerFn` exports.
- Replaced direct browser `File` payloads with base64 content plus byte-size validation, matching the existing product-image upload pattern.
- Removed the `node:crypto` import from the browser-reachable server-function module.
- Updated project file and audio-note dialogs to call server functions with `{ data }`.
- Extended the project file storage contract to prove the build-safe server-function boundary.

### Standards Checked

- Domain ownership: project file upload storage ownership remains in jobs/project server functions.
- Route -> container/page -> hook/server function -> storage/schema -> cache policy: checked through project file dialogs, server upload boundary, storage path helper, and project file mutation.
- Tenant isolation/data integrity: preserved through `withAuth`, `verifyProjectExists`, tenant/project storage path construction, and rollback ownership validation.
- Transactional inventory/finance integrity: not touched.
- Serialized lineage continuity: not touched.
- Honest UI/error handling: upload error formatting remains unchanged.
- Query/cache contract: unchanged; project file/note mutations still own cache behavior.
- Reviewability: one server boundary, two upload call sites, one contract test, one closeout note.

### Smells Removed

- Direct server-only `node:crypto` import in a module imported by client dialogs.
- Direct client import of a plain async server upload helper rather than a client-safe server function.
- Browser build failure for project file upload storage code.

### Deferred

- Route helper filename warnings remain a separate route hygiene slice.
- The remaining `node:crypto` externalization warning from OAuth token encryption remains a separate auth/server-boundary slice; it no longer fails the build in this reproduction.
- The broader failing unit-suite audit remains a release-readiness stabilization slice.
- Project uploads still use base64 transfer through server functions; a future multipart/direct-upload design may be better for very large files, but it needs a separate storage architecture decision.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/jobs/project-file-storage-contract.test.ts`.
- Passed: `./node_modules/.bin/eslint src/server/functions/files/upload-project-file.ts src/components/domain/jobs/projects/file-dialogs.tsx src/components/domain/jobs/projects/note-dialogs.tsx tests/unit/jobs/project-file-storage-contract.test.ts --report-unused-disable-directives`.
- Passed: `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`.
- Passed: `NODE_ENV=production NODE_OPTIONS=--max-old-space-size=12288 ./node_modules/.bin/vite build`.
- Passed: `git diff --check`.

### Goal Adaptation

No adaptation needed. This sprint continues production-readiness and domain-boundary cleanup under the standing maintainer goal.

### Residual Risk

Medium-low. The production build boundary is fixed without moving storage writes into the browser, but base64 transfer remains less efficient than a dedicated multipart upload path for large project files.
