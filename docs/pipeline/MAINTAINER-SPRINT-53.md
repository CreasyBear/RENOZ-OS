# Pipeline Maintainer Sprint 53

## Status

Closed in commit-ready state.

## Issue 1: Bulk Stage Server Failures Returned Raw Exception Text

### Problem

Bulk opportunity stage changes already normalized UI mutation failures, but the server-side per-record catch still pushed the caught exception message into the returned `failed` array. The raw exception was useful for logs, but unsafe as API response data because future UI surfaces could expose database, stack, or internal provider details.

### Workflow Spine

Bulk stage change
-> opportunity list container
-> bulk stage mutation hook
-> pipeline bulk stage server function
-> tenant-scoped opportunity fetch
-> stage transition validation
-> transactional per-row optimistic update
-> safe per-row failure response
-> raw exception context retained in server logs
-> centralized opportunity cache invalidation unchanged.

### Touched Domains

- Pipeline bulk opportunity stage server workflow.
- Pipeline opportunity mutation feedback source contract.
- Pipeline maintainer closeout docs.

### Business Value Protected

Bulk pipeline changes are operational shortcuts. If one row fails, operators should receive safe, actionable failure data while engineering keeps raw exception context in logs for diagnosis.

### Scope Constraints

- Do not change bulk stage inputs, stage transition validation, optimistic locking, transaction scope, activity logging, mutation hook invalidation, UI toast copy, or bulk dialog control flow.
- Keep this as server response hardening for caught bulk update exceptions only.

### Changes

- Replaced raw caught exception text in bulk stage `failed` response entries with safe operator-facing copy.
- Kept raw exception message and stack in `pipelineLogger.error` context.
- Extended the opportunity mutation feedback source contract to protect the safe response and logging split.

### Standards Checked

- Domain ownership: bulk opportunity stage response handling remains in the pipeline server workflow.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: UI, hook, schema, database predicates, and cache invalidation stayed unchanged.
- Tenant isolation/data integrity: tenant-scoped fetch and optimistic update predicates stayed unchanged.
- Query/cache contract: unchanged; `useBulkUpdateOpportunityStage` still invalidates opportunity lists, pipeline metrics, and pipeline detail caches through centralized query keys.
- Honest UI states/operator-safe errors: caught internal exception text no longer enters the mutation response payload.
- Reviewability: bounded diff across one server module, one source contract, and this closeout.

### Smells Removed

- Raw caught exception message serialized into bulk stage failure response entries.

### Deferred

- Existing validation failures still include opportunity IDs and transition details; those are deliberate operator-facing validation outcomes and were not changed.
- Bulk stage server ownership remains inside the large `pipeline.ts` module; extraction is deferred to a deliberate server ownership slice.
- Browser QA remains deferred because this source-covered slice changes server response failure text only.
- Full `bun run test:unit` and `bun run build` remain deferred to broader release/predeploy sweeps.

### Verification

- Passed: `bun run test:vitest tests/unit/pipeline/opportunity-mutation-feedback-contract.test.ts tests/unit/pipeline/opportunity-mutation-cache-contract.test.ts tests/unit/pipeline/opportunity-list-query-contract.test.tsx` (3 files, 7 tests).
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for safe bulk stage failure response, raw exception logging, tenant predicates, and cache invalidation.
- Passed: `git diff --check`.

### Goal Adaptation

Declined. The standing maintainer goal already covers operator-safe errors, tenant isolation, safe mutation/cache contracts, meaningful tests, and reviewable diffs.

### Residual Risk

Low for caught bulk stage exception response leakage. Moderate for the broader bulk stage workflow because it remains inside the monolithic pipeline server module and still processes valid updates row-by-row inside one transaction.
