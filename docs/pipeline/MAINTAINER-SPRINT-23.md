# Pipeline Maintainer Sprint 23

## Status

Closed in commit-ready state.

## Issue 1: New Opportunity Route Used Local Create Failure Copy

### Problem

The new-opportunity route still handled create mutation failures with local `Failed to create opportunity. Please try again.` copy. Other Pipeline create surfaces already use `formatPipelineOpportunityMutationError(error, 'create')`, so the route-level create workflow could drift from the centralized opportunity mutation feedback contract.

### Workflow Spine

New opportunity route
-> `NewOpportunityForm`
-> `useCreateOpportunity`
-> opportunity create server function
-> Pipeline opportunity mutation formatter
-> operator-safe create failure toast.

### Touched Domains

- Pipeline new-opportunity route create feedback.
- Pipeline opportunity mutation feedback contract tests.
- Pipeline maintainer closeout docs.

### Business Value Protected

Creating opportunities is the entry point for the sales pipeline. Create failures should use the same safe, action-specific feedback as quick create and detail workflows so operators get consistent guidance without implementation leakage.

### Scope Constraints

- Do not change form fields, validation, customer loading, mutation inputs, navigation, schemas, server functions, query keys, cache behavior, loading state, or layout.
- Keep this as route create mutation feedback only.

### Changes

- Imported `formatPipelineOpportunityMutationError` into the new-opportunity route.
- Routed create catch feedback through `formatPipelineOpportunityMutationError(error, 'create')`.
- Extended the Pipeline opportunity mutation feedback contract to cover `new-opportunity-page.tsx`.

### Standards Checked

- Domain ownership: route create failure copy now uses the Pipeline opportunity mutation formatter.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: improved the route -> hook mutation feedback contract; server functions, schemas, database predicates, query keys, and cache policy stayed unchanged.
- Tenant isolation/data integrity: unchanged; no server predicates, schemas, or writes touched.
- Query/cache contract: unchanged; no query keys, invalidation, or cache writes touched.
- Transactional inventory and finance integrity: unchanged; no inventory, fulfillment, order conversion, finance, or costing path touched.
- Honest UI states/operator-safe errors: improved by removing local generic create failure copy from the route.
- Reviewability: bounded diff across one route, one focused contract test, and this closeout.

### Smells Removed

- Local `Failed to create opportunity. Please try again.` toast in the new-opportunity route.
- Missing source contract coverage for the route-level opportunity create workflow.

### Deferred

- Other non-error validation toasts remain unchanged because they are user-correctable form guardrails, not mutation failure handling.
- Browser QA remains deferred because this source-covered slice changes failure copy, not layout or interaction flow.
- Full `bun run test:unit` and `bun run build` remain deferred to larger release/predeploy sweeps.

### Verification

- Passed: `bun run test:vitest tests/unit/pipeline/opportunity-mutation-feedback-contract.test.ts` - 1 file, 3 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted route source scan for removed `Failed to create opportunity` copy.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. The serialized-gates adaptation from Sprint 18 stands: serialized gates are conditional, not routine, and this sprint did not touch serial identity or inventory lineage.

### Residual Risk

Low for the targeted new-opportunity create failure feedback. Remaining Pipeline local toasts are mostly validation guardrails or already route through centralized mutation formatters; future scans should distinguish user-correctable validations from mutation failures.
