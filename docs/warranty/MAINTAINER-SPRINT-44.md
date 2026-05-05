# Warranty Maintainer Sprint 44

## Status

Closed in commit-ready state.

## Issue 1: Policy Mutation Fallback Specificity

### Problem

Sprint 23 moved warranty policy mutation failures through `formatWarrantyMutationError`, but unsafe-error fallbacks still used generic strings like `Failed to create policy` and `Failed to assign policy`. Warranty policy administration controls coverage terms, defaults, product assignments, and category defaults, so operators should get action-specific unavailable copy when internal errors are suppressed.

### Workflow Spine

Warranty policy settings route
-> policy settings container and policy form dialog
-> `useCreateWarrantyPolicy` / `useUpdateWarrantyPolicy` / `useDeleteWarrantyPolicy` / `useSetDefaultWarrantyPolicy` / `useSeedDefaultWarrantyPolicies` / `useAssignWarrantyPolicyToProduct` / `useAssignDefaultWarrantyPolicyToCategory`
-> warranty policy server functions
-> centralized warranty policy, product, and category query keys
-> operator-safe mutation toast.

### Touched Domains

- Warranty policy mutation feedback.
- Warranty hooks barrel export.

### Business Value Protected

Warranty policies define the operating rules for battery coverage, SLA expectations, default terms, and policy assignment. Failed policy administration should tell operators which policy action is unavailable without leaking database or infrastructure wording.

### Scope Constraints

- Do not change warranty policy server functions, schemas, permissions, query keys, cache invalidation, product/category assignment behavior, or success toasts.
- Do not broaden into core warranty, entitlement, extension, certificate, or bulk import mutation fallbacks.
- Do not change policy form dialog behavior beyond the existing source-contract expectation that hooks own save toasts.

### Changes

- Added `formatWarrantyPolicyMutationError(error, action)` and a typed policy-action fallback map in the warranty mutation error module.
- Routed seven warranty policy administration mutations through the policy-specific helper.
- Preserved the existing `formatWarrantyMutationError` barrel export shape and exported the new helper separately.
- Updated focused formatter and policy form ownership contracts.

### Standards Checked

- Domain ownership: warranty owns policy mutation language beside the existing warranty formatter.
- Workflow spine: route/container/dialog -> hook -> server function -> query key/cache policy -> operator toast remained intact.
- Query/cache contract: existing policy list/detail/defaults, product, and category invalidations remain unchanged.
- Tenant isolation: no server function, schema, database query, permission check, or organization scope changed.
- Inventory/finance integrity: no inventory, RMA inventory, valuation, finance, or closeout path changed.
- Serialized lineage: not touched.
- UI states: unknown or unsafe policy mutation failures now fall back to action-specific unavailable copy.
- Error handling: safe validation, auth/permission/not-found/rate-limit messages still flow through the existing formatter.
- Diff shape: one formatter helper, one policy hook import/call-site update, two contract tests, one barrel export.

### Smells Removed

- Generic unsafe-error fallbacks for policy create, update, delete, set-default, seed-defaults, product assignment, and category assignment.
- Policy hook repetition of literal fallback strings.
- Ambiguous shared `Failed to assign policy` fallback that did not distinguish product assignment from category default assignment.

### Deferred

- Core warranty, entitlement, extension, certificate, and bulk import mutation fallbacks still use generic `Failed to ...` copy and should be handled in separate workflow slices.
- Browser QA was not selected because this was source-covered toast fallback wiring with no layout or interaction structure change.
- Live API rejection-path testing remains deferred because existing unit contracts cover formatter extraction and hook ownership only.

### Gates

- Passed: focused policy contracts, `./node_modules/.bin/vitest run tests/unit/warranty/warranty-mutation-errors.test.ts tests/unit/warranty/warranty-policy-form-dialog-action-contract.test.ts tests/unit/warranty/query-normalization-wave3-policies.test.tsx` - 3 files, 10 tests.
- Passed: `./node_modules/.bin/vitest run tests/unit/warranty` - 48 files, 143 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for policy-specific formatter wiring, removed generic policy fallbacks, preserved warranty barrel compatibility export, and preserved policy/product/category cache invalidation.
- Passed: `git diff --check`.
- Skipped: browser QA because this was source-covered mutation feedback wiring with no layout change.
- Skipped: reliability, finance, document, release, deploy, and serialized gates because this slice did not touch those contracts.

### Goal Adaptation

Declined. The maintainer process already covers operator-safe errors, compatibility contracts, reviewable diffs, and risk-selected gates. Serialized gates remain retired as routine evidence and were not relevant to this policy feedback slice.

### Residual Risk

The helper protects unsafe-error fallback language, but it does not prove every backend policy error shape maps to a safe specific message. Unsupported backend shapes still fall back to the action-specific unavailable copy.
