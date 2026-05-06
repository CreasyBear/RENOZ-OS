# Pipeline Maintainer Sprint 49

## Status

Closed in commit-ready state.

## Issue 1: Quote PDF Storage Failures Exposed Provider Detail

### Problem

Quote PDF generation owned storage upload, signed URL creation, generated-document persistence, and opportunity PDF URL updates. The storage failure branches threw raw provider messages and the persistence flow trusted signed URL response data without an explicit signed URL evidence check.

### Workflow Spine

Generate quote PDF
-> quote mutation hook
-> quote PDF server module
-> tenant-scoped quote/opportunity/customer/address reads
-> PDF render
-> storage upload with operator-safe failure
-> signed URL evidence check
-> generated document upsert
-> opportunity PDF URL update
-> document and quote cache invalidation unchanged.

### Touched Domains

- Pipeline quote PDF generation server workflow.
- Pipeline quote PDF source contract.
- Pipeline quote mutation feedback contract.
- Pipeline maintainer closeout docs.

### Business Value Protected

Quote PDFs are customer-facing sales documents. Operators need failures to be actionable and safe: a failed upload or download URL preparation should not leak backend provider text, and the app should not persist a generated document record unless a usable signed URL exists.

### Scope Constraints

- Do not change quote PDF inputs, PDF layout, storage path generation, filename generation, checksum calculation, generated document conflict target, quote mutation cache invalidation, quote send orchestration, or UI copy.
- Keep this as storage/signing failure hardening inside the existing quote PDF owner.

### Changes

- Converted quote PDF storage upload failure to a typed `ServerError` with safe operator-facing copy.
- Converted signed URL failure/missing data to a typed `ServerError`.
- Required a concrete `signedUrl` before persisting generated document data, updating the opportunity, or returning the PDF result.
- Extended the quote PDF source contract to reject provider-message leakage and direct `signedUrlData.signedUrl` persistence.

### Standards Checked

- Domain ownership: quote PDF generation remains in the focused quote PDF server module.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: mutation hooks and cache invalidation stayed unchanged; server failure boundary improved.
- Tenant isolation/data integrity: tenant-scoped reads and opportunity update predicates stayed unchanged.
- Query/cache contract: unchanged; quote PDF mutations still invalidate document, pipeline, and quote-version caches through centralized query keys.
- Honest UI states/operator-safe errors: server-side storage/signing failures now use safe `ServerError` messages; client mutation formatter remains on the quote action-specific fallback path for 500 errors.
- Reviewability: bounded diff across one server module, one source contract, and this closeout.

### Smells Removed

- Raw storage-provider message interpolation in quote PDF server throws.
- Signed URL response trusted without explicit signed URL evidence before persistence.

### Deferred

- Opportunity PDF URL update still does not assert returned-row evidence; deferred because this sprint targets storage/signing failure handling and preserving existing PDF generation behavior.
- Browser QA remains deferred because this source-covered slice changes server-side failure branches only.
- Full `bun run test:unit` and `bun run build` remain deferred to broader release/predeploy sweeps.

### Verification

- Passed: `bun run test:vitest tests/unit/pipeline/quote-server-pdf-contract.test.ts tests/unit/pipeline/quote-mutation-feedback-contract.test.ts tests/unit/pipeline/use-quote-mutations.test.tsx` (3 files, 7 tests).
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for safe quote PDF storage errors, signed URL evidence, tenant predicates, and cache invalidation.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. The standing maintainer goal already covers operator-safe errors, tenant isolation, safe mutation/cache contracts, meaningful tests, and reviewable diffs.

### Residual Risk

Low for quote PDF storage/signing failure handling. Moderate for deeper PDF persistence atomicity because storage upload, generated-document upsert, and opportunity PDF URL update still span external storage and database work without a compensating cleanup workflow.
