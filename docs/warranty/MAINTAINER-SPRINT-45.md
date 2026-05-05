# Warranty Maintainer Sprint 45

## Status

Closed in commit-ready state.

## Issue 1: Core Warranty Mutation Fallback Specificity

### Problem

Sprint 24 moved core warranty mutation failures through `formatWarrantyMutationError`, but unsafe-error fallbacks still used generic strings like `Failed to delete warranty` and `Failed to transfer warranty ownership`. Core warranty actions are daily list/detail operations, so operators should get action-specific unavailable copy when internal errors are suppressed.

### Workflow Spine

Warranty list/detail route
-> warranty detail/list container action
-> `useUpdateWarrantyOptOut` / `useDeleteWarranty` / `useVoidWarranty` / `useTransferWarranty`
-> warranty server functions
-> centralized warranty, customer, and service-system query keys
-> operator-safe mutation toast.

### Touched Domains

- Core warranty mutation feedback.
- Warranty hooks barrel export.

### Business Value Protected

Core warranty actions control notification state, deletion, voiding, and ownership transfer for battery warranty records. Failed actions should identify the unavailable operation without leaking database or infrastructure wording.

### Scope Constraints

- Do not change core warranty server functions, schemas, permissions, query keys, cache invalidation, ownership-transfer behavior, or success toasts.
- Do not broaden into entitlement, extension, certificate, or bulk import mutation fallbacks.
- Do not change warranty detail container orchestration, certificate result handling, or transfer refetch behavior.

### Changes

- Added `formatWarrantyCoreMutationError(error, action)` and a typed core-action fallback map in the warranty mutation error module.
- Routed four core warranty mutations through the core-specific helper.
- Preserved the existing `formatWarrantyMutationError` barrel export shape and exported the new helper separately.
- Updated focused formatter, transfer cache, read-normalization, and detail-container ownership contracts.

### Standards Checked

- Domain ownership: warranty owns core mutation language beside the existing warranty formatter.
- Workflow spine: route/container -> hook -> server function -> query key/cache policy -> operator toast remained intact.
- Query/cache contract: existing warranty list/detail/status-count, customer detail, and service-system list/detail invalidations remain unchanged.
- Tenant isolation: no server function, schema, database query, permission check, or organization scope changed.
- Inventory/finance integrity: no inventory, RMA inventory, valuation, finance, or closeout path changed.
- Serialized lineage: not touched.
- UI states: unknown or unsafe core warranty mutation failures now fall back to action-specific unavailable copy.
- Error handling: safe validation, auth/permission/not-found/rate-limit messages still flow through the existing formatter.
- Diff shape: one formatter helper, one core hook import/call-site update, one contract test, one barrel export.

### Smells Removed

- Generic unsafe-error fallbacks for warranty notification settings, delete, void, and ownership transfer actions.
- Core warranty hook repetition of literal fallback strings.
- Ambiguous core warranty fallback copy that did not tell the operator which action was unavailable.

### Deferred

- Entitlement, extension, certificate, and bulk import mutation fallbacks still use generic `Failed to ...` copy and should be handled in separate workflow slices.
- Browser QA was not selected because this was source-covered toast fallback wiring with no layout or interaction structure change.
- Live API rejection-path testing remains deferred because existing unit contracts cover formatter extraction and hook ownership only.

### Gates

- Passed: focused core warranty contracts, `./node_modules/.bin/vitest run tests/unit/warranty/warranty-mutation-errors.test.ts tests/unit/warranty/query-normalization-wave3.test.tsx tests/unit/warranty/warranty-transfer-cache-contract.test.ts tests/unit/warranty/warranty-detail-container-action-contract.test.ts` - 4 files, 13 tests.
- Passed: `./node_modules/.bin/vitest run tests/unit/warranty` - 48 files, 144 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for core-specific formatter wiring, removed generic core warranty fallbacks, preserved warranty barrel compatibility export, and preserved warranty/customer/service-system cache invalidation.
- Passed: `git diff --check`.
- Skipped: browser QA because this was source-covered mutation feedback wiring with no layout change.
- Skipped: reliability, finance, document, release, deploy, and serialized gates because this slice did not touch those contracts.

### Goal Adaptation

Declined. The maintainer process already covers operator-safe errors, compatibility contracts, reviewable diffs, and risk-selected gates. Serialized gates remain retired as routine evidence and were not relevant to this core warranty feedback slice.

### Residual Risk

The helper protects unsafe-error fallback language, but it does not prove every backend core warranty error shape maps to a safe specific message. Unsupported backend shapes still fall back to the action-specific unavailable copy.
