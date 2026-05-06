# Documents Maintainer Sprint 5

## Status

Closed in commit-ready state.

## Issue 1: Async Document Hook Cache Contract

### Problem

The older async quote/invoice document hooks still returned raw server-function values and invalidated caches from `result.orderId`. The newer synchronous order/project document hooks already normalized wrapped TanStack server-function responses.

If the async path received `{ result }`, `{ data }`, or a JSON `Response`, generation could appear to start but order detail, document history, and document status caches could miss invalidation. Status reads also trusted the raw server-function payload shape.

### Workflow Spine

Async quote/invoice document button
-> `useGenerateQuote` / `useGenerateInvoice`
-> Trigger-backed document server function
-> generation start result normalization
-> order detail, order document history, and document status invalidation
-> `useDocumentStatus` / `useDocumentPolling`
-> document status result normalization
-> operator polling/open-document flow.

### Touched Domains

- Documents async generation hooks.
- Quote/invoice document status polling.
- Order document cache invalidation.
- Document hook tests.

### Business Value Protected

Operators using the legacy quote/invoice PDF button should get a stable generation-start contract and fresh polling/history state even when the server-function transport wraps responses differently.

### Scope Constraints

- Do not change Trigger jobs, document generation server functions, generated document storage, PDF templates, document history server reads, query key definitions, or visible UI.
- Keep this as a hook/cache contract slice.

### Changes

- Added async document response unwrapping for JSON `Response`, `{ result }`, and `{ data }` shapes.
- Added generation-start result normalization with fallback `orderId`.
- Added document status result normalization for status reads and polling.
- Added a shared async document invalidation helper for order detail, order document history, and document status cache keys.
- Updated quote and invoice async hooks to normalize before returning results.
- Added `use-generate-document.test.tsx` coverage for wrapped quote generation, JSON `Response` invoice generation, fallback order id behavior, status-cache invalidation, and wrapped status reads.

### Standards Checked

- Domain ownership: hook/cache behavior stays in the Documents hook layer.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: checked legacy download button flow, async document hooks, Trigger-backed server function entry points, document status polling, and centralized order/document query keys.
- Tenant isolation/data integrity: unchanged; this slice does not alter server reads or writes.
- Query/cache contract: improved. Async quote/invoice hooks now invalidate order detail, document history, and status keys from a normalized result with input fallback.
- Transactional inventory and finance integrity: unchanged; no inventory or finance path touched.
- Serialized lineage continuity: unchanged; no serial identity or lineage path touched.
- Honest UI states/operator-safe errors: improved at the hook boundary by rejecting malformed generation/status responses instead of returning invalid payloads.
- Reviewability: bounded diff across one hook file, one focused hook test, and this closeout.

### Smells Removed

- Raw async document server-function values leaking through hooks.
- Cache invalidation depending only on `result.orderId` with no input fallback.
- Document status reads trusting one exact server-function payload shape.
- Quote/invoice generation invalidating history/detail but not the status key used by polling.

### Deferred

- Shared normalization extraction across async, order, and project document hooks remains a possible cleanup.
- Browser QA remains deferred because this slice changes hook/cache behavior without visible layout changes.
- Full Trigger-backed generation integration tests remain a future hardening slice.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/documents/use-generate-document.test.tsx tests/unit/documents/use-generate-order-documents.test.tsx tests/unit/documents/use-generate-project-documents.test.tsx tests/unit/documents/document-generation-read-scope-contract.test.ts tests/unit/documents/document-preview-contract.test.ts tests/unit/finance/query-normalization-wave5d.test.tsx` - 6 files, 20 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Skipped: browser QA, `bun run build`, `bun run test:unit`, `bun run lint:reliability`, finance, release, deploy, and PDF visual verification gates because this slice did not change visible UI, build-time behavior, financial calculations, release packaging, deployment paths, server generation behavior, or PDF renderer structure.

### Goal Adaptation

Declined. The dedicated Documents maintainer path already covers hook/cache contract work.

### Residual Risk

Low for async quote/invoice generation and status response normalization. Moderate for broader hook consistency because shared normalization extraction across all document hooks remains deferred.
