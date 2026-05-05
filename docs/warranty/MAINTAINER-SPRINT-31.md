# Maintainer Sprint 31 - Warranty Hook Toast Adapter Contract

## Slice

Most warranty mutation hooks routed operator feedback through the shared toast adapter, but the core warranty and entitlement hooks still imported `sonner` directly. That left the domain with two feedback entry points after the mutation ownership cleanup and made future toast/error policy changes harder to apply consistently.

## Workflow Spine Protected

Warranty routes -> warranty containers/dialogs -> warranty mutation hooks -> warranty server functions -> centralized query invalidation -> shared toast adapter -> operator feedback.

## Business Value Protected

Warranty activation, deletion, voiding, ownership transfer, and notification settings are operator-facing workflows. Keeping their feedback behind one adapter reduces drift and keeps future UI/error policy changes cheap for support and warehouse-adjacent warranty operations.

## Change

- Replaced direct `sonner` imports in core warranty hooks with the shared toast adapter.
- Replaced direct `sonner` imports in entitlement activation hooks with the shared toast adapter.
- Added a source-contract test covering warranty mutation hooks that emit toasts.

## Standards Checked

- Domain ownership: mutation hooks still own operator-facing mutation feedback.
- Route -> container -> hook flow: no route, container, or server function behavior changed.
- Query/cache policy: all invalidation logic is unchanged.
- Tenant isolation/data integrity: no server, schema, or database behavior changed.
- UI states: toast behavior is unchanged at runtime because the adapter re-exports Sonner, but the import boundary is now consistent.
- Reviewability: the diff is limited to two hook imports, one source-contract test, and this closeout note.

## Smells Removed

- Removed direct `sonner` imports from the remaining warranty mutation hooks.
- Removed feedback adapter drift inside the warranty domain.

## Deferred

- Other non-warranty domains may still import `sonner` directly; this sprint only enforces the warranty-domain contract.
- The shared toast adapter itself still re-exports Sonner directly. A future app-wide UX/error policy can harden the adapter without touching warranty hooks again.

## Gates

- Focused toast adapter contract test: `bunx vitest run tests/unit/warranty/warranty-hook-toast-adapter-contract.test.ts tests/unit/warranty/warranty-mutation-errors.test.ts` passed, 2 files / 5 tests.
- Focused ESLint: `bunx eslint src/hooks/warranty/core/use-warranties.ts src/hooks/warranty/entitlements/use-warranty-entitlements.ts tests/unit/warranty/warranty-hook-toast-adapter-contract.test.ts --report-unused-disable-directives` passed.
- Source scan: no direct `sonner` toast imports remain in `src/hooks/warranty`.
- Broader warranty suite: `bunx vitest run tests/unit/warranty` passed, 41 files / 134 tests.
- Typecheck: `bun run typecheck` passed.
- Reliability lint: `bun run lint:reliability` passed.
- Full lint: `bun run lint` passed.
- Diff hygiene: `git diff --check` passed.

## Goal Adaptation

No change to the maintainer goal. Serialized gates remain closed infrastructure and are not a default evidence requirement for this import-boundary cleanup.

## Residual Risk

This is an import-boundary cleanup with no behavior change. The contract test is source-level by design; it prevents warranty hook drift but does not assert toast rendering behavior.
