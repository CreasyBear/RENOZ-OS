# Pipeline Maintainer Sprint 15

## Status

Closed in commit-ready state.

## Issue 1: Quick Quote Form Used Local Create Failure Copy

### Problem

`QuickQuoteFormPresenter` is the rapid quote creation surface. Its quote create mutation still used local generic failure copy instead of the Pipeline quote formatter, leaving it inconsistent with the other quote save/create entry points.

### Workflow Spine

Quick quote form
-> `QuickQuoteFormPresenter`
-> `useCreateQuoteVersion`
-> quote version server function
-> quote/opportunity query invalidation
-> operator-safe toast feedback.

### Touched Domains

- Pipeline quick quote create feedback.
- Pipeline quote formatter usage.
- Pipeline quote feedback contract tests.
- Pipeline maintainer closeout docs.

### Business Value Protected

Fast quote creation is part of the sales workflow. Failed quote creation should produce the same safe, action-specific recovery copy as other quote save paths without exposing backend or runtime details.

### Scope Constraints

- Do not change quick quote form layout, customer selection, product line handling, create payloads, server functions, schemas, database predicates, query keys, cache invalidation, navigation, or success copy.
- Keep this as quick quote create feedback only. Read-state copy and broader form UX cleanup remain separate slices.

### Changes

- Imported `formatPipelineQuoteMutationError` into the quick quote form presenter.
- Routed quick quote create failures through the formatter with the `save` action.
- Extended the quote mutation feedback contract to cover quick quote form wiring.

### Standards Checked

- Domain ownership: quick quote create feedback now uses the Pipeline quote formatter.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: checked quick quote presenter -> create quote mutation hook; server, schema, database, query-key, and cache policy stayed unchanged.
- Tenant isolation/data integrity: unchanged; no server predicates, schemas, or writes touched.
- Query/cache contract: unchanged; quote create invalidation stayed in existing mutation hooks.
- Transactional inventory and finance integrity: unchanged; no inventory, fulfillment, order conversion, finance, or costing path touched.
- Honest UI states/operator-safe errors: improved for quick quote create failures.
- Reviewability: bounded diff across one presenter, one focused test, and this closeout.

### Smells Removed

- Local generic quick quote create failure toast.
- Inconsistent quote-save feedback ownership between quick quote and other quote creation surfaces.

### Deferred

- Follow-up/read-state copy and broader quick quote UX validation remain separate workflow slices.
- Browser QA remains deferred because this source-covered slice changes toast message selection, not layout or interaction structure.
- Full `bun run test:unit` and `bun run build` remain deferred to larger release/predeploy sweeps.

### Verification

- Passed: `bun run test:vitest tests/unit/pipeline/quote-mutation-feedback-contract.test.ts tests/unit/pipeline/activity-mutation-feedback-contract.test.ts` - 2 files, 6 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. The standing maintainer goal already covers operator-safe errors, domain ownership, safe mutation/cache contracts, meaningful tests, reviewable diffs, and evidence-based closeout.

### Residual Risk

Low for quick quote create feedback. Remaining Pipeline cleanup is now mostly read-state copy and validation microcopy, which should be handled in separate bounded slices.
