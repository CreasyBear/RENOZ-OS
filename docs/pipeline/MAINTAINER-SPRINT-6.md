# Pipeline Maintainer Sprint 6

## Status

Closed in commit-ready state.

## Issue 1: Quote Version Restore Used Local Generic Failure Copy

### Problem

Quote version history restores an older quote into a new quote version. That failure path used a local generic toast instead of the Pipeline quote formatter, leaving restore outside the same operator-safe feedback contract as quote save, send, PDF, and delete actions.

### Workflow Spine

Quote version history
-> restore action
-> `useRestoreQuoteVersion`
-> quote restore server function
-> quote/opportunity cache invalidation
-> operator-safe toast feedback.

### Touched Domains

- Pipeline quote version history restore feedback.
- Pipeline quote mutation formatter action map.
- Pipeline quote feedback contract tests.
- Pipeline maintainer closeout docs.

### Business Value Protected

Version restore protects sales accuracy when an operator needs to recover a prior quote state. Failures should explain the action that could not complete without exposing database or runtime details.

### Scope Constraints

- Do not change quote history layout, comparison behavior, restore payloads, server functions, schemas, database predicates, query keys, cache invalidation, or success copy.
- Keep this as quote version restore feedback only. Quote PDF preview result/failure feedback remains a separate slice.

### Changes

- Added a `restore` action to `formatPipelineQuoteMutationError`.
- Routed quote version restore failures through the formatter.
- Extended the Pipeline quote feedback contract to cover restore fallback behavior and source wiring.

### Standards Checked

- Domain ownership: quote restore feedback now uses the Pipeline quote formatter.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: checked quote history container/presenter -> `useRestoreQuoteVersion`; server, schema, database, query-key, and cache policy stayed unchanged.
- Tenant isolation/data integrity: unchanged; no server predicates, schemas, or writes touched.
- Query/cache contract: unchanged; quote mutation invalidation remains covered by Pipeline Sprint 1 tests.
- Transactional inventory and finance integrity: unchanged; no inventory, fulfillment, order conversion, finance, or costing path touched.
- Honest UI states/operator-safe errors: improved for quote version restore failures.
- Reviewability: bounded diff across one formatter, one presenter, one focused test, and this closeout.

### Smells Removed

- Local generic quote restore failure toast outside the Pipeline quote feedback formatter.
- Missing quote-restore action fallback in the Pipeline quote mutation formatter.

### Deferred

- Quote PDF preview no-PDF-result and thrown generation feedback remains a separate workflow slice.
- Opportunity delete/stage/update/convert actions, kanban/list mutations, and activity scheduling remain separate workflow slices.
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

Low for quote restore feedback. Moderate across Pipeline because quote PDF preview and non-quote opportunity action surfaces still need separate bounded cleanup.
