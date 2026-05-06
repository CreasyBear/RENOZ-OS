# Pipeline Maintainer Sprint 59

## Status

Closed in commit-ready state.

## Issue 1: Opportunity Update Workflows Carried Nullable Returned Rows

### Problem

After Sprint 57 added tenant predicates to `updateOpportunity` and `updateOpportunityStage`, both workflows still used array result variables and returned `result[0] ?? null` or `updateResult[0] ?? null` after conflict checks. The behavior was mostly protected by length checks, but the code still modeled a successful update as nullable while downstream audit/search work expects a real updated row.

### Workflow Spine

Opportunity update/stage change
-> opportunity mutation hook
-> pipeline opportunity server function
-> tenant-scoped current opportunity read
-> optimistic-lock update with tenant predicate
-> explicit returned-row evidence
-> search/stage activity side effects built from proven row
-> centralized opportunity cache invalidation unchanged.

### Touched Domains

- Pipeline opportunity update server workflow.
- Pipeline opportunity stage update server workflow.
- Pipeline opportunity mutation feedback/source contract.
- Pipeline opportunity mutation cache contract.
- Pipeline maintainer closeout docs.

### Business Value Protected

Opportunity edits and stage changes drive forecast value, follow-up timing, search, and audit history. Successful update flows should operate on a proven updated row, not a nullable array fallback.

### Scope Constraints

- Do not change mutation inputs, optimistic-lock version semantics, conflict messages, validation messages, stage transition rules, tenant predicates, search outbox payload shape, activity logging, query/cache invalidation, UI feedback, or bulk stage behavior.
- Keep this as returned-row evidence cleanup for single opportunity update workflows.

### Changes

- Changed `updateOpportunity` to destructure the updated opportunity row, check it explicitly, and build search outbox data from that proven row.
- Changed `updateOpportunityStage` to destructure the updated opportunity row, check it explicitly, and return that proven row after stage activity logging.
- Extended the opportunity mutation feedback source contract to protect explicit returned-row evidence in both workflows.

### Standards Checked

- Domain ownership: opportunity update behavior remains in the pipeline opportunity server section; extraction is deferred.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: hook/cache/UI contracts stayed unchanged; server returned-row evidence became clearer.
- Tenant isolation/data integrity: final writes still use `id + organizationId + version` predicates.
- Query/cache contract: unchanged; opportunity mutations still invalidate list, infinite list, metrics, detail, and related pipeline caches through centralized query keys.
- Honest UI states/operator-safe errors: unchanged; conflicts still use existing safe conflict copy.
- Reviewability: bounded diff across one server module, one source contract, and this closeout.

### Smells Removed

- `updateOpportunity` returned `result[0] ?? null` after proving the row should exist.
- `updateOpportunity` search outbox payload read from `result[0]`.
- `updateOpportunityStage` returned `updateResult[0] ?? null` after proving the row should exist.

### Deferred

- Opportunity server ownership remains inside the large `pipeline.ts` module; extraction is deferred to a deliberate server ownership slice.
- Bulk stage update still uses row-by-row result arrays by design for per-record failure tracking; this sprint only touches single-record workflows.
- Browser QA remains deferred because this source-covered slice changes server returned-row handling only.
- Full `bun run test:unit` and `bun run build` remain deferred to broader release/predeploy sweeps.

### Verification

- Passed: `bun run test:vitest tests/unit/pipeline/opportunity-mutation-feedback-contract.test.ts tests/unit/pipeline/opportunity-mutation-cache-contract.test.ts tests/unit/pipeline/opportunity-list-query-contract.test.tsx` (3 files, 7 tests).
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for explicit returned-row evidence, tenant/optimistic-lock predicates, formatter coverage, and cache invalidation.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. The standing maintainer goal already covers tenant isolation, data integrity, safe mutation/cache contracts, operator-safe errors, meaningful tests, and reviewable diffs.

### Residual Risk

Low for single opportunity update returned-row evidence. Moderate for broader opportunity server ownership because create/update/stage/bulk workflows still live inside the monolithic pipeline server module.
