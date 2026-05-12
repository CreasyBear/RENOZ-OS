# Pipeline Maintainer Sprint 70

## Status

Closed in commit-ready state.

## Issue 1: Quote PDF Cache Scope

### Problem

`useGenerateQuotePdf` refreshed `queryKeys.documents.all` and `queryKeys.pipeline.all` after generating a quote PDF. The server already knew the owning opportunity, but the mutation result only returned the quote version identity, so the client could not refresh opportunity-specific document history without a broad cache fallback.

### Workflow Spine

Quote PDF action
-> `useGenerateQuotePdf`
-> `generateQuotePdf`
-> quote version and owning opportunity read
-> generated document persistence and opportunity PDF URL update
-> quote-version, opportunity detail, and opportunity document-history cache refresh.

### Touched Domains

- Pipeline quote PDF server result contract.
- Pipeline quote mutation cache policy.
- Centralized document and pipeline query-key usage in quote mutation tests.

### Business Value Protected

Generated quote PDFs are customer-facing commercial documents. After generation, operators need the specific quote version, opportunity detail, and opportunity document history to refresh without invalidating every document and pipeline surface in the app.

### Scope Constraints

- Do not change quote PDF inputs, PDF layout, storage paths, signed URL behavior, generated-document upsert semantics, opportunity PDF URL persistence, activity logging, UI copy, or visible quote actions.
- Keep this sprint to returning opportunity identity and narrowing mutation cache refresh.
- Do not change sent-quote orchestration or quote PDF persistence reliability.

### Changes

- Added `opportunityId` to `GenerateQuotePdfResult`.
- Returned `opportunityId: opp.id` from `generateQuotePdf`.
- Replaced quote PDF `documents.all` and `pipeline.all` invalidation with:
  - `queryKeys.documents.history('opportunity', opportunityId)`
  - `queryKeys.pipeline.opportunity(opportunityId)`
  - `queryKeys.pipeline.quoteVersion(quoteVersionId)`
- Updated runtime and source contracts to reject the old root invalidations.

### Standards Checked

- Domain ownership: quote PDF result identity is emitted by the quote PDF server function that already reads the owning opportunity.
- Route -> container/page -> hook -> server flow: quote PDF UI callers still use `useGenerateQuotePdf`; the hook still calls the same server function.
- Query/cache policy: PDF generation now refreshes the affected quote/opportunity/document families instead of document and pipeline roots.
- Tenant isolation/data integrity: no server query predicates, organization checks, storage writes, generated-document persistence, opportunity update, or activity logging behavior changed.
- Inventory/finance integrity: no inventory, valuation, finance, fulfillment, support, warranty, or customer persistence changed.
- Serialized lineage: not touched; serialized gates remain retired from routine closeout.
- UI states/error handling: PDF generation UI and safe error behavior are unchanged.
- Reviewability: the diff is limited to the result type, one returned field, one cache helper, focused tests, and this closeout note.

### Smells Removed

- Document-root cache invalidation after quote PDF generation.
- Pipeline-root cache invalidation after quote PDF generation.
- Client cache policy depending on incomplete server result identity.

### Deferred

- Quote PDF storage/database atomicity remains a broader reliability slice.
- Sent-quote orchestration remains unchanged and already refreshes opportunity document history through explicit keys.
- Browser QA remains deferred because this slice changes result identity and cache refresh only, not the visible PDF action UI.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/pipeline/use-quote-mutations.test.tsx tests/unit/pipeline/quote-mutation-cache-contract.test.ts tests/unit/pipeline/quote-server-pdf-contract.test.ts tests/unit/pipeline/quote-server-send-contract.test.ts` - 4 files, 9 tests.
- Passed: `./node_modules/.bin/eslint src/hooks/pipeline/use-quote-mutations.ts src/server/functions/pipeline/quote-pdf.tsx src/lib/schemas/pipeline/pipeline.ts tests/unit/pipeline/use-quote-mutations.test.tsx tests/unit/pipeline/quote-mutation-cache-contract.test.ts tests/unit/pipeline/quote-server-pdf-contract.test.ts --report-unused-disable-directives`.
- Passed: targeted source scan showing `documents.all` and `pipeline.all` only in negative assertions for this slice.
- Passed: `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`.
- Passed: `git diff --check`.
- Skipped: browser QA, reliability, finance, document, release, deploy, and serialized gates because this slice did not touch those contracts.

### Goal Adaptation

Declined. The standing maintainer goal already covers centralized query keys, safe mutation/cache contracts, tenant/data-integrity checks, meaningful tests, reviewable diffs, and risk-selected evidence. The local-only posture remains in effect.

### Residual Risk

Low for quote PDF cache scope. Moderate for deeper PDF workflow reliability because storage upload, generated-document persistence, opportunity update, and signed URL generation still span external storage and database work without a compensating cleanup workflow.
