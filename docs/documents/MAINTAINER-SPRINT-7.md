# Documents Maintainer Sprint 7

## Status

Closed in commit-ready state.

## Issue 1: Document History Query Key Prefix Contract

### Problem

Document history invalidation used `queryKeys.documents.history(entityType, entityId)` as the cache prefix after generation, but the unfiltered history key appended an empty string sentinel. That made it a sibling of typed history keys instead of their prefix.

As a result, a successful quote or invoice generation could invalidate the unfiltered order history while leaving type-filtered history, including `useLatestDocument`, stale.

### Workflow Spine

Document generation hook
-> document history invalidation
-> centralized document query keys
-> TanStack prefix cache matching
-> document history and latest-document hooks refresh after writes.

### Touched Domains

- Documents query key infrastructure.
- Document history hook invalidation.
- Async document generation hook test coverage.
- Document cache contract tests.

### Business Value Protected

Operators need generated quotes, invoices, delivery notes, packing slips, and certificates to appear reliably after generation. This protects the document workflow from a quiet stale-cache failure where the generation succeeds but the UI keeps showing an old latest-document state.

### Scope Constraints

- Do not change server functions, PDF templates, document storage, document reads, visible UI, or generation mutation behavior.
- Keep this as a query/cache contract fix.
- Do not broaden into route, tenant, storage, or renderer work.

### Changes

- Added `queryKeys.documents.historyRoot(entityType, entityId)`.
- Changed unfiltered `queryKeys.documents.history(entityType, entityId)` to return the root key instead of a sentinel-terminated key.
- Kept typed document history keys under that root.
- Updated `useInvalidateDocumentHistory` to name the root key explicitly.
- Added a contract test proving root invalidation catches typed quote and invoice history without leaking to another order.
- Extended the async quote generation hook test to prove typed order history invalidates after generation.

### Standards Checked

- Domain ownership: cache contract remains centralized in `queryKeys.documents`.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: checked the document generation hook to document history/latest hook cache spine.
- Tenant isolation/data integrity: unchanged; no server reads, writes, schema, or database filters touched.
- Query/cache contract: improved by making the unfiltered entity history key a real prefix of typed document history keys.
- Transactional inventory and finance integrity: unchanged; no inventory or finance path touched.
- Serialized lineage continuity: unchanged; no serial identity or inventory serialization path touched.
- Honest UI states/operator-safe errors: improved indirectly by reducing stale latest-document state after successful writes.
- Reviewability: bounded diff across query keys, one history hook, two focused tests, and this closeout.

### Smells Removed

- Empty-string sentinel in a prefix-sensitive query key.
- Hidden mismatch between write-side invalidation and read-side typed document history.
- Invalidation contract that relied on caller intent rather than key structure.

### Deferred

- Broader document history pagination semantics remain deferred; this slice does not change `limit`, `offset`, or total-count behavior.
- Browser QA remains deferred because this slice changes cache keys and hook behavior without visible layout changes.
- Full `bun run test:unit` and `bun run build` remain deferred to larger release/predeploy sweeps.

### Gates

- Passed: `bun test tests/unit/documents/document-history-query-key-contract.test.ts`.
- Passed: `bun run test:vitest tests/unit/documents/document-history-query-key-contract.test.ts tests/unit/documents/use-generate-document.test.tsx`.
- Passed: `bun run test:vitest tests/unit/documents/use-generate-order-documents.test.tsx tests/unit/documents/use-generate-project-documents.test.tsx tests/unit/orders/order-document-surfaces.test.tsx`.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Skipped: browser QA, `bun run build`, `bun run test:unit`, finance, release, deploy, and PDF visual verification gates because this slice did not change visible UI, build-time behavior, financial calculations, release packaging, deployment paths, server generation behavior, or PDF renderer structure.

### Goal Adaptation

Accepted. Serialized gates are no longer part of routine closeout evidence; they should only be used when a slice touches serial identity, lineage continuity, or inventory serialization behavior.

### Residual Risk

Low for document cache invalidation. Moderate residual risk remains in broader document history pagination and total-count semantics, which were intentionally left untouched.
