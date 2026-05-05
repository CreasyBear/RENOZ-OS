# Maintainer Sprint 28 - Claim Detail Cancel Toast Ownership

## Slice

Sprint 27 cleaned duplicate action toasts in the warranty detail container. The claim detail container had the same ownership smell for claim cancellation: `useCancelWarrantyClaim` already owns success/error toasts, but the container added a second success toast and a generic catch-level error toast.

## Workflow Spine Protected

Warranty claim detail container -> cancel claim hook -> warranty claim server function -> centralized warranty claim query invalidation -> operator toast.

## Change

- Removed the claim detail container's duplicate cancel success toast.
- Removed the claim detail container's generic cancel error toast.
- Removed the now-unused `sonner` toast import from the claim detail container.
- Added a source-contract test that pins cancel toast ownership to `useCancelWarrantyClaim`.

## Standards Checked

- Domain ownership: claim mutation hooks own operator-facing mutation toasts; the claim detail container owns dialog state and refetch orchestration.
- Route -> container -> hook flow: the container still calls the same cancel hook and refetches the claim after success.
- Query/cache policy: `useCancelWarrantyClaim` invalidations are unchanged.
- Tenant isolation/data integrity: no server, schema, or database behavior changed.
- UI states: cancellation failure copy now comes from the normalized warranty mutation formatter instead of a generic container catch.
- Reviewability: the diff is limited to one container, one source-contract test, and this closeout note.

## Smells Removed

- Removed duplicate success/error toasts around claim cancellation.
- Removed a local container dependency on `sonner` for mutation failure handling.

## Deferred

- Other claim detail actions already rely on hook-owned error toasts and were left unchanged.
- This does not restructure claim detail dialogs or activity loading; that should be a separate slice if needed.

## Gates

- Focused claim detail contract test: `bunx vitest run tests/unit/warranty/warranty-claim-detail-container-action-contract.test.ts tests/unit/warranty/warranty-mutation-errors.test.ts tests/unit/warranty/query-normalization-wave3-claims.test.tsx` passed, 3 files / 8 tests.
- Focused ESLint: `bunx eslint src/components/domain/warranty/containers/warranty-claim-detail-container.tsx tests/unit/warranty/warranty-claim-detail-container-action-contract.test.ts --report-unused-disable-directives` passed.
- Source scan: no remaining local duplicate cancel-toast import/message pattern in `warranty-claim-detail-container.tsx`.
- Broader warranty suite: `bunx vitest run tests/unit/warranty` passed, 38 files / 131 tests.
- Typecheck: `bun run typecheck` passed.
- Reliability lint: `bun run lint:reliability` passed.
- Full lint: `bun run lint` passed.
- Diff hygiene: `git diff --check` passed.

## Goal Adaptation

Serialized gates are treated as closed infrastructure and are no longer a default closeout item for unrelated warranty UI/action slices. They should be revisited only when a change touches serialized lineage, inventory identity, or read-path serialization invariants.

## Residual Risk

The container still refetches after successful cancellation. If hook invalidation becomes sufficient for this screen, a later slice can remove the explicit refetch, but this sprint preserves the existing refresh behavior.
