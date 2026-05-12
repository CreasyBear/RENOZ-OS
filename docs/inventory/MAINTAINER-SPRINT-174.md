# Inventory Maintainer Sprint 174: Warranty Entitlement Activation Cache Scope

## Status

Closed in commit-ready state.

## Issue 1: Warranty Entitlement Activation Refreshed Warranty Roots

### Problem

Activating a warranty from an entitlement invalidated both `queryKeys.warrantyEntitlements.all` and `queryKeys.warranties.all`. The server result already returns the activated `entitlementId` and `warrantyId`, so the hook had exact identity but still refreshed every entitlement and warranty surface through root keys.

Warranty activation is a high-value OEM support workflow. The cache policy should make the entitlement-to-warranty transition legible and reviewable instead of relying on broad root refresh.

### Workflow Spine

Warranty entitlement review UI
-> `useActivateWarrantyFromEntitlement`
-> `activateWarrantyFromEntitlement`
-> tenant-scoped activation transaction
-> entitlement status update / warranty creation or existing-warranty repair
-> affected entitlement and warranty cache refresh.

### Touched Domains

- Warranty entitlement activation hook.
- Warranty entitlement cache contract tests.
- Inventory sprint evidence.

### Business Value Protected

Operators can activate delivered battery/product warranty entitlements and see the affected entitlement and warranty update without forcing unrelated warranty and entitlement queries to refetch. The activation boundary is now explicit: one entitlement becomes one warranty.

### Scope Constraints

- Do not change activation server behavior, auth, validation, transaction semantics, lineage events, service linkage, or activity logging.
- Do not change entitlement read-state behavior or review UI.
- Do not change warranty policy resolution behavior.
- Keep the slice limited to mutation cache ownership.

### Changes

- Added a local activation cache helper for entitlement lists/detail and warranty lists/detail.
- Removed `queryKeys.warrantyEntitlements.all` invalidation from activation success.
- Removed `queryKeys.warranties.all` invalidation from activation success.
- Added hook coverage proving activated entitlement/warranty identity refresh without root invalidation.

### Standards Checked

- Domain ownership: entitlement activation hook owns activation read-after-write refresh.
- Route -> container/page -> hook -> server function -> schema/database -> query/cache policy: server result identity now drives targeted cache refresh.
- Tenant isolation/data integrity: unchanged; activation remains tenant-scoped under `PERMISSIONS.warranty.create`.
- Transactional inventory/finance integrity: unchanged; no inventory or finance writes touched.
- Serialized lineage continuity: unchanged; serialized warranty registration event remains server-owned.
- Honest UI/error handling: unchanged; existing success/error toasts remain.
- Query/cache contract: improved and covered with a focused hook test.
- Reviewability: one hook helper and one focused contract test.

### Smells Removed

- Warranty activation used root invalidation despite returning exact entitlement and warranty identity.
- Entitlement-to-warranty cache relationship was implicit instead of encoded in the hook.

### Deferred

- Broader system normalization suite currently has an unrelated stale copy expectation for document-history degraded reads.
- No browser smoke; this was a hook/cache contract slice.
- No DB-backed activation integration test for service linkage and serialized lineage side effects.

### Gates

- Passed: `./node_modules/.bin/vitest run tests/unit/warranty/warranty-entitlement-cache-contract.test.tsx tests/unit/warranty/warranty-entitlement-review-dialog-read-state.test.tsx tests/unit/warranty/warranty-entitlement-serialization.test.ts`
- Failed unrelated broader check: `./node_modules/.bin/vitest run tests/unit/warranty/warranty-entitlement-cache-contract.test.tsx tests/unit/system/query-normalization-wave6b.test.tsx tests/unit/warranty/warranty-entitlement-review-dialog-read-state.test.tsx tests/unit/warranty/warranty-entitlement-serialization.test.ts` because `tests/unit/system/query-normalization-wave6b.test.tsx` expects old document-history copy while the UI renders `Document history is temporarily unavailable. Showing the most recent documents.`
- Passed: `./node_modules/.bin/eslint src/hooks/warranty/entitlements/use-warranty-entitlements.ts tests/unit/warranty/warranty-entitlement-cache-contract.test.tsx --report-unused-disable-directives`
- Passed: `NODE_OPTIONS=--max-old-space-size=12000 ./node_modules/.bin/tsc --noEmit`
- Passed: `git diff --check`

### Goal Adaptation

No adaptation needed. This sprint follows the maintainer goal by tightening a warranty workflow around explicit mutation identity and cache ownership.

### Residual Risk

Low. Server activation behavior is unchanged. Residual risk is limited to untested service-linkage/serialized-lineage integration side effects and the unrelated stale system test copy expectation.
