# Warranty Maintainer Sprint 43

## Status

Closed in commit-ready state.

## Issue 1: Claim Mutation Fallback Specificity

### Problem

Sprint 22 moved warranty claim mutation failures through `formatWarrantyMutationError`, but the unsafe-error fallback copy still used generic strings like `Failed to approve claim`. When the formatter suppresses internal database or infrastructure messages, operators should still get clear warranty-claim guidance that says which action is unavailable and what to do next.

### Workflow Spine

Warranty claim route/container
-> claim action dialog or button
-> `useCreateWarrantyClaim` / `useUpdateClaimStatus` / `useApproveClaim` / `useDenyClaim` / `useResolveClaim` / `useAssignClaim` / `useCancelWarrantyClaim`
-> warranty claim server functions
-> centralized warranty claim query keys and cache invalidation
-> operator-safe mutation toast.

### Touched Domains

- Warranty claim mutation feedback.
- Warranty hooks barrel export.

### Business Value Protected

Warranty claims decide whether RENOZ repairs, replaces, credits, denies, or otherwise closes out a lithium-ion battery customer issue. Operators need failure feedback that is specific enough to retry the right action without exposing internal system wording.

### Scope Constraints

- Do not change claim server functions, schemas, statuses, permissions, query keys, cache invalidation, notification handling, or claim outcome success toasts.
- Do not broaden into warranty policy, entitlement, certificate, bulk import, or core warranty mutation fallbacks.
- Do not change claim detail container orchestration beyond the existing source contract expectation.

### Changes

- Added `formatWarrantyClaimMutationError(error, action)` and a typed claim-action fallback map in the warranty mutation error module.
- Routed seven warranty claim lifecycle mutations through the claim-specific helper.
- Preserved the existing `formatWarrantyMutationError` barrel export shape for older source contracts and exported the new helper separately.
- Updated focused formatter, hook source, cache, and claim-detail toast ownership contracts.

### Standards Checked

- Domain ownership: warranty owns the claim mutation language and keeps it beside the warranty formatter.
- Workflow spine: route/container -> hook -> server function -> query key/cache policy -> operator toast remained intact.
- Query/cache contract: existing list, detail, by-warranty, and summary invalidation remains unchanged.
- Tenant isolation: no server function, schema, database query, or organization scope changed.
- Inventory/finance integrity: no inventory, RMA inventory, valuation, finance, or closeout path changed.
- Serialized lineage: not touched.
- UI states: unknown or unsafe mutation failures now fall back to action-specific unavailable copy.
- Error handling: safe field validation, transition blockers, auth/permission/not-found/rate-limit messages still flow through the existing formatter.
- Diff shape: one formatter helper, one hook import/call-site update, two contract tests, one compatibility export.

### Smells Removed

- Generic unsafe-error fallbacks for submit, status update, approve, deny, resolve, assign, and cancel claim actions.
- Claim hook repetition of literal fallback strings.
- A compatibility break in the warranty hooks barrel discovered by the full warranty suite.

### Deferred

- Warranty policy, entitlement, certificate, bulk import, and core warranty mutation fallbacks still use generic `Failed to ...` copy and should be handled by separate domain slices.
- Browser QA was not selected because this was source-covered toast fallback wiring with no layout or interaction structure change.
- Live API rejection-path testing remains deferred because existing unit contracts cover formatter extraction and hook ownership only.

### Gates

- Passed: focused warranty contracts, `./node_modules/.bin/vitest run tests/unit/warranty/warranty-mutation-errors.test.ts tests/unit/warranty/warranty-claim-detail-container-action-contract.test.ts tests/unit/warranty/warranty-claim-cache-contract.test.ts` - 3 files, 6 tests.
- Failed then fixed: first full warranty suite exposed a brittle source-contract expectation for `export { formatWarrantyMutationError } from './_mutation-errors';`. The export shape was restored while adding the new helper as a separate export.
- Passed: final `./node_modules/.bin/vitest run tests/unit/warranty` - 48 files, 142 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: `git diff --check`.
- Skipped: browser QA because this was source-covered mutation feedback wiring with no layout change.
- Skipped: reliability, finance, document, release, and deploy gates because this slice did not touch those contracts.

### Goal Adaptation

Declined. The maintainer process already covers operator-safe errors, compatibility contracts, reviewable diffs, and risk-selected gates. Serialized gates remain retired as routine evidence and were not relevant to this warranty claim feedback slice.

### Residual Risk

The helper protects unsafe-error fallback language, but it does not prove every backend claim error shape maps to a safe specific message. Unsupported backend shapes still fall back to the action-specific unavailable copy.
