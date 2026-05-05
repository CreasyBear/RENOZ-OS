# Maintainer Sprint 34 - Detail Dialog Refetch Ownership

## Slice

Warranty detail claim and extension submit handlers refetched lists immediately after mutation, and the dialogs then called success callbacks that refetched the same lists again. After Sprint 33 moved claim summary/list invalidation into the hooks, the handler-level refetches became duplicate orchestration.

## Workflow Spine Protected

Warranty detail route -> detail container -> dialog submit handler -> mutation hook cache invalidation -> dialog success callback -> explicit list refresh -> warranty detail tabs and summary.

## Business Value Protected

Warranty detail is a high-frequency support screen. Operators should see fresh claim and extension data after dialog actions, but the app should avoid redundant network work and keep one clear owner for explicit UI refreshes.

## Change

- Removed handler-level `refetchClaims()` after create, approve, deny, and request-info claim actions.
- Removed handler-level `refetchExtensions()` after extension submission.
- Preserved dialog success callbacks that explicitly refresh claims and extensions after successful dialog actions.
- Preserved hook-owned cache invalidation for claim and extension read models.
- Added a source-contract test for detail dialog refetch ownership.

## Standards Checked

- Domain ownership: mutation hooks own cache invalidation; dialog success callbacks own explicit post-dialog list refreshes.
- Route -> container -> hook flow: no route, server function, schema, or query key behavior changed.
- Query/cache policy: claim and extension hook invalidations remain in place.
- Tenant isolation/data integrity: no server, schema, or database behavior changed.
- UI states: successful dialog actions still trigger explicit refresh through `onClaimsSuccess` and `onExtensionsSuccess`.
- Reviewability: the diff is limited to one container, one source-contract test, and this closeout note.

## Smells Removed

- Removed duplicate claims refetches after claim dialog actions.
- Removed duplicate extension refetch after extension dialog submission.
- Clarified the boundary between mutation cache invalidation and dialog success refresh orchestration.

## Deferred

- The detail container still passes explicit retry callbacks for error states. Those remain user-initiated retry flows and are not part of this cleanup.
- Transfer ownership still explicitly refetches warranty detail after mutation because its dialog flow and service-system ownership cache contract are separate.

## Gates

- Focused refetch ownership tests: `bunx vitest run tests/unit/warranty/warranty-detail-container-refetch-contract.test.ts tests/unit/warranty/warranty-detail-dialogs.test.tsx tests/unit/warranty/warranty-claim-cache-contract.test.ts tests/unit/warranty/warranty-detail-overview-tab.test.tsx` passed, 4 files / 8 tests.
- Focused ESLint: `bunx eslint src/components/domain/warranty/containers/warranty-detail-container.tsx tests/unit/warranty/warranty-detail-container-refetch-contract.test.ts --report-unused-disable-directives` passed.
- Source scan: handler-level `await refetchClaims()` and `await refetchExtensions()` calls are gone; `onClaimsSuccess` and `onExtensionsSuccess` still refresh the dialog-owned list surfaces.
- Broader warranty suite: `bunx vitest run tests/unit/warranty` passed, 44 files / 138 tests.
- Typecheck: `bun run typecheck` passed.
- Reliability lint: `bun run lint:reliability` passed.
- Full lint: `bun run lint` passed.
- Diff hygiene: `git diff --check` passed.

## Goal Adaptation

No change to the maintainer goal. Serialized gates remain closed infrastructure and are not a default evidence requirement for this container orchestration slice.

## Residual Risk

This is a source-level orchestration contract. It preserves the existing dialog success refresh path but does not assert network request counts in a mounted integration test.
