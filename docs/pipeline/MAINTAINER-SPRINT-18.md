# Pipeline Maintainer Sprint 18

## Status

Closed in commit-ready state.

## Issue 1: Pipeline Board, List, and Documents Read States Used Local Failure Copy

### Problem

Sprint 17 introduced a Pipeline-owned read-error helper for quote version history, but adjacent Pipeline read states still owned local failed-load copy or raw-ish `error.message` rendering. The main board, opportunities list, cached opportunities alert, and opportunity documents tab should use the same domain-owned read-state contract.

### Workflow Spine

Pipeline board/list/documents read state
-> Pipeline container/presenter
-> opportunity/document read hooks
-> read server functions
-> Pipeline read-state formatter
-> operator-safe unavailable or cached-degraded copy.

### Touched Domains

- Pipeline board read state.
- Pipeline opportunities list cold-load and cached-degraded read states.
- Pipeline opportunity documents cold-load and cached-degraded read states.
- Pipeline read-error message helper.
- Pipeline read-state/read-error contract tests.
- Pipeline maintainer closeout docs.

### Business Value Protected

The board and opportunity list are core sales operations surfaces, and opportunity documents protect quote recovery and operator context. Read failures should give operators honest recovery guidance without leaking raw implementation errors or scattering fallback copy across presenters.

### Scope Constraints

- Do not change board/list/documents layout, filters, pagination, selection, mutations, document cards, hooks, server functions, schemas, database predicates, query keys, cache policy, loading states, or empty states.
- Keep this as Pipeline read-state copy only. Opportunity detail and other Pipeline subdomain read states remain separate slices.

### Changes

- Added Pipeline read copy for board, opportunities, cached opportunities, opportunity documents, and cached documents.
- Routed board read failure copy through `formatPipelineReadError`.
- Routed opportunities cold-load and cached-degraded read failure copy through `formatPipelineReadError`.
- Routed opportunity documents cold-load and cached-degraded read failure copy through `formatPipelineReadError`.
- Extended focused read-error and source contracts for the touched Pipeline surfaces.

### Standards Checked

- Domain ownership: Pipeline board/list/documents read-state copy now lives in the Pipeline read-error helper.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: checked the read-state presenter/container layer; hooks, server, schema, database, query-key, and cache policy stayed unchanged.
- Tenant isolation/data integrity: unchanged; no server predicates, schemas, or writes touched.
- Query/cache contract: unchanged; cold-load and cached-degraded behavior stayed in the existing hook/query contracts.
- Transactional inventory and finance integrity: unchanged; no inventory, fulfillment, order conversion, finance, or costing path touched.
- Honest UI states/operator-safe errors: improved for board/list/documents read failures.
- Reviewability: bounded diff across one helper, four consumers, focused tests, and this closeout.

### Smells Removed

- Local hardcoded `Failed to load pipeline` copy.
- Local hardcoded `Failed to load opportunities` copy.
- Local hardcoded `Failed to load documents` copy.
- Raw-ish `error.message` rendering in the targeted Pipeline read states.
- Duplicate cached-degraded documents/opportunities fallback copy outside the Pipeline read-state helper.

### Deferred

- Opportunity detail and other Pipeline subdomain read states remain separate workflow slices.
- Browser QA remains deferred because this source-covered slice changes read-state copy, not layout or interaction structure.
- Full `bun run test:unit` and `bun run build` remain deferred to larger release/predeploy sweeps.

### Verification

- Passed: `bun run test:vitest tests/unit/pipeline/pipeline-read-error-messages.test.ts tests/unit/pipeline/pipeline-read-state-contract.test.ts` - 2 files, 4 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for removed Pipeline failed-load/raw-message patterns.
- Passed: `git diff --check`.

### Goal Adaptation

Made. Serialized gates are no longer a routine sprint closeout requirement. They should only be run when the sprint touches serial identity, serialized lineage, inventory lineage, or related cross-domain invariants.

### Residual Risk

Low for the targeted Pipeline board/list/documents read-state copy. Moderate across Pipeline because opportunity detail and other subdomain read states still need separate bounded cleanup before Pipeline read-state handling is fully consistent.
