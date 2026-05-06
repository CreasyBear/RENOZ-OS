# Pipeline Maintainer Sprint 5

## Status

Closed in commit-ready state.

## Issue 1: Quote Builder Save Used Raw Error Messages

### Problem

The reusable quote builder presenter is still wired through `QuoteBuilderContainer` and used by an opportunity detail quote tab. It saved quote versions with a raw thrown `error.message` toast, even though the newer opportunity quote tab save path now uses the Pipeline quote formatter.

### Workflow Spine

Opportunity detail quote builder
-> `QuoteBuilderContainer`
-> `QuoteBuilderPresenter`
-> `useCreateQuoteVersion`
-> quote version server function
-> quote/opportunity cache invalidation
-> operator-safe toast feedback.

### Touched Domains

- Pipeline quote builder save feedback.
- Pipeline quote mutation formatter usage.
- Pipeline quote feedback contract tests.
- Pipeline maintainer closeout docs.

### Business Value Protected

Quote building is a sales workflow. Operators should never see SQL, runtime, or backend details when saving a quote fails; they should get consistent quote-save recovery copy across both builder surfaces.

### Scope Constraints

- Do not change quote builder layout, product selection, line item calculations, save payloads, server functions, schemas, database predicates, query keys, cache invalidation, history, preview, or success copy.
- Keep this as reusable quote builder save feedback only. Quote restore/version history and PDF preview feedback remain separate slices.

### Changes

- Imported `formatPipelineQuoteMutationError` into `QuoteBuilderPresenter`.
- Routed quote builder save failures through the formatter with the `save` action.
- Extended the Pipeline quote feedback source contract to cover the reusable quote builder presenter.

### Standards Checked

- Domain ownership: quote builder save feedback now uses the Pipeline quote formatter.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: checked opportunity detail -> `QuoteBuilderContainer` -> presenter -> `useCreateQuoteVersion`; server, schema, database, query-key, and cache policy stayed unchanged.
- Tenant isolation/data integrity: unchanged; no server predicates, schemas, or writes touched.
- Query/cache contract: unchanged; quote mutation invalidation remains covered by Pipeline Sprint 1 tests.
- Transactional inventory and finance integrity: unchanged; no inventory, fulfillment, order conversion, finance, or costing path touched.
- Honest UI states/operator-safe errors: improved for quote builder save failures.
- Reviewability: bounded diff across one presenter, one focused test, and this closeout.

### Smells Removed

- Raw thrown `error.message` toast for reusable quote builder save failures.
- Inconsistent quote-save feedback ownership between the opportunity quote tab editor and the reusable quote builder presenter.

### Deferred

- Quote restore/version history feedback, quote PDF preview feedback, opportunity delete/stage/update/convert actions, kanban/list mutations, and activity scheduling remain separate workflow slices.
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

Low for reusable quote builder save feedback. Moderate across Pipeline because quote restore/PDF preview and non-quote opportunity action surfaces still need separate bounded cleanup.
