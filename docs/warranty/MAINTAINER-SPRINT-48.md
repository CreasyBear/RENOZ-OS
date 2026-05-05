# Warranty Maintainer Sprint 48

## Status

Closed in commit-ready state.

## Issue 1: Certificate Mutation Fallback Specificity

### Problem

Sprint 25 moved warranty certificate thrown mutation failures through `formatWarrantyMutationError`, but unsafe-error fallback copy still used `Failed to generate certificate` and `Failed to regenerate certificate`. Certificate result payload failures already use `formatWarrantyCertificateResultError`; this slice keeps that result contract intact while making thrown mutation failures certificate-action specific.

### Workflow Spine

Warranty detail route
-> certificate action controls
-> `useGenerateWarrantyCertificate` / `useRegenerateWarrantyCertificate`
-> warranty certificate server functions
-> centralized warranty certificate and warranty query keys
-> certificate result formatter or operator-safe thrown mutation toast.

### Touched Domains

- Warranty certificate mutation feedback.
- Warranty hooks barrel export.

### Business Value Protected

Warranty certificates are proof artifacts for battery warranty coverage. Operators need generation/regeneration failures to identify the unavailable certificate action without exposing storage, renderer, or infrastructure wording.

### Scope Constraints

- Do not change certificate server functions, schemas, result payload contracts, query keys, cache invalidation, certificate window behavior, status card behavior, or success/result-error toasts.
- Do not broaden into bulk import mutation fallbacks.
- Do not change warranty detail container inline certificate error orchestration.

### Changes

- Added `formatWarrantyCertificateMutationError(error, action)` and a typed certificate-action fallback map in the warranty mutation error module.
- Routed thrown generate/regenerate failures through the certificate-specific helper.
- Preserved `formatWarrantyCertificateResultError(result.error)` for `success: false` result payloads.
- Preserved the existing `formatWarrantyMutationError` barrel export shape and exported the new helper separately.
- Updated focused formatter/source, certificate result-error, certificate read-normalization, and certificate status-card contracts.

### Standards Checked

- Domain ownership: warranty owns certificate mutation language beside the existing warranty formatter and certificate result formatter.
- Workflow spine: route/action -> hook -> server function -> query key/cache policy -> result formatter or mutation toast remained intact.
- Query/cache contract: existing certificate detail and warranty list/detail invalidations remain unchanged.
- Tenant isolation: no server function, schema, database query, permission check, or organization scope changed.
- Inventory/finance integrity: no inventory, RMA inventory, valuation, finance, or closeout path changed.
- Serialized lineage: not touched.
- UI states: unknown or unsafe thrown certificate mutation failures now fall back to action-specific unavailable copy.
- Error handling: certificate `success: false` result errors still use the certificate result formatter; safe validation/auth/permission/not-found/rate-limit thrown errors still flow through the warranty mutation formatter.
- Diff shape: one formatter helper, one certificate hook import/call-site update, one contract test, one barrel export.

### Smells Removed

- Generic unsafe-error fallbacks for certificate generation and regeneration thrown failures.
- Certificate hook repetition of literal thrown-error fallback strings.
- Risk of confusing thrown mutation failures with server-owned certificate result payload failures.

### Deferred

- Bulk import mutation fallbacks still use generic `Failed to ...` copy and should be handled in a separate workflow slice.
- Browser QA was not selected because this was source-covered toast fallback wiring with no layout or interaction structure change.
- Live API rejection-path testing remains deferred because existing unit contracts cover formatter extraction and hook ownership only.

### Gates

- Passed: focused certificate contracts, `./node_modules/.bin/vitest run tests/unit/warranty/warranty-mutation-errors.test.ts tests/unit/warranty/warranty-certificate-result-errors.test.ts tests/unit/warranty/query-normalization-wave3-certificates.test.tsx tests/unit/warranty/warranty-certificate-status-card.test.tsx` - 4 files, 19 tests.
- Passed: `./node_modules/.bin/vitest run tests/unit/warranty` - 48 files, 147 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for certificate-specific formatter wiring, removed generic certificate thrown fallbacks, preserved certificate result formatter usage, preserved warranty barrel compatibility export, and preserved certificate/warranty cache invalidation.
- Passed: `git diff --check`.
- Skipped: browser QA because this was source-covered mutation feedback wiring with no layout change.
- Skipped: reliability, finance, document, release, deploy, and serialized gates because this slice did not touch those contracts.

### Goal Adaptation

Declined. The maintainer process already covers operator-safe errors, compatibility contracts, reviewable diffs, and risk-selected gates. Serialized gates remain retired as routine evidence and were not relevant to this certificate feedback slice.

### Residual Risk

The helper protects unsafe-error fallback language for thrown mutation failures, but it does not prove every backend certificate error shape maps to a safe specific message. Unsupported thrown backend shapes still fall back to the action-specific unavailable copy.
