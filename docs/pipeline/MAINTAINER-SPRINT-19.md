# Pipeline Maintainer Sprint 19

## Status

Closed in commit-ready state.

## Issue 1: Pipeline Hook Read Fallbacks Were Still Inline

### Problem

Sprint 18 moved board/list/documents presenter copy into `PIPELINE_READ_MESSAGES`, but the hook layer still inlined read-normalization fallback copy for opportunities, details, search, metrics, forecast, velocity, revenue attribution, customers, and products. That left the route -> container -> hook read spine split across presenter-owned and hook-owned strings.

### Workflow Spine

Pipeline read hooks
-> read server function
-> `requireReadResult` / `normalizeReadQueryError`
-> Pipeline read-state message map
-> container/presenter read state.

### Touched Domains

- Pipeline opportunity read hooks.
- Pipeline metrics/supporting-data read hooks.
- Pipeline read-error message helper.
- Pipeline read-state/read-error contract tests.
- Pipeline maintainer closeout docs.

### Business Value Protected

Opportunity, forecast, and supporting-data reads are core sales-ops inputs. Keeping fallback copy centralized at the domain boundary makes errors easier to audit and keeps future UI/hook changes from drifting into inconsistent operator guidance.

### Scope Constraints

- Do not change hook query keys, query options, server functions, schemas, filters, pagination, date handling, result shapes, cache policy, loading behavior, or UI rendering.
- Keep this as hook read-normalization copy only. Activity and quote hook read fallbacks remain separate bounded slices.

### Changes

- Added Pipeline read fallback copy for opportunity detail/search and Pipeline metrics/supporting-data hooks.
- Reused `PIPELINE_READ_MESSAGES.opportunities` for list, kanban, and infinite opportunity reads.
- Routed `use-opportunities` read normalization fallbacks through `PIPELINE_READ_MESSAGES`.
- Routed `use-pipeline-metrics` read normalization fallbacks through `PIPELINE_READ_MESSAGES`.
- Extended focused source contracts so these hooks cannot reintroduce literal `fallbackMessage` copy.

### Standards Checked

- Domain ownership: Pipeline hook read-normalization copy now lives in the Pipeline read-error helper.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: improved the hook -> read-error contract; server functions, schemas, database predicates, query keys, and cache policy stayed unchanged.
- Tenant isolation/data integrity: unchanged; no server predicates, schemas, or writes touched.
- Query/cache contract: unchanged; query keys, stale times, enabled conditions, and result contracts stayed unchanged.
- Transactional inventory and finance integrity: unchanged; no inventory, fulfillment, order conversion, finance, or costing path touched.
- Honest UI states/operator-safe errors: improved by removing duplicated hook fallback copy that could drift from presenter fallback copy.
- Reviewability: bounded diff across one helper, two hook files, focused tests, and this closeout.

### Smells Removed

- Inline opportunity list, detail, not-found, and search fallback strings inside Pipeline opportunity hooks.
- Inline metrics, forecast, velocity, revenue attribution, customer, and product fallback strings inside Pipeline metrics hooks.
- Missing source contract preventing hook-level literal `fallbackMessage` copy from returning in the targeted files.

### Deferred

- Pipeline quote and activity hook read fallbacks remain separate workflow slices.
- Browser QA remains deferred because this source-covered slice changes hook fallback constants, not layout or browser interaction.
- Full `bun run test:unit` and `bun run build` remain deferred to larger release/predeploy sweeps.

### Verification

- Passed: `bun run test:vitest tests/unit/pipeline/pipeline-read-error-messages.test.ts tests/unit/pipeline/pipeline-read-state-contract.test.ts` - 2 files, 5 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for literal hook `fallbackMessage` read copy in the touched files.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. The serialized-gates adaptation from Sprint 18 stands: serialized gates are conditional, not routine, and this sprint did not touch serial identity or inventory lineage.

### Residual Risk

Low for the targeted opportunity and metrics hook fallback copy. Moderate across Pipeline because quote and activity read hooks still hold inline read fallback strings and should be cleaned in separate bounded slices.
