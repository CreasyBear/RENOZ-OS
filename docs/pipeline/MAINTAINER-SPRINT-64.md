# Pipeline Maintainer Sprint 64

## Status

Closed in commit-ready state.

## Issue 1: Opportunity Conversion Server Ownership Was Still Monolithic

### Problem

Sprints 62 and 63 made opportunity conversion behavior more honest and traceable, but the full conversion workflow still lived inside the large `pipeline.ts` server module. That mixed conversion-to-order orchestration, quote mapping, order idempotency, and opportunity-side lineage with unrelated opportunity list, mutation, metrics, and activity functions.

### Workflow Spine

Opportunity detail convert action
-> opportunity conversion mutation hook
-> `pipeline.ts` public re-export
-> `opportunity-conversion.ts`
-> tenant-scoped won opportunity read
-> latest quote validation
-> orders `createOrder`
-> opportunity conversion lineage transaction
-> order detail navigation and cache invalidation.

### Touched Domains

- Pipeline opportunity conversion server ownership.
- Pipeline opportunity mutation feedback/source contract.
- Pipeline activity mutation/source contract.
- Pipeline maintainer closeout docs.

### Business Value Protected

Conversion is the commercial handoff from won pipeline work to fulfillment. Keeping its server owner focused makes conversion rules, lineage, quote mapping, and order creation boundaries easier to review before future behavior changes.

### Scope Constraints

- Do not change conversion behavior, order creation semantics, quote-to-order payload mapping, idempotency keys, opportunity metadata lineage, activity deduplication, hook imports, UI feedback, navigation, or cache policy.
- Preserve the existing public `convertToOrder` export from `pipeline.ts` so callers do not churn.
- Keep this as an ownership extraction, not a behavior rewrite.

### Changes

- Added `src/server/functions/pipeline/opportunity-conversion.ts` as the focused server owner for conversion.
- Moved quote-to-order payload mapping, conversion validation, `createOrder` orchestration, opportunity metadata lineage, and conversion activity evidence into the focused module.
- Re-exported `convertToOrder` from `pipeline.ts` for compatibility.
- Removed conversion-specific imports and helper code from `pipeline.ts`.
- Updated source contracts to assert conversion lineage now lives in `opportunity-conversion.ts` while `pipeline.ts` keeps the public export.

### Standards Checked

- Domain ownership: improved; conversion-to-order orchestration now has a focused server module.
- Route -> container/page -> hook -> server function -> schema/database -> query key/cache policy: public hook flow remains stable, while the server function owner is clearer.
- Tenant isolation/data integrity: unchanged; conversion still reads and writes with tenant-scoped predicates.
- Query/cache contract: unchanged from Sprint 62; conversion hook still invalidates opportunity and order caches.
- Honest UI states/operator-safe errors: unchanged from Sprint 62/63; extraction preserves existing feedback and stable lineage failure code.
- Reviewability: conversion behavior is no longer embedded in the broad pipeline server module.

### Smells Removed

- Conversion-specific order orchestration lived inside the monolithic `pipeline.ts`.
- Conversion lineage helper made unrelated opportunity server code harder to scan.
- Source contracts asserted conversion internals in the wrong owner.

### Deferred

- First-class opportunity-to-order schema relation remains deferred because it requires migration, read-model, UI, and order-domain contract decisions.
- Further `pipeline.ts` extraction remains needed for metrics, activity, and bulk opportunity workflows.
- Browser QA remains deferred because this is server ownership extraction with stable UI and hook behavior.
- Full `bun run test:unit` and `bun run build` remain deferred to broader release/predeploy sweeps.

### Verification

- Passed: `bun run test:vitest tests/unit/pipeline/opportunity-mutation-feedback-contract.test.ts tests/unit/pipeline/activity-mutation-feedback-contract.test.ts tests/unit/pipeline/opportunity-mutation-cache-contract.test.ts tests/unit/pipeline/opportunity-list-query-contract.test.tsx` (4 files, 10 tests).
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for conversion module ownership, public re-export, and absence of conversion internals in `pipeline.ts`.
- Passed: `git diff --check`.
- Skipped: serialized gates; this slice does not touch serial lineage, inventory identity, warranty/RMA continuity, or a related cross-domain invariant.

### Goal Adaptation

Declined. The standing maintainer goal already covers domain ownership, modularity, workflow spines, tenant isolation, lineage continuity, meaningful tests, and reviewable diffs. The Sprint 60 serialized-gate adaptation remains in force.

### Residual Risk

Low for conversion ownership extraction. Moderate for the broader pipeline server module because several unrelated workflows remain in `pipeline.ts`.
