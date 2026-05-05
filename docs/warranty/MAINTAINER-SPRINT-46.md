# Warranty Maintainer Sprint 46

## Status

Closed in commit-ready state.

## Issue 1: Entitlement Activation Fallback Specificity

### Problem

Sprint 25 moved warranty entitlement activation failures through `formatWarrantyMutationError`, but unsafe-error fallback copy still used `Failed to activate warranty`. Entitlement activation is where delivered battery context becomes an active warranty record, so suppressed internal errors should fall back to activation-specific guidance without touching entitlement serialization logic.

### Workflow Spine

Warranty entitlement queue route
-> warranty entitlements list container
-> activate warranty dialog
-> `useActivateWarrantyFromEntitlement`
-> warranty entitlement activation server function
-> centralized warranty entitlement and warranty query keys
-> operator-safe mutation toast.

### Touched Domains

- Warranty entitlement activation feedback.
- Warranty hooks barrel export.

### Business Value Protected

Warranty entitlement activation turns delivered lithium-ion battery/order context into an active warranty record. Operators need to know activation is temporarily unavailable without seeing internal database wording or mistaking the failure for a generic warranty action.

### Scope Constraints

- Do not change entitlement activation server functions, schemas, permission checks, serialization behavior, query keys, cache invalidation, or success toasts.
- Do not broaden into extension, certificate, or bulk import mutation fallbacks.
- Do not change the entitlement queue container, activation dialog behavior, or serialized entitlement persistence logic.

### Changes

- Added `formatWarrantyEntitlementMutationError(error, action)` and a typed entitlement-action fallback map in the warranty mutation error module.
- Routed activation failures in `useActivateWarrantyFromEntitlement` through the entitlement-specific helper.
- Preserved the existing `formatWarrantyMutationError` barrel export shape and exported the new helper separately.
- Updated focused formatter and entitlement serialization contracts.

### Standards Checked

- Domain ownership: warranty owns entitlement activation language beside the existing warranty formatter.
- Workflow spine: route/container/dialog -> hook -> server function -> query key/cache policy -> operator toast remained intact.
- Query/cache contract: existing warranty entitlement and warranty invalidations remain unchanged.
- Tenant isolation: no server function, schema, database query, permission check, or organization scope changed.
- Inventory/finance integrity: no inventory, RMA inventory, valuation, finance, or closeout path changed.
- Serialized lineage: activation-related serialized entitlement persistence was not touched and remains covered by the existing serialization guard.
- UI states: unknown or unsafe entitlement activation failures now fall back to action-specific unavailable copy.
- Error handling: safe validation, auth/permission/not-found/rate-limit messages still flow through the existing formatter.
- Diff shape: one formatter helper, one entitlement hook import/call-site update, one contract test, one barrel export.

### Smells Removed

- Generic unsafe-error fallback for entitlement activation.
- Entitlement hook repetition of a literal fallback string.
- Ambiguous `Failed to activate warranty` copy that did not distinguish entitlement activation from other warranty actions.

### Deferred

- Extension, certificate, and bulk import mutation fallbacks still use generic `Failed to ...` copy and should be handled in separate workflow slices.
- Browser QA was not selected because this was source-covered toast fallback wiring with no layout or interaction structure change.
- Live API rejection-path testing remains deferred because existing unit contracts cover formatter extraction and hook ownership only.

### Gates

- Passed: focused entitlement contracts, `./node_modules/.bin/vitest run tests/unit/warranty/warranty-mutation-errors.test.ts tests/unit/warranty/warranty-entitlement-serialization.test.ts` - 2 files, 8 tests.
- Passed: `./node_modules/.bin/vitest run tests/unit/warranty` - 48 files, 145 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for entitlement-specific formatter wiring, removed generic activation fallback, preserved warranty barrel compatibility export, preserved entitlement/warranty cache invalidation, and preserved serialized entitlement guard.
- Passed: `git diff --check`.
- Skipped: browser QA because this was source-covered mutation feedback wiring with no layout change.
- Skipped: reliability, finance, document, release, deploy, and serialized gates because this slice did not change those contracts.

### Goal Adaptation

Declined. The maintainer process already covers operator-safe errors, compatibility contracts, reviewable diffs, and risk-selected gates. Serialized gates remain retired as routine evidence and were not relevant because serialized entitlement logic was not changed.

### Residual Risk

The helper protects unsafe-error fallback language, but it does not prove every backend entitlement activation error shape maps to a safe specific message. Unsupported backend shapes still fall back to the action-specific unavailable copy.
