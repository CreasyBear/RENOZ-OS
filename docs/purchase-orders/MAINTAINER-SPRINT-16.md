# Purchase Orders Maintainer Sprint 16

## Status

Closed in commit-ready state.

## Issue 1: Bulk Delete Server Row-Failure Safety

### Problem

Bulk purchase-order delete returned a per-ID failure ledger, but the server catch path still serialized `err.message` into `failed[].error`. The purchase-order page formats those row errors before display today, but the exported server result contract itself could still carry database, constraint, stack, or infrastructure wording to any future consumer.

### Workflow Spine

Purchase-order list route
-> `useBulkDeletePurchaseOrders`
-> `bulkDeletePurchaseOrders`
-> tenant-scoped draft purchase-order lookup
-> tenant-scoped soft delete
-> per-ID deleted/failed result ledger
-> list/status-count cache invalidation
-> row-level retry feedback.

### Touched Domains

- Purchase-order bulk delete server function.
- Purchase-order bulk delete row-failure normalizer.
- Purchase-order bulk delete result-contract tests.

### Business Value Protected

Bulk delete is an operator cleanup workflow for draft orders. Failed-row reasons should help an operator retry or understand a draft/status problem without exposing internals from the database or server infrastructure.

### Scope Constraints

- Do not change delete eligibility, draft-only semantics, soft-delete behavior, tenant predicates, status-count/list invalidations, route behavior, selected-row retry behavior, or result shape.
- Preserve known safe row reasons such as not-found and non-draft status failures.
- Hide unexpected or unsafe caught exceptions behind purchase-order-owned fallback copy.
- Keep the server result ledger safe even if a future caller skips the current UI formatter.

### Changes

- Added `bulk-delete-failure.ts` with `toBulkDeletePOFailure`.
- Re-exported `BulkDeletePOFailure` from `purchase-orders.ts` to preserve existing type imports.
- Changed the bulk delete catch path to push normalized row failures instead of raw exception messages.
- Added focused coverage for typed failure mapping, safe validation reasons, unsafe database-message suppression, server wiring, and existing result shape.

### Standards Checked

- Domain ownership: bulk delete row-failure copy now lives in a purchase-order server helper beside the supplier/purchase-order server functions.
- Route -> container/page -> hook -> server flow: preserved.
- Query/cache policy: no query keys, invalidations, stale times, optimistic updates, or cache ownership changed.
- Tenant isolation/data integrity: tenant-scoped lookup/update predicates, soft-delete behavior, draft status checks, and result accounting were preserved.
- Inventory/finance/serialized lineage: no receiving, inventory write, finance side effect, or serialized identity path changed.
- UI states/error handling: the server result ledger is now safe by construction before UI formatting.
- Reviewability: the diff is limited to one helper, one server catch call site, focused tests, and this closeout note.

### Smells Removed

- Raw `err.message` serialization from the bulk purchase-order delete server row-failure catch path.
- Missing regression coverage for unsafe bulk delete server row-failure suppression.

### Deferred

- The current purchase-order page still keeps its client-side row formatter as defense in depth.
- Browser QA was not selected because this is server result-contract behavior with no route, layout, or interaction change.

### Gates

- Passed: focused bulk delete contracts, `./node_modules/.bin/vitest run tests/unit/purchase-orders/bulk-delete-failure.test.ts tests/unit/purchase-orders/purchase-order-bulk-delete-result-contract.test.ts tests/unit/purchase-orders/purchase-order-mutation-errors.test.ts tests/unit/purchase-orders/purchase-order-list-mutation-feedback-contract.test.ts tests/unit/suppliers/bulk-delete-po.test.ts` - 5 files, 11 tests.
- Passed: broader purchase-order/procurement/supplier/approval suite, `./node_modules/.bin/vitest run tests/unit/purchase-orders tests/unit/procurement tests/unit/suppliers tests/unit/approvals` - 70 files, 205 tests.
- Passed: `bun run typecheck`.
- Passed: `bun run lint`.
- Passed: targeted source scan for removed raw bulk delete `err.message`, helper wiring, type re-export continuity, fallback copy, typed failure copy, and unsafe database-error suppression coverage.
- Note: the broader suite still emits the existing `--localstorage-file` jsdom warning; tests pass.
- Skipped: browser QA because this is server result-contract behavior with no rendered UI change.
- Skipped: reliability, finance, document, release, deploy, and serialized gates because this slice did not deliberately change serialized lineage, inventory identity, serialized movement, warranty/RMA serial continuity, or repair scripts.

### Goal Adaptation

Declined. The standing maintainer goal already covers safe mutation/result contracts, operator-safe errors, tenant/data integrity checks, and risk-selected evidence. Serialized gates remain conditional evidence only for serialized/inventory identity work.

### Residual Risk

Low for bulk purchase-order delete row failures. The UI formatter remains in place as a second layer, but the server result is now safe for future consumers too.
