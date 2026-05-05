# Maintainer Sprint 37 - Linkage Review Resolution Cache Contract

## Slice

Sprint 36 narrowed service ownership transfer cache invalidation, leaving review resolution as the final broad warranty invalidation in the service hook. Resolving a linkage review changes the review status, the resolved service-system surface, and the source warranty linkage/owner mirror when a warranty is present.

## Workflow Spine Protected

Service linkage review detail route -> resolve dialog -> service review resolution hook -> service review resolution server function -> link/create service-system transaction -> warranty service-system/owner mirror sync -> review/service/warranty query invalidation -> operator toast.

## Business Value Protected

Operators resolve ambiguous battery-system linkage so warranty, support, and service history point at the right physical system. The UI should refresh the affected review, system, and warranty surfaces without flushing unrelated warranty query trees.

## Change

- Returned `sourceWarrantyId` from the review resolution server function.
- Replaced broad review-domain invalidation with explicit review list/detail invalidation.
- Replaced broad warranty-tree invalidation with warranty list/status-count invalidation plus source warranty detail invalidation.
- Added focused source-contract coverage for review-resolution cache policy.

## Standards Checked

- Domain ownership: the service review resolution hook owns review, service-system, and source-warranty cache invalidation.
- Route -> container -> hook -> server flow: the container still submits the resolution payload; the server returns the affected service/warranty ids; the hook owns read-model refresh.
- Query/cache policy: service linkage review list/detail, service-system lists/detail, and warranty lists/status-counts/detail are invalidated explicitly through centralized query keys.
- Tenant isolation/data integrity: no write behavior changed; the returned warranty id is read from the organization-scoped review detail inside the existing transaction.
- UI states/error handling: the service mutation formatter from Sprint 36 remains the error boundary for resolution failures.
- Reviewability: the behavior diff is limited to one server return field, one hook invalidation contract, one focused test, and this closeout note.

## Smells Removed

- Removed `queryKeys.serviceLinkageReviews.all` from review resolution.
- Removed `queryKeys.warranties.all` from review resolution.
- Removed missing affected-warranty identity from the review-resolution mutation result.

## Deferred

- This does not add mounted React Query/browser proof for review resolution refetch behavior.
- Other service review workflows remain limited to the existing list/detail query normalization tests.

## Gates

- Focused service tests: `bunx vitest run tests/unit/service/service-linkage-review-resolution-cache-contract.test.ts tests/unit/service/service-ownership-transfer-cache-contract.test.ts tests/unit/service/service-mutation-errors.test.ts tests/unit/service/query-normalization-wave1.test.tsx` passed, 4 files and 7 tests.
- Focused ESLint: `bunx eslint src/hooks/service/use-service-systems.ts src/server/functions/service/service-linkage-reviews.ts tests/unit/service/service-linkage-review-resolution-cache-contract.test.ts --report-unused-disable-directives` passed.
- Source scan: confirmed `sourceWarrantyId` returns from the review-resolution server, review resolution invalidates service linkage review lists/detail, service-system lists/detail, and warranty lists/status-counts/source detail, with no remaining `queryKeys.serviceLinkageReviews.all` or `queryKeys.warranties.all` in the service hook.
- Service unit suite: `bunx vitest run tests/unit/service` passed, 5 files and 9 tests.
- Typecheck: `bun run typecheck` passed.
- Full lint: `bun run lint` passed.
- Serialized/reliability gates: skipped by explicit maintainer direction; that workstream is closed and this slice does not touch serialized lineage, inventory identity, or serialized read-path invariants.
- Diff hygiene: `git diff --check` passed.

## Goal Adaptation

No change to the maintainer goal. Serialized gates remain closed infrastructure and are not a default evidence requirement for this service review cache slice.

## Residual Risk

The source-contract test proves the hook/server cache boundary, not an end-to-end browser refetch cycle after resolving a review.
