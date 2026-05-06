# Pipeline Maintainer Sprint 60

## Status

Closed in commit-ready state.

## Issue 1: Opportunity Delete Needed Final Write Evidence

### Problem

`deleteOpportunity` pre-read a live tenant-owned opportunity before the transaction, then soft-deleted by `id + organizationId` without returned-row evidence. The pre-read protected normal requests, but the final write did not repeat the live-row predicate or prove that exactly the expected row was changed before enqueueing the search delete side effect.

### Workflow Spine

Opportunity delete action
-> opportunity mutation hook
-> pipeline opportunity server function
-> tenant-scoped live opportunity read
-> transaction soft-delete with live-row predicate
-> explicit returned-row evidence
-> search delete outbox side effect
-> centralized opportunity cache invalidation unchanged.

### Touched Domains

- Pipeline opportunity delete server workflow.
- Pipeline opportunity mutation feedback/source contract.
- Pipeline opportunity mutation cache contract.
- Pipeline maintainer closeout docs.

### Business Value Protected

Opportunity deletion removes stale commercial work from active pipeline views, search, metrics, and follow-up workflows. The delete path should only emit downstream delete side effects after the tenant-scoped live opportunity row has actually been soft-deleted.

### Scope Constraints

- Do not change delete inputs, permission checks, activity logging, search outbox payload shape, query/cache invalidation, UI feedback, or bulk opportunity behavior.
- Keep this as a bounded write-evidence cleanup for single opportunity delete.

### Changes

- Repeated the `deletedAt IS NULL` predicate on the final soft-delete write.
- Changed the soft-delete write to return row evidence.
- Added an explicit not-found guard if the transactional delete updates no live tenant row.
- Extended the opportunity mutation feedback source contract to protect the delete evidence path.

### Standards Checked

- Domain ownership: opportunity delete behavior remains in the pipeline opportunity server section; extraction is deferred.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: hook/cache/UI contracts stayed unchanged; server write evidence became clearer.
- Tenant isolation/data integrity: final delete write now uses `id + organizationId + deletedAt IS NULL`.
- Query/cache contract: unchanged; delete still flows through centralized opportunity mutation cache invalidation.
- Honest UI states/operator-safe errors: unchanged; delete failures still route through the existing formatter.
- Reviewability: bounded diff across one server module, one source contract, and this closeout.

### Smells Removed

- Final soft-delete write did not repeat the live-row guard.
- Search delete outbox could be reached without explicit returned-row evidence from the soft-delete write.

### Deferred

- Opportunity server ownership remains inside the large `pipeline.ts` module; extraction is deferred to a deliberate server ownership slice.
- Bulk opportunity workflows remain separate slices.
- Browser QA remains deferred because this source-covered slice changes server write evidence only.
- Full `bun run test:unit` and `bun run build` remain deferred to broader release/predeploy sweeps.

### Verification

- Passed: `bun run test:vitest tests/unit/pipeline/opportunity-mutation-feedback-contract.test.ts tests/unit/pipeline/opportunity-mutation-cache-contract.test.ts tests/unit/pipeline/opportunity-list-query-contract.test.tsx` (3 files, 7 tests).
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for delete evidence, tenant predicates, formatter coverage, and cache invalidation.
- Passed: `git diff --check`.
- Skipped: serialized gates; this slice does not touch serial lineage, inventory identity, warranty/RMA continuity, or a related cross-domain invariant.

### Goal Adaptation

Accepted. Serialized gates are no longer routine closeout gates. They should only be run when a slice directly touches serial lineage, inventory identity, warranty/RMA continuity, or a related cross-domain invariant.

### Residual Risk

Low for single opportunity delete write evidence. Moderate for broader opportunity server ownership because create/update/stage/delete/bulk workflows still live inside the monolithic pipeline server module.
