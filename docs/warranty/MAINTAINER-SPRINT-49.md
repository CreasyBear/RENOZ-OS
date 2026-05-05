# Warranty Maintainer Sprint 49

## Status

Closed in commit-ready state.

## Issue 1: Bulk Import Mutation Fallback Specificity

### Problem

Sprint 25 moved warranty bulk import thrown mutation failures through `formatWarrantyMutationError`, but unsafe-error fallback copy still used `Failed to parse CSV` and `Failed to register warranties`. Bulk import has two different operator actions: preview parse/validation and registration commit. The unavailable copy should name the failed action without exposing database or infrastructure wording.

### Workflow Spine

Warranty import settings route
-> warranty import settings container
-> bulk warranty import dialog
-> `usePreviewWarrantyImport` / `useBulkRegisterWarranties`
-> bulk import server functions
-> warranty list cache invalidation and serialized warranty registration lineage guard
-> operator-safe mutation toast.

### Touched Domains

- Warranty bulk import mutation feedback.
- Warranty hooks barrel export.

### Business Value Protected

Bulk warranty import lets RENOZ register active warranty records at scale from CSV instead of one-by-one data entry. Operators need failures to distinguish preview/CSV readiness from registration commit availability while keeping internal persistence failures out of UI copy.

### Scope Constraints

- Do not change bulk import server functions, schemas, CSV parsing, registration transaction behavior, serialized lineage behavior, or warranty creation semantics.
- Do not change the success toast or `queryKeys.warranties.lists()` invalidation contract.
- Do not change bulk import dialog wizard state, file-read handling, or container mutation orchestration.
- Do not reopen serialized gates as routine evidence for this UI feedback slice.

### Changes

- Added `formatWarrantyBulkImportMutationError(error, action)` and a typed preview/register fallback map in the warranty mutation error module.
- Routed preview and register thrown failures through the bulk-import-specific helper.
- Preserved the existing generic `formatWarrantyMutationError` barrel export and exported the new bulk import helper separately.
- Updated formatter/source contracts and the dialog action contract to reject the old generic fallback literals.

### Standards Checked

- Domain ownership: warranty owns bulk import mutation language beside the existing warranty formatter helpers.
- Workflow spine: route/container -> dialog -> hook -> server function -> query key/cache policy -> mutation toast remained intact.
- Query/cache contract: successful registration still invalidates `queryKeys.warranties.lists()`.
- Tenant isolation: no server function, schema, database query, permission check, or organization scope changed.
- Inventory/finance integrity: no inventory, RMA inventory, valuation, finance, or closeout path changed.
- Serialized lineage: server logic not touched; focused serialization contract still protects `allowAutoUpsert:false` and `eventType: 'warranty_registered'`.
- UI states: unknown or unsafe preview/register mutation failures now fall back to action-specific unavailable copy.
- Error handling: safe field validation, auth, permission, not-found, rate-limit, and known code messages still flow through the shared formatter.
- Diff shape: one formatter helper, one bulk import hook import/call-site update, two contract tests, one barrel export.

### Smells Removed

- Generic unsafe-error fallbacks for CSV preview and bulk registration.
- Bulk import hook repetition of literal fallback strings.
- Ambiguity between preview parse failures and registration commit failures.

### Deferred

- A broader abstraction for the growing set of warranty action-specific formatter helpers remains deferred until duplication becomes harder to review than the explicit maps.
- Browser QA was not selected because this was source-covered mutation feedback wiring with no layout or interaction structure change.
- Live API rejection-path testing remains deferred because existing unit contracts cover formatter extraction and hook ownership only.

### Gates

- Passed: focused bulk import contracts, `./node_modules/.bin/vitest run tests/unit/warranty/warranty-mutation-errors.test.ts tests/unit/warranty/warranty-bulk-import-dialog-action-contract.test.ts tests/unit/warranty/warranty-bulk-import-serialization.test.ts` - 3 files, 12 tests.
- Passed: `./node_modules/.bin/vitest run tests/unit/warranty` - 48 files, 148 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for bulk-import-specific formatter wiring, removed generic bulk import thrown fallbacks, preserved warranty list invalidation, preserved warranty barrel compatibility export, and preserved the focused serialized lineage guard.
- Passed: `git diff --check`.
- Skipped: browser QA because this was source-covered mutation feedback wiring with no layout change.
- Skipped: reliability, finance, document, release, deploy, and serialized gates because this slice did not touch those contracts. Serialized gates are retired as routine evidence and should only be reopened for deliberate serialized lineage, inventory identity, or invariant changes.

### Goal Adaptation

Adapted execution, not objective. Serialized gates are no longer routine closeout evidence; this sprint used focused source/test evidence because the serialized registration server path was not edited.

### Residual Risk

The helper protects unsafe-error fallback language for thrown preview/register failures, but it does not prove every backend bulk import error shape maps to a tailored message. Unsupported thrown backend shapes still fall back to the action-specific unavailable copy.
