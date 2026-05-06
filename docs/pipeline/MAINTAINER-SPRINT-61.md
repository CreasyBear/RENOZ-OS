# Pipeline Maintainer Sprint 61

## Status

Closed in commit-ready state.

## Issue 1: Bulk Opportunity Delete Was Container-Owned Fanout

### Problem

The opportunities list implemented bulk delete by calling the single delete mutation for each selected row with `Promise.all`. That made the container own mutation fanout and cache policy, repeated cache invalidation per item, and allowed one rejected delete to present the whole operation as failed even if other selected opportunities had already been deleted.

### Workflow Spine

Opportunities list bulk delete action
-> opportunities list container
-> bulk opportunity delete hook
-> tenant-scoped single opportunity delete server function per selected ID
-> per-row settled result
-> centralized opportunity detail removal and list/metrics invalidation
-> honest partial-success UI feedback.

### Touched Domains

- Pipeline opportunity bulk delete UI workflow.
- Pipeline opportunity mutation hook/cache policy.
- Pipeline hooks barrel export.
- Pipeline opportunity mutation cache/source contract.
- Pipeline maintainer closeout docs.

### Business Value Protected

Sales operators need bulk cleanup to be predictable. If a selected opportunity cannot be deleted, successful deletes should still be acknowledged and cache state should refresh once from a single domain-owned contract.

### Scope Constraints

- Do not introduce a new bulk delete server endpoint in this slice.
- Do not change the existing single opportunity delete server function, permissions, tenant predicates, activity logging, or search outbox behavior.
- Keep this focused on hook ownership, cache policy, and honest list-container feedback.

### Changes

- Added `useBulkDeleteOpportunities` to own bulk delete fanout with `Promise.allSettled`.
- Centralized bulk delete cache policy in the hook: remove successful opportunity details and invalidate opportunity lists plus pipeline metrics once.
- Exported the bulk delete hook and result types from the pipeline hooks barrel.
- Updated the opportunities list container to call the bulk hook, report deleted and failed counts separately, and disable bulk actions while a bulk mutation is pending.
- Extended the opportunity mutation cache contract to protect hook ownership and prevent container-level `Promise.all` fanout from returning.

### Standards Checked

- Domain ownership: bulk delete mutation/cache ownership moved from the list container into the pipeline opportunity mutation hook.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: the container now delegates to a hook; the hook calls the existing tenant-scoped server function and owns centralized query key/cache behavior.
- Tenant isolation/data integrity: unchanged; each row still flows through the hardened single delete server function.
- Query/cache contract: improved; successful detail cache removals and list/metrics invalidation are centralized for bulk delete.
- Honest UI states/operator-safe errors: improved; partial success is no longer collapsed into an all-failed toast, and bulk action buttons are disabled during pending work.
- Reviewability: bounded diff across one hook, one container, one barrel export, one source contract, and this closeout.

### Smells Removed

- Container-owned `Promise.all` mutation fanout for bulk delete.
- Repeated cache invalidation through multiple single-delete mutation successes.
- All-or-nothing bulk delete feedback when selected rows can settle differently.

### Deferred

- A true server-side bulk delete endpoint remains deferred until there is evidence that the current per-row server contract is too slow or cannot express needed transactional semantics.
- Bulk stage server result shape still returns string failures; it remains a separate workflow slice.
- Browser QA remains deferred because this source-covered slice changes list-container feedback and hook cache ownership without layout changes.
- Full `bun run test:unit` and `bun run build` remain deferred to broader release/predeploy sweeps.

### Verification

- Passed: `bun run test:vitest tests/unit/pipeline/opportunity-mutation-cache-contract.test.ts tests/unit/pipeline/opportunity-mutation-feedback-contract.test.ts tests/unit/pipeline/opportunity-list-query-contract.test.tsx` (3 files, 7 tests).
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for bulk delete hook ownership, cache policy, partial feedback, and retired container fanout.
- Passed: `git diff --check`.
- Skipped: serialized gates; this slice does not touch serial lineage, inventory identity, warranty/RMA continuity, or a related cross-domain invariant.

### Goal Adaptation

Declined. The standing maintainer goal already covers domain ownership, cache policy, honest UI states, reviewable diffs, and gate evidence. The Sprint 60 serialized-gate adaptation remains in force.

### Residual Risk

Low for bulk delete feedback/cache ownership. Moderate for high-volume bulk deletion because this still uses per-row server calls rather than a transactional bulk endpoint.
