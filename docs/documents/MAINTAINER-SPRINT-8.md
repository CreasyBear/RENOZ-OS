# Documents Maintainer Sprint 8

## Slice

Document history reads and generic PDF generation toasts should use document-owned feedback helpers instead of rendering raw error messages.

## Business Value

Generated quotes, invoices, delivery notes, packing slips, and related documents are operational proof points for RENOZ order and fulfillment work. Operators should see honest degraded document-history states and safe generation failure copy without backend, storage, or tenant-scope leakage.

## Workflow Spine

```text
document history/generation UI
  -> document hooks
  -> document server functions
  -> generated_documents and source records
  -> queryKeys.documents history cache policy
  -> degraded history alert and generation toast
```

## Triage Findings

- `DocumentHistoryList` rendered `error.message` for degraded cached document history.
- `DownloadPdfButton` rendered `error.message` when quote or invoice generation threw.
- `useDocumentHistory` already normalized read failures, but the UI did not own stale-history copy explicitly.
- Query key, tenant-scope, and generation invalidation contracts were already covered by prior document sprints and were not changed here.

## Implementation

- Added `src/hooks/documents/document-error-messages.ts` for document-history read copy and document-generation mutation copy.
- Routed `useDocumentHistory` through the centralized read fallback constant.
- Routed `DocumentHistoryList` degraded alerts through the read helper.
- Routed `DownloadPdfButton` generation failure toasts through the mutation formatter.
- Added a focused document feedback contract test.

## Closeout

Touched domains: documents.

Workflow protected: document history degraded reads and generic quote/invoice PDF generation feedback.

Business value: document workflows stay trustworthy while avoiding raw backend leakage in order, fulfillment, project, warranty, and finance-adjacent document surfaces.

Standards checked: component -> hook -> server function -> schema/database -> query key/cache policy, centralized query keys, safe read/mutation feedback, honest cached-data state, operator-safe error handling, meaningful tests, reviewable diff.

Smells removed: raw document history read `error.message` display and raw document generation mutation `error.message` toast display.

Deferred: polling terminal failure still uses static generation failure copy; deeper document status result modeling is deferred because this slice targets thrown read/mutation errors.

Verification: `bun run test:vitest tests/unit/documents/document-feedback-contract.test.ts tests/unit/documents/document-history-query-key-contract.test.ts tests/unit/documents/use-generate-document.test.tsx`, `bun run typecheck`, `bun run lint`, targeted document raw-pattern scan, `git diff --check`.

Goal adaptation: none.

Residual risk: no browser QA yet; this is a feedback-contract slice with no intentional layout changes.
