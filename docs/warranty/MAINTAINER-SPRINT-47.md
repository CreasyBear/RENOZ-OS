# Warranty Maintainer Sprint 47

## Status

Closed in commit-ready state.

## Issue 1: Warranty Extension Fallback Specificity

### Problem

Sprint 25 moved warranty extension failures through `formatWarrantyMutationError`, but unsafe-error fallback copy still used `Failed to extend warranty`. Warranty extension changes the coverage expiry and can trigger customer notification behavior, so suppressed internal errors should fall back to extension-specific guidance without changing the extension server flow or success outcomes.

### Workflow Spine

Warranty detail route
-> warranty extension dialog/action
-> `useExtendWarranty`
-> warranty extension server function
-> centralized warranty extension and warranty query keys
-> operator-safe mutation toast.

### Touched Domains

- Warranty extension mutation feedback.
- Warranty hooks barrel export.

### Business Value Protected

Warranty extensions adjust battery coverage windows for goodwill, paid, loyalty, and promotional cases. Operators need failure feedback that identifies extension as the unavailable operation without exposing database or infrastructure wording.

### Scope Constraints

- Do not change extension server functions, schemas, notification result behavior, query keys, cache invalidation, date helpers, or success/warning toasts.
- Do not broaden into certificate or bulk import mutation fallbacks.
- Do not change warranty detail UI composition or extension read-state behavior.

### Changes

- Added `formatWarrantyExtensionMutationError(error, action)` and a typed extension-action fallback map in the warranty mutation error module.
- Routed `useExtendWarranty` failures through the extension-specific helper.
- Preserved the existing `formatWarrantyMutationError` barrel export shape and exported the new helper separately.
- Updated focused formatter/source, extension read-normalization, and extension schema contracts.

### Standards Checked

- Domain ownership: warranty owns extension mutation language beside the existing warranty formatter.
- Workflow spine: route/dialog -> hook -> server function -> query key/cache policy -> operator toast remained intact.
- Query/cache contract: existing warranty extension list/history and warranty list/detail invalidations remain unchanged.
- Tenant isolation: no server function, schema, database query, permission check, or organization scope changed.
- Inventory/finance integrity: no inventory, RMA inventory, valuation, finance, or closeout path changed.
- Serialized lineage: not touched.
- UI states: unknown or unsafe extension failures now fall back to action-specific unavailable copy.
- Error handling: safe validation, auth/permission/not-found/rate-limit messages still flow through the existing formatter.
- Diff shape: one formatter helper, one extension hook import/call-site update, one contract test, one barrel export.

### Smells Removed

- Generic unsafe-error fallback for warranty extension.
- Extension hook repetition of a literal fallback string.
- Ambiguous `Failed to extend warranty` copy that did not distinguish extension failure from other warranty actions.

### Deferred

- Certificate and bulk import mutation fallbacks still use generic `Failed to ...` copy and should be handled in separate workflow slices.
- Browser QA was not selected because this was source-covered toast fallback wiring with no layout or interaction structure change.
- Live API rejection-path testing remains deferred because existing unit contracts cover formatter extraction and hook ownership only.

### Gates

- Passed: focused extension contracts, `./node_modules/.bin/vitest run tests/unit/warranty/warranty-mutation-errors.test.ts tests/unit/warranty/query-normalization-wave3-extensions.test.tsx tests/unit/warranty/extend-warranty-schema.test.ts` - 3 files, 19 tests.
- Passed: `./node_modules/.bin/vitest run tests/unit/warranty` - 48 files, 146 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for extension-specific formatter wiring, removed generic extension fallback, preserved warranty barrel compatibility export, preserved extension/warranty cache invalidation, and preserved extension schema coverage.
- Passed: `git diff --check`.
- Skipped: browser QA because this was source-covered mutation feedback wiring with no layout change.
- Skipped: reliability, finance, document, release, deploy, and serialized gates because this slice did not touch those contracts.

### Goal Adaptation

Declined. The maintainer process already covers operator-safe errors, compatibility contracts, reviewable diffs, and risk-selected gates. Serialized gates remain retired as routine evidence and were not relevant to this extension feedback slice.

### Residual Risk

The helper protects unsafe-error fallback language, but it does not prove every backend extension error shape maps to a safe specific message. Unsupported backend shapes still fall back to the action-specific unavailable copy.
