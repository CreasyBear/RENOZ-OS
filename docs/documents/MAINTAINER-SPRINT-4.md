# Documents Maintainer Sprint 4

## Status

Closed in commit-ready state.

## Issue 1: Project Document Hook Cache Contract

### Problem

Order document hooks already normalized wrapped TanStack server-function responses before returning generated document data to callers and invalidating caches. Project document hooks did not. They returned the raw server-function value and trusted `result.projectId` for project detail and document-history invalidation.

If the runtime wrapped a project document response in `{ result }`, `{ data }`, or a JSON `Response`, callers could receive the wrong shape and the project document history cache could stay stale.

### Workflow Spine

Project document button/action
-> `useGenerateProjectDocument` / `useGenerateWorkOrder` / `useGenerateCompletionCertificate`
-> project document server function
-> generated document result normalization
-> project detail cache invalidation
-> project document history cache invalidation
-> operator sees the generated document and refreshed document history.

### Touched Domains

- Documents project generation hooks.
- Project document cache invalidation.
- Project document hook tests.
- Documents maintainer closeout docs.

### Business Value Protected

Project PDFs are operator/customer handoff artifacts. After generating a work order, completion certificate, or handover pack, the UI should receive a stable result and refresh the project document history without depending on one exact server-function transport shape.

### Scope Constraints

- Do not change project document server functions, generated document storage, PDF templates, document history server reads, query key definitions, project server functions, or visible UI.
- Keep this as a hook/cache contract slice.

### Changes

- Added project document response unwrapping for JSON `Response`, `{ result }`, and `{ data }` shapes.
- Added project document result normalization with fallback `projectId`.
- Added a single `invalidateProjectDocumentViews` helper for project detail and project document-history cache invalidation.
- Updated generic project document, work-order, and completion-certificate hooks to normalize results before returning them.
- Added `use-generate-project-documents.test.tsx` coverage for wrapped results, raw JSON responses, fallback project id behavior, and cache invalidation.

### Standards Checked

- Domain ownership: hook/cache behavior stays in the Documents hook layer.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: checked project document hooks, project document server function entry points, centralized project/document query keys, and generated document history cache.
- Tenant isolation/data integrity: unchanged; this slice does not alter server reads or writes.
- Query/cache contract: improved. Project document hooks now return stable shapes and invalidate the correct project/detail history keys after generation.
- Transactional inventory and finance integrity: unchanged; no inventory or finance path touched.
- Serialized lineage continuity: unchanged; no serial identity or lineage path touched.
- Honest UI states/operator-safe errors: improved at the hook boundary by rejecting invalid generation responses instead of returning malformed payloads.
- Reviewability: bounded diff across one hook file, one focused hook test, and this closeout.

### Smells Removed

- Raw project document server-function values leaking through hooks.
- Repeated project detail/document-history invalidation blocks.
- Cache invalidation depending only on `result.projectId` with no input fallback.

### Deferred

- Shared normalization extraction between order and project document hooks remains a possible cleanup, but was not required for this bounded slice.
- Browser QA remains deferred because this slice changes hook/cache behavior without visible layout changes.
- Full project document generation integration tests remain a future hardening slice.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/documents/use-generate-project-documents.test.tsx tests/unit/documents/use-generate-order-documents.test.tsx tests/unit/documents/project-document-read-scope-contract.test.ts tests/unit/documents/document-generation-read-scope-contract.test.ts tests/unit/documents/document-preview-contract.test.ts` - 5 files, 15 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Skipped: browser QA, `bun run build`, `bun run test:unit`, `bun run lint:reliability`, finance, release, deploy, and PDF visual verification gates because this slice did not change visible UI, build-time behavior, financial calculations, release packaging, deployment paths, server generation behavior, or PDF renderer structure.

### Goal Adaptation

Declined. The dedicated Documents maintainer path already covers hook/cache contract work.

### Residual Risk

Low for project document hook response normalization and cache invalidation. Moderate for broader document hook consistency because shared normalization across order/project hooks remains deferred.
