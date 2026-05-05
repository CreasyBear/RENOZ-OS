# Maintainer Sprint 36 - Service Ownership Transfer Contract

## Slice

Sprint 35 fixed the warranty-side ownership transfer cache contract. The service-system side still kept two smells in the same workflow: the transfer server computed linked warranty ids for activity logging but did not return them to the hook, and the hook invalidated the whole warranty query tree while using direct `sonner` and raw mutation error copy.

## Workflow Spine Protected

Service system detail route -> transfer ownership dialog -> service transfer hook -> service transfer server function -> service-system ownership writer -> warranty owner mirror sync -> service-system/warranty query invalidation -> operator toast.

## Business Value Protected

Battery-system ownership transfer must refresh the affected service and warranty surfaces without relying on broad cache blasts or leaking infrastructure error copy to operators.

## Change

- Returned `linkedWarrantyIds` from the service transfer server function.
- Replaced broad warranty-tree invalidation in the transfer hook with warranty list/status-count invalidation plus linked warranty detail invalidation.
- Routed service mutation toasts through the shared toast adapter.
- Added a service mutation error formatter that preserves safe validation/not-found/permission messages and suppresses unsafe infrastructure copy.
- Added focused service contract tests for transfer cache policy and mutation error formatting.

## Standards Checked

- Domain ownership: the service transfer hook owns service-system and linked-warranty read-model invalidation for the service route.
- Route -> container -> hook -> server flow: the container still submits the dialog payload; the hook/server pair owns mutation feedback and affected query keys.
- Query/cache policy: service-system lists/detail and warranty lists/status-counts/details are invalidated explicitly through centralized query keys.
- Tenant isolation/data integrity: no database write behavior changed; the server only returns warranty ids already computed inside the organization-scoped ownership transaction.
- UI states/error handling: transfer and linkage failures now pass through a service formatter instead of raw `Error.message` fallback.
- Reviewability: the behavior diff is limited to one server return payload, one hook cache/error contract, one formatter, focused tests, and this closeout note.

## Smells Removed

- Removed direct `sonner` import from the service hook.
- Removed raw service mutation error copy for ownership transfer and linkage review resolution.
- Removed broad `queryKeys.warranties.all` invalidation from service ownership transfer.
- Removed the missing linked-warranty id return from the service transfer server function.

## Deferred

- `useResolveServiceLinkageReview` still invalidates `queryKeys.warranties.all`; that workflow can create or link systems from review resolution and needs its own cache-contract slice before narrowing.
- Other non-service domains still use direct `sonner`; this sprint only establishes the service-domain mutation boundary.
- This does not add a mounted browser proof that linked warranty detail queries refetch after service transfer.

## Gates

- Focused service tests: `bunx vitest run tests/unit/service/service-mutation-errors.test.ts tests/unit/service/service-ownership-transfer-cache-contract.test.ts tests/unit/service/query-normalization-wave1.test.tsx` passed, 3 files and 6 tests.
- Focused ESLint: `bunx eslint src/hooks/service/use-service-systems.ts src/hooks/service/_mutation-errors.ts src/server/functions/service/service-systems.ts tests/unit/service/service-mutation-errors.test.ts tests/unit/service/service-ownership-transfer-cache-contract.test.ts --report-unused-disable-directives` passed.
- Source scan: confirmed the service hook imports the shared toast adapter and service formatter, the transfer server returns `linkedWarrantyIds`, transfer invalidation uses service-system lists/detail plus warranty lists/status-counts/linked details, and the only remaining `queryKeys.warranties.all` in the service hook belongs to the deferred linkage-review resolution workflow.
- Service unit suite: `bunx vitest run tests/unit/service` passed, 4 files and 8 tests.
- Typecheck: `bun run typecheck` passed.
- Full lint: `bun run lint` passed.
- Serialized/reliability gates: skipped by explicit maintainer direction; that workstream is closed and this slice does not touch serialized lineage, inventory identity, or serialized read-path invariants.
- Diff hygiene: `git diff --check` passed.

## Goal Adaptation

No change to the maintainer goal. Serialized gates remain closed infrastructure and are not a default evidence requirement for this service ownership cache/error slice.

## Residual Risk

The new transfer contract test verifies the server/hook boundary by source. It does not prove all linked warranty detail queries are mounted and refetched in a browser session.
