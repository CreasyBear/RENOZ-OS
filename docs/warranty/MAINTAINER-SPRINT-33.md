# Maintainer Sprint 33 - Claim Summary Cache Contract

## Slice

Warranty claim mutations refreshed claim lists and detail records, but status-changing mutations did not invalidate `warrantyClaims.summary(warrantyId)`. The warranty detail screen reads that summary for total and pending claim metrics, so operators could see stale claim counts after submitting, approving, denying, resolving, or cancelling a claim.

## Workflow Spine Protected

Warranty detail route -> warranty detail container -> claim mutation hook -> warranty claim server function -> centralized claim query keys -> claim list/detail/by-warranty/summary cache invalidation -> warranty detail metrics.

## Business Value Protected

Claim totals and pending counts drive warranty support triage. After an operator changes a claim, the warranty detail screen should not keep stale pending/total metrics while other claim surfaces refresh.

## Change

- Added `invalidateWarrantyClaimReadModels` inside the warranty claims hook module.
- Centralized invalidation for claim lists, claim detail, by-warranty claim lists, and claim summaries.
- Routed create, status update, approve, deny, resolve, and cancel claim mutations through the shared invalidation helper with a warranty id.
- Kept assignment scoped to list/detail invalidation because assignment does not change total or pending summary metrics.
- Added a source-contract test for the claim cache contract.

## Standards Checked

- Domain ownership: warranty claim hooks own cache invalidation for claim read models.
- Route -> container -> hook flow: no route, container, or server function behavior changed.
- Query/cache policy: status-changing claim mutations now invalidate `warrantyClaims.summary(warrantyId)` in addition to existing list/detail surfaces.
- Tenant isolation/data integrity: no server, schema, or database behavior changed.
- UI states: warranty detail summary cards can refresh after claim mutations instead of relying on stale summary cache.
- Reviewability: the diff is limited to one hook module, one source-contract test, and this closeout note.

## Smells Removed

- Removed duplicated claim invalidation blocks.
- Removed stale summary cache risk after claim status-changing mutations.

## Deferred

- The detail container still performs explicit `refetchClaims()` after some claim actions. That is now less critical for summary correctness but should be evaluated in a separate container orchestration slice.
- Other warranty cache contracts were not changed.

## Gates

- Focused claim cache contract test: `bunx vitest run tests/unit/warranty/warranty-claim-cache-contract.test.ts tests/unit/warranty/query-normalization-wave3-claims.test.tsx tests/unit/warranty/warranty-detail-overview-tab.test.tsx tests/unit/warranty/warranty-coverage-summary.test.tsx` passed, 4 files / 10 tests.
- Focused ESLint: `bunx eslint src/hooks/warranty/claims/use-warranty-claims.ts tests/unit/warranty/warranty-claim-cache-contract.test.ts --report-unused-disable-directives` passed.
- Source scan: `invalidateWarrantyClaimReadModels` now includes list, detail, by-warranty, and summary invalidation; all seven claim mutations route through the helper.
- Broader warranty suite: `bunx vitest run tests/unit/warranty` passed, 43 files / 137 tests.
- Typecheck: `bun run typecheck` passed.
- Reliability lint: `bun run lint:reliability` passed.
- Full lint: `bun run lint` passed.
- Diff hygiene: `git diff --check` passed.

## Goal Adaptation

No change to the maintainer goal. Serialized gates remain closed infrastructure and are not a default evidence requirement for this claim cache-contract slice.

## Residual Risk

This test verifies the hook-level cache contract by source. It does not mount a full warranty detail screen and observe React Query refetch behavior end to end.
