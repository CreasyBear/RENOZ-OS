# Maintainer Sprint 35 - Transfer Ownership Cache Contract

## Slice

Warranty ownership transfer delegates to the service-system ownership writer, which mirrors the new beneficial owner onto every warranty linked to that service system. The warranty hook only invalidated the current warranty detail and service-system detail, while the detail container compensated with an explicit `refetchWarranty()`.

## Workflow Spine Protected

Warranty detail/list route -> transfer dialog -> warranty transfer hook -> warranty transfer server function -> service-system ownership writer -> warranty owner mirror sync -> warranty/service-system query invalidation -> refreshed owner display.

## Business Value Protected

Owner transfer is a support and warranty continuity workflow. When a battery system changes beneficial owner, every linked warranty and service-system surface should refresh from the same mutation contract instead of relying on local container refetches.

## Change

- Returned `linkedWarrantyIds` from the warranty transfer server function.
- Invalidated warranty detail caches for every linked warranty affected by the service-system ownership transfer.
- Invalidated service-system lists as well as service-system detail after transfer.
- Removed the detail container's explicit `refetchWarranty()` after transfer submission.
- Added a source-contract test for the ownership transfer cache contract.

## Standards Checked

- Domain ownership: the transfer mutation hook owns ownership-transfer cache invalidation.
- Route -> container -> hook -> server flow: the container only submits the transfer; the hook/server pair owns affected read models.
- Query/cache policy: warranty lists/status counts/details, service-system lists/detail, and previous commercial customer detail invalidations remain explicit.
- Tenant isolation/data integrity: no database write behavior changed; the server only returns ids already computed by the transactional service writer.
- UI states: warranty detail/list and service-system list/detail surfaces can refresh through cache invalidation instead of local compensating refetch.
- Reviewability: the diff is limited to one server return payload, one hook invalidation contract, one container refetch removal, one test, and this closeout note.

## Smells Removed

- Removed local transfer refetch compensation from the warranty detail container.
- Removed under-invalidation for linked warranty owner mirrors after service-system ownership transfer.
- Removed service-system list staleness after ownership transfer from warranty surfaces.

## Deferred

- The service domain's own `useTransferServiceSystemOwnership` still uses direct `sonner` and raw mutation error copy. That is a service-domain slice, not part of this warranty transfer cache contract.
- This does not add an end-to-end mounted React Query test for transfer refetch behavior.

## Gates

- Focused transfer cache contract tests: `bunx vitest run tests/unit/warranty/warranty-transfer-cache-contract.test.ts tests/unit/warranty/warranty-detail-container-refetch-contract.test.ts tests/unit/warranty/warranty-detail-sidebar-content.test.tsx tests/unit/warranty/warranty-service-linkage.test.tsx` passed, 4 files and 8 tests.
- Focused ESLint: `bunx eslint src/server/functions/warranty/core/warranties.ts src/hooks/warranty/core/use-warranties.ts src/components/domain/warranty/containers/warranty-detail-container.tsx tests/unit/warranty/warranty-transfer-cache-contract.test.ts --report-unused-disable-directives` passed.
- Source scan: confirmed `linkedWarrantyIds` returns from the server, warranty detail invalidation loops over `result.linkedWarrantyIds ?? [variables.id]`, service-system list/detail invalidations are present, and the transfer handler no longer calls `await refetchWarranty()`.
- Broader warranty suite: `bunx vitest run tests/unit/warranty` passed, 45 files and 139 tests.
- Typecheck: `bun run typecheck` passed.
- Full lint: `bun run lint` passed.
- Serialized/reliability gates: skipped by explicit maintainer direction; that workstream is closed and this slice does not touch serialized lineage, inventory identity, or serialized read-path invariants.
- Diff hygiene: `git diff --check` passed.

## Goal Adaptation

No change to the maintainer goal. Serialized gates remain closed infrastructure and are not a default evidence requirement for this ownership-transfer cache slice.

## Residual Risk

The contract test verifies the hook/server/container ownership boundary by source. It does not prove all linked warranty detail queries are mounted and refetched in a browser session.
