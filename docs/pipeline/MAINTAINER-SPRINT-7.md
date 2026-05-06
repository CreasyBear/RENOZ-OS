# Pipeline Maintainer Sprint 7

## Status

Closed in commit-ready state.

## Issue 1: Quote PDF Preview Used Local PDF Failure Copy

### Problem

`QuotePdfPreviewPresenter` handled PDF generation failures with local generic copy. It also treated a successful mutation result without a `pdfUrl` as `PDF generation failed`, outside the Pipeline quote feedback formatter. That left the preview/export surface inconsistent with quote detail and opportunity quote tab PDF generation.

### Workflow Spine

Quote PDF preview
-> generate PDF action
-> `useGenerateQuotePdf`
-> quote PDF server function
-> document/quote cache invalidation
-> operator-safe toast feedback.

### Touched Domains

- Pipeline quote PDF preview feedback.
- Pipeline quote mutation formatter code map.
- Pipeline quote feedback contract tests.
- Pipeline maintainer closeout docs.

### Business Value Protected

PDF quotes are customer-facing sales artifacts. Operators need clear, safe recovery copy when PDF generation fails or returns without a downloadable file.

### Scope Constraints

- Do not change PDF preview layout, print behavior, quote rendering, server functions, schemas, database predicates, query keys, cache invalidation, send behavior, or success copy.
- Keep this as quote PDF preview feedback only. Non-quote opportunity actions remain separate slices.

### Changes

- Added a `PDF_MISSING` code message to the Pipeline quote formatter.
- Routed missing-PDF-url result failures through `formatPipelineQuoteMutationError`.
- Routed thrown PDF generation failures through the same formatter.
- Extended the Pipeline quote feedback contract to cover quote PDF preview wiring.

### Standards Checked

- Domain ownership: PDF preview failures now use the Pipeline quote formatter.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: checked PDF preview container/presenter -> `useGenerateQuotePdf`; server, schema, database, query-key, and cache policy stayed unchanged.
- Tenant isolation/data integrity: unchanged; no server predicates, schemas, or writes touched.
- Query/cache contract: unchanged; PDF mutation invalidation remains covered by Pipeline Sprint 1 tests.
- Transactional inventory and finance integrity: unchanged; no inventory, fulfillment, order conversion, finance, or costing path touched.
- Honest UI states/operator-safe errors: improved for no-URL and thrown PDF preview failures.
- Reviewability: bounded diff across one formatter, one presenter, one focused test, and this closeout.

### Smells Removed

- Local `PDF generation failed` toast outside the Pipeline quote feedback formatter.
- Local `Failed to generate PDF` toast outside the Pipeline quote feedback formatter.
- Missing formatter-owned code copy for a successful PDF mutation result without a downloadable file.

### Deferred

- Opportunity delete/stage/update/convert actions, kanban/list mutations, activity scheduling, and documents tab read-state copy remain separate workflow slices.
- Browser QA remains deferred because this source-covered slice changes toast message selection, not layout or interaction structure.
- Full `bun run test:unit` and `bun run build` remain deferred to larger release/predeploy sweeps.

### Verification

- Passed: `bun run test:vitest tests/unit/pipeline/quote-mutation-feedback-contract.test.ts tests/unit/pipeline/use-quote-mutations.test.tsx` - 2 files, 5 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. The standing maintainer goal already covers operator-safe errors, domain ownership, safe mutation/cache contracts, meaningful tests, reviewable diffs, and evidence-based closeout.

### Residual Risk

Low for Pipeline quote PDF preview feedback. Broader Pipeline still has non-quote opportunity and activity action feedback debt that should be handled in separate bounded sprints.
