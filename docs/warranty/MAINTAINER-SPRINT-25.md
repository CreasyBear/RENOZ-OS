# Maintainer Sprint 25 - Warranty Hook Mutation Error Contract Completion

## Slice

Sprints 22 through 24 normalized claim, policy, and core warranty mutation failures. This sprint finishes the remaining warranty hook mutation surfaces: entitlement activation, warranty extension, certificate generation/regeneration, and bulk warranty import preview/register.

## Workflow Spine Protected

Warranty action hook -> warranty server function -> centralized warranty query invalidation -> operator toast outcome.

## Change

- Reused `formatWarrantyMutationError` in entitlement, extension, certificate, and bulk-import warranty hooks.
- Removed the remaining thrown-error raw message toasts from `src/hooks/warranty`.
- Expanded the warranty mutation source contract to cover all warranty mutation hook files using the formatter.
- Left server functions, result success contracts, and cache invalidation behavior unchanged.

## Standards Checked

- Domain ownership: warranty hook mutation errors now consistently use the warranty-owned formatter.
- Route -> hook -> server function flow: each hook still calls the same server function and keeps the same success path.
- Query/cache policy: existing invalidations for warranties, entitlements, certificates, and bulk import are preserved.
- Tenant isolation/data integrity: no server write path, schema, or database behavior changed.
- UI states: thrown mutation failures no longer expose arbitrary infrastructure wording in warranty hooks.
- Reviewability: the diff is limited to four warranty hooks, one existing test, and this closeout note.

## Smells Removed

- Removed the final six `toast.error(error instanceof Error ? error.message : ...)` occurrences from `src/hooks/warranty`.
- The contract test now asserts every warranty mutation hook imports `formatWarrantyMutationError` and avoids that raw thrown-error pattern.

## Deferred

- Certificate generation still has a `success: false` result contract that can carry `result.error`; this sprint only normalizes thrown mutation failures. Server-side certificate result error copy should be reviewed separately before changing that API contract.
- Some warranty containers still show generic catch-level toasts. They are not hook mutation contracts and should be evaluated in a UI/container cleanup slice.

## Gates

- `bunx vitest run tests/unit/warranty/warranty-mutation-errors.test.ts tests/unit/warranty/query-normalization-wave3-certificates.test.tsx tests/unit/warranty/query-normalization-wave3-extensions.test.tsx tests/unit/warranty/warranty-entitlement-serialization.test.ts tests/unit/warranty/warranty-bulk-import-serialization.test.ts`: passed, 5 files / 12 tests.
- `bunx vitest run tests/unit/warranty`: passed, 34 files / 125 tests.
- `bunx eslint src/hooks/warranty/entitlements/use-warranty-entitlements.ts src/hooks/warranty/extensions/use-warranty-extensions.ts src/hooks/warranty/certificates/use-warranty-certificates.ts src/hooks/warranty/bulk-import/use-warranty-bulk-import.ts tests/unit/warranty/warranty-mutation-errors.test.ts --report-unused-disable-directives`: passed.
- `rg -n "toast\\.error\\(error instanceof Error \\? error.message" src/hooks/warranty`: no matches.
- `bun run typecheck`: passed.
- `bun run lint`: passed.
- `bun run lint:reliability`: passed.
- `git diff --check`: passed.

## Residual Risk

The warranty formatter remains intentionally permissive for server-owned 400/401/403/404 messages. The hook contract is now consistent, but server-side warranty error copy remains part of the operator-safety boundary.
