# Documents Maintainer Sprint 6

## Status

Closed in commit-ready state.

## Issue 1: Shared Document Server Result Normalization

### Problem

The async, order, and project document hooks each carried their own local server-function unwrapping logic for JSON `Response`, `{ result }`, and `{ data }` payloads. The behavior was intentionally similar after Sprints 4 and 5, but keeping three near-copies made future transport-shape fixes easy to miss.

Document hooks should share one transport normalization boundary, while preserving domain-specific result validation in each hook.

### Workflow Spine

Document generation/status hook
-> server function call
-> shared document server-result unwrap helper
-> hook-specific result validation and fallback ids
-> query key/cache invalidation
-> operator-facing generated document or polling state.

### Touched Domains

- Documents hook infrastructure.
- Async quote/invoice document hooks.
- Synchronous order/shipment document hooks.
- Synchronous project document hooks.
- Document server-result helper tests.

### Business Value Protected

Document generation touches quotes, invoices, packing slips, dispatch notes, delivery notes, work orders, completion certificates, and handover packs. One shared server-result boundary reduces the chance that one document path breaks when the server-function runtime returns a wrapped payload.

### Scope Constraints

- Do not change server functions, Trigger jobs, generated document storage, PDF templates, document history reads, query key definitions, cache invalidation semantics, or visible UI.
- Keep domain-specific result validation in the calling hooks.
- Keep this as an architecture cleanup slice, not a document behavior change.

### Changes

- Added `document-server-result.ts` with `unwrapDocumentServerFnResult` and `unwrapDocumentServerRecord`.
- Replaced local unwrapping helpers in async, order, and project document hooks with the shared helper.
- Preserved hook-specific validation/error contexts for generation, status, and project document results.
- Added `document-server-result.test.ts` coverage for nested envelopes, JSON `Response`, non-JSON `Response`, and invalid record handling.

### Standards Checked

- Domain ownership: shared transport normalization now lives in the Documents hook layer.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: checked async document, order/shipment document, and project document hook flows through their existing query key/cache invalidation contracts.
- Tenant isolation/data integrity: unchanged; this slice does not alter server reads or writes.
- Query/cache contract: preserved. Existing invalidation behavior from Sprints 4 and 5 is retained while the unwrapping boundary is shared.
- Transactional inventory and finance integrity: unchanged; no inventory or finance path touched.
- Serialized lineage continuity: unchanged; no serial identity or lineage path touched.
- Honest UI states/operator-safe errors: preserved. Malformed payloads still fail at the hook boundary with context-specific errors.
- Reviewability: bounded diff across one new helper, three hook files, one helper test, and this closeout.

### Smells Removed

- Three local copies of server-function response unwrapping.
- Repeated `UnknownRecord` transport typing in document hooks.
- Duplicated JSON `Response` handling across async/order/project document hooks.

### Deferred

- Further extraction of domain-specific result normalizers remains deferred; the current slice centralizes transport shape only.
- Browser QA remains deferred because this slice changes hook internals without visible layout changes.
- Full document generation integration tests remain a future hardening slice.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/documents/document-server-result.test.ts tests/unit/documents/use-generate-document.test.tsx tests/unit/documents/use-generate-order-documents.test.tsx tests/unit/documents/use-generate-project-documents.test.tsx tests/unit/documents/document-generation-read-scope-contract.test.ts tests/unit/documents/project-document-read-scope-contract.test.ts` - 6 files, 20 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Skipped: browser QA, `bun run build`, `bun run test:unit`, `bun run lint:reliability`, finance, release, deploy, and PDF visual verification gates because this slice did not change visible UI, build-time behavior, financial calculations, release packaging, deployment paths, server generation behavior, or PDF renderer structure.

### Goal Adaptation

Declined. The dedicated Documents maintainer path already covers architecture cleanup for document hook contracts.

### Residual Risk

Low for shared transport unwrapping behavior. Moderate for broader document hook consistency because domain-specific result normalizers remain separate by design.
