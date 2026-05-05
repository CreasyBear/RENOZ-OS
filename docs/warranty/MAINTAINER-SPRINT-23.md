# Maintainer Sprint 23 - Policy Mutation Error Safety

## Slice

Sprint 22 normalized claim mutation errors. This sprint applies that warranty-owned mutation error contract to policy administration, where create, update, delete, set-default, seed, product assignment, and category assignment actions still displayed raw thrown messages.

## Workflow Spine Protected

Warranty policy settings container -> policy mutation hooks -> warranty policy server functions -> centralized warranty policy / product / category query invalidation -> operator toast outcome.

## Change

- Reused `formatWarrantyMutationError` in `src/hooks/warranty/policies/use-warranty-policies.ts`.
- Replaced seven raw policy mutation toast messages.
- Extended the warranty mutation error contract test so policy hooks cannot drift back to raw `error.message` display.
- Left query keys, server functions, and mutation invalidation behavior unchanged.

## Standards Checked

- Domain ownership: warranty policy actions now use the warranty-owned mutation formatter introduced in Sprint 22.
- Route -> hook -> server function flow: no server or route behavior changed.
- Query/cache policy: existing centralized invalidations for warranty policy lists/defaults, products, and categories are preserved.
- Tenant isolation/data integrity: no database, schema, or server write path changed.
- UI states: policy mutation failures now use operator-safe fallback and known warranty error copy.
- Reviewability: the diff is limited to the policy hook, one existing test, and this closeout note.

## Smells Removed

- Removed raw `error instanceof Error ? error.message : ...` policy mutation toasts from all seven policy mutation actions.

## Deferred

- Warranty certificates, entitlements, extensions, bulk import, and core warranty mutations still have raw mutation toasts. They should be converted in later narrow warranty slices.
- No UI rendering changes were made in this sprint; this is hook-level operator safety.

## Gates

- `bunx vitest run tests/unit/warranty/warranty-mutation-errors.test.ts tests/unit/warranty/query-normalization-wave3-policies.test.tsx`: passed, 2 files / 8 tests.
- `bunx vitest run tests/unit/warranty`: passed, 34 files / 125 tests.
- `bunx eslint src/hooks/warranty/policies/use-warranty-policies.ts tests/unit/warranty/warranty-mutation-errors.test.ts --report-unused-disable-directives`: passed.
- `bun run typecheck`: passed.
- `bun run lint`: passed.
- `bun run lint:reliability`: passed.
- `git diff --check`: passed.

## Residual Risk

The shared warranty formatter still permits server-owned 400/401/403/404 messages through. That preserves useful policy validation guidance, but server policy errors must continue to avoid infrastructure wording in those status classes.
