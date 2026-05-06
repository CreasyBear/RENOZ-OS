# Pipeline Maintainer Sprint 4

## Status

Closed in commit-ready state.

## Issue 1: Opportunity Quote Tab Save And PDF Actions Used Raw Error Messages

### Problem

The opportunity quote tab is the full quote management surface inside opportunity detail. Its inline quote editor saved new quote versions and generated PDFs with local `error.message` toasts. That made the main quote-building workflow less operator-safe than the quote detail and opportunity detail send paths cleaned in the prior Pipeline sprints.

### Workflow Spine

Opportunity quote tab
-> quote editor save or current quote PDF action
-> quote mutation hook
-> quote server function
-> quote/document cache invalidation
-> operator-safe toast feedback.

### Touched Domains

- Pipeline opportunity quote tab action feedback.
- Pipeline quote mutation formatter usage.
- Pipeline quote feedback contract tests.
- Pipeline maintainer closeout docs.

### Business Value Protected

Building and issuing quotes is part of the sales workflow that turns RENOZ Energy opportunities into orders. Save and PDF failures now produce consistent action-specific recovery copy and suppress backend/runtime details.

### Scope Constraints

- Do not change quote editor layout, line-item calculations, product search, quote version creation payloads, PDF generation behavior, server functions, schemas, database predicates, query keys, cache invalidation, quote send behavior, or success copy.
- Keep this as opportunity quote tab save/PDF feedback only; quote restore, quote preview, quote builder legacy presenter, and other Pipeline actions remain separate slices.

### Changes

- Imported `formatPipelineQuoteMutationError` into the opportunity quote tab.
- Routed quote version save failures through the formatter with the `save` action.
- Routed quote PDF generation failures through the formatter with the `generatePdf` action.
- Extended the Pipeline quote feedback source contract to cover the opportunity quote tab.

### Standards Checked

- Domain ownership: quote save/PDF feedback now uses the Pipeline quote formatter.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: checked opportunity detail quote tab through quote mutation hooks; server, schema, database, query-key, and cache policy stayed unchanged.
- Tenant isolation/data integrity: unchanged; no server predicates, schemas, or writes touched.
- Query/cache contract: unchanged; quote mutation invalidation remains covered by Pipeline Sprint 1 tests.
- Transactional inventory and finance integrity: unchanged; no inventory, order conversion, finance, or costing path touched.
- Honest UI states/operator-safe errors: improved for quote tab save and PDF failures.
- Reviewability: bounded diff across one tab component, one focused test, and this closeout.

### Smells Removed

- Raw thrown `error.message` toast for quote version save failures.
- Raw thrown `error.message` toast for quote PDF generation failures.
- Inconsistent quote feedback ownership across quote detail, opportunity detail, and opportunity quote tab entry points.

### Deferred

- Quote restore/version-history feedback, quote PDF preview feedback, legacy quote builder save feedback, opportunity delete/stage/update/convert actions, kanban/list mutations, and activity scheduling remain separate workflow slices.
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

Low for opportunity quote tab save/PDF feedback. Moderate across Pipeline because older quote and opportunity action surfaces still have raw or generic feedback and need separate bounded sprints.
