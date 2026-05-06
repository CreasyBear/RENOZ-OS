# Pipeline Maintainer Sprint 57

## Status

Closed in commit-ready state.

## Issue 1: Opportunity Update Writes Missed Final Tenant Predicate

### Problem

`updateOpportunity` and `updateOpportunityStage` both read the current opportunity through tenant-scoped helpers before writing. Their final optimistic-lock updates used `id` and `version`, but did not repeat the `organizationId` predicate in the write itself. UUID IDs should be globally unique, but the maintainer standard requires tenant scope on the write boundary, not only the pre-read.

### Workflow Spine

Opportunity update/stage change
-> opportunity mutation hook
-> pipeline opportunity server function
-> tenant-scoped current opportunity read
-> optimistic-lock update with tenant predicate
-> search/stage activity side effects unchanged
-> centralized opportunity cache invalidation unchanged.

### Touched Domains

- Pipeline opportunity update server workflow.
- Pipeline opportunity stage update server workflow.
- Pipeline opportunity mutation feedback/source contract.
- Pipeline opportunity mutation cache contract.
- Pipeline maintainer closeout docs.

### Business Value Protected

Pipeline opportunity edits and stage changes drive sales value, follow-up timing, and forecast accuracy. The final write should carry tenant scope directly so the mutation contract remains defensible even as surrounding code evolves.

### Scope Constraints

- Do not change mutation inputs, optimistic-lock version semantics, validation messages, stage transition rules, search outbox payloads, activity logging, query/cache invalidation, UI feedback, or bulk stage behavior.
- Keep this as final write tenant-predicate hardening for single opportunity update workflows.

### Changes

- Added `eq(opportunities.organizationId, ctx.organizationId)` to the `updateOpportunity` final update predicate.
- Added `eq(opportunities.organizationId, ctx.organizationId)` to the `updateOpportunityStage` final update predicate.
- Extended the opportunity mutation feedback source contract to protect `id + organizationId + version` predicates in both workflows.

### Standards Checked

- Domain ownership: opportunity update behavior remains in the pipeline opportunity server section; extraction is deferred.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: hook/cache/UI contracts stayed unchanged; server write boundary improved.
- Tenant isolation/data integrity: final writes now repeat tenant scope alongside the optimistic-lock version check.
- Query/cache contract: unchanged; opportunity mutations still invalidate list, infinite list, metrics, detail, and related pipeline caches through centralized query keys.
- Honest UI states/operator-safe errors: unchanged; conflicts and validation failures still use existing safe error types/copy.
- Reviewability: bounded diff across one server module, one source contract, and this closeout.

### Smells Removed

- Tenant scope existed on the pre-read but not on the final `updateOpportunity` write predicate.
- Tenant scope existed on the pre-read but not on the final `updateOpportunityStage` write predicate.

### Deferred

- Opportunity server ownership remains inside the large `pipeline.ts` module; extraction is deferred to a deliberate server ownership slice.
- `createOpportunity` insert returned-row evidence is still deferred as a separate create-workflow slice.
- Browser QA remains deferred because this source-covered slice changes server write predicates only.
- Full `bun run test:unit` and `bun run build` remain deferred to broader release/predeploy sweeps.

### Verification

- Passed: `bun run test:vitest tests/unit/pipeline/opportunity-mutation-feedback-contract.test.ts tests/unit/pipeline/opportunity-mutation-cache-contract.test.ts tests/unit/pipeline/opportunity-list-query-contract.test.tsx` (3 files, 7 tests).
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for opportunity update/stage tenant predicates, optimistic-lock predicates, formatter coverage, and cache invalidation.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. The standing maintainer goal already covers tenant isolation, data integrity, safe mutation/cache contracts, operator-safe errors, meaningful tests, and reviewable diffs.

### Residual Risk

Low for single opportunity update tenant scope. Moderate for broader opportunity server ownership because create/update/stage/bulk workflows still live inside the monolithic pipeline server module.
