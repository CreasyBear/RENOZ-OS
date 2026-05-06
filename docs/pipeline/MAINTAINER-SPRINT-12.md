# Pipeline Maintainer Sprint 12

## Status

Closed in commit-ready state.

## Issue 1: Opportunities List Delete And Bulk Stage Feedback Was Local

### Problem

`OpportunitiesListContainer` handled single delete, bulk delete, and bulk stage change failures with local generic or raw-message feedback. That left the table/list workflow inconsistent with the kanban board, quick dialog, and opportunity detail formatter contract.

### Workflow Spine

Opportunities list
-> selection or row action
-> delete or bulk stage mutation hook
-> opportunity server function
-> opportunity query/cache invalidation
-> operator-safe toast feedback.

### Touched Domains

- Pipeline opportunities list action feedback.
- Pipeline opportunity formatter action map.
- Pipeline opportunity feedback contract tests.
- Pipeline maintainer closeout docs.

### Business Value Protected

List bulk actions are high-leverage operator workflows. A failed delete or stage update should show safe, action-specific recovery copy without leaking backend details or collapsing all failures into vague generic copy.

### Scope Constraints

- Do not change list layout, sorting, selection behavior, confirmation behavior, mutation payloads, server functions, schemas, database predicates, query keys, cache invalidation, result-count success copy, or partial-failure count copy.
- Keep this as opportunities list delete/bulk-stage feedback only. Bulk operations dialog internals and activity feedback remain separate slices.

### Changes

- Added `bulkDelete` and `bulkStage` action fallbacks to the Pipeline opportunity formatter.
- Routed single opportunity delete failures through the formatter.
- Routed bulk delete failures through the formatter.
- Routed bulk stage mutation failures through the formatter.
- Extended the opportunity mutation feedback contract to cover list action wiring.

### Standards Checked

- Domain ownership: opportunities list mutation feedback now uses the Pipeline opportunity formatter.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: checked opportunities list container -> delete/bulk-stage mutation hooks; server, schema, database, query-key, and cache policy stayed unchanged.
- Tenant isolation/data integrity: unchanged; no server predicates, schemas, or writes touched.
- Query/cache contract: unchanged; mutation invalidation stayed in existing mutation hooks.
- Transactional inventory and finance integrity: unchanged; no inventory, fulfillment, order conversion, finance, or costing path touched.
- Honest UI states/operator-safe errors: improved for single delete, bulk delete, and bulk stage mutation failures.
- Reviewability: bounded diff across one container, one formatter, one focused test, and this closeout.

### Smells Removed

- Local generic single delete failure toast in the opportunities list.
- Local generic bulk delete failure toast in the opportunities list.
- Raw thrown bulk stage failure toast in the opportunities list.

### Deferred

- Bulk operations dialog internals, activity scheduling, and documents tab read-state copy remain separate workflow slices.
- Browser QA remains deferred because this source-covered slice changes toast message selection, not layout or interaction structure.
- Full `bun run test:unit` and `bun run build` remain deferred to larger release/predeploy sweeps.

### Verification

- Passed: `bun run test:vitest tests/unit/pipeline/opportunity-mutation-feedback-contract.test.ts tests/unit/pipeline/quote-mutation-feedback-contract.test.ts` - 2 files, 6 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. The standing maintainer goal already covers operator-safe errors, domain ownership, safe mutation/cache contracts, meaningful tests, reviewable diffs, and evidence-based closeout.

### Residual Risk

Low for opportunities list delete/bulk-stage feedback. Moderate across Pipeline because bulk operations dialog internals, activity scheduling, and read-state copy still need separate bounded cleanup.
