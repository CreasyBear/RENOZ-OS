# Jobs Maintainer Sprint 19: Job Document Storage Honesty

## Status

Closed in commit-ready state.

## Issue 1: Job Document Upload Recorded Placeholder URLs

### Problem

`uploadJobDocument` validated files and created `job_photos` records, but it did not store the uploaded file. It generated `/api/files/job-documents/...` placeholder URLs and `deleteJobDocument` deleted only the database row. That made the legacy job-document workflow look successful while leaving no backing object to open, download, or clean up.

### Workflow Spine

Job assignment document action
-> `useUploadJobDocument` / `useDeleteJobDocument`
-> `uploadJobDocument` / `deleteJobDocument`
-> Supabase storage helper
-> `job_photos.photo_url`
-> `queryKeys.jobDocuments.list(jobAssignmentId)` invalidation.

### Touched Domains

- Jobs document storage helper.
- Jobs job-document server functions.
- Jobs job-document storage contract tests.
- Jobs maintainer closeout docs.

### Business Value Protected

RENOZ Energy uses job and project evidence for field work, service notes, receipts, warranty follow-up, and support context. Upload success must mean a real file exists, and deletion should remove the backing storage object where possible.

### Scope Constraints

- Do not redesign project files, job photos, checklist photos, document OCR, AI classification, file schemas, job document hooks, query keys, or UI.
- Preserve the existing `job_photos` table and `photoUrl` response shape.
- Use the shared storage utility instead of introducing a new storage client.
- Keep storage deletion best-effort after database deletion, matching the product image lifecycle pattern.

### Changes

- Added `src/lib/jobs/job-document-storage.ts` for bucket ownership, filename sanitization, tenant/job scoped paths, storage URL fallback, and delete path extraction.
- Uploaded job documents through shared `uploadFile`.
- Stored the uploaded public URL when available, otherwise a reversible `storage://attachments/...` URL.
- Rolled back orphaned storage objects if database record creation fails after upload.
- Deleted the backing storage object best-effort after `job_photos` deletion.
- Added explicit Jobs permissions for upload/read/delete.
- Replaced raw upload/delete error responses with stable operator-safe fallback copy.
- Removed fake sample extracted text from document classification.

### Standards Checked

- Domain ownership: job-document storage path policy now lives in the Jobs lib surface and is consumed by the Jobs server function.
- Route -> hook -> server function -> schema/database -> query key/cache policy: preserved; hooks and query keys remain unchanged while server persistence becomes real.
- Tenant isolation/data integrity: storage paths include organization and job assignment ids; job assignment access remains scoped by organization before upload; deletes filter by organization and job assignment.
- Query/cache policy: unchanged; upload/delete hooks continue invalidating `queryKeys.jobDocuments.list(jobAssignmentId)`.
- UI states/error handling: response shape is unchanged, but raw storage/database messages no longer flow through the success/failure payload.
- Reviewability: one helper, one server function cleanup, one focused contract test, and this closeout note.

### Smells Removed

- Simulated job document upload.
- Placeholder `/api/files/job-documents/...` URL generation.
- Delete path that ignored the backing storage object.
- Raw upload/delete error message pass-through.
- Fake `Sample extracted text` document classification placeholder.

### Deferred

- OCR/text extraction and classifier persistence remain future slices because the schema has no processing-status, extracted-text, or classification columns.
- Project files still have separate storage lifecycle debt outside this legacy job-document slice.
- Browser QA was not selected because this is server/storage contract work with no intended UI layout change.

### Gates

- Passed: focused job document storage and query-normalization contracts.
- Passed: focused ESLint on touched Jobs storage/server/test files.
- Passed: `bun run typecheck`.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. This fits the standing maintainer goal and the current update that serialized gates are retired from routine closeout evidence.

### Residual Risk

Moderate. Job documents now persist real storage objects through the shared utility, but OCR/classification remains filename/text-only and project-file storage cleanup is still a separate domain slice.
