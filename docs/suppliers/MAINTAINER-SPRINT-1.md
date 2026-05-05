# Suppliers Maintainer Sprint 1

## Status

Closed in commit-ready state.

## Issue 1: Supplier Price Import Row-Error Safety

### Problem

Supplier price import validation and execution returned per-row error strings. Schema validation errors and known operator validation errors are useful, but unexpected exceptions were serialized from raw thrown messages into preview and execution row results. That could expose database constraints, infrastructure wording, or stack-like text if supplier pricing imports fail during supplier/product resolution or price-list persistence.

### Workflow Spine

Supplier price import server functions
-> `validatePriceImport`
-> CSV row normalization
-> row schema validation
-> supplier/product resolution
-> preview result ledger
-> `executePriceImport`
-> re-resolve supplier/product identity
-> price-list insert/update
-> execution result ledger.

### Touched Domains

- Supplier price import server functions.
- Supplier price import validation/execution row-error helpers.
- Supplier price import unit and source-contract tests.

### Business Value Protected

Supplier pricing drives purchase-order cost accuracy and procurement decisions. Import failures should tell operators which rows need attention without leaking database internals or turning infrastructure failures into copied row-level business data.

### Scope Constraints

- Do not change CSV parsing, header aliases, row defaults, schema validation semantics, supplier/product resolution, duplicate-target handling, price calculation, approval-required guard, audit metadata, insert/update behavior, query keys, or cache policy.
- Preserve Zod row validation messages because they identify fixable CSV fields.
- Preserve known `ValidationError` messages only when they are safe.
- Hide unexpected or unsafe validation/execution errors behind supplier-owned fallback copy.

### Changes

- Added supplier price import row-error helpers for validation preview and execution result rows.
- Added unsafe-message suppression for database/constraint/infrastructure-like text, including unsafe `ValidationError` messages.
- Routed `validatePriceImport` row catch handling through `getPriceImportValidationErrorMessages`.
- Routed `executePriceImport` row failure results through `getPriceImportExecutionErrorMessage`.
- Added focused coverage for schema validation messages, unsafe validation fallback, known execution validation messages, unsafe execution fallback, and source-contract drift.

### Standards Checked

- Domain ownership: price import row-error copy now lives in the supplier price import server module beside the import workflow.
- Route -> container/page -> hook -> server flow: no UI/hook exists for this import surface yet; this sprint hardened the exported server contract before UI adoption.
- Query/cache policy: no query keys, cache invalidations, stale times, or client hooks changed.
- Tenant isolation/data integrity: no organization predicates, supplier/product resolution, price-list write predicates, audit metadata, transaction boundaries, inventory side effects, finance side effects, or serialized lineage changed.
- UI states/error handling: server result ledgers now return operator-safe row errors by construction.
- Reviewability: the diff is limited to one server helper block, two catch call sites, focused tests, and this closeout note.

### Smells Removed

- Raw validation catch message serialization in `validatePriceImport`.
- Raw execution catch message serialization in `executePriceImport`.
- Missing regression coverage for unsafe supplier price import row-error suppression.

### Deferred

- Supplier price import still has no visible UI/hook integration in the current source tree; when introduced, it should consume these server result ledgers directly instead of reformatting raw thrown errors.
- Bulk purchase-order delete still has a raw server row-failure catch path, even though current UI formatting suppresses unsafe display. That remains a separate purchase-order mutation result slice.
- Browser QA was not selected because this is a server result-contract slice with no route or visual interaction change.

### Gates

- Passed: focused price import suite, `./node_modules/.bin/vitest run tests/unit/suppliers/price-import-error-messages.test.ts tests/unit/suppliers/price-import-execute-contract.test.ts tests/unit/suppliers/price-import-preview-summary.test.ts tests/unit/suppliers/price-import-row-normalization.test.ts tests/unit/suppliers/price-import-numeric-validation.test.ts tests/unit/suppliers/price-import-optional-fields.test.ts tests/unit/suppliers/price-import-date-window.test.ts tests/unit/suppliers/price-import-template-contract.test.ts` - 8 files, 31 tests.
- Passed: broader supplier/procurement/purchase-order/approval suite, `./node_modules/.bin/vitest run tests/unit/suppliers tests/unit/procurement tests/unit/purchase-orders tests/unit/approvals` - 69 files, 202 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for price import raw `error.message`, helper usage, removed raw validation fallback, removed raw execution row serialization, and unsafe database-error suppression coverage.
- Note: the broader suite still emits the existing `--localstorage-file` jsdom warning; tests pass.
- Skipped: browser QA because this is server result-copy behavior with focused contract coverage and no visual route.
- Skipped: reliability, finance, document, release, deploy, and serialized gates because this slice did not deliberately change serialized lineage, inventory identity, serialized movement, warranty/RMA serial continuity, or repair scripts.

### Goal Adaptation

Declined. The existing maintainer posture already covers operator-safe errors, safe mutation/result contracts, tenant/data integrity checks, and risk-selected gates. Serialized gates remain conditional evidence only for serialized/inventory identity work.

### Residual Risk

Low for supplier price import row-error payloads. The workflow still needs UI/hook ownership if price import becomes a visible operator feature.
