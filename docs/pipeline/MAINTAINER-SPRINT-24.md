# Pipeline Maintainer Sprint 24

## Status

Closed in commit-ready state.

## Issue 1: Opportunity Detail Missing-Version Stage Guards Used Local Failure Copy

### Problem

`useOpportunityDetail` already routed stage mutation catch failures through `formatPipelineOpportunityMutationError(error, 'stage')`, but the pre-mutation guards for missing optimistic-lock versions still used local `Unable to update stage. Please refresh and try again.` toasts. That kept part of the same stage-change workflow outside the Pipeline opportunity mutation feedback contract.

### Workflow Spine

Opportunity detail stage action
-> optimistic-lock version guard
-> `useUpdateOpportunityStage`
-> stage mutation formatter
-> operator-safe stage failure toast.

### Touched Domains

- Pipeline opportunity detail composite hook.
- Pipeline opportunity mutation feedback contract tests.
- Pipeline maintainer closeout docs.

### Business Value Protected

Stage changes drive opportunity progression and won/lost decisions. When the detail page lacks a version for safe mutation, the operator should receive the same stage-update failure guidance as other stage mutation failures.

### Scope Constraints

- Do not change stage mutation inputs, optimistic locking behavior, won/lost dialog behavior, mutation hooks, server functions, schemas, query keys, cache behavior, loading state, or UI layout.
- Keep this as opportunity detail stage feedback only.

### Changes

- Added a local sentinel for missing opportunity version preconditions.
- Routed both missing-version stage guard toasts through `formatPipelineOpportunityMutationError(..., 'stage')`.
- Extended the Pipeline opportunity mutation feedback contract to cover the missing-version guard path and prevent the local toast from returning.

### Standards Checked

- Domain ownership: all opportunity detail stage failure copy now uses the Pipeline opportunity mutation formatter.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: improved the hook stage feedback contract; mutation hooks, server functions, schemas, database predicates, query keys, and cache policy stayed unchanged.
- Tenant isolation/data integrity: unchanged; no server predicates, schemas, or writes touched.
- Query/cache contract: unchanged; no query keys, invalidation, or cache writes touched.
- Transactional inventory and finance integrity: unchanged; no inventory, fulfillment, order conversion, finance, or costing path touched.
- Honest UI states/operator-safe errors: improved by centralizing missing-version stage guard feedback with the rest of stage mutation failures.
- Reviewability: bounded diff across one hook, one focused contract test, and this closeout.

### Smells Removed

- Local missing-version stage failure copy in `onStageChange`.
- Local missing-version stage failure copy in `onWonLostConfirm`.
- Missing source contract coverage for the opportunity detail missing-version guard path.

### Deferred

- Other validation toasts remain unchanged because they are user-correctable guardrails, not mutation failures.
- Browser QA remains deferred because this source-covered slice changes failure copy, not layout or interaction flow.
- Full `bun run test:unit` and `bun run build` remain deferred to larger release/predeploy sweeps.

### Verification

- Passed: `bun run test:vitest tests/unit/pipeline/opportunity-mutation-feedback-contract.test.ts` - 1 file, 3 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for removed local `Unable to update stage. Please refresh and try again.` copy.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. The serialized-gates adaptation from Sprint 18 stands: serialized gates are conditional, not routine, and this sprint did not touch serial identity or inventory lineage.

### Residual Risk

Low for the targeted opportunity detail stage guard feedback. Remaining Pipeline local toasts are primarily validation guardrails or success/partial-success summaries rather than mutation failure formatters.
