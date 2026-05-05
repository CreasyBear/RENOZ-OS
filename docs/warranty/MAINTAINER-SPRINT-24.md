# Maintainer Sprint 24 - Core Warranty Mutation Error Safety

## Slice

Sprints 22 and 23 normalized claim and policy mutation errors. This sprint applies the same warranty-owned mutation error contract to core warranty actions used from list/detail surfaces: notification opt-out, delete, void, and ownership transfer.

## Workflow Spine Protected

Warranty list/detail container -> core warranty mutation hooks -> warranty server functions -> centralized warranty/customer/service-system query invalidation -> operator toast outcome.

## Change

- Reused `formatWarrantyMutationError` in `src/hooks/warranty/core/use-warranties.ts`.
- Replaced four raw core warranty mutation toast messages.
- Extended the warranty mutation error source contract to cover claim, policy, and core warranty hooks.
- Left read query normalization, server functions, and cache invalidation behavior unchanged.

## Standards Checked

- Domain ownership: core warranty actions now use the same warranty-owned mutation formatter as claims and policies.
- Route -> hook -> server function flow: hook mutations still call the same server functions.
- Query/cache policy: existing invalidations for warranty lists/details/status counts, customers, and service systems are preserved.
- Tenant isolation/data integrity: no server write path, schema, or database behavior changed.
- UI states: failure toasts avoid raw infrastructure messages in the daily warranty list/detail workflows.
- Reviewability: the diff is limited to one core hook, one existing test, and this closeout note.

## Smells Removed

- Removed raw `error instanceof Error ? error.message : ...` toasts from notification opt-out, delete, void, and transfer warranty mutations.

## Deferred

- Warranty certificates, entitlements, extensions, and bulk import still have raw mutation toasts. Those remain separate slices because they touch different operator workflows and success contracts.
- The detail container still has generic catch-level toasts around some certificate/notification actions. This sprint keeps the hook contract focused and does not restructure container-level handlers.

## Gates

- `bunx vitest run tests/unit/warranty/warranty-mutation-errors.test.ts tests/unit/warranty/query-normalization-wave3.test.tsx`: passed, 2 files / 9 tests.
- `bunx vitest run tests/unit/warranty`: passed, 34 files / 125 tests.
- `bunx eslint src/hooks/warranty/core/use-warranties.ts tests/unit/warranty/warranty-mutation-errors.test.ts --report-unused-disable-directives`: passed.
- `bun run typecheck`: passed.
- `bun run lint`: passed.
- `bun run lint:reliability`: passed.
- `git diff --check`: passed.

## Residual Risk

The formatter continues to pass through server-owned 400/401/403/404 messages. That is useful for warranty business validation, but server-side warranty errors in those classes must remain intentionally operator-facing.
