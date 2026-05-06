# Pipeline Maintainer Sprint 51

## Status

Closed in commit-ready state.

## Issue 1: Quote PDF Generated Document Upsert Lacked Evidence

### Problem

Sprint 50 proved the final opportunity PDF URL update before returning success. The generated-document upsert immediately before that still treated a missing returned row as an optional regeneration-count fallback, which could let the workflow continue without proving the document audit row was persisted.

### Workflow Spine

Generate quote PDF
-> quote mutation hook
-> quote PDF server module
-> tenant-scoped quote/opportunity/customer/address reads
-> PDF render
-> storage upload
-> signed URL evidence check
-> generated document upsert with returned-row evidence
-> tenant-scoped opportunity PDF URL update with returned-row evidence
-> activity log after document and attachment evidence
-> document and quote cache invalidation unchanged.

### Touched Domains

- Pipeline quote PDF generation server workflow.
- Pipeline quote PDF source contract.
- Pipeline quote mutation feedback contract.
- Pipeline maintainer closeout docs.

### Business Value Protected

Generated quote PDFs need an auditable document record before the opportunity is marked with the PDF URL and before activity history reports the export. This keeps customer-facing document generation traceable for sales and operational follow-up.

### Scope Constraints

- Do not change quote PDF inputs, PDF layout, storage path generation, filename generation, checksum calculation, generated document conflict target, quote mutation cache invalidation, quote send orchestration, UI copy, storage/signing error copy, or opportunity update evidence.
- Keep this as generated-document persistence evidence hardening inside the existing quote PDF owner.

### Changes

- Added generated document `id` to the upsert returning evidence.
- Throw a typed `ServerError` if the generated-document upsert does not return a row.
- Removed optional `upsertResult` fallbacks from regeneration activity text and metadata.
- Extended the quote PDF source contract to protect generated-document evidence before opportunity attachment and activity logging.

### Standards Checked

- Domain ownership: quote PDF generation remains in the focused quote PDF server module.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: mutation hooks and cache invalidation stayed unchanged; server persistence evidence improved.
- Tenant isolation/data integrity: generated-document upsert continues to use the organization/entity/type conflict target and now proves that the audit row exists before the opportunity attachment update.
- Query/cache contract: unchanged; quote PDF mutations still invalidate document, pipeline, and quote-version caches through centralized query keys.
- Honest UI states/operator-safe errors: missing generated-document persistence fails with safe server copy instead of silently continuing with fallback metadata.
- Reviewability: bounded diff across one server module, one source contract, and this closeout.

### Smells Removed

- Generated-document upsert trusted without returned-row evidence.
- Optional `upsertResult` fallback metadata after a required persistence step.

### Deferred

- External storage and database persistence still do not have compensating cleanup across failure boundaries; deferred to a broader document-generation reliability slice.
- Browser QA remains deferred because this source-covered slice changes server-side persistence evidence only.
- Full `bun run test:unit` and `bun run build` remain deferred to broader release/predeploy sweeps.

### Verification

- Passed: `bun run test:vitest tests/unit/pipeline/quote-server-pdf-contract.test.ts tests/unit/pipeline/quote-mutation-feedback-contract.test.ts tests/unit/pipeline/use-quote-mutations.test.tsx` (3 files, 7 tests).
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for generated-document evidence, opportunity update evidence, activity-log ordering, tenant/cache contracts, and absence of optional upsert fallbacks.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. The standing maintainer goal already covers tenant isolation, operator-safe errors, safe mutation/cache contracts, meaningful tests, and reviewable diffs.

### Residual Risk

Low for generated-document persistence evidence. Moderate for deeper PDF generation atomicity because external storage upload can still succeed before a later database failure without automatic cleanup or repair.
