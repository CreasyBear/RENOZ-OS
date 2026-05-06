# Pipeline Maintainer Sprint 43

## Status

Closed in commit-ready state.

## Issue 1: Quote PDF Generation Lived In Quote Versioning

### Problem

`quote-versions.tsx` still owned `generateQuotePdf`, which mixed quote version CRUD/send behavior with document rendering, storage upload, generated-document persistence, activity logging, and quote PDF URL persistence. PDF generation is a document workflow attached to pipeline quotes, not quote version CRUD.

### Workflow Spine

Generate quote PDF
-> quote mutation hook
-> quote PDF server module
-> tenant-scoped quote/opportunity/customer/address reads
-> PDF render and storage upload
-> generated document upsert
-> tenant-scoped opportunity PDF URL update
-> quote/document cache invalidation unchanged.

### Touched Domains

- Pipeline quote PDF server workflow.
- Pipeline quote version/send server module.
- Pipeline quote mutation hooks.
- Pipeline quote mutation tests.
- Pipeline quote server source contracts.
- Pipeline maintainer closeout docs.

### Business Value Protected

Operators rely on quote PDFs as customer-facing commercial documents. Isolating document generation keeps storage, generated-document persistence, and PDF URL updates auditable without reading quote CRUD or email send logic.

### Scope Constraints

- Do not change quote PDF inputs, returned result shape, filename/storage path behavior, signed URL duration, generated-document upsert shape, activity metadata, send behavior, mutation cache invalidation, UI behavior, or quote version CRUD.
- Keep this as a server ownership extraction with tenant-scope hardening on the touched PDF URL write.
- Serialized gates remain retired infrastructure for this unrelated pipeline quote/document slice.

### Changes

- Added `quote-pdf.tsx` as the server owner for `generateQuotePdf`.
- Moved PDF rendering, Supabase storage upload, generated-document upsert, and PDF activity logging out of `quote-versions.tsx`.
- Updated `sendQuote` to call the extracted PDF server function.
- Updated `use-quote-mutations.ts` and mutation test mocks to import PDF generation from the focused module.
- Added source contracts for quote PDF ownership, cache behavior, default validity usage, and tenant predicates.
- Hardened the final `opportunities.quotePdfUrl` update with the organization predicate.

### Standards Checked

- Domain ownership: quote PDF generation now has a focused server owner instead of living in quote version/send.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: mutation hook behavior and cache invalidation stayed unchanged; server ownership improved.
- Tenant isolation/data integrity: preserved organization-scoped reads for quote version, opportunity, customer, and addresses; the PDF URL write now also includes `opportunities.organizationId = ctx.organizationId`.
- Query/cache contract: unchanged; generated PDF mutations still invalidate documents, pipeline, and quote-version caches through the centralized helper.
- Honest UI states/operator-safe errors: unchanged.
- Reviewability: bounded diff across one new PDF server module, one import split, focused source contracts, and this closeout.

### Smells Removed

- Document rendering/storage/generation persistence embedded in quote versioning.
- Quote versioning importing Supabase storage, PDF rendering, generated-document, and organization-for-document dependencies.
- PDF URL write relying on a previous tenant-scoped read while the update itself only filtered by opportunity id.

### Deferred

- `quote-versions.tsx` remains large and still owns quote version CRUD plus email send.
- `sendQuote` still lives in `quote-versions.tsx` and remains a future extraction candidate because it spans email, stage bump, activity, and generated PDF orchestration.
- Browser QA remains deferred because this source-covered slice changes server ownership and tenant predicate hardening only.
- Full `bun run test:unit` and `bun run build` remain deferred to broader release/predeploy sweeps.

### Verification

- Passed: `bun run test:vitest tests/unit/pipeline/quote-server-pdf-contract.test.ts tests/unit/pipeline/quote-server-validity-contract.test.ts tests/unit/pipeline/quote-server-import-order-contract.test.ts tests/unit/pipeline/quote-mutation-cache-contract.test.ts tests/unit/pipeline/use-quote-mutations.test.tsx tests/unit/empty-get-input-schemas.test.ts` - 6 files, 23 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for quote PDF ownership and tenant write predicate.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. The standing maintainer goal and current process already cover domain ownership, tenant isolation, document/cache contracts, meaningful tests, retired routine serialized gates, and reviewable diffs.

### Residual Risk

Low for quote PDF ownership and tenant predicate hardening. Moderate for the remaining broad quote version/send module because send orchestration and quote CRUD still need future focused slices.
